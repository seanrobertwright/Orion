import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequest, createRouteContext } from '../helpers/request';
import { mockUser, mockAuthenticatedUser, mockUnauthenticated } from '../helpers/auth';

// Mock dependencies — hoisted by vitest
vi.mock('@/lib/auth/session', () => ({
  requireAuth: vi.fn(),
}));

vi.mock('@/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
    transaction: vi.fn(),
  },
}));

vi.mock('drizzle-orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('drizzle-orm')>();
  return {
    ...actual,
    eq: vi.fn((...args: unknown[]) => ({ type: 'eq', args })),
    and: vi.fn((...args: unknown[]) => ({ type: 'and', args })),
    or: vi.fn((...args: unknown[]) => ({ type: 'or', args })),
    ilike: vi.fn((...args: unknown[]) => ({ type: 'ilike', args })),
    desc: vi.fn((col: unknown) => ({ type: 'desc', col })),
    asc: vi.fn((col: unknown) => ({ type: 'asc', col })),
    sql: Object.assign(
      (strings: TemplateStringsArray, ...values: unknown[]) => ({ type: 'sql', strings, values }),
      { raw: (s: string) => s }
    ),
  };
});

vi.mock('@/lib/utils/stale', () => ({
  isApplicationStale: vi.fn().mockReturnValue(false),
}));

// ── Helpers ──────────────────────────────────────────────────────────────

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

async function mockJobsListQuery(countTotal: number, rows: any[]) {
  const { db } = await import('@/db');
  let callCount = 0;
  vi.mocked(db.select).mockImplementation(() => {
    callCount++;
    if (callCount === 1) {
      // count query
      return {
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ total: countTotal }]),
          }),
        }),
      } as any;
    }
    // results query
    return {
      from: vi.fn().mockReturnValue({
        leftJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue(rows),
              }),
            }),
          }),
        }),
      }),
    } as any;
  });
}

async function mockSingleSelectChain(result: any[]) {
  const { db } = await import('@/db');
  vi.mocked(db.select).mockImplementation(() => ({
    from: vi.fn().mockReturnValue({
      leftJoin: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue(result),
        }),
      }),
      innerJoin: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue(result),
        }),
      }),
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(result),
        orderBy: vi.fn().mockResolvedValue(result),
      }),
    }),
  }) as any);
}

// ── GET /api/jobs ────────────────────────────────────────────────────────

describe('GET /api/jobs', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns 401 when unauthenticated', async () => {
    await mockUnauthenticated();
    const { GET } = await import('@/app/api/jobs/route');
    const res = await GET(createRequest('GET', '/api/jobs'));
    expect(res.status).toBe(401);
  });

  it('returns paginated job list when authenticated', async () => {
    await mockAuthenticatedUser();
    const jobRow = {
      id: VALID_UUID, title: 'Engineer', company: 'Acme',
      applicationStatus: 'saved', applicationUpdatedAt: new Date(),
    };
    await mockJobsListQuery(1, [jobRow]);

    const { GET } = await import('@/app/api/jobs/route');
    const res = await GET(createRequest('GET', '/api/jobs'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.pagination.total).toBe(1);
  });

  it('returns empty list when user has no jobs', async () => {
    await mockAuthenticatedUser();
    await mockJobsListQuery(0, []);

    const { GET } = await import('@/app/api/jobs/route');
    const res = await GET(createRequest('GET', '/api/jobs'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(0);
    expect(body.pagination.total).toBe(0);
  });

  it('search filter returns matching jobs', async () => {
    await mockAuthenticatedUser();
    const row = { id: VALID_UUID, title: 'React Dev', company: 'Facebook' };
    await mockJobsListQuery(1, [row]);

    const { GET } = await import('@/app/api/jobs/route');
    const res = await GET(createRequest('GET', '/api/jobs?search=React'));
    expect(res.status).toBe(200);
    const { ilike } = await import('drizzle-orm');
    expect(ilike).toHaveBeenCalled();
  });

  it('status filter works', async () => {
    await mockAuthenticatedUser();
    await mockJobsListQuery(0, []);

    const { GET } = await import('@/app/api/jobs/route');
    const res = await GET(createRequest('GET', '/api/jobs?status=applied'));
    expect(res.status).toBe(200);
  });
});

// ── POST /api/jobs ───────────────────────────────────────────────────────

describe('POST /api/jobs', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns 401 when unauthenticated', async () => {
    await mockUnauthenticated();
    const { POST } = await import('@/app/api/jobs/route');
    const res = await POST(createRequest('POST', '/api/jobs', { title: 'X', company: 'Y' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 on missing required fields', async () => {
    await mockAuthenticatedUser();
    const { POST } = await import('@/app/api/jobs/route');
    const res = await POST(createRequest('POST', '/api/jobs', {}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Validation failed');
  });

  it('creates job + application atomically in transaction', async () => {
    await mockAuthenticatedUser();
    const { db } = await import('@/db');
    const mockJob = { id: VALID_UUID, title: 'Dev', company: 'Co', userId: mockUser.id };
    const mockApp = { id: 'app-id', jobId: VALID_UUID, userId: mockUser.id, status: 'saved' };

    vi.mocked(db.transaction).mockImplementation(async (fn: any) => {
      const tx = {
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn()
              .mockResolvedValueOnce([mockJob])
              .mockResolvedValueOnce([mockApp]),
          }),
        }),
      };
      return fn(tx);
    });

    const { POST } = await import('@/app/api/jobs/route');
    const res = await POST(createRequest('POST', '/api/jobs', { title: 'Dev', company: 'Co' }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.job.id).toBe(VALID_UUID);
    expect(body.application.status).toBe('saved');
    expect(db.transaction).toHaveBeenCalledOnce();
  });
});

// ── GET /api/jobs/[id] ──────────────────────────────────────────────────

describe('GET /api/jobs/[id]', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns 401 when unauthenticated', async () => {
    await mockUnauthenticated();
    const { GET } = await import('@/app/api/jobs/[id]/route');
    const res = await GET(createRequest('GET', `/api/jobs/${VALID_UUID}`), createRouteContext({ id: VALID_UUID }));
    expect(res.status).toBe(401);
  });

  it('returns 404 when job not found', async () => {
    await mockAuthenticatedUser();
    await mockSingleSelectChain([]);

    const { GET } = await import('@/app/api/jobs/[id]/route');
    const res = await GET(createRequest('GET', `/api/jobs/${VALID_UUID}`), createRouteContext({ id: VALID_UUID }));
    expect(res.status).toBe(404);
  });

  it('returns job with application and interviews', async () => {
    await mockAuthenticatedUser();
    const { db } = await import('@/db');
    const mockJobWithApp = {
      job: { id: VALID_UUID, title: 'Dev', company: 'Co' },
      application: { id: 'app-1', status: 'saved' },
    };

    let selectCall = 0;
    vi.mocked(db.select).mockImplementation(() => {
      selectCall++;
      if (selectCall === 1) {
        // job + application join
        return {
          from: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([mockJobWithApp]),
              }),
            }),
          }),
        } as any;
      }
      // interviews query
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: 'int-1', type: 'phone' }]),
        }),
      } as any;
    });

    const { GET } = await import('@/app/api/jobs/[id]/route');
    const res = await GET(createRequest('GET', `/api/jobs/${VALID_UUID}`), createRouteContext({ id: VALID_UUID }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.title).toBe('Dev');
    expect(body.application).toBeDefined();
    expect(body.interviews).toHaveLength(1);
  });
});

// ── PUT /api/jobs/[id] ──────────────────────────────────────────────────

describe('PUT /api/jobs/[id]', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns 401 when unauthenticated', async () => {
    await mockUnauthenticated();
    const { PUT } = await import('@/app/api/jobs/[id]/route');
    const res = await PUT(
      createRequest('PUT', `/api/jobs/${VALID_UUID}`, { title: 'New' }),
      createRouteContext({ id: VALID_UUID }),
    );
    expect(res.status).toBe(401);
  });

  it('returns 400 on invalid input', async () => {
    await mockAuthenticatedUser();
    const { PUT } = await import('@/app/api/jobs/[id]/route');
    const res = await PUT(
      createRequest('PUT', `/api/jobs/${VALID_UUID}`, {}),
      createRouteContext({ id: VALID_UUID }),
    );
    expect(res.status).toBe(400);
  });

  it('returns 404 when not found', async () => {
    await mockAuthenticatedUser();
    const { db } = await import('@/db');
    vi.mocked(db.update).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      }),
    } as any);

    const { PUT } = await import('@/app/api/jobs/[id]/route');
    const res = await PUT(
      createRequest('PUT', `/api/jobs/${VALID_UUID}`, { title: 'Updated' }),
      createRouteContext({ id: VALID_UUID }),
    );
    expect(res.status).toBe(404);
  });

  it('successfully updates and returns updated job', async () => {
    await mockAuthenticatedUser();
    const { db } = await import('@/db');
    const updated = { id: VALID_UUID, title: 'Updated Title', company: 'Co' };
    vi.mocked(db.update).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([updated]),
        }),
      }),
    } as any);

    const { PUT } = await import('@/app/api/jobs/[id]/route');
    const res = await PUT(
      createRequest('PUT', `/api/jobs/${VALID_UUID}`, { title: 'Updated Title' }),
      createRouteContext({ id: VALID_UUID }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.title).toBe('Updated Title');
  });
});

// ── DELETE /api/jobs/[id] ────────────────────────────────────────────────

describe('DELETE /api/jobs/[id]', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns 401 when unauthenticated', async () => {
    await mockUnauthenticated();
    const { DELETE } = await import('@/app/api/jobs/[id]/route');
    const res = await DELETE(createRequest('DELETE', `/api/jobs/${VALID_UUID}`), createRouteContext({ id: VALID_UUID }));
    expect(res.status).toBe(401);
  });

  it('returns 404 when not found', async () => {
    await mockAuthenticatedUser();
    const { db } = await import('@/db');
    vi.mocked(db.delete).mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      }),
    } as any);

    const { DELETE } = await import('@/app/api/jobs/[id]/route');
    const res = await DELETE(createRequest('DELETE', `/api/jobs/${VALID_UUID}`), createRouteContext({ id: VALID_UUID }));
    expect(res.status).toBe(404);
  });

  it('successfully deletes and returns success', async () => {
    await mockAuthenticatedUser();
    const { db } = await import('@/db');
    vi.mocked(db.delete).mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: VALID_UUID }]),
      }),
    } as any);

    const { DELETE } = await import('@/app/api/jobs/[id]/route');
    const res = await DELETE(createRequest('DELETE', `/api/jobs/${VALID_UUID}`), createRouteContext({ id: VALID_UUID }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
