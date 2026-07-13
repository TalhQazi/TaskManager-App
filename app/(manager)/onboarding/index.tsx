import React, { useMemo, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Search, FileText, CheckCircle2, Clock, ChevronDown, X } from "lucide-react-native";
import { apiFetch } from "@/lib/admin/apiClient";
import Colors from "@/constants/colors";

interface OnboardingItem {
  id: string;
  employeeName: string;
  startDate: string;
  progress: number;
  documentsUploaded: number;
  documentsRequired: number;
  overallStatus: string;
}

type OnboardingApi = {
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
};

function docDone(s?: string) {
  return s === "submitted" || s === "verified";
}

function normalizeItem(i: OnboardingApi): OnboardingItem {
  let uploaded = 0;
  if (i.basicInfo?.completed) uploaded++;
  if (
    docDone(i.identityVerification?.primaryId?.status) &&
    docDone(i.identityVerification?.secondaryId?.status)
  ) uploaded++;
  if (docDone(i.w4Form?.status)) uploaded++;
  if (docDone(i.employeeHandbook?.status)) uploaded++;
  if (docDone(i.digitalSignature?.status)) uploaded++;

  return {
    id: i.id,
    employeeName: i.employeeName || "—",
    startDate: i.createdAt || "",
    progress: i.progress ?? 0,
    documentsUploaded: uploaded,
    documentsRequired: 5,
    overallStatus: i.overallStatus || "not_started",
  };
}

const statusTheme: Record<string, { bg: string; text: string; label: string }> = {
  not_started: { bg: "rgba(142, 142, 147, 0.15)", text: "#8E8E93", label: "Not Started" },
  in_progress: { bg: "rgba(245, 158, 11, 0.15)", text: "#D97706", label: "In Progress" },
  submitted: { bg: "rgba(0, 122, 255, 0.15)", text: "#007AFF", label: "Pending Review" },
  approved: { bg: "rgba(52, 199, 89, 0.15)", text: "#34C759", label: "Approved" },
  rejected: { bg: "rgba(255, 59, 48, 0.15)", text: "#FF3B30", label: "Rejected" },
};

export default function OnboardingMonitoring() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [pickerVisible, setPickerVisible] = useState(false);

  const onboardingQuery = useQuery({
    queryKey: ["onboarding"],
    queryFn: async () => {
      const res = await apiFetch<{ items: OnboardingApi[] }>("/api/onboarding/admin/all");
      return res.items.map(normalizeItem);
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

  const approvedCount = items.filter((i) => i.overallStatus === "approved").length;
  const pendingReviewCount = items.filter((i) => i.overallStatus === "submitted").length;
  const inProgressCount = items.filter(
    (i) => i.overallStatus === "in_progress" || i.overallStatus === "not_started"
  ).length;

  const filterOptions = [
    { value: "all", label: "All Status" },
    { value: "not_started", label: "Not Started" },
    { value: "in_progress", label: "In Progress" },
    { value: "submitted", label: "Pending Review" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
  ];

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <Text style={styles.pageTitle}>Onboarding Monitoring</Text>
      <Text style={styles.pageSubtitle}>Track employee onboarding progress and approvals</Text>

      {/* STATS MATRIX GRID */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <View style={styles.statContent}>
            <Text style={styles.statLabel}>In Progress</Text>
            <Text style={styles.statValue}>{inProgressCount}</Text>
          </View>
          <Clock size={24} color="#D97706" style={{ opacity:1 }} />
        </View>

        <View style={styles.statCard}>
          <View style={styles.statContent}>
            <Text style={styles.statLabel}>Pending</Text>
            <Text style={styles.statValue}>{pendingReviewCount}</Text>
          </View>
          <Clock size={24} color="#007AFF" style={{ opacity:1 }} />
        </View>

        <View style={styles.statCard}>
          <View style={styles.statContent}>
            <Text style={styles.statLabel}>Approved</Text>
            <Text style={styles.statValue}>{approvedCount}</Text>
          </View>
          <CheckCircle2 size={24} color="#34C759" style={{ opacity: 1 }} />
        </View>

        <View style={styles.statCard}>
          <View style={styles.statContent}>
            <Text style={styles.statLabel}>Total</Text>
            <Text style={styles.statValue}>{items.length}</Text>
          </View>
          <FileText size={24} color="#5856D6" style={{ opacity: 1}} />
        </View>
      </View>

      {/* SEARCH AND SELECT CONTROLS */}
      <View style={styles.searchBarRow}>
        <View style={styles.searchContainer}>
          <Search size={16} color="#8E8E93" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search employee..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <TouchableOpacity 
          style={styles.pickerTrigger} 
          onPress={() => setPickerVisible(true)}
        >
          <Text style={styles.pickerTriggerText} numberOfLines={1}>
            {filterOptions.find(o => o.value === statusFilter)?.label || "Filter"}
          </Text>
          <ChevronDown size={16} color="#000" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {onboardingQuery.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : onboardingQuery.isError ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>
            {onboardingQuery.error instanceof Error ? onboardingQuery.error.message : "Failed to load records"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => {
            const currentTheme = statusTheme[item.overallStatus] || statusTheme.not_started;
            return (
              <View style={styles.employeeCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.empName}>{item.employeeName}</Text>
                  <View style={[styles.badge, { backgroundColor: currentTheme.bg }]}>
                    <Text style={[styles.badgeText, { color: currentTheme.text }]}>
                      {currentTheme.label}
                    </Text>
                  </View>
                </View>

                {/* Custom Native Progress Component */}
                <View style={styles.progressContainer}>
                  <View style={styles.progressMeta}>
                    <Text style={styles.progressText}>Progress: {item.progress}%</Text>
                    <Text style={styles.docCount}>
                      Docs: {item.documentsUploaded}/{item.documentsRequired}
                    </Text>
                  </View>
                  <View style={styles.progressBarTrack}>
                    <View style={[styles.progressBarFill, { width: `${item.progress}%` }]} />
                  </View>
                </View>

                <Text style={styles.startDate}>
                  Started: {item.startDate ? new Date(item.startDate).toLocaleDateString() : "—"}
                </Text>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No onboarding records found</Text>
            </View>
          }
        />
      )}

      {/* FILTER OPTION BOTTOM MODAL SHEET */}
      <Modal visible={pickerVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Status</Text>
              <TouchableOpacity onPress={() => setPickerVisible(false)}>
                <X size={22} color="#000" />
              </TouchableOpacity>
            </View>
            {filterOptions.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.modalItem, statusFilter === opt.value && styles.modalItemSelected]}
                onPress={() => {
                  setStatusFilter(opt.value);
                  setPickerVisible(false);
                }}
              >
                <Text style={[styles.modalItemText, statusFilter === opt.value && styles.modalItemTextSelected]}>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { color: "#FF3B30", fontSize: 15, padding: 16 },
  headerContainer: { padding: 16, backgroundColor: Colors.background, borderBottomWidth: 1, borderColor: "#E5E5EA" },
  pageTitle: { fontSize: 24, fontWeight: "bold", color: Colors.surface},
  pageSubtitle: { fontSize: 13, color: "#8E8E93", marginTop: 4, marginBottom: 16 },
  
  // Matrix Box Grid Styles
  statsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 16 },
  statCard: { width: "48%", backgroundColor: "#F8F9FA", borderRadius: 12, padding: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10, borderWidth: 1, borderColor: "#E5E5EA" },
  statContent: { flex: 1 },
  statLabel: { fontSize: 12, color: "#8E8E93" },
  statValue: { fontSize: 20, fontWeight: "bold", marginTop: 4 },

  // Control Rows
  searchBarRow: { flexDirection: "row", marginTop: 4 },
  searchContainer: { flex: 1, flexDirection: "row", backgroundColor: "#F2F2F7", borderRadius: 10, alignItems: "center", paddingHorizontal: 10, marginRight: 8 },
  searchIcon: { marginRight: 6 },
  searchInput: { flex: 1, height: 36, fontSize: 14, padding: 0 },
  pickerTrigger: { width: 130, height: 36, backgroundColor: "#F2F2F7", borderRadius: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 10 },
  pickerTriggerText: { fontSize: 13, fontWeight: "500", flex: 1, marginRight: 4 },

  // Native Data List Card Elements
  employeeCard: { backgroundColor: Colors.background, marginHorizontal: 16, marginTop: 12, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: "#E5E5EA" },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  empName: { fontSize: 16, fontWeight: "600", color: Colors.surface, flex: 1, marginRight: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: "600" },
  
  // Custom Progress Styles
  progressContainer: { marginBottom: 8 },
  progressMeta: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  progressText: { fontSize: 12, color: "#8E8E93" },
  docCount: { fontSize: 12, color: "#8E8E93" },
  progressBarTrack: { height: 6, backgroundColor: "#E5E5EA", borderRadius: 3, overflow: "hidden" },
  progressBarFill: { height: "100%", backgroundColor: "#34C759" },
  startDate: { fontSize: 11, color: "#AEAEB2" },

  emptyContainer: { padding: 40, alignItems: "center" },
  emptyText: { color: "#8E8E93", fontSize: 15 },

  // Interactive Modal Sheets
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#FFF", borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 32 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderColor: "#E5E5EA" },
  modalTitle: { fontSize: 16, fontWeight: "bold" },
  modalItem: { padding: 16, borderBottomWidth: 1, borderColor: "#F2F2F7" },
  modalItemSelected: { backgroundColor: "#F2F2F7" },
  modalItemText: { fontSize: 15, color: "#000" },
  modalItemTextSelected: { color: "#007AFF", fontWeight: "600" }
});