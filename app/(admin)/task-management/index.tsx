import React, { useEffect, useMemo, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Switch,
  Image,
  FlatList
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";
import {
  Plus,
  Search,
  Calendar,
  AlertCircle,
  X,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Send,
  Layers,
  CheckSquare,
  RefreshCw,
  Video
} from "lucide-react-native";
import { useRewards } from "@/contexts/RewardProvider";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";

interface Task {
  id: string;
  taskNumber?: number;
  title: string;
  description: string;
  assignees: string[];
  teamLead?: string;
  priority: "low" | "medium" | "high";
  status: "pending" | "in-progress" | "completed" | "overdue";
  dueDate: string;
  dueTime?: string;
  location?: string;
  projectId?: string;
  projectName?: string;
  createdAt: string;
  attachments?: Array<{ fileName: string; url: string; mimeType: string; size: number }>;
}

interface Employee {
  id: string;
  name: string;
  status: string;
}

interface Project {
  id: string;
  _id?: string;
  name: string;
  code: string;
  description?: string;
  status: "planning" | "active" | "on-hold" | "completed";
  teamLead?: string;
  teamMembers?: string[];
  introVideoUrl?: string;
  logoUrl?: string;
  attachments?: any[];
}

interface PaginatedTasksResponse {
  items: any[];
  totalPages: number;
  totalCount: number;
  currentPage: number;
}

const PAGE_SIZE = 10;
const { width } = Dimensions.get("window");

const safeExtractArray = <T,>(response: any): T[] => {
  if (!response) return [];
  if (Array.isArray(response)) return response;
  if (response && Array.isArray(response.items)) return response.items;
  if (response && Array.isArray(response.data)) return response.data;
  return [];
};

export default function TasksScreen() {
  const queryClient = useQueryClient();
  const { triggerReward } = useRewards();
  const { user } = useAuth();
  const { uiTheme } = useTheme();

  const isDark = useMemo(
    () => ["dark-minimal", "neon-tech", "metallic-elite", "executive-black", "high-contrast", "energy-mode"].includes(uiTheme?.theme || ""),
    [uiTheme?.theme]
  );

  const colors = useMemo(() => ({
    background: uiTheme?.panelColors?.dashboardBackground || (isDark ? "#09090b" : "#F8FAFC"),
    cardBg: uiTheme?.panelColors?.dashboardCardBackground || (isDark ? "#18181b" : "#FFFFFF"),
    cardElevated: isDark ? "#27272a" : "#F1F5F9",
    text: uiTheme?.panelColors?.dashboardTextColor || (isDark ? "#f4f4f5" : "#0F172A"),
    muted: isDark ? "#a1a1aa" : "#64748B",
    border: isDark ? "#27272a" : "#E2E8F0",
    borderLight: isDark ? "#3f3f46" : "#CBD5E1",
    primary: uiTheme?.customColors?.primary || "#ffd27a",
    success: "#10b981",
    warning: "#f59e0b",
    danger: "#ef4444",
    info: "#3b82f6",
    white: "#FFFFFF",
    black: "#000000",
    inputBg: isDark ? "#09090b" : "#FFFFFF"
  }), [uiTheme, isDark]);

  const styles = useMemo(() => createStyles(colors), [colors]);

  const [activeTab, setActiveTab] = useState<"projects" | "tasks">("projects");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isInlineTaskModalOpen, setIsInlineTaskModalOpen] = useState(false);
  
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [autoUpdate, setAutoUpdate] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [commentsList, setCommentsList] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium" as Task["priority"],
    status: "pending" as Task["status"],
    dueDate: "",
    dueTime: "",
    location: "Organizational Task",
    projectId: "",
    teamLead: "",
  });
  const [formAssignees, setFormAssignees] = useState<string[]>([]);
  const [formAttachments, setFormAttachments] = useState<any[]>([]);
  
  const [showAssigneePicker, setShowAssigneePicker] = useState(false);
  const [showTaskLeadPicker, setShowTaskLeadPicker] = useState(false);
  const [showTaskStatusPicker, setShowTaskStatusPicker] = useState(false);

  const [projectFormData, setProjectFormData] = useState({
    name: "",
    code: "",
    description: "",
    status: "active" as Project["status"],
    teamLead: "",
    introVideoUrl: "",
    logoUrl: "",
  });
  const [projectMembers, setProjectMembers] = useState<string[]>([]);
  const [projectAttachments, setProjectAttachments] = useState<any[]>([]);
  const [projectInlineTasks, setProjectInlineTasks] = useState<Partial<Task>[]>([]);

  const [inlineTaskData, setInlineTaskData] = useState({
    title: "",
    description: "",
    priority: "medium" as Task["priority"],
    assignees: [] as string[],
  });

  const [showProjLeadPicker, setShowProjLeadPicker] = useState(false);
  const [showProjMemberPicker, setShowProjMemberPicker] = useState(false);

  const handleTabChange = (tab: "projects" | "tasks") => {
    setActiveTab(tab);
    setPage(1);
    void queryClient.invalidateQueries({ queryKey: ["projects"] });
    void queryClient.invalidateQueries({ queryKey: ["tasks"] });
  };

  const { data: paginatedData, isLoading: isTasksLoading, isFetching: isTasksFetching } = useQuery({
    queryKey: ["tasks", page, statusFilter, priorityFilter, searchQuery, selectedProjectId, activeTab],
    queryFn: async () => {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: PAGE_SIZE.toString(),
        status: statusFilter,
        priority: priorityFilter,
        search: searchQuery,
      });
      if (selectedProjectId) {
        queryParams.append("projectId", selectedProjectId);
      }
      
      const res = await apiFetch<PaginatedTasksResponse>(`/api/tasks?${queryParams.toString()}`);
      const mappedItems = safeExtractArray<any>(res).map((t) => ({
        id: t._id || t.id,
        title: t.title,
        description: t.description || "",
        assignees: Array.isArray(t.assignees) ? t.assignees : [],
        teamLead: t.teamLead || "",
        priority: t.priority || "medium",
        status: t.status || "pending",
        dueDate: t.dueDate || "2026-06-22",
        dueTime: t.dueTime || "18:00",
        location: t.location || "Organizational Task",
        projectId: t.projectId || "",
        projectName: t.projectName || "Organizational Task",
        createdAt: t.createdAt,
        attachments: t.attachments || [],
      })) as Task[];

      return {
        items: mappedItems,
        totalPages: res.totalPages || 1,
        totalCount: res.totalCount || 0,
      };
    },
  });

  const { data: rawEmployees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const res = await apiFetch<any>("/api/users/all");
      return safeExtractArray<Employee>(res);
    },
  });

  const activeEmployees = useMemo(() => {
    return rawEmployees.filter((e) => {
      const s = String(e.status || "").toLowerCase();
      return s === "active";
    });
  }, [rawEmployees]);

  const { data: projects = [], isLoading: isProjectsLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await apiFetch<any>("/api/projects");
      const extracted = safeExtractArray<any>(res);
      return extracted.map(p => ({
        id: p._id || p.id,
        name: p.name,
        code: p.code || "",
        description: p.description || "",
        status: p.status || "active",
        teamLead: p.teamLead || "",
        teamMembers: p.teamMembers || [],
        introVideoUrl: p.introVideoUrl || "",
        logoUrl: p.logoUrl || "",
        attachments: p.attachments || []
      })) as Project[];
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: (newTask: Partial<Task>) =>
      apiFetch("/api/tasks", { method: "POST", body: JSON.stringify(newTask) }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setIsCreateModalOpen(false);
      resetForm();
      Alert.alert("Success", "Operational task synchronized to system matrix.");
    },
  });

  const createProjectMutation = useMutation({
    mutationFn: (newProject: Partial<Project> & { tasks?: Partial<Task>[] }) =>
      apiFetch("/api/projects", { method: "POST", body: JSON.stringify(newProject) }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setIsCreateProjectModalOpen(false);
      resetProjectForm();
      Alert.alert("Success", "Enterprise structural project environment established.");
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Task> }) =>
      apiFetch(`/api/tasks/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
      if (variables.payload.status === "completed") {
        triggerReward(200, 350);
      }
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/tasks/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
      Alert.alert("Purged", "Operational record successfully discarded from architecture.");
    },
  });

  const handleCreateTask = () => {
    if (!formData.title.trim() || !formData.description.trim()) {
      Alert.alert("Validation Failure", "Task Title and Objective Directives cannot be blank.");
      return;
    }
    if (editingTaskId) {
      updateTaskMutation.mutate({
        id: editingTaskId,
        payload: { ...formData, assignees: formAssignees, attachments: formAttachments }
      });
      setIsCreateModalOpen(false);
      setEditingTaskId(null);
      resetForm();
    } else {
      createTaskMutation.mutate({
        ...formData,
        assignees: formAssignees,
        attachments: formAttachments,
        createdAt: new Date().toISOString(),
      });
    }
  };

  const handleCreateProject = () => {
    if (!projectFormData.name.trim()) {
      Alert.alert("Validation Failure", "Project Name is required.");
      return;
    }
    createProjectMutation.mutate({
      ...projectFormData,
      teamMembers: projectMembers,
      attachments: projectAttachments,
      tasks: projectInlineTasks
    });
  };

  const handleAddInlineTask = () => {
    if (!inlineTaskData.title.trim()) {
      Alert.alert("Error", "Task header structural label required.");
      return;
    }
    setProjectInlineTasks((prev) => [...prev, { ...inlineTaskData, status: "pending" }]);
    setInlineTaskData({ title: "", description: "", priority: "medium", assignees: [] });
    setIsInlineTaskModalOpen(false);
  };

  const handlePickDocument = async (target: "task" | "project" | "logo" | "video") => {
    try {
      const typeSelection = target === "video" ? "video/*" : target === "logo" ? "image/*" : "*/*";
      const result = await DocumentPicker.getDocumentAsync({ type: typeSelection, multiple: false });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        const constructedFile = { fileName: file.name, size: file.size || 0, mimeType: file.mimeType || "application/octet-stream", url: file.uri };
        
        if (target === "task" || target === "video") {
          setFormAttachments((prev) => [...prev, constructedFile]);
        } else if (target === "project") {
          setProjectAttachments((prev) => [...prev, constructedFile]);
        } else if (target === "logo") {
          setProjectFormData((prev) => ({ ...prev, logoUrl: file.uri }));
        }
      }
    } catch (err) {
      console.log(err);
    }
  };

  const handlePostComment = () => {
    if (!commentText.trim()) return;
    const newComment = {
      id: Date.now().toString(),
      sender: user?.name || "Employee",
      initials: (user?.name || "EE").substring(0, 2).toUpperCase(),
      text: commentText,
      timestamp: "Just now"
    };
    setCommentsList((prev) => [...prev, newComment]);
    setCommentText("");
  };

  const resetForm = () => {
    setFormData({ title: "", description: "", priority: "medium", status: "pending", dueDate: "", dueTime: "", location: "Organizational Task", projectId: "", teamLead: "" });
    setFormAssignees([]);
    setFormAttachments([]);
    setEditingTaskId(null);
    setIsCreateModalOpen(false);
  };

  const resetProjectForm = () => {
    setProjectFormData({ name: "", code: "", description: "", status: "active", teamLead: "", introVideoUrl: "", logoUrl: "" });
    setProjectMembers([]);
    setProjectAttachments([]);
    setProjectInlineTasks([]);
    setIsCreateProjectModalOpen(false);
  };

  const renderProjectCard = (proj: Project) => {
    const projectImgUrl = proj.logoUrl || "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=400&auto=format&fit=crop&q=60";

    return (
      <TouchableOpacity
        key={proj.id}
        style={[styles.projectCardContainer, { backgroundColor: colors.cardBg, borderColor: colors.border }, selectedProjectId === proj.id && { borderColor: colors.primary }]}
        activeOpacity={0.8}
        onPress={() => {
          setSelectedProjectId(proj.id === selectedProjectId ? null : proj.id);
          handleTabChange("tasks");
        }}
      >
        <View style={styles.projectCardHeader}>
          <Image 
            source={{ uri: projectImgUrl }} 
            style={{ width: 44, height: 44, borderRadius: 8, backgroundColor: colors.cardElevated }} 
          />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.projectCardCode, { color: colors.primary }]}>{(proj.code || "PROJ").toUpperCase()}</Text>
            <Text style={[styles.projectCardName, { color: colors.text }]}>{proj.name}</Text>
          </View>
          <View style={[styles.projectStatusBadge, { backgroundColor: colors.inputBg }]}>
            <Text style={[styles.projectStatusText, { color: colors.text }]}>{proj.status}</Text>
          </View>
        </View>

        <Text style={[styles.projectCardDesc, { color: colors.muted }]} numberOfLines={2}>
          {proj.description || "No strategic scope mapped for this environmental space."}
        </Text>

        {proj.teamLead ? (
          <View style={styles.projectCardMetaRow}>
            <Text style={[styles.projectCardMetaText, { color: colors.muted }]}>Lead: {proj.teamLead}</Text>
          </View>
        ) : null}

        <View style={[styles.projectCardFooter, { borderTopColor: colors.border }]}>
          <Text style={[styles.projectMembCountText, { color: colors.muted }]}>{proj.teamMembers?.length || 0} Operators Whitelisted</Text>
          <Text style={[styles.exploreTaskActionText, { color: colors.primary }]}>View Tasks Matrix →</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderTaskCard = ({ item }: { item: Task }) => {
    const priorityColors = isDark ? 
      (item.priority === "high" ? { bg: "rgba(239, 68, 68, 0.15)", text: "#ef4444" } : item.priority === "medium" ? { bg: "rgba(245, 158, 11, 0.15)", text: "#f59e0b" } : { bg: "rgba(16, 185, 129, 0.15)", text: "#10b981" }) : 
      (item.priority === "high" ? { bg: "#fee2e2", text: "#dc2626" } : item.priority === "medium" ? { bg: "#fef3c7", text: "#d97706" } : { bg: "#d1fae5", text: "#15803d" });
      
    const statusColors = item.status === "completed" ? { bg: "rgba(16, 185, 129, 0.15)", text: "#10b981" } : item.status === "in-progress" ? { bg: "rgba(245, 158, 11, 0.15)", text: "#f59e0b" } : item.status === "overdue" ? { bg: "rgba(239, 68, 68, 0.15)", text: "#ef4444" } : { bg: colors.cardElevated, text: colors.muted };

    const taskImageUrl = item.attachments?.find(att => 
      att.mimeType?.startsWith("image/") || /\.(jpg|jpeg|png|webp|gif)$/i.test(att.fileName || "")
    )?.url || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=60";

    return (
      <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            setSelectedTask(item);
            setIsDetailModalOpen(true);
          }}
          style={styles.cardInnerPadding}
        >
          <Image 
            source={{ uri: taskImageUrl }} 
            style={{ width: "100%", height: 130, borderRadius: 6, marginBottom: 12, backgroundColor: colors.cardElevated, resizeMode: "cover" }} 
          />

          <View style={styles.cardHeaderRow}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={[styles.cardProjectNamespace, { color: colors.primary }]} numberOfLines={1}>
                {(item.projectName || "Organizational Task").toUpperCase()}
              </Text>
              <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: priorityColors.bg, borderColor: priorityColors.text, borderWidth: 1 }]}>
              <Text style={[styles.badgeText, { color: priorityColors.text }]}>{item.priority}</Text>
            </View>
          </View>

          <Text style={[styles.cardDescription, { color: colors.muted }]} numberOfLines={2}>{item.description}</Text>

          <View style={styles.assigneeAvatarStrip}>
            {item.assignees.map((assignee, idx) => (
              <View key={idx} style={[styles.miniAvatarCircle, { backgroundColor: colors.cardElevated, borderColor: colors.border }]}>
                <Text style={[styles.miniAvatarText, { color: colors.primary }]}>{assignee.split(" ").map(n => n[0]).join("").toUpperCase()}</Text>
              </View>
            ))}
            <Text style={[styles.miniAvatarLabelText, { color: colors.muted }]}>
              {item.assignees.length > 0 ? `${item.assignees.length} assigned` : "No manual workers mapped"}
            </Text>
          </View>

          <View style={styles.cardFooter}>
            <View style={styles.metaRow}>
              <Calendar size={13} color={colors.muted} style={{ marginRight: 4 }} />
              <Text style={[styles.metaText, { color: colors.muted }]}>{item.dueDate} @ {item.dueTime}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
              <Text style={[styles.statusBadgeText, { color: statusColors.text }]}>{item.status}</Text>
            </View>
          </View>
        </TouchableOpacity>

        <View style={[styles.taskCardInlineActionBar, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
          <TouchableOpacity 
            style={[styles.inlineActionBtn, { borderRightColor: colors.border }]} 
            onPress={() => {
              setEditingTaskId(item.id);
              setFormData({
                title: item.title,
                description: item.description,
                priority: item.priority,
                status: item.status,
                dueDate: item.dueDate || "",
                dueTime: item.dueTime || "",
                location: item.location || "",
                projectId: item.projectId || "",
                teamLead: item.teamLead || ""
              });
              setFormAssignees(item.assignees || []);
              setFormAttachments(item.attachments || []);
              setIsCreateModalOpen(true);
            }}
          >
            <Text style={[styles.inlineActionBtnText, { color: colors.muted }]}>Edit</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.inlineActionBtn, { borderRightColor: colors.border }]}
            onPress={() => {
              setEditingTaskId(item.id);
              setFormData({
                title: item.title,
                description: item.description,
                priority: item.priority,
                status: item.status,
                dueDate: item.dueDate || "",
                dueTime: item.dueTime || "",
                location: item.location || "",
                projectId: item.projectId || "",
                teamLead: item.teamLead || ""
              });
              setFormAssignees(item.assignees || []);
              setFormAttachments(item.attachments || []);
              setShowAssigneePicker(true);
              setIsCreateModalOpen(true);
            }}
          >
            <Text style={[styles.inlineActionBtnText, { color: colors.muted }]}>Reassign</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.inlineActionBtn, { borderRightWidth: 0 }]} 
            onPress={() => {
              Alert.alert("Confirm Purge", "Permanently delete this execution matrix entry?", [
                { text: "Abort", style: "cancel" },
                { text: "Purge", style: "destructive", onPress: () => deleteTaskMutation.mutate(item.id) }
              ]);
            }}
          >
            <Text style={[styles.inlineActionBtnText, { color: colors.danger }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}> 
      <View style={[styles.header, { backgroundColor: colors.cardBg, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Task Management</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity style={[styles.projectButtonFAB, { backgroundColor: colors.cardElevated, borderColor: colors.border }]} onPress={() => setIsCreateProjectModalOpen(true)}>
            <Text style={[styles.createButtonText, { color: colors.primary }]}>+ Project</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.createButtonFAB, { backgroundColor: colors.primary }]} onPress={() => setIsCreateModalOpen(true)}>
            <Plus color={colors.black} size={15} />
            <Text style={[styles.createButtonText, { color: colors.black }]}>+ Task</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.filterContainer}>
        <View style={[styles.searchBarContainer, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <Search size={18} color={colors.muted} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search Project / Tasks..."
            value={searchQuery}
            onChangeText={(txt) => { setSearchQuery(txt); setPage(1); }}
            placeholderTextColor={colors.muted}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterTabsScroll}>
          <TouchableOpacity
            style={[styles.filterChip, { backgroundColor: colors.cardBg, borderColor: colors.border }, statusFilter === "all" && { backgroundColor: `${colors.primary}1A`, borderColor: colors.primary }]}
            onPress={() => { setStatusFilter("all"); setPage(1); }}
          >
            <Text style={[styles.filterChipText, { color: statusFilter === "all" ? colors.primary : colors.muted }]}>All Directives</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, { backgroundColor: colors.cardBg, borderColor: colors.border }, statusFilter === "in-progress" && { backgroundColor: `${colors.primary}1A`, borderColor: colors.primary }]}
            onPress={() => { setStatusFilter("in-progress"); setPage(1); }}
          >
            <Text style={[styles.filterChipText, { color: statusFilter === "in-progress" ? colors.primary : colors.muted }]}>In Progress</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, { backgroundColor: colors.cardBg, borderColor: colors.border }, statusFilter === "completed" && { backgroundColor: `${colors.primary}1A`, borderColor: colors.primary }]}
            onPress={() => { setStatusFilter("completed"); setPage(1); }}
          >
            <Text style={[styles.filterChipText, { color: statusFilter === "completed" ? colors.primary : colors.muted }]}>Completed</Text>
          </TouchableOpacity>
          {selectedProjectId && (
            <TouchableOpacity 
              onPress={() => setSelectedProjectId(null)} 
              style={[styles.filterResetIndicator, { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, backgroundColor: `${colors.danger}15`, borderRadius: 20 }]}
            >
              <RefreshCw size={14} color={colors.danger} style={{ marginRight: 6 }} />
              <Text style={{ color: colors.danger, fontWeight: '600', fontSize: 11 }}>Reset</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      <View style={[styles.segmentWrapper, { backgroundColor: colors.cardBg, borderColor: colors.border }]} >
        <TouchableOpacity 
          style={[styles.segmentCell, activeTab === "projects" && { backgroundColor: colors.primary }]} 
          onPress={() => handleTabChange("projects")}
        >
          <Layers size={14} color={activeTab === "projects" ? colors.black : colors.muted} />
          <Text style={[styles.segmentText, { color: activeTab === "projects" ? colors.black : colors.muted }]}>Projects</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.segmentCell, activeTab === "tasks" && { backgroundColor: colors.primary }]} 
          onPress={() => handleTabChange("tasks")}
        >
          <CheckSquare size={14} color={activeTab === "tasks" ? colors.black : colors.muted} />
          <Text style={[styles.segmentText, { color: activeTab === "tasks" ? colors.black : colors.muted }]}>Task</Text>
        </TouchableOpacity>
      </View>

      {activeTab === "projects" ? (
        isProjectsLoading ? (
          <View style={styles.centerView}><ActivityIndicator size="large" color={colors.primary} /></View>
        ) : (
          <ScrollView contentContainerStyle={styles.listContent}>
            {projects.map(renderProjectCard)}
            {projects.length === 0 && (
              <View style={styles.emptyContainer}>
                <AlertCircle size={36} color={colors.muted} />
                <Text style={[styles.emptyText, { color: colors.muted }]}>No registered project environments found.</Text>
              </View>
            )}
          </ScrollView>
        )
      ) : isTasksLoading ? (
        <View style={styles.centerView}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={paginatedData?.items || []}
          renderItem={renderTaskCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListFooterComponent={() => {
            const totalPages = paginatedData?.totalPages || 1;
            return (
              <View style={[styles.paginationWrapper, { borderTopColor: colors.border }]}>
                <TouchableOpacity
                  style={[styles.pageBtn, { backgroundColor: colors.cardBg, borderColor: colors.border }, (page === 1 || isTasksFetching) && styles.pageBtnDisabled]}
                  disabled={page === 1 || isTasksFetching}
                  onPress={() => setPage(p => Math.max(p - 1, 1))}
                >
                  <ChevronLeft size={16} color={colors.primary} />
                </TouchableOpacity>
                <Text style={[styles.pageIndicatorText, { color: colors.muted }]}>Page {page} of {totalPages}</Text>
                <TouchableOpacity
                  style={[styles.pageBtn, { backgroundColor: colors.cardBg, borderColor: colors.border }, (page === totalPages || isTasksFetching) && styles.pageBtnDisabled]}
                  disabled={page === totalPages || isTasksFetching}
                  onPress={() => setPage(p => Math.min(p + 1, totalPages))}
                >
                  <ChevronRight size={16} color={colors.primary} />
                </TouchableOpacity>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <AlertCircle size={36} color={colors.muted} />
              <Text style={[styles.emptyText, { color: colors.muted }]}>No matching operational records discovered.</Text>
            </View>
          }
        />
      )}

      <Modal visible={isDetailModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.detailSheet, { backgroundColor: colors.cardBg }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border, backgroundColor: colors.cardBg }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={[styles.statusBadge, { backgroundColor: colors.inputBg }]}>
                  <Text style={{ color: colors.text, fontSize: 11, fontWeight: "700" }}>
                    {(selectedTask?.status || "pending").toUpperCase()}
                  </Text>
                </View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Directive Analysis Feed</Text>
              </View>
              <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                <TouchableOpacity onPress={() => { setIsDetailModalOpen(false); setIsCreateModalOpen(true); }}>
                  <Text style={{ color: colors.primary, fontSize: 14 }}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setIsDetailModalOpen(false)}>
                  <X size={22} color={colors.text} />
                </TouchableOpacity>
              </View>
            </View>

            {selectedTask && (
              <ScrollView contentContainerStyle={styles.detailModalBody} keyboardShouldPersistTaps="handled">
                <View style={styles.webSplitLayoutRow}>
                  <View style={styles.webSplitLeftColumn}>
                    <Text style={[styles.detailTitleText, { color: colors.text }]}>{selectedTask.title}</Text>
                    
                    <Text style={[styles.sectionLabel, { color: colors.text }]}>Description / Objectives</Text>
                    <Text style={[styles.detailDescriptionText, { color: colors.muted }]}>{selectedTask.description}</Text>

                    <Text style={[styles.sectionLabel, { color: colors.text }]}>Attached Files</Text>
                    <View style={[styles.detailFilesBox, { backgroundColor: colors.background }]}>
                      <Text style={[styles.detailFileNameLink, { color: colors.primary }]}>Attached Document / File</Text>
                    </View>

                    <View style={[styles.activityFeedWrapper, { borderTopColor: colors.border }]}>
                      <View style={styles.activityFeedHeader}>
                        <Text style={[styles.activityTitleText, { color: colors.text }]}>Activity Feed</Text>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                            <Text style={[styles.activityUtilityText, { color: colors.muted }]}>Auto Update</Text>
                            <Switch value={autoUpdate} onValueChange={setAutoUpdate} trackColor={{ true: colors.primary }} thumbColor={colors.background} style={{ transform: [{ scaleX: 0.7 }, { scaleY: 0.7 }] }} />
                          </View>
                        </View>
                      </View>

                      <View style={styles.activityFeedStreamArea}>
                        {commentsList.length === 0 ? (
                          <Text style={[styles.emptyActivityMessageText, { color: colors.muted }]}>No activity here yet. Start the conversation!</Text>
                        ) : (
                          commentsList.map(c => (
                            <View key={c.id} style={[styles.commentCardRow, { backgroundColor: colors.background }]}>
                              <View style={[styles.commentAvatarCircle, { backgroundColor: colors.primary }]}><Text style={styles.commentAvatarText}>{c.initials}</Text></View>
                              <View style={{ flex: 1 }}>
                                <Text style={[styles.commentMetaHeaderText, { color: colors.text }]}>{c.sender} • <Text style={{ color: colors.muted }}>{c.timestamp}</Text></Text>
                                <Text style={[styles.commentBodyContentText, { color: colors.muted }]}>{c.text}</Text>
                              </View>
                            </View>
                          ))
                        )}
                      </View>

                      <View style={[styles.commentInputBoxContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                        <TextInput
                          value={commentText}
                          onChangeText={commentText => setCommentText(commentText)}
                          placeholder="Type an update..."
                          placeholderTextColor={colors.muted}
                          style={[styles.commentTextInputNode, { color: colors.text }]}
                          multiline
                        />
                        <View style={styles.commentInputActionsControlRow}>
                          <TouchableOpacity style={[styles.commentPostSubmitBtn, { backgroundColor: colors.primary }]} onPress={handlePostComment}>
                            <Send size={12} color={colors.black} />
                            <Text style={[styles.commentPostSubmitBtnText, { color: colors.black }]}>Comment</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </View>

                  <View style={[styles.webSplitRightSidebar, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Text style={[styles.sidebarSectionHeadingText, { color: colors.muted }]}>Properties Matrix</Text>
                    
                    <View style={styles.sidebarPropertyItemBlock}>
                      <View style={styles.sidebarPropertyItemHeaderRow}>
                        <Text style={[styles.sidebarPropertyLabelText, { color: colors.muted }]}>Assignees</Text>
                        <TouchableOpacity onPress={() => { setIsDetailModalOpen(false); setIsCreateModalOpen(true); setShowAssigneePicker(true); }}>
                          <Text style={{ color: colors.primary, fontSize: 11 }}>Edit</Text>
                        </TouchableOpacity>
                      </View>
                      <View style={styles.sidebarAssigneeDisplayRow}>
                        <View style={[styles.sidebarAvatarBubble, { backgroundColor: colors.cardElevated }]}><Text style={[styles.sidebarAvatarBubbleText, { color: colors.text }]}>MM</Text></View>
                        <Text style={[styles.sidebarAssigneeValueText, { color: colors.text }]}>Staff Member</Text>
                      </View>
                    </View>

                    <View style={styles.sidebarPropertyItemBlock}>
                      <Text style={[styles.sidebarPropertyLabelText, { color: colors.muted }]}>Due Date</Text>
                      <Text style={[styles.sidebarPropertyStaticValueText, { color: colors.text }]}>Mon, 22 Jun 2026</Text>
                    </View>

                    <View style={styles.sidebarPropertyItemBlock}>
                      <Text style={[styles.sidebarPropertyLabelText, { color: colors.muted }]}>Status State</Text>
                      <Text style={[styles.sidebarPropertyStaticValueText, { color: colors.text }]}>
                        {selectedTask.status.toUpperCase()}
                      </Text>
                    </View>

                    <View style={styles.sidebarPropertyItemBlock}>
                      <Text style={[styles.sidebarPropertyLabelText, { color: colors.muted }]}>Priority Matrix</Text>
                      <Text style={[styles.sidebarPropertyStaticValueText, { color: colors.text }]}>
                        {selectedTask.priority}
                      </Text>
                    </View>

                    <View style={styles.sidebarPropertyItemBlock}>
                      <Text style={[styles.sidebarPropertyLabelText, { color: colors.muted }]}>Location / Cluster Space</Text>
                      <Text style={[styles.sidebarPropertyStaticValueText, { color: colors.text }]}>{selectedTask.location || "Organizational Task"}</Text>
                    </View>
                  </View>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={isCreateProjectModalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
          <View style={[styles.formSheet, { backgroundColor: colors.cardBg }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border, backgroundColor: colors.cardBg }]}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Create Project</Text>
                <Text style={[styles.modalSubtitle, { color: colors.muted }]}>Create a project and assign it assets and internal tasks.</Text>
              </View>
              <TouchableOpacity onPress={resetProjectForm}>
                <X size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScrollBody} keyboardShouldPersistTaps="handled">
              <Text style={[styles.formLabel, { color: colors.text }]}>Project Name *</Text>
              <TextInput
                style={[styles.formInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.inputBg }]}
                placeholder="Enter environment name..."
                placeholderTextColor={colors.muted}
                value={projectFormData.name}
                onChangeText={(t) => setProjectFormData({ ...projectFormData, name: t })}
              />

              <Text style={[styles.formLabel, { color: colors.text }]}>Project Description</Text>
              <TextInput
                style={[styles.formInput, styles.textAreaInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.inputBg }]}
                placeholder="Detail high-level strategic scope targets..."
                placeholderTextColor={colors.muted}
                multiline
                value={projectFormData.description}
                onChangeText={(t) => setProjectFormData({ ...projectFormData, description: t })}
              />

              <Text style={[styles.formLabel, { color: colors.text }]}>Intro Video URL (YouTube/Vimeo)</Text>
              <TextInput
                style={[styles.formInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.inputBg }]}
                placeholder="https://youtube.com/watch?v=..."
                placeholderTextColor={colors.muted}
                value={projectFormData.introVideoUrl}
                onChangeText={(t) => setProjectFormData({ ...projectFormData, introVideoUrl: t })}
              />

              <Text style={[styles.formLabel, { color: colors.text }]}>Project Media Assets</Text>
              <View style={styles.logoUploadRowField}>
                <TouchableOpacity style={[styles.uploadTriggerBtn, { backgroundColor: colors.cardElevated }]} onPress={() => handlePickDocument("logo")}>
                  <Text style={[styles.uploadTriggerBtnText, { color: colors.text }]}>Upload Logo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.uploadTriggerBtn, { backgroundColor: colors.cardElevated }]} onPress={() => handlePickDocument("video")}>
                  <Video size={14} color={colors.text} style={{ marginRight: 4 }} />
                  <Text style={[styles.uploadTriggerBtnText, { color: colors.text }]}>Add Video</Text>
                </TouchableOpacity>
                <Text style={[styles.logoStatusMutedLabel, { color: colors.muted }]}>{projectFormData.logoUrl ? "Assets Loaded" : "No media linked"}</Text>
              </View>

              <Text style={[styles.formLabel, { color: colors.text }]}>Team Lead (Optional)</Text>
              <TouchableOpacity style={[styles.dropdownSelector, { borderColor: colors.border, backgroundColor: colors.inputBg }]} onPress={() => setShowProjLeadPicker(!showProjLeadPicker)}>
                <Text style={[styles.dropdownSelectorText, { color: colors.text }]}>{projectFormData.teamLead || "Select team lead..."}</Text>
                <ChevronDown size={16} color={colors.primary} />
              </TouchableOpacity>
              {showProjLeadPicker && (
                <View style={[styles.inlinePickerList, { backgroundColor: colors.inputBg, borderColor: colors.borderLight }]}>
                  {activeEmployees.map((emp) => (
                    <TouchableOpacity key={emp.id} style={[styles.pickerItemRow, { borderBottomColor: colors.border }]} onPress={() => { setProjectFormData({ ...projectFormData, teamLead: emp.name }); setShowProjLeadPicker(false); }}>
                      <Text style={[styles.pickerItemText, { color: colors.text }]}>{emp.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text style={[styles.formLabel, { color: colors.text }]}>Assignees</Text>
              <TouchableOpacity style={[styles.dropdownSelector, { borderColor: colors.border, backgroundColor: colors.inputBg }]} onPress={() => setShowProjMemberPicker(!showProjMemberPicker)}>
                <Text style={[styles.dropdownSelectorText, { color: colors.text }]}>
                  {projectMembers.length > 0 ? `${projectMembers.length} operators mapped` : "Select assignees workforce..."}
                </Text>
                <ChevronDown size={16} color={colors.primary} />
              </TouchableOpacity>
              {showProjMemberPicker && (
                <View style={[styles.inlinePickerList, { backgroundColor: colors.inputBg, borderColor: colors.borderLight }]}>
                  {activeEmployees.map((emp) => (
                    <TouchableOpacity
                      key={emp.id}
                      style={[styles.pickerItemRow, { borderBottomColor: colors.border }]}
                      onPress={() => {
                        setProjectMembers(prev => prev.includes(emp.name) ? prev.filter(n => n !== emp.name) : [...prev, emp.name]);
                      }}
                    >
                      <Text style={[styles.pickerItemText, { color: colors.text }]}>{emp.name}</Text>
                      {projectMembers.includes(emp.name) && <Check size={16} color={colors.primary} />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <View style={[styles.embeddedTasksMatrixSection, { borderTopColor: colors.border }]}>
                <View style={styles.embeddedTasksMatrixHeaderRow}>
                  <Text style={[styles.embeddedSectionTitleText, { color: colors.primary }]}>Project Tasks</Text>
                  <TouchableOpacity style={styles.addInlineTaskTriggerBtn} onPress={() => setIsInlineTaskModalOpen(true)}>
                    <Text style={{ color: colors.primary, fontSize: 12 }}>Add Task</Text>
                  </TouchableOpacity>
                </View>

                {projectInlineTasks.length === 0 ? (
                  <Text style={[styles.noTasksAddedFallbackMutedText, { color: colors.muted }]}>No tasks added yet.</Text>
                ) : (
                  projectInlineTasks.map((t, idx) => (
                    <View key={idx} style={[styles.inlineAttachedTaskCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                      <Text style={[styles.inlineAttachedTaskCardTitle, { color: colors.text }]}>{t.title}</Text>
                      <Text style={[styles.inlineAttachedTaskCardPriority, { color: colors.muted }]}>Priority: {t.priority}</Text>
                    </View>
                  ))
                )}
              </View>

              <TouchableOpacity style={[styles.submitFormBtn, { backgroundColor: colors.primary }]} onPress={handleCreateProject}>
                <Text style={[styles.submitFormBtnText, { color: colors.black }]}>Create Project</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={isInlineTaskModalOpen} animationType="fade" transparent>
        <View style={styles.centeredModalOverlayLayout}>
          <View style={[styles.inlineTaskDialogBoxSurface, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Task Title *</Text>
            <TextInput style={[styles.formInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.inputBg }]} value={inlineTaskData.title} onChangeText={t => setInlineTaskData({ ...inlineTaskData, title: t })} />
            
            <Text style={[styles.formLabel, { color: colors.text }]}>Priority</Text>
            <View style={[styles.prioritySegmentRow, { borderColor: colors.border, backgroundColor: colors.inputBg }]}>
              {(["low", "medium", "high"] as const).map(p => (
                <TouchableOpacity key={p} style={[styles.prioritySegmentCell, inlineTaskData.priority === p && { backgroundColor: "rgba(255,210,122,0.15)" }]} onPress={() => setInlineTaskData({ ...inlineTaskData, priority: p })}>
                  <Text style={{ color: inlineTaskData.priority === p ? colors.primary : colors.muted, fontSize: 11 }}>{p.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
              <TouchableOpacity style={styles.dialogCancelBtn} onPress={() => setIsInlineTaskModalOpen(false)}><Text style={{ color: colors.muted }}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.dialogConfirmBtn, { backgroundColor: colors.primary }]} onPress={handleAddInlineTask}>
                <Text style={{ color: colors.black, fontWeight: "700" }}>Append Task</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={isCreateModalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
          <View style={[styles.formSheet, { backgroundColor: colors.cardBg }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border, backgroundColor: colors.cardBg }]}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>{editingTaskId ? "Edit Task" : "Create Standalone Task"}</Text>
                <Text style={[styles.modalSubtitle, { color: colors.muted }]}>Specify configurations within workspace parameters.</Text>
              </View>
              <TouchableOpacity onPress={resetForm}>
                <X size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScrollBody} keyboardShouldPersistTaps="handled">
              <Text style={[styles.formLabel, { color: colors.text }]}>Task Title *</Text>
              <TextInput
                style={[styles.formInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.inputBg }]}
                placeholder="Enter task title headline..."
                placeholderTextColor={colors.muted}
                value={formData.title}
                onChangeText={(t) => setFormData({ ...formData, title: t })}
              />

              <Text style={[styles.formLabel, { color: colors.text }]}>Task Description *</Text>
              <TextInput
                style={[styles.formInput, styles.textAreaInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.inputBg }]}
                placeholder="Clarify action objectives..."
                placeholderTextColor={colors.muted}
                multiline
                value={formData.description}
                onChangeText={(t) => setFormData({ ...formData, description: t })}
              />

              <Text style={[styles.formLabel, { color: colors.text }]}>Media & Assets</Text>
              <View style={styles.logoUploadRowField}>
                <TouchableOpacity style={[styles.uploadTriggerBtn, { backgroundColor: colors.cardElevated }]} onPress={() => handlePickDocument("task")}>
                  <Text style={[styles.uploadTriggerBtnText, { color: colors.text }]}>Attach File</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.uploadTriggerBtn, { backgroundColor: colors.cardElevated }]} onPress={() => handlePickDocument("video")}>
                  <Video size={14} color={colors.text} style={{ marginRight: 4 }} />
                  <Text style={[styles.uploadTriggerBtnText, { color: colors.text }]}>Record / Video</Text>
                </TouchableOpacity>
                <Text style={[styles.logoStatusMutedLabel, { color: colors.muted }]}>{formAttachments.length > 0 ? `${formAttachments.length} items loaded` : "No media attached"}</Text>
              </View>

              <Text style={[styles.formLabel, { color: colors.text }]}>Assignees</Text>
              <TouchableOpacity 
                style={[styles.dropdownSelector, { borderColor: colors.border, backgroundColor: colors.inputBg }]} 
                onPress={() => setShowAssigneePicker(!showAssigneePicker)}
              >
                <Text style={[styles.dropdownSelectorText, { color: colors.text }]}>
                  {formAssignees.length > 0 ? `${formAssignees.length} workers linked` : "Select assignees workforce..."}
                </Text>
                <ChevronDown size={16} color={colors.primary} />
              </TouchableOpacity>

              {showAssigneePicker && (
                <View style={[styles.inlinePickerList, { backgroundColor: colors.inputBg, borderColor: colors.borderLight }]}>
                  <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled={true}>
                    {activeEmployees.map((emp) => (
                      <TouchableOpacity
                        key={emp.id}
                        style={[styles.pickerItemRow, { borderBottomColor: colors.border }]}
                        onPress={() => {
                          setFormAssignees(prev => 
                            prev.includes(emp.name) 
                              ? prev.filter(n => n !== emp.name) 
                              : [...prev, emp.name]
                          );
                        }}
                      >
                        <Text style={[styles.pickerItemText, { color: colors.text }]}>{emp.name}</Text>
                        {formAssignees.includes(emp.name) && <Check size={16} color={colors.primary} />}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              <Text style={[styles.formLabel, { color: colors.text }]}>Team Lead (Optional)</Text>
              <TouchableOpacity style={[styles.dropdownSelector, { borderColor: colors.border, backgroundColor: colors.inputBg }]} onPress={() => setShowTaskLeadPicker(!showTaskLeadPicker)}>
                <Text style={[styles.dropdownSelectorText, { color: colors.text }]}>{formData.teamLead || "Select team lead tracking manager..."}</Text>
                <ChevronDown size={16} color={colors.primary} />
              </TouchableOpacity>
              {showTaskLeadPicker && (
                <View style={[styles.inlinePickerList, { backgroundColor: colors.inputBg, borderColor: colors.borderLight }]}>
                  <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled={true}>
                    {activeEmployees.map((emp) => (
                      <TouchableOpacity
                        key={emp.id}
                        style={[styles.pickerItemRow, { borderBottomColor: colors.border }]}
                        onPress={() => { 
                          setFormData({ ...formData, teamLead: emp.name }); 
                          setShowTaskLeadPicker(false); 
                        }}
                      >
                        <Text style={[styles.pickerItemText, { color: colors.text }]}>{emp.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              <Text style={[styles.formLabel, { color: colors.text }]}>Priority</Text>
              <View style={[styles.prioritySegmentRow, { borderColor: colors.border, backgroundColor: colors.inputBg }]}>
                {(["low", "medium", "high"] as const).map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.prioritySegmentCell, formData.priority === p && { backgroundColor: "rgba(255,210,122,0.15)" }]}
                    onPress={() => setFormData({ ...formData, priority: p })}
                  >
                    <Text style={[styles.prioritySegmentText, formData.priority === p && { color: colors.primary }]}>{p.toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.formLabel, { color: colors.text }]}>Status State</Text>
              <TouchableOpacity style={[styles.dropdownSelector, { borderColor: colors.border, backgroundColor: colors.inputBg }]} onPress={() => setShowTaskStatusPicker(!showTaskStatusPicker)}>
                <Text style={[styles.dropdownSelectorText, { color: colors.text }]}>{formData.status.toUpperCase()}</Text>
                <ChevronDown size={16} color={colors.primary} />
              </TouchableOpacity>
              {showTaskStatusPicker && (
                <View style={[styles.inlinePickerList, { backgroundColor: colors.inputBg, borderColor: colors.borderLight }]}>
                  {(["pending", "in-progress", "completed", "overdue"] as const).map((st) => (
                    <TouchableOpacity key={st} style={[styles.pickerItemRow, { borderBottomColor: colors.border }]} onPress={() => { setFormData({ ...formData, status: st }); setShowTaskStatusPicker(false); }}>
                      <Text style={[styles.pickerItemText, { color: colors.text }]}>{st.toUpperCase()}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text style={[styles.formLabel, { color: colors.text }]}>Due Date (Optional)</Text>
              <TextInput style={[styles.formInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.inputBg }]} placeholder="YYYY-MM-DD" placeholderTextColor={colors.muted} value={formData.dueDate} onChangeText={t => setFormData({ ...formData, dueDate: t })} />

              <Text style={[styles.formLabel, { color: colors.text }]}>Due Time (Optional)</Text>
              <TextInput style={[styles.formInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.inputBg }]} placeholder="HH:MM" placeholderTextColor={colors.muted} value={formData.dueTime} onChangeText={t => setFormData({ ...formData, dueTime: t })} />

              <TouchableOpacity style={[styles.submitFormBtn, { backgroundColor: colors.primary }]} onPress={handleCreateTask}>
                <Text style={[styles.submitFormBtnText, { color: colors.black }]}>{editingTaskId ? "Save Changes" : "Create Task"}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    centerView: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
    headerTitle: { fontSize: 18, fontWeight: "800", letterSpacing: -0.4 },
    filterResetIndicator: { marginTop: 2 },
    createButtonFAB: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
    projectButtonFAB: { flexDirection: "row", alignItems: "center", borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
    createButtonText: { fontWeight: "700", fontSize: 12, marginLeft: 2 },
    segmentWrapper: { flexDirection: "row", padding: 4, marginHorizontal: 16, marginTop: 12, borderRadius: 8, borderWidth: 1 },
    segmentCell: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 8, borderRadius: 6 },
    segmentText: { fontSize: 13, fontWeight: "600" },
    filterContainer: { paddingBottom: 10 },
    searchBarContainer: { flexDirection: "row", alignItems: "center", marginHorizontal: 16, marginTop: 10, marginBottom: 8, borderRadius: 8, paddingHorizontal: 10, height: 40, borderWidth: 1 },
    searchIcon: { marginRight: 6 },
    searchInput: { flex: 1, fontSize: 14 },
    filterTabsScroll: { paddingHorizontal: 16, gap: 8 },
    filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1 },
    filterChipText: { fontSize: 12, fontWeight: "600" },
    projectCardContainer: { borderRadius: 8, borderWidth: 1, padding: 16, marginBottom: 12 },
    projectCardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
    projectCardCode: { fontSize: 10, fontWeight: "700" },
    projectCardName: { fontSize: 15, fontWeight: "700" },
    projectStatusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    projectStatusText: { fontSize: 10, textTransform: "uppercase" },
    projectCardDesc: { fontSize: 13, lineHeight: 18, marginBottom: 10 },
    projectCardMetaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
    projectCardMetaText: { fontSize: 12 },
    projectCardFooter: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, paddingTop: 10, marginTop: 4 },
    projectMembCountText: { fontSize: 12 },
    exploreTaskActionText: { fontSize: 12, fontWeight: "600" },
    listContent: { padding: 16 },
    card: { borderRadius: 8, borderWidth: 1, overflow: "hidden", marginBottom: 12 },
    cardInnerPadding: { padding: 16 },
    cardProjectNamespace: { fontSize: 10, fontWeight: "700", marginBottom: 2, letterSpacing: 0.5 },
    cardHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
    cardTitle: { fontSize: 15, fontWeight: "700" },
    cardDescription: { fontSize: 13, lineHeight: 18, marginBottom: 10 },
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
    badgeText: { fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
    assigneeAvatarStrip: { flexDirection: "row", alignItems: "center", marginVertical: 6, gap: -4 },
    miniAvatarCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, alignItems: "center", justifyContent: "center" },
    miniAvatarText: { fontSize: 8, fontWeight: "700" },
    miniAvatarLabelText: { fontSize: 11, marginLeft: 10 },
    metaRow: { flexDirection: "row", alignItems: "center" },
    metaText: { fontSize: 12 },
    cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
    statusBadgeText: { fontSize: 11, fontWeight: "600", textTransform: "capitalize" },
    taskCardInlineActionBar: { flexDirection: "row", borderTopWidth: 1 },
    inlineActionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 10, borderRightWidth: 1 },
    inlineActionBtnText: { fontSize: 12, fontWeight: "600" },
    paginationWrapper: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 16, paddingTop: 12, borderTopWidth: 1 },
    pageBtn: { padding: 8, borderRadius: 6, borderWidth: 1 },
    pageBtnDisabled: { opacity: 0.3 },
    pageIndicatorText: { fontSize: 12, fontWeight: "600" },
    emptyContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 60 },
    emptyText: { fontSize: 13, marginTop: 8 },
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "flex-end" },
    centeredModalOverlayLayout: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 20 },
    detailSheet: { borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: "92%", paddingBottom: 20 },
    formSheet: { borderTopLeftRadius: 16, borderTopRightRadius: 16, height: "92%", paddingBottom: 20 },
    modalHeader: { padding: 16, borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    modalTitle: { fontSize: 15, fontWeight: "700" },
    modalSubtitle: { fontSize: 11, marginTop: 2 },
    detailModalBody: { padding: 16 },
    webSplitLayoutRow: { flexDirection: "column" },
    webSplitLeftColumn: { flex: 1 },
    detailTitleText: { fontSize: 18, fontWeight: "800", marginBottom: 8 },
    detailDescriptionText: { fontSize: 14, lineHeight: 22 },
    detailFilesBox: { flexDirection: "row", alignItems: "center", gap: 6, padding: 10, borderRadius: 6, marginVertical: 6 },
    detailFileNameLink: { fontSize: 13, textDecorationLine: "underline" },
    activityFeedWrapper: { marginTop: 24, paddingTop: 16, borderTopWidth: 1 },
    activityFeedHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
    activityTitleText: { fontSize: 14, fontWeight: "700" },
    activityUtilityText: { fontSize: 11 },
    activityFeedStreamArea: { paddingVertical: 8, gap: 12 },
    emptyActivityMessageText: { fontSize: 13, fontStyle: "italic", textAlign: "center", paddingVertical: 12 },
    commentCardRow: { flexDirection: "row", gap: 10, padding: 10, borderRadius: 6 },
    commentAvatarCircle: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
    commentAvatarText: { fontSize: 10, fontWeight: "700" },
    commentMetaHeaderText: { fontSize: 12, fontWeight: "700" },
    commentBodyContentText: { fontSize: 13, marginTop: 2 },
    commentInputBoxContainer: { marginTop: 14, borderRadius: 6, padding: 10, borderWidth: 1 },
    commentTextInputNode: { fontSize: 13, minHeight: 40, textAlignVertical: "top" },
    commentInputActionsControlRow: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", marginTop: 8 },
    commentPostSubmitBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4 },
    commentPostSubmitBtnText: { fontSize: 12, fontWeight: "700" },
    webSplitRightSidebar: { marginTop: 24, padding: 14, borderRadius: 8, borderWidth: 1 },
    sidebarSectionHeadingText: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", marginBottom: 12 },
    sidebarPropertyItemBlock: { marginBottom: 14 },
    sidebarPropertyItemHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    sidebarPropertyLabelText: { fontSize: 11, textTransform: "uppercase" },
    sidebarAssigneeDisplayRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
    sidebarAvatarBubble: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    sidebarAvatarBubbleText: { fontSize: 9, fontWeight: "700" },
    sidebarAssigneeValueText: { fontSize: 13 },
    sidebarPropertyStaticValueText: { fontSize: 13, fontWeight: "600", marginTop: 2 },
    modalScrollBody: { padding: 16 },
    formLabel: { fontSize: 13, fontWeight: "700", marginTop: 12, marginBottom: 6 },
    formInput: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 12, height: 44, fontSize: 14 },
    textAreaInput: { height: 70, textAlignVertical: "top", paddingVertical: 10 },
    logoUploadRowField: { flexDirection: "row", alignItems: "center", gap: 8, marginVertical: 4 },
    uploadTriggerBtn: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 4 },
    uploadTriggerBtnText: { fontSize: 12 },
    logoStatusMutedLabel: { fontSize: 11, marginLeft: "auto" },
    dropdownSelector: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderRadius: 6, paddingHorizontal: 12, height: 44 },
    dropdownSelectorText: { fontSize: 14 },
    inlinePickerList: { borderWidth: 1, borderRadius: 6, marginTop: 4, maxHeight: 130 },
    pickerItemRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 12, borderBottomWidth: 1 },
    pickerItemText: { fontSize: 14 },
    prioritySegmentRow: { flexDirection: "row", borderWidth: 1, borderRadius: 6, overflow: "hidden" },
    prioritySegmentCell: { flex: 1, alignItems: "center", justifyContent: "center", height: 40 },
    prioritySegmentText: { fontSize: 11, fontWeight: "600" },
    embeddedTasksMatrixSection: { marginTop: 18, paddingTop: 14, borderTopWidth: 1 },
    embeddedTasksMatrixHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    embeddedSectionTitleText: { fontSize: 13, fontWeight: "700" },
    addInlineTaskTriggerBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 },
    noTasksAddedFallbackMutedText: { fontSize: 12, fontStyle: "italic", marginTop: 6 },
    inlineAttachedTaskCard: { padding: 10, borderRadius: 6, marginTop: 6, borderWidth: 1 },
    inlineAttachedTaskCardTitle: { fontSize: 13, fontWeight: "600" },
    inlineAttachedTaskCardPriority: { fontSize: 11 },
    inlineTaskDialogBoxSurface: { padding: 16, borderRadius: 8, width: "90%", borderWidth: 1 },
    dialogCancelBtn: { padding: 10 },
    dialogConfirmBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 4 },
    submitFormBtn: { borderRadius: 6, height: 46, alignItems: "center", justifyContent: "center", marginTop: 20, marginBottom: 20 },
    submitFormBtnText: { fontSize: 14, fontWeight: "800" },
  });
}