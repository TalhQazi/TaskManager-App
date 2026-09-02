import React, { useMemo } from "react";
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ChevronRight, Clock, AlertCircle } from "lucide-react-native";
import { apiRequest } from "@/services/api";
import { useTheme } from "@/contexts/ThemeContext";
import { isDarkTheme } from "@/constants/design/presets";

interface OverdueTask {
  _id?: string;
  id?: string;
  title: string;
  dueDate?: string;
  due_date?: string;
  deadline?: string;
  priority?: "high" | "medium" | "low" | "urgent";
}

export function DayAheadCard() {
  const router = useRouter();
  const themeContext = useTheme() as any;
  const uiTheme = themeContext?.uiTheme;
  const isDark = isDarkTheme(uiTheme?.theme);

  const colors = useMemo(() => {
    return {
      cardBg: uiTheme?.panelColors?.dashboardCardBackground || (isDark ? "#111827" : "#FFFFFF"),
      border: uiTheme?.panelColors?.borderColor || (isDark ? "rgba(255,255,255,0.08)" : "#E2E8F0"),
      borderLight: isDark ? "rgba(255,255,255,0.05)" : "#F1F5F9",
      textPrimary: isDark ? "#F8FAFC" : "#0F172A",
      textSecondary: isDark ? "#94A3B8" : "#64748B",
      textMuted: isDark ? "#64748B" : "#94A3B8",
      primary: uiTheme?.customColors?.primary || "#2563EB",
      primarySoft: isDark ? "rgba(37, 99, 235, 0.15)" : "#EFF6FF",
      danger: "#EF4444",
      dangerSoft: isDark ? "rgba(239, 68, 68, 0.15)" : "#FEE2E2",
      warning: "#F59E0B",
      warningSoft: isDark ? "rgba(245, 158, 11, 0.15)" : "#FEF3C7",
    };
  }, [uiTheme, isDark]);

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-today"],
    queryFn: async () => {
      const res = await apiRequest<any>("/dashboard/today", { method: "GET" });
      return res?.data || {};
    },
  });

  const overdueTasks: OverdueTask[] = data?.overdueTasks || [];

  const formatDueDate = (rawDate?: string) => {
    if (!rawDate) return "Overdue";
    const date = new Date(rawDate);
    if (isNaN(date.getTime())) return "Overdue";
    return `Due ${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={styles.headerTitleGroup}>
          <View style={[styles.headerIconBox, { backgroundColor: colors.dangerSoft }]}>
            <AlertTriangle size={14} color={colors.danger} />
          </View>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Overdue Tasks
          </Text>
          {overdueTasks.length > 0 && (
            <View style={[styles.countBadge, { backgroundColor: colors.dangerSoft }]}>
              <Text style={[styles.countText, { color: colors.danger }]}>{overdueTasks.length}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          onPress={() => router.push("/(admin)/task-management" as any)}
          style={styles.viewAllBtn}
          activeOpacity={0.7}
        >
          <Text style={[styles.viewAllText, { color: colors.primary }]}>View all</Text>
          <ChevronRight size={13} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator color={colors.primary} size="small" />
        </View>
      ) : overdueTasks.length > 0 ? (
        <ScrollView
          style={styles.scrollArea}
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled={true}
        >
          {overdueTasks.map((item, index) => {
            const isLastItem = index === overdueTasks.length - 1;
            const isHigh = item.priority === "high" || item.priority === "urgent";

            return (
              <TouchableOpacity
                key={item._id || item.id || String(index)}
                activeOpacity={0.7}
                onPress={() => router.push("/(admin)/task-management" as any)}
                style={[
                  styles.taskRow,
                  !isLastItem && { borderBottomColor: colors.borderLight, borderBottomWidth: 1 },
                ]}
              >
                <View style={[styles.iconBox, { backgroundColor: colors.dangerSoft }]}>
                  <AlertCircle size={14} color={colors.danger} />
                </View>

                <View style={styles.taskContent}>
                  <Text style={[styles.taskTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <View style={styles.dateRow}>
                    <Clock size={11} color={colors.danger} />
                    <Text style={[styles.taskDate, { color: colors.danger }]}>
                      {formatDueDate(item.dueDate || item.due_date || item.deadline)}
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.priorityBadge,
                    {
                      backgroundColor: isHigh ? colors.dangerSoft : colors.warningSoft,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.priorityText,
                      { color: isHigh ? colors.danger : colors.warning },
                    ]}
                  >
                    {(item.priority || "MEDIUM").toUpperCase()}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No overdue tasks! Everything is on schedule.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148, 163, 184, 0.1)",
  },
  headerTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerIconBox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countText: {
    fontSize: 11,
    fontWeight: "700",
  },
  viewAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: "600",
  },
  scrollArea: {
    maxHeight: 250,
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    gap: 12,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  taskContent: {
    flex: 1,
    justifyContent: "center",
  },
  taskTitle: {
    fontSize: 13.5,
    fontWeight: "600",
    lineHeight: 18,
    letterSpacing: -0.1,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 3,
  },
  taskDate: {
    fontSize: 11,
    fontWeight: "600",
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  priorityText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  loaderWrap: {
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 13,
    fontWeight: "500",
  },
});