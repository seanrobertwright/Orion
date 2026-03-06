import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { userQuestionnaire, users } from '@/db/schema';
import { auth } from '@/lib/auth';
import { eq } from 'drizzle-orm';

// Helper to calculate completion percentage
function calculateCompletionPercentage(data: any): number {
  const requiredFields = [
    'technicalSkills',
    'preferredRoles',
    'preferredIndustries',
    'yearsExperience',
    'careerGoals',
  ];

  let filledCount = 0;

  for (const field of requiredFields) {
    const value = data[field];
    if (value !== null && value !== undefined && value !== '') {
      // For JSON arrays, check if they have content
      if (typeof value === 'string' && (field === 'technicalSkills' || field === 'preferredRoles' || field === 'preferredIndustries')) {
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed) && parsed.length > 0) {
            filledCount++;
          }
        } catch {
          // If not valid JSON, check if string has content
          if (value.trim().length > 0) {
            filledCount++;
          }
        }
      } else {
        filledCount++;
      }
    }
  }

  return Math.round((filledCount / requiredFields.length) * 100);
}

// Helper to check if questionnaire is complete
function isQuestionnaireComplete(data: any): boolean {
  return calculateCompletionPercentage(data) === 100;
}

// GET /api/questionnaire - Get user's questionnaire data
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get or create questionnaire
    let [questionnaire] = await db
      .select()
      .from(userQuestionnaire)
      .where(eq(userQuestionnaire.userId, session.user.id));

    if (!questionnaire) {
      // Create empty questionnaire
      [questionnaire] = await db
        .insert(userQuestionnaire)
        .values({
          userId: session.user.id,
        })
        .returning();
    }

    // Calculate completion stats
    const completionPercentage = calculateCompletionPercentage(questionnaire);
    const isComplete = questionnaire.completedAt !== null;

    return NextResponse.json({
      ...questionnaire,
      completionPercentage,
      isComplete,
    });
  } catch (error) {
    console.error('GET /api/questionnaire error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch questionnaire' },
      { status: 500 }
    );
  }
}

// PUT /api/questionnaire - Update questionnaire (partial updates allowed)
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      technicalSkills,
      preferredRoles,
      preferredIndustries,
      yearsExperience,
      careerGoals,
    } = body;

    // Get or create questionnaire
    let [existingQuestionnaire] = await db
      .select()
      .from(userQuestionnaire)
      .where(eq(userQuestionnaire.userId, session.user.id));

    if (!existingQuestionnaire) {
      [existingQuestionnaire] = await db
        .insert(userQuestionnaire)
        .values({
          userId: session.user.id,
        })
        .returning();
    }

    // Prepare update data (only include provided fields)
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (technicalSkills !== undefined) {
      // Convert array to JSON string if needed
      updateData.technicalSkills = Array.isArray(technicalSkills)
        ? JSON.stringify(technicalSkills)
        : technicalSkills;
    }

    if (preferredRoles !== undefined) {
      updateData.preferredRoles = Array.isArray(preferredRoles)
        ? JSON.stringify(preferredRoles)
        : preferredRoles;
    }

    if (preferredIndustries !== undefined) {
      updateData.preferredIndustries = Array.isArray(preferredIndustries)
        ? JSON.stringify(preferredIndustries)
        : preferredIndustries;
    }

    if (yearsExperience !== undefined) {
      updateData.yearsExperience = yearsExperience;
    }

    if (careerGoals !== undefined) {
      updateData.careerGoals = careerGoals;
    }

    // Update questionnaire
    const [updated] = await db
      .update(userQuestionnaire)
      .set(updateData)
      .where(eq(userQuestionnaire.userId, session.user.id))
      .returning();

    // Check if now complete (all required fields filled)
    const isComplete = isQuestionnaireComplete(updated);

    // If complete and not already marked, set completedAt
    if (isComplete && !updated.completedAt) {
      const [fullyUpdated] = await db
        .update(userQuestionnaire)
        .set({
          completedAt: new Date(),
        })
        .where(eq(userQuestionnaire.userId, session.user.id))
        .returning();

      const completionPercentage = calculateCompletionPercentage(fullyUpdated);

      return NextResponse.json({
        ...fullyUpdated,
        completionPercentage,
        isComplete: true,
      });
    }

    const completionPercentage = calculateCompletionPercentage(updated);

    return NextResponse.json({
      ...updated,
      completionPercentage,
      isComplete: updated.completedAt !== null,
    });
  } catch (error) {
    console.error('PUT /api/questionnaire error:', error);
    return NextResponse.json(
      { error: 'Failed to update questionnaire' },
      { status: 500 }
    );
  }
}
