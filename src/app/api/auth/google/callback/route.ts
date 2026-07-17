import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import axios from "axios";
import { getIronSession } from "iron-session";
import { getSessionOptions } from "@/lib/session";
import { SessionData } from "@/types";
import { config } from "@/lib/config";
import { db, nativeUsers } from "@/db";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { logger } from "@/lib/logger";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

async function getGoogleTokens(code: string, redirectUri: string) {
  const clientId = config.auth.googleClientId;
  const clientSecret = config.auth.googleClientSecret;

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth is not configured.");
  }

  const response = await axios.post(
    GOOGLE_TOKEN_URL,
    new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }).toString(),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  return response.data;
}

async function fetchGoogleUser(idToken: string, accessToken: string) {
  const response = await axios.get(GOOGLE_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return response.data;
}

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state");

    if (!code) {
      return NextResponse.json({ error: "Missing Google authorization code." }, { status: 400 });
    }

    let callbackUrl = `${request.nextUrl.origin}${config.app.basePath || ""}/login`;
    if (state) {
      try {
        const parsed = JSON.parse(decodeURIComponent(state));
        callbackUrl = parsed.callbackUrl || callbackUrl;
      } catch {
        // ignore invalid state parsing
      }
    }

    const redirectUri = `${request.nextUrl.origin}${config.app.basePath || ""}/api/auth/google/callback`;
    const tokens = await getGoogleTokens(code, redirectUri);
    const userInfo = await fetchGoogleUser(tokens.id_token, tokens.access_token);

    if (!userInfo.email) {
      return NextResponse.json({ error: "Google did not return an email address." }, { status: 400 });
    }

    const email = userInfo.email.toLowerCase();
    const displayName = userInfo.name || userInfo.email.split("@")[0];

    const normalizedUsername = email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "").slice(0, 30);
    const existingUser = await db
      .select()
      .from(nativeUsers)
      .where(eq(nativeUsers.email, email))
      .then((rows: typeof nativeUsers.$inferSelect[]) => rows[0]);

    let userId: string;
    let username: string;

    if (existingUser) {
      userId = existingUser.id;
      username = existingUser.username;
    } else {
      userId = uuidv4();
      username = normalizedUsername || `google_${userId.slice(0, 8)}`;

      const insertUser = { id: userId, email, username, displayName, isVerified: true } as any;
      await db.insert(nativeUsers).values(insertUser);
      logger.info(`[Auth] Created native user for Google login: ${email}`);
    }

    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, await getSessionOptions());

    session.user = {
      Id: userId,
      Name: displayName,
      DeviceId: `google-${userId}`,
      provider: "google",
      isAdmin: false,
    };
    session.isLoggedIn = true;
    await session.save();

    logger.info(`[Auth] Google login success for ${email}`);

    return NextResponse.redirect(callbackUrl);
  } catch (error) {
    logger.error("Google callback failed", error);
    // In development return the underlying error message to aid debugging.
    const isDev = (config.NODE_ENV || 'development') === 'development';
    const errMessage = error instanceof Error ? error.message : String(error);
    const body: any = { error: "Google login failed." };
    if (isDev) body.details = errMessage;
    return NextResponse.json(body, { status: 500 });
  }
}
