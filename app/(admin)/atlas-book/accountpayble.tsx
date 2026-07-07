import React, { useState, useEffect, useMemo, useCallback } from "react";
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  Modal, 
  TextInput, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator,
  Alert,
  Dimensions,
  RefreshControl,
} from "react-native";
import { useAtlasBooks } from "./context/AtlasBooksContext";
import { KpiCard } from "./component/KpiCard";
import { 
  Landmark, 
  Briefcase, 
  FileText, 
  CheckCircle2, 
  ShieldAlert, 
  Plus, 
  X, 
  UserPlus 
} from "lucide-react-native";
import { apiFetch } from "../../../lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";

const { width } = Dimensions.get("window");

interface VendorLedger {
  id: string;
  name: string;
  invoiceNo: string;
  amount: number;
  dueDate: string;
  bankVerified: boolean;
  status: "Paid" | "Outstanding" | "Disputed";
}

function buildColors(uiTheme: any, isDark: boolean) {
  return {
    background:       uiTheme.panelColors?.dashboardBackground     || (isDark ? "#09090b" : "#F8FAFC"),
    cardBg:           uiTheme.panelColors?.dashboardCardBackground || (isDark ? "#18181b" : "#FFFFFF"),
    text:             uiTheme.panelColors?.dashboardTextColor      || (isDark ? "#F4F4F5" : "#0F172A"),
    textSecondary:    isDark ? "#A1A1AA" : "#334155",
    textMuted:        isDark ? "#71717A" : "#64748B",
    border:           isDark ? "#27272A" : "#E2E8F0",
    borderLight:      isDark ? "rgba(255,255,255,0.05)" : "#F1F5F9",
    inputBg:          isDark ? "#18181b" : "#F8FAFC",
    inputBorder:      isDark ? "#27272A" : "#E2E8F0",
    inputText:        isDark ? "#FFFFFF" : "#0F172A",
    placeholderText:  isDark ? "#52525B" : "#94A3B8",
    primary:          uiTheme.customColors?.primary || "#FBBF24",
    primaryText:      "#09090b",
    successBg:        isDark ? "rgba(52,211,153,0.15)" : "#ECFDF5",
    successText:      isDark ? "#34D399" : "#10B981",
    dangerBg:         isDark ? "rgba(248,113,113,0.15)" : "#FEF2F2",
    dangerText:       isDark ? "#F87171" : "#EF4444",
    overlayBg:        "rgba(0,0,0,0.5)",
  };
}

function createStyles(colors: ReturnType<typeof buildColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    mainPadding: { padding: 16 },
    headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
    headerTitle: { fontSize: 18, color: colors.text, fontWeight: "900", letterSpacing: 0.5, textTransform: "uppercase" },
    headerSubtitle: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
    toggleBarContainer: { alignItems: "flex-start", marginBottom: 20 },
    toggleBar: { flexDirection: "row", backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 2 },
    toggleBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
    toggleBtnActive: { backgroundColor: colors.primary },
    toggleBtnText: { color: colors.textSecondary, fontSize: 11, fontWeight: "600" },
    toggleBtnTextActive: { color: colors.primaryText, fontWeight: "700" },
    kpiWrapper: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 8 },
    sectionHeading: { fontSize: 11, fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 1, marginTop: 12, marginBottom: 4 },
    ledgerCard: { flexDirection: "row", backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, marginHorizontal: 16, marginBottom: 10, justifyContent: "space-between", alignItems: "center" },
    ledgerRowLeft: { flex: 1, paddingRight: 12 },
    ledgerVendorName: { color: colors.text, fontSize: 13, fontWeight: "700" },
    ledgerMeta: { color: colors.textMuted, fontSize: 11, marginTop: 3 },
    verificationStatusWrapper: { marginTop: 6 },
    badgeFlex: { flexDirection: "row", alignItems: "center" },
    verifiedText: { color: colors.successText, fontSize: 10, fontWeight: "700" },
    unverifiedText: { color: colors.dangerText, fontSize: 10, fontWeight: "700" },
    ledgerRowRight: { alignItems: "flex-end" },
    ledgerAmount: { color: colors.text, fontSize: 14, fontWeight: "800" },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, marginTop: 6 },
    statusBadgeText: { fontSize: 9, fontWeight: "700" },
    badgePaid: { backgroundColor: "rgba(16, 185, 129, 0.15)" },
    badgeOutstanding: { backgroundColor: "rgba(245, 158, 11, 0.15)" },
    badgeDisputed: { backgroundColor: "rgba(239, 68, 68, 0.15)" },
    textPaid: { color: "#10b981" },
    textOutstanding: { color: "#f59e0b" },
    textDisputed: { color: "#ef4444" },
    emptyContainer: { padding: 40, alignItems: "center" },
    emptyText: { color: colors.placeholderText, fontSize: 12, textAlign: "center", lineHeight: 18 },
    floatingActionButton: { position: "absolute", bottom: 44, right: 24, left: 24, height: 46, backgroundColor: colors.primary, borderRadius: 10, flexDirection: "row", justifyContent: "center", alignItems: "center", elevation: 6 },
    fabText: { color: colors.primaryText, fontSize: 13, fontWeight: "700" },
    modalSafeArea: { flex: 1, backgroundColor: colors.background },
    modalTopNavigation: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderColor: colors.cardBg },
    modalNavigationTitle: { color: colors.text, fontSize: 13, fontWeight: "700", textTransform: "uppercase" },
    modalFormContent: { flex: 1, paddingHorizontal: 20 },
    vendorSelectorBox: { backgroundColor: "rgba(24, 24, 27, 0.5)", padding: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.border, marginVertical: 12 },
    flexSpaceBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    formInputLabel: { fontSize: 11, fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", marginTop: 14, marginBottom: 6 },
    inlineButtonWrapper: { flexDirection: "row", alignItems: "center" },
    inlineButtonText: { color: colors.primary, fontSize: 11, fontWeight: "700" },
    darkLabelText: { color: colors.placeholderText, fontSize: 12, marginTop: 4 },
    customSelectorTrigger: { backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.border, padding: 12, borderRadius: 8, justifyContent: "center" },
    whiteText: { color: colors.text, fontSize: 12 },
    dropdownOptionContainer: { backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.border, borderRadius: 8, marginTop: 4, padding: 4 },
    dropdownOptionRow: { padding: 12, borderBottomWidth: 1, borderColor: colors.border },
    subFormBorderContainer: { backgroundColor: "rgba(24, 24, 27, 0.8)", padding: 14, borderRadius: 10, borderWidth: 1, borderColor: "rgba(245, 158, 11, 0.25)", marginVertical: 12 },
    subFormHeaderTitle: { fontWeight: "700", color: colors.primary, textTransform: "uppercase", fontSize: 11 },
    grayCancelText: { color: colors.textSecondary, fontSize: 11, fontWeight: "600" },
    textInputBox: { backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, color: colors.inputText, fontSize: 13 },
    subFormButton: { backgroundColor: colors.primary, padding: 12, borderRadius: 8, alignItems: "center", marginTop: 16 },
    subFormButtonText: { color: colors.primaryText, fontWeight: "700", fontSize: 12 },
    modalActionsRow: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", marginTop: 24, paddingBottom: 40, gap: 12 },
    actionButtonCancel: { paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 8 },
    actionButtonCancelText: { color: colors.textSecondary, fontWeight: "700", fontSize: 12 },
    actionButtonSubmit: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: colors.primary, borderRadius: 8 },
    actionButtonSubmitText: { color: colors.primaryText, fontWeight: "700", fontSize: 12 }
  });
}

const Vendors: React.FC = () => {
  const { activeEntity } = useAtlasBooks();
  const { uiTheme } = useTheme();
  const isDark = (uiTheme.theme as string) === "dark" || (uiTheme.theme as string) === "metallic-elite";
  const colors = useMemo(() => buildColors(uiTheme, isDark), [uiTheme, isDark]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [filterVerified, setFilterVerified] = useState("all");
  const [bills, setBills] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showVerifyDropdown, setShowVerifyDropdown] = useState(false);
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [resBills, resVendors] = await Promise.all([
        apiFetch<{ success: boolean; items: any[] }>("/api/atlasbook/bills"),
        apiFetch<{ success?: boolean; items?: any[] } | any[]>("/api/vendors")
      ]);

      setBills(resBills.items || []);
      
      const vendorList = Array.isArray(resVendors) ? resVendors : (resVendors.items || []);
      setVendors(vendorList);
      if (vendorList.length > 0) {
        setSelectedVendorId(vendorList[0]._id);
      }
    } catch {
      Alert.alert("Error", "Failed to pull system operational parameters from core network mapping.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateVendor = async () => {
    if (!newVendorName || !newVendorPhone) {
      Alert.alert("Validation Error", "Vendor name and phone number variables must be satisfied.");
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
        notes: newVendorNotes
      };

      const res = await apiFetch<{ item: any }>("/api/vendors", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      const freshVendorsRes = await apiFetch<{ success?: boolean; items?: any[] } | any[]>("/api/vendors");
      const freshVendors = Array.isArray(freshVendorsRes) ? freshVendorsRes : (freshVendorsRes.items || []);
      setVendors(freshVendors);

      const createdVendor = res.item || res;
      if (createdVendor && createdVendor._id) {
        setSelectedVendorId(createdVendor._id);
      }

      setNewVendorName("");
      setNewVendorPhone("");
      setNewVendorEmail("");
      setNewVendorServiceType("Maintenance");
      setNewVendorStatus("approved");
      setNewVendorNotes("");
      setShowNewVendorForm(false);
    } catch {
      Alert.alert("Error", "Cloud file transmission failed during parameters authorization mapping mapping.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateBill = async () => {
    if (!selectedVendorId || !billNumber || !amount) {
      Alert.alert("Validation Error", "Vendor, bill number, and amount references are required.");
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
        description
      };

      await apiFetch("/api/atlasbook/bills", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      setShowAddModal(false);
      setBillNumber("");
      setAmount("");
      setDueDate("");
      setDescription("");
      setStatus("Unpaid");

      fetchData();
    } catch {
      Alert.alert("Error", "Cloud context processing engine rejected database parameters updating variables.");
    } finally {
      setSubmitting(false);
    }
  };

  const mappedLedger: VendorLedger[] = useMemo(() => {
    return bills.map(b => {
      const vName = b.vendor && typeof b.vendor === "object" ? b.vendor.name : "Unknown Vendor";
      const verified = b.vendor && typeof b.vendor === "object" ? b.vendor.status === "approved" : false;
      const statusMapped = b.status === "Paid" ? "Paid" : b.status === "Overdue" ? "Disputed" : "Outstanding";

      return {
        id: b._id,
        name: vName,
        invoiceNo: b.billNumber || "---",
        amount: b.amount || 0,
        dueDate: b.dueDate ? new Date(b.dueDate).toISOString().split('T')[0] : "N/A",
        bankVerified: verified,
        status: statusMapped
      };
    });
  }, [bills]);

  const accountsPayable = useMemo(() => mappedLedger.filter(v => v.status !== "Paid").reduce((sum, e) => sum + e.amount, 0), [mappedLedger]);
  const totalOutstanding = useMemo(() => mappedLedger.filter(v => v.status === "Outstanding").reduce((sum, e) => sum + e.amount, 0), [mappedLedger]);
  const totalVerified = useMemo(() => mappedLedger.filter(v => v.bankVerified).length, [mappedLedger]);
  const verifiedVendorRate = useMemo(() => mappedLedger.length > 0 ? Math.round((totalVerified / mappedLedger.length) * 100) : 0, [mappedLedger, totalVerified]);

  const filteredLedger = useMemo(() => {
    return mappedLedger.filter(v => {
      if (filterVerified === "verified") return v.bankVerified;
      if (filterVerified === "unverified") return !v.bankVerified;
      return true;
    });
  }, [mappedLedger, filterVerified]);

  const selectedVendorObject = useMemo(() => vendors.find(v => v._id === selectedVendorId), [vendors, selectedVendorId]);

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={filteredLedger}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={colors.primary} />}
        ListHeaderComponent={() => (
          <View style={styles.mainPadding}>
            <View style={styles.headerRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerTitle}>Accounts Payable</Text>
                <Text style={styles.headerSubtitle}>
                  Manage vendor bills and outstanding payment obligations.
                </Text>
              </View>
            </View>

            <View style={styles.toggleBarContainer}>
              <View style={styles.toggleBar}>
                <TouchableOpacity 
                  onPress={() => setFilterVerified("all")} 
                  style={[styles.toggleBtn, filterVerified === "all" && styles.toggleBtnActive]}
                >
                  <Text style={[styles.toggleBtnText, filterVerified === "all" && styles.toggleBtnTextActive]}>All Vendors</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => setFilterVerified("verified")} 
                  style={[styles.toggleBtn, filterVerified === "verified" && styles.toggleBtnActive]}
                >
                  <Text style={[styles.toggleBtnText, filterVerified === "verified" && styles.toggleBtnTextActive]}>Verified Routing</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.kpiWrapper}>
              <KpiCard title="Accounts Payable (AP)" value={`$${accountsPayable.toLocaleString()}`} icon={Landmark} subtitle="Aging balance total" />
              <KpiCard title="Outstanding Invoices" value={`$${totalOutstanding.toLocaleString()}`} icon={FileText} subtitle="Awaiting bank authorization" />
              <KpiCard title="Verified Vendor Rate" value={`${verifiedVendorRate}%`} icon={Briefcase} subtitle="Secured banking credentials" />
            </View>

            <Text style={styles.sectionHeading}>Vendor Accounts Ledger Detail</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <View style={styles.ledgerCard}>
            <View style={styles.ledgerRowLeft}>
              <Text style={styles.ledgerVendorName}>{item.name}</Text>
              <Text style={styles.ledgerMeta}>Ref: {item.invoiceNo}  •  Due: {item.dueDate}</Text>
              
              <View style={styles.verificationStatusWrapper}>
                {item.bankVerified ? (
                  <View style={styles.badgeFlex}>
                    <CheckCircle2 size={12} color={colors.successText} style={{ marginRight: 4 }} />
                    <Text style={styles.verifiedText}>Verified Approved</Text>
                  </View>
                ) : (
                  <View style={styles.badgeFlex}>
                    <ShieldAlert size={12} color={colors.dangerText} style={{ marginRight: 4 }} />
                    <Text style={styles.unverifiedText}>UNVERIFIED</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.ledgerRowRight}>
              <Text style={styles.ledgerAmount}>${item.amount.toLocaleString()}</Text>
              <View style={[
                styles.statusBadge, 
                item.status === "Paid" ? styles.badgePaid : item.status === "Outstanding" ? styles.badgeOutstanding : styles.badgeDisputed
              ]}>
                <Text style={[
                  styles.statusBadgeText,
                  item.status === "Paid" ? styles.textPaid : item.status === "Outstanding" ? styles.textOutstanding : styles.textDisputed
                ]}>{item.status}</Text>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            {loading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={styles.emptyText}>No vendor ledger entries found. Tap the button below to log a new invoice.</Text>
            )}
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 100 }}
      />

      <TouchableOpacity 
        style={styles.floatingActionButton} 
        onPress={() => setShowAddModal(true)}
      >
        <Plus size={20} color={colors.primaryText} style={{ marginRight: 6 }} />
        <Text style={styles.fabText}>Add Bill</Text>
      </TouchableOpacity>

      <Modal visible={showAddModal} animationType="slide" transparent={false} onRequestClose={() => setShowAddModal(false)}>
        <SafeAreaView style={styles.modalSafeArea}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"} 
            style={{ flex: 1 }}
          >
            <View style={styles.modalTopNavigation}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <FileText size={16} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={styles.modalNavigationTitle}>Record Vendor Bill (A/P)</Text>
              </View>
              <TouchableOpacity 
                onPress={() => {
                  setShowAddModal(false);
                  setShowNewVendorForm(false);
                }}
              >
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalFormContent} keyboardShouldPersistTaps="handled">
              {!showNewVendorForm ? (
                <View style={styles.vendorSelectorBox}>
                  <View style={styles.flexSpaceBetween}>
                    <Text style={styles.formInputLabel}>Select Active Vendor *</Text>
                    <TouchableOpacity 
                      style={styles.inlineButtonWrapper} 
                      onPress={() => setShowNewVendorForm(true)}
                    >
                      <UserPlus size={14} color={colors.primary} style={{ marginRight: 4 }} />
                      <Text style={styles.inlineButtonText}>Register New Vendor</Text>
                    </TouchableOpacity>
                  </View>

                  {vendors.length === 0 ? (
                    <Text style={styles.darkLabelText}>No vendors registered. Tap the link above to add one.</Text>
                  ) : (
                    <View>
                      <TouchableOpacity 
                        style={styles.customSelectorTrigger}
                        onPress={() => setShowVendorDropdown(!showVendorDropdown)}
                      >
                        <Text style={styles.whiteText}>
                          {selectedVendorObject ? `${selectedVendorObject.name} (${selectedVendorObject.serviceType})` : "Choose a vendor"}
                        </Text>
                      </TouchableOpacity>
                      
                      {showVendorDropdown && (
                        <View style={styles.dropdownOptionContainer}>
                          {vendors.map((v) => (
                            <TouchableOpacity 
                              key={v._id} 
                              style={styles.dropdownOptionRow}
                              onPress={() => {
                                setSelectedVendorId(v._id);
                                setShowVendorDropdown(false);
                              }}
                            >
                              <Text style={styles.whiteText}>
                                {v.name} ({v.serviceType}) [{v.status === "approved" ? "Verified" : "Unverified"}]
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.subFormBorderContainer}>
                  <View style={[styles.flexSpaceBetween, { borderBottomWidth: 1, borderColor: colors.border, paddingBottom: 8, marginBottom: 12 }]}>
                    <Text style={styles.subFormHeaderTitle}>Register New Vendor</Text>
                    <TouchableOpacity onPress={() => setShowNewVendorForm(false)}>
                      <Text style={styles.grayCancelText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.formInputLabel}>Vendor Name *</Text>
                  <TextInput 
                    style={styles.textInputBox}
                    value={newVendorName}
                    onChangeText={setNewVendorName}
                    placeholder="e.g. Acme Maintenance Corp"
                    placeholderTextColor={colors.placeholderText}
                  />

                  <Text style={styles.formInputLabel}>Phone *</Text>
                  <TextInput 
                    style={styles.textInputBox}
                    value={newVendorPhone}
                    onChangeText={setNewVendorPhone}
                    placeholder="e.g. 555-0199"
                    placeholderTextColor={colors.placeholderText}
                    keyboardType="phone-pad"
                  />

                  <Text style={styles.formInputLabel}>Email</Text>
                  <TextInput 
                    style={styles.textInputBox}
                    value={newVendorEmail}
                    onChangeText={setNewVendorEmail}
                    placeholder="e.g. billing@acme.com"
                    placeholderTextColor={colors.placeholderText}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />

                  <Text style={styles.formInputLabel}>Service Classification</Text>
                  <TextInput 
                    style={styles.textInputBox}
                    value={newVendorServiceType}
                    onChangeText={setNewVendorServiceType}
                    placeholder="e.g. Security, Utility, Cleaning"
                    placeholderTextColor={colors.placeholderText}
                  />

                  <Text style={styles.formInputLabel}>Routing Verification</Text>
                  <TouchableOpacity 
                    style={styles.customSelectorTrigger} 
                    onPress={() => setShowVerifyDropdown(!showVerifyDropdown)}
                  >
                    <Text style={styles.whiteText}>
                      {newVendorStatus === "approved" ? "Verified Approved" : "Unverified / Pending"}
                    </Text>
                  </TouchableOpacity>
                  
                  {showVerifyDropdown && (
                    <View style={styles.dropdownOptionContainer}>
                      <TouchableOpacity 
                        style={styles.dropdownOptionRow} 
                        onPress={() => { setNewVendorStatus("approved"); setShowVerifyDropdown(false); }}
                      >
                        <Text style={styles.whiteText}>Verified Approved</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.dropdownOptionRow} 
                        onPress={() => { setNewVendorStatus("not-approved"); setShowVerifyDropdown(false); }}
                      >
                        <Text style={styles.whiteText}>Unverified / Pending</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  <Text style={styles.formInputLabel}>Notes / Internal Memos</Text>
                  <TextInput 
                    style={[styles.textInputBox, { height: 60, textAlignVertical: 'top' }]}
                    value={newVendorNotes}
                    onChangeText={setNewVendorNotes}
                    placeholder="Payment terms, contract references..."
                    placeholderTextColor={colors.placeholderText}
                    multiline={true}
                  />

                  <TouchableOpacity 
                    style={styles.subFormButton}
                    disabled={submitting}
                    onPress={handleCreateVendor}
                  >
                    <Text style={styles.subFormButtonText}>
                      {submitting ? "Registering Vendor..." : "Register Vendor & Continue"}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={{ marginTop: 10 }}>
                <Text style={styles.formInputLabel}>Bill Number / Invoice Ref *</Text>
                <TextInput 
                  style={styles.textInputBox}
                  value={billNumber}
                  onChangeText={setBillNumber}
                  placeholder="e.g. INV-9098"
                  placeholderTextColor={colors.placeholderText}
                />

                <Text style={styles.formInputLabel}>Bill Amount ($) *</Text>
                <TextInput 
                  style={styles.textInputBox}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="e.g. 14200"
                  placeholderTextColor={colors.placeholderText}
                  keyboardType="numeric"
                />

                <Text style={styles.formInputLabel}>Due Date (YYYY-MM-DD)</Text>
                <TextInput 
                  style={styles.textInputBox}
                  value={dueDate}
                  onChangeText={setDueDate}
                  placeholder="e.g. 2026-07-15"
                  placeholderTextColor={colors.placeholderText}
                />

                <Text style={styles.formInputLabel}>Payment Status</Text>
                <TouchableOpacity 
                  style={styles.customSelectorTrigger} 
                  onPress={() => setShowStatusDropdown(!showStatusDropdown)}
                >
                  <Text style={styles.whiteText}>{status}</Text>
                </TouchableOpacity>

                {showStatusDropdown && (
                  <View style={styles.dropdownOptionContainer}>
                    {["Unpaid", "Partially Paid", "Paid", "Overdue"].map((st) => (
                      <TouchableOpacity 
                        key={st} 
                        style={styles.dropdownOptionRow} 
                        onPress={() => { setStatus(st as any); setShowStatusDropdown(false); }}
                      >
                        <Text style={styles.whiteText}>{st}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <Text style={styles.formInputLabel}>Description / Memo</Text>
                <TextInput 
                  style={[styles.textInputBox, { height: 75, textAlignVertical: "top" }]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="e.g. Monthly server capacity wires, Q2 office rents..."
                  placeholderTextColor={colors.placeholderText}
                  multiline={true}
                  numberOfLines={3}
                />
              </View>

              <View style={styles.modalActionsRow}>
                <TouchableOpacity 
                  style={styles.actionButtonCancel}
                  onPress={() => setShowAddModal(false)}
                >
                  <Text style={styles.actionButtonCancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.actionButtonSubmit, (submitting || showNewVendorForm || vendors.length === 0) && { opacity: 0.5 }]}
                  disabled={submitting || showNewVendorForm || vendors.length === 0}
                  onPress={handleCreateBill}
                >
                  <Text style={styles.actionButtonSubmitText}>
                    {submitting ? "Recording..." : "Add Bill"}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

export default Vendors;