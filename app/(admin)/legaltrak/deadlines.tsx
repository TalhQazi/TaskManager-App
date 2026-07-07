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
  Calendar,
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

interface LegalDeadline {
  id: string;
  _id?: string;
  deadlineNumber: string;
  title: string;
  description?: string;
  dueDate?: string;
  caseReference?: string;
  assignedTo?: string;
  status?: "Pending" | "Met" | "Missed";
  priority?: "Low" | "Medium" | "High" | "Critical";
}

interface ApiResponse {
  items?: LegalDeadline[];
  data?: LegalDeadline[];
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
    successBg:        isDark ? "rgba(16,185,129,0.15)" : "#ECFDF5",
    successText:      isDark ? "#34D399" : "#10B981",
    dangerBg:         isDark ? "rgba(239,68,68,0.15)" : "#FEF2F2",
    dangerText:       isDark ? "#FCA5A5" : "#EF4444",
    warningBg:        isDark ? "rgba(245,158,11,0.15)" : "#FEF3C7",
    warningText:      isDark ? "#F59E0B" : "#D97706",
    overlayBg:        "rgba(0,0,0,0.4)",
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
    listHeading: { fontSize: 16, fontWeight: "600", color: colors.text, marginBottom: 12 },
    emptyContainer: { padding: 32, alignItems: "center" },
    emptyText: { color: colors.textMuted, fontSize: 14 },
    itemCard: { backgroundColor: colors.cardBg, borderRadius: 8, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 12 },
    cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", borderBottomWidth: 1, borderColor: colors.borderLight, paddingBottom: 10 },
    itemNumber: { fontSize: 12, fontWeight: "600", color: colors.primary },
    itemTitle: { fontSize: 15, fontWeight: "600", color: colors.text, marginVertical: 2 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
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
    pickerTrigger: { borderWidth: 1, borderColor: colors.border, borderRadius: 6, height: 38, paddingHorizontal: 10, backgroundColor: "#FFFFFF", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    pickerTriggerText: { fontSize: 14, color: "#000000", fontWeight: "600", flex: 1 },
    formPickerTrigger: { borderWidth: 1, borderColor: colors.border, borderRadius: 6, height: 38, paddingHorizontal: 10, backgroundColor: "#FFFFFF", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    formPickerTriggerText: { fontSize: 14, color: "#000000", fontWeight: "600", flex: 1 },
    textAreaInput: { height: 70, paddingTop: 8, textAlignVertical: "top" },
    modalFooter: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 14 },
    viewDetailGridBlock: { borderBottomWidth: 1, borderColor: colors.borderLight, paddingBottom: 8 },
    viewBlockLabel: { fontSize: 12, color: colors.textMuted, marginBottom: 2 },
    viewBlockValue: { fontSize: 14, fontWeight: "500", color: colors.text },
    viewNotesBox: { backgroundColor: colors.inputBg, padding: 8, borderRadius: 4, marginTop: 4, fontSize: 13, color: colors.textSecondary },
  });
}

export default function DeadlinesScreen() {
  const { user } = useAuth();
  const { uiTheme } = useTheme();
  const isDark = (uiTheme.theme as string) === "dark" || (uiTheme.theme as string) === "metallic-elite";
  const colors = useMemo(() => buildColors(uiTheme, isDark), [uiTheme, isDark]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [deadlines, setDeadlines] = useState<LegalDeadline[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [activePicker, setActivePicker] = useState<{ type: "status" | "priority" | "form-status" | "form-priority"; options: { label: string; value: string }[] } | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDeadline, setSelectedDeadline] = useState<LegalDeadline | null>(null);

  const [formData, setFormData] = useState({
    deadlineNumber: "",
    title: "",
    description: "",
    dueDate: "",
    caseReference: "",
    assignedTo: "",
    status: "Pending" as LegalDeadline["status"],
    priority: "Medium" as LegalDeadline["priority"],
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await listResource<ApiResponse | LegalDeadline[]>("legal/deadlines");
      
      if (res && typeof res === "object" && "items" in res && Array.isArray(res.items)) {
        setDeadlines(res.items);
      } else if (res && typeof res === "object" && "data" in res && Array.isArray(res.data)) {
        setDeadlines(res.data);
      } else if (Array.isArray(res)) {
        setDeadlines(res);
      } else {
        setDeadlines([]);
      }
    } catch {
      Alert.alert("Error", "Could not fetch dynamic Legal data files from index endpoints.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchData();
  }, [user, fetchData]);

  const filteredDeadlines = useMemo(() => {
    return deadlines.filter((item) => {
      const deadlineNo = item?.deadlineNumber || "";
      const dTitle = item?.title || "";
      const caseRef = item?.caseReference || "";

      const matchesSearch = deadlineNo.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            dTitle.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            caseRef.toLowerCase().includes(searchQuery.toLowerCase());
                            
      const matchesStatus = statusFilter === "all" || item?.status === statusFilter;
      const matchesPriority = priorityFilter === "all" || item?.priority === priorityFilter;
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [deadlines, searchQuery, statusFilter, priorityFilter]);

  const validateForm = () => {
    if (!formData.deadlineNumber.trim() || !formData.title.trim()) {
      Alert.alert("Input Check Failure", "Unique statutory tracking codes and descriptive titles are mandatory details.");
      return false;
    }
    return true;
  };

  const resetForm = () => {
    setFormData({ deadlineNumber: "", title: "", description: "", dueDate: "", caseReference: "", assignedTo: "", status: "Pending", priority: "Medium" });
  };

  const handleCreate = async () => {
    if (!validateForm()) return;
    try {
      setIsSubmitting(true);
      const payload = {
        ...formData,
        dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : new Date().toISOString()
      };
      await createResource<LegalDeadline>("legal/deadlines", payload);
      setIsCreateOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Creation error logged.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedDeadline || !validateForm()) return;
    try {
      setIsSubmitting(true);
      const targetId = selectedDeadline.id || selectedDeadline._id || "";
      const payload = {
        ...formData,
        dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : new Date().toISOString()
      };
      await updateResource<LegalDeadline>("legal/deadlines", targetId, payload);
      setIsEditOpen(false);
      setSelectedDeadline(null);
      resetForm();
      fetchData();
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Update fault recorded.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDeleteConfirmation = (item: LegalDeadline) => {
    const targetId = item.id || item._id || "";
    Alert.alert("Purge Entry", `Are you sure you want to delete tracking node file ${item.deadlineNumber}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
          try {
            await deleteResource("legal/deadlines", targetId);
            fetchData();
          } catch {
            Alert.alert("Error", "Entity erasure protocol dropped by target node.");
          }
        }},
    ]);
  };

  const openPickerModal = (type: "status" | "priority" | "form-status" | "form-priority") => {
    let options: { label: string; value: string }[] = [];
    if (type === "status") {
      options = [{ label: "All Statuses", value: "all" }, { label: "Pending", value: "Pending" }, { label: "Met", value: "Met" }, { label: "Missed", value: "Missed" }];
    } else if (type === "priority") {
      options = [{ label: "All Priorities", value: "all" }, { label: "Low", value: "Low" }, { label: "Medium", value: "Medium" }, { label: "High", value: "High" }, { label: "Critical", value: "Critical" }];
    } else if (type === "form-status") {
      options = [{ label: "Pending", value: "Pending" }, { label: "Met", value: "Met" }, { label: "Missed", value: "Missed" }];
    } else if (type === "form-priority") {
      options = [{ label: "Low", value: "Low" }, { label: "Medium", value: "Medium" }, { label: "High", value: "High" }, { label: "Critical", value: "Critical" }];
    }
    setActivePicker({ type, options });
  };

  const handlePickerSelect = (value: string) => {
    if (!activePicker) return;
    const { type } = activePicker;
    if (type === "status") setStatusFilter(value);
    else if (type === "priority") setPriorityFilter(value);
    else if (type === "form-status") setFormData({ ...formData, status: value as any });
    else if (type === "form-priority") setFormData({ ...formData, priority: value as any });
    setActivePicker(null);
  };

  const getStatusBadgeColors = (status: LegalDeadline["status"]) => {
    if (status === "Met") return { bg: colors.successBg, text: colors.successText, border: colors.successText };
    if (status === "Missed") return { bg: colors.dangerBg, text: colors.dangerText, border: colors.dangerText };
    return { bg: colors.warningBg, text: colors.warningText, border: colors.warningText };
  };

  const openEdit = (item: LegalDeadline) => {
    setSelectedDeadline(item);
    setFormData({
      deadlineNumber: item.deadlineNumber || "",
      title: item.title || "",
      description: item.description || "",
      dueDate: item.dueDate ? item.dueDate.split("T")[0] : "",
      caseReference: item.caseReference || "",
      assignedTo: item.assignedTo || "",
      status: item.status || "Pending",
      priority: item.priority || "Medium",
    });
    setIsEditOpen(true);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Legal Deadlines</Text>
          <Text style={styles.headerSubtitle}>Monitor case timeline limits, limitation periods & filings</Text>
        </View>
        <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={() => { resetForm(); setIsCreateOpen(true); }}>
          <Plus size={14} color={colors.primaryText} />
          <Text style={styles.btnPrimaryText}>Add Limit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={colors.primary} />}>
        <View style={styles.filterCard}>
          <View style={styles.searchContainer}>
            <Search size={18} color={colors.textMuted} style={styles.searchIcon} />
            <TextInput style={styles.searchInput} placeholder="Search limits by label, key or matter number..." placeholderTextColor={colors.placeholderText} value={searchQuery} onChangeText={setSearchQuery} />
          </View>
        </View>

        <Text style={styles.listHeading}>Legal Tracking Records</Text>
        {loading ? <ActivityIndicator size="large" color={colors.primary} /> : filteredDeadlines.length === 0 ? (
          <View style={styles.emptyContainer}><Text style={styles.emptyText}>No tracking profiles found matching active state combinations.</Text></View>
        ) : (
          filteredDeadlines.map((item, index) => {
            const itemKey = item.id || item._id || `deadline-item-${index}`;
            const b = getStatusBadgeColors(item.status);
            return (
              <View key={itemKey} style={styles.itemCard}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.itemNumber}>{item.deadlineNumber}</Text>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: b.bg, borderColor: b.border, borderWidth: 1 }]}><Text style={{ fontSize: 11, fontWeight: "600", color: b.text }}>{item.status || "Pending"}</Text></View>
                </View>
                <View style={styles.cardDetailsGrid}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Limit Expiry Date</Text>
                    <Text style={styles.detailText}>{item.dueDate ? item.dueDate.split("T")[0] : "—"}</Text>
                  </View>
                  <View style={styles.detailRow}><Text style={styles.detailLabel}>Case Reference</Text><Text style={styles.detailText}>{item.caseReference || "—"}</Text></View>
                  <View style={styles.detailRow}><Text style={styles.detailLabel}>Assigned Staff</Text><Text style={styles.detailText}>{item.assignedTo || "—"}</Text></View>
                  <View style={styles.detailRow}><Text style={styles.detailLabel}>Priority Class</Text><Text style={[styles.detailText, item.priority === "Critical" || item.priority === "High" ? { color: colors.dangerText } : null]}>{item.priority || "Medium"}</Text></View>
                </View>
                <View style={styles.cardActionsRow}>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => { setSelectedDeadline(item); setIsViewOpen(true); }}><Calendar size={16} color={colors.textMuted} /><Text style={styles.actionBtnText}>View</Text></TouchableOpacity>
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
            <Text style={styles.pickerModalTitle}>Select Parameters</Text>
            {activePicker?.options.map((opt, idx) => (
              <TouchableOpacity key={idx} style={styles.pickerOptionItem} onPress={() => handlePickerSelect(opt.value)}><Text style={styles.pickerOptionText}>{opt.label}</Text></TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={isViewOpen} transparent animationType="slide" onRequestClose={() => setIsViewOpen(false)}>
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollFormContainer}>
            <View style={styles.modalHeaderRow}><Text style={styles.modalTitle}>Limit Specific Summary</Text><TouchableOpacity onPress={() => setIsViewOpen(false)}><X size={20} color={colors.text} /></TouchableOpacity></View>
            {selectedDeadline && (
              <View style={{ gap: 14, marginVertical: 12 }}>
                <View style={styles.viewDetailGridBlock}><Text style={styles.viewBlockLabel}>Tracking Serial Number</Text><Text style={styles.viewBlockValue}>{selectedDeadline.deadlineNumber}</Text></View>
                <View style={styles.viewDetailGridBlock}><Text style={styles.viewBlockLabel}>Limitation Title</Text><Text style={styles.viewBlockValue}>{selectedDeadline.title}</Text></View>
                <View style={styles.viewDetailGridBlock}><Text style={styles.viewBlockLabel}>Statutory Limit Due Date</Text><Text style={styles.viewBlockValue}>{selectedDeadline.dueDate ? selectedDeadline.dueDate.split("T")[0] : "—"}</Text></View>
                <View style={styles.viewDetailGridBlock}><Text style={styles.viewBlockLabel}>Connected Matter File Code</Text><Text style={styles.viewBlockValue}>{selectedDeadline.caseReference || "—"}</Text></View>
                <View style={styles.viewDetailGridBlock}><Text style={styles.viewBlockLabel}>Responsible Legal Staff</Text><Text style={styles.viewBlockValue}>{selectedDeadline.assignedTo || "—"}</Text></View>
                <View style={styles.viewDetailGridBlock}><Text style={styles.viewBlockLabel}>Tracking State Status</Text><Text style={styles.viewBlockValue}>{selectedDeadline.status}</Text></View>
                <View style={styles.viewDetailGridBlock}><Text style={styles.viewBlockLabel}>Importance Priority Flag</Text><Text style={styles.viewBlockValue}>{selectedDeadline.priority}</Text></View>
                {selectedDeadline.description ? <View style={styles.viewDetailGridBlock}><Text style={styles.viewBlockLabel}>Statutory Description / Context Notes</Text><Text style={styles.viewNotesBox}>{selectedDeadline.description}</Text></View> : null}
              </View>
            )}
            <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={() => setIsViewOpen(false)}><Text style={styles.btnPrimaryText}>Close Panel</Text></TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={isCreateOpen || isEditOpen} transparent animationType="slide" onRequestClose={() => { setIsCreateOpen(false); setIsEditOpen(false); }}>
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollFormContainer}>
            <View style={styles.modalHeaderRow}><Text style={styles.modalTitle}>{isCreateOpen ? "Create Statutory Entry" : "Modify Limitation Record"}</Text><TouchableOpacity onPress={() => { setIsCreateOpen(false); setIsEditOpen(false); }}><X size={20} color={colors.text} /></TouchableOpacity></View>
            <View style={{ gap: 12, marginVertical: 8 }}>
              <View><Text style={styles.fieldLabel}>Deadline Record ID *</Text><TextInput style={styles.modalInput} value={formData.deadlineNumber} onChangeText={(t) => setFormData({ ...formData, deadlineNumber: t })} placeholder="e.g., DDL-502" placeholderTextColor={colors.placeholderText} /></View>
              <View><Text style={styles.fieldLabel}>Title *</Text><TextInput style={styles.modalInput} value={formData.title} onChangeText={(t) => setFormData({ ...formData, title: t })} placeholder="Descriptive limitation label" placeholderTextColor={colors.placeholderText} /></View>
              <View><Text style={styles.fieldLabel}>Connected Matter File Reference</Text><TextInput style={styles.modalInput} value={formData.caseReference} onChangeText={(t) => setFormData({ ...formData, caseReference: t })} placeholder="Matter ID number link" placeholderTextColor={colors.placeholderText} /></View>
              <View><Text style={styles.fieldLabel}>Responsible Account Assignee</Text><TextInput style={styles.modalInput} value={formData.assignedTo} onChangeText={(t) => setFormData({ ...formData, assignedTo: t })} placeholder="Staff member name" placeholderTextColor={colors.placeholderText} /></View>
              <View><Text style={styles.fieldLabel}>Limitation Expiry Due Date (YYYY-MM-DD)</Text><TextInput style={styles.modalInput} value={formData.dueDate} onChangeText={(t) => setFormData({ ...formData, dueDate: t })} placeholder="e.g., 2026-12-01" placeholderTextColor={colors.placeholderText} /></View>
              <View><Text style={styles.fieldLabel}>Tracking State Status *</Text><TouchableOpacity style={styles.formPickerTrigger} onPress={() => openPickerModal("form-status")}><Text style={styles.formPickerTriggerText}>{formData.status}</Text><ChevronDown size={14} color={colors.textMuted} /></TouchableOpacity></View>
              <View><Text style={styles.fieldLabel}>Importance Priority Flag *</Text><TouchableOpacity style={styles.formPickerTrigger} onPress={() => openPickerModal("form-priority")}><Text style={styles.formPickerTriggerText}>{formData.priority}</Text><ChevronDown size={14} color={colors.textMuted} /></TouchableOpacity></View>
              <View><Text style={styles.fieldLabel}>Internal Statutory Context Scope Summary</Text><TextInput style={[styles.modalInput, styles.textAreaInput]} multiline numberOfLines={3} value={formData.description} onChangeText={(t) => setFormData({ ...formData, description: t })} placeholder="Timeline context scope logs details..." placeholderTextColor={colors.placeholderText} /></View>
            </View>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={[styles.btn, styles.btnOutline]} onPress={() => { setIsCreateOpen(false); setIsEditOpen(false); }}><Text style={styles.btnOutlineText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.btnPrimary]} disabled={isSubmitting} onPress={isCreateOpen ? handleCreate : handleUpdate}>{isSubmitting ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.btnPrimaryText}>Save Record</Text>}</TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}