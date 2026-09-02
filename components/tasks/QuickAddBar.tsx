import React, { useState } from "react";
import { View, TextInput, TouchableOpacity, StyleSheet, Text, Platform, Modal, ScrollView } from "react-native";
import { Plus, Calendar as CalendarIcon, Flag, FolderKanban, ArrowUp, Users, Check, X } from "lucide-react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { useTaskTheme } from "./theme";
import { TaskPriority } from "./types";
import PriorityPill from "./PriorityPill";

export interface QuickAddValue {
  title: string;
  dueDate?: string;
  priority?: TaskPriority;
  projectId?: string;
  assignees?: string[];
}

interface QuickAddBarProps {
  placeholder?: string;
  projectOptions?: { id: string; name: string }[];
  employeeOptions?: { id: string; name: string }[];
  onSubmit: (value: QuickAddValue) => void;
  onOpenFullForm?: () => void;
}

const PRIORITY_CYCLE: TaskPriority[] = ["low", "medium", "high"];

export default function QuickAddBar({
  placeholder = "Add a task…",
  projectOptions = [],
  employeeOptions = [],
  onSubmit,
  onOpenFullForm,
}: QuickAddBarProps) {
  const theme = useTaskTheme();
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<TaskPriority | undefined>(undefined);
  const [dueDate, setDueDate] = useState<string | undefined>(undefined);
  const [assignees, setAssignees] = useState<string[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showAssigneePicker, setShowAssigneePicker] = useState(false);
  const [focused, setFocused] = useState(false);

  const canSubmit = title.trim().length > 0;

  const reset = () => {
    setTitle("");
    setPriority(undefined);
    setDueDate(undefined);
    setAssignees([]);
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({ title: title.trim(), dueDate, priority, assignees });
    reset();
  };

  const toggleAssignee = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setAssignees((prev) => (prev.includes(trimmed) ? prev.filter((n) => n !== trimmed) : [...prev, trimmed]));
  };

  const cyclePriority = () => {
    if (!priority) return setPriority("high");
    const idx = PRIORITY_CYCLE.indexOf(priority);
    setPriority(idx === PRIORITY_CYCLE.length - 1 ? undefined : PRIORITY_CYCLE[idx + 1]);
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.bg.surface,
          borderColor: focused ? theme.border.focus : theme.border.default,
        },
      ]}
    >
      <View style={styles.inputRow}>
        <Plus size={18} color={theme.text.tertiary} />
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder={placeholder}
          placeholderTextColor={theme.text.tertiary}
          style={[styles.input, { color: theme.text.primary }]}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onSubmitEditing={handleSubmit}
          returnKeyType="done"
          blurOnSubmit={Platform.OS !== "web"}
        />
        {canSubmit && (
          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: theme.accent.primary }]}
            onPress={handleSubmit}
            accessibilityLabel="Create task"
          >
            <ArrowUp size={16} color="#FFFFFF" strokeWidth={2.5} />
          </TouchableOpacity>
        )}
      </View>

      {(focused || title.length > 0 || assignees.length > 0 || dueDate || priority) && (
        <View style={[styles.optionsRow, { borderTopColor: theme.border.subtle }]}>
          <TouchableOpacity
            style={[styles.optionChip, { backgroundColor: theme.bg.inset, borderColor: theme.border.subtle }]}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.7}
          >
            <CalendarIcon size={13} color={dueDate ? theme.accent.primary : theme.text.tertiary} />
            <Text style={[styles.optionText, { color: dueDate ? theme.accent.primary : theme.text.secondary }]}>
              {dueDate ? new Date(dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "Date"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.optionChip, { backgroundColor: theme.bg.inset, borderColor: theme.border.subtle }]}
            onPress={cyclePriority}
            activeOpacity={0.7}
          >
            {priority ? (
              <PriorityPill priority={priority} size="sm" />
            ) : (
              <>
                <Flag size={13} color={theme.text.tertiary} />
                <Text style={[styles.optionText, { color: theme.text.secondary }]}>Priority</Text>
              </>
            )}
          </TouchableOpacity>

          {employeeOptions.length > 0 && (
            <TouchableOpacity
              style={[
                styles.optionChip,
                assignees.length > 0 && { backgroundColor: theme.accent.primarySoft, borderColor: theme.accent.primary },
                { backgroundColor: assignees.length > 0 ? theme.accent.primarySoft : theme.bg.inset, borderColor: theme.border.subtle },
              ]}
              onPress={() => setShowAssigneePicker((v) => !v)}
              activeOpacity={0.7}
            >
              <Users size={13} color={assignees.length > 0 ? theme.accent.primary : theme.text.tertiary} />
              <Text
                style={[
                  styles.optionText,
                  { color: assignees.length > 0 ? theme.accent.primary : theme.text.secondary },
                ]}
                numberOfLines={1}
              >
                {assignees.length > 0 ? assignees.join(", ") : "Assign"}
              </Text>
            </TouchableOpacity>
          )}

          {onOpenFullForm && (
            <TouchableOpacity
              style={[styles.optionChip, { backgroundColor: theme.bg.inset, borderColor: theme.border.subtle }]}
              onPress={onOpenFullForm}
              activeOpacity={0.7}
            >
              <FolderKanban size={13} color={theme.text.tertiary} />
              <Text style={[styles.optionText, { color: theme.text.secondary }]}>More details</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {showAssigneePicker && (
        <View style={[styles.assigneeDropdown, { backgroundColor: theme.bg.surfaceRaised, borderColor: theme.border.default }]}>
          <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled>
            {employeeOptions.map((emp) => {
              const checked = assignees.includes(emp.name);
              return (
                <TouchableOpacity
                  key={emp.id}
                  style={styles.assigneeItem}
                  onPress={() => toggleAssignee(emp.name)}
                >
                  <View style={[styles.checkbox, checked && { backgroundColor: theme.accent.primary, borderColor: theme.accent.primary }]}>
                    {checked && <Check size={11} color="#fff" strokeWidth={3} />}
                  </View>
                  <Text style={[styles.assigneeItemText, { color: theme.text.primary }]}>{emp.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      <DateTimePickerModal
        isVisible={showDatePicker}
        mode="date"
        onConfirm={(date) => {
          setDueDate(date.toISOString());
          setShowDatePicker(false);
        }}
        onCancel={() => setShowDatePicker(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  input: {
    flex: 1,
    fontSize: 14.5,
    paddingVertical: Platform.OS === "web" ? 4 : 0,
  },
  submitBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  optionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  optionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 0.5,
  },
  optionText: { fontSize: 12, fontWeight: "600" },
  assigneeDropdown: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 10,
    padding: 6,
  },
  assigneeItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderWidth: 1.5,
    borderColor: "#94a3b8",
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  assigneeItemText: {
    fontSize: 13,
  },
});
