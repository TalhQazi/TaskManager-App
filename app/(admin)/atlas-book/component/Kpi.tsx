import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ComponentType<{ size: number; color: string }>;
}

export const KpiCard: React.FC<KpiCardProps> = ({ title, value, subtitle, icon: Icon }) => {
  return (
    <View style={styles.cardContainer}>
      {/* Header Metadata Layer */}
      <View style={styles.cardHeaderRow}>
        <Text style={styles.cardTitleText}>{title}</Text>
        {Icon && <Icon size={14} color="#52525b" />}
      </View>

      {/* Main Stat Asset */}
      <Text style={styles.cardValueText}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </Text>

      {/* Subtitle Information Layer */}
      <Text style={styles.cardSubtitleText}>{subtitle}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: "#18181b",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 12,
    padding: 14,
    width: "100%",
    justifyContent: "space-between",
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardTitleText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#a1a1aa",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontFamily: Platform.select({ ios: "Courier New", android: "monospace" }),
  },
  cardValueText: {
    fontSize: 20,
    fontWeight: "900",
    color: "#ffffff",
    marginBottom: 6,
    fontFamily: Platform.select({ ios: "Courier New", android: "monospace" }),
  },
  cardSubtitleText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#71717a",
    fontFamily: Platform.select({ ios: "Courier New", android: "monospace" }),
  },
});