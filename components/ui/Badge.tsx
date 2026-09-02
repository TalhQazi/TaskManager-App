import React from "react";
import { View, Text, StyleSheet, type ViewStyle, type StyleProp } from "react-native";
import { useTokens } from "@/contexts/ThemeContext";
import type { Tokens } from "@/constants/design/tokens";

export type BadgeTone = "neutral" | "primary" | "success" | "warning" | "danger" | "info";

export interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  /** Leading status dot. Helps distinguish tones without relying on colour alone. */
  dot?: boolean;
  size?: "sm" | "md";
  style?: StyleProp<ViewStyle>;
}

/**
 * Status/label chip.
 *
 * Deliberately soft-filled rather than solid: a table with twelve solid badges reads as
 * twelve alerts. Colour is paired with a dot and an explicit text label so meaning never
 * depends on hue alone — which also covers colour-blind users and the greyscale presets.
 */
export default function Badge({ label, tone = "neutral", dot = false, size = "sm", style }: BadgeProps) {
  const t = useTokens();
  const { fg, bg } = toneColors(t, tone);

  const pad = size === "sm" ? { paddingHorizontal: 8, paddingVertical: 3 } : { paddingHorizontal: 10, paddingVertical: 5 };

  return (
    <View style={[styles.badge, pad, { backgroundColor: bg, borderRadius: t.radius.sm }, style]}>
      {dot && <View style={[styles.dot, { backgroundColor: fg }]} />}
      <Text style={[size === "sm" ? t.type.meta : t.type.label, { color: fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export function toneColors(t: Tokens, tone: BadgeTone): { fg: string; bg: string } {
  switch (tone) {
    case "primary":
      return { fg: t.color.primary, bg: t.color.primarySoft };
    case "success":
      return { fg: t.color.success, bg: t.color.successSoft };
    case "warning":
      return { fg: t.color.warning, bg: t.color.warningSoft };
    case "danger":
      return { fg: t.color.danger, bg: t.color.dangerSoft };
    case "info":
      return { fg: t.color.info, bg: t.color.infoSoft };
    default:
      return { fg: t.color.textSecondary, bg: t.color.surfaceSunken };
  }
}

const styles = StyleSheet.create({
  badge: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start" },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
