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

  const defaultSession: IronSession<SessionData> = Object.assign(
    {
      user: { Id: "", Name: "", DeviceId: "" },
      isLoggedIn: false,
      save: async () => {},
      destroy: async () => {},
    } as Partial<IronSession<SessionData>>,
    {}
  ) as IronSession<SessionData>;

  if (!session || !session.isLoggedIn || !session.user?.Id) {
    return defaultSession;
  }

  if (session.user.provider !== "native") {
    return session;
  }

  if (session.user.sessionVersion === undefined) {
    logger.info(`[ValidateSession] Missing sessionVersion for native user ${session.user.Id}`);
    await session.destroy();
    return defaultSession;
  }

  const user = await db
    .select()
    .from(nativeUsers)
    .where(eq(nativeUsers.id, session.user.Id))
    .then((rows: typeof nativeUsers.$inferSelect[]) => rows[0]);

  if (!user) {
    logger.warn(`[ValidateSession] No native user found for session user ${session.user.Id}`);
    await session.destroy();
    return defaultSession;
  }

  if (user.sessionVersion !== session.user.sessionVersion) {
    logger.info(
      `[ValidateSession] Session version mismatch for ${session.user.Id}: cookie=${session.user.sessionVersion} db=${user.sessionVersion}`
    );
    await session.destroy();
    return defaultSession;
  }

  return session as IronSession<SessionData>;
}
