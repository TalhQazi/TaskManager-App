import React, { useState, useMemo, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Dimensions,
  Platform,
  StatusBar,
  Alert,
  Modal,
  KeyboardAvoidingView
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  Grid,
  List,
  Calendar,
  AlertCircle,
  X,
  ChevronDown,
  Trash2,
  Edit3,
  CheckCircle2,
  Circle
} from "lucide-react-native";
import { useAuth } from "../../../contexts/AuthContext";
import { useTheme } from "../../../contexts/ThemeContext";
import { apiRequest } from "../../../services/api";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const GRID_CARD_WIDTH = (SCREEN_WIDTH - 40) / 2;

export interface CRMTask {
  id: string;
  title: string;
  type: string;
  assignedTo: string;
  dueDate: string;
  priority: string;
  linkedEntity: string;
  status: string;
}

interface ContactLookup {
  id: string;
  name: string;
}

interface DealLookup {
  id: string;
  name: string;
}

interface TasksResponse {
  items?: CRMTask[];
}

interface WrappedResponse {
  success: boolean;
  data?: {
    items?: any[];
  };
}

type ApiResponse = WrappedResponse | any;

const TYPE_OPTIONS = ["All", "Follow-up Call", "Meeting", "Reminder"];
const PRIORITY_OPTIONS = ["All", "Low", "Medium", "High", "Urgent"];

const TYPE_CONFIG: Record<string, { bg: string; txt: string; border: string; dot: string }> = {
  "Follow-up Call": { bg: "rgba(99, 102, 241, 0.15)", txt: "#a5b4fc", border: "rgba(99, 102, 241, 0.3)", dot: "#818cf8" },
  "Meeting": { bg: "rgba(16, 185, 129, 0.15)", txt: "#6ee7b7", border: "rgba(16, 185, 129, 0.3)", dot: "#34d399" },
  "Reminder": { bg: "rgba(139, 92, 246, 0.15)", txt: "#c4b5fd", border: "rgba(139, 92, 246, 0.3)", dot: "#a78bfa" }
};

const PRIORITY_CONFIG: Record<string, { bg: string; txt: string; border: string; dot: string }> = {
  "Low": { bg: "rgba(148, 163, 184, 0.15)", txt: "#94a3b8", border: "rgba(148, 163, 184, 0.3)", dot: "#94a3b8" },
  "Medium": { bg: "rgba(56, 189, 248, 0.15)", txt: "#7dd3fc", border: "rgba(56, 189, 248, 0.3)", dot: "#38bdf8" },
  "High": { bg: "rgba(245, 158, 11, 0.15)", txt: "#fcd34d", border: "rgba(245, 158, 11, 0.3)", dot: "#fbbf24" },
  "Urgent": { bg: "rgba(239, 68, 68, 0.15)", txt: "#fca5a5", border: "rgba(239, 68, 68, 0.3)", dot: "#f87171" }
};

function formatDate(dateStr: string) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function isOverdue(dateStr: string, status: string) {
  if (status === "Completed" || !dateStr) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr);
  return due < today;
}

export default function CRMTasks() {
  const queryClient = useQueryClient();
  const auth = useAuth();
  const { uiTheme } = useTheme();

  const isMetallic = uiTheme?.theme === "metallic-elite";

  const colors = useMemo(() => {
    const isDark = (uiTheme?.theme as string) === "dark" || isMetallic;
    return {
      background: uiTheme?.panelColors?.dashboardBackground || (isDark ? "#080a0f" : "#f8fafc"),
      cardBg: uiTheme?.panelColors?.dashboardCardBackground || (isDark ? "#0f1117" : "#ffffff"),
      text: uiTheme?.panelColors?.dashboardTextColor || (isDark ? "#ffffff" : "#0f172a"),
      muted: isDark ? "rgba(255,255,255,0.4)" : "#64748b",
      border: uiTheme?.panelColors?.dashboardBackground || (isDark ? "rgba(255,255,255,0.08)" : "#e2e8f0"),
      inputBg: isDark ? "#020617" : "#ffffff",
      inputBorder: isDark ? "rgba(255,255,255,0.1)" : "#cbd5e1",
      primary: uiTheme?.customColors?.primary || "#7c3aed"
    };
  }, [uiTheme, isMetallic]);

  const styles = useMemo(() => createStyles(colors), [colors]);

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [assigneeFilter, setAssigneeFilter] = useState("All");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  const [showFormModal, setShowFormModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [targetTaskId, setTargetTaskId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<CRMTask | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    type: "Follow-up Call",
    assignedTo: "",
    dueDate: new Date().toISOString().split("T")[0],
    priority: "Medium",
    linkedEntity: "",
    status: "Pending"
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [typeSelectorOpen, setTypeSelectorOpen] = useState(false);
  const [prioritySelectorOpen, setPrioritySelectorOpen] = useState(false);
  const [statusSelectorOpen, setStatusSelectorOpen] = useState(false);
  const [assigneeSelectorOpen, setAssigneeSelectorOpen] = useState(false);
  const [dealSelectorOpen, setDealSelectorOpen] = useState(false);

  const [typeFilterDropdownOpen, setTypeFilterDropdownOpen] = useState(false);
  const [priorityFilterDropdownOpen, setPriorityFilterDropdownOpen] = useState(false);
  const [assigneeFilterDropdownOpen, setAssigneeFilterDropdownOpen] = useState(false);

  const tasksQuery = useQuery({
    queryKey: ["crm-tasks"],
    queryFn: async () => await apiRequest("/crm-tasks", { method: "GET" }) as ApiResponse
  });

  const contactsQuery = useQuery({
    queryKey: ["crm-contacts-lookup"],
    queryFn: async () => await apiRequest("/crm-contacts", { method: "GET" }) as ApiResponse
  });

  const dealsQuery = useQuery({
    queryKey: ["crm-deals-lookup"],
    queryFn: async () => await apiRequest("/crm-deals", { method: "GET" }) as ApiResponse
  });

  const tasks = tasksQuery.data?.data?.items || tasksQuery.data?.items || [];
  const contacts = (contactsQuery.data?.data?.items || contactsQuery.data?.items || []) as ContactLookup[];
  const deals = (dealsQuery.data?.data?.items || dealsQuery.data?.items || []) as DealLookup[];

  const saveMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string | null; data: any }) => {
      const url = id ? `/crm-tasks/${encodeURIComponent(id)}` : "/crm-tasks";
      return await apiRequest(url, {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-tasks"] });
      setShowFormModal(false);
      setTargetTaskId(null);
    },
    onError: (err: any) => Alert.alert("Error", err.message || "Failed to submit modifications.")
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => await apiRequest(`/crm-tasks/${encodeURIComponent(id)}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-tasks"] });
      setShowDeleteModal(false);
      setTargetTaskId(null);
    },
    onError: (err: any) => Alert.alert("Error", err.message || "Failed to remove item.")
  });

  const statusToggleMutation = useMutation({
    mutationFn: async ({ id, nextStatus }: { id: string; nextStatus: string }) => {
      return await apiRequest(`/crm-tasks/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify({ status: nextStatus })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-tasks"] });
    }
  });

  const filteredTasks = useMemo(() => {
    return tasks.filter((t: CRMTask) => {
      const query = searchQuery.toLowerCase();
      const matchSearch =
        t.title?.toLowerCase().includes(query) ||
        t.assignedTo?.toLowerCase().includes(query) ||
        t.linkedEntity?.toLowerCase().includes(query);
      
      const matchType = typeFilter === "All" || t.type === typeFilter;
      const matchPriority = priorityFilter === "All" || t.priority === priorityFilter;
      const matchAssignee = assigneeFilter === "All" || t.assignedTo === assigneeFilter;

      return matchSearch && matchType && matchPriority && matchAssignee;
    });
  }, [tasks, searchQuery, typeFilter, priorityFilter, assigneeFilter]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t: CRMTask) => t.status === "Completed").length;
    const pending = tasks.filter((t: CRMTask) => t.status === "Pending").length;
    const overdue = tasks.filter((t: CRMTask) => isOverdue(t.dueDate, t.status)).length;
    const highPriority = tasks.filter((t: CRMTask) => t.priority === "High" && t.status !== "Completed").length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, pending, overdue, highPriority, rate };
  }, [tasks]);

  const openCreateModal = () => {
    setTargetTaskId(null);
    setFormData({
      title: "",
      type: "Follow-up Call",
      assignedTo: "",
      dueDate: new Date().toISOString().split("T")[0],
      priority: "Medium",
      linkedEntity: "",
      status: "Pending"
    });
    setFormErrors({});
    setShowFormModal(true);
  };

  const openEditModal = (task: CRMTask) => {
    setTargetTaskId(task.id);
    setFormData({
      title: task.title || "",
      type: task.type || "Follow-up Call",
      assignedTo: task.assignedTo || "",
      dueDate: task.dueDate || "",
      priority: task.priority || "Medium",
      linkedEntity: task.linkedEntity || "",
      status: task.status || "Pending"
    });
    setFormErrors({});
    setShowFormModal(true);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.title.trim()) errors.title = "Task title is required";
    if (!formData.dueDate) errors.dueDate = "Due date is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) return;
    saveMutation.mutate({ id: targetTaskId, data: formData });
  };

  const toggleStatus = (task: CRMTask) => {
    const nextStatus = task.status === "Completed" ? "Pending" : "Completed";
    statusToggleMutation.mutate({ id: task.id, nextStatus });
    if (selectedTask?.id === task.id) {
      setSelectedTask({ ...selectedTask, status: nextStatus });
    }
  };

  if (tasksQuery.isLoading) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading tasks…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" />

      <View style={styles.headerRow}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={styles.headerTitle}>Tasks</Text>
          <Text style={styles.headerSubtitle}>Manage follow-ups, meetings, and reminders</Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.createButton, { backgroundColor: colors.primary }]}
          onPress={openCreateModal}
        >
          <Plus size={14} color="#080a0f" style={{ marginRight: 2 }} />
          <Text style={styles.createButtonText}>Create Task</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsGrid}>
          {[
            { label: "Total", val: stats.total, color: colors.text },
            { label: "Pending", val: stats.pending, color: "#f59e0b" },
            { label: "Completed", val: stats.completed, color: "#10b981" },
            { label: "Overdue", val: stats.overdue, color: "#ef4444" },
            { label: "High Priority", val: stats.highPriority, color: "#fb923c" },
            { label: "Done Rate", val: `${stats.rate}%`, color: colors.primary }
          ].map((item, idx) => (
            <View key={idx} style={[styles.statCard, { borderColor: colors.border }]}>
              <Text style={styles.statLabel}>{item.label}</Text>
              <Text style={[styles.statValue, { color: item.color }]}>{item.val}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.filterWorkspaceBlock}>
          <View style={styles.searchBarWrapper}>
            <Search size={14} color={colors.muted} />
            <TextInput
              placeholder="Search tasks, assignees, linked entities…"
              placeholderTextColor={colors.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchInput}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <X size={14} color={colors.text} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.filterButtonsFlexRow}>
            <TouchableOpacity style={[styles.filterSelectorDropdownAnchor, { borderColor: colors.border }]} onPress={() => setTypeFilterDropdownOpen(true)}>
              <Text style={styles.filterSelectorDropdownText} numberOfLines={1}>
                {typeFilter === "All" ? "All Types" : typeFilter}
              </Text>
              <ChevronDown size={12} color={colors.text} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.filterSelectorDropdownAnchor, { borderColor: colors.border }]} onPress={() => setPriorityFilterDropdownOpen(true)}>
              <Text style={styles.filterSelectorDropdownText} numberOfLines={1}>
                {priorityFilter === "All" ? "All Priorities" : priorityFilter}
              </Text>
              <ChevronDown size={12} color={colors.text} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.filterSelectorDropdownAnchor, { borderColor: colors.border }]} onPress={() => setAssigneeFilterDropdownOpen(true)}>
              <Text style={styles.filterSelectorDropdownText} numberOfLines={1}>
                {assigneeFilter === "All" ? "All Assignees" : assigneeFilter}
              </Text>
              <ChevronDown size={12} color={colors.text} />
            </TouchableOpacity>

            <View style={[styles.viewToggleGroupContainer, { borderColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.viewToggleBtn, viewMode === "table" && { backgroundColor: colors.primary }]}
                onPress={() => setViewMode("table")}
              >
                <List size={14} color={viewMode === "table" ? "#080a0f" : colors.text} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.viewToggleBtn, viewMode === "grid" && { backgroundColor: colors.primary }]}
                onPress={() => setViewMode("grid")}
              >
                <Grid size={14} color={viewMode === "grid" ? "#080a0f" : colors.text} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.tasksListingContainer}>
          {filteredTasks.length === 0 ? (
            <View style={[styles.emptyCardContainer, { borderColor: colors.border }]}>
              <AlertCircle size={28} color={colors.muted} />
              <Text style={styles.emptyCardPrimaryText}>No tasks found</Text>
              <Text style={styles.emptyCardSecondaryText}>Adjust filters or create a new task</Text>
            </View>
          ) : viewMode === "table" ? (
            filteredTasks.map((task: CRMTask) => {
              const overdue = isOverdue(task.dueDate, task.status);
              const completed = task.status === "Completed";
              const tCfg = TYPE_CONFIG[task.type] || { bg: "rgba(255,255,255,0.05)", txt: colors.text, border: colors.border, dot: colors.muted };
              const pCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.Medium;

              return (
                <TouchableOpacity
                  key={task.id}
                  style={[styles.rowListCard, { borderColor: colors.border }, completed && { opacity: 0.5 }]}
                  activeOpacity={0.9}
                  onPress={() => { setSelectedTask(task); setShowDetailsModal(true); }}
                >
                  <View style={styles.rowCardTopLineInlineFlex}>
                    <TouchableOpacity onPress={() => toggleStatus(task)} style={styles.checkboxTouchTargetAnchor}>
                      {completed ? (
                        <CheckCircle2 size={16} color={colors.primary} />
                      ) : (
                        <Circle size={16} color={colors.muted} />
                      )}
                    </TouchableOpacity>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={[styles.rowCardTitleText, completed && { textDecorationLine: "line-through", color: colors.muted }]}>
                        {task.title}
                      </Text>
                      {task.linkedEntity ? (
                        <Text style={styles.rowCardLinkedDealText} numberOfLines={1}>{task.linkedEntity}</Text>
                      ) : null}
                    </View>
                    <View style={[styles.badgeContainerFrame, { backgroundColor: pCfg.bg, borderColor: pCfg.border }]}>
                      <View style={[styles.badgeDotIndicator, { backgroundColor: pCfg.dot }]} />
                      <Text style={[styles.badgeLabelStringText, { color: pCfg.txt }]}>{task.priority}</Text>
                    </View>
                  </View>

                  <View style={styles.rowCardMetaColumnsInlineFlex}>
                    <View style={styles.rowCardMetaBoxColumn}>
                      <Text style={styles.rowCardMetaHeaderTitle}>Assigned</Text>
                      <Text style={styles.rowCardMetaValueDisplayString} numberOfLines={1}>{task.assignedTo || "—"}</Text>
                    </View>
                    <View style={styles.rowCardMetaBoxColumn}>
                      <Text style={styles.rowCardMetaHeaderTitle}>Due Date</Text>
                      <Text style={[styles.rowCardMetaValueDisplayString, overdue && { color: "#ef4444" }]} numberOfLines={1}>
                        {formatDate(task.dueDate)}{overdue ? " ⚠" : ""}
                      </Text>
                    </View>
                    <View style={[styles.badgeContainerFrame, { backgroundColor: tCfg.bg, borderColor: tCfg.border, alignSelf: "center" }]}>
                      <View style={[styles.badgeDotIndicator, { backgroundColor: tCfg.dot }]} />
                      <Text style={[styles.badgeLabelStringText, { color: tCfg.txt }]}>{task.type}</Text>
                    </View>
                  </View>

                  <View style={styles.rowCardFooterActionsLine}>
                    <TouchableOpacity style={[styles.rowCardFooterInlineActionBtn, { borderColor: colors.border }]} onPress={() => openEditModal(task)}>
                      <Edit3 size={11} color={colors.text} style={{ marginRight: 4 }} />
                      <Text style={styles.rowCardFooterInlineActionBtnLabel}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.rowCardFooterInlineActionBtn, { borderColor: "rgba(239,68,68,0.2)", backgroundColor: "rgba(239,68,68,0.02)" }]} onPress={() => { setTargetTaskId(task.id); setShowDeleteModal(true); }}>
                      <Trash2 size={11} color="#ef4444" style={{ marginRight: 4 }} />
                      <Text style={[styles.rowCardFooterInlineActionBtnLabel, { color: "#ef4444" }]}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.gridContainerMatrix}>
              {filteredTasks.map((task: CRMTask) => {
                const overdue = isOverdue(task.dueDate, task.status);
                const completed = task.status === "Completed";
                const pCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.Medium;

                return (
                  <TouchableOpacity
                    key={task.id}
                    style={[styles.matrixCardCell, { borderColor: colors.border }, completed && { opacity: 0.5 }]}
                    activeOpacity={0.9}
                    onPress={() => { setSelectedTask(task); setShowDetailsModal(true); }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 6, marginBottom: 8 }}>
                      <TouchableOpacity onPress={() => toggleStatus(task)} style={{ marginTop: 2 }}>
                        {completed ? (
                          <CheckCircle2 size={14} color={colors.primary} />
                        ) : (
                          <Circle size={14} color={colors.muted} />
                        )}
                      </TouchableOpacity>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.gridCardTitleText, completed && { textDecorationLine: "line-through", color: colors.muted }]} numberOfLines={2}>
                          {task.title}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.gridCardSubLabelText} numberOfLines={1}>{task.linkedEntity || "No Linked Deal"}</Text>
                    
                    <View style={[styles.badgeContainerFrame, { backgroundColor: pCfg.bg, borderColor: pCfg.border, marginTop: 8, alignSelf: "flex-start" }]}>
                      <View style={[styles.badgeDotIndicator, { backgroundColor: pCfg.dot }]} />
                      <Text style={[styles.badgeLabelStringText, { color: pCfg.txt }]}>{task.priority}</Text>
                    </View>

                    <View style={styles.gridCardTimestampsRow}>
                      <Calendar size={10} color={colors.muted} />
                      <Text style={[styles.gridCardTimestampsValueText, overdue && { color: "#ef4444" }]}>
                        {formatDate(task.dueDate)}
                      </Text>
                    </View>

                    <View style={styles.gridCardActionsFlexInlineBar}>
                      <TouchableOpacity style={[styles.rowCardFooterInlineActionBtn, { flex: 1, paddingVertical: 4 }]} onPress={() => openEditModal(task)}>
                        <Text style={styles.rowCardFooterInlineActionBtnLabel}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.rowCardFooterInlineActionBtn, { flex: 1, paddingVertical: 4, borderColor: "rgba(239,68,68,0.2)" }]} onPress={() => { setTargetTaskId(task.id); setShowDeleteModal(true); }}>
                        <Text style={[styles.rowCardFooterInlineActionBtnLabel, { color: "#ef4444" }]}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal visible={showFormModal} animationType="slide" transparent>
        <View style={styles.modalOverlayMaskContainer}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={[styles.modalLayoutCard, { borderColor: colors.border }]}>
            <View style={styles.modalHeaderTopBarFlexRow}>
              <Text style={styles.modalHeadingTitleText}>{targetTaskId ? "Edit Task" : "Create New Task"}</Text>
              <TouchableOpacity onPress={() => setShowFormModal(false)} style={styles.modalCloseCircleAnchorBtn}>
                <X size={16} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.formInputLabelDisplay}>Task Title *</Text>
              <TextInput
                value={formData.title}
                onChangeText={t => setFormData({ ...formData, title: t })}
                placeholder="e.g. Follow up on proposal details"
                placeholderTextColor={colors.muted}
                style={[styles.formInputTextNodeField, formErrors.title ? { borderColor: "rgba(239,68,68,0.4)" } : { borderColor: colors.inputBorder }]}
              />
              {formErrors.title ? <Text style={styles.formValidationErrorMessageText}>{formErrors.title}</Text> : null}

              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formInputLabelDisplay}>Type</Text>
                  <TouchableOpacity style={[styles.customDropdownTriggerBoxAnchor, { borderColor: colors.inputBorder }]} onPress={() => setTypeSelectorOpen(true)}>
                    <Text style={styles.customDropdownTriggerDisplayValueText}>{formData.type}</Text>
                    <ChevronDown size={14} color={colors.text} />
                  </TouchableOpacity>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.formInputLabelDisplay}>Priority</Text>
                  <TouchableOpacity style={[styles.customDropdownTriggerBoxAnchor, { borderColor: colors.inputBorder }]} onPress={() => setPrioritySelectorOpen(true)}>
                    <Text style={styles.customDropdownTriggerDisplayValueText}>{formData.priority}</Text>
                    <ChevronDown size={14} color={colors.text} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formInputLabelDisplay}>Due Date *</Text>
                  <TextInput
                    value={formData.dueDate}
                    onChangeText={t => setFormData({ ...formData, dueDate: t })}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.muted}
                    style={[styles.formInputTextNodeField, { borderColor: colors.inputBorder }, formErrors.dueDate ? { borderColor: "rgba(239,68,68,0.4)" } : {}]}
                  />
                  {formErrors.dueDate ? <Text style={styles.formValidationErrorMessageText}>{formErrors.dueDate}</Text> : null}
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.formInputLabelDisplay}>Status</Text>
                  <TouchableOpacity style={[styles.customDropdownTriggerBoxAnchor, { borderColor: colors.inputBorder }]} onPress={() => setStatusSelectorOpen(true)}>
                    <Text style={styles.customDropdownTriggerDisplayValueText}>{formData.status}</Text>
                    <ChevronDown size={14} color={colors.text} />
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.formInputLabelDisplay}>Assigned To</Text>
              <TouchableOpacity style={[styles.customDropdownTriggerBoxAnchor, { borderColor: colors.inputBorder }]} onPress={() => setAssigneeSelectorOpen(true)}>
                <Text style={styles.customDropdownTriggerDisplayValueText}>{formData.assignedTo || "Unassigned"}</Text>
                <ChevronDown size={14} color={colors.text} />
              </TouchableOpacity>

              <Text style={styles.formInputLabelDisplay}>Linked Deal</Text>
              <TouchableOpacity style={[styles.customDropdownTriggerBoxAnchor, { borderColor: colors.inputBorder }]} onPress={() => setDealSelectorOpen(true)}>
                <Text style={styles.customDropdownTriggerDisplayValueText}>{formData.linkedEntity || "No linked deal"}</Text>
                <ChevronDown size={14} color={colors.text} />
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.modalFooterActionsBlockInlineRow}>
              <TouchableOpacity style={styles.modalCancelBtnAnchor} onPress={() => setShowFormModal(false)}>
                <Text style={styles.modalCancelBtnLabelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalSubmitBtnAnchor, { backgroundColor: colors.primary }]} onPress={handleSave}>
                <Text style={styles.modalSubmitBtnLabelText}>
                  {saveMutation.isPending ? "Saving…" : targetTaskId ? "Save Changes" : "Create Task"}
                </Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal visible={showDetailsModal} transparent animationType="fade">
        <View style={styles.modalOverlayMaskContainer}>
          {selectedTask ? (
            <View style={[styles.modalLayoutCard, { borderColor: colors.border }]}>
              <View style={styles.modalHeaderTopBarFlexRow}>
                <Text style={styles.modalHeadingTitleText}>Task Details</Text>
                <TouchableOpacity onPress={() => setShowDetailsModal(false)} style={styles.modalCloseCircleAnchorBtn}>
                  <X size={16} color={colors.text} />
                </TouchableOpacity>
              </View>

              <View style={{ marginVertical: 8, gap: 12 }}>
                <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                  <TouchableOpacity onPress={() => toggleStatus(selectedTask)} style={{ marginTop: 2 }}>
                    {selectedTask.status === "Completed" ? (
                      <CheckCircle2 size={18} color={colors.primary} />
                    ) : (
                      <Circle size={18} color={colors.muted} />
                    )}
                  </TouchableOpacity>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.detailsModalTaskTitleHeaderDisplay, selectedTask.status === "Completed" && { textDecorationLine: "line-through", color: colors.muted }]}>
                      {selectedTask.title}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailsModalFieldsMatrixGridGrid}>
                  <View style={[styles.detailsModalFieldBlockBoxWell, { backgroundColor: "rgba(255,255,255,0.02)", borderColor: colors.border }]}>
                    <Text style={styles.detailsModalFieldBlockBoxLabelTitle}>Type</Text>
                    <Text style={styles.detailsModalFieldBlockBoxValueString}>{selectedTask.type}</Text>
                  </View>
                  <View style={[styles.detailsModalFieldBlockBoxWell, { backgroundColor: "rgba(255,255,255,0.02)", borderColor: colors.border }]}>
                    <Text style={styles.detailsModalFieldBlockBoxLabelTitle}>Priority</Text>
                    <Text style={styles.detailsModalFieldBlockBoxValueString}>{selectedTask.priority}</Text>
                  </View>
                  <View style={[styles.detailsModalFieldBlockBoxWell, { backgroundColor: "rgba(255,255,255,0.02)", borderColor: colors.border }]}>
                    <Text style={styles.detailsModalFieldBlockBoxLabelTitle}>Assigned To</Text>
                    <Text style={styles.detailsModalFieldBlockBoxValueString}>{selectedTask.assignedTo || "—"}</Text>
                  </View>
                  <View style={[styles.detailsModalFieldBlockBoxWell, { backgroundColor: "rgba(255,255,255,0.02)", borderColor: colors.border }]}>
                    <Text style={styles.detailsModalFieldBlockBoxLabelTitle}>Due Date</Text>
                    <Text style={[styles.detailsModalFieldBlockBoxValueString, isOverdue(selectedTask.dueDate, selectedTask.status) && { color: "#ef4444" }]}>
                      {formatDate(selectedTask.dueDate)}
                    </Text>
                  </View>
                </View>

                <View style={[styles.detailsModalFieldBlockBoxWell, { width: "100%", backgroundColor: "rgba(255,255,255,0.02)", borderColor: colors.border }]}>
                  <Text style={styles.detailsModalFieldBlockBoxLabelTitle}>Linked Deal</Text>
                  <Text style={styles.detailsModalFieldBlockBoxValueString}>{selectedTask.linkedEntity || "—"}</Text>
                </View>
              </View>

              <View style={styles.modalFooterActionsBlockInlineRow}>
                <TouchableOpacity style={styles.modalCancelBtnAnchor} onPress={() => setShowDetailsModal(false)}>
                  <Text style={styles.modalCancelBtnLabelText}>Close</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalSubmitBtnAnchor, { backgroundColor: colors.primary }]} onPress={() => { setShowDetailsModal(false); openEditModal(selectedTask); }}>
                  <Text style={styles.modalSubmitBtnLabelText}>Edit Task</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </View>
      </Modal>

      <Modal visible={showDeleteModal} transparent animationType="fade">
        <View style={styles.modalOverlayMaskContainer}>
          <View style={[styles.modalLayoutCard, { borderColor: colors.border, maxWidth: 300, alignItems: "center", padding: 20 }]}>
            <AlertCircle size={32} color="#ef4444" style={{ marginBottom: 12 }} />
            <Text style={styles.deleteModalHeaderPromptLabelTitle}>Delete this task?</Text>
            <Text style={styles.deleteModalSubtitleDisclaimerParagraph}>This action is permanent and cannot be undone.</Text>
            
            <View style={[styles.modalFooterActionsBlockInlineRow, { width: "100%", marginTop: 12 }]}>
              <TouchableOpacity style={styles.modalCancelBtnAnchor} onPress={() => setShowDeleteModal(false)}>
                <Text style={styles.modalCancelBtnLabelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalSubmitBtnAnchor, { backgroundColor: "#ef4444" }]} onPress={() => targetTaskId && deleteMutation.mutate(targetTaskId)}>
                <Text style={styles.modalSubmitBtnLabelText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={typeFilterDropdownOpen} transparent animationType="fade">
        <TouchableOpacity style={styles.sheetBackdropTouchWindowOverlay} activeOpacity={1} onPress={() => setTypeFilterDropdownOpen(false)}>
          <View style={[styles.sheetDropdownContentWrapperCard, { borderColor: colors.primary }]}>
            <Text style={styles.sheetDropdownPanelHeaderLabelTitle}>Filter By Type</Text>
            {TYPE_OPTIONS.map(opt => (
              <TouchableOpacity key={opt} style={styles.sheetDropdownItemRowTouchTrack} onPress={() => { setTypeFilter(opt); setTypeFilterDropdownOpen(false); }}>
                <Text style={styles.sheetDropdownItemRowDisplayTextLabel}>{opt === "All" ? "All Types" : opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={priorityFilterDropdownOpen} transparent animationType="fade">
        <TouchableOpacity style={styles.sheetBackdropTouchWindowOverlay} activeOpacity={1} onPress={() => setPriorityFilterDropdownOpen(false)}>
          <View style={[styles.sheetDropdownContentWrapperCard, { borderColor: colors.primary }]}>
            <Text style={styles.sheetDropdownPanelHeaderLabelTitle}>Filter By Priority</Text>
            {PRIORITY_OPTIONS.map(opt => (
              <TouchableOpacity key={opt} style={styles.sheetDropdownItemRowTouchTrack} onPress={() => { setPriorityFilter(opt); setPriorityFilterDropdownOpen(false); }}>
                <Text style={styles.sheetDropdownItemRowDisplayTextLabel}>{opt === "All" ? "All Priorities" : opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={assigneeFilterDropdownOpen} transparent animationType="fade">
        <TouchableOpacity style={styles.sheetBackdropTouchWindowOverlay} activeOpacity={1} onPress={() => setAssigneeFilterDropdownOpen(false)}>
          <View style={[styles.sheetDropdownContentWrapperCard, { borderColor: colors.primary }]}>
            <Text style={styles.sheetDropdownPanelHeaderLabelTitle}>Filter By Assignee</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <TouchableOpacity style={styles.sheetDropdownItemRowTouchTrack} onPress={() => { setAssigneeFilter("All"); setAssigneeFilterDropdownOpen(false); }}>
                <Text style={styles.sheetDropdownItemRowDisplayTextLabel}>All Assignees</Text>
              </TouchableOpacity>
              {contacts.map(c => (
                <TouchableOpacity key={c.id} style={styles.sheetDropdownItemRowTouchTrack} onPress={() => { setAssigneeFilter(c.name); setAssigneeFilterDropdownOpen(false); }}>
                  <Text style={styles.sheetDropdownItemRowDisplayTextLabel}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={typeSelectorOpen} transparent animationType="fade">
        <TouchableOpacity style={styles.sheetBackdropTouchWindowOverlay} activeOpacity={1} onPress={() => setTypeSelectorOpen(false)}>
          <View style={[styles.sheetDropdownContentWrapperCard, { borderColor: colors.primary }]}>
            <Text style={styles.sheetDropdownPanelHeaderLabelTitle}>Select Task Type</Text>
            {TYPE_OPTIONS.filter(o => o !== "All").map(opt => (
              <TouchableOpacity key={opt} style={styles.sheetDropdownItemRowTouchTrack} onPress={() => { setFormData({ ...formData, type: opt }); setTypeSelectorOpen(false); }}>
                <Text style={styles.sheetDropdownItemRowDisplayTextLabel}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={prioritySelectorOpen} transparent animationType="fade">
        <TouchableOpacity style={styles.sheetBackdropTouchWindowOverlay} activeOpacity={1} onPress={() => setPrioritySelectorOpen(false)}>
          <View style={[styles.sheetDropdownContentWrapperCard, { borderColor: colors.primary }]}>
            <Text style={styles.sheetDropdownPanelHeaderLabelTitle}>Select Priority Level</Text>
            {PRIORITY_OPTIONS.filter(o => o !== "All").map(opt => (
              <TouchableOpacity key={opt} style={styles.sheetDropdownItemRowTouchTrack} onPress={() => { setFormData({ ...formData, priority: opt }); setPrioritySelectorOpen(false); }}>
                <Text style={styles.sheetDropdownItemRowDisplayTextLabel}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={statusSelectorOpen} transparent animationType="fade">
        <TouchableOpacity style={styles.sheetBackdropTouchWindowOverlay} activeOpacity={1} onPress={() => setStatusSelectorOpen(false)}>
          <View style={[styles.sheetDropdownContentWrapperCard, { borderColor: colors.primary }]}>
            <Text style={styles.sheetDropdownPanelHeaderLabelTitle}>Select Status</Text>
            {["Pending", "Completed"].map(opt => (
              <TouchableOpacity key={opt} style={styles.sheetDropdownItemRowTouchTrack} onPress={() => { setFormData({ ...formData, status: opt }); setStatusSelectorOpen(false); }}>
                <Text style={styles.sheetDropdownItemRowDisplayTextLabel}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={assigneeSelectorOpen} transparent animationType="fade">
        <TouchableOpacity style={styles.sheetBackdropTouchWindowOverlay} activeOpacity={1} onPress={() => setAssigneeSelectorOpen(false)}>
          <View style={[styles.sheetDropdownContentWrapperCard, { borderColor: colors.primary }]}>
            <Text style={styles.sheetDropdownPanelHeaderLabelTitle}>Select Assignee</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <TouchableOpacity style={styles.sheetDropdownItemRowTouchTrack} onPress={() => { setFormData({ ...formData, assignedTo: "" }); setAssigneeSelectorOpen(false); }}>
                <Text style={styles.sheetDropdownItemRowDisplayTextLabel}>Unassigned</Text>
              </TouchableOpacity>
              {contacts.map(c => (
                <TouchableOpacity key={c.id} style={styles.sheetDropdownItemRowTouchTrack} onPress={() => { setFormData({ ...formData, assignedTo: c.name }); setAssigneeSelectorOpen(false); }}>
                  <Text style={styles.sheetDropdownItemRowDisplayTextLabel}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={dealSelectorOpen} transparent animationType="fade">
        <TouchableOpacity style={styles.sheetBackdropTouchWindowOverlay} activeOpacity={1} onPress={() => setDealSelectorOpen(false)}>
          <View style={[styles.sheetDropdownContentWrapperCard, { borderColor: colors.primary }]}>
            <Text style={styles.sheetDropdownPanelHeaderLabelTitle}>Select Linked Deal</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <TouchableOpacity style={styles.sheetDropdownItemRowTouchTrack} onPress={() => { setFormData({ ...formData, linkedEntity: "" }); setDealSelectorOpen(false); }}>
                <Text style={styles.sheetDropdownItemRowDisplayTextLabel}>No linked deal</Text>
              </TouchableOpacity>
              {deals.map(d => (
                <TouchableOpacity key={d.id} style={styles.sheetDropdownItemRowTouchTrack} onPress={() => { setFormData({ ...formData, linkedEntity: d.name }); setDealSelectorOpen(false); }}>
                  <Text style={styles.sheetDropdownItemRowDisplayTextLabel}>{d.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background
  },
  centered: {
    justifyContent: "center",
    alignItems: "center"
  },
  loadingText: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 12,
    fontWeight: "600"
  },
  scrollContainer: {
    paddingHorizontal: 16,
    paddingBottom: 40
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderColor: colors.border
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: colors.text
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2
  },
  createButton: {
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center"
  },
  createButtonText: {
    color: "#080a0f",
    fontSize: 11,
    fontWeight: "900"
  },
  statsGrid: {
    paddingVertical: 14,
    gap: 8
  },
  statCard: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 94
  },
  statLabel: {
    fontSize: 9,
    color: colors.muted,
    textTransform: "uppercase",
    fontWeight: "700",
    letterSpacing: 0.2
  },
  statValue: {
    fontSize: 18,
    fontWeight: "900",
    marginTop: 2
  },
  filterWorkspaceBlock: {
    backgroundColor: colors.cardBg,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
    marginBottom: 12
  },
  searchBarWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.15)",
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 38
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 12,
    paddingLeft: 6
  },
  filterButtonsFlexRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6
  },
  filterSelectorDropdownAnchor: {
    flex: 1,
    minWidth: 90,
    backgroundColor: "rgba(255,255,255,0.02)",
    borderWidth: 1,
    height: 30,
    borderRadius: 6,
    paddingHorizontal: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  filterSelectorDropdownText: {
    fontSize: 11,
    color: colors.text,
    fontWeight: "600",
    marginRight: 4
  },
  viewToggleGroupContainer: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 6,
    overflow: "hidden"
  },
  viewToggleBtn: {
    width: 30,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.02)"
  },
  tasksListingContainer: {
    marginTop: 4
  },
  emptyCardContainer: {
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    padding: 32,
    alignItems: "center",
    gap: 6
  },
  emptyCardPrimaryText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "800",
    marginTop: 2
  },
  emptyCardSecondaryText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "500"
  },
  rowListCard: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10
  },
  rowCardTopLineInlineFlex: {
    flexDirection: "row",
    alignItems: "flex-start"
  },
  checkboxTouchTargetAnchor: {
    marginRight: 10,
    marginTop: 1
  },
  rowCardTitleText: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text,
    lineHeight: 18
  },
  rowCardLinkedDealText: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 3,
    fontWeight: "500"
  },
  badgeContainerFrame: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    height: 20,
    borderRadius: 10,
    borderWidth: 1
  },
  badgeDotIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginRight: 4
  },
  badgeLabelStringText: {
    fontSize: 9,
    fontWeight: "800"
  },
  rowCardMetaColumnsInlineFlex: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "rgba(0,0,0,0.12)",
    borderRadius: 10,
    padding: 10,
    marginTop: 12
  },
  rowCardMetaBoxColumn: {
    flex: 1
  },
  rowCardMetaHeaderTitle: {
    fontSize: 8,
    color: colors.muted,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  rowCardMetaValueDisplayString: {
    fontSize: 12,
    color: colors.text,
    fontWeight: "600",
    marginTop: 2
  },
  rowCardFooterActionsLine: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 12,
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.03)",
    paddingTop: 10
  },
  rowCardFooterInlineActionBtn: {
    borderWidth: 1,
    paddingHorizontal: 10,
    height: 26,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.01)"
  },
  rowCardFooterInlineActionBtnLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.text
  },
  gridContainerMatrix: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  matrixCardCell: {
    width: GRID_CARD_WIDTH,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 2
  },
  gridCardTitleText: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.text,
    lineHeight: 16
  },
  gridCardSubLabelText: {
    fontSize: 10,
    color: colors.muted,
    fontWeight: "500",
    marginTop: 2,
    paddingLeft: 20
  },
  gridCardTimestampsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 10,
    paddingLeft: 20
  },
  gridCardTimestampsValueText: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: "600"
  },
  gridCardActionsFlexInlineBar: {
    flexDirection: "row",
    gap: 6,
    marginTop: 12,
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.03)",
    paddingTop: 8
  },
  modalOverlayMaskContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16
  },
  modalLayoutCard: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    width: "100%",
    maxWidth: 350,
    maxHeight: "85%"
  },
  modalHeaderTopBarFlexRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 12
  },
  modalHeadingTitleText: {
    fontSize: 15,
    fontWeight: "900",
    color: colors.text
  },
  modalCloseCircleAnchorBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
    justifyContent: "center"
  },
  formInputLabelDisplay: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.muted,
    textTransform: "uppercase",
    marginBottom: 6,
    marginTop: 12
  },
  formInputTextNodeField: {
    backgroundColor: "rgba(0,0,0,0.2)",
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 8,
    color: colors.text,
    fontSize: 12
  },
  formValidationErrorMessageText: {
    fontSize: 10,
    color: "#ef4444",
    marginTop: 4,
    fontWeight: "600"
  },
  customDropdownTriggerBoxAnchor: {
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: "rgba(0,0,0,0.2)",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  customDropdownTriggerDisplayValueText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: "500",
    flex: 1
  },
  inlineDropdownContainer: {
    width: "100%",
    backgroundColor: "rgba(0,0,0,0.2)",
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 2,
    paddingHorizontal: 4,
    overflow: "hidden"
  },
  modalFooterActionsBlockInlineRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingTop: 12
  },
  modalCancelBtnAnchor: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
    height: 38,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center"
  },
  modalCancelBtnLabelText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700"
  },
  modalSubmitBtnAnchor: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center"
  },
  modalSubmitBtnLabelText: {
    color: "#080a0f",
    fontSize: 12,
    fontWeight: "900"
  },
  detailsModalTaskTitleHeaderDisplay: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.text,
    lineHeight: 22
  },
  detailsModalFieldsMatrixGridGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4
  },
  detailsModalFieldBlockBoxWell: {
    width: (350 - 42) / 2,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10
  },
  detailsModalFieldBlockBoxLabelTitle: {
    fontSize: 9,
    color: colors.muted,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  detailsModalFieldBlockBoxValueString: {
    fontSize: 13,
    color: colors.text,
    fontWeight: "700",
    marginTop: 3
  },
  deleteModalHeaderPromptLabelTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: colors.text,
    marginBottom: 4
  },
  deleteModalSubtitleDisclaimerParagraph: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: "500",
    textAlign: "center"
  },
  sheetBackdropTouchWindowOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center"
  },
  sheetDropdownContentWrapperCard: {
    width: SCREEN_WIDTH * 0.85,
    maxWidth: 310,
    maxHeight: 260,
    backgroundColor: colors.cardBg,
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 14
  },
  sheetDropdownPanelHeaderLabelTitle: {
    fontSize: 10,
    fontWeight: "900",
    color: colors.primary,
    textTransform: "uppercase",
    marginBottom: 10,
    letterSpacing: 0.5
  },
  sheetDropdownItemRowTouchTrack: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 4
  },
  sheetDropdownItemRowDisplayTextLabel: {
    fontSize: 12,
    color: colors.text,
    fontWeight: "500"
  }
});