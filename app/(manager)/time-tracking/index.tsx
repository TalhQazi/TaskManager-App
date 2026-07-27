import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
  Platform,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Clock,
  MapPin,
  MoreHorizontal,
  Plus,
  Calendar,
  FileText,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ArrowLeft,
} from "lucide-react-native";

import {
  apiFetch,
  createResource,
  deleteResource,
  listResource,
} from "@/lib/admin/apiClient";

import { useTheme } from "@/contexts/ThemeContext";
import { s } from "@/util/styles";

interface TimeEntry {
  id: string;
  employee: string;
  initials: string;
  avatar?: string;
  location: string;
  date: string;
  clockIn: string;
  clockOut: string | null;
  clockInAt?: string;
  clockOutAt?: string;
  status: "clocked-in" | "clocked-out" | "on-break";
}

type TimeEntryApi = {
  id?: string;
  _id?: string;
  employee?: string;
  avatar?: string;
  location?: string;
  date?: string;
  clockIn?: string;
  clockOut?: string | null;
  clockInAt?: string;
  clockOutAt?: string;
  status?: string;
  initials?: string;
  gpsLocation?: { lat: number; lng: number };
  ipAddress?: string;
};

interface Employee {
  id: string;
  name: string;
  initials: string;
  email: string;
  status: "active" | "inactive" | "on-leave";
}

interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "manager" | "employee";
  status: "active" | "inactive" | "pending";
}

interface WorkspacePagination {
  totalPages: number;
}

interface ResourceResponse<T> {
  items: T[];
  pagination?: WorkspacePagination;
}

interface LocationItem {
  id: string;
  name: string;
}

interface HistoryProps {
  employeeName: string;
  onClose: () => void;
}

const statusLabels: Record<TimeEntry["status"], string> = {
  "clocked-in": "Clocked In",
  "clocked-out": "Clocked Out",
  "on-break": "On Break",
};

function getInitials(name: string): string {
  return String(name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("")
    .slice(0, 2);
}

function parseMinutes(hhmm: string): number | null {
  const [h, m] = String(hhmm || "")
    .split(":")
    .map((x) => Number(x));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

function formatDuration(totalMinutes: number): string {
  const minutes = Math.max(0, Math.floor(totalMinutes));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

function calcEntryMinutes(entry: TimeEntry): number {
  if (entry.clockInAt && entry.clockOutAt) {
    const inAt = new Date(entry.clockInAt);
    const outAt = new Date(entry.clockOutAt);
    if (Number.isFinite(inAt.getTime()) && Number.isFinite(outAt.getTime())) {
      const diff = Math.floor((outAt.getTime() - inAt.getTime()) / 60000);
      return diff > 0 ? diff : 0;
    }
  }
  const inMin = parseMinutes(entry.clockIn);
  if (inMin === null) return 0;
  const outMin = entry.clockOut ? parseMinutes(entry.clockOut) : null;
  if (outMin === null) return 0;
  const diff = outMin - inMin;
  return diff > 0 ? diff : 0;
}

function getLocalDateInputValue(d = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toLocalDateKey(value: string): string {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const m = /^\d{4}-\d{2}-\d{2}/.exec(raw);
  if (m) return m[0];
  const d = new Date(raw);
  if (!Number.isFinite(d.getTime())) return raw;
  return getLocalDateInputValue(d);
}

function formatEntryDate(value: string): string {
  const key = toLocalDateKey(value);
  if (!key) return "—";
  const d = new Date(`${key}T00:00:00`);
  if (!Number.isFinite(d.getTime())) return key;
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function formatLocalTime(value: string): string {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const d = new Date(raw);
  if (!Number.isFinite(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function resolveClockTime(clockAt: string | undefined, hhmm: string | undefined): string {
  const localFromTimestamp = formatLocalTime(String(clockAt || ""));
  if (localFromTimestamp) return localFromTimestamp;
  return String(hhmm || "").trim();
}

function normalizeTimeEntry(e: TimeEntryApi): TimeEntry {
  const employee = String(e.employee || "").trim();
  const id = String((e as any).id || e._id || "");
  const location = String(e.location || "");
  const date = String(e.date || "");
  const clockInAt = String(e.clockInAt || "").trim() || undefined;
  const clockOutAt = String(e.clockOutAt || "").trim() || undefined;
  const clockIn = resolveClockTime(clockInAt, String(e.clockIn || ""));
  const clockOutResolved = resolveClockTime(clockOutAt, String(e.clockOut || ""));
  const clockOut = (e.clockOut === null ? null : clockOutResolved) || null;
  const statusRaw = String(e.status || "");
  
  const status: TimeEntry["status"] =
    statusRaw === "clocked-in" || statusRaw === "on-break" || statusRaw === "clocked-out"
      ? (statusRaw as TimeEntry["status"])
      : clockOut
        ? "clocked-out"
        : "clocked-in";

  const initials = String((e as any).initials || "").trim() || getInitials(employee);

  return { id, employee, initials, location, date, clockIn, clockOut, clockInAt, clockOutAt, status };
}

function buildColors(uiTheme: any) {
  const isDark = uiTheme.theme !== "crystal-white";
  return {
    background: isDark ? "#090d13" : "#f8fafc",
    surface: isDark ? "#0d1117" : "#ffffff",
    surfaceMuted: isDark ? "#161b22" : "#f1f5f9",
    border: isDark ? "#21262d" : "#e2e8f0",
    text: isDark ? "#c9d1d9" : "#0f172a",
    textBold: isDark ? "#f0f6fc" : "#020617",
    textMuted: isDark ? "#8b949e" : "#64748b",
    primary: "#0ea5e9",
    success: "#10b981",
    warning: "#f59e0b",
    danger: "#ef4444",
    info: "#3b82f6",
  };
}

function createStyles(
  c: ReturnType<typeof buildColors>,
  wp: (percentage: number) => number,
  hp: (percentage: number) => number,
  isTablet: boolean,
  isSmallScreen: boolean,
  screenWidth: number
) {
  const horizontalPadding = isSmallScreen ? wp(3) : isTablet ? wp(6) : wp(4.2);

  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    scrollPadding: { paddingHorizontal: horizontalPadding, paddingTop: hp(2), paddingBottom: hp(5) },
    headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: hp(1.5) },
    pageTitle: { fontSize: isTablet ? 28 : 24, fontWeight: "800", color: c.textBold },
    subtitle: { fontSize: isTablet ? 14 : 13, color: c.textMuted, marginTop: hp(0.3) },
    headerActions: { flexDirection: "row", alignItems: "center", gap: wp(2) },
    iconActionBtn: {
      width: isTablet ? 44 : 38,
      height: isTablet ? 44 : 38,
      borderRadius: wp(2),
      borderWidth: 1,
      borderColor: c.border,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.surface,
     
    },
    addButton: {
      width: isTablet ? 44 : 38,
      height: isTablet ? 44 : 38,
      borderRadius: wp(2),
      backgroundColor: c.textBold,
      alignItems: "center",
      justifyContent: "center",
    },
    topUtilityRow: { flexDirection: "row", marginBottom: hp(2) },
    utilityBtn: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.surfaceMuted,
      paddingHorizontal: wp(3),
      paddingVertical: hp(1),
      borderRadius: wp(1.5),
      gap: wp(1.5),
    },
    utilityBtnTxt: { fontSize: isTablet ? 13 : 12, fontWeight: "600", color: c.text },
    errorBanner: {
      backgroundColor: c.danger + "15",
      padding: wp(3),
      borderRadius: wp(2),
      marginBottom: hp(2),
      borderWidth: 1,
      borderColor: c.danger + "30",
    },
    errorText: { color: c.danger, fontSize: isTablet ? 14 : 13, fontWeight: "500" },
    metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: wp(2.5), marginBottom: hp(3) },
    metricCard: {
      backgroundColor: c.surface,
      borderRadius: wp(2.5),
      padding: wp(3),
      width: isTablet
        ? (screenWidth - horizontalPadding * 2 - wp(7.5)) / 4
        : (screenWidth - horizontalPadding * 2 - wp(2.5)) / 2,
      borderWidth: 1,
      borderColor: c.border,
      borderLeftWidth: 4,
    },
    metricLabel: { fontSize: isTablet ? 13 : 12, color: c.textMuted, fontWeight: "500", marginTop: hp(0.5) },
    metricValue: { fontSize: isTablet ? 20 : 18, fontWeight: "800", color: c.textBold, marginTop: hp(0.3) },
    sectionHeading: {
      fontSize: isTablet ? 16 : 15,
      fontWeight: "700",
      color: c.textBold,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: hp(1.5),
    },
    loaderSpacing: { paddingVertical: hp(5) },
    shiftCard: {
      backgroundColor: c.surface,
      borderRadius: wp(3),
      padding: wp(4),
      marginBottom: hp(1.2),
      borderWidth: 1,
      borderColor: c.border,
    },
    shiftCardMainInfo: { flexDirection: "row", gap: wp(3), borderBottomWidth: 1, borderColor: c.border, paddingBottom: hp(1.5) },
    initialsBubble: {
      width: isTablet ? 48 : 40,
      height: isTablet ? 48 : 40,
      borderRadius: isTablet ? 24 : 20,
      backgroundColor: c.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    initialsText: { color: "#FFFFFF", fontWeight: "700", fontSize: isTablet ? 16 : 14 },
    metaDataColumn: { flex: 1, gap: hp(0.3) },
    badgeRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: wp(2) },
    employeeName: { fontSize: isTablet ? 17 : 16, fontWeight: "600", color: c.textBold, flex: 1 },
    statusBadge: { paddingHorizontal: wp(2), paddingVertical: hp(0.4), borderRadius: wp(1.5) },
    statusBadgeText: { fontSize: isTablet ? 12 : 11, fontWeight: "700" },
    subMetaRow: { fontSize: isTablet ? 14 : 13, color: c.textMuted, flexDirection: "row", alignItems: "center", gap: wp(1) },
    shiftCardActionControls: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: hp(1.5) },
    timeLabelContainer: { gap: hp(0.3) },
    timeValueText: { fontSize: isTablet ? 14 : 13, fontWeight: "600", color: c.text },
    btnActionInlineGroup: { flexDirection: "row", alignItems: "center", gap: wp(2) },
    clockOutBtnInline: { backgroundColor: c.danger, paddingHorizontal: wp(3), paddingVertical: hp(0.8), borderRadius: wp(1.5) },
    clockOutBtnInlineText: { color: "#FFFFFF", fontSize: isTablet ? 13 : 12, fontWeight: "600" },
    moreOptionsButton: { padding: wp(1.5), backgroundColor: c.surfaceMuted, borderRadius: wp(1.5) },
    paginationContainer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: hp(2), paddingVertical: hp(1) },
    pagerBtn: {
      width: isTablet ? 42 : 36,
      height: isTablet ? 42 : 36,
      borderRadius: wp(2),
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    pagerBtnDisabled: { backgroundColor: c.surfaceMuted, borderColor: c.border },
    paginationText: { fontSize: isTablet ? 14 : 13, color: c.text, fontWeight: "500" },
    modalContainer: { flex: 1, backgroundColor: c.background },
    modalNavigationHeader: {
      flexDirection: "row",
      alignItems: "center",
      padding: wp(4),
      borderBottomWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      justifyContent: "space-between",
    },
    modalTitle: { fontSize: isTablet ? 20 : 18, fontWeight: "700", color: c.textBold },
    modalContentBody: {
      padding: wp(4),
      gap: hp(1.8),
      maxWidth: isTablet ? 600 : undefined,
      alignSelf: isTablet ? "center" : undefined,
      width: "100%",
    },
    fieldHeading: { fontSize: isTablet ? 15 : 14, fontWeight: "600", color: c.text },
    pickerSelectorBox: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: wp(2),
      padding: wp(3),
      backgroundColor: c.surfaceMuted,
      minHeight: hp(5),
    },
    pickerSelectorBoxText: { fontSize: isTablet ? 15 : 14, color: c.text },
    inputField: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: wp(2),
      padding: wp(3),
      fontSize: isTablet ? 15 : 14,
      color: c.text,
      backgroundColor: c.surface,
      minHeight: hp(5),
    },
    saveSubmitButton: {
      backgroundColor: c.primary,
      padding: wp(3.5),
      borderRadius: wp(2),
      alignItems: "center",
      marginTop: hp(1.2),
      marginBottom: hp(2.5),
    },
    saveSubmitButtonText: { color: "#FFFFFF", fontWeight: "700", fontSize: isTablet ? 16 : 15 },
    
    backButtonRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: wp(1.5),
      height: hp(4.5),
      paddingHorizontal: wp(3),
      borderRadius: wp(2),
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      alignSelf: "flex-start",
    },
    backRowText: { fontSize: isTablet ? 14 : 13, fontWeight: "600", color: c.text },
    historyCard: { backgroundColor: c.surface, borderRadius: wp(3), padding: wp(3.5), marginBottom: hp(1.5), borderWidth: 1, borderColor: c.border },
    historyCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: hp(1.2) },
    historyDateRow: { flexDirection: "row", alignItems: "center", gap: wp(1.5) },
    historyDateText: { fontSize: isTablet ? 15 : 14, fontWeight: "700", color: c.textBold },
    historyGrid: { gap: hp(0.8) },
    historyMetricRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    historyLabel: { fontSize: isTablet ? 13 : 12, color: c.textMuted },
    historyValue: { fontSize: isTablet ? 14 : 13, fontWeight: "600", color: c.textBold },
    historyLocationBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: wp(1.5),
      marginTop: hp(1.2),
      paddingTop: hp(1.2),
      borderTopWidth: 1,
      borderTopColor: c.border + "50",
    },
    historyLocationText: { fontSize: isTablet ? 13 : 12, color: c.textMuted, flex: 1 },
    emptyLabel: { fontSize: isTablet ? 14 : 13, color: c.textMuted, fontStyle: "italic", textAlign: "center", paddingVertical: hp(4) },
  });
}

function EmployeeTimeHistory({ employeeName, onClose }: HistoryProps) {
  const { uiTheme } = useTheme();
  const { width, height } = useWindowDimensions();
  const wp = useCallback((percentage: number) => (width * percentage) / 100, [width]);
  const hp = useCallback((percentage: number) => (height * percentage) / 100, [height]);
  const isTablet = width >= 768;
  const isSmallScreen = width < 375;

  const colors = useMemo(() => buildColors(uiTheme), [uiTheme]);
  const styles = useMemo(
    () => createStyles(colors, wp, hp, isTablet, isSmallScreen, width),
    [colors, wp, hp, isTablet, isSmallScreen, width]
  );

  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [rows, setRows] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorContext, setErrorContext] = useState<string | null>(null);

  const fetchHistoryPipeline = useCallback(async () => {
    if (!employeeName) return;
    try {
      setLoading(true);
      setErrorContext(null);

      const locRes = await apiFetch<{ items?: LocationItem[] } | LocationItem[]>("/api/locations");
      const loadedLocs = Array.isArray(locRes) ? locRes : Array.isArray(locRes.items) ? locRes.items : [];
      setLocations(loadedLocs.filter((l) => Boolean(l.id)));

      const histRes = await apiFetch<{ items: TimeEntryApi[] }>(
        `/api/time-entries?employee=${encodeURIComponent(employeeName)}`
      );
      
      const normalized = (histRes.items || []).map((e: TimeEntryApi) => ({
        id: String(e._id || e.id || ""),
        employee: String(e.employee || "").trim(),
        initials: getInitials(String(e.employee || "")),
        location: String(e.location === "-" ? "" : (e.location || "")),
        date: String(e.date || ""),
        clockIn: resolveClockTime(e.clockInAt || undefined, e.clockIn || undefined),
        clockOut: e.clockOut ? resolveClockTime(e.clockOutAt || undefined, e.clockOut) : null,
        status: String(e.status || "") as TimeEntry["status"],
      }));
      setRows(normalized);
    } catch (err: any) {
      setErrorContext(err?.message || "Failed to load history metrics.");
    } finally {
      setLoading(false);
    }
  }, [employeeName]);

  useEffect(() => {
    fetchHistoryPipeline();
  }, [fetchHistoryPipeline]);

  const resolveLocationName = (value: string) => {
    const key = String(value || "").trim();
    if (!key) return "—";
    const match = locations.find((l) => String(l.id) === key);
    return match?.name || key;
  };

  const getBadgeTheme = (status: string) => {
    const sStr = status.toLowerCase();
    if (sStr === "complete" || sStr === "completed") {
      return { bg: colors.success + "15", txt: colors.success, label: "Complete" };
    }
    if (sStr === "incomplete") {
      return { bg: colors.warning + "15", txt: colors.warning, label: "In Progress" };
    }
    if (sStr === "overtime") {
      return { bg: colors.info + "15", txt: colors.info, label: "Overtime" };
    }
    return { bg: colors.surfaceMuted, txt: colors.textMuted, label: status || "—" };
  };

  return (
    <SafeAreaView style={s(styles.root)} edges={["top", "left", "right"]}>
      <View style={s(styles.modalNavigationHeader)}>
        <TouchableOpacity style={styles.backButtonRow} onPress={onClose}>
          <ChevronLeft size={20} color={colors.text} />
          <Text style={styles.backRowText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.modalTitle} numberOfLines={1}>{employeeName || "History"}</Text>
        <View style={{ width: wp(12) }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollPadding} showsVerticalScrollIndicator={false}>
        <View style={{ marginBottom: hp(1.5) }}>
          <Text style={styles.pageTitle}>Timeline Records</Text>
          <Text style={styles.subtitle}>Check-in / check-out history pipeline</Text>
        </View>

        {errorContext && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{errorContext}</Text>
          </View>
        )}

        {loading ? (
          <View style={styles.loaderSpacing}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : rows.length === 0 ? (
          <Text style={styles.emptyLabel}>No history discovered.</Text>
        ) : (
          <View style={{ gap: hp(0.5) }}>
            {rows.map((entry) => {
              const badge = getBadgeTheme(entry.status);
              return (
                <View key={entry.id} style={styles.historyCard}>
                  <View style={styles.historyCardHeader}>
                    <View style={styles.historyDateRow}>
                      <Calendar size={14} color={colors.textMuted} />
                      <Text style={styles.historyDateText}>{formatEntryDate(entry.date)}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.statusBadgeText, { color: badge.txt }]}>{badge.label}</Text>
                    </View>
                  </View>

                  <View style={styles.historyGrid}>
                    <View style={styles.historyMetricRow}>
                      <Text style={styles.historyLabel}>Clock In</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: wp(1) }}>
                        <Clock size={12} color={colors.textMuted} />
                        <Text style={styles.historyValue}>{entry.clockIn || "—"}</Text>
                      </View>
                    </View>

                    <View style={styles.historyMetricRow}>
                      <Text style={styles.historyLabel}>Clock Out</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: wp(1) }}>
                        <Clock size={12} color={colors.textMuted} />
                        <Text style={styles.historyValue}>{entry.clockOut || "—"}</Text>
                      </View>
                    </View>
                  </View>

                  {!!entry.location && (
                    <View style={styles.historyLocationBar}>
                      <MapPin size={12} color={colors.textMuted} />
                      <Text style={styles.historyLocationText} numberOfLines={1}>
                        {resolveLocationName(entry.location)}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export default function TimeTracking() {
  const { uiTheme } = useTheme();
  const { width, height } = useWindowDimensions();
  const wp = useCallback((percentage: number) => (width * percentage) / 100, [width]);
  const hp = useCallback((percentage: number) => (height * percentage) / 100, [height]);
  const isTablet = width >= 768;
  const isSmallScreen = width < 375;

  const colors = useMemo(() => buildColors(uiTheme), [uiTheme]);
  const styles = useMemo(
    () => createStyles(colors, wp, hp, isTablet, isSmallScreen, width),
    [colors, wp, hp, isTablet, isSmallScreen, width]
  );

  const [addOpen, setAddOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  
  const [selectedHistoryEmployee, setSelectedHistoryEmployee] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    employee: "",
    location: "",
    date: getLocalDateInputValue(),
    clockIn: "",
    clockOut: "",
    status: "clocked-in" as TimeEntry["status"],
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const PAGE_SIZE = 25;

  const loadData = useCallback(async (page: number) => {
    try {
      setLoading(true);
      setApiError(null);
      const res = await listResource<TimeEntryApi>("time-entries", { page, limit: PAGE_SIZE }) as unknown as ResourceResponse<TimeEntryApi> | TimeEntryApi[];
      
      if (res && typeof res === "object" && "items" in res) {
        setEntries(res.items.map(normalizeTimeEntry));
        setTotalPages(res.pagination?.totalPages || 1);
      } else if (Array.isArray(res)) {
        setEntries(res.map(normalizeTimeEntry));
        setTotalPages(1);
      }

      try {
        const employeeList = await listResource<Employee>("employees");
        const userList = await listResource<User>("users");
        
        let allEmployees = Array.isArray(employeeList) ? employeeList.filter((e) => e.status === "active") : [];
        const employeeUsers = (Array.isArray(userList) ? userList : [])
          .filter((u) => u.role === "employee" && (u.status === "active" || u.status === "pending"))
          .map((u) => ({ id: u.id, name: u.name, initials: getInitials(u.name), email: u.email, status: "active" as const }));

        employeeUsers.forEach((eu) => {
          if (!allEmployees.some((e) => e.email === eu.email)) {
            allEmployees.push(eu);
          }
        });
        setEmployees(allEmployees);
      } catch (err) {
        console.error("Failed to load dependency data:", err);
      }
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Failed to load time entries");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData(currentPage);
  }, [currentPage, loadData]);

  const refresh = async () => {
    await loadData(currentPage);
  };

  const showEmployeePicker = () => {
    Alert.alert(
      "Select Employee",
      "Choose an employee from the workspace:",
      employees.map((emp) => ({
        text: emp.name,
        onPress: () => setFormData({ ...formData, employee: emp.name }),
      }))
    );
  };

  const showStatusPicker = () => {
    Alert.alert("Select Status", "Update time tracking status metric:", [
      { text: "Clocked In", onPress: () => setFormData({ ...formData, status: "clocked-in" }) },
      { text: "On Break", onPress: () => setFormData({ ...formData, status: "on-break" }) },
      { text: "Clocked Out", onPress: () => setFormData({ ...formData, status: "clocked-out" }) },
    ]);
  };

  const addEntry = async () => {
    if (!formData.employee || !formData.location || !formData.date || !formData.clockIn) {
      Alert.alert("Missing Parameters", "Please provide all required parameters mapping inputs.");
      return;
    }

    let clockInAt: string | undefined = undefined;
    if (formData.clockIn) {
      const dt = new Date(`${formData.date}T${formData.clockIn}`);
      if (Number.isFinite(dt.getTime())) clockInAt = dt.toISOString();
    }

    let clockOutAt: string | undefined = undefined;
    if (formData.clockOut) {
      const dt = new Date(`${formData.date}T${formData.clockOut}`);
      if (Number.isFinite(dt.getTime())) clockOutAt = dt.toISOString();
    }

    const entry: TimeEntryApi = {
      id: `TIME-${Date.now().toString().slice(-6)}`,
      employee: formData.employee,
      initials: getInitials(formData.employee),
      location: formData.location,
      date: formData.date,
      clockIn: formData.clockIn,
      clockOut: formData.clockOut || null,
      clockInAt,
      clockOutAt,
      status: formData.clockOut ? "clocked-out" : formData.status,
      ipAddress: "Mobile App Connection Instance",
    };

    try {
      setApiError(null);
      await createResource<TimeEntry>("time-entries", entry);
      await refresh();
      setAddOpen(false);
      setFormData({ employee: "", location: "", date: getLocalDateInputValue(), clockIn: "", clockOut: "", status: "clocked-in" });
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Failed to add entry");
    }
  };

  const handleEntryActions = (entry: TimeEntry) => {
    Alert.alert("Entry Operations", `Manage time sheet mapping parameters for ${entry.employee}`, [
      { text: "Remove Entry", style: "destructive", onPress: () => removeEntry(entry.id) },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const removeEntry = async (id: string) => {
    try {
      setApiError(null);
      await deleteResource("time-entries", id);
      await refresh();
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Failed to remove entry");
    }
  };

  const clockOutNow = async (id: string) => {
    try {
      setApiError(null);
      await apiFetch(`/api/time-entries/${id}/clock-out`, { method: "POST" });
      await refresh();
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Failed to clock out");
    }
  };

  const sortedEntries = useMemo(() => {
    return entries.slice().sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      if (a.clockIn !== b.clockIn) return a.clockIn < b.clockIn ? 1 : -1;
      return a.id < b.id ? 1 : -1;
    });
  }, [entries]);

  const summary = useMemo(() => {
    const clockedIn = sortedEntries.filter((e) => e.status === "clocked-in").length;
    const onBreak = sortedEntries.filter((e) => e.status === "on-break").length;
    const clockedOut = sortedEntries.filter((e) => e.status === "clocked-out").length;
    const totalMinutes = sortedEntries.reduce((acc, e) => acc + calcEntryMinutes(e), 0);
    const avgMinutes = sortedEntries.length > 0 ? Math.round(totalMinutes / sortedEntries.length) : 0;
    return { clockedIn, onBreak, clockedOut, totalMinutes, avgMinutes };
  }, [sortedEntries]);

  const statusClasses: Record<TimeEntry["status"], string> = useMemo(() => ({
    "clocked-in": colors.success,
    "clocked-out": colors.textMuted,
    "on-break": colors.warning,
  }), [colors]);

  return (
    <SafeAreaView style={s(styles.root)} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.scrollPadding} showsVerticalScrollIndicator={false}>
        
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.pageTitle}>Time Tracking</Text>
            <Text style={styles.subtitle}>Monitor employee work hours and attendance</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconActionBtn} onPress={refresh}>
              <RefreshCw size={15} color={colors.text} />
            </TouchableOpacity>
            {/*<TouchableOpacity style={styles.addButton} onPress={() => setAddOpen(true)}>
              <Plus size={15} color="#000000" />
            </TouchableOpacity>*/}
          </View>
        </View>

        <View style={styles.topUtilityRow}>
          {/*<TouchableOpacity style={styles.utilityBtn} onPress={() => Alert.alert("Exporting", "Spreadsheet generated successfully.")}>
            <FileText size={14} color={colors.text} />
            <Text style={styles.utilityBtnTxt}>Export Report</Text>
          </TouchableOpacity>*/}
        </View>

        {apiError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{apiError}</Text>
          </View>
        )}

        <View style={styles.metricsGrid}>
          <View style={[styles.metricCard, { borderLeftColor: colors.primary }]}>
            <Clock size={15} color={colors.primary} />
            <Text style={styles.metricLabel}>Total Hours</Text>
            <Text style={styles.metricValue}>{formatDuration(summary.totalMinutes)}</Text>
          </View>

          <View style={[styles.metricCard, { borderLeftColor: colors.success }]}>
            <Clock size={15} color={colors.success} />
            <Text style={styles.metricLabel}>Average Hours</Text>
            <Text style={styles.metricValue}>{formatDuration(summary.avgMinutes)}</Text>
          </View>

          <View style={[styles.metricCard, { borderLeftColor: colors.warning }]}>
            <Clock size={15} color={colors.warning} />
            <Text style={styles.metricLabel}>Incomplete</Text>
            <Text style={styles.metricValue}>{summary.clockedIn}</Text>
          </View>

          <View style={[styles.metricCard, { borderLeftColor: colors.textMuted }]}>
            <Clock size={15} color={colors.textMuted} />
            <Text style={styles.metricLabel}>On Break</Text>
            <Text style={styles.metricValue}>{summary.onBreak}</Text>
          </View>
        </View>

        <Text style={styles.sectionHeading}>Active Shifts Registry ({sortedEntries.length})</Text>
        
        {loading ? (
          <View style={styles.loaderSpacing}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : (
          <>
            {sortedEntries.map((entry) => (
              <TouchableOpacity 
                key={entry.id} 
                style={styles.shiftCard}
                onPress={() => setSelectedHistoryEmployee(entry.employee)}
              >
                <View style={styles.shiftCardMainInfo}>
                  <View style={styles.initialsBubble}>
                    <Text style={styles.initialsText}>{entry.initials}</Text>
                  </View>
                  <View style={styles.metaDataColumn}>
                    <View style={styles.badgeRow}>
                      <Text style={styles.employeeName} numberOfLines={1}>{entry.employee}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: statusClasses[entry.status] + "22" }]}>
                        <Text style={[styles.statusBadgeText, { color: statusClasses[entry.status] }]}>{statusLabels[entry.status]}</Text>
                      </View>
                    </View>
                    <Text style={styles.subMetaRow}><MapPin size={12} color={colors.textMuted} /> {entry.location || "No Location Specified"}</Text>
                    <Text style={styles.subMetaRow}><Calendar size={12} color={colors.textMuted} /> {formatEntryDate(entry.date)}</Text>
                  </View>
                </View>

                <View style={styles.shiftCardActionControls}>
                  <View style={styles.timeLabelContainer}>
                    <Text style={styles.timeValueText}>In: {entry.clockIn}</Text>
                    <Text style={styles.timeValueText}>Out: {entry.clockOut || "In progress"}</Text>
                  </View>
                  <View style={styles.btnActionInlineGroup}>
                    {entry.status !== "clocked-out" && (
                      <TouchableOpacity style={styles.clockOutBtnInline} onPress={() => clockOutNow(entry.id)}>
                        <Text style={styles.clockOutBtnInlineText}>Clock Out</Text>
                      </TouchableOpacity>
                    )}
                    {/*<TouchableOpacity style={styles.moreOptionsButton} onPress={() => handleEntryActions(entry)}>
                      <MoreHorizontal size={18} color={colors.text} />
                    </TouchableOpacity>*/}
                  </View>
                </View>
              </TouchableOpacity>
            ))}

            {totalPages > 1 && (
              <View style={styles.paginationContainer}>
                <TouchableOpacity 
                  style={[styles.pagerBtn, currentPage === 1 && styles.pagerBtnDisabled]} 
                  disabled={currentPage === 1}
                  onPress={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                >
                  <ChevronLeft size={16} color={currentPage === 1 ? colors.textMuted : colors.text} />
                </TouchableOpacity>
                
                <Text style={styles.paginationText}>Page {currentPage} of {totalPages}</Text>
                
                <TouchableOpacity 
                  style={[styles.pagerBtn, currentPage === totalPages && styles.pagerBtnDisabled]} 
                  disabled={currentPage === totalPages}
                  onPress={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                >
                  <ChevronRight size={16} color={currentPage === totalPages ? colors.textMuted : colors.text} />
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </ScrollView>

      <Modal visible={addOpen} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalNavigationHeader}>
            <Text style={styles.modalTitle}>Add Manual Time Entry</Text>
            <TouchableOpacity onPress={() => setAddOpen(false)}>
              <X size={20} color={colors.textBold} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContentBody} showsVerticalScrollIndicator={false}>
            <Text style={styles.fieldHeading}>Employee Selection *</Text>
            <TouchableOpacity style={styles.pickerSelectorBox} onPress={showEmployeePicker}>
              <Text style={styles.pickerSelectorBoxText}>{formData.employee || "Select target active workspace employee"}</Text>
              <ChevronDown size={16} color={colors.textMuted} />
            </TouchableOpacity>

            <Text style={styles.fieldHeading}>Location Parameter Configuration *</Text>
            <TextInput style={styles.inputField} placeholder="e.g. Building A Core Warehouse" value={formData.location} onChangeText={(txt) => setFormData({ ...formData, location: txt })} placeholderTextColor={colors.textMuted} />

            <Text style={styles.fieldHeading}>Calendar Operational Date *</Text>
            <TextInput style={styles.inputField} placeholder="YYYY-MM-DD" value={formData.date} onChangeText={(txt) => setFormData({ ...formData, date: txt })} placeholderTextColor={colors.textMuted} />

            <Text style={styles.fieldHeading}>Clock In Time (HH:MM) *</Text>
            <TextInput style={styles.inputField} placeholder="e.g. 09:00" value={formData.clockIn} onChangeText={(txt) => setFormData({ ...formData, clockIn: txt })} placeholderTextColor={colors.textMuted} />

            <Text style={styles.fieldHeading}>Clock Out Time (HH:MM)</Text>
            <TextInput style={styles.inputField} placeholder="e.g. 17:00" value={formData.clockOut} onChangeText={(txt) => setFormData({ ...formData, clockOut: txt })} placeholderTextColor={colors.textMuted} />

            <Text style={styles.fieldHeading}>Initial Dynamic Operational Status</Text>
            <TouchableOpacity style={styles.pickerSelectorBox} onPress={showStatusPicker}>
              <Text style={styles.pickerSelectorBoxText}>{statusLabels[formData.status]}</Text>
              <ChevronDown size={16} color={colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveSubmitButton} onPress={addEntry}>
              <Text style={styles.saveSubmitButtonText}>Commit Sheet Parameters</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal visible={selectedHistoryEmployee !== null} animationType="slide" transparent={false}>
        {selectedHistoryEmployee ? (
          <EmployeeTimeHistory 
            employeeName={selectedHistoryEmployee} 
            onClose={() => setSelectedHistoryEmployee(null)} 
          />
        ) : null}
      </Modal>
    </SafeAreaView>
  );
}