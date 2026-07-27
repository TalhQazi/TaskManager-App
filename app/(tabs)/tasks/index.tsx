import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Image,
  Dimensions,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSocket } from "@/contexts/SocketContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useTaskBlasterContext } from "@/contexts/TaskBlasterContext";
import { useRewards } from "@/contexts/RewardContext";
import { apiFetch } from "@/lib/admin/apiClient";
import { s, wp, hp, fs } from "@/util/styles";

const { width, height } = Dimensions.get("window");
const PAGE_SIZE = 25;

interface Task {
  id: string;
  taskNumber?: number;
  title: string;
  description: string;
  assignees: string[];
  priority: "low" | "medium" | "high";
  status: "pending" | "in-progress" | "completed" | "overdue";
  executionPriority?: number | null;
  dueDate: string;
  dueTime?: string;
  location?: string;
  introVideoUrl?: string;
  startedAt?: string | null;
  firstStartedAt?: string | null;
  startedByName?: string;
  completedAt?: string | null;
  completedByName?: string;
  createdAt: string;
  projectId?: string;
  attachmentFileName?: string;
  attachmentNote?: string;
  attachment?: {
    fileName: string;
    url: string;
    mimeType: string;
    size: number;
  };
  attachments?: Array<{
    fileName: string;
    url: string;
    mimeType: string;
    size: number;
  }>;
}

interface Employee {
  id: string;
  name: string;
  initials: string;
  email: string;
  status: "active" | "inactive" | "on-leave";
}

interface TaskComment {
  id: string;
  taskId: string;
  message: string;
  authorUsername: string;
  authorFullName?: string;
  authorAvatar?: string;
  authorRole?: string;
  createdAt: string;
  attachments?: Array<{
    fileName: string;
    url: string;
    mimeType: string;
    size: number;
  }>;
}

interface Project {
  id: string;
  name: string;
  description?: string;
  createdByUsername?: string;
  createdAt?: string;
  assignees?: string[];
  logo?: {
    fileName?: string;
    url?: string;
    mimeType?: string;
    size?: number;
  };
  taskCount?: number;
  status?: string;
  attachments?: Array<{
    fileName: string;
    url: string;
    mimeType: string;
    size: number;
  }>;
}

interface ProjectWithTasks extends Project {
  tasks: Task[];
}

function normalizeTask(t: any): Task {
  const legacyAssignee = typeof t.assignee === "string" ? t.assignee.trim() : "";
  const assignees = Array.isArray(t.assignees)
    ? t.assignees.filter(Boolean)
    : legacyAssignee
    ? [legacyAssignee]
    : [];
  return {
    id: t._id || t.id,
    taskNumber: t.taskNumber,
    title: t.title || "",
    description: t.description || "",
    assignees,
    priority: t.priority || "medium",
    status: t.status || "pending",
    executionPriority: t.executionPriority ?? null,
    dueDate: t.dueDate || "",
    dueTime: t.dueTime,
    location: t.location,
    createdAt: t.createdAt || "",
    attachmentFileName: t.attachmentFileName,
    attachmentNote: t.attachmentNote,
    attachment: t.attachment,
    attachments: Array.isArray(t.attachments) ? t.attachments : undefined,
    introVideoUrl: t.introVideoUrl,
    startedAt: t.startedAt ?? null,
    firstStartedAt: t.firstStartedAt ?? null,
    startedByName: t.startedByName,
    completedAt: t.completedAt ?? null,
    completedByName: t.completedByName,
    projectId: t.projectId,
  };
}

export default function Tasks() {
  const queryClient = useQueryClient();
  const { uiTheme } = useTheme();
  const { socket } = useSocket();
  const { triggerBlaster, incrementCompletedCount } = useTaskBlasterContext();
  const { triggerReward } = useRewards();

  const isLightTheme = useMemo(() => {
    return uiTheme.theme?.includes("crystal") || uiTheme.panelColors?.dashboardTextColor === "#000000";
  }, [uiTheme]);

  const bg = useMemo(() => uiTheme.panelColors?.dashboardBackground || (isLightTheme ? "#ffffff" : "#09090b"), [uiTheme, isLightTheme]);
  const cardBg = useMemo(() => uiTheme.panelColors?.dashboardCardBackground || (isLightTheme ? "#f8fafc" : "#18181b"), [uiTheme, isLightTheme]);
  const tintColor = useMemo(() => uiTheme.panelColors?.dashboardTextColor || (isLightTheme ? "#0f172a" : "#ffffff"), [uiTheme, isLightTheme]);
  const mutedText = useMemo(() => (isLightTheme ? "#64748b" : "#a1a1aa"), [isLightTheme]);
  const primaryColor = useMemo(() => uiTheme.customColors?.primary || "#133767", [uiTheme]);
  const border = useMemo(() => (isLightTheme ? "rgba(0, 0, 0, 0.08)" : "rgba(255, 255, 255, 0.08)"), [isLightTheme]);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [viewByPriority, setViewByPriority] = useState(false);
  const [projectPage, setProjectPage] = useState(1);
  const [taskPage, setTaskPage] = useState(1);

  const [selectedProject, setSelectedProject] = useState<ProjectWithTasks | null>(null);
  const [isLoadingProject, setIsLoadingProject] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);

  const [comments, setComments] = useState<TaskComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);

  const [pickerType, setPickerType] = useState<"status" | "priority" | "taskStatus" | "taskPriority" | null>(null);
  const chatScrollRef = useRef<ScrollView>(null);

  const projectsQuery = useQuery({
    queryKey: ["projects", projectPage, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: projectPage.toString(),
        limit: "10",
        search: searchQuery,
      });
      return apiFetch<{ items: Project[]; totalPages: number }>(`/api/projects?${params.toString()}`);
    },
  });

  const tasksQuery = useQuery({
    queryKey: ["tasks", taskPage, searchQuery, statusFilter, priorityFilter, viewByPriority],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: taskPage.toString(),
        limit: PAGE_SIZE.toString(),
        search: searchQuery,
        status: statusFilter,
        priority: priorityFilter,
      });
      if (viewByPriority) params.set("sort", "priority");
      const res = await apiFetch<{ items: any[]; totalPages: number; total: number }>(`/api/tasks?${params.toString()}`);
      return {
        items: (res.items || []).map(normalizeTask),
        totalPages: res.totalPages,
        totalItems: res.total,
      };
    },
  });

  useEffect(() => {
    setTaskPage(1);
  }, [searchQuery, statusFilter, priorityFilter, viewByPriority]);

  useEffect(() => {
    setProjectPage(1);
  }, [searchQuery]);

  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const res = await apiFetch<{ items: Employee[] }>("/api/employees");
        setEmployees(res.items.filter((e) => e.status === "active"));
      } catch {
        setEmployees([]);
      }
    };
    loadEmployees();
  }, []);

  const resolveAssigneeName = useMemo(() => {
    const byEmail = new Map(employees.map((e) => [e.email.toLowerCase(), e.name]));
    const byName = new Map(employees.map((e) => [e.name.toLowerCase(), e.name]));
    return (val: string): string => {
      const v = (val || "").trim();
      return byEmail.get(v.toLowerCase()) || byName.get(v.toLowerCase()) || v;
    };
  }, [employees]);

  const loadProject = async (projectId: string) => {
    setIsLoadingProject(true);
    setSelectedProject(null);
    try {
      const res = await apiFetch<{ item: any }>(`/api/projects/${encodeURIComponent(projectId)}`);
      if (!res.item) throw new Error("Project not found");
      const project = res.item;
      const projectTasks: Task[] = Array.isArray(project.tasks) ? project.tasks.map(normalizeTask) : [];
      setSelectedProject({ ...project, tasks: projectTasks });
    } catch (err) {
      Alert.alert("Error", "Failed to load project details");
    } finally {
      setIsLoadingProject(false);
    }
  };

  const loadComments = async (taskId: string) => {
    try {
      setCommentsLoading(true);
      const res = await apiFetch<{ items: TaskComment[] }>(`/api/tasks/${encodeURIComponent(taskId)}/comments`);
      setComments(Array.isArray(res.items) ? res.items : []);
      setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 150);
    } catch {
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  };

  const openView = (task: Task) => {
    setSelectedTask(task);
    setIsViewOpen(true);
    loadComments(task.id);
  };

  useEffect(() => {
    if (!socket || !selectedTask) return;
    const taskId = selectedTask.id;
    socket.emit("join-task", taskId);

    const handleNewComment = (comment: TaskComment) => {
      if (comment.taskId !== taskId) return;
      setComments((prev) => {
        if (prev.find((c) => c.id === comment.id)) return prev;
        return [...prev, comment];
      });
      setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);
    };

    socket.on("new-comment", handleNewComment);
    return () => {
      socket.off("new-comment", handleNewComment);
      socket.emit("leave-task", taskId);
    };
  }, [socket, selectedTask?.id]);

  const updateStatus = async (next: Task["status"]) => {
    if (!selectedTask) return;
    const previousStatus = selectedTask.status;
    try {
      setStatusSaving(true);
      const res = await apiFetch<{ item: any }>(`/api/tasks/${encodeURIComponent(selectedTask.id)}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: next }),
      });
      const normalized = normalizeTask(res.item);
      setSelectedTask(normalized);

      if (selectedProject) {
        setSelectedProject((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            tasks: prev.tasks.map((t) => (t.id === normalized.id ? normalized : t)),
          };
        });
      }

      queryClient.invalidateQueries({ queryKey: ["tasks"] });

      if (next === "completed" && previousStatus !== "completed") {
        const triggered = triggerBlaster({
          id: normalized.id,
          title: normalized.title,
          priority: normalized.priority,
          status: "completed",
        });
        if (triggered) incrementCompletedCount();
        triggerReward(width / 2, height / 2);
      }
    } catch {
      Alert.alert("Error", "Failed to update workflow status");
    } finally {
      setStatusSaving(false);
    }
  };

  const sendComment = async () => {
    if (!selectedTask || !commentDraft.trim()) return;
    try {
      const msg = commentDraft.trim();
      setCommentDraft("");
      const res = await apiFetch<{ item: TaskComment }>(`/api/tasks/${encodeURIComponent(selectedTask.id)}/comments`, {
        method: "POST",
        body: JSON.stringify({ message: msg, attachments: [] }),
      });
      setComments((prev) => [...prev, res.item]);
      setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {
      Alert.alert("Error", "Failed to dispatch comment");
    }
  };

  const updateProjectStatusMutation = useMutation({
    mutationFn: async ({ projectId, status }: { projectId: string; status: string }) => {
      return apiFetch<{ id: string; status: string }>(`/api/projects/${projectId}`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      if (selectedProject && selectedProject.id === variables.projectId) {
        setSelectedProject({ ...selectedProject, status: variables.status });
      }
    },
  });

  const getPriorityColor = (priority: string) => {
    if (priority === "high") return "rgb(239, 68, 68)";
    if (priority === "medium") return "rgb(234, 179, 8)";
    return "rgb(34, 197, 94)";
  };

  const currentProjectTasks = useMemo(() => {
    if (!selectedProject) return [];
    return selectedProject.tasks.filter((task) => {
      const assigneesText = Array.isArray(task.assignees) ? task.assignees.join(" ") : "";
      const matchesSearch =
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        assigneesText.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || task.status === statusFilter;
      const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [selectedProject, searchQuery, statusFilter, priorityFilter]);

  return (
    <SafeAreaView style={s([styles.container, { backgroundColor: bg }])}>
      <StatusBar barStyle={isLightTheme ? "dark-content" : "light-content"} backgroundColor={bg} />

      <View style={s([styles.headerContainer, { borderBottomColor: border }])}>
        <View style={s(styles.headerRow)}>
          {selectedProject ? (
            <TouchableOpacity
              style={s(styles.backButton)}
              onPress={() => {
                setSelectedProject(null);
                setSearchQuery("");
                setTaskPage(1);
              }}
            >
              <Ionicons name="chevron-back" size={fs(5.5)} color={tintColor} />
              <Text style={s([styles.backText, { color: tintColor }])}>Projects</Text>
            </TouchableOpacity>
          ) : (
            <View>
              <Text style={s([styles.pageTitle, { color: tintColor }])}>Task Management</Text>
              <Text style={s([styles.pageSubtitle, { color: mutedText }])}>Create, assign, and track all tasks</Text>
            </View>
          )}
        </View>

        <View style={s(styles.filterBar)}>
          <View style={s([styles.searchBox, { backgroundColor: cardBg, borderColor: border }])}>
            <Ionicons name="search-outline" size={fs(4.2)} color={mutedText} style={s({ marginRight: wp(1.5) })} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search tasks or assignee..."
              placeholderTextColor={mutedText}
              style={s([styles.searchInput, { color: tintColor }])}
            />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s(styles.filterScroll)}>
            <TouchableOpacity style={s([styles.filterButton, { backgroundColor: cardBg, borderColor: border }])} onPress={() => setPickerType("status")}>
              <Text style={s([styles.filterButtonText, { color: tintColor }])}>Status: {statusFilter}</Text>
              <Ionicons name="chevron-down" size={fs(3.2)} color={tintColor} />
            </TouchableOpacity>

            <TouchableOpacity style={s([styles.filterButton, { backgroundColor: cardBg, borderColor: border }])} onPress={() => setPickerType("priority")}>
              <Text style={s([styles.filterButtonText, { color: tintColor }])}>Priority: {priorityFilter}</Text>
              <Ionicons name="chevron-down" size={fs(3.2)} color={tintColor} />
            </TouchableOpacity>

            <TouchableOpacity
              style={s([styles.filterButton, { backgroundColor: viewByPriority ? primaryColor : cardBg, borderColor: border }])}
              onPress={() => setViewByPriority(!viewByPriority)}
            >
              <Ionicons name="flame-outline" size={fs(3.2)} color={viewByPriority ? "#ffffff" : tintColor} style={s({ marginRight: wp(1) })} />
              <Text style={s([styles.filterButtonText, { color: viewByPriority ? "#ffffff" : tintColor }])}>By Priority</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>

      {isLoadingProject ? (
        <View style={s(styles.center)}>
          <ActivityIndicator size="large" color={primaryColor} />
        </View>
      ) : selectedProject ? (
        <ScrollView contentContainerStyle={s(styles.contentScroll)} showsVerticalScrollIndicator={false}>
          <View style={s([styles.projectOverviewCard, { backgroundColor: cardBg, borderColor: border }])}>
            <View style={s(styles.projectHeaderDetails)}>
              <View style={s([styles.projectAvatar, { backgroundColor: primaryColor }])}>
                <Text style={s(styles.projectAvatarText)}>{selectedProject.name.slice(0, 2).toUpperCase()}</Text>
              </View>
              <View style={s({ flex: 1, marginLeft: wp(3) })}>
                <Text style={s([styles.projectCardTitle, { color: tintColor }])}>Project: {selectedProject.name}</Text>
                <Text style={s([styles.projectCardDesc, { color: mutedText }])}>{selectedProject.description || "No description provided."}</Text>
              </View>
            </View>

            <View style={s([styles.projectMetaRow, { borderTopColor: border }])}>
              <View style={s(styles.metaBadge)}>
                <Ionicons name="layers-outline" size={fs(3.2)} color={mutedText} />
                <Text style={s([styles.metaBadgeText, { color: mutedText }])}>{selectedProject.tasks?.length || 0} tasks</Text>
              </View>
              <View style={s([styles.statusBadge, { backgroundColor: "rgba(19,55,103,0.1)" }])}>
                <Text style={s([styles.statusBadgeText, { color: primaryColor }])}>{selectedProject.status || "No tasks"}</Text>
              </View>
            </View>
          </View>

          <Text style={s([styles.sectionHeading, { color: tintColor }])}>Project Tasks</Text>
          {currentProjectTasks.length === 0 ? (
            <Text style={s([styles.emptyText, { color: mutedText }])}>No tasks match your selection metrics.</Text>
          ) : (
            currentProjectTasks.map((task) => (
              <TouchableOpacity key={task.id} style={s([styles.taskCard, { backgroundColor: cardBg, borderColor: border }])} onPress={() => openView(task)}>
                <View style={s(styles.taskCardHeader)}>
                  <Text style={s([styles.taskCardTitle, { color: tintColor }])} numberOfLines={1}>
                    {task.title}
                  </Text>
                  {task.executionPriority ? (
                    <View style={s(styles.executionBadge)}>
                      <Ionicons name="flame" size={fs(2.5)} color="#ffffff" />
                      <Text style={s(styles.executionBadgeText)}>#{task.executionPriority}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={s([styles.taskCardDesc, { color: mutedText }])} numberOfLines={2}>
                  {task.description}
                </Text>

                <View style={s(styles.taskCardFooter)}>
                  <View style={s(styles.badgeRow)}>
                    <View style={s([styles.pillBadge, { backgroundColor: getPriorityColor(task.priority) }])}>
                      <Text style={s(styles.pillBadgeText)}>{task.priority}</Text>
                    </View>
                    <View style={s([styles.pillBadge, { backgroundColor: "rgba(100,116,139,0.15)" }])}>
                      <Text style={s([styles.pillBadgeText, { color: tintColor }])}>{task.status}</Text>
                    </View>
                  </View>
                  <Text style={s([styles.taskDateText, { color: mutedText }])}>
                    Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "—"}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={s(styles.contentScroll)} showsVerticalScrollIndicator={false}>
          <Text style={s([styles.sectionHeading, { color: tintColor }])}>Projects</Text>
          {projectsQuery.isLoading ? (
            <ActivityIndicator size="small" color={primaryColor} />
          ) : projectsQuery.data?.items.length === 0 ? (
            <Text style={s([styles.emptyText, { color: mutedText }])}>No active deployment boards configuration discovered.</Text>
          ) : (
            <View style={s(styles.gridContainer)}>
              {projectsQuery.data?.items.map((project) => (
                <TouchableOpacity key={project.id} style={s([styles.projectGridItem, { backgroundColor: cardBg, borderColor: border }])} onPress={() => loadProject(project.id)}>
                  <View style={s(styles.projectGridTop)}>
                    <View style={s([styles.smallProjectAvatar, { backgroundColor: primaryColor }])}>
                      <Text style={s(styles.smallProjectAvatarText)}>{project.name.slice(0, 2).toUpperCase()}</Text>
                    </View>
                    <View style={s({ flex: 1, marginLeft: wp(2.5) })}>
                      <Text style={s([styles.projectGridTitle, { color: tintColor }])} numberOfLines={1}>
                        {project.name}
                      </Text>
                      <Text style={s([styles.projectGridDesc, { color: mutedText }])} numberOfLines={1}>
                        {project.description || "No description"}
                      </Text>
                    </View>
                  </View>
                  <View style={s(styles.projectGridBottom)}>
                    <View style={s([styles.statusBadge, { backgroundColor: "rgba(100,116,139,0.1)" }])}>
                      <Text style={s([styles.statusBadgeText, { color: tintColor }])}>{project.status || "No tasks"}</Text>
                    </View>
                    <Text style={s([styles.projectTaskCount, { color: mutedText }])}>{project.taskCount ?? 0} tasks</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={s([styles.sectionHeading, { color: tintColor, marginTop: hp(3) }])}>Standalone Tasks</Text>
          {tasksQuery.isLoading ? (
            <ActivityIndicator size="small" color={primaryColor} />
          ) : tasksQuery.data?.items.filter((t) => !t.projectId).length === 0 ? (
            <Text style={s([styles.emptyText, { color: mutedText }])}>No separate standalone items logged for your workspace tracking context.</Text>
          ) : (
            tasksQuery.data?.items
              .filter((t) => !t.projectId)
              .map((task) => (
                <TouchableOpacity key={task.id} style={s([styles.taskCard, { backgroundColor: cardBg, borderColor: border }])} onPress={() => openView(task)}>
                  <Text style={s([styles.taskCardTitle, { color: tintColor }])} numberOfLines={1}>
                    {task.title}
                  </Text>
                  <Text style={s([styles.taskCardDesc, { color: mutedText }])} numberOfLines={2}>
                    {task.description}
                  </Text>
                  <View style={s(styles.taskCardFooter)}>
                    <View style={s(styles.badgeRow)}>
                      <View style={s([styles.pillBadge, { backgroundColor: getPriorityColor(task.priority) }])}>
                        <Text style={s(styles.pillBadgeText)}>{task.priority}</Text>
                      </View>
                      <View style={s([styles.pillBadge, { backgroundColor: "rgba(100,116,139,0.15)" }])}>
                        <Text style={s([styles.pillBadgeText, { color: tintColor }])}>{task.status}</Text>
                      </View>
                    </View>
                    <Text style={s([styles.taskDateText, { color: mutedText }])}>
                      Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "—"}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
          )}
        </ScrollView>
      )}

      {/* Main Task View Lightbox modal */}
      <Modal visible={isViewOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setIsViewOpen(false)}>
        <View style={s([styles.modalWrapper, { backgroundColor: bg }])}>
          {selectedTask && (
            <View style={s({ flex: 1 })}>
              <View style={s([styles.modalHeader, { borderBottomColor: border, backgroundColor: cardBg }])}>
                <View style={s({ flex: 1 })}>
                  <View style={s(styles.modalMetaRow)}>
                    <View style={s([styles.pillBadge, { backgroundColor: getPriorityColor(selectedTask.priority), marginRight: wp(1.5) }])}>
                      <Text style={s(styles.pillBadgeText)}>{selectedTask.priority} Priority</Text>
                    </View>
                    <Text style={s([styles.metaIdText, { color: mutedText }])}>• {selectedTask.id.slice(-6).toUpperCase()}</Text>
                  </View>
                  <Text style={s([styles.modalTitle, { color: tintColor }])} numberOfLines={1}>
                    {selectedTask.title}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setIsViewOpen(false)} style={s(styles.closeButton)}>
                  <Ionicons name="close" size={fs(5.5)} color={tintColor} />
                </TouchableOpacity>
              </View>

              <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={s({ flex: 1 })}>
                <ScrollView ref={chatScrollRef} contentContainerStyle={s(styles.modalScrollContent)} showsVerticalScrollIndicator={false}>
                  <Text style={s([styles.deckHeading, { color: mutedText }])}>DESCRIPTION</Text>
                  <View style={s([styles.descContainer, { backgroundColor: cardBg, borderColor: border }])}>
                    <Text style={s([styles.descBody, { color: tintColor }])}>{selectedTask.description || "No descriptive text parameters available."}</Text>
                  </View>

                  <Text style={s([styles.deckHeading, { color: mutedText, marginTop: hp(3) }])}>PROPERTY DECK</Text>
                  <View style={s([styles.propertyDeck, { backgroundColor: cardBg, borderColor: border }])}>
                    <TouchableOpacity style={s([styles.deckRow, { borderBottomColor: border }])} onPress={() => setPickerType("taskStatus")}>
                      <Text style={s([styles.deckLabel, { color: mutedText }])}>Status Workflow</Text>
                      <View style={s(styles.deckValueRow)}>
                        <Text style={s([styles.deckValue, { color: tintColor, textTransform: "capitalize" }])}>{selectedTask.status}</Text>
                        <Ionicons name="chevron-forward" size={fs(3.8)} color={mutedText} />
                      </View>
                    </TouchableOpacity>

                    <View style={s([styles.deckRow, { borderBottomColor: border }])}>
                      <Text style={s([styles.deckLabel, { color: mutedText }])}>Delivery Date</Text>
                      <Text style={s([styles.deckValue, { color: tintColor }])}>
                        {selectedTask.dueDate ? new Date(selectedTask.dueDate).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }) : "—"}
                      </Text>
                    </View>

                    {selectedTask.location ? (
                      <View style={s(styles.deckRow)}>
                        <Text style={s([styles.deckLabel, { color: mutedText }])}>Workspace Location</Text>
                        <Text style={s([styles.deckValue, { color: tintColor }])} numberOfLines={1}>
                          {selectedTask.location}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <Text style={s([styles.deckHeading, { color: mutedText, marginTop: hp(3) }])}>COLLABORATORS</Text>
                  <View style={s(styles.collaboratorsContainer)}>
                    {selectedTask.assignees && selectedTask.assignees.length > 0 ? (
                      selectedTask.assignees.map((assignee, idx) => (
                        <View key={idx} style={s(styles.collaboratorPill)}>
                          <View style={s([styles.collaboratorAvatar, { backgroundColor: primaryColor }])}>
                            <Text style={s(styles.collaboratorAvatarText)}>
                              {assignee
                                .split(" ")
                                .map((n) => (n ? n[0] : ""))
                                .join("")
                                .toUpperCase()}
                            </Text>
                          </View>
                          <Text style={s([styles.collaboratorName, { color: tintColor }])} numberOfLines={1}>
                            {resolveAssigneeName(assignee)}
                          </Text>
                        </View>
                      ))
                    ) : (
                      <Text style={s([styles.emptyText, { color: mutedText, fontStyle: "italic" }])}>Unassigned</Text>
                    )}
                  </View>

                  <View style={s([styles.activityHeaderRow, { borderTopColor: border }])}>
                    <Text style={s([styles.deckHeading, { color: mutedText, marginTop: 0 }])}>ACTIVITY FEED</Text>
                    <TouchableOpacity style={s(styles.refreshButton)} onPress={() => loadComments(selectedTask.id)}>
                      <Ionicons name="refresh" size={fs(3.2)} color={primaryColor} />
                      <Text style={s([styles.refreshButtonText, { color: primaryColor }])}>Refresh</Text>
                    </TouchableOpacity>
                  </View>

                  {commentsLoading && comments.length === 0 ? (
                    <ActivityIndicator size="small" color={primaryColor} style={s({ marginVertical: hp(2.5) })} />
                  ) : comments.length === 0 ? (
                    <View style={s([styles.emptyChatBox, { borderColor: border }])}>
                      <Text style={s([styles.emptyChatTitle, { color: tintColor }])}>No activity yet</Text>
                      <Text style={s([styles.emptyChatSub, { color: mutedText }])}>Be the first to leave a comment or update parameters.</Text>
                    </View>
                  ) : (
                    <View style={s(styles.commentsList)}>
                      {comments.map((c) => (
                        <View key={c.id} style={s([styles.commentCard, { backgroundColor: cardBg, borderColor: border }])}>
                          <View style={s(styles.commentHeader)}>
                            <View style={s([styles.commentAvatar, { backgroundColor: primaryColor }])}>
                              <Text style={s(styles.commentAvatarText)}>
                                {(c.authorFullName || c.authorUsername || "U")
                                  .split(" ")
                                  .map((n) => (n ? n[0] : ""))
                                  .join("")
                                  .toUpperCase()}
                              </Text>
                            </View>
                            <View style={s({ flex: 1, marginLeft: wp(2.5) })}>
                              <Text style={s([styles.commentAuthor, { color: tintColor }])}>{c.authorFullName || c.authorUsername}</Text>
                              {c.authorRole && (
                                <View style={s(styles.roleBadge)}>
                                  <Text style={s(styles.roleBadgeText)}>{c.authorRole}</Text>
                                </View>
                              )}
                            </View>
                          </View>
                          <Text style={s([styles.commentMessage, { color: tintColor }])}>{c.message}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </ScrollView>

                <View style={s([styles.chatInputRow, { borderTopColor: border, backgroundColor: bg }])}>
                  <TextInput
                    value={commentDraft}
                    onChangeText={setCommentDraft}
                    placeholder="Type a message or share an update..."
                    placeholderTextColor={mutedText}
                    style={s([styles.chatInput, { color: tintColor, borderColor: border, backgroundColor: cardBg }])}
                    multiline
                  />
                  <TouchableOpacity
                    style={s([styles.chatSendButton, { backgroundColor: commentDraft.trim() ? primaryColor : mutedText }])}
                    disabled={!commentDraft.trim()}
                    onPress={sendComment}
                  >
                    <Ionicons name="send" size={fs(3.8)} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              </KeyboardAvoidingView>
            </View>
          )}
        </View>
      </Modal>

      {/* Global Context Pickers */}
      <Modal visible={pickerType !== null} transparent animationType="fade" onRequestClose={() => setPickerType(null)}>
        <TouchableOpacity style={s(styles.pickerOverlay)} activeOpacity={1} onPress={() => setPickerType(null)}>
          <View style={s([styles.pickerModal, { backgroundColor: cardBg }])}>
            <Text style={s([styles.pickerTitle, { color: tintColor }])}>Select Option</Text>

            {pickerType === "status" && (
              <ScrollView>
                {["all", "active", "pending", "completed"].map((st) => (
                  <TouchableOpacity
                    key={st}
                    style={s([styles.pickerItem, { borderBottomColor: border }])}
                    onPress={() => {
                      setStatusFilter(st);
                      setPickerType(null);
                    }}
                  >
                    <Text style={s([styles.pickerItemText, { color: tintColor, textTransform: "capitalize" }])}>{st}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {pickerType === "priority" && (
              <ScrollView>
                {["all", "high", "medium", "low"].map((pr) => (
                  <TouchableOpacity
                    key={pr}
                    style={s([styles.pickerItem, { borderBottomColor: border }])}
                    onPress={() => {
                      setPriorityFilter(pr);
                      setPickerType(null);
                    }}
                  >
                    <Text style={s([styles.pickerItemText, { color: tintColor, textTransform: "capitalize" }])}>{pr}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {pickerType === "taskStatus" && (
              <ScrollView>
                {["pending", "in-progress", "completed", "overdue"].map((ts) => (
                  <TouchableOpacity
                    key={ts}
                    style={s([styles.pickerItem, { borderBottomColor: border }])}
                    onPress={() => {
                      updateStatus(ts as Task["status"]);
                      setPickerType(null);
                    }}
                  >
                    <Text style={s([styles.pickerItemText, { color: tintColor, textTransform: "capitalize" }])}>{ts}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerContainer: { paddingHorizontal: wp(4), paddingTop: hp(1.5), borderBottomWidth: 1, paddingBottom: hp(1.5) },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  pageTitle: { fontSize: fs(5), fontWeight: "800", letterSpacing: -0.5 },
  pageSubtitle: { fontSize: fs(3), marginTop: hp(0.2) },
  backButton: { flexDirection: "row", alignItems: "center", paddingVertical: hp(0.5) },
  backText: { fontSize: fs(3.8), fontWeight: "600", marginLeft: wp(1) },
  filterBar: { marginTop: hp(1.8) },
  searchBox: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: wp(2.5), paddingHorizontal: wp(3), height: hp(5) },
  searchInput: { flex: 1, fontSize: fs(3.2), paddingVertical: 0 },
  filterScroll: { marginTop: hp(1.2), gap: wp(2), paddingRight: wp(4) },
  filterButton: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: wp(5), paddingHorizontal: wp(3), paddingVertical: hp(0.8), gap: wp(1) },
  filterButtonText: { fontSize: fs(2.8), fontWeight: "600", textTransform: "capitalize" },
  contentScroll: { padding: wp(4), paddingBottom: hp(5) },
  sectionHeading: { fontSize: fs(3.5), fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: hp(1.5) },
  emptyText: { fontSize: fs(3), textAlign: "center", marginVertical: hp(3) },
  gridContainer: { flexDirection: "row", flexWrap: "wrap", gap: wp(3), marginBottom: hp(3) },
  projectGridItem: { width: wp(43), padding: wp(3), borderRadius: wp(3), borderWidth: 1, justifyContent: "space-between", minHeight: hp(13) },
  projectGridTop: { flexDirection: "row", alignItems: "center" },
  smallProjectAvatar: { width: wp(8), height: wp(8), borderRadius: wp(2), justifyContent: "center", alignItems: "center" },
  smallProjectAvatarText: { color: "#ffffff", fontSize: fs(2.8), fontWeight: "700" },
  projectGridTitle: { fontSize: fs(3), fontWeight: "700" },
  projectGridDesc: { fontSize: fs(2.5), marginTop: hp(0.1) },
  projectGridBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: hp(1.5) },
  projectTaskCount: { fontSize: fs(2.5), fontWeight: "500" },
  projectOverviewCard: { padding: wp(4), borderRadius: wp(4), borderWidth: 1, marginBottom: hp(3) },
  projectHeaderDetails: { flexDirection: "row", alignItems: "center" },
  projectAvatar: { width: wp(11), height: wp(11), borderRadius: wp(2.5), justifyContent: "center", alignItems: "center" },
  projectAvatarText: { color: "#ffffff", fontSize: fs(3.8), fontWeight: "800" },
  projectCardTitle: { fontSize: fs(3.8), fontWeight: "700" },
  projectCardDesc: { fontSize: fs(3), marginTop: hp(0.2), lineHeight: fs(4) },
  projectMetaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: hp(1.8), paddingTop: hp(1.5), borderTopWidth: 1 },
  metaBadge: { flexDirection: "row", alignItems: "center", gap: wp(1) },
  metaBadgeText: { fontSize: fs(2.8), fontWeight: "600" },
  statusBadge: { paddingHorizontal: wp(2), paddingVertical: hp(0.4), borderRadius: wp(1.5) },
  statusBadgeText: { fontSize: fs(2.2), fontWeight: "700", textTransform: "uppercase" },
  taskCard: { padding: wp(4), borderRadius: wp(3.5), borderWidth: 1, marginBottom: hp(1.5) },
  taskCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  taskCardTitle: { fontSize: fs(3.2), fontWeight: "700", flex: 1 },
  executionBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "rgb(249,115,22)", paddingHorizontal: wp(1.5), paddingVertical: hp(0.3), borderRadius: wp(1), gap: wp(0.5) },
  executionBadgeText: { color: "#ffffff", fontSize: fs(2.1), fontWeight: "700" },
  taskCardDesc: { fontSize: fs(2.8), marginTop: hp(0.5), lineHeight: fs(3.8) },
  taskCardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: hp(1.5) },
  badgeRow: { flexDirection: "row", gap: wp(1.5) },
  pillBadge: { paddingHorizontal: wp(2), paddingVertical: hp(0.4), borderRadius: wp(3) },
  pillBadgeText: { color: "#ffffff", fontSize: fs(2.2), fontWeight: "700", textTransform: "uppercase" },
  taskDateText: { fontSize: fs(2.5), fontWeight: "500" },
  modalWrapper: { flex: 1 },
  modalHeader: { flexDirection: "row", alignItems: "center", padding: wp(4), borderBottomWidth: 1 },
  modalMetaRow: { flexDirection: "row", alignItems: "center", marginBottom: hp(0.2) },
  metaIdText: { fontSize: fs(2.5), fontWeight: "600" },
  modalTitle: { fontSize: fs(4.2), fontWeight: "800" },
  closeButton: { padding: wp(1), marginLeft: wp(2) },
  modalScrollContent: { padding: wp(4), paddingBottom: hp(5) },
  deckHeading: { fontSize: fs(2.5), fontWeight: "700", letterSpacing: 1 },
  descContainer: { padding: wp(3.5), borderRadius: wp(3), borderWidth: 1, marginTop: hp(0.8) },
  descBody: { fontSize: fs(3.2), lineHeight: fs(4.8) },
  propertyDeck: { borderRadius: wp(3), borderWidth: 1, marginTop: hp(0.8), overflow: "hidden" },
  deckRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: wp(3.5), borderBottomWidth: 1 },
  deckLabel: { fontSize: fs(3), fontWeight: "600" },
  deckValueRow: { flexDirection: "row", alignItems: "center", gap: wp(1) },
  deckValue: { fontSize: fs(3), fontWeight: "700" },
  collaboratorsContainer: { flexDirection: "row", flexWrap: "wrap", gap: wp(2), marginTop: hp(1) },
  collaboratorPill: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "rgba(0,0,0,0.06)", borderRadius: wp(5), paddingHorizontal: wp(2.5), paddingVertical: hp(0.6), backgroundColor: "#ffffff" },
  collaboratorAvatar: { width: wp(5), height: wp(5), borderRadius: wp(2.5), justifyContent: "center", alignItems: "center" },
  collaboratorAvatarText: { color: "#ffffff", fontSize: fs(2), fontWeight: "700" },
  collaboratorName: { fontSize: fs(2.8), fontWeight: "600", marginLeft: wp(1.5) },
  activityHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: hp(3), paddingTop: hp(2), borderTopWidth: 1 },
  refreshButton: { flexDirection: "row", alignItems: "center", gap: wp(1), paddingVertical: hp(0.5) },
  refreshButtonText: { fontSize: fs(2.8), fontWeight: "700" },
  emptyChatBox: { borderEndWidth: 1, borderStyle: "dashed", borderWidth: 2, borderRadius: wp(4), padding: wp(6), alignItems: "center", marginTop: hp(1) },
  emptyChatTitle: { fontSize: fs(3.2), fontWeight: "700" },
  emptyChatSub: { fontSize: fs(2.8), marginTop: hp(0.3), textAlign: "center" },
  commentsList: { marginTop: hp(1), gap: hp(1.5) },
  commentCard: { padding: wp(3), borderRadius: wp(3), borderWidth: 1 },
  commentHeader: { flexDirection: "row", alignItems: "center" },
  commentAvatar: { width: wp(7), height: wp(7), borderRadius: wp(3.5), justifyContent: "center", alignItems: "center" },
  commentAvatarText: { color: "#ffffff", fontSize: fs(2.5), fontWeight: "700" },
  commentAuthor: { fontSize: fs(3), fontWeight: "700" },
  roleBadge: { backgroundColor: "rgba(0,0,0,0.05)", paddingHorizontal: wp(1), paddingVertical: hp(0.1), borderRadius: wp(1), marginTop: hp(0.1), alignSelf: "flex-start" },
  roleBadgeText: { fontSize: fs(2.1), fontWeight: "600" },
  commentMessage: { fontSize: fs(3), marginTop: hp(1), lineHeight: fs(4.2) },
  chatInputRow: { flexDirection: "row", alignItems: "center", padding: wp(3), borderTopWidth: 1, gap: wp(2) },
  chatInput: { flex: 1, minHeight: hp(4.8), maxHeight: hp(12), borderWidth: 1, borderRadius: wp(4.5), paddingHorizontal: wp(3.5), paddingTop: hp(1), paddingBottom: hp(1), fontSize: fs(3.2) },
  chatSendButton: { width: wp(9.5), height: wp(9.5), borderRadius: wp(4.75), justifyContent: "center", alignItems: "center" },
  pickerOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  pickerModal: { borderTopLeftRadius: wp(5), borderTopRightRadius: wp(5), padding: wp(5), maxHeight: height * 0.5 },
  pickerTitle: { fontSize: fs(3.8), fontWeight: "800", marginBottom: hp(1.5), textAlign: "center" },
  pickerItem: { paddingVertical: hp(1.8), borderBottomWidth: 1, alignItems: "center" },
  pickerItemText: { fontSize: fs(3.2), fontWeight: "600" },
});