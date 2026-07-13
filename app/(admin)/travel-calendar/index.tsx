import React, { useState, useEffect, useMemo } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  KeyboardAvoidingView,
  Dimensions,
} from "react-native";
import { format } from "date-fns";
import {
  Calendar as CalendarIcon,
  MapPin,
  DollarSign,
  Filter,
  Plus,
  Edit,
  Trash2,
  Eye,
  X,
  ChevronDown,
} from "lucide-react-native";

import { getTravelCalendarList, travelCalendarApi } from "@/lib/admin/apiClient";
import { useTheme } from '@/contexts/ThemeContext';

const { width } = Dimensions.get("window");

interface Budget {
  estimated: number;
  actual: number;
  currency: string;
}

interface TravelCalendarItem {
  id?: string;
  _id?: string;
  title?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  destination?: string;
  purpose?: string;
  status?: string;
  visibility?: string;
  budget?: Budget;
  notes?: string;
}

interface Filters {
  startDate?: string;
  endDate?: string;
  status?: string;
  purpose?: string;
}

function buildColors(uiTheme: any, isDark: boolean) {
  return {
    background:       uiTheme.panelColors?.dashboardBackground    || (isDark ? "#0F172A" : "#F8FAFC"),
    cardBg:           uiTheme.panelColors?.dashboardCardBackground || (isDark ? "#0F172A" : "#FFFFFF"),
    text:             uiTheme.panelColors?.dashboardTextColor      || (isDark ? "#F8FAFC" : "#0F172A"),
    textSecondary:    isDark ? "#CBD5E1" : "#334155",
    textMuted:        isDark ? "#94A3B8" : "#64748B",
    textSubtle:       isDark ? "#64748B" : "#94A3B8",
    border:           isDark ? "#334155" : "#E2E8F0",
    borderLight:      isDark ? "rgba(255,255,255,0.05)" : "#F1F5F9",
    inputBg:          isDark ? "#0F172A" : "#FFFFFF",
    inputBorder:      isDark ? "#334155" : "#CBD5E1",
    inputText:        isDark ? "#F8FAFC" : "#0F172A",
    placeholderText:  isDark ? "#475569" : "#94A3B8",
    searchBg:         isDark ? "#0F172A" : "#F1F5F9",
    primary:          uiTheme.customColors?.primary || (isDark ? "#6366F1" : "#4F46E5"),
    primaryText:      "#FFFFFF",
    primaryMuted:     isDark ? "rgba(99,102,241,0.12)" : "rgba(99,102,241,0.08)",
    activeBadgeBg:    isDark ? "rgba(16,185,129,0.15)"  : "#DCFCE7",
    activeBadgeText:  isDark ? "#34D399"  : "#15803D",
    dangerBg:         isDark ? "rgba(239,68,68,0.15)"  : "#FEE2E2",
    dangerBorder:     "rgba(239,68,68,0.25)",
    dangerText:       isDark ? "#FCA5A5" : "#DC2626",
    warning:          uiTheme.customColors?.warning || "#f59e0b",
    overlayBg:        "rgba(0,0,0,0.4)",
  };
}

function createStyles(colors: ReturnType<typeof buildColors>) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    flexWrapper: { flex: 1 },
    flexItem: { flex: 1 },
    mainScrollPadding: { padding: 16, paddingBottom: 40 },
    headerLayoutRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20, gap: 12 },
    mainTitle: { fontSize: 22, fontWeight: "700", color: colors.text },
    subTitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
    addTriggerButton: { flexDirection: "row", alignItems: "center", backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, gap: 4 },
    addTriggerButtonText: { color: colors.primaryText, fontWeight: "600", fontSize: 13 },
    cardWrapper: { backgroundColor: colors.cardBg, borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: colors.border },
    cardHeaderInline: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
    cardHeaderTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
    filtersFormGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    inputColHalf: { width: "48%" },
    fieldLabel: { fontSize: 12, fontWeight: "600", color: colors.textSecondary, marginBottom: 4 },
    inputFieldElement: { borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: colors.inputText, backgroundColor: colors.inputBg, height: 44 },
    customNativeDropdown: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.inputBg, height: 44 },
    customNativeDropdownText: { fontSize: 13, color: colors.text, textTransform: "capitalize" },
    registrySectionHeader: { fontSize: 14, fontWeight: "700", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 },
    loaderBufferSpacing: { paddingVertical: 40 },
    registryRecordCard: { backgroundColor: colors.cardBg, borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: colors.border, flexDirection: "row", justifyContent: "space-between", gap: 12 },
    recordContentBlock: { flex: 1, gap: 6 },
    recordMainHeadline: { fontSize: 16, fontWeight: "700", color: colors.text },
    badgesWrapperRowInline: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    statusBadgeCapsule: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    statusBadgeText: { fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
    metaInformationRowInlineGap: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
    metaInformationRowInlineText: { fontSize: 13, color: colors.textSecondary },
    recordActionControlColumn: { justifyContent: "space-between", alignItems: "flex-end", minHeight: 90 },
    inlineActionButtonSquare: { width: 32, height: 32, borderRadius: 6, backgroundColor: colors.borderLight, alignItems: "center", justifyContent: "center" },
    dangerActionButtonBg: { backgroundColor: colors.dangerBg },
    emptyContainerCard: { backgroundColor: colors.cardBg, borderRadius: 12, padding: 40, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border, borderStyle: "dashed" },
    emptyContainerHeadline: { marginTop: 12, fontSize: 14, color: colors.textMuted, textAlign: "center" },
    modalScreenLayout: { flex: 1, backgroundColor: colors.cardBg },
    modalNavigationHeaderTopBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderColor: colors.border, backgroundColor: colors.cardBg },
    modalMainHeaderTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
    modalCloseTapZone: { padding: 4 },
    modalContentFormScrollingBody: { padding: 16, gap: 14 },
    formElementWrapperBlock: { gap: 4 },
    inlineFormElementRowHalfSplit: { flexDirection: "row", gap: 12 },
    fieldHeadingLabelText: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
    modalInputField: { borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 8, padding: 12, fontSize: 14, color: colors.inputText, backgroundColor: colors.inputBg },
    modalTextAreaElement: { minHeight: 70, textAlignVertical: "top" },
    modalFormPickerDropdown: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 8, padding: 12, backgroundColor: colors.inputBg, height: 44 },
    modalFormPickerDropdownText: { fontSize: 13, fontWeight: "600", color: colors.text },
    commitFormSubmitButton: { backgroundColor: colors.primary, padding: 14, borderRadius: 8, alignItems: "center", marginTop: 14 },
    commitButtonDisabled: { opacity: 0.4 },
    commitFormSubmitButtonText: { color: colors.primaryText, fontWeight: "700", fontSize: 14 },
    viewDetailsHeadlineText: { fontSize: 20, fontWeight: "800", color: colors.text },
    viewRowDetailMetadataBox: { borderBottomWidth: 1, borderColor: colors.borderLight, paddingBottom: 10, gap: 4 },
    viewRowDetailLabel: { fontSize: 12, fontWeight: "600", color: colors.textMuted, textTransform: "uppercase" },
    viewRowDetailPayload: { fontSize: 15, color: colors.text, lineHeight: 22 },
    modalOverlay: { flex: 1, backgroundColor: colors.overlayBg, justifyContent: "center", alignItems: "center" },
    pickerMenu: { backgroundColor: colors.cardBg, width: width * 0.8, borderRadius: 12, paddingVertical: 8, elevation: 5, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 10 },
    pickerItem: { paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  });
}

export default function AdminTravelCalendar() {
  const { uiTheme } = useTheme();
  const isDark = (uiTheme.theme as string) === "dark" || (uiTheme.theme as string) === "metallic-elite";
  const colors = useMemo(() => buildColors(uiTheme, isDark), [uiTheme, isDark]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [travelCalendars, setTravelCalendars] = useState<TravelCalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({});
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedCalendar, setSelectedCalendar] = useState<TravelCalendarItem | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [isPurposePickerOpen, setIsPurposePickerOpen] = useState(false);
  const [isStatusPickerOpen, setIsStatusPickerOpen] = useState(false);
  const [isVisibilityPickerOpen, setIsVisibilityPickerOpen] = useState(false);
  
  const [isFilterPurposePickerOpen, setIsFilterPurposePickerOpen] = useState(false);
  const [isFilterStatusPickerOpen, setIsFilterStatusPickerOpen] = useState(false);

  const [newTravelCalendar, setNewTravelCalendar] = useState({
    title: "",
    description: "",
    startDate: "",
    endDate: "",
    destination: "",
    purpose: "business",
    status: "planned",
    visibility: "team",
    budget: {
      estimated: 0,
      actual: 0,
      currency: "USD",
    },
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadTravelCalendars = async () => {
    try {
      setLoading(true);
      const response = await getTravelCalendarList(filters);
      if (response && response.items) {
        setTravelCalendars(response.items);
      } else if (response?.success && response?.data) {
        setTravelCalendars(response.data.items || []);
      } else {
        setTravelCalendars([]);
      }
    } catch (error) {
      console.error(error);
      Alert.alert("System Sync Failure", "Could not synchronize operational travel schedules.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTravelCalendars();
  }, [filters]);

  const handleDelete = (id: string) => {
    Alert.alert(
      "Confirm Removal",
      "Are you sure you want to permanently delete this travel calendar registry index item?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await travelCalendarApi.deleteTravelCalendar(id);
              if (response.success) {
                Alert.alert("Success", "Travel calendar log deleted successfully.");
                void loadTravelCalendars();
              } else {
                Alert.alert("Deletion Failure", response.error?.message || "Purge execution failed.");
              }
            } catch (error) {
              console.error(error);
              Alert.alert("Deletion Error", "Could not purge targeted item mapping.");
            }
          },
        },
      ]
    );
  };

  const handleEditPress = (calendar: TravelCalendarItem) => {
    setEditingId(calendar._id || calendar.id || null);
    setNewTravelCalendar({
      title: calendar.title || "",
      description: calendar.description || "",
      startDate: calendar.startDate ? calendar.startDate.split('T')[0] : "",
      endDate: calendar.endDate ? calendar.endDate.split('T')[0] : "",
      destination: calendar.destination || "",
      purpose: calendar.purpose || "business",
      status: calendar.status || "planned",
      visibility: calendar.visibility || "team",
      budget: {
        estimated: calendar.budget?.estimated || 0,
        actual: calendar.budget?.actual || 0,
        currency: calendar.budget?.currency || "USD",
      },
      notes: calendar.notes || "",
    });
    setShowCreateDialog(true);
  };

  const handleCreateOrUpdateTravelCalendar = async () => {
    setIsSubmitting(true);
    try {
      if (editingId) {
        const response = await travelCalendarApi.updateTravelCalendar(editingId, newTravelCalendar);
        if (response.success) {
          Alert.alert("Updated", "Travel calendar parameters matrix updated successfully.");
          closeAndResetForm();
          void loadTravelCalendars();
        } else {
          Alert.alert("Update Failed", response.error?.message || "Could not push parameters.");
        }
      } else {
        const response = await travelCalendarApi.createTravelCalendar(newTravelCalendar);
        if (response.success) {
          Alert.alert("Created", response.message || "Travel calendar created successfully");
          closeAndResetForm();
          void loadTravelCalendars();
        } else {
          Alert.alert("Creation Failed", response.error?.message || "Could not save parameters.");
        }
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Transaction Failure", "Failed to compile travel parameters matrix into runtime storage.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeAndResetForm = () => {
    setShowCreateDialog(false);
    setEditingId(null);
    setNewTravelCalendar({
      title: "",
      description: "",
      startDate: "",
      endDate: "",
      destination: "",
      purpose: "business",
      status: "planned",
      visibility: "team",
      budget: { estimated: 0, actual: 0, currency: "USD" },
      notes: "",
    });
  };

  const getStatusStyle = (status: string | undefined) => {
    switch (status) {
      case "planned": return { bg: "#DBEAFE", txt: "#1E40AF" };
      case "approved": return { bg: "#D1FAE5", txt: "#065F46" };
      case "in-progress": return { bg: "#FEF3C7", txt: "#92400E" };
      case "completed": return { bg: "#F3E8FF", txt: "#6B21A8" };
      case "cancelled": return { bg: "#FEE2E2", txt: "#991B1B" };
      default: return { bg: colors.borderLight, txt: colors.textSecondary };
    }
  };

  const getPurposeStyle = (purpose: string | undefined) => {
    switch (purpose) {
      case "business": return { bg: "#EFF6FF", txt: "#1D4ED8" };
      case "conference": return { bg: "#F3E8FF", txt: "#7E22CE" };
      case "meeting": return { bg: "#ECFDF5", txt: "#047857" };
      case "training": return { bg: "#FFEDD5", txt: "#C2410C" };
      case "personal": return { bg: "#FCE7F3", txt: "#BE185D" };
      default: return { bg: colors.borderLight, txt: colors.textSecondary };
    }
  };

  const safeFormatDate = (dateStr: string | undefined) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return Number.isFinite(d.getTime()) ? format(d, "MMM dd, yyyy") : dateStr;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flexWrapper}>
        
        <ScrollView contentContainerStyle={styles.mainScrollPadding}>
          <View style={styles.headerLayoutRow}>
            <View style={styles.flexItem}>
              <Text style={styles.mainTitle}>Travel Calendar</Text>
              <Text style={styles.subTitle}>Manage all global travel schedules logs maps</Text>
            </View>
            <TouchableOpacity style={styles.addTriggerButton} onPress={() => setShowCreateDialog(true)}>
              <Plus size={16} color={colors.primaryText} />
              <Text style={styles.addTriggerButtonText}>Add Travel</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.cardWrapper}>
            <View style={styles.cardHeaderInline}>
              <Filter size={18} color={colors.text} />
              <Text style={styles.cardHeaderTitle}>Operational Filters</Text>
            </View>
            
            <View style={styles.filtersFormGrid}>
              <View style={styles.inputColHalf}>
                <Text style={styles.fieldLabel}>Start Limit Date</Text>
                <TextInput style={styles.inputFieldElement} placeholder="YYYY-MM-DD" value={filters.startDate || ""} onChangeText={(t) => setFilters({ ...filters, startDate: t })} placeholderTextColor={colors.placeholderText} />
              </View>
              <View style={styles.inputColHalf}>
                <Text style={styles.fieldLabel}>End Limit Date</Text>
                <TextInput style={styles.inputFieldElement} placeholder="YYYY-MM-DD" value={filters.endDate || ""} onChangeText={(t) => setFilters({ ...filters, endDate: t })} placeholderTextColor={colors.placeholderText} />
              </View>
              <View style={styles.inputColHalf}>
                <Text style={styles.fieldLabel}>Filter Status</Text>
                <TouchableOpacity style={styles.customNativeDropdown} onPress={() => setIsFilterStatusPickerOpen(true)}>
                  <Text style={styles.customNativeDropdownText}>{filters.status || "All Statuses"}</Text>
                  <ChevronDown size={14} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
              <View style={styles.inputColHalf}>
                <Text style={styles.fieldLabel}>Filter Purpose</Text>
                <TouchableOpacity style={styles.customNativeDropdown} onPress={() => setIsFilterPurposePickerOpen(true)}>
                  <Text style={styles.customNativeDropdownText}>{filters.purpose || "All Purposes"}</Text>
                  <ChevronDown size={14} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <Text style={styles.registrySectionHeader}>Schedules Registries ({travelCalendars.length})</Text>
          
          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} style={styles.loaderBufferSpacing} />
          ) : (
            travelCalendars.map((calendar) => {
              const currentId = calendar._id || calendar.id || "";
              const statusCol = getStatusStyle(calendar.status);
              const purposeCol = getPurposeStyle(calendar.purpose);
              return (
                <View key={currentId} style={styles.registryRecordCard}>
                  <View style={styles.recordContentBlock}>
                    <Text style={styles.recordMainHeadline}>{calendar.title}</Text>
                    
                    <View style={styles.badgesWrapperRowInline}>
                      <View style={[styles.statusBadgeCapsule, { backgroundColor: statusCol.bg }]}>
                        <Text style={[styles.statusBadgeText, { color: statusCol.txt }]}>{calendar.status}</Text>
                      </View>
                      <View style={[styles.statusBadgeCapsule, { backgroundColor: purposeCol.bg }]}>
                        <Text style={[styles.statusBadgeText, { color: purposeCol.txt }]}>{calendar.purpose}</Text>
                      </View>
                    </View>

                    <View style={styles.metaInformationRowInlineGap}>
                      <CalendarIcon size={14} color={colors.textMuted} />
                      <Text style={styles.metaInformationRowInlineText}>
                        {safeFormatDate(calendar.startDate)} - {safeFormatDate(calendar.endDate)}
                      </Text>
                    </View>

                    <View style={styles.metaInformationRowInlineGap}>
                      <MapPin size={14} color={colors.textMuted} />
                      <Text style={styles.metaInformationRowInlineText} numberOfLines={1}>{calendar.destination}</Text>
                    </View>

                    {calendar.budget && calendar.budget.estimated > 0 && (
                      <View style={styles.metaInformationRowInlineGap}>
                        <DollarSign size={14} color="#16A34A" />
                        <Text style={[styles.metaInformationRowInlineText, { color: "#16A34A", fontWeight: "600" }]}>
                          Est Budget: {calendar.budget.currency} {calendar.budget.estimated}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.recordActionControlColumn}>
                    <TouchableOpacity style={styles.inlineActionButtonSquare} onPress={() => { setSelectedCalendar(calendar); setShowViewDialog(true); }}>
                      <Eye size={16} color={colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.inlineActionButtonSquare} onPress={() => handleEditPress(calendar)}>
                      <Edit size={16} color={colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.inlineActionButtonSquare, styles.dangerActionButtonBg]} onPress={() => handleDelete(currentId)}>
                      <Trash2 size={16} color={colors.dangerText} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}

          {!loading && travelCalendars.length === 0 && (
            <View style={styles.emptyContainerCard}>
              <CalendarIcon size={44} color={colors.placeholderText} />
              <Text style={styles.emptyContainerHeadline}>No active travel logs parsed out matching query matrix.</Text>
            </View>
          )}
        </ScrollView>

        <Modal visible={showCreateDialog} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeAndResetForm}>
          <SafeAreaView style={styles.modalScreenLayout}>
            <View style={styles.modalNavigationHeaderTopBar}>
              <Text style={styles.modalMainHeaderTitle}>
                {editingId ? "Update Travel Calendar Entry" : "Create Travel Calendar Entry"}
              </Text>
              <TouchableOpacity onPress={closeAndResetForm} style={styles.modalCloseTapZone}>
                <X size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalContentFormScrollingBody}>
              <View style={styles.formElementWrapperBlock}>
                <Text style={styles.fieldHeadingLabelText}>Calendar Log Title *</Text>
                <TextInput style={styles.modalInputField} placeholder="e.g. Q3 EMEA General Leadership Summit" value={newTravelCalendar.title} onChangeText={(t) => setNewTravelCalendar({ ...newTravelCalendar, title: t })} placeholderTextColor={colors.placeholderText} />
              </View>

              <View style={styles.formElementWrapperBlock}>
                <Text style={styles.fieldHeadingLabelText}>Destination *</Text>
                <TextInput style={styles.modalInputField} placeholder="e.g. London, United Kingdom" value={newTravelCalendar.destination} onChangeText={(t) => setNewTravelCalendar({ ...newTravelCalendar, destination: t })} placeholderTextColor={colors.placeholderText} />
              </View>

              <View style={styles.inlineFormElementRowHalfSplit}>
                <View style={styles.flexItem}>
                  <Text style={styles.fieldHeadingLabelText}>Start Date *</Text>
                  <TextInput style={styles.modalInputField} placeholder="YYYY-MM-DD" value={newTravelCalendar.startDate} onChangeText={(t) => setNewTravelCalendar({ ...newTravelCalendar, startDate: t })} placeholderTextColor={colors.placeholderText} />
                </View>
                <View style={styles.flexItem}>
                  <Text style={styles.fieldHeadingLabelText}>End Date *</Text>
                  <TextInput style={styles.modalInputField} placeholder="YYYY-MM-DD" value={newTravelCalendar.endDate} onChangeText={(t) => setNewTravelCalendar({ ...newTravelCalendar, endDate: t })} placeholderTextColor={colors.placeholderText} />
                </View>
              </View>

              <View style={styles.inlineFormElementRowHalfSplit}>
                <View style={styles.flexItem}>
                  <Text style={styles.fieldHeadingLabelText}>Purpose Category</Text>
                  <TouchableOpacity style={styles.modalFormPickerDropdown} onPress={() => setIsPurposePickerOpen(true)}>
                    <Text style={styles.modalFormPickerDropdownText}>{newTravelCalendar.purpose.toUpperCase()}</Text>
                    <ChevronDown size={14} color={colors.text} />
                  </TouchableOpacity>
                </View>
                <View style={styles.flexItem}>
                  <Text style={styles.fieldHeadingLabelText}>Visibility Range</Text>
                  <TouchableOpacity style={styles.modalFormPickerDropdown} onPress={() => setIsVisibilityPickerOpen(true)}>
                    <Text style={styles.modalFormPickerDropdownText}>{newTravelCalendar.visibility.toUpperCase()}</Text>
                    <ChevronDown size={14} color={colors.text} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inlineFormElementRowHalfSplit}>
                <View style={styles.flexItem}>
                  <Text style={styles.fieldHeadingLabelText}>Execution Status</Text>
                  <TouchableOpacity style={styles.modalFormPickerDropdown} onPress={() => setIsStatusPickerOpen(true)}>
                    <Text style={styles.modalFormPickerDropdownText}>{newTravelCalendar.status.toUpperCase()}</Text>
                    <ChevronDown size={14} color={colors.text} />
                  </TouchableOpacity>
                </View>
                <View style={styles.flexItem}>
                  <Text style={styles.fieldHeadingLabelText}>Estimated Budget (USD)</Text>
                  <TextInput style={styles.modalInputField} keyboardType="numeric" value={newTravelCalendar.budget.estimated ? String(newTravelCalendar.budget.estimated) : ""} onChangeText={(t) => setNewTravelCalendar({ ...newTravelCalendar, budget: { ...newTravelCalendar.budget, estimated: Number(t) || 0 } })} placeholder="0" placeholderTextColor={colors.placeholderText} />
                </View>
              </View>

              <View style={styles.formElementWrapperBlock}>
                <Text style={styles.fieldHeadingLabelText}>Trip Description Summary</Text>
                <TextInput style={[styles.modalInputField, styles.modalTextAreaElement]} multiline numberOfLines={3} placeholder="Provide overview text matrix tracking parameters..." value={newTravelCalendar.description} onChangeText={(t) => setNewTravelCalendar({ ...newTravelCalendar, description: t })} placeholderTextColor={colors.placeholderText} />
              </View>

              <TouchableOpacity style={[styles.commitFormSubmitButton, (!newTravelCalendar.title || !newTravelCalendar.destination) && styles.commitButtonDisabled]} disabled={isSubmitting || !newTravelCalendar.title || !newTravelCalendar.destination} onPress={() => { void handleCreateOrUpdateTravelCalendar(); }}>
                <Text style={styles.commitFormSubmitButtonText}>
                  {isSubmitting ? "Compiling Registries..." : editingId ? "Save Dynamic System Updates" : "Commit Travel Schedule Parameters"}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </Modal>

        <Modal visible={showViewDialog} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowViewDialog(false)}>
          <SafeAreaView style={styles.modalScreenLayout}>
            <View style={styles.modalNavigationHeaderTopBar}>
              <Text style={styles.modalMainHeaderTitle}>Detailed Travel Profile Matrix</Text>
              <TouchableOpacity onPress={() => setShowViewDialog(false)} style={styles.modalCloseTapZone}>
                <X size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            {selectedCalendar && (
              <ScrollView contentContainerStyle={styles.modalContentFormScrollingBody}>
                <Text style={styles.viewDetailsHeadlineText}>{selectedCalendar.title}</Text>
                
                <View style={[styles.badgesWrapperRowInline, { marginVertical: 10 }]}>
                  <View style={[styles.statusBadgeCapsule, { backgroundColor: getStatusStyle(selectedCalendar.status).bg }]}><Text style={[styles.statusBadgeText, { color: getStatusStyle(selectedCalendar.status).txt }]}>{selectedCalendar.status?.toUpperCase()}</Text></View>
                  <View style={[styles.statusBadgeCapsule, { backgroundColor: getPurposeStyle(selectedCalendar.purpose).bg }]}><Text style={[styles.statusBadgeText, { color: getPurposeStyle(selectedCalendar.purpose).txt }]}>{selectedCalendar.purpose?.toUpperCase()}</Text></View>
                </View>

                <View style={styles.viewRowDetailMetadataBox}>
                  <Text style={styles.viewRowDetailLabel}>Destination Location Space</Text>
                  <Text style={styles.viewRowDetailPayload}>{selectedCalendar.destination}</Text>
                </View>

                <View style={styles.viewRowDetailMetadataBox}>
                  <Text style={styles.viewRowDetailLabel}>Active Timeline Scope</Text>
                  <Text style={styles.viewRowDetailPayload}>{safeFormatDate(selectedCalendar.startDate)} to {safeFormatDate(selectedCalendar.endDate)}</Text>
                </View>

                {selectedCalendar.description && (
                  <View style={styles.viewRowDetailMetadataBox}>
                    <Text style={styles.viewRowDetailLabel}>Operational Context Abstract Description</Text>
                    <Text style={styles.viewRowDetailPayload}>{selectedCalendar.description}</Text>
                  </View>
                )}

                {selectedCalendar.notes && (
                  <View style={styles.viewRowDetailMetadataBox}>
                    <Text style={styles.viewRowDetailLabel}>Internal Memo Notes</Text>
                    <Text style={styles.viewRowDetailPayload}>{selectedCalendar.notes}</Text>
                  </View>
                )}
              </ScrollView>
            )}
          </SafeAreaView>
        </Modal>

        {/* Filter Status Modal Selector */}
        <Modal visible={isFilterStatusPickerOpen} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.pickerMenu}>
              <TouchableOpacity style={styles.pickerItem} onPress={() => { setFilters({ ...filters, status: undefined }); setIsFilterStatusPickerOpen(false); }}>
                <Text style={{ fontSize: 16, color: colors.textMuted }}>All Statuses</Text>
              </TouchableOpacity>
              {["planned", "approved", "in-progress", "completed", "cancelled"].map((s) => (
                <TouchableOpacity key={s} style={styles.pickerItem} onPress={() => { setFilters({ ...filters, status: s }); setIsFilterStatusPickerOpen(false); }}>
                  <Text style={{ textTransform: 'capitalize', fontSize: 16, color: colors.text }}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Modal>

        {/* Filter Purpose Modal Selector */}
        <Modal visible={isFilterPurposePickerOpen} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.pickerMenu}>
              <TouchableOpacity style={styles.pickerItem} onPress={() => { setFilters({ ...filters, purpose: undefined }); setIsFilterPurposePickerOpen(false); }}>
                <Text style={{ fontSize: 16, color: colors.textMuted }}>All Purposes</Text>
              </TouchableOpacity>
              {["business", "conference", "meeting", "training", "personal"].map((p) => (
                <TouchableOpacity key={p} style={styles.pickerItem} onPress={() => { setFilters({ ...filters, purpose: p }); setIsFilterPurposePickerOpen(false); }}>
                  <Text style={{ textTransform: 'capitalize', fontSize: 16, color: colors.text }}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Modal>

        {/* Form Creation Purpose Selector */}
        <Modal visible={isPurposePickerOpen} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.pickerMenu}>
              {["business", "conference", "meeting", "training", "personal"].map((p) => (
                <TouchableOpacity key={p} style={styles.pickerItem} onPress={() => { setNewTravelCalendar({ ...newTravelCalendar, purpose: p }); setIsPurposePickerOpen(false); }}>
                  <Text style={{ textTransform: 'capitalize', fontSize: 16, color: colors.text }}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Modal>

        {/* Form Creation Status Selector */}
        <Modal visible={isStatusPickerOpen} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.pickerMenu}>
              {["planned", "approved", "in-progress", "completed", "cancelled"].map((s) => (
                <TouchableOpacity key={s} style={styles.pickerItem} onPress={() => { setNewTravelCalendar({ ...newTravelCalendar, status: s }); setIsStatusPickerOpen(false); }}>
                  <Text style={{ textTransform: 'capitalize', fontSize: 16, color: colors.text }}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Modal>

        {/* Form Creation Visibility Selector */}
        <Modal visible={isVisibilityPickerOpen} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.pickerMenu}>
              {["private", "team", "department", "company"].map((v) => (
                <TouchableOpacity key={v} style={styles.pickerItem} onPress={() => { setNewTravelCalendar({ ...newTravelCalendar, visibility: v }); setIsVisibilityPickerOpen(false); }}>
                  <Text style={{ textTransform: 'capitalize', fontSize: 16, color: colors.text }}>{v}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Modal>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}