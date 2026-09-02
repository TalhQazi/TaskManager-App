import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTaskTheme } from "./theme";

interface ProjectProgressBarProps {
  completed: number;
  total: number;
  compact?: boolean;
}

export default function ProjectProgressBar({ completed, total, compact = false }: ProjectProgressBarProps) {
  const theme = useTaskTheme();
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <View>
      <View style={[styles.track, { backgroundColor: theme.bg.inset }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${pct}%`,
              backgroundColor: pct === 100 ? theme.accent.success : theme.accent.primary,
            },
          ]}
        />
      </View>
      {!compact && (
        <Text style={[styles.label, { color: theme.text.secondary }]}>
          {completed} of {total} tasks complete{total > 0 ? ` · ${pct}%` : ""}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 3,
  },
  label: { fontSize: 11.5, marginTop: 6, fontWeight: "600" },
});
