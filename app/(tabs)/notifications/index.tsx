import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';

import {
  Bell,
  CheckCircle2,
  AlertCircle,
  Info,
  CheckCheck,
  Eye,
} from 'lucide-react-native';

import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/colors';
import { apiRequest } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

type NotificationType =
  | 'task'
  | 'message'
  | 'system'
  | 'schedule'
  | 'direct'
  | 'broadcast';

interface Notification {
  id: string;
  title: string;
  content: string;
  message?: string;
  type: NotificationType;
  status: string;
  readBy?: string[];
  timestamp: string;
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const currentUserEmail = user?.email || '';

  const [refreshing, setRefreshing] = useState(false);

  const {
    data: notifications = [],
    isLoading,
    refetch,
  } = useQuery<Notification[]>({
    queryKey: ['managerNotifications'],
    queryFn: async () => {
      const res = await apiRequest<{ items?: any[] }>(
        '/notifications'
      );

      const items = res.data?.items || [];

      return items.map((item) => ({
        id: String(item.id || item._id),
        title: item.title || 'Notification',
        content: item.content || item.message || '',
        type:
          item.type === 'direct'
            ? 'message'
            : item.type || 'system',
        status: item.status || 'sent',
        readBy: item.readBy || [],
        timestamp: item.timestamp || new Date().toISOString(),
      }));
    },
  });

  // UNREAD FILTER
  const unreadNotifications = useMemo(() => {
    return notifications.filter((notification) => {
      const isRead =
        notification.status === 'read' ||
        notification.readBy?.includes(currentUserEmail);

      return !isRead;
    });
  }, [notifications, currentUserEmail]);

  const unreadCount = unreadNotifications.length;

  // MARK SINGLE READ
  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest(`/notifications/${id}/mark-read`, {
        method: 'POST',
      });

      return id;
    },

    onSuccess: (id) => {
      queryClient.setQueryData(
        ['managerNotifications'],
        (oldData: Notification[] = []) => {
          return oldData.map((notification) => {
            if (notification.id === id) {
              return {
                ...notification,
                status: 'read',
                readBy: [
                  ...(notification.readBy || []),
                  currentUserEmail,
                ],
              };
            }

            return notification;
          });
        }
      );
    },
  });

  // MARK ALL READ
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const unreadIds = unreadNotifications.map((n) => n.id);

      await Promise.all(
        unreadIds.map((id) =>
          apiRequest(`/notifications/${id}/mark-read`, {
            method: 'POST',
          })
        )
      );

      return unreadIds;
    },

    onSuccess: (ids) => {
      queryClient.setQueryData(
        ['managerNotifications'],
        (oldData: Notification[] = []) => {
          return oldData.map((notification) => {
            if (ids.includes(notification.id)) {
              return {
                ...notification,
                status: 'read',
                readBy: [
                  ...(notification.readBy || []),
                  currentUserEmail,
                ],
              };
            }

            return notification;
          });
        }
      );
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);

    await refetch();

    setRefreshing(false);
  }, [refetch]);

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'task':
        return (
          <CheckCircle2
            size={20}
            color={Colors.success}
          />
        );

      case 'schedule':
        return (
          <AlertCircle
            size={20}
            color={Colors.warning}
          />
        );

      case 'message':
      case 'direct':
        return (
          <Info
            size={20}
            color={Colors.info}
          />
        );

      default:
        return (
          <Bell
            size={20}
            color={Colors.primary}
          />
        );
    }
  };

  const getIconBg = (type: NotificationType) => {
    switch (type) {
      case 'task':
        return Colors.successLight;

      case 'schedule':
        return Colors.warningLight;

      case 'message':
      case 'direct':
        return Colors.infoLight;

      default:
        return Colors.surfaceAlt;
    }
  };

  const formatTime = (timestamp: string) => {
    if (!timestamp) return '';

    const date = new Date(timestamp);

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderItem = ({ item }: { item: Notification }) => {
    const isRead =
      item.status === 'read' ||
      item.readBy?.includes(currentUserEmail);

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        style={[
          styles.notificationCard,
          !isRead && styles.unreadCard,
        ]}
        onPress={() => {
          if (!isRead) {
            markReadMutation.mutate(item.id);
          }
        }}
      >
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: getIconBg(item.type),
            },
          ]}
        >
          {getIcon(item.type)}
        </View>

        <View style={styles.contentContainer}>
          <View style={styles.titleRow}>
            <Text style={styles.notificationTitle}>
              {item.title}
            </Text>

            {!isRead && <View style={styles.unreadDot} />}
          </View>

          <Text style={styles.notificationMessage}>
            {item.content}
          </Text>

          <View style={styles.bottomRow}>
            <Text style={styles.timestamp}>
              {formatTime(item.timestamp)}
            </Text>

            {!isRead && (
              <View style={styles.readButton}>
                <Eye size={14} color={Colors.primary} />

                <Text style={styles.readButtonText}>
                  Mark Read
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading && !refreshing) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator
          size="large"
          color={Colors.primary}
        />

        <Text style={styles.loadingText}>
          Loading notifications...
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + 10,
        },
      ]}
    >
      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>
            Notifications
          </Text>

          <Text style={styles.subtitle}>
            {unreadCount > 0
              ? `${unreadCount} unread notifications`
              : 'All caught up'}
          </Text>
        </View>

        {unreadCount > 0 && (
          <TouchableOpacity
            style={styles.markAllButton}
            onPress={() =>
              markAllReadMutation.mutate()
            }
          >
            <CheckCheck
              size={18}
              color="#FFFFFF"
            />

            <Text style={styles.markAllText}>
              Mark all
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* LIST */}
      <FlatList
        data={unreadNotifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Bell
              size={48}
              color={Colors.textTertiary}
            />

            <Text style={styles.emptyText}>
              No unread notifications
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  title: {
    fontSize: 30,
    fontWeight: '700',
    color: Colors.text,
  },

  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: Colors.textSecondary,
  },

  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },

  markAllText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },

  notificationCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },

  unreadCard: {
    backgroundColor: Colors.infoLight,
    borderColor: Colors.primary,
  },

  iconContainer: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  contentContainer: {
    flex: 1,
    marginLeft: 14,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  notificationTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
  },

  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginLeft: 8,
  },

  notificationMessage: {
    marginTop: 6,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },

  timestamp: {
    fontSize: 12,
    color: Colors.textTertiary,
  },

  bottomRow: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  readButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  readButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
  },

  emptyText: {
    marginTop: 12,
    fontSize: 15,
    color: Colors.textTertiary,
  },

  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    marginTop: 14,
    color: Colors.textSecondary,
  },
});