import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Bell, ClipboardList, Calendar, MessageSquare, Info, CheckCheck } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { apiRequest } from '@/services/api';
import { Notification } from '@/types';

const ICON_MAP: Record<Notification['type'], React.ComponentType<{ color: string; size: number }>> = {
  task: ClipboardList,
  schedule: Calendar,
  message: MessageSquare,
  system: Info,
};

const COLOR_MAP: Record<Notification['type'], string> = {
  task: Colors.warning,
  schedule: Colors.secondary,
  message: Colors.success,
  system: Colors.textSecondary,
};

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [readOverrides, setReadOverrides] = useState<Record<string, boolean>>({});

  const { data: apiNotifications = [] } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await apiRequest<{ items: any[] }>('/notifications');
      const items = res.data?.items ?? [];

      return items.map((n) => {
        const title = typeof n.title === 'string' && n.title.trim() ? n.title : 'Notification';
        const message = typeof n.content === 'string' ? n.content : typeof n.message === 'string' ? n.message : '';
        const timestamp = typeof n.timestamp === 'string' ? n.timestamp : new Date().toISOString();

        let type: Notification['type'] = 'system';
        if (String(n.type || '').toLowerCase() === 'direct') type = 'message';
        if (String(n.type || '').toLowerCase() === 'broadcast') type = 'system';

        return {
          id: String(n.id ?? n._id ?? ''),
          title,
          message,
          type,
          read: false,
          timestamp,
        } as Notification;
      });
    },
  });

  const notifications = useMemo(() => {
    return apiNotifications.map((n) => ({
      ...n,
      read: readOverrides[n.id] ?? n.read,
    }));
  }, [apiNotifications, readOverrides]);

  const markAllRead = () => {
    setReadOverrides((prev) => {
      const next = { ...prev };
      for (const n of notifications) next[n.id] = true;
      return next;
    });
  };

  const markRead = (id: string) => {
    setReadOverrides((prev) => ({ ...prev, [id]: true }));
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const renderNotification = ({ item }: { item: Notification }) => {
    const IconComp = ICON_MAP[item.type] ?? Info;
    const iconColor = COLOR_MAP[item.type] ?? Colors.textSecondary;

    return (
      <TouchableOpacity
        style={[styles.notifCard, !item.read && styles.notifCardUnread]}
        onPress={() => markRead(item.id)}
        activeOpacity={0.7}
        testID={`notification-${item.id}`}
      >
        <View style={[styles.iconWrap, { backgroundColor: `${iconColor}18` }]}>
          <IconComp color={iconColor} size={20} />
        </View>
        <View style={styles.notifBody}>
          <View style={styles.notifTopRow}>
            <Text style={[styles.notifTitle, !item.read && styles.notifTitleUnread]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.notifTime}>{formatTime(item.timestamp)}</Text>
          </View>
          <Text style={styles.notifMessage} numberOfLines={2}>
            {item.message}
          </Text>
          <View style={styles.typePill}>
            <Text style={[styles.typeText, { color: iconColor }]}>
              {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
            </Text>
          </View>
        </View>
        {!item.read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Bell color={Colors.textTertiary} size={48} />
      <Text style={styles.emptyTitle}>No notifications</Text>
      <Text style={styles.emptySubtitle}>You're all caught up!</Text>
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft color={Colors.surface} size={22} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Notifications</Text>
            {unreadCount > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{unreadCount} new</Text>
              </View>
            )}
          </View>
          {unreadCount > 0 && (
            <TouchableOpacity style={styles.markAllBtn} onPress={markAllRead} activeOpacity={0.7}>
              <CheckCheck color={Colors.surface} size={18} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.content}>
          <FlatList
            data={notifications}
            renderItem={renderNotification}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={renderEmpty}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  countBadge: {
    backgroundColor: Colors.error,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  countText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  markAllBtn: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  listContent: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 32,
    flexGrow: 1,
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  notifCardUnread: {
    backgroundColor: '#F0F7FF',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.15)',
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  notifBody: {
    flex: 1,
  },
  notifTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 4,
  },
  notifTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  notifTitleUnread: {
    fontWeight: '700' as const,
  },
  notifTime: {
    fontSize: 11,
    color: Colors.textTertiary,
    flexShrink: 0,
    marginTop: 1,
  },
  notifMessage: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 8,
  },
  typePill: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: Colors.secondary,
    marginTop: 4,
    flexShrink: 0,
  },
  separator: {
    height: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
