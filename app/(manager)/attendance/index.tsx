import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert,
  Dimensions,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/contexts/ThemeContext';
import { 
  Clock, 
  LogIn, 
  LogOut, 
  Timer, 
  Calendar, 
  History, 
  ClipboardList, 
  AlertCircle, 
  X 
} from 'lucide-react-native';
import { apiRequest } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { s } from '@/util/styles';

interface TimeEntry {
  id: string;
  date: string;
  clockIn: string;
  clockOut: string;
  clockInAt: string | null;
  clockOutAt: string | null;
  totalHours: number;
  status: string;
  scrum?: string | null;
  employee?: string;
}

const { width } = Dimensions.get('window');

function buildColors(uiTheme: any, isDark: boolean) {
  // Fix 1: Fall back to core theme primary or accent color if no explicit gold is passed
  const themeAccentHighlight = uiTheme.customColors?.accent || uiTheme.customColors?.primary || (isDark ? "#3b82f6" : "#133767");

  return {
    background:         uiTheme.panelColors?.dashboardBackground     || (isDark ? "#09090b" : "#F8FAFC"),
    cardBg:             uiTheme.panelColors?.dashboardCardBackground || (isDark ? "#18181b" : "#FFFFFF"),
    text:               uiTheme.panelColors?.dashboardTextColor      || (isDark ? "#F4F4F5" : "#0F172A"),
    textSecondary:      isDark ? "#A1A1AA" : "#475569",
    textMuted:          isDark ? "#71717A" : "#64748B",
    border:             isDark ? "#27272A" : "#E2E8F0",
    borderLight:        isDark ? "rgba(255,255,255,0.05)" : "#F1F5F9",
    primary:            uiTheme.customColors?.primary || (isDark ? "#3b82f6" : "#133767"),
    primaryText:        "#FFFFFF",
    golden:             uiTheme.customColors?.golden || themeAccentHighlight, // Maps dynamically to Neon Cyan/Metallic tones now!
    successText:        isDark ? "#34D399" : "#2E7D32",
    successBg:          isDark ? "rgba(46, 125, 50, 0.15)" : "#E8F5E9",
    infoText:           isDark ? "#60A5FA" : "#1565C0",
    infoBg:             isDark ? "rgba(21, 101, 192, 0.15)" : "#E3F2FD",
    mutedBg:            isDark ? "#27272A" : "#F5F5F5",
    mutedText:          isDark ? "#A1A1AA" : "#616161",
    dangerText:         isDark ? "#F87171" : "#C62828",
    dangerBg:           isDark ? "rgba(198, 40, 40, 0.15)" : "#FEF2F2",
    dangerBorder:       isDark ? "rgba(198, 40, 40, 0.3)" : "#FEE2E2",
    clockInActionBg:    "#16A34A",
    clockOutActionBg:   "#2563EB",
    btnDisabledBg:      isDark ? "#27272A" : "#CBD5E1",
    durationText:       isDark ? "#C084FC" : "#6A1B9A",
    inputSurface:       isDark ? "#09090b" : "#F8FAFC",
    overlayBg:          "rgba(15, 23, 42, 0.6)",
  };
}

function createStyles(colors: ReturnType<typeof buildColors>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    centerFallback: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    loadingText: {
      marginTop: 10,
      fontSize: 14,
      color: colors.text,
    },
    clockHeaderDeck: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 56,
      paddingBottom: 16,
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderColor: colors.border,
    },
    appTitle: {
      fontSize: 24,
      fontWeight: '800',
      color: colors.text,
    },
    rightClockWrap: {
      alignItems: 'flex-end',
    },
    liveTimeText: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.golden,
    },
    liveDateText: {
      fontSize: 12,
      color: colors.text,
      marginTop: 2,
    },
    scrollArea: {
      padding: 16,
      paddingBottom: 40,
    },
    statusCard: {
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderLeftWidth: 4,
      backgroundColor: colors.cardBg,
      borderColor: colors.text,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 2,
    },
    statusReady: { borderColor: colors.primary },
    statusActive: { borderColor: colors.clockInActionBg },
    statusComplete: { borderColor: colors.clockOutActionBg },
    statusRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    statusLabelColumn: {
      flex: 1,
    },
    statusSubLabel: {
      fontSize: 12,
      color: colors.text,
    },
    statusMainLabel: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.golden,
      marginTop: 2,
    },
    welcomeText: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 1,
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.05)',
    },
    statusBadgeText: {
      fontSize: 12,
      fontWeight: '600',
    },
    statsRowGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginBottom: 16,
    },
    statMiniCard: {
      backgroundColor: colors.cardBg,
      borderRadius: 12,
      padding: 14,
      flex: 1,
      minWidth: (width - 44) / 2,
      borderWidth: 1,
      borderColor: colors.border,
    },
    fullWidthMiniCard: {
      minWidth: '100%',
    },
    statIcon: {
      marginBottom: 6,
    },
    statLabel: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    statValue: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.golden,
      marginTop: 2,
    },
    actionBlockCard: {
      backgroundColor: colors.cardBg,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    blockTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    blockDescription: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
      marginBottom: 16,
    },
    actionSplitButtons: {
      flexDirection: 'row',
      gap: 12,
    },
    baseBtn: {
      flex: 1,
      height: 44,
      borderRadius: 8,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
    btnIn: { backgroundColor: colors.clockInActionBg },
    btnOut: { backgroundColor: colors.clockOutActionBg },
    btnDisabled: { backgroundColor: colors.btnDisabledBg },
    btnText: {
      color: '#ffffff',
      fontSize: 14,
      fontWeight: '600',
    },
    inlineIconMargin: {
      marginRight: 6,
    },
    footerCompletionNotice: {
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 12,
    },
    historySectionCard: {
      backgroundColor: colors.cardBg,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    historyHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    historyIconSpacing: {
      marginRight: 8,
    },
    historyTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.golden,
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 32,
    },
    emptyIconSpacing: {
      marginBottom: 8,
    },
    emptyTableText: {
      color: colors.textSecondary,
      fontSize: 13,
    },
    tableBodyWrapper: {
      width: '100%',
    },
    tableRow: {
      flexDirection: 'row',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderColor: colors.borderLight,
      alignItems: 'center',
    },
    tableHeaderRow: {
      borderBottomWidth: 2,
      borderColor: colors.border,
      paddingVertical: 8,
    },
    tableCell: {
      flex: 1,
      fontSize: 13,
      color: colors.textSecondary,
    },
    cellHeader: {
      fontWeight: '600',
      color: colors.golden,
      fontSize: 12,
    },
    cellDataText: {
      color: colors.text,
    },
    boldHrsText: {
      fontWeight: '600',
      color: colors.text,
    },
    modalViewportMask: {
      flex: 1,
      backgroundColor: colors.overlayBg,
      justifyContent: 'flex-end',
    },
    modalSurfaceCard: {
      backgroundColor: colors.cardBg,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      maxHeight: '85%',
      paddingBottom: 32,
    },
    modalHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderColor: colors.border,
    },
    modalHeaderTitleFlex: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    modalTitleText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    modalFormScroll: {
      padding: 16,
    },
    modalDisclaimer: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
      marginBottom: 16,
    },
    inputWrapperField: {
      marginBottom: 14,
    },
    fieldLabelText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 6,
    },
    optionalText: {
      color: colors.textMuted,
      fontWeight: '400',
    },
    textInputBox: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: colors.text,
      backgroundColor: colors.inputSurface,
      textAlignVertical: 'top',
      minHeight: 64,
    },
    inputHintText: {
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 4,
    },
    validationErrorBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: colors.dangerBg,
      borderWidth: 1,
      borderColor: colors.dangerBorder,
      padding: 10,
      borderRadius: 8,
      marginTop: 4,
    },
    errorIconSpacing: {
      marginRight: 8,
      marginTop: 2,
    },
    errorTextLabel: {
      color: colors.dangerText,
      fontSize: 13,
      flex: 1,
      lineHeight: 18,
    },
    modalFooterPanel: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      gap: 12,
    },
    footerBtn: {
      flex: 1,
      height: 44,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    footerBtnCancel: {
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    footerBtnCancelText: {
      color: colors.textSecondary,
      fontWeight: '600',
    },
    footerBtnSubmit: {
      backgroundColor: colors.primary,
    },
    footerBtnSubmitText: {
      color: colors.primaryText,
      fontWeight: '700',
    },
  });
}

export default function AttendanceScreen() {
  const { user } = useAuth();
  const { uiTheme } = useTheme();

  // Fix 2: Broaden dark mode check to handle modern variation IDs like 'neon-tech' and 'energy-mode'
  const isDark = useMemo(() => {
    const themeStr = String(uiTheme?.theme || '').toLowerCase();
    if (themeStr.includes("white") || themeStr.includes("light")) {
      return false;
    }
    return true; // Modern engine presets default to custom dark system layouts
  }, [uiTheme?.theme]);

  const colors = useMemo(() => buildColors(uiTheme, isDark), [uiTheme, isDark]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const queryClient = useQueryClient();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showScrumModal, setShowScrumModal] = useState(false);
  
  const [eodData, setEodData] = useState({
    tasksCompleted: '',
    issuesBlockers: '',
    notes: '',
  });
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const managerName = useMemo(() => {
    try {
      return (user?.fullName || user?.username || "Manager").trim();
    } catch {
      return "Manager";
    }
  }, [user]);

  const { 
    data: todayEntry, 
    isLoading: isTodayLoading, 
    refetch: refetchToday,
    isRefetching: isRefetchingToday 
  } = useQuery({
    queryKey: ['attendance-today', managerName],
    queryFn: async () => {
      const todayStr = new Date().toISOString().split('T')[0];
      const res = await apiRequest<{ items: TimeEntry[] }>(
        `/time-entries?employee=${encodeURIComponent(managerName)}&limit=50`
      );
      
      const found = res.data?.items?.find(
        (e) => new Date(e.date).toISOString().split('T')[0] === todayStr
      );
      return found || null;
    },
  });

  const { 
    data: historyEntries, 
    isLoading: isHistoryLoading, 
    refetch: refetchHistory 
  } = useQuery({
    queryKey: ['attendance-history', managerName],
    queryFn: async () => {
      const res = await apiRequest<{ items: TimeEntry[] }>(
        `/time-entries?employee=${encodeURIComponent(managerName)}&limit=30`
      );
      return res.data?.items || [];
    },
  });

  const clockInMutation = useMutation({
    mutationFn: async () => {
      const now = new Date();
      return await apiRequest<{ item: TimeEntry }>('/time-entries', {
        method: 'POST',
        body: JSON.stringify({
          employee: managerName,
          date: now.toISOString().split('T')[0],
          clockIn: now.toTimeString().slice(0, 5),
          clockInAt: now.toISOString(),
          status: 'incomplete',
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-today'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-history'] });
      Alert.alert('Success', 'Clocked in successfully');
    },
    onError: (err: any) => {
      Alert.alert('Clock In Failed', err.message || 'An unexpected error occurred');
    },
  });

  const clockOutMutation = useMutation({
    mutationFn: async () => {
      const entryId = todayEntry?.id;
      if (!entryId) throw new Error('No active time entry found for today');

      return await apiRequest<{ item: TimeEntry }>(`/time-entries/${entryId}/clock-out`, {
        method: 'POST',
        body: JSON.stringify({
          eodReport: {
            tasksCompleted: eodData.tasksCompleted.trim(),
            issuesBlockers: eodData.issuesBlockers.trim(),
            notes: eodData.notes.trim(),
          },
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-today'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-history'] });
      setShowScrumModal(false);
      setEodData({ tasksCompleted: '', issuesBlockers: '', notes: '' });
      Alert.alert('Shift Complete', 'Clocked out successfully');
    },
    onError: (err: any) => {
      Alert.alert('Clock Out Failed', err.message || 'An unexpected error occurred');
    },
  });

  const isClockedIn = !!(todayEntry?.clockInAt && !todayEntry?.clockOutAt);
  const isClockedOut = !!(todayEntry?.clockInAt && todayEntry?.clockOutAt);

  const durationText = useMemo(() => {
    if (!todayEntry?.clockInAt) return '--:--:--';
    const start = new Date(todayEntry.clockInAt);
    const end = todayEntry.clockOutAt ? new Date(todayEntry.clockOutAt) : currentTime;
    const diff = Math.floor((end.getTime() - start.getTime()) / 1000);
    
    if (diff < 0) return '00:00:00';
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;
    
    return [hours, minutes, seconds].map(v => String(v).padStart(2, '0')).join(':');
  }, [todayEntry, currentTime]);

  const handleScrumSubmit = () => {
    if (!eodData.tasksCompleted.trim()) {
      setValidationError('Please enter tasks completed before checking out');
      return;
    }
    if (eodData.tasksCompleted.trim().length < 10) {
      setValidationError('Please provide more details about tasks completed (at least 10 characters)');
      return;
    }
    setValidationError('');
    clockOutMutation.mutate();
  };

  const onGlobalRefresh = useCallback(async () => {
    await Promise.all([refetchToday(), refetchHistory()]);
  }, [refetchToday, refetchHistory]);

  const formatLocalClock = (timeStr?: string | null, isoAt?: string | null): string => {
    if (isoAt) {
      const d = new Date(isoAt);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
    }
    return String(timeStr || '').trim() || '--:--';
  };

  const formatHistoryDate = (value: string | null | undefined): string => {
    const raw = String(value || '').trim();
    if (!raw) return '—';
    const m = /^\d{4}-\d{2}-\d{2}/.exec(raw);
    const dateStr = m ? `${m[0]}T00:00:00` : raw;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return raw;
    return d.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (isTodayLoading) {
    return (
      <View style={s(styles.centerFallback)} key={uiTheme?.theme || 'loading'}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={s(styles.loadingText)}>Loading system layout...</Text>
      </View>
    );
  }

  return (
    <View style={s(styles.container)} key={uiTheme?.theme || 'default'}>
      <View style={s(styles.clockHeaderDeck)}>
        <Text style={s(styles.appTitle)}>Attendance</Text>
        <View style={s(styles.rightClockWrap)}>
          <Text style={s(styles.liveTimeText)}>
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </Text>
          <Text style={s(styles.liveDateText)}>
            {currentTime.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s(styles.scrollArea)}
        refreshControl={
          <RefreshControl refreshing={isRefetchingToday} onRefresh={onGlobalRefresh} tintColor={colors.primary} />
        }
      >
        <View style={s([
          styles.statusCard, 
          isClockedIn ? styles.statusActive : isClockedOut ? styles.statusComplete : styles.statusReady
        ])}>
          <View style={s(styles.statusRow)}>
            <View style={s(styles.statusLabelColumn)}>
              <Text style={s(styles.statusSubLabel)}>Current Status</Text>
              <Text style={s(styles.statusMainLabel)}>
                {isClockedIn ? 'Clocked In' : isClockedOut ? 'Shift Complete' : 'Not Clocked In'}
              </Text>
              {!!managerName && (
                <Text style={s(styles.welcomeText)}>Welcome, {managerName}</Text>
              )}
            </View>
            <View style={s([
              styles.statusBadge,
              { backgroundColor: isClockedIn ? colors.successBg : isClockedOut ? colors.infoBg : colors.mutedBg }
            ])}>
              <Text style={s([
                styles.statusBadgeText,
                { color: isClockedIn ? colors.successText : isClockedOut ? colors.infoText : colors.mutedText }
              ])}>
                {isClockedIn ? 'Active' : isClockedOut ? 'Complete' : 'Ready'}
              </Text>
            </View>
          </View>
        </View>

        <View style={s(styles.statsRowGrid)}>
          <View style={s(styles.statMiniCard)}>
            <LogIn size={20} color={colors.successText} style={s(styles.statIcon)} />
            <Text style={s(styles.statLabel)}>Clock In</Text>
            <Text style={s(styles.statValue)}>
              {formatLocalClock(todayEntry?.clockIn, todayEntry?.clockInAt)}
            </Text>
          </View>

          <View style={s(styles.statMiniCard)}>
            <LogOut size={20} color={colors.dangerText} style={s(styles.statIcon)} />
            <Text style={s(styles.statLabel)}>Clock Out</Text>
            <Text style={s(styles.statValue)}>
              {formatLocalClock(todayEntry?.clockOut, todayEntry?.clockOutAt)}
            </Text>
          </View>

          <View style={s([styles.statMiniCard, styles.fullWidthMiniCard])}>
            <Timer size={20} color={colors.durationText} style={s(styles.statIcon)} />
            <Text style={s(styles.statLabel)}>Duration</Text>
            <Text style={s(styles.statValue)}>
              {isClockedIn || isClockedOut ? durationText : '--:--:--'}
            </Text>
          </View>
        </View>

        <View style={s(styles.actionBlockCard)}>
          <Text style={s(styles.blockTitle)}>Actions</Text>
          <Text style={s(styles.blockDescription)}>Record your attendance for today</Text>
          
          <View style={s(styles.actionSplitButtons)}>
            <TouchableOpacity
              activeOpacity={0.8}
              disabled={isClockedIn || isClockedOut || clockInMutation.isPending}
              style={s([styles.baseBtn, styles.btnIn, (isClockedIn || isClockedOut) && styles.btnDisabled])}
              onPress={() => clockInMutation.mutate()}
            >
              {clockInMutation.isPending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <LogIn size={18} color="#ffffff" style={s(styles.inlineIconMargin)} />
                  <Text style={s(styles.btnText)}>Clock In</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              disabled={!isClockedIn || clockOutMutation.isPending}
              style={s([styles.baseBtn, styles.btnOut, !isClockedIn && styles.btnDisabled])}
              onPress={() => setShowScrumModal(true)}
            >
              <LogOut size={18} color="#ffffff" style={s(styles.inlineIconMargin)} />
              <Text style={s(styles.btnText)}>Clock Out</Text>
            </TouchableOpacity>
          </View>
          
          {isClockedOut && (
            <Text style={s(styles.footerCompletionNotice)}>
              You have completed your shift for today. Total hours: {todayEntry?.totalHours?.toFixed(2) || '--'}
            </Text>
          )}
        </View>

        <View style={s(styles.historySectionCard)}>
          <View style={s(styles.historyHeader)}>
            <History size={18} color={colors.golden} style={s(styles.historyIconSpacing)} />
            <Text style={s(styles.historyTitle)}>Attendance History</Text>
          </View>

          {isHistoryLoading ? (
            <ActivityIndicator size="small" color={colors.primary} style={s({ marginVertical: 20 })} />
          ) : !historyEntries || historyEntries.length === 0 ? (
            <View style={s(styles.emptyContainer)}>
              <Calendar size={36} color={colors.border} style={s(styles.emptyIconSpacing)} />
              <Text style={s(styles.emptyTableText)}>No attendance records yet</Text>
            </View>
          ) : (
            <View style={s(styles.tableBodyWrapper)}>
              <View style={s([styles.tableRow, styles.tableHeaderRow])}>
                <Text style={s([styles.tableCell, styles.cellHeader, { flex: 1.4 }])}>Date</Text>
                <Text style={s([styles.tableCell, styles.cellHeader])}>Clock In</Text>
                <Text style={s([styles.tableCell, styles.cellHeader])}>Clock Out</Text>
                <Text style={s([styles.tableCell, styles.cellHeader, { flex: 0.6, textAlign: 'right' }])}>Hours</Text>
              </View>

              {historyEntries.map((item, idx) => (
                <View key={item.id || String(idx)} style={s(styles.tableRow)}>
                  <Text style={s([styles.tableCell, styles.cellDataText, { flex: 1.4 }])}>
                    {formatHistoryDate(item.date)}
                  </Text>
                  <Text style={s([styles.tableCell, styles.cellDataText])}>
                    {formatLocalClock(item.clockIn, item.clockInAt)}
                  </Text>
                  <Text style={s([styles.tableCell, styles.cellDataText])}>
                    {formatLocalClock(item.clockOut, item.clockOutAt)}
                  </Text>
                  <Text style={s([styles.tableCell, styles.boldHrsText, { flex: 0.6, textAlign: 'right' }])}>
                    {item.totalHours ? item.totalHours.toFixed(2) : '--'}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={showScrumModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowScrumModal(false)}
      >
        <View style={s(styles.modalViewportMask)}>
          <View style={s(styles.modalSurfaceCard)}>
            <View style={s(styles.modalHeaderRow)}>
              <View style={s(styles.modalHeaderTitleFlex)}>
                <ClipboardList size={20} color={colors.primary} style={s(styles.historyIconSpacing)} />
                <Text style={s(styles.modalTitleText)}>End-of-Day Report</Text>
              </View>
              <TouchableOpacity onPress={() => setShowScrumModal(false)}>
                <X size={20} color={colors.mutedText} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={s(styles.modalFormScroll)} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={s(styles.modalDisclaimer)}>
                Please complete your EOD report before checking out. Tasks completed is mandatory.
              </Text>

              <View style={s(styles.inputWrapperField)}>
                <Text style={s(styles.fieldLabelText)}>
                  Tasks Completed <Text style={s({ color: colors.dangerText })}>*</Text>
                </Text>
                <TextInput
                  multiline
                  numberOfLines={4}
                  placeholder="Describe the tasks you completed today..."
                  placeholderTextColor={colors.textMuted}
                  style={s(styles.textInputBox)}
                  value={eodData.tasksCompleted}
                  onChangeText={(txt) => setEodData({ ...eodData, tasksCompleted: txt })}
                />
                <Text style={s(styles.inputHintText)}>Minimum 10 characters required</Text>
              </View>

              <View style={s(styles.inputWrapperField)}>
                <Text style={s(styles.fieldLabelText)}>Issues / Blockers <Text style={s(styles.optionalText)}>(Optional)</Text></Text>
                <TextInput
                  multiline
                  numberOfLines={3}
                  placeholder="Any issues or blockers you faced today..."
                  placeholderTextColor={colors.textMuted}
                  style={s(styles.textInputBox)}
                  value={eodData.issuesBlockers}
                  onChangeText={(txt) => setEodData({ ...eodData, issuesBlockers: txt })}
                />
              </View>

              <View style={s(styles.inputWrapperField)}>
                <Text style={s(styles.fieldLabelText)}>Notes <Text style={s(styles.optionalText)}>(Optional)</Text></Text>
                <TextInput
                  multiline
                  numberOfLines={2}
                  placeholder="Any additional notes or comments..."
                  placeholderTextColor={colors.textMuted}
                  style={s(styles.textInputBox)}
                  value={eodData.notes}
                  onChangeText={(txt) => setEodData({ ...eodData, notes: txt })}
                />
              </View>

              {!!validationError && (
                <View style={s(styles.validationErrorBox)}>
                  <AlertCircle size={16} color={colors.dangerText} style={s(styles.errorIconSpacing)} />
                  <Text style={s(styles.errorTextLabel)}>{validationError}</Text>
                </View>
              )}
            </ScrollView>

            <View style={s(styles.modalFooterPanel)}>
              <TouchableOpacity
                style={s([styles.footerBtn, styles.footerBtnCancel])}
                onPress={() => {
                  setShowScrumModal(false);
                  setValidationError('');
                }}
              >
                <Text style={s(styles.footerBtnCancelText)}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                disabled={clockOutMutation.isPending}
                style={s([styles.footerBtn, styles.footerBtnSubmit])}
                onPress={handleScrumSubmit}
              >
                {clockOutMutation.isPending ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={s(styles.footerBtnSubmitText)}>Submit & Clock Out</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}