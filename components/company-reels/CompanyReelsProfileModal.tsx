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
  User,
  Flame,
  Zap,
  Award,
  Trophy,
  CheckCircle2,
  Lock,
  Calendar,
  Sparkles,
  ShieldCheck,
  Star,
  Crown,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { apiRequest } from "@/services/api";

interface BadgeItem {
  id: string;
  title: string;
  description: string;
  tier: "bronze" | "silver" | "gold" | "platinum";
  icon: string;
  isUnlocked: boolean;
  awardedAt?: string;
}

interface ProfileData {
  employee: {
    _id: string;
    name: string;
    role: string;
    department: string;
    profilePicture?: string;
  };
  progressionLevel: number;
  currentStreak: number;
  longestStreak: number;
  totalPoints: number;
  knowledgeScore: number;
  totalWatched: number;
  totalQuizzesPassed: number;
  badges: BadgeItem[];
  unlockedBadgesCount: number;
  totalBadgesCount: number;
  milestoneCelebration?: {
    type: string;
    title: string;
    message: string;
  };
}

interface CompanyReelsProfileModalProps {
  visible: boolean;
  onClose: () => void;
}

export const CompanyReelsProfileModal: React.FC<CompanyReelsProfileModalProps> = ({
  visible,
  onClose,
}) => {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiRequest<ProfileData>("/company-reels/profile");
      setProfile(res.data);
    } catch (err) {
      console.error("[Profile Modal] Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) fetchProfile();
  }, [visible, fetchProfile]);

  if (!visible) return null;

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "platinum":
        return "#E2E8F0";
      case "gold":
        return "#F59E0B";
      case "silver":
        return "#94A3B8";
      default:
        return "#D97706";
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.titleWithIcon}>
              <User size={20} color="#38BDF8" style={{ marginRight: 8 }} />
              <Text style={styles.headerTitle}>Workforce Profile</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.closeBtn}
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {loading || !profile ? (
            <ActivityIndicator size="large" color="#38BDF8" style={{ marginVertical: 40 }} />
          ) : (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
              {/* Personal Milestone Banner (Birthday or Work Anniversary) */}
              {profile.milestoneCelebration && (
                <View style={styles.milestoneCard}>
                  <Sparkles size={22} color="#F59E0B" style={{ marginRight: 10 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.milestoneTitle}>
                      {profile.milestoneCelebration.title}
                    </Text>
                    <Text style={styles.milestoneMsg}>
                      {profile.milestoneCelebration.message}
                    </Text>
                  </View>
                </View>
              )}

              {/* Employee Bio Card */}
              <View style={styles.bioCard}>
                <View style={styles.avatarWrap}>
                  {profile.employee.profilePicture ? (
                    <Image
                      source={{ uri: profile.employee.profilePicture }}
                      style={styles.avatarImg}
                    />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarInitials}>
                        {profile.employee.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .substring(0, 2)
                          .toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={styles.levelBadgeMini}>
                    <Text style={styles.levelBadgeText}>L{profile.progressionLevel}</Text>
                  </View>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.employeeName}>{profile.employee.name}</Text>
                  <Text style={styles.employeeRole}>
                    {profile.employee.role} • {profile.employee.department}
                  </Text>
                  <View style={styles.levelNamePill}>
                    <Award size={12} color="#F59E0B" style={{ marginRight: 4 }} />
                    <Text style={styles.levelNameText}>
                      Tier Level {profile.progressionLevel} Specialist
                    </Text>
                  </View>
                </View>
              </View>

              {/* Core Gamification Stats Grid */}
              <View style={styles.statsGrid}>
                {/* Streak Card */}
                <View style={styles.statBox}>
                  <Flame size={20} color="#F97316" />
                  <Text style={styles.statVal}>{profile.currentStreak} Days</Text>
                  <Text style={styles.statLabel}>CURRENT STREAK</Text>
                  <Text style={styles.statSub}>Best: {profile.longestStreak} days</Text>
                </View>

                {/* Points XP Card */}
                <View style={styles.statBox}>
                  <Zap size={20} color="#38BDF8" />
                  <Text style={styles.statVal}>{profile.totalPoints} XP</Text>
                  <Text style={styles.statLabel}>TOTAL POINTS</Text>
                  <Text style={styles.statSub}>Earned to date</Text>
                </View>

                {/* Knowledge Retention */}
                <View style={styles.statBox}>
                  <CheckCircle2 size={20} color="#22C55E" />
                  <Text style={styles.statVal}>{profile.knowledgeScore}%</Text>
                  <Text style={styles.statLabel}>KNOWLEDGE SCORE</Text>
                  <Text style={styles.statSub}>Passing accuracy</Text>
                </View>

                {/* Reels Watched */}
                <View style={styles.statBox}>
                  <Trophy size={20} color="#A78BFA" />
                  <Text style={styles.statVal}>{profile.totalWatched}</Text>
                  <Text style={styles.statLabel}>REELS COMPLETED</Text>
                  <Text style={styles.statSub}>{profile.totalQuizzesPassed} quizzes passed</Text>
                </View>
              </View>

              {/* Badges & Achievements Showcase */}
              <View style={styles.badgesHeaderRow}>
                <Text style={styles.sectionHeading}>Badges & Achievements</Text>
                <Text style={styles.badgesCountText}>
                  {profile.unlockedBadgesCount}/{profile.totalBadgesCount} Unlocked
                </Text>
              </View>

              <View style={styles.badgesGrid}>
                {profile.badges.map((b) => {
                  const color = getTierColor(b.tier);

                  return (
                    <View
                      key={b.id}
                      style={[
                        styles.badgeCard,
                        !b.isUnlocked && styles.badgeCardLocked,
                      ]}
                    >
                      <View
                        style={[
                          styles.badgeIconCircle,
                          b.isUnlocked
                            ? { backgroundColor: `${color}25`, borderColor: color }
                            : { backgroundColor: "rgba(255, 255, 255, 0.05)", borderColor: "transparent" },
                        ]}
                      >
                        {b.isUnlocked ? (
                          <Star size={20} color={color} />
                        ) : (
                          <Lock size={18} color="#64748B" />
                        )}
                      </View>

                      <Text
                        style={[
                          styles.badgeTitle,
                          !b.isUnlocked && { color: "#64748B" },
                        ]}
                        numberOfLines={1}
                      >
                        {b.title}
                      </Text>

                      <Text
                        style={[
                          styles.badgeDesc,
                          !b.isUnlocked && { color: "#475569" },
                        ]}
                        numberOfLines={2}
                      >
                        {b.description}
                      </Text>

                      {b.isUnlocked && b.awardedAt && (
                        <Text style={styles.badgeDate}>
                          Earned {new Date(b.awardedAt).toLocaleDateString()}
                        </Text>
                      )}
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
    maxHeight: "90%",
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
  milestoneCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.35)",
    marginBottom: 16,
  },
  milestoneTitle: {
    color: "#F59E0B",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 2,
  },
  milestoneMsg: {
    color: "#E2E8F0",
    fontSize: 12,
    lineHeight: 16,
  },
  bioCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    marginBottom: 16,
  },
  avatarWrap: {
    position: "relative",
    marginRight: 14,
  },
  avatarImg: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(56, 189, 248, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.4)",
  },
  avatarInitials: {
    color: "#38BDF8",
    fontSize: 20,
    fontWeight: "800",
  },
  levelBadgeMini: {
    position: "absolute",
    bottom: -4,
    right: -4,
    backgroundColor: "#F59E0B",
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderWidth: 1.5,
    borderColor: "#0F172A",
  },
  levelBadgeText: {
    color: "#0F172A",
    fontSize: 10,
    fontWeight: "900",
  },
  employeeName: {
    color: "#F8FAFC",
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 2,
  },
  employeeRole: {
    color: "#94A3B8",
    fontSize: 12,
    marginBottom: 6,
  },
  levelNamePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  levelNameText: {
    color: "#F59E0B",
    fontSize: 11,
    fontWeight: "700",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  statBox: {
    width: "48%",
    backgroundColor: "#1E293B",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  statVal: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 6,
    marginBottom: 2,
  },
  statLabel: {
    color: "#94A3B8",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  statSub: {
    color: "#64748B",
    fontSize: 11,
    marginTop: 2,
  },
  badgesHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionHeading: {
    color: "#F8FAFC",
    fontSize: 15,
    fontWeight: "700",
  },
  badgesCountText: {
    color: "#38BDF8",
    fontSize: 12,
    fontWeight: "700",
  },
  badgesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  badgeCard: {
    width: "48%",
    backgroundColor: "#1E293B",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  badgeCardLocked: {
    opacity: 0.5,
  },
  badgeIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    marginBottom: 8,
  },
  badgeTitle: {
    color: "#F8FAFC",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 2,
  },
  badgeDesc: {
    color: "#94A3B8",
    fontSize: 11,
    lineHeight: 14,
    marginBottom: 6,
  },
  badgeDate: {
    color: "#22C55E",
    fontSize: 10,
    fontWeight: "700",
  },
});
