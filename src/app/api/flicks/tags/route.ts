import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const query = searchParams.get('query')?.trim().toLowerCase() ?? '';
  const searchTerm = query ? `${query}%` : '%';

  try {
    const rows = await db.execute(sql`
      SELECT tag, COUNT(*) AS count
      FROM flicks, unnest(tags) AS tag
      WHERE tag ILIKE ${searchTerm}
      GROUP BY tag
      ORDER BY count DESC, tag ASC
      LIMIT 20
    `);

    const tags = Array.isArray(rows)
      ? rows.map((row: any) => String(row.tag))
      : [];

    return NextResponse.json({ tags });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load tag suggestions' }, { status: 500 });
  }
}
