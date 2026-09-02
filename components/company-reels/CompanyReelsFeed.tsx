import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Image,
  ViewToken,
} from "react-native";
import {
  Flame,
  Zap,
  RefreshCw,
  Sparkles,
  MapPin,
  Award,
  BookOpen,
  Play,
  User,
  Trophy,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { apiRequest } from "@/services/api";
import { CompanyReelItem, ReelData } from "./CompanyReelItem";
import { CompanyReelQuizCard, QuizQuestionData } from "./CompanyReelQuizCard";
import { CompanyReelRewardModal } from "./CompanyReelRewardModal";
import { CompanyTrainingPathsModal } from "./CompanyTrainingPathsModal";
import { CompanyCertificationsModal } from "./CompanyCertificationsModal";
import { CompanyMissedQuestionsModal } from "./CompanyMissedQuestionsModal";
import { CompanyReelsProfileModal } from "./CompanyReelsProfileModal";
import { CompanyLeaderboardModal } from "./CompanyLeaderboardModal";
import { CompanyBroadcastAlertModal } from "./CompanyBroadcastAlertModal";

interface FeedResponse {
  items: ReelData[];
  meta: {
    totalItems: number;
    uncompletedMandatoryCount: number;
    currentStreak: number;
    knowledgeScore: number;
    totalPoints: number;
    level: number;
  };
}

export const CompanyReelsFeed: React.FC = () => {
  const [feedTab, setFeedTab] = useState<"for_you" | "mandatory">("for_you");
  const [reels, setReels] = useState<ReelData[]>([]);
  const [meta, setMeta] = useState<{
    currentStreak: number;
    totalPoints: number;
    uncompletedMandatoryCount: number;
  }>({
    currentStreak: 0,
    totalPoints: 0,
    uncompletedMandatoryCount: 0,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [containerHeight, setContainerHeight] = useState(Dimensions.get("window").height);

  // Resume item from active training path
  const [continueData, setContinueData] = useState<{
    pathId: string;
    pathName: string;
    sequenceOrder: number;
    reel: any;
  } | null>(null);

  // Phase 2 Modals State
  const [pathsModalVisible, setPathsModalVisible] = useState(false);
  const [certsModalVisible, setCertsModalVisible] = useState(false);
  const [missedModalVisible, setMissedModalVisible] = useState(false);

  // Phase 3 Gamification Modals State
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [leaderboardModalVisible, setLeaderboardModalVisible] = useState(false);

  // Phase 4 Leadership Broadcast State
  const [activeBroadcast, setActiveBroadcast] = useState<any | null>(null);

  // Quiz & Reward Modal state
  const [activeQuiz, setActiveQuiz] = useState<{
    question: QuizQuestionData;
    sourceReelId: string;
  } | null>(null);

  const [rewardData, setRewardData] = useState<{
    visible: boolean;
    points: number;
    streak: number;
  }>({
    visible: false,
    points: 0,
    streak: 0,
  });

  const loadFeed = useCallback(async () => {
    try {
      if (feedTab === "mandatory") {
        const res = await apiRequest<{
          total: number;
          completed: number;
          pending: number;
          items: ReelData[];
        }>("/company-reels/mandatory");

        setReels(res.data?.items || []);
      } else {
        const [feedRes, continueRes, broadcastRes] = await Promise.allSettled([
          apiRequest<FeedResponse>("/company-reels/feed?limit=25"),
          apiRequest<any>("/company-reels/training-paths/continue"),
          apiRequest<any[]>("/company-reels/broadcasts/active"),
        ]);

        if (feedRes.status === "fulfilled" && feedRes.value.data) {
          const resData = feedRes.value.data;
          setReels(resData.items || []);
          if (resData.meta) {
            setMeta({
              currentStreak: resData.meta.currentStreak || 0,
              totalPoints: resData.meta.totalPoints || 0,
              uncompletedMandatoryCount: resData.meta.uncompletedMandatoryCount || 0,
            });
          }
        }

        if (continueRes.status === "fulfilled" && continueRes.value.data) {
          setContinueData(continueRes.value.data);
        }

        if (
          broadcastRes.status === "fulfilled" &&
          broadcastRes.value.data &&
          broadcastRes.value.data.length > 0
        ) {
          setActiveBroadcast(broadcastRes.value.data[0]);
        }
      }
    } catch (err) {
      console.error("[Company Reels Feed] Error fetching feed:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [feedTab]);

  useEffect(() => {
    setLoading(true);
    setActiveIndex(0);
    loadFeed();
  }, [loadFeed]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadFeed();
  };

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems && viewableItems.length > 0) {
        const nextIdx = viewableItems[0].index;
        if (typeof nextIdx === "number" && nextIdx !== activeIndex) {
          setActiveIndex(nextIdx);
        }
      }
    }
  ).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 65,
  }).current;

  const handleOpenQuiz = (quizData: any, reelId: string) => {
    if (!quizData) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActiveQuiz({
      question: quizData,
      sourceReelId: reelId,
    });
  };

  const handleQuizSuccess = (points: number, streak: number) => {
    setActiveQuiz(null);
    setMeta((prev) => ({
      ...prev,
      totalPoints: prev.totalPoints + points,
      currentStreak: streak,
    }));
    setRewardData({
      visible: true,
      points,
      streak,
    });
  };

  const handleReelCompleted = (reelId: string) => {
    setReels((prev) =>
      prev.map((r) => (r._id === reelId ? { ...r, isCompleted: true } : r))
    );
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <View
      style={styles.container}
      onLayout={(e) => {
        const { height } = e.nativeEvent.layout;
        if (height > 0) setContainerHeight(height);
      }}
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Top Floating Glass Header */}
      <SafeAreaView style={styles.headerSafeArea}>
        <View style={styles.headerRow}>
          {/* Logo / Title */}
          <View style={styles.brandContainer}>
            <Image
              source={require("@/assets/images/company_reels_logo.png")}
              style={styles.brandLogo}
              resizeMode="contain"
            />
          </View>

          {/* Feed Filter Segmented Tabs */}
          <View style={styles.segmentedControl}>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setFeedTab("for_you");
              }}
              style={[
                styles.tabBtn,
                feedTab === "for_you" && styles.tabBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  feedTab === "for_you" && styles.tabBtnTextActive,
                ]}
              >
                For You
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setFeedTab("mandatory");
              }}
              style={[
                styles.tabBtn,
                feedTab === "mandatory" && styles.tabBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  feedTab === "mandatory" && styles.tabBtnTextActive,
                ]}
              >
                Mandatory
              </Text>
              {meta.uncompletedMandatoryCount > 0 && (
                <View style={styles.alertDot} />
              )}
            </TouchableOpacity>
          </View>

          {/* Quick Access Icons for Paths, Certs, Gaps, Leaderboard, and Profile */}
          <View style={styles.navIconsRow}>
            <TouchableOpacity
              style={styles.navIconBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setPathsModalVisible(true);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MapPin size={16} color="#38BDF8" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navIconBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setCertsModalVisible(true);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Award size={16} color="#F59E0B" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navIconBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setLeaderboardModalVisible(true);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Trophy size={16} color="#EAB308" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navIconBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setProfileModalVisible(true);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <User size={16} color="#22C55E" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Gamification Pills Bar */}
        <View style={styles.gamificationBar}>
          <TouchableOpacity
            style={styles.streakPill}
            activeOpacity={0.8}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setProfileModalVisible(true);
            }}
          >
            <Flame size={13} color="#F97316" />
            <Text style={styles.streakPillText}>{meta.currentStreak} Day Streak</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.pointsPill}
            activeOpacity={0.8}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setLeaderboardModalVisible(true);
            }}
          >
            <Zap size={13} color="#38BDF8" />
            <Text style={styles.pointsPillText}>{meta.totalPoints} XP</Text>
          </TouchableOpacity>
        </View>

        {/* Floating "Continue Where You Left Off" Banner */}
        {continueData && continueData.reel && (
          <TouchableOpacity
            style={styles.continueBanner}
            activeOpacity={0.85}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setPathsModalVisible(true);
            }}
          >
            <View style={styles.playMiniCircle}>
              <Play size={10} color="#FFFFFF" fill="#FFFFFF" />
            </View>
            <Text style={styles.continueBannerText} numberOfLines={1}>
              Resume: {continueData.pathName} (Step {continueData.sequenceOrder})
            </Text>
          </TouchableOpacity>
        )}
      </SafeAreaView>

      {/* Vertical Video Feed */}
      {loading && reels.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#38BDF8" />
          <Text style={styles.loadingText}>Loading personalized training feed...</Text>
        </View>
      ) : reels.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Sparkles size={40} color="#64748B" style={{ marginBottom: 12 }} />
          <Text style={styles.emptyTitle}>You're all caught up!</Text>
          <Text style={styles.emptySubtitle}>
            {feedTab === "mandatory"
              ? "All required compliance courses completed on schedule."
              : "Check back later for new company reels and leadership updates."}
          </Text>
          <TouchableOpacity style={styles.refreshBtn} onPress={handleRefresh}>
            <RefreshCw size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.refreshBtnText}>Check for Updates</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={reels}
          keyExtractor={(item) => item._id}
          renderItem={({ item, index }) => (
            <CompanyReelItem
              item={item}
              isActive={index === activeIndex}
              itemHeight={containerHeight}
              onOpenQuiz={handleOpenQuiz}
              onReelCompleted={handleReelCompleted}
            />
          )}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          getItemLayout={(_, index) => ({
            length: containerHeight,
            offset: containerHeight * index,
            index,
          })}
          decelerationRate="fast"
          snapToInterval={containerHeight}
          snapToAlignment="start"
          windowSize={3}
          maxToRenderPerBatch={2}
          removeClippedSubviews
        />
      )}

      {/* Micro-Quiz Interactive Modal */}
      {activeQuiz && (
        <CompanyReelQuizCard
          visible={!!activeQuiz}
          question={activeQuiz.question}
          sourceReelId={activeQuiz.sourceReelId}
          onClose={() => setActiveQuiz(null)}
          onSuccess={handleQuizSuccess}
        />
      )}

      {/* Reward & Milestone Modal */}
      <CompanyReelRewardModal
        visible={rewardData.visible}
        points={rewardData.points}
        streak={rewardData.streak}
        onClose={() => setRewardData((prev) => ({ ...prev, visible: false }))}
      />

      {/* Phase 2: Curriculum Tracks Modal */}
      <CompanyTrainingPathsModal
        visible={pathsModalVisible}
        onClose={() => setPathsModalVisible(false)}
      />

      {/* Phase 2: Certifications & Progression Ladder Modal */}
      <CompanyCertificationsModal
        visible={certsModalVisible}
        onClose={() => setCertsModalVisible(false)}
      />

      {/* Phase 2: Knowledge Gap Review Modal */}
      <CompanyMissedQuestionsModal
        visible={missedModalVisible}
        onClose={() => setMissedModalVisible(false)}
      />

      {/* Phase 3: Employee Gamification Profile Modal */}
      <CompanyReelsProfileModal
        visible={profileModalVisible}
        onClose={() => setProfileModalVisible(false)}
      />

      {/* Phase 3: Team Leaderboard Modal */}
      <CompanyLeaderboardModal
        visible={leaderboardModalVisible}
        onClose={() => setLeaderboardModalVisible(false)}
      />

      {/* Phase 4: Executive Priority Broadcast Alert Modal */}
      <CompanyBroadcastAlertModal
        visible={!!activeBroadcast}
        broadcast={activeBroadcast}
        onAcknowledged={(broadcastId) => {
          setActiveBroadcast(null);
          loadFeed();
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  headerSafeArea: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
  },
  brandContainer: {
    height: 36,
    width: 90,
    justifyContent: "center",
  },
  brandLogo: {
    width: "100%",
    height: "100%",
  },
  segmentedControl: {
    flexDirection: "row",
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    borderRadius: 20,
    padding: 3,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  tabBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  tabBtnActive: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  tabBtnText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600",
  },
  tabBtnTextActive: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  alertDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#EF4444",
    marginLeft: 4,
  },
  navIconsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  navIconBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  gamificationBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginTop: 2,
    gap: 8,
  },
  streakPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(249, 115, 22, 0.35)",
  },
  streakPillText: {
    color: "#F97316",
    fontSize: 11,
    fontWeight: "800",
    marginLeft: 5,
  },
  pointsPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.35)",
  },
  pointsPillText: {
    color: "#38BDF8",
    fontSize: 11,
    fontWeight: "800",
    marginLeft: 5,
  },
  continueBanner: {
    marginHorizontal: 16,
    marginTop: 6,
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.35)",
  },
  playMiniCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#0284C7",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  continueBannerText: {
    color: "#E2E8F0",
    fontSize: 12,
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#94A3B8",
    fontSize: 13,
    marginTop: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyTitle: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
  },
  emptySubtitle: {
    color: "#94A3B8",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
  },
  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563EB",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  refreshBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});
