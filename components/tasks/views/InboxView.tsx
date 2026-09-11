import React, { useMemo } from "react";
import { View, FlatList, StyleSheet } from "react-native";
import { Inbox } from "lucide-react-native";
import { useTaskTheme } from "../theme";
import { Task } from "../types";
import TaskRow from "../TaskRow";
import EmptyState from "../EmptyState";
import QuickAddBar, { QuickAddValue } from "../QuickAddBar";

interface InboxViewProps {
  tasks: Task[];
  onOpenTask: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (task: Task) => void;
  onQuickAdd: (value: QuickAddValue) => void;
  canCreate?: boolean;
}

function hasProject(task: Task): boolean {
  if (!task.projectId) return false;
  if (typeof task.projectId === "string") return task.projectId.length > 0;
  return !!(task.projectId._id || task.projectId.id);
}

export default function InboxView({
  tasks,
  onOpenTask,
  onToggleComplete,
  onEditTask,
  onDeleteTask,
  onQuickAdd,
  canCreate = false,
}: InboxViewProps) {
  const theme = useTaskTheme();
  const inboxTasks = useMemo(
    () => tasks.filter((t) => !hasProject(t) && !t.dueDate && t.status !== "completed"),
    [tasks]
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.bg.canvas }]}>
      {canCreate && onQuickAdd && (
        <View style={styles.quickAddWrap}>
          <QuickAddBar placeholder="Capture a task…" onSubmit={onQuickAdd} />
        </View>
      )}
      {inboxTasks.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Inbox is empty"
          description="Capture your next task here and organize it later — no project or date required."
        />
      ) : (
        <FlatList
          data={inboxTasks}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TaskRow
              task={item}
              onPress={() => onOpenTask(item)}
              onToggleComplete={() => onToggleComplete(item)}
              onEdit={onEditTask ? () => onEditTask(item) : undefined}
              onDelete={onDeleteTask ? () => onDeleteTask(item) : undefined}
            />
          )}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  quickAddWrap: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  listContent: { paddingBottom: 40 },
});
