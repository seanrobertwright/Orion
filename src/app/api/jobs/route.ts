import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { jobs, applications } from '@/db/schema';
import { createJobSchema } from '@/lib/validations/job';
import {
  parseOptionalApplicationStatus,
  parsePaginationParams,
} from '@/lib/validations/api';
import { requireAuth } from '@/lib/auth/session';
import { eq, and, or, ilike, desc, asc, sql } from 'drizzle-orm';
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
    const sortByParam = searchParams.get('sortBy') || 'createdAt';
    const { value: pagination, error: paginationError } = parsePaginationParams(
      searchParams.get('page'),
      searchParams.get('limit')
    );
    const { value: statusValue, error: statusError } = parseOptionalApplicationStatus(status);

    if (paginationError) {
      return paginationError;
    }

    if (statusError) {
      return statusError;
    }
    if (!pagination) {
      return NextResponse.json({ error: 'Invalid pagination parameters' }, { status: 400 });
    }

    const sortBy = ['createdAt', 'updatedAt', 'company'].includes(sortByParam)
      ? sortByParam
      : 'createdAt';

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

    if (statusValue) {
      conditions.push(eq(applications.status, statusValue));
    }

    const whereCondition = and(...conditions);
    const orderByExpr =
      sortBy === 'company'
        ? asc(jobs.company)
        : sortBy === 'updatedAt'
          ? desc(jobs.updatedAt)
          : desc(jobs.createdAt);

    const [countRow] = await db
      .select({
        total: sql<number>`cast(count(distinct ${jobs.id}) as int)`,
      })
      .from(jobs)
      .leftJoin(applications, eq(jobs.id, applications.jobId))
      .where(whereCondition);

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
      .where(whereCondition)
      .orderBy(orderByExpr)
      .limit(pagination.limit)
      .offset(pagination.offset);

    // Add stale flag
    const jobsWithStale = results.map((job) => ({
      ...job,
      isStale: job.applicationStatus && job.applicationUpdatedAt
        ? isApplicationStale(job.applicationStatus, job.applicationUpdatedAt)
        : false,
    }));

    const total = countRow?.total ?? 0;

    return NextResponse.json({
      data: jobsWithStale,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit),
      },
    }, { headers: { 'Cache-Control': 'private, max-age=300' } });
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

    const result = await db.transaction(async (tx) => {
      const [newJob] = await tx
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

      const [newApplication] = await tx
        .insert(applications)
        .values({
          userId: user.id,
          jobId: newJob.id,
          status: 'saved',
        })
        .returning();

      return { newJob, newApplication };
    });

    return NextResponse.json(
      { job: result.newJob, application: result.newApplication },
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
