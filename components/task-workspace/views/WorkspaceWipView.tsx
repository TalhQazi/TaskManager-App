import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Activity, ArrowRight, Clock, ShieldCheck, Zap } from "lucide-react-native";
import { useTaskTheme } from "@/components/tasks/theme";
import { WipDashboardWidget } from "@/components/wip/WipDashboardWidget";

export default function WorkspaceWipView() {
  const theme = useTaskTheme();
  const router = useRouter();

  const handleOpenWip = () => {
    try {
      router.push("/(admin)/wip" as any);
    } catch {
      router.push("/(admin)/home" as any);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.bg.canvas }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Live WIP Widget */}
      <WipDashboardWidget />

      {/* Overview Card */}
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.bg.surface,
            borderColor: theme.border.default,
          },
        ]}
      >
        <View
          style={[
            styles.iconWrapper,
            { backgroundColor: theme.accent.primarySoft },
          ]}
        >
          <Activity size={28} color={theme.accent.primary} />
        </View>

        <Text style={[styles.title, { color: theme.text.primary }]}>
          Work In Progress System
        </Text>
        <Text style={[styles.description, { color: theme.text.secondary }]}>
          Real-time tracking of active employee sessions, elapsed time per task,
          active break states, and blocker notifications.
        </Text>

        <View style={styles.featuresList}>
          <View style={styles.featureItem}>
            <Clock size={16} color={theme.accent.primary} />
            <Text style={[styles.featureText, { color: theme.text.secondary }]}>
              Live session timers and clocked-in team status
            </Text>
          </View>
          <View style={styles.featureItem}>
            <Zap size={16} color="#F59E0B" />
            <Text style={[styles.featureText, { color: theme.text.secondary }]}>
              Instant detection of blocked tasks and paused progress
            </Text>
          </View>
          <View style={styles.featureItem}>
            <ShieldCheck size={16} color="#10B981" />
            <Text style={[styles.featureText, { color: theme.text.secondary }]}>
              Automated productivity analytics and capacity monitoring
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: theme.accent.primary }]}
          onPress={handleOpenWip}
          activeOpacity={0.8}
        >
          <Text style={styles.actionBtnText}>Open Full WIP Dashboard</Text>
          <ArrowRight size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 14,
    gap: 16,
    paddingBottom: 40,
  },
  card: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    textAlign: "center",
    gap: 12,
  },
  iconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  description: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  featuresList: {
    alignSelf: "stretch",
    gap: 10,
    marginTop: 6,
    paddingHorizontal: 6,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  featureText: {
    fontSize: 13,
    fontWeight: "500",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    alignSelf: "stretch",
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  actionBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});
