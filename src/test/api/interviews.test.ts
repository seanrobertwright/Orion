import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequest, createRouteContext } from '../helpers/request';
import { mockUser, mockAuthenticatedUser, mockUnauthenticated } from '../helpers/auth';

// Mock dependencies
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
    groupBy: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('drizzle-orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('drizzle-orm')>();
  return {
    ...actual,
    eq: vi.fn((...args: unknown[]) => ({ type: 'eq', args })),
    and: vi.fn((...args: unknown[]) => ({ type: 'and', args })),
    desc: vi.fn((col: unknown) => ({ type: 'desc', col })),
    sql: Object.assign(
      (strings: TemplateStringsArray, ...values: unknown[]) => ({ type: 'sql', strings, values }),
      { raw: (s: string) => s }
    ),
  };
});

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';
const APP_UUID = '660e8400-e29b-41d4-a716-446655440001';

const mockApplication = {
  id: APP_UUID,
  userId: mockUser.id,
  company: 'Acme Corp',
  position: 'Engineer',
  status: 'applied',
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

const mockInterview = {
  id: VALID_UUID,
  applicationId: APP_UUID,
  scheduledAt: new Date('2025-02-01T10:00:00Z'),
  type: 'technical',
  notes: 'Prepare for system design',
  location: 'Zoom',
  interviewers: 'Jane Doe',
  outcome: 'pending',
  feedback: null,
  createdAt: new Date('2025-01-15'),
  updatedAt: new Date('2025-01-15'),
};

// ─── GET /api/interviews ───

describe('GET /api/interviews', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    await mockUnauthenticated();
    const { GET } = await import('@/app/api/interviews/route');
    const response = await GET(createRequest('GET', '/api/interviews'));
    expect(response.status).toBe(401);
  });

  it('returns paginated interviews joined with application data', async () => {
    await mockAuthenticatedUser();
    const { db } = await import('@/db');

    let selectCallCount = 0;
    vi.mocked(db.select).mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        // Count query
        return {
          from: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ total: 1 }]),
            }),
          }),
        } as any;
      }
      // Results query
      return {
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  offset: vi.fn().mockResolvedValue([
                    { interview: mockInterview, application: mockApplication },
                  ]),
                }),
              }),
            }),
          }),
        }),
      } as any;
    });

    const { GET } = await import('@/app/api/interviews/route');
    const response = await GET(createRequest('GET', '/api/interviews'));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toHaveProperty('application');
    expect(body.pagination.total).toBe(1);
  });

  it('applicationId query param filters to specific application', async () => {
    await mockAuthenticatedUser();
    const { db } = await import('@/db');

    let selectCallCount = 0;
    vi.mocked(db.select).mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        return {
          from: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ total: 0 }]),
            }),
          }),
        } as any;
      }
      return {
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  offset: vi.fn().mockResolvedValue([]),
                }),
              }),
            }),
          }),
        }),
      } as any;
    });

    const { GET } = await import('@/app/api/interviews/route');
    const response = await GET(createRequest('GET', `/api/interviews?applicationId=${APP_UUID}`));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toHaveLength(0);
  });
});

// ─── POST /api/interviews ───

describe('POST /api/interviews', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validBody = {
    applicationId: APP_UUID,
    scheduledAt: '2025-02-01T10:00:00Z',
    type: 'technical',
  };

  it('returns 401 when unauthenticated', async () => {
    await mockUnauthenticated();
    const { POST } = await import('@/app/api/interviews/route');
    const response = await POST(createRequest('POST', '/api/interviews', validBody));
    expect(response.status).toBe(401);
  });

  it('returns 400 on missing required fields', async () => {
    await mockAuthenticatedUser();
    const { POST } = await import('@/app/api/interviews/route');

    // Missing applicationId
    const res1 = await POST(createRequest('POST', '/api/interviews', {
      scheduledAt: '2025-02-01T10:00:00Z',
      type: 'technical',
    }));
    expect(res1.status).toBe(400);

    // Missing scheduledAt
    const res2 = await POST(createRequest('POST', '/api/interviews', {
      applicationId: APP_UUID,
      type: 'technical',
    }));
    expect(res2.status).toBe(400);

    // Missing type
    const res3 = await POST(createRequest('POST', '/api/interviews', {
      applicationId: APP_UUID,
      scheduledAt: '2025-02-01T10:00:00Z',
    }));
    expect(res3.status).toBe(400);
  });

  it('returns 400 when notes exceed 10000 chars', async () => {
    await mockAuthenticatedUser();
    const { POST } = await import('@/app/api/interviews/route');
    const response = await POST(createRequest('POST', '/api/interviews', {
      ...validBody,
      notes: 'A'.repeat(10001),
    }));
    expect(response.status).toBe(400);
  });

  it('returns 404 when applicationId does not exist or belongs to another user', async () => {
    await mockAuthenticatedUser();
    const { db } = await import('@/db');

    // Application lookup returns empty
    vi.mocked(db.select).mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    }) as any);

    const { POST } = await import('@/app/api/interviews/route');
    const response = await POST(createRequest('POST', '/api/interviews', validBody));
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toContain('Application not found');
  });

  it('returns 201 with created interview on success, outcome defaults to pending', async () => {
    await mockAuthenticatedUser();
    const { db } = await import('@/db');

    // Application lookup returns the application
    vi.mocked(db.select).mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([mockApplication]),
        }),
      }),
    }) as any);

    vi.mocked(db.returning).mockResolvedValue([{ ...mockInterview, outcome: 'pending' }]);

    const { POST } = await import('@/app/api/interviews/route');
    const response = await POST(createRequest('POST', '/api/interviews', validBody));
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.outcome).toBe('pending');
  });
});

// ─── GET /api/interviews/[id] ───

describe('GET /api/interviews/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    await mockUnauthenticated();
    const { GET } = await import('@/app/api/interviews/[id]/route');
    const response = await GET(
      createRequest('GET', `/api/interviews/${VALID_UUID}`),
      createRouteContext({ id: VALID_UUID })
    );
    expect(response.status).toBe(401);
  });

  it('returns 404 when interview not found or belongs to another user', async () => {
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

    const { GET } = await import('@/app/api/interviews/[id]/route');
    const response = await GET(
      createRequest('GET', `/api/interviews/${VALID_UUID}`),
      createRouteContext({ id: VALID_UUID })
    );
    expect(response.status).toBe(404);
  });

  it('returns interview with nested application', async () => {
    await mockAuthenticatedUser();
    const { db } = await import('@/db');

    vi.mocked(db.select).mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              { interview: mockInterview, application: mockApplication },
            ]),
          }),
        }),
      }),
    }) as any);

    const { GET } = await import('@/app/api/interviews/[id]/route');
    const response = await GET(
      createRequest('GET', `/api/interviews/${VALID_UUID}`),
      createRouteContext({ id: VALID_UUID })
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.application).toBeDefined();
    expect(body.type).toBe('technical');
  });
});

// ─── PUT /api/interviews/[id] ───

describe('PUT /api/interviews/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    await mockUnauthenticated();
    const { PUT } = await import('@/app/api/interviews/[id]/route');
    const response = await PUT(
      createRequest('PUT', `/api/interviews/${VALID_UUID}`, { outcome: 'passed' }),
      createRouteContext({ id: VALID_UUID })
    );
    expect(response.status).toBe(401);
  });

  it('returns 400 when feedback exceeds 10000 chars', async () => {
    await mockAuthenticatedUser();
    const { PUT } = await import('@/app/api/interviews/[id]/route');
    const response = await PUT(
      createRequest('PUT', `/api/interviews/${VALID_UUID}`, { feedback: 'A'.repeat(10001) }),
      createRouteContext({ id: VALID_UUID })
    );
    expect(response.status).toBe(400);
  });

  it('returns 404 when not found / not owned', async () => {
    await mockAuthenticatedUser();
    const { db } = await import('@/db');

    // Pre-flight JOIN returns empty
    vi.mocked(db.select).mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    }) as any);

    const { PUT } = await import('@/app/api/interviews/[id]/route');
    const response = await PUT(
      createRequest('PUT', `/api/interviews/${VALID_UUID}`, { outcome: 'passed' }),
      createRouteContext({ id: VALID_UUID })
    );
    expect(response.status).toBe(404);
  });

  it('updates outcome successfully', async () => {
    await mockAuthenticatedUser();
    const { db } = await import('@/db');

    // Pre-flight check returns existing interview
    vi.mocked(db.select).mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              { interview: mockInterview, application: mockApplication },
            ]),
          }),
        }),
      }),
    }) as any);

    const updatedInterview = { ...mockInterview, outcome: 'passed' };
    vi.mocked(db.returning).mockResolvedValue([updatedInterview]);

    const { PUT } = await import('@/app/api/interviews/[id]/route');
    const response = await PUT(
      createRequest('PUT', `/api/interviews/${VALID_UUID}`, { outcome: 'passed' }),
      createRouteContext({ id: VALID_UUID })
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.outcome).toBe('passed');
  });

  it('updates notes successfully', async () => {
    await mockAuthenticatedUser();
    const { db } = await import('@/db');

    vi.mocked(db.select).mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              { interview: mockInterview, application: mockApplication },
            ]),
          }),
        }),
      }),
    }) as any);

    const updatedInterview = { ...mockInterview, notes: 'Updated notes' };
    vi.mocked(db.returning).mockResolvedValue([updatedInterview]);

    const { PUT } = await import('@/app/api/interviews/[id]/route');
    const response = await PUT(
      createRequest('PUT', `/api/interviews/${VALID_UUID}`, { notes: 'Updated notes' }),
      createRouteContext({ id: VALID_UUID })
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.notes).toBe('Updated notes');
  });
});

// ─── DELETE /api/interviews/[id] ───

describe('DELETE /api/interviews/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    await mockUnauthenticated();
    const { DELETE } = await import('@/app/api/interviews/[id]/route');
    const response = await DELETE(
      createRequest('DELETE', `/api/interviews/${VALID_UUID}`),
      createRouteContext({ id: VALID_UUID })
    );
    expect(response.status).toBe(401);
  });

  it('returns 404 when not found / not owned', async () => {
    await mockAuthenticatedUser();
    const { db } = await import('@/db');

    // Pre-flight check returns empty
    vi.mocked(db.select).mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    }) as any);

    const { DELETE } = await import('@/app/api/interviews/[id]/route');
    const response = await DELETE(
      createRequest('DELETE', `/api/interviews/${VALID_UUID}`),
      createRouteContext({ id: VALID_UUID })
    );
    expect(response.status).toBe(404);
  });

  it('successfully deletes interview', async () => {
    await mockAuthenticatedUser();
    const { db } = await import('@/db');

    // Pre-flight check returns existing interview
    vi.mocked(db.select).mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              { interview: mockInterview, application: mockApplication },
            ]),
          }),
        }),
      }),
    }) as any);

    const { DELETE } = await import('@/app/api/interviews/[id]/route');
    const response = await DELETE(
      createRequest('DELETE', `/api/interviews/${VALID_UUID}`),
      createRouteContext({ id: VALID_UUID })
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
  });
});
