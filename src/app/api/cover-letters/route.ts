import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { coverLetters, applications } from '@/db/schema';
import { requireAuth } from '@/lib/auth/session';
import { parsePaginationParams } from '@/lib/validations/api';
import { eq, and, sql, desc } from 'drizzle-orm';
import { z } from 'zod';

// Validation schema
const createCoverLetterSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  content: z.string().min(1, 'Content is required').max(50000),
});

// GET /api/cover-letters - List all cover letters for user
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;
    const searchParams = request.nextUrl.searchParams;
    const { value: pagination, error: paginationError } = parsePaginationParams(
      searchParams.get('page'),
      searchParams.get('limit')
    );

    if (paginationError) {
      return paginationError;
    }
    if (!pagination) {
      return NextResponse.json({ error: 'Invalid pagination parameters' }, { status: 400 });
    }

    const [countRow] = await db
      .select({
        total: sql<number>`cast(count(*) as int)`,
      })
      .from(coverLetters)
      .where(eq(coverLetters.userId, user.id));

    // Fetch cover letters with usage count
    const results = await db
      .select({
        id: coverLetters.id,
        title: coverLetters.title,
        content: coverLetters.content,
        createdAt: coverLetters.createdAt,
        updatedAt: coverLetters.updatedAt,
        usageCount: sql<number>`cast(count(${applications.id}) as int)`,
      })
      .from(coverLetters)
      .leftJoin(applications, eq(applications.coverLetterId, coverLetters.id))
      .where(eq(coverLetters.userId, user.id))
      .groupBy(coverLetters.id)
      .orderBy(desc(coverLetters.createdAt))
      .limit(pagination.limit)
      .offset(pagination.offset);

    // Format with preview (first 200 chars)
    const formatted = results.map((letter) => ({
      id: letter.id,
      title: letter.title,
      preview: letter.content.substring(0, 200) + (letter.content.length > 200 ? '...' : ''),
      createdAt: letter.createdAt,
      updatedAt: letter.updatedAt,
      usageCount: letter.usageCount || 0,
    }));

    const total = countRow?.total ?? 0;

    return NextResponse.json({
      data: formatted,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit),
      },
    }, { headers: { 'Cache-Control': 'private, max-age=300' } });
  } catch (error) {
    console.error('GET /api/cover-letters error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cover letters' },
      { status: 500 }
    );
  }
}

// POST /api/cover-letters - Create new cover letter
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;
    const body = await request.json();

    // Validate input
    const validation = createCoverLetterSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.format() },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Check if title is unique for this user
    const [existing] = await db
      .select()
      .from(coverLetters)
      .where(
        and(
          eq(coverLetters.userId, user.id),
          eq(coverLetters.title, data.title)
        )
      )
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: 'A cover letter with this title already exists' },
        { status: 409 }
      );
    }

    // Create cover letter
    const [letter] = await db
      .insert(coverLetters)
      .values({
        userId: user.id,
        title: data.title,
        content: data.content,
      })
      .returning();

    return NextResponse.json(letter, { status: 201 });
  } catch (error) {
    console.error('POST /api/cover-letters error:', error);
    return NextResponse.json(
      { error: 'Failed to create cover letter' },
      { status: 500 }
    );
  }
}
