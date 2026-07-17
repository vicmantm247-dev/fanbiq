import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import axios from "axios";
import { getValidatedSession } from "@/lib/server/validate-session";
import { SessionData } from "@/types";
import { config } from "@/lib/config";
import { db, nativeUsers, verificationTokens } from "@/db";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { logger } from "@/lib/logger";
import bcrypt from "bcryptjs";
import { generateOTP } from "@/lib/utils";
import { sendVerificationEmail } from "@/lib/email";
import { usernameSchema } from "@/lib/validations";

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

async function deriveValidUsername(email: string) {
  const base = email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "").slice(0, 30) || "google";
  let candidate = base;
  let attempt = 0;
  while (attempt < 10) {
    const validated = usernameSchema.safeParse(candidate);
    if (validated.success) return candidate;
    // pad with a random digit suffix to reach min length or valid pattern
    const suffix = Math.floor(100 + Math.random() * 9000).toString();
    candidate = (base + "_" + suffix).slice(0, 30);
    attempt++;
  }
  // As a last resort, return a deterministic fallback that's valid
  const fallback = (base + "_user").slice(0, 30);
  const final = usernameSchema.safeParse(fallback).success ? fallback : `user${Date.now() % 10000}`;
  return final;
}

async function insertUserWithRetry(user: {
  id: string;
  email: string;
  username: string;
  displayName: string;
  isVerified?: boolean;
}) {
  const baseUsername = user.username;

  for (let attempt = 0; attempt < 3; attempt++) {
    const username = attempt === 0 ? baseUsername : `${baseUsername}_${Math.floor(1000 + Math.random() * 9000)}`;
    try {
      await db.insert(nativeUsers).values({
        id: user.id,
        email: user.email,
        username,
        passwordHash: "",
        displayName: user.displayName,
        isVerified: !!user.isVerified,
        sessionVersion: 1,
      } as any);
      return username;
    } catch (error: any) {
      const isUniqueViolation = error?.code === "23505" || error?.message?.includes("duplicate key value");
      if (!isUniqueViolation || attempt === 2) {
        throw error;
      }
    }
  }
  throw new Error("Unable to create unique username for Google sign-in.");
}

export async function GET(request: NextRequest) {
  let redirectUri: string | undefined;
  try {
    redirectUri = `${request.nextUrl.origin}${config.app.basePath || ""}/api/auth/google/callback`;
    // log the incoming request for debugging
    logger.info(`[Auth] Google callback invoked: ${request.nextUrl.href}`);
    logger.info(`[Auth] Using redirectUri: ${redirectUri}`);
    
    const code = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state");

    if (!code) {
      return NextResponse.json({ error: "Missing Google authorization code." }, { status: 400 });
    }

    // Validate CSRF nonce stored in httpOnly cookie
    const cookieStore = await cookies();
    const nonceCookie = cookieStore.get("__fanbiq_google_nonce")?.value;
    const cbCookie = cookieStore.get("__fanbiq_google_cb")?.value;
    if (!state || !nonceCookie || state !== nonceCookie) {
      logger.warn("[Auth] Google state nonce mismatch or missing");
      // Clear cookies and fall back to login
      const loginUrl = new URL(`${config.app.basePath || ""}/login`, request.url);
      const resp = NextResponse.redirect(loginUrl);
      resp.cookies.delete("__fanbiq_google_nonce");
      resp.cookies.delete("__fanbiq_google_cb");
      return resp;
    }

    // Resolve and validate callbackUrl from cookie
    let callbackUrl = `${request.nextUrl.origin}${config.app.basePath || ""}/login`;
    if (cbCookie) {
      try {
        const resolved = new URL(cbCookie, request.nextUrl.origin);
        if (resolved.origin === request.nextUrl.origin) {
          callbackUrl = resolved.toString();
        } else {
          logger.warn("[Auth] callbackUrl origin mismatch; using default", resolved.origin);
        }
      } catch (e) {
        logger.warn("[Auth] Invalid callbackUrl in cookie; using default", cbCookie, e);
      }
    }

    redirectUri = `${request.nextUrl.origin}${config.app.basePath || ""}/api/auth/google/callback`;
    const tokens = await getGoogleTokens(code, redirectUri);
    const userInfo = await fetchGoogleUser(tokens.id_token, tokens.access_token);

    if (!userInfo.email) {
      return NextResponse.json({ error: "Google did not return an email address." }, { status: 400 });
    }

    const email = userInfo.email.toLowerCase();
    const displayName = userInfo.name || userInfo.email.split("@")[0];

    const normalizedUsername = await deriveValidUsername(email);
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
      // Respect Google's email_verified flag: only mark verified if Google says so
      const isVerified = !!userInfo.email_verified;

      username = await insertUserWithRetry({
        id: userId,
        email,
        username: normalizedUsername,
        displayName,
        isVerified,
      });

      logger.info(`[Auth] Created native user for Google login: ${email} as ${username} (verified: ${isVerified})`);

      if (!isVerified) {
        // Create verification OTP and send email, do NOT log the user in
        const otp = generateOTP();
        const otpHash = await bcrypt.hash(otp, 10);
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
        await db.delete(verificationTokens).where(eq(verificationTokens.userId, userId));
        await db.insert(verificationTokens).values({
          userId,
          token: otpHash,
          expiresAt,
        });
        try {
          await sendVerificationEmail(email, username, otp);
        } catch (e) {
          logger.warn("Failed to send verification email for Google user:", e);
        }

        const redirectTo = new URL(callbackUrl);
        redirectTo.searchParams.set("needsVerification", "1");
        redirectTo.searchParams.set("userId", userId);
        const resp = NextResponse.redirect(redirectTo.toString());
        resp.cookies.delete("__fanbiq_google_nonce");
        resp.cookies.delete("__fanbiq_google_cb");
        return resp;
      }
    }

    const session = await getValidatedSession();

    session.user = {
      Id: userId,
      Name: username,
      DisplayName: displayName,
      DeviceId: `google-${userId}`,
      provider: config.app.provider || "google",
      isAdmin: false,
      sessionVersion: (existingUser?.sessionVersion ?? 1),
    };
    session.isLoggedIn = true;
    await session.save();

    logger.info(`[Auth] Google login success for ${email}`);
    logger.info(`[Auth] Redirecting user to callbackUrl: ${callbackUrl}`);

    return NextResponse.redirect(callbackUrl);
  } catch (error) {
    logger.error("Google callback failed", error);
    const errMessage = error instanceof Error ? error.message : String(error);
    const body: any = { error: "Google login failed." };
    if (config.ENABLE_DEBUG) {
      body.details = errMessage;
      body.redirectUri = typeof redirectUri === "string" ? redirectUri : undefined;
      body.requestUrl = request.nextUrl.href;
    }
    return NextResponse.json(body, { status: 500 });
  }
}
