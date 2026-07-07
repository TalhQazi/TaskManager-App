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
  Landmark,
  Plus,
  RefreshCw,
  Percent,
  ChevronDown,
  X,
  Calendar,
} from "lucide-react-native";

const { height } = Dimensions.get("window");

interface PropertyItem {
  _id: string;
  name: string;
}

interface LoanItem {
  _id: string;
  lender: string;
  loanType: string;
  principalAmount: number | string;
  interestRate: number | string;
  termMonths: number | string;
  startDate: string;
  status?: string;
  property?: string | null;
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
    specialCardBg:    "#0F172A",
    specialCardText:  "#FFFFFF",
    specialCardMuted: "#94A3B8",
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
    kpiCardFrame: { backgroundColor: colors.specialCardBg, borderRadius: 12, padding: 20 },
    kpiCardMetaLabel: { fontSize: 11, fontWeight: "700", color: colors.specialCardMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
    kpiCardNumericHeading: { fontSize: 28, fontWeight: "900", color: colors.specialCardText },
    tableCardHeaderStrip: { marginHorizontal: 16, marginBottom: 8, paddingTop: 4 },
    tableHeadingText: { fontSize: 15, fontWeight: "700", color: colors.text },
    centerLoadingState: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 40 },
    emptyStateContainer: { backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.border, borderRadius: 12, marginHorizontal: 16, padding: 32, alignItems: "center" },
    emptyStateText: { fontSize: 13, color: colors.textMuted, fontStyle: "italic" },
    tableCanvasCard: { backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.border, borderRadius: 12, overflow: "hidden" },
    tableHeaderRowFrame: { flexDirection: "row", alignItems: "center", backgroundColor: colors.borderLight, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
    tableHeaderLabelText: { fontSize: 11, fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.3 },
    colLenderDetails: { flex: 1.8 },
    colPrincipalMetrics: { flex: 1.4 },
    colStatusMetrics: { flex: 0.9 },
    textAlignRight: { textAlign: "right", alignItems: "flex-end" },
    tableBodyRowFrame: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
    lenderNameText: { fontSize: 14, fontWeight: "700", color: colors.text },
    badgeAndTimelineFlexRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 5 },
    typeBadgeOutlineFrame: { borderWidth: 1, borderColor: colors.border, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1, backgroundColor: colors.borderLight },
    typeBadgeInnerText: { fontSize: 9, fontWeight: "600", color: colors.textSecondary },
    termInlineRow: { flexDirection: "row", alignItems: "center" },
    iconInlineMarginRight: { marginRight: 2 },
    termInlineSubtext: { fontSize: 11, color: colors.textMuted },
    principalMonoValueText: { fontSize: 13, fontWeight: "700", color: colors.text, fontFamily: Platform.OS === "ios" ? "Courier" : "monospace" },
    rateValueFlexRow: { flexDirection: "row", alignItems: "center", marginTop: 3 },
    rateInnerText: { fontSize: 11, fontWeight: "600", color: colors.textSecondary },
    statusBadgeFrame: { backgroundColor: colors.primary, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
    statusBadgeText: { color: colors.primaryText, fontSize: 9, fontWeight: "700" },
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

export default function LoanFinancing() {
  const { uiTheme } = useTheme();
  const isDark = (uiTheme.theme as string) === "dark" || (uiTheme.theme as string) === "metallic-elite";
  const colors = useMemo(() => buildColors(uiTheme, isDark), [uiTheme, isDark]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [items, setItems] = useState<LoanItem[]>([]);
  const [properties, setProperties] = useState<PropertyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [showPropertySelector, setShowPropertySelector] = useState(false);
  
  const [form, setForm] = useState({ 
    lender: "", 
    loanType: "Mortgage", 
    principalAmount: "", 
    interestRate: "", 
    termMonths: "360", 
    startDate: "", 
    property: "" 
  });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [loansRes, propRes] = await Promise.all([
        apiFetch<ApiResponse<LoanItem>>("/api/atlasbook/loans"),
        apiFetch<ApiResponse<PropertyItem>>("/api/atlasbook/properties")
      ]);
      if (loansRes?.success) setItems(loansRes.items || []);
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
        principalAmount: parseFloat(form.principalAmount.replace(/\s+/g, "").replace(",", ".")) || 0,
        interestRate: parseFloat(form.interestRate.replace(/\s+/g, "").replace(",", ".")) || 0,
        termMonths: parseInt(form.termMonths.replace(/\s+/g, ""), 10) || 0,
        startDate: form.startDate, 
        property: form.property || null
      };

      const res = await apiFetch<{ success: boolean }>("/api/atlasbook/loans", {
        method: "POST",
        body: JSON.stringify(cleanPayload),
      });
      if (res?.success) {
        setOpen(false);
        setForm({ lender: "", loanType: "Mortgage", principalAmount: "", interestRate: "", termMonths: "360", startDate: "", property: "" });
        load();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const totalDebt = useMemo(() => {
    return items.reduce((sum, i) => sum + (Number(i.principalAmount) || 0), 0);
  }, [items]);

  const getSelectedPropertyName = () => {
    if (!form.property) return "None";
    const found = properties.find((p) => p._id === form.property);
    return found ? found.name : "None";
  };

  const loanTypes = ["Mortgage", "Line of Credit", "Term Loan", "SBA Loan"];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerBlock}>
        <View style={styles.headerTopRow}>
          <View style={styles.titleContainer}>
            <Landmark size={24} color={colors.primary} style={styles.headerIcon} />
            <Text style={styles.headerTitle}>Loan & Financing</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity style={styles.iconActionButton} onPress={load} disabled={loading}>
              <RefreshCw size={16} color={colors.textSecondary} style={loading ? styles.disabledOpacity : null} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryActionButton} onPress={() => setOpen(true)}>
              <Plus size={16} color={colors.primaryText} />
              <Text style={styles.primaryActionText}>New Facility</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.headerSubtitle}>
          Track business loans, mortgages, and credit facilities with automated interest tracking.
        </Text>
      </View>

      <View style={styles.kpiContainerRow}>
        <View style={styles.kpiCardFrame}>
          <Text style={styles.kpiCardMetaLabel}>Total Outstanding Principal</Text>
          <Text style={styles.kpiCardNumericHeading}>${totalDebt.toLocaleString()}</Text>
        </View>
      </View>

      <View style={styles.tableCardHeaderStrip}>
        <Text style={styles.tableHeadingText}>Loan Registry</Text>
      </View>

      {loading ? (
        <View style={styles.centerLoadingState}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateText}>No active loans found.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.tableCanvasCard}>
            <View style={styles.tableHeaderRowFrame}>
              <Text style={[styles.tableHeaderLabelText, styles.colLenderDetails]}>Lender / Facility</Text>
              <Text style={[styles.tableHeaderLabelText, styles.colPrincipalMetrics, styles.textAlignRight]}>Principal</Text>
              <Text style={[styles.tableHeaderLabelText, styles.colStatusMetrics, styles.textAlignRight]}>Status</Text>
            </View>

            {items.map((item) => (
              <View key={item._id || Math.random().toString()} style={styles.tableBodyRowFrame}>
                <View style={styles.colLenderDetails}>
                  <Text style={styles.lenderNameText}>{item.lender}</Text>
                  <View style={styles.badgeAndTimelineFlexRow}>
                    <View style={styles.typeBadgeOutlineFrame}>
                      <Text style={styles.typeBadgeInnerText}>{item.loanType}</Text>
                    </View>
                    <View style={styles.termInlineRow}>
                      <Calendar size={10} color={colors.textMuted} style={styles.iconInlineMarginRight} />
                      <Text style={styles.termInlineSubtext}>{item.termMonths} Months</Text>
                    </View>
                  </View>
                </View>

                <View style={[styles.colPrincipalMetrics, styles.textAlignRight]}>
                  <Text style={styles.principalMonoValueText}>
                    ${(Number(item.principalAmount) || 0).toLocaleString()}
                  </Text>
                  <View style={styles.rateValueFlexRow}>
                    <Percent size={10} color={colors.primary} style={styles.iconInlineMarginRight} />
                    <Text style={styles.rateInnerText}>{item.interestRate}%</Text>
                  </View>
                </View>

                <View style={[styles.colStatusMetrics, styles.textAlignRight]}>
                  <View style={styles.statusBadgeFrame}>
                    <Text style={styles.statusBadgeText}>{item.status || "Active"}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      <Modal animationType="slide" transparent={true} visible={open} onRequestClose={() => setOpen(false)}>
        <View style={styles.modalBlurOverlay}>
          <View style={styles.modalContentCard}>
            <View style={styles.modalCardHeaderTopRow}>
              <Text style={styles.modalCardTitleHeading}>Register Loan Facility</Text>
              <TouchableOpacity onPress={() => setOpen(false)} style={styles.closeModalCrossButton}>
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalFormScrollContainer} keyboardShouldPersistTaps="handled">
              <View style={styles.formElementWrapperFieldBlock}>
                <Text style={styles.formElementFieldLabel}>Lender Name</Text>
                <TextInput
                  style={styles.formInputFieldText}
                  placeholder="e.g., JPMorgan Chase"
                  placeholderTextColor={colors.placeholderText}
                  value={form.lender}
                  onChangeText={(text) => setForm({ ...form, lender: text })}
                />
              </View>

              <View style={styles.formSplitColumnsContainer}>
                <View style={styles.formSplitFieldColumn}>
                  <Text style={styles.formElementFieldLabel}>Loan Type</Text>
                  <TouchableOpacity style={styles.formSelectInputAnchor} activeOpacity={0.7} onPress={() => setShowTypeSelector(true)}>
                    <View style={styles.selectDropdownFlexRow}>
                      <Text style={styles.customSelectAnchorText} numberOfLines={1}>{form.loanType}</Text>
                      <ChevronDown size={14} color={colors.textSecondary} />
                    </View>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.formSplitFieldColumn}>
                  <Text style={styles.formElementFieldLabel}>Principal Amount</Text>
                  <TextInput
                    style={styles.formInputFieldText}
                    placeholder="0.00"
                    placeholderTextColor={colors.placeholderText}
                    keyboardType="numeric"
                    value={form.principalAmount}
                    onChangeText={(text) => setForm({ ...form, principalAmount: text })}
                  />
                </View>
              </View>

              <View style={styles.formSplitColumnsContainer}>
                <View style={styles.formSplitFieldColumn}>
                  <Text style={styles.formElementFieldLabel}>Interest Rate (%)</Text>
                  <TextInput
                    style={styles.formInputFieldText}
                    placeholder="6.5"
                    placeholderTextColor={colors.placeholderText}
                    keyboardType="numeric"
                    value={form.interestRate}
                    onChangeText={(text) => setForm({ ...form, interestRate: text })}
                  />
                </View>
                <View style={styles.formSplitFieldColumn}>
                  <Text style={styles.formElementFieldLabel}>Term (Months)</Text>
                  <TextInput
                    style={styles.formInputFieldText}
                    placeholder="360"
                    placeholderTextColor={colors.placeholderText}
                    keyboardType="number-pad"
                    value={form.termMonths}
                    onChangeText={(text) => setForm({ ...form, termMonths: text })}
                  />
                </View>
              </View>

              <View style={styles.formSplitColumnsContainer}>
                <View style={styles.formSplitFieldColumn}>
                  <Text style={styles.formElementFieldLabel}>Start Date</Text>
                  <TextInput
                    style={styles.formInputFieldText}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.placeholderText}
                    value={form.startDate}
                    onChangeText={(text) => setForm({ ...form, startDate: text })}
                  />
                </View>
                <View style={styles.formSplitFieldColumn}>
                  <Text style={styles.formElementFieldLabel}>Associated Property</Text>
                  <TouchableOpacity style={styles.formSelectInputAnchor} activeOpacity={0.7} onPress={() => setShowPropertySelector(true)}>
                    <View style={styles.selectDropdownFlexRow}>
                      <Text style={styles.customSelectAnchorText} numberOfLines={1}>{getSelectedPropertyName()}</Text>
                      <ChevronDown size={14} color={colors.textSecondary} />
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalCardActionsFooterRow}>
              <TouchableOpacity style={styles.modalCancelButtonAction} onPress={() => setOpen(false)}>
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmitButtonAction} onPress={handleCreate}>
                <Text style={styles.modalSubmitButtonText}>Save Loan</Text>
              </TouchableOpacity>
            </View>
          </View>

          {showTypeSelector && (
            <View style={styles.inlineDropdownOverlayContainer}>
              <View style={styles.inlineDropdownCardWindow}>
                <View style={styles.inlineDropdownHeaderRow}>
                  <Text style={styles.inlineDropdownHeaderTitleText}>Select Loan Type</Text>
                  <TouchableOpacity onPress={() => setShowTypeSelector(false)} style={styles.closePickerTouchTarget}>
                    <X size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.inlineDropdownScrollCanvas} keyboardShouldPersistTaps="handled">
                  {loanTypes.map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={styles.pickerRowSelectionButtonAnchor}
                      onPress={() => {
                        setForm({ ...form, loanType: t });
                        setShowTypeSelector(false);
                      }}
                    >
                      <Text style={[styles.pickerRowCategoryValueText, form.loanType === t ? styles.activeGoldenSelectionText : null]}>
                        {t}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          )}

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
                      None
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