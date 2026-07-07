import React, { useEffect, useMemo, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Image,
  Dimensions,
  Linking,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import {
  AlertCircle,
  User,
  Image as ImageIcon,
  Link as LinkIcon,
  FileText,
  ExternalLink,
  Database,
  CheckSquare,
  Eye,
  X,
  Download,
  ChevronDown,
} from "lucide-react-native";
import { apiFetch, toProxiedUrl } from "@/lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type AsanaWorkspace = { _id: string; asanaId: string; name: string };
type AsanaProject = { _id: string; asanaId: string; workspaceAsanaId: string; name: string; createdAtAsana?: string; tasksCount?: number };
type AsanaTask = { _id: string; asanaId: string; projectAsanaId: string; parentAsanaId: string; title: string; description: string; dueDate?: string; completed: boolean };
type AsanaComment = { _id: string; asanaId: string; taskAsanaId: string; authorAsanaId: string; authorName?: string; authorEmail?: string; message: string; createdAtAsana?: string };
type AsanaAttachment = { _id: string; asanaId: string; taskAsanaId: string; fileName: string; filePath: string; mimeType?: string; size?: number };
type AsanaUser = { _id: string; asanaId: string; name: string; email: string };

function isImageMime(mime: string) {
  return !!mime && mime.startsWith("image/");
}

function isLinkAttachment(att: AsanaAttachment) {
  const path = att.filePath || "";
  return path.startsWith("http://") || path.startsWith("https://");
}

function formatDate(d?: string) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString() + " " + new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return d;
  }
}

function getFullUrl(path?: string) {
  if (!path) return "";
  return toProxiedUrl(path) || path;
}

interface MobileSelectProps {
  label: string;
  placeholder: string;
  value: string;
  items: { label: string; value: string }[];
  onValueChange: (val: string) => void;
  disabled?: boolean;
  colors: any;
  styles: any;
}

function MobileSelect({
  label,
  placeholder,
  value,
  items,
  onValueChange,
  disabled,
  colors,
  styles,
}: MobileSelectProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const selectedItem = items.find((i) => i.value === value);

  return (
    <View style={styles.selectWrapper}>
      <Text style={styles.selectLabel}>{label}</Text>
      <TouchableOpacity
        style={[styles.selectTrigger, disabled && styles.disabledElement]}
        disabled={disabled}
        onPress={() => setModalOpen(true)}
      >
        <Text style={[styles.selectTriggerText, !selectedItem && { color: colors.black }]} numberOfLines={1}>
          {selectedItem ? selectedItem.label : placeholder}
        </Text>
        <ChevronDown size={16} color={colors.mutedText} />
      </TouchableOpacity>

      <Modal visible={modalOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.pickerModalCard}>
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>Select {label}</Text>
              <TouchableOpacity onPress={() => setModalOpen(false)}>
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
              {items.map((item) => (
                <TouchableOpacity
                  key={item.value}
                  style={[styles.pickerItemRow, item.value === value && styles.pickerItemRowActive]}
                  onPress={() => {
                    onValueChange(item.value);
                    setModalOpen(false);
                  }}
                >
                  <Text style={[styles.pickerItemText, item.value === value && styles.pickerItemTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
              {items.length === 0 && (
                <Text style={styles.emptyListText}>No options available</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default function AsanaData() {
  const { uiTheme } = useTheme();
  const isDark = (uiTheme.theme as string) === "dark" || (uiTheme.theme as string) === "metallic-elite";

  const colors = useMemo(() => ({
    background: uiTheme.panelColors?.dashboardBackground || (isDark ? "#0f172a" : "#f8fafc"),
    cardBg: uiTheme.panelColors?.dashboardCardBackground || (isDark ? "#1e293b" : "#ffffff"),
    text: uiTheme.panelColors?.dashboardTextColor || (isDark ? "#f8fafc" : "#0f172a"),
    mutedText: isDark ? "#94a3b8" : "#64748b",
    border: isDark ? "#334155" : "#e2e8f0",
    inputBg: isDark ? "#0f172a" : "#ffffff",
    inputText: isDark ? "#f8fafc" : "#0f172a",
    primary: uiTheme.customColors?.primary || "#4f46e5",
    successText: isDark ? "#34d399" : "#065f46",
    successBg: isDark ? "rgba(16, 185, 129, 0.15)" : "#ecfdf5",
    successBorder: isDark ? "rgba(16, 185, 129, 0.3)" : "#d1fae5",
    errorText: isDark ? "#f87171" : "#991b1b",
    errorBg: isDark ? "rgba(239, 64, 64, 0.15)" : "#fef2f2",
    errorBorder: isDark ? "rgba(239, 64, 64, 0.3)" : "#fee2e2",
    cardMuted: isDark ? "#111827" : "#fafafa",
    badgeSuccessBg: isDark ? "rgba(16, 185, 129, 0.2)" : "#d1fae5",
    badgeSuccessText: isDark ? "#34d399" : "#065f46",
    badgeProgressBg: isDark ? "rgba(245, 158, 11, 0.2)" : "#fef3c7",
    badgeProgressText: isDark ? "#fbbf24" : "#92400e",
    destructive: "#ef4444",
  }), [uiTheme, isDark]);

  const styles = useMemo(() => createStyles(colors), [colors]);

  const [authToken, setAuthToken] = useState<string | null>(null);
  const [workspaces, setWorkspaces] = useState<AsanaWorkspace[]>([]);
  const [workspaceAsanaId, setWorkspaceAsanaId] = useState<string>("");
  const [projects, setProjects] = useState<AsanaProject[]>([]);
  const [projectAsanaId, setProjectAsanaId] = useState<string>("");
  const [tasks, setTasks] = useState<AsanaTask[]>([]);
  const [selectedTaskAsanaId, setSelectedTaskAsanaId] = useState<string>("");
  const [taskDetails, setTaskDetails] = useState<{ task: AsanaTask; subtasks: AsanaTask[] } | null>(null);
  const [comments, setComments] = useState<AsanaComment[]>([]);
  const [attachments, setAttachments] = useState<AsanaAttachment[]>([]);
  const [users, setUsers] = useState<AsanaUser[]>([]);

  const [loading, setLoading] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transferSuccess, setTransferSuccess] = useState<string | null>(null);

  const selectedWorkspace = useMemo(() => workspaces.find((w) => w.asanaId === workspaceAsanaId) || null, [workspaces, workspaceAsanaId]);
  const selectedProject = useMemo(() => projects.find((p) => p.asanaId === projectAsanaId) || null, [projects, projectAsanaId]);
  const selectedTask = useMemo(() => tasks.find((t) => t.asanaId === selectedTaskAsanaId) || null, [tasks, selectedTaskAsanaId]);

  const userMap = useMemo(() => {
    const map = new Map<string, AsanaUser>();
    users.forEach((u) => map.set(u.asanaId, u));
    return map;
  }, [users]);

  useEffect(() => {
    AsyncStorage.getItem("auth_token").then((token) => setAuthToken(token));
  }, []);

  const resetBelowWorkspace = () => {
    setProjects([]);
    setProjectAsanaId("");
    resetBelowProject();
  };

  const resetBelowProject = () => {
    setTasks([]);
    setSelectedTaskAsanaId("");
    resetBelowTask();
  };

  const resetBelowTask = () => {
    setTaskDetails(null);
    setComments([]);
    setAttachments([]);
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      setError(null);
      setLoading(true);
      try {
        const [wsRes, usersRes] = await Promise.all([
          apiFetch<{ ok: true; items: AsanaWorkspace[] }>("/api/asana-import/workspaces"),
          apiFetch<{ ok: true; items: AsanaUser[] }>("/api/asana-import/users"),
        ]);
        if (!mounted) return;
        setWorkspaces(wsRes.items || []);
        setUsers(usersRes.items || []);

        const first = (wsRes.items || [])[0];
        if (first?.asanaId) setWorkspaceAsanaId(first.asanaId);
      } catch (e) {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : "Failed to load workspaces");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!workspaceAsanaId) return;
    let mounted = true;
    (async () => {
      resetBelowWorkspace();
      setError(null);
      setLoading(true);
      try {
        const res = await apiFetch<{ ok: true; items: AsanaProject[] }>(
          `/api/asana-import/projects?workspaceAsanaId=${encodeURIComponent(workspaceAsanaId)}`
        );
        if (!mounted) return;
        setProjects(res.items || []);
        const first = (res.items || [])[0];
        if (first?.asanaId) setProjectAsanaId(first.asanaId);
      } catch (e) {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : "Failed to load projects");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [workspaceAsanaId]);

  useEffect(() => {
    if (!projectAsanaId) return;
    let mounted = true;
    (async () => {
      resetBelowProject();
      setError(null);
      setLoading(true);
      try {
        const res = await apiFetch<{ ok: true; items: AsanaTask[] }>(
          `/api/asana-import/tasks?projectAsanaId=${encodeURIComponent(projectAsanaId)}`
        );
        if (!mounted) return;
        setTasks(res.items || []);
        const first = (res.items || [])[0];
        if (first?.asanaId) setSelectedTaskAsanaId(first.asanaId);
      } catch (e) {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : "Failed to load tasks");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [projectAsanaId]);

  useEffect(() => {
    if (!selectedTaskAsanaId) return;
    let mounted = true;
    (async () => {
      resetBelowTask();
      setError(null);
      setLoading(true);
      try {
        const [taskRes, commentsRes, attachmentsRes] = await Promise.all([
          apiFetch<{ ok: true; task: AsanaTask; subtasks: AsanaTask[] }>(
            `/api/asana-import/task/${encodeURIComponent(selectedTaskAsanaId)}`
          ),
          apiFetch<{ ok: true; items: AsanaComment[] }>(
            `/api/asana-import/task/${encodeURIComponent(selectedTaskAsanaId)}/comments`
          ),
          apiFetch<{ ok: true; items: AsanaAttachment[] }>(
            `/api/asana-import/task/${encodeURIComponent(selectedTaskAsanaId)}/attachments`
          ),
        ]);

        if (!mounted) return;
        setTaskDetails({ task: taskRes.task, subtasks: taskRes.subtasks || [] });
        setComments(commentsRes.items || []);
        setAttachments(attachmentsRes.items || []);
      } catch (e) {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : "Failed to load task details");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [selectedTaskAsanaId]);

  const handleTransfer = async () => {
    if (!projectAsanaId) return;
    setError(null);
    setTransferSuccess(null);
    setTransferring(true);
    try {
      const res = await apiFetch<{ ok: true; message: string; stats: { tasks: number; comments: number } }>("/api/asana-import/transfer-project", {
        method: "POST",
        body: JSON.stringify({ projectAsanaId }),
      });
      setTransferSuccess(`${res.message} (${res.stats.tasks} tasks, ${res.stats.comments} comments)`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Transfer failed");
    } finally {
      setTransferring(false);
    }
  };

  const handleClearAllData = () => {
    Alert.alert(
      "Are you sure?",
      "This will delete ALL imported Asana data from storage. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear Everything",
          style: "destructive",
          onPress: async () => {
            setClearing(true);
            setError(null);
            setTransferSuccess(null);
            try {
              const res = await apiFetch<{ ok: true; message: string; filesDeleted: number }>("/api/asana-import/clear", { method: "DELETE" });
              setTransferSuccess(`${res.message} (${res.filesDeleted} files removed)`);
              setWorkspaces([]); setWorkspaceAsanaId("");
              setProjects([]); setProjectAsanaId("");
              setTasks([]); setSelectedTaskAsanaId("");
              setTaskDetails(null); setComments([]); setAttachments([]); setUsers([]);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Failed to clear data");
            } finally {
              setClearing(false);
            }
          },
        },
      ]
    );
  };

  const handleViewOrDownloadFile = async (item: AsanaAttachment, shouldShare: boolean) => {
    const fileUrl = getFullUrl(item.filePath);
    if (isLinkAttachment(item)) {
      Linking.openURL(fileUrl).catch(() => Alert.alert("Error", "Cannot open target URL link."));
      return;
    }

    try {
      Alert.alert("Downloading File", "Processing document attachment...");
      const fileSystemModule = FileSystem as any;
      const baseDir = fileSystemModule.documentDirectory || "";
      const fileUri = `${baseDir}${item.fileName || "attachment"}`;
      
      const downloadHeaders = authToken ? { Authorization: `Bearer ${authToken}` } : undefined;
      const downloadResult = await FileSystem.downloadAsync(fileUrl, fileUri, { headers: downloadHeaders });

      if (shouldShare && (await Sharing.isAvailableAsync())) {
        await Sharing.shareAsync(downloadResult.uri);
      } else {
        Alert.alert("Success", "File cached securely inside module library registry.");
      }
    } catch (err) {
      Alert.alert("Download Intercept Failed", "Unable to pull restricted file without system tokens.");
    }
  };

  const renderLinkifiedText = (text: string) => {
    if (!text) return <Text style={{ color: colors.mutedText }}>—</Text>;
    const tokenRegex = /(https?:\/\/[^\s]+|[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/g;
    const parts = text.split(tokenRegex);

    return (
      <Text style={styles.bodyText}>
        {parts.map((part, index) => {
          if (part.match(/^https?:\/\//)) {
            return (
              <Text key={index} style={styles.interactiveLink} onPress={() => Linking.openURL(part)}>
                {part} <ExternalLink size={10} color={colors.primary} />{" "}
              </Text>
            );
          }
          if (part.match(/^[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+$/)) {
            return (
              <Text key={index} style={styles.interactiveLink} onPress={() => Linking.openURL(`mailto:${part}`)}>
                {part}{" "}
              </Text>
            );
          }
          return <Text key={index} style={{ color: colors.text }}>{part}</Text>;
        })}
      </Text>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
      <View style={styles.headerArea}>
        <Text style={styles.titleText}>Imported Asana Data</Text>
        <Text style={styles.subTitleText}>
          View the synchronized Asana workspaces, project modules, tasks, conversations and attached materials.
        </Text>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <AlertCircle size={16} color={colors.errorText} style={{ marginTop: 2 }} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {transferSuccess && (
        <View style={styles.successBanner}>
          <CheckSquare size={16} color={colors.successText} style={{ marginTop: 2 }} />
          <Text style={styles.successText}>{transferSuccess}</Text>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Filters</Text>
        
        <MobileSelect
          label="Workspace"
          placeholder="Select workspace"
          value={workspaceAsanaId}
          items={workspaces.map((w) => ({ label: w.name || w.asanaId, value: w.asanaId }))}
          onValueChange={setWorkspaceAsanaId}
          disabled={loading || workspaces.length === 0}
          colors={colors}
          styles={styles}
        />
        {selectedWorkspace && <Text style={styles.microText}>Workspace ID: {selectedWorkspace.asanaId}</Text>}

        <MobileSelect
          label="Project"
          placeholder="Select project"
          value={projectAsanaId}
          items={projects.map((p) => ({ label: p.name || p.asanaId, value: p.asanaId }))}
          onValueChange={setProjectAsanaId}
          disabled={loading || projects.length === 0}
          colors={colors}
          styles={styles}
        />
        {selectedProject && (
          <View style={{ marginTop: -4, marginBottom: 8 }}>
            <Text style={styles.microText}>Tasks Count: {selectedProject.tasksCount ?? "—"}</Text>
            {selectedProject.createdAtAsana && (
              <Text style={styles.microText}>Synced: {formatDate(selectedProject.createdAtAsana)}</Text>
            )}
          </View>
        )}

        <MobileSelect
          label="Task Selector"
          placeholder="Select task"
          value={selectedTaskAsanaId}
          items={tasks.map((t) => ({ label: t.title || t.asanaId, value: t.asanaId }))}
          onValueChange={setSelectedTaskAsanaId}
          disabled={loading || tasks.length === 0}
          colors={colors}
          styles={styles}
        />
        {selectedTask && <Text style={styles.microText}>Completed Status: {selectedTask.completed ? "Yes" : "No"}</Text>}

        <View style={styles.buttonActionRow}>
          <TouchableOpacity
            style={styles.outlineBtn}
            disabled={loading || transferring}
            onPress={() => {
              if (workspaces[0]?.asanaId) setWorkspaceAsanaId(workspaces[0].asanaId);
              setTransferSuccess(null);
            }}
          >
            <Text style={styles.outlineBtnText}>Reset</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryBtn, (!projectAsanaId || transferring) && styles.disabledElement]}
            disabled={loading || !projectAsanaId || transferring}
            onPress={handleTransfer}
          >
            {transferring ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Database size={14} color="#FFF" />
                <Text style={styles.primaryBtnText}>Sync to App</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.dangerBtn, (loading || transferring || clearing) && styles.disabledElement]}
          disabled={loading || transferring || clearing}
          onPress={handleClearAllData}
        >
          {clearing ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.dangerBtnText}>Clear Imported Cache</Text>
          )}
        </TouchableOpacity>

        {loading && (
          <View style={styles.loadingIndicatorBox}>
            <ActivityIndicator size="small" color={colors.mutedText} />
            <Text style={styles.loadingIndicatorText}>Refreshing database context...</Text>
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Task Details</Text>
        {!taskDetails ? (
          <Text style={styles.emptyCardFallback}>Select an isolated task row parameter above to parse specifications.</Text>
        ) : (
          <View style={{ gap: 12 }}>
            <View style={styles.metaSummaryHeader}>
              <Text style={styles.detailHeadline}>{taskDetails.task.title}</Text>
              <Text style={styles.microText}>Asana Ref: {taskDetails.task.asanaId}</Text>
              <Text style={styles.microText}>Target Date: {taskDetails.task.dueDate || "—"}</Text>
              <View style={{ alignSelf: "flex-start", marginTop: 6 }}>
                <View style={[styles.badgeFrame, taskDetails.task.completed ? styles.badgeSuccess : styles.badgeProgress]}>
                  <Text style={taskDetails.task.completed ? styles.badgeTextSuccess : styles.badgeTextProgress}>
                    {taskDetails.task.completed ? "Completed" : "Active Open"}
                  </Text>
                </View>
              </View>
            </View>

            <View>
              <Text style={styles.fieldSectionLabel}>Description</Text>
              <View style={styles.descriptionTextContainer}>
                {renderLinkifiedText(taskDetails.task.description)}
              </View>
            </View>

            <View>
              <Text style={styles.fieldSectionLabel}>Subtasks ({taskDetails.subtasks.length})</Text>
              {taskDetails.subtasks.length === 0 ? (
                <Text style={styles.emptyCardFallback}>— No subtask nodes recorded —</Text>
              ) : (
                taskDetails.subtasks.map((st) => (
                  <View key={st.asanaId} style={styles.subtaskNestedRow}>
                    <Text style={styles.subtaskTitle}>{st.title}</Text>
                    <Text style={[styles.microText, { marginTop: 2, marginBottom: 0 }]}>Completed: {st.completed ? "Yes" : "No"}</Text>
                  </View>
                ))
              )}
            </View>
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Comments ({comments.length})</Text>
        {comments.length === 0 ? (
          <Text style={styles.emptyCardFallback}>No discussion replies found.</Text>
        ) : (
          <View style={{ gap: 10 }}>
            {comments.map((c) => {
              const authorUser = c.authorName || userMap.get(c.authorAsanaId)?.name || "Unknown User";
              const authorEmailStr = c.authorEmail || userMap.get(c.authorAsanaId)?.email || "";

              return (
                <View key={c.asanaId} style={styles.commentItemBubble}>
                  <View style={styles.commentMetaRow}>
                    <View style={styles.avatarInlinePlaceholder}>
                      <User size={12} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.commentAuthorName} numberOfLines={1}>{authorUser}</Text>
                      {authorEmailStr ? <Text style={styles.commentAuthorEmail} numberOfLines={1}>{authorEmailStr}</Text> : null}
                    </View>
                    {c.createdAtAsana && (
                      <Text style={styles.commentTimestamp}>{formatDate(c.createdAtAsana)}</Text>
                    )}
                  </View>
                  <View style={{ marginTop: 4 }}>
                    {renderLinkifiedText(c.message)}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Attachments ({attachments.length})</Text>
        {attachments.length === 0 ? (
          <Text style={styles.emptyCardFallback}>No attached asset files mapped.</Text>
        ) : (
          <View style={{ gap: 10 }}>
            {attachments.map((a) => {
              const isImage = isImageMime(a.mimeType || "");
              const isLink = isLinkAttachment(a);
              const hasDownload = !!a.filePath;
              const imgUrl = getFullUrl(a.filePath);

              return (
                <View key={a.asanaId} style={styles.attachmentMediaCard}>
                  {isImage && hasDownload && imgUrl ? (
                    <View style={styles.attachmentThumbnailFrame}>
                      <Image
                        source={{
                          uri: imgUrl,
                          headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
                        }}
                        style={styles.thumbnailImageStyle}
                        resizeMode="cover"
                      />
                    </View>
                  ) : null}

                  <View style={styles.attachmentMetaPadding}>
                    <View style={styles.attachmentLabelRow}>
                      <View style={styles.iconBackgroundCircle}>
                        {isImage ? (
                          <ImageIcon size={14} color={colors.successText} />
                        ) : isLink ? (
                          <LinkIcon size={14} color={colors.primary} />
                        ) : (
                          <FileText size={14} color={colors.primary} />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.attachmentNameText} numberOfLines={1}>{a.fileName || "Imported Asset File"}</Text>
                        <Text style={styles.microText}>
                          {a.mimeType || "Unknown Format"} • {a.size ? `${(a.size / 1024).toFixed(1)} KB` : "0 B"}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.attachmentActionToolbar}>
                      {isLink && (
                        <TouchableOpacity style={styles.toolbarActionItem} onPress={() => Linking.openURL(imgUrl)}>
                          <ExternalLink size={12} color={colors.primary} />
                          <Text style={[styles.toolbarActionLabel, { color: colors.primary }]}>Open URL</Text>
                        </TouchableOpacity>
                      )}
                      {hasDownload && !isLink && (
                        <>
                          <TouchableOpacity style={styles.toolbarActionItem} onPress={() => handleViewOrDownloadFile(a, true)}>
                            <Eye size={12} color={colors.successText} />
                            <Text style={[styles.toolbarActionLabel, { color: colors.successText }]}>View</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.toolbarActionItem} onPress={() => handleViewOrDownloadFile(a, false)}>
                            <Download size={12} color={colors.primary} />
                            <Text style={[styles.toolbarActionLabel, { color: colors.primary }]}>Download</Text>
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: 16,
    },
    headerArea: {
      marginVertical: 18,
    },
    titleText: {
      fontSize: 24,
      fontWeight: "700",
      color: colors.text,
    },
    subTitleText: {
      fontSize: 13,
      color: colors.mutedText,
      marginTop: 4,
      lineHeight: 18,
    },
    errorBanner: {
      flexDirection: "row",
      backgroundColor: colors.errorBg,
      borderWidth: 1,
      borderColor: colors.errorBorder,
      padding: 12,
      borderRadius: 8,
      gap: 8,
      marginBottom: 12,
    },
    errorText: {
      color: colors.errorText,
      fontSize: 13,
      flex: 1,
    },
    successBanner: {
      flexDirection: "row",
      backgroundColor: colors.successBg,
      borderWidth: 1,
      borderColor: colors.successBorder,
      padding: 12,
      borderRadius: 8,
      gap: 8,
      marginBottom: 12,
    },
    successText: {
      color: colors.successText,
      fontSize: 13,
      flex: 1,
    },
    card: {
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 14,
    },
    selectWrapper: {
      marginBottom: 12,
    },
    selectLabel: {
      fontSize: 12,
      fontWeight: "500",
      color: colors.text,
      marginBottom: 4,
    },
    selectTrigger: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      height: 42,
      backgroundColor: colors.inputBg,
    },
    selectTriggerText: {
      fontSize: 14,
      color: colors.inputText,
      flex: 1,
      marginRight: 8,
    },
    microText: {
      fontSize: 11,
      color: colors.mutedText,
      marginBottom: 6,
    },
    buttonActionRow: {
      flexDirection: "row",
      gap: 10,
      marginTop: 6,
      marginBottom: 10,
    },
    outlineBtn: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      height: 40,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.cardBg,
    },
    outlineBtnText: {
      fontSize: 14,
      fontWeight: "500",
      color: colors.text,
    },
    primaryBtn: {
      flex: 2,
      backgroundColor: colors.primary,
      borderRadius: 8,
      height: 40,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 6,
    },
    primaryBtnText: {
      fontSize: 14,
      fontWeight: "600",
      color: "#FFF",
    },
    dangerBtn: {
      backgroundColor: colors.destructive,
      borderRadius: 8,
      height: 38,
      justifyContent: "center",
      alignItems: "center",
    },
    dangerBtnText: {
      fontSize: 13,
      fontWeight: "600",
      color: "#FFF",
    },
    disabledElement: {
      opacity: 0.5,
    },
    loadingIndicatorBox: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      marginTop: 12,
    },
    loadingIndicatorText: {
      fontSize: 12,
      color: colors.mutedText,
    },
    emptyCardFallback: {
      fontSize: 13,
      color: colors.mutedText,
      textAlign: "center",
      paddingVertical: 12,
    },
    metaSummaryHeader: {
      backgroundColor: colors.cardMuted,
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    detailHeadline: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 6,
    },
    fieldSectionLabel: {
      fontSize: 11,
      fontWeight: "600",
      color: colors.mutedText,
      textTransform: "uppercase",
      marginBottom: 6,
      marginTop: 4,
    },
    descriptionTextContainer: {
      backgroundColor: colors.cardMuted,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 10,
      borderRadius: 8,
    },
    bodyText: {
      fontSize: 13,
      lineHeight: 18,
    },
    interactiveLink: {
      color: colors.primary,
      fontWeight: "500",
    },
    subtaskNestedRow: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 6,
      padding: 10,
      marginBottom: 6,
      backgroundColor: colors.cardMuted,
    },
    subtaskTitle: {
      fontSize: 13,
      fontWeight: "500",
      color: colors.text,
    },
    commentItemBubble: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
      backgroundColor: colors.cardMuted,
    },
    commentMetaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingBottom: 6,
    },
    avatarInlinePlaceholder: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: "center",
      alignItems: "center",
    },
    commentAuthorName: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.text,
    },
    commentAuthorEmail: {
      fontSize: 10,
      color: colors.mutedText,
      marginTop: -2,
    },
    commentTimestamp: {
      fontSize: 9,
      color: colors.mutedText,
    },
    attachmentMediaCard: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      overflow: "hidden",
      backgroundColor: colors.cardMuted,
    },
    attachmentThumbnailFrame: {
      width: "100%",
      height: 140,
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    thumbnailImageStyle: {
      width: "100%",
      height: "100%",
    },
    attachmentMetaPadding: {
      padding: 10,
    },
    attachmentLabelRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    iconBackgroundCircle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: "center",
      alignItems: "center",
    },
    attachmentNameText: {
      fontSize: 12,
      fontWeight: "500",
      color: colors.text,
    },
    attachmentActionToolbar: {
      flexDirection: "row",
      gap: 14,
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    toolbarActionItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    toolbarActionLabel: {
      fontSize: 12,
      fontWeight: "600",
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    pickerModalCard: {
      width: SCREEN_WIDTH * 0.85,
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 16,
      shadowColor: "#000",
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 5,
    },
    pickerModalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingBottom: 8,
      marginBottom: 8,
    },
    pickerModalTitle: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.text,
    },
    pickerItemRow: {
      paddingVertical: 10,
      paddingHorizontal: 8,
      borderRadius: 6,
    },
    pickerItemRowActive: {
      backgroundColor: colors.cardMuted,
    },
    pickerItemText: {
      fontSize: 14,
      color: colors.text,
    },
    pickerItemTextActive: {
      color: colors.primary,
      fontWeight: "600",
    },
    emptyListText: {
      textAlign: "center",
      color: colors.mutedText,
      marginVertical: 12,
      fontSize: 13,
    },
    badgeFrame: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 4,
      alignItems: "center",
      justifyContent: "center",
    },
    badgeSuccess: {
      backgroundColor: colors.badgeSuccessBg,
    },
    badgeProgress: {
      backgroundColor: colors.badgeProgressBg,
    },
    badgeTextSuccess: {
      fontSize: 11,
      fontWeight: "600",
      color: colors.badgeSuccessText,
    },
    badgeTextProgress: {
      fontSize: 11,
      fontWeight: "600",
      color: colors.badgeProgressText,
    },
  });
}