import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { applications, jobs, interviews, statusHistory } from '@/db/schema';
import { updateApplicationSchema } from '@/lib/validations/application';
import { requireAuth } from '@/lib/auth/session';
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
    const user = await requireAuth();
    const { id } = await context.params;

    // Fetch application
    const [application] = await db
      .select()
      .from(applications)
      .where(and(eq(applications.id, id), eq(applications.userId, user.id)))
      .limit(1);

    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Fetch job
    const [job] = await db
      .select()
      .from(jobs)
      .where(eq(jobs.id, application.jobId))
      .limit(1);

    // Fetch interviews
    const applicationInterviews = await db
      .select()
      .from(interviews)
      .where(eq(interviews.applicationId, id))
      .orderBy(interviews.scheduledAt);

    // Fetch status history
    const history = await db
      .select()
      .from(statusHistory)
      .where(eq(statusHistory.applicationId, id))
      .orderBy(desc(statusHistory.changedAt));

    return NextResponse.json({
      ...application,
      job,
      interviews: applicationInterviews,
      statusHistory: history,
    });
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
    const user = await requireAuth();
    const { id } = await context.params;
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

    // Check application exists and belongs to user
    const [existingApp] = await db
      .select()
      .from(applications)
      .where(and(eq(applications.id, id), eq(applications.userId, user.id)))
      .limit(1);

    if (!existingApp) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Update application
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.appliedDate !== undefined) updateData.appliedDate = new Date(data.appliedDate);
    if (data.coverLetterId !== undefined) updateData.coverLetterId = data.coverLetterId;
    if (data.resumeUsed !== undefined) updateData.resumeUsed = data.resumeUsed;
    if (data.contactPerson !== undefined) updateData.contactPerson = data.contactPerson;
    if (data.referral !== undefined) updateData.referral = data.referral;

    const [updatedApp] = await db
      .update(applications)
      .set(updateData)
      .where(eq(applications.id, id))
      .returning();

    return NextResponse.json(updatedApp);
  } catch (error) {
    console.error('PUT /api/applications/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to update application' },
      { status: 500 }
    );
  }
}
