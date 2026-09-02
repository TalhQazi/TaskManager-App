import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Animated,
  Platform,
} from "react-native";
import { Video, ResizeMode, AVPlaybackStatus } from "expo-av";
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  HelpCircle,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Heart,
  RotateCcw,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { apiRequest } from "@/services/api";
import { toProxiedUrl } from "@/util/toProxiedUrl";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export interface ReelData {
  _id: string;
  title: string;
  description?: string;
  duration?: number;
  mediaUrl: string;
  thumbnailUrl?: string;
  category: string;
  isMandatory?: boolean;
  dueDate?: string;
  priority?: string;
  feedItemType?: string;
  badgeType?: string;
  isCompleted?: boolean;
  quizId?: any;
}

interface CompanyReelItemProps {
  item: ReelData;
  isActive: boolean;
  itemHeight?: number;
  onOpenQuiz?: (quiz: any, reelId: string) => void;
  onReelCompleted?: (reelId: string) => void;
}

export const CompanyReelItem: React.FC<CompanyReelItemProps> = ({
  item,
  isActive,
  itemHeight = SCREEN_HEIGHT,
  onOpenQuiz,
  onReelCompleted,
}) => {
  const videoRef = useRef<Video | null>(null);

  const [isMuted, setIsMuted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [showFullDesc, setShowFullDesc] = useState(false);

  // Playback tracking
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [hasSentCompletion, setHasSentCompletion] = useState(!!item.isCompleted);

  // Animation for play/pause indicator
  const pauseIconOpacity = useRef(new Animated.Value(0)).current;

  const videoUri = toProxiedUrl(item.mediaUrl) || item.mediaUrl;

  useEffect(() => {
    if (!isActive) {
      if (videoRef.current) {
        videoRef.current.pauseAsync().catch(() => {});
      }
      setIsPaused(false);
    } else {
      // Log reel start telemetry
      apiRequest("/company-reels/events", {
        method: "POST",
        body: JSON.stringify({
          reelId: item._id,
          eventType: "start",
          watchDurationSec: 0,
          percentWatched: 0,
        }),
      }).catch(() => {});
    }
  }, [isActive, item._id]);

  const handlePlaybackUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      if (status.error) {
        setHasError(true);
        setIsLoading(false);
      }
      return;
    }

    setIsLoading(false);

    if (status.durationMillis && status.durationMillis > 0) {
      const progress = status.positionMillis / status.durationMillis;
      setPlaybackProgress(progress);

      const percent = Math.round(progress * 100);

      // Trigger server-side completion at >= 90%
      if (percent >= 90 && !hasSentCompletion) {
        setHasSentCompletion(true);
        apiRequest<{ isCompleted: boolean }>("/company-reels/events", {
          method: "POST",
          body: JSON.stringify({
            reelId: item._id,
            eventType: "complete",
            watchDurationSec: Math.round(status.positionMillis / 1000),
            percentWatched: percent,
          }),
        })
          .then((res) => {
            if (res.data?.isCompleted && onReelCompleted) {
              onReelCompleted(item._id);
            }
          })
          .catch(() => {});
      }
    }
  };

  const handleTogglePlayPause = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const nextPaused = !isPaused;
    setIsPaused(nextPaused);

    if (videoRef.current) {
      if (nextPaused) {
        videoRef.current.pauseAsync().catch(() => {});
      } else {
        videoRef.current.playAsync().catch(() => {});
      }
    }

    // Flash icon
    pauseIconOpacity.setValue(1);
    Animated.timing(pauseIconOpacity, {
      toValue: 0,
      duration: 600,
      useNativeDriver: true,
    }).start();
  };

  const handleToggleMute = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsMuted(!isMuted);
  };

  const handleAcknowledge = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setAcknowledged(!acknowledged);
  };

  const handleReplay = () => {
    if (videoRef.current) {
      videoRef.current.replayAsync().catch(() => {});
      setIsPaused(false);
    }
  };

  return (
    <View style={[styles.container, { height: itemHeight }]}>
      {/* Video Surface */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={handleTogglePlayPause}
        style={StyleSheet.absoluteFill}
      >
        {!hasError ? (
          <Video
            ref={videoRef}
            source={{ uri: videoUri }}
            style={StyleSheet.absoluteFill}
            resizeMode={ResizeMode.COVER}
            shouldPlay={isActive && !isPaused}
            isLooping
            isMuted={isMuted}
            onPlaybackStatusUpdate={handlePlaybackUpdate}
            useNativeControls={false}
          />
        ) : (
          <View style={styles.errorContainer}>
            <AlertTriangle size={36} color="#F59E0B" style={{ marginBottom: 10 }} />
            <Text style={styles.errorTitle}>Media Stream Unavailable</Text>
            <Text style={styles.errorDesc}>
              Could not load video. Tap below to retry.
            </Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => setHasError(false)}>
              <RotateCcw size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.retryBtnText}>Retry Playback</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Central Loading Indicator */}
        {isLoading && !hasError && (
          <View style={styles.centerOverlay}>
            <ActivityIndicator size="large" color="#38BDF8" />
          </View>
        )}

        {/* Transient Play/Pause Indicator */}
        <Animated.View
          pointerEvents="none"
          style={[styles.centerOverlay, { opacity: pauseIconOpacity }]}
        >
          <View style={styles.playPausePill}>
            {isPaused ? (
              <Pause size={36} color="#FFFFFF" />
            ) : (
              <Play size={36} color="#FFFFFF" />
            )}
          </View>
        </Animated.View>
      </TouchableOpacity>

      {/* Top Gradient Shadow Placeholder */}
      <View style={styles.topGradient} pointerEvents="none" />

      {/* Bottom Gradient Shadow Placeholder */}
      <View style={styles.bottomGradient} pointerEvents="none" />

      {/* Right Side Floating Controls */}
      <View style={styles.rightActionColumn}>
        {/* Mute / Unmute */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleToggleMute}
          activeOpacity={0.8}
        >
          <View style={styles.actionIconCircle}>
            {isMuted ? (
              <VolumeX size={20} color="#FFFFFF" />
            ) : (
              <Volume2 size={20} color="#FFFFFF" />
            )}
          </View>
          <Text style={styles.actionLabel}>{isMuted ? "Unmute" : "Sound"}</Text>
        </TouchableOpacity>

        {/* Like / Acknowledge */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleAcknowledge}
          activeOpacity={0.8}
        >
          <View
            style={[
              styles.actionIconCircle,
              acknowledged && { backgroundColor: "rgba(239, 68, 68, 0.25)" },
            ]}
          >
            <Heart
              size={20}
              color={acknowledged ? "#EF4444" : "#FFFFFF"}
              fill={acknowledged ? "#EF4444" : "transparent"}
            />
          </View>
          <Text style={styles.actionLabel}>
            {acknowledged ? "Saved" : "Save"}
          </Text>
        </TouchableOpacity>

        {/* Replay */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleReplay}
          activeOpacity={0.8}
        >
          <View style={styles.actionIconCircle}>
            <RotateCcw size={18} color="#FFFFFF" />
          </View>
          <Text style={styles.actionLabel}>Replay</Text>
        </TouchableOpacity>

        {/* Micro-Quiz Trigger Button (if quiz attached) */}
        {item.quizId && onOpenQuiz && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onOpenQuiz(item.quizId, item._id)}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIconCircle, styles.quizActionCircle]}>
              <HelpCircle size={22} color="#F59E0B" />
            </View>
            <Text style={[styles.actionLabel, { color: "#F59E0B", fontWeight: "700" }]}>
              Quiz
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Bottom Metadata & Info Overlay */}
      <View style={styles.bottomInfoOverlay}>
        {/* Badges Row */}
        <View style={styles.badgesRow}>
          {item.isMandatory && (
            <View style={styles.mandatoryBadge}>
              <AlertTriangle size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.mandatoryBadgeText}>MANDATORY</Text>
            </View>
          )}

          {item.badgeType === "reinforcement" && (
            <View style={styles.reinforceBadge}>
              <Text style={styles.reinforceBadgeText}>AI REINFORCEMENT</Text>
            </View>
          )}

          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>
              {String(item.category || "TRAINING").toUpperCase()}
            </Text>
          </View>

          {item.dueDate && (
            <View style={styles.dueDateBadge}>
              <Clock size={12} color="#CBD5E1" style={{ marginRight: 4 }} />
              <Text style={styles.dueDateText}>
                Due {new Date(item.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </Text>
            </View>
          )}

          {hasSentCompletion && (
            <View style={styles.completedBadge}>
              <ShieldCheck size={12} color="#22C55E" style={{ marginRight: 4 }} />
              <Text style={styles.completedBadgeText}>COMPLETED</Text>
            </View>
          )}
        </View>

        {/* Reel Title */}
        <Text style={styles.reelTitle} numberOfLines={2}>
          {item.title}
        </Text>

        {/* Reel Description */}
        {item.description ? (
          <TouchableOpacity onPress={() => setShowFullDesc(!showFullDesc)}>
            <Text
              style={styles.reelDesc}
              numberOfLines={showFullDesc ? 5 : 2}
            >
              {item.description}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Real-time Progress Bar */}
      <View style={styles.progressBarBackground}>
        <View
          style={[
            styles.progressBarFill,
            { width: `${Math.min(100, Math.max(0, playbackProgress * 100))}%` },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    backgroundColor: "#000000",
    overflow: "hidden",
    position: "relative",
  },
  centerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  playPausePill: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  topGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    backgroundColor: "transparent",
  },
  bottomGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 220,
    backgroundColor: "transparent",
  },
  rightActionColumn: {
    position: "absolute",
    right: 14,
    bottom: 90,
    alignItems: "center",
    gap: 16,
    zIndex: 10,
  },
  actionButton: {
    alignItems: "center",
  },
  actionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  quizActionCircle: {
    backgroundColor: "rgba(245, 158, 11, 0.2)",
    borderColor: "rgba(245, 158, 11, 0.6)",
  },
  actionLabel: {
    color: "#E2E8F0",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 4,
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  bottomInfoOverlay: {
    position: "absolute",
    left: 16,
    right: 76,
    bottom: 30,
    zIndex: 10,
  },
  badgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  mandatoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DC2626",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  mandatoryBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  reinforceBadge: {
    backgroundColor: "#8B5CF6",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  reinforceBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  categoryBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryBadgeText: {
    color: "#F8FAFC",
    fontSize: 11,
    fontWeight: "700",
  },
  dueDateBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  dueDateText: {
    color: "#CBD5E1",
    fontSize: 11,
    fontWeight: "500",
  },
  completedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(34, 197, 94, 0.2)",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: "#22C55E",
  },
  completedBadgeText: {
    color: "#22C55E",
    fontSize: 11,
    fontWeight: "700",
  },
  reelTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 22,
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    marginBottom: 4,
  },
  reelDesc: {
    color: "#E2E8F0",
    fontSize: 13,
    lineHeight: 18,
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  progressBarBackground: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    zIndex: 20,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#38BDF8",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0B0F19",
    padding: 24,
  },
  errorTitle: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
  errorDesc: {
    color: "#94A3B8",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 16,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563EB",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});
