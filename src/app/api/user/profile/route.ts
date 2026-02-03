import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

// GET /api/user/profile - Get current user profile
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
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
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('GET /api/user/profile error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

// PUT /api/user/profile - Update current user profile
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, salaryMin, salaryMax, workPreference } = body;

    // Validation
    const errors: string[] = [];

    if (salaryMin !== null && salaryMin !== undefined) {
      if (typeof salaryMin !== 'number' || salaryMin < 0) {
        errors.push('Minimum salary must be a positive number');
      }
    }

    if (salaryMax !== null && salaryMax !== undefined) {
      if (typeof salaryMax !== 'number' || salaryMax < 0) {
        errors.push('Maximum salary must be a positive number');
      }
    }

    if (salaryMin && salaryMax && salaryMin > salaryMax) {
      errors.push('Minimum salary cannot be greater than maximum salary');
    }

    if (workPreference && !['remote', 'hybrid', 'onsite', 'flexible'].includes(workPreference)) {
      errors.push('Work preference must be one of: remote, hybrid, onsite, flexible');
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', details: errors },
        { status: 400 }
      );
    }

    // Update user
    const [updatedUser] = await db
      .update(users)
      .set({
        name: name !== undefined ? name : undefined,
        salaryMin: salaryMin !== undefined ? salaryMin : undefined,
        salaryMax: salaryMax !== undefined ? salaryMax : undefined,
        workPreference: workPreference !== undefined ? workPreference : undefined,
        updatedAt: new Date(),
      })
      .where(eq(users.id, session.user.id))
      .returning({
        name: users.name,
        email: users.email,
        salaryMin: users.salaryMin,
        salaryMax: users.salaryMax,
        workPreference: users.workPreference,
      });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('PUT /api/user/profile error:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
