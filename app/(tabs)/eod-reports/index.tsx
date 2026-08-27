import React, { useState, useMemo } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Modal,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ClipboardList,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  MessageSquare,
  Search,
  Send,
  X,
  ChevronDown,
} from "lucide-react-native";
import { apiFetch } from "@/lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";
import { s, wp, hp, fs } from "@/util/styles";
import { isDarkTheme } from "@/constants/design/presets";

interface EODComment {
  authorName: string;
  authorRole?: string;
  message: string;
  createdAt: string;
}

interface EODReport {
  id: string;
  userId: string;
  employeeName: string;
  date: string;
  rawInput: string;
  inputType: string;
  status: string;
  createdAt: string;
  clockIn?: string;
  clockOut?: string;
  clockInAt?: string | null;
  clockOutAt?: string | null;
  totalHours?: number;
  comments?: EODComment[];
}

interface EODParsedData {
  tasksCompleted: string;
  issuesBlockers: string;
  notes: string;
}

const statusLabels: Record<string, string> = {
  submitted: "Submitted",
  late: "Late",
  missing: "Missing",
};

function buildColors(uiTheme: any, isDark: boolean) {
  return {
    background: uiTheme.panelColors?.dashboardBackground || (isDark ? "#09090b" : "#f8fafc"),
    cardBg: uiTheme.panelColors?.dashboardCardBackground || (isDark ? "#18181b" : "#ffffff"),
    text: uiTheme.panelColors?.dashboardTextColor || (isDark ? "#ffffff" : "#0f172a"),
    textSecondary: isDark ? "#94a3b8" : "#64748b",
    border: isDark ? "#27272a" : "#e2e8f0",
    primary: uiTheme.customColors?.primary || "#2563eb",
    secondary: uiTheme.customColors?.secondary || (isDark ? "#a1a1aa" : "#475569"),
    overlayBg: "rgba(0, 0, 0, 0.75)",
    submittedBorder: "#10b981",
    submittedBg: isDark ? "rgba(16, 185, 129, 0.15)" : "#ecfdf5",
    submittedText: "#10b981",
    lateBorder: "#f59e0b",
    lateBg: isDark ? "rgba(245, 158, 11, 0.15)" : "#fffbeb",
    lateText: "#f59e0b",
    missingBorder: "#ef4444",
    missingBg: isDark ? "rgba(239, 68, 68, 0.15)" : "#fef2f2",
    missingText: "#ef4444",
    commentBg: isDark ? "rgba(59, 130, 246, 0.12)" : "#eff6ff",
    commentBorder: "rgba(59, 130, 246, 0.25)",
    commentText: "#3b82f6",
    hoursText: "#6366f1",
  };
}

type ThemeColors = ReturnType<typeof buildColors>;

function createStyles(colors: ThemeColors) {
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
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: hp(2),
    },
    title: {
      fontSize: fs(5.2),
      fontWeight: "700",
      color: colors.text,
    },
    subtitle: {
      fontSize: fs(3),
      marginTop: hp(0.3),
      color: colors.textSecondary,
    },
    refreshBtn: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: hp(1),
      paddingHorizontal: wp(3),
      borderRadius: wp(2),
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.cardBg,
      gap: wp(1.5),
    },
    refreshBtnText: {
      fontSize: fs(3),
      fontWeight: "600",
      color: colors.text,
    },
    statsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: wp(2.5),
      marginBottom: hp(2),
    },
    statCard: {
      flex: 1,
      minWidth: "45%",
      backgroundColor: colors.cardBg,
      borderRadius: wp(3),
      borderWidth: 1,
      borderColor: colors.border,
      padding: wp(3),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    statLabel: {
      fontSize: fs(2.5),
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.5,
      color: colors.textSecondary,
    },
    statValue: {
      fontSize: fs(5),
      fontWeight: "700",
      marginTop: hp(0.3),
    },
    statIconBox: {
      width: wp(9),
      height: wp(9),
      borderRadius: wp(2.5),
      alignItems: "center",
      justifyContent: "center",
    },
    filterSection: {
      flexDirection: "row",
      gap: wp(2.5),
      marginBottom: hp(2),
      alignItems: "center",
    },
    searchContainer: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderRadius: wp(2),
      paddingHorizontal: wp(2.5),
      backgroundColor: colors.cardBg,
      borderColor: colors.border,
      height: hp(5),
    },
    searchIcon: {
      marginRight: wp(2),
    },
    searchInput: {
      flex: 1,
      height: hp(5),
      fontSize: fs(3.2),
      color: colors.text,
    },
    dropdownSelector: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderRadius: wp(2),
      paddingHorizontal: wp(3),
      height: hp(5),
      gap: wp(1.5),
      backgroundColor: colors.cardBg,
      borderColor: colors.border,
    },
    dropdownSelectorText: {
      fontSize: fs(3.2),
      color: colors.text,
    },
    card: {
      borderRadius: wp(3),
      borderWidth: 1,
      padding: wp(3.5),
      marginBottom: hp(1.5),
      backgroundColor: colors.cardBg,
      borderColor: colors.border,
    },
    cardHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: hp(1.2),
    },
    dateRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: wp(1.5),
    },
    dateText: {
      fontSize: fs(3.5),
      fontWeight: "600",
      color: colors.text,
    },
    badge: {
      paddingVertical: hp(0.3),
      paddingHorizontal: wp(2),
      borderRadius: wp(3),
      borderWidth: 1,
    },
    badgeText: {
      fontSize: fs(2.8),
      fontWeight: "600",
      textTransform: "capitalize",
    },
    clockGrid: {
      flexDirection: "row",
      alignItems: "center",
      gap: wp(3),
      marginBottom: hp(1.2),
      paddingBottom: hp(1.2),
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    clockUnit: {
      flexDirection: "row",
      alignItems: "center",
      gap: wp(1),
    },
    clockText: {
      fontSize: fs(3),
      fontWeight: "500",
      color: colors.text,
    },
    hoursBadge: {
      paddingVertical: hp(0.3),
      paddingHorizontal: wp(1.5),
      borderRadius: wp(1.5),
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    hoursBadgeText: {
      fontSize: fs(2.8),
      fontWeight: "600",
      fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
      color: colors.hoursText,
    },
    tasksSummaryText: {
      fontSize: fs(3.2),
      color: colors.textSecondary,
      marginBottom: hp(1.5),
    },
    cardFooterRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    commentIndicator: {
      flexDirection: "row",
      alignItems: "center",
      gap: wp(1),
      paddingHorizontal: wp(2),
      paddingVertical: hp(0.4),
      borderRadius: wp(3),
      backgroundColor: colors.commentBg,
      borderWidth: 1,
      borderColor: colors.commentBorder,
    },
    commentIndicatorText: {
      fontSize: fs(2.8),
      fontWeight: "700",
      color: colors.commentText,
    },
    noCommentsText: {
      fontSize: fs(3),
      color: colors.textSecondary,
    },
    viewDetailsBtn: {
      paddingVertical: hp(0.8),
      paddingHorizontal: wp(3),
      borderRadius: wp(1.5),
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    viewDetailsBtnText: {
      fontSize: fs(3),
      fontWeight: "600",
      color: colors.text,
    },
    centerSection: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: hp(5),
    },
    loadingText: {
      marginTop: hp(1),
      fontSize: fs(3.2),
      color: colors.textSecondary,
    },
    emptyTitle: {
      fontSize: fs(4),
      fontWeight: "600",
      marginTop: hp(1.5),
      color: colors.text,
    },
    emptySubtitle: {
      fontSize: fs(3.2),
      marginTop: hp(0.5),
      textAlign: "center",
      color: colors.textSecondary,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.overlayBg,
      justifyContent: "flex-end",
    },
    modalSheetContainer: {
      borderTopLeftRadius: wp(4),
      borderTopRightRadius: wp(4),
      maxHeight: "90%",
      backgroundColor: colors.cardBg,
      paddingBottom: Platform.OS === "ios" ? hp(2.5) : hp(1.5),
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: wp(4),
      paddingVertical: hp(1.8),
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      fontSize: fs(3.8),
      fontWeight: "700",
      color: colors.text,
      flex: 1,
      marginRight: wp(2),
    },
    modalBody: {
      padding: wp(4),
    },
    detailsHeaderGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: wp(2.5),
      padding: wp(3),
      borderRadius: wp(2.5),
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      marginBottom: hp(2),
    },
    detailsGridItem: {
      width: "47%",
    },
    detailsGridLabel: {
      fontSize: fs(2.5),
      fontWeight: "700",
      textTransform: "uppercase",
      color: colors.textSecondary,
      marginBottom: hp(0.5),
    },
    detailsGridValue: {
      fontSize: fs(3.2),
      fontWeight: "600",
      color: colors.text,
    },
    sectionBox: {
      marginBottom: hp(1.8),
    },
    sectionLabelHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: wp(1.5),
      marginBottom: hp(0.8),
    },
    sectionLabelText: {
      fontSize: fs(2.8),
      fontWeight: "700",
      textTransform: "uppercase",
      color: colors.textSecondary,
    },
    sectionContentBox: {
      padding: wp(3),
      borderRadius: wp(2.5),
      borderWidth: 1,
    },
    sectionText: {
      fontSize: fs(3.2),
      lineHeight: fs(4.5),
      color: colors.text,
    },
    commentsContainer: {
      marginTop: hp(1),
      paddingTop: hp(1.8),
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    commentsTitle: {
      fontSize: fs(3.5),
      fontWeight: "700",
      color: colors.text,
      marginBottom: hp(1.2),
    },
    commentCard: {
      padding: wp(2.5),
      borderRadius: wp(2.5),
      borderWidth: 1,
      marginBottom: hp(1),
    },
    commentCardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: hp(0.5),
    },
    commentAuthorRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: wp(1.5),
    },
    commentAuthorName: {
      fontSize: fs(3),
      fontWeight: "700",
      color: colors.text,
    },
    commentRoleBadge: {
      paddingHorizontal: wp(1.5),
      paddingVertical: hp(0.1),
      borderRadius: wp(1),
      borderWidth: 1,
    },
    commentRoleText: {
      fontSize: fs(2.2),
      fontWeight: "700",
      textTransform: "capitalize",
    },
    commentDateText: {
      fontSize: fs(2.5),
      color: colors.textSecondary,
    },
    commentMessageText: {
      fontSize: fs(3.2),
      color: colors.text,
      marginTop: hp(0.3),
    },
    commentInputRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: wp(2),
      marginTop: hp(1.2),
    },
    commentInput: {
      flex: 1,
      height: hp(5),
      borderWidth: 1,
      borderRadius: wp(2),
      paddingHorizontal: wp(3),
      fontSize: fs(3.2),
      borderColor: colors.border,
      backgroundColor: colors.background,
      color: colors.text,
    },
    sendBtn: {
      height: hp(5),
      paddingHorizontal: wp(3.5),
      borderRadius: wp(2),
      backgroundColor: colors.primary,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: wp(1.5),
    },
    sendBtnText: {
      color: "#ffffff",
      fontSize: fs(3.2),
      fontWeight: "600",
    },
    pickerOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    pickerBox: {
      width: "80%",
      borderRadius: wp(3),
      padding: wp(4),
      backgroundColor: colors.cardBg,
    },
    pickerOption: {
      paddingVertical: hp(1.5),
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    pickerOptionText: {
      fontSize: fs(3.5),
      textAlign: "center",
      color: colors.text,
    },
  });
}

function parseEODData(rawInput: string): EODParsedData {
  try {
    const res = JSON.parse(rawInput);
    return {
      tasksCompleted: res.tasksCompleted || "",
      issuesBlockers: res.issuesBlockers || "",
      notes: res.notes || "",
    };
  } catch {
    return { tasksCompleted: rawInput, issuesBlockers: "", notes: "" };
  }
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatLocalClock(timeStr?: string | null, isoAt?: string | null): string {
  if (isoAt) {
    const d = new Date(isoAt);
    if (Number.isFinite(d.getTime())) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
  }
  return String(timeStr || "").trim() || "--:--";
}

export default function EmployeeEODReports() {
  const { uiTheme } = useTheme();
  const isDark = isDarkTheme(uiTheme?.theme);
  const colors = useMemo(() => buildColors(uiTheme, isDark), [uiTheme, isDark]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [statusPickerOpen, setStatusPickerOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<EODReport | null>(null);
  const [commentText, setCommentText] = useState("");

  const queryClient = useQueryClient();

  const { data: reports = [], isLoading, isRefetching, refetch } = useQuery<EODReport[]>({
    queryKey: ["employeeMyEODReports"],
    queryFn: async () => {
      const res = await apiFetch<{ items: EODReport[] }>("/api/employees/me/eod-reports");
      return res.items || [];
    },
  });

  const commentMutation = useMutation({
    mutationFn: async ({ reportId, message }: { reportId: string; message: string }) => {
      return await apiFetch<{ success: boolean; comments: EODComment[] }>(
        `/api/manager/eod-reports/${reportId}/comments`,
        {
          method: "POST",
          body: JSON.stringify({ message }),
        }
      );
    },
    onSuccess: (res, variables) => {
      if (res.success) {
        setCommentText("");
        const updatedComments = res.comments;
        if (selectedReport && selectedReport.id === variables.reportId) {
          setSelectedReport({ ...selectedReport, comments: updatedComments });
        }
        queryClient.setQueryData<EODReport[]>(["employeeMyEODReports"], (old) => {
          if (!old) return [];
          return old.map((item) =>
            item.id === variables.reportId ? { ...item, comments: updatedComments } : item
          );
        });
      }
    },
    onError: (err: any) => {
      Alert.alert("Error", err.message || "Failed to add comment");
    },
  });

  const handleAddComment = () => {
    if (!selectedReport || !commentText.trim()) return;
    commentMutation.mutate({ reportId: selectedReport.id, message: commentText });
  };

  const getStatusBadge = (status: string) => {
    let bg = colors.submittedBg;
    let border = colors.submittedBorder;
    let text = colors.submittedText;

    if (status === "late") {
      bg = colors.lateBg;
      border = colors.lateBorder;
      text = colors.lateText;
    } else if (status === "missing") {
      bg = colors.missingBg;
      border = colors.missingBorder;
      text = colors.missingText;
    }

    return (
      <View style={s([styles.badge, { backgroundColor: bg, borderColor: border }])}>
        <Text style={s([styles.badgeText, { color: text }])}>
          {statusLabels[status] || status.replace(/_/g, " ")}
        </Text>
      </View>
    );
  };

  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      const data = parseEODData(report.rawInput);
      const searchMatch =
        !searchQuery ||
        report.date.includes(searchQuery) ||
        (data.tasksCompleted || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (data.notes || "").toLowerCase().includes(searchQuery.toLowerCase());
      const statusMatch = statusFilter === "all" || report.status === statusFilter;
      return searchMatch && statusMatch;
    });
  }, [reports, searchQuery, statusFilter]);

  const totalSubmitted = reports.filter((r) => r.status === "submitted").length;
  const totalLate = reports.filter((r) => r.status === "late").length;
  const totalComments = reports.reduce((sum, r) => sum + (r.comments?.length || 0), 0);
  const totalHoursWorked = reports.reduce((sum, r) => sum + (r.totalHours || 0), 0);

  const renderReportCard = ({ item: report }: { item: EODReport }) => {
    const eodData = parseEODData(report.rawInput);
    const commentCount = report.comments?.length || 0;

    return (
      <TouchableOpacity
        style={s(styles.card)}
        onPress={() => setSelectedReport(report)}
        activeOpacity={0.7}
      >
        <View style={s(styles.cardHeaderRow)}>
          <View style={s(styles.dateRow)}>
            <Calendar size={fs(4)} color={colors.primary} />
            <Text style={s(styles.dateText)}>{formatDate(report.date)}</Text>
          </View>
          {getStatusBadge(report.status)}
        </View>

        <View style={s(styles.clockGrid)}>
          <View style={s(styles.clockUnit)}>
            <Clock size={fs(3.5)} color={colors.submittedText} />
            <Text style={s(styles.clockText)}>
              {formatLocalClock(report.clockIn, report.clockInAt)}
            </Text>
          </View>
          <Text style={s({ color: colors.textSecondary })}>-</Text>
          <View style={s(styles.clockUnit)}>
            <Clock size={fs(3.5)} color={colors.commentText} />
            <Text style={s(styles.clockText)}>
              {formatLocalClock(report.clockOut, report.clockOutAt)}
            </Text>
          </View>
          <View style={s(styles.hoursBadge)}>
            <Text style={s(styles.hoursBadgeText)}>
              {report.totalHours ? `${report.totalHours.toFixed(1)}h` : "--"}
            </Text>
          </View>
        </View>

        <Text style={s(styles.tasksSummaryText)} numberOfLines={2}>
          {eodData.tasksCompleted || "No tasks reported"}
        </Text>

        <View style={s(styles.cardFooterRow)}>
          {commentCount > 0 ? (
            <View style={s(styles.commentIndicator)}>
              <MessageSquare size={fs(3)} color={colors.commentText} />
              <Text style={s(styles.commentIndicatorText)}>{commentCount}</Text>
            </View>
          ) : (
            <Text style={s(styles.noCommentsText)}>—</Text>
          )}

          <TouchableOpacity
            style={s(styles.viewDetailsBtn)}
            onPress={() => setSelectedReport(report)}
          >
            <Text style={s(styles.viewDetailsBtnText)}>View Details</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={s(styles.safeContainer)}>
      <View style={s(styles.container)}>
        <View style={s(styles.header)}>
          <View style={s({ flex: 1, marginRight: wp(2) })}>
            <Text style={s(styles.title)}>My EOD Reports</Text>
            <Text style={s(styles.subtitle)}>
              View your daily end-of-day reports, work hours, and feedback from management.
            </Text>
          </View>
          <TouchableOpacity
            style={s(styles.refreshBtn)}
            onPress={() => refetch()}
            disabled={isLoading || isRefetching}
          >
            <ClipboardList size={fs(4)} color={colors.text} />
            <Text style={s(styles.refreshBtnText)}>Refresh History</Text>
          </TouchableOpacity>
        </View>

        <View style={s(styles.statsGrid)}>
          <View style={s(styles.statCard)}>
            <View>
              <Text style={s(styles.statLabel)}>Reports Submitted</Text>
              <Text style={s([styles.statValue, { color: colors.submittedText }])}>
                {totalSubmitted}
              </Text>
            </View>
            <View style={s([styles.statIconBox, { backgroundColor: colors.submittedBg }])}>
              <CheckCircle size={fs(4.5)} color={colors.submittedText} />
            </View>
          </View>

          <View style={s(styles.statCard)}>
            <View>
              <Text style={s(styles.statLabel)}>Late Submissions</Text>
              <Text style={s([styles.statValue, { color: colors.lateText }])}>{totalLate}</Text>
            </View>
            <View style={s([styles.statIconBox, { backgroundColor: colors.lateBg }])}>
              <AlertCircle size={fs(4.5)} color={colors.lateText} />
            </View>
          </View>

          <View style={s(styles.statCard)}>
            <View>
              <Text style={s(styles.statLabel)}>Manager Comments</Text>
              <Text style={s([styles.statValue, { color: colors.commentText }])}>
                {totalComments}
              </Text>
            </View>
            <View style={s([styles.statIconBox, { backgroundColor: colors.commentBg }])}>
              <MessageSquare size={fs(4.5)} color={colors.commentText} />
            </View>
          </View>

          <View style={s(styles.statCard)}>
            <View>
              <Text style={s(styles.statLabel)}>Total Tracked Hours</Text>
              <Text style={s([styles.statValue, { color: colors.hoursText }])}>
                {totalHoursWorked.toFixed(1)}h
              </Text>
            </View>
            <View style={s([styles.statIconBox, { backgroundColor: "rgba(99, 102, 241, 0.15)" }])}>
              <Clock size={fs(4.5)} color={colors.hoursText} />
            </View>
          </View>
        </View>

        <View style={s(styles.filterSection)}>
          <View style={s(styles.searchContainer)}>
            <Search size={fs(4)} color={colors.textSecondary} style={s(styles.searchIcon)} />
            <TextInput
              style={s(styles.searchInput)}
              placeholder="Search report tasks or notes..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <TouchableOpacity
            style={s(styles.dropdownSelector)}
            onPress={() => setStatusPickerOpen(true)}
          >
            <Text style={s(styles.dropdownSelectorText)}>
              {statusFilter === "all"
                ? "All Statuses"
                : statusLabels[statusFilter] || statusFilter}
            </Text>
            <ChevronDown size={fs(4)} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={s(styles.centerSection)}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={s(styles.loadingText)}>Loading your EOD reports...</Text>
          </View>
        ) : filteredReports.length === 0 ? (
          <View style={s(styles.centerSection)}>
            <ClipboardList size={fs(12)} color={colors.textSecondary} />
            <Text style={s(styles.emptyTitle)}>No EOD reports found</Text>
            <Text style={s(styles.emptySubtitle)}>
              Your submitted daily reports and manager comments will appear here.
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredReports}
            keyExtractor={(item) => item.id}
            renderItem={renderReportCard}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s({ paddingBottom: hp(2.5) })}
          />
        )}

        <Modal visible={statusPickerOpen} transparent animationType="fade">
          <View style={s(styles.pickerOverlay)}>
            <View style={s(styles.pickerBox)}>
              {[
                { label: "All Statuses", value: "all" },
                { label: "Submitted", value: "submitted" },
                { label: "Late", value: "late" },
                { label: "Missing", value: "missing" },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={s(styles.pickerOption)}
                  onPress={() => {
                    setStatusFilter(opt.value);
                    setStatusPickerOpen(false);
                  }}
                >
                  <Text style={s(styles.pickerOptionText)}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Modal>

        <Modal visible={!!selectedReport} transparent animationType="slide">
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={s(styles.modalOverlay)}
          >
            <View style={s(styles.modalSheetContainer)}>
              <View style={s(styles.modalHeader)}>
                <Text style={s(styles.modalTitle)} numberOfLines={1}>
                  EOD Report Details — {selectedReport && formatDate(selectedReport.date)}
                </Text>
                <TouchableOpacity onPress={() => setSelectedReport(null)}>
                  <X size={fs(5)} color={colors.text} />
                </TouchableOpacity>
              </View>

              {selectedReport && (
                <ScrollView style={s(styles.modalBody)} showsVerticalScrollIndicator={false}>
                  <View style={s(styles.detailsHeaderGrid)}>
                    <View style={s(styles.detailsGridItem)}>
                      <Text style={s(styles.detailsGridLabel)}>Status</Text>
                      <View style={s({ alignItems: "flex-start" })}>
                        {getStatusBadge(selectedReport.status)}
                      </View>
                    </View>
                    <View style={s(styles.detailsGridItem)}>
                      <Text style={s(styles.detailsGridLabel)}>Clock In</Text>
                      <Text style={s(styles.detailsGridValue)}>
                        {formatLocalClock(selectedReport.clockIn, selectedReport.clockInAt)}
                      </Text>
                    </View>
                    <View style={s(styles.detailsGridItem)}>
                      <Text style={s(styles.detailsGridLabel)}>Clock Out</Text>
                      <Text style={s(styles.detailsGridValue)}>
                        {formatLocalClock(selectedReport.clockOut, selectedReport.clockOutAt)}
                      </Text>
                    </View>
                    <View style={s(styles.detailsGridItem)}>
                      <Text style={s(styles.detailsGridLabel)}>Hours Worked</Text>
                      <Text style={s(styles.detailsGridValue)}>
                        {selectedReport.totalHours
                          ? `${selectedReport.totalHours.toFixed(2)}h`
                          : "—"}
                      </Text>
                    </View>
                  </View>

                  {(() => {
                    const eodData = parseEODData(selectedReport.rawInput);
                    return (
                      <View>
                        <View style={s(styles.sectionBox)}>
                          <View style={s(styles.sectionLabelHeader)}>
                            <CheckCircle size={fs(3.5)} color={colors.submittedText} />
                            <Text style={s(styles.sectionLabelText)}>Tasks Completed</Text>
                          </View>
                          <View
                            style={s([
                              styles.sectionContentBox,
                              {
                                backgroundColor: colors.submittedBg,
                                borderColor: colors.submittedBorder,
                              },
                            ])}
                          >
                            <Text style={s(styles.sectionText)}>
                              {eodData.tasksCompleted || "No tasks reported"}
                            </Text>
                          </View>
                        </View>

                        {!!eodData.issuesBlockers && (
                          <View style={s(styles.sectionBox)}>
                            <View style={s(styles.sectionLabelHeader)}>
                              <AlertCircle size={fs(3.5)} color={colors.lateText} />
                              <Text style={s(styles.sectionLabelText)}>Issues / Blockers</Text>
                            </View>
                            <View
                              style={s([
                                styles.sectionContentBox,
                                {
                                  backgroundColor: colors.lateBg,
                                  borderColor: colors.lateBorder,
                                },
                              ])}
                            >
                              <Text style={s(styles.sectionText)}>{eodData.issuesBlockers}</Text>
                            </View>
                          </View>
                        )}

                        {!!eodData.notes && (
                          <View style={s(styles.sectionBox)}>
                            <View style={s(styles.sectionLabelHeader)}>
                              <ClipboardList size={fs(3.5)} color={colors.commentText} />
                              <Text style={s(styles.sectionLabelText)}>Additional Notes</Text>
                            </View>
                            <View
                              style={s([
                                styles.sectionContentBox,
                                {
                                  backgroundColor: colors.commentBg,
                                  borderColor: colors.commentBorder,
                                },
                              ])}
                            >
                              <Text style={s(styles.sectionText)}>{eodData.notes}</Text>
                            </View>
                          </View>
                        )}
                      </View>
                    );
                  })()}

                  <View style={s(styles.commentsContainer)}>
                    <Text style={s(styles.commentsTitle)}>
                      Manager & Admin Comments ({selectedReport.comments?.length || 0})
                    </Text>

                    {!selectedReport.comments || selectedReport.comments.length === 0 ? (
                      <View
                        style={s([
                          styles.sectionContentBox,
                          {
                            backgroundColor: colors.background,
                            borderColor: colors.border,
                            alignItems: "center",
                            paddingVertical: hp(2.2),
                          },
                        ])}
                      >
                        <MessageSquare size={fs(6)} color={colors.textSecondary} />
                        <Text style={s([styles.noCommentsText, { marginTop: hp(0.8) }])}>
                          No manager comments yet for this EOD report.
                        </Text>
                      </View>
                    ) : (
                      selectedReport.comments.map((comment, idx) => {
                        const isManagerOrAdmin = [
                          "manager",
                          "admin",
                          "super-admin",
                        ].includes((comment.authorRole || "").toLowerCase());

                        return (
                          <View
                            key={idx}
                            style={s([
                              styles.commentCard,
                              {
                                backgroundColor: isManagerOrAdmin
                                  ? colors.commentBg
                                  : colors.background,
                                borderColor: isManagerOrAdmin
                                  ? colors.commentBorder
                                  : colors.border,
                              },
                            ])}
                          >
                            <View style={s(styles.commentCardHeader)}>
                              <View style={s(styles.commentAuthorRow)}>
                                <Text style={s(styles.commentAuthorName)}>
                                  {comment.authorName}
                                </Text>
                                <View
                                  style={s([
                                    styles.commentRoleBadge,
                                    {
                                      backgroundColor: isManagerOrAdmin
                                        ? colors.commentBg
                                        : colors.background,
                                      borderColor: isManagerOrAdmin
                                        ? colors.commentBorder
                                        : colors.border,
                                    },
                                  ])}
                                >
                                  <Text
                                    style={s([
                                      styles.commentRoleText,
                                      {
                                        color: isManagerOrAdmin
                                          ? colors.commentText
                                          : colors.textSecondary,
                                      },
                                    ])}
                                  >
                                    {comment.authorRole || "Manager"}
                                  </Text>
                                </View>
                              </View>
                              <Text style={s(styles.commentDateText)}>
                                {new Date(comment.createdAt).toLocaleString([], {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </Text>
                            </View>
                            <Text style={s(styles.commentMessageText)}>{comment.message}</Text>
                          </View>
                        );
                      })
                    )}

                    <View style={s(styles.commentInputRow)}>
                      <TextInput
                        style={s(styles.commentInput)}
                        placeholder="Write a comment or reply to management..."
                        placeholderTextColor={colors.textSecondary}
                        value={commentText}
                        onChangeText={setCommentText}
                        editable={!commentMutation.isPending}
                      />
                      <TouchableOpacity
                        style={s(styles.sendBtn)}
                        onPress={handleAddComment}
                        disabled={commentMutation.isPending || !commentText.trim()}
                      >
                        {commentMutation.isPending ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                          <>
                            <Send size={fs(3.5)} color="#ffffff" />
                            <Text style={s(styles.sendBtnText)}>Send</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={s({ height: hp(5) })} />
                </ScrollView>
              )}
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </SafeAreaView>
  );
}