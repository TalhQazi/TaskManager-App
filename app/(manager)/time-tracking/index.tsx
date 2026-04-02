import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Clock, User, Calendar } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import Colors from '@/constants/colors';
import { apiRequest } from '@/services/api';

interface TimeEntry {
  id: string;
  employee: string;
  date: string;
  clockIn: string;
  clockOut?: string;
  totalHours?: number;
  status: 'clocked-in' | 'clocked-out';
}

export default function ManagerTimeTrackingScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const { data: timeEntries = [], isLoading, refetch } = useQuery<TimeEntry[]>({
    queryKey: ['managerTimeEntries'],
    queryFn: async () => {
      const res = await apiRequest<{ items?: TimeEntry[] }>('/time-entries');
      return res.data?.items || [];
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return '-';
    return timeStr;
  };

  // Show loading screen when data is loading initially
  if (isLoading && !refreshing) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Time Tracking</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading time entries...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Time Tracking</Text>
        <Text style={styles.subtitle}>{timeEntries.length} entries</Text>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing || isLoading} onRefresh={onRefresh} />}
      >
        {timeEntries.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No time entries found</Text>
          </View>
        ) : (
          timeEntries.map((entry) => (
            <View key={entry.id} style={styles.entryCard}>
              <View style={styles.entryHeader}>
                <View style={styles.iconContainer}>
                  <User size={20} color={Colors.primary} />
                </View>
                <View style={styles.employeeInfo}>
                  <Text style={styles.employeeName}>{entry.employee || 'Unknown'}</Text>
                  <View style={styles.dateRow}>
                    <Calendar size={12} color={Colors.textTertiary} />
                    <Text style={styles.dateText}>{formatDate(entry.date)}</Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: entry.status === 'clocked-in' ? Colors.successLight : Colors.surfaceAlt },
                  ]}
                >
                  <Clock
                    size={14}
                    color={entry.status === 'clocked-in' ? Colors.success : Colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.statusText,
                      { color: entry.status === 'clocked-in' ? Colors.success : Colors.textSecondary },
                    ]}
                  >
                    {entry.status === 'clocked-in' ? 'Active' : 'Completed'}
                  </Text>
                </View>
              </View>

              <View style={styles.timeRow}>
                <View style={styles.timeItem}>
                  <Text style={styles.timeLabel}>Clock In</Text>
                  <Text style={styles.timeValue}>{formatTime(entry.clockIn)}</Text>
                </View>
                <View style={styles.timeDivider} />
                <View style={styles.timeItem}>
                  <Text style={styles.timeLabel}>Clock Out</Text>
                  <Text style={styles.timeValue}>{formatTime(entry.clockOut)}</Text>
                </View>
                <View style={styles.timeDivider} />
                <View style={styles.timeItem}>
                  <Text style={styles.timeLabel}>Hours</Text>
                  <Text style={styles.timeValue}>{entry.totalHours?.toFixed(1) || '-'}</Text>
                </View>
              </View>
            </View>
          ))
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
    fontWeight: '700' as const,
    color: Colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textTertiary,
    marginTop: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    marginTop: 8,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.textTertiary,
  },
  entryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  employeeInfo: {
    flex: 1,
    marginLeft: 12,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  dateText: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  timeItem: {
    flex: 1,
    alignItems: 'center',
  },
  timeDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.borderLight,
  },
  timeLabel: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginBottom: 4,
  },
  timeValue: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
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
});
