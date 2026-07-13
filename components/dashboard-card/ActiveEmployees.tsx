import React, { useMemo } from "react";
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/services/api";
import { commonCardStyle } from "@/constants/Styles";
import { useTheme } from "@/contexts/ThemeContext";
import { s } from "@/util/styles";

interface Employee {
  id: string;
  name: string;
  role?: string;
  status: string;
}

interface ActiveEmployeesProps {
  basePath?: string;
}

export function ActiveEmployees({ basePath = "/(manager)/team" }: ActiveEmployeesProps) {
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
      primary: uiTheme?.customColors?.primary || "#0072FF",
      primaryLight: isDark ? "rgba(0, 114, 255, 0.15)" : "#eff6ff",
      success: "#16a34a",
      successBg: isDark ? "rgba(22, 163, 74, 0.15)" : "#dcfce7",
    };
  }, [themeContext]);

 const { data: employees = [], isLoading } = useQuery<Employee[]>({
  queryKey: ["active-employees"],
  queryFn: async () => {
    const res = await apiRequest<any>("/employees", { method: "GET" });
    const data = res?.data?.items || (res as any)?.items || res?.data || [];
    return data.filter((e: Employee) => e.status === "active").slice(0, 3);
  },
});

  const renderEmployee = ({ item, index }: { item: Employee; index: number }) => {
    const isLastItem = index === employees.length - 1;

    return (
      <View 
        style={[
          s(styles.employeeRow), 
          !isLastItem && { borderBottomColor: activeColors.borderLight }
        ]}
      >
        <View style={[s(styles.avatar), { backgroundColor: activeColors.primaryLight }]}>
          <Text style={[s(styles.initials), { color: activeColors.primary }]}>
            {item.name?.charAt(0).toUpperCase()}
          </Text>
        </View>
        
        <View style={s(styles.content)}>
          <Text style={[s(styles.name), { color: activeColors.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[s(styles.role), { color: activeColors.textMuted }]}>
            {item.role || "Member"}
          </Text>
        </View>

        <View style={[s(styles.statusIndicator), { backgroundColor: activeColors.successBg }]}>
          <View style={[s(styles.dot), { backgroundColor: activeColors.success }]} />
          <Text style={[s(styles.statusText), { color: activeColors.success }]}>Active</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[s(styles.card), { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
      <View style={s(styles.header)}>
        <Text style={[s(styles.sectionTitle), { color: activeColors.primary }]}>
          Active Employees
        </Text>
        <TouchableOpacity onPress={() => router.push(basePath as any)} />
      </View>

      {isLoading ? (
        <ActivityIndicator color={activeColors.primary} style={s(styles.loader)} />
      ) : (
        <FlatList
          data={employees}
          renderItem={renderEmployee}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
        />
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
  employeeRow: { 
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
    fontSize: 14,
    fontWeight: "700",
  },
  content: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontSize: 14,
    fontWeight: "600",
  },
  role: {
    fontSize: 12,
    marginTop: 2,
  },
  statusIndicator: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
  },
  loader: {
    paddingVertical: 20,
  },
});