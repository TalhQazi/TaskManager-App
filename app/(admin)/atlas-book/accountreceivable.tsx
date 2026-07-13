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
  Wallet,
  Plus,
  Search,
  RefreshCw,
  Send,
  User,
  X,
  ChevronDown,
  Check,
} from "lucide-react-native";
import { apiFetch } from "@/lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";

const { width } = Dimensions.get("window");

interface TenantItem {
  _id: string;
  name: string;
}

interface InvoiceItem {
  _id: string;
  invoiceNumber: string;
  customerName: string;
  tenant?: string;
  date: string;
  dueDate?: string;
  status: string;
  amount: number;
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
    kpiSummaryCard: { borderRadius: 14, borderWidth: 1, padding: 16, flexDirection: "row", alignItems: "center", marginBottom: 16, backgroundColor: colors.cardBg, borderColor: colors.border },
    kpiCardFlexLeftColumn: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
    iconBoxContainer: { width: 40, height: 40, borderRadius: 10, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(59,130,246,0.08)" },
    kpiLabelText: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.3, color: colors.textSecondary },
    kpiMetricsValueOutputText: { fontSize: 22, fontWeight: "800", marginTop: 2, letterSpacing: -0.5, color: colors.text },
    verticalSplitLineDivider: { width: 1, height: 36, marginHorizontal: 16, backgroundColor: colors.border },
    kpiMetricsRightMetaBlock: { alignItems: "flex-end", justifyContent: "center" },
    metaCountBigDigitsText: { fontSize: 18, fontWeight: "800", color: colors.text },
    metaCountSecondaryDescriptorText: { fontSize: 11, marginTop: 1, color: colors.textSecondary },
    searchInterfaceWrapperBar: { height: 42, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", marginBottom: 14, backgroundColor: colors.cardBg, borderColor: colors.border },
    searchInputField: { flex: 1, color: colors.inputText, fontSize: 13, height: "100%", paddingVertical: 0 },
    inlineLoaderZoneWrapper: { marginVertical: 8, alignItems: "center" },
    ledgerRowCardContainer: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10, backgroundColor: colors.cardBg, borderColor: colors.border },
    ledgerRowTopLineFlexRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
    ledgerRowPrimaryBillNumText: { fontSize: 15, fontWeight: "700", color: colors.text },
    ledgerRowSecondaryVendorText: { fontSize: 12, marginTop: 2, color: colors.textSecondary },
    ledgerRowFinancialsValueBlock: { alignItems: "flex-end" },
    ledgerRowAmountText: { fontSize: 15, fontWeight: "800", letterSpacing: -0.25, color: colors.text },
    statusCapsuleWrapperBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, marginTop: 6 },
    statusCapsuleLabelText: { fontSize: 8, fontWeight: "800", letterSpacing: 0.5 },
    itemCardDividerHorizontalBar: { height: 1, marginVertical: 12, backgroundColor: colors.border },
    ledgerRowBottomMetadataMetaRow: { flexDirection: "row", justifyContent: "space-between" },
    metaLabelPairInlineFlexBlock: { flex: 1 },
    metaKeyLabelSmallCapsTitleText: { fontSize: 9, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.3, color: colors.textMuted },
    metaValueOutputBodyText: { fontSize: 12, marginTop: 2, fontWeight: "500" },
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
    tenantBadgeContainer: { flexDirection: "row", alignItems: "center", gap: 2, marginTop: 2 },
    tenantBadgeText: { fontSize: 10, color: colors.textMuted },
  });
}

export default function AccountsReceivable() {
  const { uiTheme } = useTheme();
  const isDark = (uiTheme.theme as string) === "dark" || (uiTheme.theme as string) === "metallic-elite";
  const colors = useMemo(() => buildColors(uiTheme, isDark), [uiTheme, isDark]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [tenantPickerOpen, setTenantPickerOpen] = useState(false);

  const [form, setForm] = useState({
    customerName: "",
    tenant: "",
    invoiceNumber: "",
    date: new Date().toISOString().split("T")[0],
    dueDate: "",
    amount: "",
    status: "Sent",
  });

  const load = useCallback(async () => {
    try {
      const [invRes, tenantsRes] = await Promise.all([
        apiFetch<ApiResponse<InvoiceItem>>("/api/atlasbook/invoices"),
        apiFetch<ApiResponse<TenantItem>>("/api/atlasbook/tenants"),
      ]);
      if (invRes?.success) setItems(invRes.items || []);
      if (tenantsRes?.success) setTenants(tenantsRes.items || []);
    } catch {
      Alert.alert("Sync Error", "Failed to retrieve processing parameters from server clusters.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    if (!form.customerName.trim() || !form.invoiceNumber.trim() || !form.amount.trim()) {
      Alert.alert("Missing Parameters", "Required parameters must be satisfied before issuance.");
      return;
    }
    try {
      const res = await apiFetch<{ success: boolean }>("/api/atlasbook/invoices", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          amount: parseFloat(form.amount) || 0,
        }),
      });
      if (res?.success) {
        setOpen(false);
        setForm({
          customerName: "",
          tenant: "",
          invoiceNumber: "",
          date: new Date().toISOString().split("T")[0],
          dueDate: "",
          amount: "",
          status: "Sent",
        });
        load();
      }
    } catch {
      Alert.alert("Execution Refused", "Could not commit transaction logs onto core pipeline.");
    }
  };

  const filtered = useMemo(() => {
    return items.filter((i) =>
      i.invoiceNumber?.toLowerCase().includes(q.toLowerCase()) ||
      i.customerName?.toLowerCase().includes(q.toLowerCase())
    );
  }, [items, q]);

  const totalOutstanding = useMemo(() => {
    return items
      .filter((i) => i.status !== "Paid")
      .reduce((sum, i) => sum + i.amount, 0);
  }, [items]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <SafeAreaView style={styles.mainContainer}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item._id || Math.random().toString()}
        contentContainerStyle={styles.scrollContainerPadding}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View style={{ marginBottom: 16 }}>
            <View style={styles.headerLayoutRow}>
              <View style={{ flex: 1 }}>
                <View style={styles.inlineHeaderTitleGroup}>
                  <Wallet size={24} color={colors.primary} />
                  <Text style={styles.mainTitleText}>Accounts Receivable</Text>
                </View>
                <Text style={styles.subtitleText}>Manage customer invoices and payment collections</Text>
              </View>
              
              <View style={styles.topActionsGroup}>
                <TouchableOpacity activeOpacity={0.7} style={styles.circularActionBtn} onPress={() => { setLoading(true); load(); }}>
                  <RefreshCw size={14} color={colors.text} />
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.8} style={styles.primaryActionPill} onPress={() => setOpen(true)}>
                  <Plus size={14} color={colors.primaryText} strokeWidth={2.5} />
                  <Text style={styles.primaryActionPillText}>Invoice</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.kpiSummaryCard}>
              <View style={styles.kpiCardFlexLeftColumn}>
                <View style={styles.iconBoxContainer}>
                  <Send size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.kpiLabelText}>Outstanding Receivables</Text>
                  <Text style={styles.kpiMetricsValueOutputText}>
                    ${totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </View>
              </View>
              <View style={styles.verticalSplitLineDivider} />
              <View style={styles.kpiMetricsRightMetaBlock}>
                <Text style={styles.metaCountBigDigitsText}>{items.filter((i) => i.status !== "Paid").length}</Text>
                <Text style={styles.metaCountSecondaryDescriptorText}>Pending</Text>
              </View>
            </View>

            <View style={styles.searchInterfaceWrapperBar}>
              <Search size={16} color={colors.textSecondary} style={{ marginRight: 10 }} />
              <TextInput
                style={styles.searchInputField}
                placeholder="Search invoices or customer files..."
                placeholderTextColor={colors.placeholderText}
                value={q}
                onChangeText={setQ}
              />
              {q ? (
                <TouchableOpacity onPress={() => setQ("")}>
                  <X size={14} color={colors.textSecondary} />
                </TouchableOpacity>
              ) : null}
            </View>

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
              <Wallet size={32} color={colors.border} style={{ marginBottom: 10 }} />
              <Text style={styles.emptyLedgerHeadingText}>No matching logs</Text>
              <Text style={styles.emptyLedgerSubParagraphText}>Everything resolves nicely against structural criteria mappings.</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={styles.ledgerRowCardContainer}>
            <View style={styles.ledgerRowTopLineFlexRow}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.ledgerRowPrimaryBillNumText}>{item.invoiceNumber}</Text>
                <Text style={styles.ledgerRowSecondaryVendorText} numberOfLines={1}>
                  {item.customerName}
                </Text>
                {item.tenant ? (
                  <View style={styles.tenantBadgeContainer}>
                    <User size={10} color={colors.textMuted} />
                    <Text style={styles.tenantBadgeText}>Tenant Linked</Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.ledgerRowFinancialsValueBlock}>
                <Text style={styles.ledgerRowAmountText}>
                  ${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </Text>
                <View style={[styles.statusCapsuleWrapperBadge, { 
                  backgroundColor: item.status === "Paid" ? "rgba(52,211,153,0.1)" : colors.background, 
                  borderColor: item.status === "Paid" ? "rgba(52,211,153,0.2)" : colors.border 
                }]}>
                  <Text style={[styles.statusCapsuleLabelText, { color: item.status === "Paid" ? colors.successText : colors.textSecondary }]}>
                    {item.status.toUpperCase()}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.itemCardDividerHorizontalBar} />

            <View style={styles.ledgerRowBottomMetadataMetaRow}>
              <View style={styles.metaLabelPairInlineFlexBlock}>
                <Text style={styles.metaKeyLabelSmallCapsTitleText}>Issued</Text>
                <Text style={[styles.metaValueOutputBodyText, { color: colors.textSecondary }]}>{formatDate(item.date)}</Text>
              </View>
              
              <View style={[styles.metaLabelPairInlineFlexBlock, { alignItems: "flex-end" }]}>
                <Text style={styles.metaKeyLabelSmallCapsTitleText}>Due Date</Text>
                <Text style={[styles.metaValueOutputBodyText, { color: colors.textSecondary }]}>
                  {formatDate(item.dueDate)}
                </Text>
              </View>
            </View>
          </View>
        )}
      />

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.modalOverlayDarkenedContainer}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.formContainerCardWindowLayout}>
            <View style={styles.formModalStickyTopHeaderRow}>
              <Text style={styles.formModalHeaderTitleText}>Create Invoice</Text>
              <TouchableOpacity activeOpacity={0.7} style={styles.modalCloseActionBtnCircle} onPress={() => setOpen(false)}>
                <X size={16} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.formScrollableBodyPaddingLayout} keyboardShouldPersistTaps="handled">
              <View style={styles.formGroupInputFieldWrapperBlock}>
                <Text style={styles.inputFieldTopLabelText}>Customer Name</Text>
                <TextInput
                  style={styles.standardNativeFormInputBox}
                  placeholder="John Doe or Company Name"
                  placeholderTextColor={colors.placeholderText}
                  value={form.customerName}
                  onChangeText={(text) => setForm({ ...form, customerName: text })}
                />
              </View>

              <View style={styles.formGroupInputFieldWrapperBlock}>
                <Text style={styles.inputFieldTopLabelText}>Link to Tenant (Optional)</Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.customDropdownSelectionInputTrigger}
                  onPress={() => setTenantPickerOpen(true)}
                >
                  <Text style={{ color: form.tenant ? colors.text : colors.placeholderText, fontSize: 13, fontWeight: "500" }}>
                    {tenants.find((t) => t._id === form.tenant)?.name || "None"}
                  </Text>
                  <ChevronDown size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.formInputsHorizontalMatrixRow}>
                <View style={styles.formMatrixInputColumnHalf}>
                  <Text style={styles.inputFieldTopLabelText}>Invoice Number</Text>
                  <TextInput
                    style={styles.standardNativeFormInputBox}
                    placeholder="INV-2024-001"
                    placeholderTextColor={colors.placeholderText}
                    value={form.invoiceNumber}
                    onChangeText={(text) => setForm({ ...form, invoiceNumber: text })}
                  />
                </View>
                <View style={styles.formMatrixInputColumnHalf}>
                  <Text style={styles.inputFieldTopLabelText}>Total Amount</Text>
                  <TextInput
                    style={styles.standardNativeFormInputBox}
                    placeholder="0.00"
                    placeholderTextColor={colors.placeholderText}
                    keyboardType="numeric"
                    value={form.amount}
                    onChangeText={(text) => setForm({ ...form, amount: text })}
                  />
                </View>
              </View>

              <View style={styles.formInputsHorizontalMatrixRow}>
                <View style={styles.formMatrixInputColumnHalf}>
                  <Text style={styles.inputFieldTopLabelText}>Date</Text>
                  <TextInput
                    style={styles.standardNativeFormInputBox}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.placeholderText}
                    value={form.date}
                    onChangeText={(text) => setForm({ ...form, date: text })}
                  />
                </View>
                <View style={styles.formMatrixInputColumnHalf}>
                  <Text style={styles.inputFieldTopLabelText}>Due Date</Text>
                  <TextInput
                    style={styles.standardNativeFormInputBox}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.placeholderText}
                    value={form.dueDate}
                    onChangeText={(text) => setForm({ ...form, dueDate: text })}
                  />
                </View>
              </View>

              <TouchableOpacity activeOpacity={0.8} style={styles.formSubmissionActionBtnBar} onPress={handleCreate}>
                <Text style={styles.formSubmissionActionBtnLabelText}>Issue Invoice</Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal visible={tenantPickerOpen} transparent animationType="slide" onRequestClose={() => setTenantPickerOpen(false)}>
        <View style={styles.modalOverlayDarkenedContainer}>
          <TouchableOpacity activeOpacity={1} style={{ flex: 1 }} onPress={() => setTenantPickerOpen(false)} />
          <View style={styles.bottomSheetModalWindowLayout}>
            <View style={styles.bottomSheetHeaderBlockBarRow}>
              <Text style={styles.bottomSheetHeaderLabelTitleText}>Select Target Profile</Text>
              <TouchableOpacity onPress={() => setTenantPickerOpen(false)}>
                <X size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ paddingBottom: 32 }} style={{ maxHeight: 300 }}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={[styles.bottomSheetSelectionRowItemBtn, form.tenant === "" && { backgroundColor: colors.borderLight }]}
                onPress={() => {
                  setForm({ ...form, tenant: "" });
                  setTenantPickerOpen(false);
                }}
              >
                <Text style={[styles.bottomSheetSelectionRowLabelText, { color: form.tenant === "" ? colors.primary : colors.textSecondary }]}>
                  None
                </Text>
                {form.tenant === "" && <Check size={16} color={colors.primary} />}
              </TouchableOpacity>
              {tenants.map((t) => {
                const isSelected = form.tenant === t._id;
                return (
                  <TouchableOpacity
                    key={t._id}
                    activeOpacity={0.7}
                    style={[styles.bottomSheetSelectionRowItemBtn, isSelected && { backgroundColor: colors.borderLight }]}
                    onPress={() => {
                      setForm({ ...form, tenant: t._id });
                      setTenantPickerOpen(false);
                    }}
                  >
                    <Text style={[styles.bottomSheetSelectionRowLabelText, { color: isSelected ? colors.primary : colors.textSecondary }]}>
                      {t.name}
                    </Text>
                    {isSelected && <Check size={16} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}