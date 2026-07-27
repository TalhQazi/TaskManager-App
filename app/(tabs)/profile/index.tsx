import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Switch,
  Modal,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  SafeAreaView,
  StatusBar,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { Video, ResizeMode } from "expo-av";
import {
  User,
  Mail,
  Phone,
  Building2,
  Briefcase,
  MapPin,
  Calendar,
  Edit2,
  Camera,
  Lock,
  Save,
  X,
  Upload,
  AlertCircle,
  CheckCircle2,
  Clock,
  Shield,
  FileText,
  Globe,
  ChevronDown,
} from "lucide-react-native";

import { useTheme } from "@/contexts/ThemeContext";
import {
  getEmployeeProfile,
  apiFetch,
  getVideoHistory,
} from "@/lib/admin/apiClient";
import { toProxiedUrl, initToken, toProxiedUrlUpload } from "@/util/toProxiedUrl";
import ClearHireOnboardingForm from "./ClearHireOnboardingForm";
import { s, wp, hp, fs } from "@/util/styles";

const { width } = Dimensions.get("window");

interface EmployeeProfileData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  location?: string;
  status?: string;
  avatarUrl?: string;
  jobTitle?: string;
  department?: string;
  joinDate?: string;
  employeeId?: string;
  bankInfo?: {
    accountName?: string;
    accountNumber?: string;
    ifsc?: string;
    bankName?: string;
  };
  taxSettings?: {
    pan?: string;
    tds?: string | number;
    regime?: string;
  };
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  filingStatus?: string;
  allowances?: number;
  additionalWithholding?: number;
  mfaEnabled?: boolean;
}

interface VideoMessagePayload {
  id: string;
  messageType: string;
  title: string;
  subtitle: string;
  videoUrl: string;
  deliveredAt: string;
  acknowledgedAt: string | null;
  replayCount: number;
}

export default function EmployeeProfile() {
  const { uiTheme } = useTheme();

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
  const inputBorder = useMemo(() => (isLightTheme ? "#CBD5E1" : "#3f3f46"), [isLightTheme]);

  const successBg = useMemo(() => (isLightTheme ? "#DCFCE7" : "rgba(21, 128, 61, 0.2)"), [isLightTheme]);
  const successText = useMemo(() => (isLightTheme ? "#15803D" : "#4ade80"), [isLightTheme]);
  const warningBg = useMemo(() => (isLightTheme ? "#FEF3C7" : "rgba(146, 64, 14, 0.2)"), [isLightTheme]);
  const warningBorder = useMemo(() => (isLightTheme ? "#FDE68A" : "rgba(253, 230, 138, 0.2)"), [isLightTheme]);
  const warningText = useMemo(() => (isLightTheme ? "#92400E" : "#fbbf24"), [isLightTheme]);
  const errorBg = useMemo(() => (isLightTheme ? "#FEE2E2" : "rgba(185, 28, 28, 0.2)"), [isLightTheme]);
  const errorText = useMemo(() => (isLightTheme ? "#B91C1C" : "#f87171"), [isLightTheme]);

  const [profile, setProfile] = useState<EmployeeProfileData | null>(null);
  const [editedProfile, setEditedProfile] = useState<EmployeeProfileData | null>(null);
  const [isEditingBasic, setIsEditingBasic] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingBasic, setSavingBasic] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [tokenReady, setTokenReady] = useState(false);

  const [currentTab, setCurrentTab] = useState<"onboarding" | "settings">("onboarding");

  const [settingsAvatar, setSettingsAvatar] = useState<string | null>(null);
  const [userSettings, setUserSettings] = useState<{
    language: string;
    timezone: string;
    countryCode: string;
  }>({ language: "en", timezone: "UTC", countryCode: "US" });
  const [savingSettings, setSavingSettings] = useState(false);

  const [videoHistory, setVideoHistory] = useState<VideoMessagePayload[]>([]);
  const [loadingVideoHistory, setLoadingVideoHistory] = useState(false);
  const [selectedVideoHistory, setSelectedVideoHistory] = useState<VideoMessagePayload | null>(null);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  const [mfaModalOpen, setMfaModalOpen] = useState(false);
  const [mfaSecret, setMfaSecret] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [mfaLoading, setMfaLoading] = useState(false);

  const [onboardingData, setOnboardingData] = useState<any>(null);
  const [clearHireStatus, setClearHireStatus] = useState<any>(null);
  const [loadingOnboarding, setLoadingOnboarding] = useState(false);
  const [submittingOnboarding, setSubmittingOnboarding] = useState(false);

  const [uploadingPrimaryIdFront, setUploadingPrimaryIdFront] = useState(false);
  const [uploadingPrimaryIdBack, setUploadingPrimaryIdBack] = useState(false);
  const [uploadingSecondaryId, setUploadingSecondaryId] = useState(false);
  const [uploadingW4Form, setUploadingW4Form] = useState(false);
  const [uploadingHandbookSignature, setUploadingHandbookSignature] = useState(false);
  const [uploadingDigitalSignature, setUploadingDigitalSignature] = useState(false);

  const [primaryIdType, setPrimaryIdType] = useState("");
  const [secondaryIdType, setSecondaryIdType] = useState("");

  const [primaryIdFrontData, setPrimaryIdFrontData] = useState("");
  const [primaryIdBackData, setPrimaryIdBackData] = useState("");
  const [secondaryIdData, setSecondaryIdData] = useState("");

  const [savingPrimaryId, setSavingPrimaryId] = useState(false);
  const [savingSecondaryId, setSavingSecondaryId] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [editingWorkInfo, setEditingWorkInfo] = useState(false);
  const [editedWorkInfo, setEditedWorkInfo] = useState<any>(null);

  const [activePicker, setActivePicker] = useState<{ type: string; options: { label: string; value: string }[] } | null>(null);

  // Initialize secure proxies on load
  useEffect(() => {
    (async () => {
      await initToken();
      setTokenReady(true);
    })();
    loadProfile();
    loadOnboardingData();
  }, []);

  useEffect(() => {
    if (profile?.id) {
      loadVideoHistoryData();
    }
  }, [profile]);

  const avatarUrl = useMemo(() => {
    let avatarRaw = settingsAvatar || profile?.avatarUrl || null;
    if (!avatarRaw) return null;
    
    if (avatarRaw.startsWith("http") || avatarRaw.startsWith("data:")) {
      return avatarRaw;
    }
    if (avatarRaw.startsWith("/uploads/avatars/")) {
      avatarRaw = avatarRaw.replace("/uploads/avatars/", "/api/s3-proxy/avatars/");
    }
    
    return `https://task.se7eninc.com${avatarRaw}`;
  }, [settingsAvatar, profile?.avatarUrl]);

  const resolvedAvatarUrl = useMemo(() => {
    if (!profile?.avatarUrl) return null;
    return tokenReady ? toProxiedUrlUpload(profile.avatarUrl) : null;
  }, [profile?.avatarUrl, tokenReady]);

  const loadVideoHistoryData = async () => {
    if (!profile?.id) return;
    setLoadingVideoHistory(true);
    try {
      const response = await getVideoHistory(profile.id);
      setVideoHistory(
        (response.items || []).map((item: any) => ({
          id: item.id,
          messageType: item.messageType,
          title: item.videoTitle,
          subtitle: item.videoSubtitle,
          videoUrl: item.videoUrl,
          deliveredAt: item.deliveredAt,
          acknowledgedAt: item.acknowledgedAt || null,
          replayCount: item.replayCount || 0,
        }))
      );
    } catch (err) {
      console.log(err);
    } finally {
      setLoadingVideoHistory(false);
    }
  };

  const loadProfile_ = async () => {
    try {
      const res = await getEmployeeProfile();
      setProfile(res.item);
      setEditedProfile(res.item);
      setEditedWorkInfo(res.item);

      try {
        const sRes = await apiFetch<{ item?: any }>("/api/settings");
        if (sRes && sRes.item) {
          setUserSettings({
            language: sRes.item.language || "en",
            timezone: sRes.item.timezone || "UTC",
            countryCode: sRes.item.countryCode || "US",
          });
        }
      } catch (e) {
        console.log(e);
      }
    } catch (err) {
      Alert.alert("Error", "Failed to load profile parameters.");
    } finally {
      setLoading(false);
    }
  };

  const loadProfile = async () => {
    try {
      const res = await getEmployeeProfile();
      setProfile(res.item);
      setEditedProfile(res.item);
      setEditedWorkInfo(res.item);

      try {
        const sRes = await apiFetch<{ item?: any }>("/api/settings");
        if (sRes && sRes.item) {
          setUserSettings({
            language: sRes.item.language || "en",
            timezone: sRes.item.timezone || "UTC",
            countryCode: sRes.item.countryCode || "US",
          });
          
          const rawImg = sRes.item.avatarDataUrl || sRes.item.avatarUrl || null;
          setSettingsAvatar(rawImg);
        }
      } catch (e) {
        console.log("Settings endpoint parse warning:", e);
      }
    } catch (err) {
      Alert.alert("Error", "Failed to load profile parameters.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLocalization = async () => {
    setSavingSettings(true);
    try {
      await apiFetch("/api/settings", {
        method: "PUT",
        body: JSON.stringify(userSettings),
      });
      Alert.alert("Success", "Localization preferences saved successfully.");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to save preferences.");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveBasicInfo = async () => {
    if (!editedProfile) return;
    setSavingBasic(true);
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

      await apiFetch("/api/onboarding/me/basic-info", {
        method: "PUT",
        body: JSON.stringify({
          email: editedProfile.email,
          phone: editedProfile.phone,
          location: editedProfile.location,
        }),
      });

      setProfile(editedProfile);
      setIsEditingBasic(false);
      Alert.alert("Success", "Basic information updated successfully.");
      loadProfile();
      loadOnboardingData();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to save core details.");
    } finally {
      setSavingBasic(false);
    }
  };

  const handleCancelBasicEdit = () => {
    setEditedProfile(profile);
    setIsEditingBasic(false);
  };

  const convertFileToBase64 = async (uri: string): Promise<string> => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      throw new Error("Failed to process document content framework.");
    }
  };

  const handleImageUpload_ = async () => {
    if (!profile) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "image/*" });
      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const file = result.assets[0];
      if (file.size && file.size > 2 * 1024 * 1024) {
        Alert.alert("Error", "Image size must be smaller than 2MB.");
        return;
      }

      setUploadingImage(true);
      const base64String = await convertFileToBase64(file.uri);

      const res = await apiFetch<{ item?: { avatarUrl?: string; avatarDataUrl?: string } }>("/api/settings", {
        method: "PUT",
        body: JSON.stringify({ avatarDataUrl: base64String }),
      });

      const nextUrl = String(res?.item?.avatarUrl || res?.item?.avatarDataUrl || base64String);
      setProfile({ ...profile, avatarUrl: nextUrl });
      setEditedProfile({ ...editedProfile!, avatarUrl: nextUrl });
      Alert.alert("Success", "Profile picture updated successfully.");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to upload file.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImageUpload = async () => {
    if (!profile) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "image/*" });
      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const file = result.assets[0];
      if (file.size && file.size > 2 * 1024 * 1024) {
        Alert.alert("Error", "Image size must be smaller than 2MB.");
        return;
      }

      setUploadingImage(true);
      const base64String = await convertFileToBase64(file.uri);

      const res = await apiFetch<{ item?: { avatarUrl?: string; avatarDataUrl?: string } }>("/api/settings", {
        method: "PUT",
        body: JSON.stringify({ avatarDataUrl: base64String }),
      });

      const nextUrl = String(res?.item?.avatarUrl || res?.item?.avatarDataUrl || base64String);
      setProfile({ ...profile, avatarUrl: nextUrl });
      setEditedProfile({ ...editedProfile!, avatarUrl: nextUrl });
      setSettingsAvatar(nextUrl);
      Alert.alert("Success", "Profile picture updated successfully.");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to upload file.");
    } finally {
      setUploadingImage(false);
    }
  };

  const loadOnboardingData = async () => {
    try {
      setLoadingOnboarding(true);
      const res = await apiFetch<any>("/api/onboarding/me");
      setOnboardingData(res.item);
      if (res.item) {
        setPrimaryIdType(res.item.identityVerification?.primaryId?.idType || "");
        setSecondaryIdType(res.item.identityVerification?.secondaryId?.idType || "");
        setPrimaryIdFrontData(res.item.identityVerification?.primaryId?.frontImage || "");
        setPrimaryIdBackData(res.item.identityVerification?.primaryId?.backImage || "");
        setSecondaryIdData(res.item.identityVerification?.secondaryId?.image || "");

        if (res.item.workInfo?.completed) {
          setEditedWorkInfo((prev: any) => ({
            ...prev,
            jobTitle: res.item.workInfo.jobTitle || prev?.jobTitle || "",
            department: res.item.workInfo.department || prev?.department || "",
            manager: res.item.workInfo.manager || prev?.manager || "",
            joinDate: res.item.workInfo.joinDate || prev?.joinDate || "",
          }));
        }
      }

      try {
        const chRes = await apiFetch<any>("/api/clearhire/status/me");
        setClearHireStatus(chRes.item);
      } catch (e) {
        setClearHireStatus(null);
      }
    } catch (err: any) {
      if (!err.message?.includes("not found")) {
        console.log(err);
      }
    } finally {
      setLoadingOnboarding(false);
    }
  };

  const calculateProgress = () => {
    if (!onboardingData) return 0;
    let completed = 0;
    const total = 7;

    if (onboardingData.basicInfo?.completed) completed++;
    if (clearHireStatus?.status === "GREEN") completed++;
    if (onboardingData.workInfo?.completed) completed++;

    if (
      onboardingData.identityVerification?.primaryId?.status === "submitted" ||
      onboardingData.identityVerification?.primaryId?.status === "verified"
    ) {
      if (
        onboardingData.identityVerification?.secondaryId?.status === "submitted" ||
        onboardingData.identityVerification?.secondaryId?.status === "verified"
      ) {
        completed++;
      }
    }

    if (onboardingData.w4Form?.status === "submitted" || onboardingData.w4Form?.status === "verified") completed++;
    if (onboardingData.employeeHandbook?.status === "submitted" || onboardingData.employeeHandbook?.status === "verified") completed++;
    if (onboardingData.digitalSignature?.status === "submitted" || onboardingData.digitalSignature?.status === "verified") completed++;

    return Math.round((completed / total) * 100);
  };

  const handleGenericFileUpload = async (
    setUploadingState: (loading: boolean) => void,
    setDataFn: (data: string) => void
  ) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "*/*" });
      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const file = result.assets[0];
      if (file.size && file.size > 10 * 1024 * 1024) {
        Alert.alert("Error", "File size cannot exceed 10MB.");
        return;
      }

      setUploadingState(true);
      const base64 = await convertFileToBase64(file.uri);
      setDataFn(base64);
      Alert.alert("File Ready", "Document staged successfully. Save the individual section row below to commit changes.");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update staging fields.");
    } finally {
      setUploadingState(false);
    }
  };

  const handleW4FormUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "*/*" });
      if (result.canceled || !result.assets || result.assets.length === 0) return;
      const file = result.assets[0];

      setUploadingW4Form(true);
      const base64 = await convertFileToBase64(file.uri);
      await apiFetch("/api/onboarding/me/w4", {
        method: "PUT",
        body: JSON.stringify({ file: base64 }),
      });
      Alert.alert("Success", "W-4 document submitted successfully.");
      loadOnboardingData();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to commit W-4 form change.");
    } finally {
      setUploadingW4Form(false);
    }
  };

  const handleHandbookSignatureUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "*/*" });
      if (result.canceled || !result.assets || result.assets.length === 0) return;
      const file = result.assets[0];

      setUploadingHandbookSignature(true);
      const base64 = await convertFileToBase64(file.uri);
      await apiFetch("/api/onboarding/me/handbook", {
        method: "PUT",
        body: JSON.stringify({
          acknowledged: true,
          signature: base64,
        }),
      });
      Alert.alert("Success", "Handbook validation signature saved.");
      loadOnboardingData();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to save handbook confirmation.");
    } finally {
      setUploadingHandbookSignature(false);
    }
  };

  const handleDigitalSignatureUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "*/*" });
      if (result.canceled || !result.assets || result.assets.length === 0) return;
      const file = result.assets[0];

      setUploadingDigitalSignature(true);
      const base64 = await convertFileToBase64(file.uri);
      await apiFetch("/api/onboarding/me/signature", {
        method: "PUT",
        body: JSON.stringify({ signature: base64 }),
      });
      Alert.alert("Success", "Digital signature filed securely.");
      loadOnboardingData();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to parse signature configuration.");
    } finally {
      setUploadingDigitalSignature(false);
    }
  };

  const handleSavePrimaryId = async () => {
    if (!primaryIdType) {
      Alert.alert("Error", "Please pick an identification scheme profile.");
      return;
    }
    if (!primaryIdFrontData || !primaryIdBackData) {
      Alert.alert("Error", "Both side images are required to update framework items.");
      return;
    }

    setSavingPrimaryId(true);
    try {
      await apiFetch("/api/onboarding/me/identity", {
        method: "PUT",
        body: JSON.stringify({
          primaryId: {
            idType: primaryIdType,
            frontImage: primaryIdFrontData,
            backImage: primaryIdBackData,
          },
        }),
      });
      Alert.alert("Success", "Primary identity cards saved.");
      loadOnboardingData();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update identity record variables.");
    } finally {
      setSavingPrimaryId(false);
    }
  };

  const handleSaveSecondaryId = async () => {
    if (!secondaryIdType) {
      Alert.alert("Error", "Please choose a secondary credential profile option.");
      return;
    }
    if (!secondaryIdData) {
      Alert.alert("Error", "Please upload the secondary verification image target.");
      return;
    }

    setSavingSecondaryId(true);
    try {
      await apiFetch("/api/onboarding/me/identity", {
        method: "PUT",
        body: JSON.stringify({
          secondaryId: {
            idType: secondaryIdType,
            image: secondaryIdData,
          },
        }),
      });
      Alert.alert("Success", "Secondary verification card updated.");
      loadOnboardingData();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to commit data modifications.");
    } finally {
      setSavingSecondaryId(false);
    }
  };

  const handleSubmitOnboarding = async () => {
    setSubmittingOnboarding(true);
    try {
      await apiFetch("/api/onboarding/me/submit", { method: "POST" });
      Alert.alert("Success", "Onboarding profile dispatched for management review updates.");
      loadOnboardingData();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to advance account workflow status.");
    } finally {
      setSubmittingOnboarding(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert("Error", "All verification inputs are required fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "New security passkeys do not match.");
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert("Error", "Passkey must be at least 6 characters.");
      return;
    }

    setChangingPassword(true);
    try {
      await apiFetch("/api/auth/change-password", {
        method: "PUT",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      Alert.alert("Success", "Password revised successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Authentication security logic change failed.");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSaveWorkInfo = async () => {
    try {
      const employeeId = String((profile as any)._id || profile?.id);
      if (!employeeId) {
        Alert.alert("Error", "Unique worker reference ID missing.");
        return;
      }

      await apiFetch(`/api/employees/${employeeId}`, {
        method: "PUT",
        body: JSON.stringify(editedWorkInfo),
      });

      await apiFetch("/api/onboarding/me/work-info", {
        method: "PUT",
        body: JSON.stringify({
          department: editedWorkInfo.department,
          jobTitle: editedWorkInfo.jobTitle,
          manager: editedWorkInfo.manager,
          joinDate: editedWorkInfo.joinDate,
        }),
      });

      setProfile(editedWorkInfo);
      setEditingWorkInfo(false);
      loadOnboardingData();
      Alert.alert("Success", "Operational parameters updated.");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to commit assignment records.");
    }
  };

  const handleMfaSetup = async () => {
    try {
      setMfaLoading(true);
      const res = await apiFetch<{ secret: string; otpauthUrl: string }>("/api/employees/me/mfa/setup", {
        method: "POST",
      });
      setMfaSecret(res.secret);
      setMfaModalOpen(true);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to provision secure channel setup.");
    } finally {
      setMfaLoading(false);
    }
  };

  const handleMfaVerify = async () => {
    try {
      setMfaLoading(true);
      await apiFetch("/api/employees/me/mfa/verify", {
        method: "POST",
        body: JSON.stringify({ code: mfaCode }),
      });
      Alert.alert("Success", "MFA validation configuration fully engaged.");
      setEditedProfile({ ...editedProfile!, mfaEnabled: true });
      setMfaModalOpen(false);
      setMfaCode("");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Validation key rejected. Check tracking device sync settings.");
    } finally {
      setMfaLoading(false);
    }
  };

  const handleMfaDisable = async () => {
    try {
      setMfaLoading(true);
      await apiFetch("/api/employees/me/mfa/disable", {
        method: "POST",
      });
      Alert.alert("Success", "Multi-factor authentication system disabled.");
      setEditedProfile({ ...editedProfile!, mfaEnabled: false });
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to teardown verification architecture settings.");
    } finally {
      setMfaLoading(false);
    }
  };

  if (loading || !profile || !editedProfile) {
    return (
      <SafeAreaView style={s([styles.centerContainer, { backgroundColor: bg }])}>
        <ActivityIndicator size="large" color={primaryColor} />
        <Text style={s([styles.loadingText, { color: mutedText }])}>Retrieving profile data configurations...</Text>
      </SafeAreaView>
    );
  }

  const initials = profile.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "??";

  const isPrimaryIdUploaded = !!(primaryIdFrontData && primaryIdBackData);
  const isPrimaryIdVerified = onboardingData?.identityVerification?.primaryId?.status === "verified";
  
  const isSecondaryIdUploaded = !!secondaryIdData;
  const isSecondaryIdVerified = onboardingData?.identityVerification?.secondaryId?.status === "verified";
  
  const isW4Uploaded = onboardingData?.w4Form?.status === "submitted" || onboardingData?.w4Form?.status === "verified";
  const isW4Verified = onboardingData?.w4Form?.status === "verified";
  
  const isHandbookUploaded = onboardingData?.employeeHandbook?.status === "submitted" || onboardingData?.employeeHandbook?.status === "verified";
  const isHandbookVerified = onboardingData?.employeeHandbook?.status === "verified";
  
  const isSignatureUploaded = onboardingData?.digitalSignature?.status === "submitted" || onboardingData?.digitalSignature?.status === "verified";
  const isSignatureVerified = onboardingData?.digitalSignature?.status === "verified";

  const basicInfoStatusText = onboardingData?.basicInfo?.completed ? "Completed" : "Not completed";
  const clearHireStatusText = clearHireStatus?.status === "GREEN" ? "Completed (GREEN)" : "Not completed";
  const workInfoStatusText = onboardingData?.workInfo?.completed ? "Completed" : "Not completed";
  const identityStatusText = (isPrimaryIdVerified || onboardingData?.identityVerification?.primaryId?.status === "submitted") && 
                              (isSecondaryIdVerified || onboardingData?.identityVerification?.secondaryId?.status === "submitted") ? "Completed" : "Not completed";
  const w4StatusText = isW4Uploaded ? "Completed" : "Not completed";
  const handbookStatusText = isHandbookUploaded ? "Completed" : "Not completed";
  const signatureStatusText = isSignatureUploaded ? "Completed" : "Not completed";

  const isAllOnboardingCompleted = onboardingData?.basicInfo?.completed && 
                                   clearHireStatus?.status === "GREEN" && 
                                   onboardingData?.workInfo?.completed &&
                                   (identityStatusText === "Completed") &&
                                   isW4Uploaded && 
                                   isHandbookUploaded && 
                                   isSignatureUploaded;

  const renderDropdownTrigger = (label: string, value: string, type: string, options: { label: string; value: string }[]) => (
    <View style={s(styles.inputGroup)}>
      <Text style={s([styles.label, { color: mutedText }])}>{label}</Text>
      <TouchableOpacity
        style={s([styles.dropdownTrigger, { borderColor: inputBorder, backgroundColor: cardBg }])}
        onPress={() => setActivePicker({ type, options })}
      >
        <Text style={s([styles.dropdownTriggerText, { color: tintColor }])}>
          {options.find((o) => o.value === value)?.label || "Select Option"}
        </Text>
        <ChevronDown size={fs(4.5)} color={mutedText} />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={s([styles.container, { backgroundColor: bg }])}>
      <StatusBar barStyle={isLightTheme ? "dark-content" : "light-content"} backgroundColor={bg} />
      
      <ScrollView contentContainerStyle={s(styles.scrollContainer)} showsVerticalScrollIndicator={false}>
        
        {/* Main Hero Summary Card */}
        <View style={s([styles.card, { backgroundColor: cardBg, borderColor: border }])}>
          <View style={s(styles.headerLayout)}>
            <View style={s(styles.avatarWrapper)}>
              {resolvedAvatarUrl ? (
                <Image source={{ uri: resolvedAvatarUrl }} style={s([styles.avatarImage, { borderColor: border }])} />
              ) : (
                <View style={s([styles.avatarFallback, { backgroundColor: primaryColor }])}>
                  <Text style={s(styles.avatarFallbackText)}>{initials}</Text>
                </View>
              )}
              <TouchableOpacity style={s([styles.cameraButton, { backgroundColor: primaryColor }])} onPress={handleImageUpload} disabled={uploadingImage}>
                {uploadingImage ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Camera size={fs(4)} color="#FFFFFF" />}
              </TouchableOpacity>
            </View>

            <View style={s(styles.metaWrapper)}>
              <View style={s(styles.nameRow)}>
                <Text style={s([styles.profileName, { color: tintColor }])} numberOfLines={1}>{profile.name}</Text>
                <View style={s([styles.badgeSuccess, { backgroundColor: successBg }])}>
                  <Text style={s([styles.badgeSuccessText, { color: successText }])}>{profile.status || "Active"}</Text>
                </View>
              </View>
              
              <Text style={s([styles.profileJobTitle, { color: mutedText }])}>{profile.jobTitle || "Employee"}</Text>
              
              <View style={s(styles.iconMetaRow)}>
                <Building2 size={fs(3.5)} color={mutedText} />
                <Text style={s([styles.iconMetaText, { color: mutedText }])} numberOfLines={1}>{profile.company || "SE7EN Inc."}</Text>
              </View>
              <View style={s(styles.iconMetaRow)}>
                <MapPin size={fs(3.5)} color={mutedText} />
                <Text style={s([styles.iconMetaText, { color: mutedText }])} numberOfLines={1}>{profile.location || "Not set"}</Text>
              </View>

              <TouchableOpacity 
                style={s([styles.heroEditProfileButton, { borderColor: primaryColor }])}
                onPress={() => {
                  setCurrentTab("onboarding");
                  setIsEditingBasic(true);
                }}
              >
                <Edit2 size={fs(3)} color={primaryColor} />
                <Text style={s([styles.heroEditProfileButtonText, { color: primaryColor }])}>Edit Profile Details</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Video Messaging Management Box */}
        <View style={s([styles.card, { backgroundColor: cardBg, borderColor: border }])}>
          <View style={s(styles.cardHeader)}>
            <FileText size={fs(5)} color={tintColor} />
            <Text style={s([styles.cardTitle, { color: tintColor }])}>Video Message History</Text>
          </View>
          <Text style={s([styles.cardDescription, { color: mutedText }])}>Review messages delivered by leadership and replay them from your profile.</Text>
          
          {loadingVideoHistory ? (
            <ActivityIndicator size="small" color={primaryColor} style={s({ marginVertical: hp(2.5) })} />
          ) : videoHistory.length === 0 ? (
            <View style={s([styles.emptyStateContainer, { borderColor: border }])}>
              <Text style={s([styles.emptyStateText, { color: lightText }])}>No video records available.</Text>
            </View>
          ) : (
            videoHistory.map((video) => (
              <View key={video.id} style={s([styles.videoHistoryBox, { borderColor: border, backgroundColor: isLightTheme ? "#F8FAFC" : "#27272a" }])}>
                <View style={s({ flex: 1, paddingRight: wp(2) })}>
                  <Text style={s([styles.videoBoxTitle, { color: tintColor }])}>{video.title}</Text>
                  <Text style={s([styles.videoBoxSubtitle, { color: mutedText }])}>{video.subtitle || "Executive update"}</Text>
                  <Text style={s([styles.videoBoxDate, { color: lightText }])}>
                    Delivered {video.deliveredAt ? new Date(video.deliveredAt).toLocaleString() : "Unknown"}
                  </Text>
                </View>
                <View style={s(styles.videoActionColumn)}>
                  <TouchableOpacity 
                    style={s([styles.btn, styles.btnOutline, { paddingVertical: hp(0.75), borderColor: inputBorder, backgroundColor: cardBg }])} 
                    onPress={() => { setSelectedVideoHistory(video); setHistoryModalOpen(true); }}
                  >
                    <Text style={s([styles.btnOutlineText, { color: primaryColor }])}>Replay</Text>
                  </TouchableOpacity>
                  <View style={s([styles.replayBadge, { backgroundColor: isLightTheme ? "#F1F5F9" : "#3f3f46" }])}>
                    <Text style={s([styles.replayBadgeText, { color: mutedText }])}>Replays: {video.replayCount || 0}</Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Dynamic Context Tabs */}
        <View style={s([styles.tabsContainer, { backgroundColor: isLightTheme ? "#F1F5F9" : "#27272a" }])}>
          <TouchableOpacity 
            style={s([styles.tabButton, currentTab === "onboarding" && [styles.tabButtonActive, { backgroundColor: cardBg }]])} 
            onPress={() => setCurrentTab("onboarding")}
          >
            <Text style={s([styles.tabButtonText, { color: mutedText }, currentTab === "onboarding" && { color: primaryColor, fontWeight: "700" }])}>Onboarding</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={s([styles.tabButton, currentTab === "settings" && [styles.tabButtonActive, { backgroundColor: cardBg }]])} 
            onPress={() => setCurrentTab("settings")}
          >
            <Text style={s([styles.tabButtonText, { color: mutedText }, currentTab === "settings" && { color: primaryColor, fontWeight: "700" }])}>Settings</Text>
          </TouchableOpacity>
        </View>

        {currentTab === "onboarding" && (
          <View style={s(styles.tabContentWrapper)}>
            {/* Global Workflow Status Overview */}
            <View style={s([styles.card, { backgroundColor: cardBg, borderColor: border }])}>
              <View style={s(styles.cardHeader)}>
                <Briefcase size={fs(5)} color={primaryColor} />
                <Text style={s([styles.cardTitle, { color: tintColor }])}>Onboarding Status</Text>
              </View>
              <Text style={s([styles.cardDescription, { color: mutedText }])}>Complete all steps to unlock full system access</Text>

              <View style={s(styles.progressContainer)}>
                <View style={s(styles.progressTextRow)}>
                  <Text style={s([styles.progressLabel, { color: mutedText }])}>Overall Progress</Text>
                  <Text style={s([styles.progressPercent, { color: primaryColor }])}>{calculateProgress()}%</Text>
                </View>
                <View style={s([styles.progressBarTrack, { backgroundColor: border }])}>
                  <View style={s([styles.progressBarFill, { width: `${calculateProgress()}%`, backgroundColor: primaryColor }])} />
                </View>
              </View>

              <View style={s([styles.statusBlockRow, { backgroundColor: isLightTheme ? "#F8FAFC" : "#27272a" }])}>
                <View style={s(styles.statusBlockLeft)}>
                  <View style={s([styles.statusIndicatorDot, { backgroundColor: onboardingData?.overallStatus === "approved" ? "#22C55E" : "#EAB308" }])} />
                  <View>
                    <Text style={s([styles.statusBlockTitle, { color: tintColor }])}>
                      {onboardingData?.overallStatus === "approved" ? `Onboarding ${calculateProgress()}% and Approved` : "Pending Documentation Completion"}
                    </Text>
                    <Text style={s([styles.statusBlockSubtitle, { color: mutedText }])}>
                      {onboardingData?.overallStatus === "approved" ? "Your onboarding is complete" : "Complete all required steps"}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={s([styles.warningNoticeBox, { backgroundColor: warningBg, borderColor: warningBorder }])}>
                <AlertCircle size={fs(4.5)} color={warningText} style={s({ marginTop: hp(0.25) })} />
                <View style={s({ flex: 1, marginLeft: wp(2) })}>
                  <Text style={s([styles.warningNoticeTitle, { color: warningText }])}>Important Notice</Text>
                  <Text style={s([styles.warningNoticeContent, { color: warningText }])}>You must complete all onboarding steps and receive admin approval before you can check in to work.</Text>
                </View>
              </View>
            </View>

            {/* Modular Section 1: Basic Information Card with Web UI Inline Modifiers */}
            <View style={s([styles.card, { backgroundColor: cardBg, borderColor: border }])}>
              <View style={s(styles.cardHeader)}>
                <View style={s([styles.stepCircle, { backgroundColor: onboardingData?.basicInfo?.completed ? successBg : errorBg }])}>
                  <Text style={s([styles.stepCircleText, { color: onboardingData?.basicInfo?.completed ? successText : errorText }])}>1</Text>
                </View>
                <Text style={s([styles.cardTitle, { color: tintColor }])}>Basic Information</Text>
              </View>

              <View style={s(styles.formContainer)}>
                <View style={s(styles.inputGroup)}>
                  <Text style={s([styles.label, { color: mutedText }])}>Full Name</Text>
                  <View style={s([styles.inputContainer, { borderColor: inputBorder, backgroundColor: cardBg }])}>
                    <User size={fs(4)} color={lightText} style={s(styles.inputIconInline)} />
                    <TextInput
                      style={s([styles.textInput, { color: tintColor }, !isEditingBasic && [styles.textInputDisabled, { backgroundColor: isLightTheme ? "#F8FAFC" : "#27272a" }]])}
                      value={editedProfile.name || ""}
                      onChangeText={(text) => setEditedProfile({ ...editedProfile, name: text })}
                      editable={isEditingBasic}
                    />
                  </View>
                </View>

                <View style={s(styles.inputGroup)}>
                  <Text style={s([styles.label, { color: mutedText }])}>Email Address</Text>
                  <View style={s([styles.inputContainer, { borderColor: inputBorder, backgroundColor: isLightTheme ? "#F8FAFC" : "#27272a" }])}>
                    <Mail size={fs(4)} color={lightText} style={s(styles.inputIconInline)} />
                    <TextInput style={s([styles.textInput, styles.textInputDisabled, { color: mutedText }])} value={editedProfile.email || ""} editable={false} />
                  </View>
                </View>

                <View style={s(styles.inputGroup)}>
                  <Text style={s([styles.label, { color: mutedText }])}>Phone Number</Text>
                  <View style={s([styles.inputContainer, { borderColor: inputBorder, backgroundColor: cardBg }])}>
                    <Phone size={fs(4)} color={lightText} style={s(styles.inputIconInline)} />
                    <TextInput
                      style={s([styles.textInput, { color: tintColor }, !isEditingBasic && [styles.textInputDisabled, { backgroundColor: isLightTheme ? "#F8FAFC" : "#27272a" }]])}
                      value={editedProfile.phone || ""}
                      onChangeText={(text) => setEditedProfile({ ...editedProfile, phone: text })}
                      editable={isEditingBasic}
                    />
                  </View>
                </View>

                <View style={s(styles.inputGroup)}>
                  <Text style={s([styles.label, { color: mutedText }])}>Location</Text>
                  <View style={s([styles.inputContainer, { borderColor: inputBorder, backgroundColor: cardBg }])}>
                    <MapPin size={fs(4)} color={lightText} style={s(styles.inputIconInline)} />
                    <TextInput
                      style={s([styles.textInput, { color: tintColor }, !isEditingBasic && [styles.textInputDisabled, { backgroundColor: isLightTheme ? "#F8FAFC" : "#27272a" }]])}
                      value={editedProfile.location || ""}
                      onChangeText={(text) => setEditedProfile({ ...editedProfile, location: text })}
                      editable={isEditingBasic}
                    />
                  </View>
                </View>
              </View>

              <View style={s([styles.cardActionsRow, { marginTop: hp(1.8) }])}>
                {isEditingBasic ? (
                  <>
                    <TouchableOpacity style={s([styles.btn, styles.btnOutline, { borderColor: inputBorder, backgroundColor: cardBg }])} onPress={handleCancelBasicEdit}>
                      <X size={fs(4)} color={primaryColor} style={s(styles.btnIcon)} />
                      <Text style={s([styles.btnOutlineText, { color: primaryColor }])}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s([styles.btn, styles.btnPrimary, { backgroundColor: primaryColor }])} onPress={handleSaveBasicInfo} disabled={savingBasic}>
                      {savingBasic ? <ActivityIndicator size="small" color="#FFFFFF" /> : (
                        <>
                          <Save size={fs(4)} color="#FFFFFF" style={s(styles.btnIcon)} />
                          <Text style={s(styles.btnPrimaryText)}>Save Changes</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity style={s([styles.btn, styles.btnOutline, { width: "100%", borderColor: inputBorder, backgroundColor: cardBg }])} onPress={() => setIsEditingBasic(true)}>
                    <Edit2 size={fs(4)} color={primaryColor} style={s(styles.btnIcon)} />
                    <Text style={s([styles.btnOutlineText, { color: primaryColor }])}>Edit Information</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <ClearHireOnboardingForm onStatusChange={loadOnboardingData} />

            {/* Modular Section 3: Operational Work Assignments Card */}
            <View style={s([styles.card, { backgroundColor: cardBg, borderColor: border }])}>
              <View style={s(styles.cardHeader)}>
                <View style={s([styles.stepCircle, { backgroundColor: isLightTheme ? "#F1F5F9" : "#27272a" }])}><Text style={s([styles.stepCircleText, { color: mutedText }])}>3</Text></View>
                <Text style={s([styles.cardTitle, { color: tintColor }])}>Work Information</Text>
              </View>

              <View style={s(styles.formContainer)}>
                <View style={s(styles.inputGroup)}>
                  <Text style={s([styles.label, { color: mutedText }])}>Job Title</Text>
                  <View style={s([styles.inputContainer, { borderColor: inputBorder, backgroundColor: cardBg }])}>
                    <Briefcase size={fs(4)} color={lightText} style={s(styles.inputIconInline)} />
                    <TextInput
                      style={s([styles.textInput, { color: tintColor }, !editingWorkInfo && [styles.textInputDisabled, { backgroundColor: isLightTheme ? "#F8FAFC" : "#27272a" }]])}
                      value={editedWorkInfo?.jobTitle || ""}
                      onChangeText={(text) => setEditedWorkInfo({ ...editedWorkInfo, jobTitle: text })}
                      editable={editingWorkInfo}
                    />
                  </View>
                </View>

                <View style={s(styles.inputGroup)}>
                  <Text style={s([styles.label, { color: mutedText }])}>Department</Text>
                  <View style={s([styles.inputContainer, { borderColor: inputBorder, backgroundColor: cardBg }])}>
                    <Building2 size={fs(4)} color={lightText} style={s(styles.inputIconInline)} />
                    <TextInput
                      style={s([styles.textInput, { color: tintColor }, !editingWorkInfo && [styles.textInputDisabled, { backgroundColor: isLightTheme ? "#F8FAFC" : "#27272a" }]])}
                      value={editedWorkInfo?.department || ""}
                      onChangeText={(text) => setEditedWorkInfo({ ...editedWorkInfo, department: text })}
                      editable={editingWorkInfo}
                    />
                  </View>
                </View>

                <View style={s(styles.inputGroup)}>
                  <Text style={s([styles.label, { color: mutedText }])}>Join Date</Text>
                  <View style={s([styles.inputContainer, { borderColor: inputBorder, backgroundColor: cardBg }])}>
                    <Calendar size={fs(4)} color={lightText} style={s(styles.inputIconInline)} />
                    <TextInput
                      style={s([styles.textInput, { color: tintColor }, !editingWorkInfo && [styles.textInputDisabled, { backgroundColor: isLightTheme ? "#F8FAFC" : "#27272a" }]])}
                      value={editedWorkInfo?.joinDate ? new Date(editedWorkInfo.joinDate).toISOString().split("T")[0] : ""}
                      onChangeText={(text) => setEditedWorkInfo({ ...editedWorkInfo, joinDate: text })}
                      editable={editingWorkInfo}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={lightText}
                    />
                  </View>
                </View>

                <View style={s(styles.inputGroup)}>
                  <Text style={s([styles.label, { color: mutedText }])}>Employee ID</Text>
                  <View style={s([styles.inputContainer, { borderColor: inputBorder, backgroundColor: isLightTheme ? "#F8FAFC" : "#27272a" }])}>
                    <User size={fs(4)} color={lightText} style={s(styles.inputIconInline)} />
                    <TextInput style={s([styles.textInput, styles.textInputDisabled, { color: mutedText }])} value={editedWorkInfo?.employeeId || editedWorkInfo?.id || ""} editable={false} />
                  </View>
                </View>
              </View>

              <View style={s([styles.cardActionsRow, { marginTop: hp(1.8) }])}>
                {editingWorkInfo ? (
                  <>
                    <TouchableOpacity style={s([styles.btn, styles.btnOutline, { borderColor: inputBorder, backgroundColor: cardBg }])} onPress={() => setEditingWorkInfo(false)}>
                      <Text style={s([styles.btnOutlineText, { color: primaryColor }])}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s([styles.btn, styles.btnPrimary, { backgroundColor: primaryColor }])} onPress={handleSaveWorkInfo}>
                      <Text style={s(styles.btnPrimaryText)}>Save</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity style={s([styles.btn, styles.btnOutline, { width: "100%", borderColor: inputBorder, backgroundColor: cardBg }])} onPress={() => setEditingWorkInfo(true)}>
                    <Edit2 size={fs(4)} color={primaryColor} style={s(styles.btnIcon)} />
                    <Text style={s([styles.btnOutlineText, { color: primaryColor }])}>Edit Information</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Modular Section 4: Document Verification Flow Blocks */}
            <View style={s([styles.card, { backgroundColor: cardBg, borderColor: border }])}>
              <View style={s(styles.cardHeader)}>
                <View style={s([styles.stepCircle, { backgroundColor: isPrimaryIdVerified && isSecondaryIdVerified ? successBg : errorBg }])}>
                  <Text style={s([styles.stepCircleText, { color: isPrimaryIdVerified && isSecondaryIdVerified ? successText : errorText }])}>4</Text>
                </View>
                <Text style={s([styles.cardTitle, { color: tintColor }])}>Identity Verification</Text>
              </View>
              <Text style={s([styles.cardDescription, { color: mutedText }])}>Upload 2 different government IDs (Required)</Text>

              <View style={s([styles.documentUploadBox, { borderColor: border, backgroundColor: isLightTheme ? "#F8FAFC" : "#27272a" }])}>
                <Text style={s([styles.docBoxTitle, { color: tintColor }])}>Primary ID (Driver License or Passport)</Text>
                {renderDropdownTrigger("Select ID Type", primaryIdType, "primaryIdType", [
                  { label: "Driver License", value: "driver_license" },
                  { label: "Passport", value: "passport" },
                ])}
                
                {primaryIdFrontData ? (
                  <View style={s(styles.documentPreviewWrapper)}>
                    <Text style={s([styles.previewLabel, { color: mutedText }])}>Front Image Uploaded:</Text>
                    <Image source={{ uri: primaryIdFrontData.startsWith("data:") ? primaryIdFrontData : `data:image/jpeg;base64,${primaryIdFrontData}` }} style={s(styles.docImageInlineThumbnail)} />
                  </View>
                ) : null}

                {primaryIdBackData ? (
                  <View style={s(styles.documentPreviewWrapper)}>
                    <Text style={s([styles.previewLabel, { color: mutedText }])}>Back Image Uploaded:</Text>
                    <Image source={{ uri: primaryIdBackData.startsWith("data:") ? primaryIdBackData : `data:image/jpeg;base64,${primaryIdBackData}` }} style={s(styles.docImageInlineThumbnail)} />
                  </View>
                ) : null}

                <View style={s(styles.dualButtonRow)}>
                  <TouchableOpacity style={s([styles.btn, styles.btnOutline, { flex: 1, borderColor: inputBorder, backgroundColor: cardBg }])} onPress={() => handleGenericFileUpload(setUploadingPrimaryIdFront, setPrimaryIdFrontData)}>
                    <Upload size={fs(3.5)} color={primaryColor} style={s({ marginRight: wp(1) })} />
                    <Text style={s([styles.btnOutlineText, { color: primaryColor }])} numberOfLines={1}>{primaryIdFrontData ? "Replace Front" : "Upload Front"}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={s([styles.btn, styles.btnOutline, { flex: 1, borderColor: inputBorder, backgroundColor: cardBg }])} onPress={() => handleGenericFileUpload(setUploadingPrimaryIdBack, setPrimaryIdBackData)}>
                    <Upload size={fs(3.5)} color={primaryColor} style={s({ marginRight: wp(1) })} />
                    <Text style={s([styles.btnOutlineText, { color: primaryColor }])} numberOfLines={1}>{primaryIdBackData ? "Replace Back" : "Upload Back"}</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={s([styles.btn, styles.btnPrimary, { marginTop: hp(1.2), backgroundColor: primaryColor }])} onPress={handleSavePrimaryId} disabled={savingPrimaryId}>
                  {savingPrimaryId ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={s(styles.btnPrimaryText)}>Save Primary ID</Text>}
                </TouchableOpacity>
              </View>

              <View style={s([styles.documentUploadBox, { borderColor: border, backgroundColor: isLightTheme ? "#F8FAFC" : "#27272a" }])}>
                <Text style={s([styles.docBoxTitle, { color: tintColor }])}>Secondary ID (Social Security Card or Other)</Text>
                {renderDropdownTrigger("Select ID Type", secondaryIdType, "secondaryIdType", [
                  { label: "Social Security Card", value: "ss_card" },
                  { label: "Other ID", value: "other" },
                ])}

                {secondaryIdData ? (
                  <View style={s(styles.documentPreviewWrapper)}>
                    <Text style={s([styles.previewLabel, { color: mutedText }])}>Document Image Uploaded:</Text>
                    <Image source={{ uri: secondaryIdData.startsWith("data:") ? secondaryIdData : `data:image/jpeg;base64,${secondaryIdData}` }} style={s(styles.docImageInlineThumbnail)} />
                  </View>
                ) : null}

                <TouchableOpacity style={s([styles.btn, styles.btnOutline, { width: "100%", borderColor: inputBorder, backgroundColor: cardBg }])} onPress={() => handleGenericFileUpload(setUploadingSecondaryId, setSecondaryIdData)}>
                  <Upload size={fs(3.5)} color={primaryColor} style={s({ marginRight: wp(1) })} />
                  <Text style={s([styles.btnOutlineText, { color: primaryColor }])}>{secondaryIdData ? "Replace ID Card" : "Upload ID Card"}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={s([styles.btn, styles.btnPrimary, { marginTop: hp(1.2), backgroundColor: primaryColor }])} onPress={handleSaveSecondaryId} disabled={savingSecondaryId}>
                  {savingSecondaryId ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={s(styles.btnPrimaryText)}>Save Secondary ID</Text>}
                </TouchableOpacity>
              </View>
            </View>

            {/* Remaining Onboarding Milestone Signatures */}
            <View style={s([styles.card, { backgroundColor: cardBg, borderColor: border }])}>
              <View style={s(styles.cardHeader)}>
                <View style={s([styles.stepCircle, { backgroundColor: isW4Uploaded ? successBg : errorBg }])}><Text style={s([styles.stepCircleText, { color: isW4Uploaded ? successText : errorText }])}>5</Text></View>
                <Text style={s([styles.cardTitle, { color: tintColor }])}>W-4 Tax Form</Text>
              </View>
              <Text style={s([styles.cardDescription, { color: mutedText }])}>Complete your tax withholding information</Text>
              
              {isW4Uploaded ? (
                <View style={s([styles.verificationStatusRowTag, { backgroundColor: successBg }])}>
                  <CheckCircle2 size={fs(3.5)} color={successText} />
                  <Text style={s([styles.verificationStatusRowTagText, { color: successText }])}>Verified</Text>
                </View>
              ) : null}

              <TouchableOpacity style={s([styles.btn, styles.btnOutline, { width: "100%", marginTop: hp(1), borderColor: inputBorder, backgroundColor: cardBg }])} onPress={handleW4FormUpload} disabled={uploadingW4Form}>
                {uploadingW4Form ? <ActivityIndicator size="small" color={primaryColor} /> : (
                  <>
                    <Upload size={fs(4)} color={primaryColor} style={s({ marginRight: wp(1.5) })} />
                    <Text style={s([styles.btnOutlineText, { color: primaryColor }])}>{isW4Uploaded ? "Replace Form" : "Upload Form"}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={s([styles.card, { backgroundColor: cardBg, borderColor: border }])}>
              <View style={s(styles.cardHeader)}>
                <View style={s([styles.stepCircle, { backgroundColor: isHandbookUploaded ? successBg : errorBg }])}><Text style={s([styles.stepCircleText, { color: isHandbookUploaded ? successText : errorText }])}>6</Text></View>
                <Text style={s([styles.cardTitle, { color: tintColor }])}>Employee Handbook</Text>
              </View>
              <Text style={s([styles.cardDescription, { color: mutedText }])}>Read and acknowledge the employee handbook</Text>
              
              {isHandbookUploaded ? (
                <View style={s(styles.documentPreviewWrapper)}>
                  <View style={s([styles.verificationStatusRowTag, { backgroundColor: successBg, marginBottom: hp(1) }])}>
                    <CheckCircle2 size={fs(3.5)} color={successText} />
                    <Text style={s([styles.verificationStatusRowTagText, { color: successText }])}>Verified Handbook Acknowledgment</Text>
                  </View>
                  {onboardingData?.employeeHandbook?.signature ? (
                    <Image source={{ uri: onboardingData.employeeHandbook.signature.startsWith("data:") ? onboardingData.employeeHandbook.signature : `data:image/png;base64,${onboardingData.employeeHandbook.signature}` }} style={s(styles.signatureImageThumbnail)} />
                  ) : null}
                </View>
              ) : null}

              <TouchableOpacity style={s([styles.btn, styles.btnOutline, { width: "100%", marginTop: hp(1), borderColor: inputBorder, backgroundColor: cardBg }])} onPress={handleHandbookSignatureUpload} disabled={uploadingHandbookSignature}>
                {uploadingHandbookSignature ? <ActivityIndicator size="small" color={primaryColor} /> : (
                  <>
                    <Upload size={fs(4)} color={primaryColor} style={s({ marginRight: wp(1.5) })} />
                    <Text style={s([styles.btnOutlineText, { color: primaryColor }])}>{isHandbookUploaded ? "Replace Signature" : "Upload Signature"}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={s([styles.card, { backgroundColor: cardBg, borderColor: border }])}>
              <View style={s(styles.cardHeader)}>
                <View style={s([styles.stepCircle, { backgroundColor: isSignatureUploaded ? successBg : errorBg }])}><Text style={s([styles.stepCircleText, { color: isSignatureUploaded ? successText : errorText }])}>7</Text></View>
                <Text style={s([styles.cardTitle, { color: tintColor }])}>Digital Signature</Text>
              </View>
              <Text style={s([styles.cardDescription, { color: mutedText }])}>Add your digital signature for official documents</Text>
              
              {isSignatureUploaded && onboardingData?.digitalSignature?.signature ? (
                <View style={s(styles.documentPreviewWrapper)}>
                  <Image source={{ uri: onboardingData.digitalSignature.signature.startsWith("data:") ? onboardingData.digitalSignature.signature : `data:image/png;base64,${onboardingData.digitalSignature.signature}` }} style={s(styles.signatureImageThumbnail)} />
                </View>
              ) : null}

              <TouchableOpacity style={s([styles.btn, styles.btnOutline, { width: "100%", marginTop: hp(1), borderColor: inputBorder, backgroundColor: cardBg }])} onPress={handleDigitalSignatureUpload} disabled={uploadingDigitalSignature}>
                {uploadingDigitalSignature ? <ActivityIndicator size="small" color={primaryColor} /> : (
                  <>
                    <Upload size={fs(4)} color={primaryColor} style={s({ marginRight: wp(1.5) })} />
                    <Text style={s([styles.btnOutlineText, { color: primaryColor }])}>{isSignatureUploaded ? "Replace Signature Image" : "Upload Signature Image"}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Dynamic Final Submission Review Panel */}
            <View style={s([styles.card, { borderColor: primaryColor, borderWidth: 2, backgroundColor: cardBg }])}>
              <View style={s(styles.cardHeader)}>
                <View style={s([styles.stepCircle, { backgroundColor: isLightTheme ? "#F1F5F9" : "#27272a" }])}><Text style={s([styles.stepCircleText, { color: mutedText }])}>8</Text></View>
                <Text style={s([styles.cardTitle, { color: tintColor }])}>Review & Submit</Text>
              </View>
              <Text style={s([styles.cardDescription, { color: mutedText }])}>Review all information and submit for admin approval</Text>
              
              <View style={s([styles.submissionStatusBoxContainer, { borderColor: border }])}>
                <View style={s(styles.statusListItemRow)}>
                  <Text style={s([styles.statusListItemLabel, { color: tintColor }])}>Basic Information</Text>
                  <Text style={s([styles.statusListItemBadge, onboardingData?.basicInfo?.completed ? { color: successText } : { color: errorText }])}>
                    {basicInfoStatusText}
                  </Text>
                </View>

                <View style={s(styles.statusListItemRow)}>
                  <Text style={s([styles.statusListItemLabel, { color: tintColor }])}>Background Check (ClearHire®)</Text>
                  <Text style={s([styles.statusListItemBadge, clearHireStatus?.status === "GREEN" ? { color: successText } : { color: errorText }])}>
                    {clearHireStatusText}
                  </Text>
                </View>

                <View style={s(styles.statusListItemRow)}>
                  <Text style={s([styles.statusListItemLabel, { color: tintColor }])}>Work Information</Text>
                  <Text style={s([styles.statusListItemBadge, onboardingData?.workInfo?.completed ? { color: successText } : { color: errorText }])}>
                    {workInfoStatusText}
                  </Text>
                </View>

                <View style={s(styles.statusListItemRow)}>
                  <Text style={s([styles.statusListItemLabel, { color: tintColor }])}>Identity Verification</Text>
                  <Text style={s([styles.statusListItemBadge, identityStatusText === "Completed" ? { color: successText } : { color: errorText }])}>
                    {identityStatusText}
                  </Text>
                </View>

                <View style={s(styles.statusListItemRow)}>
                  <Text style={s([styles.statusListItemLabel, { color: tintColor }])}>W-4 Form</Text>
                  <Text style={s([styles.statusListItemBadge, isW4Uploaded ? { color: successText } : { color: errorText }])}>
                    {w4StatusText}
                  </Text>
                </View>

                <View style={s(styles.statusListItemRow)}>
                  <Text style={s([styles.statusListItemLabel, { color: tintColor }])}>Employee Handbook</Text>
                  <Text style={s([styles.statusListItemBadge, isHandbookUploaded ? { color: successText } : { color: errorText }])}>
                    {handbookStatusText}
                  </Text>
                </View>

                <View style={s(styles.statusListItemRow)}>
                  <Text style={s([styles.statusListItemLabel, { color: tintColor }])}>Digital Signature</Text>
                  <Text style={s([styles.statusListItemBadge, isSignatureUploaded ? { color: successText } : { color: errorText }])}>
                    {signatureStatusText}
                  </Text>
                </View>
              </View>

              {isAllOnboardingCompleted ? (
                <TouchableOpacity style={s([styles.btn, styles.btnPrimary, { width: "100%", marginTop: hp(1.5), backgroundColor: primaryColor }])} onPress={handleSubmitOnboarding} disabled={submittingOnboarding}>
                  <Text style={s(styles.btnPrimaryText)}>{submittingOnboarding ? "Submitting..." : "Submit for Admin Approval"}</Text>
                </TouchableOpacity>
              ) : (
                <View style={s([styles.allCompletedBadgeBanner, { backgroundColor: warningBg, marginTop: hp(1.5) }])}>
                  <AlertCircle size={fs(4)} color={warningText} />
                  <Text style={s([styles.allCompletedBadgeBannerText, { color: warningText }])}>
                    Awaiting Prerequisite Actions
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {currentTab === "settings" && (
          <View style={s(styles.tabContentWrapper)}>
            {/* Identity Cryptography Options */}
            <View style={s([styles.card, { backgroundColor: cardBg, borderColor: border }])}>
              <View style={s(styles.cardHeader)}>
                <Lock size={fs(5)} color={primaryColor} />
                <Text style={s([styles.cardTitle, { color: tintColor }])}>Change Password</Text>
              </View>
              <Text style={s([styles.cardDescription, { color: mutedText }])}>Update your account password</Text>

              <View style={s(styles.formContainer)}>
                <View style={s(styles.inputGroup)}>
                  <Text style={s([styles.label, { color: mutedText }])}>Current Password</Text>
                  <View style={s([styles.inputContainer, { borderColor: inputBorder, backgroundColor: cardBg }])}>
                    <TextInput
                      style={s([styles.textInput, { color: tintColor }])}
                      secureTextEntry={!showCurrentPassword}
                      value={currentPassword}
                      onChangeText={setCurrentPassword}
                      placeholder="Enter current password"
                      placeholderTextColor={lightText}
                    />
                  </View>
                </View>

                <View style={s(styles.inputGroup)}>
                  <Text style={s([styles.label, { color: mutedText }])}>New Password</Text>
                  <View style={s([styles.inputContainer, { borderColor: inputBorder, backgroundColor: cardBg }])}>
                    <TextInput
                      style={s([styles.textInput, { color: tintColor }])}
                      secureTextEntry={!showNewPassword}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      placeholder="Enter new password"
                      placeholderTextColor={lightText}
                    />
                  </View>
                </View>

                <View style={s(styles.inputGroup)}>
                  <Text style={s([styles.label, { color: mutedText }])}>Confirm New Password</Text>
                  <View style={s([styles.inputContainer, { borderColor: inputBorder, backgroundColor: cardBg }])}>
                    <TextInput
                      style={s([styles.textInput, { color: tintColor }])}
                      secureTextEntry={true}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="Confirm new password"
                      placeholderTextColor={lightText}
                    />
                  </View>
                </View>
              </View>

              <TouchableOpacity style={s([styles.btn, styles.btnPrimary, { marginTop: hp(1.8), backgroundColor: primaryColor }])} onPress={handleChangePassword} disabled={changingPassword}>
                {changingPassword ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={s(styles.btnPrimaryText)}>Change Password</Text>}
              </TouchableOpacity>
            </View>

            {/* MFA Infrastructure Configurations */}
            <View style={s([styles.card, { backgroundColor: cardBg, borderColor: border }])}>
              <View style={s(styles.cardHeader)}>
                <Shield size={fs(5)} color={primaryColor} />
                <Text style={s([styles.cardTitle, { color: tintColor }])}>Two-Factor Authentication</Text>
              </View>
              <Text style={s([styles.cardDescription, { color: mutedText }])}>Add an extra layer of security to your account</Text>

              <View style={s([styles.switchRowContainer, { borderColor: border, backgroundColor: isLightTheme ? "#F8FAFC" : "#27272a" }])}>
                <View style={s({ flex: 1, paddingRight: wp(2) })}>
                  <Text style={s([styles.switchRowLabel, { color: tintColor }])}>Authenticator App</Text>
                  <Text style={s([styles.switchRowDescription, { color: mutedText }])}>Use an authenticator app to generate one-time codes</Text>
                </View>
                <Switch
                  value={!!editedProfile?.mfaEnabled}
                  onValueChange={(val) => val ? handleMfaSetup() : handleMfaDisable()}
                  trackColor={{ false: "#CBD5E1", true: "#93C5FD" }}
                  thumbColor={editedProfile?.mfaEnabled ? primaryColor : "#F1F5F9"}
                />
              </View>
            </View>

            {/* Localization and Regionalization Preferences */}
            <View style={s([styles.card, { backgroundColor: cardBg, borderColor: border }])}>
              <View style={s(styles.cardHeader)}>
                <Globe size={fs(5)} color={primaryColor} />
                <Text style={s([styles.cardTitle, { color: tintColor }])}>Localization & Holiday Preferences</Text>
              </View>
              <Text style={s([styles.cardDescription, { color: mutedText }])}>Configure language, timezone, and country for dynamic seasonal headers</Text>

              <View style={s(styles.formContainer)}>
                {renderDropdownTrigger("Language", userSettings.language, "language", [
                  { label: "English (US/UK)", value: "en" },
                  { label: "Français (French)", value: "fr" },
                  { label: "Deutsch (German)", value: "de" },
                  { label: "Español (Spanish)", value: "es" },
                ])}

                {renderDropdownTrigger("Home Region / Country", userSettings.countryCode, "countryCode", [
                  { label: "United States (US)", value: "US" },
                  { label: "India (IN)", value: "IN" },
                  { label: "Germany (DE)", value: "DE" },
                  { label: "Canada (CA)", value: "CA" },
                ])}

                {renderDropdownTrigger("Preferred Timezone", userSettings.timezone, "timezone", [
                  { label: "Eastern Time (New York)", value: "America/New_York" },
                  { label: "Greenwich Mean Time (London)", value: "Europe/London" },
                  { label: "India Standard Time (Kolkata)", value: "Asia/Kolkata" },
                  { label: "Coordinated Universal Time (UTC)", value: "UTC" },
                ])}
              </View>

              <TouchableOpacity style={s([styles.btn, styles.btnPrimary, { marginTop: hp(1.8), backgroundColor: primaryColor }])} onPress={handleSaveLocalization} disabled={savingSettings}>
                {savingSettings ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={s(styles.btnPrimaryText)}>Save Localization</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Video Media Playback Modal Context */}
      <Modal visible={historyModalOpen} transparent={true} animationType="slide">
        <View style={s(styles.modalOverlay)}>
          <View style={s([styles.modalContent, { backgroundColor: cardBg }])}>
            <View style={s([styles.modalHeader, { borderBottomColor: border }])}>
              <Text style={s([styles.modalTitle, { color: tintColor }])}>Video Message</Text>
              <TouchableOpacity onPress={() => setHistoryModalOpen(false)}>
                <X size={fs(5)} color={tintColor} />
              </TouchableOpacity>
            </View>
            {selectedVideoHistory ? (
              <View style={s(styles.modalBody)}>
                <Video
                  source={{ uri: selectedVideoHistory.videoUrl }}
                  style={s(styles.videoPlayer)}
                  useNativeControls
                  resizeMode={ResizeMode.CONTAIN}
                  shouldPlay
                />
                <View style={s(styles.videoMetaDetails)}>
                  <Text style={s([styles.videoMetaTitle, { color: tintColor }])}>{selectedVideoHistory.title}</Text>
                  <Text style={s([styles.videoMetaSubtitle, { color: mutedText }])}>{selectedVideoHistory.subtitle || "Executive update"}</Text>
                  <Text style={s([styles.videoMetaFootnote, { color: lightText }])}>Delivered: {new Date(selectedVideoHistory.deliveredAt).toLocaleString()}</Text>
                  <Text style={s([styles.videoMetaFootnote, { color: lightText }])}>Replays: {selectedVideoHistory.replayCount}</Text>
                </View>
              </View>
            ) : (
              <Text style={s([styles.emptyStateText, { color: lightText }])}>No video records available.</Text>
            )}
          </View>
        </View>
      </Modal>

      {/* Cryptographic MFA Multi-factor Modal Overlay */}
      <Modal visible={mfaModalOpen} transparent={true} animationType="fade">
        <View style={s(styles.modalOverlay)}>
          <View style={s([styles.modalContent, { backgroundColor: cardBg }])}>
            <View style={s([styles.modalHeader, { borderBottomColor: border }])}>
              <Text style={s([styles.modalTitle, { color: tintColor }])}>Set Up Two-Factor Authentication</Text>
              <TouchableOpacity onPress={() => setMfaModalOpen(false)}>
                <X size={fs(5)} color={tintColor} />
              </TouchableOpacity>
            </View>
            <ScrollView style={s(styles.modalBody)} showsVerticalScrollIndicator={false}>
              <Text style={s([styles.cardDescription, { color: mutedText }])}>Enter this secret key manually in your authenticator app:</Text>
              <View style={s([styles.secretTokenKeyBox, { borderColor: border, backgroundColor: isLightTheme ? "#F1F5F9" : "#27272a" }])}>
                <Text style={s([styles.secretTokenKeyText, { color: primaryColor }])}>{mfaSecret || "GENERATING_KEY..."}</Text>
              </View>
              <View style={s(styles.inputGroup)}>
                <Text style={s([styles.label, { color: mutedText }])}>Enter 6-digit code from authenticator app</Text>
                <TextInput
                  style={s([styles.textInput, styles.mfaTextInputCode, { color: tintColor, borderColor: inputBorder, backgroundColor: cardBg }])}
                  value={mfaCode}
                  onChangeText={(t) => setMfaCode(t.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  placeholderTextColor={lightText}
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>
              <View style={s(styles.modalFooterActions)}>
                <TouchableOpacity style={s([styles.btn, styles.btnOutline, { flex: 1, borderColor: inputBorder, backgroundColor: cardBg }])} onPress={() => setMfaModalOpen(false)}>
                  <Text style={s([styles.btnOutlineText, { color: primaryColor }])}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s([styles.btn, styles.btnPrimary, { flex: 1, backgroundColor: primaryColor }])} onPress={handleMfaVerify} disabled={mfaCode.length !== 6 || mfaLoading}>
                  <Text style={s(styles.btnPrimaryText)}>{mfaLoading ? "Verifying..." : "Verify"}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Bottom Option Picker Modal Shell */}
      <Modal visible={activePicker !== null} transparent={true} animationType="fade">
        <TouchableOpacity style={s(styles.pickerModalOverlay)} activeOpacity={1} onPress={() => setActivePicker(null)}>
          <View style={s([styles.pickerModalContent, { backgroundColor: cardBg }])}>
            <Text style={s([styles.pickerModalTitle, { color: mutedText }])}>Select Option</Text>
            <ScrollView style={s({ maxHeight: hp(30) })}>
              {activePicker?.options.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={s([styles.pickerItemRow, { borderBottomColor: border }])}
                  onPress={() => {
                    if (activePicker.type === "primaryIdType") setPrimaryIdType(opt.value);
                    if (activePicker.type === "secondaryIdType") setSecondaryIdType(opt.value);
                    if (activePicker.type === "language") setUserSettings((p) => ({ ...p, language: opt.value }));
                    if (activePicker.type === "countryCode") setUserSettings((p) => ({ ...p, countryCode: opt.value }));
                    if (activePicker.type === "timezone") setUserSettings((p) => ({ ...p, timezone: opt.value }));
                    setActivePicker(null);
                  }}
                >
                  <Text style={s([styles.pickerItemText, { color: tintColor }])}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

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
    padding: wp(5),
  },
  loadingText: {
    marginTop: hp(1.5),
    fontSize: fs(3.5),
    textAlign: "center",
  },
  scrollContainer: {
    padding: wp(4),
    paddingBottom: hp(5),
  },
  card: {
    borderRadius: wp(3),
    padding: wp(4),
    marginBottom: hp(2),
    borderWidth: 1,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: hp(1),
  },
  cardTitle: {
    fontSize: fs(4),
    fontWeight: "700",
    marginLeft: wp(2),
  },
  cardDescription: {
    fontSize: fs(3.2),
    lineHeight: fs(4.5),
    marginBottom: hp(1.5),
  },
  headerLayout: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarWrapper: {
    position: "relative",
    marginRight: wp(4),
  },
  avatarImage: {
    width: wp(20),
    height: wp(20),
    borderRadius: wp(10),
    borderWidth: 2,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  avatarFallback: {
    width: wp(20),
    height: wp(20),
    borderRadius: wp(10),
    justifyContent: "center",
    alignItems: "center",
  },
  avatarFallbackText: {
    color: "#FFFFFF",
    fontSize: fs(6),
    fontWeight: "700",
  },
  cameraButton: {
    position: "absolute",
    bottom: -hp(0.25),
    right: -wp(0.5),
    width: wp(7),
    height: wp(7),
    borderRadius: wp(3.5),
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  metaWrapper: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  profileName: {
    fontSize: fs(5),
    fontWeight: "700",
    marginRight: wp(2),
  },
  badgeSuccess: {
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.25),
    borderRadius: wp(3),
  },
  badgeSuccessText: {
    fontSize: fs(2.8),
    fontWeight: "600",
  },
  profileJobTitle: {
    fontSize: fs(3.5),
    marginTop: hp(0.25),
    marginBottom: hp(0.75),
  },
  iconMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: hp(0.25),
  },
  iconMetaText: {
    fontSize: fs(3),
    marginLeft: wp(1),
  },
  heroEditProfileButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: hp(0.75),
    paddingVertical: hp(0.5),
    paddingHorizontal: wp(2),
    borderRadius: wp(1),
    borderWidth: 1,
    alignSelf: "flex-start",
    gap: wp(1),
  },
  heroEditProfileButtonText: {
    fontSize: fs(2.8),
    fontWeight: "600",
  },
  cardActionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: wp(2),
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(4),
    borderRadius: wp(2),
    height: hp(5.2),
    flex: 1,
  },
  btnPrimary: {
    flex: 1,
  },
  btnPrimaryText: {
    color: "#FFFFFF",
    fontSize: fs(3.5),
    fontWeight: "600",
  },
  btnOutline: {
    borderWidth: 1,
    flex: 1,
  },
  btnOutlineText: {
    fontSize: fs(3.5),
    fontWeight: "600",
  },
  btnIcon: {
    marginRight: wp(1.5),
  },
  emptyStateContainer: {
    paddingVertical: hp(2.5),
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: wp(2),
  },
  emptyStateText: {
    fontSize: fs(3.2),
  },
  videoHistoryBox: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: wp(2),
    padding: wp(3),
    marginBottom: hp(1.2),
    alignItems: "center",
  },
  videoBoxTitle: {
    fontSize: fs(3.5),
    fontWeight: "600",
  },
  videoBoxSubtitle: {
    fontSize: fs(3),
    marginTop: hp(0.25),
  },
  videoBoxDate: {
    fontSize: fs(2.8),
    marginTop: hp(0.5),
  },
  videoActionColumn: {
    alignItems: "flex-end",
    justifyContent: "center",
    gap: hp(0.75),
  },
  replayBadge: {
    paddingHorizontal: wp(1.5),
    paddingVertical: hp(0.25),
    borderRadius: wp(1),
  },
  replayBadgeText: {
    fontSize: fs(2.8),
  },
  tabsContainer: {
    flexDirection: "row",
    padding: wp(1),
    borderRadius: wp(2),
    marginBottom: hp(2),
  },
  tabButton: {
    flex: 1,
    paddingVertical: hp(1),
    alignItems: "center",
    borderRadius: wp(1.5),
  },
  tabButtonActive: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  tabButtonText: {
    fontSize: fs(3.5),
    fontWeight: "500",
  },
  tabContentWrapper: {
    gap: hp(0.5),
  },
  progressContainer: {
    marginVertical: hp(1.2),
  },
  progressTextRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: hp(0.75),
  },
  progressLabel: {
    fontSize: fs(3.2),
  },
  progressPercent: {
    fontSize: fs(3.2),
    fontWeight: "700",
  },
  progressBarTrack: {
    height: hp(1),
    borderRadius: wp(1),
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: wp(1),
  },
  statusBlockRow: {
    borderRadius: wp(2),
    padding: wp(3),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: hp(0.75),
  },
  statusBlockLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  statusIndicatorDot: {
    width: wp(2.5),
    height: wp(2.5),
    borderRadius: wp(1.25),
    marginRight: wp(2.5),
  },
  statusBlockTitle: {
    fontSize: fs(3.5),
    fontWeight: "600",
  },
  statusBlockSubtitle: {
    fontSize: fs(3),
    marginTop: hp(0.25),
  },
  warningNoticeBox: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: wp(2),
    padding: wp(3),
    marginTop: hp(1.5),
  },
  warningNoticeTitle: {
    fontSize: fs(3.2),
    fontWeight: "600",
  },
  warningNoticeContent: {
    fontSize: fs(3),
    lineHeight: fs(4),
    marginTop: hp(0.25),
  },
  stepCircle: {
    width: wp(7),
    height: wp(7),
    borderRadius: wp(3.5),
    justifyContent: "center",
    alignItems: "center",
  },
  stepCircleText: {
    fontSize: fs(3.2),
    fontWeight: "700",
  },
  formContainer: {
    marginTop: hp(1.2),
    gap: hp(1.5),
  },
  inputGroup: {
    gap: hp(0.75),
  },
  label: {
    fontSize: fs(3.2),
    fontWeight: "500",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: wp(2),
    paddingHorizontal: wp(3),
    height: hp(5.2),
  },
  inputIconInline: {
    marginRight: wp(2),
  },
  textInput: {
    flex: 1,
    fontSize: fs(3.5),
    paddingVertical: 0,
  },
  textInputDisabled: {
    color: "#64748B",
  },
  documentUploadBox: {
    borderWidth: 1,
    borderRadius: wp(2),
    padding: wp(3),
    marginTop: hp(1.2),
  },
  docBoxTitle: {
    fontSize: fs(3.5),
    fontWeight: "600",
    marginBottom: hp(1.2),
  },
  documentPreviewWrapper: {
    marginVertical: hp(1),
    alignItems: "flex-start",
  },
  previewLabel: {
    fontSize: fs(3),
    marginBottom: hp(0.5),
  },
  docImageInlineThumbnail: {
    width: "100%",
    height: hp(15),
    borderRadius: wp(1.5),
    backgroundColor: "rgba(0,0,0,0.05)",
    resizeMode: "contain",
  },
  signatureImageThumbnail: {
    width: wp(40),
    height: hp(7.5),
    borderRadius: wp(1),
    backgroundColor: "rgba(0,0,0,0.02)",
    resizeMode: "contain",
  },
  verificationStatusRowTag: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.5),
    borderRadius: wp(1),
    gap: wp(1),
  },
  verificationStatusRowTagText: {
    fontSize: fs(3),
    fontWeight: "600",
  },
  dualButtonRow: {
    flexDirection: "row",
    gap: wp(2),
    marginTop: hp(0.75),
  },
  dropdownTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: wp(2),
    paddingHorizontal: wp(3),
    height: hp(5.2),
  },
  dropdownTriggerText: {
    fontSize: fs(3.5),
  },
  switchRowContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: wp(2),
    padding: wp(3),
    marginTop: hp(0.75),
  },
  switchRowLabel: {
    fontSize: fs(3.5),
    fontWeight: "600",
  },
  switchRowDescription: {
    fontSize: fs(3),
    marginTop: hp(0.25),
  },
  submissionStatusBoxContainer: {
    borderWidth: 1,
    borderRadius: wp(2),
    padding: wp(3),
    backgroundColor: "rgba(0,0,0,0.01)",
    marginVertical: hp(1),
    gap: hp(1),
  },
  statusListItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusListItemLabel: {
    fontSize: fs(3.2),
    fontWeight: "500",
  },
  statusListItemBadge: {
    fontSize: fs(3.2),
    fontWeight: "700",
  },
  allCompletedBadgeBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: wp(2.5),
    borderRadius: wp(2),
    gap: wp(1.5),
  },
  allCompletedBadgeBannerText: {
    fontSize: fs(3.5),
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: wp(5),
  },
  modalContent: {
    borderRadius: wp(4),
    width: "100%",
    maxWidth: 400,
    maxHeight: "85%",
    padding: wp(4),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    paddingBottom: hp(1.2),
    marginBottom: hp(1.5),
  },
  modalTitle: {
    fontSize: fs(4),
    fontWeight: "700",
  },
  modalBody: {
    gap: hp(1.5),
  },
  videoPlayer: {
    width: "100%",
    height: hp(25),
    borderRadius: wp(2),
    backgroundColor: "#000000",
  },
  videoMetaDetails: {
    marginTop: hp(1.2),
    gap: hp(0.5),
  },
  videoMetaTitle: {
    fontSize: fs(3.5),
    fontWeight: "700",
  },
  videoMetaSubtitle: {
    fontSize: fs(3),
  },
  videoMetaFootnote: {
    fontSize: fs(2.8),
  },
  secretTokenKeyBox: {
    borderRadius: wp(2),
    padding: wp(3),
    borderWidth: 1,
    alignItems: "center",
    marginVertical: hp(1),
  },
  secretTokenKeyText: {
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontSize: fs(3.5),
    fontWeight: "700",
    letterSpacing: 1,
  },
  mfaTextInputCode: {
    textAlign: "center",
    fontSize: fs(5),
    fontWeight: "700",
    letterSpacing: 4,
    borderWidth: 1,
    borderRadius: wp(2),
    height: hp(5.8),
  },
  modalFooterActions: {
    flexDirection: "row",
    gap: wp(2),
    marginTop: hp(2),
  },
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "flex-end",
  },
  pickerModalContent: {
    borderTopLeftRadius: wp(4),
    borderTopRightRadius: wp(4),
    padding: wp(4),
    paddingBottom: hp(3.8),
  },
  pickerModalTitle: {
    fontSize: fs(3.8),
    fontWeight: "700",
    marginBottom: hp(1.5),
    textAlign: "center",
  },
  pickerItemRow: {
    paddingVertical: hp(1.8),
    borderBottomWidth: 1,
    alignItems: "center",
  },
  pickerItemText: {
    fontSize: fs(3.5),
    fontWeight: "500",
  },
});