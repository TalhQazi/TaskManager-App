import React, { useEffect, useMemo, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  Plus,
  Search,
  MoreVertical,
  Eye,
  Edit2,
  Trash2,
  UserX,
  X,
  ChevronDown,
} from "lucide-react-native";
import {
  createResource,
  deleteResource,
  listResource,
  updateResource,
} from "@/lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";

interface BlacklistItem {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  employeeId?: string;
  reason: string;
  incidentNotes: string;
  addedAt: string;
  status: "active" | "resolved";
}

type BackendDoNotHire = {
  id?: string;
  _id?: string;
  fullName?: string;
  name?: string;
  phone?: string | null;
  email?: string | null;
  employeeId?: string;
  employeeName?: string;
  employee?: {
    id?: string;
    _id?: string;
    name?: string;
  };
  reason?: string;
  incidentNotes?: string;
  notes?: string;
  addedAt?: string;
  createdAt?: string;
  date?: string;
  status?: string;
  resolved?: boolean;
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

type SortOption = "date_desc" | "date_asc" | "name_asc" | "name_desc" | "status";

const toDateOnly = (value: string): string => {
  const v = String(value || "").trim();
  if (!v) return "";
  const idx = v.indexOf("T");
  return idx >= 0 ? v.slice(0, idx) : v;
};

const extractArray = <T,>(response: unknown, extraKeys: string[] = []): T[] => {
  if (Array.isArray(response)) return response as T[];
  if (response && typeof response === "object") {
    const r = response as Record<string, unknown>;
    for (const key of ["data", "items", ...extraKeys]) {
      if (Array.isArray(r[key])) return r[key] as T[];
    }
  }
  return [];
};

const normalizeDoNotHireItem = (
  item: BackendDoNotHire,
  employeesById: Map<string, Employee>
): BlacklistItem => {
  const id = String(item.id || item._id || "");
  const rawEmpId = item.employeeId || item.employee?.id || item.employee?._id;
  const employeeId = rawEmpId ? String(rawEmpId) : undefined;
  const fromEmployee = employeeId ? employeesById.get(employeeId)?.name : undefined;
  const name = String(
    fromEmployee || item.fullName || item.employeeName || item.employee?.name || item.name || employeeId || ""
  ).trim();
  const rawStatus = String(item.status || "active").toLowerCase();
  const status: BlacklistItem["status"] =
    item.resolved === true || rawStatus === "resolved" || rawStatus === "inactive" || rawStatus === "closed"
      ? "resolved"
      : "active";

  return {
    id,
    name,
    phone: item.phone && item.phone !== "null" ? String(item.phone).trim() : undefined,
    email: item.email && item.email !== "null" ? String(item.email).trim() : undefined,
    employeeId,
    reason: String(item.reason || ""),
    incidentNotes: String(item.incidentNotes || item.notes || ""),
    addedAt: String(item.addedAt || item.createdAt || item.date || ""),
    status,
  };
};

function buildColors(uiTheme: ReturnType<typeof useTheme>["uiTheme"], isDark: boolean) {
  return {
    background:       uiTheme.panelColors?.dashboardBackground    || (isDark ? "#0F172A" : "#F8FAFC"),
    cardBg:           uiTheme.panelColors?.dashboardCardBackground || (isDark ? "#1E293B" : "#FFFFFF"),
    surfaceBg:        isDark ? "#0F172A" : "#F1F5F9",
    text:             uiTheme.panelColors?.dashboardTextColor      || (isDark ? "#F8FAFC" : "#0F172A"),
    textSecondary:    isDark ? "#CBD5E1" : "#334155",
    textMuted:        isDark ? "#94A3B8" : "#64748B",
    textSubtle:       isDark ? "#64748B" : "#94A3B8",
    border:           isDark ? "#334155" : "#E2E8F0",
    borderLight:      isDark ? "#1E293B" : "#F1F5F9",
    inputBg:          isDark ? "#0F172A" : "#FFFFFF",
    inputBorder:      isDark ? "#334155" : "#CBD5E1",
    inputText:        isDark ? "#F8FAFC" : "#0F172A",
    placeholderText:  isDark ? "#475569" : "#94A3B8",
    searchBg:         isDark ? "#1E293B" : "#F1F5F9",
    primary:          uiTheme.customColors?.primary || (isDark ? "#6366F1" : "#0F172A"),
    primaryText:      "#FFFFFF",
    iconColor:        isDark ? "#64748B" : "#64748B",
    alertBannerBg:    isDark ? "rgba(239,68,68,0.15)" : "#FEE2E2",
    alertBannerText:  isDark ? "#FCA5A5" : "#EF4444",
    badgeActiveBg:    isDark ? "rgba(239,68,68,0.15)" : "#FEE2E2",
    badgeActiveText:  isDark ? "#FCA5A5" : "#EF4444",
    badgeResolvedBg:  isDark ? "rgba(22,163,74,0.15)" : "#DCFCE7",
    badgeResolvedText:isDark ? "#4ADE80" : "#16A34A",
    avatarBoxBg:      isDark ? "#1E293B" : "#F1F5F9",
    profileBannerBg:  isDark ? "#1E293B" : "#F1F5F9",
    profileBannerText:isDark ? "#F8FAFC" : "#0F172A",
    sheetBg:          isDark ? "#1E293B" : "#FFFFFF",
    dialogBg:         isDark ? "#1E293B" : "#FFFFFF",
    white:            "#FFFFFF",
    danger:           "#EF4444",
  };
}

type Colors = ReturnType<typeof buildColors>;

const sortOptions: { label: string; value: SortOption }[] = [
  { label: "Date (Newest First)", value: "date_desc" },
  { label: "Date (Oldest First)", value: "date_asc" },
  { label: "Name (A to Z)", value: "name_asc" },
  { label: "Name (Z to A)", value: "name_desc" },
  { label: "Status", value: "status" },
];

export default function DoNotHire() {
  const { uiTheme } = useTheme();
  const isDark =
    (uiTheme.theme as string) === "dark" ||
    (uiTheme.theme as string) === "metallic-elite";

  const colors = useMemo(() => buildColors(uiTheme, isDark), [uiTheme, isDark]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("date_desc");

  const [addOpen, setAddOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [sortPickerOpen, setSortPickerOpen] = useState(false);
  const [empPickerOpen, setEmpPickerOpen] = useState(false);
  const [statusPickerOpen, setStatusPickerOpen] = useState(false);
  const [activePickerTarget, setActivePickerTarget] = useState<"add" | "edit">("add");

  const [selected, setSelected] = useState<BlacklistItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [items, setItems] = useState<BlacklistItem[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const emptyForm = {
    name: "",
    phone: "",
    email: "",
    employeeId: "",
    reason: "",
    incidentNotes: "",
    status: "active" as BlacklistItem["status"],
  };

  const [formData, setFormData] = useState(emptyForm);
  const [editFormData, setEditFormData] = useState(emptyForm);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setApiError(null);

        let allEmployees: Employee[] = [];

        try {
          const employeeList = await listResource<Employee>("employees");
          if (mounted) {
            const actual = extractArray<Employee>(employeeList, ["employees"]);
            allEmployees = actual.filter((e) => e && e.status === "active");
          }
        } catch {
          // silently continue without employee data
        }

        try {
          const userList = await listResource<User>("users");
          if (mounted) {
            const actual = extractArray<User>(userList, ["users"]);
            const employeeUsers: Employee[] = actual
              .filter((u) => u && u.role === "employee" && (u.status === "active" || u.status === "pending"))
              .map((u) => ({
                id: u.id,
                name: u.name,
                initials: u.name
                  ? u.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()
                  : "??",
                email: u.email,
                status: "active" as const,
              }));

            employeeUsers.forEach((eu) => {
              if (!allEmployees.some((e) => e.email === eu.email)) {
                allEmployees.push(eu);
              }
            });
          }
        } catch {
          // silently continue without user data
        }

        if (mounted) setEmployees(allEmployees);

        const list = await listResource<BackendDoNotHire>("do-not-hire");
        if (!mounted) return;

        const actualList = extractArray<BackendDoNotHire>(list);
        const employeesById = new Map(allEmployees.map((e) => [e.id, e] as const));
        setItems(
          actualList.map((i) => normalizeDoNotHireItem(i, employeesById)).filter((i) => Boolean(i.id))
        );
      } catch (e) {
        if (!mounted) return;
        setApiError(e instanceof Error ? e.message : "Failed to load records");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, []);

  const refresh = async () => {
    const list = await listResource<BackendDoNotHire>("do-not-hire");
    const actualList = extractArray<BackendDoNotHire>(list);
    const employeesById = new Map(employees.map((e) => [e.id, e] as const));
    setItems(
      actualList.map((i) => normalizeDoNotHireItem(i, employeesById)).filter((i) => Boolean(i.id))
    );
  };

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const base = !q
      ? items
      : items.filter(
          (i) => i.name.toLowerCase().includes(q) || i.reason.toLowerCase().includes(q)
        );

    return base.slice().sort((a, b) => {
      if (sortBy === "name_asc")  return (a.name || "").localeCompare(b.name || "");
      if (sortBy === "name_desc") return (b.name || "").localeCompare(a.name || "");
      if (sortBy === "status")    return (a.status || "").localeCompare(b.status || "");
      if (sortBy === "date_asc")  return (a.addedAt || "").localeCompare(b.addedAt || "");
      return (b.addedAt || "").localeCompare(a.addedAt || "");
    });
  }, [items, searchQuery, sortBy]);

  const addItem = async () => {
    const linkedEmployee = formData.employeeId
      ? employees.find((e) => e.id === formData.employeeId)
      : null;
    const resolvedName = linkedEmployee?.name || formData.name.trim();
    if (!resolvedName || !formData.reason) return;

    const payload: BackendDoNotHire = {
      fullName: resolvedName,
      name: resolvedName,
      phone: formData.phone || null,
      email: formData.email || null,
      employeeId: linkedEmployee?.id,
      reason: formData.reason,
      incidentNotes: formData.incidentNotes,
      notes: formData.incidentNotes,
      status: "active",
      resolved: false,
      addedAt: new Date().toISOString(),
      date: new Date().toISOString(),
    };

    try {
      setApiError(null);
      await createResource<BackendDoNotHire>("do-not-hire", payload);
      await refresh();
      setAddOpen(false);
      setFormData(emptyForm);
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Failed to add record");
    }
  };

  const saveEdit = async () => {
    if (!selected) return;
    const linkedEmployee = editFormData.employeeId
      ? employees.find((e) => e.id === editFormData.employeeId)
      : null;
    const resolvedName = linkedEmployee?.name || editFormData.name.trim();
    if (!resolvedName || !editFormData.reason) return;

    try {
      setApiError(null);
      await updateResource<BackendDoNotHire>("do-not-hire", selected.id, {
        name: resolvedName,
        phone: editFormData.phone || null,
        email: editFormData.email || null,
        employeeId: linkedEmployee?.id,
        reason: editFormData.reason,
        incidentNotes: editFormData.incidentNotes,
        notes: editFormData.incidentNotes,
        status: editFormData.status,
        resolved: editFormData.status === "resolved",
      });
      await refresh();
      setEditOpen(false);
      setSelected(null);
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Failed to update record");
    }
  };

  const confirmRemove = async () => {
    if (!selected) return;
    try {
      setApiError(null);
      await deleteResource("do-not-hire", selected.id);
      await refresh();
      setRemoveOpen(false);
      setSelected(null);
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Failed to remove record");
    }
  };

  const openActionMenu = (item: BlacklistItem) => {
    setSelected(item);
    setActionMenuOpen(true);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.headerTitle}>Do Not Hire List</Text>
          <Text style={styles.headerSubtitle}>Maintain a record of restricted profiles and incidents.</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => setAddOpen(true)}>
          <Plus color={colors.primaryText} size={16} style={{ marginRight: 4 }} />
          <Text style={styles.addButtonText}>Add Record</Text>
        </TouchableOpacity>
      </View>

      {apiError ? (
        <View style={styles.errorAlert}>
          <Text style={styles.errorText}>{apiError}</Text>
        </View>
      ) : null}

      <View style={styles.filterCard}>
        <View style={styles.searchContainer}>
          <Search color={colors.textMuted} size={16} style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Search by name or reason..."
            placeholderTextColor={colors.placeholderText}
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity style={styles.dropdownSelector} onPress={() => setSortPickerOpen(true)}>
          <Text style={styles.dropdownSelectorLabel}>
            Sort: {sortOptions.find((o) => o.value === sortBy)?.label}
          </Text>
          <ChevronDown color={colors.textMuted} size={16} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading records...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 24 }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <UserX color={colors.textSubtle} size={44} />
              <Text style={styles.emptyTitle}>No records found</Text>
              <Text style={styles.emptySubtitle}>Try adjusting your search or filter criteria.</Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.avatarBox}>
                  <UserX color={colors.textMuted} size={18} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.cardTitle}>
                    <Text style={styles.cardIndex}>{index + 1}. </Text>
                    {item.name}
                  </Text>
                  <Text style={styles.cardDate}>{toDateOnly(item.addedAt)}</Text>
                </View>
                <TouchableOpacity style={styles.menuButton} onPress={() => openActionMenu(item)}>
                  <MoreVertical color={colors.textMuted} size={20} />
                </TouchableOpacity>
              </View>
              <View style={styles.cardBody}>
                <View style={{ marginBottom: 8 }}>
                  <Text style={styles.fieldLabel}>Reason</Text>
                  <Text style={styles.fieldValue}>{item.reason}</Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text style={styles.fieldLabel}>Status: </Text>
                  <View style={[styles.badge, item.status === "active" ? styles.badgeActive : styles.badgeResolved]}>
                    <Text style={item.status === "active" ? styles.badgeTextActive : styles.badgeTextResolved}>
                      {item.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        />
      )}

      <Modal
        transparent
        visible={actionMenuOpen}
        animationType="slide"
        onRequestClose={() => setActionMenuOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setActionMenuOpen(false)}
        >
          <View style={styles.actionSheetContainer}>
            <Text style={styles.actionSheetTitle}>{selected?.name}</Text>
            <TouchableOpacity
              style={styles.actionSheetRow}
              onPress={() => { setActionMenuOpen(false); setViewOpen(true); }}
            >
              <Eye color={colors.textMuted} size={20} style={{ marginRight: 12 }} />
              <Text style={styles.actionSheetText}>View Details</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionSheetRow}
              onPress={() => {
                setActionMenuOpen(false);
                if (selected) {
                  setEditFormData({
                    name: selected.name,
                    phone: selected.phone || "",
                    email: selected.email || "",
                    employeeId: selected.employeeId || "",
                    reason: selected.reason,
                    incidentNotes: selected.incidentNotes,
                    status: selected.status,
                  });
                  setEditOpen(true);
                }
              }}
            >
              <Edit2 color={colors.textMuted} size={20} style={{ marginRight: 12 }} />
              <Text style={styles.actionSheetText}>Edit Record</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionSheetRow, { borderBottomWidth: 0 }]}
              onPress={() => { setActionMenuOpen(false); setRemoveOpen(true); }}
            >
              <Trash2 color={colors.danger} size={20} style={{ marginRight: 12 }} />
              <Text style={[styles.actionSheetText, { color: colors.danger }]}>Remove Record</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        transparent
        visible={viewOpen}
        animationType="fade"
        onRequestClose={() => setViewOpen(false)}
      >
        <View style={styles.modalOverlayBox}>
          <View style={styles.dialogBox}>
            <View style={styles.dialogHeader}>
              <Text style={styles.dialogTitle}>Record Details</Text>
              <TouchableOpacity onPress={() => setViewOpen(false)}>
                <X color={colors.textMuted} size={20} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.dialogScroll}>
              <Text style={styles.viewHeadline}>{selected?.name}</Text>
              <View style={styles.divider} />
              <Text style={styles.formSectionLabel}>Reason</Text>
              <Text style={styles.viewContentText}>{selected?.reason}</Text>
              <Text style={styles.formSectionLabel}>Phone</Text>
              <Text style={styles.viewContentText}>{selected?.phone || "—"}</Text>
              <Text style={styles.formSectionLabel}>Email</Text>
              <Text style={styles.viewContentText}>{selected?.email || "—"}</Text>
              <Text style={styles.formSectionLabel}>Status</Text>
              <View style={{ flexDirection: "row", marginTop: 4, marginBottom: 12 }}>
                <View style={[styles.badge, selected?.status === "active" ? styles.badgeActive : styles.badgeResolved]}>
                  <Text style={selected?.status === "active" ? styles.badgeTextActive : styles.badgeTextResolved}>
                    {selected?.status?.toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text style={styles.formSectionLabel}>Notes / Incidents</Text>
              <Text style={styles.viewContentText}>{selected?.incidentNotes || "—"}</Text>
              <Text style={styles.formSectionLabel}>Date Logged</Text>
              <Text style={[styles.viewContentText, { marginBottom: 24 }]}>
                {selected ? toDateOnly(selected.addedAt) : ""}
              </Text>
            </ScrollView>
            <TouchableOpacity style={styles.dialogCloseButton} onPress={() => setViewOpen(false)}>
              <Text style={styles.dialogCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        visible={addOpen}
        animationType="slide"
        onRequestClose={() => setAddOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlayBox}
        >
          <View style={styles.dialogBox}>
            <View style={styles.dialogHeader}>
              <Text style={styles.dialogTitle}>Add Record</Text>
              <TouchableOpacity onPress={() => setAddOpen(false)}>
                <X color={colors.textMuted} size={20} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.dialogScroll} keyboardShouldPersistTaps="handled">
              <Text style={styles.formSectionLabel}>Linked Employee (Optional)</Text>
              <TouchableOpacity
                style={styles.formDropdownPicker}
                onPress={() => { setActivePickerTarget("add"); setEmpPickerOpen(true); }}
              >
                <Text style={styles.formDropdownPickerText}>
                  {formData.employeeId
                    ? employees.find((e) => e.id === formData.employeeId)?.name
                    : "Select employee..."}
                </Text>
                <ChevronDown color={colors.textMuted} size={16} />
              </TouchableOpacity>
              <Text style={styles.formSectionLabel}>Name *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="John Doe"
                placeholderTextColor={colors.placeholderText}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
              />
              <Text style={styles.formSectionLabel}>Phone</Text>
              <TextInput
                style={styles.formInput}
                placeholder="+1 (555) 123-4567"
                placeholderTextColor={colors.placeholderText}
                value={formData.phone}
                onChangeText={(text) => setFormData({ ...formData, phone: text })}
              />
              <Text style={styles.formSectionLabel}>Email</Text>
              <TextInput
                style={styles.formInput}
                placeholder="john@example.com"
                placeholderTextColor={colors.placeholderText}
                autoCapitalize="none"
                keyboardType="email-address"
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
              />
              <Text style={styles.formSectionLabel}>Reason *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Policy violation"
                placeholderTextColor={colors.placeholderText}
                value={formData.reason}
                onChangeText={(text) => setFormData({ ...formData, reason: text })}
              />
              <Text style={styles.formSectionLabel}>Incident Notes</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea]}
                placeholder="Detailed description of the incident..."
                placeholderTextColor={colors.placeholderText}
                multiline
                numberOfLines={4}
                value={formData.incidentNotes}
                onChangeText={(text) => setFormData({ ...formData, incidentNotes: text })}
              />
            </ScrollView>
            <View style={styles.dialogFooter}>
              <TouchableOpacity style={styles.cancelActionBtn} onPress={() => setAddOpen(false)}>
                <Text style={styles.cancelActionBtnTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmActionBtn} onPress={addItem}>
                <Text style={styles.confirmActionBtnTxt}>Add Entry</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        transparent
        visible={editOpen}
        animationType="slide"
        onRequestClose={() => setEditOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlayBox}
        >
          <View style={styles.dialogBox}>
            <View style={styles.dialogHeader}>
              <Text style={styles.dialogTitle}>Edit Record</Text>
              <TouchableOpacity onPress={() => setEditOpen(false)}>
                <X color={colors.textMuted} size={20} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.dialogScroll} keyboardShouldPersistTaps="handled">
              <Text style={styles.formSectionLabel}>Linked Employee (Optional)</Text>
              <TouchableOpacity
                style={styles.formDropdownPicker}
                onPress={() => { setActivePickerTarget("edit"); setEmpPickerOpen(true); }}
              >
                <Text style={styles.formDropdownPickerText}>
                  {editFormData.employeeId
                    ? employees.find((e) => e.id === editFormData.employeeId)?.name
                    : "Select employee..."}
                </Text>
                <ChevronDown color={colors.textMuted} size={16} />
              </TouchableOpacity>
              <Text style={styles.formSectionLabel}>Name *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="John Doe"
                placeholderTextColor={colors.placeholderText}
                value={editFormData.name}
                onChangeText={(text) => setEditFormData({ ...editFormData, name: text })}
              />
              <Text style={styles.formSectionLabel}>Reason *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Policy violation"
                placeholderTextColor={colors.placeholderText}
                value={editFormData.reason}
                onChangeText={(text) => setEditFormData({ ...editFormData, reason: text })}
              />
              <Text style={styles.formSectionLabel}>Incident Notes</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea]}
                placeholder="Detailed description of the incident..."
                placeholderTextColor={colors.placeholderText}
                multiline
                numberOfLines={4}
                value={editFormData.incidentNotes}
                onChangeText={(text) => setEditFormData({ ...editFormData, incidentNotes: text })}
              />
              <Text style={styles.formSectionLabel}>Phone</Text>
              <TextInput
                style={styles.formInput}
                placeholder="+1 (555) 123-4567"
                placeholderTextColor={colors.placeholderText}
                value={editFormData.phone}
                onChangeText={(text) => setEditFormData({ ...editFormData, phone: text })}
              />
              <Text style={styles.formSectionLabel}>Email</Text>
              <TextInput
                style={styles.formInput}
                placeholder="john@example.com"
                placeholderTextColor={colors.placeholderText}
                autoCapitalize="none"
                value={editFormData.email}
                onChangeText={(text) => setEditFormData({ ...editFormData, email: text })}
              />
              <Text style={styles.formSectionLabel}>Status</Text>
              <TouchableOpacity
                style={styles.formDropdownPicker}
                onPress={() => setStatusPickerOpen(true)}
              >
                <Text style={styles.formDropdownPickerText}>
                  {editFormData.status.toUpperCase()}
                </Text>
                <ChevronDown color={colors.textMuted} size={16} />
              </TouchableOpacity>
            </ScrollView>
            <View style={styles.dialogFooter}>
              <TouchableOpacity style={styles.cancelActionBtn} onPress={() => setEditOpen(false)}>
                <Text style={styles.cancelActionBtnTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmActionBtn} onPress={saveEdit}>
                <Text style={styles.confirmActionBtnTxt}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        transparent
        visible={removeOpen}
        animationType="fade"
        onRequestClose={() => setRemoveOpen(false)}
      >
        <View style={styles.modalOverlayBox}>
          <View style={[styles.dialogBox, { paddingBottom: 16 }]}>
            <Text style={styles.alertTitle}>Remove Record</Text>
            <Text style={styles.alertDescription}>
              This entry will be permanently removed from the restricted list.
            </Text>
            <View style={styles.alertProfileBanner}>
              <Text style={styles.alertProfileName}>{selected?.name}</Text>
              <Text style={styles.alertProfileId}>{selected?.id}</Text>
            </View>
            <View style={[styles.dialogFooter, { marginTop: 16, borderTopWidth: 0, paddingHorizontal: 0 }]}>
              <TouchableOpacity style={styles.cancelActionBtn} onPress={() => setRemoveOpen(false)}>
                <Text style={styles.cancelActionBtnTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmActionBtn, { backgroundColor: colors.danger }]}
                onPress={confirmRemove}
              >
                <Text style={styles.confirmActionBtnTxt}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={sortPickerOpen} animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSortPickerOpen(false)}
        >
          <View style={styles.miniPickerBox}>
            {sortOptions.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={styles.miniPickerRow}
                onPress={() => { setSortBy(opt.value); setSortPickerOpen(false); }}
              >
                <Text style={[styles.miniPickerText, sortBy === opt.value && styles.miniPickerTextSelected]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal transparent visible={empPickerOpen} animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setEmpPickerOpen(false)}
        >
          <View style={[styles.miniPickerBox, { maxHeight: 300 }]}>
            <ScrollView>
              <TouchableOpacity
                style={styles.miniPickerRow}
                onPress={() => {
                  if (activePickerTarget === "add") setFormData({ ...formData, employeeId: "", name: "" });
                  else setEditFormData({ ...editFormData, employeeId: "", name: "" });
                  setEmpPickerOpen(false);
                }}
              >
                <Text style={styles.miniPickerText}>Clear Selection (Enter name manually)</Text>
              </TouchableOpacity>
              {employees.map((emp) => (
                <TouchableOpacity
                  key={emp.id}
                  style={styles.miniPickerRow}
                  onPress={() => {
                    if (activePickerTarget === "add")
                      setFormData({ ...formData, employeeId: emp.id, name: emp.name });
                    else
                      setEditFormData({ ...editFormData, employeeId: emp.id, name: emp.name });
                    setEmpPickerOpen(false);
                  }}
                >
                  <Text style={styles.miniPickerText}>{emp.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal transparent visible={statusPickerOpen} animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setStatusPickerOpen(false)}
        >
          <View style={styles.miniPickerBox}>
            {(["active", "resolved"] as BlacklistItem["status"][]).map((st) => (
              <TouchableOpacity
                key={st}
                style={styles.miniPickerRow}
                onPress={() => { setEditFormData({ ...editFormData, status: st }); setStatusPickerOpen(false); }}
              >
                <Text style={[styles.miniPickerText, editFormData.status === st && styles.miniPickerTextSelected]}>
                  {st.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: 16,
      paddingTop: Platform.OS === "ios" ? 48 : 24,
    },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 16,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: "700",
      color: colors.text,
    },
    headerSubtitle: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 2,
      maxWidth: "85%",
    },
    addButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 6,
      flexDirection: "row",
      alignItems: "center",
    },
    addButtonText: {
      color: colors.primaryText,
      fontSize: 13,
      fontWeight: "600",
    },
    errorAlert: {
      backgroundColor: colors.alertBannerBg,
      padding: 12,
      borderRadius: 6,
      marginBottom: 12,
    },
    errorText: {
      color: colors.alertBannerText,
      fontSize: 13,
    },
    filterCard: {
      backgroundColor: colors.cardBg,
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 16,
    },
    searchContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.searchBg,
      borderRadius: 6,
      paddingHorizontal: 10,
      height: 40,
      marginBottom: 10,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      color: colors.inputText,
    },
    dropdownSelector: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 6,
      height: 38,
      paddingHorizontal: 12,
      backgroundColor: colors.inputBg,
    },
    dropdownSelectorLabel: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    centerBox: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingTop: 48,
    },
    loadingText: {
      marginTop: 8,
      color: colors.textMuted,
      fontSize: 14,
    },
    emptyContainer: {
      alignItems: "center",
      paddingTop: 64,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.textSecondary,
      marginTop: 12,
    },
    emptySubtitle: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 4,
      textAlign: "center",
    },
    card: {
      backgroundColor: colors.cardBg,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginBottom: 12,
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
    },
    avatarBox: {
      width: 36,
      height: 36,
      backgroundColor: colors.avatarBoxBg,
      borderRadius: 6,
      justifyContent: "center",
      alignItems: "center",
    },
    cardTitle: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.text,
    },
    cardIndex: {
      color: colors.textSubtle,
    },
    cardDate: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 1,
    },
    menuButton: {
      padding: 4,
    },
    cardBody: {
      marginTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
      paddingTop: 10,
    },
    fieldLabel: {
      fontSize: 11,
      fontWeight: "500",
      color: colors.textSubtle,
      textTransform: "uppercase",
    },
    fieldValue: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 1,
    },
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
      alignSelf: "flex-start",
    },
    badgeActive: {
      backgroundColor: colors.badgeActiveBg,
    },
    badgeResolved: {
      backgroundColor: colors.badgeResolvedBg,
    },
    badgeTextActive: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.badgeActiveText,
    },
    badgeTextResolved: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.badgeResolvedText,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "flex-end",
    },
    actionSheetContainer: {
      backgroundColor: colors.sheetBg,
      borderTopLeftRadius: 12,
      borderTopRightRadius: 12,
      paddingHorizontal: 16,
      paddingBottom: 32,
      paddingTop: 16,
    },
    actionSheetTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 16,
      textAlign: "center",
    },
    actionSheetRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    actionSheetText: {
      fontSize: 15,
      color: colors.textSecondary,
    },
    modalOverlayBox: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.55)",
      justifyContent: "center",
      alignItems: "center",
      padding: 16,
    },
    dialogBox: {
      backgroundColor: colors.dialogBg,
      borderRadius: 12,
      width: "100%",
      maxHeight: "85%",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 10,
      elevation: 6,
    },
    dialogHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    dialogTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
    },
    dialogScroll: {
      padding: 16,
    },
    viewHeadline: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 12,
    },
    viewContentText: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 2,
      marginBottom: 12,
    },
    dialogCloseButton: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingVertical: 14,
      alignItems: "center",
    },
    dialogCloseButtonText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "600",
    },
    formSectionLabel: {
      fontSize: 13,
      fontWeight: "500",
      color: colors.textSecondary,
      marginBottom: 6,
      marginTop: 12,
    },
    formInput: {
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 6,
      height: 40,
      paddingHorizontal: 12,
      fontSize: 14,
      color: colors.inputText,
      backgroundColor: colors.inputBg,
    },
    formTextArea: {
      height: 80,
      paddingTop: 8,
      textAlignVertical: "top",
    },
    formDropdownPicker: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 6,
      height: 40,
      paddingHorizontal: 12,
      backgroundColor: colors.inputBg,
    },
    formDropdownPickerText: {
      fontSize: 14,
      color: colors.inputText,
    },
    dialogFooter: {
      flexDirection: "row",
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      justifyContent: "flex-end",
    },
    cancelActionBtn: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 6,
      marginRight: 8,
    },
    cancelActionBtnTxt: {
      color: colors.textMuted,
      fontSize: 14,
      fontWeight: "500",
    },
    confirmActionBtn: {
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 6,
    },
    confirmActionBtnTxt: {
      color: colors.primaryText,
      fontSize: 14,
      fontWeight: "500",
    },
    alertTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.danger,
      paddingTop: 16,
      paddingHorizontal: 16,
    },
    alertDescription: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 4,
      paddingHorizontal: 16,
    },
    alertProfileBanner: {
      backgroundColor: colors.profileBannerBg,
      marginHorizontal: 16,
      marginTop: 12,
      padding: 12,
      borderRadius: 6,
    },
    alertProfileName: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.profileBannerText,
    },
    alertProfileId: {
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 2,
    },
    miniPickerBox: {
      backgroundColor: colors.sheetBg,
      borderTopLeftRadius: 12,
      borderTopRightRadius: 12,
      paddingTop: 8,
      paddingBottom: 24,
    },
    miniPickerRow: {
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    miniPickerText: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    miniPickerTextSelected: {
      fontWeight: "700",
      color: colors.text,
    },
  });
}
