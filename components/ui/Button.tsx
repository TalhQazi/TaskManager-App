import React, { useMemo } from "react";
import { Text, Pressable, ActivityIndicator, StyleSheet, View, type ViewStyle, type StyleProp } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { useTokens } from "@/contexts/ThemeContext";
import { MIN_TOUCH, type Tokens } from "@/constants/design/tokens";

export type ButtonVariant = "primary" | "secondary" | "success" | "danger" | "outline" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps {
  children?: React.ReactNode;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Leading icon. Sized and coloured automatically to match the label. */
  icon?: LucideIcon;
  iconPosition?: "left" | "right";
  /** Shows a spinner and blocks presses. Keeps width stable so rows don't reflow mid-submit. */
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
}

/**
 * The one button. Variants map to intent, not colour:
 *   primary   Save / Submit / Create      secondary  Cancel / Back
 *   success   Approve / Complete          danger     Delete / Remove
 *   outline   tertiary actions            ghost      toolbar / low-emphasis
 *
 * Every variant honours the active theme preset, so a danger button stays legible on
 * high-contrast and metallic-elite alike. Minimum height is 44pt (Apple HIG) at every
 * size — this app is native-mobile-first and `sm` still has to be thumb-reachable.
 */
export default function Button({
  children,
  onPress,
  variant = "primary",
  size = "md",
  icon: Icon,
  iconPosition = "left",
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  accessibilityLabel,
  testID,
}: ButtonProps) {
  const t = useTokens();
  const isInert = disabled || loading;

  const { container, label, iconSize } = useMemo(() => variantStyles(t, variant, size), [t, variant, size]);

  return (
    <Pressable
      onPress={isInert ? undefined : onPress}
      disabled={isInert}
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: isInert, busy: loading }}
      accessibilityLabel={accessibilityLabel ?? (typeof children === "string" ? children : undefined)}
      style={({ pressed }) => [
        styles.base,
        container,
        fullWidth && styles.fullWidth,
        // No hover on native; the pressed state is what communicates interactivity.
        pressed && !isInert && styles.pressed,
        isInert && styles.inert,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={label.color} />
      ) : (
        <View style={styles.content}>
          {Icon && iconPosition === "left" && <Icon size={iconSize} color={label.color} />}
          {children != null && children !== "" && (
            <Text style={[styles.labelBase, label]} numberOfLines={1}>
              {children}
            </Text>
          )}
          {Icon && iconPosition === "right" && <Icon size={iconSize} color={label.color} />}
        </View>
      )}
    </Pressable>
  );
}

function variantStyles(t: Tokens, variant: ButtonVariant, size: ButtonSize) {
  const sizing = {
    sm: { minHeight: MIN_TOUCH, paddingHorizontal: t.space.md, fontSize: 13, iconSize: 15 },
    md: { minHeight: 48, paddingHorizontal: t.space.lg, fontSize: 15, iconSize: 17 },
    lg: { minHeight: 54, paddingHorizontal: t.space.xl, fontSize: 16, iconSize: 19 },
  }[size];

  const fills: Record<ButtonVariant, { bg: string; fg: string; border: string }> = {
    primary: { bg: t.color.primary, fg: t.color.textOnPrimary, border: "transparent" },
    success: { bg: t.color.success, fg: "#FFFFFF", border: "transparent" },
    danger: { bg: t.color.danger, fg: "#FFFFFF", border: "transparent" },
    // Secondary is a filled neutral, not an outline — it needs enough weight to sit
    // beside a primary in a modal footer without disappearing.
    secondary: { bg: t.color.surfaceSunken, fg: t.color.text, border: t.color.border },
    outline: { bg: "transparent", fg: t.color.primary, border: t.color.primaryBorder },
    ghost: { bg: "transparent", fg: t.color.textSecondary, border: "transparent" },
  };

  const f = fills[variant];

  return {
    container: {
      backgroundColor: f.bg,
      borderColor: f.border,
      borderWidth: f.border === "transparent" ? 0 : 1,
      minHeight: sizing.minHeight,
      paddingHorizontal: sizing.paddingHorizontal,
      borderRadius: t.radius.md,
    } as ViewStyle,
    label: { color: f.fg, fontSize: sizing.fontSize },
    iconSize: sizing.iconSize,
  };
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  content: { flexDirection: "row", alignItems: "center", gap: 8 },
  labelBase: { fontWeight: "600" },
  fullWidth: { alignSelf: "stretch", width: "100%" },
  pressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
  inert: { opacity: 0.45 },
});
