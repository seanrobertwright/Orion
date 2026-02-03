import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { jobs, applications, statusHistory } from '@/db/schema';
import { requireAuth } from '@/lib/auth/session';
import { eq, and, sql, notInArray, inArray } from 'drizzle-orm';
import { isApplicationStale } from '@/lib/utils/stale';

// GET /api/dashboard/stats - Return dashboard statistics for authenticated user
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

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

    // Calculate jobsInQueue (saved status)
    const jobsInQueue = allApps.filter(app => app.status === 'saved').length;

    // Calculate totalActive (NOT rejected or offered)
    const totalActive = allApps.filter(
      app => app.status !== 'rejected' && app.status !== 'offered'
    ).length;

    // Calculate staleJobs (applied status > 14 days)
    const staleJobs = allApps.filter(app => {
      if (app.status !== 'applied' || !app.updatedAt) return false;
      return isApplicationStale(app.status, app.updatedAt);
    }).length;

    // Calculate totalApplied (applied status or beyond)
    const totalApplied = allApps.filter(
      app => ['applied', 'interviewing', 'offered', 'rejected'].includes(app.status)
    ).length;

    // Calculate interviewed count (apps that reached interviewing status)
    // Check statusHistory where toStatus='interviewing'
    const applicationIds = allApps.map(app => app.id);

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

    // Calculate totalResponses (moved past applied)
    const totalResponses = allApps.filter(
      app => ['interviewing', 'offered', 'rejected'].includes(app.status)
    ).length;

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
    });
  } catch (error) {
    console.error('GET /api/dashboard/stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    );
  }
}
