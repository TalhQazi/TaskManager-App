import React, { useMemo, useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Bell, Menu, LogOut, Mail, Bug, Sparkles } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";

import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";
import { useSocket } from "@/contexts/SocketContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/services/api";
import { toProxiedUrl, initToken } from "@/util/toProxiedUrl";

interface HeaderSettings {
  backgroundType: "color" | "image";
  colorConfig: {
    from: string; 
    via: string;
    to: string;
  };
  imageConfig: {
    url?: string;
    dataUrl?: string;
    repeat?: string;
    size?: string;
    position?: string;
  };
  height: number;
  overlay: {
    enabled: boolean;
    color: string;
  };
}

export default function AdminHeader({ onMenuPress }: { onMenuPress: () => void }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, logout } = useAuth();
  const { socket } = useSocket();
  const { uiTheme } = useTheme();

  const [tokenReady, setTokenReady] = useState(false);
  const [avatarLoadError, setAvatarLoadError] = useState(false);

  const isDark = uiTheme?.theme !== "crystal-white";
  const isMetallic = uiTheme?.theme === "metallic-elite";

  useEffect(() => {
    (async () => {
      await initToken();
      setTokenReady(true);
    })();
  }, []);

  const { data: headerSettings } = useQuery<HeaderSettings>({
    queryKey: ["AdminHeaderSettings"],
    queryFn: async () => {
      const res = await apiRequest<{ item: HeaderSettings }>("/header-settings");
      return res.data?.item;
    },
  });

  const { data: userSettings } = useQuery({
    queryKey: ["userSettings"],
    queryFn: async () => {
      const res = await apiRequest("/settings");
      return res.data;
    },
  });

  const { data: employeeStatus } = useQuery({
    queryKey: ["adminEmployeeStatus"],
    queryFn: async () => {
      const res = await apiRequest<{ item: { current_status?: string; id?: string } }>("/employees/me");
      return res.data?.item;
    },
  });

  const { data: messagesData } = useQuery({
    queryKey: ["adminMessagesBadge"],
    queryFn: async () => {
      const res = await apiRequest<{ items?: any[] }>(`/messages/conversations/${user?.username || "admin"}`);
      return res.data;
    },
    refetchInterval: 10000,
  });

  const { data: notificationData } = useQuery({
    queryKey: ["adminNotificationsBadge"],
    queryFn: async () => {
      const res = await apiRequest<{ items?: any[] }>("/notifications?type=broadcast");
      return res.data;
    },
    refetchInterval: 10000,
  });

  useEffect(() => {
    if (!socket || !employeeStatus?.id) return;

    const handleStatusUpdate = (payload: { userId: string; current_status: string }) => {
      if (payload.userId === employeeStatus.id) {
        queryClient.invalidateQueries({ queryKey: ["adminEmployeeStatus"] });
      }
    };

    socket.on("status-update", handleStatusUpdate);
    return () => {
      socket.off("status-update", handleStatusUpdate);
    };
  }, [socket, employeeStatus?.id, queryClient]);

  const currentStatus = employeeStatus?.current_status || "AVAILABLE";

  const unreadMessagesCount = useMemo(() => {
    const items = messagesData?.items || [];
    return items.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  }, [messagesData]);

  const unreadNotificationsCount = useMemo(() => {
    const items = notificationData?.items || [];
    return items.filter((n: any) => n.status !== "read").length;
  }, [notificationData]);

  const statusColor = useMemo(() => {
    if (currentStatus === "LUNCH") return "#f59e0b";
    if (currentStatus === "BREAK") return "#8b5cf6";
    return "#10b981";
  }, [currentStatus]);

  const initials = (user?.fullName || user?.email || "A")
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const rawImage = headerSettings?.imageConfig?.url || headerSettings?.imageConfig?.dataUrl;
  const imageUri = tokenReady ? toProxiedUrl(rawImage) : undefined;
  const hasImageBackground = headerSettings?.backgroundType === "image" && !!imageUri;

  const dynamicColors = useMemo(() => {
    return {
      background: uiTheme?.panelColors?.dashboardBackground || (isDark ? "#090d13" : "#f8fafc"),
      text: uiTheme?.panelColors?.dashboardTextColor || (isDark ? "#ffffff" : "#0f172a")
    };
  }, [uiTheme, isDark]);

  const colors = headerSettings?.colorConfig
    ? [headerSettings.colorConfig.from, headerSettings.colorConfig.via, headerSettings.colorConfig.to]
    : [Colors.primary || "#1f6feb", Colors.primary || "#1f6feb", Colors.primaryDark || "#020408"];

  const avatarRaw = userSettings?.item?.avatarDataUrl || userSettings?.item?.avatarUrl || null;
  const avatarUrl = useMemo(() => {
    if (!avatarRaw) return null;
    return avatarRaw.startsWith("http") || avatarRaw.startsWith("data:")
      ? avatarRaw
      : `https://task.se7eninc.com${avatarRaw}`;
  }, [avatarRaw]);

  const resolvedAvatarUri = useMemo(() => {
    if (!avatarUrl) return null;
    if (avatarUrl.startsWith("data:")) return avatarUrl;
    return tokenReady ? toProxiedUrl(avatarUrl) : null;
  }, [avatarUrl, tokenReady]);

  useEffect(() => {
    setAvatarLoadError(false);
  }, [resolvedAvatarUri]);

  const handleLogout = () => {
    Alert.alert("Confirm Logout", "Are you sure you want to sign out of your account?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: () => logout() }
    ]);
  };

  const baseHeaderHeight = 165;

  return (
    <View style={[styles.header, { paddingTop: insets.top, height: baseHeaderHeight + insets.top, backgroundColor: dynamicColors.background }]}>
      {hasImageBackground && imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.backgroundImage} />
      ) : (
        <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.gradientBackground} />
      )}

      {hasImageBackground && headerSettings?.overlay?.enabled && (
        <View style={[styles.overlay, { backgroundColor: headerSettings?.overlay?.color || "rgba(0, 0, 0, 0.4)" }]} />
      )}

      {isMetallic && <View style={styles.metallicSparkLine} />}

      <View style={styles.mainContainer}>
        <View style={styles.profileRowWrapper}>
          <TouchableOpacity 
            style={[styles.profileWidgetCard, isMetallic && styles.metallicWidgetCard]}
            onPress={() => router.push("/(admin)/profile" as any)}
            activeOpacity={0.85}
          >
            <View style={styles.avatarWrapper}>
              <View style={[styles.avatarRingFrame, { borderColor: statusColor }]}>
                {resolvedAvatarUri && !avatarLoadError ? (
                  <Image source={{ uri: resolvedAvatarUri }} style={styles.avatarAsset} />
                ) : (
                  <View style={[styles.fallbackAvatar, { backgroundColor: isMetallic ? "#c89537" : "#0ea5e9" }]}>
                    <Text style={styles.fallbackAvatarText}>{initials}</Text>
                  </View>
                )}
              </View>
              <View style={[styles.statusPulseTrackerDot, { backgroundColor: statusColor }]} />
            </View>

            <View style={styles.identityMetaColumn}>
              <Text style={styles.identityNameText} numberOfLines={1}>{user?.fullName || "Admin User"}</Text>
              <Text style={[styles.identityRoleText, { color: isMetallic ? "#ffd27a" : "rgba(255,255,255,0.6)" }]}>
                {user?.role?.toUpperCase() || "ADMIN"}
              </Text>
            </View>
          </TouchableOpacity>

          {isMetallic && (
            <View style={styles.brandingBox}>
              <Sparkles size={11} color="#ffd27a" />
              <Text style={styles.brandingText}>TASKBLASTER</Text>
            </View>
          )}
        </View>

        <View style={styles.actionIconClusterRow}>
          <TouchableOpacity style={styles.iconActionItem} onPress={onMenuPress} activeOpacity={0.7}>
            <Menu color="#FFFFFF" size={18} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconActionItem} onPress={() => router.push("/(admin)/messaging" as any)}>
            <Mail color="#FFFFFF" size={18} />
            {unreadMessagesCount > 0 && (
              <View style={[styles.countBadge, { backgroundColor: isMetallic ? "#ffd27a" : "#0ea5e9" }]}>
                <Text style={[styles.badgeText, { color: isMetallic ? "#000" : "#FFF" }]}>
                  {unreadMessagesCount > 9 ? "9+" : unreadMessagesCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/*<TouchableOpacity style={styles.iconActionItem} onPress={() => router.push("/(admin)/notifications" as any)}>
            <Bell color="#FFFFFF" size={18} />
            {unreadNotificationsCount > 0 && (
              <View style={[styles.countBadge, { backgroundColor: "#ef4444" }]}>
                <Text style={styles.badgeText}>
                  {unreadNotificationsCount > 9 ? "9+" : unreadNotificationsCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>*/}

          <TouchableOpacity style={styles.iconActionItem} onPress={() => router.push("/(admin)/bug" as any)}>
            <Bug color="#FFFFFF" size={18} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconActionItem} onPress={handleLogout}>
            <LogOut color={isMetallic ? "#f85149" : "#ff4d4d"} size={18} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    width: "100%",
    position: "relative",
    overflow: "hidden",
  },
  gradientBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  metallicSparkLine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: "rgba(255,210,122,0.4)",
    zIndex: 15,
  },
  mainContainer: {
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: "center",
    gap: 14,
    paddingTop: 10,
    paddingBottom: 10,
    zIndex: 10,
  },
  profileRowWrapper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  profileWidgetCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignSelf: "flex-start",
  },
  metallicWidgetCard: {
    backgroundColor: "#161b22",
    borderColor: "rgba(255,210,122,0.35)",
  },
  avatarWrapper: {
    position: "relative",
  },
  avatarRingFrame: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    padding: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarAsset: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
  },
  fallbackAvatar: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  fallbackAvatarText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  statusPulseTrackerDot: {
    position: "absolute",
    bottom: -1,
    right: -1,
    width: 11,
    height: 11,
    borderRadius: 5.5,
    borderWidth: 1.5,
    borderColor: "#000000",
  },
  identityMetaColumn: {
    marginLeft: 10,
    justifyContent: "center",
  },
  identityNameText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  identityRoleText: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginTop: 1,
  },
  brandingBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.3)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(255,210,122,0.2)",
  },
  brandingText: {
    color: "#ffd27a",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },
  actionIconClusterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    width: "100%",
  },
  iconActionItem: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  countBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 15,
    height: 15,
    borderRadius: 7.5,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    borderWidth: 1,
    borderColor: "#000000",
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 8,
    fontWeight: "800",
    textAlign: "center",
  },
});