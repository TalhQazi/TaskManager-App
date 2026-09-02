import React from "react";
import { View, Text, Pressable, StyleSheet, type ViewStyle, type StyleProp } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { useTokens } from "@/contexts/ThemeContext";

export interface CardProps {
  children: React.ReactNode;
  /** Renders a header row with a title, and a divider above the body. */
  title?: string;
  subtitle?: string;
  icon?: LucideIcon;
  /** Right-aligned header slot — usually a Button or IconButton. */
  action?: React.ReactNode;
  /** Makes the whole card pressable. Adds the correct a11y role automatically. */
  onPress?: () => void;
  /** `flat` for dense lists of cards, `raised` for standalone emphasis. */
  elevation?: "flat" | "raised";
  /** Drops the body padding — for cards wrapping an edge-to-edge list or table. */
  noPadding?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * The standard content container.
 *
 * Shadows only appear on light schemes — on the near-black presets a drop shadow is
 * invisible and just costs a render layer, so `elevation` there resolves to a no-op and
 * separation comes from the border instead (see buildTokens).
 */
export default function Card({
  children,
  title,
  subtitle,
  icon: Icon,
  action,
  onPress,
  elevation = "flat",
  noPadding = false,
  style,
  testID,
}: CardProps) {
  const t = useTokens();

  const shell: StyleProp<ViewStyle> = [
    {
      backgroundColor: t.color.surface,
      borderRadius: t.radius.lg,
      borderWidth: 1,
      borderColor: t.color.border,
    },
    elevation === "raised" ? t.elevation.md : t.elevation.sm,
    style,
  ];

  const body = (
    <>
      {(title || action) && (
        <View
          style={[
            styles.header,
            { paddingHorizontal: t.space.lg, paddingTop: t.space.lg, paddingBottom: t.space.md },
          ]}
        >
          <View style={styles.headerText}>
            <View style={styles.titleRow}>
              {Icon && <Icon size={16} color={t.color.textSecondary} />}
              {title && (
                <Text style={[t.type.cardTitle, { color: t.color.text }]} numberOfLines={1}>
                  {title}
                </Text>
              )}
            </View>
            {subtitle && (
              <Text style={[t.type.caption, { color: t.color.textSecondary, marginTop: 2 }]} numberOfLines={2}>
                {subtitle}
              </Text>
            )}
          </View>
          {action}
        </View>
      )}
      <View style={noPadding ? undefined : { padding: t.space.lg, paddingTop: title ? 0 : t.space.lg }}>
        {children}
      </View>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        testID={testID}
        accessibilityRole="button"
        style={({ pressed }) => [shell, pressed && { backgroundColor: t.color.surfaceActive }]}
      >
        {body}
      </Pressable>
    );
  }

  return (
    <View style={shell} testID={testID}>
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  headerText: { flex: 1 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
});
