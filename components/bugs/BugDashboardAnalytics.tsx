import React, { useEffect, useState, useMemo } from "react";
import { StyleSheet, View, Text, ActivityIndicator } from "react-native";
import { Bug, Clock, CheckCircle2, RefreshCw, AlertTriangle } from "lucide-react-native";
import { apiFetch } from "@/lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";
import { s, wp, hp, fs } from "@/util/styles";

type AnalyticsData = {
  total: number;
  pendingBugs: number;
  awaitingConfirmation: number;
  reopenedBugs: number;
  closedVerified: number;
  avgResolutionTimeHours: string;
  acceptanceRate: number;
  reopenRate: number;
};

export default function BugDashboardAnalytics() {
  const { uiTheme, isDark } = useTheme();

  const colors = useMemo(() => {
    return {
      cardBg: uiTheme.panelColors?.dashboardCardBackground || (isDark ? "#18181b" : "#FFFFFF"),
      text: uiTheme.panelColors?.dashboardTextColor || (isDark ? "#F4F4F5" : "#0F172A"),
      textMuted: isDark ? "#71717A" : "#64748B",
      border: isDark ? "#27272A" : "#E2E8F0",
      primary: uiTheme.customColors?.primary || (isDark ? "#3b82f6" : "#0284c7"),
      success: isDark ? "#34D399" : "#16a34a",
      warning: "#F59E0B",
      danger: isDark ? "#F87171" : "#ef4444",
      indigo: "#6366f1",
    };
  }, [uiTheme, isDark]);

  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const res = await apiFetch<AnalyticsData>("/api/bugs/analytics");
      if (res) setData(res);
    } catch {
      /* Graceful boundary */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAnalytics();
  }, []);

  if (loading || !data) {
    return (
      <View style={styles.skeletonContainer}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.grid}>
      <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        <View>
          <Text style={[styles.cardLabel, { color: colors.textMuted }]}>Pending</Text>
          <Text style={[styles.cardValue, { color: colors.text }]}>{data.pendingBugs}</Text>
        </View>
        <Bug size={fs(4.5)} color={colors.primary} />
      </View>

      <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        <View>
          <Text style={[styles.cardLabel, { color: colors.textMuted }]}>Awaiting</Text>
          <Text style={[styles.cardValue, { color: colors.indigo }]}>{data.awaitingConfirmation}</Text>
        </View>
        <Clock size={fs(4.5)} color={colors.indigo} />
      </View>

      <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        <View>
          <Text style={[styles.cardLabel, { color: colors.textMuted }]}>Reopened</Text>
          <Text style={[styles.cardValue, { color: colors.danger }]}>{data.reopenedBugs}</Text>
        </View>
        <RefreshCw size={fs(4.5)} color={colors.danger} />
      </View>

      <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        <View>
          <Text style={[styles.cardLabel, { color: colors.textMuted }]}>Avg Res Time</Text>
          <Text style={[styles.cardValue, { color: colors.text }]}>{data.avgResolutionTimeHours}h</Text>
        </View>
        <CheckCircle2 size={fs(4.5)} color={colors.success} />
      </View>

      <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        <View>
          <Text style={[styles.cardLabel, { color: colors.textMuted }]}>Acceptance</Text>
          <Text style={[styles.cardValue, { color: colors.success }]}>{data.acceptanceRate}%</Text>
        </View>
        <CheckCircle2 size={fs(4.5)} color={colors.success} />
      </View>

      <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        <View>
          <Text style={[styles.cardLabel, { color: colors.textMuted }]}>Reopen Rate</Text>
          <Text style={[styles.cardValue, { color: colors.warning }]}>{data.reopenRate}%</Text>
        </View>
        <AlertTriangle size={fs(4.5)} color={colors.warning} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeletonContainer: {
    height: hp(8),
    justifyContent: "center",
    alignItems: "center",
    marginBottom: hp(1.5),
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: wp(2),
    marginBottom: hp(1.5),
  },
  card: {
    width: (wp(92) - wp(4)) / 3,
    padding: wp(2.5),
    borderRadius: wp(2),
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardLabel: {
    fontSize: fs(2.3),
    fontWeight: "700",
    textTransform: "uppercase",
  },
  cardValue: {
    fontSize: fs(3.8),
    fontWeight: "800",
    marginTop: hp(0.2),
  },
});