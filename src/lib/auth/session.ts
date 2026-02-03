// Placeholder for auth session helper
// This will be replaced in plan 01-02 when NextAuth is configured

export async function getCurrentUser() {
  // TODO: Replace with actual NextAuth session check in 01-02
  // For now, return a mock user for development
  return {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'dev@example.com',
    name: 'Dev User',
  };
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}
