import React, { useEffect, useState, useMemo } from "react";
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
  StatusBar,
} from "react-native";
import {
  Clock,
  DollarSign,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Download,
  Layers,
} from "lucide-react-native";
import { getEmployeeProfile, apiFetch } from "@/lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";
import { s, wp, hp, fs } from "@/util/styles";

import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as Print from "expo-print";
const { width } = Dimensions.get("window");

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

interface LocalStatCardProps {
  title: string;
  value: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  color: string;
  cardBg: string;
  border: string;
  mutedText: string;
  tintColor: string;
}

function parsePayRate(rate: string): number {
  const match = String(rate).match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : 0;
}

function parseMinutes(hhmm: string): number | null {
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
  const { uiTheme } = useTheme();
  
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [employeeProfile, setEmployeeProfile] = useState<EmployeeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [payrollLoading, setPayrollLoading] = useState(false);

  const isLightTheme = useMemo(() => {
    return uiTheme.theme?.includes("crystal") || uiTheme.panelColors?.dashboardTextColor === "#000000";
  }, [uiTheme]);

  const bg = useMemo(() => uiTheme.panelColors?.dashboardBackground || (isLightTheme ? "#ffffff" : "#09090b"), [uiTheme, isLightTheme]);
  const cardBg = useMemo(() => uiTheme.panelColors?.dashboardCardBackground || (isLightTheme ? "#f8fafc" : "#18181b"), [uiTheme, isLightTheme]);
  const tintColor = useMemo(() => uiTheme.panelColors?.dashboardTextColor || (isLightTheme ? "#0f172a" : "#ffffff"), [uiTheme, isLightTheme]);
  const mutedText = useMemo(() => (isLightTheme ? "#64748b" : "#a1a1aa"), [isLightTheme]);
  const primaryColor = useMemo(() => uiTheme.customColors?.primary || "#133767", [uiTheme]);
  const border = useMemo(() => (isLightTheme ? "rgba(0, 0, 0, 0.08)" : "rgba(255, 255, 255, 0.08)"), [isLightTheme]);

  const loadData = async () => {
    try {
      setLoading(true);
      const profileRes = await getEmployeeProfile();
      setEmployeeProfile(profileRes.item);
    } catch (err) {
      console.error(err);
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
      console.error(err);
    }
  };

  const loadPayrollRecords = async () => {
    try {
      setPayrollLoading(true);
      const year = currentMonth.getFullYear();
      const res = await apiFetch<{ items: PayrollRecord[] }>(
        `/api/employees/me/payroll?year=${year}`
      );
      setPayrollRecords(res.items || []);
    } catch (err) {
      console.error(err);
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

  const handlePrevMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

const handleExportPDF = async () => {
    if (!calculatedPayroll || !employeeProfile) return;

    try {
      const monthName = getMonthName(currentMonth);

      // Clean HTML structure for professional PDF document formatting
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Payroll Summary - ${monthName}</title>
            <style>
              body {
                font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                color: #1f2937;
                padding: 40px;
                margin: 0;
                background-color: #ffffff;
              }
              .header {
                border-bottom: 2px solid #e5e7eb;
                padding-bottom: 20px;
                margin-bottom: 30px;
              }
              h1 {
                font-size: 24px;
                margin: 0 0 5px 0;
                color: #111827;
              }
              .subtitle {
                font-size: 14px;
                color: #6b7280;
                margin: 0;
              }
              .section-title {
                font-size: 16px;
                font-weight: bold;
                color: #374151;
                margin-top: 25px;
                margin-bottom: 10px;
                border-bottom: 1px solid #e5e7eb;
                padding-bottom: 5px;
              }
              .row {
                display: flex;
                justify-content: space-between;
                font-size: 14px;
                padding: 6px 0;
              }
              .row span:last-child {
                font-weight: 600;
              }
              .total-row {
                font-weight: bold;
                font-size: 16px;
                border-top: 2px solid #111827;
                margin-top: 15px;
                padding-top: 10px;
              }
              .net-pay {
                background-color: #ecfdf5;
                border: 1px solid #10b981;
                padding: 15px;
                border-radius: 8px;
                margin-top: 30px;
                display: flex;
                justify-content: space-between;
                align-items: center;
              }
              .net-pay span:first-child {
                font-size: 16px;
                font-weight: bold;
                color: #065f46;
              }
              .net-pay span:last-child {
                font-size: 20px;
                font-weight: bold;
                color: #059669;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Payroll Summary Report</h1>
              <p class="subtitle">Pay Period: ${monthName}</p>
            </div>

            <div class="section-title">Employee Details</div>
            <div class="row"><span>Name:</span><span>${employeeProfile.name || "N/A"}</span></div>
            <div class="row"><span>Email:</span><span>${employeeProfile.email || "N/A"}</span></div>

            <div class="section-title">Worked Hours</div>
            <div class="row"><span>Total Hours:</span><span>${calculatedPayroll.totalHours.toFixed(2)} hrs</span></div>
            <div class="row"><span>Regular Hours:</span><span>${calculatedPayroll.regularHours.toFixed(2)} hrs</span></div>
            <div class="row"><span>Overtime Hours:</span><span>${calculatedPayroll.overtimeHours.toFixed(2)} hrs</span></div>

            <div class="section-title">Earnings Breakdown</div>
            <div class="row"><span>Pay Type:</span><span>${calculatedPayroll.isMonthly ? "Monthly Salary" : "Hourly Wage"}</span></div>
            <div class="row"><span>Hourly Rate:</span><span>${formatCurrency(calculatedPayroll.hourlyRate)}/hr</span></div>
            ${calculatedPayroll.isMonthly ? `<div class="row"><span>Monthly Salary:</span><span>${formatCurrency(calculatedPayroll.monthlySalary)}</span></div>` : ""}
            <div class="row"><span>Regular Pay:</span><span>${formatCurrency(calculatedPayroll.regularPay)}</span></div>
            ${calculatedPayroll.overtimePay > 0 ? `<div class="row"><span>Overtime Pay (1.5x):</span><span>${formatCurrency(calculatedPayroll.overtimePay)}</span></div>` : ""}
            <div class="row total-row"><span>Gross Pay:</span><span>${formatCurrency(calculatedPayroll.totalPay)}</span></div>

            <div class="section-title">Tax Deductions</div>
            <div class="row"><span>Federal Tax (12%):</span><span style="color: #dc2626;">-${formatCurrency(calculatedPayroll.federalTax)}</span></div>
            <div class="row"><span>State Tax (5%):</span><span style="color: #dc2626;">-${formatCurrency(calculatedPayroll.stateTax)}</span></div>
            <div class="row"><span>Social Security (6.2%):</span><span style="color: #dc2626;">-${formatCurrency(calculatedPayroll.socialSecurity)}</span></div>
            <div class="row"><span>Medicare (1.45%):</span><span style="color: #dc2626;">-${formatCurrency(calculatedPayroll.medicare)}</span></div>
            <div class="row total-row"><span>Total Deductions:</span><span style="color: #dc2626;">-${formatCurrency(calculatedPayroll.totalDeductions)}</span></div>

            <div class="net-pay">
              <span>Net Take-Home Pay</span>
              <span>${formatCurrency(calculatedPayroll.netPay)}</span>
            </div>
          </body>
        </html>
      `;

      // Compile HTML into a real PDF file using expo-print
      const { uri } = await Print.printToFileAsync({ html: htmlContent });

      // Trigger native share/save sheet specifying PDF mime type
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: `Payroll Summary - ${monthName}`,
          UTI: "com.adobe.pdf",
        });
      } else {
        Alert.alert("Success", `PDF successfully generated at: ${uri}`);
      }
    } catch (error: any) {
      console.error("Export PDF Error:", error);
      Alert.alert("Export Error", error?.message || "Failed to generate PDF document.");
    }
  };
  const handleDownloadStub = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Error", "Unable to open document link on this device.");
      }
    } catch {
      Alert.alert("Error", "An unexpected error occurred opening the document.");
    }
  };

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
      <View style={s([styles.centerFallback, { backgroundColor: bg }])}>
        <ActivityIndicator size="large" color={primaryColor} />
        <Text style={s([styles.fallbackText, { color: mutedText }])}>Loading payroll summary...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={s([styles.safeContainer, { backgroundColor: bg }])}>
      <StatusBar barStyle={isLightTheme ? "dark-content" : "light-content"} backgroundColor={bg} />
      <ScrollView contentContainerStyle={s(styles.scrollWrapper)} showsVerticalScrollIndicator={false}>
        
        <View style={s(styles.headerRow)}>
          <View>
            <Text style={s([styles.headerTitle, { color: tintColor }])}>My Payroll</Text>
            <Text style={s([styles.headerSubtitle, { color: mutedText }])}>Track your earnings and hours</Text>
          </View>
        </View>

        <View style={s([styles.controllerBarContainer, { backgroundColor: cardBg, borderColor: border }])}>
          <View style={s(styles.navigationControlBox)}>
            <TouchableOpacity style={s([styles.navIconTouchElement, { backgroundColor: bg }])} onPress={handlePrevMonth}>
              <ChevronLeft size={fs(5)} color={tintColor} />
            </TouchableOpacity>
            <View style={s(styles.monthBadgeWrapper)}>
              <Text style={s([styles.monthBadgeText, { color: tintColor }])}>{getMonthName(currentMonth)}</Text>
            </View>
            <TouchableOpacity style={s([styles.navIconTouchElement, { backgroundColor: bg }])} onPress={handleNextMonth}>
              <ChevronRight size={fs(5)} color={tintColor} />
            </TouchableOpacity>
          </View>

          {calculatedPayroll && (
            <TouchableOpacity style={s([styles.exportFileTouchBtn, { backgroundColor: primaryColor }])} onPress={handleExportPDF}>
              <Download size={fs(3.8)} color="#FFFFFF" />
              <Text style={s(styles.exportFileTouchBtnText)}>Export PDF</Text>
            </TouchableOpacity>
          )}
        </View>

        {calculatedPayroll && (
          <View style={s(styles.metricsGridFlexWrap)}>
            <LocalStatCard title="TOTAL HOURS" value={formatHours(calculatedPayroll.totalHours)} icon={Clock} color={primaryColor} cardBg={cardBg} border={border} mutedText={mutedText} tintColor={tintColor} />
            <LocalStatCard title="REGULAR HOURS" value={formatHours(calculatedPayroll.regularHours)} icon={TrendingUp} color="rgb(34, 197, 94)" cardBg={cardBg} border={border} mutedText={mutedText} tintColor={tintColor} />
            <LocalStatCard title="OVERTIME HOURS" value={formatHours(calculatedPayroll.overtimeHours)} icon={Clock} color="rgb(234, 179, 8)" cardBg={cardBg} border={border} mutedText={mutedText} tintColor={tintColor} />
            <LocalStatCard title="TOTAL PAY" value={formatCurrency(calculatedPayroll.totalPay)} icon={DollarSign} color="rgb(34, 197, 94)" cardBg={cardBg} border={border} mutedText={mutedText} tintColor={tintColor} />
          </View>
        )}

        {calculatedPayroll ? (
          <View style={s({ gap: hp(2) })}>
            
            <View style={s([styles.uiSurfaceCardStructure, { backgroundColor: cardBg, borderColor: border }])}>
              <Text style={s([styles.cardHeaderTitleText, { color: tintColor }])}>Pay Breakdown</Text>
              <View style={s(styles.cardContentMetricsSplitList)}>
                <View style={s(styles.lineMetricDataRow)}>
                  <Text style={s([styles.labelMetricKey, { color: mutedText }])}>Pay Type</Text>
                  <View style={s([styles.inlineStaticBadge, { backgroundColor: primaryColor }])}>
                    <Text style={s(styles.inlineStaticBadgeText)}>{calculatedPayroll.isMonthly ? "Monthly" : "Hourly"}</Text>
                  </View>
                </View>
                <View style={s(styles.lineMetricDataRow)}>
                  <Text style={s([styles.labelMetricKey, { color: mutedText }])}>Hourly Rate</Text>
                  <Text style={s([styles.valueMetricValueText, { color: tintColor }])}>{formatCurrency(calculatedPayroll.hourlyRate)}/hr</Text>
                </View>
                {calculatedPayroll.isMonthly && (
                  <View style={s(styles.lineMetricDataRow)}>
                    <Text style={s([styles.labelMetricKey, { color: mutedText }])}>Monthly Salary</Text>
                    <Text style={s([styles.valueMetricValueText, { color: tintColor }])}>{formatCurrency(calculatedPayroll.monthlySalary)}</Text>
                  </View>
                )}
                <View style={s(styles.lineMetricDataRow)}>
                  <Text style={s([styles.labelMetricKey, { color: mutedText }])}>Regular Pay</Text>
                  <Text style={s([styles.valueMetricValueText, { color: tintColor }])}>{formatCurrency(calculatedPayroll.regularPay)}</Text>
                </View>
                {calculatedPayroll.overtimePay > 0 && (
                  <View style={s(styles.lineMetricDataRow)}>
                    <Text style={s([styles.labelMetricKey, { color: mutedText }])}>Overtime Pay (1.5x)</Text>
                    <Text style={s([styles.valueMetricValueText, { color: "rgb(234, 179, 8)" }])}>{formatCurrency(calculatedPayroll.overtimePay)}</Text>
                  </View>
                )}
                <View style={s([styles.lineMetricDataRow, styles.topDividerBorderLine, { borderColor: border }])}>
                  <Text style={s([styles.boldLabelTotalStyle, { color: tintColor }])}>Total Gross Pay</Text>
                  <Text style={s([styles.boldValueTotalStyle, { color: "rgb(34, 197, 94)" }])}>{formatCurrency(calculatedPayroll.totalPay)}</Text>
                </View>
              </View>
            </View>

            <View style={s([styles.uiSurfaceCardStructure, { backgroundColor: cardBg, borderColor: border }])}>
              <Text style={s([styles.cardHeaderTitleText, { color: tintColor }])}>Tax Deductions</Text>
              <View style={s(styles.cardContentMetricsSplitList)}>
                <View style={s(styles.lineMetricDataRow)}>
                  <Text style={s([styles.labelMetricKey, { color: mutedText }])}>Federal Tax (12%)</Text>
                  <Text style={s([styles.valueMetricValueText, { color: "rgb(239, 68, 68)" }])}>-{formatCurrency(calculatedPayroll.federalTax)}</Text>
                </View>
                <View style={s(styles.lineMetricDataRow)}>
                  <Text style={s([styles.labelMetricKey, { color: mutedText }])}>State Tax (5%)</Text>
                  <Text style={s([styles.valueMetricValueText, { color: "rgb(239, 68, 68)" }])}>-{formatCurrency(calculatedPayroll.stateTax)}</Text>
                </View>
                <View style={s(styles.lineMetricDataRow)}>
                  <Text style={s([styles.labelMetricKey, { color: mutedText }])}>Social Security (6.2%)</Text>
                  <Text style={s([styles.valueMetricValueText, { color: "rgb(239, 68, 68)" }])}>-{formatCurrency(calculatedPayroll.socialSecurity)}</Text>
                </View>
                <View style={s(styles.lineMetricDataRow)}>
                  <Text style={s([styles.labelMetricKey, { color: mutedText }])}>Medicare (1.45%)</Text>
                  <Text style={s([styles.valueMetricValueText, { color: "rgb(239, 68, 68)" }])}>-{formatCurrency(calculatedPayroll.medicare)}</Text>
                </View>
                <View style={s([styles.lineMetricDataRow, styles.topDividerBorderLine, { borderColor: border }])}>
                  <Text style={s([styles.boldLabelTotalStyle, { color: tintColor }])}>Total Deductions</Text>
                  <Text style={s([styles.boldValueTotalStyle, { color: "rgb(239, 68, 68)" }])}>{formatCurrency(calculatedPayroll.totalDeductions)}</Text>
                </View>
                <View style={s([styles.lineMetricDataRow, styles.topDividerBorderLine, { paddingTop: hp(1.2), borderColor: border }])}>
                  <Text style={s([styles.boldLabelTotalStyle, { fontSize: fs(4), color: tintColor }])}>Net Take-Home Pay</Text>
                  <Text style={s([styles.boldValueTotalStyle, { color: "rgb(34, 197, 94)", fontSize: fs(4.5) }])}>{formatCurrency(calculatedPayroll.netPay)}</Text>
                </View>
              </View>
            </View>

          </View>
        ) : (
          <View style={s([styles.fallbackNullCardContainer, { backgroundColor: cardBg, borderColor: border }])}>
            <Layers size={fs(8)} color={mutedText} />
            <Text style={s([styles.fallbackNullCardText, { color: mutedText }])}>No activity logged within this timeframe.</Text>
          </View>
        )}

        <View style={s([styles.uiSurfaceCardStructure, { marginTop: hp(2), backgroundColor: cardBg, borderColor: border }])}>
          <Text style={s([styles.cardHeaderTitleText, { color: tintColor }])}>Pay History Log</Text>
          
          {payrollLoading ? (
            <ActivityIndicator size="small" color={primaryColor} style={s({ marginVertical: hp(2.5) })} />
          ) : payrollRecords.length === 0 ? (
            <Text style={s([styles.emptyHistoryLogMessage, { color: mutedText }])}>No documents found for the year {currentMonth.getFullYear()}</Text>
          ) : (
            <View style={s(styles.historyLogLayoutStack)}>
              {payrollRecords.map((record) => (
                <View key={record.id} style={s([styles.historyLogItemBoxRow, { backgroundColor: bg, borderColor: border }])}>
                  <View style={s({ flex: 1 })}>
                    <Text style={s([styles.historyItemPeriodTitleText, { color: tintColor }])}>{record.payPeriod}</Text>
                    <View style={s(styles.historySubMetricsStack)}>
                      <Text style={s([styles.historyInlineMiniLabel, { color: mutedText }])}>Gross: {formatCurrency(record.gross)}  •  Taxes: {formatCurrency(record.taxes)}</Text>
                      <Text style={s([styles.historyInlineMiniLabel, { color: "rgb(34, 197, 94)", fontWeight: "700" }])}>Net Income: {formatCurrency(record.net)}</Text>
                    </View>
                  </View>
                  
                  {record.pdfUrl ? (
                    <TouchableOpacity style={s([styles.stubDownloadTouchBtn, { backgroundColor: cardBg, borderColor: border }])} onPress={() => handleDownloadStub(record.pdfUrl)}>
                      <Download size={fs(3.5)} color={tintColor} />
                      <Text style={s([styles.stubDownloadTouchBtnText, { color: tintColor }])}>Stub</Text>
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

function LocalStatCard({ title, value, icon: Icon, color, cardBg, border, mutedText, tintColor }: LocalStatCardProps) {
  return (
    <View style={s([styles.statBoxContainer, { backgroundColor: cardBg, borderColor: border }])}>
      <View style={s(styles.statHeaderRowLine)}>
        <Text style={s([styles.statHeaderTitleText, { color: mutedText }])} numberOfLines={1}>{title}</Text>
        <Icon size={fs(3.5)} color={color} />
      </View>
      <Text style={s([styles.statPrimaryValueDisplay, { color: tintColor }])}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
  },
  scrollWrapper: {
    paddingHorizontal: wp(4),
    paddingTop: hp(2),
    paddingBottom: hp(5),
  },
  centerFallback: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: hp(1.5),
  },
  fallbackText: {
    fontSize: fs(3.5),
  },
  headerRow: {
    marginBottom: hp(2),
  },
  headerTitle: {
    fontSize: fs(5.5),
    fontWeight: "800",
  },
  headerSubtitle: {
    fontSize: fs(3.2),
    marginTop: hp(0.3),
  },
  controllerBarContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: wp(2.5),
    padding: wp(2),
    marginBottom: hp(2),
  },
  navigationControlBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp(1),
  },
  navIconTouchElement: {
    padding: wp(1.5),
    borderRadius: wp(1.5),
  },
  monthBadgeWrapper: {
    paddingHorizontal: wp(3),
    justifyContent: "center",
  },
  monthBadgeText: {
    fontSize: fs(3.2),
    fontWeight: "700",
  },
  exportFileTouchBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.9),
    borderRadius: wp(1.5),
    gap: wp(1.5),
  },
  exportFileTouchBtnText: {
    color: "#FFFFFF",
    fontSize: fs(3),
    fontWeight: "700",
  },
  metricsGridFlexWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: wp(2.5),
    marginBottom: hp(2),
  },
  statBoxContainer: {
    width: wp(43),
    borderWidth: 1,
    borderRadius: wp(3),
    padding: wp(3),
  },
  statHeaderRowLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: hp(0.8),
  },
  statHeaderTitleText: {
    fontSize: fs(2.5),
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  statPrimaryValueDisplay: {
    fontSize: fs(4),
    fontWeight: "800",
  },
  uiSurfaceCardStructure: {
    borderWidth: 1,
    borderRadius: wp(3.5),
    padding: wp(4),
  },
  cardHeaderTitleText: {
    fontSize: fs(3.8),
    fontWeight: "700",
    marginBottom: hp(1.8),
  },
  cardContentMetricsSplitList: {
    gap: hp(1.2),
  },
  lineMetricDataRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  labelMetricKey: {
    fontSize: fs(3.2),
  },
  valueMetricValueText: {
    fontSize: fs(3.2),
    fontWeight: "600",
  },
  inlineStaticBadge: {
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.4),
    borderRadius: wp(1.5),
  },
  inlineStaticBadgeText: {
    fontSize: fs(2.5),
    fontWeight: "700",
    color: "#FFFFFF",
  },
  topDividerBorderLine: {
    borderTopWidth: 1,
    paddingTop: hp(1.5),
    marginTop: hp(0.5),
  },
  boldLabelTotalStyle: {
    fontSize: fs(3.5),
    fontWeight: "700",
  },
  boldValueTotalStyle: {
    fontSize: fs(3.8),
    fontWeight: "800",
  },
  fallbackNullCardContainer: {
    borderWidth: 1,
    borderRadius: wp(3.5),
    padding: wp(8),
    alignItems: "center",
    justifyContent: "center",
    gap: hp(1.2),
  },
  fallbackNullCardText: {
    fontSize: fs(3.2),
    textAlign: "center",
  },
  emptyHistoryLogMessage: {
    fontSize: fs(3.2),
    fontStyle: "italic",
    textAlign: "center",
    marginVertical: hp(1.5),
  },
  historyLogLayoutStack: {
    gap: hp(1.2),
  },
  historyLogItemBoxRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: wp(2.5),
    padding: wp(3),
  },
  historyItemPeriodTitleText: {
    fontSize: fs(3.2),
    fontWeight: "700",
  },
  historySubMetricsStack: {
    marginTop: hp(0.5),
    gap: hp(0.3),
  },
  historyInlineMiniLabel: {
    fontSize: fs(3),
  },
  stubDownloadTouchBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp(1),
    borderWidth: 1,
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.8),
    borderRadius: wp(1.5),
  },
  stubDownloadTouchBtnText: {
    fontSize: fs(2.8),
    fontWeight: "700",
  },
});