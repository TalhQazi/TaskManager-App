import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  ClipboardList,
  Calendar,
  MessageSquare,
  Info,
  CheckCheck,
} from 'lucide-react-native';

import Colors from '@/constants/colors';
import { apiRequest } from '@/services/api';
import { Notification } from '@/types';

import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';

const ICON_MAP: Record<
  Notification['type'],
  React.ComponentType<{ color: string; size: number }>
> = {
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
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

useFocusEffect(
  useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  }, [])
);

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await apiRequest<{ items: any[] }>('/notifications');
      const items = res.data?.items ?? [];

      return items.map((n) => ({
        id: String(n.id ?? n._id ?? ''),
        title: n.title || 'Notification',
        message: n.content || n.message || '',
        type: n.type === 'direct' ? 'message' : 'system',

       
        read: n.status?.toLowerCase() === 'read',

        status: n.status,
        timestamp: n.timestamp || new Date().toISOString(),
      }));
    },
  });


  const markReadMutation = useMutation({
  mutationFn: (id: string) =>
  apiRequest(`/notifications/${id}/mark-read`, {
  method: 'POST',
}),

  onMutate: async (id) => {
    await queryClient.cancelQueries({ queryKey: ['notifications'] });

    const previous = queryClient.getQueryData<Notification[]>([
      'notifications',
    ]);

    queryClient.setQueryData<Notification[]>(['notifications'], (old) =>
      old?.map((n) =>
        n.id === id
          ? { ...n, read: true, status: 'read' }
          : n
      ) || []
    );

    return { previous };
  },

  onError: (_err, _id, context) => {
    queryClient.setQueryData(['notifications'], context?.previous);
  },


});

 const markAllReadMutation = useMutation({
  mutationFn: () =>
    apiRequest(`/notifications/mark-all-read`, { method: 'POST' }),

  onMutate: async () => {
    await queryClient.cancelQueries({ queryKey: ['notifications'] });

    const previous = queryClient.getQueryData<Notification[]>([
      'notifications',
    ]);

    queryClient.setQueryData<Notification[]>(['notifications'], (old) =>
      old?.map((n) => ({
        ...n,
        read: true,
        status: 'read',
      })) || []
    );

    return { previous };
  },

  onError: (_err, _vars, context) => {
    queryClient.setQueryData(['notifications'], context?.previous);
  },

  // ❌ REMOVE INVALIDATE
});

  const markRead = (id: string) => markReadMutation.mutate(id);
  const markAllRead = () => markAllReadMutation.mutate();

  const unreadCount = notifications.filter((n) => !n.read).length;

  const formatTime = (iso: string) => {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const renderNotification = ({ item }: { item: Notification }) => {
    const Icon = ICON_MAP[item.type] ?? Info;
    const color = COLOR_MAP[item.type] ?? Colors.textSecondary;

    return (
      <TouchableOpacity
        style={[styles.card, !item.read && styles.cardUnread]}
        onPress={() => markRead(item.id)}
        activeOpacity={0.7}
      >
        <View style={[styles.icon, { backgroundColor: `${color}18` }]}>
          <Icon color={color} size={20} />
        </View>

        <View style={styles.body}>
          <View style={styles.row}>
            <Text
              style={[styles.title, !item.read && styles.titleUnread]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            <Text style={styles.time}>{formatTime(item.timestamp)}</Text>
          </View>

          <Text style={styles.message} numberOfLines={2}>
            {item.message}
          </Text>

          <View style={styles.pill}>
            <Text style={[styles.pillText, { color }]}>
              {item.type}
            </Text>
          </View>
        </View>

        {!item.read && <View style={styles.dot} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {unreadCount > 0 && (
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.markAll}
            onPress={markAllRead}
          >
            <CheckCheck color={Colors.primary} size={18} />
            <Text style={styles.markAllText}>Mark all as read</Text>
          </TouchableOpacity>

          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount} new</Text>
          </View>
        </View>
      )}

      <FlatList
        data={notifications}
        extraData={notifications}   // 🔥 important fix
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },

  markAll: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: Colors.infoLight,
    padding: 8,
    borderRadius: 10,
  },

  markAllText: {
    color: Colors.primary,
    fontWeight: '600',
  },

  badge: {
    backgroundColor: Colors.error,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },

  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  list: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },

  card: {
    flexDirection: 'row',
    padding: 14,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    gap: 12,
  },

  cardUnread: {
    backgroundColor: '#F0F7FF',
  },

  icon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  body: { flex: 1 },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  title: { fontSize: 14, fontWeight: '600', color: Colors.text },

  titleUnread: { fontWeight: '700' },

  time: { fontSize: 11, color: Colors.textTertiary },

  message: { fontSize: 13, color: Colors.textSecondary },

  pill: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 6,
  },

  pillText: { fontSize: 11, fontWeight: '600' },

  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.secondary,
    marginTop: 6,
  },

  sep: { height: 8 },
});