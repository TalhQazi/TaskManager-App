import React, { useEffect, useState, useMemo } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Clock, DollarSign, TrendingUp, ChevronLeft, ChevronRight, Download } from "lucide-react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { apiFetch } from "@/lib/admin/apiClient";
import Colors from "@/constants/colors";

interface TimeEntry {
  id: string;
  employee: string;
  employeeId?: string;
  date: string;
  clockIn: string;
  clockOut: string | null;
  status: "clocked-in" | "clocked-out" | "on-break";
}

interface EmployeeProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  payType?: "hourly" | "monthly" | string;
  payRate?: string;
}

// Helper functions
function parsePayRate(rate: string): number {
  const match = String(rate).match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : 0;
}

function parseMinutes(hhmm: string) {
  const [h, m] = String(hhmm || "").split(":").map((x) => Number(x));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

function calcHoursWorked(clockIn: string, clockOut: string | null): number {
  if (!clockOut) return 0;
  const inMin = parseMinutes(clockIn);
  const outMin = parseMinutes(clockOut);
  if (inMin === null || outMin === null) return 0;
  const diff = outMin - inMin;
  return diff > 0 ? diff / 60 : 0;
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

export default function Payroll() {
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [employeeProfile, setEmployeeProfile] = useState<EmployeeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const loadData = async () => {
    try {
      setLoading(true);
      const profileRes = await apiFetch<{ item: EmployeeProfile }>("/api/employees/me");
      setEmployeeProfile(profileRes.item);
    } catch (err) {
      // Quietly handle errors
    } finally {
      setLoading(false);
    }
  };

  const loadTimeEntries = async () => {
    if (!employeeProfile) return;
    try {
      const res = await apiFetch<{ success: boolean; items: TimeEntry[] }>(
        "/api/employees/me/time-entry/history"
      );
      const allEntries = res.items || [];
      
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const startOfMonth = new Date(year, month, 1);
      const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);
      
      const monthEntries = allEntries.filter((entry) => {
        const entryDate = new Date(entry.date);
        return entryDate >= startOfMonth && entryDate <= endOfMonth;
      });
      
      setTimeEntries(monthEntries);
    } catch (err) {
      // Quietly handle errors
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (employeeProfile) {
      loadTimeEntries();
    }
  }, [employeeProfile, currentMonth]);

  const calculatedPayroll = useMemo(() => {
    if (!employeeProfile) return null;

    const totalHours = timeEntries.reduce((sum, entry) => {
      const hours = calcHoursWorked(entry.clockIn, entry.clockOut);
      return sum + hours;
    }, 0);

    const isMonthly = employeeProfile.payType === "monthly";
    const payRateValue = parsePayRate(employeeProfile.payRate || "0");
    
    let regularHours = 0, overtimeHours = 0, regularPay = 0, overtimePay = 0, totalPay = 0, hourlyRate = 0, monthlySalary = 0;

    if (isMonthly) {
      monthlySalary = payRateValue;
      hourlyRate = payRateValue / 160;
      regularHours = totalHours;
      regularPay = monthlySalary;
      totalPay = monthlySalary;
    } else {
      hourlyRate = payRateValue;
      regularHours = Math.min(totalHours, 160);
      overtimeHours = Math.max(0, totalHours - 160);
      regularPay = regularHours * hourlyRate;
      overtimePay = overtimeHours * (hourlyRate * 1.5);
      totalPay = regularPay + overtimePay;
    }

    const federalTax = totalPay * 0.12;
    const stateTax = totalPay * 0.05;
    const socialSecurity = totalPay * 0.062;
    const medicare = totalPay * 0.0145;
    const totalDeductions = federalTax + stateTax + socialSecurity + medicare;
    const netPay = totalPay - totalDeductions;

    return {
      totalHours, regularHours, overtimeHours, regularPay, overtimePay, totalPay,
      hourlyRate, isMonthly, monthlySalary, federalTax, stateTax, socialSecurity,
      medicare, totalDeductions, netPay,
    };
  }, [employeeProfile, timeEntries]);

  // Native PDF Engine Generation Trigger
  const handleExportPDF = async () => {
    if (!calculatedPayroll || !employeeProfile) return;

    const htmlContent = `
      <html>
        <head>
          <style>
            body { font-family: 'Helvetica Neue', sans-serif; padding: 30px; color: #333; }
            .header { border-bottom: 2px solid #E5E5EA; padding-bottom: 15px; margin-bottom: 25px; }
            h1 { margin: 0; font-size: 24px; }
            .meta { color: #666; margin-top: 5px; }
            .section { margin-bottom: 25px; }
            .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #F2F2F7; }
            .bold { font-weight: bold; }
            .total { color: #34C759; font-size: 18px; }
            .deduction { color: #FF3B30; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Payroll Statement</h1>
            <div class="meta">Employee: ${employeeProfile.name}</div>
            <div class="meta">Statement Period: ${getMonthName(currentMonth)}</div>
          </div>
          <div class="section">
            <div class="row"><span class="bold">Hours Summary</span></div>
            <div class="row"><span>Total Hours Worked</span><span>${formatHours(calculatedPayroll.totalHours)}</span></div>
            <div class="row"><span>Regular Hours</span><span>${formatHours(calculatedPayroll.regularHours)}</span></div>
            <div class="row"><span>Overtime Hours</span><span>${formatHours(calculatedPayroll.overtimeHours)}</span></div>
          </div>
          <div class="section">
            <div class="row"><span class="bold">Earnings Breakdown</span></div>
            <div class="row"><span>Pay Type</span><span>${calculatedPayroll.isMonthly ? "Monthly" : "Hourly"}</span></div>
            <div class="row"><span>Regular Pay</span><span>${formatCurrency(calculatedPayroll.regularPay)}</span></div>
            ${calculatedPayroll.overtimePay > 0 ? `<div class="row"><span>Overtime Pay (1.5x)</span><span>${formatCurrency(calculatedPayroll.overtimePay)}</span></div>` : ""}
            <div class="row bold"><span>Gross Pay</span><span>${formatCurrency(calculatedPayroll.totalPay)}</span></div>
          </div>
          <div class="section">
            <div class="row"><span class="bold">Deductions</span></div>
            <div class="row"><span>Federal Tax (12%)</span><span class="deduction">-${formatCurrency(calculatedPayroll.federalTax)}</span></div>
            <div class="row"><span>State Tax (5%)</span><span class="deduction">-${formatCurrency(calculatedPayroll.stateTax)}</span></div>
            <div class="row bold total"><span>Net Take-Home Pay</span><span>${formatCurrency(calculatedPayroll.netPay)}</span></div>
          </div>
        </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri, { UTI: ".pdf", mimeType: "application/pdf" });
    } catch (error) {
      console.error("PDF generation failure", error);
    }
  };

  const shiftMonth = (offset: number) => {
    const next = new Date(currentMonth);
    next.setMonth(next.getMonth() + offset);
    setCurrentMonth(next);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        
        {/* HEADER BLOCK */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>My Payroll</Text>
            <Text style={styles.subtitle}>Track your earnings and hours</Text>
          </View>
          
          <View style={styles.controlsRow}>
            <View style={styles.datePickerContainer}>
              <TouchableOpacity onPress={() => shiftMonth(-1)} style={styles.iconBtn}>
                <ChevronLeft size={20} color="#007AFF" />
              </TouchableOpacity>
              <View style={styles.monthBadge}>
                <Text style={styles.monthBadgeText}>{getMonthName(currentMonth)}</Text>
              </View>
              <TouchableOpacity onPress={() => shiftMonth(1)} style={styles.iconBtn}>
                <ChevronRight size={20} color="#007AFF" />
              </TouchableOpacity>
            </View>

            {calculatedPayroll && (
              <TouchableOpacity onPress={handleExportPDF} style={styles.exportBtn}>
                <Download size={16} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={styles.exportText}>Export PDF</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {calculatedPayroll ? (
          <View style={{ width: "100%" }}>
            {/* GRID SUMMARY MATRICES */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <View style={styles.statIconHeader}>
                  <Clock size={16} color="#007AFF" />
                  <Text style={styles.statLabel}>Total Hours</Text>
                </View>
                <Text style={styles.statValue}>{formatHours(calculatedPayroll.totalHours)}</Text>
              </View>

              <View style={styles.statCard}>
                <View style={styles.statIconHeader}>
                  <TrendingUp size={16} color="#34C759" />
                  <Text style={styles.statLabel}>Regular Hours</Text>
                </View>
                <Text style={styles.statValue}>{formatHours(calculatedPayroll.regularHours)}</Text>
              </View>

              <View style={styles.statCard}>
                <View style={styles.statIconHeader}>
                  <Clock size={16} color="#FF9500" />
                  <Text style={styles.statLabel}>Overtime</Text>
                </View>
                <Text style={[styles.statValue, { color: "#D97706" }]}>{formatHours(calculatedPayroll.overtimeHours)}</Text>
              </View>

              <View style={styles.statCard}>
                <View style={styles.statIconHeader}>
                  <DollarSign size={16} color="#34C759" />
                  <Text style={styles.statLabel}>Total Pay</Text>
                </View>
                <Text style={[styles.statValue, { color: "#34C759" }]}>{formatCurrency(calculatedPayroll.totalPay)}</Text>
              </View>
            </View>

            {/* BREAKDOWN BOX CONTAINER */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Pay Breakdown</Text>
              <View style={styles.divider} />
              <View style={styles.itemRow}><Text style={styles.label}>Pay Type</Text><Text style={styles.valueText}>{calculatedPayroll.isMonthly ? "Monthly" : "Hourly"}</Text></View>
              <View style={styles.itemRow}><Text style={styles.label}>Hourly Rate</Text><Text style={styles.valueText}>{formatCurrency(calculatedPayroll.hourlyRate)}/hr</Text></View>
              {calculatedPayroll.isMonthly && <View style={styles.itemRow}><Text style={styles.label}>Monthly Salary</Text><Text style={styles.valueText}>{formatCurrency(calculatedPayroll.monthlySalary)}</Text></View>}
              <View style={styles.itemRow}><Text style={styles.label}>Regular Pay</Text><Text style={styles.valueText}>{formatCurrency(calculatedPayroll.regularPay)}</Text></View>
              {calculatedPayroll.overtimePay > 0 && <View style={styles.itemRow}><Text style={styles.label}>Overtime Pay (1.5x)</Text><Text style={[styles.valueText, { color: "#D97706" }]}>{formatCurrency(calculatedPayroll.overtimePay)}</Text></View>}
              <View style={[styles.itemRow, { borderTopWidth: 1, borderColor: "#E5E5EA", paddingTop: 10, marginTop: 6 }]}><Text style={styles.boldLabel}>Total Pay</Text><Text style={[styles.boldValue, { color: "#34C759" }]}>{formatCurrency(calculatedPayroll.totalPay)}</Text></View>
            </View>

            {/* TAXATION DEDUCTION SECTION */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Tax Deductions</Text>
              <View style={styles.divider} />
              <View style={styles.itemRow}><Text style={styles.label}>Federal Tax (12%)</Text><Text style={[styles.valueText, { color: "#FF3B30" }]}>-{formatCurrency(calculatedPayroll.federalTax)}</Text></View>
              <View style={styles.itemRow}><Text style={styles.label}>State Tax (5%)</Text><Text style={[styles.valueText, { color: "#FF3B30" }]}>-{formatCurrency(calculatedPayroll.stateTax)}</Text></View>
              <View style={styles.itemRow}><Text style={styles.label}>Social Security (6.2%)</Text><Text style={[styles.valueText, { color: "#FF3B30" }]}>-{formatCurrency(calculatedPayroll.socialSecurity)}</Text></View>
              <View style={styles.itemRow}><Text style={styles.label}>Medicare (1.45%)</Text><Text style={[styles.valueText, { color: "#FF3B30" }]}>-{formatCurrency(calculatedPayroll.medicare)}</Text></View>
              <View style={[styles.itemRow, { borderTopWidth: 1, borderColor: "#E5E5EA", paddingTop: 10 }]}><Text style={styles.boldLabel}>Total Deductions</Text><Text style={[styles.boldValue, { color: "#FF3B30" }]}>-{formatCurrency(calculatedPayroll.totalDeductions)}</Text></View>
              <View style={[styles.itemRow, { borderTopWidth: 1, borderColor: "#E5E5EA", paddingTop: 10, marginTop: 4 }]}><Text style={[styles.boldLabel, { fontSize: 17 }]}>Net Pay</Text><Text style={[styles.boldValue, { color: "#34C759", fontSize: 18 }]}>{formatCurrency(calculatedPayroll.netPay)}</Text></View>
            </View>
          </View>
        ) : (
          <View style={[styles.card, { alignItems: "center", padding: 24 }]}>
            <Text style={{ color: "#8E8E93" }}>No time entries found for this month</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollContainer: { padding: 16 },
  header: { marginBottom: 16 },
  title: { fontSize: 24, fontWeight: "bold", color: Colors.surface  },
  subtitle: { fontSize: 13, color: "#8E8E93", marginTop: 2, marginBottom: 14 },
  
  controlsRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center" },
  datePickerContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFF", borderRadius: 10, borderWidth: 1, borderColor: "#E5E5EA" },
  iconBtn: { padding: 8, paddingHorizontal: 12 },
  monthBadge: { paddingHorizontal: 8, justifyContent: "center" },
  monthBadgeText: { fontSize: 14, fontWeight: "600", color: "#000" },
  exportBtn: { flexDirection: "row", backgroundColor: "#007AFF", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, alignItems: "center", marginTop: Platform.OS === "ios" ? 0 : 8 },
  exportText: { color: "#FFF", fontWeight: "600", fontSize: 13 },

  statsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginVertical: 8 },
  statCard: { width: "48%", backgroundColor: "#FFF", borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: "#E5E5EA" },
  statIconHeader: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  statLabel: { fontSize: 11, color: "#8E8E93", marginLeft: 6 },
  statValue: { fontSize: 18, fontWeight: "bold", color: "#000" },

  card: { backgroundColor: "#FFF", borderRadius: 12, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: "#E5E5EA" },
  cardTitle: { fontSize: 16, fontWeight: "bold", color: "#000" },
  divider: { height: 1, backgroundColor: "#E5E5EA", marginVertical: 10 },
  itemRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, alignItems: "center" },
  label: { fontSize: 14, color: "#8E8E93" },
  valueText: { fontSize: 14, fontWeight: "500", color: "#000" },
  boldLabel: { fontSize: 15, fontWeight: "bold", color: "#000" },
  boldValue: { fontSize: 16, fontWeight: "bold" }
});