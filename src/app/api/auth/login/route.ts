import { NextRequest, NextResponse } from "next/server";
import { getValidatedSession } from "@/lib/server/validate-session";
import { SessionData } from "@/types";
import axios from "axios";
import bcrypt from "bcryptjs";
import { eq, or } from "drizzle-orm";
import { loginSchema } from "@/lib/validations";
import { getClientIp, isRateLimitedKey } from "@/lib/rate-limit";
import { getMediaProvider } from "@/lib/providers/factory";
import { ConfigService } from "@/lib/services/config-service";
import { AuthService } from "@/lib/services/auth-service";
import { logger } from "@/lib/logger";
import { handleApiError } from "@/lib/api-utils";
import { db, nativeUsers } from "@/db";
import { ProviderType } from "@/lib/providers/types";

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

        const provider = getMediaProvider(bodyProvider);
        const activeProviderName = bodyProvider || provider.name;

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

            const session = await getValidatedSession();

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

            logger.info(`[Auth] Native login success: ${user.username}`);
            return NextResponse.json({ success: true, user: session.user });
        }

        // ── Provider-based auth (Jellyfin / Emby / Plex / TMDB) ──────────
        const baseDeviceId = crypto.randomUUID();
        const deviceId = `${baseDeviceId}-${username}`;

        logger.info(`[Auth] Attempting login for user: ${username} with deviceId: ${deviceId}`);

        if (!provider.authenticate) {
            return NextResponse.json({ message: "Authentication not supported by this provider" }, { status: 400 });
        }

        const authResult = await provider.authenticate(username, password, deviceId, providerConfig?.serverUrl || providerConfig?.tmdbToken);

        const userId = authResult.User?.Id || authResult.id;
        const userName = authResult.User?.Name || authResult.name;
        const accessToken = authResult.AccessToken || authResult.accessToken;

        logger.info("[Auth] Provider accepted credentials. User ID:", userId);

        const existingAdmin = await ConfigService.getAdminUserId(activeProviderName);
        let wasMadeAdmin = false;
        if (!existingAdmin && provider.capabilities.hasAuth) {
            await ConfigService.setAdminUserId(userId, activeProviderName as any);
            wasMadeAdmin = true;
            logger.info(`[Auth] User ${userName} (${userId}) set as initial admin for ${activeProviderName}.`);
        }

        const session = await getValidatedSession();

        session.user = {
            Id: userId,
            Name: userName,
            AccessToken: accessToken,
            DeviceId: deviceId,
            isAdmin: await AuthService.isAdmin(userId, userName, activeProviderName),
            wasMadeAdmin: wasMadeAdmin,
            provider: activeProviderName,
            providerConfig: providerConfig,
        };
        session.isLoggedIn = true;

        if (profilePicture) {
            try {
                const { saveProfilePicture } = await import("@/lib/server/profile-picture");
                const base64Data = profilePicture.replace(/^data:image\/\w+;base64,/, "");
                const buffer = Buffer.from(base64Data, 'base64');
                await saveProfilePicture(userId, buffer, "image/webp");
            } catch (e) {
                logger.error("[Auth] Failed to save profile picture:", e);
            }
        }

        await session.save();
        logger.info("[Auth] Session cookie saved.");
        return NextResponse.json({ success: true, user: session.user, wasMadeAdmin });

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