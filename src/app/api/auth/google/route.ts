import { NextRequest, NextResponse } from "next/server";
import { config } from "@/lib/config";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const DEFAULT_SCOPE = ["openid", "email", "profile"].join(" ");

export async function GET(request: NextRequest) {
  const clientId = config.auth.googleClientId;
  const basePath = config.app.basePath || "";

  if (!clientId) {
    return NextResponse.json({ error: "Google client ID is not configured." }, { status: 500 });
  }

  const callbackUrl = request.nextUrl.searchParams.get("callbackUrl") || `${request.nextUrl.origin}${basePath}/login`;
  const state = encodeURIComponent(JSON.stringify({ callbackUrl }));

  const redirectUrl = new URL(GOOGLE_AUTH_URL);
  redirectUrl.searchParams.set("client_id", clientId);
  redirectUrl.searchParams.set("redirect_uri", `${request.nextUrl.origin}${basePath}/api/auth/google/callback`);
  redirectUrl.searchParams.set("response_type", "code");
  redirectUrl.searchParams.set("scope", DEFAULT_SCOPE);
  redirectUrl.searchParams.set("access_type", "offline");
  redirectUrl.searchParams.set("prompt", "select_account");
  redirectUrl.searchParams.set("state", state);

  return NextResponse.redirect(redirectUrl);
}
