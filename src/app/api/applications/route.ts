import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { applications, jobs } from '@/db/schema';
import { requireAuth } from '@/lib/auth/session';
import { eq, and } from 'drizzle-orm';
import { isApplicationStale } from '@/lib/utils/stale';

// GET /api/applications - List applications with job details, stale flag, status filtering
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const searchParams = request.nextUrl.searchParams;

    // Query params
    const status = searchParams.get('status');

    // Build where conditions
    const conditions: any[] = [eq(applications.userId, user.id)];

    if (status) {
      conditions.push(eq(applications.status, status as any));
    }

    // Query applications with job details
    const results = await db
      .select({
        id: applications.id,
        status: applications.status,
        appliedDate: applications.appliedDate,
        resumeUsed: applications.resumeUsed,
        coverLetterId: applications.coverLetterId,
        notes: applications.notes,
        contactPerson: applications.contactPerson,
        referral: applications.referral,
        createdAt: applications.createdAt,
        updatedAt: applications.updatedAt,
        jobId: jobs.id,
        jobTitle: jobs.title,
        jobCompany: jobs.company,
        jobLocation: jobs.location,
        jobUrl: jobs.url,
      })
      .from(applications)
      .innerJoin(jobs, eq(applications.jobId, jobs.id))
      .where(and(...conditions))
      .orderBy(applications.updatedAt);

    // Add stale flag
    const applicationsWithStale = results.map((app) => ({
      ...app,
      isStale: isApplicationStale(app.status, app.updatedAt),
    }));

    return NextResponse.json(applicationsWithStale);
  } catch (error) {
    console.error('GET /api/applications error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch applications' },
      { status: 500 }
    );
  }
}
