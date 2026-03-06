import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { interviews, applications } from '@/db/schema';
import { requireAuth } from '@/lib/auth/session';
import { parseOptionalUuid, parsePaginationParams } from '@/lib/validations/api';
import { eq, and, desc, sql } from 'drizzle-orm';
import { z } from 'zod';

// Validation schema
const createInterviewSchema = z.object({
  applicationId: z.string().uuid(),
  scheduledAt: z.string().datetime(),
  type: z.enum(['phone_screen', 'technical', 'behavioral', 'system_design', 'onsite', 'final', 'other']),
  notes: z.string().max(10000).optional(),
  location: z.string().max(500).optional(),
  interviewers: z.string().max(500).optional(),
});

// GET /api/interviews - List interviews for user
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;
    const { searchParams } = new URL(request.url);
    const applicationId = searchParams.get('applicationId');
    const { value: pagination, error: paginationError } = parsePaginationParams(
      searchParams.get('page'),
      searchParams.get('limit')
    );
    const { value: applicationIdValue, error: applicationIdError } = parseOptionalUuid(
      applicationId,
      'applicationId'
    );

    if (paginationError) {
      return paginationError;
    }

    if (applicationIdError) {
      return applicationIdError;
    }
    if (!pagination) {
      return NextResponse.json({ error: 'Invalid pagination parameters' }, { status: 400 });
    }

    // Build where conditions
    const whereConditions = applicationIdValue
      ? and(
          eq(applications.userId, user.id),
          eq(interviews.applicationId, applicationIdValue)
        )
      : eq(applications.userId, user.id);

    const [countRow] = await db
      .select({
        total: sql<number>`cast(count(*) as int)`,
      })
      .from(interviews)
      .innerJoin(applications, eq(interviews.applicationId, applications.id))
      .where(whereConditions);

    const results = await db
      .select({
        interview: interviews,
        application: applications,
      })
      .from(interviews)
      .innerJoin(applications, eq(interviews.applicationId, applications.id))
      .where(whereConditions)
      .orderBy(desc(interviews.scheduledAt))
      .limit(pagination.limit)
      .offset(pagination.offset);

    // Format results
    const formattedInterviews = results.map((row) => ({
      ...row.interview,
      application: row.application,
    }));

    const total = countRow?.total ?? 0;

    return NextResponse.json({
      data: formattedInterviews,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit),
      },
    }, { headers: { 'Cache-Control': 'private, max-age=300' } });
  } catch (error) {
    console.error('GET /api/interviews error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch interviews' },
      { status: 500 }
    );
  }
}

// POST /api/interviews - Create new interview
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;
    const body = await request.json();

    // Validate input
    const validation = createInterviewSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.format() },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Verify application belongs to user
    const [application] = await db
      .select()
      .from(applications)
      .where(
        and(
          eq(applications.id, data.applicationId),
          eq(applications.userId, user.id)
        )
      )
      .limit(1);

    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Create interview
    const [interview] = await db
      .insert(interviews)
      .values({
        applicationId: data.applicationId,
        scheduledAt: new Date(data.scheduledAt),
        type: data.type,
        notes: data.notes,
        location: data.location,
        interviewers: data.interviewers,
        outcome: 'pending',
      })
      .returning();

    return NextResponse.json(interview, { status: 201 });
  } catch (error) {
    console.error('POST /api/interviews error:', error);
    return NextResponse.json(
      { error: 'Failed to create interview' },
      { status: 500 }
    );
  }
}
