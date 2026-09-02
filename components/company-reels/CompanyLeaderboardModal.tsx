import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
} from "react-native";
import {
  Trophy,
  Flame,
  Zap,
  Crown,
  Medal,
  Users,
  Building2,
  ChevronRight,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { apiRequest } from "@/services/api";

interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  role: string;
  department: string;
  profilePicture?: string;
  totalPoints: number;
  currentStreak: number;
  knowledgeScore: number;
  level: number;
  isCurrentUser: boolean;
}

interface CompanyLeaderboardModalProps {
  visible: boolean;
  onClose: () => void;
}

export const CompanyLeaderboardModal: React.FC<CompanyLeaderboardModalProps> = ({
  visible,
  onClose,
}) => {
  const [filter, setFilter] = useState<"all" | "department">("all");
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiRequest<LeaderboardEntry[]>(`/company-reels/leaderboard?filter=${filter}`);
      setLeaders(res.data || []);
    } catch (err) {
      console.error("[Leaderboard Modal] Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (visible) fetchLeaderboard();
  }, [visible, fetchLeaderboard]);

  if (!visible) return null;

  const top1 = leaders.find((l) => l.rank === 1);
  const top2 = leaders.find((l) => l.rank === 2);
  const top3 = leaders.find((l) => l.rank === 3);
  const others = leaders.filter((l) => l.rank > 3);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.titleWithIcon}>
              <Trophy size={20} color="#F59E0B" style={{ marginRight: 8 }} />
              <Text style={styles.headerTitle}>Team Leaderboard</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.closeBtn}
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Filter Segment */}
          <View style={styles.segmentWrap}>
            <TouchableOpacity
              style={[styles.segmentBtn, filter === "all" && styles.segmentBtnActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setFilter("all");
              }}
            >
              <Users size={14} color={filter === "all" ? "#38BDF8" : "#94A3B8"} style={{ marginRight: 6 }} />
              <Text style={[styles.segmentText, filter === "all" && styles.segmentTextActive]}>
                Company-Wide
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.segmentBtn, filter === "department" && styles.segmentBtnActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setFilter("department");
              }}
            >
              <Building2 size={14} color={filter === "department" ? "#38BDF8" : "#94A3B8"} style={{ marginRight: 6 }} />
              <Text style={[styles.segmentText, filter === "department" && styles.segmentTextActive]}>
                My Department
              </Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#F59E0B" style={{ marginVertical: 40 }} />
          ) : leaders.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>No leaderboard entries recorded yet.</Text>
            </View>
          ) : (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
              {/* Podium Section for Top 3 */}
              <View style={styles.podiumContainer}>
                {/* 2nd Place */}
                {top2 ? (
                  <View style={[styles.podiumCol, { marginTop: 24 }]}>
                    <View style={styles.podiumAvatarWrap}>
                      <View style={[styles.podiumAvatar, { borderColor: "#94A3B8" }]}>
                        <Text style={styles.podiumInitials}>
                          {top2.name.substring(0, 2).toUpperCase()}
                        </Text>
                      </View>
                      <View style={[styles.rankTagMini, { backgroundColor: "#94A3B8" }]}>
                        <Text style={styles.rankTagText}>2</Text>
                      </View>
                    </View>
                    <Text style={styles.podiumName} numberOfLines={1}>
                      {top2.name.split(" ")[0]}
                    </Text>
                    <Text style={styles.podiumScore}>{top2.totalPoints} XP</Text>
                    <View style={[styles.pedestal, styles.pedestalSilver]}>
                      <Medal size={18} color="#94A3B8" />
                    </View>
                  </View>
                ) : (
                  <View style={styles.podiumCol} />
                )}

                {/* 1st Place */}
                {top1 ? (
                  <View style={styles.podiumCol}>
                    <Crown size={22} color="#F59E0B" style={{ marginBottom: 4 }} />
                    <View style={styles.podiumAvatarWrap}>
                      <View style={[styles.podiumAvatar, { borderColor: "#F59E0B", width: 62, height: 62, borderRadius: 31 }]}>
                        <Text style={[styles.podiumInitials, { fontSize: 20 }]}>
                          {top1.name.substring(0, 2).toUpperCase()}
                        </Text>
                      </View>
                      <View style={[styles.rankTagMini, { backgroundColor: "#F59E0B" }]}>
                        <Text style={[styles.rankTagText, { color: "#0F172A" }]}>1</Text>
                      </View>
                    </View>
                    <Text style={[styles.podiumName, { fontWeight: "800", color: "#FFFFFF" }]} numberOfLines={1}>
                      {top1.name.split(" ")[0]}
                    </Text>
                    <Text style={[styles.podiumScore, { color: "#F59E0B", fontWeight: "800" }]}>
                      {top1.totalPoints} XP
                    </Text>
                    <View style={[styles.pedestal, styles.pedestalGold]}>
                      <Trophy size={20} color="#F59E0B" />
                    </View>
                  </View>
                ) : (
                  <View style={styles.podiumCol} />
                )}

                {/* 3rd Place */}
                {top3 ? (
                  <View style={[styles.podiumCol, { marginTop: 32 }]}>
                    <View style={styles.podiumAvatarWrap}>
                      <View style={[styles.podiumAvatar, { borderColor: "#D97706" }]}>
                        <Text style={styles.podiumInitials}>
                          {top3.name.substring(0, 2).toUpperCase()}
                        </Text>
                      </View>
                      <View style={[styles.rankTagMini, { backgroundColor: "#D97706" }]}>
                        <Text style={styles.rankTagText}>3</Text>
                      </View>
                    </View>
                    <Text style={styles.podiumName} numberOfLines={1}>
                      {top3.name.split(" ")[0]}
                    </Text>
                    <Text style={styles.podiumScore}>{top3.totalPoints} XP</Text>
                    <View style={[styles.pedestal, styles.pedestalBronze]}>
                      <Medal size={18} color="#D97706" />
                    </View>
                  </View>
                ) : (
                  <View style={styles.podiumCol} />
                )}
              </View>

              {/* Ranks 4+ List */}
              <View style={styles.listSection}>
                {others.map((item) => (
                  <View
                    key={item.userId}
                    style={[
                      styles.rankRowCard,
                      item.isCurrentUser && styles.rankRowCurrentUser,
                    ]}
                  >
                    <View style={styles.rankNumberPill}>
                      <Text style={styles.rankNumberText}>{item.rank}</Text>
                    </View>

                    <View style={styles.rowAvatar}>
                      <Text style={styles.rowAvatarText}>
                        {item.name.substring(0, 2).toUpperCase()}
                      </Text>
                    </View>

                    <View style={{ flex: 1, marginRight: 8 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text style={styles.rowName} numberOfLines={1}>
                          {item.name}
                        </Text>
                        {item.isCurrentUser && (
                          <View style={styles.youPill}>
                            <Text style={styles.youPillText}>YOU</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.rowMeta}>
                        {item.role} • {item.department}
                      </Text>
                    </View>

                    {item.currentStreak > 0 && (
                      <View style={styles.streakBadgeMini}>
                        <Flame size={12} color="#F97316" />
                        <Text style={styles.streakBadgeText}>{item.currentStreak}</Text>
                      </View>
                    )}

                    <View style={styles.pointsBadgeMini}>
                      <Zap size={12} color="#38BDF8" />
                      <Text style={styles.pointsBadgeText}>{item.totalPoints}</Text>
                    </View>
                  </View>
                ))}
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
    maxHeight: "90%",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
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
  segmentWrap: {
    flexDirection: "row",
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 3,
    marginBottom: 18,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 10,
  },
  segmentBtnActive: {
    backgroundColor: "rgba(56, 189, 248, 0.18)",
  },
  segmentText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600",
  },
  segmentTextActive: {
    color: "#38BDF8",
    fontWeight: "800",
  },
  emptyWrap: {
    padding: 30,
    alignItems: "center",
  },
  emptyText: {
    color: "#94A3B8",
    fontSize: 14,
  },
  podiumContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-end",
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  podiumCol: {
    flex: 1,
    alignItems: "center",
  },
  podiumAvatarWrap: {
    position: "relative",
    marginBottom: 6,
  },
  podiumAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
  },
  podiumInitials: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  rankTagMini: {
    position: "absolute",
    bottom: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
  },
  rankTagText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
  },
  podiumName: {
    color: "#CBD5E1",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 2,
  },
  podiumScore: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 8,
  },
  pedestal: {
    width: "85%",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  pedestalGold: {
    height: 70,
    backgroundColor: "rgba(245, 158, 11, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.4)",
  },
  pedestalSilver: {
    height: 52,
    backgroundColor: "rgba(148, 163, 184, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.4)",
  },
  pedestalBronze: {
    height: 40,
    backgroundColor: "rgba(217, 119, 6, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(217, 119, 6, 0.4)",
  },
  listSection: {
    gap: 8,
  },
  rankRowCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E293B",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  rankRowCurrentUser: {
    borderColor: "#38BDF8",
    backgroundColor: "rgba(56, 189, 248, 0.1)",
  },
  rankNumberPill: {
    width: 24,
    alignItems: "center",
    marginRight: 8,
  },
  rankNumberText: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "800",
  },
  rowAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  rowAvatarText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  rowName: {
    color: "#F8FAFC",
    fontSize: 13,
    fontWeight: "700",
  },
  rowMeta: {
    color: "#94A3B8",
    fontSize: 11,
  },
  youPill: {
    backgroundColor: "rgba(56, 189, 248, 0.2)",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  youPillText: {
    color: "#38BDF8",
    fontSize: 9,
    fontWeight: "800",
  },
  streakBadgeMini: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(249, 115, 22, 0.15)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 6,
  },
  streakBadgeText: {
    color: "#F97316",
    fontSize: 11,
    fontWeight: "800",
    marginLeft: 3,
  },
  pointsBadgeMini: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pointsBadgeText: {
    color: "#38BDF8",
    fontSize: 11,
    fontWeight: "800",
    marginLeft: 3,
  },
});
