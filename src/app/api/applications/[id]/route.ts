import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { applications, jobs, interviews, statusHistory } from '@/db/schema';
import { updateApplicationSchema } from '@/lib/validations/application';
import { requireAuth } from '@/lib/auth/session';
import { validateUuidParam } from '@/lib/validations/api';
import { eq, and, desc } from 'drizzle-orm';

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/applications/[id] - Full application with job, interviews, status history
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;
    const { id } = await context.params;
    const invalidIdResponse = validateUuidParam(id, 'application id');

    if (invalidIdResponse) {
      return invalidIdResponse;
    }

    // Fetch application with job in a single JOIN
    const [appWithJob] = await db
      .select({
        application: applications,
        job: jobs,
      })
      .from(applications)
      .innerJoin(jobs, eq(applications.jobId, jobs.id))
      .where(and(eq(applications.id, id), eq(applications.userId, user.id)))
      .limit(1);

    if (!appWithJob) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Fetch interviews and status history in parallel
    const [applicationInterviews, history] = await Promise.all([
      db.select().from(interviews)
        .where(eq(interviews.applicationId, id))
        .orderBy(interviews.scheduledAt),
      db.select().from(statusHistory)
        .where(eq(statusHistory.applicationId, id))
        .orderBy(desc(statusHistory.changedAt)),
    ]);

    return NextResponse.json({
      ...appWithJob.application,
      job: appWithJob.job,
      interviews: applicationInterviews,
      statusHistory: history,
    }, { headers: { 'Cache-Control': 'private, max-age=300' } });
  } catch (error) {
    console.error('GET /api/applications/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch application' },
      { status: 500 }
    );
  }
}

// PUT /api/applications/[id] - Update notes, appliedDate, coverLetterId
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;
    const { id } = await context.params;
    const invalidIdResponse = validateUuidParam(id, 'application id');
    if (invalidIdResponse) return invalidIdResponse;
    const body = await request.json();

    // Validate input
    const validation = updateApplicationSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.format() },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Build update object
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.appliedDate !== undefined) updateData.appliedDate = new Date(data.appliedDate);
    if (data.coverLetterId !== undefined) updateData.coverLetterId = data.coverLetterId;
    if (data.resumeUsed !== undefined) updateData.resumeUsed = data.resumeUsed;
    if (data.contactPerson !== undefined) updateData.contactPerson = data.contactPerson;
    if (data.referral !== undefined) updateData.referral = data.referral;

    // Update application (single query — userId in WHERE handles ownership check)
    const [updatedApp] = await db
      .update(applications)
      .set(updateData)
      .where(and(eq(applications.id, id), eq(applications.userId, user.id)))
      .returning();

    if (!updatedApp) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedApp);
  } catch (error) {
    console.error('PUT /api/applications/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to update application' },
      { status: 500 }
    );
  }
}
