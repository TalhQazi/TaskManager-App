import React from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  StyleSheet,
  useWindowDimensions,
  type ViewStyle,
  type StyleProp,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronRight } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useTokens } from "@/contexts/ThemeContext";

export interface Crumb {
  label: string;
  /** expo-router path. Omit on the final crumb. */
  href?: string;
}

export interface ScreenProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  breadcrumbs?: Crumb[];
  /** Right-aligned header actions — typically a primary Button. */
  actions?: React.ReactNode;
  /** Wraps children in a padded ScrollView. Set false for screens owning their own list. */
  scroll?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
  /** Pinned above the scroll area — filter bars, search, tabs. */
  toolbar?: React.ReactNode;
  /** Pinned to the bottom above the safe area — form save bars. */
  footer?: React.ReactNode;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Standard page scaffold: title block, optional breadcrumbs, toolbar, body, footer.
 *
 * Every screen currently re-implements this — with different paddings, different title
 * sizes, and inconsistent safe-area handling. Routing them through one scaffold is what
 * makes separate screens read as one application.
 *
 * Content is width-capped on tablets so text lines don't stretch to 1200pt, which is
 * where the wide-screen layouts currently fall apart.
 */
export default function Screen({
  children,
  title,
  subtitle,
  breadcrumbs,
  actions,
  scroll = true,
  onRefresh,
  refreshing = false,
  toolbar,
  footer,
  padded = true,
  style,
  testID,
}: ScreenProps) {
  const t = useTokens();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const pad = padded ? t.space.lg : 0;
  const maxWidth = width >= 1280 ? 1200 : undefined;

  const header = (title || breadcrumbs || actions) && (
    <View style={{ paddingHorizontal: pad || t.space.lg, paddingTop: t.space.lg, paddingBottom: t.space.md }}>
      {breadcrumbs && breadcrumbs.length > 0 && <Breadcrumbs items={breadcrumbs} />}
      <View style={styles.titleRow}>
        <View style={styles.titleText}>
          {title && (
            <Text style={[t.type.pageTitle, { color: t.color.text }]} numberOfLines={2}>
              {title}
            </Text>
          )}
          {subtitle && (
            <Text style={[t.type.caption, { color: t.color.textSecondary, marginTop: 3 }]} numberOfLines={2}>
              {subtitle}
            </Text>
          )}
        </View>
        {actions && <View style={styles.actions}>{actions}</View>}
      </View>
    </View>
  );

  const body = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={{ padding: pad, paddingBottom: pad + insets.bottom + t.space.xxl }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.color.primary} colors={[t.color.primary]} />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, { paddingHorizontal: pad }]}>{children}</View>
  );

  return (
    <View style={[styles.flex, { backgroundColor: t.color.canvas }, style]} testID={testID}>
      <View style={[styles.flex, maxWidth ? { maxWidth, width: "100%", alignSelf: "center" } : null]}>
        {header}
        {toolbar && (
          <View style={{ paddingHorizontal: pad || t.space.lg, paddingBottom: t.space.md }}>{toolbar}</View>
        )}
        {body}
        {footer && (
          <View
            style={[
              styles.footer,
              {
                backgroundColor: t.color.surface,
                borderTopColor: t.color.border,
                padding: t.space.lg,
                paddingBottom: t.space.lg + insets.bottom,
              },
            ]}
          >
            {footer}
          </View>
        )}
      </View>
    </View>
  );
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const t = useTokens();
  const router = useRouter();

  return (
    <View style={styles.crumbs} accessibilityRole="header">
      {items.map((c, i) => {
        const last = i === items.length - 1;
        return (
          <React.Fragment key={`${c.label}-${i}`}>
            {c.href && !last ? (
              <Pressable
                onPress={() => router.push(c.href as any)}
                hitSlop={6}
                accessibilityRole="link"
                accessibilityLabel={c.label}
              >
                <Text style={[t.type.meta, { color: t.color.textSecondary }]}>{c.label}</Text>
              </Pressable>
            ) : (
              <Text style={[t.type.meta, { color: last ? t.color.text : t.color.textSecondary }]}>{c.label}</Text>
            )}
            {!last && <ChevronRight size={12} color={t.color.textTertiary} />}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  crumbs: { flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap", marginBottom: 6 },
  titleRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  titleText: { flex: 1 },
  actions: { flexDirection: "row", alignItems: "center", gap: 8 },
  footer: { borderTopWidth: 1 },
});
