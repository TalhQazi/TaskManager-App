import React from "react";
import {
  View,
  Text,
  Modal as RNModal,
  Pressable,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from "react-native";
import { X, AlertTriangle } from "lucide-react-native";
import { useTokens } from "@/contexts/ThemeContext";
import Button from "./Button";

export interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Footer actions. Usually a cancel + confirm pair. */
  footer?: React.ReactNode;
  /** `sheet` slides from the bottom (default on phones), `center` is a centred dialog. */
  variant?: "sheet" | "center";
  size?: "sm" | "md" | "lg";
  /** Set false for forms with unsaved input, so a stray backdrop tap can't discard work. */
  dismissOnBackdrop?: boolean;
  testID?: string;
}

/**
 * Base dialog.
 *
 * Bottom-sheet by default because this is a native-mobile-first app and a sheet keeps
 * the confirm button inside thumb reach; it widens into a centred dialog on tablets.
 * The body scrolls independently of the header and footer, so the primary action stays
 * visible no matter how long the content is — the old modals pushed their save button
 * off-screen on smaller devices.
 */
export default function Modal({
  visible,
  onClose,
  title,
  subtitle,
  children,
  footer,
  variant,
  size = "md",
  dismissOnBackdrop = true,
  testID,
}: ModalProps) {
  const t = useTokens();
  const { width, height } = useWindowDimensions();

  const isWide = width >= 768;
  const mode = variant ?? (isWide ? "center" : "sheet");
  const maxWidth = { sm: 420, md: 560, lg: 760 }[size];

  return (
    <RNModal
      visible={visible}
      transparent
      animationType={mode === "sheet" ? "slide" : "fade"}
      onRequestClose={onClose}
      statusBarTranslucent
      testID={testID}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <Pressable
          style={[
            styles.backdrop,
            { backgroundColor: t.color.overlay },
            mode === "center" ? styles.backdropCenter : styles.backdropSheet,
          ]}
          onPress={dismissOnBackdrop ? onClose : undefined}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            accessibilityViewIsModal
            style={[
              {
                backgroundColor: t.color.surface,
                maxHeight: height * 0.9,
                width: "100%",
              },
              mode === "center"
                ? { maxWidth, borderRadius: t.radius.xl, borderWidth: 1, borderColor: t.color.border }
                : { borderTopLeftRadius: t.radius.xl, borderTopRightRadius: t.radius.xl },
              t.elevation.lg,
            ]}
          >
            {mode === "sheet" && (
              <View style={styles.grabber}>
                <View style={[styles.grabberBar, { backgroundColor: t.color.borderStrong }]} />
              </View>
            )}

            <View
              style={[
                styles.header,
                { paddingHorizontal: t.space.lg, paddingTop: mode === "sheet" ? t.space.sm : t.space.lg, paddingBottom: t.space.md },
              ]}
            >
              <View style={styles.headerText}>
                <Text style={[t.type.sectionTitle, { color: t.color.text }]}>{title}</Text>
                {subtitle && (
                  <Text style={[t.type.caption, { color: t.color.textSecondary, marginTop: 2 }]}>{subtitle}</Text>
                )}
              </View>
              <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
                <X size={22} color={t.color.textSecondary} />
              </Pressable>
            </View>

            <View style={[styles.divider, { backgroundColor: t.color.border }]} />

            <ScrollView
              style={styles.body}
              contentContainerStyle={{ padding: t.space.lg }}
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </ScrollView>

            {footer && (
              <>
                <View style={[styles.divider, { backgroundColor: t.color.border }]} />
                <View style={[styles.footer, { padding: t.space.lg }]}>{footer}</View>
              </>
            )}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </RNModal>
  );
}

export interface ConfirmDialogProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Renders the confirm button in danger styling. Use for anything irreversible. */
  destructive?: boolean;
  loading?: boolean;
}

/**
 * Required gate in front of destructive operations.
 *
 * Cancel is placed first and confirm second so the destructive action never lands under
 * the thumb's resting position, and the confirm label is specific ("Delete") rather than
 * "OK" so the dialog is readable without its title.
 */
export function ConfirmDialog({
  visible,
  onCancel,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  loading = false,
}: ConfirmDialogProps) {
  const t = useTokens();

  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <Pressable
        style={[styles.backdrop, styles.backdropCenter, { backgroundColor: t.color.overlay }]}
        onPress={loading ? undefined : onCancel}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          accessibilityViewIsModal
          style={[
            styles.confirm,
            { backgroundColor: t.color.surface, borderRadius: t.radius.xl, padding: t.space.xl, borderColor: t.color.border },
            t.elevation.lg,
          ]}
        >
          {destructive && (
            <View
              style={[styles.confirmIcon, { backgroundColor: t.color.dangerSoft, borderRadius: t.radius.lg }]}
            >
              <AlertTriangle size={22} color={t.color.danger} />
            </View>
          )}
          <Text style={[t.type.sectionTitle, { color: t.color.text, textAlign: "center" }]}>{title}</Text>
          <Text
            style={[t.type.body, { color: t.color.textSecondary, textAlign: "center", marginTop: t.space.sm }]}
          >
            {message}
          </Text>

          <View style={[styles.confirmActions, { marginTop: t.space.xl }]}>
            <Button variant="secondary" onPress={onCancel} disabled={loading} style={styles.flex}>
              {cancelLabel}
            </Button>
            <Button
              variant={destructive ? "danger" : "primary"}
              onPress={onConfirm}
              loading={loading}
              style={styles.flex}
            >
              {confirmLabel}
            </Button>
          </View>
        </Pressable>
      </Pressable>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { flex: 1 },
  backdropSheet: { justifyContent: "flex-end" },
  backdropCenter: { justifyContent: "center", alignItems: "center", padding: 20 },
  grabber: { alignItems: "center", paddingVertical: 10 },
  grabberBar: { width: 40, height: 4, borderRadius: 2 },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  headerText: { flex: 1 },
  divider: { height: 1 },
  body: { flexShrink: 1 },
  footer: { flexDirection: "row", justifyContent: "flex-end", gap: 10 },
  confirm: { width: "100%", maxWidth: 380, alignItems: "center", borderWidth: 1 },
  confirmIcon: { width: 52, height: 52, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  confirmActions: { flexDirection: "row", gap: 10, alignSelf: "stretch" },
});
