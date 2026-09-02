import React from "react";
import { View, Text, Pressable, StyleSheet, type ViewStyle, type StyleProp } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { useTokens } from "@/contexts/ThemeContext";
import { MIN_TOUCH } from "@/constants/design/tokens";

// Small shared pieces that don't each warrant a file.

// ---------------------------------------------------------------------------

export interface StatCardProps {
  label: string;
  /** Pre-formatted. This component does no arithmetic — it displays what it's given. */
  value: string | number;
  icon?: LucideIcon;
  /** Supporting line, e.g. "12 due today". */
  hint?: string;
  tone?: "neutral" | "primary" | "success" | "warning" | "danger";
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/** KPI tile for dashboard headers. */
export function StatCard({ label, value, icon: Icon, hint, tone = "neutral", onPress, style }: StatCardProps) {
  const t = useTokens();

  const accent = {
    neutral: t.color.textSecondary,
    primary: t.color.primary,
    success: t.color.success,
    warning: t.color.warning,
    danger: t.color.danger,
  }[tone];

  const accentBg = {
    neutral: t.color.surfaceSunken,
    primary: t.color.primarySoft,
    success: t.color.successSoft,
    warning: t.color.warningSoft,
    danger: t.color.dangerSoft,
  }[tone];

  const Wrapper: any = onPress ? Pressable : View;

  return (
    <Wrapper
      onPress={onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={`${label}: ${value}`}
      style={({ pressed }: any) => [
        styles.stat,
        {
          backgroundColor: t.color.surface,
          borderColor: t.color.border,
          borderRadius: t.radius.lg,
          padding: t.space.lg,
        },
        t.elevation.sm,
        pressed && onPress && { backgroundColor: t.color.surfaceActive },
        style,
      ]}
    >
      <View style={styles.statTop}>
        <Text style={[t.type.meta, { color: t.color.textSecondary, flex: 1 }]} numberOfLines={1}>
          {label.toUpperCase()}
        </Text>
        {Icon && (
          <View style={[styles.statIcon, { backgroundColor: accentBg, borderRadius: t.radius.sm }]}>
            <Icon size={15} color={accent} />
          </View>
        )}
      </View>
      <Text style={[styles.statValue, { color: t.color.text }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {hint && (
        <Text style={[t.type.caption, { color: t.color.textSecondary, marginTop: 2 }]} numberOfLines={1}>
          {hint}
        </Text>
      )}
    </Wrapper>
  );
}

// ---------------------------------------------------------------------------

/** Horizontal rule with consistent colour. */
export function Divider({ style, spacing = 0 }: { style?: StyleProp<ViewStyle>; spacing?: number }) {
  const t = useTokens();
  return <View style={[{ height: 1, backgroundColor: t.color.border, marginVertical: spacing }, style]} />;
}

// ---------------------------------------------------------------------------

export interface SectionHeaderProps {
  title: string;
  /** Right-side slot — a "See all" link or count. */
  action?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function SectionHeader({ title, action, style }: SectionHeaderProps) {
  const t = useTokens();
  return (
    <View style={[styles.sectionHeader, { marginBottom: t.space.md }, style]}>
      <Text style={[t.type.sectionTitle, { color: t.color.text, flex: 1 }]}>{title}</Text>
      {action}
    </View>
  );
}

// ---------------------------------------------------------------------------

export interface ListRowProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  /** Right-side slot — a Badge, chevron, or switch. */
  trailing?: React.ReactNode;
  onPress?: () => void;
  destructive?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Settings/menu row with a guaranteed 44pt target. */
export function ListRow({ title, subtitle, icon: Icon, trailing, onPress, destructive, style }: ListRowProps) {
  const t = useTokens();
  const fg = destructive ? t.color.danger : t.color.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={title}
      style={({ pressed }) => [
        styles.listRow,
        { paddingHorizontal: t.space.lg, paddingVertical: t.space.md },
        pressed && onPress && { backgroundColor: t.color.surfaceActive },
        style,
      ]}
    >
      {Icon && <Icon size={19} color={destructive ? t.color.danger : t.color.textSecondary} />}
      <View style={styles.flex}>
        <Text style={[t.type.body, { color: fg }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[t.type.caption, { color: t.color.textSecondary, marginTop: 1 }]} numberOfLines={2}>
            {subtitle}
          </Text>
        )}
      </View>
      {trailing}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------

export interface AvatarProps {
  name?: string;
  size?: number;
  /** Overrides the derived initials. */
  initials?: string;
  style?: StyleProp<ViewStyle>;
}

/** Initials avatar. Colour is derived from the name so a given person stays consistent. */
export function Avatar({ name, size = 36, initials, style }: AvatarProps) {
  const t = useTokens();

  const text =
    initials ??
    (name || "?")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("");

  // Deterministic hue per name — stable across renders and sessions.
  const hue = Array.from(name ?? "?").reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);

  return (
    <View
      accessibilityLabel={name}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: `hsl(${hue}, 45%, ${t.scheme === "dark" ? 28 : 88}%)`,
          alignItems: "center",
          justifyContent: "center",
        },
        style,
      ]}
    >
      <Text
        style={{
          color: t.scheme === "dark" ? "#FFFFFF" : `hsl(${hue}, 55%, 28%)`,
          fontSize: size * 0.38,
          fontWeight: "700",
        }}
      >
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stat: { borderWidth: 1, flex: 1, minWidth: 150 },
  statTop: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  statIcon: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: 26, fontWeight: "700", lineHeight: 31 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  listRow: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: MIN_TOUCH + 8 },
});
