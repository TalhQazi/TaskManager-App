import React, { useEffect, useState, useMemo, useCallback } from "react";
import { StyleSheet, View, Text, ActivityIndicator, useWindowDimensions } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { HardDrive, MemoryStick, Server } from "lucide-react-native";
import { apiFetch } from "@/lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";

interface ResourceUsage {
  total: number;
  used: number;
  free: number;
}

interface SystemStats {
  hostname?: string;
  platform?: string;
  uptimeSeconds?: number;
  cpuCount?: number;
  cpuUsage?: number;
  ram?: ResourceUsage;
  disk?: ResourceUsage | null;
}

const USED_COLOR = "#f43f5e";
const FREE_COLOR = "#10b981";

function formatBytes(bytes: number): string {
  if (!bytes || bytes < 0) return "0 GB";
  const gb = bytes / 1024 ** 3;
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  const mb = bytes / 1024 ** 2;
  return `${mb.toFixed(0)} MB`;
}

function UsageRing({
  title,
  icon,
  usage,
  isPercent = false,
  colors,
}: {
  title: string;
  icon: React.ReactNode;
  usage: ResourceUsage | null | undefined;
  isPercent?: boolean;
  colors: any;
}) {
  if (!usage || !usage.total) {
    return (
      <View style={[styles.pieCard, { backgroundColor: colors.pieBg, borderColor: colors.border }]}>
        <View style={styles.pieCardHeader}>
          {icon}
          <Text style={[styles.pieCardTitle, { color: colors.text }]}>{title}</Text>
        </View>
        <View style={styles.unavailableBox}>
          <Text style={[styles.unavailableText, { color: colors.textMuted }]}>Data unavailable</Text>
        </View>
      </View>
    );
  }

  const usedPct = usage.total > 0 ? Math.round((usage.used / usage.total) * 100) : 0;
  const formatVal = (v: number) => (isPercent ? `${v}%` : formatBytes(v));
  const usedLabel = isPercent ? "Load" : "Used";
  const freeLabel = isPercent ? "Idle" : "Available";
  const totalLabel = isPercent ? "Capacity" : "Total";

  const size = 120;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (usedPct / 100) * circumference;

  return (
    <View style={[styles.pieCard, { backgroundColor: colors.pieBg, borderColor: colors.border }]}>
      <View style={styles.pieCardHeader}>
        {icon}
        <Text style={[styles.pieCardTitle, { color: colors.text }]}>{title}</Text>
      </View>

      <View style={styles.ringContainer}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={FREE_COLOR}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={USED_COLOR}
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="none"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <View style={styles.ringCenterText}>
          <Text style={[styles.percentValue, { color: colors.text }]}>{usedPct}%</Text>
          <Text style={[styles.percentLabel, { color: colors.textMuted }]}>
            {isPercent ? "Load" : "Used"}
          </Text>
        </View>
      </View>

      <View style={styles.statsList}>
        <View style={styles.statRow}>
          <View style={styles.statLabelGroup}>
            <View style={[styles.dot, { backgroundColor: USED_COLOR }]} />
            <Text style={[styles.statLabelText, { color: colors.textMuted }]}>{usedLabel}</Text>
          </View>
          <Text style={[styles.statValText, { color: colors.text }]}>{formatVal(usage.used)}</Text>
        </View>

        <View style={styles.statRow}>
          <View style={styles.statLabelGroup}>
            <View style={[styles.dot, { backgroundColor: FREE_COLOR }]} />
            <Text style={[styles.statLabelText, { color: colors.textMuted }]}>{freeLabel}</Text>
          </View>
          <Text style={[styles.statValText, { color: colors.text }]}>{formatVal(usage.free)}</Text>
        </View>

        <View style={[styles.statRow, styles.totalRow, { borderTopColor: colors.border }]}>
          <Text style={[styles.statLabelText, { color: colors.textMuted }]}>{totalLabel}</Text>
          <Text style={[styles.statValText, { color: colors.text }]}>{formatVal(usage.total)}</Text>
        </View>
      </View>
    </View>
  );
}

export function SystemResourcePies() {
  const { uiTheme } = useTheme();
  const isDark = uiTheme?.theme !== "crystal-white";
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const colors = useMemo(() => {
    return {
      cardBg: uiTheme?.panelColors?.dashboardCardBackground || (isDark ? "#121A2F" : "#ffffff"),
      border: uiTheme?.panelColors?.borderColor || (isDark ? "rgba(255, 255, 255, 0.1)" : "#e2e8f0"),
      text: uiTheme?.panelColors?.dashboardTextColor || (isDark ? "#ffffff" : "#0f172a"),
      textMuted: isDark ? "rgba(255, 255, 255, 0.4)" : "#64748b",
      pieBg: isDark ? "rgba(255, 255, 255, 0.02)" : "#f8fafc",
    };
  }, [uiTheme, isDark]);

  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  const fetchStats = useCallback(async () => {
    try {
      const data = await apiFetch<SystemStats>("/api/health/system");
      setStats(data);
      setError(false);
    } catch (err) {
      console.error("Failed to fetch system stats", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  return (
    <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Server size={18} color="#60a5fa" />
          <Text style={[styles.headerTitle, { color: colors.text }]}>Host Resources</Text>
        </View>
        {stats?.hostname ? (
          <Text style={[styles.hostnameText, { color: colors.textMuted }]}>{stats.hostname}</Text>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="small" color="#60a5fa" />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>
            Loading system resources...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.centerBox}>
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>
            Failed to load system resources.
          </Text>
        </View>
      ) : (
        <View style={[styles.grid, { flexDirection: isTablet ? "row" : "column" }]}>
          <UsageRing
            title="CPU Load"
            icon={<Server size={16} color="#c084fc" />}
            usage={
              stats?.cpuUsage !== undefined
                ? {
                    total: 100,
                    used: stats.cpuUsage,
                    free: Math.max(100 - stats.cpuUsage, 0),
                  }
                : null
            }
            isPercent
            colors={colors}
          />
          <UsageRing
            title="RAM Usage"
            icon={<MemoryStick size={16} color="#fbbf24" />}
            usage={stats?.ram}
            colors={colors}
          />
          <UsageRing
            title="Server Disk Space"
            icon={<HardDrive size={16} color="#60a5fa" />}
            usage={stats?.disk}
            colors={colors}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  hostnameText: {
    fontSize: 12,
  },
  centerBox: {
    paddingVertical: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 13,
    marginTop: 8,
  },
  grid: {
    gap: 16,
  },
  pieCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  pieCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  pieCardTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  unavailableBox: {
    height: 140,
    justifyContent: "center",
    alignItems: "center",
  },
  unavailableText: {
    fontSize: 12,
  },
  ringContainer: {
    height: 130,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  ringCenterText: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  percentValue: {
    fontSize: 20,
    fontWeight: "800",
  },
  percentLabel: {
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  statsList: {
    marginTop: 12,
    gap: 6,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statLabelGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statLabelText: {
    fontSize: 12,
  },
  statValText: {
    fontSize: 12,
    fontWeight: "600",
  },
  totalRow: {
    borderTopWidth: 1,
    paddingTop: 6,
    marginTop: 2,
  },
});