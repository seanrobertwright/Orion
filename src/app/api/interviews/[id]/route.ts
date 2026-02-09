import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { interviews, applications } from '@/db/schema';
import { requireAuth } from '@/lib/auth/session';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

type RouteContext = {
  params: Promise<{ id: string }>;
};

// Validation schema for updates
const updateInterviewSchema = z.object({
  scheduledAt: z.string().datetime().optional(),
  type: z.enum(['phone_screen', 'technical', 'behavioral', 'system_design', 'onsite', 'final', 'other']).optional(),
  notes: z.string().optional(),
  location: z.string().optional(),
  interviewers: z.string().optional(),
  outcome: z.enum(['pending', 'passed', 'failed', 'cancelled']).optional(),
  feedback: z.string().optional(),
});

// GET /api/interviews/[id] - Fetch single interview
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;
    const { id } = await context.params;

    // Fetch interview with application details
    const [result] = await db
      .select({
        interview: interviews,
        application: applications,
      })
      .from(interviews)
      .innerJoin(applications, eq(interviews.applicationId, applications.id))
      .where(
        and(
          eq(interviews.id, id),
          eq(applications.userId, user.id)
        )
      )
      .limit(1);

    if (!result) {
      return NextResponse.json(
        { error: 'Interview not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...result.interview,
      application: result.application,
    });
  } catch (error) {
    console.error('GET /api/interviews/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch interview' },
      { status: 500 }
    );
  }
}

// PUT /api/interviews/[id] - Update interview
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;
    const { id } = await context.params;
    const body = await request.json();

    // Validate input
    const validation = updateInterviewSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.format() },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Verify interview exists and belongs to user
    const [existing] = await db
      .select({
        interview: interviews,
        application: applications,
      })
      .from(interviews)
      .innerJoin(applications, eq(interviews.applicationId, applications.id))
      .where(
        and(
          eq(interviews.id, id),
          eq(applications.userId, user.id)
        )
      )
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: 'Interview not found' },
        { status: 404 }
      );
    }

    // Build update object
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (data.scheduledAt !== undefined) updateData.scheduledAt = new Date(data.scheduledAt);
    if (data.type !== undefined) updateData.type = data.type;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.interviewers !== undefined) updateData.interviewers = data.interviewers;
    if (data.outcome !== undefined) updateData.outcome = data.outcome;
    if (data.feedback !== undefined) updateData.feedback = data.feedback;

    // Update interview
    const [updated] = await db
      .update(interviews)
      .set(updateData)
      .where(eq(interviews.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PUT /api/interviews/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to update interview' },
      { status: 500 }
    );
  }
}

// DELETE /api/interviews/[id] - Delete interview
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;
    const { id } = await context.params;

    // Verify interview exists and belongs to user
    const [existing] = await db
      .select({
        interview: interviews,
        application: applications,
      })
      .from(interviews)
      .innerJoin(applications, eq(interviews.applicationId, applications.id))
      .where(
        and(
          eq(interviews.id, id),
          eq(applications.userId, user.id)
        )
      )
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: 'Interview not found' },
        { status: 404 }
      );
    }

    // Delete interview
    await db.delete(interviews).where(eq(interviews.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/interviews/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to delete interview' },
      { status: 500 }
    );
  }
}
