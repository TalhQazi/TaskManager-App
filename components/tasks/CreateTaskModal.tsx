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
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { X, Users, Paperclip, MapPin, Search, Check } from "lucide-react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { useTaskTheme, type TaskThemeValue } from "./theme";
import { TaskPriority, TaskStatus } from "./types";
import { convertAssetToBase64, formatFileSize, TaskAttachmentPayload } from "./fileUtils";

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
}

interface CreateTaskModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (payload: TaskFormPayload) => void;
  isSubmitting?: boolean;
  employeeOptions: { id: string; name: string }[];
  projectOptions?: { id: string; name: string }[];
  defaultProjectId?: string;
  canAssign?: boolean;
  initial?: Partial<TaskFormPayload>;
}

const PRIORITIES: TaskPriority[] = ["high", "medium", "low"];
const STATUSES: TaskStatus[] = ["pending", "in-progress", "completed"];

export default function CreateTaskModal({
  visible,
  onClose,
  onSubmit,
  isSubmitting,
  employeeOptions = [],
  projectOptions = [],
  defaultProjectId,
  canAssign = true,
  initial,
}: CreateTaskModalProps) {
  const theme = useTaskTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [title, setTitle] = useState(initial?.title || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [priority, setPriority] = useState<TaskPriority>(initial?.priority || "medium");
  const [status, setStatus] = useState<TaskStatus>((initial?.status as TaskStatus) || "pending");
  const [assignees, setAssignees] = useState<string[]>(initial?.assignees || []);
  const [showAssignees, setShowAssignees] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [customAssignee, setCustomAssignee] = useState("");
  const [location, setLocation] = useState(initial?.location || "");
  const [dueDate, setDueDate] = useState<string | undefined>(initial?.dueDate);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [projectId, setProjectId] = useState<string | undefined>(initial?.projectId || defaultProjectId);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [attachments, setAttachments] = useState<TaskAttachmentPayload[]>([]);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);

  const reset = () => {
    setTitle("");
    setDescription("");
    setPriority("medium");
    setStatus("pending");
    setAssignees([]);
    setShowAssignees(false);
    setAssigneeSearch("");
    setCustomAssignee("");
    setLocation("");
    setDueDate(undefined);
    setProjectId(defaultProjectId);
    setAttachments([]);
    setIsProcessingFiles(false);
  };

  const handlePickAttachments = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "*/*", multiple: true });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setIsProcessingFiles(true);
        const converted = await Promise.all(result.assets.map((a) => convertAssetToBase64(a)));
        setAttachments((prev) => [...prev, ...converted]);
      }
    } catch (err) {
      console.log("[CreateTaskModal] attachment pick failed", err);
      Alert.alert("Attachment Error", "Could not read the selected file(s).");
    } finally {
      setIsProcessingFiles(false);
    }
  };

  const toggleAssignee = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setAssignees((prev) => (prev.includes(trimmed) ? prev.filter((n) => n !== trimmed) : [...prev, trimmed]));
  };

  const addCustomAssignee = () => {
    const trimmed = customAssignee.trim();
    if (!trimmed) return;
    if (!assignees.includes(trimmed)) {
      setAssignees((prev) => [...prev, trimmed]);
    }
    setCustomAssignee("");
  };

  const filteredEmployees = useMemo(() => {
    if (!assigneeSearch.trim()) return employeeOptions;
    const q = assigneeSearch.toLowerCase();
    return employeeOptions.filter((e) => e.name.toLowerCase().includes(q));
  }, [employeeOptions, assigneeSearch]);

  const handleSubmit = () => {
    if (!title.trim()) {
      Alert.alert("Title required", "Give the task a name before saving.");
      return;
    }
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      priority,
      status,
      assignees,
      location,
      dueDate,
      projectId,
      attachments,
    });
    reset();
  };

  const projectName = projectOptions.find((p) => p.id === projectId)?.name;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>New Task</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={20} color={theme.text.secondary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Task title *"
              placeholderTextColor={theme.text.tertiary}
              style={styles.titleInput}
              autoFocus
            />
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Description (optional)"
              placeholderTextColor={theme.text.tertiary}
              style={[styles.input, styles.textArea]}
              multiline
            />

            <FieldLabel>Priority</FieldLabel>
            <View style={styles.segmentRow}>
              {PRIORITIES.map((p) => (
                <TouchableOpacity key={p} style={[styles.segment, priority === p && styles.segmentActive]} onPress={() => setPriority(p)}>
                  <Text style={[styles.segmentText, priority === p && styles.segmentTextActive]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <FieldLabel>Status</FieldLabel>
            <View style={styles.segmentRow}>
              {STATUSES.map((s) => (
                <TouchableOpacity key={s} style={[styles.segment, status === s && styles.segmentActive]} onPress={() => setStatus(s)}>
                  <Text style={[styles.segmentText, status === s && styles.segmentTextActive]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <FieldLabel>Due Date</FieldLabel>
            <TouchableOpacity style={styles.trigger} onPress={() => setShowDatePicker(true)}>
              <Text style={styles.triggerText}>{dueDate ? new Date(dueDate).toLocaleDateString() : "No due date"}</Text>
            </TouchableOpacity>

            {projectOptions.length > 0 && (
              <>
                <FieldLabel>Project</FieldLabel>
                <TouchableOpacity style={styles.trigger} onPress={() => setShowProjectPicker((v) => !v)}>
                  <Text style={styles.triggerText}>{projectName || "No project (Inbox)"}</Text>
                </TouchableOpacity>
                {showProjectPicker && (
                  <View style={styles.dropdownBox}>
                    <TouchableOpacity style={styles.dropdownItem} onPress={() => { setProjectId(undefined); setShowProjectPicker(false); }}>
                      <Text style={styles.dropdownItemText}>No project (Inbox)</Text>
                    </TouchableOpacity>
                    {projectOptions.map((p) => (
                      <TouchableOpacity key={p.id} style={styles.dropdownItem} onPress={() => { setProjectId(p.id); setShowProjectPicker(false); }}>
                        <Text style={styles.dropdownItemText}>{p.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            )}

            <FieldLabel>Location</FieldLabel>
            <View style={styles.inputRow}>
              <MapPin size={15} color={theme.text.tertiary} />
              <TextInput
                value={location}
                onChangeText={setLocation}
                placeholder="Optional"
                placeholderTextColor={theme.text.tertiary}
                style={styles.inputRowText}
              />
            </View>

            {canAssign && (
              <>
                <FieldLabel>Assignees {assignees.length > 0 ? `(${assignees.length})` : ""}</FieldLabel>
                <TouchableOpacity style={styles.trigger} onPress={() => setShowAssignees((v) => !v)}>
                  <Users size={15} color={theme.text.tertiary} />
                  <Text style={styles.triggerText} numberOfLines={1}>
                    {assignees.length > 0 ? assignees.join(", ") : "Select assignees…"}
                  </Text>
                </TouchableOpacity>

                {assignees.length > 0 && (
                  <View style={styles.chipsContainer}>
                    {assignees.map((name) => (
                      <View key={name} style={styles.assigneeChip}>
                        <Text style={styles.assigneeChipText}>{name}</Text>
                        <TouchableOpacity onPress={() => toggleAssignee(name)}>
                          <X size={12} color={theme.text.secondary} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                {showAssignees && (
                  <View style={styles.dropdownBox}>
                    {employeeOptions.length > 5 && (
                      <View style={styles.searchBar}>
                        <Search size={14} color={theme.text.tertiary} />
                        <TextInput
                          value={assigneeSearch}
                          onChangeText={setAssigneeSearch}
                          placeholder="Search employees…"
                          placeholderTextColor={theme.text.tertiary}
                          style={styles.searchBarInput}
                        />
                      </View>
                    )}

                    <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled>
                      {filteredEmployees.map((emp) => {
                        const checked = assignees.includes(emp.name);
                        return (
                          <TouchableOpacity key={emp.id} style={styles.dropdownItem} onPress={() => toggleAssignee(emp.name)}>
                            <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                              {checked && <Check size={11} color="#fff" strokeWidth={3} />}
                            </View>
                            <Text style={styles.dropdownItemText}>{emp.name}</Text>
                          </TouchableOpacity>
                        );
                      })}
                      {filteredEmployees.length === 0 && (
                        <Text style={styles.emptyDropdownText}>No matching employees found.</Text>
                      )}
                    </ScrollView>

                    <View style={styles.customAddRow}>
                      <TextInput
                        value={customAssignee}
                        onChangeText={setCustomAssignee}
                        placeholder="Add custom name…"
                        placeholderTextColor={theme.text.tertiary}
                        style={styles.customAddInput}
                        onSubmitEditing={addCustomAssignee}
                      />
                      <TouchableOpacity style={styles.customAddBtn} onPress={addCustomAssignee}>
                        <Text style={styles.customAddBtnText}>Add</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </>
            )}

            <FieldLabel>Attachments {attachments.length > 0 ? `(${attachments.length})` : ""}</FieldLabel>
            <TouchableOpacity style={styles.attachBtn} onPress={handlePickAttachments} disabled={isProcessingFiles}>
              {isProcessingFiles ? (
                <ActivityIndicator size="small" color={theme.accent.primary} />
              ) : (
                <>
                  <Paperclip size={15} color={theme.text.secondary} />
                  <Text style={styles.attachBtnText}>Add files</Text>
                </>
              )}
            </TouchableOpacity>

            {attachments.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                {attachments.map((f, i) => (
                  <View key={i} style={styles.fileChip}>
                    <Paperclip size={12} color={theme.text.tertiary} />
                    <View style={{ maxWidth: 140 }}>
                      <Text style={styles.fileChipText} numberOfLines={1}>{f.fileName}</Text>
                      {f.size > 0 && (
                        <Text style={styles.fileSizeText}>{formatFileSize(f.size)}</Text>
                      )}
                    </View>
                    <TouchableOpacity onPress={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))}>
                      <X size={14} color={theme.accent.danger} />
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
            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={isSubmitting || isProcessingFiles}>
              {isSubmitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitBtnText}>Create Task</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>

      <DateTimePickerModal
        isVisible={showDatePicker}
        mode="date"
        onConfirm={(date) => { setDueDate(date.toISOString()); setShowDatePicker(false); }}
        onCancel={() => setShowDatePicker(false)}
      />
    </Modal>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  const theme = useTaskTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return <Text style={styles.fieldLabel}>{children}</Text>;
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.border.subtle,
  },
  headerTitle: { fontSize: 16, fontWeight: "700", color: theme.text.primary },
  body: { padding: theme.spacing.lg, gap: 4 },
  titleInput: { fontSize: 17, fontWeight: "700", color: theme.text.primary, paddingVertical: 8, marginBottom: 8 },
  input: {
    backgroundColor: theme.bg.surface,
    borderWidth: 1,
    borderColor: theme.border.default,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: theme.text.primary,
    fontSize: 13.5,
    marginBottom: theme.spacing.md,
  },
  textArea: { minHeight: 70, textAlignVertical: "top" },
  fieldLabel: { fontSize: 12, fontWeight: "700", color: theme.text.tertiary, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8, marginTop: 4 },
  segmentRow: { flexDirection: "row", gap: 6, backgroundColor: theme.bg.surface, padding: 4, borderRadius: theme.radius.sm, borderWidth: 1, borderColor: theme.border.default, marginBottom: theme.spacing.md },
  segment: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: theme.radius.sm - 2 },
  segmentActive: { backgroundColor: theme.accent.primary },
  segmentText: { color: theme.text.tertiary, fontSize: 12, fontWeight: "600", textTransform: "capitalize" },
  segmentTextActive: { color: "#fff" },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: theme.bg.surface,
    borderWidth: 1,
    borderColor: theme.border.default,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: theme.spacing.md,
  },
  triggerText: { color: theme.text.primary, fontSize: 13.5, flex: 1 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: theme.bg.surface,
    borderWidth: 1,
    borderColor: theme.border.default,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: theme.spacing.md,
  },
  inputRowText: { flex: 1, color: theme.text.primary, fontSize: 13.5 },
  dropdownBox: {
    backgroundColor: theme.bg.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.border.default,
    borderRadius: theme.radius.sm,
    marginTop: -8,
    marginBottom: theme.spacing.md,
    paddingVertical: 4,
  },
  dropdownItem: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 12 },
  dropdownItemText: { color: theme.text.primary, fontSize: 13.5 },
  chipsContainer: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: theme.spacing.md },
  assigneeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: theme.accent.primarySoft,
    borderRadius: theme.radius.pill,
    paddingLeft: 10,
    paddingRight: 8,
    paddingVertical: 4,
  },
  assigneeChipText: { color: theme.accent.primary, fontSize: 12, fontWeight: "600" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.border.subtle,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchBarInput: { flex: 1, color: theme.text.primary, fontSize: 13, padding: 0 },
  customAddRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: theme.border.subtle,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  customAddInput: {
    flex: 1,
    backgroundColor: theme.bg.surface,
    borderWidth: 1,
    borderColor: theme.border.default,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12.5,
    color: theme.text.primary,
  },
  customAddBtn: {
    backgroundColor: theme.accent.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: theme.radius.sm,
  },
  customAddBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  emptyDropdownText: { padding: 12, color: theme.text.tertiary, fontSize: 12, textAlign: "center" },
  fileSizeText: { color: theme.text.tertiary, fontSize: 10, marginTop: 1 },
  checkbox: { width: 18, height: 18, borderWidth: 1.5, borderColor: theme.border.default, borderRadius: 4, alignItems: "center", justifyContent: "center" },
  checkboxChecked: { backgroundColor: theme.accent.primary, borderColor: theme.accent.primary },
  attachBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: theme.bg.surface, borderWidth: 1, borderColor: theme.border.default, borderRadius: theme.radius.sm, paddingHorizontal: 12, paddingVertical: 10, alignSelf: "flex-start" },
  attachBtnText: { color: theme.text.secondary, fontSize: 13, fontWeight: "600" },
  fileChip: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: theme.bg.surface, borderWidth: 1, borderColor: theme.border.default, borderRadius: theme.radius.pill, paddingLeft: 10, paddingRight: 8, paddingVertical: 5, marginRight: 8 },
  fileChipText: { color: theme.text.secondary, fontSize: 12, maxWidth: 120 },
  footer: { flexDirection: "row", justifyContent: "flex-end", gap: 10, padding: theme.spacing.lg, borderTopWidth: 1, borderTopColor: theme.border.subtle },
  cancelBtn: { paddingVertical: 12, paddingHorizontal: 16 },
  cancelBtnText: { color: theme.text.secondary, fontSize: 14, fontWeight: "600" },
  submitBtn: { backgroundColor: theme.accent.primary, paddingVertical: 12, paddingHorizontal: 22, borderRadius: theme.radius.md, minWidth: 130, alignItems: "center", justifyContent: "center" },
  submitBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  });
}
