import React, { useMemo } from "react";
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Users, ChevronRight } from "lucide-react-native";
import { apiRequest } from "@/services/api";
import { useTheme } from "@/contexts/ThemeContext";
import { isDarkTheme } from "@/constants/design/presets";

interface Employee {
  id?: string;
  _id?: string;
  name: string;
  role?: string;
  status: string;
}

const AVATAR_PALETTES = [
  { bg: "#EFF6FF", text: "#2563EB", border: "#BFDBFE" },
  { bg: "#F5F3FF", text: "#7C3AED", border: "#DDD6FE" },
  { bg: "#ECFDF5", text: "#059669", border: "#A7F3D0" },
  { bg: "#FFF7ED", text: "#EA580C", border: "#FED7AA" },
  { bg: "#EEF2FF", text: "#4F46E5", border: "#C7D2FE" },
  { bg: "#FDF2F8", text: "#DB2777", border: "#FBCFE8" },
  { bg: "#F0FDFA", text: "#0D9488", border: "#99F6E4" },
];

function getAvatarColor(name: string, isDark: boolean) {
  if (!name) {
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

interface ActiveEmployeesProps {
  basePath?: string;
}

export function ActiveEmployees({ basePath = "/(admin)/employee-directory" }: ActiveEmployeesProps) {
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
      success: "#10B981",
      successSoft: isDark ? "rgba(16, 185, 129, 0.15)" : "#D1FAE5",
    };
  }, [uiTheme, isDark]);

  const { data: employees = [], isLoading } = useQuery<Employee[]>({
    queryKey: ["active-employees"],
    queryFn: async () => {
      const res = await apiRequest<any>("/employees", { method: "GET" });
      const data = res?.data?.items || (res as any)?.items || res?.data || [];
      return data.filter((e: Employee) => e.status === "active").slice(0, 5);
    },
  });

  const getInitials = (name: string) => {
    if (!name) return "E";
    const parts = name.trim().split(" ");
    const first = parts[0]?.charAt(0) || "";
    const last = parts.length > 1 ? parts[parts.length - 1]?.charAt(0) : "";
    return `${first}${last}`.toUpperCase() || "E";
  };

  const renderEmployee = ({ item, index }: { item: Employee; index: number }) => {
    const isLastItem = index === employees.length - 1;
    const avatarColor = getAvatarColor(item.name, isDark);

    return (
      <TouchableOpacity
        key={item.id || item._id || String(index)}
        activeOpacity={0.7}
        onPress={() => router.push(basePath as any)}
        style={[
          styles.employeeRow,
          !isLastItem && { borderBottomColor: colors.borderLight, borderBottomWidth: 1 },
        ]}
      >
        <View style={[styles.avatar, { backgroundColor: avatarColor.bg, borderColor: avatarColor.border }]}>
          <Text style={[styles.initials, { color: avatarColor.text }]}>
            {getInitials(item.name)}
          </Text>
        </View>

        <View style={styles.content}>
          <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[styles.role, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.role || "Team Member"}
          </Text>
        </View>

        <View style={[styles.statusIndicator, { backgroundColor: colors.successSoft }]}>
          <View style={[styles.dot, { backgroundColor: colors.success }]} />
          <Text style={[styles.statusText, { color: colors.success }]}>Active</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={styles.headerTitleGroup}>
          <View style={[styles.headerIconBox, { backgroundColor: colors.primarySoft }]}>
            <Users size={14} color={colors.primary} />
          </View>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Active Employees
          </Text>
          {employees.length > 0 && (
            <View style={[styles.countBadge, { backgroundColor: colors.primarySoft }]}>
              <Text style={[styles.countText, { color: colors.primary }]}>{employees.length}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          onPress={() => router.push(basePath as any)}
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
      ) : employees.length > 0 ? (
        <FlatList
          data={employees}
          renderItem={renderEmployee}
          keyExtractor={(item, idx) => item.id || item._id || String(idx)}
          scrollEnabled={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No active employees found
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
  employeeRow: {
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
  name: {
    fontSize: 13.5,
    fontWeight: "600",
    lineHeight: 18,
    letterSpacing: -0.1,
  },
  role: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  statusIndicator: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10.5,
    fontWeight: "700",
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