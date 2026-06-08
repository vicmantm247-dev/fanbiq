import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, nativeUsers } from "@/db";
import { logger } from "@/lib/logger";
import { getErrorMessage } from "@/lib/utils";
import { z } from "zod";

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
      .set({ passwordHash: hashedPassword })
      .where(eq(nativeUsers.id, userId));

    logger.info(`Password changed for user ${userId}`);

    return NextResponse.json(
      { message: "Password changed successfully" },
      { status: 200 }
    );
  } catch (error) {
    logger.error("Failed to change password:", error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
