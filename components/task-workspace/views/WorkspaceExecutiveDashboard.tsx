import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import {
  ListTodo,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  BarChart3,
  Users,
} from "lucide-react-native";
import {
  STATUS_COLUMNS,
  WorkloadRow,
  useTaskAnalyticsSummary,
  useTaskAnalyticsWorkload,
} from "../data/workspaceApi";
import { useTaskTheme } from "@/components/tasks/theme";
import { ViewLoading } from "./shared";
import { useTaskWorkspace } from "../TaskWorkspaceContext";

function KpiTile({
  icon: Icon,
  label,
  value,
  tone,
  bgColor,
}: {
  icon: any;
  label: string;
  value: string | number;
  tone: string;
  bgColor: string;
}) {
  const theme = useTaskTheme();

  return (
    <View
      style={[
        styles.tile,
        {
          backgroundColor: theme.bg.surface,
          borderColor: theme.border.default,
        },
      ]}
    >
      <View style={[styles.tileIconWrap, { backgroundColor: bgColor }]}>
        <Icon size={20} color={tone} />
      </View>
      <View style={styles.tileContent}>
        <Text style={[styles.tileValue, { color: theme.text.primary }]}>
          {value}
        </Text>
        <Text
          style={[styles.tileLabel, { color: theme.text.secondary }]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>
    </View>
  );
}

export default function WorkspaceExecutiveDashboard() {
  const theme = useTaskTheme();
  const { setFilters, setView } = useTaskWorkspace();

  const {
    data: summary,
    isLoading: isSummaryLoading,
    isRefetching: isSummaryRefetching,
    refetch: refetchSummary,
  } = useTaskAnalyticsSummary();

  const {
    data: workload,
    isLoading: isWorkloadLoading,
    isRefetching: isWorkloadRefetching,
    refetch: refetchWorkload,
  } = useTaskAnalyticsWorkload();

  const isRefreshing = isSummaryRefetching || isWorkloadRefetching;

  const handleRefresh = () => {
    refetchSummary();
    refetchWorkload();
  };

  if (isSummaryLoading || isWorkloadLoading) {
    return <ViewLoading label="Loading Executive Analytics…" />;
  }

  const s = summary || {
    total: 0,
    overdue: 0,
    completedThisWeek: 0,
    onTimePct: 0,
    completionPct: 0,
    byStatus: {},
    byPriority: {},
    throughput: [],
  };

  const topWorkload = (workload || []).slice(0, 6);
  const throughputData = s.throughput || [];
  const maxThroughput = Math.max(...throughputData.map((d) => d.count), 1);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.bg.canvas }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={theme.accent.primary}
        />
      }
    >
      {/* KPI Tiles Grid */}
      <View style={styles.kpiGrid}>
        <KpiTile
          icon={ListTodo}
          label="Total Tasks"
          value={s.total}
          tone="#3B82F6"
          bgColor="rgba(59, 130, 246, 0.12)"
        />
        <KpiTile
          icon={AlertTriangle}
          label="Overdue"
          value={s.overdue}
          tone="#EF4444"
          bgColor="rgba(239, 68, 68, 0.12)"
        />
        <KpiTile
          icon={CheckCircle2}
          label="Done This Week"
          value={s.completedThisWeek}
          tone="#10B981"
          bgColor="rgba(16, 185, 129, 0.12)"
        />
        <KpiTile
          icon={Clock}
          label="On-Time Rate"
          value={`${s.onTimePct}%`}
          tone="#F59E0B"
          bgColor="rgba(245, 158, 11, 0.12)"
        />
        <KpiTile
          icon={TrendingUp}
          label="Completion"
          value={`${s.completionPct}%`}
          tone="#8B5CF6"
          bgColor="rgba(139, 92, 246, 0.12)"
        />
      </View>

      {/* Throughput Chart (Last 7 Days) */}
      <View
        style={[
          styles.chartCard,
          {
            backgroundColor: theme.bg.surface,
            borderColor: theme.border.default,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <BarChart3 size={18} color={theme.accent.primary} />
          <Text style={[styles.cardTitle, { color: theme.text.primary }]}>
            Throughput (Completed in Last 7 Days)
          </Text>
        </View>

        {throughputData.length > 0 ? (
          <View style={styles.barsContainer}>
            {throughputData.map((item, index) => {
              const heightPct = Math.round((item.count / maxThroughput) * 100);
              const label = item.date.slice(5); // MM-DD or day

              return (
                <View key={item.date || index} style={styles.barColumn}>
                  <Text style={[styles.barCount, { color: theme.text.secondary }]}>
                    {item.count}
                  </Text>
                  <View
                    style={[
                      styles.barTrack,
                      { backgroundColor: theme.bg.surfaceRaised },
                    ]}
                  >
                    <View
                      style={[
                        styles.barFill,
                        {
                          height: `${Math.max(heightPct, 6)}%`,
                          backgroundColor: theme.accent.primary,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.barLabel, { color: theme.text.tertiary }]}>
                    {label}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={[styles.emptyChartText, { color: theme.text.tertiary }]}>
            No completions recorded in the last 7 days.
          </Text>
        )}
      </View>

      {/* Status Breakdown Distribution */}
      <View
        style={[
          styles.chartCard,
          {
            backgroundColor: theme.bg.surface,
            borderColor: theme.border.default,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: theme.text.primary }]}>
            Status Breakdown
          </Text>
        </View>

        <View style={styles.statusList}>
          {STATUS_COLUMNS.map((col) => {
            const count = s.byStatus?.[col.key] || 0;
            const pct = s.total > 0 ? Math.round((count / s.total) * 100) : 0;

            return (
              <TouchableOpacity
                key={col.key}
                style={styles.statusRow}
                onPress={() => {
                  setFilters({ status: col.key });
                  setView("card");
                }}
                activeOpacity={0.7}
              >
                <View style={styles.statusLeft}>
                  <View style={[styles.statusDot, { backgroundColor: col.color }]} />
                  <Text style={[styles.statusLabel, { color: theme.text.primary }]}>
                    {col.label}
                  </Text>
                </View>
                <View style={styles.statusMiddle}>
                  <View
                    style={[
                      styles.statusBarTrack,
                      { backgroundColor: theme.bg.surfaceRaised },
                    ]}
                  >
                    <View
                      style={[
                        styles.statusBarFill,
                        { width: `${pct}%`, backgroundColor: col.color },
                      ]}
                    />
                  </View>
                </View>
                <Text style={[styles.statusCount, { color: theme.text.secondary }]}>
                  {count} ({pct}%)
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Top Workload Allocation */}
      {topWorkload.length > 0 && (
        <View
          style={[
            styles.chartCard,
            {
              backgroundColor: theme.bg.surface,
              borderColor: theme.border.default,
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <Users size={18} color={theme.accent.primary} />
            <Text style={[styles.cardTitle, { color: theme.text.primary }]}>
              Top Workload Allocation
            </Text>
          </View>

          <View style={styles.workloadList}>
            {topWorkload.map((r: WorkloadRow) => {
              const util = r.utilizationPct;
              const pct =
                util != null
                  ? Math.min(util, 100)
                  : Math.min(r.active * 10, 100);
              const barColor =
                util == null
                  ? "#3B82F6"
                  : util > 100
                  ? "#EF4444"
                  : util > 80
                  ? "#F59E0B"
                  : "#10B981";

              return (
                <TouchableOpacity
                  key={r.assignee}
                  style={styles.workloadRow}
                  onPress={() => {
                    setFilters({ assignment: r.assignee });
                    setView("card");
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[styles.workloadName, { color: theme.text.primary }]}
                    numberOfLines={1}
                  >
                    {r.assignee}
                  </Text>
                  <View
                    style={[
                      styles.workloadTrack,
                      { backgroundColor: theme.bg.surfaceRaised },
                    ]}
                  >
                    <View
                      style={[
                        styles.workloadFill,
                        { width: `${pct}%`, backgroundColor: barColor },
                      ]}
                    />
                  </View>
                  <Text
                    style={[
                      styles.workloadStats,
                      { color: theme.text.secondary },
                    ]}
                  >
                    {r.active} tasks{util != null ? ` · ${util}%` : ""}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 14,
    gap: 14,
    paddingBottom: 40,
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  tile: {
    width: "48.2%",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  tileIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  tileContent: {
    flex: 1,
  },
  tileValue: {
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 22,
  },
  tileLabel: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 2,
  },
  chartCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  barsContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 140,
    paddingTop: 10,
  },
  barColumn: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  barCount: {
    fontSize: 11,
    fontWeight: "600",
  },
  barTrack: {
    width: 14,
    height: 90,
    borderRadius: 7,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  barFill: {
    width: "100%",
    borderRadius: 7,
  },
  barLabel: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
  },
  emptyChartText: {
    fontSize: 12,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 24,
  },
  statusList: {
    gap: 12,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statusLeft: {
    width: 90,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusLabel: {
    fontSize: 12.5,
    fontWeight: "600",
  },
  statusMiddle: {
    flex: 1,
  },
  statusBarTrack: {
    height: 7,
    borderRadius: 4,
    overflow: "hidden",
  },
  statusBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  statusCount: {
    width: 70,
    textAlign: "right",
    fontSize: 11.5,
    fontWeight: "600",
  },
  workloadList: {
    gap: 10,
  },
  workloadRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  workloadName: {
    width: 80,
    fontSize: 12.5,
    fontWeight: "600",
  },
  workloadTrack: {
    flex: 1,
    height: 7,
    borderRadius: 4,
    overflow: "hidden",
  },
  workloadFill: {
    height: "100%",
    borderRadius: 4,
  },
  workloadStats: {
    width: 85,
    textAlign: "right",
    fontSize: 11.5,
    fontWeight: "500",
  },
});
