import React, { useEffect, useState, useMemo } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Modal,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ClipboardList,
  Calendar,
  Clock,
  Search,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  Eye,
  X,
  ChevronDown,
} from "lucide-react-native";

// Custom API clients from project ecosystem
import { getEODReports, getEODStatus } from "@/lib/admin/apiClient";

// ── THEME CONFIGURATION ───────────────────────────────────────
const THEME = {
  background: "#09090b", // Absolute dark canvas background
  card: "#121214",       // Premium dark container fill
  surface: "#1a1a1e",    // Input and utility item backdrop
  primary: "#ffd27a",    // Signature premium gold accent
  text: "#f4f4f5",       // Off-white primary text 
  muted: "#a1a1aa",       // Muted gray subtext
  border: "#27272a",      // Zinc clean layout borders
  
  // Semantic Context Colors
  success: "#10b981",
  danger: "#ef4444",
  warning: "#f59e0b",
  info: "#3b82f6",
};

// ── TYPES & INTERFACES ────────────────────────────────────────
interface EODReport {
  id: string;
  userId: string;
  employeeName: string;
  date: string;
  rawInput: string;
  inputType: string;
  status: "submitted" | "missing" | "late";
  createdAt: string;
  clockIn?: string;
  clockOut?: string;
  clockInAt?: string | null;
  clockOutAt?: string | null;
  totalHours?: number;
  aiSummary?: string;
  productivityScore?: number;
  flags?: string[];
}

interface EODStatus {
  employeeId: string;
  employeeName: string;
  status: "submitted" | "missing" | "late" | "not_clocked_in";
  clockIn?: string;
  clockOut?: string;
  clockInAt?: string | null;
  clockOutAt?: string | null;
  reportSubmittedAt?: string;
}

export default function ManagerEODReports() {
  const [reports, setReports] = useState<EODReport[]>([]);
  const [statusList, setStatusList] = useState<EODStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  const today = new Date().toISOString().split("T")[0];
  const [dateFilter, setDateFilter] = useState(today);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedReport, setSelectedReport] = useState<EODReport | null>(null);
  const [viewMode, setViewMode] = useState<"status" | "reports">("reports");
  
  // Custom Pickers State
  const [statusPickerOpen, setStatusPickerOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, [dateFilter, statusFilter, viewMode]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [reportsRes, statusRes] = await Promise.all([
        getEODReports({
          date: dateFilter || undefined,
          status: statusFilter === "all" ? undefined : statusFilter,
        }),
        getEODStatus(dateFilter || today),
      ]);
      setReports(reportsRes?.items || []);
      setStatusList(statusRes?.items || []);
    } catch (err) {
      console.error("Failed to load EOD data:", err);
      Alert.alert("Error", "Failed to load EOD data");
    } finally {
      setLoading(false);
    }
  };

  const filteredReports = useMemo(() => {
    return reports.filter((report) =>
      report.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      new Date(report.date).toLocaleDateString().includes(searchQuery)
    );
  }, [reports, searchQuery]);

  const filteredStatus = useMemo(() => {
    return statusList.filter((status) =>
      status.employeeName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [statusList, searchQuery]);

  const parseEODData = (rawInput: string) => {
    try {
      return JSON.parse(rawInput);
    } catch {
      return { tasksCompleted: rawInput, issuesBlockers: "", notes: "" };
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatLocalClock = (timeStr?: string | null, isoAt?: string | null): string => {
    if (isoAt) {
      const d = new Date(isoAt);
      if (Number.isFinite(d.getTime())) {
        return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      }
    }
    return String(timeStr || "").trim() || "—";
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "submitted":
        return (
          <View style={[styles.badgeStyle, styles.badgeSuccess]}>
            <CheckCircle size={11} color={THEME.success} style={{ marginRight: 4 }} />
            <Text style={[styles.badgeText, { color: THEME.success }]}>Submitted</Text>
          </View>
        );
      case "missing":
        return (
          <View style={[styles.badgeStyle, styles.badgeDanger]}>
            <XCircle size={11} color={THEME.danger} style={{ marginRight: 4 }} />
            <Text style={[styles.badgeText, { color: THEME.danger }]}>Missing</Text>
          </View>
        );
      case "late":
        return (
          <View style={[styles.badgeStyle, styles.badgeWarning]}>
            <AlertCircle size={11} color={THEME.warning} style={{ marginRight: 4 }} />
            <Text style={[styles.badgeText, { color: THEME.warning }]}>Late</Text>
          </View>
        );
      case "not_clocked_in":
        return (
          <View style={[styles.badgeStyle, styles.badgeMuted]}>
            <Clock size={11} color={THEME.muted} style={{ marginRight: 4 }} />
            <Text style={[styles.badgeText, { color: THEME.muted }]}>Not Clocked In</Text>
          </View>
        );
      default:
        return (
          <View style={[styles.badgeStyle, { borderColor: THEME.border }]}>
            <Text style={[styles.badgeText, { color: THEME.text }]}>{status}</Text>
          </View>
        );
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <View style={styles.centerSection}>
          <ActivityIndicator size="large" color={THEME.primary} />
          <Text style={styles.loadingText}>Loading EOD data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.container}>
        
        {/* ── HEADER ──────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.title}>End-of-Day Reports</Text>
            <Text style={styles.subtitle}>Monitor daily activities & workforce alignment</Text>
          </View>
          <View style={styles.segmentedToggleGroup}>
            <TouchableOpacity
              style={[styles.toggleSegmentBtn, viewMode === "reports" && styles.toggleSegmentBtnActive]}
              onPress={() => { setViewMode("reports"); setDateFilter(""); }}
            >
              <Text style={[styles.toggleSegmentBtnText, viewMode === "reports" && styles.toggleSegmentBtnTextActive]}>Reports</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleSegmentBtn, viewMode === "status" && styles.toggleSegmentBtnActive]}
              onPress={() => { setViewMode("status"); setDateFilter(today); }}
            >
              <Text style={[styles.toggleSegmentBtnText, viewMode === "status" && styles.toggleSegmentBtnTextActive]}>Dashboard</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── FILTERING SUITE ────────────────────────────────────── */}
        <View style={styles.filterCard}>
          <View style={styles.filterRowItem}>
            <Search size={16} color={THEME.muted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search employee name..."
              placeholderTextColor={THEME.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <View style={styles.formSplitRow}>
            <TextInput
              style={styles.dateInputText}
              value={dateFilter}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={THEME.muted}
              onChangeText={setDateFilter}
            />

            <TouchableOpacity style={styles.dropdownSelector} onPress={() => setStatusPickerOpen(true)}>
              <Text style={styles.dropdownSelectorText} numberOfLines={1}>
                {statusFilter === "all" ? "All Status" : statusFilter.toUpperCase()}
              </Text>
              <ChevronDown size={14} color={THEME.muted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.resetBtn}
              onPress={() => { setDateFilter(viewMode === "status" ? today : ""); setStatusFilter("all"); setSearchQuery(""); }}
            >
              <Text style={styles.resetBtnText}>Reset</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── STATUS DASHBOARD VIEW (GRID VIEW ASSEMBLY) ──────────── */}
        {viewMode === "status" && (
          <ScrollView contentContainerStyle={styles.scrollBodyContainer} showsVerticalScrollIndicator={false}>
            <View style={styles.sectionHeaderTitleRow}>
              <ClipboardList size={16} color={THEME.primary} />
              <Text style={styles.sectionTitleLabel}>Employee EOD Status</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{filteredStatus.length} Employees</Text>
              </View>
            </View>

            {filteredStatus.length === 0 ? (
              <View style={styles.emptyContainer}>
                <ClipboardList size={40} color={THEME.border} />
                <Text style={styles.emptyTitle}>No tracking match records found</Text>
              </View>
            ) : (
              <View style={styles.dashboardGridLayout}>
                {filteredStatus.map((statusItem) => {
                  const isGreen = statusItem.status === "submitted";
                  const isYellow = statusItem.status === "late";
                  const isRed = statusItem.status === "missing";
                  const isGray = statusItem.status === "not_clocked_in";

                  return (
                    <TouchableOpacity
                      key={statusItem.employeeId}
                      style={[
                        styles.gridCardUnit,
                        isGreen && { borderColor: "rgba(16, 185, 129, 0.4)" },
                        isYellow && { borderColor: "rgba(245, 158, 11, 0.4)" },
                        isRed && { borderColor: "rgba(239, 68, 68, 0.4)" },
                      ]}
                      onPress={() => {
                        const matchedReport = reports.find((r) => r.employeeName === statusItem.employeeName);
                        if (matchedReport) {
                          setSelectedReport(matchedReport);
                        } else if (statusItem.status !== "not_clocked_in") {
                          Alert.alert("Notice", "No compiled structured profile found for this worker.");
                        }
                      }}
                      disabled={isGray}
                    >
                      <View style={styles.cardHeaderIndicatorRow}>
                        <View style={[
                          styles.statusDotElement,
                          isGreen && { backgroundColor: THEME.success },
                          isYellow && { backgroundColor: THEME.warning },
                          isRed && { backgroundColor: THEME.danger },
                          isGray && { backgroundColor: THEME.muted }
                        ]} />
                      </View>

                      <View style={styles.gridAvatarBlock}>
                        <View style={styles.avatarBox}>
                          <User size={16} color={THEME.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.gridEmployeeName} numberOfLines={1}>{statusItem.employeeName}</Text>
                          <Text style={styles.gridMetaClockText} numberOfLines={1}>
                            {statusItem.clockIn ? `In: ${formatLocalClock(statusItem.clockIn, statusItem.clockInAt)}` : "Not Clocked In"}
                          </Text>
                        </View>
                      </View>

                      <View style={{ marginTop: 6, alignItems: "flex-start" }}>
                        {renderStatusBadge(statusItem.status)}
                      </View>

                      {statusItem.clockOut && (
                        <Text style={[styles.gridMetaClockText, { marginTop: 4 }]}>
                          Out: {formatLocalClock(statusItem.clockOut, statusItem.clockOutAt)}
                        </Text>
                      )}

                      {statusItem.reportSubmittedAt && (
                        <Text style={[styles.gridMetaClockText, { marginTop: 2, color: THEME.primary }]}>
                          Sent: {new Date(statusItem.reportSubmittedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </Text>
                      )}

                      {!isGray && (
                        <View style={styles.cardDrilldownHint}>
                          <Text style={styles.drilldownHintText}>View Parameters</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </ScrollView>
        )}

        {/* ── ALL REPORTS LOG VIEW (HISTORICAL FLUID LIST ASSEMBLY) ── */}
        {viewMode === "reports" && (
          <View style={{ flex: 1 }}>
            <View style={styles.sectionHeaderTitleRow}>
              <ClipboardList size={16} color={THEME.primary} />
              <Text style={styles.sectionTitleLabel}>Historical Summaries</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{filteredReports.length} Logs</Text>
              </View>
            </View>

            {filteredReports.length === 0 ? (
              <View style={styles.emptyContainer}>
                <ClipboardList size={40} color={THEME.border} />
                <Text style={styles.emptyTitle}>No historical submissions logged</Text>
              </View>
            ) : (
              <FlatList
                data={filteredReports}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                renderItem={({ item: reportItem }) => (
                  <TouchableOpacity
                    style={styles.reportListItemCard}
                    onPress={() => setSelectedReport(reportItem)}
                  >
                    <View style={styles.reportListItemTopRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.reportItemNameText}>{reportItem.employeeName}</Text>
                        <Text style={styles.reportItemDateText}>{formatDate(reportItem.date)}</Text>
                      </View>
                      <View>{renderStatusBadge(reportItem.status)}</View>
                    </View>

                    <View style={styles.reportItemMiddlePreviewBlock}>
                      <Text style={styles.reportItemPreviewContentText} numberOfLines={2}>
                        {parseEODData(reportItem.rawInput).tasksCompleted || "No metrics compiled."}
                      </Text>
                    </View>

                    <View style={styles.reportItemFooterSummaryRow}>
                      <Text style={styles.reportFooterHoursLabel}>
                        Duration: <Text style={{ color: THEME.primary, fontWeight: "600" }}>{reportItem.totalHours ? `${reportItem.totalHours.toFixed(2)}h` : "—"}</Text>
                      </Text>
                      <View style={styles.actionIconButtonLink}>
                        <Eye size={14} color={THEME.primary} style={{ marginRight: 4 }} />
                        <Text style={styles.actionViewLabelText}>Metrics</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                )}
                contentContainerStyle={{ paddingBottom: 24 }}
              />
            )}
          </View>
        )}

        {/* ── DISCRETE FILTER OVERLAY SHEET ─────────────────────── */}
        <Modal visible={statusPickerOpen} transparent animationType="slide">
          <View style={styles.modalBackdropOverlay}>
            <View style={styles.bottomSheetWrapper}>
              <View style={styles.bottomSheetHeaderTitleRow}>
                <Text style={styles.bottomSheetHeaderTitle}>Select Status Filter</Text>
                <TouchableOpacity onPress={() => setStatusPickerOpen(false)}>
                  <X size={20} color={THEME.text} />
                </TouchableOpacity>
              </View>
              {["all", "submitted", "missing", "late"].map((statusOption) => (
                <TouchableOpacity
                  key={statusOption}
                  style={styles.pickerItemRowUnit}
                  onPress={() => {
                    setStatusFilter(statusOption);
                    setStatusPickerOpen(false);
                  }}
                >
                  <Text style={styles.pickerItemLabelText}>
                    {statusOption === "all" ? "All Status Metrics" : statusOption.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Modal>

        {/* ── METRICS DRILLDOWN DETAIL DIALOG OVERLAY ───────────── */}
        <Modal visible={!!selectedReport} transparent animationType="fade">
          <View style={styles.modalBackdropOverlay}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, justifyContent: "flex-end", width: "100%" }}>
              <View style={styles.fullscreenDialogContainer}>
                <View style={[styles.bottomSheetHeaderTitleRow, { paddingHorizontal: 4 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bottomSheetHeaderTitle}>EOD Summary Metrics</Text>
                    <Text style={{ color: THEME.muted, fontSize: 12, marginTop: 2 }}>Comprehensive workspace activity evaluation</Text>
                  </View>
                  <TouchableOpacity style={styles.closeOverlayBtnCircle} onPress={() => setSelectedReport(null)}>
                    <X size={18} color={THEME.text} />
                  </TouchableOpacity>
                </View>

                {selectedReport && (
                  <ScrollView style={styles.dialogFormScrollContainer} showsVerticalScrollIndicator={false}>
                    
                    {/* Meta Parameters Block Grid layout */}
                    <View style={styles.dialogMetadataGridContainer}>
                      <View style={styles.metadataGridHalfItem}><Text style={styles.metadataItemLabel}>Employee</Text><Text style={styles.metadataItemValue}>{selectedReport.employeeName}</Text></View>
                      <View style={styles.metadataGridHalfItem}><Text style={styles.metadataItemLabel}>Date</Text><Text style={styles.metadataItemValue}>{formatDate(selectedReport.date)}</Text></View>
                      <View style={styles.metadataGridHalfItem}><Text style={styles.metadataItemLabel}>Clock In</Text><Text style={styles.metadataItemValue}>{formatLocalClock(selectedReport.clockIn, selectedReport.clockInAt)}</Text></View>
                      <View style={styles.metadataGridHalfItem}><Text style={styles.metadataItemLabel}>Clock Out</Text><Text style={styles.metadataItemValue}>{formatLocalClock(selectedReport.clockOut, selectedReport.clockOutAt)}</Text></View>
                      <View style={styles.metadataGridHalfItem}><Text style={styles.metadataItemLabel}>Total Duration</Text><Text style={[styles.metadataItemValue, { color: THEME.primary }]}>{selectedReport.totalHours ? `${selectedReport.totalHours.toFixed(2)} Hours` : "—"}</Text></View>
                      <View style={styles.metadataGridHalfItem}><Text style={styles.metadataItemLabel}>Submission Status</Text><View style={{ marginTop: 4, alignItems: "flex-start" }}>{renderStatusBadge(selectedReport.status)}</View></View>
                      <View style={styles.metadataGridHalfItem}><Text style={styles.metadataItemLabel}>Input Channel</Text><Text style={[styles.metadataItemValue, { textTransform: "capitalize" }]}>{selectedReport.inputType || "UI Layout"}</Text></View>
                      <View style={styles.metadataGridHalfItem}><Text style={styles.metadataItemLabel}>Productivity Score</Text><Text style={[styles.metadataItemValue, { color: THEME.primary, fontWeight: "700" }]}>{selectedReport.productivityScore !== undefined ? `${selectedReport.productivityScore} / 10` : "—"}</Text></View>
                    </View>

                    {/* AI Processed Insight */}
                    {selectedReport.aiSummary && (
                      <View style={styles.metricCardBlockContainer}>
                        <Text style={styles.metricBlockHeaderLabel}>✨ AI Core Insight Engine</Text>
                        <View style={[styles.metricContentCardBodyBox, styles.aiInsightBodyOverride]}>
                          <Text style={styles.insightRawTextContent}>{selectedReport.aiSummary}</Text>
                        </View>
                      </View>
                    )}

                    {/* Operational Risk Flags */}
                    {selectedReport.flags && selectedReport.flags.length > 0 && (
                      <View style={styles.metricCardBlockContainer}>
                        <Text style={styles.metricBlockHeaderLabel}>⚠️ Operational Compliance Exception Flags</Text>
                        <View style={[styles.metricContentCardBodyBox, styles.flaggedIncidentBodyOverride]}>
                          <View style={styles.horizontalTagWrapperList}>
                            {selectedReport.flags.map((flagItem, index) => (
                              <View key={index} style={styles.flaggedPillBadge}>
                                <Text style={styles.flaggedPillTextLabel}>{flagItem}</Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      </View>
                    )}

                    {/* Tasks Details Map Blocks */}
                    {(() => {
                      const computedDataMap = parseEODData(selectedReport.rawInput);
                      return (
                        <View style={{ gap: 12, marginTop: 12 }}>
                          <View style={styles.metricCardBlockContainer}>
                            <Text style={styles.metricBlockHeaderLabel}>✅ Tasks Completed Log</Text>
                            <View style={[styles.metricContentCardBodyBox, styles.successMetricsCardBox]}>
                              <Text style={styles.metricContentDetailsText}>
                                {computedDataMap.tasksCompleted || "No task context parameters provided."}
                              </Text>
                            </View>
                          </View>

                          {computedDataMap.issuesBlockers ? (
                            <View style={styles.metricCardBlockContainer}>
                              <Text style={styles.metricBlockHeaderLabel}>🚨 Operational Escapes & System Blockers</Text>
                              <View style={[styles.metricContentCardBodyBox, styles.warningMetricsCardBox]}>
                                <Text style={styles.metricContentDetailsText}>{computedDataMap.issuesBlockers}</Text>
                              </View>
                            </View>
                          ) : null}

                          {computedDataMap.notes ? (
                            <View style={styles.metricCardBlockContainer}>
                              <Text style={styles.metricBlockHeaderLabel}>📝 Operational Log Notes</Text>
                              <View style={[styles.metricContentCardBodyBox, styles.standardMetricsCardBox]}>
                                <Text style={styles.metricContentDetailsText}>{computedDataMap.notes}</Text>
                              </View>
                            </View>
                          ) : null}
                        </View>
                      );
                    })()}
                    <View style={{ height: 40 }} />
                  </ScrollView>
                )}

                <View style={styles.dialogFooterActionBar}>
                  <TouchableOpacity style={styles.footerActionSubmitBtn} onPress={() => setSelectedReport(null)}>
                    <Text style={styles.footerActionSubmitBtnText}>Dismiss View </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>

      </View>
    </SafeAreaView>
  );
}

// ── COMPONENT MOUNT STYLESHEET ────────────────────────────────
const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  centerSection: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: THEME.muted,
    marginTop: 12,
    fontSize: 14,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: THEME.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 12,
    color: THEME.muted,
    marginTop: 2,
  },
  segmentedToggleGroup: {
    flexDirection: "row",
    backgroundColor: THEME.card,
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  toggleSegmentBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  toggleSegmentBtnActive: {
    backgroundColor: THEME.primary,
  },
  toggleSegmentBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: THEME.muted,
  },
  toggleSegmentBtnTextActive: {
    color: THEME.background,
  },
  filterCard: {
    backgroundColor: THEME.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: THEME.border,
    marginBottom: 16,
    gap: 10,
  },
  filterRowItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 38,
    fontSize: 13,
    color: THEME.text,
  },
  formSplitRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  dateInputText: {
    flex: 1.2,
    height: 38,
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 13,
    color: THEME.text,
  },
  dropdownSelector: {
    flex: 1.5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
  },
  dropdownSelectorText: {
    fontSize: 12,
    color: THEME.text,
    fontWeight: "500",
  },
  resetBtn: {
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.border,
    backgroundColor: THEME.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  resetBtnText: {
    color: THEME.text,
    fontSize: 12,
    fontWeight: "600",
  },
  scrollBodyContainer: {
    paddingBottom: 24,
  },
  sectionHeaderTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitleLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: THEME.text,
    marginLeft: 6,
  },
  countBadge: {
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  countBadgeText: {
    color: THEME.primary,
    fontSize: 10,
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 13,
    color: THEME.muted,
    textAlign: "center",
  },
  dashboardGridLayout: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  gridCardUnit: {
    width: "48.5%",
    backgroundColor: THEME.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 12,
    position: "relative",
  },
  cardHeaderIndicatorRow: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 2,
  },
  statusDotElement: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  gridAvatarBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  avatarBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: THEME.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: THEME.border,
  },
  gridEmployeeName: {
    fontSize: 12,
    fontWeight: "700",
    color: THEME.text,
  },
  gridMetaClockText: {
    fontSize: 10,
    color: THEME.muted,
    marginTop: 1,
  },
  cardDrilldownHint: {
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    marginTop: 10,
    paddingTop: 6,
    alignItems: "center",
  },
  drilldownHintText: {
    fontSize: 10,
    color: THEME.primary,
    fontWeight: "600",
  },
  reportListItemCard: {
    backgroundColor: THEME.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 14,
    marginBottom: 10,
  },
  reportListItemTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  reportItemNameText: {
    fontSize: 14,
    fontWeight: "700",
    color: THEME.text,
  },
  reportItemDateText: {
    fontSize: 11,
    color: THEME.muted,
    marginTop: 2,
  },
  badgeStyle: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
  },
  badgeSuccess: { backgroundColor: "rgba(16, 185, 129, 0.1)", borderColor: "rgba(16, 185, 129, 0.2)" },
  badgeDanger: { backgroundColor: "rgba(239, 68, 68, 0.1)", borderColor: "rgba(239, 68, 68, 0.2)" },
  badgeWarning: { backgroundColor: "rgba(245, 158, 11, 0.1)", borderColor: "rgba(245, 158, 11, 0.2)" },
  badgeMuted: { backgroundColor: "rgba(161, 161, 170, 0.08)", borderColor: "rgba(161, 161, 170, 0.2)" },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  reportItemMiddlePreviewBlock: {
    marginVertical: 10,
  },
  reportItemPreviewContentText: {
    fontSize: 12,
    color: THEME.text,
    lineHeight: 16,
  },
  reportItemFooterSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    paddingTop: 8,
  },
  reportFooterHoursLabel: {
    fontSize: 11,
    color: THEME.muted,
  },
  actionIconButtonLink: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionViewLabelText: {
    fontSize: 11,
    color: THEME.primary,
    fontWeight: "600",
  },
  modalBackdropOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "flex-end",
  },
  bottomSheetWrapper: {
    backgroundColor: THEME.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  bottomSheetHeaderTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
    paddingBottom: 12,
  },
  bottomSheetHeaderTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: THEME.text,
    letterSpacing: -0.3,
  },
  pickerItemRowUnit: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.surface,
  },
  pickerItemLabelText: {
    fontSize: 13,
    color: THEME.text,
    fontWeight: "500",
  },
  fullscreenDialogContainer: {
    backgroundColor: THEME.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: "85%",
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  closeOverlayBtnCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: THEME.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  dialogFormScrollContainer: {
    flex: 1,
  },
  dialogMetadataGridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: THEME.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 8,
    marginBottom: 14,
  },
  metadataGridHalfItem: {
    width: "50%",
    padding: 6,
  },
  metadataItemLabel: {
    fontSize: 10,
    color: THEME.muted,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  metadataItemValue: {
    fontSize: 13,
    fontWeight: "600",
    color: THEME.text,
    marginTop: 2,
  },
  metricCardBlockContainer: {
    marginBottom: 12,
  },
  metricBlockHeaderLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: THEME.muted,
    marginBottom: 6,
    paddingLeft: 2,
  },
  metricContentCardBodyBox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  metricContentDetailsText: {
    fontSize: 12,
    color: THEME.text,
    lineHeight: 18,
  },
  aiInsightBodyOverride: {
    backgroundColor: "rgba(147, 51, 234, 0.05)",
    borderColor: "rgba(147, 51, 234, 0.2)",
  },
  insightRawTextContent: {
    fontSize: 12,
    color: "#d8b4fe",
    lineHeight: 18,
  },
  flaggedIncidentBodyOverride: {
    backgroundColor: "rgba(245, 158, 11, 0.05)",
    borderColor: "rgba(245, 158, 11, 0.2)",
  },
  horizontalTagWrapperList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  flaggedPillBadge: {
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
  },
  flaggedPillTextLabel: {
    color: THEME.warning,
    fontSize: 10,
    fontWeight: "700",
  },
  successMetricsCardBox: {
    backgroundColor: "rgba(16, 185, 129, 0.03)",
    borderColor: THEME.border,
  },
  warningMetricsCardBox: {
    backgroundColor: "rgba(239, 68, 68, 0.03)",
    borderColor: THEME.border,
  },
  standardMetricsCardBox: {
    backgroundColor: "rgba(59, 130, 246, 0.03)",
    borderColor: THEME.border,
  },
  dialogFooterActionBar: {
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 12 : 4,
  },
  footerActionSubmitBtn: {
    backgroundColor: THEME.primary,
    height: 44,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  footerActionSubmitBtnText: {
    color: THEME.background,
    fontSize: 14,
    fontWeight: "700",
  },
});