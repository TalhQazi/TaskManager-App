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
  ListTree,
  Plus,
  RefreshCw,
  Search,
  X,
  ChevronDown,
  Check,
} from "lucide-react-native";
import { apiFetch } from "@/lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";

const { width } = Dimensions.get("window");

interface AccountItem {
  _id: string;
  code: string;
  name: string;
  type: string;
  description?: string;
  balance?: number;
}

interface ApiResponse {
  success: boolean;
  items?: AccountItem[];
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
    overlayBg:        "rgba(0,0,0,0.85)",
    
    asset:            isDark ? "#34D399" : "#10B981",
    liability:        isDark ? "#F87171" : "#EF4444",
    equity:           isDark ? "#818CF8" : "#4F46E5",
    revenue:          isDark ? "#60A5FA" : "#2563EB",
    expense:          isDark ? "#FB923C" : "#EA580C",
  };
}

function createStyles(colors: ReturnType<typeof buildColors>) {
  return StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: colors.background },
    scrollContainerPadding: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 40 },
    headerLayoutRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
    inlineHeaderTitleGroup: { flexDirection: "row", alignItems: "center", gap: 6 },
    mainTitleText: { fontSize: 22, fontWeight: "900", letterSpacing: -0.5, color: colors.text },
    subtitleText: { fontSize: 13, marginTop: 4, fontWeight: "400", color: colors.textSecondary },
    topActionsGroup: { flexDirection: "row", alignItems: "center", gap: 8 },
    circularActionBtn: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.cardBg, borderColor: colors.border },
    primaryActionPill: { height: 34, paddingHorizontal: 12, borderRadius: 10, flexDirection: "row", alignItems: "center", backgroundColor: colors.primary, gap: 4 },
    primaryActionPillText: { fontSize: 13, fontWeight: "700", color: colors.primaryText },
    
    kpiHorizontalScroll: { marginBottom: 16 },
    kpiMiniCard: { width: 95, borderRadius: 8, borderWidth: 1, paddingVertical: 8, paddingHorizontal: 10, alignItems: "center", justifyContent: "center", marginRight: 8, backgroundColor: colors.cardBg, borderColor: colors.border },
    kpiMiniLabel: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 2, color: colors.textSecondary },
    kpiMiniValue: { fontSize: 15, fontWeight: "900", color: colors.text },
    
    searchInterfaceWrapperBar: { height: 42, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", marginBottom: 16, backgroundColor: colors.cardBg, borderColor: colors.border },
    searchInputField: { flex: 1, color: colors.inputText, fontSize: 13, height: "100%", paddingVertical: 0 },
    inlineLoaderZoneWrapper: { marginVertical: 8, alignItems: "center" },
    
    tableContainer: { borderWidth: 1, borderRadius: 12, overflow: "hidden", backgroundColor: colors.cardBg, borderColor: colors.border },
    tableHeaderRow: { flexDirection: "row", borderBottomWidth: 1, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: colors.borderLight, borderColor: colors.border },
    tableHeaderCell: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, color: colors.textSecondary },
    tableDataRow: { flexDirection: "row", borderBottomWidth: 1, paddingVertical: 12, paddingHorizontal: 12, alignItems: "center", borderColor: colors.borderLight },
    tableDataCell: { fontSize: 13, color: colors.text },
    codeCellText: { fontSize: 13, fontWeight: "700", color: colors.primary, fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace" },
    balanceCellText: { fontSize: 13, fontWeight: "700", textAlign: "right", color: colors.text, fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace" },
    
    statusCapsuleWrapperBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, alignSelf: "flex-start" },
    statusCapsuleLabelText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.3 },
    
    emptyLedgerFallbackCard: { alignItems: "center", justifyContent: "center", paddingVertical: 48, paddingHorizontal: 16 },
    emptyLedgerHeadingText: { fontSize: 14, fontWeight: "700", marginBottom: 4, color: colors.text },
    emptyLedgerSubParagraphText: { fontSize: 12, textAlign: "center", color: colors.textSecondary },
    
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
    formMatrixInputColumnThird: { flex: 1 },
    formMatrixInputColumnTwoThirds: { flex: 2 },
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

const colWidths = {
  code: 65,
  name: 140,
  type: 85,
  balance: 90,
};

export default function ChartOfAccounts() {
  const { uiTheme } = useTheme();
  const isDark = (uiTheme.theme as string) === "dark" || (uiTheme.theme as string) === "metallic-elite";
  const colors = useMemo(() => buildColors(uiTheme, isDark), [uiTheme, isDark]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [items, setItems] = useState<AccountItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    code: "",
    name: "",
    type: "Asset",
    description: "",
  });

  const load = useCallback(async () => {
    try {
      const res = await apiFetch<ApiResponse>("/api/atlasbook/accounts");
      if (res?.success) setItems(res.items || []);
    } catch {
      Alert.alert("Sync Error", "Failed to retrieve records from the server.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      Alert.alert("Missing Parameters", "Account code and name metrics must be defined.");
      return;
    }
    try {
      setIsSubmitting(true);
      const res = await apiFetch<{ success: boolean }>("/api/atlasbook/accounts", {
        method: "POST",
        body: JSON.stringify(form),
      });
      if (res?.success) {
        setOpen(false);
        setForm({ code: "", name: "", type: "Asset", description: "" });
        load();
      }
    } catch {
      Alert.alert("Execution Refused", "Could not commit transaction log parameters safely.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = useMemo(() => {
    return items
      .filter((i) =>
        i.name?.toLowerCase().includes(q.toLowerCase()) ||
        i.code?.toLowerCase().includes(q.toLowerCase()) ||
        i.type?.toLowerCase().includes(q.toLowerCase())
      )
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [items, q]);

  const accountTypes = ["Asset", "Liability", "Equity", "Revenue", "Expense"];

  const getTypeStyle = (type: string) => {
    switch (type) {
      case "Asset": return { color: colors.asset, label: "Asset" };
      case "Liability": return { color: colors.liability, label: "Liability" };
      case "Equity": return { color: colors.equity, label: "Equity" };
      case "Revenue": return { color: colors.revenue, label: "Revenue" };
      default: return { color: colors.expense, label: "Expense" };
    }
  };

  return (
    <SafeAreaView style={styles.mainContainer}>
      <ScrollView 
        contentContainerStyle={styles.scrollContainerPadding}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
      >
        <View style={styles.headerLayoutRow}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <View style={styles.inlineHeaderTitleGroup}>
              <ListTree size={22} color={colors.primary} />
              <Text style={styles.mainTitleText}>Chart of Accounts</Text>
            </View>
            <Text style={styles.subtitleText}>Define organization account frameworks for tracking</Text>
          </View>
          
          <View style={styles.topActionsGroup}>
            <TouchableOpacity activeOpacity={0.7} style={styles.circularActionBtn} onPress={() => { setLoading(true); load(); }}>
              <RefreshCw size={14} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.8} style={styles.primaryActionPill} onPress={() => setOpen(true)}>
              <Plus size={14} color={colors.primaryText} strokeWidth={2.5} />
              <Text style={styles.primaryActionPillText}>Account</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.kpiHorizontalScroll}>
          {accountTypes.map((type) => {
            const count = items.filter((i) => i.type === type).length;
            return (
              <View key={type} style={styles.kpiMiniCard}>
                <Text style={styles.kpiMiniLabel} numberOfLines={1}>{type}s</Text>
                <Text style={styles.kpiMiniValue}>{count}</Text>
              </View>
            );
          })}
        </ScrollView>

        <View style={styles.searchInterfaceWrapperBar}>
          <Search size={16} color={colors.textSecondary} style={{ marginRight: 10 }} />
          <TextInput
            style={styles.searchInputField}
            placeholder="Search accounts by code, name or type..."
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

        <ScrollView horizontal showsHorizontalScrollIndicator={true}>
          <View style={styles.tableContainer}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableHeaderCell, { width: colWidths.code }]}>Code</Text>
              <Text style={[styles.tableHeaderCell, { width: colWidths.name }]}>Account Name</Text>
              <Text style={[styles.tableHeaderCell, { width: colWidths.type }]}>Type</Text>
              <Text style={[styles.tableHeaderCell, { width: colWidths.balance, textAlign: "right" }]}>Balance</Text>
            </View>

            {filtered.length === 0 && !loading ? (
              <View style={[styles.emptyLedgerFallbackCard, { width: colWidths.code + colWidths.name + colWidths.type + colWidths.balance }]}>
                <ListTree size={28} color={colors.border} style={{ marginBottom: 6 }} />
                <Text style={styles.emptyLedgerHeadingText}>No accounts found</Text>
                <Text style={styles.emptyLedgerSubParagraphText}>Everything clears uniformly against active parameters.</Text>
              </View>
            ) : (
              filtered.map((item) => {
                const typeStyle = getTypeStyle(item.type);
                return (
                  <View key={item._id || Math.random().toString()} style={styles.tableDataRow}>
                    <Text style={[styles.codeCellText, { width: colWidths.code }]}>{item.code}</Text>
                    <Text style={[styles.tableDataCell, { width: colWidths.name, fontWeight: "500" }]} numberOfLines={1}>{item.name}</Text>
                    <View style={{ width: colWidths.type }}>
                      <View style={[styles.statusCapsuleWrapperBadge, { borderColor: typeStyle.color }]}>
                        <Text style={[styles.statusCapsuleLabelText, { color: typeStyle.color }]}>{typeStyle.label}</Text>
                      </View>
                    </View>
                    <Text style={[styles.balanceCellText, { width: colWidths.balance }]}>
                      ${(item.balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Text>
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      </ScrollView>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.modalOverlayDarkenedContainer}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.formContainerCardWindowLayout}>
            <View style={styles.formModalStickyTopHeaderRow}>
              <Text style={styles.formModalHeaderTitleText}>Define Account</Text>
              <TouchableOpacity activeOpacity={0.7} style={styles.modalCloseActionBtnCircle} onPress={() => setOpen(false)}>
                <X size={16} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.formScrollableBodyPaddingLayout} keyboardShouldPersistTaps="handled">
              <View style={styles.formInputsHorizontalMatrixRow}>
                <View style={styles.formMatrixInputColumnThird}>
                  <Text style={styles.inputFieldTopLabelText}>Account Code</Text>
                  <TextInput
                    style={styles.standardNativeFormInputBox}
                    placeholder="1001"
                    placeholderTextColor={colors.placeholderText}
                    keyboardType="numeric"
                    value={form.code}
                    onChangeText={(text) => setForm({ ...form, code: text })}
                  />
                </View>
                <View style={styles.formMatrixInputColumnTwoThirds}>
                  <Text style={styles.inputFieldTopLabelText}>Account Name</Text>
                  <TextInput
                    style={styles.standardNativeFormInputBox}
                    placeholder="e.g., Main Checking"
                    placeholderTextColor={colors.placeholderText}
                    value={form.name}
                    onChangeText={(text) => setForm({ ...form, name: text })}
                  />
                </View>
              </View>

              <View style={styles.formGroupInputFieldWrapperBlock}>
                <Text style={styles.inputFieldTopLabelText}>Structure Type Framework</Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.customDropdownSelectionInputTrigger}
                  onPress={() => setTypePickerOpen(true)}
                >
                  <Text style={{ color: colors.text, fontSize: 13, fontWeight: "500" }}>{form.type}</Text>
                  <ChevronDown size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.formGroupInputFieldWrapperBlock}>
                <Text style={styles.inputFieldTopLabelText}>Supplemental Description Notes</Text>
                <TextInput
                  style={[styles.standardNativeFormInputBox, { height: 80, paddingTop: 10, textAlignVertical: "top" }]}
                  placeholder="Optional notes about this account allocation scope parameters..."
                  placeholderTextColor={colors.placeholderText}
                  multiline
                  value={form.description}
                  onChangeText={(text) => setForm({ ...form, description: text })}
                />
              </View>

              <TouchableOpacity activeOpacity={0.8} style={styles.formSubmissionActionBtnBar} disabled={isSubmitting} onPress={handleCreate}>
                {isSubmitting ? <ActivityIndicator size="small" color={colors.primaryText} /> : <Text style={styles.formSubmissionActionBtnLabelText}>Save Account Entry</Text>}
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal visible={typePickerOpen} transparent animationType="slide" onRequestClose={() => setTypePickerOpen(false)}>
        <View style={styles.modalOverlayDarkenedContainer}>
          <TouchableOpacity activeOpacity={1} style={{ flex: 1 }} onPress={() => setTypePickerOpen(false)} />
          <View style={styles.bottomSheetModalWindowLayout}>
            <View style={styles.bottomSheetHeaderBlockBarRow}>
              <Text style={styles.bottomSheetHeaderLabelTitleText}>Link Architecture Classification</Text>
              <TouchableOpacity onPress={() => setTypePickerOpen(false)}>
                <X size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            {accountTypes.map((t) => {
              const isSelected = form.type === t;
              return (
                <TouchableOpacity
                  key={t}
                  activeOpacity={0.7}
                  style={[styles.bottomSheetSelectionRowItemBtn, isSelected && { backgroundColor: colors.borderLight }]}
                  onPress={() => {
                    setForm({ ...form, type: t });
                    setTypePickerOpen(false);
                  }}
                >
                  <Text style={[styles.bottomSheetSelectionRowLabelText, { color: isSelected ? colors.primary : colors.textSecondary }]}>
                    {t}
                  </Text>
                  {isSelected && <Check size={16} color={colors.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}