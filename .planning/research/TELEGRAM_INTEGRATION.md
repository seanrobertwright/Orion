# Telegram Bot Integration with Next.js Backend - 2026 Research

## Executive Summary

This document outlines the recommended architecture for integrating a Telegram bot with a local Next.js backend for remote job search access. The solution uses webhooks with Grammy framework, ngrok for local tunneling, and Next.js API routes for serverless-compatible deployment.

## Recommended Architecture

### Core Stack
- **Framework**: Grammy (preferred over node-telegram-bot-api and Telegraf)
- **Backend**: Next.js 14+ with App Router
- **Architecture Pattern**: Webhooks (not polling)
- **Local Development**: ngrok for HTTPS tunneling
- **Deployment**: Vercel Serverless Functions (production-ready)

### Why This Stack?

**Grammy over Alternatives:**
- Modern TypeScript-first design with full type inference
- Fewer dependencies (faster cold starts in serverless)
- Better Next.js App Router compatibility
- Built-in middleware system for scalability
- Active development and comprehensive documentation in 2026

**Webhooks over Polling:**
- Real-time message delivery (no polling delay)
- More efficient resource usage (event-driven)
- Required for production serverless deployments
- Scalable to high traffic loads
- Cheaper operation (saves superfluous API requests)

## Architecture Overview

```
┌─────────────────┐
│  Telegram User  │
└────────┬────────┘
         │
         ▼
┌─────────────────────┐
│  Telegram Servers   │
└────────┬────────────┘
         │ HTTPS Webhook
         ▼
┌─────────────────────┐     ┌──────────────────┐
│   ngrok Tunnel      │────▶│  Next.js Server  │
│ (Local Development) │     │  (localhost:3000)│
└─────────────────────┘     └────────┬─────────┘
                                     │
                                     ▼
                            ┌────────────────────┐
                            │  /api/bot/route.ts │
                            │  (Grammy Webhook)  │
                            └────────┬───────────┘
                                     │
                                     ▼
                            ┌────────────────────┐
                            │  Job Search Logic  │
                            │  Business Layer    │
                            └────────┬───────────┘
                                     │
                                     ▼
                            ┌────────────────────┐
                            │  Send Results Back │
                            │  via bot.api       │
                            └────────────────────┘
```

## Implementation Guide

### 1. Project Setup

#### Install Dependencies

```bash
npm install grammy
npm install --save-dev @types/node
```

#### Configure Next.js for Grammy

Add to `next.config.mjs`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['grammy']
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('grammy')
    }
    return config
  }
}

export default nextConfig
```

### 2. Create Bot API Route

Create `app/api/bot/route.ts`:

```typescript
import { Bot, webhookCallback } from 'grammy'
import { NextRequest, NextResponse } from 'next/server'

// Initialize bot with token from environment
const token = process.env.TELEGRAM_BOT_TOKEN
if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not set')

const bot = new Bot(token)

// Command handlers
bot.command('start', (ctx) => {
  ctx.reply('Welcome! Use /search <query> to search for jobs.')
})

bot.command('search', async (ctx) => {
  const query = ctx.message?.text?.replace('/search', '').trim()

  if (!query) {
    return ctx.reply('Please provide a search query. Example: /search React Developer')
  }

  await ctx.reply(`Searching for: ${query}...`)

  // TODO: Integrate with your job search logic
  // const results = await searchJobs(query)
  // await ctx.reply(formatResults(results))
})

// Handle text messages
bot.on('message:text', (ctx) => {
  ctx.reply('Use /start to begin or /search <query> to search for jobs.')
})

// Export webhook handler
export const POST = webhookCallback(bot, 'next-js', {
  onTimeout: () => new Response('Timeout', { status: 504 }),
  secretToken: process.env.TELEGRAM_WEBHOOK_SECRET
})

// Health check endpoint
export async function GET() {
  return NextResponse.json({ status: 'Bot is running' })
}
```

### 3. Environment Configuration

Create `.env.local`:

```bash
# Get from @BotFather on Telegram
TELEGRAM_BOT_TOKEN=your_bot_token_here

# Optional: Add secret token for webhook security
TELEGRAM_WEBHOOK_SECRET=your_random_secret_string

# Your ngrok or production URL
WEBHOOK_URL=https://your-ngrok-url.ngrok.io/api/bot
```

### 4. Local Development with ngrok

#### Setup ngrok

1. Install ngrok:
```bash
# Windows
choco install ngrok

# Or download from https://ngrok.com/download
```

2. Authenticate (free account):
```bash
ngrok config add-authtoken YOUR_AUTH_TOKEN
```

3. Start ngrok tunnel:
```bash
ngrok http 3000
```

4. Note the HTTPS URL (e.g., `https://abc123.ngrok.io`)

#### Set Telegram Webhook

Use curl or create a setup script `scripts/set-webhook.ts`:

```typescript
const token = process.env.TELEGRAM_BOT_TOKEN
const webhookUrl = process.env.WEBHOOK_URL

async function setWebhook() {
  const url = `https://api.telegram.org/bot${token}/setWebhook`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: process.env.TELEGRAM_WEBHOOK_SECRET,
      max_connections: 40,
      allowed_updates: ['message', 'callback_query']
    })
  })

  const data = await response.json()
  console.log('Webhook set:', data)
}

setWebhook()
```

Run it:
```bash
tsx scripts/set-webhook.ts
```

### 5. Sending Messages from Backend

Create a bot utility `lib/telegram.ts`:

```typescript
import { Bot } from 'grammy'

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!)

export async function sendTelegramMessage(chatId: number, message: string) {
  try {
    await bot.api.sendMessage(chatId, message, {
      parse_mode: 'HTML'
    })
    return { success: true }
  } catch (error) {
    console.error('Failed to send Telegram message:', error)
    return { success: false, error }
  }
}

// Send formatted job results
export async function sendJobResults(chatId: number, jobs: any[]) {
  if (jobs.length === 0) {
    return sendTelegramMessage(chatId, 'No jobs found for your search.')
  }

  const message = jobs.map((job, index) =>
    `${index + 1}. <b>${job.title}</b>\n` +
    `   Company: ${job.company}\n` +
    `   Location: ${job.location}\n` +
    `   Link: ${job.url}\n`
  ).join('\n')

  return sendTelegramMessage(chatId, message)
}
```

Use in your job search logic:

```typescript
import { sendJobResults } from '@/lib/telegram'

// After completing job search
const results = await scrapeJobs(query)
await sendJobResults(ctx.chat.id, results)
```

## Message Handling Patterns

### 1. Command Pattern

```typescript
// Simple commands
bot.command('start', (ctx) => ctx.reply('Welcome!'))
bot.command('help', (ctx) => ctx.reply('Available commands...'))

// Commands with arguments
bot.command('search', async (ctx) => {
  const args = ctx.message?.text?.split(' ').slice(1)
  // Handle search logic
})
```

### 2. Conversation Flow Pattern

```typescript
import { conversations, createConversation } from '@grammyjs/conversations'

bot.use(conversations())

async function searchConversation(conversation: any, ctx: any) {
  await ctx.reply('What job title are you looking for?')
  const { message } = await conversation.wait()
  const title = message?.text

  await ctx.reply('Which location?')
  const { message: locMsg } = await conversation.wait()
  const location = locMsg?.text

  // Perform search
  await ctx.reply(`Searching for ${title} in ${location}...`)
}

bot.use(createConversation(searchConversation))
bot.command('search', (ctx) => ctx.conversation.enter('searchConversation'))
```

### 3. Session State Pattern

```typescript
import { session } from 'grammy'

// Add session middleware
bot.use(session({
  initial: () => ({
    lastSearch: null,
    preferences: {}
  })
}))

bot.command('search', async (ctx) => {
  const query = ctx.match
  ctx.session.lastSearch = query
  // Perform search
})

bot.command('repeat', async (ctx) => {
  const lastSearch = ctx.session.lastSearch
  if (lastSearch) {
    // Repeat last search
  } else {
    ctx.reply('No previous search found')
  }
})
```

## Rate Limits and Best Practices

### Telegram API Rate Limits (2026)

#### Message Sending Limits

1. **Individual Chats**:
   - Limit: 1 message per second
   - Short bursts allowed, but sustained rates trigger 429 errors

2. **Groups**:
   - Limit: 20 messages per minute

3. **Broadcast Limit**:
   - Default: 30 messages/second to different users
   - Paid Broadcasts: Up to 1,000 messages/second (enable in @BotFather)

4. **Error Handling**:
   - HTTP 429 error returned when exceeded
   - Response includes `retry_after` field (seconds to wait)

### Rate Limiting Implementation

```typescript
import { limit } from '@grammyjs/ratelimiter'

// Limit messages per user
bot.use(
  limit({
    timeFrame: 2000, // 2 seconds
    limit: 3,        // Max 3 messages per 2 seconds per user
    onLimitExceeded: (ctx) => {
      ctx.reply('Too many requests. Please slow down.')
    }
  })
)
```

### Best Practices

#### 1. Error Handling

```typescript
bot.catch((err) => {
  const ctx = err.ctx
  console.error(`Error handling update ${ctx.update.update_id}:`)
  console.error(err.error)

  // Notify user of error
  ctx.reply('An error occurred. Please try again later.')
})
```

#### 2. Response Timeouts

```typescript
// Set timeout for long-running operations
bot.command('search', async (ctx) => {
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Timeout')), 25000)
  )

  try {
    await Promise.race([
      performSearch(ctx.match),
      timeoutPromise
    ])
  } catch (error) {
    ctx.reply('Search took too long. Please try a more specific query.')
  }
})
```

#### 3. Message Chunking

```typescript
// Split long messages
function chunkMessage(text: string, maxLength = 4096): string[] {
  const chunks: string[] = []
  let start = 0

  while (start < text.length) {
    chunks.push(text.slice(start, start + maxLength))
    start += maxLength
  }

  return chunks
}

async function sendLongMessage(ctx: any, text: string) {
  const chunks = chunkMessage(text)
  for (const chunk of chunks) {
    await ctx.reply(chunk)
    await new Promise(resolve => setTimeout(resolve, 100)) // Rate limit
  }
}
```

#### 4. Webhook Security

```typescript
// Validate webhook requests
export async function POST(request: NextRequest) {
  const secretToken = request.headers.get('X-Telegram-Bot-Api-Secret-Token')

  if (secretToken !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return new Response('Unauthorized', { status: 403 })
  }

  return webhookCallback(bot, 'next-js')(request)
}
```

## Library Comparison

### Grammy vs Telegraf vs node-telegram-bot-api

| Feature | Grammy | Telegraf | node-telegram-bot-api |
|---------|--------|----------|----------------------|
| TypeScript Support | ✅ Native | ✅ Good | ❌ Community types only |
| Next.js Compatibility | ✅ Excellent | ⚠️ Requires config | ⚠️ Limited |
| Dependencies | ✅ Minimal | ⚠️ Moderate | ⚠️ Moderate |
| Middleware System | ✅ Built-in | ✅ Built-in | ❌ None |
| Documentation (2026) | ✅ Excellent | ✅ Good | ⚠️ Outdated |
| Serverless Support | ✅ Native | ✅ Good | ⚠️ Limited |
| Active Development | ✅ Very Active | ✅ Active | ⚠️ Maintenance mode |
| Cold Start Speed | ✅ Fast | ⚠️ Slower | ⚠️ Slower |
| Learning Curve | ✅ Gentle | ⚠️ Moderate | ✅ Simple |

### Recommendation

**Use Grammy** for this project because:
- Best TypeScript and Next.js integration
- Fastest cold starts (important for serverless)
- Modern API design
- Active development and growing ecosystem
- Built specifically for serverless environments

## Tunneling Options for Local Development

### ngrok vs Cloudflare Tunnel

| Feature | ngrok | Cloudflare Tunnel |
|---------|-------|-------------------|
| Setup Speed | ✅ Instant | ⚠️ Requires config |
| Free Tier | ✅ Generous | ✅ Unlimited |
| Custom Domain | 💰 Paid | ✅ Free |
| URL Stability | ⚠️ Random URL | ✅ Stable subdomain |
| Traffic Inspection | ✅ Built-in UI | ❌ No UI |
| Rate Limits | ⚠️ Some limits | ✅ No limits |
| Ease of Use | ✅ Very Easy | ⚠️ Moderate |
| Best For | Quick testing | Stable dev environment |

### Recommended for Your Use Case

**ngrok** is recommended for local Telegram bot development because:
- Fastest setup (one command)
- Built-in traffic inspection web UI
- Perfect for development/testing
- Easy to restart and get new URLs

**Use Cloudflare Tunnel if:**
- You need a persistent URL
- You want custom domain (e.g., `bot.yourdomain.com`)
- You're sharing the bot with team members
- You need it running for extended periods

### ngrok Setup

```bash
# Install
choco install ngrok  # Windows
brew install ngrok   # macOS

# Authenticate (free account)
ngrok config add-authtoken YOUR_TOKEN

# Start tunnel
ngrok http 3000

# With custom subdomain (paid)
ngrok http 3000 --subdomain=mybot

# With additional security
ngrok http 3000 --verify-webhook telegram --verify-webhook-provider telegram
```

### Cloudflare Tunnel Setup

```bash
# Install
npm install -g cloudflared

# Authenticate
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create telegram-bot

# Route tunnel
cloudflared tunnel route dns telegram-bot bot.yourdomain.com

# Start tunnel
cloudflared tunnel run telegram-bot --url localhost:3000
```

## Production Deployment

### Vercel Deployment

1. **Add Environment Variables** in Vercel Dashboard:
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_WEBHOOK_SECRET`

2. **Deploy**:
```bash
vercel --prod
```

3. **Set Production Webhook**:
```bash
curl -X POST "https://api.telegram.org/botYOUR_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://your-app.vercel.app/api/bot"}'
```

4. **Verify Webhook**:
```bash
curl "https://api.telegram.org/botYOUR_TOKEN/getWebhookInfo"
```

### Serverless Considerations

#### Function Timeout
- Vercel: 10s (Hobby), 60s (Pro)
- Keep job searches fast or use async pattern

#### Async Pattern for Long Searches

```typescript
bot.command('search', async (ctx) => {
  const query = ctx.match
  const chatId = ctx.chat.id

  // Immediate response
  await ctx.reply('Search started! Results will be sent shortly...')

  // Trigger background job
  fetch('https://your-api.com/api/search', {
    method: 'POST',
    body: JSON.stringify({ query, chatId })
  })

  // Don't wait for response
})

// Separate API route for actual search
// POST /api/search
export async function POST(request: Request) {
  const { query, chatId } = await request.json()

  const results = await searchJobs(query) // Can take longer
  await sendJobResults(chatId, results)

  return new Response('OK')
}
```

## Complete Example: Job Search Bot

```typescript
// app/api/bot/route.ts
import { Bot, webhookCallback, InlineKeyboard } from 'grammy'
import { searchJobs } from '@/lib/job-search'

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!)

// Start command
bot.command('start', (ctx) => {
  const keyboard = new InlineKeyboard()
    .text('Search Jobs', 'search')
    .text('My Searches', 'history')

  ctx.reply(
    'Welcome to Job Search Bot!\n\n' +
    'Commands:\n' +
    '/search <query> - Search for jobs\n' +
    '/history - View search history',
    { reply_markup: keyboard }
  )
})

// Search command
bot.command('search', async (ctx) => {
  const query = ctx.match

  if (!query) {
    return ctx.reply(
      'Please provide a search query.\n' +
      'Example: /search React Developer Remote'
    )
  }

  await ctx.reply(`🔍 Searching for: ${query}...`)

  try {
    const jobs = await searchJobs(query)

    if (jobs.length === 0) {
      return ctx.reply('No jobs found. Try a different query.')
    }

    // Send results in chunks
    for (let i = 0; i < jobs.length; i += 5) {
      const chunk = jobs.slice(i, i + 5)
      const message = chunk.map((job, idx) =>
        `<b>${i + idx + 1}. ${job.title}</b>\n` +
        `   📍 ${job.location}\n` +
        `   🏢 ${job.company}\n` +
        `   🔗 ${job.url}\n`
      ).join('\n')

      await ctx.reply(message, { parse_mode: 'HTML' })

      // Rate limit protection
      if (i + 5 < jobs.length) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    ctx.reply(`✅ Found ${jobs.length} jobs`)
  } catch (error) {
    console.error('Search error:', error)
    ctx.reply('An error occurred. Please try again later.')
  }
})

// Callback query handler
bot.on('callback_query:data', async (ctx) => {
  const data = ctx.callbackQuery.data

  if (data === 'search') {
    await ctx.answerCallbackQuery()
    ctx.reply('Use /search <query> to search for jobs')
  }
})

// Error handling
bot.catch((err) => {
  console.error('Bot error:', err)
})

// Export webhook
export const POST = webhookCallback(bot, 'next-js')
export const GET = async () =>
  new Response(JSON.stringify({ status: 'OK' }), {
    headers: { 'Content-Type': 'application/json' }
  })
```

## Monitoring and Debugging

### Check Webhook Status

```bash
curl "https://api.telegram.org/botYOUR_TOKEN/getWebhookInfo"
```

### Remove Webhook (switch to polling for debug)

```bash
curl "https://api.telegram.org/botYOUR_TOKEN/deleteWebhook"
```

### Local Testing

```typescript
// test-bot.ts - For local polling-based testing
import { Bot } from 'grammy'

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!)

bot.command('start', (ctx) => ctx.reply('Test mode'))

bot.start() // Uses long polling
```

### Logging

```typescript
import { apiThrottler } from '@grammyjs/transformer-throttler'

bot.api.config.use(apiThrottler())

// Log all updates
bot.use((ctx, next) => {
  console.log('Update:', ctx.update)
  return next()
})
```

## Security Checklist

- [ ] Store bot token in environment variables (never commit)
- [ ] Use webhook secret token for request validation
- [ ] Implement rate limiting on bot commands
- [ ] Validate and sanitize user input
- [ ] Use HTTPS for all webhook URLs
- [ ] Set up proper CORS if needed
- [ ] Implement proper error handling (don't expose internals)
- [ ] Limit allowed update types in webhook configuration
- [ ] Monitor for suspicious activity patterns
- [ ] Regularly rotate bot token if compromised

## Additional Resources

### Official Documentation
- [Grammy Documentation](https://grammy.dev/)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)

### Tutorials
- [Create a Telegram Bot in Next.js App Router](https://www.launchfa.st/blog/telegram-nextjs-app-router)
- [Building a Telegram bot with grammY](https://blog.logrocket.com/building-telegram-bot-grammy/)
- [Vercel Serverless Functions for Telegram](https://grammy.dev/hosting/vercel)

### Community Resources
- [Grammy Examples Repository](https://github.com/grammyjs/examples)
- [Grammy Telegram Chat](https://t.me/grammyjs)
- [Next.js + Telegram Bot Gist](https://gist.github.com/waptik/2038ad8f167b7af6d25d34ff9b070a2f)

## Sources

### Next.js and Telegram Integration
- [Create a Telegram Bot in Next.js App Router: A Step-by-Step Guide](https://www.launchfa.st/blog/telegram-nextjs-app-router)
- [How can I use telegram bot packages in Next.js without custom server · vercel/next.js · Discussion #60379](https://github.com/vercel/next.js/discussions/60379)
- [What I learned from building a Telegram bot on Next.js](https://dev.to/rikurouvila/what-i-learned-from-building-a-telegram-bot-on-next-js-2llh)
- [Telegram bot using Next.js API Routes · GitHub](https://gist.github.com/harrisjose/87dadc299df615b4e1fc2aca8ee6de96)

### Polling vs Webhooks
- [Polling vs Webhook in Telegram Bots | Guide by Hostman](https://hostman.com/tutorials/difference-between-polling-and-webhook-in-telegram-bots/)
- [Building a Scalable Telegram Bot with Node.js, BullMQ, and Webhooks](https://medium.com/@pushpesh0/building-a-scalable-telegram-bot-with-node-js-bullmq-and-webhooks-6b0070fcbdfc)
- [Long Polling vs. Webhooks | grammY](https://grammy.dev/guide/deployment-types)
- [Telegram webhook. why switch from polling to webhook ?](https://medium.com/@ukpai/telegram-webhook-981fc3b4294b)

### Library Comparisons
- [Telegraf VS Node-Telegram-Bot-API - DEV Community](https://dev.to/maklut/telegraf-vs-node-telegram-bot-api-36fk)
- [Choosing between Telegraf and node-telegram-bot-api for Telegram bot development](https://community.latenode.com/t/choosing-between-telegraf-and-node-telegram-bot-api-for-telegram-bot-development/33034)
- [node-telegram-bot-api vs telegraf | Telegram Bot Development](https://npm-compare.com/node-telegram-bot-api,telegraf)
- [Comparison against yagop/node-telegram-bot-api and other libraries · telegraf/telegraf · Discussion #386](https://github.com/telegraf/telegraf/discussions/386)

### Tunneling Solutions
- [Top 10 Ngrok Alternatives in 2026: A Practical Guide to Choosing the Right Tunnel](https://dev.to/lightningdev123/top-10-ngrok-alternatives-in-2026-a-practical-guide-to-choosing-the-right-tunnel-54f6)
- [Why I Needed Ngrok for a Payment Gateway And When Cloudflare Tunnel is a Better Choice](https://medium.com/@augustodemelohenriques/why-i-needed-ngrok-for-a-payment-gateway-in-a-tdd-application-and-when-cloudflare-is-a-better-5964f3230eef)
- [Secure Tunneling Explained: Ngrok vs Cloudflared](https://dev.to/aryan_shourie/secure-tunneling-explained-ngrok-vs-cloudflared-mcl)
- [Cloudflare Tunnel vs. ngrok vs. Tailscale: Choosing the Right Secure Tunneling Solution](https://dev.to/mechcloud_academy/cloudflare-tunnel-vs-ngrok-vs-tailscale-choosing-the-right-secure-tunneling-solution-4inm)

### Rate Limits and Best Practices
- [Bots FAQ](https://core.telegram.org/bots/faq)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [How to solve rate limit errors from Telegram Bot API](https://gramio.dev/rate-limits)
- [Rate Limit Users (ratelimiter) | grammY](https://grammy.dev/plugins/ratelimiter)
- [About telegram rate limit for sendMessage and editMessage · Issue #3034 · tdlib/td](https://github.com/tdlib/td/issues/3034)

### Grammy Framework
- [Building a Telegram bot with grammY - LogRocket Blog](https://blog.logrocket.com/building-telegram-bot-grammy/)
- [GitHub - grammyjs/grammY: The Telegram Bot Framework.](https://github.com/grammyjs/grammY)
- [Overview | grammY](https://grammy.dev/guide/)
- [webhookCallback | grammY](https://grammy.dev/ref/core/webhookcallback)
- [GitHub - grammyjs/examples: Examples to kickstart your journey with grammY.](https://github.com/grammyjs/examples)

### Sending Messages
- [Sending Telegram Messages using Node.js and the Telegram API](https://dev.to/basskibo/sending-telegram-messages-using-nodejs-and-the-telegram-api-148h)
- [GitHub - yagop/node-telegram-bot-api: Telegram Bot API for NodeJS](https://github.com/yagop/node-telegram-bot-api)
- [GitHub - telegraf/telegraf: Modern Telegram Bot Framework for Node.js](https://github.com/telegraf/telegraf)

### Session Management
- [Sessions and Storing Data (built-in) | grammY](https://grammy.dev/plugins/session.html)
- [session | grammY](https://grammy.dev/ref/core/session)
- [session | telegraf.js - v4.16.3](https://telegraf.js.org/functions/session.html)
- [GitHub - telegraf/telegraf-session-redis: Redis session middleware for Telegraf](https://github.com/telegraf/telegraf-session-redis)

### Conversation Handling
- [Creating a multi-step conversation flow in a Telegram bot](https://community.latenode.com/t/creating-a-multi-step-conversation-flow-in-a-telegram-bot/10484)
- [Telegram Integration | openclaw/openclaw | DeepWiki](https://deepwiki.com/openclaw/openclaw/8.3-telegram-integration)
- [From BotFather to 'Hello World'](https://core.telegram.org/bots/tutorial)

### Vercel Deployment
- [Create a serverless chatbot for Telegram using Vercel - the ultimate guide](https://www.marclittlemore.com/serverless-telegram-chatbot-vercel/)
- [Hosting: Vercel Serverless Functions | grammY](https://grammy.dev/hosting/vercel)
- [GitHub - connectshark/telegram-bot-vercel-serverless-template](https://github.com/connectshark/telegram-bot-vercel-serverless-template)
- [GitHub - sollidy/telegram-bot-vercel-boilerplate](https://github.com/sollidy/telegram-bot-vercel-boilerplate)

---

**Document Version**: 1.0
**Last Updated**: February 2, 2026
**Research Conducted For**: Orion Job Search Application
