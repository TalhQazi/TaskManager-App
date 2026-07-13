import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  Dimensions,
  RefreshControl,
} from "react-native";
import {
  Timer,
  RefreshCw,
  CheckCircle2,
  XCircle,
  MessageSquare,
  User,
} from "lucide-react-native";
import { apiFetch } from "@/lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";

const { width } = Dimensions.get("window");

interface RequestorProfile {
  name: string;
}

interface ApprovalItem {
  _id: string;
  module: string;
  requestedBy?: RequestorProfile;
  priority: "Urgent" | "High" | "Normal" | string;
  status: "Pending" | "Approved" | "Rejected" | string;
  createdAt: string;
}

interface ApiResponse {
  success: boolean;
  items?: ApprovalItem[];
}

function buildColors(uiTheme: any, isDark: boolean) {
  return {
    background:       uiTheme.panelColors?.dashboardBackground     || (isDark ? "#09090b" : "#F8FAFC"),
    cardBg:           uiTheme.panelColors?.dashboardCardBackground || (isDark ? "#18181b" : "#FFFFFF"),
    text:             uiTheme.panelColors?.dashboardTextColor      || (isDark ? "#F4F4F5" : "#0F172A"),
    textSecondary:    isDark ? "#A1A1AA" : "#475569",
    textMuted:        isDark ? "#71717A" : "#64748B",
    border:           isDark ? "#27272A" : "#E2E8F0",
    borderLight:      isDark ? "rgba(255,255,255,0.05)" : "#F1F5F9",
    primary:          uiTheme.customColors?.primary || "#FFD27A",
    primaryText:      "#09090b",
    successBg:        isDark ? "rgba(16,185,129,0.12)" : "#ECFDF5",
    successText:      isDark ? "#34D399" : "#10B981",
    dangerBg:         isDark ? "rgba(239,68,68,0.12)" : "#FEF2F2",
    dangerText:       isDark ? "#F87171" : "#EF4444",
    warningBg:        isDark ? "rgba(245,158,11,0.12)" : "#FFFBEB",
    warningText:      isDark ? "#FBBF24" : "#D97706",
  };
}

function createStyles(colors: ReturnType<typeof buildColors>) {
  return StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: colors.background },
    scrollContainerPadding: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 40 },
    headerLayoutRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
    inlineHeaderTitleGroup: { flexDirection: "row", alignItems: "center", gap: 6 },
    mainTitleText: { fontSize: 22, fontWeight: "900", letterSpacing: -0.5, color: colors.text },
    subtitleText: { fontSize: 13, marginTop: 4, fontWeight: "400", color: colors.textSecondary },
    topActionsGroup: { flexDirection: "row", alignItems: "center" },
    circularActionBtn: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.cardBg, borderColor: colors.border },
    kpiSummaryCard: { borderRadius: 14, borderWidth: 1, padding: 16, flexDirection: "row", alignItems: "center", marginBottom: 20, backgroundColor: colors.cardBg, borderColor: colors.border },
    kpiCardFlexLeftColumn: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
    iconBoxContainer: { width: 40, height: 40, borderRadius: 10, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(59,130,246,0.08)" },
    kpiLabelText: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.3, color: colors.textSecondary },
    kpiMetricsValueOutputText: { fontSize: 22, fontWeight: "800", marginTop: 2, letterSpacing: -0.5, color: colors.text },
    verticalSplitLineDivider: { width: 1, height: 36, marginHorizontal: 16, backgroundColor: colors.border },
    kpiMetricsRightMetaBlock: { alignItems: "flex-end", justifyContent: "center" },
    metaCountBigDigitsText: { fontSize: 18, fontWeight: "800", color: colors.text },
    metaCountSecondaryDescriptorText: { fontSize: 11, marginTop: 1, color: colors.textSecondary },
    sectionHeading: { fontSize: 12, fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 },
    inlineLoaderZoneWrapper: { marginVertical: 8, alignItems: "center" },
    ledgerRowCardContainer: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10, backgroundColor: colors.cardBg, borderColor: colors.border },
    ledgerRowTopLineFlexRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    moduleBadgeBox: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
    moduleBadgeText: { fontSize: 11, fontWeight: "600", color: colors.textSecondary },
    timestampText: { fontSize: 11, color: colors.textMuted },
    cardDetailsGrid: { paddingVertical: 12, gap: 6 },
    detailRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    detailLabel: { fontSize: 13, color: colors.textMuted },
    requestorProfileFlexRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    avatarFallbackBox: { height: 20, width: 20, borderRadius: 10, backgroundColor: colors.border, alignItems: "center", justifyContent: "center" },
    requestorNameText: { fontSize: 13, fontWeight: "500", color: colors.text },
    priorityBadgeBox: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
    priorityBadgeText: { fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
    itemCardDividerHorizontalBar: { height: 1, backgroundColor: colors.borderLight, marginVertical: 2 },
    cardActionsRow: { flexDirection: "row", borderTopWidth: 1, borderColor: colors.borderLight, paddingTop: 10, justifyContent: "flex-end", gap: 12 },
    actionIconButton: { width: 34, height: 34, borderRadius: 8, justifyContent: "center", alignItems: "center", backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
    emptyLedgerFallbackCard: { alignItems: "center", justifyContent: "center", paddingVertical: 64 },
    emptyLedgerHeadingText: { fontSize: 15, fontWeight: "700", marginBottom: 4, color: colors.text },
    emptyLedgerSubParagraphText: { fontSize: 13, textAlign: "center", color: colors.textSecondary },
  });
}

export default function ApprovalWorkflow() {
  const { uiTheme } = useTheme();
  const isDark = (uiTheme.theme as string) === "dark" || (uiTheme.theme as string) === "metallic-elite";
  const colors = useMemo(() => buildColors(uiTheme, isDark), [uiTheme, isDark]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch<ApiResponse>("/api/atlasbook/approvals");
      if (res?.success) setItems(res.items || []);
    } catch {
      Alert.alert("Sync Error", "Failed to retrieve approval records from structural server clusters.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleAction = (type: "approve" | "reject" | "comment", item: ApprovalItem) => {
    Alert.alert(
      "Authorization Context",
      `Execute structural action [${type.toUpperCase()}] against record allocation ${item._id}?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Confirm", onPress: () => Alert.alert("Success", "Operational parameters metrics committed successfully.") }
      ]
    );
  };

  const pendingCount = useMemo(() => {
    return items.filter((i) => i.status === "Pending").length;
  }, [items]);

  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  const getPriorityStyle = (priority?: string) => {
    if (priority === "Urgent") return { bg: colors.dangerBg, text: colors.dangerText };
    if (priority === "High") return { bg: colors.warningBg, text: colors.warningText };
    return { bg: colors.border, text: colors.textSecondary };
  };

  return (
    <SafeAreaView style={styles.mainContainer}>
      <FlatList
        data={items}
        keyExtractor={(item) => item._id || Math.random().toString()}
        contentContainerStyle={styles.scrollContainerPadding}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View>
            <View style={styles.headerLayoutRow}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <View style={styles.inlineHeaderTitleGroup}>
                  <Timer size={24} color={colors.primary} />
                  <Text style={styles.mainTitleText}>Approval Workflow</Text>
                </View>
                <Text style={styles.subtitleText}>Manage multi-level authorization context mappings</Text>
              </View>
              <View style={styles.topActionsGroup}>
                <TouchableOpacity activeOpacity={0.7} style={styles.circularActionBtn} onPress={() => { setLoading(true); load(); }}>
                  <RefreshCw size={14} color={colors.text} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.kpiSummaryCard}>
              <View style={styles.kpiCardFlexLeftColumn}>
                <View style={styles.iconBoxContainer}>
                  <Timer size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.kpiLabelText}>Pending My Approval</Text>
                  <Text style={styles.kpiMetricsValueOutputText}>{pendingCount}</Text>
                </View>
              </View>
              <View style={styles.verticalSplitLineDivider} />
              <View style={styles.kpiMetricsRightMetaBlock}>
                <Text style={styles.metaCountBigDigitsText}>{items.length}</Text>
                <Text style={styles.metaCountSecondaryDescriptorText}>Total Tasks</Text>
              </View>
            </View>

            <Text style={styles.sectionHeading}>Approval Requests Log</Text>

            {loading && (
              <View style={styles.inlineLoaderZoneWrapper}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyLedgerFallbackCard}>
              <CheckCircle2 size={32} color={colors.successText} style={{ marginBottom: 10 }} />
              <Text style={styles.emptyLedgerHeadingText}>Clear Queue Pipeline</Text>
              <Text style={styles.emptyLedgerSubParagraphText}>No pending verification authorizations required at this cycle.</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const priorityStyle = getPriorityStyle(item.priority);
          return (
            <View style={styles.ledgerRowCardContainer}>
              <View style={styles.ledgerRowTopLineFlexRow}>
                <View style={styles.moduleBadgeBox}>
                  <Text style={styles.moduleBadgeText}>{item.module}</Text>
                </View>
                <Text style={styles.timestampText}>{formatDateTime(item.createdAt)}</Text>
              </View>

              <View style={styles.cardDetailsGrid}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Requested By</Text>
                  <View style={styles.requestorProfileFlexRow}>
                    <View style={styles.avatarFallbackBox}>
                      <User size={10} color={colors.textMuted} />
                    </View>
                    <Text style={styles.requestorNameText}>{item.requestedBy?.name || "System"}</Text>
                  </View>
                </View>

                <View style={styles.itemCardDividerHorizontalBar} />

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Priority Parameters</Text>
                  <View style={[styles.priorityBadgeBox, { backgroundColor: priorityStyle.bg }]}>
                    <Text style={[styles.priorityBadgeText, { color: priorityStyle.text }]}>{item.priority}</Text>
                  </View>
                </View>

                <View style={styles.itemCardDividerHorizontalBar} />

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Pipeline Status</Text>
                  <Text style={[styles.requestorNameText, { fontWeight: "700", color: item.status === "Pending" ? colors.warningText : colors.textMuted }]}>
                    {item.status}
                  </Text>
                </View>
              </View>

              <View style={styles.cardActionsRow}>
                <TouchableOpacity activeOpacity={0.7} style={styles.actionIconButton} onPress={() => handleAction("comment", item)}>
                  <MessageSquare size={16} color={colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.7} style={styles.actionIconButton} onPress={() => handleAction("reject", item)}>
                  <XCircle size={16} color={colors.dangerText} />
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.7} style={styles.actionIconButton} onPress={() => handleAction("approve", item)}>
                  <CheckCircle2 size={16} color={colors.successText} />
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}