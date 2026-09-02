import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from "react-native";
import { CheckCircle2, XCircle, Zap, RefreshCw, ChevronRight, HelpCircle } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { apiRequest } from "@/services/api";

export interface AnswerOption {
  id: string;
  text: string;
}

export interface QuizQuestionData {
  _id: string;
  topic: string;
  question: string;
  answerOptions: AnswerOption[];
  difficulty?: string;
  explanation?: string;
}

interface CompanyReelQuizCardProps {
  visible: boolean;
  question: QuizQuestionData;
  sourceReelId?: string;
  onClose: () => void;
  onSuccess?: (pointsAwarded: number, streak: number) => void;
  onReplayReel?: () => void;
}

export const CompanyReelQuizCard: React.FC<CompanyReelQuizCardProps> = ({
  visible,
  question,
  sourceReelId,
  onClose,
  onSuccess,
  onReplayReel,
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    correct: boolean;
    explanation: string;
    pointsAwarded: number;
    currentStreak: number;
  } | null>(null);

  if (!question || !visible) return null;

  const handleSelectOption = async (optionId: string) => {
    if (submitting || result) return;
    setSelectedId(optionId);
    setSubmitting(true);

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const res = await apiRequest<{
        correct: boolean;
        explanation: string;
        pointsAwarded: number;
        currentStreak: number;
      }>(`/company-reels/quizzes/${question._id}/answer`, {
        method: "POST",
        body: JSON.stringify({
          selectedAnswerId: optionId,
          sourceReelId,
          responseTimeMs: 2500,
        }),
      });

      const outcome = res.data;
      setResult(outcome);

      if (outcome?.correct) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (onSuccess) {
          onSuccess(outcome.pointsAwarded || 25, outcome.currentStreak || 1);
        }
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    } catch (err) {
      console.error("[Quiz] Evaluation failed:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setSelectedId(null);
    setResult(null);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.sheetCard}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.topicBadge}>
              <HelpCircle size={14} color="#38BDF8" style={{ marginRight: 6 }} />
              <Text style={styles.topicBadgeText}>
                {String(question.topic || "KNOWLEDGE CHECK").toUpperCase()}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleReset}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Question Prompt */}
          <Text style={styles.questionText}>{question.question}</Text>

          {/* Answer Options */}
          <View style={styles.optionsList}>
            {(question.answerOptions || []).map((opt, index) => {
              const isSelected = selectedId === opt.id;
              const isCorrectOpt = result && isSelected && result.correct;
              const isWrongOpt = result && isSelected && !result.correct;

              let cardBg = "rgba(255, 255, 255, 0.08)";
              let borderColor = "rgba(255, 255, 255, 0.15)";
              if (isCorrectOpt) {
                cardBg = "rgba(34, 197, 94, 0.25)";
                borderColor = "#22C55E";
              } else if (isWrongOpt) {
                cardBg = "rgba(239, 68, 68, 0.25)";
                borderColor = "#EF4444";
              } else if (isSelected) {
                cardBg = "rgba(56, 189, 248, 0.25)";
                borderColor = "#38BDF8";
              }

              return (
                <TouchableOpacity
                  key={opt.id || index}
                  disabled={submitting || result !== null}
                  onPress={() => handleSelectOption(opt.id)}
                  style={[styles.optionCard, { backgroundColor: cardBg, borderColor }]}
                  activeOpacity={0.8}
                >
                  <View style={styles.optionIndexCircle}>
                    <Text style={styles.optionIndexText}>
                      {String.fromCharCode(65 + index)}
                    </Text>
                  </View>
                  <Text style={styles.optionLabel}>{opt.text}</Text>

                  {isCorrectOpt && <CheckCircle2 size={20} color="#22C55E" />}
                  {isWrongOpt && <XCircle size={20} color="#EF4444" />}
                </TouchableOpacity>
              );
            })}
          </View>

          {submitting && (
            <View style={styles.loaderContainer}>
              <ActivityIndicator color="#38BDF8" size="small" />
              <Text style={styles.loaderText}>Verifying answer with server...</Text>
            </View>
          )}

          {/* Outcome & Explanation */}
          {result && (
            <View
              style={[
                styles.resultCard,
                result.correct ? styles.resultSuccessCard : styles.resultErrorCard,
              ]}
            >
              <View style={styles.resultTitleRow}>
                {result.correct ? (
                  <>
                    <Zap size={20} color="#22C55E" style={{ marginRight: 6 }} />
                    <Text style={styles.resultSuccessTitle}>
                      Correct! +{result.pointsAwarded || 25} XP
                    </Text>
                  </>
                ) : (
                  <>
                    <XCircle size={20} color="#EF4444" style={{ marginRight: 6 }} />
                    <Text style={styles.resultErrorTitle}>Standard Review Needed</Text>
                  </>
                )}
              </View>

              <Text style={styles.explanationText}>{result.explanation}</Text>

              <View style={styles.resultActionsRow}>
                {!result.correct && onReplayReel && (
                  <TouchableOpacity
                    style={styles.replayButton}
                    onPress={() => {
                      handleReset();
                      onReplayReel();
                    }}
                  >
                    <RefreshCw size={15} color="#CBD5E1" style={{ marginRight: 6 }} />
                    <Text style={styles.replayButtonText}>Replay Reel</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[
                    styles.continueButton,
                    result.correct ? styles.continueSuccessButton : styles.continueDefaultButton,
                  ]}
                  onPress={handleReset}
                >
                  <Text style={styles.continueButtonText}>
                    {result.correct ? "Continue" : "Got It"}
                  </Text>
                  <ChevronRight size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
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
  sheetCard: {
    backgroundColor: "#0F172A",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    maxHeight: "85%",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  topicBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(56, 189, 248, 0.12)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  topicBadgeText: {
    color: "#38BDF8",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    color: "#94A3B8",
    fontSize: 14,
    fontWeight: "bold",
  },
  questionText: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 24,
    marginBottom: 18,
  },
  optionsList: {
    gap: 10,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  optionIndexCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  optionIndexText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  optionLabel: {
    flex: 1,
    color: "#F1F5F9",
    fontSize: 15,
    fontWeight: "500",
    lineHeight: 20,
    marginRight: 8,
  },
  loaderContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    gap: 8,
  },
  loaderText: {
    color: "#94A3B8",
    fontSize: 13,
  },
  resultCard: {
    marginTop: 18,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
  },
  resultSuccessCard: {
    backgroundColor: "rgba(34, 197, 94, 0.12)",
    borderColor: "rgba(34, 197, 94, 0.3)",
  },
  resultErrorCard: {
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  resultTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  resultSuccessTitle: {
    color: "#22C55E",
    fontSize: 16,
    fontWeight: "700",
  },
  resultErrorTitle: {
    color: "#EF4444",
    fontSize: 16,
    fontWeight: "700",
  },
  explanationText: {
    color: "#CBD5E1",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  resultActionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 10,
  },
  replayButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  replayButtonText: {
    color: "#CBD5E1",
    fontSize: 14,
    fontWeight: "600",
  },
  continueButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  continueSuccessButton: {
    backgroundColor: "#16A34A",
  },
  continueDefaultButton: {
    backgroundColor: "#334155",
  },
  continueButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    marginRight: 4,
  },
});
