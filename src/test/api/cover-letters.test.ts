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
const OTHER_UUID = '660e8400-e29b-41d4-a716-446655440001';

const mockCoverLetter = {
  id: VALID_UUID,
  userId: mockUser.id,
  title: 'My Cover Letter',
  content: 'This is the content of my cover letter that is detailed and well-written.',
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

// ─── GET /api/cover-letters ───

describe('GET /api/cover-letters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    await mockUnauthenticated();
    const { GET } = await import('@/app/api/cover-letters/route');
    const response = await GET(createRequest('GET', '/api/cover-letters'));
    expect(response.status).toBe(401);
  });

  it('returns paginated list with preview', async () => {
    await mockAuthenticatedUser();
    const { db } = await import('@/db');

    const longContent = 'A'.repeat(300);
    let selectCallCount = 0;
    vi.mocked(db.select).mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ total: 1 }]),
          }),
        } as any;
      }
      return {
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              groupBy: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    offset: vi.fn().mockResolvedValue([
                      { ...mockCoverLetter, content: longContent, usageCount: 2 },
                    ]),
                  }),
                }),
              }),
            }),
          }),
        }),
      } as any;
    });

    const { GET } = await import('@/app/api/cover-letters/route');
    const response = await GET(createRequest('GET', '/api/cover-letters'));
    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.data).toHaveLength(1);
    expect(body.data[0].preview).toHaveLength(203); // 200 chars + '...'
    expect(body.data[0]).not.toHaveProperty('content');
    expect(body.pagination.total).toBe(1);
  });

  it('returns empty list when user has no cover letters', async () => {
    await mockAuthenticatedUser();
    const { db } = await import('@/db');

    let selectCallCount = 0;
    vi.mocked(db.select).mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ total: 0 }]),
          }),
        } as any;
      }
      return {
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              groupBy: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    offset: vi.fn().mockResolvedValue([]),
                  }),
                }),
              }),
            }),
          }),
        }),
      } as any;
    });

    const { GET } = await import('@/app/api/cover-letters/route');
    const response = await GET(createRequest('GET', '/api/cover-letters'));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toHaveLength(0);
    expect(body.pagination.total).toBe(0);
  });
});

// ─── POST /api/cover-letters ───

describe('POST /api/cover-letters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    await mockUnauthenticated();
    const { POST } = await import('@/app/api/cover-letters/route');
    const response = await POST(createRequest('POST', '/api/cover-letters', { title: 'x', content: 'y' }));
    expect(response.status).toBe(401);
  });

  it('returns 400 on missing title or content', async () => {
    await mockAuthenticatedUser();
    const { POST } = await import('@/app/api/cover-letters/route');

    const res1 = await POST(createRequest('POST', '/api/cover-letters', { content: 'y' }));
    expect(res1.status).toBe(400);

    const res2 = await POST(createRequest('POST', '/api/cover-letters', { title: 'x' }));
    expect(res2.status).toBe(400);
  });

  it('returns 400 when title exceeds 200 chars', async () => {
    await mockAuthenticatedUser();
    const { POST } = await import('@/app/api/cover-letters/route');
    const response = await POST(createRequest('POST', '/api/cover-letters', {
      title: 'A'.repeat(201),
      content: 'valid content',
    }));
    expect(response.status).toBe(400);
  });

  it('returns 400 when content exceeds 50000 chars', async () => {
    await mockAuthenticatedUser();
    const { POST } = await import('@/app/api/cover-letters/route');
    const response = await POST(createRequest('POST', '/api/cover-letters', {
      title: 'Valid Title',
      content: 'A'.repeat(50001),
    }));
    expect(response.status).toBe(400);
  });

  it('returns 409 when title already exists for this user', async () => {
    await mockAuthenticatedUser();
    const { db } = await import('@/db');

    // Duplicate check returns existing record
    vi.mocked(db.select).mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([mockCoverLetter]),
        }),
      }),
    }) as any);

    const { POST } = await import('@/app/api/cover-letters/route');
    const response = await POST(createRequest('POST', '/api/cover-letters', {
      title: 'My Cover Letter',
      content: 'Some content',
    }));
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toContain('already exists');
  });

  it('returns 201 with created cover letter on success', async () => {
    await mockAuthenticatedUser();
    const { db } = await import('@/db');

    // Duplicate check returns empty
    vi.mocked(db.select).mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    }) as any);

    vi.mocked(db.returning).mockResolvedValue([mockCoverLetter]);

    const { POST } = await import('@/app/api/cover-letters/route');
    const response = await POST(createRequest('POST', '/api/cover-letters', {
      title: 'My Cover Letter',
      content: 'This is the content of my cover letter that is detailed and well-written.',
    }));
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.title).toBe('My Cover Letter');
  });
});

// ─── GET /api/cover-letters/[id] ───

describe('GET /api/cover-letters/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    await mockUnauthenticated();
    const { GET } = await import('@/app/api/cover-letters/[id]/route');
    const response = await GET(
      createRequest('GET', `/api/cover-letters/${VALID_UUID}`),
      createRouteContext({ id: VALID_UUID })
    );
    expect(response.status).toBe(401);
  });

  it('returns 400 on invalid UUID format', async () => {
    await mockAuthenticatedUser();
    const { GET } = await import('@/app/api/cover-letters/[id]/route');
    const response = await GET(
      createRequest('GET', '/api/cover-letters/not-a-uuid'),
      createRouteContext({ id: 'not-a-uuid' })
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('Invalid');
  });

  it('returns 404 when not found or belongs to another user', async () => {
    await mockAuthenticatedUser();
    const { db } = await import('@/db');

    vi.mocked(db.select).mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    }) as any);

    const { GET } = await import('@/app/api/cover-letters/[id]/route');
    const response = await GET(
      createRequest('GET', `/api/cover-letters/${VALID_UUID}`),
      createRouteContext({ id: VALID_UUID })
    );
    expect(response.status).toBe(404);
  });

  it('returns full cover letter', async () => {
    await mockAuthenticatedUser();
    const { db } = await import('@/db');

    vi.mocked(db.select).mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([mockCoverLetter]),
        }),
      }),
    }) as any);

    const { GET } = await import('@/app/api/cover-letters/[id]/route');
    const response = await GET(
      createRequest('GET', `/api/cover-letters/${VALID_UUID}`),
      createRouteContext({ id: VALID_UUID })
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.title).toBe('My Cover Letter');
    expect(body.content).toBe(mockCoverLetter.content);
  });
});

// ─── PUT /api/cover-letters/[id] ───

describe('PUT /api/cover-letters/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    await mockUnauthenticated();
    const { PUT } = await import('@/app/api/cover-letters/[id]/route');
    const response = await PUT(
      createRequest('PUT', `/api/cover-letters/${VALID_UUID}`, { title: 'New Title' }),
      createRouteContext({ id: VALID_UUID })
    );
    expect(response.status).toBe(401);
  });

  it('returns 400 when content exceeds 50000 chars', async () => {
    await mockAuthenticatedUser();
    const { PUT } = await import('@/app/api/cover-letters/[id]/route');
    const response = await PUT(
      createRequest('PUT', `/api/cover-letters/${VALID_UUID}`, { content: 'A'.repeat(50001) }),
      createRouteContext({ id: VALID_UUID })
    );
    expect(response.status).toBe(400);
  });

  it('returns 409 when new title conflicts with a different cover letter', async () => {
    await mockAuthenticatedUser();
    const { db } = await import('@/db');

    // Conflict check returns a DIFFERENT cover letter
    vi.mocked(db.select).mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ ...mockCoverLetter, id: OTHER_UUID }]),
        }),
      }),
    }) as any);

    const { PUT } = await import('@/app/api/cover-letters/[id]/route');
    const response = await PUT(
      createRequest('PUT', `/api/cover-letters/${VALID_UUID}`, { title: 'My Cover Letter' }),
      createRouteContext({ id: VALID_UUID })
    );
    expect(response.status).toBe(409);
  });

  it('no conflict when updating to same title (conflict.id === id)', async () => {
    await mockAuthenticatedUser();
    const { db } = await import('@/db');

    // Conflict check returns the SAME cover letter (same id)
    vi.mocked(db.select).mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([mockCoverLetter]),
        }),
      }),
    }) as any);

    const updatedLetter = { ...mockCoverLetter, title: 'My Cover Letter' };
    vi.mocked(db.returning).mockResolvedValue([updatedLetter]);

    const { PUT } = await import('@/app/api/cover-letters/[id]/route');
    const response = await PUT(
      createRequest('PUT', `/api/cover-letters/${VALID_UUID}`, { title: 'My Cover Letter' }),
      createRouteContext({ id: VALID_UUID })
    );
    expect(response.status).toBe(200);
  });

  it('returns 404 when not found / not owned', async () => {
    await mockAuthenticatedUser();
    const { db } = await import('@/db');

    // No conflict found
    vi.mocked(db.select).mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    }) as any);

    // Update returns empty (not found / not owned)
    vi.mocked(db.returning).mockResolvedValue([]);

    const { PUT } = await import('@/app/api/cover-letters/[id]/route');
    const response = await PUT(
      createRequest('PUT', `/api/cover-letters/${VALID_UUID}`, { title: 'New Title' }),
      createRouteContext({ id: VALID_UUID })
    );
    expect(response.status).toBe(404);
  });

  it('updates successfully', async () => {
    await mockAuthenticatedUser();
    const { db } = await import('@/db');

    // No conflict found
    vi.mocked(db.select).mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    }) as any);

    const updatedLetter = { ...mockCoverLetter, title: 'Updated Title' };
    vi.mocked(db.returning).mockResolvedValue([updatedLetter]);

    const { PUT } = await import('@/app/api/cover-letters/[id]/route');
    const response = await PUT(
      createRequest('PUT', `/api/cover-letters/${VALID_UUID}`, { title: 'Updated Title' }),
      createRouteContext({ id: VALID_UUID })
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.title).toBe('Updated Title');
  });
});

// ─── DELETE /api/cover-letters/[id] ───

describe('DELETE /api/cover-letters/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    await mockUnauthenticated();
    const { DELETE } = await import('@/app/api/cover-letters/[id]/route');
    const response = await DELETE(
      createRequest('DELETE', `/api/cover-letters/${VALID_UUID}`),
      createRouteContext({ id: VALID_UUID })
    );
    expect(response.status).toBe(401);
  });

  it('returns 404 when not found / not owned', async () => {
    await mockAuthenticatedUser();
    const { db } = await import('@/db');

    // delete().where().returning() returns empty
    vi.mocked(db.returning).mockResolvedValue([]);

    const { DELETE } = await import('@/app/api/cover-letters/[id]/route');
    const response = await DELETE(
      createRequest('DELETE', `/api/cover-letters/${VALID_UUID}`),
      createRouteContext({ id: VALID_UUID })
    );
    expect(response.status).toBe(404);
  });

  it('on success: deletes cover letter and unlinks from applications', async () => {
    await mockAuthenticatedUser();
    const { db } = await import('@/db');

    // delete().where().returning() returns the deleted letter
    vi.mocked(db.returning).mockResolvedValue([mockCoverLetter]);

    const { DELETE } = await import('@/app/api/cover-letters/[id]/route');
    const response = await DELETE(
      createRequest('DELETE', `/api/cover-letters/${VALID_UUID}`),
      createRouteContext({ id: VALID_UUID })
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);

    // Verify unlink was called (update was called to set coverLetterId to null)
    expect(db.update).toHaveBeenCalled();
    expect(db.set).toHaveBeenCalledWith({ coverLetterId: null });
  });
});
