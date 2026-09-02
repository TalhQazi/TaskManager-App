import React, { useEffect, useRef } from "react";
import { View, Text, Animated, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CheckCircle2, AlertTriangle, XCircle, Info, Bell, X } from "lucide-react-native";
import { useToast, type ToasterToast } from "@/hooks/use-toast";
import { useTokens } from "@/contexts/ThemeContext";
import type { Tokens } from "@/constants/design/tokens";

/**
 * Global toast surface.
 *
 * Previously a fixed dark card at `top: 60` with hardcoded colours — it ignored the theme,
 * overlapped the notch on newer devices, and had no way to dismiss early. Now it sits
 * below the safe-area inset, animates in, is tappable to dismiss, and reads its colours
 * from the active preset.
 *
 * `pointerEvents="box-none"` on the container is what keeps it non-blocking: the empty
 * space around the toasts stays interactive, so a toast never intercepts a tap meant for
 * the screen underneath.
 */
export function Toaster() {
  const { toasts, dismiss } = useToast();
  const insets = useSafeAreaInsets();

  const visible = toasts.filter((t) => t.open !== false);
  if (!visible.length) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.container, { top: insets.top + 8 }]}
      accessibilityLiveRegion="polite"
    >
      {visible.map((t) => (
        <ToastCard key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
      ))}
    </View>
  );
}

function ToastCard({ toast, onDismiss }: { toast: ToasterToast; onDismiss: () => void }) {
  const t = useTokens();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: 1,
      useNativeDriver: true,
      damping: 18,
      stiffness: 190,
    }).start();
  }, [anim]);

  const { Icon, fg } = toastSkin(t, toast.variant);

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: t.color.surfaceRaised,
          borderColor: t.color.border,
          borderRadius: t.radius.lg,
          borderLeftColor: fg,
          opacity: anim,
          transform: [
            { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) },
            { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }) },
          ],
        },
        t.elevation.lg,
      ]}
    >
      <Pressable style={styles.pressable} onPress={onDismiss} accessibilityRole="alert">
        <Icon size={19} color={fg} />
        <View style={styles.body}>
          {toast.title && (
            <Text style={[t.type.cardTitle, { color: t.color.text }]} numberOfLines={2}>
              {toast.title}
            </Text>
          )}
          {toast.description && (
            <Text
              style={[t.type.bodySm, { color: t.color.textSecondary, marginTop: toast.title ? 2 : 0 }]}
              numberOfLines={3}
            >
              {toast.description}
            </Text>
          )}
        </View>
        <X size={16} color={t.color.textTertiary} />
      </Pressable>
    </Animated.View>
  );
}

function toastSkin(t: Tokens, variant: ToasterToast["variant"]) {
  switch (variant) {
    case "success":
      return { Icon: CheckCircle2, fg: t.color.success };
    // "destructive" is the legacy name for the error variant; both map to danger.
    case "destructive":
      return { Icon: XCircle, fg: t.color.danger };
    case "warning":
      return { Icon: AlertTriangle, fg: t.color.warning };
    case "info":
      return { Icon: Info, fg: t.color.info };
    default:
      return { Icon: Bell, fg: t.color.textSecondary };
  }
}

const styles = StyleSheet.create({
  container: { position: "absolute", left: 12, right: 12, zIndex: 9999, gap: 8 },
  toast: { borderWidth: 1, borderLeftWidth: 3, overflow: "hidden" },
  pressable: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 14 },
  body: { flex: 1 },
});
