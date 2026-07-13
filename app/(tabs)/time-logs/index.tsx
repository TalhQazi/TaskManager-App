import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Dimensions,
} from "react-native";

// Native Vector Icons
import { Clock, Calendar, ArrowUpRight } from "lucide-react-native";

// Shared Internal API Layers
import { getEmployeeTimeLogs, apiFetch } from "@/lib/admin/apiClient";

// --- Custom Theme System Palette ---
const THEME = {
  bgCanvas: "#0B0F19",
  bgSurface: "#161D30",
  bgCard: "#1F2A45",
  border: "#2A3958",
  textPrimary: "#F3F4F6",
  textSecondary: "#9CA3AF",
  textMuted: "#6B7280",
  
  // Variant Indicators
  blue: "#3B82F6",
  green: "#10B981",
  purple: "#8B5CF6",
  orange: "#F59E0B",
  red: "#EF4444",
};

// --- Embedded Stat Card Component ---
interface StatCardProps {
  title: string;
  value: string;
  icon: React.ComponentType<any>;
  variant: "blue" | "green" | "purple" | "orange";
}

function NativeStatCard({ title, value, icon: Icon, variant }: StatCardProps) {
  const colorMap = {
    blue: THEME.blue,
    green: THEME.green,
    purple: THEME.purple,
    orange: THEME.orange,
  };
  const activeColor = colorMap[variant];

  return (
    <View style={styles.statCardContainer}>
      <View style={styles.statCardHeaderRow}>
        <Text style={styles.statCardTitleText}>{title}</Text>
        <View style={[styles.statIconBadge, { backgroundColor: `${activeColor}15` }]}>
          <Icon size={16} color={activeColor} />
        </View>
      </View>
      <Text style={[styles.statCardValueText, { color: activeColor }]}>{value}</Text>
    </View>
  );
}

// --- Main Target Component ---
export default function TimeLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ today: 0, thisWeek: 0, thisMonth: 0, allTime: 0 });

  useEffect(() => {
    Promise.all([
      getEmployeeTimeLogs(),
      apiFetch<{ item: typeof summary }>("/api/employees/me/time-logs/summary")
    ])
      .then(([logsRes, summaryRes]) => {
        // Safe access normalization for incoming payload arrays
        const logItems = (logsRes && (logsRes.items || logsRes.data || logsRes)) || [];
        setLogs(Array.isArray(logItems) ? logItems : []);
        
        const summaryItem = summaryRes?.item || (summaryRes as any)?.data || summaryRes;
        setSummary(summaryItem || { today: 0, thisWeek: 0, thisMonth: 0, allTime: 0 });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // --- Strict Date Normalization Tools ---
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingFallbackScreen}>
        <ActivityIndicator size="large" color={THEME.blue} />
        <Text style={styles.loadingLabelText}>Synchronizing workflow logs...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.mainContainer}>
      <FlatList
        data={logs}
        keyExtractor={(item, index) => item.id || String(index)}
        contentContainerStyle={styles.scrollContainerPadding}
        
        // --- Render Top Metric Summary Blocks ---
        ListHeaderComponent={
          <View style={{ marginBottom: 16 }}>
            {/* Header Title Information */}
            <View style={styles.headerBlock}>
              <Text style={styles.mainTitleText}>Time Logs</Text>
              <Text style={styles.subtitleText}>View your work hours and time records</Text>
            </View>

            {/* Replicated Responsive Grid Matrix */}
            <View style={styles.statsGridMatrixContainer}>
              <View style={styles.matrixGridRow}>
                <NativeStatCard title="TODAY" value={`${summary.today.toFixed(1)} hrs`} icon={Clock} variant="blue" />
                <NativeStatCard title="THIS WEEK" value={`${summary.thisWeek.toFixed(1)} hrs`} icon={ArrowUpRight} variant="green" />
              </View>
              <View style={styles.matrixGridRow}>
                <NativeStatCard title="THIS MONTH" value={`${summary.thisMonth.toFixed(1)} hrs`} icon={Calendar} variant="purple" />
                <NativeStatCard title="ALL TIME" value={`${summary.allTime.toFixed(1)} hrs`} icon={Clock} variant="orange" />
              </View>
            </View>

            <Text style={styles.recentLogsSectionLabel}>Recent Time Records</Text>
          </View>
        }

        // --- Empty Array State Handler Container ---
        ListEmptyComponent={
          <View style={styles.emptyViewCardContainer}>
            <Clock size={48} color={THEME.border} style={{ marginBottom: 12 }} />
            <Text style={styles.emptyCardMainTitle}>No time logs found</Text>
            <Text style={styles.emptyCardSubText}>Start tracking your time by clocking in</Text>
          </View>
        }

        // --- Row Data Template Layout Engine ---
        renderItem={({ item: log }) => (
          <View style={styles.timeLogCardElementRow}>
            
            {/* Card Header Section Layout Line */}
            <View style={styles.logCardHeaderLineRow}>
              <View style={styles.inlineCalendarMetaFlexGroup}>
                <Calendar size={14} color={THEME.textMuted} />
                <Text style={styles.cardHeaderDateText}>{formatDate(log.clock_in)}</Text>
              </View>
              
              {log.clock_out ? (
                <View style={[styles.statusBadgeCapsule, styles.badgeCompletedBg]}>
                  <Text style={[styles.statusBadgeLabelText, styles.badgeCompletedText]}>Completed</Text>
                </View>
              ) : (
                <View style={[styles.statusBadgeCapsule, styles.badgeActiveBg]}>
                  <Text style={[styles.statusBadgeLabelText, styles.badgeActiveText]}>Active</Text>
                </View>
              )}
            </View>

            {/* Embedded Sub Grid Parameter Grid Segment */}
            <View style={styles.clockTimesParametersRow}>
              <View style={styles.timeParameterBlockItem}>
                <Text style={styles.timeBlockKeyLabelText}>Clock In</Text>
                <View style={styles.inlineTimeIconFlexRow}>
                  <Clock size={12} color={THEME.green} />
                  <Text style={styles.timeBlockValueLabelText}>{formatTime(log.clock_in)}</Text>
                </View>
              </View>

              <View style={styles.timeParameterBlockItem}>
                <Text style={styles.timeBlockKeyLabelText}>Clock Out</Text>
                {log.clock_out ? (
                  <View style={styles.inlineTimeIconFlexRow}>
                    <Clock size={12} color={THEME.red} />
                    <Text style={styles.timeBlockValueLabelText}>{formatTime(log.clock_out)}</Text>
                  </View>
                ) : (
                  <View style={[styles.statusBadgeCapsule, styles.badgeInProgressBg, { marginTop: 2, alignSelf: "flex-start" }]}>
                    <Text style={[styles.statusBadgeLabelText, styles.badgeInProgressText, { fontSize: 10 }]}>In Progress</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Card Content Row Metric Footer Line */}
            <View style={styles.durationCardFooterRowMetricLine}>
              <Text style={styles.durationFooterKeyLabel}>Total Duration</Text>
              <Text style={styles.durationFooterValueOutput}>
                {log.total_hours?.toFixed(2) || "0.00"} hrs
              </Text>
            </View>

          </View>
        )}
      />
    </SafeAreaView>
  );
}

// --- Native Layout Style Rules Engine ---
const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: THEME.bgCanvas,
  },
  loadingFallbackScreen: {
    flex: 1,
    backgroundColor: THEME.bgCanvas,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingLabelText: {
    color: THEME.textSecondary,
    fontSize: 14,
    fontWeight: "500",
  },
  scrollContainerPadding: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  headerBlock: {
    marginBottom: 20,
    marginTop: 4,
  },
  mainTitleText: {
    fontSize: 24,
    fontWeight: "800",
    color: THEME.textPrimary,
    letterSpacing: -0.5,
  },
  subtitleText: {
    fontSize: 13,
    color: THEME.textSecondary,
    marginTop: 2,
  },
  
  // Stats Layout Matrix Grid
  statsGridMatrixContainer: {
    gap: 10,
    marginBottom: 24,
  },
  matrixGridRow: {
    flexDirection: "row",
    gap: 10,
  },
  statCardContainer: {
    flex: 1,
    backgroundColor: THEME.bgSurface,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 12,
    padding: 14,
  },
  statCardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  statCardTitleText: {
    fontSize: 10,
    fontWeight: "700",
    color: THEME.textMuted,
    letterSpacing: 0.5,
  },
  statIconBadge: {
    padding: 5,
    borderRadius: 6,
  },
  statCardValueText: {
    fontSize: 18,
    fontWeight: "800",
  },
  
  // Content List Divider Components
  recentLogsSectionLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: THEME.textSecondary,
    marginBottom: 12,
  },
  timeLogCardElementRow: {
    backgroundColor: THEME.bgSurface,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  logCardHeaderLineRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
    paddingBottom: 10,
    marginBottom: 10,
  },
  inlineCalendarMetaFlexGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cardHeaderDateText: {
    fontSize: 13,
    fontWeight: "700",
    color: THEME.textPrimary,
  },
  
  // Component Level Status Badges System
  statusBadgeCapsule: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeLabelText: {
    fontSize: 11,
    fontWeight: "700",
  },
  badgeCompletedBg: { backgroundColor: "rgba(16,185,129,0.12)" },
  badgeCompletedText: { color: THEME.green },
  badgeActiveBg: { backgroundColor: "rgba(59,130,246,0.12)" },
  badgeActiveText: { color: THEME.blue },
  badgeInProgressBg: { backgroundColor: "rgba(245,158,11,0.12)", borderWidth: 1, borderColor: "rgba(245,158,11,0.2)" },
  badgeInProgressText: { color: THEME.orange },

  // Inner Parameters Split Sub-Grid
  clockTimesParametersRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  timeParameterBlockItem: {
    flex: 1,
    backgroundColor: THEME.bgCanvas,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 8,
    padding: 8,
  },
  timeBlockKeyLabelText: {
    fontSize: 9,
    color: THEME.textMuted,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  inlineTimeIconFlexRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  timeBlockValueLabelText: {
    fontSize: 12,
    fontWeight: "600",
    color: THEME.textPrimary,
  },
  
  // Bottom Content Alignment Footers
  durationCardFooterRowMetricLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: THEME.bgCard,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  durationFooterKeyLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: THEME.textSecondary,
  },
  durationFooterValueOutput: {
    fontSize: 13,
    fontWeight: "700",
    color: THEME.textPrimary,
  },

  // Fallback Components Styling Rules
  emptyViewCardContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
  },
  emptyCardMainTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: THEME.textSecondary,
    marginBottom: 2,
  },
  emptyCardSubText: {
    fontSize: 13,
    color: THEME.textMuted,
    textAlign: "center",
  },
});