import React, { useState, useEffect, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, LayoutAnimation, Platform, UIManager } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Flame, Clock, CalendarDays } from "lucide-react-native";
import { apiRequest } from "@/services/api";
import { useTheme } from "@/contexts/ThemeContext";
import { isDarkTheme } from "@/constants/design/presets";

if (Platform.OS === "android") {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

interface Task {
  _id: string;
  title: string;
  priority: "high" | "medium" | "low" | "urgent";
  dueTime?: string;
}

interface DayData {
  date: string;
  label: string;
  dayName: string;
  isToday: boolean;
  highPriorityCount: number;
  tasks: Task[];
}

interface WeekData {
  days: DayData[];
}

export function WeekAheadCard() {
  const themeContext = useTheme() as any;
  const uiTheme = themeContext?.uiTheme;
  const isDark = isDarkTheme(uiTheme?.theme);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  const colors = useMemo(() => {
    return {
      cardBg: uiTheme?.panelColors?.dashboardCardBackground || (isDark ? "#111827" : "#FFFFFF"),
      border: uiTheme?.panelColors?.borderColor || (isDark ? "rgba(255,255,255,0.08)" : "#E2E8F0"),
      borderLight: isDark ? "rgba(255,255,255,0.05)" : "#F1F5F9",
      surfaceVariant: isDark ? "rgba(255,255,255,0.04)" : "#F8FAFC",
      textPrimary: isDark ? "#F8FAFC" : "#0F172A",
      textSecondary: isDark ? "#94A3B8" : "#64748B",
      textMuted: isDark ? "#64748B" : "#94A3B8",
      primary: uiTheme?.customColors?.primary || "#2563EB",
      primarySoft: isDark ? "rgba(37, 99, 235, 0.15)" : "#EFF6FF",
      danger: "#EF4444",
      dangerSoft: isDark ? "rgba(239, 68, 68, 0.15)" : "#FEE2E2",
      warning: "#F59E0B",
    };
  }, [uiTheme, isDark]);

  const { data } = useQuery<WeekData | null>({
    queryKey: ["dashboard-week"],
    queryFn: async () => {
      const res = await apiRequest<any>("/dashboard/week", { method: "GET" });
      return res?.data || null;
    },
  });

  useEffect(() => {
    if (data?.days && !expandedDay) {
      const today = data.days.find((d) => d.isToday);
      if (today) setExpandedDay(today.date);
      else if (data.days[0]) setExpandedDay(data.days[0].date);
    }
  }, [data, expandedDay]);

  const toggleDay = (date: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedDay((prev) => (prev === date ? null : date));
  };

  const days = data?.days || [];
  const activeDay = days.find((d) => d.date === expandedDay);

  const getSafeDayNumber = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? "" : d.getDate();
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={styles.headerTitleGroup}>
          <View style={[styles.headerIconBox, { backgroundColor: colors.primarySoft }]}>
            <CalendarDays size={14} color={colors.primary} />
          </View>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Week Ahead
          </Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daysRow}>
        {days.map((day) => {
          const isSelected = expandedDay === day.date;
          const dayNumber = getSafeDayNumber(day.date);

          return (
            <TouchableOpacity
              key={day.date}
              onPress={() => toggleDay(day.date)}
              activeOpacity={0.7}
              style={[
                styles.dayTab,
                { backgroundColor: colors.surfaceVariant, borderColor: colors.border },
                isSelected && [styles.activeTab, { backgroundColor: colors.primary, borderColor: colors.primary }],
              ]}
            >
              <Text
                style={[
                  styles.dayLabel,
                  { color: isSelected ? "#FFFFFF" : colors.textSecondary },
                ]}
              >
                {day.label}
              </Text>
              <Text
                style={[
                  styles.dayDate,
                  { color: isSelected ? "#FFFFFF" : colors.textPrimary },
                ]}
              >
                {dayNumber}
              </Text>
              {day.highPriorityCount > 0 && !isSelected && (
                <Flame size={12} color={colors.danger} style={styles.flameIcon} />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {activeDay && (
        <View style={[styles.taskList, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
          <View style={styles.dayHeader}>
            <Text style={[styles.dayName, { color: colors.textPrimary }]}>{activeDay.dayName}</Text>
            <View style={[styles.taskCountBadge, { backgroundColor: colors.cardBg }]}>
              <Text style={[styles.taskCount, { color: colors.textSecondary }]}>
                {activeDay.tasks?.length || 0} Tasks
              </Text>
            </View>
          </View>

          {(activeDay.tasks || []).length > 0 ? (
            activeDay.tasks.map((task, index) => {
              const isLastItem = index === activeDay.tasks.length - 1;
              const isHigh = task.priority === "high" || task.priority === "urgent";

              return (
                <View
                  key={task._id || String(index)}
                  style={[
                    styles.taskItem,
                    !isLastItem && { borderBottomColor: colors.borderLight, borderBottomWidth: 1 },
                  ]}
                >
                  <View
                    style={[
                      styles.dot,
                      { backgroundColor: isHigh ? colors.danger : colors.primary },
                    ]}
                  />
                  <Text style={[styles.taskTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                    {task.title}
                  </Text>
                  {task.dueTime && (
                    <View style={[styles.timeTag, { backgroundColor: colors.cardBg }]}>
                      <Clock size={10} color={colors.textSecondary} />
                      <Text style={[styles.timeText, { color: colors.textSecondary }]}>{task.dueTime}</Text>
                    </View>
                  )}
                </View>
              );
            })
          ) : (
            <Text style={[styles.noTasks, { color: colors.textSecondary }]}>No tasks scheduled</Text>
          )}
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
  daysRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  dayTab: {
    width: 52,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 12,
    alignItems: "center",
    marginRight: 8,
    borderWidth: 1,
  },
  activeTab: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  dayLabel: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  dayDate: {
    fontSize: 15,
    fontWeight: "800",
    marginTop: 4,
  },
  flameIcon: {
    marginTop: 4,
  },
  taskList: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 0.5,
  },
  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  dayName: {
    fontWeight: "700",
    fontSize: 13,
  },
  taskCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  taskCount: {
    fontSize: 11,
    fontWeight: "600",
  },
  taskItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  taskTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
  },
  timeTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  timeText: {
    fontSize: 10.5,
    fontWeight: "500",
  },
  noTasks: {
    textAlign: "center",
    fontSize: 12,
    paddingVertical: 12,
    fontWeight: "500",
  },
});