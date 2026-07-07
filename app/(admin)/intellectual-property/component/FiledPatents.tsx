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
  AlertCircle,
  X,
  ChevronDown,
  Filter,
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
    case "Filed":
      return { bg: isDark ? "rgba(59, 130, 246, 0.2)" : "#DBEAFE", text: isDark ? "#60a5fa" : "#1E40AF" };
    case "Issued":
      return { bg: isDark ? "rgba(16, 185, 129, 0.2)" : "#D1FAE5", text: isDark ? "#34d399" : "#065F46" };
    case "Expired":
      return { bg: isDark ? "rgba(239, 68, 68, 0.2)" : "#FEE2E2", text: isDark ? "#f87171" : "#991B1B" };
    case "Abandoned":
    default:
      return { bg: isDark ? "#334155" : "#F3F4F6", text: isDark ? "#9ca3af" : "#374151" };
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

export function FiledPatents() {
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
    primary: uiTheme.customColors?.primary || "#4f46e5",
    filterBg: isDark ? "#1e293b" : "#F3F4F6",
    footerBg: isDark ? "#111827" : "#F9FAFB",
    activeRowBg: isDark ? "rgba(79, 70, 229, 0.15)" : "#EEF2F6",
    errorText: isDark ? "#f87171" : "#991B1B",
    errorBg: isDark ? "rgba(239, 64, 64, 0.15)" : "#FEF2F2",
    errorBorder: isDark ? "rgba(239, 64, 64, 0.3)" : "#FEE2E2",
    notesBg: isDark ? "#0f172a" : "#F9FAFB",
    notesBorder: isDark ? "#334155" : "#F3F4F6",
    indexCircleBg: isDark ? "#334155" : "#F3F4F6",
    destructive: "#DC2626",
    modifyLink: isDark ? "#60a5fa" : "#2563EB",
  }), [uiTheme, isDark]);

  const styles = useMemo(() => createStyles(colors), [colors]);

  const [patents, setPatents] = useState<FiledPatent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const [filterSearch, setFilterSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

  const [formData, setFormData] = useState<Partial<FiledPatent>>({
    patentName: "",
    category: "",
    filingType: "Provisional",
    filingDate: "",
    applicationNumber: "",
    status: "Filed",
    notes: "",
  });
  const [selectedPatent, setSelectedPatent] = useState<FiledPatent | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPatents = async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const res = await apiFetch<{ items: FiledPatent[] }>("/api/patents/filed");
      setPatents(res.items || []);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Failed to load patent records.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPatents();
  }, []);

  const filteredPatents = useMemo(() => {
    return patents.filter((p) => {
      if (p.status === "Expired") return false;

      if (filterSearch) {
        const query = filterSearch.toLowerCase();
        const nameMatch = p.patentName?.toLowerCase().includes(query);
        const appNumMatch = p.applicationNumber?.toLowerCase().includes(query);
        if (!nameMatch && !appNumMatch) return false;
      }
      if (filterCategory && !p.category?.toLowerCase().includes(filterCategory.toLowerCase())) return false;
      if (filterStatus && p.status !== filterStatus) return false;
      if (filterStartDate && new Date(p.filingDate) < new Date(filterStartDate)) return false;
      if (filterEndDate && new Date(p.filingDate) > new Date(filterEndDate)) return false;
      return true;
    });
  }, [patents, filterSearch, filterCategory, filterStatus, filterStartDate, filterEndDate]);

  const resetForm = () => {
    setFormData({
      patentName: "",
      category: "",
      filingType: "Provisional",
      filingDate: "",
      applicationNumber: "",
      status: "Filed",
      notes: "",
    });
    setSelectedPatent(null);
    setApiError(null);
  };

  const calculateExpiration = (filingDate: string, filingType: string) => {
    if (filingType !== "Provisional" || !filingDate) return "";
    const date = new Date(filingDate);
    date.setFullYear(date.getFullYear() + 1);
    return date.toISOString().split("T")[0];
  };

  const handleSave = async () => {
    if (!formData.patentName) {
      setApiError("Patent Name is required");
      return;
    }

    try {
      setIsSubmitting(true);
      setApiError(null);

      const expirationDate =
        formData.filingType === "Provisional" && formData.filingDate
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
      } else {
        await apiFetch("/api/patents/filed", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      await fetchPatents();
      setIsFormModalOpen(false);
      resetForm();
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Failed to save data record");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (patent: FiledPatent) => {
    Alert.alert(
      "Confirm Deletion",
      "Are you sure you want to permanently remove this patent?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await apiFetch(`/api/patents/filed/${patent._id}`, {
                method: "DELETE",
              });
              await fetchPatents();
            } catch (err) {
              setApiError(err instanceof Error ? err.message : "Failed to delete item.");
            }
          },
        },
      ]
    );
  };

  const handleEdit = (patent: FiledPatent) => {
    setSelectedPatent(patent);
    setFormData(patent);
    setIsFormModalOpen(true);
  };

  const isExpiringSoon = (expirationDate: string) => {
    if (!expirationDate) return false;
    const expDate = new Date(expirationDate);
    const today = new Date();
    const daysUntilExpiration = Math.floor(
      (expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiration <= 60 && daysUntilExpiration > 0;
  };

  return (
    <View style={styles.wrapper}>
      {apiError && (
        <View style={styles.errorAlert}>
          <AlertCircle size={16} color={colors.errorText} />
          <Text style={styles.errorAlertText}>{apiError}</Text>
        </View>
      )}

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.addPatentBtn}
          onPress={() => {
            resetForm();
            setIsFormModalOpen(true);
          }}
        >
          <Plus size={16} color="#FFF" />
          <Text style={styles.addPatentBtnText}>Add Patent</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterToggleBtn, showFilters ? styles.filterToggleBtnActive : null]}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Filter size={16} color={showFilters ? colors.primary : colors.text} />
          <Text style={[styles.filterToggleBtnText, showFilters ? styles.filterToggleBtnTextActive : null]}>
            {showFilters ? "Hide Filters" : "Show Filters"}
          </Text>
        </TouchableOpacity>
      </View>

      {showFilters && (
        <View style={styles.filterCard}>
          <Text style={styles.filterCardTitle}>Search Criteria</Text>
          
          <View style={styles.smallFormGroup}>
            <Text style={styles.microLabel}>Keyword Search</Text>
            <TextInput
              style={styles.formInput}
              placeholder="Search patent name or app number..."
              placeholderTextColor={colors.mutedText}
              value={filterSearch}
              onChangeText={setFilterSearch}
            />
          </View>

          <View style={styles.smallFormGroup}>
            <Text style={styles.microLabel}>Category</Text>
            <TextInput
              style={styles.formInput}
              placeholder="Filter by category..."
              placeholderTextColor={colors.mutedText}
              value={filterCategory}
              onChangeText={setFilterCategory}
            />
          </View>

          <View style={styles.smallFormGroup}>
            <Text style={styles.microLabel}>Filing Date Threshold (After)</Text>
            <TextInput
              style={styles.formInput}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.mutedText}
              value={filterStartDate}
              onChangeText={setFilterStartDate}
            />
          </View>

          <View style={styles.smallFormGroup}>
            <Text style={styles.microLabel}>Filing Date Threshold (Before)</Text>
            <TextInput
              style={styles.formInput}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.mutedText}
              value={filterEndDate}
              onChangeText={setFilterEndDate}
            />
          </View>
        </View>
      )}

      {isLoading ? (
        <View style={styles.centeredSpinner}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingStateText}>Querying database files...</Text>
        </View>
      ) : patents.length === 0 ? (
        <View style={styles.emptyCardContainer}>
          <Text style={styles.emptyCardText}>No patents logged. Tap "Add Patent" to build entries.</Text>
        </View>
      ) : filteredPatents.length === 0 ? (
        <View style={styles.emptyCardContainer}>
          <Text style={styles.emptyCardText}>No patents align with active parameter filters.</Text>
        </View>
      ) : (
        <View style={styles.cardStackList}>
          {filteredPatents.map((patent, index) => {
            const statusTheme = getStatusTheme(patent.status, isDark);
            const isExpiring = isExpiringSoon(patent.provisionalExpiration);

            return (
              <View key={patent._id || index.toString()} style={styles.patentDataCard}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.titleBadgeContainer}>
                    <View style={styles.indexCircle}>
                      <Text style={styles.indexCircleText}>{index + 1}</Text>
                    </View>
                    <Text style={styles.patentCardTitleText} numberOfLines={2}>
                      {patent.patentName}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusTheme.bg }]}>
                    <Text style={[styles.statusBadgeText, { color: statusTheme.text }]}>
                      {patent.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.cardContentBody}>
                  <View style={styles.metadataMetricRow}>
                    <Text style={styles.metricLabel}>App Number:</Text>
                    <Text style={styles.metricValueMono}>{patent.applicationNumber || "—"}</Text>
                  </View>

                  <View style={styles.metadataMetricRow}>
                    <Text style={styles.metricLabel}>Category:</Text>
                    <Text style={styles.metricValue}>{patent.category || "—"}</Text>
                  </View>

                  <View style={styles.metadataMetricRow}>
                    <Text style={styles.metricLabel}>Filing Type:</Text>
                    <Text style={styles.metricValue}>{patent.filingType || "—"}</Text>
                  </View>

                  <View style={styles.metadataMetricRow}>
                    <Text style={styles.metricLabel}>Filing Date:</Text>
                    <Text style={styles.metricValue}>
                      {patent.filingDate ? new Date(patent.filingDate).toLocaleDateString() : "—"}
                    </Text>
                  </View>

                  <View style={styles.metadataMetricRow}>
                    <Text style={styles.metricLabel}>Expiration:</Text>
                    <View style={styles.expirationBadgeContainer}>
                      <Text style={[styles.metricValue, isExpiring && { color: colors.destructive, fontWeight: "700" }]}>
                        {patent.provisionalExpiration ? new Date(patent.provisionalExpiration).toLocaleDateString() : "—"}
                      </Text>
                      {isExpiring && (
                        <View style={styles.expiringFlag}>
                          <Text style={styles.expiringFlagText}>EXPIRING SOON</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {patent.notes ? (
                    <View style={styles.notesBox}>
                      <Text style={styles.notesLabel}>Notes:</Text>
                      <Text style={styles.notesContentText}>{patent.notes}</Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.cardActionsRow}>
                  <TouchableOpacity style={styles.cardEditBtn} onPress={() => handleEdit(patent)}>
                    <Edit2 size={14} color={colors.modifyLink} />
                    <Text style={styles.cardEditBtnText}>Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.cardDeleteBtn} onPress={() => handleDelete(patent)}>
                    <Trash2 size={14} color={colors.destructive} />
                    <Text style={styles.cardDeleteBtnText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      )}

      <Modal visible={isFormModalOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.formModalCard}>
            <View style={styles.formModalHeader}>
              <Text style={styles.formModalTitle}>
                {selectedPatent ? "Edit Patent Entity" : "Add New Patent Entity"}
              </Text>
              <TouchableOpacity onPress={() => setIsFormModalOpen(false)}>
                <X size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formModalScroll} contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Patent Name</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter specific patent profile name"
                  placeholderTextColor={colors.mutedText}
                  value={formData.patentName || ""}
                  onChangeText={(val) => setFormData({ ...formData, patentName: val })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Category</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g., Software, Artificial Intelligence, Hardware"
                  placeholderTextColor={colors.mutedText}
                  value={formData.category || ""}
                  onChangeText={(val) => setFormData({ ...formData, category: val })}
                />
              </View>

              <MobileFormPicker
                label="Filing Type"
                value={formData.filingType || "Provisional"}
                items={[
                  { label: "Provisional", value: "Provisional" },
                  { label: "Non-Provisional", value: "Non-Provisional" },
                  { label: "International", value: "International" },
                ]}
                onValueChange={(val) => setFormData({ ...formData, filingType: val as FiledPatent["filingType"] })}
                colors={colors}
                styles={styles}
              />

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Filing Date</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.mutedText}
                  value={formData.filingDate || ""}
                  onChangeText={(val) => setFormData({ ...formData, filingDate: val })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Application Number</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g., US 10,123,456"
                  placeholderTextColor={colors.mutedText}
                  value={formData.applicationNumber || ""}
                  onChangeText={(val) => setFormData({ ...formData, applicationNumber: val })}
                />
              </View>

              <MobileFormPicker
                label="Status"
                value={formData.status || "Filed"}
                items={[
                  { label: "Filed", value: "Filed" },
                  { label: "Issued", value: "Issued" },
                  { label: "Expired", value: "Expired" },
                  { label: "Abandoned", value: "Abandoned" },
                ]}
                onValueChange={(val) => setFormData({ ...formData, status: val as FiledPatent["status"] })}
                colors={colors}
                styles={styles}
              />

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Internal Notes Context</Text>
                <TextInput
                  style={[styles.formInput, styles.textAreaField]}
                  placeholder="Input legal monitoring or engineering specifics..."
                  placeholderTextColor={colors.mutedText}
                  multiline
                  numberOfLines={3}
                  value={formData.notes || ""}
                  onChangeText={(val) => setFormData({ ...formData, notes: val })}
                />
              </View>
            </ScrollView>

            <View style={styles.formModalFooter}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setIsFormModalOpen(false)}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalSubmitBtn, isSubmitting ? styles.disabledButton : null]}
                disabled={isSubmitting}
                onPress={handleSave}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Save Record</Text>
                )}
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
    wrapper: {
      width: "100%",
    },
    errorAlert: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.errorBg,
      borderColor: colors.errorBorder,
      borderWidth: 1,
      padding: 10,
      borderRadius: 8,
      gap: 8,
      marginBottom: 12,
    },
    errorAlertText: {
      color: colors.errorText,
      fontSize: 13,
      fontWeight: "500",
      flex: 1,
    },
    actionRow: {
      flexDirection: "row",
      gap: 10,
      marginBottom: 14,
    },
    addPatentBtn: {
      flex: 1,
      backgroundColor: colors.primary,
      height: 42,
      borderRadius: 8,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 6,
    },
    addPatentBtnText: {
      color: "#FFF",
      fontSize: 14,
      fontWeight: "600",
    },
    filterToggleBtn: {
      paddingHorizontal: 14,
      height: 42,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.cardBg,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 6,
    },
    filterToggleBtnActive: {
      borderColor: colors.border,
      backgroundColor: colors.activeRowBg,
    },
    filterToggleBtnText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: "500",
    },
    filterToggleBtnTextActive: {
      color: colors.primary,
      fontWeight: "600",
    },
    filterCard: {
      backgroundColor: colors.filterBg,
      borderRadius: 8,
      padding: 12,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 10,
    },
    filterCardTitle: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.mutedText,
      textTransform: "uppercase",
    },
    smallFormGroup: {
      width: "100%",
    },
    microLabel: {
      fontSize: 11,
      fontWeight: "500",
      color: colors.mutedText,
      marginBottom: 2,
    },
    centeredSpinner: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 32,
      gap: 8,
    },
    loadingStateText: {
      fontSize: 13,
      color: colors.mutedText,
    },
    emptyCardContainer: {
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 24,
      alignItems: "center",
    },
    emptyCardText: {
      fontSize: 13,
      color: colors.mutedText,
      textAlign: "center",
    },
    cardStackList: {
      gap: 12,
    },
    patentDataCard: {
      backgroundColor: colors.cardBg,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.03,
      shadowRadius: 2,
      elevation: 1,
    },
    cardHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      padding: 12,
      gap: 8,
    },
    titleBadgeContainer: {
      flexDirection: "row",
      alignItems: "flex-start",
      flex: 1,
      gap: 8,
    },
    indexCircle: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: colors.indexCircleBg,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
    },
    indexCircleText: {
      fontSize: 11,
      color: colors.mutedText,
      fontWeight: "600",
    },
    patentCardTitleText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
      flex: 1,
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 4,
    },
    statusBadgeText: {
      fontSize: 10,
      fontWeight: "700",
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
    },
    cardContentBody: {
      padding: 12,
      gap: 6,
    },
    metadataMetricRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    metricLabel: {
      fontSize: 12,
      color: colors.mutedText,
    },
    metricValue: {
      fontSize: 12,
      color: colors.text,
      fontWeight: "500",
    },
    metricValueMono: {
      fontSize: 11,
      fontFamily: "System",
      color: colors.text,
      fontWeight: "600",
    },
    expirationBadgeContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    expiringFlag: {
      backgroundColor: colors.errorBg,
      paddingHorizontal: 5,
      paddingVertical: 1,
      borderRadius: 3,
    },
    expiringFlagText: {
      fontSize: 8,
      fontWeight: "700",
      color: colors.destructive,
    },
    notesBox: {
      marginTop: 6,
      backgroundColor: colors.notesBg,
      padding: 8,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.notesBorder,
    },
    notesLabel: {
      fontSize: 11,
      fontWeight: "600",
      color: colors.mutedText,
      marginBottom: 1,
    },
    notesContentText: {
      fontSize: 12,
      color: colors.text,
      lineHeight: 16,
    },
    cardActionsRow: {
      flexDirection: "row",
      borderTopWidth: 1,
      borderTopColor: colors.border,
      height: 38,
    },
    cardEditBtn: {
      flex: 1,
      borderRightWidth: 1,
      borderRightColor: colors.border,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
    },
    cardEditBtnText: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.modifyLink,
    },
    cardDeleteBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
    },
    cardDeleteBtnText: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.destructive,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    pickerModalCard: {
      width: SCREEN_WIDTH * 0.8,
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 16,
      maxHeight: 280,
    },
    pickerModalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingBottom: 8,
      marginBottom: 6,
    },
    pickerModalTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
    },
    pickerItemRow: {
      paddingVertical: 10,
      paddingHorizontal: 6,
      borderRadius: 6,
    },
    pickerItemRowActive: {
      backgroundColor: colors.activeRowBg,
    },
    pickerItemText: {
      fontSize: 14,
      color: colors.text,
    },
    pickerItemTextActive: {
      color: colors.primary,
      fontWeight: "600",
    },
    formModalCard: {
      width: SCREEN_WIDTH * 0.9,
      maxHeight: "85%",
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      overflow: "hidden",
    },
    formModalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    formModalTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
    },
    formModalScroll: {
      padding: 16,
    },
    formGroup: {
      marginBottom: 12,
    },
    inputLabel: {
      fontSize: 13,
      fontWeight: "500",
      color: colors.text,
      marginBottom: 4,
    },
    formInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      height: 40,
      fontSize: 14,
      color: colors.inputText,
      backgroundColor: colors.inputBg,
    },
    textAreaField: {
      height: 70,
      paddingTop: 8,
      textAlignVertical: "top",
    },
    pickerTrigger: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      height: 40,
      backgroundColor: colors.inputBg,
    },
    pickerTriggerText: {
      fontSize: 14,
      color: colors.inputText,
    },
    formModalFooter: {
      flexDirection: "row",
      borderTopWidth: 1,
      borderTopColor: colors.border,
      padding: 12,
      gap: 10,
      backgroundColor: colors.footerBg,
    },
    modalCancelBtn: {
      flex: 1,
      height: 40,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.cardBg,
    },
    modalCancelBtnText: {
      fontSize: 14,
      fontWeight: "500",
      color: colors.text,
    },
    modalSubmitBtn: {
      flex: 1,
      height: 40,
      backgroundColor: colors.primary,
      borderRadius: 8,
      justifyContent: "center",
      alignItems: "center",
    },
    modalSubmitBtnText: {
      fontSize: 14,
      fontWeight: "600",
      color: "#FFF",
    },
    disabledButton: {
      opacity: 0.5,
    },
  });
}