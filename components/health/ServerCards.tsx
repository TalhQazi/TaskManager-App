import React, { useMemo } from "react";
import { StyleSheet, View, Text } from "react-native";
import { Server, Cpu, HardDrive, Activity } from "lucide-react-native";
import { useTheme } from "@/contexts/ThemeContext";

export function ServerCards() {
  const { uiTheme } = useTheme();
  const isDark = uiTheme?.theme !== "crystal-white";

  const colors = useMemo(() => {
    return {
      cardBg: uiTheme?.panelColors?.dashboardCardBackground || (isDark ? "#121A2F" : "#ffffff"),
      border: uiTheme?.panelColors?.borderColor || (isDark ? "rgba(255, 255, 255, 0.1)" : "#e2e8f0"),
      text: uiTheme?.panelColors?.dashboardTextColor || (isDark ? "#ffffff" : "#0f172a"),
      textMuted: isDark ? "rgba(255, 255, 255, 0.4)" : "#64748b",
      itemBg: isDark ? "rgba(255, 255, 255, 0.02)" : "#f8fafc",
      trackBg: isDark ? "rgba(255, 255, 255, 0.08)" : "#e2e8f0",
      previewBadgeBg: "rgba(59, 130, 246, 0.12)",
      previewBadgeBorder: "rgba(59, 130, 246, 0.25)",
      previewBadgeText: "#60a5fa",
    };
  }, [uiTheme, isDark]);

  return (
    <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Server size={18} color="#60a5fa" />
          <Text style={[styles.headerTitle, { color: colors.text }]}>Server Resources</Text>
        </View>

        <View
          style={[
            styles.previewBadge,
            { backgroundColor: colors.previewBadgeBg, borderColor: colors.previewBadgeBorder },
          ]}
        >
          <Text style={[styles.previewBadgeText, { color: colors.previewBadgeText }]}>
            Phase 3 Preview
          </Text>
        </View>
      </View>

      <View style={styles.previewContent}>
        {/* Mock Server 1 */}
        <View style={[styles.serverBox, { backgroundColor: colors.itemBg, borderColor: colors.border }]}>
          <View style={styles.serverMetaRow}>
            <View style={styles.serverNameGroup}>
              <View style={styles.greenPulseDot} />
              <Text style={[styles.serverNameText, { color: colors.text }]}>
                Main Application Server
              </Text>
            </View>
            <Text style={[styles.osText, { color: colors.textMuted }]}>Ubuntu 22.04</Text>
          </View>

          <View style={styles.metricsGrid}>
            <View style={styles.metricCol}>
              <View style={styles.metricLabelRow}>
                <View style={styles.iconLabelGroup}>
                  <Cpu size={12} color={colors.textMuted} />
                  <Text style={[styles.metricLabel, { color: colors.textMuted }]}>CPU</Text>
                </View>
                <Text style={[styles.metricValue, { color: "#34d399" }]}>24%</Text>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: colors.trackBg }]}>
                <View style={[styles.progressFill, { width: "24%", backgroundColor: "#34d399" }]} />
              </View>
            </View>

            <View style={styles.metricCol}>
              <View style={styles.metricLabelRow}>
                <View style={styles.iconLabelGroup}>
                  <Activity size={12} color={colors.textMuted} />
                  <Text style={[styles.metricLabel, { color: colors.textMuted }]}>RAM</Text>
                </View>
                <Text style={[styles.metricValue, { color: "#fbbf24" }]}>68%</Text>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: colors.trackBg }]}>
                <View style={[styles.progressFill, { width: "68%", backgroundColor: "#fbbf24" }]} />
              </View>
            </View>

            <View style={styles.metricCol}>
              <View style={styles.metricLabelRow}>
                <View style={styles.iconLabelGroup}>
                  <HardDrive size={12} color={colors.textMuted} />
                  <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Disk</Text>
                </View>
                <Text style={[styles.metricValue, { color: "#34d399" }]}>42%</Text>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: colors.trackBg }]}>
                <View style={[styles.progressFill, { width: "42%", backgroundColor: "#34d399" }]} />
              </View>
            </View>
          </View>
        </View>

        {/* Mock Server 2 */}
        <View style={[styles.serverBox, { backgroundColor: colors.itemBg, borderColor: colors.border }]}>
          <View style={styles.serverMetaRow}>
            <View style={styles.serverNameGroup}>
              <View style={styles.greenPulseDot} />
              <Text style={[styles.serverNameText, { color: colors.text }]}>Database Cluster</Text>
            </View>
            <Text style={[styles.osText, { color: colors.textMuted }]}>MongoDB Atlas</Text>
          </View>

          <View style={styles.metricsGrid}>
            <View style={styles.metricCol}>
              <View style={styles.metricLabelRow}>
                <View style={styles.iconLabelGroup}>
                  <Cpu size={12} color={colors.textMuted} />
                  <Text style={[styles.metricLabel, { color: colors.textMuted }]}>CPU</Text>
                </View>
                <Text style={[styles.metricValue, { color: "#34d399" }]}>12%</Text>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: colors.trackBg }]}>
                <View style={[styles.progressFill, { width: "12%", backgroundColor: "#34d399" }]} />
              </View>
            </View>

            <View style={styles.metricCol}>
              <View style={styles.metricLabelRow}>
                <View style={styles.iconLabelGroup}>
                  <Activity size={12} color={colors.textMuted} />
                  <Text style={[styles.metricLabel, { color: colors.textMuted }]}>RAM</Text>
                </View>
                <Text style={[styles.metricValue, { color: "#34d399" }]}>45%</Text>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: colors.trackBg }]}>
                <View style={[styles.progressFill, { width: "45%", backgroundColor: "#34d399" }]} />
              </View>
            </View>

            <View style={styles.metricCol}>
              <View style={styles.metricLabelRow}>
                <View style={styles.iconLabelGroup}>
                  <HardDrive size={12} color={colors.textMuted} />
                  <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Disk</Text>
                </View>
                <Text style={[styles.metricValue, { color: "#fbbf24" }]}>81%</Text>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: colors.trackBg }]}>
                <View style={[styles.progressFill, { width: "81%", backgroundColor: "#fbbf24" }]} />
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  previewBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  previewBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  previewContent: {
    gap: 16,
    opacity: 0.65,
  },
  serverBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  serverMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  serverNameGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  greenPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#34d399",
  },
  serverNameText: {
    fontSize: 14,
    fontWeight: "600",
  },
  osText: {
    fontSize: 12,
  },
  metricsGrid: {
    flexDirection: "row",
    gap: 12,
  },
  metricCol: {
    flex: 1,
    gap: 6,
  },
  metricLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  iconLabelGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metricLabel: {
    fontSize: 11,
  },
  metricValue: {
    fontSize: 11,
    fontWeight: "700",
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    width: "100%",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
});