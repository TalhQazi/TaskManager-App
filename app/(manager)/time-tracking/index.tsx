import React, { useEffect, useMemo, useState } from "react";
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
  SafeAreaView,
  KeyboardAvoidingView,
} from "react-native";
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
  ChevronDown,
} from "lucide-react-native";

// --- Preservation of your existing Core Web Client API imports ---
import {
  apiFetch,
  createResource,
  deleteResource,
  listResource,
} from "@/lib/admin/apiClient";


// NOTE: For true PDF/CSV generation in Expo, replace web jsPDF with 'expo-print' and 'expo-sharing'
import * as Sharing from "expo-sharing";
import Colors from "@/constants/colors";

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

const statusClasses: Record<string, string> = {
  "clocked-in": "#4ADE80",
  "clocked-out": "#94A3B8",
  "on-break": "#F59E0B",
};

const statusLabels: Record<string, string> = {
  "clocked-in": "Clocked In",
  "clocked-out": "Clocked Out",
  "on-break": "On Break",
};

function getInitials(name: string) {
  return String(name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("")
    .slice(0, 2);
}

function parseMinutes(hhmm: string) {
  const [h, m] = String(hhmm || "")
    .split(":")
    .map((x) => Number(x));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

function formatDuration(totalMinutes: number) {
  const minutes = Math.max(0, Math.floor(totalMinutes));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

function calcEntryMinutes(entry: TimeEntry) {
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

function getLocalDateInputValue(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toLocalDateKey(value: string) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const m = /^\d{4}-\d{2}-\d{2}/.exec(raw);
  if (m) return m[0];
  const d = new Date(raw);
  if (!Number.isFinite(d.getTime())) return raw;
  return getLocalDateInputValue(d);
}

function formatEntryDate(value: string) {
  const key = toLocalDateKey(value);
  if (!key) return "—";
  const d = new Date(`${key}T00:00:00`);
  if (!Number.isFinite(d.getTime())) return key;
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function formatLocalTime(value: string) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const d = new Date(raw);
  if (!Number.isFinite(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function resolveClockTime(clockAt: string | undefined, hhmm: string | undefined) {
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
  const avatar = String(e.avatar || "").trim();

  return { id, employee, initials, avatar: avatar || undefined, location, date, clockIn, clockOut, clockInAt, clockOutAt, status };
}

export default function TimeTracking() {
  const [addOpen, setAddOpen] = useState(false);
  const [complianceLoading, setComplianceLoading] = useState(false);
  const [complianceError, setComplianceError] = useState<string | null>(null);
  const [complianceFlags, setComplianceFlags] = useState<ComplianceFlag[]>([]);
  const [overtimeTrackers, setOvertimeTrackers] = useState<OvertimeTracker[]>([]);
  const [auditLogs, setAuditLogs] = useState<TimeEditAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

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

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        setApiError(null);
        const res = await listResource<TimeEntryApi>("time-entries", { page: currentPage, limit: PAGE_SIZE });
        if (!mounted) return;

        if (res && typeof res === "object" && "items" in res) {
          setEntries(res.items.map(normalizeTimeEntry));
          setTotalPages(res.pagination?.totalPages || 1);
        } else {
          setEntries(res.map(normalizeTimeEntry));
          setTotalPages(1);
        }

        if (employees.length === 0) {
          try {
            const employeeList = await listResource<Employee>("employees");
            const userList = await listResource<User>("users");
            if (mounted) {
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
            }
          } catch (err) {
            console.error("Failed to load dependency data:", err);
          }
        }
      } catch (e) {
        if (!mounted) return;
        setApiError(e instanceof Error ? e.message : "Failed to load time entries");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    };
    void load();
    return () => { mounted = false; };
  }, [currentPage]);

  const refresh = async () => {
    const res = await listResource<TimeEntryApi>("time-entries", { page: currentPage, limit: PAGE_SIZE });
    if (res && typeof res === "object" && "items" in res) {
      setEntries(res.items.map(normalizeTimeEntry));
      setTotalPages(res.pagination?.totalPages || 1);
    } else {
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
      setComplianceError(e instanceof Error ? e.message : "Failed to load compliance data");
    } finally {
      setComplianceLoading(false);
    }
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
    return { daily, weeklyTotalMinutes: daily.reduce((acc, d) => acc + d.minutes, 0) };
  }, [sortedEntries]);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scrollPadding}>
          
          {/* Module Header Title Segment */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.pageTitle}>Time Tracking</Text>
              <Text style={styles.subtitle}>Monitor workspace operational shifts.</Text>
            </View>
            <TouchableOpacity style={styles.addButton} onPress={() => setAddOpen(true)}>
              <Plus size={16} color="#FFFFFF" />
              <Text style={styles.addButtonText}>Add Entry</Text>
            </TouchableOpacity>
          </View>

          {apiError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{apiError}</Text>
            </View>
          )}

          {/* Compliance Card Metrics Block */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <ShieldAlert size={20} color="#F59E0B" />
              <Text style={styles.cardTitle}>Compliance Center</Text>
            </View>
            <View style={styles.actionRowContainer}>
              <TouchableOpacity style={styles.utilityBtn} onPress={loadCompliance}>
                <Search size={14} color="#475569" />
                <Text style={styles.utilityBtnTxt}>Sync</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.utilityBtn} onPress={() => Alert.alert("Exporting", "Formatting structural logs configurations...")}>
                <FileText size={14} color="#475569" />
                <Text style={styles.utilityBtnTxt}>Export Logs</Text>
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.complianceHorizontalRow}>
              {complianceFlags.map((f) => (
                <View key={f.id} style={styles.miniLogItem}>
                  <Text style={styles.miniLogEmployee}>{f.employee}</Text>
                  <Text style={styles.miniLogDesc} numberOfLines={2}>{f.message}</Text>
                </View>
              ))}
              {complianceFlags.length === 0 && (
                <Text style={styles.emptyStateLabel}>No outstanding compliance flags discovered.</Text>
              )}
            </ScrollView>
          </View>

          {/* Operations Core Performance Counter Cards */}
          <View style={styles.metricsGrid}>
            <View style={[styles.metricCard, { borderLeftColor: "#4ADE80" }]}>
              <Clock size={16} color="#4ADE80" />
              <Text style={styles.metricLabel}>Clocked In</Text>
              <Text style={styles.metricValue}>{summary.clockedIn}</Text>
            </View>
            <View style={[styles.metricCard, { borderLeftColor: "#F59E0B" }]}>
              <Clock size={16} color="#F59E0B" />
              <Text style={styles.metricLabel}>On Break</Text>
              <Text style={styles.metricValue}>{summary.onBreak}</Text>
            </View>
            <View style={[styles.metricCard, { borderLeftColor: "#94A3B8" }]}>
              <Clock size={16} color="#94A3B8" />
              <Text style={styles.metricLabel}>Clocked Out</Text>
              <Text style={styles.metricValue}>{summary.clockedOut}</Text>
            </View>
            <View style={[styles.metricCard, { borderLeftColor: "#6366F1" }]}>
              <Clock size={16} color="#6366F1" />
              <Text style={styles.metricLabel}>Total Hours</Text>
              <Text style={styles.metricValue}>{formatDuration(summary.totalMinutes)}</Text>
            </View>
          </View>

          {/* Data Entries Display Registry */}
          <Text style={styles.sectionHeading}>Active Shifts Registry ({sortedEntries.length})</Text>
          {loading ? (
            <ActivityIndicator size="small" color="#6366F1" style={styles.loaderSpacing} />
          ) : (
            sortedEntries.map((entry) => (
              <View key={entry.id} style={styles.shiftCard}>
                <View style={styles.shiftCardMainInfo}>
                  <View style={styles.initialsBubble}>
                    <Text style={styles.initialsText}>{entry.initials}</Text>
                  </View>
                  <View style={styles.metaDataColumn}>
                    <View style={styles.badgeRow}>
                      <Text style={styles.employeeName}>{entry.employee}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: statusClasses[entry.status] + "22" }]}>
                        <Text style={[styles.statusBadgeText, { color: statusClasses[entry.status] }]}>{statusLabels[entry.status]}</Text>
                      </View>
                    </View>
                    <Text style={styles.subMetaRow}><MapPin size={12} color="#64748B" /> {entry.location}</Text>
                    <Text style={styles.subMetaRow}><Calendar size={12} color="#64748B" /> {formatEntryDate(entry.date)}</Text>
                  </View>
                </View>

                <View style={styles.shiftCardActionControls}>
                  <View style={styles.timeLabelContainer}>
                    <Text style={styles.timeValueText}>In: {entry.clockIn}</Text>
                    <Text style={styles.timeValueText}>Out: {entry.clockOut || "—"}</Text>
                  </View>
                  <View style={styles.btnActionInlineGroup}>
                    {entry.status !== "clocked-out" && (
                      <TouchableOpacity style={styles.clockOutBtnInline} onPress={() => clockOutNow(entry.id)}>
                        <Text style={styles.clockOutBtnInlineText}>Clock Out</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.moreOptionsButton} onPress={() => handleEntryActions(entry)}>
                      <MoreHorizontal size={18} color="#475569" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>

        {/* Add Entry Workspace Modal Sheet */}
        <Modal visible={addOpen} animationType="slide" transparent={false}>
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalNavigationHeader}>
              <Text style={styles.modalTitle}>Add Manual Time Entry</Text>
              <TouchableOpacity onPress={() => setAddOpen(false)}>
                <X size={20} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalContentBody}>
              <Text style={styles.fieldHeading}>Employee Selection *</Text>
              <TouchableOpacity style={styles.pickerSelectorBox} onPress={showEmployeePicker}>
                <Text style={styles.pickerSelectorBoxText}>{formData.employee || "Select target active workspace employee"}</Text>
                <ChevronDown size={16} color="#64748B" />
              </TouchableOpacity>

              <Text style={styles.fieldHeading}>Location Parameter Configuration *</Text>
              <TextInput style={styles.inputField} placeholder="e.g. Building A Core Warehouse" value={formData.location} onChangeText={(txt) => setFormData({ ...formData, location: txt })} placeholderTextColor="#94A3B8" />

              <Text style={styles.fieldHeading}>Calendar Operational Date *</Text>
              <TextInput style={styles.inputField} placeholder="YYYY-MM-DD" value={formData.date} onChangeText={(txt) => setFormData({ ...formData, date: txt })} placeholderTextColor="#94A3B8" />

              <Text style={styles.fieldHeading}>Clock In Time (HH:MM) *</Text>
              <TextInput style={styles.inputField} placeholder="e.g. 09:00" value={formData.clockIn} onChangeText={(txt) => setFormData({ ...formData, clockIn: txt })} placeholderTextColor="#94A3B8" />

              <Text style={styles.fieldHeading}>Clock Out Time (HH:MM)</Text>
              <TextInput style={styles.inputField} placeholder="e.g. 17:00" value={formData.clockOut} onChangeText={(txt) => setFormData({ ...formData, clockOut: txt })} placeholderTextColor="#94A3B8" />

              <Text style={styles.fieldHeading}>Initial Dynamic Operational Status</Text>
              <TouchableOpacity style={styles.pickerSelectorBox} onPress={showStatusPicker}>
                <Text style={styles.pickerSelectorBoxText}>{statusLabels[formData.status]}</Text>
                <ChevronDown size={16} color="#64748B" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.saveSubmitButton} onPress={addEntry}>
                <Text style={styles.saveSubmitButtonText}>Commit Sheet Parameters</Text>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </Modal>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  scrollPadding: { padding: 16, paddingBottom: 40 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  pageTitle: { fontSize: 24, fontWeight: "800", color: Colors.surface },
  subtitle: { fontSize: 13, color: "#64748B", marginTop: 2 },
  addButton: { flexDirection: "row", alignItems: "center", backgroundColor: "#0F172A", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, gap: 6 },
  addButtonText: { color: "#FFFFFF", fontWeight: "600", fontSize: 13 },
  errorBanner: { backgroundColor: "#FEE2E2", padding: 12, borderRadius: 8, marginBottom: 16, borderWidth: 1, borderColor: "#FCA5A5" },
  errorText: { color: "#991B1B", fontSize: 13, fontWeight: "500" },
  card: { backgroundColor: Colors.background, borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "#E2E8F0" },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: "700", color: Colors.surface },
  actionRowContainer: { flexDirection: "row", gap: 8, marginBottom: 12 },
  utilityBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#F1F5F9", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, gap: 4 },
  utilityBtnTxt: { fontSize: 12, fontWeight: "600", color: "#475569" },
  complianceHorizontalRow: { gap: 10, paddingVertical: 4 },
  miniLogItem: { backgroundColor: "#F8FAFC", padding: 10, borderRadius: 8, width: 200, borderWidth: 1, borderColor: "#E2E8F0" },
  miniLogEmployee: { fontSize: 13, fontWeight: "700", color: "#0F172A" },
  miniLogDesc: { fontSize: 11, color: "#64748B", marginTop: 4 },
  emptyStateLabel: { fontSize: 13, color: "#94A3B8", fontStyle: "italic", paddingVertical: 10 },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 24 },
  metricCard: { backgroundColor: Colors.background, borderRadius: 10, padding: 12, width: "48%", borderWidth: 1, borderColor: "#E2E8F0", borderLeftWidth: 4 },
  metricLabel: { fontSize: 12, color: Colors.surface, fontWeight: "500", marginTop: 4 },
  metricValue: { fontSize: 18, fontWeight: "800", color: Colors.surface, marginTop: 2 },
  sectionHeading: { fontSize: 15, fontWeight: "700", color: Colors.surface, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 },
  loaderSpacing: { paddingVertical: 20 },
  shiftCard: { backgroundColor: Colors.background, borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: "#E2E8F0" },
  shiftCardMainInfo: { flexDirection: "row", gap: 12, borderBottomWidth: 1, borderColor: "#F1F5F9", paddingBottom: 12 },
  initialsBubble: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#6366F1", alignItems: "center", justifyContent: "center" },
  initialsText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
  metaDataColumn: { flex: 1, gap: 2 },
  badgeRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  employeeName: { fontSize: 16, fontWeight: "600", color: Colors.surface},
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusBadgeText: { fontSize: 11, fontWeight: "700" },
  subMetaRow: { fontSize: 13, color: "#64748B", flexDirection: "row", alignItems: "center", gap: 4 },
  shiftCardActionControls: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 },
  timeLabelContainer: { gap: 2 },
  timeValueText: { fontSize: 13, fontWeight: "600", color: "#334155" },
  btnActionInlineGroup: { flexDirection: "row", alignItems: "center", gap: 8 },
  clockOutBtnInline: { backgroundColor: "#EF4444", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  clockOutBtnInlineText: { color: "#FFFFFF", fontSize: 12, fontWeight: "600" },
  moreOptionsButton: { padding: 6, backgroundColor: "#F1F5F9", borderRadius: 6 },
  modalContainer: { flex: 1, backgroundColor: "#FFFFFF" },
  modalNavigationHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderColor: "#E2E8F0" },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#0F172A" },
  modalContentBody: { padding: 16, gap: 14 },
  fieldHeading: { fontSize: 14, fontWeight: "600", color: "#334155" },
  pickerSelectorBox: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 8, padding: 12, backgroundColor: "#F8FAFC" },
  pickerSelectorBoxText: { fontSize: 14, color: "#334155" },
  inputField: { borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 8, padding: 12, fontSize: 14, color: "#0F172A", backgroundColor: "#FFFFFF" },
  saveSubmitButton: { backgroundColor: "#6366F1", padding: 14, borderRadius: 8, alignItems: "center", marginTop: 10 },
  saveSubmitButtonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
});