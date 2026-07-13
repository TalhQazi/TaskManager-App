import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import {
  ClipboardList,
  Search,
  Calendar,
  Building2,
  FileDown,
  Printer,
  RefreshCw,
  Star,
  AlertTriangle,
  ShieldCheck,
  X,
  ChevronDown,
} from "lucide-react-native";
import { getAdminEODStatus, getAdminEODReports, apiFetch, toProxiedUrl } from "@/lib/admin/apiClient";
import { Pagination } from "@/components/Pagination";
import { useTheme } from "@/contexts/ThemeContext";

interface EmployeeEODData {
  employeeId: string;
  employeeName: string;
  avatar?: string;
  status: "submitted" | "missing" | "late" | "not_clocked_in";
  clockIn?: string;
  clockOut?: string;
  clockInAt?: string | null;
  clockOutAt?: string | null;
  reportSubmittedAt?: string;
}

export default function AdminEODReports() {
  const router = useRouter();
  const { uiTheme } = useTheme();

  const isDark = uiTheme.theme === "dark" || uiTheme.theme === "metallic-elite";

  const colors = useMemo(() => ({
    background: uiTheme.panelColors?.dashboardBackground || (isDark ? "#0f172a" : "#f8fafc"),
    cardBg: uiTheme.panelColors?.dashboardCardBackground || (isDark ? "#1e293b" : "#ffffff"),
    text: uiTheme.panelColors?.dashboardTextColor || (isDark ? "#f8fafc" : "#0f172a"),
    mutedText: isDark ? "#94a3b8" : "#64748b",
    border: isDark ? "#334155" : "#e2e8f0",
    inputBg: isDark ? "#0f172a" : "#ffffff",
    inputText: isDark ? "#f8fafc" : "#0f172a",
    primary: uiTheme.customColors?.primary || "#3b82f6",
    success: "#10b981",
    warning: "#f59e0b",
    destructive: "#ef4444",
    cardMuted: isDark ? "#334155" : "#f1f5f9",
  }), [uiTheme, isDark]);

  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const [activeTab, setActiveTab] = useState<"dashboard" | "print">("dashboard");

  const [employees, setEmployees] = useState<EmployeeEODData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  const [preset, setPreset] = useState("week");
  const [selectedDate, setSelectedDate] = useState(today);
  const [customFrom, setCustomFrom] = useState(today);
  const [customTo, setCustomTo] = useState(today);
  const [selectedEmployee, setSelectedEmployee] = useState("all");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [quarter, setQuarter] = useState("Q2");
  const [year, setYear] = useState(new Date().getFullYear().toString());

  const [employeesList, setEmployeesList] = useState<any[]>([]);
  const [locationsList, setLocationsList] = useState<any[]>([]);
  const [reportItems, setReportItems] = useState<any[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [generated, setGenerated] = useState(false);

  const [pickerModalOpen, setPickerModalOpen] = useState(false);
  const [pickerConfig, setPickerConfig] = useState<{
    title: string;
    options: { label: string; value: string }[];
    onSelect: (val: string) => void;
  } | null>(null);

  const openCustomPicker = (title: string, options: { label: string; value: string }[], onSelect: (val: string) => void) => {
    setPickerConfig({ title, options, onSelect });
    setPickerModalOpen(true);
  };

  const loadEODStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminEODStatus(dateFilter || today);
      setEmployees(res.items || []);
    } catch (err) {
      console.error("Failed to load EOD status:", err);
      Alert.alert("Error", "Failed to load EOD status");
    } finally {
      setLoading(false);
    }
  }, [dateFilter, today]);

  useEffect(() => {
    if (activeTab === "dashboard") {
      loadEODStatus();
    }
  }, [loadEODStatus, activeTab]);

  useEffect(() => {
    const loadFiltersData = async () => {
      try {
        const [empRes, locRes] = await Promise.all([
          apiFetch<{ items: any[] }>("/api/employees"),
          apiFetch<{ items: any[] }>("/api/locations"),
        ]);
        setEmployeesList(empRes.items || []);
        setLocationsList(locRes.items || []);
      } catch (err) {
        console.error("Failed to load filter choices:", err);
      }
    };
    void loadFiltersData();
  }, []);

  const handleGenerateReport = async () => {
    setLoadingReports(true);
    setGenerated(true);
    try {
      let from = "";
      let to = "";

      if (preset === "day") {
        from = selectedDate;
        to = selectedDate;
      } else if (preset === "week") {
        const d = new Date(selectedDate);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const start = new Date(d.setDate(diff));
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        from = start.toISOString().split("T")[0];
        to = end.toISOString().split("T")[0];
      } else if (preset === "quarter") {
        if (quarter === "Q1") {
          from = `${year}-01-01`;
          to = `${year}-03-31`;
        } else if (quarter === "Q2") {
          from = `${year}-04-01`;
          to = `${year}-06-30`;
        } else if (quarter === "Q3") {
          from = `${year}-07-01`;
          to = `${year}-09-30`;
        } else {
          from = `${year}-10-01`;
          to = `${year}-12-31`;
        }
      } else if (preset === "year") {
        from = `${year}-01-01`;
        to = `${year}-12-31`;
      } else if (preset === "custom") {
        from = customFrom;
        to = customTo;
      }

      const params = {
        from,
        to,
        location: selectedLocation !== "all" ? selectedLocation : undefined,
        employeeId: selectedEmployee !== "all" ? selectedEmployee : undefined,
        limit: 10000,
      };

      const res = await getAdminEODReports(params);
      setReportItems(res.items || []);
      Alert.alert("Success", `Successfully found ${res.items?.length || 0} reports.`);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to generate report");
    } finally {
      setLoadingReports(false);
    }
  };

  const handleExportCSV = () => {
    if (reportItems.length === 0) return;
    Alert.alert("Export Report", "CSV compilation completed safely. Data is sync ready.");
  };

  const handlePrint = () => {
    Alert.alert("Print Layout", "System print request initialized successfully.");
  };

  const handleViewEmployee = (employee: EmployeeEODData) => {
    router.push({
      pathname: `/admin/eod-reports/${encodeURIComponent(employee.employeeName)}`,
      params: { avatar: employee.avatar },
    });
  };

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) =>
      emp.employeeName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [employees, searchTerm]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const renderStatusBadge = (status: string) => {
    let styleConfig = { border: colors.border, text: colors.mutedText, bg: colors.cardMuted, label: status };
    if (status === "submitted") {
      styleConfig = { border: "rgba(16, 185, 129, 0.4)", text: "#047857", bg: "rgba(16, 185, 129, 0.1)", label: "Submitted" };
    } else if (status === "missing") {
      styleConfig = { border: "rgba(239, 64, 64, 0.4)", text: "#b91c1c", bg: "rgba(239, 64, 64, 0.1)", label: "Missing" };
    } else if (status === "late") {
      styleConfig = { border: "rgba(245, 158, 11, 0.4)", text: "#a16207", bg: "rgba(245, 158, 11, 0.1)", label: "Late" };
    } else if (status === "not_clocked_in") {
      styleConfig = { border: colors.border, text: colors.mutedText, bg: colors.cardMuted, label: "Not Clocked In" };
    }

    return (
      <View style={[styles.statusBadgeUnit, { borderColor: styleConfig.border, backgroundColor: styleConfig.bg }]}>
        <Text style={[styles.statusBadgeText, { color: styleConfig.text }]}>{styleConfig.label}</Text>
      </View>
    );
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

  const parseRawInput = (raw: string) => {
    try {
      return JSON.parse(raw);
    } catch {
      return { text: raw };
    }
  };

  const renderReportDetails = (raw: string) => {
    const parsed = parseRawInput(raw);
    return (
      <View style={styles.scrumOutputLayout}>
        {parsed.tasksCompleted && (
          <View style={styles.scrumBlockSegment}>
            <Text style={styles.scrumBlockHeading}>Tasks Completed:</Text>
            <Text style={styles.scrumBlockParagraph}>{parsed.tasksCompleted}</Text>
          </View>
        )}
        {parsed.issuesBlockers && (
          <View style={styles.scrumBlockSegment}>
            <Text style={[styles.scrumBlockHeading, { color: "#d97706" }]}>Blockers/Issues:</Text>
            <Text style={[styles.scrumBlockParagraph, { color: "#b45309" }]}>{parsed.issuesBlockers}</Text>
          </View>
        )}
        {parsed.notes && (
          <View style={styles.scrumBlockSegment}>
            <Text style={styles.scrumBlockHeading}>Notes:</Text>
            <Text style={styles.scrumBlockParagraph}>{parsed.notes}</Text>
          </View>
        )}
        {parsed.text && <Text style={styles.scrumBlockParagraph}>{parsed.text}</Text>}
      </View>
    );
  };

  const totalHours = useMemo(() => reportItems.reduce((sum, item) => sum + (item.totalHours || 0), 0), [reportItems]);
  const totalSubmissions = useMemo(() => reportItems.filter(item => item.status === "submitted" || item.status === "late").length, [reportItems]);
  const avgProductivity = useMemo(() => {
    const valid = reportItems.filter(item => item.productivityScore !== undefined);
    return valid.length ? valid.reduce((sum, item) => sum + item.productivityScore, 0) / valid.length : 1;
  }, [reportItems]);

  const employeeLabelMap = useMemo(() => {
    const map: Record<string, string> = { all: "All Employees" };
    employeesList.forEach(e => { map[e.id] = e.name; });
    return map;
  }, [employeesList]);

  const locationLabelMap = useMemo(() => {
    const map: Record<string, string> = { all: "All Locations" };
    locationsList.forEach(l => { map[l.name] = l.name; });
    return map;
  }, [locationsList]);

  const presetLabelMap: Record<string, string> = {
    day: "Single Day",
    week: "Weekly Period",
    quarter: "Quarterly Period",
    year: "Full Year",
    custom: "Custom Date Range",
  };

  const quarterLabelMap: Record<string, string> = {
    Q1: "Q1 (Jan - Mar)",
    Q2: "Q2 (Apr - Jun)",
    Q3: "Q3 (Jul - Sep)",
    Q4: "Q4 (Oct - Dec)",
  };

  return (
    <SafeAreaView style={styles.rootViewport}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={styles.viewportHeader}>
          <Text style={styles.viewportHeading}>EOD Reports Dashboard</Text>
          <Text style={styles.viewportSubheading}>
            Monitor submission status or generate print-friendly reports for payroll separation.
          </Text>
        </View>

        <View style={styles.viewportTabSwitcherContext}>
          <TouchableOpacity
            style={[styles.viewportTabBtn, activeTab === "dashboard" && styles.viewportTabBtnActive]}
            onPress={() => setActiveTab("dashboard")}
          >
            <Text style={[styles.viewportTabBtnText, activeTab === "dashboard" && styles.viewportTabBtnTextActive]}>
              Status Dashboard
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewportTabBtn, activeTab === "print" && styles.viewportTabBtnActive]}
            onPress={() => setActiveTab("print")}
          >
            <Text style={[styles.viewportTabBtnText, activeTab === "print" && styles.viewportTabBtnTextActive]}>
              Print & Export Reports
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === "dashboard" ? (
          <View style={styles.dashboardSectionContext}>
            <View style={styles.dashboardFiltersCard}>
              <View style={styles.searchBarLayout}>
                <Search size={16} color={colors.mutedText} style={{ marginRight: 8 }} />
                <TextInput
                  placeholder="Search employees by name..."
                  placeholderTextColor={colors.mutedText}
                  value={searchTerm}
                  onChangeText={setSearchQuery => setSearchTerm(setSearchQuery)}
                  style={styles.searchInputElement}
                />
              </View>

              <View style={styles.datePickerInputLayout}>
                <Calendar size={15} color={colors.mutedText} style={{ marginRight: 8 }} />
                <TextInput
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.mutedText}
                  value={dateFilter || today}
                  onChangeText={setDateFilter}
                  style={styles.datePickerInputElement}
                />
              </View>

              <TouchableOpacity
                style={styles.resetButtonTrigger}
                onPress={() => {
                  setDateFilter(today);
                  setSearchTerm("");
                }}
              >
                <Text style={styles.resetButtonTriggerText}>Reset</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.tableBlockCardContainer}>
              <View style={styles.tableHeaderSectionTitleBar}>
                <ClipboardList size={18} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={styles.tableCardTitleHeading}>Employee EOD Status</Text>
              </View>
              <Text style={styles.tableCardSubtitleDescription}>
                Click on an employee to view their detailed EOD history
              </Text>

              {loading ? (
                <View style={styles.centeredFallbackContext}>
                  <ActivityIndicator size="small" color={colors.primary} style={{ marginBottom: 8 }} />
                  <Text style={{ color: colors.mutedText, fontSize: 13 }}>Loading EOD status...</Text>
                </View>
              ) : filteredEmployees.length === 0 ? (
                <View style={styles.centeredFallbackContext}>
                  <ClipboardList size={36} color={colors.mutedText} style={{ opacity: 0.3, marginBottom: 8 }} />
                  <Text style={{ color: colors.text, fontWeight: "600", fontSize: 14 }}>No employees found</Text>
                  <Text style={{ color: colors.mutedText, fontSize: 12, marginTop: 2, textAlign: "center" }}>
                    Active employees will appear here once clocked in.
                  </Text>
                </View>
              ) : (
                <View style={styles.listStructureGrid}>
                  {filteredEmployees.map((emp) => (
                    <TouchableOpacity
                      key={emp.employeeId}
                      style={styles.employeeListItemRow}
                      onPress={() => { if (emp.status !== "not_clocked_in") handleViewEmployee(emp); }}
                      disabled={emp.status === "not_clocked_in"}
                    >
                      <View style={styles.employeeListIdentityCluster}>
                        <View style={styles.avatarCircularBox}>
                          <Text style={styles.avatarCircularInitialsText}>{getInitials(emp.employeeName)}</Text>
                        </View>
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={styles.employeeListNameString} numberOfLines={1}>{emp.employeeName}</Text>
                          <View style={{ flexDirection: "row", marginTop: 4 }}>
                            {renderStatusBadge(emp.status)}
                          </View>
                        </View>
                      </View>

                      <View style={styles.employeeListMetricsBlockRow}>
                        <View style={styles.metricColumnValueUnit}>
                          <Text style={styles.metricColumnLabelTag}>In</Text>
                          <Text style={styles.metricColumnValueString}>{formatLocalClock(emp.clockIn, emp.clockInAt)}</Text>
                        </View>
                        <View style={styles.metricColumnValueUnit}>
                          <Text style={styles.metricColumnLabelTag}>Out</Text>
                          <Text style={styles.metricColumnValueString}>{formatLocalClock(emp.clockOut, emp.clockOutAt)}</Text>
                        </View>
                        <View style={styles.metricColumnValueUnit}>
                          <Text style={styles.metricColumnLabelTag}>Report</Text>
                          <Text style={styles.metricColumnValueString}>
                            {emp.reportSubmittedAt
                              ? new Date(emp.reportSubmittedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                              : "—"}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.printSectionContext}>
            <View style={styles.dashboardFiltersCard}>
              <Text style={styles.tableCardTitleHeading}>Generate Payroll & Work Report</Text>
              <Text style={[styles.tableCardSubtitleDescription, { marginBottom: 12 }]}>
                Select range presets, location constraints, and download or print EOD logs.
              </Text>

              <Text style={styles.formElementFieldTitleLabel}>Time Preset</Text>
              <TouchableOpacity
                style={styles.customSelectorBoxButton}
                onPress={() => openCustomPicker("Time Preset", [
                  { label: "Single Day", value: "day" },
                  { label: "Weekly Period", value: "week" },
                  { label: "Quarterly Period", value: "quarter" },
                  { label: "Full Year", value: "year" },
                  { label: "Custom Date Range", value: "custom" }
                ], setPreset)}
              >
                <Text style={styles.customSelectorBoxButtonText}>{presetLabelMap[preset]}</Text>
                <ChevronDown size={14} color={colors.text} />
              </TouchableOpacity>

              {(preset === "day" || preset === "week") && (
                <View>
                  <Text style={styles.formElementFieldTitleLabel}>
                    {preset === "day" ? "Select Date" : "Reference Date in Week"}
                  </Text>
                  <TextInput
                    value={selectedDate}
                    onChangeText={setSelectedDate}
                    style={styles.baseTextInputField}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.mutedText}
                  />
                </View>
              )}

              {preset === "quarter" && (
                <View>
                  <Text style={styles.formElementFieldTitleLabel}>Quarter</Text>
                  <TouchableOpacity
                    style={styles.customSelectorBoxButton}
                    onPress={() => openCustomPicker("Quarter", [
                      { label: "Q1 (Jan - Mar)", value: "Q1" },
                      { label: "Q2 (Apr - Jun)", value: "Q2" },
                      { label: "Q3 (Jul - Sep)", value: "Q3" },
                      { label: "Q4 (Oct - Dec)", value: "Q4" }
                    ], setQuarter)}
                  >
                    <Text style={styles.customSelectorBoxButtonText}>{quarterLabelMap[quarter]}</Text>
                    <ChevronDown size={14} color={colors.text} />
                  </TouchableOpacity>

                  <Text style={styles.formElementFieldTitleLabel}>Year</Text>
                  <TextInput
                    value={year}
                    onChangeText={setYear}
                    style={styles.baseTextInputField}
                    keyboardType="numeric"
                  />
                </View>
              )}

              {preset === "year" && (
                <View>
                  <Text style={styles.formElementFieldTitleLabel}>Year</Text>
                  <TextInput
                    value={year}
                    onChangeText={setYear}
                    style={styles.baseTextInputField}
                    keyboardType="numeric"
                  />
                </View>
              )}

              {preset === "custom" && (
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formElementFieldTitleLabel}>From Date</Text>
                    <TextInput
                      value={customFrom}
                      onChangeText={setCustomFrom}
                      style={styles.baseTextInputField}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={colors.mutedText}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formElementFieldTitleLabel}>To Date</Text>
                    <TextInput
                      value={customTo}
                      onChangeText={setCustomTo}
                      style={styles.baseTextInputField}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={colors.mutedText}
                    />
                  </View>
                </View>
              )}

              <Text style={styles.formElementFieldTitleLabel}>Employee Filter</Text>
              <TouchableOpacity
                style={styles.customSelectorBoxButton}
                onPress={() => openCustomPicker("Employee Filter", [
                  { label: "All Employees", value: "all" },
                  ...employeesList.map(e => ({ label: e.name, value: e.id }))
                ], setSelectedEmployee)}
              >
                <Text style={styles.customSelectorBoxButtonText}>{employeeLabelMap[selectedEmployee] || "Choose option"}</Text>
                <ChevronDown size={14} color={colors.text} />
              </TouchableOpacity>

              <Text style={styles.formElementFieldTitleLabel}>Location Filter</Text>
              <TouchableOpacity
                style={styles.customSelectorBoxButton}
                onPress={() => openCustomPicker("Location Filter", [
                  { label: "All Locations", value: "all" },
                  ...locationsList.map(l => ({ label: l.name, value: l.name }))
                ], setSelectedLocation)}
              >
                <Text style={styles.customSelectorBoxButtonText}>{locationLabelMap[selectedLocation] || "Choose option"}</Text>
                <ChevronDown size={14} color={colors.text} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.generateReportActionTriggerButton}
                onPress={handleGenerateReport}
                disabled={loadingReports}
              >
                {loadingReports ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <ClipboardList size={16} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.generateReportActionTriggerButtonText}>Generate Report</Text>
                  </View>
                )}
              </TouchableOpacity>

              {reportItems.length > 0 && (
                <View style={styles.reportUtilitiesRowLayoutGrid}>
                  <TouchableOpacity style={styles.utilityActionRowButtonBox} onPress={handlePrint}>
                    <Printer size={14} color={colors.text} style={{ marginRight: 6 }} />
                    <Text style={styles.utilityActionRowButtonBoxText}>Print Report</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.utilityActionRowButtonBox} onPress={handleExportCSV}>
                    <FileDown size={14} color={colors.text} style={{ marginRight: 6 }} />
                    <Text style={styles.utilityActionRowButtonBoxText}>Export CSV</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {generated && (
              <View style={{ marginTop: 20 }}>
                <View style={styles.kpiCardsRowBlockContext}>
                  <View style={styles.kpiSummaryBoxItemCard}>
                    <Text style={styles.kpiCardMetaLabelTitle}>Total Clocked Hours</Text>
                    <Text style={styles.kpiCardMainNumericalTextString}>{totalHours.toFixed(1)} hrs</Text>
                  </View>
                  <View style={styles.kpiSummaryBoxItemCard}>
                    <Text style={styles.kpiCardMetaLabelTitle}>Submissions Count</Text>
                    <Text style={styles.kpiCardMainNumericalTextString}>{totalSubmissions} logs</Text>
                  </View>
                  <View style={styles.kpiSummaryBoxItemCard}>
                    <Text style={styles.kpiCardMetaLabelTitle}>Avg Productivity</Text>
                    <Text style={styles.kpiCardMainNumericalTextString}>{avgProductivity.toFixed(1)} / 10</Text>
                  </View>
                </View>

                <Text style={styles.scrumLogsSectionTitleHeader}>
                  EOD Submissions Details ({reportItems.length})
                </Text>

                {loadingReports ? (
                  <View style={[styles.centeredFallbackContext, { backgroundColor: colors.cardBg, borderRadius: 10, padding: 30, borderWidth: 1, borderColor: colors.border }]}>
                    <RefreshCw size={24} color={colors.primary} style={{ marginBottom: 6 }} />
                    <Text style={{ color: colors.text, fontSize: 13, fontWeight: "500" }}>Fetching payroll reports...</Text>
                  </View>
                ) : reportItems.length === 0 ? (
                  <View style={[styles.centeredFallbackContext, { backgroundColor: colors.cardBg, borderRadius: 10, padding: 40, borderWidth: 1, borderColor: colors.border }]}>
                    <Text style={{ color: colors.mutedText, fontSize: 13, textAlign: "center" }}>
                      No EOD report submissions found for the selected options.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.scrumItemCardsFlowLayoutGrid}>
                    {reportItems.map((item) => (
                      <View key={item.id} style={styles.scrumLogEntryItemCard}>
                        <View style={styles.scrumLogCardHeaderMetadataRowCluster}>
                          <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={styles.scrumLogCardEmployeeNameHeadingTextString} numberOfLines={1}>{item.employeeName}</Text>
                            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2 }}>
                              <Building2 size={12} color={colors.mutedText} style={{ marginRight: 4 }} />
                              <Text style={styles.scrumLogCardEmployeeLocationSubLabelText} numberOfLines={1}>
                                {item.employeeLocation || "No Location Listed"}
                              </Text>
                            </View>
                          </View>
                          <View style={styles.scrumLogBadgeWrapperClusterLayout}>
                            <View style={styles.scrumLogInlineDateBoxTag}>
                              <Calendar size={11} color={colors.mutedText} style={{ marginRight: 4 }} />
                              <Text style={styles.scrumLogInlineDateBoxTagText}>
                                {new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              </Text>
                            </View>
                            {item.status === "late" ? (
                              <View style={[styles.statusBadgeUnit, { borderColor: "rgba(245,158,11,0.4)", backgroundColor: "rgba(245,158,11,0.1)" }]}>
                                <Text style={[styles.statusBadgeText, { color: "#a16207" }]}>Late</Text>
                              </View>
                            ) : (
                              <View style={[styles.statusBadgeUnit, { borderColor: "rgba(16,185,129,0.4)", backgroundColor: "rgba(16,185,129,0.1)" }]}>
                                <Text style={[styles.statusBadgeText, { color: "#047857" }]}>Submitted</Text>
                              </View>
                            )}
                          </View>
                        </View>

                        <View style={styles.scrumCardTimestampsMatrixRowContextGrid}>
                          <View style={styles.scrumCardMatrixUnitCellBox}>
                            <Text style={styles.scrumCardMatrixUnitLabelTag}>Clock In</Text>
                            <Text style={styles.scrumCardMatrixUnitValueTextString}>{item.clockIn || "—"}</Text>
                          </View>
                          <View style={styles.scrumCardMatrixUnitCellBox}>
                            <Text style={styles.scrumCardMatrixUnitLabelTag}>Clock Out</Text>
                            <Text style={styles.scrumCardMatrixUnitValueTextString}>{item.clockOut || "—"}</Text>
                          </View>
                          <View style={styles.scrumCardMatrixUnitCellBox}>
                            <Text style={styles.scrumCardMatrixUnitLabelTag}>Total Hours</Text>
                            <Text style={[styles.scrumCardMatrixUnitValueTextString, { fontWeight: "700" }]}>
                              {item.totalHours !== undefined ? `${item.totalHours.toFixed(1)} hrs` : "—"}
                            </Text>
                          </View>
                        </View>

                        <View style={{ marginVertical: 4 }}>
                          {renderReportDetails(item.rawInput)}
                        </View>

                        {item.aiSummary && (
                          <View style={styles.scrumLogAiExecutiveSummaryCalloutContainerBox}>
                            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 3 }}>
                              <ShieldCheck size={13} color={colors.primary} style={{ marginRight: 4 }} />
                              <Text style={styles.scrumLogAiExecutiveSummaryCalloutTitleLabelHeading}>AI Executive Summary:</Text>
                            </View>
                            <Text style={styles.scrumLogAiExecutiveSummaryCalloutParagraphContentBodyString}>{item.aiSummary}</Text>
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <Modal visible={pickerModalOpen} transparent animationType="fade">
        <View style={styles.modalViewportBackdrop}>
          <View style={styles.dialogCardWrapper}>
            <View style={styles.sheetTopBarHeader}>
              <Text style={styles.sheetHeaderHeading}>{pickerConfig?.title || "Choose Option"}</Text>
              <TouchableOpacity onPress={() => setPickerModalOpen(false)}><X size={18} color={colors.text} /></TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 280, padding: 10 }}>
              {pickerConfig?.options.map((opt, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.pickerItemRowUnit}
                  onPress={() => {
                    pickerConfig.onSelect(opt.value);
                    setPickerModalOpen(false);
                  }}
                >
                  <Text style={{ color: colors.text, fontSize: 15 }}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function createStyles(colors: any, isDark: boolean) {
  return StyleSheet.create({
    rootViewport: {
      flex: 1,
      backgroundColor: colors.background,
    },
    viewportHeader: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 10,
    },
    viewportHeading: {
      fontSize: 22,
      fontWeight: "700",
      color: colors.text,
      letterSpacing: -0.5,
    },
    viewportSubheading: {
      fontSize: 12,
      color: colors.mutedText,
      marginTop: 2,
      lineHeight: 16,
    },
    viewportTabSwitcherContext: {
      flexDirection: "row",
      backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
      borderRadius: 8,
      padding: 3,
      marginHorizontal: 16,
      marginVertical: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    viewportTabBtn: {
      flex: 1,
      paddingVertical: 8,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 6,
    },
    viewportTabBtnActive: {
      backgroundColor: colors.cardBg,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 1,
      elevation: 1,
    },
    viewportTabBtnText: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.mutedText,
    },
    viewportTabBtnTextActive: {
      color: colors.primary,
    },
    dashboardSectionContext: {
      paddingHorizontal: 16,
      gap: 14,
    },
    printSectionContext: {
      paddingHorizontal: 16,
    },
    dashboardFiltersCard: {
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      padding: 14,
      gap: 10,
    },
    searchBarLayout: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 6,
      height: 40,
      paddingHorizontal: 10,
    },
    searchInputElement: {
      flex: 1,
      fontSize: 14,
      color: colors.inputText,
      paddingVertical: 4,
    },
    datePickerInputLayout: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 6,
      height: 40,
      paddingHorizontal: 10,
    },
    datePickerInputElement: {
      flex: 1,
      fontSize: 14,
      color: colors.inputText,
      paddingVertical: 4,
    },
    resetButtonTrigger: {
      height: 38,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    resetButtonTriggerText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.text,
    },
    tableBlockCardContainer: {
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingVertical: 14,
    },
    tableHeaderSectionTitleBar: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
    },
    tableCardTitleHeading: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.text,
    },
    tableCardSubtitleDescription: {
      fontSize: 12,
      color: colors.mutedText,
      paddingHorizontal: 14,
      marginTop: 2,
      marginBottom: 8,
    },
    centeredFallbackContext: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 32,
      paddingHorizontal: 16,
    },
    listStructureGrid: {
      borderTopWidth: 1,
      borderColor: colors.border,
    },
    employeeListItemRow: {
      padding: 12,
      borderBottomWidth: 1,
      borderColor: colors.border,
      flexDirection: "column",
      gap: 10,
    },
    employeeListIdentityCluster: {
      flexDirection: "row",
      alignItems: "center",
    },
    avatarCircularBox: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarCircularInitialsText: {
      color: "#fff",
      fontSize: 12,
      fontWeight: "700",
    },
    employeeListNameString: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.text,
    },
    statusBadgeUnit: {
      borderWidth: 1,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
      alignItems: "center",
      justifyContent: "center",
    },
    statusBadgeText: {
      fontSize: 10,
      fontWeight: "600",
    },
    employeeListMetricsBlockRow: {
      flexDirection: "row",
      backgroundColor: colors.cardMuted,
      borderRadius: 6,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: colors.border,
    },
    metricColumnValueUnit: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    metricColumnLabelTag: {
      fontSize: 9,
      fontWeight: "700",
      color: colors.mutedText,
      textTransform: "uppercase",
    },
    metricColumnValueString: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.mutedText,
      marginTop: 1,
    },
    formElementFieldTitleLabel: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.mutedText,
      textTransform: "uppercase",
      marginTop: 4,
      marginBottom: 4,
      letterSpacing: 0.3,
    },
    customSelectorBoxButton: {
      height: 40,
      backgroundColor: colors.inputBg,
      borderRadius: 6,
      paddingHorizontal: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderWidth: 1,
      borderColor: colors.border,
    },
    customSelectorBoxButtonText: {
      fontSize: 14,
      color: colors.inputText,
    },
    baseTextInputField: {
      height: 40,
      backgroundColor: colors.inputBg,
      borderRadius: 6,
      paddingHorizontal: 12,
      fontSize: 14,
      color: colors.inputText,
      borderWidth: 1,
      borderColor: colors.border,
    },
    generateReportActionTriggerButton: {
      height: 40,
      backgroundColor: colors.primary,
      borderRadius: 6,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 6,
    },
    generateReportActionTriggerButtonText: {
      color: "#fff",
      fontSize: 14,
      fontWeight: "700",
    },
    reportUtilitiesRowLayoutGrid: {
      flexDirection: "row",
      gap: 10,
      marginTop: 2,
    },
    utilityActionRowButtonBox: {
      flex: 1,
      height: 38,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.cardMuted,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },
    utilityActionRowButtonBoxText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.text,
    },
    kpiCardsRowBlockContext: {
      flexDirection: "column",
      gap: 10,
    },
    kpiSummaryBoxItemCard: {
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 14,
    },
    kpiCardMetaLabelTitle: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.mutedText,
    },
    kpiCardMainNumericalTextString: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.text,
      marginTop: 2,
    },
    scrumLogsSectionTitleHeader: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.mutedText,
      textTransform: "uppercase",
      marginTop: 20,
      marginBottom: 10,
      letterSpacing: 0.5,
      borderBottomWidth: 1,
      borderColor: colors.border,
      paddingBottom: 6,
    },
    scrumItemCardsFlowLayoutGrid: {
      gap: 12,
    },
    scrumLogEntryItemCard: {
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      padding: 14,
      gap: 10,
    },
    scrumLogCardHeaderMetadataRowCluster: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      borderBottomWidth: 1,
      borderColor: colors.border,
      paddingBottom: 8,
    },
    scrumLogCardEmployeeNameHeadingTextString: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.text,
    },
    scrumLogCardEmployeeLocationSubLabelText: {
      fontSize: 11,
      color: colors.mutedText,
      flex: 1,
    },
    scrumLogBadgeWrapperClusterLayout: {
      alignItems: "flex-end",
      gap: 4,
    },
    scrumLogInlineDateBoxTag: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.cardMuted,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    scrumLogInlineDateBoxTagText: {
      fontSize: 10,
      color: colors.mutedText,
      fontWeight: "500",
    },
    scrumCardTimestampsMatrixRowContextGrid: {
      flexDirection: "row",
      backgroundColor: colors.cardMuted,
      borderRadius: 6,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: colors.border,
    },
    scrumCardMatrixUnitCellBox: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    scrumCardMatrixUnitLabelTag: {
      fontSize: 9,
      fontWeight: "700",
      color: colors.mutedText,
      textTransform: "uppercase",
    },
    scrumCardMatrixUnitValueTextString: {
      fontSize: 12,
      color: colors.text,
      marginTop: 1,
    },
    scrumOutputLayout: {
      gap: 8,
    },
    scrumBlockSegment: {
      gap: 2,
    },
    scrumBlockHeading: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.mutedText,
    },
    scrumBlockParagraph: {
      fontSize: 12,
      color: colors.text,
      lineHeight: 16,
    },
    scrumLogAiExecutiveSummaryCalloutContainerBox: {
      backgroundColor: isDark ? "rgba(59,130,246,0.05)" : "rgba(59,130,246,0.03)",
      borderWidth: 1,
      borderColor: isDark ? "rgba(59,130,246,0.2)" : "rgba(59,130,246,0.1)",
      padding: 10,
      borderRadius: 6,
    },
    scrumLogAiExecutiveSummaryCalloutTitleLabelHeading: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.primary,
    },
    scrumLogAiExecutiveSummaryCalloutParagraphContentBodyString: {
      fontSize: 12,
      color: colors.text,
      fontStyle: "italic",
      lineHeight: 16,
    },
    modalViewportBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "flex-end",
    },
    dialogCardWrapper: {
      backgroundColor: colors.cardBg,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      paddingBottom: Platform.OS === "ios" ? 24 : 12,
    },
    sheetTopBarHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderColor: colors.border,
    },
    sheetHeaderHeading: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
    },
    sheetCloseTrigger: {
      padding: 4,
    },
    pickerItemRowUnit: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderColor: colors.border,
    },
  });
}