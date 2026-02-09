import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { jobs, applications } from '@/db/schema';
import { createJobSchema } from '@/lib/validations/job';
import { requireAuth } from '@/lib/auth/session';
import { eq, and, or, ilike, desc } from 'drizzle-orm';
import { isApplicationStale } from '@/lib/utils/stale';

// GET /api/jobs - List user's jobs with application status and stale flag
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;
    const searchParams = request.nextUrl.searchParams;

    // Query params
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const sortBy = searchParams.get('sortBy') || 'createdAt';

    // Build where conditions
    const conditions: any[] = [eq(jobs.userId, user.id)];

    if (search) {
      conditions.push(
        or(
          ilike(jobs.title, `%${search}%`),
          ilike(jobs.company, `%${search}%`)
        )
      );
    }

    if (status) {
      conditions.push(eq(applications.status, status as any));
    }

    // Execute query
    const results = await db
      .select({
        id: jobs.id,
        title: jobs.title,
        company: jobs.company,
        location: jobs.location,
        url: jobs.url,
        description: jobs.description,
        requirements: jobs.requirements,
        niceToHaves: jobs.niceToHaves,
        salary: jobs.salary,
        source: jobs.source,
        isRemote: jobs.isRemote,
        createdAt: jobs.createdAt,
        updatedAt: jobs.updatedAt,
        applicationId: applications.id,
        applicationStatus: applications.status,
        applicationUpdatedAt: applications.updatedAt,
        appliedDate: applications.appliedDate,
      })
      .from(jobs)
      .leftJoin(applications, eq(jobs.id, applications.jobId))
      .where(and(...conditions));

    // Add stale flag
    const jobsWithStale = results.map((job) => ({
      ...job,
      isStale: job.applicationStatus && job.applicationUpdatedAt
        ? isApplicationStale(job.applicationStatus, job.applicationUpdatedAt)
        : false,
    }));

    // Sort
    if (sortBy === 'company') {
      jobsWithStale.sort((a, b) => a.company.localeCompare(b.company));
    } else if (sortBy === 'updatedAt') {
      jobsWithStale.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    } else {
      // Default: createdAt
      jobsWithStale.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    return NextResponse.json(jobsWithStale);
  } catch (error) {
    console.error('GET /api/jobs error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}

// POST /api/jobs - Create new job
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;
    const body = await request.json();

    // Validate input
    const validation = createJobSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.format() },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Create job
    const [newJob] = await db
      .insert(jobs)
      .values({
        userId: user.id,
        title: data.title,
        company: data.company,
        url: data.url || null,
        location: data.location || null,
        description: data.description || null,
        requirements: data.requirements || null,
        niceToHaves: data.niceToHaves || null,
        salary: data.salary || null,
        source: data.source || null,
        isRemote: data.isRemote || false,
      })
      .returning();

    // Auto-create application with status "saved"
    const [newApplication] = await db
      .insert(applications)
      .values({
        userId: user.id,
        jobId: newJob.id,
        status: 'saved',
      })
      .returning();

    return NextResponse.json(
      { job: newJob, application: newApplication },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/jobs error:', error);
    return NextResponse.json(
      { error: 'Failed to create job' },
      { status: 500 }
    );
  }
}
