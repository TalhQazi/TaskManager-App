import React, { useMemo, useState } from "react";
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
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { X, Users, Paperclip, ImageIcon } from "lucide-react-native";
import { useTaskTheme, type TaskThemeValue } from "./theme";
import { convertAssetToBase64, TaskAttachmentPayload } from "./fileUtils";

export interface ProjectFormPayload {
  name: string;
  description: string;
  assignees: string[];
  logoUri: string | null;
  attachments: TaskAttachmentPayload[];
}

interface CreateProjectModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (payload: ProjectFormPayload) => void;
  isSubmitting?: boolean;
  employeeOptions: { id: string; name: string }[];
}

// Supersedes the old orphaned CreateProjectSheet — same fields (name, description,
// logo, attachments, assignees), restyled to match the rest of the task system. The
// embedded "add starter tasks while creating a project" step from the legacy manager
// screen is intentionally left out here: create the project, then add tasks from its
// own Tasks tab via Quick Add, which is the same number of steps without a second nested
// task-builder modal to maintain.
export default function CreateProjectModal({ visible, onClose, onSubmit, isSubmitting, employeeOptions }: CreateProjectModalProps) {
  const theme = useTaskTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [assignees, setAssignees] = useState<string[]>([]);
  const [showAssignees, setShowAssignees] = useState(false);
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<TaskAttachmentPayload[]>([]);

  const reset = () => {
    setName("");
    setDescription("");
    setAssignees([]);
    setLogoUri(null);
    setAttachments([]);
  };

  const handlePickLogo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!result.canceled && result.assets?.[0]) setLogoUri(result.assets[0].uri);
  };

  const handlePickAttachments = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "*/*", multiple: true });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const converted = await Promise.all(result.assets.map((a) => convertAssetToBase64(a)));
        setAttachments((prev) => [...prev, ...converted]);
      }
    } catch (err) {
      console.log("[CreateProjectModal] attachment pick failed", err);
    }
  };

  const toggleAssignee = (nameStr: string) => {
    setAssignees((prev) => (prev.includes(nameStr) ? prev.filter((n) => n !== nameStr) : [...prev, nameStr]));
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      Alert.alert("Name required", "Give the project a name before saving.");
      return;
    }
    onSubmit({ name: name.trim(), description: description.trim(), assignees, logoUri, attachments });
    reset();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>New Project</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={20} color={theme.text.secondary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Project name"
              placeholderTextColor={theme.text.tertiary}
              style={styles.titleInput}
              autoFocus
            />
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="What's this project about? (optional)"
              placeholderTextColor={theme.text.tertiary}
              style={[styles.input, styles.textArea]}
              multiline
            />

            <Text style={styles.fieldLabel}>Logo</Text>
            <View style={styles.logoRow}>
              <TouchableOpacity style={styles.attachBtn} onPress={handlePickLogo}>
                <ImageIcon size={15} color={theme.text.secondary} />
                <Text style={styles.attachBtnText}>Upload logo</Text>
              </TouchableOpacity>
              {logoUri ? (
                <Image source={{ uri: logoUri }} style={styles.logoPreview} />
              ) : (
                <View style={styles.logoPlaceholder}>
                  <Text style={styles.logoPlaceholderText}>None</Text>
                </View>
              )}
            </View>

            {employeeOptions.length > 0 && (
              <>
                <Text style={styles.fieldLabel}>Team</Text>
                <TouchableOpacity style={styles.trigger} onPress={() => setShowAssignees((v) => !v)}>
                  <Users size={15} color={theme.text.tertiary} />
                  <Text style={styles.triggerText} numberOfLines={1}>
                    {assignees.length > 0 ? assignees.join(", ") : "No team members yet"}
                  </Text>
                </TouchableOpacity>
                {showAssignees && (
                  <View style={styles.dropdownBox}>
                    {employeeOptions.map((emp) => {
                      const checked = assignees.includes(emp.name);
                      return (
                        <TouchableOpacity key={emp.id} style={styles.dropdownItem} onPress={() => toggleAssignee(emp.name)}>
                          <View style={[styles.checkbox, checked && styles.checkboxChecked]} />
                          <Text style={styles.dropdownItemText}>{emp.name}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </>
            )}

            <Text style={styles.fieldLabel}>Attachments</Text>
            <TouchableOpacity style={styles.attachBtn} onPress={handlePickAttachments}>
              <Paperclip size={15} color={theme.text.secondary} />
              <Text style={styles.attachBtnText}>Add files</Text>
            </TouchableOpacity>
            {attachments.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                {attachments.map((f, i) => (
                  <View key={i} style={styles.fileChip}>
                    <Text style={styles.fileChipText} numberOfLines={1}>{f.fileName}</Text>
                    <TouchableOpacity onPress={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))}>
                      <X size={12} color={theme.accent.danger} />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitBtnText}>Create Project</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// Colours depend on the active theme, so styles are built per-theme rather than
// frozen at module load. Layout values are identical to before.
function makeStyles(theme: TaskThemeValue) {
  return StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: theme.bg.canvas,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.border.default,
    maxHeight: "92%",
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: theme.spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.border.subtle },
  headerTitle: { fontSize: 16, fontWeight: "700", color: theme.text.primary },
  body: { padding: theme.spacing.lg },
  titleInput: { fontSize: 17, fontWeight: "700", color: theme.text.primary, paddingVertical: 8, marginBottom: 8 },
  input: { backgroundColor: theme.bg.surface, borderWidth: 1, borderColor: theme.border.default, borderRadius: theme.radius.sm, paddingHorizontal: 12, paddingVertical: 10, color: theme.text.primary, fontSize: 13.5, marginBottom: theme.spacing.md },
  textArea: { minHeight: 70, textAlignVertical: "top" },
  fieldLabel: { fontSize: 12, fontWeight: "700", color: theme.text.tertiary, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8, marginTop: 4 },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: theme.spacing.md },
  logoPreview: { width: 44, height: 44, borderRadius: theme.radius.sm },
  logoPlaceholder: { width: 44, height: 44, borderRadius: theme.radius.sm, backgroundColor: theme.bg.surface, borderWidth: 1, borderColor: theme.border.default, alignItems: "center", justifyContent: "center" },
  logoPlaceholderText: { color: theme.text.tertiary, fontSize: 10 },
  trigger: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: theme.bg.surface, borderWidth: 1, borderColor: theme.border.default, borderRadius: theme.radius.sm, paddingHorizontal: 12, height: 42, marginBottom: theme.spacing.md },
  triggerText: { color: theme.text.primary, fontSize: 13.5, flex: 1 },
  dropdownBox: { backgroundColor: theme.bg.surfaceRaised, borderWidth: 1, borderColor: theme.border.default, borderRadius: theme.radius.sm, marginTop: -8, marginBottom: theme.spacing.md, paddingVertical: 4 },
  dropdownItem: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 12 },
  dropdownItemText: { color: theme.text.primary, fontSize: 13.5 },
  checkbox: { width: 16, height: 16, borderWidth: 1.5, borderColor: theme.border.default, borderRadius: 4 },
  checkboxChecked: { backgroundColor: theme.accent.primary, borderColor: theme.accent.primary },
  attachBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: theme.bg.surface, borderWidth: 1, borderColor: theme.border.default, borderRadius: theme.radius.sm, paddingHorizontal: 12, paddingVertical: 10, alignSelf: "flex-start" },
  attachBtnText: { color: theme.text.secondary, fontSize: 13, fontWeight: "600" },
  fileChip: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: theme.bg.surface, borderWidth: 1, borderColor: theme.border.default, borderRadius: theme.radius.pill, paddingLeft: 10, paddingRight: 8, paddingVertical: 5, marginRight: 8 },
  fileChipText: { color: theme.text.secondary, fontSize: 12, maxWidth: 120 },
  footer: { flexDirection: "row", justifyContent: "flex-end", gap: 10, padding: theme.spacing.lg, borderTopWidth: 1, borderTopColor: theme.border.subtle },
  cancelBtn: { paddingVertical: 12, paddingHorizontal: 16 },
  cancelBtnText: { color: theme.text.secondary, fontSize: 14, fontWeight: "600" },
  submitBtn: { backgroundColor: theme.accent.primary, paddingVertical: 12, paddingHorizontal: 22, borderRadius: theme.radius.md, minWidth: 150, alignItems: "center", justifyContent: "center" },
  submitBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  });
}
