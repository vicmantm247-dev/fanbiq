import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { getClientIp, isRateLimitedKey } from "@/lib/rate-limit";
import { db, nativeUsers, verificationTokens } from "@/db";
import { logger } from "@/lib/logger";
import { getErrorMessage } from "@/lib/utils";
import { sendVerificationEmail } from "@/lib/email";
import { generateOTP } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, email } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    let user = null;
    if (userId) {
      user = await db
        .select()
        .from(nativeUsers)
        .where(eq(nativeUsers.id, userId))
        .then((r: typeof nativeUsers.$inferSelect[]) => r[0]);

      if (user && user.email.toLowerCase().trim() !== normalizedEmail) {
        return NextResponse.json(
          { error: "Email does not match user" },
          { status: 400 }
        );
      }
    }

    if (!user) {
      user = await db
        .select()
        .from(nativeUsers)
        .where(eq(nativeUsers.email, normalizedEmail))
        .then((r: typeof nativeUsers.$inferSelect[]) => r[0]);
    }

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Rate limiting: per-IP and per-email/account
    const ip = getClientIp(request);
    const ipLimit = isRateLimitedKey(`ip:${ip}`, 20, 60_000);
    if (ipLimit.limited) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": String(ipLimit.retryAfter) } });
    }

    // Rate limit: check if last token was created less than 60s ago
    const lastToken = await db
      .select()
      .from(verificationTokens)
      .where(eq(verificationTokens.userId, user.id))
      .orderBy(desc(verificationTokens.createdAt))
      .limit(1)
      .then((r: typeof verificationTokens.$inferSelect[]) => r[0]);

    if (lastToken) {
      const lastCreated = new Date(lastToken.createdAt);
      const secondsAgo = (Date.now() - lastCreated.getTime()) / 1000;
      if (secondsAgo < 60) {
        return NextResponse.json(
          { error: `Please wait ${Math.ceil(60 - secondsAgo)} seconds before requesting a new code` },
          { status: 429 }
        );
      }
    }

    // Per-account rate limiting
    const acctKey = `acct:${user.email.toLowerCase().trim()}`;
    const acctLimit = isRateLimitedKey(acctKey, 3, 60_000);
    if (acctLimit.limited) {
      return NextResponse.json({ error: "Too many OTP requests for this account" }, { status: 429, headers: { "Retry-After": String(acctLimit.retryAfter) } });
    }

    // Generate OTP and hash it before storing
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    const otpHash = await bcrypt.hash(otp, 10);

    // Ensure only one live token per user
    await db.delete(verificationTokens).where(eq(verificationTokens.userId, user.id));

    // Store hashed OTP token
    await db.insert(verificationTokens).values({
      userId: user.id,
      token: otpHash,
      expiresAt,
    });

    // Send email
    await sendVerificationEmail(normalizedEmail, user.username || normalizedEmail, otp);

    logger.info(`Password change OTP sent to ${normalizedEmail}`);

    return NextResponse.json(
      { message: "OTP sent to your email", userId: user.id },
      { status: 200 }
    );
  } catch (error) {
    logger.error("Failed to request password change OTP:", error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
