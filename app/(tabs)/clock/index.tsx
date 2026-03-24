import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Clock, LogIn, LogOut, Calendar, Menu } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useSidebar } from '@/contexts/SidebarContext';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/services/api';
import { mockTimeEntries } from '@/services/mockData';
import { TimeEntry } from '@/types';

export default function TimeClockScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { openSidebar } = useSidebar();
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [localClockedIn, setLocalClockedIn] = useState<boolean | null>(null);
  const [clockInTime, setClockInTime] = useState<string | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const pulseRef = useRef<Animated.CompositeAnimation | null>(null);

  const { data: entries } = useQuery<TimeEntry[]>({
    queryKey: ['timeEntries'],
    queryFn: async () => {
      try {
        const res = await apiRequest<{ items: any[] }>('/time-entries');
        const items = res.data?.items ?? [];
        return items.map((e) => {
          const clockIn = e.clockIn ? String(e.clockIn) : null;
          const clockOut = e.clockOut ? String(e.clockOut) : null;
          const status = clockIn && !clockOut ? 'clocked_in' : clockIn && clockOut ? 'clocked_out' : 'not_started';
          const date = e.date ? new Date(e.date).toISOString() : new Date().toISOString();
          return {
            id: String(e.id ?? e._id ?? ''),
            date,
            clockIn,
            clockOut,
            totalHours: typeof e.totalHours === 'number' ? e.totalHours : null,
            status,
          } as TimeEntry;
        });
      } catch {
        return mockTimeEntries;
      }
    },
  });

  const todayEntry = entries?.[0];
  const serverClockedIn = todayEntry?.status === 'clocked_in';
  const isClockedIn = localClockedIn !== null ? localClockedIn : serverClockedIn;
  const weekEntries = entries?.slice(1, 5) ?? [];

  useEffect(() => {
    if (localClockedIn === null && todayEntry) {
      setLocalClockedIn(todayEntry.status === 'clocked_in');
      setClockInTime(todayEntry.clockIn);
    }
  }, [todayEntry, localClockedIn]);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      );
      setCurrentDate(
        now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isClockedIn) {
      pulseRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 1200, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        ]),
      );
      pulseRef.current.start();
    } else {
      pulseRef.current?.stop();
      pulseAnim.setValue(1);
    }
    return () => pulseRef.current?.stop();
  }, [isClockedIn, pulseAnim]);

  const clockMutation = useMutation({
    mutationFn: async (action: 'clock_in' | 'clock_out') => {
      try {
        const nowIso = new Date().toISOString();

        if (action === 'clock_in') {
          const payload = {
            employee: user?.fullName || user?.id || 'employee',
            date: nowIso,
            clockIn: nowIso,
            clockOut: '',
            totalHours: 0,
            status: 'incomplete',
            location: '',
          };
          const created = await apiRequest<{ item: any }>('/time-entries', {
            method: 'POST',
            body: JSON.stringify(payload),
          });
          return created.data?.item;
        }

        const listRes = await apiRequest<{ items: any[] }>('/time-entries');
        const items = listRes.data?.items ?? [];
        const openEntry = items.find((e) => !e.clockOut);
        if (!openEntry?.id) {
          throw new Error('No open time entry found');
        }

        const updated = await apiRequest<{ item: any }>(`/time-entries/${openEntry.id}`,
          {
            method: 'PUT',
            body: JSON.stringify({ clockOut: nowIso, status: 'complete' }),
          },
        );

        return updated.data?.item;
      } catch {
        console.log(`[Clock] ${action} recorded (demo mode)`);
        return { action, timestamp: new Date().toISOString() };
      }
    },
    onSuccess: (_, action) => {
      const now = new Date().toISOString();
      if (action === 'clock_in') {
        setLocalClockedIn(true);
        setClockInTime(now);
      } else {
        setLocalClockedIn(false);
      }
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const handleClockAction = useCallback(() => {
    const action = isClockedIn ? 'clock_out' : 'clock_in';
    const label = isClockedIn ? 'Clock Out' : 'Clock In';

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    Animated.sequence([
      Animated.timing(buttonScale, { toValue: 0.92, duration: 100, useNativeDriver: true }),
      Animated.timing(buttonScale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();

    Alert.alert(label, `Confirm ${label.toLowerCase()}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: () => clockMutation.mutate(action) },
    ]);
  }, [isClockedIn, buttonScale, clockMutation]);

  const formatTime = (isoString: string | null) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const getElapsedTime = () => {
    if (!isClockedIn || !clockInTime) return null;
    const diff = Date.now() - new Date(clockInTime).getTime();
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  };

  const weeklyTotal = weekEntries.reduce((sum, e) => sum + (e.totalHours ?? 0), 0);
  const elapsed = getElapsedTime();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.hamburgerBtn}
          onPress={openSidebar}
          activeOpacity={0.7}
          testID="clock-hamburger"
        >
          <Menu color={Colors.surface} size={22} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Time Clock</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.clockFace}>
          <Text style={styles.currentTime}>{currentTime}</Text>
          <Text style={styles.currentDate}>{currentDate}</Text>
        </View>

        <View style={styles.statusIndicator}>
          <View
            style={[styles.statusDot, { backgroundColor: isClockedIn ? Colors.clockedIn : Colors.clockedOut }]}
          />
          <Text style={[styles.statusText, { color: isClockedIn ? Colors.clockedIn : Colors.clockedOut }]}>
            {isClockedIn ? 'Currently Clocked In' : 'Not Clocked In'}
          </Text>
        </View>

        {isClockedIn && elapsed && (
          <View style={styles.elapsedCard}>
            <Text style={styles.elapsedLabel}>Time on shift</Text>
            <Text style={styles.elapsedValue}>{elapsed}</Text>
          </View>
        )}

        <Animated.View
          style={[
            styles.clockButtonContainer,
            { transform: [{ scale: isClockedIn ? pulseAnim : buttonScale }] },
          ]}
        >
          <TouchableOpacity
            style={[styles.clockButton, isClockedIn ? styles.clockOutButton : styles.clockInButton]}
            onPress={handleClockAction}
            disabled={clockMutation.isPending}
            activeOpacity={0.8}
            testID="clock-action-button"
          >
            {isClockedIn ? (
              <LogOut color="#FFFFFF" size={28} />
            ) : (
              <LogIn color="#FFFFFF" size={28} />
            )}
            <Text style={styles.clockButtonText}>
              {clockMutation.isPending ? 'Processing...' : isClockedIn ? 'Clock Out' : 'Clock In'}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {(todayEntry || isClockedIn) && (
          <View style={styles.todaySummary}>
            <Text style={styles.summaryTitle}>Today's Summary</Text>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Clock In</Text>
                <Text style={styles.summaryValue}>{formatTime(clockInTime ?? todayEntry?.clockIn ?? null)}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Clock Out</Text>
                <Text style={styles.summaryValue}>
                  {isClockedIn ? '--:--' : formatTime(todayEntry?.clockOut ?? null)}
                </Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Hours</Text>
                <Text style={styles.summaryValue}>
                  {isClockedIn ? elapsed ?? '--' : todayEntry?.totalHours?.toFixed(1) ?? '--'}
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.historySection}>
          <View style={styles.historyHeader}>
            <Calendar color={Colors.primary} size={16} />
            <Text style={styles.historyTitle}>This Week</Text>
            <Text style={styles.weeklyTotal}>{weeklyTotal.toFixed(1)} hrs</Text>
          </View>

          {weekEntries.map((entry) => (
            <View key={entry.id} style={styles.historyItem}>
              <Text style={styles.historyDate}>
                {new Date(entry.date).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
              <View style={styles.historyTimes}>
                <Text style={styles.historyTime}>
                  {formatTime(entry.clockIn)} — {formatTime(entry.clockOut)}
                </Text>
              </View>
              <Text style={styles.historyHours}>{entry.totalHours?.toFixed(1)}h</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 24 }} />
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
  headerTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 24,
  },
  clockFace: {
    alignItems: 'center',
    marginBottom: 16,
  },
  currentTime: {
    fontSize: 40,
    fontWeight: '800' as const,
    color: Colors.text,
    letterSpacing: -1,
  },
  currentDate: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
    fontWeight: '500' as const,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  elapsedCard: {
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  elapsedLabel: {
    fontSize: 12,
    color: Colors.clockedIn,
    fontWeight: '500' as const,
  },
  elapsedValue: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: Colors.clockedIn,
    marginTop: 2,
  },
  clockButtonContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },
  clockButton: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
    gap: 6,
  },
  clockInButton: {
    backgroundColor: Colors.clockedIn,
  },
  clockOutButton: {
    backgroundColor: Colors.clockedOut,
  },
  clockButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700' as const,
  },
  todaySummary: {
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
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginBottom: 4,
    fontWeight: '500' as const,
  },
  summaryValue: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  summaryDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.border,
  },
  historySection: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  historyTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  weeklyTotal: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  historyDate: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
    width: 90,
  },
  historyTimes: {
    flex: 1,
  },
  historyTime: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  historyHours: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
});
