import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  Info,
} from 'lucide-react-native';
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';

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
  readBy: string[];
  timestamp: string;
}

export default function ManagerNotificationsScreen() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const currentUserEmail = user?.email;

  const [refreshing, setRefreshing] = useState(false);

  const {
    data: notifications = [],
    isLoading,
    refetch,
  } = useQuery<Notification[]>({
    queryKey: ['managerNotifications'],
    queryFn: async () => {
      const res = await apiRequest<{ items?: Notification[] }>(
        '/notifications'
      );

      return res.data?.items || [];
    },
  });

  // ONLY UNREAD NOTIFICATIONS


const unreadNotifications = notifications.filter((notification: any) => {
  const isRead =
    notification.status === 'read' ||
    notification.readBy?.includes(currentUserEmail);

  return !isRead;
});

const unreadCount = unreadNotifications.length;


  const markReadMutation_= useMutation({
    mutationFn: async (id: string) => {
      await apiRequest(`/notifications/${id}/read`, {
        method: 'PUT',
      });

      return id;
    },

    onSuccess: (id) => {
      // INSTANT LOCAL UPDATE
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
                  currentUserEmail || '',
                ],
              };
            }

            return notification;
          });
        }
      );

      // REFRESH HEADER + SCREEN
      queryClient.invalidateQueries({
        queryKey: ['managerNotifications'],
      });
    },
  });

 

  const markReadMutation = useMutation({
  
  mutationFn: async (id: string) => {
    await apiRequest(`/notifications/${id}/mark-read`, {
      method: 'POST',
    });
  },

  onSuccess: async () => {
    await queryClient.invalidateQueries({
      queryKey: ['managerNotifications'],
    });

    queryClient.refetchQueries({
      queryKey: ['managerNotifications'],
    });
  },
});

const markAllReadMutation = useMutation({
  mutationFn: async () => {
    return await apiRequest('/notifications/mark-all-read', {
      method: 'POST',
    });
  },

  onSuccess: async () => {
    await queryClient.invalidateQueries({
      queryKey: ['managerNotifications'],
    });

    await queryClient.refetchQueries({
      queryKey: ['managerNotifications'],
    });
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

      case 'message':
      case 'direct':
        return (
          <Info
            size={20}
            color={Colors.info}
          />
        );

      case 'schedule':
        return (
          <AlertCircle
            size={20}
            color={Colors.warning}
          />
        );

      default:
        return (
          <Bell
            size={20}
            color={Colors.textSecondary}
          />
        );
    }
  };

  const getIconBg = (type: NotificationType) => {
    switch (type) {
      case 'task':
        return Colors.successLight;

      case 'message':
      case 'direct':
        return Colors.infoLight;

      case 'schedule':
        return Colors.warningLight;

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

  // LOADING
  if (isLoading && !refreshing) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>
            Notifications
          </Text>
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color={Colors.primary}
          />

          <Text style={styles.loadingText}>
            Loading notifications...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.title}>
          Notifications
        </Text>

        <Text style={styles.subtitle}>
          {unreadCount > 0
            ? `${unreadCount} unread`
            : 'All caught up'}
        </Text>
      </View>

      {/* MARK ALL READ */}
      {unreadCount > 0 && (
      <TouchableOpacity
  style={styles.markAllButton}
  onPress={() => markAllReadMutation.mutate()}
>
  <Text style={styles.markAllText}>
    Mark all as read
  </Text>
</TouchableOpacity>
      )}

 

      {/* CONTENT */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={
              refreshing || isLoading
            }
            onRefresh={onRefresh}
          />
        }
      >
        {unreadNotifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Bell
              size={48}
              color={Colors.textTertiary}
            />

            <Text style={styles.emptyText}>
              No unread notifications
            </Text>
          </View>
        ) : (
          unreadNotifications.map(
            (notification) => {
              const isRead =
                notification.status ===
                  'read' ||
                notification.readBy?.includes(
                  currentUserEmail
                );

              return (
                <TouchableOpacity
                  key={notification.id}
                  style={[
                    styles.notificationCard,
                    !isRead &&
                      styles.unreadCard,
                  ]}
                  onPress={() => {
                    if (!isRead) {
                      markReadMutation.mutate(
                        notification.id
                      );
                    }
                  }}
                >
                  <View
                    style={[
                      styles.iconContainer,
                      {
                        backgroundColor:
                          getIconBg(
                            notification.type
                          ),
                      },
                    ]}
                  >
                    {getIcon(
                      notification.type
                    )}
                  </View>

                  <View
                    style={
                      styles.contentContainer
                    }
                  >
                    <View
                      style={styles.titleRow}
                    >
                      <Text
                        style={
                          styles.notificationTitle
                        }
                      >
                        {notification.title ||
                          'Notification'}
                      </Text>

                      {!isRead && (
                        <View
                          style={
                            styles.unreadDot
                          }
                        />
                      )}
                    </View>

                    <Text
                      style={
                        styles.notificationMessage
                      }
                    >
                      {notification.content ||
                        notification.message}
                    </Text>

                    <Text
                      style={
                        styles.timestamp
                      }
                    >
                      {formatTime(
                        notification.timestamp
                      )}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }
          )
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
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
    paddingVertical: 16,
  },

  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
  },

  subtitle: {
    fontSize: 14,
    color: Colors.textTertiary,
    marginTop: 4,
  },

  timestamp: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 4,
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 16,
  },

  markAllButton: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },

  markAllText: {
    color: Colors.surface,
    fontSize: 13,
    fontWeight: '600',
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
    color: Colors.textTertiary,
    marginTop: 12,
  },

  notificationCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },

  unreadCard: {
    backgroundColor: Colors.infoLight,
    borderColor: Colors.info,
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
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },

  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.info,
    marginLeft: 8,
  },

  notificationMessage: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 6,
    lineHeight: 18,
  },
});