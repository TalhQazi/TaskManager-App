import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { Video, ResizeMode } from "expo-av";
import {
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Volume2,
  VolumeX,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { apiRequest } from "@/services/api";

interface BroadcastData {
  _id: string;
  title: string;
  description: string;
  mediaUrl: string;
  priority: string;
  requiresAcknowledgment: boolean;
  sender?: {
    name?: string;
    firstName?: string;
    lastName?: string;
    role?: string;
  };
}

interface CompanyBroadcastAlertModalProps {
  visible: boolean;
  broadcast: BroadcastData | null;
  onAcknowledged: (broadcastId: string) => void;
}

export const CompanyBroadcastAlertModal: React.FC<CompanyBroadcastAlertModalProps> = ({
  visible,
  broadcast,
  onAcknowledged,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!visible || !broadcast) return null;

  const senderName = broadcast.sender
    ? `${broadcast.sender.firstName || ""} ${broadcast.sender.lastName || ""}`.trim() ||
      broadcast.sender.name ||
      "Executive Leadership"
    : "Executive Leadership";

  const handleAcknowledge = async () => {
    setSubmitting(true);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await apiRequest(`/company-reels/broadcasts/${broadcast._id}/acknowledge`, {
        method: "POST",
        body: JSON.stringify({ note: "Acknowledged on mobile device" }),
      });
      onAcknowledged(broadcast._id);
    } catch (err) {
      console.error("[Broadcast Alert] Acknowledgment error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Priority Alert Banner */}
          <View style={styles.alertHeader}>
            <ShieldAlert size={20} color="#EF4444" style={{ marginRight: 8 }} />
            <Text style={styles.alertHeaderText}>MANDATORY EXECUTIVE BROADCAST</Text>
          </View>

          {/* Video Container */}
          <View style={styles.videoWrap}>
            <Video
              source={{ uri: broadcast.mediaUrl }}
              style={styles.videoPlayer}
              resizeMode={ResizeMode.COVER}
              shouldPlay
              isLooping
              isMuted={isMuted}
            />

            {/* Sound Toggle */}
            <TouchableOpacity
              style={styles.muteBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setIsMuted(!isMuted);
              }}
            >
              {isMuted ? (
                <VolumeX size={18} color="#FFFFFF" />
              ) : (
                <Volume2 size={18} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>

          {/* Info Section */}
          <View style={styles.infoSection}>
            <Text style={styles.senderText}>From: {senderName}</Text>
            <Text style={styles.broadcastTitle}>{broadcast.title}</Text>
            {broadcast.description ? (
              <Text style={styles.broadcastDesc}>{broadcast.description}</Text>
            ) : null}
          </View>

          {/* Acknowledgment Gate Button */}
          <TouchableOpacity
            style={styles.ackButton}
            disabled={submitting}
            activeOpacity={0.85}
            onPress={handleAcknowledge}
          >
            {submitting ? (
              <ActivityIndicator color="#0F172A" size="small" />
            ) : (
              <>
                <CheckCircle2 size={20} color="#0F172A" style={{ marginRight: 8 }} />
                <Text style={styles.ackButtonText}>I Acknowledge & Understand</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.disclaimerText}>
            Compliance notice: Tapping above registers your verified electronic acknowledgment.
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  container: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#0F172A",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1.5,
    borderColor: "rgba(239, 68, 68, 0.5)",
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  alertHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  alertHeaderText: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  videoWrap: {
    width: "100%",
    height: 220,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#000000",
    position: "relative",
    marginBottom: 14,
  },
  videoPlayer: {
    width: "100%",
    height: "100%",
  },
  muteBtn: {
    position: "absolute",
    bottom: 12,
    right: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  infoSection: {
    marginBottom: 18,
  },
  senderText: {
    color: "#38BDF8",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 4,
  },
  broadcastTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 22,
    marginBottom: 6,
  },
  broadcastDesc: {
    color: "#94A3B8",
    fontSize: 13,
    lineHeight: 18,
  },
  ackButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#22C55E",
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 10,
    shadowColor: "#22C55E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  ackButtonText: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "800",
  },
  disclaimerText: {
    color: "#64748B",
    fontSize: 11,
    textAlign: "center",
    lineHeight: 14,
  },
});
