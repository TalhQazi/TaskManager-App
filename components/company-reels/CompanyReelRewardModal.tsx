import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
} from "react-native";
import { Award, Flame, Zap, Check } from "lucide-react-native";
import * as Haptics from "expo-haptics";

interface CompanyReelRewardModalProps {
  visible: boolean;
  points: number;
  streak: number;
  badge?: {
    title: string;
    description: string;
  } | null;
  onClose: () => void;
}

export const CompanyReelRewardModal: React.FC<CompanyReelRewardModalProps> = ({
  visible,
  points,
  streak,
  badge,
  onClose,
}) => {
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.7);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.card,
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          {/* Glowing Trophy Icon */}
          <View style={styles.trophyRing}>
            <View style={styles.trophyInner}>
              <Award size={40} color="#F59E0B" />
            </View>
          </View>

          <Text style={styles.rewardTitle}>Knowledge Mastered!</Text>
          <Text style={styles.rewardSubtitle}>
            Training progress recorded to your official compliance record.
          </Text>

          {/* Stats Bar */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Zap size={22} color="#38BDF8" style={{ marginBottom: 4 }} />
              <Text style={styles.statVal}>+{points}</Text>
              <Text style={styles.statLabel}>POINTS</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statBox}>
              <Flame size={22} color="#F97316" style={{ marginBottom: 4 }} />
              <Text style={styles.statVal}>{streak} DAYS</Text>
              <Text style={styles.statLabel}>DAILY STREAK</Text>
            </View>
          </View>

          {/* Optional Badge */}
          {badge && (
            <View style={styles.badgeContainer}>
              <Award size={18} color="#10B981" style={{ marginRight: 8 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.badgeTitle}>{badge.title}</Text>
                <Text style={styles.badgeDesc}>{badge.description}</Text>
              </View>
            </View>
          )}

          {/* Dismiss Button */}
          <TouchableOpacity
            style={styles.claimButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onClose();
            }}
            activeOpacity={0.85}
          >
            <Check size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.claimButtonText}>Keep Going</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#0F172A",
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 22,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
    shadowColor: "#F59E0B",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  trophyRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "rgba(245, 158, 11, 0.4)",
  },
  trophyInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "rgba(245, 158, 11, 0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  rewardTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 6,
  },
  rewardSubtitle: {
    color: "#94A3B8",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    width: "100%",
    justifyContent: "space-around",
    alignItems: "center",
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  statBox: {
    alignItems: "center",
    flex: 1,
  },
  statVal: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "800",
  },
  statLabel: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  badgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    padding: 12,
    borderRadius: 12,
    width: "100%",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  badgeTitle: {
    color: "#10B981",
    fontSize: 13,
    fontWeight: "700",
  },
  badgeDesc: {
    color: "#CBD5E1",
    fontSize: 11,
    marginTop: 2,
  },
  claimButton: {
    flexDirection: "row",
    backgroundColor: "#F59E0B",
    width: "100%",
    paddingVertical: 14,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  claimButtonText: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "800",
  },
});
