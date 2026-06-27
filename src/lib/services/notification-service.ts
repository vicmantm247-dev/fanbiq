import { db, notifications, nativeUsers } from '@/lib/db';
import { eq, and, sql } from 'drizzle-orm';
import { logger } from '@/lib/logger';

export type NotificationType = 'follow' | 'session_join' | 'session_match';

export interface NotificationPayload {
  recipientId: string;
  actorId?: string | null;
  actorName?: string | null;
  type: NotificationType;
  message: string;
  sessionCode?: string | null;
  relatedId?: string | null;
}

export class NotificationService {
  private static ensureTablePromise: Promise<void> | null = null;

  private static async ensureTable() {
    if (this.ensureTablePromise) {
      return this.ensureTablePromise;
    }

    this.ensureTablePromise = (async () => {
      try {
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS "Notification" (
            id SERIAL PRIMARY KEY,
            "recipientId" TEXT NOT NULL,
            "actorId" TEXT,
            "actorName" TEXT,
            "type" TEXT NOT NULL,
            "message" TEXT NOT NULL,
            "sessionCode" TEXT,
            "relatedId" TEXT,
            "read" BOOLEAN NOT NULL DEFAULT FALSE,
            "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "readAt" TIMESTAMP
          )
        `);
      } catch (error) {
        logger.error('[NotificationService] failed to ensure notifications table exists', error);
      }
    })();

    return this.ensureTablePromise;
  }

  static async create(payload: NotificationPayload) {
    if (!payload.recipientId) return;

    await this.ensureTable();

    try {
      await db.insert(notifications).values({
        recipientId: payload.recipientId,
        actorId: payload.actorId ?? null,
        actorName: payload.actorName ?? null,
        type: payload.type,
        message: payload.message,
        sessionCode: payload.sessionCode ?? null,
        relatedId: payload.relatedId ?? null,
      });
    } catch (error) {
      logger.error('[NotificationService] failed to create notification', { error, payload });
    }
  }

  static async listForUser(recipientId: string) {
    await this.ensureTable();
    return db.select().from(notifications).where(eq(notifications.recipientId, recipientId));
  }

  static async markAsRead(notificationId: number, recipientId: string) {
    await this.ensureTable();
    await db.update(notifications)
      .set({ read: true, readAt: new Date() })
      .where(and(eq(notifications.id, notificationId), eq(notifications.recipientId, recipientId)));
  }

  static async markAllAsRead(recipientId: string) {
    await this.ensureTable();
    await db.update(notifications)
      .set({ read: true, readAt: new Date() })
      .where(eq(notifications.recipientId, recipientId));
  }

  static async getRecipientUserName(userId: string) {
    await this.ensureTable();
    const user = await db.select({ username: nativeUsers.username, displayName: nativeUsers.displayName }).from(nativeUsers).where(eq(nativeUsers.id, userId)).then((rows: Array<{ username: string; displayName: string | null }>) => rows[0]);
    return user?.displayName || user?.username || 'Someone';
  }
}
