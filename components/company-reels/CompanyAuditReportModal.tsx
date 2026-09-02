import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Share,
  Alert,
} from "react-native";
import {
  FileText,
  Download,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Filter,
  ShieldCheck,
  Building2,
  X,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { apiRequest } from "@/services/api";

interface AuditKpis {
  totalEmployeesTracked: number;
  totalAssignments: number;
  totalCompletions: number;
  totalOverdue: number;
  overallCompliancePercent: number;
}

interface AuditRecord {
  employeeId: string;
  employeeName: string;
  department: string;
  role: string;
  reelTitle: string;
  category: string;
  status: "COMPLIANT" | "OVERDUE" | "IN_PROGRESS";
  dueDate?: string;
  completedAt?: string;
  quizAccuracy: string;
  electronicSignature: string;
}

interface AuditResponse {
  kpis: AuditKpis;
  records: AuditRecord[];
}

interface CompanyAuditReportModalProps {
  visible: boolean;
  onClose: () => void;
}

export const CompanyAuditReportModal: React.FC<CompanyAuditReportModalProps> = ({
  visible,
  onClose,
}) => {
  const [data, setData] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "COMPLIANT" | "OVERDUE" | "IN_PROGRESS">("all");
  const [exporting, setExporting] = useState(false);

  const fetchAuditData = useCallback(async () => {
    setLoading(true);
    try {
      let url = "/company-reels/admin/audit-ledger";
      const params: string[] = [];
      if (statusFilter !== "all") params.push(`status=${statusFilter}`);
      if (searchQuery.trim()) params.push(`search=${encodeURIComponent(searchQuery.trim())}`);
      if (params.length > 0) url += `?${params.join("&")}`;

      const res = await apiRequest<AuditResponse>(url);
      setData(res.data);
    } catch (err) {
      console.error("[Audit Ledger] Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    if (visible) {
      fetchAuditData();
    }
  }, [visible, fetchAuditData]);

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const csvUrl = "/company-reels/admin/audit-export";
      const res = await apiRequest<string>(csvUrl);
      const csvContent = typeof res === "string" ? res : JSON.stringify(res);

      await Share.share({
        title: "Company Reels Compliance Audit Report",
        message: csvContent.substring(0, 1500) + "\n\n... (Full Audit CSV Log Exported from Se7en Task Manager)",
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      console.error("Export error:", err);
      Alert.alert("Export Error", "Could not export audit CSV at this time.");
    } finally {
      setExporting(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.titleWithIcon}>
              <ShieldCheck size={20} color="#22C55E" style={{ marginRight: 8 }} />
              <Text style={styles.headerTitle}>Compliance Audit Ledger</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.closeBtn}
            >
              <X size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <Text style={styles.headerSub}>
            Legally defensible compliance and safety training logs ready for OSHA and internal audits.
          </Text>

          {/* Search Bar */}
          <View style={styles.searchWrap}>
            <Search size={16} color="#64748B" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search employee, course, or department..."
              placeholderTextColor="#64748B"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <X size={16} color="#94A3B8" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Status Segment Filters */}
          <View style={styles.segmentWrap}>
            {(["all", "COMPLIANT", "OVERDUE", "IN_PROGRESS"] as const).map((st) => (
              <TouchableOpacity
                key={st}
                style={[styles.segmentBtn, statusFilter === st && styles.segmentBtnActive]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setStatusFilter(st);
                }}
              >
                <Text
                  style={[
                    styles.segmentText,
                    statusFilter === st && styles.segmentTextActive,
                    st === "COMPLIANT" && statusFilter === st && { color: "#22C55E" },
                    st === "OVERDUE" && statusFilter === st && { color: "#EF4444" },
                  ]}
                >
                  {st === "all" ? "ALL" : st.replace("_", " ")}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {loading || !data ? (
            <ActivityIndicator size="large" color="#22C55E" style={{ marginVertical: 40 }} />
          ) : (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
              {/* KPIs Bar */}
              <View style={styles.kpisGrid}>
                <View style={styles.kpiBox}>
                  <Text
                    style={[
                      styles.kpiVal,
                      { color: data.kpis.overallCompliancePercent >= 80 ? "#22C55E" : "#F59E0B" },
                    ]}
                  >
                    {data.kpis.overallCompliancePercent}%
                  </Text>
                  <Text style={styles.kpiLabel}>COMPLIANCE</Text>
                </View>

                <View style={styles.kpiBox}>
                  <Text style={[styles.kpiVal, { color: "#EF4444" }]}>
                    {data.kpis.totalOverdue}
                  </Text>
                  <Text style={styles.kpiLabel}>OVERDUE</Text>
                </View>

                <View style={styles.kpiBox}>
                  <Text style={[styles.kpiVal, { color: "#38BDF8" }]}>
                    {data.kpis.totalCompletions}
                  </Text>
                  <Text style={styles.kpiLabel}>COMPLETED</Text>
                </View>

                <View style={styles.kpiBox}>
                  <Text style={[styles.kpiVal, { color: "#FFFFFF" }]}>
                    {data.kpis.totalEmployeesTracked}
                  </Text>
                  <Text style={styles.kpiLabel}>STAFF</Text>
                </View>
              </View>

              {/* Records List */}
              <View style={styles.recordsHeaderRow}>
                <Text style={styles.recordsHeading}>
                  Audit Records ({data.records.length})
                </Text>
                <TouchableOpacity
                  style={styles.exportCsvBtn}
                  disabled={exporting}
                  onPress={handleExportCsv}
                >
                  <Download size={13} color="#22C55E" style={{ marginRight: 4 }} />
                  <Text style={styles.exportCsvText}>Export CSV</Text>
                </TouchableOpacity>
              </View>

              {data.records.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>No matching compliance records found.</Text>
                </View>
              ) : (
                <View style={{ gap: 10 }}>
                  {data.records.map((rec, index) => {
                    const isCompliant = rec.status === "COMPLIANT";
                    const isOverdue = rec.status === "OVERDUE";

                    let statusBg = "rgba(56, 189, 248, 0.15)";
                    let statusColor = "#38BDF8";
                    if (isCompliant) {
                      statusBg = "rgba(34, 197, 94, 0.15)";
                      statusColor = "#22C55E";
                    } else if (isOverdue) {
                      statusBg = "rgba(239, 68, 68, 0.15)";
                      statusColor = "#EF4444";
                    }

                    return (
                      <View key={index} style={styles.recordCard}>
                        <View style={styles.recordHeader}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.recordEmpName}>{rec.employeeName}</Text>
                            <Text style={styles.recordEmpMeta}>
                              {rec.role} • {rec.department} (ID: {rec.employeeId})
                            </Text>
                          </View>
                          <View style={[styles.statusPill, { backgroundColor: statusBg }]}>
                            <Text style={[styles.statusText, { color: statusColor }]}>
                              {rec.status}
                            </Text>
                          </View>
                        </View>

                        <Text style={styles.recordReelTitle}>{rec.reelTitle}</Text>

                        <View style={styles.recordMetaGrid}>
                          <View style={styles.recordMetaItem}>
                            <Text style={styles.metaKey}>Completed:</Text>
                            <Text style={styles.metaVal}>
                              {rec.completedAt ? new Date(rec.completedAt).toLocaleDateString() : "Pending"}
                            </Text>
                          </View>
                          <View style={styles.recordMetaItem}>
                            <Text style={styles.metaKey}>Accuracy:</Text>
                            <Text style={[styles.metaVal, { color: "#38BDF8" }]}>
                              {rec.quizAccuracy}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.signatureRow}>
                          <Text style={styles.sigKey}>Electronic Sign-off:</Text>
                          <Text style={styles.sigVal} numberOfLines={1}>
                            {rec.electronicSignature}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: "#0F172A",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 18,
    paddingHorizontal: 16,
    maxHeight: "92%",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  titleWithIcon: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  headerSub: {
    color: "#94A3B8",
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 14,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E293B",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  searchInput: {
    flex: 1,
    color: "#F8FAFC",
    fontSize: 13,
  },
  segmentWrap: {
    flexDirection: "row",
    backgroundColor: "#1E293B",
    borderRadius: 10,
    padding: 3,
    marginBottom: 14,
  },
  segmentBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 7,
    borderRadius: 8,
  },
  segmentBtnActive: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  segmentText: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "700",
  },
  segmentTextActive: {
    color: "#FFFFFF",
  },
  kpisGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  kpiBox: {
    flex: 1,
    backgroundColor: "#1E293B",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  kpiVal: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 2,
  },
  kpiLabel: {
    color: "#94A3B8",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  recordsHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  recordsHeading: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "700",
  },
  exportCsvBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.3)",
  },
  exportCsvText: {
    color: "#22C55E",
    fontSize: 11,
    fontWeight: "700",
  },
  emptyCard: {
    padding: 30,
    backgroundColor: "#1E293B",
    borderRadius: 12,
    alignItems: "center",
  },
  emptyText: {
    color: "#64748B",
    fontSize: 13,
  },
  recordCard: {
    backgroundColor: "#1E293B",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  recordHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  recordEmpName: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "700",
  },
  recordEmpMeta: {
    color: "#94A3B8",
    fontSize: 11,
    marginTop: 1,
  },
  statusPill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "800",
  },
  recordReelTitle: {
    color: "#CBD5E1",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
  },
  recordMetaGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 6,
  },
  recordMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaKey: {
    color: "#64748B",
    fontSize: 11,
  },
  metaVal: {
    color: "#E2E8F0",
    fontSize: 11,
    fontWeight: "600",
  },
  signatureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 4,
  },
  sigKey: {
    color: "#64748B",
    fontSize: 10,
  },
  sigVal: {
    flex: 1,
    color: "#22C55E",
    fontSize: 10,
    fontFamily: "monospace",
  },
});
