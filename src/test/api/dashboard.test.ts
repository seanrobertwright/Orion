import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequest } from '../helpers/request';
import { mockUser, mockAuthenticatedUser, mockUnauthenticated } from '../helpers/auth';

vi.mock('@/lib/auth/session', () => ({
  requireAuth: vi.fn(),
}));

vi.mock('@/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
  },
}));

vi.mock('drizzle-orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('drizzle-orm')>();
  return {
    ...actual,
    eq: vi.fn((...args: unknown[]) => ({ type: 'eq', args })),
    and: vi.fn((...args: unknown[]) => ({ type: 'and', args })),
    inArray: vi.fn((...args: unknown[]) => ({ type: 'inArray', args })),
  };
});

vi.mock('@/lib/utils/stale', () => ({
  isApplicationStale: vi.fn().mockReturnValue(false),
}));

describe('GET /api/dashboard/stats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    await mockUnauthenticated();

    const { GET } = await import('@/app/api/dashboard/stats/route');
    const request = createRequest('GET', '/api/dashboard/stats');
    const response = await GET(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns all 8 stat fields', async () => {
    await mockAuthenticatedUser();
    const { db } = await import('@/db');

    // First select: allApps query
    // Second select: interviewedApps query
    let selectCallCount = 0;
    vi.mocked(db.select).mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              { id: 'app-1', status: 'applied', appliedDate: '2025-01-01', updatedAt: new Date() },
            ]),
          }),
        } as any;
      }
      // interviewedApps query
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            groupBy: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any;
    });

    const { GET } = await import('@/app/api/dashboard/stats/route');
    const request = createRequest('GET', '/api/dashboard/stats');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('jobsInQueue');
    expect(body).toHaveProperty('totalActive');
    expect(body).toHaveProperty('interviewed');
    expect(body).toHaveProperty('staleJobs');
    expect(body).toHaveProperty('totalApplied');
    expect(body).toHaveProperty('totalResponses');
    expect(body).toHaveProperty('responseRate');
    expect(body).toHaveProperty('interviewRate');
  });

  it('returns empty stats when user has no applications', async () => {
    await mockAuthenticatedUser();
    const { db } = await import('@/db');

    vi.mocked(db.select).mockImplementation(() => {
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      } as any;
    });

    const { GET } = await import('@/app/api/dashboard/stats/route');
    const request = createRequest('GET', '/api/dashboard/stats');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      jobsInQueue: 0,
      totalActive: 0,
      interviewed: 0,
      staleJobs: 0,
      totalApplied: 0,
      totalResponses: 0,
      responseRate: 0,
      interviewRate: 0,
    });
  });

  it('responseRate is 0 when totalApplied is 0 (no division by zero)', async () => {
    await mockAuthenticatedUser();
    const { db } = await import('@/db');

    // Only saved apps — none are "applied"
    let selectCallCount = 0;
    vi.mocked(db.select).mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              { id: 'app-1', status: 'saved', appliedDate: null, updatedAt: null },
            ]),
          }),
        } as any;
      }
      // interviewedApps query (has applicationIds so this runs)
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            groupBy: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any;
    });

    const { GET } = await import('@/app/api/dashboard/stats/route');
    const request = createRequest('GET', '/api/dashboard/stats');
    const response = await GET(request);
    const body = await response.json();

    expect(body.responseRate).toBe(0);
    expect(body.interviewRate).toBe(0);
    expect(body.totalApplied).toBe(0);
  });

  it('interviewRate is 0 when totalApplied is 0', async () => {
    await mockAuthenticatedUser();
    const { db } = await import('@/db');

    vi.mocked(db.select).mockImplementation(() => {
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      } as any;
    });

    const { GET } = await import('@/app/api/dashboard/stats/route');
    const request = createRequest('GET', '/api/dashboard/stats');
    const response = await GET(request);
    const body = await response.json();

    expect(body.interviewRate).toBe(0);
  });

  it('responseRate calculates correctly: 3 responses / 10 applied = 30%', async () => {
    await mockAuthenticatedUser();
    const { db } = await import('@/db');

    // Build 10 applied apps: 7 "applied" (no response), 2 "interviewing", 1 "rejected"
    const apps = [
      ...Array.from({ length: 7 }, (_, i) => ({
        id: `app-${i}`, status: 'applied', appliedDate: '2025-01-01', updatedAt: new Date(),
      })),
      { id: 'app-7', status: 'interviewing', appliedDate: '2025-01-01', updatedAt: new Date() },
      { id: 'app-8', status: 'interviewing', appliedDate: '2025-01-01', updatedAt: new Date() },
      { id: 'app-9', status: 'rejected', appliedDate: '2025-01-01', updatedAt: new Date() },
    ];

    let selectCallCount = 0;
    vi.mocked(db.select).mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(apps),
          }),
        } as any;
      }
      // interviewedApps from statusHistory
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            groupBy: vi.fn().mockResolvedValue([
              { applicationId: 'app-7' },
              { applicationId: 'app-8' },
            ]),
          }),
        }),
      } as any;
    });

    const { GET } = await import('@/app/api/dashboard/stats/route');
    const request = createRequest('GET', '/api/dashboard/stats');
    const response = await GET(request);
    const body = await response.json();

    // totalResponses = interviewing(2) + rejected(1) = 3
    // totalApplied = applied(7) + interviewing(2) + rejected(1) = 10
    expect(body.totalResponses).toBe(3);
    expect(body.totalApplied).toBe(10);
    expect(body.responseRate).toBe(30);
  });

  it('interviewRate calculates correctly', async () => {
    await mockAuthenticatedUser();
    const { db } = await import('@/db');

    // 5 applied apps, 2 have reached interviewing
    const apps = [
      ...Array.from({ length: 3 }, (_, i) => ({
        id: `app-${i}`, status: 'applied', appliedDate: '2025-01-01', updatedAt: new Date(),
      })),
      { id: 'app-3', status: 'interviewing', appliedDate: '2025-01-01', updatedAt: new Date() },
      { id: 'app-4', status: 'rejected', appliedDate: '2025-01-01', updatedAt: new Date() },
    ];

    let selectCallCount = 0;
    vi.mocked(db.select).mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(apps),
          }),
        } as any;
      }
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            groupBy: vi.fn().mockResolvedValue([
              { applicationId: 'app-3' },
              { applicationId: 'app-4' },
            ]),
          }),
        }),
      } as any;
    });

    const { GET } = await import('@/app/api/dashboard/stats/route');
    const request = createRequest('GET', '/api/dashboard/stats');
    const response = await GET(request);
    const body = await response.json();

    // interviewed=2, totalApplied=5, rate=40%
    expect(body.interviewed).toBe(2);
    expect(body.interviewRate).toBe(40);
  });

  it('staleJobs counts correctly based on isApplicationStale', async () => {
    await mockAuthenticatedUser();
    const { db } = await import('@/db');
    const { isApplicationStale } = await import('@/lib/utils/stale');

    // 3 applied apps, isApplicationStale returns true for 2
    const apps = [
      { id: 'app-1', status: 'applied', appliedDate: '2025-01-01', updatedAt: new Date('2025-01-01') },
      { id: 'app-2', status: 'applied', appliedDate: '2025-01-01', updatedAt: new Date('2025-01-02') },
      { id: 'app-3', status: 'applied', appliedDate: '2025-01-01', updatedAt: new Date('2025-06-01') },
    ];

    let staleCallCount = 0;
    vi.mocked(isApplicationStale).mockImplementation(() => {
      staleCallCount++;
      return staleCallCount <= 2; // first two are stale
    });

    let selectCallCount = 0;
    vi.mocked(db.select).mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(apps),
          }),
        } as any;
      }
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            groupBy: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any;
    });

    const { GET } = await import('@/app/api/dashboard/stats/route');
    const request = createRequest('GET', '/api/dashboard/stats');
    const response = await GET(request);
    const body = await response.json();

    expect(body.staleJobs).toBe(2);
  });

  it('returns 200 with cache-control header set to private, max-age=300', async () => {
    await mockAuthenticatedUser();
    const { db } = await import('@/db');

    vi.mocked(db.select).mockImplementation(() => {
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      } as any;
    });

    const { GET } = await import('@/app/api/dashboard/stats/route');
    const request = createRequest('GET', '/api/dashboard/stats');
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('private, max-age=300');
  });
});
