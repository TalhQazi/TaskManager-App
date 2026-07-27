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
  Platform
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, Shield, Save, Camera, Bell } from "lucide-react-native";
import { apiFetch } from "@/lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";
import { s } from "@/util/styles";

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
  language?: string;
  timezone?: string;
}

function buildColors(uiTheme: any) {
  const isDark = uiTheme.theme !== "crystal-white";
  return {
    background:      uiTheme.panelColors?.dashboardBackground     || (isDark ? "#09090b" : "#ffffff"),
    cardBg:          uiTheme.panelColors?.dashboardCardBackground || (isDark ? "#141517" : "#f8fafc"),
    text:            uiTheme.panelColors?.dashboardTextColor      || (isDark ? "#f8fafc" : "#000000"),
    textSecondary:   isDark ? "#a1a1aa" : "#475569",
    border:          isDark ? "#27272a" : "rgba(0, 0, 0, 0.08)",
    primary:         uiTheme.customColors?.primary                || "#ffd27a",
    inputBg:         isDark ? "#09090b" : "#ffffff",
    disabledBg:      isDark ? "#18181b" : "#f1f5f9",
    disabledText:    isDark ? "#52525b" : "#94a3b8",
    avatarFallback:  isDark ? "#27272a" : "#e2e8f0"
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
      marginTop: 10,
      color: colors.textSecondary,
      fontSize: 14,
    },
    scrollContainer: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 40,
    },
    headerBlock: {
      marginBottom: 24,
    },
    pageTitle: {
      fontSize: 26,
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
      padding: 16,
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
      flexDirection: "row",
      alignItems: "center",
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
      padding: 6,
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
      gap: 14,
    },
    formGroup: {
      width: "100%",
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
      height: 40,
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
      paddingVertical: 8,
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
      paddingVertical: 10,
      paddingHorizontal: 16,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 8,
      alignSelf: "flex-start",
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
      height: 44,
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginTop: 4,
    },
    submitGlobalBtnText: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.inputBg,
    },
  });
}

export default function Settings() {
  const { uiTheme } = useTheme();
  const colors = useMemo(() => buildColors(uiTheme), [uiTheme]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const queryClient = useQueryClient();

  const [draft, setDraft] = useState<SettingsItem | null>(null);
  const [passwordDraft, setPasswordDraft] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });

  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const res = await apiFetch<{ item: SettingsItem }>("/api/settings");
      return res.item;
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
    mutationFn: async (payload: any) => {
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
    if (settingsQuery.data) {
      setDraft(settingsQuery.data);
    }
  }, [settingsQuery.data]);

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
          setDraft(res.item);
        }
        queryClient.invalidateQueries({ queryKey: ["settings"] });
        Alert.alert("Saved", "Settings updated.");
      },
      borderColor: () => {
        Alert.alert("Error", "Failed to finalize structural settings update.");
      },
    });
  };

  const setNotification = (key: string, value: boolean) => {
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

    const targetUri = asset.uri;
    const filename = targetUri.split("/").pop() || "avatar.jpg";
    const type = asset.mimeType || "image/jpeg";

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
      <View style={s(styles.centered)}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={s(styles.loadingText)}>Loading Configuration...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={s(styles.viewport)} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s(styles.scrollContainer)} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          
          <View style={s(styles.headerBlock)}>
            <Text style={s(styles.pageTitle)}>Settings</Text>
            <Text style={s(styles.pageSubtitle)}>Manage your account and preferences</Text>
          </View>

          <View style={s(styles.card)}>
            <View style={{ display: "none" }}>
              <Text>Profile Settings Update your personal information</Text>
            </View>
            <View style={s(styles.cardHeader)}>
              <View style={s(styles.iconWrapper)}>
                <User size={18} color={colors.primary} />
              </View>
              <View>
                <Text style={s(styles.cardTitleText)}>Profile Settings</Text>
                <Text style={s(styles.avatarMetaSecondary)}>Update your personal information</Text>
              </View>
            </View>

            <View style={s(styles.avatarUploadContainer)}>
              <View style={s(styles.avatarWrapper)}>
                {draft?.avatarUrl ? (
                  <Image source={{ uri: draft.avatarUrl }} style={s(styles.avatarFrame)} />
                ) : (
                  <View style={s([styles.avatarFrame, styles.avatarFallback])}>
                    <Text style={s(styles.avatarFallbackText)}>{initials}</Text>
                  </View>
                )}
                <TouchableOpacity style={s(styles.cameraBadge)} onPress={handleAvatarPicker} disabled={avatarUploadMutation.isPending}>
                  {avatarUploadMutation.isPending ? (
                    <ActivityIndicator size="small" color={colors.inputBg} />
                  ) : (
                    <Camera size={12} color={colors.inputBg} />
                  )}
                </TouchableOpacity>
              </View>

              <View style={s(styles.avatarMetaBlock)}>
                <Text style={s(styles.avatarMetaPrimary)}>Profile Picture</Text>
                <Text style={s(styles.avatarMetaSecondary)}>Click the camera icon to upload a new photo</Text>
                <Text style={s(styles.avatarMetaSizeInfo)}>Max size: 10MB (JPEG, PNG, GIF)</Text>
              </View>
            </View>

            <View style={s(styles.formRow)}>
              <View style={s(styles.formGroup)}>
                <Text style={s(styles.formLabel)}>Full Name</Text>
                <TextInput
                  style={s(styles.formInput)}
                  value={draft?.fullName ?? ""}
                  onChangeText={(t) => setDraft((prev: any) => ({ ...prev, fullName: t }))}
                  placeholderTextColor={colors.textSecondary}
                  autoCorrect={false}
                />
              </View>

              <View style={s(styles.formGroup)}>
                <Text style={s(styles.formLabel)}>Email Address</Text>
                <TextInput
                  style={s(styles.formInput)}
                  value={draft?.email ?? ""}
                  onChangeText={(t) => setDraft((prev: any) => ({ ...prev, email: t }))}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor={colors.textSecondary}
                  autoCorrect={false}
                />
              </View>

              <View style={s(styles.formGroup)}>
                <Text style={s(styles.formLabel)}>Phone Number</Text>
                <TextInput
                  style={s(styles.formInput)}
                  value={draft?.phone ?? ""}
                  onChangeText={(t) => setDraft((prev: any) => ({ ...prev, phone: t }))}
                  keyboardType="phone-pad"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={s(styles.formGroup)}>
                <Text style={s(styles.formLabel)}>Role</Text>
                <TextInput
                  style={s([styles.formInput, styles.formInputDisabled])}
                  value={draft?.role ?? ""}
                  editable={false}
                />
              </View>
            </View>
          </View>

          <View style={s(styles.card)}>
            <View style={{ display: "none" }}>
              <Text>Notification Settings Configure your email and alert preferences</Text>
            </View>
            <View style={s(styles.cardHeader)}>
              <View style={s(styles.iconWrapper)}>
                <Bell size={18} color={colors.primary} />
              </View>
              <View>
                <Text style={s(styles.cardTitleText)}>Notification Settings</Text>
                <Text style={s(styles.avatarMetaSecondary)}>Configure your email and alert preferences</Text>
              </View>
            </View>

            <View style={{ gap: 12 }}>
              <View style={s(styles.toggleStrip)}>
                <View style={s(styles.toggleMetaArea)}>
                  <Text style={s(styles.toggleLabelText)}>Email Notifications</Text>
                  <Text style={s(styles.toggleSubtitleText)}>Receive daily system update emails</Text>
                </View>
                <Switch
                  value={Boolean(draft?.notifications?.emailNotifications)}
                  onValueChange={(val) => setNotification("emailNotifications", val)}
                  trackColor={{ true: colors.primary }}
                />
              </View>

              <View style={s(styles.toggleStrip)}>
                <View style={s(styles.toggleMetaArea)}>
                  <Text style={s(styles.toggleLabelText)}>Task Alerts</Text>
                  <Text style={s(styles.toggleSubtitleText)}>Receive real-time alerts when tasks are updated</Text>
                </View>
                <Switch
                  value={Boolean(draft?.notifications?.taskAlerts)}
                  onValueChange={(val) => setNotification("taskAlerts", val)}
                  trackColor={{ true: colors.primary }}
                />
              </View>

              <View style={s(styles.toggleStrip)}>
                <View style={s(styles.toggleMetaArea)}>
                  <Text style={s(styles.toggleLabelText)}>Employee Updates</Text>
                  <Text style={s(styles.toggleSubtitleText)}>Get notified when employees check in/out</Text>
                </View>
                <Switch
                  value={Boolean(draft?.notifications?.employeeUpdates)}
                  onValueChange={(val) => setNotification("employeeUpdates", val)}
                  trackColor={{ true: colors.primary }}
                />
              </View>

              <View style={s(styles.toggleStrip)}>
                <View style={s(styles.toggleMetaArea)}>
                  <Text style={s(styles.toggleLabelText)}>Weekly Reports</Text>
                  <Text style={s(styles.toggleSubtitleText)}>Receive a summary report at the end of the week</Text>
                </View>
                <Switch
                  value={Boolean(draft?.notifications?.weeklyReports)}
                  onValueChange={(val) => setNotification("weeklyReports", val)}
                  trackColor={{ true: colors.primary }}
                />
              </View>
            </View>
          </View>

          <View style={s(styles.card)}>
            <View style={{ display: "none" }}>
              <Text>Security Manage your security preferences</Text>
            </View>
            <View style={s(styles.cardHeader)}>
              <View style={s(styles.iconWrapper)}>
                <Shield size={18} color={colors.primary} />
              </View>
              <View>
                <Text style={s(styles.cardTitleText)}>Security</Text>
                <Text style={s(styles.avatarMetaSecondary)}>Manage your security preferences</Text>
              </View>
            </View>

            <View style={s(styles.formRow)}>
              <View style={s(styles.formGroup)}>
                <Text style={s(styles.formLabel)}>Current Password</Text>
                <TextInput
                  style={s(styles.formInput)}
                  secureTextEntry
                  placeholder="••••••••"
                  placeholderTextColor={colors.textSecondary}
                  value={passwordDraft.currentPassword}
                  onChangeText={(t) => setPasswordDraft(p => ({ ...p, currentPassword: t }))}
                  autoCapitalize="none"
                />
              </View>

              <View style={s(styles.formGroup)}>
                <Text style={s(styles.formLabel)}>New Password</Text>
                <TextInput
                  style={s(styles.formInput)}
                  secureTextEntry
                  placeholder="••••••••"
                  placeholderTextColor={colors.textSecondary}
                  value={passwordDraft.newPassword}
                  onChangeText={(t) => setPasswordDraft(p => ({ ...p, newPassword: t }))}
                  autoCapitalize="none"
                />
              </View>

              <View style={s(styles.formGroup)}>
                <Text style={s(styles.formLabel)}>Confirm New Password</Text>
                <TextInput
                  style={s(styles.formInput)}
                  secureTextEntry
                  placeholder="••••••••"
                  placeholderTextColor={colors.textSecondary}
                  value={passwordDraft.confirmNewPassword}
                  onChangeText={(t) => setPasswordDraft(p => ({ ...p, confirmNewPassword: t }))}
                  autoCapitalize="none"
                />
              </View>

              <TouchableOpacity style={s(styles.securityActionBtn)} onPress={onChangePassword} disabled={changePasswordMutation.isPending}>
                <Text style={s(styles.securityActionBtnText)}>Change Password</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={s(styles.submitGlobalBtn)} onPress={onSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? (
              <ActivityIndicator size="small" color={colors.inputBg} />
            ) : (
              <>
                <Save size={16} color={colors.inputBg} />
                <Text style={s(styles.submitGlobalBtnText)}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}