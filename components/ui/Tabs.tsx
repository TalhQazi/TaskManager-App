import React from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, type ViewStyle, type StyleProp } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { useTokens } from "@/contexts/ThemeContext";
import { MIN_TOUCH } from "@/constants/design/tokens";

export interface TabItem<T extends string = string> {
  key: T;
  label: string;
  icon?: LucideIcon;
  /** Numeric affordance, e.g. how many rows are in that tab. */
  count?: number;
}

export interface TabsProps<T extends string = string> {
  items: TabItem<T>[];
  value: T;
  onChange: (key: T) => void;
  /** `underline` for page-level sections, `segmented` for filter switches. */
  variant?: "underline" | "segmented";
  style?: StyleProp<ViewStyle>;
}

/**
 * Horizontal tab switcher.
 *
 * Scrolls rather than wrapping or squeezing — several screens here have 6+ sections, and
 * compressing them to fit produced 8pt labels on phones. Active state is signalled by
 * weight and colour as well as the indicator, so it survives the greyscale presets.
 */
export default function Tabs<T extends string = string>({
  items,
  value,
  onChange,
  variant = "underline",
  style,
}: TabsProps<T>) {
  const t = useTokens();
  const segmented = variant === "segmented";

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[
        !segmented && { borderBottomWidth: 1, borderBottomColor: t.color.border },
        style,
      ]}
      contentContainerStyle={[
        styles.row,
        segmented && {
          backgroundColor: t.color.surfaceSunken,
          borderRadius: t.radius.md,
          padding: 3,
          gap: 3,
        },
      ]}
    >
      {items.map((item) => {
        const active = item.key === value;
        const Icon = item.icon;
        const fg = active ? (segmented ? t.color.text : t.color.primary) : t.color.textSecondary;

        return (
          <Pressable
            key={item.key}
            onPress={() => onChange(item.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={item.label}
            style={({ pressed }) => [
              styles.tab,
              segmented
                ? {
                    borderRadius: t.radius.sm,
                    backgroundColor: active ? t.color.surface : "transparent",
                    paddingHorizontal: t.space.md,
                  }
                : {
                    borderBottomWidth: 2,
                    borderBottomColor: active ? t.color.primary : "transparent",
                    paddingHorizontal: t.space.md,
                  },
              pressed && { opacity: 0.6 },
            ]}
          >
            {Icon && <Icon size={16} color={fg} />}
            <Text style={[t.type.button, { color: fg, fontWeight: active ? "700" : "500" }]} numberOfLines={1}>
              {item.label}
            </Text>
            {typeof item.count === "number" && (
              <View
                style={[
                  styles.count,
                  { backgroundColor: active ? t.color.primarySoft : t.color.surfaceSunken, borderRadius: t.radius.pill },
                ]}
              >
                <Text style={[t.type.meta, { color: active ? t.color.primary : t.color.textTertiary }]}>
                  {item.count}
                </Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  tab: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: MIN_TOUCH },
  count: { paddingHorizontal: 6, paddingVertical: 1, minWidth: 20, alignItems: "center" },
});
