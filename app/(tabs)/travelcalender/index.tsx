import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  Modal,
  ScrollView,
  Alert,
} from "react-native";
import { Calendar, MapPin, DollarSign, Eye, X, Filter, ChevronDown, Check } from "lucide-react-native";
import { apiFetch } from "@/lib/admin/apiClient";

// --- Type Defs ---
interface BudgetConfig {
  estimated: number;
  currency: string;
}

interface TravelCalendar {
  _id: string;
  title: string;
  status: "planned" | "approved" | "in-progress" | "completed" | "cancelled" | string;
  purpose: "business" | "conference" | "meeting" | "training" | "personal" | string;
  startDate: string;
  endDate: string;
  destination: string;
  description?: string;
  notes?: string;
  budget: BudgetConfig;
}

interface TravelCalendarFilters {
  startDate?: string;
  endDate?: string;
  status?: string;
}

// Fixed Premium Palette Definitions
const THEME = {
  bgCanvas: "#09090b",       // Pure deep zinc black
  bgSurface: "#18181b",      // Card surface zinc
  bgElevated: "#27272a",     // Dropdowns/Modals top layer
  primary: "#ffd27a",        // Premium gold accent
  textPrimary: "#f4f4f5",    // Crisp white-gray
  textSecondary: "#a1a1aa",  // Muted gray
  textMuted: "#52525b",      // Deep muted placeholder gray
  border: "#27272a",         // Subdued border
  borderFocus: "#3f3f46",    // High contrast structural lines
};

export default function EmployeeTravelCalendar() {
  const [travelCalendars, setTravelCalendars] = useState<TravelCalendar[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<TravelCalendarFilters>({});
  const [selectedCalendar, setSelectedCalendar] = useState<TravelCalendar | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);

  const loadTravelCalendars = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);
      if (filters.status) params.append("status", filters.status);
      
      const queryString = params.toString();
      const endpoint = `/api/travel-calendars${queryString ? `?${queryString}` : ""}`;
      
      const response = await apiFetch(endpoint);
      const items = response?.items || response?.data?.items || response?.data || [];
      setTravelCalendars(Array.isArray(items) ? items : []);
    } catch (error: any) {
      console.error("Failed to load travel calendars:", error);
      Alert.alert("Sync Error", error?.message || "Failed to load itinerary logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTravelCalendars();
  }, [filters]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? dateStr : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const statuses = [
    { value: "", label: "All Schedules" },
    { value: "planned", label: "Planned" },
    { value: "approved", label: "Approved" },
    { value: "in-progress", label: "In Progress" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
  ];

  return (
    <SafeAreaView style={[styles.mainContainer, { backgroundColor: THEME.bgCanvas }]}>
      <FlatList
        data={travelCalendars}
        keyExtractor={(item) => item._id || Math.random().toString()}
        contentContainerStyle={styles.scrollContainerPadding}
        ListHeaderComponent={
          <View style={{ marginBottom: 20 }}>
            {/* Minimalist Premium Header */}
            <View style={styles.headerBlockIdentity}>
              <Text style={[styles.mainTitleText, { color: THEME.textPrimary }]}>Travel Logs</Text>
              <Text style={[styles.subtitleText, { color: THEME.textSecondary }]}>Corporate deployment records and timelines</Text>
            </View>

            {/* Premium Filter Deck */}
            <View style={[styles.filterPanelCard, { backgroundColor: THEME.bgSurface, borderColor: THEME.border }]}>
              <View style={styles.filterCardHeaderRow}>
                <Filter size={14} color={THEME.primary} />
                <Text style={[styles.filterCardTitleText, { color: THEME.textPrimary }]}>Filter Matrix</Text>
              </View>

              <View style={styles.inputsGridFlexMatrix}>
                <View style={styles.inputFlexColumnHalf}>
                  <Text style={[styles.inputLabelFieldText, { color: THEME.textSecondary }]}>Start Bounds</Text>
                  <TextInput
                    style={[styles.nativeTextInputElement, { backgroundColor: THEME.bgCanvas, borderColor: THEME.border, color: THEME.textPrimary }]}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={THEME.textMuted}
                    value={filters.startDate || ""}
                    onChangeText={(text) => setFilters({ ...filters, startDate: text })}
                  />
                </View>

                <View style={styles.inputFlexColumnHalf}>
                  <Text style={[styles.inputLabelFieldText, { color: THEME.textSecondary }]}>End Bounds</Text>
                  <TextInput
                    style={[styles.nativeTextInputElement, { backgroundColor: THEME.bgCanvas, borderColor: THEME.border, color: THEME.textPrimary }]}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={THEME.textMuted}
                    value={filters.endDate || ""}
                    onChangeText={(text) => setFilters({ ...filters, endDate: text })}
                  />
                </View>
              </View>

              <View style={{ marginTop: 14 }}>
                <Text style={[styles.inputLabelFieldText, { color: THEME.textSecondary }]}>Status Profile</Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[styles.nativeSelectDropdownBtn, { backgroundColor: THEME.bgCanvas, borderColor: THEME.border }]}
                  onPress={() => setShowStatusPicker(true)}
                >
                  <Text style={{ color: filters.status ? THEME.textPrimary : THEME.textSecondary, fontSize: 13, fontWeight: "500" }}>
                    {statuses.find(s => s.value === filters.status)?.label || "All Schedules"}
                  </Text>
                  <ChevronDown size={16} color={THEME.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            {loading && (
              <View style={styles.inlineActivityLoaderWrapper}>
                <ActivityIndicator size="small" color={THEME.primary} />
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyRecordsCardContainer}>
              <Calendar size={36} color={THEME.borderFocus} style={{ marginBottom: 12 }} />
              <Text style={[styles.emptyCardMainTitle, { color: THEME.textPrimary }]}>No itineraries logged</Text>
              <Text style={[styles.emptyCardSubText, { color: THEME.textSecondary }]}>No parameters currently match corporate travel files.</Text>
            </View>
          ) : null
        }
        renderItem={({ item: calendar }) => (
          <View style={[styles.itineraryItemCard, { backgroundColor: THEME.bgSurface, borderColor: THEME.border }]}>
            <View style={styles.cardHeaderFlexSpreadRow}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={[styles.itineraryTitleLabel, { color: THEME.textPrimary }]}>{calendar.title}</Text>
                
                <View style={styles.badgesWrapperFlexRow}>
                  <View style={[styles.badgeContainerCapsule, { backgroundColor: "rgba(255,210,122,0.08)", borderColor: "rgba(255,210,122,0.25)" }]}>
                    <Text style={[styles.badgeLabelText, { color: THEME.primary }]}>{calendar.status.toUpperCase()}</Text>
                  </View>
                  <View style={[styles.badgeContainerCapsule, { backgroundColor: THEME.bgCanvas, borderColor: THEME.border }]}>
                    <Text style={[styles.badgeLabelText, { color: THEME.textSecondary }]}>{calendar.purpose.toUpperCase()}</Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                activeOpacity={0.7}
                style={[styles.viewDetailsNativeCircleBtn, { backgroundColor: THEME.bgCanvas, borderColor: THEME.border }]}
                onPress={() => {
                  setSelectedCalendar(calendar);
                  setShowViewDialog(true);
                }}
              >
                <Eye size={14} color={THEME.primary} />
              </TouchableOpacity>
            </View>

            <View style={[styles.cardDividerSplitLine, { backgroundColor: THEME.border }]} />

            <View style={styles.cardParamsMetaGridColumnLayout}>
              <View style={styles.inlineMetaFlexRowItem}>
                <Calendar size={13} color={THEME.textSecondary} />
                <Text style={[styles.metaDataParameterOutputText, { color: THEME.textSecondary }]}>
                  {formatDate(calendar.startDate)} — {formatDate(calendar.endDate)}
                </Text>
              </View>

              <View style={styles.inlineMetaFlexRowItem}>
                <MapPin size={13} color={THEME.textSecondary} />
                <Text style={[styles.metaDataParameterOutputText, { color: THEME.textSecondary }]} numberOfLines={1}>
                  {calendar.destination}
                </Text>
              </View>

              {calendar.budget?.estimated > 0 && (
                <View style={styles.inlineMetaFlexRowItem}>
                  <DollarSign size={13} color={THEME.primary} />
                  <Text style={[styles.metaDataParameterOutputText, { color: THEME.textPrimary, fontWeight: "600" }]}>
                    {calendar.budget.currency} {calendar.budget.estimated.toLocaleString()}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
      />

      {/* --- Premium Bottom-Anchored Sheet Dropdown --- */}
      <Modal visible={showStatusPicker} transparent animationType="slide" onRequestClose={() => setShowStatusPicker(false)}>
        <View style={styles.modalOverlayDarkenedBackground}>
          <TouchableOpacity activeOpacity={1} style={styles.dismissFlexDismissArea} onPress={() => setShowStatusPicker(false)} />
          <View style={[styles.statusDropdownContainerCard, { backgroundColor: THEME.bgSurface }]}>
            <View style={[styles.bottomSheetHeaderBlock, { borderBottomColor: THEME.border }]}>
              <Text style={[styles.pickerOverlayTitleHeaderLabel, { color: THEME.textPrimary }]}>Select Status Range</Text>
              <TouchableOpacity onPress={() => setShowStatusPicker(false)}>
                <X size={18} color={THEME.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={{ paddingBottom: 24 }}>
              {statuses.map((s) => {
                const isSelected = (filters.status || "") === s.value;
                return (
                  <TouchableOpacity
                    key={s.value}
                    activeOpacity={0.7}
                    style={[styles.pickerListItemRowButton, isSelected && { backgroundColor: THEME.bgElevated }]}
                    onPress={() => {
                      setFilters({ ...filters, status: s.value || undefined });
                      setShowStatusPicker(false);
                    }}
                  >
                    <Text style={[styles.pickerListItemRowLabelText, { color: isSelected ? THEME.primary : THEME.textSecondary }]}>
                      {s.label}
                    </Text>
                    {isSelected && <Check size={16} color={THEME.primary} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      {/* --- Detailed Overview Modal Panel --- */}
      <Modal visible={showViewDialog} transparent animationType="fade" onRequestClose={() => setShowViewDialog(false)}>
        <View style={[styles.modalOverlayDarkenedBackground, { justifyContent: "center", padding: 20 }]}>
          <View style={[styles.detailsDetailedModalWindowLayoutContainer, { backgroundColor: THEME.bgSurface }]}>
            <View style={[styles.modalStickyTopHeaderActionAreaRow, { borderBottomColor: THEME.border }]}>
              <Text style={[styles.modalStickyTitleHeaderText, { color: THEME.primary }]}>LOG ENTRY OVERVIEW</Text>
              <TouchableOpacity
                activeOpacity={0.7}
                style={[styles.closeIconTouchableCircleWrapper, { backgroundColor: THEME.bgCanvas }]}
                onPress={() => setShowViewDialog(false)}
              >
                <X size={14} color={THEME.textPrimary} />
              </TouchableOpacity>
            </View>

            {selectedCalendar && (
              <ScrollView contentContainerStyle={styles.modalScrollViewMainContentLayout}>
                <Text style={[styles.detailedModalMainHeadingText, { color: THEME.textPrimary }]}>{selectedCalendar.title}</Text>
                
                <View style={styles.modalMetadataGridFieldsBlockFlexLayout}>
                  <View style={styles.modalGridParamBlockHalfItem}>
                    <Text style={[styles.paramFieldKeyLabelTitleText, { color: THEME.textSecondary }]}>Deployment</Text>
                    <Text style={[styles.paramFieldValueOutputBodyText, { color: THEME.textPrimary }]}>{formatDate(selectedCalendar.startDate)}</Text>
                  </View>
                  <View style={styles.modalGridParamBlockHalfItem}>
                    <Text style={[styles.paramFieldKeyLabelTitleText, { color: THEME.textSecondary }]}>Return Term</Text>
                    <Text style={[styles.paramFieldValueOutputBodyText, { color: THEME.textPrimary }]}>{formatDate(selectedCalendar.endDate)}</Text>
                  </View>
                  <View style={styles.modalGridParamBlockHalfItem}>
                    <Text style={[styles.paramFieldKeyLabelTitleText, { color: THEME.textSecondary }]}>Destination</Text>
                    <Text style={[styles.paramFieldValueOutputBodyText, { color: THEME.textPrimary }]}>{selectedCalendar.destination}</Text>
                  </View>
                  <View style={styles.modalGridParamBlockHalfItem}>
                    <Text style={[styles.paramFieldKeyLabelTitleText, { color: THEME.textSecondary }]}>Funding Allocation</Text>
                    <Text style={[styles.paramFieldValueOutputBodyText, { color: THEME.primary }]}>
                      {selectedCalendar.budget?.estimated > 0 ? `${selectedCalendar.budget.currency} ${selectedCalendar.budget.estimated.toLocaleString()}` : "Uncapped"}
                    </Text>
                  </View>
                </View>

                {selectedCalendar.description && (
                  <View style={[styles.modalTextBlockSectionContainer, { borderColor: THEME.border, backgroundColor: THEME.bgCanvas }]}>
                    <Text style={[styles.sectionBlockKeyLabelText, { color: THEME.textSecondary }]}>Mission Matrix Specifications</Text>
                    <Text style={[styles.sectionBlockValueOutputContentBodyText, { color: THEME.textPrimary }]}>{selectedCalendar.description}</Text>
                  </View>
                )}

                {selectedCalendar.notes && (
                  <View style={[styles.modalTextBlockSectionContainer, { borderColor: THEME.border, backgroundColor: THEME.bgCanvas }]}>
                    <Text style={[styles.sectionBlockKeyLabelText, { color: THEME.textSecondary }]}>Operational Directives</Text>
                    <Text style={[styles.sectionBlockValueOutputContentBodyText, { color: THEME.textPrimary }]}>{selectedCalendar.notes}</Text>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1 },
  scrollContainerPadding: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 40 },
  headerBlockIdentity: { marginBottom: 20 },
  mainTitleText: { fontSize: 26, fontWeight: "800", letterSpacing: -0.75 },
  subtitleText: { fontSize: 13, marginTop: 4, fontWeight: "400" },
  inlineActivityLoaderWrapper: { marginVertical: 12, alignItems: "center" },

  // Filters View Architecture
  filterPanelCard: { borderWidth: 1, borderRadius: 12, padding: 16 },
  filterCardHeaderRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  filterCardTitleText: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  inputsGridFlexMatrix: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  inputFlexColumnHalf: { flex: 1 },
  inputLabelFieldText: { fontSize: 11, fontWeight: "600", marginBottom: 6 },
  nativeTextInputElement: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, height: 42, fontSize: 13 },
  nativeSelectDropdownBtn: { borderWidth: 1, borderRadius: 8, height: 42, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },

  // Cards & Lists Matrix
  itineraryItemCard: { borderWidth: 1, borderRadius: 12, padding: 16, marginBottom: 12 },
  cardHeaderFlexSpreadRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  itineraryTitleLabel: { fontSize: 16, fontWeight: "700", lineHeight: 22 },
  badgesWrapperFlexRow: { flexDirection: "row", gap: 6, marginTop: 8 },
  badgeContainerCapsule: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, borderWidth: 1 },
  badgeLabelText: { fontSize: 9, fontWeight: "700", letterSpacing: 0.5 },
  viewDetailsNativeCircleBtn: { width: 32, height: 32, borderRadius: 8, borderWidth: 1, justifyContent: "center", alignItems: "center" },
  cardDividerSplitLine: { height: 1, marginVertical: 14 },
  cardParamsMetaGridColumnLayout: { gap: 8 },
  inlineMetaFlexRowItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  metaDataParameterOutputText: { fontSize: 13, fontWeight: "500" },

  // Overhauled Premium Action Drawer Dropdown
  modalOverlayDarkenedBackground: { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "flex-end" },
  dismissFlexDismissArea: { flex: 1 },
  statusDropdownContainerCard: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 16 },
  bottomSheetHeaderBlock: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 18, borderBottomWidth: 1, marginBottom: 8 },
  pickerOverlayTitleHeaderLabel: { fontSize: 14, fontWeight: "700", letterSpacing: 0.25 },
  pickerListItemRowButton: { paddingVertical: 14, paddingHorizontal: 12, borderRadius: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  pickerListItemRowLabelText: { fontSize: 14, fontWeight: "600" },

  // Inspector Dialog Window Layouts
  detailsDetailedModalWindowLayoutContainer: { width: "100%", maxHeight: "80%", borderRadius: 14, overflow: "hidden" },
  modalStickyTopHeaderActionAreaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  modalStickyTitleHeaderText: { fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  closeIconTouchableCircleWrapper: { width: 26, height: 26, borderRadius: 6, justifyContent: "center", alignItems: "center" },
  modalScrollViewMainContentLayout: { padding: 18, paddingBottom: 36 },
  detailedModalMainHeadingText: { fontSize: 20, fontWeight: "800", marginBottom: 16, lineHeight: 26 },
  modalMetadataGridFieldsBlockFlexLayout: { flexDirection: "row", flexWrap: "wrap", rowGap: 16, marginBottom: 10 },
  modalGridParamBlockHalfItem: { width: "50%" },
  paramFieldKeyLabelTitleText: { fontSize: 11, fontWeight: "500", marginBottom: 4 },
  paramFieldValueOutputBodyText: { fontSize: 14, fontWeight: "700" },
  modalTextBlockSectionContainer: { borderWidth: 1, borderRadius: 8, padding: 14, marginTop: 12 },
  sectionBlockKeyLabelText: { fontSize: 11, fontWeight: "600", marginBottom: 6 },
  sectionBlockValueOutputContentBodyText: { fontSize: 13, lineHeight: 20 },
  emptyRecordsCardContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 80, paddingHorizontal: 24 },
  emptyCardMainTitle: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  emptyCardSubText: { fontSize: 13, textAlign: "center", lineHeight: 18 },
});