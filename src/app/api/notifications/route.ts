import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { getSessionOptions } from '@/lib/session';
import { SessionData } from '@/types';
import { NotificationService } from '@/lib/services/notification-service';

export async function GET() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, await getSessionOptions());

  if (!session.isLoggedIn || !session.user?.Id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await NotificationService.listForUser(session.user.Id);
  return NextResponse.json({ data: data.map((item: { id: number; type: string; actorId: string | null; actorName: string | null; message: string; createdAt: Date | null; read: boolean; sessionCode: string | null; relatedId: string | null }) => ({
    id: item.id,
    type: item.type,
    actorId: item.actorId,
    actorName: item.actorName,
    message: item.message,
    createdAt: item.createdAt?.toISOString?.() ?? '',
    read: item.read,
    sessionCode: item.sessionCode,
    relatedId: item.relatedId,
  })) });
}

export async function PATCH(request: NextRequest) {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, await getSessionOptions());

  if (!session.isLoggedIn || !session.user?.Id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  if (body?.action === 'mark-read' && body?.notificationId) {
    await NotificationService.markAsRead(Number(body.notificationId), session.user.Id);
    return NextResponse.json({ success: true });
  }

  if (body?.action === 'mark-all-read') {
    await NotificationService.markAllAsRead(session.user.Id);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
