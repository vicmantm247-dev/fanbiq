import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { eq, desc, sql } from "drizzle-orm";
import { getClientIp, isRateLimitedKey } from "@/lib/rate-limit";
import { db, nativeUsers, verificationTokens } from "@/db";
import { logger } from "@/lib/logger";
import { getErrorMessage } from "@/lib/utils";
import { z } from "zod";
import { getValidatedSession } from "@/lib/server/validate-session";
import { SessionData } from "@/types";

const resetPasswordSchema = z.object({
  userId: z.string().min(1),
  otp: z.string().length(6, "Code must be 6 digits"),
  newPassword: z.string().min(8, "Password must be at least 8 characters").max(128, "Password is too long"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = resetPasswordSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { userId, otp, newPassword } = validated.data;

    const user = await db
      .select()
      .from(nativeUsers)
      .where(eq(nativeUsers.id, userId))
      .then((r: typeof nativeUsers.$inferSelect[]) => r[0]);

    // Rate limiting: per-IP and per-account
    const ip = getClientIp(request);
    const ipLimit = isRateLimitedKey(`ip:${ip}`, 20, 60_000);
    if (ipLimit.limited) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": String(ipLimit.retryAfter) } });
    }

    const acctKey = `acct:${userId}`;
    const acctLimit = isRateLimitedKey(acctKey, 5, 60_000);
    if (acctLimit.limited) {
      return NextResponse.json({ error: "Too many attempts for this account" }, { status: 429, headers: { "Retry-After": String(acctLimit.retryAfter) } });
    }

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const tokenRow = await db
      .select()
      .from(verificationTokens)
      .where(eq(verificationTokens.userId, userId))
      .orderBy(desc(verificationTokens.createdAt))
      .limit(1)
      .then((r: typeof verificationTokens.$inferSelect[]) => r[0]);

    if (!tokenRow) {
      return NextResponse.json({ error: "No verification code found. Request a new one." }, { status: 400 });
    }

    if (new Date(tokenRow.expiresAt) < new Date()) {
      return NextResponse.json({ error: "Verification code has expired. Request a new one." }, { status: 400 });
    }

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

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db
      .update(nativeUsers)
      .set({ passwordHash: hashedPassword, sessionVersion: sql`${nativeUsers.sessionVersion} + 1` })
      .where(eq(nativeUsers.id, userId));

    await db.delete(verificationTokens).where(eq(verificationTokens.userId, userId));

    logger.info(`Password reset for user ${userId}`);

    // Invalidate current auth cookie (if present). User should re-login with new password.
    try {
      const session = await getValidatedSession();
      if (typeof session.destroy === "function") {
        await session.destroy();
      } else {
        session.user = undefined as any;
        session.isLoggedIn = false;
        await session.save();
      }
    } catch (e) {
      logger.warn("Failed to destroy session after password reset:", e);
    }

    return NextResponse.json({ message: "Password reset successfully" }, { status: 200 });
  } catch (error) {
    logger.error("Failed to reset password:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
