import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db, flickInteractions, flickPersonalizationProfiles, flicks } from "@/lib/db";
import { logger } from "@/lib/logger";

export type FlickInteractionEvent =
  | "flick_viewed"
  | "flick_watch_completed"
  | "flick_skipped"
  | "flick_liked"
  | "flick_added_to_likes_list"
  | "uploader_followed"
  | "flick_comment_added";

interface InteractionRecord {
  flickId: string;
  eventType: FlickInteractionEvent;
  movieId?: string | null;
  movieTitle?: string | null;
  uploader?: string | null;
  metadata?: string | null;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function parsePreferences(raw: string | null | undefined) {
  if (!raw) return {} as Record<string, number>;
  try {
    return JSON.parse(raw) as Record<string, number>;
  } catch {
    return {} as Record<string, number>;
  }
}

function scoreEvent(eventType: FlickInteractionEvent) {
  switch (eventType) {
    case "flick_watch_completed":
      return 3.5;
    case "flick_liked":
      return 2.8;
    case "flick_added_to_likes_list":
      return 3.2;
    case "uploader_followed":
      return 2.2;
    case "flick_comment_added":
      return 1.8;
    case "flick_viewed":
      return 1.1;
    case "flick_skipped":
      return -1.4;
    default:
      return 0;
  }
}

export class FlickPersonalizationService {
  static async logInteraction(userId: string, payload: InteractionRecord) {
    if (!userId || !payload.flickId) return null;

    const [saved] = await db.insert(flickInteractions).values({
      userId,
      flickId: payload.flickId,
      eventType: payload.eventType,
      movieId: payload.movieId ?? null,
      movieTitle: payload.movieTitle ?? null,
      uploader: payload.uploader ?? null,
      metadata: payload.metadata ?? null,
    }).returning();

    try {
      await this.refreshProfile(userId);
    } catch (error) {
      logger.error('[FlickPersonalization] refreshProfile failed', error);
    }

    return saved;
  }

  static async refreshProfile(userId: string) {
    const interactions = await db
      .select({
        interaction: flickInteractions,
        flick: flicks,
      })
      .from(flickInteractions)
      .leftJoin(flicks, eq(sql`${flicks.id}::text`, flickInteractions.flickId))
      .where(eq(flickInteractions.userId, userId))
      .orderBy(desc(flickInteractions.createdAt))
      .limit(500);

    const preferences: Record<string, number> = {};

    for (const interactionRecord of interactions) {
      const interaction = interactionRecord.interaction;
      const flick = interactionRecord.flick;
      const weight = scoreEvent(interaction.eventType as FlickInteractionEvent);
      if (weight === 0) continue;

      const key = interaction.movieTitle || interaction.uploader || interaction.flickId;
      if (!key) continue;

      const bucket = interaction.movieTitle
        ? `movie:${interaction.movieTitle}`
        : interaction.uploader
          ? `uploader:${interaction.uploader}`
          : `flick:${interaction.flickId}`;

      preferences[bucket] = (preferences[bucket] || 0) + weight;

      if (flick?.tags?.length) {
        for (const tag of flick.tags) {
          const tagKey = `tag:${tag}`;
          preferences[tagKey] = (preferences[tagKey] || 0) + weight;
        }
      }
    }

    const normalized = Object.fromEntries(
      Object.entries(preferences).map(([key, value]) => [key, clamp(parseFloat(value.toFixed(2)), -5, 10)])
    );

    await db.insert(flickPersonalizationProfiles).values({
      userId,
      preferences: JSON.stringify(normalized),
    }).onConflictDoUpdate({
      target: flickPersonalizationProfiles.userId,
      set: {
        preferences: JSON.stringify(normalized),
        updatedAt: sql`CURRENT_TIMESTAMP`,
      },
    });

    return normalized;
  }

  static async getRankedFlicks(userId: string | null, flickRows: Array<any>) {
    if (!userId) return flickRows;

    const profile = await db.select({ preferences: flickPersonalizationProfiles.preferences }).from(flickPersonalizationProfiles).where(eq(flickPersonalizationProfiles.userId, userId)).limit(1);
    const parsedProfile = parsePreferences(profile[0]?.preferences);
    const seenFlickIds = await db.select({ flickId: flickInteractions.flickId }).from(flickInteractions).where(and(eq(flickInteractions.userId, userId), eq(flickInteractions.eventType, "flick_watch_completed")));
    const seenSet = new Set(seenFlickIds.map((item: { flickId: string | null }) => item.flickId));

    return flickRows
      .filter((flick) => !seenSet.has(flick.id))
      .map((flick) => {
        let score = 0;
        const titleKey = flick.movieTitle ? `movie:${flick.movieTitle}` : null;
        const uploaderKey = flick.uploader ? `uploader:${flick.uploader}` : null;
        if (titleKey && parsedProfile[titleKey]) score += parsedProfile[titleKey] * 1.4;
        if (uploaderKey && parsedProfile[uploaderKey]) score += parsedProfile[uploaderKey] * 1.1;
        if (flick.tags?.length) {
          for (const tag of flick.tags) {
            const tagKey = `tag:${tag}`;
            if (parsedProfile[tagKey]) score += parsedProfile[tagKey] * 0.8;
          }
        }
        return { ...flick, personalizationScore: score };
      })
      .sort((a, b) => (b.personalizationScore || 0) - (a.personalizationScore || 0));
  }
}
