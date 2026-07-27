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
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiFetch } from "@/lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";
import { s } from "@/util/styles";
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
  ShieldCheck
} from "lucide-react-native";

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

function buildColors(uiTheme: any, isDark: boolean) {
  return {
    background:      uiTheme.panelColors?.dashboardBackground     || (isDark ? "#0B0F17" : "#f8fafc"),
    panelHeader:     isDark ? "#161B22" : "#ffffff",
    cardBg:          uiTheme.panelColors?.dashboardCardBackground || (isDark ? "#111827" : "#f1f5f9"),
    text:            uiTheme.panelColors?.dashboardTextColor      || (isDark ? "#f1f5f9" : "#0f172a"),
    textSecondary:   isDark ? "#9CA3AF" : "#475569",
    border:          isDark ? "#2B313D" : "#e2e8f0",
    primary:         uiTheme.customColors?.primary                || "#FFD27A",
    success:         "#16C784",
    warning:         "#F59E0B",
    danger:          "#EF4444",
    purple:          "#A855F7",
  };
}

function createStyles(
  colors: ReturnType<typeof buildColors>,
  wp: (percentage: number) => number,
  hp: (percentage: number) => number
) {
  return StyleSheet.create({
    mainViewport: {
      flex: 1,
      backgroundColor: colors.background,
    },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: wp(4.2),
      paddingTop: hp(2),
      marginBottom: hp(1.7),
    },
    headerTitle: {
      fontSize: wp(6),
      fontWeight: "900",
      color: colors.primary,
    },
    headerSubtitle: {
      fontSize: wp(3.3),
      color: colors.textSecondary,
      marginTop: hp(0.25),
    },
    iconContainerBg: {
      width: wp(11),
      height: wp(11),
      borderRadius: wp(2.5),
      backgroundColor: "rgba(255, 210, 122, 0.08)",
      justifyContent: "center",
      alignItems: "center",
    },
    metricsSummaryContainer: {
      flexDirection: "row",
      marginHorizontal: wp(4.2),
      backgroundColor: colors.cardBg,
      borderRadius: wp(3),
      padding: wp(3.2),
      marginBottom: hp(1.7),
      borderWidth: 1,
      borderColor: colors.border,
    },
    metricItemBox: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    metricCountText: {
      fontSize: wp(4),
      fontWeight: "800",
      color: colors.text,
    },
    metricLabelText: {
      fontSize: wp(2.6),
      color: colors.textSecondary,
      fontWeight: "600",
      marginTop: hp(0.25),
      textTransform: "uppercase",
    },
    searchSectionBar: {
      flexDirection: "row",
      paddingHorizontal: wp(4.2),
      alignItems: "center",
      marginBottom: hp(1.7),
      gap: wp(2.5),
    },
    searchWrapperInput: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.cardBg,
      borderRadius: wp(2),
      paddingHorizontal: wp(3.2),
      height: hp(5.2),
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchIconSymbol: {
      marginRight: wp(2),
    },
    searchInputField: {
      flex: 1,
      color: colors.text,
      fontSize: wp(3.3),
    },
    refreshButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.cardBg,
      height: hp(5.2),
      paddingHorizontal: wp(3.6),
      borderRadius: wp(2),
      borderWidth: 1,
      borderColor: colors.primary,
    },
    refreshButtonText: {
      color: colors.primary,
      fontSize: wp(3),
      fontWeight: "700",
      marginLeft: wp(1.5),
    },
    buttonPressed: {
      opacity: 0.8,
    },
    loadingStateFallback: {
      padding: wp(10),
      alignItems: "center",
      justifyContent: "center",
    },
    loadingStateText: {
      color: colors.textSecondary,
      fontSize: wp(3.3),
      marginTop: hp(1.2),
    },
    emptyStateFallback: {
      padding: wp(10),
      alignItems: "center",
      justifyContent: "center",
      marginTop: hp(2.5),
    },
    emptyStateHeading: {
      color: colors.text,
      fontSize: wp(3.8),
      fontWeight: "700",
      marginTop: hp(1.5),
    },
    emptyStateSubtext: {
      color: colors.textSecondary,
      fontSize: wp(3),
      marginTop: hp(0.5),
      textAlign: "center",
    },
    scrollContainerLayout: {
      paddingHorizontal: wp(4.2),
      paddingBottom: hp(5),
    },
    requestCardRow: {
      backgroundColor: colors.cardBg,
      borderRadius: wp(3),
      padding: wp(3.6),
      marginBottom: hp(1.5),
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardTopHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: hp(1.5),
    },
    employeeMetaIdentity: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
      marginRight: wp(2),
    },
    avatarPlaceholderIcon: {
      width: wp(5.8),
      height: wp(5.8),
      borderRadius: wp(2.9),
      backgroundColor: "rgba(255,210,122,0.1)",
      alignItems: "center",
      justifyContent: "center",
      marginRight: wp(2),
    },
    employeeNameText: {
      color: colors.text,
      fontSize: wp(3.6),
      fontWeight: "800",
    },
    badgeStyle: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: wp(2),
      paddingVertical: hp(0.5),
      borderRadius: wp(1.5),
    },
    badgeApproved: {
      backgroundColor: "rgba(22, 199, 132, 0.12)",
    },
    badgeRejected: {
      backgroundColor: "rgba(239, 68, 68, 0.12)",
    },
    badgePending: {
      backgroundColor: "rgba(245, 158, 11, 0.12)",
    },
    badgeText: {
      fontSize: wp(2.5),
      fontWeight: "800",
      textTransform: "uppercase",
    },
    cardMiddleDetails: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: hp(1.5),
    },
    metaDetailBlock: {
      width: "48%",
    },
    metaDetailLabel: {
      fontSize: wp(2.3),
      color: colors.textSecondary,
      fontWeight: "700",
      letterSpacing: 0.5,
      marginBottom: hp(0.25),
    },
    metaDetailValue: {
      color: colors.text,
      fontSize: wp(3),
      fontWeight: "600",
      textTransform: "capitalize",
    },
    cardFooterMetricsDivider: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderTopWidth: 1,
      borderColor: colors.border,
      paddingTop: hp(1.2),
      gap: wp(2.5),
    },
    reasonCardPreviewText: {
      flex: 1,
      color: colors.textSecondary,
      fontSize: wp(3),
      fontStyle: "italic",
    },
    eodTagBadge: {
      paddingHorizontal: wp(1.5),
      paddingVertical: hp(0.25),
      borderRadius: wp(1),
      borderWidth: 1,
    },
    eodExempt: {
      backgroundColor: "rgba(168, 85, 247, 0.08)",
      borderColor: "rgba(168, 85, 247, 0.2)",
    },
    eodRequired: {
      backgroundColor: "rgba(148, 163, 184, 0.05)",
      borderColor: "rgba(148, 163, 184, 0.15)",
    },
    eodTagText: {
      fontSize: wp(2.3),
      fontWeight: "700",
    },
    modalViewportContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    modalTopNavigationHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: wp(4.2),
      borderBottomWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.panelHeader,
    },
    modalHeaderTitle: {
      fontSize: wp(3.8),
      fontWeight: "900",
      color: colors.text,
    },
    modalCloseButtonAnchor: {
      padding: wp(1),
    },
    modalScrollBodyArea: {
      padding: wp(4.2),
    },
    modalHeroMetadataBlock: {
      alignItems: "center",
      backgroundColor: colors.cardBg,
      padding: wp(5),
      borderRadius: wp(3),
      marginBottom: hp(2),
      borderBottomWidth: 2,
      borderColor: colors.primary,
    },
    avatarCircleBig: {
      width: wp(14.5),
      height: wp(14.5),
      borderRadius: wp(7.25),
      backgroundColor: "rgba(255,210,122,0.08)",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: hp(1.2),
    },
    modalEmployeeName: {
      color: colors.text,
      fontSize: wp(4.6),
      fontWeight: "900",
    },
    modalSystemRefId: {
      color: colors.textSecondary,
      fontSize: wp(2.8),
      marginTop: hp(0.5),
    },
    specificationsGridCard: {
      backgroundColor: colors.cardBg,
      borderRadius: wp(3),
      padding: wp(4.2),
      borderWidth: 1,
      borderColor: colors.border,
    },
    sectionFormGroupHeader: {
      fontSize: wp(2.8),
      fontWeight: "800",
      color: colors.primary,
      textTransform: "uppercase",
      marginBottom: hp(1.7),
      letterSpacing: 0.5,
    },
    specGridRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: hp(1.7),
    },
    specGridColumn: {
      width: "48%",
    },
    specFieldLabel: {
      fontSize: wp(2.5),
      color: colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.3,
    },
    specFieldValue: {
      fontSize: wp(3.3),
      color: colors.text,
      fontWeight: "700",
      marginTop: hp(0.25),
    },
    specDividerBorder: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: hp(1.2),
    },
    reasonTextAreaContainer: {
      backgroundColor: colors.background,
      borderRadius: wp(2),
      padding: wp(3.2),
      paddingLeft: wp(8.8),
      marginTop: hp(0.75),
      minHeight: hp(8.4),
      borderWidth: 1,
      borderColor: colors.border,
    },
    reasonFullTextBody: {
      color: colors.text,
      fontSize: wp(3.3),
      lineHeight: hp(2.2),
      fontStyle: "italic",
    },
    adminDisclaimerHint: {
      color: colors.textSecondary,
      fontSize: wp(2.8),
      lineHeight: hp(1.8),
      fontStyle: "italic",
    },
    inlineAdminIconText: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: hp(0.25),
    },
    dismissActionButton: {
      backgroundColor: colors.primary,
      height: hp(5.6),
      borderRadius: wp(2),
      justifyContent: "center",
      alignItems: "center",
      marginTop: hp(3),
      marginBottom: hp(5),
    },
    dismissActionText: {
      color: colors.panelHeader,
      fontWeight: "900",
      fontSize: wp(3.6),
    },
  });
}

export default function ManagerLeaveRequests() {
  const { width, height } = useWindowDimensions();
  const wp = useMemo(() => (p: number) => (width * p) / 100, [width]);
  const hp = useMemo(() => (p: number) => (height * p) / 100, [height]);

  const { uiTheme } = useTheme();
  const isDark = (uiTheme?.theme as string) === "dark" || (uiTheme?.theme as string) === "metallic-elite";
  const colors = useMemo(() => buildColors(uiTheme, isDark), [uiTheme, isDark]);
  const styles = useMemo(() => createStyles(colors, wp, hp), [colors, wp, hp]);

  const [items, setItems] = useState<LeaveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedLeave, setSelectedLeave] = useState<LeaveItem | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

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
    load();
  }, []);

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

  const metrics = useMemo(() => {
    return {
      total: filtered.length,
      pending: filtered.filter((i) => i.status === "pending").length,
      approved: filtered.filter((i) => i.status === "approved").length,
      rejected: filtered.filter((i) => i.status === "rejected").length,
    };
  }, [filtered]);

  const renderStatusBadge = (status: LeaveStatus) => {
    switch (status) {
      case "approved":
        return (
          <View style={s([styles.badgeStyle, styles.badgeApproved])}>
            <CheckCircle2 size={11} color={colors.success} style={{ marginRight: 4 }} />
            <Text style={s([styles.badgeText, { color: colors.success }])}>Approved</Text>
          </View>
        );
      case "rejected":
        return (
          <View style={s([styles.badgeStyle, styles.badgeRejected])}>
            <XCircle size={11} color={colors.danger} style={{ marginRight: 4 }} />
            <Text style={s([styles.badgeText, { color: colors.danger }])}>Rejected</Text>
          </View>
        );
      default:
        return (
          <View style={s([styles.badgeStyle, styles.badgePending])}>
            <Clock size={11} color={colors.warning} style={{ marginRight: 4 }} />
            <Text style={s([styles.badgeText, { color: colors.warning }])}>Pending</Text>
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={s(styles.mainViewport)} edges={["top", "left", "right"]}>
      <View style={s(styles.headerRow)}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={s(styles.headerTitle)}>Leave Requests</Text>
          <Text style={s(styles.headerSubtitle)}>View employee PTO/leave coverage statuses</Text>
        </View>
        <View style={s(styles.iconContainerBg)}>
          <Calendar size={22} color={colors.primary} />
        </View>
      </View>

      <View style={s(styles.metricsSummaryContainer)}>
        <View style={s(styles.metricItemBox)}>
          <Text style={s(styles.metricCountText)}>{metrics.total}</Text>
          <Text style={s(styles.metricLabelText)}>Filtered</Text>
        </View>
        <View style={s(styles.metricItemBox)}>
          <Text style={s([styles.metricCountText, { color: colors.warning }])}>{metrics.pending}</Text>
          <Text style={s(styles.metricLabelText)}>Pending</Text>
        </View>
        <View style={s(styles.metricItemBox)}>
          <Text style={s([styles.metricCountText, { color: colors.success }])}>{metrics.approved}</Text>
          <Text style={s(styles.metricLabelText)}>Approved</Text>
        </View>
        <View style={s(styles.metricItemBox)}>
          <Text style={s([styles.metricCountText, { color: colors.danger }])}>{metrics.rejected}</Text>
          <Text style={s(styles.metricLabelText)}>Rejected</Text>
        </View>
      </View>

      <View style={s(styles.searchSectionBar)}>
        <View style={s(styles.searchWrapperInput)}>
          <Search size={16} color={colors.textSecondary} style={s(styles.searchIconSymbol)} />
          <TextInput
            style={s(styles.searchInputField)}
            placeholder="Search by name, type, status..."
            placeholderTextColor={colors.textSecondary}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")} style={{ padding: 4 }}>
              <X size={14} color={colors.textSecondary} />
            </Pressable>
          )}
        </View>

        <Pressable
          style={({ pressed }) => s([styles.refreshButton, pressed && styles.buttonPressed, loading && { opacity: 0.6 }])}
          onPress={load}
          disabled={loading}
        >
          <RefreshCw size={15} color={colors.primary} />
          <Text style={s(styles.refreshButtonText)}>Refresh</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={s(styles.loadingStateFallback)}>
          <ActivityIndicator color={colors.primary} size="small" />
          <Text style={s(styles.loadingStateText)}>Syncing request logs...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s(styles.scrollContainerLayout)} showsVerticalScrollIndicator={false}>
          {filtered.length === 0 ? (
            <View style={s(styles.emptyStateFallback)}>
              <AlertCircle size={36} color={colors.textSecondary} />
              <Text style={s(styles.emptyStateHeading)}>No Leave Records Found</Text>
              <Text style={s(styles.emptyStateSubtext)}>No requests match your current search queries.</Text>
            </View>
          ) : (
            filtered.map((item) => (
              <Pressable
                key={item.id}
                style={s(styles.requestCardRow)}
                onPress={() => { setSelectedLeave(item); setIsDetailsOpen(true); }}
              >
                <View style={s(styles.cardTopHeader)}>
                  <View style={s(styles.employeeMetaIdentity)}>
                    <View style={s(styles.avatarPlaceholderIcon)}>
                      <User size={14} color={colors.primary} />
                    </View>
                    <Text style={s(styles.employeeNameText)} numberOfLines={1}>{item.employeeName}</Text>
                  </View>
                  {renderStatusBadge(item.status)}
                </View>

                <View style={s(styles.cardMiddleDetails)}>
                  <View style={s(styles.metaDetailBlock)}>
                    <Text style={s(styles.metaDetailLabel)}>LEAVE TYPE</Text>
                    <Text style={s(styles.metaDetailValue)}>{item.type}</Text>
                  </View>
                  <View style={s([styles.metaDetailBlock, { alignItems: "flex-end" }])}>
                    <Text style={s(styles.metaDetailLabel)}>DURATION PERIOD</Text>
                    <Text style={s(styles.metaDetailValue)}>
                      {formatDate(item.startDate)} - {formatDate(item.endDate)}
                    </Text>
                  </View>
                </View>

                <View style={s(styles.cardFooterMetricsDivider)}>
                  <Text style={s(styles.reasonCardPreviewText)} numberOfLines={1}>
                    {item.reason ? `“${item.reason}”` : "No explanatory reason supplied."}
                  </Text>
                  <View style={s([styles.eodTagBadge, item.exemptFromEOD ? styles.eodExempt : styles.eodRequired])}>
                    <Text style={s([styles.eodTagText, { color: item.exemptFromEOD ? colors.purple : colors.textSecondary }])}>
                      {item.exemptFromEOD ? "EOD Exempt" : "EOD Required"}
                    </Text>
                  </View>
                </View>
              </Pressable>
            ))
          )}
        </ScrollView>
      )}

      <Modal
        visible={isDetailsOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsDetailsOpen(false)}
      >
        <SafeAreaView style={s(styles.modalViewportContainer)}>
          <View style={s(styles.modalTopNavigationHeader)}>
            <Text style={s(styles.modalHeaderTitle)}>Leave Specification Audit</Text>
            <Pressable style={s(styles.modalCloseButtonAnchor)} onPress={() => setIsDetailsOpen(false)}>
              <X size={18} color={colors.text} />
            </Pressable>
          </View>

          {selectedLeave && (
            <ScrollView contentContainerStyle={s(styles.modalScrollBodyArea)}>
              <View style={s(styles.modalHeroMetadataBlock)}>
                <View style={s(styles.avatarCircleBig)}>
                  <User size={28} color={colors.primary} />
                </View>
                <Text style={s(styles.modalEmployeeName)}>{selectedLeave.employeeName}</Text>
                <Text style={s(styles.modalSystemRefId)}>Request Identifier: {selectedLeave.id}</Text>
                <View style={{ marginTop: 12 }}>
                  {renderStatusBadge(selectedLeave.status)}
                </View>
              </View>

              <View style={s(styles.specificationsGridCard)}>
                <Text style={s(styles.sectionFormGroupHeader)}>Core Request Parameters</Text>

                <View style={s(styles.specGridRow)}>
                  <View style={s(styles.specGridColumn)}>
                    <Text style={s(styles.specFieldLabel)}>Classification Type</Text>
                    <Text style={s([styles.specFieldValue, { textTransform: "capitalize" }])}>{selectedLeave.type}</Text>
                  </View>
                  <View style={s(styles.specGridColumn)}>
                    <Text style={s(styles.specFieldLabel)}>End-Of-Day Logging</Text>
                    <Text style={s(styles.specFieldValue)}>{selectedLeave.exemptFromEOD ? "Exempt From Logs" : "Standard Requirement"}</Text>
                  </View>
                </View>

                <View style={s(styles.specGridRow)}>
                  <View style={s(styles.specGridColumn)}>
                    <Text style={s(styles.specFieldLabel)}>Leave Commencement</Text>
                    <Text style={s(styles.specFieldValue)}>{formatDate(selectedLeave.startDate)}</Text>
                  </View>
                  <View style={s(styles.specGridColumn)}>
                    <Text style={s(styles.specFieldLabel)}>Leave Conclusion</Text>
                    <Text style={s(styles.specFieldValue)}>{formatDate(selectedLeave.endDate)}</Text>
                  </View>
                </View>

                <View style={s(styles.specDividerBorder)} />

                <Text style={s(styles.specFieldLabel)}>Employee Submitted Reason</Text>
                <View style={s(styles.reasonTextAreaContainer)}>
                  <FileText size={14} color={colors.textSecondary} style={{ position: "absolute", top: 12, left: 12 }} />
                  <Text style={s(styles.reasonFullTextBody)}>
                    {selectedLeave.reason || "No written statement or reason was logged for this leave sequence requirement."}
                  </Text>
                </View>
              </View>

              <View style={s([styles.specificationsGridCard, { marginTop: 16 }])}>
                <Text style={s(styles.sectionFormGroupHeader)}>Administrative Authority Logs</Text>
                <Text style={s(styles.adminDisclaimerHint)}>
                  Managers hold read-only parameters review visibility over PTO schedules. Definitive status edits are logged by global infrastructure administration.
                </Text>

                <View style={s([styles.specGridRow, { marginTop: 12 }])}>
                  <View style={s(styles.specGridColumn)}>
                    <Text style={s(styles.specFieldLabel)}>Authorized Reviewer</Text>
                    <View style={s(styles.inlineAdminIconText)}>
                      <ShieldCheck size={13} color={colors.textSecondary} style={{ marginRight: 5 }} />
                      <Text style={s(styles.specFieldValue)}>{selectedLeave.approvedBy || "—"}</Text>
                    </View>
                  </View>
                  <View style={s(styles.specGridColumn)}>
                    <Text style={s(styles.specFieldLabel)}>Review Execution Stamp</Text>
                    <Text style={s(styles.specFieldValue)}>{selectedLeave.approvedAt ? formatDate(selectedLeave.approvedAt) : "—"}</Text>
                  </View>
                </View>
              </View>

              <Pressable style={s(styles.dismissActionButton)} onPress={() => setIsDetailsOpen(false)}>
                <Text style={s(styles.dismissActionText)}>Dismiss Review</Text>
              </Pressable>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}