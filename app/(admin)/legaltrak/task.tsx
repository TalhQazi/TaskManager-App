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
  ListTodo,
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

interface LegalTask {
  id: string;
  _id?: string;
  taskNumber: string;
  title: string;
  description?: string;
  assignedTo?: string;
  dueDate?: string;
  caseReference?: string;
  status?: "To Do" | "In Progress" | "Done" | string;
  priority?: "Low" | "Medium" | "High" | "Critical" | string;
  createdAt?: string;
  updatedAt?: string;
}

interface ApiResponse {
  items?: LegalTask[];
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
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1, backgroundColor: "rgba(37,99,235,0.12)", borderColor: "rgba(37,99,235,0.25)" },
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
    formPickerTrigger: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 6, height: 38, paddingHorizontal: 10, backgroundColor: "#FFFFFF" },
    formPickerTriggerText: { fontSize: 14, color: "#000000", fontWeight: "600", flex: 1 },
    textAreaInput: { height: 74, paddingTop: 8, textAlignVertical: "top" },
    modalFooter: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 14 },
    viewDetailGridBlock: { borderBottomWidth: 1, borderColor: colors.borderLight, paddingBottom: 8 },
    viewBlockLabel: { fontSize: 12, color: colors.textMuted, marginBottom: 2 },
    viewBlockValue: { fontSize: 14, fontWeight: "500", color: colors.text },
    viewNotesBox: { backgroundColor: colors.inputBg, padding: 8, borderRadius: 4, marginTop: 4, fontSize: 13, color: colors.textSecondary },
  });
}

export default function TasksScreen() {
  const { user } = useAuth();
  const { uiTheme } = useTheme();
  const isDark = (uiTheme.theme as string) === "dark" || (uiTheme.theme as string) === "metallic-elite";
  const colors = useMemo(() => buildColors(uiTheme, isDark), [uiTheme, isDark]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [itemsList, setItemsList] = useState<LegalTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activePicker, setActivePicker] = useState<{ type: "status" | "priority"; options: { label: string; value: string }[] } | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedItem, setSelectedItem] = useState<LegalTask | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    assignedTo: "",
    dueDate: "",
    caseReference: "",
    status: "To Do",
    priority: "Medium",
  });

  const loadData = useCallback(async () => {
    try {
      const res = await listResource<ApiResponse | LegalTask[]>("legal/tasks");
      if (res && typeof res === "object" && "items" in res && Array.isArray(res.items)) {
        setItemsList(res.items);
      } else if (Array.isArray(res)) {
        setItemsList(res);
      } else {
        setItemsList([]);
      }
    } catch {
      Alert.alert("Error", "Failed to load tasks from backend services.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (user) loadData();
  }, [user, loadData]);

  const filteredItems = useMemo(() => {
    return itemsList.filter((c) =>
      JSON.stringify(c).toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [itemsList, searchQuery]);

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      assignedTo: "",
      dueDate: "",
      caseReference: "",
      status: "To Do",
      priority: "Medium",
    });
  };

  const handleAdd = async () => {
    if (!formData.title.trim()) {
      Alert.alert("Validation Error", "Task field is required.");
      return;
    }
    try {
      setIsSubmitting(true);
      const payload: any = { ...formData };
      Object.keys(payload).forEach((k) => { if (payload[k] === "") delete payload[k]; });
      await createResource<LegalTask>("legal/tasks", payload);
      setAddOpen(false);
      resetForm();
      loadData();
    } catch {
      Alert.alert("Error", "Failed to compile structure parameters inside database channels.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditOpen = (c: LegalTask) => {
    setSelectedItem(c);
    setFormData({
      title: c.title || "",
      description: c.description || "",
      assignedTo: c.assignedTo || "",
      dueDate: c.dueDate ? c.dueDate.split("T")[0] : "",
      caseReference: c.caseReference || "",
      status: c.status || "To Do",
      priority: c.priority || "Medium",
    });
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!selectedItem || !formData.title.trim()) return;
    try {
      setIsSubmitting(true);
      const targetId = selectedItem.id || selectedItem._id || "";
      const payload: any = { ...formData };
      Object.keys(payload).forEach((k) => { if (payload[k] === "") delete payload[k]; });
      await updateResource<LegalTask>("legal/tasks", targetId, payload);
      setEditOpen(false);
      setSelectedItem(null);
      resetForm();
      loadData();
    } catch {
      Alert.alert("Error", "Failed to update target task record metrics safely.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDeleteConfirmation = (item: LegalTask) => {
    const targetId = item.id || item._id || "";
    Alert.alert("Delete Task", `Are you sure you want to delete ${item.taskNumber}? This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete Permanently", style: "destructive", onPress: async () => {
          try {
            await deleteResource("legal/tasks", targetId);
            loadData();
          } catch {
            Alert.alert("Error", "Exclusion structural operations failed inside storage context mapping.");
          }
        }},
    ]);
  };

  const openPickerModal = (type: "status" | "priority") => {
    let options: { label: string; value: string }[] = [];
    if (type === "status") {
      options = [
        { label: "To Do", value: "To Do" },
        { label: "In Progress", value: "In Progress" },
        { label: "Done", value: "Done" },
      ];
    } else if (type === "priority") {
      options = [
        { label: "Low", value: "Low" },
        { label: "Medium", value: "Medium" },
        { label: "High", value: "High" },
        { label: "Critical", value: "Critical" },
      ];
    }
    setActivePicker({ type, options });
  };

  const handlePickerSelect = (value: string) => {
    if (!activePicker) return;
    if (activePicker.type === "status") {
      setFormData({ ...formData, status: value });
    } else if (activePicker.type === "priority") {
      setFormData({ ...formData, priority: value });
    }
    setActivePicker(null);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Legal Tasks</Text>
          <Text style={styles.headerSubtitle}>Manage your tasks and associated metadata.</Text>
        </View>
        <TouchableOpacity style={[styles.btn, styles.btnPrimary, { marginTop: 8 }]} onPress={() => { resetForm(); setAddOpen(true); }}>
          <Plus size={14} color={colors.primaryText} />
          <Text style={styles.btnPrimaryText}>Add Task</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={colors.primary} />}>
        <View style={styles.filterCard}>
          <View style={styles.searchContainer}>
            <Search size={18} color={colors.textMuted} style={styles.searchIcon} />
            <TextInput style={styles.searchInput} placeholder="Search..." placeholderTextColor={colors.placeholderText} value={searchQuery} onChangeText={setSearchQuery} />
          </View>
        </View>

        <Text style={styles.listHeading}>Operational Records Log</Text>
        {loading ? <ActivityIndicator size="large" color={colors.primary} /> : filteredItems.length === 0 ? (
          <View style={styles.emptyContainer}><Text style={styles.emptyText}>No records found.</Text></View>
        ) : (
          filteredItems.map((c, index) => {
            const itemKey = c.id || c._id || `task-item-${index}`;
            return (
              <View key={itemKey} style={styles.itemCard}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.itemNumber}>{c.taskNumber}</Text>
                    <Text style={styles.itemTitle}>{c.title}</Text>
                  </View>
                  <View style={styles.statusBadge}><Text style={{ fontSize: 11, fontWeight: "600", color: colors.primary }}>{c.status || "To Do"}</Text></View>
                </View>
                <View style={styles.cardDetailsGrid}>
                  <View style={styles.detailRow}><Text style={styles.detailLabel}>Assigned To</Text><Text style={styles.detailText}>{c.assignedTo || "—"}</Text></View>
                  <View style={styles.detailRow}><Text style={styles.detailLabel}>Due Date</Text><Text style={styles.detailText}>{c.dueDate ? new Date(c.dueDate).toLocaleDateString() : "N/A"}</Text></View>
                  <View style={styles.detailRow}><Text style={styles.detailLabel}>Priority</Text><Text style={styles.detailText}>{c.priority || "Medium"}</Text></View>
                </View>
                <View style={styles.cardActionsRow}>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => { setSelectedItem(c); setViewOpen(true); }}><Eye size={16} color={colors.textMuted} /><Text style={styles.actionBtnText}>View Details</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleEditOpen(c)}><Edit size={16} color={colors.textMuted} /><Text style={styles.actionBtnText}>Edit</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => openDeleteConfirmation(c)}><Trash2 size={16} color={colors.dangerText} /><Text style={[styles.actionBtnText, { color: colors.dangerText }]}>Delete</Text></TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal visible={activePicker !== null} transparent animationType="fade" onRequestClose={() => setActivePicker(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setActivePicker(null)}>
          <View style={styles.pickerContentContainer}>
            <Text style={styles.pickerModalTitle}>Select Attributes Configuration</Text>
            {activePicker?.options.map((opt, idx) => (
              <TouchableOpacity key={idx} style={styles.pickerOptionItem} onPress={() => handlePickerSelect(opt.value)}><Text style={styles.pickerOptionText}>{opt.label}</Text></TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={viewOpen} transparent animationType="slide" onRequestClose={() => setViewOpen(false)}>
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollFormContainer}>
            <View style={styles.modalHeaderRow}><Text style={styles.modalTitle}>Task Details</Text><TouchableOpacity onPress={() => setViewOpen(false)}><X size={20} color={colors.text} /></TouchableOpacity></View>
            {selectedItem && (
              <View style={{ gap: 14, marginVertical: 12 }}>
                <View style={styles.viewDetailGridBlock}><Text style={styles.viewBlockLabel}>Task No.</Text><Text style={styles.viewBlockValue}>{selectedItem.taskNumber}</Text></View>
                <View style={styles.viewDetailGridBlock}><Text style={styles.viewBlockLabel}>Task</Text><Text style={styles.viewBlockValue}>{selectedItem.title || "N/A"}</Text></View>
                {selectedItem.description ? <View style={styles.viewDetailGridBlock}><Text style={styles.viewBlockLabel}>Description</Text><Text style={styles.viewNotesBox}>{selectedItem.description}</Text></View> : null}
                <View style={styles.viewDetailGridBlock}><Text style={styles.viewBlockLabel}>Assigned To</Text><Text style={styles.viewBlockValue}>{selectedItem.assignedTo || "N/A"}</Text></View>
                <View style={styles.viewDetailGridBlock}><Text style={styles.viewBlockLabel}>Due Date</Text><Text style={styles.viewBlockValue}>{selectedItem.dueDate ? new Date(selectedItem.dueDate).toLocaleDateString() : "N/A"}</Text></View>
                <View style={styles.viewDetailGridBlock}><Text style={styles.viewBlockLabel}>Case Reference</Text><Text style={styles.viewBlockValue}>{selectedItem.caseReference || "N/A"}</Text></View>
                <View style={styles.viewDetailGridBlock}><Text style={styles.viewBlockLabel}>Status</Text><Text style={styles.viewBlockValue}>{selectedItem.status || "N/A"}</Text></View>
                <View style={styles.viewDetailGridBlock}><Text style={styles.viewBlockLabel}>Priority</Text><Text style={styles.viewBlockValue}>{selectedItem.priority || "N/A"}</Text></View>
              </View>
            )}
            <TouchableOpacity style={[styles.btn, styles.btnPrimary, { marginTop: 12 }]} onPress={() => setViewOpen(false)}><Text style={styles.btnPrimaryText}>Dismiss Inspector</Text></TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={addOpen || editOpen} transparent animationType="slide" onRequestClose={() => { setAddOpen(false); setEditOpen(false); }}>
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollFormContainer}>
            <View style={styles.modalHeaderRow}><Text style={styles.modalTitle}>{addOpen ? "Create New Task" : `Edit Task ${selectedItem?.taskNumber || ""}`}</Text><TouchableOpacity onPress={() => { setAddOpen(false); setEditOpen(false); }}><X size={20} color={colors.text} /></TouchableOpacity></View>
            <View style={{ gap: 12, marginVertical: 8 }}>
              <View><Text style={styles.fieldLabel}>Task *</Text><TextInput style={styles.modalInput} value={formData.title} onChangeText={(text) => setFormData({ ...formData, title: text })} placeholder="Task" placeholderTextColor={colors.placeholderText} /></View>
              <View><Text style={styles.fieldLabel}>Description</Text><TextInput style={[styles.modalInput, styles.textAreaInput]} multiline numberOfLines={3} value={formData.description} onChangeText={(text) => setFormData({ ...formData, description: text })} placeholder="Description..." placeholderTextColor={colors.placeholderText} /></View>
              <View><Text style={styles.fieldLabel}>Assigned To</Text><TextInput style={styles.modalInput} value={formData.assignedTo} onChangeText={(text) => setFormData({ ...formData, assignedTo: text })} placeholder="Assigned To" placeholderTextColor={colors.placeholderText} /></View>
              <View><Text style={styles.fieldLabel}>Due Date</Text><TextInput style={styles.modalInput} value={formData.dueDate} onChangeText={(text) => setFormData({ ...formData, dueDate: text })} placeholder="YYYY-MM-DD" placeholderTextColor={colors.placeholderText} /></View>
              <View><Text style={styles.fieldLabel}>Case Reference</Text><TextInput style={styles.modalInput} value={formData.caseReference} onChangeText={(text) => setFormData({ ...formData, caseReference: text })} placeholder="Case Reference" placeholderTextColor={colors.placeholderText} /></View>
              <View><Text style={styles.fieldLabel}>Status</Text><TouchableOpacity style={styles.formPickerTrigger} onPress={() => openPickerModal("status")}><Text style={styles.formPickerTriggerText}>{formData.status}</Text><ChevronDown size={14} color={colors.textMuted} /></TouchableOpacity></View>
              <View><Text style={styles.fieldLabel}>Priority</Text><TouchableOpacity style={styles.formPickerTrigger} onPress={() => openPickerModal("priority")}><Text style={styles.formPickerTriggerText}>{formData.priority}</Text><ChevronDown size={14} color={colors.textMuted} /></TouchableOpacity></View>
            </View>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={[styles.btn, styles.btnOutline]} onPress={() => { setAddOpen(false); setEditOpen(false); }}><Text style={styles.btnOutlineText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.btnPrimary]} disabled={isSubmitting} onPress={addOpen ? handleAdd : handleEdit}>{isSubmitting ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.btnPrimaryText}>{addOpen ? "Create Task" : "Save Changes"}</Text>}</TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}