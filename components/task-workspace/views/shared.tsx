import React from "react";
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native";
import { Inbox } from "lucide-react-native";
import { useTaskTheme } from "@/components/tasks/theme";
import { PRIORITY_META, STATUS_COLUMNS, TaskView } from "../data/workspaceApi";

export function ViewLoading({ label = "Loading tasks…" }: { label?: string }) {
  const theme = useTaskTheme();
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="small" color={theme.accent.primary} />
      <Text style={[styles.loadingText, { color: theme.text.secondary }]}>{label}</Text>
    </View>
  );
}

export function ViewEmpty({
  label = "No tasks match your filters.",
  actionLabel,
  onAction,
}: {
  label?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const theme = useTaskTheme();
  return (
    <View style={styles.emptyContainer}>
      <Inbox size={42} color={theme.text.tertiary} strokeWidth={1.5} />
      <Text style={[styles.emptyText, { color: theme.text.secondary }]}>{label}</Text>
      {actionLabel && onAction && (
        <TouchableOpacity
          style={[styles.emptyActionBtn, { backgroundColor: theme.accent.primary }]}
          onPress={onAction}
          activeOpacity={0.8}
        >
          <Text style={styles.emptyActionText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function dueLabel(due?: string | null): { text: string; color: string } {
  if (!due) return { text: "No due date", color: "#64748B" };
  const d = new Date(due);
  if (isNaN(d.getTime())) return { text: "Invalid date", color: "#64748B" };

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfDue = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOfDue - startOfToday) / DAY_MS);

  const formatted = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });

  if (diffDays < 0) {
    return { text: `${formatted} · overdue`, color: "#EF4444" };
  }
  if (diffDays === 0) {
    return { text: `${formatted} · today`, color: "#F59E0B" };
  }
  if (diffDays <= 2) {
    return { text: `${formatted} · soon`, color: "#F59E0B" };
  }
  return { text: formatted, color: "#64748B" };
}

export function initials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function PriorityBadge({ priority }: { priority: TaskView["priority"] }) {
  const meta = PRIORITY_META[priority] || PRIORITY_META.medium;
  return (
    <View style={[styles.badge, { backgroundColor: meta.bg, borderColor: `${meta.color}40` }]}>
      <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
    </View>
  );
}

export function StatusBadge({ status }: { status: TaskView["status"] }) {
  const meta = STATUS_COLUMNS.find((s) => s.key === status) || STATUS_COLUMNS[0];
  return (
    <View style={[styles.badge, { backgroundColor: meta.bg, borderColor: `${meta.color}40` }]}>
      <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
    </View>
  );
}

export function AvatarStack({
  assignees,
  onPressAssignee,
  max = 3,
}: {
  assignees: string[];
  onPressAssignee?: (name: string) => void;
  max?: number;
}) {
  const theme = useTaskTheme();
  if (!assignees || assignees.length === 0) return null;

  const shown = assignees.slice(0, max);
  const extra = assignees.length - max;

  return (
    <View style={styles.avatarStack}>
      {shown.map((a, i) => (
        <TouchableOpacity
          key={`${a}-${i}`}
          onPress={() => onPressAssignee?.(a)}
          disabled={!onPressAssignee}
          style={[
            styles.avatarBubble,
            {
              backgroundColor: theme.accent.primarySoft,
              borderColor: theme.bg.surface,
              marginLeft: i > 0 ? -6 : 0,
            },
          ]}
          activeOpacity={0.7}
        >
          <Text style={[styles.avatarText, { color: theme.accent.primary }]}>{initials(a)}</Text>
        </TouchableOpacity>
      ))}
      {extra > 0 && (
        <View
          style={[
            styles.avatarBubble,
            {
              backgroundColor: theme.bg.surfaceRaised,
              borderColor: theme.bg.surface,
              marginLeft: -6,
            },
          ]}
        >
          <Text style={[styles.avatarText, { color: theme.text.secondary }]}>+{extra}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: "500",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 56,
    paddingHorizontal: 24,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
  },
  emptyActionBtn: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  emptyActionText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  avatarStack: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarBubble: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  avatarText: {
    fontSize: 10,
    fontWeight: "700",
  },
});
