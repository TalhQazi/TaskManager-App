import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Switch,
  Modal,
  Dimensions,
  Platform,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import {
  Video as VideoIcon,
  Plus,
  Edit3,
  Trash2,
  Play,
  ChevronDown,
  X,
} from "lucide-react-native";
import { apiFetch } from "@/lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";

const { width } = Dimensions.get("window");

const MESSAGE_TYPES = [
  "birthday",
  "30d",
  "6m",
  "1y",
  "2y",
  "3y",
  "4y",
  "5y",
  "6y",
  "7y",
  "8y",
  "9y",
  "10y",
  "top-performer",
];

interface VideoMessageItem {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  videoUrl: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface LocalPickedFile {
  uri: string;
  name: string;
  type?: string;
  size?: number;
}

function buildColors(uiTheme: any, isDark: boolean) {
  return {
    background:       uiTheme.panelColors?.dashboardBackground     || (isDark ? "#0F172A" : "#F8FAFC"),
    cardBg:           uiTheme.panelColors?.dashboardCardBackground || (isDark ? "#1E293B" : "#FFFFFF"),
    text:             uiTheme.panelColors?.dashboardTextColor      || (isDark ? "#F8FAFC" : "#0F172A"),
    textSecondary:    isDark ? "#CBD5E1" : "#334155",
    textMuted:        isDark ? "#94A3B8" : "#64748B",
    textSubtle:       isDark ? "#64748B" : "#94A3B8",
    border:           isDark ? "#334155" : "#E2E8F0",
    borderLight:      isDark ? "rgba(255,255,255,0.05)" : "#F1F5F9",
    inputBg:          isDark ? "#0F172A" : "#F8FAFC",
    inputBorder:      isDark ? "#334155" : "#E2E8F0",
    inputText:        isDark ? "#F8FAFC" : "#0F172A",
    placeholderText:  isDark ? "#475569" : "#94A3B8",
    primary:          uiTheme.customColors?.primary || (isDark ? "#38bdf8" : "#0284c7"),
    primaryText:      "#FFFFFF",
    primaryMuted:     isDark ? "rgba(56, 189, 248, 0.1)" : "rgba(2, 132, 199, 0.08)",
    successBg:        isDark ? "rgba(16,185,129,0.15)" : "#ECFDF5",
    successBorder:    isDark ? "rgba(16,185,129,0.3)"  : "#A7F3D0",
    successText:      isDark ? "#34D399" : "#10B981",
    dangerBg:         isDark ? "rgba(239,68,68,0.15)" : "#FEF2F2",
    dangerBorder:     isDark ? "rgba(239,68,68,0.3)"  : "#FECACA",
    dangerText:       isDark ? "#FCA5A5" : "#EF4444",
    warning:          uiTheme.customColors?.warning || "#F59E0B",
    overlayBg:        "rgba(0,0,0,0.5)",
  };
}

function createStyles(colors: ReturnType<typeof buildColors>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContainer: {
      padding: 16,
      paddingTop: Platform.OS === "ios" ? 60 : 24,
      paddingBottom: 40,
    },
    headerTitleSection: {
      marginBottom: 20,
    },
    rowCentered: {
      flexDirection: "row",
      alignItems: "center",
    },
    headerLabelTrack: {
      fontSize: 12,
      color: colors.textMuted,
      fontWeight: "700",
      letterSpacing: 2,
      marginLeft: 6,
    },
    mainTitleText: {
      fontSize: 26,
      fontWeight: "bold",
      color: colors.text,
      marginTop: 6,
    },
    subtitleText: {
      fontSize: 14,
      color: colors.textMuted,
      marginTop: 4,
      lineHeight: 20,
    },
    formCard: {
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 16,
      marginBottom: 24,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 16,
    },
    formGroup: {
      marginBottom: 14,
    },
    inputLabel: {
      fontSize: 13,
      fontWeight: "500",
      color: colors.textSecondary,
      marginBottom: 6,
    },
    textInput: {
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 8,
      height: 44,
      paddingHorizontal: 12,
      fontSize: 14,
      color: colors.inputText,
    },
    pickerSelectorTrigger: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 8,
      height: 44,
      paddingHorizontal: 12,
    },
    pickerTriggerValueText: {
      fontSize: 14,
      color: colors.inputText,
      textTransform: "capitalize",
      flex: 1,
    },
    uploadBox: {
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: colors.textMuted,
      backgroundColor: colors.inputBg,
      borderRadius: 12,
      padding: 16,
      alignItems: "center",
      justifyContent: "center",
      marginVertical: 12,
    },
    uploadMainText: {
      fontSize: 14,
      fontWeight: "500",
      color: colors.inputText,
    },
    uploadSubText: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    uploadFileNameText: {
      fontSize: 12,
      color: colors.primary,
      marginTop: 8,
      fontWeight: "500",
    },
    uploadProgressText: {
      fontSize: 12,
      color: colors.textMuted,
    },
    previewContainer: {
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 12,
      marginVertical: 12,
    },
    previewHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
    },
    previewTitleText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.text,
    },
    previewSubTextText: {
      fontSize: 11,
      color: colors.textMuted,
    },
    videoPlayerFrame: {
      height: 120,
      backgroundColor: colors.background,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.border,
      padding: 8,
    },
    playerPlaceholderText: {
      fontSize: 12,
      color: colors.textSecondary,
      textAlign: "center",
    },
    statusRowSwitchContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 8,
      marginBottom: 12,
    },
    statusSwitchLabel: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: "500",
    },
    errorTextText: {
      fontSize: 13,
      color: colors.dangerText,
      marginBottom: 12,
      fontWeight: "600",
    },
    actionButtonsRow: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 8,
    },
    btn: {
      height: 40,
      paddingHorizontal: 16,
      borderRadius: 8,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
    },
    btnSubmit: {
      backgroundColor: colors.primary,
      flex: 1,
    },
    btnSubmitText: {
      color: colors.primaryText,
      fontWeight: "600",
      fontSize: 13,
    },
    btnCancel: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.cardBg,
    },
    btnCancelText: {
      color: colors.textSecondary,
      fontWeight: "500",
      fontSize: 13,
    },
    feedSectionTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 12,
      marginTop: 8,
    },
    centeredLoadingState: {
      paddingVertical: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    loadingStateLabel: {
      color: colors.textMuted,
      fontSize: 13,
      marginTop: 8,
    },
    messageCardItem: {
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 14,
      marginBottom: 12,
    },
    msgItemHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      borderBottomWidth: 1,
      borderColor: colors.borderLight,
      paddingBottom: 12,
    },
    msgBadgeType: {
      fontSize: 10,
      fontWeight: "700",
      color: colors.primary,
      backgroundColor: colors.primaryMuted,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      alignSelf: "flex-start",
      marginBottom: 6,
    },
    msgCardItemTitle: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.text,
    },
    msgCardItemSubtitle: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    statusIndicatorLabelBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 12,
      borderWidth: 1,
    },
    badgeActive: {
      backgroundColor: colors.successBg,
      borderColor: colors.successBorder,
    },
    badgeInactive: {
      backgroundColor: colors.borderLight,
      borderColor: colors.border,
    },
    statusIndicatorLabelText: {
      fontSize: 11,
      fontWeight: "500",
    },
    textActive: { color: colors.successText },
    textInactive: { color: colors.textMuted },
    msgCardActionsFooterPanel: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingTop: 10,
    },
    cardActionInlineBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingVertical: 4,
    },
    actionInlineBtnTextPrimary: {
      fontSize: 13,
      color: colors.primary,
      fontWeight: "500",
    },
    actionInlineBtnTextMuted: {
      fontSize: 13,
      color: colors.textMuted,
      fontWeight: "500",
    },
    modalOverlayScrim: {
      flex: 1,
      backgroundColor: colors.overlayBg,
      justifyContent: "center",
      padding: 24,
    },
    pickerContentSheetCard: {
      backgroundColor: colors.cardBg,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
    },
    pickerHeaderModalTitle: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 12,
    },
    pickerOptionRowItem: {
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderColor: colors.borderLight,
    },
    pickerOptionRowItemText: {
      fontSize: 14,
      color: colors.textSecondary,
      textTransform: "capitalize",
    },
  });
}

export default function VideoMessagesScreen() {
  const { uiTheme } = useTheme();

  const isDark = (uiTheme.theme as string) === "dark" || (uiTheme.theme as string) === "metallic-elite";
  const colors = useMemo(() => buildColors(uiTheme, isDark), [uiTheme, isDark]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [messages, setMessages] = useState<VideoMessageItem[]>([]);
  const [selectedType, setSelectedType] = useState<string>(MESSAGE_TYPES[0]);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoFile, setVideoFile] = useState<LocalPickedFile | null>(null);
  const [uploadingVideoFile, setUploadingVideoFile] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [previewMessage, setPreviewMessage] = useState<VideoMessageItem | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [isPickerVisible, setIsPickerVisible] = useState(false);

  const loadMessages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch<{ items: VideoMessageItem[] }>("/api/video/messages");
      setMessages(response.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load messages");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  const handleVideoFileUpload = async (file: LocalPickedFile) => {
    setUploadingVideoFile(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", {
        uri: file.uri,
        name: file.name,
        type: file.type || "video/mp4",
      } as any);

      const response = await apiFetch<{ attachment: { url: string } }>("/api/messages/upload", {
        method: "POST",
        body: formData,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setVideoUrl(response.attachment.url);
      setVideoFile(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload video file.");
    } finally {
      setUploadingVideoFile(false);
    }
  };

  const pickVideoFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "video/*",
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const fileAsset = result.assets[0];
      const picked: LocalPickedFile = {
        uri: fileAsset.uri,
        name: fileAsset.name,
        type: fileAsset.mimeType || "video/mp4",
        size: fileAsset.size,
      };

      await handleVideoFileUpload(picked);
    } catch (err) {
      setError("Failed to open document selector view");
    }
  };

  const resetForm = () => {
    setTitle("");
    setSubtitle("");
    setVideoUrl("");
    setVideoFile(null);
    setSelectedType(MESSAGE_TYPES[0]);
    setIsActive(true);
    setEditingMessageId(null);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!videoUrl.trim()) {
      setError("Please enter a video URL or upload a video file.");
      return;
    }
    setSaving(true);
    setError(null);

    try {
      const endpoint = editingMessageId 
        ? `/api/video/messages/${encodeURIComponent(editingMessageId)}` 
        : "/api/video/messages";
      const method = editingMessageId ? "PUT" : "POST";

      await apiFetch<{ item: VideoMessageItem }>(endpoint, {
        method,
        body: JSON.stringify({
          type: selectedType,
          title: title.trim(),
          subtitle: subtitle.trim(),
          videoUrl: videoUrl.trim(),
          isActive,
        }),
      });
      resetForm();
      await loadMessages();
      Alert.alert("Success", "Message saved successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save video message");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (message: VideoMessageItem) => {
    setEditingMessageId(message.id);
    setSelectedType(message.type);
    setTitle(message.title);
    setSubtitle(message.subtitle || "");
    setVideoUrl(message.videoUrl);
    setIsActive(message.isActive);
    setVideoFile(null);
    setError(null);
    setPreviewMessage(null);
  };

  const confirmDelete = (messageId: string) => {
    Alert.alert(
      "Confirm Deletion",
      "Are you sure you want to delete this executive video message?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => handleDelete(messageId) },
      ]
    );
  };

  const handleDelete = async (messageId: string) => {
    setLoading(true);
    setError(null);
    try {
      await apiFetch<{ ok: true }>(`/api/video/messages/${encodeURIComponent(messageId)}`, {
        method: "DELETE",
      });
      if (previewMessage?.id === messageId) {
        setPreviewMessage(null);
      }
      await loadMessages();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete video message");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        
        <View style={styles.headerTitleSection}>
          <View style={styles.rowCentered}>
            <VideoIcon size={18} color={colors.primary} />
            <Text style={styles.headerLabelTrack}>EXECUTIVE VIDEO</Text>
          </View>
          <Text style={styles.mainTitleText}>Video Messages</Text>
          <Text style={styles.subtitleText}>
            Create executive video messages for birthdays, milestones, and top performer recognition.
          </Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.cardTitle}>
            {editingMessageId ? "Edit Video Message" : "Create New Video Message"}
          </Text>

          <View style={styles.formGroup}>
            <Text style={styles.inputLabel}>Message Type</Text>
            <TouchableOpacity style={styles.pickerSelectorTrigger} onPress={() => setIsPickerVisible(true)}>
              <Text style={styles.pickerTriggerValueText}>{selectedType.replace(/-/g, " ")}</Text>
              <ChevronDown size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.inputLabel}>Video URL</Text>
            <TextInput
              style={styles.textInput}
              placeholderTextColor={colors.placeholderText}
              placeholder="https://..."
              value={videoUrl}
              onChangeText={setVideoUrl}
              autoCapitalize="none"
            />
          </View>

          <TouchableOpacity style={styles.uploadBox} onPress={pickVideoFile}>
            <Text style={styles.uploadMainText}>Tap to select a video file</Text>
            <Text style={styles.uploadSubText}>browse device media logs to upload</Text>
            {videoFile && (
              <Text style={styles.uploadFileNameText}>Selected: {videoFile.name}</Text>
            )}
            {uploadingVideoFile && (
              <View style={[styles.rowCentered, { marginTop: 8 }]}>
                <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={styles.uploadProgressText}>Uploading video binary sync…</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.formGroup}>
            <Text style={styles.inputLabel}>Title</Text>
            <TextInput
              style={styles.textInput}
              placeholderTextColor={colors.placeholderText}
              placeholder="Message title"
              value={title}
              onChangeText={setTitle}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.inputLabel}>Subtitle</Text>
            <TextInput
              style={styles.textInput}
              placeholderTextColor={colors.placeholderText}
              placeholder="Optional subtitle"
              value={subtitle}
              onChangeText={setSubtitle}
            />
          </View>

          {previewMessage && (
            <View style={styles.previewContainer}>
              <View style={styles.previewHeader}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.previewTitleText} numberOfLines={1}>Preview: {previewMessage.title}</Text>
                  <Text style={styles.previewSubTextText} numberOfLines={1}>{previewMessage.subtitle || "Executive video preview"}</Text>
                </View>
                <TouchableOpacity onPress={() => setPreviewMessage(null)}>
                  <X size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.videoPlayerFrame}>
                <Text style={styles.playerPlaceholderText}>
                  [Video Stream Content Available: {previewMessage.videoUrl}]
                </Text>
              </View>
            </View>
          )}

          <View style={styles.statusRowSwitchContainer}>
            <Text style={styles.statusSwitchLabel}>Active Status</Text>
            <Switch
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={isActive ? colors.primaryText : colors.textMuted}
              value={isActive}
              onValueChange={setIsActive}
            />
          </View>

          {error && <Text style={styles.errorTextText}>{error}</Text>}

          <View style={styles.actionButtonsRow}>
            {editingMessageId && (
              <TouchableOpacity style={[styles.btn, styles.btnCancel]} onPress={resetForm}>
                <Text style={styles.btnCancelText}>Cancel</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.btn, styles.btnSubmit]} onPress={handleSubmit} disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color={colors.primaryText} />
              ) : (
                <>
                  {editingMessageId ? <Plus size={16} color={colors.primaryText} /> : <Plus size={16} color={colors.primaryText} />}
                  <Text style={styles.btnSubmitText}>{editingMessageId ? "Save Changes" : "Create Message"}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.feedSectionTitle}>Existing Video Messages</Text>
        {loading ? (
          <View style={styles.centeredLoadingState}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingStateLabel}>Loading database messages...</Text>
          </View>
        ) : (
          messages.map((message) => (
            <View key={message.id} style={styles.messageCardItem}>
              <View style={styles.msgItemHeaderRow}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.msgBadgeType}>{message.type.toUpperCase()}</Text>
                  <Text style={styles.msgCardItemTitle}>{message.title}</Text>
                  {message.subtitle ? <Text style={styles.msgCardItemSubtitle}>{message.subtitle}</Text> : null}
                </View>
                <View style={[styles.statusIndicatorLabelBadge, message.isActive ? styles.badgeActive : styles.badgeInactive]}>
                  <Text style={[styles.statusIndicatorLabelText, message.isActive ? styles.textActive : styles.textInactive]}>
                    {message.isActive ? "Active" : "Inactive"}
                  </Text>
                </View>
              </View>

              <View style={styles.msgCardActionsFooterPanel}>
                <TouchableOpacity style={styles.cardActionInlineBtn} onPress={() => setPreviewMessage(message)}>
                  <Play size={14} color={colors.primary} />
                  <Text style={styles.actionInlineBtnTextPrimary}>Preview</Text>
                </TouchableOpacity>

                <View style={styles.rowCentered}>
                  <TouchableOpacity style={[styles.cardActionInlineBtn, { marginRight: 16 }]} onPress={() => startEdit(message)}>
                    <Edit3 size={14} color={colors.textMuted} />
                    <Text style={styles.actionInlineBtnTextMuted}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cardActionInlineBtn} onPress={() => confirmDelete(message.id)}>
                    <Trash2 size={14} color={colors.dangerText} />
                    <Text style={[styles.actionInlineBtnTextMuted, { color: colors.dangerText }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={isPickerVisible} transparent animationType="fade" onRequestClose={() => setIsPickerVisible(false)}>
        <TouchableOpacity style={styles.modalOverlayScrim} activeOpacity={1} onPress={() => setIsPickerVisible(false)}>
          <View style={styles.pickerContentSheetCard}>
            <Text style={styles.pickerHeaderModalTitle}>Select Message Milestones</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {MESSAGE_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={styles.pickerOptionRowItem}
                  onPress={() => {
                    setSelectedType(type);
                    setIsPickerVisible(false);
                  }}
                >
                  <Text style={styles.pickerOptionRowItemText}>{type.replace(/-/g, " ")}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}