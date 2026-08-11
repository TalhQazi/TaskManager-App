import React, { useMemo, useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
  TextInput,
  FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  Bell,
  Menu,
  LogOut,
  Mail,
  Bug,
  Sparkles,
  Camera,
  X,
  Palette,
  Check,
  FolderOpen,
  Search,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";

import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";
import { useSocket } from "@/contexts/SocketContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/services/api";
import { toProxiedUrl, initToken } from "@/util/toProxiedUrl";

interface HeaderSettings {
  _id?: string;
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

interface AssetItem {
  id: string;
  _id?: string;
  originalFilename: string;
  mimeType: string;
  urlOriginal: string;
  sizeBytes?: number;
  attachment?: { url: string; fileName: string };
}

interface FolderItem {
  id: string;
  name: string;
  assetCount?: number;
  children?: FolderItem[];
}

interface EmployeeMeResponse {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  current_status?: string;
  role?: string;
}

/**
 * Bulletproof Image URL converter
 */
const getDisplayImageUrl = (rawPath?: string | null, activeToken?: string | null) => {
  if (!rawPath || typeof rawPath !== "string" || !rawPath.trim()) return null;

  if (
    rawPath.startsWith("data:") ||
    rawPath.startsWith("file://") ||
    rawPath.startsWith("content://")
  ) {
    return rawPath;
  }

  let path = rawPath.trim();
  if (path.includes("token=")) return path;

  if (path.startsWith("/uploads/")) {
    path = path.replace("/uploads/", "/api/s3-proxy/");
  } else if (path.startsWith("uploads/")) {
    path = path.replace("uploads/", "/api/s3-proxy/");
  } else if (!path.startsWith("/api/s3-proxy/") && !path.startsWith("http")) {
    path = `/api/s3-proxy/${path.replace(/^\//, "")}`;
  }

  if (!path.startsWith("http://") && !path.startsWith("https://")) {
    path = `https://task.se7eninc.com${path.startsWith("/") ? path : `/${path}`}`;
  }

  try {
    const proxied = toProxiedUrl(path);
    if (proxied && proxied.includes("token=")) {
      return proxied;
    }
  } catch (e) {}

  if (activeToken) {
    const separator = path.includes("?") ? "&" : "?";
    return `${path}${separator}token=${activeToken}`;
  }

  return path;
};

const getVerticalPositionValue = (posStr: string | undefined): number => {
  if (!posStr) return 50;
  if (posStr === "center") return 50;
  if (posStr === "top") return 0;
  if (posStr === "bottom") return 100;
  const match = posStr.match(/(\d+)%/);
  return match ? parseInt(match[1], 10) : 50;
};

/**
 * Custom Range Slider Component for smooth drag/touch
 */
function CustomSlider({
  value,
  onValueChange,
  onSlidingComplete,
}: {
  value: number;
  onValueChange: (val: number) => void;
  onSlidingComplete: (val: number) => void;
}) {
  const [trackWidth, setTrackWidth] = useState(240);
  const valRef = useRef(value);

  useEffect(() => {
    valRef.current = value;
  }, [value]);

  const handleTouch = (evt: any) => {
    const touchX = evt.nativeEvent.locationX;
    let percentage = Math.round((touchX / trackWidth) * 100);
    percentage = Math.max(0, Math.min(100, percentage));
    valRef.current = percentage;
    onValueChange(percentage);
  };

  const handleTouchRelease = () => {
    onSlidingComplete(valRef.current);
  };

  const currentPercent = Math.max(0, Math.min(100, value));

  return (
    <View
      style={sliderStyles.container}
      onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width || 240)}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={handleTouch}
      onResponderMove={handleTouch}
      onResponderRelease={handleTouchRelease}
      onResponderTerminate={handleTouchRelease}
    >
      <View style={sliderStyles.trackBackground}>
        <View style={[sliderStyles.trackActive, { width: `${currentPercent}%` }]} />
        <View style={[sliderStyles.thumb, { left: `${currentPercent}%` }]} />
      </View>
    </View>
  );
}

export default function ManagerHeader({ onMenuPress }: { onMenuPress: () => void }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, logout } = useAuth();
  const { socket } = useSocket();
  const { uiTheme } = useTheme();

  const [jwtToken, setJwtToken] = useState<string | null>(null);
  const [avatarLoadError, setAvatarLoadError] = useState(false);
  const [bgLoadError, setBgLoadError] = useState(false);

  // Header Customization Modal States
  const [headerModalOpen, setHeaderModalOpen] = useState(false);
  const [isAssetPickerOpen, setIsAssetPickerOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [localPosition, setLocalPosition] = useState<string>("center 50%");
  const isEditingPositionRef = useRef(false);

  // Asset Library Picker States
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>("");
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [assetSearch, setAssetSearch] = useState("");
  const [selectedAssetUrl, setSelectedAssetUrl] = useState<string>("");
  const [assetPage, setAssetPage] = useState(1);
  const [totalAssetPages, setTotalAssetPages] = useState(1);

  const isDark = uiTheme?.theme !== "crystal-white";
  const isMetallic = uiTheme?.theme === "metallic-elite";

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        await initToken();

        let token =
          (user as any)?.token ||
          (user as any)?.accessToken ||
          (user as any)?.jwt ||
          (user as any)?.user?.token;

        if (!token) {
          const keys = await AsyncStorage.getAllKeys();
          const possibleTokenKeys = keys.filter((k) =>
            /token|jwt|auth|session/i.test(k)
          );

          for (const key of possibleTokenKeys) {
            const val = await AsyncStorage.getItem(key);
            if (val && typeof val === "string" && val.length > 10) {
              token = val;
              break;
            }
          }
        }

        if (isMounted && token) {
          setJwtToken(token);
        }
      } catch (err) {
        console.error("Failed to load JWT token:", err);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const { data: headerSettings } = useQuery<HeaderSettings | null>({
    queryKey: ["managerHeaderSettings"],
    queryFn: async () => {
      try {
        const res = await apiRequest<any>("/header-settings");
        return res.data?.item || res.data || null;
      } catch (e) {
        return null;
      }
    },
  });

  const { data: userSettings } = useQuery<any>({
    queryKey: ["userSettings"],
    queryFn: async () => {
      try {
        const res = await apiRequest<any>("/settings");
        return res.data?.item || res.data || null;
      } catch (e) {
        return null;
      }
    },
  });

  const { data: employeeStatus } = useQuery<EmployeeMeResponse | null>({
    queryKey: ["managerEmployeeStatus"],
    queryFn: async () => {
      try {
        const res = await apiRequest<{ item: EmployeeMeResponse }>("/employees/me");
        return res.data?.item || null;
      } catch (e) {
        return null;
      }
    },
  });

  const { data: messagesData } = useQuery({
    queryKey: ["managerMessagesBadge"],
    queryFn: async () => {
      const res = await apiRequest<{ items?: any[] }>(`/messages/conversations/${user?.username || "manager"}`);
      return res.data;
    },
    refetchInterval: 10000,
  });

  const { data: notificationData } = useQuery({
    queryKey: ["managerNotificationsBadge"],
    queryFn: async () => {
      const res = await apiRequest<{ items?: any[] }>("/notifications?type=broadcast");
      return res.data;
    },
    refetchInterval: 10000,
  });

  // Sync server position when not actively editing
  useEffect(() => {
    if (!isEditingPositionRef.current && headerSettings?.imageConfig?.position) {
      setLocalPosition(headerSettings.imageConfig.position);
    }
  }, [headerSettings?.imageConfig?.position]);

  useEffect(() => {
    if (!socket || !employeeStatus?.id) return;

    const handleStatusUpdate = (payload: { userId: string; current_status: string }) => {
      if (payload.userId === employeeStatus.id) {
        queryClient.invalidateQueries({ queryKey: ["managerEmployeeStatus"] });
      }
    };

    socket.on("status-update", handleStatusUpdate);
    return () => {
      socket.off("status-update", handleStatusUpdate);
    };
  }, [socket, employeeStatus?.id, queryClient]);

  // Load Asset Library Folders
  useEffect(() => {
    if (!isAssetPickerOpen) return;
    (async () => {
      try {
        const res = await apiRequest<{ items: FolderItem[] }>("/asset-library/folders?module=asset-library");
        setFolders(res.data?.items || []);
      } catch (e) {
        console.error("Failed to load asset folders:", e);
      }
    })();
  }, [isAssetPickerOpen]);

  // Load Asset Library Items
  useEffect(() => {
    if (!isAssetPickerOpen) return;
    let isMounted = true;
    setLoadingAssets(true);

    (async () => {
      try {
        const params = new URLSearchParams();
        params.set("module", "asset-library");
        if (selectedFolderId) params.set("folderId", selectedFolderId);
        params.set("type", "image");
        if (assetSearch.trim()) params.set("q", assetSearch.trim());
        params.set("sort", "az");
        params.set("limit", "30");
        params.set("page", assetPage.toString());

        const res = await apiRequest<{ items: AssetItem[]; totalPages: number }>(`/asset-library/assets?${params.toString()}`);
        if (isMounted) {
          setAssets(res.data?.items || []);
          setTotalAssetPages(res.data?.totalPages || 1);
        }
      } catch (e) {
        console.error("Failed to load assets:", e);
      } finally {
        if (isMounted) setLoadingAssets(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [isAssetPickerOpen, selectedFolderId, assetSearch, assetPage]);

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

  const initials = (employeeStatus?.name || user?.fullName || user?.email || "M")
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // Background Image Resolution
  const rawBgImage = headerSettings?.imageConfig?.url || headerSettings?.imageConfig?.dataUrl || null;
  const imageUri = useMemo(() => {
    return getDisplayImageUrl(rawBgImage, jwtToken);
  }, [rawBgImage, jwtToken]);

  const bgImageSource = useMemo(() => {
    return imageUri ? { uri: imageUri } : null;
  }, [imageUri]);

  const hasImageBackground = headerSettings?.backgroundType === "image" && !!imageUri && !bgLoadError;

  // Avatar Image Resolution
  const avatarRaw =
    userSettings?.item?.avatarDataUrl ||
    userSettings?.item?.avatarUrl ||
    employeeStatus?.avatarUrl ||
    user?.avatarUrl ||
    null;

  const resolvedAvatarUri = useMemo(() => {
    return getDisplayImageUrl(avatarRaw, jwtToken);
  }, [avatarRaw, jwtToken]);

  const avatarImageSource = useMemo(() => {
    return resolvedAvatarUri ? { uri: resolvedAvatarUri } : null;
  }, [resolvedAvatarUri]);

  const dynamicColors = useMemo(() => {
    return {
      background: uiTheme?.panelColors?.dashboardBackground || (isDark ? "#090d13" : "#f8fafc"),
      text: uiTheme?.panelColors?.dashboardTextColor || (isDark ? "#ffffff" : "#0f172a")
    };
  }, [uiTheme, isDark]);

  const colors = headerSettings?.colorConfig
    ? [headerSettings.colorConfig.from, headerSettings.colorConfig.via, headerSettings.colorConfig.to]
    : [Colors.primary || "#1f6feb", Colors.primary || "#1f6feb", Colors.primaryDark || "#020408"];

  useEffect(() => {
    setAvatarLoadError(false);
  }, [resolvedAvatarUri]);

  useEffect(() => {
    setBgLoadError(false);
  }, [imageUri]);

  const baseHeaderHeight = headerSettings?.height ? Math.max(140, headerSettings.height + 20) : 165;
  const totalHeaderHeight = baseHeaderHeight + insets.top;

  // Vertical position calculation
  const currentPosValue = getVerticalPositionValue(localPosition);
  const bgImageHeight = totalHeaderHeight * 1.6;
  const maxShiftOffset = bgImageHeight - totalHeaderHeight;
  const imageTopOffset = -(maxShiftOffset * (currentPosValue / 100));

  // Modal Mini Preview Calculations
  const modalPreviewHeight = 120;
  const modalPreviewImageHeight = modalPreviewHeight * 1.6;
  const modalPreviewShift = -((modalPreviewImageHeight - modalPreviewHeight) * (currentPosValue / 100));

  const handleLogout = () => {
    Alert.alert("Confirm Logout", "Are you sure you want to sign out of your account?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: () => logout() }
    ]);
  };

  const handleBugReport = () => {
    router.push("/(manager)/bug" as any);
  };

  const handlePickHeaderImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        alert("Permission to access camera roll is required!");
        return;
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
        base64: true,
      });

      if (!pickerResult.canceled && pickerResult.assets && pickerResult.assets.length > 0) {
        setUploading(true);
        const asset = pickerResult.assets[0];
        let base64String = asset.base64;

        if (!base64String && asset.uri) {
          const response = await fetch(asset.uri);
          const blob = await response.blob();
          base64String = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        }

        const dataUrl = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : base64String;

        await apiRequest("/header-settings", {
          method: "PUT",
          body: JSON.stringify({
            backgroundType: "image",
            imageConfig: {
              dataUrl,
              url: dataUrl,
            },
          }),
        });

        queryClient.invalidateQueries({ queryKey: ["managerHeaderSettings"] });
        setHeaderModalOpen(false);
      }
    } catch (error) {
      console.error("Failed to upload header image:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleSelectAssetLibraryImage = async () => {
    if (!selectedAssetUrl) return;
    try {
      setUploading(true);
      await apiRequest("/header-settings", {
        method: "PUT",
        body: JSON.stringify({
          backgroundType: "image",
          imageConfig: {
            url: selectedAssetUrl,
            dataUrl: selectedAssetUrl,
          },
        }),
      });

      queryClient.invalidateQueries({ queryKey: ["managerHeaderSettings"] });
      setIsAssetPickerOpen(false);
      setHeaderModalOpen(false);
      setSelectedAssetUrl("");
    } catch (error) {
      console.error("Failed to update header from asset library:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleUpdatePositionValue = (newVal: number) => {
    isEditingPositionRef.current = true;
    const posStr = `center ${newVal}%`;
    setLocalPosition(posStr);
  };

  const handleSavePosition = async (newVal: number) => {
    const posStr = `center ${newVal}%`;
    setLocalPosition(posStr);

    try {
      await apiRequest("/header-settings", {
        method: "PUT",
        body: JSON.stringify({
          imageConfig: {
            position: posStr,
          },
        }),
      });

      setTimeout(() => {
        isEditingPositionRef.current = false;
      }, 500);

      queryClient.invalidateQueries({ queryKey: ["managerHeaderSettings"] });
    } catch (error) {
      isEditingPositionRef.current = false;
      console.error("Failed to save cover position:", error);
    }
  };

  const handleResetHeader = async () => {
    try {
      await apiRequest("/header-settings/reset", { method: "POST" });
      queryClient.invalidateQueries({ queryKey: ["managerHeaderSettings"] });
      setHeaderModalOpen(false);
    } catch (error) {
      console.error("Failed to reset header:", error);
    }
  };

  return (
    <>
      <View style={[styles.header, { paddingTop: insets.top, height: totalHeaderHeight, backgroundColor: dynamicColors.background }]}>
        {hasImageBackground && bgImageSource ? (
          <Image 
            source={bgImageSource} 
            style={[
              styles.backgroundImage,
              {
                height: bgImageHeight,
                top: imageTopOffset,
              }
            ]}  
            resizeMode="cover"
            onError={() => setBgLoadError(true)}
          />
        ) : (
          <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.gradientBackground} />
        )}

        {hasImageBackground && headerSettings?.overlay?.enabled && (
          <View style={[styles.overlay, { backgroundColor: headerSettings?.overlay?.color || "rgba(0, 0, 0, 0.3)" }]} />
        )}

        {isMetallic && <View style={styles.metallicSparkLine} />}

        {/* Top-Right Camera Icon to open Header Customization Modal */}
        <TouchableOpacity
          onPress={() => setHeaderModalOpen(true)}
          style={[styles.headerPictureButton, { top: insets.top + 8 }]}
          activeOpacity={0.8}
        >
          <Camera color="#FFFFFF" size={16} />
        </TouchableOpacity>

        <View style={styles.mainContainer}>
          <View style={styles.profileRowWrapper}>
            <TouchableOpacity 
              style={[styles.profileWidgetCard, isMetallic && styles.metallicWidgetCard]}
              onPress={() => router.push("/(manager)/profile" as any)}
              activeOpacity={0.85}
            >
              <View style={styles.avatarWrapper}>
                <View style={[styles.avatarRingFrame, { borderColor: statusColor }]}>
                  {avatarImageSource && !avatarLoadError ? (
                    <Image 
                      source={avatarImageSource} 
                      style={styles.avatarAsset} 
                      resizeMode="cover"
                      onError={() => setAvatarLoadError(true)}
                    />
                  ) : (
                    <View style={[styles.fallbackAvatar, { backgroundColor: isMetallic ? "#c89537" : "#0ea5e9" }]}>
                      <Text style={styles.fallbackAvatarText}>{initials}</Text>
                    </View>
                  )}
                </View>
                <View style={[styles.statusPulseTrackerDot, { backgroundColor: statusColor }]} />
              </View>

              <View style={styles.identityMetaColumn}>
                <Text style={styles.identityNameText} numberOfLines={1}>
                  {employeeStatus?.name || user?.fullName || "Talha Qazi"}
                </Text>
                <Text style={[styles.identityRoleText, { color: isMetallic ? "#ffd27a" : "rgba(255,255,255,0.6)" }]}>
                  {(employeeStatus?.role || user?.role || "MANAGER").toUpperCase()}
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

            <TouchableOpacity style={styles.iconActionItem} onPress={() => router.push("/(manager)/messages" as any)}>
              <Mail color="#FFFFFF" size={18} />
              {unreadMessagesCount > 0 && (
                <View style={[styles.countBadge, { backgroundColor: isMetallic ? "#ffd27a" : "#0ea5e9" }]}>
                  <Text style={[styles.badgeText, { color: isMetallic ? "#000" : "#FFF" }]}>
                    {unreadMessagesCount > 9 ? "9+" : unreadMessagesCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.iconActionItem} onPress={() => router.push("/(manager)/notifications" as any)}>
              <Bell color="#FFFFFF" size={18} />
              {unreadNotificationsCount > 0 && (
                <View style={[styles.countBadge, { backgroundColor: "#ef4444" }]}>
                  <Text style={styles.badgeText}>
                    {unreadNotificationsCount > 9 ? "9+" : unreadNotificationsCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.iconActionItem} onPress={handleBugReport}>
              <Bug color="#FFFFFF" size={18} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.iconActionItem} onPress={handleLogout}>
              <LogOut color={isMetallic ? "#f85149" : "#ff4d4d"} size={18} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Main Header Edit Modal */}
      <Modal visible={headerModalOpen} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Header Picture</Text>
              <TouchableOpacity onPress={() => setHeaderModalOpen(false)}>
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalBodyScroll}>
              <Text style={styles.modalDescription}>
                Upload a custom background image or pick directly from system assets.
              </Text>

              {/* Upload Box */}
              <TouchableOpacity
                style={styles.uploadCard}
                onPress={handlePickHeaderImage}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator color="#0072FF" />
                ) : (
                  <>
                    <Camera size={30} color="#64748b" />
                    <Text style={styles.uploadCardText}>Tap to Upload Device Photo</Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Asset Library Picker Button */}
              <TouchableOpacity
                style={styles.pickFromLibraryBtn}
                onPress={() => setIsAssetPickerOpen(true)}
              >
                <Palette size={18} color="#4f46e5" />
                <Text style={styles.pickFromLibraryBtnText}>Pick from Asset Images</Text>
              </TouchableOpacity>

              {/* Live Reposition Slider & Interactive Preview Card */}
              {hasImageBackground && bgImageSource && (
                <View style={styles.repositionContainer}>
                  <Text style={styles.repositionSectionTitle}>Reposition Cover</Text>

                  {/* Live Mini Preview Box inside modal */}
                  <View style={[styles.miniPreviewCard, { height: modalPreviewHeight }]}>
                    <Image
                      source={bgImageSource}
                      style={[
                        styles.miniPreviewImage,
                        {
                          height: modalPreviewImageHeight,
                          top: modalPreviewShift,
                        },
                      ]}
                      resizeMode="cover"
                    />
                    <View style={styles.miniPreviewBadge}>
                      <Text style={styles.miniPreviewBadgeText}>Live Preview</Text>
                    </View>
                  </View>

                  <View style={styles.repositionHeader}>
                    <Text style={styles.repositionLabel}>Vertical Position</Text>
                    <Text style={styles.repositionValue}>{currentPosValue}%</Text>
                  </View>

                  {/* Smooth Range Slider */}
                  <CustomSlider
                    value={currentPosValue}
                    onValueChange={handleUpdatePositionValue}
                    onSlidingComplete={handleSavePosition}
                  />

                  <View style={styles.sliderMinMaxRow}>
                    <Text style={styles.sliderMinMaxText}>0% (Top)</Text>
                    <Text style={styles.sliderMinMaxText}>50% (Center)</Text>
                    <Text style={styles.sliderMinMaxText}>100% (Bottom)</Text>
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.resetButton}
                onPress={handleResetHeader}
              >
                <Text style={styles.resetButtonText}>Reset Default</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setHeaderModalOpen(false)}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Asset Library Picker Modal */}
      <Modal visible={isAssetPickerOpen} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.assetPickerModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pick from Asset Images</Text>
              <TouchableOpacity onPress={() => setIsAssetPickerOpen(false)}>
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Folders horizontal strip */}
            <View style={styles.folderStrip}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.folderStripScroll}>
                <TouchableOpacity
                  style={[styles.folderChip, !selectedFolderId && styles.activeFolderChip]}
                  onPress={() => { setSelectedFolderId(""); setAssetPage(1); }}
                >
                  <FolderOpen size={12} color={!selectedFolderId ? "#0072FF" : "#64748b"} />
                  <Text style={[styles.folderChipText, !selectedFolderId && styles.activeFolderChipText]}>All Files</Text>
                </TouchableOpacity>
                {folders.map((f) => (
                  <TouchableOpacity
                    key={f.id}
                    style={[styles.folderChip, selectedFolderId === f.id && styles.activeFolderChip]}
                    onPress={() => { setSelectedFolderId(f.id); setAssetPage(1); }}
                  >
                    <FolderOpen size={12} color={selectedFolderId === f.id ? "#0072FF" : "#64748b"} />
                    <Text style={[styles.folderChipText, selectedFolderId === f.id && styles.activeFolderChipText]}>{f.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Search Input */}
            <View style={styles.searchBoxWrapper}>
              <Search size={14} color="#94a3b8" style={styles.searchIconPos} />
              <TextInput
                style={styles.searchTextInput}
                placeholder="Search asset images..."
                placeholderTextColor="#94a3b8"
                value={assetSearch}
                onChangeText={(val) => { setAssetSearch(val); setAssetPage(1); }}
              />
            </View>

            {/* Asset Grid */}
            <View style={styles.assetGridContainer}>
              {loadingAssets ? (
                <View style={styles.centerLoadingState}>
                  <ActivityIndicator size="small" color="#0072FF" />
                </View>
              ) : assets.length === 0 ? (
                <View style={styles.centerLoadingState}>
                  <Text style={styles.emptyAssetStateText}>No matching images found</Text>
                </View>
              ) : (
                <FlatList
                  data={assets}
                  keyExtractor={(item) => item.id || item._id || Math.random().toString()}
                  numColumns={3}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.assetGridList}
                  renderItem={({ item }) => {
                    const rawUrl = item.urlOriginal || item.attachment?.url || "";
                    const displayUri = getDisplayImageUrl(rawUrl, jwtToken);
                    const isSelected = selectedAssetUrl === rawUrl;

                    return (
                      <TouchableOpacity
                        style={[styles.assetTile, isSelected && styles.selectedAssetTile]}
                        onPress={() => setSelectedAssetUrl(rawUrl)}
                        activeOpacity={0.8}
                      >
                        {displayUri ? (
                          <Image source={{ uri: displayUri }} style={styles.assetTileImage} resizeMode="cover" />
                        ) : null}
                        {isSelected && (
                          <View style={styles.selectedAssetBadgeOverlay}>
                            <Check size={16} color="#ffffff" />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  }}
                />
              )}
            </View>

            {/* Pagination and Apply Footer */}
            <View style={styles.assetPickerFooter}>
              {totalAssetPages > 1 && (
                <View style={styles.paginationRow}>
                  <TouchableOpacity
                    style={[styles.pageNavBtn, assetPage <= 1 && styles.pageNavBtnDisabled]}
                    disabled={assetPage <= 1}
                    onPress={() => setAssetPage((p) => Math.max(1, p - 1))}
                  >
                    <Text style={styles.pageNavBtnText}>Prev</Text>
                  </TouchableOpacity>

                  <Text style={styles.pageCounterText}>{assetPage} / {totalAssetPages}</Text>

                  <TouchableOpacity
                    style={[styles.pageNavBtn, assetPage >= totalAssetPages && styles.pageNavBtnDisabled]}
                    disabled={assetPage >= totalAssetPages}
                    onPress={() => setAssetPage((p) => Math.min(totalAssetPages, p + 1))}
                  >
                    <Text style={styles.pageNavBtnText}>Next</Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.footerButtonsGroup}>
                <TouchableOpacity
                  style={styles.cancelPickerBtn}
                  onPress={() => setIsAssetPickerOpen(false)}
                >
                  <Text style={styles.cancelPickerBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.applySelectedBtn, !selectedAssetUrl && styles.applySelectedBtnDisabled]}
                  disabled={!selectedAssetUrl || uploading}
                  onPress={handleSelectAssetLibraryImage}
                >
                  {uploading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.applySelectedBtnText}>Use Selected Image</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const sliderStyles = StyleSheet.create({
  container: {
    width: "100%",
    height: 32,
    justifyContent: "center",
  },
  trackBackground: {
    width: "100%",
    height: 8,
    borderRadius: 4,
    backgroundColor: "#e2e8f0",
    position: "relative",
  },
  trackActive: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: "#0072FF",
  },
  thumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#0072FF",
    borderWidth: 2,
    borderColor: "#ffffff",
    position: "absolute",
    top: -6,
    marginLeft: -10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
});

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
    position: "absolute",
    left: 0,
    right: 0,
    width: "100%",
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
  headerPictureButton: {
    position: "absolute",
    right: 16,
    zIndex: 25,
    backgroundColor: "rgba(0,0,0,0.4)",
    padding: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
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

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    width: "100%",
    maxWidth: 360,
    maxHeight: "85%",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  modalBodyScroll: {
    paddingVertical: 4,
  },
  modalDescription: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 12,
  },
  uploadCard: {
    height: 100,
    borderWidth: 2,
    borderColor: "#cbd5e1",
    borderStyle: "dashed",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    gap: 8,
  },
  uploadCardText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 12,
    gap: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#e2e8f0",
  },
  dividerText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94a3b8",
  },
  pickFromLibraryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    backgroundColor: "#eef2ff",
    borderWidth: 1,
    borderColor: "#c7d2fe",
    borderRadius: 8,
  },
  pickFromLibraryBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#4f46e5",
  },
  repositionContainer: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  repositionSectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 10,
  },
  miniPreviewCard: {
    width: "100%",
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#0f172a",
    position: "relative",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  miniPreviewImage: {
    position: "absolute",
    left: 0,
    right: 0,
    width: "100%",
  },
  miniPreviewBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  miniPreviewBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#ffffff",
  },
  repositionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  repositionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
  },
  repositionValue: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0072FF",
  },
  sliderMinMaxRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  sliderMinMaxText: {
    fontSize: 9,
    fontWeight: "600",
    color: "#94a3b8",
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 12,
  },
  resetButton: {
    paddingVertical: 8,
  },
  resetButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#ef4444",
  },
  closeButton: {
    backgroundColor: "#0f172a",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  closeButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#ffffff",
  },

  // Asset Picker Modal Styles
  assetPickerModalContent: {
    backgroundColor: "#FFFFFF",
    width: "100%",
    maxWidth: 380,
    height: "80%",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  folderStrip: {
    marginBottom: 10,
  },
  folderStripScroll: {
    gap: 6,
  },
  folderChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#f1f5f9",
  },
  activeFolderChip: {
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  folderChipText: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "500",
  },
  activeFolderChipText: {
    color: "#0072FF",
    fontWeight: "700",
  },
  searchBoxWrapper: {
    position: "relative",
    justifyContent: "center",
    marginBottom: 10,
  },
  searchIconPos: {
    position: "absolute",
    left: 10,
    zIndex: 2,
  },
  searchTextInput: {
    height: 36,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    paddingLeft: 32,
    paddingRight: 12,
    fontSize: 12,
    color: "#0f172a",
  },
  assetGridContainer: {
    flex: 1,
    marginVertical: 4,
  },
  centerLoadingState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyAssetStateText: {
    fontSize: 13,
    color: "#94a3b8",
  },
  assetGridList: {
    gap: 8,
  },
  assetTile: {
    flex: 1 / 3,
    aspectRatio: 1,
    margin: 3,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
    backgroundColor: "#f1f5f9",
    position: "relative",
  },
  selectedAssetTile: {
    borderColor: "#0072FF",
  },
  assetTileImage: {
    width: "100%",
    height: "100%",
  },
  selectedAssetBadgeOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 114, 255, 0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  assetPickerFooter: {
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 10,
    gap: 8,
  },
  paginationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pageNavBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  pageNavBtnDisabled: {
    opacity: 0.4,
  },
  pageNavBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  pageCounterText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748b",
  },
  footerButtonsGroup: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "flex-end",
  },
  cancelPickerBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cancelPickerBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
  },
  applySelectedBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#0072FF",
  },
  applySelectedBtnDisabled: {
    backgroundColor: "#cbd5e1",
  },
  applySelectedBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#ffffff",
  },
});