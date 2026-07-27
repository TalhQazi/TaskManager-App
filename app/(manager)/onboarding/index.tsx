import React, { useMemo, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Search, FileText, CheckCircle2, Clock, ChevronDown, X } from "lucide-react-native";
import { apiFetch } from "@/lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";
import { s } from "@/util/styles";

interface OnboardingItem {
  id: string;
  employeeName: string;
  startDate: string;
  progress: number;
  documentsUploaded: number;
  documentsRequired: number;
  overallStatus: string;
}

interface OnboardingApi {
  id: string;
  employeeName: string;
  overallStatus: string;
  progress: number;
  basicInfo?: { completed?: boolean };
  identityVerification?: {
    primaryId?: { status?: string };
    secondaryId?: { status?: string };
  };
  w4Form?: { status?: string };
  employeeHandbook?: { status?: string };
  digitalSignature?: { status?: string };
  workInfo?: { completed?: boolean };
  createdAt?: string;
}

function docDone(statusStr?: string): boolean {
  return statusStr === "submitted" || statusStr === "verified";
}

function normalizeItem(i: OnboardingApi): OnboardingItem {
  let uploaded = 0;
  if (i.basicInfo?.completed) uploaded++;
  if (
    docDone(i.identityVerification?.primaryId?.status) &&
    docDone(i.identityVerification?.secondaryId?.status)
  ) {
    uploaded++;
  }
  if (docDone(i.w4Form?.status)) uploaded++;
  if (docDone(i.employeeHandbook?.status)) uploaded++;
  if (docDone(i.digitalSignature?.status)) uploaded++;

  return {
    id: String(i.id || ""),
    employeeName: i.employeeName || "—",
    startDate: i.createdAt || "",
    progress: typeof i.progress === "number" ? i.progress : 0,
    documentsUploaded: uploaded,
    documentsRequired: 5,
    overallStatus: i.overallStatus || "not_started",
  };
}

function buildColors(uiTheme: any) {
  const isDark = uiTheme.theme !== "crystal-white";
  return {
    background:      uiTheme.panelColors?.dashboardBackground     || (isDark ? "#09090b" : "#ffffff"),
    panelHeader:     uiTheme.panelColors?.dashboardCardBackground || (isDark ? "#141517" : "#f8fafc"),
    cardBg:          uiTheme.panelColors?.dashboardCardBackground || (isDark ? "#141517" : "#f8fafc"),
    text:            uiTheme.panelColors?.dashboardTextColor      || (isDark ? "#f8fafc" : "#000000"),
    textSecondary:   isDark ? "#94a3b8" : "#475569",
    border:          isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)",
    primary:         uiTheme.customColors?.primary                || "#3b82f6",
    success:         "#16C784",
    warning:         "#F59E0B",
    danger:          "#EF4444",
    info:            "#007AFF",
    neutral:         "#8E8E93"
  };
}

function createStyles(
  colors: ReturnType<typeof buildColors>,
  wp: (percentage: number) => number,
  hp: (percentage: number) => number
) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    center: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: wp(6),
    },
    errorText: {
      color: colors.danger,
      fontSize: wp(3.5),
      textAlign: "center",
    },
    headerContainer: {
      padding: wp(4.2),
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderColor: colors.border,
    },
    pageTitle: {
      fontSize: wp(6),
      fontWeight: "900",
      color: colors.text,
    },
    pageSubtitle: {
      fontSize: wp(3.3),
      color: colors.textSecondary,
      marginTop: hp(0.5),
      marginBottom: hp(2),
    },
    statsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      marginBottom: hp(2),
      gap: wp(2.5),
    },
    statCard: {
      width: wp(43),
      backgroundColor: colors.cardBg,
      borderRadius: wp(3),
      padding: wp(3.2),
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    statContent: {
      flex: 1,
    },
    statLabel: {
      fontSize: wp(3),
      color: colors.textSecondary,
      fontWeight: "600",
    },
    statValue: {
      fontSize: wp(5),
      fontWeight: "800",
      marginTop: hp(0.5),
      color: colors.text,
    },
    searchBarRow: {
      flexDirection: "row",
      marginTop: hp(0.5),
      gap: wp(2),
    },
    searchContainer: {
      flex: 1,
      flexDirection: "row",
      backgroundColor: colors.cardBg,
      borderRadius: wp(2.5),
      alignItems: "center",
      paddingHorizontal: wp(3),
      borderWidth: 1,
      borderColor: colors.border,
      height: hp(4.8),
    },
    searchIcon: {
      marginRight: wp(2),
    },
    searchInput: {
      flex: 1,
      color: colors.text,
      fontSize: wp(3.3),
      padding: 0,
    },
    pickerTrigger: {
      width: wp(32),
      height: hp(4.8),
      backgroundColor: colors.cardBg,
      borderRadius: wp(2.5),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: wp(3),
      borderWidth: 1,
      borderColor: colors.border,
    },
    pickerTriggerText: {
      fontSize: wp(3),
      fontWeight: "600",
      color: colors.text,
      flex: 1,
      marginRight: wp(1),
    },
    employeeCard: {
      backgroundColor: colors.cardBg,
      marginHorizontal: wp(4.2),
      marginTop: hp(1.5),
      borderRadius: wp(3),
      padding: wp(4),
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: hp(1.5),
    },
    empName: {
      fontSize: wp(3.8),
      fontWeight: "700",
      color: colors.text,
      flex: 1,
      marginRight: wp(2),
    },
    badge: {
      paddingHorizontal: wp(2),
      paddingVertical: hp(0.4),
      borderRadius: wp(1.5),
    },
    badgeText: {
      fontSize: wp(2.5),
      fontWeight: "700",
    },
    progressContainer: {
      marginBottom: hp(1),
    },
    progressMeta: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: hp(0.5),
    },
    progressText: {
      fontSize: wp(3),
      color: colors.textSecondary,
    },
    docCount: {
      fontSize: wp(3),
      color: colors.textSecondary,
    },
    progressBarTrack: {
      height: hp(0.75),
      backgroundColor: colors.border,
      borderRadius: wp(1),
      overflow: "hidden",
    },
    progressBarFill: {
      height: "100%",
    },
    startDate: {
      fontSize: wp(2.8),
      color: colors.textSecondary,
      opacity: 0.8,
    },
    emptyContainer: {
      padding: wp(12),
      alignItems: "center",
      justifyContent: "center",
    },
    emptyText: {
      color: colors.textSecondary,
      fontSize: wp(3.5),
      fontStyle: "italic",
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "flex-end",
    },
    modalContent: {
      backgroundColor: colors.panelHeader,
      borderTopLeftRadius: wp(4),
      borderTopRightRadius: wp(4),
      paddingBottom: hp(4.5),
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: wp(4.2),
      borderBottomWidth: 1,
      borderColor: colors.border,
    },
    modalTitle: {
      fontSize: wp(3.8),
      fontWeight: "800",
      color: colors.text,
    },
    modalItem: {
      padding: wp(4.2),
      borderBottomWidth: 1,
      borderColor: colors.border,
    },
    modalItemSelected: {
      backgroundColor: colors.border,
    },
    modalItemText: {
      fontSize: wp(3.5),
      color: colors.text,
    },
    modalItemTextSelected: {
      color: colors.primary,
      fontWeight: "700",
    },
  });
}

export default function OnboardingMonitoring() {
  const { width, height } = useWindowDimensions();
  const wp = useMemo(() => (p: number) => (width * p) / 100, [width]);
  const hp = useMemo(() => (p: number) => (height * p) / 100, [height]);

  const { uiTheme } = useTheme();
  const colors = useMemo(() => buildColors(uiTheme), [uiTheme]);
  const styles = useMemo(() => createStyles(colors, wp, hp), [colors, wp, hp]);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [pickerVisible, setPickerVisible] = useState(false);

  const onboardingQuery = useQuery({
    queryKey: ["onboarding"],
    queryFn: async () => {
      const res = await apiFetch<{ items: OnboardingApi[] }>("/api/onboarding/admin/all");
      return (res.items || []).map(normalizeItem);
    },
  });

  const items = onboardingQuery.data ?? [];

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch = !q || item.employeeName.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || item.overallStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [items, searchQuery, statusFilter]);

  const approvedCount = useMemo(() => items.filter((i) => i.overallStatus === "approved").length, [items]);
  const pendingReviewCount = useMemo(() => items.filter((i) => i.overallStatus === "submitted").length, [items]);
  const inProgressCount = useMemo(() => items.filter(
    (i) => i.overallStatus === "in_progress" || i.overallStatus === "not_started"
  ).length, [items]);

  const filterOptions = [
    { value: "all", label: "All Status" },
    { value: "not_started", label: "Not Started" },
    { value: "in_progress", label: "In Progress" },
    { value: "submitted", label: "Pending Review" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
  ];

  const statusThemeMap = useMemo(() => ({
    not_started: { bg: "rgba(142, 142, 147, 0.12)", text: colors.neutral, label: "Not Started" },
    in_progress: { bg: "rgba(245, 158, 11, 0.12)", text: colors.warning, label: "In Progress" },
    submitted:   { bg: "rgba(0, 122, 255, 0.12)", text: colors.info, label: "Pending Review" },
    approved:    { bg: "rgba(22, 199, 132, 0.12)", text: colors.success, label: "Approved" },
    rejected:    { bg: "rgba(239, 68, 68, 0.12)", text: colors.danger, label: "Rejected" },
  }), [colors]);

  const formatCommencementDate = (dateString: string) => {
    if (!dateString) return "—";
    const convertedDate = new Date(dateString);
    if (isNaN(convertedDate.getTime())) return dateString;
    return convertedDate.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  const renderHeader = () => (
    <View style={s(styles.headerContainer)}>
      <Text style={s(styles.pageTitle)}>Onboarding Monitoring</Text>
      <Text style={s(styles.pageSubtitle)}>Track employee onboarding progress and approvals</Text>

      <View style={s(styles.statsGrid)}>
        <View style={s(styles.statCard)}>
          <View style={s(styles.statContent)}>
            <Text style={s(styles.statLabel)}>In Progress</Text>
            <Text style={s(styles.statValue)}>{inProgressCount}</Text>
          </View>
          <Clock size={20} color={colors.warning} />
        </View>

        <View style={s(styles.statCard)}>
          <View style={s(styles.statContent)}>
            <Text style={s(styles.statLabel)}>Pending</Text>
            <Text style={s(styles.statValue)}>{pendingReviewCount}</Text>
          </View>
          <Clock size={20} color={colors.info} />
        </View>

        <View style={s(styles.statCard)}>
          <View style={s(styles.statContent)}>
            <Text style={s(styles.statLabel)}>Approved</Text>
            <Text style={s(styles.statValue)}>{approvedCount}</Text>
          </View>
          <CheckCircle2 size={20} color={colors.success} />
        </View>

        <View style={s(styles.statCard)}>
          <View style={s(styles.statContent)}>
            <Text style={s(styles.statLabel)}>Total</Text>
            <Text style={s(styles.statValue)}>{items.length}</Text>
          </View>
          <FileText size={20} color={colors.primary} />
        </View>
      </View>

      <View style={s(styles.searchBarRow)}>
        <View style={s(styles.searchContainer)}>
          <Search size={14} color={colors.textSecondary} style={s(styles.searchIcon)} />
          <TextInput
            style={s(styles.searchInput)}
            placeholder="Search employee..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
          />
        </View>

        <TouchableOpacity 
          style={s(styles.pickerTrigger)} 
          onPress={() => setPickerVisible(true)}
        >
          <Text style={s(styles.pickerTriggerText)} numberOfLines={1}>
            {filterOptions.find(o => o.value === statusFilter)?.label || "Filter"}
          </Text>
          <ChevronDown size={14} color={colors.text} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={s(styles.container)} edges={["top", "left", "right"]}>
      {onboardingQuery.isLoading ? (
        <View style={s(styles.center)}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : onboardingQuery.isError ? (
        <View style={s(styles.center)}>
          <Text style={s(styles.errorText)}>
            {onboardingQuery.error instanceof Error ? onboardingQuery.error.message : "Failed to load records"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={{ paddingBottom: hp(5) }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const currentTheme = statusThemeMap[item.overallStatus as keyof typeof statusThemeMap] || statusThemeMap.not_started;
            return (
              <View style={s(styles.employeeCard)}>
                <View style={s(styles.cardHeader)}>
                  <Text style={s(styles.empName)} numberOfLines={1}>{item.employeeName}</Text>
                  <View style={s([styles.badge, { backgroundColor: currentTheme.bg }])}>
                    <Text style={s([styles.badgeText, { color: currentTheme.text }])}>
                      {currentTheme.label}
                    </Text>
                  </View>
                </View>

                <View style={s(styles.progressContainer)}>
                  <View style={s(styles.progressMeta)}>
                    <Text style={s(styles.progressText)}>Progress: {item.progress}%</Text>
                    <Text style={s(styles.docCount)}>
                      Docs: {item.documentsUploaded}/{item.documentsRequired}
                    </Text>
                  </View>
                  <View style={s(styles.progressBarTrack)}>
                    <View style={s([styles.progressBarFill, { width: `${item.progress}%`, backgroundColor: item.progress === 100 ? colors.success : colors.primary }])} />
                  </View>
                </View>

                <Text style={s(styles.startDate)}>
                  Started: {formatCommencementDate(item.startDate)}
                </Text>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={s(styles.emptyContainer)}>
              <Text style={s(styles.emptyText)}>No onboarding records found</Text>
            </View>
          }
        />
      )}

      <Modal visible={pickerVisible} animationType="slide" transparent onRequestClose={() => setPickerVisible(false)}>
        <View style={s(styles.modalOverlay)}>
          <View style={s(styles.modalContent)}>
            <View style={s(styles.modalHeader)}>
              <Text style={s(styles.modalTitle)}>Select Status</Text>
              <TouchableOpacity onPress={() => setPickerVisible(false)}>
                <X size={18} color={colors.text} />
              </TouchableOpacity>
            </View>
            {filterOptions.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={s([styles.modalItem, statusFilter === opt.value && styles.modalItemSelected])}
                onPress={() => {
                  setStatusFilter(opt.value);
                  setPickerVisible(false);
                }}
              >
                <Text style={s([styles.modalItemText, statusFilter === opt.value && styles.modalItemTextSelected])}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}