import React, { useEffect, useState, useCallback, useRef } from "react";
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
  FlatList,
  ActivityIndicator,
  Dimensions,
  Platform,
  Alert
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
  Globe,
  Shield,
  Save,
  X,
  Upload,
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronDown,
  FileText,
  ShieldCheck,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  FileCheck
} from "lucide-react-native";

import {
  getEmployeeProfile,
  apiFetch,
  toProxiedUrl,
  getVideoHistory,
  uploadDocument 
} from "@/lib/admin/apiClient";

const { width } = Dimensions.get("window");

// --- TypeScript Interfaces & Models ---
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
  bankInfo?: { accountName?: string; accountNumber?: string; ifsc?: string; bankName?: string; };
  taxSettings?: { pan?: string; tds?: string | number; regime?: string; };
  mfaEnabled?: boolean;
}

interface VideoMessagePayload {
  id: string;
  messageType: string;
  title: string;
  subtitle: string;
  videoUrl: string;
  deliveredAt: string;
  replayCount: number;
}

interface Address {
  street: string;
  city: string;
  state: string;
  zip: string;
  startDate: string;
  endDate: string;
}

interface ClearHireStatus {
  status: "PENDING" | "GREEN" | "YELLOW" | "RED";
  lastChecked: string;
}

// --- Shared Web UI Components ---

function Card({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

function InputField({ label, icon: Icon, rightIcon: RightIcon, onRightIconPress, ...props }: any) {
  return (
    <View style={styles.inputWrapper}>
      {label && <Text style={styles.inputLabel}>{label}</Text>}
      <View style={styles.inputFieldContainer}>
        {Icon && <Icon size={16} color="#71717a" style={styles.inputIcon} />}
        <TextInput
          placeholderTextColor="#4b4b52"
          style={[styles.textInput, props.editable === false && styles.inputDisabled]}
          {...props}
        />
        {RightIcon && (
          <TouchableOpacity onPress={onRightIconPress} style={styles.rightIconWrapper}>
            <RightIcon size={16} color="#a1a1aa" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function GoldButton({ onPress, children, variant = "primary", loading = false, disabled = false, icon: Icon, style }: any) {
  const isPrimary = variant === "primary";
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        styles.btnBase,
        isPrimary ? styles.btnPrimary : styles.btnOutline,
        (disabled || loading) && { opacity: 0.5 },
        style
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={isPrimary ? "#09090b" : "#ffd27a"} />
      ) : (
        <View style={styles.row}>
          {Icon && <Icon size={16} color={isPrimary ? "#09090b" : "#ffd27a"} style={{ marginRight: 6 }} />}
          <Text style={[styles.btnText, { color: isPrimary ? "#09090b" : "#ffd27a" }]}>{children}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function FormCheckboxRow({ value, onValueChange, label }: { value: boolean; onValueChange: (v: boolean) => void; label: string }) {
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={() => onValueChange(!value)} style={[styles.row, { marginVertical: 12, gap: 10, alignItems: "flex-start" }]}>
      <View style={[styles.checkboxBox, value && styles.checkboxBoxChecked, { marginTop: 2 }]}>
        {value && <CheckCircle2 size={12} color="#09090b" />}
      </View>
      <Text style={[styles.mutedText, { flex: 1, marginTop: 0 }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// --- Main Interactive Screen Wrapper ---

export default function ProfileScreen() {
  const [currentTab, setCurrentTab] = useState<"onboarding" | "settings">("onboarding");
  const [profile, setProfile] = useState<EmployeeProfileData | null>(null);
  const [editedProfile, setEditedProfile] = useState<EmployeeProfileData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Video Management State
  const [videoHistory, setVideoHistory] = useState<VideoMessagePayload[]>([]);
  const [loadingVideoHistory, setLoadingVideoHistory] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<VideoMessagePayload | null>(null);
  const [videoModalVisible, setVideoModalVisible] = useState(false);

  // Basic Information Step States (Web Mirror)
  const [isEditingBasicInfo, setIsEditingBasicInfo] = useState(false);
  const [savingBasicInfo, setSavingBasicInfo] = useState(false);

  // General Onboarding State Maps
  const [onboardingData, setOnboardingData] = useState<any>(null);
  const [editedWorkInfo, setEditedWorkInfo] = useState<any>({});
  const [editingWorkInfo, setEditingWorkInfo] = useState(false);

  // --- ClearHire Core Layout Substates ---
  const [clearHireStatus, setClearHireStatus] = useState<ClearHireStatus | null>(null);
  const [loadingClearHire, setLoadingClearHire] = useState(true);
  const [submittingClearHire, setSubmittingClearHire] = useState(false);
  const [chFullName, setChFullName] = useState("");
  const [chDob, setChDob] = useState("");
  const [chSsn, setChSsn] = useState("");
  const [chAddresses, setChAddresses] = useState<Address[]>([
    { street: "", city: "", state: "", zip: "", startDate: "", endDate: "" },
  ]);
  const [chFcraConsent, setChFcraConsent] = useState(false);
  const [chGovIdUri, setChGovIdUri] = useState<string | null>(null);
  const [chSelfieUri, setChSelfieUri] = useState<string | null>(null);

  // --- Identity Validation File Vault Substates ---
  const [primaryIdType, setPrimaryIdType] = useState("driver_license");
  const [secondaryIdType, setSecondaryIdType] = useState("ss_card");
  const [primaryIdFront, setPrimaryIdFront] = useState<string | null>(null);
  const [primaryIdBack, setPrimaryIdBack] = useState<string | null>(null);
  const [secondaryId, setSecondaryId] = useState<string | null>(null);

  // --- Document Paperwork Substates ---
  const [w4FormFile, setW4FormFile] = useState<string | null>(null);
  const [handbookSig, setHandbookSig] = useState<string | null>(null);
  const [digitalSig, setDigitalSig] = useState<string | null>(null);

  // Security Credentials Mutations
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Regionalization State Matrices
  const [userSettings, setUserSettings] = useState({ language: "en", timezone: "UTC", countryCode: "US" });
  const [pickerModalConfig, setPickerModalConfig] = useState<{ visible: boolean; type: "lang" | "country" | "tz" | "primId" | "secId"; data: any[] } | null>(null);

  // Multi-Factor Authentication States
  const [mfaModalOpen, setMfaModalOpen] = useState(false);
  const [mfaSecret, setMfaSecret] = useState("");
  const [mfaQrUrl, setMfaQrUrl] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [mfaLoading, setMfaLoading] = useState(false);

  useEffect(() => {
    initScreenData();
  }, []);

  const initScreenData = async () => {
    try {
      setLoading(true);
      const res = await getEmployeeProfile();
      setProfile(res.item);
      setEditedProfile(res.item);
      setEditedWorkInfo(res.item || {});
      
      if (res.item?.id) {
        await fetchVideoHistory(res.item.id);
      }
      await Promise.all([
        fetchOnboardingRecords(),
        fetchClearHireStatus()
      ]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchVideoHistory = async (id: string) => {
    setLoadingVideoHistory(true);
    try {
      const response = await getVideoHistory(id);
      setVideoHistory(response.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingVideoHistory(false);
    }
  };

  const fetchOnboardingRecords = async () => {
    try {
      const res = await apiFetch<any>("/api/onboarding/me");
      setOnboardingData(res.item);
      if (res.item?.workInfo?.completed) {
        setEditedWorkInfo((prev: any) => ({ ...prev, ...res.item.workInfo }));
      }
    } catch (e) {
      setOnboardingData(null);
    }
  };

  const fetchClearHireStatus = useCallback(async () => {
    try {
      setLoadingClearHire(true);
      const res = await apiFetch<{ item: ClearHireStatus }>("/api/clearhire/status/me");
      setClearHireStatus(res.item);
    } catch (e) {
      setClearHireStatus(null);
    } finally {
      setLoadingClearHire(false);
    }
  }, []);

  // --- Progress Calculation Logic ---
  const calculateProgress = () => {
    if (!onboardingData) return 0;
    let completed = 0;
    const total = 7;

    if (onboardingData.basicInfo?.completed) completed++;
    if (clearHireStatus?.status === "GREEN") completed++;
    if (onboardingData.workInfo?.completed) completed++;

    if (onboardingData.identityVerification?.primaryId?.status === "submitted" ||
        onboardingData.identityVerification?.primaryId?.status === "verified") {
      if (onboardingData.identityVerification?.secondaryId?.status === "submitted" ||
          onboardingData.identityVerification?.secondaryId?.status === "verified") {
        completed++;
      }
    }

    if (onboardingData.w4Form?.status === "submitted" || onboardingData.w4Form?.status === "verified") {
      completed++;
    }

    if (onboardingData.employeeHandbook?.status === "submitted" || onboardingData.employeeHandbook?.status === "verified") {
      completed++;
    }

    if (onboardingData.digitalSignature?.status === "submitted" || onboardingData.digitalSignature?.status === "verified") {
      completed++;
    }

    return Math.round((completed / total) * 100);
  };

  // Dynamic Array Handlers for Addresses
  const updateAddressField = (index: number, key: keyof Address, value: string) => {
    const updated = [...chAddresses];
    updated[index][key] = value;
    setChAddresses(updated);
  };

  const addAddressRow = () => {
    setChAddresses([...chAddresses, { street: "", city: "", state: "", zip: "", startDate: "", endDate: "" }]);
  };

  const removeAddressRow = (index: number) => {
    if (chAddresses.length === 1) return;
    setChAddresses(chAddresses.filter((_, i) => i !== index));
  };

  const pickAndUploadDocument = async (targetSetter: (uri: string) => void, documentTypeKey: string) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "*/*" });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        targetSetter(selectedAsset.uri);
        
        const formData = new FormData();
        formData.append("file", {
          uri: selectedAsset.uri,
          name: selectedAsset.name,
          type: selectedAsset.mimeType || "application/octet-stream"
        } as any);
        formData.append("type", documentTypeKey);

        await uploadDocument(formData);
        Alert.alert("Success", `${selectedAsset.name} uploaded successfully.`);
        await fetchOnboardingRecords();
      }
    } catch (err: any) {
      Alert.alert("Upload Failure", err.message || "Could not upload document.");
    }
  };

  // Basic Verification Sync Logic (Web Action Mirror)
  const handleSaveBasicInfo = async () => {
    if (!editedProfile) return;
    setSavingBasicInfo(true);
    try {
      await apiFetch("/api/onboarding/basic-info", {
        method: "POST",
        body: JSON.stringify({
          name: editedProfile.name,
          phone: editedProfile.phone,
        }),
      });
      setProfile((p) => p ? { ...p, name: editedProfile.name, phone: editedProfile.phone } : null);
      setIsEditingBasicInfo(false);
      Alert.alert("Success", "Basic verification details saved for onboarding.");
      await fetchOnboardingRecords();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to save basic info.");
    } finally {
      setSavingBasicInfo(false);
    }
  };

  const handleClearHireSubmit = async () => {
    if (!chFcraConsent) {
      Alert.alert("Consent Required", "You must accept the background check disclosure terms.");
      return;
    }
    setSubmittingClearHire(true);
    try {
      await apiFetch("/api/clearhire/submit", {
        method: "POST",
        body: JSON.stringify({
          fullName: chFullName,
          dob: chDob,
          ssn: chSsn,
          addresses: chAddresses,
          govIdUri: chGovIdUri,
          selfieUri: chSelfieUri
        })
      });
      Alert.alert("Success", "Background screening information submitted.");
      await fetchClearHireStatus();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to submit screening data.");
    } finally {
      setSubmittingClearHire(false);
    }
  };

  const handleProfileUpdate = async () => {
    if (!editedProfile) return;
    setSaving(true);
    try {
      await apiFetch(`/api/employees/${editedProfile.id}`, {
        method: "PUT",
        body: JSON.stringify({ name: editedProfile.name, phone: editedProfile.phone, location: editedProfile.location }),
      });
      setProfile(editedProfile);
      setIsEditing(false);
      Alert.alert("Success", "Profile updated successfully.");
    } catch (err: any) {
      Alert.alert("Sync Error", err.message || "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      Alert.alert("Validation Error", "Passwords do not match.");
      return;
    }
    setChangingPassword(true);
    try {
      await apiFetch("/api/auth/change-password", {
        method: "PUT",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      Alert.alert("Success", "Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setChangingPassword(false);
    }
  };

  const triggerMfaSetup = async () => {
    setMfaLoading(true);
    try {
      const res = await apiFetch<{ secret: string; otpauthUrl: string }>("/api/employees/me/mfa/setup", { method: "POST" });
      setMfaSecret(res.secret);
      setMfaQrUrl(res.otpauthUrl);
      setMfaModalOpen(true);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setMfaLoading(false);
    }
  };

  const verifyMfaSetupCode = async () => {
    try {
      await apiFetch("/api/employees/me/mfa/verify", {
        method: "POST",
        body: JSON.stringify({ code: mfaCode })
      });
      Alert.alert("Success", "Two-Factor Authentication activated.");
      setMfaModalOpen(false);
      initScreenData();
    } catch (err: any) {
      Alert.alert("Verification Error", err.message || "Invalid security code.");
    }
  };

  const getStatusBadgeStyles = (statusVal: string) => {
    switch (statusVal) {
      case "GREEN": return { bg: "#22c55e15", text: "#22c55e" };
      case "PENDING": return { bg: "#eab30815", text: "#eab308" };
      case "YELLOW": return { bg: "#f9731615", text: "#f97316" };
      case "RED": return { bg: "#ef444415", text: "#ef4444" };
      default: return { bg: "#27272a", text: "#a1a1aa" };
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Core Header Identity Struct */}
        <Card style={styles.profileHeaderCard}>
          <View style={styles.profileRow}>
            <View style={styles.avatarContainer}>
              <Image
                source={{ uri: toProxiedUrl(profile?.avatarUrl) || "https://via.placeholder.com/150" }}
                style={styles.avatarImage}
              />
              <TouchableOpacity style={styles.avatarEditBtn} onPress={() => pickAndUploadDocument((uri) => setProfile(p => p ? { ...p, avatarUrl: uri } : null), "avatar")}>
                <Camera size={14} color="#09090b" />
              </TouchableOpacity>
            </View>
            <View style={styles.profileMeta}>
              <View style={styles.row}>
                <Text style={styles.profileName}>{profile?.name}</Text>
                <View style={styles.statusBadge}><Text style={styles.statusText}>{profile?.status || "Active"}</Text></View>
              </View>
              <Text style={styles.profileRole}>{profile?.jobTitle || "Employee"}</Text>
              <View style={[styles.row, { marginTop: 6, gap: 12 }]}>
                <View style={styles.row}><Building2 size={12} color="#a1a1aa" /><Text style={styles.metaSubText}> {profile?.company || "Company"}</Text></View>
                <View style={styles.row}><MapPin size={12} color="#a1a1aa" /><Text style={styles.metaSubText}> {profile?.location || "Remote"}</Text></View>
              </View>
            </View>
          </View>
          
          <View style={styles.headerActionContainer}>
            {isEditing ? (
              <View style={styles.flexRowGap}>
                <GoldButton variant="outline" onPress={() => { setEditedProfile(profile); setIsEditing(false); }}>Cancel</GoldButton>
                <GoldButton onPress={handleProfileUpdate} loading={saving}>Save Changes</GoldButton>
              </View>
            ) : (
              <GoldButton variant="outline" icon={Edit2} onPress={() => setIsEditing(true)}>Edit Profile</GoldButton>
            )}
          </View>
        </Card>

        {/* Video Message History */}
        <Card>
          <View style={[styles.row, { marginBottom: 12 }]}>
            <FileText size={18} color="#ffd27a" style={{ marginRight: 8 }} />
            <Text style={styles.cardTitle}>Video Message History</Text>
          </View>
          {loadingVideoHistory ? (
            <ActivityIndicator size="small" color="#ffd27a" />
          ) : videoHistory.length === 0 ? (
            <Text style={styles.mutedText}>No video messages found.</Text>
          ) : (
            videoHistory.map((video) => (
              <View key={video.id} style={styles.videoHistoryItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.videoItemTitle}>{video.title}</Text>
                  <Text style={styles.videoItemSub}>{video.subtitle || "System Message"}</Text>
                </View>
                <GoldButton variant="outline" onPress={() => { setSelectedVideo(video); setVideoModalVisible(true); }}>Play</GoldButton>
              </View>
            ))
          )}
        </Card>

        {/* Tab Controls */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, currentTab === "onboarding" && styles.tabButtonActive]}
            onPress={() => setCurrentTab("onboarding")}
          >
            <Text style={[styles.tabButtonText, currentTab === "onboarding" && styles.tabButtonTextActive]}>Onboarding</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, currentTab === "settings" && styles.tabButtonActive]}
            onPress={() => setCurrentTab("settings")}
          >
            <Text style={[styles.tabButtonText, currentTab === "settings" && styles.tabButtonTextActive]}>Settings</Text>
          </TouchableOpacity>
        </View>

        {/* TAB DIMENSION: ONBOARDING METRICS */}
        {currentTab === "onboarding" && (
          <View style={{ gap: 16 }}>
            {/* Real-time Dynamic Compliance Progress Indicator */}
            <Card style={{ borderColor: "#ffd27a40" }}>
              <View style={[styles.row, { justifyContent: "space-between" }]}>
                <Text style={styles.cardTitle}>Onboarding Progress</Text>
                <Text style={styles.goldHighlightText}>{calculateProgress()}% Complete</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${calculateProgress()}%` }]} />
              </View>
            </Card>

            {/* Step 1: Basic Information (Fully Mirrored with Web Actions) */}
            <Card>
              <Text style={styles.stepTitle}>1. Basic Information</Text>
              <InputField label="Full Name" icon={User} value={editedProfile?.name} editable={isEditingBasicInfo} onChangeText={(t: string) => setEditedProfile((p: any) => ({ ...p, name: t }))} />
              <InputField label="Email Address" icon={Mail} value={profile?.email} editable={false} />
              <InputField label="Phone Number" icon={Phone} value={editedProfile?.phone} editable={isEditingBasicInfo} onChangeText={(t: string) => setEditedProfile((p: any) => ({ ...p, phone: t }))} />
              
              <View style={[styles.flexRowGap, { marginTop: 14 }]}>
                {!isEditingBasicInfo ? (
                  <GoldButton variant="outline" style={{ flex: 1 }} onPress={() => setIsEditingBasicInfo(true)}>
                    Edit information
                  </GoldButton>
                ) : (
                  <>
                    <GoldButton variant="outline" style={{ flex: 1 }} onPress={() => { setEditedProfile(profile); setIsEditingBasicInfo(false); }}>
                      Cancel
                    </GoldButton>
                    <GoldButton loading={savingBasicInfo} style={{ flex: 1 }} onPress={handleSaveBasicInfo}>
                      Save for onboarding
                    </GoldButton>
                  </>
                )}
              </View>
            </Card>

            {/* Step 2: ClearHire Background Check */}
            <Card style={clearHireStatus ? { borderColor: getStatusBadgeStyles(clearHireStatus.status).text + "30" } : undefined}>
              <View style={[styles.row, { justifyContent: "space-between", marginBottom: 8 }]}>
                <View style={[styles.row, { gap: 6 }]}>
                  <ShieldCheck size={18} color="#ffd27a" />
                  <Text style={styles.stepTitle}>2. ClearHire Background Check</Text>
                </View>
                {clearHireStatus && (
                  <View style={[styles.statusBadge, { backgroundColor: getStatusBadgeStyles(clearHireStatus.status).bg }]}>
                    <Text style={{ color: getStatusBadgeStyles(clearHireStatus.status).text, fontSize: 11, fontWeight: "700" }}>
                      {clearHireStatus.status}
                    </Text>
                  </View>
                )}
              </View>

              {loadingClearHire ? (
                <ActivityIndicator size="small" color="#ffd27a" style={{ padding: 12 }} />
              ) : clearHireStatus?.status === "GREEN" ? (
                <View style={[styles.row, { gap: 8, marginTop: 4 }]}>
                  <CheckCircle2 size={16} color="#22c55e" />
                  <Text style={{ color: "#22c55e", fontSize: 13, fontWeight: "500" }}>Background check complete and verified.</Text>
                </View>
              ) : (
                <View style={{ marginTop: 8 }}>
                  <InputField label="Full Legal Name" value={chFullName} onChangeText={setChFullName} placeholder="First Middle Last" />
                  <InputField label="Date of Birth" value={chDob} onChangeText={setChDob} placeholder="YYYY-MM-DD" />
                  <InputField label="Social Security Number (SSN)" value={chSsn} onChangeText={setChSsn} placeholder="XXX-XX-XXXX" secureTextEntry={true} />

                  <Text style={[styles.inputLabel, { marginTop: 12, marginBottom: 4 }]}>7-Year Address History</Text>
                  {chAddresses.map((addr, idx) => (
                    <View key={idx} style={styles.nestedAddressFormBox}>
                      <View style={[styles.row, { justifyContent: "space-between", marginBottom: 8 }]}>
                        <Text style={{ color: "#ffd27a", fontSize: 12, fontWeight: "600" }}>Address #{idx + 1}</Text>
                        {chAddresses.length > 1 && (
                          <TouchableOpacity onPress={() => removeAddressRow(idx)}>
                            <Trash2 size={14} color="#ef4444" />
                          </TouchableOpacity>
                        )}
                      </View>
                      <InputField placeholder="Street Address" value={addr.street} onChangeText={(v: string) => updateAddressField(idx, "street", v)} />
                      <View style={styles.flexRowGap}>
                        <View style={{ flex: 2 }}><InputField placeholder="City" value={addr.city} onChangeText={(v: string) => updateAddressField(idx, "city", v)} /></View>
                        <View style={{ flex: 1 }}><InputField placeholder="State" value={addr.state} onChangeText={(v: string) => updateAddressField(idx, "state", v)} /></View>
                      </View>
                      <View style={styles.flexRowGap}>
                        <View style={{ flex: 1.5 }}><InputField placeholder="Zip Code" value={addr.zip} onChangeText={(v: string) => updateAddressField(idx, "zip", v)} /></View>
                        <View style={{ flex: 2 }}><InputField placeholder="Start Date" value={addr.startDate} onChangeText={(v: string) => updateAddressField(idx, "startDate", v)} /></View>
                        <View style={{ flex: 2 }}><InputField placeholder="End Date" value={addr.endDate} onChangeText={(v: string) => updateAddressField(idx, "endDate", v)} /></View>
                      </View>
                    </View>
                  ))}
                  
                  <TouchableOpacity style={[styles.row, { gap: 6, marginVertical: 8 }]} onPress={addAddressRow}>
                    <Plus size={14} color="#ffd27a" />
                    <Text style={{ color: "#ffd27a", fontSize: 13, fontWeight: "600" }}>Add Address</Text>
                  </TouchableOpacity>

                  <Text style={[styles.inputLabel, { marginTop: 12 }]}>Document Uploads</Text>
                  <View style={[styles.flexRowGap, { marginTop: 6, marginBottom: 12 }]}>
                    <GoldButton variant="outline" icon={Upload} style={{ flex: 1 }} onPress={() => pickAndUploadDocument(setChGovIdUri, "clearhire_gov_id")}>
                      {chGovIdUri ? "Gov ID Uploaded" : "Upload Government ID"}
                    </GoldButton>
                    <GoldButton variant="outline" icon={Upload} style={{ flex: 1 }} onPress={() => pickAndUploadDocument(setChSelfieUri, "clearhire_selfie")}>
                      {chSelfieUri ? "Selfie Uploaded" : "Upload Selfie"}
                    </GoldButton>
                  </View>

                  <FormCheckboxRow 
                    value={chFcraConsent} 
                    onValueChange={setChFcraConsent} 
                    label="I authorize ClearHire to conduct a background check and verify my residential history under FCRA terms."
                  />

                  <GoldButton loading={submittingClearHire} onPress={handleClearHireSubmit} style={{ marginTop: 8 }}>
                    Submit Background Check
                  </GoldButton>
                </View>
              )}
            </Card>

            {/* Step 3: Work Information */}
            <Card>
              <View style={[styles.row, { justifyContent: "space-between" }]}>
                <Text style={styles.stepTitle}>3. Work Information</Text>
                <TouchableOpacity onPress={() => setEditingWorkInfo(!editingWorkInfo)}>
                  <Text style={{ color: "#ffd27a", fontSize: 13 }}>{editingWorkInfo ? "Cancel" : "Edit"}</Text>
                </TouchableOpacity>
              </View>
              <InputField label="Job Title" icon={Briefcase} value={editedWorkInfo.jobTitle} editable={editingWorkInfo} onChangeText={(t: string) => setEditedWorkInfo((w: any) => ({ ...w, jobTitle: t }))} />
              <InputField label="Department" icon={Building2} value={editedWorkInfo.department} editable={editingWorkInfo} onChangeText={(t: string) => setEditedWorkInfo((w: any) => ({ ...w, department: t }))} />
            </Card>

            {/* Step 4: Identity Verification */}
            <Card>
              <Text style={styles.stepTitle}>4. Identity Verification</Text>
              
              <Text style={styles.inputLabel}>Primary ID Type</Text>
              <TouchableOpacity 
                style={styles.dropdownSelectorTrigger} 
                onPress={() => setPickerModalConfig({ visible: true, type: "primId", data: ["driver_license", "passport", "state_id"] })}
              >
                <Text style={styles.whiteBodyText}>{primaryIdType.toUpperCase().replace("_", " ")}</Text>
                <ChevronDown size={16} color="#ffd27a" />
              </TouchableOpacity>

              <View style={[styles.flexRowGap, { marginBottom: 16 }]}>
                <GoldButton variant="outline" icon={Upload} style={{ flex: 1 }} onPress={() => pickAndUploadDocument(setPrimaryIdFront, "primary_id_front")}>
                  {primaryIdFront ? "Front Uploaded" : "Upload Front"}
                </GoldButton>
                <GoldButton variant="outline" icon={Upload} style={{ flex: 1 }} onPress={() => pickAndUploadDocument(setPrimaryIdBack, "primary_id_back")}>
                  {primaryIdBack ? "Back Uploaded" : "Upload Back"}
                </GoldButton>
              </View>

              <Text style={styles.inputLabel}>Secondary ID Type</Text>
              <TouchableOpacity 
                style={styles.dropdownSelectorTrigger} 
                onPress={() => setPickerModalConfig({ visible: true, type: "secId", data: ["ss_card", "birth_certificate", "voter_registration"] })}
              >
                <Text style={styles.whiteBodyText}>{secondaryIdType.toUpperCase().replace("_", " ")}</Text>
                <ChevronDown size={16} color="#ffd27a" />
              </TouchableOpacity>

              <GoldButton variant="outline" icon={Upload} onPress={() => pickAndUploadDocument(setSecondaryId, "secondary_id")}>
                {secondaryId ? "Secondary ID Uploaded" : "Choose Document File"}
              </GoldButton>
            </Card>

            {/* Step 5: Documents & Signatures */}
            <Card>
              <Text style={styles.stepTitle}>5. Documents & Signatures</Text>
              
              <View style={styles.documentActionRow}>
                <Text style={styles.whiteBodyText}>W-4 Form</Text>
                <GoldButton variant="outline" icon={Upload} onPress={() => pickAndUploadDocument(setW4FormFile, "w4_form")}>{w4FormFile ? "Uploaded" : "Upload File"}</GoldButton>
              </View>

              <View style={styles.documentActionRow}>
                <Text style={styles.whiteBodyText}>Employee Handbook</Text>
                <GoldButton variant="outline" icon={Upload} onPress={() => pickAndUploadDocument(setHandbookSig, "handbook_signature")}>{handbookSig ? "Signed" : "Sign Handbook"}</GoldButton>
              </View>

              <View style={styles.documentActionRow}>
                <Text style={styles.whiteBodyText}>Digital Signature</Text>
                <GoldButton variant="outline" icon={Upload} onPress={() => pickAndUploadDocument(setDigitalSig, "digital_signature")}>{digitalSig ? "Verified" : "Upload Signature"}</GoldButton>
              </View>
            </Card>
          </View>
        )}

        {/* TAB DIMENSION: SETTINGS MUTATIONS */}
        {currentTab === "settings" && (
          <View style={{ gap: 16 }}>
            {/* Change Password Block */}
            <Card>
              <Text style={styles.cardTitle}>Change Password</Text>
              <View style={{ marginTop: 12 }}>
                <InputField
                  label="Current Password"
                  secureTextEntry={!showCurrentPwd}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  rightIcon={showCurrentPwd ? EyeOff : Eye}
                  onRightIconPress={() => setShowCurrentPwd(!showCurrentPwd)}
                />
                <InputField
                  label="New Password"
                  secureTextEntry={!showNewPwd}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  rightIcon={showNewPwd ? EyeOff : Eye}
                  onRightIconPress={() => setShowNewPwd(!showNewPwd)}
                />
                <InputField
                  label="Confirm New Password"
                  secureTextEntry={true}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
                <View style={{ marginTop: 8 }}>
                  <GoldButton loading={changingPassword} onPress={handlePasswordChange}>Update Password</GoldButton>
                </View>
              </View>
            </Card>

            {/* Two-Factor Authentication (2FA) */}
            <Card>
              <View style={[styles.row, { justifyContent: "space-between" }]}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={styles.whiteBodyText}>Two-Factor Authentication (2FA)</Text>
                  <Text style={styles.mutedText}>Secure your account using a time-based one-time password (TOTP).</Text>
                </View>
                <Switch
                  trackColor={{ false: "#18181b", true: "#ffd27a" }}
                  thumbColor={profile?.mfaEnabled ? "#09090b" : "#71717a"}
                  value={profile?.mfaEnabled || false}
                  onValueChange={triggerMfaSetup}
                />
              </View>
            </Card>

            {/* Localization Settings */}
            <Card>
              <Text style={styles.cardTitle}>Localization Settings</Text>
              
              <Text style={[styles.inputLabel, { marginTop: 10 }]}>Language</Text>
              <TouchableOpacity 
                style={styles.dropdownSelectorTrigger} 
                onPress={() => setPickerModalConfig({ visible: true, type: "lang", data: ["English (US)", "Español (ES)", "Français (FR)", "Deutsch (DE)"] })}
              >
                <Text style={styles.whiteBodyText}>{userSettings.language.toUpperCase()}</Text>
                <ChevronDown size={16} color="#ffd27a" />
              </TouchableOpacity>

              <Text style={styles.inputLabel}>Timezone</Text>
              <TouchableOpacity 
                style={styles.dropdownSelectorTrigger} 
                onPress={() => setPickerModalConfig({ visible: true, type: "tz", data: ["UTC", "America/New_York", "Europe/London", "Asia/Kolkata"] })}
              >
                <Text style={styles.whiteBodyText}>{userSettings.timezone}</Text>
                <ChevronDown size={16} color="#ffd27a" />
              </TouchableOpacity>

              <GoldButton onPress={() => Alert.alert("Success", "Settings cached.")}>Save Settings</GoldButton>
            </Card>
          </View>
        )}

      </ScrollView>

      {/* OVERLAY MODALS ARCHITECTURE */}

      {/* 1. BROADCAST MEDIA SYSTEM: EXECUTIVE VIDEO WORKSPACE VIEWPORT */}
      <Modal visible={videoModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalInnerBox}>
            <View style={[styles.row, { justifyContent: "space-between", marginBottom: 12 }]}>
              <Text style={styles.cardTitle} numberOfLines={1}>{selectedVideo?.title}</Text>
              <TouchableOpacity onPress={() => setVideoModalVisible(false)}><X size={20} color="#ffffff" /></TouchableOpacity>
            </View>
            {selectedVideo?.videoUrl ? (
              <Video
                source={{ uri: selectedVideo.videoUrl }}
                style={styles.nativeVideoPlayerViewport}
                useNativeControls
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay
              />
            ) : (
              <ActivityIndicator color="#ffd27a" />
            )}
          </View>
        </View>
      </Modal>

      {/* 2. SECURITY LAYER: MULTI-FACTOR CHALLENGE SYNC VERIFICATION PACKET PANEL */}
      <Modal visible={mfaModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalInnerBox}>
            <View style={[styles.row, { justifyContent: "space-between", marginBottom: 14 }]}>
              <Text style={styles.cardTitle}>Configure Authenticator Matrix</Text>
              <TouchableOpacity onPress={() => setMfaModalOpen(false)}><X size={20} color="#ffffff" /></TouchableOpacity>
            </View>
            <Text style={[styles.mutedText, { marginBottom: 12 }]}>
              Scan the setup node inside your token application generator using secret core configuration token:
            </Text>
            <View style={styles.nestedAddressFormBox}>
              <Text style={[styles.goldHighlightText, { fontSize: 13, textAlign: "center", letterSpacing: 1 }]}>{mfaSecret || "GENERATING_TOKEN_STREAM"}</Text>
            </View>
            
            <InputField 
              label="Input Generated 6-Digit Time-token Block" 
              value={mfaCode} 
              onChangeText={setMfaCode} 
              placeholder="000000" 
              keyboardType="number-pad" 
              maxLength={6} 
            />
            
            <GoldButton style={{ marginTop: 10 }} onPress={verifyMfaSetupCode}>
              Verify & Lock Token Channel
            </GoldButton>
          </View>
        </View>
      </Modal>

      {/* 3. FIELD SELECTION VECTOR: UNIVERSAL SECTOR LIST MODAL DIALOG */}
      <Modal visible={!!pickerModalConfig?.visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalInnerBox, { maxHeight: 340 }]}>
            <View style={[styles.row, { justifyContent: "space-between", marginBottom: 12 }]}>
              <Text style={styles.cardTitle}>Select Parameter Element</Text>
              <TouchableOpacity onPress={() => setPickerModalConfig(null)}><X size={18} color="#ffffff" /></TouchableOpacity>
            </View>
            <FlatList
              data={pickerModalConfig?.data || []}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.pickerListItemButton}
                  onPress={() => {
                    if (pickerModalConfig?.type === "lang") setUserSettings(p => ({ ...p, language: item }));
                    if (pickerModalConfig?.type === "tz") setUserSettings(p => ({ ...p, timezone: item }));
                    if (pickerModalConfig?.type === "primId") setPrimaryIdType(item);
                    if (pickerModalConfig?.type === "secId") setSecondaryIdType(item);
                    setPickerModalConfig(null);
                  }}
                >
                  <Text style={styles.whiteBodyText}>{item.toUpperCase().replace("_", " ")}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

    </View>
  );
}

// --- Style Configurations ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#09090b" },
  scrollContent: { padding: 16, paddingBottom: 40 },
  row: { flexDirection: "row", alignItems: "center" },
  flexRowGap: { flexDirection: "row", gap: 10 },
  
  card: { backgroundColor: "#121214", borderRadius: 12, borderColor: "#222226", borderWidth: 1, padding: 16, marginBottom: 16 },
  cardTitle: { color: "#ffffff", fontSize: 16, fontWeight: "700", letterSpacing: 0.3 },
  mutedText: { color: "#a1a1aa", fontSize: 13, marginTop: 4, lineHeight: 18 },
  whiteBodyText: { color: "#ffffff", fontSize: 14, fontWeight: "500" },
  goldHighlightText: { color: "#ffd27a", fontSize: 14, fontWeight: "700" },

  profileHeaderCard: { paddingVertical: 20 },
  profileRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  avatarContainer: { position: "relative" },
  avatarImage: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderColor: "#ffd27a50" },
  avatarEditBtn: { position: "absolute", bottom: 0, right: 0, backgroundColor: "#ffd27a", padding: 6, borderRadius: 12 },
  profileMeta: { flex: 1 },
  profileName: { color: "#ffffff", fontSize: 18, fontWeight: "800" },
  profileRole: { color: "#ffd27a", fontSize: 13, marginTop: 2, fontWeight: "500" },
  metaSubText: { color: "#71717a", fontSize: 12 },
  statusBadge: { backgroundColor: "#ffd27a15", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 8 },
  statusText: { color: "#ffd27a", fontSize: 10, fontWeight: "700" },
  headerActionContainer: { marginTop: 16, borderTopWidth: 1, borderTopColor: "#1e1e21", paddingTop: 14 },

  videoHistoryItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#18181b50", padding: 12, borderRadius: 8, marginTop: 10, borderColor: "#222226", borderWidth: 1 },
  videoItemTitle: { color: "#ffffff", fontSize: 14, fontWeight: "600" },
  videoItemSub: { color: "#71717a", fontSize: 12 },

  tabContainer: { flexDirection: "row", backgroundColor: "#121214", padding: 4, borderRadius: 8, marginBottom: 16 },
  tabButton: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 6 },
  tabButtonActive: { backgroundColor: "#ffd27a" },
  tabButtonText: { color: "#a1a1aa", fontWeight: "600", fontSize: 14 },
  tabButtonTextActive: { color: "#09090b", fontWeight: "700" },

  progressBarBg: { height: 6, backgroundColor: "#222226", borderRadius: 3, marginTop: 12, overflow: "hidden" },
  progressBarFill: { height: "100%", backgroundColor: "#ffd27a" },

  stepTitle: { color: "#ffffff", fontSize: 15, fontWeight: "700", marginBottom: 12 },
  inputWrapper: { marginBottom: 12, flex: 1 },
  inputLabel: { color: "#a1a1aa", fontSize: 12, marginBottom: 6, fontWeight: "600" },
  inputFieldContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "#09090b", borderColor: "#222226", borderWidth: 1, borderRadius: 8, paddingHorizontal: 12 },
  inputIcon: { marginRight: 8 },
  rightIconWrapper: { paddingLeft: 8 },
  textInput: { flex: 1, height: 40, color: "#ffffff", fontSize: 14 },
  inputDisabled: { opacity: 0.6, color: "#71717a" },
  documentActionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#1e1e21" },

  nestedAddressFormBox: { backgroundColor: "#18181b80", borderColor: "#27272a", borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 12, marginTop: 6 },
  checkboxBox: { width: 16, height: 16, borderRadius: 4, borderWidth: 1.5, borderColor: "#71717a", justifyContent: "center", alignItems: "center" },
  checkboxBoxChecked: { backgroundColor: "#ffd27a", borderColor: "#ffd27a" },

  dropdownSelectorTrigger: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#09090b", borderColor: "#222226", borderWidth: 1, padding: 12, borderRadius: 8, marginBottom: 12 },
  pickerListItemButton: { padding: 14, borderBottomWidth: 1, borderBottomColor: "#1e1e21" },

  btnBase: { height: 40, paddingHorizontal: 16, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  btnPrimary: { backgroundColor: "#ffd27a" },
  btnOutline: { backgroundColor: "transparent", borderWidth: 1, borderColor: "#ffd27a40" },
  btnText: { fontSize: 13, fontWeight: "700" },

  modalOverlay: { flex: 1, backgroundColor: "#000000cc", justifyContent: "center", alignItems: "center", padding: 20 },
  modalInnerBox: { backgroundColor: "#121214", width: "100%", borderRadius: 16, borderColor: "#222226", borderWidth: 1, padding: 20 },
  nativeVideoPlayerViewport: { width: "100%", height: 240, borderRadius: 8, backgroundColor: "#000000", marginTop: 10 }
});