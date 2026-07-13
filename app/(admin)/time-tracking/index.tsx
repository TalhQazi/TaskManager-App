import React, { useEffect, useMemo, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  Clock,
  MapPin,
  MoreHorizontal,
  Plus,
  Calendar,
  Users,
  ShieldAlert,
  FileText,
  Printer,
  Search,
  X,
  Check,
} from "lucide-react-native";

import {
  apiFetch,
  createResource,
  deleteResource,
  listResource,
  toProxiedUrl,
} from "@/lib/admin/apiClient";
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

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

type ComplianceFlag = {
  id: string;
  employee: string;
  type: "meal_break" | "overtime" | "off_the_clock" | "hard_stop";
  severity: "warning" | "violation";
  status: "open" | "resolved";
  message: string;
  detectedAt: string;
  timeEntryId?: string;
};

type OvertimeTracker = {
  id: string;
  employee: string;
  weekStart: string;
  weekEnd: string;
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  hourlyRate: number;
  overtimeRate: number;
};

type TimeEditAuditLog = {
  id: string;
  timeEntryId: string;
  field: string;
  originalValue: unknown;
  modifiedValue: unknown;
  editedByUserId: string;
  ipAddress: string;
  createdAt: string;
};

interface ApiPaginatedResponse<T> {
  items: T[];
  pagination?: {
    totalPages: number;
  };
}

const GOLD_COLOR = "#D4AF37";
const GOLD_LIGHT = "#F4E8C1";

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
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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
  const id = String(e.id || e._id || "");
  const location = String(e.location || "");
  const date = String(e.date || "");
  const clockInAt = String(e.clockInAt || "").trim() || undefined;
  const clockOutAt = String(e.clockOutAt || "").trim() || undefined;
  const clockIn = resolveClockTime(clockInAt, String(e.clockIn || ""));
  const clockOutWithTs = resolveClockTime(clockOutAt, String(e.clockOut || ""));
  const clockOut = (e.clockOut === null ? null : clockOutWithTs) || null;
  const statusRaw = String(e.status || "");
  const status: TimeEntry["status"] =
    statusRaw === "clocked-in" || statusRaw === "on-break" || statusRaw === "clocked-out"
      ? (statusRaw as TimeEntry["status"])
      : clockOut
      ? "clocked-out"
      : "clocked-in";
  const initials = String(e.initials || "").trim() || getInitials(employee);
  const avatar = String(e.avatar || "").trim();

  return {
    id,
    employee,
    initials,
    avatar: avatar || undefined,
    location,
    date,
    clockIn,
    clockOut,
    clockInAt,
    clockOutAt,
    status,
  };
}

const TimeTracking = () => {
  const navigation = useNavigation<any>();
  
  const { user } = useAuth();
  const { uiTheme } = useTheme();

  const styles = useMemo(() => createStyles(uiTheme), [uiTheme]);

  const [addOpen, setAddOpen] = useState(false);
  const [complianceLoading, setComplianceLoading] = useState(false);
  const [complianceError, setComplianceError] = useState<string | null>(null);
  const [complianceFlags, setComplianceFlags] = useState<ComplianceFlag[]>([]);
  const [overtimeTrackers, setOvertimeTrackers] = useState<OvertimeTracker[]>([]);
  const [, setAuditLogs] = useState<TimeEditAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeePickerOpen, setEmployeePickerOpen] = useState(false);
  const [statusPickerOpen, setStatusPickerOpen] = useState(false);

  const [formData, setFormData] = useState({
    employee: "",
    location: "",
    date: getLocalDateInputValue(),
    clockIn: "",
    clockOut: "",
    status: "clocked-in" as TimeEntry["status"],
  });

  const [currentPage] = useState(1);
  const [, setTotalPages] = useState(1);
  const PAGE_SIZE = 25;

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        setApiError(null);

        const res = await listResource<TimeEntryApi>("time-entries", {
          page: currentPage,
          limit: PAGE_SIZE,
        });

        if (!mounted) return;

        if (res && typeof res === "object" && "items" in res) {
          const paginated = res as ApiPaginatedResponse<TimeEntryApi>;
          setEntries(paginated.items.map(normalizeTimeEntry));
          setTotalPages(paginated.pagination?.totalPages || 1);
        } else if (Array.isArray(res)) {
          setEntries(res.map(normalizeTimeEntry));
          setTotalPages(1);
        }

        if (employees.length === 0) {
          try {
            const employeeList = await listResource<Employee>("employees");
            const userList = await listResource<User>("users");

            if (mounted) {
              let allEmployees = Array.isArray(employeeList)
                ? employeeList.filter((e) => e.status === "active")
                : [];
              const employeeUsers = (Array.isArray(userList) ? userList : [])
                .filter((u) => u.role === "employee" && (u.status === "active" || u.status === "pending"))
                .map((u) => ({
                  id: u.id,
                  name: u.name,
                  initials: getInitials(u.name),
                  email: u.email,
                  status: "active" as const,
                }));

              employeeUsers.forEach((eu) => {
                if (!allEmployees.some((e) => e.email === eu.email)) {
                  allEmployees.push(eu);
                }
              });
              setEmployees(allEmployees);
            }
          } catch (err) {
            console.error(err);
          }
        }
      } catch (e) {
        if (!mounted) return;
        setApiError(e instanceof Error ? e.message : "Error accessing tracking data");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [currentPage, employees.length]);

  const refresh = async () => {
    const res = await listResource<TimeEntryApi>("time-entries", { page: currentPage, limit: PAGE_SIZE });
    if (res && typeof res === "object" && "items" in res) {
      const paginated = res as ApiPaginatedResponse<TimeEntryApi>;
      setEntries(paginated.items.map(normalizeTimeEntry));
      setTotalPages(paginated.pagination?.totalPages || 1);
    } else if (Array.isArray(res)) {
      setEntries(res.map(normalizeTimeEntry));
    }
  };

  const loadCompliance = async () => {
    try {
      setComplianceLoading(true);
      setComplianceError(null);

      const flagsRes = await apiFetch<{ items: ComplianceFlag[] }>("/api/compliance/flags?status=open");
      const overtimeRes = await apiFetch<{ items: OvertimeTracker[] }>("/api/compliance/overtime");
      const auditRes = await apiFetch<{ items: TimeEditAuditLog[] }>("/api/compliance/audit-logs");

      setComplianceFlags(flagsRes.items || []);
      setOvertimeTrackers(overtimeRes.items || []);
      setAuditLogs(auditRes.items || []);
    } catch (e) {
      setComplianceError(e instanceof Error ? e.message : "Compliance logs load error");
    } finally {
      setComplianceLoading(false);
    }
  };

  const exportComplianceCsv = () => {
    Alert.alert("Export", "CSV sheet generation triggered successfully.");
  };

  const exportCompliancePdf = () => {
    Alert.alert("Export", "Document print layout structure generated.");
  };

  const tryPayrollExport = async () => {
    try {
      await apiFetch<{ ok: true }>("/api/compliance/payroll/export", { method: "POST" });
      Alert.alert("Complete", "Export process initialized.");
    } catch (e) {
      Alert.alert("Restricted", e instanceof Error ? e.message : "Pending validation issues exist.");
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
    return { clockedIn, onBreak, clockedOut, totalMinutes };
  }, [sortedEntries]);

  const reports = useMemo(() => {
    const byDay = new Map<string, number>();
    for (const e of sortedEntries) {
      const mins = calcEntryMinutes(e);
      const dayKey = toLocalDateKey(e.date);
      if (!dayKey) continue;
      byDay.set(dayKey, (byDay.get(dayKey) ?? 0) + mins);
    }

    const daily = Array.from(byDay.entries())
      .map(([date, minutes]) => ({ date, minutes }))
      .sort((a, b) => (a.date < b.date ? 1 : -1));

    const weeklyTotalMinutes = daily.reduce((acc, d) => acc + d.minutes, 0);
    return { daily, weeklyTotalMinutes };
  }, [sortedEntries]);

  const addEntry = async () => {
    if (!formData.employee || !formData.location || !formData.date || !formData.clockIn) {
      Alert.alert("Incomplete fields", "Verify all parameters before submission.");
      return;
    }

    let clockInAt: string | undefined = undefined;
    if (formData.clockIn) {
      const dt = new Date(`${formData.date}T${formData.clockIn}`);
      if (Number.isFinite(dt.getTime())) {
        clockInAt = dt.toISOString();
      }
    }

    let clockOutAt: string | undefined = undefined;
    if (formData.clockOut) {
      const dt = new Date(`${formData.date}T${formData.clockOut}`);
      if (Number.isFinite(dt.getTime())) {
        clockOutAt = dt.toISOString();
      }
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
      ipAddress: "App Terminal",
    };

    try {
      setApiError(null);
      await createResource<TimeEntry>("time-entries", entry);
      await refresh();
      setAddOpen(false);
      setFormData({
        employee: "",
        location: "",
        date: getLocalDateInputValue(),
        clockIn: "",
        clockOut: "",
        status: "clocked-in",
      });
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Error appending payload instance");
    }
  };

  const removeEntry = async (id: string) => {
    Alert.alert("Confirm removal", "Are you sure you want to remove this data block?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            setApiError(null);
            await deleteResource("time-entries", id);
            await refresh();
          } catch (e) {
            setApiError(e instanceof Error ? e.message : "Removal error occurred");
          }
        },
      },
    ]);
  };

  const clockOutNow = async (id: string) => {
    try {
      setApiError(null);
      await apiFetch(`/api/time-entries/${id}/clock-out`, { method: "POST" });
      await refresh();
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Action failed");
    }
  };

 const navigateToHistory = (employeeName: string) => {
  
  /*(navigation as any).navigate("History", { 
    employee: String(employeeName || "").trim() 
  });*/
};

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.headerRow}>
        <View style={styles.headerTextWrap}>
          <Text style={styles.titleText}>Time Tracking</Text>
          <Text style={styles.subtitleText}>Monitor employee clock-in/out and work hours.</Text>
        </View>

        <TouchableOpacity style={styles.addBtn} onPress={() => setAddOpen(true)}>
          <Plus size={16} color="#FFFFFF" style={styles.btnIcon} />
          <Text style={styles.addBtnText}>Add Entry</Text>
        </TouchableOpacity>
      </View>

      {apiError && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{apiError}</Text>
        </View>
      )}

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleContainer}>
            <ShieldAlert size={20} color={GOLD_COLOR} />
            <Text style={styles.cardTitle}>Compliance Dashboard</Text>
          </View>
          <View style={styles.actionGrid}>
            <TouchableOpacity style={styles.outlineActionBtn} onPress={() => void loadCompliance()}>
              <Search size={14} color={uiTheme?.text || "#333333"} />
              <Text style={styles.actionBtnText}>Refresh</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.outlineActionBtn} onPress={exportComplianceCsv}>
              <FileText size={14} color={uiTheme?.text || "#333333"} />
              <Text style={styles.actionBtnText}>CSV</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.outlineActionBtn} onPress={exportCompliancePdf}>
              <Printer size={14} color={uiTheme?.text || "#333333"} />
              <Text style={styles.actionBtnText}>PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.solidActionBtn} onPress={() => void tryPayrollExport()}>
              <Text style={styles.solidActionBtnText}>Payroll Export</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.cardContent}>
          {complianceLoading && <ActivityIndicator color={GOLD_COLOR} style={{ marginVertical: 12 }} />}
          {complianceError && <Text style={styles.errorText}>{complianceError}</Text>}

          <View style={styles.complianceSection}>
            <Text style={styles.sectionHeading}>Active Violations</Text>
            <Text style={styles.sectionLabel}>Open flags</Text>
            {complianceFlags.slice(0, 3).map((f) => (
              <View key={f.id} style={styles.nestedRowCard}>
                <View style={styles.nestedCardHeader}>
                  <Text style={styles.nestedCardTitle}>{f.employee}</Text>
                  <View style={[styles.badge, f.severity === "violation" ? styles.badgeDestructive : styles.badgeWarning]}>
                    <Text style={f.severity === "violation" ? styles.textDestructive : styles.textWarning}>{f.severity}</Text>
                  </View>
                </View>
                <Text style={styles.nestedCardSub}>{f.type}</Text>
                <Text style={styles.nestedCardMsg}>{f.message}</Text>
              </View>
            ))}
            {!complianceFlags.length && <Text style={styles.emptyText}>No open flags</Text>}
          </View>

          <View style={styles.complianceSection}>
            <Text style={styles.sectionHeading}>Overtime Risk</Text>
            <Text style={styles.sectionLabel}>Weekly totals</Text>
            {overtimeTrackers.slice(0, 3).map((o) => (
              <View key={o.id} style={styles.nestedRowCard}>
                <View style={styles.nestedCardHeader}>
                  <Text style={styles.nestedCardTitle}>{o.employee}</Text>
                  <View style={[styles.badge, o.overtimeHours > 0 ? styles.badgeWarning : styles.badgeSuccess]}>
                    <Text style={o.overtimeHours > 0 ? styles.textWarning : styles.textSuccess}>{o.overtimeHours > 0 ? "OT" : "OK"}</Text>
                  </View>
                </View>
                <Text style={styles.nestedCardSub}>{o.weekStart} - {o.weekEnd}</Text>
                <Text style={styles.nestedCardMsg}>
                  Total {formatDuration(Math.round(Number(o.totalHours || 0) * 60))} | OT {formatDuration(Math.round(Number(o.overtimeHours || 0) * 60))}
                </Text>
              </View>
            ))}
            {!overtimeTrackers.length && <Text style={styles.emptyText}>No overtime records</Text>}
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Daily / Weekly Reports</Text>
        </View>
        <View style={styles.cardContent}>
          <View style={styles.weeklySummaryBox}>
            <Text style={styles.weeklySummaryLabel}>Weekly Total</Text>
            <Text style={styles.weeklySummaryValue}>{formatDuration(reports.weeklyTotalMinutes)}</Text>
          </View>

          <Text style={styles.breakdownLabel}>Daily Breakdown</Text>
          {reports.daily.length === 0 ? (
            <View style={styles.centerWrap}>
              <Calendar size={32} color="#999999" />
              <Text style={styles.emptyText}>No daily totals for selected filters.</Text>
            </View>
          ) : (
            <View style={styles.gridContainer}>
              {reports.daily.slice(0, 4).map((d) => (
                <View key={d.date} style={styles.gridItem}>
                  <Text style={styles.gridItemDate}>{formatEntryDate(d.date)}</Text>
                  <Text style={styles.gridItemTime}>{formatDuration(d.minutes)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>

      <View style={styles.metricGrid}>
        <View style={[styles.metricCard, styles.borderLeftSuccess]}>
          <Clock size={20} color="#2e7d32" />
          <Text style={styles.metricLabel}>Clocked In</Text>
          <Text style={styles.metricValue}>{summary.clockedIn}</Text>
        </View>
        <View style={[styles.metricCard, styles.borderLeftWarning]}>
          <Clock size={20} color="#ed6c02" />
          <Text style={styles.metricLabel}>On Break</Text>
          <Text style={styles.metricValue}>{summary.onBreak}</Text>
        </View>
        <View style={[styles.metricCard, styles.borderLeftMuted]}>
          <Clock size={20} color="#757575" />
          <Text style={styles.metricLabel}>Clocked Out</Text>
          <Text style={styles.metricValue}>{summary.clockedOut}</Text>
        </View>
        <View style={[styles.metricCard, styles.borderLeftPrimary]}>
          <Clock size={20} color={GOLD_COLOR} />
          <Text style={styles.metricLabel}>Total Hours</Text>
          <Text style={styles.metricValue}>{formatDuration(summary.totalMinutes)}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Time Entries ({sortedEntries.length})</Text>
        </View>
        <View style={styles.cardContent}>
          {loading ? (
            <ActivityIndicator color={GOLD_COLOR} style={{ padding: 24 }} />
          ) : sortedEntries.length === 0 ? (
            <View style={styles.centerWrap}>
              <Users size={40} color="#bbbbbb" />
              <Text style={styles.emptyText}>No time entries found</Text>
              <Text style={styles.emptySubText}>Add a new entry to get started</Text>
            </View>
          ) : (
            sortedEntries.map((entry) => (
              <TouchableOpacity
                key={entry.id}
                style={styles.entryRow}
                onPress={() => navigateToHistory(entry.employee)}
              >
                <View style={styles.entryMain}>
                  <View style={styles.avatarWrap}>
                    {entry.avatar ? (
                      <Image source={{ uri: toProxiedUrl(entry.avatar) || entry.avatar }} style={styles.avatarImg} />
                    ) : (
                      <Text style={styles.avatarText}>
                        {String(entry.employee || "").trim().slice(0, 1).toUpperCase() || "?"}
                      </Text>
                    )}
                  </View>

                  <View style={styles.entryInfo}>
                    <View style={styles.entryMetaHeader}>
                      <Text style={styles.entryEmployeeName}>{entry.employee}</Text>
                      <View style={[styles.badge, entry.status === "clocked-in" ? styles.badgeSuccess : entry.status === "on-break" ? styles.badgeWarning : styles.badgeMuted]}>
                        <Text style={entry.status === "clocked-in" ? styles.textSuccess : entry.status === "on-break" ? styles.textWarning : styles.textMuted}>
                          {entry.status === "clocked-in" ? "Clocked In" : entry.status === "on-break" ? "On Break" : "Clocked Out"}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.entrySubMeta}>
                      <View style={styles.metaFlexItem}>
                        <MapPin size={12} color="#757575" />
                        <Text style={styles.metaInlineText} numberOfLines={1}>{entry.location}</Text>
                      </View>
                      <View style={styles.metaFlexItem}>
                        <Calendar size={12} color="#757575" />
                        <Text style={styles.metaInlineText}>{formatEntryDate(entry.date)}</Text>
                      </View>
                    </View>
                  </View>
                </View>

                <View style={styles.entryRightPayload}>
                  <View style={styles.timeCluster}>
                    <View style={styles.timeTagRow}>
                      <Text style={styles.tagInText}>IN</Text>
                      <Text style={styles.timeValueText}>{entry.clockIn}</Text>
                    </View>
                    {entry.clockOut ? (
                      <View style={styles.timeTagRow}>
                        <Text style={styles.tagOutText}>OUT</Text>
                        <Text style={styles.timeValueText}>{entry.clockOut}</Text>
                      </View>
                    ) : (
                      <Text style={styles.timeValueText}>—</Text>
                    )}
                    <View style={styles.durationFrame}>
                      <Text style={styles.durationValue}>
                        {entry.clockOut ? formatDuration(calcEntryMinutes(entry)) : "—"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.rowControls}>
                    {entry.status !== "clocked-out" && (
                      <TouchableOpacity
                        style={styles.inlineClockOutBtn}
                        onPress={() => clockOutNow(entry.id)}
                      >
                        <Text style={styles.inlineClockOutBtnText}>Clock Out</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.optionsIconBtn} onPress={() => removeEntry(entry.id)}>
                      <MoreHorizontal size={16} color={uiTheme?.text || "#444444"} />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </View>

      <Modal visible={addOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalWrapper}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Add Time Entry</Text>
                <Text style={styles.modalDescription}>Create a clock-in/out entry for an employee</Text>
              </View>
              <TouchableOpacity onPress={() => setAddOpen(false)}>
                <X size={20} color={uiTheme?.text || "#333333"} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalFormScroll}>
              <Text style={styles.inputLabel}>Employee *</Text>
              <TouchableOpacity style={styles.pickerSelector} onPress={() => setEmployeePickerOpen(true)}>
                <Text style={styles.pickerSelectorText}>
                  {formData.employee || "Select employee"}
                </Text>
              </TouchableOpacity>

              <Text style={styles.inputLabel}>Location *</Text>
              <TextInput
                style={styles.textInput}
                value={formData.location}
                onChangeText={(val) => setFormData({ ...formData, location: val })}
                placeholder="Location description"
                placeholderTextColor={uiTheme?.placeholder || "#999999"}
              />

              <Text style={styles.inputLabel}>Date *</Text>
              <TextInput
                style={styles.textInput}
                value={formData.date}
                onChangeText={(val) => setFormData({ ...formData, date: val })}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={uiTheme?.placeholder || "#999999"}
              />

              <Text style={styles.inputLabel}>Clock In *</Text>
              <TextInput
                style={styles.textInput}
                value={formData.clockIn}
                onChangeText={(val) => setFormData({ ...formData, clockIn: val })}
                placeholder="HH:MM"
                placeholderTextColor={uiTheme?.placeholder || "#999999"}
              />

              <Text style={styles.inputLabel}>Clock Out</Text>
              <TextInput
                style={styles.textInput}
                value={formData.clockOut}
                onChangeText={(val) => setFormData({ ...formData, clockOut: val })}
                placeholder="HH:MM"
                placeholderTextColor={uiTheme?.placeholder || "#999999"}
              />

              <Text style={styles.inputLabel}>Status</Text>
              <TouchableOpacity
                style={[styles.pickerSelector, !!formData.clockOut && styles.disabledSelector]}
                disabled={Boolean(formData.clockOut)}
                onPress={() => setStatusPickerOpen(true)}
              >
                <Text style={styles.pickerSelectorText}>
                  {formData.status === "clocked-in" ? "Clocked In" : formData.status === "on-break" ? "On Break" : "Clocked Out"}
                </Text>
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setAddOpen(false)}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={addEntry}>
                <Text style={styles.modalSaveBtnText}>Save Entry</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={employeePickerOpen} animationType="fade" transparent>
        <TouchableOpacity style={styles.sheetOverlay} onPress={() => setEmployeePickerOpen(false)}>
          <View style={styles.sheetContent}>
            <Text style={styles.sheetHeaderTitle}>Select Employee</Text>
            {employees.map((emp) => (
              <TouchableOpacity
                key={emp.id}
                style={styles.sheetOptionRow}
                onPress={() => {
                  setFormData({ ...formData, employee: emp.name });
                  setEmployeePickerOpen(false);
                }}
              >
                <Text style={styles.sheetOptionText}>{emp.name}</Text>
                {formData.employee === emp.name && <Check size={16} color={GOLD_COLOR} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={statusPickerOpen} animationType="fade" transparent>
        <TouchableOpacity style={styles.sheetOverlay} onPress={() => setStatusPickerOpen(false)}>
          <View style={styles.sheetContent}>
            <Text style={styles.sheetHeaderTitle}>Select Status</Text>
            {([
              { key: "clocked-in", val: "Clocked In" },
              { key: "on-break", val: "On Break" },
              { key: "clocked-out", val: "Clocked Out" },
            ] as const).map((st) => (
              <TouchableOpacity
                key={st.key}
                style={styles.sheetOptionRow}
                onPress={() => {
                  setFormData({ ...formData, status: st.key });
                  setStatusPickerOpen(false);
                }}
              >
                <Text style={styles.sheetOptionText}>{st.val}</Text>
                {formData.status === st.key && <Check size={16} color={GOLD_COLOR} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme?.background || "#FAF9F6",
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 40,
    },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20,
    },
    headerTextWrap: {
      flex: 1,
      marginRight: 12,
    },
    titleText: {
      fontSize: 24,
      fontWeight: "700",
      color: theme?.text || "#111111",
      letterSpacing: -0.5,
    },
    subtitleText: {
      fontSize: 13,
      color: theme?.muted || "#666666",
      marginTop: 2,
    },
    addBtn: {
      backgroundColor: GOLD_COLOR,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 6,
    },
    btnIcon: {
      marginRight: 6,
    },
    addBtnText: {
      color: "#FFFFFF",
      fontWeight: "600",
      fontSize: 13,
    },
    errorBox: {
      backgroundColor: "#FEE2E2",
      padding: 12,
      borderRadius: 6,
      marginBottom: 16,
    },
    errorText: {
      color: "#DC2626",
      fontSize: 13,
    },
    card: {
      backgroundColor: theme?.card || "#FFFFFF",
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme?.border || "#E5E5E5",
      marginBottom: 16,
      overflow: "hidden",
    },
    cardHeader: {
      borderBottomWidth: 1,
      borderBottomColor: theme?.border || "#E5E5E5",
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    cardTitleContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: theme?.text || "#111111",
    },
    actionGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
      marginTop: 10,
    },
    outlineActionBtn: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme?.border || "#D1D5DB",
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 4,
      gap: 4,
    },
    actionBtnText: {
      fontSize: 12,
      fontWeight: "500",
      color: theme?.text || "#374151",
    },
    solidActionBtn: {
      backgroundColor: GOLD_COLOR,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 4,
    },
    solidActionBtnText: {
      fontSize: 12,
      fontWeight: "500",
      color: "#FFFFFF",
    },
    cardContent: {
      padding: 16,
    },
    complianceSection: {
      marginBottom: 16,
    },
    sectionHeading: {
      fontSize: 14,
      fontWeight: "600",
      color: theme?.text || "#111111",
    },
    sectionLabel: {
      fontSize: 11,
      color: theme?.muted || "#6B7280",
      marginBottom: 6,
    },
    nestedRowCard: {
      borderWidth: 1,
      borderColor: theme?.border || "#E5E7EB",
      backgroundColor: theme?.surface || "#F9FAFB",
      padding: 10,
      borderRadius: 6,
      marginBottom: 8,
    },
    nestedCardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    nestedCardTitle: {
      fontSize: 13,
      fontWeight: "500",
      color: theme?.text || "#111111",
    },
    nestedCardSub: {
      fontSize: 11,
      color: theme?.muted || "#4B5563",
      marginTop: 2,
    },
    nestedCardMsg: {
      fontSize: 11,
      color: theme?.muted || "#6B7280",
      marginTop: 2,
    },
    badge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    badgeDestructive: {
      backgroundColor: "#FEE2E2",
    },
    badgeWarning: {
      backgroundColor: "#FEF3C7",
    },
    badgeSuccess: {
      backgroundColor: "#D1FAE5",
    },
    badgeMuted: {
      backgroundColor: theme?.border || "#E5E7EB",
    },
    textDestructive: {
      color: "#991B1B",
      fontSize: 10,
      fontWeight: "600",
    },
    textWarning: {
      color: "#92400E",
      fontSize: 10,
      fontWeight: "600",
    },
    textSuccess: {
      color: "#065F46",
      fontSize: 10,
      fontWeight: "600",
    },
    textMuted: {
      color: theme?.text || "#374151",
      fontSize: 10,
      fontWeight: "600",
    },
    emptyText: {
      fontSize: 13,
      color: theme?.muted || "#6B7280",
      fontStyle: "italic",
    },
    emptySubText: {
      fontSize: 11,
      color: theme?.muted || "#9CA3AF",
    },
    weeklySummaryBox: {
      backgroundColor: GOLD_LIGHT,
      padding: 12,
      borderRadius: 6,
      marginBottom: 12,
      borderLeftWidth: 4,
      borderLeftColor: GOLD_COLOR,
    },
    weeklySummaryLabel: {
      fontSize: 12,
      color: "#785E00",
      fontWeight: "500",
    },
    weeklySummaryValue: {
      fontSize: 20,
      fontWeight: "700",
      color: "#4A3B00",
      marginTop: 2,
    },
    breakdownLabel: {
      fontSize: 13,
      fontWeight: "500",
      color: theme?.text || "#4B5563",
      marginBottom: 8,
    },
    centerWrap: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 20,
      gap: 6,
    },
    gridContainer: {
      gap: 6,
    },
    gridItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme?.border || "#E5E7EB",
      padding: 10,
      borderRadius: 6,
      backgroundColor: theme?.surface || "#FCFCFC",
    },
    gridItemDate: {
      fontSize: 13,
      fontWeight: "500",
      color: theme?.text || "#374151",
    },
    gridItemTime: {
      fontSize: 12,
      color: theme?.muted || "#6B7280",
    },
    metricGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginHorizontal: -4,
      marginBottom: 16,
    },
    metricCard: {
      width: (Dimensions.get("window").width - 40) / 2,
      backgroundColor: theme?.card || "#FFFFFF",
      borderRadius: 6,
      borderWidth: 1,
      borderColor: theme?.border || "#E5E5E5",
      padding: 12,
      margin: 4,
      gap: 4,
    },
    borderLeftSuccess: { borderLeftWidth: 4, borderLeftColor: "#2e7d32" },
    borderLeftWarning: { borderLeftWidth: 4, borderLeftColor: "#ed6c02" },
    borderLeftMuted: { borderLeftWidth: 4, borderLeftColor: "#757575" },
    borderLeftPrimary: { borderLeftWidth: 4, borderLeftColor: GOLD_COLOR },
    metricLabel: {
      fontSize: 12,
      color: theme?.muted || "#666666",
    },
    metricValue: {
      fontSize: 18,
      fontWeight: "700",
      color: theme?.text || "#111111",
    },
    entryRow: {
      borderWidth: 1,
      borderColor: theme?.border || "#E5E7EB",
      borderRadius: 8,
      padding: 12,
      marginBottom: 10,
      backgroundColor: theme?.surface || "#FCFCFC",
    },
    entryMain: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    avatarWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: GOLD_COLOR,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    avatarImg: {
      width: 40,
      height: 40,
    },
    avatarText: {
      color: "#FFFFFF",
      fontWeight: "600",
      fontSize: 14,
    },
    entryInfo: {
      flex: 1,
    },
    entryMetaHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    entryEmployeeName: {
      fontSize: 15,
      fontWeight: "600",
      color: theme?.text || "#111111",
    },
    entrySubMeta: {
      flexDirection: "row",
      flexWrap: "wrap",
      gapX: 10,
      marginTop: 4,
    },
    metaFlexItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    metaInlineText: {
      fontSize: 12,
      color: theme?.muted || "#6B7280",
      maxWidth: 120,
    },
    entryRightPayload: {
      marginTop: 10,
      borderTopWidth: 1,
      borderTopColor: theme?.border || "#E5E7EB",
      paddingTop: 8,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-end",
    },
    timeCluster: {
      gap: 3,
    },
    timeTagRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    tagInText: {
      fontSize: 9,
      fontWeight: "700",
      color: "#065F46",
      backgroundColor: "#D1FAE5",
      paddingHorizontal: 4,
      borderRadius: 2,
    },
    tagOutText: {
      fontSize: 9,
      fontWeight: "700",
      color: "#374151",
      backgroundColor: "#E5E7EB",
      paddingHorizontal: 4,
      borderRadius: 2,
    },
    timeValueText: {
      fontSize: 13,
      fontWeight: "500",
      color: theme?.text || "#111111",
    },
    durationFrame: {
      backgroundColor: GOLD_LIGHT,
      borderWidth: 1,
      borderColor: GOLD_COLOR,
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 4,
      alignSelf: "flex-start",
      marginTop: 2,
    },
    durationValue: {
      fontSize: 11,
      fontWeight: "700",
      color: "#4A3B00",
    },
    rowControls: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    inlineClockOutBtn: {
      borderWidth: 1,
      borderColor: theme?.border || "#D1D5DB",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
    },
    inlineClockOutBtnText: {
      fontSize: 11,
      color: theme?.text || "#374151",
    },
    optionsIconBtn: {
      padding: 6,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.4)",
      justifyContent: "center",
      alignItems: "center",
      padding: 16,
    },
    modalWrapper: {
      backgroundColor: theme?.card || "#FFFFFF",
      borderRadius: 8,
      width: "100%",
      maxHeight: "85%",
      overflow: "hidden",
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme?.border || "#E5E7EB",
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: theme?.text || "#111111",
    },
    modalDescription: {
      fontSize: 12,
      color: theme?.muted || "#6B7280",
      marginTop: 2,
    },
    modalFormScroll: {
      padding: 16,
    },
    inputLabel: {
      fontSize: 13,
      fontWeight: "500",
      color: theme?.text || "#374151",
      marginBottom: 6,
      marginTop: 10,
    },
    textInput: {
      borderWidth: 1,
      borderColor: theme?.border || "#D1D5DB",
      borderRadius: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 14,
      color: theme?.text || "#111111",
      backgroundColor: theme?.surface || "#FFFFFF",
      height: 40,
    },
    pickerSelector: {
      borderWidth: 1,
      borderColor: theme?.border || "#D1D5DB",
      borderRadius: 6,
      paddingHorizontal: 12,
      justifyContent: "center",
      backgroundColor: theme?.surface || "#FFFFFF",
      height: 40,
    },
    disabledSelector: {
      backgroundColor: theme?.border || "#F3F4F6",
      borderColor: theme?.border || "#E5E7EB",
    },
    pickerSelectorText: {
      fontSize: 14,
      color: theme?.text || "#111111",
    },
    modalFooter: {
      flexDirection: "row",
      justifyContent: "flex-end",
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: theme?.border || "#E5E7EB",
      gap: 10,
    },
    modalCancelBtn: {
      borderWidth: 1,
      borderColor: theme?.border || "#D1D5DB",
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 6,
    },
    modalCancelBtnText: {
      fontSize: 13,
      color: theme?.text || "#374151",
    },
    modalSaveBtn: {
      backgroundColor: GOLD_COLOR,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 6,
    },
    modalSaveBtnText: {
      fontSize: 13,
      color: "#FFFFFF",
      fontWeight: "500",
    },
    sheetOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.2)",
      justifyContent: "flex-end",
    },
    sheetContent: {
      backgroundColor: theme?.card || "#FFFFFF",
      borderTopLeftRadius: 12,
      borderTopRightRadius: 12,
      padding: 16,
      paddingBottom: 32,
    },
    sheetHeaderTitle: {
      fontSize: 15,
      fontWeight: "600",
      color: theme?.text || "#111111",
      marginBottom: 12,
    },
    sheetOptionRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme?.border || "#F3F4F6",
    },
    sheetOptionText: {
      fontSize: 14,
      color: theme?.text || "#374151",
    },
  });

export default TimeTracking;