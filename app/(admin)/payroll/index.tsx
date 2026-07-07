import React, { useEffect, useMemo, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  SafeAreaView,
  Dimensions,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import {
  DollarSign,
  Users,
  Clock,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  TrendingUp,
  Filter,
} from "lucide-react-native";

import { listResource } from "@/lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";

const { width } = Dimensions.get("window");

interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  category?: string;
  role: string;
  company?: string;
  status: "active" | "inactive" | "on-leave";
  payType: "hourly" | "monthly";
  payRate: string;
  hireDate: string;
  shift?: string;
}

interface TimeEntry {
  id: string;
  employee: string;
  employeeId?: string;
  date: string;
  clockIn: string;
  clockOut: string | null;
  status: "clocked-in" | "clocked-out" | "on-break";
}

interface PayrollData {
  employee: Employee;
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  regularPay: number;
  overtimePay: number;
  totalPay: number;
  hourlyRate: number;
  isMonthly: boolean;
  monthlySalary: number;
}

function unpackListPayload<T>(response: any): T[] {
  if (!response) return [];
  if (response && typeof response === "object" && "items" in response) {
    return Array.isArray(response.items) ? response.items : [];
  }
  return Array.isArray(response) ? response : [];
}

function parsePayRate(rate: string): number {
  const match = String(rate).match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : 0;
}

function parseMinutes(hhmm: string) {
  const parts = String(hhmm || "").split(":");
  if (parts.length < 2) return null;
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  const s = parts.length > 2 ? Number(parts[2]) : 0;
  if (!Number.isFinite(h) || !Number.isFinite(m) || !Number.isFinite(s)) return null;
  return h * 3600 + m * 60 + s;
}

function calcHoursWorked(clockIn: string, clockOut: string | null): number {
  if (!clockOut) return 0;
  const inSec = parseMinutes(clockIn);
  const outSec = parseMinutes(clockOut);
  if (inSec === null || outSec === null) return 0;
  const diff = outSec - inSec;
  return diff > 0 ? diff / 3600 : 0;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m}m`;
}

function getMonthName(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export default function PayrollScreen() {
  const { uiTheme } = useTheme();
 const isDark = useMemo(
    () => ["dark-minimal", "neon-tech", "metallic-elite", "executive-black", "high-contrast", "energy-mode"].includes(uiTheme.theme),
    [uiTheme.theme]
  );
  const colors = useMemo(() => ({
    background: uiTheme?.panelColors?.dashboardBackground || (isDark ? "#0F172A" : "#F8FAFC"),
    cardBg: uiTheme?.panelColors?.dashboardCardBackground || (isDark ? "#1E293B" : "#FFFFFF"),
    text: uiTheme?.panelColors?.dashboardTextColor || (isDark ? "#FFFFFF" : "#0F172A"),
    muted: isDark ? "#94A3B8" : "#64748B",
    border: isDark ? "#334155" : "#E2E8F0",
    primary: uiTheme?.customColors?.primary || "#3B82F6",
    success: "#10B981",
    warning: "#F59E0B",
    danger: "#EF4444",
    white: "#FFFFFF",
    inputBg: isDark ? "#0F172A" : "#F1F5F9"
  }), [uiTheme, isDark]);

  const styles = useMemo(() => createStyles(colors), [colors]);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedEmployee, setSelectedEmployee] = useState<PayrollData | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const employeesQuery = useQuery({
    queryKey: ["employees-list"],
    queryFn: async () => unpackListPayload<Employee>(await listResource("employees")),
    staleTime: 60 * 1000,
  });

  const timeEntriesQuery = useQuery({
    queryKey: ["time-entries-list"],
    queryFn: async () => unpackListPayload<TimeEntry>(await listResource("time-entries")),
    staleTime: 30 * 1000,
  });

  const employees = employeesQuery.data || [];
  const timeEntries = timeEntriesQuery.data || [];
  const isLoading = employeesQuery.isLoading || timeEntriesQuery.isLoading;

  const payrollData = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);

    const monthlyEntries = timeEntries.filter((entry) => {
      const entryDate = new Date(entry.date);
      return entryDate >= startOfMonth && entryDate <= endOfMonth && entry.clockOut;
    });

    return employees.map((emp) => {
      const empEntries = monthlyEntries.filter(
        (e) =>
          e.employee?.toLowerCase().trim() === emp.name?.toLowerCase().trim() ||
          e.employeeId === emp.id ||
          String(e.employeeId || "").toLowerCase() === String(emp.id || "").toLowerCase()
      );

      const totalHours = empEntries.reduce((sum, entry) => {
        return sum + calcHoursWorked(entry.clockIn, entry.clockOut);
      }, 0);

      const isMonthly = emp.payType === "monthly";
      const monthlySalary = parsePayRate(emp.payRate);
      const hourlyRate = isMonthly ? monthlySalary / 160 : parsePayRate(emp.payRate);

      let regularHours = 0;
      let overtimeHours = 0;
      let regularPay = 0;
      let overtimePay = 0;
      let totalPay = 0;

      if (isMonthly) {
        regularHours = totalHours;
        regularPay = monthlySalary;
        overtimeHours = 0;
        overtimePay = 0;
        totalPay = monthlySalary;
      } else {
        regularHours = Math.min(totalHours, 160);
        overtimeHours = Math.max(0, totalHours - 160);
        const overtimeRate = hourlyRate * 1.5;
        regularPay = regularHours * hourlyRate;
        overtimePay = overtimeHours * overtimeRate;
        totalPay = regularPay + overtimePay;
      }

      return {
        employee: emp,
        totalHours,
        regularHours,
        overtimeHours,
        regularPay,
        overtimePay,
        totalPay,
        hourlyRate,
        isMonthly,
        monthlySalary,
      };
    });
  }, [employees, timeEntries, currentMonth]);

  const stats = useMemo(() => {
    const totalEmployees = employees.length;
    const activeEmployees = employees.filter((e) => e.status === "active").length;
    const totalMonthlyPayroll = payrollData.reduce((sum, p) => sum + p.totalPay, 0);
    const totalHoursWorked = payrollData.reduce((sum, p) => sum + p.totalHours, 0);

    return { totalEmployees, activeEmployees, totalMonthlyPayroll, totalHoursWorked };
  }, [employees, payrollData]);

  const filteredPayroll = useMemo(() => {
    return payrollData.filter((p) => {
      const matchesSearch =
        p.employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.employee.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.employee.role.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || p.employee.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [payrollData, searchQuery, statusFilter]);

  const chartData = useMemo(() => {
    return payrollData
      .filter((p) => p.totalPay > 0)
      .sort((a, b) => b.totalPay - a.totalPay)
      .slice(0, 5);
  }, [payrollData]);

  const maxChartValue = useMemo(() => {
    const max = Math.max(...chartData.map((p) => p.totalPay), 0);
    return max > 0 ? max : 1000;
  }, [chartData]);

  const employeeDailyData = useMemo(() => {
    if (!selectedEmployee) return [];
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = getDaysInMonth(year, month);

    const data: { day: number; date: string; hours: number }[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const dayEntries = timeEntries.filter(
        (e) =>
          (e.employee?.toLowerCase().trim() === selectedEmployee.employee.name?.toLowerCase().trim() ||
            e.employeeId === selectedEmployee.employee.id) &&
          e.date === dateStr &&
          e.clockOut
      );

      const hours = dayEntries.reduce((sum, entry) => sum + calcHoursWorked(entry.clockIn, entry.clockOut), 0);
      if (hours > 0) {
        data.push({ day, date: `${month + 1}/${day}`, hours });
      }
    }
    return data;
  }, [selectedEmployee, timeEntries, currentMonth]);

  const handlePreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const getInitials = (name: string) => {
    return name ? name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() : "EE";
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Payroll Ledger</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>Manage employee disbursements & hours</Text>
        </View>
      </View>

      <View style={[styles.dateNavigator, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        <TouchableOpacity style={[styles.navBtn, { backgroundColor: colors.inputBg }]} onPress={handlePreviousMonth}>
          <ChevronLeft color={colors.text} size={20} />
        </TouchableOpacity>
        <Text style={[styles.dateLabel, { color: colors.text }]}>{getMonthName(currentMonth)}</Text>
        <TouchableOpacity style={[styles.navBtn, { backgroundColor: colors.inputBg }]} onPress={handleNextMonth}>
          <ChevronRight color={colors.text} size={20} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          <View style={styles.metricsGrid}>
            <View style={[styles.metricCard2x2, { backgroundColor: colors.cardBg, borderColor: colors.primary }]}>
              <Users color={colors.primary} size={20} style={styles.cardIcon} />
              <Text style={[styles.metricValue, { color: colors.text }]}>{stats.totalEmployees}</Text>
              <Text style={[styles.metricLabel, { color: colors.muted }]}>Total Employees</Text>
            </View>

            <View style={[styles.metricCard2x2, { backgroundColor: colors.cardBg, borderColor: colors.success }]}>
              <TrendingUp color={colors.success} size={20} style={styles.cardIcon} />
              <Text style={[styles.metricValue, { color: colors.success }]}>{stats.activeEmployees}</Text>
              <Text style={[styles.metricLabel, { color: colors.muted }]}>Active Employees</Text>
            </View>

            <View style={[styles.metricCard2x2, { backgroundColor: colors.cardBg, borderColor: colors.warning }]}>
              <DollarSign color={colors.warning} size={20} style={styles.cardIcon} />
              <Text style={[styles.metricValue, { color: colors.warning }]}>
                {formatCurrency(stats.totalMonthlyPayroll)}
              </Text>
              <Text style={[styles.metricLabel, { color: colors.muted }]}>Monthly Payroll</Text>
            </View>

            <View style={[styles.metricCard2x2, { backgroundColor: colors.cardBg, borderColor: "#8b5cf6" }]}>
              <Clock color="#8b5cf6" size={20} style={styles.cardIcon} />
              <Text style={[styles.metricValue, { color: "#8b5cf6" }]}>
                {Math.round(stats.totalHoursWorked)} hrs
              </Text>
              <Text style={[styles.metricLabel, { color: colors.muted }]}>Total Hours</Text>
            </View>
          </View>

          {chartData.length > 0 && (
            <View style={[styles.chartWrapper, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              <Text style={[styles.chartTitle, { color: colors.text }]}>Top Monthly Compensations</Text>
              
              <View style={styles.chartContentRow}>
                <View style={styles.yAxisContainer}>
                  {[1, 0.75, 0.5, 0.25, 0].map((percentage, index) => (
                    <Text key={index} style={[styles.axisLabel, { color: colors.muted }]}>
                      {formatCurrency(maxChartValue * percentage).split(".")[0]}
                    </Text>
                  ))}
                </View>

                <View style={styles.chartMainArea}>
                  <View style={styles.gridLinesLayer}>
                    {[0, 1, 2, 3, 4].map((i) => (
                      <View key={i} style={[styles.gridLine, { backgroundColor: colors.border }]} />
                    ))}
                  </View>

                  <View style={styles.barsContainer}>
                    {chartData.map((item, index) => {
                      const ratio = item.totalPay / maxChartValue;
                      return (
                        <View key={item.employee.id || index} style={styles.barColumn}>
                          <View style={styles.barTrack}>
                            <View style={[styles.barFill, { height: `${Math.max(ratio * 100, 3)}%`, backgroundColor: colors.primary }]} />
                          </View>
                          <Text style={[styles.barLabel, { color: colors.muted }]} numberOfLines={1}>
                            {item.employee.name.split(" ")[0]}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </View>
            </View>
          )}

          <View style={styles.filterSection}>
            <View style={[styles.searchBox, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              <Search color={colors.muted} size={16} style={{ marginRight: 8 }} />
              <TextInput
                placeholder="Search staff ledger..."
                style={[styles.searchInput, { color: colors.text }]}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor={colors.muted}
              />
            </View>
            <TouchableOpacity style={[styles.filterTrigger, { backgroundColor: colors.cardBg, borderColor: colors.border }]} onPress={() => setIsPickerOpen(true)}>
              <Filter color={colors.text} size={16} />
              <Text style={[styles.filterTriggerText, { color: colors.text }]}>{statusFilter.toUpperCase()}</Text>
            </TouchableOpacity>
          </View>

          <View style={{ paddingHorizontal: 16 }}>
            {filteredPayroll.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.muted }]}>No payroll distributions found.</Text>
            ) : (
              filteredPayroll.map((item) => (
                <TouchableOpacity
                  key={item.employee.id}
                  style={[styles.payrollCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
                  onPress={() => {
                    setSelectedEmployee(item);
                    setDetailOpen(true);
                  }}
                >
                  <View style={styles.cardHeaderRow}>
                    <View style={[styles.avatarFallback, { backgroundColor: colors.inputBg }]}>
                      <Text style={[styles.avatarText, { color: colors.primary }]}>{getInitials(item.employee.name)}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.empName, { color: colors.text }]}>{item.employee.name}</Text>
                      <Text style={[styles.empRole, { color: colors.muted }]}>{item.employee.role || "Staff Member"}</Text>
                    </View>
                    <View style={[styles.badgeWrapper, { backgroundColor: colors.inputBg }]}>
                      <Text style={[styles.payTypeBadge, { color: colors.text }]}>{item.employee.payType.toUpperCase()}</Text>
                    </View>
                  </View>

                  <View style={[styles.cardStatsRow, { borderTopColor: colors.border }]}>
                    <View>
                      <Text style={[styles.subStatLabel, { color: colors.muted }]}>Pay Rate</Text>
                      <Text style={[styles.subStatValue, { color: colors.text }]}>
                        {item.isMonthly 
                          ? `${formatCurrency(item.monthlySalary)}/mo` 
                          : `${formatCurrency(item.hourlyRate)}/hr`
                        }
                      </Text>
                    </View>
                    <View style={{ alignItems: "center" }}>
                      <Text style={[styles.subStatLabel, { color: colors.muted }]}>Hours Worked</Text>
                      <Text style={[styles.subStatValue, { color: colors.text }]}>{formatHours(item.totalHours)}</Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={[styles.subStatLabel, { color: colors.muted }]}>Total Pay</Text>
                      <Text style={[styles.grossPayAmount, { color: colors.success }]}>{formatCurrency(item.totalPay)}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </ScrollView>
      )}

      <Modal visible={isPickerOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.pickerMenu, { backgroundColor: colors.cardBg }]}>
            <Text style={[styles.pickerMenuTitle, { color: colors.text }]}>Filter by Status</Text>
            {["all", "active", "inactive", "on-leave"].map((status) => (
              <TouchableOpacity
                key={status}
                style={[styles.pickerItem, { borderBottomColor: colors.border }]}
                onPress={() => {
                  setStatusFilter(status);
                  setIsPickerOpen(false);
                }}
              >
                <Text style={[styles.pickerItemText, { color: colors.text }]}>{status.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      <Modal visible={detailOpen} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Payroll Specification</Text>
            <TouchableOpacity onPress={() => setDetailOpen(false)}>
              <X color={colors.text} size={24} />
            </TouchableOpacity>
          </View>

          {selectedEmployee && (
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              <View style={styles.modalProfileSection}>
                <View style={[styles.avatarFallback, { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.inputBg }]}>
                  <Text style={[styles.avatarText, { fontSize: 18, color: colors.primary }]}>
                    {getInitials(selectedEmployee.employee.name)}
                  </Text>
                </View>
                <Text style={[styles.modalProfileName, { color: colors.text }]}>{selectedEmployee.employee.name}</Text>
                <Text style={[styles.modalProfileSub, { color: colors.muted }]}>{selectedEmployee.employee.role}</Text>
              </View>

              <View style={[styles.summaryBlock, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                <Text style={[styles.sectionHeader, { color: colors.text }]}>Gross Allocation Breakdown</Text>
                <View style={[styles.breakdownRow, { borderColor: colors.border }]}>
                  <Text style={[styles.breakdownLabel, { color: colors.muted }]}>Pay Type Model</Text>
                  <Text style={[styles.breakdownVal, { color: colors.text }]}>{selectedEmployee.employee.payType.toUpperCase()}</Text>
                </View>
                <View style={[styles.breakdownRow, { borderColor: colors.border }]}>
                  <Text style={[styles.breakdownLabel, { color: colors.muted }]}>Hourly Rate</Text>
                  <Text style={[styles.breakdownVal, { color: colors.text }]}>{formatCurrency(selectedEmployee.hourlyRate)}/hr</Text>
                </View>
                <View style={[styles.breakdownRow, { borderColor: colors.border }]}>
                  <Text style={[styles.breakdownLabel, { color: colors.muted }]}>Regular Hours</Text>
                  <Text style={[styles.breakdownVal, { color: colors.text }]}>{formatHours(selectedEmployee.regularHours)}</Text>
                </View>
                <View style={[styles.breakdownRow, { borderColor: colors.border }]}>
                  <Text style={[styles.breakdownLabel, { color: colors.muted }]}>Overtime</Text>
                  <Text style={[styles.breakdownVal, { color: colors.text }]}>{formatHours(selectedEmployee.overtimeHours)}</Text>
                </View>
                <View style={[styles.breakdownRow, { borderBottomWidth: 0, marginTop: 8 }]}>
                  <Text style={[styles.breakdownLabel, { fontWeight: "700", color: colors.text }]}>
                    Total Pay
                  </Text>
                  <Text style={[styles.modalTotalPay, { color: colors.success }]}>{formatCurrency(selectedEmployee.totalPay)}</Text>
                </View>
              </View>

              <Text style={[styles.sectionHeader, { marginTop: 20, marginBottom: 8, color: colors.text }]}>
                Active Shift Records (This Period)
              </Text>
              {employeeDailyData.length === 0 ? (
                <Text style={[styles.emptyText, { color: colors.muted }]}>No clocked hours found this month.</Text>
              ) : (
                employeeDailyData.map((row) => (
                  <View key={row.day} style={[styles.shiftRowRecord, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                    <Text style={[styles.shiftDateText, { color: colors.text }]}>Date: {row.date}</Text>
                    <Text style={[styles.shiftDurationValue, { color: colors.text }]}>{formatHours(row.hours)}</Text>
                  </View>
                ))
              )}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1 },
    header: { padding: 16, borderBottomWidth: 1 },
    title: { fontSize: 22, fontWeight: "700" },
    subtitle: { fontSize: 13, marginTop: 2 },
    dateNavigator: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1 },
    navBtn: { padding: 8, borderRadius: 8 },
    dateLabel: { fontSize: 15, fontWeight: "600" },
    metricsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
    metricCard2x2: { width: "48%", marginVertical: 6, padding: 14, borderRadius: 10, borderWidth: 1, position: "relative" },
    cardIcon: { position: "absolute", top: 12, right: 12, opacity: 0.3 },
    metricValue: { fontSize: 18, fontWeight: "700", marginTop: 12 },
    metricLabel: { fontSize: 12, marginTop: 4 },
    chartWrapper: { margin: 16, padding: 16, borderRadius: 12, borderWidth: 1 },
    chartTitle: { fontSize: 14, fontWeight: "600", marginBottom: 16 },
    chartContentRow: { flexDirection: "row", height: 175 },
    yAxisContainer: { justifyContent: "space-between", alignItems: "flex-end", paddingBottom: 22, marginRight: 8, width: 62 },
    axisLabel: { fontSize: 10, fontWeight: "500" },
    chartMainArea: { flex: 1, position: "relative" },
    gridLinesLayer: { position: "absolute", left: 0, right: 0, top: 0, height: 150, justifyContent: "space-between" },
    gridLine: { height: 1, width: "100%" },
    barsContainer: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, flexDirection: "row", justifyContent: "space-around" },
    barColumn: { alignItems: "center", justifyContent: "flex-end", flex: 1 },
    barTrack: { height: 150, justifyContent: "flex-end", alignItems: "center", width: "100%" },
    barFill: { width: 24, borderTopLeftRadius: 5, borderTopRightRadius: 5 },
    barLabel: { fontSize: 10, marginTop: 6, fontWeight: "500", textAlign: "center", width: "100%" },
    filterSection: { flexDirection: "row", marginHorizontal: 16, marginBottom: 16, gap: 10 },
    searchBox: { flex: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, height: 40 },
    searchInput: { flex: 1, fontSize: 14 },
    filterTrigger: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, gap: 6 },
    filterTriggerText: { fontSize: 12, fontWeight: "600" },
    payrollCard: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 12 },
    cardHeaderRow: { flexDirection: "row", alignItems: "center" },
    avatarFallback: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
    avatarText: { fontSize: 14, fontWeight: "700" },
    empName: { fontSize: 15, fontWeight: "600" },
    empRole: { fontSize: 12 },
    badgeWrapper: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    payTypeBadge: { fontSize: 10, fontWeight: "700" },
    cardStatsRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 14, paddingTop: 12, borderTopWidth: 1 },
    subStatLabel: { fontSize: 11, fontWeight: "500" },
    subStatValue: { fontSize: 13, fontWeight: "600", marginTop: 2 },
    grossPayAmount: { fontSize: 14, fontWeight: "700", marginTop: 2 },
    emptyText: { textAlign: "center", marginVertical: 24, fontSize: 14 },
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center" },
    pickerMenu: { width: width * 0.8, borderRadius: 12, padding: 16 },
    pickerMenuTitle: { fontSize: 15, fontWeight: "700", marginBottom: 12 },
    pickerItem: { paddingVertical: 12, borderBottomWidth: 1 },
    pickerItemText: { fontSize: 13, fontWeight: "600" },
    modalContainer: { flex: 1 },
    modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1 },
    modalTitle: { fontSize: 18, fontWeight: "700" },
    modalProfileSection: { alignItems: "center", marginVertical: 20 },
    modalProfileName: { fontSize: 18, fontWeight: "700", marginTop: 10 },
    modalProfileSub: { fontSize: 13 },
    summaryBlock: { borderRadius: 12, padding: 16, borderWidth: 1 },
    sectionHeader: { fontSize: 14, fontWeight: "700", marginBottom: 12 },
    breakdownRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1 },
    breakdownLabel: { fontSize: 13 },
    breakdownVal: { fontSize: 13, fontWeight: "600" },
    modalTotalPay: { fontSize: 16, fontWeight: "800" },
    shiftRowRecord: { flexDirection: "row", justifyContent: "space-between", padding: 12, borderRadius: 8, marginBottom: 8, borderWidth: 1 },
    shiftDateText: { fontSize: 13, fontWeight: "500" },
    shiftDurationValue: { fontSize: 13, fontWeight: "600" },
  });
}