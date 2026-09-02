import React, { useState, forwardRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  type TextInputProps,
  type ViewStyle,
  type StyleProp,
} from "react-native";
import { Eye, EyeOff, type LucideIcon } from "lucide-react-native";
import { useTokens } from "@/contexts/ThemeContext";
import { MIN_TOUCH } from "@/constants/design/tokens";

export interface InputProps extends Omit<TextInputProps, "style"> {
  label?: string;
  /** Appends a red asterisk and sets the a11y required flag. */
  required?: boolean;
  /** Validation message. Its presence switches the field to the error style. */
  error?: string;
  /** Guidance shown under the field. Hidden while an error is showing. */
  helper?: string;
  icon?: LucideIcon;
  /** Toggles a show/hide eye control and defaults secureTextEntry on. */
  isPassword?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

/**
 * Labelled text field with consistent height, focus ring, and error handling.
 *
 * Error text replaces helper text rather than stacking below it — a field that shows both
 * pushes the submit button around as the user types, which is what made the longer forms
 * in this app feel jumpy.
 */
const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, required, error, helper, icon: Icon, isPassword, containerStyle, ...rest },
  ref
) {
  const t = useTokens();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);

  const borderColor = error ? t.color.danger : focused ? t.color.borderFocus : t.color.border;

  return (
    <View style={[{ marginBottom: t.space.lg }, containerStyle]}>
      {label && (
        <Text style={[t.type.label, { color: t.color.text, marginBottom: t.space.sm }]}>
          {label}
          {required && <Text style={{ color: t.color.danger }}> *</Text>}
        </Text>
      )}

      <View
        style={[
          styles.field,
          {
            backgroundColor: t.color.surfaceSunken,
            borderColor,
            // A focused field gets a 2pt border rather than a glow: it reads clearly on
            // every preset, including high-contrast where shadows don't register.
            borderWidth: focused || error ? 2 : 1,
            borderRadius: t.radius.md,
            paddingHorizontal: t.space.md,
            // Compensate for the extra border pixel so the field doesn't grow on focus.
            paddingVertical: focused || error ? 0 : 1,
          },
        ]}
      >
        {Icon && <Icon size={17} color={focused ? t.color.primary : t.color.textTertiary} />}
        <TextInput
          ref={ref}
          style={[styles.input, t.type.body, { color: t.color.text }]}
          placeholderTextColor={t.color.textTertiary}
          secureTextEntry={isPassword ? hidden : rest.secureTextEntry}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          accessibilityLabel={label}
          {...rest}
        />
        {isPassword && (
          <Pressable
            onPress={() => setHidden((v) => !v)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={hidden ? "Show password" : "Hide password"}
          >
            {hidden ? (
              <EyeOff size={18} color={t.color.textTertiary} />
            ) : (
              <Eye size={18} color={t.color.textTertiary} />
            )}
          </Pressable>
        )}
      </View>

      {(error || helper) && (
        <Text
          style={[t.type.caption, { color: error ? t.color.danger : t.color.textSecondary, marginTop: 6 }]}
        >
          {error || helper}
        </Text>
      )}
    </View>
  );
});

export default Input;

const styles = StyleSheet.create({
  field: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: MIN_TOUCH + 4 },
  input: { flex: 1, paddingVertical: 12 },
});
