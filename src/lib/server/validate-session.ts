import { getIronSession, IronSession } from "iron-session";
import { getSessionOptions } from "@/lib/session";
import { SessionData } from "@/types";
import { db, nativeUsers } from "@/db";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { cookies } from "next/headers";

export async function getValidatedSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, await getSessionOptions());

  if (!session) {
    throw new Error("Unable to initialize session");
  }

  if (!session.isLoggedIn || !session.user?.Id) {
    session.user = { Id: "", Name: "", DeviceId: "" } as any;
    session.isLoggedIn = false;
    return session;
  }

  if (session.user.sessionVersion === undefined) {
    logger.info(`[ValidateSession] Missing sessionVersion for user ${session.user.Id}`);
    await session.destroy();
    session.user = { Id: "", Name: "", DeviceId: "" } as any;
    session.isLoggedIn = false;
    return session;
  }

  const user = await db
    .select()
    .from(nativeUsers)
    .where(eq(nativeUsers.id, session.user.Id))
    .then((rows: typeof nativeUsers.$inferSelect[]) => rows[0]);

  if (!user) {
    logger.warn(`[ValidateSession] No native user found for session user ${session.user.Id}`);
    await session.destroy();
    session.user = { Id: "", Name: "", DeviceId: "" } as any;
    session.isLoggedIn = false;
    return session;
  }

  if (user.sessionVersion !== session.user.sessionVersion) {
    logger.info(
      `[ValidateSession] Session version mismatch for ${session.user.Id}: cookie=${session.user.sessionVersion} db=${user.sessionVersion}`
    );
    await session.destroy();
    session.user = { Id: "", Name: "", DeviceId: "" } as any;
    session.isLoggedIn = false;
    return session;
  }

  return session as IronSession<SessionData>;
}
