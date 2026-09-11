import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  Alert,
} from "react-native";
import { MoveRight, X, Check } from "lucide-react-native";
import { useTaskWorkspace } from "../TaskWorkspaceContext";
import {
  STATUS_COLUMNS,
  TaskView,
  useUpdateWorkspaceTaskStatus,
  useWorkspaceTaskDataset,
} from "../data/workspaceApi";
import { useTaskTheme } from "@/components/tasks/theme";
import { ViewLoading, ViewEmpty, dueLabel, PriorityBadge, AvatarStack } from "./shared";

export default function WorkspaceKanbanView() {
  const theme = useTaskTheme();
  const { filters, setSelectedTask, setIsCreateOpen } = useTaskWorkspace();
  const {
    data,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useWorkspaceTaskDataset(filters);

  const updateStatusMutation = useUpdateWorkspaceTaskStatus();
  const [movingTask, setMovingTask] = useState<TaskView | null>(null);

  const tasks: TaskView[] = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => page.items);
  }, [data]);

  const columns = useMemo(() => {
    const map: Record<string, TaskView[]> = {};
    for (const col of STATUS_COLUMNS) {
      map[col.key] = [];
    }
    for (const t of tasks) {
      if (!map[t.status]) {
        map[t.status] = [];
      }
      map[t.status].push(t);
    }
    return map;
  }, [tasks]);

  if (isLoading) return <ViewLoading />;
  if (!tasks.length) {
    return (
      <ViewEmpty
        label="No tasks found matching your filters."
        actionLabel="Create Task"
        onAction={() => setIsCreateOpen(true)}
      />
    );
  }

  const handleMoveStatus = (targetStatus: TaskView["status"]) => {
    if (!movingTask || movingTask.status === targetStatus) {
      setMovingTask(null);
      return;
    }
    const taskId = movingTask.id;
    setMovingTask(null);
    updateStatusMutation.mutate(
      { taskId, status: targetStatus },
      {
        onError: (err: any) => {
          Alert.alert("Error", err?.message || "Failed to update task status.");
        },
      }
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg.canvas }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalScroll}
      >
        {STATUS_COLUMNS.map((col) => {
          const items = columns[col.key] || [];

          return (
            <View
              key={col.key}
              style={[
                styles.column,
                {
                  backgroundColor: theme.bg.surfaceRaised,
                  borderColor: theme.border.default,
                },
              ]}
            >
              {/* Column Header */}
              <View
                style={[
                  styles.columnHeader,
                  {
                    borderBottomColor: theme.border.default,
                    backgroundColor: theme.bg.surface,
                  },
                ]}
              >
                <View style={styles.colTitleRow}>
                  <View style={[styles.colDot, { backgroundColor: col.color }]} />
                  <Text style={[styles.colTitle, { color: theme.text.primary }]}>
                    {col.label}
                  </Text>
                </View>
                <View
                  style={[
                    styles.countBadge,
                    { backgroundColor: theme.bg.surfaceRaised },
                  ]}
                >
                  <Text style={[styles.countText, { color: theme.text.secondary }]}>
                    {items.length}
                  </Text>
                </View>
              </View>

              {/* Column Task List */}
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.cardList}
              >
                {items.map((t) => {
                  const due = dueLabel(t.dueDate);

                  return (
                    <TouchableOpacity
                      key={t.id}
                      style={[
                        styles.kanbanCard,
                        {
                          backgroundColor: theme.bg.surface,
                          borderColor: theme.border.default,
                        },
                      ]}
                      onPress={() => setSelectedTask(t)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.cardTop}>
                        <Text
                          style={[styles.taskTitle, { color: theme.text.primary }]}
                          numberOfLines={2}
                        >
                          {t.taskNumber ? `#${t.taskNumber} ` : ""}
                          {t.title || "Untitled"}
                        </Text>
                        <PriorityBadge priority={t.priority} />
                      </View>

                      <View style={styles.cardBottom}>
                        <Text style={[styles.dueText, { color: due.color }]}>
                          {due.text}
                        </Text>
                        <View style={styles.cardActions}>
                          <AvatarStack assignees={t.assignees} max={2} />
                          <TouchableOpacity
                            style={[
                              styles.moveBtn,
                              { backgroundColor: theme.bg.surfaceRaised },
                            ]}
                            onPress={() => setMovingTask(t)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <MoveRight size={13} color={theme.text.tertiary} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}

                {items.length === 0 && (
                  <View style={styles.emptyCol}>
                    <Text style={[styles.emptyColText, { color: theme.text.tertiary }]}>
                      No tasks in {col.label}
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>
          );
        })}
      </ScrollView>

      {hasNextPage && (
        <View style={[styles.footer, { borderTopColor: theme.border.subtle }]}>
          <TouchableOpacity
            style={[styles.loadMoreBtn, { borderColor: theme.border.default }]}
            onPress={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? (
              <ActivityIndicator size="small" color={theme.accent.primary} />
            ) : (
              <Text style={[styles.loadMoreText, { color: theme.accent.primary }]}>
                Load More Tasks
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Quick Move Status Modal Sheet */}
      <Modal
        visible={!!movingTask}
        transparent
        animationType="fade"
        onRequestClose={() => setMovingTask(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setMovingTask(null)}
        >
          <View
            style={[
              styles.moveSheet,
              { backgroundColor: theme.bg.surface, borderColor: theme.border.default },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.moveSheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.moveSheetTitle, { color: theme.text.primary }]}>
                  Move Task Status
                </Text>
                <Text
                  style={[styles.moveSheetSubtitle, { color: theme.text.secondary }]}
                  numberOfLines={1}
                >
                  {movingTask?.title}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setMovingTask(null)}>
                <X size={20} color={theme.text.secondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.statusOptions}>
              {STATUS_COLUMNS.map((col) => {
                const isCurrent = movingTask?.status === col.key;
                return (
                  <TouchableOpacity
                    key={col.key}
                    style={[
                      styles.statusOptionRow,
                      {
                        backgroundColor: isCurrent
                          ? theme.bg.surfaceRaised
                          : "transparent",
                        borderColor: theme.border.subtle,
                      },
                    ]}
                    onPress={() => handleMoveStatus(col.key)}
                  >
                    <View style={styles.statusOptionLeft}>
                      <View style={[styles.colDot, { backgroundColor: col.color }]} />
                      <Text
                        style={[
                          styles.statusOptionLabel,
                          {
                            color: isCurrent
                              ? theme.accent.primary
                              : theme.text.primary,
                            fontWeight: isCurrent ? "700" : "500",
                          },
                        ]}
                      >
                        {col.label}
                      </Text>
                    </View>
                    {isCurrent && <Check size={16} color={theme.accent.primary} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  horizontalScroll: {
    padding: 12,
    gap: 12,
  },
  column: {
    width: 290,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    maxHeight: "100%",
  },
  columnHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  colTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  colDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  colTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  countBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countText: {
    fontSize: 11,
    fontWeight: "600",
  },
  cardList: {
    padding: 10,
    gap: 8,
    paddingBottom: 24,
  },
  kanbanCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 11,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 6,
  },
  taskTitle: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: "600",
    lineHeight: 18,
  },
  cardBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  dueText: {
    fontSize: 11,
    fontWeight: "500",
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  moveBtn: {
    padding: 5,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCol: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 36,
  },
  emptyColText: {
    fontSize: 12,
    fontStyle: "italic",
  },
  footer: {
    paddingVertical: 8,
    alignItems: "center",
    borderTopWidth: 1,
  },
  loadMoreBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  loadMoreText: {
    fontSize: 12,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  moveSheet: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  moveSheetHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  moveSheetTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  moveSheetSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  statusOptions: {
    gap: 6,
  },
  statusOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statusOptionLabel: {
    fontSize: 14,
  },
});
