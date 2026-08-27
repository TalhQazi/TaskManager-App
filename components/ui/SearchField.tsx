import React, { useEffect, useRef, useState } from "react";
import { View, TextInput, Pressable, StyleSheet, type ViewStyle, type StyleProp } from "react-native";
import { Search, X } from "lucide-react-native";
import { useTokens } from "@/contexts/ThemeContext";
import { MIN_TOUCH } from "@/constants/design/tokens";

export interface SearchFieldProps {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  /**
   * Debounced callback, in ms. Use this — not onChangeText — to trigger network queries,
   * so typing doesn't fire a request per keystroke on the large admin lists.
   */
  debounceMs?: number;
  onDebouncedChange?: (v: string) => void;
  autoFocus?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export default function SearchField({
  value,
  onChangeText,
  placeholder = "Search",
  debounceMs = 300,
  onDebouncedChange,
  autoFocus,
  style,
  testID,
}: SearchFieldProps) {
  const t = useTokens();
  const [focused, setFocused] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!onDebouncedChange) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onDebouncedChange(value), debounceMs);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [value, debounceMs, onDebouncedChange]);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: t.color.surfaceSunken,
          borderColor: focused ? t.color.borderFocus : t.color.border,
          borderWidth: focused ? 2 : 1,
          borderRadius: t.radius.md,
          paddingHorizontal: t.space.md,
        },
        style,
      ]}
    >
      <Search size={17} color={focused ? t.color.primary : t.color.textTertiary} />
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={t.color.textTertiary}
        autoFocus={autoFocus}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        clearButtonMode="never"
        accessibilityLabel={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[t.type.body, styles.input, { color: t.color.text }]}
      />
      {value.length > 0 && (
        <Pressable
          onPress={() => onChangeText("")}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
        >
          <X size={17} color={t.color.textTertiary} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: MIN_TOUCH },
  input: { flex: 1, paddingVertical: 10 },
});
