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
  Coins,
  Plus,
  RefreshCw,
  User,
  CreditCard,
  ChevronDown,
  X,
} from "lucide-react-native";

const { height } = Dimensions.get("window");

interface EmployeeItem {
  _id: string;
  name: string;
}

interface PayrollItem {
  _id: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  baseSalary: number | string;
  bonuses: number | string;
  deductions: number | string;
  netPay: number | string;
  status?: string;
  employee?: {
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
    primaryTranslucent: isDark ? "rgba(180, 83, 9, 0.25)" : "#FEF3C7",
    successText:      isDark ? "#34D399" : "#16A34A",
    dangerText:       isDark ? "#F87171" : "#DC2626",
    statusPaidBg:     isDark ? "#F4F4F5" : "#0F172A",
    statusPaidText:   isDark ? "#09090b" : "#FFFFFF",
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
    kpiCardFrame: { backgroundColor: colors.borderLight, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 16, flexDirection: "row", alignItems: "center", gap: 12, maxWidth: 340 },
    kpiIconBox: { padding: 10, backgroundColor: colors.primaryTranslucent, borderRadius: 10 },
    kpiDataBox: { flex: 1 },
    kpiCardMetaLabel: { fontSize: 11, fontWeight: "700", color: colors.primary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
    kpiCardNumericHeading: { fontSize: 22, fontWeight: "900", color: colors.primary },
    tableCardHeaderStrip: { marginHorizontal: 16, marginBottom: 8, paddingTop: 4 },
    tableHeadingText: { fontSize: 15, fontWeight: "700", color: colors.text },
    centerLoadingState: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 40 },
    emptyStateContainer: { backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.border, borderRadius: 12, marginHorizontal: 16, padding: 32, alignItems: "center" },
    emptyStateText: { fontSize: 13, color: colors.textMuted, fontStyle: "italic" },
    tableCanvasCard: { backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.border, borderRadius: 12, overflow: "hidden" },
    tableHeaderRowFrame: { flexDirection: "row", alignItems: "center", backgroundColor: colors.borderLight, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
    tableHeaderLabelText: { fontSize: 11, fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.3 },
    colEmployee: { flex: 1.8 },
    colFinancials: { flex: 1.4 },
    colStatus: { flex: 0.9 },
    textAlignRight: { textAlign: "right", alignItems: "flex-end" },
    tableBodyRowFrame: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
    userIconInlineRow: { flexDirection: "row", alignItems: "center" },
    iconInlineMarginRight: { marginRight: 4 },
    employeeNameText: { fontSize: 14, fontWeight: "700", color: colors.text, flex: 1 },
    periodDurationText: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
    netPayHighlightText: { fontSize: 14, fontWeight: "900", color: colors.successText, fontFamily: Platform.OS === "ios" ? "Courier" : "monospace" },
    deductionsBreakdownText: { fontSize: 11, color: colors.dangerText, marginTop: 2 },
    statusBadgeFrame: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
    statusPaidBg: { backgroundColor: colors.statusPaidBg },
    statusSecondaryBg: { backgroundColor: colors.border },
    statusBadgeText: { color: colors.statusPaidText, fontSize: 10, fontWeight: "700" },
    statusPendingText: { color: colors.textSecondary },
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

export default function PayrollManagement() {
  const { uiTheme } = useTheme();
  const isDark = (uiTheme.theme as string) === "dark" || (uiTheme.theme as string) === "metallic-elite";
  const colors = useMemo(() => buildColors(uiTheme, isDark), [uiTheme, isDark]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [items, setItems] = useState<PayrollItem[]>([]);
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [showEmployeeSelector, setShowEmployeeSelector] = useState(false);
  
  const [form, setForm] = useState({ 
    employee: "", 
    payPeriodStart: new Date().toISOString().split("T")[0], 
    payPeriodEnd: new Date().toISOString().split("T")[0], 
    baseSalary: "", 
    bonuses: "0", 
    deductions: "0" 
  });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [payrollRes, empRes] = await Promise.all([
        apiFetch<ApiResponse<PayrollItem>>("/api/atlasbook/payroll"),
        apiFetch<any>("/api/employees")
      ]);
      if (payrollRes?.success) setItems(payrollRes.items || []);
      if (empRes) setEmployees(Array.isArray(empRes) ? empRes : (empRes.items || []));
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
      const parsedBase = parseFloat(form.baseSalary.replace(/\s+/g, "").replace(",", ".")) || 0;
      const parsedBonuses = parseFloat(form.bonuses.replace(/\s+/g, "").replace(",", ".")) || 0;
      const parsedDeductions = parseFloat(form.deductions.replace(/\s+/g, "").replace(",", ".")) || 0;
      
      const netPay = parsedBase + parsedBonuses - parsedDeductions;

      const res = await apiFetch<{ success: boolean }>("/api/atlasbook/payroll", {
        method: "POST",
        body: JSON.stringify({ 
          ...form, 
          baseSalary: parsedBase,
          bonuses: parsedBonuses,
          deductions: parsedDeductions,
          netPay 
        }),
      });
      if (res?.success) {
        setOpen(false);
        setForm({ 
          employee: "", 
          payPeriodStart: new Date().toISOString().split("T")[0], 
          payPeriodEnd: new Date().toISOString().split("T")[0], 
          baseSalary: "", 
          bonuses: "0", 
          deductions: "0" 
        });
        load();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const totalPaid = useMemo(() => {
    return items.filter(i => i.status === "Paid").reduce((sum, i) => sum + (Number(i.netPay) || 0), 0);
  }, [items]);

  const getSelectedEmployeeName = () => {
    if (!form.employee) return "Choose Employee...";
    const found = employees.find((e) => e._id === form.employee);
    return found ? found.name : "Choose Employee...";
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerBlock}>
        <View style={styles.headerTopRow}>
          <View style={styles.titleContainer}>
            <Coins size={24} color={colors.primary} style={styles.headerIcon} />
            <Text style={styles.headerTitle}>Payroll Module</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity style={styles.iconActionButton} onPress={load} disabled={loading}>
              <RefreshCw size={16} color={colors.textSecondary} style={loading ? styles.disabledOpacity : null} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryActionButton} onPress={() => setOpen(true)}>
              <Plus size={16} color={colors.primaryText} />
              <Text style={styles.primaryActionText}>Process Payroll</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.headerSubtitle}>
          Manage employee compensation, deductions, and payment cycles.
        </Text>
      </View>

      <View style={styles.kpiContainerRow}>
        <View style={styles.kpiCardFrame}>
          <View style={styles.kpiIconBox}>
            <CreditCard size={22} color={colors.primary} />
          </View>
          <View style={styles.kpiDataBox}>
            <Text style={styles.kpiCardMetaLabel}>Total Paid (YTD)</Text>
            <Text style={styles.kpiCardNumericHeading}>${totalPaid.toLocaleString()}</Text>
          </View>
        </View>
      </View>

      <View style={styles.tableCardHeaderStrip}>
        <Text style={styles.tableHeadingText}>Payroll Records</Text>
      </View>

      {loading ? (
        <View style={styles.centerLoadingState}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateText}>No payroll records found.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.tableCanvasCard}>
            <View style={styles.tableHeaderRowFrame}>
              <Text style={[styles.tableHeaderLabelText, styles.colEmployee]}>Employee / Period</Text>
              <Text style={[styles.tableHeaderLabelText, styles.colFinancials, styles.textAlignRight]}>Net Pay</Text>
              <Text style={[styles.tableHeaderLabelText, styles.colStatus, styles.textAlignRight]}>Status</Text>
            </View>

            {items.map((item) => {
              const startStr = item.payPeriodStart ? new Date(item.payPeriodStart).toLocaleDateString() : "";
              const endStr = item.payPeriodEnd ? new Date(item.payPeriodEnd).toLocaleDateString() : "";
              const isPaid = item.status === "Paid";
              
              return (
                <View key={item._id || Math.random().toString()} style={styles.tableBodyRowFrame}>
                  <View style={styles.colEmployee}>
                    <View style={styles.userIconInlineRow}>
                      <User size={13} color={colors.textMuted} style={styles.iconInlineMarginRight} />
                      <Text style={styles.employeeNameText} numberOfLines={1}>
                        {item.employee?.name || "Unknown Employee"}
                      </Text>
                    </View>
                    <Text style={styles.periodDurationText}>{startStr} - {endStr}</Text>
                  </View>

                  <View style={[styles.colFinancials, styles.textAlignRight]}>
                    <Text style={styles.netPayHighlightText}>
                      ${(Number(item.netPay) || 0).toLocaleString()}
                    </Text>
                    <Text style={styles.deductionsBreakdownText}>
                      Deductions: -${(Number(item.deductions) || 0).toLocaleString()}
                    </Text>
                  </View>

                  <View style={[styles.colStatus, styles.textAlignRight]}>
                    <View style={[
                      styles.statusBadgeFrame, 
                      isPaid ? styles.statusPaidBg : styles.statusSecondaryBg
                    ]}>
                      <Text style={[styles.statusBadgeText, !isPaid && styles.statusPendingText]}>
                        {item.status || "Pending"}
                      </Text>
                    </View>
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
              <Text style={styles.modalCardTitleHeading}>Process Payroll Record</Text>
              <TouchableOpacity onPress={() => setOpen(false)} style={styles.closeModalCrossButton}>
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalFormScrollContainer} keyboardShouldPersistTaps="handled">
              <View style={styles.formElementWrapperFieldBlock}>
                <Text style={styles.formElementFieldLabel}>Select Employee</Text>
                <TouchableOpacity style={styles.formSelectInputAnchor} activeOpacity={0.7} onPress={() => setShowEmployeeSelector(true)}>
                  <View style={styles.selectDropdownFlexRow}>
                    <Text style={styles.customSelectAnchorText} numberOfLines={1}>{getSelectedEmployeeName()}</Text>
                    <ChevronDown size={14} color={colors.textSecondary} />
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.formSplitColumnsContainer}>
                <View style={styles.formSplitFieldColumn}>
                  <Text style={styles.formElementFieldLabel}>Period Start</Text>
                  <TextInput
                    style={styles.formInputFieldText}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.placeholderText}
                    value={form.payPeriodStart}
                    onChangeText={(text) => setForm({ ...form, payPeriodStart: text })}
                  />
                </View>
                <View style={styles.formSplitFieldColumn}>
                  <Text style={styles.formElementFieldLabel}>Period End</Text>
                  <TextInput
                    style={styles.formInputFieldText}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.placeholderText}
                    value={form.payPeriodEnd}
                    onChangeText={(text) => setForm({ ...form, payPeriodEnd: text })}
                  />
                </View>
              </View>

              <View style={styles.formElementWrapperFieldBlock}>
                <Text style={styles.formElementFieldLabel}>Base Salary</Text>
                <TextInput
                  style={styles.formInputFieldText}
                  placeholder="0.00"
                  placeholderTextColor={colors.placeholderText}
                  keyboardType="numeric"
                  value={form.baseSalary}
                  onChangeText={(text) => setForm({ ...form, baseSalary: text })}
                />
              </View>

              <View style={styles.formSplitColumnsContainer}>
                <View style={styles.formSplitFieldColumn}>
                  <Text style={styles.formElementFieldLabel}>Bonuses</Text>
                  <TextInput
                    style={styles.formInputFieldText}
                    placeholder="0.00"
                    placeholderTextColor={colors.placeholderText}
                    keyboardType="numeric"
                    value={form.bonuses}
                    onChangeText={(text) => setForm({ ...form, bonuses: text })}
                  />
                </View>
                <View style={styles.formSplitFieldColumn}>
                  <Text style={styles.formElementFieldLabel}>Deductions</Text>
                  <TextInput
                    style={styles.formInputFieldText}
                    placeholder="0.00"
                    placeholderTextColor={colors.placeholderText}
                    keyboardType="numeric"
                    value={form.deductions}
                    onChangeText={(text) => setForm({ ...form, deductions: text })}
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalCardActionsFooterRow}>
              <TouchableOpacity style={styles.modalCancelButtonAction} onPress={() => setOpen(false)}>
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmitButtonAction} onPress={handleCreate}>
                <Text style={styles.modalSubmitButtonText}>Post Payroll</Text>
              </TouchableOpacity>
            </View>
          </View>

          {showEmployeeSelector && (
            <View style={styles.inlineDropdownOverlayContainer}>
              <View style={styles.inlineDropdownCardWindow}>
                <View style={styles.inlineDropdownHeaderRow}>
                  <Text style={styles.inlineDropdownHeaderTitleText}>Choose Employee</Text>
                  <TouchableOpacity onPress={() => setShowEmployeeSelector(false)} style={styles.closePickerTouchTarget}>
                    <X size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.inlineDropdownScrollCanvas} keyboardShouldPersistTaps="handled">
                  <TouchableOpacity
                    style={styles.pickerRowSelectionButtonAnchor}
                    onPress={() => {
                      setForm({ ...form, employee: "" });
                      setShowEmployeeSelector(false);
                    }}
                  >
                    <Text style={[styles.pickerRowCategoryValueText, !form.employee ? styles.activeGoldenSelectionText : null]}>
                      Choose Employee...
                    </Text>
                  </TouchableOpacity>
                  {employees.map((e) => (
                    <TouchableOpacity
                      key={e._id}
                      style={styles.pickerRowSelectionButtonAnchor}
                      onPress={() => {
                        setForm({ ...form, employee: e._id });
                        setShowEmployeeSelector(false);
                      }}
                    >
                      <Text style={[styles.pickerRowCategoryValueText, form.employee === e._id ? styles.activeGoldenSelectionText : null]}>
                        {e.name}
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