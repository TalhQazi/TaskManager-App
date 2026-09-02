import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import {
  BookOpen,
  CheckCircle2,
  XCircle,
  Zap,
  HelpCircle,
  Play,
  RotateCcw,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { apiRequest } from "@/services/api";

interface MissedQuestion {
  _id: string;
  topic: string;
  question: string;
  answerOptions: { id: string; text: string }[];
  explanation: string;
  failedAt: string;
}

interface CompanyMissedQuestionsModalProps {
  visible: boolean;
  onClose: () => void;
  onReplayReel?: (reelId: string) => void;
}

export const CompanyMissedQuestionsModal: React.FC<CompanyMissedQuestionsModalProps> = ({
  visible,
  onClose,
  onReplayReel,
}) => {
  const [questions, setQuestions] = useState<MissedQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [retakeResults, setRetakeResults] = useState<{ [qId: string]: boolean }>({});
  const [submittingQId, setSubmittingQId] = useState<string | null>(null);

  const fetchMissed = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiRequest<MissedQuestion[]>("/company-reels/users/me/missed-questions");
      setQuestions(res.data || []);
    } catch (err) {
      console.error("[Missed Questions] Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      fetchMissed();
      setRetakeResults({});
    }
  }, [visible, fetchMissed]);

  const handleRetakeOption = async (questionId: string, optionId: string) => {
    if (submittingQId || retakeResults[questionId]) return;
    setSubmittingQId(questionId);

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const res = await apiRequest<{ correct: boolean }>(`/company-reels/quizzes/${questionId}/retake`, {
        method: "POST",
        body: JSON.stringify({ selectedAnswerId: optionId }),
      });

      const isCorrect = !!res.data?.correct;
      setRetakeResults((prev) => ({ ...prev, [questionId]: isCorrect }));

      if (isCorrect) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    } catch (err) {
      console.error("Retake error:", err);
    } finally {
      setSubmittingQId(null);
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
              <BookOpen size={20} color="#38BDF8" style={{ marginRight: 8 }} />
              <Text style={styles.headerTitle}>Knowledge Gap Review</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.closeBtn}
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.headerSub}>
            Questions missed during training. Retake them below to clear knowledge gaps and raise your score.
          </Text>

          {loading ? (
            <ActivityIndicator size="large" color="#38BDF8" style={{ marginVertical: 40 }} />
          ) : questions.length === 0 ? (
            <View style={styles.emptyWrap}>
              <CheckCircle2 size={42} color="#22C55E" style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>Zero Knowledge Gaps!</Text>
              <Text style={styles.emptyText}>
                You have passed all assigned quiz topics with full comprehension.
              </Text>
            </View>
          ) : (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
              <View style={{ gap: 14 }}>
                {questions.map((q, qIndex) => {
                  const isResolved = retakeResults[q._id] === true;
                  const isRetakeWrong = retakeResults[q._id] === false;

                  return (
                    <View
                      key={q._id || qIndex}
                      style={[
                        styles.questionCard,
                        isResolved && styles.questionCardResolved,
                      ]}
                    >
                      <View style={styles.cardTopRow}>
                        <View style={styles.topicBadge}>
                          <Text style={styles.topicBadgeText}>
                            {String(q.topic || "SOP").toUpperCase()}
                          </Text>
                        </View>
                        {isResolved ? (
                          <View style={styles.resolvedPill}>
                            <CheckCircle2 size={12} color="#22C55E" style={{ marginRight: 4 }} />
                            <Text style={styles.resolvedPillText}>RESOLVED (+25 XP)</Text>
                          </View>
                        ) : (
                          <View style={styles.needsReviewPill}>
                            <Text style={styles.needsReviewText}>NEEDS REVIEW</Text>
                          </View>
                        )}
                      </View>

                      <Text style={styles.qText}>{q.question}</Text>

                      {/* Interactive Options for Retake */}
                      <View style={styles.optionsList}>
                        {(q.answerOptions || []).map((opt, optIdx) => (
                          <TouchableOpacity
                            key={opt.id || optIdx}
                            disabled={isResolved || submittingQId === q._id}
                            style={[
                              styles.optBtn,
                              isResolved && { opacity: 0.7 },
                            ]}
                            onPress={() => handleRetakeOption(q._id, opt.id)}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.optLetter}>
                              {String.fromCharCode(65 + optIdx)}.
                            </Text>
                            <Text style={styles.optText}>{opt.text}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      {/* Explanation */}
                      {q.explanation ? (
                        <View style={styles.explanationBox}>
                          <Text style={styles.expTitle}>Standard Operating Procedure:</Text>
                          <Text style={styles.expBody}>{q.explanation}</Text>
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
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
    maxHeight: "88%",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
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
    marginBottom: 16,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeBtnText: {
    color: "#94A3B8",
    fontSize: 14,
    fontWeight: "bold",
  },
  emptyWrap: {
    padding: 30,
    alignItems: "center",
  },
  emptyTitle: {
    color: "#22C55E",
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 6,
  },
  emptyText: {
    color: "#94A3B8",
    fontSize: 13,
    textAlign: "center",
  },
  questionCard: {
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  questionCardResolved: {
    borderColor: "rgba(34, 197, 94, 0.4)",
    backgroundColor: "rgba(34, 197, 94, 0.06)",
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  topicBadge: {
    backgroundColor: "rgba(56, 189, 248, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  topicBadgeText: {
    color: "#38BDF8",
    fontSize: 11,
    fontWeight: "800",
  },
  resolvedPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(34, 197, 94, 0.2)",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  resolvedPillText: {
    color: "#22C55E",
    fontSize: 10,
    fontWeight: "800",
  },
  needsReviewPill: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  needsReviewText: {
    color: "#EF4444",
    fontSize: 10,
    fontWeight: "800",
  },
  qText: {
    color: "#F8FAFC",
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
    marginBottom: 12,
  },
  optionsList: {
    gap: 8,
    marginBottom: 12,
  },
  optBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  optLetter: {
    color: "#38BDF8",
    fontSize: 13,
    fontWeight: "800",
    marginRight: 8,
  },
  optText: {
    flex: 1,
    color: "#CBD5E1",
    fontSize: 13,
  },
  explanationBox: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: 10,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: "#38BDF8",
  },
  expTitle: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 2,
  },
  expBody: {
    color: "#CBD5E1",
    fontSize: 12,
    lineHeight: 16,
  },
});
