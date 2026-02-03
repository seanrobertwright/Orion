import { auth } from '@/lib/auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { ProfileForm } from '@/components/profile/ProfileForm';

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const [user] = await db
    .select({
      name: users.name,
      email: users.email,
      salaryMin: users.salaryMin,
      salaryMax: users.salaryMax,
      workPreference: users.workPreference,
    })
    .from(users)
    .where(eq(users.id, session.user.id));

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900">Orion</h1>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-6">
          <Link href="/dashboard" className="hover:text-gray-900">
            Dashboard
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900">Profile</span>
        </div>

        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Your Profile</h2>
          <p className="text-gray-600 mt-2">
            Manage your personal information and job search preferences
          </p>
        </div>

        {/* Profile Form */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <ProfileForm initialData={user} />
        </div>
      </main>
    </div>
  );
}
