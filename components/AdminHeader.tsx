import React, { useMemo, useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePathname, router } from "expo-router";
import { Bell, LogOut, Menu } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";

import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
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

export default function AdminHeader({ onMenuPress }: any) {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const [tokenReady, setTokenReady] = useState(false);
  const [avatarLoadError, setAvatarLoadError] = useState(false);

  // Safe logout handler with alert prompt
  const handleLogout = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Log Out", 
          style: "destructive", 
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              console.error("Logout failed:", error);
            }
          }
        }
      ]
    );
  };

  // load token once
  useEffect(() => {
    (async () => {
      await initToken();
      setTokenReady(true);
    })();
  }, []);

  // HEADER SETTINGS
  const { data: headerSettings } = useQuery<HeaderSettings>({
    queryKey: ["AdminHeaderSettings"],
    queryFn: async () => {
      const res = await apiRequest<{ item: HeaderSettings }>("/header-settings");
      return res.data?.item;
    },
  });

  // USER SETTINGS (avatar)
  const { data: userSettings } = useQuery({
    queryKey: ["userSettings"],
    queryFn: async () => {
      const res = await apiRequest("/settings");
      return res.data;
    },
  });

  const title = useMemo(() => {
    if (pathname.includes("/tasks")) return "Tasks";
    if (pathname.includes("/vehicles")) return "Vehicles";
    if (pathname.includes("/messages")) return "Messages";
    if (pathname.includes("/notifications")) return "Notifications";
    if (pathname.includes("/profile")) return "Profile";
    return "Admin Dashboard";
  }, [pathname]);

  const initials = (user?.fullName || user?.email || "A")
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // BACKGROUND IMAGE LOGIC
  const rawImage =
    headerSettings?.imageConfig?.url ||
    headerSettings?.imageConfig?.dataUrl;

  const imageUri = tokenReady ? toProxiedUrl(rawImage) : undefined;

  const hasImageBackground =
    headerSettings?.backgroundType === "image" && !!imageUri;

  // COLORS
  const colors = headerSettings?.colorConfig
    ? [
        headerSettings.colorConfig.from,
        headerSettings.colorConfig.via,
        headerSettings.colorConfig.to,
      ]
    : [Colors.primary, Colors.primary, Colors.primaryDark || Colors.primary];

  // AVATAR RESOLUTION PIPELINE
  const avatarRaw =
    userSettings?.item?.avatarDataUrl ||
    userSettings?.item?.avatarUrl ||
    null;

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

  const headerHeight = headerSettings?.height || 72;

  return (
    <View
      style={[
        styles.header,
        { paddingTop: insets.top, height: headerHeight + insets.top },
      ]}
    >
      {/* BACKGROUND */}
      {hasImageBackground && imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.backgroundImage} />
      ) : (
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradientBackground}
        />
      )}

      {/* OVERLAY */}
      {hasImageBackground && headerSettings?.overlay?.enabled && (
        <View
          style={[
            styles.overlay,
            {
              backgroundColor:
                headerSettings?.overlay?.color || "rgb(0, 0, 0)",
            },
          ]}
        />
      )}

      {/* CONTENT */}
      <View style={styles.content}>
        <TouchableOpacity onPress={onMenuPress}>
          <Menu color="#fff" size={22} />
        </TouchableOpacity>

        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>

        <View style={styles.right}> 
          {/* NOTIFICATIONS BUTTON */}
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push("/(admin)/announcements" as any)}
          >
            <Bell color="#fff" size={20} />
          </TouchableOpacity>

          {/* LOGOUT BUTTON */}
          <TouchableOpacity style={styles.iconButton} onPress={handleLogout}>
            <LogOut color="#fff" size={20} />
          </TouchableOpacity>

          {/* AVATAR PROFILE BUTTON */}
          <TouchableOpacity
            style={styles.avatarButton}
            onPress={() => router.push("/(admin)/settings" as any)}
          >
            {resolvedAvatarUri && !avatarLoadError ? (
              <Image 
                source={{ 
                  uri: resolvedAvatarUri,
                  headers: {
                    Accept: "image/*"
                  }
                }} 
                style={styles.avatarImage}
                onError={(e) => {
                  console.warn("Admin header avatar failed to load:", e.nativeEvent.error);
                  setAvatarLoadError(true);
                }}
              />
            ) : (
              <Text style={styles.avatarText}>{initials}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    width: "100%",
    justifyContent: "flex-end",
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
  content: {
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 10,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 20,
  },
  avatarText: {
    color: "#fff",
    fontWeight: "700",
  },
});