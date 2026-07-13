import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Platform,
} from "react-native";
import {
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  Calendar as CalendarIcon,
  ChevronDown,
  X,
} from "lucide-react-native";
import {
  createResource,
  deleteResource,
  listResource,
  updateResource,
} from "@/lib/admin/apiClient";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";

const { width } = Dimensions.get("window");

interface LegalCalendar {
  id: string;
  _id?: string;
  calendarNumber: string;
  title: string;
  description?: string;
  eventDate?: string;
  time?: string;
  location?: string;
  eventType: "Hearing" | "Meeting" | "Deposition" | "Other";
  attendees?: string;
}

interface ApiResponse {
  items?: LegalCalendar[];
}

function buildColors(uiTheme: any, isDark: boolean) {
  return {
    background:       uiTheme.panelColors?.dashboardBackground     || (isDark ? "#0F172A" : "#F8FAFC"),
    cardBg:           uiTheme.panelColors?.dashboardCardBackground || (isDark ? "#1E293B" : "#FFFFFF"),
    text:             uiTheme.panelColors?.dashboardTextColor      || (isDark ? "#F8FAFC" : "#0F172A"),
    textSecondary:    isDark ? "#CBD5E1" : "#334155",
    textMuted:        isDark ? "#94A3B8" : "#64748B",
    border:           isDark ? "#334155" : "#E2E8F0",
    borderLight:      isDark ? "rgba(255,255,255,0.05)" : "#F1F5F9",
    inputBg:          isDark ? "#0F172A" : "#F8FAFC",
    inputBorder:      isDark ? "#334155" : "#E2E8F0",
    inputText:        isDark ? "#F8FAFC" : "#0F172A",
    placeholderText:  isDark ? "#475569" : "#94A3B8",
    primary:          uiTheme.customColors?.primary || (isDark ? "#6366F1" : "#2563EB"),
    primaryText:      "#FFFFFF",
    successBg:        isDark ? "rgba(16,185,129,0.15)" : "#ECFDF5",
    successText:      isDark ? "#34D399" : "#10B981",
    dangerBg:         isDark ? "rgba(239,68,68,0.15)" : "#FEF2F2",
    dangerText:       isDark ? "#FCA5A5" : "#EF4444",
    overlayBg:        "rgba(0,0,0,0.4)",
  };
}

function createStyles(colors: ReturnType<typeof buildColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
 header: { 
      paddingTop: Platform.OS === "ios" ? 60 : 24, 
      paddingHorizontal: 16, 
      paddingBottom: 16, 
      backgroundColor: colors.cardBg, 
      borderBottomWidth: 1, 
      borderColor: colors.border,
      flexDirection: "row", 
      alignItems: "center" 
    },
    headerTitle: { fontSize: 22, fontWeight: "bold", color: colors.text },
    headerSubtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
    scrollContainer: { padding: 16, paddingBottom: 40 },
    filterCard: { backgroundColor: colors.cardBg, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.border, gap: 10, marginBottom: 16 },
    searchContainer: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingHorizontal: 10, height: 38, backgroundColor: colors.inputBg },
    searchIcon: { marginRight: 6 },
    searchInput: { flex: 1, fontSize: 14, color: colors.inputText },
    pickerTrigger: { borderWidth: 1, borderColor: colors.border, borderRadius: 6, height: 38, paddingHorizontal: 10, backgroundColor: "#FFFFFF", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    pickerTriggerText: { fontSize: 14, color: "#000000", fontWeight: "600", flex: 1 },
    listHeading: { fontSize: 16, fontWeight: "600", color: colors.text, marginBottom: 12 },
    emptyContainer: { padding: 32, alignItems: "center" },
    emptyText: { color: colors.textMuted, fontSize: 14 },
    itemCard: { backgroundColor: colors.cardBg, borderRadius: 8, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 12 },
    cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", borderBottomWidth: 1, borderColor: colors.borderLight, paddingBottom: 10 },
    itemNumber: { fontSize: 12, fontWeight: "600", color: colors.primary },
    itemTitle: { fontSize: 15, fontWeight: "600", color: colors.text, marginVertical: 2 },
    typeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1, backgroundColor: "rgba(99,102,241,0.15)", borderColor: "rgba(99,102,241,0.3)" },
    cardDetailsGrid: { paddingVertical: 10, gap: 6 },
    detailRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    detailLabel: { fontSize: 13, color: colors.textMuted },
    detailText: { fontSize: 13, color: colors.textSecondary, fontWeight: "500" },
    cardActionsRow: { flexDirection: "row", borderTopWidth: 1, borderColor: colors.borderLight, paddingTop: 10, justifyContent: "space-around" },
    actionBtn: { flexDirection: "row", alignItems: "center", gap: 4, padding: 4 },
    actionBtnText: { fontSize: 13, fontWeight: "500", color: colors.textMuted },
    btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 38, paddingHorizontal: 14, borderRadius: 6 },
    btnPrimary: { backgroundColor: colors.primary, marginTop: 12 ,minHeight:40,textAlign:'center'},
    btnPrimaryText: { color: colors.primaryText, fontSize: 13, fontWeight: "600" ,
        textAlign:'center',paddingTop:10
    },
    btnOutline: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardBg },
    btnOutlineText: { color: colors.text, fontSize: 13, fontWeight: "600" },
    modalOverlay: { flex: 1, backgroundColor: colors.overlayBg, justifyContent: "center", padding: 16 },
    pickerContentContainer: { backgroundColor: colors.cardBg, borderRadius: 8, padding: 16, borderWidth: 1, borderColor: colors.border },
    pickerModalTitle: { fontSize: 15, fontWeight: "600", marginBottom: 12, color: colors.text },
    pickerOptionItem: { paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.borderLight },
    pickerOptionText: { fontSize: 14, color: colors.text },
    modalScrollFormContainer: { backgroundColor: colors.cardBg, borderRadius: 8, padding: 16, paddingBottom: 24, borderWidth: 1, borderColor: colors.border },
    modalHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderColor: colors.border, paddingBottom: 10, marginBottom: 8 },
    modalTitle: { fontSize: 16, fontWeight: "600", color: colors.text },
    fieldLabel: { fontSize: 13, fontWeight: "500", color: colors.textSecondary, marginBottom: 4, marginTop: 8 },
    modalInput: { borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 6, height: 38, paddingHorizontal: 10, fontSize: 14, color: colors.inputText, backgroundColor: colors.inputBg },
    textAreaInput: { height: 70, paddingTop: 8, textAlignVertical: "top" },
    modalFooter: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 14 },
    viewDetailGridBlock: { borderBottomWidth: 1, borderColor: colors.borderLight, paddingBottom: 8 },
    viewBlockLabel: { fontSize: 12, color: colors.textMuted, marginBottom: 2 },
    viewBlockValue: { fontSize: 14, fontWeight: "500", color: colors.text },
    viewNotesBox: { backgroundColor: colors.inputBg, padding: 8, borderRadius: 4, marginTop: 4, fontSize: 13, color: colors.textSecondary },
  });
}

export default function CalendarScreen() {
  const { user } = useAuth();
  const { uiTheme } = useTheme();
  const isDark = (uiTheme.theme as string) === "dark" || (uiTheme.theme as string) === "metallic-elite";
  const colors = useMemo(() => buildColors(uiTheme, isDark), [uiTheme, isDark]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [events, setEvents] = useState<LegalCalendar[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [activePicker, setActivePicker] = useState<{ type: "type" | "form-type"; options: { label: string; value: string }[] } | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<LegalCalendar | null>(null);

  const [formData, setFormData] = useState({
    calendarNumber: "",
    title: "",
    description: "",
    eventDate: "",
    time: "",
    location: "",
    eventType: "Hearing" as LegalCalendar["eventType"],
    attendees: "",
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await listResource<ApiResponse | LegalCalendar[]>("legal/calendar");
      
      if (res && typeof res === "object" && "items" in res && Array.isArray(res.items)) {
        setEvents(res.items);
      } else if (Array.isArray(res)) {
        setEvents(res);
      } else {
        setEvents([]);
      }
    } catch {
      Alert.alert("Error", "Failed to retrieve calendar schedules from data server.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchData();
  }, [user, fetchData]);

  const filteredEvents = useMemo(() => {
    return events.filter((item) => {
      const calendarNo = item?.calendarNumber || "";
      const titleText = item?.title || "";
      const matchesSearch = calendarNo.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            titleText.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === "all" || item.eventType === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [events, searchQuery, typeFilter]);

  const validateForm = () => {
    if (!formData.calendarNumber.trim() || !formData.title.trim()) {
      Alert.alert("Validation Error", "Calendar Identifier Number and Title are mandatory fields.");
      return false;
    }
    return true;
  };

  const handleCreate = async () => {
    if (!validateForm()) return;
    try {
      setIsSubmitting(true);
      const payload = {
        ...formData,
        eventDate: formData.eventDate ? new Date(formData.eventDate).toISOString() : new Date().toISOString()
      };
      await createResource<LegalCalendar>("legal/calendar", payload);
      setIsCreateOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Submission fault detected.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedEvent || !validateForm()) return;
    try {
      setIsSubmitting(true);
      const targetId = selectedEvent.id || selectedEvent._id || "";
      const payload = {
        ...formData,
        eventDate: formData.eventDate ? new Date(formData.eventDate).toISOString() : new Date().toISOString()
      };
      await updateResource<LegalCalendar>("legal/calendar", targetId, payload);
      setIsEditOpen(false);
      setSelectedEvent(null);
      resetForm();
      fetchData();
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Update transaction failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDeleteConfirmation = (item: LegalCalendar) => {
    const targetId = item.id || item._id || "";
    Alert.alert("Delete Event", `Are you sure you want to permanently erase event ${item.calendarNumber}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
          try {
            await deleteResource("legal/calendar", targetId);
            fetchData();
          } catch {
            Alert.alert("Error", "Failed to clear information files.");
          }
        }},
    ]);
  };

  const resetForm = () => {
    setFormData({ calendarNumber: "", title: "", description: "", eventDate: "", time: "", location: "", eventType: "Hearing", attendees: "" });
  };

  const openEdit = (item: LegalCalendar) => {
    setSelectedEvent(item);
    
    let formattedDate = "";
    if (item.eventDate) {
      formattedDate = item.eventDate.split("T")[0];
    }

    setFormData({
      calendarNumber: item.calendarNumber || "",
      title: item.title || "",
      description: item.description || "",
      eventDate: formattedDate,
      time: item.time || "",
      location: item.location || "",
      eventType: item.eventType || "Hearing",
      attendees: item.attendees || "",
    });
    setIsEditOpen(true);
  };

  const openPickerModal = (type: "type" | "form-type") => {
    const types: LegalCalendar["eventType"][] = ["Hearing", "Meeting", "Deposition", "Other"];
    const options = type === "type" 
      ? [{ label: "All Types", value: "all" }, ...types.map(t => ({ label: t, value: t }))]
      : types.map(t => ({ label: t, value: t }));
    setActivePicker({ type, options });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Legal Calendar</Text>
          <Text style={styles.headerSubtitle}>Manage your calendar and associated metadata.</Text>
        </View>
        <TouchableOpacity style={[styles.btn, styles.btnPrimary, { marginTop: 0 }]} onPress={() => { resetForm(); setIsCreateOpen(true); }}>
          <Plus size={14} color={colors.primaryText} />
          <Text style={styles.btnPrimaryText}>Add Calender</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContainer} 
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={() => { 
              setRefreshing(true); 
              fetchData(); 
            }} 
            tintColor={colors.primary} 
          />
        }
      >
        <View style={styles.filterCard}>
          <View style={styles.searchContainer}>
            <Search size={18} color={colors.textMuted} style={styles.searchIcon} />
            <TextInput style={styles.searchInput} placeholder="Search calender ..." placeholderTextColor={colors.placeholderText} value={searchQuery} onChangeText={setSearchQuery} />
          </View>
          <TouchableOpacity style={styles.pickerTrigger} onPress={() => openPickerModal("type")}>
            <Text style={styles.pickerTriggerText}>{typeFilter === "all" ? "All Formats" : typeFilter}</Text>
            <ChevronDown size={14} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        
        {loading ? <ActivityIndicator size="large" color={colors.primary} /> : filteredEvents.length === 0 ? (
          <View style={styles.emptyContainer}><Text style={styles.emptyText}>No registered calender match current filter configurations.</Text></View>
        ) : (
          filteredEvents.map((item, index) => {
            const itemKey = item.id || item._id || `calendar-item-${index}`;
            return (
              <View key={itemKey} style={styles.itemCard}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.itemNumber}>{item.calendarNumber}</Text>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                  </View>
                  <View style={styles.typeBadge}><Text style={{ fontSize: 11, fontWeight: "600", color: colors.primary }}>{item.eventType}</Text></View>
                </View>
                <View style={styles.cardDetailsGrid}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Target Date</Text>
                    <Text style={styles.detailText}>{item.eventDate ? item.eventDate.split("T")[0] : "—"}</Text>
                  </View>
                  <View style={styles.detailRow}><Text style={styles.detailLabel}>Time Slot</Text><Text style={styles.detailText}>{item.time || "—"}</Text></View>
                  <View style={styles.detailRow}><Text style={styles.detailLabel}>Location Venue</Text><Text style={styles.detailText}>{item.location || "—"}</Text></View>
                </View>
                <View style={styles.cardActionsRow}>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => { setSelectedEvent(item); setIsViewOpen(true); }}><Eye size={16} color={colors.textMuted} /><Text style={styles.actionBtnText}>View</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => openEdit(item)}><Edit size={16} color={colors.textMuted} /><Text style={styles.actionBtnText}>Edit</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => openDeleteConfirmation(item)}><Trash2 size={16} color={colors.dangerText} /><Text style={[styles.actionBtnText, { color: colors.dangerText }]}>Delete</Text></TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal visible={activePicker !== null} transparent animationType="fade" onRequestClose={() => setActivePicker(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setActivePicker(null)}>
          <View style={styles.pickerContentContainer}>
            <Text style={styles.pickerModalTitle}>Select Options Matrix</Text>
            {activePicker?.options.map((opt, idx) => (
              <TouchableOpacity key={idx} style={styles.pickerOptionItem} onPress={() => { if (activePicker.type === "type") setTypeFilter(opt.value); else setFormData({ ...formData, eventType: opt.value as any }); setActivePicker(null); }}><Text style={styles.pickerOptionText}>{opt.label}</Text></TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={isViewOpen} transparent animationType="slide" onRequestClose={() => setIsViewOpen(false)}>
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollFormContainer}>
            <View style={styles.modalHeaderRow}><Text style={styles.modalTitle}>Calendar Details</Text><TouchableOpacity onPress={() => setIsViewOpen(false)}><X size={20} color={colors.text} /></TouchableOpacity></View>
            {selectedEvent && (
              <View style={{ gap: 14, marginVertical: 12 }}>
                <View style={styles.viewDetailGridBlock}><Text style={styles.viewBlockLabel}>Calendar Number</Text><Text style={styles.viewBlockValue}>{selectedEvent.calendarNumber}</Text></View>
                <View style={styles.viewDetailGridBlock}><Text style={styles.viewBlockLabel}>Title</Text><Text style={styles.viewBlockValue}>{selectedEvent.title}</Text></View>
                <View style={styles.viewDetailGridBlock}><Text style={styles.viewBlockLabel}>Event Classification</Text><Text style={styles.viewBlockValue}>{selectedEvent.eventType}</Text></View>
                <View style={styles.viewDetailGridBlock}><Text style={styles.viewBlockLabel}>Date</Text><Text style={styles.viewBlockValue}>{selectedEvent.eventDate ? selectedEvent.eventDate.split("T")[0] : "—"}</Text></View>
                <View style={styles.viewDetailGridBlock}><Text style={styles.viewBlockLabel}>Time</Text><Text style={styles.viewBlockValue}>{selectedEvent.time || "—"}</Text></View>
                <View style={styles.viewDetailGridBlock}><Text style={styles.viewBlockLabel}>Location</Text><Text style={styles.viewBlockValue}>{selectedEvent.location || "—"}</Text></View>
                <View style={styles.viewDetailGridBlock}><Text style={styles.viewBlockLabel}>Attendees</Text><Text style={styles.viewBlockValue}>{selectedEvent.attendees || "—"}</Text></View>
                {selectedEvent.description ? <View style={styles.viewDetailGridBlock}><Text style={styles.viewBlockLabel}>Notes Description</Text><Text style={styles.viewNotesBox}>{selectedEvent.description}</Text></View> : null}
              </View>
            )}
            <TouchableOpacity style={styles.btnPrimary} onPress={() => setIsViewOpen(false)}>
                <Text style={styles.btnPrimaryText}>Dismiss Summary</Text></TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={isCreateOpen || isEditOpen} transparent animationType="slide" onRequestClose={() => { setIsCreateOpen(false); setIsEditOpen(false); }}>
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollFormContainer}>
            <View style={styles.modalHeaderRow}><Text style={styles.modalTitle}>{isCreateOpen ? "Create New Calender" : "Modify Calender"}</Text><TouchableOpacity onPress={() => { setIsCreateOpen(false); setIsEditOpen(false); }}><X size={20} color={colors.text} /></TouchableOpacity></View>
            <Text style={styles.fieldLabel}>Calendar Number ID *</Text>
            <TextInput style={styles.modalInput} value={formData.calendarNumber} onChangeText={(text) => setFormData({ ...formData, calendarNumber: text })} placeholder="e.g., CAL-2026-04" placeholderTextColor={colors.placeholderText} />
            <Text style={styles.fieldLabel}>Title *</Text>
            <TextInput style={styles.modalInput} value={formData.title} onChangeText={(text) => setFormData({ ...formData, title: text })} placeholder="Event structural title" placeholderTextColor={colors.placeholderText} />
            <Text style={styles.fieldLabel}>Event Classification Type *</Text>
            <TouchableOpacity style={styles.pickerTrigger} onPress={() => openPickerModal("form-type")}><Text style={styles.pickerTriggerText}>{formData.eventType}</Text><ChevronDown size={14} color={colors.textMuted} /></TouchableOpacity>
            <Text style={styles.fieldLabel}>Scheduled Date (YYYY-MM-DD)</Text>
            <TextInput style={styles.modalInput} value={formData.eventDate} onChangeText={(text) => setFormData({ ...formData, eventDate: text })} placeholder="e.g., 2026-08-14" placeholderTextColor={colors.placeholderText} />
            <Text style={styles.fieldLabel}>Time Slot</Text>
            <TextInput style={styles.modalInput} value={formData.time} onChangeText={(text) => setFormData({ ...formData, time: text })} placeholder="e.g., 10:00 AM" placeholderTextColor={colors.placeholderText} />
            <Text style={styles.fieldLabel}>Location Venue</Text>
            <TextInput style={styles.modalInput} value={formData.location} onChangeText={(text) => setFormData({ ...formData, location: text })} placeholder="e.g., Courtroom 4B" placeholderTextColor={colors.placeholderText} />
            <Text style={styles.fieldLabel}>Attendees</Text>
            <TextInput style={styles.modalInput} value={formData.attendees} onChangeText={(text) => setFormData({ ...formData, attendees: text })} placeholder="E.g., Client, Opposing Counsel" placeholderTextColor={colors.placeholderText} />
            <Text style={styles.fieldLabel}>Description Dossier Notes</Text>
            <TextInput style={[styles.modalInput, styles.textAreaInput]} multiline numberOfLines={3} value={formData.description} onChangeText={(text) => setFormData({ ...formData, description: text })} placeholder="Calender logs..." placeholderTextColor={colors.placeholderText} />
            <View style={styles.modalFooter}>
              <TouchableOpacity style={[styles.btn, styles.btnOutline]} onPress={() => { setIsCreateOpen(false); setIsEditOpen(false); }}><Text style={styles.btnOutlineText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.btnPrimary, { marginTop: 0 }]} disabled={isSubmitting} onPress={isCreateOpen ? handleCreate : handleUpdate}>{isSubmitting ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.btnPrimaryText}>Save Calender</Text>}</TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}