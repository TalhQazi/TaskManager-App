import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, Platform, ActivityIndicator } from "react-native";
import { Plus } from "lucide-react-native";
import { useTaskTheme } from "./theme";
import { Task, Project, TaskStatus } from "./types";
import { TaskCapabilities } from "./capabilities";
import { toast } from "@/hooks/use-toast";
import { bucketForTask } from "./dateBuckets";

import TodayView from "./views/TodayView";
import InboxView from "./views/InboxView";
import UpcomingView from "./views/UpcomingView";
import AllTasksView from "./views/AllTasksView";
import ProjectsView from "./views/ProjectsView";
import ProjectDetailView from "./views/ProjectDetailView";
import BoardView from "./views/BoardView";
import CalendarView from "./views/CalendarView";
import TaskDetailDrawer from "./TaskDetailDrawer";
import CreateTaskModal, { TaskFormPayload } from "./CreateTaskModal";
import CreateProjectModal, { ProjectFormPayload } from "./CreateProjectModal";
import { QuickAddValue } from "./QuickAddBar";

type ViewKey = "today" | "inbox" | "upcoming" | "all" | "projects" | "board" | "calendar";

export interface TaskApiModule {
  useTasksQuery: (params?: any) => { data?: Task[]; isLoading: boolean };
  useProjectsQuery: (search?: string) => { data?: Project[]; isLoading: boolean };
  useWorkspaceUsers: () => { data?: any[] };
  useTaskComments: (taskId: string | null) => { data?: any[]; isLoading: boolean };
  useCreateTask: () => { mutate: (payload: any) => void; mutateAsync?: (payload: any) => Promise<any>; isPending: boolean };
  useCreateProject: () => { mutate: (payload: any) => void; isPending: boolean };
  useUpdateTaskStatus: () => { mutate: (v: { taskId: string; status: TaskStatus }) => void };
  useUpdateTaskPriority: () => { mutate: (v: { taskId: string; priority: any }) => void };
  useUpdateTaskAttachments?: () => { mutate: (v: { taskId: string; attachments: any[] }) => void; mutateAsync?: (v: { taskId: string; attachments: any[] }) => Promise<any> };
  useToggleSubtask: () => { mutate: (v: { taskId: string; subtaskId: string; completed: boolean }) => void };
  useDeleteTask: () => { mutate: (taskId: string) => void };
  usePostComment: () => { mutate: (v: { taskId: string; message: string }) => void };
}

interface TasksScreenShellProps {
  api: TaskApiModule;
  capabilities: TaskCapabilities;
  headerTitle?: string;
  onTaskCompleted?: (task: Task) => void;
  initialTaskId?: string;
}

export default function TasksScreenShell({ api, capabilities, headerTitle = "Task Management", onTaskCompleted, initialTaskId }: TasksScreenShellProps) {
  const theme = useTaskTheme();
  const [view, setView] = useState<ViewKey>("all");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [consumedInitialTaskId, setConsumedInitialTaskId] = useState<string | null>(null);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);

  const tasksQuery = api.useTasksQuery({});
  const projectsQuery = api.useProjectsQuery();
  const usersQuery = api.useWorkspaceUsers();
  const commentsQuery = api.useTaskComments(selectedTask?.id || null);

  const createTask = api.useCreateTask();
  const createProject = api.useCreateProject();
  const updateStatus = api.useUpdateTaskStatus();
  const updatePriority = api.useUpdateTaskPriority();
  const updateAttachments = api.useUpdateTaskAttachments?.();
  const toggleSubtask = api.useToggleSubtask();
  const deleteTask = api.useDeleteTask();
  const postComment = api.usePostComment();

  const tasks = useMemo(() => tasksQuery.data || [], [tasksQuery.data]);
  const projects = useMemo(() => projectsQuery.data || [], [projectsQuery.data]);

  // Tab counts
  const counts = useMemo(() => {
    let todayCount = 0;
    let inboxCount = 0;
    let upcomingCount = 0;

    for (const t of tasks) {
      if (t.status === "completed") continue;
      const b = bucketForTask(t);
      if (b === "today" || b === "overdue") todayCount++;
      else if (b === "no-date") inboxCount++;
      else upcomingCount++;
    }

    return {
      today: todayCount,
      inbox: inboxCount,
      upcoming: upcomingCount,
      all: tasks.filter((t) => t.status !== "completed").length,
      projects: projects.length,
    };
  }, [tasks, projects]);

  const navTabs: { key: ViewKey; label: string; count?: number }[] = [
    { key: "all", label: "All Tasks", count: counts.all },
    { key: "projects", label: "Projects", count: counts.projects > 0 ? counts.projects : undefined },
    { key: "today", label: "Today", count: counts.today },
    { key: "inbox", label: "Inbox", count: counts.inbox > 0 ? counts.inbox : undefined },
    { key: "upcoming", label: "Upcoming", count: counts.upcoming > 0 ? counts.upcoming : undefined },
    { key: "board", label: "Board" },
    { key: "calendar", label: "Calendar" },
  ];

  useEffect(() => {
    if (!initialTaskId || initialTaskId === consumedInitialTaskId) return;
    const match = tasks.find((t) => t.id === initialTaskId || t._id === initialTaskId);
    if (match) {
      setSelectedTask(match);
      setConsumedInitialTaskId(initialTaskId);
    }
  }, [initialTaskId, consumedInitialTaskId, tasks]);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const handler = (e: KeyboardEvent) => {
      const isCmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      if (isCmdK) {
        e.preventDefault();
        setSelectedProject(null);
        setView("all");
      }
    };
    (document as any)?.addEventListener?.("keydown", handler);
    return () => (document as any)?.removeEventListener?.("keydown", handler);
  }, []);

  const employeeOptions = useMemo(
    () =>
      (usersQuery.data || [])
        .map((u: any) => ({
          id: String(u.id || u._id || Math.random()),
          name: String(u.name || u.username || u.email || "").trim(),
        }))
        .filter((e) => e.name.length > 0),
    [usersQuery.data]
  );
  const projectOptions = useMemo(() => projects.map((p) => ({ id: String(p.id || p._id), name: p.name })), [projects]);

  const resolveProjectName = (task: Task): string | undefined => {
    if (task.projectName) return task.projectName;
    const pid = typeof task.projectId === "string" ? task.projectId : task.projectId?._id || task.projectId?.id;
    return pid ? projects.find((p) => p.id === pid || p._id === pid)?.name : undefined;
  };

  const handleToggleComplete = (task: Task) => {
    const nextStatus: TaskStatus = task.status === "completed" ? "pending" : "completed";
    updateStatus.mutate({ taskId: task.id, status: nextStatus });
    if (nextStatus === "completed") {
      toast({ title: "Task completed", variant: "success" });
      onTaskCompleted?.(task);
    } else {
      toast({ title: "Marked incomplete" });
    }
    if (selectedTask?.id === task.id) {
      setSelectedTask({ ...task, status: nextStatus });
    }
  };

  const handleQuickAdd = (value: QuickAddValue) => {
    createTask.mutate(
      {
        title: value.title,
        description: "",
        priority: value.priority || "medium",
        status: "pending",
        assignees: value.assignees || [],
        dueDate: value.dueDate,
        projectId: value.projectId,
      },
      {
        onSuccess: () => {
          toast({ title: "Task added", variant: "success" });
        },
        onError: (err: any) => {
          const msg = err?.message || err?.error?.message || "Failed to add task";
          Alert.alert("Task Error", msg);
        },
      }
    );
  };

  const handleCreateTaskFull = (payload: TaskFormPayload) => {
    createTask.mutate(payload, {
      onSuccess: () => {
        setIsCreateTaskOpen(false);
        toast({ title: "Task created", variant: "success" });
      },
      onError: (err: any) => {
        const msg = err?.message || err?.error?.message || "Failed to create task";
        Alert.alert("Task Error", msg);
      },
    });
  };

  const handleCreateProject = (payload: ProjectFormPayload) => {
    createProject.mutate({
      name: payload.name,
      description: payload.description,
      assignees: payload.assignees,
      logoUri: payload.logoUri,
      attachments: payload.attachments,
    });
    setIsCreateProjectOpen(false);
    toast({ title: "Project created" });
  };

  const handleDeleteTask = () => {
    if (!selectedTask) return;
    Alert.alert("Delete this task?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          deleteTask.mutate(selectedTask.id);
          setSelectedTask(null);
          toast({ title: "Task deleted" });
        },
      },
    ]);
  };

  const renderView = () => {
    if (selectedProject) {
      return (
        <ProjectDetailView
          project={selectedProject}
          tasks={tasks}
          onBack={() => setSelectedProject(null)}
          onOpenTask={setSelectedTask}
          onToggleComplete={handleToggleComplete}
          onQuickAdd={handleQuickAdd}
          canManageCost={capabilities.canManageCost}
          canCreate={capabilities.canCreateTask}
        />
      );
    }
    switch (view) {
      case "today":
        return (
          <TodayView
            tasks={tasks}
            onOpenTask={setSelectedTask}
            onToggleComplete={handleToggleComplete}
            onQuickAdd={handleQuickAdd}
            onSwitchToAll={() => setView("all")}
            canCreate={capabilities.canCreateTask}
          />
        );
      case "inbox":
        return <InboxView tasks={tasks} onOpenTask={setSelectedTask} onToggleComplete={handleToggleComplete} onQuickAdd={handleQuickAdd} />;
      case "upcoming":
        return <UpcomingView tasks={tasks} onOpenTask={setSelectedTask} onToggleComplete={handleToggleComplete} onQuickAdd={handleQuickAdd} canCreate={capabilities.canCreateTask} />;
      case "all":
        return (
          <AllTasksView
            tasks={tasks}
            projectOptions={projectOptions}
            onOpenTask={setSelectedTask}
            onToggleComplete={handleToggleComplete}
            onQuickAdd={handleQuickAdd}
            canCreate={capabilities.canCreateTask}
          />
        );
      case "projects":
        return (
          <ProjectsView
            projects={projects}
            tasks={tasks}
            onOpenProject={setSelectedProject}
            onCreateProject={() => setIsCreateProjectOpen(true)}
            canCreate={capabilities.canCreateProject}
          />
        );
      case "board":
        return (
          <BoardView
            tasks={tasks}
            onOpenTask={setSelectedTask}
            onMoveStatus={(task, status) => updateStatus.mutate({ taskId: task.id, status })}
            canEdit={capabilities.canEditPriorityStatus}
          />
        );
      case "calendar":
        return <CalendarView tasks={tasks} onOpenTask={setSelectedTask} onToggleComplete={handleToggleComplete} />;
      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg.canvas }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.text.primary }]}>
          {selectedProject ? selectedProject.name : headerTitle}
        </Text>
        {!selectedProject && capabilities.canCreateTask && (
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: theme.accent.primary }]}
            onPress={() => setIsCreateTaskOpen(true)}
            activeOpacity={0.85}
          >
            <Plus size={15} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={styles.addBtnText}>Add Task</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* View Tabs Bar - fixed height to prevent vertical stretching */}
      {!selectedProject && (
        <View style={styles.navContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.navRow}
            style={styles.navScroll}
          >
            {navTabs.map((n) => {
              const isActive = view === n.key;
              return (
                <TouchableOpacity
                  key={n.key}
                  style={[
                    styles.navItem,
                    {
                      backgroundColor: isActive ? theme.accent.primarySoft : theme.bg.surface,
                      borderColor: isActive ? theme.accent.primary : theme.border.default,
                    },
                  ]}
                  onPress={() => setView(n.key)}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.navItemText,
                      {
                        color: isActive ? theme.accent.primary : theme.text.primary,
                        fontWeight: isActive ? "700" : "600",
                      },
                    ]}
                  >
                    {n.label}
                  </Text>
                  {typeof n.count === "number" && (
                    <View
                      style={[
                        styles.tabBadge,
                        {
                          backgroundColor: isActive ? theme.accent.primary : theme.bg.inset,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.tabBadgeText,
                          {
                            color: isActive ? "#FFFFFF" : theme.text.secondary,
                          },
                        ]}
                      >
                        {n.count}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Main Body */}
      <View style={styles.body}>
        {(tasksQuery.isLoading || projectsQuery.isLoading) && tasks.length === 0 && projects.length === 0 ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 40 }}>
            <ActivityIndicator size="large" color={theme.accent.primary} />
            <Text style={{ marginTop: 12, color: theme.text.secondary, fontSize: 13, fontWeight: "500" }}>Loading tasks & projects...</Text>
          </View>
        ) : (
          renderView()
        )}
      </View>

      <TaskDetailDrawer
        visible={!!selectedTask}
        task={selectedTask}
        projectName={selectedTask ? resolveProjectName(selectedTask) : undefined}
        capabilities={capabilities}
        comments={commentsQuery.data || []}
        commentsLoading={commentsQuery.isLoading}
        onClose={() => setSelectedTask(null)}
        onToggleComplete={handleToggleComplete}
        onToggleSubtask={(subtaskId, completed) => selectedTask && toggleSubtask.mutate({ taskId: selectedTask.id, subtaskId, completed })}
        onChangeStatus={(status) => {
          if (!selectedTask) return;
          updateStatus.mutate({ taskId: selectedTask.id, status });
          setSelectedTask({ ...selectedTask, status });
        }}
        onChangePriority={(priority) => {
          if (!selectedTask) return;
          updatePriority.mutate({ taskId: selectedTask.id, priority });
          setSelectedTask({ ...selectedTask, priority });
        }}
        onPostComment={(message) => selectedTask && postComment.mutate({ taskId: selectedTask.id, message })}
        onAddAttachments={(newFiles) => {
          if (!selectedTask) return;
          const current = selectedTask.attachments || (selectedTask.attachment ? [selectedTask.attachment] : []);
          const merged = [...current, ...newFiles];
          if (updateAttachments) {
            updateAttachments.mutate({ taskId: selectedTask.id, attachments: merged });
          }
          setSelectedTask({ ...selectedTask, attachments: merged });
          toast({ title: "Attachment added", variant: "success" });
        }}
        onDelete={capabilities.canDeleteTask ? handleDeleteTask : undefined}
      />

      <CreateTaskModal
        visible={isCreateTaskOpen}
        onClose={() => setIsCreateTaskOpen(false)}
        onSubmit={handleCreateTaskFull}
        isSubmitting={createTask.isPending}
        employeeOptions={employeeOptions}
        projectOptions={projectOptions}
        defaultProjectId={selectedProject?.id}
        canAssign={capabilities.canAssign}
      />

      <CreateProjectModal
        visible={isCreateProjectOpen}
        onClose={() => setIsCreateProjectOpen(false)}
        onSubmit={handleCreateProject}
        isSubmitting={createProject.isPending}
        employeeOptions={employeeOptions}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  addBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
  navContainer: {
    height: 48,
    flexGrow: 0,
    flexShrink: 0,
    marginBottom: 4,
  },
  navScroll: {
    flexGrow: 0,
    height: 48,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 8,
    height: 48,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: "center",
  },
  navItemText: {
    fontSize: 13,
  },
  tabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 10,
    minWidth: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBadgeText: {
    fontSize: 10.5,
    fontWeight: "700",
  },
  body: {
    flex: 1,
  },
});
