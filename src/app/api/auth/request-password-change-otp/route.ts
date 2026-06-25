import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, nativeUsers, verificationTokens } from "@/db";
import { logger } from "@/lib/logger";
import { getErrorMessage } from "@/lib/utils";
import { sendVerificationEmail } from "@/lib/email";
import { generateOTP } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, email } = body;

    if (!userId || !email) {
      return NextResponse.json(
        { error: "User ID and email are required" },
        { status: 400 }
      );
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

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP token
    await db.insert(verificationTokens).values({
      userId,
      token: otp,
      expiresAt,
    });

    // Send email
    await sendVerificationEmail(email, user.username || email, otp);

    logger.info(`Password change OTP sent to ${email}`);

    return NextResponse.json(
      { message: "OTP sent to your email", userId },
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
