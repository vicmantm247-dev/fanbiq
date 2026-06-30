'use client';

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SharedTabs } from '@/components/ui/shared-tabs';
import { ArrowLeft, Heart, MessageCircle, Share2, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';

interface Notification {
  id: number;
  type: 'follow' | 'session_join' | 'session_match';
  actorId?: string | null;
  actorName?: string | null;
  message: string;
  createdAt: string;
  read: boolean;
  sessionCode?: string | null;
  relatedId?: string | null;
}

function getNotificationIcon(type: string) {
  switch (type) {
    case 'follow':
      return <Heart className="size-4 text-red-500" />;
    case 'session_join':
      return <Share2 className="size-4 text-blue-500" />;
    case 'session_match':
      return <MessageCircle className="size-4 text-green-500" />;
    default:
      return null;
  }
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'just now';
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.round(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.round(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [loading, setLoading] = useState(true);

  const filteredNotifications = notifications.filter(n => 
    filter === 'all' ? true : !n.read
  );

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    void loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const response = await apiClient.get<{ data: Notification[] }>('/api/notifications');
      setNotifications(response.data.data || []);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: number) => {
    try {
      await apiClient.patch('/api/notifications', { action: 'mark-read', notificationId: id });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch {
      // ignore
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await apiClient.patch('/api/notifications', { action: 'mark-all-read' });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch {
      // ignore
    }
  };

  return (
    <main className="h-screen overflow-y-auto bg-background text-foreground">
      <div className="mx-auto flex max-w-2xl flex-col px-4 pb-8 pt-[calc(env(safe-area-inset-top)+12px)]">
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
              <ArrowLeft className="size-5" />
            </Button>
            <div>
              <h1 className="text-lg font-extrabold">Notifications</h1>
            </div>
          </div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead} className="text-xs">
              Mark all read
            </Button>
          )}
        </div>

        <SharedTabs
          className="mt-4"
          tabs={[
            { label: `All (${notifications.length})`, value: 'all' },
            { label: `Unread (${unreadCount})`, value: 'unread' },
          ]}
          activeValue={filter}
          onChange={(value) => setFilter(value as 'all' | 'unread')}
        />

        <div className="mt-4 space-y-3">
          {loading ? (
            <div className="flex justify-center py-10 text-sm text-muted-foreground">Loading notifications…</div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 py-12 text-center">
              <div className="mb-4 rounded-full bg-background p-4">
                <Clock className="size-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map(notification => (
                <div
                  key={notification.id}
                  className={cn(
                    'mb-3 flex cursor-pointer gap-4 rounded-xl p-2 transition-colors hover:bg-card/80',
                    !notification.read ? 'bg-muted/50' : 'bg-muted/80'
                  )}
                  onClick={() => handleMarkAsRead(notification.id)}
                >
                  <div className="flex h-18 w-18 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                    <Avatar className="h-full w-full rounded-lg">
                      {notification.actorId ? (
                        <AvatarImage
                          src={`/api/user/profile-picture/${notification.actorId}`}
                          alt={notification.actorName || 'Actor'}
                          className="object-cover"
                        />
                      ) : null}
                      <AvatarFallback className="rounded-2xl text-sm font-semibold">
                        {(notification.actorName || 'S').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-0 flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold">{notification.actorName || 'Someone'}</p>
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <p className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatTimestamp(notification.createdAt)}
                        </p>
                        {!notification.read && (
                          <div className="size-2 shrink-0 rounded-full bg-primary" />
                        )}
                      </div>
                    </div>
                    <p className="mb-2 line-clamp-2 text-sm text-muted-foreground">
                      {notification.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
