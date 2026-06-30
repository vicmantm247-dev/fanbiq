import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db, nativeUsers } from "@/db";
import { usernameSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get("username")?.trim() || "";

  const validated = usernameSchema.safeParse(username);
  if (!validated.success) {
    const message = validated.error.issues?.[0]?.message || "Invalid username";
    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }

  const existingUser = await db
    .select()
    .from(nativeUsers)
    .where(sql`lower(${nativeUsers.username}) = lower(${username})`)
    .then((rows: typeof nativeUsers.$inferSelect[]) => rows[0]);

  return NextResponse.json({ available: !existingUser });
}
