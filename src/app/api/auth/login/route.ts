import { NextRequest, NextResponse } from "next/server";
import { getValidatedSession } from "@/lib/server/validate-session";
import { SessionData } from "@/types";
import axios from "axios";
import bcrypt from "bcryptjs";
import { eq, or } from "drizzle-orm";
import { loginSchema } from "@/lib/validations";
import { getClientIp, isRateLimitedKey } from "@/lib/rate-limit";
import { ConfigService } from "@/lib/services/config-service";
import { AuthService } from "@/lib/services/auth-service";
import { logger } from "@/lib/logger";
import { handleApiError } from "@/lib/api-utils";
import { db, nativeUsers } from "@/db";
import { ProviderType } from "@/lib/providers/types";
import { getIronSession } from "iron-session";
import { getSessionOptions } from "@/lib/session";

export async function POST(request: NextRequest) {
    let usernameForLog = "unknown";
    
    try {
        const body = await request.json();
        const validated = loginSchema.safeParse(body);

        if (!validated.success) {
            return NextResponse.json({ message: "Invalid input" }, { status: 400 });
        }

        const { username, password, provider: bodyProvider, config: providerConfig, profilePicture } = validated.data;
        usernameForLog = username;

        // Rate limiting: per-IP and per-account
        const ip = getClientIp(request);
        const ipLimit = isRateLimitedKey(`ip:${ip}`, 30, 60_000);
        if (ipLimit.limited) {
            return NextResponse.json({ message: "Too many requests" }, { status: 429, headers: { "Retry-After": String(ipLimit.retryAfter) } });
        }

        const activeProviderName = bodyProvider || ProviderType.NATIVE;

        // ── Native (email + password) auth ────────────────────────────────
        if (activeProviderName === ProviderType.NATIVE) {
            if (!password) {
                return NextResponse.json({ message: "Password is required" }, { status: 400 });
            }

            // Allow login with email OR username
            const user = await db
                .select()
                .from(nativeUsers)
                .where(
                    or(
                        eq(nativeUsers.email, username.toLowerCase().trim()),
                        eq(nativeUsers.username, username)
                    )
                )
                .then((r: typeof nativeUsers.$inferSelect[]) => r[0]);

            // Per-account throttling (prevent credential stuffing)
            const acctKey = `acct:${username.toLowerCase().trim()}`;
            const acctLimit = isRateLimitedKey(acctKey, 5, 60_000);
            if (acctLimit.limited) {
                return NextResponse.json({ message: "Too many attempts for this account" }, { status: 429, headers: { "Retry-After": String(acctLimit.retryAfter) } });
            }

            if (!user) {
                return NextResponse.json({ message: "Invalid email or password" }, { status: 401 });
            }

            if (!user.isVerified) {
                return NextResponse.json(
                    { message: "Email not verified. Check your inbox.", userId: user.id, needsVerification: true },
                    { status: 403 }
                );
            }

            const passwordMatch = await bcrypt.compare(password, user.passwordHash);
            if (!passwordMatch) {
                return NextResponse.json({ message: "Invalid email or password" }, { status: 401 });
            }

            // Create a response object that iron-session can modify with Set-Cookie
            const responseToModify = new NextResponse();
            
            // Use request/response pattern for session to match proxy middleware
            const session = await getIronSession<SessionData>(request, responseToModify, await getSessionOptions());

            session.user = {
                Id: user.id,
                Name: user.username,
                DeviceId: `native-${user.id}`,
                isAdmin: false,
                provider: ProviderType.NATIVE,
                sessionVersion: user.sessionVersion ?? 1,
            };
            session.isLoggedIn = true;
            await session.save();

            logger.info(`[Auth] Native login success: ${user.username}`, {
              userId: session.user.Id,
              isLoggedIn: session.isLoggedIn,
              sessionVersion: session.user.sessionVersion
            });
            
            // Create JSON response with the Set-Cookie header from iron-session
            const jsonResponse = NextResponse.json({ success: true, user: session.user });
            
            // Copy Set-Cookie headers from responseToModify to jsonResponse
            const cookies = responseToModify.headers.getSetCookie();
            cookies.forEach(cookie => {
              jsonResponse.headers.append('Set-Cookie', cookie);
            });
            
            return jsonResponse;
        }

        // Only native provider supported for /auth/login
        if (activeProviderName !== ProviderType.NATIVE) {
            return NextResponse.json({ message: "Only native login is supported" }, { status: 400 });
        }

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        logger.warn(`[Auth] Login Failed for user ${usernameForLog}:`, errorMessage);

        if (axios.isAxiosError(error)) {
            if (error.response) {
                if (error.response.status === 401) {
                    return NextResponse.json({ message: "Invalid username or password" }, { status: 401 });
                }
            }
        }

        return handleApiError(error, "Server connection failed or invalid credentials. Check fanbiQ logs for details.");
    }
}