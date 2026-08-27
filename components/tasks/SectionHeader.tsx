import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTaskTheme } from "./theme";

interface SectionHeaderProps {
  title: string;
  count?: number;
  tone?: "default" | "danger";
  trailing?: React.ReactNode;
}

export default function SectionHeader({ title, count, tone = "default", trailing }: SectionHeaderProps) {
  const theme = useTaskTheme();
  const color = tone === "danger" ? theme.accent.danger : theme.text.primary;

  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <Text style={[styles.title, { color }]}>{title}</Text>
        {typeof count === "number" && (
          <View style={[styles.countBadge, { backgroundColor: tone === "danger" ? theme.accent.dangerSoft : theme.bg.surfaceRaised }]}>
            <Text style={[styles.count, { color: tone === "danger" ? theme.accent.danger : theme.text.secondary }]}>
              {count}
            </Text>
          </View>
        )}
      </View>
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 6,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  countBadge: {
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: 8,
  },
  count: {
    fontSize: 11,
    fontWeight: "700",
  },
});
