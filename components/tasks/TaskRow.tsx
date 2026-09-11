import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal } from "react-native";
import {
  Paperclip,
  ListChecks,
  Calendar as CalendarIcon,
  Folder,
  AlertCircle,
  Clock,
  MoreVertical,
  CheckCircle2,
  RotateCcw,
  Eye,
  Edit,
  Trash2,
  X,
} from "lucide-react-native";
import { useTaskTheme } from "./theme";
import { Task } from "./types";
import { formatDueLabel } from "./dateBuckets";
import CompleteCheck from "./CompleteCheck";
import PriorityPill from "./PriorityPill";

interface TaskRowProps {
  task: Task;
  onPress: () => void;
  onToggleComplete: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  showProject?: boolean;
}

function TaskRowBase({ task, onPress, onToggleComplete, onEdit, onDelete, showProject = true }: TaskRowProps) {
  const theme = useTaskTheme();
  const [showMenu, setShowMenu] = useState(false);
  const completed = task.status === "completed";
  const dueLabel = formatDueLabel(task);
  const isOverdue = !completed && dueLabel?.startsWith("Overdue");
  const isToday = !completed && dueLabel === "Today";
  const subtaskDone = task.subtasks?.filter((s) => s.completed).length ?? 0;
  const subtaskTotal = task.subtasks?.length ?? 0;
  const projectName = task.projectName || (typeof task.projectId === "object" ? (task.projectId as any)?.name : undefined);
  const hasAttachments = !!(task.attachments?.length || task.attachment);

  const assigneeName = task.assignees?.[0];

  return (
    <>
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: theme.bg.surface,
            borderColor: isOverdue ? `${theme.accent.danger}40` : theme.border.default,
          },
          completed && { opacity: 0.7 },
        ]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {/* Top Row: Checkbox, Title, Priority, and 3-dots Menu */}
        <View style={styles.topRow}>
          <CompleteCheck completed={completed} onToggle={onToggleComplete} />

          <View style={styles.titleContainer}>
            <Text
              style={[
                styles.title,
                { color: completed ? theme.text.tertiary : theme.text.primary },
                completed && styles.titleCompleted,
              ]}
              numberOfLines={2}
            >
              {task.title}
            </Text>
          </View>

          {task.priority && task.priority !== "low" && (
            <PriorityPill priority={task.priority} size="sm" />
          )}

          <TouchableOpacity
            style={styles.moreBtn}
            onPress={() => setShowMenu(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MoreVertical size={16} color={theme.text.tertiary} />
          </TouchableOpacity>
        </View>

        {/* Bottom Metadata Row: Due Date, Project, Subtasks, Assignee */}
        <View style={styles.metaRow}>
          <View style={styles.metaLeft}>
            {dueLabel && (
              <View
                style={[
                  styles.dueBadge,
                  isOverdue
                    ? { backgroundColor: theme.accent.dangerSoft, borderColor: `${theme.accent.danger}40` }
                    : isToday
                    ? { backgroundColor: theme.accent.warningSoft, borderColor: `${theme.accent.warning}40` }
                    : { backgroundColor: theme.bg.inset, borderColor: theme.border.subtle },
                ]}
              >
                {isOverdue ? (
                  <AlertCircle size={11} color={theme.accent.danger} />
                ) : isToday ? (
                  <Clock size={11} color={theme.accent.warning} />
                ) : (
                  <CalendarIcon size={11} color={theme.text.tertiary} />
                )}
                <Text
                  style={[
                    styles.dueText,
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

            {showProject && projectName && (
              <View style={[styles.projectChip, { backgroundColor: theme.bg.inset, borderColor: theme.border.subtle }]}>
                <Folder size={11} color={theme.accent.primary} />
                <Text style={[styles.projectChipText, { color: theme.text.secondary }]} numberOfLines={1}>
                  {projectName}
                </Text>
              </View>
            )}

            {subtaskTotal > 0 && (
              <View style={[styles.metaItem, { backgroundColor: theme.bg.inset, borderColor: theme.border.subtle }]}>
                <ListChecks size={11} color={theme.text.tertiary} />
                <Text style={[styles.metaText, { color: theme.text.secondary }]}>
                  {subtaskDone}/{subtaskTotal}
                </Text>
              </View>
            )}

            {hasAttachments && (
              <View style={[styles.metaItem, { backgroundColor: theme.bg.inset, borderColor: theme.border.subtle }]}>
                <Paperclip size={11} color={theme.text.tertiary} />
              </View>
            )}
          </View>

          {assigneeName && assigneeName !== "Unassigned" && (
            <View style={[styles.assigneePill, { backgroundColor: theme.accent.primarySoft }]}>
              <Text style={[styles.assigneeText, { color: theme.accent.primary }]}>
                {assigneeName}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      {/* 3-Dots Quick Actions Menu */}
      {showMenu && (
        <Modal visible={true} transparent animationType="fade" onRequestClose={() => setShowMenu(false)}>
          <View style={styles.menuBackdrop}>
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setShowMenu(false)} />
            <View style={[styles.menuSheet, { backgroundColor: theme.bg.surface, borderColor: theme.border.default }]}>
              <View style={[styles.menuHeader, { borderBottomColor: theme.border.subtle }]}>
                <Text style={[styles.menuTaskTitle, { color: theme.text.primary }]} numberOfLines={1}>
                  {task.title}
                </Text>
                <TouchableOpacity onPress={() => setShowMenu(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <X size={18} color={theme.text.tertiary} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setShowMenu(false);
                  onToggleComplete();
                }}
              >
                {completed ? (
                  <>
                    <RotateCcw size={16} color="#f59e0b" />
                    <Text style={[styles.menuItemText, { color: "#f59e0b" }]}>Mark as Incomplete</Text>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} color="#10b981" />
                    <Text style={[styles.menuItemText, { color: "#10b981" }]}>Mark as Complete</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setShowMenu(false);
                  onPress();
                }}
              >
                <Eye size={16} color={theme.text.secondary} />
                <Text style={[styles.menuItemText, { color: theme.text.primary }]}>View Details</Text>
              </TouchableOpacity>

              {onEdit && (
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setShowMenu(false);
                    onEdit();
                  }}
                >
                  <Edit size={16} color={theme.accent.primary} />
                  <Text style={[styles.menuItemText, { color: theme.accent.primary }]}>Edit Task</Text>
                </TouchableOpacity>
              )}

              {onDelete && (
                <TouchableOpacity
                  style={[styles.menuItem, styles.deleteMenuItem]}
                  onPress={() => {
                    setShowMenu(false);
                    onDelete();
                  }}
                >
                  <Trash2 size={16} color={theme.accent.danger} />
                  <Text style={[styles.menuItemText, { color: theme.accent.danger }]}>Delete Task</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

export default React.memo(TaskRowBase);

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 5,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    gap: 8,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  titleContainer: {
    flex: 1,
    paddingTop: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 19,
    letterSpacing: -0.1,
  },
  titleCompleted: {
    textDecorationLine: "line-through",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 32,
    gap: 8,
    flexWrap: "wrap",
  },
  metaLeft: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  dueBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 0.5,
    gap: 4,
  },
  dueText: {
    fontSize: 11,
  },
  projectChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 0.5,
    maxWidth: 130,
  },
  projectChipText: {
    fontSize: 11,
    fontWeight: "600",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 0.5,
  },
  metaText: {
    fontSize: 11,
    fontWeight: "600",
  },
  assigneePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  assigneeText: {
    fontSize: 10.5,
    fontWeight: "700",
  },
  moreBtn: {
    padding: 4,
    marginLeft: 2,
  },
  menuBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  menuSheet: {
    width: "100%",
    maxWidth: 320,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  menuHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  menuTaskTitle: {
    fontSize: 13,
    fontWeight: "700",
    flex: 1,
    marginRight: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuItemText: {
    fontSize: 13.5,
    fontWeight: "600",
  },
  deleteMenuItem: {
    borderTopWidth: 0.5,
    borderTopColor: "rgba(239, 68, 68, 0.2)",
    marginTop: 4,
  },
});

