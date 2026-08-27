import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { format } from "date-fns";
import {
  Calendar,
  MapPin,
  DollarSign,
  Filter,
  Plus,
  Edit,
  Trash2,
  Eye,
  X,
  ChevronDown,
  Check,
} from "lucide-react-native";

import { 
  travelCalendarApi, 
  TravelCalendarCreateRequest, 
  TravelCalendarUpdateRequest 
} from "@/lib/admin/travelCalendar";
import { useTheme } from "@/contexts/ThemeContext";
import { s } from "@/util/styles";
import { isDarkTheme } from "@/constants/design/presets";

interface Budget {
  estimated: number;
  actual: number;
  currency: string;
}

interface TravelCalendarItem {
  _id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  destination: string;
  purpose: string;
  status: string;
  visibility: string;
  budget: Budget;
  notes?: string;
}

interface FilterState {
  startDate?: string;
  endDate?: string;
  status?: string;
  purpose?: string;
}

interface SelectorOption {
  label: string;
  value: string;
}

function safeFormatDate(dateValue: string | undefined | null, formatStr: string): string {
  if (!dateValue) return "—";
  try {
    const raw = String(dateValue).trim();
    const cleanStr = /^\d{4}-\d{2}-\d{2}/.exec(raw) ? `${raw.split("T")[0]}T00:00:00` : raw;
    const parsedDate = new Date(cleanStr);
    if (!Number.isFinite(parsedDate.getTime())) return raw;
    return format(parsedDate, formatStr);
  } catch {
    return String(dateValue);
  }
}

function buildColors(uiTheme: any) {
  const isDark = isDarkTheme(uiTheme?.theme);
  return {
    background: isDark ? "#090d13" : "#f8fafc",
    surface: isDark ? "#0d1117" : "#ffffff",
    surfaceMuted: isDark ? "#161b22" : "#f1f5f9",
    border: isDark ? "#21262d" : "#e2e8f0",
    text: isDark ? "#c9d1d9" : "#0f172a",
    textBold: isDark ? "#f0f6fc" : "#020617",
    textMuted: isDark ? "#8b949e" : "#64748b",
    primary: "#0ea5e9",
    success: "#10b981",
    warning: "#f59e0b",
    danger: "#ef4444",
    info: "#3b82f6",
    accentPurple: "#a855f7",
  };
}

function createStyles(
  c: ReturnType<typeof buildColors>,
  wp: (percentage: number) => number,
  hp: (percentage: number) => number,
  isTablet: boolean,
  isSmallScreen: boolean,
  screenWidth: number
) {
  const horizontalPadding = isSmallScreen ? wp(3) : isTablet ? wp(6) : wp(4.2);

  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    scrollContainer: { paddingHorizontal: horizontalPadding, paddingTop: hp(2), paddingBottom: hp(5) },
    headerBlock: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: hp(2) },
    titleText: { fontSize: isTablet ? 28 : 24, fontWeight: "800", color: c.textBold, letterSpacing: -0.5 },
    subtitleText: { fontSize: isTablet ? 14 : 13, color: c.textMuted, marginTop: hp(0.3) },
    addBtn: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.textBold,
      paddingHorizontal: wp(3.5),
      paddingVertical: hp(1.2),
      borderRadius: wp(2),
      gap: wp(1.5),
    },
    addBtnText: { color: c.background, fontWeight: "700", fontSize: isTablet ? 14 : 13 },
    filterCard: {
      backgroundColor: c.surface,
      borderRadius: wp(3),
      padding: wp(4),
      marginBottom: hp(2),
      borderWidth: 1,
      borderColor: c.border,
    },
    filterTitleRow: { flexDirection: "row", alignItems: "center", gap: wp(2), marginBottom: hp(1.8) },
    filterCardTitle: { fontSize: isTablet ? 16 : 15, fontWeight: "700", color: c.textBold },
    filterGridRow: { flexDirection: "row", gap: wp(3), marginBottom: hp(1.5) },
    filterGridRowLast: { flexDirection: "row", gap: wp(3) },
    filterGridCol: { flex: 1, gap: hp(0.5) },
    filterLabel: { fontSize: isTablet ? 13 : 12, fontWeight: "600", color: c.text },
    filterInput: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: wp(2),
      paddingHorizontal: wp(2.5),
      fontSize: isTablet ? 14 : 13,
      color: c.text,
      backgroundColor: c.background,
      height: hp(5),
    },
    pickerBtnInline: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: wp(2),
      paddingHorizontal: wp(2.5),
      backgroundColor: c.background,
      height: hp(5),
    },
    pickerBtnInlineText: { fontSize: isTablet ? 14 : 13, color: c.text },
    loaderBox: { paddingVertical: hp(8), alignItems: "center", justifyContent: "center" },
    listContainer: { gap: hp(1.5) },
    calendarCard: {
      backgroundColor: c.surface,
      borderRadius: wp(3),
      padding: wp(4),
      borderWidth: 1,
      borderColor: c.border,
    },
    cardMainArea: { flex: 1 },
    badgeRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: wp(1.5), marginBottom: hp(1.2) },
    cardTitle: { fontSize: isTablet ? 18 : 16, fontWeight: "700", color: c.textBold, flex: 1 },
    badgeFrame: { paddingHorizontal: wp(2), paddingVertical: hp(0.4), borderRadius: wp(1.5) },
    badgeText: { fontSize: isTablet ? 12 : 11, fontWeight: "700", textTransform: "capitalize" },
    gridMetaRows: { gap: hp(0.8), marginBottom: hp(1) },
    metaRowItem: { flexDirection: "row", alignItems: "center", gap: wp(1.5) },
    metaRowText: { fontSize: isTablet ? 14 : 13, color: c.textMuted, flex: 1 },
    descText: { fontSize: isTablet ? 14 : 13, color: c.text, marginTop: hp(0.5), lineHeight: 18 },
    budgetTextRow: { flexDirection: "row", alignItems: "center", gap: wp(1), marginTop: hp(0.8) },
    budgetText: { fontSize: isTablet ? 14 : 13, fontWeight: "600", color: c.textBold },
    cardActionsRow: {
      flexDirection: "row",
      justifyContent: "flex-end",
      alignItems: "center",
      gap: wp(2),
      marginTop: hp(1.5),
      paddingTop: hp(1.5),
      borderTopWidth: 1,
      borderTopColor: c.border + "40",
    },
    actionIconBtn: {
      width: isTablet ? 38 : 34,
      height: isTablet ? 38 : 34,
      borderRadius: wp(2),
      borderWidth: 1,
      borderColor: c.border,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.background,
    },
    emptyStateCard: {
      backgroundColor: c.surface,
      borderRadius: wp(3),
      padding: wp(8),
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: c.border,
    },
    emptyStateTitle: { fontSize: isTablet ? 18 : 16, fontWeight: "700", color: c.textBold, marginTop: hp(1.5), marginBottom: hp(0.5) },
    emptyStateSub: { fontSize: isTablet ? 14 : 13, color: c.textMuted, textAlign: "center", marginBottom: hp(2) },
    modalContainer: { flex: 1, backgroundColor: c.background },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: wp(4),
      borderBottomWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    modalTitle: { fontSize: isTablet ? 20 : 18, fontWeight: "700", color: c.textBold },
    modalContent: {
      padding: wp(4),
      gap: hp(1.8),
      maxWidth: isTablet ? 600 : undefined,
      alignSelf: isTablet ? "center" : undefined,
      width: "100%",
    },
    fieldLabel: { fontSize: isTablet ? 15 : 14, fontWeight: "600", color: c.text },
    inputControl: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: wp(2),
      padding: wp(3),
      fontSize: isTablet ? 15 : 14,
      color: c.text,
      backgroundColor: c.surface,
      minHeight: hp(5),
    },
    textAreaControl: { minHeight: hp(10), textAlignVertical: "top" },
    formGridRow: { flexDirection: "row", gap: wp(3) },
    formGridCol: { flex: 1, gap: hp(0.5) },
    footerActionsRow: { flexDirection: "row", justifyContent: "flex-end", gap: wp(2.5), marginTop: hp(1.5), marginBottom: hp(3) },
    formSubmitBtn: {
      backgroundColor: c.primary,
      paddingHorizontal: wp(4),
      paddingVertical: hp(1.5),
      borderRadius: wp(2),
      alignItems: "center",
      justifyContent: "center",
    },
    formSubmitBtnDisabled: { opacity: 0.5 },
    formSubmitBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: isTablet ? 15 : 14 },
    formCancelBtn: {
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: wp(4),
      paddingVertical: hp(1.5),
      borderRadius: wp(2),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.surface,
    },
    formCancelBtnText: { color: c.text, fontWeight: "600", fontSize: isTablet ? 15 : 14 },
    inspectDetailBlock: { gap: hp(2) },
    inspectSection: { gap: hp(0.5) },
    inspectLabel: { fontSize: isTablet ? 13 : 12, fontWeight: "600", color: c.textMuted, textTransform: "uppercase", letterSpacing: 0.5 },
    inspectValue: { fontSize: isTablet ? 15 : 14, color: c.textBold, lineHeight: 20 },
    
    dropdownOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: wp(5) },
    dropdownContentCard: {
      width: "100%",
      maxWidth: isTablet ? 400 : 320,
      backgroundColor: c.surface,
      borderRadius: wp(4),
      borderWidth: 1,
      borderColor: c.border,
      overflow: "hidden",
      maxHeight: "75%",
    },
    dropdownHeader: {
      paddingHorizontal: wp(4),
      paddingVertical: hp(1.8),
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: c.surfaceMuted,
    },
    dropdownHeaderText: { fontSize: isTablet ? 16 : 15, fontWeight: "700", color: c.textBold },
    dropdownScrollView: { paddingVertical: hp(0.8) },
    dropdownItemRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: wp(4), paddingVertical: hp(1.5) },
    dropdownItemText: { fontSize: isTablet ? 15 : 14, color: c.text, flex: 1 },
    dropdownItemTextActive: { color: c.primary, fontWeight: "600" },
  });
}

export default function ManagerTravelCalendar() {
  const { uiTheme } = useTheme();
  const { width, height } = useWindowDimensions();
  const wp = useCallback((percentage: number) => (width * percentage) / 100, [width]);
  const hp = useCallback((percentage: number) => (height * percentage) / 100, [height]);
  const isTablet = width >= 768;
  const isSmallScreen = width < 375;

  const colors = useMemo(() => buildColors(uiTheme), [uiTheme]);
  const styles = useMemo(
    () => createStyles(colors, wp, hp, isTablet, isSmallScreen, width),
    [colors, wp, hp, isTablet, isSmallScreen, width]
  );

  const [travelCalendars, setTravelCalendars] = useState<TravelCalendarItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filters, setFilters] = useState<FilterState>({});
  
  const [showCreateDialog, setShowCreateDialog] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [newTravelCalendar, setNewTravelCalendar] = useState<TravelCalendarCreateRequest>({
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

  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [selectedCalendar, setSelectedCalendar] = useState<TravelCalendarItem | null>(null);
  const [showViewDialog, setShowViewDialog] = useState<boolean>(false);

  const [customPickerVisible, setCustomPickerVisible] = useState<boolean>(false);
  const [customPickerTitle, setCustomPickerTitle] = useState<string>("");
  const [customPickerOptions, setCustomPickerOptions] = useState<SelectorOption[]>([]);
  const [customPickerValue, setCustomPickerValue] = useState<string>("");
  const [customPickerCallback, setCustomPickerCallback] = useState<(val: string) => void>(() => {});

  const loadTravelCalendars = useCallback(async () => {
    try {
      setLoading(true);
      const response = await travelCalendarApi.getTravelCalendars(filters);
      if (response.success && response.data?.items) {
        setTravelCalendars(response.data.items);
      }
    } catch (error) {
      console.error("Failed to load travel calendars:", error);
      Alert.alert("Error", "Failed to load travel calendars");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void loadTravelCalendars();
  }, [loadTravelCalendars]);

  const handleDelete = async (id: string) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this travel calendar?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await travelCalendarApi.deleteTravelCalendar(id);
              if (response.success) {
                Alert.alert("Success", "Travel calendar deleted successfully");
                void loadTravelCalendars();
              } else {
                Alert.alert("Error", response.error?.message || "Failed to delete travel calendar");
              }
            } catch (error) {
              console.error("Failed to delete travel calendar:", error);
              Alert.alert("Error", "Failed to delete travel calendar");
            }
          },
        },
      ]
    );
  };

  const handleCreateOrUpdateTravelCalendar = async () => {
    setIsCreating(true);
    try {
      let response;
      if (isEditing && editingId) {
        response = await travelCalendarApi.updateTravelCalendar(
          editingId, 
          newTravelCalendar as TravelCalendarUpdateRequest
        );
      } else {
        response = await travelCalendarApi.createTravelCalendar(
          newTravelCalendar as TravelCalendarCreateRequest
        );
      }

      if (response && response.success) {
        Alert.alert("Success", response.message || `Travel calendar ${isEditing ? "updated" : "created"} successfully`);
        setShowCreateDialog(false);
        setIsEditing(false);
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
        void loadTravelCalendars();
      } else {
        Alert.alert("Error", response?.error?.message || `Failed to ${isEditing ? "update" : "create"} travel calendar`);
      }
    } catch (error: any) {
      console.error("Failed operation on travel calendar:", error);
      Alert.alert("Error", error instanceof Error ? error.message : "Failed to execute pipeline parameters");
    } finally {
      setIsCreating(false);
    }
  };

  const openEditModal = (calendar: TravelCalendarItem) => {
    setEditingId(calendar._id);
    setIsEditing(true);
    setNewTravelCalendar({
      title: calendar.title,
      description: calendar.description || "",
      startDate: calendar.startDate ? calendar.startDate.split("T")[0] : "",
      endDate: calendar.endDate ? calendar.endDate.split("T")[0] : "",
      destination: calendar.destination,
      purpose: calendar.purpose as TravelCalendarCreateRequest["purpose"],
      status: calendar.status as TravelCalendarCreateRequest["status"],
      visibility: calendar.visibility as TravelCalendarCreateRequest["visibility"],
      budget: {
        estimated: calendar.budget?.estimated ?? 0,
        actual: calendar.budget?.actual ?? 0,
        currency: calendar.budget?.currency || "USD",
      },
      notes: calendar.notes || "",
    });
    setShowCreateDialog(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "planned": return { bg: colors.info + "20", text: colors.info };
      case "approved": return { bg: colors.success + "20", text: colors.success };
      case "in-progress": return { bg: colors.warning + "20", text: colors.warning };
      case "completed": return { bg: colors.accentPurple + "20", text: colors.accentPurple };
      case "cancelled": return { bg: colors.danger + "20", text: colors.danger };
      default: return { bg: colors.surfaceMuted, text: colors.textMuted };
    }
  };

  const getPurposeColor = (purpose: string) => {
    switch (purpose) {
      case "business": return { bg: colors.info + "10", text: colors.info };
      case "conference": return { bg: colors.accentPurple + "10", text: colors.accentPurple };
      case "meeting": return { bg: colors.success + "10", text: colors.success };
      case "training": return { bg: colors.warning + "10", text: colors.warning };
      case "personal": return { bg: colors.danger + "10", text: colors.danger };
      default: return { bg: colors.surfaceMuted, text: colors.textMuted };
    }
  };

  const presentCustomPicker = (title: string, options: SelectorOption[], currentValue: string, onSelect: (val: string) => void) => {
    setCustomPickerTitle(title);
    setCustomPickerOptions(options);
    setCustomPickerValue(currentValue);
    setCustomPickerCallback(() => onSelect);
    setCustomPickerVisible(true);
  };

  const triggerStatusFilterPicker = () => {
    const options = [
      { label: "All Status", value: "all" },
      { label: "Planned", value: "planned" },
      { label: "Approved", value: "approved" },
      { label: "In Progress", value: "in-progress" },
      { label: "Completed", value: "completed" },
      { label: "Cancelled", value: "cancelled" },
    ];
    presentCustomPicker("Filter Status", options, filters.status || "all", (val) => {
      setFilters({ ...filters, status: val === "all" ? undefined : val });
    });
  };

  const triggerPurposeFilterPicker = () => {
    const options = [
      { label: "All Purpose", value: "all" },
      { label: "Business", value: "business" },
      { label: "Conference", value: "conference" },
      { label: "Meeting", value: "meeting" },
      { label: "Training", value: "training" },
      { label: "Personal", value: "personal" },
    ];
    presentCustomPicker("Filter Purpose", options, filters.purpose || "all", (val) => {
      setFilters({ ...filters, purpose: val === "all" ? undefined : val });
    });
  };

  const triggerFormPurposePicker = () => {
    const options = [
      { label: "Business", value: "business" },
      { label: "Conference", value: "conference" },
      { label: "Meeting", value: "meeting" },
      { label: "Training", value: "training" },
      { label: "Personal", value: "personal" },
      { label: "Other", value: "other" },
    ];
    presentCustomPicker("Select Purpose", options, newTravelCalendar.purpose || "business", (val) => {
      setNewTravelCalendar({ ...newTravelCalendar, purpose: val as TravelCalendarCreateRequest["purpose"] });
    });
  };

  const triggerFormVisibilityPicker = () => {
    const options = [
      { label: "Private", value: "private" },
      { label: "Team", value: "team" },
      { label: "Department", value: "department" },
      { label: "Company", value: "company" },
    ];
    presentCustomPicker("Select Visibility", options, newTravelCalendar.visibility || "team", (val) => {
      setNewTravelCalendar({ ...newTravelCalendar, visibility: val as TravelCalendarCreateRequest["visibility"] });
    });
  };

  const triggerFormStatusPicker = () => {
    const options = [
      { label: "Planned", value: "planned" },
      { label: "Approved", value: "approved" },
      { label: "In Progress", value: "in-progress" },
      { label: "Completed", value: "completed" },
      { label: "Cancelled", value: "cancelled" },
    ];
    presentCustomPicker("Select Status", options, newTravelCalendar.status || "planned", (val) => {
      setNewTravelCalendar({ ...newTravelCalendar, status: val as TravelCalendarCreateRequest["status"] });
    });
  };

  const formIsValid = useMemo(() => {
    return (
      !!newTravelCalendar.title?.trim() &&
      !!newTravelCalendar.destination?.trim() &&
      !!newTravelCalendar.startDate?.trim() &&
      !!newTravelCalendar.endDate?.trim()
    );
  }, [newTravelCalendar]);

  const sortedStatusLabel = useMemo(() => {
    if (!filters.status) return "All Status";
    return filters.status.charAt(0).toUpperCase() + filters.status.slice(1);
  }, [filters.status]);

  const sortedPurposeLabel = useMemo(() => {
    if (!filters.purpose) return "All Purpose";
    return filters.purpose.charAt(0).toUpperCase() + filters.purpose.slice(1);
  }, [filters.purpose]);

  return (
    <SafeAreaView style={s(styles.root)} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        <View style={styles.headerBlock}>
          <View style={{ flex: 1, paddingRight: wp(2) }}>
            <Text style={styles.titleText}>Team Travel Calendar</Text>
            <Text style={styles.subtitleText}>Manage travel schedules for your team</Text>
          </View>
          <TouchableOpacity 
            style={styles.addBtn} 
            onPress={() => {
              setIsEditing(false);
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
              setShowCreateDialog(true);
            }}
          >
            <Plus size={15} color={colors.background} />
            <Text style={styles.addBtnText}>Add Travel</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.filterCard}>
          <View style={styles.filterTitleRow}>
            <Filter size={16} color={colors.textBold} />
            <Text style={styles.filterCardTitle}>Filters</Text>
          </View>

          <View style={styles.filterGridRow}>
            <View style={styles.filterGridCol}>
              <Text style={styles.filterLabel}>Start Date</Text>
              <TextInput 
                style={styles.filterInput}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textMuted}
                value={filters.startDate || ""}
                onChangeText={(txt) => setFilters({ ...filters, startDate: txt })}
              />
            </View>

            <View style={styles.filterGridCol}>
              <Text style={styles.filterLabel}>End Date</Text>
              <TextInput 
                style={styles.filterInput}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textMuted}
                value={filters.endDate || ""}
                onChangeText={(txt) => setFilters({ ...filters, endDate: txt })}
              />
            </View>
          </View>

          <View style={styles.filterGridRowLast}>
            <View style={styles.filterGridCol}>
              <Text style={styles.filterLabel}>Status</Text>
              <TouchableOpacity style={styles.pickerBtnInline} onPress={triggerStatusFilterPicker}>
                <Text style={styles.pickerBtnInlineText} numberOfLines={1}>
                  {sortedStatusLabel}
                </Text>
                <ChevronDown size={14} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.filterGridCol}>
              <Text style={styles.filterLabel}>Purpose</Text>
              <TouchableOpacity style={styles.pickerBtnInline} onPress={triggerPurposeFilterPicker}>
                <Text style={styles.pickerBtnInlineText} numberOfLines={1}>
                  {sortedPurposeLabel}
                </Text>
                <ChevronDown size={14} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {loading ? (
          <View style={styles.loaderBox}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : (
          <View style={styles.listContainer}>
            {travelCalendars.map((calendar) => {
              const statusTheme = getStatusColor(calendar.status);
              const purposeTheme = getPurposeColor(calendar.purpose);

              return (
                <View key={calendar._id} style={styles.calendarCard}>
                  <View style={styles.cardMainArea}>
                    <View style={styles.badgeRow}>
                      <Text style={styles.cardTitle} numberOfLines={1}>{calendar.title}</Text>
                      <View style={[styles.badgeFrame, { backgroundColor: statusTheme.bg }]}>
                        <Text style={[styles.badgeText, { color: statusTheme.text }]}>{calendar.status}</Text>
                      </View>
                      <View style={[styles.badgeFrame, { backgroundColor: purposeTheme.bg }]}>
                        <Text style={[styles.badgeText, { color: purposeTheme.text }]}>{calendar.purpose}</Text>
                      </View>
                    </View>

                    <View style={styles.gridMetaRows}>
                      <View style={styles.metaRowItem}>
                        <Calendar size={14} color={colors.textMuted} />
                        <Text style={styles.metaRowText} numberOfLines={1}>
                          {safeFormatDate(calendar.startDate, "MMM dd, yyyy")} - {safeFormatDate(calendar.endDate, "MMM dd, yyyy")}
                        </Text>
                      </View>

                      <View style={styles.metaRowItem}>
                        <MapPin size={14} color={colors.textMuted} />
                        <Text style={styles.metaRowText} numberOfLines={1}>{calendar.destination}</Text>
                      </View>
                    </View>

                    {!!calendar.description && (
                      <Text style={styles.descText} numberOfLines={2}>{calendar.description}</Text>
                    )}

                    {!!calendar.budget && calendar.budget.estimated > 0 && (
                      <View style={styles.budgetTextRow}>
                        <DollarSign size={14} color={colors.textBold} />
                        <Text style={styles.budgetText}>
                          Budget: {calendar.budget.currency} {calendar.budget.estimated}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.cardActionsRow}>
                    <TouchableOpacity 
                      style={styles.actionIconBtn}
                      onPress={() => {
                        setSelectedCalendar(calendar);
                        setShowViewDialog(true);
                      }}
                    >
                      <Eye size={15} color={colors.text} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionIconBtn} onPress={() => openEditModal(calendar)}>
                      <Edit size={14} color={colors.text} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionIconBtn} onPress={() => handleDelete(calendar._id)}>
                      <Trash2 size={14} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}

            {travelCalendars.length === 0 && (
              <View style={styles.emptyStateCard}>
                <Calendar size={40} color={colors.textMuted} />
                <Text style={styles.emptyStateTitle}>No travel calendars found</Text>
                <Text style={styles.emptyStateSub}>Get started by creating your first travel calendar entry</Text>
                <TouchableOpacity 
                  style={styles.addBtn} 
                  onPress={() => {
                    setIsEditing(false);
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
                    setShowCreateDialog(true);
                  }}
                >
                  <Plus size={14} color={colors.background} />
                  <Text style={styles.addBtnText}>Add Travel</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <Modal visible={showCreateDialog} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {isEditing ? "Update Travel Entry" : "Create Travel Calendar Entry"}
            </Text>
            <TouchableOpacity onPress={() => setShowCreateDialog(false)}>
              <X size={20} color={colors.textBold} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={{ gap: hp(0.5) }}>
              <Text style={styles.fieldLabel}>Title *</Text>
              <TextInput 
                style={styles.inputControl}
                value={newTravelCalendar.title}
                onChangeText={(txt) => setNewTravelCalendar({ ...newTravelCalendar, title: txt })}
                placeholder="Entry label context"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={{ gap: hp(0.5) }}>
              <Text style={styles.fieldLabel}>Destination *</Text>
              <TextInput 
                style={styles.inputControl}
                value={newTravelCalendar.destination}
                onChangeText={(txt) => setNewTravelCalendar({ ...newTravelCalendar, destination: txt })}
                placeholder="Target region geo location"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.formGridRow}>
              <View style={styles.formGridCol}>
                <Text style={styles.fieldLabel}>Start Date *</Text>
                <TextInput 
                  style={styles.inputControl}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textMuted}
                  value={newTravelCalendar.startDate}
                  onChangeText={(txt) => setNewTravelCalendar({ ...newTravelCalendar, startDate: txt })}
                />
              </View>

              <View style={styles.formGridCol}>
                <Text style={styles.fieldLabel}>End Date *</Text>
                <TextInput 
                  style={styles.inputControl}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textMuted}
                  value={newTravelCalendar.endDate}
                  onChangeText={(txt) => setNewTravelCalendar({ ...newTravelCalendar, endDate: txt })}
                />
              </View>
            </View>

            <View style={styles.formGridRow}>
              <View style={styles.formGridCol}>
                <Text style={styles.fieldLabel}>Purpose</Text>
                <TouchableOpacity style={styles.pickerBtnInline} onPress={triggerFormPurposePicker}>
                  <Text style={[styles.pickerBtnInlineText, { textTransform: "capitalize" }]}>
                    {newTravelCalendar.purpose}
                  </Text>
                  <ChevronDown size={14} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={styles.formGridCol}>
                <Text style={styles.fieldLabel}>Visibility</Text>
                <TouchableOpacity style={styles.pickerBtnInline} onPress={triggerFormVisibilityPicker}>
                  <Text style={[styles.pickerBtnInlineText, { textTransform: "capitalize" }]}>
                    {newTravelCalendar.visibility}
                  </Text>
                  <ChevronDown size={14} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formGridRow}>
              <View style={styles.formGridCol}>
                <Text style={styles.fieldLabel}>Status</Text>
                <TouchableOpacity style={styles.pickerBtnInline} onPress={triggerFormStatusPicker}>
                  <Text style={[styles.pickerBtnInlineText, { textTransform: "capitalize" }]}>
                    {newTravelCalendar.status}
                  </Text>
                  <ChevronDown size={14} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={styles.formGridCol}>
                <Text style={styles.fieldLabel}>Estimated Budget</Text>
                <TextInput 
                  style={styles.inputControl}
                  keyboardType="numeric"
                  value={String(newTravelCalendar.budget?.estimated ?? 0)}
                  onChangeText={(txt) => setNewTravelCalendar({
                    ...newTravelCalendar,
                    budget: {
                      estimated: Number(txt) || 0,
                      actual: newTravelCalendar.budget?.actual ?? 0,
                      currency: newTravelCalendar.budget?.currency || "USD"
                    }
                  })}
                />
              </View>
            </View>

            <View style={{ gap: hp(0.5) }}>
              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput 
                style={[styles.inputControl, styles.textAreaControl]}
                multiline
                numberOfLines={3}
                value={newTravelCalendar.description}
                onChangeText={(txt) => setNewTravelCalendar({ ...newTravelCalendar, description: txt })}
                placeholder="Structural specifications or agenda summary"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={{ gap: hp(0.5) }}>
              <Text style={styles.fieldLabel}>Notes</Text>
              <TextInput 
                style={[styles.inputControl, styles.textAreaControl]}
                multiline
                numberOfLines={3}
                value={newTravelCalendar.notes}
                onChangeText={(txt) => setNewTravelCalendar({ ...newTravelCalendar, notes: txt })}
                placeholder="Additional operational parameters"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.footerActionsRow}>
              <TouchableOpacity style={styles.formCancelBtn} onPress={() => setShowCreateDialog(false)}>
                <Text style={styles.formCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.formSubmitBtn, !formIsValid && styles.formSubmitBtnDisabled]} 
                disabled={isCreating || !formIsValid}
                onPress={handleCreateOrUpdateTravelCalendar}
              >
                <Text style={styles.formSubmitBtnText}>
                  {isCreating ? "Processing..." : isEditing ? "Save Changes" : "Create Travel"}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal visible={showViewDialog} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Travel Calendar Details</Text>
            <TouchableOpacity onPress={() => setShowViewDialog(false)}>
              <X size={20} color={colors.textBold} />
            </TouchableOpacity>
          </View>

          {selectedCalendar && (
            <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
              <View style={styles.inspectDetailBlock}>
                <View style={styles.inspectSection}>
                  <Text style={styles.inspectLabel}>Title</Text>
                  <Text style={[styles.inspectValue, { fontSize: 18, fontWeight: "700" }]}>
                    {selectedCalendar.title}
                  </Text>
                  <View style={[styles.badgeRow, { marginTop: hp(0.8), marginBottom: 0 }]}>
                    <View style={[styles.badgeFrame, { backgroundColor: getStatusColor(selectedCalendar.status).bg }]}>
                      <Text style={[styles.badgeText, { color: getStatusColor(selectedCalendar.status).text }]}>
                        {selectedCalendar.status}
                      </Text>
                    </View>
                    <View style={[styles.badgeFrame, { backgroundColor: getPurposeColor(selectedCalendar.purpose).bg }]}>
                      <Text style={[styles.badgeText, { color: getPurposeColor(selectedCalendar.purpose).text }]}>
                        {selectedCalendar.purpose}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.formGridRow}>
                  <View style={styles.formGridCol}>
                    <Text style={styles.inspectLabel}>Start Date</Text>
                    <Text style={styles.inspectValue}>
                      {safeFormatDate(selectedCalendar.startDate, "MMMM dd, yyyy")}
                    </Text>
                  </View>

                  <View style={styles.formGridCol}>
                    <Text style={styles.inspectLabel}>End Date</Text>
                    <Text style={styles.inspectValue}>
                      {safeFormatDate(selectedCalendar.endDate, "MMMM dd, yyyy")}
                    </Text>
                  </View>
                </View>

                <View style={styles.inspectSection}>
                  <Text style={styles.inspectLabel}>Destination</Text>
                  <Text style={styles.inspectValue}>{selectedCalendar.destination}</Text>
                </View>

                {!!selectedCalendar.description && (
                  <View style={styles.inspectSection}>
                    <Text style={styles.inspectLabel}>Description</Text>
                    <Text style={styles.inspectValue}>{selectedCalendar.description}</Text>
                  </View>
                )}

                {!!selectedCalendar.budget && selectedCalendar.budget.estimated > 0 && (
                  <View style={styles.inspectSection}>
                    <Text style={styles.inspectLabel}>Budget Assignment</Text>
                    <Text style={styles.inspectValue}>
                      {selectedCalendar.budget.currency} {selectedCalendar.budget.estimated}
                    </Text>
                  </View>
                )}

                {!!selectedCalendar.notes && (
                  <View style={styles.inspectSection}>
                    <Text style={styles.inspectLabel}>Notes</Text>
                    <Text style={styles.inspectValue}>{selectedCalendar.notes}</Text>
                  </View>
                )}
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      <Modal visible={customPickerVisible} animationType="fade" transparent={true}>
        <View style={styles.dropdownOverlay}>
          <View style={styles.dropdownContentCard}>
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownHeaderText}>{customPickerTitle}</Text>
              <TouchableOpacity onPress={() => setCustomPickerVisible(false)} style={{ padding: 4 }}>
                <X size={18} color={colors.textBold} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.dropdownScrollView} showsVerticalScrollIndicator={false}>
              {customPickerOptions.map((opt) => {
                const isActive = customPickerValue === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={styles.dropdownItemRow}
                    onPress={() => {
                      customPickerCallback(opt.value);
                      setCustomPickerVisible(false);
                    }}
                  >
                    <Text style={[styles.dropdownItemText, isActive && styles.dropdownItemTextActive]}>
                      {opt.label}
                    </Text>
                    {isActive && <Check size={16} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}