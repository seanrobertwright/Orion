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
    desc: vi.fn((col: unknown) => ({ type: 'desc', col })),
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
const APP_UUID = '660e8400-e29b-41d4-a716-446655440001';

async function mockApplicationsListQuery(countTotal: number, rows: any[]) {
  const { db } = await import('@/db');
  let callCount = 0;
  vi.mocked(db.select).mockImplementation(() => {
    callCount++;
    if (callCount === 1) {
      // count query
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ total: countTotal }]),
        }),
      } as any;
    }
    // results query
    return {
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
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

// ── GET /api/applications ────────────────────────────────────────────────

describe('GET /api/applications', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns 401 when unauthenticated', async () => {
    await mockUnauthenticated();
    const { GET } = await import('@/app/api/applications/route');
    const res = await GET(createRequest('GET', '/api/applications'));
    expect(res.status).toBe(401);
  });

  it('returns paginated applications list', async () => {
    await mockAuthenticatedUser();
    const row = {
      id: APP_UUID, status: 'saved', updatedAt: new Date().toISOString(),
      jobTitle: 'Dev', jobCompany: 'Co',
    };
    await mockApplicationsListQuery(1, [row]);

    const { GET } = await import('@/app/api/applications/route');
    const res = await GET(createRequest('GET', '/api/applications'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.pagination.total).toBe(1);
  });

  it('status filter works', async () => {
    await mockAuthenticatedUser();
    await mockApplicationsListQuery(0, []);

    const { GET } = await import('@/app/api/applications/route');
    const res = await GET(createRequest('GET', '/api/applications?status=applied'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.pagination.total).toBe(0);
  });
});

// ── GET /api/applications/[id] ──────────────────────────────────────────

describe('GET /api/applications/[id]', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns 401 when unauthenticated', async () => {
    await mockUnauthenticated();
    const { GET } = await import('@/app/api/applications/[id]/route');
    const res = await GET(
      createRequest('GET', `/api/applications/${APP_UUID}`),
      createRouteContext({ id: APP_UUID }),
    );
    expect(res.status).toBe(401);
  });

  it('returns 404 when not found', async () => {
    await mockAuthenticatedUser();
    const { db } = await import('@/db');
    vi.mocked(db.select).mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    }) as any);

    const { GET } = await import('@/app/api/applications/[id]/route');
    const res = await GET(
      createRequest('GET', `/api/applications/${APP_UUID}`),
      createRouteContext({ id: APP_UUID }),
    );
    expect(res.status).toBe(404);
  });

  it('returns application with job, interviews, statusHistory', async () => {
    await mockAuthenticatedUser();
    const { db } = await import('@/db');
    const mockAppWithJob = {
      application: { id: APP_UUID, status: 'applied', jobId: VALID_UUID },
      job: { id: VALID_UUID, title: 'Dev', company: 'Co' },
    };

    let selectCall = 0;
    vi.mocked(db.select).mockImplementation(() => {
      selectCall++;
      if (selectCall === 1) {
        // application + job join
        return {
          from: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([mockAppWithJob]),
              }),
            }),
          }),
        } as any;
      }
      // interviews and statusHistory (Promise.all — calls 2 and 3)
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(
              selectCall === 2
                ? [{ id: 'int-1', type: 'phone' }]
                : [{ id: 'sh-1', fromStatus: 'saved', toStatus: 'applied' }]
            ),
          }),
        }),
      } as any;
    });

    const { GET } = await import('@/app/api/applications/[id]/route');
    const res = await GET(
      createRequest('GET', `/api/applications/${APP_UUID}`),
      createRouteContext({ id: APP_UUID }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.job).toBeDefined();
    expect(body.interviews).toBeDefined();
    expect(body.statusHistory).toBeDefined();
  });
});

// ── PUT /api/applications/[id] ──────────────────────────────────────────

describe('PUT /api/applications/[id]', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns 401 when unauthenticated', async () => {
    await mockUnauthenticated();
    const { PUT } = await import('@/app/api/applications/[id]/route');
    const res = await PUT(
      createRequest('PUT', `/api/applications/${APP_UUID}`, { notes: 'test' }),
      createRouteContext({ id: APP_UUID }),
    );
    expect(res.status).toBe(401);
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

    const { PUT } = await import('@/app/api/applications/[id]/route');
    const res = await PUT(
      createRequest('PUT', `/api/applications/${APP_UUID}`, { notes: 'test' }),
      createRouteContext({ id: APP_UUID }),
    );
    expect(res.status).toBe(404);
  });

  it('updates successfully', async () => {
    await mockAuthenticatedUser();
    const { db } = await import('@/db');
    const updated = { id: APP_UUID, notes: 'Updated notes', status: 'saved' };
    vi.mocked(db.update).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([updated]),
        }),
      }),
    } as any);

    const { PUT } = await import('@/app/api/applications/[id]/route');
    const res = await PUT(
      createRequest('PUT', `/api/applications/${APP_UUID}`, { notes: 'Updated notes' }),
      createRouteContext({ id: APP_UUID }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.notes).toBe('Updated notes');
  });
});

// ── PATCH /api/applications/[id]/status ─────────────────────────────────

describe('PATCH /api/applications/[id]/status', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns 401 when unauthenticated', async () => {
    await mockUnauthenticated();
    const { PATCH } = await import('@/app/api/applications/[id]/status/route');
    const res = await PATCH(
      createRequest('PATCH', `/api/applications/${APP_UUID}/status`, { status: 'applied' }),
      createRouteContext({ id: APP_UUID }),
    );
    expect(res.status).toBe(401);
  });

  it('returns 400 on invalid status value', async () => {
    await mockAuthenticatedUser();
    const { PATCH } = await import('@/app/api/applications/[id]/status/route');
    const res = await PATCH(
      createRequest('PATCH', `/api/applications/${APP_UUID}/status`, { status: 'bogus' }),
      createRouteContext({ id: APP_UUID }),
    );
    expect(res.status).toBe(400);
  });

  it('returns 404 when application not found', async () => {
    await mockAuthenticatedUser();
    const { db } = await import('@/db');
    // The route first does a select to get current app
    vi.mocked(db.select).mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    }) as any);

    const { PATCH } = await import('@/app/api/applications/[id]/status/route');
    const res = await PATCH(
      createRequest('PATCH', `/api/applications/${APP_UUID}/status`, { status: 'applied' }),
      createRouteContext({ id: APP_UUID }),
    );
    expect(res.status).toBe(404);
  });

  it('inserts statusHistory record on status change', async () => {
    await mockAuthenticatedUser();
    const { db } = await import('@/db');

    const currentApp = { id: APP_UUID, status: 'saved', userId: mockUser.id, appliedDate: null };
    const updatedApp = { ...currentApp, status: 'applied' };

    // Mock select for fetching current app
    vi.mocked(db.select).mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([currentApp]),
        }),
      }),
    }) as any);

    // Track transaction calls
    const txInsert = vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    });
    const txUpdate = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([updatedApp]),
        }),
      }),
    });
    vi.mocked(db.transaction).mockImplementation(async (fn: any) => {
      return fn({ insert: txInsert, update: txUpdate });
    });

    const { PATCH } = await import('@/app/api/applications/[id]/status/route');
    const res = await PATCH(
      createRequest('PATCH', `/api/applications/${APP_UUID}/status`, { status: 'applied' }),
      createRouteContext({ id: APP_UUID }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.statusChanged).toBe(true);
    expect(body.oldStatus).toBe('saved');
    expect(body.newStatus).toBe('applied');

    // Verify statusHistory insert was called
    expect(txInsert).toHaveBeenCalled();
  });

  it('does NOT insert statusHistory when status unchanged', async () => {
    await mockAuthenticatedUser();
    const { db } = await import('@/db');

    const currentApp = { id: APP_UUID, status: 'applied', userId: mockUser.id };

    vi.mocked(db.select).mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([currentApp]),
        }),
      }),
    }) as any);

    const { PATCH } = await import('@/app/api/applications/[id]/status/route');
    const res = await PATCH(
      createRequest('PATCH', `/api/applications/${APP_UUID}/status`, { status: 'applied' }),
      createRouteContext({ id: APP_UUID }),
    );
    expect(res.status).toBe(200);
    // No transaction should be called when status unchanged
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it('sets appliedDate when transitioning to applied for first time', async () => {
    await mockAuthenticatedUser();
    const { db } = await import('@/db');

    const currentApp = { id: APP_UUID, status: 'saved', userId: mockUser.id, appliedDate: null };
    const updatedApp = { ...currentApp, status: 'applied', appliedDate: new Date().toISOString() };

    vi.mocked(db.select).mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([currentApp]),
        }),
      }),
    }) as any);

    let capturedSetData: any = null;
    const txInsert = vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    });
    const txUpdate = vi.fn().mockReturnValue({
      set: vi.fn().mockImplementation((data: any) => {
        capturedSetData = data;
        return {
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedApp]),
          }),
        };
      }),
    });
    vi.mocked(db.transaction).mockImplementation(async (fn: any) => {
      return fn({ insert: txInsert, update: txUpdate });
    });

    const { PATCH } = await import('@/app/api/applications/[id]/status/route');
    const res = await PATCH(
      createRequest('PATCH', `/api/applications/${APP_UUID}/status`, { status: 'applied' }),
      createRouteContext({ id: APP_UUID }),
    );
    expect(res.status).toBe(200);
    // The update data should contain appliedDate
    expect(capturedSetData).toBeDefined();
    expect(capturedSetData.appliedDate).toBeDefined();
    expect(capturedSetData.status).toBe('applied');
  });

  it('returns { statusChanged, oldStatus, newStatus } shape', async () => {
    await mockAuthenticatedUser();
    const { db } = await import('@/db');

    const currentApp = { id: APP_UUID, status: 'applied', userId: mockUser.id, appliedDate: new Date() };
    const updatedApp = { ...currentApp, status: 'interviewing' };

    vi.mocked(db.select).mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([currentApp]),
        }),
      }),
    }) as any);

    vi.mocked(db.transaction).mockImplementation(async (fn: any) => {
      const tx = {
        insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([updatedApp]),
            }),
          }),
        }),
      };
      return fn(tx);
    });

    const { PATCH } = await import('@/app/api/applications/[id]/status/route');
    const res = await PATCH(
      createRequest('PATCH', `/api/applications/${APP_UUID}/status`, { status: 'interviewing' }),
      createRouteContext({ id: APP_UUID }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('statusChanged', true);
    expect(body).toHaveProperty('oldStatus', 'applied');
    expect(body).toHaveProperty('newStatus', 'interviewing');
  });
});
