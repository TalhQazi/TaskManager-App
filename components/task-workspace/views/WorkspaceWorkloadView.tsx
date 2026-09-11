import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from "react-native";
import { AlertTriangle, Flag, ArrowRight } from "lucide-react-native";
import { useTaskWorkspace } from "../TaskWorkspaceContext";
import { useTaskAnalyticsWorkload, WorkloadRow } from "../data/workspaceApi";
import { useTaskTheme } from "@/components/tasks/theme";
import { ViewLoading, ViewEmpty, initials } from "./shared";

export default function WorkspaceWorkloadView() {
  const theme = useTaskTheme();
  const { setFilters, setView } = useTaskWorkspace();
  const { data: rows, isLoading, isRefetching, refetch } = useTaskAnalyticsWorkload();

  if (isLoading) return <ViewLoading label="Loading workload analytics…" />;
  if (!rows || rows.length === 0) {
    return <ViewEmpty label="No active assignments found." />;
  }

  const maxActive = Math.max(...rows.map((r: WorkloadRow) => r.active), 1);

  const handleSelectAssignee = (assignee: string) => {
    setFilters({ assignment: assignee });
    setView("card");
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.bg.canvas }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          tintColor={theme.accent.primary}
        />
      }
    >
      <View style={styles.headerInfo}>
        <Text style={[styles.heading, { color: theme.text.primary }]}>
          Assignee Capacity & Utilization
        </Text>
        <Text style={[styles.subheading, { color: theme.text.secondary }]}>
          Tap any member to view their assigned tasks
        </Text>
      </View>

      {rows.map((r: WorkloadRow) => {
        const util = r.utilizationPct;
        const barPct =
          util != null
            ? Math.min(Math.max(util, 0), 100)
            : Math.round((r.active / maxActive) * 100);

        const barColor =
          util == null
            ? "#3B82F6"
            : util > 100
            ? "#EF4444"
            : util > 80
            ? "#F59E0B"
            : "#10B981";

        return (
          <TouchableOpacity
            key={r.assignee}
            style={[
              styles.card,
              {
                backgroundColor: theme.bg.surface,
                borderColor: theme.border.default,
              },
            ]}
            onPress={() => handleSelectAssignee(r.assignee)}
            activeOpacity={0.7}
          >
            {/* Left Avatar */}
            <View
              style={[
                styles.avatar,
                { backgroundColor: theme.accent.primarySoft },
              ]}
            >
              <Text
                style={[styles.avatarText, { color: theme.accent.primary }]}
              >
                {initials(r.assignee)}
              </Text>
            </View>

            {/* Middle Content */}
            <View style={styles.middle}>
              <View style={styles.nameRow}>
                <Text
                  style={[styles.assigneeName, { color: theme.text.primary }]}
                  numberOfLines={1}
                >
                  {r.assignee}
                </Text>
                <View style={styles.utilBadge}>
                  <Text
                    style={[styles.activeText, { color: theme.text.secondary }]}
                  >
                    {r.active} active
                  </Text>
                  {util != null && (
                    <Text
                      style={[
                        styles.utilText,
                        { color: util > 100 ? "#EF4444" : theme.text.secondary },
                      ]}
                    >
                      {" "}· {util}%
                    </Text>
                  )}
                </View>
              </View>

              {/* Utilization Progress Bar */}
              <View
                style={[
                  styles.barTrack,
                  { backgroundColor: theme.bg.surfaceRaised },
                ]}
              >
                <View
                  style={[
                    styles.barFill,
                    { width: `${barPct}%`, backgroundColor: barColor },
                  ]}
                />
              </View>

              {/* Metrics footer */}
              <View style={styles.metricsRow}>
                {r.highPriority > 0 && (
                  <View style={styles.metricItem}>
                    <Flag size={12} color="#F59E0B" />
                    <Text style={[styles.metricText, { color: "#F59E0B" }]}>
                      {r.highPriority} high
                    </Text>
                  </View>
                )}
                {r.overdue > 0 && (
                  <View style={styles.metricItem}>
                    <AlertTriangle size={12} color="#EF4444" />
                    <Text style={[styles.metricText, { color: "#EF4444" }]}>
                      {r.overdue} overdue
                    </Text>
                  </View>
                )}
                <Text
                  style={[styles.metricText, { color: theme.text.tertiary }]}
                >
                  ~{r.estimatedHours}h
                  {r.weeklyHours ? ` / ${r.weeklyHours}h` : ""}
                </Text>
              </View>
            </View>

            <ArrowRight size={16} color={theme.text.tertiary} />
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 14,
    gap: 10,
    paddingBottom: 40,
  },
  headerInfo: {
    marginBottom: 4,
  },
  heading: {
    fontSize: 16,
    fontWeight: "700",
  },
  subheading: {
    fontSize: 12,
    marginTop: 2,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 13,
    fontWeight: "700",
  },
  middle: {
    flex: 1,
    gap: 6,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  assigneeName: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  utilBadge: {
    flexDirection: "row",
    alignItems: "center",
  },
  activeText: {
    fontSize: 12,
    fontWeight: "500",
  },
  utilText: {
    fontSize: 12,
    fontWeight: "700",
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 3,
  },
  metricsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  metricItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  metricText: {
    fontSize: 11,
    fontWeight: "500",
  },
});
