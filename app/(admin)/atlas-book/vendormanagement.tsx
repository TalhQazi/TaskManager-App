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
  Alert,
  Platform,
  DimensionValue,
} from "react-native";

import { useTheme } from "@/contexts/ThemeContext";
import { apiFetch } from "../../../lib/admin/apiClient";
import { useAtlasBooks } from "./context/AtlasBooksContext";
import {
  Landmark,
  Briefcase,
  FileText,
  CheckCircle2,
  ShieldAlert,
  Plus,
  X,
  ChevronDown,
  UserPlus,
} from "lucide-react-native";

const { height } = Dimensions.get("window");

interface VendorLedger {
  id: string;
  name: string;
  invoiceNo: string;
  amount: number;
  dueDate: string;
  bankVerified: boolean;
  status: "Paid" | "Outstanding" | "Disputed";
}

interface ApiResponse<T> {
  success: boolean;
  items?: T[];
  item?: T;
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
    inputBg:          isDark ? "#09090b" : "#FFFFFF",
    inputText:        isDark ? "#F4F4F5" : "#0F172A",
    placeholderText:  isDark ? "#52525B" : "#94A3B8",
    primary:          uiTheme.customColors?.primary || "#f59e0b",
    primaryText:      "#09090b",
    successText:      isDark ? "#34D399" : "#10b981",
    dangerText:       isDark ? "#F87171" : "#ef4444",
    badgePaidBg:      isDark ? "rgba(16, 185, 129, 0.15)" : "#E6F4EA",
    badgeOutstandingBg: isDark ? "rgba(245, 158, 11, 0.15)" : "#FEF3C7",
    badgeDisputedBg:  isDark ? "rgba(239, 68, 68, 0.15)" : "#FCE8E6",
    overlayBg:        "rgba(0, 0, 0, 0.6)",
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
      paddingBottom: 14,
      backgroundColor: colors.background,
    },
    headerTopRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 6,
    },
    titleContainer: {
      flex: 1,
      marginRight: 8,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: "800",
      color: colors.text,
      letterSpacing: 0.5,
      fontFamily: Platform.OS === "ios" ? "CourierNewPS-BoldMT" : "monospace",
    },
    headerSubtitle: {
      fontSize: 12,
      color: colors.textMuted,
      lineHeight: 16,
      marginTop: 2,
      fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    },
    activeEntityHighlight: {
      color: colors.primary,
      fontWeight: "700",
    },
    headerActionsPanel: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    filterTabsWrapper: {
      flexDirection: "row",
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 2,
    },
    filterTabButton: {
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 6,
    },
    filterTabActiveButton: {
      backgroundColor: colors.primary,
    },
    filterTabButtonText: {
      fontSize: 11,
      color: colors.textSecondary,
      fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    },
    filterTabActiveButtonText: {
      color: colors.primaryText,
      fontWeight: "700",
    },
    recordBillTriggerButton: {
      flexDirection: "row",
      backgroundColor: colors.primary,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      alignItems: "center",
      gap: 6,
    },
    recordBillTriggerButtonText: {
      color: colors.primaryText,
      fontSize: 12,
      fontWeight: "700",
    },
    kpiCardsContainerStack: {
      gap: 12,
      marginBottom: 20,
      paddingHorizontal: 16,
    },
    kpiItemCard: {
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    kpiIconBoxSurface: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: colors.borderLight,
      justifyContent: "center",
      alignItems: "center",
    },
    kpiDataMetaColumn: {
      flex: 1,
    },
    kpiCardLabelTitle: {
      fontSize: 11,
      color: colors.textSecondary,
      fontWeight: "600",
    },
    kpiCardMainHeadingValue: {
      fontSize: 22,
      fontWeight: "800",
      color: colors.text,
      marginTop: 2,
    },
    kpiCardSubtitleDesc: {
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 1,
    },
    ledgerTableSurfaceCard: {
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      marginHorizontal: 16,
      padding: 16,
    },
    ledgerTableSectionHeaderLabel: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 1,
      fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
      marginBottom: 14,
    },
    tableHorizontalScrollFrame: {
      width: "100%",
    },
    tableMatrixMinWidthContainer: {
      minWidth: 820,
    },
    simulatedTableHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingBottom: 10,
      marginBottom: 4,
    },
    tableHeaderCellLabel: {
      fontSize: 10,
      fontWeight: "700",
      color: colors.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    tableDataBodyRowFrame: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    colVendorName: { width: 180, paddingRight: 8 },
    colInvoiceRef: { width: 130, paddingRight: 8 },
    colDueDate: { width: 110, paddingRight: 8 },
    colVerification: { width: 160, paddingRight: 8 },
    colAmount: { width: 130, alignItems: "flex-end", paddingRight: 12 },
    colStatus: { width: 110, alignItems: "flex-end" },
    vendorNameMainText: { fontSize: 13, fontWeight: "700", color: colors.text },
    invoiceRefText: { fontSize: 13, color: colors.textMuted },
    dueDateText: { fontSize: 13, color: colors.textSecondary },
    verificationInlineBadgeFlex: { flexDirection: "row", alignItems: "center", gap: 4 },
    verificationApprovedText: { fontSize: 11, fontWeight: "700", color: colors.successText },
    verificationUnverifiedText: { fontSize: 11, fontWeight: "700", color: colors.dangerText },
    amountNumericalText: { fontSize: 13, fontWeight: "700", color: colors.text },
    statusBadgePillFrame: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 100 },
    statusBadgePillInnerText: { fontSize: 10, fontWeight: "700" },
    textAlignRight: { textAlign: "right" },
    centerStatePadding: { width: "100%", paddingVertical: 40, justifyContent: "center", alignItems: "center" },
    emptyStateFallbackText: { fontSize: 13, color: colors.textMuted, textAlign: "center", lineHeight: 18 },
    modalBlurOverlay: { flex: 1, backgroundColor: colors.overlayBg, justifyContent: "flex-end" },
    modalContentCard: { backgroundColor: colors.cardBg, borderTopLeftRadius: 20, borderTopRightRadius: 20, width: "100%", maxHeight: height * 0.9, padding: 20 },
    modalCardHeaderTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderBottomColor: colors.borderLight, paddingBottom: 12, marginBottom: 16 },
    modalCardTitleHeadingContainer: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1, paddingRight: 8 },
    modalCardTitleHeading: { fontSize: 14, fontWeight: "700", color: colors.text, textTransform: "uppercase", letterSpacing: 0.5 },
    closeModalCrossButton: { padding: 4 },
    modalFormScrollContainer: { flexGrow: 0, marginBottom: 12 },
    subFormInlineVendorContainer: { backgroundColor: colors.borderLight, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, marginBottom: 16, gap: 12 },
    subFormHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 8 },
    subFormTitleHeadingText: { fontSize: 11, fontWeight: "700", color: colors.primary, textTransform: "uppercase" },
    subFormCancelButton: { paddingVertical: 2, paddingHorizontal: 4 },
    subFormCancelButtonText: { fontSize: 11, color: colors.textMuted, fontWeight: "600" },
    subFormSplitGridRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    subFormFieldColumnFull: { width: "100%" },
    subFormFieldColumnHalf: { width: "48%" },
    activeVendorSelectionGroupFrame: { backgroundColor: colors.borderLight, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, marginBottom: 16 },
    vendorSelectorUpperLineRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
    vendorSelectorFieldLabelText: { fontSize: 10, fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase" },
    registerNewVendorTriggerLink: { flexDirection: "row", alignItems: "center", gap: 4 },
    registerNewVendorTriggerLinkText: { fontSize: 11, fontWeight: "700", color: colors.primary },
    vendorSelectDropdownAnchorButton: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: colors.border, borderRadius: 6, height: 38, paddingHorizontal: 10, backgroundColor: colors.cardBg },
    vendorSelectDropdownAnchorButtonText: { fontSize: 13, color: colors.text },
    noVendorsWarningParagraph: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
    formElementFieldLabel: { fontSize: 10, fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", marginBottom: 6 },
    formInputFieldText: { borderWidth: 1, borderColor: colors.border, borderRadius: 6, height: 38, paddingHorizontal: 10, fontSize: 13, color: colors.text, backgroundColor: colors.background },
    formInputTextAreaField: { borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, color: colors.text, backgroundColor: colors.background, height: 54, textAlignVertical: "top" },
    formSplitColumnsContainer: { flexDirection: "row", justifyContent: "space-between", gap: 12, marginBottom: 12 },
    formSplitFieldColumn: { flex: 1 },
    formSplitFieldColumnSpan2: { width: "100%", marginBottom: 12 },
    customSelectInputAnchor: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: colors.border, borderRadius: 6, height: 38, paddingHorizontal: 10, backgroundColor: colors.background },
    customSelectAnchorText: { fontSize: 13, color: colors.text },
    subFormActionSubmitButton: { backgroundColor: colors.primary, paddingVertical: 10, borderRadius: 8, alignItems: "center", justifyContent: "center", marginTop: 4 },
    subFormActionSubmitButtonText: { color: colors.primaryText, fontSize: 12, fontWeight: "700" },
    modalCardActionsFooterRow: { flexDirection: "row", justifyContent: "flex-end", gap: 10, borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: 14, marginTop: 4 },
    modalCancelButtonAction: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardBg },
    modalCancelButtonText: { fontSize: 12, fontWeight: "700", color: colors.textSecondary },
    modalSubmitButtonAction: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: colors.primary },
    modalSubmitButtonText: { fontSize: 12, fontWeight: "700", color: colors.primaryText },
    inlineDropdownOverlayContainer: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.overlayBg, justifyContent: "center", alignItems: "center", padding: 16, zIndex: 9999 },
    inlineDropdownCardWindow: { backgroundColor: colors.cardBg, width: "100%", maxWidth: 330, maxHeight: "60%", borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 16 },
    inlineDropdownHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 10, marginBottom: 6 },
    inlineDropdownHeaderTitleText: { fontSize: 13, fontWeight: "700", color: colors.text, textTransform: "uppercase" },
    pickerRowSelectionButtonAnchor: { paddingVertical: 12, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
    pickerRowCategoryValueText: { fontSize: 13, color: colors.textSecondary, fontWeight: "500" },
    activeSelectionText: { color: colors.primary, fontWeight: "700" },
  });
}

export default function Vendors() {
  const { activeEntity } = useAtlasBooks();
  const { uiTheme } = useTheme();
  const isDark = (uiTheme.theme as string) === "dark" || (uiTheme.theme as string) === "metallic-elite";
  const colors = useMemo(() => buildColors(uiTheme, isDark), [uiTheme, isDark]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [filterVerified, setFilterVerified] = useState("all");
  const [bills, setBills] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [billNumber, setBillNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"Unpaid" | "Paid" | "Partially Paid" | "Overdue">("Unpaid");

  const [showNewVendorForm, setShowNewVendorForm] = useState(false);
  const [newVendorName, setNewVendorName] = useState("");
  const [newVendorPhone, setNewVendorPhone] = useState("");
  const [newVendorEmail, setNewVendorEmail] = useState("");
  const [newVendorServiceType, setNewVendorServiceType] = useState("Maintenance");
  const [newVendorStatus, setNewVendorStatus] = useState<"approved" | "not-approved">("approved");
  const [newVendorNotes, setNewVendorNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [activePickerField, setActivePickerField] = useState<"vendor" | "status" | "routing" | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [resBills, resVendors] = await Promise.all([
        apiFetch<ApiResponse<any>>("/api/atlasbook/bills"),
        apiFetch<any>("/api/vendors"),
      ]);

      setBills(resBills?.items || []);
      const vendorList = Array.isArray(resVendors) ? resVendors : (resVendors?.items || []);
      setVendors(vendorList);
      if (vendorList.length > 0) {
        setSelectedVendorId(vendorList[0]._id);
      }
    } catch (error: any) {
      Alert.alert("Error", "Failed to load accounts ledger: " + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateVendor = async () => {
    if (!newVendorName || !newVendorPhone) {
      Alert.alert("Validation Error", "Vendor name and phone number are required.");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        name: newVendorName,
        phone: newVendorPhone,
        email: newVendorEmail,
        serviceType: newVendorServiceType,
        status: newVendorStatus,
        notes: newVendorNotes,
      };

      const res = await apiFetch<any>("/api/vendors", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const newVendor = res?.item || res;
      Alert.alert("Success", `Vendor "${newVendorName}" registered successfully.`);

      const freshVendorsRes = await apiFetch<any>("/api/vendors");
      const freshVendors = Array.isArray(freshVendorsRes) ? freshVendorsRes : (freshVendorsRes?.items || []);
      setVendors(freshVendors);
      if (newVendor?._id) {
        setSelectedVendorId(newVendor._id);
      }

      setNewVendorName("");
      setNewVendorPhone("");
      setNewVendorEmail("");
      setNewVendorServiceType("Maintenance");
      setNewVendorStatus("approved");
      setNewVendorNotes("");
      setShowNewVendorForm(false);
    } catch (error: any) {
      Alert.alert("Registration Error", "Failed to register vendor: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateBill = async () => {
    if (!selectedVendorId || !billNumber || !amount) {
      Alert.alert("Validation Error", "Vendor, bill number, and amount are required.");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        vendor: selectedVendorId,
        billNumber,
        amount: parseFloat(amount),
        dueDate: dueDate ? new Date(dueDate).toISOString() : new Date().toISOString(),
        status,
        description,
      };

      await apiFetch("/api/atlasbook/bills", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      Alert.alert("Success", "Vendor bill recorded successfully.");
      setShowAddModal(false);

      setBillNumber("");
      setAmount("");
      setDueDate("");
      setDescription("");
      setStatus("Unpaid");

      fetchData();
    } catch (error: any) {
      Alert.alert("Error", "Failed to record bill: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const mappedLedger: VendorLedger[] = useMemo(() => {
    return bills.map((b) => {
      const vName = b.vendor && typeof b.vendor === "object" ? b.vendor.name : "Unknown Vendor";
      const verified = b.vendor && typeof b.vendor === "object" ? b.vendor.status === "approved" : false;
      const statusMapped = b.status === "Paid" ? "Paid" : b.status === "Overdue" ? "Disputed" : "Outstanding";

      return {
        id: b._id,
        name: vName,
        invoiceNo: b.billNumber || "---",
        amount: b.amount || 0,
        dueDate: b.dueDate ? new Date(b.dueDate).toISOString().split("T")[0] : "N/A",
        bankVerified: verified,
        status: statusMapped,
      };
    });
  }, [bills]);

  const accountsPayable = useMemo(() => {
    return mappedLedger.filter((v) => v.status !== "Paid").reduce((sum, e) => sum + e.amount, 0);
  }, [mappedLedger]);

  const totalOutstanding = useMemo(() => {
    return mappedLedger.filter((v) => v.status === "Outstanding").reduce((sum, e) => sum + e.amount, 0);
  }, [mappedLedger]);

  const verifiedVendorRate = useMemo(() => {
    const totalVerified = mappedLedger.filter((v) => v.bankVerified).length;
    return mappedLedger.length > 0 ? Math.round((totalVerified / mappedLedger.length) * 100) : 0;
  }, [mappedLedger]);

  const filteredLedger = useMemo(() => {
    return mappedLedger.filter((v) => {
      if (filterVerified === "verified") return v.bankVerified;
      if (filterVerified === "unverified") return !v.bankVerified;
      return true;
    });
  }, [mappedLedger, filterVerified]);

  const currentSelectedVendorName = useMemo(() => {
    const found = vendors.find((v) => v._id === selectedVendorId);
    return found ? found.name : "Select Active Vendor...";
  }, [vendors, selectedVendorId]);

  const pickerOptions = useMemo(() => {
    if (activePickerField === "vendor") {
      return vendors.map((v) => ({ id: v._id, name: `${v.name} (${v.serviceType})` }));
    }
    if (activePickerField === "status") {
      return [
        { id: "Unpaid", name: "Unpaid / Outstanding" },
        { id: "Partially Paid", name: "Partially Paid" },
        { id: "Paid", name: "Paid" },
        { id: "Overdue", name: "Overdue / Disputed" },
      ];
    }
    if (activePickerField === "routing") {
      return [
        { id: "approved", name: "Verified Approved" },
        { id: "not-approved", name: "Unverified / Pending" },
      ];
    }
    return [];
  }, [activePickerField, vendors]);

  const handleSelectOption = (val: string) => {
    if (activePickerField === "vendor") setSelectedVendorId(val);
    if (activePickerField === "status") setStatus(val as any);
    if (activePickerField === "routing") setNewVendorStatus(val as any);
    setActivePickerField(null);
  };

  const currentActivePickerValue = useMemo(() => {
    if (activePickerField === "vendor") return selectedVendorId;
    if (activePickerField === "status") return status;
    if (activePickerField === "routing") return newVendorStatus;
    return "";
  }, [activePickerField, selectedVendorId, status, newVendorStatus]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerBlock}>
        <View style={styles.headerTopRow}>
          <View style={styles.titleContainer}>
            <Text style={styles.headerTitle}>Vendor Accounts Payable (A/P)</Text>
            <Text style={styles.headerSubtitle}>
              Vendor accounts and billing details for{" "}
              <Text style={styles.activeEntityHighlight}>{activeEntity?.name || "Unknown Entity"}</Text>
            </Text>
          </View>
        </View>

        <View style={[styles.headerActionsPanel, { marginTop: 12 }]}>
          <View style={styles.filterTabsWrapper}>
            <TouchableOpacity
              style={[styles.filterTabButton, filterVerified === "all" ? styles.filterTabActiveButton : null]}
              onPress={() => setFilterVerified("all")}
            >
              <Text style={[styles.filterTabButtonText, filterVerified === "all" ? styles.filterTabActiveButtonText : null]}>
                All Vendors
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterTabButton, filterVerified === "verified" ? styles.filterTabActiveButton : null]}
              onPress={() => setFilterVerified("verified")}
            >
              <Text style={[styles.filterTabButtonText, filterVerified === "verified" ? styles.filterTabActiveButtonText : null]}>
                Verified Routing
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.recordBillTriggerButton}
            onPress={() => setShowAddModal(true)}
            activeOpacity={0.8}
          >
            <Plus size={14} color={colors.primaryText} />
            <Text style={styles.recordBillTriggerButtonText}>Record Bill</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={[styles.centerStatePadding, { marginTop: 40 }]}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : (
          <View style={{ gap: 20 }}>
            <View style={styles.kpiCardsContainerStack}>
              <View style={styles.kpiItemCard}>
                <View style={styles.kpiIconBoxSurface}>
                  <Landmark size={20} color={colors.primary} />
                </View>
                <View style={styles.kpiDataMetaColumn}>
                  <Text style={styles.kpiCardLabelTitle}>Accounts Payable (AP)</Text>
                  <Text style={styles.kpiCardMainHeadingValue}>${accountsPayable.toLocaleString()}</Text>
                  <Text style={styles.kpiCardSubtitleDesc}>Aging balance total</Text>
                </View>
              </View>

              <View style={styles.kpiItemCard}>
                <View style={styles.kpiIconBoxSurface}>
                  <FileText size={20} color={colors.primary} />
                </View>
                <View style={styles.kpiDataMetaColumn}>
                  <Text style={styles.kpiCardLabelTitle}>Outstanding Invoices</Text>
                  <Text style={styles.kpiCardMainHeadingValue}>${totalOutstanding.toLocaleString()}</Text>
                  <Text style={styles.kpiCardSubtitleDesc}>Awaiting bank authorization</Text>
                </View>
              </View>

              <View style={styles.kpiItemCard}>
                <View style={styles.kpiIconBoxSurface}>
                  <Briefcase size={20} color={colors.primary} />
                </View>
                <View style={styles.kpiDataMetaColumn}>
                  <Text style={styles.kpiCardLabelTitle}>Verified Vendor Rate</Text>
                  <Text style={styles.kpiCardMainHeadingValue}>{verifiedVendorRate}%</Text>
                  <Text style={styles.kpiCardSubtitleDesc}>Secured banking credentials</Text>
                </View>
              </View>
            </View>

            <View style={styles.ledgerTableSurfaceCard}>
              <Text style={styles.ledgerTableSectionHeaderLabel}>Vendor Accounts Ledger Detail</Text>

              <ScrollView horizontal showsHorizontalScrollIndicator style={styles.tableHorizontalScrollFrame}>
                <View style={styles.tableMatrixMinWidthContainer}>
                  <View style={styles.simulatedTableHeaderRow}>
                    <Text style={[styles.tableHeaderCellLabel, styles.colVendorName]}>Vendor Name</Text>
                    <Text style={[styles.tableHeaderCellLabel, styles.colInvoiceRef]}>Invoice Reference</Text>
                    <Text style={[styles.tableHeaderCellLabel, styles.colDueDate]}>Due Date</Text>
                    <Text style={[styles.tableHeaderCellLabel, styles.colVerification]}>Routing Verification</Text>
                    <Text style={[styles.tableHeaderCellLabel, styles.colAmount, styles.textAlignRight]}>Invoice Amount</Text>
                    <Text style={[styles.tableHeaderCellLabel, styles.colStatus, styles.textAlignRight]}>Status</Text>
                  </View>

                  {filteredLedger.length === 0 ? (
                    <View style={styles.centerStatePadding}>
                      <Text style={styles.emptyStateFallbackText}>
                        No vendor ledger entries found. Click "Record Bill" to log a new invoice.
                      </Text>
                    </View>
                  ) : (
                    filteredLedger.map((v, idx) => {
                      const isPaid = v.status === "Paid";
                      const isOutstanding = v.status === "Outstanding";

                      return (
                        <View key={v.id || String(idx)} style={styles.tableDataBodyRowFrame}>
                          <View style={styles.colVendorName}>
                            <Text style={styles.vendorNameMainText} numberOfLines={1}>{v.name}</Text>
                          </View>

                          <View style={styles.colInvoiceRef}>
                            <Text style={styles.invoiceRefText} numberOfLines={1}>{v.invoiceNo}</Text>
                          </View>

                          <View style={styles.colDueDate}>
                            <Text style={styles.dueDateText} numberOfLines={1}>{v.dueDate}</Text>
                          </View>

                          <View style={styles.colVerification}>
                            {v.bankVerified ? (
                              <View style={styles.verificationInlineBadgeFlex}>
                                <CheckCircle2 size={14} color={colors.successText} />
                                <Text style={styles.verificationApprovedText}>Verified Approved</Text>
                              </View>
                            ) : (
                              <View style={styles.verificationInlineBadgeFlex}>
                                <ShieldAlert size={14} color={colors.dangerText} />
                                <Text style={styles.verificationUnverifiedText}>UNVERIFIED</Text>
                              </View>
                            )}
                          </View>

                          <View style={styles.colAmount}>
                            <Text style={styles.amountNumericalText} numberOfLines={1}>
                              ${v.amount.toLocaleString()}
                            </Text>
                          </View>

                          <View style={styles.colStatus}>
                            <View
                              style={[
                                styles.statusBadgePillFrame,
                                isPaid ? { backgroundColor: colors.badgePaidBg } : null,
                                isOutstanding ? { backgroundColor: colors.badgeOutstandingBg } : null,
                                !isPaid && !isOutstanding ? { backgroundColor: colors.badgeDisputedBg } : null,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.statusBadgePillInnerText,
                                  isPaid ? { color: colors.successText } : null,
                                  isOutstanding ? { color: colors.primary } : null,
                                  !isPaid && !isOutstanding ? { color: colors.dangerText } : null,
                                ]}
                              >
                                {v.status}
                              </Text>
                            </View>
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
              </ScrollView>
            </View>
          </View>
        )}
      </ScrollView>

      <Modal animationType="slide" transparent visible={showAddModal} onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalBlurOverlay}>
          <View style={styles.modalContentCard}>
            <View style={styles.modalCardHeaderTopRow}>
              <View style={styles.modalCardTitleHeadingContainer}>
                <FileText size={18} color={colors.primary} />
                <Text style={styles.modalCardTitleHeading}>Record Vendor Bill (A/P)</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setShowAddModal(false);
                  setShowNewVendorForm(false);
                }}
                style={styles.closeModalCrossButton}
                activeOpacity={0.7}
              >
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView bounces={false} showsVerticalScrollIndicator={false} style={styles.modalFormScrollContainer} keyboardShouldPersistTaps="handled">
              {!showNewVendorForm ? (
                <View style={styles.activeVendorSelectionGroupFrame}>
                  <View style={styles.vendorSelectorUpperLineRow}>
                    <Text style={styles.vendorSelectorFieldLabelText}>Select Active Vendor *</Text>
                    <TouchableOpacity
                      style={styles.registerNewVendorTriggerLink}
                      onPress={() => setShowNewVendorForm(true)}
                    >
                      <UserPlus size={14} color={colors.primary} />
                      <Text style={styles.registerNewVendorTriggerLinkText}>Register New Vendor</Text>
                    </TouchableOpacity>
                  </View>
                  {vendors.length === 0 ? (
                    <Text style={styles.noVendorsWarningParagraph}>
                      No vendors registered. Click the link above to add one.
                    </Text>
                  ) : (
                    <TouchableOpacity
                      style={styles.vendorSelectDropdownAnchorButton}
                      onPress={() => setActivePickerField("vendor")}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.vendorSelectDropdownAnchorButtonText} numberOfLines={1}>
                        {currentSelectedVendorName}
                      </Text>
                      <ChevronDown size={14} color={colors.textSecondary} />
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <View style={styles.subFormInlineVendorContainer}>
                  <View style={styles.subFormHeaderRow}>
                    <Text style={styles.subFormTitleHeadingText}>Register New Vendor</Text>
                    <TouchableOpacity style={styles.subFormCancelButton} onPress={() => setShowNewVendorForm(false)}>
                      <Text style={styles.subFormCancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.subFormSplitGridRow}>
                    <View style={styles.subFormFieldColumnFull}>
                      <Text style={styles.formElementFieldLabel}>Vendor Name *</Text>
                      <TextInput
                        style={styles.formInputFieldText}
                        value={newVendorName}
                        onChangeText={setNewVendorName}
                        placeholder="e.g. Acme Maintenance Corp"
                        placeholderTextColor={colors.placeholderText}
                        autoCapitalize="words"
                      />
                    </View>

                    <View style={styles.subFormFieldColumnHalf}>
                      <Text style={styles.formElementFieldLabel}>Phone *</Text>
                      <TextInput
                        style={styles.formInputFieldText}
                        value={newVendorPhone}
                        onChangeText={setNewVendorPhone}
                        placeholder="e.g. 555-0199"
                        placeholderTextColor={colors.placeholderText}
                        keyboardType="phone-pad"
                      />
                    </View>

                    <View style={styles.subFormFieldColumnHalf}>
                      <Text style={styles.formElementFieldLabel}>Email</Text>
                      <TextInput
                        style={styles.formInputFieldText}
                        value={newVendorEmail}
                        onChangeText={setNewVendorEmail}
                        placeholder="e.g. billing@acme.com"
                        placeholderTextColor={colors.placeholderText}
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                    </View>

                    <View style={styles.subFormFieldColumnHalf}>
                      <Text style={styles.formElementFieldLabel}>Service Classification</Text>
                      <TextInput
                        style={styles.formInputFieldText}
                        value={newVendorServiceType}
                        onChangeText={setNewVendorServiceType}
                        placeholder="e.g. Security, Utility"
                        placeholderTextColor={colors.placeholderText}
                      />
                    </View>

                    <View style={styles.subFormFieldColumnHalf}>
                      <Text style={styles.formElementFieldLabel}>Routing Verification</Text>
                      <TouchableOpacity
                        style={styles.customSelectInputAnchor}
                        onPress={() => setActivePickerField("routing")}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.customSelectAnchorText}>
                          {newVendorStatus === "approved" ? "Verified Approved" : "Unverified / Pending"}
                        </Text>
                        <ChevronDown size={14} color={colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.subFormActionSubmitButton}
                    onPress={handleCreateVendor}
                    disabled={submitting}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.subFormActionSubmitButtonText}>
                      {submitting ? "Registering Vendor..." : "Register Vendor & Continue"}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.formSplitColumnsContainer}>
                <View style={styles.formSplitFieldColumn}>
                  <Text style={styles.formElementFieldLabel}>Bill Number / Invoice Ref *</Text>
                  <TextInput
                    style={styles.formInputFieldText}
                    value={billNumber}
                    onChangeText={setBillNumber}
                    placeholder="e.g. INV-9098"
                    placeholderTextColor={colors.placeholderText}
                    autoCapitalize="characters"
                  />
                </View>

                <View style={styles.formSplitFieldColumn}>
                  <Text style={styles.formElementFieldLabel}>Bill Amount ($) *</Text>
                  <TextInput
                    style={styles.formInputFieldText}
                    value={amount}
                    onChangeText={setAmount}
                    placeholder="e.g. 14200"
                    placeholderTextColor={colors.placeholderText}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.formSplitColumnsContainer}>
                <View style={styles.formSplitFieldColumn}>
                  <Text style={styles.formElementFieldLabel}>Due Date</Text>
                  <TextInput
                    style={styles.formInputFieldText}
                    value={dueDate}
                    onChangeText={setDueDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.placeholderText}
                  />
                </View>

                <View style={styles.formSplitFieldColumn}>
                  <Text style={styles.formElementFieldLabel}>Payment Status</Text>
                  <TouchableOpacity
                    style={styles.customSelectInputAnchor}
                    onPress={() => setActivePickerField("status")}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.customSelectAnchorText} numberOfLines={1}>
                      {status === "Unpaid" && "Unpaid / Outstanding"}
                      {status === "Partially Paid" && "Partially Paid"}
                      {status === "Paid" && "Paid"}
                      {status === "Overdue" && "Overdue / Disputed"}
                    </Text>
                    <ChevronDown size={14} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formSplitFieldColumnSpan2}>
                <Text style={styles.formElementFieldLabel}>Description / Memo</Text>
                <TextInput
                  style={styles.formInputTextAreaField}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="e.g. Monthly server capacity wires, Q2 office rents..."
                  placeholderTextColor={colors.placeholderText}
                  multiline
                  numberOfLines={2}
                />
              </View>
            </ScrollView>

            <View style={styles.modalCardActionsFooterRow}>
              <TouchableOpacity
                style={styles.modalCancelButtonAction}
                onPress={() => setShowAddModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmitButtonAction}
                onPress={handleCreateBill}
                disabled={submitting || showNewVendorForm || vendors.length === 0}
                activeOpacity={0.8}
              >
                <Text style={styles.modalSubmitButtonText}>
                  {submitting ? "Recording..." : "Record Bill"}
                </Text>
              </TouchableOpacity>
            </View>

            {activePickerField !== null && (
              <View style={styles.inlineDropdownOverlayContainer}>
                <View style={styles.inlineDropdownCardWindow}>
                  <View style={styles.inlineDropdownHeaderRow}>
                    <Text style={styles.inlineDropdownHeaderTitleText}>
                      {activePickerField === "vendor" && "Select Active Vendor"}
                      {activePickerField === "status" && "Payment Status"}
                      {activePickerField === "routing" && "Routing Verification"}
                    </Text>
                    <TouchableOpacity onPress={() => setActivePickerField(null)}>
                      <X size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                  <ScrollView style={{ flexGrow: 0 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                    {pickerOptions.map((opt, idx) => {
                      const isSelected = currentActivePickerValue === opt.id;
                      return (
                        <TouchableOpacity
                          key={`${String(opt.id)}-${idx}`}
                          style={styles.pickerRowSelectionButtonAnchor}
                          onPress={() => handleSelectOption(String(opt.id))}
                        >
                          <Text style={[styles.pickerRowCategoryValueText, isSelected ? styles.activeSelectionText : null]}>
                            {opt.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
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