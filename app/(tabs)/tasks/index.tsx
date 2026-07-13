import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  Alert,
  Image,
} from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";

// Native Icons mapping matching lucide-react web choices
import {
  Plus,
  Search,
  Filter,
  Calendar,
  MapPin,
  FileText,
  Download,
  Check,
  Clock,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Users,
  Eye,
  Edit,
  Trash2,
  X,
  MessageSquare,
  RefreshCw,
  Maximize2,
  ChevronDown,
} from "lucide-react-native";

// External contexts and utilities from your codebase
import { useSocket } from "@/contexts/SocketContext";
import { apiFetch, toProxiedUrl } from "@/lib/admin/apiClient";
import { useTaskBlasterContext } from "@/contexts/TaskBlasterContext";
import { useRewards } from "@/contexts/RewardProvider";

// --- Type Declarations & Schema Setup ---
interface Task {
  id: string;
  taskNumber?: number;
  title: string;
  description: string;
  assignees: string[];
  priority: "low" | "medium" | "high";
  status: "pending" | "in-progress" | "completed" | "overdue";
  dueDate: string;
  dueTime?: string;
  location?: string;
  createdAt: string;
  projectId?: string;
  attachmentFileName?: string;
  attachments?: Array<{ fileName: string; url: string; mimeType: string; size: number }>;
}

interface Project {
  id: string;
  name: string;
  description?: string;
  assignees?: string[];
  logo?: { url?: string; fileName?: string };
  taskCount?: number;
  status?: string;
}

interface TaskComment {
  id: string;
  taskId: string;
  message: string;
  authorUsername: string;
  authorFullName?: string;
  createdAt: string;
  attachments?: Array<{ fileName: string; url: string; mimeType: string; size: number }>;
}

interface Employee {
  id: string;
  name: string;
  email: string;
  status: "active" | "inactive";
}

const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  priority: z.enum(["low", "medium", "high"]),
  status: z.enum(["pending", "in-progress", "completed", "overdue"]),
  dueDate: z.string().optional(),
  dueTime: z.string().optional(),
  location: z.string().optional(),
  assignees: z.array(z.string()).optional().default([]),
});

type CreateTaskValues = z.infer<typeof createTaskSchema>;

function normalizeTask(t: any): Task {
  return {
    id: t._id || t.id,
    taskNumber: t.taskNumber,
    title: t.title,
    description: t.description,
    assignees: Array.isArray(t.assignees) ? t.assignees : [],
    priority: t.priority || "medium",
    status: t.status || "pending",
    dueDate: t.dueDate,
    dueTime: t.dueTime,
    location: t.location,
    createdAt: t.createdAt,
    attachmentFileName: t.attachmentFileName,
    attachments: t.attachments,
  };
}

// --- Color Scheme Theme Tokens (Dark Mode) ---
const THEME = {
  bgCanvas: "#0B0F19",
  bgSurface: "#161D30",
  bgCard: "#1F2A45",
  border: "#2A3958",
  textPrimary: "#F3F4F6",
  textSecondary: "#9CA3AF",
  textMuted: "#6B7280",
  primary: "#3B82F6",
  accent: "#10B981",
  
  low: { bg: "rgba(16, 185, 129, 0.15)", text: "#10B981" },
  medium: { bg: "rgba(245, 158, 11, 0.15)", text: "#F59E0B" },
  high: { bg: "rgba(239, 68, 68, 0.15)", text: "#EF4444" },
  
  pending: { bg: "rgba(107, 114, 128, 0.15)", text: "#9CA3AF" },
  "in-progress": { bg: "rgba(59, 130, 246, 0.15)", text: "#3B82F6" },
  completed: { bg: "rgba(16, 185, 129, 0.15)", text: "#10B981" },
  overdue: { bg: "rgba(239, 68, 68, 0.15)", text: "#EF4444" },
};

export default function Tasks() {
  const queryClient = useQueryClient();
  const { socket } = useSocket();
  const { triggerBlaster, incrementCompletedCount } = useTaskBlasterContext();
  const { triggerReward } = useRewards();

  // Component states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  
  // Modals management
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isViewTaskOpen, setIsViewTaskOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  
  // Comments management
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [commentDraft, setCommentDraft] = useState("");
  const [isSendingComment, setIsSendingComment] = useState(false);

  // Form hooks
  const { control, handleSubmit, reset, setValue } = useForm<CreateTaskValues>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "medium",
      status: "pending",
      dueDate: new Date().toISOString().split("T")[0],
      dueTime: "",
      location: "",
      assignees: [],
    },
  });

  // Tanstack Queries
  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ["projects", searchQuery],
    queryFn: async () => {
      const res = await apiFetch<{ items: Project[] }>(`/api/projects?search=${searchQuery}`);
      return res.items || [];
    },
  });

  const { data: tasksData, isLoading: tasksLoading } = useQuery({
    queryKey: ["tasks", statusFilter, priorityFilter],
    queryFn: async () => {
      let url = `/api/tasks?status=${statusFilter}&priority=${priorityFilter}`;
      const res = await apiFetch<{ items: any[] }>(url);
      return (res.items || []).map(normalizeTask);
    },
  });

  const { data: employees } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const res = await apiFetch<{ items: Employee[] }>("/api/employees");
      return res.items || [];
    },
  });

  // Mutation to handle Status patch update
  const updateStatusMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: Task["status"] }) => {
      const res = await apiFetch<{ item: any }>(`/api/tasks/${taskId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      return normalizeTask(res.item);
    },
    onSuccess: (updatedTask, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      if (selectedTask?.id === updatedTask.id) {
        setSelectedTask(updatedTask);
      }
      // Gamification check
      if (variables.status === "completed") {
        triggerBlaster({ id: updatedTask.id, title: updatedTask.title, priority: updatedTask.priority, status: "completed" });
        incrementCompletedCount();
        triggerReward();
      }
    },
    onError: () => {
      Alert.alert("Error", "Failed to update task status.");
    },
  });

  // Task creation mutation
  const createTaskMutation = useMutation({
    mutationFn: async (payload: CreateTaskValues) => {
      const bodyPayload = selectedProject ? { ...payload, projectId: selectedProject.id } : payload;
      return await apiFetch("/api/tasks", {
        method: "POST",
        body: JSON.stringify(bodyPayload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setIsCreateTaskOpen(false);
      reset();
      Alert.alert("Success", "Task created successfully.");
    },
  });

  // Real-time socket comment integration
  useEffect(() => {
    if (!socket || !selectedTask) return;
    const taskId = selectedTask.id;
    socket.emit("join-task", taskId);

    const handleNewComment = (comment: TaskComment) => {
      if (comment.taskId !== taskId) return;
      setComments((prev) => (prev.find((c) => c.id === comment.id) ? prev : [...prev, comment]));
    };

    socket.on("new-comment", handleNewComment);
    return () => {
      socket.off("new-comment", handleNewComment);
      socket.emit("leave-task", taskId);
    };
  }, [socket, selectedTask?.id]);

  const loadComments = async (taskId: string) => {
    try {
      const res = await apiFetch<{ items: TaskComment[] }>(`/api/tasks/${taskId}/comments`);
      setComments(res.items || []);
    } catch {
      setComments([]);
    }
  };

  const openTaskDetail = (task: Task) => {
    setSelectedTask(task);
    setIsViewTaskOpen(true);
    loadComments(task.id);
  };

  const handleSendComment = async () => {
    if (!selectedTask || !commentDraft.trim()) return;
    try {
      setIsSendingComment(true);
      const res = await apiFetch<{ item: TaskComment }>(`/api/tasks/${selectedTask.id}/comments`, {
        method: "POST",
        body: JSON.stringify({ message: commentDraft.trim() }),
      });
      setComments((prev) => [...prev, res.item]);
      setCommentDraft("");
    } catch {
      Alert.alert("Error", "Could not send comment.");
    } finally {
      setIsSendingComment(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header section with search */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Workspace Center</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setIsCreateTaskOpen(true)}>
          <Plus color="#FFF" size={20} />
          <Text style={styles.addButtonText}>Add Task</Text>
        </TouchableOpacity>
      </View>

      {/* Searching & Filter Bars */}
      <View style={styles.filterBar}>
        <View style={styles.searchContainer}>
          <Search color={THEME.textMuted} size={18} style={styles.searchIcon} />
          <TextInput
            placeholder="Search projects..."
            placeholderTextColor={THEME.textMuted}
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalFilters}>
          {["all", "pending", "in-progress", "completed", "overdue"].map((status) => (
            <TouchableOpacity
              key={status}
              style={[styles.filterChip, statusFilter === status && styles.activeFilterChip]}
              onPress={() => setStatusFilter(status)}
            >
              <Text style={[styles.filterChipText, statusFilter === status && styles.activeFilterChipText]}>
                {status.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Primary Task Stream Feed */}
      {tasksLoading ? (
        <ActivityIndicator size="large" color={THEME.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={tasksData}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.taskListContent}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.taskCard} onPress={() => openTaskDetail(item)}>
              <View style={styles.taskCardTop}>
                <Text style={styles.taskTitle}>{item.title}</Text>
                <View style={[styles.badge, { backgroundColor: THEME[item.priority].bg }]}>
                  <Text style={[styles.badgeText, { color: THEME[item.priority].text }]}>{item.priority}</Text>
                </View>
              </View>
              
              <Text style={styles.taskDesc} numberOfLines={2}>{item.description}</Text>
              
              <View style={styles.taskCardFooter}>
                <View style={styles.footerInfoItem}>
                  <Calendar color={THEME.textSecondary} size={14} />
                  <Text style={styles.footerInfoText}>{item.dueDate}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: THEME[item.status].bg }]}>
                  <Text style={[styles.badgeText, { color: THEME[item.status].text }]}>{item.status}</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* --- Action Modal: CREATE TASK --- */}
      <Modal visible={isCreateTaskOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Workspace Task</Text>
              <TouchableOpacity onPress={() => setIsCreateTaskOpen(false)}>
                <X color={THEME.textPrimary} size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalFormScroll}>
              <Text style={styles.inputLabel}>Task Title</Text>
              <Controller
                control={control}
                name="title"
                render={({ field: { onChange, value } }) => (
                  <TextInput style={styles.formInput} onChangeText={onChange} value={value} placeholder="Task headline" placeholderTextColor={THEME.textMuted} />
                )}
              />

              <Text style={styles.inputLabel}>Description</Text>
              <Controller
                control={control}
                name="description"
                render={({ field: { onChange, value } }) => (
                  <TextInput style={[styles.formInput, styles.textArea]} multiline numberOfLines={4} onChangeText={onChange} value={value} placeholder="Detailed instructions..." placeholderTextColor={THEME.textMuted} />
                )}
              />

              <Text style={styles.inputLabel}>Priority Level</Text>
              <View style={styles.rowLayout}>
                {(["low", "medium", "high"] as const).map((p) => (
                  <Controller
                    key={p}
                    control={control}
                    name="priority"
                    render={({ field: { onChange, value } }) => (
                      <TouchableOpacity style={[styles.choiceSelector, value === p && { borderColor: THEME.primary, backgroundColor: THEME.bgCard }]} onPress={() => onChange(p)}>
                        <Text style={[styles.choiceSelectorText, value === p && { color: THEME.primary }]}>{p}</Text>
                      </TouchableOpacity>
                    )}
                  />
                ))}
              </View>

              <Text style={styles.inputLabel}>Due Date (YYYY-MM-DD)</Text>
              <Controller
                control={control}
                name="dueDate"
                render={({ field: { onChange, value } }) => (
                  <TextInput style={styles.formInput} onChangeText={onChange} value={value} placeholder="e.g. 2026-12-31" placeholderTextColor={THEME.textMuted} />
                )}
              />

              <TouchableOpacity style={styles.submitButton} onPress={handleSubmit((data) => createTaskMutation.mutate(data))}>
                <Text style={styles.submitButtonText}>Publish Task</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* --- Action Modal: VIEW TASK & COMMENTS --- */}
      <Modal visible={isViewTaskOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedTask && (
              <>
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={styles.modalTitle}>{selectedTask.title}</Text>
                    <Text style={styles.taskProjectSubtitle}>Standalone Core Objective</Text>
                  </View>
                  <TouchableOpacity onPress={() => setIsViewTaskOpen(false)}>
                    <X color={THEME.textPrimary} size={24} />
                  </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.modalFormScroll}>
                  <Text style={styles.detailDescText}>{selectedTask.description}</Text>

                  {/* Status Toggle Engine */}
                  <Text style={styles.inputLabel}>Modify Objective State</Text>
                  <View style={styles.statusCycleRow}>
                    {(["pending", "in-progress", "completed"] as const).map((st) => (
                      <TouchableOpacity
                        key={st}
                        style={[styles.statusToggleBadge, selectedTask.status === st && { backgroundColor: THEME[st].text }]}
                        onPress={() => updateStatusMutation.mutate({ taskId: selectedTask.id, status: st })}
                      >
                        <Text style={[styles.statusToggleBadgeText, selectedTask.status === st && { color: "#FFF" }]}>
                          {st}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Real-time Activity Logs / Comments feed */}
                  <View style={styles.commentsSection}>
                    <Text style={styles.commentsHeaderTitle}>Activity Feed Logs</Text>
                    
                    {comments.map((comment) => (
                      <View key={comment.id} style={styles.commentBubble}>
                        <View style={styles.commentHeader}>
                          <Text style={styles.commentAuthor}>{comment.authorUsername}</Text>
                          <Text style={styles.commentTime}>{formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}</Text>
                        </View>
                        <Text style={styles.commentMessage}>{comment.message}</Text>
                      </View>
                    ))}

                    <View style={styles.commentInputRow}>
                      <TextInput
                        style={styles.commentTextInput}
                        value={commentDraft}
                        onChangeText={setCommentDraft}
                        placeholder="Log update details..."
                        placeholderTextColor={THEME.textMuted}
                      />
                      <TouchableOpacity style={styles.sendCommentButton} onPress={handleSendComment} disabled={isSendingComment}>
                        {isSendingComment ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.sendCommentButtonText}>Send</Text>}
                      </TouchableOpacity>
                    </View>
                  </View>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.bgCanvas,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: THEME.border,
    backgroundColor: THEME.bgSurface,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: THEME.textPrimary,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
  },
  addButtonText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 14,
  },
  filterBar: {
    padding: 16,
    backgroundColor: THEME.bgSurface,
    borderBottomWidth: 1,
    borderColor: THEME.border,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.bgCanvas,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: THEME.textPrimary,
    fontSize: 15,
  },
  horizontalFilters: {
    flexDirection: "row",
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: THEME.bgCard,
    marginRight: 8,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  activeFilterChip: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
  },
  filterChipText: {
    color: THEME.textSecondary,
    fontSize: 11,
    fontWeight: "700",
  },
  activeFilterChipText: {
    color: "#FFF",
  },
  taskListContent: {
    padding: 16,
    gap: 12,
  },
  taskCard: {
    backgroundColor: THEME.bgSurface,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  taskCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: THEME.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  taskDesc: {
    fontSize: 14,
    color: THEME.textSecondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  taskCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    paddingTop: 10,
  },
  footerInfoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  footerInfoText: {
    color: THEME.textMuted,
    fontSize: 13,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: THEME.bgCanvas,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "90%",
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderColor: THEME.border,
    backgroundColor: THEME.bgSurface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: THEME.textPrimary,
  },
  taskProjectSubtitle: {
    fontSize: 12,
    color: THEME.primary,
    marginTop: 2,
  },
  modalFormScroll: {
    padding: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: THEME.textSecondary,
    marginBottom: 8,
    marginTop: 12,
  },
  formInput: {
    backgroundColor: THEME.bgSurface,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 6,
    paddingHorizontal: 12,
    height: 44,
    color: THEME.textPrimary,
    fontSize: 15,
  },
  textArea: {
    height: 80,
    paddingTop: 10,
    textAlignVertical: "top",
  },
  rowLayout: {
    flexDirection: "row",
    gap: 10,
  },
  choiceSelector: {
    flex: 1,
    height: 40,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.bgSurface,
  },
  choiceSelectorText: {
    color: THEME.textSecondary,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  submitButton: {
    backgroundColor: THEME.primary,
    height: 48,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },
  submitButtonText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 16,
  },
  detailDescText: {
    fontSize: 15,
    color: THEME.textPrimary,
    lineHeight: 22,
    marginBottom: 16,
    backgroundColor: THEME.bgSurface,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  statusCycleRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  statusToggleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.border,
    backgroundColor: THEME.bgSurface,
  },
  statusToggleBadgeText: {
    fontSize: 13,
    fontWeight: "600",
    color: THEME.textSecondary,
    textTransform: "capitalize",
  },
  commentsSection: {
    borderTopWidth: 1,
    borderColor: THEME.border,
    paddingTop: 16,
    marginTop: 8,
  },
  commentsHeaderTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: THEME.textPrimary,
    marginBottom: 12,
  },
  commentBubble: {
    backgroundColor: THEME.bgSurface,
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  commentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  commentAuthor: {
    fontSize: 13,
    fontWeight: "700",
    color: THEME.primary,
  },
  commentTime: {
    fontSize: 11,
    color: THEME.textMuted,
  },
  commentMessage: {
    fontSize: 14,
    color: THEME.textPrimary,
    lineHeight: 18,
  },
  commentInputRow: {
    flexDirection: "row",
    marginTop: 12,
    gap: 8,
  },
  commentTextInput: {
    flex: 1,
    backgroundColor: THEME.bgSurface,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 6,
    paddingHorizontal: 12,
    height: 40,
    color: THEME.textPrimary,
  },
  sendCommentButton: {
    backgroundColor: THEME.primary,
    paddingHorizontal: 16,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  sendCommentButtonText: {
    color: "#FFF",
    fontWeight: "600",
  },
});