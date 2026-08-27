import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Activity, ArrowUpRight, Wifi, WifiOff } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/services/api";
import { useTheme } from "@/contexts/ThemeContext";
import { isDarkTheme } from "@/constants/design/presets";

interface WipSummary {
  clockedIn: number;
  onBreak: number;
  onLunch: number;
  activeTasks: number;
}

export function WipDashboardWidget({ className }: { className?: string }) {
  const router = useRouter();
  const { uiTheme } = useTheme() as any;

  const isDark = isDarkTheme(uiTheme?.theme);

  const colors = useMemo(
    () => ({
      cardBg:
        uiTheme?.panelColors?.dashboardCardBackground ||
        (isDark ? "#121a2f" : "#ffffff"),
      textColor:
        uiTheme?.panelColors?.dashboardTextColor ||
        (isDark ? "#ffffff" : "#0f172a"),
      mutedText: isDark ? "#94a3b8" : "#64748b",
      borderColor:
        uiTheme?.panelColors?.borderColor ||
        (isDark ? "rgba(255,255,255,0.1)" : "#e2e8f0"),
    }),
    [uiTheme, isDark]
  );

  const { data: summary, isLoading } = useQuery<WipSummary>({
    queryKey: ["wipSummary"],
    queryFn: async () => {
      try {
        const res = await apiRequest<any>("/wip/summary", { method: "GET" });
        return (
          res.data || {
            clockedIn: 0,
            onBreak: 0,
            onLunch: 0,
            activeTasks: 0,
          }
        );
      } catch {
        return { clockedIn: 0, onBreak: 0, onLunch: 0, activeTasks: 0 };
      }
    },
    refetchInterval: 15000,
  });

  const handleOpen = () => {
    router.push("/(admin)/wip" as any);
  };

  return (
    <View
      style={[
        styles.widgetCard,
        { backgroundColor: colors.cardBg, borderColor: colors.borderColor },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <View style={styles.iconBadge}>
            <Activity size={18} color="#34d399" />
          </View>
          <View>
            <View style={styles.titleWithLive}>
              <Text style={[styles.titleText, { color: colors.textColor }]}>
                Work In Progress
              </Text>
              <View style={styles.liveBadge}>
                <Wifi size={10} color="#34d399" />
                <Text style={styles.liveBadgeText}>Live</Text>
              </View>
            </View>
            <Text style={[styles.subtitleText, { color: colors.mutedText }]}>
              Who is working, right now
            </Text>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleOpen}
          style={[styles.openBtn, { borderColor: colors.borderColor }]}
        >
          <Text style={[styles.openBtnText, { color: colors.textColor }]}>
            Open
          </Text>
          <ArrowUpRight size={14} color={colors.textColor} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={handleOpen}
        style={styles.summaryGrid}
      >
        <View style={styles.summaryBox}>
          <Text style={[styles.summaryValue, { color: "#34d399" }]}>
            {isLoading ? "-" : summary?.clockedIn ?? 0}
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.mutedText }]}>
            Clocked In
          </Text>
        </View>

        <View style={styles.summaryBox}>
          <Text style={[styles.summaryValue, { color: "#fbbf24" }]}>
            {isLoading ? "-" : summary?.onLunch ?? 0}
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.mutedText }]}>
            Lunch
          </Text>
        </View>

        <View style={styles.summaryBox}>
          <Text style={[styles.summaryValue, { color: "#a78bfa" }]}>
            {isLoading ? "-" : summary?.onBreak ?? 0}
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.mutedText }]}>
            Break
          </Text>
        </View>

        <View style={styles.summaryBox}>
          <Text style={[styles.summaryValue, { color: "#60a5fa" }]}>
            {isLoading ? "-" : summary?.activeTasks ?? 0}
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.mutedText }]}>
            Active Tasks
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  widgetCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  titleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(52, 211, 153, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  titleWithLive: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  titleText: {
    fontSize: 15,
    fontWeight: "700",
  },
  subtitleText: {
    fontSize: 11,
    marginTop: 2,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(52, 211, 153, 0.15)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveBadgeText: {
    color: "#34d399",
    fontSize: 9,
    fontWeight: "700",
  },
  openBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  openBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },
  summaryGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "rgba(0,0,0,0.15)",
    padding: 12,
    borderRadius: 12,
  },
  summaryBox: {
    alignItems: "center",
    flex: 1,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "800",
  },
  summaryLabel: {
    fontSize: 10,
    marginTop: 2,
    fontWeight: "600",
  },
});