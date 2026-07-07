import React from "react";
import { StyleSheet, View, Text, StyleProp, ViewStyle } from "react-native";
import { Award } from "lucide-react-native";

interface MilestoneBadgeProps {
  level: string;
  label: string;
  style?: StyleProp<ViewStyle>;
  size?: "sm" | "md" | "lg";
}

// Map Tailwind colors to standard RGBA/HEX values for React Native
const milestoneColors: Record<string, { bg: string; text: string; border: string }> = {
  "30d": { bg: "rgba(59, 130, 246, 0.2)", text: "#60A5FA", border: "rgba(59, 130, 246, 0.3)" },
  "90d": { bg: "rgba(168, 85, 247, 0.2)", text: "#C084FC", border: "rgba(168, 85, 247, 0.3)" },
  "6m":  { bg: "rgba(34, 197, 94, 0.2)",  text: "#4ADE80", border: "rgba(34, 197, 94, 0.3)" },
  "1y":  { bg: "rgba(234, 179, 8, 0.2)",  text: "#FACC15", border: "rgba(234, 179, 8, 0.3)" },
  "2y":  { bg: "rgba(249, 115, 22, 0.2)", text: "#FB923C", border: "rgba(249, 115, 22, 0.3)" },
  "3y":  { bg: "rgba(239, 68, 68, 0.2)",  text: "#F87171", border: "rgba(239, 68, 68, 0.3)" },
  "4y":  { bg: "rgba(236, 72, 153, 0.2)", text: "#F472B6", border: "rgba(236, 72, 153, 0.3)" },
  "5y":  { bg: "rgba(99, 102, 241, 0.2)", text: "#818CF8", border: "rgba(99, 102, 241, 0.3)" },
  "6y":  { bg: "rgba(20, 184, 166, 0.2)", text: "#2DD4BF", border: "rgba(20, 184, 166, 0.3)" },
  "7y":  { bg: "rgba(6, 182, 212, 0.2)",  text: "#22D3EE", border: "rgba(6, 182, 212, 0.3)" },
  "8y":  { bg: "rgba(132, 204, 22, 0.2)", text: "#A3E635", border: "rgba(132, 204, 22, 0.3)" },
  "9y":  { bg: "rgba(245, 158, 11, 0.2)", text: "#FBBF24", border: "rgba(245, 158, 11, 0.3)" },
  "10y": { bg: "rgba(244, 63, 94, 0.2)",  text: "#FB7185", border: "rgba(244, 63, 94, 0.3)" },
};

// Layout configurations replacing web-size structural classes
const sizeConfigs = {
  sm: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    gap: 4,
    fontSize: 12,
    iconSize: 12,
  },
  md: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 6,
    fontSize: 14,
    iconSize: 14,
  },
  lg: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
    fontSize: 16,
    iconSize: 16,
  },
};

export default function MilestoneBadge({ level, label, style, size = "md" }: MilestoneBadgeProps) {
  const colors = milestoneColors[level] || milestoneColors["1y"];
  const config = sizeConfigs[size];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
          paddingHorizontal: config.paddingHorizontal,
          paddingVertical: config.paddingVertical,
          gap: config.gap,
        },
        style,
      ]}
    >
      <Award size={config.iconSize} color={colors.text} />
      <Text style={[styles.text, { color: colors.text, fontSize: config.fontSize }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 9999,
    borderWidth: 1,
    alignSelf: "flex-start", // Prevents the badge from stretching full width like block elements
  },
  text: {
    fontWeight: "500",
  },
});