import React, { useState, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Dimensions,
  Platform,
  StatusBar,
  Alert,
  Modal,
  KeyboardAvoidingView
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";
import {
  FileText,
  UploadCloud,
  Trash2,
  Download,
  Search,
  Grid,
  List,
  X,
  ChevronDown
} from "lucide-react-native";
import { useAuth } from "../../../contexts/AuthContext";
import { useTheme } from "../../../contexts/ThemeContext";
import { apiRequest } from "../../../services/api";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const GRID_CARD_WIDTH = (SCREEN_WIDTH - 40) / 2;

export interface CRMFile {
  id: string;
  _id?: string;
  fileName: string;
  originalName?: string;
  type: string;
  size: number;
  fileSize?: string;
  linkedContact: string;
  linkedDeal: string;
  uploadedBy: string;
  date: string;
}

interface ContactLookup {
  id: string;
  name: string;
}

interface DealLookup {
  id: string;
  name: string;
}

interface WrappedResponse {
  success: boolean;
  data?: {
    items?: any[];
  };
}

type ApiResponse = WrappedResponse | any;

const TYPE_OPTIONS = ["All", "Contract", "Proposal", "Invoice", "Other"];

const TYPE_CONFIG: Record<string, { bg: string; txt: string; border: string; dot: string }> = {
  Contract: { bg: "rgba(139, 92, 246, 0.15)", txt: "#c4b5fd", border: "rgba(139, 92, 246, 0.3)", dot: "#a78bfa" },
  Proposal: { bg: "rgba(56, 189, 248, 0.15)", txt: "#7dd3fc", border: "rgba(56, 189, 248, 0.3)", dot: "#38bdf8" },
  Invoice: { bg: "rgba(16, 185, 129, 0.15)", txt: "#6ee7b7", border: "rgba(16, 185, 129, 0.3)", dot: "#34d399" },
  Other: { bg: "rgba(148, 163, 184, 0.15)", txt: "#94a3b8", border: "rgba(148, 163, 184, 0.3)", dot: "#64748b" }
};

function formatFileSize(sizeInBytes: number) {
  if (typeof sizeInBytes !== "number" || isNaN(sizeInBytes)) return "0 MB";
  const size = sizeInBytes / 1024 / 1024;
  return size < 1 ? `${(sizeInBytes / 1024).toFixed(1)} KB` : `${size.toFixed(1)} MB`;
}

function formatDate(dateStr: string) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function CRMFiles() {
  const queryClient = useQueryClient();
  const auth = useAuth();
  const { uiTheme } = useTheme();

  const isMetallic = uiTheme?.theme === "metallic-elite";

  const colors = useMemo(() => {
    const isDark = (uiTheme?.theme as string) === "dark" || isMetallic;
    return {
      background: uiTheme?.panelColors?.dashboardBackground || (isDark ? "#080a0f" : "#f8fafc"),
      cardBg: uiTheme?.panelColors?.dashboardCardBackground || (isDark ? "#0f1117" : "#ffffff"),
      text: uiTheme?.panelColors?.dashboardTextColor || (isDark ? "#ffffff" : "#0f172a"),
      muted: isDark ? "rgba(255,255,255,0.4)" : "#64748b",
      border: uiTheme?.panelColors?.dashboardBackground || (isDark ? "rgba(255,255,255,0.08)" : "#e2e8f0"),
      inputBg: isDark ? "#020617" : "#ffffff",
      inputBorder: isDark ? "rgba(255,255,255,0.1)" : "#cbd5e1",
      primary: uiTheme?.customColors?.primary || "#7c3aed"
    };
  }, [uiTheme, isMetallic]);

  const styles = useMemo(() => createStyles(colors), [colors]);

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [targetFileId, setTargetFileId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<CRMFile | null>(null);

  const [formData, setFormData] = useState({
    type: "Contract",
    linkedContact: "",
    linkedDeal: "",
    date: new Date().toISOString().slice(0, 10),
    fileName: "",
    sizeInBytes: "1048576"
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [typeSelectorOpen, setTypeSelectorOpen] = useState(false);
  const [contactSelectorOpen, setContactSelectorOpen] = useState(false);
  const [dealSelectorOpen, setDealSelectorOpen] = useState(false);
  const [typeFilterDropdownOpen, setTypeFilterDropdownOpen] = useState(false);

  const filesQuery = useQuery({
    queryKey: ["crm-files"],
    queryFn: async () => await apiRequest("/crm-files", { method: "GET" }) as ApiResponse
  });

  const contactsQuery = useQuery({
    queryKey: ["crm-contacts-lookup"],
    queryFn: async () => await apiRequest("/crm-contacts", { method: "GET" }) as ApiResponse
  });

  const dealsQuery = useQuery({
    queryKey: ["crm-deals-lookup"],
    queryFn: async () => await apiRequest("/crm-deals", { method: "GET" }) as ApiResponse
  });

  const files = useMemo(() => {
    const items = filesQuery.data?.data?.items || filesQuery.data?.items || [];
    return items.map((f: any) => ({
      ...f,
      id: f.id || f._id,
      fileSize: formatFileSize(f.size)
    }));
  }, [filesQuery.data]);

  const contacts = (contactsQuery.data?.data?.items || contactsQuery.data?.items || []) as ContactLookup[];
  const deals = (dealsQuery.data?.data?.items || dealsQuery.data?.items || []) as DealLookup[];

  const uploadMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await apiRequest("/crm-files/upload", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-files"] });
      setShowUploadModal(false);
    },
    borderColor: "rgba(239,68,68,0.4)"
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/crm-files/${encodeURIComponent(id)}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-files"] });
      setShowDeleteModal(false);
      setTargetFileId(null);
    }
  });

  const filteredFiles = useMemo(() => {
    return files.filter((f: CRMFile) => {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        f.fileName?.toLowerCase().includes(q) ||
        f.linkedContact?.toLowerCase().includes(q) ||
        f.linkedDeal?.toLowerCase().includes(q) ||
        f.uploadedBy?.toLowerCase().includes(q);
      
      const matchType = typeFilter === "All" || f.type === typeFilter;
      return matchSearch && matchType;
    });
  }, [files, searchQuery, typeFilter]);

  const fileStats = useMemo(() => {
    const totalBytes = files.reduce((s: number, f: CRMFile) => s + (typeof f.size === "number" ? f.size : 0), 0);
    return {
      totalFiles: files.length,
      totalSize: formatFileSize(totalBytes),
      contractsCount: files.filter((f: CRMFile) => f.type === "Contract").length,
      proposalsCount: files.filter((f: CRMFile) => f.type === "Proposal").length,
      invoicesCount: files.filter((f: CRMFile) => f.type === "Invoice").length
    };
  }, [files]);

  const handleDeviceDocumentSelection = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const pickedAsset = result.assets[0];
        setFormData({
          ...formData,
          fileName: pickedAsset.name,
          sizeInBytes: (pickedAsset.size || 1048576).toString()
        });
      }
    } catch (err) {
      Alert.alert("Picker Error", "Could not load the native application interface context.");
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.fileName.trim()) errors.file = "Please select a file using the native manager system";
    if (!formData.linkedContact.trim() && !formData.linkedDeal.trim()) {
      errors.linkedContact = "Link document to at least a contact or deal parameter context";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleUploadSubmit = () => {
    if (!validateForm()) return;
    uploadMutation.mutate({
      fileName: formData.fileName.trim(),
      type: formData.type,
      linkedContact: formData.linkedContact,
      linkedDeal: formData.linkedDeal,
      date: new Date(formData.date).toISOString(),
      size: Number(formData.sizeInBytes) || 1048576,
      uploadedBy: "System Account"
    });
  };

  const simulateDownload = (file: CRMFile) => {
    Alert.alert("Document Stream", `Downloading signature binary: ${file.fileName}`);
  };

  if (filesQuery.isLoading) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading documents…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" />

      <View style={styles.headerRow}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={styles.headerTitle}>Client Documents</Text>
          <Text style={styles.headerSubtitle}>Securely manage contracts, proposals & invoices</Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.uploadButton, { backgroundColor: colors.primary }]}
          onPress={() => {
            setFormData({
              type: "Contract",
              linkedContact: "",
              linkedDeal: "",
              date: new Date().toISOString().slice(0, 10),
              fileName: "",
              sizeInBytes: "1048576"
            });
            setFormErrors({});
            setShowUploadModal(true);
          }}
        >
          <UploadCloud size={14} color="#080a0f" style={{ marginRight: 4 }} />
          <Text style={styles.uploadButtonText}>Upload File</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsGrid}>
          {[
            { label: "Total Files", val: fileStats.totalFiles, color: colors.text },
            { label: "Total Size", val: fileStats.totalSize, color: "#38bdf8" },
            { label: "Contracts", val: fileStats.contractsCount, color: "#a78bfa" },
            { label: "Proposals", val: fileStats.proposalsCount, color: "#38bdf8" },
            { label: "Invoices", val: fileStats.invoicesCount, color: "#34d399" }
          ].map((item, idx) => (
            <View key={idx} style={[styles.statCard, { borderColor: colors.border }]}>
              <Text style={styles.statLabel}>{item.label}</Text>
              <Text style={[styles.statValue, { color: item.color }]}>{item.val}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.filterWorkspaceBlock}>
          <View style={styles.searchBarWrapper}>
            <Search size={14} color={colors.muted} />
            <TextInput
              placeholder="Search files, contacts, deals…"
              placeholderTextColor={colors.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchInput}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <X size={14} color={colors.text} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.filterActionItemsBarFlexRow}>
            <TouchableOpacity style={[styles.filterSelectorDropdownAnchor, { borderColor: colors.border }]} onPress={() => setTypeFilterDropdownOpen(true)}>
              <Text style={styles.filterSelectorDropdownText} numberOfLines={1}>
                {typeFilter}
              </Text>
              <ChevronDown size={12} color={colors.text} />
            </TouchableOpacity>

            <View style={[styles.viewToggleGroupContainer, { borderColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.viewToggleBtn, viewMode === "table" && { backgroundColor: colors.primary }]}
                onPress={() => setViewMode("table")}
              >
                <List size={14} color={viewMode === "table" ? "#080a0f" : colors.text} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.viewToggleBtn, viewMode === "grid" && { backgroundColor: colors.primary }]}
                onPress={() => setViewMode("grid")}
              >
                <Grid size={14} color={viewMode === "grid" ? "#080a0f" : colors.text} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.documentsDisplayTargetContainer}>
          {filteredFiles.length === 0 ? (
            <View style={[styles.emptyCardContainer, { borderColor: colors.border }]}>
              <FileText size={28} color={colors.muted} />
              <Text style={styles.emptyCardPrimaryText}>No files found</Text>
              <Text style={styles.emptyCardSecondaryText}>Adjust your filters or upload a new document</Text>
            </View>
          ) : viewMode === "table" ? (
            filteredFiles.map((file: CRMFile) => {
              const cfg = TYPE_CONFIG[file.type] || TYPE_CONFIG.Other;
              return (
                <TouchableOpacity
                  key={file.id}
                  style={[styles.rowListCard, { borderColor: colors.border }]}
                  activeOpacity={0.9}
                  onPress={() => { setSelectedFile(file); setShowPreviewModal(true); }}
                >
                  <View style={styles.rowCardTopLineInlineFlex}>
                    <FileText size={16} color={cfg.dot} style={{ marginRight: 8, marginTop: 1 }} />
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.rowCardTitleText} numberOfLines={1}>{file.fileName}</Text>
                      <Text style={styles.rowCardSubMetaBreadcrumbLabelString} numberOfLines={1}>
                        {file.linkedContact || "—"} • {file.linkedDeal || "—"}
                      </Text>
                    </View>
                    <View style={[styles.badgeContainerFrame, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
                      <View style={[styles.badgeDotIndicator, { backgroundColor: cfg.dot }]} />
                      <Text style={[styles.badgeLabelStringText, { color: cfg.txt }]}>{file.type}</Text>
                    </View>
                  </View>

                  <View style={styles.rowCardDetailsInfoMatrixFlexLine}>
                    <Text style={styles.rowCardDetailsInfoTextNode}>{formatDate(file.date)}</Text>
                    <Text style={styles.rowCardDetailsInfoTextNode}>{file.fileSize}</Text>
                  </View>

                  <View style={styles.rowCardFooterActionsLine}>
                    <TouchableOpacity style={[styles.rowCardFooterInlineActionBtn, { borderColor: colors.border }]} onPress={() => simulateDownload(file)}>
                      <Download size={11} color={colors.text} style={{ marginRight: 4 }} />
                      <Text style={styles.rowCardFooterInlineActionBtnLabel}>Download</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.rowCardFooterInlineActionBtn, { borderColor: "rgba(239,68,68,0.2)", backgroundColor: "rgba(239,68,68,0.02)" }]} onPress={() => { setTargetFileId(file.id); setShowDeleteModal(true); }}>
                      <Trash2 size={11} color="#ef4444" style={{ marginRight: 4 }} />
                      <Text style={[styles.rowCardFooterInlineActionBtnLabel, { color: "#ef4444" }]}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.gridContainerMatrix}>
              {filteredFiles.map((file: CRMFile) => {
                const cfg = TYPE_CONFIG[file.type] || TYPE_CONFIG.Other;
                return (
                  <TouchableOpacity
                    key={file.id}
                    style={[styles.matrixCardCell, { borderColor: colors.border }]}
                    activeOpacity={0.9}
                    onPress={() => { setSelectedFile(file); setShowPreviewModal(true); }}
                  >
                    <View style={styles.matrixCardHeaderBlockInlineFlex}>
                      <View style={[styles.matrixCardHeaderIconContainerWell, { backgroundColor: cfg.bg }]}>
                        <FileText size={14} color={cfg.dot} />
                      </View>
                      <View style={[styles.badgeContainerFrame, { backgroundColor: cfg.bg, borderColor: cfg.border, height: 18 }]}>
                        <Text style={[styles.badgeLabelStringText, { color: cfg.txt, fontSize: 8 }]}>{file.type}</Text>
                      </View>
                    </View>

                    <Text style={styles.gridCardTitleText} numberOfLines={1}>{file.fileName}</Text>
                    <Text style={styles.gridCardSizeStringText}>{file.fileSize || "0 MB"}</Text>

                    <View style={styles.gridCardMetaRelationshipsLayoutBox}>
                      <Text style={styles.gridCardRelationshipTextLabel} numberOfLines={1}>
                        👤 {file.linkedContact || "—"}
                      </Text>
                      <Text style={styles.gridCardRelationshipTextLabel} numberOfLines={1}>
                        💼 {file.linkedDeal || "—"}
                      </Text>
                    </View>

                    <View style={styles.gridCardActionsFlexInlineBar}>
                      <TouchableOpacity style={[styles.rowCardFooterInlineActionBtn, { flex: 1, paddingVertical: 4 }]} onPress={() => simulateDownload(file)}>
                        <Text style={styles.rowCardFooterInlineActionBtnLabel}>Download</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.rowCardFooterInlineActionBtn, { flex: 1, paddingVertical: 4, borderColor: "rgba(239,68,68,0.2)" }]} onPress={() => { setTargetFileId(file.id); setShowDeleteModal(true); }}>
                        <Text style={[styles.rowCardFooterInlineActionBtnLabel, { color: "#ef4444" }]}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal visible={showUploadModal} animationType="slide" transparent>
        <View style={styles.modalOverlayMaskContainer}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={[styles.modalLayoutCard, { borderColor: colors.border }]}>
            <View style={styles.modalHeaderTopBarFlexRow}>
              <Text style={styles.modalHeadingTitleText}>Upload Document</Text>
              <TouchableOpacity onPress={() => setShowUploadModal(false)} style={styles.modalCloseCircleAnchorBtn}>
                <X size={16} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <TouchableOpacity 
                activeOpacity={0.7}
                style={[styles.mockUploadBoxZone, { borderColor: colors.primary }]}
                onPress={handleDeviceDocumentSelection}
              >
                <UploadCloud size={24} color={colors.primary} style={{ marginBottom: 6 }} />
                <Text style={styles.mockUploadZonePromptLabel}>Click to select file from storage</Text>
                <Text style={styles.mockUploadZoneSecondaryDisclaimer}>Opens the native Files explorer app tree bundle</Text>
              </TouchableOpacity>

              <Text style={styles.formInputLabelDisplay}>File Name *</Text>
              <TextInput
                value={formData.fileName}
                onChangeText={t => setFormData({ ...formData, fileName: t })}
                placeholder="No document context initialized yet"
                placeholderTextColor={colors.muted}
                style={[styles.formInputTextNodeField, formErrors.file ? { borderColor: "rgba(239,68,68,0.4)" } : { borderColor: colors.inputBorder }]}
              />
              {formErrors.file ? <Text style={styles.formValidationErrorMessageText}>{formErrors.file}</Text> : null}

              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formInputLabelDisplay}>Type</Text>
                  <TouchableOpacity style={[styles.customDropdownTriggerBoxAnchor, { borderColor: colors.inputBorder }]} onPress={() => setTypeSelectorOpen(true)}>
                    <Text style={styles.customDropdownTriggerDisplayValueText}>{formData.type}</Text>
                    <ChevronDown size={14} color={colors.text} />
                  </TouchableOpacity>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.formInputLabelDisplay}>Date String</Text>
                  <TextInput
                    value={formData.date}
                    onChangeText={t => setFormData({ ...formData, date: t })}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.muted}
                    style={[styles.formInputTextNodeField, { borderColor: colors.inputBorder }]}
                  />
                </View>
              </View>

              <Text style={styles.formInputLabelDisplay}>Linked Contact Context *</Text>
              <TouchableOpacity style={[styles.customDropdownTriggerBoxAnchor, { borderColor: colors.inputBorder }, formErrors.linkedContact ? { borderColor: "rgba(239,68,68,0.4)" } : {}]} onPress={() => setContactSelectorOpen(true)}>
                <Text style={styles.customDropdownTriggerDisplayValueText}>{formData.linkedContact || "Select associated contact record"}</Text>
                <ChevronDown size={14} color={colors.text} />
              </TouchableOpacity>
              {formErrors.linkedContact ? <Text style={styles.formValidationErrorMessageText}>{formErrors.linkedContact}</Text> : null}

              <Text style={styles.formInputLabelDisplay}>Linked Deal Pipeline Reference</Text>
              <TouchableOpacity style={[styles.customDropdownTriggerBoxAnchor, { borderColor: colors.inputBorder }]} onPress={() => setDealSelectorOpen(true)}>
                <Text style={styles.customDropdownTriggerDisplayValueText}>{formData.linkedDeal || "Select associated corporate pipeline"}</Text>
                <ChevronDown size={14} color={colors.text} />
              </TouchableOpacity>

              <Text style={styles.formInputLabelDisplay}>Document Storage Size (Bytes)</Text>
              <TextInput
                value={formData.sizeInBytes}
                onChangeText={t => setFormData({ ...formData, sizeInBytes: t })}
                keyboardType="numeric"
                editable={false}
                style={[styles.formInputTextNodeField, { borderColor: colors.inputBorder, opacity: 0.6 }]}
              />
            </ScrollView>

            <View style={styles.modalFooterActionsBlockInlineRow}>
              <TouchableOpacity style={styles.modalCancelBtnAnchor} onPress={() => setShowUploadModal(false)}>
                <Text style={styles.modalCancelBtnLabelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalSubmitBtnAnchor, { backgroundColor: colors.primary }]} onPress={handleUploadSubmit}>
                <Text style={styles.modalSubmitBtnLabelText}>
                  {uploadMutation.isPending ? "Syncing…" : "Upload File"}
                </Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal visible={showPreviewModal} transparent animationType="fade">
        <View style={styles.modalOverlayMaskContainer}>
          {selectedFile ? (
            <View style={[styles.modalLayoutCard, { borderColor: colors.border }]}>
              <View style={styles.modalHeaderTopBarFlexRow}>
                <Text style={styles.modalHeadingTitleText}>Document Details</Text>
                <TouchableOpacity onPress={() => setShowPreviewModal(false)} style={styles.modalCloseCircleAnchorBtn}>
                  <X size={16} color={colors.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.previewModalHeaderHeroWell}>
                <View style={[styles.matrixCardHeaderIconContainerWell, { width: 44, height: 44, borderRadius: 12, backgroundColor: TYPE_CONFIG[selectedFile.type]?.bg || "rgba(255,255,255,0.05)" }]}>
                  <FileText size={20} color={TYPE_CONFIG[selectedFile.type]?.dot || colors.text} />
                </View>
                <Text style={styles.previewHeroFileNameLabelDisplayText} numberOfLines={1}>{selectedFile.fileName}</Text>
                <Text style={styles.previewHeroFileSizeSubLabelText}>{selectedFile.fileSize || "0 MB"}</Text>
                
                <TouchableOpacity style={[styles.rowCardFooterInlineActionBtn, { height: 32, paddingHorizontal: 16, marginTop: 4 }]} onPress={() => simulateDownload(selectedFile)}>
                  <Download size={12} color={colors.text} style={{ marginRight: 6 }} />
                  <Text style={styles.rowCardFooterInlineActionBtnLabel}>Download Document</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.detailsModalFieldsMatrixGridGrid}>
                <View style={[styles.detailsModalFieldBlockBoxWell, { borderColor: colors.border }]}>
                  <Text style={styles.detailsModalFieldBlockBoxLabelTitle}>Document Type</Text>
                  <Text style={styles.detailsModalFieldBlockBoxValueString}>{selectedFile.type}</Text>
                </View>
                <View style={[styles.detailsModalFieldBlockBoxWell, { borderColor: colors.border }]}>
                  <Text style={styles.detailsModalFieldBlockBoxLabelTitle}>Timestamp Bound</Text>
                  <Text style={styles.detailsModalFieldBlockBoxValueString}>{formatDate(selectedFile.date)}</Text>
                </View>
                <View style={[styles.detailsModalFieldBlockBoxWell, { borderColor: colors.border }]}>
                  <Text style={styles.detailsModalFieldBlockBoxLabelTitle}>Contact Context</Text>
                  <Text style={styles.detailsModalFieldBlockBoxValueString} numberOfLines={1}>{selectedFile.linkedContact || "—"}</Text>
                </View>
                <View style={[styles.detailsModalFieldBlockBoxWell, { borderColor: colors.border }]}>
                  <Text style={styles.detailsModalFieldBlockBoxLabelTitle}>Deal Assignment</Text>
                  <Text style={styles.detailsModalFieldBlockBoxValueString} numberOfLines={1}>{selectedFile.linkedDeal || "—"}</Text>
                </View>
              </View>

              <View style={styles.modalFooterActionsBlockInlineRow}>
                <TouchableOpacity style={styles.modalCancelBtnAnchor} onPress={() => setShowPreviewModal(false)}>
                  <Text style={styles.modalCancelBtnLabelText}>Close</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalSubmitBtnAnchor, { backgroundColor: "#ef4444" }]} onPress={() => { setShowPreviewModal(false); setTargetFileId(selectedFile.id); setShowDeleteModal(true); }}>
                  <Text style={[styles.modalSubmitBtnLabelText, { color: "#ffffff", fontWeight: "700" }]}>Delete File</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </View>
      </Modal>

      <Modal visible={showDeleteModal} transparent animationType="fade">
        <View style={styles.modalOverlayMaskContainer}>
          <View style={[styles.modalLayoutCard, { borderColor: colors.border, maxWidth: 300, alignItems: "center", padding: 20 }]}>
            <Text style={styles.deleteModalHeaderPromptLabelTitle}>Delete this file?</Text>
            <Text style={styles.deleteModalSubtitleDisclaimerParagraph}>This action is permanent and cannot be undone.</Text>
            
            <View style={[styles.modalFooterActionsBlockInlineRow, { width: "100%", marginTop: 12 }]}>
              <TouchableOpacity style={styles.modalCancelBtnAnchor} onPress={() => setShowDeleteModal(false)}>
                <Text style={styles.modalCancelBtnLabelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalSubmitBtnAnchor, { backgroundColor: "#ef4444" }]} onPress={() => targetFileId && deleteMutation.mutate(targetFileId)}>
                <Text style={[styles.modalSubmitBtnLabelText, { color: "#ffffff" }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={typeFilterDropdownOpen} transparent animationType="fade">
        <TouchableOpacity style={styles.sheetBackdropTouchWindowOverlay} activeOpacity={1} onPress={() => setTypeFilterDropdownOpen(false)}>
          <View style={[styles.sheetDropdownContentWrapperCard, { borderColor: colors.primary }]}>
            <Text style={styles.sheetDropdownPanelHeaderLabelTitle}>Filter By Type</Text>
            {TYPE_OPTIONS.map(opt => (
              <TouchableOpacity key={opt} style={styles.sheetDropdownItemRowTouchTrack} onPress={() => { setTypeFilter(opt); setTypeFilterDropdownOpen(false); }}>
                <Text style={styles.sheetDropdownItemRowDisplayTextLabel}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={typeSelectorOpen} transparent animationType="fade">
        <TouchableOpacity style={styles.sheetBackdropTouchWindowOverlay} activeOpacity={1} onPress={() => setTypeSelectorOpen(false)}>
          <View style={[styles.sheetDropdownContentWrapperCard, { borderColor: colors.primary }]}>
            <Text style={styles.sheetDropdownPanelHeaderLabelTitle}>Select Document Category</Text>
            {TYPE_OPTIONS.filter(o => o !== "All").map(opt => (
              <TouchableOpacity key={opt} style={styles.sheetDropdownItemRowTouchTrack} onPress={() => { setFormData({ ...formData, type: opt }); setTypeSelectorOpen(false); }}>
                <Text style={styles.sheetDropdownItemRowDisplayTextLabel}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={contactSelectorOpen} transparent animationType="fade">
        <TouchableOpacity style={styles.sheetBackdropTouchWindowOverlay} activeOpacity={1} onPress={() => setContactSelectorOpen(false)}>
          <View style={[styles.sheetDropdownContentWrapperCard, { borderColor: colors.primary }]}>
            <Text style={styles.sheetDropdownPanelHeaderLabelTitle}>Select Contact Context</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <TouchableOpacity style={styles.sheetDropdownItemRowTouchTrack} onPress={() => { setFormData({ ...formData, linkedContact: "" }); setContactSelectorOpen(false); }}>
                <Text style={styles.sheetDropdownItemRowDisplayTextLabel}>None (Clear relationship link)</Text>
              </TouchableOpacity>
              {contacts.map(c => (
                <TouchableOpacity key={c.id} style={styles.sheetDropdownItemRowTouchTrack} onPress={() => { setFormData({ ...formData, linkedContact: c.name }); setContactSelectorOpen(false); }}>
                  <Text style={styles.sheetDropdownItemRowDisplayTextLabel}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={dealSelectorOpen} transparent animationType="fade">
        <TouchableOpacity style={styles.sheetBackdropTouchWindowOverlay} activeOpacity={1} onPress={() => setDealSelectorOpen(false)}>
          <View style={[styles.sheetDropdownContentWrapperCard, { borderColor: colors.primary }]}>
            <Text style={styles.sheetDropdownPanelHeaderLabelTitle}>Select Linked Deal</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <TouchableOpacity style={styles.sheetDropdownItemRowTouchTrack} onPress={() => { setFormData({ ...formData, linkedDeal: "" }); setDealSelectorOpen(false); }}>
                <Text style={styles.sheetDropdownItemRowDisplayTextLabel}>None (Clear relationship link)</Text>
              </TouchableOpacity>
              {deals.map(d => (
                <TouchableOpacity key={d.id} style={styles.sheetDropdownItemRowTouchTrack} onPress={() => { setFormData({ ...formData, linkedDeal: d.name }); setDealSelectorOpen(false); }}>
                  <Text style={styles.sheetDropdownItemRowDisplayTextLabel}>{d.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background
  },
  centered: {
    justifyContent: "center",
    alignItems: "center"
  },
  loadingText: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 12,
    fontWeight: "600"
  },
  scrollContainer: {
    paddingHorizontal: 16,
    paddingBottom: 40
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderColor: colors.border
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: colors.text
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2
  },
  uploadButton: {
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center"
  },
  uploadButtonText: {
    color: "#080a0f",
    fontSize: 11,
    fontWeight: "900"
  },
  statsGrid: {
    paddingVertical: 14,
    gap: 8
  },
  statCard: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 96
  },
  statLabel: {
    fontSize: 9,
    color: colors.muted,
    textTransform: "uppercase",
    fontWeight: "700"
  },
  statValue: {
    fontSize: 18,
    fontWeight: "900",
    marginTop: 2
  },
  filterWorkspaceBlock: {
    backgroundColor: colors.cardBg,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
    marginBottom: 12
  },
  searchBarWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.15)",
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 38
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 12,
    paddingLeft: 6
  },
  filterActionItemsBarFlexRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8
  },
  filterSelectorDropdownAnchor: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.02)",
    borderWidth: 1,
    height: 30,
    borderRadius: 6,
    paddingHorizontal: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  filterSelectorDropdownText: {
    fontSize: 11,
    color: colors.text,
    fontWeight: "600"
  },
  viewToggleGroupContainer: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 6,
    overflow: "hidden"
  },
  viewToggleBtn: {
    width: 30,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.02)"
  },
  documentsDisplayTargetContainer: {
    marginTop: 4
  },
  emptyCardContainer: {
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    padding: 32,
    alignItems: "center",
    gap: 6
  },
  emptyCardPrimaryText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "800"
  },
  emptyCardSecondaryText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "500"
  },
  rowListCard: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12
  },
  rowCardTopLineInlineFlex: {
    flexDirection: "row",
    alignItems: "flex-start"
  },
  rowCardTitleText: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text
  },
  rowCardSubMetaBreadcrumbLabelString: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
    fontWeight: "500"
  },
  badgeContainerFrame: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    height: 20,
    borderRadius: 10,
    borderWidth: 1
  },
  badgeDotIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginRight: 4
  },
  badgeLabelStringText: {
    fontSize: 9,
    fontWeight: "800"
  },
  rowCardDetailsInfoMatrixFlexLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "rgba(0,0,0,0.12)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 12
  },
  rowCardDetailsInfoTextNode: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: "600"
  },
  rowCardFooterActionsLine: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 12,
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.03)",
    paddingTop: 10
  },
  rowCardFooterInlineActionBtn: {
    borderWidth: 1,
    paddingHorizontal: 10,
    height: 26,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center"
  },
  rowCardFooterInlineActionBtnLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.text
  },
  gridContainerMatrix: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  matrixCardCell: {
    width: GRID_CARD_WIDTH,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 2
  },
  matrixCardHeaderBlockInlineFlex: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8
  },
  matrixCardHeaderIconContainerWell: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center"
  },
  gridCardTitleText: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.text,
    marginTop: 2
  },
  gridCardSizeStringText: {
    fontSize: 10,
    color: colors.muted,
    fontWeight: "700",
    marginTop: 2
  },
  gridCardMetaRelationshipsLayoutBox: {
    marginVertical: 8,
    gap: 2,
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.03)",
    paddingTop: 6
  },
  gridCardRelationshipTextLabel: {
    fontSize: 10,
    color: colors.text,
    fontWeight: "500"
  },
  gridCardActionsFlexInlineBar: {
    flexDirection: "row",
    gap: 6,
    marginTop: 4
  },
  modalOverlayMaskContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16
  },
  modalLayoutCard: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    width: "100%",
    maxWidth: 340,
    maxHeight: "85%"
  },
  modalHeaderTopBarFlexRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 12
  },
  modalHeadingTitleText: {
    fontSize: 15,
    fontWeight: "900",
    color: colors.text
  },
  modalCloseCircleAnchorBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
    justifyContent: "center"
  },
  mockUploadBoxZone: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 18,
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.1)",
    marginBottom: 4
  },
  mockUploadZonePromptLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.text
  },
  mockUploadZoneSecondaryDisclaimer: {
    fontSize: 10,
    color: colors.muted,
    textAlign: "center",
    marginTop: 4
  },
  formInputLabelDisplay: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.muted,
    textTransform: "uppercase",
    marginBottom: 6,
    marginTop: 12
  },
  formInputTextNodeField: {
    backgroundColor: "rgba(0,0,0,0.2)",
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 8,
    color: colors.text,
    fontSize: 12
  },
  formValidationErrorMessageText: {
    fontSize: 10,
    color: "#ef4444",
    marginTop: 4,
    fontWeight: "600"
  },
  customDropdownTriggerBoxAnchor: {
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: "rgba(0,0,0,0.2)",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  customDropdownTriggerDisplayValueText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: "500",
    flex: 1
  },
  modalFooterActionsBlockInlineRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingTop: 12
  },
  modalCancelBtnAnchor: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
    height: 38,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center"
  },
  modalCancelBtnLabelText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700"
  },
  modalSubmitBtnAnchor: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center"
  },
  modalSubmitBtnLabelText: {
    color: "#080a0f",
    fontSize: 12,
    fontWeight: "900"
  },
  previewModalHeaderHeroWell: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.02)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 8
  },
  previewHeroFileNameLabelDisplayText: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text,
    marginTop: 8,
    textAlign: "center"
  },
  previewHeroFileSizeSubLabelText: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: "600",
    marginBottom: 8
  },
  detailsModalFieldsMatrixGridGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginVertical: 4
  },
  detailsModalFieldBlockBoxWell: {
    width: (340 - 42) / 2,
    backgroundColor: "rgba(0,0,0,0.08)",
    borderWidth: 1,
    borderRadius: 12,
    padding: 10
  },
  detailsModalFieldBlockBoxLabelTitle: {
    fontSize: 9,
    color: colors.muted,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  detailsModalFieldBlockBoxValueString: {
    fontSize: 12,
    color: colors.text,
    fontWeight: "700",
    marginTop: 3
  },
  deleteModalHeaderPromptLabelTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: colors.text,
    marginBottom: 4
  },
  deleteModalSubtitleDisclaimerParagraph: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: "500"
  },
  sheetBackdropTouchWindowOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center"
  },
  sheetDropdownContentWrapperCard: {
    width: SCREEN_WIDTH * 0.85,
    maxWidth: 310,
    maxHeight: 260,
    backgroundColor: colors.cardBg,
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 14
  },
  sheetDropdownPanelHeaderLabelTitle: {
    fontSize: 10,
    fontWeight: "900",
    color: colors.primary,
    textTransform: "uppercase",
    marginBottom: 10,
    letterSpacing: 0.5
  },
  sheetDropdownItemRowTouchTrack: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 4
  },
  sheetDropdownItemRowDisplayTextLabel: {
    fontSize: 12,
    color: colors.text,
    fontWeight: "500"
  }
});