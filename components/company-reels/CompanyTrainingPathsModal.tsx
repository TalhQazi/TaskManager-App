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
  MapPin,
  CheckCircle2,
  Lock,
  Play,
  HelpCircle,
  Clock,
  ChevronRight,
  Sparkles,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { apiRequest } from "@/services/api";

interface TrainingPathItem {
  reelId: {
    _id: string;
    title: string;
    duration: number;
    category: string;
  };
  requiredQuizId?: {
    _id: string;
    topic: string;
    question: string;
  };
  sequenceOrder: number;
  isCompleted: boolean;
}

interface TrainingPath {
  _id: string;
  name: string;
  description: string;
  type: string;
  required: boolean;
  totalItems: number;
  completedItems: number;
  progressPercent: number;
  isCompleted: boolean;
  items: TrainingPathItem[];
}

interface CompanyTrainingPathsModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectReel?: (reelId: string) => void;
}

export const CompanyTrainingPathsModal: React.FC<CompanyTrainingPathsModalProps> = ({
  visible,
  onClose,
  onSelectReel,
}) => {
  const [paths, setPaths] = useState<TrainingPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);

  const fetchPaths = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiRequest<TrainingPath[]>("/company-reels/training-paths");
      const list = res.data || [];
      setPaths(list);
      if (list.length > 0 && !selectedPathId) {
        setSelectedPathId(list[0]._id);
      }
    } catch (err) {
      console.error("[Training Paths] Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedPathId]);

  useEffect(() => {
    if (visible) {
      fetchPaths();
    }
  }, [visible, fetchPaths]);

  if (!visible) return null;

  const activePath = paths.find((p) => p._id === selectedPathId) || paths[0];

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.titleWithIcon}>
              <MapPin size={20} color="#38BDF8" style={{ marginRight: 8 }} />
              <Text style={styles.headerTitle}>Curriculum Tracks</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.closeBtn}
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#38BDF8" style={{ marginVertical: 40 }} />
          ) : paths.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>No training paths assigned to your role.</Text>
            </View>
          ) : (
            <>
              {/* Path Tabs Selector */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pathSelectorScroll}>
                {paths.map((p) => {
                  const isSelected = p._id === selectedPathId;
                  return (
                    <TouchableOpacity
                      key={p._id}
                      style={[styles.pathTab, isSelected && styles.pathTabActive]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setSelectedPathId(p._id);
                      }}
                    >
                      <Text style={[styles.pathTabText, isSelected && styles.pathTabTextActive]}>
                        {p.name.split("(")[0].trim()}
                      </Text>
                      {p.isCompleted ? (
                        <CheckCircle2 size={13} color="#22C55E" style={{ marginLeft: 6 }} />
                      ) : (
                        <Text style={styles.pathTabPercent}>{p.progressPercent}%</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Selected Path Details & Steps */}
              {activePath && (
                <ScrollView style={styles.pathContent} contentContainerStyle={{ paddingBottom: 40 }}>
                  {/* Path Info Banner */}
                  <View style={styles.pathBannerCard}>
                    <Text style={styles.pathBannerTitle}>{activePath.name}</Text>
                    <Text style={styles.pathBannerDesc}>{activePath.description}</Text>

                    {/* Progress Bar */}
                    <View style={styles.progressRow}>
                      <View style={styles.progressBarTrack}>
                        <View
                          style={[
                            styles.progressBarFill,
                            { width: `${activePath.progressPercent}%` },
                          ]}
                        />
                      </View>
                      <Text style={styles.progressCountText}>
                        {activePath.completedItems}/{activePath.totalItems} Steps
                      </Text>
                    </View>
                  </View>

                  {/* Step-by-Step Sequence Nodes */}
                  <Text style={styles.stepsHeading}>Training Steps</Text>
                  <View style={styles.stepNodesList}>
                    {(activePath.items || []).map((item, index) => {
                      const reel = item.reelId;
                      const isCompleted = item.isCompleted;
                      const isLocked = index > 0 && !activePath.items[index - 1].isCompleted;

                      return (
                        <TouchableOpacity
                          key={index}
                          disabled={isLocked}
                          activeOpacity={0.8}
                          onPress={() => {
                            if (reel?._id && onSelectReel) {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                              onClose();
                              onSelectReel(reel._id);
                            }
                          }}
                          style={[
                            styles.stepCard,
                            isCompleted && styles.stepCardCompleted,
                            isLocked && styles.stepCardLocked,
                          ]}
                        >
                          <View style={styles.stepNumberCircle}>
                            {isCompleted ? (
                              <CheckCircle2 size={18} color="#22C55E" />
                            ) : isLocked ? (
                              <Lock size={16} color="#64748B" />
                            ) : (
                              <Text style={styles.stepNumberText}>{index + 1}</Text>
                            )}
                          </View>

                          <View style={{ flex: 1, marginRight: 8 }}>
                            <Text
                              style={[
                                styles.stepTitle,
                                isLocked && { color: "#64748B" },
                              ]}
                              numberOfLines={1}
                            >
                              {reel?.title || "Training Reel"}
                            </Text>
                            <View style={styles.stepMetaRow}>
                              <Clock size={12} color="#94A3B8" />
                              <Text style={styles.stepMetaText}>{reel?.duration || 20}s</Text>
                              {item.requiredQuizId && (
                                <>
                                  <Text style={styles.stepDot}>•</Text>
                                  <HelpCircle size={12} color="#F59E0B" />
                                  <Text style={[styles.stepMetaText, { color: "#F59E0B" }]}>
                                    Quiz Gate
                                  </Text>
                                </>
                              )}
                            </View>
                          </View>

                          {!isLocked && (
                            <View style={styles.playArrowPill}>
                              <Play size={14} color="#38BDF8" fill="#38BDF8" />
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              )}
            </>
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
    marginBottom: 16,
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
  emptyText: {
    color: "#94A3B8",
    fontSize: 14,
  },
  pathSelectorScroll: {
    marginBottom: 14,
  },
  pathTab: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E293B",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "transparent",
  },
  pathTabActive: {
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    borderColor: "#38BDF8",
  },
  pathTabText: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "600",
  },
  pathTabTextActive: {
    color: "#38BDF8",
    fontWeight: "800",
  },
  pathTabPercent: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 6,
  },
  pathContent: {
    flex: 1,
  },
  pathBannerCard: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  pathBannerTitle: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 4,
  },
  pathBannerDesc: {
    color: "#94A3B8",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  progressBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#22C55E",
    borderRadius: 4,
  },
  progressCountText: {
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "700",
  },
  stepsHeading: {
    color: "#F8FAFC",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 10,
  },
  stepNodesList: {
    gap: 10,
  },
  stepCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E293B",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  stepCardCompleted: {
    backgroundColor: "rgba(34, 197, 94, 0.08)",
    borderColor: "rgba(34, 197, 94, 0.25)",
  },
  stepCardLocked: {
    opacity: 0.5,
  },
  stepNumberCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  stepNumberText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  stepTitle: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 3,
  },
  stepMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  stepMetaText: {
    color: "#94A3B8",
    fontSize: 12,
  },
  stepDot: {
    color: "#64748B",
    fontSize: 12,
  },
  playArrowPill: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
});
