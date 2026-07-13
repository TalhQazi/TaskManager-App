import React, { useState, useEffect, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, LayoutAnimation, Platform, UIManager } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Flame, Clock } from "lucide-react-native";
import { apiRequest } from "@/services/api";
import { commonCardStyle } from "@/constants/Styles";
import { useTheme } from "@/contexts/ThemeContext";
import { s } from "@/util/styles";

if (Platform.OS === "android") {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

interface Task {
  _id: string;
  title: string;
  priority: "high" | "medium" | "low";
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
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  const activeColors = useMemo(() => {
    const uiTheme = themeContext?.uiTheme;
    const isDark = uiTheme?.theme === "dark" || uiTheme?.theme === "metallic-elite";

    return {
      surface: uiTheme?.panelColors?.dashboardCardBackground || (isDark ? "#0f1117" : "#ffffff"),
      border: uiTheme?.panelColors?.borderColor || (isDark ? "rgba(255,255,255,0.08)" : "#e2e8f0"),
      borderLight: uiTheme?.panelColors?.borderColor || (isDark ? "rgba(255,255,255,0.04)" : "#f1f5f9"),
      surfaceVariant: isDark ? "rgba(255,255,255,0.06)" : "#f1f5f9",
      text: uiTheme?.panelColors?.dashboardTextColor || (isDark ? "#ffffff" : "#0f172a"),
      textMuted: isDark ? "#94a3b8" : "#64748b",
      textLight: isDark ? "#64748b" : "#94a3b8",
      primary: uiTheme?.customColors?.primary || "#0072FF",
      danger: "#ef4444",
    };
  }, [themeContext]);

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
    }
  }, [data, expandedDay]);

  const toggleDay = (date: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedDay((prev) => (prev === date ? null : date));
  };

  const days = data?.days || [];
  const activeDay = days.find((d) => d.date === expandedDay);

  return (
    <View style={[s(styles.card), { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
      <View style={s(styles.header)}>
        <Text style={[s(styles.sectionTitle), { color: activeColors.primary }]}>
          Week Ahead
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s(styles.daysRow)}>
        {days.map((day) => {
          const isSelected = expandedDay === day.date;
          return (
            <TouchableOpacity
              key={day.date}
              onPress={() => toggleDay(day.date)}
              style={[
                s(styles.dayTab),
                { backgroundColor: activeColors.surfaceVariant, borderColor: activeColors.border },
                isSelected && [s(styles.activeTab), { backgroundColor: activeColors.primary, borderColor: activeColors.primary }],
              ]}
            >
              <Text style={[s(styles.dayLabel), { color: isSelected ? "#ffffff" : activeColors.textMuted }]}>
                {day.label}
              </Text>
              {/* Fixed: Unselected day number now properly tints to activeColors.textMuted instead of white */}
              <Text style={[s(styles.dayDate), { color: isSelected ? "#ffffff" : activeColors.textMuted }]}>
                {new Date(day.date).getDate()}
              </Text>
              {day.highPriorityCount > 0 && !isSelected && (
                <Flame size={12} color={activeColors.danger} style={s(styles.flameIcon)} />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {activeDay && (
        <View style={[s(styles.taskList), { backgroundColor: activeColors.surfaceVariant }]}>
          <View style={s(styles.dayHeader)}>
            <Text style={[s(styles.dayName), { color: activeColors.text }]}>{activeDay.dayName}</Text>
            <Text style={[s(styles.taskCount), { color: activeColors.textMuted }]}>
              {activeDay.tasks?.length || 0} Tasks
            </Text>
          </View>

          {(activeDay.tasks || []).length > 0 ? (
            activeDay.tasks.map((task, index) => {
              const isLastItem = index === activeDay.tasks.length - 1;
              return (
                <View 
                  key={task._id} 
                  style={[
                    s(styles.taskItem), 
                    !isLastItem && { borderBottomColor: activeColors.borderLight }
                  ]}
                >
                  <View 
                    style={[
                      s(styles.dot), 
                      { backgroundColor: task.priority === "high" ? activeColors.danger : activeColors.primary }
                    ]} 
                  />
                  <Text style={[s(styles.taskTitle), { color: activeColors.text }]} numberOfLines={1}>
                    {task.title}
                  </Text>
                  {task.dueTime && (
                    <View style={s(styles.timeTag)}>
                      <Clock size={11} color={activeColors.textLight} />
                      <Text style={[s(styles.timeText), { color: activeColors.textLight }]}>{task.dueTime}</Text>
                    </View>
                  )}
                </View>
              );
            })
          ) : (
            <Text style={[s(styles.noTasks), { color: activeColors.textLight }]}>No tasks scheduled</Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { 
    ...commonCardStyle, 
    borderRadius: 16, 
    padding: 16, 
    marginTop: 16, 
    borderWidth: 1 
  },
  header: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    marginBottom: 12 
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  daysRow: { 
    flexDirection: "row", 
    marginBottom: 4 
  },
  dayTab: { 
    width: 50, 
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 12, 
    alignItems: "center", 
    marginRight: 8, 
    borderWidth: 1 
  },
  activeTab: {},
  dayLabel: { 
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase"
  },
  dayDate: { 
    fontSize: 16, 
    fontWeight: "700", 
    marginTop: 4 
  },
  flameIcon: {
    marginTop: 4,
  },
  taskList: { 
    marginTop: 12, 
    padding: 12, 
    borderRadius: 12 
  },
  dayHeader: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center",
    marginBottom: 8 
  },
  dayName: { 
    fontWeight: "700", 
    fontSize: 13 
  },
  taskCount: { 
    fontSize: 11,
    fontWeight: "500",
  },
  taskItem: { 
    flexDirection: "row", 
    alignItems: "center", 
    paddingVertical: 10, 
    borderBottomWidth: 1 
  },
  dot: { 
    width: 6, 
    height: 6, 
    borderRadius: 3, 
    marginRight: 10 
  },
  taskTitle: { 
    flex: 1, 
    fontSize: 13,
    fontWeight: "500",
  },
  timeTag: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 4 
  },
  timeText: { 
    fontSize: 11 
  },
  noTasks: { 
    textAlign: "center", 
    fontSize: 12, 
    paddingVertical: 12 
  }
});