import React from "react";
import { Pressable, StyleSheet, View, Text, type ViewStyle, type StyleProp } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { useTokens } from "@/contexts/ThemeContext";
import { HIT_SLOP, MIN_TOUCH } from "@/constants/design/tokens";

export interface IconButtonProps {
  icon: LucideIcon;
  onPress?: () => void;
  /** Required — an icon alone tells a screen reader nothing. */
  accessibilityLabel: string;
  variant?: "plain" | "surface" | "primary" | "danger";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  /** Small count bubble, e.g. unread notifications. Values over 99 render as "99+". */
  badgeCount?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Square tap target for toolbar and header actions.
 *
 * Icons in the old headers were wrapped in bare TouchableOpacity with ~20pt targets;
 * this guarantees 44pt minimum and adds hitSlop on top, which matters most for the
 * back/close affordances near screen edges.
 */
export default function IconButton({
  icon: Icon,
  onPress,
  accessibilityLabel,
  variant = "plain",
  size = "md",
  disabled = false,
  badgeCount,
  style,
  testID,
}: IconButtonProps) {
  const t = useTokens();

  const dim = { sm: MIN_TOUCH, md: 46, lg: 52 }[size];
  const iconSize = { sm: 18, md: 20, lg: 24 }[size];

  const skin = {
    plain: { bg: "transparent", fg: t.color.textSecondary, border: "transparent" },
    surface: { bg: t.color.surfaceSunken, fg: t.color.text, border: t.color.border },
    primary: { bg: t.color.primary, fg: t.color.textOnPrimary, border: "transparent" },
    danger: { bg: t.color.dangerSoft, fg: t.color.danger, border: "transparent" },
  }[variant];

  const showBadge = typeof badgeCount === "number" && badgeCount > 0;

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      hitSlop={HIT_SLOP}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.base,
        {
          width: dim,
          height: dim,
          borderRadius: t.radius.md,
          backgroundColor: skin.bg,
          borderColor: skin.border,
          borderWidth: skin.border === "transparent" ? 0 : 1,
        },
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Icon size={iconSize} color={skin.fg} />
      {showBadge && (
        <View style={[styles.badge, { backgroundColor: t.color.danger, borderColor: t.color.surface }]}>
          <Text style={styles.badgeText} numberOfLines={1}>
            {badgeCount > 99 ? "99+" : badgeCount}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: "center", justifyContent: "center" },
  pressed: { opacity: 0.6, transform: [{ scale: 0.94 }] },
  disabled: { opacity: 0.4 },
  badge: {
    position: "absolute",
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: "#FFFFFF", fontSize: 10, fontWeight: "700" },
});
