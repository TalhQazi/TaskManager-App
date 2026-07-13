import React, { useState, useEffect } from "react";
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
import Colors from "@/constants/colors";

export default function AdminTravelCalendar() {
  const [travelCalendars, setTravelCalendars] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<any>({});
  
  // Modal Visibility Controllers
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedCalendar, setSelectedCalendar] = useState<any>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

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

  // Load travel calendars data stream
  const loadTravelCalendars = async () => {
    try {
      setLoading(true);
      const response = await getTravelCalendarList(filters);
      // Fallback evaluation structure if raw data payload returns directly 
      if (response && response.items) {
        setTravelCalendars(response.items);
      } else if (response?.success && response?.data) {
        setTravelCalendars(response.data.items || []);
      } else {
        setTravelCalendars([]);
      }
    } catch (error) {
      console.error("Failed to load travel calendars:", error);
      Alert.alert("System Sync Failure", "Could not synchronize operational travel schedules.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTravelCalendars();
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
                loadTravelCalendars();
              } else {
                Alert.alert("Deletion Failure", response.error?.message || "Purge execution failed.");
              }
            } catch (error) {
              console.error("Failed to delete travel calendar:", error);
              Alert.alert("Deletion Error", "Could not purge targeted item mapping.");
            }
          },
        },
      ]
    );
  };

  // Pre-fill parameters and open edit context mode
  const handleEditPress = (calendar: any) => {
    setEditingId(calendar._id || calendar.id);
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
        // Edit flow routing path
        const response = await travelCalendarApi.updateTravelCalendar(editingId, newTravelCalendar);
        if (response.success) {
          Alert.alert("Updated", "Travel calendar parameters matrix updated successfully.");
          closeAndResetForm();
          loadTravelCalendars();
        } else {
          Alert.alert("Update Failed", response.error?.message || "Could not push parameters.");
        }
      } else {
        // Create flow routing path
        const response = await travelCalendarApi.createTravelCalendar(newTravelCalendar);
        if (response.success) {
          Alert.alert("Created", response.message || "Travel calendar created successfully");
          closeAndResetForm();
          loadTravelCalendars();
        } else {
          Alert.alert("Creation Failed", response.error?.message || "Could not save parameters.");
        }
      }
    } catch (error) {
      console.error("Failed to compile travel calendar payload:", error);
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

  // Dynamic native color maps
  const getStatusStyle = (status: string) => {
    switch (status) {
      case "planned": return { bg: "#DBEAFE", txt: "#1E40AF" };
      case "approved": return { bg: "#D1FAE5", txt: "#065F46" };
      case "in-progress": return { bg: "#FEF3C7", txt: "#92400E" };
      case "completed": return { bg: "#F3E8FF", txt: "#6B21A8" };
      case "cancelled": return { bg: "#FEE2E2", txt: "#991B1B" };
      default: return { bg: "#F1F5F9", txt: "#334155" };
    }
  };

  const getPurposeStyle = (purpose: string) => {
    switch (purpose) {
      case "business": return { bg: "#EFF6FF", txt: "#1D4ED8" };
      case "conference": return { bg: "#F3E8FF", txt: "#7E22CE" };
      case "meeting": return { bg: "#ECFDF5", txt: "#047857" };
      case "training": return { bg: "#FFEDD5", txt: "#C2410C" };
      case "personal": return { bg: "#FCE7F3", txt: "#BE185D" };
      default: return { bg: "#F8FAFC", txt: "#475569" };
    }
  };

  // Dialog-free cross platform Native Alert Pickers
  const showPurposePicker = (isFilter: boolean) => {
    const options = ["business", "conference", "meeting", "training", "personal"];
    Alert.alert(
      "Select Trip Purpose",
      "Assign structural operational travel target indices:",
      [
        ...(isFilter ? [{ text: "All Purposes", onPress: () => setFilters({ ...filters, purpose: undefined }) }] : []),
        ...options.map((p) => ({
          text: p.toUpperCase(),
          onPress: () => isFilter ? setFilters({ ...filters, purpose: p }) : setNewTravelCalendar({ ...newTravelCalendar, purpose: p }),
        })),
      ]
    );
  };

  const showStatusPicker = (isFilter: boolean) => {
    const options = ["planned", "approved", "in-progress", "completed", "cancelled"];
    Alert.alert(
      "Select Assignment Status",
      "Assign workflow lifecycle configuration indices:",
      [
        ...(isFilter ? [{ text: "All Statuses", onPress: () => setFilters({ ...filters, status: undefined }) }] : []),
        ...options.map((s) => ({
          text: s.toUpperCase(),
          onPress: () => isFilter ? setFilters({ ...filters, status: s }) : setNewTravelCalendar({ ...newTravelCalendar, status: s }),
        })),
      ]
    );
  };

  const showVisibilityPicker = () => {
    const options = ["private", "team", "department", "company"];
    Alert.alert("Select Target Visibility", "Configure operational container access visibility:", 
      options.map((v) => ({
        text: v.toUpperCase(),
        onPress: () => setNewTravelCalendar({ ...newTravelCalendar, visibility: v }),
      }))
    );
  };

  const safeFormatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return Number.isFinite(d.getTime()) ? format(d, "MMM dd, yyyy") : dateStr;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flexWrapper}>
        
        <ScrollView contentContainerStyle={styles.mainScrollPadding}>
          {/* Header Segment */}
          <View style={styles.headerLayoutRow}>
            <View style={styles.flexItem}>
              <Text style={styles.mainTitle}>Travel Calendar</Text>
              <Text style={styles.subTitle}>Manage all global travel schedules logs maps</Text>
            </View>
            <TouchableOpacity style={styles.addTriggerButton} onPress={() => setShowCreateDialog(true)}>
              <Plus size={16} color="#FFFFFF" />
              <Text style={styles.addTriggerButtonText}>Add Travel</Text>
            </TouchableOpacity>
          </View>

          {/* Collapsible Filter Panel Engine Card */}
          <View style={styles.cardWrapper}>
            <View style={styles.cardHeaderInline}>
              <Filter size={18} color="#475569" />
              <Text style={styles.cardHeaderTitle}>Operational Filters</Text>
            </View>
            
            <View style={styles.filtersFormGrid}>
              <View style={styles.inputColHalf}>
                <Text style={styles.fieldLabel}>Start Limit Date</Text>
                <TextInput style={styles.inputFieldElement} placeholder="YYYY-MM-DD" value={filters.startDate || ""} onChangeText={(t) => setFilters({ ...filters, startDate: t })} placeholderTextColor="#94A3B8" />
              </View>
              <View style={styles.inputColHalf}>
                <Text style={styles.fieldLabel}>End Limit Date</Text>
                <TextInput style={styles.inputFieldElement} placeholder="YYYY-MM-DD" value={filters.endDate || ""} onChangeText={(t) => setFilters({ ...filters, endDate: t })} placeholderTextColor="#94A3B8" />
              </View>
              <View style={styles.inputColHalf}>
                <Text style={styles.fieldLabel}>Filter Status</Text>
                <TouchableOpacity style={styles.customNativeDropdown} onPress={() => showStatusPicker(true)}>
                  <Text style={styles.customNativeDropdownText}>{filters.status || "All Statuses"}</Text>
                  <ChevronDown size={14} color="#64748B" />
                </TouchableOpacity>
              </View>
              <View style={styles.inputColHalf}>
                <Text style={styles.fieldLabel}>Filter Purpose</Text>
                <TouchableOpacity style={styles.customNativeDropdown} onPress={() => showPurposePicker(true)}>
                  <Text style={styles.customNativeDropdownText}>{filters.purpose || "All Purposes"}</Text>
                  <ChevronDown size={14} color="#64748B" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Core Dataset Map Stream View */}
          <Text style={styles.registrySectionHeader}>Schedules Registries ({travelCalendars.length})</Text>
          
          {loading ? (
            <ActivityIndicator size="large" color="#2563EB" style={styles.loaderBufferSpacing} />
          ) : (
            travelCalendars.map((calendar: any) => {
              const currentId = calendar._id || calendar.id;
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
                      <CalendarIcon size={14} color="#64748B" />
                      <Text style={styles.metaInformationRowInlineText}>
                        {safeFormatDate(calendar.startDate)} - {safeFormatDate(calendar.endDate)}
                      </Text>
                    </View>

                    <View style={styles.metaInformationRowInlineGap}>
                      <MapPin size={14} color="#64748B" />
                      <Text style={styles.metaInformationRowInlineText} numberOfLines={1}>{calendar.destination}</Text>
                    </View>

                    {calendar.budget?.estimated > 0 && (
                      <View style={styles.metaInformationRowInlineGap}>
                        <DollarSign size={14} color="#16A34A" />
                        <Text style={[styles.metaInformationRowInlineText, { color: "#16A34A", fontWeight: "600" }]}>
                          Est Budget: {calendar.budget.currency} {calendar.budget.estimated}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Horizontal Action Bars */}
                  <View style={styles.recordActionControlColumn}>
                    <TouchableOpacity style={styles.inlineActionButtonSquare} onPress={() => { setSelectedCalendar(calendar); setShowViewDialog(true); }}>
                      <Eye size={16} color="#475569" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.inlineActionButtonSquare} onPress={() => handleEditPress(calendar)}>
                      <Edit size={16} color="#475569" />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.inlineActionButtonSquare, styles.dangerActionButtonBg]} onPress={() => handleDelete(currentId)}>
                      <Trash2 size={16} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}

          {!loading && travelCalendars.length === 0 && (
            <View style={styles.emptyContainerCard}>
              <CalendarIcon size={44} color="#94A3B8" />
              <Text style={styles.emptyContainerHeadline}>No active travel logs parsed out matching query matrix.</Text>
            </View>
          )}
        </ScrollView>

        {/* Input & Edit Form Modal Sheet */}
        <Modal visible={showCreateDialog} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeAndResetForm}>
          <SafeAreaView style={styles.modalScreenLayout}>
            <View style={styles.modalNavigationHeaderTopBar}>
              <Text style={styles.modalMainHeaderTitle}>
                {editingId ? "Update Travel Calendar Entry" : "Create Travel Calendar Entry"}
              </Text>
              <TouchableOpacity onPress={closeAndResetForm} style={styles.modalCloseTapZone}>
                <X size={22} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalContentFormScrollingBody}>
              <View style={styles.formElementWrapperBlock}>
                <Text style={styles.fieldHeadingLabelText}>Calendar Log Title *</Text>
                <TextInput style={styles.modalInputField} placeholder="e.g. Q3 EMEA General Leadership Summit" value={newTravelCalendar.title} onChangeText={(t) => setNewTravelCalendar({ ...newTravelCalendar, title: t })} placeholderTextColor="#94A3B8" />
              </View>

              <View style={styles.formElementWrapperBlock}>
                <Text style={styles.fieldHeadingLabelText}>Destination *</Text>
                <TextInput style={styles.modalInputField} placeholder="e.g. London, United Kingdom" value={newTravelCalendar.destination} onChangeText={(t) => setNewTravelCalendar({ ...newTravelCalendar, destination: t })} placeholderTextColor="#94A3B8" />
              </View>

              <View style={styles.inlineFormElementRowHalfSplit}>
                <View style={styles.flexItem}>
                  <Text style={styles.fieldHeadingLabelText}>Start Date *</Text>
                  <TextInput style={styles.modalInputField} placeholder="YYYY-MM-DD" value={newTravelCalendar.startDate} onChangeText={(t) => setNewTravelCalendar({ ...newTravelCalendar, startDate: t })} placeholderTextColor="#94A3B8" />
                </View>
                <View style={styles.flexItem}>
                  <Text style={styles.fieldHeadingLabelText}>End Date *</Text>
                  <TextInput style={styles.modalInputField} placeholder="YYYY-MM-DD" value={newTravelCalendar.endDate} onChangeText={(t) => setNewTravelCalendar({ ...newTravelCalendar, endDate: t })} placeholderTextColor="#94A3B8" />
                </View>
              </View>

              <View style={styles.inlineFormElementRowHalfSplit}>
                <View style={styles.flexItem}>
                  <Text style={styles.fieldHeadingLabelText}>Purpose Category</Text>
                  <TouchableOpacity style={styles.modalFormPickerDropdown} onPress={() => showPurposePicker(false)}>
                    <Text style={styles.modalFormPickerDropdownText}>{newTravelCalendar.purpose.toUpperCase()}</Text>
                    <ChevronDown size={14} color="#475569" />
                  </TouchableOpacity>
                </View>
                <View style={styles.flexItem}>
                  <Text style={styles.fieldHeadingLabelText}>Visibility Range</Text>
                  <TouchableOpacity style={styles.modalFormPickerDropdown} onPress={() => showVisibilityPicker()}>
                    <Text style={styles.modalFormPickerDropdownText}>{newTravelCalendar.visibility.toUpperCase()}</Text>
                    <ChevronDown size={14} color="#475569" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inlineFormElementRowHalfSplit}>
                <View style={styles.flexItem}>
                  <Text style={styles.fieldHeadingLabelText}>Execution Status</Text>
                  <TouchableOpacity style={styles.modalFormPickerDropdown} onPress={() => showStatusPicker(false)}>
                    <Text style={styles.modalFormPickerDropdownText}>{newTravelCalendar.status.toUpperCase()}</Text>
                    <ChevronDown size={14} color="#475569" />
                  </TouchableOpacity>
                </View>
                <View style={styles.flexItem}>
                  <Text style={styles.fieldHeadingLabelText}>Estimated Budget (USD)</Text>
                  <TextInput style={styles.modalInputField} keyboardType="numeric" value={newTravelCalendar.budget.estimated ? String(newTravelCalendar.budget.estimated) : ""} onChangeText={(t) => setNewTravelCalendar({ ...newTravelCalendar, budget: { ...newTravelCalendar.budget, estimated: Number(t) || 0 } })} placeholder="0" placeholderTextColor="#94A3B8" />
                </View>
              </View>

              <View style={styles.formElementWrapperBlock}>
                <Text style={styles.fieldHeadingLabelText}>Trip Description Summary</Text>
                <TextInput style={[styles.modalInputField, styles.modalTextAreaElement]} multiline numberOfLines={3} placeholder="Provide structural overview context tracking indices..." value={newTravelCalendar.description} onChangeText={(t) => setNewTravelCalendar({ ...newTravelCalendar, description: t })} placeholderTextColor="#94A3B8" />
              </View>

              <TouchableOpacity style={[styles.commitFormSubmitButton, (!newTravelCalendar.title || !newTravelCalendar.destination) && styles.commitButtonDisabled]} disabled={isSubmitting || !newTravelCalendar.title || !newTravelCalendar.destination} onPress={handleCreateOrUpdateTravelCalendar}>
                <Text style={styles.commitFormSubmitButtonText}>
                  {isSubmitting ? "Compiling Registries..." : editingId ? "Save Dynamic System Updates" : "Commit Travel Schedule Parameters"}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </Modal>

        {/* View Extended Details Sheet Overlay */}
        <Modal visible={showViewDialog} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowViewDialog(false)}>
          <SafeAreaView style={styles.modalScreenLayout}>
            <View style={styles.modalNavigationHeaderTopBar}>
              <Text style={styles.modalMainHeaderTitle}>Detailed Travel Profile Matrix</Text>
              <TouchableOpacity onPress={() => setShowViewDialog(false)} style={styles.modalCloseTapZone}>
                <X size={22} color="#0F172A" />
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

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  flexWrapper: { flex: 1 },
  flexItem: { flex: 1 },
  mainScrollPadding: { padding: 16, paddingBottom: 40 },
  headerLayoutRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20, gap: 12 },
  mainTitle: { fontSize: 24, fontWeight: "800", color: Colors.surface },
  subTitle: { fontSize: 13, color: "#64748B", marginTop: 2 },
  addTriggerButton: { flexDirection: "row", alignItems: "center", backgroundColor: "#2563EB", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, gap: 6 },
  addTriggerButtonText: { color: "#FFFFFF", fontWeight: "600", fontSize: 13 },
  cardWrapper: { backgroundColor: Colors.background, borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: "#E2E8F0" },
  cardHeaderInline: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  cardHeaderTitle: { fontSize: 15, fontWeight: "700", color: Colors.surface },
  filtersFormGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  inputColHalf: { width: "48%" },
  fieldLabel: { fontSize: 12, fontWeight: "600", color: Colors.surface, marginBottom: 4 },
  inputFieldElement: { borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: "#0F172A", backgroundColor: "#FFFFFF" },
  customNativeDropdown: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#F8FAFC" },
  customNativeDropdownText: { fontSize: 13, color: "#334155", textTransform: "capitalize" },
  registrySectionHeader: { fontSize: 14, fontWeight: "700", color: Colors.surface, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 },
  loaderBufferSpacing: { paddingVertical: 40 },
  registryRecordCard: { backgroundColor: Colors.background, borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: "#E2E8F0", flexDirection: "row", justifyContent: "space-between", gap: 12 },
  recordContentBlock: { flex: 1, gap: 6 },
  recordMainHeadline: { fontSize: 16, fontWeight: "700", color: Colors.surface },
  badgesWrapperRowInline: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  statusBadgeCapsule: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusBadgeText: { fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
  metaInformationRowInlineGap: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  metaInformationRowInlineText: { fontSize: 13, color: "#475569" },
  recordActionControlColumn: { justifyContent: "space-between", alignItems: "flex-end", minHeight: 90 },
  inlineActionButtonSquare: { width: 32, height: 32, borderRadius: 6, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },
  dangerActionButtonBg: { backgroundColor: "#FEE2E2" },
  emptyContainerCard: { backgroundColor: "#FFFFFF", borderRadius: 12, padding: 40, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#E2E8F0", borderStyle: "dashed" },
  emptyContainerHeadline: { marginTop: 12, fontSize: 14, color: "#64748B", textAlign: "center" },
  modalScreenLayout: { flex: 1, backgroundColor: "#FFFFFF" },
  modalNavigationHeaderTopBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderColor: "#E2E8F0" },
  modalMainHeaderTitle: { fontSize: 17, fontWeight: "700", color: "#0F172A" },
  modalCloseTapZone: { padding: 4 },
  modalContentFormScrollingBody: { padding: 16, gap: 14 },
  formElementWrapperBlock: { gap: 4 },
  inlineFormElementRowHalfSplit: { flexDirection: "row", gap: 12 },
  fieldHeadingLabelText: { fontSize: 13, fontWeight: "600", color: "#334155" },
  modalInputField: { borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 8, padding: 12, fontSize: 14, color: "#0F172A", backgroundColor: "#FFFFFF" },
  modalTextAreaElement: { minHeight: 70, textAlignVertical: "top" },
  modalFormPickerDropdown: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 8, padding: 12, backgroundColor: "#F8FAFC" },
  modalFormPickerDropdownText: { fontSize: 13, fontWeight: "600", color: "#475569" },
  commitFormSubmitButton: { backgroundColor: "#2563EB", padding: 14, borderRadius: 8, alignItems: "center", marginTop: 14 },
  commitButtonDisabled: { backgroundColor: "#94A3B8" },
  commitFormSubmitButtonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
  viewDetailsHeadlineText: { fontSize: 20, fontWeight: "800", color: "#0F172A" },
  viewRowDetailMetadataBox: { borderBottomWidth: 1, borderColor: "#F1F5F9", paddingBottom: 10, gap: 4 },
  viewRowDetailLabel: { fontSize: 12, fontWeight: "600", color: "#64748B", textTransform: "uppercase" },
  viewRowDetailPayload: { fontSize: 15, color: "#1E293B", lineHeight: 22 },
});