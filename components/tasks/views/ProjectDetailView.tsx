import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  Linking,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import {
  ChevronLeft,
  Layers,
  Paperclip,
  Plus,
  Trash2,
  Edit,
  ExternalLink,
  FileText,
  Maximize2,
  X,
} from "lucide-react-native";
import * as DocumentPicker from "expo-document-picker";
import { useTaskTheme } from "../theme";
import { Project, Task } from "../types";
import ProjectProgressBar from "../ProjectProgressBar";
import TaskRow from "../TaskRow";
import EmptyState from "../EmptyState";
import QuickAddBar, { QuickAddValue } from "../QuickAddBar";
import { MobileCostManager } from "@/components/cost-manager/MobileCostManager";
import Pagination from "@/components/ui/Pagination";
import { toProxiedUrl } from "@/util/toProxiedUrl";
import { convertAssetToBase64, formatFileSize, isImageAttachment } from "../fileUtils";

const PAGE_SIZE = 25;
type Tab = "tasks" | "cost";

interface ProjectDetailViewProps {
  project: Project;
  tasks: Task[];
  onBack: () => void;
  onOpenTask: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  onQuickAdd: (value: QuickAddValue) => void;
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (task: Task) => void;
  onUpdateProject?: (payload: Partial<Project>) => void;
  onDeleteProject?: () => void;
  onAddProjectAttachments?: (newFiles: any[]) => void;
  onDeleteProjectAttachment?: (attachmentIndex: number) => void;
  canManageCost?: boolean;
  canCreate?: boolean;
}

function projectIdOf(task: Task): string | undefined {
  return typeof task.projectId === "string" ? task.projectId : task.projectId?._id || task.projectId?.id;
}

export default function ProjectDetailView({
  project,
  tasks,
  onBack,
  onOpenTask,
  onToggleComplete,
  onQuickAdd,
  onEditTask,
  onDeleteTask,
  onUpdateProject,
  onDeleteProject,
  onAddProjectAttachments,
  onDeleteProjectAttachment,
  canManageCost,
  canCreate,
}: ProjectDetailViewProps) {
  const theme = useTaskTheme();
  const [tab, setTab] = useState<Tab>("tasks");
  const projectTasks = useMemo(() => tasks.filter((t) => projectIdOf(t) === project.id), [tasks, project.id]);
  const completed = projectTasks.filter((t) => t.status === "completed").length;
  const rawLogo = project.logo?.url || project.logoUrl;
  const logoUrl = rawLogo ? (toProxiedUrl(rawLogo) || rawLogo) : null;

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState(project.name || "");
  const [editDesc, setEditDesc] = useState(project.description || "");
  const [isAddingAttachment, setIsAddingAttachment] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);

  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(projectTasks.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);

  useEffect(() => {
    setPage(1);
  }, [projectTasks.length]);

  const pagedTasks = useMemo(
    () => projectTasks.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [projectTasks, safePage]
  );

  const attachments = project.attachments || [];

  const handlePickAndAddProjectAttachment = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "*/*", multiple: true });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setIsAddingAttachment(true);
        const converted = await Promise.all(result.assets.map((a) => convertAssetToBase64(a)));
        onAddProjectAttachments?.(converted);
      }
    } catch (_err) {
      Alert.alert("Attachment Error", "Failed to process selected file(s).");
    } finally {
      setIsAddingAttachment(false);
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

  const handleSaveProjectEdit = () => {
    if (!editName.trim()) {
      Alert.alert("Name Required", "Please enter a project name.");
      return;
    }
    onUpdateProject?.({
      name: editName.trim(),
      description: editDesc.trim(),
    });
    setIsEditModalOpen(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg.canvas }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border.subtle }]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ChevronLeft size={22} color={theme.text.primary} />
        </TouchableOpacity>
        {logoUrl ? (
          <Image source={{ uri: logoUrl }} style={styles.logo} />
        ) : (
          <View style={[styles.logoFallback, { backgroundColor: theme.accent.primarySoft }]}>
            <Layers size={18} color={theme.accent.primary} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: theme.text.primary }]} numberOfLines={1}>
            {project.name}
          </Text>
          {!!project.description && (
            <Text style={[styles.description, { color: theme.text.secondary }]} numberOfLines={1}>
              {project.description}
            </Text>
          )}
        </View>

        {/* Project Action Buttons: Edit & Delete */}
        <View style={styles.headerActions}>
          {onUpdateProject && (
            <TouchableOpacity
              style={[styles.headerActionBtn, { backgroundColor: theme.accent.primarySoft }]}
              onPress={() => {
                setEditName(project.name || "");
                setEditDesc(project.description || "");
                setIsEditModalOpen(true);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Edit size={14} color={theme.accent.primary} />
            </TouchableOpacity>
          )}
          {onDeleteProject && (
            <TouchableOpacity
              style={[styles.headerActionBtn, { backgroundColor: theme.accent.dangerSoft }]}
              onPress={onDeleteProject}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Trash2 size={14} color={theme.accent.danger} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Progress */}
      <View style={styles.progressWrap}>
        <ProjectProgressBar completed={completed} total={projectTasks.length} />
      </View>

      {/* Tabs */}
      {canManageCost && (
        <View style={[styles.tabRow, { borderBottomColor: theme.border.subtle }]}>
          <TouchableOpacity
            style={[styles.tab, tab === "tasks" && { borderBottomColor: theme.accent.primary }]}
            onPress={() => setTab("tasks")}
          >
            <Text style={[styles.tabText, { color: tab === "tasks" ? theme.accent.primary : theme.text.secondary }]}>
              Tasks
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === "cost" && { borderBottomColor: theme.accent.primary }]}
            onPress={() => setTab("cost")}
          >
            <Text style={[styles.tabText, { color: tab === "cost" ? theme.accent.primary : theme.text.secondary }]}>
              Cost Sheet
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {tab === "tasks" ? (
        <ScrollView contentContainerStyle={styles.listContent}>
          {/* Project Attachments Section */}
          <View style={[styles.attachmentsContainer, { backgroundColor: theme.bg.surface, borderColor: theme.border.subtle }]}>
            <View style={styles.attachmentsHeaderRow}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Paperclip size={14} color={theme.accent.primary} />
                <Text style={[styles.attachmentsSectionTitle, { color: theme.text.primary }]}>
                  Project Attachments {attachments.length > 0 ? `(${attachments.length})` : ""}
                </Text>
              </View>
              {onAddProjectAttachments && (
                <TouchableOpacity
                  style={[styles.addAttachmentBtn, { backgroundColor: theme.accent.primarySoft }]}
                  onPress={handlePickAndAddProjectAttachment}
                  disabled={isAddingAttachment}
                >
                  {isAddingAttachment ? (
                    <ActivityIndicator size="small" color={theme.accent.primary} />
                  ) : (
                    <>
                      <Plus size={12} color={theme.accent.primary} />
                      <Text style={[styles.addAttachmentBtnText, { color: theme.accent.primary }]}>Add File</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {attachments.length === 0 ? (
              <Text style={[styles.emptyAttachmentsText, { color: theme.text.tertiary }]}>
                No files attached to this project. Add files above to share with task assignees.
              </Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.attachmentsHorizontalList}>
                {attachments.map((f, idx) => {
                  const isImg = isImageAttachment(f.fileName, f.mimeType);
                  const proxied = toProxiedUrl(f.url) || f.url;
                  return (
                    <View
                      key={`proj-att-${idx}`}
                      style={[styles.attachmentCard, { backgroundColor: theme.bg.canvas, borderColor: theme.border.default }]}
                    >
                      {isImg && proxied ? (
                        <TouchableOpacity
                          onPress={() => setPreviewImage({ url: proxied, name: f.fileName || "Project File" })}
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
                        style={{ flex: 1, paddingVertical: 2 }}
                        onPress={() => handleOpenAttachment(f.url)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.attachmentText, { color: theme.text.primary }]} numberOfLines={1}>
                          {f.fileName || "File"}
                        </Text>
                        <Text style={[styles.attachmentMeta, { color: theme.text.tertiary }]}>
                          {f.size > 0 ? formatFileSize(f.size) : isImg ? "Image" : "Document"}
                        </Text>
                      </TouchableOpacity>
                      <View style={styles.attachmentActions}>
                        {isImg && proxied && (
                          <TouchableOpacity
                            style={styles.actionIconBtn}
                            onPress={() => setPreviewImage({ url: proxied, name: f.fileName || "Project File" })}
                          >
                            <Maximize2 size={13} color={theme.text.tertiary} />
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity style={styles.actionIconBtn} onPress={() => handleOpenAttachment(f.url)}>
                          <ExternalLink size={13} color={theme.text.tertiary} />
                        </TouchableOpacity>
                        {onDeleteProjectAttachment && (
                          <TouchableOpacity
                            style={[styles.actionIconBtn, { backgroundColor: theme.accent.dangerSoft }]}
                            onPress={() => {
                              Alert.alert("Delete Attachment?", "Are you sure you want to remove this file from the project?", [
                                { text: "Cancel", style: "cancel" },
                                {
                                  text: "Delete",
                                  style: "destructive",
                                  onPress: () => onDeleteProjectAttachment(idx),
                                },
                              ]);
                            }}
                          >
                            <Trash2 size={13} color={theme.accent.danger} />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>

          {canCreate && (
            <View style={styles.quickAddWrap}>
              <QuickAddBar placeholder="Add a task to this project…" onSubmit={(v) => onQuickAdd({ ...v, projectId: project.id })} />
            </View>
          )}
          {projectTasks.length === 0 ? (
            <EmptyState title="No tasks in this project yet" description="Add the first task above to get moving." />
          ) : (
            <>
              {pagedTasks.map((t) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  onPress={() => onOpenTask(t)}
                  onToggleComplete={() => onToggleComplete(t)}
                  onEdit={onEditTask ? () => onEditTask(t) : undefined}
                  onDelete={onDeleteTask ? () => onDeleteTask(t) : undefined}
                  showProject={false}
                />
              ))}
              <Pagination
                page={safePage}
                pageCount={pageCount}
                onPageChange={setPage}
                totalItems={projectTasks.length}
                pageSize={PAGE_SIZE}
                style={{ marginTop: 16 }}
              />
            </>
          )}
        </ScrollView>
      ) : (
        <MobileCostManager projectId={project.id} projectName={project.name} tasks={projectTasks as any} />
      )}

      {/* Edit Project Modal */}
      {isEditModalOpen && (
        <Modal visible={true} transparent animationType="slide" onRequestClose={() => setIsEditModalOpen(false)}>
          <View style={styles.modalBackdrop}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={[styles.modalSheet, { backgroundColor: theme.bg.canvas, borderColor: theme.border.default }]}>
              <View style={[styles.modalHeader, { borderBottomColor: theme.border.subtle }]}>
                <Text style={[styles.modalTitle, { color: theme.text.primary }]}>Edit Project</Text>
                <TouchableOpacity onPress={() => setIsEditModalOpen(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <X size={18} color={theme.text.secondary} />
                </TouchableOpacity>
              </View>
              <View style={styles.modalBody}>
                <Text style={[styles.fieldLabel, { color: theme.text.secondary }]}>Project Name</Text>
                <TextInput
                  value={editName}
                  onChangeText={setEditName}
                  style={[styles.modalInput, { backgroundColor: theme.bg.surface, borderColor: theme.border.default, color: theme.text.primary }]}
                  placeholder="Project name"
                  placeholderTextColor={theme.text.tertiary}
                />
                <Text style={[styles.fieldLabel, { color: theme.text.secondary }]}>Description</Text>
                <TextInput
                  value={editDesc}
                  onChangeText={setEditDesc}
                  style={[styles.modalInput, styles.modalTextArea, { backgroundColor: theme.bg.surface, borderColor: theme.border.default, color: theme.text.primary }]}
                  placeholder="Description (optional)"
                  placeholderTextColor={theme.text.tertiary}
                  multiline
                />
              </View>
              <View style={[styles.modalFooter, { borderTopColor: theme.border.subtle }]}>
                <TouchableOpacity style={[styles.cancelBtn, { borderColor: theme.border.default }]} onPress={() => setIsEditModalOpen(false)}>
                  <Text style={[styles.cancelBtnText, { color: theme.text.secondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.accent.primary }]} onPress={handleSaveProjectEdit}>
                  <Text style={styles.saveBtnText}>Save Changes</Text>
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <Modal visible={true} transparent animationType="fade" onRequestClose={() => setPreviewImage(null)}>
          <View style={styles.previewBackdrop}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle} numberOfLines={1}>
                {previewImage.name}
              </Text>
              <TouchableOpacity onPress={() => setPreviewImage(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <X size={22} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={styles.previewBody}>
              <Image source={{ uri: previewImage.url }} style={styles.fullPreviewImage} resizeMode="contain" />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  logo: { width: 36, height: 36, borderRadius: 10 },
  logoFallback: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 16, fontWeight: "700", letterSpacing: -0.2 },
  description: { fontSize: 12, marginTop: 1 },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerActionBtn: {
    padding: 7,
    borderRadius: 8,
  },
  progressWrap: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 },
  tabRow: { flexDirection: "row", paddingHorizontal: 16, gap: 8, borderBottomWidth: 1 },
  tab: { paddingVertical: 10, marginRight: 16, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabText: { fontSize: 13, fontWeight: "700" },
  listContent: { paddingBottom: 40 },
  quickAddWrap: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 },
  attachmentsContainer: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  attachmentsHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  attachmentsSectionTitle: {
    fontSize: 12.5,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  addAttachmentBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  addAttachmentBtnText: {
    fontSize: 11,
    fontWeight: "700",
  },
  emptyAttachmentsText: {
    fontSize: 12,
    fontStyle: "italic",
    paddingVertical: 4,
  },
  attachmentsHorizontalList: {
    marginTop: 4,
  },
  attachmentCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    width: 220,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
  },
  attachmentThumbBox: {
    width: 34,
    height: 34,
    borderRadius: 6,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  attachmentThumb: {
    width: 34,
    height: 34,
  },
  attachmentText: {
    fontSize: 12,
    fontWeight: "600",
  },
  attachmentMeta: {
    fontSize: 10.5,
    marginTop: 1,
  },
  attachmentActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  actionIconBtn: {
    padding: 5,
    borderRadius: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  modalBody: {
    padding: 16,
    gap: 8,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    marginBottom: 8,
  },
  modalTextArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
  saveBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
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
