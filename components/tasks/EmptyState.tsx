import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { LucideIcon, Inbox as InboxIcon, Plus } from "lucide-react-native";
import { useTaskTheme } from "./theme";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({ icon: Icon = InboxIcon, title, description, actionLabel, onAction }: EmptyStateProps) {
  const theme = useTaskTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.iconWrap, { backgroundColor: theme.bg.surface, borderColor: theme.border.default }]}>
        <Icon size={28} color={theme.text.tertiary} />
      </View>
      <Text style={[styles.title, { color: theme.text.primary }]}>{title}</Text>
      <Text style={[styles.description, { color: theme.text.secondary }]}>{description}</Text>
      {actionLabel && onAction && (
        <TouchableOpacity
          style={[styles.action, { backgroundColor: theme.accent.primary }]}
          onPress={onAction}
          activeOpacity={0.8}
        >
          <Plus size={15} color="#FFFFFF" strokeWidth={2.5} />
          <Text style={styles.actionText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  title: {
    fontSize: 15.5,
    fontWeight: "700",
    marginBottom: 6,
    textAlign: "center",
    letterSpacing: -0.2,
  },
  description: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
    maxWidth: 290,
  },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    marginTop: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
});
