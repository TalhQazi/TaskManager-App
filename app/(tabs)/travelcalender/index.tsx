import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Modal,
  Dimensions,
  Alert,
} from "react-native";
import { format } from "date-fns";
import { Calendar as CalendarIcon, MapPin, DollarSign, Eye, X } from "lucide-react-native";
import { travelCalendarApi, TravelCalendar, TravelCalendarFilters } from "@/lib/admin/travelCalendar";
import { useTheme } from "@/contexts/ThemeContext";
import { s, wp, hp, fs } from "@/util/styles";

const { height } = Dimensions.get("window");

export default function EmployeeTravelCalendar() {
  const { uiTheme } = useTheme();
  
  const [travelCalendars, setTravelCalendars] = useState<TravelCalendar[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<TravelCalendarFilters>({});
  const [selectedCalendar, setSelectedCalendar] = useState<TravelCalendar | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);

  const isLightTheme = useMemo(() => {
    return uiTheme.theme?.includes("crystal") || uiTheme.panelColors?.dashboardTextColor === "#000000";
  }, [uiTheme]);

  const bg = useMemo(() => uiTheme.panelColors?.dashboardBackground || (isLightTheme ? "#ffffff" : "#09090b"), [uiTheme, isLightTheme]);
  const cardBg = useMemo(() => uiTheme.panelColors?.dashboardCardBackground || (isLightTheme ? "#f8fafc" : "#18181b"), [uiTheme, isLightTheme]);
  const tintColor = useMemo(() => uiTheme.panelColors?.dashboardTextColor || (isLightTheme ? "#0f172a" : "#ffffff"), [uiTheme, isLightTheme]);
  const mutedText = useMemo(() => (isLightTheme ? "#64748b" : "#a1a1aa"), [isLightTheme]);
  const primaryColor = useMemo(() => uiTheme.customColors?.primary || "#133767", [uiTheme]);
  const border = useMemo(() => (isLightTheme ? "rgba(0, 0, 0, 0.08)" : "rgba(255, 255, 255, 0.08)"), [isLightTheme]);

  const loadTravelCalendars = async () => {
    try {
      setLoading(true);
      const response = await travelCalendarApi.getTravelCalendars(filters);
      if (response.success) {
        setTravelCalendars(response.data.items);
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to load travel calendars");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTravelCalendars();
  }, [filters]);

  const getStatusColors = (status: string) => {
    switch (status) {
      case "planned": return { bg: "rgba(59, 130, 246, 0.15)", text: isLightTheme ? "rgb(29, 78, 216)" : "#60A5FA" };
      case "approved": return { bg: "rgba(34, 197, 94, 0.15)", text: isLightTheme ? "rgb(21, 128, 61)" : "#4ADE80" };
      case "in-progress": return { bg: "rgba(234, 179, 8, 0.15)", text: isLightTheme ? "rgb(161, 98, 7)" : "#FBBF24" };
      case "completed": return { bg: "rgba(168, 85, 247, 0.15)", text: isLightTheme ? "rgb(109, 40, 217)" : "#C084FC" };
      case "cancelled": return { bg: "rgba(239, 68, 68, 0.15)", text: isLightTheme ? "rgb(185, 28, 28)" : "#F87171" };
      default: return { bg: "rgba(107, 114, 128, 0.15)", text: mutedText };
    }
  };

  const getPurposeColors = (purpose: string) => {
    switch (purpose) {
      case "business": return { bg: "rgba(59, 130, 246, 0.08)", text: isLightTheme ? "rgb(29, 78, 216)" : "#60A5FA" };
      case "conference": return { bg: "rgba(168, 85, 247, 0.08)", text: isLightTheme ? "rgb(109, 40, 217)" : "#C084FC" };
      case "meeting": return { bg: "rgba(34, 197, 94, 0.08)", text: isLightTheme ? "rgb(21, 128, 61)" : "#4ADE80" };
      case "training": return { bg: "rgba(249, 115, 22, 0.08)", text: isLightTheme ? "rgb(194, 65, 12)" : "#FB923C" };
      case "personal": return { bg: "rgba(236, 72, 153, 0.08)", text: isLightTheme ? "rgb(190, 24, 74)" : "#F472B6" };
      default: return { bg: "rgba(107, 114, 128, 0.08)", text: mutedText };
    }
  };

  const safeFormatDate = (dateString: string, formatPattern: string) => {
    try {
      return format(new Date(dateString), formatPattern);
    } catch {
      return "—";
    }
  };

  if (loading && travelCalendars.length === 0) {
    return (
      <View style={s([styles.centerFallback, { backgroundColor: bg }])}>
        <ActivityIndicator size="large" color={primaryColor} />
      </View>
    );
  }

  return (
    <SafeAreaView style={s([styles.container, { backgroundColor: bg }])}>
      <StatusBar barStyle={isLightTheme ? "dark-content" : "light-content"} backgroundColor={bg} />
      
      <ScrollView contentContainerStyle={s(styles.scrollWrapper)} showsVerticalScrollIndicator={false}>
        <View style={s(styles.headerBlock)}>
          <Text style={s([styles.pageTitle, { color: tintColor }])}>My Travel Calendar</Text>
          <Text style={s([styles.pageSubtitle, { color: mutedText }])}>View your travel schedules</Text>
        </View>

        <View style={s([styles.panelCard, { backgroundColor: cardBg, borderColor: border }])}>
          <View style={s(styles.panelHeader)}>
            <CalendarIcon size={fs(4.5)} color={tintColor} />
            <Text style={s([styles.panelTitle, { color: tintColor }])}>Filters</Text>
          </View>
          
          <View style={s(styles.filtersContainer)}>
            <View style={s(styles.filterInputBlock)}>
              <Text style={s([styles.inputLabel, { color: tintColor }])}>Start Date</Text>
              <TextInput
                style={s([styles.inputElement, { color: tintColor, backgroundColor: bg, borderColor: border }])}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={mutedText}
                value={filters.startDate || ""}
                onChangeText={(text) => setFilters({ ...filters, startDate: text })}
              />
            </View>

            <View style={s(styles.filterInputBlock)}>
              <Text style={s([styles.inputLabel, { color: tintColor }])}>End Date</Text>
              <TextInput
                style={s([styles.inputElement, { color: tintColor, backgroundColor: bg, borderColor: border }])}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={mutedText}
                value={filters.endDate || ""}
                onChangeText={(text) => setFilters({ ...filters, endDate: text })}
              />
            </View>

            <View style={s(styles.filterInputBlock)}>
              <Text style={s([styles.inputLabel, { color: tintColor }])}>Status</Text>
              <TouchableOpacity
                style={s([styles.dropdownTrigger, { backgroundColor: bg, borderColor: border }])}
                onPress={() => setShowStatusPicker(true)}
              >
                <Text style={s([styles.dropdownValue, { color: filters.status ? tintColor : mutedText }])}>
                  {filters.status ? filters.status.charAt(0).toUpperCase() + filters.status.slice(1) : "All Status"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={s(styles.listStack)}>
          {travelCalendars.map((calendar) => {
            const statusStyle = getStatusColors(calendar.status);
            const purposeStyle = getPurposeColors(calendar.purpose);
            
            return (
              <View key={calendar._id} style={s([styles.calendarCard, { backgroundColor: cardBg, borderColor: border }])}>
                <View style={s(styles.cardHeaderRow)}>
                  <View style={s(styles.cardInfoCol)}>
                    <Text style={s([styles.calendarTitleText, { color: tintColor }])}>{calendar.title}</Text>
                    <View style={s(styles.badgeRow)}>
                      <View style={s([styles.badgeContainer, { backgroundColor: statusStyle.bg }])}>
                        <Text style={s([styles.badgeText, { color: statusStyle.text }])}>{calendar.status}</Text>
                      </View>
                      <View style={s([styles.badgeContainer, { backgroundColor: purposeStyle.bg }])}>
                        <Text style={s([styles.badgeText, { color: purposeStyle.text }])}>{calendar.purpose}</Text>
                      </View>
                    </View>
                  </View>
                  
                  <TouchableOpacity
                    style={s([styles.actionButton, { borderColor: border, backgroundColor: bg }])}
                    onPress={() => {
                      setSelectedCalendar(calendar);
                      setShowViewDialog(true);
                    }}
                  >
                    <Eye size={fs(4)} color={tintColor} />
                  </TouchableOpacity>
                </View>

                <View style={s(styles.cardMetaGrid)}>
                  <View style={s(styles.metaRowItem)}>
                    <CalendarIcon size={fs(3.5)} color={mutedText} />
                    <Text style={s([styles.metaRowText, { color: mutedText }])} numberOfLines={1}>
                      {safeFormatDate(calendar.startDate, "MMM dd, yyyy")} - {safeFormatDate(calendar.endDate, "MMM dd, yyyy")}
                    </Text>
                  </View>
                  
                  <View style={s(styles.metaRowItem)}>
                    <MapPin size={fs(3.5)} color={mutedText} />
                    <Text style={s([styles.metaRowText, { color: mutedText }])} numberOfLines={1}>
                      {calendar.destination}
                    </Text>
                  </View>
                </View>

                {calendar.description ? (
                  <Text style={s([styles.descriptionPreview, { color: mutedText }])} numberOfLines={2}>
                    {calendar.description}
                  </Text>
                ) : null}

                {calendar.budget.estimated > 0 ? (
                  <View style={s([styles.budgetFooterLine, { borderTopColor: border }])}>
                    <DollarSign size={fs(3.5)} color={mutedText} />
                    <Text style={s([styles.budgetTextInfo, { color: mutedText }])}>
                      Budget: {calendar.budget.currency} {calendar.budget.estimated}
                    </Text>
                  </View>
                ) : null}
              </View>
            );
          })}

          {travelCalendars.length === 0 && (
            <View style={s([styles.emptyContainer, { backgroundColor: cardBg, borderColor: border }])}>
              <CalendarIcon size={fs(10)} color={mutedText} style={s({ opacity: 0.5, marginBottom: hp(1.5) })} />
              <Text style={s([styles.emptyTitle, { color: tintColor }])}>No travel calendars found</Text>
              <Text style={s([styles.emptySubtitle, { color: mutedText }])}>No travel schedules are currently available</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <Modal visible={showViewDialog} transparent animationType="slide" onRequestClose={() => setShowViewDialog(false)}>
        <View style={s(styles.modalOverlay)}>
          <View style={s([styles.modalSheet, { backgroundColor: cardBg }])}>
            <View style={s([styles.modalHeaderRow, { borderBottomColor: border }])}>
              <Text style={s([styles.modalTitleText, { color: tintColor }])}>Travel Calendar Details</Text>
              <TouchableOpacity style={s(styles.modalCloseButton)} onPress={() => setShowViewDialog(false)}>
                <X size={fs(5)} color={tintColor} />
              </TouchableOpacity>
            </View>

            {selectedCalendar && (
              <ScrollView contentContainerStyle={s(styles.modalScrollContent)} showsVerticalScrollIndicator={false}>
                <View style={s(styles.modalMainHeader)}>
                  <Text style={s([styles.modalMainTitle, { color: tintColor }])}>{selectedCalendar.title}</Text>
                  <View style={s([styles.badgeRow, { marginTop: hp(0.8) }])}>
                    <View style={s([styles.badgeContainer, { backgroundColor: getStatusColors(selectedCalendar.status).bg }])}>
                      <Text style={s([styles.badgeText, { color: getStatusColors(selectedCalendar.status).text }])}>{selectedCalendar.status}</Text>
                    </View>
                    <View style={s([styles.badgeContainer, { backgroundColor: getPurposeColors(selectedCalendar.purpose).bg }])}>
                      <Text style={s([styles.badgeText, { color: getPurposeColors(selectedCalendar.purpose).text }])}>{selectedCalendar.purpose}</Text>
                    </View>
                  </View>
                </View>

                <View style={s(styles.detailsPropertyGrid)}>
                  <View style={s(styles.propertyGridItem)}>
                    <Text style={s([styles.propertyLabel, { color: mutedText }])}>Start Date</Text>
                    <Text style={s([styles.propertyValue, { color: tintColor }])}>
                      {safeFormatDate(selectedCalendar.startDate, "MMMM dd, yyyy")}
                    </Text>
                  </View>

                  <View style={s(styles.propertyGridItem)}>
                    <Text style={s([styles.propertyLabel, { color: mutedText }])}>End Date</Text>
                    <Text style={s([styles.propertyValue, { color: tintColor }])}>
                      {safeFormatDate(selectedCalendar.endDate, "MMMM dd, yyyy")}
                    </Text>
                  </View>

                  <View style={s(styles.propertyGridItem)}>
                    <Text style={s([styles.propertyLabel, { color: mutedText }])}>Destination</Text>
                    <Text style={s([styles.propertyValue, { color: tintColor }])}>{selectedCalendar.destination}</Text>
                  </View>

                  <View style={s(styles.propertyGridItem)}>
                    <Text style={s([styles.propertyLabel, { color: mutedText }])}>Status</Text>
                    <Text style={s([styles.propertyValue, { color: tintColor, textTransform: "capitalize" }])}>{selectedCalendar.status}</Text>
                  </View>
                </View>

                {selectedCalendar.description ? (
                  <View style={s(styles.sectionBlock)}>
                    <Text style={s([styles.propertyLabel, { color: mutedText, marginBottom: hp(0.5) }])}>Description</Text>
                    <Text style={s([styles.sectionBodyText, { color: tintColor }])}>{selectedCalendar.description}</Text>
                  </View>
                ) : null}

                {selectedCalendar.notes ? (
                  <View style={s(styles.sectionBlock)}>
                    <Text style={s([styles.propertyLabel, { color: mutedText, marginBottom: hp(0.5) }])}>Notes</Text>
                    <Text style={s([styles.sectionBodyText, { color: tintColor }])}>{selectedCalendar.notes}</Text>
                  </View>
                ) : null}

                {selectedCalendar.budget.estimated > 0 ? (
                  <View style={s(styles.sectionBlock)}>
                    <Text style={s([styles.propertyLabel, { color: mutedText, marginBottom: hp(0.5) }])}>Budget</Text>
                    <Text style={s([styles.sectionBodyText, { color: tintColor, fontWeight: "700" }])}>
                      {selectedCalendar.budget.currency} {selectedCalendar.budget.estimated}
                    </Text>
                  </View>
                ) : null}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={showStatusPicker} transparent animationType="fade" onRequestClose={() => setShowStatusPicker(false)}>
        <TouchableOpacity style={s(styles.pickerBackdrop)} activeOpacity={1} onPress={() => setShowStatusPicker(false)}>
          <View style={s([styles.pickerMenu, { backgroundColor: cardBg }])}>
            <Text style={s([styles.pickerMenuTitle, { color: tintColor }])}>Select Status</Text>
            
            <TouchableOpacity
              style={s([styles.pickerOptionItem, { borderBottomColor: border }])}
              onPress={() => { setFilters({ ...filters, status: undefined }); setShowStatusPicker(false); }}
            >
              <Text style={s([styles.pickerOptionText, { color: tintColor }])}>All Status</Text>
            </TouchableOpacity>

            {["planned", "approved", "in-progress", "completed", "cancelled"].map((st) => (
              <TouchableOpacity
                key={st}
                style={s([styles.pickerOptionItem, { borderBottomColor: border }])}
                onPress={() => { setFilters({ ...filters, status: st }); setShowStatusPicker(false); }}
              >
                <Text style={s([styles.pickerOptionText, { color: tintColor, textTransform: "capitalize" }])}>{st}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerFallback: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollWrapper: { padding: wp(4), paddingBottom: hp(5) },
  headerBlock: { marginBottom: hp(2.5) },
  pageTitle: { fontSize: fs(6), fontWeight: "800", letterSpacing: -0.5 },
  pageSubtitle: { fontSize: fs(3.2), marginTop: hp(0.25) },
  panelCard: { borderRadius: wp(3), borderWidth: 1, padding: wp(3.5), marginBottom: hp(2.5) },
  panelHeader: { flexDirection: "row", alignItems: "center", gap: wp(2), marginBottom: hp(1.8) },
  panelTitle: { fontSize: fs(3.5), fontWeight: "700" },
  filtersContainer: { gap: hp(1.5) },
  filterInputBlock: { gap: hp(0.5) },
  inputLabel: { fontSize: fs(3), fontWeight: "600" },
  inputElement: { height: hp(4.8), borderWidth: 1, borderRadius: wp(2), paddingHorizontal: wp(3), fontSize: fs(3.2) },
  dropdownTrigger: { height: hp(4.8), borderWidth: 1, borderRadius: wp(2), paddingHorizontal: wp(3), justifyContent: "center" },
  dropdownValue: { fontSize: fs(3.2), fontWeight: "500" },
  listStack: { gap: hp(1.5) },
  calendarCard: { borderRadius: wp(3), borderWidth: 1, padding: wp(4) },
  cardHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: wp(3) },
  cardInfoCol: { flex: 1, gap: hp(0.5) },
  calendarTitleText: { fontSize: fs(3.8), fontWeight: "700" },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: wp(1.5) },
  badgeContainer: { paddingHorizontal: wp(2), paddingVertical: hp(0.25), borderRadius: wp(1.5) },
  badgeText: { fontSize: fs(2.5), fontWeight: "700", textTransform: "capitalize" },
  actionButton: { width: wp(8), height: wp(8), borderRadius: wp(2), borderWidth: 1, justifyContent: "center", alignItems: "center" },
  cardMetaGrid: { gap: hp(0.8), marginTop: hp(1.5) },
  metaRowItem: { flexDirection: "row", alignItems: "center", gap: wp(1.5) },
  metaRowText: { fontSize: fs(3), fontWeight: "500" },
  descriptionPreview: { fontSize: fs(3), lineHeight: fs(4.2), marginTop: hp(1.2) },
  budgetFooterLine: { flexDirection: "row", alignItems: "center", gap: wp(1), marginTop: hp(1.5), paddingTop: hp(1.2), borderTopWidth: 1 },
  budgetTextInfo: { fontSize: fs(3), fontWeight: "600" },
  emptyContainer: { borderRadius: wp(3), borderWidth: 1, padding: wp(8), alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: fs(3.8), fontWeight: "700" },
  emptySubtitle: { fontSize: fs(3.2), textAlign: "center", marginTop: hp(0.25) },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalSheet: { borderTopLeftRadius: wp(5), borderTopRightRadius: wp(5), maxHeight: height * 0.8 },
  modalHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: wp(4), borderBottomWidth: 1 },
  modalTitleText: { fontSize: fs(4), fontWeight: "700" },
  modalCloseButton: { padding: wp(1) },
  modalScrollContent: { padding: wp(4), gap: hp(2) },
  modalMainHeader: { gap: hp(0.25) },
  modalMainTitle: { fontSize: fs(4.5), fontWeight: "800" },
  detailsPropertyGrid: { flexDirection: "row", flexWrap: "wrap", rowGap: hp(1.5), columnGap: wp(5) },
  propertyGridItem: { width: wp(42) },
  propertyLabel: { fontSize: fs(2.8), fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  propertyValue: { fontSize: fs(3.2), fontWeight: "600", marginTop: hp(0.25) },
  sectionBlock: { gap: hp(0.25) },
  sectionBodyText: { fontSize: fs(3.2), lineHeight: fs(4.5) },
  pickerBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  pickerMenu: { borderTopLeftRadius: wp(4), borderTopRightRadius: wp(4), padding: wp(4), maxHeight: height * 0.4 },
  pickerMenuTitle: { fontSize: fs(3.8), fontWeight: "700", marginBottom: hp(1.5), textAlign: "center" },
  pickerOptionItem: { paddingVertical: hp(1.5), borderBottomWidth: 1, alignItems: "center" },
  pickerOptionText: { fontSize: fs(3.5), fontWeight: "600" },
});