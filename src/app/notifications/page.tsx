'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, Heart, MessageCircle, Share2, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  type: 'like' | 'comment' | 'share' | 'session_invite';
  user: string;
  avatar: string;
  message: string;
  timestamp: string;
  read: boolean;
  related?: string;
}

// Dummy notifications data
const DUMMY_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    type: 'like',
    user: 'sarah_cinema',
    avatar: 'S',
    message: 'liked your flick about Dune: Part Two',
    timestamp: '2 hours ago',
    read: false,
    related: 'Dune Scene',
  },
  {
    id: '2',
    type: 'comment',
    user: 'film_lover_97',
    avatar: 'F',
    message: 'commented on your Oppenheimer post: "Amazing scene!"',
    timestamp: '4 hours ago',
    read: false,
    related: 'Oppenheimer',
  },
  {
    id: '3',
    type: 'session_invite',
    user: 'alex_movies',
    avatar: 'A',
    message: 'invited you to a watch session',
    timestamp: '1 day ago',
    read: true,
    related: 'Watch Party',
  },
  {
    id: '4',
    type: 'like',
    user: 'cinema_buff',
    avatar: 'C',
    message: 'liked your flick about Past Lives',
    timestamp: '2 days ago',
    read: true,
    related: 'Past Lives',
  },
  {
    id: '5',
    type: 'share',
    user: 'john_flicks',
    avatar: 'J',
    message: 'shared your Poor Things review',
    timestamp: '3 days ago',
    read: true,
    related: 'Poor Things',
  },
];

function getNotificationIcon(type: string) {
  switch (type) {
    case 'like':
      return <Heart className="size-4 text-red-500" />;
    case 'comment':
      return <MessageCircle className="size-4 text-blue-500" />;
    case 'share':
      return <Share2 className="size-4 text-green-500" />;
    case 'session_invite':
      return <Share2 className="size-4 text-purple-500" />;
    default:
      return null;
  }
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>(DUMMY_NOTIFICATIONS);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const filteredNotifications = notifications.filter(n => 
    filter === 'all' ? true : !n.read
  );

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, read: true }))
    );
  };

  return (
    <main className="relative overflow-hidden h-svh pt-[env(safe-area-inset-top)] font-sans bg-background">
      {/* Header */}
      <div className="absolute top-0 inset-x-0 z-20 pt-[calc(env(safe-area-inset-top)+12px)]">
        <div className="max-w-md mx-auto px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="rounded-full"
            >
              <ArrowLeft className="size-5" />
            </Button>
            <h1 className="text-xl font-bold">Notifications</h1>
            {unreadCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center size-5 bg-red-500 text-white text-xs font-bold rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="text-xs"
            >
              Mark all as read
            </Button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="absolute inset-0 top-20 overflow-y-auto">
        <div className="max-w-md mx-auto px-4 py-6">
          {/* Filter tabs */}
          <div className="flex gap-2 mb-6">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
              className="rounded-full"
            >
              All ({notifications.length})
            </Button>
            <Button
              variant={filter === 'unread' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('unread')}
              className="rounded-full"
            >
              Unread ({unreadCount})
            </Button>
          </div>

          {/* Notifications list */}
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Clock className="size-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-sm">
                {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map(notification => (
                <Card
                  key={notification.id}
                  className={cn(
                    'p-4 cursor-pointer transition-colors',
                    !notification.read
                      ? 'bg-muted/50 border-primary/30 hover:bg-muted/70'
                      : 'hover:bg-muted/30'
                  )}
                  onClick={() => handleMarkAsRead(notification.id)}
                >
                  <div className="flex gap-3">
                    {/* Avatar */}
                    <Avatar className="size-10 flex-shrink-0">
                      <AvatarFallback className="text-sm font-bold">
                        {notification.avatar}
                      </AvatarFallback>
                    </Avatar>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm truncate">
                            @{notification.user}
                          </p>
                          {getNotificationIcon(notification.type)}
                        </div>
                        {!notification.read && (
                          <div className="size-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {notification.message}
                      </p>
                      {notification.related && (
                        <p className="text-xs text-muted-foreground mb-2">
                          Related to: <span className="font-medium">{notification.related}</span>
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="size-3" />
                        {notification.timestamp}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
