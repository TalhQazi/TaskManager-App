import React from 'react';
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
import { ArrowLeft, MapPin, Clock, Briefcase, ChevronRight } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { apiRequest } from '@/services/api';
import { ScheduleShift } from '@/types';

const DAY_LABELS: Record<string, string> = {
  '0': 'Sun', '1': 'Mon', '2': 'Tue', '3': 'Wed',
  '4': 'Thu', '5': 'Fri', '6': 'Sat',
};

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

function formatShiftDate(dateStr: string) {
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (date.getTime() === today.getTime()) return 'Today';
  if (date.getTime() === tomorrow.getTime()) return 'Tomorrow';
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

function isToday(dateStr: string) {
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date.getTime() === today.getTime();
}

export default function ScheduleScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: shifts, isLoading } = useQuery<ScheduleShift[]>({
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

        return mapped;
      } catch {
        return [];
      }
    },
  });

  const renderShift = ({ item, index }: { item: ScheduleShift; index: number }) => {
    const today = isToday(item.date);
    return (
      <View style={[styles.shiftCard, today && styles.shiftCardToday]}>
        {today && (
          <View style={styles.todayBanner}>
            <View style={styles.todayDot} />
            <Text style={styles.todayText}>TODAY</Text>
          </View>
        )}
        <View style={styles.shiftHeader}>
          <View style={styles.dateBlock}>
            <Text style={[styles.dateLabelDay, today && styles.dateLabelDayToday]}>
              {formatShiftDate(item.date)}
            </Text>
            <Text style={[styles.dateFullStr, today && styles.dateFullStrToday]}>
              {new Date(item.date + 'T00:00:00').toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
          </View>
          <View style={[styles.shiftTimeBadge, today && styles.shiftTimeBadgeToday]}>
            <Clock color={today ? '#FFFFFF' : Colors.primary} size={13} />
            <Text style={[styles.shiftTimeBadgeText, today && styles.shiftTimeBadgeTextToday]}>
              {item.startTime} – {item.endTime}
            </Text>
          </View>
        </View>

        <View style={styles.shiftDetails}>
          <View style={styles.detailRow}>
            <MapPin color={Colors.textTertiary} size={14} />
            <Text style={styles.detailText} numberOfLines={1}>{item.location}</Text>
          </View>
          <View style={styles.detailRow}>
            <Briefcase color={Colors.textTertiary} size={14} />
            <Text style={styles.detailText}>{item.role}</Text>
          </View>
        </View>

        {item.tasks.length > 0 && (
          <View style={styles.tasksRow}>
            {item.tasks.map((task, idx) => (
              <View key={idx} style={[styles.taskPill, today && styles.taskPillToday]}>
                <Text style={[styles.taskPillText, today && styles.taskPillTextToday]}>{task}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>No upcoming shifts</Text>
      <Text style={styles.emptySubtitle}>Your schedule will appear here</Text>
    </View>
  );

  const totalHoursPerWeek = (shifts ?? []).reduce((sum, shift) => {
    const [startH, startM] = shift.startTime.split(':').map(Number);
    const [endH, endM] = shift.endTime.split(':').map(Number);
    return sum + (endH + endM / 60) - (startH + startM / 60);
  }, 0);

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
          <Text style={styles.headerTitle}>Schedule</Text>
        </View>

        <View style={styles.summaryBar}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{shifts?.length ?? 0}</Text>
            <Text style={styles.summaryLabel}>Upcoming</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{totalHoursPerWeek.toFixed(0)}h</Text>
            <Text style={styles.summaryLabel}>Total Hours</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>5</Text>
            <Text style={styles.summaryLabel}>Days / Week</Text>
          </View>
        </View>

        <View style={styles.content}>
          <FlatList
            data={shifts}
            renderItem={renderShift}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={renderEmpty}
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
  headerTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: '#FFFFFF',
  },
  summaryLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500' as const,
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
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
    gap: 10,
  },
  shiftCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  shiftCardToday: {
    backgroundColor: Colors.primary,
  },
  todayBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  todayDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#4ADE80',
  },
  todayText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#4ADE80',
    letterSpacing: 1,
  },
  shiftHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 10,
  },
  dateBlock: {
    flex: 1,
  },
  dateLabelDay: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  dateLabelDayToday: {
    color: '#FFFFFF',
  },
  dateFullStr: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 2,
    fontWeight: '500' as const,
  },
  dateFullStrToday: {
    color: 'rgba(255,255,255,0.6)',
  },
  shiftTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.infoLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  shiftTimeBadgeToday: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  shiftTimeBadgeText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  shiftTimeBadgeTextToday: {
    color: '#FFFFFF',
  },
  shiftDetails: {
    gap: 6,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  detailText: {
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
  },
  tasksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  taskPill: {
    backgroundColor: Colors.infoLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  taskPillToday: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  taskPillText: {
    fontSize: 12,
    color: Colors.secondary,
    fontWeight: '500' as const,
  },
  taskPillTextToday: {
    color: 'rgba(255,255,255,0.9)',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 8,
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
