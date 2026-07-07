import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  Modal,
  ScrollView,
  Alert,
  Dimensions,
  Platform,
  RefreshControl,
  KeyboardAvoidingView,
} from "react-native";
import {
  PieChart,
  Plus,
  RefreshCw,
  Target,
  AlertCircle,
  X,
  ChevronDown,
  Check,
} from "lucide-react-native";
import { apiFetch } from "@/lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";

const { width } = Dimensions.get("window");

interface AccountItem {
  _id: string;
  name: string;
  code: string;
  type: string;
}

interface BudgetItem {
  _id: string;
  fiscalYear: string;
  account?: {
    _id: string;
    name: string;
    code: string;
  };
  allocatedAmount: number;
  actualSpent: number;
  description?: string;
  period: string;
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
    inputBorder:      isDark ? "#27272A" : "#E2E8F0",
    inputText:        isDark ? "#F4F4F5" : "#0F172A",
    placeholderText:  isDark ? "#52525B" : "#94A3B8",
    primary:          uiTheme.customColors?.primary || "#FFD27A",
    primaryText:      "#09090b",
    successBg:        isDark ? "rgba(52,211,153,0.15)" : "#ECFDF5",
    successText:      isDark ? "#34D399" : "#10B981",
    dangerBg:         isDark ? "rgba(248,113,113,0.15)" : "#FEF2F2",
    dangerText:       isDark ? "#F87171" : "#EF4444",
    warningBg:        isDark ? "rgba(245,158,11,0.15)" : "#FFFBEB",
    warningText:      isDark ? "#F59E0B" : "#D97706",
    overlayBg:        "rgba(0,0,0,0.85)",
  };
}

function createStyles(colors: ReturnType<typeof buildColors>) {
  return StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: colors.background },
    scrollContainerPadding: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 40 },
    headerLayoutRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
    inlineHeaderTitleGroup: { flexDirection: "row", alignItems: "center", gap: 6 },
    mainTitleText: { fontSize: 22, fontWeight: "900", letterSpacing: -0.5, color: colors.text },
    subtitleText: { fontSize: 13, marginTop: 4, fontWeight: "400", color: colors.textSecondary },
    topActionsGroup: { flexDirection: "row", alignItems: "center", gap: 8 },
    circularActionBtn: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.cardBg, borderColor: colors.border },
    primaryActionPill: { height: 34, paddingHorizontal: 12, borderRadius: 10, flexDirection: "row", alignItems: "center", backgroundColor: colors.primary, gap: 4 },
    primaryActionPillText: { fontSize: 13, fontWeight: "700", color: colors.primaryText },
    kpiSummaryCard: { borderRadius: 14, borderWidth: 1, padding: 16, flexDirection: "row", alignItems: "center", marginBottom: 20, backgroundColor: colors.cardBg, borderColor: colors.border },
    kpiCardFlexLeftColumn: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
    iconBoxContainer: { width: 40, height: 40, borderRadius: 10, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(255,210,122,0.08)" },
    kpiLabelText: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.3, color: colors.textSecondary },
    kpiMetricsValueOutputText: { fontSize: 22, fontWeight: "800", marginTop: 2, letterSpacing: -0.5, color: colors.text },
    progressBarContainer: { width: "100%", height: 6, backgroundColor: colors.border, borderRadius: 3, marginTop: 8, overflow: "hidden" },
    progressBarFill: { height: "100%", backgroundColor: colors.primary },
    progressSubtext: { fontSize: 10, color: colors.textMuted, marginTop: 4 },
    verticalSplitLineDivider: { width: 1, height: 48, marginHorizontal: 16, backgroundColor: colors.border },
    kpiMetricsRightMetaBlock: { alignItems: "flex-end", justifyContent: "center" },
    sectionHeading: { fontSize: 12, fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 },
    inlineLoaderZoneWrapper: { marginVertical: 8, alignItems: "center" },
    ledgerRowCardContainer: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10, backgroundColor: colors.cardBg, borderColor: colors.border },
    ledgerRowTopLineFlexRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
    ledgerRowPrimaryBillNumText: { fontSize: 15, fontWeight: "700", color: colors.text },
    statusCapsuleWrapperBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
    statusCapsuleLabelText: { fontSize: 9, fontWeight: "700" },
    itemCardDividerHorizontalBar: { height: 1, marginVertical: 12, backgroundColor: colors.border },
    ledgerRowBottomMetadataMetaRow: { flexDirection: "row", justifyContent: "space-between" },
    metaLabelPairInlineFlexBlock: { flex: 1 },
    metaKeyLabelSmallCapsTitleText: { fontSize: 9, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.3, color: colors.textMuted },
    metaValueOutputBodyText: { fontSize: 13, marginTop: 2, fontWeight: "700", color: colors.text },
    utilizationTrackContainer: { marginTop: 10, gap: 4 },
    microProgressBarTrack: { width: "100%", height: 4, backgroundColor: colors.background, borderRadius: 2, overflow: "hidden" },
    microProgressBarFill: { height: "100%" },
    microProgressValueText: { fontSize: 10, fontWeight: "700", color: colors.textSecondary },
    emptyLedgerFallbackCard: { alignItems: "center", justifyContent: "center", paddingVertical: 64 },
    emptyLedgerHeadingText: { fontSize: 15, fontWeight: "700", marginBottom: 4, color: colors.text },
    emptyLedgerSubParagraphText: { fontSize: 13, textAlign: "center", color: colors.textSecondary },
    modalOverlayDarkenedContainer: { flex: 1, backgroundColor: colors.overlayBg, justifyContent: "flex-end" },
    formContainerCardWindowLayout: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "90%", backgroundColor: colors.cardBg },
    formModalStickyTopHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderColor: colors.border },
    formModalHeaderTitleText: { fontSize: 16, fontWeight: "800", color: colors.text },
    modalCloseActionBtnCircle: { width: 28, height: 28, borderRadius: 8, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },
    formScrollableBodyPaddingLayout: { padding: 16, paddingBottom: 40 },
    formGroupInputFieldWrapperBlock: { marginBottom: 16 },
    inputFieldTopLabelText: { fontSize: 12, fontWeight: "600", marginBottom: 6, color: colors.textSecondary },
    customDropdownSelectionInputTrigger: { height: 42, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.background, borderColor: colors.border },
    formInputsHorizontalMatrixRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
    formMatrixInputColumnHalf: { flex: 1 },
    standardNativeFormInputBox: { height: 42, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, fontSize: 13, fontWeight: "500", backgroundColor: colors.background, borderColor: colors.border, color: colors.inputText },
    formSubmissionActionBtnBar: { height: 46, borderRadius: 10, justifyContent: "center", alignItems: "center", marginTop: 8, backgroundColor: colors.primary },
    formSubmissionActionBtnLabelText: { fontSize: 14, fontWeight: "800", color: colors.primaryText },
    bottomSheetModalWindowLayout: { borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingHorizontal: 16, backgroundColor: colors.cardBg },
    bottomSheetHeaderBlockBarRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 16, borderBottomWidth: 1, marginBottom: 6, borderColor: colors.border },
    bottomSheetHeaderLabelTitleText: { fontSize: 14, fontWeight: "700", color: colors.text },
    bottomSheetSelectionRowItemBtn: { paddingVertical: 14, paddingHorizontal: 12, borderRadius: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    bottomSheetSelectionRowLabelText: { fontSize: 14, fontWeight: "600" },
  });
}

export default function BudgetManagement() {
  const { uiTheme } = useTheme();
  const isDark = (uiTheme.theme as string) === "dark" || (uiTheme.theme as string) === "metallic-elite";
  const colors = useMemo(() => buildColors(uiTheme, isDark), [uiTheme, isDark]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [items, setItems] = useState<BudgetItem[]>([]);
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [open, setOpen] = useState(false);
  const [periodPickerOpen, setPeriodPickerOpen] = useState(false);
  const [accountPickerOpen, setAccountPickerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    fiscalYear: "2024",
    account: "",
    allocatedAmount: "",
    description: "",
    period: "Annual",
  });

  const load = useCallback(async () => {
    try {
      const [budgetRes, accountsRes] = await Promise.all([
        apiFetch<ApiResponse<BudgetItem>>("/api/atlasbook/budgets"),
        apiFetch<ApiResponse<AccountItem>>("/api/atlasbook/accounts"),
      ]);
      if (budgetRes?.success) setItems(budgetRes.items || []);
      if (accountsRes?.success) setAccounts(accountsRes.items || []);
    } catch {
      Alert.alert("Sync Error", "Failed to compile analytical parameters inside database channels.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    if (!form.account || !form.allocatedAmount.trim()) {
      Alert.alert("Missing Parameters", "Please select an account profile and dynamic allocation parameters.");
      return;
    }
    try {
      setIsSubmitting(true);
      const res = await apiFetch<{ success: boolean }>("/api/atlasbook/budgets", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          allocatedAmount: parseFloat(form.allocatedAmount) || 0,
        }),
      });
      if (res?.success) {
        setOpen(false);
        setForm({
          fiscalYear: "2024",
          account: "",
          allocatedAmount: "",
          description: "",
          period: "Annual",
        });
        load();
      }
    } catch {
      Alert.alert("Execution Refused", "Could not commit structure parameters modifications safely.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalBudgeted = useMemo(() => {
    return items.reduce((sum, i) => sum + (i.allocatedAmount || 0), 0);
  }, [items]);

  const totalSpent = useMemo(() => {
    return items.reduce((sum, i) => sum + (i.actualSpent || 0), 0);
  }, [items]);

  const totalPercentUtilized = useMemo(() => {
    if (totalBudgeted === 0) return 0;
    return Math.min((totalSpent / totalBudgeted) * 100, 100);
  }, [totalBudgeted, totalSpent]);

  const expenseAccounts = useMemo(() => {
    return accounts.filter((a) => a.type === "Expense");
  }, [accounts]);

  const selectedAccountName = useMemo(() => {
    const matched = accounts.find((a) => a._id === form.account);
    return matched ? `[${matched.code}] ${matched.name}` : "Choose Account...";
  }, [accounts, form.account]);

  return (
    <SafeAreaView style={styles.mainContainer}>
      <FlatList
        data={items}
        keyExtractor={(item) => item._id || Math.random().toString()}
        contentContainerStyle={styles.scrollContainerPadding}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View>
            <View style={styles.headerLayoutRow}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <View style={styles.inlineHeaderTitleGroup}>
                  <PieChart size={24} color={colors.primary} />
                  <Text style={styles.mainTitleText}>Budget Management</Text>
                </View>
                <Text style={styles.subtitleText}>Plan and monitor annual budgets vs actual expenditures</Text>
              </View>
              
              <View style={styles.topActionsGroup}>
                <TouchableOpacity activeOpacity={0.7} style={styles.circularActionBtn} onPress={() => { setLoading(true); load(); }}>
                  <RefreshCw size={14} color={colors.text} />
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.8} style={styles.primaryActionPill} onPress={() => setOpen(true)}>
                  <Plus size={14} color={colors.primaryText} strokeWidth={2.5} />
                  <Text style={styles.primaryActionPillText}>Budget</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.kpiSummaryCard}>
              <View style={styles.kpiCardFlexLeftColumn}>
                <View style={styles.iconBoxContainer}>
                  <Target size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.kpiLabelText}>Total Fiscal Budget</Text>
                  <Text style={styles.kpiMetricsValueOutputText}>
                    ${totalBudgeted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                  <View style={styles.progressBarContainer}>
                    <View style={[styles.progressBarFill, { width: `${totalPercentUtilized}%` }]} />
                  </View>
                  <Text style={styles.progressSubtext}>{totalPercentUtilized.toFixed(1)}% of budget utilized</Text>
                </View>
              </View>
              <View style={styles.verticalSplitLineDivider} />
              <View style={styles.kpiMetricsRightMetaBlock}>
                <Text style={[styles.kpiMetricsValueOutputText, { fontSize: 18, color: colors.primary }]}>{items.length}</Text>
                <Text style={styles.kpiLabelText}>Lines</Text>
              </View>
            </View>

            <Text style={styles.sectionHeading}>Dynamic Budget Allocation Ledger</Text>

            {loading && (
              <View style={styles.inlineLoaderZoneWrapper}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyLedgerFallbackCard}>
              <PieChart size={32} color={colors.border} style={{ marginBottom: 10 }} />
              <Text style={styles.emptyLedgerHeadingText}>No budget tracks defined</Text>
              <Text style={styles.emptyLedgerSubParagraphText}>Define parameter bounds by adding your initial budget line structure.</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const percent = item.allocatedAmount > 0 ? (item.actualSpent / item.allocatedAmount) * 100 : 0;
          const isOverBudget = percent > 100;
          return (
            <View style={styles.ledgerRowCardContainer}>
              <View style={styles.ledgerRowTopLineFlexRow}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.ledgerRowPrimaryBillNumText}>{item.account?.name || "Unspecified Target"}</Text>
                  <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>Term period: {item.period} • Year: {item.fiscalYear}</Text>
                </View>
                <View style={[styles.statusCapsuleWrapperBadge, {
                  backgroundColor: isOverBudget ? colors.dangerBg : colors.successBg,
                  borderColor: isOverBudget ? "rgba(248,113,113,0.25)" : "rgba(52,211,153,0.25)"
                }]}>
                  <Text style={[styles.statusCapsuleLabelText, { color: isOverBudget ? colors.dangerText : colors.successText }]}>
                    {isOverBudget ? "OVER BUDGET" : "ON TRACK"}
                  </Text>
                </View>
              </View>

              <View style={styles.itemCardDividerHorizontalBar} />

              <View style={styles.ledgerRowBottomMetadataMetaRow}>
                <View style={styles.metaLabelPairInlineFlexBlock}>
                  <Text style={styles.metaKeyLabelSmallCapsTitleText}>Budgeted Amount</Text>
                  <Text style={styles.metaValueOutputBodyText}>${item.allocatedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                </View>
                
                <View style={[styles.metaLabelPairInlineFlexBlock, { alignItems: "flex-end" }]}>
                  <Text style={styles.metaKeyLabelSmallCapsTitleText}>Actual Expenditure</Text>
                  <Text style={[styles.metaValueOutputBodyText, { color: isOverBudget ? colors.dangerText : colors.text }]}>
                    ${item.actualSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </Text>
                </View>
              </View>

              <View style={styles.utilizationTrackContainer}>
                <View style={styles.microProgressBarTrack}>
                  <View style={[styles.microProgressBarFill, { 
                    width: `${Math.min(percent, 100)}%`, 
                    backgroundColor: percent > 90 ? colors.dangerText : percent > 70 ? colors.warningText : colors.successText 
                  }]} />
                </View>
                <Text style={styles.microProgressValueText}>Utilization parameter metrics: {percent.toFixed(1)}%</Text>
              </View>
            </View>
          );
        }}
      />

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.modalOverlayDarkenedContainer}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.formContainerCardWindowLayout}>
            <View style={styles.formModalStickyTopHeaderRow}>
              <Text style={styles.formModalHeaderTitleText}>Add Budget Line</Text>
              <TouchableOpacity activeOpacity={0.7} style={styles.modalCloseActionBtnCircle} onPress={() => setOpen(false)}>
                <X size={16} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.formScrollableBodyPaddingLayout} keyboardShouldPersistTaps="handled">
              <View style={styles.formInputsHorizontalMatrixRow}>
                <View style={styles.formMatrixInputColumnHalf}>
                  <Text style={styles.inputFieldTopLabelText}>Fiscal Year</Text>
                  <TextInput
                    style={styles.standardNativeFormInputBox}
                    placeholder="2024"
                    placeholderTextColor={colors.placeholderText}
                    value={form.fiscalYear}
                    onChangeText={(text) => setForm({ ...form, fiscalYear: text })}
                  />
                </View>
                <View style={styles.formMatrixInputColumnHalf}>
                  <Text style={styles.inputFieldTopLabelText}>Period Framework</Text>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={styles.customDropdownSelectionInputTrigger}
                    onPress={() => setPeriodPickerOpen(true)}
                  >
                    <Text style={{ color: colors.text, fontSize: 13, fontWeight: "500" }}>{form.period}</Text>
                    <ChevronDown size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formGroupInputFieldWrapperBlock}>
                <Text style={styles.inputFieldTopLabelText}>Select Target Account</Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.customDropdownSelectionInputTrigger}
                  onPress={() => setAccountPickerOpen(true)}
                >
                  <Text style={{ color: form.account ? colors.text : colors.placeholderText, fontSize: 13, fontWeight: "500" }} numberOfLines={1}>
                    {selectedAccountName}
                  </Text>
                  <ChevronDown size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.formGroupInputFieldWrapperBlock}>
                <Text style={styles.inputFieldTopLabelText}>Allocated Amount ($ USD)</Text>
                <TextInput
                  style={styles.standardNativeFormInputBox}
                  placeholder="0.00"
                  placeholderTextColor={colors.placeholderText}
                  keyboardType="numeric"
                  value={form.allocatedAmount}
                  onChangeText={(text) => setForm({ ...form, allocatedAmount: text })}
                />
              </View>

              <TouchableOpacity activeOpacity={0.8} style={styles.formSubmissionActionBtnBar} disabled={isSubmitting} onPress={handleCreate}>
                {isSubmitting ? <ActivityIndicator size="small" color={colors.primaryText} /> : <Text style={styles.formSubmissionActionBtnLabelText}>Set Budget Parameters</Text>}
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal visible={periodPickerOpen} transparent animationType="slide" onRequestClose={() => setPeriodPickerOpen(false)}>
        <View style={styles.modalOverlayDarkenedContainer}>
          <TouchableOpacity activeOpacity={1} style={{ flex: 1 }} onPress={() => setPeriodPickerOpen(false)} />
          <View style={styles.bottomSheetModalWindowLayout}>
            <View style={styles.bottomSheetHeaderBlockBarRow}>
              <Text style={styles.bottomSheetHeaderLabelTitleText}>Select Allocation Period</Text>
              <TouchableOpacity onPress={() => setPeriodPickerOpen(false)}>
                <X size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            {["Annual", "Quarterly", "Monthly"].map((p) => {
              const isSelected = form.period === p;
              return (
                <TouchableOpacity
                  key={p}
                  activeOpacity={0.7}
                  style={[styles.bottomSheetSelectionRowItemBtn, isSelected && { backgroundColor: colors.borderLight }]}
                  onPress={() => {
                    setForm({ ...form, period: p });
                    setPeriodPickerOpen(false);
                  }}
                >
                  <Text style={[styles.bottomSheetSelectionRowLabelText, { color: isSelected ? colors.primary : colors.textSecondary }]}>
                    {p}
                  </Text>
                  {isSelected && <Check size={16} color={colors.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>

      <Modal visible={accountPickerOpen} transparent animationType="slide" onRequestClose={() => setAccountPickerOpen(false)}>
        <View style={styles.modalOverlayDarkenedContainer}>
          <TouchableOpacity activeOpacity={1} style={{ flex: 1 }} onPress={() => setAccountPickerOpen(false)} />
          <View style={styles.bottomSheetModalWindowLayout}>
            <View style={styles.bottomSheetHeaderBlockBarRow}>
              <Text style={styles.bottomSheetHeaderLabelTitleText}>Link Expense Account</Text>
              <TouchableOpacity onPress={() => setAccountPickerOpen(false)}>
                <X size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={expenseAccounts}
              keyExtractor={(item) => item._id}
              contentContainerStyle={{ paddingBottom: 32 }}
              style={{ maxHeight: 300 }}
              renderItem={({ item: a }) => {
                const isSelected = form.account === a._id;
                return (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={[styles.bottomSheetSelectionRowItemBtn, isSelected && { backgroundColor: colors.borderLight }]}
                    onPress={() => {
                      setForm({ ...form, account: a._id });
                      setAccountPickerOpen(false);
                    }}
                  >
                    <Text style={[styles.bottomSheetSelectionRowLabelText, { color: isSelected ? colors.primary : colors.textSecondary }]} numberOfLines={1}>
                      [{a.code}] {a.name}
                    </Text>
                    {isSelected && <Check size={16} color={colors.primary} />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}