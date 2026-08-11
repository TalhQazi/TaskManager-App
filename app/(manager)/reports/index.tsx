import React, { useMemo, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  useWindowDimensions,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Download, Search, FileText, Clock, BarChart2, Users } from "lucide-react-native";
import Svg, { Rect, Line, Text as SvgText, Circle, Path } from "react-native-svg";
import { apiFetch } from "@/lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";

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

interface AnalyticsData {
  statusAnalytics: Array<{ status: TaskStatus; value: number }>;
  priorityAnalytics: Array<{ priority: TaskPriority; value: number }>;
  hoursByEmployee: Array<{ employee: string; hours: number }>;
  weeklyTrend: Array<{ week: string; tasksCompleted: number; hoursLogged: number }>;
}

function normalizeTask(t: TaskRowApi): TaskRow {
  const raw = t as Record<string, unknown>;
  const assignee =
    Array.isArray(raw.assignees) && (raw.assignees as string[]).length > 0
      ? (raw.assignees as string[])[0]
      : typeof raw.assignee === "string"
      ? raw.assignee
      : "Unassigned";

  return {
    id: t._id || String(Math.random()),
    title: t.title || "Untitled Task",
    assignee,
    status: t.status || "pending",
    priority: t.priority || "medium",
    dueDate:
      typeof t.dueDate === "string"
        ? t.dueDate
        : typeof t.dueDate === "object" && t.dueDate && "toISOString" in t.dueDate
        ? (t.dueDate as Date).toISOString().split("T")[0]
        : "",
  };
}

function normalizeAttendance(a: AttendanceRowApi): AttendanceRow {
  return {
    id: a._id || String(Math.random()),
    employee: a.employee || "Unknown Employee",
    date: a.date || "",
    clockIn: a.clockIn || "—",
    clockOut: a.clockOut || "—",
    totalHours: Number(a.totalHours) || 0,
    status: a.status || "complete",
    location: a.location || "Office",
  };
}

function SimpleBarChart({
  data,
  labelKey,
  valueKey,
  fillColor,
  height = 200,
  textColor,
  gridColor,
}: {
  data: Array<Record<string, any>>;
  labelKey: string;
  valueKey: string;
  fillColor: string;
  height?: number;
  textColor: string;
  gridColor: string;
}) {
  const { width: windowWidth } = useWindowDimensions();
  const chartWidth = Math.min(windowWidth - 48, 600);
  const paddingLeft = 32;
  const paddingBottom = 28;
  const paddingTop = 16;
  const paddingRight = 16;

  const drawableWidth = chartWidth - paddingLeft - paddingRight;
  const drawableHeight = height - paddingTop - paddingBottom;

  const maxValue = useMemo(() => {
    if (!data.length) return 10;
    const max = Math.max(...data.map((d) => Number(d[valueKey]) || 0));
    return max === 0 ? 10 : Math.ceil(max * 1.2);
  }, [data, valueKey]);

  const barWidth = useMemo(() => {
    if (!data.length) return 20;
    return Math.min(40, (drawableWidth / data.length) * 0.5);
  }, [data.length, drawableWidth]);

  return (
    <View style={{ width: "100%", alignItems: "center" }}>
      <Svg width={chartWidth} height={height}>
        {[0, 0.5, 1].map((ratio, i) => {
          const y = paddingTop + drawableHeight * (1 - ratio);
          const val = Math.round(maxValue * ratio);
          return (
            <React.Fragment key={i}>
              <Line x1={paddingLeft} y1={y} x2={chartWidth - paddingRight} y2={y} stroke={gridColor} strokeWidth="1" strokeDasharray="4 4" />
              <SvgText x={paddingLeft - 6} y={y + 4} fill={textColor} fontSize="10" textAnchor="end">
                {val}
              </SvgText>
            </React.Fragment>
          );
        })}

        {data.map((item, index) => {
          const val = Number(item[valueKey]) || 0;
          const barHeight = (val / maxValue) * drawableHeight;
          const step = drawableWidth / (data.length || 1);
          const x = paddingLeft + index * step + (step - barWidth) / 2;
          const y = paddingTop + (drawableHeight - barHeight);
          const label = String(item[labelKey] || "");

          return (
            <React.Fragment key={index}>
              <Rect x={x} y={y} width={barWidth} height={barHeight} fill={fillColor} rx={4} ry={4} />
              <SvgText x={x + barWidth / 2} y={height - 8} fill={textColor} fontSize="10" textAnchor="middle">
                {label.length > 8 ? `${label.slice(0, 7)}…` : label}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

function SimpleLineChart({
  data,
  xKey,
  yKey1,
  yKey2,
  color1,
  color2,
  height = 220,
  textColor,
  gridColor,
}: {
  data: Array<Record<string, any>>;
  xKey: string;
  yKey1: string;
  yKey2: string;
  color1: string;
  color2: string;
  height?: number;
  textColor: string;
  gridColor: string;
}) {
  const { width: windowWidth } = useWindowDimensions();
  const chartWidth = Math.min(windowWidth - 48, 600);
  const paddingLeft = 32;
  const paddingBottom = 28;
  const paddingTop = 16;
  const paddingRight = 16;

  const drawableWidth = chartWidth - paddingLeft - paddingRight;
  const drawableHeight = height - paddingTop - paddingBottom;

  const maxValue = useMemo(() => {
    if (!data.length) return 10;
    const max1 = Math.max(...data.map((d) => Number(d[yKey1]) || 0));
    const max2 = Math.max(...data.map((d) => Number(d[yKey2]) || 0));
    const max = Math.max(max1, max2);
    return max === 0 ? 10 : Math.ceil(max * 1.2);
  }, [data, yKey1, yKey2]);

  const points1 = useMemo(() => {
    if (!data.length) return "";
    const step = drawableWidth / (data.length - 1 || 1);
    return data
      .map((item, index) => {
        const val = Number(item[yKey1]) || 0;
        const x = paddingLeft + index * step;
        const y = paddingTop + drawableHeight - (val / maxValue) * drawableHeight;
        return `${index === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");
  }, [data, drawableWidth, drawableHeight, maxValue, yKey1]);

  const points2 = useMemo(() => {
    if (!data.length) return "";
    const step = drawableWidth / (data.length - 1 || 1);
    return data
      .map((item, index) => {
        const val = Number(item[yKey2]) || 0;
        const x = paddingLeft + index * step;
        const y = paddingTop + drawableHeight - (val / maxValue) * drawableHeight;
        return `${index === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");
  }, [data, drawableWidth, drawableHeight, maxValue, yKey2]);

  return (
    <View style={{ width: "100%", alignItems: "center" }}>
      <Svg width={chartWidth} height={height}>
        {[0, 0.5, 1].map((ratio, i) => {
          const y = paddingTop + drawableHeight * (1 - ratio);
          const val = Math.round(maxValue * ratio);
          return (
            <React.Fragment key={i}>
              <Line x1={paddingLeft} y1={y} x2={chartWidth - paddingRight} y2={y} stroke={gridColor} strokeWidth="1" strokeDasharray="4 4" />
              <SvgText x={paddingLeft - 6} y={y + 4} fill={textColor} fontSize="10" textAnchor="end">
                {val}
              </SvgText>
            </React.Fragment>
          );
        })}

        {points1 ? <Path d={points1} fill="none" stroke={color1} strokeWidth="2.5" /> : null}
        {points2 ? <Path d={points2} fill="none" stroke={color2} strokeWidth="2.5" /> : null}

        {data.map((item, index) => {
          const step = drawableWidth / (data.length - 1 || 1);
          const x = paddingLeft + index * step;
          const val1 = Number(item[yKey1]) || 0;
          const val2 = Number(item[yKey2]) || 0;
          const y1 = paddingTop + drawableHeight - (val1 / maxValue) * drawableHeight;
          const y2 = paddingTop + drawableHeight - (val2 / maxValue) * drawableHeight;
          const label = String(item[xKey] || "");

          return (
            <React.Fragment key={index}>
              <Circle cx={x} cy={y1} r="3.5" fill={color1} />
              <Circle cx={x} cy={y2} r="3.5" fill={color2} />
              <SvgText x={x} y={height - 8} fill={textColor} fontSize="10" textAnchor="middle">
                {label}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

export default function Reports() {
  const { width } = useWindowDimensions();
  const { uiTheme } = useTheme();

  const isDark = uiTheme?.theme !== "crystal-white";

  const palette = useMemo(() => {
    return {
      background: uiTheme?.panelColors?.dashboardBackground || (isDark ? "#09090b" : "#ffffff"),
      cardBg: uiTheme?.panelColors?.dashboardCardBackground || (isDark ? "#141517" : "#f8fafc"),
      text: uiTheme?.panelColors?.dashboardTextColor || (isDark ? "#f8fafc" : "#000000"),
      muted: isDark ? "#a1a1aa" : "#64748b",
      border: isDark ? "#27272a" : "rgba(0, 0, 0, 0.08)",
      primary: uiTheme?.customColors?.primary || "#ffd27a",
      accent: isDark ? "#3b82f6" : "#2563eb",
      surface: isDark ? "#18181b" : "#f1f5f9",
      success: "#16C784",
      chartGrid: isDark ? "#27272a" : "#e2e8f0",
      inputBg: isDark ? "#09090b" : "#ffffff",
    };
  }, [uiTheme, isDark]);

  const styles = useMemo(() => createStyles(palette), [palette]);

  const [activeTab, setActiveTab] = useState<"tasks" | "attendance" | "performance">("tasks");
  const [taskQuery, setTaskQuery] = useState("");
  const [attendanceQuery, setAttendanceQuery] = useState("");

  const tasksQuery = useQuery({
    queryKey: ["reports", "tasks"],
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const res = await apiFetch<any>("/api/reports/tasks");
      const items = Array.isArray(res) ? res : res?.items || [];
      return items.map(normalizeTask);
    },
  });

  const attendanceApiQuery = useQuery({
    queryKey: ["reports", "attendance"],
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const res = await apiFetch<any>("/api/reports/attendance");
      const items = Array.isArray(res) ? res : res?.items || [];
      return items.map(normalizeAttendance);
    },
  });

  const analyticsQuery = useQuery({
    queryKey: ["reports", "analytics"],
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      return apiFetch<AnalyticsData>("/api/reports/analytics");
    },
  });

  const tasks = tasksQuery.data ?? [];
  const attendance = attendanceApiQuery.data ?? [];

  const filteredTasks = useMemo(() => {
    const q = taskQuery.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter((t) => {
      return (
        (t.title || "").toLowerCase().includes(q) ||
        (t.assignee || "").toLowerCase().includes(q) ||
        (t.status || "").toLowerCase().includes(q) ||
        (t.priority || "").toLowerCase().includes(q)
      );
    });
  }, [tasks, taskQuery]);

  const employeeSummaryList = useMemo(() => {
    const map = new Map<string, number>();
    filteredTasks.forEach((t) => {
      const name = t.assignee || "Unassigned";
      map.set(name, (map.get(name) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [filteredTasks]);

  const filteredAttendance = useMemo(() => {
    const q = attendanceQuery.trim().toLowerCase();
    if (!q) return attendance;
    return attendance.filter((a) => {
      return (
        a.employee.toLowerCase().includes(q) ||
        a.location.toLowerCase().includes(q) ||
        a.status.toLowerCase().includes(q)
      );
    });
  }, [attendance, attendanceQuery]);

  const statusAnalytics = useMemo(() => analyticsQuery.data?.statusAnalytics ?? [], [analyticsQuery.data]);
  const priorityAnalytics = useMemo(() => analyticsQuery.data?.priorityAnalytics ?? [], [analyticsQuery.data]);
  const hoursByEmployee = useMemo(() => analyticsQuery.data?.hoursByEmployee ?? [], [analyticsQuery.data]);
  const weeklyTrend = useMemo(() => analyticsQuery.data?.weeklyTrend ?? [], [analyticsQuery.data]);

  const isLoading = tasksQuery.isLoading || attendanceApiQuery.isLoading || analyticsQuery.isLoading;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        
        <View style={styles.headerBlock}>
          <Text style={[styles.title, { color: palette.text }]}>Reports & Analytics</Text>
          <Text style={[styles.subtitle, { color: palette.muted }]}>Review task, attendance, and performance insights</Text>
        </View>

        <View style={[styles.tabBar, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === "tasks" && { backgroundColor: palette.surface }]}
            onPress={() => setActiveTab("tasks")}
          >
            <FileText size={14} color={activeTab === "tasks" ? palette.primary : palette.muted} />
            <Text style={[styles.tabText, { color: activeTab === "tasks" ? palette.text : palette.muted }]}>Task Analytics</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === "attendance" && { backgroundColor: palette.surface }]}
            onPress={() => setActiveTab("attendance")}
          >
            <Clock size={14} color={activeTab === "attendance" ? palette.primary : palette.muted} />
            <Text style={[styles.tabText, { color: activeTab === "attendance" ? palette.text : palette.muted }]}>Time Clock Reports</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === "performance" && { backgroundColor: palette.surface }]}
            onPress={() => setActiveTab("performance")}
          >
            <BarChart2 size={14} color={activeTab === "performance" ? palette.primary : palette.muted} />
            <Text style={[styles.tabText, { color: activeTab === "performance" ? palette.text : palette.muted }]}>Employee Performance</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="small" color={palette.primary} />
            <Text style={[styles.loaderText, { color: palette.muted }]}>Loading analytics data...</Text>
          </View>
        ) : (
          <>
            {activeTab === "tasks" && (
              <View style={styles.tabContent}>
                <View style={styles.gridRow}>
                  <View style={[styles.chartCard, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
                    <Text style={[styles.cardTitle, { color: palette.text }]}>Tasks by Status</Text>
                    <SimpleBarChart
                      data={statusAnalytics}
                      labelKey="status"
                      valueKey="value"
                      fillColor={palette.primary}
                      textColor={palette.muted}
                      gridColor={palette.chartGrid}
                    />
                  </View>

                  <View style={[styles.chartCard, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
                    <Text style={[styles.cardTitle, { color: palette.text }]}>Tasks by Priority</Text>
                    <SimpleBarChart
                      data={priorityAnalytics}
                      labelKey="priority"
                      valueKey="value"
                      fillColor={palette.accent}
                      textColor={palette.muted}
                      gridColor={palette.chartGrid}
                    />
                  </View>
                </View>

                {/* Assigned Employees Overview Card */}
                <View style={[styles.tableCard, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
                  <View style={styles.cardHeaderRow}>
                    <Users size={16} color={palette.primary} />
                    <Text style={[styles.cardTitle, { color: palette.text, marginBottom: 0 }]}>
                      Assigned Employees ({employeeSummaryList.length})
                    </Text>
                  </View>
                  <View style={styles.employeeChipGroup}>
                    {employeeSummaryList.map((emp) => (
                      <View key={emp.name} style={[styles.employeeChip, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                        <Text style={[styles.employeeChipName, { color: palette.text }]}>{emp.name}</Text>
                        <View style={[styles.employeeChipBadge, { backgroundColor: palette.primary }]}>
                          <Text style={styles.employeeChipBadgeText}>{emp.count}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>

                <View style={[styles.tableCard, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
                  <View style={styles.filterRow}>
                    <View style={[styles.searchBox, { backgroundColor: palette.inputBg, borderColor: palette.border }]}>
                      <Search size={16} color={palette.muted} style={{ marginRight: 8 }} />
                      <TextInput
                        style={[styles.searchInput, { color: palette.text }]}
                        placeholder="Search tasks or assignees..."
                        placeholderTextColor={palette.muted}
                        value={taskQuery}
                        onChangeText={setTaskQuery}
                        autoCorrect={false}
                      />
                    </View>
                  </View>

                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View>
                      <View style={[styles.tableHeader, { borderBottomColor: palette.border }]}>
                        <Text style={[styles.th, { width: 140, color: palette.muted }]}>Task</Text>
                        <Text style={[styles.th, { width: 120, color: palette.muted }]}>Assignee</Text>
                        <Text style={[styles.th, { width: 90, color: palette.muted }]}>Priority</Text>
                        <Text style={[styles.th, { width: 100, color: palette.muted }]}>Status</Text>
                        <Text style={[styles.th, { width: 100, color: palette.muted }]}>Due Date</Text>
                      </View>
                      {filteredTasks.map((t) => (
                        <View key={t.id} style={[styles.tableRow, { borderBottomColor: palette.border }]}>
                          <Text style={[styles.td, styles.tdBold, { width: 140, color: palette.text }]} numberOfLines={1}>{t.title}</Text>
                          <Text style={[styles.td, { width: 120, color: palette.text }]} numberOfLines={1}>{t.assignee}</Text>
                          <View style={{ width: 90 }}>
                            <View style={[styles.badge, { backgroundColor: palette.surface }]}>
                              <Text style={[styles.badgeText, { color: palette.text }]}>{t.priority}</Text>
                            </View>
                          </View>
                          <View style={{ width: 100 }}>
                            <View style={[styles.badge, { backgroundColor: palette.surface }]}>
                              <Text style={[styles.badgeText, { color: palette.text }]}>{t.status}</Text>
                            </View>
                          </View>
                          <Text style={[styles.td, { width: 100, color: palette.muted }]}>
                            {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "—"}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              </View>
            )}

            {activeTab === "attendance" && (
              <View style={styles.tabContent}>
                <View style={[styles.chartCard, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
                  <Text style={[styles.cardTitle, { color: palette.text }]}>Weekly Summary</Text>
                  <View style={styles.legendRow}>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: palette.primary }]} />
                      <Text style={[styles.legendText, { color: palette.muted }]}>Tasks Completed</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: palette.success }]} />
                      <Text style={[styles.legendText, { color: palette.muted }]}>Hours Logged</Text>
                    </View>
                  </View>
                  <SimpleLineChart
                    data={weeklyTrend}
                    xKey="week"
                    yKey1="tasksCompleted"
                    yKey2="hoursLogged"
                    color1={palette.primary}
                    color2={palette.success}
                    textColor={palette.muted}
                    gridColor={palette.chartGrid}
                  />
                </View>

                <View style={[styles.tableCard, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
                  <View style={styles.filterRow}>
                    <View style={[styles.searchBox, { backgroundColor: palette.inputBg, borderColor: palette.border }]}>
                      <Search size={16} color={palette.muted} style={{ marginRight: 8 }} />
                      <TextInput
                        style={[styles.searchInput, { color: palette.text }]}
                        placeholder="Search attendance..."
                        placeholderTextColor={palette.muted}
                        value={attendanceQuery}
                        onChangeText={setAttendanceQuery}
                        autoCorrect={false}
                      />
                    </View>
                  </View>

                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View>
                      <View style={[styles.tableHeader, { borderBottomColor: palette.border }]}>
                        <Text style={[styles.th, { width: 120, color: palette.muted }]}>Employee</Text>
                        <Text style={[styles.th, { width: 100, color: palette.muted }]}>Date</Text>
                        <Text style={[styles.th, { width: 90, color: palette.muted }]}>Clock In</Text>
                        <Text style={[styles.th, { width: 90, color: palette.muted }]}>Clock Out</Text>
                        <Text style={[styles.th, { width: 90, color: palette.muted }]}>Total Hours</Text>
                        <Text style={[styles.th, { width: 90, color: palette.muted }]}>Status</Text>
                        <Text style={[styles.th, { width: 110, color: palette.muted }]}>Location</Text>
                      </View>
                      {filteredAttendance.map((a) => (
                        <View key={a.id} style={[styles.tableRow, { borderBottomColor: palette.border }]}>
                          <Text style={[styles.td, styles.tdBold, { width: 120, color: palette.text }]} numberOfLines={1}>{a.employee}</Text>
                          <Text style={[styles.td, { width: 100, color: palette.muted }]}>
                            {a.date ? new Date(a.date).toLocaleDateString() : "—"}
                          </Text>
                          <Text style={[styles.td, { width: 90, color: palette.muted }]}>{a.clockIn}</Text>
                          <Text style={[styles.td, { width: 90, color: palette.muted }]}>{a.clockOut}</Text>
                          <Text style={[styles.td, { width: 90, color: palette.muted }]}>{a.totalHours}h</Text>
                          <View style={{ width: 90 }}>
                            <View style={[styles.badge, { backgroundColor: palette.surface }]}>
                              <Text style={[styles.badgeText, { color: palette.text }]}>{a.status}</Text>
                            </View>
                          </View>
                          <Text style={[styles.td, { width: 110, color: palette.muted }]} numberOfLines={1}>{a.location}</Text>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              </View>
            )}

            {activeTab === "performance" && (
              <View style={styles.tabContent}>
                <View style={[styles.chartCard, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
                  <Text style={[styles.cardTitle, { color: palette.text }]}>Hours by Employee</Text>
                  <SimpleBarChart
                    data={hoursByEmployee}
                    labelKey="employee"
                    valueKey="hours"
                    fillColor={palette.primary}
                    height={240}
                    textColor={palette.muted}
                    gridColor={palette.chartGrid}
                  />
                </View>

                <View style={[styles.tableCard, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ width: "100%", minWidth: width - 64 }}>
                      <View style={[styles.tableHeader, { borderBottomColor: palette.border }]}>
                        <Text style={[styles.th, { flex: 1, color: palette.muted }]}>Employee</Text>
                        <Text style={[styles.th, { width: 120, color: palette.muted }]}>Total Hours</Text>
                      </View>
                      {hoursByEmployee.map((row) => (
                        <View key={row.employee} style={[styles.tableRow, { borderBottomColor: palette.border }]}>
                          <Text style={[styles.td, styles.tdBold, { flex: 1, color: palette.text }]}>{row.employee}</Text>
                          <Text style={[styles.td, { width: 120, color: palette.muted }]}>{row.hours}h</Text>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollBody: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 40,
    },
    headerBlock: {
      marginBottom: 16,
    },
    title: {
      fontSize: 24,
      fontWeight: "800",
      letterSpacing: 0.3,
    },
    subtitle: {
      fontSize: 13,
      marginTop: 2,
    },
    tabBar: {
      flexDirection: "row",
      borderRadius: 10,
      borderWidth: 1,
      padding: 4,
      marginBottom: 20,
    },
    tabItem: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 8,
      paddingHorizontal: 4,
      borderRadius: 6,
      gap: 4,
    },
    tabText: {
      fontSize: 11,
      fontWeight: "600",
    },
    loaderContainer: {
      paddingVertical: 48,
      alignItems: "center",
      justifyContent: "center",
    },
    loaderText: {
      fontSize: 13,
      marginTop: 8,
    },
    tabContent: {
      gap: 16,
    },
    gridRow: {
      gap: 16,
    },
    chartCard: {
      borderRadius: 12,
      borderWidth: 1,
      padding: 16,
    },
    cardTitle: {
      fontSize: 15,
      fontWeight: "700",
      marginBottom: 12,
    },
    cardHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 12,
    },
    employeeChipGroup: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    employeeChip: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1,
      gap: 6,
    },
    employeeChipName: {
      fontSize: 12,
      fontWeight: "600",
    },
    employeeChipBadge: {
      borderRadius: 10,
      paddingHorizontal: 6,
      paddingVertical: 1,
    },
    employeeChipBadgeText: {
      fontSize: 10,
      fontWeight: "700",
      color: "#000000",
    },
    legendRow: {
      flexDirection: "row",
      gap: 16,
      marginBottom: 8,
    },
    legendItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    legendDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    legendText: {
      fontSize: 11,
    },
    tableCard: {
      borderRadius: 12,
      borderWidth: 1,
      padding: 16,
    },
    filterRow: {
      flexDirection: "row",
      marginBottom: 16,
    },
    searchBox: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 10,
      height: 38,
    },
    searchInput: {
      flex: 1,
      fontSize: 13,
      height: "100%",
    },
    tableHeader: {
      flexDirection: "row",
      paddingVertical: 8,
      borderBottomWidth: 1,
    },
    th: {
      fontSize: 11,
      fontWeight: "600",
    },
    tableRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 10,
      borderBottomWidth: 1,
    },
    td: {
      fontSize: 12,
    },
    tdBold: {
      fontWeight: "600",
    },
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
      alignSelf: "flex-start",
    },
    badgeText: {
      fontSize: 10,
      fontWeight: "600",
      textTransform: "capitalize",
    },
  });
}