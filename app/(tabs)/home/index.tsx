import React, { useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader,
  MessageSquare,
  Calendar,
  ChevronRight,
  TrendingUp,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/services/api';
import { mockDashboard, mockSchedule } from '@/services/mockData';
import { DashboardSummary, ScheduleShift, Task, TaskStatus } from '@/types';

const DAY_TO_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function nextDateForDay(day: string) {
  const target = DAY_TO_INDEX[day];
  if (typeof target !== 'number') return null;

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const todayIndex = startOfToday.getDay();
  const delta = (target - todayIndex + 7) % 7;

  const next = new Date(startOfToday);
  next.setDate(startOfToday.getDate() + delta);
  return next.toISOString().split('T')[0];
}

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Fetch tasks for the current user to calculate stats
  const { data: tasks, isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ['tasks', 'dashboard'],
    queryFn: async () => {
      try {
        const res = await apiRequest<{ items: any[] }>('/tasks');
        const items = res.data?.items ?? [];
        return items.map((t) => ({
          id: String(t.id ?? t._id ?? ''),
          title: String(t.title ?? ''),
          description: String(t.description ?? ''),
          status: (String(t.status || 'pending').replace('-', '_') as any) as TaskStatus,
          priority: (t.priority ?? 'medium') as any,
          assignedDate: String(t.createdAt ?? ''),
          dueDate: t.dueDate ? new Date(t.dueDate).toISOString().split('T')[0] : '',
          notes: [],
          images: [],
          category: String(t.location || 'Task'),
          assignees: Array.isArray(t.assignees) ? t.assignees : [],
        })) as Task[];
      } catch {
        return [];
      }
    },
  });

  // Get user's recent tasks
  const userTasks = useMemo(() => {
    if (!tasks || !user) return [];
    
    // Match by username or fullName (backend might use either)
    const userUsername = (user?.username || '').toLowerCase().trim();
    const userFullName = (user?.fullName || '').toLowerCase().trim();
    
    // Filter tasks where current user is in assignees
    const filtered = tasks.filter((t) => {
      if (!t.assignees || t.assignees.length === 0) return false;
      
      return t.assignees.some((a: string) => {
        const assignee = a.toLowerCase().trim();
        // Match exact username or fullName, or partial match
        return assignee === userUsername || 
               assignee === userFullName ||
               assignee.includes(userUsername) ||
               userFullName.includes(assignee) ||
               assignee.includes(userFullName);
      });
    });
    
    // Sort by date (newest first)
    return filtered.sort((a, b) => new Date(b.assignedDate).getTime() - new Date(a.assignedDate).getTime());
  }, [tasks, user]);

  // Calculate stats from user tasks
  const userTaskStats = useMemo(() => {
    return {
      total: userTasks.length,
      pending: userTasks.filter(t => t.status === 'pending').length,
      inProgress: userTasks.filter(t => t.status === 'in_progress').length,
      completed: userTasks.filter(t => t.status === 'completed').length,
    };
  }, [userTasks]);

  const { data: dashboardSummary, isLoading: summaryLoading, refetch } = useQuery<DashboardSummary>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      try {
        const res = await apiRequest<{
          activeTasks: number;
          dueToday: number;
          overdueTasks: number;
          employeesWorking: number;
          employeeTotal: number;
          hoursLoggedToday: number;
          avgHoursPerEmployee: number;
        }>('/dashboard/summary');

        const d = res.data;
        return {
          totalTasks: userTaskStats.total, // Use user's task count
          pendingTasks: userTaskStats.pending,
          inProgressTasks: userTaskStats.inProgress,
          completedTasks: userTaskStats.completed,
          isClockedIn: false,
          todayHours: Number(d.hoursLoggedToday ?? 0),
          weeklyHours: 0,
          unreadMessages: 0,
          upcomingShifts: 0,
          notifications: [],
        } as DashboardSummary;
      } catch {
        return {
          ...mockDashboard,
          totalTasks: userTaskStats.total,
          pendingTasks: userTaskStats.pending,
          inProgressTasks: userTaskStats.inProgress,
          completedTasks: userTaskStats.completed,
        };
      }
    },
    enabled: !!tasks, // Only run after tasks are loaded
  });

  // const { data: schedule } = useQuery<ScheduleShift[]>({
  //   queryKey: ['schedule'],
  //   queryFn: async () => {
  //     try {
  //       const res = await fetch('http://localhost:3000/api/schedule');
  //       if (res.ok) return res.json();
  //       throw new Error('API unavailable');
  //     } catch {
  //       return mockSchedule;
  //     }
  //   },
  // });

  const { data: schedule } = useQuery<ScheduleShift[]>({
    queryKey: ['schedule'],
    queryFn: async () => {
      try {
        const res = await apiRequest<{ items: any[] }>('/schedules');
        const items = res.data?.items ?? [];
        const mapped = items
          .map((e) => {
            if (!e) return null;
            if (!e.startTime || !e.endTime || !e.location) return null;
            const date = typeof e.day === 'string' ? nextDateForDay(e.day) : null;
            if (!date) return null;

            return {
              id: String(e.id ?? e._id ?? ''),
              date,
              startTime: String(e.startTime),
              endTime: String(e.endTime),
              location: String(e.location),
              role: String(e.assignee || ''),
              tasks: e.title ? [String(e.title)] : [],
            } as ScheduleShift;
          })
          .filter(Boolean) as ScheduleShift[];

        return mapped.length > 0 ? mapped : mockSchedule;
      } catch {
        return mockSchedule;
      }
    },
  });

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const firstName = user?.fullName.split(' ')[0] || 'Employee';
  const todayShift = schedule?.[0];
  const unreadNotifs = dashboardSummary?.notifications.filter(n => !n.read).length ?? 0;
  const isLoading = tasksLoading || summaryLoading;

  // Helper functions for task status styling
  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case 'completed': return Colors.success;
      case 'in_progress': return Colors.secondary;
      case 'pending': return Colors.warning;
      default: return Colors.textTertiary;
    }
  };

  const getStatusBgColor = (status: TaskStatus) => {
    switch (status) {
      case 'completed': return Colors.successLight;
      case 'in_progress': return Colors.infoLight;
      case 'pending': return Colors.warningLight;
      default: return Colors.surfaceAlt;
    }
  };

  const formatStatus = (status: TaskStatus) => {
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={Colors.secondary} />
        }
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          {dashboardSummary?.isClockedIn && (
            <View style={styles.clockStatusCard}>
              <View style={styles.clockStatusDot} />
              <Text style={styles.clockStatusText}>You're clocked in</Text>
              <Text style={styles.clockStatusHours}>{dashboardSummary.todayHours.toFixed(1)}h today</Text>
            </View>
          )}

          <View style={styles.statsGrid}>
            <TouchableOpacity
              style={[styles.statCard, styles.statCardPrimary]}
              onPress={() => router.push('/(tabs)/tasks' as any)}
              activeOpacity={0.8}
            >
              <View style={styles.statIconBg}>
                <LayoutDashboard color="#FFFFFF" size={18} />
              </View>
              <Text style={styles.statNumber}>{dashboardSummary?.totalTasks ?? 0}</Text>
              <Text style={styles.statLabel}>Total Tasks</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.statCard, styles.statCardWarning]}
              onPress={() => router.push('/(tabs)/tasks' as any)}
              activeOpacity={0.8}
            >
              <View style={[styles.statIconBg, { backgroundColor: 'rgba(245, 158, 11, 0.2)' }]}>
                <AlertCircle color={Colors.warning} size={18} />
              </View>
              <Text style={[styles.statNumber, { color: Colors.warning }]}>
                {dashboardSummary?.pendingTasks ?? 0}
              </Text>
              <Text style={styles.statLabel}>Pending</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.statCard, styles.statCardInfo]}
              onPress={() => router.push('/(tabs)/tasks' as any)}
              activeOpacity={0.8}
            >
              <View style={[styles.statIconBg, { backgroundColor: 'rgba(59, 130, 246, 0.2)' }]}>
                <Loader color={Colors.secondary} size={18} />
              </View>
              <Text style={[styles.statNumber, { color: Colors.secondary }]}>
                {dashboardSummary?.inProgressTasks ?? 0}
              </Text>
              <Text style={styles.statLabel}>In Progress</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.statCard, styles.statCardSuccess]}
              onPress={() => router.push('/(tabs)/tasks' as any)}
              activeOpacity={0.8}
            >
              <View style={[styles.statIconBg, { backgroundColor: 'rgba(34, 197, 94, 0.2)' }]}>
                <CheckCircle2 color={Colors.success} size={18} />
              </View>
              <Text style={[styles.statNumber, { color: Colors.success }]}>
                {dashboardSummary?.completedTasks ?? 0}
              </Text>
              <Text style={styles.statLabel}>Completed</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.weeklyCard}>
            <View style={styles.weeklyHeader}>
              <TrendingUp color={Colors.primary} size={18} />
              <Text style={styles.weeklyTitle}>Weekly Hours</Text>
            </View>
            <View style={styles.weeklyContent}>
              <Text style={styles.weeklyHours}>{dashboardSummary?.weeklyHours.toFixed(1) ?? '0.0'}</Text>
              <Text style={styles.weeklyUnit}>/ 40 hrs</Text>
            </View>
            <View style={styles.progressBarBg}>
              <Animated.View
                style={[
                  styles.progressBarFill,
                  { width: `${Math.min(((dashboardSummary?.weeklyHours ?? 0) / 40) * 100, 100)}%` as any },
                ]}
              />
            </View>
          </View>

          <View style={styles.quickActions}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => router.push('/(tabs)/clock' as any)}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIcon, { backgroundColor: Colors.infoLight }]}>
                  <Clock color={Colors.secondary} size={20} />
                </View>
                <Text style={styles.actionText}>Time Clock</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => router.push('/(tabs)/tasks' as any)}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIcon, { backgroundColor: Colors.warningLight }]}>
                  <CheckCircle2 color={Colors.warning} size={20} />
                </View>
                <Text style={styles.actionText}>My Tasks</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => router.push('/(tabs)/messages' as any)}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIcon, { backgroundColor: Colors.successLight }]}>
                  <MessageSquare color={Colors.success} size={20} />
                </View>
                <Text style={styles.actionText}>Messages</Text>
              </TouchableOpacity>
            </View>
          </View>

          {todayShift && (
            <TouchableOpacity
              style={styles.scheduleCard}
              onPress={() => router.push('/schedule' as any)}
              activeOpacity={0.8}
            >
              <View style={styles.scheduleHeader}>
                <Calendar color={Colors.primary} size={18} />
                <Text style={styles.sectionTitle}>Today's Schedule</Text>
                <ChevronRight color={Colors.textTertiary} size={16} style={{ marginLeft: 'auto' }} />
              </View>
              <View style={styles.shiftInfo}>
                <Text style={styles.shiftTime}>
                  {todayShift.startTime} — {todayShift.endTime}
                </Text>
                <Text style={styles.shiftLocation}>{todayShift.location}</Text>
                <View style={styles.shiftTasks}>
                  {todayShift.tasks.map((task, idx) => (
                    <View key={idx} style={styles.shiftTaskPill}>
                      <Text style={styles.shiftTaskText}>{task}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </TouchableOpacity>
          )}

          {dashboardSummary?.notifications && dashboardSummary.notifications.length > 0 && (
            <View style={styles.notificationsSection}>
              <View style={styles.notifHeader}>
                <Text style={styles.sectionTitle}>Recent Notifications</Text>
                <TouchableOpacity onPress={() => router.push('/notifications' as any)}>
                  <Text style={styles.seeAllText}>See all</Text>
                </TouchableOpacity>
              </View>
              {dashboardSummary.notifications.slice(0, 3).map((notif) => (
                <View
                  key={notif.id}
                  style={[styles.notifItem, !notif.read && styles.notifItemUnread]}
                >
                  <View
                    style={[
                      styles.notifDot,
                      { backgroundColor: notif.read ? Colors.textTertiary : Colors.secondary },
                    ]}
                  />
                  <View style={styles.notifContent}>
                    <Text style={styles.notifTitle}>{notif.title}</Text>
                    <Text style={styles.notifMessage} numberOfLines={1}>
                      {notif.message}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Recent Tasks Section */}
          {userTasks && userTasks.length > 0 && (
            <View style={styles.recentTasksSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Tasks</Text>
                <TouchableOpacity onPress={() => router.push('/(tabs)/tasks' as any)}>
                  <Text style={styles.seeAllText}>See all</Text>
                </TouchableOpacity>
              </View>
              {userTasks.slice(0, 5).map((task) => (
                <TouchableOpacity
                  key={task.id}
                  style={styles.recentTaskItem}
                  onPress={() => router.push(`/(tabs)/tasks/${task.id}` as any)}
                  activeOpacity={0.7}
                >
                  <View style={styles.taskLeft}>
                    <View style={[styles.taskStatusDot, { backgroundColor: getStatusColor(task.status) }]} />
                    <View style={styles.taskInfo}>
                      <Text style={styles.taskTitle} numberOfLines={1}>
                        {task.title}
                      </Text>
                      <Text style={styles.taskCategory}>{task.category}</Text>
                    </View>
                  </View>
                  <View style={[styles.taskBadge, { backgroundColor: getStatusBgColor(task.status) }]}>
                    <Text style={[styles.taskBadgeText, { color: getStatusColor(task.status) }]}>
                      {formatStatus(task.status)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={{ height: 20 }} />
        </Animated.View>
      </ScrollView>
    </View>
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
  hamburgerBtn: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
  },
  greeting: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '500' as const,
  },
  userName: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginTop: 1,
  },
  notifBtn: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifDotBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: Colors.error,
    borderRadius: 7,
    minWidth: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  notifDotText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800' as const,
    lineHeight: 11,
  },
  scrollView: {
    flex: 1,
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  clockStatusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    gap: 8,
  },
  clockStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.clockedIn,
  },
  clockStatusText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.clockedIn,
  },
  clockStatusHours: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.clockedIn,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    width: '48.5%' as any,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  statCardPrimary: {},
  statCardWarning: {},
  statCardInfo: {},
  statCardSuccess: {},
  statIconBg: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(30, 58, 138, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statNumber: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: Colors.primary,
    lineHeight: 30,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
    fontWeight: '500' as const,
  },
  weeklyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  weeklyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  weeklyTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  weeklyContent: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 10,
  },
  weeklyHours: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: Colors.primary,
  },
  weeklyUnit: {
    fontSize: 14,
    color: Colors.textTertiary,
    fontWeight: '500' as const,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 6,
    backgroundColor: Colors.secondary,
    borderRadius: 3,
  },
  quickActions: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  scheduleCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  shiftInfo: {},
  shiftTime: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  shiftLocation: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  shiftTasks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  shiftTaskPill: {
    backgroundColor: Colors.infoLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  shiftTaskText: {
    fontSize: 12,
    color: Colors.secondary,
    fontWeight: '500' as const,
  },
  notificationsSection: {
    marginBottom: 8,
  },
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.secondary,
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    gap: 10,
  },
  notifItemUnread: {
    backgroundColor: '#F0F7FF',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.12)',
  },
  notifDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  notifContent: {
    flex: 1,
  },
  notifTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  notifMessage: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  // Recent Tasks Section
  recentTasksSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  recentTaskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 2,
  },
  taskLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  taskStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  taskCategory: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  taskBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  taskBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
});
