import React, { useEffect, useState, useMemo } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
  Eye,
  FileText,
  AlertTriangle,
  Send,
  X,
} from "lucide-react-native";
import { apiFetch } from "@/lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";

interface NewHireReport {
  id: string;
  employeeId: string;
  onboardingId: string;
  employeeName: string;
  employeeAddress: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  hireDate: string;
  employerName: string;
  employerFEIN: string;
  status: "pending" | "submitted" | "failed" | "overridden";
  attemptsCount: number;
  confirmationId: string;
  countdownExpiry: string;
  lastAttemptAt?: string;
  errorMessage?: string;
  overrideReason?: string;
  overrideBy?: {
    name: string;
    email: string;
  };
  overrideAt?: string;
  createdAt: string;
}

interface SubmissionLog {
  id: string;
  attemptNumber: number;
  status: "submitted" | "failed";
  method: "sftp" | "webform";
  payloadPreview: string;
  errorMessage?: string;
  confirmationId?: string;
  createdAt: string;
}

interface Stats {
  total: number;
  pending: number;
  submitted: number;
  failed: number;
  overridden: number;
  complianceRate: number;
}

const statusLabels: Record<string, string> = {
  all: "All Filing Status",
  pending: "Pending Filing",
  submitted: "Submitted Compliant",
  failed: "Failed Filings",
  overridden: "Overridden Manual",
};

const { width: screenWidth } = Dimensions.get("window");

function CountdownCell({ expiry, status, styles }: { expiry: string; status: string; styles: any }) {
  const [timeLeft, setTimeLeft] = useState("");
  const [isOverdue, setIsOverdue] = useState(false);

  useEffect(() => {
    if (status === "submitted" || status === "overridden") {
      setTimeLeft("Resolved");
      setIsOverdue(false);
      return;
    }

    const updateTimer = () => {
      const difference = new Date(expiry).getTime() - Date.now();
      if (difference <= 0) {
        setTimeLeft("OVERDUE");
        setIsOverdue(true);
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      const dStr = String(days).padStart(2, "0");
      const hStr = String(hours).padStart(2, "0");
      const mStr = String(minutes).padStart(2, "0");
      const sStr = String(seconds).padStart(2, "0");

      setTimeLeft(`${dStr}d:${hStr}h:${mStr}m:${sStr}s`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [expiry, status]);

  if (status === "submitted" || status === "overridden") {
    return <Text style={styles.countdownCompliantText}>Compliant</Text>;
  }

  return (
    <Text style={[styles.countdownTimerBaseText, isOverdue ? styles.countdownOverdueText : styles.countdownPendingText]}>
      {timeLeft}
    </Text>
  );
}

export default function NewHireReporting() {
  const { uiTheme } = useTheme();
  const isDark = (uiTheme.theme as string) === "dark" || (uiTheme.theme as string) === "metallic-elite";

  const colors = useMemo(() => ({
    background: uiTheme.panelColors?.dashboardBackground || (isDark ? "#0f172a" : "#f8fafc"),
    cardBg: uiTheme.panelColors?.dashboardCardBackground || (isDark ? "#1e293b" : "#ffffff"),
    cardBgGhost: isDark ? "rgba(30, 41, 59, 0.5)" : "#ffffff",
    text: uiTheme.panelColors?.dashboardTextColor || (isDark ? "#f8fafc" : "#0f172a"),
    mutedText: isDark ? "#94a3b8" : "#64748b",
    border: isDark ? "#334155" : "#e2e8f0",
    inputBg: isDark ? "#0f172a" : "#ffffff",
    inputBorder: isDark ? "#334155" : "#d1d5db",
    inputText: isDark ? "#f8fafc" : "#0f172a",
    primary: uiTheme.customColors?.primary || "#4F46E5",
    primaryHover: "#6366F1",
    successText: isDark ? "#34D399" : "#10B981",
    successBg: isDark ? "rgba(16, 185, 129, 0.1)" : "#d1fae5",
    warningText: isDark ? "#F59E0B" : "#D97706",
    warningBg: isDark ? "rgba(245, 158, 11, 0.1)" : "#fef3c7",
    dangerText: isDark ? "#FCA5A5" : "#EF4444",
    dangerBg: isDark ? "rgba(239, 68, 68, 0.1)" : "#fee2e2",
    infoText: isDark ? "#818CF8" : "#4F46E5",
    infoBg: isDark ? "rgba(99, 102, 241, 0.15)" : "#e0e7ff",
    backdrop: "rgba(0,0,0,0.5)",
    sheetBg: isDark ? "#0F172A" : "#FFFFFF",
    white: "#FFFFFF",
    black: "#000000"
  }), [uiTheme, isDark]);

  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  
  const [reports, setReports] = useState<NewHireReport[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, submitted: 0, failed: 0, overridden: 0, complianceRate: 100 });
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [selectedReport, setSelectedReport] = useState<NewHireReport | null>(null);
  const [logs, setLogs] = useState<SubmissionLog[]>([]);
  const [logsOpen, setLogsOpen] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");

  const getStatusTheme = (status: string) => {
    switch (status) {
      case "submitted": return { bg: colors.successBg, text: colors.successText, border: colors.successBg };
      case "failed": return { bg: colors.dangerBg, text: colors.dangerText, border: colors.dangerBg };
      case "overridden": return { bg: colors.infoBg, text: colors.infoText, border: colors.infoBg };
      case "pending":
      default: return { bg: colors.warningBg, text: colors.warningText, border: colors.warningBg };
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const reportsEndpoint = statusFilter === "all" ? "/api/new-hire-reports/all" : `/api/new-hire-reports/all?status=${statusFilter}`;
      const [reportsData, statsData] = await Promise.all([
        apiFetch<{ items: NewHireReport[] }>(reportsEndpoint),
        apiFetch<{ item: Stats }>("/api/new-hire-reports/stats"),
      ]);
      setReports(reportsData.items || []);
      if (statsData.item) {
        setStats(statsData.item);
      }
    } catch (e) {
      Alert.alert("Sync Failure", e instanceof Error ? e.message : "Failed to load state registry queue context payloads.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [statusFilter]);

  const handleResubmit = async (id: string, name: string) => {
    try {
      setActionLoading(id);
      const res = await apiFetch<{ success: boolean; message: string }>(`/api/new-hire-reports/${id}/resubmit`, {
        method: "POST",
      });
      Alert.alert("Submission Successful", res.message);
      void loadData();
    } catch (e) {
      Alert.alert("Filing Attempt Failed", e instanceof Error ? e.message : "Validation timeout.");
      void loadData();
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenLogs = async (report: NewHireReport) => {
    setSelectedReport(report);
    setLogsOpen(true);
    try {
      setLogsLoading(true);
      const res = await apiFetch<{ items: SubmissionLog[] }>(`/api/new-hire-reports/${report.id}/logs`);
      setLogs(res.items || []);
    } catch (e) {
      Alert.alert("Audit Sync Error", e instanceof Error ? e.message : "Could not fetch automated state filing tracks.");
    } finally {
      setLogsLoading(false);
    }
  };

  const handleOpenOverride = (report: NewHireReport) => {
    setSelectedReport(report);
    setOverrideReason("");
    setOverrideOpen(true);
  };

  const handleConfirmOverride = async () => {
    if (!selectedReport) return;
    if (overrideReason.trim().length < 5) {
      Alert.alert("Validation Error", "Please provide a detailed override exception reason (minimum 5 characters).");
      return;
    }

    try {
      setActionLoading(selectedReport.id);
      await apiFetch(`/api/new-hire-reports/${selectedReport.id}/override`, {
        method: "POST",
        body: JSON.stringify({ reason: overrideReason }),
      });
      Alert.alert("Override Enforced", `Report for ${selectedReport.employeeName} updated to manual completion.`);
      setOverrideOpen(false);
      void loadData();
    } catch (e) {
      Alert.alert("Override Assignment Broken", e instanceof Error ? e.message : "Mutation processing failed on state tables.");
    } finally {
      setActionLoading(null);
    }
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((s) => s[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

  return (
    <SafeAreaView style={styles.viewportBaseContainer}>
      <ScrollView contentContainerStyle={styles.viewportRootScrollContainer} showsVerticalScrollIndicator={false}>
        
        <View style={styles.dashboardHeaderFlexBlock}>
          <View style={styles.dashboardHeaderTitleStack}>
            <Text style={styles.dashboardTitleMainTextText}>Maine New Hire Reporting</Text>
            <Text style={styles.dashboardTitleSubtextText}>Automated filing system and compliance ledger.</Text>
          </View>
          <TouchableOpacity style={styles.headerControlActionButtonNode} onPress={loadData} disabled={loading}>
            <RefreshCw size={14} color={colors.text} style={loading ? styles.iconRotateAnimation : undefined} />
            <Text style={styles.headerControlActionButtonNodeText}>Refresh Queue</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.metricsSummaryPanelContainerGrid}>
          <View style={styles.metricsSummaryCardItemWrapperNode}>
            <View style={[styles.metricsSummaryCardIconCircleFrame, { backgroundColor: colors.infoBg }]}>
              <ClipboardList size={18} color={colors.infoText} />
            </View>
            <View>
              <Text style={styles.metricsSummaryLabelMetaText}>Total Hires</Text>
              <Text style={styles.metricsSummaryQuantifierValueText}>{stats.total}</Text>
            </View>
          </View>

          <View style={styles.metricsSummaryCardItemWrapperNode}>
            <View style={[styles.metricsSummaryCardIconCircleFrame, { backgroundColor: colors.warningBg }]}>
              <Clock size={18} color={colors.warningText} />
            </View>
            <View>
              <Text style={styles.metricsSummaryLabelMetaText}>Pending</Text>
              <Text style={styles.metricsSummaryQuantifierValueText}>{stats.pending}</Text>
            </View>
          </View>

          <View style={styles.metricsSummaryCardItemWrapperNode}>
            <View style={[styles.metricsSummaryCardIconCircleFrame, { backgroundColor: colors.successBg }]}>
              <CheckCircle2 size={18} color={colors.successText} />
            </View>
            <View>
              <Text style={styles.metricsSummaryLabelMetaText}>Submitted</Text>
              <Text style={styles.metricsSummaryQuantifierValueText}>{stats.submitted}</Text>
            </View>
          </View>

          <View style={styles.metricsSummaryCardItemWrapperNode}>
            <View style={[styles.metricsSummaryCardIconCircleFrame, { backgroundColor: colors.dangerBg }]}>
              <AlertCircle size={18} color={colors.dangerText} />
            </View>
            <View>
              <Text style={styles.metricsSummaryLabelMetaText}>Failed</Text>
              <Text style={styles.metricsSummaryQuantifierValueText}>{stats.failed}</Text>
            </View>
          </View>

          <View style={[styles.metricsSummaryCardItemWrapperNode, { width: "100%" }]}>
            <View style={[styles.metricsSummaryCardIconCircleFrame, { backgroundColor: colors.infoBg }]}>
              <ShieldCheck size={18} color={colors.infoText} />
            </View>
            <View>
              <Text style={styles.metricsSummaryLabelMetaText}>Compliance Rate</Text>
              <Text style={styles.metricsSummaryQuantifierValueText}>{stats.complianceRate}%</Text>
            </View>
          </View>
        </View>

        <View style={styles.filterSectionContextTray}>
          <Text style={styles.filterSectionTitleHeadlineTextText}>Queue Filter Registry</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipsHorizontalLayoutListContainer}>
            {(["all", "pending", "submitted", "failed", "overridden"] as const).map((filterKey) => (
              <TouchableOpacity
                key={filterKey}
                style={[styles.filterChipSelectableNodeItem, statusFilter === filterKey ? styles.filterChipSelectableNodeItemActive : null]}
                onPress={() => setStatusFilter(filterKey)}
              >
                <Text style={[styles.filterChipSelectableTextString, statusFilter === filterKey ? styles.filterChipSelectableTextStringActive : null]}>
                  {statusLabels[filterKey]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.mainContentRegistryPanelCardDeckContainer}>
          {loading ? (
            <View style={styles.layoutActivityStateIndicatorBoxContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.layoutActivityStateIndicatorSubtextString}>Hydrating reporting queue indices...</Text>
            </View>
          ) : reports.length === 0 ? (
            <View style={styles.emptyIndexStateFeedbackBoxContainer}>
              <ClipboardList size={36} color={colors.mutedText} style={styles.centerAlignItemElementAlignmentSelf} />
              <Text style={styles.emptyIndexStateFeedbackBoxTitleText}>Filer Registry Is Fully Clean</Text>
              <Text style={styles.emptyIndexStateFeedbackBoxSubtitleText}>Newly approved personnel pipelines automatically index here.</Text>
            </View>
          ) : (
            <View style={styles.listSeparatorDivideBorderBorderLineStack}>
              {reports.map((report) => {
                const badgeTheme = getStatusTheme(report.status);
                return (
                  <View key={report.id} style={styles.reportingProfileEntryCardBoxRowNode}>
                    <View style={styles.profileMetaHeaderRowBlockInline}>
                      <View style={styles.avatarLargeFrameCircle}>
                        <Text style={styles.avatarFallbackTextStringLabel}>{getInitials(report.employeeName)}</Text>
                      </View>
                      <View style={styles.flexExpansionColumnContainerBlock}>
                        <View style={styles.inlineHeaderRowMetaTextWrapper}>
                          <Text style={styles.employeeCardNameTextHeadline} numberOfLines={1}>{report.employeeName}</Text>
                          <View style={[styles.statusBadgeCapsuleFrame, { backgroundColor: badgeTheme.bg, borderColor: badgeTheme.border }]}>
                            <Text style={[styles.statusBadgeCapsuleFrameText, { color: badgeTheme.text }]}>
                              {report.status.toUpperCase()}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.metaDataSecondaryDescriptionParagraphStringText}>
                          Hire Date: <Text style={styles.whiteEmphasisLabelStringText}>{new Date(report.hireDate).toLocaleDateString()}</Text>
                        </Text>
                        <Text style={styles.metaDataSecondaryDescriptionParagraphStringText} numberOfLines={1}>
                          Employer: <Text style={styles.whiteEmphasisLabelStringText}>{report.employerName}</Text> ({report.employerFEIN})
                        </Text>
                      </View>
                    </View>

                    <View style={styles.parameterDashboardMetricsSubRowSegment}>
                      <View style={styles.parameterDashboardMetricsMetricUnitNodeItem}>
                        <Text style={styles.parameterDashboardMetricsMetricUnitLabelStringText}>Filing Window</Text>
                        <CountdownCell expiry={report.countdownExpiry} status={report.status} styles={styles} />
                      </View>

                      <View style={styles.parameterDashboardMetricsMetricUnitNodeItem}>
                        <Text style={styles.parameterDashboardMetricsMetricUnitLabelStringText}>Attempts Log</Text>
                        <Text style={styles.parameterDashboardMetricsMetricValueStringText}>{report.attemptsCount} / 3 Attempts</Text>
                      </View>

                      {report.confirmationId ? (
                        <View style={[styles.parameterDashboardMetricsMetricUnitNodeItem, { width: "100%" }]}>
                          <Text style={styles.parameterDashboardMetricsMetricUnitLabelStringText}>Receipt Confirmation Identity Code</Text>
                          <Text style={styles.parameterDashboardMetricsMetricValueStringTextEmphasisCodeText}>{report.confirmationId}</Text>
                        </View>
                      ) : null}
                    </View>

                    <View style={styles.actionShortcutControlsInlineRowContainer}>
                      <TouchableOpacity style={styles.actionShortcutIconButtonFrameworkNodeItem} onPress={() => void handleOpenLogs(report)}>
                        <Eye size={12} color={colors.text} />
                        <Text style={styles.actionShortcutIconButtonFrameworkNodeItemText}>LOGS</Text>
                      </TouchableOpacity>

                      {report.status !== "submitted" && report.status !== "overridden" ? (
                        <>
                          <TouchableOpacity style={[styles.actionShortcutIconButtonFrameworkNodeItem, styles.borderActionYellowColor]} onPress={() => handleOpenOverride(report)}>
                            <AlertTriangle size={12} color={colors.warningText} />
                            <Text style={[styles.actionShortcutIconButtonFrameworkNodeItemText, styles.textYellowColor]}>OVERRIDE</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.actionShortcutIconButtonFrameworkNodeItem, styles.bgActionPrimaryColor, actionLoading === report.id ? styles.disabledButtonStateFadeOpacity : null]}
                            onPress={() => void handleResubmit(report.id, report.employeeName)}
                            disabled={actionLoading === report.id}
                          >
                            {actionLoading === report.id ? (
                              <ActivityIndicator size="small" color={colors.white} />
                            ) : (
                              <>
                                <Send size={12} color={colors.white} />
                                <Text style={[styles.actionShortcutIconButtonFrameworkNodeItemText, { color: colors.white }]}>RESUBMIT</Text>
                              </>
                            )}
                          </TouchableOpacity>
                        </>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal visible={logsOpen} animationType="slide" transparent>
        <View style={styles.modalViewportBackdropDimOverlayWrapperMask}>
          <View style={[styles.modalContentCardSheetContainerBody, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalContentHeaderBlockRowInline}>
              <View style={styles.modalContentHeaderBlockRowInlineTitleWithIconLayout}>
                <FileText size={18} color={colors.infoText} />
                <Text style={styles.modalContentHeaderBlockRowInlineTitleHeadlineText}>Submission Attempt Logs</Text>
              </View>
              <TouchableOpacity style={styles.modalContentHeaderCloseIconButtonTouchSurface} onPress={() => setLogsOpen(false)}>
                <X size={20} color={colors.mutedText} />
              </TouchableOpacity>
            </View>

            {selectedReport ? (
              <ScrollView style={styles.modalInternalScrollableBodyViewport} showsVerticalScrollIndicator={false}>
                <View style={styles.modalInternalInformationalContextCardBannerFrame}>
                  <Text style={styles.modalInternalInformationalContextCardBannerFrameEmployeeTitleName}>{selectedReport.employeeName}</Text>
                  <Text style={styles.modalInternalInformationalContextCardBannerFrameSubtitleMetaStringDescription}>Maine state compliance workflow log history tracking index.</Text>
                  
                  {selectedReport.status === "failed" && selectedReport.errorMessage ? (
                    <View style={styles.modalInternalInformationalContextCardBannerFrameFatalErrorNodeBox}>
                      <Text style={styles.modalInternalInformationalContextCardBannerFrameFatalErrorNodeBoxLabelTextString}>FATAL ERROR LOG EXCEPTION TEXT:</Text>
                      <Text style={styles.modalInternalInformationalContextCardBannerFrameFatalErrorNodeBoxValueLiteralString}>{selectedReport.errorMessage}</Text>
                    </View>
                  ) : null}
                </View>

                {logsLoading ? (
                  <View style={styles.layoutActivityStateIndicatorBoxContainer}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.layoutActivityStateIndicatorSubtextString}>Hydrating audit history maps...</Text>
                  </View>
                ) : logs.length === 0 ? (
                  <Text style={styles.fallbackEmptyStateItalicizedTextCenter}>No historical transaction records logged against endpoint indices.</Text>
                ) : (
                  <View style={styles.modalInnerAuditCardLogListingVerticalContainerBlockStack}>
                    {logs.map((log) => (
                      <View key={log.id} style={styles.auditRecordLogRowSegmentCardBoxFrame}>
                        <View style={styles.inlineHeaderRowMetaTextWrapper}>
                          <View style={styles.modalContentHeaderBlockRowInlineTitleWithIconLayout}>
                            <Text style={styles.auditRecordLogRowSegmentCardBoxAttemptNumberTagBadge}>Attempt #{log.attemptNumber}</Text>
                            <Text style={styles.auditRecordLogRowSegmentCardBoxMethodLabelMetaTextString}>Method: {log.method.toUpperCase()}</Text>
                          </View>
                          <View style={[styles.statusBadgeCapsuleFrame, log.status === "submitted" ? styles.bgSuccessBadgeTheme : styles.bgDangerBadgeTheme]}>
                            <Text style={[styles.statusBadgeCapsuleFrameText, log.status === "submitted" ? styles.textSuccessColor : styles.textDangerColor]}>
                              {log.status === "submitted" ? "SUCCESS" : "FAILED"}
                            </Text>
                          </View>
                        </View>
                        
                        <Text style={styles.auditRecordLogRowSegmentCardBoxPayloadPreviewStringText}>{log.payloadPreview}</Text>
                        
                        {log.errorMessage ? (
                          <View style={styles.auditRecordLogRowSegmentCardBoxErrorDetailEmbeddedTerminalContainer}>
                            <Text style={styles.auditRecordLogRowSegmentCardBoxErrorDetailEmbeddedTerminalContainerCodeTextString}>{log.errorMessage}</Text>
                          </View>
                        ) : (
                          <Text style={styles.auditRecordLogRowSegmentCardBoxSuccessConfirmationMessageLiteralStringText}>✓ Connection validated. Node verification reference key: {log.confirmationId}</Text>
                        )}
                        <Text style={styles.auditRecordLogRowSegmentCardBoxTimestampClockFooterMetaStringText}>Timestamp: {new Date(log.createdAt).toLocaleString()}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal visible={overrideOpen} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalViewportBackdropDimOverlayWrapperMask}>
          <View style={[styles.modalContentCardSheetContainerBody, { height: "auto", paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalContentHeaderBlockRowInline}>
              <View style={styles.modalContentHeaderBlockRowInlineTitleWithIconLayout}>
                <AlertTriangle size={18} color={colors.warningText} />
                <Text style={styles.modalContentHeaderBlockRowInlineTitleHeadlineText}>Manual Compliance Override</Text>
              </View>
              <TouchableOpacity style={styles.modalContentHeaderCloseIconButtonTouchSurface} onPress={() => setOverrideOpen(false)}>
                <X size={20} color={colors.mutedText} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalInternalPaddingContainerWrapperFrameBlock}>
              <Text style={styles.modalInternalInformationalContextCardBannerFrameSubtitleMetaStringDescription}>
                Execute manual bypass overrides only if this registration file has been safely processing-completed manually outside our endpoint hooks infrastructure context.
              </Text>

              <View style={styles.inputFieldFormGroupLabelInputStackFrame}>
                <Text style={styles.inputFieldFormGroupLabelStringTextText}>DETAILED OVERRIDE EXCEPTION EXPLANATION REASON *</Text>
                <TextInput
                  style={styles.inputFieldMultilineNativeInputBoxAreaFrameTextElement}
                  multiline
                  numberOfLines={4}
                  value={overrideReason}
                  onChangeText={setOverrideReason}
                  placeholder="Enter detailed description note context logging exception context maps..."
                  placeholderTextColor={colors.mutedText}
                />
              </View>

              <View style={styles.modalActionsConfirmationRowInlineLayoutFlexContainer}>
                <TouchableOpacity style={styles.modalActionsConfirmationRowInlineLayoutFlexContainerCancelButton} onPress={() => setOverrideOpen(false)}>
                  <Text style={styles.modalActionsConfirmationRowInlineLayoutFlexContainerCancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalActionsConfirmationRowInlineLayoutFlexContainerConfirmButton, overrideReason.trim().length < 5 ? styles.disabledButtonStateFadeOpacity : null]}
                  onPress={handleConfirmOverride}
                  disabled={overrideReason.trim().length < 5}
                >
                  <Text style={styles.modalActionsConfirmationRowInlineLayoutFlexContainerConfirmButtonText}>Confirm Override</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    viewportBaseContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    viewportRootScrollContainer: {
      padding: 16,
      paddingBottom: 40,
    },
    dashboardHeaderFlexBlock: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 20,
      gap: 12,
    },
    dashboardHeaderTitleStack: {
      flex: 1,
      gap: 4,
    },
    dashboardTitleMainTextText: {
      fontSize: 22,
      fontWeight: "900",
      color: colors.text,
      letterSpacing: -0.5,
    },
    dashboardTitleSubtextText: {
      fontSize: 13,
      color: colors.mutedText,
      lineHeight: 18,
    },
    headerControlActionButtonNode: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      gap: 6,
    },
    headerControlActionButtonNodeText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: "700",
    },
    iconRotateAnimation: {
      transform: [{ rotate: "45deg" }],
    },
    metricsSummaryPanelContainerGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      gap: 10,
      marginBottom: 24,
    },
    metricsSummaryCardItemWrapperNode: {
      backgroundColor: colors.cardBgGhost,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      width: (screenWidth - 42) / 2,
      padding: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    metricsSummaryCardIconCircleFrame: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    metricsSummaryLabelMetaText: {
      fontSize: 11,
      color: colors.mutedText,
      fontWeight: "600",
    },
    metricsSummaryQuantifierValueText: {
      fontSize: 16,
      fontWeight: "900",
      color: colors.text,
      marginTop: 2,
    },
    filterSectionContextTray: {
      marginBottom: 20,
      gap: 8,
    },
    filterSectionTitleHeadlineTextText: {
      fontSize: 12,
      fontWeight: "900",
      color: colors.mutedText,
      textTransform: "uppercase",
      letterSpacing: 1,
    },
    filterChipsHorizontalLayoutListContainer: {
      gap: 8,
      paddingVertical: 2,
    },
    filterChipSelectableNodeItem: {
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
    },
    filterChipSelectableNodeItemActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primaryHover,
    },
    filterChipSelectableTextString: {
      color: colors.mutedText,
      fontSize: 12,
      fontWeight: "700",
    },
    filterChipSelectableTextStringActive: {
      color: colors.white,
    },
    mainContentRegistryPanelCardDeckContainer: {
      backgroundColor: colors.cardBgGhost,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      overflow: "hidden",
    },
    layoutActivityStateIndicatorBoxContainer: {
      padding: 40,
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
    },
    layoutActivityStateIndicatorSubtextString: {
      fontSize: 11,
      color: colors.mutedText,
      fontWeight: "800",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    emptyIndexStateFeedbackBoxContainer: {
      padding: 48,
      gap: 8,
    },
    centerAlignItemElementAlignmentSelf: {
      alignSelf: "center",
    },
    emptyIndexStateFeedbackBoxTitleText: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.text,
      textAlign: "center",
    },
    emptyIndexStateFeedbackBoxSubtitleText: {
      fontSize: 12,
      color: colors.mutedText,
      textAlign: "center",
      lineHeight: 16,
    },
    listSeparatorDivideBorderBorderLineStack: {
      flexDirection: "column",
    },
    reportingProfileEntryCardBoxRowNode: {
      padding: 16,
      borderBottomWidth: 1,
      borderColor: colors.border,
      gap: 14,
    },
    profileMetaHeaderRowBlockInline: {
      flexDirection: "row",
      gap: 12,
      alignItems: "flex-start",
    },
    avatarLargeFrameCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.infoBg,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarFallbackTextStringLabel: {
      color: colors.infoText,
      fontSize: 13,
      fontWeight: "900",
    },
    flexExpansionColumnContainerBlock: {
      flex: 1,
      gap: 3,
    },
    inlineHeaderRowMetaTextWrapper: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 8,
    },
    employeeCardNameTextHeadline: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.text,
      flex: 1,
    },
    statusBadgeCapsuleFrame: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 12,
      borderWidth: 1,
    },
    statusBadgeCapsuleFrameText: {
      fontSize: 9,
      fontWeight: "900",
      letterSpacing: 0.5,
    },
    metaDataSecondaryDescriptionParagraphStringText: {
      fontSize: 12,
      color: colors.mutedText,
    },
    whiteEmphasisLabelStringText: {
      color: colors.text,
      fontWeight: "600",
    },
    parameterDashboardMetricsSubRowSegment: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 16,
      backgroundColor: colors.background,
      padding: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    parameterDashboardMetricsMetricUnitNodeItem: {
      gap: 3,
    },
    parameterDashboardMetricsMetricUnitLabelStringText: {
      fontSize: 10,
      fontWeight: "800",
      color: colors.mutedText,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    parameterDashboardMetricsMetricValueStringText: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.text,
    },
    parameterDashboardMetricsMetricValueStringTextEmphasisCodeText: {
      fontSize: 12,
      fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
      fontWeight: "700",
      color: colors.infoText,
    },
    countdownTimerBaseText: {
      fontSize: 13,
    },
    countdownCompliantText: {
      color: colors.successText,
      fontWeight: "700",
    },
    countdownOverdueText: {
      color: colors.dangerText,
      fontWeight: "900",
    },
    countdownPendingText: {
      color: colors.warningText,
      fontWeight: "700",
      fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    },
    actionShortcutControlsInlineRowContainer: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 8,
      marginTop: 2,
    },
    actionShortcutIconButtonFrameworkNodeItem: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 6,
      gap: 6,
    },
    actionShortcutIconButtonFrameworkNodeItemText: {
      color: colors.text,
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 0.5,
    },
    borderActionYellowColor: {
      borderColor: colors.warningBg,
    },
    textYellowColor: {
      color: colors.warningText,
    },
    bgActionPrimaryColor: {
      backgroundColor: colors.primary,
      borderColor: colors.primaryHover,
    },
    disabledButtonStateFadeOpacity: {
      opacity: 0.4,
    },
    modalViewportBackdropDimOverlayWrapperMask: {
      flex: 1,
      backgroundColor: colors.backdrop,
      justifyContent: "flex-end",
    },
    modalContentCardSheetContainerBody: {
      backgroundColor: colors.sheetBg,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      maxHeight: "85%",
    },
    modalContentHeaderBlockRowInline: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 16,
      borderBottomWidth: 1,
      borderColor: colors.border,
    },
    modalContentHeaderBlockRowInlineTitleWithIconLayout: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    modalContentHeaderBlockRowInlineTitleHeadlineText: {
      fontSize: 16,
      fontWeight: "900",
      color: colors.text,
    },
    modalContentHeaderCloseIconButtonTouchSurface: {
      padding: 4,
    },
    modalInternalScrollableBodyViewport: {
      padding: 16,
    },
    modalInternalInformationalContextCardThemeFrame: {
      backgroundColor: colors.cardBg,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 16,
    },
    modalInternalInformationalContextCardBannerFrame: {
      backgroundColor: colors.cardBg,
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 16,
    },
    modalInternalInformationalContextCardBannerFrameEmployeeTitleName: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.text,
    },
    modalInternalInformationalContextCardBannerFrameSubtitleMetaStringDescription: {
      fontSize: 12,
      color: colors.mutedText,
      marginTop: 2,
      lineHeight: 16,
    },
    modalInternalInformationalContextCardBannerFrameFatalErrorNodeBox: {
      marginTop: 10,
      backgroundColor: colors.dangerBg,
      borderWidth: 1,
      borderColor: colors.dangerBorder,
      padding: 10,
      borderRadius: 8,
      gap: 2,
    },
    modalInternalInformationalContextCardBannerFrameFatalErrorNodeBoxLabelTextString: {
      fontSize: 9,
      fontWeight: "900",
      color: colors.dangerText,
      letterSpacing: 0.5,
    },
    modalInternalInformationalContextCardBannerFrameFatalErrorNodeBoxValueLiteralString: {
      fontSize: 12,
      color: colors.dangerText,
      lineHeight: 16,
    },
    fallbackEmptyStateItalicizedTextCenter: {
      textAlign: "center",
      color: colors.mutedText,
      fontSize: 13,
      fontStyle: "italic",
      paddingVertical: 20,
    },
    modalInnerAuditCardLogListingVerticalContainerBlockStack: {
      gap: 12,
      paddingBottom: 20,
    },
    auditRecordLogRowSegmentCardBoxFrame: {
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      borderRadius: 12,
      gap: 8,
    },
    auditRecordLogRowSegmentCardBoxAttemptNumberTagBadge: {
      fontSize: 11,
      fontWeight: "900",
      color: colors.text,
      backgroundColor: colors.border,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    auditRecordLogRowSegmentCardBoxMethodLabelMetaTextString: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.mutedText,
    },
    bgSuccessBadgeTheme: { backgroundColor: colors.successBg, borderColor: "transparent" },
    bgDangerBadgeTheme: { backgroundColor: colors.dangerBg, borderColor: "transparent" },
    textSuccessColor: { color: colors.successText },
    textDangerColor: { color: colors.dangerText },
    auditRecordLogRowSegmentCardBoxPayloadPreviewStringText: {
      fontSize: 12,
      color: colors.text,
      lineHeight: 16,
    },
    auditRecordLogRowSegmentCardBoxErrorDetailEmbeddedTerminalContainer: {
      backgroundColor: colors.black,
      padding: 10,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.dangerBg,
    },
    auditRecordLogRowSegmentCardBoxErrorDetailEmbeddedTerminalContainerCodeTextString: {
      fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
      fontSize: 11,
      color: colors.dangerText,
    },
    auditRecordLogRowSegmentCardBoxSuccessConfirmationMessageLiteralStringText: {
      fontSize: 11,
      color: colors.successText,
      fontWeight: "600",
    },
    auditRecordLogRowSegmentCardBoxTimestampClockFooterMetaStringText: {
      fontSize: 10,
      color: colors.mutedText,
      fontWeight: "600",
    },
    modalInternalPaddingContainerWrapperFrameBlock: {
      padding: 16,
      gap: 16,
    },
    inputFieldFormGroupLabelInputStackFrame: {
      gap: 6,
    },
    inputFieldFormGroupLabelStringTextText: {
      fontSize: 10,
      fontWeight: "900",
      color: colors.mutedText,
      letterSpacing: 0.5,
    },
    inputFieldMultilineNativeInputBoxAreaFrameTextElement: {
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 12,
      padding: 12,
      color: colors.inputText,
      fontSize: 14,
      minHeight: 100,
      textAlignVertical: "top",
    },
    modalActionsConfirmationRowInlineLayoutFlexContainer: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 10,
      marginTop: 8,
    },
    modalActionsConfirmationRowInlineLayoutFlexContainerCancelButton: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalActionsConfirmationRowInlineLayoutFlexContainerCancelButtonText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: "700",
    },
    modalActionsConfirmationRowInlineLayoutFlexContainerConfirmButton: {
      backgroundColor: colors.warningText,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 8,
    },
    modalActionsConfirmationRowInlineLayoutFlexContainerConfirmButtonText: {
      color: colors.white,
      fontSize: 13,
      fontWeight: "900",
    },
  });
}