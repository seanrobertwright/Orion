import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { applications, jobs } from '@/db/schema';
import { requireAuth } from '@/lib/auth/session';
import {
  parseOptionalApplicationStatus,
  parsePaginationParams,
} from '@/lib/validations/api';
import { eq, and, desc, sql } from 'drizzle-orm';
import { isApplicationStale } from '@/lib/utils/stale';

// GET /api/applications - List applications with job details, stale flag, status filtering
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;
    const searchParams = request.nextUrl.searchParams;

    // Query params
    const status = searchParams.get('status');
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

    // Build where conditions
    const conditions: any[] = [eq(applications.userId, user.id)];

    if (statusValue) {
      conditions.push(eq(applications.status, statusValue));
    }
    const whereCondition = and(...conditions);

    const [countRow] = await db
      .select({
        total: sql<number>`cast(count(*) as int)`,
      })
      .from(applications)
      .where(whereCondition);

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
      .where(whereCondition)
      .orderBy(desc(applications.updatedAt))
      .limit(pagination.limit)
      .offset(pagination.offset);

    // Add stale flag
    const applicationsWithStale = results.map((app) => ({
      ...app,
      isStale: isApplicationStale(app.status, app.updatedAt),
    }));

    const total = countRow?.total ?? 0;

    return NextResponse.json({
      data: applicationsWithStale,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit),
      },
    }, { headers: { 'Cache-Control': 'private, max-age=300' } });
  } catch (error) {
    console.error('GET /api/applications error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch applications' },
      { status: 500 }
    );
  }
}
