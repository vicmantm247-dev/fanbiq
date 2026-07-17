import { NextRequest, NextResponse } from "next/server";
import { eq, desc, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, nativeUsers, verificationTokens } from "@/db";
import { logger } from "@/lib/logger";
import { getErrorMessage } from "@/lib/utils";
import { verifyOtpSchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = verifyOtpSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { userId, otp } = validated.data;

    // Verify user exists
    const user = await db
      .select()
      .from(nativeUsers)
      .where(eq(nativeUsers.id, userId))
      .then((r: typeof nativeUsers.$inferSelect[]) => r[0]);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get the latest verification token (ordered)
    const tokenRow = await db
      .select()
      .from(verificationTokens)
      .where(eq(verificationTokens.userId, userId))
      .orderBy(desc(verificationTokens.createdAt))
      .limit(1)
      .then((r: typeof verificationTokens.$inferSelect[]) => r[0]);

    if (!tokenRow) {
      return NextResponse.json(
        { error: "No verification code found. Request a new one." },
        { status: 400 }
      );
    }

    // Check expiry
    if (new Date(tokenRow.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: "Verification code has expired. Request a new one." },
        { status: 400 }
      );
    }

    // Verify OTP using bcrypt compare
    const valid = await bcrypt.compare(otp, tokenRow.token);
    if (!valid) {
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
        return NextResponse.json({ error: "Verification code locked due to too many incorrect attempts" }, { status: 400 });
      }

      return NextResponse.json({ error: "Invalid verification code" }, { status: 400 });
    }

    // OTP verified - return success with token for password change
    // The client will use this to proceed to password change
    return NextResponse.json(
      {
        message: "OTP verified successfully",
        userId,
        verified: true,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error("Failed to verify password change OTP:", error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
