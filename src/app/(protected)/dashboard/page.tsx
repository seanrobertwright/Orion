import { auth } from '@/lib/auth';
import { UserMenu } from '@/components/auth/UserMenu';

export default async function DashboardPage() {
  const session = await auth();

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Orion</h1>
          <UserMenu />
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Welcome back, {session?.user?.name}!
        </h2>
        <p className="text-gray-600">
          Your intelligent job hunt assistant is ready to help you find and track opportunities.
        </p>
      </main>
    </div>
  );
}
