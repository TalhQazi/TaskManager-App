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
  PieChart,
  Download,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Scale
} from "lucide-react-native";

export default function FinancialReporting() {
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
      specialCardBg:    "#0F172A",
      specialCardText:  "#F8FAFC",
      specialCardMuted: "#94A3B8",
    };
  }, [uiTheme, isDark]);

  const styles = useMemo(() => {
    return StyleSheet.create({
      safeArea: { flex: 1, backgroundColor: colors.background },
      scrollContainer: { paddingHorizontal: 16, paddingBottom: 40 },
      headerBlock: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14, backgroundColor: colors.background },
      headerTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6, justifyContent: "space-between" },
      titleContainer: { flexDirection: "row", alignItems: "center", flex: 1 },
      headerIcon: { marginRight: 8 },
      headerTitle: { fontSize: 22, fontWeight: "800", color: colors.text, letterSpacing: -0.5 },
      headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
      iconActionButton: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardBg, padding: 10, borderRadius: 8, justifyContent: "center", alignItems: "center" },
      rotatingIcon: { opacity: 0.5 },
      primaryActionButton: { flexDirection: "row", backgroundColor: colors.primary, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, alignItems: "center", gap: 6 },
      primaryActionText: { color: colors.primaryText, fontSize: 12, fontWeight: "600" },
      headerSubtitle: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
      tabsContainerRow: { flexDirection: "row", paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 16, gap: 16 },
      tabButton: { paddingBottom: 12, paddingHorizontal: 4, borderBottomWidth: 2, borderBottomColor: "transparent" },
      tabButtonActive: { borderBottomColor: isDark ? colors.primary : colors.text },
      tabButtonText: { fontSize: 14, fontWeight: "700", color: colors.textSecondary },
      tabButtonTextActive: { color: isDark ? colors.primary : colors.text },
      centeredLoaderFrame: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 60 },
      animatedViewWrapper: { gap: 16 },
      metricsGridStack: { gap: 12 },
      kpiCard: { backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 18 },
      cardEmeraldBg: { backgroundColor: colors.successBg, borderColor: isDark ? "rgba(16,185,129,0.25)" : "rgba(16,185,129,0.15)" },
      cardRoseBg: { backgroundColor: colors.dangerBg, borderColor: isDark ? "rgba(244,63,94,0.25)" : "rgba(244,63,94,0.15)" },
      cardPrimaryBg: { backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15, 23, 42, 0.03)", borderColor: colors.border },
      cardDarkSlateBg: { backgroundColor: colors.specialCardBg, borderColor: colors.border, paddingVertical: 20 },
      kpiCardMetaHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
      kpiMetaLabelText: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
      textEmerald: { color: colors.successText },
      textRose: { color: colors.dangerText },
      textPrimaryTint: { color: colors.textSecondary },
      kpiCardMetricValue: { fontSize: 28, fontWeight: "900", color: colors.text, letterSpacing: -0.5 },
      darkCardFlexLayoutBlock: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
      darkCardMetaDetails: { flex: 1 },
      darkCardKpiLabelText: { fontSize: 11, fontWeight: "700", color: colors.specialCardMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
      darkCardMetricValue: { fontSize: 28, fontWeight: "900", color: colors.specialCardText, letterSpacing: -0.5 },
      darkCardDecoratorIcon: { opacity: 0.25, marginLeft: 12 },
      statusBadgeFrame: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6, alignItems: "center", justifyContent: "center", minWidth: 100 },
      badgeSuccessGreen: { backgroundColor: colors.successText },
      badgeDangerRose: { backgroundColor: colors.dangerText },
      statusBadgeText: { fontSize: 9, fontWeight: "800", color: colors.specialCardText, letterSpacing: 0.5 },
      ledgerDataCard: { backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.border, borderRadius: 12, overflow: "hidden" },
      ledgerCardHeaderBlock: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
      ledgerCardTitleHeading: { fontSize: 15, fontWeight: "800", color: colors.text },
      simulatedTableHeaderRow: { flexDirection: "row", justifyContent: "space-between", backgroundColor: colors.borderLight, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border },
      simulatedTableHeaderText: { fontSize: 11, fontWeight: "700", color: colors.textSecondary, flex: 1 },
      textAlignRight: { textAlign: "right" },
      sectionHeaderRowTintEmerald: { backgroundColor: colors.successBg, paddingHorizontal: 16, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
      sectionHeaderRowTextEmerald: { fontSize: 10, fontWeight: "800", color: colors.successText, textTransform: "uppercase", letterSpacing: 0.5 },
      sectionHeaderRowTintRose: { backgroundColor: colors.dangerBg, paddingHorizontal: 16, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
      sectionHeaderRowTextRose: { fontSize: 10, fontWeight: "800", color: colors.dangerText, textTransform: "uppercase", letterSpacing: 0.5 },
      sectionHeaderRowSpacer: { marginTop: 12 },
      subAccountItemRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
      subAccountItemNameLabel: { fontSize: 13, color: colors.textSecondary, paddingLeft: 12, flex: 1 },
      subAccountItemValueText: { fontSize: 13, fontWeight: "600", textAlign: "right" },
      textMonoEmerald: { color: colors.successText },
      textMonoRose: { color: colors.dangerText },
      balanceSheetsFlexContainer: { gap: 16 },
      ledgerSectionSubHeaderBlock: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.borderLight, borderBottomWidth: 1, borderBottomColor: colors.border },
      ledgerSectionSubHeaderTitle: { fontSize: 12, fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 1 },
      ledgerRowsContainerBody: { paddingVertical: 4 },
      ledgerLineRowBorderLess: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 9 },
      ledgerItemMainLabelText: { fontSize: 13, fontWeight: "600", color: colors.text, flex: 1 },
      ledgerItemValueMonoText: { fontSize: 13, fontWeight: "700", color: colors.text },
      inlineHeaderMarkerRow: { backgroundColor: colors.borderLight, paddingHorizontal: 16, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
      inlineHeaderMarkerText: { fontSize: 9, fontWeight: "700", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5 },
      ledgerItemSubLabelText: { fontSize: 13, color: colors.textSecondary, paddingLeft: 8, flex: 1 },
      ledgerItemSubValueMonoText: { fontSize: 13, color: colors.textSecondary },
      ledgerSummaryFooterTotalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.borderLight, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border },
      summaryFooterTitleText: { fontSize: 13, fontWeight: "900", color: colors.text },
      summaryFooterValueText: { fontSize: 13, fontWeight: "900", color: colors.text },
    });
  }, [colors, isDark]);

  const [pl, setPl] = useState<any>(null);
  const [bs, setBs] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"PL" | "BS">("PL");

  const load = async () => {
    try {
      setLoading(true);
      const [plRes, bsRes] = await Promise.all([
        apiFetch("/api/atlasbook/reports/pl"),
        apiFetch("/api/atlasbook/reports/balance-sheet")
      ]);
      if (plRes?.success) setPl(plRes);
      if (bsRes?.success) setBs(bsRes);
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
            <PieChart size={24} color={colors.primary} style={styles.headerIcon} />
            <Text style={styles.headerTitle}>Financial Reporting</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.iconActionButton} 
              onPress={load} 
              disabled={loading}
              activeOpacity={0.7}
            >
              <RefreshCw size={16} color={colors.textSecondary} style={loading ? styles.rotatingIcon : null} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryActionButton} activeOpacity={0.8}>
              <Download size={14} color={colors.primaryText} />
              <Text style={styles.primaryActionText}>Export PDF</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.headerSubtitle}>
          Comprehensive financial health reports including P&L and Balance Sheet.
        </Text>
      </View>

      <View style={styles.tabsContainerRow}>
        <TouchableOpacity 
          style={[styles.tabButton, view === "PL" ? styles.tabButtonActive : null]}
          onPress={() => setView("PL")}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabButtonText, view === "PL" ? styles.tabButtonTextActive : null]}>
            Profit & Loss
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabButton, view === "BS" ? styles.tabButtonActive : null]}
          onPress={() => setView("BS")}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabButtonText, view === "BS" ? styles.tabButtonTextActive : null]}>
            Balance Sheet
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centeredLoaderFrame}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          
          {view === "PL" && (
            <View style={styles.animatedViewWrapper}>
              
              <View style={styles.metricsGridStack}>
                
                <View style={[styles.kpiCard, styles.cardEmeraldBg]}>
                  <View style={styles.kpiCardMetaHeaderRow}>
                    <Text style={[styles.kpiMetaLabelText, styles.textEmerald]}>Total Revenue</Text>
                    <ArrowUpRight size={18} color={colors.successText} />
                  </View>
                  <Text style={[styles.kpiCardMetricValue, { color: colors.successText }]}>
                    ${pl?.revenue?.toLocaleString() ?? "0"}
                  </Text>
                </View>

                <View style={[styles.kpiCard, styles.cardRoseBg]}>
                  <View style={styles.kpiCardMetaHeaderRow}>
                    <Text style={[styles.kpiMetaLabelText, styles.textRose]}>Total Expenses</Text>
                    <ArrowDownRight size={18} color={colors.dangerText} />
                  </View>
                  <Text style={[styles.kpiCardMetricValue, { color: colors.dangerText }]}>
                    ${pl?.expenses?.toLocaleString() ?? "0"}
                  </Text>
                </View>

                <View style={[styles.kpiCard, styles.cardPrimaryBg]}>
                  <Text style={[styles.kpiMetaLabelText, styles.textPrimaryTint]}>Net Operating Income</Text>
                  <Text style={styles.kpiCardMetricValue}>
                    ${pl?.netProfit?.toLocaleString() ?? "0"}
                  </Text>
                </View>

              </View>

              <View style={styles.ledgerDataCard}>
                <View style={styles.ledgerCardHeaderBlock}>
                  <Text style={styles.ledgerCardTitleHeading}>Income Statement Breakdown</Text>
                </View>
                
                <View style={styles.simulatedTableHeaderRow}>
                  <Text style={styles.simulatedTableHeaderText}>Account Name</Text>
                  <Text style={[styles.simulatedTableHeaderText, styles.textAlignRight]}>Balance</Text>
                </View>

                <View style={styles.sectionHeaderRowTintEmerald}>
                  <Text style={styles.sectionHeaderRowTextEmerald}>Revenue</Text>
                </View>
                
                {pl?.breakdown?.revenue?.map((a: any) => (
                  <View key={a._id || a.name} style={styles.subAccountItemRow}>
                    <Text style={styles.subAccountItemNameLabel} numberOfLines={1}>{a.name}</Text>
                    <Text style={[styles.subAccountItemValueText, styles.textMonoEmerald]}>
                      ${Math.abs(a.balance).toLocaleString()}
                    </Text>
                  </View>
                ))}

                <View style={[styles.sectionHeaderRowTintRose, styles.sectionHeaderRowSpacer]}>
                  <Text style={styles.sectionHeaderRowTextRose}>Expenses</Text>
                </View>

                {pl?.breakdown?.expenses?.map((a: any) => (
                  <View key={a._id || a.name} style={styles.subAccountItemRow}>
                    <Text style={styles.subAccountItemNameLabel} numberOfLines={1}>{a.name}</Text>
                    <Text style={[styles.subAccountItemValueText, styles.textMonoRose]}>
                      ${a.balance.toLocaleString()}
                    </Text>
                  </View>
                ))}

              </View>

            </View>
          )}

          {view === "BS" && (
            <View style={styles.animatedViewWrapper}>
              
              <View style={styles.metricsGridStack}>
                
                <View style={[styles.kpiCard, styles.cardDarkSlateBg]}>
                  <View style={styles.darkCardFlexLayoutBlock}>
                    <View style={styles.darkCardMetaDetails}>
                      <Text style={styles.darkCardKpiLabelText}>Total Assets</Text>
                      <Text style={styles.darkCardMetricValue}>
                        ${bs?.totalAssets?.toLocaleString() ?? "0"}
                      </Text>
                    </View>
                    <Scale size={32} color={colors.specialCardMuted} style={styles.darkCardDecoratorIcon} />
                  </View>
                </View>

                <View style={[styles.kpiCard, styles.cardDarkSlateBg]}>
                  <View style={styles.darkCardFlexLayoutBlock}>
                    <View style={styles.darkCardMetaDetails}>
                      <Text style={styles.darkCardKpiLabelText}>Liabilities + Equity</Text>
                      <Text style={styles.darkCardMetricValue}>
                        ${((bs?.totalLiabilities || 0) + (bs?.totalEquity || 0)).toLocaleString()}
                      </Text>
                    </View>
                    <View style={[
                      styles.statusBadgeFrame, 
                      bs?.isBalanced ? styles.badgeSuccessGreen : styles.badgeDangerRose
                    ]}>
                      <Text style={styles.statusBadgeText}>
                        {bs?.isBalanced ? "BALANCED" : "OUT OF BALANCE"}
                      </Text>
                    </View>
                  </View>
                </View>

              </View>

              <View style={styles.balanceSheetsFlexContainer}>
                
                <View style={styles.ledgerDataCard}>
                  <View style={styles.ledgerSectionSubHeaderBlock}>
                    <Text style={styles.ledgerSectionSubHeaderTitle}>Assets</Text>
                  </View>

                  <View style={styles.ledgerRowsContainerBody}>
                    {bs?.assets?.map((a: any) => (
                      <View key={a._id || a.name} style={styles.ledgerLineRowBorderLess}>
                        <Text style={styles.ledgerItemMainLabelText} numberOfLines={1}>{a.name}</Text>
                        <Text style={styles.ledgerItemValueMonoText}>${a.balance.toLocaleString()}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.ledgerSummaryFooterTotalRow}>
                    <Text style={styles.summaryFooterTitleText}>Total Assets</Text>
                    <Text style={styles.summaryFooterValueText}>
                      ${bs?.totalAssets?.toLocaleString() ?? "0"}
                    </Text>
                  </View>
                </View>

                <View style={styles.ledgerDataCard}>
                  <View style={styles.ledgerSectionSubHeaderBlock}>
                    <Text style={styles.ledgerSectionSubHeaderTitle}>Liabilities & Equity</Text>
                  </View>

                  <View style={styles.inlineHeaderMarkerRow}>
                    <Text style={styles.inlineHeaderMarkerText}>Liabilities</Text>
                  </View>
                  <View style={styles.ledgerRowsContainerBody}>
                    {bs?.liabilities?.map((a: any) => (
                      <View key={a._id || a.name} style={styles.ledgerLineRowBorderLess}>
                        <Text style={styles.ledgerItemSubLabelText} numberOfLines={1}>{a.name}</Text>
                        <Text style={styles.ledgerItemSubValueMonoText}>
                          ${Math.abs(a.balance).toLocaleString()}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.inlineHeaderMarkerRow}>
                    <Text style={styles.inlineHeaderMarkerText}>Equity</Text>
                  </View>
                  <View style={styles.ledgerRowsContainerBody}>
                    {bs?.equity?.map((a: any) => (
                      <View key={a._id || a.name} style={styles.ledgerLineRowBorderLess}>
                        <Text style={styles.ledgerItemSubLabelText} numberOfLines={1}>{a.name}</Text>
                        <Text style={styles.ledgerItemSubValueMonoText}>
                          ${Math.abs(a.balance).toLocaleString()}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.ledgerSummaryFooterTotalRow}>
                    <Text style={styles.summaryFooterTitleText}>Total Liabilities & Equity</Text>
                    <Text style={styles.summaryFooterValueText}>
                      ${((bs?.totalLiabilities || 0) + (bs?.totalEquity || 0)).toLocaleString()}
                    </Text>
                  </View>

                </View>

              </View>

            </View>
          )}

        </ScrollView>
      )}

    </SafeAreaView>
  );
}