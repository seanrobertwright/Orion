import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { jobs, applications, interviews } from '@/db/schema';
import { updateJobSchema } from '@/lib/validations/job';
import { requireAuth } from '@/lib/auth/session';
import { validateUuidParam } from '@/lib/validations/api';
import { eq, and } from 'drizzle-orm';

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/jobs/[id] - Fetch job with application and interviews
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;
    const { id } = await context.params;
    const invalidIdResponse = validateUuidParam(id, 'job id');

    if (invalidIdResponse) {
      return invalidIdResponse;
    }

    // Fetch job with application in a single LEFT JOIN
    const [jobWithApp] = await db
      .select({
        job: jobs,
        application: applications,
      })
      .from(jobs)
      .leftJoin(applications, eq(jobs.id, applications.jobId))
      .where(and(eq(jobs.id, id), eq(jobs.userId, user.id)))
      .limit(1);

    if (!jobWithApp) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // Fetch interviews if application exists
    const jobInterviews = jobWithApp.application
      ? await db
          .select()
          .from(interviews)
          .where(eq(interviews.applicationId, jobWithApp.application.id))
      : [];

    return NextResponse.json({
      ...jobWithApp.job,
      application: jobWithApp.application,
      interviews: jobInterviews,
    }, { headers: { 'Cache-Control': 'private, max-age=300' } });
  } catch (error) {
    console.error('GET /api/jobs/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job' },
      { status: 500 }
    );
  }
}

// PUT /api/jobs/[id] - Update job details
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;
    const { id } = await context.params;
    const invalidIdResponse = validateUuidParam(id, 'job id');
    if (invalidIdResponse) return invalidIdResponse;
    const body = await request.json();

    // Validate input
    const validation = updateJobSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.format() },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Update job (single query — userId in WHERE handles ownership check)
    const [updatedJob] = await db
      .update(jobs)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(eq(jobs.id, id), eq(jobs.userId, user.id)))
      .returning();

    if (!updatedJob) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedJob);
  } catch (error) {
    console.error('PUT /api/jobs/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to update job' },
      { status: 500 }
    );
  }
}

// DELETE /api/jobs/[id] - Delete job (cascade to application)
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;
    const { id } = await context.params;
    const invalidIdResponse = validateUuidParam(id, 'job id');

    if (invalidIdResponse) {
      return invalidIdResponse;
    }

    // Delete job (single query — userId in WHERE handles ownership check)
    const [deleted] = await db
      .delete(jobs)
      .where(and(eq(jobs.id, id), eq(jobs.userId, user.id)))
      .returning();

    if (!deleted) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/jobs/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to delete job' },
      { status: 500 }
    );
  }
}
