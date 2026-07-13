import React, { useMemo } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Clock } from "lucide-react-native";
import { apiRequest } from "@/services/api";
import { commonCardStyle } from "@/constants/Styles";
import { useTheme } from "@/contexts/ThemeContext";
import { s } from "@/util/styles";

interface Task {
  _id: string;
  title: string;
  assignees?: string[];
  dueDate: string;
}

export function RecentTasksList() {
  const router = useRouter();
  const themeContext = useTheme() as any;

  const activeColors = useMemo(() => {
    const uiTheme = themeContext?.uiTheme;
    const isDark = uiTheme?.theme === "dark" || uiTheme?.theme === "metallic-elite";

    return {
      surface: uiTheme?.panelColors?.dashboardCardBackground || (isDark ? "#0f1117" : "#ffffff"),
      border: uiTheme?.panelColors?.borderColor || (isDark ? "rgba(255,255,255,0.08)" : "#e2e8f0"),
      borderLight: uiTheme?.panelColors?.borderColor || (isDark ? "rgba(255,255,255,0.04)" : "#f1f5f9"),
      text: uiTheme?.panelColors?.dashboardTextColor || (isDark ? "#ffffff" : "#0f172a"),
      textMuted: isDark ? "#94a3b8" : "#64748b",
      textLight: isDark ? "#64748b" : "#94a3b8",
      primary: uiTheme?.customColors?.primary || "#0072FF",
      primaryLight: isDark ? "rgba(0, 114, 255, 0.15)" : "#eff6ff",
    };
  }, [themeContext]);

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["recent-tasks"],
    queryFn: async () => {
      const res = await apiRequest<any>("/tasks?limit=5", { method: "GET" });
      return res?.data?.items || [];
    },
  });

  const getInitials = (name: string) => {
    if (!name) return "?";
    const parts = name.split(" ");
    const first = parts[0]?.charAt(0) || "";
    const last = parts.length > 1 ? parts[parts.length - 1]?.charAt(0) : "";
    return `${first}${last}`.toUpperCase();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const renderTask = ({ item, index }: { item: Task; index: number }) => {
    const primaryAssignee = item.assignees?.[0] || "Unassigned";
    const formattedDate = formatDate(item.dueDate);
    const isLastItem = index === tasks.length - 1;

    return (
      <TouchableOpacity 
        onPress={() => router.push("/(admin)/task-management")}
        style={[
          s(styles.taskRow), 
          !isLastItem && { borderBottomColor: activeColors.borderLight }
        ]}
      >
        <View style={[s(styles.avatar), { backgroundColor: activeColors.primaryLight }]}>
          <Text style={[s(styles.initials), { color: activeColors.primary }]}>
            {getInitials(primaryAssignee)}
          </Text>
        </View>
        <View style={s(styles.content)}>
          <Text style={[s(styles.taskTitle), { color: activeColors.text }]} numberOfLines={1}>
            {item.title}
          </Text>
          <View style={s(styles.metaRow)}>
            <Text style={[s(styles.userName), { color: activeColors.textMuted }]}>
              {primaryAssignee}
            </Text>
            <View style={[s(styles.dateContainer), { backgroundColor: activeColors.borderLight }]}>
              <Clock size={11} color={activeColors.textLight} />
              <Text style={[s(styles.dateText), { color: activeColors.textLight }]}>
                {formattedDate}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[s(styles.card), { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
      <TouchableOpacity 
        onPress={() => router.push("/(admin)/task-management")}
        style={s(styles.header)}
      >
        <Text style={[s(styles.sectionTitle), { color: activeColors.primary }]}>
          Recent Tasks
        </Text>
      </TouchableOpacity>
      <FlatList
        data={tasks}
        renderItem={renderTask}
        keyExtractor={(item) => item._id}
        scrollEnabled={false}
      />
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
  taskRow: { 
    flexDirection: "row", 
    alignItems: "center", 
    paddingVertical: 12, 
    borderBottomWidth: 1 
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    fontSize: 12,
    fontWeight: "700",
  },
  content: {
    flex: 1,
    marginLeft: 12,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  userName: {
    fontSize: 12,
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  dateText: {
    fontSize: 11,
    marginLeft: 4,
  },
});