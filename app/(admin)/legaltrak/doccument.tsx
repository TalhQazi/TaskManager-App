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
  FileText,
  ChevronDown,
  X,
  Paperclip,
  Download,
} from "lucide-react-native";
import * as DocumentPicker from "expo-document-picker";
import {
  createResource,
  deleteResource,
  listResource,
  updateResource,
} from "@/lib/admin/apiClient";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";

const { width } = Dimensions.get("window");

interface LegalDocument {
  id: string;
  _id?: string;
  documentNumber: string;
  title: string;
  description?: string;
  fileType: "PDF" | "Word" | "Excel" | "Image" | "Other" | string;
  caseReference?: string;
  status?: "Draft" | "Final" | "Filed" | string;
  author?: string;
  attachments?: Array<{ fileName: string; url: string; mimeType: string; size: number }>;
  createdAt?: string;
  updatedAt?: string;
}

interface ApiResponse {
  items?: LegalDocument[];
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
    attachmentRowItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "rgba(255,255,255,0.05)", padding: 10, borderRadius: 6, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", marginTop: 6 },
    attachmentTextLabel: { fontSize: 12, color: colors.textSecondary, flex: 1, paddingRight: 8 },
    attachmentRemoveLabel: { fontSize: 12, fontWeight: "600", color: "#EF4444" },
    attachmentDownloadContainer: { flexDirection: "row", alignItems: "center", gap: 4 },
    attachmentDownloadText: { fontSize: 12, fontWeight: "500", color: "#3B82F6" }
  });
}

export default function DocumentsScreen() {
  const { user } = useAuth();
  const { uiTheme } = useTheme();
  const isDark = (uiTheme.theme as string) === "dark" || (uiTheme.theme as string) === "metallic-elite";
  const colors = useMemo(() => buildColors(uiTheme, isDark), [uiTheme, isDark]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [itemsList, setItemsList] = useState<LegalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activePicker, setActivePicker] = useState<{ type: "fileType" | "status"; options: { label: string; value: string }[] } | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [selectedItem, setSelectedItem] = useState<LegalDocument | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    fileType: "PDF",
    caseReference: "",
    status: "Draft",
    author: "",
    attachments: [] as Array<{ fileName: string; url: string; mimeType: string; size: number }>,
  });

  const loadData = useCallback(async () => {
    try {
      const res = await listResource<ApiResponse | LegalDocument[]>("legal/documents");
      if (res && typeof res === "object" && "items" in res && Array.isArray(res.items)) {
        setItemsList(res.items);
      } else if (Array.isArray(res)) {
        setItemsList(res);
      } else {
        setItemsList([]);
      }
    } catch {
      Alert.alert("Error", "Failed to load documents from backend services.");
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
      fileType: "PDF",
      caseReference: "",
      status: "Draft",
      author: "",
      attachments: [],
    });
  };

  const handleAdd = async () => {
    if (!formData.title.trim()) {
      Alert.alert("Validation Error", "Title field is required.");
      return;
    }
    try {
      setIsSubmitting(true);
      const payload: any = { ...formData };
      Object.keys(payload).forEach((k) => { if (payload[k] === "") delete payload[k]; });
      await createResource<LegalDocument>("legal/documents", payload);
      setAddOpen(false);
      resetForm();
      loadData();
    } catch {
      Alert.alert("Error", "Failed to compile structure parameters inside database channels.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditOpen = (c: LegalDocument) => {
    setSelectedItem(c);
    setFormData({
      title: c.title || "",
      description: c.description || "",
      fileType: c.fileType || "PDF",
      caseReference: c.caseReference || "",
      status: c.status || "Draft",
      author: c.author || "",
      attachments: c.attachments || [],
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
      await updateResource<LegalDocument>("legal/documents", targetId, payload);
      setEditOpen(false);
      setSelectedItem(null);
      resetForm();
      loadData();
    } catch {
      Alert.alert("Error", "Failed to update target document record metrics safely.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDeleteConfirmation = (item: LegalDocument) => {
    const targetId = item.id || item._id || "";
    Alert.alert("Delete Document", `Are you sure you want to delete ${item.documentNumber}? This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete Permanently", style: "destructive", onPress: async () => {
          try {
            await deleteResource("legal/documents", targetId);
            loadData();
          } catch {
            Alert.alert("Error", "Cloud file repository structural exclusion mapping failed.");
          }
        }},
    ]);
  };

  const handleFileChange = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "*/*", multiple: true });
      if (result.canceled || !result.assets) return;

      setUploadingFiles(true);
      const newAtts = result.assets.map((file) => ({
        fileName: file.name,
        url: file.uri,
        mimeType: file.mimeType || "application/octet-stream",
        size: file.size || 0,
      }));

      setFormData((prev) => ({
        ...prev,
        attachments: [...(prev.attachments || []), ...newAtts],
      }));
    } catch {
      Alert.alert("Error", "Failed to process target device files local streams.");
    } finally {
      setUploadingFiles(false);
    }
  };

  const removeAttachment = (idx: number) => {
    setFormData((prev) => ({
      ...prev,
      attachments: (prev.attachments || []).filter((_, i) => i !== idx),
    }));
  };

  const openPickerModal = (type: "fileType" | "status") => {
    let options: { label: string; value: string }[] = [];
    if (type === "fileType") {
      options = [
        { label: "PDF", value: "PDF" },
        { label: "Word", value: "Word" },
        { label: "Excel", value: "Excel" },
        { label: "Image", value: "Image" },
        { label: "Other", value: "Other" },
      ];
    } else if (type === "status") {
      options = [
        { label: "Draft", value: "Draft" },
        { label: "Final", value: "Final" },
        { label: "Filed", value: "Filed" },
      ];
    }
    setActivePicker({ type, options });
  };

  const handlePickerSelect = (value: string) => {
    if (!activePicker) return;
    if (activePicker.type === "fileType") {
      setFormData({ ...formData, fileType: value });
    } else if (activePicker.type === "status") {
      setFormData({ ...formData, status: value });
    }
    setActivePicker(null);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Legal Documents</Text>
          <Text style={styles.headerSubtitle}>Manage your documents and associated metadata.</Text>
        </View>
        <TouchableOpacity style={[styles.btn, styles.btnPrimary, { marginTop: 8 }]} onPress={() => { resetForm(); setAddOpen(true); }}>
          <Plus size={14} color={colors.primaryText} />
          <Text style={styles.btnPrimaryText}>Add Document</Text>
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
            const itemKey = c.id || c._id || `doc-item-${index}`;
            return (
              <View key={itemKey} style={styles.itemCard}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.itemNumber}>{c.documentNumber}</Text>
                    <Text style={styles.itemTitle}>{c.title}</Text>
                  </View>
                  <View style={styles.statusBadge}><Text style={{ fontSize: 11, fontWeight: "600", color: colors.primary }}>{c.status || "Draft"}</Text></View>
                </View>
                <View style={styles.cardDetailsGrid}>
                  <View style={styles.detailRow}><Text style={styles.detailLabel}>File Type</Text><Text style={styles.detailText}>{c.fileType || "—"}</Text></View>
                  <View style={styles.detailRow}><Text style={styles.detailLabel}>Case Reference</Text><Text style={styles.detailText}>{c.caseReference || "—"}</Text></View>
                  <View style={styles.detailRow}><Text style={styles.detailLabel}>Author</Text><Text style={styles.detailText}>{c.author || "—"}</Text></View>
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
            <View style={styles.modalHeaderRow}><Text style={styles.modalTitle}>Document Details</Text><TouchableOpacity onPress={() => setViewOpen(false)}><X size={20} color={colors.text} /></TouchableOpacity></View>
            {selectedItem && (
              <View style={{ gap: 14, marginVertical: 12 }}>
                <View style={styles.viewDetailGridBlock}><Text style={styles.viewBlockLabel}>Document No.</Text><Text style={styles.viewBlockValue}>{selectedItem.documentNumber}</Text></View>
                <View style={styles.viewDetailGridBlock}><Text style={styles.viewBlockLabel}>Title</Text><Text style={styles.viewBlockValue}>{selectedItem.title || "N/A"}</Text></View>
                {selectedItem.description ? <View style={styles.viewDetailGridBlock}><Text style={styles.viewBlockLabel}>Description</Text><Text style={styles.viewNotesBox}>{selectedItem.description}</Text></View> : null}
                <View style={styles.viewDetailGridBlock}><Text style={styles.viewBlockLabel}>File Type</Text><Text style={styles.viewBlockValue}>{selectedItem.fileType || "N/A"}</Text></View>
                <View style={styles.viewDetailGridBlock}><Text style={styles.viewBlockLabel}>Case Reference</Text><Text style={styles.viewBlockValue}>{selectedItem.caseReference || "N/A"}</Text></View>
                <View style={styles.viewDetailGridBlock}><Text style={styles.viewBlockLabel}>Status</Text><Text style={styles.viewBlockValue}>{selectedItem.status || "N/A"}</Text></View>
                <View style={styles.viewDetailGridBlock}><Text style={styles.viewBlockLabel}>Author</Text><Text style={styles.viewBlockValue}>{selectedItem.author || "N/A"}</Text></View>
                
                {selectedItem.attachments && selectedItem.attachments.length > 0 && (
                  <View style={{ marginTop: 8 }}>
                    <Text style={[styles.viewBlockLabel, { marginBottom: 4 }]}><Paperclip size={12} color={colors.textMuted} /> Attachments</Text>
                    {selectedItem.attachments.map((att, idx) => (
                      <View key={idx} style={styles.attachmentRowItem}>
                        <Text numberOfLines={1} style={styles.attachmentTextLabel}>{att.fileName} ({att.size ? (att.size / 1024).toFixed(1) : 0} KB)</Text>
                        <TouchableOpacity style={styles.attachmentDownloadContainer}>
                          <Download size={14} color="#3B82F6" />
                          <Text style={styles.attachmentDownloadText}>Download</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
            <TouchableOpacity style={[styles.btn, styles.btnPrimary, { marginTop: 12 }]} onPress={() => setViewOpen(false)}><Text style={styles.btnPrimaryText}>Dismiss Inspector</Text></TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={addOpen || editOpen} transparent animationType="slide" onRequestClose={() => { setAddOpen(false); setEditOpen(false); }}>
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollFormContainer}>
            <View style={styles.modalHeaderRow}><Text style={styles.modalTitle}>{addOpen ? "Create New Document" : `Edit Document ${selectedItem?.documentNumber || ""}`}</Text><TouchableOpacity onPress={() => { setAddOpen(false); setEditOpen(false); }}><X size={20} color={colors.text} /></TouchableOpacity></View>
            <View style={{ gap: 12, marginVertical: 8 }}>
              <View><Text style={styles.fieldLabel}>Title *</Text><TextInput style={styles.modalInput} value={formData.title} onChangeText={(text) => setFormData({ ...formData, title: text })} placeholder="Title" placeholderTextColor={colors.placeholderText} /></View>
              <View><Text style={styles.fieldLabel}>Description</Text><TextInput style={[styles.modalInput, styles.textAreaInput]} multiline numberOfLines={3} value={formData.description} onChangeText={(text) => setFormData({ ...formData, description: text })} placeholder="Description..." placeholderTextColor={colors.placeholderText} /></View>
              <View><Text style={styles.fieldLabel}>File Type *</Text><TouchableOpacity style={styles.formPickerTrigger} onPress={() => openPickerModal("fileType")}><Text style={styles.formPickerTriggerText}>{formData.fileType}</Text><ChevronDown size={14} color={colors.textMuted} /></TouchableOpacity></View>
              <View><Text style={styles.fieldLabel}>Case Reference</Text><TextInput style={styles.modalInput} value={formData.caseReference} onChangeText={(text) => setFormData({ ...formData, caseReference: text })} placeholder="Case Reference" placeholderTextColor={colors.placeholderText} /></View>
              <View><Text style={styles.fieldLabel}>Status</Text><TouchableOpacity style={styles.formPickerTrigger} onPress={() => openPickerModal("status")}><Text style={styles.formPickerTriggerText}>{formData.status}</Text><ChevronDown size={14} color={colors.textMuted} /></TouchableOpacity></View>
              <View><Text style={styles.fieldLabel}>Author</Text><TextInput style={styles.modalInput} value={formData.author} onChangeText={(text) => setFormData({ ...formData, author: text })} placeholder="Author" placeholderTextColor={colors.placeholderText} /></View>
              
              <View style={{ borderTopWidth: 1, borderColor: colors.borderLight, paddingTop: 10, marginTop: 6 }}>
                <Text style={styles.fieldLabel}><Paperclip size={14} color={colors.textMuted} /> Attachments</Text>
                <TouchableOpacity style={[styles.btn, styles.btnOutline, { marginTop: 6, height: 36 }]} onPress={handleFileChange}>
                  <Text style={styles.btnOutlineText}>Attach Files</Text>
                </TouchableOpacity>
                {uploadingFiles && <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>Processing file attachments structural buffers...</Text>}
                
                {formData.attachments && formData.attachments.length > 0 && (
                  <View style={{ marginTop: 8 }}>
                    {formData.attachments.map((att, idx) => (
                      <View key={idx} style={styles.attachmentRowItem}>
                        <Text numberOfLines={1} style={styles.attachmentTextLabel}>{att.fileName} ({att.size ? (att.size / 1024).toFixed(1) : 0} KB)</Text>
                        <TouchableOpacity onPress={() => removeAttachment(idx)}>
                          <Text style={styles.attachmentRemoveLabel}>Remove</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={[styles.btn, styles.btnOutline]} onPress={() => { setAddOpen(false); setEditOpen(false); }}><Text style={styles.btnOutlineText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.btnPrimary]} disabled={isSubmitting || uploadingFiles} onPress={addOpen ? handleAdd : handleEdit}>{isSubmitting ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.btnPrimaryText}>{addOpen ? "Create Document" : "Save Changes"}</Text>}</TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}