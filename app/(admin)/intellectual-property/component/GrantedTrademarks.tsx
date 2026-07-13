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
  ShieldCheck,
  X,
  ChevronDown,
} from "lucide-react-native";
import { apiFetch } from "@/lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";

interface Trademark {
  _id: string;
  name: string;
  type: "filed" | "granted";
  registrationNumber: string;
  applicationNumber: string;
  filingDate: string;
  registrationDate: string;
  status: string;
  class: string;
  description: string;
  notes: string;
  createdAt: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const getStatusTheme = (status: string, isDark: boolean) => {
  switch (status) {
    case "Registered":
      return { bg: isDark ? "rgba(16, 185, 129, 0.2)" : "rgba(16, 185, 129, 0.1)", text: isDark ? "#34d399" : "#065F46", border: isDark ? "rgba(16, 185, 129, 0.4)" : "#6EE7B7" };
    case "Renewed":
      return { bg: isDark ? "rgba(59, 130, 246, 0.2)" : "rgba(59, 130, 246, 0.1)", text: isDark ? "#60a5fa" : "#1D4ED8", border: isDark ? "rgba(59, 130, 246, 0.4)" : "#93C5FD" };
    case "Expired":
      return { bg: isDark ? "rgba(239, 68, 68, 0.2)" : "rgba(239, 68, 68, 0.1)", text: isDark ? "#f87171" : "#991B1B", border: isDark ? "rgba(239, 68, 68, 0.4)" : "#FCA5A5" };
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

export function GrantedTrademarks() {
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
    primary: uiTheme.customColors?.primary || "#16A34A",
    footerBg: isDark ? "#111827" : "#F9FAFB",
    activeRowBg: isDark ? "rgba(22, 163, 74, 0.15)" : "#EFF6FF",
    descBoxBg: isDark ? "#0f172a" : "#F9FAFB",
    descBoxBorder: isDark ? "#334155" : "#F3F4F6",
    dividerBg: isDark ? "#334155" : "#F3F4F6",
    errorText: isDark ? "#f87171" : "#991B1B",
    errorBg: isDark ? "rgba(239, 64, 64, 0.15)" : "#FEE2E2",
    errorBorder: isDark ? "rgba(239, 64, 64, 0.3)" : "#FCA5A5",
    destructive: "#DC2626",
  }), [uiTheme, isDark]);

  const styles = useMemo(() => createStyles(colors), [colors]);

  const [trademarks, setTrademarks] = useState<Trademark[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [filterSearch, setFilterSearch] = useState("");
  const [selectedTrademark, setSelectedTrademark] = useState<Trademark | null>(null);

  const [formData, setFormData] = useState<Partial<Trademark>>({
    name: "",
    type: "granted",
    registrationNumber: "",
    applicationNumber: "",
    registrationDate: "",
    status: "Registered",
    class: "",
    description: "",
    notes: "",
  });

  const fetchTrademarks = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch<{ items: Trademark[] }>("/api/trademarks/granted");
      setTrademarks(res.items || []);
    } catch (err) {
      console.error(err);
      setApiError("Failed to retrieve current portfolio data assets.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTrademarks();
  }, []);

  const resetForm = () => {
    setFormData({
      name: "",
      type: "granted",
      registrationNumber: "",
      applicationNumber: "",
      registrationDate: "",
      status: "Registered",
      class: "",
      description: "",
      notes: "",
    });
    setSelectedTrademark(null);
    setApiError(null);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.registrationNumber) {
      setApiError("Trademark Name and Registration Number are required fields.");
      return;
    }

    try {
      setIsSubmitting(true);
      setApiError(null);

      if (selectedTrademark) {
        await apiFetch(`/api/trademarks/${selectedTrademark._id}`, {
          method: "PUT",
          body: JSON.stringify(formData),
        });
      } else {
        await apiFetch("/api/trademarks", {
          method: "POST",
          body: JSON.stringify(formData),
        });
      }

      await fetchTrademarks();
      setIsEditDialogOpen(false);
      resetForm();
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "An error occurred while saving asset.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (tm: Trademark) => {
    Alert.alert(
      "Confirm Deletion Request",
      "Are you absolutely certain you want to remove this granted trademark file permanently?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Record",
          style: "destructive",
          onPress: async () => {
            try {
              await apiFetch(`/api/trademarks/${tm._id}`, { method: "DELETE" });
              await fetchTrademarks();
            } catch (err) {
              setApiError(err instanceof Error ? err.message : "Failed to erase selected item.");
            }
          },
        },
      ]
    );
  };

  const handleEdit = (tm: Trademark) => {
    setSelectedTrademark(tm);
    setFormData(tm);
    setApiError(null);
    setIsEditDialogOpen(true);
  };

  const filteredTrademarks = useMemo(() => {
    return trademarks.filter((tm) => {
      if (filterSearch) {
        const query = filterSearch.toLowerCase();
        const nameMatch = tm.name?.toLowerCase().includes(query);
        const regNumMatch = tm.registrationNumber?.toLowerCase().includes(query);
        if (!nameMatch && !regNumMatch) return false;
      }
      return true;
    });
  }, [trademarks, filterSearch]);

  return (
    <View style={styles.subContainerWrapper}>
      {apiError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{apiError}</Text>
        </View>
      )}

      <View style={styles.inlineHeaderRow}>
        <View style={styles.titleWithIconBlock}>
          <ShieldCheck size={18} color={colors.primary} />
          <Text style={styles.sectionHeaderTitle}>Granted Trademarks</Text>
        </View>

        <TouchableOpacity
          style={styles.actionIconButton}
          onPress={() => {
            resetForm();
            setIsEditDialogOpen(true);
          }}
        >
          <Plus size={14} color="#FFF" />
          <Text style={styles.actionIconButtonText}>Add Granted</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchBarWrapper}>
        <TextInput
          style={styles.searchBarInputField}
          placeholder="Search name or registration number..."
          placeholderTextColor={colors.mutedText}
          value={filterSearch}
          onChangeText={setFilterSearch}
        />
      </View>

      {isLoading ? (
        <View style={styles.centeredStateView}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.informationalTextState}>Parsing security archives...</Text>
        </View>
      ) : filteredTrademarks.length === 0 ? (
        <View style={styles.emptyPromptCard}>
          <Text style={styles.emptyPromptText}>No active granted trademark entries found.</Text>
        </View>
      ) : (
        <View style={styles.cardsScrollStack}>
          {filteredTrademarks.map((tm) => {
            const statusTheme = getStatusTheme(tm.status, isDark);
            return (
              <View key={tm._id} style={styles.dataProcessingCard}>
                <View style={styles.cardHeaderTopRow}>
                  <View style={styles.titleTextContainerStack}>
                    <Text style={styles.mainCardTrademarkName}>{tm.name}</Text>
                    <Text style={styles.registrationLabelNumberText}>Reg #{tm.registrationNumber}</Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadgeCapsule,
                      { backgroundColor: statusTheme.bg, borderColor: statusTheme.border },
                    ]}
                  >
                    <Text style={[styles.statusBadgeCapsuleText, { color: statusTheme.text }]}>
                      {tm.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.structuralDivider} />

                <View style={styles.cardInternalMetaGrid}>
                  <View style={styles.metaRowLabelValuePair}>
                    <Text style={styles.metaKeyText}>Classification Index:</Text>
                    <Text style={styles.metaValueText}>{tm.class || "—"}</Text>
                  </View>

                  <View style={styles.metaRowLabelValuePair}>
                    <Text style={styles.metaKeyText}>Registration Certificate Date:</Text>
                    <Text style={styles.metaValueText}>
                      {tm.registrationDate ? new Date(tm.registrationDate).toLocaleDateString() : "—"}
                    </Text>
                  </View>

                  {tm.description ? (
                    <View style={styles.descDrawerBox}>
                      <Text style={styles.descBoxMicroTitle}>Scope Statement Description:</Text>
                      <Text style={styles.descBoxBodyContent} numberOfLines={2}>
                        {tm.description}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.cardOperationFooterMenu}>
                  <TouchableOpacity
                    style={[styles.footerOperationActionTab, styles.borderRightSplit]}
                    onPress={() => handleEdit(tm)}
                  >
                    <Edit2 size={13} color={colors.primary} />
                    <Text style={[styles.footerActionTabText, { color: colors.primary }]}>Modify File</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.footerOperationActionTab}
                    onPress={() => handleDelete(tm)}
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

      <Modal visible={isEditDialogOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.masterFormSheetCard}>
            <View style={styles.formSheetCardHeader}>
              <View>
                <Text style={styles.sheetCardHeaderTitle}>
                  {selectedTrademark ? "Edit Granted Archive" : "Add Granted Trademark"}
                </Text>
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
                <Text style={styles.inputLabel}>Trademark Identifier Name *</Text>
                <TextInput
                  style={styles.formInputTextLine}
                  placeholder="e.g., Apple, Horizon Workspace"
                  placeholderTextColor={colors.mutedText}
                  value={formData.name || ""}
                  onChangeText={(val) => setFormData({ ...formData, name: val })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Registration Certificate Number *</Text>
                <TextInput
                  style={styles.formInputTextLine}
                  placeholder="e.g., 1234567"
                  placeholderTextColor={colors.mutedText}
                  value={formData.registrationNumber || ""}
                  onChangeText={(val) => setFormData({ ...formData, registrationNumber: val })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>NICE Industrial Classification Class</Text>
                <TextInput
                  style={styles.formInputTextLine}
                  placeholder="e.g., 009, 042"
                  placeholderTextColor={colors.mutedText}
                  value={formData.class || ""}
                  onChangeText={(val) => setFormData({ ...formData, class: val })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Official Registration Date Stamp</Text>
                <TextInput
                  style={styles.formInputTextLine}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.mutedText}
                  value={formData.registrationDate ? new Date(formData.registrationDate).toISOString().split("T")[0] : ""}
                  onChangeText={(val) => setFormData({ ...formData, registrationDate: val })}
                />
              </View>

              <MobileFormPicker
                label="Portfolio Verification Status"
                value={formData.status || "Registered"}
                items={[
                  { label: "Registered Active", value: "Registered" },
                  { label: "Renewed Extension", value: "Renewed" },
                  { label: "Expired Validation", value: "Expired" },
                ]}
                onValueChange={(val) => setFormData({ ...formData, status: val })}
                colors={colors}
                styles={styles}
              />

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Goods and Services Scope Description</Text>
                <TextInput
                  style={[styles.formInputTextLine, styles.formInputTextAreaMultiline]}
                  placeholder="Provide explicit operational description mapping details..."
                  placeholderTextColor={colors.mutedText}
                  multiline
                  numberOfLines={3}
                  value={formData.description || ""}
                  onChangeText={(val) => setFormData({ ...formData, description: val })}
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
                  {isSubmitting ? "Saving Matrix..." : "Commit Asset"}
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
    inlineHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
      gap: 12,
    },
    titleWithIconBlock: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      flex: 1,
    },
    sectionHeaderTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
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
      fontSize: 12,
      fontWeight: "600",
    },
    searchBarWrapper: {
      width: "100%",
      marginBottom: 12,
    },
    searchBarInputField: {
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 6,
      height: 38,
      paddingHorizontal: 12,
      fontSize: 13,
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
      gap: 1,
    },
    mainCardTrademarkName: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.text,
    },
    registrationLabelNumberText: {
      fontSize: 11,
      color: colors.mutedText,
      marginTop: 1,
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
      backgroundColor: colors.dividerBg,
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
    descDrawerBox: {
      backgroundColor: colors.descBoxBg,
      borderWidth: 1,
      borderColor: colors.descBoxBorder,
      borderRadius: 6,
      padding: 8,
      marginTop: 4,
    },
    descBoxMicroTitle: {
      fontSize: 10,
      fontWeight: "600",
      color: colors.mutedText,
      marginBottom: 2,
    },
    descBoxBodyContent: {
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
      color: colors.primary,
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