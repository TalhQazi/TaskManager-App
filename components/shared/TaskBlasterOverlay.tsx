import React, { useEffect } from "react";
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions } from "react-native";
import { useTaskBlasterContext } from "@/contexts/TaskBlasterContext";
import { Flame, Award, X } from "lucide-react-native";

export default function TaskBlasterOverlay() {
  const { state, dismissBlaster } = useTaskBlasterContext();

  // Automatically auto-dismiss the visual screen blast pop-up after 4 seconds
  useEffect(() => {
    if (state.isVisible) {
      const timer = setTimeout(() => {
        dismissBlaster();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [state.isVisible, dismissBlaster]);

  if (!state.isVisible || !state.task) return null;

  const isHighPriority = state.task.priority === "high" || state.task.priority === "top" || state.task.priority === "red";

  return (
    <Modal transparent animationType="fade" visible={state.isVisible} onRequestClose={dismissBlaster}>
      <View style={styles.darkDimmedBackdrop}>
        <View style={[styles.blastCardContainer, isHighPriority ? styles.borderHigh : styles.borderNormal]}>
          
          {/* Top Close Control Trigger Node */}
          <TouchableOpacity style={styles.dismissCloseCornerBtn} onPress={dismissBlaster}>
            <X size={16} color="#8b949e" />
          </TouchableOpacity>

          <View style={styles.iconBadgeLayoutStack}>
            <View style={[styles.outerGlowCircleRing, isHighPriority ? styles.glowHigh : styles.glowNormal]}>
              <Award size={32} color={isHighPriority ? "#ff7b72" : "#58a6ff"} />
            </View>
          </View>

          <Text style={styles.streakMilestoneTextHeadline}>MILESTONE BLAST ACHIEVED!</Text>
          <Text style={styles.taskTitleLabelString} numberOfLines={2}>
            {state.task.title}
          </Text>

          <View style={styles.metricsMetadataRowSummaryBox}>
            <View style={styles.singleStatBoxNode}>
              <Flame size={14} color="#f97316" />
              <Text style={styles.singleStatBoxNodeText}>Streak Count: {state.streakCount}</Text>
            </View>
            <View style={[styles.singleStatBoxNode, { backgroundColor: "rgba(35, 134, 54, 0.15)" }]}>
              <Text style={[styles.singleStatBoxNodeText, { color: "#56d364" }]}>Total Done: {state.completedTasksCount}</Text>
            </View>
          </View>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  darkDimmedBackdrop: {
    flex: 1,
    backgroundColor: "rgba(13, 17, 23, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  blastCardContainer: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#161b22",
    borderRadius: 16,
    borderWidth: 2,
    padding: 24,
    alignItems: "center",
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
  borderHigh: { borderColor: "#f85149" },
  borderNormal: { borderColor: "#388bfd" },
  dismissCloseCornerBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    padding: 4,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 8,
  },
  iconBadgeLayoutStack: {
    marginBottom: 16,
  },
  outerGlowCircleRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  glowHigh: { backgroundColor: "rgba(248, 81, 73, 0.15)" },
  glowNormal: { backgroundColor: "rgba(56, 139, 253, 0.15)" },
  streakMilestoneTextHeadline: {
    fontSize: 14,
    fontWeight: "900",
    color: "#fbbf24",
    letterSpacing: 1,
    marginBottom: 8,
    textAlign: "center",
  },
  taskTitleLabelString: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#ffffff",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  metricsMetadataRowSummaryBox: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    width: "100%",
  },
  singleStatBoxNode: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(249, 115, 22, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  singleStatBoxNodeText: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#c9d1d9",
  },
});