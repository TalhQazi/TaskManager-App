import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import {
  LayoutGrid,
  List as ListIcon,
  Rows3,
  Kanban,
  Users,
  Calendar as CalIcon,
  GanttChartSquare,
  Activity,
  LineChart,
  Plus,
  ArrowLeft,
} from "lucide-react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useTaskWorkspace, ViewId } from "./TaskWorkspaceContext";
import { TaskWorkspaceFilterBar } from "./TaskWorkspaceFilterBar";
import { TaskView } from "./data/workspaceApi";
import { useTaskTheme } from "@/components/tasks/theme";
import { useTaskCapabilities } from "@/components/tasks/capabilities";
import {
  useTaskComments,
  usePostComment,
  useUpdateTaskStatus,
  useUpdateTaskPriority,
  useToggleSubtask,
  useDeleteTask,
  useCreateTask,
  useUpdateTask,
} from "@/components/tasks/data/taskApi";
import TaskDetailDrawer from "@/components/tasks/TaskDetailDrawer";
import CreateTaskModal, { TaskFormPayload } from "@/components/tasks/CreateTaskModal";
import { Task, TaskPriority, TaskStatus } from "@/components/tasks/types";
import { apiRequest } from "@/services/api";

import WorkspaceCardView from "./views/WorkspaceCardView";
import WorkspaceListView from "./views/WorkspaceListView";
import WorkspaceCompactView from "./views/WorkspaceCompactView";
import WorkspaceKanbanView from "./views/WorkspaceKanbanView";
import WorkspaceWorkloadView from "./views/WorkspaceWorkloadView";
import WorkspaceCalendarView from "./views/WorkspaceCalendarView";
import WorkspaceTimelineView from "./views/WorkspaceTimelineView";
import WorkspaceWipView from "./views/WorkspaceWipView";
import WorkspaceExecutiveDashboard from "./views/WorkspaceExecutiveDashboard";

const VIEW_TABS: Array<{ id: ViewId; label: string; icon: any }> = [
  { id: "card", label: "Card", icon: LayoutGrid },
  { id: "list", label: "List", icon: ListIcon },
  { id: "compact", label: "Compact", icon: Rows3 },
  { id: "kanban", label: "Kanban", icon: Kanban },
  { id: "workload", label: "Workload", icon: Users },
  { id: "calendar", label: "Calendar", icon: CalIcon },
  { id: "timeline", label: "Timeline", icon: GanttChartSquare },
  { id: "wip", label: "WIP", icon: Activity },
  { id: "executive", label: "Executive", icon: LineChart },
];

function taskViewToTask(t: TaskView): Task {
  return {
    id: t.id,
    _id: t._id || t.id,
    taskNumber: t.taskNumber,
    title: t.title,
    description: t.description || "",
    assignees: t.assignees || [],
    teamLead: t.teamLead,
    priority: t.priority,
    status: t.status,
    executionPriority: t.executionPriority,
    dueDate: t.dueDate || "",
    createdAt: t.createdAt || new Date().toISOString(),
    projectId: t.projectId || undefined,
    projectName: t.projectName,
    attachments: t.attachments,
    subtasks: t.subtasks,
  };
}

export function TaskWorkspaceShell({
  title = "Task Workspace",
  showBackButton = true,
  onBack,
}: {
  title?: string;
  showBackButton?: boolean;
  onBack?: () => void;
}) {
  const theme = useTaskTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const capabilities = useTaskCapabilities();

  const {
    view,
    setView,
    selectedTask,
    setSelectedTask,
    isCreateOpen,
    setIsCreateOpen,
    editTask,
    setEditTask,
  } = useTaskWorkspace();

  const [employees, setEmployees] = useState<
    Array<{ id: string; name: string; email?: string; avatarUrl?: string }>
  >([]);
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    let mounted = true;
    apiRequest<any>("/employees")
      .then((res) => {
        if (!mounted) return;
        const raw = res?.data !== undefined ? res.data : res;
        const items = Array.isArray(raw) ? raw : raw?.items || [];
        setEmployees(
          items.map((e: any) => ({
            id: String(e.id || e._id || ""),
            name: e.name || "Unnamed",
            email: e.email,
            avatarUrl: e.avatarUrl,
          }))
        );
      })
      .catch(() => {});

    apiRequest<any>("/projects")
      .then((res) => {
        if (!mounted) return;
        const raw = res?.data !== undefined ? res.data : res;
        const items = Array.isArray(raw) ? raw : raw?.items || [];
        setProjects(
          items.map((p: any) => ({
            id: String(p.id || p._id || ""),
            name: p.name || "Unnamed Project",
          }))
        );
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  // Comments for drawer
  const commentsQuery = useTaskComments(selectedTask?.id || null);
  const postCommentMutation = usePostComment();
  const updateStatusMutation = useUpdateTaskStatus();
  const updatePriorityMutation = useUpdateTaskPriority();
  const toggleSubtaskMutation = useToggleSubtask();
  const deleteTaskMutation = useDeleteTask();
  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();

  // Map selectedTask to Task format
  const activeTaskObj = useMemo(() => {
    return selectedTask ? taskViewToTask(selectedTask) : null;
  }, [selectedTask]);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (router.canGoBack()) {
      router.back();
    }
  };

  const handleToggleComplete = (task: Task) => {
    const nextStatus: TaskStatus = task.status === "completed" ? "pending" : "completed";
    updateStatusMutation.mutate(
      { taskId: task.id, status: nextStatus },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: ["workspace-task-dataset"] });
          qc.invalidateQueries({ queryKey: ["task-analytics"] });
          if (selectedTask && selectedTask.id === task.id) {
            setSelectedTask({ ...selectedTask, status: nextStatus });
          }
        },
      }
    );
  };

  const handleChangeStatus = (status: TaskStatus) => {
    if (!selectedTask) return;
    updateStatusMutation.mutate(
      { taskId: selectedTask.id, status },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: ["workspace-task-dataset"] });
          qc.invalidateQueries({ queryKey: ["task-analytics"] });
          setSelectedTask({ ...selectedTask, status });
        },
      }
    );
  };

  const handleChangePriority = (priority: TaskPriority) => {
    if (!selectedTask) return;
    updatePriorityMutation.mutate(
      { taskId: selectedTask.id, priority },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: ["workspace-task-dataset"] });
          const mappedPriority: TaskView["priority"] = priority === "urgent" ? "high" : priority;
          setSelectedTask({ ...selectedTask, priority: mappedPriority });
        },
      }
    );
  };

  const handleToggleSubtask = (subtaskId: string, completed: boolean) => {
    if (!selectedTask) return;
    toggleSubtaskMutation.mutate(
      { taskId: selectedTask.id, subtaskId, completed },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: ["workspace-task-dataset"] });
          if (selectedTask.subtasks) {
            const updated = selectedTask.subtasks.map((s) =>
              s.id === subtaskId ? { ...s, completed } : s
            );
            setSelectedTask({ ...selectedTask, subtasks: updated });
          }
        },
      }
    );
  };

  const handleDeleteTask = () => {
    if (!selectedTask) return;
    Alert.alert("Delete Task", "Are you sure you want to delete this task?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          deleteTaskMutation.mutate(selectedTask.id, {
            onSuccess: () => {
              setSelectedTask(null);
              qc.invalidateQueries({ queryKey: ["workspace-task-dataset"] });
              qc.invalidateQueries({ queryKey: ["task-analytics"] });
            },
          });
        },
      },
    ]);
  };

  const handleCreateSubmit = (payload: TaskFormPayload) => {
    if (editTask) {
      updateTaskMutation.mutate(
        { taskId: editTask.id, payload },
        {
          onSuccess: () => {
            setEditTask(null);
            setIsCreateOpen(false);
            qc.invalidateQueries({ queryKey: ["workspace-task-dataset"] });
            qc.invalidateQueries({ queryKey: ["task-analytics"] });
          },
          onError: (err: any) => {
            Alert.alert("Error", err?.message || "Failed to update task.");
          },
        }
      );
    } else {
      createTaskMutation.mutate(payload as any, {
        onSuccess: () => {
          setIsCreateOpen(false);
          qc.invalidateQueries({ queryKey: ["workspace-task-dataset"] });
          qc.invalidateQueries({ queryKey: ["task-analytics"] });
        },
        onError: (err: any) => {
          Alert.alert("Error", err?.message || "Failed to create task.");
        },
      });
    }
  };

  // Render the active view
  const renderActiveView = () => {
    switch (view) {
      case "card":
        return <WorkspaceCardView />;
      case "list":
        return <WorkspaceListView />;
      case "compact":
        return <WorkspaceCompactView />;
      case "kanban":
        return <WorkspaceKanbanView />;
      case "workload":
        return <WorkspaceWorkloadView />;
      case "calendar":
        return <WorkspaceCalendarView />;
      case "timeline":
        return <WorkspaceTimelineView />;
      case "wip":
        return <WorkspaceWipView />;
      case "executive":
        return <WorkspaceExecutiveDashboard />;
      default:
        return <WorkspaceCardView />;
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.bg.canvas }]}>
      {/* Top Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: theme.bg.surface, borderBottomColor: theme.border.default },
        ]}
      >
        <View style={styles.headerLeft}>
          {showBackButton && (
            <TouchableOpacity
              style={[styles.iconButton, { borderColor: theme.border.default }]}
              onPress={handleBack}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <ArrowLeft size={18} color={theme.text.primary} />
            </TouchableOpacity>
          )}
          <View>
            <Text style={[styles.headerTitle, { color: theme.text.primary }]}>
              {title}
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.text.tertiary }]}>
              Unified 9-view workspace
            </Text>
          </View>
        </View>

        {capabilities.canCreateTask && (
          <TouchableOpacity
            style={[styles.createBtn, { backgroundColor: theme.accent.primary }]}
            onPress={() => {
              setEditTask(null);
              setIsCreateOpen(true);
            }}
            activeOpacity={0.8}
          >
            <Plus size={15} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={styles.createBtnText}>New Task</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* View Switcher Tabs (Horizontal Scroll) */}
      <View
        style={[
          styles.tabsWrapper,
          { backgroundColor: theme.bg.surface, borderBottomColor: theme.border.default },
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsScroll}
        >
          {VIEW_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = view === tab.id;

            return (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.tabItem,
                  isActive
                    ? {
                        backgroundColor: theme.accent.primary,
                        borderColor: theme.accent.primary,
                      }
                    : {
                        backgroundColor: theme.bg.surfaceRaised,
                        borderColor: theme.border.default,
                      },
                ]}
                onPress={() => setView(tab.id)}
                activeOpacity={0.7}
              >
                <Icon
                  size={14}
                  color={isActive ? "#FFFFFF" : theme.text.secondary}
                />
                <Text
                  style={[
                    styles.tabLabel,
                    {
                      color: isActive ? "#FFFFFF" : theme.text.secondary,
                      fontWeight: isActive ? "700" : "500",
                    },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Universal Filter Bar (shown on views with tabular/card tasks) */}
      {!["executive", "wip"].includes(view) && <TaskWorkspaceFilterBar />}

      {/* View Container */}
      <View style={styles.viewContainer}>{renderActiveView()}</View>

      {/* Asana-style Task Detail Drawer */}
      <TaskDetailDrawer
        visible={!!selectedTask}
        task={activeTaskObj}
        projectName={selectedTask?.projectName}
        capabilities={capabilities}
        comments={commentsQuery.data || []}
        commentsLoading={commentsQuery.isLoading}
        onClose={() => setSelectedTask(null)}
        onToggleComplete={handleToggleComplete}
        onEditTask={(t) => {
          setSelectedTask(null);
          setEditTask(selectedTask);
          setIsCreateOpen(true);
        }}
        onToggleSubtask={handleToggleSubtask}
        onChangeStatus={handleChangeStatus}
        onChangePriority={handleChangePriority}
        onPostComment={(msg) => {
          if (selectedTask) {
            postCommentMutation.mutate({ taskId: selectedTask.id, message: msg });
          }
        }}
        onDelete={handleDeleteTask}
      />

      {/* Create / Edit Task Modal */}
      <CreateTaskModal
        visible={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setEditTask(null);
        }}
        onSubmit={handleCreateSubmit}
        isSubmitting={createTaskMutation.isPending || updateTaskMutation.isPending}
        isEditing={!!editTask}
        employeeOptions={employees}
        projectOptions={projects}
        canAssign={capabilities.canAssign}
        initial={
          editTask
            ? {
                title: editTask.title,
                description: editTask.description,
                priority: editTask.priority,
                status: editTask.status,
                assignees: editTask.assignees,
                dueDate: editTask.dueDate || undefined,
                projectId: editTask.projectId || undefined,
              }
            : undefined
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 1,
  },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  createBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  tabsWrapper: {
    borderBottomWidth: 1,
  },
  tabsScroll: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    alignItems: "center",
  },
  tabItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  tabLabel: {
    fontSize: 12.5,
  },
  viewContainer: {
    flex: 1,
  },
});
