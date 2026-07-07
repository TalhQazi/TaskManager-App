import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { 
  Search, Plus, Trash2, Pin, Clock, ChevronLeft, FileText, Check, X, Palette 
} from "lucide-react-native";
import { format } from "date-fns";
import { Note } from "./api"; 


interface PersonalNotesProps {
  getNotes: () => Promise<{ items: Note[] }>;
  createNote: (payload: { title: string; content: string; color?: string; isPinned?: boolean }) => Promise<{ item: Note }>;
  updateNote: (id: string, payload: Partial<Note>) => Promise<{ item: Note }>;
  deleteNote: (id: string) => Promise<any>;
}

const COLORS = [
  { name: "Default", value: "transparent", nativeHex: "#18181b" },
  { name: "Blue", value: "rgba(59, 130, 246, 0.15)", nativeHex: "#1e293b" },
  { name: "Green", value: "rgba(34, 197, 94, 0.15)", nativeHex: "#14532d" },
  { name: "Yellow", value: "rgba(234, 179, 8, 0.15)", nativeHex: "#451a03" },
  { name: "Red", value: "rgba(239, 68, 68, 0.15)", nativeHex: "#451212" },
  { name: "Purple", value: "rgba(168, 85, 247, 0.15)", nativeHex: "#3b0764" },
];

export default function PersonalNotes({ getNotes, createNote, updateNote, deleteNote }: PersonalNotesProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [showColorPicker, setShowColorPicker] = useState(false);

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    setLoading(true);
    try {
      const res = await getNotes();
      setNotes(res.items || []);
    } catch (err) {
      Alert.alert("Error", "Failed to load notes");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNote = async () => {
    try {
      const { item } = await createNote({ title: "New Note", content: "", color: "transparent" });
      setNotes([item, ...notes]);
      setSelectedNote(item);
      setEditTitle(item.title);
      setEditContent(item.content);
      setIsEditing(true);
    } catch (err) {
      Alert.alert("Error", "Failed to create note");
    }
  };

  const handleSaveNote = async () => {
    if (!selectedNote) return;
    try {
      const { item } = await updateNote(selectedNote.id, { title: editTitle, content: editContent });
      setNotes(notes.map((n) => (n.id === item.id ? item : n)));
      setSelectedNote(item);
      setIsEditing(false);
    } catch (err) {
      Alert.alert("Error", "Failed to save note");
    }
  };

  const handleDeleteNote = (id: string) => {
    Alert.alert("Delete Note", "Are you sure you want to delete this note?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteNote(id);
            setNotes(notes.filter((n) => n.id !== id));
            if (selectedNote?.id === id) {
              setSelectedNote(null);
              setIsEditing(false);
            }
          } catch (err) {
            Alert.alert("Error", "Failed to delete note");
          }
        },
      },
    ]);
  };

  const togglePin = async (id: string) => {
    const note = notes.find((n) => n.id === id);
    if (!note) return;
    try {
      const { item } = await updateNote(id, { isPinned: !note.isPinned });
      setNotes(notes.map((n) => (n.id === id ? item : n)));
      if (selectedNote?.id === id) setSelectedNote(item);
    } catch (err) {
      Alert.alert("Error", "Failed to update pin");
    }
  };

  const updateColor = async (id: string, colorValue: string) => {
    try {
      const { item } = await updateNote(id, { color: colorValue });
      setNotes(notes.map((n) => (n.id === id ? item : n)));
      if (selectedNote?.id === id) setSelectedNote(item);
      setShowColorPicker(false);
    } catch (err) {
      Alert.alert("Error", "Failed to update color");
    }
  };

  const filteredNotes = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pinnedNotes = filteredNotes.filter((n) => n.isPinned);
  const otherNotes = filteredNotes.filter((n) => !n.isPinned);

  // Helper to resolve colors dynamically between web and native UI
  const getNoteBgColor = (colorValue: string) => {
    const target = COLORS.find((c) => c.value === colorValue);
    return target ? target.nativeHex : "#18181b";
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  // --- RENDERING DETAIL VIEW SCREEN PANEL ---
  if (selectedNote) {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          {/* Header Action Navbar */}
          <View style={styles.detailHeader}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => { setSelectedNote(null); setIsEditing(false); }}
            >
              <ChevronLeft color="#a1a1aa" size={24} />
              <Text style={styles.backButtonText}>Notes</Text>
            </TouchableOpacity>

            <View style={styles.headerActionsRow}>
              {isEditing ? (
                <View style={styles.actionButtonsContainer}>
                  <TouchableOpacity style={styles.iconActionBtn} onPress={() => setIsEditing(false)}>
                    <X color="#ef4444" size={20} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.iconActionBtn} onPress={handleSaveNote}>
                    <Check color="#22c55e" size={20} />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.actionButtonsContainer}>
                  <TouchableOpacity style={styles.iconActionBtn} onPress={() => setShowColorPicker(!showColorPicker)}>
                    <Palette color="#a1a1aa" size={20} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.iconActionBtn} onPress={() => togglePin(selectedNote.id)}>
                    <Pin color={selectedNote.isPinned ? "#3b82f6" : "#a1a1aa"} size={20} fill={selectedNote.isPinned ? "#3b82f6" : "transparent"} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.iconActionBtn} onPress={() => setIsEditing(true)}>
                    <FileText color="#3b82f6" size={20} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          {/* Color Picker Dropdown Bar */}
          {showColorPicker && (
            <View style={styles.colorPaletteDropdown}>
              {COLORS.map((c) => (
                <TouchableOpacity
                  key={c.name}
                  style={[
                    styles.colorCircleOption,
                    { backgroundColor: c.nativeHex },
                    selectedNote.color === c.value && styles.activeColorBorder
                  ]}
                  onPress={() => updateColor(selectedNote.id, c.value)}
                />
              ))}
            </View>
          )}

          {/* Meta Timestamp Banner */}
          <View style={styles.timestampBanner}>
            <Clock color="#71717a" size={12} />
            <Text style={styles.timestampText}>
              Last modified {format(new Date(selectedNote.updatedAt), "MMM d, yyyy 'at' h:mm a")}
            </Text>
          </View>

          {/* Core Text Inputs Area */}
          <ScrollView contentContainerStyle={styles.editorScrollContainer}>
            {isEditing ? (
              <View style={styles.inputFormContainer}>
                <TextInput
                  value={editTitle}
                  onChangeText={setEditTitle}
                  style={styles.nativeTitleInput}
                  placeholder="Note Title"
                  placeholderTextColor="rgba(255,255,255,0.2)"
                />
                <TextInput
                  value={editContent}
                  onChangeText={setEditContent}
                  style={styles.nativeContentInput}
                  placeholder="Start writing..."
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  multiline
                  textAlignVertical="top"
                />
              </View>
            ) : (
              <View style={[styles.displayStaticWrapper, { backgroundColor: getNoteBgColor(selectedNote.color) }]}>
                <Text style={styles.staticDisplayTitle}>{selectedNote.title || "Untitled"}</Text>
                <Text style={styles.staticDisplayContent}>
                  {selectedNote.content || "No content..."}
                </Text>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // --- RENDERING MASTER LIST PANEL ---
  return (
    <SafeAreaView style={styles.container}>
      {/* Title Header Bar */}
      <View style={styles.masterHeaderBar}>
        <Text style={styles.mainGradientTitle}>My Notes</Text>
        <TouchableOpacity style={styles.fabHeaderButton} onPress={handleCreateNote}>
          <Plus color="#ffffff" size={22} />
        </TouchableOpacity>
      </View>

      {/* Input Search Block */}
      <View style={styles.searchBarWrapper}>
        <Search style={styles.searchIcon} color="#71717a" size={18} />
        <TextInput
          placeholder="Search notes..."
          placeholderTextColor="#71717a"
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchFieldsNative}
        />
      </View>

      {/* Scrollable Note List Items */}
      <ScrollView contentContainerStyle={styles.notesListScroll} showsVerticalScrollIndicator={false}>
        {pinnedNotes.length > 0 && (
          <View style={styles.sectionWrap}>
            <Text style={styles.sectionLabelText}>Pinned</Text>
            {pinnedNotes.map((n) => (
              <NoteCardRow
                key={n.id}
                note={n}
                bgColor={getNoteBgColor(n.color)}
                onPress={() => {
                  setSelectedNote(n);
                  setEditTitle(n.title);
                  setEditContent(n.content);
                }}
                onPin={() => togglePin(n.id)}
                onDelete={() => handleDeleteNote(n.id)}
              />
            ))}
          </View>
        )}

        <View style={styles.sectionWrap}>
          {pinnedNotes.length > 0 && <Text style={styles.sectionLabelText}>Recent</Text>}
          {otherNotes.length > 0 ? (
            otherNotes.map((n) => (
              <NoteCardRow
                key={n.id}
                note={n}
                bgColor={getNoteBgColor(n.color)}
                onPress={() => {
                  setSelectedNote(n);
                  setEditTitle(n.title);
                  setEditContent(n.content);
                }}
                onPin={() => togglePin(n.id)}
                onDelete={() => handleDeleteNote(n.id)}
              />
            ))
          ) : (
            pinnedNotes.length === 0 && (
              <View style={styles.emptyContainerState}>
                <FileText color="#27272a" size={54} />
                <Text style={styles.emptySubtitleText}>No notes found</Text>
              </View>
            )
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// --- CHILD LOCAL ROW CARD COMPONENT ---
function NoteCardRow({ note, bgColor, onPress, onDelete, onPin }: {
  note: Note;
  bgColor: string;
  onPress: () => void;
  onDelete: () => void;
  onPin: () => void;
}) {
  return (
    <TouchableOpacity style={[styles.noteRowCardItem, { backgroundColor: bgColor }]} onPress={onPress}>
      <View style={styles.cardHeaderLine}>
        <Text style={styles.cardNoteTitle} numberOfLines={1}>{note.title || "Untitled"}</Text>
        <TouchableOpacity style={styles.smallIconClick} onPress={onPin}>
          <Pin color={note.isPinned ? "#3b82f6" : "#71717a"} size={14} fill={note.isPinned ? "#3b82f6" : "transparent"} />
        </TouchableOpacity>
      </View>

      <Text style={styles.cardBodyExcerpt} numberOfLines={2}>
        {note.content || "Empty note..."}
      </Text>

      <View style={styles.cardFooterLine}>
        <Text style={styles.cardDateStamp}>{format(new Date(note.updatedAt), "MMM d")}</Text>
        <TouchableOpacity style={styles.smallIconClick} onPress={onDelete}>
          <Trash2 color="#ef4444" size={14} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#09090b" },
  center: { justifyContent: "center", alignItems: "center" },
  masterHeaderBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, marginTop: 12, marginBottom: 16 },
  mainGradientTitle: { fontSize: 28, fontWeight: "800", color: "#ffffff", letterSpacing: -0.5 },
  fabHeaderButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#2563eb", justifyContent: "center", alignItems: "center" },
  searchBarWrapper: { flexDirection: "row", alignItems: "center", backgroundColor: "#18181b", borderWidth: 1, borderColor: "#27272a", borderRadius: 12, marginHorizontal: 16, paddingHorizontal: 12, height: 44, marginBottom: 16 },
  searchIcon: { marginRight: 8 },
  searchFieldsNative: { flex: 1, color: "#ffffff", fontSize: 15 },
  notesListScroll: { paddingHorizontal: 16, paddingBottom: 32 },
  sectionWrap: { marginBottom: 20 },
  sectionLabelText: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", color: "#a1a1aa", letterSpacing: 1, marginBottom: 8, paddingHorizontal: 4 },
  noteRowCardItem: { borderWidth: 1, borderColor: "#27272a", borderRadius: 16, padding: 16, marginBottom: 10 },
  cardHeaderLine: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  cardNoteTitle: { fontSize: 15, fontWeight: "600", color: "#f4f4f5", flex: 1, marginRight: 8 },
  smallIconClick: { padding: 6, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.03)" },
  cardBodyExcerpt: { fontSize: 13, color: "#a1a1aa", lineHeight: 18, marginBottom: 12 },
  cardFooterLine: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardDateStamp: { fontSize: 10, color: "#71717a", fontWeight: "600", textTransform: "uppercase" },
  emptyContainerState: { alignItems: "center", justifyContent: "center", paddingVertical: 64 },
  emptySubtitleText: { color: "#71717a", marginTop: 12, fontSize: 14, fontStyle: "italic" },
  detailHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 12, height: 56, borderBottomWidth: 1, borderBottomColor: "#18181b" },
  backButton: { flexDirection: "row", alignItems: "center" },
  backButtonText: { color: "#3b82f6", fontSize: 16, marginLeft: 2 },
  headerActionsRow: { flexDirection: "row", alignItems: "center" },
  actionButtonsContainer: { flexDirection: "row", gap: 6 },
  iconActionBtn: { padding: 8, borderRadius: 10, backgroundColor: "#18181b" },
  colorPaletteDropdown: { flexDirection: "row", justifyContent: "space-around", backgroundColor: "#18181b", padding: 12, borderBottomWidth: 1, borderBottomColor: "#27272a" },
  colorCircleOption: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  activeColorBorder: { ringWidth: 2, borderColor: "#2563eb", borderWidth: 2 },
  timestampBanner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, backgroundColor: "#111113" },
  timestampText: { fontSize: 11, color: "#71717a" },
  editorScrollContainer: { flexGrow: 1, padding: 16 },
  inputFormContainer: { flex: 1, gap: 16 },
  nativeTitleInput: { color: "#ffffff", fontSize: 26, fontWeight: "700", paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: "#18181b" },
  nativeContentInput: { color: "#f4f4f5", fontSize: 16, lineHeight: 24, flex: 1, minHeight: 300 },
  displayStaticWrapper: { flex: 1, padding: 16, borderRadius: 16, minHeight: Dimensions.get("window").height - 200 },
  staticDisplayTitle: { fontSize: 28, fontWeight: "800", color: "#ffffff", marginBottom: 16 },
  staticDisplayContent: { fontSize: 16, lineHeight: 26, color: "#e4e4e7" },
});