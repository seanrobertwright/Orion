import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

/**
 * Get the current authenticated user from NextAuth session
 * Returns null if not authenticated
 */
export async function getCurrentUser() {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email || '',
    name: session.user.name || '',
  };
}

/**
 * Require authentication - returns user or unauthorized response
 * Use this in API routes that require auth
 *
 * @example
 * const authResult = await requireAuth();
 * if (authResult instanceof NextResponse) return authResult;
 * const user = authResult;
 */
export async function requireAuth() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  return user;
}
