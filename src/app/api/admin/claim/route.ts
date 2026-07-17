import { NextResponse } from "next/server";
import { getValidatedSession } from "@/lib/server/validate-session";
import { SessionData } from "@/types";
import { getMediaProvider } from "@/lib/providers/factory";
import { db, config as configTable } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function POST() {
    const session = await getValidatedSession();

    if (!session.isLoggedIn) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    if (session.user.isGuest) {
        return NextResponse.json({ error: "Guests cannot claim admin role" }, { status: 403 });
    }

    const provider = getMediaProvider(session.user.provider);
    if (!provider.capabilities.hasAuth) {
        return NextResponse.json({ error: "This provider does not support admin capabilities" }, { status: 403 });
    }

    try {
        // Wrap check+set in a transaction to prevent TOCTOU races (M1).
        let claimed = false;
        await db.transaction(async (tx: any) => {
            const key = `admin_user_id:${(session.user.provider as string).toLowerCase()}`;
            const existing = await tx
                .select()
                .from(configTable)
                .where(eq(configTable.key, key))
                .then((rows: any[]) => rows[0]);

            if (existing) {
                // Another request already set admin — abort the transaction.
                return;
            }

            await tx.insert(configTable).values({ key, value: session.user.Id });
            claimed = true;
        });

        if (!claimed) {
            return NextResponse.json({ error: "Admin already exists" }, { status: 400 });
        }

        session.user.isAdmin = true;
        await session.save();
        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json({ error: "Failed to claim admin role" }, { status: 500 });
    }
}

