import React, { useEffect, useState, useMemo } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Clock, DollarSign, TrendingUp, ChevronLeft, ChevronRight, Download } from "lucide-react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { apiFetch } from "@/lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";
import { s } from "@/util/styles";
import { isDarkTheme } from "@/constants/design/presets";

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

function buildColors(uiTheme: any) {
  const isDark = isDarkTheme(uiTheme?.theme);
  return {
    background:      uiTheme.panelColors?.dashboardBackground     || (isDark ? "#09090b" : "#ffffff"),
    panelHeader:     uiTheme.panelColors?.dashboardCardBackground || (isDark ? "#141517" : "#f8fafc"),
    cardBg:          uiTheme.panelColors?.dashboardCardBackground || (isDark ? "#141517" : "#f8fafc"),
    text:            uiTheme.panelColors?.dashboardTextColor      || (isDark ? "#f8fafc" : "#000000"),
    textSecondary:   isDark ? "#94a3b8" : "#475569",
    border:          isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)",
    primary:         uiTheme.customColors?.primary                || "#3b82f6",
    success:         "#16C784",
    warning:         "#F59E0B",
    danger:          "#EF4444",
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
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    center: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.background,
      padding: wp(6),
    },
    responsiveContentWrapper: {
      flex: 1,
      width: "100%",
      maxWidth: 768,
      alignSelf: "center",
    },
    scrollContainer: {
      padding: horizontalPadding,
      paddingBottom: hp(5),
    },
    header: {
      marginBottom: hp(2),
    },
    title: {
      fontSize: isSmallScreen ? wp(5) : isTablet ? wp(5.5) : wp(6),
      fontWeight: "900",
      color: colors.text,
    },
    subtitle: {
      fontSize: isSmallScreen ? wp(3) : wp(3.3),
      color: colors.textSecondary,
      marginTop: hp(0.25),
      marginBottom: hp(1.7),
    },
    controlsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      alignItems: "center",
      gap: wp(2.5),
    },
    datePickerContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.cardBg,
      borderRadius: wp(2.5),
      borderWidth: 1,
      borderColor: colors.border,
    },
    iconBtn: {
      padding: wp(2),
      paddingHorizontal: wp(3),
    },
    monthBadge: {
      paddingHorizontal: wp(2),
      justifyContent: "center",
    },
    monthBadgeText: {
      fontSize: wp(3.5),
      fontWeight: "700",
      color: colors.text,
    },
    exportBtn: {
      flexDirection: "row",
      backgroundColor: colors.primary,
      paddingHorizontal: wp(3.5),
      paddingVertical: hp(1),
      borderRadius: wp(2.5),
      alignItems: "center",
      marginTop: Platform.OS === "ios" ? 0 : hp(0.5),
    },
    exportText: {
      color: "#ffffff",
      fontWeight: "700",
      fontSize: wp(3.3),
    },
    statsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      marginVertical: hp(1),
      gap: wp(2.5),
    },
    statCard: {
      flex: 1,
      minWidth: isTablet ? "22%" : "47%",
      backgroundColor: colors.cardBg,
      borderRadius: wp(3),
      padding: wp(3.2),
      marginBottom: hp(1),
      borderWidth: 1,
      borderColor: colors.border,
    },
    statIconHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: hp(0.75),
    },
    statLabel: {
      fontSize: wp(2.8),
      color: colors.textSecondary,
      marginLeft: wp(1.5),
      fontWeight: "600",
    },
    statValue: {
      fontSize: isSmallScreen ? wp(4) : wp(4.5),
      fontWeight: "800",
      color: colors.text,
    },
    card: {
      backgroundColor: colors.cardBg,
      borderRadius: wp(3),
      padding: wp(4),
      marginBottom: hp(1.7),
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardTitle: {
      fontSize: wp(4),
      fontWeight: "800",
      color: colors.text,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: hp(1.2),
    },
    itemRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: hp(0.75),
      alignItems: "center",
    },
    label: {
      fontSize: wp(3.5),
      color: colors.textSecondary,
    },
    valueText: {
      fontSize: wp(3.5),
      fontWeight: "600",
      color: colors.text,
    },
    boldLabel: {
      fontSize: wp(3.8),
      fontWeight: "800",
      color: colors.text,
    },
    boldValue: {
      fontSize: wp(4),
      fontWeight: "800",
    },
    emptyStateText: {
      color: colors.textSecondary,
      fontSize: wp(3.5),
      fontStyle: "italic",
    },
  });
}

export default function Payroll() {
  const { width, height } = useWindowDimensions();
  const isTablet = width >= 768;
  const isSmallScreen = width < 360;

  const wp = useMemo(() => (p: number) => (width * p) / 100, [width]);
  const hp = useMemo(() => (p: number) => (height * p) / 100, [height]);

  const { uiTheme } = useTheme();
  const colors = useMemo(() => buildColors(uiTheme), [uiTheme]);
  const styles = useMemo(() => createStyles(colors, wp, hp, isTablet, isSmallScreen), [colors, wp, hp, isTablet, isSmallScreen]);

  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [employeeProfile, setEmployeeProfile] = useState<EmployeeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const loadData = async () => {
    try {
      setLoading(true);
      const profileRes = await apiFetch<{ item: EmployeeProfile }>("/api/employees/me");
      setEmployeeProfile(profileRes.item);
    } catch {
      // Quiet fallback
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
    } catch {
      // Quiet fallback
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
      <View style={s(styles.center)}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={s(styles.container)} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={s(styles.scrollContainer)} showsVerticalScrollIndicator={false}>
        <View style={s(styles.responsiveContentWrapper)}>
          <View style={s(styles.header)}>
            <View>
              <Text style={s(styles.title)}>My Payroll</Text>
              <Text style={s(styles.subtitle)}>Track your earnings and hours</Text>
            </View>
            
            <View style={s(styles.controlsRow)}>
              <View style={s(styles.datePickerContainer)}>
                <TouchableOpacity onPress={() => shiftMonth(-1)} style={s(styles.iconBtn)}>
                  <ChevronLeft size={18} color={colors.primary} />
                </TouchableOpacity>
                <View style={s(styles.monthBadge)}>
                  <Text style={s(styles.monthBadgeText)}>{getMonthName(currentMonth)}</Text>
                </View>
                <TouchableOpacity onPress={() => shiftMonth(1)} style={s(styles.iconBtn)}>
                  <ChevronRight size={18} color={colors.primary} />
                </TouchableOpacity>
              </View>

              {calculatedPayroll && (
                <TouchableOpacity onPress={handleExportPDF} style={s(styles.exportBtn)}>
                  <Download size={14} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={s(styles.exportText)}>Export PDF</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {calculatedPayroll ? (
            <View style={{ width: "100%" }}>
              <View style={s(styles.statsGrid)}>
                <View style={s(styles.statCard)}>
                  <View style={s(styles.statIconHeader)}>
                    <Clock size={14} color={colors.primary} />
                    <Text style={s(styles.statLabel)}>Total Hours</Text>
                  </View>
                  <Text style={s(styles.statValue)}>{formatHours(calculatedPayroll.totalHours)}</Text>
                </View>

                <View style={s(styles.statCard)}>
                  <View style={s(styles.statIconHeader)}>
                    <TrendingUp size={14} color={colors.success} />
                    <Text style={s(styles.statLabel)}>Regular Hours</Text>
                  </View>
                  <Text style={s(styles.statValue)}>{formatHours(calculatedPayroll.regularHours)}</Text>
                </View>

                <View style={s(styles.statCard)}>
                  <View style={s(styles.statIconHeader)}>
                    <Clock size={14} color={colors.warning} />
                    <Text style={s(styles.statLabel)}>Overtime</Text>
                  </View>
                  <Text style={s([styles.statValue, { color: colors.warning }])}>{formatHours(calculatedPayroll.overtimeHours)}</Text>
                </View>

                <View style={s(styles.statCard)}>
                  <View style={s(styles.statIconHeader)}>
                    <DollarSign size={14} color={colors.success} />
                    <Text style={s(styles.statLabel)}>Total Pay</Text>
                  </View>
                  <Text style={s([styles.statValue, { color: colors.success }])}>{formatCurrency(calculatedPayroll.totalPay)}</Text>
                </View>
              </View>

              <View style={s(styles.card)}>
                <Text style={s(styles.cardTitle)}>Pay Breakdown</Text>
                <View style={s(styles.divider)} />
                <View style={s(styles.itemRow)}><Text style={s(styles.label)}>Pay Type</Text><Text style={s(styles.valueText)}>{calculatedPayroll.isMonthly ? "Monthly" : "Hourly"}</Text></View>
                <View style={s(styles.itemRow)}><Text style={s(styles.label)}>Hourly Rate</Text><Text style={s(styles.valueText)}>{formatCurrency(calculatedPayroll.hourlyRate)}/hr</Text></View>
                {calculatedPayroll.isMonthly && <View style={s(styles.itemRow)}><Text style={s(styles.label)}>Monthly Salary</Text><Text style={s(styles.valueText)}>{formatCurrency(calculatedPayroll.monthlySalary)}</Text></View>}
                <View style={s(styles.itemRow)}><Text style={s(styles.label)}>Regular Pay</Text><Text style={s(styles.valueText)}>{formatCurrency(calculatedPayroll.regularPay)}</Text></View>
                {calculatedPayroll.overtimePay > 0 && <View style={s(styles.itemRow)}><Text style={s(styles.label)}>Overtime Pay (1.5x)</Text><Text style={s([styles.valueText, { color: colors.warning }])}>{formatCurrency(calculatedPayroll.overtimePay)}</Text></View>}
                <View style={s([styles.itemRow, { borderTopWidth: 1, borderColor: colors.border, paddingTop: wp(2.5), marginTop: hp(0.75) }])}><Text style={s(styles.boldLabel)}>Total Pay</Text><Text style={s([styles.boldValue, { color: colors.success }])}>{formatCurrency(calculatedPayroll.totalPay)}</Text></View>
              </View>

              <View style={s(styles.card)}>
                <Text style={s(styles.cardTitle)}>Tax Deductions</Text>
                <View style={s(styles.divider)} />
                <View style={s(styles.itemRow)}><Text style={s(styles.label)}>Federal Tax (12%)</Text><Text style={s([styles.valueText, { color: colors.danger }])}>-{formatCurrency(calculatedPayroll.federalTax)}</Text></View>
                <View style={s(styles.itemRow)}><Text style={s(styles.label)}>State Tax (5%)</Text><Text style={s([styles.valueText, { color: colors.danger }])}>-{formatCurrency(calculatedPayroll.stateTax)}</Text></View>
                <View style={s(styles.itemRow)}><Text style={s(styles.label)}>Social Security (6.2%)</Text><Text style={s([styles.valueText, { color: colors.danger }])}>-{formatCurrency(calculatedPayroll.socialSecurity)}</Text></View>
                <View style={s(styles.itemRow)}><Text style={s(styles.label)}>Medicare (1.45%)</Text><Text style={s([styles.valueText, { color: colors.danger }])}>-{formatCurrency(calculatedPayroll.medicare)}</Text></View>
                <View style={s([styles.itemRow, { borderTopWidth: 1, borderColor: colors.border, paddingTop: wp(2.5) }])}><Text style={s(styles.boldLabel)}>Total Deductions</Text><Text style={s([styles.boldValue, { color: colors.danger }])}>-{formatCurrency(calculatedPayroll.totalDeductions)}</Text></View>
                <View style={s([styles.itemRow, { borderTopWidth: 1, borderColor: colors.border, paddingTop: wp(2.5), marginTop: hp(0.5) }])}><Text style={s([styles.boldLabel, { fontSize: wp(4.2) }])}>Net Pay</Text><Text style={s([styles.boldValue, { color: colors.success, fontSize: wp(4.5) }])}>{formatCurrency(calculatedPayroll.netPay)}</Text></View>
              </View>
            </View>
          ) : (
            <View style={s([styles.card, { alignItems: "center", padding: wp(6) }])}>
              <Text style={s(styles.emptyStateText)}>No time entries found for this month</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}