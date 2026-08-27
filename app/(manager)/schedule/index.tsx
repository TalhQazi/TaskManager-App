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
  Dimensions,
  PixelRatio
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/contexts/ThemeContext";
import { s } from "@/util/styles";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Calendar as CalendarIcon,
  MapPin,
  User,
  Clock,
  X,
  ChevronDown,
  Check
} from "lucide-react-native";
import { apiFetch } from "@/lib/admin/apiClient";
import { isDarkTheme } from "@/constants/design/presets";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Responsive scaling utility
const scale = (size: number) => (SCREEN_WIDTH / 375) * size;
const normalize = (size: number) => {
  const newSize = scale(size);
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

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

function normalizeScheduleItem(sItem: ScheduleItemApi): ScheduleItem {
  return {
    id: sItem._id,
    title: sItem.title,
    assignee: sItem.assignee,
    location: sItem.location,
    date: sItem.date,
    startTime: sItem.startTime,
    endTime: sItem.endTime,
    type: sItem.type,
    status: sItem.status || "scheduled",
  };
}

function buildColors(uiTheme: any) {
  const isDark = isDarkTheme(uiTheme?.theme);
  return {
    background:      uiTheme.panelColors?.dashboardBackground     || (isDark ? "#09090b" : "#ffffff"),
    panelHeader:      uiTheme.panelColors?.dashboardCardBackground || (isDark ? "#141517" : "#f8fafc"),
    cardBg:          uiTheme.panelColors?.dashboardCardBackground || (isDark ? "#141517" : "#f8fafc"),
    text:            uiTheme.panelColors?.dashboardTextColor      || (isDark ? "#f8fafc" : "#000000"),
    textSecondary:   isDark ? "#a1a1aa" : "#475569",
    border:          isDark ? "#27272a" : "rgba(0, 0, 0, 0.08)",
    primary:         uiTheme.customColors?.primary                || "#ffd27a",
    success:         "#16C784",
    warning:         "#F59E0B",
    danger:          "#EF4444",
    inputBg:         isDark ? "#09090b" : "#ffffff",
    overlay:         "rgba(0,0,0,0.6)",
    badgeBg:         isDark ? "#27272a" : "#e4e4e7",
    itemSelectedBg:  isDark ? "rgba(255, 210, 122, 0.08)" : "rgba(255, 210, 122, 0.15)"
  };
}

function createStyles(colors: ReturnType<typeof buildColors>) {
  return StyleSheet.create({
    viewport: {
      flex: 1,
      backgroundColor: colors.background,
    },
    centered: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.background,
    },
    loadingText: {
      marginTop: normalize(8),
      color: colors.textSecondary,
      fontSize: normalize(14),
    },
    scrollContent: {
      paddingHorizontal: "4%",
      paddingTop: normalize(16),
      paddingBottom: normalize(40),
    },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: normalize(20),
      flexWrap: "wrap",
      gap: normalize(10),
    },
    titleHeading: {
      fontSize: normalize(24),
      fontWeight: "800",
      color: colors.text,
      letterSpacing: 0.3,
    },
    subtitleText: {
      fontSize: normalize(12),
      color: colors.textSecondary,
      marginTop: normalize(2),
    },
    primaryActionBtn: {
      flexDirection: "row",
      backgroundColor: colors.primary,
      paddingVertical: normalize(10),
      paddingHorizontal: normalize(14),
      borderRadius: normalize(8),
      alignItems: "center",
      gap: normalize(6),
    },
    primaryActionBtnText: {
      color: colors.inputBg,
      fontSize: normalize(13),
      fontWeight: "700",
    },
    searchCard: {
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: normalize(12),
      padding: normalize(12),
      marginBottom: normalize(20),
    },
    searchBarContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: normalize(8),
      paddingHorizontal: normalize(12),
      height: normalize(42),
    },
    searchIcon: {
      marginRight: normalize(8),
    },
    searchBarInput: {
      flex: 1,
      color: colors.text,
      fontSize: normalize(14),
      padding: 0,
    },
    sectionTitle: {
      fontSize: normalize(16),
      fontWeight: "700",
      color: colors.text,
      marginBottom: normalize(12),
      paddingHorizontal: normalize(2),
    },
    scheduleCardItem: {
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: normalize(12),
      padding: normalize(16),
      marginBottom: normalize(12),
      gap: normalize(12),
    },
    cardHeaderBlock: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    metaIdentityRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: normalize(8),
      flex: 1,
      marginRight: normalize(8),
    },
    calendarIconWrapper: {
      width: normalize(32),
      height: normalize(32),
      borderRadius: normalize(8),
      backgroundColor: "rgba(255, 210, 122, 0.1)",
      alignItems: "center",
      justifyContent: "center",
    },
    monoIdText: {
      fontSize: normalize(11),
      fontWeight: "700",
      color: colors.textSecondary,
    },
    itemTitleText: {
      fontSize: normalize(14),
      fontWeight: "700",
      color: colors.text,
      marginTop: normalize(1),
    },
    contextRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: normalize(8),
    },
    contextColumnBlock: {
      flex: 1,
    },
    contextLabel: {
      fontSize: normalize(10),
      fontWeight: "600",
      color: colors.textSecondary,
    },
    contextValue: {
      fontSize: normalize(13),
      color: colors.text,
      marginTop: normalize(1),
    },
    badgeRow: {
      flexDirection: "row",
      gap: normalize(6),
      marginTop: normalize(2),
      flexWrap: "wrap",
    },
    typeBadge: {
      backgroundColor: colors.badgeBg,
      paddingHorizontal: normalize(8),
      paddingVertical: normalize(3),
      borderRadius: normalize(6),
    },
    typeBadgeText: {
      fontSize: normalize(11),
      color: colors.text,
      fontWeight: "600",
      textTransform: "capitalize",
    },
    statusBadge: {
      paddingHorizontal: normalize(8),
      paddingVertical: normalize(3),
      borderRadius: normalize(6),
      borderWidth: 0.5,
    },
    statusBadgeText: {
      fontSize: normalize(11),
      fontWeight: "700",
      textTransform: "capitalize",
    },
    fallbackEmptyBlock: {
      paddingVertical: normalize(40),
      paddingHorizontal: normalize(20),
      alignItems: "center",
      justifyContent: "center",
    },
    fallbackEmptyTextPrimary: {
      fontSize: normalize(15),
      fontWeight: "700",
      color: colors.text,
      marginTop: normalize(12),
    },
    fallbackEmptyTextSecondary: {
      fontSize: normalize(13),
      color: colors.textSecondary,
      textAlign: "center",
      marginTop: normalize(4),
    },
    modalOverlayMask: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: "center",
      alignItems: "center",
    },
    modalSheetContainer: {
      width: "92%",
      maxWidth: 500,
      backgroundColor: colors.background,
      borderRadius: normalize(16),
      borderWidth: 1,
      borderColor: colors.border,
      maxHeight: SCREEN_HEIGHT * 0.85,
      overflow: "hidden",
    },
    modalHeaderPane: {
      padding: normalize(16),
      borderBottomWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.panelHeader,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    modalTitleText: {
      fontSize: normalize(16),
      fontWeight: "800",
      color: colors.text,
    },
    modalSubtitleText: {
      fontSize: normalize(12),
      color: colors.textSecondary,
      marginTop: normalize(2),
    },
    modalScrollArea: {
      padding: normalize(16),
    },
    formGroup: {
      marginBottom: normalize(14),
    },
    formLabel: {
      fontSize: normalize(12),
      fontWeight: "600",
      color: colors.textSecondary,
      marginBottom: normalize(6),
    },
    formInput: {
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: normalize(6),
      paddingHorizontal: normalize(12),
      height: normalize(42),
      color: colors.text,
      fontSize: normalize(14),
    },
    selectorPickerTrigger: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: normalize(6),
      paddingHorizontal: normalize(12),
      height: normalize(42),
    },
    selectorPickerText: {
      fontSize: normalize(14),
      color: colors.text,
      fontWeight: "500",
    },
    selectorPickerPlaceholder: {
      fontSize: normalize(14),
      color: colors.textSecondary,
    },
    modalFooterStrip: {
      flexDirection: "row",
      borderTopWidth: 1,
      borderColor: colors.border,
      padding: normalize(12),
      backgroundColor: colors.panelHeader,
      gap: normalize(10),
    },
    footerCancelBtn: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: normalize(8),
      height: normalize(42),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.background,
    },
    footerCancelBtnText: {
      color: colors.text,
      fontSize: normalize(13),
      fontWeight: "600",
    },
    footerSubmitBtn: {
      flex: 1,
      backgroundColor: colors.primary,
      borderRadius: normalize(8),
      height: normalize(42),
      alignItems: "center",
      justifyContent: "center",
    },
    footerSubmitBtnText: {
      color: colors.inputBg,
      fontSize: normalize(13),
      fontWeight: "700",
    },
    pickerOptionsContainer: {
      width: "88%",
      maxWidth: 420,
      backgroundColor: colors.background,
      borderRadius: normalize(14),
      borderWidth: 1,
      borderColor: colors.border,
      maxHeight: SCREEN_HEIGHT * 0.65,
      overflow: "hidden",
    },
    pickerOptionItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: normalize(12),
      paddingHorizontal: normalize(16),
      borderBottomWidth: 1,
      borderColor: colors.border,
    },
    pickerOptionItemText: {
      fontSize: normalize(14),
      color: colors.text,
      fontWeight: "500",
    },
  });
}

export default function Scheduling() {
  const { uiTheme } = useTheme();
  const colors = useMemo(() => buildColors(uiTheme), [uiTheme]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selected, setSelected] = useState<ScheduleItem | null>(null);

  const [pickerConfig, setPickerConfig] = useState<{
    visible: boolean;
    title: string;
    options: string[];
    target: "add" | "edit";
    key: "assignee" | "type" | "status";
    currentValue: string;
  }>({
    visible: false,
    title: "",
    options: [],
    target: "add",
    key: "assignee",
    currentValue: ""
  });

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

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const res = await apiFetch<{ items: ScheduleItemApi[] }>("/api/events");
      setSchedules((res.items || []).map(normalizeScheduleItem));

      const empRes = await apiFetch<{ items: Employee[] }>("/api/employees");
      setEmployees((empRes.items ?? []).filter((e) => e.status === "active"));
    } catch {
      Alert.alert("Error", "Failed to load configuration schedules");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const refreshSchedules = async () => {
    try {
      const res = await apiFetch<{ items: ScheduleItemApi[] }>("/api/events");
      setSchedules((res.items || []).map(normalizeScheduleItem));
    } catch {
      // Passive logging suppression
    }
  };

  const displayIdByScheduleId = useMemo(() => {
    return new Map(
      schedules.map((sItem, idx) => {
        const displayId = `SC${String(idx + 1).padStart(3, "0")}`;
        return [sItem.id, displayId] as const;
      }),
    );
  }, [schedules]);

  const getDisplayScheduleId = (scheduleId: string) => {
    return displayIdByScheduleId.get(scheduleId) || scheduleId;
  };

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return schedules;
    return schedules.filter((sItem) => {
      return (
        sItem.location.toLowerCase().includes(q) ||
        sItem.assignee.toLowerCase().includes(q) ||
        sItem.title.toLowerCase().includes(q)
      );
    });
  }, [schedules, searchQuery]);

  const addSchedule = async () => {
    if (!formData.title || !formData.assignee || !formData.date) {
      Alert.alert("Required Fields", "Please populate Title, Employee, and Date configuration markers.");
      return;
    }
    const next = {
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
    } catch {
      Alert.alert("Error", "Failed to commit shift record mapping entry");
    }
  };

  const onEdit = (sItem: ScheduleItem) => {
    setSelected(sItem);
    setEditFormData({
      title: sItem.title,
      assignee: sItem.assignee,
      location: sItem.location,
      date: sItem.date,
      startTime: sItem.startTime,
      endTime: sItem.endTime,
      type: sItem.type,
      status: sItem.status,
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!selected) return;
    try {
      await apiFetch(`/api/events/${selected.id}`, {
        method: "PUT",
        body: JSON.stringify(editFormData),
      });
      await refreshSchedules();
      setEditOpen(false);
      setSelected(null);
    } catch {
      Alert.alert("Error", "Failed to process target modifications");
    }
  };

  const onDelete = (sItem: ScheduleItem) => {
    Alert.alert(
      "Confirm Action",
      "Are you sure you want to delete this schedule?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await apiFetch(`/api/events/${sItem.id}`, {
                method: "DELETE",
              });
              await refreshSchedules();
            } catch {
              Alert.alert("Error", "Failed to clear specified schedule allocation");
            }
          }
        }
      ]
    );
  };

  const openOptionDropdown = (
    title: string,
    options: string[],
    target: "add" | "edit",
    key: "assignee" | "type" | "status",
    currentValue: string
  ) => {
    setPickerConfig({
      visible: true,
      title,
      options,
      target,
      key,
      currentValue
    });
  };

  const handleSelectOption = (option: string) => {
    const { target, key } = pickerConfig;
    if (target === "add") {
      setFormData((prev) => ({ ...prev, [key]: option }));
    } else {
      setEditFormData((prev) => ({ ...prev, [key]: option }));
    }
    setPickerConfig((prev) => ({ ...prev, visible: false }));
  };

  const getStatusStyleMap = (status: string) => {
    switch (status) {
      case "completed":
        return { bg: "rgba(22, 199, 132, 0.1)", text: colors.success, bdr: "rgba(22, 199, 132, 0.3)" };
      case "canceled":
        return { bg: "rgba(239, 68, 68, 0.1)", text: colors.danger, bdr: "rgba(239, 68, 68, 0.3)" };
      default:
        return { bg: "rgba(245, 158, 11, 0.1)", text: colors.warning, bdr: "rgba(245, 158, 11, 0.3)" };
    }
  };

  if (loading) {
    return (
      <View style={s(styles.centered)}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={s(styles.loadingText)}>Loading schedules...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={s(styles.viewport)} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={s(styles.scrollContent)} showsVerticalScrollIndicator={false}>
        
        <View style={s(styles.headerRow)}>
          <View>
            <Text style={s(styles.titleHeading)}>Scheduling</Text>
            <Text style={s(styles.subtitleText)}>Plan and manage team schedules</Text>
          </View>
          <TouchableOpacity style={s(styles.primaryActionBtn)} onPress={() => setAddOpen(true)}>
            <Plus size={normalize(14)} color={colors.inputBg} />
            <Text style={s(styles.primaryActionBtnText)}>Add Schedule</Text>
          </TouchableOpacity>
        </View>

        <View style={s(styles.searchCard)}>
          <View style={s(styles.searchBarContainer)}>
            <Search size={normalize(16)} color={colors.textSecondary} style={s(styles.searchIcon)} />
            <TextInput
              style={s(styles.searchBarInput)}
              placeholder="Search by location, employee, or type..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
            />
          </View>
        </View>

        <Text style={s(styles.sectionTitle)}>Schedules ({filtered.length})</Text>

        {filtered.map((sItem) => {
          const statusStyle = getStatusStyleMap(sItem.status);
          return (
            <View key={sItem.id} style={s(styles.scheduleCardItem)}>
              <View style={s(styles.cardHeaderBlock)}>
                <View style={s(styles.metaIdentityRow)}>
                  <View style={s(styles.calendarIconWrapper)}>
                    <CalendarIcon size={normalize(14)} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s(styles.monoIdText)}>{getDisplayScheduleId(sItem.id)}</Text>
                    <Text style={s(styles.itemTitleText)} numberOfLines={1}>{sItem.title}</Text>
                  </View>
                </View>
                <View style={{ flexDirection: "row", gap: normalize(6) }}>
                  <TouchableOpacity style={{ padding: normalize(6) }} onPress={() => onEdit(sItem)}>
                    <Edit size={normalize(16)} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity style={{ padding: normalize(6) }} onPress={() => onDelete(sItem)}>
                    <Trash2 size={normalize(16)} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={s(styles.contextRow)}>
                <User size={normalize(14)} color={colors.textSecondary} />
                <View style={s(styles.contextColumnBlock)}>
                  <Text style={s(styles.contextLabel)}>Employee</Text>
                  <Text style={s(styles.contextValue)} numberOfLines={1}>{sItem.assignee}</Text>
                </View>
              </View>

              <View style={s(styles.contextRow)}>
                <MapPin size={normalize(14)} color={colors.textSecondary} />
                <View style={s(styles.contextColumnBlock)}>
                  <Text style={s(styles.contextLabel)}>Location</Text>
                  <Text style={s(styles.contextValue)} numberOfLines={1}>{sItem.location}</Text>
                </View>
              </View>

              <View style={s(styles.contextRow)}>
                <Clock size={normalize(14)} color={colors.textSecondary} />
                <View style={s(styles.contextColumnBlock)}>
                  <Text style={s(styles.contextLabel)}>Date & Time</Text>
                  <Text style={s(styles.contextValue)} numberOfLines={1}>
                    {sItem.date} · {sItem.startTime || "—"} - {sItem.endTime || "—"}
                  </Text>
                </View>
              </View>

              <View style={s(styles.badgeRow)}>
                <View style={s(styles.typeBadge)}>
                  <Text style={s(styles.typeBadgeText)}>{sItem.type || "—"}</Text>
                </View>
                <View style={s([styles.statusBadge, { backgroundColor: statusStyle.bg, borderColor: statusStyle.bdr }])}>
                  <Text style={s([styles.statusBadgeText, { color: statusStyle.text }])}>{sItem.status}</Text>
                </View>
              </View>
            </View>
          );
        })}

        {filtered.length === 0 && (
          <View style={s(styles.fallbackEmptyBlock)}>
            <CalendarIcon size={normalize(36)} color={colors.textSecondary} />
            <Text style={s(styles.fallbackEmptyTextPrimary)}>No schedules found</Text>
            <Text style={s(styles.fallbackEmptyTextSecondary)}>Try adjusting your filters or add a fresh schedule allocation matrix.</Text>
          </View>
        )}
      </ScrollView>

      {/* Add Schedule Modal */}
      <Modal visible={addOpen} transparent animationType="slide" onRequestClose={() => setAddOpen(false)}>
        <View style={s(styles.modalOverlayMask)}>
          <View style={s(styles.modalSheetContainer)}>
            <View style={s(styles.modalHeaderPane)}>
              <View>
                <Text style={s(styles.modalTitleText)}>Add Schedule</Text>
                <Text style={s(styles.modalSubtitleText)}>Create a new shift schedule</Text>
              </View>
              <TouchableOpacity onPress={() => setAddOpen(false)} style={{ padding: normalize(4) }}>
                <X size={normalize(18)} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={s(styles.modalScrollArea)} keyboardShouldPersistTaps="handled">
              <View style={s(styles.formGroup)}>
                <Text style={s(styles.formLabel)}>Title *</Text>
                <TextInput
                  style={s(styles.formInput)}
                  value={formData.title}
                  onChangeText={(t) => setFormData((prev) => ({ ...prev, title: t }))}
                  placeholder="Event title"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={s(styles.formGroup)}>
                <Text style={s(styles.formLabel)}>Employee *</Text>
                <TouchableOpacity
                  style={s(styles.selectorPickerTrigger)}
                  onPress={() => openOptionDropdown("Select Employee", employees.map(e => e.name), "add", "assignee", formData.assignee)}
                >
                  <Text style={s(formData.assignee ? styles.selectorPickerText : styles.selectorPickerPlaceholder)}>
                    {formData.assignee || "Select employee"}
                  </Text>
                  <ChevronDown size={normalize(14)} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={s(styles.formGroup)}>
                <Text style={s(styles.formLabel)}>Location *</Text>
                <TextInput
                  style={s(styles.formInput)}
                  value={formData.location}
                  onChangeText={(t) => setFormData((prev) => ({ ...prev, location: t }))}
                  placeholder="e.g., Main Office"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={s(styles.formGroup)}>
                <Text style={s(styles.formLabel)}>Date * (YYYY-MM-DD)</Text>
                <TextInput
                  style={s(styles.formInput)}
                  value={formData.date}
                  onChangeText={(t) => setFormData((prev) => ({ ...prev, date: t }))}
                  placeholder="e.g., 2026-07-15"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={s(styles.formGroup)}>
                <Text style={s(styles.formLabel)}>Start Time (HH:MM)</Text>
                <TextInput
                  style={s(styles.formInput)}
                  value={formData.startTime}
                  onChangeText={(t) => setFormData((prev) => ({ ...prev, startTime: t }))}
                  placeholder="e.g., 09:00"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={s(styles.formGroup)}>
                <Text style={s(styles.formLabel)}>End Time (HH:MM)</Text>
                <TextInput
                  style={s(styles.formInput)}
                  value={formData.endTime}
                  onChangeText={(t) => setFormData((prev) => ({ ...prev, endTime: t }))}
                  placeholder="e.g., 17:00"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={s(styles.formGroup)}>
                <Text style={s(styles.formLabel)}>Type</Text>
                <TouchableOpacity
                  style={s(styles.selectorPickerTrigger)}
                  onPress={() => openOptionDropdown("Select Type", ["task", "meeting", "break", "training"], "add", "type", formData.type)}
                >
                  <Text style={s(styles.selectorPickerText)}>
                    {formData.type}
                  </Text>
                  <ChevronDown size={normalize(14)} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={s(styles.formGroup)}>
                <Text style={s(styles.formLabel)}>Status</Text>
                <TouchableOpacity
                  style={s(styles.selectorPickerTrigger)}
                  onPress={() => openOptionDropdown("Select Status", ["scheduled", "completed", "canceled"], "add", "status", formData.status)}
                >
                  <Text style={s(styles.selectorPickerText)}>
                    {formData.status}
                  </Text>
                  <ChevronDown size={normalize(14)} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View style={s(styles.modalFooterStrip)}>
              <TouchableOpacity style={s(styles.footerCancelBtn)} onPress={() => setAddOpen(false)}>
                <Text style={s(styles.footerCancelBtnText)}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s(styles.footerSubmitBtn)} onPress={addSchedule}>
                <Text style={s(styles.footerSubmitBtnText)}>Add Schedule</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Schedule Modal */}
      <Modal visible={editOpen} transparent animationType="slide" onRequestClose={() => setEditOpen(false)}>
        <View style={s(styles.modalOverlayMask)}>
          <View style={s(styles.modalSheetContainer)}>
            <View style={s(styles.modalHeaderPane)}>
              <View>
                <Text style={s(styles.modalTitleText)}>Edit Schedule</Text>
                <Text style={s(styles.modalSubtitleText)}>Update schedule information and save changes</Text>
              </View>
              <TouchableOpacity onPress={() => setEditOpen(false)} style={{ padding: normalize(4) }}>
                <X size={normalize(18)} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={s(styles.modalScrollArea)} keyboardShouldPersistTaps="handled">
              <View style={s(styles.formGroup)}>
                <Text style={s(styles.formLabel)}>Title *</Text>
                <TextInput
                  style={s(styles.formInput)}
                  value={editFormData.title}
                  onChangeText={(t) => setEditFormData((prev) => ({ ...prev, title: t }))}
                />
              </View>

              <View style={s(styles.formGroup)}>
                <Text style={s(styles.formLabel)}>Employee *</Text>
                <TouchableOpacity
                  style={s(styles.selectorPickerTrigger)}
                  onPress={() => openOptionDropdown("Select Employee", employees.map(e => e.name), "edit", "assignee", editFormData.assignee)}
                >
                  <Text style={s(styles.selectorPickerText)}>
                    {editFormData.assignee}
                  </Text>
                  <ChevronDown size={normalize(14)} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={s(styles.formGroup)}>
                <Text style={s(styles.formLabel)}>Location *</Text>
                <TextInput
                  style={s(styles.formInput)}
                  value={editFormData.location}
                  onChangeText={(t) => setEditFormData((prev) => ({ ...prev, location: t }))}
                />
              </View>

              <View style={s(styles.formGroup)}>
                <Text style={s(styles.formLabel)}>Date * (YYYY-MM-DD)</Text>
                <TextInput
                  style={s(styles.formInput)}
                  value={editFormData.date}
                  onChangeText={(t) => setEditFormData((prev) => ({ ...prev, date: t }))}
                />
              </View>

              <View style={s(styles.formGroup)}>
                <Text style={s(styles.formLabel)}>Start Time (HH:MM)</Text>
                <TextInput
                  style={s(styles.formInput)}
                  value={editFormData.startTime}
                  onChangeText={(t) => setEditFormData((prev) => ({ ...prev, startTime: t }))}
                />
              </View>

              <View style={s(styles.formGroup)}>
                <Text style={s(styles.formLabel)}>End Time (HH:MM)</Text>
                <TextInput
                  style={s(styles.formInput)}
                  value={editFormData.endTime}
                  onChangeText={(t) => setEditFormData((prev) => ({ ...prev, endTime: t }))}
                />
              </View>

              <View style={s(styles.formGroup)}>
                <Text style={s(styles.formLabel)}>Type</Text>
                <TouchableOpacity
                  style={s(styles.selectorPickerTrigger)}
                  onPress={() => openOptionDropdown("Select Type", ["task", "meeting", "break", "training"], "edit", "type", editFormData.type)}
                >
                  <Text style={s(styles.selectorPickerText)}>
                    {editFormData.type}
                  </Text>
                  <ChevronDown size={normalize(14)} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={s(styles.formGroup)}>
                <Text style={s(styles.formLabel)}>Status</Text>
                <TouchableOpacity
                  style={s(styles.selectorPickerTrigger)}
                  onPress={() => openOptionDropdown("Select Status", ["scheduled", "completed", "canceled"], "edit", "status", editFormData.status)}
                >
                  <Text style={s(styles.selectorPickerText)}>
                    {editFormData.status}
                  </Text>
                  <ChevronDown size={normalize(14)} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View style={s(styles.modalFooterStrip)}>
              <TouchableOpacity style={s(styles.footerCancelBtn)} onPress={() => setEditOpen(false)}>
                <Text style={s(styles.footerCancelBtnText)}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s(styles.footerSubmitBtn)} onPress={saveEdit}>
                <Text style={s(styles.footerSubmitBtnText)}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modern High-Fidelity Custom Selection Dropdown Menu Modal Overlay */}
      <Modal visible={pickerConfig.visible} transparent animationType="fade" onRequestClose={() => setPickerConfig(prev => ({ ...prev, visible: false }))}>
        <View style={s(styles.modalOverlayMask)}>
          <View style={s(styles.pickerOptionsContainer)}>
            <View style={s(styles.modalHeaderPane)}>
              <Text style={s(styles.modalTitleText)}>{pickerConfig.title}</Text>
              <TouchableOpacity onPress={() => setPickerConfig(prev => ({ ...prev, visible: false }))} style={{ padding: normalize(4) }}>
                <X size={normalize(16)} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {pickerConfig.options.map((option) => {
                const isSelected = pickerConfig.currentValue === option;
                return (
                  <TouchableOpacity
                    key={option}
                    style={s([styles.pickerOptionItem, isSelected && { backgroundColor: colors.itemSelectedBg }])}
                    onPress={() => handleSelectOption(option)}
                  >
                    <Text style={s([styles.pickerOptionItemText, isSelected && { color: colors.primary, fontWeight: "700" }])}>
                      {option}
                    </Text>
                    {isSelected && <Check size={normalize(16)} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}