import { auth } from '@/lib/auth';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back, {session.user.name}!
        </h2>
        <p className="text-gray-600">
          Your intelligent job hunt assistant is ready to help you find and track opportunities.
        </p>
      </div>

      <DashboardStats />
    </div>
  );
}
