import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  FlatList,
  TextInput,
  StyleSheet,
  type ViewStyle,
  type StyleProp,
} from "react-native";
import { ChevronDown, Check, Search, X } from "lucide-react-native";
import { useTheme } from "@/contexts/ThemeContext";
import { MIN_TOUCH } from "@/constants/design/tokens";

export interface SelectOption<T = string> {
  value: T;
  label: string;
  /** Optional second line — e.g. an email under a person's name. */
  description?: string;
  disabled?: boolean;
}

export interface SelectProps<T = string> {
  options: SelectOption<T>[];
  value: T | null | undefined;
  onChange: (value: T) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
  helper?: string;
  disabled?: boolean;
  /** Adds a filter box. Auto-enables past 8 options. */
  searchable?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Dropdown built on a bottom sheet rather than an inline popover.
 *
 * The app previously used @react-native-picker/picker in some screens and hand-rolled
 * absolute-positioned menus in others; the popovers clipped inside ScrollViews and were
 * unusable on small screens. A sheet is the native-correct pattern, can't clip, and gives
 * long option lists room to be searched and scrolled.
 */
export default function Select<T extends string | number = string>({
  options,
  value,
  onChange,
  label,
  placeholder = "Select…",
  required,
  error,
  helper,
  disabled,
  searchable,
  containerStyle,
  testID,
}: SelectProps<T>) {
  const { tokens: t } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = options.find((o) => o.value === value);
  const showSearch = searchable ?? options.length > 8;

  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || o.description?.toLowerCase().includes(q)
    );
  }, [options, query]);

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  return (
    <View style={[{ marginBottom: t.space.lg }, containerStyle]}>
      {label && (
        <Text style={[t.type.label, { color: t.color.text, marginBottom: t.space.sm }]}>
          {label}
          {required && <Text style={{ color: t.color.danger }}> *</Text>}
        </Text>
      )}

      <Pressable
        testID={testID}
        onPress={disabled ? undefined : () => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={label ?? placeholder}
        accessibilityValue={{ text: selected?.label ?? "none" }}
        accessibilityState={{ disabled: !!disabled, expanded: open }}
        style={({ pressed }) => [
          styles.trigger,
          {
            backgroundColor: t.color.surfaceSunken,
            borderColor: error ? t.color.danger : t.color.border,
            borderWidth: error ? 2 : 1,
            borderRadius: t.radius.md,
            paddingHorizontal: t.space.md,
          },
          pressed && { backgroundColor: t.color.surfaceActive },
          disabled && { opacity: 0.5 },
        ]}
      >
        <Text
          numberOfLines={1}
          style={[t.type.body, { flex: 1, color: selected ? t.color.text : t.color.textTertiary }]}
        >
          {selected?.label ?? placeholder}
        </Text>
        <ChevronDown size={18} color={t.color.textTertiary} />
      </Pressable>

      {(error || helper) && (
        <Text style={[t.type.caption, { color: error ? t.color.danger : t.color.textSecondary, marginTop: 6 }]}>
          {error || helper}
        </Text>
      )}

      <Modal visible={open} transparent animationType="slide" onRequestClose={close}>
        <Pressable style={[styles.backdrop, { backgroundColor: t.color.overlay }]} onPress={close}>
          {/* Stop propagation so taps inside the sheet don't dismiss it. */}
          <Pressable
            style={[
              styles.sheet,
              { backgroundColor: t.color.surface, borderTopLeftRadius: t.radius.xl, borderTopRightRadius: t.radius.xl },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.grabber}>
              <View style={[styles.grabberBar, { backgroundColor: t.color.borderStrong }]} />
            </View>

            <View style={[styles.sheetHeader, { paddingHorizontal: t.space.lg }]}>
              <Text style={[t.type.sectionTitle, { color: t.color.text, flex: 1 }]}>{label ?? "Select"}</Text>
              <Pressable onPress={close} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
                <X size={22} color={t.color.textSecondary} />
              </Pressable>
            </View>

            {showSearch && (
              <View
                style={[
                  styles.search,
                  {
                    backgroundColor: t.color.surfaceSunken,
                    borderColor: t.color.border,
                    borderRadius: t.radius.md,
                    marginHorizontal: t.space.lg,
                  },
                ]}
              >
                <Search size={16} color={t.color.textTertiary} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search options"
                  placeholderTextColor={t.color.textTertiary}
                  style={[t.type.body, { flex: 1, color: t.color.text, paddingVertical: 10 }]}
                  autoFocus
                />
              </View>
            )}

            <FlatList
              data={filtered}
              keyExtractor={(item) => String(item.value)}
              keyboardShouldPersistTaps="handled"
              style={{ marginTop: t.space.sm }}
              contentContainerStyle={{ paddingBottom: t.space.xxl }}
              ListEmptyComponent={
                <Text
                  style={[t.type.caption, { color: t.color.textSecondary, textAlign: "center", padding: t.space.xl }]}
                >
                  No options match “{query}”.
                </Text>
              }
              renderItem={({ item }) => {
                const isSelected = item.value === value;
                return (
                  <Pressable
                    disabled={item.disabled}
                    onPress={() => {
                      onChange(item.value);
                      close();
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected, disabled: !!item.disabled }}
                    style={({ pressed }) => [
                      styles.option,
                      { paddingHorizontal: t.space.lg },
                      pressed && { backgroundColor: t.color.surfaceActive },
                      item.disabled && { opacity: 0.4 },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[t.type.body, { color: isSelected ? t.color.primary : t.color.text }]}>
                        {item.label}
                      </Text>
                      {item.description && (
                        <Text style={[t.type.caption, { color: t.color.textSecondary, marginTop: 2 }]}>
                          {item.description}
                        </Text>
                      )}
                    </View>
                    {isSelected && <Check size={19} color={t.color.primary} />}
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: MIN_TOUCH + 4 },
  backdrop: { flex: 1, justifyContent: "flex-end" },
  sheet: { maxHeight: "75%", paddingBottom: 8 },
  grabber: { alignItems: "center", paddingVertical: 10 },
  grabberBar: { width: 40, height: 4, borderRadius: 2 },
  sheetHeader: { flexDirection: "row", alignItems: "center", paddingBottom: 12 },
  search: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, paddingHorizontal: 12 },
  option: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 52, paddingVertical: 10 },
});
