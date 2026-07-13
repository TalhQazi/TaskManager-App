import React, { useEffect, useState, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Platform,
  StatusBar
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../../contexts/AuthContext";
import { useTheme } from "../../../contexts/ThemeContext";
import { apiRequest } from "../../../services/api";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = (SCREEN_WIDTH - 40) / 2;

interface DashboardMetrics {
  contacts: number;
  companies: number;
  totalDeals: number;
  activeDeals: number;
  lostDeals: number;
  activeTasks: number;
  pipelineValue: number;
  revenue: number;
  averageDealSize: number;
}

interface MonthlyDeal { month: string; deals: number }
interface ConversionStage { stage: string; count: number; percent: number }
interface RecentActivity { id: string; type: "deal" | "task" | "communication"; text: string; user: string; time: string; avatar: string }
interface FollowupItem { id: string; contact: string; task: string; date: string; time: string; priority: "High" | "Medium" | "Low" | "Urgent" }

interface DashboardData {
  metrics: DashboardMetrics;
  monthlyDeals: MonthlyDeal[];
  conversionStages: ConversionStage[];
  recentActivities: RecentActivity[];
  upcomingFollowups: FollowupItem[];
}

interface WrappedResponse {
  success: boolean;
  data?: DashboardData;
}

type ApiResponse = WrappedResponse | any;

const TYPE_CONFIG = {
  deal: { bg: "rgba(59, 130, 246, 0.1)", txt: "#60a5fa", border: "rgba(59, 130, 246, 0.3)", icon: "💼", label: "Deal" },
  task: { bg: "rgba(16, 185, 129, 0.1)", txt: "#34d399", border: "rgba(16, 185, 129, 0.3)", icon: "✅", label: "Task" },
  communication: { bg: "rgba(139, 92, 246, 0.1)", txt: "#a78bfa", border: "rgba(139, 92, 246, 0.3)", icon: "💬", label: "Comm" }
};

const PRIORITY_CONFIG = {
  Urgent: { bg: "rgba(239, 68, 68, 0.15)", txt: "#fca5a5", border: "rgba(239, 68, 68, 0.4)", dot: "#f87171" },
  High: { bg: "rgba(245, 158, 11, 0.15)", txt: "#fcd34d", border: "rgba(245, 158, 11, 0.4)", dot: "#fbbf24" },
  Medium: { bg: "rgba(217, 119, 6, 0.15)", txt: "#fde047", border: "rgba(217, 119, 6, 0.4)", dot: "#facc15" },
  Low: { bg: "rgba(100, 116, 139, 0.1)", txt: "#94a3b8", border: "rgba(100, 116, 139, 0.3)", dot: "#64748b" }
};

function formatCurrency(value: number) {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
}

function useCountUp(target: number | string, duration = 1000) {
  const [display, setDisplay] = useState<number | string>(typeof target === "number" ? 0 : target);

  useEffect(() => {
    if (typeof target !== "number") {
      setDisplay(target);
      return;
    }

    let start = 0;
    const stepTime = Math.max(Math.floor(duration / target), 16);
    const increment = Math.ceil(target / (duration / stepTime));

    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setDisplay(target);
        clearInterval(timer);
      } else {
        setDisplay(start);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [target, duration]);

  return display;
}

function SparkBar({ value, max, tint, styles }: { value: number; max: number; tint: string; styles: any }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  const metricsDataPoints = [40, 60, 50, 80, 70, pct];

  return (
    <View style={styles.sparkContainer}>
      {metricsDataPoints.map((v, i) => (
        <View key={i} style={[styles.sparkPill, { height: `${Math.max(v, 12)}%`, backgroundColor: tint }]} />
      ))}
    </View>
  );
}

function KPICard({ stat, styles }: { stat: any; styles: any }) {
  const displayed = useCountUp(typeof stat.value === "number" ? stat.value : 0);

  return (
    <View style={[styles.kpiCard, { borderColor: stat.borderColor }]}>
      <View style={styles.kpiHeaderRow}>
        <View style={[styles.kpiIconWrapper, { backgroundColor: stat.bg, borderColor: stat.borderColor }]}>
          <Text style={{ fontSize: 18 }}>{stat.icon}</Text>
        </View>
        {stat.sparkValue !== undefined && (
          <SparkBar value={stat.sparkValue} max={stat.sparkMax} tint={stat.tint} styles={styles} />
        )}
      </View>
      <Text style={[styles.kpiValue, { color: stat.tint }]} numberOfLines={1} adjustsFontSizeToFit>
        {stat.value === "—" ? "—" : typeof stat.value === "string" ? stat.value : displayed.toLocaleString()}
      </Text>
      <Text style={styles.kpiLabel}>{stat.label}</Text>
      <View style={styles.liveBadge}>
        <View style={styles.liveDot} />
        <Text style={styles.liveText}>LIVE</Text>
      </View>
    </View>
  );
}

export default function CRMDashboard() {
  const auth = useAuth();
  const { uiTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<"activities" | "tasks">("activities");

  const isMetallic = uiTheme?.theme === "metallic-elite";

  const colors = useMemo(() => {
    const isDark = (uiTheme?.theme as string) === "dark" || isMetallic;
    return {
      background: uiTheme?.panelColors?.dashboardBackground || (isDark ? "#080b10" : "#f8fafc"),
      cardBg: uiTheme?.panelColors?.dashboardCardBackground || (isDark ? "#0f131a" : "#ffffff"),
      text: uiTheme?.panelColors?.dashboardTextColor || (isDark ? "#ffffff" : "#0f172a"),
      mutedText: isDark ? "rgba(255,255,255,0.4)" : "#475569",
      border: uiTheme?.panelColors?.dashboardBackground || (isDark ? "rgba(217,119,6,0.15)" : "#e2e8f0"),
      inputBg: isDark ? "#020617" : "#ffffff",
      inputBorder: isDark ? "rgba(255,255,255,0.1)" : "#cbd5e1",
      primary: uiTheme?.customColors?.primary || "#ffd27a"
    };
  }, [uiTheme, isMetallic]);

  const styles = useMemo(() => createStyles(colors), [colors]);

  const dashboardQuery = useQuery<DashboardData | null>({
    queryKey: ["crm-dashboard"],
    queryFn: async () => {
      const res = await apiRequest("/crm-dashboard", { method: "GET" }) as ApiResponse;
      if (res && res.success && res.data) {
        return res.data as DashboardData;
      }
      return res?.data || null;
    }
  });

  const dashboardData = dashboardQuery.data;
  const m = dashboardData?.metrics;

  const kpiStats = useMemo(() => {
    return [
      { id: "contacts", label: "Total Contacts", value: m ? m.contacts : "—", icon: "👥", bg: "rgba(56, 189, 248, 0.08)", borderColor: "rgba(56, 189, 248, 0.2)", tint: "#38bdf8", sparkValue: m?.contacts, sparkMax: m ? m.contacts + 50 : 100 },
      { id: "companies", label: "Companies", value: m ? m.companies : "—", icon: "🏢", bg: "rgba(99, 102, 241, 0.08)", borderColor: "rgba(99, 102, 241, 0.2)", tint: "#6366f1", sparkValue: m?.companies, sparkMax: m ? m.companies + 20 : 50 },
      { id: "active_deals", label: "Active Deals", value: m ? m.activeDeals : "—", icon: "⚡", bg: "rgba(245, 158, 11, 0.08)", borderColor: "rgba(245, 158, 11, 0.2)", tint: colors.primary, sparkValue: m?.activeDeals, sparkMax: m?.totalDeals || 100 },
      { id: "tasks", label: "Open Tasks", value: m ? m.activeTasks : "—", icon: "📋", bg: "rgba(167, 139, 250, 0.08)", borderColor: "rgba(167, 139, 250, 0.2)", tint: "#a78bfa", sparkValue: m?.activeTasks, sparkMax: m ? m.activeTasks + 10 : 30 },
      { id: "pipeline", label: "Pipeline Value", value: m ? formatCurrency(m.pipelineValue) : "—", icon: "💰", bg: "rgba(45, 212, 191, 0.08)", borderColor: "rgba(45, 212, 191, 0.2)", tint: "#2dd4bf" },
      { id: "revenue", label: "Closed Revenue", value: m ? formatCurrency(m.revenue) : "—", icon: "📈", bg: "rgba(52, 211, 153, 0.08)", borderColor: "rgba(52, 211, 153, 0.2)", tint: "#34d399" }
    ];
  }, [m, colors.primary]);

  const winRate = useMemo(() => {
    if (!m) return 0;
    const total = m.activeDeals + m.lostDeals;
    return total > 0 ? Math.round((m.activeDeals / total) * 100) : 0;
  }, [m]);

  if (dashboardQuery.isLoading) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.syncText}>Syncing dashboard data...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <View style={styles.headerTitleGroup}>
          <View style={[styles.logoBox, { backgroundColor: colors.primary }]}>
            <Text style={styles.logoText}>CRM</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Sales Dashboard</Text>
            <Text style={styles.subtitle}>Live metrics database pipeline</Text>
          </View>
        </View>

        {dashboardQuery.error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>⚠ Unable to refresh parameters</Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {kpiStats.map(stat => (
            <KPICard key={stat.id} stat={stat} styles={styles} />
          ))}
        </View>

        <View style={styles.secondaryTrack}>
          <View style={[styles.rowCard, { borderColor: colors.border }]}>
            <Text style={styles.rowIcon}>📊</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Avg. Deal Size</Text>
              <Text style={styles.rowValue}>{m ? formatCurrency(m.averageDealSize) : "—"}</Text>
            </View>
          </View>

          <View style={[styles.rowCard, { borderColor: colors.border }]}>
            <Text style={styles.rowIcon}>🎯</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Win Rate</Text>
              <Text style={[styles.rowValue, { color: winRate >= 50 ? "#34d399" : "#fb923c" }]}>{winRate}%</Text>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${winRate}%` }]} />
              </View>
            </View>
          </View>
        </View>

        {dashboardData && dashboardData.conversionStages?.length > 0 && (
          <View style={[styles.sectionContainer, { borderColor: colors.border }]}>
            <Text style={styles.sectionTitle}>Pipeline Funnel</Text>
            <Text style={styles.sectionSubtitle}>Stage-by-stage layout drop conversion</Text>

            <View style={styles.funnelBox}>
              {dashboardData.conversionStages.map((stage, idx) => {
                const colorsPalette = ["#3b82f6", "#6366f1", "#8b5cf6", "#f59e0b", "#10b981"];
                const progressColor = colorsPalette[idx % colorsPalette.length];
                return (
                  <View key={stage.stage} style={styles.funnelRow}>
                    <Text style={styles.funnelLabel} numberOfLines={1}>{stage.stage}</Text>
                    <View style={styles.funnelBarTrack}>
                      <View style={[styles.funnelBarFill, { width: `${Math.max(stage.percent, 12)}%`, backgroundColor: progressColor }]}>
                        <Text style={styles.funnelCount}>{stage.count}</Text>
                      </View>
                    </View>
                    <Text style={styles.funnelPct}>{stage.percent}%</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === "activities" && { backgroundColor: "rgba(255,255,255,0.02)", borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab("activities")}
          >
            <Text style={[styles.tabText, activeTab === "activities" ? { color: colors.text, fontWeight: "900" } : { color: colors.mutedText }]}>Recent Activities</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === "tasks" && { backgroundColor: "rgba(255,255,255,0.02)", borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab("tasks")}
          >
            <Text style={[styles.tabText, activeTab === "tasks" ? { color: colors.text, fontWeight: "900" } : { color: colors.mutedText }]}>Upcoming Tasks</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.segmentListBlock}>
          {activeTab === "activities" ? (
            (dashboardData?.recentActivities || []).map(act => {
              const cfg = TYPE_CONFIG[act.type] || TYPE_CONFIG.task;
              return (
                <View key={act.id} style={styles.itemRow}>
                  <View style={[styles.iconIndicatorBox, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
                    <Text style={{ fontSize: 14 }}>{cfg.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTextMain} numberOfLines={2}>{act.text}</Text>
                    <View style={styles.itemMetaLine}>
                      <Text style={styles.itemUserText}>{act.user}</Text>
                      {act.time ? <Text style={styles.itemTimeText}>• {act.time}</Text> : null}
                    </View>
                  </View>
                </View>
              );
            })
          ) : (
            (dashboardData?.upcomingFollowups || []).map(task => {
              const pCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.Low;
              return (
                <View key={task.id} style={styles.itemRow}>
                  <View style={styles.dateBlock}>
                    <Text style={styles.dateTextLabel}>📅</Text>
                  </View>
                  <View style={{ flex: 1, paddingRight: 6 }}>
                    <Text style={styles.itemTextMain} numberOfLines={1}>{task.contact}</Text>
                    <Text style={styles.itemSubText} numberOfLines={1}>{task.task}</Text>
                  </View>
                  <View style={[styles.priorityBadge, { backgroundColor: pCfg.bg, borderColor: pCfg.border }]}>
                    <View style={[styles.priorityDot, { backgroundColor: pCfg.dot }]} />
                    <Text style={[styles.priorityText, { color: pCfg.txt }]}>{task.priority}</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background
  },
  centered: {
    justifyContent: "center",
    alignItems: "center"
  },
  syncText: {
    color: colors.mutedText,
    fontSize: 12,
    marginTop: 12,
    fontWeight: "600"
  },
  scrollContainer: {
    paddingHorizontal: 16,
    paddingBottom: 40
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 12 : 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderColor: colors.border,
    marginBottom: 16
  },
  headerTitleGroup: {
    flexDirection: "row",
    alignItems: "center"
  },
  logoBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12
  },
  logoText: {
    color: "#080b10",
    fontSize: 12,
    fontWeight: "900"
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
    color: colors.text,
    letterSpacing: -0.5
  },
  subtitle: {
    fontSize: 11,
    color: colors.mutedText,
    marginTop: 2
  },
  errorBanner: {
    marginTop: 8,
    padding: 8,
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
    borderRadius: 8
  },
  errorText: {
    color: "#f87171",
    fontSize: 11,
    fontWeight: "600"
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between"
  },
  kpiCard: {
    width: CARD_WIDTH,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    position: "relative"
  },
  kpiHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12
  },
  kpiIconWrapper: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 2
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.mutedText,
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  liveBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center"
  },
  liveDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#10b981",
    marginRight: 4
  },
  liveText: {
    fontSize: 8,
    color: colors.mutedText,
    fontWeight: "700"
  },
  sparkContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 24,
    gap: 2
  },
  sparkPill: {
    width: 2.5,
    borderRadius: 1
  },
  secondaryTrack: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginVertical: 8
  },
  rowCard: {
    flex: 1,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    alignItems: "center"
  },
  rowIcon: {
    fontSize: 20,
    marginRight: 10
  },
  rowLabel: {
    fontSize: 10,
    color: colors.mutedText,
    fontWeight: "600"
  },
  rowValue: {
    fontSize: 15,
    fontWeight: "900",
    color: colors.text,
    marginTop: 1
  },
  progressBarBg: {
    height: 4,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 2,
    marginTop: 4,
    overflow: "hidden"
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#10b981",
    borderRadius: 2
  },
  sectionContainer: {
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    borderWidth: 1
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text
  },
  sectionSubtitle: {
    fontSize: 11,
    color: colors.mutedText,
    marginTop: 2,
    marginBottom: 12
  },
  funnelBox: {
    marginTop: 4
  },
  funnelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10
  },
  funnelLabel: {
    width: 80,
    fontSize: 11,
    color: colors.mutedText,
    textAlign: "right",
    marginRight: 10,
    fontWeight: "600"
  },
  funnelBarTrack: {
    flex: 1,
    height: 24,
    backgroundColor: "rgba(0,0,0,0.15)",
    borderRadius: 6,
    overflow: "hidden"
  },
  funnelBarFill: {
    height: "100%",
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "flex-end",
    paddingRight: 8
  },
  funnelCount: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "900"
  },
  funnelPct: {
    width: 35,
    fontSize: 11,
    fontWeight: "700",
    color: colors.mutedText,
    textAlign: "right",
    marginLeft: 8
  },
  tabContainer: {
    flexDirection: "row",
    marginTop: 16,
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8
  },
  tabText: {
    fontSize: 12,
    fontWeight: "700"
  },
  segmentListBlock: {
    marginTop: 12,
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    padding: 8,
    borderWidth: 1,
    borderColor: colors.border
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.02)"
  },
  iconIndicatorBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12
  },
  itemTextMain: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text
  },
  itemMetaLine: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4
  },
  itemUserText: {
    fontSize: 11,
    color: colors.mutedText,
    marginRight: 6
  },
  itemTimeText: {
    fontSize: 11,
    color: colors.mutedText
  },
  dateBlock: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.15)",
    borderWidth: 1,
    borderColor: colors.inputBorder,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12
  },
  dateTextLabel: {
    fontSize: 14
  },
  itemSubText: {
    fontSize: 11,
    color: colors.mutedText,
    marginTop: 1
  },
  priorityBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  priorityDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginRight: 4
  },
  priorityText: {
    fontSize: 10,
    fontWeight: "800"
  }
});