import React from "react";
import { View, Text, Pressable, StyleSheet, useWindowDimensions, type ViewStyle, type StyleProp } from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { useTokens } from "@/contexts/ThemeContext";
import { MIN_TOUCH } from "@/constants/design/tokens";

export interface PaginationProps {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  /** Shows "N–M of T" when provided. */
  totalItems?: number;
  pageSize?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * 1-indexed pager with a windowed page list.
 *
 * On phones the numbered buttons collapse to "Page N of M" — eleven 44pt targets don't
 * fit across a 360pt screen, and the prev/next pair is what actually gets used there.
 */
export default function Pagination({
  page,
  pageCount,
  onPageChange,
  totalItems,
  pageSize,
  style,
}: PaginationProps) {
  const t = useTokens();
  const { width } = useWindowDimensions();
  const compact = width < 600;

  if (pageCount <= 1) {
    if (totalItems != null && totalItems > 0) {
      return (
        <View style={[styles.container, { paddingVertical: t.space.sm }, style]}>
          <Text style={[t.type.caption, { color: t.color.textSecondary }]}>
            Showing {totalItems} {totalItems === 1 ? "item" : "items"} (25 per page)
          </Text>
        </View>
      );
    }
    return null;
  }

  const clamp = (p: number) => Math.max(1, Math.min(pageCount, p));
  const go = (p: number) => {
    const next = clamp(p);
    if (next !== page) onPageChange(next);
  };

  const rangeLabel =
    totalItems != null && pageSize != null
      ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, totalItems)} of ${totalItems}`
      : null;

  return (
    <View style={[styles.container, { paddingVertical: t.space.md, gap: t.space.md }, style]}>
      {rangeLabel && (
        <Text style={[t.type.caption, { color: t.color.textSecondary }]}>{rangeLabel}</Text>
      )}

      <View style={styles.controls}>
        <PageButton
          icon={ChevronLeft}
          label="Previous page"
          disabled={page <= 1}
          onPress={() => go(page - 1)}
        />

        {compact ? (
          <Text style={[t.type.label, { color: t.color.text, paddingHorizontal: t.space.md }]}>
            Page {page} of {pageCount}
          </Text>
        ) : (
          pageWindow(page, pageCount).map((p, i) =>
            p === "…" ? (
              <Text key={`gap-${i}`} style={[t.type.caption, { color: t.color.textTertiary, paddingHorizontal: 6 }]}>
                …
              </Text>
            ) : (
              <Pressable
                key={p}
                onPress={() => go(p)}
                accessibilityRole="button"
                accessibilityLabel={`Page ${p}`}
                accessibilityState={{ selected: p === page }}
                style={({ pressed }) => [
                  styles.pageBtn,
                  {
                    borderRadius: t.radius.sm,
                    backgroundColor: p === page ? t.color.primary : "transparent",
                    borderColor: p === page ? "transparent" : t.color.border,
                    borderWidth: p === page ? 0 : 1,
                  },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text
                  style={[t.type.label, { color: p === page ? t.color.textOnPrimary : t.color.textSecondary }]}
                >
                  {p}
                </Text>
              </Pressable>
            )
          )
        )}

        <PageButton
          icon={ChevronRight}
          label="Next page"
          disabled={page >= pageCount}
          onPress={() => go(page + 1)}
        />
      </View>
    </View>
  );

  function PageButton({
    icon: Icon,
    label,
    disabled,
    onPress,
  }: {
    icon: typeof ChevronLeft;
    label: string;
    disabled: boolean;
    onPress: () => void;
  }) {
    return (
      <Pressable
        onPress={disabled ? undefined : onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
        style={({ pressed }) => [
          styles.pageBtn,
          { borderRadius: t.radius.sm, borderWidth: 1, borderColor: t.color.border },
          pressed && !disabled && { backgroundColor: t.color.surfaceActive },
          disabled && { opacity: 0.35 },
        ]}
      >
        <Icon size={18} color={t.color.textSecondary} />
      </Pressable>
    );
  }
}

/** Windowed page numbers: 1 … 4 [5] 6 … 20 — caps the control at a fixed width. */
function pageWindow(page: number, pageCount: number): (number | "…")[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);

  const out: (number | "…")[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(pageCount - 1, page + 1);

  if (start > 2) out.push("…");
  for (let p = start; p <= end; p++) out.push(p);
  if (end < pageCount - 1) out.push("…");
  out.push(pageCount);

  return out;
}

const styles = StyleSheet.create({
  container: { alignItems: "center" },
  controls: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap", justifyContent: "center" },
  pageBtn: { minWidth: MIN_TOUCH, height: MIN_TOUCH, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
});
