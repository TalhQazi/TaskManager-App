import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Calendar, Clock, MapPin, User } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import Colors from '@/constants/colors';
import { apiRequest } from '@/services/api';

interface Schedule {
  id: string;
  day: string;
  title: string;
  assignee: string;
  location: string;
  startTime: string;
  endTime: string;
  type: string;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function ManagerScheduleScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const { data: schedules = [], isLoading, refetch } = useQuery<Schedule[]>({
    queryKey: ['managerSchedules'],
    queryFn: async () => {
      const res = await apiRequest<{ items?: Schedule[] }>('/schedules');
      return res.data?.items || [];
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const getScheduleForDay = (day: string) => {
    return schedules.filter((s) => s.day?.toLowerCase() === day.toLowerCase());
  };

  // Show loading screen when data is loading initially
  if (isLoading && !refreshing) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Schedule</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading schedule...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Schedule</Text>
        <Text style={styles.subtitle}>{schedules.length} events</Text>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing || isLoading} onRefresh={onRefresh} />}
      >
        {DAYS.map((day) => {
          const daySchedules = getScheduleForDay(day);
          return (
            <View key={day} style={styles.daySection}>
              <Text style={styles.dayTitle}>{day}</Text>
              {daySchedules.length === 0 ? (
                <View style={styles.emptyDay}>
                  <Text style={styles.emptyDayText}>No events</Text>
                </View>
              ) : (
                daySchedules.map((schedule) => (
                  <View key={schedule.id} style={styles.eventCard}>
                    <View style={styles.eventHeader}>
                      <Text style={styles.eventTitle}>{schedule.title || 'Untitled'}</Text>
                      <View style={styles.typeBadge}>
                        <Text style={styles.typeText}>{schedule.type || 'General'}</Text>
                      </View>
                    </View>

                    <View style={styles.eventDetails}>
                      <View style={styles.detailRow}>
                        <Clock size={14} color={Colors.textTertiary} />
                        <Text style={styles.detailText}>
                          {schedule.startTime || '00:00'} - {schedule.endTime || '00:00'}
                        </Text>
                      </View>

                      <View style={styles.detailRow}>
                        <MapPin size={14} color={Colors.textTertiary} />
                        <Text style={styles.detailText}>{schedule.location || 'No location'}</Text>
                      </View>

                      <View style={styles.detailRow}>
                        <User size={14} color={Colors.textTertiary} />
                        <Text style={styles.detailText}>{schedule.assignee || 'Unassigned'}</Text>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>
          );
        })}
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
  daySection: {
    marginBottom: 20,
  },
  dayTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.primary,
    marginBottom: 12,
  },
  emptyDay: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  emptyDayText: {
    fontSize: 13,
    color: Colors.textTertiary,
  },
  eventCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  eventTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  typeBadge: {
    backgroundColor: Colors.infoLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.info,
    textTransform: 'capitalize',
  },
  eventDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: Colors.textSecondary,
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
