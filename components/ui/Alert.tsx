import React from "react";
import { View, Text, Pressable, StyleSheet, type ViewStyle, type StyleProp } from "react-native";
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react-native";
import { useTokens } from "@/contexts/ThemeContext";

export type AlertTone = "success" | "warning" | "danger" | "info";

export interface AlertProps {
  tone?: AlertTone;
  title?: string;
  message: string;
  /** Trailing slot for a retry/undo action. */
  action?: React.ReactNode;
  onDismiss?: () => void;
  style?: StyleProp<ViewStyle>;
}

const ICONS = { success: CheckCircle2, warning: AlertTriangle, danger: XCircle, info: Info } as const;

/**
 * Inline, non-blocking message banner — for state that belongs to a region of the page
 * (a failed section load, a pending-approval notice). Transient feedback about an action
 * the user just took belongs in a toast instead; see hooks/use-toast.
 */
export default function Alert({ tone = "info", title, message, action, onDismiss, style }: AlertProps) {
  const t = useTokens();
  const Icon = ICONS[tone];

  const fg = { success: t.color.success, warning: t.color.warning, danger: t.color.danger, info: t.color.info }[tone];
  const bg = {
    success: t.color.successSoft,
    warning: t.color.warningSoft,
    danger: t.color.dangerSoft,
    info: t.color.infoSoft,
  }[tone];

  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.container,
        { backgroundColor: bg, borderRadius: t.radius.md, padding: t.space.md, borderLeftColor: fg },
        style,
      ]}
    >
      <Icon size={18} color={fg} />
      <View style={styles.body}>
        {title && <Text style={[t.type.cardTitle, { color: t.color.text }]}>{title}</Text>}
        <Text style={[t.type.bodySm, { color: t.color.textSecondary, marginTop: title ? 2 : 0 }]}>{message}</Text>
        {action && <View style={{ marginTop: t.space.sm }}>{action}</View>}
      </View>
      {onDismiss && (
        <Pressable onPress={onDismiss} hitSlop={10} accessibilityRole="button" accessibilityLabel="Dismiss">
          <X size={16} color={t.color.textTertiary} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: "row", alignItems: "flex-start", gap: 10, borderLeftWidth: 3 },
  body: { flex: 1 },
});
