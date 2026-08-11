import React, { useEffect, useMemo, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Switch,
  Image,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, Shield, Save, Camera, Bell } from "lucide-react-native";

import { apiFetch } from "@/lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { toProxiedUrl, initToken } from "@/util/toProxiedUrl";

interface SettingsItem {
  fullName: string;
  email: string;
  phone: string;
  role: string;
  avatarUrl?: string;
  avatarDataUrl?: string;
  notifications?: {
    emailNotifications?: boolean;
    taskAlerts?: boolean;
    employeeUpdates?: boolean;
    weeklyReports?: boolean;
  };
  emailPreferences?: Record<string, boolean>;
  webPreferences?: Record<string, boolean>;
  language?: string;
  timezone?: string;
}

/**
 * Image URL resolution logic matching ManagerHeader
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

function buildColors(uiTheme: any) {
  const isDark = uiTheme?.theme !== "crystal-white";
  return {
    background:     uiTheme?.panelColors?.dashboardBackground     || (isDark ? "#09090b" : "#ffffff"),
    cardBg:         uiTheme?.panelColors?.dashboardCardBackground || (isDark ? "#141517" : "#f8fafc"),
    text:           uiTheme?.panelColors?.dashboardTextColor      || (isDark ? "#f8fafc" : "#000000"),
    textSecondary:  isDark ? "#a1a1aa" : "#475569",
    border:         isDark ? "#27272a" : "rgba(0, 0, 0, 0.08)",
    primary:        uiTheme?.customColors?.primary                || "#ffd27a",
    inputBg:        isDark ? "#09090b" : "#ffffff",
    disabledBg:     isDark ? "#18181b" : "#f1f5f9",
    disabledText:   isDark ? "#52525b" : "#94a3b8",
    avatarFallback: isDark ? "#27272a" : "#e2e8f0",
  };
}

function createStyles(colors: ReturnType<typeof buildColors>, isDesktop: boolean, isTablet: boolean) {
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
      marginTop: 10,
      color: colors.textSecondary,
      fontSize: 14,
    },
    scrollContainer: {
      paddingHorizontal: isDesktop ? 32 : isTablet ? 24 : 16,
      paddingTop: 16,
      paddingBottom: 40,
      maxWidth: 1024,
      width: "100%",
      alignSelf: "center",
    },
    headerBlock: {
      marginBottom: 24,
    },
    pageTitle: {
      fontSize: isDesktop ? 30 : 26,
      fontWeight: "800",
      color: colors.text,
      letterSpacing: 0.3,
    },
    pageSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 2,
    },
    card: {
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: isDesktop ? 24 : 16,
      marginBottom: 20,
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginBottom: 20,
    },
    iconWrapper: {
      padding: 8,
      borderRadius: 8,
      backgroundColor: "rgba(255, 210, 122, 0.1)",
    },
    cardTitleText: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
    },
    avatarUploadContainer: {
      flexDirection: isTablet ? "row" : "column",
      alignItems: isTablet ? "center" : "flex-start",
      gap: 16,
      marginBottom: 20,
    },
    avatarWrapper: {
      position: "relative",
      width: 80,
      height: 80,
    },
    avatarFrame: {
      width: 80,
      height: 80,
      borderRadius: 40,
      borderWidth: 2,
      borderColor: colors.border,
    },
    avatarFallback: {
      backgroundColor: colors.avatarFallback,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarFallbackText: {
      fontSize: 24,
      fontWeight: "700",
      color: colors.primary,
    },
    cameraBadge: {
      position: "absolute",
      bottom: -2,
      right: -2,
      backgroundColor: colors.primary,
      padding: 8,
      borderRadius: 99,
    },
    avatarMetaBlock: {
      flex: 1,
      gap: 2,
    },
    avatarMetaPrimary: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.text,
    },
    avatarMetaSecondary: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    avatarMetaSizeInfo: {
      fontSize: 11,
      color: colors.textSecondary,
      opacity: 0.8,
    },
    formRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 14,
    },
    formGroup: {
      width: isDesktop ? "48.5%" : isTablet ? "48%" : "100%",
      minWidth: isTablet ? 240 : "100%",
      flexGrow: 1,
    },
    formLabel: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 6,
    },
    formInput: {
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 6,
      paddingHorizontal: 12,
      height: 44,
      color: colors.text,
      fontSize: 14,
    },
    formInputDisabled: {
      backgroundColor: colors.disabledBg,
      color: colors.disabledText,
    },
    toggleStrip: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    toggleMetaArea: {
      flex: 1,
      paddingRight: 16,
    },
    toggleLabelText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
    },
    toggleSubtitleText: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 1,
    },
    securityActionBtn: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 6,
      paddingVertical: 12,
      paddingHorizontal: 20,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 8,
      alignSelf: isTablet ? "flex-start" : "stretch",
    },
    securityActionBtnText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.text,
    },
    submitGlobalBtn: {
      flexDirection: "row",
      backgroundColor: colors.primary,
      borderRadius: 8,
      height: 48,
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginTop: 8,
      width: "100%",
    },
    submitGlobalBtnText: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.inputBg,
    },
  });
}

export default function Settings() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isTablet = width >= 640;

  const { uiTheme } = useTheme();
  const { user } = useAuth();
  const colors = useMemo(() => buildColors(uiTheme), [uiTheme]);
  const styles = useMemo(() => createStyles(colors, isDesktop, isTablet), [colors, isDesktop, isTablet]);

  const queryClient = useQueryClient();

  const [jwtToken, setJwtToken] = useState<string | null>(null);
  const [draft, setDraft] = useState<SettingsItem | null>(null);
  const [passwordDraft, setPasswordDraft] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });

  const MAX_AVATAR_BYTES = 10 * 1024 * 1024;

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
        console.error("Failed to load JWT token in Settings:", err);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const res = await apiFetch<any>("/api/settings");
      return res?.item ? res.item : res;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: SettingsItem) => {
      return apiFetch<{ item: SettingsItem }>("/api/settings", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (payload: { currentPassword: string; newPassword: string }) => {
      return apiFetch<{ ok: boolean }>("/api/auth/change-password", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    },
  });

  const avatarUploadMutation = useMutation({
    mutationFn: async (fileData: { uri: string; name: string; type: string }) => {
      const formData = new FormData();
      formData.append("avatar", fileData as any);

      return apiFetch<{ avatarDataUrl?: string; avatarUrl?: string }>("/api/settings/avatar", {
        method: "POST",
        body: formData,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
    },
  });

  useEffect(() => {
    if (!draft && settingsQuery.data) {
      const item = settingsQuery.data;
      const initialAvatar = item.avatarDataUrl || item.avatarUrl || "";
      setDraft({
        ...item,
        avatarUrl: initialAvatar,
      });
    }
  }, [settingsQuery.data, draft]);

  const resolvedAvatarUri = useMemo(() => {
    const raw = draft?.avatarUrl || draft?.avatarDataUrl;
    return getDisplayImageUrl(raw, jwtToken);
  }, [draft?.avatarUrl, draft?.avatarDataUrl, jwtToken]);

  const onSave = () => {
    if (!draft) return;

    const payload: SettingsItem = {
      ...draft,
      avatarDataUrl: draft.avatarUrl || "",
      avatarUrl: "",
    };

    saveMutation.mutate(payload, {
      onSuccess: (res) => {
        if (res?.item) {
          const item = res.item;
          setDraft({
            ...item,
            avatarUrl: item.avatarDataUrl || item.avatarUrl || "",
          });
        }
        queryClient.invalidateQueries({ queryKey: ["settings"] });
        Alert.alert("Saved", "Settings updated.");
      },
      onError: (err) => {
        Alert.alert(
          "Failed to save",
          err instanceof Error ? err.message : "Something went wrong"
        );
      },
    });
  };

  const setPreference = (type: "email" | "web", key: string, val: boolean) => {
    if (!draft) return;
    const prefKey = type === "email" ? "emailPreferences" : "webPreferences";
    const next: SettingsItem = {
      ...draft,
      [prefKey]: {
        ...((draft && draft[prefKey]) || {}),
        [key]: val,
      },
    };
    setDraft(next);

    saveMutation.mutate(next, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["settings"] });
      },
    });
  };

  const setNotificationToggle = (key: string, value: boolean) => {
    if (!draft) return;
    const next: SettingsItem = {
      ...draft,
      notifications: {
        ...(draft.notifications || {}),
        [key]: value,
      },
    };
    setDraft(next);

    saveMutation.mutate(next, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["settings"] });
      },
    });
  };

  const onChangePassword = () => {
    const { currentPassword, newPassword, confirmNewPassword } = passwordDraft;

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      Alert.alert("Missing fields", "Please fill all password fields.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      Alert.alert("Password mismatch", "New password and confirm password do not match.");
      return;
    }

    changePasswordMutation.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          setPasswordDraft({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
          Alert.alert("Password updated", "Please use the new password next time you log in.");
        },
        onError: (err) => {
          const errMsg = err instanceof Error ? err.message : "Something went wrong";
          Alert.alert("Failed to change password", errMsg);
        },
      }
    );
  };

  const handleAvatarPicker = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission Denied", "Media library access permissions are required.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];

    if (asset.fileSize && asset.fileSize > MAX_AVATAR_BYTES) {
      Alert.alert("File too large", "Please select an image up to 10MB.");
      return;
    }

    const targetUri = asset.uri;
    const filename = targetUri.split("/").pop() || "avatar.jpg";
    const type = asset.mimeType || "image/jpeg";

    setDraft((prev: any) => ({ ...prev, avatarUrl: targetUri }));

    avatarUploadMutation.mutate(
      { uri: targetUri, name: filename, type },
      {
        onSuccess: (data) => {
          const newAvatarUrl = data.avatarDataUrl || data.avatarUrl;
          queryClient.invalidateQueries({ queryKey: ["settings"] });
          Alert.alert("Uploaded", "Profile picture updated successfully.");
          if (newAvatarUrl) {
            setDraft((prev: any) => ({ ...prev, avatarUrl: newAvatarUrl }));
          }
        },
        onError: (err) => {
          const msg = err instanceof Error ? err.message : "Failed to upload image";
          Alert.alert("Upload failed", msg);
        },
      }
    );
  };

  const initials = useMemo(() => {
    return draft?.fullName
      ?.split(" ")
      .filter(Boolean)
      .map((n: string) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "M";
  }, [draft?.fullName]);

  if (settingsQuery.isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.loadingText}>Loading Configuration...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.viewport} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          
          <View style={styles.headerBlock}>
            <Text style={styles.pageTitle}>Settings</Text>
            <Text style={styles.pageSubtitle}>Manage your account and preferences</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.iconWrapper}>
                <User size={18} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.cardTitleText}>Profile Settings</Text>
                <Text style={styles.avatarMetaSecondary}>Update your personal information</Text>
              </View>
            </View>

            <View style={styles.avatarUploadContainer}>
              <View style={styles.avatarWrapper}>
                {resolvedAvatarUri ? (
                  <Image
                    source={{ uri: resolvedAvatarUri }}
                    style={styles.avatarFrame}
                    onError={(e) => console.warn("Settings Avatar load error:", e.nativeEvent.error, "URI:", resolvedAvatarUri)}
                  />
                ) : (
                  <View style={[styles.avatarFrame, styles.avatarFallback]}>
                    <Text style={styles.avatarFallbackText}>{initials}</Text>
                  </View>
                )}
                <TouchableOpacity style={styles.cameraBadge} onPress={handleAvatarPicker} disabled={avatarUploadMutation.isPending}>
                  {avatarUploadMutation.isPending ? (
                    <ActivityIndicator size="small" color={colors.inputBg} />
                  ) : (
                    <Camera size={14} color={colors.inputBg} />
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.avatarMetaBlock}>
                <Text style={styles.avatarMetaPrimary}>Profile Picture</Text>
                <Text style={styles.avatarMetaSecondary}>Click the camera icon to upload a new photo</Text>
                <Text style={styles.avatarMetaSizeInfo}>Max size: 10MB (JPEG, PNG, GIF)</Text>
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Full Name</Text>
                <TextInput
                  style={styles.formInput}
                  value={draft?.fullName ?? ""}
                  onChangeText={(t) => setDraft((prev: any) => ({ ...prev, fullName: t }))}
                  placeholderTextColor={colors.textSecondary}
                  autoCorrect={false}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Email Address</Text>
                <TextInput
                  style={styles.formInput}
                  value={draft?.email ?? ""}
                  onChangeText={(t) => setDraft((prev: any) => ({ ...prev, email: t }))}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor={colors.textSecondary}
                  autoCorrect={false}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Phone Number</Text>
                <TextInput
                  style={styles.formInput}
                  value={draft?.phone ?? ""}
                  onChangeText={(t) => setDraft((prev: any) => ({ ...prev, phone: t }))}
                  keyboardType="phone-pad"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Role</Text>
                <TextInput
                  style={[styles.formInput, styles.formInputDisabled]}
                  value={draft?.role ?? ""}
                  editable={false}
                />
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.iconWrapper}>
                <Bell size={18} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.cardTitleText}>Notification Settings</Text>
                <Text style={styles.avatarMetaSecondary}>Configure your email and alert preferences</Text>
              </View>
            </View>

            <View style={{ gap: 4 }}>
              <View style={styles.toggleStrip}>
                <View style={styles.toggleMetaArea}>
                  <Text style={styles.toggleLabelText}>Email Notifications</Text>
                  <Text style={styles.toggleSubtitleText}>Receive daily system update emails</Text>
                </View>
                <Switch
                  value={Boolean(draft?.notifications?.emailNotifications ?? draft?.emailPreferences?.emailNotifications)}
                  onValueChange={(val) => {
                    setNotificationToggle("emailNotifications", val);
                    setPreference("email", "emailNotifications", val);
                  }}
                  trackColor={{ true: colors.primary }}
                />
              </View>

              <View style={styles.toggleStrip}>
                <View style={styles.toggleMetaArea}>
                  <Text style={styles.toggleLabelText}>Task Alerts</Text>
                  <Text style={styles.toggleSubtitleText}>Receive real-time alerts when tasks are updated</Text>
                </View>
                <Switch
                  value={Boolean(draft?.notifications?.taskAlerts ?? draft?.webPreferences?.taskAlerts)}
                  onValueChange={(val) => {
                    setNotificationToggle("taskAlerts", val);
                    setPreference("web", "taskAlerts", val);
                  }}
                  trackColor={{ true: colors.primary }}
                />
              </View>

              <View style={styles.toggleStrip}>
                <View style={styles.toggleMetaArea}>
                  <Text style={styles.toggleLabelText}>Employee Updates</Text>
                  <Text style={styles.toggleSubtitleText}>Get notified when employees check in/out</Text>
                </View>
                <Switch
                  value={Boolean(draft?.notifications?.employeeUpdates ?? draft?.webPreferences?.employeeUpdates)}
                  onValueChange={(val) => {
                    setNotificationToggle("employeeUpdates", val);
                    setPreference("web", "employeeUpdates", val);
                  }}
                  trackColor={{ true: colors.primary }}
                />
              </View>

              <View style={[styles.toggleStrip, { borderBottomWidth: 0 }]}>
                <View style={styles.toggleMetaArea}>
                  <Text style={styles.toggleLabelText}>Weekly Reports</Text>
                  <Text style={styles.toggleSubtitleText}>Receive a summary report at the end of the week</Text>
                </View>
                <Switch
                  value={Boolean(draft?.notifications?.weeklyReports ?? draft?.emailPreferences?.weeklyReports)}
                  onValueChange={(val) => {
                    setNotificationToggle("weeklyReports", val);
                    setPreference("email", "weeklyReports", val);
                  }}
                  trackColor={{ true: colors.primary }}
                />
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.iconWrapper}>
                <Shield size={18} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.cardTitleText}>Security</Text>
                <Text style={styles.avatarMetaSecondary}>Manage your security preferences</Text>
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Current Password</Text>
                <TextInput
                  style={styles.formInput}
                  secureTextEntry
                  placeholder="••••••••"
                  placeholderTextColor={colors.textSecondary}
                  value={passwordDraft.currentPassword}
                  onChangeText={(t) => setPasswordDraft(p => ({ ...p, currentPassword: t }))}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>New Password</Text>
                <TextInput
                  style={styles.formInput}
                  secureTextEntry
                  placeholder="••••••••"
                  placeholderTextColor={colors.textSecondary}
                  value={passwordDraft.newPassword}
                  onChangeText={(t) => setPasswordDraft(p => ({ ...p, newPassword: t }))}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Confirm New Password</Text>
                <TextInput
                  style={styles.formInput}
                  secureTextEntry
                  placeholder="••••••••"
                  placeholderTextColor={colors.textSecondary}
                  value={passwordDraft.confirmNewPassword}
                  onChangeText={(t) => setPasswordDraft(p => ({ ...p, confirmNewPassword: t }))}
                  autoCapitalize="none"
                />
              </View>

              <View style={{ width: "100%" }}>
                <TouchableOpacity style={styles.securityActionBtn} onPress={onChangePassword} disabled={changePasswordMutation.isPending}>
                  <Text style={styles.securityActionBtnText}>Change Password</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.submitGlobalBtn} onPress={onSave} disabled={saveMutation.isPending || settingsQuery.isLoading}>
            {saveMutation.isPending ? (
              <ActivityIndicator size="small" color={colors.inputBg} />
            ) : (
              <>
                <Save size={16} color={colors.inputBg} />
                <Text style={styles.submitGlobalBtnText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}