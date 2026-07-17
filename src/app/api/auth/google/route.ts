import { NextRequest, NextResponse } from "next/server";
import { config } from "@/lib/config";
import crypto from "crypto";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const DEFAULT_SCOPE = ["openid", "email", "profile"].join(" ");

export async function GET(request: NextRequest) {
  const clientId = config.auth.googleClientId;
  const basePath = config.app.basePath || "";

  if (!clientId) {
    return NextResponse.json({ error: "Google client ID is not configured." }, { status: 500 });
  }

  const callbackUrl = request.nextUrl.searchParams.get("callbackUrl") || `${request.nextUrl.origin}${basePath}/login`;

  // CSRF nonce: generate a random token, store it and the callbackUrl in short-lived httpOnly cookies,
  // and include only the nonce in the OAuth `state` parameter.
  const nonce = crypto.randomBytes(16).toString("hex");

  const redirectUrl = new URL(GOOGLE_AUTH_URL);
  redirectUrl.searchParams.set("client_id", clientId);
  redirectUrl.searchParams.set("redirect_uri", `${request.nextUrl.origin}${basePath}/api/auth/google/callback`);
  redirectUrl.searchParams.set("response_type", "code");
  redirectUrl.searchParams.set("scope", DEFAULT_SCOPE);
  redirectUrl.searchParams.set("access_type", "offline");
  redirectUrl.searchParams.set("prompt", "select_account");
  redirectUrl.searchParams.set("state", nonce);

  // Prepare response and set httpOnly cookies for nonce and callbackUrl
  const res = NextResponse.redirect(redirectUrl);
  const secure = !!config.auth.secureCookies || (config.app.appPublicUrl || "").startsWith("https://");
  const cookiePath = basePath || "/";
  // Short-lived (5 minutes)
  res.cookies.set("__fanbiq_google_nonce", nonce, { httpOnly: true, secure, sameSite: "lax", path: cookiePath, maxAge: 300 });
  res.cookies.set("__fanbiq_google_cb", callbackUrl, { httpOnly: true, secure, sameSite: "lax", path: cookiePath, maxAge: 300 });

  return res;
}
