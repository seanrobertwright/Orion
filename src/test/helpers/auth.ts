import { vi } from 'vitest';
import { NextResponse } from 'next/server';

export const mockUser = {
  id: 'test-user-id-123',
  email: 'test@example.com',
  name: 'Test User',
};

/**
 * Set requireAuth to return an authenticated user.
 * Prerequisite: the test file must have `vi.mock('@/lib/auth/session', ...)` at the top level.
 * Then call this in beforeEach or inside each test.
 */
export async function mockAuthenticatedUser(user = mockUser) {
  const { requireAuth } = await import('@/lib/auth/session');
  vi.mocked(requireAuth).mockResolvedValue(user as any);
}

/**
 * Set requireAuth to return a 401 response.
 * Prerequisite: the test file must have `vi.mock('@/lib/auth/session', ...)` at the top level.
 */
export async function mockUnauthenticated() {
  const { requireAuth } = await import('@/lib/auth/session');
  vi.mocked(requireAuth).mockResolvedValue(
    NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  );
}
