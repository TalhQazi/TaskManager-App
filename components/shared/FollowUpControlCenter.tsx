import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Platform,
} from "react-native";
import {
  Clock,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Zap,
  TrendingUp,
  UserCheck,
  Check,
  ShieldAlert,
} from "lucide-react-native";
import { apiRequest } from "@/services/api";
import Colors from "@/constants/colors";

interface FollowUpControlCenterProps {
  taskId: string;
  isManager?: boolean;
  isAdmin?: boolean;
}

interface AISuggestions {
  suggestedInterval: number;
  riskScore: number;
  recommendedEscalation: number;
  suggestedAssignee: string;
  recommendedNextAction: string;
}

interface FollowUpTimer {
  _id: string;
  taskId: string;
  dueAt: string;
  status: "active" | "completed" | "overdue" | "snoozed";
  completedAt?: string | null;
  snoozedUntil?: string | null;
  escalationLevel: number;
  slaStatus: "On Track" | "Warning" | "Breached" | "Resolved Late" | "Resolved On Time";
  aiSuggestions?: AISuggestions;
}

export default function FollowUpControlCenter({ taskId, isManager = false, isAdmin = false }: FollowUpControlCenterProps) {
  const [timer, setTimer] = useState<FollowUpTimer | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const [customMinutes, setCustomMinutes] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const [remainingSecs, setRemainingSecs] = useState<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const initData = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{ items: FollowUpTimer[] }>(`/tasks/${taskId}/followups`);
      if (res.data?.items && res.data.items.length > 0) {
        setTimer(res.data.items[0]);
      } else {
        setTimer(null);
      }

      const histRes = await apiRequest<{ items: any[] }>(`/tasks/${taskId}/followups/history`);
      setHistory(histRes.data?.items || []);
    } catch (err) {
      console.error("Failed to load followups logs", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initData();
  }, [taskId]);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    if (!timer || timer.status === "completed") {
      setRemainingSecs(null);
      return;
    }

    const targetTime = timer.status === "snoozed" && timer.snoozedUntil 
      ? new Date(timer.snoozedUntil).getTime() 
      : new Date(timer.dueAt).getTime();

    const updateClock = () => {
      const delta = Math.max(0, Math.floor((targetTime - Date.now()) / 1000));
      setRemainingSecs(delta);
      if (delta === 0 && timer.status === "active") {
        initData();
      }
    };

    updateClock();
    intervalRef.current = setInterval(updateClock, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timer]);

  const countdownStr = useMemo(() => {
    if (remainingSecs === null || remainingSecs === 0) return "00:00:00:00";
    const days = Math.floor(remainingSecs / (24 * 3600));
    const hours = Math.floor((remainingSecs % (24 * 3600)) / 3600);
    const mins = Math.floor((remainingSecs % 3600) / 60);
    const secs = remainingSecs % 60;
    return `${String(days).padStart(2, "0")}:${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }, [remainingSecs]);

  const handleCreateTimer = async (mins: number) => {
    setSubmitting(true);
    try {
      const dueAt = new Date(Date.now() + mins * 60 * 1000).toISOString();
      await apiRequest(`/tasks/${taskId}/followups`, {
        method: "POST",
        data: { dueAt },
      });
      await initData();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = async () => {
    if (!timer) return;
    setSubmitting(true);
    try {
      await apiRequest(`/tasks/${taskId}/followups/${timer._id}/complete`, { method: "PATCH" });
      await initData();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSnooze = async (mins: number) => {
    if (!timer) return;
    setSubmitting(true);
    try {
      await apiRequest(`/tasks/${taskId}/followups/${timer._id}/snooze`, {
        method: "PATCH",
        data: { minutes: mins },
      });
      setSnoozeOpen(false);
      setCustomMinutes("");
      await initData();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = async () => {
    if (!timer) return;
    setSubmitting(true);
    try {
      await apiRequest(`/tasks/${taskId}/followups/${timer._id}/reset`, { method: "PATCH" });
      await initData();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const fetchSuggestions = async () => {
    if (!timer) return;
    setAiLoading(true);
    try {
      await apiRequest(`/tasks/${taskId}/followups/${timer._id}/ai-suggestions`);
      await initData();
    } catch (err) {
      console.error(err);
    } finally {
      setAiLoading(false);
    }
  };

  const handleApproveAI = async () => {
    if (!timer) return;
    setAiLoading(true);
    try {
      await apiRequest(`/tasks/${taskId}/followups/${timer._id}/ai-approve`, { method: "POST" });
      await initData();
    } catch (err) {
      console.error(err);
    } finally {
      setAiLoading(false);
    }
  };

  const getSlaStyles = (status: string) => {
    switch (status) {
      case "On Track":
      case "Resolved On Time":
        return { color: "#34d399", bg: "rgba(52, 211, 153, 0.1)", border: "rgba(52, 211, 153, 0.3)" };
      case "Warning":
        return { color: "#fbbf24", bg: "rgba(251, 191, 36, 0.1)", border: "rgba(251, 191, 36, 0.3)" };
      case "Breached":
      case "Resolved Late":
        return { color: "#f87171", bg: "rgba(248, 113, 113, 0.1)", border: "rgba(248, 113, 113, 0.4)" };
      default:
        return { color: "#9ca3af", bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.1)" };
    }
  };

  if (loading) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="small" color="#6366f1" />
      </View>
    );
  }

  const sla = timer ? getSlaStyles(timer.slaStatus) : null;

  return (
    <View style={styles.cardContainer}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.headerTitle}>
            <Clock size={14} color="#818cf8" /> FOLLOW-UP CENTER
          </Text>
          <Text style={styles.headerSubtitle}>SLA COUNTDOWNS & ESCALATIONS</Text>
        </View>
        {timer && sla && (
          <View style={[styles.slaBadge, { backgroundColor: sla.bg, borderColor: sla.border }]}>
            <Text style={[styles.slaBadgeText, { color: sla.color }]}>SLA: {timer.slaStatus}</Text>
          </View>
        )}
      </View>

      <View style={styles.cardContent}>
        {!timer ? (
          <View style={styles.emptyContainer}>
            <AlertCircle size={24} color="rgba(129, 140, 248, 0.5)" />
            <Text style={styles.emptyHeading}>No Follow-up Scheduled</Text>
            <Text style={styles.emptyText}>Set an independent follow-up timer for this task to enforce guidelines.</Text>
            
            <View style={styles.buttonRow}>
              {[15, 30, 60].map((m) => (
                <TouchableOpacity
                  key={m}
                  style={styles.quickTimerBtn}
                  disabled={submitting}
                  onPress={() => handleCreateTimer(m)}
                >
                  <Text style={styles.quickTimerBtnText}>{m === 60 ? "1 Hour" : `${m} Min`}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.activeContainer}>
            <View style={styles.countdownBox}>
              <View>
                <Text style={styles.boxLabel}>Remaining Timer</Text>
                <Text style={[
                  styles.countdownText,
                  timer.status === "overdue" && styles.textError,
                  timer.status === "snoozed" && styles.textWarning,
                ]}>
                  {timer.status === "completed" ? "COMPLETED" : countdownStr}
                </Text>
                {timer.completedAt && (
                  <Text style={styles.boxSubInfoText}>Done: {new Date(timer.completedAt).toLocaleTimeString()}</Text>
                )}
                {timer.status === "snoozed" && timer.snoozedUntil && (
                  <Text style={styles.boxSubInfoWarning}>Snoozed until {new Date(timer.snoozedUntil).toLocaleTimeString()}</Text>
                )}
              </View>

              <View style={[
                styles.statusIconCircle,
                timer.status === "completed" && { backgroundColor: "rgba(35, 134, 54, 0.15)", borderColor: "#238636" },
                timer.status === "overdue" && { backgroundColor: "rgba(248, 113, 113, 0.15)", borderColor: "#f87171" },
                timer.status === "snoozed" && { backgroundColor: "rgba(251, 191, 36, 0.15)", borderColor: "#fbbf24" },
              ]}>
                {timer.status === "completed" ? <CheckCircle2 size={18} color="#238636" /> :
                 timer.status === "overdue" ? <ShieldAlert size={18} color="#f87171" /> :
                 timer.status === "snoozed" ? <AlertTriangle size={18} color="#fbbf24" /> :
                 <Clock size={18} color="#6366f1" />}
              </View>
            </View>

            {/* Escalation Progression Indicators */}
            {timer.status !== "completed" && (
              <View style={styles.escalationSection}>
                <Text style={styles.boxLabel}>Escalation State</Text>
                <View style={styles.progressTrackRow}>
                  {[1, 2, 3, 4].map((lvl) => {
                    const isActive = timer.escalationLevel >= lvl;
                    const isOverdue = timer.status === "overdue" && timer.escalationLevel >= lvl;
                    return (
                      <View key={lvl} style={styles.trackSegmentContainer}>
                        <View style={[
                          styles.trackBar,
                          isOverdue ? { backgroundColor: "#f87171" } :
                          isActive ? { backgroundColor: "#6366f1" } : { backgroundColor: "rgba(255,255,255,0.05)" }
                        ]} />
                        <Text style={[
                          styles.trackLabel,
                          isOverdue ? { color: "#f87171" } :
                          isActive ? { color: "#818cf8" } : { color: "#4b5563" }
                        ]}>L{lvl}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Core Action Layout Controllers */}
            <View style={styles.actionsRow}>
              {timer.status !== "completed" && (
                <TouchableOpacity style={styles.btnSuccess} onPress={handleComplete} disabled={submitting}>
                  <Check size={14} color="#fff" style={{ marginRight: 4 }} />
                  <Text style={styles.btnTextContent}>Complete</Text>
                </TouchableOpacity>
              )}
              {timer.status !== "completed" && (
                <TouchableOpacity style={styles.btnWarningOutline} onPress={() => setSnoozeOpen(!snoozeOpen)} disabled={submitting}>
                  <Text style={styles.btnTextWarning}>Snooze</Text>
                </TouchableOpacity>
              )}
              {(isManager || isAdmin) && (
                <TouchableOpacity style={styles.btnSecondary} onPress={handleReset} disabled={submitting}>
                  <RotateCcw size={12} color="#c9d1d9" style={{ marginRight: 4 }} />
                  <Text style={styles.btnTextSecondary}>Reset</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Inline Toggleable Snooze Dialog Block */}
            {snoozeOpen && (
              <View style={styles.inlineFormContainer}>
                <Text style={styles.inlineFormLabel}>Snooze Duration</Text>
                <View style={styles.inlineGrid}>
                  {[5, 15, 30, 60].map((m) => (
                    <TouchableOpacity key={m} style={styles.gridBtn} onPress={() => handleSnooze(m)}>
                      <Text style={styles.gridBtnText}>{m}m</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.customMinutesWrapper}>
                  <TextInput
                    style={styles.customInput}
                    placeholder="Custom mins"
                    placeholderTextColor="#4b5563"
                    keyboardType="number-pad"
                    value={customMinutes}
                    onChangeText={setCustomMinutes}
                  />
                  <TouchableOpacity
                    style={[styles.customActionSetBtn, !customMinutes && { opacity: 0.5 }]}
                    disabled={!customMinutes || submitting}
                    onPress={() => handleSnooze(Number(customMinutes) || 15)}
                  >
                    <Text style={styles.customActionSetBtnText}>Set</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* AI Recommendation Engine Block */}
            {timer.status !== "completed" && (
              <View style={styles.aiCardWrapper}>
                <View style={styles.aiCardHeader}>
                  <Text style={styles.aiHeaderTitle}>
                    <Zap size={14} color="#818cf8" /> AI Recommendations
                  </Text>
                  {timer.aiSuggestions && (
                    <View style={styles.aiRiskBadge}>
                      <Text style={styles.aiRiskBadgeText}>Risk: {timer.aiSuggestions.riskScore}%</Text>
                    </View>
                  )}
                </View>

                {!timer.aiSuggestions ? (
                  <TouchableOpacity style={styles.aiActionTrigger} onPress={fetchSuggestions} disabled={aiLoading}>
                    {aiLoading ? <ActivityIndicator size="small" color="#fff" /> : (
                      <>
                        <TrendingUp size={14} color="#c9d1d9" style={{ marginRight: 6 }} />
                        <Text style={styles.aiActionTriggerText}>Generate Metrics</Text>
                      </>
                    )}
                  </TouchableOpacity>
                ) : (
                  <View style={styles.aiPayloadBody}>
                    <View style={styles.aiGridStats}>
                      <Text style={styles.aiStatText}>Interval: <Text style={{ color: "#fff" }}>{timer.aiSuggestions.suggestedInterval}m</Text></Text>
                      <Text style={styles.aiStatText}>Backup: <Text style={{ color: "#fff" }}>{timer.aiSuggestions.suggestedAssignee || "None"}</Text></Text>
                    </View>
                    <View style={styles.aiPromptQuoteBox}>
                      <Text style={styles.aiPromptQuoteLabel}>Suggested Next Action</Text>
                      <Text style={styles.aiPromptQuoteText}>{timer.aiSuggestions.recommendedNextAction}</Text>
                    </View>
                    {isManager && (
                      <TouchableOpacity style={styles.aiApplyBtn} onPress={handleApproveAI} disabled={aiLoading}>
                        <UserCheck size={14} color="#fff" style={{ marginRight: 6 }} />
                        <Text style={styles.aiApplyBtnText}>Apply Parameters</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* Audit Log Vertical Row Feeds */}
        {history.length > 0 && (
          <View style={styles.auditLogBlock}>
            <Text style={styles.boxLabel}>Follow-Up Audit Log</Text>
            <View style={styles.auditScrollBox}>
              {history.map((log, index) => (
                <View key={index} style={styles.auditItemRow}>
                  <Text style={styles.auditItemNotes} numberOfLines={2}>{log.notes}</Text>
                  <Text style={styles.auditItemTimestamp}>
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centeredContainer: {
    padding: 24,
    backgroundColor: "rgba(0,0,0,0.2)",
    borderWidth: 1,
    borderColor: "#30363d",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardContainer: {
    borderWidth: 1,
    borderColor: "#30363d",
    backgroundColor: "#0d1117",
    borderRadius: 14,
    overflow: "hidden",
    marginVertical: 10,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#161b22",
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: "#ffffff",
    letterSpacing: 1,
  },
  headerSubtitle: {
    fontSize: 10,
    color: "#8b949e",
    marginTop: 2,
  },
  slaBadge: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  slaBadgeText: {
    fontSize: 9,
    fontWeight: "bold",
  },
  cardContent: {
    padding: 16,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 12,
  },
  emptyHeading: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#c9d1d9",
    marginTop: 8,
  },
  emptyText: {
    fontSize: 11,
    color: "#8b949e",
    textAlign: "center",
    marginTop: 4,
    maxWidth: 240,
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 8,
  },
  quickTimerBtn: {
    backgroundColor: "#161b22",
    borderWidth: 1,
    borderColor: "#30363d",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  quickTimerBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#c9d1d9",
  },
  activeContainer: {
    flexDirection: "column",
    gap: 16,
  },
  countdownBox: {
    backgroundColor: "rgba(255,255,255,0.01)",
    borderWidth: 1,
    borderColor: "#161b22",
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  boxLabel: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#8b949e",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  countdownText: {
    fontSize: 22,
    fontWeight: "900",
    color: "#ffffff",
    ...Platform.select({ ios: { fontFamily: "Courier" }, android: { fontFamily: "monospace" } }),
  },
  boxSubInfoText: {
    fontSize: 10,
    color: "#34d399",
    marginTop: 2,
    fontWeight: "600",
  },
  boxSubInfoWarning: {
    fontSize: 10,
    color: "#fbbf24",
    marginTop: 2,
    fontWeight: "500",
  },
  statusIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    backgroundColor: "rgba(99, 102, 241, 0.1)",
    borderColor: "#6366f1",
    alignItems: "center",
    justifyContent: "center",
  },
  textError: { color: "#f87171" },
  textWarning: { color: "#fbbf24" },
  escalationSection: {
    flexDirection: "column",
  },
  progressTrackRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
    marginTop: 4,
  },
  trackSegmentContainer: {
    flex: 1,
    alignItems: "center",
  },
  trackBar: {
    width: "100%",
    height: 5,
    borderRadius: 4,
  },
  trackLabel: {
    fontSize: 9,
    fontWeight: "bold",
    marginTop: 4,
  },
  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  btnSuccess: {
    backgroundColor: "#238636",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnWarningOutline: {
    backgroundColor: "rgba(251, 191, 36, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.3)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnSecondary: {
    backgroundColor: "#21262d",
    borderWidth: 1,
    borderColor: "#30363d",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnTextContent: { color: "#ffffff", fontSize: 11, fontWeight: "bold" },
  btnTextWarning: { color: "#fbbf24", fontSize: 11, fontWeight: "bold" },
  btnTextSecondary: { color: "#c9d1d9", fontSize: 11, fontWeight: "bold" },
  inlineFormContainer: {
    backgroundColor: "rgba(0,0,0,0.3)",
    borderWidth: 1,
    borderColor: "#161b22",
    borderRadius: 12,
    padding: 12,
  },
  inlineFormLabel: { fontSize: 10, color: "#fbbf24", fontWeight: "bold", marginBottom: 8 },
  inlineGrid: { flexDirection: "row", gap: 6, marginBottom: 8 },
  gridBtn: { backgroundColor: "#161b22", flex: 1, paddingVertical: 6, alignItems: "center", borderRadius: 6 },
  gridBtnText: { color: "#c9d1d9", fontSize: 11, fontWeight: "600" },
  customMinutesWrapper: { flexDirection: "row", gap: 8, borderTopWidth: 1, borderTopColor: "#161b22", paddingTop: 8 },
  customInput: { flex: 1, backgroundColor: "#0d1117", borderWidth: 1, borderColor: "#30363d", color: "#fff", paddingHorizontal: 8, paddingVertical: 4, fontSize: 12, borderRadius: 6 },
  customActionSetBtn: { backgroundColor: "#fbbf24", paddingHorizontal: 12, justifyContent: "center", borderRadius: 6 },
  customActionSetBtnText: { color: "#0d1117", fontSize: 11, fontWeight: "bold" },
  aiCardWrapper: { borderWidth: 1, borderColor: "#161b22", borderRadius: 12, backgroundColor: "rgba(255,255,255,0.01)", overflow: "hidden" },
  aiCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 10, borderBottomWidth: 1, borderBottomColor: "#161b22" },
  aiHeaderTitle: { fontSize: 10, fontWeight: "bold", color: "#818cf8", flexDirection: "row", alignItems: "center" },
  aiRiskBadge: { backgroundColor: "rgba(248, 113, 113, 0.1)", borderWidth: 1, borderColor: "rgba(248, 113, 113, 0.3)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  aiRiskBadgeText: { color: "#f87171", fontSize: 9, fontWeight: "bold" },
  aiActionTrigger: { padding: 12, alignItems: "center", flexDirection: "row", justifyContent: "center" },
  aiActionTriggerText: { color: "#c9d1d9", fontSize: 11, fontWeight: "bold" },
  aiPayloadBody: { padding: 10, flexDirection: "column", gap: 8 },
  aiGridStats: { flexDirection: "row", gap: 16 },
  aiStatText: { fontSize: 10, color: "#8b949e" },
  aiPromptQuoteBox: { backgroundColor: "#0d1117", borderWidth: 1, borderColor: "#161b22", padding: 8, borderRadius: 6 },
  aiPromptQuoteLabel: { fontSize: 8, fontWeight: "bold", color: "#8b949e", textTransform: "uppercase" },
  aiPromptQuoteText: { color: "#c9d1d9", fontSize: 11, marginTop: 2, lineHeight: 14 },
  aiApplyBtn: { backgroundColor: "#6366f1", flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 8, borderRadius: 6 },
  aiApplyBtnText: { color: "#fff", fontSize: 11, fontWeight: "bold" },
  auditLogBlock: { borderTopWidth: 1, borderTopColor: "#161b22", paddingTop: 12 },
  auditScrollBox: { maxHeight: 100, flexDirection: "column", gap: 6 },
  auditItemRow: { flexDirection: "row", justifyContent: "space-between", gap: 8, paddingBottom: 4 },
  auditItemNotes: { fontSize: 11, color: "#8b949e", flex: 1 },
  auditItemTimestamp: { fontSize: 9, color: "#4b5563" },
});