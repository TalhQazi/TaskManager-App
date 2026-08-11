import React, { useState, useMemo } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Bug, Upload, X, AlertCircle, CheckCircle2, Video, Camera } from "lucide-react-native";
import { apiFetch } from "@/lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";
import { wp, hp, fs } from "@/util/styles";

type ReportBugModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  defaultSourcePanel?: string;
};

type AttachmentFile = {
  id: string;
  uri: string;
  base64: string;
  name: string;
  type: string;
  isVideo?: boolean;
};

const SEVERITY_OPTIONS = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
  { label: "Critical", value: "critical" },
];

const PRIORITY_OPTIONS = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
  { label: "Urgent", value: "urgent" },
];

export default function ReportBugModal({
  open,
  onOpenChange,
  onSuccess,
  defaultSourcePanel = "manager",
}: ReportBugModalProps) {
  const { uiTheme } = useTheme();

  const colors = useMemo(() => {
    return {
      modalBg: "#09090b",
      cardBg: "#18181b",
      text: "#F4F4F5",
      textSecondary: "#D4D4D8",
      textMuted: "#A1A1AA",
      border: "#27272A",
      inputBg: "#18181b",
      inputBorder: "#3f3f46",
      primary: uiTheme.customColors?.primary || "#3b82f6",
      danger: "#F87171",
      dangerBg: "rgba(239, 68, 68, 0.15)",
      success: "#34D399",
      successBg: "rgba(22, 163, 74, 0.15)",
      overlay: "rgba(0, 0, 0, 0.75)",
    };
  }, [uiTheme]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [priority, setPriority] = useState("medium");
  const [module, setModule] = useState("");
  const [company, setCompany] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setSeverity("medium");
    setPriority("medium");
    setModule("");
    setCompany("");
    setTaskTitle("");
    setAttachments([]);
    setSubmitError(null);
    setSubmitSuccess(null);
  };

  const handlePickMedia = async (useCamera = false, mediaType: "images" | "videos" = "images") => {
    if (attachments.length >= 5) {
      Alert.alert("Limit Reached", "You can attach up to 5 files.");
      return;
    }

    if (useCamera) {
      const camPermission = await ImagePicker.requestCameraPermissionsAsync();
      if (!camPermission.granted) {
        setSubmitError("Camera permission is required to record video/photos.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: mediaType === "videos" ? ImagePicker.MediaTypeOptions.Videos : ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        const filename = asset.uri.split("/").pop() || (mediaType === "videos" ? "video.mp4" : "image.jpg");
        const isVid = asset.type === "video" || mediaType === "videos";
        setAttachments((prev) => [
          ...prev,
          {
            id: Math.random().toString(36).substring(2, 9),
            uri: asset.uri,
            base64: asset.base64 ? `data:${isVid ? "video/mp4" : "image/jpeg"};base64,${asset.base64}` : asset.uri,
            name: filename,
            type: isVid ? "video/mp4" : "image/jpeg",
            isVideo: isVid,
          },
        ]);
      }
    } else {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        setSubmitError("Media library access permission is required.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: true,
        selectionLimit: 5 - attachments.length,
        base64: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        const selected = result.assets.map((asset) => {
          const filename = asset.uri.split("/").pop() || "media_file";
          const isVid = asset.type === "video";
          return {
            id: Math.random().toString(36).substring(2, 9),
            uri: asset.uri,
            base64: asset.base64 ? `data:${isVid ? "video/mp4" : "image/jpeg"};base64,${asset.base64}` : asset.uri,
            name: filename,
            type: isVid ? "video/mp4" : "image/jpeg",
            isVideo: isVid,
          };
        });
        setAttachments((prev) => [...prev, ...selected].slice(0, 5));
      }
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      setSubmitError("Title and description are required.");
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError(null);

      const payloadAttachments = attachments.map((a) => ({
        fileName: a.name,
        url: a.base64,
        mimeType: a.type,
      }));

      await apiFetch("/bugs", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          severity,
          priority,
          module: module.trim(),
          company: company.trim(),
          taskTitle: taskTitle.trim(),
          attachments: payloadAttachments,
          source: { panel: defaultSourcePanel, path: "Mobile App Manager" },
        }),
      });

      setSubmitSuccess("Bug report submitted successfully!");
      if (onSuccess) onSuccess();

      setTimeout(() => {
        onOpenChange(false);
        resetForm();
      }, 1200);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to submit report.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={open} animationType="slide" transparent={true} onRequestClose={() => onOpenChange(false)}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <View style={[styles.container, { backgroundColor: colors.modalBg }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.headerTitleRow}>
              <Bug size={fs(4.5)} color={colors.primary} style={{ marginRight: wp(2) }} />
              <Text style={[styles.title, { color: colors.text }]}>Report a Bug</Text>
            </View>
            <TouchableOpacity onPress={() => onOpenChange(false)}>
              <X size={fs(4)} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {/* Title */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Title *</Text>
              <TextInput
                placeholder="Brief title of the issue"
                placeholderTextColor={colors.textMuted}
                style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                value={title}
                onChangeText={setTitle}
              />
            </View>

            {/* Description */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Description *</Text>
              <TextInput
                placeholder="Detailed steps to reproduce..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                style={[styles.input, styles.textArea, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                value={description}
                onChangeText={setDescription}
              />
            </View>

            {/* Severity */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Severity</Text>
              <View style={styles.pillRow}>
                {SEVERITY_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => setSeverity(opt.value)}
                    style={[
                      styles.pill,
                      {
                        backgroundColor: severity === opt.value ? colors.primary : colors.inputBg,
                        borderColor: severity === opt.value ? colors.primary : colors.inputBorder,
                      },
                    ]}
                  >
                    <Text style={[styles.pillText, { color: severity === opt.value ? "#ffffff" : colors.textSecondary }]}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Priority */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Priority</Text>
              <View style={styles.pillRow}>
                {PRIORITY_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => setPriority(opt.value)}
                    style={[
                      styles.pill,
                      {
                        backgroundColor: priority === opt.value ? colors.primary : colors.inputBg,
                        borderColor: priority === opt.value ? colors.primary : colors.inputBorder,
                      },
                    ]}
                  >
                    <Text style={[styles.pillText, { color: priority === opt.value ? "#ffffff" : colors.textSecondary }]}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Module & Company */}
            <View style={styles.rowGroup}>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Module</Text>
                <TextInput
                  placeholder="e.g. Tasks"
                  placeholderTextColor={colors.textMuted}
                  style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                  value={module}
                  onChangeText={setModule}
                />
              </View>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Company</Text>
                <TextInput
                  placeholder="e.g. Se7en Inc"
                  placeholderTextColor={colors.textMuted}
                  style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                  value={company}
                  onChangeText={setCompany}
                />
              </View>
            </View>

            {/* Task Title */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Related Task Title</Text>
              <TextInput
                placeholder="Optional task reference"
                placeholderTextColor={colors.textMuted}
                style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                value={taskTitle}
                onChangeText={setTaskTitle}
              />
            </View>

            {/* Record Bug Video (Screen or Camera) */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Record Bug Video (Screen or Camera) / Attachments</Text>
              <View style={{ flexDirection: "row", gap: wp(2), marginBottom: hp(1) }}>
                <TouchableOpacity
                  style={[styles.recordBtn, { backgroundColor: colors.cardBg, borderColor: colors.inputBorder }]}
                  onPress={() => void handlePickMedia(true, "videos")}
                >
                  <Video size={fs(3.5)} color={colors.primary} style={{ marginRight: wp(1.5) }} />
                  <Text style={[styles.recordBtnText, { color: colors.text }]}>Record Video</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.recordBtn, { backgroundColor: colors.cardBg, borderColor: colors.inputBorder }]}
                  onPress={() => void handlePickMedia(true, "images")}
                >
                  <Camera size={fs(3.5)} color={colors.primary} style={{ marginRight: wp(1.5) }} />
                  <Text style={[styles.recordBtnText, { color: colors.text }]}>Take Photo</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.pickerRow}>
                {attachments.map((att) => (
                  <View key={att.id} style={[styles.previewContainer, { borderColor: colors.inputBorder }]}>
                    {att.isVideo ? (
                      <View style={[styles.previewImage, { backgroundColor: "#27272a", justifyContent: "center", alignItems: "center" }]}>
                        <Video size={fs(5)} color="#ffffff" />
                      </View>
                    ) : (
                      <Image source={{ uri: att.uri }} style={styles.previewImage} />
                    )}
                    <TouchableOpacity style={styles.removeBadge} onPress={() => removeAttachment(att.id)}>
                      <X size={fs(2.5)} color="#ffffff" />
                    </TouchableOpacity>
                  </View>
                ))}
                {attachments.length < 5 && (
                  <TouchableOpacity
                    style={[styles.uploadBtn, { borderColor: colors.inputBorder, backgroundColor: colors.inputBg }]}
                    onPress={() => void handlePickMedia(false)}
                  >
                    <Upload size={fs(4)} color={colors.textSecondary} />
                    <Text style={[styles.uploadText, { color: colors.textSecondary }]}>Upload</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {submitError && (
              <View style={[styles.banner, { backgroundColor: colors.dangerBg }]}>
                <AlertCircle size={fs(3.5)} color={colors.danger} style={{ marginRight: wp(1.5) }} />
                <Text style={[styles.bannerText, { color: colors.danger }]}>{submitError}</Text>
              </View>
            )}

            {submitSuccess && (
              <View style={[styles.banner, { backgroundColor: colors.successBg }]}>
                <CheckCircle2 size={fs(3.5)} color={colors.success} style={{ marginRight: wp(1.5) }} />
                <Text style={[styles.bannerText, { color: colors.success }]}>{submitSuccess}</Text>
              </View>
            )}
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.modalBg }]}>
            <TouchableOpacity style={[styles.btn, { borderColor: colors.inputBorder }]} onPress={() => onOpenChange(false)} disabled={submitting}>
              <Text style={[styles.btnText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary }]} onPress={() => void handleSubmit()} disabled={submitting}>
              {submitting ? <ActivityIndicator size="small" color="#ffffff" /> : <Text style={[styles.btnText, { color: "#ffffff" }]}>Submit Report</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  container: { borderTopLeftRadius: wp(4), borderTopRightRadius: wp(4), maxHeight: "88%" },
  header: { padding: wp(4), borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerTitleRow: { flexDirection: "row", alignItems: "center" },
  title: { fontSize: fs(4), fontWeight: "700" },
  body: { padding: wp(4) },
  fieldGroup: { marginBottom: hp(1.5) },
  rowGroup: { flexDirection: "row", gap: wp(2) },
  label: { fontSize: fs(2.8), fontWeight: "700", marginBottom: hp(0.6), textTransform: "uppercase" },
  input: { minHeight: hp(5.2), borderWidth: 1, borderRadius: wp(1.8), paddingHorizontal: wp(3), paddingVertical: hp(0.8), fontSize: fs(3.5) },
  textArea: { minHeight: hp(12), paddingTop: hp(1.2), paddingBottom: hp(1.2), textAlignVertical: "top" },
  pillRow: { flexDirection: "row", gap: wp(2) },
  pill: { flex: 1, paddingVertical: hp(0.8), alignItems: "center", borderRadius: wp(1.5), borderWidth: 1 },
  pillText: { fontSize: fs(2.8), fontWeight: "600" },
  recordBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: hp(1), borderRadius: wp(1.8), borderWidth: 1 },
  recordBtnText: { fontSize: fs(2.8), fontWeight: "600" },
  pickerRow: { flexDirection: "row", flexWrap: "wrap", gap: wp(2) },
  previewContainer: { width: wp(15), height: wp(15), borderRadius: wp(1.5), borderWidth: 1, overflow: "hidden", position: "relative" },
  previewImage: { width: "100%", height: "100%" },
  removeBadge: { position: "absolute", top: 2, right: 2, backgroundColor: "rgba(0,0,0,0.65)", borderRadius: wp(2), padding: 2 },
  uploadBtn: { width: wp(15), height: wp(15), borderRadius: wp(1.5), borderWidth: 1.5, borderStyle: "dashed", alignItems: "center", justifyContent: "center" },
  uploadText: { fontSize: fs(2.2), fontWeight: "600" },
  banner: { flexDirection: "row", alignItems: "center", padding: wp(3), borderRadius: wp(1.5), marginBottom: hp(1.5) },
  bannerText: { fontSize: fs(3), fontWeight: "500", flex: 1 },
  footer: { flexDirection: "row", justifyContent: "flex-end", gap: wp(2), padding: wp(4), borderTopWidth: 1 },
  btn: { paddingHorizontal: wp(4), paddingVertical: hp(1.2), borderRadius: wp(1.8), borderWidth: 1 },
  btnText: { fontSize: fs(3.5), fontWeight: "600" },
});