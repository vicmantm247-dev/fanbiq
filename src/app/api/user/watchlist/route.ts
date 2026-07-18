import { NextRequest, NextResponse } from "next/server";
import { getValidatedSession } from "@/lib/server/validate-session";
import { SessionData } from "@/types";
import { AuthService } from "@/lib/services/auth-service";
import { getMediaProvider } from "@/lib/providers/factory";
import { handleApiError } from "@/lib/api-utils";
import { ProviderType } from "@/lib/providers/types";
import { watchlistSchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
  const session = await getValidatedSession();
  if (!session.isLoggedIn) return new NextResponse("Unauthorized", { status: 401 });

  if (session.user.isGuest) {
    return NextResponse.json({ error: "Guests cannot modify watchlist/favorites" }, { status: 403 });
  }

    const bodyRaw = await request.json();
  const validated = watchlistSchema.safeParse(bodyRaw);
  if (!validated.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const { itemId, action, useWatchlist } = validated.data;

  if (!itemId) return new NextResponse("Missing itemId", { status: 400 });

  try {
    const auth = await AuthService.getEffectiveCredentials(session);
    const provider = getMediaProvider(auth.provider);

    if (provider.toggleFavorite) {
      await provider.toggleFavorite(itemId, action, auth);
    } else {
      return NextResponse.json({ error: "Operation not supported by this provider" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, "Failed to update watchlist/favorites");
  }
}

