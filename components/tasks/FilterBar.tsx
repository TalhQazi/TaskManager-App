import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Modal } from "react-native";
import { ChevronDown, X } from "lucide-react-native";
import { useTaskTheme } from "./theme";
import { TaskPriority, TaskStatus } from "./types";

export interface TaskFilters {
  status?: TaskStatus | "all";
  priority?: TaskPriority | "all";
  projectId?: string | "all";
}

interface FilterBarProps {
  filters: TaskFilters;
  onChange: (next: TaskFilters) => void;
  projectOptions?: { id: string; name: string }[];
}

const STATUS_OPTIONS: { key: TaskStatus | "all"; label: string }[] = [
  { key: "all", label: "Any status" },
  { key: "pending", label: "Pending" },
  { key: "in-progress", label: "In Progress" },
  { key: "completed", label: "Completed" },
  { key: "overdue", label: "Overdue" },
];
const PRIORITY_OPTIONS: { key: TaskPriority | "all"; label: string }[] = [
  { key: "all", label: "Any priority" },
  { key: "urgent", label: "Urgent" },
  { key: "high", label: "High" },
  { key: "medium", label: "Medium" },
  { key: "low", label: "Low" },
];

export default function FilterBar({ filters, onChange, projectOptions = [] }: FilterBarProps) {
  const theme = useTaskTheme();
  const [openMenu, setOpenMenu] = useState<"status" | "priority" | "project" | null>(null);

  const activeCount = [filters.status, filters.priority, filters.projectId].filter(
    (v) => v && v !== "all"
  ).length;

  const projectLabel =
    filters.projectId && filters.projectId !== "all"
      ? projectOptions.find((p) => p.id === filters.projectId)?.name || "Project"
      : "Any project";
  const statusLabel = STATUS_OPTIONS.find((s) => s.key === (filters.status || "all"))!.label;
  const priorityLabel = PRIORITY_OPTIONS.find((p) => p.key === (filters.priority || "all"))!.label;

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        <FilterChip label={statusLabel} active={filters.status !== undefined && filters.status !== "all"} onPress={() => setOpenMenu("status")} />
        <FilterChip label={priorityLabel} active={filters.priority !== undefined && filters.priority !== "all"} onPress={() => setOpenMenu("priority")} />
        {projectOptions.length > 0 && (
          <FilterChip label={projectLabel} active={filters.projectId !== undefined && filters.projectId !== "all"} onPress={() => setOpenMenu("project")} />
        )}
        {activeCount > 0 && (
          <TouchableOpacity
            style={styles.clearChip}
            onPress={() => onChange({ status: "all", priority: "all", projectId: "all" })}
          >
            <X size={12} color={theme.text.tertiary} />
            <Text style={[styles.clearText, { color: theme.text.secondary }]}>Clear</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <Modal visible={openMenu !== null} transparent animationType="fade" onRequestClose={() => setOpenMenu(null)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setOpenMenu(null)}>
          <View style={[styles.menu, { backgroundColor: theme.bg.surfaceRaised, borderColor: theme.border.default }]}>
            {openMenu === "status" &&
              STATUS_OPTIONS.map((opt) => (
                <MenuRow key={opt.key} label={opt.label} onPress={() => { onChange({ ...filters, status: opt.key }); setOpenMenu(null); }} />
              ))}
            {openMenu === "priority" &&
              PRIORITY_OPTIONS.map((opt) => (
                <MenuRow key={opt.key} label={opt.label} onPress={() => { onChange({ ...filters, priority: opt.key }); setOpenMenu(null); }} />
              ))}
            {openMenu === "project" && (
              <>
                <MenuRow label="Any project" onPress={() => { onChange({ ...filters, projectId: "all" }); setOpenMenu(null); }} />
                {projectOptions.map((p) => (
                  <MenuRow key={p.id} label={p.name} onPress={() => { onChange({ ...filters, projectId: p.id }); setOpenMenu(null); }} />
                ))}
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const theme = useTaskTheme();
  return (
    <TouchableOpacity
      style={[
        styles.chip,
        {
          backgroundColor: active ? theme.accent.primarySoft : theme.bg.surface,
          borderColor: active ? theme.accent.primary : theme.border.default,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.chipText,
          {
            color: active ? theme.accent.primary : theme.text.secondary,
            fontWeight: active ? "700" : "600",
          },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
      <ChevronDown size={12} color={active ? theme.accent.primary : theme.text.tertiary} />
    </TouchableOpacity>
  );
}

function MenuRow({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useTaskTheme();
  return (
    <TouchableOpacity style={styles.menuRow} onPress={onPress} activeOpacity={0.7}>
      <Text style={[styles.menuRowText, { color: theme.text.primary }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingVertical: 8, alignItems: "center" },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
    maxWidth: 160,
  },
  chipText: { fontSize: 12 },
  clearChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 6 },
  clearText: { fontSize: 12, fontWeight: "600" },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 24 },
  menu: {
    borderRadius: 16,
    borderWidth: 1,
    width: "100%",
    maxWidth: 320,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  menuRow: { paddingHorizontal: 18, paddingVertical: 12 },
  menuRowText: { fontSize: 14, fontWeight: "600" },
});
