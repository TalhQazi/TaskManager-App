import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useSocket } from "@/contexts/SocketContext";

// Native Dark Vector Icons
import {
  Bell,
  CheckCircle,
  AlertTriangle,
  Info,
  Clock,
  Trash2,
  CheckCheck,
} from "lucide-react-native";

// Shared APIs matching your web data-fetching configurations
import {
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification as deleteNotificationApi,
  apiFetch,
} from "@/lib/admin/apiClient";

// --- Type Safety Blueprints ---
interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "task" | "payroll" | "document";
  timestamp: string;
  read: boolean;
  category?: string;
  link?: string;
  meta?: { resourceType?: string; resourceId?: string; link?: string; category?: string };
}

// --- Premium Dark Mode Colors ---
const THEME = {
  bgCanvas: "#0B0F19",
  bgSurface: "#161D30",
  bgCard: "#1F2A45",
  border: "#2A3958",
  textPrimary: "#F3F4F6",
  textSecondary: "#9CA3AF",
  textMuted: "#6B7280",
  primary: "#3B82F6",
  accent: "#10B981",
  danger: "#EF4444",
};

// --- Mobile Navigation Link Resolver ---
function resolveEmployeeLink(meta?: { resourceType?: string; resourceId?: string; link?: string; category?: string }): string {
  const resourceType = String(meta?.resourceType || "").toLowerCase().trim();
  const resourceId = String(meta?.resourceId || "").trim();
  const direct = String(meta?.link || "").trim();

  // Route structures mapped cleanly to typical native Expo Router configurations
  if (resourceType === "task" || resourceType === "task comment") {
    return resourceId ? `/(tabs)/tasks/${resourceId}` : "/(tabs)/tasks";
  }
  if (resourceType === "project" || resourceType === "project comment") {
    return "/(tabs)/tasks";
  }
  if (resourceType === "time entry" || resourceType === "timeentry" || resourceType === "time_entry") {
    return "/timeLogs";
  }
  if (resourceType === "payroll") {
    return "/payroll";
  }
  if (resourceType === "leave_request" || resourceType === "leaverequest") {
    return "/leave-requests";
  }
  if (resourceType === "announcement") {
    return "/announcements";
  }

  if (direct) {
    if (direct.includes("/tasks")) {
      const match = direct.match(/\/tasks\/([a-f0-9]+)/i);
      return match ? `/(tabs)/tasks/${match[1]}` : "/(tabs)/tasks";
    }
    if (direct.includes("/projects")) {
      return "/(tabs)/tasks";
    }
    if (direct.includes("/time-tracking") || direct.includes("/time-logs") || direct.includes("/timelogs")) {
      return "/timeLogs";
    }
    if (direct.includes("/payroll")) {
      return "/payroll";
    }
  }

  return "/notifications";
}

export default function EmployeeNotifications() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { socket } = useSocket();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "unread" | "read">("unread");

  // Mocked global session identity context (In production, load this from your mobile AuthContext)
  const userEmail = "employee@workspace.com";
  const userName = "Jane Doe";

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  // --- Real-time Socket Event Wireup ---
  useEffect(() => {
    if (!socket) return;

    const handleNotification = (data: any) => {
      const recipient = data.recipient || "";
      const isForMe = recipient.includes(userEmail) || recipient.includes(userName) || data.audience === "all";
      if (!isForMe) return;

      const formatted: Notification = {
        id: data.id || data._id || Date.now().toString(),
        title: data.title || "New Notification",
        message: data.content || data.message || "No message body",
        type: data.type === "broadcast" ? "info" : (data.type || "info"),
        timestamp: data.timestamp || new Date().toISOString(),
        read: false,
        category: data.meta?.category || "",
        link: resolveEmployeeLink(data.meta),
        meta: data.meta,
      };

      setNotifications((prev) => {
        if (prev.find((n) => n.id === formatted.id)) return prev;
        return [formatted, ...prev];
      });
    };

    socket.on("new-notification", handleNotification);
    return () => {
      socket.off("new-notification", handleNotification);
    };
  }, [socket, userEmail, userName]);

  // --- Initial Context Engine Loader ---
  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiFetch<{ items?: any[] } | any[]>("/api/messages?type=broadcast");
      const rawItems = Array.isArray(res) ? res : (res?.items ?? []);
      
      const filteredData = rawItems.filter((n: any) => {
        const recipient = n.recipient || "";
        return recipient.includes(userEmail) || recipient.includes(userName) || n.audience === "all";
      });

      const formatted: Notification[] = filteredData.map((n: any) => {
        const safeType: Notification["type"] =
          n.type === "success" || n.type === "warning" || n.type === "task" ? n.type : "info";
        const readByList = Array.isArray(n.readBy) ? n.readBy : [];
        const isRead = readByList.includes(userName) || readByList.includes(userEmail);
        
        return {
          id: n.id || n._id,
          title: n.title || "Notification",
          message: n.content || n.message,
          type: safeType,
          timestamp: n.timestamp,
          read: isRead,
          category: n.meta?.category || "",
          link: resolveEmployeeLink(n.meta),
          meta: n.meta,
        };
      });

      formatted.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setNotifications(formatted);
    } catch (err) {
      console.error("Failed to fetch notification feed matrix:", err);
    } finally {
      setLoading(false);
    }
  }, [userEmail, userName]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // --- Functional Interactive State Updaters ---
  const handleMarkAsRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try {
      await markNotificationAsRead(id);
      queryClient.invalidateQueries({ queryKey: ["employee-notifications"] });
    } catch {
      loadNotifications();
    }
  };

  const handleMarkAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await markAllNotificationsAsRead();
      queryClient.invalidateQueries({ queryKey: ["employee-notifications"] });
    } catch {
      loadNotifications();
    }
  };

  const handleDeleteNotification = async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await deleteNotificationApi(id);
      queryClient.invalidateQueries({ queryKey: ["employee-notifications"] });
    } catch {
      Alert.alert("Error", "Could not remove log index. Synced refresh forced.");
      loadNotifications();
    }
  };

  // --- Dynamic UI Visual Resolvers ---
  const getTypeIcon = (type: string) => {
    switch (type) {
      case "success": return <CheckCircle size={20} color={THEME.accent} />;
      case "warning": return <AlertTriangle size={20} color="#F59E0B" />;
      case "task": return <Bell size={20} color={THEME.primary} />;
      default: return <Info size={20} color={THEME.textSecondary} />;
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const diff = new Date().getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return "Yesterday";
    return `${days}d ago`;
  };

  const filteredNotifications = useMemo(() => {
    if (activeTab === "unread") return notifications.filter((n) => !n.read);
    if (activeTab === "read") return notifications.filter((n) => n.read);
    return notifications;
  }, [notifications, activeTab]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Analytic Cards Metric Row */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <Bell size={18} color={THEME.textSecondary} />
          <Text style={styles.metricCount}>{notifications.length}</Text>
          <Text style={styles.metricLabel}>Total</Text>
        </View>
        <View style={[styles.metricCard, { borderColor: "rgba(59,130,246,0.3)" }]}>
          <Bell size={18} color={THEME.primary} />
          <Text style={[styles.metricCount, { color: THEME.primary }]}>{unreadCount}</Text>
          <Text style={styles.metricLabel}>Unread</Text>
        </View>
        <View style={styles.metricCard}>
          <CheckCircle size={18} color={THEME.accent} />
          <Text style={[styles.metricCount, { color: THEME.accent }]}>{notifications.length - unreadCount}</Text>
          <Text style={styles.metricLabel}>Read</Text>
        </View>
      </View>

      {/* Control Action Header Bar */}
      <View style={styles.actionHeaderBar}>
        <Text style={styles.sectionHeaderTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity style={styles.bulkMarkBtn} onPress={handleMarkAllAsRead}>
            <CheckCheck size={16} color={THEME.primary} />
            <Text style={styles.bulkMarkBtnText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Segment Navigation Tab Strips */}
      <View style={styles.tabsContainerStrip}>
        {(["unread", "read", "all"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabButtonElement, activeTab === tab && styles.tabButtonActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabButtonText, activeTab === tab && styles.tabButtonTextActive]}>
              {tab.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Primary Logs Render Feed */}
      {loading ? (
        <View style={styles.centerSpinner}>
          <ActivityIndicator size="large" color={THEME.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredNotifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainerContent}
          ListEmptyComponent={
            <View style={styles.emptyContainerView}>
              <Bell size={48} color={THEME.border} />
              <Text style={styles.emptyViewText}>No matching notifications found</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.notificationCardRow, !item.read && styles.unreadNotificationHighlight]}
              activeOpacity={item.link ? 0.7 : 1}
              onPress={() => {
                if (item.link) {
                  handleMarkAsRead(item.id);
                  router.push(item.link as any);
                }
              }}
            >
              <View style={styles.cardLeftIconBox}>{getTypeIcon(item.type)}</View>
              
              <View style={styles.cardBodyTextWrap}>
                <View style={styles.titleBadgeRow}>
                  <Text style={styles.cardMainTitle} numberOfLines={1}>{item.title}</Text>
                  {item.category ? (
                    <View style={styles.categoryBadgeView}>
                      <Text style={styles.categoryBadgeText}>{item.category.replace("_", " ")}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.cardBodyMessage} numberOfLines={2}>{item.message}</Text>
                
                <View style={styles.cardMetaFooterLine}>
                  <Clock size={12} color={THEME.textMuted} style={{ marginRight: 4 }} />
                  <Text style={styles.metaTimeLabelText}>{formatTime(item.timestamp)}</Text>
                </View>
              </View>

              <View style={styles.cardRightActionsColumn}>
                {!item.read && (
                  <TouchableOpacity style={styles.inlineActionTextMarkBtn} onPress={() => handleMarkAsRead(item.id)}>
                    <Text style={styles.inlineActionMarkText}>Read</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.cardTrashIconTouch} onPress={() => handleDeleteNotification(item.id)}>
                  <Trash2 size={16} color={THEME.danger} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.bgCanvas,
  },
  metricsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginTop: 14,
    gap: 10,
  },
  metricCard: {
    flex: 1,
    backgroundColor: THEME.bgSurface,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
  },
  metricCount: {
    fontSize: 20,
    fontWeight: "700",
    color: THEME.textPrimary,
    marginTop: 4,
  },
  metricLabel: {
    fontSize: 11,
    color: THEME.textMuted,
    marginTop: 2,
    fontWeight: "600",
  },
  actionHeaderBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 10,
  },
  sectionHeaderTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: THEME.textPrimary,
  },
  bulkMarkBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(59,130,246,0.08)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  bulkMarkBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: THEME.primary,
  },
  tabsContainerStrip: {
    flexDirection: "row",
    backgroundColor: THEME.bgSurface,
    marginHorizontal: 16,
    borderRadius: 8,
    padding: 4,
    borderWidth: 1,
    borderColor: THEME.border,
    marginBottom: 12,
  },
  tabButtonElement: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 6,
  },
  tabButtonActive: {
    backgroundColor: THEME.bgCard,
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: THEME.textMuted,
  },
  tabButtonTextActive: {
    color: THEME.primary,
  },
  centerSpinner: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContainerContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  emptyContainerView: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    gap: 12,
  },
  emptyViewText: {
    color: THEME.textMuted,
    fontSize: 14,
    fontStyle: "italic",
  },
  notificationCardRow: {
    flexDirection: "row",
    backgroundColor: THEME.bgSurface,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    alignItems: "center",
  },
  unreadNotificationHighlight: {
    borderColor: "rgba(59,130,246,0.25)",
    backgroundColor: "#1B243B",
  },
  cardLeftIconBox: {
    marginRight: 12,
    justifyContent: "center",
  },
  cardBodyTextWrap: {
    flex: 1,
    marginRight: 8,
  },
  titleBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 4,
  },
  cardMainTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: THEME.textPrimary,
    maxWidth: Dimensions.get("window").width * 0.45,
  },
  categoryBadgeView: {
    backgroundColor: "rgba(59,130,246,0.12)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: THEME.primary,
    textTransform: "uppercase",
  },
  cardBodyMessage: {
    fontSize: 13,
    color: THEME.textSecondary,
    lineHeight: 18,
    marginBottom: 6,
  },
  cardMetaFooterLine: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaTimeLabelText: {
    fontSize: 11,
    color: THEME.textMuted,
    fontWeight: "500",
  },
  cardRightActionsColumn: {
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: "100%",
    paddingVertical: 4,
    minHeight: 50,
  },
  inlineActionTextMarkBtn: {
    backgroundColor: "rgba(16,185,129,0.12)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  inlineActionMarkText: {
    fontSize: 11,
    fontWeight: "700",
    color: THEME.accent,
  },
  cardTrashIconTouch: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: "rgba(239,68,68,0.05)",
    marginTop: "auto",
  },
});