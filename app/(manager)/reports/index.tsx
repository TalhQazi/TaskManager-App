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
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Download, Search, BarChart2, TrendingUp, Users } from "lucide-react-native";
import { apiFetch } from "@/lib/admin/apiClient";

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

type TaskRowApi = Omit<TaskRow, "id"> & { _id: string };
type AttendanceRowApi = Omit<AttendanceRow, "id"> & { _id: string };

function normalizeTask(t: TaskRowApi): TaskRow {
  const raw = t as Record<string, unknown>;
  const assignee = Array.isArray(raw.assignees) && (raw.assignees as string[]).length > 0
    ? (raw.assignees as string[])[0]
    : (typeof raw.assignee === "string" ? raw.assignee : "");
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

function toCsv(rows: Array<Record<string, unknown>>) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = String(v ?? "");
    const needsQuotes = /[\n\r",]/.test(s);
    const escaped = s.replace(/"/g, '""');
    return needsQuotes ? `"${escaped}"` : escaped;
  };
  const lines = [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))];
  return lines.join("\n");
}

// ─── STRICT COLUMN WIDTHS FOR RESPONSIVE ALIGNMENT ───
const TASK_COLS = { title: 160, assignee: 120, priority: 90, status: 100, dueDate: 110 };
const TASK_TABLE_MIN_WIDTH = Object.values(TASK_COLS).reduce((a, b) => a + b, 0);

const ATTENDANCE_COLS = { employee: 130, date: 95, clockIn: 85, clockOut: 85, hours: 70, status: 95, location: 110 };
const ATTENDANCE_TABLE_MIN_WIDTH = Object.values(ATTENDANCE_COLS).reduce((a, b) => a + b, 0);

export default function Reports() {
  const [activeTab, setActiveTab] = useState<"tasks" | "attendance" | "performance">("tasks");
  const [taskQuery, setTaskQuery] = useState("");
  const [attendanceQuery, setAttendanceQuery] = useState("");

  const { data: tasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ["reports", "tasks"],
    queryFn: async () => {
      const res = await apiFetch<{ items: TaskRowApi[] }>("/api/reports/tasks");
      return res.items.map(normalizeTask);
    },
  });

  const { data: attendance = [], isLoading: loadingAttendance } = useQuery({
    queryKey: ["reports", "attendance"],
    queryFn: async () => {
      const res = await apiFetch<{ items: AttendanceRowApi[] }>("/api/reports/attendance");
      return res.items.map(normalizeAttendance);
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
    } catch (err: any) {
      Alert.alert("Export Failed", err.message || "Could not write spreadsheet file.");
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
      <View style={[styles.centered, { backgroundColor: "#09090b" }]}>
        <ActivityIndicator size="large" color="#ffd27a" />
        <Text style={{ marginTop: 10, color: "#a1a1aa", fontSize: 13 }}>Processing ...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screenContainer} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={styles.headerContainer}>
        <Text style={styles.pageTitle}>Reports & Analytics</Text>
        <Text style={styles.pageSubtitle}>Review task, attendance, and performance insights</Text>
      </View>

      <View style={styles.tabsWrapper}>
        <TouchableOpacity style={[styles.tabButton, activeTab === "tasks" && styles.tabActive]} onPress={() => setActiveTab("tasks")}>
          <Text style={[styles.tabText, activeTab === "tasks" && styles.tabTextActive]}>Tasks</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabButton, activeTab === "attendance" && styles.tabActive]} onPress={() => setActiveTab("attendance")}>
          <Text style={[styles.tabText, activeTab === "attendance" && styles.tabTextActive]}>Time Clock</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabButton, activeTab === "performance" && styles.tabActive]} onPress={() => setActiveTab("performance")}>
          <Text style={[styles.tabText, activeTab === "performance" && styles.tabTextActive]}>Performance</Text>
        </TouchableOpacity>
      </View>

      {activeTab === "tasks" && (
        <View style={styles.viewContent}>
          <View style={styles.chartCard}>
            <View style={styles.chartHeaderRow}>
              <BarChart2 size={16} color="#ffd27a" />
              <Text style={styles.chartTitle}>Tasks by Status</Text>
            </View>
            <View style={styles.barChartContainer}>
              {analytics?.statusAnalytics?.map((item) => (
                <View key={item.status} style={styles.barColumn}>
                  <View style={styles.barBackTrack}>
                    <View style={[styles.barFill, { height: `${(item.value / maxStatusVal) * 100}%` }]} />
                  </View>
                  <Text style={styles.barCountLabel}>{item.value}</Text>
                  <Text style={styles.barAxisLabel} numberOfLines={1}>{item.status}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.chartCard}>
            <View style={styles.chartHeaderRow}>
              <BarChart2 size={16} color="#ffd27a" />
              <Text style={styles.chartTitle}>Tasks by Priority</Text>
            </View>
            <View style={styles.barChartContainer}>
              {analytics?.priorityAnalytics?.map((item) => (
                <View key={item.priority} style={styles.barColumn}>
                  <View style={styles.barBackTrack}>
                    <View style={[styles.barFill, { height: `${(item.value / maxPriorityVal) * 100}%` }]} />
                  </View>
                  <Text style={styles.barCountLabel}>{item.value}</Text>
                  <Text style={styles.barAxisLabel} numberOfLines={1}>{item.priority}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.actionCard}>
            <View style={styles.searchRow}>
              <View style={styles.searchWrapper}>
                <Search size={14} color="#a1a1aa" style={styles.searchIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Search tasks..."
                  placeholderTextColor="#52525b"
                  value={taskQuery}
                  onChangeText={setTaskQuery}
                />
              </View>
              <TouchableOpacity style={styles.exportButton} onPress={exportTasksCsv}>
                <Download size={14} color="#09090b" />
                <Text style={styles.exportBtnText}>CSV</Text>
              </TouchableOpacity>
            </View>

            {/* Complete Robust Tasks Table Layout */}
            <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.horizontalTableContainer}>
              <View style={{ width: TASK_TABLE_MIN_WIDTH }}>
                <View style={styles.tableHeadRow}>
                  <Text style={[styles.tableTh, { width: TASK_COLS.title }]}>Task Name</Text>
                  <Text style={[styles.tableTh, { width: TASK_COLS.assignee }]}>Assignee</Text>
                  <Text style={[styles.tableTh, { width: TASK_COLS.priority }]}>Priority</Text>
                  <Text style={[styles.tableTh, { width: TASK_COLS.status }]}>Status</Text>
                  <Text style={[styles.tableTh, { width: TASK_COLS.dueDate }]}>Due Date</Text>
                </View>
                {filteredTasks.map((t) => (
                  <View key={t.id} style={styles.tableBodyRow}>
                    <Text style={[styles.tableTdText, styles.boldCell, { width: TASK_COLS.title }]} numberOfLines={1} ellipsizeMode="tail">{t.title}</Text>
                    <Text style={[styles.tableTdText, { width: TASK_COLS.assignee }]} numberOfLines={1} ellipsizeMode="tail">{t.assignee || "Unassigned"}</Text>
                    <View style={{ width: TASK_COLS.priority, ...styles.badgeAlign }}><View style={styles.outlineBadge}><Text style={styles.outlineBadgeText}>{t.priority}</Text></View></View>
                    <View style={{ width: TASK_COLS.status, ...styles.badgeAlign }}><View style={styles.solidBadge}><Text style={styles.solidBadgeText}>{t.status}</Text></View></View>
                    <Text style={[styles.tableTdText, { width: TASK_COLS.dueDate }]}>{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "--"}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      )}

      {activeTab === "attendance" && (
        <View style={styles.viewContent}>
          <View style={styles.chartCard}>
            <View style={styles.chartHeaderRow}>
              <TrendingUp size={16} color="#ffd27a" />
              <Text style={styles.chartTitle}>Weekly Log Trend Monitor</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 8 }}>
              {analytics?.weeklyTrend?.map((week, idx) => (
                <View key={idx} style={styles.trendMetricNode}>
                  <Text style={styles.trendNodeHeader}>{week.week}</Text>
                  <View style={styles.trendNodeMetrics}>
                    <Text style={styles.trendSubText}>Done: <Text style={{ color: "#ffd27a", fontWeight: "700" }}>{week.tasksCompleted}</Text></Text>
                    <Text style={styles.trendSubText}>Hours: <Text style={{ color: "#f4f4f5", fontWeight: "700" }}>{week.hoursLogged}h</Text></Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>

          <View style={styles.actionCard}>
            <View style={styles.searchRow}>
              <View style={styles.searchWrapper}>
                <Search size={14} color="#a1a1aa" style={styles.searchIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Search rosters..."
                  placeholderTextColor="#52525b"
                  value={attendanceQuery}
                  onChangeText={setAttendanceQuery}
                />
              </View>
              <TouchableOpacity style={styles.exportButton} onPress={exportAttendanceCsv}>
                <Download size={14} color="#09090b" />
                <Text style={styles.exportBtnText}>CSV</Text>
              </TouchableOpacity>
            </View>

            {/* Complete Robust Attendance Table Layout */}
            <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.horizontalTableContainer}>
              <View style={{ width: ATTENDANCE_TABLE_MIN_WIDTH }}>
                <View style={styles.tableHeadRow}>
                  <Text style={[styles.tableTh, { width: ATTENDANCE_COLS.employee }]}>Employee</Text>
                  <Text style={[styles.tableTh, { width: ATTENDANCE_COLS.date }]}>Date</Text>
                  <Text style={[styles.tableTh, { width: ATTENDANCE_COLS.clockIn }]}>Clock In</Text>
                  <Text style={[styles.tableTh, { width: ATTENDANCE_COLS.clockOut }]}>Clock Out</Text>
                  <Text style={[styles.tableTh, { width: ATTENDANCE_COLS.hours }]}>Hours</Text>
                  <Text style={[styles.tableTh, { width: ATTENDANCE_COLS.status }]}>Status</Text>
                  <Text style={[styles.tableTh, { width: ATTENDANCE_COLS.location }]}>Location</Text>
                </View>
                {filteredAttendance.map((a) => (
                  <View key={a.id} style={styles.tableBodyRow}>
                    <Text style={[styles.tableTdText, styles.boldCell, { width: ATTENDANCE_COLS.employee }]} numberOfLines={1} ellipsizeMode="tail">{a.employee}</Text>
                    <Text style={[styles.tableTdText, { width: ATTENDANCE_COLS.date }]}>{a.date ? new Date(a.date).toLocaleDateString() : "--"}</Text>
                    <Text style={[styles.tableTdText, { width: ATTENDANCE_COLS.clockIn }]}>{a.clockIn || "--"}</Text>
                    <Text style={[styles.tableTdText, { width: ATTENDANCE_COLS.clockOut }]}>{a.clockOut || "--"}</Text>
                    <Text style={[styles.tableTdText, { width: ATTENDANCE_COLS.hours, color: "#ffd27a", fontWeight: "600" }]}>{a.totalHours}h</Text>
                    <View style={{ width: ATTENDANCE_COLS.status, ...styles.badgeAlign }}><View style={styles.solidBadge}><Text style={styles.solidBadgeText}>{a.status}</Text></View></View>
                    <Text style={[styles.tableTdText, { width: ATTENDANCE_COLS.location }]} numberOfLines={1} ellipsizeMode="tail">{a.location}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      )}

      {activeTab === "performance" && (
        <View style={styles.viewContent}>
          <View style={styles.chartCard}>
            <View style={styles.chartHeaderRow}>
              <Users size={16} color="#ffd27a" />
              <Text style={styles.chartTitle}>Assigned Hours Matrix</Text>
            </View>
            <View style={{ marginTop: 12, gap: 14 }}>
              {analytics?.hoursByEmployee?.map((row) => (
                <View key={row.employee} style={styles.rowMetricContainer}>
                  <View style={styles.rowMetricHeader}>
                    <Text style={styles.rowMetricName}>{row.employee}</Text>
                    <Text style={styles.rowMetricHours}>{row.hours} Hours</Text>
                  </View>
                  <View style={styles.horizontalTrack}>
                    <View style={[styles.horizontalFill, { width: `${(row.hours / maxEmployeeHours) * 100}%` }]} />
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  screenContainer: {
    flex: 1,
    backgroundColor: "#09090b",
    paddingHorizontal: 16,
  },
  headerContainer: {
    marginTop: 20,
    marginBottom: 16,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#f4f4f5",
    letterSpacing: 0.3,
  },
  pageSubtitle: {
    fontSize: 13,
    color: "#a1a1aa",
    marginTop: 2,
  },
  tabsWrapper: {
    flexDirection: "row",
    backgroundColor: "#18181b",
    padding: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#27272a",
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 6,
  },
  tabActive: {
    backgroundColor: "#27272a",
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#a1a1aa",
  },
  tabTextActive: {
    color: "#ffd27a",
    fontWeight: "700",
  },
  viewContent: {
    gap: 16,
  },
  chartCard: {
    backgroundColor: "#121214",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 10,
    padding: 16,
  },
  chartHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#f4f4f5",
  },
  barChartContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    height: 160,
    paddingTop: 10,
  },
  barColumn: {
    alignItems: "center",
    flex: 1,
    marginHorizontal: 4,
  },
  barBackTrack: {
    height: 100,
    width: 14,
    backgroundColor: "#18181b",
    borderRadius: 4,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  barFill: {
    width: "100%",
    backgroundColor: "#ffd27a",
    borderRadius: 4,
  },
  barCountLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#f4f4f5",
    marginTop: 4,
  },
  barAxisLabel: {
    fontSize: 10,
    color: "#a1a1aa",
    marginTop: 2,
    textTransform: "capitalize",
    textAlign: "center",
  },
  actionCard: {
    backgroundColor: "#121214",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 10,
    paddingVertical: 14,
  },
  searchRow: {
    flexDirection: "row",
    paddingHorizontal: 14,
    gap: 10,
    marginBottom: 14,
  },
  searchWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#18181b",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 6,
    paddingHorizontal: 10,
  },
  searchIcon: {
    marginRight: 6,
  },
  textInput: {
    flex: 1,
    height: 38,
    color: "#f4f4f5",
    fontSize: 13,
  },
  exportButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffd27a",
    paddingHorizontal: 14,
    borderRadius: 6,
    gap: 6,
  },
  exportBtnText: {
    color: "#09090b",
    fontSize: 12,
    fontWeight: "700",
  },
  horizontalTableContainer: {
    paddingHorizontal: 14,
  },
  tableHeadRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#27272a",
    paddingBottom: 8,
    marginBottom: 4,
  },
  tableTh: {
    fontSize: 11,
    fontWeight: "600",
    color: "#a1a1aa",
    textTransform: "uppercase",
    paddingRight: 6,
  },
  tableBodyRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: "#1c1c1f",
  },
  tableTdText: {
    fontSize: 13,
    color: "#d4d4d8",
    paddingRight: 8,
  },
  boldCell: {
    color: "#f4f4f5",
    fontWeight: "600",
  },
  badgeAlign: {
    alignItems: "flex-start",
    justifyContent: "center",
  },
  outlineBadge: {
    borderWidth: 1,
    borderColor: "#3f3f46",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: "#18181b",
  },
  outlineBadgeText: {
    fontSize: 10,
    color: "#a1a1aa",
    textTransform: "capitalize",
    fontWeight: "600",
  },
  solidBadge: {
    backgroundColor: "#27272a",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  solidBadgeText: {
    fontSize: 10,
    color: "#ffd27a",
    textTransform: "capitalize",
    fontWeight: "700",
  },
  trendMetricNode: {
    backgroundColor: "#18181b",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 8,
    padding: 12,
    marginRight: 10,
    width: 130,
  },
  trendNodeHeader: {
    fontSize: 12,
    fontWeight: "700",
    color: "#a1a1aa",
    marginBottom: 6,
  },
  trendNodeMetrics: {
    gap: 2,
  },
  trendSubText: {
    fontSize: 11,
    color: "#71717a",
  },
  rowMetricContainer: {
    gap: 6,
  },
  rowMetricHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  rowMetricName: {
    fontSize: 13,
    color: "#f4f4f5",
    fontWeight: "600",
  },
  rowMetricHours: {
    fontSize: 12,
    color: "#ffd27a",
    fontWeight: "700",
  },
  horizontalTrack: {
    height: 8,
    backgroundColor: "#18181b",
    borderRadius: 4,
    overflow: "hidden",
  },
  horizontalFill: {
    height: "100%",
    backgroundColor: "#ffd27a",
    borderRadius: 4,
  },
});