import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { eq, desc } from "drizzle-orm";
import { db, nativeUsers, verificationTokens } from "@/db";
import { sendVerificationEmail } from "@/lib/email";
import { logger } from "@/lib/logger";
import { handleApiError } from "@/lib/api-utils";

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function otpExpiresAt(): Date {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 15);
  return d;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ message: "userId is required" }, { status: 400 });
    }

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

    // Rate limit: check if last token was created less than 60s ago
    const lastToken = await db
      .select()
      .from(verificationTokens)
      .where(eq(verificationTokens.userId, userId))
      .orderBy(desc(verificationTokens.createdAt))
      .limit(1)
      .then((r: typeof verificationTokens.$inferSelect[]) => r[0]);

    if (lastToken) {
      const lastCreated = new Date(lastToken.createdAt);
      const secondsAgo = (Date.now() - lastCreated.getTime()) / 1000;
      if (secondsAgo < 60) {
        return NextResponse.json(
          { message: `Please wait ${Math.ceil(60 - secondsAgo)} seconds before requesting a new code` },
          { status: 429 }
        );
      }
    }

    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);

    await db.delete(verificationTokens).where(eq(verificationTokens.userId, userId));
    await db.insert(verificationTokens).values({
      userId,
      token: otpHash,
      expiresAt: otpExpiresAt(),
    });

    await sendVerificationEmail(user.email, user.username, otp);

    logger.info(`[ResendVerification] OTP resent for user ${user.username}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, "Failed to resend verification code");
  }
}