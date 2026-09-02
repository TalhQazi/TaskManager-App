import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTaskTheme } from "./theme";
import { TaskStatus } from "./types";

interface StatusPillProps {
  status: TaskStatus;
  size?: "sm" | "md";
}

export default function StatusPill({ status, size = "sm" }: StatusPillProps) {
  const theme = useTaskTheme();
  const cfg = theme.status[status] || theme.status.pending;
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
