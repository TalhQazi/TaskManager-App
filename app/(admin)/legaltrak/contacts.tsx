import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Platform,
} from "react-native";
import {
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  Contact,
  ChevronDown,
  X,
} from "lucide-react-native";
import {
  createResource,
  deleteResource,
  listResource,
  updateResource,
} from "@/lib/admin/apiClient";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";

const { width } = Dimensions.get("window");

interface LegalContact {
  id: string;
  _id?: string;
  contactNumber: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  company?: string;
  contactType?: "Client" | "Judge" | "Opposing Counsel" | "Expert Witness" | "Other";
}

interface ApiResponse {
  items?: LegalContact[];
  data?: LegalContact[];
}

function buildColors(uiTheme: any, isDark: boolean) {
  return {
    background:       uiTheme.panelColors?.dashboardBackground     || (isDark ? "#0F172A" : "#F8FAFC"),
    cardBg:           uiTheme.panelColors?.dashboardCardBackground || (isDark ? "#1E293B" : "#FFFFFF"),
    text:             uiTheme.panelColors?.dashboardTextColor      || (isDark ? "#F8FAFC" : "#0F172A"),
    textSecondary:    isDark ? "#CBD5E1" : "#334155",
    textMuted:        isDark ? "#94A3B8" : "#64748B",
    border:           isDark ? "#334155" : "#E2E8F0",
    borderLight:      isDark ? "rgba(255,255,255,0.05)" : "#F1F5F9",
    inputBg:          isDark ? "#0F172A" : "#F8FAFC",
    inputBorder:      isDark ? "#334155" : "#E2E8F0",
    inputText:        isDark ? "#F8FAFC" : "#0F172A",
    placeholderText:  isDark ? "#475569" : "#94A3B8",
    primary:          uiTheme.customColors?.primary || (isDark ? "#6366F1" : "#2563EB"),
    primaryText:      "#FFFFFF",
    overlayBg:        "rgba(0,0,0,0.4)",
    successBg:        isDark ? "rgba(16,185,129,0.15)" : "#ECFDF5",
    successText:      isDark ? "#34D399" : "#10B981",
    dangerBg:         isDark ? "rgba(239,68,68,0.15)" : "#FEF2F2",
    dangerText:       isDark ? "#FCA5A5" : "#EF4444",
  };
}

function createStyles(colors: ReturnType<typeof buildColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { 
      paddingTop: Platform.OS === "ios" ? 60 : 24, 
      paddingHorizontal: 16, 
      paddingBottom: 16, 
      backgroundColor: colors.cardBg, 
      borderBottomWidth: 1, 
      borderColor: colors.border,
      flexDirection: "row", 
      alignItems: "center" 
    },
    headerTitle: { fontSize: 22, fontWeight: "bold", color: colors.text },
    headerSubtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
    scrollContainer: { padding: 16, paddingBottom: 40 },
    filterCard: { backgroundColor: colors.cardBg, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.border, gap: 10, marginBottom: 16 },
    searchContainer: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingHorizontal: 10, height: 38, backgroundColor: colors.inputBg },
    searchIcon: { marginRight: 6 },
    searchInput: { flex: 1, fontSize: 14, color: colors.inputText },
    pickerTrigger: { borderWidth: 1, borderColor: colors.border, borderRadius: 6, height: 38, paddingHorizontal: 10, backgroundColor: "#FFFFFF", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    pickerTriggerText: { fontSize: 14, color: "#000000", fontWeight: "600", flex: 1 },
    listHeading: { fontSize: 16, fontWeight: "600", color: colors.text, marginBottom: 12 },
    emptyContainer: { padding: 32, alignItems: "center" },
    emptyText: { color: colors.textMuted, fontSize: 14 },
    itemCard: { backgroundColor: colors.cardBg, borderRadius: 8, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 12 },
    cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", borderBottomWidth: 1, borderColor: colors.borderLight, paddingBottom: 10 },
    itemNumber: { fontSize: 12, fontWeight: "600", color: colors.primary },
    itemTitle: { fontSize: 15, fontWeight: "600", color: colors.text, marginVertical: 2 },
    typeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1, backgroundColor: "rgba(37,99,235,0.12)", borderColor: "rgba(37,99,235,0.2)" },
    cardDetailsGrid: { paddingVertical: 10, gap: 6 },
    detailRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    detailLabel: { fontSize: 13, color: colors.textMuted },
    detailText: { fontSize: 13, color: colors.textSecondary, fontWeight: "500" },
    cardActionsRow: { flexDirection: "row", borderTopWidth: 1, borderColor: colors.borderLight, paddingTop: 10, justifyContent: "space-around" },
    actionBtn: { flexDirection: "row", alignItems: "center", gap: 4, padding: 4 },
    actionBtnText: { fontSize: 13, fontWeight: "500", color: colors.textMuted },
    btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 38, paddingHorizontal: 14, borderRadius: 6 },
    btnPrimary: { backgroundColor: colors.primary },
    btnPrimaryText: { color: colors.primaryText, fontSize: 13, fontWeight: "600" },
    btnOutline: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardBg },
    btnOutlineText: { color: colors.text, fontSize: 13, fontWeight: "600" },
    modalOverlay: { flex: 1, backgroundColor: colors.overlayBg, justifyContent: "center", padding: 16 },
    pickerContentContainer: { backgroundColor: colors.cardBg, borderRadius: 8, padding: 16, borderWidth: 1, borderColor: colors.border },
    pickerModalTitle: { fontSize: 15, fontWeight: "600", marginBottom: 12, color: colors.text },
    pickerOptionItem: { paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.borderLight },
    pickerOptionText: { fontSize: 14, color: colors.text },
    modalScrollFormContainer: { backgroundColor: colors.cardBg, borderRadius: 8, padding: 16, paddingBottom: 24, borderWidth: 1, borderColor: colors.border },
    modalHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderColor: colors.border, paddingBottom: 10, marginBottom: 8 },
    modalTitle: { fontSize: 16, fontWeight: "600", color: colors.text },
    fieldLabel: { fontSize: 13, fontWeight: "500", color: colors.textSecondary, marginBottom: 4, marginTop: 8 },
    modalInput: { borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 6, height: 38, paddingHorizontal: 10, fontSize: 14, color: colors.inputText, backgroundColor: colors.inputBg },
    modalFooter: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 14 },
    viewDetailGridBlock: { borderBottomWidth: 1, borderColor: colors.borderLight, paddingBottom: 8 },
    viewBlockLabel: { fontSize: 12, color: colors.textMuted, marginBottom: 2 },
    viewBlockValue: { fontSize: 14, fontWeight: "500", color: colors.text },
  });
}

export default function ContactsScreen() {
  const { user } = useAuth();
  const { uiTheme } = useTheme();
  const isDark = (uiTheme.theme as string) === "dark" || (uiTheme.theme as string) === "metallic-elite";
  const colors = useMemo(() => buildColors(uiTheme, isDark), [uiTheme, isDark]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [contacts, setContacts] = useState<LegalContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [activePicker, setActivePicker] = useState<{ type: "type" | "form-type"; options: { label: string; value: string }[] } | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedContact, setSelectedContact] = useState<LegalContact | null>(null);

  const [formData, setFormData] = useState({
    contactNumber: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    company: "",
    contactType: "Client" as LegalContact["contactType"],
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await listResource<ApiResponse | LegalContact[]>("legal/contacts");
      
      if (res && typeof res === "object" && "items" in res && Array.isArray(res.items)) {
        setContacts(res.items);
      } else if (res && typeof res === "object" && "data" in res && Array.isArray(res.data)) {
        setContacts(res.data);
      } else if (Array.isArray(res)) {
        setContacts(res);
      } else {
        setContacts([]);
      }
    } catch {
      Alert.alert("Error", "Failed to get registered contact lists from storage context.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchData();
  }, [user, fetchData]);

  const filteredContacts = useMemo(() => {
    const query = (searchQuery || "").toLowerCase();

    return contacts.filter((item) => {
      const firstName = item?.firstName || "";
      const lastName = item?.lastName || "";
      const fullName = `${firstName} ${lastName}`.toLowerCase();
      
      const contactNumber = (item?.contactNumber || "").toLowerCase();
      const company = (item?.company || "").toLowerCase();

      const matchesSearch = 
        contactNumber.includes(query) || 
        fullName.includes(query) || 
        company.includes(query);

      const matchesType = typeFilter === "all" || item?.contactType === typeFilter;
      
      return matchesSearch && matchesType;
    });
  }, [contacts, searchQuery, typeFilter]);

  const validateForm = () => {
    if (!formData.contactNumber.trim() || !formData.firstName.trim() || !formData.lastName.trim()) {
      Alert.alert("Validation Fault", "Identity ID number, first name, and last name fields are mandatory.");
      return false;
    }
    return true;
  };

  const resetForm = () => {
    setFormData({ contactNumber: "", firstName: "", lastName: "", email: "", phone: "", company: "", contactType: "Client" });
  };

  const handleCreate = async () => {
    if (!validateForm()) return;
    try {
      setIsSubmitting(true);
      await createResource<LegalContact>("legal/contacts", formData);
      setIsCreateOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Failure adding profile.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedContact || !validateForm()) return;
    try {
      setIsSubmitting(true);
      const targetId = selectedContact.id || selectedContact._id || "";
      await updateResource<LegalContact>("legal/contacts", targetId, formData);
      setIsEditOpen(false);
      setSelectedContact(null);
      resetForm();
      fetchData();
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Save failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDeleteConfirmation = (item: LegalContact) => {
    const targetId = item.id || item._id || "";
    Alert.alert("Erase Contact", `Are you sure you want to drop contact directory entry ${item.contactNumber}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete Permanently", style: "destructive", onPress: async () => {
          try {
            await deleteResource("legal/contacts", targetId);
            fetchData();
          } catch {
            Alert.alert("Error", "Server verification faulted during entity removal.");
          }
        }},
    ]);
  };

  const openPickerModal = (type: "type" | "form-type") => {
    const categories: LegalContact["contactType"][] = ["Client", "Judge", "Opposing Counsel", "Expert Witness", "Other"];
    const options = type === "type"
      ? [{ label: "All Contacts", value: "all" }, ...categories.map((c) => ({ label: c, value: c }))]
      : categories.map((c) => ({ label: c, value: c }));
    setActivePicker({ type, options });
  };

  const openEdit = (item: LegalContact) => {
    setSelectedContact(item);
    setFormData({
      contactNumber: item.contactNumber || "",
      firstName: item.firstName || "",
      lastName: item.lastName || "",
      email: item.email || "",
      phone: item.phone || "",
      company: item.company || "",
      contactType: item.contactType || "Client"
    });
    setIsEditOpen(true);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Legal Contacts</Text>
          <Text style={styles.headerSubtitle}>Manage client files, internal staff directories & experts</Text>
        </View>
        <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={() => { resetForm(); setIsCreateOpen(true); }}>
          <Plus size={14} color={colors.primaryText} />
          <Text style={styles.btnPrimaryText}>Add Profile</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={colors.primary} />}>
        <View style={styles.filterCard}>
          <View style={styles.searchContainer}>
            <Search size={18} color={colors.textMuted} style={styles.searchIcon} />
            <TextInput style={styles.searchInput} placeholder="Search by name, corporation or registry ID..." placeholderTextColor={colors.placeholderText} value={searchQuery} onChangeText={setSearchQuery} />
          </View>
          <TouchableOpacity style={styles.pickerTrigger} onPress={() => openPickerModal("type")}>
            <Text style={styles.pickerTriggerText}>{typeFilter === "all" ? "All Classifications" : typeFilter}</Text>
            <ChevronDown size={14} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <Text style={styles.listHeading}>Directory Indexes</Text>
        {loading ? <ActivityIndicator size="large" color={colors.primary} /> : filteredContacts.length === 0 ? (
          <View style={styles.emptyContainer}><Text style={styles.emptyText}>No registered records found matching current query boundaries.</Text></View>
        ) : (
          filteredContacts.map((item, index) => {
            const itemKey = item.id || item._id || `contact-item-${index}`;
            return (
              <View key={itemKey} style={styles.itemCard}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.itemNumber}>{item.contactNumber}</Text>
                    <Text style={styles.itemTitle}>{item.firstName} {item.lastName}</Text>
                  </View>
                  <View style={styles.typeBadge}><Text style={{ fontSize: 11, fontWeight: "600", color: colors.primary }}>{item.contactType}</Text></View>
                </View>
                <View style={styles.cardDetailsGrid}>
                  <View style={styles.detailRow}><Text style={styles.detailLabel}>Email Address</Text><Text style={styles.detailText}>{item.email || "—"}</Text></View>
                  <View style={styles.detailRow}><Text style={styles.detailLabel}>Phone Line</Text><Text style={styles.detailText}>{item.phone || "—"}</Text></View>
                  <View style={styles.detailRow}><Text style={styles.detailLabel}>Firm / Entity</Text><Text style={styles.detailText}>{item.company || "—"}</Text></View>
                </View>
                <View style={styles.cardActionsRow}>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => { setSelectedContact(item); setIsViewOpen(true); }}><Contact size={16} color={colors.textMuted} /><Text style={styles.actionBtnText}>View</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => openEdit(item)}><Edit size={16} color={colors.textMuted} /><Text style={styles.actionBtnText}>Edit</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => openDeleteConfirmation(item)}><Trash2 size={16} color={colors.dangerText} /><Text style={[styles.actionBtnText, { color: colors.dangerText }]}>Delete</Text></TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal visible={activePicker !== null} transparent animationType="fade" onRequestClose={() => setActivePicker(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setActivePicker(null)}>
          <View style={styles.pickerContentContainer}>
            <Text style={styles.pickerModalTitle}>Select Contact Type</Text>
            {activePicker?.options.map((opt, idx) => (
              <TouchableOpacity key={idx} style={styles.pickerOptionItem} onPress={() => { if (activePicker.type === "type") setTypeFilter(opt.value); else setFormData({ ...formData, contactType: opt.value as any }); setActivePicker(null); }}><Text style={styles.pickerOptionText}>{opt.label}</Text></TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={isViewOpen} transparent animationType="slide" onRequestClose={() => setIsViewOpen(false)}>
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollFormContainer}>
            <View style={styles.modalHeaderRow}><Text style={styles.modalTitle}>Contact Profile Inspector</Text><TouchableOpacity onPress={() => setIsViewOpen(false)}><X size={20} color={colors.text} /></TouchableOpacity></View>
            {selectedContact && (
              <View style={{ gap: 14, marginVertical: 12 }}>
                <View style={styles.viewDetailGridBlock}><Text style={styles.viewBlockLabel}>Registry Number</Text><Text style={styles.viewBlockValue}>{selectedContact.contactNumber}</Text></View>
                <View style={styles.viewDetailGridBlock}><Text style={styles.viewBlockLabel}>Full Given Name</Text><Text style={styles.viewBlockValue}>{selectedContact.firstName} {selectedContact.lastName}</Text></View>
                <View style={styles.viewDetailGridBlock}><Text style={styles.viewBlockLabel}>Classification Node</Text><Text style={styles.viewBlockValue}>{selectedContact.contactType}</Text></View>
                <View style={styles.viewDetailGridBlock}><Text style={styles.viewBlockLabel}>Electronic Mail Address</Text><Text style={styles.viewBlockValue}>{selectedContact.email || "—"}</Text></View>
                <View style={styles.viewDetailGridBlock}><Text style={styles.viewBlockLabel}>Telephone Link</Text><Text style={styles.viewBlockValue}>{selectedContact.phone || "—"}</Text></View>
                <View style={styles.viewDetailGridBlock}><Text style={styles.viewBlockLabel}>Associated Firm Corporation</Text><Text style={styles.viewBlockValue}>{selectedContact.company || "—"}</Text></View>
              </View>
            )}
            <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={() => setIsViewOpen(false)}><Text style={styles.btnPrimaryText}>Dismiss Profile</Text></TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={isCreateOpen || isEditOpen} transparent animationType="slide" onRequestClose={() => { setIsCreateOpen(false); setIsEditOpen(false); setSelectedContact(null); }}>
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollFormContainer}>
            <View style={styles.modalHeaderRow}><Text style={styles.modalTitle}>{isCreateOpen ? "Create Contact Profile" : "Edit Directory File"}</Text><TouchableOpacity onPress={() => { setIsCreateOpen(false); setIsEditOpen(false); setSelectedContact(null); }}><X size={20} color={colors.text} /></TouchableOpacity></View>
            <Text style={styles.fieldLabel}>Contact Account ID *</Text>
            <TextInput style={styles.modalInput} value={formData.contactNumber} onChangeText={(text) => setFormData({ ...formData, contactNumber: text })} placeholder="e.g., CON-901" placeholderTextColor={colors.placeholderText} />
            <Text style={styles.fieldLabel}>First Name *</Text>
            <TextInput style={styles.modalInput} value={formData.firstName} onChangeText={(text) => setFormData({ ...formData, firstName: text })} placeholder="Given names" placeholderTextColor={colors.placeholderText} />
            <Text style={styles.fieldLabel}>Last Name *</Text>
            <TextInput style={styles.modalInput} value={formData.lastName} onChangeText={(text) => setFormData({ ...formData, lastName: text })} placeholder="Surnames" placeholderTextColor={colors.placeholderText} />
            <Text style={styles.fieldLabel}>Email Contact Address</Text>
            <TextInput style={styles.modalInput} keyboardType="email-address" autoCapitalize="none" value={formData.email} onChangeText={(text) => setFormData({ ...formData, email: text })} placeholder="e.g., associate@firm.com" placeholderTextColor={colors.placeholderText} />
            <Text style={styles.fieldLabel}>Phone Number Line</Text>
            <TextInput style={styles.modalInput} keyboardType="phone-pad" value={formData.phone} onChangeText={(text) => setFormData({ ...formData, phone: text })} placeholder="e.g., +1-555-0192" placeholderTextColor={colors.placeholderText} />
            <Text style={styles.fieldLabel}>Company/Firm Name</Text>
            <TextInput style={styles.modalInput} value={formData.company} onChangeText={(text) => setFormData({ ...formData, company: text })} placeholder="Corporate affiliation" placeholderTextColor={colors.placeholderText} />
            <Text style={styles.fieldLabel}>Classification Category *</Text>
            <TouchableOpacity style={styles.pickerTrigger} onPress={() => openPickerModal("form-type")}><Text style={styles.pickerTriggerText}>{formData.contactType}</Text><ChevronDown size={14} color={colors.textMuted} /></TouchableOpacity>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={[styles.btn, styles.btnOutline]} onPress={() => { setIsCreateOpen(false); setIsEditOpen(false); setSelectedContact(null); }}><Text style={styles.btnOutlineText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.btnPrimary]} disabled={isSubmitting} onPress={isCreateOpen ? handleCreate : handleUpdate}>{isSubmitting ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.btnPrimaryText}>Commit Entry</Text>}</TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}