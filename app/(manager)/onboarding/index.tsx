import React, { useMemo, useState, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  ActivityIndicator,
  SafeAreaView,
  useWindowDimensions,
  StatusBar,
  RefreshControl,
  Image,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Search,
  FileText,
  CheckCircle2,
  Clock,
  ChevronDown,
  X,
  Check,
  RefreshCw,
} from "lucide-react-native";

import { apiFetch } from "@/lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { toProxiedUrl, initToken } from "@/util/toProxiedUrl";
import { isDarkTheme } from "@/constants/design/presets";

interface OnboardingItem {
  id: string;
  employeeName: string;
  startDate: string;
  progress: number;
  documentsUploaded: number;
  documentsRequired: number;
  overallStatus: string;
  avatarUrl?: string | null;
  initials?: string;
}

type OnboardingApiItem = {
  id?: string;
  _id?: string;
  employeeName?: string;
  overallStatus?: string;
  progress?: number;
  createdAt?: string;
  basicInfo?: { completed?: boolean };
  identityVerification?: {
    primaryId?: { status?: string };
    secondaryId?: { status?: string };
  };
  w4Form?: { status?: string };
  employeeHandbook?: { status?: string };
  digitalSignature?: { status?: string };
  employee?: {
    id?: string;
    name?: string;
    email?: string;
    avatarUrl?: string;
    initials?: string;
    status?: string;
  };
};

function docDone(s?: string) {
  return s === "submitted" || s === "verified";
}

const getDisplayImageUrl = (rawPath?: string | null, activeToken?: string | null) => {
  return toProxiedUrl(rawPath, activeToken) || null;
};

function normalizeItem(i: OnboardingApiItem): OnboardingItem {
  let uploaded = 0;
  if (i.basicInfo?.completed) uploaded++;
  if (
    docDone(i.identityVerification?.primaryId?.status) &&
    docDone(i.identityVerification?.secondaryId?.status)
  )
    uploaded++;
  if (docDone(i.w4Form?.status)) uploaded++;
  if (docDone(i.employeeHandbook?.status)) uploaded++;
  if (docDone(i.digitalSignature?.status)) uploaded++;

  const resolvedName = i.employeeName || i.employee?.name || "—";
  const resolvedAvatar = i.employee?.avatarUrl || null;
  const resolvedInitials =
    i.employee?.initials ||
    resolvedName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);

  return {
    id: i.id || i._id || i.employee?.id || String(Math.random()),
    employeeName: resolvedName,
    startDate: i.createdAt || "",
    progress: i.progress ?? 0,
    documentsUploaded: uploaded,
    documentsRequired: 5,
    overallStatus: i.overallStatus || "not_started",
    avatarUrl: resolvedAvatar,
    initials: resolvedInitials,
  };
}

const statusLabel: Record<string, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  submitted: "Pending Review",
  approved: "Approved",
  rejected: "Rejected",
};

const filterOptions = [
  { id: "all", label: "All Status" },
  { id: "not_started", label: "Not Started" },
  { id: "in_progress", label: "In Progress" },
  { id: "submitted", label: "Pending Review" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
];

function buildColors(uiTheme: any, isDark: boolean) {
  return {
    background: uiTheme.panelColors?.dashboardBackground || (isDark ? "#09090b" : "#f8fafc"),
    cardBg: uiTheme.panelColors?.dashboardCardBackground || (isDark ? "#141517" : "#ffffff"),
    text: uiTheme.panelColors?.dashboardTextColor || (isDark ? "#ffffff" : "#0f172a"),
    textSecondary: isDark ? "#94a3b8" : "#64748b",
    border: isDark ? "#27272a" : "#e2e8f0",
    primary: uiTheme.customColors?.primary || "#2563eb",
    warning: "#f59e0b",
    warningBg: "rgba(245, 158, 11, 0.12)",
    blue: "#3b82f6",
    blueBg: "rgba(59, 130, 246, 0.12)",
    success: "#10b981",
    successBg: "rgba(16, 185, 129, 0.12)",
    destructive: "#ef4444",
    destructiveBg: "rgba(239, 68, 68, 0.12)",
    grayBg: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
    overlay: "rgba(0,0,0,0.6)",
  };
}

type ThemeColors = ReturnType<typeof buildColors>;

export default function OnboardingMonitoring() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [imageErrorMap, setImageErrorMap] = useState<Record<string, boolean>>({});

  const { uiTheme } = useTheme();
  const isDark = isDarkTheme(uiTheme?.theme);

  const colors = useMemo(() => buildColors(uiTheme, isDark), [uiTheme, isDark]);
  const styles = useMemo(() => createStyles(colors, isTablet), [colors, isTablet]);

  const onboardingQuery = useQuery({
    queryKey: ["onboardingAdminAll"],
    queryFn: async () => {
      // 1. Ensure token is ready before calling API
      await initToken();
      let token = (user as any)?.token || (user as any)?.accessToken || (user as any)?.jwt;

      if (!token) {
        const keys = await AsyncStorage.getAllKeys();
        const possibleTokenKeys = keys.filter((k) => /token|jwt|auth|session/i.test(k));
        for (const key of possibleTokenKeys) {
          const val = await AsyncStorage.getItem(key);
          if (val && typeof val === "string" && val.length > 10) {
            token = val;
            break;
          }
        }
      }

      // 2. Fetch using exact web endpoint with Auth headers
      const res = await apiFetch<any>("/api/onboarding/admin/all", {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      let rawList: OnboardingApiItem[] = [];
      if (Array.isArray(res)) {
        rawList = res;
      } else if (res?.items && Array.isArray(res.items)) {
        rawList = res.items;
      } else if (res?.data?.items && Array.isArray(res.data.items)) {
        rawList = res.data.items;
      } else if (res?.data && Array.isArray(res.data)) {
        rawList = res.data;
      }

      return rawList.map(normalizeItem);
    },
    staleTime: 1000 * 60 * 5,
    retry: 2,
  });

  const items = onboardingQuery.data ?? [];

  const onRefresh = useCallback(() => {
    onboardingQuery.refetch();
  }, [onboardingQuery]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch = !q || item.employeeName.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || item.overallStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [items, searchQuery, statusFilter]);

  const approvedCount = items.filter((i) => i.overallStatus === "approved").length;
  const pendingReviewCount = items.filter((i) => i.overallStatus === "submitted").length;
  const inProgressCount = items.filter(
    (i) => i.overallStatus === "in_progress" || i.overallStatus === "not_started"
  ).length;

  const getBadgeStyle = (status: string) => {
    switch (status) {
      case "in_progress":
        return { bg: colors.warningBg, text: colors.warning };
      case "submitted":
        return { bg: colors.blueBg, text: colors.blue };
      case "approved":
        return { bg: colors.successBg, text: colors.success };
      case "rejected":
        return { bg: colors.destructiveBg, text: colors.destructive };
      default:
        return { bg: colors.grayBg, text: colors.textSecondary };
    }
  };

  const renderCardItem = ({ item }: { item: OnboardingItem }) => {
    const badge = getBadgeStyle(item.overallStatus);
    const isComplete = item.progress === 100;

    return (
      <View style={styles.cardContainer}>
        <View style={styles.cardHeader}>
          <View style={styles.avatarRow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{item.initials}</Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.employeeName}>{item.employeeName}</Text>
              <Text style={styles.startDateText}>
                Started: {item.startDate ? new Date(item.startDate).toLocaleDateString() : "—"}
              </Text>
            </View>
          </View>

          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.badgeText, { color: badge.text }]}>
              {statusLabel[item.overallStatus] ?? item.overallStatus}
            </Text>
          </View>
        </View>

        <View style={styles.progressSection}>
          <View style={styles.progressRowHeader}>
            <Text style={styles.progressLabel}>Progress</Text>
            <Text style={[styles.progressStatusText, isComplete && { color: colors.success }]}>
              {item.progress}% • {isComplete ? "Complete" : "In progress"}
            </Text>
          </View>

          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${Math.min(Math.max(item.progress, 0), 100)}%`,
                  backgroundColor: isComplete ? colors.success : colors.primary,
                },
              ]}
            />
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.docCountLabel}>Documents</Text>
          <Text style={styles.docCountValue}>
            {item.documentsUploaded}/{item.documentsRequired}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />

      <View style={styles.container}>
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderCardItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={onboardingQuery.isRefetching}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListHeaderComponent={
            <View style={styles.headerSection}>
              <View style={styles.pageHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pageTitle}>Onboarding Monitoring</Text>
                  <Text style={styles.pageSubtitle}>Track employee onboarding progress and approvals</Text>
                </View>
                <TouchableOpacity style={styles.headerRefreshBtn} onPress={onRefresh} disabled={onboardingQuery.isFetching}>
                  <RefreshCw size={18} color={colors.primary} style={onboardingQuery.isFetching ? { opacity: 0.5 } : {}} />
                </TouchableOpacity>
              </View>

              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <View style={styles.statCardInner}>
                    <View>
                      <Text style={styles.statLabel}>In Progress</Text>
                      <Text style={styles.statValue}>{inProgressCount}</Text>
                    </View>
                    <Clock size={28} color={colors.warning} opacity={0.6} />
                  </View>
                </View>

                <View style={styles.statCard}>
                  <View style={styles.statCardInner}>
                    <View>
                      <Text style={styles.statLabel}>Pending Review</Text>
                      <Text style={styles.statValue}>{pendingReviewCount}</Text>
                    </View>
                    <Clock size={28} color={colors.blue} opacity={0.6} />
                  </View>
                </View>

                <View style={styles.statCard}>
                  <View style={styles.statCardInner}>
                    <View>
                      <Text style={styles.statLabel}>Approved</Text>
                      <Text style={styles.statValue}>{approvedCount}</Text>
                    </View>
                    <CheckCircle2 size={28} color={colors.success} opacity={0.6} />
                  </View>
                </View>

                <View style={styles.statCard}>
                  <View style={styles.statCardInner}>
                    <View>
                      <Text style={styles.statLabel}>Total</Text>
                      <Text style={styles.statValue}>{items.length}</Text>
                    </View>
                    <FileText size={28} color={colors.primary} opacity={0.6} />
                  </View>
                </View>
              </View>

              <View style={styles.controlsRow}>
                <View style={styles.searchContainer}>
                  <Search size={16} color={colors.textSecondary} style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search employee or role..."
                    placeholderTextColor={colors.textSecondary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                </View>

                <TouchableOpacity style={styles.filterTrigger} onPress={() => setFilterModalOpen(true)} activeOpacity={0.7}>
                  <Text style={styles.filterTriggerText} numberOfLines={1}>
                    {filterOptions.find((o) => o.id === statusFilter)?.label || "Approval status"}
                  </Text>
                  <ChevronDown size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {onboardingQuery.isLoading && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.loadingText}>Loading onboarding records...</Text>
                </View>
              )}
            </View>
          }
          ListEmptyComponent={
            !onboardingQuery.isLoading ? (
              onboardingQuery.isError ? (
                <View style={styles.errorStateCard}>
                  <RefreshCw size={36} color={colors.primary} style={{ marginBottom: 10 }} />
                  <Text style={styles.errorStateTitle}>Server Response Delayed</Text>
                  <Text style={styles.errorStateSubtitle}>
                    The server is taking longer than expected to process records.
                  </Text>
                  <TouchableOpacity style={styles.retryButton} onPress={onRefresh} activeOpacity={0.8}>
                    <RefreshCw size={16} color="#ffffff" style={{ marginRight: 8 }} />
                    <Text style={styles.retryButtonText}>Refresh Data</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.emptyContainer}>
                  <FileText size={40} color={colors.textSecondary} style={{ opacity: 0.5 }} />
                  <Text style={styles.emptyText}>No onboarding records found</Text>
                </View>
              )
            ) : null
          }
        />
      </View>

      <Modal visible={filterModalOpen} transparent animationType="fade" onRequestClose={() => setFilterModalOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setFilterModalOpen(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Approval Status</Text>
              <TouchableOpacity onPress={() => setFilterModalOpen(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            {filterOptions.map((option) => {
              const isSelected = statusFilter === option.id;
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[styles.modalOptionItem, isSelected && { backgroundColor: colors.grayBg }]}
                  onPress={() => {
                    setStatusFilter(option.id);
                    setFilterModalOpen(false);
                  }}
                >
                  <Text style={[styles.modalOptionText, isSelected && { color: colors.primary, fontWeight: "700" }]}>
                    {option.label}
                  </Text>
                  {isSelected && <Check size={16} color={colors.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors, isTablet: boolean) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    container: { flex: 1 },
    listContent: { paddingHorizontal: isTablet ? 24 : 16, paddingBottom: 40 },
    headerSection: { paddingTop: 16, marginBottom: 12 },
    pageHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
    pageTitle: { fontSize: isTablet ? 26 : 22, fontWeight: "800", color: colors.text, letterSpacing: -0.3 },
    pageSubtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
    headerRefreshBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
      marginLeft: 12,
    },
    statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 16 },
    statCard: {
      width: isTablet ? "23.5%" : "48%",
      backgroundColor: colors.cardBg,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
    },
    statCardInner: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    statLabel: { fontSize: 12, fontWeight: "500", color: colors.textSecondary },
    statValue: { fontSize: 20, fontWeight: "800", color: colors.text, marginTop: 2 },
    controlsRow: { flexDirection: isTablet ? "row" : "column", gap: 10, marginBottom: 12 },
    searchContainer: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 10,
      height: 42,
    },
    searchIcon: { marginRight: 8 },
    searchInput: { flex: 1, fontSize: 14, color: colors.text, paddingVertical: 0 },
    filterTrigger: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      height: 42,
      minWidth: isTablet ? 180 : "100%",
    },
    filterTriggerText: { fontSize: 14, color: colors.text },
    cardContainer: {
      backgroundColor: colors.cardBg,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginBottom: 10,
    },
    cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 12 },
    avatarRow: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
    avatarCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.grayBg,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      borderWidth: 1,
      borderColor: colors.border,
    },
    avatarText: { fontSize: 13, fontWeight: "700", color: colors.text },
    employeeName: { fontSize: 15, fontWeight: "700", color: colors.text },
    startDateText: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    badgeText: { fontSize: 11, fontWeight: "700" },
    progressSection: { marginBottom: 12 },
    progressRowHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
    progressLabel: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },
    progressStatusText: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },
    progressBarTrack: { height: 6, width: "100%", backgroundColor: colors.grayBg, borderRadius: 3, overflow: "hidden" },
    progressBarFill: { height: "100%", borderRadius: 3 },
    cardFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    docCountLabel: { fontSize: 12, color: colors.textSecondary },
    docCountValue: { fontSize: 12, fontWeight: "700", color: colors.text },
    loadingContainer: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 24 },
    loadingText: { fontSize: 14, color: colors.textSecondary },
    errorStateCard: {
      backgroundColor: colors.cardBg,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 24,
      alignItems: "center",
      justifyContent: "center",
      marginVertical: 20,
    },
    errorStateTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 4 },
    errorStateSubtitle: { fontSize: 13, color: colors.textSecondary, textAlign: "center", marginBottom: 16, paddingHorizontal: 12 },
    retryButton: { flexDirection: "row", alignItems: "center", backgroundColor: colors.primary, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 8 },
    retryButtonText: { color: "#ffffff", fontSize: 14, fontWeight: "700" },
    emptyContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 40, gap: 8 },
    emptyText: { fontSize: 14, color: colors.textSecondary },
    modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: "center", alignItems: "center", paddingHorizontal: 20 },
    modalContent: { width: "100%", maxWidth: 360, backgroundColor: colors.cardBg, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 16 },
    modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 8 },
    modalTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
    modalOptionItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, paddingHorizontal: 10, borderRadius: 6 },
    modalOptionText: { fontSize: 14, color: colors.text },
  });
}