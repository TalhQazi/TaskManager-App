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
  Briefcase,
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

interface LegalCase {
  id: string;
  _id?: string;
  caseNumber: string;
  title: string;
  caseType: string;
  status: string;
  priority: string;
  court?: string;
  description?: string;
  filingDate?: string;
  clientName?: string;
}

interface ApiResponse {
  items?: LegalCase[];
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
    filterRow: { flexDirection: "row", gap: 8 },
    pickerTrigger: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 6, height: 38, paddingHorizontal: 10, backgroundColor: "#FFFFFF", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    pickerTriggerText: { fontSize: 13, color: "#000000", fontWeight: "600", flex: 1 },
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
    btnPrimary: { backgroundColor: colors.primary, marginTop: 12 },
    btnPrimaryText: { color: colors.primaryText, fontSize: 13, fontWeight: "600" },
    btnOutline: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardBg },
    btnOutlineText: { color: colors.text, fontSize: 13, fontWeight: "600" },
    modalOverlay: { flex: 1, backgroundColor: colors.overlayBg, justifyContent: "center", padding: 16 },
    pickerContentContainer: { backgroundColor: colors.cardBg, borderRadius: 8, padding: 16, borderWidth: 1, borderColor: colors.border, maxHeight: width },
    pickerModalTitle: { fontSize: 15, fontWeight: "600", marginBottom: 12, color: colors.text },
    pickerOptionItem: { paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.borderLight },
    pickerOptionText: { fontSize: 14, color: colors.text },
    modalScrollFormContainer: { backgroundColor: colors.cardBg, borderRadius: 8, padding: 16, paddingBottom: 24, borderWidth: 1, borderColor: colors.border },
    modalHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderColor: colors.border, paddingBottom: 10, marginBottom: 8 },
    modalTitle: { fontSize: 16, fontWeight: "600", color: colors.text },
    fieldLabel: { fontSize: 13, fontWeight: "500", color: colors.textSecondary, marginBottom: 4, marginTop: 8 },
    modalInput: { borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 6, height: 38, paddingHorizontal: 10, fontSize: 14, color: colors.inputText, backgroundColor: colors.inputBg },
    textAreaInput: { height: 70, paddingTop: 8, textAlignVertical: "top" },
    modalFooter: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 14 },
    viewDetailGridBlock: { borderBottomWidth: 1, borderColor: colors.borderLight, paddingBottom: 8 },
    viewBlockLabel: { fontSize: 12, color: colors.textMuted, marginBottom: 2 },
    viewBlockValue: { fontSize: 14, fontWeight: "500", color: colors.text },
    viewNotesBox: { backgroundColor: colors.inputBg, padding: 8, borderRadius: 4, marginTop: 4, fontSize: 13, color: colors.textSecondary },
  });
}

export default function CasesScreen() {
  const { user } = useAuth();
  const { uiTheme } = useTheme();
  const isDark = (uiTheme.theme as string) === "dark" || (uiTheme.theme as string) === "metallic-elite";
  const colors = useMemo(() => buildColors(uiTheme, isDark), [uiTheme, isDark]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [cases, setCases] = useState<LegalCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Filtering States
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [courtFilter, setCourtFilter] = useState("all");
  
  const [activePicker, setActivePicker] = useState<{ type: string; options: { label: string; value: string }[] } | null>(null);

  // Modal Control States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCase, setSelectedCase] = useState<LegalCase | null>(null);

  // Form Management State
  const [formData, setFormData] = useState({
    caseNumber: "",
    title: "",
    caseType: "Civil",
    status: "Open",
    priority: "Medium",
    court: "",
    clientName: "",
    filingDate: "",
    description: "",
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await listResource<ApiResponse | LegalCase[]>("legal/cases");
      
      if (res && typeof res === "object" && "items" in res && Array.isArray(res.items)) {
        setCases(res.items);
      } else if (Array.isArray(res)) {
        setCases(res);
      } else {
        setCases([]);
      }
    } catch {
      Alert.alert("Error", "Failed to retrieve case management index files from core data cluster.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchData();
  }, [user, fetchData]);

  const filteredCases = useMemo(() => {
    return cases.filter((item) => {
      const caseNo = item?.caseNumber || "";
      const caseTitle = item?.title || "";
      
      const matchesSearch = caseNo.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            caseTitle.toLowerCase().includes(searchQuery.toLowerCase());
                            
      const matchesType = typeFilter === "all" || item?.caseType === typeFilter;
      const matchesStatus = statusFilter === "all" || item?.status === statusFilter;
      const matchesPriority = priorityFilter === "all" || item?.priority === priorityFilter;
      const matchesCourt = courtFilter === "all" || item?.court === courtFilter;

      return matchesSearch && matchesType && matchesStatus && matchesPriority && matchesCourt;
    });
  }, [cases, searchQuery, typeFilter, statusFilter, priorityFilter, courtFilter]);

  const validateForm = () => {
    if (!formData.caseNumber.trim() || !formData.title.trim()) {
      Alert.alert("Validation Error", "Case Identifier Reference Code and Title fields are mandatory.");
      return false;
    }
    return true;
  };

  const handleCreate = async () => {
    if (!validateForm()) return;
    try {
      setIsSubmitting(true);
      const payload = {
        ...formData,
        filingDate: formData.filingDate ? new Date(formData.filingDate).toISOString() : new Date().toISOString()
      };
      await createResource<LegalCase>("legal/cases", payload);
      setIsCreateOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Submission fault encountered.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedCase || !validateForm()) return;
    try {
      setIsSubmitting(true);
      const targetId = selectedCase.id || selectedCase._id || "";
      const payload = {
        ...formData,
        filingDate: formData.filingDate ? new Date(formData.filingDate).toISOString() : new Date().toISOString()
      };
      await updateResource<LegalCase>("legal/cases", targetId, payload);
      setIsEditOpen(false);
      setSelectedCase(null);
      resetForm();
      fetchData();
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Update lifecycle broken.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDeleteConfirmation = (item: LegalCase) => {
    const targetId = item.id || item._id || "";
    Alert.alert("Erase Case Record", `Permanently discard tracking metadata logs for case ${item.caseNumber}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
          try {
            await deleteResource("legal/cases", targetId);
            fetchData();
          } catch {
            Alert.alert("Error", "Deletion process interrupted.");
          }
        }},
    ]);
  };

  const resetForm = () => {
    setFormData({ caseNumber: "", title: "", caseType: "Civil", status: "Open", priority: "Medium", court: "", clientName: "", filingDate: "", description: "" });
  };

  const openEdit = (item: LegalCase) => {
    setSelectedCase(item);
    setFormData({
      caseNumber: item.caseNumber || "",
      title: item.title || "",
      caseType: item.caseType || "Civil",
      status: item.status || "Open",
      priority: item.priority || "Medium",
      court: item.court || "",
      clientName: item.clientName || "",
      filingDate: item.filingDate ? item.filingDate.split("T")[0] : "",
      description: item.description || "",
    });
    setIsEditOpen(true);
  };

  const openPickerModal = (type: "type" | "status" | "form-type" | "form-status" | "form-priority") => {
    let options: { label: string; value: string }[] = [];
    if (type === "type") {
      options = [{ label: "All Types", value: "all" }, { label: "Civil", value: "Civil" }, { label: "Criminal", value: "Criminal" }, { label: "Corporate", value: "Corporate" }];
    } else if (type === "status") {
      options = [{ label: "All Statuses", value: "all" }, { label: "Open", value: "Open" }, { label: "Closed", value: "Closed" }, { label: "Pending", value: "Pending" }];
    } else if (type === "form-type") {
      options = [{ label: "Civil", value: "Civil" }, { label: "Criminal", value: "Criminal" }, { label: "Corporate", value: "Corporate" }];
    } else if (type === "form-status") {
      options = [{ label: "Open", value: "Open" }, { label: "Closed", value: "Closed" }, { label: "Pending", value: "Pending" }];
    } else if (type === "form-priority") {
      options = [{ label: "High", value: "High" }, { label: "Medium", value: "Medium" }, { label: "Low", value: "Low" }];
    }
    setActivePicker({ type, options });
  };

  const getStatusColor = (status: string) => {
    if (status?.toLowerCase() === "open") return { bg: colors.successBg, text: colors.successText };
    if (status?.toLowerCase() === "closed") return { bg: colors.borderLight, text: colors.textMuted };
    return { bg: colors.dangerBg, text: colors.dangerText };
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Legal Cases</Text>
          <Text style={styles.headerSubtitle}>Manage your legal cases, track statuses, priorities, and assignments.
</Text>
        </View>
        <TouchableOpacity style={[styles.btn, styles.btnPrimary, { marginTop: 0 }]} onPress={() => { resetForm(); setIsCreateOpen(true); }}>
          <Plus size={14} color={colors.primaryText} />
          <Text style={styles.btnPrimaryText}>Create Case</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContainer} 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={colors.primary} />}
      >
        <View style={styles.filterCard}>
          <View style={styles.searchContainer}>
            <Search size={18} color={colors.textMuted} style={styles.searchIcon} />
            <TextInput style={styles.searchInput} placeholder="Search Cases..." placeholderTextColor={colors.placeholderText} value={searchQuery} onChangeText={setSearchQuery} />
          </View>
          <View style={styles.filterRow}>
            <TouchableOpacity style={styles.pickerTrigger} onPress={() => openPickerModal("type")}>
              <Text style={styles.pickerTriggerText}>{typeFilter === "all" ? "All Types" : typeFilter}</Text>
              <ChevronDown size={14} color={colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.pickerTrigger} onPress={() => openPickerModal("status")}>
              <Text style={styles.pickerTriggerText}>{statusFilter === "all" ? "All Statuses" : statusFilter}</Text>
              <ChevronDown size={14} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

       
        {loading ? <ActivityIndicator size="large" color={colors.primary} /> : filteredCases.length === 0 ? (
          <View style={styles.emptyContainer}><Text style={styles.emptyText}>No registered active legal litigations found matching selection values.</Text></View>
        ) : (
          filteredCases.map((item, index) => {
            const itemKey = item.id || item._id || `case-item-${index}`;
            const statePill = getStatusColor(item.status);
            return (
              <View key={itemKey} style={styles.itemCard}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.itemNumber}>{item.caseNumber}</Text>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statePill.bg, borderColor: statePill.text }]}>
                    <Text style={{ fontSize: 11, fontWeight: "600", color: statePill.text }}>{item.status || "Open"}</Text>
                  </View>
                </View>
                <View style={styles.cardDetailsGrid}>
                  <View style={styles.detailRow}><Text style={styles.detailLabel}>Client Name</Text><Text style={styles.detailText}>{item.clientName || "—"}</Text></View>
                  <View style={styles.detailRow}><Text style={styles.detailLabel}>Jurisdiction Court</Text><Text style={styles.detailText}>{item.court || "—"}</Text></View>
                  <View style={styles.detailRow}><Text style={styles.detailLabel}>Classification</Text><Text style={styles.detailText}>{item.caseType || "—"}</Text></View>
                </View>
                <View style={styles.cardActionsRow}>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => { setSelectedCase(item); setIsViewOpen(true); }}><Eye size={16} color={colors.textMuted} /><Text style={styles.actionBtnText}>View</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => openEdit(item)}><Edit size={16} color={colors.textMuted} /><Text style={styles.actionBtnText}>Edit</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => openDeleteConfirmation(item)}><Trash2 size={16} color={colors.dangerText} /><Text style={[styles.actionBtnText, { color: colors.dangerText }]}>Delete</Text></TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Dynamic Selection Picker Overlay */}
      <Modal visible={activePicker !== null} transparent animationType="fade" onRequestClose={() => setActivePicker(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setActivePicker(null)}>
          <View style={styles.pickerContentContainer}>
            <Text style={styles.pickerModalTitle}>Select Operational Configuration Value</Text>
            <ScrollView>
              {activePicker?.options.map((opt, idx) => (
                <TouchableOpacity 
                  key={idx} 
                  style={styles.pickerOptionItem} 
                  onPress={() => { 
                    if (activePicker.type === "type") setTypeFilter(opt.value);
                    else if (activePicker.type === "status") setStatusFilter(opt.value);
                    else if (activePicker.type === "form-type") setFormData({ ...formData, caseType: opt.value });
                    else if (activePicker.type === "form-status") setFormData({ ...formData, status: opt.value });
                    else if (activePicker.type === "form-priority") setFormData({ ...formData, priority: opt.value });
                    setActivePicker(null); 
                  }}
                >
                  <Text style={styles.pickerOptionText}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Case Overview Summary Inspection Sheet */}
      <Modal visible={isViewOpen} transparent animationType="slide" onRequestClose={() => setIsViewOpen(false)}>
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollFormContainer}>
            <View style={styles.modalHeaderRow}><Text style={styles.modalTitle}>Inspection Sheet Profile Summary</Text><TouchableOpacity onPress={() => setIsViewOpen(false)}><X size={20} color={colors.text} /></TouchableOpacity></View>
            {selectedCase && (
              <View style={{ gap: 14, marginVertical: 12 }}>
                <View style={styles.viewDetailGridBlock}><Text style={styles.viewBlockLabel}>Case Number Code</Text><Text style={styles.viewBlockValue}>{selectedCase.caseNumber}</Text></View>
                <View style={styles.viewDetailGridBlock}><Text style={styles.viewBlockLabel}>Title Context Label</Text><Text style={styles.viewBlockValue}>{selectedCase.title}</Text></View>
                <View style={styles.viewDetailGridBlock}><Text style={styles.viewBlockLabel}>Client Counterparty Identification</Text><Text style={styles.viewBlockValue}>{selectedCase.clientName || "—"}</Text></View>
                <View style={styles.viewDetailGridBlock}><Text style={styles.viewBlockLabel}>Litigation Classification Category</Text><Text style={styles.viewBlockValue}>{selectedCase.caseType}</Text></View>
                <View style={styles.viewDetailGridBlock}><Text style={styles.viewBlockLabel}>Core Status Flag</Text><Text style={styles.viewBlockValue}>{selectedCase.status}</Text></View>
                <View style={styles.viewDetailGridBlock}><Text style={styles.viewBlockLabel}>Urgency Priority Grade</Text><Text style={styles.viewBlockValue}>{selectedCase.priority}</Text></View>
                <View style={styles.viewDetailGridBlock}><Text style={styles.viewBlockLabel}>Target Jurisdiction Bench</Text><Text style={styles.viewBlockValue}>{selectedCase.court || "—"}</Text></View>
                <View style={styles.viewDetailGridBlock}><Text style={styles.viewBlockLabel}>Structural Log Date</Text><Text style={styles.viewBlockValue}>{selectedCase.filingDate ? selectedCase.filingDate.split("T")[0] : "—"}</Text></View>
                {selectedCase.description ? <View style={styles.viewDetailGridBlock}><Text style={styles.viewBlockLabel}>Dossier Case Briefing Text</Text><Text style={styles.viewNotesBox}>{selectedCase.description}</Text></View> : null}
              </View>
            )}
            <TouchableOpacity style={styles.btnPrimary} onPress={() => setIsViewOpen(false)}><Text style={styles.btnPrimaryText}>Dismiss Profile Review</Text></TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Case Mutator Editor Form Workspace */}
      <Modal visible={isCreateOpen || isEditOpen} transparent animationType="slide" onRequestClose={() => { setIsCreateOpen(false); setIsEditOpen(false); }}>
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollFormContainer}>
            <View style={styles.modalHeaderRow}><Text style={styles.modalTitle}>{isCreateOpen ? "Initialize Litigation Record" : "Edit Parameter Configurations"}</Text><TouchableOpacity onPress={() => { setIsCreateOpen(false); setIsEditOpen(false); }}><X size={20} color={colors.text} /></TouchableOpacity></View>
            
            <Text style={styles.fieldLabel}>Case Number Code Reference *</Text>
            <TextInput style={styles.modalInput} value={formData.caseNumber} onChangeText={(text) => setFormData({ ...formData, caseNumber: text })} placeholder="e.g., CASE-2026-884" placeholderTextColor={colors.placeholderText} />
            
            <Text style={styles.fieldLabel}>Title Header Context *</Text>
            <TextInput style={styles.modalInput} value={formData.title} onChangeText={(text) => setFormData({ ...formData, title: text })} placeholder="Structural legal descriptive title" placeholderTextColor={colors.placeholderText} />
            
            <Text style={styles.fieldLabel}>Client Corporate Identity Name</Text>
            <TextInput style={styles.modalInput} value={formData.clientName} onChangeText={(text) => setFormData({ ...formData, clientName: text })} placeholder="Associated client metadata tag" placeholderTextColor={colors.placeholderText} />

            <Text style={styles.fieldLabel}>Classification Structural Category</Text>
            <TouchableOpacity style={styles.pickerTrigger} onPress={() => openPickerModal("form-type")}><Text style={styles.pickerTriggerText}>{formData.caseType}</Text><ChevronDown size={14} color={colors.textMuted} /></TouchableOpacity>

            <Text style={styles.fieldLabel}>Current Operation Status Tracker</Text>
            <TouchableOpacity style={styles.pickerTrigger} onPress={() => openPickerModal("form-status")}><Text style={styles.pickerTriggerText}>{formData.status}</Text><ChevronDown size={14} color={colors.textMuted} /></TouchableOpacity>

            <Text style={styles.fieldLabel}>Urgency Priority Metric Grade</Text>
            <TouchableOpacity style={styles.pickerTrigger} onPress={() => openPickerModal("form-priority")}><Text style={styles.pickerTriggerText}>{formData.priority}</Text><ChevronDown size={14} color={colors.textMuted} /></TouchableOpacity>

            <Text style={styles.fieldLabel}>Target Jurisdiction Bench / Court</Text>
            <TextInput style={styles.modalInput} value={formData.court} onChangeText={(text) => setFormData({ ...formData, court: text })} placeholder="e.g., Supreme Appellate Bench Division V" placeholderTextColor={colors.placeholderText} />

            <Text style={styles.fieldLabel}>Filing Date (YYYY-MM-DD)</Text>
            <TextInput style={styles.modalInput} value={formData.filingDate} onChangeText={(text) => setFormData({ ...formData, filingDate: text })} placeholder="e.g., 2026-07-06" placeholderTextColor={colors.placeholderText} />

            <Text style={styles.fieldLabel}>Dossier Case Briefing Text Summaries</Text>
            <TextInput style={[styles.modalInput, styles.textAreaInput]} multiline numberOfLines={3} value={formData.description} onChangeText={(text) => setFormData({ ...formData, description: text })} placeholder="Contextual parameters, case historical notes descriptions..." placeholderTextColor={colors.placeholderText} />
            
            <View style={styles.modalFooter}>
              <TouchableOpacity style={[styles.btn, styles.btnOutline]} onPress={() => { setIsCreateOpen(false); setIsEditOpen(false); }}><Text style={styles.btnOutlineText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.btnPrimary, { marginTop: 0 }]} disabled={isSubmitting} onPress={isCreateOpen ? handleCreate : handleUpdate}>{isSubmitting ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.btnPrimaryText}>Save Litigation File</Text>}</TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}