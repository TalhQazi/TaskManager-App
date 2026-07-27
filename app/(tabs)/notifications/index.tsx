import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  CheckCircle,
  AlertTriangle,
  Info,
  Clock,
  Trash2,
  CheckCheck,
} from "lucide-react-native";

import { useSocket } from "@/contexts/SocketContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification as deleteNotificationApi,
  apiFetch,
} from "@/lib/admin/apiClient";
import { s, wp, hp, fs } from "@/util/styles";

const { width } = Dimensions.get("window");

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "task" | "payroll" | "document";
  timestamp: string;
  read: boolean;
  category?: string;
  link?: string;
  meta?: {
    resourceType?: string;
    resourceId?: string;
    link?: string;
    category?: string;
  };
}

function resolveEmployeeLink(meta?: {
  resourceType?: string;
  resourceId?: string;
  link?: string;
  category?: string;
}): string {
  const resourceType = String(meta?.resourceType || "").toLowerCase().trim();
  const resourceId = String(meta?.resourceId || "").trim();
  const direct = String(meta?.link || "").trim();

  if (resourceType === "task" || resourceType === "task comment") {
    return resourceId ? `/(tabs)/tasks/${resourceId}` : "/(tabs)/tasks";
  }
  if (resourceType === "project" || resourceType === "project comment") {
    return "/(tabs)/tasks";
  }
  if (resourceType === "time entry" || resourceType === "timeentry" || resourceType === "time_entry") {
    return "/(tabs)/timeLogs";
  }
  if (resourceType === "payroll") {
    return "/(tabs)/payroll";
  }
  if (resourceType === "leave_request" || resourceType === "leaverequest") {
    return "/(tabs)/leave-requests";
  }
  if (resourceType === "announcement") {
    return "/(tabs)/announcements";
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
      return "/(tabs)/timeLogs";
    }
    if (direct.includes("/payroll")) {
      return "/(tabs)/payroll";
    }
    if (direct.includes("/leave-requests")) {
      return "/(tabs)/leave-requests";
    }
    if (direct.includes("/announcements")) {
      return "/(tabs)/announcements";
    }
  }

  return "/(tabs)/notifications";
}

export default function EmployeeNotifications() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { socket } = useSocket();
  const { uiTheme } = useTheme();
  const { user } = useAuth();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeTab, setActiveTab] = useState<"unread" | "read" | "all">("unread");
  const [loading, setLoading] = useState(true);

  const isLightTheme = useMemo(() => {
    return uiTheme.theme?.includes("crystal") || uiTheme.panelColors?.dashboardTextColor === "#000000";
  }, [uiTheme]);

  const bg = useMemo(() => uiTheme.panelColors?.dashboardBackground || (isLightTheme ? "#F8FAFC" : "#09090b"), [uiTheme, isLightTheme]);
  const cardBg = useMemo(() => uiTheme.panelColors?.dashboardCardBackground || (isLightTheme ? "#FFFFFF" : "#18181b"), [uiTheme, isLightTheme]);
  const tintColor = useMemo(() => uiTheme.panelColors?.dashboardTextColor || (isLightTheme ? "#0F172A" : "#ffffff"), [uiTheme, isLightTheme]);
  const mutedText = useMemo(() => (isLightTheme ? "#64748B" : "#a1a1aa"), [isLightTheme]);
  const lightText = useMemo(() => (isLightTheme ? "#94A3B8" : "#71717a"), [isLightTheme]);
  const primaryColor = useMemo(() => uiTheme.customColors?.primary || "#133767", [uiTheme]);
  const border = useMemo(() => (isLightTheme ? "rgba(0, 0, 0, 0.08)" : "rgba(255, 255, 255, 0.08)"), [isLightTheme]);

  const errorBg = useMemo(() => (isLightTheme ? "#FEE2E2" : "rgba(185, 28, 28, 0.2)"), [isLightTheme]);
  const errorText = useMemo(() => (isLightTheme ? "#B91C1C" : "#f87171"), [isLightTheme]);

  const userEmail = user?.email || user?.username || "";
  const userName = user?.fullName || user?.name || userEmail;

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);
  const readNotifications = useMemo(() => notifications.filter((n) => n.read), [notifications]);
  const unreadNotifications = useMemo(() => notifications.filter((n) => !n.read), [notifications]);

  const displayedNotifications = useMemo(() => {
    if (activeTab === "unread") return unreadNotifications;
    if (activeTab === "read") return readNotifications;
    return notifications;
  }, [activeTab, unreadNotifications, readNotifications, notifications]);

  const loadNotifications = useCallback(async () => {
    try {
      const res = await apiFetch<{ items?: any[] } | any[]>("/api/messages?type=broadcast");
      const rawItems = Array.isArray(res) ? res : (res?.items ?? []);
      
      const filteredData = rawItems.filter((n: any) => {
        const recipient = n.recipient || "";
        return recipient.includes(userEmail) || recipient.includes(userName) || n.audience === "all";
      });

      const formatted: Notification[] = filteredData.map((n: any) => {
        const safeType: Notification["type"] =
          n.type === "success" || n.type === "warning" || n.type === "task" || n.type === "payroll" || n.type === "document"
            ? n.type
            : "info";
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
      console.error("Failed to load notifications", err);
    } finally {
      setLoading(false);
    }
  }, [userEmail, userName]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

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

  const handleMarkAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    try {
      await markNotificationAsRead(id);
      await queryClient.invalidateQueries({ queryKey: ["employee-notifications"] });
      await queryClient.invalidateQueries({ queryKey: ["managerNotifications"] });
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
      loadNotifications();
    }
  };

  const handleMarkAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await markAllNotificationsAsRead();
      await queryClient.invalidateQueries({ queryKey: ["employee-notifications"] });
      await queryClient.invalidateQueries({ queryKey: ["managerNotifications"] });
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
      loadNotifications();
    }
  };

  const handleDeleteNotification = async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await deleteNotificationApi(id);
      await queryClient.invalidateQueries({ queryKey: ["employee-notifications"] });
      await queryClient.invalidateQueries({ queryKey: ["managerNotifications"] });
    } catch (err) {
      console.error("Failed to delete notification:", err);
      loadNotifications();
    }
  };

  const getNotificationIcon = (type: string) => {
    const iconSize = fs(4.8);
    switch (type) {
      case "success":
        return <CheckCircle size={iconSize} color="#22C55E" />;
      case "warning":
        return <AlertTriangle size={iconSize} color="#EAB308" />;
      case "task":
        return <Clock size={iconSize} color="#A855F7" />;
      case "payroll":
        return <CheckCheck size={iconSize} color="#10B981" />;
      case "document":
        return <AlertTriangle size={iconSize} color="#EF4444" />;
      default:
        return <Info size={iconSize} color="#3B82F6" />;
    }
  };

  const getCategoryBadge = (category?: string) => {
    if (!category) return null;
    const map: Record<string, { label: string; bg: string; text: string }> = {
      TASK_ASSIGNED: { label: "Task Assigned", bg: "#DBEAFE", text: "#1E40AF" },
      PROJECT_ASSIGNED: { label: "Project Assigned", bg: "#E0E7FF", text: "#3730A3" },
      MENTIONED: { label: "Mentioned", bg: "#FEF3C7", text: "#92400E" },
      COMMENT_ADDED: { label: "Comment", bg: "#D1FAE5", text: "#065F46" },
      TASK_COMPLETED: { label: "Completed", bg: "#D1FAE5", text: "#065F46" },
      SYSTEM: { label: "System", bg: "#F3F4F6", text: "#374151" },
    };
    const entry = map[category];
    if (!entry) return null;
    return (
      <View style={s([styles.badgeContainer, { backgroundColor: entry.bg }])}>
        <Text style={s([styles.badgeText, { color: entry.text }])}>{entry.label}</Text>
      </View>
    );
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return "Yesterday";
    return `${days} days ago`;
  };

  if (loading) {
    return (
      <SafeAreaView style={s([styles.centerContainer, { backgroundColor: bg }])}>
        <ActivityIndicator size="large" color={primaryColor} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s([styles.container, { backgroundColor: bg }])}>
      <StatusBar barStyle={isLightTheme ? "dark-content" : "light-content"} backgroundColor={bg} />
      
      <ScrollView contentContainerStyle={s(styles.scrollContainer)} showsVerticalScrollIndicator={false}>
        
        <View style={s(styles.metricsRowGrid)}>
          <View style={s([styles.metricCardBox, { backgroundColor: cardBg, borderColor: border }])}>
            <View style={s([styles.metricIconWrap, { backgroundColor: "rgba(19,55,103,0.1)" }])}>
              <Bell size={fs(4.2)} color={primaryColor} />
            </View>
            <Text style={s([styles.metricCountText, { color: tintColor }])}>{notifications.length}</Text>
            <Text style={s([styles.metricLabelText, { color: mutedText }])}>Total</Text>
          </View>

          <View style={s([styles.metricCardBox, { backgroundColor: cardBg, borderColor: border }])}>
            <View style={s([styles.metricIconWrap, { backgroundColor: "rgba(59,130,246,0.1)" }])}>
              <Bell size={fs(4.2)} color="#3B82F6" />
            </View>
            <Text style={s([styles.metricCountText, { color: tintColor }])}>{unreadCount}</Text>
            <Text style={s([styles.metricLabelText, { color: mutedText }])}>Unread</Text>
          </View>

          <View style={s([styles.metricCardBox, { backgroundColor: cardBg, borderColor: border }])}>
            <View style={s([styles.metricIconWrap, { backgroundColor: "rgba(34,197,94,0.1)" }])}>
              <CheckCircle size={fs(4.2)} color="#22C55E" />
            </View>
            <Text style={s([styles.metricCountText, { color: tintColor }])}>{notifications.length - unreadCount}</Text>
            <Text style={s([styles.metricLabelText, { color: mutedText }])}>Read</Text>
          </View>
        </View>

        <View style={s([styles.contentBlockCard, { backgroundColor: cardBg, borderColor: border }])}>
          <View style={s(styles.cardSectionHeader)}>
            <View style={s(styles.headerTitleCluster)}>
              <Bell size={fs(4.8)} color={tintColor} />
              <Text style={s([styles.mainCardTitleText, { color: tintColor }])}>Notifications</Text>
              {unreadCount > 0 && (
                <View style={s([styles.newIndicatorBadge, { backgroundColor: errorBg }])}>
                  <Text style={s([styles.newIndicatorBadgeText, { color: errorText }])}>{unreadCount} new</Text>
                </View>
              )}
            </View>
            
            {unreadCount > 0 && (
              <TouchableOpacity style={s(styles.markAllReadActionBtn)} onPress={handleMarkAllAsRead}>
                <Text style={s([styles.markAllActionBtnText, { color: primaryColor }])}>Mark all read</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={s([styles.segmentTabsTrack, { backgroundColor: isLightTheme ? "#F1F5F9" : "#27272a" }])}>
            <TouchableOpacity 
              style={s([styles.segmentTabItem, activeTab === "unread" && [styles.segmentTabItemActive, { backgroundColor: cardBg }]])}
              onPress={() => setActiveTab("unread")}
            >
              <Text style={s([styles.segmentTabText, { color: mutedText }, activeTab === "unread" && { color: primaryColor, fontWeight: "700" }])}>
                Unread ({unreadCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={s([styles.segmentTabItem, activeTab === "read" && [styles.segmentTabItemActive, { backgroundColor: cardBg }]])}
              onPress={() => setActiveTab("read")}
            >
              <Text style={s([styles.segmentTabText, { color: mutedText }, activeTab === "read" && { color: primaryColor, fontWeight: "700" }])}>
                Read ({readNotifications.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={s([styles.segmentTabItem, activeTab === "all" && [styles.segmentTabItemActive, { backgroundColor: cardBg }]])}
              onPress={() => setActiveTab("all")}
            >
              <Text style={s([styles.segmentTabText, { color: mutedText }, activeTab === "all" && { color: primaryColor, fontWeight: "700" }])}>
                All ({notifications.length})
              </Text>
            </TouchableOpacity>
          </View>

          <View style={s(styles.listContainerWrapper)}>
            {displayedNotifications.length === 0 ? (
              <View style={s(styles.emptyStateNoticeView)}>
                <Bell size={fs(9)} color={lightText} style={s(styles.emptyStateCenterIcon)} />
                <Text style={s([styles.emptyStateNoticeMainText, { color: mutedText }])}>
                  {activeTab === "unread" ? "No unread notifications" : activeTab === "read" ? "No read notifications" : "No notifications"}
                </Text>
              </View>
            ) : (
              displayedNotifications.map((item) => (
                <View
                  key={item.id}
                  style={s([
                    styles.notificationListItemRow, 
                    { borderBottomColor: border, backgroundColor: item.read ? (isLightTheme ? "#F8FAFC" : "#1e1e24") : cardBg }
                  ])}
                >
                  <TouchableOpacity
                    activeOpacity={item.link ? 0.7 : 1}
                    style={s(styles.listItemContentTouchable)}
                    onPress={() => {
                      if (item.link) {
                        handleMarkAsRead(item.id);
                        router.push(item.link as any);
                      }
                    }}
                  >
                    <View style={s(styles.listItemIconColumn)}>
                      {getNotificationIcon(item.type)}
                    </View>

                    <View style={s(styles.listItemMainMetaDetails)}>
                      <View style={s(styles.listItemTitleClusterRow)}>
                        <Text style={s([styles.listItemTitleText, { color: tintColor }])} numberOfLines={2}>
                          {item.title}
                        </Text>
                        {getCategoryBadge(item.category)}
                      </View>
                      
                      <Text style={s([styles.listItemMessageText, { color: mutedText }])} numberOfLines={3}>
                        {item.message}
                      </Text>
                      
                      <Text style={s([styles.listItemTimestampFootnote, { color: lightText }])}>
                        {formatTime(item.timestamp)}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <View style={s(styles.listItemActionColumnControls)}>
                    {!item.read && (
                      <TouchableOpacity 
                        style={s([styles.itemActionTextBtn, { borderColor: border }])} 
                        onPress={() => handleMarkAsRead(item.id)}
                      >
                        <Text style={s([styles.itemActionTextBtnLabel, { color: primaryColor }])}>Read</Text>
                      </TouchableOpacity>
                    )}
                    
                    <TouchableOpacity 
                      style={s(styles.itemActionIconTrashBtn)} 
                      onPress={() => handleDeleteNotification(item.id)}
                    >
                      <Trash2 size={fs(3.8)} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContainer: {
    padding: wp(4),
    paddingBottom: hp(4),
  },
  metricsRowGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: wp(2.5),
    marginBottom: hp(2),
  },
  metricCardBox: {
    flex: 1,
    borderRadius: wp(3),
    borderWidth: 1,
    padding: wp(3),
    alignItems: "center",
    justifyContent: "center",
    elevation: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 1,
  },
  metricIconWrap: {
    width: wp(8.5),
    height: wp(8.5),
    borderRadius: wp(2.5),
    alignItems: "center",
    justifyContent: "center",
    marginBottom: hp(0.8),
  },
  metricCountText: {
    fontSize: fs(4.2),
    fontWeight: "700",
  },
  metricLabelText: {
    fontSize: fs(2.5),
    fontWeight: "500",
    marginTop: hp(0.2),
  },
  contentBlockCard: {
    borderRadius: wp(3),
    borderWidth: 1,
    overflow: "hidden",
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  cardSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: wp(3.5),
    paddingBottom: hp(1.2),
  },
  headerTitleCluster: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp(2),
  },
  mainCardTitleText: {
    fontSize: fs(3.8),
    fontWeight: "700",
  },
  newIndicatorBadge: {
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.3),
    borderRadius: wp(2.5),
  },
  newIndicatorBadgeText: {
    fontSize: fs(2.2),
    fontWeight: "600",
  },
  markAllReadActionBtn: {
    paddingVertical: hp(0.5),
    paddingHorizontal: wp(1.5),
  },
  markAllActionBtnText: {
    fontSize: fs(2.8),
    fontWeight: "600",
  },
  segmentTabsTrack: {
    flexDirection: "row",
    padding: wp(1),
    marginHorizontal: wp(3),
    marginBottom: hp(1.2),
    borderRadius: wp(2),
  },
  segmentTabItem: {
    flex: 1,
    paddingVertical: hp(1),
    alignItems: "center",
    borderRadius: wp(1.5),
  },
  segmentTabItemActive: {
    elevation: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  segmentTabText: {
    fontSize: fs(2.8),
    fontWeight: "600",
  },
  listContainerWrapper: {
    width: "100%",
  },
  emptyStateNoticeView: {
    paddingVertical: hp(5),
    alignItems: "center",
    justifyContent: "center",
  },
  emptyStateCenterIcon: {
    opacity: 0.25,
    marginBottom: hp(1.2),
  },
  emptyStateNoticeMainText: {
    fontSize: fs(3.2),
    fontWeight: "500",
  },
  notificationListItemRow: {
    flexDirection: "row",
    padding: wp(3),
    borderBottomWidth: 1,
    alignItems: "center",
    justifyContent: "space-between",
  },
  listItemContentTouchable: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    paddingRight: wp(2),
  },
  listItemIconColumn: {
    marginRight: wp(2.5),
    marginTop: hp(0.2),
  },
  listItemMainMetaDetails: {
    flex: 1,
  },
  listItemTitleClusterRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: wp(1.5),
  },
  listItemTitleText: {
    fontSize: fs(3.2),
    fontWeight: "700",
    lineHeight: fs(4),
  },
  badgeContainer: {
    paddingHorizontal: wp(1.5),
    paddingVertical: hp(0.2),
    borderRadius: wp(1),
  },
  badgeText: {
    fontSize: fs(2),
    fontWeight: "600",
  },
  listItemMessageText: {
    fontSize: fs(2.8),
    lineHeight: fs(3.8),
    marginTop: hp(0.4),
  },
  listItemTimestampFootnote: {
    fontSize: fs(2.2),
    marginTop: hp(0.5),
  },
  listItemActionColumnControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp(2),
    marginLeft: wp(1),
  },
  itemActionTextBtn: {
    borderWidth: 1,
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.5),
    borderRadius: wp(1),
  },
  itemActionTextBtnLabel: {
    fontSize: fs(2.5),
    fontWeight: "600",
  },
  itemActionIconTrashBtn: {
    padding: wp(1),
  },
});