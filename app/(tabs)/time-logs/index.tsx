import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { Clock, Calendar, ArrowUpRight } from "lucide-react-native";
import { getEmployeeTimeLogs, apiFetch } from "@/lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";
import { s, wp, hp, fs } from "@/util/styles";

interface TimeLog {
  id?: string;
  clock_in: string;
  clock_out: string | null;
  total_hours: number;
}

interface TimeSummary {
  today: number;
  thisWeek: number;
  thisMonth: number;
  allTime: number;
}

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  variant: "blue" | "green" | "purple" | "orange";
  cardBg: string;
  border: string;
  mutedText: string;
  isLightTheme: boolean;
}

function NativeStatCard({
  title,
  value,
  icon: Icon,
  variant,
  cardBg,
  border,
  mutedText,
  isLightTheme,
}: StatCardProps) {
  const colorMap = {
    blue: isLightTheme ? "rgb(29, 78, 216)" : "#3B82F6",
    green: isLightTheme ? "rgb(21, 128, 61)" : "#10B981",
    purple: isLightTheme ? "rgb(109, 40, 217)" : "#8B5CF6",
    orange: isLightTheme ? "rgb(180, 83, 9)" : "#F59E0B",
  };
  const activeColor = colorMap[variant];

  return (
    <View style={s([styles.statCardContainer, { backgroundColor: cardBg, borderColor: border }])}>
      <View style={s(styles.statCardHeaderRow)}>
        <Text style={s([styles.statCardTitleText, { color: mutedText }])}>{title}</Text>
        <View style={s([styles.statIconBadge, { backgroundColor: `${activeColor}15` }])}>
          <Icon size={fs(4)} color={activeColor} />
        </View>
      </View>
      <Text style={s([styles.statCardValueText, { color: activeColor }])}>{value}</Text>
    </View>
  );
}

export default function TimeLogs() {
  const { uiTheme } = useTheme();
  const [logs, setLogs] = useState<TimeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<TimeSummary>({ today: 0, thisWeek: 0, thisMonth: 0, allTime: 0 });

  const isLightTheme = useMemo(() => {
    return uiTheme.theme?.includes("crystal") || uiTheme.panelColors?.dashboardTextColor === "#000000";
  }, [uiTheme]);

  const bg = useMemo(() => uiTheme.panelColors?.dashboardBackground || (isLightTheme ? "#ffffff" : "#09090b"), [uiTheme, isLightTheme]);
  const cardBg = useMemo(() => uiTheme.panelColors?.dashboardCardBackground || (isLightTheme ? "#f8fafc" : "#18181b"), [uiTheme, isLightTheme]);
  const tintColor = useMemo(() => uiTheme.panelColors?.dashboardTextColor || (isLightTheme ? "#0f172a" : "#ffffff"), [uiTheme, isLightTheme]);
  const mutedText = useMemo(() => (isLightTheme ? "#64748b" : "#a1a1aa"), [isLightTheme]);
  const primaryColor = useMemo(() => uiTheme.customColors?.primary || "#133767", [uiTheme]);
  const border = useMemo(() => (isLightTheme ? "rgba(0, 0, 0, 0.08)" : "rgba(255, 255, 255, 0.08)"), [isLightTheme]);

  useEffect(() => {
    Promise.all([
      getEmployeeTimeLogs(),
      apiFetch<{ item: TimeSummary }>("/api/employees/me/time-logs/summary"),
    ])
      .then(([logsRes, summaryRes]) => {
        const logItems = (logsRes && ((logsRes as any).items || (logsRes as any).data || logsRes)) || [];
        setLogs(Array.isArray(logItems) ? logItems : []);

        const summaryItem = summaryRes?.item || (summaryRes as any)?.data || summaryRes;
        setSummary(summaryItem || { today: 0, thisWeek: 0, thisMonth: 0, allTime: 0 });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

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
      <SafeAreaView style={s([styles.loadingFallbackScreen, { backgroundColor: bg }])}>
        <StatusBar barStyle={isLightTheme ? "dark-content" : "light-content"} backgroundColor={bg} />
        <ActivityIndicator size="large" color={primaryColor} />
        <Text style={s([styles.loadingLabelText, { color: mutedText }])}>Synchronizing workflow logs...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s([styles.mainContainer, { backgroundColor: bg }])}>
      <StatusBar barStyle={isLightTheme ? "dark-content" : "light-content"} backgroundColor={bg} />
      <FlatList
        data={logs}
        keyExtractor={(item, index) => item.id || String(index)}
        contentContainerStyle={s(styles.scrollContainerPadding)}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={s({ marginBottom: hp(2) })}>
            <View style={s(styles.headerBlock)}>
              <Text style={s([styles.mainTitleText, { color: tintColor }])}>Time Logs</Text>
              <Text style={s([styles.subtitleText, { color: mutedText }])}>View your work hours and time records</Text>
            </View>

            <View style={s(styles.statsGridMatrixContainer)}>
              <View style={s(styles.matrixGridRow)}>
                <NativeStatCard title="TODAY" value={`${summary.today.toFixed(1)} hrs`} icon={Clock} variant="blue" cardBg={cardBg} border={border} mutedText={mutedText} isLightTheme={isLightTheme} />
                <NativeStatCard title="THIS WEEK" value={`${summary.thisWeek.toFixed(1)} hrs`} icon={ArrowUpRight} variant="green" cardBg={cardBg} border={border} mutedText={mutedText} isLightTheme={isLightTheme} />
              </View>
              <View style={s(styles.matrixGridRow)}>
                <NativeStatCard title="THIS MONTH" value={`${summary.thisMonth.toFixed(1)} hrs`} icon={Calendar} variant="purple" cardBg={cardBg} border={border} mutedText={mutedText} isLightTheme={isLightTheme} />
                <NativeStatCard title="ALL TIME" value={`${summary.allTime.toFixed(1)} hrs`} icon={Clock} variant="orange" cardBg={cardBg} border={border} mutedText={mutedText} isLightTheme={isLightTheme} />
              </View>
            </View>

            <Text style={s([styles.recentLogsSectionLabel, { color: tintColor }])}>Recent Time Records</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={s(styles.emptyViewCardContainer)}>
            <Clock size={fs(12)} color={border} style={s({ marginBottom: hp(1.5) })} />
            <Text style={s([styles.emptyCardMainTitle, { color: tintColor }])}>No time logs found</Text>
            <Text style={s([styles.emptyCardSubText, { color: mutedText }])}>Start tracking your time by clocking in</Text>
          </View>
        }
        renderItem={({ item: log }) => (
          <View style={s([styles.timeLogCardElementRow, { backgroundColor: cardBg, borderColor: border }])}>
            <View style={s([styles.logCardHeaderLineRow, { borderBottomColor: border }])}>
              <View style={s(styles.inlineCalendarMetaFlexGroup)}>
                <Calendar size={fs(3.5)} color={mutedText} />
                <Text style={s([styles.cardHeaderDateText, { color: tintColor }])}>{formatDate(log.clock_in)}</Text>
              </View>
              
              {log.clock_out ? (
                <View style={s([styles.statusBadgeCapsule, { backgroundColor: isLightTheme ? "rgba(34, 197, 94, 0.15)" : "rgba(16,185,129,0.12)" }])}>
                  <Text style={s([styles.statusBadgeLabelText, { color: isLightTheme ? "rgb(21, 128, 61)" : "#10B981" }])}>Completed</Text>
                </View>
              ) : (
                <View style={s([styles.statusBadgeCapsule, { backgroundColor: isLightTheme ? "rgba(59, 130, 246, 0.15)" : "rgba(59,130,246,0.12)" }])}>
                  <Text style={s([styles.statusBadgeLabelText, { color: isLightTheme ? "rgb(29, 78, 216)" : "#3B82F6" }])}>Active</Text>
                </View>
              )}
            </View>

            <View style={s(styles.clockTimesParametersRow)}>
              <View style={s([styles.timeParameterBlockItem, { backgroundColor: bg, borderColor: border }])}>
                <Text style={s([styles.timeBlockKeyLabelText, { color: mutedText }])}>Clock In</Text>
                <View style={s(styles.inlineTimeIconFlexRow)}>
                  <Clock size={fs(3)} color={isLightTheme ? "rgb(21, 128, 61)" : "#10B981"} />
                  <Text style={s([styles.timeBlockValueLabelText, { color: tintColor }])}>{formatTime(log.clock_in)}</Text>
                </View>
              </View>

              <View style={s([styles.timeParameterBlockItem, { backgroundColor: bg, borderColor: border }])}>
                <Text style={s([styles.timeBlockKeyLabelText, { color: mutedText }])}>Clock Out</Text>
                {log.clock_out ? (
                  <View style={s(styles.inlineTimeIconFlexRow)}>
                    <Clock size={fs(3)} color={isLightTheme ? "rgb(185, 28, 28)" : "#EF4444"} />
                    <Text style={s([styles.timeBlockValueLabelText, { color: tintColor }])}>{formatTime(log.clock_out)}</Text>
                  </View>
                ) : (
                  <View style={s([styles.statusBadgeCapsule, { backgroundColor: isLightTheme ? "rgba(234, 179, 8, 0.15)" : "rgba(245,158,11,0.12)", borderColor: "rgba(245,158,11,0.2)", borderWidth: 1, marginTop: hp(0.25), alignSelf: "flex-start" }])}>
                    <Text style={s([styles.statusBadgeLabelText, { color: isLightTheme ? "rgb(161, 98, 7)" : "#F59E0B", fontSize: fs(2.5) }])}>In Progress</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={s([styles.durationCardFooterRowMetricLine, { backgroundColor: bg, borderColor: border }])}>
              <Text style={s([styles.durationFooterKeyLabel, { color: mutedText }])}>Total Duration</Text>
              <Text style={s([styles.durationFooterValueOutput, { color: tintColor }])}>
                {log.total_hours?.toFixed(2) || "0.00"} hrs
              </Text>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  loadingFallbackScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: hp(1.5),
  },
  loadingLabelText: {
    fontSize: fs(3.5),
    fontWeight: "500",
  },
  scrollContainerPadding: {
    paddingHorizontal: wp(4),
    paddingTop: hp(2),
    paddingBottom: hp(5),
  },
  headerBlock: {
    marginBottom: hp(2.5),
    marginTop: hp(0.5),
  },
  mainTitleText: {
    fontSize: fs(6),
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  subtitleText: {
    fontSize: fs(3.2),
    marginTop: hp(0.25),
  },
  statsGridMatrixContainer: {
    gap: hp(1.2),
    marginBottom: hp(3),
  },
  matrixGridRow: {
    flexDirection: "row",
    gap: wp(2.5),
  },
  statCardContainer: {
    flex: 1,
    borderWidth: 1,
    borderRadius: wp(3),
    padding: wp(3.5),
  },
  statCardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: hp(0.8),
  },
  statCardTitleText: {
    fontSize: fs(2.5),
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  statIconBadge: {
    padding: wp(1.2),
    borderRadius: wp(1.5),
  },
  statCardValueText: {
    fontSize: fs(4.5),
    fontWeight: "800",
  },
  recentLogsSectionLabel: {
    fontSize: fs(3.8),
    fontWeight: "700",
    marginBottom: hp(1.5),
  },
  timeLogCardElementRow: {
    borderWidth: 1,
    borderRadius: wp(3),
    padding: wp(3.5),
    marginBottom: hp(1.2),
  },
  logCardHeaderLineRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    paddingBottom: hp(1.2),
    marginBottom: hp(1.2),
  },
  inlineCalendarMetaFlexGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp(1.5),
  },
  cardHeaderDateText: {
    fontSize: fs(3.2),
    fontWeight: "700",
  },
  statusBadgeCapsule: {
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.4),
    borderRadius: wp(1.5),
  },
  statusBadgeLabelText: {
    fontSize: fs(2.8),
    fontWeight: "700",
  },
  clockTimesParametersRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: wp(3),
    marginBottom: hp(1.5),
  },
  timeParameterBlockItem: {
    flex: 1,
    borderWidth: 1,
    borderRadius: wp(2),
    padding: wp(2),
  },
  timeBlockKeyLabelText: {
    fontSize: fs(2.2),
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: hp(0.5),
  },
  inlineTimeIconFlexRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp(1.2),
  },
  timeBlockValueLabelText: {
    fontSize: fs(3),
    fontWeight: "600",
  },
  durationCardFooterRowMetricLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: wp(2),
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(1),
    borderWidth: 1,
  },
  durationFooterKeyLabel: {
    fontSize: fs(3),
    fontWeight: "500",
  },
  durationFooterValueOutput: {
    fontSize: fs(3.2),
    fontWeight: "700",
  },
  emptyViewCardContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: hp(8),
  },
  emptyCardMainTitle: {
    fontSize: fs(3.8),
    fontWeight: "700",
    marginBottom: hp(0.25),
  },
  emptyCardSubText: {
    fontSize: fs(3.2),
    textAlign: "center",
  },
});