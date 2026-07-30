import React, { useEffect, useMemo, useState, useCallback } from "react";
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
  Dimensions,
  Share,
  Image
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as DocumentPicker from "expo-document-picker";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, toProxiedUrl } from "@/lib/admin/apiClient";
import { useSocket } from "@/contexts/SocketContext";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { s } from "@/util/styles";
import {
  Plus,
  Search,
  Send,
  ArrowLeft,
  MessageCircle,
  User,
  Archive,
  Bookmark,
  Paperclip,
  Download,
  X
} from "lucide-react-native";

const { width } = Dimensions.get("window");

interface Employee {
  id: string;
  _id?: string;
  name: string;
  initials: string;
  email: string;
  role?: string;
  department?: string;
  status: string;
  avatarUrl?: string;
  current_status?: "AVAILABLE" | "LUNCH" | "BREAK";
  lunch_start_time?: string | null;
  lunch_expected_end?: string | null;
  break_start_time?: string | null;
}

interface Message {
  id: string;
  sender: string;
  senderAvatar: string;
  recipient: string;
  content: string;
  timestamp: string;
  type: "direct" | "broadcast";
  status: "sent" | "delivered" | "read";
  createdAt?: string;
  attachment?: { fileName?: string; url?: string; mimeType?: string; size?: number };
}

type MessageApi = Omit<Message, "id"> & {
  _id: string;
};

interface Conversation {
  employee: Employee;
  lastMessage: Message | null;
  unreadCount: number;
}

function normalizeMessage(m: any): Message {
  return {
    id: String(m._id || m.id || ""),
    sender: m.sender || "",
    senderAvatar: m.senderAvatar || "",
    recipient: m.recipient || "",
    content: m.content || "",
    timestamp: m.timestamp || m.createdAt || new Date().toISOString(),
    type: m.type || "direct",
    status: m.status || "sent",
    createdAt: m.createdAt,
    attachment: m.attachment,
  };
}

function isDuplicateMessage(prev: Message[], newMsg: Message): boolean {
  if (newMsg.id && prev.some((m) => m.id === newMsg.id)) return true;
  return prev.some((m) => {
    const isSameMetadata = 
      m.sender === newMsg.sender && 
      m.recipient === newMsg.recipient && 
      m.content === newMsg.content;
    if (!isSameMetadata) return false;
    const t1 = new Date(m.timestamp).getTime();
    const t2 = new Date(newMsg.timestamp).getTime();
    return Math.abs(t1 - t2) < 10000;
  });
}

function getInitials(name: string): string {
  return String(name || "")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function buildColors(uiTheme: any) {
  const isDark = uiTheme.theme !== "crystal-white";
  return {
    background:      uiTheme.panelColors?.dashboardBackground     || (isDark ? "#09090b" : "#ffffff"),
    panelHeader:     uiTheme.panelColors?.dashboardCardBackground || (isDark ? "#141517" : "#f8fafc"),
    cardBg:          uiTheme.panelColors?.dashboardCardBackground || (isDark ? "#141517" : "#f8fafc"),
    text:            uiTheme.panelColors?.dashboardTextColor      || (isDark ? "#f8fafc" : "#000000"),
    textSecondary:   isDark ? "#94a3b8" : "#475569",
    border:          isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)",
    primary:         uiTheme.customColors?.primary                || "#3b82f6",
    success:         "#16C784",
    warning:         "#F59E0B",
    danger:          "#EF4444",
    purple:          "#8B5CF6",
    lunch:           "#F59E0B",
    break:           "#8B5CF6",
    bubbleMe:        uiTheme.customColors?.primary                || "#3b82f6",
    bubbleOther:     isDark ? "#242528" : "#e4e6eb"
  };
}

function createStyles(colors: ReturnType<typeof buildColors>) {
  return StyleSheet.create({
    viewport: { flex: 1, backgroundColor: colors.background },
    headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 8, marginBottom: 14 },
    pageHeaderBlock: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
    backBtnItem: { padding: 6, borderRadius: 8 },
    pageTitle: { fontSize: 20, fontWeight: "900", color: colors.text },
    pageSubtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    newConversationBtn: { flexDirection: "row", alignItems: "center", backgroundColor: colors.primary, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, gap: 6 },
    newConversationBtnText: { color: "#ffffff", fontSize: 12, fontWeight: "700" },
    filterTabsScroll: { paddingHorizontal: 16, marginBottom: 12 },
    filterTabCapsule: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, height: 32, borderRadius: 16, borderWidth: 1, gap: 6 },
    filterTabCapsuleText: { fontSize: 12, fontWeight: "600" },
    searchCardFrame: { marginHorizontal: 16, backgroundColor: colors.cardBg, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 10, marginBottom: 14 },
    searchBarContainer: { flexDirection: "row", alignItems: "center", gap: 8 },
    searchBarInputControl: { flex: 1, color: colors.text, fontSize: 13, height: 36, padding: 0 },
    conversationsListContainer: { marginHorizontal: 16, backgroundColor: colors.cardBg, borderRadius: 12, borderWidth: 1, borderColor: colors.border, overflow: "hidden", marginBottom: 16 },
    sectionChronologicalHeader: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(0,0,0,0.15)", paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderColor: colors.border },
    sectionChronologicalHeaderText: { fontSize: 10, fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase" },
    fallbackEmptyContainer: { padding: 40, alignItems: "center", justifyContent: "center" },
    fallbackEmptyHeadingText: { fontSize: 18, fontWeight: "800", color: colors.text, marginTop: 12, textAlign: "center" },
    fallbackEmptySubtext: { fontSize: 13, color: colors.textSecondary, textAlign: "center", marginTop: 6, lineHeight: 18, maxWidth: 280 },
    fallbackEmptyActionBtn: { flexDirection: "row", alignItems: "center", backgroundColor: colors.primary, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10, gap: 8, marginTop: 20 },
    fallbackEmptyActionBtnText: { color: "#ffffff", fontSize: 14, fontWeight: "700" },
    conversationRowItem: { flexDirection: "row", alignItems: "center", padding: 14, borderBottomWidth: 1, borderColor: colors.border, gap: 12 },
    avatarWrapperContainer: { position: "relative" },
    avatarFrameCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.border, alignItems: "center", justifyContent: "center", overflow: "hidden" },
    avatarImageElement: { width: 44, height: 44, borderRadius: 22 },
    avatarTextFallback: { fontSize: 14, fontWeight: "700" },
    avatarOnlineStatusDot: { position: "absolute", bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: colors.cardBg },
    unreadCounterBadge: { position: "absolute", top: -4, right: -4, backgroundColor: colors.danger, minWidth: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
    unreadCounterBadgeText: { color: "#ffffff", fontSize: 9, fontWeight: "900" },
    conversationRowMetaColumn: { flex: 1 },
    conversationRowTopLine: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    conversationNameFlexBlock: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
    conversationProfileNameText: { fontSize: 14, fontWeight: "700", color: colors.text },
    conversationTimestampText: { fontSize: 10, color: colors.textSecondary },
    conversationSnippetText: { fontSize: 12, marginTop: 4 },
    conversationActionStripRow: { flexDirection: "row", alignItems: "center", gap: 4, marginLeft: 4 },
    conversationActionIconBtn: { padding: 6, borderRadius: 8 },
    chatViewportContainer: { flex: 1, marginHorizontal: 16, backgroundColor: colors.cardBg, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: "hidden", marginBottom: 16 },
    chatMessagesScrollArea: { flex: 1, padding: 12 },
    chatMessagesScrollContent: { gap: 12, paddingBottom: 24 },
    chatEmptyTimelineBlock: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 64 },
    chatEmptyTimelineTextPrimary: { fontSize: 15, fontWeight: "700", color: colors.text, marginTop: 12 },
    chatEmptyTimelineTextSecondary: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
    messageBubbleWrapperFlex: { flexDirection: "row", gap: 8, width: "100%" },
    messageAvatarStubCircle: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.border, alignItems: "center", justifyContent: "center", overflow: "hidden" },
    messageAvatarStubText: { fontSize: 9, fontWeight: "700" },
    messageBubbleBodyCard: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, maxWidth: "76%" },
    messageBubbleAttachmentPreviewBtn: { marginBottom: 6, borderRadius: 8, overflow: "hidden" },
    messageBubbleAttachmentImageElement: { width: 140, height: 140 },
    messageBubbleAttachmentFileLinkBtnText: { fontSize: 13, textDecorationLine: "underline", marginBottom: 4 },
    messageBubbleContentText: { fontSize: 13, lineHeight: 18 },
    messageBubbleMetadataRow: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 4, marginTop: 2 },
    messageBubbleTimeText: { fontSize: 9 },
    chatInputDockFooter: { borderTopWidth: 1, borderColor: colors.border, padding: 10, backgroundColor: colors.panelHeader },
    chatInputRowFlexControls: { flexDirection: "row", alignItems: "center", gap: 8 },
    chatInputAttachmentTriggerBtn: { width: 36, height: 36, borderRadius: 8, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
    chatInputTextInputField: { flex: 1, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, color: colors.text, fontSize: 13, minHeight: 36, maxHeight: 80 },
    chatInputSendActionBtn: { width: 36, height: 36, borderRadius: 8, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
    modalOverlayMask: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
    modalContentBoxContainer: { width: width * 0.92, backgroundColor: colors.background, borderRadius: 16, borderWidth: 1, borderColor: colors.border, maxHeight: "80%", overflow: "hidden" },
    modalHeaderPane: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderColor: colors.border, backgroundColor: colors.panelHeader },
    modalHeaderTitleText: { fontSize: 16, fontWeight: "800", color: colors.text },
    modalSearchWrapperBlock: { padding: 12, borderBottomWidth: 1, borderColor: colors.border },
    modalSelectorScrollArea: { padding: 8 },
    employeeSelectableRowBtn: { flexDirection: "row", alignItems: "center", padding: 10, borderRadius: 10, gap: 12, marginBottom: 4 },
    employeeInfoColumnBlock: { flex: 1 },
    employeeIdentityNameText: { fontSize: 14, fontWeight: "700", color: colors.text },
    employeeIdentityEmailText: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
    employeeBadgesRowContainer: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
    employeeDepartmentBadge: { backgroundColor: colors.border, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    employeeDepartmentBadgeText: { fontSize: 10, color: colors.text },
    employeeStatusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1 },
    employeeStatusBadgeText: { fontSize: 10 },
    employeePickerFallbackBlock: { padding: 32, alignItems: "center", justifyContent: "center" },
    employeePickerFallbackTextPrimary: { fontSize: 14, fontWeight: "700", color: colors.text, marginTop: 8 },
    employeePickerFallbackTextSecondary: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    lightboxPreviewImageElement: { width: "100%", height: width * 0.8, borderRadius: 8 },
    quickEmojiBarDock: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 12, paddingBottom: 6, borderBottomWidth: 1, borderColor: colors.border, marginBottom: 6 },
    quickEmojiItemBtn: { paddingHorizontal: 8, paddingVertical: 4 },
    quickEmojiItemBtnText: { fontSize: 16 },
    loadingBoxArea: { padding: 32, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
    loadingBoxText: { color: colors.textSecondary, fontSize: 13 }
  });
}

export default function Messages() {
  const { uiTheme } = useTheme();
  const colors = useMemo(() => buildColors(uiTheme), [uiTheme]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const queryClient = useQueryClient();
  const { user, token } = useAuth() as any;
  const currentUser = user?.fullName?.trim() || user?.username?.trim() || "";

  const [view, setView] = useState<"list" | "conversation">("list");
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const [nowTime, setNowTime] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNowTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getResolvedAvatarUri = useCallback((avatarRaw?: string) => {
    if (!avatarRaw) return null;
    let url = avatarRaw;
    if (url.startsWith("/uploads/avatars/")) {
      url = url.replace("/uploads/avatars/", "/api/s3-proxy/avatars/");
    }
    if (!url.startsWith("http") && !url.startsWith("data:")) {
      url = `https://task.se7eninc.com${url.startsWith("/") ? "" : "/"}${url}`;
    }
    let finalUrl = toProxiedUrl(url) || url;
    if (token && !finalUrl.includes("token=")) {
      finalUrl += `${finalUrl.includes("?") ? "&" : "?"}token=${token}`;
    }
    return finalUrl;
  }, [token]);

  const getAvatarRingStyles = (empStatus: string | undefined) => {
    if (empStatus === "LUNCH") return { borderWidth: 2.5, borderColor: colors.lunch };
    if (empStatus === "BREAK") return { borderWidth: 2.5, borderColor: colors.break };
    return {};
  };

  const getAvatarDotClassAndStyle = (empStatus: string | undefined, isActive: boolean) => {
    if (!isActive) return null;
    let dotBg = colors.success;
    if (empStatus === "LUNCH") dotBg = colors.lunch;
    if (empStatus === "BREAK") dotBg = colors.break;
    return <View style={s([styles.avatarOnlineStatusDot, { backgroundColor: dotBg }])} />;
  };

  const getSubtitle = (emp: any) => {
    if (emp.current_status === "LUNCH" && emp.lunch_start_time) {
      const start = new Date(emp.lunch_start_time).getTime();
      const expectedEnd = emp.lunch_expected_end ? new Date(emp.lunch_expected_end).getTime() : start + 30 * 60 * 1000;
      const diff = expectedEnd - nowTime;
      const timeStr = new Date(start).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
      if (diff > 0) {
        const m = Math.floor(diff / 60000);
        const sSec = Math.floor((diff % 60000) / 1000);
        return `On Lunch since ${timeStr} (${m}m ${sSec}s remaining)`;
      }
      return `Overdue Lunch since ${timeStr} (${Math.floor(-diff / 60000)}m overdue)`;
    }
    if (emp.current_status === "BREAK" && emp.break_start_time) {
      const start = new Date(emp.break_start_time).getTime();
      const expectedEnd = start + 15 * 60 * 1000;
      const diff = expectedEnd - nowTime;
      const timeStr = new Date(start).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
      if (diff > 0) {
        const m = Math.floor(diff / 60000);
        const sSec = Math.floor((diff % 60000) / 1000);
        return `On Break since ${timeStr} (${m}m ${sSec}s remaining)`;
      }
      return `Overdue Break since ${timeStr} (${Math.floor(-diff / 60000)}m overdue)`;
    }
    return emp.department || "No department";
  };

  const [listFilter, setListFilter] = useState<"all" | "archived" | "bookmarked">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState("");
  const [newMessageContent, setNewMessageContent] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<{ url: string; fileName: string } | null>(null);

  const [archivedConversations, setArchivedConversations] = useState<Set<string>>(new Set());
  const [bookmarkedConversations, setBookmarkedConversations] = useState<Set<string>>(new Set());

  const toggleArchive = (employeeId: string) => {
    setArchivedConversations(prev => {
      const next = new Set(prev);
      if (next.has(employeeId)) next.delete(employeeId);
      else next.add(employeeId);
      return next;
    });
  };

  const toggleBookmark = (employeeId: string) => {
    setBookmarkedConversations(prev => {
      const next = new Set(prev);
      if (next.has(employeeId)) next.delete(employeeId);
      else next.add(employeeId);
      return next;
    });
  };

  const { socket } = useSocket();

  const employeesQuery = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const res = await apiFetch<{ items: Employee[] }>("/api/employees");
      return res.items;
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  const conversationsQuery = useQuery({
    queryKey: ["conversations", currentUser],
    queryFn: async () => {
      const res = await apiFetch<{ items?: any[] }>(
        `/api/messages/conversations/${encodeURIComponent(currentUser)}`
      );
      const rawItems = Array.isArray(res) ? res : (res.items ?? []);
      return rawItems.map((c) => ({
        employee: c.employee,
        lastMessage: c.lastMessage ? normalizeMessage(c.lastMessage) : null,
        unreadCount: c.unreadCount || 0,
      }));
    },
    enabled: Boolean(currentUser),
    staleTime: 1000 * 30,
    refetchOnWindowFocus: false,
  });

  const [conversationMessages, setConversationMessages] = useState<Message[]>([]);

  const loadConversationMessages = useCallback(async (employeeName: string) => {
    if (!currentUser || !employeeName) return;
    try {
      const res = await apiFetch<{ items?: MessageApi[] }>(
        `/api/messages/conversation/${encodeURIComponent(currentUser)}/${encodeURIComponent(employeeName)}`
      );
      const msgs = res.items ?? [];
      setConversationMessages(
        msgs.map(normalizeMessage).sort((a, b) => a.id.localeCompare(b.id))
      );
    } catch {
      setConversationMessages([]);
    }
  }, [currentUser]);

  const handleFileSelected = async () => {
    if (!selectedEmployee) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "*/*" });
      if (result.canceled || !result.assets || !result.assets[0]) return;

      setUploading(true);
      const file = result.assets[0];
      const fd = new FormData();
      fd.append("file", {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || "application/octet-stream"
      } as any);

      const uploadRes = await apiFetch<{
        attachment: { fileName: string; url: string; mimeType: string; size: number };
      }>("/api/messages/upload", {
        method: "POST",
        body: fd,
      });

      const payload: Omit<Message, "id"> = {
        sender: currentUser,
        senderAvatar: getInitials(currentUser),
        recipient: selectedEmployee.name,
        content: newMessageContent.trim(),
        timestamp: new Date().toISOString(),
        type: "direct",
        status: "sent",
        attachment: uploadRes.attachment,
      };

      const res = await apiFetch<{ item?: MessageApi }>("/api/messages", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (res?.item) {
        const newMsg = normalizeMessage(res.item);
        setConversationMessages((prev) => {
          if (isDuplicateMessage(prev, newMsg)) return prev;
          return [...prev, newMsg];
        });
        setNewMessageContent("");
        await queryClient.invalidateQueries({ queryKey: ["conversations", currentUser] });
      }
    } catch {
      Alert.alert("Error", "Failed to upload file attachment.");
    } finally {
      setUploading(false);
    }
  };

  const markMessagesAsRead = async (sender: string) => {
    try {
      await apiFetch("/api/messages/mark-read", {
        method: "POST",
        body: JSON.stringify({ sender, recipient: currentUser }),
      });
      await queryClient.invalidateQueries({ queryKey: ["conversations", currentUser] });
    } catch {}
  };

  useEffect(() => {
    if (!socket) return;
    const handleNewMessage = (msg: any) => {
      const normalized = normalizeMessage(msg);
      if (!normalized.id) return;
      void queryClient.invalidateQueries({ queryKey: ["conversations", currentUser] });
      if (
        view === "conversation" &&
        selectedEmployee &&
        (normalized.sender === selectedEmployee.name || normalized.recipient === selectedEmployee.name)
      ) {
        setConversationMessages((prev) => {
          if (isDuplicateMessage(prev, normalized)) return prev;
          return [...prev, normalized].sort((a, b) => a.id.localeCompare(b.id));
        });
      }
    };
    socket.on("new-message", handleNewMessage);
    return () => { socket.off("new-message", handleNewMessage); };
  }, [socket, view, selectedEmployee?.name, currentUser, queryClient]);

  useEffect(() => {
    if (!socket) return;
    const handleStatusUpdate = (payload: any) => {
      queryClient.setQueryData<Conversation[]>(["conversations", currentUser], (old) => {
        if (!old) return old;
        return old.map((conv) => {
          if (conv.employee.id === payload.userId || conv.employee.name === payload.name) {
            return {
              ...conv,
              employee: { ...conv.employee, ...payload },
            };
          }
          return conv;
        });
      });

      setSelectedEmployee((prev) => {
        if (prev && (prev.id === payload.userId || prev.name === payload.name)) {
          return { ...prev, ...payload };
        }
        return prev;
      });
    };

    socket.on("status-update", handleStatusUpdate);
    return () => { socket.off("status-update", handleStatusUpdate); };
  }, [socket, queryClient, currentUser]);

  useEffect(() => {
    if (view !== "conversation" || !selectedEmployee) return;
    const interval = setInterval(() => {
      loadConversationMessages(selectedEmployee.name);
    }, 10000);
    return () => clearInterval(interval);
  }, [view, selectedEmployee?.name, loadConversationMessages]);

  const employees = employeesQuery.data ?? [];
  const conversations = conversationsQuery.data ?? [];

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter(
      (conv) =>
        conv.employee?.name?.toLowerCase().includes(q) ||
        conv.employee?.email?.toLowerCase().includes(q) ||
        conv.employee?.department?.toLowerCase().includes(q)
    );
  }, [conversations, searchQuery]);

  const filteredEmployees = useMemo(() => {
    if (!employeeSearchQuery.trim()) return employees;
    const q = employeeSearchQuery.toLowerCase();
    return employees.filter(
      (emp) =>
        emp.name?.toLowerCase().includes(q) ||
        emp.email?.toLowerCase().includes(q) ||
        emp.department?.toLowerCase().includes(q)
    );
  }, [employees, employeeSearchQuery]);

  const startConversation = async (employee: Employee) => {
    setSelectedEmployee(employee);
    setView("conversation");
    setIsEmployeeModalOpen(false);
    setEmployeeSearchQuery("");
    await loadConversationMessages(employee.name);
    if (employee.name) {
      await markMessagesAsRead(employee.name);
    }
  };

  const sendMessage = async () => {
    if (!newMessageContent.trim() || !selectedEmployee) return;
    setSending(true);
    try {
      const payload: Omit<Message, "id"> = {
        sender: currentUser,
        senderAvatar: getInitials(currentUser),
        recipient: selectedEmployee.name,
        content: newMessageContent.trim(),
        timestamp: new Date().toISOString(),
        type: "direct",
        status: "sent",
      };

      const res = await apiFetch<{ item?: MessageApi }>("/api/messages", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (res?.item) {
        const newMsg = normalizeMessage(res.item);
        setConversationMessages((prev) => {
          if (isDuplicateMessage(prev, newMsg)) return prev;
          return [...prev, newMsg];
        });
        setNewMessageContent("");
        await queryClient.invalidateQueries({ queryKey: ["conversations", currentUser] });
      }
    } catch {
      Alert.alert("Error", "Failed to dispatch message.");
    } finally {
      setSending(false);
    }
  };

  const formatMessageTime = (timestamp: string) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    }
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  if (conversationsQuery.isLoading) {
    return (
      <SafeAreaView style={s(styles.viewport)}>
        <View style={s(styles.loadingBoxArea)}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={s(styles.loadingBoxText)}>Loading logs...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s(styles.viewport)} edges={["top", "left", "right"]}>
      <View style={s(styles.headerRow)}>
        <View style={s(styles.pageHeaderBlock)}>
          {view === "conversation" && selectedEmployee ? (
            <>
              <TouchableOpacity style={s(styles.backBtnItem)} onPress={() => { setView("list"); setSelectedEmployee(null); }}>
                <ArrowLeft size={20} color={colors.text} />
              </TouchableOpacity>
              <View style={s(styles.avatarWrapperContainer)}>
                <View style={s([styles.avatarFrameCircle, getAvatarRingStyles(selectedEmployee.current_status)])}>
                  {getResolvedAvatarUri(selectedEmployee.avatarUrl) ? (
                    <Image source={{ uri: getResolvedAvatarUri(selectedEmployee.avatarUrl)! }} style={s(styles.avatarImageElement)} />
                  ) : (
                    <Text style={s([styles.avatarTextFallback, { color: colors.primary }])}>{getInitials(selectedEmployee.name)}</Text>
                  )}
                </View>
                {getAvatarDotClassAndStyle(selectedEmployee.current_status, selectedEmployee.status === "active")}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s(styles.conversationProfileNameText)} numberOfLines={1}>{selectedEmployee.name}</Text>
                <Text style={s(styles.pageSubtitle)} numberOfLines={1}>{getSubtitle(selectedEmployee)}</Text>
              </View>
            </>
          ) : (
            <View>
              <Text style={s(styles.pageTitle)}>Messages</Text>
              <Text style={s(styles.pageSubtitle)}>
                {conversations.length} conversation{conversations.length !== 1 ? "s" : ""}
              </Text>
            </View>
          )}
        </View>

        {view !== "conversation" && (
          <TouchableOpacity style={s(styles.newConversationBtn)} onPress={() => setIsEmployeeModalOpen(true)}>
            <Plus size={14} color="#ffffff" />
            <Text style={s(styles.newConversationBtnText)}>New Conversation</Text>
          </TouchableOpacity>
        )}
      </View>

      {view === "list" && (
        <>
          <View style={s(styles.filterTabsScroll)}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              <TouchableOpacity
                style={s([styles.filterTabCapsule, { backgroundColor: listFilter === "all" ? colors.primary : colors.cardBg, borderColor: colors.border }])}
                onPress={() => setListFilter("all")}
              >
                <Text style={s([styles.filterTabCapsuleText, { color: listFilter === "all" ? "#fff" : colors.text }])}>All</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={s([styles.filterTabCapsule, { backgroundColor: listFilter === "archived" ? colors.primary : colors.cardBg, borderColor: colors.border }])}
                onPress={() => setListFilter(listFilter === "archived" ? "all" : "archived")}
              >
                <Archive size={12} color={listFilter === "archived" ? "#fff" : colors.textSecondary} />
                <Text style={s([styles.filterTabCapsuleText, { color: listFilter === "archived" ? "#fff" : colors.text }])}>Archived ({archivedConversations.size})</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={s([styles.filterTabCapsule, { backgroundColor: listFilter === "bookmarked" ? colors.primary : colors.cardBg, borderColor: colors.border }])}
                onPress={() => setListFilter(listFilter === "bookmarked" ? "all" : "bookmarked")}
              >
                <Bookmark size={12} color={listFilter === "bookmarked" ? "#fff" : colors.textSecondary} />
                <Text style={s([styles.filterTabCapsuleText, { color: listFilter === "bookmarked" ? "#fff" : colors.text }])}>Bookmarked ({bookmarkedConversations.size})</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          <View style={s(styles.searchCardFrame)}>
            <View style={s(styles.searchBarContainer)}>
              <Search size={16} color={colors.textSecondary} />
              <TextInput
                style={s(styles.searchBarInputControl)}
                placeholder="Search conversations..."
                placeholderTextColor={colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
              />
            </View>
          </View>

          <ScrollView style={{ flex: 1 }}>
            <View style={s(styles.conversationsListContainer)}>
              {(() => {
                let displayConversations = filteredConversations;
                if (listFilter === "archived") {
                  displayConversations = filteredConversations.filter(c => archivedConversations.has(c.employee.id || c.employee._id || ""));
                } else if (listFilter === "bookmarked") {
                  displayConversations = filteredConversations.filter(c => bookmarkedConversations.has(c.employee.id || c.employee._id || ""));
                } else {
                  displayConversations = filteredConversations.filter(c => !archivedConversations.has(c.employee.id || c.employee._id || ""));
                }

                if (displayConversations.length === 0) {
                  return (
                    <View style={s(styles.fallbackEmptyContainer)}>
                      <MessageCircle size={40} color={colors.textSecondary} />
                      <Text style={s(styles.fallbackEmptyHeadingText)}>No Messages Yet</Text>
                      <Text style={s(styles.fallbackEmptySubtext)}>Start a conversation with an employee to send and receive messages.</Text>
                      <TouchableOpacity style={s(styles.fallbackEmptyActionBtn)} onPress={() => setIsEmployeeModalOpen(true)}>
                        <Plus size={16} color="#fff" />
                        <Text style={s(styles.fallbackEmptyActionBtnText)}>Start Conversation</Text>
                      </TouchableOpacity>
                    </View>
                  );
                }

                return (
                  <View>
                    <View style={s(styles.sectionChronologicalHeader)}>
                      <Text style={s(styles.sectionChronologicalHeaderText)}>Recent Communications Ledger</Text>
                    </View>
                    {displayConversations.map((conv) => {
                      const empId = conv.employee.id || conv.employee._id || "";
                      const isArchived = archivedConversations.has(empId);
                      const isBookmarked = bookmarkedConversations.has(empId);
                      const avatarUri = getResolvedAvatarUri(conv.employee.avatarUrl);

                      return (
                        <View key={empId} style={s(styles.conversationRowItem)}>
                          <TouchableOpacity style={s({ flex: 1, flexDirection: "row", alignItems: "center", gap: 12 })} onPress={() => startConversation(conv.employee)}>
                            <View style={s(styles.avatarWrapperContainer)}>
                              <View style={s([styles.avatarFrameCircle, getAvatarRingStyles(conv.employee.current_status)])}>
                                {avatarUri ? (
                                  <Image source={{ uri: avatarUri }} style={s(styles.avatarImageElement)} />
                                ) : (
                                  <Text style={s([styles.avatarTextFallback, { color: colors.primary }])}>{getInitials(conv.employee.name)}</Text>
                                )}
                              </View>
                              {getAvatarDotClassAndStyle(conv.employee.current_status, conv.employee.status === "active")}
                              {conv.unreadCount > 0 && !isArchived && (
                                <View style={s(styles.unreadCounterBadge)}>
                                  <Text style={s(styles.unreadCounterBadgeText)}>{conv.unreadCount}</Text>
                                </View>
                              )}
                            </View>

                            <View style={s(styles.conversationRowMetaColumn)}>
                              <View style={s(styles.conversationRowTopLine)}>
                                <View style={s(styles.conversationNameFlexBlock)}>
                                  <Text style={s(styles.conversationProfileNameText)} numberOfLines={1}>{conv.employee.name}</Text>
                                  {isBookmarked && <Bookmark size={12} color={colors.warning} fill={colors.warning} />}
                                </View>
                                {conv.lastMessage && (
                                  <Text style={s(styles.conversationTimestampText)}>{formatMessageTime(conv.lastMessage.timestamp)}</Text>
                                )}
                              </View>
                              <Text
                                style={s([styles.conversationSnippetText, { color: conv.unreadCount > 0 && !isArchived ? colors.text : colors.textSecondary, fontWeight: conv.unreadCount > 0 && !isArchived ? "700" : "400" }])}
                                numberOfLines={1}
                              >
                                {conv.lastMessage 
                                  ? `${conv.lastMessage.sender === currentUser ? "You: " : ""}${conv.lastMessage.content}`
                                  : "Start a conversation..."}
                              </Text>
                            </View>
                          </TouchableOpacity>

                          <View style={s(styles.conversationActionStripRow)}>
                            <TouchableOpacity style={s(styles.conversationActionIconBtn)} onPress={() => toggleBookmark(empId)}>
                              <Bookmark size={14} color={isBookmarked ? colors.warning : colors.textSecondary} fill={isBookmarked ? colors.warning : "transparent"} />
                            </TouchableOpacity>
                            <TouchableOpacity style={s(styles.conversationActionIconBtn)} onPress={() => toggleArchive(empId)}>
                              <Archive size={14} color={isArchived ? colors.primary : colors.textSecondary} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                );
              })()}
            </View>
          </ScrollView>
        </>
      )}

      {view === "conversation" && selectedEmployee && (
        <View style={s(styles.chatViewportContainer)}>
          <ScrollView
            style={s(styles.chatMessagesScrollArea)}
            contentContainerStyle={s(styles.chatMessagesScrollContent)}
            showsVerticalScrollIndicator={false}
          >
            {conversationMessages.length === 0 ? (
              <View style={s(styles.chatEmptyTimelineBlock)}>
                <MessageCircle size={36} color={colors.textSecondary} />
                <Text style={s(styles.chatEmptyTimelineTextPrimary)}>Start the conversation</Text>
                <Text style={s(styles.chatEmptyTimelineTextSecondary)}>Send a message to {selectedEmployee.name}</Text>
              </View>
            ) : (
              conversationMessages.map((msg, idx) => {
                const isMe = msg.sender === currentUser;
                const showAvatar = idx === 0 || conversationMessages[idx - 1].sender !== msg.sender;
                const attachmentUrl = msg.attachment?.url || "";
                const attachmentName = msg.attachment?.fileName || "Attachment";
                const isImage = msg.attachment?.mimeType?.startsWith("image/") || false;
                const selectedEmpAvatarUri = getResolvedAvatarUri(selectedEmployee.avatarUrl);

                return (
                  <View key={msg.id} style={s([styles.messageBubbleWrapperFlex, { flexDirection: isMe ? "row-reverse" : "row" }])}>
                    {showAvatar && !isMe ? (
                      <View style={s(styles.avatarWrapperContainer)}>
                        <View style={s([styles.messageAvatarStubCircle, getAvatarRingStyles(selectedEmployee.current_status)])}>
                          {selectedEmpAvatarUri ? (
                            <Image source={{ uri: selectedEmpAvatarUri }} style={{ width: 24, height: 24, borderRadius: 12 }} />
                          ) : (
                            <Text style={s([styles.messageAvatarStubText, { color: colors.primary }])}>{getInitials(msg.sender)}</Text>
                          )}
                        </View>
                      </View>
                    ) : (
                      <View style={{ width: 24 }} />
                    )}

                    <View style={s([styles.messageBubbleBodyCard, { backgroundColor: isMe ? colors.bubbleMe : colors.bubbleOther }])}>
                      {!!attachmentUrl && (
                        isImage ? (
                          <TouchableOpacity style={s(styles.messageBubbleAttachmentPreviewBtn)} onPress={() => setPreview({ url: attachmentUrl, fileName: attachmentName })}>
                            <Image source={{ uri: getResolvedAvatarUri(attachmentUrl) || attachmentUrl }} style={s(styles.messageBubbleAttachmentImageElement)} resizeMode="cover" />
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity onPress={() => Share.share({ message: attachmentUrl })}>
                            <Text style={s([styles.messageBubbleAttachmentFileLinkBtnText, { color: isMe ? "#fff" : colors.primary }])}>
                              📎 {attachmentName}
                            </Text>
                          </TouchableOpacity>
                        )
                      )}

                      {!!msg.content?.trim() && (
                        <Text style={s([styles.messageBubbleContentText, { color: isMe ? "#ffffff" : colors.text }])}>
                          {msg.content}
                        </Text>
                      )}

                      <View style={s(styles.messageBubbleMetadataRow)}>
                        <Text style={s([styles.messageBubbleTimeText, { color: isMe ? "rgba(255,255,255,0.7)" : colors.textSecondary }])}>
                          {formatMessageTime(msg.timestamp)}
                        </Text>
                        {isMe && (
                          <Text style={{ fontSize: 9, color: "rgba(255,255,255,0.8)" }}>
                            {msg.status === "read" ? "✓✓" : "✓"}
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>

          <View style={s(styles.chatInputDockFooter)}>
            <View style={s(styles.quickEmojiBarDock)}>
              {["👍", "❤️", "😂", "😮", "🙏", "✅"].map(emoji => (
                <TouchableOpacity key={emoji} style={s(styles.quickEmojiItemBtn)} onPress={() => setNewMessageContent(p => p + emoji)}>
                  <Text style={s(styles.quickEmojiItemBtnText)}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={s(styles.chatInputRowFlexControls)}>
              <TouchableOpacity style={s(styles.chatInputAttachmentTriggerBtn)} disabled={uploading} onPress={handleFileSelected}>
                <Paperclip size={16} color={colors.textSecondary} />
              </TouchableOpacity>

              <TextInput
                style={s(styles.chatInputTextInputField)}
                placeholder={`Message ${selectedEmployee.name}...`}
                placeholderTextColor={colors.textSecondary}
                value={newMessageContent}
                onChangeText={setNewMessageContent}
                multiline
              />

              <TouchableOpacity
                style={s([styles.chatInputSendActionBtn, { opacity: !newMessageContent.trim() || sending || uploading ? 0.6 : 1 }])}
                disabled={!newMessageContent.trim() || sending || uploading}
                onPress={sendMessage}
              >
                {sending || uploading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Send size={15} color="#ffffff" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <Modal visible={isEmployeeModalOpen} transparent animationType="slide">
        <View style={s(styles.modalOverlayMask)}>
          <View style={s(styles.modalContentBoxContainer)}>
            <View style={s(styles.modalHeaderPane)}>
              <Text style={s(styles.modalHeaderTitleText)}>Select Employee to Message</Text>
              <TouchableOpacity onPress={() => setIsEmployeeModalOpen(false)}>
                <X size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={s(styles.modalSearchWrapperBlock)}>
              <View style={s([styles.searchBarContainer, { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 10 }])}>
                <Search size={14} color={colors.textSecondary} />
                <TextInput
                  style={s(styles.searchBarInputControl)}
                  placeholder="Search employees by name, email, or department..."
                  placeholderTextColor={colors.textSecondary}
                  value={employeeSearchQuery}
                  onChangeText={setEmployeeSearchQuery}
                  autoCorrect={false}
                />
              </View>
            </View>

            <ScrollView contentContainerStyle={s(styles.modalSelectorScrollArea)}>
              {filteredEmployees.map((emp) => {
                const empAvatarUri = getResolvedAvatarUri(emp.avatarUrl);
                return (
                  <TouchableOpacity key={emp.id || emp._id} style={s(styles.employeeSelectableRowBtn)} onPress={() => startConversation(emp)}>
                    <View style={s(styles.avatarWrapperContainer)}>
                      <View style={s([styles.avatarFrameCircle, getAvatarRingStyles(emp.current_status), { width: 36, height: 36 }])}>
                        {empAvatarUri ? (
                          <Image source={{ uri: empAvatarUri }} style={{ width: 36, height: 36, borderRadius: 18 }} />
                        ) : (
                          <Text style={s([styles.avatarTextFallback, { color: colors.primary, fontSize: 12 }])}>{getInitials(emp.name)}</Text>
                        )}
                      </View>
                      {getAvatarDotClassAndStyle(emp.current_status, emp.status === "active")}
                    </View>
                    <View style={s(styles.employeeInfoColumnBlock)}>
                      <Text style={s(styles.employeeIdentityNameText)} numberOfLines={1}>{emp.name}</Text>
                      <Text style={s(styles.employeeIdentityEmailText)} numberOfLines={1}>{emp.email}</Text>
                      <View style={s(styles.employeeBadgesRowContainer)}>
                        <View style={s(styles.employeeDepartmentBadge)}>
                          <Text style={s(styles.employeeDepartmentBadgeText)}>{emp.department || "General Team"}</Text>
                        </View>
                        <View style={s([styles.employeeStatusBadge, { borderColor: emp.status === "active" ? colors.success : colors.textSecondary }])}>
                          <Text style={s([styles.employeeStatusBadgeText, { color: emp.status === "active" ? colors.success : colors.textSecondary }])}>
                            {emp.status}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}

              {filteredEmployees.length === 0 && (
                <View style={s(styles.employeePickerFallbackBlock)}>
                  <User size={32} color={colors.textSecondary} />
                  <Text style={s(styles.employeePickerFallbackTextPrimary)}>No employees found</Text>
                  <Text style={s(styles.employeePickerFallbackTextSecondary)}>Try adjusting your search filters.</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={!!preview} transparent animationType="fade">
        <View style={s(styles.modalOverlayMask)}>
          <View style={s([styles.modalContentBoxContainer, { width: width * 0.95 }])}>
            <View style={s(styles.modalHeaderPane)}>
              <Text style={s([styles.modalHeaderTitleText, { flex: 1, marginRight: 12 }])} numberOfLines={1}>
                {preview?.fileName}
              </Text>
              <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                <TouchableOpacity onPress={() => preview && Share.share({ message: preview.url })}>
                  <Download size={18} color={colors.text} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setPreview(null)}>
                  <X size={18} color={colors.text} />
                </TouchableOpacity>
              </View>
            </View>
            <View style={{ padding: 12, alignItems: "center", backgroundColor: "#000" }}>
              {preview && (
                <Image source={{ uri: getResolvedAvatarUri(preview.url) || preview.url }} style={s(styles.lightboxPreviewImageElement)} resizeMode="contain" />
              )}
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}