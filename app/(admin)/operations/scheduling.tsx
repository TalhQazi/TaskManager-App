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
  FlatList,
  SafeAreaView,
  KeyboardAvoidingView, 
  Platform,
} from "react-native";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  MoreHorizontal,
  Calendar as CalendarIcon,
  User,
  Clock,
  X,
  AlertCircle,
  ChevronDown,
} from "lucide-react-native";
import { createResource, deleteResource, listResource, updateResource } from "@/lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";

interface ScheduleItem {
  id: string;
  location: string;
  employee: string;
  date: string;
  startTime: string;
  endTime: string;
  status: "scheduled" | "completed" | "canceled";
  plannedTask?: string;
  reminder?: "none" | "30m" | "1h" | "1d";
  type?: string;
}

interface LocationItem {
  id: string;
  name: string;
}

interface Employee {
  id: string;
  name: string;
  initials: string;
  email: string;
  status: "active" | "inactive" | "on-leave";
}

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: "admin" | "manager" | "employee";
  status: "active" | "inactive" | "pending";
}

type BackendScheduleItem = Partial<ScheduleItem> & {
  _id?: string;
  assignee?: string;
};

const toDateOnly = (value: string) => {
  const v = String(value || "").trim();
  if (!v) return "";
  const idx = v.indexOf("T");
  return idx >= 0 ? v.slice(0, idx) : v;
};

function normalizeScheduleItem(s: BackendScheduleItem): ScheduleItem {
  return {
    id: String(s.id || s._id || "").trim(),
    location: String(s.location || "").trim(),
    employee: String(s.employee || s.assignee || "").trim(),
    date: toDateOnly(String(s.date || "").trim()),
    startTime: String(s.startTime || "").trim(),
    endTime: String(s.endTime || "").trim(),
    status: (String(s.status || "scheduled") as ScheduleItem["status"]) || "scheduled",
    plannedTask: String(s.plannedTask || "").trim() || "",
    reminder: (String(s.reminder || "none") as NonNullable<ScheduleItem["reminder"]>) || "none",
    type: String(s.type || "").trim() || undefined,
  };
}

const normalizeDateForInput = (value: string) => {
  if (!value) return "";
  const trimmed = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  if (trimmed.includes("T")) {
    const maybe = trimmed.split("T")[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(maybe)) return maybe;
  }
  return trimmed;
};

const normalizeTimeForInput = (value: string) => {
  if (!value) return "";
  const trimmed = String(value).trim();
  if (/^\d{2}:\d{2}$/.test(trimmed)) return trimmed;
  return trimmed;
};

function buildColors(uiTheme: any, isDark: boolean) {
  return {
    background: uiTheme.panelColors?.dashboardBackground || (isDark ? "#0F172A" : "#F8FAFC"),
    cardBg: uiTheme.panelColors?.dashboardCardBackground || (isDark ? "#0F172A" : "#FFFFFF"),
    text: uiTheme.panelColors?.dashboardTextColor || (isDark ? "#F8FAFC" : "#0F172A"),
    surface: uiTheme.panelColors?.dashboardTextColor || (isDark ? "#F8FAFC" : "#0F172A"),
    textSecondary: isDark ? "#CBD5E1" : "#475569",
    textMuted: isDark ? "#94A3B8" : "#64748B",
    border: isDark ? "#334155" : "#E2E8F0",
    borderLight: isDark ? "rgba(255,255,255,0.08)" : "#F1F5F9",
    inputBg: isDark ? "#0F172A" : "#FFFFFF",
    inputBorder: isDark ? "#334155" : "#CBD5E1",
    searchBg: isDark ? "#0F172A" : "#F8FAFC",
    placeholderText: isDark ? "#94A3B8" : "#94A3B8",
    primary: uiTheme.customColors?.primary || (isDark ? "#2563eb" : "#2563eb"),
    primaryText: "#FFFFFF",
    infoBg: isDark ? "#0F172A" : "#EFF6FF",
    successBg: isDark ? "#0F172A" : "#DCFCE7",
    dangerBg: isDark ? "#0F172A" : "#FEE2E2",
    dangerText: "#DC2626",
    warning: uiTheme.customColors?.warning || "#f59e0b",
    overlayBg: "rgba(0,0,0,0.4)",
  };
}

function createStyles(colors: ReturnType<typeof buildColors>) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    container: { flex: 1, padding: 16 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    title: { fontSize: 24, fontWeight: 'bold', color: colors.surface },
    subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
    addButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
    addButtonText: { color: colors.primaryText, fontSize: 13, fontWeight: '600', marginLeft: 4 },
    segmentedWrapper: { flexDirection: 'row', backgroundColor: colors.searchBg, borderRadius: 8, padding: 4, marginBottom: 12 },
    segmentedItem: { flex: 1, paddingVertical: 6, alignItems: 'center', borderRadius: 6 },
    segmentedActiveItem: { backgroundColor: colors.cardBg },
    segmentedText: { fontSize: 13, color: colors.textMuted, fontWeight: '500' },
    segmentedActiveText: { color: colors.text, fontWeight: '600' },
    controlBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardBg, padding: 10, borderRadius: 12, marginBottom: 14 },
    searchWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.searchBg, borderRadius: 8, paddingHorizontal: 10, height: 40, flex: 1 },
    searchIcon: { marginRight: 6 },
    searchInput: { flex: 1, fontSize: 13, color: colors.text, paddingVertical: 0 },
    errorContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.dangerBg, padding: 12, borderRadius: 8, marginBottom: 14 },
    errorText: { color: colors.dangerText, fontSize: 13, fontWeight: '500', flex: 1 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 40 },
    emptyContainer: { alignItems: 'center', marginVertical: 60, gap: 8 },
    emptyText: { color: colors.textMuted, fontSize: 14, fontWeight: '500' },
    card: { backgroundColor: colors.cardBg, padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    cardHeaderLabelRow: { flexDirection: 'row', flex: 1, alignItems: 'center' },
    iconWrapper: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.infoBg, justifyContent: 'center', alignItems: 'center' },
    cardLocationText: { fontSize: 14, fontWeight: '700', color: colors.surface },
    optionsButton: { padding: 4, marginLeft: 8 },
    cardInfoGrid: { marginTop: 12, gap: 6 },
    infoLine: { flexDirection: 'row', alignItems: 'center' },
    infoLineText: { fontSize: 13, color: colors.textSecondary },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border },
    badge: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, backgroundColor: colors.searchBg },
    badgeText: { fontSize: 10, fontWeight: '700', color: colors.textSecondary },
    statusBadge: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6 },
    statusText: { fontSize: 10, fontWeight: '700' },
    statusSuccess: { backgroundColor: colors.successBg },
    statusDanger: { backgroundColor: colors.dangerBg },
    statusInfo: { backgroundColor: colors.infoBg },
    textSuccess: { color: '#15803d' },
    textDanger: { color: '#b91c1c' },
    textInfo: { color: '#0369a1' },
    modalSafeArea: { flex: 1, backgroundColor: colors.cardBg },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.primary, padding: 16 },
    modalHeaderTitle: { fontSize: 18, fontWeight: 'bold', color: colors.primaryText },
    modalScroll: { padding: 16 },
    label: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6, marginTop: 12 },
    input: { borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 8, padding: 12, fontSize: 14, marginBottom: 12, color: colors.text, backgroundColor: colors.inputBg },
    dropdownTrigger: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 8, padding: 14, marginBottom: 12, backgroundColor: colors.searchBg },
    dropdownTriggerText: { fontSize: 14, color: colors.text, fontWeight: '500' },
    submitButton: { backgroundColor: colors.primary, padding: 14, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
    submitButtonText: { color: colors.primaryText, fontSize: 15, fontWeight: 'bold' },
    cancelButton: { padding: 14, alignItems: 'center', borderRadius: 8 },
    pickerOverlay: { flex: 1, backgroundColor: colors.overlayBg, justifyContent: 'center', alignItems: 'center', padding: 24 },
    pickerWindow: { backgroundColor: colors.cardBg, width: '100%', borderRadius: 16, paddingVertical: 16 },
    pickerTitle: { fontSize: 15, fontWeight: '700', color: colors.text, paddingHorizontal: 16, marginBottom: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
    pickerItem: { paddingVertical: 14, paddingHorizontal: 16 },
    pickerItemText: { fontSize: 14, color: colors.textSecondary, fontWeight: '500' },
    calendarContainer: { backgroundColor: colors.cardBg, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: colors.border },
    calendarControlRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 10 },
    calNavButton: { padding: 6, backgroundColor: colors.searchBg, borderRadius: 6 },
    calendarTitle: { fontSize: 15, fontWeight: '700', color: colors.surface },
    calEmptyText: { color: colors.textMuted, fontSize: 13, textAlign: 'center', marginVertical: 30 },
    calItemCard: { padding: 12, backgroundColor: colors.successBg, borderWidth: 1, borderColor: colors.border, borderRadius: 8, marginTop: 10 },
    calItemTime: { fontSize: 11, color: '#166534', fontWeight: '700' },
    calItemBadge: { fontSize: 10, backgroundColor: colors.successBg, paddingHorizontal: 6, paddingVertical: 2, color: '#15803d', fontWeight: '700', borderRadius: 4 },
    calItemLoc: { fontSize: 14, fontWeight: '700', color: colors.surface, marginTop: 4 },
    calItemEmp: { fontSize: 12, color: '#166534', marginTop: 2 },
    weekColumn: { width: 100, backgroundColor: colors.searchBg, borderRadius: 8, padding: 6, minHeight: 180, borderWidth: 1, borderColor: colors.border },
    weekColumnHeader: { alignItems: 'center', backgroundColor: colors.cardBg, paddingVertical: 4, borderRadius: 6 },
    weekDayLabel: { fontSize: 10, color: colors.textMuted, fontWeight: '700' },
    weekDateLabel: { fontSize: 14, fontWeight: 'bold', color: colors.surface },
    weekItemNode: { backgroundColor: colors.infoBg, padding: 6, borderRadius: 4, borderWidth: 0.5, borderColor: colors.border },
    weekItemNodeText: { fontSize: 11, fontWeight: '600', color: colors.text },
  });
}

export default function Scheduling() {
  const [searchQuery, setSearchQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<ScheduleItem | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "daily" | "weekly">("list");
  const [currentDate, setCurrentDate] = useState(new Date());

  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  const [activePicker, setActivePicker] = useState<{
    field: "location" | "employee" | "type" | "status" | "reminder";
    mode: "add" | "edit";
  } | null>(null);

  const { uiTheme } = useTheme();
  const isDark = useMemo(
    () => ["dark-minimal", "neon-tech", "metallic-elite", "executive-black", "high-contrast", "energy-mode"].includes(uiTheme.theme),
    [uiTheme.theme]
  );
  const colors = useMemo(() => buildColors(uiTheme, isDark), [uiTheme, isDark]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [formData, setFormData] = useState({
    location: "",
    employee: "",
    date: new Date().toISOString().split("T")[0],
    startTime: "09:00",
    endTime: "17:00",
    status: "scheduled" as ScheduleItem["status"],
    plannedTask: "",
    reminder: "none" as NonNullable<ScheduleItem["reminder"]>,
    type: "task",
  });

  const [editFormData, setEditFormData] = useState({
    location: "",
    employee: "",
    date: "",
    startTime: "",
    endTime: "",
    status: "scheduled" as ScheduleItem["status"],
    plannedTask: "",
    reminder: "none" as NonNullable<ScheduleItem["reminder"]>,
    type: "task",
  });

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        setApiError(null);

        // 1. Fetch schedules safely
        const schedulesList = await listResource<any>("schedules");
        if (!mounted) return;

        let finalSchedulesArray: BackendScheduleItem[] = [];
        if (Array.isArray(schedulesList)) {
          finalSchedulesArray = schedulesList;
        } else if (schedulesList && Array.isArray(schedulesList.items)) {
          finalSchedulesArray = schedulesList.items;
        } else if (schedulesList && Array.isArray(schedulesList.data)) {
          finalSchedulesArray = schedulesList.data;
        }

        setSchedules(finalSchedulesArray.map(normalizeScheduleItem));

        // 2. Fetch locations safely
        try {
          const locationsList = await listResource<any>("locations");
          if (mounted) {
            let finalLocationsArray: any[] = [];
            if (Array.isArray(locationsList)) {
              finalLocationsArray = locationsList;
            } else if (locationsList && Array.isArray(locationsList.items)) {
              finalLocationsArray = locationsList.items;
            } else if (locationsList && Array.isArray(locationsList.data)) {
              finalLocationsArray = locationsList.data;
            }

            setLocations(
              finalLocationsArray
                .map((l) => ({
                  id: String(l.id || l._id || "").trim(),
                  name: String(l.name || "").trim(),
                }))
                .filter((l) => l.id && l.name)
            );
          }
        } catch (locErr) {
          console.error("Failed to load locations:", locErr);
        }

        // 3. Fetch employees safely
        let allEmployees: Employee[] = [];
        try {
          const employeeList = await listResource<any>("employees");
          if (mounted) {
            let finalEmployeesArray: Employee[] = [];
            if (Array.isArray(employeeList)) {
              finalEmployeesArray = employeeList;
            } else if (employeeList && Array.isArray(employeeList.items)) {
              finalEmployeesArray = employeeList.items;
            } else if (employeeList && Array.isArray(employeeList.data)) {
              finalEmployeesArray = employeeList.data;
            }

            allEmployees = finalEmployeesArray.filter((e) => e.status === "active");
          }
        } catch (empErr) {
          console.error("Failed to load employees:", empErr);
        }

        // 4. Fetch users safely (Fixed your TypeError here)
        try {
          const userList = await listResource<any>("users");
          if (mounted) {
            let finalUsersArray: UserItem[] = [];
            if (Array.isArray(userList)) {
              finalUsersArray = userList;
            } else if (userList && Array.isArray(userList.items)) {
              finalUsersArray = userList.items;
            } else if (userList && Array.isArray(userList.data)) {
              finalUsersArray = userList.data;
            }

            const employeeUsers = finalUsersArray
              .filter((u) => u.role === "employee" && (u.status === "active" || u.status === "pending"))
              .map((u) => ({
                id: u.id,
                name: u.name,
                initials: u.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase(),
                email: u.email,
                status: "active" as const,
              }));

            employeeUsers.forEach((eu) => {
              if (!allEmployees.some((e) => e.email === eu.email)) {
                allEmployees.push(eu);
              }
            });
          }
        } catch (userErr) {
          console.error("Failed to load users:", userErr);
        }

        if (mounted) {
          setEmployees(allEmployees);
        }
      } catch (e) {
        if (!mounted) return;
        setApiError(e instanceof Error ? e.message : "Failed to load schedules");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    };
    void load();
    return () => { mounted = false; };
  }, []);

  const refreshSchedules = async () => {
    const schedulesList = await listResource<any>("schedules");
    
    let finalSchedulesArray: BackendScheduleItem[] = [];
    if (Array.isArray(schedulesList)) {
      finalSchedulesArray = schedulesList;
    } else if (schedulesList && Array.isArray(schedulesList.items)) {
      finalSchedulesArray = schedulesList.items;
    } else if (schedulesList && Array.isArray(schedulesList.data)) {
      finalSchedulesArray = schedulesList.data;
    }

    setSchedules(finalSchedulesArray.map(normalizeScheduleItem));
  };

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return schedules;
    return schedules.filter((s) => {
      return (
        s.location.toLowerCase().includes(q) ||
        s.employee.toLowerCase().includes(q) ||
        String(s.type || "").toLowerCase().includes(q)
      );
    });
  }, [schedules, searchQuery]);

  const addSchedule = async () => {
    if (!formData.location || !formData.employee || !formData.date) return;
    const next: ScheduleItem = {
      id: `SCH-${Date.now().toString().slice(-6)}`,
      location: formData.location,
      employee: formData.employee,
      date: formData.date,
      startTime: formData.startTime,
      endTime: formData.endTime,
      status: formData.status,
      plannedTask: formData.plannedTask || "",
      reminder: formData.reminder,
      type: formData.type || "task",
    };
    try {
      setApiError(null);
      await createResource<ScheduleItem>("schedules", next);
      await refreshSchedules();
      setAddOpen(false);
      setFormData({
        location: "",
        employee: "",
        date: new Date().toISOString().split("T")[0],
        startTime: "09:00",
        endTime: "17:00",
        status: "scheduled",
        plannedTask: "",
        reminder: "none",
        type: "task",
      });
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Failed to add schedule");
    }
  };

  const onEdit = (s: ScheduleItem) => {
    setSelected(s);
    setEditFormData({
      location: s.location,
      employee: s.employee,
      date: normalizeDateForInput(s.date),
      startTime: normalizeTimeForInput(s.startTime),
      endTime: normalizeTimeForInput(s.endTime),
      status: s.status,
      plannedTask: s.plannedTask || "",
      reminder: s.reminder || "none",
      type: s.type || "task",
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!selected) return;
    const normalizedDate = normalizeDateForInput(editFormData.date);
    if (!editFormData.location || !editFormData.employee || !normalizedDate) {
      setApiError("Please fill Location, Employee, and Date.");
      return;
    }
    try {
      setApiError(null);
      await updateResource<ScheduleItem>("schedules", selected.id, {
        ...selected,
        location: editFormData.location,
        employee: editFormData.employee,
        date: normalizedDate,
        startTime: editFormData.startTime,
        endTime: editFormData.endTime,
        status: editFormData.status,
        plannedTask: editFormData.plannedTask || "",
        reminder: editFormData.reminder,
        type: editFormData.type || "task",
      });
      await refreshSchedules();
      setEditOpen(false);
      setSelected(null);
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Failed to update schedule");
    }
  };

  const confirmDelete = async () => {
    if (!selected) return;
    try {
      setApiError(null);
      await deleteResource("schedules", selected.id);
      await refreshSchedules();
      setDeleteOpen(false);
      setSelected(null);
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Failed to delete schedule");
    }
  };

  const getPickerOptions = () => {
    if (!activePicker) return [];
    switch (activePicker.field) {
      case "location": return locations.map(l => l.name);
      case "employee": return employees.map(e => e.name);
      case "type": return ["task", "meeting", "leave", "other"];
      case "status": return ["scheduled", "completed", "canceled"];
      case "reminder": return ["none", "30m", "1h", "1d"];
    }
  };

  const handleSelectOption = (value: string) => {
    if (!activePicker) return;
    const { field, mode } = activePicker;
    if (mode === "add") {
      setFormData(prev => ({ ...prev, [field]: value }));
    } else {
      setEditFormData(prev => ({ ...prev, [field]: value }));
    }
    setActivePicker(null);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <View style={styles.container}>

          {/* Title Area */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Scheduling</Text>
              <Text style={styles.subtitle}>Create schedules and assign shifts.</Text>
            </View>
            <TouchableOpacity style={styles.addButton} onPress={() => setAddOpen(true)}>
              <Plus size={16} color="#fff" />
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>

          {/* Segmented Modes */}
          <View style={styles.segmentedWrapper}>
            {(["list", "daily", "weekly"] as const).map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[styles.segmentedItem, viewMode === mode && styles.segmentedActiveItem]}
                onPress={() => setViewMode(mode)}
              >
                <Text style={[styles.segmentedText, viewMode === mode && styles.segmentedActiveText]}>
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Search Box */}
          <View style={styles.controlBox}>
            <View style={styles.searchWrapper}>
                  <Search size={16} color={colors.textMuted} style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search location, employee..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholderTextColor={colors.placeholderText}
                  />
            </View>
          </View> 

          {apiError && (
            <View style={styles.errorContainer}>
              <AlertCircle size={16} color="#ef4444" />
              <Text style={styles.errorText}>{apiError}</Text>
            </View>
          )}

          {/* Main workspace */}
          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color="#2563eb" />
            </View>
          ) : viewMode === "list" ? (
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: 20 }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <CalendarIcon size={40} color="#94a3b8" />
                  <Text style={styles.emptyText}>No schedules mapped.</Text>
                </View>
              }
              renderItem={({ item }) => (
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLabelRow}>
                      <View style={styles.iconWrapper}>
                        <CalendarIcon size={16} color={colors.primary} />
                      </View>
                      <View style={{ marginLeft: 10, flex: 1 }}>
                        <Text style={styles.cardLocationText}>{item.location}</Text>
                      </View>
                    </View>
                    <TouchableOpacity style={styles.optionsButton} onPress={() => onEdit(item)}>
                      <MoreHorizontal size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.cardInfoGrid}>
                    <View style={styles.infoLine}>
                      <User size={14} color={colors.textSecondary} style={{ marginRight: 6 }} />
                      <Text style={styles.infoLineText}>{item.employee}</Text>
                    </View>
                    <View style={styles.infoLine}>
                      <Clock size={14} color={colors.textSecondary} style={{ marginRight: 6 }} />
                      <Text style={styles.infoLineText}>
                        {item.date} {item.startTime ? `• ${item.startTime} - ${item.endTime}` : ""}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardFooter}>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{String(item.type || "task").toUpperCase()}</Text>
                    </View>
                    <View style={[styles.statusBadge, item.status === 'completed' ? styles.statusSuccess : item.status === 'canceled' ? styles.statusDanger : styles.statusInfo]}>
                      <Text style={[styles.statusText, item.status === 'completed' ? styles.textSuccess : item.status === 'canceled' ? styles.textDanger : styles.textInfo]}>
                        {item.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            />
          ) : viewMode === "daily" ? (
            <ScrollView style={{ flex: 1 }}>
              <DailyView
                date={currentDate}
                schedules={filtered}
                styles={styles}
                colors={colors}
                onEdit={onEdit}
                onPrevDay={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() - 1)))}
                onNextDay={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() + 1)))}
              />
            </ScrollView>
          ) : (
            <ScrollView style={{ flex: 1 }}>
              <WeeklyView
                date={currentDate}
                schedules={filtered}
                styles={styles}
                colors={colors}
                onEdit={onEdit}
                onPrevWeek={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() - 7)))}
                onNextWeek={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() + 7)))}
              />
            </ScrollView>
          )}

          {/* Form Dialog Modal */}
          <Modal visible={addOpen || editOpen} animationType="slide">
            <SafeAreaView style={styles.modalSafeArea}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalHeaderTitle}>{addOpen ? "Add Schedule" : "Edit Schedule"}</Text>
                <TouchableOpacity onPress={() => { setAddOpen(false); setEditOpen(false); }}>
                  <X size={24} color="#fff" />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.modalScroll}>
                <Text style={styles.label}>Location *</Text>
                <TouchableOpacity
                  style={styles.dropdownTrigger}
                  onPress={() => setActivePicker({ field: "location", mode: addOpen ? "add" : "edit" })}
                >
                  <Text style={styles.dropdownTriggerText}>
                    {(addOpen ? formData.location : editFormData.location) || "Select location"}
                  </Text>
                  <ChevronDown size={16} color="#64748b" />
                </TouchableOpacity>

                <Text style={styles.label}>Employee *</Text>
                <TouchableOpacity
                  style={styles.dropdownTrigger}
                  onPress={() => setActivePicker({ field: "employee", mode: addOpen ? "add" : "edit" })}
                >
                  <Text style={styles.dropdownTriggerText}>
                    {(addOpen ? formData.employee : editFormData.employee) || "Select employee"}
                  </Text>
                  <ChevronDown size={16} color="#64748b" />
                </TouchableOpacity>

                <Text style={styles.label}>Date * (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.input}
                  value={addOpen ? formData.date : editFormData.date}
                  onChangeText={(t) => addOpen ? setFormData({ ...formData, date: t }) : setEditFormData({ ...editFormData, date: t })}
                  placeholder="2026-02-03"
                />

                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Start Time (HH:MM)</Text>
                    <TextInput
                      style={styles.input}
                      value={addOpen ? formData.startTime : editFormData.startTime}
                      onChangeText={(t) => addOpen ? setFormData({ ...formData, startTime: t }) : setEditFormData({ ...editFormData, startTime: t })}
                      placeholder="09:00"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>End Time (HH:MM)</Text>
                    <TextInput
                      style={styles.input}
                      value={addOpen ? formData.endTime : editFormData.endTime}
                      onChangeText={(t) => addOpen ? setFormData({ ...formData, endTime: t }) : setEditFormData({ ...editFormData, endTime: t })}
                      placeholder="17:00"
                    />
                  </View>
                </View>

                <Text style={styles.label}>Type</Text>
                <TouchableOpacity
                  style={styles.dropdownTrigger}
                  onPress={() => setActivePicker({ field: "type", mode: addOpen ? "add" : "edit" })}
                >
                  <Text style={styles.dropdownTriggerText}>
                    {addOpen ? formData.type : editFormData.type}
                  </Text>
                  <ChevronDown size={16} color="#64748b" />
                </TouchableOpacity>

                <Text style={styles.label}>Status</Text>
                <TouchableOpacity
                  style={styles.dropdownTrigger}
                  onPress={() => setActivePicker({ field: "status", mode: addOpen ? "add" : "edit" })}
                >
                  <Text style={styles.dropdownTriggerText}>
                    {addOpen ? formData.status : editFormData.status}
                  </Text>
                  <ChevronDown size={16} color="#64748b" />
                </TouchableOpacity>

                <Text style={styles.label}>Planned Task</Text>
                <TextInput
                  style={styles.input}
                  value={addOpen ? formData.plannedTask : editFormData.plannedTask}
                  onChangeText={(t) => addOpen ? setFormData({ ...formData, plannedTask: t }) : setEditFormData({ ...editFormData, plannedTask: t })}
                  placeholder="e.g. Filter Replacement"
                />

                <TouchableOpacity style={styles.submitButton} onPress={addOpen ? addSchedule : saveEdit}>
                  <Text style={styles.submitButtonText}>Save Details</Text>
                </TouchableOpacity>

                {!addOpen && (
                  <TouchableOpacity 
                    style={[styles.cancelButton, { marginTop: 10, backgroundColor: '#fef2f2' }]} 
                    onPress={() => { setEditOpen(false); setDeleteOpen(true); }}
                  >
                    <Text style={{ color: '#dc2626', fontWeight: '600' }}>Delete Entry</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            </SafeAreaView>
          </Modal>

          {/* Master Generic Picker Sheet */}
          <Modal visible={activePicker !== null} transparent animationType="fade">
            <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setActivePicker(null)}>
              <View style={styles.pickerWindow}>
                <Text style={styles.pickerTitle}>Select Option</Text>
                <ScrollView style={{ maxHeight: 300 }}>
                  {getPickerOptions().map((opt,index) => (
                    <TouchableOpacity key={index} style={styles.pickerItem} onPress={() => handleSelectOption(opt)}>
                      <Text style={styles.pickerItemText}>{opt}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Warning Prompt Modal */}
          <Modal visible={deleteOpen} transparent animationType="fade">
            <View style={styles.pickerOverlay}>
              <View style={[styles.pickerWindow, { padding: 20 }]}>
                <Text style={[styles.pickerTitle, { color: '#dc2626', borderBottomWidth: 0 }]}>Delete Schedule?</Text>
                <Text style={{ color: '#64748b', marginBottom: 20, fontSize: 13 }}>This change is permanent.</Text>
                <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
                  <TouchableOpacity style={[styles.badge, { paddingVertical: 10 }]} onPress={() => setDeleteOpen(false)}>
                    <Text>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.submitButton, { marginTop: 0, backgroundColor: '#dc2626', paddingVertical: 10, paddingHorizontal: 16 }]} onPress={confirmDelete}>
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

        </View>
        
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// --- SUBVIEWS: DAILY CALENDAR VIEW ---
function DailyView({ date, schedules, onEdit, onPrevDay, onNextDay, styles, colors }: any) {
  const dateStr = date.toISOString().split("T")[0];
  const daySchedules = schedules.filter((s: any) => s.date === dateStr);
  
  return (
    <View style={styles.calendarContainer}>
      <View style={styles.calendarControlRow}>
        <TouchableOpacity onPress={onPrevDay} style={styles.calNavButton}>
          <ChevronLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.calendarTitle}>{date.toLocaleDateString("en-US", { weekday: 'short', month: 'short', day: 'numeric' })}</Text>
        <TouchableOpacity onPress={onNextDay} style={styles.calNavButton}>
          <ChevronRight size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      {daySchedules.length === 0 ? (
        <Text style={styles.calEmptyText}>No schedules for this day.</Text>
      ) : (
        daySchedules.map((s: any) => (
          <TouchableOpacity key={s.id} style={styles.calItemCard} onPress={() => onEdit(s)}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={styles.calItemTime}>{s.startTime || "00:00"} - {s.endTime || "—"}</Text>
              <Text style={styles.calItemBadge}>{s.type}</Text>
            </View>
            <Text style={styles.calItemLoc}>{s.location}</Text>
            <Text style={styles.calItemEmp}>{s.employee}</Text>
          </TouchableOpacity>
        ))
      )}
    </View>
  );
}

// --- SUBVIEWS: WEEKLY MATRIX VIEW ---
function WeeklyView({ date, schedules, onEdit, onPrevWeek, onNextWeek, styles, colors }: any) {
  const start = new Date(date);
  start.setDate(date.getDate() - date.getDay());

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });

  return (
    <View style={styles.calendarContainer}>
      <View style={styles.calendarControlRow}>
        <TouchableOpacity onPress={onPrevWeek} style={styles.calNavButton}>
          <ChevronLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.calendarTitle}>Weekly View</Text>
        <TouchableOpacity onPress={onNextWeek} style={styles.calNavButton}>
          <ChevronRight size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView horizontal contentContainerStyle={{ flexDirection: 'row', gap: 8, paddingVertical: 10 }}>
        {weekDays.map((d, i) => {
          const dStr = d.toISOString().split("T")[0];
          const dayShifts = schedules.filter((s: any) => s.date === dStr);
          return (
            <View key={i} style={styles.weekColumn}>
              <View style={styles.weekColumnHeader}>
                <Text style={styles.weekDayLabel}>{d.toLocaleDateString("en-US", { weekday: 'short' })}</Text>
                <Text style={styles.weekDateLabel}>{d.getDate()}</Text>
              </View>
              <View style={{ gap: 6, marginTop: 8 }}>
                {dayShifts.map((s: any) => (
                  <TouchableOpacity key={s.id} style={styles.weekItemNode} onPress={() => onEdit(s)}>
                    <Text style={styles.weekItemNodeText} numberOfLines={1}>{s.location}</Text>
                    <Text style={[styles.weekItemNodeText, { color: colors.textMuted, fontSize: 10 }]} numberOfLines={1}>{s.employee}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1,  },
  container: { flex: 1, padding: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  title: { fontSize: 24, fontWeight: 'bold',  },
  subtitle: { fontSize: 13, color: '#64748b', marginTop: 2 },
  addButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f172a', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  addButtonText: { color: '#fff', fontSize: 13, fontWeight: '600', marginLeft: 4 },
  segmentedWrapper: { flexDirection: 'row', backgroundColor: '#e2e8f0', borderRadius: 8, padding: 4, marginBottom: 12 },
  segmentedItem: { flex: 1, paddingVertical: 6, alignItems: 'center', borderRadius: 6 },
  segmentedActiveItem: { backgroundColor: '#fff' },
  segmentedText: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  segmentedActiveText: { color: '#0f172a', fontWeight: '600' },
  controlBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 10, borderRadius: 12, marginBottom: 14 },
  searchWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 8, paddingHorizontal: 10, height: 40, flex: 1 },
  searchIcon: { marginRight: 6 },
  searchInput: { flex: 1, fontSize: 13, color: '#0f172a', paddingVertical: 0 },
  errorContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fef2f2', padding: 12, borderRadius: 8, marginBottom: 14 },
  errorText: { color: '#dc2626', fontSize: 13, fontWeight: '500', flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 40 },
  emptyContainer: { alignItems: 'center', marginVertical: 60, gap: 8 },
  emptyText: { color: '#94a3b8', fontSize: 14, fontWeight: '500' },
  card: {  padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardHeaderLabelRow: { flexDirection: 'row', flex: 1, alignItems: 'center' },
  iconWrapper: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#e0e7ff', justifyContent: 'center', alignItems: 'center' },
  cardLocationText: { fontSize: 14, fontWeight: '700',  },
  optionsButton: { padding: 4, marginLeft: 8 },
  cardInfoGrid: { marginTop: 12, gap: 6 },
  infoLine: { flexDirection: 'row', alignItems: 'center' },
  infoLineText: { fontSize: 13, color: '#475569' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  badge: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, backgroundColor: '#f1f5f9' },
  badgeText: { fontSize: 10, fontWeight: '700', color: '#475569' },
  statusBadge: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '700' },
  statusSuccess: { backgroundColor: '#dcfce7' },
  statusDanger: { backgroundColor: '#fee2e2' },
  statusInfo: { backgroundColor: '#e0f2fe' },
  textSuccess: { color: '#15803d' },
  textDanger: { color: '#b91c1c' },
  textInfo: { color: '#0369a1' },
  modalSafeArea: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0f172a', padding: 16 },
  modalHeaderTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  modalScroll: { padding: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 12, fontSize: 14, marginBottom: 12, color: '#0f172a', backgroundColor: '#fff' },
  dropdownTrigger: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 14, marginBottom: 12, backgroundColor: '#f8fafc' },
  dropdownTriggerText: { fontSize: 14, color: '#0f172a', fontWeight: '500' },
  submitButton: { backgroundColor: '#2563eb', padding: 14, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  submitButtonText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  cancelButton: { padding: 14, alignItems: 'center', borderRadius: 8 },
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  pickerWindow: { backgroundColor: '#fff', width: '100%', borderRadius: 16, paddingVertical: 16 },
  pickerTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a', paddingHorizontal: 16, marginBottom: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  pickerItem: { paddingVertical: 14, paddingHorizontal: 16 },
  pickerItemText: { fontSize: 14, color: '#334155', fontWeight: '500' },
  calendarContainer: { backgroundColor: '#fff', padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  calendarControlRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 10 },
  calNavButton: { padding: 6, backgroundColor: '#f1f5f9', borderRadius: 6 },
  calendarTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  calEmptyText: { color: '#94a3b8', fontSize: 13, textAlign: 'center', marginVertical: 30 },
  calItemCard: { padding: 12, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 8, marginTop: 10 },
  calItemTime: { fontSize: 11, color: '#166534', fontWeight: '700' },
  calItemBadge: { fontSize: 10, backgroundColor: '#dcfce7', paddingHorizontal: 6, paddingVertical: 2, color: '#15803d', fontWeight: '700', borderRadius: 4 },
  calItemLoc: { fontSize: 14, fontWeight: '700', color: '#14532d', marginTop: 4 },
  calItemEmp: { fontSize: 12, color: '#166534', marginTop: 2 },
  weekColumn: { width: 100, backgroundColor: '#f8fafc', borderRadius: 8, padding: 6, minHeight: 180, borderWidth: 1, borderColor: '#e2e8f0' },
  weekColumnHeader: { alignItems: 'center', backgroundColor: '#f1f5f9', paddingVertical: 4, borderRadius: 6 },
  weekDayLabel: { fontSize: 10, color: '#64748b', fontWeight: '700' },
  weekDateLabel: { fontSize: 14, fontWeight: 'bold', color: '#0f172a' },
  weekItemNode: { backgroundColor: '#e0f2fe', padding: 6, borderRadius: 4, borderWidth: 0.5, borderColor: '#bae6fd' },
  weekItemNodeText: { fontSize: 11, fontWeight: '600', color: '#0369a1' },
});