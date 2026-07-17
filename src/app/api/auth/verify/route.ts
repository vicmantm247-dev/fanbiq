import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { eq, desc, sql } from "drizzle-orm";
import { db, nativeUsers, verificationTokens } from "@/db";
import { getValidatedSession } from "@/lib/server/validate-session";
import { SessionData } from "@/types";
import { verifyOtpSchema } from "@/lib/validations";
import { logger } from "@/lib/logger";
import { handleApiError } from "@/lib/api-utils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = verifyOtpSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json({ message: "Invalid input" }, { status: 400 });
    }

    const { userId, otp } = validated.data;

    const user = await db
      .select()
      .from(nativeUsers)
      .where(eq(nativeUsers.id, userId))
      .then((r: typeof nativeUsers.$inferSelect[]) => r[0]);

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    if (user.isVerified) {
      return NextResponse.json({ message: "Account is already verified" }, { status: 400 });
    }

    const tokenRow = await db
      .select()
      .from(verificationTokens)
      .where(eq(verificationTokens.userId, userId))
      .orderBy(desc(verificationTokens.createdAt))
      .limit(1)
      .then((r: typeof verificationTokens.$inferSelect[]) => r[0]); // latest token

    if (!tokenRow) {
      return NextResponse.json({ message: "No verification code found. Request a new one." }, { status: 400 });
    }

    // Check expiry
    if (new Date(tokenRow.expiresAt) < new Date()) {
      return NextResponse.json({ message: "Verification code has expired. Request a new one." }, { status: 400 });
    }

    // Check OTP
    const valid = await bcrypt.compare(otp, tokenRow.token);
    if (!valid) {
      // Increment attempts; if exceeded, delete token
      await db
        .update(verificationTokens)
        .set({ attempts: sql`${verificationTokens.attempts} + 1` })
        .where(eq(verificationTokens.id, tokenRow.id));

      const refreshed = await db
        .select()
        .from(verificationTokens)
        .where(eq(verificationTokens.id, tokenRow.id))
        .then((r: typeof verificationTokens.$inferSelect[]) => r[0]);

      if (!refreshed || refreshed.attempts >= 5) {
        await db.delete(verificationTokens).where(eq(verificationTokens.id, tokenRow.id));
        return NextResponse.json({ message: "Verification code locked due to too many incorrect attempts" }, { status: 401 });
      }

      return NextResponse.json({ message: "Incorrect verification code" }, { status: 401 });
    }

    // Mark verified and clean up tokens
    await db
      .update(nativeUsers)
      .set({ isVerified: true, updatedAt: new Date() })
      .where(eq(nativeUsers.id, userId));

    await db.delete(verificationTokens).where(eq(verificationTokens.userId, userId));

    // Create session
    const session = await getValidatedSession();

    session.user = {
      Id: user.id,
      Name: user.username,
      DeviceId: `native-${user.id}`,
      isAdmin: false,
      provider: "native",
      sessionVersion: user.sessionVersion ?? 1,
    };
    session.isLoggedIn = true;
    await session.save();

    logger.info(`[Verify] User ${user.username} verified and logged in`);

    return NextResponse.json({ success: true, user: session.user });
  } catch (error) {
    return handleApiError(error, "Verification failed");
  }
}