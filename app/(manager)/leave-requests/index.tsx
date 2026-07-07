import React, { useEffect, useMemo, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Modal,
  ActivityIndicator,
  Alert,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Custom API fetch utility from your project architecture
import { apiFetch } from "@/lib/admin/apiClient";

// Lucide icons tailored for a clean mobile user experience
import {
  Calendar,
  Search,
  RefreshCw,
  User,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  X,
  Layers,
  ShieldCheck
} from "lucide-react-native";

// --- Interfaces & Types ---
type LeaveStatus = "pending" | "approved" | "rejected";

interface LeaveItem {
  id: string;
  employeeName: string;
  type: string;
  startDate: string;
  endDate: string;
  status: LeaveStatus;
  reason?: string;
  exemptFromEOD?: boolean;
  approvedAt?: string;
  approvedBy?: string;
  createdAt?: string;
}

interface LeaveApiItem {
  id?: string;
  _id?: string;
  employeeName?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
  status?: LeaveStatus;
  reason?: string;
  exemptFromEOD?: boolean;
  approvedAt?: string;
  approvedBy?: string;
  createdAt?: string;
}

// --- Helper Functions ---
function normalizeLeave(i: LeaveApiItem): LeaveItem {
  return {
    id: String(i.id || i._id || ""),
    employeeName: String(i.employeeName || ""),
    type: String(i.type || "other"),
    startDate: String(i.startDate || ""),
    endDate: String(i.endDate || ""),
    status: (i.status as LeaveStatus) || "pending",
    reason: i.reason,
    exemptFromEOD: Boolean(i.exemptFromEOD),
    approvedAt: i.approvedAt,
    approvedBy: i.approvedBy,
    createdAt: i.createdAt,
  };
}

function formatDate(dateStr: string): string {
  if (!dateStr || dateStr.trim() === "") return "—";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

const { width } = Dimensions.get("window");

export default function ManagerLeaveRequests() {
  const [items, setItems] = useState<LeaveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Modal tracking states
  const [selectedLeave, setSelectedLeave] = useState<LeaveItem | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // --- API Request Pipeline ---
  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ items: LeaveApiItem[] }>("/api/leave-requests/all");
      setItems((res.items || []).map(normalizeLeave));
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to load leave requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  // --- Memoized Search Filter Logic ---
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.employeeName.toLowerCase().includes(q) ||
        i.type.toLowerCase().includes(q) ||
        i.status.toLowerCase().includes(q)
    );
  }, [items, search]);

  // --- Metrics Summary Panel State ---
  const metrics = useMemo(() => {
    return {
      total: filtered.length,
      pending: filtered.filter((i) => i.status === "pending").length,
      approved: filtered.filter((i) => i.status === "approved").length,
      rejected: filtered.filter((i) => i.status === "rejected").length,
    };
  }, [filtered]);

  // Custom Status Badge UI Renderer for Native Elements
  const renderStatusBadge = (status: LeaveStatus) => {
    switch (status) {
      case "approved":
        return (
          <View style={[styles.badgeStyle, styles.badgeApproved]}>
            <CheckCircle2 size={11} color="#4ade80" style={{ marginRight: 4 }} />
            <Text style={[styles.badgeText, { color: "#4ade80" }]}>Approved</Text>
          </View>
        );
      case "rejected":
        return (
          <View style={[styles.badgeStyle, styles.badgeRejected]}>
            <XCircle size={11} color="#f87171" style={{ marginRight: 4 }} />
            <Text style={[styles.badgeText, { color: "#f87171" }]}>Rejected</Text>
          </View>
        );
      default:
        return (
          <View style={[styles.badgeStyle, styles.badgePending]}>
            <Clock size={11} color="#facc15" style={{ marginRight: 4 }} />
            <Text style={[styles.badgeText, { color: "#facc15" }]}>Pending</Text>
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={styles.mainViewport} edges={["top", "left", "right"]}>
      
      {/* Premium Dashboard Header */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={styles.headerTitle}>Leave Requests</Text>
          <Text style={styles.headerSubtitle}>View employee PTO/leave coverage statuses</Text>
        </View>
        <View style={styles.iconContainerBg}>
          <Calendar size={22} color="#ffd27a" />
        </View>
      </View>

      {/* Real-time Status Breakdown Horizontal Counter */}
      <View style={styles.metricsSummaryContainer}>
        <View style={styles.metricItemBox}>
          <Text style={styles.metricCountText}>{metrics.total}</Text>
          <Text style={styles.metricLabelText}>Filtered</Text>
        </View>
        <View style={styles.metricItemBox}>
          <Text style={[styles.metricCountText, { color: "#facc15" }]}>{metrics.pending}</Text>
          <Text style={styles.metricLabelText}>Pending</Text>
        </View>
        <View style={styles.metricItemBox}>
          <Text style={[styles.metricCountText, { color: "#4ade80" }]}>{metrics.approved}</Text>
          <Text style={styles.metricLabelText}>Approved</Text>
        </View>
        <View style={styles.metricItemBox}>
          <Text style={[styles.metricCountText, { color: "#f87171" }]}>{metrics.rejected}</Text>
          <Text style={styles.metricLabelText}>Rejected</Text>
        </View>
      </View>

      {/* Control Filters Area */}
      <View style={styles.searchSectionBar}>
        <View style={styles.searchWrapperInput}>
          <Search size={16} color="#64748b" style={styles.searchIconSymbol} />
          <TextInput
            style={styles.searchInputField}
            placeholder="Search by name, type, status..."
            placeholderTextColor="#64748b"
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")} style={{ padding: 4 }}>
              <X size={14} color="#64748b" />
            </Pressable>
          )}
        </View>
        
        <Pressable 
          style={({ pressed }) => [styles.refreshButton, pressed && styles.buttonPressed, loading && { opacity: 0.6 }]}
          onPress={() => void load()}
          disabled={loading}
        >
          <RefreshCw size={15} color="#ffd27a" style={loading && { transform: [{ rotate: "45deg" }] }} />
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </Pressable>
      </View>

      {/* Main Request Matrix Content Display */}
      {loading ? (
        <View style={styles.loadingStateFallback}>
          <ActivityIndicator color="#ffd27a" size="small" />
          <Text style={styles.loadingStateText}>Syncing request logs...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContainerLayout} showsVerticalScrollIndicator={false}>
          {filtered.length === 0 ? (
            <View style={styles.emptyStateFallback}>
              <AlertCircle size={36} color="#334155" />
              <Text style={styles.emptyStateHeading}>No Leave Records Found</Text>
              <Text style={styles.emptyStateSubtext}>No requests match your current search queries.</Text>
            </View>
          ) : (
            filtered.map((item) => (
              <Pressable 
                key={item.id} 
                style={styles.requestCardRow} 
                onPress={() => { setSelectedLeave(item); setIsDetailsOpen(true); }}
              >
                {/* Employee Info Header Line */}
                <View style={styles.cardTopHeader}>
                  <View style={styles.employeeMetaIdentity}>
                    <View style={styles.avatarPlaceholderIcon}>
                      <User size={14} color="#ffd27a" />
                    </View>
                    <Text style={styles.employeeNameText} numberOfLines={1}>{item.employeeName}</Text>
                  </View>
                  {renderStatusBadge(item.status)}
                </View>

                {/* Date & Leave Classification Row */}
                <View style={styles.cardMiddleDetails}>
                  <View style={styles.metaDetailBlock}>
                    <Text style={styles.metaDetailLabel}>LEAVE TYPE</Text>
                    <Text style={styles.metaDetailValue}>{item.type}</Text>
                  </View>
                  <View style={[styles.metaDetailBlock, { alignItems: "flex-end" }]}>
                    <Text style={styles.metaDetailLabel}>DURATION PERIOD</Text>
                    <Text style={styles.metaDetailValue}>
                      {formatDate(item.startDate)} - {formatDate(item.endDate)}
                    </Text>
                  </View>
                </View>

                {/* Reason Preview Section and EOD Tag */}
                <View style={styles.cardFooterMetricsDivider}>
                  <Text style={styles.reasonCardPreviewText} numberOfLines={1}>
                    {item.reason ? `“${item.reason}”` : "No explanatory reason supplied."}
                  </Text>
                  <View style={[styles.eodTagBadge, item.exemptFromEOD ? styles.eodExempt : styles.eodRequired]}>
                    <Text style={[styles.eodTagText, { color: item.exemptFromEOD ? "#c084fc" : "#94a3b8" }]}>
                      {item.exemptFromEOD ? "EOD Exempt" : "EOD Required"}
                    </Text>
                  </View>
                </View>
              </Pressable>
            ))
          )}
        </ScrollView>
      )}

      {/* --- DETAILED PARAMS AUDIT modal DRAWERS --- */}
      <Modal 
        visible={isDetailsOpen} 
        animationType="slide" 
        presentationStyle="pageSheet" 
        onRequestClose={() => setIsDetailsOpen(false)}
      >
        <SafeAreaView style={styles.modalViewportContainer}>
          {/* Header Bar */}
          <View style={styles.modalTopNavigationHeader}>
            <Text style={styles.modalHeaderTitle}>Leave Specification Audit</Text>
            <Pressable style={styles.modalCloseButtonAnchor} onPress={() => setIsDetailsOpen(false)}>
              <X size={18} color="#fff" />
            </Pressable>
          </View>

          {selectedLeave && (
            <ScrollView contentContainerStyle={styles.modalScrollBodyArea}>
              
              {/* Profile Card Banner */}
              <View style={styles.modalHeroMetadataBlock}>
                <View style={styles.avatarCircleBig}>
                  <User size={28} color="#ffd27a" />
                </View>
                <Text style={styles.modalEmployeeName}>{selectedLeave.employeeName}</Text>
                <Text style={styles.modalSystemRefId}>Request Identifier: {selectedLeave.id}</Text>
                <View style={{ marginTop: 12 }}>
                  {renderStatusBadge(selectedLeave.status)}
                </View>
              </View>

              {/* Data Properties Cards Grid */}
              <View style={styles.specificationsGridCard}>
                <Text style={styles.sectionFormGroupHeader}>Core Request Parameters</Text>
                
                <View style={styles.specGridRow}>
                  <View style={styles.specGridColumn}>
                    <Text style={styles.specFieldLabel}>Classification Type</Text>
                    <Text style={[styles.specFieldValue, { textTransform: "capitalize" }]}>{selectedLeave.type}</Text>
                  </View>
                  <View style={styles.specGridColumn}>
                    <Text style={styles.specFieldLabel}>End-Of-Day Logging</Text>
                    <Text style={styles.specFieldValue}>{selectedLeave.exemptFromEOD ? "Exempt From Logs" : "Standard Requirement"}</Text>
                  </View>
                </View>

                <View style={styles.specGridRow}>
                  <View style={styles.specGridColumn}>
                    <Text style={styles.specFieldLabel}>Leave Commencement</Text>
                    <Text style={styles.specFieldValue}>{formatDate(selectedLeave.startDate)}</Text>
                  </View>
                  <View style={styles.specGridColumn}>
                    <Text style={styles.specFieldLabel}>Leave Conclusion</Text>
                    <Text style={styles.specFieldValue}>{formatDate(selectedLeave.endDate)}</Text>
                  </View>
                </View>

                <View style={styles.specDividerBorder} />

                {/* Request Explanatory Statement Box */}
                <Text style={styles.specFieldLabel}>Employee Submitted Reason</Text>
                <View style={styles.reasonTextAreaContainer}>
                  <FileText size={14} color="#64748b" style={{ position: 'absolute', top: 12, left: 12 }} />
                  <Text style={styles.reasonFullTextBody}>
                    {selectedLeave.reason || "No written statement or reason was logged for this leave sequence requirement."}
                  </Text>
                </View>
              </View>

              {/* Operations Authorization Logs View */}
              <View style={[styles.specificationsGridCard, { marginTop: 16 }]}>
                <Text style={styles.sectionFormGroupHeader}>Administrative Authority Logs</Text>
                <Text style={styles.adminDisclaimerHint}>
                  Managers hold read-only parameters review visibility over PTO schedules. Definitive status edits are logged by global infrastructure administration.
                </Text>

                <View style={[styles.specGridRow, { marginTop: 12 }]}>
                  <View style={styles.specGridColumn}>
                    <Text style={styles.specFieldLabel}>Authorized Reviewer</Text>
                    <View style={styles.inlineAdminIconText}>
                      <ShieldCheck size={13} color="#94a3b8" style={{ marginRight: 5 }} />
                      <Text style={styles.specFieldValue}>{selectedLeave.approvedBy || "—"}</Text>
                    </View>
                  </View>
                  <View style={styles.specGridColumn}>
                    <Text style={styles.specFieldLabel}>Review Execution Stamp</Text>
                    <Text style={styles.specFieldValue}>{selectedLeave.approvedAt ? formatDate(selectedLeave.approvedAt) : "—"}</Text>
                  </View>
                </View>
              </View>

              {/* Close Button Anchor */}
              <Pressable style={styles.dismissActionButton} onPress={() => setIsDetailsOpen(false)}>
                <Text style={styles.dismissActionText}>Dismiss Review</Text>
              </Pressable>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// --- PREMIUM SEAMLESS MOBILE DESIGN STYLES ---
const styles = StyleSheet.create({
  mainViewport: { flex: 1, backgroundColor: "#111315" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 16, marginBottom: 14 },
  headerTitle: { fontSize: 24, fontWeight: "900", color: "#ffd27a" },
  headerSubtitle: { fontSize: 13, color: "#64748b", marginTop: 2 },
  iconContainerBg: { width: 42, height: 42, borderRadius: 10, backgroundColor: "rgba(255, 210, 122, 0.08)", justifyContent: "center", alignItems: "center" },
  
  // Horizontal Performance Metrics Bar Style 
  metricsSummaryContainer: { flexDirection: "row", marginHorizontal: 16, backgroundColor: "#1e293b", borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.03)" },
  metricItemBox: { flex: 1, alignItems: "center", justifyContent: "center" },
  metricCountText: { fontSize: 16, fontWeight: "800", color: "#ffffff" },
  metricLabelText: { fontSize: 10, color: "#64748b", fontWeight: "600", marginTop: 2, textTransform: "uppercase" },

  // Control Row Filter Panel Objects
  searchSectionBar: { flexDirection: "row", paddingHorizontal: 16, alignItems: "center", marginBottom: 14, gap: 10 },
  searchWrapperInput: { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: "#1e293b", borderRadius: 8, paddingHorizontal: 12, height: 42, borderWidth: 1, borderColor: "#2d3748" },
  searchIconSymbol: { marginRight: 8 },
  searchInputField: { flex: 1, color: "#ffffff", fontSize: 13 },
  refreshButton: { flexDirection: "row", alignItems: "center", backgroundColor: "#1e293b", height: 42, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, borderColor: "#ffd27a" },
  refreshButtonText: { color: "#ffd27a", fontSize: 12, fontWeight: "700", marginLeft: 6 },
  buttonPressed: { opacity: 0.8 },

  // Fallbacks
  loadingStateFallback: { padding: 40, alignItems: "center", justifyContent: "center" },
  loadingStateText: { color: "#64748b", fontSize: 13, marginTop: 10 },
  emptyStateFallback: { padding: 40, alignItems: "center", justifyContent: "center", marginTop: 20 },
  emptyStateHeading: { color: "#ffffff", fontSize: 15, fontWeight: "700", marginTop: 12 },
  emptyStateSubtext: { color: "#475569", fontSize: 12, marginTop: 4, textAlign: "center" },

  // Mobile Clean Grid Scroll Body Container
  scrollContainerLayout: { paddingHorizontal: 16, paddingBottom: 40 },
  requestCardRow: { backgroundColor: "#1e293b", borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.02)" },
  cardTopHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  employeeMetaIdentity: { flexDirection: "row", alignItems: "center", flex: 1, marginRight: 8 },
  avatarPlaceholderIcon: { width: 22, height: 22, borderRadius: 11, backgroundColor: "rgba(255,210,122,0.1)", alignItems: "center", justifyContent: "center", marginRight: 8 },
  employeeNameText: { color: "#ffffff", fontSize: 14, fontWeight: "800" },
  
  // Custom Badges Configurations
  badgeStyle: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeApproved: { backgroundColor: "rgba(34, 197, 94, 0.12)" },
  badgeRejected: { backgroundColor: "rgba(239, 68, 68, 0.12)" },
  badgePending: { backgroundColor: "rgba(234, 179, 8, 0.12)" },
  badgeText: { fontSize: 10, fontWeight: "800", textTransform: "uppercase" },

  cardMiddleDetails: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  metaDetailBlock: { width: "48%" },
  metaDetailLabel: { fontSize: 9, color: "#64748b", fontWeight: "700", letterSpacing: 0.5, marginBottom: 2 },
  metaDetailValue: { color: "#94a3b8", fontSize: 12, fontWeight: "600", textTransform: "capitalize" },

  cardFooterMetricsDivider: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderColor: "rgba(255,255,255,0.05)", paddingTop: 10, gap: 10 },
  reasonCardPreviewText: { flex: 1, color: "#64748b", fontSize: 12, fontStyle: "italic" },
  eodTagBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1 },
  eodExempt: { backgroundColor: "rgba(192, 132, 252, 0.08)", borderColor: "rgba(192, 132, 252, 0.2)" },
  eodRequired: { backgroundColor: "rgba(148, 163, 184, 0.05)", borderColor: "rgba(148, 163, 184, 0.15)" },
  eodTagText: { fontSize: 9, fontWeight: "700" },

  // Detailed Modal Container Components
  modalViewportContainer: { flex: 1, backgroundColor: "#0f172a" },
  modalTopNavigationHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderColor: "#1e293b" },
  modalHeaderTitle: { fontSize: 15, fontWeight: "900", color: "#ffffff" },
  modalCloseButtonAnchor: { padding: 4 },
  modalScrollBodyArea: { padding: 16 },
  
  modalHeroMetadataBlock: { alignItems: "center", backgroundColor: "#1e293b", padding: 20, borderRadius: 12, marginBottom: 16, borderBottomWidth: 2, borderColor: "#ffd27a" },
  avatarCircleBig: { width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(255,210,122,0.08)", alignItems: "center", justifyContent: "center", marginBottom: 10 },
  modalEmployeeName: { color: "#ffffff", fontSize: 18, fontWeight: "900" },
  modalSystemRefId: { color: "#64748b", fontSize: 11, marginTop: 4 },

  specificationsGridCard: { backgroundColor: "#1e293b", borderRadius: 12, padding: 16 },
  sectionFormGroupHeader: { fontSize: 11, fontWeight: "800", color: "#ffd27a", textTransform: "uppercase", marginBottom: 14, letterSpacing: 0.5 },
  specGridRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14 },
  specGridColumn: { width: "48%" },
  specFieldLabel: { fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.3 },
  specFieldValue: { fontSize: 13, color: "#ffffff", fontWeight: "700", marginTop: 2 },
  specDividerBorder: { height: 1, backgroundColor: "rgba(255,255,255,0.05)", marginVertical: 10 },

  reasonTextAreaContainer: { backgroundColor: "#0f172a", borderRadius: 8, padding: 12, paddingLeft: 34, marginTop: 6, minHeight: 68, borderWidth: 1, borderColor: "#2d3748" },
  reasonFullTextBody: { color: "#cbd5e1", fontSize: 13, lineHeight: 18, fontStyle: "italic" },

  adminDisclaimerHint: { color: "#64748b", fontSize: 11, lineHeight: 15, fontStyle: "italic" },
  inlineAdminIconText: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  
  dismissActionButton: { backgroundColor: "#ffd27a", height: 46, borderRadius: 8, justifyContent: "center", alignItems: "center", marginTop: 24, marginBottom: 40 },
  dismissActionText: { color: "#111315", fontWeight: "900", fontSize: 14 }
});