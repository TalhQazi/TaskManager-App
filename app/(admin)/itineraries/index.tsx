import React, { useEffect, useMemo, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import {
  Search,
  MapPin,
  ChevronDown,
  ChevronUp,
} from "lucide-react-native";
import { apiFetch, listResource } from "@/lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";

interface ItineraryStop {
  id: string;
  title: string;
  address?: string;
  estimatedDurationMinutes?: number;
  sequenceOrder: number;
  travelTimeToNext?: number;
  completed?: boolean;
  completedAt?: string | null;
}

interface Itinerary {
  id: string;
  userId: string;
  date: string;
  startTime?: string;
  optimized?: boolean;
  lastLocation?: {
    latitude: number;
    longitude: number;
    updatedAt: string;
  };
  stops: ItineraryStop[];
}

interface Employee {
  id?: string;
  _id?: string;
  name: string;
  email?: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const getInitials = (name: string) =>
  String(name || "")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

export default function ItineraryHistory() {
  const { uiTheme } = useTheme();
  const isDark = (uiTheme.theme as string) === "dark" || (uiTheme.theme as string) === "metallic-elite";

  const colors = useMemo(() => ({
    background: uiTheme.panelColors?.dashboardBackground || (isDark ? "#0f172a" : "#f8fafc"),
    cardBg: uiTheme.panelColors?.dashboardCardBackground || (isDark ? "#1e293b" : "#ffffff"),
    text: uiTheme.panelColors?.dashboardTextColor || (isDark ? "#f8fafc" : "#0f172a"),
    mutedText: isDark ? "#94a3b8" : "#4b5563",
    border: isDark ? "#334155" : "#e2e8f0",
    inputBg: isDark ? "#1e293b" : "#ffffff",
    inputBorder: isDark ? "#334155" : "#d1d5db",
    inputText: isDark ? "#f8fafc" : "#111827",
    primary: uiTheme.customColors?.primary || "#6366F1",
    secondaryBg: isDark ? "#334155" : "#f3f4f6",
    secondaryText: isDark ? "#cbd5e1" : "#374151",
    divider: isDark ? "#334155" : "#f3f4f6",
    drawerBg: isDark ? "#0f172a" : "#f9fafb",
    stopCardBg: isDark ? "#1e293b" : "#ffffff",
    stopCardBorder: isDark ? "#334155" : "#eceff1",
    successBg: isDark ? "rgba(16, 185, 129, 0.2)" : "#d1fae5",
    successText: isDark ? "#34d399" : "#047857",
    errorText: isDark ? "#f87171" : "#dc2626",
  }), [uiTheme, isDark]);

  const styles = useMemo(() => createStyles(colors), [colors]);

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [searchQuery, setSearchQuery] = useState("");
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [employees, setEmployees] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedItineraries, setExpandedItineraries] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const loadHistory = async () => {
      setLoading(true);
      setError(null);
      try {
        const [{ items: itineraryItems = [] }, rawEmployeeData] = await Promise.all([
          apiFetch<{ items: Itinerary[] }>(`/api/itineraries?date=${encodeURIComponent(date)}`),
          listResource<any>("employees"),
        ]);

        const employeeList = Array.isArray(rawEmployeeData)
          ? rawEmployeeData
          : (rawEmployeeData?.items && Array.isArray(rawEmployeeData.items))
          ? rawEmployeeData.items
          : [];

        const map: Record<string, string> = {};
        employeeList.forEach((employee: Employee) => {
          const key = employee.id || employee._id || "";
          if (key) {
            map[key] = employee.name;
          }
        });

        setEmployees(map);
        setItineraries(itineraryItems || []);
      } catch (err) {
        console.error(err);
        setError((err as Error)?.message || "Failed to load itinerary history.");
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [date]);

  const employeeCount = useMemo(() => {
    const uniqueIds = new Set(itineraries.map((item) => item.userId));
    return uniqueIds.size;
  }, [itineraries]);

  const totalStops = useMemo(
    () => itineraries.reduce((sum, itinerary) => sum + (itinerary.stops?.length || 0), 0),
    [itineraries],
  );

  const completedStops = useMemo(
    () => itineraries.reduce((sum, itinerary) => sum + itinerary.stops.filter((stop) => stop.completed).length, 0),
    [itineraries],
  );

  const filteredItineraries = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return itineraries;

    return itineraries.filter((itinerary) => {
      const employeeName = (employees[itinerary.userId] || "").toLowerCase();
      const stopMatch = itinerary.stops.some((stop) =>
        `${stop.title ?? ""} ${stop.address ?? ""}`.toLowerCase().includes(query),
      );
      return (
        employeeName.includes(query) ||
        itinerary.date.toLowerCase().includes(query) ||
        stopMatch ||
        itinerary.userId.toLowerCase().includes(query)
      );
    });
  }, [itineraries, employees, searchQuery]);

  const toggleExpanded = (id: string) => {
    setExpandedItineraries((current) => ({ ...current, [id]: !current[id] }));
  };

  return (
    <ScrollView style={styles.outerContainer} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.headerBlock}>
        <Text style={styles.mainScreenTitle}>Itinerary History</Text>
        <Text style={styles.subTitleDescription}>
          Review daily route history, completed stops, and live tracking summaries for all field employees.
        </Text>
      </View>

      <View style={styles.filterControlGridRow}>
        <View style={styles.filterInputGroupField}>
          <Text style={styles.filterMicroLabel}>DATE SPECIFICATION</Text>
          <TextInput
            style={styles.filterInputTextLine}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.mutedText}
            value={date}
            onChangeText={setDate}
          />
        </View>

        <View style={styles.filterInputGroupField}>
          <Text style={styles.filterMicroLabel}>SEARCH REGISTRY</Text>
          <View style={styles.searchBarIconWrapper}>
            <Search size={14} color={colors.mutedText} style={styles.embeddedSearchIcon} />
            <TextInput
              style={[styles.filterInputTextLine, { paddingLeft: 34 }]}
              placeholder="Employee or stop..."
              placeholderTextColor={colors.mutedText}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>
      </View>

      <View style={styles.kpiMatrixContainerGrid}>
        <View style={styles.kpiDataCardItem}>
          <Text style={styles.kpiCardMicroTitle}>Itineraries</Text>
          <Text style={styles.kpiCardValueMetricsText}>{itineraries.length}</Text>
        </View>

        <View style={styles.kpiDataCardItem}>
          <Text style={styles.kpiCardMicroTitle}>Active Employees</Text>
          <Text style={styles.kpiCardValueMetricsText}>{employeeCount}</Text>
        </View>

        <View style={styles.kpiDataCardItem}>
          <Text style={styles.kpiCardMicroTitle}>Stops Scheduled</Text>
          <Text style={styles.kpiCardValueMetricsText}>{totalStops}</Text>
        </View>

        <View style={styles.kpiDataCardItem}>
          <Text style={styles.kpiCardMicroTitle}>Completed</Text>
          <Text style={styles.kpiCardValueMetricsText}>{completedStops}</Text>
        </View>
      </View>

      <View style={styles.mainReportDashboardCard}>
        <View style={styles.reportCardHeaderTopInline}>
          <MapPin size={18} color={colors.primary} />
          <Text style={styles.reportCardHeaderTitleText}>
            Route history for {filteredItineraries.length} itinerary
            {filteredItineraries.length === 1 ? "" : "ies"}
          </Text>
        </View>

        {loading ? (
          <View style={styles.centeredStateView}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.informationalTextState}>Parsing system maps history...</Text>
          </View>
        ) : error ? (
          <View style={styles.centeredStateView}>
            <Text style={styles.errorAlertStateMessageText}>{error}</Text>
          </View>
        ) : filteredItineraries.length === 0 ? (
          <View style={styles.emptyPromptCardBlock}>
            <Text style={styles.emptyPromptText}>No itineraries found for this date.</Text>
          </View>
        ) : (
          <View style={styles.reportRowsVerticalDividerStack}>
            {filteredItineraries.map((itinerary) => {
              const employeeName = employees[itinerary.userId] || itinerary.userId;
              const completed = itinerary.stops.filter((stop) => stop.completed).length;
              const total = itinerary.stops.length;
              const expanded = !!expandedItineraries[itinerary.id];

              return (
                <View key={itinerary.id} style={styles.itineraryCardRowWrapper}>
                  <View style={styles.itineraryRowMainFlexBody}>
                    <View style={styles.avatarProfileBlockRowContainer}>
                      <View style={styles.nativeAvatarCircularCapsule}>
                        <Text style={styles.nativeAvatarFallbackInitialsText}>
                          {getInitials(employeeName)}
                        </Text>
                      </View>

                      <View style={styles.employeeMetaTextStack}>
                        <Text style={styles.employeeNameValueText}>{employeeName}</Text>
                        <Text style={styles.routeStartTimeClockLabel}>
                          Start: {itinerary.startTime || "N/A"}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.badgeWrapLayoutRow}>
                      <View style={[styles.statusBadgeFrame, styles.secondaryBadgeThemeBg]}>
                        <Text style={[styles.statusBadgeContentText, styles.secondaryBadgeThemeText]}>
                          {itinerary.optimized ? "OPTIMIZED" : "MANUAL"}
                        </Text>
                      </View>

                      <View style={[styles.statusBadgeFrame, styles.outlineBadgeFrameBorder]}>
                        <Text style={[styles.statusBadgeContentText, styles.outlineBadgeFrameText]}>
                          {completed}/{total} STOPS COMPLETED
                        </Text>
                      </View>

                      {itinerary.lastLocation && (
                        <View style={[styles.statusBadgeFrame, styles.liveBadgeFrameBorder]}>
                          <Text style={[styles.statusBadgeContentText, styles.liveBadgeFrameText]}>
                            LIVE: {itinerary.lastLocation.latitude.toFixed(4)},
                            {itinerary.lastLocation.longitude.toFixed(4)}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={styles.itineraryRowActionsFooterControls}>
                    <TouchableOpacity
                      style={styles.detailsToggleActionTouchableBtn}
                      onPress={() => toggleExpanded(itinerary.id)}
                    >
                      {expanded ? <ChevronUp size={14} color={colors.mutedText} /> : <ChevronDown size={14} color={colors.mutedText} />}
                      <Text style={styles.detailsToggleActionTouchableBtnText}>
                        {expanded ? "Hide details" : "View details"}
                      </Text>
                    </TouchableOpacity>

                    <View style={[styles.statusBadgeFrame, styles.secondaryBadgeThemeBg]}>
                      <Text style={[styles.statusBadgeContentText, styles.secondaryBadgeThemeText]}>
                        {new Date(itinerary.date).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>

                  {expanded && (
                    <View style={styles.drawerInnerContainerCard}>
                      <View style={styles.drawerSummaryMetaTwinGridRow}>
                        <View style={styles.drawerSummaryMetaColumnField}>
                          <Text style={styles.drawerSummaryMicroLabel}>ROUTE SUMMARY</Text>
                          <Text style={styles.drawerSummaryValueBodyText}>
                            {completed} completed, {total - completed} remaining
                          </Text>
                        </View>

                        <View style={styles.drawerSummaryMetaColumnField}>
                          <Text style={styles.drawerSummaryMicroLabel}>LAST UPDATED TIME</Text>
                          <Text style={styles.drawerSummaryValueBodyText}>
                            {itinerary.lastLocation
                              ? new Date(itinerary.lastLocation.updatedAt).toLocaleTimeString()
                              : "No live location pings"}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.nestedStopsListStackArea}>
                        {itinerary.stops.map((stop, idx) => (
                          <View
                            key={stop.id || `${itinerary.id}-${idx}`}
                            style={styles.stopProcessItemBubbleCard}
                          >
                            <View style={styles.stopBubbleCardHeaderTopRow}>
                              <View style={styles.stopBubbleCardTitlesGroupStack}>
                                <Text style={styles.stopBubbleMainTitleText}>
                                  {idx + 1}. {stop.title || "Untitled stop"}
                                </Text>
                                <Text style={styles.stopBubbleSubAddressText}>
                                  {stop.address || "No target address provided"}
                                </Text>
                              </View>

                              <View style={styles.stopBubbleHeaderRightBadgesLayoutRow}>
                                <View style={[styles.statusBadgeFrame, styles.outlineBadgeFrameBorder]}>
                                  <Text style={[styles.statusBadgeContentText, styles.outlineBadgeFrameText]}>
                                    {stop.completed ? "COMPLETED" : "PENDING"}
                                  </Text>
                                </View>
                                <View style={[styles.statusBadgeFrame, styles.secondaryBadgeThemeBg]}>
                                  <Text style={[styles.statusBadgeContentText, styles.secondaryBadgeThemeText]}>
                                    {stop.estimatedDurationMinutes ?? 0} MIN
                                  </Text>
                                </View>
                              </View>
                            </View>

                            <View style={styles.stopBubbleCardFooterSummaryMetaTextRow}>
                              <Text style={styles.stopBubbleFooterMicroText}>
                                {stop.travelTimeToNext ?? 0} min travel duration to next vertex
                              </Text>
                              {stop.completedAt && (
                                <Text style={styles.stopBubbleFooterMicroText}>
                                  Finished: {new Date(stop.completedAt).toLocaleTimeString()}
                                </Text>
                              )}
                            </View>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </View>

      <View style={styles.informationalAuditStoragePanelCard}>
        <View style={styles.auditBlockDescriptionSegment}>
          <Text style={styles.auditSegmentMicroTitle}>Live route processing</Text>
          <Text style={styles.auditSegmentBodyText}>
            Itineraries update in real time as field teams complete stops or transmit automatic GPS device pings.
          </Text>
        </View>

        <View style={styles.auditBlockDescriptionSegment}>
          <Text style={styles.auditSegmentMicroTitle}>Manual review</Text>
          <Text style={styles.auditSegmentBodyText}>
            Open individual itineraries inside the tracking terminal matrix to replay chronological tracking performance.
          </Text>
        </View>

        <View style={styles.auditBlockDescriptionSegment}>
          <Text style={styles.auditSegmentMicroTitle}>Historical auditing</Text>
          <Text style={styles.auditSegmentBodyText}>
            Filter the logs by precise system timestamp fields to inspect operational deviations and historical performance.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    outerContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      padding: 16,
      gap: 16,
    },
    headerBlock: {
      gap: 4,
    },
    mainScreenTitle: {
      fontSize: 22,
      fontWeight: "700",
      color: colors.text,
    },
    subTitleDescription: {
      fontSize: 13,
      color: colors.mutedText,
      lineHeight: 18,
    },
    filterControlGridRow: {
      flexDirection: "row",
      gap: 10,
    },
    filterInputGroupField: {
      flex: 1,
      gap: 6,
    },
    filterMicroLabel: {
      fontSize: 10,
      fontWeight: "700",
      color: colors.mutedText,
      letterSpacing: 1,
    },
    filterInputTextLine: {
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 6,
      height: 38,
      paddingHorizontal: 10,
      fontSize: 13,
      color: colors.inputText,
    },
    searchBarIconWrapper: {
      position: "relative",
      justifyContent: "center",
    },
    embeddedSearchIcon: {
      position: "absolute",
      left: 10,
      zIndex: 2,
    },
    kpiMatrixContainerGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    kpiDataCardItem: {
      width: (SCREEN_WIDTH - 32 - 10) / 2,
      backgroundColor: colors.cardBg,
      borderRadius: 8,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 4,
    },
    kpiCardMicroTitle: {
      fontSize: 12,
      fontWeight: "500",
      color: colors.mutedText,
    },
    kpiCardValueMetricsText: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.text,
    },
    mainReportDashboardCard: {
      backgroundColor: colors.cardBg,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },
    reportCardHeaderTopInline: {
      flexDirection: "row",
      alignItems: "center",
      padding: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
      gap: 8,
    },
    reportCardHeaderTitleText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
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
    errorAlertStateMessageText: {
      fontSize: 13,
      color: colors.errorText,
      textAlign: "center",
      paddingHorizontal: 16,
    },
    emptyPromptCardBlock: {
      padding: 32,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyPromptText: {
      fontSize: 13,
      color: colors.mutedText,
      textAlign: "center",
    },
    reportRowsVerticalDividerStack: {
      width: "100%",
    },
    itineraryCardRowWrapper: {
      padding: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    itineraryRowMainFlexBody: {
      gap: 10,
    },
    avatarProfileBlockRowContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    nativeAvatarCircularCapsule: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    nativeAvatarFallbackInitialsText: {
      color: "#FFF",
      fontSize: 14,
      fontWeight: "700",
    },
    employeeMetaTextStack: {
      gap: 2,
    },
    employeeNameValueText: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.text,
    },
    routeStartTimeClockLabel: {
      fontSize: 11,
      color: colors.mutedText,
    },
    badgeWrapLayoutRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
    },
    statusBadgeFrame: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 4,
      justifyContent: "center",
      alignItems: "center",
    },
    statusBadgeContentText: {
      fontSize: 9,
      fontWeight: "700",
      letterSpacing: 0.4,
    },
    secondaryBadgeThemeBg: {
      backgroundColor: colors.secondaryBg,
    },
    secondaryBadgeThemeText: {
      color: colors.secondaryText,
    },
    outlineBadgeFrameBorder: {
      borderWidth: 1,
      borderColor: colors.border,
    },
    outlineBadgeFrameText: {
      color: colors.mutedText,
    },
    liveBadgeFrameBorder: {
      borderWidth: 1,
      borderColor: colors.successText,
      backgroundColor: colors.successBg,
    },
    liveBadgeFrameText: {
      color: colors.successText,
    },
    itineraryRowActionsFooterControls: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 12,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.divider,
    },
    detailsToggleActionTouchableBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingVertical: 4,
      paddingRight: 12,
    },
    detailsToggleActionTouchableBtnText: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.mutedText,
    },
    drawerInnerContainerCard: {
      marginTop: 12,
      backgroundColor: colors.drawerBg,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      gap: 12,
    },
    drawerSummaryMetaTwinGridRow: {
      flexDirection: "row",
      gap: 12,
    },
    drawerSummaryMetaColumnField: {
      flex: 1,
      gap: 2,
    },
    drawerSummaryMicroLabel: {
      fontSize: 9,
      fontWeight: "700",
      color: colors.mutedText,
      letterSpacing: 0.5,
    },
    drawerSummaryValueBodyText: {
      fontSize: 12,
      color: colors.text,
      fontWeight: "500",
    },
    nestedStopsListStackArea: {
      gap: 8,
    },
    stopProcessItemBubbleCard: {
      backgroundColor: colors.stopCardBg,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.stopCardBorder,
      padding: 10,
      gap: 8,
    },
    stopBubbleCardHeaderTopRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 12,
    },
    stopBubbleCardTitlesGroupStack: {
      flex: 1,
      gap: 2,
    },
    stopBubbleMainTitleText: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.text,
    },
    stopBubbleSubAddressText: {
      fontSize: 11,
      color: colors.mutedText,
      lineHeight: 14,
    },
    stopBubbleHeaderRightBadgesLayoutRow: {
      flexDirection: "row",
      gap: 4,
      alignItems: "center",
    },
    stopBubbleCardFooterSummaryMetaTextRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderTopWidth: 1,
      borderTopColor: colors.divider,
      paddingTop: 6,
      gap: 8,
    },
    stopBubbleFooterMicroText: {
      fontSize: 10,
      color: colors.mutedText,
    },
    informationalAuditStoragePanelCard: {
      backgroundColor: colors.cardBg,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      gap: 12,
    },
    auditBlockDescriptionSegment: {
      gap: 2,
    },
    auditSegmentMicroTitle: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.text,
      letterSpacing: 0.3,
    },
    auditSegmentBodyText: {
      fontSize: 12,
      color: colors.mutedText,
      lineHeight: 16,
    },
  });
}