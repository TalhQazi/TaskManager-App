import React, { useEffect, useMemo, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { AlertCircle, Clock, TrendingDown } from "lucide-react-native";
import { apiFetch } from "@/lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";

interface ExpiringPatent {
  _id: string;
  patentName: string;
  status: string;
  provisionalExpiration: string;
  daysUntilExpiration: number;
  category?: string;
  applicationNumber?: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const getUrgencyTheme = (level: "critical" | "high" | "medium" | "low", isDark: boolean) => {
  switch (level) {
    case "critical":
      return { 
        bg: isDark ? "rgba(239, 68, 68, 0.15)" : "rgba(239, 68, 68, 0.08)", 
        text: isDark ? "#f87171" : "#B91C1C", 
        border: isDark ? "rgba(239, 68, 68, 0.4)" : "#FCA5A5" 
      };
    case "high":
      return { 
        bg: isDark ? "rgba(249, 115, 22, 0.15)" : "rgba(249, 115, 22, 0.08)", 
        text: isDark ? "#fb923c" : "#C2410C", 
        border: isDark ? "rgba(249, 115, 22, 0.4)" : "#FDBA74" 
      };
    case "medium":
      return { 
        bg: isDark ? "rgba(234, 179, 8, 0.15)" : "rgba(234, 179, 8, 0.08)", 
        text: isDark ? "#facc15" : "#A16207", 
        border: isDark ? "rgba(234, 179, 8, 0.4)" : "#FDE047" 
      };
    case "low":
      return { 
        bg: isDark ? "rgba(59, 130, 246, 0.15)" : "rgba(59, 130, 246, 0.08)", 
        text: isDark ? "#60a5fa" : "#1D4ED8", 
        border: isDark ? "rgba(59, 130, 246, 0.4)" : "#93C5FD" 
      };
  }
};

const getUrgencyLevel = (daysRemaining: number): "critical" | "high" | "medium" | "low" => {
  if (daysRemaining <= 30) return "critical";
  if (daysRemaining <= 60) return "high";
  if (daysRemaining <= 90) return "medium";
  return "low";
};

export function ExpirationWatch() {
  const { uiTheme } = useTheme();
  const [patents, setPatents] = useState<ExpiringPatent[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const isDark = (uiTheme.theme as string) === "dark" || (uiTheme.theme as string) === "metallic-elite";

  const colors = useMemo(() => ({
    background: uiTheme.panelColors?.dashboardBackground || (isDark ? "#0f172a" : "#f8fafc"),
    cardBg: uiTheme.panelColors?.dashboardCardBackground || (isDark ? "#1e293b" : "#ffffff"),
    text: uiTheme.panelColors?.dashboardTextColor || (isDark ? "#f8fafc" : "#0f172a"),
    mutedText: isDark ? "#94a3b8" : "#64748b",
    border: isDark ? "#334155" : "#e2e8f0",
    headerBg: isDark ? "#0f172a" : "#fafafa",
    infoCardBg: isDark ? "rgba(59, 130, 246, 0.1)" : "#EFF6FF",
    infoCardBorder: isDark ? "rgba(59, 130, 246, 0.25)" : "#BFDBFE",
    infoCardText: isDark ? "#60a5fa" : "#1E40AF",
    infoCardBody: isDark ? "#93c5fd" : "#1E3A8A",
    primary: uiTheme.customColors?.primary || "#2563eb",
    success: "#16A34A",
  }), [uiTheme, isDark]);

  const styles = useMemo(() => createStyles(colors), [colors]);

  const fetchExpiringPatents = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch<{ items: ExpiringPatent[] }>("/api/patents/expiration-watch");
      setPatents(res.items || []);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExpiringPatents();
  }, []);

  const groupsAndStats = useMemo(() => {
    const critical = patents.filter((p) => getUrgencyLevel(p.daysUntilExpiration) === "critical");
    const high = patents.filter((p) => getUrgencyLevel(p.daysUntilExpiration) === "high");
    const medium = patents.filter((p) => getUrgencyLevel(p.daysUntilExpiration) === "medium");
    const low = patents.filter((p) => getUrgencyLevel(p.daysUntilExpiration) === "low");

    const urgencyStats = [
      { label: "Critical Expirations", count: critical.length, color: "#DC2626", key: "critical" },
      { label: "High Priority", count: high.length, color: "#EA580C", key: "high" },
      { label: "Medium Priority", count: medium.length, color: "#CA8A04", key: "medium" },
      { label: "Low Priority", count: low.length, color: "#2563EB", key: "low" },
    ];

    const urgencyGroups = [
      { key: "critical" as const, label: "Critical (≤30 days)", count: critical.length, items: critical },
      { key: "high" as const, label: "High (31-60 days)", count: high.length, items: high },
      { key: "medium" as const, label: "Medium (61-90 days)", count: medium.length, items: medium },
      { key: "low" as const, label: "Low (91+ days)", count: low.length, items: low },
    ];

    return { urgencyStats, urgencyGroups };
  }, [patents]);

  return (
    <ScrollView style={styles.containerWrapper} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.headerBlock}>
        <Text style={styles.headerTitle}>Expiration Watch</Text>
        <Text style={styles.headerSubtitle}>
          Monitor patent expirations with 180, 120, 90, 60, and 30-day alerts
        </Text>
      </View>

      <View style={styles.statsGridRowWrap}>
        {groupsAndStats.urgencyStats.map((stat) => (
          <View key={stat.key} style={styles.statMiniCard}>
            <View style={styles.statMiniCardHeader}>
              <Text style={styles.statMiniCardLabel} numberOfLines={1}>
                {stat.label}
              </Text>
              <TrendingDown size={14} color={stat.color} />
            </View>
            <Text style={[styles.statMiniCardCount, { color: stat.color }]}>
              {stat.count}
            </Text>
          </View>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.centeredStateView}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.informationalTextState}>Parsing system document rules...</Text>
        </View>
      ) : patents.length === 0 ? (
        <View style={styles.emptyPromptCard}>
          <AlertCircle size={32} color={colors.success} style={styles.emptyIcon} />
          <Text style={styles.emptyPromptTitle}>No Patents Expiring Soon</Text>
          <Text style={styles.emptyPromptSubtitle}>All active patents are in verified good standing</Text>
        </View>
      ) : (
        <View style={styles.groupsStackContainer}>
          {groupsAndStats.urgencyGroups.map(
            (group) =>
              group.count > 0 && (
                <View key={group.key} style={styles.urgencyGroupCard}>
                  <View style={styles.urgencyGroupHeader}>
                    <Text style={styles.urgencyGroupHeaderTitle}>{group.label}</Text>
                    <View style={[styles.countBadgeCapsule, { backgroundColor: getUrgencyTheme(group.key, isDark).bg }]}>
                      <Text style={[styles.countBadgeText, { color: getUrgencyTheme(group.key, isDark).text }]}>
                        {group.count} patent{group.count !== 1 ? "s" : ""}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.urgencyGroupBodyList}>
                    {group.items.map((patent) => {
                      const theme = getUrgencyTheme(group.key, isDark);
                      const expirationDate = new Date(patent.provisionalExpiration);

                      return (
                        <View
                          key={patent._id}
                          style={[
                            styles.patentItemRowBox,
                            { backgroundColor: theme.bg, borderColor: theme.border },
                          ]}
                        >
                          <View style={styles.patentItemRowMain}>
                            <View style={styles.patentItemMetaLeft}>
                              <Text style={styles.patentItemTitleText}>{patent.patentName}</Text>
                              <View style={styles.patentItemBadgesLine}>
                                {patent.category && (
                                  <View style={styles.inlineCategoryBadge}>
                                    <Text style={styles.inlineCategoryBadgeText}>{patent.category}</Text>
                                  </View>
                                )}
                                {patent.applicationNumber && (
                                  <Text style={styles.applicationNumberText}>
                                    #{patent.applicationNumber}
                                  </Text>
                                )}
                              </View>
                            </View>

                            <View style={styles.patentItemMetaRight}>
                              <View style={styles.countdownInlineBadge}>
                                <Clock size={12} color={colors.text} />
                                <Text style={styles.countdownBadgeText}>
                                  {patent.daysUntilExpiration} days
                                </Text>
                              </View>
                              <Text style={styles.dateLabelStringText}>
                                {expirationDate.toLocaleDateString()}
                              </Text>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )
          )}
        </View>
      )}

      <View style={styles.scheduleAlertCard}>
        <View style={styles.scheduleAlertCardHeader}>
          <AlertCircle size={15} color={colors.infoCardText} />
          <Text style={styles.scheduleAlertCardTitle}>Alert Schedule Setup</Text>
        </View>
        <Text style={styles.scheduleAlertCardBody}>
          Patent expiration alerts are triggered automatically at{" "}
          <Text style={styles.boldInlineText}>180, 120, 90, 60, and 30 days</Text> before expiration thresholds. Ensure timely renewal or extension actions are taken to protect active intellectual property files.
        </Text>
      </View>
    </ScrollView>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    containerWrapper: {
      flex: 1,
      width: "100%",
    },
    scrollContent: {
      paddingBottom: 24,
    },
    headerBlock: {
      marginBottom: 16,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
    },
    headerSubtitle: {
      fontSize: 12,
      color: colors.mutedText,
      marginTop: 2,
      lineHeight: 16,
    },
    statsGridRowWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginHorizontal: -4,
      marginBottom: 16,
    },
    statMiniCard: {
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
      width: (SCREEN_WIDTH - 32 - 8) / 2,
      marginHorizontal: 4,
      marginVertical: 4,
      gap: 4,
    },
    statMiniCardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 4,
    },
    statMiniCardLabel: {
      fontSize: 11,
      fontWeight: "500",
      color: colors.mutedText,
      flex: 1,
    },
    statMiniCardCount: {
      fontSize: 22,
      fontWeight: "700",
      marginTop: 2,
    },
    centeredStateView: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 40,
      gap: 8,
    },
    informationalTextState: {
      fontSize: 13,
      color: colors.mutedText,
    },
    emptyPromptCard: {
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingVertical: 32,
      paddingHorizontal: 16,
      alignItems: "center",
      marginBottom: 16,
    },
    emptyIcon: {
      marginBottom: 10,
    },
    emptyPromptTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 2,
    },
    emptyPromptSubtitle: {
      fontSize: 12,
      color: colors.mutedText,
      textAlign: "center",
    },
    groupsStackContainer: {
      gap: 14,
      marginBottom: 16,
    },
    urgencyGroupCard: {
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      overflow: "hidden",
    },
    urgencyGroupHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.headerBg,
    },
    urgencyGroupHeaderTitle: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.text,
    },
    countBadgeCapsule: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
    },
    countBadgeText: {
      fontSize: 11,
      fontWeight: "600",
    },
    urgencyGroupBodyList: {
      padding: 10,
      gap: 8,
    },
    patentItemRowBox: {
      borderWidth: 1,
      borderRadius: 6,
      padding: 10,
    },
    patentItemRowMain: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 12,
    },
    patentItemMetaLeft: {
      flex: 1,
      gap: 4,
    },
    patentItemTitleText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.text,
      lineHeight: 16,
    },
    patentItemBadgesLine: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 6,
    },
    inlineCategoryBadge: {
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 5,
      paddingVertical: 1,
      borderRadius: 4,
    },
    inlineCategoryBadgeText: {
      fontSize: 10,
      color: colors.text,
      fontWeight: "500",
    },
    applicationNumberText: {
      fontSize: 11,
      color: colors.mutedText,
    },
    patentItemMetaRight: {
      alignItems: "flex-end",
      gap: 2,
    },
    countdownInlineBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
    },
    countdownBadgeText: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.text,
    },
    dateLabelStringText: {
      fontSize: 11,
      color: colors.mutedText,
    },
    scheduleAlertCard: {
      backgroundColor: colors.infoCardBg,
      borderColor: colors.infoCardBorder,
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      gap: 4,
    },
    scheduleAlertCardHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    scheduleAlertCardTitle: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.infoCardText,
    },
    scheduleAlertCardBody: {
      fontSize: 12,
      color: colors.infoCardBody,
      lineHeight: 16,
    },
    boldInlineText: {
      fontWeight: "700",
    },
  });
}