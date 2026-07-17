import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, nativeUsers } from "@/db";
import { logger } from "@/lib/logger";
import { getErrorMessage } from "@/lib/utils";
import { z } from "zod";
import { getClientIp, isRateLimitedKey } from "@/lib/rate-limit";
import { getValidatedSession } from "@/lib/server/validate-session";
import { SessionData } from "@/types";

const changePasswordSchema = z.object({
  userId: z.string().min(1),
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = changePasswordSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid input" },
        { status: 400 }
      );
    }

    const { userId, currentPassword, newPassword } = validated.data;

    // Rate limiting: per-IP and per-account for password changes
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

    // Verify user exists
    const user = await db
      .select()
      .from(nativeUsers)
      .where(eq(nativeUsers.id, userId))
      .then((r: typeof nativeUsers.$inferSelect[]) => r[0]);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 401 }
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await db
      .update(nativeUsers)
      .set({ passwordHash: hashedPassword, sessionVersion: sql`${nativeUsers.sessionVersion} + 1` })
      .where(eq(nativeUsers.id, userId));

    logger.info(`Password changed for user ${userId}`);

    // Invalidate current auth cookie (if present)
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
      logger.warn("Failed to destroy session after password change:", e);
    }

    return NextResponse.json({ message: "Password changed successfully" }, { status: 200 });
  } catch (error) {
    logger.error("Failed to change password:", error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
