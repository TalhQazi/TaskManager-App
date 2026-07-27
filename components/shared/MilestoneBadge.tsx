import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Award } from "lucide-react-native";

interface MilestoneBadgeProps {
  level: string;
  label: string;
  size?: "sm" | "md" | "lg";
}

const milestoneColors: Record<string, { bg: string; text: string; border: string }> = {
  "30d": { bg: "rgba(59, 130, 246, 0.2)", text: "#60a5fa", border: "rgba(59, 130, 246, 0.3)" },
  "90d": { bg: "rgba(168, 85, 247, 0.2)", text: "#c084fc", border: "rgba(168, 85, 247, 0.3)" },
  "6m": { bg: "rgba(34, 197, 94, 0.2)", text: "#4ade80", border: "rgba(34, 197, 94, 0.3)" },
  "1y": { bg: "rgba(234, 179, 8, 0.2)", text: "#facc15", border: "rgba(234, 179, 8, 0.3)" },
  "2y": { bg: "rgba(249, 115, 22, 0.2)", text: "#fb923c", border: "rgba(249, 115, 22, 0.3)" },
  "3y": { bg: "rgba(239, 68, 68, 0.2)", text: "#f87171", border: "rgba(239, 68, 68, 0.3)" },
  "4y": { bg: "rgba(236, 72, 153, 0.2)", text: "#f472b6", border: "rgba(236, 72, 153, 0.3)" },
  "5y": { bg: "rgba(99, 102, 241, 0.2)", text: "#818cf8", border: "rgba(99, 102, 241, 0.3)" },
  "6y": { bg: "rgba(20, 184, 166, 0.2)", text: "#2dd4bf", border: "rgba(20, 184, 166, 0.3)" },
  "7y": { bg: "rgba(6, 182, 212, 0.2)", text: "#22d3ee", border: "rgba(6, 182, 212, 0.3)" },
  "8y": { bg: "rgba(132, 204, 22, 0.2)", text: "#a3e635", border: "rgba(132, 204, 22, 0.3)" },
  "9y": { bg: "rgba(245, 158, 11, 0.2)", text: "#fbbf24", border: "rgba(245, 158, 11, 0.3)" },
  "10y": { bg: "rgba(244, 63, 94, 0.2)", text: "#fb7185", border: "rgba(244, 63, 94, 0.3)" },
};

export default function MilestoneBadge({ level, label, size = "md" }: MilestoneBadgeProps) {
  const colors = milestoneColors[level] || milestoneColors["1y"];

  const paddingStyles = 
    size === "sm" ? { paddingHorizontal: 8, paddingVertical: 2, gap: 4 } :
    size === "lg" ? { paddingHorizontal: 14, paddingVertical: 6, gap: 8 } :
    { paddingHorizontal: 10, paddingVertical: 4, gap: 6 };

  const textFontStyles = 
    size === "sm" ? { fontSize: 11 } :
    size === "lg" ? { fontSize: 15, fontWeight: "bold" as const } :
    { fontSize: 13, fontWeight: "600" as const };

  const iconDimension = size === "sm" ? 12 : size === "lg" ? 18 : 14;

  return (
    <View style={[
      styles.badgeContainer, 
      paddingStyles, 
      { backgroundColor: colors.bg, borderColor: colors.border }
    ]}>
      <Award size={iconDimension} color={colors.text} />
      <Text style={[textFontStyles, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 100,
    borderWidth: 1,
  },
});