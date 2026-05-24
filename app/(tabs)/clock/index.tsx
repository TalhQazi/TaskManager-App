import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Alert, Modal,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Clock, LogIn, LogOut, Calendar } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/services/api';
import { TimeEntry } from '@/types';
import { Mic, MicOff, ClipboardList, AlertCircle } from 'lucide-react-native';

export default function TimeClockScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [localClockedIn, setLocalClockedIn] = useState<boolean | null>(null);
  const [clockInTime, setClockInTime] = useState<string | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const pulseRef = useRef<Animated.CompositeAnimation | null>(null);
  const [showEODModal, setShowEODModal] = useState(false);
const [eodData, setEodData] = useState({
  tasksCompleted: '',
  issuesBlockers: '',
  notes: '',
});

const [validationError, setValidationError] = useState('');

const [inputType, setInputType] = useState<'text' | 'voice'>('text');

const [isRecording, setIsRecording] = useState(false);

const [transcription, setTranscription] = useState('');

  const { data: entries } = useQuery<TimeEntry[]>({
    queryKey: ['timeEntries', user?.id || user?.username],
    queryFn: async () => {
      try {
        // Fetch time entries for current user using employee filter
        const employeeName = user?.fullName || user?.username || user?.name || '';
        const res = await apiRequest<{ items: any[] }>(`/time-entries?employee=${encodeURIComponent(employeeName)}`);
        const items = res.data?.items ?? [];
        
        // Also filter by userId if available for extra safety
        const userId = String(user?.id || user?.sub || '').trim();
        const userName = String(user?.username || user?.fullName || user?.name || '').toLowerCase().trim();
        
        const userEntries = items
          .filter((e) => {
            // Match by userId if available
            const entryUserId = String(e.userId || '').trim();
            if (userId && entryUserId === userId) return true;
            
            // Match by employee name
            const entryEmployee = String(e.employee || '').toLowerCase().trim();
            if (entryEmployee === userName) return true;
            if (entryEmployee.includes(userName) || userName.includes(entryEmployee)) return true;
            
            return false;
          })
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        return userEntries.map((e) => {
          const clockIn = e.clockInAt ? String(e.clockInAt) : e.clockIn ? String(e.clockIn) : null;
          const clockOut = e.clockOutAt ? String(e.clockOutAt) : e.clockOut ? String(e.clockOut) : null;
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
        return [];
      }
    },
    enabled: !!user,
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
  mutationFn: async (
    action: 'clock_in' | 'clock_out',
  ) => {
    try {
      const employeeName =
        user?.fullName ||
        user?.username ||
        user?.name ||
        'employee';

      // CLOCK IN
      if (action === 'clock_in') {
        console.log('CLOCK IN START');

        const response = await apiRequest(
          '/time-entries/clock-in',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              employee: employeeName,
              location: '',
            }),
          },
        );

        console.log(
          'CLOCK IN RESPONSE',
          response,
        );

        return response?.data?.item;
      }

      // GET OPEN ENTRY
      const listRes = await apiRequest<{
        items: any[];
      }>(
        `/time-entries?employee=${encodeURIComponent(
          employeeName,
        )}`,
      );

      const items = listRes?.data?.items || [];

      const openEntry = items.find((e) => {
        const hasClockIn =
          e.clockInAt || e.clockIn;

        const hasClockOut =
          e.clockOutAt || e.clockOut;

        return hasClockIn && !hasClockOut;
      });

      if (!openEntry) {
        throw new Error(
          'No active entry found',
        );
      }

      const entryId =
        openEntry.id || openEntry._id;

      console.log(
        'CLOCK OUT ENTRY',
        entryId,
      );

      // CLOCK OUT
      const response = await apiRequest(
        `/time-entries/${entryId}/clock-out`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      console.log(
        'CLOCK OUT RESPONSE',
        response,
      );

      return response?.data?.item;
    } catch (err: any) {
      console.log(
        'CLOCK MUTATION ERROR',
        err?.response?.data || err,
      );

      throw err;
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

    queryClient.invalidateQueries({
      queryKey: ['timeEntries'],
    });

    queryClient.invalidateQueries({
      queryKey: ['dashboard'],
    });
  },

  onError: (err: any) => {
    console.log(
      'FINAL ERROR',
      err?.response?.data || err,
    );

    Alert.alert(
      'Error',
      err?.response?.data?.message ||
        'Failed to record time',
    );
  },
});

 const handleClockAction = useCallback(() => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

  Animated.sequence([
    Animated.timing(buttonScale, {
      toValue: 0.92,
      duration: 100,
      useNativeDriver: true,
    }),
    Animated.timing(buttonScale, {
      toValue: 1,
      duration: 100,
      useNativeDriver: true,
    }),
  ]).start();

  // CLOCK OUT → OPEN EOD MODAL
  if (isClockedIn) {
    setShowEODModal(true);
    return;
  }

  // CLOCK IN
  Alert.alert('Clock In', 'Confirm clock in?', [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Confirm',
      onPress: () => {
        clockMutation.mutate('clock_in');
      },
    },
  ]);
}, [isClockedIn, buttonScale, clockMutation]);


const handleSubmitAndClockOut = async () => {
  if (!eodData.tasksCompleted.trim()) {
    setValidationError('Tasks completed is required');
    return;
  }

  if (eodData.tasksCompleted.trim().length < 10) {
    setValidationError('Please enter minimum 10 characters');
    return;
  }

  setValidationError('');

  try {
    await clockMutation.mutateAsync('clock_out');

    Alert.alert(
      'Success',
      'EOD submitted and clocked out successfully'
    );

    setShowEODModal(false);

    setEodData({
      tasksCompleted: '',
      issuesBlockers: '',
      notes: '',
    });

    setTranscription('');
  } catch (e) {
    Alert.alert('Error', 'Failed to clock out');
  }
};

const toggleRecording = () => {
  if (isRecording) {
    setIsRecording(false);
    return;
  }

  setIsRecording(true);

  // DEMO VOICE TEXT
  setTimeout(() => {
    const text =
      'Completed attendance module and fixed API integration';

    setTranscription(text);

    setEodData((prev) => ({
      ...prev,
      tasksCompleted: text,
    }));

    setIsRecording(false);
  }, 3000);
};


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

  // Calculate today's hours from entries
  const todayHours = useMemo(() => {
    if (isClockedIn && clockInTime) {
      const diff = Date.now() - new Date(clockInTime).getTime();
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      return { hours, minutes, total: hours + minutes / 60 };
    }
    if (todayEntry?.totalHours) {
      const hours = Math.floor(todayEntry.totalHours);
      const minutes = Math.round((todayEntry.totalHours - hours) * 60);
      return { hours, minutes, total: todayEntry.totalHours };
    }
    return { hours: 0, minutes: 0, total: 0 };
  }, [isClockedIn, clockInTime, todayEntry]);

  // Calculate weekly hours (last 7 days)
  const weekHours = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekEntries = entries?.filter((e) => {
      const entryDate = new Date(e.date);
      return entryDate >= weekAgo && entryDate <= now;
    }) || [];
    return weekEntries.reduce((sum, e) => sum + (e.totalHours ?? 0), 0);
  }, [entries]);

  const weeklyTotal = weekHours;
  const elapsed = getElapsedTime();

  return (
    <View style={[styles.container, { paddingTop: /*insets.top*/0 }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Cards */}
        <View style={styles.summaryCardsContainer}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryCardLabel}>Today's Hours</Text>
            <Text style={styles.summaryCardValue}>
              {todayHours.hours}h {todayHours.minutes}m
            </Text>
            <Text style={styles.summaryCardSubtext}>
              {todayHours.total.toFixed(1)} hours total
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryCardLabel}>This Week</Text>
            <Text style={styles.summaryCardValue}>
              {Math.floor(weekHours)}h {Math.round((weekHours % 1) * 60)}m
            </Text>
            <Text style={styles.summaryCardSubtext}>
              {weekHours.toFixed(1)} hours total
            </Text>
          </View>
        </View>

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

        <Modal
  visible={showEODModal}
  animationType="slide"
  transparent
>
  <View style={styles.modalOverlay}>
    <View style={styles.modalContainer}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.modalHeader}>
          <ClipboardList
            color={Colors.primary}
            size={22}
          />

          <Text style={styles.modalTitle}>
            End Of Day Report
          </Text>
        </View>

        {/* INPUT TYPE */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              inputType === 'text' &&
                styles.toggleActive,
            ]}
            onPress={() => setInputType('text')}
          >
            <Text
              style={[
                styles.toggleText,
                inputType === 'text' &&
                  styles.toggleTextActive,
              ]}
            >
              Text
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.toggleButton,
              inputType === 'voice' &&
                styles.toggleActive,
            ]}
            onPress={() => setInputType('voice')}
          >
            <Text
              style={[
                styles.toggleText,
                inputType === 'voice' &&
                  styles.toggleTextActive,
              ]}
            >
              Voice
            </Text>
          </TouchableOpacity>
        </View>

        {/* TASKS */}
        <Text style={styles.modalLabel}>
          Tasks Completed *
        </Text>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TextInput
            multiline
            placeholder="Describe completed tasks..."
            value={eodData.tasksCompleted}
            onChangeText={(text) =>
              setEodData({
                ...eodData,
                tasksCompleted: text,
              })
            }
            style={[
              styles.modalInput,
              { flex: 1 },
            ]}
          />

          {inputType === 'voice' && (
            <TouchableOpacity
              style={[
                styles.voiceButton,
                isRecording && {
                  backgroundColor: '#EF4444',
                },
              ]}
              onPress={toggleRecording}
            >
              {isRecording ? (
                <MicOff color="#fff" size={20} />
              ) : (
                <Mic color="#fff" size={20} />
              )}
            </TouchableOpacity>
          )}
        </View>

        {validationError ? (
          <View style={styles.errorBox}>
            <AlertCircle
              color="#DC2626"
              size={16}
            />
            <Text style={styles.errorText}>
              {validationError}
            </Text>
          </View>
        ) : null}

        {/* ISSUES */}
        <Text style={styles.modalLabel}>
          Issues / Blockers
        </Text>

        <TextInput
          multiline
          placeholder="Any blockers..."
          value={eodData.issuesBlockers}
          onChangeText={(text) =>
            setEodData({
              ...eodData,
              issuesBlockers: text,
            })
          }
          style={styles.modalInput}
        />

        {/* NOTES */}
        <Text style={styles.modalLabel}>
          Notes
        </Text>

        <TextInput
          multiline
          placeholder="Additional notes..."
          value={eodData.notes}
          onChangeText={(text) =>
            setEodData({
              ...eodData,
              notes: text,
            })
          }
          style={styles.modalInput}
        />

        {/* BUTTONS */}
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmitAndClockOut}
        >
          <Text style={styles.submitButtonText}>
            Submit & Clock Out
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => {
            setShowEODModal(false);
            setValidationError('');
          }}
        >
          <Text style={styles.cancelButtonText}>
            Cancel
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  </View>
</Modal>

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
  summaryCardsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryCardLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
    marginBottom: 8,
  },
  summaryCardValue: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  summaryCardSubtext: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontWeight: '500' as const,
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
  modalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.45)',
  justifyContent: 'flex-end',
},

modalContainer: {
  backgroundColor: Colors.surface,
  borderTopLeftRadius: 24,
  borderTopRightRadius: 24,
  padding: 20,
  maxHeight: '90%',
},

modalHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 10,
  marginBottom: 20,
},

modalTitle: {
  fontSize: 22,
  fontWeight: '700',
  color: Colors.text,
},

toggleContainer: {
  flexDirection: 'row',
  backgroundColor: Colors.surfaceAlt,
  borderRadius: 12,
  padding: 4,
  marginBottom: 20,
},

toggleButton: {
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
  paddingVertical: 10,
  borderRadius: 10,
},

toggleActive: {
  backgroundColor: Colors.primary,
},

toggleText: {
  color: Colors.textSecondary,
  fontWeight: '600',
},

toggleTextActive: {
  color: '#fff',
},

modalLabel: {
  fontSize: 14,
  fontWeight: '600',
  color: Colors.text,
  marginBottom: 8,
  marginTop: 12,
},

modalInput: {
  minHeight: 90,
  backgroundColor: Colors.surfaceAlt,
  borderRadius: 14,
  padding: 14,
  color: Colors.text,
  textAlignVertical: 'top',
},

voiceButton: {
  width: 52,
  height: 52,
  borderRadius: 12,
  backgroundColor: Colors.primary,
  alignItems: 'center',
  justifyContent: 'center',
},

submitButton: {
  height: 54,
  borderRadius: 14,
  backgroundColor: Colors.primary,
  alignItems: 'center',
  justifyContent: 'center',
  marginTop: 24,
},

submitButtonText: {
  color: '#fff',
  fontSize: 15,
  fontWeight: '700',
},

cancelButton: {
  height: 54,
  borderRadius: 14,
  borderWidth: 1,
  borderColor: Colors.border,
  alignItems: 'center',
  justifyContent: 'center',
  marginTop: 12,
},

cancelButtonText: {
  color: Colors.text,
  fontWeight: '600',
},

errorBox: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
  backgroundColor: '#FEF2F2',
  borderWidth: 1,
  borderColor: '#FECACA',
  padding: 12,
  borderRadius: 12,
  marginTop: 12,
},

errorText: {
  color: '#DC2626',
  fontSize: 13,
  flex: 1,
},
});
