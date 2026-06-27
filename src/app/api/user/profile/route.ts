import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { getSessionOptions } from "@/lib/session";
import { SessionData } from "@/types";
import { db, nativeUsers } from "@/lib/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  bio: z.string().max(500).optional(),
});

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, await getSessionOptions());

  if (!session.isLoggedIn || !session.user?.Id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const user = await db
      .select({
        id: nativeUsers.id,
        username: nativeUsers.username,
        email: nativeUsers.email,
        displayName: nativeUsers.displayName,
        bio: nativeUsers.bio,
      })
      .from(nativeUsers)
      .where(eq(nativeUsers.id, session.user.Id))
      .then((rows: Array<{ id: string; username: string; email: string; displayName: string | null; bio: string | null }>) => rows[0]);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, await getSessionOptions());

  if (!session.isLoggedIn || !session.user?.Id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await request.json();
    const validated = updateProfileSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (validated.data.displayName !== undefined) {
      updateData.displayName = validated.data.displayName;
    }

    if (validated.data.bio !== undefined) {
      updateData.bio = validated.data.bio;
    }

    await db
      .update(nativeUsers)
      .set(updateData)
      .where(eq(nativeUsers.id, session.user.Id));

    const updated = await db
      .select({
        id: nativeUsers.id,
        username: nativeUsers.username,
        displayName: nativeUsers.displayName,
        bio: nativeUsers.bio,
      })
      .from(nativeUsers)
      .where(eq(nativeUsers.id, session.user.Id))
      .then((rows: Array<{ id: string; username: string; displayName: string | null; bio: string | null }>) => rows[0]);

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
