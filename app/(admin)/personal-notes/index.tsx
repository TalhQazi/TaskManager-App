import React, { useEffect, useMemo, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { Plus, Trash2, Edit3, FileText, X, Check } from "lucide-react-native";
import { apiFetch } from "@/lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt?: string;
}

interface PersonalNotesProps {
  getNotes: () => Promise<{ items: Note[] }>;
  createNote: (payload: Partial<Note>) => Promise<{ item: Note }>;
  updateNote: (id: string, payload: Partial<Note>) => Promise<{ item: Note }>;
  deleteNote: (id: string) => Promise<unknown>;
  colors: any;
  styles: any;
}

function PersonalNotes({ getNotes, createNote, updateNote, deleteNote, colors, styles }: PersonalNotesProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    void fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      setIsLoading(true);
      const res = await getNotes();
      if (res && res.items) {
        setNotes(Array.isArray(res.items) ? res.items : []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingNote(null);
    setNoteTitle("");
    setNoteContent("");
    setModalOpen(true);
  };

  const handleOpenEditModal = (note: Note) => {
    setEditingNote(note);
    setNoteTitle(note.title || "");
    setNoteContent(note.content || "");
    setModalOpen(true);
  };

  const handleSaveNote = async () => {
    if (!noteTitle.trim() && !noteContent.trim()) {
      Alert.alert("Empty Note", "Please provide a title or some content for your note.");
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingNote) {
        await updateNote(editingNote.id, { title: noteTitle, content: noteContent });
      } else {
        await createNote({ title: noteTitle, content: noteContent });
      }
      setModalOpen(false);
      void fetchNotes();
    } catch (error) {
      Alert.alert("Execution Error", "Could not synchronize note change to server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteNote = (id: string) => {
    Alert.alert("Delete Note", "Are you sure you want to permanently delete this note?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteNote(id);
            void fetchNotes();
          } catch (error) {
            Alert.alert("Error", "Failed to remove the note.");
          }
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={notes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listPadding}
        numColumns={2}
        columnWrapperStyle={styles.gridRowGap}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <FileText size={48} color={colors.muted} strokeWidth={1.5} />
            <Text style={[styles.emptyTextTitle, { color: colors.text }]}>No Workspace Notes</Text>
            <Text style={[styles.emptyTextSub, { color: colors.muted }]}>Tap the button below to write your first reminder.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.noteCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.noteTitle, { color: colors.text }]} numberOfLines={1}>
                {item.title || "Untitled Note"}
              </Text>
              <Text style={[styles.noteContent, { color: colors.muted }]} numberOfLines={5}>
                {item.content || "No added description..."}
              </Text>
            </View>

            <View style={[styles.cardActionsRow, { borderTopColor: colors.border }]}>
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: colors.inputBg }]} 
                onPress={() => handleOpenEditModal(item)}
              >
                <Edit3 size={16} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionButton, styles.deleteAction, { backgroundColor: colors.dangerBg }]} 
                onPress={() => handleDeleteNote(item.id)}
              >
                <Trash2 size={16} color={colors.danger} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <TouchableOpacity style={[styles.fabButton, { backgroundColor: colors.primary }]} onPress={handleOpenCreateModal}>
        <Plus color="#FFF" size={24} strokeWidth={2.5} />
      </TouchableOpacity>

      <Modal visible={modalOpen} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={[styles.modalLayout, { backgroundColor: colors.background }]}
        >
          <View style={[styles.modalHeader, { borderBottomColor: colors.border, backgroundColor: colors.cardBg }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {editingNote ? "Modify Workspace Note" : "New Workspace Note"}
            </Text>
            <TouchableOpacity onPress={() => setModalOpen(false)}>
              <X color={colors.text} size={24} />
            </TouchableOpacity>
          </View>

          <View style={[styles.modalFormContent, { backgroundColor: colors.background }]}>
            <TextInput
              placeholder="Note Title"
              style={[styles.inputTitle, { color: colors.text, borderBottomColor: colors.border }]}
              placeholderTextColor={colors.muted}
              value={noteTitle}
              onChangeText={setNoteTitle}
            />
            
            <TextInput
              placeholder="Start drafting your note details here..."
              style={[styles.inputBody, { color: colors.text }]}
              placeholderTextColor={colors.muted}
              multiline
              textAlignVertical="top"
              value={noteContent}
              onChangeText={setNoteContent}
            />
          </View>

          <View style={[styles.modalFooter, { borderTopColor: colors.border, backgroundColor: colors.cardBg }]}>
            <TouchableOpacity 
              style={[styles.cancelBtn, { backgroundColor: colors.background, borderColor: colors.border }]} 
              onPress={() => setModalOpen(false)}
            >
              <Text style={[styles.cancelBtnText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.saveBtn, { backgroundColor: colors.primary }]} 
              onPress={() => { void handleSaveNote(); }}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Check size={16} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={styles.saveBtnText}>Save Note</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

export default function AdminPersonalNotes() {
  const { uiTheme } = useTheme();
 // const isDark = uiTheme?.theme === "dark" || uiTheme?.theme === "metallic-elite";
 const isDark = useMemo(
    () => ["dark-minimal", "neon-tech", "metallic-elite", "executive-black", "high-contrast", "energy-mode"].includes(uiTheme.theme),
    [uiTheme.theme]
  );
  const colors = useMemo(() => ({
    background: uiTheme?.panelColors?.dashboardBackground || (isDark ? "#0F172A" : "#F8FAFC"),
    cardBg: uiTheme?.panelColors?.dashboardCardBackground || (isDark ? "#1E293B" : "#FFFFFF"),
    text: uiTheme?.panelColors?.dashboardTextColor || (isDark ? "#FFFFFF" : "#0F172A"),
    muted: isDark ? "#94A3B8" : "#64748B",
    border: isDark ? "#334155" : "#E2E8F0",
    primary: uiTheme?.customColors?.primary || "#2563eb",
    inputBg: isDark ? "#0F172A" : "#F1F5F9",
    danger: "#EF4444",
    dangerBg: isDark ? "rgba(239, 68, 68, 0.15)" : "#FEF2F2"
  }), [uiTheme, isDark]);

  const styles = useMemo(() => createStyles(colors), [colors]);

  const getNotes = () => apiFetch<{ items: Note[] }>("/api/notes");
  
  const createNote = (payload: Partial<Note>) =>
    apiFetch<{ item: Note }>("/api/notes", {
      method: "POST",
      body: JSON.stringify(payload),
    });

  const updateNote = (id: string, payload: Partial<Note>) =>
    apiFetch<{ item: Note }>(`/api/notes/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });

  const deleteNote = (id: string) =>
    apiFetch(`/api/notes/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.cardBg, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Personal Workspace</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          Keep your private notes and reminders in one place.
        </Text>
      </View>

      <PersonalNotes
        getNotes={getNotes}
        createNote={createNote}
        updateNote={updateNote}
        deleteNote={deleteNote}
        colors={colors}
        styles={styles}
      />
    </SafeAreaView>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1 },
    header: { padding: 20, borderBottomWidth: 1 },
    title: { fontSize: 24, fontWeight: "700", letterSpacing: -0.5 },
    subtitle: { fontSize: 14, marginTop: 4 },
    centerBox: { flex: 1, justifyContent: "center", alignItems: "center" },
    listPadding: { padding: 16, paddingBottom: 100 },
    gridRowGap: { justifyContent: "space-between", marginBottom: 12 },
    noteCard: {
      borderRadius: 12,
      borderWidth: 1,
      padding: 14,
      width: "48.5%",
      height: 180,
      justifyContent: "space-between",
      shadowColor: "#0F172A",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.03,
      shadowRadius: 2,
      elevation: 1,
    },
    noteTitle: { fontSize: 15, fontWeight: "600", marginBottom: 6 },
    noteContent: { fontSize: 13, lineHeight: 18 },
    cardActionsRow: { 
      flexDirection: "row", 
      justifyContent: "flex-end", 
      gap: 8, 
      borderTopWidth: 1, 
      paddingTop: 8, 
      marginTop: 8 
    },
    actionButton: { padding: 6, borderRadius: 6 },
    deleteAction: {},
    fabButton: {
      position: "absolute",
      bottom: 24,
      right: 24,
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#2563eb",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 5,
    },
    emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", marginTop: 80, paddingHorizontal: 32 },
    emptyTextTitle: { fontSize: 16, fontWeight: "600", marginTop: 12, marginBottom: 4 },
    emptyTextSub: { fontSize: 13, textAlign: "center", lineHeight: 18 },
    modalLayout: { flex: 1 },
    modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1 },
    modalTitle: { fontSize: 18, fontWeight: "700" },
    modalFormContent: { flex: 1, padding: 20 },
    inputTitle: { fontSize: 18, fontWeight: "600", borderBottomWidth: 1, paddingBottom: 12, marginBottom: 16 },
    inputBody: { flex: 1, fontSize: 15, lineHeight: 22 },
    modalFooter: { flexDirection: "row", justifyContent: "flex-end", gap: 12, padding: 16, borderTopWidth: 1 },
    cancelBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1 },
    cancelBtnText: { fontSize: 14, fontWeight: "600" },
    saveBtn: { flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
    saveBtnText: { fontSize: 14, fontWeight: "600", color: "#FFF" },
  });
}