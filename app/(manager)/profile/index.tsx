import React, { useState, useEffect, useMemo } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Edit2,
  Camera,
  Save,
  X,
  CheckCircle2,
  Clock,
} from "lucide-react-native";
import { apiFetch } from "@/lib/admin/apiClient";
import { toProxiedUrl, initToken } from "@/util/toProxiedUrl";
import { useTheme } from "@/contexts/ThemeContext";
import { s } from "@/util/styles";
import { API_BASE_URL, API_BASE_URL_IMAGE } from "@/services/api";
import { isDarkTheme } from "@/constants/design/presets";

const { width } = Dimensions.get("window");
const BASE_DOMAIN = API_BASE_URL_IMAGE; 

interface ProfileData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  location?: string;
  status?: string;
  avatarUrl?: string;
  role?: string;
  milestoneLevel?: string;
  milestoneLabel?: string;
  department?: string;
  current_status?: string;
}

interface OnboardingData {
  id?: string;
  overallStatus: "not_started" | "in_progress" | "submitted" | "approved" | "rejected";
  personalInfo?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  identityVerification?: {
    idType?: string;
    idNumber?: string;
    idFrontUrl?: string;
    idBackUrl?: string;
    secondaryIdType?: string;
    secondaryIdUrl?: string;
  };
  taxInfo?: {
    ssn?: string;
    taxFilingStatus?: string;
  };
  bankInfo?: {
    bankName?: string;
    accountNumber?: string;
    routingNumber?: string;
  };
  documents?: {
    w4FormUrl?: string;
    handbookSignatureUrl?: string;
  };
}

function buildColors(uiTheme: any) {
  const isDark = isDarkTheme(uiTheme?.theme);
  return {
    background:      uiTheme.panelColors?.dashboardBackground     || (isDark ? "#09090b" : "#ffffff"),
    panelHeader:     uiTheme.panelColors?.dashboardCardBackground || (isDark ? "#141517" : "#f8fafc"),
    cardBg:          uiTheme.panelColors?.dashboardCardBackground || (isDark ? "#141517" : "#f8fafc"),
    text:            uiTheme.panelColors?.dashboardTextColor      || (isDark ? "#f8fafc" : "#000000"),
    textSecondary:   isDark ? "#a1a1aa" : "#475569",
    border:          isDark ? "#27272a" : "rgba(0, 0, 0, 0.08)",
    primary:         uiTheme.customColors?.primary                || "#ffd27a",
    success:         "#16C784",
    warning:         "#F59E0B",
    danger:          "#EF4444",
    tabBg:           isDark ? "#18181b" : "#f4f4f5",
    tabActive:       isDark ? "#27272a" : "#e4e4e7",
    inputBg:         isDark ? "#09090b" : "#ffffff",
    disabledBg:      isDark ? "#18181b" : "#f4f4f5",
    disabledText:    isDark ? "#71717a" : "#94a3b8",
    avatarFallback:  isDark ? "#27272a" : "#e4e4e7",
    cancelBg:        isDark ? "#1c1917" : "#f5f5f4",
    bannerBg:        "rgba(255, 210, 122, 0.05)",
    bannerBorder:    "rgba(255, 210, 122, 0.2)",
    badgeActiveBg:   "rgba(255, 210, 122, 0.1)",
    badgeActiveBdr:  "rgba(255, 210, 122, 0.3)"
  };
}

function createStyles(colors: ReturnType<typeof buildColors>) {
  return StyleSheet.create({
    container: {
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
      marginTop: 8,
      color: colors.textSecondary,
      fontSize: 14,
    },
    scrollContainer: {
      padding: 16,
      paddingBottom: 40,
    },
    titleHeading: {
      fontSize: 26,
      fontWeight: "800",
      color: colors.text,
      letterSpacing: 0.5,
      marginBottom: 20,
    },
    tabContainer: {
      flexDirection: "row",
      backgroundColor: colors.tabBg,
      padding: 4,
      borderRadius: 8,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    tabButton: {
      flex: 1,
      paddingVertical: 10,
      alignItems: "center",
      borderRadius: 6,
    },
    activeTabButton: {
      backgroundColor: colors.tabActive,
    },
    tabText: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: "600",
    },
    activeTabText: {
      color: colors.primary,
      fontWeight: "700",
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
      justifyContent: "space-between",
      alignItems: "center",
      borderBottomWidth: 1,
      borderColor: colors.border,
      paddingBottom: 12,
      marginBottom: 16,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
    },
    cardSubTitle: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 2,
    },
    cardContent: {
      marginTop: 4,
    },
    outlineButton: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
      backgroundColor: colors.background,
    },
    outlineButtonText: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: "600",
    },
    headerActionsRow: {
      flexDirection: "row",
      gap: 8,
    },
    actionCancelBtn: {
      padding: 6,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 6,
      backgroundColor: colors.cancelBg,
    },
    actionSaveBtn: {
      padding: 6,
      borderRadius: 6,
      backgroundColor: colors.primary,
    },
    avatarRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 24,
    },
    avatarWrapper: {
      position: "relative",
      width: 68,
      height: 68,
    },
    avatarImage: {
      width: 68,
      height: 68,
      borderRadius: 34,
      borderWidth: 1,
      borderColor: colors.border,
    },
    avatarFallback: {
      backgroundColor: colors.avatarFallback,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarFallbackText: {
      color: colors.primary,
      fontSize: 22,
      fontWeight: "800",
    },
    cameraBadge: {
      position: "absolute",
      bottom: -2,
      right: -2,
      backgroundColor: colors.primary,
      padding: 6,
      borderRadius: 99,
      borderWidth: 2,
      borderColor: colors.cardBg,
    },
    profileMetaContainer: {
      marginLeft: 16,
      flex: 1,
    },
    profileName: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
    },
    profileEmail: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 1,
    },
    departmentText: {
      fontSize: 11,
      color: colors.primary,
      fontWeight: "600",
      marginTop: 2,
    },
    badgeRow: {
      flexDirection: "row",
      gap: 6,
      marginTop: 6,
    },
    badge: {
      backgroundColor: colors.avatarFallback,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 4,
    },
    badgeText: {
      fontSize: 10,
      color: colors.text,
      fontWeight: "600",
    },
    activeStatusBadge: {
      backgroundColor: colors.badgeActiveBg,
      borderWidth: 0.5,
      borderColor: colors.badgeActiveBdr,
    },
    activeStatusText: {
      fontSize: 10,
      color: colors.primary,
      fontWeight: "700",
      textTransform: "capitalize",
    },
    formGroup: {
      marginBottom: 16,
    },
    label: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: "600",
      marginBottom: 6,
    },
    input: {
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 6,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: colors.text,
      fontSize: 13,
    },
    disabledInput: {
      backgroundColor: colors.disabledBg,
      color: colors.disabledText,
    },
    statusBox: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: colors.disabledBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
      marginBottom: 20,
    },
    statusLayoutRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    statusText: {
      fontSize: 12,
      color: colors.text,
      fontWeight: "600",
      marginLeft: 6,
    },
    statusProgressText: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: "600",
    },
    sectionHeading: {
      fontSize: 11,
      fontWeight: "800",
      color: colors.primary,
      letterSpacing: 0.5,
      textTransform: "uppercase",
      marginTop: 12,
      marginBottom: 12,
      borderBottomWidth: 0.5,
      borderColor: colors.border,
      paddingBottom: 4,
    },
    pickerSelector: {
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 6,
      paddingHorizontal: 12,
      paddingVertical: 12,
    },
    pickerText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: "600",
      textTransform: "capitalize",
    },
    pickerPlaceholder: {
      color: colors.disabledText,
      fontSize: 13,
    },
    fileUploadBtn: {
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderStyle: "dashed",
      borderRadius: 6,
      padding: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    uploadBtnText: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: "600",
    },
    submitButton: {
      backgroundColor: colors.primary,
      borderRadius: 6,
      paddingVertical: 12,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 20,
    },
    submitButtonText: {
      color: colors.inputBg,
      fontSize: 13,
      fontWeight: "800",
    },
    approvedBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: colors.bannerBg,
      borderWidth: 1,
      borderColor: colors.bannerBorder,
      borderRadius: 8,
      padding: 16,
    },
    approvedText: {
      flex: 1,
      fontSize: 13,
      color: colors.text,
      fontWeight: "600",
      lineHeight: 18,
    },
  });
}

export default function Profile() {
  const { uiTheme } = useTheme();
  const colors = useMemo(() => buildColors(uiTheme), [uiTheme]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"personal" | "onboarding">("personal");
  const [tokenReady, setTokenReady] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [editedProfile, setEditedProfile] = useState<ProfileData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submittingOnboarding, setSubmittingOnboarding] = useState(false);
  const [uploadingFields, setUploadingFields] = useState<Record<string, boolean>>({});
  const [secondaryIdType, setSecondaryIdType] = useState("");
  const [avatarLoadError, setAvatarLoadError] = useState(false);

  const [onboardingForm, setOnboardingForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    country: "",
    idType: "",
    idNumber: "",
    ssn: "",
    taxFilingStatus: "",
    bankName: "",
    accountNumber: "",
    routingNumber: "",
  });

  useEffect(() => {
    (async () => {
      try {
        const token = await initToken();
        if (token && typeof token === "string") {
          setAuthToken(token);
        } else {
          // Fallback to AsyncStorage token lookup if initToken doesn't return string directly
          const storedToken =
            (await AsyncStorage.getItem("token")) ||
            (await AsyncStorage.getItem("jwt")) ||
            (await AsyncStorage.getItem("auth_token"));
          if (storedToken) setAuthToken(storedToken);
        }
      } catch (err) {
        console.warn("Failed to load auth token:", err);
      } finally {
        setTokenReady(true);
      }
    })();
  }, []);

  const { data: primaryProfileRes, isLoading: loadingProfile } = useQuery({
    queryKey: ["profileMe"],
    queryFn: () => apiFetch<{ item: ProfileData }>("/api/employees/me"),
  });

  const baseProfile = primaryProfileRes?.item;

  const { data: conversationProfile, isLoading: loadingConvProfile } = useQuery({
    queryKey: ["conversationProfile", baseProfile?.email],
    queryFn: async () => {
      const res = await fetch(`${BASE_DOMAIN}/api/messages/conversations/${baseProfile?.email}`);
      if (!res.ok) throw new Error("Failed to fetch conversations profile");
      return res.json() as Promise<ProfileData>;
    },
    enabled: !!baseProfile?.email,
  });

  const { data: userSettingsRes, isLoading: loadingSettings } = useQuery({
    queryKey: ["settings"],
    queryFn: () => apiFetch<{ item: any }>("/api/settings"),
  });

  const { data: onboardingRes, isLoading: loadingOnboarding } = useQuery({
    queryKey: ["onboardingMe"],
    queryFn: () => apiFetch<{ item: OnboardingData }>("/api/onboarding/me"),
  });

  const onboardingData = onboardingRes?.item;

  const avatarRaw =
    userSettingsRes?.item?.avatarDataUrl ||
    userSettingsRes?.item?.avatarUrl ||
    conversationProfile?.avatarUrl ||
    baseProfile?.avatarUrl ||
    null;

  const resolvedAvatarUri = useMemo(() => {
    if (!avatarRaw) return null;
    return toProxiedUrl(avatarRaw, authToken) || null;
  }, [avatarRaw, authToken]);

  const initials = useMemo(() => {
    return (baseProfile?.name || baseProfile?.email || "M")
      .split(" ")
      .filter(Boolean)
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }, [baseProfile?.name, baseProfile?.email]);

  useEffect(() => {
    setAvatarLoadError(false);
  }, [resolvedAvatarUri]);

  useEffect(() => {
    if (baseProfile) {
      setEditedProfile({
        ...baseProfile,
        avatarUrl: resolvedAvatarUri || undefined,
        department: conversationProfile?.department,
        current_status: conversationProfile?.current_status,
      });
    }
  }, [baseProfile, conversationProfile, resolvedAvatarUri]);

  useEffect(() => {
    if (onboardingData) {
      setOnboardingForm({
        firstName: onboardingData.personalInfo?.firstName || "",
        lastName: onboardingData.personalInfo?.lastName || "",
        phone: onboardingData.personalInfo?.phone || "",
        address: onboardingData.personalInfo?.address || "",
        city: onboardingData.personalInfo?.city || "",
        state: onboardingData.personalInfo?.state || "",
        zip: onboardingData.personalInfo?.zip || "",
        country: onboardingData.personalInfo?.country || "",
        idType: onboardingData.identityVerification?.idType || "",
        idNumber: onboardingData.identityVerification?.idNumber || "",
        ssn: onboardingData.taxInfo?.ssn || "",
        taxFilingStatus: onboardingData.taxInfo?.taxFilingStatus || "",
        bankName: onboardingData.bankInfo?.bankName || "",
        accountNumber: onboardingData.bankInfo?.accountNumber || "",
        routingNumber: onboardingData.bankInfo?.routingNumber || "",
      });
      setSecondaryIdType(onboardingData.identityVerification?.secondaryIdType || "");
    }
  }, [onboardingData]);

  const handleSaveProfile = async () => {
    if (!editedProfile) return;
    setSaving(true);
    try {
      await apiFetch(`/api/employees/${editedProfile.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: editedProfile.name,
          phone: editedProfile.phone,
          location: editedProfile.location,
        }),
      });

      await apiFetch("/api/settings", {
        method: "PUT",
        body: JSON.stringify({
          fullName: editedProfile.name,
          phone: editedProfile.phone,
        }),
      });

      setIsEditing(false);
      await queryClient.invalidateQueries({ queryKey: ["profileMe"] });
      await queryClient.invalidateQueries({ queryKey: ["settings"] });
      Alert.alert("Success", "Profile updated successfully");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (baseProfile) {
      setEditedProfile({
        ...baseProfile,
        avatarUrl: resolvedAvatarUri || undefined,
      });
    }
    setIsEditing(false);
  };

  const handleImageUpload = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Permission Denied", "Permission to access camera roll is required!");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (result.canceled || !baseProfile) return;

    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > 2 * 1024 * 1024) {
      Alert.alert("Error", "Image size should be less than 2MB");
      return;
    }

    setUploadingImage(true);
    try {
      const cleanBase64 = asset.base64 ? asset.base64.replace(/[\r\n]/g, "") : "";
      const base64String = `data:image/jpeg;base64,${cleanBase64}`;
      await apiFetch("/api/settings", {
        method: "PUT",
        body: JSON.stringify({ avatarDataUrl: base64String }),
      });

      await queryClient.invalidateQueries({ queryKey: ["profileMe"] });
      await queryClient.invalidateQueries({ queryKey: ["conversationProfile", baseProfile.email] });
      await queryClient.invalidateQueries({ queryKey: ["settings"] });
      Alert.alert("Success", "Avatar modified successfully");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDocumentSelection = async (field: string) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;
      
      const file = result.assets[0];
      setUploadingFields(prev => ({ ...prev, [field]: true }));

      const base64Content = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const mimeType = file.mimeType || "application/octet-stream";
      const cleanBase64 = base64Content.replace(/[\r\n]/g, "");
      const base64String = `data:${mimeType};base64,${cleanBase64}`;

      queryClient.setQueryData(["onboardingMe"], (prev: any) => {
        if (!prev?.item) return prev;
        const updated = { ...prev.item };
        if (field === "idFrontUrl" || field === "idBackUrl" || field === "secondaryIdUrl") {
          updated.identityVerification = { ...updated.identityVerification, [field]: base64String };
        } else if (field === "w4FormUrl" || field === "handbookSignatureUrl") {
          updated.documents = { ...updated.documents, [field]: base64String };
        }
        return { ...prev, item: updated };
      });

      Alert.alert("Success", "Document uploaded to cache");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to attach document");
    } finally {
      setUploadingFields(prev => ({ ...prev, [field]: false }));
    }
  };

  const handleSubmitOnboarding = async () => {
    setSubmittingOnboarding(true);
    try {
      const payload = {
        personalInfo: {
          firstName: onboardingForm.firstName,
          lastName: onboardingForm.lastName,
          phone: onboardingForm.phone,
          address: onboardingForm.address,
          city: onboardingForm.city,
          state: onboardingForm.state,
          zip: onboardingForm.zip,
          country: onboardingForm.country,
        },
        identityVerification: {
          idType: onboardingForm.idType,
          idNumber: onboardingForm.idNumber,
          idFrontUrl: onboardingData?.identityVerification?.idFrontUrl,
          idBackUrl: onboardingData?.identityVerification?.idBackUrl,
          secondaryIdType: secondaryIdType,
          secondaryIdUrl: onboardingData?.identityVerification?.secondaryIdUrl,
        },
        taxInfo: {
          ssn: onboardingForm.ssn,
          taxFilingStatus: onboardingForm.taxFilingStatus,
        },
        bankInfo: {
          bankName: onboardingForm.bankName,
          accountNumber: onboardingForm.accountNumber,
          routingNumber: onboardingForm.routingNumber,
        },
        documents: {
          w4FormUrl: onboardingData?.documents?.w4FormUrl,
          handbookSignatureUrl: onboardingData?.documents?.handbookSignatureUrl,
        },
      };

      await apiFetch("/api/onboarding/me", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      Alert.alert("Success", "Onboarding updated successfully");
      await queryClient.invalidateQueries({ queryKey: ["onboardingMe"] });
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to submit onboarding");
    } finally {
      setSubmittingOnboarding(false);
    }
  };

  const getOnboardingProgress = () => {
    if (!onboardingData) return 0;
    let completed = 0;
    const total = 5;
    if (onboardingData.personalInfo?.firstName) completed++;
    if (onboardingData.identityVerification?.idType) completed++;
    if (onboardingData.taxInfo?.ssn) completed++;
    if (onboardingData.bankInfo?.bankName) completed++;
    if (onboardingData.documents?.w4FormUrl) completed++;
    return Math.round((completed / total) * 100);
  };

  const showSelectAlert = (title: string, options: { label: string; value: string }[], onSelect: (val: string) => void) => {
    Alert.alert(
      title,
      "Choose an option",
      [
        ...options.map(opt => ({ text: opt.label, onPress: () => onSelect(opt.value) })),
        { text: "Cancel", style: "cancel" as const }
      ]
    );
  };

  if (loadingProfile || loadingConvProfile || loadingSettings) {
    return (
      <View style={s(styles.centered)}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={s(styles.loadingText)}>Loading Profile...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={s(styles.container)} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={s(styles.scrollContainer)} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={s(styles.titleHeading)}>Profile</Text>

          <View style={s(styles.tabContainer)}>
            <TouchableOpacity 
              style={s([styles.tabButton, activeTab === "personal" && styles.activeTabButton])} 
              onPress={() => setActiveTab("personal")}
            >
              <Text style={s([styles.tabText, activeTab === "personal" && styles.activeTabText])}>Personal Info</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={s([styles.tabButton, activeTab === "onboarding" && styles.activeTabButton])} 
              onPress={() => setActiveTab("onboarding")}
            >
              <Text style={s([styles.tabText, activeTab === "onboarding" && styles.activeTabText])}>Onboarding</Text>
            </TouchableOpacity>
          </View>

          {activeTab === "personal" ? (
            <View style={s(styles.card)}>
              <View style={s(styles.cardHeader)}>
                <Text style={s(styles.cardTitle)}>Identity & Core Settings</Text>
                {!isEditing ? (
                  <TouchableOpacity style={s(styles.outlineButton)} onPress={() => setIsEditing(true)}>
                    <Edit2 size={12} color={colors.primary} style={{ marginRight: 4 }} />
                    <Text style={s(styles.outlineButtonText)}>Edit</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={s(styles.headerActionsRow)}>
                    <TouchableOpacity style={s(styles.actionCancelBtn)} onPress={handleCancelEdit}>
                      <X size={14} color={colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity style={s(styles.actionSaveBtn)} onPress={handleSaveProfile} disabled={saving}>
                      <Save size={14} color={colors.inputBg} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <View style={s(styles.cardContent)}>
                <View style={s(styles.avatarRow)}>
                  <View style={s(styles.avatarWrapper)}>
                    {resolvedAvatarUri && !avatarLoadError ? (
                      <Image 
                        source={{ 
                          uri: resolvedAvatarUri,
                          headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined
                        }} 
                        style={s(styles.avatarImage)} 
                        contentFit="cover"
                        transition={200}
                        onError={(e) => {
                          console.warn("Avatar image load error:", e.error);
                          setAvatarLoadError(true);
                        }}
                      />
                    ) : (
                      <View style={s([styles.avatarImage, styles.avatarFallback])}>
                        <Text style={s(styles.avatarFallbackText)}>{initials}</Text>
                      </View>
                    )}
                    <TouchableOpacity style={s(styles.cameraBadge)} onPress={handleImageUpload} disabled={uploadingImage}>
                      <Camera size={12} color={colors.inputBg} />
                    </TouchableOpacity>
                  </View>
                  <View style={s(styles.profileMetaContainer)}>
                    <Text style={s(styles.profileName)} numberOfLines={1}>{baseProfile?.name}</Text>
                    <Text style={s(styles.profileEmail)} numberOfLines={1}>{baseProfile?.email}</Text>
                    {conversationProfile?.department && (
                      <Text style={s(styles.departmentText)}>Dept: {conversationProfile.department}</Text>
                    )}
                    <View style={s(styles.badgeRow)}>
                      <View style={s(styles.badge)}><Text style={s(styles.badgeText)}>{baseProfile?.role || "Staff"}</Text></View>
                      {conversationProfile?.current_status && (
                        <View style={s([styles.badge, styles.activeStatusBadge])}>
                          <Text style={s(styles.activeStatusText)}>{conversationProfile.current_status}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                <View style={s(styles.formGroup)}>
                  <Text style={s(styles.label)}>Full Name</Text>
                  <TextInput
                    style={s([styles.input, !isEditing && styles.disabledInput])}
                    value={isEditing ? editedProfile?.name : baseProfile?.name}
                    onChangeText={(txt) => setEditedProfile((prev) => prev ? { ...prev, name: txt } : null)}
                    editable={isEditing}
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                <View style={s(styles.formGroup)}>
                  <Text style={s(styles.label)}>Email Address</Text>
                  <TextInput style={s([styles.input, styles.disabledInput])} value={baseProfile?.email} editable={false} />
                </View>

                <View style={s(styles.formGroup)}>
                  <Text style={s(styles.label)}>Phone Line</Text>
                  <TextInput
                    style={s([styles.input, !isEditing && styles.disabledInput])}
                    value={isEditing ? editedProfile?.phone : baseProfile?.phone}
                    onChangeText={(txt) => setEditedProfile((prev) => prev ? { ...prev, phone: txt } : null)}
                    editable={isEditing}
                    keyboardType="phone-pad"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                <View style={s(styles.formGroup)}>
                  <Text style={s(styles.label)}>Location Base</Text>
                  <TextInput
                    style={s([styles.input, !isEditing && styles.disabledInput])}
                    value={isEditing ? editedProfile?.location : baseProfile?.location}
                    onChangeText={(txt) => setEditedProfile((prev) => prev ? { ...prev, location: txt } : null)}
                    editable={isEditing}
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              </View>
            </View>
          ) : (
            <View style={s(styles.card)}>
              <View style={s(styles.cardHeader)}>
                <View>
                  <Text style={s(styles.cardTitle)}>Compliance Verification</Text>
                  <Text style={s(styles.cardSubTitle)}>Review files and complete regulatory configurations</Text>
                </View>
              </View>

              <View style={s(styles.cardContent)}>
                {onboardingData && (
                  <View style={s(styles.statusBox)}>
                    <View style={s(styles.statusLayoutRow)}>
                      {onboardingData.overallStatus === "approved" ? (
                        <CheckCircle2 size={16} color={colors.primary} />
                      ) : (
                        <Clock size={16} color={colors.textSecondary} />
                      )}
                      <Text style={s(styles.statusText)}>
                        System Token: <Text style={{ textTransform: "uppercase", color: colors.primary }}>{onboardingData.overallStatus}</Text>
                      </Text>
                    </View>
                    <Text style={s(styles.statusProgressText)}>{getOnboardingProgress()}% Done</Text>
                  </View>
                )}

                {onboardingData?.overallStatus !== "approved" && (
                  <>
                    <Text style={s(styles.sectionHeading)}>Personal Record Dossier</Text>
                    <View style={s(styles.formGroup)}><Text style={s(styles.label)}>First Name *</Text><TextInput style={s(styles.input)} value={onboardingForm.firstName} onChangeText={(t) => setOnboardingForm({ ...onboardingForm, firstName: t })} /></View>
                    <View style={s(styles.formGroup)}><Text style={s(styles.label)}>Last Name *</Text><TextInput style={s(styles.input)} value={onboardingForm.lastName} onChangeText={(t) => setOnboardingForm({ ...onboardingForm, lastName: t })} /></View>
                    <View style={s(styles.formGroup)}><Text style={s(styles.label)}>Phone *</Text><TextInput style={s(styles.input)} value={onboardingForm.phone} keyboardType="phone-pad" onChangeText={(t) => setOnboardingForm({ ...onboardingForm, phone: t })} /></View>
                    <View style={s(styles.formGroup)}><Text style={s(styles.label)}>Address Route *</Text><TextInput style={s(styles.input)} value={onboardingForm.address} onChangeText={(t) => setOnboardingForm({ ...onboardingForm, address: t })} /></View>
                    <View style={s(styles.formGroup)}><Text style={s(styles.label)}>City *</Text><TextInput style={s(styles.input)} value={onboardingForm.city} onChangeText={(t) => setOnboardingForm({ ...onboardingForm, city: t })} /></View>
                    <View style={s(styles.formGroup)}><Text style={s(styles.label)}>State *</Text><TextInput style={s(styles.input)} value={onboardingForm.state} onChangeText={(t) => setOnboardingForm({ ...onboardingForm, state: t })} /></View>
                    <View style={s(styles.formGroup)}><Text style={s(styles.label)}>ZIP Index *</Text><TextInput style={s(styles.input)} value={onboardingForm.zip} onChangeText={(t) => setOnboardingForm({ ...onboardingForm, zip: t })} /></View>
                    <View style={s(styles.formGroup)}><Text style={s(styles.label)}>Country *</Text><TextInput style={s(styles.input)} value={onboardingForm.country} onChangeText={(t) => setOnboardingForm({ ...onboardingForm, country: t })} /></View>

                    <Text style={s(styles.sectionHeading)}>Cryptographic & Government Verification</Text>
                    <View style={s(styles.formGroup)}>
                      <Text style={s(styles.label)}>ID Class *</Text>
                      <TouchableOpacity 
                        style={s(styles.pickerSelector)} 
                        onPress={() => showSelectAlert("ID Type", [
                          { label: "Passport", value: "passport" },
                          { label: "Driver's License", value: "drivers_license" },
                          { label: "National ID", value: "national_id" }
                        ], (v) => setOnboardingForm({ ...onboardingForm, idType: v }))}
                      >
                        <Text style={s(onboardingForm.idType ? styles.pickerText : styles.pickerPlaceholder)}>
                          {onboardingForm.idType || "Select ID Type"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    
                    <View style={s(styles.formGroup)}>
                      <Text style={s(styles.label)}>ID Serial String *</Text>
                      <TextInput style={s(styles.input)} value={onboardingForm.idNumber} onChangeText={(t) => setOnboardingForm({ ...onboardingForm, idNumber: t })} />
                    </View>

                    <View style={s(styles.formGroup)}>
                      <Text style={s(styles.label)}>Primary ID Asset (Front) *</Text>
                      <TouchableOpacity style={s(styles.fileUploadBtn)} onPress={() => handleDocumentSelection("idFrontUrl")}>
                        {uploadingFields["idFrontUrl"] ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={s(styles.uploadBtnText)}>{onboardingData?.identityVerification?.idFrontUrl ? "Asset Secured ✓" : "Attach File"}</Text>}
                      </TouchableOpacity>
                    </View>

                    <View style={s(styles.formGroup)}>
                      <Text style={s(styles.label)}>Primary ID Asset (Back)</Text>
                      <TouchableOpacity style={s(styles.fileUploadBtn)} onPress={() => handleDocumentSelection("idBackUrl")}>
                        {uploadingFields["idBackUrl"] ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={s(styles.uploadBtnText)}>{onboardingData?.identityVerification?.idBackUrl ? "Asset Secured ✓" : "Attach File"}</Text>}
                      </TouchableOpacity>
                    </View>

                    <View style={s(styles.formGroup)}>
                      <Text style={s(styles.label)}>Secondary Verification Class *</Text>
                      <TouchableOpacity 
                        style={s(styles.pickerSelector)} 
                        onPress={() => showSelectAlert("Secondary ID Type", [
                          { label: "Social Security Card", value: "ss_card" },
                          { label: "Other", value: "other" }
                        ], (v) => setSecondaryIdType(v))}
                      >
                        <Text style={s(secondaryIdType ? styles.pickerText : styles.pickerPlaceholder)}>
                          {secondaryIdType || "Select Token Variant"}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <View style={s(styles.formGroup)}>
                      <Text style={s(styles.label)}>Secondary ID Asset *</Text>
                      <TouchableOpacity style={s(styles.fileUploadBtn)} onPress={() => handleDocumentSelection("secondaryIdUrl")}>
                        {uploadingFields["secondaryIdUrl"] ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={s(styles.uploadBtnText)}>{onboardingData?.identityVerification?.secondaryIdUrl ? "Asset Secured ✓" : "Attach File"}</Text>}
                      </TouchableOpacity>
                    </View>

                    <Text style={s(styles.sectionHeading)}>Tax Vault Information</Text>
                    <View style={s(styles.formGroup)}>
                      <Text style={s(styles.label)}>SSN Vault Token *</Text>
                      <TextInput style={s(styles.input)} secureTextEntry value={onboardingForm.ssn} onChangeText={(t) => setOnboardingForm({ ...onboardingForm, ssn: t })} />
                    </View>
                    <View style={s(styles.formGroup)}>
                      <Text style={s(styles.label)}>Filing Strategy Group *</Text>
                      <TouchableOpacity 
                        style={s(styles.pickerSelector)} 
                        onPress={() => showSelectAlert("Tax Status", [
                          { label: "Single", value: "single" },
                          { label: "Married Filing Jointly", value: "married_joint" },
                          { label: "Married Filing Separately", value: "married_separate" },
                          { label: "Head of Household", value: "head_of_household" }
                        ], (v) => setOnboardingForm({ ...onboardingForm, taxFilingStatus: v }))}
                      >
                        <Text style={s(onboardingForm.taxFilingStatus ? styles.pickerText : styles.pickerPlaceholder)}>
                          {onboardingForm.taxFilingStatus || "Select Group Status"}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={s(styles.sectionHeading)}>Financial Settlement Ledger</Text>
                    <View style={s(styles.formGroup)}><Text style={s(styles.label)}>Bank Institution *</Text><TextInput style={s(styles.input)} value={onboardingForm.bankName} onChangeText={(t) => setOnboardingForm({ ...onboardingForm, bankName: t })} /></View>
                    <View style={s(styles.formGroup)}><Text style={s(styles.label)}>Account Routing Hex *</Text><TextInput style={s(styles.input)} secureTextEntry value={onboardingForm.accountNumber} onChangeText={(t) => setOnboardingForm({ ...onboardingForm, accountNumber: t })} /></View>
                    <View style={s(styles.formGroup)}><Text style={s(styles.label)}>Transit Clearing Code *</Text><TextInput style={s(styles.input)} value={onboardingForm.routingNumber} onChangeText={(t) => setOnboardingForm({ ...onboardingForm, routingNumber: t })} /></View>

                    <Text style={s(styles.sectionHeading)}>Signed Disclosures</Text>
                    <View style={s(styles.formGroup)}>
                      <Text style={s(styles.label)}>W-4 Regulatory Bind *</Text>
                      <TouchableOpacity style={s(styles.fileUploadBtn)} onPress={() => handleDocumentSelection("w4FormUrl")}>
                        {uploadingFields["w4FormUrl"] ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={s(styles.uploadBtnText)}>{onboardingData?.documents?.w4FormUrl ? "Asset Secured ✓" : "Attach File"}</Text>}
                      </TouchableOpacity>
                    </View>
                    <View style={s(styles.formGroup)}>
                      <Text style={s(styles.label)}>Handbook Signature Bind *</Text>
                      <TouchableOpacity style={s(styles.fileUploadBtn)} onPress={() => handleDocumentSelection("handbookSignatureUrl")}>
                        {uploadingFields["handbookSignatureUrl"] ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={s(styles.uploadBtnText)}>{onboardingData?.documents?.handbookSignatureUrl ? "Asset Secured ✓" : "Attach File"}</Text>}
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={s(styles.submitButton)} onPress={handleSubmitOnboarding} disabled={submittingOnboarding}>
                      {submittingOnboarding ? (
                        <ActivityIndicator size="small" color={colors.inputBg} />
                      ) : (
                        <Text style={s(styles.submitButtonText)}>
                          {onboardingData?.overallStatus === "submitted" || onboardingData?.overallStatus === "rejected"
                            ? "Re-authorize & Sync Dossier"
                            : "Commit Config Data"}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </>
                )}

                {onboardingData?.overallStatus === "approved" && (
                  <View style={s(styles.approvedBanner)}>
                    <CheckCircle2 size={20} color={colors.primary} />
                    <Text style={s(styles.approvedText)}>Admin system authorization confirmed. Clearance level active.</Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}