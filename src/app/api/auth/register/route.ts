import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, nativeUsers, verificationTokens } from "@/db";
import { registerSchema } from "@/lib/validations";
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
    const validated = registerSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { message: "Invalid input", errors: validated.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, username, password } = validated.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Check existing email
    const existingByEmail = await db
      .select()
      .from(nativeUsers)
      .where(eq(nativeUsers.email, normalizedEmail))
      .then((r: typeof nativeUsers.$inferSelect[]) => r[0]);

    if (existingByEmail) {
      return NextResponse.json(
        { message: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // Check existing username
    const existingByUsername = await db
      .select()
      .from(nativeUsers)
      .where(eq(nativeUsers.username, username))
      .then((r: typeof nativeUsers.$inferSelect[]) => r[0]);

    if (existingByUsername) {
      return NextResponse.json(
        { message: "This username is already taken" },
        { status: 409 }
      );
    }

    // Hash password and create user
    const passwordHash = await bcrypt.hash(password, 12);
    const userId = crypto.randomUUID();

    await db.insert(nativeUsers).values({
      id: userId,
      email: normalizedEmail,
      username,
      passwordHash,
      isVerified: false,
    });

    // Generate OTP
    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);

    // Delete any previous tokens for this user
    await db.delete(verificationTokens).where(eq(verificationTokens.userId, userId));

    await db.insert(verificationTokens).values({
      userId,
      token: otpHash,
      expiresAt: otpExpiresAt(),
    });

    // Send email (don't block response on failure — log it)
    try {
      await sendVerificationEmail(normalizedEmail, username, otp);
    } catch (emailErr) {
      logger.error("[Register] Failed to send verification email:", emailErr);
      // Still return success — user can use resend
    }

    logger.info(`[Register] New user created: ${username} (${normalizedEmail})`);

    return NextResponse.json({ success: true, userId, email: normalizedEmail });
  } catch (error) {
    return handleApiError(error, "Registration failed");
  }
}