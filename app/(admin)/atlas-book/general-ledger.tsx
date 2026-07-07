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
  Calculator,
  Plus,
  RefreshCw,
  ArrowRightLeft,
  Calendar,
  Trash2,
  X,
  ChevronDown,
} from "lucide-react-native";

const { height } = Dimensions.get("window");

interface JournalLine {
  account: string;
  accountName: string;
  accountCode: string;
  debit: number;
  credit: number;
}

interface JournalItem {
  _id: string;
  reference?: string;
  transactionDate: string;
  description: string;
  lines: Array<{
    account: {
      _id: string;
      name: string;
      code: string;
    };
    debit: number;
    credit: number;
  }>;
}

interface AccountItem {
  _id: string;
  name: string;
  code: string;
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
    primary:          uiTheme.customColors?.primary || "#FFD27A",
    primaryText:      "#09090b",
    successText:      isDark ? "#34D399" : "#16A34A",
    dangerText:       isDark ? "#F87171" : "#EF4444",
    overlayBg:        "rgba(0,0,0,0.85)",
  };
}

function createStyles(colors: ReturnType<typeof buildColors>) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    scrollContainer: { paddingHorizontal: 16, paddingBottom: 32 },
    headerBlock: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14, backgroundColor: colors.background },
    headerTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
    titleContainer: { flexDirection: "row", alignItems: "center", flex: 1 },
    headerIcon: { marginRight: 8 },
    headerTitle: { fontSize: 22, fontWeight: "800", color: colors.text, letterSpacing: -0.5 },
    headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
    iconActionButton: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardBg, padding: 10, borderRadius: 8 },
    disabledOpacity: { opacity: 0.4 },
    primaryActionButton: { flexDirection: "row", backgroundColor: colors.primary, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, alignItems: "center", gap: 6 },
    primaryActionText: { color: colors.primaryText, fontSize: 12, fontWeight: "600" },
    headerSubtitle: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
    centerLoadingState: { flex: 1, justifyContent: "center", alignItems: "center" },
    emptyStateContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 40, marginVertical: 40 },
    emptyStateIcon: { opacity: 0.2, marginBottom: 16 },
    emptyStateTitleText: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 4 },
    emptyStateSubtitleText: { fontSize: 13, color: colors.textSecondary, textAlign: "center", lineHeight: 18 },
    journalCardFrame: { backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.border, borderLeftWidth: 4, borderLeftColor: colors.primary, borderRadius: 12, marginBottom: 16, overflow: "hidden" },
    journalCardMetaHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.borderLight, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
    metaLeftSection: { flexDirection: "row", alignItems: "center", flex: 1, flexWrap: "wrap", gap: 8 },
    calendarInlineRow: { flexDirection: "row", alignItems: "center" },
    inlineIconMargin: { marginRight: 4 },
    metaDateLabelText: { fontSize: 12, fontWeight: "700", color: colors.background },
    referenceBadgeFrame: { backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    referenceBadgeText: { fontSize: 10, fontWeight: "600", color: colors.textSecondary },
    descriptionLabelText: { fontSize: 12, color: colors.textMuted, flex: 1, minWidth: 120 },
    postedByTextTag: { fontSize: 11, color: colors.textMuted, fontStyle: "italic" },
    journalTableCanvasColumn: { width: "100%" },
    tableInnerHeaderRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
    columnLabelCell: { fontSize: 11, fontWeight: "700", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5 },
    flexColumnAccount: { flex: 2 },
    flexColumnAmount: { flex: 1 },
    textAlignRight: { textAlign: "right" },
    tableInnerDataBodyRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
    creditIndentationPadding: { paddingLeft: 24 },
    accountLabelText: { fontSize: 13 },
    debitAccountTextBold: { fontWeight: "600", color: colors.text },
    creditAccountTextMuted: { fontWeight: "500", color: colors.textSecondary },
    accountCodeMonoText: { fontSize: 10, color: colors.textMuted, marginTop: 1 },
    fontMonoDataText: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
    modalBlurOverlay: { flex: 1, backgroundColor: colors.overlayBg, justifyContent: "flex-end" },
    modalContentCard: { backgroundColor: colors.cardBg, borderTopLeftRadius: 20, borderTopRightRadius: 20, width: "100%", maxHeight: height * 0.88, padding: 20, position: "relative" },
    modalCardHeaderTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.borderLight, paddingBottom: 12 },
    modalCardTitleHeading: { fontSize: 18, fontWeight: "800", color: colors.text },
    closeModalCrossButton: { padding: 4 },
    modalFormScrollContainer: { flexGrow: 0, marginBottom: 8 },
    formSplitColumnsContainer: { flexDirection: "row", justifyContent: "space-between", gap: 12, marginBottom: 18 },
    formSplitFieldColumn: { flex: 1 },
    formElementFieldLabel: { fontSize: 12, fontWeight: "600", color: colors.textSecondary, marginBottom: 6 },
    formInputFieldText: { borderWidth: 1, borderColor: colors.border, borderRadius: 6, height: 38, paddingHorizontal: 10, fontSize: 13, color: colors.text, backgroundColor: colors.background },
    dynamicLinesWrapperContainer: { marginVertical: 4 },
    linesTableHeaderMetaRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 4, marginBottom: 6 },
    lineHeaderLabelText: { fontSize: 11, fontWeight: "700", color: colors.textMuted, textTransform: "uppercase" },
    colLineAccountWidth: { flex: 2.4, marginRight: 6 },
    colLineAmountWidth: { flex: 1.1, marginRight: 6 },
    colLineActionWidth: { width: 28 },
    interactiveLineFormRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
    formSelectInputAnchor: { borderWidth: 1, borderColor: colors.border, borderRadius: 6, height: 38, paddingHorizontal: 8, backgroundColor: colors.background, justifyContent: "center" },
    selectDropdownFlexRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    customSelectAnchorText: { fontSize: 12, color: colors.text, fontWeight: "500", flex: 1, marginRight: 4 },
    lineRowActionRemovalButton: { width: 28, height: 38, justifyContent: "center", alignItems: "center" },
    appendLineActionTextRowAnchorButton: { paddingVertical: 8, paddingHorizontal: 4, alignSelf: "flex-start", marginTop: 2, marginBottom: 12 },
    appendLineActionLabelText: { fontSize: 13, fontWeight: "700", color: colors.primary },
    modalAggregationSummaryPanelBox: { flexDirection: "row", justifyContent: "flex-end", gap: 32, backgroundColor: colors.borderLight, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, marginTop: 8, marginBottom: 12 },
    aggregationSplitColumnDetails: { alignItems: "flex-end" },
    aggregationMetaTitleLabelText: { fontSize: 10, fontWeight: "700", color: colors.textMuted, textTransform: "uppercase", marginBottom: 2 },
    aggregationNumericalMonoValueText: { fontSize: 18, fontWeight: "900", color: colors.text },
    unbalancedWarningAlertLabelNotificationText: { fontSize: 12, color: colors.dangerText, fontWeight: "600", textAlign: "center", marginVertical: 6 },
    modalCardActionsFooterRow: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 12, borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: 14 },
    modalCancelButtonAction: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 6, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardBg },
    modalCancelButtonText: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },
    modalSubmitButtonAction: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 6 },
    balancedSubmissionBgColor: { backgroundColor: colors.successText },
    disabledSubmissionBgColor: { backgroundColor: colors.border, opacity: 0.6 },
    modalSubmitButtonText: { fontSize: 12, fontWeight: "600", color: colors.primaryText },
    inlineDropdownOverlayContainer: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.overlayBg, justifyContent: "center", alignItems: "center", padding: 16, zIndex: 999 },
    inlineDropdownCardWindow: { backgroundColor: colors.cardBg, width: "100%", maxWidth: 340, maxHeight: "70%", borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 16 },
    inlineDropdownHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 10, marginBottom: 8 },
    inlineDropdownHeaderTitleText: { fontSize: 14, fontWeight: "700", color: colors.text },
    inlineDropdownScrollCanvas: { flexGrow: 0 },
    pickerRowSelectionButtonAnchor: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
    pickerRowAccountCodeText: { fontSize: 12, fontWeight: "700", color: colors.primary, marginRight: 6 },
    pickerRowAccountNameText: { fontSize: 13, color: colors.textSecondary, fontWeight: "500", flex: 1 },
    pickerEmptyFallbackStateLabelText: { fontSize: 12, color: colors.textMuted, fontStyle: "italic", textAlign: "center", marginVertical: 20 },
  });
}

export default function GeneralLedger() {
  const { uiTheme } = useTheme();
  const isDark = (uiTheme.theme as string) === "dark" || (uiTheme.theme as string) === "metallic-elite";
  const colors = useMemo(() => buildColors(uiTheme, isDark), [uiTheme, isDark]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [items, setItems] = useState<JournalItem[]>([]);
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [activeLineIndex, setActiveLineIndex] = useState<number | null>(null);
  const [showAccountSelector, setShowAccountSelector] = useState(false);

  const [form, setForm] = useState<{
    description: string;
    transactionDate: string;
    lines: JournalLine[];
  }>({
    description: "",
    transactionDate: new Date().toISOString().split("T")[0],
    lines: [
      { account: "", accountName: "", accountCode: "", debit: 0, credit: 0 },
      { account: "", accountName: "", accountCode: "", debit: 0, credit: 0 },
    ],
  });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [journalRes, accountsRes] = await Promise.all([
        apiFetch<{ success: boolean; items?: JournalItem[] }>("/api/atlasbook/journal"),
        apiFetch<{ success: boolean; items?: AccountItem[] }>("/api/atlasbook/accounts"),
      ]);
      if (journalRes?.success) setItems(journalRes.items || []);
      if (accountsRes?.success) setAccounts(accountsRes.items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleAddLine = () => {
    setForm((prev) => ({
      ...prev,
      lines: [...prev.lines, { account: "", accountName: "", accountCode: "", debit: 0, credit: 0 }],
    }));
  };

  const handleLineChange = (index: number, field: "debit" | "credit", value: string) => {
    const newLines = [...form.lines];
    newLines[index][field] = Number(value) || 0;
    setForm((prev) => ({ ...prev, lines: newLines }));
  };

  const handleSelectAccount = (accountItem: AccountItem) => {
    if (activeLineIndex !== null) {
      const newLines = [...form.lines];
      newLines[activeLineIndex].account = accountItem._id;
      newLines[activeLineIndex].accountName = accountItem.name;
      newLines[activeLineIndex].accountCode = accountItem.code;
      setForm((prev) => ({ ...prev, lines: newLines }));
      setShowAccountSelector(false);
      setActiveLineIndex(null);
    }
  };

  const totalDebit = useMemo(() => form.lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0), [form.lines]);
  const totalCredit = useMemo(() => form.lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0), [form.lines]);
  const isBalanced = useMemo(() => totalDebit > 0 && totalDebit === totalCredit, [totalDebit, totalCredit]);

  const handleCreate = async () => {
    if (!isBalanced) return;
    try {
      const res = await apiFetch<{ success: boolean }>("/api/atlasbook/journal", {
        method: "POST",
        body: JSON.stringify(form),
      });
      if (res?.success) {
        setOpen(false);
        setForm({
          description: "",
          transactionDate: new Date().toISOString().split("T")[0],
          lines: [
            { account: "", accountName: "", accountCode: "", debit: 0, credit: 0 },
            { account: "", accountName: "", accountCode: "", debit: 0, credit: 0 },
          ],
        });
        load();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const sortedItems = useMemo(() => {
    return [...items].sort(
      (a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()
    );
  }, [items]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerBlock}>
        <View style={styles.headerTopRow}>
          <View style={styles.titleContainer}>
            <Calculator size={24} color={colors.primary} style={styles.headerIcon} />
            <Text style={styles.headerTitle}>General Ledger</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconActionButton} onPress={load} disabled={loading}>
              <RefreshCw size={16} color={colors.textSecondary} style={loading ? styles.disabledOpacity : null} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryActionButton} onPress={() => setOpen(true)}>
              <Plus size={16} color={colors.primaryText} />
              <Text style={styles.primaryActionText}>New Entry</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.headerSubtitle}>Double-entry accounting journal for all financial transactions.</Text>
      </View>

      {loading ? (
        <View style={styles.centerLoadingState}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : sortedItems.length === 0 ? (
        <View style={styles.emptyStateContainer}>
          <ArrowRightLeft size={48} color={colors.textMuted} style={styles.emptyStateIcon} />
          <Text style={styles.emptyStateTitleText}>No Transactions Recorded</Text>
          <Text style={styles.emptyStateSubtitleText}>Start by creating your first journal entry.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          {sortedItems.map((item) => {
            const referenceId = item.reference || "JE-" + (item._id ? item._id.slice(-6) : "000000");
            return (
              <View key={item._id || Math.random().toString()} style={styles.journalCardFrame}>
                <View style={styles.journalCardMetaHeaderRow}>
                  <View style={styles.metaLeftSection}>
                    <View style={styles.calendarInlineRow}>
                      <Calendar size={14} color={colors.primary} style={styles.inlineIconMargin} />
                      <Text style={styles.metaDateLabelText}>{new Date(item.transactionDate).toLocaleDateString()}</Text>
                    </View>
                    <View style={styles.referenceBadgeFrame}>
                      <Text style={styles.referenceBadgeText}>{referenceId}</Text>
                    </View>
                    <Text style={styles.descriptionLabelText} numberOfLines={1}>{item.description}</Text>
                  </View>
                  <Text style={styles.postedByTextTag}>Posted by System</Text>
                </View>

                <View style={styles.journalTableCanvasColumn}>
                  <View style={styles.tableInnerHeaderRow}>
                    <Text style={[styles.columnLabelCell, styles.flexColumnAccount]}>Account</Text>
                    <Text style={[styles.columnLabelCell, styles.flexColumnAmount, styles.textAlignRight]}>Debit</Text>
                    <Text style={[styles.columnLabelCell, styles.flexColumnAmount, styles.textAlignRight]}>Credit</Text>
                  </View>

                  {item.lines?.map((line: any, idx: number) => {
                    const isCredit = (Number(line.credit) || 0) > 0;
                    return (
                      <View key={idx} style={styles.tableInnerDataBodyRow}>
                        <View style={[styles.flexColumnAccount, isCredit ? styles.creditIndentationPadding : null]}>
                          <Text style={[styles.accountLabelText, isCredit ? styles.creditAccountTextMuted : styles.debitAccountTextBold]}>
                            {line.account?.name || "Unknown Account"}
                          </Text>
                          <Text style={styles.accountCodeMonoText}>{line.account?.code}</Text>
                        </View>
                        <Text style={[styles.flexColumnAmount, styles.fontMonoDataText, styles.textAlignRight]}>
                          {(Number(line.debit) || 0) > 0 ? "$" + line.debit.toLocaleString() : ""}
                        </Text>
                        <Text style={[styles.flexColumnAmount, styles.fontMonoDataText, styles.textAlignRight]}>
                          {(Number(line.credit) || 0) > 0 ? "$" + line.credit.toLocaleString() : ""}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      <Modal animationType="slide" transparent={true} visible={open} onRequestClose={() => setOpen(false)}>
        <View style={styles.modalBlurOverlay}>
          <View style={styles.modalContentCard}>
            <View style={styles.modalCardHeaderTopRow}>
              <Text style={styles.modalCardTitleHeading}>New Journal Entry</Text>
              <TouchableOpacity onPress={() => setOpen(false)} style={styles.closeModalCrossButton}>
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalFormScrollContainer} keyboardShouldPersistTaps="handled">
              <View style={styles.formSplitColumnsContainer}>
                <View style={styles.formSplitFieldColumn}>
                  <Text style={styles.formElementFieldLabel}>Transaction Date</Text>
                  <TextInput
                    style={styles.formInputFieldText}
                    value={form.transactionDate}
                    onChangeText={(text) => setForm({ ...form, transactionDate: text })}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
                <View style={styles.formSplitFieldColumn}>
                  <Text style={styles.formElementFieldLabel}>Description</Text>
                  <TextInput
                    style={styles.formInputFieldText}
                    value={form.description}
                    onChangeText={(text) => setForm({ ...form, description: text })}
                    placeholder="e.g., Monthly Rent Payment"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>

              <View style={styles.dynamicLinesWrapperContainer}>
                <View style={styles.linesTableHeaderMetaRow}>
                  <Text style={[styles.lineHeaderLabelText, styles.colLineAccountWidth]}>Account</Text>
                  <Text style={[styles.lineHeaderLabelText, styles.colLineAmountWidth, styles.textAlignRight]}>Debit</Text>
                  <Text style={[styles.lineHeaderLabelText, styles.colLineAmountWidth, styles.textAlignRight]}>Credit</Text>
                  <View style={styles.colLineActionWidth} />
                </View>

                {form.lines.map((line, i) => (
                  <View key={i} style={styles.interactiveLineFormRow}>
                    <TouchableOpacity
                      style={[styles.formSelectInputAnchor, styles.colLineAccountWidth]}
                      activeOpacity={0.7}
                      onPress={() => {
                        setActiveLineIndex(i);
                        setShowAccountSelector(true);
                      }}
                    >
                      <View style={styles.selectDropdownFlexRow}>
                        <Text style={styles.customSelectAnchorText} numberOfLines={1}>
                          {line.accountCode ? `[${line.accountCode}] ${line.accountName}` : "Select Account..."}
                        </Text>
                        <ChevronDown size={14} color={colors.textSecondary} />
                      </View>
                    </TouchableOpacity>

                    <TextInput
                      style={[styles.formInputFieldText, styles.colLineAmountWidth, styles.textAlignRight]}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor={colors.textMuted}
                      value={line.debit ? String(line.debit) : ""}
                      onChangeText={(text) => handleLineChange(i, "debit", text)}
                    />

                    <TextInput
                      style={[styles.formInputFieldText, styles.colLineAmountWidth, styles.textAlignRight]}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor={colors.textMuted}
                      value={line.credit ? String(line.credit) : ""}
                      onChangeText={(text) => handleLineChange(i, "credit", text)}
                    />

                    <TouchableOpacity
                      style={styles.lineRowActionRemovalButton}
                      disabled={form.lines.length <= 2}
                      onPress={() => {
                        if (form.lines.length <= 2) return;
                        setForm({ ...form, lines: form.lines.filter((_, idx) => idx !== i) });
                      }}
                    >
                      <Trash2 size={14} color={form.lines.length <= 2 ? colors.border : colors.dangerText} />
                    </TouchableOpacity>
                  </View>
                ))}

                <TouchableOpacity style={styles.appendLineActionTextRowAnchorButton} onPress={handleAddLine}>
                  <Text style={styles.appendLineActionLabelText}>+ Add Line</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.modalAggregationSummaryPanelBox}>
                <View style={styles.aggregationSplitColumnDetails}>
                  <Text style={styles.aggregationMetaTitleLabelText}>Total Debits</Text>
                  <Text style={styles.aggregationNumericalMonoValueText}>${totalDebit.toLocaleString()}</Text>
                </View>
                <View style={styles.aggregationSplitColumnDetails}>
                  <Text style={styles.aggregationMetaTitleLabelText}>Total Credits</Text>
                  <Text style={styles.aggregationNumericalMonoValueText}>${totalCredit.toLocaleString()}</Text>
                </View>
              </View>

              {!isBalanced && totalDebit > 0 && (
                <Text style={styles.unbalancedWarningAlertLabelNotificationText}>
                  Journal entry must be balanced (Debits = Credits)
                </Text>
              )}
            </ScrollView>

            <View style={styles.modalCardActionsFooterRow}>
              <TouchableOpacity style={styles.modalCancelButtonAction} onPress={() => setOpen(false)}>
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalSubmitButtonAction, isBalanced ? styles.balancedSubmissionBgColor : styles.disabledSubmissionBgColor]} 
                onPress={handleCreate}
                disabled={!isBalanced}
              >
                <Text style={styles.modalSubmitButtonText}>Post Journal Entry</Text>
              </TouchableOpacity>
            </View>

            {showAccountSelector && (
              <View style={styles.inlineDropdownOverlayContainer}>
                <View style={styles.inlineDropdownCardWindow}>
                  <View style={styles.inlineDropdownHeaderRow}>
                    <Text style={styles.inlineDropdownHeaderTitleText}>Select Chart Account</Text>
                    <TouchableOpacity onPress={() => { setShowAccountSelector(false); setActiveLineIndex(null); }}>
                      <X size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                  <ScrollView style={styles.inlineDropdownScrollCanvas} keyboardShouldPersistTaps="handled">
                    {accounts.map((acc) => (
                      <TouchableOpacity
                        key={acc._id || Math.random().toString()}
                        style={styles.pickerRowSelectionButtonAnchor}
                        onPress={() => handleSelectAccount(acc)}
                      >
                        <Text style={styles.pickerRowAccountCodeText}>[{acc.code}]</Text>
                        <Text style={styles.pickerRowAccountNameText} numberOfLines={1}>{acc.name}</Text>
                      </TouchableOpacity>
                    ))}
                    {accounts.length === 0 && (
                      <Text style={styles.pickerEmptyFallbackStateLabelText}>No accounts configured.</Text>
                    )}
                  </ScrollView>
                </View>
              </View>
            )}

          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}