# Docker Deployment Strategy for Orion

## 1. Current State Analysis

### Application Overview
Orion is a **Next.js 15 + React 19** job hunting tracker with:
- **Runtime**: Node.js (npm-based, lockfile v3)
- **Database**: PostgreSQL via `postgres` (postgres.js) driver + Drizzle ORM
- **Auth**: NextAuth v5 (Auth.js) with Google OAuth + Drizzle adapter
- **Styling**: Tailwind CSS 3 + PostCSS
- **Build target**: TypeScript (ES2017), bundler module resolution

### Key Dependencies Affecting Docker Strategy
| Dependency | Docker Impact |
|---|---|
| `next@^15.2.0` | Supports `output: "standalone"` for minimal production images |
| `postgres@^3.4.8` | Pure JS PostgreSQL driver (no native bindings) - simplifies builds |
| `drizzle-kit@^0.31.8` | Dev-only, needed for migrations (`db:generate`, `db:migrate`, `db:push`) |
| `tailwindcss@^3.4.1` | Build-time only, CSS is compiled during `next build` |

### Environment Variables Required
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/orion
NEXTAUTH_SECRET=<generated secret>
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=<oauth client id>
GOOGLE_CLIENT_SECRET=<oauth client secret>
```

### Current Pain Points (No Docker)
- Database must be manually provisioned
- Environment variable setup is error-prone
- No consistent dev-to-prod parity
- Migration management requires manual steps
- No health checks or readiness probes

---

## 2. Proposed Dockerfile Design

### Strategy: Multi-stage build with Next.js standalone output

The Dockerfile uses **4 stages** to minimize the final image size from ~1GB (full node_modules) to ~150-200MB.

```dockerfile
# =============================================================================
# Stage 1: Base - Install dependencies only when package files change
# =============================================================================
FROM node:22-alpine AS base

# Check https://github.com/nodejs/docker-node/tree/main#nodealpine
RUN apk add --no-cache libc6-compat

WORKDIR /app

# =============================================================================
# Stage 2: Dependencies - Install all dependencies (cached layer)
# =============================================================================
FROM base AS deps

# Copy package files for dependency caching
COPY package.json package-lock.json ./

# Install dependencies - ci ensures reproducible builds from lockfile
RUN npm ci

# =============================================================================
# Stage 3: Builder - Build the Next.js application
# =============================================================================
FROM base AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy all source files
COPY . .

# Set Next.js telemetry opt-out
ENV NEXT_TELEMETRY_DISABLED=1

# Build the application
# Note: next.config.ts must have output: "standalone" for this to work
RUN npm run build

# =============================================================================
# Stage 4: Runner - Minimal production image
# =============================================================================
FROM base AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built output from builder
# The standalone output includes a minimal node_modules with only production deps
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy public assets (if any exist in the future)
# COPY --from=builder /app/public ./public

# Copy Drizzle migration files for runtime migration support
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts

# Set correct ownership
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose the application port
EXPOSE 3000

# Set hostname for Next.js
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Start the application using the standalone server
CMD ["node", "server.js"]
```

### Why each stage matters

| Stage | Purpose | What's Cached |
|---|---|---|
| **base** | Alpine + libc6-compat for Node | Rarely changes |
| **deps** | `npm ci` from lockfile | Only rebuilt when package*.json changes |
| **builder** | `next build` | Rebuilt on source changes, but deps are cached |
| **runner** | Minimal production image | Only contains built artifacts |

### Required: Enable standalone output

Add to `next.config.ts`:
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
```

This tells Next.js to trace and bundle only the files actually needed at runtime into `.next/standalone/`, which includes a self-contained `server.js` and a minimal `node_modules/` with only production dependencies. This is the single most impactful optimization for the Docker image.

---

## 3. Docker Compose Configurations

### 3.1 Development (`docker-compose.yml`)

```yaml
services:
  # ---------------------------------------------------------------------------
  # PostgreSQL Database
  # ---------------------------------------------------------------------------
  db:
    image: postgres:17-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: orion
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d orion"]
      interval: 5s
      timeout: 5s
      retries: 5

  # ---------------------------------------------------------------------------
  # Next.js Application (development - hot reload via bind mount)
  # ---------------------------------------------------------------------------
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://postgres:postgres@db:5432/orion
      NEXTAUTH_SECRET: dev-secret-change-in-production
      NEXTAUTH_URL: http://localhost:3000
      GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}
      GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET}
    volumes:
      # Bind mount for hot reload
      - .:/app
      # Anonymous volume to prevent host node_modules from overriding container
      - /app/node_modules
      - /app/.next
    depends_on:
      db:
        condition: service_healthy

  # ---------------------------------------------------------------------------
  # Database Migration Runner (one-shot)
  # ---------------------------------------------------------------------------
  migrate:
    build:
      context: .
      dockerfile: Dockerfile.dev
    command: npm run db:push
    environment:
      DATABASE_URL: postgresql://postgres:postgres@db:5432/orion
    depends_on:
      db:
        condition: service_healthy
    profiles:
      - tools

volumes:
  postgres_data:
```

### Development Dockerfile (`Dockerfile.dev`)

```dockerfile
FROM node:22-alpine

RUN apk add --no-cache libc6-compat

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
```

### 3.2 Production (`docker-compose.prod.yml`)

```yaml
services:
  # ---------------------------------------------------------------------------
  # PostgreSQL Database (production)
  # ---------------------------------------------------------------------------
  db:
    image: postgres:17-alpine
    restart: always
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB:-orion}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB:-orion}"]
      interval: 10s
      timeout: 5s
      retries: 5
    # No port exposure in production - only accessible within Docker network
    networks:
      - internal

  # ---------------------------------------------------------------------------
  # Next.js Application (production)
  # ---------------------------------------------------------------------------
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: runner
    restart: always
    ports:
      - "${APP_PORT:-3000}:3000"
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB:-orion}
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
      NEXTAUTH_URL: ${NEXTAUTH_URL}
      GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}
      GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET}
      NODE_ENV: production
    depends_on:
      db:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/"]
      interval: 30s
      timeout: 10s
      start_period: 15s
      retries: 3
    networks:
      - internal
      - external
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: "1.0"
        reservations:
          memory: 256M
          cpus: "0.25"

  # ---------------------------------------------------------------------------
  # Migration Runner (one-shot, run manually before deploying)
  # ---------------------------------------------------------------------------
  migrate:
    build:
      context: .
      dockerfile: Dockerfile
      target: builder
    command: npx drizzle-kit migrate
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB:-orion}
    depends_on:
      db:
        condition: service_healthy
    networks:
      - internal
    profiles:
      - tools
    restart: "no"

networks:
  internal:
    driver: bridge
  external:
    driver: bridge

volumes:
  postgres_data:
    driver: local
```

### Usage Commands

```bash
# --- Development ---
docker compose up -d                           # Start dev environment
docker compose --profile tools run migrate     # Run migrations
docker compose logs -f app                     # Watch app logs
docker compose down                            # Stop everything
docker compose down -v                         # Stop + delete database data

# --- Production ---
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml --profile tools run --rm migrate
docker compose -f docker-compose.prod.yml logs -f app
docker compose -f docker-compose.prod.yml down
```

---

## 4. Environment Management Strategy

### 4.1 File Structure

```
.env.example          # Committed - template with placeholder values
.env                  # Git-ignored - local development overrides
.env.production       # Git-ignored - production secrets (or use CI/CD secrets)
```

### 4.2 Environment Variable Categories

| Variable | Dev Default | Production | Secret? |
|---|---|---|---|
| `DATABASE_URL` | Set in compose | Injected via CI/CD | Yes |
| `NEXTAUTH_SECRET` | Static dev value | Generated unique value | **Yes** |
| `NEXTAUTH_URL` | `http://localhost:3000` | Actual domain URL | No |
| `GOOGLE_CLIENT_ID` | Dev OAuth credentials | Prod OAuth credentials | Yes |
| `GOOGLE_CLIENT_SECRET` | Dev OAuth credentials | Prod OAuth credentials | **Yes** |
| `POSTGRES_USER` | `postgres` | Unique username | Yes |
| `POSTGRES_PASSWORD` | `postgres` | Strong generated password | **Yes** |
| `POSTGRES_DB` | `orion` | `orion` | No |
| `NODE_ENV` | `development` | `production` | No |

### 4.3 Production Secrets Approach

**Option A: `.env.production` file (simple deployments)**
```bash
# Generate on server, never commit
NEXTAUTH_SECRET=$(openssl rand -base64 32)
POSTGRES_PASSWORD=$(openssl rand -base64 24)
```

**Option B: Docker secrets (Swarm mode)**
```yaml
secrets:
  db_password:
    external: true
  nextauth_secret:
    external: true
```

**Option C: Cloud provider secret managers (recommended for production)**
- AWS Secrets Manager / SSM Parameter Store
- Google Cloud Secret Manager
- Azure Key Vault
- HashiCorp Vault

### 4.4 `.dockerignore`

```dockerignore
# Dependencies
node_modules
.pnp
.pnp.js

# Build output
.next
out
build

# Environment files (secrets should not be in the image)
.env
.env.*
!.env.example

# Version control
.git
.gitignore

# IDE
.vscode
.idea

# OS
.DS_Store
Thumbs.db

# Docker
Dockerfile*
docker-compose*
.dockerignore

# Documentation / Analysis
*.md
analysis/
.claude/
.planning/

# Misc
nul
coverage
npm-debug.log*
```

This `.dockerignore` is critical for:
1. **Build speed**: Prevents copying `node_modules` and `.next` into the build context
2. **Security**: Prevents `.env` files from leaking into the image
3. **Image size**: Excludes docs, IDE files, git history

---

## 5. Development vs Production Differences

| Aspect | Development | Production |
|---|---|---|
| **Dockerfile** | `Dockerfile.dev` (single stage) | `Dockerfile` (4-stage multi-stage) |
| **Hot reload** | Yes (bind mount + `next dev`) | No (pre-built static output) |
| **Source maps** | Full | Disabled or external |
| **Image size** | ~1GB+ (full node_modules) | ~150-200MB (standalone) |
| **DB ports** | Exposed (`5432:5432`) | Internal only |
| **DB credentials** | Default (`postgres:postgres`) | Unique, strong passwords |
| **Restart policy** | `unless-stopped` | `always` |
| **Resource limits** | None | Memory + CPU limits set |
| **Networking** | Default bridge | Separate internal/external networks |
| **node_modules** | Bind mount + anonymous volume | Baked into standalone output |
| **Migrations** | `db:push` (schema sync) | `drizzle-kit migrate` (versioned SQL) |
| **NEXTAUTH_URL** | `http://localhost:3000` | Actual domain with HTTPS |

### Migration Strategy Difference

- **Development**: Use `db:push` for rapid iteration (direct schema sync, no migration files)
- **Production**: Use `drizzle-kit migrate` which runs versioned SQL migration files from `drizzle/` directory - these are deterministic and auditable

---

## 6. CI/CD Considerations

### 6.1 GitHub Actions Pipeline

```yaml
name: Build and Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  # --- Lint & Type Check ---
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run lint

  # --- Build Docker Image ---
  build:
    needs: check
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=sha,prefix=
            type=ref,event=branch
            type=semver,pattern={{version}}

      - name: Build and push
        uses: docker/build-push-action@v6
        with:
          context: .
          push: ${{ github.event_name != 'pull_request' }}
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          build-args: |
            NEXT_TELEMETRY_DISABLED=1

  # --- Deploy (example: SSH to VPS) ---
  deploy:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to production
        run: |
          echo "Deploy step - customize for your infrastructure"
          # Example: SSH to server, pull new image, restart
          # ssh deploy@server "cd /app && docker compose -f docker-compose.prod.yml pull && docker compose -f docker-compose.prod.yml up -d"
```

### 6.2 Build Caching Strategy

Docker layer caching is leveraged at three levels:

1. **Base image** (`node:22-alpine`): Cached by Docker daemon
2. **Dependency layer** (`npm ci`): Only rebuilds when `package*.json` changes
3. **GitHub Actions cache** (`cache-from: type=gha`): Persists layers across CI runs

Expected build times:
- Cold build: ~2-3 minutes
- Cached build (deps unchanged): ~30-60 seconds
- Cached build (only source changes): ~45-90 seconds

---

## 7. Deployment Recommendations

### 7.1 Recommended Approach: Single VPS with Docker Compose

For a personal job tracker application, a single VPS (DigitalOcean, Hetzner, Railway, Fly.io) is the most cost-effective:

```
                    ┌─────────────────────────────┐
                    │         VPS / Server          │
                    │                               │
  Internet ──────► │  ┌─────────┐   ┌───────────┐  │
  (HTTPS)          │  │  Caddy   │──►│  Next.js   │  │
                    │  │  Proxy   │   │  (app:3000)│  │
                    │  └─────────┘   └─────┬─────┘  │
                    │                      │         │
                    │               ┌──────▼──────┐  │
                    │               │  PostgreSQL  │  │
                    │               │  (db:5432)   │  │
                    │               └─────────────┘  │
                    └─────────────────────────────┘
```

### 7.2 Adding a Reverse Proxy

For production, add Caddy (automatic HTTPS) to the compose file:

```yaml
  caddy:
    image: caddy:2-alpine
    restart: always
    ports:
      - "80:80"
      - "443:443"
      - "443:443/udp"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - app
    networks:
      - external
```

```
# Caddyfile
orion.yourdomain.com {
    reverse_proxy app:3000
}
```

### 7.3 Database Backup Strategy

```yaml
  # Add to docker-compose.prod.yml
  db-backup:
    image: postgres:17-alpine
    environment:
      PGHOST: db
      PGUSER: ${POSTGRES_USER}
      PGPASSWORD: ${POSTGRES_PASSWORD}
      PGDATABASE: ${POSTGRES_DB:-orion}
    volumes:
      - ./backups:/backups
    command: >
      sh -c 'pg_dump -Fc > /backups/orion_$$(date +%Y%m%d_%H%M%S).dump'
    depends_on:
      db:
        condition: service_healthy
    networks:
      - internal
    profiles:
      - tools
```

Usage: `docker compose -f docker-compose.prod.yml --profile tools run --rm db-backup`

### 7.4 Platform-Specific Alternatives

| Platform | Pros | Cons | Estimated Cost |
|---|---|---|---|
| **VPS + Docker Compose** | Full control, simple, cheap | Manual maintenance | $5-10/mo |
| **Railway** | Zero-config deploy, managed Postgres | Vendor lock-in, usage-based pricing | $5-20/mo |
| **Fly.io** | Edge deployment, Postgres included | More complex setup | $5-15/mo |
| **Vercel + Neon/Supabase** | Zero-config Next.js, serverless DB | Cold starts, Vercel pricing tiers | $0-20/mo |
| **AWS ECS/Fargate** | Enterprise-grade, scalable | Over-engineered for this app | $15-50/mo |

**Recommendation**: For Orion's scope (personal tool, single user or small team), **VPS + Docker Compose** or **Railway** are the best fit. Vercel is also viable if you decouple the database.

---

## 8. Build Optimization Strategies

### 8.1 Image Size Optimization

| Strategy | Impact | Implemented |
|---|---|---|
| Multi-stage builds | ~80% reduction | Yes (4 stages) |
| Alpine base image | ~60% smaller than Debian | Yes (`node:22-alpine`) |
| `output: "standalone"` | Eliminates unused node_modules | Yes |
| `.dockerignore` | Faster builds, smaller context | Yes |
| Non-root user | Security hardening | Yes |

### 8.2 Build Speed Optimization

| Strategy | Impact |
|---|---|
| Layer ordering (deps before source) | npm ci cached unless package.json changes |
| Docker BuildKit | Parallel stage builds, better caching |
| GitHub Actions cache (`type=gha`) | Persistent layer cache across CI runs |
| `.dockerignore` excludes `.next`, `node_modules` | Smaller build context = faster COPY |

### 8.3 Runtime Optimization

| Strategy | Implementation |
|---|---|
| Health checks | Dockerfile HEALTHCHECK + compose healthcheck |
| Graceful shutdown | Next.js standalone handles SIGTERM by default |
| Memory limits | Set via compose `deploy.resources.limits` |
| Non-root execution | `USER nextjs` in final stage |

---

## 9. Quick Start Summary

To dockerize Orion, implement these changes in order:

### Step 1: Enable standalone output
```typescript
// next.config.ts
const nextConfig: NextConfig = {
  output: "standalone",
};
```

### Step 2: Create files
- `Dockerfile` (production multi-stage)
- `Dockerfile.dev` (development)
- `docker-compose.yml` (development)
- `docker-compose.prod.yml` (production)
- `.dockerignore`

### Step 3: Launch development environment
```bash
docker compose up -d
docker compose --profile tools run --rm migrate
# Open http://localhost:3000
```

### Step 4: Deploy to production
```bash
# On production server:
cp .env.example .env.production
# Edit .env.production with real values
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml --profile tools run --rm migrate
```

---

## Appendix: Complete File Checklist

| File | Purpose | Commit? |
|---|---|---|
| `Dockerfile` | Production multi-stage build | Yes |
| `Dockerfile.dev` | Development build with hot reload | Yes |
| `docker-compose.yml` | Development environment | Yes |
| `docker-compose.prod.yml` | Production environment | Yes |
| `.dockerignore` | Build context exclusions | Yes |
| `.env.example` | Environment template (already exists) | Yes |
| `.env` | Local dev overrides | No (gitignored) |
| `.env.production` | Production secrets | No (gitignored) |
| `Caddyfile` | Reverse proxy config (optional) | Yes |
