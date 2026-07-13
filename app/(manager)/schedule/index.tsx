import React, { useEffect, useMemo, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
} from "react-native";
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Calendar as CalendarIcon,
  X,
} from "lucide-react-native";
import { apiFetch } from "@/lib/admin/apiClient";

interface ScheduleItem {
  id: string;
  title: string;
  assignee: string;
  location: string;
  date: string;
  startTime: string;
  endTime: string;
  type: "task" | "meeting" | "break" | "training";
  status: "scheduled" | "completed" | "canceled";
}

interface Employee {
  id: string;
  name: string;
  status: string;
}

type ScheduleItemApi = Omit<ScheduleItem, "id"> & {
  _id: string;
};

function normalizeScheduleItem(s: ScheduleItemApi): ScheduleItem {
  return {
    id: s._id,
    title: s.title || "",
    assignee: s.assignee || "",
    location: s.location || "",
    date: s.date || "",
    startTime: s.startTime || "",
    endTime: s.endTime || "",
    type: s.type || "task",
    status: s.status || "scheduled",
  };
}

// ─── STABLE PROPORTIONAL COLUMN CONFIGURATIONS ───
const COL_WIDTHS = {
  id: 85,
  title: 150,
  employee: 120,
  location: 120,
  date: 100,
  time: 110,
  type: 85,
  status: 100,
  actions: 60, // Fixed width allocation for action triggers
};
const TABLE_MIN_WIDTH = Object.values(COL_WIDTHS).reduce((a, b) => a + b, 0);

export default function Scheduling() {
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  
  // Modals Configuration
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ScheduleItem | null>(null);

  // Form Configurations
  const [formData, setFormData] = useState({
    title: "",
    assignee: "",
    location: "",
    date: "",
    startTime: "",
    endTime: "",
    type: "task" as ScheduleItem["type"],
    status: "scheduled" as ScheduleItem["status"],
  });

  const [editFormData, setEditFormData] = useState({
    title: "",
    assignee: "",
    location: "",
    date: "",
    startTime: "",
    endTime: "",
    type: "task" as ScheduleItem["type"],
    status: "scheduled" as ScheduleItem["status"],
  });

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        setApiError(null);

        const res = await apiFetch<{ items: ScheduleItemApi[] }>("/api/events");
        if (!mounted) return;
        setSchedules(res.items.map(normalizeScheduleItem));

        const empRes = await apiFetch<{ items: Employee[] }>("/api/employees");
        if (!mounted) return;
        setEmployees((empRes.items ?? []).filter((e) => e.status === "active"));
      } catch (e) {
        if (!mounted) return;
        setApiError(e instanceof Error ? e.message : "Failed to load schedules");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const refreshSchedules = async () => {
    const res = await apiFetch<{ items: ScheduleItemApi[] }>("/api/events");
    setSchedules(res.items.map(normalizeScheduleItem));
  };

  const displayIdByScheduleId = useMemo(() => {
    return new Map(
      schedules.map((s, idx) => {
        const displayId = `SC${String(idx + 1).padStart(3, "0")}`;
        return [s.id, displayId] as const;
      })
    );
  }, [schedules]);

  const getDisplayScheduleId = (scheduleId: string) => {
    return displayIdByScheduleId.get(scheduleId) || scheduleId;
  };

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return schedules;
    return schedules.filter((s) => {
      return (
        s.location.toLowerCase().includes(q) ||
        s.assignee.toLowerCase().includes(q) ||
        s.title.toLowerCase().includes(q)
      );
    });
  }, [schedules, searchQuery]);

  const addSchedule = async () => {
    if (!formData.title || !formData.assignee || !formData.date) {
      Alert.alert("Missing Fields", "Please populate Title, Employee, and Date fields.");
      return;
    }
    const next: ScheduleItem = {
      id: `SCH-${Date.now().toString().slice(-6)}`,
      title: formData.title,
      assignee: formData.assignee,
      location: formData.location,
      date: formData.date,
      startTime: formData.startTime,
      endTime: formData.endTime,
      type: formData.type,
      status: formData.status,
    };
    try {
      setApiError(null);
      await apiFetch("/api/events", {
        method: "POST",
        body: JSON.stringify(next),
      });
      await refreshSchedules();
      setAddOpen(false);
      setFormData({
        title: "",
        assignee: "",
        location: "",
        date: "",
        startTime: "",
        endTime: "",
        type: "task",
        status: "scheduled",
      });
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Failed to add schedule");
    }
  };

  const handleOpenActionMenu = (item: ScheduleItem) => {
    setSelectedItem(item);
    setActionMenuOpen(true);
  };

  const triggerEditFlow = () => {
    if (!selectedItem) return;
    setActionMenuOpen(false);
    setEditFormData({
      title: selectedItem.title,
      assignee: selectedItem.assignee,
      location: selectedItem.location,
      date: selectedItem.date,
      startTime: selectedItem.startTime,
      endTime: selectedItem.endTime,
      type: selectedItem.type,
      status: selectedItem.status,
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!selectedItem) return;
    try {
      setApiError(null);
      await apiFetch(`/api/events/${selectedItem.id}`, {
        method: "PUT",
        body: JSON.stringify(editFormData),
      });
      await refreshSchedules();
      setEditOpen(false);
      setSelectedItem(null);
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Failed to update schedule");
    }
  };

  const triggerDeleteFlow = (item?: ScheduleItem) => {
    const target = item || selectedItem;
    if (!target) return;
    setActionMenuOpen(false);

    Alert.alert(
      "Confirm Deletion",
      "Are you sure you want to delete this schedule?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              setApiError(null);
              await apiFetch(`/api/events/${target.id}`, {
                method: "DELETE",
              });
              await refreshSchedules();
              setSelectedItem(null);
            } catch (e) {
              setApiError(e instanceof Error ? e.message : "Failed to delete schedule");
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: "#09090b" }]}>
        <ActivityIndicator size="large" color="#ffd27a" />
        <Text style={styles.loadingText}>Syncing Rosters...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screenContainer} contentContainerStyle={{ paddingBottom: 32 }}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <View>
          <Text style={styles.pageTitle}>Scheduling</Text>
          <Text style={styles.pageSubtitle}>Plan and manage team schedules</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => setAddOpen(true)}>
          <Plus size={16} color="#09090b" />
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* API Error Box */}
      {apiError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{apiError}</Text>
        </View>
      )}

      {/* Filter Matrix Card */}
      <View style={styles.searchCard}>
        <View style={styles.searchWrapper}>
          <Search size={14} color="#a1a1aa" style={styles.searchIcon} />
          <TextInput
            style={styles.textInput}
            placeholder="Search by location, employee, title..."
            placeholderTextColor="#52525b"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Schedules Table */}
      <View style={styles.tableCard}>
        <View style={styles.tableCardHeader}>
          <Text style={styles.tableCardTitle}>Schedules ({filtered.length})</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.horizontalTableContainer}>
          <View style={{ width: TABLE_MIN_WIDTH }}>
            {/* Table Header Row */}
            <View style={styles.tableHeadRow}>
              <Text style={[styles.tableTh, { width: COL_WIDTHS.id }]}>ID</Text>
              <Text style={[styles.tableTh, { width: COL_WIDTHS.title }]}>Title</Text>
              <Text style={[styles.tableTh, { width: COL_WIDTHS.employee }]}>Employee</Text>
              <Text style={[styles.tableTh, { width: COL_WIDTHS.location }]}>Location</Text>
              <Text style={[styles.tableTh, { width: COL_WIDTHS.date }]}>Date</Text>
              <Text style={[styles.tableTh, { width: COL_WIDTHS.time }]}>Time Frame</Text>
              <Text style={[styles.tableTh, { width: COL_WIDTHS.type }]}>Type</Text>
              <Text style={[styles.tableTh, { width: COL_WIDTHS.status }]}>Status</Text>
              <Text style={[styles.tableTh, { width: COL_WIDTHS.actions, textAlign: "right" }]}>Actions</Text>
            </View>

            {/* Table Body Rows */}
            {filtered.map((s) => (
              <View key={s.id} style={styles.tableBodyRow}>
                <Text style={[styles.monoCell, { width: COL_WIDTHS.id }]}>{getDisplayScheduleId(s.id)}</Text>
                <Text style={[styles.tableTdText, styles.boldCell, { width: COL_WIDTHS.title }]} numberOfLines={1} ellipsizeMode="tail">{s.title}</Text>
                <Text style={[styles.tableTdText, { width: COL_WIDTHS.employee }]} numberOfLines={1} ellipsizeMode="tail">{s.assignee}</Text>
                <Text style={[styles.tableTdText, { width: COL_WIDTHS.location }]} numberOfLines={1} ellipsizeMode="tail">{s.location}</Text>
                <Text style={[styles.tableTdText, styles.mutedCell, { width: COL_WIDTHS.date }]}>{s.date}</Text>
                <Text style={[styles.tableTdText, styles.mutedCell, { width: COL_WIDTHS.time }]}>
                  {s.startTime || "—"} - {s.endTime || "—"}
                </Text>
                <View style={{ width: COL_WIDTHS.type, ...styles.badgeAlign }}>
                  <View style={styles.typeBadge}><Text style={styles.typeBadgeText}>{s.type}</Text></View>
                </View>
                <View style={{ width: COL_WIDTHS.status, ...styles.badgeAlign }}>
                  <View style={styles.statusBadge}><Text style={styles.statusBadgeText}>{s.status}</Text></View>
                </View>
                {/* Fixed Action Button Box Container alignment */}
                <View style={{ width: COL_WIDTHS.actions, alignItems: "flex-end" }}>
                  <TouchableOpacity style={styles.actionRowButton} onPress={() => handleOpenActionMenu(s)}>
                    <MoreHorizontal size={18} color="#ffd27a" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {filtered.length === 0 && (
              <View style={styles.emptyContainer}>
                <CalendarIcon size={24} color="#52525b" />
                <Text style={styles.emptyText}>No schedules mapped to query</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </View>

      {/* ─── ADD SCHEDULE MODAL ─── */}
      <Modal visible={addOpen} transparent animationType="slide" onRequestClose={() => setAddOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Schedule</Text>
              <TouchableOpacity onPress={() => setAddOpen(false)}><X size={18} color="#a1a1aa" /></TouchableOpacity>
            </View>
            <ScrollView style={styles.modalFormScroll}>
              <Text style={styles.fieldLabel}>Title *</Text>
              <TextInput style={styles.formInput} placeholder="Event title" placeholderTextColor="#52525b" value={formData.title} onChangeText={(text) => setFormData({ ...formData, title: text })} />

              <Text style={styles.fieldLabel}>Employee Name *</Text>
              <TextInput style={styles.formInput} placeholder="Assignee e.g., John Doe" placeholderTextColor="#52525b" value={formData.assignee} onChangeText={(text) => setFormData({ ...formData, assignee: text })} />

              <Text style={styles.fieldLabel}>Location *</Text>
              <TextInput style={styles.formInput} placeholder="e.g., Main Office" placeholderTextColor="#52525b" value={formData.location} onChangeText={(text) => setFormData({ ...formData, location: text })} />

              <Text style={styles.fieldLabel}>Date * (YYYY-MM-DD)</Text>
              <TextInput style={styles.formInput} placeholder="YYYY-MM-DD" placeholderTextColor="#52525b" value={formData.date} onChangeText={(text) => setFormData({ ...formData, date: text })} />

              <View style={styles.formRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Start Time</Text>
                  <TextInput style={styles.formInput} placeholder="09:00 AM" placeholderTextColor="#52525b" value={formData.startTime} onChangeText={(text) => setFormData({ ...formData, startTime: text })} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.fieldLabel}>End Time</Text>
                  <TextInput style={styles.formInput} placeholder="05:00 PM" placeholderTextColor="#52525b" value={formData.endTime} onChangeText={(text) => setFormData({ ...formData, endTime: text })} />
                </View>
              </View>

              <Text style={styles.fieldLabel}>Type (task, meeting, break, training)</Text>
              <TextInput style={styles.formInput} placeholder="task" placeholderTextColor="#52525b" autoCapitalize="none" value={formData.type} onChangeText={(text) => setFormData({ ...formData, type: text.toLowerCase() as any })} />

              <Text style={styles.fieldLabel}>Status (scheduled, completed, canceled)</Text>
              <TextInput style={styles.formInput} placeholder="scheduled" placeholderTextColor="#52525b" autoCapitalize="none" value={formData.status} onChangeText={(text) => setFormData({ ...formData, status: text.toLowerCase() as any })} />
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setAddOpen(false)}><Text style={styles.modalCancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmitBtn} onPress={addSchedule}><Text style={styles.modalSubmitText}>Add Schedule</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── EDIT SCHEDULE MODAL ─── */}
      <Modal visible={editOpen} transparent animationType="slide" onRequestClose={() => setEditOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Schedule</Text>
              <TouchableOpacity onPress={() => setEditOpen(false)}><X size={18} color="#a1a1aa" /></TouchableOpacity>
            </View>
            <ScrollView style={styles.modalFormScroll}>
              <Text style={styles.fieldLabel}>Title *</Text>
              <TextInput style={styles.formInput} placeholder="Event title" placeholderTextColor="#52525b" value={editFormData.title} onChangeText={(text) => setEditFormData({ ...editFormData, title: text })} />

              <Text style={styles.fieldLabel}>Employee Name *</Text>
              <TextInput style={styles.formInput} placeholder="Assignee Name" placeholderTextColor="#52525b" value={editFormData.assignee} onChangeText={(text) => setEditFormData({ ...editFormData, assignee: text })} />

              <Text style={styles.fieldLabel}>Location *</Text>
              <TextInput style={styles.formInput} placeholder="Location" placeholderTextColor="#52525b" value={editFormData.location} onChangeText={(text) => setEditFormData({ ...editFormData, location: text })} />

              <Text style={styles.fieldLabel}>Date * (YYYY-MM-DD)</Text>
              <TextInput style={styles.formInput} placeholder="YYYY-MM-DD" placeholderTextColor="#52525b" value={editFormData.date} onChangeText={(text) => setEditFormData({ ...editFormData, date: text })} />

              <View style={styles.formRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Start Time</Text>
                  <TextInput style={styles.formInput} value={editFormData.startTime} onChangeText={(text) => setEditFormData({ ...editFormData, startTime: text })} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.fieldLabel}>End Time</Text>
                  <TextInput style={styles.formInput} value={editFormData.endTime} onChangeText={(text) => setEditFormData({ ...editFormData, endTime: text })} />
                </View>
              </View>

              <Text style={styles.fieldLabel}>Type</Text>
              <TextInput style={styles.formInput} value={editFormData.type} autoCapitalize="none" onChangeText={(text) => setEditFormData({ ...editFormData, type: text.toLowerCase() as any })} />

              <Text style={styles.fieldLabel}>Status</Text>
              <TextInput style={styles.formInput} value={editFormData.status} autoCapitalize="none" onChangeText={(text) => setEditFormData({ ...editFormData, status: text.toLowerCase() as any })} />
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setEditOpen(false)}><Text style={styles.modalCancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmitBtn} onPress={saveEdit}><Text style={styles.modalSubmitText}>Save Changes</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── ROW OPTIONS CONTEXT SHEET ─── */}
      <Modal visible={actionMenuOpen} transparent animationType="fade" onRequestClose={() => setActionMenuOpen(false)}>
        <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={() => setActionMenuOpen(false)}>
          <View style={styles.sheetContent}>
            <Text style={styles.sheetHeaderLabel}>
              Manage: {selectedItem ? getDisplayScheduleId(selectedItem.id) : ""}
            </Text>
            <TouchableOpacity style={styles.sheetRowBtn} onPress={triggerEditFlow}>
              <Edit size={16} color="#d4d4d8" />
              <Text style={styles.sheetBtnText}>Edit Schedule Info</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.sheetRowBtn, { borderBottomWidth: 0 }]} onPress={() => triggerDeleteFlow()}>
              <Trash2 size={16} color="#ef4444" />
              <Text style={[styles.sheetBtnText, { color: "#ef4444" }]}>Remove Entry</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#a1a1aa",
    fontSize: 13,
  },
  screenContainer: {
    flex: 1,
    backgroundColor: "#09090b",
    paddingHorizontal: 16,
  },
  headerContainer: {
    marginTop: 20,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#f4f4f5",
    letterSpacing: 0.3,
  },
  pageSubtitle: {
    fontSize: 13,
    color: "#a1a1aa",
    marginTop: 2,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffd27a",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
    gap: 4,
  },
  addButtonText: {
    color: "#09090b",
    fontSize: 12,
    fontWeight: "700",
  },
  errorBanner: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 13,
  },
  searchCard: {
    backgroundColor: "#121214",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#18181b",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 6,
    paddingHorizontal: 10,
  },
  searchIcon: {
    marginRight: 6,
  },
  textInput: {
    flex: 1,
    height: 38,
    color: "#f4f4f5",
    fontSize: 13,
  },
  tableCard: {
    backgroundColor: "#121214",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 10,
    paddingVertical: 14,
  },
  tableCardHeader: {
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  tableCardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#f4f4f5",
  },
  horizontalTableContainer: {
    paddingHorizontal: 14, // Table boundaries padding placed cleanly on scroll area
  },
  tableHeadRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#27272a",
    paddingBottom: 8,
    marginBottom: 4,
  },
  tableTh: {
    fontSize: 11,
    fontWeight: "600",
    color: "#a1a1aa",
    textTransform: "uppercase",
    paddingRight: 6,
  },
  tableBodyRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#1c1c1f",
  },
  tableTdText: {
    fontSize: 13,
    color: "#d4d4d8",
    paddingRight: 8,
  },
  monoCell: {
    fontSize: 12,
    fontFamily: "monospace",
    color: "#71717a",
  },
  boldCell: {
    color: "#f4f4f5",
    fontWeight: "600",
  },
  mutedCell: {
    color: "#a1a1aa",
  },
  badgeAlign: {
    alignItems: "flex-start",
    justifyContent: "center",
  },
  typeBadge: {
    borderWidth: 1,
    borderColor: "#3f3f46",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: "#18181b",
  },
  typeBadgeText: {
    fontSize: 10,
    color: "#a1a1aa",
    textTransform: "capitalize",
    fontWeight: "600",
  },
  statusBadge: {
    backgroundColor: "#27272a",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 10,
    color: "#ffd27a",
    textTransform: "capitalize",
    fontWeight: "700",
  },
  actionRowButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 8,
  },
  emptyText: {
    color: "#52525b",
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContent: {
    backgroundColor: "#121214",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 12,
    width: "100%",
    maxWidth: 500,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderColor: "#27272a",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f4f4f5",
  },
  modalFormScroll: {
    padding: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#a1a1aa",
    marginBottom: 6,
    marginTop: 10,
  },
  formInput: {
    backgroundColor: "#18181b",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 6,
    height: 40,
    color: "#f4f4f5",
    paddingHorizontal: 12,
    fontSize: 14,
  },
  formRow: {
    flexDirection: "row",
  },
  modalFooter: {
    flexDirection: "row",
    padding: 16,
    borderTopWidth: 1,
    borderColor: "#27272a",
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  modalCancelText: {
    color: "#a1a1aa",
    fontSize: 14,
    fontWeight: "600",
  },
  modalSubmitBtn: {
    flex: 1,
    height: 40,
    backgroundColor: "#ffd27a",
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  modalSubmitText: {
    color: "#09090b",
    fontSize: 14,
    fontWeight: "700",
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheetContent: {
    backgroundColor: "#121214",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    padding: 16,
    borderTopWidth: 1,
    borderColor: "#27272a",
  },
  sheetHeaderLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#71717a",
    textTransform: "uppercase",
    marginBottom: 12,
    textAlign: "center",
  },
  sheetRowBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderColor: "#1c1c1f",
  },
  sheetBtnText: {
    fontSize: 14,
    color: "#e4e4e7",
    fontWeight: "600",
  },
});