import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  SafeAreaView,
  Dimensions,
  Platform,
} from "react-native";
import { apiFetch } from "@/lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Users,
  Plus,
  RefreshCw,
  TrendingUp,
  ChevronDown,
  X,
  Building,
} from "lucide-react-native";

const { height } = Dimensions.get("window");

interface PropertyItem {
  _id: string;
  name: string;
}

interface StatementItem {
  _id: string;
  investorName: string;
  period: string;
  capitalContribution: number | string;
  distributionAmount: number | string;
  roi?: string | number;
  property?: {
    name: string;
  };
}

interface ApiResponse<T> {
  success: boolean;
  items?: T[];
}

function buildColors(uiTheme: any, isDark: boolean) {
  return {
    background:       uiTheme.panelColors?.dashboardBackground     || (isDark ? "#09090b" : "#F8FAFC"),
    cardBg:           uiTheme.panelColors?.dashboardCardBackground || (isDark ? "#18181b" : "#FFFFFF"),
    text:             uiTheme.panelColors?.dashboardTextColor      || (isDark ? "#F4F4F5" : "#0F172A"),
    textSecondary:    isDark ? "#A1A1AA" : "#475569",
    textMuted:        isDark ? "#71717A" : "#64748B",
    border:           isDark ? "#27272A" : "#E2E8F0",
    borderLight:      isDark ? "rgba(255,255,255,0.05)" : "#F1F5F9",
    inputBg:          isDark ? "#09090b" : "#F8FAFC",
    inputText:        isDark ? "#F4F4F5" : "#0F172A",
    placeholderText:  isDark ? "#52525B" : "#94A3B8",
    primary:          uiTheme.customColors?.primary || "#B45309",
    primaryText:      "#FFFFFF",
    successBg:        isDark ? "rgba(16,185,129,0.12)" : "rgba(16, 185, 129, 0.08)",
    successText:      isDark ? "#34D399" : "#059669",
    overlayBg:        "rgba(0,0,0,0.5)",
  };
}

function createStyles(colors: ReturnType<typeof buildColors>) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    scrollContainer: { paddingHorizontal: 16, paddingBottom: 32 },
    headerBlock: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, backgroundColor: colors.background },
    headerTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
    titleContainer: { flexDirection: "row", alignItems: "center", flex: 1, marginRight: 8 },
    headerIcon: { marginRight: 8 },
    headerTitle: { fontSize: 22, fontWeight: "800", color: colors.text, letterSpacing: -0.5 },
    iconActionButton: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardBg, padding: 10, borderRadius: 8, justifyContent: "center", alignItems: "center" },
    disabledOpacity: { opacity: 0.4 },
    primaryActionButton: { flexDirection: "row", backgroundColor: colors.primary, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, alignItems: "center", gap: 6 },
    primaryActionText: { color: colors.primaryText, fontSize: 13, fontWeight: "600" },
    headerSubtitle: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
    kpiContainerRow: { paddingHorizontal: 16, marginBottom: 16 },
    kpiCardFrame: { flexDirection: "row", backgroundColor: colors.successBg, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, alignItems: "center", gap: 12 },
    kpiIconWrapperContainer: { padding: 10, backgroundColor: colors.successBg, borderRadius: 10, width: 40, height: 40, justifyContent: "center", alignItems: "center" },
    kpiCardMetaLabel: { fontSize: 11, fontWeight: "700", color: colors.successText, textTransform: "uppercase", letterSpacing: 0.3 },
    kpiCardNumericHeading: { fontSize: 22, fontWeight: "900", color: colors.text, marginTop: 1 },
    tableCardHeaderStrip: { marginHorizontal: 16, marginBottom: 8, paddingTop: 8 },
    tableHeadingText: { fontSize: 15, fontWeight: "700", color: colors.text },
    centerLoadingState: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 40 },
    emptyStateContainer: { backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.border, borderRadius: 12, marginHorizontal: 16, padding: 32, alignItems: "center" },
    emptyStateText: { fontSize: 13, color: colors.textMuted, fontStyle: "italic" },
    tableCanvasCard: { backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.border, borderRadius: 12, overflow: "hidden" },
    tableHeaderRowFrame: { flexDirection: "row", alignItems: "center", backgroundColor: colors.borderLight, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
    tableHeaderLabelText: { fontSize: 11, fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.3 },
    colInvestorDetails: { flex: 2 },
    colFinancialMetrics: { flex: 1.4 },
    textAlignRight: { textAlign: "right", alignItems: "flex-end" },
    tableBodyRowFrame: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
    investorNameText: { fontSize: 14, fontWeight: "700", color: colors.text },
    badgeAndLocationFlexRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 5 },
    periodBadgeOutlineFrame: { borderWidth: 1, borderColor: colors.border, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1, backgroundColor: colors.borderLight },
    periodBadgeInnerText: { fontSize: 9, fontWeight: "600", color: colors.textSecondary },
    propertyInlineRow: { flexDirection: "row", alignItems: "center", maxWidth: 110 },
    iconInlineMarginRight: { marginRight: 2 },
    propertyNameInlineSubtext: { fontSize: 11, color: colors.textMuted },
    financialAmountMonoValueText: { fontSize: 13, fontWeight: "600", color: colors.textSecondary, fontFamily: Platform.OS === "ios" ? "Courier" : "monospace" },
    emeraldHighlightColor: { color: colors.successText, fontWeight: "700" },
    roiRateLabelText: { fontSize: 10, fontWeight: "800", color: colors.text, marginTop: 2 },
    modalBlurOverlay: { flex: 1, backgroundColor: colors.overlayBg, justifyContent: "flex-end", position: "relative" },
    modalContentCard: { backgroundColor: colors.cardBg, borderTopLeftRadius: 20, borderTopRightRadius: 20, width: "100%", maxHeight: height * 0.85, padding: 20 },
    modalCardHeaderTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.borderLight, paddingBottom: 12 },
    modalCardTitleHeading: { fontSize: 18, fontWeight: "800", color: colors.text },
    closeModalCrossButton: { padding: 4 },
    modalFormScrollContainer: { flexGrow: 0, marginBottom: 8 },
    formElementWrapperFieldBlock: { marginBottom: 14 },
    formSplitColumnsContainer: { flexDirection: "row", justifyContent: "space-between", gap: 12, marginBottom: 14 },
    formSplitFieldColumn: { flex: 1 },
    formElementFieldLabel: { fontSize: 12, fontWeight: "600", color: colors.textSecondary, marginBottom: 6 },
    formInputFieldText: { borderWidth: 1, borderColor: colors.border, borderRadius: 6, height: 38, paddingHorizontal: 10, fontSize: 13, color: colors.text, backgroundColor: colors.background },
    formSelectInputAnchor: { borderWidth: 1, borderColor: colors.border, borderRadius: 6, height: 38, paddingHorizontal: 10, backgroundColor: colors.background, justifyContent: "center" },
    selectDropdownFlexRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    customSelectAnchorText: { fontSize: 13, color: colors.text, fontWeight: "500", flex: 1, marginRight: 4 },
    modalCardActionsFooterRow: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 12, borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: 14 },
    modalCancelButtonAction: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 6, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardBg },
    modalCancelButtonText: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },
    modalSubmitButtonAction: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 6, backgroundColor: colors.primary },
    modalSubmitButtonText: { fontSize: 12, fontWeight: "600", color: colors.primaryText },
    inlineDropdownOverlayContainer: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.overlayBg, justifyContent: "center", alignItems: "center", padding: 20, zIndex: 999 },
    inlineDropdownCardWindow: { backgroundColor: colors.cardBg, width: "100%", maxWidth: 320, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 16, maxHeight: height * 0.5 },
    inlineDropdownHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 12, marginBottom: 8 },
    inlineDropdownHeaderTitleText: { fontSize: 14, fontWeight: "700", color: colors.text },
    closePickerTouchTarget: { padding: 4 },
    inlineDropdownScrollCanvas: { flexGrow: 0 },
    pickerRowSelectionButtonAnchor: { paddingVertical: 14, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
    pickerRowCategoryValueText: { fontSize: 14, color: colors.textSecondary, fontWeight: "500" },
    activeGoldenSelectionText: { color: colors.primary, fontWeight: "700" },
  });
}

export default function InvestorReporting() {
  const { uiTheme } = useTheme();
  const isDark = (uiTheme.theme as string) === "dark" || (uiTheme.theme as string) === "metallic-elite";
  const colors = useMemo(() => buildColors(uiTheme, isDark), [uiTheme, isDark]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [items, setItems] = useState<StatementItem[]>([]);
  const [properties, setProperties] = useState<PropertyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [showPropertySelector, setShowPropertySelector] = useState(false);

  const [form, setForm] = useState({
    investorName: "",
    period: "Q1 2024",
    capitalContribution: "",
    distributionAmount: "",
    property: "",
  });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [invRes, propRes] = await Promise.all([
        apiFetch<ApiResponse<StatementItem>>("/api/atlasbook/investor-statements"),
        apiFetch<ApiResponse<PropertyItem>>("/api/atlasbook/properties"),
      ]);
      if (invRes?.success) setItems(invRes.items || []);
      if (propRes?.success) setProperties(propRes.items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    try {
      const cleanPayload = {
        ...form,
        capitalContribution: parseFloat(form.capitalContribution.replace(/\s+/g, "").replace(",", ".")) || 0,
        distributionAmount: parseFloat(form.distributionAmount.replace(/\s+/g, "").replace(",", ".")) || 0,
        property: form.property || null,
      };

      const res = await apiFetch<{ success: boolean }>("/api/atlasbook/investor-statements", {
        method: "POST",
        body: JSON.stringify(cleanPayload),
      });
      if (res?.success) {
        setOpen(false);
        setForm({ investorName: "", period: "Q1 2024", capitalContribution: "", distributionAmount: "", property: "" });
        load();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const getSelectedPropertyName = () => {
    if (!form.property) return "Global Portfolio";
    const found = properties.find((p) => p._id === form.property);
    return found ? found.name : "Global Portfolio";
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerBlock}>
        <View style={styles.headerTopRow}>
          <View style={styles.titleContainer}>
            <Users size={24} color={colors.primary} style={styles.headerIcon} />
            <Text style={styles.headerTitle}>Investor Reporting</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity style={styles.iconActionButton} onPress={load} disabled={loading}>
              <RefreshCw size={16} color={colors.textSecondary} style={loading ? styles.disabledOpacity : null} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryActionButton} onPress={() => setOpen(true)}>
              <Plus size={16} color={colors.primaryText} />
              <Text style={styles.primaryActionText}>New Statement</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.headerSubtitle}>
          Manage capital contributions, distributions, and investor performance statements.
        </Text>
      </View>

      <View style={styles.kpiContainerRow}>
        <View style={styles.kpiCardFrame}>
          <View style={styles.kpiIconWrapperContainer}>
            <TrendingUp size={22} color={colors.successText} />
          </View>
          <View>
            <Text style={styles.kpiCardMetaLabel}>Avg. Portfolio ROI</Text>
            <Text style={styles.kpiCardNumericHeading}>12.4%</Text>
          </View>
        </View>
      </View>

      <View style={styles.tableCardHeaderStrip}>
        <Text style={styles.tableHeadingText}>Investor Distributions & Contributions</Text>
      </View>

      {loading ? (
        <View style={styles.centerLoadingState}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateText}>No investor statements found.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.tableCanvasCard}>
            <View style={styles.tableHeaderRowFrame}>
              <Text style={[styles.tableHeaderLabelText, styles.colInvestorDetails]}>Investor</Text>
              <Text style={[styles.tableHeaderLabelText, styles.colFinancialMetrics, styles.textAlignRight]}>Contribution</Text>
              <Text style={[styles.tableHeaderLabelText, styles.colFinancialMetrics, styles.textAlignRight]}>Distribution</Text>
            </View>

            {items.map((item) => {
              const contributionVal = Number(item.capitalContribution || 0);
              const distributionVal = Number(item.distributionAmount || 0);

              return (
                <View key={item._id || Math.random().toString()} style={styles.tableBodyRowFrame}>
                  <View style={styles.colInvestorDetails}>
                    <Text style={styles.investorNameText}>{item.investorName}</Text>

                    <View style={styles.badgeAndLocationFlexRow}>
                      <View style={styles.periodBadgeOutlineFrame}>
                        <Text style={styles.periodBadgeInnerText}>{item.period}</Text>
                      </View>
                      <View style={styles.propertyInlineRow}>
                        <Building size={10} color={colors.textMuted} style={styles.iconInlineMarginRight} />
                        <Text style={styles.propertyNameInlineSubtext} numberOfLines={1}>
                          {item.property?.name || "Global Portfolio"}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={[styles.colFinancialMetrics, styles.textAlignRight]}>
                    <Text style={styles.financialAmountMonoValueText}>
                      ${contributionVal.toLocaleString()}
                    </Text>
                    <Text style={styles.roiRateLabelText}>ROI: {item.roi || "12.0"}%</Text>
                  </View>

                  <View style={[styles.colFinancialMetrics, styles.textAlignRight]}>
                    <Text style={[styles.financialAmountMonoValueText, styles.emeraldHighlightColor]}>
                      ${distributionVal.toLocaleString()}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}

      <Modal animationType="slide" transparent={true} visible={open} onRequestClose={() => setOpen(false)}>
        <View style={styles.modalBlurOverlay}>
          <View style={styles.modalContentCard}>
            <View style={styles.modalCardHeaderTopRow}>
              <Text style={styles.modalCardTitleHeading}>Issue Investor Statement</Text>
              <TouchableOpacity onPress={() => setOpen(false)} style={styles.closeModalCrossButton}>
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalFormScrollContainer} keyboardShouldPersistTaps="handled">
              <View style={styles.formElementWrapperFieldBlock}>
                <Text style={styles.formElementFieldLabel}>Investor Name</Text>
                <TextInput
                  style={styles.formInputFieldText}
                  placeholder="e.g., Summit Equity Group"
                  placeholderTextColor={colors.placeholderText}
                  value={form.investorName}
                  onChangeText={(text) => setForm({ ...form, investorName: text })}
                />
              </View>

              <View style={styles.formSplitColumnsContainer}>
                <View style={styles.formSplitFieldColumn}>
                  <Text style={styles.formElementFieldLabel}>Reporting Period</Text>
                  <TextInput
                    style={styles.formInputFieldText}
                    placeholder="Q1 2024"
                    placeholderTextColor={colors.placeholderText}
                    value={form.period}
                    onChangeText={(text) => setForm({ ...form, period: text })}
                  />
                </View>

                <View style={styles.formSplitFieldColumn}>
                  <Text style={styles.formElementFieldLabel}>Property</Text>
                  <TouchableOpacity
                    style={styles.formSelectInputAnchor}
                    activeOpacity={0.7}
                    onPress={() => setShowPropertySelector(true)}
                  >
                    <View style={styles.selectDropdownFlexRow}>
                      <Text style={styles.customSelectAnchorText} numberOfLines={1}>
                        {getSelectedPropertyName()}
                      </Text>
                      <ChevronDown size={14} color={colors.textSecondary} />
                    </View>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formSplitColumnsContainer}>
                <View style={styles.formSplitFieldColumn}>
                  <Text style={styles.formElementFieldLabel}>Capital Contribution</Text>
                  <TextInput
                    style={styles.formInputFieldText}
                    placeholder="0.00"
                    placeholderTextColor={colors.placeholderText}
                    keyboardType="numeric"
                    value={form.capitalContribution}
                    onChangeText={(text) => setForm({ ...form, capitalContribution: text })}
                  />
                </View>
                <View style={styles.formSplitFieldColumn}>
                  <Text style={styles.formElementFieldLabel}>Distribution Amount</Text>
                  <TextInput
                    style={styles.formInputFieldText}
                    placeholder="0.00"
                    placeholderTextColor={colors.placeholderText}
                    keyboardType="numeric"
                    value={form.distributionAmount}
                    onChangeText={(text) => setForm({ ...form, distributionAmount: text })}
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalCardActionsFooterRow}>
              <TouchableOpacity style={styles.modalCancelButtonAction} onPress={() => setOpen(false)}>
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmitButtonAction} onPress={handleCreate}>
                <Text style={styles.modalSubmitButtonText}>Issue Statement</Text>
              </TouchableOpacity>
            </View>
          </View>

          {showPropertySelector && (
            <View style={styles.inlineDropdownOverlayContainer}>
              <View style={styles.inlineDropdownCardWindow}>
                <View style={styles.inlineDropdownHeaderRow}>
                  <Text style={styles.inlineDropdownHeaderTitleText}>Select Property</Text>
                  <TouchableOpacity onPress={() => setShowPropertySelector(false)} style={styles.closePickerTouchTarget}>
                    <X size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.inlineDropdownScrollCanvas} keyboardShouldPersistTaps="handled">
                  <TouchableOpacity
                    style={styles.pickerRowSelectionButtonAnchor}
                    onPress={() => {
                      setForm({ ...form, property: "" });
                      setShowPropertySelector(false);
                    }}
                  >
                    <Text style={[styles.pickerRowCategoryValueText, !form.property ? styles.activeGoldenSelectionText : null]}>
                      Global Portfolio
                    </Text>
                  </TouchableOpacity>

                  {properties.map((p) => (
                    <TouchableOpacity
                      key={p._id}
                      style={styles.pickerRowSelectionButtonAnchor}
                      onPress={() => {
                        setForm({ ...form, property: p._id });
                        setShowPropertySelector(false);
                      }}
                    >
                      <Text style={[styles.pickerRowCategoryValueText, form.property === p._id ? styles.activeGoldenSelectionText : null]}>
                        {p.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}