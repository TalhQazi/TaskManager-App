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
  ArrowRightLeft,
  Plus,
  Search,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Calendar,
  Wallet,
  ChevronDown,
  X,
} from "lucide-react-native";
import { s } from "@/util/styles";

const { height } = Dimensions.get("window");

interface AccountItem {
  _id: string;
  code: string;
  name: string;
}

interface TransactionItem {
  _id: string;
  date: string;
  type: "Income" | "Expense" | string;
  amount: number;
  description: string;
  paymentMethod: string;
  account?: {
    name: string;
  };
}

interface TransactionForm {
  date: string;
  type: string;
  amount: string;
  account: string;
  description: string;
  paymentMethod: string;
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
    inputBg:          isDark ? "#27272A" : "#FFFFFF",
    placeholderText:  isDark ? "#A1A1AA" : "#94A3B8",
    primary:          uiTheme.customColors?.primary || "#B45309",
    primaryText:      "#FFFFFF",
    incomeText:       "#059669",
    incomeBg:         isDark ? "rgba(16, 185, 129, 0.15)" : "rgba(16, 185, 129, 0.08)",
    incomeIconBg:     isDark ? "rgba(16, 185, 129, 0.25)" : "rgba(16, 185, 129, 0.15)",
    expenseText:      "#E11D48",
    expenseBg:        isDark ? "rgba(244, 63, 94, 0.15)" : "rgba(244, 63, 94, 0.08)",
    expenseIconBg:    isDark ? "rgba(244, 63, 94, 0.25)" : "rgba(244, 63, 94, 0.15)",
    primaryBg:        isDark ? "rgba(180, 83, 9, 0.15)" : "rgba(180, 83, 9, 0.08)",
    primaryIconBg:    isDark ? "rgba(180, 83, 9, 0.25)" : "rgba(180, 83, 9, 0.15)",
    overlayBg:        "rgba(0, 0, 0, 0.4)",
  };
}

function createStyles(colors: ReturnType<typeof buildColors>) {
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
      paddingBottom: 12,
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
      marginRight: 8,
    },
    headerIcon: {
      marginRight: 8,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: "800",
      color: colors.text,
      letterSpacing: -0.5,
    },
    headerActionsRow: {
      flexDirection: "row",
      gap: 8,
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
      opacity: 0.4,
    },
    primaryActionButton: {
      flexDirection: "row",
      backgroundColor: colors.primary,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 8,
      alignItems: "center",
      gap: 6,
    },
    primaryActionText: {
      color: colors.primaryText,
      fontSize: 13,
      fontWeight: "600",
    },
    headerSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    kpiContainerRow: {
      marginBottom: 16,
    },
    kpiScrollCanvas: {
      paddingHorizontal: 16,
      gap: 12,
    },
    kpiCardFrame: {
      borderWidth: 1,
      borderRadius: 12,
      padding: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      minWidth: 180,
    },
    kpiIncomeBg: {
      backgroundColor: colors.incomeBg,
      borderColor: colors.border,
    },
    kpiExpenseBg: {
      backgroundColor: colors.expenseBg,
      borderColor: colors.border,
    },
    kpiPrimaryBg: {
      backgroundColor: colors.primaryBg,
      borderColor: colors.border,
    },
    kpiIconBox: {
      width: 36,
      height: 36,
      borderRadius: 10,
      justifyContent: "center",
      alignItems: "center",
    },
    kpiIncomeIconBg: {
      backgroundColor: colors.incomeIconBg,
    },
    kpiExpenseIconBg: {
      backgroundColor: colors.expenseIconBg,
    },
    kpiPrimaryIconBg: {
      backgroundColor: colors.primaryIconBg,
    },
    kpiDataBox: {
      flex: 1,
    },
    kpiCardMetaLabel: {
      fontSize: 10,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.3,
    },
    kpiIncomeText: {
      color: colors.incomeText,
    },
    kpiExpenseText: {
      color: colors.expenseText,
    },
    kpiPrimaryText: {
      color: colors.primary,
    },
    kpiCardNumericHeading: {
      fontSize: 20,
      fontWeight: "900",
      color: colors.text,
      marginTop: 2,
    },
    searchFilterContainer: {
      paddingHorizontal: 16,
      marginBottom: 14,
    },
    searchBarWrapperFrame: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      height: 42,
    },
    searchBarIconSpacing: {
      marginRight: 8,
    },
    searchBarInputFieldText: {
      flex: 1,
      fontSize: 13,
      color: colors.text,
      height: "100%",
    },
    tableCardHeaderStrip: {
      marginHorizontal: 16,
      marginBottom: 8,
    },
    tableHeadingText: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.text,
    },
    centerLoadingState: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: 40,
    },
    emptyStateContainer: {
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      marginHorizontal: 16,
      padding: 32,
      alignItems: "center",
    },
    emptyStateText: {
      fontSize: 13,
      color: colors.textMuted,
      fontStyle: "italic",
    },
    tableCanvasCard: {
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      overflow: "hidden",
    },
    tableHeaderRowFrame: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.borderLight,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    tableHeaderLabelText: {
      fontSize: 9,
      fontWeight: "700",
      color: colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.2,
    },
    colMetaDetails: {
      flex: 2.0,
      paddingRight: 4,
    },
    colDescription: {
      flex: 1.8,
      paddingRight: 4,
    },
    colAmountDetails: {
      flex: 1.4,
      alignItems: "flex-end",
    },
    textAlignRight: {
      textAlign: "right",
    },
    tableBodyRowFrame: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    flexRowAlignment: {
      flexDirection: "row",
      alignItems: "center",
    },
    iconInlineMarginRight: {
      marginRight: 4,
    },
    dateValueText: {
      fontSize: 11,
      fontWeight: "600",
      color: colors.textSecondary,
    },
    badgeRowAlignment: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 4,
      marginBottom: 2,
    },
    typeBadgeBaseFrame: {
      borderRadius: 4,
      paddingHorizontal: 5,
      paddingVertical: 1,
    },
    badgeIncomeBg: {
      backgroundColor: colors.incomeText,
    },
    badgeExpenseBg: {
      backgroundColor: colors.expenseText,
    },
    typeBadgeInnerText: {
      color: colors.primaryText,
      fontSize: 8,
      fontWeight: "700",
      textTransform: "uppercase",
    },
    paymentMethodSubtext: {
      fontSize: 10,
      color: colors.textMuted,
      flex: 1,
    },
    accountCodeLabelText: {
      fontSize: 11,
      fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
      color: colors.textSecondary,
    },
    descriptionContentText: {
      fontSize: 12,
      color: colors.textSecondary,
      lineHeight: 16,
    },
    amountNumericalValueText: {
      fontSize: 13,
      fontWeight: "700",
      fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    },
    amountIncomeText: {
      color: colors.incomeText,
    },
    amountExpenseText: {
      color: colors.expenseText,
    },
    modalBlurOverlay: {
      flex: 1,
      backgroundColor: colors.overlayBg,
      justifyContent: "flex-end",
      position: "relative",
    },
    modalContentCard: {
      backgroundColor: colors.cardBg,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      width: "100%",
      maxHeight: height * 0.85,
      padding: 20,
    },
    modalCardHeaderTopRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
      paddingBottom: 12,
    },
    modalCardTitleHeading: {
      fontSize: 18,
      fontWeight: "800",
      color: colors.text,
    },
    closeModalCrossButton: {
      padding: 4,
    },
    modalFormScrollContainer: {
      flexGrow: 0,
      marginBottom: 8,
    },
    formElementWrapperFieldBlock: {
      marginBottom: 14,
    },
    formSplitColumnsContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 12,
      marginBottom: 14,
    },
    formSplitFieldColumn: {
      flex: 1,
    },
    formElementFieldLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.textSecondary,
      marginBottom: 6,
    },
    formInputFieldText: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 6,
      height: 38,
      paddingHorizontal: 10,
      fontSize: 13,
      color: colors.text,
      backgroundColor: colors.inputBg,
    },
    formSelectInputAnchor: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 6,
      height: 38,
      paddingHorizontal: 10,
      backgroundColor: colors.background,
      justifyContent: "center",
    },
    selectDropdownFlexRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    customSelectAnchorText: {
      fontSize: 13,
      color: colors.text,
      fontWeight: "500",
      flex: 1,
      marginRight: 4,
    },
    modalCardActionsFooterRow: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 10,
      marginTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
      paddingTop: 14,
    },
    modalCancelButtonAction: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.cardBg,
    },
    modalCancelButtonText: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.textSecondary,
    },
    modalSubmitButtonAction: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 6,
      backgroundColor: colors.primary,
    },
    modalSubmitButtonText: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.primaryText,
    },
    inlineDropdownOverlayContainer: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.overlayBg,
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
      zIndex: 999,
    },
    inlineDropdownCardWindow: {
      backgroundColor: colors.cardBg,
      width: "100%",
      maxWidth: 320,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      maxHeight: height * 0.5,
    },
    inlineDropdownHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingBottom: 12,
      marginBottom: 8,
    },
    inlineDropdownHeaderTitleText: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.text,
    },
    closePickerTouchTarget: {
      padding: 4,
    },
    inlineDropdownScrollCanvas: {
      flexGrow: 0,
    },
    pickerRowSelectionButtonAnchor: {
      paddingVertical: 14,
      paddingHorizontal: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    pickerRowCategoryValueText: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: "500",
    },
    activeGoldenSelectionText: {
      color: colors.primary,
      fontWeight: "700",
    },
  });
}

export default function TransactionManagement() {
  const { uiTheme } = useTheme();
  const isDark = (uiTheme.theme as string) === "dark" || (uiTheme.theme as string) === "metallic-elite";
  const colors = useMemo(() => buildColors(uiTheme, isDark), [uiTheme, isDark]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [items, setItems] = useState<TransactionItem[]>([]);
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [q, setQ] = useState<string>("");
  const [open, setOpen] = useState<boolean>(false);
  const [showTypeSelector, setShowTypeSelector] = useState<boolean>(false);
  const [showAccountSelector, setShowAccountSelector] = useState<boolean>(false);

  const [form, setForm] = useState<TransactionForm>({
    date: new Date().toISOString().split("T")[0],
    type: "Expense",
    amount: "",
    account: "",
    description: "",
    paymentMethod: "Bank Transfer",
  });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [transRes, accountsRes] = await Promise.all([
        apiFetch<ApiResponse<TransactionItem>>("/api/atlasbook/transactions"),
        apiFetch<ApiResponse<AccountItem>>("/api/atlasbook/accounts"),
      ]);
      if (transRes?.success) setItems(transRes.items || []);
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

  const handleCreate = async () => {
    try {
      const cleanPayload = {
        ...form,
        amount: parseFloat(form.amount.replace(/\s+/g, "").replace(",", ".")) || 0,
        account: form.account || null,
      };

      const res = await apiFetch<{ success: boolean }>("/api/atlasbook/transactions", {
        method: "POST",
        body: JSON.stringify(cleanPayload),
      });
      if (res?.success) {
        setOpen(false);
        setForm({
          date: new Date().toISOString().split("T")[0],
          type: "Expense",
          amount: "",
          account: "",
          description: "",
          paymentMethod: "Bank Transfer",
        });
        load();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const getSelectedAccountLabel = () => {
    if (!form.account) return "Select Account...";
    const found = accounts.find((a) => a._id === form.account);
    return found ? `[${found.code}] ${found.name}` : "Select Account...";
  };

  const filtered = useMemo(() => {
    return items.filter(
      (i) =>
        i.description?.toLowerCase().includes(q.toLowerCase()) ||
        i.type?.toLowerCase().includes(q.toLowerCase())
    );
  }, [items, q]);

  const totalIncome = useMemo(() => {
    return items.filter((i) => i.type === "Income").reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  }, [items]);

  const totalExpense = useMemo(() => {
    return items.filter((i) => i.type === "Expense").reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  }, [items]);

  const netBalance = useMemo(() => {
    return totalIncome - totalExpense;
  }, [totalIncome, totalExpense]);

  const sortedItems = useMemo(() => {
    return [...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filtered]);

  return (
    <SafeAreaView style={s(styles.safeArea)}>
      <View style={s(styles.headerBlock)}>
        <View style={s(styles.headerTopRow)}>
          <View style={s(styles.titleContainer)}>
            <ArrowRightLeft size={24} color={colors.primary} style={s(styles.headerIcon)} />
            <Text style={s(styles.headerTitle)} numberOfLines={2}>Transaction Management</Text>
          </View>
          <View style={s(styles.headerActionsRow)}>
            <TouchableOpacity style={s(styles.iconActionButton)} onPress={load} disabled={loading}>
              <RefreshCw size={16} color={colors.textSecondary} style={s(loading && styles.disabledOpacity)} />
            </TouchableOpacity>
            <TouchableOpacity style={s(styles.primaryActionButton)} onPress={() => setOpen(true)}>
              <Plus size={16} color={colors.primaryText} />
              <Text style={s(styles.primaryActionText)}>New Transaction</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={s(styles.headerSubtitle)}>
          Track all incoming and outgoing business transactions.
        </Text>
      </View>

      <View style={s(styles.kpiContainerRow)}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s(styles.kpiScrollCanvas)}>
          <View style={s([styles.kpiCardFrame, styles.kpiIncomeBg])}>
            <View style={s([styles.kpiIconBox, styles.kpiIncomeIconBg])}>
              <TrendingUp size={20} color={colors.incomeText} />
            </View>
            <View style={s(styles.kpiDataBox)}>
              <Text style={s([styles.kpiCardMetaLabel, styles.kpiIncomeText])}>Total Income</Text>
              <Text style={s(styles.kpiCardNumericHeading)}>${totalIncome.toLocaleString()}</Text>
            </View>
          </View>

          <View style={s([styles.kpiCardFrame, styles.kpiExpenseBg])}>
            <View style={s([styles.kpiIconBox, styles.kpiExpenseIconBg])}>
              <TrendingDown size={20} color={colors.expenseText} />
            </View>
            <View style={s(styles.kpiDataBox)}>
              <Text style={s([styles.kpiCardMetaLabel, styles.kpiExpenseText])}>Total Expenses</Text>
              <Text style={s(styles.kpiCardNumericHeading)}>${totalExpense.toLocaleString()}</Text>
            </View>
          </View>

          <View style={s([styles.kpiCardFrame, styles.kpiPrimaryBg])}>
            <View style={s([styles.kpiIconBox, styles.kpiPrimaryIconBg])}>
              <Wallet size={20} color={colors.primary} />
            </View>
            <View style={s(styles.kpiDataBox)}>
              <Text style={s([styles.kpiCardMetaLabel, styles.kpiPrimaryText])}>Net Balance</Text>
              <Text style={s(styles.kpiCardNumericHeading)}>${netBalance.toLocaleString()}</Text>
            </View>
          </View>
        </ScrollView>
      </View>

      <View style={s(styles.searchFilterContainer)}>
        <View style={s(styles.searchBarWrapperFrame)}>
          <Search size={16} color={colors.textMuted} style={s(styles.searchBarIconSpacing)} />
          <TextInput
            style={s(styles.searchBarInputFieldText)}
            placeholder="Search transactions..."
            placeholderTextColor={colors.placeholderText}
            value={q}
            onChangeText={setQ}
          />
        </View>
      </View>

      {loading ? (
        <View style={s(styles.centerLoadingState)}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : sortedItems.length === 0 ? (
        <View style={s(styles.emptyStateContainer)}>
          <Text style={s(styles.emptyStateText)}>No transactions found.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s(styles.scrollContainer)} showsVerticalScrollIndicator={false}>
          <View style={s(styles.tableCanvasCard)}>
            <View style={s(styles.tableHeaderRowFrame)}>
              <Text style={s([styles.tableHeaderLabelText, styles.colMetaDetails])}>Date / Account</Text>
              <Text style={s([styles.tableHeaderLabelText, styles.colDescription])}>Description</Text>
              <Text style={s([styles.tableHeaderLabelText, styles.colAmountDetails, styles.textAlignRight])}>Amount</Text>
            </View>

            {sortedItems.map((item, index) => {
              const formattedDate = item.date ? new Date(item.date).toLocaleDateString() : "";
              const isIncome = item.type === "Income";

              return (
                <View key={item._id || String(index)} style={s(styles.tableBodyRowFrame)}>
                  <View style={s(styles.colMetaDetails)}>
                    <View style={s(styles.flexRowAlignment)}>
                      <Calendar size={11} color={colors.textMuted} style={s(styles.iconInlineMarginRight)} />
                      <Text style={s(styles.dateValueText)}>{formattedDate}</Text>
                    </View>
                    
                    <View style={s(styles.badgeRowAlignment)}>
                      <View style={s([styles.typeBadgeBaseFrame, isIncome ? styles.badgeIncomeBg : styles.badgeExpenseBg])}>
                        <Text style={s(styles.typeBadgeInnerText)}>{item.type}</Text>
                      </View>
                      <Text style={s(styles.paymentMethodSubtext)} numberOfLines={1}>{item.paymentMethod}</Text>
                    </View>

                    <Text style={s(styles.accountCodeLabelText)} numberOfLines={1}>
                      {item.account?.name || "Unassigned Account"}
                    </Text>
                  </View>

                  <View style={s(styles.colDescription)}>
                    <Text style={s(styles.descriptionContentText)} numberOfLines={2}>
                      {item.description || "—"}
                    </Text>
                  </View>

                  <View style={s([styles.colAmountDetails, styles.textAlignRight])}>
                    <Text style={s([styles.amountNumericalValueText, isIncome ? styles.amountIncomeText : styles.amountExpenseText])}>
                      {isIncome ? "+" : "-"}${item.amount.toLocaleString()}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}

      <Modal animationType="slide" transparent={true} visible={open} onRequestClose={() => setOpen(false)}>
        <View style={s(styles.modalBlurOverlay)}>
          <View style={s(styles.modalContentCard)}>
            <View style={s(styles.modalCardHeaderTopRow)}>
              <Text style={s(styles.modalCardTitleHeading)}>New Transaction</Text>
              <TouchableOpacity onPress={() => setOpen(false)} style={s(styles.closeModalCrossButton)}>
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={s(styles.modalFormScrollContainer)} keyboardShouldPersistTaps="handled">
              <View style={s(styles.formSplitColumnsContainer)}>
                <View style={s(styles.formSplitFieldColumn)}>
                  <Text style={s(styles.formElementFieldLabel)}>Type</Text>
                  <TouchableOpacity style={s(styles.formSelectInputAnchor)} activeOpacity={0.7} onPress={() => setShowTypeSelector(true)}>
                    <View style={s(styles.selectDropdownFlexRow)}>
                      <Text style={s(styles.customSelectAnchorText)} numberOfLines={1}>{form.type}</Text>
                      <ChevronDown size={14} color={colors.textSecondary} />
                    </View>
                  </TouchableOpacity>
                </View>
                
                <View style={s(styles.formSplitFieldColumn)}>
                  <Text style={s(styles.formElementFieldLabel)}>Amount</Text>
                  <TextInput
                    style={s(styles.formInputFieldText)}
                    placeholder="0.00"
                    placeholderTextColor={colors.placeholderText}
                    keyboardType="numeric"
                    value={form.amount}
                    onChangeText={(text) => setForm({ ...form, amount: text })}
                  />
                </View>
              </View>

              <View style={s(styles.formElementWrapperFieldBlock)}>
                <Text style={s(styles.formElementFieldLabel)}>Date</Text>
                <TextInput
                  style={s(styles.formInputFieldText)}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.placeholderText}
                  value={form.date}
                  onChangeText={(text) => setForm({ ...form, date: text })}
                />
              </View>

              <View style={s(styles.formElementWrapperFieldBlock)}>
                <Text style={s(styles.formElementFieldLabel)}>GL Account</Text>
                <TouchableOpacity style={s(styles.formSelectInputAnchor)} activeOpacity={0.7} onPress={() => setShowAccountSelector(true)}>
                  <View style={s(styles.selectDropdownFlexRow)}>
                    <Text style={s(styles.customSelectAnchorText)} numberOfLines={1}>
                      {getSelectedAccountLabel()}
                    </Text>
                    <ChevronDown size={14} color={colors.textSecondary} />
                  </View>
                </TouchableOpacity>
              </View>

              <View style={s(styles.formElementWrapperFieldBlock)}>
                <Text style={s(styles.formElementFieldLabel)}>Description</Text>
                <TextInput
                  style={s(styles.formInputFieldText)}
                  placeholder="What was this for?"
                  placeholderTextColor={colors.placeholderText}
                  value={form.description}
                  onChangeText={(text) => setForm({ ...form, description: text })}
                />
              </View>
            </ScrollView>

            <View style={s(styles.modalCardActionsFooterRow)}>
              <TouchableOpacity style={s(styles.modalCancelButtonAction)} onPress={() => setOpen(false)}>
                <Text style={s(styles.modalCancelButtonText)}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s(styles.modalSubmitButtonAction)} onPress={handleCreate}>
                <Text style={s(styles.modalSubmitButtonText)}>Post Transaction</Text>
              </TouchableOpacity>
            </View>
          </View>

          {showTypeSelector && (
            <View style={s(styles.inlineDropdownOverlayContainer)}>
              <View style={s(styles.inlineDropdownCardWindow)}>
                <View style={s(styles.inlineDropdownHeaderRow)}>
                  <Text style={s(styles.inlineDropdownHeaderTitleText)}>Select Type</Text>
                  <TouchableOpacity onPress={() => setShowTypeSelector(false)} style={s(styles.closePickerTouchTarget)}>
                    <X size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                <ScrollView style={s(styles.inlineDropdownScrollCanvas)} keyboardShouldPersistTaps="handled">
                  {["Income", "Expense"].map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={s(styles.pickerRowSelectionButtonAnchor)}
                      onPress={() => {
                        setForm({ ...form, type: t });
                        setShowTypeSelector(false);
                      }}
                    >
                      <Text style={s([styles.pickerRowCategoryValueText, form.type === t && styles.activeGoldenSelectionText])}>
                        {t === "Income" ? "Income (+)" : "Expense (-)"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          )}

          {showAccountSelector && (
            <View style={s(styles.inlineDropdownOverlayContainer)}>
              <View style={s(styles.inlineDropdownCardWindow)}>
                <View style={s(styles.inlineDropdownHeaderRow)}>
                  <Text style={s(styles.inlineDropdownHeaderTitleText)}>Select GL Account</Text>
                  <TouchableOpacity onPress={() => setShowAccountSelector(false)} style={s(styles.closePickerTouchTarget)}>
                    <X size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                <ScrollView style={s(styles.inlineDropdownScrollCanvas)} keyboardShouldPersistTaps="handled">
                  <TouchableOpacity
                    style={s(styles.pickerRowSelectionButtonAnchor)}
                    onPress={() => {
                      setForm({ ...form, account: "" });
                      setShowAccountSelector(false);
                    }}
                  >
                    <Text style={s([styles.pickerRowCategoryValueText, !form.account && styles.activeGoldenSelectionText])}>
                      Select Account...
                    </Text>
                  </TouchableOpacity>
                  {accounts.map((a, index) => (
                    <TouchableOpacity
                      key={a._id || String(index)}
                      style={s(styles.pickerRowSelectionButtonAnchor)}
                      onPress={() => {
                        setForm({ ...form, account: a._id });
                        setShowAccountSelector(false);
                      }}
                    >
                      <Text style={s([styles.pickerRowCategoryValueText, form.account === a._id && styles.activeGoldenSelectionText])}>
                        [{a.code}] {a.name}
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