import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Linking,
  Alert,
  Dimensions,
} from "react-native";

// Native Dark Vector Icons
import {
  Clock,
  DollarSign,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Download,
  Layers,
} from "lucide-react-native";

// Importing your mobile API utilities
import { getEmployeeProfile, apiFetch } from "@/lib/admin/apiClient";

// --- Type Safety Blueprints ---
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
  phone?: string;
  company?: string;
  location?: string;
  status?: string;
  payType?: "hourly" | "monthly" | string;
  payRate?: string;
  [key: string]: any;
}

interface PayrollRecord {
  id: string;
  payPeriod: string;
  gross: number;
  net: number;
  taxes: number;
  deductions: number;
  pdfUrl: string;
}

// --- Premium Dark Mode Theme Variables ---
const THEME = {
  bgCanvas: "#0B0F19",
  bgSurface: "#161D30",
  bgCard: "#1F2A45",
  border: "#2A3958",
  textPrimary: "#F3F4F6",
  textSecondary: "#9CA3AF",
  textMuted: "#6B7280",
  primary: "#3B82F6",
  accent: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
};

// --- Mathematical Calculation & Parsing Helpers ---
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

export default function EmployeePayroll() {
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [employeeProfile, setEmployeeProfile] = useState<EmployeeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [payrollLoading, setPayrollLoading] = useState(false);

  // --- Initial Profile Data Fetch ---
  const loadData = async () => {
    try {
      setLoading(true);
      const profileRes = await getEmployeeProfile();
      setEmployeeProfile(profileRes.item);
    } catch (err) {
      console.error("Failed to load employee profile engine data:", err);
    } finally {
      setLoading(false);
    }
  };

  // --- Time-Entry History Synchronizer ---
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
      console.error("Failed to match clock entry matrix arrays:", err);
    }
  };

  // --- Historical Payroll Stubs Data Pipeline ---
  const loadPayrollRecords = async () => {
    try {
      setPayrollLoading(true);
      const year = currentMonth.getFullYear();
      const res = await apiFetch<{ items: PayrollRecord[] }>(
        `/api/employees/me/payroll?year=${year}`
      );
      setPayrollRecords(res.items || []);
    } catch (err) {
      console.error("Failed to download payload histories:", err);
      setPayrollRecords([]);
    } finally {
      setPayrollLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (employeeProfile) {
      loadTimeEntries();
      loadPayrollRecords();
    }
  }, [employeeProfile, currentMonth]);

  // --- Safe Native Immutable Month Shifters ---
  const handlePrevMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // --- Web-To-Native Action Adapters ---
  const handleExportPDF = () => {
    Alert.alert("Export Initialized", "Generating payroll summary file report sheets...");
  };

  const handleDownloadStub = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Error", "Cannot resolve URL path link inside this device terminal.");
      }
    } catch {
      Alert.alert("Error", "An error occurred while tracking this PDF stub reference.");
    }
  };

  // --- Reactive Matrix Payroll Processor ---
  const calculatedPayroll = useMemo(() => {
    if (!employeeProfile) return null;

    const totalHours = timeEntries.reduce((sum, entry) => {
      return sum + calcHoursWorked(entry.clockIn, entry.clockOut);
    }, 0);

    const isMonthly = employeeProfile.payType === "monthly";
    const payRateValue = parsePayRate(employeeProfile.payRate || "0");

    let regularHours = 0;
    let overtimeHours = 0;
    let regularPay = 0;
    let overtimePay = 0;
    let totalPay = 0;
    let hourlyRate = 0;
    let monthlySalary = 0;

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
      totalHours,
      regularHours,
      overtimeHours,
      regularPay,
      overtimePay,
      totalPay,
      hourlyRate,
      isMonthly,
      monthlySalary,
      federalTax,
      stateTax,
      socialSecurity,
      medicare,
      totalDeductions,
      netPay,
    };
  }, [employeeProfile, timeEntries]);

  if (loading) {
    return (
      <View style={styles.centerFallback}>
        <ActivityIndicator size="large" color={THEME.primary} />
        <Text style={styles.fallbackTextText}>Loading structural payroll sheets...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeContainer}>
      <ScrollView contentContainerStyle={styles.scrollWrapper}>
        
        {/* --- Top Layout Header Panel --- */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>My Payroll</Text>
            <Text style={styles.headerSubtitle}>Track your earnings and hours</Text>
          </View>
        </View>

        {/* --- Time Controller / Action Pagination Strip --- */}
        <View style={styles.controllerBarContainer}>
          <View style={styles.navigationControlBox}>
            <TouchableOpacity style={styles.navIconTouchElement} onPress={handlePrevMonth}>
              <ChevronLeft size={20} color={THEME.textPrimary} />
            </TouchableOpacity>
            <View style={styles.monthBadgeWrapper}>
              <Text style={styles.monthBadgeText}>{getMonthName(currentMonth)}</Text>
            </View>
            <TouchableOpacity style={styles.navIconTouchElement} onPress={handleNextMonth}>
              <ChevronRight size={20} color={THEME.textPrimary} />
            </TouchableOpacity>
          </View>

          {calculatedPayroll && (
            <TouchableOpacity style={styles.exportFileTouchBtn} onPress={handleExportPDF}>
              <Download size={15} color="#FFF" />
              <Text style={styles.exportFileTouchBtnText}>Export PDF</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* --- Summary Analytic Cards Row --- */}
        {calculatedPayroll && (
          <View style={styles.metricsGridFlexWrap}>
            <LocalStatCard title="TOTAL HOURS" value={formatHours(calculatedPayroll.totalHours)} icon={Clock} color={THEME.primary} />
            <LocalStatCard title="REGULAR HOURS" value={formatHours(calculatedPayroll.regularHours)} icon={TrendingUp} color={THEME.accent} />
            <LocalStatCard title="OVERTIME HOURS" value={formatHours(calculatedPayroll.overtimeHours)} icon={Clock} color={THEME.warning} />
            <LocalStatCard title="TOTAL PAY" value={formatCurrency(calculatedPayroll.totalPay)} icon={DollarSign} color={THEME.accent} />
          </View>
        )}

        {/* --- Content Cards Breakdown --- */}
        {calculatedPayroll ? (
          <View style={{ gap: 16 }}>
            
            {/* Pay Metric Rates Calculations Card */}
            <View style={styles.uiSurfaceCardStructure}>
              <Text style={styles.cardHeaderTitleText}>Pay Breakdown</Text>
              <View style={styles.cardContentMetricsSplitList}>
                <View style={styles.lineMetricDataRow}>
                  <Text style={styles.labelMetricKey}>Pay Type</Text>
                  <View style={[styles.inlineStaticBadge, { backgroundColor: calculatedPayroll.isMonthly ? THEME.primary : THEME.border }]}>
                    <Text style={styles.inlineStaticBadgeText}>{calculatedPayroll.isMonthly ? "Monthly" : "Hourly"}</Text>
                  </View>
                </View>
                <View style={styles.lineMetricDataRow}>
                  <Text style={styles.labelMetricKey}>Hourly Rate</Text>
                  <Text style={styles.valueMetricValueText}>{formatCurrency(calculatedPayroll.hourlyRate)}/hr</Text>
                </View>
                {calculatedPayroll.isMonthly && (
                  <View style={styles.lineMetricDataRow}>
                    <Text style={styles.labelMetricKey}>Monthly Salary</Text>
                    <Text style={styles.valueMetricValueText}>{formatCurrency(calculatedPayroll.monthlySalary)}</Text>
                  </View>
                )}
                <View style={styles.lineMetricDataRow}>
                  <Text style={styles.labelMetricKey}>Regular Pay</Text>
                  <Text style={styles.valueMetricValueText}>{formatCurrency(calculatedPayroll.regularPay)}</Text>
                </View>
                {calculatedPayroll.overtimePay > 0 && (
                  <View style={styles.lineMetricDataRow}>
                    <Text style={styles.labelMetricKey}>Overtime Pay (1.5x)</Text>
                    <Text style={[styles.valueMetricValueText, { color: THEME.warning }]}>{formatCurrency(calculatedPayroll.overtimePay)}</Text>
                  </View>
                )}
                <View style={[styles.lineMetricDataRow, styles.topDividerBorderLine]}>
                  <Text style={styles.boldLabelTotalStyle}>Total Gross Pay</Text>
                  <Text style={[styles.boldValueTotalStyle, { color: THEME.accent }]}>{formatCurrency(calculatedPayroll.totalPay)}</Text>
                </View>
              </View>
            </View>

            {/* Comprehensive Tax Deductions Card */}
            <View style={styles.uiSurfaceCardStructure}>
              <Text style={styles.cardHeaderTitleText}>Tax Deductions</Text>
              <View style={styles.cardContentMetricsSplitList}>
                <View style={styles.lineMetricDataRow}>
                  <Text style={styles.labelMetricKey}>Federal Tax (12%)</Text>
                  <Text style={[styles.valueMetricValueText, { color: THEME.danger }]}>-{formatCurrency(calculatedPayroll.federalTax)}</Text>
                </View>
                <View style={styles.lineMetricDataRow}>
                  <Text style={styles.labelMetricKey}>State Tax (5%)</Text>
                  <Text style={[styles.valueMetricValueText, { color: THEME.danger }]}>-{formatCurrency(calculatedPayroll.stateTax)}</Text>
                </View>
                <View style={styles.lineMetricDataRow}>
                  <Text style={styles.labelMetricKey}>Social Security (6.2%)</Text>
                  <Text style={[styles.valueMetricValueText, { color: THEME.danger }]}>-{formatCurrency(calculatedPayroll.socialSecurity)}</Text>
                </View>
                <View style={styles.lineMetricDataRow}>
                  <Text style={styles.labelMetricKey}>Medicare (1.45%)</Text>
                  <Text style={[styles.valueMetricValueText, { color: THEME.danger }]}>-{formatCurrency(calculatedPayroll.medicare)}</Text>
                </View>
                <View style={[styles.lineMetricDataRow, styles.topDividerBorderLine]}>
                  <Text style={styles.boldLabelTotalStyle}>Total Deductions</Text>
                  <Text style={[styles.boldValueTotalStyle, { color: THEME.danger }]}>{formatCurrency(calculatedPayroll.totalDeductions)}</Text>
                </View>
                <View style={[styles.lineMetricDataRow, styles.topDividerBorderLine, { paddingTop: 10 }]}>
                  <Text style={[styles.boldLabelTotalStyle, { fontSize: 16 }]}>Net Take-Home Pay</Text>
                  <Text style={[styles.boldValueTotalStyle, { color: THEME.accent, fontSize: 18 }]}>{formatCurrency(calculatedPayroll.netPay)}</Text>
                </View>
              </View>
            </View>

          </View>
        ) : (
          <View style={styles.fallbackNullCardContainer}>
            <Layers size={32} color={THEME.textMuted} />
            <Text style={styles.fallbackNullCardText}>No logs submitted inside this monthly query index range.</Text>
          </View>
        )}

        {/* --- Historical Ledger Feed System --- */}
        <View style={[styles.uiSurfaceCardStructure, { marginTop: 16 }]}>
          <Text style={styles.cardHeaderTitleText}>Pay History Log</Text>
          
          {payrollLoading ? (
            <ActivityIndicator size="small" color={THEME.primary} style={{ marginVertical: 20 }} />
          ) : payrollRecords.length === 0 ? (
            <Text style={styles.emptyHistoryLogMessage}>No documentation logs returned for the year {currentMonth.getFullYear()}</Text>
          ) : (
            <View style={styles.historyLogLayoutStack}>
              {payrollRecords.map((record) => (
                <View key={record.id} style={styles.historyLogItemBoxRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.historyItemPeriodTitleText}>{record.payPeriod}</Text>
                    <View style={styles.historySubMetricsStack}>
                      <Text style={styles.historyInlineMiniLabel}>Gross: {formatCurrency(record.gross)}  •  Taxes: {formatCurrency(record.taxes)}</Text>
                      <Text style={[styles.historyInlineMiniLabel, { color: THEME.accent, fontWeight: "700" }]}>Net Income: {formatCurrency(record.net)}</Text>
                    </View>
                  </View>
                  
                  {record.pdfUrl ? (
                    <TouchableOpacity style={styles.stubDownloadTouchBtn} onPress={() => handleDownloadStub(record.pdfUrl)}>
                      <Download size={14} color={THEME.textPrimary} />
                      <Text style={styles.stubDownloadTouchBtnText}>Stub</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ))}
            </View>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// --- Localized Isolated Stat Card Core Design ---
function LocalStatCard({ title, value, icon: Icon, color }: { title: string; value: string; icon: any; color: string }) {
  return (
    <View style={styles.statBoxContainer}>
      <View style={styles.statHeaderRowLine}>
        <Text style={styles.statHeaderTitleText} numberOfLines={1}>{title}</Text>
        <Icon size={14} color={color} />
      </View>
      <Text style={styles.statPrimaryValueDisplay}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: THEME.bgCanvas,
  },
  scrollWrapper: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  centerFallback: {
    flex: 1,
    backgroundColor: THEME.bgCanvas,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  fallbackTextText: {
    color: THEME.textSecondary,
    fontSize: 14,
  },
  headerRow: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: THEME.textPrimary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: THEME.textMuted,
    marginTop: 2,
  },
  controllerBarContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: THEME.bgSurface,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 10,
    padding: 8,
    marginBottom: 16,
  },
  navigationControlBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  navIconTouchElement: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: THEME.bgCard,
  },
  monthBadgeWrapper: {
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  monthBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: THEME.textPrimary,
  },
  exportFileTouchBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    gap: 6,
  },
  exportFileTouchBtnText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "700",
  },
  metricsGridFlexWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  statBoxContainer: {
    width: (Dimensions.get("window").width - 42) / 2,
    backgroundColor: THEME.bgSurface,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 12,
    padding: 12,
  },
  statHeaderRowLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  statHeaderTitleText: {
    fontSize: 10,
    fontWeight: "700",
    color: THEME.textMuted,
    letterSpacing: 0.5,
  },
  statPrimaryValueDisplay: {
    fontSize: 16,
    fontWeight: "800",
    color: THEME.textPrimary,
  },
  uiSurfaceCardStructure: {
    backgroundColor: THEME.bgSurface,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 14,
    padding: 16,
  },
  cardHeaderTitleText: {
    fontSize: 15,
    fontWeight: "700",
    color: THEME.textPrimary,
    marginBottom: 14,
  },
  cardContentMetricsSplitList: {
    gap: 10,
  },
  lineMetricDataRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  labelMetricKey: {
    fontSize: 13,
    color: THEME.textSecondary,
  },
  valueMetricValueText: {
    fontSize: 13,
    fontWeight: "600",
    color: THEME.textPrimary,
  },
  inlineStaticBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  inlineStaticBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFF",
  },
  topDividerBorderLine: {
    borderTopWidth: 1,
    borderColor: THEME.border,
    paddingTop: 12,
    marginTop: 4,
  },
  boldLabelTotalStyle: {
    fontSize: 14,
    fontWeight: "700",
    color: THEME.textPrimary,
  },
  boldValueTotalStyle: {
    fontSize: 15,
    fontWeight: "800",
  },
  fallbackNullCardContainer: {
    backgroundColor: THEME.bgSurface,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 14,
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  fallbackNullCardText: {
    color: THEME.textMuted,
    fontSize: 13,
    textAlign: "center",
  },
  emptyHistoryLogMessage: {
    color: THEME.textMuted,
    fontSize: 13,
    fontStyle: "italic",
    textAlign: "center",
    marginVertical: 12,
  },
  historyLogLayoutStack: {
    gap: 10,
  },
  historyLogItemBoxRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.bgCard,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 10,
    padding: 12,
  },
  historyItemPeriodTitleText: {
    fontSize: 13,
    fontWeight: "700",
    color: THEME.textPrimary,
  },
  historySubMetricsStack: {
    marginTop: 4,
    gap: 2,
  },
  historyInlineMiniLabel: {
    fontSize: 12,
    color: THEME.textSecondary,
  },
  stubDownloadTouchBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: THEME.border,
    backgroundColor: THEME.bgSurface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  stubDownloadTouchBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: THEME.textPrimary,
  },
});