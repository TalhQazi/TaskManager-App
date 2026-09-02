import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTaskTheme } from "./theme";
import { TaskPriority } from "./types";

interface PriorityPillProps {
  priority: TaskPriority;
  size?: "sm" | "md";
  showLow?: boolean;
}

export default function PriorityPill({ priority, size = "sm", showLow = true }: PriorityPillProps) {
  const theme = useTaskTheme();
  if (priority === "low" && !showLow) return null;
  const cfg = (theme.priority as any)[priority] || theme.priority.medium;
  const isSm = size === "sm";

  return (
    <View style={[styles.pill, { backgroundColor: cfg.bg }, isSm ? styles.pillSm : styles.pillMd]}>
      <View style={[styles.dot, { backgroundColor: cfg.fg }]} />
      <Text style={[styles.label, { color: cfg.fg }, isSm ? styles.labelSm : styles.labelMd]}>
        {cfg.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    gap: 5,
  },
  pillSm: { paddingHorizontal: 7, paddingVertical: 2.5 },
  pillMd: { paddingHorizontal: 10, paddingVertical: 5 },
  dot: { width: 5.5, height: 5.5, borderRadius: 3 },
  label: { fontWeight: "700" },
  labelSm: { fontSize: 10.5 },
  labelMd: { fontSize: 12.5 },
});
