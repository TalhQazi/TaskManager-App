import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
  Platform,
  Share,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as DocumentPicker from "expo-document-picker";
import { format } from "date-fns";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { s, wp, hp, fs } from "@/util/styles";

import {
  Search,
  Plus,
  Trash2,
  Pin,
  Calendar as CalendarIcon,
  Clock,
  BookOpen,
  X,
  Folder as FolderIcon,
  Star,
  Lock,
  Globe,
  CornerDownRight,
  Grid,
  ChevronDown,
  LayoutGrid,
  List,
  ArrowUpDown,
  Sparkles,
  CheckSquare,
  ListPlus,
  Upload,
  Download,
  Copy,
  FileText,
  Check,
  Bold,
  Italic,
  Underline,
  Table as TableIcon,
  Link as LinkIcon,
  FileCode,
  Image as ImageIcon,
  Play,
} from "lucide-react-native";

interface Attachment {
  fileName: string;
  url: string;
  mimeType: string;
  size: number;
}

interface ActionItem {
  text: string;
  completed: boolean;
}

interface Note {
  id: string;
  title: string;
  content: string;
  color: string;
  isPinned: boolean;
  isFavorite: boolean;
  folder: string;
  tags: string[];
  actionItems: ActionItem[];
  notesList: string[];
  attachments: Attachment[];
  updatedAt: string;
  createdAt: string;
}

interface PersonalNotesProps {
  getNotes: () => Promise<{ items: Note[] }>;
  createNote: (payload: {
    title: string;
    content: string;
    color?: string;
    isPinned?: boolean;
    isFavorite?: boolean;
    folder?: string;
    tags?: string[];
    actionItems?: ActionItem[];
    notesList?: string[];
    attachments?: Attachment[];
  }) => Promise<{ item: Note }>;
  updateNote: (id: string, payload: Partial<Note>) => Promise<{ item: Note }>;
  deleteNote: (id: string) => Promise<any>;
}

const DEFAULT_FOLDERS = [
  "Business",
  "Operations",
  "Patents",
  "Research",
  "Employees",
  "Marketing",
  "Projects",
  "Finance",
  "Legal",
  "Personal",
];

const COLORS = [
  { name: "Default", value: "rgba(30, 41, 59, 0.5)" },
  { name: "Blue", value: "rgba(79, 124, 255, 0.25)" },
  { name: "Green", value: "rgba(22, 199, 132, 0.25)" },
  { name: "Yellow", value: "rgba(245, 158, 11, 0.25)" },
  { name: "Red", value: "rgba(239, 68, 68, 0.25)" },
  { name: "Purple", value: "rgba(168, 85, 247, 0.25)" },
];

function buildColors(uiTheme: any, isDark: boolean) {
  return {
    background: uiTheme.panelColors?.dashboardBackground || (isDark ? "#0B0F17" : "#f8fafc"),
    panelHeader: isDark ? "#161B22" : "#ffffff",
    cardBg: uiTheme.panelColors?.dashboardCardBackground || (isDark ? "#111827" : "#f1f5f9"),
    text: uiTheme.panelColors?.dashboardTextColor || (isDark ? "#f1f5f9" : "#0f172a"),
    textSecondary: isDark ? "#9CA3AF" : "#475569",
    border: isDark ? "#2B313D" : "#e2e8f0",
    primary: uiTheme.customColors?.primary || "#4F7CFF",
    success: "#16C784",
    warning: "#F59E0B",
    danger: "#EF4444",
    purple: "#A855F7",
  };
}

function createStyles(colors: ReturnType<typeof buildColors>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: wp(4),
      paddingVertical: hp(1.5),
      backgroundColor: colors.panelHeader,
      borderBottomWidth: 1,
      borderColor: colors.border,
    },
    headerInfoBlock: {
      flexDirection: "row",
      alignItems: "center",
      gap: wp(2.5),
    },
    iconWrap: {
      padding: wp(2),
      backgroundColor: "rgba(79, 124, 255, 0.1)",
      borderRadius: wp(2.5),
      borderWidth: 1,
      borderColor: "rgba(79, 124, 255, 0.2)",
    },
    headerTitleText: {
      fontSize: fs(4),
      fontWeight: "900",
      color: colors.background,
    },
    headerSubtitleText: {
      fontSize: fs(2.2),
      color: colors.textSecondary,
      fontWeight: "600",
    },
    actionHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: wp(2),
    },
    quickAddBtn: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.primary,
      paddingVertical: hp(0.8),
      paddingHorizontal: wp(3),
      borderRadius: wp(2.5),
      gap: wp(1),
    },
    quickAddBtnText: {
      color: "#ffffff",
      fontSize: fs(2.8),
      fontWeight: "700",
    },
    avatarCircle: {
      width: wp(7),
      height: wp(7),
      borderRadius: wp(3.5),
      backgroundColor: "rgba(79, 124, 255, 0.25)",
      borderWidth: 1,
      borderColor: "rgba(79, 124, 255, 0.35)",
      alignItems: "center",
      justifyContent: "center",
    },
    avatarLetter: {
      color: colors.primary,
      fontSize: fs(2.8),
      fontWeight: "700",
    },
    searchFilterSection: {
      padding: wp(3),
      borderBottomWidth: 1,
      borderColor: colors.border,
      gap: hp(1),
    },
    searchContainerRow: {
      flexDirection: "row",
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: wp(2.5),
      alignItems: "center",
      paddingHorizontal: wp(2.5),
      flex: 1,
    },
    searchBarInput: {
      flex: 1,
      height: hp(4.5),
      fontSize: fs(3.2),
      color: colors.text,
    },
    deckLayoutToggleRow: {
      flexDirection: "row",
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: wp(2.5),
      padding: wp(0.5),
    },
    deckToggleBtn: {
      padding: wp(1.5),
      borderRadius: wp(2),
    },
    deckToggleBtnActive: {
      backgroundColor: colors.border,
    },
    horizontalScroller: {
      paddingVertical: hp(0.5),
    },
    scrollerContentGap: {
      paddingHorizontal: wp(1),
      gap: wp(1.5),
    },
    pillsFilterBtn: {
      paddingHorizontal: wp(3),
      paddingVertical: hp(0.6),
      borderRadius: wp(2),
      borderWidth: 1,
    },
    pillsFilterBtnText: {
      fontSize: fs(2.5),
      fontWeight: "700",
      textTransform: "uppercase",
    },
    listScrollerArea: {
      flex: 1,
    },
    listScrollerContent: {
      padding: wp(3),
      paddingBottom: hp(5),
    },
    chronologicalGroupLabel: {
      fontSize: fs(2.2),
      fontWeight: "800",
      color: colors.textSecondary,
      letterSpacing: 1,
      textTransform: "uppercase",
      marginTop: hp(1.5),
      marginBottom: hp(0.8),
      paddingHorizontal: wp(1),
    },
    gridStructureLayout: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: wp(2),
    },
    listStructureLayout: {
      gap: hp(1),
    },
    cardUnitWrapper: {
      backgroundColor: colors.cardBg,
      borderRadius: wp(3),
      borderWidth: 1,
      padding: wp(3),
    },
    cardUnitTopRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: wp(1),
    },
    cardUnitTitle: {
      fontSize: fs(3.2),
      fontWeight: "700",
      flex: 1,
    },
    cardUnitBodyPreview: {
      fontSize: fs(2.8),
      color: colors.textSecondary,
      marginTop: hp(0.5),
      lineHeight: fs(3.8),
    },
    cardUnitFooterRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: hp(1.2),
      borderTopWidth: 1,
      borderColor: "rgba(255,255,255,0.05)",
      paddingTop: hp(0.8),
    },
    cardUnitDateText: {
      fontSize: fs(2.2),
      color: colors.textSecondary,
      fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    },
    cardUnitBadgeScroller: {
      flexDirection: "row",
      gap: wp(1),
      marginTop: hp(0.8),
    },
    cardUnitTagPill: {
      fontSize: fs(2),
      paddingHorizontal: wp(1.2),
      paddingVertical: hp(0.2),
      backgroundColor: "#0B0F17",
      color: colors.textSecondary,
      borderRadius: wp(1),
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.05)",
      fontWeight: "700",
    },
    fallbackCenterBlock: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: hp(10),
      gap: hp(1),
    },
    fallbackCenterText: {
      color: colors.textSecondary,
      fontSize: fs(3),
      fontStyle: "italic",
    },
    modalCanvasViewport: {
      flex: 1,
      backgroundColor: colors.background,
    },
    modalHeaderNavBar: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: wp(4),
      borderBottomWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.panelHeader,
    },
    modalHeaderTitleText: {
      fontSize: fs(3.5),
      fontWeight: "700",
      color: colors.background,
    },
    modalCloseButtonCircle: {
      padding: wp(1),
    },
    modalScrollBodyContainer: {
      paddingBottom: hp(6),
    },
    breadcrumbsRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: wp(4),
      paddingTop: hp(1.5),
      gap: wp(1),
    },
    breadcrumbsLabelText: {
      fontSize: fs(2.8),
      fontWeight: "600",
      color: colors.textSecondary,
    },
    canvasNoteTitleBlock: {
      paddingHorizontal: wp(4),
      paddingVertical: hp(1.5),
      borderBottomWidth: 1,
      borderColor: "rgba(255,255,255,0.03)",
    },
    canvasNoteTitleInput: {
      fontSize: fs(5.2),
      fontWeight: "800",
      color: colors.text,
      padding: 0,
    },
    canvasNoteTitleHeading: {
      fontSize: fs(5.2),
      fontWeight: "800",
      color: colors.text,
    },
    paletteRowBlock: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: wp(4),
      paddingVertical: hp(1),
      gap: wp(1.5),
      backgroundColor: "rgba(0,0,0,0.1)",
    },
    paletteDotUnit: {
      width: wp(4),
      height: wp(4),
      borderRadius: wp(2),
      borderWidth: 1,
      borderColor: "#000000",
    },
    richToolbarStrip: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: wp(3),
      paddingVertical: hp(0.8),
      backgroundColor: colors.panelHeader,
      borderBottomWidth: 1,
      borderColor: colors.border,
      gap: wp(1),
    },
    richToolbarBtnUnit: {
      padding: wp(1.5),
      borderRadius: wp(1.5),
    },
    canvasSectionCard: {
      marginHorizontal: wp(4),
      marginTop: hp(2),
      backgroundColor: "rgba(22, 27, 34, 0.4)",
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: wp(4),
      padding: wp(3.5),
      gap: hp(1.2),
    },
    canvasSectionHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderBottomWidth: 1,
      borderColor: "rgba(255,255,255,0.05)",
      paddingBottom: hp(0.8),
    },
    canvasSectionHeaderLabelBlock: {
      flexDirection: "row",
      alignItems: "center",
      gap: wp(1.5),
    },
    canvasSectionHeaderLabelText: {
      fontSize: fs(2.5),
      fontWeight: "700",
      color: colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    canvasSectionCounterText: {
      fontSize: fs(2.2),
      color: colors.textSecondary,
      fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    },
    overviewTextareaInput: {
      fontSize: fs(3.5),
      color: colors.text,
      lineHeight: fs(5),
      textAlignVertical: "top",
      padding: 0,
    },
    overviewStaticText: {
      fontSize: fs(3.5),
      color: colors.text,
      lineHeight: fs(5),
    },
    checklistItemRowUnit: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: "rgba(11, 15, 23, 0.6)",
      padding: wp(2),
      borderRadius: wp(2.5),
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.03)",
      gap: wp(2),
    },
    checklistInteractiveBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: wp(2),
      flex: 1,
    },
    checklistCustomCheckbox: {
      width: wp(4),
      height: wp(4),
      borderRadius: wp(1),
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    checklistLabelText: {
      fontSize: fs(3.2),
      fontWeight: "600",
      flex: 1,
    },
    canvasInlineFormRow: {
      flexDirection: "row",
      gap: wp(2),
      marginTop: hp(0.5),
    },
   canvasInlineFormInput: {
      flex: 1,
      backgroundColor: "#0B0F17",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.05)",
      borderRadius: wp(2.5),
      paddingHorizontal: wp(2.5),
      paddingVertical: hp(1.2), 
      fontSize: fs(3),
      color: colors.text,
      textAlignVertical: "center", 
    },
    canvasInlineFormBtn: {
      height: hp(4.2),
      paddingHorizontal: wp(3),
      borderRadius: wp(2.5),
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1,
    },
    canvasInlineFormBtnText: {
      fontSize: fs(2.8),
      fontWeight: "700",
    },
    attachmentCardUnit: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.cardBg,
      padding: wp(2.5),
      borderRadius: wp(3),
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: hp(0.8),
    },
    attachmentMetaBlock: {
      flexDirection: "row",
      alignItems: "center",
      gap: wp(2),
      flex: 1,
    },
    attachmentIconContainer: {
      padding: wp(1.5),
      backgroundColor: "#0B0F17",
      borderRadius: wp(2),
    },
    attachmentTitleText: {
      fontSize: fs(3),
      fontWeight: "700",
      color: colors.text,
    },
    attachmentSizeText: {
      fontSize: fs(2.2),
      color: colors.textSecondary,
      fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
      marginTop: hp(0.2),
    },
    attachmentActionGroup: {
      flexDirection: "row",
      alignItems: "center",
      gap: wp(1),
    },
    attachmentActionBtn: {
      padding: wp(1.5),
      backgroundColor: "#0B0F17",
      borderRadius: wp(1.5),
      borderWidth: 1,
      borderColor: colors.border,
    },
    aiOutputWrapperBox: {
      marginHorizontal: wp(4),
      marginTop: hp(2),
      backgroundColor: "rgba(79, 124, 255, 0.08)",
      borderWidth: 1,
      borderColor: "rgba(79, 124, 255, 0.2)",
      borderRadius: wp(4),
      padding: wp(3.5),
      position: "relative",
    },
    aiOutputTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: wp(1.5),
      marginBottom: hp(0.8),
    },
    aiOutputTitleText: {
      fontSize: fs(2.5),
      fontWeight: "700",
      color: colors.primary,
      textTransform: "uppercase",
    },
    aiOutputContentText: {
      fontSize: fs(3.2),
      lineHeight: fs(4.5),
      color: colors.text,
      fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    },
    aiOutputDismissBtn: {
      position: "absolute",
      top: hp(1.2),
      right: wp(2.5),
      padding: wp(1),
    },
    aiOutputConnectionsBox: {
      marginTop: hp(1.5),
      borderTopWidth: 1,
      borderColor: "rgba(79, 124, 255, 0.15)",
      paddingTop: hp(1),
      gap: hp(0.8),
    },
    aiOutputConnectionsLabel: {
      fontSize: fs(2.2),
      fontWeight: "700",
      color: "rgba(79, 124, 255, 0.8)",
      textTransform: "uppercase",
    },
    aiConnectionItemBtn: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: "rgba(0,0,0,0.35)",
      borderWidth: 1,
      borderColor: colors.border,
      padding: wp(2),
      borderRadius: wp(2.5),
    },
    aiConnectionItemTitle: {
      fontSize: fs(2.8),
      fontWeight: "700",
      color: colors.text,
      flex: 1,
    },
    canvasMetadataGrid: {
      backgroundColor: "rgba(11, 15, 23, 0.6)",
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: wp(4),
      padding: wp(3),
      gap: hp(1),
    },
    canvasMetadataRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    canvasMetadataLabel: {
      fontSize: fs(2.8),
      color: colors.textSecondary,
    },
    canvasMetadataValue: {
      fontSize: fs(2.8),
      fontWeight: "700",
      color: colors.text,
    },
    canvasActionTriggerBtn: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: hp(1.2),
      paddingHorizontal: wp(3),
      borderRadius: wp(3),
      backgroundColor: "rgba(22, 27, 34, 0.6)",
      borderWidth: 1,
      borderColor: colors.border,
      gap: wp(2.5),
    },
    canvasActionTriggerText: {
      fontSize: fs(3),
      fontWeight: "600",
      color: colors.textSecondary,
      flex: 1,
    },
    aiTriggerMatrixContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: wp(1.5),
    },
    aiTriggerMatrixBtn: {
      width: "48.5%",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      height: hp(4.5),
      backgroundColor: "rgba(11, 15, 23, 0.5)",
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: wp(2.5),
      gap: wp(1),
    },
    aiTriggerMatrixBtnText: {
      fontSize: fs(2.5),
      fontWeight: "700",
      color: colors.text,
    },
    canvasStatusBarFooter: {
      height: hp(4.5),
      backgroundColor: colors.panelHeader,
      borderTopWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: wp(4),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    canvasStatusBarText: {
      fontSize: fs(2.2),
      color: colors.textSecondary,
      fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    },
    canvasStatusBarSyncBlock: {
      flexDirection: "row",
      alignItems: "center",
      gap: wp(1),
    },
    canvasStatusBarSyncText: {
      fontSize: fs(2.2),
      color: colors.success,
      fontWeight: "600",
    },
    drawerPanelOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.65)",
      justifyContent: "flex-end",
    },
    drawerPanelSheetContent: {
      backgroundColor: colors.panelHeader,
      borderTopLeftRadius: wp(5),
      borderTopRightRadius: wp(5),
      borderWidth: 1,
      borderColor: colors.border,
      maxHeight: "80%",
    },
    drawerPanelTitleBlock: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: wp(4),
      borderBottomWidth: 1,
      borderColor: colors.border,
    },
    drawerPanelTitleText: {
      fontSize: fs(3.2),
      fontWeight: "700",
      color: colors.textSecondary,
      textTransform: "uppercase",
    },
    drawerOptionRowUnit: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: hp(1.5),
      paddingHorizontal: wp(4),
    },
    drawerOptionRowUnitActive: {
      backgroundColor: colors.border,
    },
    drawerOptionText: {
      fontSize: fs(3.2),
      color: colors.primary,
    },
    drawerOptionTextActive: {
      color: colors.primary,
      fontWeight: "600",
    },
  });
}

export default function PersonalNotes({
  getNotes,
  createNote,
  updateNote,
  deleteNote,
}: PersonalNotesProps) {
  const { uiTheme } = useTheme();
  const isDark =
    (uiTheme?.theme as string) === "dark" || (uiTheme?.theme as string) === "metallic-elite";
  const colors = useMemo(() => buildColors(uiTheme, isDark), [uiTheme, isDark]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeFolder, setActiveFolder] = useState<string>("All");
  const [activeTag, setActiveTag] = useState<string>("All");
  const [customFolders, setCustomFolders] = useState<string[]>(DEFAULT_FOLDERS);
  const [customTags, setCustomTags] = useState<string[]>([
    "AI",
    "Important",
    "Meeting",
    "Ideas",
    "Patent",
    "SOP",
  ]);

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editFolder, setEditFolder] = useState("");
  const [editTags, setEditTags] = useState<string[]>([]);

  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [newActionItem, setNewActionItem] = useState("");
  const [notesList, setNotesList] = useState<string[]>([]);
  const [newNoteListItem, setNewNoteListItem] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "alphabetical">("newest");
  const fileInputRef = useRef<any>(null);
  const auth = useAuth();

  const currentUsername = auth?.user?.username || "Nathan Reardon";
  const currentRole = auth?.user?.role || "super-admin";

  const [aiOutput, setAiOutput] = useState<string>("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [relatedNotesList, setRelatedNotesList] = useState<Note[]>([]);

  const [collectionsPickerOpen, setCollectionsPickerOpen] = useState(false);
  const [tagsPickerOpen, setTagsPickerOpen] = useState(false);
  const [noteSettingsModalOpen, setNoteSettingsModalOpen] = useState(false);

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    setLoading(true);
    try {
      const res = await getNotes();
      const loadedNotes = (res.items || []).map((note) => ({
        ...note,
        tags: note.tags || [],
        actionItems: note.actionItems || [],
        notesList: note.notesList || [],
        attachments: note.attachments || [],
        folder: note.folder || "",
      }));
      setNotes(loadedNotes);

      const extractedFolders = Array.from(
        new Set(loadedNotes.map((n) => n.folder).filter(Boolean))
      );
      setCustomFolders(Array.from(new Set([...DEFAULT_FOLDERS, ...extractedFolders])));

      const extractedTags = Array.from(
        new Set(loadedNotes.flatMap((n) => n.tags || []).filter(Boolean))
      );
      setCustomTags(
        Array.from(new Set(["AI", "Important", "Meeting", "Ideas", "Patent", "SOP", ...extractedTags]))
      );
    } catch (err: unknown) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to load knowledge database"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNote = async () => {
    try {
      const initialFolder =
        activeFolder !== "All" && activeFolder !== "Favorites" && activeFolder !== "Pinned"
          ? activeFolder
          : "Projects";
      const initialTags = activeTag !== "All" ? [activeTag] : ["Ideas"];

      const { item } = await createNote({
        title: "Untitled Vault Document",
        content: "Overview details go here...",
        color: "rgba(30, 41, 59, 0.5)",
        folder: initialFolder,
        tags: initialTags,
        actionItems: [],
        notesList: [],
        attachments: [],
      });

      const normalizedItem = {
        ...item,
        tags: item.tags || [],
        actionItems: item.actionItems || [],
        notesList: item.notesList || [],
        attachments: item.attachments || [],
      };

      setNotes([normalizedItem, ...notes]);
      selectNote(normalizedItem);
      setIsEditing(true);
    } catch (err) {
      Alert.alert("Error", "Failed to initialize note");
    }
  };

  const selectNote = (note: Note) => {
    setSelectedNote(note);
    setEditTitle(note.title);
    setEditContent(note.content);
    setEditFolder(note.folder);
    setEditTags(note.tags);
    setActionItems(note.actionItems);
    setNotesList(note.notesList);
    setAttachments(note.attachments);
    setAiOutput("");
    setRelatedNotesList([]);
    setIsEditing(false);
  };

  const handleSaveNote = async () => {
    if (!selectedNote) return;
    try {
      const payload = {
        title: editTitle,
        content: editContent,
        folder: editFolder,
        tags: editTags,
        actionItems: actionItems,
        notesList: notesList,
        attachments: attachments,
      };

      const { item } = await updateNote(selectedNote.id, payload);

      const normalizedItem = {
        ...item,
        tags: item.tags || [],
        actionItems: item.actionItems || [],
        notesList: item.notesList || [],
        attachments: item.attachments || [],
      };

      setNotes(notes.map((n) => (n.id === item.id ? normalizedItem : n)));
      setSelectedNote(normalizedItem);
      setIsEditing(false);
    } catch (err) {
      Alert.alert("Error", "Failed to save note");
    }
  };

  const handleDeleteNote = async (id: string) => {
    Alert.alert(
      "Confirm Deletion",
      "Are you sure you want to permanently delete this note?",
      [
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
              setNoteSettingsModalOpen(false);
            } catch (err) {
              Alert.alert("Error", "Failed to delete note");
            }
          },
        },
      ]
    );
  };

  const handleDuplicateNote = async () => {
    if (!selectedNote) return;
    try {
      const { item } = await createNote({
        title: `Copy of ${selectedNote.title}`,
        content: selectedNote.content,
        color: selectedNote.color,
        folder: selectedNote.folder,
        tags: selectedNote.tags,
        actionItems: selectedNote.actionItems,
        notesList: selectedNote.notesList,
        attachments: selectedNote.attachments,
      });
      setNotes([item, ...notes]);
      selectNote(item);
      setNoteSettingsModalOpen(false);
      Alert.alert("Success", "Note duplicated smoothly.");
    } catch {
      Alert.alert("Error", "Failed to duplicate note.");
    }
  };

  const exportNoteAsTxt = async () => {
    if (!selectedNote) return;
    try {
      const structuredPayload = `Title: ${selectedNote.title}\nFolder: ${selectedNote.folder}\nContent: ${selectedNote.content}`;
      await Share.share({ message: structuredPayload });
    } catch {
      Alert.alert("Error", "Failed to export vault parameters.");
    }
  };

  const togglePin = async (id: string) => {
    const note = notes.find((n) => n.id === id);
    if (!note) return;
    try {
      const { item } = await updateNote(id, { isPinned: !note.isPinned });
      const updated = { ...note, isPinned: item.isPinned };
      setNotes(notes.map((n) => (n.id === id ? updated : n)));
      if (selectedNote?.id === id) setSelectedNote(updated);
    } catch (err) {
      Alert.alert("Error", "Failed to update Pin status");
    }
  };

  const toggleFavorite = async (id: string) => {
    const note = notes.find((n) => n.id === id);
    if (!note) return;
    try {
      const { item } = await updateNote(id, { isFavorite: !note.isFavorite });
      const updated = { ...note, isFavorite: item.isFavorite };
      setNotes(notes.map((n) => (n.id === id ? updated : n)));
      if (selectedNote?.id === id) setSelectedNote(updated);
    } catch (err) {
      Alert.alert("Error", "Failed to update Favorite status");
    }
  };

  const updateColor = async (id: string, color: string) => {
    try {
      const { item } = await updateNote(id, { color });
      setNotes(notes.map((n) => (n.id === id ? { ...n, color: item.color } : n)));
      if (selectedNote?.id === id)
        setSelectedNote((prev) => (prev ? { ...prev, color: item.color } : null));
    } catch (err) {
      Alert.alert("Error", "Failed to update note color theme");
    }
  };

  const handleAddActionItem = () => {
    if (!newActionItem.trim()) return;
    const items = [...actionItems, { text: newActionItem.trim(), completed: false }];
    setActionItems(items);
    setNewActionItem("");
    if (!isEditing && selectedNote) {
      updateNote(selectedNote.id, { actionItems: items }).then(({ item }) => {
        setNotes(notes.map((n) => (n.id === item.id ? { ...n, actionItems: item.actionItems } : n)));
      });
    }
  };

  const toggleActionItem = (index: number) => {
    const items = actionItems.map((item, idx) =>
      idx === index ? { ...item, completed: !item.completed } : item
    );
    setActionItems(items);
    if (!isEditing && selectedNote) {
      updateNote(selectedNote.id, { actionItems: items }).then(({ item }) => {
        setNotes(notes.map((n) => (n.id === item.id ? { ...n, actionItems: item.actionItems } : n)));
      });
    }
  };

  const handleRemoveActionItem = (index: number) => {
    const items = actionItems.filter((_, idx) => idx !== index);
    setActionItems(items);
    if (!isEditing && selectedNote) {
      updateNote(selectedNote.id, { actionItems: items }).then(({ item }) => {
        setNotes(notes.map((n) => (n.id === item.id ? { ...n, actionItems: item.actionItems } : n)));
      });
    }
  };

  const handleAddNoteListItem = () => {
    if (!newNoteListItem.trim()) return;
    const items = [...notesList, newNoteListItem.trim()];
    setNotesList(items);
    setNewNoteListItem("");
    if (!isEditing && selectedNote) {
      updateNote(selectedNote.id, { notesList: items }).then(({ item }) => {
        setNotes(notes.map((n) => (n.id === item.id ? { ...n, notesList: item.notesList } : n)));
      });
    }
  };

  const handleRemoveNoteListItem = (index: number) => {
    const items = notesList.filter((_, idx) => idx !== index);
    setNotesList(items);
    if (!isEditing && selectedNote) {
      updateNote(selectedNote.id, { notesList: items }).then(({ item }) => {
        setNotes(notes.map((n) => (n.id === item.id ? { ...n, notesList: item.notesList } : n)));
      });
    }
  };

  const handleFileUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets && result.assets[0]) {
        const file = result.assets[0];
        const newAttachment: Attachment = {
          fileName: file.name,
          url: file.uri,
          mimeType: file.mimeType || "application/octet-stream",
          size: file.size || 0,
        };

        const updatedAttachments = [...attachments, newAttachment];
        setAttachments(updatedAttachments);

        if (!isEditing && selectedNote) {
          const { item } = await updateNote(selectedNote.id, { attachments: updatedAttachments });
          setNotes(notes.map((n) => (n.id === item.id ? { ...n, attachments: item.attachments } : n)));
        }
      }
    } catch {
      Alert.alert("Error", "Failed to acquire media file asset.");
    }
  };

  const handleRemoveAttachment = async (index: number) => {
    const updated = attachments.filter((_, idx) => idx !== index);
    setAttachments(updated);
    if (!isEditing && selectedNote) {
      try {
        const { item } = await updateNote(selectedNote.id, { attachments: updated });
        setNotes(notes.map((n) => (n.id === item.id ? { ...n, attachments: item.attachments } : n)));
      } catch {
        Alert.alert("Error", "Failed to delete attachment");
      }
    }
  };

  const toggleTagSelection = (tag: string) => {
    if (editTags.includes(tag)) {
      setEditTags(editTags.filter((t) => t !== tag));
    } else {
      setEditTags([...editTags, tag]);
    }
  };

  const runAiAssistant = async (actionType: string) => {
    if (!selectedNote) return;
    setAiGenerating(true);
    setAiOutput("");
    setRelatedNotesList([]);

    const textToAnalyze = `${selectedNote.title}. ${selectedNote.content}. ${selectedNote.notesList.join(". ")}`;

    try {
      if (actionType === "summarize") {
        if (!selectedNote.content || selectedNote.content === "Overview details go here...") {
          simulateStreamingOutput("✨ **AI Summary**:\nThis note contains no custom content to summarize yet.");
          return;
        }
        const sentences = selectedNote.content.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
        const topSentences = sentences.slice(0, 2).join(". ") + ".";
        simulateStreamingOutput(`✨ **AI Summary**:\nCategorized under "${selectedNote.folder || "Unassigned"}". Summary: ${topSentences}`);
      } else if (actionType === "actionItems") {
        const sentences = textToAnalyze.split(/[.!?\n]+/).map((s) => s.trim()).filter(Boolean);
        const keywords = ["todo", "need to", "must", "action", "task", "should", "verify"];
        const foundTasks = sentences.filter((s) => keywords.some((k) => s.toLowerCase().includes(k)));

        if (foundTasks.length > 0) {
          const listText = foundTasks.map((t, idx) => `${idx + 1}. [ ] ${t}`).join("\n");
          simulateStreamingOutput(`✨ **Extracted Actions**:\n${listText}`);
        } else {
          simulateStreamingOutput(`✨ **AI Actions (Generated)**:\n1. [ ] Finalize parameters for "${selectedNote.title}"\n2. [ ] Audit alignment within "${selectedNote.folder || "General Collections"}"`);
        }
      } else if (actionType === "translate") {
        if (!selectedNote.content || selectedNote.content === "Overview details go here...") {
          simulateStreamingOutput("✨ **AI Translation**:\nNo overview content to translate.");
          return;
        }
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=es&dt=t&q=${encodeURIComponent(selectedNote.content)}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const translatedText = data[0].map((x: any) => x[0]).join("");
          simulateStreamingOutput(`✨ **Spanish Translation**:\n${translatedText}`);
        } else {
          simulateStreamingOutput("✨ **AI Translation Offline**");
        }
      } else if (actionType === "improve") {
        if (!selectedNote.content) {
          simulateStreamingOutput("✨ **AI Enhancer**:\nWrite overview details first.");
          return;
        }
        let improved = selectedNote.content.replace(/\s+/g, " ").trim();
        improved = improved.charAt(0).toUpperCase() + improved.slice(1);
        simulateStreamingOutput(`✨ **AI Writing Improvement**:\n${improved}`);
      } else if (actionType === "tasks") {
        simulateStreamingOutput(`✨ **AI Task Proposals for "${selectedNote.title}"**:\n- [ ] Draft specifications for ${selectedNote.folder || "Projects"}\n- [ ] Review current tags index`);
      } else if (actionType === "related") {
        const currentWords = new Set(
          (selectedNote.title + " " + selectedNote.tags.join(" ")).toLowerCase().split(/\s+/).filter(Boolean)
        );
        const scored = notes
          .filter((n) => n.id !== selectedNote.id)
          .map((n) => {
            const words = (n.title + " " + n.tags.join(" ")).toLowerCase().split(/\s+/).filter(Boolean);
            let match = 0;
            words.forEach((w) => {
              if (currentWords.has(w)) match++;
            });
            const score = match / (currentWords.size + words.length - match || 1);
            return { note: n, score };
          })
          .filter((x) => x.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 2)
          .map((x) => x.note);

        if (scored.length > 0) {
          setRelatedNotesList(scored);
          simulateStreamingOutput(`✨ **AI Related Documents**:\nLocated ${scored.length} matching vault items.`);
        } else {
          simulateStreamingOutput("✨ **AI Related Documents**:\nNo notes sharing similar tags found.");
        }
      }
    } catch {
      setAiGenerating(false);
    }
  };

  const simulateStreamingOutput = (text: string) => {
    let currentLength = 0;
    const interval = setInterval(() => {
      setAiOutput(text.substring(0, currentLength + 6));
      currentLength += 6;
      if (currentLength >= text.length) {
        clearInterval(interval);
        setAiGenerating(false);
      }
    }, 15);
  };

  const filteredNotes = notes.filter((n) => {
    const matchesSearch =
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = activeTag === "All" || n.tags.includes(activeTag);

    let matchesFolder = true;
    if (activeFolder === "Favorites") {
      matchesFolder = n.isFavorite;
    } else if (activeFolder === "Pinned") {
      matchesFolder = n.isPinned;
    } else if (activeFolder !== "All") {
      matchesFolder = n.folder === activeFolder;
    }

    return matchesSearch && matchesTag && matchesFolder;
  });

  const sortedNotes = [...filteredNotes].sort((a, b) => {
    if (sortOrder === "alphabetical") {
      return a.title.localeCompare(b.title);
    } else if (sortOrder === "oldest") {
      return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
    } else {
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    }
  });

  const groupedNotes = useMemo(() => {
    const todayStr = new Date().toDateString();
    const groups: { [key: string]: Note[] } = { Today: [], "Older Logs": [] };

    sortedNotes.forEach((n) => {
      const noteDateStr = new Date(n.updatedAt).toDateString();
      if (noteDateStr === todayStr) {
        groups["Today"].push(n);
      } else {
        groups["Older Logs"].push(n);
      }
    });
    return groups;
  }, [sortedNotes]);

  const getWordCount = () => {
    if (!selectedNote) return 0;
    const text = (selectedNote.content || "") + " " + selectedNote.notesList.join(" ");
    return text.split(/\s+/).filter(Boolean).length;
  };

  return (
    <SafeAreaView style={s(styles.container)} edges={["top", "left", "right"]}>
      <View style={s(styles.topBar)}>
        <View style={s(styles.headerInfoBlock)}>
          <View style={s(styles.iconWrap)}>
            <BookOpen size={fs(5)} color={colors.primary} />
          </View>
          <View>
            <Text style={s(styles.headerTitleText)}>Knowledge Vault</Text>
            <Text style={s(styles.headerSubtitleText)}>CENTRALIZED INTELLIGENCE CHAMBER</Text>
          </View>
        </View>

        <View style={s(styles.actionHeaderRow)}>
          <TouchableOpacity style={s(styles.quickAddBtn)} onPress={handleCreateNote}>
            <Plus size={fs(3.5)} color="#ffffff" />
            <Text style={s(styles.quickAddBtnText)}>Quick Add</Text>
          </TouchableOpacity>

          <View style={s(styles.avatarCircle)}>
            <Text style={s(styles.avatarLetter)}>
              {currentUsername
                .split(" ")
                .map((w) => w[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)}
            </Text>
          </View>
        </View>
      </View>

      <View style={s(styles.searchFilterSection)}>
        <View style={s({ flexDirection: "row", gap: wp(2) })}>
          <View style={s(styles.searchContainerRow)}>
            <Search size={fs(4)} color={colors.textSecondary} style={s({ marginRight: wp(2) })} />
            <TextInput
              placeholder="Search matching vault notes..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={s(styles.searchBarInput)}
            />
          </View>

          <View style={s(styles.deckLayoutToggleRow)}>
            <TouchableOpacity
              style={s([styles.deckToggleBtn, viewMode === "list" && styles.deckToggleBtnActive])}
              onPress={() => setViewMode("list")}
            >
              <List size={fs(3.5)} color={viewMode === "list" ? colors.primary : colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={s([styles.deckToggleBtn, viewMode === "grid" && styles.deckToggleBtnActive])}
              onPress={() => setViewMode("grid")}
            >
              <LayoutGrid size={fs(3.5)} color={viewMode === "grid" ? colors.primary : colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={s([
              styles.deckToggleBtn,
              { backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.border, justifyContent: "center" },
            ])}
            onPress={() =>
              setSortOrder(
                sortOrder === "newest" ? "alphabetical" : sortOrder === "alphabetical" ? "oldest" : "newest"
              )
            }
          >
            <ArrowUpDown size={fs(3.5)} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s(styles.horizontalScroller)}
          contentContainerStyle={s(styles.scrollerContentGap)}
        >
          <TouchableOpacity
            style={s([
              styles.pillsFilterBtn,
              { backgroundColor: activeFolder === "All" ? colors.primary : colors.cardBg, borderColor: colors.border },
            ])}
            onPress={() => setActiveFolder("All")}
          >
            <Text style={s([styles.pillsFilterBtnText, { color: activeFolder === "All" ? "#fff" : colors.text }])}>
              All Vaults
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s([
              styles.pillsFilterBtn,
              { backgroundColor: activeFolder === "Favorites" ? colors.warning : colors.cardBg, borderColor: colors.border },
            ])}
            onPress={() => setActiveFolder("Favorites")}
          >
            <Text style={s([styles.pillsFilterBtnText, { color: activeFolder === "Favorites" ? "#fff" : colors.text }])}>
              ⭐ Favorites
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s([
              styles.pillsFilterBtn,
              { backgroundColor: activeFolder === "Pinned" ? colors.purple : colors.cardBg, borderColor: colors.border },
            ])}
            onPress={() => setActiveFolder("Pinned")}
          >
            <Text style={s([styles.pillsFilterBtnText, { color: activeFolder === "Pinned" ? "#fff" : colors.text }])}>
              📌 Pinned
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s([styles.pillsFilterBtn, { backgroundColor: colors.cardBg, borderColor: colors.primary }])}
            onPress={() => setCollectionsPickerOpen(true)}
          >
            <Text style={s([styles.pillsFilterBtnText, { color: colors.primary }])}>Folder: {activeFolder}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s([styles.pillsFilterBtn, { backgroundColor: colors.cardBg, borderColor: colors.success }])}
            onPress={() => setTagsPickerOpen(true)}
          >
            <Text style={s([styles.pillsFilterBtnText, { color: colors.success }])}>Tag: {activeTag}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <ScrollView style={s(styles.listScrollerArea)} contentContainerStyle={s(styles.listScrollerContent)}>
        {loading ? (
          <View style={s(styles.fallbackCenterBlock)}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={s(styles.fallbackCenterText)}>Accessing vault nodes...</Text>
          </View>
        ) : sortedNotes.length === 0 ? (
          <View style={s(styles.fallbackCenterBlock)}>
            <FileText size={fs(8)} color={colors.textSecondary} style={s({ opacity: 0.25 })} />
            <Text style={s(styles.fallbackCenterText)}>No knowledge nodes matched filters</Text>
          </View>
        ) : (
          ["Today", "Older Logs"].map((dateGroup) => {
            const groupNotes = groupedNotes[dateGroup];
            if (!groupNotes || groupNotes.length === 0) return null;

            return (
              <View key={dateGroup} style={s({ marginBottom: hp(1.8) })}>
                <Text style={s(styles.chronologicalGroupLabel)}>{dateGroup}</Text>
                <View style={s(viewMode === "grid" ? styles.gridStructureLayout : styles.listStructureLayout)}>
                  {groupNotes.map((n) => {
                    const isSelected = selectedNote?.id === n.id;
                    const cardWidth = viewMode === "grid" ? wp(44) : "100%";
                    const leftBorderColor = n.isPinned ? colors.purple : colors.primary;

                    return (
                      <TouchableOpacity
                        key={n.id}
                        onPress={() => selectNote(n)}
                        style={s([
                          styles.cardUnitWrapper,
                          { width: cardWidth },
                          isSelected
                            ? { borderColor: colors.primary, backgroundColor: "rgba(79, 124, 255, 0.05)" }
                            : { borderColor: colors.border },
                          viewMode === "list" && { borderLeftWidth: 4, borderLeftColor: leftBorderColor },
                        ])}
                      >
                        <View style={s(styles.cardUnitTopRow)}>
                          <Text
                            style={s([styles.cardUnitTitle, { color: isSelected ? colors.primary : colors.text }])}
                            numberOfLines={1}
                          >
                            {n.title || "Untitled Note"}
                          </Text>
                          {n.isPinned ? <Pin size={fs(2.8)} color={colors.purple} /> : null}
                        </View>
                        <Text style={s(styles.cardUnitBodyPreview)} numberOfLines={2}>
                          {n.content || "Empty document parameters logged."}
                        </Text>
                        <View style={s(styles.cardUnitFooterRow)}>
                          <Text style={s(styles.cardUnitDateText)}>{format(new Date(n.updatedAt), "MMM d, yyyy")}</Text>
                          {n.isFavorite ? <Star size={fs(2.8)} color={colors.warning} fill={colors.warning} /> : null}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal visible={Boolean(selectedNote)} animationType="slide" presentationStyle="pageSheet">
        {selectedNote ? (
          <SafeAreaView style={s(styles.modalCanvasViewport)}>
            <View style={s(styles.modalHeaderNavBar)}>
              <Text style={s(styles.modalHeaderTitleText)}>Intelligence Canvas</Text>
              <View style={s({ flexDirection: "row", gap: wp(2.5), alignItems: "center" })}>
                <TouchableOpacity onPress={() => setNoteSettingsModalOpen(true)}>
                  <Grid size={fs(4.5)} color={colors.background} />
                </TouchableOpacity>
                <TouchableOpacity style={s(styles.modalCloseButtonCircle)} onPress={() => setSelectedNote(null)}>
                  <X size={fs(5)} color={colors.background} />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView contentContainerStyle={s(styles.modalScrollBodyContainer)}>
              <View style={s(styles.breadcrumbsRow)}>
                <Text style={s(styles.breadcrumbsLabelText)}>{selectedNote.folder || "Unassigned"}</Text>
                <Text style={s({ color: colors.border, fontSize: fs(2.5) })}> / </Text>
                <Text style={s([styles.breadcrumbsLabelText, { color: colors.text }])} numberOfLines={1}>
                  {selectedNote.title}
                </Text>
              </View>

              <View style={s(styles.canvasNoteTitleBlock)}>
                {isEditing ? (
                  <TextInput
                    value={editTitle}
                    onChangeText={setEditTitle}
                    style={s(styles.canvasNoteTitleInput)}
                    placeholder="Enter document title..."
                    placeholderTextColor={colors.textSecondary}
                  />
                ) : (
                  <Text style={s(styles.canvasNoteTitleHeading)}>{selectedNote.title}</Text>
                )}
              </View>

              <View style={s(styles.paletteRowBlock)}>
                {COLORS.map((c) => (
                  <TouchableOpacity
                    key={c.name}
                    onPress={() => updateColor(selectedNote.id, c.value)}
                    style={s([
                      styles.paletteDotUnit,
                      { backgroundColor: c.value === "transparent" ? "#fff" : c.value },
                      selectedNote.color === c.value && { borderWidth: 2, borderColor: colors.primary },
                    ])}
                  />
                ))}
                <View style={s({ flex: 1 })} />
                {isEditing ? (
                  <View style={s({ flexDirection: "row", gap: wp(1.5) })}>
                    <TouchableOpacity
                      style={s([styles.canvasInlineFormBtn, { borderColor: colors.border }])}
                      onPress={() => selectNote(selectedNote)}
                    >
                      <Text style={s([styles.canvasInlineFormBtnText, { color: colors.text }])}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={s([
                        styles.canvasInlineFormBtn,
                        { backgroundColor: colors.primary, borderColor: colors.primary },
                      ])}
                      onPress={handleSaveNote}
                    >
                      <Text style={s([styles.canvasInlineFormBtnText, { color: "#fff" }])}>Save</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={s([styles.canvasInlineFormBtn, { borderColor: colors.primary }])}
                    onPress={() => setIsEditing(true)}
                  >
                    <Text style={s([styles.canvasInlineFormBtnText, { color: colors.primary }])}>Modify Content</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={s(styles.richToolbarStrip)}>
                <TouchableOpacity style={s(styles.richToolbarBtnUnit)}>
                  <Bold size={fs(3.5)} color={colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity style={s(styles.richToolbarBtnUnit)}>
                  <Italic size={fs(3.5)} color={colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity style={s(styles.richToolbarBtnUnit)}>
                  <Underline size={fs(3.5)} color={colors.textSecondary} />
                </TouchableOpacity>
                <View style={s({ width: 1, height: hp(1.8), backgroundColor: colors.border, marginHorizontal: wp(1) })} />
                <TouchableOpacity style={s(styles.richToolbarBtnUnit)}>
                  <List size={fs(3.5)} color={colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity style={s(styles.richToolbarBtnUnit)}>
                  <TableIcon size={fs(3.5)} color={colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity style={s(styles.richToolbarBtnUnit)}>
                  <ImageIcon size={fs(3.5)} color={colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity style={s(styles.richToolbarBtnUnit)}>
                  <LinkIcon size={fs(3.5)} color={colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity style={s(styles.richToolbarBtnUnit)}>
                  <FileCode size={fs(3.5)} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={s(styles.canvasSectionCard)}>
                <View style={s(styles.canvasSectionHeaderRow)}>
                  <View style={s(styles.canvasSectionHeaderLabelBlock)}>
                    <FileText size={fs(3.5)} color={colors.primary} />
                    <Text style={s(styles.canvasSectionHeaderLabelText)}>Overview Summary</Text>
                  </View>
                </View>
                {isEditing ? (
                  <TextInput
                    multiline
                    value={editContent}
                    onChangeText={setEditContent}
                    style={s(styles.overviewTextareaInput)}
                    placeholder="Describe this vault node..."
                    placeholderTextColor={colors.textSecondary}
                  />
                ) : (
                  <Text style={s(styles.overviewStaticText)}>{selectedNote.content || "No custom criteria compiled."}</Text>
                )}
              </View>

              {aiOutput ? (
                <View style={s(styles.aiOutputWrapperBox)}>
                  <View style={s(styles.aiOutputTitleRow)}>
                    <Sparkles size={fs(3)} color={colors.primary} />
                    <Text style={s(styles.aiOutputTitleText)}>AI Core Engine Insight</Text>
                  </View>
                  <Text style={s(styles.aiOutputContentText)}>{aiOutput}</Text>

                  {relatedNotesList.length > 0 ? (
                    <View style={s(styles.aiOutputConnectionsBox)}>
                      <Text style={s(styles.aiOutputConnectionsLabel)}>Dynamic Vault Links:</Text>
                      {relatedNotesList.map((rn) => (
                        <TouchableOpacity key={rn.id} style={s(styles.aiConnectionItemBtn)} onPress={() => selectNote(rn)}>
                          <Text style={s(styles.aiConnectionItemTitle)} numberOfLines={1}>
                            {rn.title}
                          </Text>
                          <CornerDownRight size={fs(3)} color={colors.primary} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : null}

                  <TouchableOpacity
                    style={s(styles.aiOutputDismissBtn)}
                    onPress={() => {
                      setAiOutput("");
                      setRelatedNotesList([]);
                    }}
                  >
                    <X size={fs(3.5)} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              ) : null}

              <View style={s(styles.canvasSectionCard)}>
                <View style={s(styles.canvasSectionHeaderRow)}>
                  <View style={s(styles.canvasSectionHeaderLabelBlock)}>
                    <CheckSquare size={fs(3.5)} color={colors.success} />
                    <Text style={s(styles.canvasSectionHeaderLabelText)}>Operational Checklists</Text>
                  </View>
                  <Text style={s(styles.canvasSectionCounterText)}>
                    {actionItems.filter((i) => i.completed).length} / {actionItems.length} Done
                  </Text>
                </View>

                <View style={s({ gap: hp(0.8) })}>
                  {actionItems.map((item, index) => (
                    <View key={index} style={s(styles.checklistItemRowUnit)}>
                      <TouchableOpacity style={s(styles.checklistInteractiveBox)} onPress={() => toggleActionItem(index)}>
                        <View style={s([styles.checklistCustomCheckbox, { borderColor: item.completed ? colors.success : colors.border }])}>
                          {item.completed ? <Check size={fs(2.5)} color={colors.success} /> : null}
                        </View>
                        <Text
                          style={s([
                            styles.checklistLabelText,
                            {
                              color: item.completed ? colors.textSecondary : colors.text,
                              textDecorationLine: item.completed ? "line-through" : "none",
                            },
                          ])}
                          numberOfLines={1}
                        >
                          {item.text}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleRemoveActionItem(index)}>
                        <Trash2 size={fs(3)} color={colors.danger} />
                      </TouchableOpacity>
                    </View>
                  ))}

                  <View style={s(styles.canvasInlineFormRow)}>
                    <TextInput
                      style={s(styles.canvasInlineFormInput)}
                      placeholder="Add new checklist target..."
                      placeholderTextColor={colors.textSecondary}
                      value={newActionItem}
                      onChangeText={setNewActionItem}
                    />
                    <TouchableOpacity
                      style={s([
                        styles.canvasInlineFormBtn,
                        { backgroundColor: "rgba(22, 199, 132, 0.1)", borderColor: "rgba(22, 199, 132, 0.2)" },
                      ])}
                      onPress={handleAddActionItem}
                    >
                      <Text style={s([styles.canvasInlineFormBtnText, { color: colors.success }])}>Add Task</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <View style={s(styles.canvasSectionCard)}>
                <View style={s(styles.canvasSectionHeaderRow)}>
                  <View style={s(styles.canvasSectionHeaderLabelBlock)}>
                    <ListPlus size={fs(3.5)} color={colors.purple} />
                    <Text style={s(styles.canvasSectionHeaderLabelText)}>Key Highlights Index</Text>
                  </View>
                </View>

                <View style={s({ gap: hp(0.8) })}>
                  {notesList.map((item, index) => (
                    <View key={index} style={s(styles.checklistItemRowUnit)}>
                      <View style={s({ flexDirection: "row", gap: wp(1.5), flex: 1, alignItems: "center" })}>
                        <Text style={s({ color: colors.purple, fontWeight: "900" })}>{`•`}</Text>
                        <Text style={s({ color: colors.text, fontSize: fs(3.2), flex: 1 })} numberOfLines={1}>
                          {item}
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => handleRemoveNoteListItem(index)}>
                        <Trash2 size={fs(3)} color={colors.danger} />
                      </TouchableOpacity>
                    </View>
                  ))}

                  <View style={s(styles.canvasInlineFormRow)}>
                    <TextInput
                      style={s(styles.canvasInlineFormInput)}
                      placeholder="Add bullet highlight item..."
                      placeholderTextColor={colors.textSecondary}
                      value={newNoteListItem}
                      onChangeText={setNewNoteListItem}
                    />
                    <TouchableOpacity
                      style={s([
                        styles.canvasInlineFormBtn,
                        { backgroundColor: "rgba(168, 85, 247, 0.1)", borderColor: "rgba(168, 85, 247, 0.2)" },
                      ])}
                      onPress={handleAddNoteListItem}
                    >
                      <Text style={s([styles.canvasInlineFormBtnText, { color: colors.purple }])}>Add Bullet</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <View style={s(styles.canvasSectionCard)}>
                <View style={s(styles.canvasSectionHeaderRow)}>
                  <View style={s(styles.canvasSectionHeaderLabelBlock)}>
                    <Upload size={fs(3.5)} color={colors.primary} />
                    <Text style={s(styles.canvasSectionHeaderLabelText)}>Attachments Ledger</Text>
                  </View>
                  <TouchableOpacity
                    style={s([styles.canvasInlineFormBtn, { height: hp(3), paddingHorizontal: wp(2) }])}
                    onPress={handleFileUpload}
                  >
                    <Text style={s([styles.canvasInlineFormBtnText, { color: colors.primary }])}>Upload File</Text>
                  </TouchableOpacity>
                </View>

                <View style={s({ marginTop: hp(0.5) })}>
                  {attachments.map((file, idx) => (
                    <View key={idx} style={s(styles.attachmentCardUnit)}>
                      <View style={s(styles.attachmentMetaBlock)}>
                        <View style={s(styles.attachmentIconContainer)}>
                          <FileText size={fs(4)} color={colors.primary} />
                        </View>
                        <View style={s({ flex: 1 })}>
                          <Text style={s(styles.attachmentTitleText)} numberOfLines={1}>
                            {file.fileName}
                          </Text>
                          <Text style={s(styles.attachmentSizeText)}>{(file.size / 1024).toFixed(1)} KB</Text>
                        </View>
                      </View>
                      <View style={s(styles.attachmentActionGroup)}>
                        <TouchableOpacity style={s(styles.attachmentActionBtn)} onPress={() => handleRemoveAttachment(idx)}>
                          <Trash2 size={fs(3)} color={colors.danger} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                  {attachments.length === 0 ? (
                    <Text
                      style={s({
                        fontSize: fs(2.8),
                        fontStyle: "italic",
                        color: colors.textSecondary,
                        textAlign: "center",
                        marginVertical: hp(1),
                      })}
                    >
                      No corporate file logs bound to node.
                    </Text>
                  ) : null}
                </View>
              </View>

              <View style={s(styles.canvasSectionCard)}>
                <View style={s(styles.canvasSectionHeaderRow)}>
                  <View style={s(styles.canvasSectionHeaderLabelBlock)}>
                    <Sparkles size={fs(3.5)} color={colors.primary} />
                    <Text style={s(styles.canvasSectionHeaderLabelText)}>AI Matrix Commands</Text>
                  </View>
                </View>
                <View style={s(styles.aiTriggerMatrixContainer)}>
                  {[
                    { label: "Summarize Text", action: "summarize" },
                    { label: "Action Extract", action: "actionItems" },
                    { label: "Translate Node", action: "translate" },
                    { label: "Enhance Output", action: "improve" },
                    { label: "Propose Tasks", action: "tasks" },
                    { label: "Cross Related", action: "related" },
                  ].map((aiBtn) => (
                    <TouchableOpacity
                      key={aiBtn.label}
                      disabled={aiGenerating}
                      style={s(styles.aiTriggerMatrixBtn)}
                      onPress={() => runAiAssistant(aiBtn.action)}
                    >
                      <Text style={s(styles.aiTriggerMatrixBtnText)}>{aiBtn.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={s(styles.canvasStatusBarFooter)}>
              <Text style={s(styles.canvasStatusBarText)}>{getWordCount()} Words written</Text>
              <View style={s(styles.canvasStatusBarSyncBlock)}>
                <View style={s({ width: wp(1.2), height: wp(1.2), borderRadius: wp(0.6), backgroundColor: colors.success })} />
                <Text style={s(styles.canvasStatusBarSyncText)}>Synced with Vault Node</Text>
              </View>
            </View>
          </SafeAreaView>
        ) : null}
      </Modal>

      <Modal visible={collectionsPickerOpen} transparent animationType="fade">
        <Pressable style={s(styles.drawerPanelOverlay)} onPress={() => setCollectionsPickerOpen(false)}>
          <View style={s(styles.drawerPanelSheetContent)}>
            <View style={s(styles.drawerPanelTitleBlock)}>
              <Text style={s(styles.drawerPanelTitleText)}>Select Collection Folder</Text>
              <TouchableOpacity onPress={() => setCollectionsPickerOpen(false)}>
                <X size={fs(4)} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {customFolders.map((folder) => (
                <TouchableOpacity
                  key={folder}
                  style={s([styles.drawerOptionRowUnit, activeFolder === folder && styles.drawerOptionRowUnitActive])}
                  onPress={() => {
                    setActiveFolder(folder);
                    setCollectionsPickerOpen(false);
                  }}
                >
                  <Text style={s([styles.drawerOptionText, activeFolder === folder && styles.drawerOptionTextActive])}>
                    {folder}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={tagsPickerOpen} transparent animationType="fade">
        <Pressable style={s(styles.drawerPanelOverlay)} onPress={() => setTagsPickerOpen(false)}>
          <View style={s(styles.drawerPanelSheetContent)}>
            <View style={s(styles.drawerPanelTitleBlock)}>
              <Text style={s(styles.drawerPanelTitleText)}>Select Filter Tag</Text>
              <TouchableOpacity onPress={() => setTagsPickerOpen(false)}>
                <X size={fs(4)} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {["All", ...customTags].map((tag) => (
                <TouchableOpacity
                  key={tag}
                  style={s([styles.drawerOptionRowUnit, activeTag === tag && styles.drawerOptionRowUnitActive])}
                  onPress={() => {
                    setActiveTag(tag);
                    setTagsPickerOpen(false);
                  }}
                >
                  <Text style={s([styles.drawerOptionText, activeTag === tag && styles.drawerOptionTextActive])}>
                    #{tag}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={noteSettingsModalOpen} transparent animationType="fade">
        <Pressable style={s(styles.drawerPanelOverlay)} onPress={() => setNoteSettingsModalOpen(false)}>
          <View style={s(styles.drawerPanelSheetContent)}>
            <View style={s(styles.drawerPanelTitleBlock)}>
              <Text style={s(styles.drawerPanelTitleText)}>Vault Settings Management</Text>
              <TouchableOpacity onPress={() => setNoteSettingsModalOpen(false)}>
                <X size={fs(4)} color={colors.text} />
              </TouchableOpacity>
            </View>
            {selectedNote ? (
              <ScrollView style={s({ padding: wp(3) })}>
                <View style={s(styles.canvasMetadataGrid)}>
                  <View style={s(styles.canvasMetadataRow)}>
                    <Text style={s(styles.canvasMetadataLabel)}>Created Timeframe:</Text>
                    <Text style={s(styles.canvasMetadataValue)}>
                      {format(new Date(selectedNote.createdAt), "MMM d, yyyy")}
                    </Text>
                  </View>
                  <View style={s(styles.canvasMetadataRow)}>
                    <Text style={s(styles.canvasMetadataLabel)}>Author Identity:</Text>
                    <Text style={s(styles.canvasMetadataValue)}>{currentUsername}</Text>
                  </View>
                </View>

                <View style={s({ gap: hp(1), marginTop: hp(2) })}>
                  <TouchableOpacity style={s(styles.canvasActionTriggerBtn)} onPress={() => toggleFavorite(selectedNote.id)}>
                    <Star
                      size={fs(3.5)}
                      color={colors.warning}
                      fill={selectedNote.isFavorite ? colors.warning : "transparent"}
                    />
                    <Text style={s(styles.canvasActionTriggerText)}>
                      {selectedNote.isFavorite ? "Remove from Favorites" : "Mark as Favorite"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={s(styles.canvasActionTriggerBtn)} onPress={() => togglePin(selectedNote.id)}>
                    <Pin size={fs(3.5)} color={colors.purple} />
                    <Text style={s(styles.canvasActionTriggerText)}>
                      {selectedNote.isPinned ? "Unpin Node Document" : "Pin Node to Workspace"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={s(styles.canvasActionTriggerBtn)} onPress={handleDuplicateNote}>
                    <Copy size={fs(3.5)} color={colors.primary} />
                    <Text style={s(styles.canvasActionTriggerText)}>Duplicate Vault Document</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={s(styles.canvasActionTriggerBtn)} onPress={exportNoteAsTxt}>
                    <Download size={fs(3.5)} color={colors.success} />
                    <Text style={s(styles.canvasActionTriggerText)}>Export Shared Text Schema</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={s([styles.canvasActionTriggerBtn, { borderColor: colors.danger }])}
                    onPress={() => handleDeleteNote(selectedNote.id)}
                  >
                    <Trash2 size={fs(3.5)} color={colors.danger} />
                    <Text style={s([styles.canvasActionTriggerText, { color: colors.danger }])}>
                      Delete Vault Record Permanently
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            ) : null}
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}