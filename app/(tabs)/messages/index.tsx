import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Image,
  Dimensions,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  MessageCircle,
  Send,
  Search,
  ChevronLeft,
  Check,
  CheckCheck,
  Paperclip,
  Download,
} from "lucide-react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

// --- Hooks / Context / API Imports ---
// Maintain standard project configurations for your API endpoints and socket states
import { useSocket } from "@/contexts/SocketContext";
import { useQueryClient } from "@tanstack/react-query";
import {
  getEmployeeConversations,
  getConversation,
  sendMessage,
  markMessagesAsRead,
  getEmployeeProfile,
  uploadMessageAttachment,
  toProxiedUrl,
} from "@/lib/admin/apiClient";

interface Conversation {
  employee: {
    id: string;
    name: string;
    email: string;
    department: string;
    status: string;
    initials: string;
    avatarUrl?: string;
    current_status?: string;
    lunch_start_time?: string | null;
    lunch_expected_end?: string | null;
    break_start_time?: string | null;
  };
  lastMessage: {
    id: string;
    content: string;
    timestamp: string;
    sender: string;
    status: string;
  } | null;
  unreadCount: number;
}

interface Message {
  id: string;
  sender: string;
  recipient: string;
  content: string;
  timestamp: string;
  type: string;
  status: string;
  attachment?: { fileName?: string; url?: string; mimeType?: string; size?: number };
}

const normalizeMessage = (m: any): Message => {
  return {
    id: String(m.id || m._id || ""),
    sender: String(m.sender || ""),
    recipient: String(m.recipient || ""),
    content: String(m.content || ""),
    timestamp: String(m.timestamp || m.createdAt || new Date().toISOString()),
    type: String(m.type || "direct"),
    status: String(m.status || "sent"),
    attachment: m.attachment,
  };
};

export default function EmployeeMessagesScreen() {
  const queryClient = useQueryClient();
  const { socket } = useSocket();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [employeeName, setEmployeeName] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [messageInput, setMessageInput] = useState("");
  
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<{ url: string; fileName: string } | null>(null);

  const [nowTime, setNowTime] = useState(Date.now());
  const chatScrollViewRef = useRef<ScrollView>(null);

  // Live Timer for status metadata calculations
  useEffect(() => {
    const timer = setInterval(() => setNowTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch initial base context profile and conversations 
  useEffect(() => {
    const loadConversations = async () => {
      try {
        const profileRes = await getEmployeeProfile();
        const name = profileRes.item.name;
        setEmployeeName(name);

        const convRes = await getEmployeeConversations(name);
        setConversations(convRes.items || []);
      } catch (err) {
        console.error("Failed to load conversations:", err);
      } finally {
        setLoading(false);
      }
    };
    loadConversations();
  }, []);

  // Live Sync Socket Engine 
  useEffect(() => {
    if (!socket || !employeeName) return;

    const handleNewMessage = (data: any) => {
      if (data.sender === employeeName || data.recipient === employeeName) {
        const normalized = normalizeMessage(data);
        if (!normalized.id) return;

        const partnerName = selectedConversation?.employee?.name;
        if (partnerName && (normalized.sender === partnerName || normalized.recipient === partnerName)) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === normalized.id)) return prev;
            return [...prev, normalized].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
          });
          setTimeout(() => chatScrollViewRef.current?.scrollToEnd({ animated: true }), 100);
        }

        getEmployeeConversations(employeeName)
          .then((res) => setConversations(res.items || []))
          .catch(() => {});
      }
    };

    const handleStatusUpdate = (payload: any) => {
      const updateFn = (c: Conversation) => {
        if (c.employee.id === payload.userId || c.employee.name === payload.name) {
          return {
            ...c,
            employee: {
              ...c.employee,
              current_status: payload.current_status,
              lunch_start_time: payload.lunch_start_time,
              lunch_expected_end: payload.lunch_expected_end,
              break_start_time: payload.break_start_time,
            },
          };
        }
        return c;
      };

      setConversations((prev) => prev.map(updateFn));
      setSelectedConversation((prev) => (prev ? updateFn(prev) : null));
    };

    socket.on("new-message", handleNewMessage);
    socket.on("status-update", handleStatusUpdate);

    return () => {
      socket.off("new-message", handleNewMessage);
      socket.off("status-update", handleStatusUpdate);
    };
  }, [socket, employeeName, selectedConversation?.employee?.name]);

  // Polling fallback
  useEffect(() => {
    if (!selectedConversation || !employeeName) return;
    const interval = setInterval(async () => {
      try {
        const res = await getConversation(employeeName, selectedConversation.employee.name);
        setMessages(res.items || []);
      } catch { /* silence polling errors */ }
    }, 3000);
    return () => clearInterval(interval);
  }, [selectedConversation?.employee?.name, employeeName]);

  // Load and Mark Active Chat Thread
  useEffect(() => {
    if (!selectedConversation || !employeeName) return;

    const loadMessages = async () => {
      try {
        const res = await getConversation(employeeName, selectedConversation.employee.name);
        setMessages(res.items || []);
        setTimeout(() => chatScrollViewRef.current?.scrollToEnd({ animated: false }), 50);

        if (selectedConversation.unreadCount > 0) {
          await markMessagesAsRead(selectedConversation.employee.name, employeeName);
          queryClient.invalidateQueries({ queryKey: ["employee-conversations-preview", employeeName] });
          setConversations((prev) =>
            prev.map((c) =>
              c.employee.id === selectedConversation.employee.id ? { ...c, unreadCount: 0 } : c
            )
          );
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadMessages();
  }, [selectedConversation, employeeName]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation || !employeeName) return;

    setSending(true);
    try {
      const payload = {
        sender: employeeName,
        recipient: selectedConversation.employee.name,
        content: messageInput.trim(),
        timestamp: new Date().toISOString(),
        type: "direct",
        status: "sent",
      };

      const res = await sendMessage(payload);
      const normalized = normalizeMessage(res.item);
      
      setMessages((prev) => [...prev, normalized]);
      setMessageInput("");
      setTimeout(() => chatScrollViewRef.current?.scrollToEnd({ animated: true }), 100);

      setConversations((prev) =>
        prev.map((c) =>
          c.employee.id === selectedConversation.employee.id ? { ...c, lastMessage: res.item } : c
        )
      );
    } catch (err) {
      Alert.alert("Transmission Error", "Could not send text message.");
    } finally {
      setSending(false);
    }
  };

  const handleAttachFile = async () => {
    if (!selectedConversation || !employeeName) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "*/*", copyToCacheDirectory: true });
      if (result.canceled || !result.assets?.length) return;

      setUploading(true);
      const fileAsset = result.assets[0];
      
      // Map document layout data structure to a compatible native file package object
      const filePayload: any = {
        uri: fileAsset.uri,
        name: fileAsset.name,
        type: fileAsset.mimeType || "application/octet-stream",
      };

      const up = await uploadMessageAttachment(filePayload);
      const payload = {
        sender: employeeName,
        recipient: selectedConversation.employee.name,
        content: "",
        timestamp: new Date().toISOString(),
        type: "direct",
        status: "sent",
        attachment: up.attachment,
      };

      const res = await sendMessage(payload);
      setMessages((prev) => [...prev, normalizeMessage(res.item)]);
      setTimeout(() => chatScrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err) {
      Alert.alert("Upload Failed", "Error processing document payload binary.");
    } finally {
      setUploading(false);
    }
  };

  const downloadAttachmentNative = async (url: string, fileName: string) => {
    const safeUrl = toProxiedUrl(url) || url;
    try {
      const localTargetUri = `${FileSystem.documentDirectory}${Date.now()}_${fileName}`;
      const { uri } = await FileSystem.downloadAsync(safeUrl, localTargetUri);
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      } else {
        Alert.alert("Success", `File saved down to safe workspace folder location: ${uri}`);
      }
    } catch (err) {
      Alert.alert("Download Interrupted", "Could not process media streams natively.");
    }
  };

  // Status Style Helper mappings 
  const getAvatarBorderColor = (empStatus: string | undefined) => {
    if (empStatus === "LUNCH") return "#f59e0b";
    if (empStatus === "BREAK") return "#8b5cf6";
    return "#27272a";
  };

  const getSubtitleText = (emp: any) => {
    if (emp.current_status === "LUNCH" && emp.lunch_start_time) {
      const start = new Date(emp.lunch_start_time).getTime();
      const expectedEnd = emp.lunch_expected_end ? new Date(emp.lunch_expected_end).getTime() : start + 30 * 60 * 1000;
      const diff = expectedEnd - nowTime;
      if (diff > 0) return `Lunch (${Math.floor(diff / 60000)}m remaining)`;
      return `Lunch (${Math.floor(-diff / 60000)}m overdue)`;
    }
    if (emp.current_status === "BREAK" && emp.break_start_time) {
      const start = new Date(emp.break_start_time).getTime();
      const diff = start + 15 * 60 * 1000 - nowTime;
      if (diff > 0) return `Break (${Math.floor(diff / 60000)}m remaining)`;
      return `Break (${Math.floor(-diff / 60000)}m overdue)`;
    }
    return emp.department || "No department listed";
  };

  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  const filteredConversations = conversations.filter((c) =>
    c.employee.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  // --- RENDERING ROUTE A: EXPANDED LIVE CONVERSATION VIEWPORT ---
  if (selectedConversation) {
    return (
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        {/* Chat Control Header */}
        <View style={styles.chatHeader}>
          <TouchableOpacity onPress={() => setSelectedConversation(null)} style={styles.backButton}>
            <ChevronLeft color="#ffffff" size={24} />
          </TouchableOpacity>

          <View style={[styles.avatarContainer, { borderColor: getAvatarBorderColor(selectedConversation.employee.current_status), borderWidth: 2 }]}>
            <Text style={styles.avatarText}>{selectedConversation.employee.initials}</Text>
          </View>

          <View style={styles.headerInfo}>
            <Text style={styles.headerNameText} numberOfLines={1}>{selectedConversation.employee.name}</Text>
            <Text style={styles.headerStatusSub} numberOfLines={1}>{getSubtitleText(selectedConversation.employee)}</Text>
          </View>

          <View style={[styles.statusIndicator, { backgroundColor: selectedConversation.employee.status === "active" ? "#22c55e" : "#71717a" }]} />
        </View>

        {/* Dynamic Scroll Content Array */}
        <ScrollView 
          ref={chatScrollViewRef}
          contentContainerStyle={styles.chatScrollContent}
          onContentSizeChange={() => chatScrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.length === 0 ? (
            <View style={styles.emptyState}>
              <MessageCircle color="#3f3f46" size={48} />
              <Text style={styles.emptyStateText}>No messages layout loaded. Say hello!</Text>
            </View>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender === employeeName;
              const hasAttachment = !!msg.attachment?.url;
              const isImg = msg.attachment?.mimeType?.startsWith("image/");

              return (
                <View key={msg.id} style={[styles.messageBubbleRow, isMe ? styles.rowMe : styles.rowThem]}>
                  <View style={[styles.bubbleBlock, isMe ? styles.bubbleMe : styles.bubbleThem]}>
                    
                    {hasAttachment && (
                      <View style={styles.attachmentWrapper}>
                        {isImg ? (
                          <TouchableOpacity onPress={() => setPreview({ url: msg.attachment!.url!, fileName: msg.attachment!.fileName! })}>
                            <Image source={{ uri: toProxiedUrl(msg.attachment!.url!) }} style={styles.inlineImagePreview} />
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity 
                            style={styles.fileDownloadBtn} 
                            onPress={() => downloadAttachmentNative(msg.attachment!.url!, msg.attachment!.fileName!)}
                          >
                            <Download color="#3b82f6" size={16} style={{ marginRight: 6 }} />
                            <Text style={styles.fileDownloadText} numberOfLines={1}>{msg.attachment!.fileName}</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}

                    {msg.content?.trim() ? <Text style={styles.messageTextContent}>{msg.content}</Text> : null}

                    <View style={styles.bubbleFooterRow}>
                      <Text style={styles.bubbleTimeStr}>{formatTime(msg.timestamp)}</Text>
                      {isMe && (msg.status === "read" ? <CheckCheck color="#38bdf8" size={12} /> : <Check color="#a1a1aa" size={12} />)}
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        {/* Message Input Strip Bar */}
        <View style={styles.inputDockContainer}>
          <TouchableOpacity style={styles.dockActionBtn} onPress={handleAttachFile} disabled={uploading}>
            {uploading ? <ActivityIndicator size="small" color="#ffffff" /> : <Paperclip color="#a1a1aa" size={20} />}
          </TouchableOpacity>

          <TextInput
            style={styles.dockInputStyle}
            placeholder="Write an internal secure reply..."
            placeholderTextColor="#71717a"
            value={messageInput}
            onChangeText={setMessageInput}
            multiline
          />

          <TouchableOpacity 
            style={[styles.sendActionBtn, !messageInput.trim() && styles.disabledSendBtn]} 
            onPress={handleSendMessage}
            disabled={!messageInput.trim() || sending}
          >
            <Send color="#ffffff" size={18} />
          </TouchableOpacity>
        </View>

        {/* Media Overlay Lightbox Viewer Modal */}
        <Modal visible={!!preview} transparent animationType="fade" onRequestClose={() => setPreview(null)}>
          <View style={styles.modalLightboxContainer}>
            <View style={styles.modalTopNavbar}>
              <Text style={styles.lightboxTitleText} numberOfLines={1}>{preview?.fileName}</Text>
              <View style={{ flexDirection: "row", gap: 14 }}>
                <TouchableOpacity onPress={() => downloadAttachmentNative(preview!.url, preview!.fileName)}>
                  <Download color="#ffffff" size={22} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setPreview(null)}>
                  <Text style={styles.lightboxCloseLabel}>Dismiss</Text>
                </TouchableOpacity>
              </View>
            </View>
            {preview?.url && <Image source={{ uri: toProxiedUrl(preview.url) }} style={styles.lightboxImageFrame} resizeMode="contain" />}
          </View>
        </Modal>
      </KeyboardAvoidingView>
    );
  }

  // --- RENDERING ROUTE B: CORE CHANNELS CONVERSATIONS MASTER FEED ---
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        <Text style={styles.mainHeadingTitle}>Messages</Text>

        {/* Realtime Directory Query Filter Strip */}
        <View style={styles.searchBarBox}>
          <Search color="#71717a" size={18} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInputField}
            placeholder="Query workspace conversations..."
            placeholderTextColor="#71717a"
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>

        {/* Channel Selection Matrix */}
        <View style={styles.conversationsShellCard}>
          {filteredConversations.length === 0 ? (
            <View style={{ padding: 40, alignItems: "center" }}>
              <MessageCircle color="#27272a" size={40} />
              <Text style={styles.emptyStateText}>No conversations found matching criteria.</Text>
            </View>
          ) : (
            filteredConversations.map((c) => {
              const borderCol = getAvatarBorderColor(c.employee.current_status);
              return (
                <TouchableOpacity
                  key={c.employee.id}
                  style={styles.channelRowSelector}
                  activeOpacity={0.75}
                  onPress={() => setSelectedConversation(c)}
                >
                  <View style={[styles.avatarContainer, { borderColor: borderCol, borderWidth: 2 }]}>
                    <Text style={styles.avatarText}>{c.employee.initials}</Text>
                    <View style={[styles.inlineStatusDot, { backgroundColor: c.employee.status === "active" ? "#22c55e" : "#71717a" }]} />
                  </View>

                  <View style={styles.channelMetaBody}>
                    <View style={styles.channelMetaTopRow}>
                      <Text style={styles.channelPartnerName} numberOfLines={1}>{c.employee.name}</Text>
                      {c.lastMessage && <Text style={styles.channelTimeLabel}>{formatTime(c.lastMessage.timestamp)}</Text>}
                    </View>
                    <Text style={styles.channelMessagePreview} numberOfLines={1}>
                      {c.lastMessage ? c.lastMessage.content : "No structural logs shared yet."}
                    </Text>
                  </View>

                  {c.unreadCount > 0 && (
                    <View style={styles.badgeIndicatorNotification}>
                      <Text style={styles.notificationBadgeText}>{c.unreadCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// --- Dynamic Screen Dimension Computations ---
const { width, height } = Dimensions.get("window");

// --- Premium Deep Space Matte Dark System Theme Stylesheet Layout ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#09090b" },
  center: { justifyContent: "center", alignItems: "center" },
  scrollContainer: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 40 },
  
  mainHeadingTitle: { color: "#ffffff", fontSize: 26, fontWeight: "bold", letterSpacing: -0.5, marginBottom: 16 },
  
  // Custom Filters Section
  searchBarBox: { height: 44, backgroundColor: "#18181b", borderColor: "#27272a", borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", marginBottom: 16 },
  searchInputField: { flex: 1, color: "#ffffff", fontSize: 14 },

  // Directory Channels Blueprint 
  conversationsShellCard: { backgroundColor: "#18181b", borderColor: "#27272a", borderWidth: 1, borderRadius: 12, overflow: "hidden" },
  channelRowSelector: { flexDirection: "row", alignItems: "center", padding: 14, borderBottomWidth: 1, borderBottomColor: "#27272a" },
  channelMetaBody: { flex: 1, marginLeft: 12, marginRight: 8, gap: 2 },
  channelMetaTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  channelPartnerName: { color: "#ffffff", fontSize: 14, fontWeight: "600" },
  channelTimeLabel: { color: "#71717a", fontSize: 11 },
  channelMessagePreview: { color: "#a1a1aa", fontSize: 13 },

  // Atomic Badging Structures
  badgeIndicatorNotification: { minWidth: 20, height: 20, backgroundColor: "#2563eb", borderRadius: 10, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  notificationBadgeText: { color: "#ffffff", fontSize: 10, fontWeight: "bold" },
  inlineStatusDot: { width: 10, height: 10, borderRadius: 5, position: "absolute", bottom: -2, right: -2, borderWidth: 1.5, borderColor: "#18181b" },

  // Focused Active Thread View Layouts
  chatHeader: { height: 64, backgroundColor: "#18181b", borderBottomWidth: 1, borderBottomColor: "#27272a", flexDirection: "row", alignItems: "center", paddingHorizontal: 12 },
  backButton: { marginRight: 8, padding: 4 },
  headerInfo: { flex: 1, marginLeft: 10, gap: 1 },
  headerNameText: { color: "#ffffff", fontSize: 15, fontWeight: "700" },
  headerStatusSub: { color: "#a1a1aa", fontSize: 12 },
  statusIndicator: { width: 8, height: 8, borderRadius: 4, marginRight: 4 },

  // Chat Scroller Rules
  chatScrollContent: { padding: 16, paddingBottom: 24 },
  emptyState: { paddingVertical: 60, alignItems: "center", gap: 12 },
  emptyStateText: { color: "#71717a", fontSize: 14, textAlign: "center" },

  // Messaging Atomic Message Bubbles Packaging Architecture
  messageBubbleRow: { flexDirection: "row", marginBottom: 12, width: "100%" },
  rowMe: { justifyContent: "flex-end" },
  rowThem: { justifyContent: "flex-start" },
  bubbleBlock: { maxWidth: "80%", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, elevation: 1 },
  bubbleMe: { backgroundColor: "#1e3a8a", borderBottomRightRadius: 2 },
  bubbleThem: { backgroundColor: "#27272a", borderBottomLeftRadius: 2 },
  messageTextContent: { color: "#ffffff", fontSize: 14, lineHeight: 19 },
  bubbleFooterRow: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 4, marginTop: 4 },
  bubbleTimeStr: { color: "#a1a1aa", fontSize: 10 },

  // Inline Attachment Elements
  attachmentWrapper: { marginBottom: 6, borderRadius: 6, overflow: "hidden" },
  inlineImagePreview: { width: 180, height: 140, borderRadius: 6, backgroundColor: "#09090b" },
  fileDownloadBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#09090b", padding: 8, borderRadius: 6, maxWidth: 200 },
  fileDownloadText: { color: "#3b82f6", fontSize: 12, textDecorationLine: "underline" },

  // Dock Message Bar Styling Configurations
  inputDockContainer: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#18181b", borderTopWidth: 1, borderTopColor: "#27272a", flexDirection: "row", alignItems: "center", gap: 8 },
  dockActionBtn: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  dockInputStyle: { flex: 1, minHeight: 38, maxHeight: 100, backgroundColor: "#09090b", borderRadius: 20, borderWidth: 1, borderColor: "#27272a", paddingHorizontal: 16, paddingVertical: 8, color: "#ffffff", fontSize: 14 },
  sendActionBtn: { width: 38, height: 38, backgroundColor: "#2563eb", borderRadius: 19, alignItems: "center", justifyContent: "center" },
  disabledSendBtn: { backgroundColor: "#1d4ed8", opacity: 0.4 },

  // Media Overlays Lightbox Modules Frameworks
  modalLightboxContainer: { flex: 1, backgroundColor: "#000000ef", justifyContent: "center", alignItems: "center" },
  modalTopNavbar: { position: "absolute", top: 40, left: 0, right: 0, height: 50, paddingHorizontal: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center", zIndex: 10 },
  lightboxTitleText: { color: "#ffffff", fontSize: 14, fontWeight: "600", width: width * 0.5 },
  lightboxCloseLabel: { color: "#ef4444", fontWeight: "700", fontSize: 14 },
  lightboxImageFrame: { width: width, height: height * 0.75 },

  // Base Fallback Avatar Element Styles
  avatarContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#1e3a8a", justifyContent: "center", alignItems: "center", position: "relative" },
  avatarText: { color: "#ffffff", fontWeight: "700", fontSize: 14 },
});