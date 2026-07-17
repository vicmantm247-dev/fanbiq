import { NextRequest, NextResponse } from 'next/server';
import { getValidatedSession } from "@/lib/server/validate-session";
import { z } from 'zod';
import { SessionData } from '@/types';
import { FlickPersonalizationService } from '@/lib/services/flick-personalization-service';

const eventSchema = z.object({
  flickId: z.string().min(1),
  eventType: z.enum([
    'flick_viewed',
    'flick_watch_completed',
    'flick_skipped',
    'flick_liked',
    'flick_added_to_likes_list',
    'uploader_followed',
    'flick_comment_added',
  ]),
  movieId: z.string().optional().nullable(),
  movieTitle: z.string().optional().nullable(),
  uploader: z.string().optional().nullable(),
  metadata: z.string().optional().nullable(),
});

export async function POST(request: NextRequest) {
  const session = await getValidatedSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = eventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    await FlickPersonalizationService.logInteraction(session.user.Id, parsed.data);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to record interaction' }, { status: 500 });
  }
}

