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
  Plus, 
  Search, 
  Bell, 
  Eye, 
  EyeOff, 
  X, 
  AlertCircle, 
  ChevronDown, 
  Check 
} from "lucide-react-native";
import { apiFetch, createResource, listResource } from "@/lib/admin/apiClient";
import { useSocket } from "@/contexts/SocketContext";
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from "@/contexts/ThemeContext";

interface NotificationItem {
  id: string;
  title: string;
  content: string;
  message?: string;
  audience: "all" | "employees" | "managers";
  createdAt: string;
  status?: string;
  readBy?: string[];
}

function formatUSA(dateStr: string) {
  if (!dateStr) return { date: "-", time: "-" };
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { date: dateStr, time: "" };
  const date = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return { date, time };
}

function buildColors(uiTheme: ReturnType<typeof useTheme>["uiTheme"], isDark: boolean) {
  return {
    background:       uiTheme.panelColors?.dashboardBackground    || (isDark ? "#0F172A" : "#F8FAFC"),
    cardBg:           uiTheme.panelColors?.dashboardCardBackground || (isDark ? "#1E293B" : "#FFFFFF"),
    text:             uiTheme.panelColors?.dashboardTextColor      || (isDark ? "#F8FAFC" : "#0F172A"),
    textSecondary:    isDark ? "#CBD5E1" : "#334155",
    textMuted:        isDark ? "#94A3B8" : "#64748B",
    textSubtle:       isDark ? "#64748B" : "#94A3B8",
    border:           isDark ? "#334155" : "#E2E8F0",
    borderLight:      isDark ? "rgba(255,255,255,0.05)" : "#F1F5F9",
    inputBg:          isDark ? "#0F172A" : "#FFFFFF",
    inputBorder:      isDark ? "#334155" : "#CBD5E1",
    inputText:        isDark ? "#F8FAFC" : "#0F172A",
    placeholderText:  isDark ? "#475569" : "#94A3B8",
    searchBg:         isDark ? "#0F172A" : "#F1F5F9",
    primary:          uiTheme.customColors?.primary || (isDark ? "#6366F1" : "#4F46E5"),
    primaryText:      "#FFFFFF",
    primaryMuted:     isDark ? "rgba(99,102,241,0.12)" : "rgba(99,102,241,0.08)",
    activeBadgeBg:    isDark ? "rgba(16,185,129,0.15)"  : "#DCFCE7",
    activeBadgeText:  isDark ? "#34D399"  : "#15803D",
    dangerBg:         isDark ? "rgba(239,68,68,0.15)"  : "#FEE2E2",
    dangerBorder:     "rgba(239,68,68,0.25)",
    dangerText:       isDark ? "#FCA5A5" : "#DC2626",
    overlayBg:        "rgba(0,0,0,0.4)",
  };
}

type ThemeColors = ReturnType<typeof buildColors>;

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    container: { flex: 1, padding: 16 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    title: { fontSize: 24, fontWeight: 'bold', color: colors.text },
    subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
    addButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
    addButtonText: { color: colors.primaryText, fontSize: 13, fontWeight: '600', marginLeft: 6 },
    controlBox: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 },
    searchWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.searchBg, borderRadius: 8, paddingHorizontal: 12, height: 40, borderWidth: 1, borderColor: colors.border },
    searchIcon: { marginRight: 8 },
    searchInput: { flex: 1, fontSize: 13, color: colors.inputText },
    filterButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardBg, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, gap: 6, borderWidth: 1, borderColor: colors.border },
    filterButtonText: { fontSize: 13, color: colors.textMuted, fontWeight: '500' },
    errorContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.dangerBg, padding: 12, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: colors.dangerBorder },
    errorText: { color: colors.dangerText, fontSize: 13, fontWeight: '500' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyContainer: { alignItems: 'center', paddingTop: 60, gap: 12 },
    emptyText: { fontSize: 13, color: colors.textMuted, fontWeight: '500' },
    card: { backgroundColor: colors.cardBg, padding: 14, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: colors.borderLight },
    cardUnread: { borderWidth: 1.5, borderColor: colors.primary },
    cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
    iconIndicatorRow: { position: 'relative', width: 40, alignItems: 'center' },
    bellWrapper: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center' },
    unreadDot: { position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: colors.dangerText, top: 0, right: 0 },
    cardTitleText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary, marginBottom: 4 },
    cardTitleTextUnRead: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 4 },
    cardContentText: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
    cardFooterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.borderLight },
    audienceBadge: { backgroundColor: colors.primaryMuted, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
    audienceBadgeText: { fontSize: 10, fontWeight: '700', color: colors.primary },
    timeText: { fontSize: 11, color: colors.textMuted },
    timeTextUnReads: { fontSize: 11, color: colors.primary, fontWeight: '600' },
    modalSafeArea: { flex: 1, backgroundColor: colors.cardBg },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.primary, padding: 16 },
    modalHeaderTitle: { fontSize: 18, fontWeight: 'bold', color: colors.primaryText },
    modalScroll: { padding: 16 },
    label: { fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 6, marginTop: 10 },
    input: { borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 8, padding: 10, fontSize: 14, marginBottom: 12, color: colors.inputText, backgroundColor: colors.inputBg },
    dropdownTrigger: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 8, padding: 12, marginBottom: 12, backgroundColor: colors.searchBg },
    dropdownTriggerText: { fontSize: 14, color: colors.inputText },
    pickerOverlay: { flex: 1, backgroundColor: colors.overlayBg, justifyContent: 'center', alignItems: 'center', padding: 24 },
    pickerWindow: { backgroundColor: colors.cardBg, width: '100%', maxHeight: 320, borderRadius: 16, paddingVertical: 16, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, elevation: 8, borderWidth: 1, borderColor: colors.border },
    pickerTitle: { fontSize: 15, fontWeight: '700', color: colors.text, paddingHorizontal: 16, marginBottom: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
    pickerItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 },
    pickerItemText: { fontSize: 14, color: colors.textSecondary },
    submitButton: { flexDirection: 'row', backgroundColor: colors.primary, padding: 14, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 16, marginBottom: 8 },
    submitButtonText: { color: colors.primaryText, fontSize: 15, fontWeight: 'bold' },
    cancelButton: { padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 30, borderWidth: 1, borderColor: colors.border },
    cancelButtonText: { color: colors.textMuted, fontSize: 15, fontWeight: '600' },
  });
}

export default function Notifications() {
  const { uiTheme } = useTheme();
  const isDark = (uiTheme.theme as string) === "dark" || (uiTheme.theme as string) === "metallic-elite";
  const colors = useMemo(() => buildColors(uiTheme, isDark), [uiTheme, isDark]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [searchQuery, setSearchQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [showAudienceDropdown, setShowAudienceDropdown] = useState(false);
  const { socket } = useSocket();
  const { user } = useAuth();
  
  const currentUser = user?.fullName || "";

  const [formData, setFormData] = useState({
    title: "",
    message: "",
    audience: "all" as NotificationItem["audience"],
  });

  const loadNotifications = async () => {
    try {
      const notificationsList = await listResource<any>("notifications", { type: "broadcast" });
      
      let finalArray: NotificationItem[] = [];
      if (Array.isArray(notificationsList)) {
        finalArray = notificationsList;
      } else if (notificationsList && Array.isArray(notificationsList.items)) {
        finalArray = notificationsList.items;
      } else if (notificationsList && Array.isArray(notificationsList.data)) {
        finalArray = notificationsList.data;
      }
      
      setItems(finalArray);
    } catch (e) {
      throw e;
    }
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        setApiError(null);
        await loadNotifications();
      } catch (e) {
        if (!mounted) return;
        setApiError(e instanceof Error ? e.message : "Failed to load notifications");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    };

    void load();
    return () => { mounted = false; };
  }, []);

  const refresh = async () => {
    try {
      await loadNotifications();
    } catch (e) {
      console.error("Failed to refresh records:", e);
    }
  };

  const markRead = async (id: string) => {
    setItems((prev) =>
      prev.map((n) =>
        n.id === id
          ? { ...n, status: "read", readBy: [...(Array.isArray(n.readBy) ? n.readBy : []), currentUser] }
          : n
      )
    );
    try {
      await apiFetch(`/api/notifications/${encodeURIComponent(id)}/mark-read`, { method: "POST" });
    } catch {
      //
    }
  };

  useEffect(() => {
    if (!socket) return;
    const handleNew = () => { void refresh(); };
    socket.on("new-notification", handleNew);
    return () => { socket.off("new-notification", handleNew); };
  }, [socket]);

  const filteredNotifications = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = items
      .map((n) => ({ ...n, isRead: n.status === "read" || (Array.isArray(n.readBy) && n.readBy.includes(currentUser)) }))
      .sort((a, b) => {
        if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

    if (unreadOnly) list = list.filter((n) => !n.isRead);
    if (!q) return list;

    return list.filter((n) => {
      const content = n.content || n.message || "";
      return (
        n.title?.toLowerCase().includes(q) ||
        content.toLowerCase().includes(q) ||
        n.audience?.toLowerCase().includes(q)
      );
    });
  }, [items, searchQuery, unreadOnly, currentUser]);

  const addNotification = async () => {
    if (!formData.title || !formData.message) return;
    const next: NotificationItem = {
      id: `NTF-${Date.now().toString().slice(-6)}`,
      title: formData.title,
      content: formData.message,
      message: formData.message,
      audience: formData.audience,
      createdAt: new Date().toISOString(),
    };
    try {
      setApiError(null);
      await createResource<NotificationItem>("notifications", next);
      await refresh();
      setAddOpen(false);
      setFormData({ title: "", message: "", audience: "all" });
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Failed to send notification");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <View style={styles.container}>

          <View style={styles.headerRow}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.title}>Notifications</Text>
              <Text style={styles.subtitle}>Send system-wide broadcast flags and view history logs.</Text>
            </View>
            <TouchableOpacity style={styles.addButton} onPress={() => setAddOpen(true)}>
              <Plus size={16} color={colors.primaryText} />
              <Text style={styles.addButtonText}>New</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.controlBox}>
            <View style={styles.searchWrapper}>
              <Search size={16} color={colors.textMuted} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search history data..."
                placeholderTextColor={colors.placeholderText}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            <TouchableOpacity 
              style={styles.filterButton} 
              onPress={() => setUnreadOnly(v => !v)}
            >
              {unreadOnly ? <Eye size={16} color={colors.primary} /> : <EyeOff size={16} color={colors.textMuted} />}
              <Text style={[styles.filterButtonText, unreadOnly && { color: colors.primary, fontWeight: '700' }]}>
                {unreadOnly ? "Unread" : "All"}
              </Text>
            </TouchableOpacity>
          </View>

          {apiError && (
            <View style={styles.errorContainer}>
              <AlertCircle size={16} color={colors.dangerText} />
              <Text style={styles.errorText}>{apiError}</Text>
            </View>
          )}

          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={{ marginTop: 10, color: colors.textMuted, fontSize: 12 }}>Syncing channels...</Text>
            </View>
          ) : (
            <FlatList
              data={filteredNotifications}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: 20 }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Bell size={40} color={colors.textMuted} />
                  <Text style={styles.emptyText}>No notifications logged.</Text>
                </View>
              }
              renderItem={({ item }) => {
                const { date, time } = formatUSA(item.createdAt);
                return (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={[styles.card, !item.isRead && styles.cardUnread]}
                    onPress={() => { if (!item.isRead) void markRead(item.id); }}
                  >
                    <View style={styles.cardHeader}>
                      <View style={styles.iconIndicatorRow}>
                        <View style={styles.bellWrapper}>
                          <Bell size={16} color={colors.primary} />
                        </View>
                        {!item.isRead && <View style={styles.unreadDot} />}
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={!item.isRead ? styles.cardTitleTextUnRead : styles.cardTitleText}>
                          {item.title}
                        </Text>
                        <Text style={styles.cardContentText}>
                          {item.content || item.message}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.cardFooterRow}>
                      <View style={styles.audienceBadge}>
                        <Text style={styles.audienceBadgeText}>{item.audience.toUpperCase()}</Text>
                      </View>
                      <Text style={!item.isRead ? styles.timeTextUnReads : styles.timeText}>{date} • {time}</Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          )}

          <Modal visible={addOpen} animationType="slide">
            <SafeAreaView style={styles.modalSafeArea}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalHeaderTitle}>New Notification</Text>
                <TouchableOpacity onPress={() => setAddOpen(false)}>
                  <X size={24} color={colors.primaryText} />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.modalScroll}>
                <Text style={styles.label}>Title *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.title}
                  onChangeText={(t) => setFormData({ ...formData, title: t })}
                  placeholder="Task Overdue Warning"
                  placeholderTextColor={colors.placeholderText}
                />

                <Text style={styles.label}>Message *</Text>
                <TextInput
                  style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                  multiline
                  value={formData.message}
                  onChangeText={(t) => setFormData({ ...formData, message: t })}
                  placeholder="Type full notification details here..."
                  placeholderTextColor={colors.placeholderText}
                />

                <Text style={styles.label}>Target Audience</Text>
                <TouchableOpacity 
                  style={styles.dropdownTrigger} 
                  onPress={() => setShowAudienceDropdown(true)}
                >
                  <Text style={styles.dropdownTriggerText}>
                    {formData.audience.charAt(0).toUpperCase() + formData.audience.slice(1)}
                  </Text>
                  <ChevronDown size={16} color={colors.textMuted} />
                </TouchableOpacity>

                <Modal visible={showAudienceDropdown} transparent animationType="fade">
                  <TouchableOpacity 
                    style={styles.pickerOverlay} 
                    activeOpacity={1} 
                    onPress={() => setShowAudienceDropdown(false)}
                  >
                    <View style={styles.pickerWindow}>
                      <Text style={styles.pickerTitle}>Select Audience Category</Text>
                      {(["all", "employees", "managers"] as const).map((category) => (
                        <TouchableOpacity
                          key={category}
                          style={styles.pickerItem}
                          onPress={() => {
                            setFormData({ ...formData, audience: category });
                            setShowAudienceDropdown(false);
                          }}
                        >
                          <Text style={styles.pickerItemText}>
                            {category.charAt(0).toUpperCase() + category.slice(1)}
                          </Text>
                          {formData.audience === category && <Check size={16} color={colors.primary} />}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </TouchableOpacity>
                </Modal>

                <TouchableOpacity style={styles.submitButton} onPress={addNotification}> 
                  <Bell size={18} color={colors.primaryText} style={{ marginRight: 6 }} />
                  <Text style={styles.submitButtonText}>Send Notification</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.cancelButton} onPress={() => setAddOpen(false)}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </ScrollView>
            </SafeAreaView>
          </Modal>

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
