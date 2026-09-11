import React, { useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Linking,
  Alert,
  Image,
} from "react-native";
import {
  X,
  Send,
  Trash2,
  ChevronDown,
  Plus,
  ExternalLink,
  CheckCircle2,
  RotateCcw,
  Edit,
  FileText,
  Maximize2,
  Folder,
} from "lucide-react-native";
import * as DocumentPicker from "expo-document-picker";
import { useTaskTheme, type TaskThemeValue } from "./theme";
import { Task, Project, TaskComment, TaskPriority, TaskStatus } from "./types";
import { TaskCapabilities } from "./capabilities";
import CompleteCheck from "./CompleteCheck";
import PriorityPill from "./PriorityPill";
import StatusPill from "./StatusPill";
import { formatDueLabel } from "./dateBuckets";
import { convertAssetToBase64, formatFileSize, isImageAttachment, TaskAttachmentPayload } from "./fileUtils";
import { toProxiedUrl } from "@/util/toProxiedUrl";
import TaskExpensesPanel from "@/components/cost-manager/TaskExpensesPanel";
import FollowUpControlCenter from "@/components/shared/FollowUpControlCenter";
import { TaskTimeline, TaskTimelineData } from "@/components/shared/TaskTimeLine";

type Tab = "overview" | "discussion" | "followups" | "expenses";

interface TaskDetailDrawerProps {
  visible: boolean;
  task: Task | null;
  projectName?: string;
  project?: Project | null;
  capabilities: TaskCapabilities;
  comments: TaskComment[];
  commentsLoading?: boolean;
  timeline?: TaskTimelineData;
  onClose: () => void;
  onToggleComplete: (task: Task) => void;
  onEditTask?: (task: Task) => void;
  onToggleSubtask?: (subtaskId: string, completed: boolean) => void;
  onChangeStatus?: (status: TaskStatus) => void;
  onChangePriority?: (priority: TaskPriority) => void;
  onPostComment: (message: string) => void;
  onAddAttachments?: (newFiles: TaskAttachmentPayload[]) => void;
  onDeleteAttachment?: (attachmentIndex: number) => void;
  onDelete?: () => void;
}

const STATUS_CYCLE: TaskStatus[] = ["pending", "in-progress", "completed"];
const PRIORITY_CYCLE: TaskPriority[] = ["low", "medium", "high"];

export default function TaskDetailDrawer({
  visible,
  task,
  projectName,
  project,
  capabilities,
  comments,
  commentsLoading,
  timeline,
  onClose,
  onToggleComplete,
  onEditTask,
  onToggleSubtask,
  onChangeStatus,
  onChangePriority,
  onPostComment,
  onAddAttachments,
  onDeleteAttachment,
  onDelete,
}: TaskDetailDrawerProps) {
  const theme = useTaskTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  const [tab, setTab] = useState<Tab>("overview");
  const [commentDraft, setCommentDraft] = useState("");
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);

  const availableTabs = useMemo(() => {
    const tabs: { key: Tab; label: string }[] = [
      { key: "overview", label: "Overview" },
      { key: "discussion", label: "Discussion" },
    ];
    if (capabilities.canManageFollowUps) tabs.push({ key: "followups", label: "Follow-Ups" });
    if (capabilities.canManageCost) tabs.push({ key: "expenses", label: "Expenses" });
    return tabs;
  }, [capabilities]);

  if (!task) return null;

  const completed = task.status === "completed";
  const dueLabel = formatDueLabel(task);
  const subtasks = task.subtasks || [];
  const attachments = task.attachments || (task.attachment ? [task.attachment] : []);

  const cycleStatus = () => {
    if (!onChangeStatus) return;
    const idx = STATUS_CYCLE.indexOf(task.status === "overdue" ? "pending" : task.status);
    onChangeStatus(STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length]);
  };
  const cyclePriority = () => {
    if (!onChangePriority) return;
    const idx = PRIORITY_CYCLE.indexOf(task.priority);
    onChangePriority(PRIORITY_CYCLE[(idx + 1) % PRIORITY_CYCLE.length]);
  };

  const handleSendComment = () => {
    const msg = commentDraft.trim();
    if (!msg) return;
    onPostComment(msg);
    setCommentDraft("");
  };

  const handlePickAndAddAttachment = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "*/*", multiple: true });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setIsUploadingFile(true);
        const converted = await Promise.all(result.assets.map((a) => convertAssetToBase64(a)));
        onAddAttachments?.(converted);
      }
    } catch (err) {
      console.log("[TaskDetailDrawer] attach file failed", err);
      Alert.alert("Attachment Error", "Failed to process the selected file(s).");
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleOpenAttachment = (url?: string) => {
    if (!url) return;
    const proxied = toProxiedUrl(url) || url;
    if (Platform.OS === "web") {
      window.open(proxied, "_blank");
    } else {
      Linking.openURL(proxied).catch(() => {
        Alert.alert("Cannot open file", "Unable to open this attachment link.");
      });
    }
  };

  const Chrome = (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.sheet, isWide ? styles.sheetWide : styles.sheetPhone]}
    >
      {/* Header */}
      <View style={styles.header}>
        <CompleteCheck completed={completed} onToggle={() => onToggleComplete(task)} size={24} />
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={2}>
            {task.title}
          </Text>
          {task.taskNumber != null && <Text style={styles.headerSub}>#{task.taskNumber}</Text>}
        </View>
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <X size={20} color={theme.text.secondary} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      {availableTabs.length > 2 && (
        <View style={styles.tabRow}>
          {availableTabs.map((t) => (
            <TouchableOpacity key={t.key} style={[styles.tab, tab === t.key && styles.tabActive]} onPress={() => setTab(t.key)}>
              <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} keyboardShouldPersistTaps="handled">
        {tab === "overview" && (
          <>
            {/* Action Buttons: Mark Complete & Edit */}
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  completed
                    ? { backgroundColor: "#f59e0b18", borderColor: "#f59e0b50" }
                    : { backgroundColor: "#10b98118", borderColor: "#10b98150" },
                ]}
                onPress={() => onToggleComplete(task)}
                activeOpacity={0.7}
              >
                {completed ? (
                  <>
                    <RotateCcw size={15} color="#f59e0b" />
                    <Text style={[styles.actionBtnText, { color: "#f59e0b" }]}>Mark Incomplete</Text>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={15} color="#10b981" />
                    <Text style={[styles.actionBtnText, { color: "#10b981" }]}>Mark as Complete</Text>
                  </>
                )}
              </TouchableOpacity>

              {onEditTask && (
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    { backgroundColor: theme.accent.primarySoft, borderColor: `${theme.accent.primary}40` },
                  ]}
                  onPress={() => {
                    onClose();
                    onEditTask(task);
                  }}
                  activeOpacity={0.7}
                >
                  <Edit size={14} color={theme.accent.primary} />
                  <Text style={[styles.actionBtnText, { color: theme.accent.primary }]}>Edit Task</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Properties */}
            <View style={styles.propertiesRow}>
              <TouchableOpacity
                style={styles.propertyPill}
                onPress={cycleStatus}
                disabled={!capabilities.canEditPriorityStatus}
              >
                <StatusPill status={task.status} size="md" />
                {capabilities.canEditPriorityStatus && <ChevronDown size={12} color={theme.text.tertiary} />}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.propertyPill}
                onPress={cyclePriority}
                disabled={!capabilities.canEditPriorityStatus}
              >
                <PriorityPill priority={task.priority} size="md" />
                {capabilities.canEditPriorityStatus && <ChevronDown size={12} color={theme.text.tertiary} />}
              </TouchableOpacity>
            </View>

            <View style={styles.metaGrid}>
              {dueLabel && <MetaField label="Due" value={dueLabel} />}
              {projectName && <MetaField label="Project" value={projectName} />}
              {task.location && <MetaField label="Location" value={task.location} />}
              {task.assignees?.length > 0 && <MetaField label="Assignees" value={task.assignees.join(", ")} />}
              {task.teamLead && <MetaField label="Team Lead" value={task.teamLead} />}
            </View>

            {!!task.description && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Description</Text>
                <Text style={styles.description}>{task.description}</Text>
              </View>
            )}

            {subtasks.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>
                  Subtasks · {subtasks.filter((s) => s.completed).length}/{subtasks.length}
                </Text>
                {subtasks.map((st) => (
                  <View key={st.id} style={styles.subtaskRow}>
                    <CompleteCheck
                      completed={st.completed}
                      onToggle={() => onToggleSubtask?.(st.id, !st.completed)}
                      size={18}
                    />
                    <Text style={[styles.subtaskText, st.completed && styles.subtaskTextDone]}>{st.title}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Task Attachments Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionLabel}>
                  Attachments {attachments.length > 0 ? `(${attachments.length})` : ""}
                </Text>
                {onAddAttachments && (
                  <TouchableOpacity
                    style={styles.addAttachmentMiniBtn}
                    onPress={handlePickAndAddAttachment}
                    disabled={isUploadingFile}
                  >
                    {isUploadingFile ? (
                      <ActivityIndicator size="small" color={theme.accent.primary} />
                    ) : (
                      <>
                        <Plus size={13} color={theme.accent.primary} />
                        <Text style={styles.addAttachmentMiniBtnText}>Add file</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>

              {attachments.length === 0 ? (
                <Text style={styles.noAttachmentsText}>No files attached to this task.</Text>
              ) : (
                attachments.map((f, i) => {
                  const isImg = isImageAttachment(f.fileName, f.mimeType);
                  const proxied = toProxiedUrl(f.url) || f.url;
                  return (
                    <View key={`${f.url}-${i}`} style={styles.attachmentCard}>
                      {isImg && proxied ? (
                        <TouchableOpacity
                          onPress={() => setPreviewImage({ url: proxied, name: f.fileName || "Attachment" })}
                          activeOpacity={0.8}
                          style={styles.attachmentThumbBox}
                        >
                          <Image source={{ uri: proxied }} style={styles.attachmentThumb} resizeMode="cover" />
                        </TouchableOpacity>
                      ) : (
                        <View style={[styles.attachmentThumbBox, { backgroundColor: theme.accent.primarySoft }]}>
                          <FileText size={18} color={theme.accent.primary} />
                        </View>
                      )}

                      <TouchableOpacity
                        style={{ flex: 1, paddingVertical: 4 }}
                        onPress={() => handleOpenAttachment(f.url)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.attachmentText} numberOfLines={1}>
                          {f.fileName || "Attachment"}
                        </Text>
                        <Text style={styles.attachmentMeta}>
                          {f.size > 0 ? formatFileSize(f.size) : isImg ? "Image" : "Document"}
                        </Text>
                      </TouchableOpacity>

                      <View style={styles.attachmentActions}>
                        {isImg && proxied && (
                          <TouchableOpacity
                            style={styles.iconBtn}
                            onPress={() => setPreviewImage({ url: proxied, name: f.fileName || "Attachment" })}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Maximize2 size={15} color={theme.text.tertiary} />
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={styles.iconBtn}
                          onPress={() => handleOpenAttachment(f.url)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <ExternalLink size={15} color={theme.text.tertiary} />
                        </TouchableOpacity>
                        {onDeleteAttachment && (
                          <TouchableOpacity
                            style={[styles.iconBtn, styles.deleteIconBtn]}
                            onPress={() => {
                              Alert.alert("Remove Attachment?", "Are you sure you want to remove this file from the task?", [
                                { text: "Cancel", style: "cancel" },
                                {
                                  text: "Delete",
                                  style: "destructive",
                                  onPress: () => onDeleteAttachment(i),
                                },
                              ]);
                            }}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Trash2 size={15} color={theme.accent.danger} />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })
              )}
            </View>

            {/* Project Shared Assets (Project Under Task) */}
            {project && Array.isArray(project.attachments) && project.attachments.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Folder size={14} color={theme.accent.primary} />
                    <Text style={styles.sectionLabel}>
                      Project Shared Assets ({project.attachments.length})
                    </Text>
                  </View>
                  <View style={[styles.projectTag, { backgroundColor: theme.accent.primarySoft }]}>
                    <Text style={[styles.projectTagText, { color: theme.accent.primary }]} numberOfLines={1}>
                      {project.name}
                    </Text>
                  </View>
                </View>
                <Text style={styles.sharedAssetsHint}>Files shared from parent project.</Text>
                {project.attachments.map((pf, pIdx) => {
                  const isImg = isImageAttachment(pf.fileName, pf.mimeType);
                  const proxied = toProxiedUrl(pf.url) || pf.url;
                  return (
                    <TouchableOpacity
                      key={`proj-att-${pIdx}`}
                      style={[styles.attachmentCard, styles.projectAttachmentCard]}
                      onPress={() => handleOpenAttachment(pf.url)}
                      activeOpacity={0.7}
                    >
                      {isImg && proxied ? (
                        <Image source={{ uri: proxied }} style={styles.attachmentThumb} resizeMode="cover" />
                      ) : (
                        <View style={[styles.attachmentThumbBox, { backgroundColor: theme.bg.inset }]}>
                          <FileText size={18} color={theme.text.secondary} />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.attachmentText} numberOfLines={1}>
                          {pf.fileName || "Project File"}
                        </Text>
                        <Text style={styles.attachmentMeta}>
                          {pf.size > 0 ? formatFileSize(pf.size) : isImg ? "Project Image" : "Project Doc"} · Shared
                        </Text>
                      </View>
                      <ExternalLink size={14} color={theme.text.tertiary} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {timeline && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Activity</Text>
                <TaskTimeline task={timeline} />
              </View>
            )}

            {capabilities.canDeleteTask && onDelete && (
              <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
                <Trash2 size={15} color={theme.accent.danger} />
                <Text style={styles.deleteBtnText}>Delete Task</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {tab === "discussion" && (
          <View style={styles.section}>
            {commentsLoading ? (
              <ActivityIndicator color={theme.accent.primary} style={{ marginTop: 20 }} />
            ) : comments.length === 0 ? (
              <Text style={styles.emptyComments}>No comments yet. Start the discussion below.</Text>
            ) : (
              comments.map((c) => (
                <View key={c.id} style={styles.commentRow}>
                  <View style={styles.commentAvatar}>
                    <Text style={styles.commentAvatarText}>{c.authorUsername?.[0]?.toUpperCase() || "?"}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.commentHeaderRow}>
                      <Text style={styles.commentAuthor}>{c.authorUsername}</Text>
                      <Text style={styles.commentTime}>{new Date(c.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</Text>
                    </View>
                    <Text style={styles.commentMessage}>{c.message}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {tab === "followups" && capabilities.canManageFollowUps && (
          <FollowUpControlCenter taskId={task.id} isManager={capabilities.role === "manager"} isAdmin={capabilities.role === "admin" || capabilities.role === "super-admin"} />
        )}

        {tab === "expenses" && capabilities.canManageCost && <TaskExpensesPanel taskId={task.id} />}
      </ScrollView>

      {tab === "discussion" && (
        <View style={styles.composer}>
          <TextInput
            value={commentDraft}
            onChangeText={setCommentDraft}
            placeholder="Add a comment…"
            placeholderTextColor={theme.text.tertiary}
            style={styles.composerInput}
            multiline
          />
          <TouchableOpacity style={styles.sendBtn} onPress={handleSendComment} disabled={!commentDraft.trim()}>
            <Send size={16} color={commentDraft.trim() ? "#fff" : theme.text.tertiary} />
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );

  return (
    <>
      <Modal visible={visible} transparent animationType={isWide ? "fade" : "slide"} onRequestClose={onClose}>
        <View style={[styles.backdrop, isWide && styles.backdropWide]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
          {Chrome}
        </View>
      </Modal>

      {/* Full Image Preview Modal */}
      {previewImage && (
        <Modal visible={true} transparent animationType="fade" onRequestClose={() => setPreviewImage(null)}>
          <View style={styles.previewBackdrop}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle} numberOfLines={1}>
                {previewImage.name}
              </Text>
              <TouchableOpacity
                onPress={() => setPreviewImage(null)}
                style={styles.previewCloseBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={22} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={styles.previewBody}>
              <Image source={{ uri: previewImage.url }} style={styles.fullPreviewImage} resizeMode="contain" />
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

function MetaField({ label, value }: { label: string; value: string }) {
  const theme = useTaskTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View style={styles.metaField}>
      <Text style={styles.metaFieldLabel}>{label}</Text>
      <Text style={styles.metaFieldValue}>{value}</Text>
    </View>
  );
}

// Colours depend on the active theme, so styles are built per-theme rather than
// frozen at module load. Layout values are identical to before.
function makeStyles(theme: TaskThemeValue) {
  return StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  backdropWide: { justifyContent: "flex-end", flexDirection: "row" },
  sheet: {
    backgroundColor: theme.bg.canvas,
    borderColor: theme.border.default,
  },
  sheetPhone: {
    width: "100%",
    maxHeight: "92%",
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
  sheetWide: {
    width: 440,
    height: "100%",
    borderLeftWidth: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.border.subtle,
  },
  headerCenter: { flex: 1, paddingTop: 2 },
  headerTitle: { fontSize: 17, fontWeight: "700", color: theme.text.primary, lineHeight: 22 },
  headerSub: { fontSize: 12, color: theme.text.tertiary, marginTop: 2 },
  actionButtonsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: theme.spacing.lg,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
  tabRow: { flexDirection: "row", paddingHorizontal: theme.spacing.lg, gap: 4, paddingTop: 10 },
  tab: { paddingHorizontal: 4, paddingVertical: 8, marginRight: 14, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabActive: { borderBottomColor: theme.accent.primary },
  tabText: { fontSize: 13, fontWeight: "600", color: theme.text.tertiary },
  tabTextActive: { color: theme.text.primary },
  body: { flex: 1 },
  bodyContent: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  propertiesRow: { flexDirection: "row", gap: 10, marginBottom: theme.spacing.lg },
  propertyPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: theme.bg.surface,
    borderWidth: 1,
    borderColor: theme.border.default,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  metaGrid: { gap: 10, marginBottom: theme.spacing.lg },
  metaField: { flexDirection: "row", justifyContent: "space-between" },
  metaFieldLabel: { fontSize: 12.5, color: theme.text.tertiary, fontWeight: "600" },
  metaFieldValue: { fontSize: 12.5, color: theme.text.secondary, fontWeight: "500", flexShrink: 1, textAlign: "right" },
  section: { marginBottom: theme.spacing.lg },
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  sectionLabel: { fontSize: 12, fontWeight: "700", color: theme.text.tertiary, textTransform: "uppercase", letterSpacing: 0.4 },
  projectTag: { paddingHorizontal: 8, paddingVertical: 2.5, borderRadius: theme.radius.pill, maxWidth: 160 },
  projectTagText: { fontSize: 11, fontWeight: "600" },
  sharedAssetsHint: { fontSize: 12, color: theme.text.tertiary, marginBottom: 8 },
  projectAttachmentCard: { borderColor: `${theme.accent.primary}30`, backgroundColor: `${theme.accent.primary}08` },
  addAttachmentMiniBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: theme.radius.sm, backgroundColor: theme.accent.primarySoft },
  addAttachmentMiniBtnText: { fontSize: 11.5, fontWeight: "600", color: theme.accent.primary },
  noAttachmentsText: { fontSize: 13, color: theme.text.tertiary, fontStyle: "italic", paddingVertical: 4 },
  description: { fontSize: 14, color: theme.text.secondary, lineHeight: 20 },
  subtaskRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 },
  subtaskText: { fontSize: 13.5, color: theme.text.primary, flex: 1 },
  subtaskTextDone: { color: theme.text.tertiary, textDecorationLine: "line-through" },
  attachmentCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: theme.bg.surface,
    borderWidth: 1,
    borderColor: theme.border.default,
    borderRadius: theme.radius.sm,
    marginBottom: 6,
  },
  attachmentThumbBox: {
    width: 38,
    height: 38,
    borderRadius: 6,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  attachmentThumb: {
    width: 38,
    height: 38,
  },
  attachmentText: { fontSize: 13, color: theme.text.primary, fontWeight: "600" },
  attachmentMeta: { fontSize: 11, color: theme.text.tertiary, marginTop: 1 },
  attachmentActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  iconBtn: {
    padding: 6,
    borderRadius: 6,
  },
  deleteIconBtn: {
    backgroundColor: theme.accent.dangerSoft,
  },
  attachmentRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6 },
  deleteBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, marginTop: theme.spacing.md, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.accent.dangerSoft, backgroundColor: theme.accent.dangerSoft },
  deleteBtnText: { color: theme.accent.danger, fontWeight: "700", fontSize: 13.5 },
  emptyComments: { fontSize: 13, color: theme.text.tertiary, textAlign: "center", paddingVertical: 24 },
  commentRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  commentAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: theme.bg.surfaceRaised, alignItems: "center", justifyContent: "center" },
  commentAvatarText: { fontSize: 12, fontWeight: "700", color: theme.text.secondary },
  commentHeaderRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  commentAuthor: { fontSize: 13, fontWeight: "700", color: theme.text.primary },
  commentTime: { fontSize: 11, color: theme.text.tertiary },
  commentMessage: { fontSize: 13.5, color: theme.text.secondary, marginTop: 2, lineHeight: 18 },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    padding: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.border.subtle,
  },
  composerInput: {
    flex: 1,
    backgroundColor: theme.bg.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.border.default,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: theme.text.primary,
    fontSize: 13.5,
    maxHeight: 100,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.accent.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  previewBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "space-between",
  },
  previewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 54 : 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.15)",
  },
  previewTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
    marginRight: 16,
  },
  previewCloseBtn: {
    padding: 4,
  },
  previewBody: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  fullPreviewImage: {
    width: "100%",
    height: "100%",
  },
  });
}

