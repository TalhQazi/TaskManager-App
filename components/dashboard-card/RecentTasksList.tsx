import React, { useMemo } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Clock, CheckCircle2, ChevronRight, AlertCircle, Calendar } from "lucide-react-native";
import { apiRequest } from "@/services/api";
import { useTheme } from "@/contexts/ThemeContext";
import { isDarkTheme } from "@/constants/design/presets";

interface Task {
  _id?: string;
  id?: string;
  title: string;
  assignees?: string[];
  dueDate?: string;
  due_date?: string;
  deadline?: string;
  targetDate?: string;
  createdAt?: string;
  priority?: "high" | "medium" | "low" | "urgent";
  status?: "pending" | "in-progress" | "completed" | "overdue";
}

// Deterministic vibrant avatar colors
const AVATAR_PALETTES = [
  { bg: "#EFF6FF", text: "#2563EB", border: "#BFDBFE" }, // Blue
  { bg: "#F5F3FF", text: "#7C3AED", border: "#DDD6FE" }, // Purple
  { bg: "#ECFDF5", text: "#059669", border: "#A7F3D0" }, // Emerald
  { bg: "#FFF7ED", text: "#EA580C", border: "#FED7AA" }, // Orange
  { bg: "#EEF2FF", text: "#4F46E5", border: "#C7D2FE" }, // Indigo
  { bg: "#FDF2F8", text: "#DB2777", border: "#FBCFE8" }, // Pink
  { bg: "#F0FDFA", text: "#0D9488", border: "#99F6E4" }, // Teal
];

function getAvatarColor(name: string, isDark: boolean) {
  if (!name || name === "Unassigned") {
    return isDark 
      ? { bg: "rgba(148, 163, 184, 0.15)", text: "#94A3B8", border: "rgba(148, 163, 184, 0.3)" }
      : { bg: "#F1F5F9", text: "#64748B", border: "#E2E8F0" };
  }
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_PALETTES.length;
  const palette = AVATAR_PALETTES[index];
  
  if (isDark) {
    return {
      bg: `${palette.text}25`,
      text: palette.text,
      border: `${palette.text}40`,
    };
  }
  return palette;
}

export function RecentTasksList() {
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
      success: "#10B981",
      successSoft: isDark ? "rgba(16, 185, 129, 0.15)" : "#D1FAE5",
      rowHover: isDark ? "rgba(255, 255, 255, 0.03)" : "#F8FAFC",
    };
  }, [uiTheme, isDark]);

  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ["recent-tasks"],
    queryFn: async () => {
      const res = await apiRequest<any>("/tasks?limit=5", { method: "GET" });
      return res?.data?.items || (res as any)?.items || [];
    },
  });

  const getInitials = (name: string) => {
    if (!name || name === "Unassigned") return "U";
    const parts = name.trim().split(" ");
    const first = parts[0]?.charAt(0) || "";
    const last = parts.length > 1 ? parts[parts.length - 1]?.charAt(0) : "";
    return `${first}${last}`.toUpperCase() || "U";
  };

  const getFormattedDate = (task: Task) => {
    const rawDate = task.dueDate || task.due_date || task.deadline || task.targetDate;
    if (!rawDate) {
      return { label: "No date", isOverdue: false, isToday: false };
    }
    const date = new Date(rawDate);
    if (isNaN(date.getTime())) {
      return { label: "No date", isOverdue: false, isToday: false };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const taskDate = new Date(date);
    taskDate.setHours(0, 0, 0, 0);

    const diffDays = Math.round((taskDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0 && task.status !== "completed") {
      return {
        label: `Overdue · ${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`,
        isOverdue: true,
        isToday: false,
      };
    }
    if (diffDays === 0) {
      return { label: "Due Today", isOverdue: false, isToday: true };
    }
    if (diffDays === 1) {
      return { label: "Tomorrow", isOverdue: false, isToday: false };
    }

    const isCurrentYear = date.getFullYear() === today.getFullYear();
    const formatted = date.toLocaleDateString(undefined, isCurrentYear ? { month: "short", day: "numeric" } : { month: "short", day: "numeric", year: "2-digit" });
    return { label: formatted, isOverdue: false, isToday: false };
  };

  const renderTask = ({ item, index }: { item: Task; index: number }) => {
    const primaryAssignee = item.assignees?.[0] || "Unassigned";
    const dateInfo = getFormattedDate(item);
    const isLastItem = index === tasks.length - 1;
    const avatarColor = getAvatarColor(primaryAssignee, isDark);
    const isCompleted = item.status === "completed";

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
        {/* User Initials Avatar */}
        <View style={[styles.avatar, { backgroundColor: avatarColor.bg, borderColor: avatarColor.border }]}>
          <Text style={[styles.initials, { color: avatarColor.text }]}>
            {getInitials(primaryAssignee)}
          </Text>
        </View>

        {/* Task Info */}
        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text
              style={[
                styles.taskTitle,
                { color: isCompleted ? colors.textMuted : colors.textPrimary },
                isCompleted && styles.completedTitle,
              ]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
          </View>

          <View style={styles.metaRow}>
            <Text style={[styles.userName, { color: colors.textSecondary }]} numberOfLines={1}>
              {primaryAssignee}
            </Text>

            {/* Date Tag */}
            <View
              style={[
                styles.dateBadge,
                dateInfo.isOverdue
                  ? { backgroundColor: colors.dangerSoft, borderColor: `${colors.danger}40` }
                  : dateInfo.isToday
                  ? { backgroundColor: colors.warningSoft, borderColor: `${colors.warning}40` }
                  : { backgroundColor: colors.borderLight, borderColor: "transparent" },
              ]}
            >
              {dateInfo.isOverdue ? (
                <AlertCircle size={11} color={colors.danger} />
              ) : (
                <Clock
                  size={11}
                  color={dateInfo.isToday ? colors.warning : colors.textSecondary}
                />
              )}
              <Text
                style={[
                  styles.dateText,
                  {
                    color: dateInfo.isOverdue
                      ? colors.danger
                      : dateInfo.isToday
                      ? colors.warning
                      : colors.textSecondary,
                    fontWeight: dateInfo.isOverdue || dateInfo.isToday ? "700" : "500",
                  },
                ]}
              >
                {dateInfo.label}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
      {/* Header with Title and "View All" */}
      <View style={styles.header}>
        <View style={styles.headerTitleGroup}>
          <View style={[styles.headerIconBox, { backgroundColor: colors.primarySoft }]}>
            <CheckCircle2 size={14} color={colors.primary} />
          </View>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Recent Tasks
          </Text>
          {tasks.length > 0 && (
            <View style={[styles.countBadge, { backgroundColor: colors.primarySoft }]}>
              <Text style={[styles.countText, { color: colors.primary }]}>{tasks.length}</Text>
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

      {/* Task List */}
      {tasks.length > 0 ? (
        <FlatList
          data={tasks}
          renderItem={renderTask}
          keyExtractor={(item, idx) => item._id || item.id || String(idx)}
          scrollEnabled={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {isLoading ? "Loading tasks..." : "No recent tasks found"}
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
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    gap: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  initials: {
    fontSize: 12,
    fontWeight: "700",
  },
  content: {
    flex: 1,
    justifyContent: "center",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  taskTitle: {
    fontSize: 13.5,
    fontWeight: "600",
    lineHeight: 18,
    letterSpacing: -0.1,
  },
  completedTitle: {
    textDecorationLine: "line-through",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
    gap: 8,
  },
  userName: {
    fontSize: 12,
    fontWeight: "500",
    flex: 1,
  },
  dateBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 0.5,
    gap: 4,
  },
  dateText: {
    fontSize: 10.5,
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