import React, { useMemo, useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  FlatList,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import Svg, { Line, Circle, G, Text as SvgText } from "react-native-svg";
import * as Location from "expo-location";
import { apiFetch } from "@/lib/admin/apiClient";
import { useSocket } from "@/contexts/SocketContext";
import { useTheme } from "@/contexts/ThemeContext";
import { s, wp, hp, fs } from "@/util/styles";

/* ── Interfaces ──────────────────────────────────────────────────── */
interface Employee {
  id: string;
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface Task {
  id: string;
  _id: string;
  title: string;
  status: string;
  assignees?: string[];
}

interface LocationItem {
  id: string;
  _id: string;
  name: string;
  address: string;
  city: string;
}

interface ItineraryStop {
  id?: string;
  _id?: string;
  title: string;
  address: string;
  latitude: number;
  longitude: number;
  estimatedDurationMinutes: number;
  sequenceOrder: number;
  travelTimeToNext: number;
  taskId?: string;
  locationId?: string;
  completed?: boolean;
}

interface Itinerary {
  id: string;
  _id: string;
  userId: string;
  date: string;
  startTime: string;
  optimized: boolean;
  stops: ItineraryStop[];
}

interface SearchResultItem {
  type: "task" | "location";
  id: string;
  title: string;
  subtitle: string;
  address: string;
  lat: number;
  lng: number;
}

function buildColors(uiTheme: any, isDark: boolean) {
  return {
    background:      uiTheme.panelColors?.dashboardBackground     || (isDark ? "#0b0c16" : "#f8fafc"),
    cardBg:          uiTheme.panelColors?.dashboardCardBackground || (isDark ? "rgba(255, 255, 255, 0.03)" : "#ffffff"),
    cardBgSub:       isDark ? "rgba(255, 255, 255, 0.02)" : "#f1f5f9",
    text:            uiTheme.panelColors?.dashboardTextColor      || (isDark ? "#ffffff" : "#0f172a"),
    textSecondary:   isDark ? "#94a3b8" : "#475569",
    textMuted:       isDark ? "#64748b" : "#94a3b8",
    textDark:        isDark ? "#475569" : "#64748b",
    border:          isDark ? "rgba(255, 255, 255, 0.08)" : "#e2e8f0",
    borderLight:     isDark ? "rgba(255, 255, 255, 0.1)" : "#cbd5e1",
    inputBg:         isDark ? "rgba(0, 0, 0, 0.4)" : "#ffffff",
    primary:         uiTheme.customColors?.primary || "#2563eb",
    accentText:      isDark ? "#60a5fa" : "#2563eb",
    overlayBg:       isDark ? "rgba(0, 0, 0, 0.6)" : "rgba(15, 23, 42, 0.4)",
    modalBg:         isDark ? "#1e293b" : "#ffffff",
  };
}

function createStyles(colors: ReturnType<typeof buildColors>) {
  return StyleSheet.create({
    appContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      paddingHorizontal: wp(4),
      paddingTop: Platform.OS === 'ios' ? hp(6) : hp(3),
      paddingBottom: hp(5),
    },
    headerContainer: {
      marginBottom: hp(2.5),
    },
    headerTitle: {
      fontSize: fs(6),
      fontWeight: "900",
      color: colors.primary,
      letterSpacing: -0.5,
    },
    headerSubtitle: {
      fontSize: fs(3.2),
      color: colors.textSecondary,
      marginTop: hp(0.5),
      lineHeight: fs(4.5),
    },
    controlPanelCard: {
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: wp(3),
      padding: wp(4),
      marginBottom: hp(2.5),
    },
    inputGroup: {
      marginBottom: hp(1.5),
    },
    inputLabel: {
      fontSize: fs(2.8),
      fontWeight: "600",
      color: colors.textSecondary,
      textTransform: "uppercase",
      marginBottom: hp(0.75),
      letterSpacing: 0.5,
    },
    pickerTrigger: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: wp(2),
      paddingHorizontal: wp(3),
      height: hp(5),
    },
    pickerTriggerText: {
      color: colors.textMuted,
      fontSize: fs(3.2),
      flex: 1,
    },
    inputIcon: {
      marginRight: wp(2),
    },
    textInputStyle: {
      flex: 1,
      color: colors.textMuted,
      fontSize: fs(3.2),
      padding: 0,
    },
    primarySaveButton: {
      backgroundColor: colors.primary,
      height: hp(5.2),
      borderRadius: wp(2),
      alignItems: "center",
      justifyContent: "center",
      marginTop: hp(1),
    },
    primarySaveButtonText: {
      color: "#fff",
      fontSize: fs(3.5),
      fontWeight: "700",
    },
    gpsSimulationButtonRow: {
      flexDirection: "row",
      gap: wp(2),
      marginTop: hp(1.5),
    },
    gpsSimulationButton: {
      flex: 1,
      backgroundColor: colors.border,
      paddingVertical: hp(1),
      borderRadius: wp(1.5),
      alignItems: "center",
    },
    gpsSimulationButtonText: {
      color: colors.textSecondary,
      fontSize: fs(2.8),
      fontWeight: "600",
    },
    gpsReoptButton: {
      backgroundColor: "rgba(16, 185, 129, 0.15)",
    },
    gpsReoptButtonText: {
      color: "#34d399",
    },
    sectionContainerCard: {
      backgroundColor: colors.cardBgSub,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: wp(3),
      padding: wp(4),
      marginBottom: hp(2.5),
    },
    sectionHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: hp(2),
    },
    sectionTitle: {
      fontSize: fs(4),
      fontWeight: "800",
      color: colors.textMuted,
      flexDirection: "row",
      alignItems: "center",
      gap: wp(1.5),
    },
    actionHeaderRowRightButtons: {
      flexDirection: "row",
      gap: wp(1.5),
    },
    smallAddStopBtn: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(37, 99, 235, 0.15)",
      borderWidth: 1,
      borderColor: "rgba(59, 130, 246, 0.3)",
      paddingHorizontal: wp(2),
      paddingVertical: hp(0.6),
      borderRadius: wp(1.5),
      gap: wp(1),
    },
    smallAddStopBtnText: {
      color: colors.accentText,
      fontSize: fs(3),
      fontWeight: "600",
    },
    smallOptimizeBtn: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(16, 185, 129, 0.15)",
      borderWidth: 1,
      borderColor: "rgba(16, 185, 129, 0.3)",
      paddingHorizontal: wp(2),
      paddingVertical: hp(0.6),
      borderRadius: wp(1.5),
      gap: wp(1),
    },
    smallOptimizeBtnText: {
      color: "#34d399",
      fontSize: fs(3),
      fontWeight: "600",
    },
    fallbackEmptyStateFrame: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: hp(4),
      borderWidth: 1,
      borderColor: colors.border,
      borderStyle: "dashed",
      borderRadius: wp(2),
      paddingHorizontal: wp(3),
    },
    centeredIconPulse: {
      marginBottom: hp(1),
    },
    fallbackTitleHeadlineText: {
      color: colors.text,
      fontSize: fs(3.5),
      fontWeight: "700",
      marginBottom: hp(0.5),
    },
    fallbackBodySubtitleText: {
      color: colors.textSecondary,
      fontSize: fs(3),
      textAlign: "center",
      lineHeight: fs(4),
    },
    stopsNativeListWrapper: {
      gap: hp(1.2),
    },
    stopFeedItemNodeCard: {
      flexDirection: "row",
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: wp(2.5),
      padding: wp(3),
      justifyContent: "space-between",
    },
    stopFeedItemNodeCardCompleted: {
      backgroundColor: "rgba(16, 185, 129, 0.03)",
      borderColor: "rgba(16, 185, 129, 0.15)",
    },
    stopCardLeftSegment: {
      flexDirection: "row",
      gap: wp(2.5),
      flex: 1,
    },
    stopSequenceCircleBadge: {
      width: wp(6),
      height: wp(6),
      borderRadius: wp(3),
      backgroundColor: "rgba(59, 130, 246, 0.1)",
      borderWidth: 1,
      borderColor: "rgba(59, 130, 246, 0.2)",
      alignItems: "center",
      justifyContent: "center",
    },
    stopSequenceCircleBadgeText: {
      color: colors.accentText,
      fontSize: fs(2.8),
      fontWeight: "700",
    },
    stopItemHeadlineBadgeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: wp(1.5),
    },
    stopItemTitleLabel: {
      color: colors.text,
      fontSize: fs(3.5),
      fontWeight: "700",
      maxWidth: "75%",
    },
    lineThroughTextStyle: {
      textDecorationLine: "line-through",
      color: colors.textDark,
    },
    miniTypeBadgeElement: {
      backgroundColor: "rgba(59, 130, 246, 0.15)",
      paddingHorizontal: wp(1),
      paddingVertical: hp(0.15),
      borderRadius: wp(1),
    },
    miniTypeBadgeElementText: {
      color: colors.accentText,
      fontSize: fs(2),
      fontWeight: "700",
    },
    stopItemAddressMetaString: {
      color: colors.textSecondary,
      fontSize: fs(3),
      marginTop: hp(0.25),
    },
    stopItemSubDurationMetaString: {
      color: colors.textDark,
      fontSize: fs(2.5),
      marginTop: hp(0.5),
    },
    stopCardRightActionsTrack: {
      flexDirection: "column",
      justifyContent: "center",
      gap: hp(0.75),
    },
    actionControlsSequenceRowInline: {
      flexDirection: "row",
      gap: wp(1),
    },
    miniActionButtonNode: {
      width: wp(6),
      height: wp(6),
      backgroundColor: colors.border,
      borderRadius: wp(1),
      alignItems: "center",
      justifyContent: "center",
    },
    miniActionDeleteButtonNode: {
      backgroundColor: "rgba(248, 113, 113, 0.08)",
    },
    addMenuPopoverContainer: {
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: wp(2),
      padding: wp(3),
      marginBottom: hp(1.8),
    },
    addMenuSubtitleText: {
      fontSize: fs(2.5),
      fontWeight: "700",
      color: colors.accentText,
      letterSpacing: 0.5,
      marginBottom: hp(0.75),
    },
    searchBarInlineFrame: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: wp(1.5),
      paddingHorizontal: wp(2),
      height: hp(4.5),
    },
    searchIcon: {
      marginRight: wp(1.5),
    },
    searchTextInputElement: {
      flex: 1,
      color: colors.text,
      fontSize: fs(3),
    },
    searchResultsContainer: {
      backgroundColor: colors.background,
      borderRadius: wp(1.5),
      marginTop: hp(0.75),
      maxHeight: hp(15),
    },
    emptyResultsText: {
      color: colors.textDark,
      fontSize: fs(2.8),
      padding: wp(2),
    },
    searchResultListItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: wp(2),
      borderBottomWidth: 1,
      borderColor: colors.border,
    },
    searchResultItemTitle: {
      color: colors.text,
      fontSize: fs(3),
      fontWeight: "600",
    },
    searchResultItemSubtitle: {
      color: colors.textSecondary,
      fontSize: fs(2.5),
    },
    badgeLabelItem: {
      backgroundColor: "rgba(59, 130, 246, 0.1)",
      paddingHorizontal: wp(1.5),
      paddingVertical: hp(0.25),
      borderRadius: wp(1),
    },
    badgeLabelItemText: {
      color: colors.accentText,
      fontSize: fs(2.2),
    },
    customCoordsDividerBorder: {
      borderTopWidth: 1,
      borderColor: colors.border,
      marginTop: hp(1.2),
      paddingTop: hp(1),
    },
    flexInputsRow: {
      flexDirection: "row",
      gap: wp(1.5),
      marginBottom: hp(0.75),
    },
    inlineFlexField: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: wp(1.5),
      height: hp(4.8),
      paddingHorizontal: wp(2),
      color: colors.text,
      fontSize: fs(2.8),
    },
    customAddButtonTrigger: {
      backgroundColor: colors.primary,
      height: hp(4),
      borderRadius: wp(1.5),
      alignItems: "center",
      justifyContent: "center",
      marginTop: hp(0.5),
    },
    customAddButtonTriggerText: {
      color: "#fff",
      fontSize: fs(3),
      fontWeight: "600",
    },
    svgMapCanvasWrapper: {
      backgroundColor: colors.inputBg,
      borderRadius: wp(2),
      padding: wp(2),
      alignItems: "center",
      marginTop: hp(1),
    },
    legendCanvasRow: {
      flexDirection: "row",
      gap: wp(3),
      marginTop: hp(1),
    },
    legendItemInline: {
      flexDirection: "row",
      alignItems: "center",
      gap: wp(1),
    },
    legendDotItem: {
      width: wp(1.5),
      height: wp(1.5),
      borderRadius: wp(0.75),
    },
    legendDotItemLabel: {
      color: colors.textSecondary,
      fontSize: fs(2.5),
    },
    emptyTimelineStateHolder: {
      paddingVertical: hp(2.5),
      alignItems: "center",
    },
    timelineVerticalTrackBranchContainer: {
      paddingLeft: wp(2),
      marginTop: hp(1.5),
    },
    timelineRowElementFrame: {
      flexDirection: "row",
      gap: wp(3),
      marginBottom: hp(1.8),
    },
    timelineLeftConnectorBlock: {
      alignItems: "center",
      width: wp(4),
    },
    timelineStatusRingAnchor: {
      width: wp(3),
      height: wp(3),
      borderRadius: wp(1.5),
      borderWidth: 2,
      backgroundColor: colors.background,
      alignItems: "center",
      justifyContent: "center",
      marginTop: hp(0.5),
    },
    timelineRingBlue: {
      borderColor: "#3b82f6",
    },
    timelineRingEmerald: {
      borderColor: "#10b981",
    },
    verticalInterconnectLineBar: {
      flex: 1,
      width: 1,
      borderLeftWidth: 1,
      borderColor: colors.border,
      borderStyle: "dashed",
      marginVertical: hp(0.5),
    },
    timelineDataContentBubbleCard: {
      flex: 1,
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: wp(2),
      padding: wp(2.5),
    },
    timelineContentBubbleTopBarMeta: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: hp(0.75),
    },
    timelineTimeFrameBoxBadge: {
      backgroundColor: "rgba(59, 130, 246, 0.1)",
      paddingHorizontal: wp(1.5),
      paddingVertical: hp(0.25),
      borderRadius: wp(1),
    },
    timelineTimeFrameBoxBadgeText: {
      color: colors.accentText,
      fontSize: fs(2.5),
      fontWeight: "700",
    },
    timelineTaskMinsCountText: {
      color: colors.textSecondary,
      fontSize: fs(2.5),
    },
    timelineItemHeadlineTextString: {
      color: colors.text,
      fontSize: fs(3.2),
      fontWeight: "700",
    },
    timelineItemMetaAddressTruncated: {
      color: colors.textSecondary,
      fontSize: fs(2.8),
      marginTop: hp(0.25),
    },
    travelTimeInterconnectLayoutAlertBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: wp(1.5),
      backgroundColor: "rgba(129, 140, 248, 0.08)",
      paddingHorizontal: wp(2),
      paddingVertical: hp(0.5),
      borderRadius: wp(1),
      marginTop: hp(1),
      alignSelf: "flex-start",
    },
    travelTimeInterconnectLayoutAlertBoxText: {
      color: "#c7d2fe",
      fontSize: fs(2.2),
      fontWeight: "600",
    },
    finalEodBlockFrameBadge: {
      backgroundColor: "rgba(129, 140, 248, 0.1)",
      borderWidth: 1,
      borderColor: "rgba(129, 140, 248, 0.2)",
      paddingHorizontal: wp(2.5),
      paddingVertical: hp(0.5),
      borderRadius: wp(1.5),
    },
    finalEodBlockFrameBadgeText: {
      color: "#a5b4fc",
      fontSize: fs(2.8),
      fontWeight: "700",
    },
    modalOverlayContainer: {
      flex: 1,
      backgroundColor: colors.overlayBg,
      justifyContent: "flex-end",
    },
    modalContentBody: {
      backgroundColor: colors.modalBg,
      borderTopLeftRadius: wp(4),
      borderTopRightRadius: wp(4),
      padding: wp(5),
      maxHeight: "55%",
    },
    modalTitleHeadlineText: {
      color: colors.textMuted,
      fontSize: fs(3.8),
      fontWeight: "800",
      marginBottom: hp(1.5),
      textAlign: "center",
    },
    modalSelectionListItemRow: {
      paddingVertical: hp(1.5),
      borderBottomWidth: 1,
      borderColor: colors.border,
    },
    modalSelectionListItemRowText: {
      color: colors.textMuted,
      fontSize: fs(3.5),
    },
    modalCloseTriggerBtn: {
      backgroundColor: colors.border,
      height: hp(4.8),
      borderRadius: wp(2),
      alignItems: "center",
      justifyContent: "center",
      marginTop: hp(1.5),
    },
    modalCloseTriggerBtnText: {
      color: colors.textSecondary,
      fontSize: fs(3.2),
      fontWeight: "600",
    },
  });
}

export default function ItineraryBuilder() {
  const { uiTheme } = useTheme();
  const isDark = (uiTheme?.theme as string) === 'dark' || (uiTheme?.theme as string) === 'metallic-elite';
  const colors = useMemo(() => buildColors(uiTheme, isDark), [uiTheme, isDark]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [locations, setLocations] = useState<LocationItem[]>([]);

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [startTime, setStartTime] = useState<string>("08:00");
  const [navApp, setNavApp] = useState<'google' | 'apple' | 'waze'>("google");

  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [stops, setStops] = useState<ItineraryStop[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const { socket } = useSocket();

  const [employeePickerVisible, setEmployeePickerVisible] = useState(false);
  const [navAppPickerVisible, setNavAppPickerVisible] = useState(false);

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showAddMenu, setShowAddMenu] = useState<boolean>(false);

  const [customTitle, setCustomTitle] = useState("");
  const [customAddress, setCustomAddress] = useState("");
  const [customLat, setCustomLat] = useState("34.0522");
  const [customLng, setCustomLng] = useState("-118.2437");
  const [customDuration, setCustomDuration] = useState("30");

  const triggerToast = (title: string, description: string) => {
    Alert.alert(title, description);
  };

  const fetchItinerary = async (employeeId = selectedEmployeeId, date = selectedDate) => {
    if (!employeeId || !date) return;
    setLoading(true);
    try {
      const res = (await apiFetch(
        `/api/itineraries?employeeId=${employeeId}&date=${date}`
      )) as { items: Itinerary[] };
      if (res.items && res.items.length > 0) {
        const item = res.items[0];
        setItinerary(item);
        setStartTime(item.startTime || "08:00");
        const sortedStops = [...item.stops].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
        setStops(sortedStops);
      } else {
        setItinerary(null);
        setStops([]);
      }
    } catch (err) {
      console.error("Failed to fetch itinerary", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function fetchBaselines() {
      try {
        const [empRes, taskRes, locRes] = await Promise.all([
          apiFetch<any>("/api/employees"),
          apiFetch<any>("/api/tasks"),
          apiFetch<any>("/api/locations")
        ]);

        const emps = (Array.isArray(empRes) ? empRes : (empRes?.items || [])) as Employee[];
        const tsk = (Array.isArray(taskRes) ? taskRes : (taskRes?.items || [])) as Task[];
        const loc = (Array.isArray(locRes) ? locRes : (locRes?.items || [])) as LocationItem[];

        setEmployees(emps);
        setTasks(tsk);
        setLocations(loc);

        if (emps.length > 0) {
          const firstId = emps[0]._id || emps[0].id;
          setSelectedEmployeeId(firstId);
          fetchItinerary(firstId, selectedDate);
        }
      } catch (err) {
        console.error("Error loading baseline data:", err);
      }
    }
    fetchBaselines();
  }, []);

  useEffect(() => {
    if (!selectedEmployeeId || !selectedDate) return;
    fetchItinerary(selectedEmployeeId, selectedDate);
  }, [selectedEmployeeId, selectedDate]);

  useEffect(() => {
    if (!socket || !itinerary) return;

    const handleItineraryUpdate = (payload: { itineraryId: string; userId: string; date: string; stopId?: string; completed?: boolean; }) => {
      if (payload.itineraryId === itinerary._id) {
        fetchItinerary();
        triggerToast("Live Sync", "Itinerary has been updated in real time.");
      }
    };

    const handleLocationPing = (payload: { itineraryId: string; userId: string; latitude: number; longitude: number; reoptimized: boolean; timestamp: string; }) => {
      if (payload.itineraryId === itinerary._id) {
        fetchItinerary();
        triggerToast("Live GPS", payload.reoptimized ? "Route was reoptimized from current location." : "Live location was received.");
      }
    };

    socket.on("itinerary-update", handleItineraryUpdate);
    socket.on("itinerary-location", handleLocationPing);
    return () => {
      socket.off("itinerary-update", handleItineraryUpdate);
      socket.off("itinerary-location", handleLocationPing);
    };
  }, [socket, itinerary]);

  async function saveItinerary(updatedStops = stops) {
    if (!selectedEmployeeId) {
      triggerToast("Selection required", "Please select an employee.");
      return;
    }
    try {
      const payload = {
        userId: selectedEmployeeId,
        date: selectedDate,
        startTime,
        stops: updatedStops.map((sItem, idx) => ({ ...sItem, sequenceOrder: idx }))
      };

      const res = (await apiFetch("/api/itineraries", {
        method: "POST",
        body: JSON.stringify(payload)
      })) as { item: Itinerary };

      setItinerary(res.item);
      const sortedStops = [...res.item.stops].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
      setStops(sortedStops);
      triggerToast("Itinerary Saved", "Daily itinerary has been saved successfully.");
    } catch (err: any) {
      triggerToast("Save failed", err.message || "Unable to save itinerary");
    }
  }

  const searchResults = useMemo(() => {
    if (!searchQuery) return [];
    const q = searchQuery.toLowerCase();

    const matchedTasks = tasks
      .filter(t => t.title?.toLowerCase().includes(q))
      .map(t => ({
        type: "task" as const,
        id: t._id || t.id,
        title: t.title,
        subtitle: `Task - Status: ${t.status}`,
        address: "Field Location Assigned",
        lat: 34.0522 + (Math.random() - 0.5) * 0.1,
        lng: -118.2437 + (Math.random() - 0.5) * 0.1
      }));

    const matchedLocations = locations
      .filter(l => l.name?.toLowerCase().includes(q) || l.address?.toLowerCase().includes(q))
      .map(l => ({
        type: "location" as const,
        id: l._id || l.id,
        title: l.name,
        subtitle: `Location - ${l.city}`,
        address: l.address || `${l.city}, CA`,
        lat: 34.0622 + (Math.random() - 0.5) * 0.05,
        lng: -118.2537 + (Math.random() - 0.5) * 0.05
      }));

    return [...matchedTasks, ...matchedLocations] as SearchResultItem[];
  }, [searchQuery, tasks, locations]);

  function addStop(item: { title: string; address: string; lat: number; lng: number; type: "task" | "location"; id: string }) {
    const newStop: ItineraryStop = {
      title: item.title,
      address: item.address,
      latitude: item.lat,
      longitude: item.lng,
      estimatedDurationMinutes: 30,
      sequenceOrder: stops.length,
      travelTimeToNext: 0,
      taskId: item.type === "task" ? item.id : undefined,
      locationId: item.type === "location" ? item.id : undefined,
      completed: false
    };

    const nextStops = [...stops, newStop];
    setStops(nextStops);
    setSearchQuery("");
    setShowAddMenu(false);
    triggerToast("Stop Added", `"${item.title}" added to daily stop list.`);
    saveItinerary(nextStops);
  }

  function addCustomStop() {
    if (!customTitle || !customAddress) {
      triggerToast("Validation Error", "Title and Address are required");
      return;
    }

    const newStop: ItineraryStop = {
      title: customTitle,
      address: customAddress,
      latitude: Number(customLat) || 34.0522,
      longitude: Number(customLng) || -118.2437,
      estimatedDurationMinutes: Number(customDuration) || 30,
      sequenceOrder: stops.length,
      travelTimeToNext: 0,
      completed: false
    };

    const nextStops = [...stops, newStop];
    setStops(nextStops);
    setCustomTitle("");
    setCustomAddress("");
    setCustomLat("34.0522");
    setCustomLng("-118.2437");
    setCustomDuration("30");
    setShowAddMenu(false);
    triggerToast("Custom Stop Added", `"${newStop.title}" added successfully.`);
    saveItinerary(nextStops);
  }

  function removeStop(index: number) {
    const nextStops = stops.filter((_, idx) => idx !== index);
    setStops(nextStops);
    triggerToast("Stop Removed", "Stop was deleted from list.");
    saveItinerary(nextStops);
  }

  function moveStop(index: number, direction: "up" | "down") {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === stops.length - 1) return;

    const targetIdx = direction === "up" ? index - 1 : index + 1;
    const nextStops = [...stops];
    const temp = nextStops[index];
    nextStops[index] = nextStops[targetIdx];
    nextStops[targetIdx] = temp;

    const updated = nextStops.map((sItem, idx) => ({ ...sItem, sequenceOrder: idx }));
    setStops(updated);
    saveItinerary(updated);
  }

  async function handleOptimize() {
    if (!itinerary || stops.length <= 1) {
      triggerToast("Insufficient stops", "Add at least 2 stops to optimize route.");
      return;
    }

    setLoading(true);
    try {
      const res = (await apiFetch(`/api/itineraries/${itinerary._id}/optimize`, {
        method: "POST"
      })) as { item: Itinerary };

      setItinerary(res.item);
      const sortedStops = [...res.item.stops].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
      setStops(sortedStops);
      triggerToast("Route Optimized!", "Shortest route sequence computed and timeline updated.");
    } catch (err: any) {
      triggerToast("Optimization failed", err.message);
    } finally {
      setLoading(false);
    }
  }

  async function sendLocationPing(reopt = false) {
    if (!itinerary) return triggerToast('No itinerary', 'Save or load an itinerary first');
    
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return triggerToast('Permission Denied', 'Location accessibility permissions required.');
    }

    try {
      setLoading(true);
      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      const res = (await apiFetch(`/api/itineraries/${itinerary._id}/location`, {
        method: 'POST',
        body: JSON.stringify({ latitude, longitude, reoptimize: reopt })
      })) as { item: Itinerary };
      setItinerary(res.item);
      const sortedStops = [...res.item.stops].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
      setStops(sortedStops);
      triggerToast('Location Sent', reopt ? 'Re-optimization attempted' : 'Location saved');
    } catch (err: any) {
      triggerToast('Ping failed', err.message || 'Unable to send location');
    } finally {
      setLoading(false);
    }
  }

  const timelineData = useMemo(() => {
    if (stops.length === 0) return [];

    let currentMinutes = 0;
    const [h, m] = startTime.split(":").map(Number);
    if (!isNaN(h)) currentMinutes = h * 60 + (m || 0);

    return stops.map((stop) => {
      const startHour = Math.floor(currentMinutes / 60) % 24;
      const startMin = currentMinutes % 60;
      const startStr = `${String(startHour).padStart(2, "0")}:${String(startMin).padStart(2, "0")}`;

      const workDuration = stop.estimatedDurationMinutes || 30;
      currentMinutes += workDuration;

      const endHour = Math.floor(currentMinutes / 60) % 24;
      const endMin = currentMinutes % 60;
      const endStr = `${String(endHour).padStart(2, "0")}:${String(endMin).padStart(2, "0")}`;

      const travelTime = stop.travelTimeToNext || 0;
      const nextArrivalMinutes = currentMinutes + travelTime;

      const nextStartHour = Math.floor(nextArrivalMinutes / 60) % 24;
      const nextStartMin = nextArrivalMinutes % 60;
      const nextArrivalStr = `${String(nextStartHour).padStart(2, "0")}:${String(nextStartMin).padStart(2, "0")}`;

      currentMinutes += travelTime;

      return {
        ...stop,
        startTimeStr: startStr,
        endTimeStr: endStr,
        nextArrivalStr,
        workDuration,
        travelTime
      };
    });
  }, [stops, startTime]);

  const openExternalMapApp = async (lat: number, lng: number, appMode = navApp) => {
    let url = "";
    if (appMode === "apple") {
      url = `maps://?daddr=${lat},${lng}`;
    } else if (appMode === "waze") {
      url = `waze://?ll=${lat},${lng}&navigate=yes`;
    } else {
      url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    }

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        const fallbackUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
        await Linking.openURL(fallbackUrl);
      }
    } catch (e) {
      triggerToast("Error", "Could not trigger navigation launch parameters.");
    }
  };

  const currentSelectedEmployeeName = employees.find(e => e.id === selectedEmployeeId || e._id === selectedEmployeeId)?.name || "Select Employee";

  return (
    <ScrollView style={s(styles.appContainer)} contentContainerStyle={s(styles.scrollContent)}>
      
      <View style={s(styles.headerContainer)}>
        <Text style={s(styles.headerTitle)}>Smart Daily Itinerary</Text>
        <Text style={s(styles.headerSubtitle)}>
          Build, structure, and optimize staff schedules with GPS route matrices and dynamic TSP solvers.
        </Text>
      </View>

      <View style={s(styles.controlPanelCard)}>
        <View style={s(styles.inputGroup)}>
          <Text style={s(styles.inputLabel)}>Select Employee</Text>
          <TouchableOpacity style={s(styles.pickerTrigger)} onPress={() => setEmployeePickerVisible(true)}>
            <Feather name="users" size={fs(4)} color={colors.textSecondary} style={s(styles.inputIcon)} />
            <Text style={s(styles.pickerTriggerText)}>{currentSelectedEmployeeName}</Text>
            <Feather name="chevron-down" size={fs(3.5)} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={s(styles.inputGroup)}>
          <Text style={s(styles.inputLabel)}>Itinerary Date</Text>
          <View style={s(styles.pickerTrigger)}>
            <Feather name="calendar" size={fs(4)} color={colors.textSecondary} style={s(styles.inputIcon)} />
            <TextInput
              style={s(styles.textInputStyle)}
              value={selectedDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textSecondary}
              onChangeText={setSelectedDate}
            />
          </View>
        </View>

        <View style={s(styles.inputGroup)}>
          <Text style={s(styles.inputLabel)}>Start Work Day</Text>
          <View style={s(styles.pickerTrigger)}>
            <Feather name="clock" size={fs(4)} color={colors.textSecondary} style={s(styles.inputIcon)} />
            <TextInput
              style={s(styles.textInputStyle)}
              value={startTime}
              placeholder="08:00"
              placeholderTextColor={colors.textSecondary}
              onChangeText={setStartTime}
            />
          </View>
        </View>

        <View style={s(styles.inputGroup)}>
          <Text style={s(styles.inputLabel)}>Navigation App</Text>
          <TouchableOpacity style={s(styles.pickerTrigger)} onPress={() => setNavAppPickerVisible(true)}>
            <Text style={s(styles.pickerTriggerText)}>{navApp.toUpperCase()} MAPS</Text>
            <Feather name="chevron-down" size={fs(3.5)} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={s(styles.primarySaveButton)} onPress={() => saveItinerary()}>
          <Text style={s(styles.primarySaveButtonText)}>Apply Time Parameters</Text>
        </TouchableOpacity>

        <View style={s(styles.gpsSimulationButtonRow)}>
          <TouchableOpacity style={s(styles.gpsSimulationButton)} onPress={() => sendLocationPing(false)}>
            <Text style={s(styles.gpsSimulationButtonText)}>Simulate GPS Ping</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s([styles.gpsSimulationButton, styles.gpsReoptButton])} onPress={() => sendLocationPing(true)}>
            <Text style={s([styles.gpsSimulationButtonText, styles.gpsReoptButtonText])}>Simulate GPS + Re-optimize</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={s(styles.sectionContainerCard)}>
        <View style={s(styles.sectionHeaderRow)}>
          <Text style={s(styles.sectionTitle)}>
            <Feather name="layers" size={fs(4)} color={colors.accentText} /> Itinerary Stops ({stops.length})
          </Text>

          <View style={s(styles.actionHeaderRowRightButtons)}>
            <TouchableOpacity style={s(styles.smallAddStopBtn)} onPress={() => setShowAddMenu(!showAddMenu)}>
              <Feather name="plus" size={fs(3.5)} color={colors.accentText} />
              <Text style={s(styles.smallAddStopBtnText)}>Add</Text>
            </TouchableOpacity>

            {stops.length > 1 && (
              <TouchableOpacity style={s(styles.smallOptimizeBtn)} onPress={handleOptimize} disabled={loading}>
                {loading ? <ActivityIndicator size="small" color="#10b981" /> : <Feather name="shuffle" size={fs(3)} color="#34d399" />}
                <Text style={s(styles.smallOptimizeBtnText)}>Optimize</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {showAddMenu && (
          <View style={s(styles.addMenuPopoverContainer)}>
            <Text style={s(styles.addMenuSubtitleText)}>INTEGRATE TASKS & LOCATIONS</Text>
            <View style={s(styles.searchBarInlineFrame)}>
              <Feather name="search" size={fs(4)} color={colors.textSecondary} style={s(styles.searchIcon)} />
              <TextInput
                style={s(styles.searchTextInputElement)}
                placeholder="Search tasks, clients, locations..."
                placeholderTextColor={colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {searchQuery.length > 0 && (
              <View style={s(styles.searchResultsContainer)}>
                {searchResults.length === 0 ? (
                  <Text style={s(styles.emptyResultsText)}>No database elements found.</Text>
                ) : (
                  searchResults.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={s(styles.searchResultListItem)}
                      onPress={() => addStop({ ...item, type: item.type, id: item.id })}
                    >
                      <View>
                        <Text style={s(styles.searchResultItemTitle)}>{item.title}</Text>
                        <Text style={s(styles.searchResultItemSubtitle)}>{item.subtitle}</Text>
                      </View>
                      <View style={s(styles.badgeLabelItem)}>
                        <Text style={s(styles.badgeLabelItemText)}>+ {item.type}</Text>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}

            <View style={s(styles.customCoordsDividerBorder)}>
              <Text style={s(styles.addMenuSubtitleText)}>OR ADD CUSTOM COORDINATES</Text>
              <View style={s(styles.flexInputsRow)}>
                <TextInput style={s([styles.inlineFlexField, { flex: 1 }])} placeholder="Stop Title" placeholderTextColor={colors.textSecondary} value={customTitle} onChangeText={setCustomTitle} />
                <TextInput style={s([styles.inlineFlexField, { flex: 1 }])} placeholder="Full Address" placeholderTextColor={colors.textSecondary} value={customAddress} onChangeText={setCustomAddress} />
              </View>
              <View style={s(styles.flexInputsRow)}>
                <TextInput style={s([styles.inlineFlexField, { flex: 1 }])} placeholder="Lat" placeholderTextColor={colors.textSecondary} value={customLat} onChangeText={setCustomLat} />
                <TextInput style={s([styles.inlineFlexField, { flex: 1 }])} placeholder="Lng" placeholderTextColor={colors.textSecondary} value={customLng} onChangeText={setCustomLng} />
                <TextInput style={s([styles.inlineFlexField, { flex: 0.8 }])} placeholder="Mins" placeholderTextColor={colors.textSecondary} keyboardType="numeric" value={customDuration} onChangeText={setCustomDuration} />
              </View>
              <TouchableOpacity style={s(styles.customAddButtonTrigger)} onPress={addCustomStop}>
                <Text style={s(styles.customAddButtonTriggerText)}>Add Custom Stop</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {stops.length === 0 ? (
          <View style={s(styles.fallbackEmptyStateFrame)}>
            <Feather name="compass" size={fs(9)} color={colors.textSecondary} style={s(styles.centeredIconPulse)} />
            <Text style={s(styles.fallbackTitleHeadlineText)}>No stops added yet</Text>
            <Text style={s(styles.fallbackBodySubtitleText)}>
              Click 'Add Stop' to select existing assigned tasks, company sites, or custom addresses for this daily route.
            </Text>
          </View>
        ) : (
          <View style={s(styles.stopsNativeListWrapper)}>
            {stops.map((stop, idx) => {
              const isCompleted = stop.completed;
              return (
                <View key={idx} style={s([styles.stopFeedItemNodeCard, isCompleted && styles.stopFeedItemNodeCardCompleted])}>
                  <View style={s(styles.stopCardLeftSegment)}>
                    <View style={s(styles.stopSequenceCircleBadge)}>
                      <Text style={s(styles.stopSequenceCircleBadgeText)}>{idx + 1}</Text>
                    </View>
                    <View style={s({ flex: 1, paddingRight: wp(1) })}>
                      <View style={s(styles.stopItemHeadlineBadgeRow)}>
                        <Text style={s([styles.stopItemTitleLabel, isCompleted && styles.lineThroughTextStyle])} numberOfLines={1}>
                          {stop.title}
                        </Text>
                        {stop.taskId && (
                          <View style={s(styles.miniTypeBadgeElement)}><Text style={s(styles.miniTypeBadgeElementText)}>TASK</Text></View>
                        )}
                      </View>
                      <Text style={s(styles.stopItemAddressMetaString)} numberOfLines={1}>
                        <Feather name="map-pin" size={fs(2.5)} color="#f87171" /> {stop.address}
                      </Text>
                      <Text style={s(styles.stopItemSubDurationMetaString)}>
                        Duration: {stop.estimatedDurationMinutes} mins  •  GPS: {stop.latitude?.toFixed(2)}, {stop.longitude?.toFixed(2)}
                      </Text>
                    </View>
                  </View>

                  <View style={s(styles.stopCardRightActionsTrack)}>
                    <View style={s(styles.actionControlsSequenceRowInline)}>
                      <TouchableOpacity style={s(styles.miniActionButtonNode)} disabled={idx === 0} onPress={() => moveStop(idx, "up")}>
                        <Feather name="arrow-up" size={fs(3)} color={idx === 0 ? colors.border : colors.textSecondary} />
                      </TouchableOpacity>
                      <TouchableOpacity style={s(styles.miniActionButtonNode)} disabled={idx === stops.length - 1} onPress={() => moveStop(idx, "down")}>
                        <Feather name="arrow-down" size={fs(3)} color={idx === stops.length - 1 ? colors.border : colors.textSecondary} />
                      </TouchableOpacity>
                    </View>

                    <View style={s(styles.actionControlsSequenceRowInline)}>
                      <TouchableOpacity style={s(styles.miniActionButtonNode)} onPress={() => openExternalMapApp(stop.latitude, stop.longitude)}>
                        <Feather name="external-link" size={fs(3)} color={colors.accentText} />
                      </TouchableOpacity>
                      <TouchableOpacity style={s([styles.miniActionButtonNode, styles.miniActionDeleteButtonNode])} onPress={() => removeStop(idx)}>
                        <Feather name="trash-2" size={fs(3)} color="#f87171" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {stops.length > 0 && (
        <View style={s(styles.sectionContainerCard)}>
          <Text style={s(styles.sectionTitle)}><Feather name="compass" size={fs(4)} color="#818cf8" /> Route Schema Map</Text>
          <View style={s(styles.svgMapCanvasWrapper)}>
            <Svg height="150" width="100%" viewBox="0 0 340 120">
              {stops.map((stop, idx) => {
                if (idx === stops.length - 1) return null;
                const spacing = 260 / Math.max(1, stops.length - 1);
                const x1 = 40 + idx * spacing;
                const y1 = 60 + (idx % 2 === 0 ? -15 : 15);
                const x2 = 40 + (idx + 1) * spacing;
                const y2 = 60 + ((idx + 1) % 2 === 0 ? -15 : 15);
                return (
                  <Line
                    key={`line-${idx}`}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="rgba(99, 102, 241, 0.4)"
                    strokeWidth="2"
                    strokeDasharray="4 3"
                  />
                );
              })}

              {stops.map((stop, idx) => {
                const spacing = 260 / Math.max(1, stops.length - 1);
                const x = 40 + idx * spacing;
                const y = 60 + (idx % 2 === 0 ? -15 : 15);
                return (
                  <G key={`node-${idx}`}>
                    <Circle cx={x} cy={y} r="10" fill="rgba(59, 130, 246, 0.15)" stroke="rgba(59, 130, 246, 0.5)" strokeWidth="1" />
                    <Circle cx={x} cy={y} r="6" fill={stop.completed ? "#10b981" : "#3b82f6"} />
                    <SvgText x={x} y={y - 12} fill={colors.text} fontSize="8" fontWeight="bold" textAnchor="middle">
                      {idx + 1}
                    </SvgText>
                  </G>
                );
              })}
            </Svg>
            <View style={s(styles.legendCanvasRow)}>
              <View style={s(styles.legendItemInline)}><View style={s([styles.legendDotItem, { backgroundColor: '#3b82f6' }])} /><Text style={s(styles.legendDotItemLabel)}>Pending</Text></View>
              <View style={s(styles.legendItemInline)}><View style={s([styles.legendDotItem, { backgroundColor: '#10b981' }])} /><Text style={s(styles.legendDotItemLabel)}>Completed</Text></View>
            </View>
          </View>
        </View>
      )}

      <View style={s(styles.sectionContainerCard)}>
        <Text style={s(styles.sectionTitle)}><Feather name="clock" size={fs(4)} color="#818cf8" /> Day Timeline View</Text>
        
        {timelineData.length === 0 ? (
          <View style={s(styles.emptyTimelineStateHolder)}>
            <Text style={s(styles.fallbackBodySubtitleText)}>Timeline details will compute automatically as stops are populated.</Text>
          </View>
        ) : (
          <View style={s(styles.timelineVerticalTrackBranchContainer)}>
            {timelineData.map((item, idx) => {
              const isCompleted = item.completed;
              return (
                <View key={idx} style={s(styles.timelineRowElementFrame)}>
                  <View style={s(styles.timelineLeftConnectorBlock)}>
                    <View style={s([styles.timelineStatusRingAnchor, isCompleted ? styles.timelineRingEmerald : styles.timelineRingBlue])}>
                      {isCompleted && <Feather name="check" size={fs(2)} color="#10b981" />}
                    </View>
                    {idx < timelineData.length - 1 && <View style={s(styles.verticalInterconnectLineBar)} />}
                  </View>

                  <View style={s(styles.timelineDataContentBubbleCard)}>
                    <View style={s(styles.timelineContentBubbleTopBarMeta)}>
                      <View style={s(styles.timelineTimeFrameBoxBadge)}>
                        <Text style={s(styles.timelineTimeFrameBoxBadgeText)}>{item.startTimeStr} - {item.endTimeStr}</Text>
                      </View>
                      <Text style={s(styles.timelineTaskMinsCountText)}>{item.workDuration} min task</Text>
                    </View>
                    <Text style={s([styles.timelineItemHeadlineTextString, isCompleted && styles.lineThroughTextStyle])}>{item.title}</Text>
                    <Text style={s(styles.timelineItemMetaAddressTruncated)} numberOfLines={1}>{item.address}</Text>

                    {idx < timelineData.length - 1 && (
                      <View style={s(styles.travelTimeInterconnectLayoutAlertBox)}>
                        <Feather name="navigation" size={fs(2.5)} color="#a5b4fc" style={s({ transform: [{ rotate: '45deg' }] })} />
                        <Text style={s(styles.travelTimeInterconnectLayoutAlertBoxText)}>
                          Travel time to Stop {idx + 2}: {item.travelTimeToNext} mins
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}

            <View style={s(styles.timelineRowElementFrame)}>
              <View style={s(styles.timelineLeftConnectorBlock)}>
                <View style={s([styles.timelineStatusRingAnchor, { borderColor: '#818cf8' }])} />
              </View>
              <View style={s(styles.finalEodBlockFrameBadge)}>
                <Text style={s(styles.finalEodBlockFrameBadgeText)}>🏁 Estimated EOD: {timelineData[timelineData.length - 1]?.nextArrivalStr || "Complete"}</Text>
              </View>
            </View>
          </View>
        )}
      </View>

      <Modal visible={employeePickerVisible} transparent animationType="slide">
        <View style={s(styles.modalOverlayContainer)}>
          <View style={s(styles.modalContentBody)}>
            <Text style={s(styles.modalTitleHeadlineText)}>Select Employee Staff</Text>
            <FlatList
              data={employees}
              keyExtractor={(item) => item.id || item._id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={s(styles.modalSelectionListItemRow)}
                  onPress={() => {
                    setSelectedEmployeeId(item.id || item._id);
                    setEmployeePickerVisible(false);
                  }}
                >
                  <Text style={s(styles.modalSelectionListItemRowText)}>{item.name} ({item.role})</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={s(styles.modalCloseTriggerBtn)} onPress={() => setEmployeePickerVisible(false)}>
              <Text style={s(styles.modalCloseTriggerBtnText)}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={navAppPickerVisible} transparent animationType="slide">
        <View style={s(styles.modalOverlayContainer)}>
          <View style={s(styles.modalContentBody)}>
            <Text style={s(styles.modalTitleHeadlineText)}>Select Navigation Mapping Preference</Text>
            {((['google', 'apple', 'waze'] as const)).map((appOption) => (
              <TouchableOpacity
                key={appOption}
                style={s(styles.modalSelectionListItemRow)}
                onPress={() => {
                  setNavApp(appOption);
                  setNavAppPickerVisible(false);
                }}
              >
                <Text style={s(styles.modalSelectionListItemRowText)}>{appOption.toUpperCase()} MAPS</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={s(styles.modalCloseTriggerBtn)} onPress={() => setNavAppPickerVisible(false)}>
              <Text style={s(styles.modalCloseTriggerBtnText)}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}