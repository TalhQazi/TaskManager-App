import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
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
  Loader2,
} from "lucide-react-native";
import { useSocket } from "@/contexts/SocketContext";
import { ROLES, hasRole, ROLE_GROUPS } from "../constants/roles";

interface FollowUpControlCenterProps {
  taskId: string;
  currentRole?: string; // Optional: Pass role directly to compute access dynamically
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
  id: string;
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

// Access environment variables securely across native configurations
const API_BASE_URL = "https://task.se7eninc.com";

export default function FollowUpControlCenter({
  taskId,
  currentRole = "employee",
  isManager = false,
  isAdmin = false,
}: FollowUpControlCenterProps) {
  const { socket } = useSocket();
  const [timer, setTimer] = useState<FollowUpTimer | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const [customMinutes, setCustomMinutes] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  // Computed live states via role matrices
  const canReset = useMemo(() => {
    return isManager || isAdmin || hasRole(currentRole, ROLE_GROUPS.MANAGEMENT);
  }, [isManager, isAdmin, currentRole]);

  const canApplyAI = useMemo(() => {
    return isManager || hasRole(currentRole, [ROLES.SUPER_ADMIN, ROLES.MANAGER]);
  }, [isManager, currentRole]);

  // Time remaining tracking count mechanics
  const [remainingSecs, setRemainingSecs] = useState<number | null>(null);
  const intervalRef = useRef<any>(null);

  // Replaced localStorage with native identity token parsing placeholders 
  // (Switch this safely to SecureStore or your native State Management Engine if needed)
  const getAuthHeaders = () => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    // Implement token grab based on your native architecture choice:
    // const token = SecureStore.getItemSync("token");
    return headers;
  };

  const fetchFollowUps = async () => {
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`${API_BASE_URL}/api/tasks/${taskId}/followups`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          setTimer(data.items[0]);
        } else {
          setTimer(null);
        }
      }
    } catch (err) {
      console.error("Failed to load timers", err);
    }
  };

  const fetchHistory = async () => {
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`${API_BASE_URL}/api/tasks/${taskId}/followups/history`, { headers });
      if (res.ok) {
        const data = await res.json();
        setHistory(data.items || []);
      }
    } catch (err) {
      console.error("Failed to load audit history", err);
    }
  };

  const initData = async () => {
    setLoading(true);
    await Promise.all([fetchFollowUps(), fetchHistory()]);
    setLoading(false);
  };

  useEffect(() => {
    initData();
  }, [taskId]);

  // Socket.io event distribution loops
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = (payload: { taskId: string }) => {
      if (payload.taskId === taskId) {
        fetchFollowUps();
        fetchHistory();
      }
    };

    socket.on("followup-status", handleUpdate);
    socket.on("followup-escalation", handleUpdate);

    return () => {
      socket.off("followup-status", handleUpdate);
      socket.off("followup-escalation", handleUpdate);
    };
  }, [socket, taskId]);

  // Real-time delta engine layout computations
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    if (!timer || timer.status === "completed") {
      setRemainingSecs(null);
      return;
    }

    const targetTime =
      timer.status === "snoozed" && timer.snoozedUntil
        ? new Date(timer.snoozedUntil).getTime()
        : new Date(timer.dueAt).getTime();

    const updateClock = () => {
      const delta = Math.max(0, Math.floor((targetTime - Date.now()) / 1000));
      setRemainingSecs(delta);
      if (delta === 0 && timer.status === "active") {
        fetchFollowUps();
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

  // Network Mutation Action Handlers
  const handleCreateTimer = async (mins: number) => {
    setSubmitting(true);
    try {
      const dueAt = new Date(Date.now() + mins * 60 * 1000).toISOString();
      const res = await fetch(`${API_BASE_URL}/api/tasks/${taskId}/followups`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ dueAt }),
      });
      if (res.ok) await initData();
    } catch (err) {
      Alert.alert("Error", "Could not initialize timer.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = async () => {
    if (!timer) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/tasks/${taskId}/followups/${timer._id}/complete`, {
        method: "PATCH",
        headers: getAuthHeaders(),
      });
      if (res.ok) await initData();
    } catch (err) {
      Alert.alert("Error", "Could not update status flag.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSnooze = async (mins: number) => {
    if (!timer) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/tasks/${taskId}/followups/${timer._id}/snooze`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ minutes: mins }),
      });
      if (res.ok) {
        setSnoozeOpen(false);
        setCustomMinutes("");
        await initData();
      }
    } catch (err) {
      Alert.alert("Error", "Could not request state snooze adjustments.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = async () => {
    if (!timer) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/tasks/${taskId}/followups/${timer._id}/reset`, {
        method: "PATCH",
        headers: getAuthHeaders(),
      });
      if (res.ok) await initData();
    } catch (err) {
      Alert.alert("Error", "Reset action rejected by server routing.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveAI = async () => {
    if (!timer) return;
    setAiLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/tasks/${taskId}/followups/${timer._id}/ai-approve`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      if (res.ok) await initData();
    } catch {
      Alert.alert("Error", "AI configuration sync operation failed.");
    } finally {
      setAiLoading(false);
    }
  };

  const fetchSuggestions = async () => {
    if (!timer) return;
    setAiLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/tasks/${taskId}/followups/${timer._id}/ai-suggestions`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) await initData();
    } catch {
      Alert.alert("Error", "Could not retrieve analytical recommendations matrix.");
    } finally {
      setAiLoading(false);
    }
  };

  // Color & Badge style dynamic distribution objects
  const getRiskStyles = (score: number) => {
    if (score >= 70) return [styles.badgeRed, styles.textRed];
    if (score >= 35) return [styles.badgeAmber, styles.textAmber];
    return [styles.badgeEmerald, styles.textEmerald];
  };

  const getSlaBadgeStyles = (status: string) => {
    switch (status) {
      case "On Track":
      case "Resolved On Time":
        return [styles.badgeEmerald, styles.textEmerald];
      case "Warning":
        return [styles.badgeAmber, styles.textAmber];
      case "Breached":
      case "Resolved Late":
        return [styles.badgeRed, styles.textRed];
      default:
        return [styles.badgeGray, styles.textGray];
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingWrapper}>
        <ActivityIndicator size="small" color="#6366f1" />
      </View>
    );
  }

  return (
    <View style={styles.centerContainerCard}>
      {/* Header Deck View Component */}
      <View style={styles.cardHeaderRow}>
        <View>
          <View style={styles.headerTitleContainer}>
            <Clock size={16} color="#818cf8" />
            <Text style={styles.headerTitleMain}>FOLLOW-UP CENTER</Text>
          </View>
          <Text style={styles.headerSubTitle}>SLA COUNTDOWNS & ESCALATIONS</Text>
        </View>
        {timer && (
          <View style={[styles.baseBadge, getSlaBadgeStyles(timer.slaStatus)[0]]}>
            <Text style={[styles.badgeTextText, getSlaBadgeStyles(timer.slaStatus)[1]]}>
              SLA: {timer.slaStatus.toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      {/* Internal Content Base Area */}
      <View style={styles.cardMainContent}>
        {!timer ? (
          /* Initial Empty Initialization State Panel Container */
          <View style={styles.emptyPromptGroup}>
            <AlertCircle size={32} color="rgba(129, 140, 248, 0.4)" style={{ marginBottom: 12 }} />
            <Text style={styles.emptyStateHeading}>No Follow-up Scheduled</Text>
            <Text style={styles.emptyStateBody}>
              Set an independent follow-up timer for this task to enforce structured execution timelines.
            </Text>
            
            <View style={styles.buttonActionGrid}>
              <TouchableOpacity style={styles.presetGridButton} onPress={() => handleCreateTimer(15)} disabled={submitting}>
                <Text style={styles.presetGridButtonText}>15 Min</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.presetGridButton, styles.indigoBorderHighlight]} onPress={() => handleCreateTimer(30)} disabled={submitting}>
                <Text style={[styles.presetGridButtonText, { color: "#818cf8" }]}>30 Min</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.presetGridButton} onPress={() => handleCreateTimer(60)} disabled={submitting}>
                <Text style={styles.presetGridButtonText}>1 Hour</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* Active Counter Workflow Panels Matrix */
          <View style={{ gap: 20 }}>
            
            {/* Live Ticking Countdown Deck block */}
            <View style={styles.countdownDeckRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.countdownLabelMeta}>REMAINING TIMER</Text>
                <Text style={[
                  styles.countdownValueDisplayText,
                  timer.status === "overdue" && styles.textRed,
                  timer.status === "snoozed" && styles.textAmber
                ]}>
                  {timer.status === "completed" ? "COMPLETED" : countdownStr}
                </Text>
                {timer.completedAt && (
                  <Text style={styles.completedSubTimestamp}>
                    Done: {new Date(timer.completedAt).toLocaleTimeString()}
                  </Text>
                )}
                {timer.status === "snoozed" && timer.snoozedUntil && (
                  <Text style={styles.snoozedSubTimestamp}>
                    Snoozed until {new Date(timer.snoozedUntil).toLocaleTimeString()}
                  </Text>
                )}
              </View>

              <View style={[
                styles.statusOuterCircleIndicator,
                timer.status === "completed" && { borderColor: "#10b981", backgroundColor: "rgba(16, 185, 129, 0.1)" },
                timer.status === "overdue" && { borderColor: "#ef4444", backgroundColor: "rgba(239, 68, 68, 0.1)" },
                timer.status === "snoozed" && { borderColor: "#f59e0b", backgroundColor: "rgba(245, 158, 11, 0.1)" }
              ]}>
                {timer.status === "completed" ? <CheckCircle2 size={20} color="#10b981" /> :
                 timer.status === "overdue" ? <ShieldAlert size={20} color="#ef4444" /> :
                 timer.status === "snoozed" ? <AlertTriangle size={20} color="#f59e0b" /> :
                 <Clock size={20} color="#6366f1" />}
              </View>
            </View>

            {/* Escalation Structural Visual Step Pipeline Progression Matrix Track */}
            {timer.status !== "completed" && (
              <View style={{ gap: 8 }}>
                <Text style={styles.countdownLabelMeta}>ESCALATION STATE</Text>
                <View style={styles.escalationPipelineRowContainer}>
                  {[1, 2, 3, 4].map((lvl) => {
                    const isActive = timer.escalationLevel >= lvl;
                    const isOverdue = timer.status === "overdue" && timer.escalationLevel >= lvl;

                    return (
                      <View key={lvl} style={{ flex: 1, alignItems: "center" }}>
                        <View style={[
                          styles.escalationPipelinePillBarBase,
                          isActive && { backgroundColor: "#6366f1" },
                          isOverdue && { backgroundColor: "#ef4444" }
                        ]} />
                        <Text style={[
                          styles.escalationPipelineLevelPillLabel,
                          isActive && { color: "#818cf8" },
                          isOverdue && { color: "#f87171" }
                        ]}>
                          L{lvl}
                        </Text>
                      </View>
                    );
                  })}
                </View>
                <Text style={styles.escalationPipelineHintMetaText}>
                  {timer.escalationLevel === 1 && "Assigned user notified"}
                  {timer.escalationLevel === 2 && "Escalated: Backup user alerted"}
                  {timer.escalationLevel === 3 && "Escalated: Manager notified"}
                  {timer.escalationLevel === 4 && "Critical: Administrators notified"}
                </Text>
              </View>
            )}

            {/* Operations Action Core Triggers Deck Row */}
            <View style={styles.coreActionsLayoutRow}>
              {timer.status !== "completed" && (
                <TouchableOpacity style={styles.completeExecutionActionButton} onPress={handleComplete} disabled={submitting}>
                  <Check size={14} color="#ffffff" />
                  <Text style={styles.completeActionButtonText}>Complete</Text>
                </TouchableOpacity>
              )}
              {timer.status !== "completed" && (
                <TouchableOpacity style={styles.snoozeToggleActionButton} onPress={() => setSnoozeOpen(!snoozeOpen)} disabled={submitting}>
                  <Text style={styles.snoozeActionButtonText}>Snooze</Text>
                </TouchableOpacity>
              )}
              {canReset && (
                <TouchableOpacity style={styles.resetEngineActionButton} onPress={handleReset} disabled={submitting}>
                  <RotateCcw size={12} color="#d4d4d8" />
                  <Text style={styles.resetActionButtonText}>Reset</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Custom Dynamic Inline Area Snooze Field Block Panel Expansion */}
            {snoozeOpen && (
              <View style={styles.snoozeInlineExpandedConfigBlock}>
                <Text style={styles.snoozeInlineLabel}>SNOOZE DURATION</Text>
                <View style={styles.snoozeInlineGridPresetsRow}>
                  {[5, 15, 30, 60].map((m) => (
                    <TouchableOpacity key={m} style={styles.snoozePresetPillItem} onPress={() => handleSnooze(m)}>
                      <Text style={styles.snoozePresetPillItemText}>{m}m</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.snoozeCustomInputExecutionBar}>
                  <TextInput
                    style={styles.snoozeCustomTextInputNativeField}
                    placeholder="Custom mins"
                    placeholderTextColor="#52525b"
                    keyboardType="numeric"
                    value={customMinutes}
                    onChangeText={setCustomMinutes}
                  />
                  <TouchableOpacity 
                    style={styles.snoozeCustomSubmissionButton} 
                    onPress={() => handleSnooze(Number(customMinutes) || 15)}
                    disabled={submitting || !customMinutes}
                  >
                    <Text style={styles.snoozeCustomSubmissionButtonText}>Set</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Machine Learning Artificial Intelligence Prediction Recommendation Deck Panel */}
            {timer.status !== "completed" && (
              <View style={styles.aiRecommendationOuterCardDeck}>
                <View style={styles.aiRecommendationHeaderBarRow}>
                  <View style={styles.aiRecommendationIconRowTitleContainer}>
                    <Zap size={14} color="#818cf8" />
                    <Text style={styles.aiRecommendationHeaderTitleMain}>AI RECOMMENDATIONS</Text>
                  </View>
                  {timer.aiSuggestions && (
                    <View style={[styles.baseBadge, getRiskStyles(timer.aiSuggestions.riskScore)[0]]}>
                      <Text style={[styles.badgeTextText, getRiskStyles(timer.aiSuggestions.riskScore)[1]]}>
                        RISK SCORE: {timer.aiSuggestions.riskScore}%
                      </Text>
                    </View>
                  )}
                </View>

                {!timer.aiSuggestions ? (
                  <View style={styles.aiGenerationCallToActionTriggerCentering}>
                    <TouchableOpacity style={styles.aiGenerationTriggerButtonLayout} onPress={fetchSuggestions} disabled={aiLoading}>
                      {aiLoading ? (
                        <ActivityIndicator size="small" color="#d4d4d8" style={{ marginRight: 6 }} />
                      ) : (
                        <TrendingUp size={14} color="#d4d4d8" style={{ marginRight: 6 }} />
                      )}
                      <Text style={styles.aiGenerationTriggerButtonText}>Generate Recommendations</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={{ gap: 12 }}>
                    <View style={styles.aiSuggestionsMetricsSplitRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.aiSuggestionsMetricLabelHeaderText}>Suggested Follow-Up:</Text>
                        <Text style={styles.aiSuggestionsMetricHighlightedValueText}>
                          {timer.aiSuggestions.suggestedInterval} mins
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.aiSuggestionsMetricLabelHeaderText}>Backup Assignee:</Text>
                        <Text style={styles.aiSuggestionsMetricHighlightedValueText}>
                          {timer.aiSuggestions.suggestedAssignee || "None available"}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.aiSuggestionTextSummaryHighlightBlock}>
                      <Text style={styles.aiSuggestionSummaryLabelMetaText}>Suggested Next Action</Text>
                      <Text style={styles.aiSuggestionSummaryCoreParagraphDescriptionBody}>
                        {timer.aiSuggestions.recommendedNextAction}
                      </Text>
                    </View>

                    {canApplyAI && (
                      <TouchableOpacity style={styles.aiApplyParametersNativeActionButton} onPress={handleApproveAI} disabled={aiLoading}>
                        {aiLoading ? (
                          <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 6 }} />
                        ) : (
                          <UserCheck size={14} color="#ffffff" style={{ marginRight: 6 }} />
                        )}
                        <Text style={styles.aiApplyParametersButtonText}>Apply AI Parameters</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            )}

          </View>
        )}

        {/* Audit Log / Verification History Tracking Scroll Trail View */}
        {history.length > 0 && (
          <View style={styles.auditTrailContainerBoxSection}>
            <Text style={styles.countdownLabelMeta}>FOLLOW-UP AUDIT LOG</Text>
            <View style={styles.auditScrollViewWrapperBoxBorderBoundaryHeightMax}>
              <ScrollView data-custom-scrollbar nestedScrollEnabled style={{ flex: 1 }}>
                {history.map((log, index) => (
                  <View key={index} style={styles.auditTrailItemRowStripLogLine}>
                    <Text style={styles.auditTrailItemTextContentDescriptionNoteBody} numberOfLines={2}>
                      {log.notes}
                    </Text>
                    <Text style={styles.auditTrailItemTimestampLabelTextMonoMetric}>
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        )}

      </View>
    </View>
  );
}

// Stylesheet mapping layout rules
const styles = StyleSheet.create({
  loadingWrapper: {
    padding: 24,
    backgroundColor: "rgba(0,0,0,0.2)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  centerContainerCard: {
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "rgba(18, 18, 18, 0.95)",
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  cardHeaderRow: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerTitleMain: {
    fontSize: 13,
    fontWeight: "900",
    color: "#ffffff",
    letterSpacing: 0.5,
  },
  headerSubTitle: {
    fontSize: 10,
    color: "#a1a1aa",
    marginTop: 2,
    letterSpacing: 0.2,
  },
  baseBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 99,
    borderWidth: 1,
  },
  badgeTextText: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  badgeEmerald: { borderColor: "rgba(16, 185, 129, 0.3)", backgroundColor: "rgba(16, 185, 129, 0.05)" },
  textEmerald: { color: "#34d399" },
  badgeAmber: { borderColor: "rgba(245, 158, 11, 0.3)", backgroundColor: "rgba(245, 158, 11, 0.05)" },
  textAmber: { color: "#fbbf24" },
  badgeRed: { borderColor: "rgba(239, 68, 68, 0.3)", backgroundColor: "rgba(239, 68, 68, 0.05)" },
  textRed: { color: "#f87171" },
  badgeGray: { borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.05)" },
  textGray: { color: "#a1a1aa" },
  cardMainContent: {
    padding: 20,
  },
  emptyPromptGroup: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  emptyStateHeading: {
    fontSize: 12,
    fontWeight: "700",
    color: "#d4d4d8",
    textAlign: "center",
    letterSpacing: 0.2,
  },
  emptyStateBody: {
    fontSize: 11,
    color: "#71717a",
    textAlign: "center",
    maxWidth: 280,
    lineHeight: 16,
    marginTop: 4,
    marginBottom: 16,
  },
  buttonActionGrid: {
    flexDirection: "row",
    gap: 8,
    width: "100%",
  },
  presetGridButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#18181b",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 8,
    paddingVertical: 10,
  },
  indigoBorderHighlight: {
    borderColor: "rgba(99, 102, 241, 0.4)",
  },
  presetGridButtonText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#e4e4e7",
  },
  countdownDeckRow: {
    padding: 16,
    backgroundColor: "rgba(255, 255, 255, 0.01)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  countdownLabelMeta: {
    fontSize: 10,
    fontWeight: "700",
    color: "#a1a1aa",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  countdownValueDisplayText: {
    fontSize: 22,
    fontWeight: "900",
    color: "#ffffff",
    letterSpacing: -0.5,
    fontFamily: Platform.select({ ios: "Courier New", android: "monospace" }),
  },
  completedSubTimestamp: {
    fontSize: 10,
    color: "#34d399",
    fontWeight: "600",
    marginTop: 2,
  },
  snoozedSubTimestamp: {
    fontSize: 10,
    color: "rgba(251, 191, 36, 0.8)",
    fontWeight: "500",
    marginTop: 2,
  },
  statusOuterCircleIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#6366f1",
    backgroundColor: "rgba(99, 102, 241, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  escalationPipelineRowContainer: {
    flexDirection: "row",
    gap: 6,
    position: "relative",
  },
  escalationPipelinePillBarBase: {
    width: "100%",
    height: 6,
    borderRadius: 99,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  escalationPipelineLevelPillLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#3f3f46",
    marginTop: 4,
  },
  escalationPipelineHintMetaText: {
    fontSize: 9,
    color: "#71717a",
    textAlign: "center",
    lineHeight: 12,
    marginTop: 2,
  },
  coreActionsLayoutRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingTop: 4,
  },
  completeExecutionActionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#059669",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  completeActionButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 11,
  },
  snoozeToggleActionButton: {
    backgroundColor: "rgba(217, 119, 6, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(217, 119, 6, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: "center",
  },
  snoozeActionButtonText: {
    color: "#fcd34d",
    fontWeight: "700",
    fontSize: 11,
  },
  resetEngineActionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(63, 63, 70, 0.3)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  resetActionButtonText: {
    color: "#e4e4e7",
    fontWeight: "700",
    fontSize: 11,
  },
  snoozeInlineExpandedConfigBlock: {
    padding: 12,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    gap: 12,
  },
  snoozeInlineLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fbbf24",
    letterSpacing: 0.5,
  },
  snoozeInlineGridPresetsRow: {
    flexDirection: "row",
    gap: 6,
  },
  snoozePresetPillItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    paddingVertical: 8,
    borderRadius: 6,
  },
  snoozePresetPillItemText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#d4d4d8",
  },
  snoozeCustomInputExecutionBar: {
    flexDirection: "row",
    gap: 6,
    borderTopWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    paddingTop: 10,
  },
  snoozeCustomTextInputNativeField: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 6,
    paddingHorizontal: 10,
    height: 32,
    fontSize: 12,
    color: "#ffffff",
  },
  snoozeCustomSubmissionButton: {
    backgroundColor: "#d97706",
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    height: 32,
  },
  snoozeCustomSubmissionButtonText: {
    color: "#000000",
    fontWeight: "700",
    fontSize: 11,
  },
  aiRecommendationOuterCardDeck: {
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    backgroundColor: "rgba(255, 255, 255, 0.01)",
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  aiRecommendationHeaderBarRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    paddingBottom: 8,
  },
  aiRecommendationIconRowTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  aiRecommendationHeaderTitleMain: {
    fontSize: 10,
    fontWeight: "700",
    color: "#818cf8",
    letterSpacing: 0.5,
  },
  aiGenerationCallToActionTriggerCentering: {
    alignItems: "center",
    paddingVertical: 4,
  },
  aiGenerationTriggerButtonLayout: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111111",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  aiGenerationTriggerButtonText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#d4d4d8",
  },
  aiSuggestionsMetricsSplitRow: {
    flexDirection: "row",
    gap: 10,
  },
  aiSuggestionsMetricLabelHeaderText: {
    fontSize: 10,
    color: "#a1a1aa",
    lineHeight: 14,
  },
  aiSuggestionsMetricHighlightedValueText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#e4e4e7",
    marginTop: 2,
  },
  aiSuggestionTextSummaryHighlightBlock: {
    padding: 10,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    borderRadius: 8,
  },
  aiSuggestionSummaryLabelMetaText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#52525b",
    letterSpacing: 0.5,
  },
  aiSuggestionSummaryCoreParagraphDescriptionBody: {
    fontSize: 10,
    color: "#e4e4e7",
    lineHeight: 14,
    marginTop: 4,
    fontWeight: "500",
  },
  aiApplyParametersNativeActionButton: {
    width: "100%",
    backgroundColor: "#4f46e5",
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  aiApplyParametersButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 11,
  },
  auditTrailContainerBoxSection: {
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  auditScrollViewWrapperBoxBorderBoundaryHeightMax: {
    maxHeight: 96,
  },
  auditTrailItemRowStripLogLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    borderBottomWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.02)",
    paddingBottom: 6,
    marginBottom: 6,
  },
  auditTrailItemTextContentDescriptionNoteBody: {
    flex: 1,
    fontSize: 10,
    color: "#a1a1aa",
    lineHeight: 14,
    fontWeight: "500",
  },
  auditTrailItemTimestampLabelTextMonoMetric: {
    fontSize: 9,
    color: "#52525b",
    fontFamily: Platform.select({ ios: "Courier New", android: "monospace" }),
    alignSelf: "flex-start",
  },
});