import React, { useMemo } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { ChevronLeft, ChevronRight, LayoutGrid, Circle, Clock, CheckCircle2, AlertCircle } from "lucide-react-native";
import { useTaskTheme } from "../theme";
import { Task, TaskStatus } from "../types";
import { formatDueLabel } from "../dateBuckets";
import PriorityPill from "../PriorityPill";
import EmptyState from "../EmptyState";

interface BoardViewProps {
  tasks: Task[];
  onOpenTask: (task: Task) => void;
  onMoveStatus: (task: Task, status: TaskStatus) => void;
  canEdit?: boolean;
}

const COLUMNS: { key: TaskStatus; label: string; icon: any; color: string }[] = [
  { key: "pending", label: "To Do", icon: Circle, color: "#64748B" },
  { key: "in-progress", label: "In Progress", icon: Clock, color: "#3B82F6" },
  { key: "completed", label: "Completed", icon: CheckCircle2, color: "#10B981" },
];

export default function BoardView({ tasks, onOpenTask, onMoveStatus, canEdit }: BoardViewProps) {
  const theme = useTaskTheme();

  const byColumn = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = { pending: [], "in-progress": [], completed: [], overdue: [] };
    for (const t of tasks) {
      const col = t.status === "overdue" ? "pending" : t.status;
      if (map[col]) map[col].push(t);
      else map.pending.push(t);
    }
    return map;
  }, [tasks]);

  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={LayoutGrid}
        title="Nothing to board yet"
        description="Tasks will appear here as To Do, In Progress, or Completed."
      />
    );
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.board}>
      {COLUMNS.map((col, colIndex) => {
        const Icon = col.icon;
        const columnTasks = byColumn[col.key] || [];

        return (
          <View
            key={col.key}
            style={[
              styles.column,
              {
                backgroundColor: theme.bg.inset,
                borderColor: theme.border.default,
              },
            ]}
          >
            {/* Column Header */}
            <View style={[styles.columnHeader, { borderBottomColor: theme.border.subtle }]}>
              <View style={styles.columnHeaderLeft}>
                <Icon size={14} color={col.color} />
                <Text style={[styles.columnTitle, { color: theme.text.primary }]}>{col.label}</Text>
              </View>
              <View style={[styles.columnCountBadge, { backgroundColor: theme.bg.surface }]}>
                <Text style={[styles.columnCount, { color: theme.text.secondary }]}>
                  {columnTasks.length}
                </Text>
              </View>
            </View>

            {/* Column Cards */}
            <ScrollView contentContainerStyle={styles.columnList} showsVerticalScrollIndicator={false}>
              {columnTasks.map((task) => {
                const dueLabel = formatDueLabel(task);
                const isOverdue = task.status !== "completed" && dueLabel?.startsWith("Overdue");
                const isToday = task.status !== "completed" && dueLabel === "Today";
                const subtaskDone = task.subtasks?.filter((s) => s.completed).length ?? 0;
                const subtaskTotal = task.subtasks?.length ?? 0;
                const projectName = task.projectName;

                return (
                  <TouchableOpacity
                    key={task.id}
                    style={[
                      styles.card,
                      {
                        backgroundColor: theme.bg.surface,
                        borderColor: isOverdue ? `${theme.accent.danger}40` : theme.border.default,
                      },
                    ]}
                    onPress={() => onOpenTask(task)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.cardTitle,
                        { color: theme.text.primary },
                        task.status === "completed" && styles.completedTitle,
                      ]}
                      numberOfLines={3}
                    >
                      {task.title}
                    </Text>

                    <View style={styles.cardMetaRow}>
                      {task.priority && task.priority !== "low" && (
                        <PriorityPill priority={task.priority} size="sm" />
                      )}
                      {dueLabel && (
                        <View
                          style={[
                            styles.dueBadge,
                            isOverdue
                              ? { backgroundColor: theme.accent.dangerSoft }
                              : isToday
                              ? { backgroundColor: theme.accent.warningSoft }
                              : { backgroundColor: theme.bg.inset },
                          ]}
                        >
                          {isOverdue && <AlertCircle size={10} color={theme.accent.danger} />}
                          <Text
                            style={[
                              styles.cardDue,
                              {
                                color: isOverdue
                                  ? theme.accent.danger
                                  : isToday
                                  ? theme.accent.warning
                                  : theme.text.secondary,
                                fontWeight: isOverdue || isToday ? "700" : "500",
                              },
                            ]}
                          >
                            {dueLabel}
                          </Text>
                        </View>
                      )}
                      {subtaskTotal > 0 && (
                        <Text style={[styles.cardSubtasks, { color: theme.text.secondary }]}>
                          ✓ {subtaskDone}/{subtaskTotal}
                        </Text>
                      )}
                      {projectName && (
                        <View style={[styles.projectChip, { backgroundColor: theme.bg.inset }]}>
                          <Text style={[styles.projectChipText, { color: theme.text.secondary }]} numberOfLines={1}>
                            {projectName}
                          </Text>
                        </View>
                      )}
                    </View>

                    {canEdit && (
                      <View style={styles.cardMoveRow}>
                        <TouchableOpacity
                          disabled={colIndex === 0}
                          onPress={() => onMoveStatus(task, COLUMNS[colIndex - 1].key)}
                          style={[
                            styles.moveBtn,
                            { backgroundColor: theme.bg.inset },
                            colIndex === 0 && styles.moveBtnDisabled,
                          ]}
                        >
                          <ChevronLeft
                            size={13}
                            color={colIndex === 0 ? theme.text.tertiary : theme.text.primary}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          disabled={colIndex === COLUMNS.length - 1}
                          onPress={() => onMoveStatus(task, COLUMNS[colIndex + 1].key)}
                          style={[
                            styles.moveBtn,
                            { backgroundColor: theme.bg.inset },
                            colIndex === COLUMNS.length - 1 && styles.moveBtnDisabled,
                          ]}
                        >
                          <ChevronRight
                            size={13}
                            color={colIndex === COLUMNS.length - 1 ? theme.text.tertiary : theme.text.primary}
                          />
                        </TouchableOpacity>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  board: {
    padding: 16,
    gap: 14,
  },
  column: {
    width: 275,
    borderRadius: 16,
    borderWidth: 1,
    maxHeight: "100%",
  },
  columnHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  columnHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  columnTitle: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: -0.1,
  },
  columnCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  columnCount: {
    fontSize: 11,
    fontWeight: "700",
  },
  columnList: {
    padding: 10,
    gap: 10,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardTitle: {
    fontSize: 13.5,
    fontWeight: "600",
    lineHeight: 18,
    letterSpacing: -0.1,
  },
  completedTitle: {
    textDecorationLine: "line-through",
    opacity: 0.6,
  },
  cardMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  dueBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  cardDue: {
    fontSize: 10.5,
  },
  cardSubtasks: {
    fontSize: 11,
    fontWeight: "600",
  },
  projectChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    maxWidth: 100,
  },
  projectChipText: {
    fontSize: 10.5,
    fontWeight: "600",
  },
  cardMoveRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 6,
    marginTop: 4,
  },
  moveBtn: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  moveBtnDisabled: {
    opacity: 0.3,
  },
});
