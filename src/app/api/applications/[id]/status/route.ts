import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { applications, statusHistory } from '@/db/schema';
import { changeStatusSchema } from '@/lib/validations/application';
import { requireAuth } from '@/lib/auth/session';
import { eq, and } from 'drizzle-orm';

type RouteContext = {
  params: Promise<{ id: string }>;
};

// PATCH /api/applications/[id]/status - Change status with history logging
// CRITICAL: This endpoint MUST log EVERY status change to statusHistory
// Allows ANY status transition (flexible, not linear)
export async function PATCH(
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
    const validation = changeStatusSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.format() },
        { status: 400 }
      );
    }

    const { status: newStatus } = validation.data;

    // Fetch current application
    const [currentApp] = await db
      .select()
      .from(applications)
      .where(and(eq(applications.id, id), eq(applications.userId, user.id)))
      .limit(1);

    if (!currentApp) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    const oldStatus = currentApp.status;

    // Don't proceed if status hasn't changed
    if (oldStatus === newStatus) {
      return NextResponse.json(currentApp);
    }

    const now = new Date();

    // CRITICAL: Log status change to history BEFORE updating application
    await db.insert(statusHistory).values({
      applicationId: id,
      fromStatus: oldStatus,
      toStatus: newStatus,
      changedAt: now,
    });

    // Prepare update data
    const updateData: any = {
      status: newStatus,
      updatedAt: now,
    };

    // If changing TO 'applied' and appliedDate is null, set it
    if (newStatus === 'applied' && !currentApp.appliedDate) {
      updateData.appliedDate = now;
    }

    // Update application
    const [updatedApp] = await db
      .update(applications)
      .set(updateData)
      .where(eq(applications.id, id))
      .returning();

    return NextResponse.json({
      ...updatedApp,
      statusChanged: true,
      oldStatus,
      newStatus,
    });
  } catch (error) {
    console.error('PATCH /api/applications/[id]/status error:', error);
    return NextResponse.json(
      { error: 'Failed to change status' },
      { status: 500 }
    );
  }
}
