import React, { useState, useEffect, useMemo } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  Dimensions,
} from "react-native";
import {
  Plus,
  Edit2,
  Trash2,
  FileText,
  Filter,
  X,
  ChevronDown,
} from "lucide-react-native";
import { apiFetch } from "@/lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";

interface PendingPatent {
  _id?: string;
  patentName: string;
  category: string;
  stage: "Concept" | "Research" | "Drafting" | "Ready to File";
  startDate: string;
  estimatedFilingDate: string;
  inventors: string[];
  notes?: string;
  createdAt?: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const getStageTheme = (stage: PendingPatent["stage"], isDark: boolean) => {
  switch (stage) {
    case "Concept":
      return { 
        bg: isDark ? "rgba(156, 163, 175, 0.15)" : "rgba(107, 114, 128, 0.1)", 
        text: isDark ? "#9ca3af" : "#374151", 
        border: isDark ? "rgba(156, 163, 175, 0.3)" : "#D1D5DB" 
      };
    case "Research":
      return { 
        bg: isDark ? "rgba(59, 130, 246, 0.15)" : "rgba(59, 130, 246, 0.1)", 
        text: isDark ? "#60a5fa" : "#1D4ED8", 
        border: isDark ? "rgba(59, 130, 246, 0.3)" : "#93C5FD" 
      };
    case "Drafting":
      return { 
        bg: isDark ? "rgba(168, 85, 247, 0.15)" : "rgba(168, 85, 247, 0.1)", 
        text: isDark ? "#c084fc" : "#6D28D9", 
        border: isDark ? "rgba(168, 85, 247, 0.3)" : "#D8B4FE" 
      };
    case "Ready to File":
      return { 
        bg: isDark ? "rgba(34, 197, 94, 0.15)" : "rgba(34, 197, 94, 0.1)", 
        text: isDark ? "#4ade80" : "#15803D", 
        border: isDark ? "rgba(34, 197, 94, 0.3)" : "#86EFAC" 
      };
    default:
      return { 
        bg: isDark ? "#334155" : "#F3F4F6", 
        text: isDark ? "#f8fafc" : "#374151", 
        border: isDark ? "#475569" : "#E5E7EB" 
      };
  }
};

interface MobileFormPickerProps {
  label: string;
  value: string;
  items: { label: string; value: string }[];
  onValueChange: (val: string) => void;
  colors: any;
  styles: any;
}

function MobileFormPicker({
  label,
  value,
  items,
  onValueChange,
  colors,
  styles,
}: MobileFormPickerProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const selectedItem = items.find((i) => i.value === value);

  return (
    <View style={styles.formGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TouchableOpacity style={styles.pickerTrigger} onPress={() => setModalOpen(true)}>
        <Text style={styles.pickerTriggerText}>
          {selectedItem ? selectedItem.label : label}
        </Text>
        <ChevronDown size={16} color={colors.mutedText} />
      </TouchableOpacity>

      <Modal visible={modalOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.pickerModalCard}>
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>Select {label}</Text>
              <TouchableOpacity onPress={() => setModalOpen(false)}>
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {items.map((item) => (
                <TouchableOpacity
                  key={item.value}
                  style={[styles.pickerItemRow, item.value === value ? styles.pickerItemRowActive : null]}
                  onPress={() => {
                    onValueChange(item.value);
                    setModalOpen(false);
                  }}
                >
                  <Text style={[styles.pickerItemText, item.value === value ? styles.pickerItemTextActive : null]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export function PendingPatents() {
  const { uiTheme } = useTheme();
  const isDark = (uiTheme.theme as string) === "dark" || (uiTheme.theme as string) === "metallic-elite";

  const colors = useMemo(() => ({
    background: uiTheme.panelColors?.dashboardBackground || (isDark ? "#0f172a" : "#f8fafc"),
    cardBg: uiTheme.panelColors?.dashboardCardBackground || (isDark ? "#1e293b" : "#ffffff"),
    text: uiTheme.panelColors?.dashboardTextColor || (isDark ? "#f8fafc" : "#0f172a"),
    mutedText: isDark ? "#94a3b8" : "#64748b",
    border: isDark ? "#334155" : "#e2e8f0",
    inputBg: isDark ? "#0f172a" : "#ffffff",
    inputText: isDark ? "#f8fafc" : "#0f172a",
    primary: uiTheme.customColors?.primary || "#111827",
    filterBg: isDark ? "#1e293b" : "#F9FAFB",
    footerBg: isDark ? "#111827" : "#F9FAFB",
    activeRowBg: isDark ? "rgba(59, 130, 246, 0.15)" : "#EFF6FF",
    notesBg: isDark ? "#0f172a" : "#F9FAFB",
    notesBorder: isDark ? "#334155" : "#F3F4F6",
    dividerBg: isDark ? "#334155" : "#F3F4F6",
    successText: isDark ? "#34d399" : "#16A34A",
    linkText: isDark ? "#60a5fa" : "#2563EB",
    destructive: "#DC2626",
  }), [uiTheme, isDark]);

  const styles = useMemo(() => createStyles(colors), [colors]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isFileDialogOpen, setIsFileDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [patents, setPatents] = useState<PendingPatent[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPatent, setSelectedPatent] = useState<PendingPatent | null>(null);
  
  const [formData, setFormData] = useState<PendingPatent>({
    patentName: "",
    category: "",
    stage: "Concept",
    startDate: new Date().toISOString().split("T")[0],
    estimatedFilingDate: "",
    inventors: [],
    notes: "",
  });

  const [filterSearch, setFilterSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStage, setFilterStage] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEstimatedDate, setFilterEstimatedDate] = useState("");

  const [filingData, setFilingData] = useState({
    filingDate: "",
    applicationNumber: "",
    filingType: "Provisional" as "Provisional" | "Non-Provisional" | "International",
  });

  const fetchPendingPatents = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch<{ items: PendingPatent[] }>("/api/patents/pending");
      setPatents(res.items || []);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingPatents();
  }, []);

  const handleOpenDialog = (patent?: PendingPatent) => {
    if (patent) {
      setSelectedPatent(patent);
      setFormData({
        ...patent,
        inventors: patent.inventors || []
      });
    } else {
      setSelectedPatent(null);
      setFormData({
        patentName: "",
        category: "",
        stage: "Concept",
        startDate: new Date().toISOString().split("T")[0],
        estimatedFilingDate: "",
        inventors: [],
        notes: "",
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.patentName || !formData.estimatedFilingDate) {
      Alert.alert("Required Fields Missing", "Please input both Patent Name and Expected Filing Target Date.");
      return;
    }

    try {
      if (selectedPatent && selectedPatent._id) {
        await apiFetch(`/api/patents/pending/${selectedPatent._id}`, {
          method: "PUT",
          body: JSON.stringify(formData),
        });
      } else {
        await apiFetch("/api/patents/pending", {
          method: "POST",
          body: JSON.stringify(formData),
        });
      }
      await fetchPendingPatents();
      setIsDialogOpen(false);
    } catch (error) {
      console.error(error);
      Alert.alert("Transmission Error", "Failed to properly record patent information changes.");
    }
  };

  const handleFilePatent = async () => {
    if (!selectedPatent || !selectedPatent._id) return;
    if (!filingData.filingDate || !filingData.applicationNumber) {
      Alert.alert("Input Match Missing", "Filing Date and verified Application Number are mandatory fields.");
      return;
    }

    try {
      await apiFetch(`/api/patents/${selectedPatent._id}`, {
        method: "PUT",
        body: JSON.stringify({
          patentType: "filed",
          status: "Filed",
          filingDate: filingData.filingDate,
          applicationNumber: filingData.applicationNumber,
          filingType: filingData.filingType,
        }),
      });
      await fetchPendingPatents();
      setIsFileDialogOpen(false);
    } catch (error) {
      console.error(error);
      Alert.alert("Transition Error", "Failed to change operational lifecycle index to Filed status.");
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      "Confirm Deletion Request",
      "Are you absolutely certain you want to erase this patent drafting entity?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Profile",
          style: "destructive",
          onPress: async () => {
            try {
              await apiFetch(`/api/patents/pending/${id}`, { method: "DELETE" });
              await fetchPendingPatents();
            } catch (error) {
              console.error(error);
              Alert.alert("System Fault", "Could not remove targeted object record.");
            }
          },
        },
      ]
    );
  };

  const filteredPatents = useMemo(() => {
    return patents.filter((p) => {
      if (filterSearch) {
        const query = filterSearch.toLowerCase();
        const nameMatch = p.patentName?.toLowerCase().includes(query);
        const inventorMatch = p.inventors?.some((inv) => inv.toLowerCase().includes(query));
        if (!nameMatch && ! inventorMatch) return false;
      }
      if (filterCategory && !p.category?.toLowerCase().includes(filterCategory.toLowerCase())) return false;
      if (filterStage && p.stage !== filterStage) return false;
      if (filterStartDate && new Date(p.startDate) < new Date(filterStartDate)) return false;
      if (filterEstimatedDate && new Date(p.estimatedFilingDate) > new Date(filterEstimatedDate)) return false;
      return true;
    });
  }, [patents, filterSearch, filterCategory, filterStage, filterStartDate, filterEstimatedDate]);

  return (
    <View style={styles.subContainerWrapper}>
      <View style={styles.inlineHeaderRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionHeaderTitle}>Pending/Draft Patents</Text>
          <Text style={styles.sectionHeaderSubtitle}>Patents in development stages</Text>
        </View>

        <TouchableOpacity style={styles.actionIconButton} onPress={() => handleOpenDialog()}>
          <Plus size={16} color="#FFF" />
          <Text style={styles.actionIconButtonText}>Add Patent</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.filtersToggleHeader, showFilters ? styles.filtersToggleHeaderActive : null]}
        onPress={() => setShowFilters(!showFilters)}
      >
        <Filter size={15} color={showFilters ? colors.linkText : colors.mutedText} />
        <Text style={[styles.filtersToggleHeaderText, showFilters ? styles.filtersToggleHeaderTextActive : null]}>
          {showFilters ? "Collapse Parameter Selection" : "Open Search Parameters"}
        </Text>
      </TouchableOpacity>

      {showFilters && (
        <View style={styles.filterCardDrawer}>
          <View style={styles.smallFormGroup}>
            <Text style={styles.microInputLabel}>Search Term Keyword</Text>
            <TextInput
              style={styles.drawerInput}
              placeholder="Filter names or inventors..."
              placeholderTextColor={colors.mutedText}
              value={filterSearch}
              onChangeText={setFilterSearch}
            />
          </View>

          <View style={styles.smallFormGroup}>
            <Text style={styles.microInputLabel}>Target Category Group</Text>
            <TextInput
              style={styles.drawerInput}
              placeholder="e.g., Mechanical"
              placeholderTextColor={colors.mutedText}
              value={filterCategory}
              onChangeText={setFilterCategory}
            />
          </View>

          <MobileFormPicker
            label="Current Phase Stage"
            value={filterStage}
            items={[
              { label: "All Development Stages", value: "" },
              { label: "Concept", value: "Concept" },
              { label: "Research", value: "Research" },
              { label: "Drafting", value: "Drafting" },
              { label: "Ready to File", value: "Ready to File" },
            ]}
            onValueChange={setFilterStage}
            colors={colors}
            styles={styles}
          />
        </View>
      )}

      {isLoading ? (
        <View style={styles.centeredStateView}>
          <ActivityIndicator size="small" color={colors.linkText} />
          <Text style={styles.informationalTextState}>Parsing system documents...</Text>
        </View>
      ) : patents.length === 0 ? (
        <View style={styles.emptyPromptCard}>
          <Text style={styles.emptyPromptText}>No pending items registered in database layout.</Text>
        </View>
      ) : filteredPatents.length === 0 ? (
        <View style={styles.emptyPromptCard}>
          <Text style={styles.emptyPromptText}>No design profiles match active parameter rules.</Text>
        </View>
      ) : (
        <View style={styles.cardsScrollStack}>
          {filteredPatents.map((patent, index) => {
            const badgeTheme = getStageTheme(patent.stage, isDark);
            return (
              <View key={patent._id || index.toString()} style={styles.dataProcessingCard}>
                <View style={styles.cardHeaderTopRow}>
                  <View style={styles.titleTextContainerStack}>
                    <Text style={styles.cardCountTextLabel}>ENTRY #{index + 1}</Text>
                    <Text style={styles.mainCardPatentName} numberOfLines={2}>
                      {patent.patentName}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadgeCapsule,
                      { backgroundColor: badgeTheme.bg, borderColor: badgeTheme.border },
                    ]}
                  >
                    <Text style={[styles.statusBadgeCapsuleText, { color: badgeTheme.text }]}>
                      {patent.stage.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.structuralDivider} />

                <View style={styles.cardInternalMetaGrid}>
                  <View style={styles.metaRowLabelValuePair}>
                    <Text style={styles.metaKeyText}>Category Matrix:</Text>
                    <Text style={styles.metaValueText}>{patent.category || "—"}</Text>
                  </View>

                  <View style={styles.metaRowLabelValuePair}>
                    <Text style={styles.metaKeyText}>Inventors Block:</Text>
                    <Text style={styles.metaValueText} numberOfLines={1}>
                      {patent.inventors && patent.inventors.length > 0 ? patent.inventors.join(", ") : "—"}
                    </Text>
                  </View>

                  <View style={styles.metaRowLabelValuePair}>
                    <Text style={styles.metaKeyText}>Development Launch:</Text>
                    <Text style={styles.metaValueText}>{patent.startDate || "—"}</Text>
                  </View>

                  <View style={styles.metaRowLabelValuePair}>
                    <Text style={styles.metaKeyText}>Est. Filing Threshold:</Text>
                    <Text style={[styles.metaValueText, { color: colors.linkText, fontWeight: "600" }]}>
                      {patent.estimatedFilingDate || "—"}
                    </Text>
                  </View>

                  {patent.notes ? (
                    <View style={styles.notesDrawerBox}>
                      <Text style={styles.notesBoxMicroTitle}>Development Diary:</Text>
                      <Text style={styles.notesBoxBodyContent}>{patent.notes}</Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.cardOperationFooterMenu}>
                  <TouchableOpacity
                    style={[styles.footerOperationActionTab, styles.borderRightSplit]}
                    onPress={() => {
                      setSelectedPatent(patent);
                      setFilingData({
                        filingDate: new Date().toISOString().split("T")[0],
                        applicationNumber: "",
                        filingType: "Provisional",
                      });
                      setIsFileDialogOpen(true);
                    }}
                  >
                    <FileText size={14} color={colors.successText} />
                    <Text style={[styles.footerActionTabText, { color: colors.successText }]}>Move to Filed</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.footerOperationActionTab, styles.borderRightSplit]}
                    onPress={() => handleOpenDialog(patent)}
                  >
                    <Edit2 size={13} color={colors.linkText} />
                    <Text style={[styles.footerActionTabText, { color: colors.linkText }]}>Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.footerOperationActionTab}
                    onPress={() => {
                      if (patent._id) handleDelete(patent._id);
                    }}
                  >
                    <Trash2 size={13} color={colors.destructive} />
                    <Text style={[styles.footerActionTabText, { color: colors.destructive }]}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      )}

      <Modal visible={isDialogOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.masterFormSheetCard}>
            <View style={styles.formSheetCardHeader}>
              <View>
                <Text style={styles.sheetCardHeaderTitle}>
                  {selectedPatent ? "Edit Patent Structure" : "New Patent Concept"}
                </Text>
                <Text style={styles.sheetCardHeaderSubtitle}>
                  Track patents in development stages
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsDialogOpen(false)}>
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formSheetCardBodyScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Patent Title Name *</Text>
                <TextInput
                  style={styles.formInputTextLine}
                  placeholder="Input functional patent title text"
                  placeholderTextColor={colors.mutedText}
                  value={formData.patentName}
                  onChangeText={(val) => setFormData({ ...formData, patentName: val })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Structural Category</Text>
                <TextInput
                  style={styles.formInputTextLine}
                  placeholder="e.g., Software Architecture, Cloud Infrastructure"
                  placeholderTextColor={colors.mutedText}
                  value={formData.category}
                  onChangeText={(val) => setFormData({ ...formData, category: val })}
                />
              </View>

              <MobileFormPicker
                label="Development Stage Status"
                value={formData.stage}
                items={[
                  { label: "Concept Definition", value: "Concept" },
                  { label: "Prior Art Research", value: "Research" },
                  { label: "Claims Drafting", value: "Drafting" },
                  { label: "Ready for Legal Submission", value: "Ready to File" },
                ]}
                onValueChange={(val) => setFormData({ ...formData, stage: val as PendingPatent["stage"] })}
                colors={colors}
                styles={styles}
              />

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Project Inception Date</Text>
                <TextInput
                  style={styles.formInputTextLine}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.mutedText}
                  value={formData.startDate}
                  onChangeText={(val) => setFormData({ ...formData, startDate: val })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Estimated Filing Submission Target *</Text>
                <TextInput
                  style={styles.formInputTextLine}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.mutedText}
                  value={formData.estimatedFilingDate}
                  onChangeText={(val) => setFormData({ ...formData, estimatedFilingDate: val })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Inventors (Comma Separated Blocks)</Text>
                <TextInput
                  style={styles.formInputTextLine}
                  placeholder="Alice Smith, Bob Jones, Charlie Vance"
                  placeholderTextColor={colors.mutedText}
                  value={formData.inventors ? formData.inventors.join(", ") : ""}
                  onChangeText={(val) =>
                    setFormData({
                      ...formData,
                      inventors: val ? val.split(",").map((str) => str.trim()) : [],
                    })
                  }
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Operational Progress Log Notes</Text>
                <TextInput
                  style={[styles.formInputTextLine, styles.formInputTextAreaMultiline]}
                  placeholder="Capture constraints, engineering progress, or block details..."
                  placeholderTextColor={colors.mutedText}
                  multiline
                  numberOfLines={3}
                  value={formData.notes || ""}
                  onChangeText={(val) => setFormData({ ...formData, notes: val })}
                />
              </View>
            </ScrollView>

            <View style={styles.formSheetCardFooterSticky}>
              <TouchableOpacity style={styles.sheetCancelFooterBtn} onPress={() => setIsDialogOpen(false)}>
                <Text style={styles.sheetCancelFooterBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.sheetSubmitFooterBtn} onPress={handleSave}>
                <Text style={styles.sheetSubmitFooterBtnText}>
                  {selectedPatent ? "Apply Changes" : "Create Record Entry"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={isFileDialogOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.fileTransitionModalPanel}>
            <View style={styles.formSheetCardHeader}>
              <View>
                <Text style={styles.sheetCardHeaderTitle}>Move to Filed Status</Text>
                <Text style={styles.sheetCardHeaderSubtitle}>
                  Provide current USPTO/governmental receipt parameters
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsFileDialogOpen(false)}>
                <X size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 16, gap: 14 }}>
              <MobileFormPicker
                label="Legal Application Filing Type"
                value={filingData.filingType}
                items={[
                  { label: "Provisional Application", value: "Provisional" },
                  { label: "Non-Provisional Utility", value: "Non-Provisional" },
                  { label: "International PCT Framework", value: "International" },
                ]}
                onValueChange={(val) => setFilingData({ ...filingData, filingType: val as any })}
                colors={colors}
                styles={styles}
              />

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Official Governmental Filing Date *</Text>
                <TextInput
                  style={styles.formInputTextLine}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.mutedText}
                  value={filingData.filingDate}
                  onChangeText={(val) => setFilingData({ ...filingData, filingDate: val })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Assigned Serial / Application Number *</Text>
                <TextInput
                  style={styles.formInputTextLine}
                  placeholder="e.g., US 63/123,456"
                  placeholderTextColor={colors.mutedText}
                  value={filingData.applicationNumber}
                  onChangeText={(val) => setFilingData({ ...filingData, applicationNumber: val })}
                />
              </View>
            </View>

            <View style={styles.formSheetCardFooterSticky}>
              <TouchableOpacity style={styles.sheetCancelFooterBtn} onPress={() => setIsFileDialogOpen(false)}>
                <Text style={styles.sheetCancelFooterBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.sheetSubmitFooterBtn, { backgroundColor: colors.successText }]} onPress={handleFilePatent}>
                <Text style={styles.sheetSubmitFooterBtnText}>Commit to Archives</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    subContainerWrapper: {
      width: "100%",
    },
    inlineHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 14,
      gap: 12,
    },
    sectionHeaderTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
    },
    sectionHeaderSubtitle: {
      fontSize: 12,
      color: colors.mutedText,
      marginTop: 1,
    },
    actionIconButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      height: 36,
      borderRadius: 6,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
    },
    actionIconButtonText: {
      color: "#FFF",
      fontSize: 13,
      fontWeight: "600",
    },
    filtersToggleHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 6,
      paddingVertical: 8,
      paddingHorizontal: 12,
      marginBottom: 12,
    },
    filtersToggleHeaderActive: {
      backgroundColor: colors.activeRowBg,
      borderColor: colors.border,
    },
    filtersToggleHeaderText: {
      fontSize: 12,
      fontWeight: "500",
      color: colors.text,
    },
    filtersToggleHeaderTextActive: {
      color: colors.linkText,
      fontWeight: "600",
    },
    filterCardDrawer: {
      backgroundColor: colors.filterBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
      gap: 10,
      marginBottom: 14,
    },
    smallFormGroup: {
      width: "100%",
    },
    microInputLabel: {
      fontSize: 11,
      fontWeight: "600",
      color: colors.mutedText,
      marginBottom: 3,
    },
    drawerInput: {
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 6,
      height: 36,
      paddingHorizontal: 10,
      fontSize: 13,
      color: colors.inputText,
    },
    centeredStateView: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 40,
      gap: 8,
    },
    informationalTextState: {
      fontSize: 13,
      color: colors.mutedText,
    },
    emptyPromptCard: {
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 24,
      alignItems: "center",
    },
    emptyPromptText: {
      fontSize: 13,
      color: colors.mutedText,
      textAlign: "center",
    },
    cardsScrollStack: {
      gap: 12,
    },
    dataProcessingCard: {
      backgroundColor: colors.cardBg,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardHeaderTopRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      padding: 12,
      gap: 10,
    },
    titleTextContainerStack: {
      flex: 1,
      gap: 2,
    },
    cardCountTextLabel: {
      fontSize: 10,
      fontWeight: "700",
      color: colors.mutedText,
      letterSpacing: 0.5,
    },
    mainCardPatentName: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
    },
    statusBadgeCapsule: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 4,
      borderWidth: 1,
    },
    statusBadgeCapsuleText: {
      fontSize: 9,
      fontWeight: "700",
      letterSpacing: 0.3,
    },
    structuralDivider: {
      height: 1,
      backgroundColor: colors.border,
    },
    cardInternalMetaGrid: {
      padding: 12,
      gap: 6,
    },
    metaRowLabelValuePair: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 8,
    },
    metaKeyText: {
      fontSize: 12,
      color: colors.mutedText,
    },
    metaValueText: {
      fontSize: 12,
      fontWeight: "500",
      color: colors.text,
      flex: 1,
      textAlign: "right",
    },
    notesDrawerBox: {
      backgroundColor: colors.notesBg,
      borderWidth: 1,
      borderColor: colors.notesBorder,
      borderRadius: 6,
      padding: 8,
      marginTop: 4,
    },
    notesBoxMicroTitle: {
      fontSize: 10,
      fontWeight: "600",
      color: colors.mutedText,
      marginBottom: 2,
    },
    notesBoxBodyContent: {
      fontSize: 12,
      color: colors.text,
      lineHeight: 16,
    },
    cardOperationFooterMenu: {
      flexDirection: "row",
      borderTopWidth: 1,
      borderTopColor: colors.border,
      height: 38,
      backgroundColor: colors.footerBg,
      borderBottomLeftRadius: 8,
      borderBottomRightRadius: 8,
      overflow: "hidden",
    },
    footerOperationActionTab: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
    },
    borderRightSplit: {
      borderRightWidth: 1,
      borderRightColor: colors.border,
    },
    footerActionTabText: {
      fontSize: 12,
      fontWeight: "600",
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    pickerModalCard: {
      width: SCREEN_WIDTH * 0.78,
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      padding: 14,
      maxHeight: 260,
    },
    pickerModalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingBottom: 6,
      marginBottom: 4,
    },
    pickerModalTitle: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.text,
    },
    pickerItemRow: {
      paddingVertical: 9,
      paddingHorizontal: 4,
      borderRadius: 4,
    },
    pickerItemRowActive: {
      backgroundColor: colors.activeRowBg,
    },
    pickerItemText: {
      fontSize: 13,
      color: colors.text,
    },
    pickerItemTextActive: {
      color: colors.linkText,
      fontWeight: "600",
    },
    masterFormSheetCard: {
      width: SCREEN_WIDTH * 0.92,
      maxHeight: "84%",
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      overflow: "hidden",
    },
    formSheetCardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.cardBg,
    },
    sheetCardHeaderTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.text,
    },
    sheetCardHeaderSubtitle: {
      fontSize: 11,
      color: colors.mutedText,
      marginTop: 2,
    },
    formSheetCardBodyScroll: {
      padding: 16,
    },
    formGroup: {
      marginBottom: 12,
    },
    inputLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 4,
    },
    formInputTextLine: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 6,
      paddingHorizontal: 10,
      height: 38,
      fontSize: 13,
      color: colors.inputText,
      backgroundColor: colors.inputBg,
    },
    formInputTextAreaMultiline: {
      height: 64,
      paddingTop: 6,
      textAlignVertical: "top",
    },
    pickerTrigger: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 6,
      paddingHorizontal: 10,
      height: 38,
      backgroundColor: colors.inputBg,
    },
    pickerTriggerText: {
      fontSize: 13,
      color: colors.inputText,
    },
    formSheetCardFooterSticky: {
      flexDirection: "row",
      borderTopWidth: 1,
      borderTopColor: colors.border,
      padding: 12,
      gap: 10,
      backgroundColor: colors.footerBg,
    },
    sheetCancelFooterBtn: {
      flex: 1,
      height: 38,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 6,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.cardBg,
    },
    sheetCancelFooterBtnText: {
      fontSize: 13,
      fontWeight: "500",
      color: colors.text,
    },
    sheetSubmitFooterBtn: {
      flex: 1,
      height: 38,
      backgroundColor: colors.primary,
      borderRadius: 6,
      justifyContent: "center",
      alignItems: "center",
    },
    sheetSubmitFooterBtnText: {
      fontSize: 13,
      fontWeight: "600",
      color: "#FFF",
    },
    fileTransitionModalPanel: {
      width: SCREEN_WIDTH * 0.88,
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      overflow: "hidden",
    },
  });
}