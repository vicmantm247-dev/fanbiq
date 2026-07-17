import { NextRequest, NextResponse } from "next/server";
import { getValidatedSession } from "@/lib/server/validate-session";
import { SessionData } from "@/types";
import { swipeSchema, deleteSwipeSchema } from "@/lib/validations";
import { SessionService } from "@/lib/services/session-service";

export async function POST(request: NextRequest) {
  const session = await getValidatedSession();
  if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const bodyRaw = await request.json();
  const validated = swipeSchema.safeParse(bodyRaw);
  if (!validated.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  
  const body = validated.data;

  try {
    const sessionCode = body.sessionCode !== undefined ? body.sessionCode : session.sessionCode;
    const result = await SessionService.addSwipe(session.user, sessionCode, body.itemId, body.direction, body.item);
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    if (error.message.includes("limit reached")) {
        return NextResponse.json({ error: error.message }, { status: 403 });
    }
    // Duplicate swipes or other errors might just return success: true to avoid breaking the UI flow
    return NextResponse.json({ success: true, isMatch: false });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getValidatedSession();
  if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const bodyRaw = await request.json();
  const validated = deleteSwipeSchema.safeParse(bodyRaw);
  if (!validated.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const { itemId } = validated.data;

  try {
    await SessionService.deleteSwipe(session.user, itemId, session.sessionCode);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete swipe" }, { status: 500 });
  }
}

