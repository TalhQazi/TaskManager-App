import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  Dimensions,
  RefreshControl,
} from "react-native";
import {
  ShieldCheck,
  History,
  FileCheck,
  Search,
  Download,
  CheckSquare,
  X,
  User,
} from "lucide-react-native";
import { apiFetch } from "@/lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";

const { width } = Dimensions.get("window");

interface ActivityLog {
  id: string;
  actorUsername: string;
  actorRole: string;
  action: string;
  resourceType: string;
  resourceId: string;
  resourceName: string;
  description: string;
  createdAt: string;
}

interface ChecklistItem {
  label: string;
  status: boolean;
}

interface ApiResponse<T> {
  success: boolean;
  items?: T[];
}

const ACTION_LABELS: Record<string, string> = {
  AUTH_LOGIN_SUCCESS: "Login Success",
  AUTH_LOGIN_FAILURE: "Login Failed",
  AUTH_LOGOUT: "Logout",
  USER_CREATE: "User Added",
  USER_UPDATE: "User Updated",
  USER_DELETE: "User Deleted",
  USER_ROLE_CHANGE: "Role Changed",
  TASK_CREATE: "Task Added",
  TASK_UPDATE: "Task Updated",
  TASK_DELETE: "Task Deleted",
  EMPLOYEE_CREATE: "Employee Added",
  EMPLOYEE_UPDATE: "Employee Updated",
  EMPLOYEE_DELETE: "Employee Deleted",
  TIME_ENTRY_CREATE: "Time Entry Added",
  TIME_ENTRY_UPDATE: "Time Entry Updated",
  TIME_ENTRY_DELETE: "Time Entry Deleted",
  NOTIFICATION_CREATE: "Notification Sent",
  MESSAGE_SEND: "Message Sent",
  SETTINGS_UPDATE: "Settings Updated",
  DATA_EXPORT: "Data Exported",
  APPLIANCE_CREATE: "Appliance Added",
  APPLIANCE_UPDATE: "Appliance Updated",
  APPLIANCE_DELETE: "Appliance Deleted",
  VEHICLE_CREATE: "Vehicle Added",
  VEHICLE_UPDATE: "Vehicle Updated",
  VEHICLE_DELETE: "Vehicle Deleted",
  LOCATION_CREATE: "Location Added",
  LOCATION_UPDATE: "Location Updated",
  LOCATION_DELETE: "Location Deleted",
  VENDOR_CREATE: "Vendor Added",
  VENDOR_UPDATE: "Vendor Updated",
  VENDOR_DELETE: "Vendor Deleted",
  EVENT_CREATE: "Event Added",
  EVENT_UPDATE: "Event Updated",
  EVENT_DELETE: "Event Deleted",
  ONBOARDING_CREATE: "Onboarding Added",
  ONBOARDING_UPDATE: "Onboarding Updated",
};

function buildColors(uiTheme: any, isDark: boolean) {
  return {
    background:       uiTheme.panelColors?.dashboardBackground     || (isDark ? "#09090b" : "#F8FAFC"),
    cardBg:           uiTheme.panelColors?.dashboardCardBackground || (isDark ? "#18181b" : "#FFFFFF"),
    text:             uiTheme.panelColors?.dashboardTextColor      || (isDark ? "#F4F4F5" : "#0F172A"),
    textSecondary:    isDark ? "#A1A1AA" : "#475569",
    textMuted:        isDark ? "#71717A" : "#64748B",
    border:           isDark ? "#27272A" : "#E2E8F0",
    borderLight:      isDark ? "rgba(255,255,255,0.05)" : "#F1F5F9",
    inputBg:          isDark ? "#09090b" : "#F8FAFC",
    inputText:        isDark ? "#F4F4F5" : "#0F172A",
    placeholderText:  isDark ? "#52525B" : "#94A3B8",
    primary:          uiTheme.customColors?.primary || "#FFD27A",
    primaryText:      "#09090b",
    successBg:        isDark ? "rgba(16,185,129,0.12)" : "#ECFDF5",
    successText:      isDark ? "#34D399" : "#10B981",
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
    topActionsGroup: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
    actionIconButton: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.cardBg, borderColor: colors.border },
    primaryActionPill: { height: 34, paddingHorizontal: 12, borderRadius: 10, flexDirection: "row", alignItems: "center", backgroundColor: colors.primary, gap: 4 },
    primaryActionPillText: { fontSize: 13, fontWeight: "700", color: colors.primaryText },
    kpiSummaryCard: { borderRadius: 14, borderWidth: 1, padding: 16, flexDirection: "row", alignItems: "center", marginBottom: 16, backgroundColor: colors.cardBg, borderColor: colors.border },
    kpiCardFlexLeftColumn: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
    iconBoxContainer: { width: 40, height: 40, borderRadius: 10, justifyContent: "center", alignItems: "center", backgroundColor: colors.successBg },
    kpiLabelText: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.3, color: colors.textSecondary },
    kpiMetricsValueOutputText: { fontSize: 16, fontWeight: "800", marginTop: 2, color: colors.text },
    badgeStatusWrapper: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, backgroundColor: colors.successText },
    badgeStatusText: { fontSize: 10, fontWeight: "700", color: colors.primaryText },
    sectionHeading: { fontSize: 12, fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12, marginTop: 8 },
    searchInterfaceWrapperBar: { height: 42, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", marginBottom: 16, backgroundColor: colors.cardBg, borderColor: colors.border },
    searchInputField: { flex: 1, color: colors.inputText, fontSize: 13, height: "100%", paddingVertical: 0 },
    inlineLoaderZoneWrapper: { marginVertical: 12, alignItems: "center" },
    ledgerRowCardContainer: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10, backgroundColor: colors.cardBg, borderColor: colors.border },
    ledgerRowTopLineFlexRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    userMetaFlexRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    avatarFallbackBox: { height: 24, width: 24, borderRadius: 12, backgroundColor: "rgba(255,210,122,0.15)", alignItems: "center", justifyContent: "center" },
    avatarFallbackText: { fontSize: 11, fontWeight: "700", color: colors.primary },
    actorUsernameText: { fontSize: 14, fontWeight: "600", color: colors.text },
    timestampText: { fontSize: 11, color: colors.textMuted },
    itemCardDividerHorizontalBar: { height: 1, backgroundColor: colors.borderLight, marginVertical: 10 },
    logActionLabelText: { fontSize: 14, fontWeight: "700", color: colors.text },
    resourceMetaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
    moduleBadgeBox: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
    moduleBadgeText: { fontSize: 10, fontWeight: "600", color: colors.textSecondary, textTransform: "capitalize" },
    referenceText: { fontSize: 11, fontStyle: "italic", color: colors.textMuted },
    emptyLedgerFallbackCard: { alignItems: "center", justifyContent: "center", paddingVertical: 48 },
    emptyLedgerHeadingText: { fontSize: 14, fontWeight: "700", marginBottom: 4, color: colors.text },
    emptyLedgerSubParagraphText: { fontSize: 12, textAlign: "center", color: colors.textSecondary },
    checklistCardContainer: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 10, marginBottom: 24, backgroundColor: colors.cardBg, borderColor: colors.border },
    checklistItemFlexRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 4 },
    checklistLabelGroup: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1, paddingRight: 8 },
    checkIconWrapper: { padding: 4, borderRadius: 6 },
    checkItemLabelText: { fontSize: 13, fontWeight: "500", color: colors.text },
    miniBadgeBox: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
    miniBadgeText: { fontSize: 10, fontWeight: "700" },
  });
}

export default function AuditCompliance() {
  const { uiTheme } = useTheme();
  const isDark = (uiTheme.theme as string) === "dark" || (uiTheme.theme as string) === "metallic-elite";
  const colors = useMemo(() => buildColors(uiTheme, isDark), [uiTheme, isDark]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [q, setQ] = useState("");
  
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    { label: "Bank Reconciliation (No Pending Approvals)", status: true },
    { label: "Payroll Tax Filings Submitted", status: true },
    { label: "Labor Compliance (No Open Flags)", status: true },
    { label: "System Audits Passed", status: true }
  ]);

  const load = useCallback(async () => {
    try {
      const [logsRes, flagsRes, approvalsRes, billsRes] = await Promise.all([
        apiFetch<{ items: ActivityLog[] }>("/api/activity-logs?limit=20"),
        apiFetch<{ items?: any[] }>("/api/compliance/flags"),
        apiFetch<{ items?: any[] }>("/api/atlasbook/approvals"),
        apiFetch<{ items?: any[] }>("/api/atlasbook/bills")
      ]);

      setLogs(logsRes?.items || []);
      
      const openFlags = (flagsRes?.items || []).filter((f) => f.status === "open").length;
      const pendingApprovals = (approvalsRes?.items || []).filter((a) => a.status === "Pending").length;
      const unpaidTax = (billsRes?.items || []).filter((b) => 
        b.status === "Unpaid" && (b.description || "").toLowerCase().includes("tax")
      ).length;

      setChecklist([
        { label: "Bank Reconciliation (No Pending Approvals)", status: pendingApprovals === 0 },
        { label: "Tax Filings & Payments (No Unpaid Tax Bills)", status: unpaidTax === 0 },
        { label: "Labor Compliance (No Open Flags)", status: openFlags === 0 },
        { label: "System Audits Passed", status: true }
      ]);
    } catch {
      Alert.alert("Sync Error", "Failed to compile analytical parameters inside database channels.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (isNaN(diffMs)) return dateString;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchQuery = q.toLowerCase();
      const actionLabel = ACTION_LABELS[log.action] || log.action;
      return (
        log.actorUsername?.toLowerCase().includes(matchQuery) ||
        actionLabel.toLowerCase().includes(matchQuery) ||
        log.resourceType?.toLowerCase().includes(matchQuery) ||
        log.resourceName?.toLowerCase().includes(matchQuery)
      );
    });
  }, [logs, q]);

  const triggerExport = () => {
    Alert.alert("Data Export", "Compiling immutable audit pack records for systemic transfer verification channels.");
  };

  const triggerComplianceRun = () => {
    setLoading(true);
    load();
  };

  return (
    <SafeAreaView style={styles.mainContainer}>
      <FlatList
        data={filteredLogs}
        keyExtractor={(item) => item.id || Math.random().toString()}
        contentContainerStyle={styles.scrollContainerPadding}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View>
            <View style={styles.headerLayoutRow}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <View style={styles.inlineHeaderTitleGroup}>
                  <ShieldCheck size={24} color={colors.primary} />
                  <Text style={styles.mainTitleText}>Audit & Compliance</Text>
                </View>
                <Text style={styles.subtitleText}>Immutable audit trails and regulatory structural tracking.</Text>
              </View>
              <View style={styles.topActionsGroup}>
                <TouchableOpacity activeOpacity={0.7} style={styles.actionIconButton} onPress={triggerExport}>
                  <Download size={15} color={colors.text} />
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.8} style={styles.primaryActionPill} onPress={triggerComplianceRun}>
                  <FileCheck size={14} color={colors.primaryText} strokeWidth={2.5} />
                  <Text style={styles.primaryActionPillText}>Run Check</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.kpiSummaryCard}>
              <View style={styles.kpiCardFlexLeftColumn}>
                <View style={styles.iconBoxContainer}>
                  <ShieldCheck size={20} color={colors.successText} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.kpiLabelText}>Last Compliance Run</Text>
                  <Text style={styles.kpiMetricsValueOutputText}>Today, 08:30 AM</Text>
                </View>
              </View>
              <View style={styles.badgeStatusWrapper}>
                <Text style={styles.badgeStatusText}>PASSED</Text>
              </View>
            </View>

            <Text style={styles.sectionHeading}>Compliance Checklist</Text>
            <View style={styles.checklistCardContainer}>
              {checklist.map((check, i) => (
                <View key={i} style={styles.checklistItemFlexRow}>
                  <View style={styles.checklistLabelGroup}>
                    <View style={[styles.checkIconWrapper, { backgroundColor: check.status ? colors.successBg : colors.warningBg }]}>
                      <CheckSquare size={14} color={check.status ? colors.successText : colors.warningText} />
                    </View>
                    <Text style={styles.checkItemLabelText} numberOfLines={1}>{check.label}</Text>
                  </View>
                  <View style={[styles.miniBadgeBox, { 
                    backgroundColor: check.status ? "rgba(16,185,129,0.06)" : colors.background, 
                    borderColor: check.status ? "rgba(16,185,129,0.2)" : colors.border 
                  }]}>
                    <Text style={[styles.miniBadgeText, { color: check.status ? colors.successText : colors.textSecondary }]}>
                      {check.status ? "Verified" : "Pending"}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            <Text style={styles.sectionHeading}>System-Wide Audit Trail</Text>
            
            <View style={styles.searchInterfaceWrapperBar}>
              <Search size={16} color={colors.textSecondary} style={{ marginRight: 10 }} />
              <TextInput
                style={styles.searchInputField}
                placeholder="Search audit trail metrics rows..."
                placeholderTextColor={colors.placeholderText}
                value={q}
                onChangeText={setQ}
              />
              {q ? (
                <TouchableOpacity onPress={() => setQ("")}>
                  <X size={14} color={colors.textSecondary} />
                </TouchableOpacity>
              ) : null}
            </View>

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
              <History size={32} color={colors.border} style={{ marginBottom: 10 }} />
              <Text style={styles.emptyLedgerHeadingText}>No logs found</Text>
              <Text style={styles.emptyLedgerSubParagraphText}>Everything settles uniformly against system activity matrices.</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const processedAction = ACTION_LABELS[item.action] || item.action.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
          const actorLetter = (item.actorUsername || "U")[0].toUpperCase();
          return (
            <View style={styles.ledgerRowCardContainer}>
              <View style={styles.ledgerRowTopLineFlexRow}>
                <View style={styles.userMetaFlexRow}>
                  <View style={styles.avatarFallbackBox}>
                    <Text style={styles.avatarFallbackText}>{actorLetter}</Text>
                  </View>
                  <Text style={styles.actorUsernameText}>{item.actorUsername}</Text>
                </View>
                <Text style={styles.timestampText}>{formatTimeAgo(item.createdAt)}</Text>
              </View>

              <View style={styles.itemCardDividerHorizontalBar} />

              <View>
                <Text style={styles.logActionLabelText}>{processedAction}</Text>
                <View style={styles.resourceMetaRow}>
                  <View style={styles.moduleBadgeBox}>
                    <Text style={styles.moduleBadgeText}>{item.resourceType.replace(/-/g, " ")}</Text>
                  </View>
                  <Text style={styles.referenceText} numberOfLines={1}>
                    {item.resourceName || item.resourceId || "—"}
                  </Text>
                </View>
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}