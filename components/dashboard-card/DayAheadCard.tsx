import React, { useMemo } from "react";
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react-native";
import { apiRequest } from "@/services/api";
import { commonCardStyle } from "@/constants/Styles";
import { useTheme } from "@/contexts/ThemeContext";
import { s } from "@/util/styles";

interface OverdueTask {
  _id: string;
  title: string;
  dueDate: string;
  priority: "high" | "medium" | "low";
}

export function DayAheadCard() {
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
      danger: "#ef4444",
      dangerBg: isDark ? "rgba(239, 68, 68, 0.15)" : "#fee2e2",
    };
  }, [themeContext]);

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-today"],
    queryFn: async () => {
      const res = await apiRequest<any>("/dashboard/today", { method: "GET" });
      return res?.data || {};
    },
  });

  if (isLoading) {
    return <ActivityIndicator style={s(styles.loader)} color={activeColors.primary} />;
  }

  const overdueTasks: OverdueTask[] = data?.overdueTasks || [];

  return (
    <View style={[s(styles.card), { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
      <TouchableOpacity 
        onPress={() => router.push("/(admin)/task-management")}
        style={s(styles.header)}
      >
        <Text style={[s(styles.sectionTitle), { color: activeColors.primary }]}>
          Overdue Tasks ({overdueTasks.length})
        </Text>
      </TouchableOpacity>

      <ScrollView 
        style={s(styles.scrollArea)} 
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}
      >
        {overdueTasks.map((item, index) => {
          const isLastItem = index === overdueTasks.length - 1;
          
          return (
            <TouchableOpacity 
              key={item._id} 
              onPress={() => router.push("/(admin)/task-management")}
              style={[
                s(styles.taskRow), 
                !isLastItem && { borderBottomColor: activeColors.borderLight }
              ]}
            >
              <View style={[s(styles.iconBox), { backgroundColor: activeColors.dangerBg }]}>
                <AlertTriangle size={14} color={activeColors.danger} />
              </View>
              
              <View style={s(styles.taskContent)}>
                <Text style={[s(styles.taskTitle), { color: activeColors.text }]} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={[s(styles.taskDate), { color: activeColors.textLight }]}>
                  Due: {new Date(item.dueDate).toLocaleDateString()}
                </Text>
              </View>
              
              <View 
                style={[
                  s(styles.priorityBadge), 
                  { backgroundColor: item.priority === "high" ? activeColors.dangerBg : activeColors.borderLight }
                ]}
              >
                <Text 
                  style={[
                    s(styles.priorityText), 
                    { color: item.priority === "high" ? activeColors.danger : activeColors.textMuted }
                  ]}
                >
                  {item.priority.toUpperCase()}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
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
  scrollArea: { 
    maxHeight: 250 
  }, 
  taskRow: { 
    flexDirection: "row", 
    alignItems: "center", 
    paddingVertical: 12, 
    borderBottomWidth: 1 
  },
  iconBox: { 
    width: 32, 
    height: 32, 
    borderRadius: 16, 
    alignItems: "center", 
    justifyContent: "center", 
    marginRight: 12 
  },
  taskContent: { 
    flex: 1 
  },
  taskTitle: { 
    fontSize: 13, 
    fontWeight: "600" 
  },
  taskDate: { 
    fontSize: 11,
    marginTop: 2,
  },
  priorityBadge: { 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 12, 
    alignItems: "center", 
    justifyContent: "center" 
  },
  priorityText: { 
    fontSize: 10, 
    fontWeight: "700" 
  },
  loader: { 
    marginTop: 20 
  }
});