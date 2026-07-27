import React, { useMemo, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Download, Search, BarChart2, TrendingUp, Users } from "lucide-react-native";
import { apiFetch } from "@/lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";
import { s } from "@/util/styles";

type TaskStatus = "active" | "pending" | "completed";
type TaskPriority = "high" | "medium" | "low";

interface TaskRow {
  id: string;
  title: string;
  assignee: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
}

interface AttendanceRow {
  id: string;
  employee: string;
  date: string;
  clockIn: string;
  clockOut: string;
  totalHours: number;
  status: "complete" | "incomplete" | "overtime";
  location: string;
}

type TaskRowApi = Omit<TaskRow, "id"> & { _id: string; assignees?: string[] };
type AttendanceRowApi = Omit<AttendanceRow, "id"> & { _id: string };

function normalizeTask(t: TaskRowApi): TaskRow {
  const assignee = Array.isArray(t.assignees) && t.assignees.length > 0
    ? t.assignees[0]
    : (typeof t.assignee === "string" ? t.assignee : "");
  return {
    id: t._id,
    title: t.title || "",
    assignee,
    status: t.status,
    priority: t.priority,
    dueDate: typeof t.dueDate === "string" ? t.dueDate : "",
  };
}

function normalizeAttendance(a: AttendanceRowApi): AttendanceRow {
  return {
    id: a._id,
    employee: a.employee,
    date: a.date,
    clockIn: a.clockIn,
    clockOut: a.clockOut,
    totalHours: a.totalHours,
    status: a.status,
    location: a.location,
  };
}

function toCsv(rows: Array<Record<string, unknown>>): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const sStr = String(v ?? "");
    const needsQuotes = /[\n\r",]/.test(sStr);
    const escaped = sStr.replace(/"/g, '""');
    return needsQuotes ? `"${escaped}"` : escaped;
  };
  const lines = [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))];
  return lines.join("\n");
}

const TASK_COLS = { title: 160, assignee: 120, priority: 90, status: 100, dueDate: 110 };
const TASK_TABLE_MIN_WIDTH = Object.values(TASK_COLS).reduce((a, b) => a + b, 0);

const ATTENDANCE_COLS = { employee: 130, date: 95, clockIn: 85, clockOut: 85, hours: 70, status: 95, location: 110 };
const ATTENDANCE_TABLE_MIN_WIDTH = Object.values(ATTENDANCE_COLS).reduce((a, b) => a + b, 0);

function buildColors(uiTheme: any) {
  const isDark = uiTheme.theme !== "crystal-white";
  return {
    background:      uiTheme.panelColors?.dashboardBackground     || (isDark ? "#09090b" : "#ffffff"),
    panelHeader:     uiTheme.panelColors?.dashboardCardBackground || (isDark ? "#141517" : "#f8fafc"),
    cardBg:          uiTheme.panelColors?.dashboardCardBackground || (isDark ? "#141517" : "#f8fafc"),
    text:            uiTheme.panelColors?.dashboardTextColor      || (isDark ? "#f8fafc" : "#000000"),
    textSecondary:   isDark ? "#a1a1aa" : "#475569",
    border:          isDark ? "#27272a" : "rgba(0, 0, 0, 0.08)",
    primary:         uiTheme.customColors?.primary                || "#ffd27a",
    success:         "#16C784",
    warning:         "#F59E0B",
    danger:          "#EF4444",
    tabBg:           isDark ? "#18181b" : "#f4f4f5",
    tabActive:       isDark ? "#27272a" : "#e4e4e7",
    trackBg:         isDark ? "#18181b" : "#e4e4e7"
  };
}

function createStyles(
  colors: ReturnType<typeof buildColors>,
  wp: (percentage: number) => number,
  hp: (percentage: number) => number,
  isTablet: boolean,
  isSmallScreen: boolean
) {
  const horizontalPadding = isSmallScreen ? wp(3) : isTablet ? wp(6) : wp(4.2);

  return StyleSheet.create({
    centered: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.background,
      padding: wp(6),
    },
    loadingText: {
      marginTop: hp(1),
      color: colors.textSecondary,
      fontSize: wp(3.3),
    },
    screenContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    responsiveContentWrapper: {
      flex: 1,
      width: "100%",
      maxWidth: 768,
      alignSelf: "center",
    },
    scrollPadding: {
      paddingHorizontal: horizontalPadding,
      paddingBottom: hp(5),
    },
    headerContainer: {
      marginTop: hp(2),
      marginBottom: hp(2),
    },
    pageTitle: {
      fontSize: isSmallScreen ? wp(5) : isTablet ? wp(5.5) : wp(6),
      fontWeight: "800",
      color: colors.text,
      letterSpacing: 0.3,
    },
    pageSubtitle: {
      fontSize: isSmallScreen ? wp(3) : wp(3.3),
      color: colors.textSecondary,
      marginTop: hp(0.25),
    },
    tabsWrapper: {
      flexDirection: "row",
      backgroundColor: colors.tabBg,
      padding: wp(1),
      borderRadius: wp(2),
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: hp(2),
    },
    tabButton: {
      flex: 1,
      paddingVertical: hp(1.2),
      alignItems: "center",
      borderRadius: wp(1.5),
    },
    tabActive: {
      backgroundColor: colors.tabActive,
    },
    tabText: {
      fontSize: wp(3.3),
      fontWeight: "600",
      color: colors.textSecondary,
    },
    tabTextActive: {
      color: colors.primary,
      fontWeight: "700",
    },
    viewContent: {
      gap: hp(2),
    },
    chartCard: {
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: wp(2.5),
      padding: wp(4),
    },
    chartHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: wp(2),
      marginBottom: hp(2),
    },
    chartTitle: {
      fontSize: wp(3.8),
      fontWeight: "700",
      color: colors.text,
    },
    barChartContainer: {
      flexDirection: "row",
      justifyContent: "space-around",
      alignItems: "flex-end",
      height: hp(20),
      paddingTop: hp(1),
    },
    barColumn: {
      alignItems: "center",
      flex: 1,
      marginHorizontal: wp(1),
    },
    barBackTrack: {
      height: hp(12),
      width: isTablet ? wp(2.5) : wp(3.5),
      backgroundColor: colors.trackBg,
      borderRadius: wp(1),
      justifyContent: "flex-end",
      overflow: "hidden",
    },
    barFill: {
      width: "100%",
      backgroundColor: colors.primary,
      borderRadius: wp(1),
    },
    barCountLabel: {
      fontSize: wp(2.8),
      fontWeight: "700",
      color: colors.text,
      marginTop: hp(0.5),
    },
    barAxisLabel: {
      fontSize: wp(2.5),
      color: colors.textSecondary,
      marginTop: hp(0.25),
      textTransform: "capitalize",
      textAlign: "center",
    },
    actionCard: {
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: wp(2.5),
      paddingVertical: hp(1.8),
    },
    searchRow: {
      flexDirection: "row",
      paddingHorizontal: wp(3.5),
      gap: wp(2.5),
      marginBottom: hp(1.8),
    },
    searchWrapper: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.trackBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: wp(1.5),
      paddingHorizontal: wp(2.5),
    },
    searchIcon: {
      marginRight: wp(1.5),
    },
    textInput: {
      flex: 1,
      height: hp(4.5),
      color: colors.text,
      fontSize: wp(3.3),
      padding: 0,
    },
    exportButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.primary,
      paddingHorizontal: wp(3.5),
      borderRadius: wp(1.5),
      gap: wp(1.5),
    },
    exportBtnText: {
      color: colors.background,
      fontSize: wp(3),
      fontWeight: "700",
    },
    horizontalTableContainer: {
      paddingHorizontal: wp(3.5),
    },
    tableHeadRow: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderColor: colors.border,
      paddingBottom: hp(1),
      marginBottom: hp(0.5),
    },
    tableTh: {
      fontSize: wp(2.8),
      fontWeight: "600",
      color: colors.textSecondary,
      textTransform: "uppercase",
      paddingRight: wp(1.5),
    },
    tableBodyRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: hp(1.2),
      borderBottomWidth: 1,
      borderColor: colors.border,
      opacity: 0.9,
    },
    tableTdText: {
      fontSize: wp(3.2),
      color: colors.text,
      paddingRight: wp(2),
    },
    boldCell: {
      color: colors.text,
      fontWeight: "600",
    },
    badgeAlign: {
      alignItems: "flex-start",
      justifyContent: "center",
    },
    outlineBadge: {
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: wp(1.5),
      paddingVertical: hp(0.3),
      borderRadius: wp(1),
      backgroundColor: colors.trackBg,
    },
    outlineBadgeText: {
      fontSize: wp(2.5),
      color: colors.textSecondary,
      textTransform: "capitalize",
      fontWeight: "600",
    },
    solidBadge: {
      backgroundColor: colors.tabBg,
      paddingHorizontal: wp(1.5),
      paddingVertical: hp(0.3),
      borderRadius: wp(1),
    },
    solidBadgeText: {
      fontSize: wp(2.5),
      color: colors.primary,
      textTransform: "capitalize",
      fontWeight: "700",
    },
    trendMetricNode: {
      backgroundColor: colors.trackBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: wp(2),
      padding: wp(3),
      marginRight: wp(2.5),
      width: isTablet ? wp(22) : wp(32),
    },
    trendNodeHeader: {
      fontSize: wp(3),
      fontWeight: "700",
      color: colors.textSecondary,
      marginBottom: hp(0.75),
    },
    trendNodeMetrics: {
      gap: hp(0.25),
    },
    trendSubText: {
      fontSize: wp(2.8),
      color: colors.textSecondary,
    },
    rowMetricContainer: {
      gap: hp(0.75),
    },
    rowMetricHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    rowMetricName: {
      fontSize: wp(3.3),
      color: colors.text,
      fontWeight: "600",
    },
    rowMetricHours: {
      fontSize: wp(3),
      color: colors.primary,
      fontWeight: "700",
    },
    horizontalTrack: {
      height: hp(1),
      backgroundColor: colors.trackBg,
      borderRadius: wp(1),
      overflow: "hidden",
    },
    horizontalFill: {
      height: "100%",
      backgroundColor: colors.primary,
      borderRadius: wp(1),
    },
  });
}

export default function Reports() {
  const { width, height } = useWindowDimensions();
  const isTablet = width >= 768;
  const isSmallScreen = width < 360;

  const wp = useMemo(() => (p: number) => (width * p) / 100, [width]);
  const hp = useMemo(() => (p: number) => (height * p) / 100, [height]);

  const { uiTheme } = useTheme();
  const colors = useMemo(() => buildColors(uiTheme), [uiTheme]);
  const styles = useMemo(() => createStyles(colors, wp, hp, isTablet, isSmallScreen), [colors, wp, hp, isTablet, isSmallScreen]);

  const [activeTab, setActiveTab] = useState<"tasks" | "attendance" | "performance">("tasks");
  const [taskQuery, setTaskQuery] = useState("");
  const [attendanceQuery, setAttendanceQuery] = useState("");

  const { data: tasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ["reports", "tasks"],
    queryFn: async () => {
      const res = await apiFetch<{ items: TaskRowApi[] }>("/api/reports/tasks");
      return (res.items || []).map(normalizeTask);
    },
  });

  const { data: attendance = [], isLoading: loadingAttendance } = useQuery({
    queryKey: ["reports", "attendance"],
    queryFn: async () => {
      const res = await apiFetch<{ items: AttendanceRowApi[] }>("/api/reports/attendance");
      return (res.items || []).map(normalizeAttendance);
    },
  });

  const { data: analytics, isLoading: loadingAnalytics } = useQuery({
    queryKey: ["reports", "analytics"],
    queryFn: async () => {
      return apiFetch<{
        statusAnalytics: Array<{ status: TaskStatus; value: number }>;
        priorityAnalytics: Array<{ priority: TaskPriority; value: number }>;
        hoursByEmployee: Array<{ employee: string; hours: number }>;
        weeklyTrend: Array<{ week: string; tasksCompleted: number; hoursLogged: number }>;
      }>("/api/reports/analytics");
    },
  });

  const filteredTasks = useMemo(() => {
    const q = taskQuery.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter((t) => 
      (t.title || "").toLowerCase().includes(q) ||
      (t.assignee || "").toLowerCase().includes(q) ||
      (t.status || "").toLowerCase().includes(q) ||
      (t.priority || "").toLowerCase().includes(q)
    );
  }, [tasks, taskQuery]);

  const filteredAttendance = useMemo(() => {
    const q = attendanceQuery.trim().toLowerCase();
    if (!q) return attendance;
    return attendance.filter((a) => 
      a.employee.toLowerCase().includes(q) ||
      a.location.toLowerCase().includes(q) ||
      a.status.toLowerCase().includes(q)
    );
  }, [attendance, attendanceQuery]);

  const executeNativeCsvExport = async (filename: string, csvData: string) => {
    try {
      const targetUri = `${FileSystem.documentDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(targetUri, csvData, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(targetUri);
      } else {
        Alert.alert("Saved", `Document compiled at:\n${targetUri}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not write spreadsheet file.";
      Alert.alert("Export Failed", msg);
    }
  };

  const exportTasksCsv = () => {
    const dataString = toCsv(
      filteredTasks.map((t) => ({
        id: t.id,
        title: t.title,
        assignee: t.assignee,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate,
      }))
    );
    executeNativeCsvExport("tasks-report.csv", dataString);
  };

  const exportAttendanceCsv = () => {
    const dataString = toCsv(
      filteredAttendance.map((a) => ({
        id: a.id,
        employee: a.employee,
        date: a.date,
        clockIn: a.clockIn,
        clockOut: a.clockOut,
        totalHours: a.totalHours,
        status: a.status,
        location: a.location,
      }))
    );
    executeNativeCsvExport("attendance-report.csv", dataString);
  };

  const maxStatusVal = useMemo(() => Math.max(...(analytics?.statusAnalytics?.map(d => d.value) || [1])), [analytics]);
  const maxPriorityVal = useMemo(() => Math.max(...(analytics?.priorityAnalytics?.map(d => d.value) || [1])), [analytics]);
  const maxEmployeeHours = useMemo(() => Math.max(...(analytics?.hoursByEmployee?.map(d => d.hours) || [1])), [analytics]);

  if (loadingTasks || loadingAttendance || loadingAnalytics) {
    return (
      <View style={s(styles.centered)}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={s(styles.loadingText)}>Processing ...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={s(styles.screenContainer)} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={s(styles.scrollPadding)} showsVerticalScrollIndicator={false}>
        <View style={s(styles.responsiveContentWrapper)}>
          <View style={s(styles.headerContainer)}>
            <Text style={s(styles.pageTitle)}>Reports & Analytics</Text>
            <Text style={s(styles.pageSubtitle)}>Review task, attendance, and performance insights</Text>
          </View>

          <View style={s(styles.tabsWrapper)}>
            <TouchableOpacity style={s([styles.tabButton, activeTab === "tasks" && styles.tabActive])} onPress={() => setActiveTab("tasks")}>
              <Text style={s([styles.tabText, activeTab === "tasks" && styles.tabTextActive])}>Tasks</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s([styles.tabButton, activeTab === "attendance" && styles.tabActive])} onPress={() => setActiveTab("attendance")}>
              <Text style={s([styles.tabText, activeTab === "attendance" && styles.tabTextActive])}>Time Clock</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s([styles.tabButton, activeTab === "performance" && styles.tabActive])} onPress={() => setActiveTab("performance")}>
              <Text style={s([styles.tabText, activeTab === "performance" && styles.tabTextActive])}>Performance</Text>
            </TouchableOpacity>
          </View>

          {activeTab === "tasks" && (
            <View style={s(styles.viewContent)}>
              <View style={s(styles.chartCard)}>
                <View style={s(styles.chartHeaderRow)}>
                  <BarChart2 size={16} color={colors.primary} />
                  <Text style={s(styles.chartTitle)}>Tasks by Status</Text>
                </View>
                <View style={s(styles.barChartContainer)}>
                  {analytics?.statusAnalytics?.map((item) => (
                    <View key={item.status} style={s(styles.barColumn)}>
                      <View style={s(styles.barBackTrack)}>
                        <View style={s([styles.barFill, { height: `${(item.value / maxStatusVal) * 100}%` }])} />
                      </View>
                      <Text style={s(styles.barCountLabel)}>{item.value}</Text>
                      <Text style={s(styles.barAxisLabel)} numberOfLines={1}>{item.status}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={s(styles.chartCard)}>
                <View style={s(styles.chartHeaderRow)}>
                  <BarChart2 size={16} color={colors.primary} />
                  <Text style={s(styles.chartTitle)}>Tasks by Priority</Text>
                </View>
                <View style={s(styles.barChartContainer)}>
                  {analytics?.priorityAnalytics?.map((item) => (
                    <View key={item.priority} style={s(styles.barColumn)}>
                      <View style={s(styles.barBackTrack)}>
                        <View style={s([styles.barFill, { height: `${(item.value / maxPriorityVal) * 100}%` }])} />
                      </View>
                      <Text style={s(styles.barCountLabel)}>{item.value}</Text>
                      <Text style={s(styles.barAxisLabel)} numberOfLines={1}>{item.priority}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={s(styles.actionCard)}>
                <View style={s(styles.searchRow)}>
                  <View style={s(styles.searchWrapper)}>
                    <Search size={14} color={colors.textSecondary} style={s(styles.searchIcon)} />
                    <TextInput
                      style={s(styles.textInput)}
                      placeholder="Search tasks..."
                      placeholderTextColor={colors.textSecondary}
                      value={taskQuery}
                      onChangeText={setTaskQuery}
                      autoCorrect={false}
                    />
                  </View>
                  <TouchableOpacity style={s(styles.exportButton)} onPress={exportTasksCsv}>
                    <Download size={14} color={colors.background} />
                    <Text style={s(styles.exportBtnText)}>CSV</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={true} style={s(styles.horizontalTableContainer)}>
                  <View style={{ width: TASK_TABLE_MIN_WIDTH }}>
                    <View style={s(styles.tableHeadRow)}>
                      <Text style={s([styles.tableTh, { width: TASK_COLS.title }])}>Task Name</Text>
                      <Text style={s([styles.tableTh, { width: TASK_COLS.assignee }])}>Assignee</Text>
                      <Text style={s([styles.tableTh, { width: TASK_COLS.priority }])}>Priority</Text>
                      <Text style={s([styles.tableTh, { width: TASK_COLS.status }])}>Status</Text>
                      <Text style={s([styles.tableTh, { width: TASK_COLS.dueDate }])}>Due Date</Text>
                    </View>
                    {filteredTasks.map((t) => (
                      <View key={t.id} style={s(styles.tableBodyRow)}>
                        <Text style={s([styles.tableTdText, styles.boldCell, { width: TASK_COLS.title }])} numberOfLines={1} ellipsizeMode="tail">{t.title}</Text>
                        <Text style={s([styles.tableTdText, { width: TASK_COLS.assignee }])} numberOfLines={1} ellipsizeMode="tail">{t.assignee || "Unassigned"}</Text>
                        <View style={s([{ width: TASK_COLS.priority }, styles.badgeAlign])}><View style={s(styles.outlineBadge)}><Text style={s(styles.outlineBadgeText)}>{t.priority}</Text></View></View>
                        <View style={s([{ width: TASK_COLS.status }, styles.badgeAlign])}><View style={s(styles.solidBadge)}><Text style={s(styles.solidBadgeText)}>{t.status}</Text></View></View>
                        <Text style={s([styles.tableTdText, { width: TASK_COLS.dueDate }])}>{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "--"}</Text>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </View>
            </View>
          )}

          {activeTab === "attendance" && (
            <View style={s(styles.viewContent)}>
              <View style={s(styles.chartCard)}>
                <View style={s(styles.chartHeaderRow)}>
                  <TrendingUp size={16} color={colors.primary} />
                  <Text style={s(styles.chartTitle)}>Weekly Log Trend Monitor</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {analytics?.weeklyTrend?.map((week, idx) => (
                    <View key={idx} style={s(styles.trendMetricNode)}>
                      <Text style={s(styles.trendNodeHeader)}>{week.week}</Text>
                      <View style={s(styles.trendNodeMetrics)}>
                        <Text style={s(styles.trendSubText)}>Done: <Text style={{ color: colors.primary, fontWeight: "700" }}>{week.tasksCompleted}</Text></Text>
                        <Text style={s(styles.trendSubText)}>Hours: <Text style={{ color: colors.text, fontWeight: "700" }}>{week.hoursLogged}h</Text></Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </View>

              <View style={s(styles.actionCard)}>
                <View style={s(styles.searchRow)}>
                  <View style={s(styles.searchWrapper)}>
                    <Search size={14} color={colors.textSecondary} style={s(styles.searchIcon)} />
                    <TextInput
                      style={s(styles.textInput)}
                      placeholder="Search rosters..."
                      placeholderTextColor={colors.textSecondary}
                      value={attendanceQuery}
                      onChangeText={setAttendanceQuery}
                      autoCorrect={false}
                    />
                  </View>
                  <TouchableOpacity style={s(styles.exportButton)} onPress={exportAttendanceCsv}>
                    <Download size={14} color={colors.background} />
                    <Text style={s(styles.exportBtnText)}>CSV</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={true} style={s(styles.horizontalTableContainer)}>
                  <View style={{ width: ATTENDANCE_TABLE_MIN_WIDTH }}>
                    <View style={s(styles.tableHeadRow)}>
                      <Text style={s([styles.tableTh, { width: ATTENDANCE_COLS.employee }])}>Employee</Text>
                      <Text style={s([styles.tableTh, { width: ATTENDANCE_COLS.date }])}>Date</Text>
                      <Text style={s([styles.tableTh, { width: ATTENDANCE_COLS.clockIn }])}>Clock In</Text>
                      <Text style={s([styles.tableTh, { width: ATTENDANCE_COLS.clockOut }])}>Clock Out</Text>
                      <Text style={s([styles.tableTh, { width: ATTENDANCE_COLS.hours }])}>Hours</Text>
                      <Text style={s([styles.tableTh, { width: ATTENDANCE_COLS.status }])}>Status</Text>
                      <Text style={s([styles.tableTh, { width: ATTENDANCE_COLS.location }])}>Location</Text>
                    </View>
                    {filteredAttendance.map((a) => (
                      <View key={a.id} style={s(styles.tableBodyRow)}>
                        <Text style={s([styles.tableTdText, styles.boldCell, { width: ATTENDANCE_COLS.employee }])} numberOfLines={1} ellipsizeMode="tail">{a.employee}</Text>
                        <Text style={s([styles.tableTdText, { width: ATTENDANCE_COLS.date }])}>{a.date ? new Date(a.date).toLocaleDateString() : "--"}</Text>
                        <Text style={s([styles.tableTdText, { width: ATTENDANCE_COLS.clockIn }])}>{a.clockIn || "--"}</Text>
                        <Text style={s([styles.tableTdText, { width: ATTENDANCE_COLS.clockOut }])}>{a.clockOut || "--"}</Text>
                        <Text style={s([styles.tableTdText, { width: ATTENDANCE_COLS.hours, color: colors.primary, fontWeight: "600" }])}>{a.totalHours}h</Text>
                        <View style={s([{ width: ATTENDANCE_COLS.status }, styles.badgeAlign])}><View style={s(styles.solidBadge)}><Text style={s(styles.solidBadgeText)}>{a.status}</Text></View></View>
                        <Text style={s([styles.tableTdText, { width: ATTENDANCE_COLS.location }])} numberOfLines={1} ellipsizeMode="tail">{a.location}</Text>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </View>
            </View>
          )}

          {activeTab === "performance" && (
            <View style={s(styles.viewContent)}>
              <View style={s(styles.chartCard)}>
                <View style={s(styles.chartHeaderRow)}>
                  <Users size={16} color={colors.primary} />
                  <Text style={s(styles.chartTitle)}>Assigned Hours Matrix</Text>
                </View>
                <View style={{ marginTop: hp(1.5), gap: hp(1.8) }}>
                  {analytics?.hoursByEmployee?.map((row) => (
                    <View key={row.employee} style={s(styles.rowMetricContainer)}>
                      <View style={s(styles.rowMetricHeader)}>
                        <Text style={s(styles.rowMetricName)}>{row.employee}</Text>
                        <Text style={s(styles.rowMetricHours)}>{row.hours} Hours</Text>
                      </View>
                      <View style={s(styles.horizontalTrack)}>
                        <View style={s([styles.horizontalFill, { width: `${(row.hours / maxEmployeeHours) * 100}%` }])} />
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}