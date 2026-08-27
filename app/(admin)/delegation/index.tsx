import React, { useMemo } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { ShieldCheck, Users, ArrowRight } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useTheme } from "@/contexts/ThemeContext";
import { isDarkTheme } from "@/constants/design/presets";

export default function DelegationHubScreen() {
  const router = useRouter();
  const { uiTheme } = useTheme();
  const isDark = isDarkTheme(uiTheme?.theme);

  const colors = useMemo(
    () => ({
      background: uiTheme.panelColors?.dashboardBackground || (isDark ? "#0f172a" : "#f8fafc"),
      cardBg: uiTheme.panelColors?.dashboardCardBackground || (isDark ? "#1e293b" : "#ffffff"),
      text: uiTheme.panelColors?.dashboardTextColor || (isDark ? "#f8fafc" : "#0f172a"),
      textMuted: isDark ? "#94a3b8" : "#64748b",
      border: isDark ? "#334155" : "#e2e8f0",
      primary: uiTheme.customColors?.primary || "#8b5cf6",
    }),
    [uiTheme, isDark]
  );

  const modules = [
    { title: "Task Permissions Matrix", path: "/(admin)/delegation/TaskPermissions", desc: "Granular access control per task & project", icon: ShieldCheck, color: "#8b5cf6" },
    { title: "Team Lead Mappings", path: "/(admin)/delegation/TeamLeadMappings", desc: "Assign team leaders to staff groups", icon: Users, color: "#3b82f6" },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Delegation Control Center</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Permission Management & Leadership Hierarchy Architecture
          </Text>
        </View>

        <View style={styles.grid}>
          {modules.map((m, i) => {
            const Icon = m.icon;
            return (
              <TouchableOpacity
                key={i}
                style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
                onPress={() => router.push(m.path as any)}
              >
                <View style={[styles.iconBox, { backgroundColor: `${m.color}20` }]}>
                  <Icon size={22} color={m.color} />
                </View>
                <View style={styles.info}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>{m.title}</Text>
                  <Text style={[styles.cardDesc, { color: colors.textMuted }]}>{m.desc}</Text>
                </View>
                <ArrowRight size={18} color={colors.textMuted} />
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  header: { marginBottom: 20 },
  title: { fontSize: 22, fontWeight: "700" },
  subtitle: { fontSize: 13, marginTop: 4 },
  grid: { gap: 12 },
  card: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 12, borderWidth: 1 },
  iconBox: { width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center" },
  info: { flex: 1, marginLeft: 14 },
  cardTitle: { fontSize: 16, fontWeight: "600" },
  cardDesc: { fontSize: 12, marginTop: 2 },
});