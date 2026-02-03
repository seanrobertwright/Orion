import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { LoginButton } from '@/components/auth/LoginButton';

export default async function LoginPage() {
  const session = await auth();

  // Redirect to dashboard if already authenticated
  if (session?.user) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Orion</h1>
            <p className="text-gray-600">Your intelligent job hunt assistant</p>
          </div>

          <LoginButton />

          <p className="text-xs text-gray-500 text-center mt-6">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}
