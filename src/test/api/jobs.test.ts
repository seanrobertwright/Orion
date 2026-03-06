import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequest } from '../helpers/request';
import { mockUser, mockAuthenticatedUser, mockUnauthenticated } from '../helpers/auth';

// Mock dependencies — these are hoisted to file top by vitest
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
    offset: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    transaction: vi.fn(),
    returning: vi.fn().mockResolvedValue([]),
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

describe('GET /api/jobs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    await mockUnauthenticated();

    const { GET } = await import('@/app/api/jobs/route');
    const request = createRequest('GET', '/api/jobs');
    const response = await GET(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns jobs list when authenticated', async () => {
    await mockAuthenticatedUser();

    const { db } = await import('@/db');

    // Mock the count query (first db.select call) and results query (second)
    let selectCallCount = 0;
    vi.mocked(db.select).mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        // Count query
        return {
          from: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ total: 0 }]),
            }),
          }),
        } as any;
      }
      // Results query
      return {
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
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

    const { GET } = await import('@/app/api/jobs/route');
    const request = createRequest('GET', '/api/jobs');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('pagination');
    expect(body.pagination.total).toBe(0);
  });
});
