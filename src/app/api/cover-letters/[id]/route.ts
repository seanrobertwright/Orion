import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { coverLetters, applications } from '@/db/schema';
import { requireAuth } from '@/lib/auth/session';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

type RouteContext = {
  params: Promise<{ id: string }>;
};

// Validation schema for updates
const updateCoverLetterSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  content: z.string().min(1, 'Content is required').optional(),
});

// GET /api/cover-letters/[id] - Fetch full cover letter
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;
    const { id } = await context.params;

    const [letter] = await db
      .select()
      .from(coverLetters)
      .where(
        and(
          eq(coverLetters.id, id),
          eq(coverLetters.userId, user.id)
        )
      )
      .limit(1);

    if (!letter) {
      return NextResponse.json(
        { error: 'Cover letter not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(letter);
  } catch (error) {
    console.error('GET /api/cover-letters/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cover letter' },
      { status: 500 }
    );
  }
}

// PUT /api/cover-letters/[id] - Update cover letter
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
    const validation = updateCoverLetterSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.format() },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Verify cover letter exists and belongs to user
    const [existing] = await db
      .select()
      .from(coverLetters)
      .where(
        and(
          eq(coverLetters.id, id),
          eq(coverLetters.userId, user.id)
        )
      )
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: 'Cover letter not found' },
        { status: 404 }
      );
    }

    // Check if new title conflicts with another letter
    if (data.title && data.title !== existing.title) {
      const [conflict] = await db
        .select()
        .from(coverLetters)
        .where(
          and(
            eq(coverLetters.userId, user.id),
            eq(coverLetters.title, data.title)
          )
        )
        .limit(1);

      if (conflict) {
        return NextResponse.json(
          { error: 'A cover letter with this title already exists' },
          { status: 409 }
        );
      }
    }

    // Build update object
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (data.title !== undefined) updateData.title = data.title;
    if (data.content !== undefined) updateData.content = data.content;

    // Update cover letter
    const [updated] = await db
      .update(coverLetters)
      .set(updateData)
      .where(eq(coverLetters.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PUT /api/cover-letters/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to update cover letter' },
      { status: 500 }
    );
  }
}

// DELETE /api/cover-letters/[id] - Delete cover letter
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;
    const { id } = await context.params;

    // Verify cover letter exists and belongs to user
    const [existing] = await db
      .select()
      .from(coverLetters)
      .where(
        and(
          eq(coverLetters.id, id),
          eq(coverLetters.userId, user.id)
        )
      )
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: 'Cover letter not found' },
        { status: 404 }
      );
    }

    // Unlink from all applications (set coverLetterId to null)
    await db
      .update(applications)
      .set({ coverLetterId: null })
      .where(eq(applications.coverLetterId, id));

    // Delete cover letter
    await db.delete(coverLetters).where(eq(coverLetters.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/cover-letters/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to delete cover letter' },
      { status: 500 }
    );
  }
}
