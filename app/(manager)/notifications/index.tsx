import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  Info,
  Eye,
  EyeOff,
} from 'lucide-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { apiRequest } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { isDarkTheme } from "@/constants/design/presets";

type NotificationType =
  | 'task'
  | 'message'
  | 'system'
  | 'schedule'
  | 'direct'
  | 'broadcast';

interface Notification {
  id: string;
  _id?: string;
  title: string;
  content: string;
  message?: string;
  type: NotificationType;
  status?: string;
  readBy?: string[];
  createdAt?: string;
  timestamp?: string;
}

function buildColors(uiTheme: any) {
  const isDark = isDarkTheme(uiTheme?.theme);
  return {
    background: isDark ? '#090d13' : '#f8fafc',
    surface: isDark ? '#0d1117' : '#ffffff',
    surfaceMuted: isDark ? '#161b22' : '#f1f5f9',
    border: isDark ? '#21262d' : '#e2e8f0',
    borderLight: isDark ? '#30363d' : '#cbd5e1',
    text: isDark ? '#c9d1d9' : '#0f172a',
    textBold: isDark ? '#f0f6fc' : '#020617',
    textSecondary: isDark ? '#8b949e' : '#64748b',
    textTertiary: isDark ? '#6e7681' : '#94a3b8',
    primary: '#0ea5e9',
    success: '#10b981',
    successLight: isDark ? 'rgba(16, 185, 129, 0.15)' : '#d1fae5',
    warning: '#f59e0b',
    warningLight: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fef3c7',
    info: '#3b82f6',
    infoLight: isDark ? 'rgba(59, 130, 246, 0.15)' : '#dbeafe',
    unreadCardBg: isDark ? 'rgba(14, 165, 233, 0.12)' : '#eff6ff',
    unreadCardBorder: isDark ? 'rgba(14, 165, 233, 0.35)' : '#bfdbfe',
    surfaceAlt: isDark ? '#21262d' : '#e2e8f0',
  };
}

export default function ManagerNotificationsScreen() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { uiTheme } = useTheme();

  const colors = useMemo(() => buildColors(uiTheme), [uiTheme]);

  const [showAll, setShowAll] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const currentUsername = (user as any)?.username || user?.name || '';
  const currentUserEmail = user?.email || '';
  const currentUserId = (user as any)?.id || (user as any)?._id || '';

  const executeApiCall = async (endpoint: string, options?: any) => {
    try {
      return await apiRequest(endpoint, options);
    } catch {
      const altEndpoint = endpoint.startsWith('/api')
        ? endpoint.replace(/^\/api/, '')
        : `/api${endpoint}`;
      return await apiRequest(altEndpoint, options);
    }
  };

  const {
    data: notifications = [],
    isLoading,
    refetch,
  } = useQuery<Notification[]>({
    queryKey: ['manager-notifications'],
    queryFn: async () => {
      const res: any = await executeApiCall('/notifications?type=broadcast');
      if (Array.isArray(res)) return res;
      if (Array.isArray(res?.items)) return res.items;
      if (Array.isArray(res?.data?.items)) return res.data.items;
      if (Array.isArray(res?.data)) return res.data;
      return [];
    },
  });

  const isNotificationRead = useCallback(
    (n: Notification) => {
      if (n.status === 'read') return true;
      if (!Array.isArray(n.readBy)) return false;
      return (
        n.readBy.includes(currentUsername) ||
        n.readBy.includes(currentUserEmail) ||
        n.readBy.includes(currentUserId)
      );
    },
    [currentUsername, currentUserEmail, currentUserId]
  );

  const unreadNotifications = useMemo(
    () => notifications.filter((n) => !isNotificationRead(n)),
    [notifications, isNotificationRead]
  );

  const unreadCount = unreadNotifications.length;

  const displayedNotifications = useMemo(() => {
    const list = showAll ? [...notifications] : [...unreadNotifications];

    return list.sort((a, b) => {
      const aRead = isNotificationRead(a);
      const bRead = isNotificationRead(b);
      if (aRead !== bRead) return aRead ? 1 : -1;

      const parseTime = (dateStr?: string) => {
        if (!dateStr) return 0;
        const t = new Date(dateStr).getTime();
        return isNaN(t) ? 0 : t;
      };

      const ta = parseTime(a.createdAt || a.timestamp);
      const tb = parseTime(b.createdAt || b.timestamp);
      return tb - ta;
    });
  }, [notifications, unreadNotifications, showAll, isNotificationRead]);

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      return await executeApiCall(
        `/notifications/${encodeURIComponent(id)}/mark-read`,
        { method: 'POST' }
      );
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['manager-notifications'] });
      const previous = queryClient.getQueryData<Notification[]>([
        'manager-notifications',
      ]);

      if (previous) {
        queryClient.setQueryData<Notification[]>(
          ['manager-notifications'],
          previous.map((item) => {
            const itemKey = item.id || item._id;
            if (itemKey === id) {
              return {
                ...item,
                status: 'read',
                readBy: [
                  ...(Array.isArray(item.readBy) ? item.readBy : []),
                  currentUsername,
                ].filter(Boolean),
              };
            }
            return item;
          })
        );
      }
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['manager-notifications'], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['manager-notifications'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const promises = unreadNotifications.map((n) => {
        const notifId = n.id || n._id || '';
        return executeApiCall(
          `/notifications/${encodeURIComponent(notifId)}/mark-read`,
          { method: 'POST' }
        );
      });
      return await Promise.all(promises);
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['manager-notifications'] });
      const previous = queryClient.getQueryData<Notification[]>([
        'manager-notifications',
      ]);

      if (previous) {
        queryClient.setQueryData<Notification[]>(
          ['manager-notifications'],
          previous.map((item) => ({
            ...item,
            status: 'read',
            readBy: [
              ...(Array.isArray(item.readBy) ? item.readBy : []),
              currentUsername,
            ].filter(Boolean),
          }))
        );
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['manager-notifications'], context.previous);
      }
      Alert.alert('Error', 'Failed to mark notifications as read.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['manager-notifications'] });
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
        return <CheckCircle2 size={20} color={colors.success} />;
      case 'message':
      case 'direct':
        return <Info size={20} color={colors.info} />;
      case 'schedule':
        return <AlertCircle size={20} color={colors.warning} />;
      default:
        return <Bell size={20} color={colors.textSecondary} />;
    }
  };

  const getIconBg = (type: NotificationType) => {
    switch (type) {
      case 'task':
        return colors.successLight;
      case 'message':
      case 'direct':
        return colors.infoLight;
      case 'schedule':
        return colors.warningLight;
      default:
        return colors.surfaceAlt;
    }
  };

  const formatTime = (timestamp?: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return timestamp;
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading && !refreshing) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textBold }]}>
            Notifications
          </Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading notifications...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textBold }]}>
          Notifications
        </Text>
        <Text style={[styles.subtitle, { color: colors.textTertiary }]}>
          {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
        </Text>
      </View>

      <View style={styles.actionsRow}>
        {unreadCount > 0 ? (
          <TouchableOpacity
            style={[styles.markAllButton, { backgroundColor: colors.primary }]}
            onPress={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
          >
            <Text style={styles.markAllText}>
              {markAllReadMutation.isPending ? 'Marking...' : 'Mark all read'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View />
        )}

        <TouchableOpacity
          style={[
            styles.toggleButton,
            {
              backgroundColor: colors.surfaceMuted,
              borderColor: colors.border,
            },
          ]}
          onPress={() => setShowAll((prev) => !prev)}
        >
          {showAll ? (
            <EyeOff size={16} color={colors.textSecondary} />
          ) : (
            <Eye size={16} color={colors.textSecondary} />
          )}
          <Text style={[styles.toggleText, { color: colors.textSecondary }]}>
            {showAll ? 'Unread Only' : 'Show All'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || isLoading}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {displayedNotifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Bell size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
              {showAll ? 'No notifications found' : 'No unread notifications'}
            </Text>
          </View>
        ) : (
          displayedNotifications.map((notification) => {
            const notifId = notification.id || notification._id || '';
            const isRead = isNotificationRead(notification);

            return (
              <TouchableOpacity
                key={notifId}
                style={[
                  styles.notificationCard,
                  {
                    backgroundColor: isRead
                      ? colors.surface
                      : colors.unreadCardBg,
                    borderColor: isRead
                      ? colors.border
                      : colors.unreadCardBorder,
                  },
                ]}
                onPress={() => {
                  if (!isRead && notifId) {
                    markReadMutation.mutate(notifId);
                  }
                }}
              >
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: getIconBg(notification.type) },
                  ]}
                >
                  {getIcon(notification.type)}
                </View>

                <View style={styles.contentContainer}>
                  <View style={styles.titleRow}>
                    <Text
                      style={[
                        styles.notificationTitle,
                        {
                          color: colors.textBold,
                          fontWeight: isRead ? '500' : '700',
                        },
                      ]}
                    >
                      {notification.title || 'Notification'}
                    </Text>
                    {!isRead && (
                      <View
                        style={[
                          styles.unreadDot,
                          { backgroundColor: colors.info },
                        ]}
                      />
                    )}
                  </View>

                  <Text
                    style={[
                      styles.notificationMessage,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {notification.content || notification.message}
                  </Text>

                  <Text
                    style={[styles.timestamp, { color: colors.textTertiary }]}
                  >
                    {formatTime(
                      notification.createdAt || notification.timestamp
                    )}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  markAllButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  markAllText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 12,
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 15,
    marginTop: 12,
  },
  notificationCard: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    flex: 1,
    marginLeft: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 15,
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  notificationMessage: {
    fontSize: 13,
    marginBottom: 6,
    lineHeight: 18,
  },
});