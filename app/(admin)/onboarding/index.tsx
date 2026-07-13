import React, { useEffect, useMemo, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Image,
  Alert,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  Linking,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  UserPlus,
  X,
  FileText,
  FileImage,
  PenTool,
  ShieldCheck,
  Download,
  Eye,
} from "lucide-react-native";
import {
  getAdminOnboardingList,
  getAdminOnboardingDetails,
  approveOnboarding,
  rejectOnboarding,
  listClearHireProfiles,
  getClearHireStatus,
  type ClearHireProfile,
} from "@/lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";

interface OnboardingData {
  id: string;
  userId: string;
  employeeId: string;
  employeeName: string;
  basicInfo: {
    completed: boolean;
    email: string;
    phone: string;
    location: string;
  };
  identityVerification: {
    primaryId: {
      idType: string;
      frontImage: string;
      backImage: string;
      status: "missing" | "submitted" | "verified";
    };
    secondaryId: {
      idType: string;
      image: string;
      status: "missing" | "submitted" | "verified";
    };
  };
  w4Form: {
    file: string;
    status: "missing" | "submitted" | "verified";
  };
  employeeHandbook: {
    acknowledged: boolean;
    signature: string;
    signedAt: string;
    status: "missing" | "submitted" | "verified";
  };
  digitalSignature: {
    signature: string;
    status: "missing" | "submitted" | "verified";
  };
  overallStatus: "not_started" | "in_progress" | "submitted" | "approved" | "rejected";
  progress: number;
  adminReview?: {
    reviewedBy: string;
    reviewedAt: string;
    comments: string;
    rejectionReason: string;
  };
  createdAt: string;
  updatedAt: string;
}

// Static status badge color maps — these don't depend on theme
const statusStyles = {
  not_started: { bg: "rgba(148, 163, 184, 0.1)", text: "#94A3B8", border: "rgba(148, 163, 184, 0.2)" },
  in_progress:  { bg: "rgba(14, 165, 233, 0.1)",  text: "#0EA5E9", border: "rgba(14, 165, 233, 0.2)"  },
  submitted:    { bg: "rgba(245, 158, 11, 0.1)",   text: "#F59E0B", border: "rgba(245, 158, 11, 0.2)"  },
  approved:     { bg: "rgba(16, 185, 129, 0.1)",   text: "#10B981", border: "rgba(16, 185, 129, 0.2)"  },
  rejected:     { bg: "rgba(239, 68, 68, 0.1)",    text: "#EF4444", border: "rgba(239, 68, 68, 0.2)"   },
};

const statusLabels: Record<string, string> = {
  all:         "All",
  submitted:   "Submitted",
  approved:    "Approved",
  rejected:    "Rejected",
  in_progress: "In Progress",
  not_started: "Not Started",
};

const stepStatusStyles = {
  missing:  { bg: "rgba(239, 68, 68, 0.15)",  text: "#FCA5A5" },
  submitted:{ bg: "rgba(245, 158, 11, 0.15)", text: "#FDE047" },
  verified: { bg: "rgba(16, 185, 129, 0.15)", text: "#34D399" },
};

const { width: screenWidth } = Dimensions.get("window");

// ─── Sub-components ────────────────────────────────────────────────────────────

function LocalProgressBar({
  progress,
  colors,
}: {
  progress: number;
  colors: ReturnType<typeof buildColors>;
}) {
  return (
    <View style={{ height: 6, backgroundColor: colors.progressTrack, borderRadius: 3, overflow: "hidden" }}>
      <View
        style={{
          height: "100%",
          width: `${Math.min(100, Math.max(0, progress))}%`,
          backgroundColor: colors.primary,
          borderRadius: 3,
        }}
      />
    </View>
  );
}

function ClearHireBadge({ status }: { status?: string }) {
  const normalized = status ? status.toLowerCase() : "none";
  let bg    = "rgba(148, 163, 184, 0.1)";
  let color = "#94A3B8";
  let label = "ClearHire: Unsubmitted";

  if (normalized === "passed" || normalized === "verified") {
    bg = "rgba(16, 185, 129, 0.15)"; color = "#34D399"; label = "ClearHire: Passed";
  } else if (normalized === "pending") {
    bg = "rgba(245, 158, 11, 0.15)"; color = "#FDE047"; label = "ClearHire: Screening";
  } else if (normalized === "failed") {
    bg = "rgba(239, 68, 68, 0.15)";  color = "#FCA5A5"; label = "ClearHire: Alert";
  }

  return (
    <View style={{ backgroundColor: bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
      <Text style={{ color, fontSize: 9, fontWeight: "900", letterSpacing: 0.5 }}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

// ─── Color builder (mirrors Memes pattern) ─────────────────────────────────────

function buildColors(uiTheme: any, isDark: boolean) {
  return {
    background:       uiTheme.panelColors?.dashboardBackground    || (isDark ? "#0F172A" : "#F8FAFC"),
    cardBg:           uiTheme.panelColors?.dashboardCardBackground || (isDark ? "#1E293B" : "#FFFFFF"),
    modalBg:          uiTheme.panelColors?.dashboardBackground    || (isDark ? "#0F172A" : "#F1F5F9"),
    text:             uiTheme.panelColors?.dashboardTextColor      || (isDark ? "#F8FAFC" : "#0F172A"),
    mutedText:        isDark ? "#94A3B8" : "#64748B",
    subtleText:       isDark ? "#64748B" : "#94A3B8",
    border:           isDark ? "#334155" : "#E2E8F0",
    subtleBorder:     isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)",
    inputBg:          isDark ? "#020617" : "#FFFFFF",
    inputBorder:      isDark ? "#334155" : "#D1D5DB",
    inputText:        isDark ? "#F8FAFC" : "#111827",
    cardInnerBg:      isDark ? "rgba(255,255,255,0.01)" : "rgba(0,0,0,0.02)",
    deepBg:           isDark ? "rgba(11,19,35,0.5)"     : "rgba(248,250,252,0.8)",
    primary:          uiTheme.customColors?.primary || "#6366F1",
    primaryMuted:     isDark ? "rgba(99,102,241,0.12)" : "rgba(99,102,241,0.08)",
    primaryBorder:    isDark ? "rgba(99,102,241,0.2)"  : "rgba(99,102,241,0.25)",
    primaryText:      isDark ? "#818CF8" : "#4F46E5",
    avatarBg:         uiTheme.customColors?.primary || "#4F46E5",
    progressTrack:    isDark ? "#1E293B" : "#E2E8F0",
    chipUnselected:   isDark ? "#1E293B" : "#F1F5F9",
    chipBorderOff:    isDark ? "#334155" : "#CBD5E1",
    chipBgOn:         uiTheme.customColors?.primary || "#4F46E5",
    chipBorderOn:     isDark ? "#6366F1" : "#4F46E5",
    rejectBg:         isDark ? "#991B1B" : "#FEE2E2",
    rejectText:       isDark ? "#FFFFFF" : "#991B1B",
    approveBg:        isDark ? "#065F46" : "#D1FAE5",
    approveText:      isDark ? "#FFFFFF" : "#065F46",
    dangerBg:         "rgba(239, 68, 68, 0.1)",
    dangerBorder:     "rgba(239, 68, 68, 0.2)",
    dangerText:       isDark ? "#FCA5A5" : "#DC2626",
    dangerLabel:      "#EF4444",
    white:            "#FFFFFF",
  };
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const { uiTheme } = useTheme();
  const isDark =
    (uiTheme.theme as string) === "dark" ||
    (uiTheme.theme as string) === "metallic-elite";

  const colors = useMemo(() => buildColors(uiTheme, isDark), [uiTheme, isDark]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [onboardingList, setOnboardingList]         = useState<OnboardingData[]>([]);
  const [clearHireProfiles, setClearHireProfiles]   = useState<Record<string, ClearHireProfile>>({});
  const [statusFilter, setStatusFilter]             = useState("all");
  const [loading, setLoading]                       = useState(true);
  const [actionLoading, setActionLoading]           = useState(false);
  const [apiError, setApiError]                     = useState<string | null>(null);
  const [viewDetailsOpen, setViewDetailsOpen]       = useState(false);
  const [selectedOnboarding, setSelectedOnboarding] = useState<OnboardingData | null>(null);
  const [rejectionMode, setRejectionMode]           = useState(false);
  const [rejectionReason, setRejectionReason]       = useState("");



  const loadOnboardingList = async () => {
    try {
      setLoading(true);
      setApiError(null);
      const data = await getAdminOnboardingList(
        statusFilter === "all" ? undefined : statusFilter
      );
      setOnboardingList((data.items || []) as OnboardingData[]);
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Failed to load onboarding data.");
    } finally {
      setLoading(false);
    }
  };

  const loadClearHireProfiles = async () => {
    try {
      const data = await listClearHireProfiles();
      const map: Record<string, ClearHireProfile> = {};
      (data.items || []).forEach((p) => { map[p.userId] = p; });
      setClearHireProfiles(map);
    } catch (e) {
      console.warn("Background check lookup error:", e);
    }
  };

  useEffect(() => {
    void loadOnboardingList();
    void loadClearHireProfiles();
  }, [statusFilter]);



  const loadOnboardingDetails = async (id: string) => {
    try {
      const data = await getAdminOnboardingDetails(id);
      setSelectedOnboarding(data.item as OnboardingData);
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Could not load record details.");
    }
  };

  const handleViewDetails = async (onboarding: OnboardingData) => {
    setSelectedOnboarding(onboarding);
    setRejectionMode(false);
    setRejectionReason("");
    setViewDetailsOpen(true);
    await loadOnboardingDetails(onboarding.id);
  };

  const handleApprove = async () => {
    if (!selectedOnboarding) return;
    try {
      setActionLoading(true);
      await approveOnboarding(selectedOnboarding.id, "");
      Alert.alert("Approved", `${selectedOnboarding.employeeName} has been approved.`);
      setViewDetailsOpen(false);
      void loadOnboardingList();
    } catch (e) {
      Alert.alert("Approval Failed", e instanceof Error ? e.message : "Could not approve record.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectSubmit = async () => {
    if (!selectedOnboarding) return;
    if (rejectionReason.trim().length < 4) {
      Alert.alert("Input Needed", "Please provide a rejection reason.");
      return;
    }
    try {
      setActionLoading(true);
      await rejectOnboarding(selectedOnboarding.id, rejectionReason.trim());
      Alert.alert("Rejected", "Rejection notification sent to candidate.");
      setViewDetailsOpen(false);
      void loadOnboardingList();
    } catch (e) {
      Alert.alert("Rejection Failed", e instanceof Error ? e.message : "Could not reject record.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadFile = (base64OrUrl: string, filename: string) => {
    if (base64OrUrl.startsWith("http")) {
      void Linking.openURL(base64OrUrl);
    } else {
      Alert.alert("Document", `Opening: ${filename}`);
    }
  };

  const handleReviewClearHire = (userId: string) => {
    const statusObj = clearHireProfiles[userId];
    Alert.alert(
      "ClearHire Registry",
      `Status: ${statusObj?.status || "UNSUBMITTED"}\nReport ID: ${statusObj?.id || "N/A"}`
    );
  };


  const summary = {
    total:     onboardingList.length,
    submitted: onboardingList.filter((o) => o.overallStatus === "submitted").length,
    approved:  onboardingList.filter((o) => o.overallStatus === "approved").length,
    rejected:  onboardingList.filter((o) => o.overallStatus === "rejected").length,
  };

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

  const renderStepBadge = (status: string) => {
    const s = stepStatusStyles[status as keyof typeof stepStatusStyles] || stepStatusStyles.missing;
    return (
      <View style={{ backgroundColor: s.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
        <Text style={{ color: s.text, fontSize: 9, fontWeight: "900", letterSpacing: 0.5 }}>
          {status.toUpperCase()}
        </Text>
      </View>
    );
  };



  return (
    <SafeAreaView style={styles.rootContainer} edges={["top"]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.headerStack}>
          <Text style={styles.headerTitle}>Employee Onboarding</Text>
          <Text style={styles.headerSubtitle}>
            Review, analyze, and authorize human resource enrollment lifecycles.
          </Text>
        </View>

        {/* ── Error Banner ── */}
        {apiError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{apiError}</Text>
          </View>
        ) : null}

        {/* ── Metrics Grid ── */}
        <View style={styles.metricsGrid}>
          {[
            { label: "Total Hires",  value: summary.total,     icon: <UserPlus     size={16} color={colors.primaryText} /> },
            { label: "Submitted",    value: summary.submitted,  icon: <Clock        size={16} color="#F59E0B"             /> },
            { label: "Approved",     value: summary.approved,   icon: <CheckCircle2 size={16} color="#10B981"             /> },
            { label: "Rejected",     value: summary.rejected,   icon: <AlertCircle  size={16} color="#EF4444"             /> },
          ].map((card) => (
            <View key={card.label} style={styles.metricCard}>
              <View style={styles.metricIconWrap}>{card.icon}</View>
              <View style={{ gap: 2 }}>
                <Text style={styles.metricLabel}>{card.label}</Text>
                <Text style={styles.metricValue}>{card.value}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── Filter Chips ── */}
        <View style={styles.filterSection}>
          <Text style={styles.filterSectionLabel}>WORKFLOW STATUS FILTER</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterChipRow}
          >
            {Object.keys(statusLabels).map((key) => {
              const isActive = statusFilter === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.filterChip, isActive && styles.filterChipActive]}
                  onPress={() => setStatusFilter(key)}
                >
                  <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                    {statusLabels[key]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ── List Card ── */}
        <View style={styles.listCard}>
          {loading ? (
            <View style={styles.stateBox}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.stateBoxText}>Loading onboarding records...</Text>
            </View>
          ) : onboardingList.length === 0 ? (
            <View style={styles.stateBox}>
              <UserPlus size={28} color={colors.subtleText} />
              <Text style={styles.stateBoxTitle}>No Records Located</Text>
              <Text style={styles.stateBoxSubtitle}>
                No onboarding submissions match the current filter.
              </Text>
            </View>
          ) : (
            <View>
              {onboardingList.map((onboarding, idx) => {
                const badge = statusStyles[onboarding.overallStatus] || statusStyles.not_started;
                const clearHire = clearHireProfiles[onboarding.userId];
                return (
                  <View
                    key={onboarding.id}
                    style={[
                      styles.listRow,
                      idx < onboardingList.length - 1 && styles.listRowBorder,
                    ]}
                  >
                    {/* Row Header */}
                    <View style={styles.listRowHeader}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{getInitials(onboarding.employeeName)}</Text>
                      </View>

                      <View style={{ flex: 1, gap: 2 }}>
                        <View style={styles.listRowTitleLine}>
                          <Text style={styles.employeeName} numberOfLines={1}>
                            {onboarding.employeeName}
                          </Text>
                          <TouchableOpacity
                            style={styles.reviewBtn}
                            onPress={() => void handleViewDetails(onboarding)}
                          >
                            <Eye size={10} color={colors.white} />
                            <Text style={styles.reviewBtnText}>REVIEW</Text>
                          </TouchableOpacity>
                        </View>

                        <Text style={styles.employeeEmail} numberOfLines={1}>
                          {onboarding.basicInfo?.email || "No email registered"}
                        </Text>

                        <View style={styles.badgeRow}>
                          <View
                            style={[
                              styles.statusBadge,
                              {
                                backgroundColor: badge.bg,
                                borderColor: badge.border,
                              },
                            ]}
                          >
                            <Text style={[styles.statusBadgeText, { color: badge.text }]}>
                              {onboarding.overallStatus.replace("_", " ").toUpperCase()}
                            </Text>
                          </View>
                          <ClearHireBadge status={clearHire?.status} />
                        </View>
                      </View>
                    </View>

                    {/* Progress */}
                    <View style={styles.progressBlock}>
                      <View style={styles.progressLabelRow}>
                        <Text style={styles.progressLabel}>Task Completion</Text>
                        <Text style={styles.progressValue}>{onboarding.progress}%</Text>
                      </View>
                      <LocalProgressBar progress={onboarding.progress} colors={colors} />
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── Detail Modal ── */}
      <Modal
        visible={viewDetailsOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setViewDetailsOpen(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalSheet}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderLeft}>
                  <ShieldCheck size={16} color={colors.primaryText} />
                  <Text style={styles.modalHeaderTitle}>Onboarding Compliance Review</Text>
                </View>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setViewDetailsOpen(false)}
                >
                  <X size={18} color={colors.mutedText} />
                </TouchableOpacity>
              </View>

              {/* Modal Body */}
              {selectedOnboarding ? (
                <ScrollView
                  style={styles.modalScroll}
                  contentContainerStyle={styles.modalScrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  {/* Profile Banner */}
                  <View style={styles.modalProfileBanner}>
                    <Text style={styles.modalProfileName}>
                      {selectedOnboarding.employeeName}
                    </Text>
                    <Text style={styles.modalProfileEmail}>
                      {selectedOnboarding.basicInfo?.email || "No email"}
                    </Text>
                    <Text style={styles.modalProfileMeta}>
                      Phone: {selectedOnboarding.basicInfo?.phone || "N/A"} {" "}
                      &bull; Location: {selectedOnboarding.basicInfo?.location || "N/A"}
                    </Text>
                    <View style={{ marginTop: 8 }}>
                      {(() => {
                        const badge =
                          statusStyles[selectedOnboarding.overallStatus] ||
                          statusStyles.not_started;
                        return (
                          <View
                            style={[
                              styles.statusBadge,
                              { alignSelf: "flex-start", backgroundColor: badge.bg, borderColor: badge.border },
                            ]}
                          >
                            <Text style={[styles.statusBadgeText, { color: badge.text }]}>
                              {selectedOnboarding.overallStatus.toUpperCase()}
                            </Text>
                          </View>
                        );
                      })()}
                    </View>
                  </View>

                  {/* Verification Steps */}
                  <Text style={styles.modalSectionTitle}>Verification Milestones</Text>
                  <View style={styles.stepsContainer}>

                    {/* Step 1 – Basic Info */}
                    <View style={styles.stepCard}>
                      <View style={styles.stepCardHeader}>
                        <FileText size={14} color={colors.primaryText} />
                        <Text style={styles.stepCardTitle}>Basic Information Profile</Text>
                        {renderStepBadge(
                          selectedOnboarding.basicInfo?.completed ? "verified" : "missing"
                        )}
                      </View>
                    </View>

                    {/* Step 2 – Primary ID */}
                    <View style={styles.stepCard}>
                      <View style={styles.stepCardHeader}>
                        <FileImage size={14} color={colors.primaryText} />
                        <Text style={styles.stepCardTitle}>Primary Identity Documentation</Text>
                        {renderStepBadge(
                          selectedOnboarding.identityVerification?.primaryId?.status || "missing"
                        )}
                      </View>
                      {selectedOnboarding.identityVerification?.primaryId?.frontImage ? (
                        <View style={styles.docBlock}>
                          <Text style={styles.docBlockLabel}>Front Scan:</Text>
                          <Image
                            source={{ uri: selectedOnboarding.identityVerification.primaryId.frontImage }}
                            style={styles.docImage}
                          />
                          <TouchableOpacity
                            style={styles.docDownloadBtn}
                            onPress={() =>
                              handleDownloadFile(
                                selectedOnboarding.identityVerification.primaryId.frontImage,
                                "primary-id-front.png"
                              )
                            }
                          >
                            <Download size={12} color={colors.primaryText} />
                            <Text style={styles.docDownloadBtnText}>Download</Text>
                          </TouchableOpacity>
                        </View>
                      ) : null}
                      {selectedOnboarding.identityVerification?.primaryId?.backImage ? (
                        <View style={styles.docBlock}>
                          <Text style={styles.docBlockLabel}>Back Scan:</Text>
                          <Image
                            source={{ uri: selectedOnboarding.identityVerification.primaryId.backImage }}
                            style={styles.docImage}
                          />
                          <TouchableOpacity
                            style={styles.docDownloadBtn}
                            onPress={() =>
                              handleDownloadFile(
                                selectedOnboarding.identityVerification.primaryId.backImage,
                                "primary-id-back.png"
                              )
                            }
                          >
                            <Download size={12} color={colors.primaryText} />
                            <Text style={styles.docDownloadBtnText}>Download</Text>
                          </TouchableOpacity>
                        </View>
                      ) : null}
                    </View>

                    {/* Step 3 – Secondary ID */}
                    <View style={styles.stepCard}>
                      <View style={styles.stepCardHeader}>
                        <FileImage size={14} color={colors.primaryText} />
                        <Text style={styles.stepCardTitle}>Secondary Supplemental ID</Text>
                        {renderStepBadge(
                          selectedOnboarding.identityVerification?.secondaryId?.status || "missing"
                        )}
                      </View>
                      {selectedOnboarding.identityVerification?.secondaryId?.image ? (
                        <View style={styles.docBlock}>
                          <Text style={styles.docBlockLabel}>Secondary Document:</Text>
                          <Image
                            source={{ uri: selectedOnboarding.identityVerification.secondaryId.image }}
                            style={styles.docImage}
                          />
                          <TouchableOpacity
                            style={styles.docDownloadBtn}
                            onPress={() =>
                              handleDownloadFile(
                                selectedOnboarding.identityVerification.secondaryId.image,
                                "secondary-id.png"
                              )
                            }
                          >
                            <Download size={12} color={colors.primaryText} />
                            <Text style={styles.docDownloadBtnText}>Download</Text>
                          </TouchableOpacity>
                        </View>
                      ) : null}
                    </View>

                    {/* Step 4 – W-4 */}
                    <View style={styles.stepCard}>
                      <View style={styles.stepCardHeader}>
                        <FileText size={14} color={colors.primaryText} />
                        <Text style={styles.stepCardTitle}>W-4 Federal Tax Form</Text>
                        {renderStepBadge(selectedOnboarding.w4Form?.status || "missing")}
                      </View>
                      {selectedOnboarding.w4Form?.file ? (
                        <TouchableOpacity
                          style={styles.docDownloadBtn}
                          onPress={() =>
                            handleDownloadFile(selectedOnboarding.w4Form.file, "w4-form.pdf")
                          }
                        >
                          <Download size={12} color={colors.primaryText} />
                          <Text style={styles.docDownloadBtnText}>Open W-4 Form</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>

                    {/* Step 5 – Employee Handbook */}
                    <View style={styles.stepCard}>
                      <View style={styles.stepCardHeader}>
                        <FileText size={14} color={colors.primaryText} />
                        <Text style={styles.stepCardTitle}>Employee Handbook Acknowledgment</Text>
                        {renderStepBadge(selectedOnboarding.employeeHandbook?.status || "missing")}
                      </View>
                      {selectedOnboarding.employeeHandbook?.signature ? (
                        <View style={styles.docBlock}>
                          <Text style={styles.docBlockLabel}>Signature:</Text>
                          <Image
                            source={{ uri: selectedOnboarding.employeeHandbook.signature }}
                            style={styles.sigImage}
                          />
                        </View>
                      ) : null}
                    </View>

                    {/* Step 6 – Digital Signature */}
                    <View style={styles.stepCard}>
                      <View style={styles.stepCardHeader}>
                        <PenTool size={14} color={colors.primaryText} />
                        <Text style={styles.stepCardTitle}>Attestation Signature Bond</Text>
                        {renderStepBadge(selectedOnboarding.digitalSignature?.status || "missing")}
                      </View>
                      {selectedOnboarding.digitalSignature?.signature ? (
                        <View style={styles.docBlock}>
                          <Text style={styles.docBlockLabel}>Captured Signature:</Text>
                          <Image
                            source={{ uri: selectedOnboarding.digitalSignature.signature }}
                            style={styles.sigImage}
                          />
                        </View>
                      ) : null}
                    </View>
                  </View>

                  {/* ClearHire Section */}
                  <View style={styles.clearHireBox}>
                    <View style={styles.clearHireBoxHeader}>
                      <ShieldCheck size={14} color={colors.primaryText} />
                      <Text style={styles.clearHireBoxTitle}>
                        ClearHire Automated Background Screening
                      </Text>
                    </View>
                    <View style={styles.clearHireBoxRow}>
                      <ClearHireBadge
                        status={clearHireProfiles[selectedOnboarding.userId]?.status}
                      />
                      <TouchableOpacity
                        style={styles.clearHireAuditBtn}
                        onPress={() => handleReviewClearHire(selectedOnboarding.userId)}
                      >
                        <Text style={styles.clearHireAuditBtnText}>Audit Records</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Prior Rejection */}
                  {selectedOnboarding.adminReview?.rejectionReason ? (
                    <View style={styles.rejectionHistoryBox}>
                      <Text style={styles.rejectionHistoryLabel}>
                        PREVIOUS REJECTION REASON
                      </Text>
                      <Text style={styles.rejectionHistoryValue}>
                        {selectedOnboarding.adminReview.rejectionReason}
                      </Text>
                    </View>
                  ) : null}

                  {/* Rejection Form */}
                  {rejectionMode ? (
                    <View style={styles.rejectionFormBox}>
                      <Text style={styles.rejectionFormLabel}>REJECTION REASON *</Text>
                      <TextInput
                        style={styles.rejectionTextarea}
                        value={rejectionReason}
                        onChangeText={setRejectionReason}
                        placeholder="Enter rejection justification..."
                        placeholderTextColor={colors.mutedText}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                      />
                      <View style={styles.rejectionFormActions}>
                        <TouchableOpacity
                          style={styles.cancelBtn}
                          onPress={() => setRejectionMode(false)}
                        >
                          <Text style={styles.cancelBtnText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.commitRejectBtn}
                          onPress={() => void handleRejectSubmit()}
                          disabled={actionLoading}
                        >
                          {actionLoading ? (
                            <ActivityIndicator size="small" color="#FFF" />
                          ) : (
                            <Text style={styles.commitRejectBtnText}>Commit Rejection</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : null}

                  {/* Approve / Reject Buttons */}
                  {!rejectionMode &&
                  (selectedOnboarding.overallStatus === "submitted" ||
                    selectedOnboarding.overallStatus === "in_progress") ? (
                    <View style={styles.actionButtonRow}>
                      <TouchableOpacity
                        style={styles.rejectActionBtn}
                        onPress={() => setRejectionMode(true)}
                        disabled={actionLoading}
                      >
                        <Text style={styles.rejectActionBtnText}>REJECT FILE</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.approveActionBtn}
                        onPress={() => void handleApprove()}
                        disabled={actionLoading}
                      >
                        {actionLoading ? (
                          <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                          <Text style={styles.approveActionBtnText}>APPROVE PROFILE</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </ScrollView>
              ) : (
                <View style={styles.stateBox}>
                  <ActivityIndicator color={colors.primary} />
                </View>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}



function createStyles(colors: ReturnType<typeof buildColors>) {
  return StyleSheet.create({
    
    rootContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 40,
      gap: 16,
    },


    headerStack: {
      gap: 4,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: "900",
      color: colors.text,
      letterSpacing: -0.5,
    },
    headerSubtitle: {
      fontSize: 13,
      color: colors.mutedText,
      lineHeight: 18,
    },

   
    errorBanner: {
      backgroundColor: colors.dangerBg,
      borderWidth: 1,
      borderColor: colors.dangerBorder,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    errorBannerText: {
      fontSize: 13,
      color: colors.dangerText,
    },

   
    metricsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    metricCard: {
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      width: (screenWidth - 42) / 2,
      padding: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    metricIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.primaryMuted,
      alignItems: "center",
      justifyContent: "center",
    },
    metricLabel: {
      fontSize: 11,
      color: colors.mutedText,
      fontWeight: "600",
    },
    metricValue: {
      fontSize: 18,
      fontWeight: "900",
      color: colors.text,
    },

 
    filterSection: {
      gap: 8,
    },
    filterSectionLabel: {
      fontSize: 11,
      fontWeight: "900",
      color: colors.subtleText,
      textTransform: "uppercase",
      letterSpacing: 1,
    },
    filterChipRow: {
      gap: 8,
      paddingVertical: 2,
    },
    filterChip: {
      backgroundColor: colors.chipUnselected,
      borderWidth: 1,
      borderColor: colors.chipBorderOff,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
    },
    filterChipActive: {
      backgroundColor: colors.chipBgOn,
      borderColor: colors.chipBorderOn,
    },
    filterChipText: {
      color: colors.mutedText,
      fontSize: 12,
      fontWeight: "700",
    },
    filterChipTextActive: {
      color: colors.white,
    },



    listCard: {
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      overflow: "hidden",
    },
    stateBox: {
      padding: 48,
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
    },
    stateBoxText: {
      fontSize: 11,
      color: colors.subtleText,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    stateBoxTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.text,
      textAlign: "center",
    },
    stateBoxSubtitle: {
      fontSize: 12,
      color: colors.subtleText,
      textAlign: "center",
      lineHeight: 16,
    },

  
    listRow: {
      padding: 16,
      gap: 14,
    },
    listRowBorder: {
      borderBottomWidth: 1,
      borderBottomColor: colors.subtleBorder,
    },
    listRowHeader: {
      flexDirection: "row",
      gap: 12,
      alignItems: "flex-start",
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.avatarBg,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: {
      color: colors.white,
      fontSize: 14,
      fontWeight: "900",
    },
    listRowTitleLine: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 8,
    },
    employeeName: {
      fontSize: 15,
      fontWeight: "800",
      color: colors.text,
      flex: 1,
    },
    reviewBtn: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.primary,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 6,
      gap: 4,
    },
    reviewBtnText: {
      color: colors.white,
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 0.5,
    },
    employeeEmail: {
      fontSize: 13,
      color: colors.mutedText,
    },
    badgeRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
      marginTop: 2,
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
      borderWidth: 1,
    },
    statusBadgeText: {
      fontSize: 9,
      fontWeight: "900",
      letterSpacing: 0.5,
    },
    progressBlock: {
      gap: 6,
      backgroundColor: colors.cardInnerBg,
      padding: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.subtleBorder,
    },
    progressLabelRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    progressLabel: {
      fontSize: 10,
      fontWeight: "800",
      color: colors.subtleText,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    progressValue: {
      fontSize: 12,
      fontWeight: "800",
      color: colors.text,
    },

  
    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.75)",
      justifyContent: "flex-end",
    },
    modalSheet: {
      backgroundColor: colors.modalBg,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      maxHeight: "90%",
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.subtleBorder,
    },
    modalHeaderLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      flex: 1,
    },
    modalHeaderTitle: {
      fontSize: 16,
      fontWeight: "900",
      color: colors.text,
    },
    modalCloseBtn: {
      padding: 4,
    },
    modalScroll: {
      flexGrow: 0,
    },
    modalScrollContent: {
      padding: 16,
      gap: 16,
      paddingBottom: 40,
    },

 
    modalProfileBanner: {
      backgroundColor: colors.cardInnerBg,
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.subtleBorder,
      gap: 2,
    },
    modalProfileName: {
      fontSize: 18,
      fontWeight: "900",
      color: colors.text,
    },
    modalProfileEmail: {
      fontSize: 13,
      color: colors.mutedText,
      fontWeight: "500",
    },
    modalProfileMeta: {
      fontSize: 12,
      color: colors.subtleText,
      fontWeight: "500",
    },


    modalSectionTitle: {
      fontSize: 12,
      fontWeight: "900",
      color: colors.mutedText,
      textTransform: "uppercase",
      letterSpacing: 1,
    },


    stepsContainer: {
      gap: 10,
    },
    stepCard: {
      backgroundColor: colors.cardInnerBg,
      borderWidth: 1,
      borderColor: colors.subtleBorder,
      padding: 12,
      borderRadius: 10,
      gap: 10,
    },
    stepCardHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    stepCardTitle: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.text,
      flex: 1,
    },

   
    docBlock: {
      backgroundColor: colors.inputBg,
      padding: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      gap: 8,
    },
    docBlockLabel: {
      fontSize: 11,
      color: colors.mutedText,
      fontWeight: "700",
    },
    docImage: {
      width: "100%",
      height: 140,
      borderRadius: 6,
      backgroundColor: colors.progressTrack,
    },
    sigImage: {
      width: "100%",
      height: 60,
      borderRadius: 6,
      backgroundColor: colors.progressTrack,
      marginTop: 4,
    },
    docDownloadBtn: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.primaryMuted,
      borderWidth: 1,
      borderColor: colors.primaryBorder,
      padding: 10,
      borderRadius: 8,
      gap: 8,
    },
    docDownloadBtnText: {
      color: colors.primaryText,
      fontSize: 12,
      fontWeight: "700",
    },

  
    clearHireBox: {
      backgroundColor: colors.deepBg,
      borderWidth: 1,
      borderColor: colors.primaryBorder,
      borderRadius: 12,
      padding: 14,
      gap: 10,
    },
    clearHireBoxHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    clearHireBoxTitle: {
      fontSize: 12,
      fontWeight: "800",
      color: colors.mutedText,
      flex: 1,
    },
    clearHireBoxRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 8,
    },
    clearHireAuditBtn: {
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
    },
    clearHireAuditBtnText: {
      color: colors.text,
      fontSize: 11,
      fontWeight: "700",
    },

   
    rejectionHistoryBox: {
      backgroundColor: colors.dangerBg,
      borderWidth: 1,
      borderColor: colors.dangerBorder,
      padding: 12,
      borderRadius: 10,
      gap: 4,
    },
    rejectionHistoryLabel: {
      fontSize: 9,
      fontWeight: "900",
      color: colors.dangerLabel,
      letterSpacing: 0.5,
    },
    rejectionHistoryValue: {
      fontSize: 13,
      color: colors.dangerText,
      lineHeight: 18,
    },

   
    rejectionFormBox: {
      gap: 8,
      backgroundColor: colors.cardInnerBg,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.subtleBorder,
    },
    rejectionFormLabel: {
      fontSize: 10,
      fontWeight: "900",
      color: colors.dangerLabel,
      letterSpacing: 0.5,
    },
    rejectionTextarea: {
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 8,
      padding: 10,
      color: colors.inputText,
      fontSize: 13,
      minHeight: 70,
      textAlignVertical: "top",
    },
    rejectionFormActions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 8,
      marginTop: 4,
    },
    cancelBtn: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cancelBtnText: {
      color: colors.mutedText,
      fontSize: 12,
      fontWeight: "700",
    },
    commitRejectBtn: {
      backgroundColor: "#EF4444",
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 6,
    },
    commitRejectBtnText: {
      color: colors.white,
      fontSize: 12,
      fontWeight: "900",
    },

   
    actionButtonRow: {
      flexDirection: "row",
      gap: 12,
      marginTop: 4,
    },
    rejectActionBtn: {
      flex: 1,
      backgroundColor: colors.rejectBg,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 12,
      borderRadius: 8,
    },
    rejectActionBtnText: {
      color: colors.rejectText,
      fontSize: 12,
      fontWeight: "900",
      letterSpacing: 0.5,
    },
    approveActionBtn: {
      flex: 1,
      backgroundColor: colors.approveBg,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 12,
      borderRadius: 8,
    },
    approveActionBtnText: {
      color: colors.approveText,
      fontSize: 12,
      fontWeight: "900",
      letterSpacing: 0.5,
    },
  });
}
