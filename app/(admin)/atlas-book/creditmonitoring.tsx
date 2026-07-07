import React, { useState, useEffect, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  Platform,
} from "react-native";
import { useAtlasBooks } from "./context/AtlasBooksContext";
import { apiFetch } from "@/lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";
import {
  CreditCard,
  TrendingUp,
  Landmark,
  ArrowRight,
  Gauge,
} from "lucide-react-native";

const { width } = Dimensions.get("window");

function buildColors(uiTheme: any, isDark: boolean) {
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
}

function createStyles(colors: ReturnType<typeof buildColors>) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    scrollContainer: { padding: 16, paddingBottom: 40 },
    headerBlock: { marginBottom: 24 },
    titleRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
    headerIcon: { marginRight: 10 },
    headerTitle: { fontSize: 22, fontWeight: "800", color: colors.text, flex: 1, letterSpacing: -0.5 },
    headerSubtitle: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
    kpiStack: { marginBottom: 8 },
    card: { backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 20, marginBottom: 16 },
    creditScoreCard: { borderTopWidth: 6, borderTopColor: colors.successText, alignItems: "center" },
    dscrDarkCard: { backgroundColor: colors.specialCardBg, borderColor: colors.border },
    kpiLabelText: { fontSize: 11, fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 },
    darkKpiLabelText: { fontSize: 11, fontWeight: "700", color: colors.specialCardMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 },
    scoreContainer: { flexDirection: "row", alignItems: "center", justifyContent: "center", position: "relative", width: "100%", marginVertical: 4, justifyContent: "center" },
    scoreValueText: { fontSize: 48, fontWeight: "900", color: colors.successText, zIndex: 2 },
    gaugeDecoratorContainer: { position: "absolute", right: "18%", top: -4, zIndex: 1 },
    trendRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
    trendText: { fontSize: 10, fontWeight: "700", color: colors.successText },
    badgeMetricRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
    darkMetricValue: { fontSize: 36, fontWeight: "900", color: colors.specialCardText },
    lightMetricValue: { fontSize: 36, fontWeight: "900", color: colors.text },
    healthyBadge: { backgroundColor: colors.successText, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
    healthyBadgeText: { fontSize: 11, fontWeight: "700", color: colors.specialCardBg },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
    badgePrime: { backgroundColor: colors.background },
    badgeRisky: { backgroundColor: colors.dangerBg },
    statusBadgeText: { fontSize: 11, fontWeight: "700" },
    textPrime: { color: colors.textSecondary },
    textRisky: { color: colors.warningText },
    darkProgressTrack: { height: 8, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 4, marginTop: 14, width: "100%", overflow: "hidden" },
    darkProgressBar: { height: "100%", backgroundColor: colors.successText, borderRadius: 4 },
    lightProgressTrack: { height: 8, backgroundColor: colors.background, borderRadius: 4, marginTop: 14, width: "100%", overflow: "hidden" },
    lightProgressBar: { height: "100%", backgroundColor: colors.text, borderRadius: 4 },
    targetLimitText: { fontSize: 10, color: colors.textMuted, marginTop: 8 },
    sectionTitle: { fontSize: 16, fontWeight: "800", color: colors.text, marginBottom: 14 },
    listContainer: { marginBottom: 4 },
    emptyStateText: { fontSize: 13, color: colors.textMuted, textAlign: "center", paddingVertical: 20 },
    facilityItemRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
    facilityLeftBlock: { flexDirection: "row", alignItems: "center", flex: 1, paddingRight: 12 },
    iconContainerFrame: { padding: 8, borderRadius: 8, marginRight: 12 },
    facilityMetaDetails: { flex: 1 },
    lenderTitleText: { fontSize: 13, fontWeight: "700", color: colors.text, marginBottom: 2 },
    limitSubtitleText: { fontSize: 11, color: colors.textMuted },
    facilityRightBlock: { alignItems: "flex-end", minWidth: 70 },
    utilizationValueText: { fontSize: 14, fontWeight: "900", color: colors.text },
    utilizationLabelText: { fontSize: 9, fontWeight: "700", color: colors.textMuted, textTransform: "uppercase", marginTop: 1 },
    primaryActionButton: { flexDirection: "row", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingVertical: 12, marginTop: 16, gap: 6 },
    actionButtonText: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },
  });
}

const CreditMonitoring: React.FC = () => {
  const { activeEntity } = useAtlasBooks();
  const { uiTheme } = useTheme();
  const isDark = (uiTheme.theme as string) === "dark" || (uiTheme.theme as string) === "metallic-elite";
  const colors = useMemo(() => buildColors(uiTheme, isDark), [uiTheme, isDark]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [loans, setLoans] = useState<any[]>([]);
  const [kpi, setKpi] = useState<{ score: number; dscr: number | string; ltv: number }>({
    score: 0,
    dscr: 0,
    ltv: 0
  });

  useEffect(() => {
    const fetchLoans = async () => {
      try {
        const [loansRes, plRes] = await Promise.all([
          apiFetch<any>("/api/atlasbook/loans"),
          apiFetch<any>("/api/atlasbook/reports/pl")
        ]);

        let score = 0;
        let dscr: number | string = 0;
        let ltv = 0;

        if (plRes && typeof plRes.netProfit !== "undefined") {
          score = Math.min(850, Math.max(300, 700 + Math.floor(plRes.netProfit / 1000)));
        }

        if (loansRes && loansRes.items) {
          setLoans(loansRes.items);

          const totalLimit = loansRes.items.reduce((sum: number, l: any) => sum + (l.principalAmount || 0), 0);
          const totalBal = loansRes.items.reduce((sum: number, l: any) => sum + (l.remainingBalance || 0), 0);

          if (totalLimit > 0) {
            ltv = Math.round((totalBal / totalLimit) * 1000) / 10;
          }

          const debtService = totalBal * 0.1;
          if (debtService > 0 && plRes) {
            dscr = Math.round((plRes.netProfit / debtService) * 100) / 100;
          }
        }
        setKpi({ score, dscr, ltv });
      } catch (e) {
        console.error("Failed to fetch data", e);
      }
    };
    fetchLoans();
  }, []);

  const dscrRatio = typeof kpi.dscr === "number" ? Math.min(100, (kpi.dscr / 2) * 100) : 0;
  const ltvRatio = Math.min(100, Math.max(0, kpi.ltv));

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        <View style={styles.headerBlock}>
          <View style={styles.titleRow}>
            <CreditCard size={24} color={colors.primary} style={styles.headerIcon} />
            <Text style={styles.headerTitle}>Credit Monitoring & Debt Analytics</Text>
          </View>
          <Text style={styles.headerSubtitle}>
            Track business credit scores, loan ratios, and debt service coverage.
          </Text>
        </View>

        <View style={styles.kpiStack}>
          
          <View style={[styles.card, styles.creditScoreCard]}>
            <Text style={styles.kpiLabelText}>Business Credit Score</Text>
            <View style={styles.scoreContainer}>
              <Text style={styles.scoreValueText}>{kpi.score}</Text>
              <View style={styles.gaugeDecoratorContainer}>
                <Gauge size={54} color={colors.successBg} />
              </View>
            </View>
            <View style={styles.trendRow}>
              <TrendingUp size={12} color={colors.successText} />
              <Text style={styles.trendText}> +12 PTS FROM LAST MONTH</Text>
            </View>
          </View>

          <View style={[styles.card, styles.dscrDarkCard]}>
            <Text style={styles.darkKpiLabelText}>Debt Service Coverage (DSCR)</Text>
            <View style={styles.badgeMetricRow}>
              <Text style={styles.darkMetricValue}>{kpi.dscr}x</Text>
              <View style={styles.healthyBadge}>
                <Text style={styles.healthyBadgeText}>Healthy</Text>
              </View>
            </View>
            <View style={styles.darkProgressTrack}>
              <View style={[styles.darkProgressBar, { width: `${dscrRatio}%` }]} />
            </View>
            <Text style={[styles.targetLimitText, { color: colors.specialCardMuted }]}>Target: &gt;1.25x</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.kpiLabelText}>Loan-to-Value (LTV) Ratio</Text>
            <View style={styles.badgeMetricRow}>
              <Text style={styles.lightMetricValue}>{kpi.ltv}%</Text>
              <View style={[styles.statusBadge, kpi.ltv < 80 ? styles.badgePrime : styles.badgeRisky]}>
                <Text style={[styles.statusBadgeText, kpi.ltv < 80 ? styles.textPrime : styles.textRisky]}>
                  {kpi.ltv < 80 ? "Prime" : "Risky"}
                </Text>
              </View>
            </View>
            <View style={styles.lightProgressTrack}>
              <View style={[styles.lightProgressBar, { width: `${ltvRatio}%` }]} />
            </View>
            <Text style={styles.targetLimitText}>Maximum: 80%</Text>
          </View>

        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Outstanding Credit Facilities</Text>
          
          <View style={styles.listContainer}>
            {loans.length === 0 ? (
              <Text style={styles.emptyStateText}>No credit facilities found. Please add a loan.</Text>
            ) : (
              loans.map((loan, i) => {
                const util = loan.principalAmount > 0 ? Math.round(((loan.principalAmount - (loan.remainingBalance || 0)) / loan.principalAmount) * 100) : 0;
                let statusColor = colors.successText;
                let statusBg = colors.successBg;
                
                if (util > 80) {
                  statusColor = colors.dangerText;
                  statusBg = colors.dangerBg;
                } else if (util > 40) {
                  statusColor = colors.warningText;
                  statusBg = colors.warningBg;
                }

                return (
                  <View key={loan._id || i} style={styles.facilityItemRow}>
                    <View style={styles.facilityLeftBlock}>
                      <View style={[styles.iconContainerFrame, { backgroundColor: statusBg }]}>
                        <Landmark size={16} color={statusColor} />
                      </View>
                      <View style={styles.facilityMetaDetails}>
                        <Text style={styles.lenderTitleText} numberOfLines={1}>
                          {loan.lender} {loan.loanType}
                        </Text>
                        <Text style={styles.limitSubtitleText}>
                          Credit Limit: ${loan.principalAmount?.toLocaleString()}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.facilityRightBlock}>
                      <Text style={styles.utilizationValueText}>{util}%</Text>
                      <Text style={styles.utilizationLabelText}>Utilization</Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>

          <TouchableOpacity style={styles.primaryActionButton} activeOpacity={0.7}>
            <Text style={styles.actionButtonText}>View Full Credit Report</Text>
            <ArrowRight size={14} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

export default CreditMonitoring;