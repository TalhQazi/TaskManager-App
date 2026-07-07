import React, { useEffect, useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import {
  Camera,
  User,
  Upload,
  FileImage,
  Image as ImageIcon,
  Quote,
} from "lucide-react-native";

import { apiFetch, toProxiedUrl } from "@/lib/admin/apiClient";
import AssetLibraryPicker from "./AssetLibraryPicker";
import { useTheme } from "@/contexts/ThemeContext";

type UploadStatus = "idle" | "uploading" | "success" | "error";

type AvatarUploadState = {
  status: UploadStatus;
  message: string | null;
};

type SettingsState = {
  companyName: string;
  supportEmail: string;
  timezone: string;
  notificationsEnabled: boolean;
  autoLogoutMinutes: number;
  fullName: string;
  email: string;
  avatarUrl: string;
  rewardSettings: {
    animationsEnabled: boolean;
    hapticsEnabled: boolean;
    soundEnabled: boolean;
  };
};

const SETTINGS_STORAGE_KEY = "app_settings";

const defaultSettings: SettingsState = {
  companyName: "TaskFlow",
  supportEmail: "support@taskflow.com",
  timezone: "UTC+05:00",
  notificationsEnabled: true,
  autoLogoutMinutes: 0,
  fullName: "",
  email: "",
  avatarUrl: "",
  rewardSettings: {
    animationsEnabled: true,
    hapticsEnabled: true,
    soundEnabled: false,
  },
};

export default function Settings() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { uiTheme } = useTheme();
const isDark = useMemo(
    () => ["dark-minimal", "neon-tech", "metallic-elite", "executive-black", "high-contrast", "energy-mode"].includes(uiTheme.theme),
    [uiTheme.theme]
  );
  const colors = useMemo(() => ({
    background: uiTheme?.panelColors?.dashboardBackground || (isDark ? "#0F172A" : "#F8FAFC"),
    cardBg: uiTheme?.panelColors?.dashboardCardBackground || (isDark ? "#1E293B" : "#FFFFFF"),
    text: uiTheme?.panelColors?.dashboardTextColor || (isDark ? "#FFFFFF" : "#0F172A"),
    muted: isDark ? "#94A3B8" : "#64748B",
    border: isDark ? "#334155" : "#E2E8F0",
    primary: uiTheme?.customColors?.primary || "#133767",
    surface: isDark ? "#334155" : "#F1F5F9",
    inputBg: isDark ? "#0F172A" : "#FFFFFF",
    white: "#FFFFFF"
  }), [uiTheme, isDark]);

  const styles = useMemo(() => createStyles(colors), [colors]);
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);

  const [isSaving, setIsSaving] = useState(false);
  const [founderMsgEnabled, setFounderMsgEnabled] = useState(true);
  const [isLoadingFounderPref, setIsLoadingFounderPref] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [avatarUpload, setAvatarUpload] = useState<AvatarUploadState>({
    status: "idle",
    message: null,
  });
  const [passwordDraft, setPasswordDraft] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaving, setPasswordSaving] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const saved = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as Partial<SettingsState>;
          setSettings((prev) => ({
            ...prev,
            ...parsed,
          }));
        }
      } catch (e) {
        console.error(e);
      }
    };
    void loadSettings();
  }, []);

  const backendSettingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      return apiFetch<{
        item: {
          companyName?: string;
          supportEmail?: string;
          timezone?: string;
          notificationsEnabled?: boolean;
          autoLogoutMinutes?: number;
          notifications?: Record<string, boolean>;
          fullName?: string;
          email?: string;
          avatarUrl?: string;
          avatarDataUrl?: string;
          rewardSettings?: SettingsState["rewardSettings"];
        };
      }>("/api/settings");
    },
  });

  useEffect(() => {
    const item = backendSettingsQuery.data?.item;
    if (!item) return;
    setSettings((prev) => ({
      ...prev,
      companyName: item.companyName ?? prev.companyName,
      supportEmail: item.supportEmail ?? prev.supportEmail,
      timezone: item.timezone ?? prev.timezone,
      notificationsEnabled: item.notificationsEnabled ?? prev.notificationsEnabled,
      autoLogoutMinutes: item.autoLogoutMinutes ?? prev.autoLogoutMinutes,
      fullName: item.fullName ?? prev.fullName,
      email: item.email ?? prev.email,
      avatarUrl: item.avatarDataUrl || (item.avatarUrl ? toProxiedUrl(item.avatarUrl) : prev.avatarUrl),
      rewardSettings: item.rewardSettings ?? prev.rewardSettings,
    }));
  }, [backendSettingsQuery.data]);

  const handleAvatarPickAndUpload = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Permission Denied", "You need to allow access to your photos to upload an avatar.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) return;

    const selectedAsset = result.assets[0];

    setAvatarUpload({ status: "uploading", message: "Processing profile picture..." });
    try {
      const manipulated = await ImageManipulator.manipulateAsync(
        selectedAsset.uri,
        [{ resize: { width: 512, height: 512 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );

      setAvatarUpload({ status: "uploading", message: "Profile picture uploading..." });

      const formData = new FormData();
      formData.append("avatar", {
        uri: manipulated.uri,
        name: selectedAsset.fileName || "avatar.jpg",
        type: "image/jpeg",
      } as any);

      const data = await apiFetch<{ avatarDataUrl?: string; avatarUrl?: string }>(
        "/api/settings/avatar",
        {
          method: "POST",
          body: formData,
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (data.avatarDataUrl || data.avatarUrl) {
        const newAvatarUrl = data.avatarDataUrl || (data.avatarUrl ? toProxiedUrl(data.avatarUrl) : "");
        setSettings((prev) => ({ ...prev, avatarUrl: newAvatarUrl }));
        await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ ...settings, avatarUrl: newAvatarUrl }));
        setAvatarUpload({ status: "success", message: "Profile picture uploaded successfully!" });
      } else {
        setAvatarUpload({ status: "error", message: "Failed to upload profile picture." });
      }

      await queryClient.invalidateQueries({ queryKey: ["settings"] });
    } catch (err) {
      console.error(err);
      setAvatarUpload({ status: "error", message: "An error occurred during file upload." });
    } finally {
      setTimeout(() => setAvatarUpload({ status: "idle", message: null }), 4000);
    }
  };

  const saveChanges = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    try {
      await apiFetch("/api/settings", {
        method: "PUT",
        body: JSON.stringify(settings),
      });
      await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
      await queryClient.invalidateQueries({ queryKey: ["settings"] });
      setSaveMessage("Settings saved successfully!");
    } catch (error) {
      setSaveMessage("Failed to save settings. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRewardSettingChange = async (key: string, value: boolean) => {
    const updatedRewards = { ...settings.rewardSettings, [key]: value };
    setSettings((prev) => ({ ...prev, rewardSettings: updatedRewards }));
    try {
      await apiFetch("/api/settings", {
        method: "PUT",
        body: JSON.stringify({ rewardSettings: updatedRewards }),
      });
      await queryClient.invalidateQueries({ queryKey: ["settings"] });
    } catch (e) {
      console.error(e);
    }
  };

  const onChangePassword = async () => {
    if (!passwordDraft.currentPassword || !passwordDraft.newPassword || !passwordDraft.confirmNewPassword) return;
    if (passwordDraft.newPassword !== passwordDraft.confirmNewPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    try {
      setPasswordError(null);
      setPasswordSaving(true);
      await apiFetch("/api/auth/change-password", {
        method: "PUT",
        body: JSON.stringify({
          currentPassword: passwordDraft.currentPassword,
          newPassword: passwordDraft.newPassword,
        }),
      });
      setPasswordDraft({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
      Alert.alert("Success", "Password changed successfully.");
    } catch (e: any) {
      setPasswordError(e?.message || "Failed to change password");
    } finally {
      setPasswordSaving(false);
    }
  };

  useEffect(() => {
    const loadFounderPref = async () => {
      try {
        const res = await apiFetch<{ showFounderMessages: boolean }>("/api/founder-messages/preference");
        setFounderMsgEnabled(res.showFounderMessages !== false);
      } catch (e) {
        console.error(e);
      }
    };
    void loadFounderPref();
  }, []);

  const handleToggleFounderMessages = async () => {
    setIsLoadingFounderPref(true);
    try {
      await apiFetch("/api/founder-messages/preference", {
        method: "PUT",
        body: JSON.stringify({ showFounderMessages: !founderMsgEnabled }),
      });
      setFounderMsgEnabled(!founderMsgEnabled);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingFounderPref(false);
    }
  };

  const initials = settings.fullName?.split(" ").filter(Boolean).map((n) => n[0]).slice(0, 2).join("").toUpperCase() || "A";

  function HeaderCustomizationCard() {
    const [headerSettings, setHeaderSettings] = useState({
      backgroundType: "color" as "color" | "image",
      colorConfig: { from: "#133767", via: "#133767", to: "#133767" },
      imageConfig: { url: "", dataUrl: "", repeat: "no-repeat", size: "cover", position: "center" },
      height: 144,
      overlay: { enabled: true, color: "rgba(0,0,0,0.3)" },
    });
    const [isLibraryPickerOpen, setIsLibraryPickerOpen] = useState(false);

    const handlePickImage = async () => {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
      });
      if (!result.canceled && result.assets) {
        setHeaderSettings(prev => ({
          ...prev,
          backgroundType: "image",
          imageConfig: { ...prev.imageConfig, dataUrl: result.assets[0].uri }
        }));
      }
    };

    return (
      <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        <View style={[styles.cardHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <ImageIcon size={20} color={colors.text} style={{ marginRight: 8 }} />
          <Text style={[styles.cardTitle, { color: colors.text }]}>Customize Header</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={[styles.label, { color: colors.text }]}>Header Background Image</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginVertical: 10 }}>
            <TouchableOpacity style={[styles.outlineButton, { borderColor: colors.border }]} onPress={handlePickImage}>
              <Upload size={16} color={colors.text} style={{ marginRight: 6 }} />
              <Text style={[styles.outlineButtonText, { color: colors.text }]}>Upload Image</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.outlineButton, { borderColor: colors.primary }]} onPress={() => setIsLibraryPickerOpen(true)}>
              <FileImage size={16} color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={[styles.outlineButtonText, { color: colors.primary }]}>From Library</Text>
            </TouchableOpacity>
          </View>

          {headerSettings.imageConfig.dataUrl ? (
            <Image source={{ uri: headerSettings.imageConfig.dataUrl }} style={styles.headerPreviewImg} />
          ) : (
            <View style={[styles.placeholderBox, { borderColor: colors.border }]}>
              <Text style={[styles.mutedText, { color: colors.muted }]}>No image uploaded. Gradient color active.</Text>
            </View>
          )}

          <AssetLibraryPicker
            open={isLibraryPickerOpen}
            onOpenChange={setIsLibraryPickerOpen}
            onSelect={(url: string) => {
              setHeaderSettings(prev => ({ ...prev, backgroundType: "image", imageConfig: { ...prev.imageConfig, dataUrl: url } }));
              setIsLibraryPickerOpen(false);
            }}
          />
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.scrollContent}>
      <View style={styles.pageHeader}>
        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>Configure system-wide settings and preferences.</Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        <View style={[styles.cardHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <User size={20} color={colors.text} style={{ marginRight: 8 }} />
          <Text style={[styles.cardTitle, { color: colors.text }]}>Profile</Text>
        </View>
        <View style={styles.cardContent}>
          <View style={styles.avatarRow}>
            <View style={styles.avatarWrapper}>
              {settings.avatarUrl && avatarUpload.status !== "uploading" ? (
                <Image source={{ uri: settings.avatarUrl }} style={styles.avatarImage} />
              ) : (
                <View style={[styles.avatarFallback, { backgroundColor: colors.surface }]}>
                  {avatarUpload.status === "uploading" ? <ActivityIndicator color={colors.primary} /> : <Text style={[styles.avatarFallbackText, { color: colors.text }]}>{initials}</Text>}
                </View>
              )}
              <TouchableOpacity style={[styles.cameraButton, { backgroundColor: colors.primary }]} onPress={handleAvatarPickAndUpload} disabled={avatarUpload.status === "uploading"}>
                <Camera size={14} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: colors.text }]}>Profile Picture</Text>
              <Text style={[styles.mutedText, { color: colors.muted }]}>Tap the camera icon to pick an image.</Text>
            </View>
          </View>

          {avatarUpload.message && (
            <View style={[styles.alertBanner, avatarUpload.status === "success" ? styles.alertSuccess : styles.alertError]}>
              <Text style={avatarUpload.status === "success" ? styles.successText : styles.errorText}>{avatarUpload.message}</Text>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>Full Name</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]} value={settings.fullName} onChangeText={(text) => setSettings({ ...settings, fullName: text })} placeholderTextColor={colors.muted} />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>Email</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]} keyboardType="email-address" autoCapitalize="none" value={settings.email} onChangeText={(text) => setSettings({ ...settings, email: text })} placeholderTextColor={colors.muted} />
          </View>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        <View style={[styles.cardHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Quote size={20} color={colors.text} style={{ marginRight: 8 }} />
          <Text style={[styles.cardTitle, { color: colors.text }]}>Preferences</Text>
        </View>
        <View style={styles.cardContent}>
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: colors.text }]}>Founder Messages</Text>
              <Text style={[styles.mutedText, { color: colors.muted }]}>Show motivational messages on the dashboard</Text>
            </View>
            {isLoadingFounderPref ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Switch value={founderMsgEnabled} onValueChange={handleToggleFounderMessages} trackColor={{ true: colors.primary }} />
            )}
          </View>
        </View>
      </View>

      <HeaderCustomizationCard />

      <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        <View style={[styles.cardHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Security</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={[styles.label, { color: colors.text, marginBottom: 12 }]}>Change Password</Text>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>Current Password</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]} secureTextEntry value={passwordDraft.currentPassword} onChangeText={(txt) => setPasswordDraft(p => ({ ...p, currentPassword: txt }))} placeholderTextColor={colors.muted} />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>New Password</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]} secureTextEntry value={passwordDraft.newPassword} onChangeText={(txt) => setPasswordDraft(p => ({ ...p, newPassword: txt }))} placeholderTextColor={colors.muted} />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>Confirm New Password</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]} secureTextEntry value={passwordDraft.confirmNewPassword} onChangeText={(txt) => setPasswordDraft(p => ({ ...p, confirmNewPassword: txt }))} placeholderTextColor={colors.muted} />
          </View>

          {passwordError && (
            <View style={[styles.alertBanner, styles.alertError]}>
              <Text style={styles.errorText}>{passwordError}</Text>
            </View>
          )}

          <TouchableOpacity 
            style={[styles.outlineButton, { alignSelf: 'flex-end', marginTop: 10, borderColor: colors.border }]} 
            onPress={onChangePassword}
            disabled={passwordSaving || !passwordDraft.currentPassword || !passwordDraft.newPassword}
          >
            <Text style={[styles.outlineButtonText, { color: colors.text }]}>{passwordSaving ? "Saving..." : "Change Password"}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        <View style={[styles.cardHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Productivity Feedback</Text>
        </View>
        <View style={styles.cardContent}>
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: colors.text }]}>Task Completion Animations</Text>
              <Text style={[styles.mutedText, { color: colors.muted }]}>Visual layout feedback when completing tasks</Text>
            </View>
            <Switch value={settings.rewardSettings.animationsEnabled} onValueChange={(val) => handleRewardSettingChange("animationsEnabled", val)} trackColor={{ true: colors.primary }} />
          </View>

          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: colors.text }]}>Haptic Feedback</Text>
              <Text style={[styles.mutedText, { color: colors.muted }]}>Device engine physical haptic vibrations</Text>
            </View>
            <Switch value={settings.rewardSettings.hapticsEnabled} onValueChange={(val) => handleRewardSettingChange("hapticsEnabled", val)} trackColor={{ true: colors.primary }} />
          </View>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        <View style={[styles.cardHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Data Migration</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={[styles.mutedText, { color: colors.muted }]}>Import infrastructure systems from standard channels.</Text>
          <TouchableOpacity style={[styles.outlineButton, { marginTop: 12, alignSelf: 'flex-start', borderColor: colors.border }]} onPress={() => router.push("/admin/asana-import")}>
            <Text style={[styles.outlineButtonText, { color: colors.text }]}>Import from Asana</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.actionFooter, { borderColor: colors.border }]}>
        {saveMessage && (
          <Text style={[styles.saveResponseText, saveMessage.includes("success") ? styles.successText : styles.errorText]}>
            {saveMessage}
          </Text>
        )}
        <View style={styles.rowActions}>
          <TouchableOpacity style={[styles.secondaryBtn, { backgroundColor: colors.surface }]} onPress={() => setSaveMessage("Changes discarded")}>
            <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Reset</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.primary }]} onPress={saveChanges} disabled={isSaving}>
            <Text style={styles.primaryBtnText}>{isSaving ? "Saving..." : "Save Changes"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 40,
    },
    pageHeader: {
      marginBottom: 20,
    },
    title: {
      fontSize: 24,
      fontWeight: "700",
    },
    subtitle: {
      fontSize: 14,
      marginTop: 4,
    },
    card: {
      borderRadius: 8,
      borderWidth: 1,
      marginBottom: 16,
      overflow: "hidden",
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: "600",
    },
    cardContent: {
      padding: 16,
    },
    avatarRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
      marginBottom: 16,
    },
    avatarWrapper: {
      position: "relative",
    },
    avatarImage: {
      width: 72,
      height: 72,
      borderRadius: 36,
    },
    avatarFallback: {
      width: 72,
      height: 72,
      borderRadius: 36,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarFallbackText: {
      fontSize: 22,
      fontWeight: "600",
    },
    cameraButton: {
      position: "absolute",
      bottom: -2,
      right: -2,
      padding: 6,
      borderRadius: 12,
    },
    label: {
      fontSize: 14,
      fontWeight: "500",
    },
    fieldLabel: {
      fontSize: 13,
      fontWeight: "500",
      marginBottom: 4,
    },
    mutedText: {
      fontSize: 12,
    },
    inputGroup: {
      marginBottom: 12,
    },
    input: {
      borderWidth: 1,
      borderRadius: 6,
      paddingHorizontal: 12,
      height: 40,
      fontSize: 14,
    },
    switchRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 8,
    },
    outlineButton: {
      borderWidth: 1,
      borderRadius: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },
    outlineButtonText: {
      fontSize: 13,
      fontWeight: "500",
    },
    headerPreviewImg: {
      width: "100%",
      height: 100,
      borderRadius: 6,
      marginTop: 10,
    },
    placeholderBox: {
      width: "100%",
      height: 60,
      borderWidth: 1,
      borderStyle: "dashed",
      borderRadius: 6,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 10,
    },
    alertBanner: {
      padding: 10,
      borderRadius: 6,
      marginVertical: 10,
    },
    alertSuccess: {
      backgroundColor: "#f0fdf4",
      borderWidth: 1,
      borderColor: "#bbf7d0",
    },
    alertError: {
      backgroundColor: "#fef2f2",
      borderWidth: 1,
      borderColor: "#fecaca",
    },
    successText: {
      color: "#166534",
      fontSize: 12,
    },
    errorText: {
      color: "#991b1b",
      fontSize: 12,
    },
    actionFooter: {
      borderTopWidth: 1,
      paddingTop: 16,
      marginTop: 10,
    },
    saveResponseText: {
      fontSize: 13,
      marginBottom: 8,
      textAlign: "right",
    },
    rowActions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 12,
    },
    primaryBtn: {
      borderRadius: 6,
      paddingHorizontal: 16,
      paddingVertical: 10,
      minWidth: 100,
      alignItems: "center",
    },
    primaryBtnText: {
      color: "#ffffff",
      fontWeight: "600",
      fontSize: 14,
    },
    secondaryBtn: {
      borderRadius: 6,
      paddingHorizontal: 16,
      paddingVertical: 10,
      alignItems: "center",
    },
    secondaryBtnText: {
      fontWeight: "500",
      fontSize: 14,
    },
  });
}