import React, { useMemo, useState, useRef, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import {
  X,
  Check,
  Calendar,
  Users,
  User,
  Folder,
  Flag,
  ListTodo,
  Plus,
  Trash2,
  Paperclip,
  MapPin,
  Search,
  AlignLeft,
  ChevronRight,
} from "lucide-react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { useTaskTheme } from "./theme";
import { Task, TaskPriority, TaskStatus, Subtask } from "./types";
import { convertAssetToBase64, formatFileSize, TaskAttachmentPayload } from "./fileUtils";
import { useAuth } from "@/contexts/AuthContext";
import { toProxiedUrl } from "@/util/toProxiedUrl";

export interface TaskSubtaskItem {
  id: string;
  title: string;
  completed: boolean;
}

export interface TaskFormPayload {
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  assignees: string[];
  location?: string;
  dueDate?: string;
  projectId?: string;
  attachments: TaskAttachmentPayload[];
  subtasks?: TaskSubtaskItem[];
}

interface CreateTaskModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (payload: TaskFormPayload) => void;
  isSubmitting?: boolean;
  isEditing?: boolean;
  employeeOptions: { id: string; name: string; email?: string; avatarUrl?: string }[];
  projectOptions?: { id: string; name: string }[];
  defaultProjectId?: string;
  canAssign?: boolean;
  initial?: Partial<TaskFormPayload>;
  initialTask?: Task | null;
}

const PRIORITIES: { key: TaskPriority; label: string; color: string; bg: string }[] = [
  { key: "urgent", label: "Urgent", color: "#EF4444", bg: "#FEE2E2" },
  { key: "high", label: "High", color: "#F97316", bg: "#FFEDD5" },
  { key: "medium", label: "Medium", color: "#D97706", bg: "#FEF3C7" },
  { key: "low", label: "Low", color: "#64748B", bg: "#F1F5F9" },
];

const STATUSES: { key: TaskStatus; label: string; color: string; bg: string }[] = [
  { key: "pending", label: "Pending", color: "#64748B", bg: "#F1F5F9" },
  { key: "in-progress", label: "In Progress", color: "#2563EB", bg: "#EFF6FF" },
  { key: "completed", label: "Completed", color: "#10B981", bg: "#D1FAE5" },
];

const AVATAR_COLORS = [
  "#2563EB", "#7C3AED", "#DB2777", "#EA580C", "#059669", "#0891B2", "#4F46E5", "#D97706"
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getQuickDate(type: "today" | "tomorrow" | "next-week"): string {
  const d = new Date();
  if (type === "tomorrow") {
    d.setDate(d.getDate() + 1);
  } else if (type === "next-week") {
    const day = d.getDay();
    const diff = (8 - day) % 7 || 7;
    d.setDate(d.getDate() + diff);
  }
  return d.toISOString().split("T")[0];
}

function formatDueDisplay(dateStr?: string): { label: string; isToday?: boolean; isTomorrow?: boolean } {
  if (!dateStr) return { label: "No due date" };
  const todayStr = getQuickDate("today");
  const tomorrowStr = getQuickDate("tomorrow");

  const clean = dateStr.split("T")[0];
  if (clean === todayStr) return { label: "Today", isToday: true };
  if (clean === tomorrowStr) return { label: "Tomorrow", isTomorrow: true };

  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) return { label: dateStr };
  return {
    label: parsed.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      weekday: "short",
    }),
  };
}

function EmployeeAvatar({
  name,
  avatarUrl,
  size = 32,
}: {
  name: string;
  avatarUrl?: string;
  size?: number;
}) {
  const { token } = useAuth();
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [avatarUrl]);

  const resolvedUri = useMemo(() => {
    if (!avatarUrl || typeof avatarUrl !== "string") return undefined;
    const clean = avatarUrl.trim();
    if (!clean) return undefined;
    return toProxiedUrl(clean, token);
  }, [avatarUrl, token]);

  if (resolvedUri && !hasError) {
    return (
      <Image
        source={{
          uri: resolvedUri,
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: "#E2E8F0",
        }}
        resizeMode="cover"
        onError={() => setHasError(true)}
      />
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: getAvatarColor(name),
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          fontSize: Math.max(10, Math.round(size * 0.38)),
          fontWeight: "700",
          color: "#FFFFFF",
        }}
      >
        {getInitials(name)}
      </Text>
    </View>
  );
}

export default function CreateTaskModal({
  visible,
  onClose,
  onSubmit,
  isSubmitting,
  isEditing = false,
  employeeOptions = [],
  projectOptions = [],
  defaultProjectId,
  canAssign = true,
  initial,
  initialTask,
}: CreateTaskModalProps) {
  const theme = useTaskTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const titleInputRef = useRef<TextInput>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [status, setStatus] = useState<TaskStatus>("pending");
  const [assignees, setAssignees] = useState<string[]>([]);
  const [location, setLocation] = useState("");
  const [dueDate, setDueDate] = useState<string | undefined>(undefined);
  const [projectId, setProjectId] = useState<string | undefined>(defaultProjectId);
  const [attachments, setAttachments] = useState<TaskAttachmentPayload[]>([]);
  const [subtasks, setSubtasks] = useState<TaskSubtaskItem[]>([]);

  // Modals & Pickers
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showAssigneePicker, setShowAssigneePicker] = useState(false);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [showPriorityPicker, setShowPriorityPicker] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [customAssignee, setCustomAssignee] = useState("");
  const [projectSearch, setProjectSearch] = useState("");

  useEffect(() => {
    if (visible) {
      const source = initialTask || initial;
      if (source) {
        setTitle(source.title || "");
        setDescription(source.description || "");
        setPriority((source.priority as TaskPriority) || "medium");
        setStatus((source.status as TaskStatus) || "pending");
        setAssignees(source.assignees || []);
        setLocation(source.location || "");
        setDueDate(source.dueDate);
        const pid =
          typeof source.projectId === "string"
            ? source.projectId
            : (source.projectId as any)?._id || (source.projectId as any)?.id;
        setProjectId(pid || defaultProjectId);
        setAttachments((source.attachments as any) || []);

        const initialSubtasks = (source as any).subtasks;
        if (Array.isArray(initialSubtasks) && initialSubtasks.length > 0) {
          setSubtasks(
            initialSubtasks.map((s: any) => ({
              id: s.id || s._id || String(Math.random()),
              title: s.title || "",
              completed: !!s.completed,
            }))
          );
        } else {
          setSubtasks([]);
        }
      } else {
        setTitle("");
        setDescription("");
        setPriority("medium");
        setStatus("pending");
        setAssignees([]);
        setLocation("");
        setDueDate(undefined);
        setProjectId(defaultProjectId);
        setAttachments([]);
        setSubtasks([]);
      }
      setAssigneeSearch("");
      setCustomAssignee("");
      setProjectSearch("");
      setShowAssigneePicker(false);
      setShowProjectPicker(false);
      setShowPriorityPicker(false);
      setShowStatusPicker(false);
    }
  }, [visible, initial, initialTask, defaultProjectId]);

  const handlePickAttachments = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "*/*", multiple: true });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const converted = await Promise.all(result.assets.map((a) => convertAssetToBase64(a)));
        setAttachments((prev) => [...prev, ...converted]);
      }
    } catch (err) {
      console.log("[CreateTaskModal] attachment pick failed", err);
      Alert.alert("Attachment Error", "Could not read the selected file(s).");
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleAssignee = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setAssignees((prev) =>
      prev.includes(trimmed) ? prev.filter((n) => n !== trimmed) : [...prev, trimmed]
    );
  };

  const addCustomAssignee = () => {
    const trimmed = customAssignee.trim();
    if (!trimmed) return;
    if (!assignees.includes(trimmed)) {
      setAssignees((prev) => [...prev, trimmed]);
    }
    setCustomAssignee("");
  };

  // Subtask handlers
  const handleAddSubtask = () => {
    setSubtasks((prev) => [
      ...prev,
      {
        id: "st-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
        title: "",
        completed: false,
      },
    ]);
  };

  const updateSubtaskTitle = (id: string, text: string) => {
    setSubtasks((prev) => prev.map((s) => (s.id === id ? { ...s, title: text } : s)));
  };

  const toggleSubtaskComplete = (id: string) => {
    setSubtasks((prev) => prev.map((s) => (s.id === id ? { ...s, completed: !s.completed } : s)));
  };

  const removeSubtask = (id: string) => {
    setSubtasks((prev) => prev.filter((s) => s.id !== id));
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      Alert.alert("Task name required", "Please enter a task name before creating.");
      titleInputRef.current?.focus();
      return;
    }

    // Filter out completely empty subtask rows
    const cleanedSubtasks = subtasks
      .filter((s) => s.title.trim().length > 0)
      .map((s) => ({ ...s, title: s.title.trim() }));

    onSubmit({
      title: title.trim(),
      description: description.trim(),
      priority,
      status,
      assignees,
      location: location.trim(),
      dueDate,
      projectId,
      attachments,
      subtasks: cleanedSubtasks,
    });
  };

  const currentProject = projectOptions.find((p) => p.id === projectId);
  const projectName = currentProject?.name;

  const filteredEmployees = useMemo(() => {
    if (!assigneeSearch.trim()) return employeeOptions;
    const q = assigneeSearch.toLowerCase();
    return employeeOptions.filter((e) => e.name.toLowerCase().includes(q));
  }, [employeeOptions, assigneeSearch]);

  const filteredProjects = useMemo(() => {
    if (!projectSearch.trim()) return projectOptions;
    const q = projectSearch.toLowerCase();
    return projectOptions.filter((p) => p.name.toLowerCase().includes(q));
  }, [projectOptions, projectSearch]);

  const dueInfo = formatDueDisplay(dueDate);
  const isCompleted = status === "completed";
  const priorityConfig = PRIORITIES.find((p) => p.key === priority) || PRIORITIES[2];
  const statusConfig = STATUSES.find((s) => s.key === status) || STATUSES[0];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
          style={styles.sheet}
        >
          {/* Header Bar */}
          <View style={styles.header}>
            <View style={styles.headerContextRow}>
              <Folder size={15} color={theme.accent.primary} />
              <TouchableOpacity
                onPress={() => projectOptions.length > 0 && setShowProjectPicker(true)}
                activeOpacity={projectOptions.length > 0 ? 0.7 : 1}
                style={styles.headerProjectTouch}
              >
                <Text style={styles.headerProjectName} numberOfLines={1}>
                  {projectName || "My Tasks"}
                </Text>
                {projectOptions.length > 0 && <ChevronRight size={14} color={theme.text.tertiary} />}
              </TouchableOpacity>
            </View>

            <View style={styles.headerRightActions}>
              <TouchableOpacity
                style={[styles.headerSubmitBtn, (!title.trim() || isSubmitting) && styles.headerSubmitDisabled]}
                onPress={handleSubmit}
                disabled={!title.trim() || isSubmitting}
                activeOpacity={0.8}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Check size={14} color="#FFFFFF" strokeWidth={2.5} />
                    <Text style={styles.headerSubmitText}>{isEditing ? "Save" : "Create"}</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <X size={20} color={theme.text.secondary} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Title Section with Asana-style complete toggle */}
            <View style={styles.heroTitleContainer}>
              <TouchableOpacity
                style={[styles.completeCheckCircle, isCompleted && styles.completeCheckCircleDone]}
                onPress={() => setStatus(isCompleted ? "pending" : "completed")}
                accessibilityLabel="Mark complete"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                {isCompleted && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
              </TouchableOpacity>
              <TextInput
                ref={titleInputRef}
                value={title}
                onChangeText={setTitle}
                placeholder="Write a task name..."
                placeholderTextColor={theme.text.tertiary}
                style={[styles.heroTitleInput, isCompleted && styles.heroTitleInputDone]}
                multiline
                autoFocus={!isEditing}
              />
            </View>

            {/* Asana Properties Grid */}
            <View style={styles.propertiesCard}>
              {/* Assignee Row */}
              {canAssign && (
                <View style={styles.propertyRow}>
                  <View style={styles.propertyLabelWrap}>
                    <Users size={16} color={theme.text.tertiary} />
                    <Text style={styles.propertyLabel}>Assignee</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.propertyValueButton}
                    onPress={() => setShowAssigneePicker(true)}
                    activeOpacity={0.7}
                  >
                    {assignees.length === 0 ? (
                      <View style={styles.unassignedPill}>
                        <User size={13} color={theme.text.tertiary} />
                        <Text style={styles.unassignedText}>Unassigned</Text>
                      </View>
                    ) : (
                      <View style={styles.assigneeListWrap}>
                        {assignees.slice(0, 2).map((name) => {
                          const clean = name.trim().toLowerCase();
                          const emp = employeeOptions.find(
                            (e) =>
                              e.name.trim().toLowerCase() === clean ||
                              (e.email && e.email.trim().toLowerCase() === clean) ||
                              e.id === name
                          );
                          return (
                            <View key={name} style={styles.assigneeChip}>
                              <EmployeeAvatar
                                name={name}
                                avatarUrl={emp?.avatarUrl}
                                size={22}
                              />
                              <Text style={styles.assigneeChipText} numberOfLines={1}>
                                {name}
                              </Text>
                            </View>
                          );
                        })}
                        {assignees.length > 2 && (
                          <View style={styles.moreAssigneesBadge}>
                            <Text style={styles.moreAssigneesText}>+{assignees.length - 2}</Text>
                          </View>
                        )}
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* Due Date Row */}
              <View style={styles.propertyRow}>
                <View style={styles.propertyLabelWrap}>
                  <Calendar size={16} color={theme.text.tertiary} />
                  <Text style={styles.propertyLabel}>Due date</Text>
                </View>
                <TouchableOpacity
                  style={styles.propertyValueButton}
                  onPress={() => setShowDatePicker(true)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.dueDatePill,
                      dueInfo.isToday && styles.dueDateToday,
                      dueInfo.isTomorrow && styles.dueDateTomorrow,
                      !dueDate && styles.dueDateEmpty,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dueDateText,
                        dueInfo.isToday && styles.dueDateTodayText,
                        dueInfo.isTomorrow && styles.dueDateTomorrowText,
                      ]}
                    >
                      {dueInfo.label}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Quick Due Date Chips */}
              <View style={styles.quickDateRow}>
                <TouchableOpacity
                  style={[styles.quickDateChip, dueDate === getQuickDate("today") && styles.quickDateChipActive]}
                  onPress={() => setDueDate(getQuickDate("today"))}
                >
                  <Text
                    style={[
                      styles.quickDateChipText,
                      dueDate === getQuickDate("today") && styles.quickDateChipTextActive,
                    ]}
                  >
                    Today
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.quickDateChip, dueDate === getQuickDate("tomorrow") && styles.quickDateChipActive]}
                  onPress={() => setDueDate(getQuickDate("tomorrow"))}
                >
                  <Text
                    style={[
                      styles.quickDateChipText,
                      dueDate === getQuickDate("tomorrow") && styles.quickDateChipTextActive,
                    ]}
                  >
                    Tomorrow
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.quickDateChip, dueDate === getQuickDate("next-week") && styles.quickDateChipActive]}
                  onPress={() => setDueDate(getQuickDate("next-week"))}
                >
                  <Text
                    style={[
                      styles.quickDateChipText,
                      dueDate === getQuickDate("next-week") && styles.quickDateChipTextActive,
                    ]}
                  >
                    Next week
                  </Text>
                </TouchableOpacity>
                {dueDate && (
                  <TouchableOpacity
                    style={styles.quickDateChipClear}
                    onPress={() => setDueDate(undefined)}
                  >
                    <X size={12} color={theme.text.tertiary} />
                    <Text style={styles.quickDateChipClearText}>Clear</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Projects Row */}
              {projectOptions.length > 0 && (
                <View style={styles.propertyRow}>
                  <View style={styles.propertyLabelWrap}>
                    <Folder size={16} color={theme.text.tertiary} />
                    <Text style={styles.propertyLabel}>Project</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.propertyValueButton}
                    onPress={() => setShowProjectPicker(true)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.projectPill}>
                      <Text style={styles.projectPillText} numberOfLines={1}>
                        {projectName || "No project (Inbox)"}
                      </Text>
                      <ChevronRight size={13} color={theme.text.tertiary} />
                    </View>
                  </TouchableOpacity>
                </View>
              )}

              {/* Priority Row */}
              <View style={styles.propertyRow}>
                <View style={styles.propertyLabelWrap}>
                  <Flag size={16} color={theme.text.tertiary} />
                  <Text style={styles.propertyLabel}>Priority</Text>
                </View>
                <TouchableOpacity
                  style={styles.propertyValueButton}
                  onPress={() => setShowPriorityPicker(true)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.priorityPill, { backgroundColor: priorityConfig.bg }]}>
                    <View style={[styles.priorityDot, { backgroundColor: priorityConfig.color }]} />
                    <Text style={[styles.priorityPillText, { color: priorityConfig.color }]}>
                      {priorityConfig.label}
                    </Text>
                    <ChevronRight size={12} color={priorityConfig.color} />
                  </View>
                </TouchableOpacity>
              </View>

              {/* Status Row */}
              <View style={styles.propertyRow}>
                <View style={styles.propertyLabelWrap}>
                  <Check size={16} color={theme.text.tertiary} />
                  <Text style={styles.propertyLabel}>Status</Text>
                </View>
                <TouchableOpacity
                  style={styles.propertyValueButton}
                  onPress={() => setShowStatusPicker(true)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.statusPill, { backgroundColor: statusConfig.bg }]}>
                    <Text style={[styles.statusPillText, { color: statusConfig.color }]}>
                      {statusConfig.label}
                    </Text>
                    <ChevronRight size={12} color={statusConfig.color} />
                  </View>
                </TouchableOpacity>
              </View>

              {/* Location Row (Optional) */}
              <View style={[styles.propertyRow, { borderBottomWidth: 0 }]}>
                <View style={styles.propertyLabelWrap}>
                  <MapPin size={16} color={theme.text.tertiary} />
                  <Text style={styles.propertyLabel}>Location</Text>
                </View>
                <TextInput
                  value={location}
                  onChangeText={setLocation}
                  placeholder="Add location (optional)"
                  placeholderTextColor={theme.text.tertiary}
                  style={styles.locationInlineInput}
                />
              </View>
            </View>

            {/* Description / Notes Section */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionTitleBar}>
                <AlignLeft size={16} color={theme.text.tertiary} />
                <Text style={styles.sectionTitleText}>Description</Text>
              </View>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="What is this task about? Add notes, instructions, links..."
                placeholderTextColor={theme.text.tertiary}
                style={styles.descriptionCanvas}
                multiline
                textAlignVertical="top"
              />
            </View>

            {/* Subtasks (Checklist) Section - Asana Hallmark */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionTitleBarBetween}>
                <View style={styles.sectionTitleLeft}>
                  <ListTodo size={16} color={theme.text.tertiary} />
                  <Text style={styles.sectionTitleText}>Subtasks</Text>
                  {subtasks.length > 0 && (
                    <View style={styles.subtaskCountBadge}>
                      <Text style={styles.subtaskCountText}>
                        {subtasks.filter((s) => s.completed).length}/{subtasks.length}
                      </Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity style={styles.addSubtaskAction} onPress={handleAddSubtask} activeOpacity={0.7}>
                  <Plus size={14} color={theme.accent.primary} strokeWidth={2.5} />
                  <Text style={styles.addSubtaskActionText}>Add subtask</Text>
                </TouchableOpacity>
              </View>

              {subtasks.map((st, index) => (
                <View key={st.id} style={styles.subtaskItemRow}>
                  <TouchableOpacity
                    style={[styles.subtaskCheckCircle, st.completed && styles.subtaskCheckCircleDone]}
                    onPress={() => toggleSubtaskComplete(st.id)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    {st.completed && <Check size={10} color="#FFFFFF" strokeWidth={3} />}
                  </TouchableOpacity>
                  <TextInput
                    value={st.title}
                    onChangeText={(txt) => updateSubtaskTitle(st.id, txt)}
                    placeholder={`Subtask ${index + 1}...`}
                    placeholderTextColor={theme.text.tertiary}
                    style={[styles.subtaskTextInput, st.completed && styles.subtaskTextInputDone]}
                    returnKeyType="next"
                    onSubmitEditing={handleAddSubtask}
                  />
                  <TouchableOpacity
                    onPress={() => removeSubtask(st.id)}
                    style={styles.subtaskDeleteButton}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Trash2 size={14} color={theme.text.tertiary} />
                  </TouchableOpacity>
                </View>
              ))}

              {subtasks.length === 0 && (
                <TouchableOpacity style={styles.emptySubtaskPrompt} onPress={handleAddSubtask} activeOpacity={0.7}>
                  <Plus size={15} color={theme.text.tertiary} />
                  <Text style={styles.emptySubtaskPromptText}>Add subtasks to break down this work</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Attachments Section */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionTitleBarBetween}>
                <View style={styles.sectionTitleLeft}>
                  <Paperclip size={16} color={theme.text.tertiary} />
                  <Text style={styles.sectionTitleText}>Attachments</Text>
                  {attachments.length > 0 && (
                    <View style={styles.subtaskCountBadge}>
                      <Text style={styles.subtaskCountText}>{attachments.length}</Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity style={styles.addSubtaskAction} onPress={handlePickAttachments} activeOpacity={0.7}>
                  <Plus size={14} color={theme.accent.primary} strokeWidth={2.5} />
                  <Text style={styles.addSubtaskActionText}>Add file</Text>
                </TouchableOpacity>
              </View>

              {attachments.map((att, idx) => (
                <View key={idx} style={styles.attachmentCard}>
                  <View style={styles.attachmentIconBox}>
                    <Paperclip size={16} color={theme.accent.primary} />
                  </View>
                  <View style={styles.attachmentDetails}>
                    <Text style={styles.attachmentTitle} numberOfLines={1}>
                      {att.fileName}
                    </Text>
                    {att.size > 0 && (
                      <Text style={styles.attachmentSize}>{formatFileSize(att.size)}</Text>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={() => removeAttachment(idx)}
                    style={styles.attachmentRemoveBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <X size={15} color={theme.text.tertiary} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </ScrollView>

          {/* Quick Action Toolbar (Anchored Above Keyboard) */}
          <View style={styles.bottomToolbar}>
            <View style={styles.toolbarIconStrip}>
              {canAssign && (
                <TouchableOpacity
                  style={[styles.toolbarIconBtn, assignees.length > 0 && styles.toolbarIconBtnActive]}
                  onPress={() => setShowAssigneePicker(true)}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Users size={18} color={assignees.length > 0 ? theme.accent.primary : theme.text.secondary} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.toolbarIconBtn, !!dueDate && styles.toolbarIconBtnActive]}
                onPress={() => setShowDatePicker(true)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Calendar size={18} color={dueDate ? theme.accent.primary : theme.text.secondary} />
              </TouchableOpacity>
              {projectOptions.length > 0 && (
                <TouchableOpacity
                  style={[styles.toolbarIconBtn, !!projectId && styles.toolbarIconBtnActive]}
                  onPress={() => setShowProjectPicker(true)}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Folder size={18} color={projectId ? theme.accent.primary : theme.text.secondary} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.toolbarIconBtn}
                onPress={handleAddSubtask}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <ListTodo size={18} color={subtasks.length > 0 ? theme.accent.primary : theme.text.secondary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.toolbarIconBtn}
                onPress={handlePickAttachments}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Paperclip size={18} color={attachments.length > 0 ? theme.accent.primary : theme.text.secondary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.toolbarIconBtn}
                onPress={() => setShowPriorityPicker(true)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Flag size={18} color={priorityConfig.color} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.toolbarSubmitBtn, (!title.trim() || isSubmitting) && styles.headerSubmitDisabled]}
              onPress={handleSubmit}
              disabled={!title.trim() || isSubmitting}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.toolbarSubmitBtnText}>{isEditing ? "Save" : "Create Task"}</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>

      {/* Date Picker Modal */}
      <DateTimePickerModal
        isVisible={showDatePicker}
        mode="date"
        date={dueDate ? new Date(dueDate) : new Date()}
        onConfirm={(d) => {
          setDueDate(d.toISOString().split("T")[0]);
          setShowDatePicker(false);
        }}
        onCancel={() => setShowDatePicker(false)}
      />

      {/* Assignee Picker Sheet Modal */}
      <Modal visible={showAssigneePicker} transparent animationType="fade" onRequestClose={() => setShowAssigneePicker(false)}>
        <View style={styles.subModalBackdrop}>
          <View style={styles.pickerSheet}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Assign to</Text>
              <TouchableOpacity onPress={() => setShowAssigneePicker(false)}>
                <X size={20} color={theme.text.secondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.pickerSearchRow}>
              <Search size={16} color={theme.text.tertiary} />
              <TextInput
                value={assigneeSearch}
                onChangeText={setAssigneeSearch}
                placeholder="Search team members..."
                placeholderTextColor={theme.text.tertiary}
                style={styles.pickerSearchInput}
                autoFocus
              />
            </View>

            <ScrollView style={styles.pickerList} keyboardShouldPersistTaps="handled">
              {filteredEmployees.map((emp) => {
                const selected = assignees.includes(emp.name);
                return (
                  <TouchableOpacity
                    key={emp.id}
                    style={[styles.pickerItem, selected && styles.pickerItemSelected]}
                    onPress={() => toggleAssignee(emp.name)}
                  >
                    <EmployeeAvatar
                      name={emp.name}
                      avatarUrl={emp.avatarUrl}
                      size={34}
                    />
                    <Text style={[styles.pickerItemText, selected && styles.pickerItemTextSelected]}>
                      {emp.name}
                    </Text>
                    {selected && <Check size={16} color={theme.accent.primary} strokeWidth={2.5} />}
                  </TouchableOpacity>
                );
              })}

              {/* Custom Assignee Input */}
              <View style={styles.customAddBox}>
                <TextInput
                  value={customAssignee}
                  onChangeText={setCustomAssignee}
                  placeholder="Or type another name..."
                  placeholderTextColor={theme.text.tertiary}
                  style={styles.customAddInput}
                  onSubmitEditing={addCustomAssignee}
                />
                {customAssignee.trim().length > 0 && (
                  <TouchableOpacity style={styles.customAddBtn} onPress={addCustomAssignee}>
                    <Text style={styles.customAddBtnText}>Add</Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>

            <View style={styles.pickerFooter}>
              <TouchableOpacity
                style={styles.pickerDoneBtn}
                onPress={() => setShowAssigneePicker(false)}
              >
                <Text style={styles.pickerDoneBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Project Picker Sheet Modal */}
      <Modal visible={showProjectPicker} transparent animationType="fade" onRequestClose={() => setShowProjectPicker(false)}>
        <View style={styles.subModalBackdrop}>
          <View style={styles.pickerSheet}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select Project</Text>
              <TouchableOpacity onPress={() => setShowProjectPicker(false)}>
                <X size={20} color={theme.text.secondary} />
              </TouchableOpacity>
            </View>

            {projectOptions.length > 5 && (
              <View style={styles.pickerSearchRow}>
                <Search size={16} color={theme.text.tertiary} />
                <TextInput
                  value={projectSearch}
                  onChangeText={setProjectSearch}
                  placeholder="Search projects..."
                  placeholderTextColor={theme.text.tertiary}
                  style={styles.pickerSearchInput}
                />
              </View>
            )}

            <ScrollView style={styles.pickerList} keyboardShouldPersistTaps="handled">
              <TouchableOpacity
                style={[styles.pickerItem, !projectId && styles.pickerItemSelected]}
                onPress={() => {
                  setProjectId(undefined);
                  setShowProjectPicker(false);
                }}
              >
                <View style={styles.projectIconCircle}>
                  <Folder size={14} color={theme.text.secondary} />
                </View>
                <Text style={[styles.pickerItemText, !projectId && styles.pickerItemTextSelected]}>
                  No project (Inbox)
                </Text>
                {!projectId && <Check size={16} color={theme.accent.primary} strokeWidth={2.5} />}
              </TouchableOpacity>

              {filteredProjects.map((p) => {
                const selected = projectId === p.id;
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.pickerItem, selected && styles.pickerItemSelected]}
                    onPress={() => {
                      setProjectId(p.id);
                      setShowProjectPicker(false);
                    }}
                  >
                    <View style={[styles.projectIconCircle, { backgroundColor: theme.accent.primarySoft }]}>
                      <Folder size={14} color={theme.accent.primary} />
                    </View>
                    <Text style={[styles.pickerItemText, selected && styles.pickerItemTextSelected]}>
                      {p.name}
                    </Text>
                    {selected && <Check size={16} color={theme.accent.primary} strokeWidth={2.5} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Priority Picker Sheet Modal */}
      <Modal visible={showPriorityPicker} transparent animationType="fade" onRequestClose={() => setShowPriorityPicker(false)}>
        <View style={styles.subModalBackdrop}>
          <View style={[styles.pickerSheet, { maxHeight: 320 }]}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Task Priority</Text>
              <TouchableOpacity onPress={() => setShowPriorityPicker(false)}>
                <X size={20} color={theme.text.secondary} />
              </TouchableOpacity>
            </View>
            <View style={{ padding: 12 }}>
              {PRIORITIES.map((p) => {
                const selected = priority === p.key;
                return (
                  <TouchableOpacity
                    key={p.key}
                    style={[styles.pickerItem, selected && styles.pickerItemSelected]}
                    onPress={() => {
                      setPriority(p.key);
                      setShowPriorityPicker(false);
                    }}
                  >
                    <View style={[styles.priorityDot, { backgroundColor: p.color, width: 10, height: 10 }]} />
                    <Text style={[styles.pickerItemText, selected && { color: p.color, fontWeight: "600" }]}>
                      {p.label}
                    </Text>
                    {selected && <Check size={16} color={p.color} strokeWidth={2.5} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      {/* Status Picker Sheet Modal */}
      <Modal visible={showStatusPicker} transparent animationType="fade" onRequestClose={() => setShowStatusPicker(false)}>
        <View style={styles.subModalBackdrop}>
          <View style={[styles.pickerSheet, { maxHeight: 280 }]}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Task Status</Text>
              <TouchableOpacity onPress={() => setShowStatusPicker(false)}>
                <X size={20} color={theme.text.secondary} />
              </TouchableOpacity>
            </View>
            <View style={{ padding: 12 }}>
              {STATUSES.map((s) => {
                const selected = status === s.key;
                return (
                  <TouchableOpacity
                    key={s.key}
                    style={[styles.pickerItem, selected && styles.pickerItemSelected]}
                    onPress={() => {
                      setStatus(s.key);
                      setShowStatusPicker(false);
                    }}
                  >
                    <Text style={[styles.pickerItemText, selected && { color: s.color, fontWeight: "600" }]}>
                      {s.label}
                    </Text>
                    {selected && <Check size={16} color={s.color} strokeWidth={2.5} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

function makeStyles(theme: any) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(15, 23, 42, 0.55)",
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: theme.bg.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: "92%",
      minHeight: "75%",
      flex: 1,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 20,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 18,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.border.subtle,
    },
    headerContextRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      flex: 1,
      marginRight: 10,
    },
    headerProjectTouch: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    headerProjectName: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.text.secondary,
    },
    headerRightActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    headerSubmitBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: theme.accent.primary,
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 8,
    },
    headerSubmitDisabled: {
      opacity: 0.5,
    },
    headerSubmitText: {
      fontSize: 13,
      fontWeight: "600",
      color: "#FFFFFF",
    },
    closeBtn: {
      padding: 4,
    },
    body: {
      paddingHorizontal: 18,
      paddingTop: 16,
      paddingBottom: 36,
    },
    heroTitleContainer: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      marginBottom: 18,
    },
    completeCheckCircle: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: theme.border.default,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 4,
    },
    completeCheckCircleDone: {
      backgroundColor: theme.accent.success,
      borderColor: theme.accent.success,
    },
    heroTitleInput: {
      flex: 1,
      fontSize: 21,
      fontWeight: "600",
      color: theme.text.primary,
      lineHeight: 28,
      padding: 0,
    },
    heroTitleInputDone: {
      textDecorationLine: "line-through",
      color: theme.text.tertiary,
    },
    propertiesCard: {
      backgroundColor: theme.bg.surfaceRaised,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.border.subtle,
      paddingHorizontal: 14,
      paddingVertical: 6,
      marginBottom: 20,
    },
    propertyRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border.subtle,
      minHeight: 44,
    },
    propertyLabelWrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      width: 100,
    },
    propertyLabel: {
      fontSize: 13,
      fontWeight: "500",
      color: theme.text.secondary,
    },
    propertyValueButton: {
      flex: 1,
      flexDirection: "row",
      justifyContent: "flex-end",
      alignItems: "center",
    },
    unassignedPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
      backgroundColor: theme.bg.surface,
      borderWidth: 1,
      borderColor: theme.border.default,
      borderStyle: "dashed",
    },
    unassignedText: {
      fontSize: 12,
      color: theme.text.tertiary,
      fontWeight: "500",
    },
    assigneeListWrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      flexWrap: "wrap",
      justifyContent: "flex-end",
    },
    assigneeChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: theme.bg.surface,
      paddingVertical: 3,
      paddingHorizontal: 7,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.border.default,
    },
    avatarCircle: {
      width: 20,
      height: 20,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: {
      fontSize: 10,
      fontWeight: "700",
      color: "#FFFFFF",
    },
    assigneeChipText: {
      fontSize: 12,
      fontWeight: "500",
      color: theme.text.primary,
      maxWidth: 90,
    },
    moreAssigneesBadge: {
      backgroundColor: theme.bg.surfaceHover,
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 10,
    },
    moreAssigneesText: {
      fontSize: 11,
      fontWeight: "600",
      color: theme.text.secondary,
    },
    dueDatePill: {
      paddingHorizontal: 11,
      paddingVertical: 5,
      borderRadius: 8,
      backgroundColor: theme.bg.surface,
      borderWidth: 1,
      borderColor: theme.border.default,
    },
    dueDateEmpty: {
      borderStyle: "dashed",
    },
    dueDateToday: {
      backgroundColor: "#EFF6FF",
      borderColor: "#BFDBFE",
    },
    dueDateTomorrow: {
      backgroundColor: "#FEF3C7",
      borderColor: "#FDE68A",
    },
    dueDateText: {
      fontSize: 12,
      fontWeight: "500",
      color: theme.text.primary,
    },
    dueDateTodayText: {
      color: "#2563EB",
      fontWeight: "600",
    },
    dueDateTomorrowText: {
      color: "#D97706",
      fontWeight: "600",
    },
    quickDateRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 8,
      paddingLeft: 24,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border.subtle,
      flexWrap: "wrap",
    },
    quickDateChip: {
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 6,
      backgroundColor: theme.bg.surface,
      borderWidth: 1,
      borderColor: theme.border.default,
    },
    quickDateChipActive: {
      backgroundColor: theme.accent.primarySoft,
      borderColor: theme.accent.primary,
    },
    quickDateChipText: {
      fontSize: 11,
      color: theme.text.secondary,
      fontWeight: "500",
    },
    quickDateChipTextActive: {
      color: theme.accent.primary,
      fontWeight: "600",
    },
    quickDateChipClear: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    quickDateChipClearText: {
      fontSize: 11,
      color: theme.text.tertiary,
    },
    projectPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
      backgroundColor: theme.bg.surface,
      borderWidth: 1,
      borderColor: theme.border.default,
      maxWidth: 180,
    },
    projectPillText: {
      fontSize: 12,
      fontWeight: "500",
      color: theme.text.primary,
    },
    priorityPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    priorityDot: {
      width: 7,
      height: 7,
      borderRadius: 3.5,
    },
    priorityPillText: {
      fontSize: 12,
      fontWeight: "600",
    },
    statusPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    statusPillText: {
      fontSize: 12,
      fontWeight: "600",
    },
    locationInlineInput: {
      flex: 1,
      textAlign: "right",
      fontSize: 12,
      color: theme.text.primary,
      padding: 0,
    },
    sectionContainer: {
      marginBottom: 20,
    },
    sectionTitleBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      marginBottom: 8,
    },
    sectionTitleBarBetween: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    sectionTitleLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
    },
    sectionTitleText: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.text.secondary,
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    subtaskCountBadge: {
      backgroundColor: theme.bg.surfaceRaised,
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border.subtle,
    },
    subtaskCountText: {
      fontSize: 10,
      fontWeight: "700",
      color: theme.text.tertiary,
    },
    addSubtaskAction: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingVertical: 2,
    },
    addSubtaskActionText: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.accent.primary,
    },
    descriptionCanvas: {
      backgroundColor: theme.bg.surfaceRaised,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border.subtle,
      padding: 12,
      fontSize: 14,
      color: theme.text.primary,
      minHeight: 90,
      lineHeight: 20,
    },
    subtaskItemRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.bg.surfaceRaised,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border.subtle,
      paddingHorizontal: 12,
      paddingVertical: 6,
      marginBottom: 8,
      gap: 10,
    },
    subtaskCheckCircle: {
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 1.5,
      borderColor: theme.border.default,
      alignItems: "center",
      justifyContent: "center",
    },
    subtaskCheckCircleDone: {
      backgroundColor: theme.accent.success,
      borderColor: theme.accent.success,
    },
    subtaskTextInput: {
      flex: 1,
      fontSize: 13,
      color: theme.text.primary,
      paddingVertical: 4,
    },
    subtaskTextInputDone: {
      textDecorationLine: "line-through",
      color: theme.text.tertiary,
    },
    subtaskDeleteButton: {
      padding: 4,
    },
    emptySubtaskPrompt: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 10,
      backgroundColor: theme.bg.surfaceRaised,
      borderWidth: 1,
      borderColor: theme.border.default,
      borderStyle: "dashed",
    },
    emptySubtaskPromptText: {
      fontSize: 12,
      color: theme.text.tertiary,
      fontWeight: "500",
    },
    attachmentCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.bg.surfaceRaised,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border.subtle,
      padding: 10,
      marginBottom: 8,
      gap: 10,
    },
    attachmentIconBox: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: theme.accent.primarySoft,
      alignItems: "center",
      justifyContent: "center",
    },
    attachmentDetails: {
      flex: 1,
    },
    attachmentTitle: {
      fontSize: 13,
      fontWeight: "500",
      color: theme.text.primary,
    },
    attachmentSize: {
      fontSize: 11,
      color: theme.text.tertiary,
      marginTop: 2,
    },
    attachmentRemoveBtn: {
      padding: 6,
    },
    bottomToolbar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: theme.border.subtle,
      backgroundColor: theme.bg.surface,
    },
    toolbarIconStrip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    toolbarIconBtn: {
      padding: 8,
      borderRadius: 8,
      backgroundColor: theme.bg.surfaceRaised,
    },
    toolbarIconBtnActive: {
      backgroundColor: theme.accent.primarySoft,
    },
    toolbarSubmitBtn: {
      backgroundColor: theme.accent.primary,
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 10,
      shadowColor: theme.accent.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 3,
    },
    toolbarSubmitBtnText: {
      fontSize: 14,
      fontWeight: "600",
      color: "#FFFFFF",
    },
    subModalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(15, 23, 42, 0.45)",
      justifyContent: "center",
      paddingHorizontal: 20,
    },
    pickerSheet: {
      backgroundColor: theme.bg.surface,
      borderRadius: 16,
      maxHeight: 460,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 12,
      overflow: "hidden",
    },
    pickerHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.border.subtle,
    },
    pickerTitle: {
      fontSize: 15,
      fontWeight: "600",
      color: theme.text.primary,
    },
    pickerSearchRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.border.subtle,
      backgroundColor: theme.bg.surfaceRaised,
    },
    pickerSearchInput: {
      flex: 1,
      fontSize: 13,
      color: theme.text.primary,
      padding: 4,
    },
    pickerList: {
      maxHeight: 300,
      padding: 8,
    },
    pickerItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 8,
    },
    pickerItemSelected: {
      backgroundColor: theme.accent.primarySoft,
    },
    pickerItemText: {
      flex: 1,
      fontSize: 13,
      color: theme.text.primary,
    },
    pickerItemTextSelected: {
      fontWeight: "600",
      color: theme.accent.primary,
    },
    avatarCircleSmall: {
      width: 26,
      height: 26,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarTextSmall: {
      fontSize: 11,
      fontWeight: "700",
      color: "#FFFFFF",
    },
    projectIconCircle: {
      width: 26,
      height: 26,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.bg.surfaceRaised,
    },
    customAddBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.border.subtle,
    },
    customAddInput: {
      flex: 1,
      fontSize: 12,
      color: theme.text.primary,
      padding: 4,
    },
    customAddBtn: {
      backgroundColor: theme.accent.primary,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 6,
    },
    customAddBtnText: {
      fontSize: 11,
      fontWeight: "600",
      color: "#FFFFFF",
    },
    pickerFooter: {
      padding: 12,
      borderTopWidth: 1,
      borderTopColor: theme.border.subtle,
    },
    pickerDoneBtn: {
      backgroundColor: theme.accent.primary,
      paddingVertical: 10,
      borderRadius: 8,
      alignItems: "center",
    },
    pickerDoneBtnText: {
      fontSize: 13,
      fontWeight: "600",
      color: "#FFFFFF",
    },
  });
}
