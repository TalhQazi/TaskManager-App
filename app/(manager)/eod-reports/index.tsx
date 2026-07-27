import React, { useEffect, useState, useMemo } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Modal,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ClipboardList,
  Clock,
  Search,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  Eye,
  X,
  ChevronDown,
} from "lucide-react-native";
import { getEODReports, getEODStatus } from "@/lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";
import { s, wp, hp, fs } from "@/util/styles";

interface EODReport {
  id: string;
  userId: string;
  employeeName: string;
  date: string;
  rawInput: string;
  inputType: string;
  status: "submitted" | "missing" | "late";
  createdAt: string;
  clockIn?: string;
  clockOut?: string;
  clockInAt?: string | null;
  clockOutAt?: string | null;
  totalHours?: number;
  aiSummary?: string;
  productivityScore?: number;
  flags?: string[];
}

interface EODStatus {
  employeeId: string;
  employeeName: string;
  status: "submitted" | "missing" | "late" | "not_clocked_in";
  clockIn?: string;
  clockOut?: string;
  clockInAt?: string | null;
  clockOutAt?: string | null;
  reportSubmittedAt?: string;
}

function buildColors(uiTheme: any, isDark: boolean) {
  return {
    background:    uiTheme.panelColors?.dashboardBackground     || (isDark ? "#09090b" : "#f8fafc"),
    card:          uiTheme.panelColors?.dashboardCardBackground || (isDark ? "#121214" : "#ffffff"),
    surface:       isDark ? "#1a1a1e" : "#f1f5f9",
    primary:       uiTheme.customColors?.primary                || "#ffd27a",
    text:          uiTheme.panelColors?.dashboardTextColor      || (isDark ? "#f4f4f5" : "#0f172a"),
    muted:         isDark ? "#a1a1aa" : "#64748b",
    border:        isDark ? "#27272a" : "#e2e8f0",
    success:       "#10b981",
    danger:        "#ef4444",
    warning:       "#f59e0b",
    info:          "#3b82f6",
  };
}

function createStyles(colors: ReturnType<typeof buildColors>) {
  return StyleSheet.create({
    safeContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
      paddingHorizontal: wp(4),
      paddingTop: hp(1),
    },
    centerSection: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    loadingText: {
      color: colors.muted,
      marginTop: hp(1.5),
      fontSize: fs(3.5),
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: hp(2),
    },
    title: {
      fontSize: fs(5.5),
      fontWeight: "800",
      color: colors.text,
      letterSpacing: -0.5,
    },
    subtitle: {
      fontSize: fs(3),
      color: colors.muted,
      marginTop: hp(0.25),
    },
    segmentedToggleGroup: {
      flexDirection: "row",
      backgroundColor: colors.card,
      borderRadius: wp(2),
      padding: wp(0.5),
      borderWidth: 1,
      borderColor: colors.border,
    },
    toggleSegmentBtn: {
      paddingVertical: hp(0.75),
      paddingHorizontal: wp(3),
      borderRadius: wp(1.5),
    },
    toggleSegmentBtnActive: {
      backgroundColor: colors.primary,
    },
    toggleSegmentBtnText: {
      fontSize: fs(3),
      fontWeight: "600",
      color: colors.muted,
    },
    toggleSegmentBtnTextActive: {
      color: colors.background,
    },
    filterCard: {
      backgroundColor: colors.card,
      borderRadius: wp(3),
      padding: wp(3),
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: hp(2),
      gap: hp(1.2),
    },
    filterRowItem: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: wp(2),
      paddingHorizontal: wp(2.5),
    },
    searchIcon: {
      marginRight: wp(2),
    },
    searchInput: {
      flex: 1,
      height: hp(4.8),
      fontSize: fs(3.2),
      color: colors.text,
    },
    formSplitRow: {
      flexDirection: "row",
      gap: wp(2),
      alignItems: "center",
    },
    dateInputText: {
      flex: 1.2,
      height: hp(4.8),
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: wp(2),
      paddingHorizontal: wp(2.5),
      fontSize: fs(3.2),
      color: colors.muted,
    },
    dropdownSelector: {
      flex: 1.5,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: wp(2),
      paddingHorizontal: wp(2.5),
      height: hp(4.8),
    },
    dropdownSelectorText: {
      fontSize: fs(3),
      color: colors.muted,
      fontWeight: "500",
    },
    resetBtn: {
      paddingHorizontal: wp(3),
      height: hp(4.8),
      borderRadius: wp(2),
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      justifyContent: "center",
      alignItems: "center",
    },
    resetBtnText: {
      color: colors.muted,
      fontSize: fs(3),
      fontWeight: "600",
    },
    scrollBodyContainer: {
      paddingBottom: hp(3),
    },
    sectionHeaderTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: hp(1.8),
    },
    sectionTitleLabel: {
      fontSize: fs(3.5),
      fontWeight: "700",
      color: colors.text,
      marginLeft: wp(1.5),
    },
    countBadge: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: wp(1.5),
      paddingVertical: hp(0.25),
      borderRadius: wp(1),
      marginLeft: wp(2),
    },
    countBadgeText: {
      color: colors.primary,
      fontSize: fs(2.5),
      fontWeight: "600",
    },
    emptyContainer: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: hp(8),
      gap: hp(1.5),
    },
    emptyTitle: {
      fontSize: fs(3.2),
      color: colors.muted,
      textAlign: "center",
    },
    dashboardGridLayout: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: wp(2.5),
    },
    gridCardUnit: {
      width: wp(44.5),
      backgroundColor: colors.card,
      borderRadius: wp(3),
      borderWidth: 1,
      borderColor: colors.border,
      padding: wp(3),
      position: "relative",
    },
    cardHeaderIndicatorRow: {
      position: "absolute",
      top: hp(1.5),
      right: wp(3),
      zIndex: 2,
    },
    statusDotElement: {
      width: wp(1.8),
      height: wp(1.8),
      borderRadius: wp(0.9),
    },
    gridAvatarBlock: {
      flexDirection: "row",
      alignItems: "center",
      gap: wp(2),
    },
    avatarBox: {
      width: wp(7),
      height: wp(7),
      borderRadius: wp(3.5),
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    gridEmployeeName: {
      fontSize: fs(3),
      fontWeight: "700",
      color: colors.text,
    },
    gridMetaClockText: {
      fontSize: fs(2.5),
      color: colors.muted,
      marginTop: hp(0.25),
    },
    cardDrilldownHint: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      marginTop: hp(1.2),
      paddingTop: hp(0.8),
      alignItems: "center",
    },
    drilldownHintText: {
      fontSize: fs(2.5),
      color: colors.primary,
      fontWeight: "600",
    },
    reportListItemCard: {
      backgroundColor: colors.card,
      borderRadius: wp(3),
      borderWidth: 1,
      borderColor: colors.border,
      padding: wp(3.5),
      marginBottom: hp(1.2),
    },
    reportListItemTopRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    reportItemNameText: {
      fontSize: fs(3.5),
      fontWeight: "700",
      color: colors.text,
    },
    reportItemDateText: {
      fontSize: fs(2.8),
      color: colors.muted,
      marginTop: hp(0.25),
    },
    badgeStyle: {
      paddingHorizontal: wp(1.5),
      paddingVertical: hp(0.25),
      borderRadius: wp(1),
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
    },
    badgeSuccess: { backgroundColor: "rgba(16, 185, 129, 0.1)", borderColor: "rgba(16, 185, 129, 0.2)" },
    badgeDanger: { backgroundColor: "rgba(239, 68, 68, 0.1)", borderColor: "rgba(239, 68, 68, 0.2)" },
    badgeWarning: { backgroundColor: "rgba(245, 158, 11, 0.1)", borderColor: "rgba(245, 158, 11, 0.2)" },
    badgeMuted: { backgroundColor: "rgba(161, 161, 170, 0.08)", borderColor: "rgba(161, 161, 170, 0.2)" },
    badgeText: {
      fontSize: fs(2.5),
      fontWeight: "700",
    },
    reportItemMiddlePreviewBlock: {
      marginVertical: hp(1.2),
    },
    reportItemPreviewContentText: {
      fontSize: fs(3),
      color: colors.text,
      lineHeight: fs(4),
    },
    reportItemFooterSummaryRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: hp(1),
    },
    reportFooterHoursLabel: {
      fontSize: fs(2.8),
      color: colors.muted,
    },
    actionIconButtonLink: {
      flexDirection: "row",
      alignItems: "center",
    },
    actionViewLabelText: {
      fontSize: fs(2.8),
      color: colors.primary,
      fontWeight: "600",
    },
    modalBackdropOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.75)",
      justifyContent: "flex-end",
    },
    bottomSheetWrapper: {
      backgroundColor: colors.card,
      borderTopLeftRadius: wp(4),
      borderTopRightRadius: wp(4),
      padding: wp(4),
      borderWidth: 1,
      borderColor: colors.border,
    },
    bottomSheetHeaderTitleRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: hp(2),
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingBottom: hp(1.5),
    },
    bottomSheetHeaderTitle: {
      fontSize: fs(4),
      fontWeight: "800",
      color: colors.text,
      letterSpacing: -0.3,
    },
    pickerItemRowUnit: {
      paddingVertical: hp(1.5),
      borderBottomWidth: 1,
      borderBottomColor: colors.surface,
    },
    pickerItemLabelText: {
      fontSize: fs(3.2),
      color: colors.text,
      fontWeight: "500",
    },
    fullscreenDialogContainer: {
      backgroundColor: colors.card,
      borderTopLeftRadius: wp(5),
      borderTopRightRadius: wp(5),
      height: "85%",
      padding: wp(4),
      borderWidth: 1,
      borderColor: colors.border,
    },
    closeOverlayBtnCircle: {
      width: wp(7),
      height: wp(7),
      borderRadius: wp(3.5),
      backgroundColor: colors.surface,
      justifyContent: "center",
      alignItems: "center",
    },
    dialogFormScrollContainer: {
      flex: 1,
    },
    dialogMetadataGridContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      backgroundColor: colors.surface,
      borderRadius: wp(3),
      borderWidth: 1,
      borderColor: colors.border,
      padding: wp(2),
      marginBottom: hp(1.8),
    },
    metadataGridHalfItem: {
      width: "50%",
      padding: wp(1.5),
    },
    metadataItemLabel: {
      fontSize: fs(2.5),
      color: colors.muted,
      textTransform: "uppercase",
      letterSpacing: 0.3,
    },
    metadataItemValue: {
      fontSize: fs(3.2),
      fontWeight: "600",
      color: colors.text,
      marginTop: hp(0.25),
    },
    metricCardBlockContainer: {
      marginBottom: hp(1.5),
    },
    metricBlockHeaderLabel: {
      fontSize: fs(3),
      fontWeight: "700",
      color: colors.muted,
      marginBottom: hp(0.8),
      paddingLeft: wp(0.5),
    },
    metricContentCardBodyBox: {
      padding: wp(3),
      borderRadius: wp(2),
      borderWidth: 1,
    },
    metricContentDetailsText: {
      fontSize: fs(3),
      color: colors.text,
      lineHeight: fs(4.5),
    },
    aiInsightBodyOverride: {
      backgroundColor: "rgba(147, 51, 234, 0.05)",
      borderColor: "rgba(147, 51, 234, 0.2)",
    },
    insightRawTextContent: {
      fontSize: fs(3),
      color: "#d8b4fe",
      lineHeight: fs(4.5),
    },
    flaggedIncidentBodyOverride: {
      backgroundColor: "rgba(245, 158, 11, 0.05)",
      borderColor: "rgba(245, 158, 11, 0.2)",
    },
    horizontalTagWrapperList: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: wp(1.5),
    },
    flaggedPillBadge: {
      backgroundColor: "rgba(245, 158, 11, 0.15)",
      paddingHorizontal: wp(2),
      paddingVertical: hp(0.4),
      borderRadius: wp(1),
      borderWidth: 1,
      borderColor: "rgba(245, 158, 11, 0.3)",
    },
    flaggedPillTextLabel: {
      color: colors.warning,
      fontSize: fs(2.5),
      fontWeight: "700",
    },
    successMetricsCardBox: {
      backgroundColor: "rgba(16, 185, 129, 0.03)",
      borderColor: colors.border,
    },
    warningMetricsCardBox: {
      backgroundColor: "rgba(239, 68, 68, 0.03)",
      borderColor: colors.border,
    },
    standardMetricsCardBox: {
      backgroundColor: "rgba(59, 130, 246, 0.03)",
      borderColor: colors.border,
    },
    dialogFooterActionBar: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: hp(1.5),
      paddingBottom: Platform.OS === "ios" ? hp(1.5) : hp(0.5),
    },
    footerActionSubmitBtn: {
      backgroundColor: colors.primary,
      height: hp(5.2),
      borderRadius: wp(2),
      justifyContent: "center",
      alignItems: "center",
    },
    footerActionSubmitBtnText: {
      color: colors.background,
      fontSize: fs(3.5),
      fontWeight: "700",
    },
  });
}

export default function ManagerEODReports() {
  const { uiTheme } = useTheme();
  const isDark = (uiTheme?.theme as string) === "dark" || (uiTheme?.theme as string) === "metallic-elite";
  const colors = useMemo(() => buildColors(uiTheme, isDark), [uiTheme, isDark]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [reports, setReports] = useState<EODReport[]>([]);
  const [statusList, setStatusList] = useState<EODStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  const today = new Date().toISOString().split("T")[0];
  const [viewMode, setViewMode] = useState<"status" | "reports">("reports");
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedReport, setSelectedReport] = useState<EODReport | null>(null);
  const [statusPickerOpen, setStatusPickerOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, [dateFilter, statusFilter, viewMode]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [reportsRes, statusRes] = await Promise.all([
        getEODReports({
          date: dateFilter || undefined,
          status: statusFilter === "all" ? undefined : statusFilter,
        }),
        getEODStatus(dateFilter || today),
      ]);
      setReports((reportsRes as any)?.items || []);
      setStatusList((statusRes as any)?.items || []);
    } catch (err) {
      console.error("Failed to load EOD data:", err);
      Alert.alert("Error", "Failed to load EOD data");
    } finally {
      setLoading(false);
    }
  };

  const filteredReports = useMemo(() => {
    return reports.filter((report) =>
      report.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      new Date(report.date).toLocaleDateString().includes(searchQuery)
    );
  }, [reports, searchQuery]);

  const filteredStatus = useMemo(() => {
    return statusList.filter((status) =>
      status.employeeName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [statusList, searchQuery]);

  const parseEODData = (rawInput: string) => {
    try {
      return JSON.parse(rawInput);
    } catch {
      return { tasksCompleted: rawInput, issuesBlockers: "", notes: "" };
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatLocalClock = (timeStr?: string | null, isoAt?: string | null): string => {
    if (isoAt) {
      const d = new Date(isoAt);
      if (Number.isFinite(d.getTime())) {
        return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      }
    }
    return String(timeStr || "").trim() || "—";
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "submitted":
        return (
          <View style={s([styles.badgeStyle, styles.badgeSuccess])}>
            <CheckCircle size={fs(2.8)} color={colors.success} style={s({ marginRight: wp(1) })} />
            <Text style={s([styles.badgeText, { color: colors.success }])}>Submitted</Text>
          </View>
        );
      case "missing":
        return (
          <View style={s([styles.badgeStyle, styles.badgeDanger])}>
            <XCircle size={fs(2.8)} color={colors.danger} style={s({ marginRight: wp(1) })} />
            <Text style={s([styles.badgeText, { color: colors.danger }])}>Missing</Text>
          </View>
        );
      case "late":
        return (
          <View style={s([styles.badgeStyle, styles.badgeWarning])}>
            <AlertCircle size={fs(2.8)} color={colors.warning} style={s({ marginRight: wp(1) })} />
            <Text style={s([styles.badgeText, { color: colors.warning }])}>Late</Text>
          </View>
        );
      case "not_clocked_in":
        return (
          <View style={s([styles.badgeStyle, styles.badgeMuted])}>
            <Clock size={fs(2.8)} color={colors.muted} style={s({ marginRight: wp(1) })} />
            <Text style={s([styles.badgeText, { color: colors.muted }])}>Not Clocked In</Text>
          </View>
        );
      default:
        return (
          <View style={s([styles.badgeStyle, { borderColor: colors.border }])}>
            <Text style={s([styles.badgeText, { color: colors.text }])}>{status}</Text>
          </View>
        );
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={s(styles.safeContainer)}>
        <View style={s(styles.centerSection)}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={s(styles.loadingText)}>Loading EOD data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s(styles.safeContainer)}>
      <View style={s(styles.container)}>
        
        <View style={s(styles.header)}>
          <View style={s({ flex: 1, marginRight: wp(2) })}>
            <Text style={s(styles.title)}>End-of-Day Reports</Text>
            <Text style={s(styles.subtitle)}>Monitor daily activities & workforce alignment</Text>
          </View>
          <View style={s(styles.segmentedToggleGroup)}>
            <TouchableOpacity
              style={s([styles.toggleSegmentBtn, viewMode === "reports" && styles.toggleSegmentBtnActive])}
              onPress={() => { setViewMode("reports"); setDateFilter(""); }}
            >
              <Text style={s([styles.toggleSegmentBtnText, viewMode === "reports" && styles.toggleSegmentBtnTextActive])}>Reports</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s([styles.toggleSegmentBtn, viewMode === "status" && styles.toggleSegmentBtnActive])}
              onPress={() => { setViewMode("status"); setDateFilter(today); }}
            >
              <Text style={s([styles.toggleSegmentBtnText, viewMode === "status" && styles.toggleSegmentBtnTextActive])}>Dashboard</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={s(styles.filterCard)}>
          <View style={s(styles.filterRowItem)}>
            <Search size={fs(4)} color={colors.muted} style={s(styles.searchIcon)} />
            <TextInput
              style={s(styles.searchInput)}
              placeholder="Search employee name..."
              placeholderTextColor={colors.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <View style={s(styles.formSplitRow)}>
            <TextInput
              style={s(styles.dateInputText)}
              value={dateFilter}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.muted}
              onChangeText={setDateFilter}
            />

            <TouchableOpacity style={s(styles.dropdownSelector)} onPress={() => setStatusPickerOpen(true)}>
              <Text style={s(styles.dropdownSelectorText)} numberOfLines={1}>
                {statusFilter === "all" ? "All Status" : statusFilter.toUpperCase()}
              </Text>
              <ChevronDown size={fs(3.5)} color={colors.muted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={s(styles.resetBtn)}
              onPress={() => { setDateFilter(viewMode === "status" ? today : ""); setStatusFilter("all"); setSearchQuery(""); }}
            >
              <Text style={s(styles.resetBtnText)}>Reset</Text>
            </TouchableOpacity>
          </View>
        </View>

        {viewMode === "status" && (
          <ScrollView contentContainerStyle={s(styles.scrollBodyContainer)} showsVerticalScrollIndicator={false}>
            <View style={s(styles.sectionHeaderTitleRow)}>
              <ClipboardList size={fs(4)} color={colors.primary} />
              <Text style={s(styles.sectionTitleLabel)}>Employee EOD Status</Text>
              <View style={s(styles.countBadge)}>
                <Text style={s(styles.countBadgeText)}>{filteredStatus.length} Employees</Text>
              </View>
            </View>

            {filteredStatus.length === 0 ? (
              <View style={s(styles.emptyContainer)}>
                <ClipboardList size={fs(10)} color={colors.border} />
                <Text style={s(styles.emptyTitle)}>No tracking match records found</Text>
              </View>
            ) : (
              <View style={s(styles.dashboardGridLayout)}>
                {filteredStatus.map((statusItem) => {
                  const isGreen = statusItem.status === "submitted";
                  const isYellow = statusItem.status === "late";
                  const isRed = statusItem.status === "missing";
                  const isGray = statusItem.status === "not_clocked_in";

                  return (
                    <TouchableOpacity
                      key={statusItem.employeeId}
                      style={s([
                        styles.gridCardUnit,
                        isGreen && { borderColor: "rgba(16, 185, 129, 0.4)" },
                        isYellow && { borderColor: "rgba(245, 158, 11, 0.4)" },
                        isRed && { borderColor: "rgba(239, 68, 68, 0.4)" },
                      ])}
                      onPress={() => {
                        const matchedReport = reports.find((r) => r.employeeName === statusItem.employeeName);
                        if (matchedReport) {
                          setSelectedReport(matchedReport);
                        } else if (statusItem.status !== "not_clocked_in") {
                          Alert.alert("Notice", "No compiled structured profile found for this worker.");
                        }
                      }}
                      disabled={isGray}
                    >
                      <View style={s(styles.cardHeaderIndicatorRow)}>
                        <View style={s([
                          styles.statusDotElement,
                          isGreen && { backgroundColor: colors.success },
                          isYellow && { backgroundColor: colors.warning },
                          isRed && { backgroundColor: colors.danger },
                          isGray && { backgroundColor: colors.muted }
                        ])} />
                      </View>

                      <View style={s(styles.gridAvatarBlock)}>
                        <View style={s(styles.avatarBox)}>
                          <User size={fs(4)} color={colors.primary} />
                        </View>
                        <View style={s({ flex: 1 })}>
                          <Text style={s(styles.gridEmployeeName)} numberOfLines={1}>{statusItem.employeeName}</Text>
                          <Text style={s(styles.gridMetaClockText)} numberOfLines={1}>
                            {statusItem.clockIn ? `In: ${formatLocalClock(statusItem.clockIn, statusItem.clockInAt)}` : "Not Clocked In"}
                          </Text>
                        </View>
                      </View>

                      <View style={s({ marginTop: hp(0.8), alignItems: "flex-start" })}>
                        {renderStatusBadge(statusItem.status)}
                      </View>

                      {statusItem.clockOut && (
                        <Text style={s([styles.gridMetaClockText, { marginTop: hp(0.5) }])}>
                          Out: {formatLocalClock(statusItem.clockOut, statusItem.clockOutAt)}
                        </Text>
                      )}

                      {statusItem.reportSubmittedAt && (
                        <Text style={s([styles.gridMetaClockText, { marginTop: hp(0.25), color: colors.primary }])}>
                          Sent: {new Date(statusItem.reportSubmittedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </Text>
                      )}

                      {!isGray && (
                        <View style={s(styles.cardDrilldownHint)}>
                          <Text style={s(styles.drilldownHintText)}>View Parameters</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </ScrollView>
        )}

        {viewMode === "reports" && (
          <View style={s({ flex: 1 })}>
            <View style={s(styles.sectionHeaderTitleRow)}>
              <ClipboardList size={fs(4)} color={colors.primary} />
              <Text style={s(styles.sectionTitleLabel)}>Historical Summaries</Text>
              <View style={s(styles.countBadge)}>
                <Text style={s(styles.countBadgeText)}>{filteredReports.length} Logs</Text>
              </View>
            </View>

            {filteredReports.length === 0 ? (
              <View style={s(styles.emptyContainer)}>
                <ClipboardList size={fs(10)} color={colors.border} />
                <Text style={s(styles.emptyTitle)}>No historical submissions logged</Text>
              </View>
            ) : (
              <FlatList
                data={filteredReports}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                renderItem={({ item: reportItem }) => (
                  <TouchableOpacity
                    style={s(styles.reportListItemCard)}
                    onPress={() => setSelectedReport(reportItem)}
                  >
                    <View style={s(styles.reportListItemTopRow)}>
                      <View style={s({ flex: 1 })}>
                        <Text style={s(styles.reportItemNameText)}>{reportItem.employeeName}</Text>
                        <Text style={s(styles.reportItemDateText)}>{formatDate(reportItem.date)}</Text>
                      </View>
                      <View>{renderStatusBadge(reportItem.status)}</View>
                    </View>

                    <View style={s(styles.reportItemMiddlePreviewBlock)}>
                      <Text style={s(styles.reportItemPreviewContentText)} numberOfLines={2}>
                        {parseEODData(reportItem.rawInput).tasksCompleted || "No metrics compiled."}
                      </Text>
                    </View>

                    <View style={s(styles.reportItemFooterSummaryRow)}>
                      <Text style={s(styles.reportFooterHoursLabel)}>
                        Duration: <Text style={s({ color: colors.primary, fontWeight: "600" })}>{reportItem.totalHours ? `${reportItem.totalHours.toFixed(2)}h` : "—"}</Text>
                      </Text>
                      <View style={s(styles.actionIconButtonLink)}>
                        <Eye size={fs(3.5)} color={colors.primary} style={s({ marginRight: wp(1) })} />
                        <Text style={s(styles.actionViewLabelText)}>Metrics</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                )}
                contentContainerStyle={s({ paddingBottom: hp(3) })}
              />
            )}
          </View>
        )}

        <Modal visible={statusPickerOpen} transparent animationType="slide">
          <View style={s(styles.modalBackdropOverlay)}>
            <View style={s(styles.bottomSheetWrapper)}>
              <View style={s(styles.bottomSheetHeaderTitleRow)}>
                <Text style={s(styles.bottomSheetHeaderTitle)}>Select Status Filter</Text>
                <TouchableOpacity onPress={() => setStatusPickerOpen(false)}>
                  <X size={fs(5)} color={colors.text} />
                </TouchableOpacity>
              </View>
              {["all", "submitted", "missing", "late"].map((statusOption) => (
                <TouchableOpacity
                  key={statusOption}
                  style={s(styles.pickerItemRowUnit)}
                  onPress={() => {
                    setStatusFilter(statusOption);
                    setStatusPickerOpen(false);
                  }}
                >
                  <Text style={s(styles.pickerItemLabelText)}>
                    {statusOption === "all" ? "All Status Metrics" : statusOption.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Modal>

        <Modal visible={!!selectedReport} transparent animationType="fade">
          <View style={s(styles.modalBackdropOverlay)}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={s({ flex: 1, justifyContent: "flex-end", width: "100%" })}>
              <View style={s(styles.fullscreenDialogContainer)}>
                <View style={s([styles.bottomSheetHeaderTitleRow, { paddingHorizontal: wp(1) }])}>
                  <View style={s({ flex: 1 })}>
                    <Text style={s(styles.bottomSheetHeaderTitle)}>EOD Summary Metrics</Text>
                    <Text style={s({ color: colors.muted, fontSize: fs(3), marginTop: hp(0.25) })}>Comprehensive workspace activity evaluation</Text>
                  </View>
                  <TouchableOpacity style={s(styles.closeOverlayBtnCircle)} onPress={() => setSelectedReport(null)}>
                    <X size={fs(4.5)} color={colors.text} />
                  </TouchableOpacity>
                </View>

                {selectedReport && (
                  <ScrollView style={s(styles.dialogFormScrollContainer)} showsVerticalScrollIndicator={false}>
                    
                    <View style={s(styles.dialogMetadataGridContainer)}>
                      <View style={s(styles.metadataGridHalfItem)}><Text style={s(styles.metadataItemLabel)}>Employee</Text><Text style={s(styles.metadataItemValue)}>{selectedReport.employeeName}</Text></View>
                      <View style={s(styles.metadataGridHalfItem)}><Text style={s(styles.metadataItemLabel)}>Date</Text><Text style={s(styles.metadataItemValue)}>{formatDate(selectedReport.date)}</Text></View>
                      <View style={s(styles.metadataGridHalfItem)}><Text style={s(styles.metadataItemLabel)}>Clock In</Text><Text style={s(styles.metadataItemValue)}>{formatLocalClock(selectedReport.clockIn, selectedReport.clockInAt)}</Text></View>
                      <View style={s(styles.metadataGridHalfItem)}><Text style={s(styles.metadataItemLabel)}>Clock Out</Text><Text style={s(styles.metadataItemValue)}>{formatLocalClock(selectedReport.clockOut, selectedReport.clockOutAt)}</Text></View>
                      <View style={s(styles.metadataGridHalfItem)}><Text style={s(styles.metadataItemLabel)}>Total Duration</Text><Text style={s([styles.metadataItemValue, { color: colors.primary }])}>{selectedReport.totalHours ? `${selectedReport.totalHours.toFixed(2)} Hours` : "—"}</Text></View>
                      <View style={s(styles.metadataGridHalfItem)}><Text style={s(styles.metadataItemLabel)}>Submission Status</Text><View style={s({ marginTop: hp(0.5), alignItems: "flex-start" })}>{renderStatusBadge(selectedReport.status)}</View></View>
                      <View style={s(styles.metadataGridHalfItem)}><Text style={s(styles.metadataItemLabel)}>Input Channel</Text><Text style={s([styles.metadataItemValue, { textTransform: "capitalize" }])}>{selectedReport.inputType || "UI Layout"}</Text></View>
                      <View style={s(styles.metadataGridHalfItem)}><Text style={s(styles.metadataItemLabel)}>Productivity Score</Text><Text style={s([styles.metadataItemValue, { color: colors.primary, fontWeight: "700" }])}>{selectedReport.productivityScore !== undefined ? `${selectedReport.productivityScore} / 10` : "—"}</Text></View>
                    </View>

                    {selectedReport.aiSummary && (
                      <View style={s(styles.metricCardBlockContainer)}>
                        <Text style={s(styles.metricBlockHeaderLabel)}>✨ AI Core Insight Engine</Text>
                        <View style={s([styles.metricContentCardBodyBox, styles.aiInsightBodyOverride])}>
                          <Text style={s(styles.insightRawTextContent)}>{selectedReport.aiSummary}</Text>
                        </View>
                      </View>
                    )}

                    {selectedReport.flags && selectedReport.flags.length > 0 && (
                      <View style={s(styles.metricCardBlockContainer)}>
                        <Text style={s(styles.metricBlockHeaderLabel)}>⚠️ Operational Compliance Exception Flags</Text>
                        <View style={s([styles.metricContentCardBodyBox, styles.flaggedIncidentBodyOverride])}>
                          <View style={s(styles.horizontalTagWrapperList)}>
                            {selectedReport.flags.map((flagItem, index) => (
                              <View key={index} style={s(styles.flaggedPillBadge)}>
                                <Text style={s(styles.flaggedPillTextLabel)}>{flagItem}</Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      </View>
                    )}

                    {(() => {
                      const computedDataMap = parseEODData(selectedReport.rawInput);
                      return (
                        <View style={s({ gap: hp(1.5), marginTop: hp(1.5) })}>
                          <View style={s(styles.metricCardBlockContainer)}>
                            <Text style={s(styles.metricBlockHeaderLabel)}>✅ Tasks Completed Log</Text>
                            <View style={s([styles.metricContentCardBodyBox, styles.successMetricsCardBox])}>
                              <Text style={s(styles.metricContentDetailsText)}>
                                {computedDataMap.tasksCompleted || "No task context parameters provided."}
                              </Text>
                            </View>
                          </View>

                          {computedDataMap.issuesBlockers ? (
                            <View style={s(styles.metricCardBlockContainer)}>
                              <Text style={s(styles.metricBlockHeaderLabel)}>🚨 Operational Escapes & System Blockers</Text>
                              <View style={s([styles.metricContentCardBodyBox, styles.warningMetricsCardBox])}>
                                <Text style={s(styles.metricContentDetailsText)}>{computedDataMap.issuesBlockers}</Text>
                              </View>
                            </View>
                          ) : null}

                          {computedDataMap.notes ? (
                            <View style={s(styles.metricCardBlockContainer)}>
                              <Text style={s(styles.metricBlockHeaderLabel)}>📝 Operational Log Notes</Text>
                              <View style={s([styles.metricContentCardBodyBox, styles.standardMetricsCardBox])}>
                                <Text style={s(styles.metricContentDetailsText)}>{computedDataMap.notes}</Text>
                              </View>
                            </View>
                          ) : null}
                        </View>
                      );
                    })()}
                    <View style={s({ height: hp(5) })} />
                  </ScrollView>
                )}

                <View style={s(styles.dialogFooterActionBar)}>
                  <TouchableOpacity style={s(styles.footerActionSubmitBtn)} onPress={() => setSelectedReport(null)}>
                    <Text style={s(styles.footerActionSubmitBtnText)}>Dismiss View</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>

      </View>
    </SafeAreaView>
  );
}