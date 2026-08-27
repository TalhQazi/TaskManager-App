import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  type ViewStyle,
  type StyleProp,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react-native";
import { useTokens } from "@/contexts/ThemeContext";
import { EmptyState, ErrorState, SkeletonList } from "./States";

export interface Column<T> {
  key: string;
  header: string;
  /** Cell renderer. Return a string for the default text treatment, or any node. */
  render: (row: T) => React.ReactNode;
  /** Fixed column width in px. Omit to size by `flex`. */
  width?: number;
  flex?: number;
  align?: "left" | "right" | "center";
  /** Provide to make the column sortable. Return a comparable primitive. */
  sortValue?: (row: T) => string | number;
  /** Hide on narrow screens. Use for secondary columns. */
  hideOnCompact?: boolean;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (row: T) => string;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onRowPress?: (row: T) => void;
  /** Rendered when data is empty and not loading. */
  emptyTitle?: string;
  emptyDescription?: string;
  /** True when filters/search are active, so the empty state offers to clear them. */
  isFiltered?: boolean;
  onClearFilters?: () => void;
  /** Forces the card layout regardless of width. */
  forceCards?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Responsive collection view.
 *
 * Below 768pt it renders stacked cards, not a horizontally-scrolling grid: a five-column
 * table on a phone forces sideways scrolling to read a single record, which is the single
 * worst pattern in the current admin screens. At tablet width and above it becomes a real
 * table with a sticky header and sortable columns.
 *
 * Rows go through FlashList (already a dependency) so the long admin lists stay smooth.
 */
export default function DataTable<T>({
  data,
  columns,
  keyExtractor,
  loading = false,
  error = null,
  onRetry,
  onRowPress,
  emptyTitle = "Nothing here yet",
  emptyDescription,
  isFiltered = false,
  onClearFilters,
  forceCards = false,
  style,
}: DataTableProps<T>) {
  const t = useTokens();
  const { width } = useWindowDimensions();
  const compact = forceCards || width < 768;

  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const visibleColumns = useMemo(
    () => (compact ? columns : columns.filter((c) => !(c.hideOnCompact && width < 1024))),
    [columns, compact, width]
  );

  const sorted = useMemo(() => {
    if (!sortKey) return data;
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sortValue) return data;
    // Copy before sorting — mutating the caller's array would fight React Query's cache.
    return [...data].sort((a, b) => {
      const va = col.sortValue!(a);
      const vb = col.sortValue!(b);
      if (va === vb) return 0;
      const cmp = va < vb ? -1 : 1;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir, columns]);

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  if (loading) return <SkeletonList rows={6} style={style} />;

  if (error) {
    return <ErrorState message={error} onRetry={onRetry} style={style} />;
  }

  if (!data.length) {
    return (
      <EmptyState
        variant={isFiltered ? "search" : "empty"}
        title={isFiltered ? "No matching results" : emptyTitle}
        description={
          isFiltered ? "Try a different search term or clear the active filters." : emptyDescription
        }
        actionLabel={isFiltered && onClearFilters ? "Clear filters" : undefined}
        onAction={onClearFilters}
        style={style}
      />
    );
  }

  // ---- Compact: stacked cards -------------------------------------------------
  if (compact) {
    return (
      <View style={[styles.fill, style]}>
        <FlashList
          data={sorted}
          keyExtractor={keyExtractor}
          contentContainerStyle={{ paddingBottom: t.space.xxl }}
          renderItem={({ item }) => (
            <Pressable
              onPress={onRowPress ? () => onRowPress(item) : undefined}
              accessibilityRole={onRowPress ? "button" : undefined}
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: t.color.surface,
                  borderColor: t.color.border,
                  borderRadius: t.radius.lg,
                  padding: t.space.lg,
                  marginBottom: t.space.md,
                },
                pressed && onRowPress && { backgroundColor: t.color.surfaceActive },
              ]}
            >
              {visibleColumns.map((col, i) => {
                const content = col.render(item);
                return (
                  <View key={col.key} style={[styles.cardRow, i > 0 && { marginTop: t.space.sm }]}>
                    <Text style={[t.type.meta, { color: t.color.textTertiary, width: 96 }]} numberOfLines={1}>
                      {col.header}
                    </Text>
                    <View style={styles.cardValue}>
                      {typeof content === "string" || typeof content === "number" ? (
                        <Text style={[t.type.bodySm, { color: t.color.text }]}>{content}</Text>
                      ) : (
                        content
                      )}
                    </View>
                  </View>
                );
              })}
            </Pressable>
          )}
        />
      </View>
    );
  }

  // ---- Wide: real table -------------------------------------------------------
  return (
    <View
      style={[
        styles.fill,
        { borderWidth: 1, borderColor: t.color.border, borderRadius: t.radius.lg, overflow: "hidden", backgroundColor: t.color.surface },
        style,
      ]}
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.grow}>
        <View style={styles.grow}>
          {/* Header stays put while the body scrolls, so column meaning is never lost. */}
          <View style={[styles.headerRow, { backgroundColor: t.color.surfaceSunken, borderBottomColor: t.color.border, paddingHorizontal: t.space.lg }]}>
            {visibleColumns.map((col) => {
              const sortable = !!col.sortValue;
              const active = sortKey === col.key;
              const Icon = !active ? ChevronsUpDown : sortDir === "asc" ? ChevronUp : ChevronDown;
              return (
                <Pressable
                  key={col.key}
                  disabled={!sortable}
                  onPress={() => toggleSort(col.key)}
                  accessibilityRole={sortable ? "button" : undefined}
                  accessibilityLabel={sortable ? `Sort by ${col.header}` : undefined}
                  style={[
                    styles.cell,
                    col.width ? { width: col.width } : { flex: col.flex ?? 1 },
                    { justifyContent: alignToJustify(col.align) },
                  ]}
                >
                  <Text style={[t.type.label, { color: active ? t.color.primary : t.color.textSecondary }]} numberOfLines={1}>
                    {col.header}
                  </Text>
                  {sortable && <Icon size={13} color={active ? t.color.primary : t.color.textTertiary} />}
                </Pressable>
              );
            })}
          </View>

          <FlashList
            data={sorted}
            keyExtractor={keyExtractor}
            renderItem={({ item, index }) => (
              <Pressable
                onPress={onRowPress ? () => onRowPress(item) : undefined}
                accessibilityRole={onRowPress ? "button" : undefined}
                style={({ pressed, hovered }: any) => [
                  styles.bodyRow,
                  { borderBottomColor: t.color.borderSubtle, paddingHorizontal: t.space.lg },
                  // Zebra striping is subtle enough to aid tracking without banding the page.
                  index % 2 === 1 && { backgroundColor: t.color.surfaceSunken },
                  (pressed || hovered) && onRowPress && { backgroundColor: t.color.surfaceActive },
                ]}
              >
                {visibleColumns.map((col) => {
                  const content = col.render(item);
                  return (
                    <View
                      key={col.key}
                      style={[
                        styles.cell,
                        col.width ? { width: col.width } : { flex: col.flex ?? 1 },
                        { justifyContent: alignToJustify(col.align) },
                      ]}
                    >
                      {typeof content === "string" || typeof content === "number" ? (
                        <Text style={[t.type.bodySm, { color: t.color.text }]} numberOfLines={2}>
                          {content}
                        </Text>
                      ) : (
                        content
                      )}
                    </View>
                  );
                })}
              </Pressable>
            )}
          />
        </View>
      </ScrollView>
    </View>
  );
}

function alignToJustify(align?: "left" | "right" | "center") {
  return align === "right" ? "flex-end" : align === "center" ? "center" : "flex-start";
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  grow: { flexGrow: 1 },
  headerRow: { flexDirection: "row", alignItems: "center", minHeight: 44, borderBottomWidth: 1 },
  bodyRow: { flexDirection: "row", alignItems: "center", minHeight: 52, borderBottomWidth: 1 },
  cell: { flexDirection: "row", alignItems: "center", gap: 5, paddingRight: 12, minWidth: 80 },
  card: { borderWidth: 1 },
  cardRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  cardValue: { flex: 1, alignItems: "flex-start" },
});
