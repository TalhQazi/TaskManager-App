import React, { useEffect, useMemo, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
  Dimensions,
} from "react-native";
import {
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  Search,
} from "lucide-react-native";
import { apiFetch } from "@/lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";

type LeaveStatus = "pending" | "approved" | "rejected";

interface LeaveItem {
  id: string;
  _id?: string;
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

function normalizeLeave(i: any): LeaveItem {
  return {
    id: String(i.id || i._id || ""),
    employeeName: String(i.employeeName || ""),
    type: String(i.type || "other"),
    startDate: String(i.startDate),
    endDate: String(i.endDate),
    status: i.status as LeaveStatus,
    reason: i.reason,
    exemptFromEOD: Boolean(i.exemptFromEOD),
    approvedAt: i.approvedAt,
    approvedBy: i.approvedBy,
    createdAt: i.createdAt,
  };
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const getStatusTheme = (status: LeaveStatus, isDark: boolean) => {
  switch (status) {
    case "approved":
      return { bg: isDark ? "rgba(22, 163, 74, 0.2)" : "#DCFCE7", text: isDark ? "#4ade80" : "#166534" };
    case "rejected":
      return { bg: isDark ? "rgba(220, 38, 38, 0.2)" : "#FEE2E2", text: isDark ? "#f87171" : "#991B1B" };
    case "pending":
    default:
      return { bg: isDark ? "#334155" : "#F3F4F6", text: isDark ? "#9ca3af" : "#374151" };
  }
};

export default function AdminLeaveRequests() {
  const { uiTheme } = useTheme();
  const isDark = (uiTheme.theme as string) === "dark" || (uiTheme.theme as string) === "metallic-elite";

  const colors = useMemo(() => ({
    background: uiTheme.panelColors?.dashboardBackground || (isDark ? "#0f172a" : "#f8fafc"),
    cardBg: uiTheme.panelColors?.dashboardCardBackground || (isDark ? "#1e293b" : "#ffffff"),
    text: uiTheme.panelColors?.dashboardTextColor || (isDark ? "#f8fafc" : "#0f172a"),
    mutedText: isDark ? "#94a3b8" : "#6b7280",
    border: isDark ? "#334155" : "#e2e8f0",
    inputBg: isDark ? "#0f172a" : "#ffffff",
    inputBorder: isDark ? "#334155" : "#d1d5db",
    inputText: isDark ? "#f8fafc" : "#111827",
    primary: uiTheme.customColors?.primary || "#6366F1",
    metaRowBg: isDark ? "#0f172a" : "#ffffff",
    metaRowBorder: isDark ? "#334155" : "#f3f4f6",
    footerBg: isDark ? "#111827" : "#f9fafb",
    success: "#16A34A",
    danger: "#DC2626",
  }), [uiTheme, isDark]);

  const styles = useMemo(() => createStyles(colors), [colors]);

  const [items, setItems] = useState<LeaveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [selected, setSelected] = useState<LeaveItem | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ items: any[] }>("/api/leave-requests/all");
      const normalized = (res.items || []).map(normalizeLeave);
      setItems(normalized);
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to load leave requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) =>
      i.employeeName.toLowerCase().includes(q) ||
      i.type.toLowerCase().includes(q) ||
      i.status.toLowerCase().includes(q)
    );
  }, [items, search]);

  const approve = async (id: string) => {
    try {
      setActionLoading(true);
      await apiFetch(`/api/leave-requests/${encodeURIComponent(id)}/approve`, { method: "PUT" });
      Alert.alert("Success", "Leave request approved safely.");
      await load();
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to approve");
    } finally {
      setActionLoading(false);
    }
  };

  const openReject = (item: LeaveItem) => {
    setSelected(item);
    setRejectReason("");
    setRejectOpen(true);
  };

  const reject = async () => {
    if (!selected) return;
    try {
      setActionLoading(true);
      await apiFetch(`/api/leave-requests/${encodeURIComponent(selected.id)}/reject`, {
        method: "PUT",
        body: JSON.stringify({ reason: rejectReason || "Request rejected" }),
      });
      Alert.alert("Rejected", "Leave request marks updated.");
      setRejectOpen(false);
      setSelected(null);
      await load();
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to reject");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.headerBlock}>
        <View style={styles.headerTitleGroup}>
          <Text style={styles.screenTitle}>Leave Requests</Text>
          <Text style={styles.screenSubTitle}>Approve or reject employee PTO/leave requests.</Text>
        </View>
        <Calendar size={22} color={colors.mutedText} />
      </View>

      <View style={styles.searchFilterCard}>
        <Text style={styles.cardSectionHeading}>All Requests ({filtered.length})</Text>
        
        <View style={styles.searchRowLayout}>
          <View style={styles.searchFieldWrapper}>
            <Search size={14} color={colors.mutedText} style={styles.searchBarIcon} />
            <TextInput
              style={styles.searchTextInputLine}
              placeholder="Search by employee, type..."
              placeholderTextColor={colors.mutedText}
              value={search}
              onChangeText={setSearch}
            />
          </View>
          
          <TouchableOpacity 
            style={[styles.refreshTouchableBtn, loading ? styles.disabledButton : null]} 
            onPress={() => void load()}
            disabled={loading}
          >
            <Text style={styles.refreshTouchableBtnText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.loaderStateBlock}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.loaderStateMessageText}>Synchronizing workflow logs...</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyPromptStateCard}>
          <Text style={styles.emptyPromptStateText}>No requests matching logs index data found.</Text>
        </View>
      ) : (
        <View style={styles.verticalCardsStackContainer}>
          {filtered.map((item) => {
            const startDateStr = new Date(item.startDate).toLocaleDateString();
            const endDateStr = new Date(item.endDate).toLocaleDateString();
            const badge = getStatusTheme(item.status, isDark);
            
            return (
              <View key={item.id} style={styles.leaveRequestRowItemCard}>
                <View style={styles.itemCardRowHeader}>
                  <View style={styles.employeeNameGroupStack}>
                    <Text style={styles.employeeNameText}>{item.employeeName}</Text>
                    <Text style={styles.leaveTypeCaptionLabelText}>{item.type}</Text>
                  </View>
                  
                  <View style={[styles.statusBadgeCapsuleFrame, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.statusBadgeCapsuleText, { color: badge.text }]}>
                      {item.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.metaVariablesContentBlock}>
                  <View style={styles.metaDataVariableRowInline}>
                    <Text style={styles.metaDataFieldLabel}>DATES:</Text>
                    <Text style={styles.metaDataFieldValueBody}>{startDateStr} — {endDateStr}</Text>
                  </View>

                  <View style={styles.metaDataVariableRowInline}>
                    <Text style={styles.metaDataFieldLabel}>EOD RULES:</Text>
                    <View style={styles.inlineExemptBadgeFrame}>
                      <Text style={styles.inlineExemptBadgeText}>
                        {item.exemptFromEOD ? "EXEMPT" : "REQUIRED"}
                      </Text>
                    </View>
                  </View>

                  {item.reason && (
                    <View style={styles.reasonBlockFieldContainer}>
                      <Text style={styles.metaDataFieldLabel}>REASON NOTES:</Text>
                      <Text style={styles.reasonTextValueBlockText}>{item.reason}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.itemCardFooterActionButtonsBlock}>
                  {item.status === "pending" ? (
                    <View style={styles.dualControlsGridSplitRow}>
                      <TouchableOpacity
                        style={[styles.actionBtnTouchableItem, styles.btnBgSuccess, actionLoading ? styles.disabledButton : null]}
                        onPress={() => void approve(item.id)}
                        disabled={actionLoading}
                      >
                        <CheckCircle size={14} color="#FFF" />
                        <Text style={styles.actionBtnTouchableItemText}>Approve</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionBtnTouchableItem, styles.btnBgDanger, actionLoading ? styles.disabledButton : null]}
                        onPress={() => openReject(item)}
                        disabled={actionLoading}
                      >
                        <XCircle size={14} color="#FFF" />
                        <Text style={styles.actionBtnTouchableItemText}>Reject</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.closedStateWorkflowTimelineIndicatorRow}>
                      {item.status === "approved" ? (
                        <CheckCircle size={14} color={colors.success} />
                      ) : (
                        <XCircle size={14} color={colors.danger} />
                      )}
                      <Text style={styles.closedStateWorkflowTimelineIndicatorRowText}>
                        Processed log terminal status: {item.status}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}

      <Modal visible={rejectOpen} transparent animationType="fade" onRequestClose={() => setRejectOpen(false)}>
        <View style={styles.modalScreenDimmingBackdropOverlay}>
          <View style={styles.modalContentCoreContainerCard}>
            <View style={styles.modalHeaderTopInlineTitleBlock}>
              <Clock size={18} color={colors.danger} />
              <Text style={styles.modalHeaderTitleTextText}>Reject Request</Text>
            </View>
            
            <Text style={styles.modalExplainerSecondaryText}>
              Optionally provide a reason. The employee will see it within their dashboard logs.
            </Text>

            <View style={styles.modalFormInputSectionArea}>
              <Text style={styles.modalInputTextMicroLabel}>REJECTION REASON</Text>
              <TextInput
                style={styles.modalInputTextFieldLine}
                placeholder="Type operational adjustment reason here..."
                placeholderTextColor={colors.mutedText}
                value={rejectReason}
                onChangeText={setRejectReason}
              />
            </View>

            <View style={styles.modalFooterTwinGridActionsRow}>
              <TouchableOpacity
                style={[styles.modalFooterTouchableActionBtn, styles.modalFooterTouchableBtnBgCancel]}
                onPress={() => setRejectOpen(false)}
                disabled={actionLoading}
              >
                <Text style={styles.modalFooterTouchableActionBtnTextCancel}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalFooterTouchableActionBtn, styles.modalFooterTouchableBtnBgDanger]}
                onPress={() => void reject()}
                disabled={actionLoading}
              >
                <Text style={styles.modalFooterTouchableActionBtnTextDanger}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      padding: 16,
      gap: 16,
    },
    headerBlock: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    headerTitleGroup: {
      gap: 2,
      flex: 1,
    },
    screenTitle: {
      fontSize: 22,
      fontWeight: "700",
      color: colors.text,
    },
    screenSubTitle: {
      fontSize: 13,
      color: colors.mutedText,
    },
    searchFilterCard: {
      backgroundColor: colors.cardBg,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      gap: 10,
    },
    cardSectionHeading: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
    },
    searchRowLayout: {
      flexDirection: "row",
      gap: 8,
    },
    searchFieldWrapper: {
      flex: 1,
      position: "relative",
      justifyContent: "center",
    },
    searchBarIcon: {
      position: "absolute",
      left: 10,
      zIndex: 2,
    },
    searchTextInputLine: {
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 6,
      height: 38,
      paddingLeft: 34,
      paddingRight: 10,
      fontSize: 13,
      color: colors.inputText,
    },
    refreshTouchableBtn: {
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 6,
      paddingHorizontal: 14,
      justifyContent: "center",
      alignItems: "center",
      height: 38,
    },
    refreshTouchableBtnText: {
      fontSize: 13,
      fontWeight: "500",
      color: colors.text,
    },
    loaderStateBlock: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 48,
      gap: 8,
    },
    loaderStateMessageText: {
      fontSize: 12,
      color: colors.mutedText,
    },
    emptyPromptStateCard: {
      backgroundColor: colors.cardBg,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 32,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyPromptStateText: {
      fontSize: 13,
      color: colors.mutedText,
      textAlign: "center",
    },
    verticalCardsStackContainer: {
      gap: 12,
    },
    leaveRequestRowItemCard: {
      backgroundColor: colors.cardBg,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      gap: 12,
    },
    itemCardRowHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 12,
    },
    employeeNameGroupStack: {
      gap: 2,
      flex: 1,
    },
    employeeNameText: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.text,
    },
    leaveTypeCaptionLabelText: {
      fontSize: 12,
      color: colors.mutedText,
      textTransform: "capitalize",
    },
    statusBadgeCapsuleFrame: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 4,
    },
    statusBadgeCapsuleText: {
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 0.3,
    },
    metaVariablesContentBlock: {
      backgroundColor: colors.metaRowBg,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.metaRowBorder,
      padding: 10,
      gap: 8,
    },
    metaDataVariableRowInline: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    metaDataFieldLabel: {
      fontSize: 10,
      fontWeight: "700",
      color: colors.mutedText,
      width: 90,
    },
    metaDataFieldValueBody: {
      fontSize: 12,
      color: colors.mutedText,
      fontWeight: "500",
    },
    inlineExemptBadgeFrame: {
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 4,
      backgroundColor: colors.cardBg,
    },
    inlineExemptBadgeText: {
      fontSize: 9,
      fontWeight: "600",
      color: colors.mutedText,
    },
    reasonBlockFieldContainer: {
      gap: 4,
      marginTop: 2,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 6,
    },
    reasonTextValueBlockText: {
      fontSize: 12,
      color: colors.mutedText,
      lineHeight: 16,
    },
    itemCardFooterActionButtonsBlock: {
      borderTopWidth: 1,
      borderTopColor: colors.metaRowBorder,
      paddingTop: 10,
    },
    dualControlsGridSplitRow: {
      flexDirection: "row",
      gap: 8,
    },
    actionBtnTouchableItem: {
      flex: 1,
      height: 34,
      borderRadius: 6,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
    },
    actionBtnTouchableItemText: {
      fontSize: 12,
      fontWeight: "600",
      color: "#FFF",
    },
    btnBgSuccess: { backgroundColor: colors.success },
    btnBgDanger: { backgroundColor: colors.danger },
    disabledButton: { opacity: 0.5 },
    closedStateWorkflowTimelineIndicatorRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      alignSelf: "flex-end",
    },
    closedStateWorkflowTimelineIndicatorRowText: {
      fontSize: 12,
      color: colors.mutedText,
    },
    modalScreenDimmingBackdropOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    modalContentCoreContainerCard: {
      width: "100%",
      maxWidth: SCREEN_WIDTH - 40,
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 16,
      gap: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 5,
    },
    modalHeaderTopInlineTitleBlock: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    modalHeaderTitleTextText: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
    },
    modalExplainerSecondaryText: {
      fontSize: 12,
      color: colors.mutedText,
      lineHeight: 16,
    },
    modalFormInputSectionArea: {
      gap: 6,
    },
    modalInputTextMicroLabel: {
      fontSize: 10,
      fontWeight: "700",
      color: colors.mutedText,
    },
    modalInputTextFieldLine: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 6,
      height: 38,
      paddingHorizontal: 10,
      fontSize: 13,
      color: colors.inputText,
      backgroundColor: colors.inputBg,
    },
    modalFooterTwinGridActionsRow: {
      flexDirection: "row",
      gap: 8,
      marginTop: 4,
    },
    modalFooterTouchableActionBtn: {
      flex: 1,
      height: 36,
      borderRadius: 6,
      justifyContent: "center",
      alignItems: "center",
    },
    modalFooterTouchableBtnBgCancel: {
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalFooterTouchableBtnBgDanger: {
      backgroundColor: colors.danger,
    },
    modalFooterTouchableActionBtnTextCancel: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.text,
    },
    modalFooterTouchableActionBtnTextDanger: {
      fontSize: 13,
      fontWeight: "600",
      color: "#FFF",
    },
  });
}