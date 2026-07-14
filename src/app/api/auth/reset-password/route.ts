import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, nativeUsers, verificationTokens } from "@/db";
import { logger } from "@/lib/logger";
import { getErrorMessage } from "@/lib/utils";
import { z } from "zod";

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

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const tokenRow = await db
      .select()
      .from(verificationTokens)
      .where(eq(verificationTokens.userId, userId))
      .then((r: typeof verificationTokens.$inferSelect[]) => r[r.length - 1]);

    if (!tokenRow) {
      return NextResponse.json({ error: "No verification code found. Request a new one." }, { status: 400 });
    }

    if (new Date(tokenRow.expiresAt) < new Date()) {
      return NextResponse.json({ error: "Verification code has expired. Request a new one." }, { status: 400 });
    }

    if (tokenRow.token !== otp) {
      return NextResponse.json({ error: "Invalid verification code" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db
      .update(nativeUsers)
      .set({ passwordHash: hashedPassword })
      .where(eq(nativeUsers.id, userId));

    await db.delete(verificationTokens).where(eq(verificationTokens.userId, userId));

    logger.info(`Password reset for user ${userId}`);

    return NextResponse.json({ message: "Password reset successfully" }, { status: 200 });
  } catch (error) {
    logger.error("Failed to reset password:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
