import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
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

    // Get the latest verification token
    const tokenRow = await db
      .select()
      .from(verificationTokens)
      .where(eq(verificationTokens.userId, userId))
      .then((r: typeof verificationTokens.$inferSelect[]) => r[r.length - 1]); // latest token

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

    // Verify OTP
    if (tokenRow.token !== otp) {
      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 400 }
      );
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
