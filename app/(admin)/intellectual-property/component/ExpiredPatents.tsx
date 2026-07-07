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
  Edit2,
  Trash2,
  FileText,
  X,
  ChevronDown,
} from "lucide-react-native";
import { apiFetch } from "@/lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";

interface FiledPatent {
  _id: string;
  patentName: string;
  category: string;
  filingType: "Provisional" | "Non-Provisional" | "International";
  filingDate: string;
  applicationNumber: string;
  provisionalExpiration: string;
  status: "Filed" | "Issued" | "Expired" | "Abandoned";
  notes: string;
  attachments: string[];
  createdAt: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const getStatusTheme = (status: string, isDark: boolean) => {
  switch (status) {
    case "Expired":
      return { bg: isDark ? "rgba(239, 68, 68, 0.15)" : "rgba(239, 68, 68, 0.1)", text: isDark ? "#f87171" : "#991B1B", border: isDark ? "rgba(239, 68, 68, 0.3)" : "#FCA5A5" };
    case "Filed":
      return { bg: isDark ? "rgba(59, 130, 246, 0.15)" : "rgba(59, 130, 246, 0.1)", text: isDark ? "#60a5fa" : "#1D4ED8", border: isDark ? "rgba(59, 130, 246, 0.3)" : "#93C5FD" };
    case "Issued":
      return { bg: isDark ? "rgba(16, 185, 129, 0.15)" : "rgba(16, 185, 129, 0.1)", text: isDark ? "#34d399" : "#065F46", border: isDark ? "rgba(16, 185, 129, 0.3)" : "#6EE7B7" };
    case "Abandoned":
      return { bg: isDark ? "rgba(156, 163, 175, 0.15)" : "rgba(107, 114, 128, 0.1)", text: isDark ? "#9ca3af" : "#374151", border: isDark ? "rgba(156, 163, 175, 0.3)" : "#D1D5DB" };
    default:
      return { bg: isDark ? "#334155" : "#F3F4F6", text: isDark ? "#f8fafc" : "#374151", border: isDark ? "#475569" : "#E5E7EB" };
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

export function ExpiredPatents() {
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
    primary: uiTheme.customColors?.primary || "#374151",
    filterBg: isDark ? "#1e293b" : "rgba(243, 244, 246, 0.5)",
    footerBg: isDark ? "#111827" : "#FAFBFB",
    activeRowBg: isDark ? "rgba(239, 64, 64, 0.15)" : "#FEF2F2",
    errorText: isDark ? "#f87171" : "#991B1B",
    errorBg: isDark ? "rgba(239, 64, 64, 0.2)" : "#FEE2E2",
    errorBorder: isDark ? "rgba(239, 64, 64, 0.4)" : "#FCA5A5",
    destructive: "#DC2626",
    actionMuted: isDark ? "#94a3b8" : "#4B5563",
  }), [uiTheme, isDark]);

  const styles = useMemo(() => createStyles(colors), [colors]);

  const [patents, setPatents] = useState<FiledPatent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const [filterSearch, setFilterSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

  const [selectedPatent, setSelectedPatent] = useState<FiledPatent | null>(null);
  const [formData, setFormData] = useState<Partial<FiledPatent>>({
    patentName: "",
    category: "",
    filingType: "Provisional",
    filingDate: "",
    applicationNumber: "",
    status: "Expired",
    notes: "",
  });

  const fetchPatents = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch<{ items: FiledPatent[] }>("/api/patents/filed");
      setPatents(res.items || []);
    } catch (err) {
      console.error(err);
      setApiError("Failed to retrieve current patent registry records.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPatents();
  }, []);

  const resetForm = () => {
    setFormData({
      patentName: "",
      category: "",
      filingType: "Provisional",
      filingDate: "",
      applicationNumber: "",
      status: "Expired",
      notes: "",
    });
    setSelectedPatent(null);
    setApiError(null);
  };

  const calculateExpiration = (filingDate: string, filingType: string) => {
    if (!filingDate) return "";
    const date = new Date(filingDate);
    if (filingType === "Provisional") {
      date.setFullYear(date.getFullYear() + 1);
    } else {
      date.setFullYear(date.getFullYear() + 20);
    }
    return date.toISOString().split("T")[0];
  };

  const handleSave = async () => {
    if (!formData.patentName) {
      setApiError("Patent Name is required.");
      return;
    }

    try {
      setIsSubmitting(true);
      setApiError(null);

      const expirationDate = formData.filingDate
        ? calculateExpiration(formData.filingDate, formData.filingType!)
        : "";
      const payload = {
        ...formData,
        provisionalExpiration: expirationDate,
      };

      if (selectedPatent) {
        await apiFetch(`/api/patents/filed/${selectedPatent._id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      }

      await fetchPatents();
      setIsEditDialogOpen(false);
      resetForm();
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "An error occurred while saving registry changes.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (patent: FiledPatent) => {
    Alert.alert(
      "Confirm Deletion Request",
      "Are you absolutely certain you want to remove this patent document file permanently?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Erase Record",
          style: "destructive",
          onPress: async () => {
            try {
              await apiFetch(`/api/patents/filed/${patent._id}`, { method: "DELETE" });
              await fetchPatents();
            } catch (err) {
              setApiError(err instanceof Error ? err.message : "Failed to remove item.");
            }
          },
        },
      ]
    );
  };

  const handleEdit = (patent: FiledPatent) => {
    setSelectedPatent(patent);
    setFormData(patent);
    setApiError(null);
    setIsEditDialogOpen(true);
  };

  const expiredPatents = useMemo(() => {
    return patents.filter((p) => {
      if (p.status !== "Expired") return false;

      if (filterSearch) {
        const query = filterSearch.toLowerCase();
        const nameMatch = p.patentName?.toLowerCase().includes(query);
        const appNumMatch = p.applicationNumber?.toLowerCase().includes(query);
        if (!nameMatch && !appNumMatch) return false;
      }

      if (filterCategory && !p.category?.toLowerCase().includes(filterCategory.toLowerCase())) return false;
      if (filterStartDate && new Date(p.filingDate) < new Date(filterStartDate)) return false;
      if (filterEndDate && new Date(p.filingDate) > new Date(filterEndDate)) return false;

      return true;
    });
  }, [patents, filterSearch, filterCategory, filterStartDate, filterEndDate]);

  return (
    <View style={styles.subContainerWrapper}>
      {apiError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{apiError}</Text>
        </View>
      )}

      {isLoading ? (
        <View style={styles.centeredStateView}>
          <ActivityIndicator size="small" color={colors.destructive} />
          <Text style={styles.informationalTextState}>Parsing archival indexes...</Text>
        </View>
      ) : (
        <View style={styles.contentVerticalStack}>
          <View style={styles.filterControlPanelCard}>
            <View style={styles.filterControlGridRow}>
              <View style={styles.filterInputGroupField}>
                <Text style={styles.filterMicroLabel}>Search Query</Text>
                <TextInput
                  style={styles.filterInputTextLine}
                  placeholder="Name or App #..."
                  placeholderTextColor={colors.mutedText}
                  value={filterSearch}
                  onChangeText={setFilterSearch}
                />
              </View>

              <View style={styles.filterInputGroupField}>
                <Text style={styles.filterMicroLabel}>Category Scope</Text>
                <TextInput
                  style={styles.filterInputTextLine}
                  placeholder="e.g., Software"
                  placeholderTextColor={colors.mutedText}
                  value={filterCategory}
                  onChangeText={setFilterCategory}
                />
              </View>
            </View>

            <View style={styles.filterControlGridRow}>
              <View style={styles.filterInputGroupField}>
                <Text style={styles.filterMicroLabel}>Filed After</Text>
                <TextInput
                  style={styles.filterInputTextLine}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.mutedText}
                  value={filterStartDate}
                  onChangeText={setFilterStartDate}
                />
              </View>

              <View style={styles.filterInputGroupField}>
                <Text style={styles.filterMicroLabel}>Filed Before</Text>
                <TextInput
                  style={styles.filterInputTextLine}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.mutedText}
                  value={filterEndDate}
                  onChangeText={setFilterEndDate}
                />
              </View>
            </View>
          </View>

          {expiredPatents.length === 0 ? (
            <View style={styles.emptyPromptCard}>
              <Text style={styles.emptyPromptText}>No expired patent entities matched active filters.</Text>
            </View>
          ) : (
            <View style={styles.cardsScrollStack}>
              {expiredPatents.map((patent) => {
                const statusTheme = getStatusTheme(patent.status, isDark);
                return (
                  <View key={patent._id} style={styles.dataProcessingCard}>
                    <View style={styles.cardHeaderTopRow}>
                      <View style={styles.titleTextContainerStack}>
                        <View style={styles.inlineHeaderTitleRow}>
                          <FileText size={14} color={colors.mutedText} style={styles.inlineFileTextIcon} />
                          <Text style={styles.mainCardPatentName}>{patent.patentName}</Text>
                        </View>
                        <Text style={styles.applicationLabelNumberText}>App #{patent.applicationNumber || "—"}</Text>
                      </View>

                      <View
                        style={[
                          styles.statusBadgeCapsule,
                          { backgroundColor: statusTheme.bg, borderColor: statusTheme.border },
                        ]}
                      >
                        <Text style={[styles.statusBadgeCapsuleText, { color: statusTheme.text }]}>
                          {patent.status.toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.structuralDivider} />

                    <View style={styles.cardInternalMetaGrid}>
                      <View style={styles.metaRowLabelValuePair}>
                        <Text style={styles.metaKeyText}>Legal Type Index:</Text>
                        <Text style={styles.metaValueText}>{patent.filingType}</Text>
                      </View>

                      <View style={styles.metaRowLabelValuePair}>
                        <Text style={styles.metaKeyText}>Category Field:</Text>
                        <Text style={styles.metaValueText}>{patent.category || "—"}</Text>
                      </View>

                      <View style={styles.metaRowLabelValuePair}>
                        <Text style={styles.metaKeyText}>Official Filing Date:</Text>
                        <Text style={styles.metaValueText}>
                          {patent.filingDate ? new Date(patent.filingDate).toLocaleDateString() : "—"}
                        </Text>
                      </View>

                      <View style={styles.metaRowLabelValuePair}>
                        <Text style={[styles.metaKeyText, { fontWeight: "600" }]}>Expiration Timeline:</Text>
                        <Text style={[styles.metaValueText, styles.alertExpirationHighlightText]}>
                          {patent.provisionalExpiration
                            ? new Date(patent.provisionalExpiration).toLocaleDateString()
                            : "—"}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.cardOperationFooterMenu}>
                      <TouchableOpacity
                        style={[styles.footerOperationActionTab, styles.borderRightSplit]}
                        onPress={() => handleEdit(patent)}
                      >
                        <Edit2 size={13} color={colors.actionMuted} />
                        <Text style={[styles.footerActionTabText, { color: colors.actionMuted }]}>Modify File</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.footerOperationActionTab}
                        onPress={() => handleDelete(patent)}
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
        </View>
      )}

      <Modal visible={isEditDialogOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.masterFormSheetCard}>
            <View style={styles.formSheetCardHeader}>
              <View>
                <Text style={styles.sheetCardHeaderTitle}>Edit Expired Patent Asset</Text>
              </View>
              <TouchableOpacity onPress={() => setIsEditDialogOpen(false)}>
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formSheetCardBodyScroll} showsVerticalScrollIndicator={false}>
              {apiError && (
                <View style={[styles.errorBanner, { marginBottom: 12 }]}>
                  <Text style={styles.errorBannerText}>{apiError}</Text>
                </View>
              )}

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Patent Title Name *</Text>
                <TextInput
                  style={styles.formInputTextLine}
                  placeholder="Patent identity label"
                  placeholderTextColor={colors.mutedText}
                  value={formData.patentName || ""}
                  onChangeText={(val) => setFormData({ ...formData, patentName: val })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Structural Category Classification</Text>
                <TextInput
                  style={styles.formInputTextLine}
                  placeholder="e.g., Software, Mechanical"
                  placeholderTextColor={colors.mutedText}
                  value={formData.category || ""}
                  onChangeText={(val) => setFormData({ ...formData, category: val })}
                />
              </View>

              <MobileFormPicker
                label="Filing Paradigm Type"
                value={formData.filingType || "Provisional"}
                items={[
                  { label: "Provisional Application", value: "Provisional" },
                  { label: "Non-Provisional Application", value: "Non-Provisional" },
                  { label: "International Framework", value: "International" },
                ]}
                onValueChange={(val) => setFormData({ ...formData, filingType: val as FiledPatent["filingType"] })}
                colors={colors}
                styles={styles}
              />

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Legal Filing Registration Date</Text>
                <TextInput
                  style={styles.formInputTextLine}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.mutedText}
                  value={formData.filingDate ? formData.filingDate.split("T")[0] : ""}
                  onChangeText={(val) => setFormData({ ...formData, filingDate: val })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Application Serial Number</Text>
                <TextInput
                  style={styles.formInputTextLine}
                  placeholder="e.g., US 10,123,456"
                  placeholderTextColor={colors.mutedText}
                  value={formData.applicationNumber || ""}
                  onChangeText={(val) => setFormData({ ...formData, applicationNumber: val })}
                />
              </View>

              <MobileFormPicker
                label="Current Lifecycle Processing Status"
                value={formData.status || "Expired"}
                items={[
                  { label: "Filed Record", value: "Filed" },
                  { label: "Issued Approval", value: "Issued" },
                  { label: "Expired Protection Term", value: "Expired" },
                  { label: "Abandoned Assignment", value: "Abandoned" },
                ]}
                onValueChange={(val) => setFormData({ ...formData, status: val as FiledPatent["status"] })}
                colors={colors}
                styles={styles}
              />

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Internal Storage Context Notes</Text>
                <TextInput
                  style={[styles.formInputTextLine, styles.formInputTextAreaMultiline]}
                  placeholder="Additional lifecycle notes..."
                  placeholderTextColor={colors.mutedText}
                  multiline
                  numberOfLines={3}
                  value={formData.notes || ""}
                  onChangeText={(val) => setFormData({ ...formData, notes: val })}
                />
              </View>
            </ScrollView>

            <View style={styles.formSheetCardFooterSticky}>
              <TouchableOpacity style={styles.sheetCancelFooterBtn} onPress={() => setIsEditDialogOpen(false)}>
                <Text style={styles.sheetCancelFooterBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sheetSubmitFooterBtn, isSubmitting ? styles.sheetSubmitBtnDisabled : null]}
                onPress={handleSave}
                disabled={isSubmitting}
              >
                <Text style={styles.sheetSubmitFooterBtnText}>
                  {isSubmitting ? "Saving Matrix..." : "Save Changes"}
                </Text>
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
    errorBanner: {
      backgroundColor: colors.errorBg,
      borderWidth: 1,
      borderColor: colors.errorBorder,
      borderRadius: 6,
      padding: 10,
      marginBottom: 12,
    },
    errorBannerText: {
      fontSize: 12,
      color: colors.errorText,
      fontWeight: "500",
    },
    contentVerticalStack: {
      gap: 12,
    },
    filterControlPanelCard: {
      backgroundColor: colors.filterBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 10,
      gap: 10,
    },
    filterControlGridRow: {
      flexDirection: "row",
      gap: 10,
    },
    filterInputGroupField: {
      flex: 1,
      gap: 4,
    },
    filterMicroLabel: {
      fontSize: 11,
      fontWeight: "600",
      color: colors.mutedText,
    },
    filterInputTextLine: {
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 6,
      height: 36,
      paddingHorizontal: 10,
      fontSize: 12,
      color: colors.inputText,
    },
    centeredStateView: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 40,
      gap: 6,
    },
    informationalTextState: {
      fontSize: 12,
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
    inlineHeaderTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 4,
    },
    inlineFileTextIcon: {
      marginTop: 1,
    },
    mainCardPatentName: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.text,
    },
    applicationLabelNumberText: {
      fontSize: 11,
      color: colors.mutedText,
    },
    statusBadgeCapsule: {
      paddingHorizontal: 8,
      paddingVertical: 2,
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
    alertExpirationHighlightText: {
      color: colors.destructive,
      fontWeight: "600",
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
      color: colors.destructive,
      fontWeight: "600",
    },
    masterFormSheetCard: {
      width: SCREEN_WIDTH * 0.92,
      maxHeight: "82%",
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
    sheetSubmitBtnDisabled: {
      opacity: 0.5,
    },
    sheetSubmitFooterBtnText: {
      fontSize: 13,
      fontWeight: "600",
      color: "#FFF",
    },
  });
}