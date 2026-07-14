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

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP token
    await db.insert(verificationTokens).values({
      userId: user.id,
      token: otp,
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
