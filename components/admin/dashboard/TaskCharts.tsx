import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { apiRequest } from "@/services/api";
import { useTheme } from "@/contexts/ThemeContext";
import { isDarkTheme } from "@/constants/design/presets";

type TaskApi = {
  _id?: string;
  id?: string;
  status?: string;
  dueDate?: string | Date;
  createdAt?: string;
};

function startOfWeekMonday(d: Date) {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date;
}

function endOfWeekSunday(d: Date) {
  const start = startOfWeekMonday(d);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

function taskDateCandidate(t: TaskApi): Date | null {
  if (t.dueDate) {
    const d = new Date(t.dueDate as any);
    if (!Number.isNaN(d.getTime())) return d;
  }
  if (t.createdAt) {
    const d = new Date(t.createdAt);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

function normalizeStatus(s?: string) {
  const v = String(s || "").toLowerCase();
  if (v === "completed") return "completed";
  if (v === "overdue") return "overdue";
  if (v === "in-progress" || v === "in progress") return "in-progress";
  return "pending";
}

const STATUS_COLORS: Record<string, string> = {
  completed: "#16a34a",
  "in-progress": "#3b82f6",
  pending: "#eab308",
  overdue: "#ef4444",
};

export function TaskCharts() {
  const router = useRouter();
  const { uiTheme } = useTheme() as any;

  const isDark = isDarkTheme(uiTheme?.theme);

  const colors = useMemo(
    () => ({
      cardBg:
        uiTheme?.panelColors?.dashboardCardBackground ||
        (isDark ? "#0f1117" : "#ffffff"),
      textColor:
        uiTheme?.panelColors?.dashboardTextColor ||
        (isDark ? "#ffffff" : "#0f172a"),
      mutedText: isDark ? "#94a3b8" : "#64748b",
      borderColor:
        uiTheme?.panelColors?.borderColor ||
        (isDark ? "rgba(255,255,255,0.08)" : "#e2e8f0"),
    }),
    [uiTheme, isDark]
  );

  const { data: tasks = [], isLoading } = useQuery<TaskApi[]>({
    queryKey: ["dashboard", "tasks"],
    queryFn: async () => {
      const res = await apiRequest<any>("/tasks", { method: "GET" });
      const raw = res.data;
      if (Array.isArray(raw)) return raw;
      return Array.isArray(raw?.items) ? raw.items : [];
    },
  });

  const { weeklyTaskData, maxWeeklyValue } = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeekMonday(now);
    const weekEnd = endOfWeekSunday(now);
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    const data = days.map((day) => ({ day, completed: 0, pending: 0 }));

    for (const t of tasks) {
      const d = taskDateCandidate(t);
      if (!d) continue;
      if (d < weekStart || d > weekEnd) continue;

      const status = normalizeStatus(t.status);
      const dayIndexMap = {
        Mon: 0,
        Tue: 1,
        Wed: 2,
        Thu: 3,
        Fri: 4,
        Sat: 5,
        Sun: 6,
      } as const;
      const jsDay = d.getDay();
      const idx = jsDay === 0 ? dayIndexMap.Sun : jsDay - 1;

      if (!data[idx]) continue;
      if (status === "completed") data[idx].completed += 1;
      else data[idx].pending += 1;
    }

    let maxVal = 1;
    data.forEach((d) => {
      if (d.completed > maxVal) maxVal = d.completed;
      if (d.pending > maxVal) maxVal = d.pending;
    });

    return { weeklyTaskData: data, maxWeeklyValue: maxVal };
  }, [tasks]);

  const taskDistributionData = useMemo(() => {
    const statusCounts: Record<string, number> = {
      completed: 0,
      "in-progress": 0,
      pending: 0,
      overdue: 0,
    };

    for (const t of tasks) {
      const s = normalizeStatus(t.status);
      statusCounts[s] = (statusCounts[s] || 0) + 1;
    }

    const total = Object.values(statusCounts).reduce((a, b) => a + b, 0) || 0;

    return Object.keys(statusCounts)
      .filter((k) => statusCounts[k] > 0)
      .map((k) => ({
        key: k,
        name:
          k === "in-progress"
            ? "In Progress"
            : k[0].toUpperCase() + k.slice(1),
        count: statusCounts[k],
        value: total > 0 ? Math.round((statusCounts[k] / total) * 100) : 0,
        color: STATUS_COLORS[k] || "#3b82f6",
      }));
  }, [tasks]);

  const handleNavigate = () => {
    router.push("/(admin)/tasks" as any);
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.cardBg }]}>
        <ActivityIndicator size="small" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Weekly Task Overview Card */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={handleNavigate}
        style={[
          styles.card,
          { backgroundColor: colors.cardBg, borderColor: colors.borderColor },
        ]}
      >
        <Text style={[styles.cardTitle, { color: colors.textColor }]}>
          Weekly Task Overview
        </Text>

        <View style={styles.chartArea}>
          <View style={styles.barsContainer}>
            {weeklyTaskData.map((item) => {
              const completedHeight = (item.completed / maxWeeklyValue) * 100;
              const pendingHeight = (item.pending / maxWeeklyValue) * 100;

              return (
                <View key={item.day} style={styles.barGroup}>
                  <View style={styles.barsTrack}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: `${Math.max(completedHeight, 4)}%`,
                          backgroundColor: "#16a34a",
                        },
                      ]}
                    />
                    <View
                      style={[
                        styles.bar,
                        {
                          height: `${Math.max(pendingHeight, 4)}%`,
                          backgroundColor: "#eab308",
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.dayLabel, { color: colors.mutedText }]}>
                    {item.day}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#16a34a" }]} />
            <Text style={[styles.legendText, { color: colors.mutedText }]}>
              Completed
            </Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#eab308" }]} />
            <Text style={[styles.legendText, { color: colors.mutedText }]}>
              Pending
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Task Distribution Card */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={handleNavigate}
        style={[
          styles.card,
          { backgroundColor: colors.cardBg, borderColor: colors.borderColor },
        ]}
      >
        <Text style={[styles.cardTitle, { color: colors.textColor }]}>
          Task Distribution
        </Text>

        {/* Multi-Segmented Progress Bar */}
        <View style={styles.distributionBarContainer}>
          {taskDistributionData.map((item) => (
            <View
              key={item.key}
              style={[
                styles.distributionSegment,
                {
                  width: `${Math.max(item.value, 2)}%`,
                  backgroundColor: item.color,
                },
              ]}
            />
          ))}
        </View>

        {/* Legend List */}
        <View style={styles.distributionList}>
          {taskDistributionData.map((item) => (
            <View key={item.key} style={styles.distributionRow}>
              <View style={styles.distributionLabelGroup}>
                <View
                  style={[
                    styles.legendDot,
                    { backgroundColor: item.color },
                  ]}
                />
                <Text
                  style={[styles.distributionName, { color: colors.textColor }]}
                >
                  {item.name}
                </Text>
              </View>

              <Text
                style={[
                  styles.distributionVal,
                  { color: colors.mutedText },
                ]}
              >
                {item.count} ({item.value}%)
              </Text>
            </View>
          ))}
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  loadingContainer: {
    padding: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  chartArea: {
    height: 140,
    justifyContent: "flex-end",
    paddingTop: 10,
  },
  barsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 110,
  },
  barGroup: {
    flex: 1,
    alignItems: "center",
    height: "100%",
    justifyContent: "flex-end",
  },
  barsTrack: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 3,
    height: "80%",
  },
  bar: {
    width: 8,
    borderRadius: 4,
  },
  dayLabel: {
    fontSize: 10,
    marginTop: 6,
    fontWeight: "500",
  },
  legendRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginTop: 4,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    fontWeight: "500",
  },
  distributionBarContainer: {
    height: 12,
    borderRadius: 6,
    flexDirection: "row",
    overflow: "hidden",
    backgroundColor: "rgba(150, 150, 150, 0.15)",
    marginVertical: 4,
  },
  distributionSegment: {
    height: "100%",
  },
  distributionList: {
    gap: 10,
    marginTop: 4,
  },
  distributionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  distributionLabelGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  distributionName: {
    fontSize: 13,
    fontWeight: "600",
  },
  distributionVal: {
    fontSize: 12,
    fontWeight: "500",
  },
});