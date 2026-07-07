import React, { useState, useEffect, useMemo } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
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

export default function Profile() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"personal" | "onboarding">("personal");
  const [tokenReady, setTokenReady] = useState(false);
  const [editedProfile, setEditedProfile] = useState<ProfileData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submittingOnboarding, setSubmittingOnboarding] = useState(false);
  const [uploadingFields, setUploadingFields] = useState<Record<string, boolean>>({});
  const [secondaryIdType, setSecondaryIdType] = useState("");
  
  // Track network image errors locally
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

  // Initialize session verification proxy engine
  useEffect(() => {
    (async () => {
      await initToken();
      setTokenReady(true);
    })();
  }, []);

  // 1. Fetch profile core data
  const { data: primaryProfileRes, isLoading: loadingProfile } = useQuery({
    queryKey: ["profileMe"],
    queryFn: () => apiFetch<{ item: ProfileData }>("/api/employees/me"),
  });

  const baseProfile = primaryProfileRes?.item;

  // 2. Fetch extended chat/live profile data
  const { data: conversationProfile, isLoading: loadingConvProfile } = useQuery({
    queryKey: ["conversationProfile", baseProfile?.email],
    queryFn: async () => {
      const res = await fetch(`https://task.se7eninc.com/api/messages/conversations/${baseProfile?.email}`);
      if (!res.ok) throw new Error("Failed to fetch conversations profile");
      return res.json() as Promise<ProfileData>;
    },
    enabled: !!baseProfile?.email,
  });

  // 3. Fetch User Settings (Avatar Customization Engine Data Source)
  const { data: userSettingsRes, isLoading: loadingSettings } = useQuery({
    queryKey: ["settings"],
    queryFn: () => apiFetch<{ item: any }>("/api/settings"),
  });

  // 4. Fetch Onboarding Data
  const { data: onboardingRes, isLoading: loadingOnboarding } = useQuery({
    queryKey: ["onboardingMe"],
    queryFn: () => apiFetch<{ item: OnboardingData }>("/api/onboarding/me"),
  });

  const onboardingData = onboardingRes?.item;

  // --- COMPREHENSIVE AVATAR RESOLUTION PIPELINE ---
  const avatarRaw =
    userSettingsRes?.item?.avatarDataUrl ||
    userSettingsRes?.item?.avatarUrl ||
    conversationProfile?.avatarUrl ||
    baseProfile?.avatarUrl ||
    null;

  const avatarUrl = useMemo(() => {
    if (!avatarRaw) return null;
    return avatarRaw.startsWith("http") || avatarRaw.startsWith("data:")
      ? avatarRaw
      : `https://task.se7eninc.com${avatarRaw}`;
  }, [avatarRaw]);

  // Route URL queries through internal authentication reverse proxy to avoid AWS 403 blocks
  const resolvedAvatarUri = useMemo(() => {
    if (!avatarUrl) return null;
    if (avatarUrl.startsWith("data:")) return avatarUrl; // Render base64 image data explicitly
    return tokenReady ? toProxiedUrl(avatarUrl) : null;
  }, [avatarUrl, tokenReady]);

  // Fallback Initials Calculation Matrix
  const initials = useMemo(() => {
    return (baseProfile?.name || baseProfile?.email || "M")
      .split(" ")
      .filter(Boolean)
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }, [baseProfile?.name, baseProfile?.email]);

  // Reset local rendering context errors if a brand new target URI arrives
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
      const base64String = `data:image/jpeg;base64,${asset.base64}`;
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
      const base64String = `data:${mimeType};base64,${base64Content}`;

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
      <View style={[styles.centered, { backgroundColor: "#09090b" }]}>
        <ActivityIndicator size="large" color="#ffd27a" />
        <Text style={{ marginTop: 8, color: "#a1a1aa" }}>Loading Profile...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: "#09090b" }} 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.titleHeading}>Profile</Text>

        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === "personal" && styles.activeTabButton]} 
            onPress={() => setActiveTab("personal")}
          >
            <Text style={[styles.tabText, activeTab === "personal" && styles.activeTabText]}>Personal Info</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === "onboarding" && styles.activeTabButton]} 
            onPress={() => setActiveTab("onboarding")}
          >
            <Text style={[styles.tabText, activeTab === "onboarding" && styles.activeTabText]}>Onboarding</Text>
          </TouchableOpacity>
        </View>

        {activeTab === "personal" ? (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Identity & Core Settings</Text>
              {!isEditing ? (
                <TouchableOpacity style={styles.outlineButton} onPress={() => setIsEditing(true)}>
                  <Edit2 size={12} color="#ffd27a" style={{ marginRight: 4 }} />
                  <Text style={styles.outlineButtonText}>Edit</Text>
                </TouchableOpacity>
              ) : (
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TouchableOpacity style={styles.actionCancelBtn} onPress={handleCancelEdit}>
                    <X size={14} color="#f4f4f5" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionSaveBtn} onPress={handleSaveProfile} disabled={saving}>
                    <Save size={14} color="#09090b" />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={styles.cardContent}>
              <View style={styles.avatarRow}>
                <View style={styles.avatarWrapper}>
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
                        console.warn("Avatar loading encountered an issue:", e.nativeEvent.error);
                        setAvatarLoadError(true);
                      }}
                    />
                  ) : (
                    <View style={[styles.avatarImage, styles.avatarFallback]}>
                      <Text style={styles.avatarFallbackText}>{initials}</Text>
                    </View>
                  )}
                  <TouchableOpacity style={styles.cameraBadge} onPress={handleImageUpload} disabled={uploadingImage}>
                    <Camera size={12} color="#09090b" />
                  </TouchableOpacity>
                </View>
                <View style={{ marginLeft: 16, flex: 1 }}>
                  <Text style={styles.profileName}>{baseProfile?.name}</Text>
                  <Text style={styles.profileEmail}>{baseProfile?.email}</Text>
                  {conversationProfile?.department && (
                    <Text style={styles.departmentText}>Dept: {conversationProfile.department}</Text>
                  )}
                  <View style={styles.badgeRow}>
                    <View style={styles.badge}><Text style={styles.badgeText}>{baseProfile?.role || "Staff"}</Text></View>
                    {conversationProfile?.current_status && (
                      <View style={[styles.badge, styles.activeStatusBadge]}>
                        <Text style={styles.activeStatusText}>{conversationProfile.current_status}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Full Name</Text>
                <TextInput
                  style={[styles.input, !isEditing && styles.disabledInput]}
                  value={isEditing ? editedProfile?.name : baseProfile?.name}
                  onChangeText={(txt) => setEditedProfile({ ...editedProfile!, name: txt })}
                  editable={isEditing}
                  placeholderTextColor="#52525b"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Email Address</Text>
                <TextInput style={[styles.input, styles.disabledInput]} value={baseProfile?.email} editable={false} />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Phone Line</Text>
                <TextInput
                  style={[styles.input, !isEditing && styles.disabledInput]}
                  value={isEditing ? editedProfile?.phone : baseProfile?.phone}
                  onChangeText={(txt) => setEditedProfile({ ...editedProfile!, phone: txt })}
                  editable={isEditing}
                  keyboardType="phone-pad"
                  placeholderTextColor="#52525b"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Location Base</Text>
                <TextInput
                  style={[styles.input, !isEditing && styles.disabledInput]}
                  value={isEditing ? editedProfile?.location : baseProfile?.location}
                  onChangeText={(txt) => setEditedProfile({ ...editedProfile!, location: txt })}
                  editable={isEditing}
                  placeholderTextColor="#52525b"
                />
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardTitle}>Compliance Verification</Text>
                <Text style={styles.cardSubTitle}>Review files and complete regulatory configurations</Text>
              </View>
            </View>

            <View style={styles.cardContent}>
              {loadingOnboarding ? (
                <ActivityIndicator size="small" color="#ffd27a" />
              ) : (
                <>
                  {onboardingData && (
                    <View style={styles.statusBox}>
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        {onboardingData.overallStatus === "approved" ? (
                          <CheckCircle2 size={16} color="#ffd27a" />
                        ) : (
                          <Clock size={16} color="#a1a1aa" />
                        )}
                        <Text style={styles.statusText}>
                          System Token: <Text style={{ textTransform: "uppercase", color: "#ffd27a" }}>{onboardingData.overallStatus}</Text>
                        </Text>
                      </View>
                      <Text style={{ fontSize: 12, color: "#a1a1aa", fontWeight: "600" }}>{getOnboardingProgress()}% Done</Text>
                    </View>
                  )}

                  {onboardingData?.overallStatus !== "approved" && (
                    <>
                      <Text style={styles.sectionHeading}>Personal Record Dossier</Text>
                      <View style={styles.formGroup}><Text style={styles.label}>First Name *</Text><TextInput style={styles.input} value={onboardingForm.firstName} onChangeText={(t) => setOnboardingForm({ ...onboardingForm, firstName: t })} /></View>
                      <View style={styles.formGroup}><Text style={styles.label}>Last Name *</Text><TextInput style={styles.input} value={onboardingForm.lastName} onChangeText={(t) => setOnboardingForm({ ...onboardingForm, lastName: t })} /></View>
                      <View style={styles.formGroup}><Text style={styles.label}>Phone *</Text><TextInput style={styles.input} value={onboardingForm.phone} keyboardType="phone-pad" onChangeText={(t) => setOnboardingForm({ ...onboardingForm, phone: t })} /></View>
                      <View style={styles.formGroup}><Text style={styles.label}>Address Route *</Text><TextInput style={styles.input} value={onboardingForm.address} onChangeText={(t) => setOnboardingForm({ ...onboardingForm, address: t })} /></View>
                      <View style={styles.formGroup}><Text style={styles.label}>City *</Text><TextInput style={styles.input} value={onboardingForm.city} onChangeText={(t) => setOnboardingForm({ ...onboardingForm, city: t })} /></View>
                      <View style={styles.formGroup}><Text style={styles.label}>State *</Text><TextInput style={styles.input} value={onboardingForm.state} onChangeText={(t) => setOnboardingForm({ ...onboardingForm, state: t })} /></View>
                      <View style={styles.formGroup}><Text style={styles.label}>ZIP Index *</Text><TextInput style={styles.input} value={onboardingForm.zip} onChangeText={(t) => setOnboardingForm({ ...onboardingForm, zip: t })} /></View>
                      <View style={styles.formGroup}><Text style={styles.label}>Country *</Text><TextInput style={styles.input} value={onboardingForm.country} onChangeText={(t) => setOnboardingForm({ ...onboardingForm, country: t })} /></View>

                      <Text style={styles.sectionHeading}>Cryptographic & Government Verification</Text>
                      <View style={styles.formGroup}>
                        <Text style={styles.label}>ID Class *</Text>
                        <TouchableOpacity 
                          style={styles.pickerSelector} 
                          onPress={() => showSelectAlert("ID Type", [
                            { label: "Passport", value: "passport" },
                            { label: "Driver's License", value: "drivers_license" },
                            { label: "National ID", value: "national_id" }
                          ], (v) => setOnboardingForm({ ...onboardingForm, idType: v }))}
                        >
                          <Text style={onboardingForm.idType ? styles.pickerText : styles.pickerPlaceholder}>
                            {onboardingForm.idType || "Select ID Type"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                      
                      <View style={styles.formGroup}>
                        <Text style={styles.label}>ID Serial String *</Text>
                        <TextInput style={styles.input} value={onboardingForm.idNumber} onChangeText={(t) => setOnboardingForm({ ...onboardingForm, idNumber: t })} />
                      </View>

                      <View style={styles.formGroup}>
                        <Text style={styles.label}>Primary ID Asset (Front) *</Text>
                        <TouchableOpacity style={styles.fileUploadBtn} onPress={() => handleDocumentSelection("idFrontUrl")}>
                          {uploadingFields["idFrontUrl"] ? <ActivityIndicator size="small" color="#ffd27a" /> : <Text style={styles.uploadBtnText}>{onboardingData?.identityVerification?.idFrontUrl ? "Asset Secured ✓" : "Attach File"}</Text>}
                        </TouchableOpacity>
                      </View>

                      <View style={styles.formGroup}>
                        <Text style={styles.label}>Primary ID Asset (Back)</Text>
                        <TouchableOpacity style={styles.fileUploadBtn} onPress={() => handleDocumentSelection("idBackUrl")}>
                          {uploadingFields["idBackUrl"] ? <ActivityIndicator size="small" color="#ffd27a" /> : <Text style={styles.uploadBtnText}>{onboardingData?.identityVerification?.idBackUrl ? "Asset Secured ✓" : "Attach File"}</Text>}
                        </TouchableOpacity>
                      </View>

                      <View style={styles.formGroup}>
                        <Text style={styles.label}>Secondary Verification Class *</Text>
                        <TouchableOpacity 
                          style={styles.pickerSelector} 
                          onPress={() => showSelectAlert("Secondary ID Type", [
                            { label: "Social Security Card", value: "ss_card" },
                            { label: "Other", value: "other" }
                          ], (v) => setSecondaryIdType(v))}
                        >
                          <Text style={secondaryIdType ? styles.pickerText : styles.pickerPlaceholder}>
                            {secondaryIdType || "Select Token Variant"}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      <View style={styles.formGroup}>
                        <Text style={styles.label}>Secondary ID Asset *</Text>
                        <TouchableOpacity style={styles.fileUploadBtn} onPress={() => handleDocumentSelection("secondaryIdUrl")}>
                          {uploadingFields["secondaryIdUrl"] ? <ActivityIndicator size="small" color="#ffd27a" /> : <Text style={styles.uploadBtnText}>{onboardingData?.identityVerification?.secondaryIdUrl ? "Asset Secured ✓" : "Attach File"}</Text>}
                        </TouchableOpacity>
                      </View>

                      <Text style={styles.sectionHeading}>Tax Vault Information</Text>
                      <View style={styles.formGroup}>
                        <Text style={styles.label}>SSN Vault Token *</Text>
                        <TextInput style={styles.input} secureTextEntry value={onboardingForm.ssn} onChangeText={(t) => setOnboardingForm({ ...onboardingForm, ssn: t })} />
                      </View>
                      <View style={styles.formGroup}>
                        <Text style={styles.label}>Filing Strategy Group *</Text>
                        <TouchableOpacity 
                          style={styles.pickerSelector} 
                          onPress={() => showSelectAlert("Tax Status", [
                            { label: "Single", value: "single" },
                            { label: "Married Filing Jointly", value: "married_joint" },
                            { label: "Married Filing Separately", value: "married_separate" },
                            { label: "Head of Household", value: "head_of_household" }
                          ], (v) => setOnboardingForm({ ...onboardingForm, taxFilingStatus: v }))}
                        >
                          <Text style={onboardingForm.taxFilingStatus ? styles.pickerText : styles.pickerPlaceholder}>
                            {onboardingForm.taxFilingStatus || "Select Group Status"}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      <Text style={styles.sectionHeading}>Financial Settlement Ledger</Text>
                      <View style={styles.formGroup}><Text style={styles.label}>Bank Institution *</Text><TextInput style={styles.input} value={onboardingForm.bankName} onChangeText={(t) => setOnboardingForm({ ...onboardingForm, bankName: t })} /></View>
                      <View style={styles.formGroup}><Text style={styles.label}>Account Routing Hex *</Text><TextInput style={styles.input} secureTextEntry value={onboardingForm.accountNumber} onChangeText={(t) => setOnboardingForm({ ...onboardingForm, accountNumber: t })} /></View>
                      <View style={styles.formGroup}><Text style={styles.label}>Transit Clearing Code *</Text><TextInput style={styles.input} value={onboardingForm.routingNumber} onChangeText={(t) => setOnboardingForm({ ...onboardingForm, routingNumber: t })} /></View>

                      <Text style={styles.sectionHeading}>Signed Disclosures</Text>
                      <View style={styles.formGroup}>
                        <Text style={styles.label}>W-4 Regulatory Bind *</Text>
                        <TouchableOpacity style={styles.fileUploadBtn} onPress={() => handleDocumentSelection("w4FormUrl")}>
                          {uploadingFields["w4FormUrl"] ? <ActivityIndicator size="small" color="#ffd27a" /> : <Text style={styles.uploadBtnText}>{onboardingData?.documents?.w4FormUrl ? "Asset Secured ✓" : "Attach File"}</Text>}
                        </TouchableOpacity>
                      </View>
                      <View style={styles.formGroup}>
                        <Text style={styles.label}>Handbook Signature Bind *</Text>
                        <TouchableOpacity style={styles.fileUploadBtn} onPress={() => handleDocumentSelection("handbookSignatureUrl")}>
                          {uploadingFields["handbookSignatureUrl"] ? <ActivityIndicator size="small" color="#ffd27a" /> : <Text style={styles.uploadBtnText}>{onboardingData?.documents?.handbookSignatureUrl ? "Asset Secured ✓" : "Attach File"}</Text>}
                        </TouchableOpacity>
                      </View>

                      <TouchableOpacity style={styles.submitButton} onPress={handleSubmitOnboarding} disabled={submittingOnboarding}>
                        {submittingOnboarding ? (
                          <ActivityIndicator size="small" color="#09090b" />
                        ) : (
                          <Text style={styles.submitButtonText}>
                            {onboardingData?.overallStatus === "submitted" || onboardingData?.overallStatus === "rejected"
                              ? "Re-authorize & Sync Dossier"
                              : "Commit Config Data"}
                          </Text>
                        )}
                      </TouchableOpacity>
                    </>
                  )}

                  {onboardingData?.overallStatus === "approved" && (
                    <View style={styles.approvedBanner}>
                      <CheckCircle2 size={20} color="#ffd27a" />
                      <Text style={styles.approvedText}>Admin system authorization confirmed. Clearance level active.</Text>
                    </View>
                  )}
                </>
              )}
            </View>
          </View>
        )}
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
  container: {
    padding: 16,
    backgroundColor: "#09090b",
  },
  titleHeading: {
    fontSize: 26,
    fontWeight: "800",
    color: "#f4f4f5",
    letterSpacing: 0.5,
    marginBottom: 20,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#18181b",
    padding: 4,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#27272a",
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 6,
  },
  activeTabButton: {
    backgroundColor: "#27272a",
  },
  tabText: {
    fontSize: 13,
    color: "#a1a1aa",
    fontWeight: "600",
  },
  activeTabText: {
    color: "#ffd27a",
    fontWeight: "700",
  },
  card: {
    backgroundColor: "#141417",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: "#27272a",
    paddingBottom: 12,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f4f4f5",
  },
  cardSubTitle: {
    fontSize: 11,
    color: "#a1a1aa",
    marginTop: 2,
  },
  cardContent: {
    marginTop: 4,
  },
  outlineButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#27272a",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#09090b",
  },
  outlineButtonText: {
    color: "#ffd27a",
    fontSize: 12,
    fontWeight: "600",
  },
  actionCancelBtn: {
    padding: 6,
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 6,
    backgroundColor: "#1c1917",
  },
  actionSaveBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: "#ffd27a",
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
    borderColor: "#27272a",
  },
  avatarFallback: {
    backgroundColor: "#27272a",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFallbackText: {
    color: "#ffd27a",
    fontSize: 22,
    fontWeight: "800",
  },
  cameraBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: "#ffd27a",
    padding: 6,
    borderRadius: 99,
    borderWidth: 2,
    borderColor: "#141417",
  },
  profileName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#f4f4f5",
  },
  profileEmail: {
    fontSize: 12,
    color: "#a1a1aa",
    marginTop: 1,
  },
  departmentText: {
    fontSize: 11,
    color: "#ffd27a",
    fontWeight: "600",
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 6,
  },
  badge: {
    backgroundColor: "#27272a",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    color: "#e4e4e7",
    fontWeight: "600",
  },
  activeStatusBadge: {
    backgroundColor: "rgba(255, 210, 122, 0.1)",
    borderWidth: 0.5,
    borderColor: "rgba(255, 210, 122, 0.3)",
  },
  activeStatusText: {
    fontSize: 10,
    color: "#ffd27a",
    fontWeight: "700",
    textTransform: "capitalize",
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    color: "#a1a1aa",
    fontWeight: "600",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#09090b",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#f4f4f5",
    fontSize: 13,
  },
  disabledInput: {
    backgroundColor: "#18181b",
    color: "#71717a",
  },
  statusBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#18181b",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  statusText: {
    fontSize: 12,
    color: "#e4e4e7",
    fontWeight: "600",
    marginLeft: 6,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: "800",
    color: "#ffd27a",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginTop: 12,
    marginBottom: 12,
    borderBottomWidth: 0.5,
    borderColor: "#27272a",
    paddingBottom: 4,
  },
  pickerSelector: {
    backgroundColor: "#09090b",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  pickerText: {
    color: "#f4f4f5",
    fontSize: 13,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  pickerPlaceholder: {
    color: "#52525b",
    fontSize: 13,
  },
  fileUploadBtn: {
    backgroundColor: "#09090b",
    borderWidth: 1,
    borderColor: "#27272a",
    borderStyle: "dashed",
    borderRadius: 6,
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadBtnText: {
    color: "#a1a1aa",
    fontSize: 12,
    fontWeight: "600",
  },
  submitButton: {
    backgroundColor: "#ffd27a",
    borderRadius: 6,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  submitButtonText: {
    color: "#09090b",
    fontSize: 13,
    fontWeight: "800",
  },
  approvedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255, 210, 122, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 210, 122, 0.2)",
    borderRadius: 8,
    padding: 16,
  },
  approvedText: {
    flex: 1,
    fontSize: 13,
    color: "#e4e4e7",
    fontWeight: "600",
    lineHeight: 18,
  },
});