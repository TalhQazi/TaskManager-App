import React, { useEffect, useState, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { User, Shield, Save, Camera, CheckCircle } from "lucide-react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { apiFetch, toProxiedUrl } from "@/lib/admin/apiClient";

type SettingsItem = {
  fullName: string;
  email: string;
  phone: string;
  role: string;
  avatarUrl?: string;
  avatarDataUrl?: string;
};

export default function Settings() {
  const queryClient = useQueryClient();

  // Queries & Mutations
  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      return apiFetch<{ item: SettingsItem }>("/api/settings");
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiFetch<{ item: any }>("/api/settings", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (payload: { currentPassword: string; newPassword: string }) => {
      return apiFetch<{ ok: true }>("/api/auth/change-password", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    },
  });

  const avatarUploadMutation = useMutation({
    mutationFn: async (imageUri: string) => {
      const formData = new FormData();
      // Format file wrapper matching native standards
      formData.append("avatar", {
        uri: Platform.OS === "ios" ? imageUri.replace("file://", "") : imageUri,
        name: "avatar.jpg",
        type: "image/jpeg",
      } as any);

      return apiFetch<{ avatarDataUrl?: string; avatarUrl?: string }>("/api/settings/avatar", {
        method: "POST",
        body: formData,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
    },
  });

  // Local State Managed Drafts
  const [draft, setDraft] = useState<any>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [passwordDraft, setPasswordDraft] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });

  useEffect(() => {
    if (!draft && settingsQuery.data?.item) {
      const item = settingsQuery.data.item;
      setDraft({
        ...item,
        avatarUrl: item.avatarDataUrl || (item.avatarUrl ? toProxiedUrl(item.avatarUrl) : "") || "",
      });
    }
  }, [settingsQuery.data, draft]);

  // Actions
  const onSaveProfile = () => {
    if (!draft) return;

    const payload = {
      ...draft,
      avatarDataUrl: draft.avatarUrl || "",
      avatarUrl: "",
    };

    saveMutation.mutate(payload, {
      onSuccess: (res) => {
        const item = (res as any)?.item as SettingsItem | undefined;
        if (item) {
          setDraft({
            ...item,
            avatarUrl: item.avatarDataUrl || item.avatarUrl || "",
          });
        }
        void queryClient.invalidateQueries({ queryKey: ["settings"] });
        Alert.alert("Success", "Account settings updated successfully.");
      },
      borderColor: "rgba(239, 68, 68, 0.3)",
      onError: (err) => {
        Alert.alert("Failed to Save", err instanceof Error ? err.message : "Something went wrong");
      },
    });
  };

  const handleAvatarPicker = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert("Permission Required", "Application access to camera roll is required to update avatars.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true, // Native UI interface crop tools handles aspect ratios
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]?.uri) return;

    const selectedUri = result.assets[0].uri;

    try {
      setAvatarUploading(true);
      avatarUploadMutation.mutate(selectedUri, {
        onSuccess: (data) => {
          const newAvatarUrl = data.avatarDataUrl || data.avatarUrl;
          void queryClient.invalidateQueries({ queryKey: ["settings"] });
          if (newAvatarUrl) {
            setDraft((p: any) => ({ ...p, avatarUrl: toProxiedUrl(newAvatarUrl) || newAvatarUrl }));
          }
          Alert.alert("Success", "Profile picture updated successfully.");
        },
        onError: (err) => {
          Alert.alert("Upload Failed", err instanceof Error ? err.message : "Failed to upload image");
        },
        onSettled: () => {
          setAvatarUploading(false);
        },
      });
    } catch (e) {
      setAvatarUploading(false);
      Alert.alert("Error", "Failed to process photo adjustment updates.");
    }
  };

  const onChangePassword = () => {
    const { currentPassword, newPassword, confirmNewPassword } = passwordDraft;

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      Alert.alert("Missing Fields", "Please complete all active authentication fields.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      Alert.alert("Mismatch", "New password options do not resolve symmetrically.");
      return;
    }

    changePasswordMutation.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          setPasswordDraft({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
          Alert.alert("Password Updated", "Your new authorization settings have been saved.");
        },
        onError: (err) => {
          Alert.alert("Update Failed", err instanceof Error ? err.message : "Failed to change password.");
        },
      }
    );
  };

  // Profile Fallback Computation
  const initials = draft?.fullName
    ?.split(" ")
    .filter(Boolean)
    .map((n: string) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "A";

  if (settingsQuery.isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: "#09090b" }]}>
        <ActivityIndicator size="large" color="#ffd27a" />
        <Text style={styles.loadingText}>Loading Admin Profile...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#09090b" }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView style={styles.screenContainer} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header Block */}
        <View style={styles.headerContainer}>
          <Text style={styles.pageTitle}>Settings</Text>
          <Text style={styles.pageSubtitle}>Manage your admin account and system profile</Text>
        </View>

        {/* PROFILE CARD */}
        <View style={styles.configCard}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.iconWrapper}>
              <User size={18} color="#ffd27a" />
            </View>
            <View>
              <Text style={styles.cardTitle}>Profile Settings</Text>
              <Text style={styles.cardSubtitle}>Update your personal identification</Text>
            </View>
          </View>

          {/* Avatar Interaction Block */}
          <View style={{ display: 'none' }} />{/* Safe separation context helper */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarContainer}>
              {draft?.avatarUrl ? (
                <Image source={{ uri: draft.avatarUrl }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.fallbackText}>{initials}</Text>
                </View>
              )}
              <TouchableOpacity 
                style={styles.cameraButton} 
                onPress={handleAvatarPicker}
                disabled={avatarUploading}
              >
                {avatarUploading ? (
                  <ActivityIndicator size="small" color="#09090b" />
                ) : (
                  <Camera size={14} color="#09090b" />
                )}
              </TouchableOpacity>
            </View>
            
            <View style={styles.avatarMeta}>
              <Text style={styles.metaTitle}>Profile Picture</Text>
              <Text style={styles.metaSubtitle}>Tap the camera indicator matrix to load new images.</Text>
            </View>
          </View>

          {/* Core Profile Matrix Form Fields */}
          <View style={styles.formGroup}>
            <Text style={styles.fieldLabel}>Full Name</Text>
            <TextInput
              style={styles.textInput}
              value={draft?.fullName ?? ""}
              onChangeText={(text) => setDraft((p: any) => ({ ...p, fullName: text }))}
              placeholderTextColor="#52525b"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.fieldLabel}>Email Address</Text>
            <TextInput
              style={styles.textInput}
              value={draft?.email ?? ""}
              onChangeText={(text) => setDraft((p: any) => ({ ...p, email: text }))}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#52525b"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.fieldLabel}>Phone Number</Text>
            <TextInput
              style={styles.textInput}
              value={draft?.phone ?? ""}
              onChangeText={(text) => setDraft((p: any) => ({ ...p, phone: text }))}
              keyboardType="phone-pad"
              placeholderTextColor="#52525b"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.fieldLabel}>System Role</Text>
            <TextInput
              style={[styles.textInput, styles.disabledInput]}
              value={draft?.role ?? "Administrator"}
              editable={false}
            />
          </View>
        </View>

        {/* SECURITY & AUTHENTICATION CARD */}
        <View style={styles.configCard}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.iconWrapper}>
              <Shield size={18} color="#ffd27a" />
            </View>
            <View>
              <Text style={styles.cardTitle}>Security Context</Text>
              <Text style={styles.cardSubtitle}>Manage access parameters and security variables</Text>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.fieldLabel}>Current Password</Text>
            <TextInput
              style={styles.textInput}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor="#52525b"
              value={passwordDraft.currentPassword}
              onChangeText={(text) => setPasswordDraft((p) => ({ ...p, currentPassword: text }))}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.fieldLabel}>New Password</Text>
            <TextInput
              style={styles.textInput}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor="#52525b"
              value={passwordDraft.newPassword}
              onChangeText={(text) => setPasswordDraft((p) => ({ ...p, newPassword: text }))}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.fieldLabel}>Confirm New Password</Text>
            <TextInput
              style={styles.textInput}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor="#52525b"
              value={passwordDraft.confirmNewPassword}
              onChangeText={(text) => setPasswordDraft((p) => ({ ...p, confirmNewPassword: text }))}
            />
          </View>

          <TouchableOpacity 
            style={styles.outlineActionBtn} 
            onPress={onChangePassword}
            disabled={changePasswordMutation.isPending}
          >
            {changePasswordMutation.isPending ? (
              <ActivityIndicator size="small" color="#ffd27a" />
            ) : (
              <Text style={styles.outlineActionText}>Change Password</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* SAVE CORE ALTERATIONS CALL TO ACTION */}
        <TouchableOpacity 
          style={styles.primarySaveBtn} 
          onPress={onSaveProfile}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? (
            <ActivityIndicator size="small" color="#09090b" />
          ) : (
            <>
              <Save size={16} color="#09090b" style={{ marginRight: 6 }} />
              <Text style={styles.primarySaveText}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    color: "#a1a1aa",
    fontSize: 13,
  },
  screenContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  headerContainer: {
    marginTop: 24,
    marginBottom: 20,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#f4f4f5",
    letterSpacing: 0.4,
  },
  pageSubtitle: {
    fontSize: 13,
    color: "#a1a1aa",
    marginTop: 3,
  },
  configCard: {
    backgroundColor: "#121214",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 12,
  },
  iconWrapper: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "rgba(255, 210, 122, 0.1)",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#f4f4f5",
  },
  cardSubtitle: {
    fontSize: 12,
    color: "#a1a1aa",
    marginTop: 1,
  },
  avatarSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 16,
  },
  avatarContainer: {
    position: "relative",
  },
  avatarImage: {
    height: 72,
    width: 72,
    borderRadius: 36,
    borderWidth: 1.5,
    borderColor: "#27272a",
  },
  avatarFallback: {
    height: 72,
    width: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255, 210, 122, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#ffd27a",
  },
  fallbackText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#ffd27a",
  },
  cameraButton: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: "#ffd27a",
    padding: 6,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 4,
  },
  avatarMeta: {
    flex: 1,
  },
  metaTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#f4f4f5",
  },
  metaSubtitle: {
    fontSize: 11,
    color: "#71717a",
    marginTop: 2,
    lineHeight: 15,
  },
  formGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#a1a1aa",
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: "#18181b",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 8,
    height: 42,
    color: "#f4f4f5",
    paddingHorizontal: 12,
    fontSize: 13,
  },
  disabledInput: {
    backgroundColor: "#0d0d0e",
    color: "#71717a",
    borderColor: "#1c1c1f",
  },
  outlineActionBtn: {
    marginTop: 8,
    height: 40,
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  outlineActionText: {
    color: "#ffd27a",
    fontSize: 13,
    fontWeight: "600",
  },
  primarySaveBtn: {
    flexDirection: "row",
    backgroundColor: "#ffd27a",
    borderRadius: 8,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  primarySaveText: {
    color: "#09090b",
    fontSize: 14,
    fontWeight: "700",
  },
});