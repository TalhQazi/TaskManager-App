import React, { useEffect, useRef } from "react";
import { View, Text, Animated, StyleSheet, ActivityIndicator, type ViewStyle, type StyleProp } from "react-native";
import { Inbox, SearchX, WifiOff, AlertCircle, type LucideIcon } from "lucide-react-native";
import { useTokens } from "@/contexts/ThemeContext";
import Button from "./Button";

// The brief's "never leave users staring at a blank screen" requirement, as three
// components covering the states every data screen actually has: loading, empty, failed.

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

export interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

/** Pulsing placeholder block. Prefer over a spinner when the layout shape is known. */
export function Skeleton({ width = "100%", height = 14, radius, style }: SkeletonProps) {
  const t = useTokens();
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        { width, height, borderRadius: radius ?? t.radius.sm, backgroundColor: t.color.surfaceSunken, opacity: pulse },
        style,
      ]}
    />
  );
}

/** Skeleton shaped like a list of rows — the most common loading shape in this app. */
export function SkeletonList({ rows = 5, style }: { rows?: number; style?: StyleProp<ViewStyle> }) {
  const t = useTokens();
  return (
    <View style={style} accessibilityLabel="Loading" accessibilityRole="progressbar">
      {Array.from({ length: rows }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.skelRow,
            { backgroundColor: t.color.surface, borderColor: t.color.border, borderRadius: t.radius.lg, padding: t.space.lg, marginBottom: t.space.md },
          ]}
        >
          <Skeleton width={40} height={40} radius={t.radius.md} />
          <View style={{ flex: 1, gap: 8 }}>
            <Skeleton width="60%" height={13} />
            <Skeleton width="85%" height={11} />
          </View>
        </View>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

/** Centred spinner with a label. For full-screen waits where no layout shape is known yet. */
export function LoadingState({ message = "Loading…", style }: { message?: string; style?: StyleProp<ViewStyle> }) {
  const t = useTokens();
  return (
    <View style={[styles.centered, { padding: t.space.xxl }, style]} accessibilityRole="progressbar">
      <ActivityIndicator size="large" color={t.color.primary} />
      <Text style={[t.type.caption, { color: t.color.textSecondary, marginTop: t.space.md }]}>{message}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Empty
// ---------------------------------------------------------------------------

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  /** Say why it's empty and what to do next — not just "No data". */
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Use `search` when a filter/query produced nothing; it offers a clear-filters action instead. */
  variant?: "empty" | "search";
  style?: StyleProp<ViewStyle>;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  variant = "empty",
  style,
}: EmptyStateProps) {
  const t = useTokens();
  const Icon = icon ?? (variant === "search" ? SearchX : Inbox);

  return (
    <View style={[styles.centered, { paddingVertical: t.space.xxxl, paddingHorizontal: t.space.xl }, style]}>
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: t.color.surfaceSunken, borderColor: t.color.border, borderRadius: t.radius.lg },
        ]}
      >
        <Icon size={26} color={t.color.textTertiary} />
      </View>
      <Text style={[t.type.cardTitle, { color: t.color.text, marginTop: t.space.md, textAlign: "center" }]}>
        {title}
      </Text>
      {description && (
        <Text
          style={[t.type.caption, { color: t.color.textSecondary, marginTop: 4, textAlign: "center", maxWidth: 300 }]}
        >
          {description}
        </Text>
      )}
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onPress={onAction} style={{ marginTop: t.space.lg }}>
          {actionLabel}
        </Button>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Error
// ---------------------------------------------------------------------------

export interface ErrorStateProps {
  title?: string;
  /** The actual failure. Shown verbatim — vague errors are unactionable. */
  message?: string;
  onRetry?: () => void;
  /** Swaps copy and icon for connectivity failures. */
  offline?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function ErrorState({ title, message, onRetry, offline = false, style }: ErrorStateProps) {
  const t = useTokens();
  const Icon = offline ? WifiOff : AlertCircle;

  return (
    <View style={[styles.centered, { paddingVertical: t.space.xxxl, paddingHorizontal: t.space.xl }, style]}>
      <View
        style={[styles.iconWrap, { backgroundColor: t.color.dangerSoft, borderColor: "transparent", borderRadius: t.radius.lg }]}
      >
        <Icon size={26} color={t.color.danger} />
      </View>
      <Text style={[t.type.cardTitle, { color: t.color.text, marginTop: t.space.md, textAlign: "center" }]}>
        {title ?? (offline ? "No connection" : "Something went wrong")}
      </Text>
      <Text
        style={[t.type.caption, { color: t.color.textSecondary, marginTop: 4, textAlign: "center", maxWidth: 320 }]}
      >
        {message ?? (offline ? "Check your network and try again." : "The request didn't complete.")}
      </Text>
      {onRetry && (
        <Button variant="secondary" size="sm" onPress={onRetry} style={{ marginTop: t.space.lg }}>
          Try again
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: "center", justifyContent: "center" },
  iconWrap: { width: 56, height: 56, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  skelRow: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1 },
});
