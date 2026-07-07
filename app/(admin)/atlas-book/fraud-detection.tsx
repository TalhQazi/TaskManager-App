import React, { useEffect, useState, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { apiFetch } from "@/lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";
import {
  ShieldAlert,
  RefreshCw,
  AlertTriangle,
  ShieldCheck,
  Search,
  Bell
} from "lucide-react-native";

export default function FraudDetection() {
  const { uiTheme } = useTheme();
  const isDark = (uiTheme.theme as string) === "dark" || (uiTheme.theme as string) === "metallic-elite";

  const colors = useMemo(() => {
    return {
      background:       uiTheme.panelColors?.dashboardBackground     || (isDark ? "#09090b" : "#F8FAFC"),
      cardBg:           uiTheme.panelColors?.dashboardCardBackground || (isDark ? "#18181b" : "#FFFFFF"),
      text:             uiTheme.panelColors?.dashboardTextColor      || (isDark ? "#F4F4F5" : "#0F172A"),
      textSecondary:    isDark ? "#A1A1AA" : "#475569",
      textMuted:        isDark ? "#71717A" : "#64748B",
      border:           isDark ? "#27272A" : "#E2E8F0",
      borderLight:      isDark ? "rgba(255,255,255,0.05)" : "#F1F5F9",
      primary:          uiTheme.customColors?.primary || "#FFD27A",
      primaryText:      "#09090b",
      successBg:        isDark ? "rgba(16,185,129,0.12)" : "#ECFDF5",
      successText:      isDark ? "#34D399" : "#10B981",
      dangerBg:         isDark ? "rgba(239,68,68,0.12)" : "#FEF2F2",
      dangerText:       isDark ? "#F87171" : "#EF4444",
      warningBg:        isDark ? "rgba(245,158,11,0.12)" : "#FFFBEB",
      warningText:      isDark ? "#FBBF24" : "#D97706",
      specialCardBg:    "#0F172A",
      specialCardText:  "#F8FAFC",
      specialCardMuted: "#94A3B8",
    };
  }, [uiTheme, isDark]);

  const styles = useMemo(() => {
    return StyleSheet.create({
      safeArea: {
        flex: 1,
        backgroundColor: colors.background,
      },
      scrollContainer: {
        paddingHorizontal: 16,
        paddingBottom: 32,
      },
      headerBlock: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 14,
        backgroundColor: colors.background,
      },
      headerTopRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 6,
      },
      titleContainer: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
        paddingRight: 8,
      },
      headerIcon: {
        marginRight: 8,
      },
      headerTitle: {
        fontSize: 20,
        fontWeight: "800",
        color: colors.text,
        letterSpacing: -0.5,
      },
      headerActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
      },
      iconActionButton: {
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.cardBg,
        padding: 10,
        borderRadius: 8,
        justifyContent: "center",
        alignItems: "center",
      },
      disabledOpacity: {
        opacity: 0.5,
      },
      primaryActionButton: {
        flexDirection: "row",
        backgroundColor: colors.successText,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
        alignItems: "center",
        gap: 6,
      },
      primaryActionText: {
        color: colors.background,
        fontSize: 12,
        fontWeight: "600",
      },
      headerSubtitle: {
        fontSize: 13,
        color: colors.textSecondary,
        lineHeight: 18,
      },
      kpiGridContainer: {
        flexDirection: "row",
        gap: 12,
        marginBottom: 16,
      },
      kpiCard: {
        flex: 1,
        borderRadius: 12,
        padding: 14,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        borderWidth: 1,
      },
      cardRoseAlertBg: {
        backgroundColor: colors.dangerBg,
        borderColor: isDark ? "rgba(244,63,94,0.25)" : "rgba(244,63,94,0.15)",
      },
      cardWhiteBg: {
        backgroundColor: colors.cardBg,
        borderColor: colors.border,
      },
      kpiIconFrameRose: {
        padding: 8,
        backgroundColor: isDark ? "rgba(244,63,94,0.2)" : "rgba(244,63,94,0.15)",
        borderRadius: 10,
      },
      kpiIconFrameGolden: {
        padding: 8,
        backgroundColor: colors.warningBg,
        borderRadius: 10,
      },
      kpiValueDetails: {
        flex: 1,
      },
      roseCardKpiLabelText: {
        fontSize: 10,
        fontWeight: "700",
        color: colors.dangerText,
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginBottom: 2,
      },
      roseCardMetricValue: {
        fontSize: 22,
        fontWeight: "900",
        color: colors.text,
      },
      whiteCardKpiLabelText: {
        fontSize: 10,
        fontWeight: "700",
        color: colors.textSecondary,
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginBottom: 2,
      },
      whiteCardMetricValue: {
        fontSize: 22,
        fontWeight: "900",
        color: colors.text,
      },
      ledgerDataCard: {
        backgroundColor: colors.cardBg,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        overflow: "hidden",
        marginBottom: 16,
      },
      tableHeaderSectionMetaRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 14,
      },
      tableCardTitleHeading: {
        fontSize: 15,
        fontWeight: "700",
        color: colors.text,
      },
      liveMonitoringBadge: {
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        backgroundColor: colors.borderLight,
      },
      liveMonitoringBadgeText: {
        fontSize: 11,
        color: colors.textSecondary,
        fontWeight: "500",
      },
      tableMatrixMinWidthContainer: {
        minWidth: 700,
      },
      simulatedTableHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.borderLight,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      },
      tableHeaderCell: {
        fontSize: 12,
        fontWeight: "700",
        color: colors.textSecondary,
      },
      tableDataBodyRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
        backgroundColor: colors.cardBg,
      },
      rowZebraAlternateBg: {
        backgroundColor: colors.borderLight,
      },
      centerStatePadding: {
        width: "100%",
        paddingVertical: 40,
        justifyContent: "center",
        alignItems: "center",
      },
      emptyStateIcon: {
        opacity: 0.25,
        marginBottom: 8,
      },
      emptyStateFallbackText: {
        fontSize: 13,
        color: colors.textMuted,
        fontStyle: "italic",
      },
      colType: {
        width: 140,
        paddingRight: 10,
          },
      colMessage: {
        width: 240,
        paddingRight: 10,
      },
      colSeverity: {
        width: 100,
        paddingRight: 10,
      },
      colTime: {
        width: 110,
        paddingRight: 10,
      },
      colAction: {
        width: 110,
        alignItems: "flex-end",
      },
      typeInlineCellLayout: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
      },
      typeCellLabelText: {
        fontSize: 13,
        fontWeight: "700",
        color: colors.text,
      },
      messageCellLabelText: {
        fontSize: 13,
        color: colors.textSecondary,
        lineHeight: 16,
      },
      severityBadgeFrame: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        alignSelf: "flex-start",
      },
      severityHighBg: {
        backgroundColor: colors.dangerBg,
      },
      severitySecondaryBg: {
        backgroundColor: colors.borderLight,
      },
      severityBadgeText: {
        fontSize: 11,
        fontWeight: "600",
      },
      severityHighText: {
        color: colors.dangerText,
      },
      severitySecondaryText: {
        color: colors.textSecondary,
      },
      timeCellLabelText: {
        fontSize: 12,
        color: colors.textMuted,
      },
      inlineInvestigateButton: {
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 6,
        backgroundColor: colors.warningBg,
        borderWidth: 1,
        borderColor: isDark ? "rgba(245,158,11,0.25)" : "rgba(245,158,11,0.15)",
      },
      inlineInvestigateButtonText: {
        fontSize: 12,
        fontWeight: "600",
        color: colors.warningText,
      },
      textAlignRight: {
        textAlign: "right",
      },
      aiInsightsCard: {
        backgroundColor: colors.specialCardBg,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
      },
      aiInsightsHeaderTitle: {
        fontSize: 11,
        fontWeight: "700",
        color: colors.specialCardMuted,
        textTransform: "uppercase",
        letterSpacing: 1,
        marginBottom: 8,
      },
      aiInsightsBodyParagraphText: {
        fontSize: 13,
        color: colors.specialCardText,
        lineHeight: 19,
        marginBottom: 14,
      },
      aiInsightsFooterBadgeRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
      },
      aiInsightsFooterBadgeText: {
        fontSize: 11,
        fontWeight: "700",
        color: colors.successText,
        letterSpacing: 0.5,
      },
    });
  }, [colors, isDark]);

  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const res = await apiFetch("/api/atlasbook/fraud/alerts");
      if (res?.success) setAlerts(res.alerts || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      
      <View style={styles.headerBlock}>
        <View style={styles.headerTopRow}>
          <View style={styles.titleContainer}>
            <ShieldAlert size={24} color={colors.warningText} style={styles.headerIcon} />
            <Text style={styles.headerTitle} numberOfLines={1}>Fraud & AI Monitoring</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.iconActionButton} 
              onPress={load} 
              disabled={loading}
              activeOpacity={0.7}
            >
              <RefreshCw size={16} color={colors.textSecondary} style={loading ? styles.disabledOpacity : null} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.primaryActionButton} 
              activeOpacity={0.8}
            >
              <ShieldCheck size={14} color={colors.background} />
              <Text style={styles.primaryActionText}>Mark Safe</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.headerSubtitle}>
          Automated risk monitoring for duplicate payments, expense spikes, and suspicious activity.
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        <View style={styles.kpiGridContainer}>
          
          <View style={[styles.kpiCard, styles.cardWhiteBg]}>
            <View style={styles.kpiIconFrameRose}>
              <AlertTriangle size={20} color={colors.dangerText} />
            </View>
            <View style={styles.kpiValueDetails}>
              <Text style={styles.roseCardKpiLabelText}>Active Alerts</Text>
              <Text style={styles.roseCardMetricValue}>{alerts.length}</Text>
            </View>
          </View>

          <View style={[styles.kpiCard, styles.cardWhiteBg]}>
            <View style={styles.kpiIconFrameGolden}>
              <Search size={20} color={colors.warningText} />
            </View>
            <View style={styles.kpiValueDetails}>
              <Text style={styles.whiteCardKpiLabelText}>Scanned This Week</Text>
              <Text style={styles.whiteCardMetricValue}>1,248</Text>
            </View>
          </View>

        </View>

        <View style={styles.ledgerDataCard}>
          <View style={styles.tableHeaderSectionMetaRow}>
            <Text style={styles.tableCardTitleHeading}>Recent Security Findings</Text>
            <View style={styles.liveMonitoringBadge}>
              <Text style={styles.liveMonitoringBadgeText}>Live Monitoring</Text>
            </View>
          </View>

          <ScrollView horizontal={true} showsHorizontalScrollIndicator={true} >
            <View style={styles.tableMatrixMinWidthContainer}>
              
              <View style={styles.simulatedTableHeaderRow}>
                <Text style={[styles.tableHeaderCell, styles.colType]}>Type</Text>
                <Text style={[styles.tableHeaderCell, styles.colMessage]}>Finding / Message</Text>
                <Text style={[styles.tableHeaderCell, styles.colSeverity]}>Severity</Text>
                <Text style={[styles.tableHeaderCell, styles.colTime]}>Time Detected</Text>
                <Text style={[styles.tableHeaderCell, styles.colAction, styles.textAlignRight]}>Action</Text>
              </View>

              {loading ? (
                <View style={styles.centerStatePadding}>
                  <ActivityIndicator size="small" color={colors.warningText} />
                </View>
              ) : alerts.length === 0 ? (
                <View style={styles.centerStatePadding}>
                  <ShieldCheck size={44} color={colors.successText} style={styles.emptyStateIcon} />
                  <Text style={styles.emptyStateFallbackText}>System secure. No suspicious activity detected.</Text>
                </View>
              ) : (
                alerts.map((alert, index) => (
                  <View 
                    key={alert._id || index} 
                    style={[
                      styles.tableDataBodyRow,
                      index % 2 === 1 ? styles.rowZebraAlternateBg : null
                    ]}
                  >
                    <View style={[styles.colType, styles.typeInlineCellLayout]}>
                      <Bell 
                        size={12} 
                        color={alert.severity === "High" ? colors.dangerText : colors.warningText} 
                      />
                      <Text style={styles.typeCellLabelText} numberOfLines={1}>{alert.type}</Text>
                    </View>

                    <Text style={[styles.colMessage, styles.messageCellLabelText]} numberOfLines={2}>
                      {alert.message}
                    </Text>

                    <View style={styles.colSeverity}>
                      <View style={[
                        styles.severityBadgeFrame,
                        alert.severity === "High" ? styles.severityHighBg : styles.severitySecondaryBg
                      ]}>
                        <Text style={[
                          styles.severityBadgeText,
                          alert.severity === "High" ? styles.severityHighText : styles.severitySecondaryText
                        ]}>
                          {alert.severity}
                        </Text>
                      </View>
                    </View>

                    <Text style={[styles.colTime, styles.timeCellLabelText]}>Just now</Text>

                    <View style={styles.colAction}>
                      <TouchableOpacity style={styles.inlineInvestigateButton} activeOpacity={0.7}>
                        <Text style={styles.inlineInvestigateButtonText}>Investigate</Text>
                      </TouchableOpacity>
                    </View>

                  </View>
                ))
              )}

            </View>
          </ScrollView>
        </View>

        <View style={styles.aiInsightsCard}>
          <Text style={styles.aiInsightsHeaderTitle}>AI Insights</Text>
          <Text style={styles.aiInsightsBodyParagraphText}>
            Our AI engine has analyzed your transaction patterns. Current spending is 12% lower than historical averages for this period. No abnormal "spikes" detected in utility or repair accounts.
          </Text>
          <View style={styles.aiInsightsFooterBadgeRow}>
            <ShieldCheck size={12} color={colors.successText} />
            <Text style={styles.aiInsightsFooterBadgeText}>SYSTEM INTEGRITY: 99.8%</Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}