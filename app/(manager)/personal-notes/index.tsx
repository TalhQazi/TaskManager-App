import React, { useEffect, useState } from "react";
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
import Colors from "@/constants/colors";

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt?: string;
}

export default function AdminPersonalNotes() {
  // Web CRUD mapping translated perfectly to Native compatibility layers
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
    <SafeAreaView style={styles.container}>
      {/* Title Header Block */}
      <View style={styles.header}>
        <Text style={styles.title}>Personal Workspace</Text>
        <Text style={styles.subtitle}>
          Keep your private notes and reminders in one place.
        </Text>
      </View>

      {/* Embedded Mobile Workspace Interface */}
      <PersonalNotes
        getNotes={getNotes}
        createNote={createNote}
        updateNote={updateNote}
        deleteNote={deleteNote}
      />
    </SafeAreaView>
  );
}

// Mobile Optimized Sub-Component matching your web layout design specification
interface PersonalNotesProps {
  getNotes: () => Promise<{ items: Note[] }>;
  createNote: (payload: Partial<Note>) => Promise<{ item: Note }>;
  updateNote: (id: string, payload: Partial<Note>) => Promise<{ item: Note }>;
  deleteNote: (id: string) => Promise<any>;
}

function PersonalNotes({ getNotes, createNote, updateNote, deleteNote }: PersonalNotesProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  
  // Form Management States
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      setIsLoading(true);
      const res = await getNotes();
      // Safeguard array unpack matching web payload normalization
      if (res && res.items) {
        setNotes(Array.isArray(res.items) ? res.items : []);
      }
    } catch (error) {
      console.error("Failed fetching notes", error);
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
        // Handle Update Route
        await updateNote(editingNote.id, { title: noteTitle, content: noteContent });
      } else {
        // Handle Create Route
        await createNote({ title: noteTitle, content: noteContent });
      }
      setModalOpen(false);
      fetchNotes();
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
            fetchNotes();
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
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Dynamic Grid / Masonry list for Native performance */}
      <FlatList
        data={notes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listPadding}
        numColumns={2}
        columnWrapperStyle={styles.gridRowGap}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <FileText size={48} color="#94a3b8" strokeWidth={1.5} />
            <Text style={styles.emptyTextTitle}>No Workspace Notes</Text>
            <Text style={styles.emptyTextSub}> Tap the blue button below to write your first reminder.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.noteCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.noteTitle} numberOfLines={1}>
                {item.title || "Untitled Note"}
              </Text>
              <Text style={styles.noteContent} numberOfLines={5}>
                {item.content || "No added description..."}
              </Text>
            </View>

            {/* Note Utility Management Rows */}
            <View style={styles.cardActionsRow}>
              <TouchableOpacity 
                style={styles.actionButton} 
                onPress={() => handleOpenEditModal(item)}
              >
                <Edit3 size={16} color="#475569" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionButton, styles.deleteAction]} 
                onPress={() => handleDeleteNote(item.id)}
              >
                <Trash2 size={16} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* Floating Action Button (FAB) for Web equivalent Action Triggers */}
      <TouchableOpacity style={styles.fabButton} onPress={handleOpenCreateModal}>
        <Plus color="#FFF" size={24} strokeWidth={2.5} />
      </TouchableOpacity>

      {/* Elegant Native Creation Sheet Overlay */}
      <Modal visible={modalOpen} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalLayout}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingNote ? "Modify Workspace Note" : "New Workspace Note"}
            </Text>
            <TouchableOpacity onPress={() => setModalOpen(false)}>
              <X color="#0f172a" size={24} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalFormContent}>
            <TextInput
              placeholder="Note Title"
              style={styles.inputTitle}
              placeholderTextColor="#94a3b8"
              value={noteTitle}
              onChangeText={setNoteTitle}
            />
            
            <TextInput
              placeholder="Start drafting your note details here..."
              style={styles.inputBody}
              placeholderTextColor="#94a3b8"
              multiline
              textAlignVertical="top"
              value={noteContent}
              onChangeText={setNoteContent}
            />
          </View>

          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={styles.cancelBtn} 
              onPress={() => setModalOpen(false)}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.saveBtn} 
              onPress={handleSaveNote}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background},
  header: { padding: 20, backgroundColor: "#FFF", borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  title: { fontSize: 24, fontWeight: "700", color: "#0f172a", tracking: "-0.5" },
  subtitle: { fontSize: 14, color: "#64748b", marginTop: 4 },
  centerBox: { flex: 1, justifyContent: "center", alignItems: "center" },
  
  // Grid Elements Layout System
  listPadding: { padding: 16, paddingBottom: 100 },
  gridRowGap: { justifyContent: "space-between", marginBottom: 12 },
  
  noteCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 14,
    width: "48.5%",
    height: 180,
    justifyContent: "space-between",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  noteTitle: { fontSize: 15, fontWeight: "600", color: "#0f172a", marginBottom: 6 },
  noteContent: { fontSize: 13, color: "#475569", lineHeight: 18 },
  
  cardActionsRow: { 
    flexDirection: "row", 
    justifyContent: "flex-end", 
    gap: 8, 
    borderTopWidth: 1, 
    borderTopColor: "#f1f5f9", 
    paddingTop: 8, 
    marginTop: 8 
  },
  actionButton: { padding: 6, borderRadius: 6, backgroundColor: "#f1f5f9" },
  deleteAction: { backgroundColor: "#fef2f2" },
  
  // Floating Action Button (FAB) Style rules
  fabButton: {
    position: "absolute",
    bottom: 24,
    right: 24,
    backgroundColor: "#2563eb",
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

  // Empty List Presentational layout styles
  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", marginTop: 80, paddingHorizontal: 32 },
  emptyTextTitle: { fontSize: 16, fontWeight: "600", color: "#334155", marginTop: 12, marginBottom: 4 },
  emptyTextSub: { fontSize: 13, color: "#64748b", textAlign: "center", lineHeight: 18 },

  // Sheet Modal Structures
  modalLayout: { flex: 1, backgroundColor: "#FFF" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#0f172a" },
  modalFormContent: { flex: 1, padding: 20 },
  inputTitle: { fontSize: 18, fontWeight: "600", color: "#0f172a", borderBottomWidth: 1, borderBottomColor: "#f1f5f9", paddingBottom: 12, marginBottom: 16 },
  inputBody: { flex: 1, fontSize: 15, color: "#334155", lineHeight: 22 },
  
  modalFooter: { flexDirection: "row", justifyContent: "flex-end", gap: 12, padding: 16, borderTopWidth: 1, borderTopColor: "#e2e8f0", backgroundColor: "#f8fafc" },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: "#FFF", borderWidth: 1, borderColor: "#e2e8f0" },
  cancelBtnText: { fontSize: 14, fontWeight: "600", color: "#475569" },
  saveBtn: { flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: "#2563eb" },
  saveBtnText: { fontSize: 14, fontWeight: "600", color: "#FFF" },
});