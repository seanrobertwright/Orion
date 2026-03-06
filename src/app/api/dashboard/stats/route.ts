import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { applications, statusHistory } from '@/db/schema';
import { requireAuth } from '@/lib/auth/session';
import { eq, and, inArray } from 'drizzle-orm';
import { isApplicationStale } from '@/lib/utils/stale';

// GET /api/dashboard/stats - Return dashboard statistics for authenticated user
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    // Fetch all applications with their details efficiently
    const allApps = await db
      .select({
        id: applications.id,
        status: applications.status,
        appliedDate: applications.appliedDate,
        updatedAt: applications.updatedAt,
      })
      .from(applications)
      .where(eq(applications.userId, user.id));

    // Calculate all app-based stats in a single pass
    let jobsInQueue = 0;
    let totalActive = 0;
    let staleJobs = 0;
    let totalApplied = 0;
    let totalResponses = 0;
    const applicationIds: string[] = [];

    for (const app of allApps) {
      applicationIds.push(app.id);
      if (app.status === 'saved') jobsInQueue++;
      if (app.status !== 'rejected' && app.status !== 'offered') totalActive++;
      if (app.status === 'applied' && app.updatedAt && isApplicationStale(app.status, app.updatedAt)) staleJobs++;
      if (['applied', 'interviewing', 'offered', 'rejected'].includes(app.status)) totalApplied++;
      if (['interviewing', 'offered', 'rejected'].includes(app.status)) totalResponses++;
    }

    // Calculate interviewed count (apps that reached interviewing status)
    // Check statusHistory where toStatus='interviewing'
    let interviewed = 0;
    if (applicationIds.length > 0) {
      const interviewedApps = await db
        .select({
          applicationId: statusHistory.applicationId,
        })
        .from(statusHistory)
        .where(
          and(
            inArray(statusHistory.applicationId, applicationIds),
            eq(statusHistory.toStatus, 'interviewing')
          )
        )
        .groupBy(statusHistory.applicationId);

      interviewed = interviewedApps.length;
    }

    // Calculate rates
    const responseRate = totalApplied > 0
      ? Math.round((totalResponses / totalApplied) * 100)
      : 0;

    const interviewRate = totalApplied > 0
      ? Math.round((interviewed / totalApplied) * 100)
      : 0;

    return NextResponse.json({
      jobsInQueue,
      totalActive,
      interviewed,
      staleJobs,
      totalApplied,
      totalResponses,
      responseRate,
      interviewRate,
    }, { headers: { 'Cache-Control': 'private, max-age=300' } });
  } catch (error) {
    console.error('GET /api/dashboard/stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    );
  }
}
