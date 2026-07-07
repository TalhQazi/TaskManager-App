import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  Modal,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
  Dimensions
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
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
  Smile,
  X
} from "lucide-react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSocket } from "@/contexts/SocketContext";

import { useAuth } from "@/contexts/AuthContext";
import { apiFetch, toProxiedUrl } from "@/lib/admin/apiClient";
import Colors from "@/constants/colors";



interface Employee {
  id: string;
  _id?: string;
  name: string;
  initials: string;
  email: string;
  role: string;
  department: string;
  status: string;
  avatarUrl?: string;
  milestoneLevel?: string;
  milestoneLabel?: string;
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

function getInitials(name: string): string {
  return String(name || "")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const COMMON_EMOJIS = ["😀", "😂", "🥰", "👍", "🔥", "🙏", "❤️", "✨", "🙌", "🎉", "😎", "🚀"];

export default function Messages({ route, navigation }: any) {
    const { user, isLoading: authLoading } = useAuth();
    console.log(user);
  const queryClient = useQueryClient();
  const [view, setView] = useState<"list" | "conversation" | "employees">("list");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [nowTime, setNowTime] = useState(Date.now());

  // Local Storage State Management (Ported from localStorage to AsyncStorage)
  const [archivedConversations, setArchivedConversations] = useState<Set<string>>(new Set());
  const [bookmarkedConversations, setBookmarkedConversations] = useState<Set<string>>(new Set());

  const [listFilter, setListFilter] = useState<"all" | "archived" | "bookmarked">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState("");
  const [newMessageContent, setNewMessageContent] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<{ url: string; fileName: string } | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [conversationMessages, setConversationMessages] = useState<Message[]>([]);

  const flatListRef = useRef<FlatList>(null);

  // Sync Timer Clock
  useEffect(() => {
    const timer = setInterval(() => setNowTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Load Persisted Sync State on Mount
  useEffect(() => {
    const loadSavedData = async () => {
      try {
        const savedArchived = await AsyncStorage.getItem("manager-messaging-archived");
        const savedBookmarked = await AsyncStorage.getItem("manager-messaging-bookmarked");
        if (savedArchived) setArchivedConversations(new Set(JSON.parse(savedArchived)));
        if (savedBookmarked) setBookmarkedConversations(new Set(JSON.parse(savedBookmarked)));
      } catch (e) {
        console.error("Failed to load local storage state variables", e);
      }
    };
    loadSavedData();
  }, []);

  // Handle route params for deep navigation checks (Replacing web route location states)
  useEffect(() => {
    if (route?.params?.selectedEmployee) {
      startConversation(route.params.selectedEmployee);
    }
  }, [route?.params]);

  const toggleArchive = async (employeeId: string) => {
    const next = new Set(archivedConversations);
    if (next.has(employeeId)) next.delete(employeeId);
    else next.add(employeeId);
    setArchivedConversations(next);
    await AsyncStorage.setItem("manager-messaging-archived", JSON.stringify([...next]));
  };

  const toggleBookmark = async (employeeId: string) => {
    const next = new Set(bookmarkedConversations);
    if (next.has(employeeId)) next.delete(employeeId);
    else next.add(employeeId);
    setBookmarkedConversations(next);
    await AsyncStorage.setItem("manager-messaging-bookmarked", JSON.stringify([...next]));
  };

  const { socket } = useSocket();
 
  const currentUser = user?.fullName?.trim() || user?.username?.trim() || "";

  // Queries matching TanStack React Query Configuration
  const employeesQuery = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const res = await apiFetch<{ items: Employee[] }>("/api/employees");
      return res.items;
    },
  });

  const conversationsQuery = useQuery({
    queryKey: ["conversations", currentUser],
    queryFn: async () => {
      const res = await apiFetch<{ items?: any[] }>(
        `/api/messages/conversations/${encodeURIComponent(currentUser)}`
      );
      return (res.items ?? []).map((c) => ({
        employee: c.employee,
        lastMessage: c.lastMessage,
        unreadCount: c.unreadCount,
      }));
    },
  });

  const loadConversationMessages = async (employeeName: string) => {
    try {
      const res = await apiFetch<{ items?: MessageApi[] }>(
        `/api/messages/conversation/${encodeURIComponent(currentUser)}/${encodeURIComponent(employeeName)}`
      );
      const msgs = res.items ?? [];
      setConversationMessages(
        msgs.map(normalizeMessage).sort((a, b) => a.id.localeCompare(b.id))
      );
    } catch (e) {
      console.error(e);
    }
  };

  // Real-time Event Socket Configurations
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
          if (prev.some((m) => m.id === normalized.id)) return prev;
          return [...prev, normalized].sort((a, b) => a.id.localeCompare(b.id));
        });
      }
    };
    socket.on("new-message", handleNewMessage);
    return () => { socket.off("new-message", handleNewMessage); };
  }, [socket, view, selectedEmployee?.name]);

  useEffect(() => {
    if (!socket) return;
    const handleStatusUpdate = (payload: any) => {
      queryClient.invalidateQueries({ queryKey: ["conversations", currentUser] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      if (selectedEmployee && (selectedEmployee.id === payload.userId || selectedEmployee.name === payload.name)) {
        setSelectedEmployee((prev: any) => prev ? { ...prev, ...payload } : null);
      }
    };
    socket.on("status-update", handleStatusUpdate);
    return () => { socket.off("status-update", handleStatusUpdate); };
  }, [socket, selectedEmployee]);

  // Polling fallback loop
  useEffect(() => {
    if (view !== "conversation" || !selectedEmployee) return;
    const interval = setInterval(() => {
      loadConversationMessages(selectedEmployee.name);
    }, 3000);
    return () => clearInterval(interval);
  }, [view, selectedEmployee?.name]);

  const startConversation = async (employee: Employee) => {
    setSelectedEmployee(employee);
    setView("conversation");
    await loadConversationMessages(employee.name);
    try {
      await apiFetch("/api/messages/mark-read", {
        method: "POST",
        body: JSON.stringify({ sender: employee.name, recipient: currentUser }),
      });
      await queryClient.invalidateQueries({ queryKey: ["conversations", currentUser] });
    } catch (e) {
      console.error(e);
    }
  };

  // Mobile Attachment Picker (Replacing <input type="file" />)
  const handleFilePick = async () => {
    if (!selectedEmployee) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "*/*" });
      if (result.canceled || !result.assets || result.assets.length === 0) return;

      setUploading(true);
      const pickedFile = result.assets[0];

      const fd = new FormData();
      // Expo-specific FormData object structure injection rules for file fields
      fd.append("file", {
        uri: pickedFile.uri,
        name: pickedFile.name,
        type: pickedFile.mimeType || "application/octet-stream",
      } as any);

      const res = await apiFetch<{ attachment: any }>("/api/messages/upload", {
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
        attachment: res.attachment,
      };

      const msgRes = await apiFetch<{ item?: MessageApi }>("/api/messages", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (msgRes?.item) {
        setConversationMessages((prev) => [...prev, normalizeMessage(msgRes.item)]);
        setNewMessageContent("");
        await queryClient.invalidateQueries({ queryKey: ["conversations", currentUser] });
      }
    } catch (e) {
      console.error("Attachment processing error", e);
    } finally {
      setUploading(false);
    }
  };

  // Cross-Platform Native File Downloader Integration
  const downloadAttachment = async (url: string, fileName: string) => {
    try {
      const safeUrl = toProxiedUrl(url) || url;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      const downloadResult = await FileSystem.downloadAsync(safeUrl, fileUri);
      if (downloadResult.status === 200) {
        await Sharing.shareAsync(downloadResult.uri);
      }
    } catch (e) {
      console.error("Download handling failed", e);
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
        setConversationMessages((prev) => [...prev, normalizeMessage(res.item)]);
        setNewMessageContent("");
        await queryClient.invalidateQueries({ queryKey: ["conversations", currentUser] });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  // Layout Dynamic Calculations
  const getAvatarRingStyles = (empStatus: string | undefined) => {
    if (empStatus === "LUNCH") return { borderColor: "#F59E0B", borderWidth: 2 };
    if (empStatus === "BREAK") return { borderColor: "#8B5CF6", borderWidth: 2 };
    return { borderColor: "transparent", borderWidth: 0 };
  };

  const getSubtitle = (emp: any) => {
    if (emp.current_status === "LUNCH" && emp.lunch_start_time) {
      const start = new Date(emp.lunch_start_time).getTime();
      const expectedEnd = emp.lunch_expected_end ? new Date(emp.lunch_expected_end).getTime() : start + 30 * 60 * 1000;
      const diff = expectedEnd - nowTime;
      if (diff > 0) return `On Lunch (${Math.floor(diff / 60000)}m remaining)`;
      return `Overdue Lunch (${Math.floor(-diff / 60000)}m overdue)`;
    }
    if (emp.current_status === "BREAK" && emp.break_start_time) {
      const start = new Date(emp.break_start_time).getTime();
      const diff = (start + 15 * 60 * 1000) - nowTime;
      if (diff > 0) return `On Break (${Math.floor(diff / 60000)}m remaining)`;
      return `Overdue Break (${Math.floor(-diff / 60000)}m overdue)`;
    }
    return emp.department || "No department";
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Dynamic Filtering Logic Configurations
  const filteredConversations = useMemo(() => {
    let list = conversationsQuery.data ?? [];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c => c.employee.name.toLowerCase().includes(q));
    }
    if (listFilter === "archived") {
      return list.filter(c => archivedConversations.has(c.employee.id || c.employee._id || ""));
    } else if (listFilter === "bookmarked") {
      return list.filter(c => bookmarkedConversations.has(c.employee.id || c.employee._id || ""));
    }
    return list.filter(c => !archivedConversations.has(c.employee.id || c.employee._id || ""));
  }, [conversationsQuery.data, searchQuery, listFilter, archivedConversations, bookmarkedConversations]);

  const filteredEmployees = useMemo(() => {
    const list = employeesQuery.data ?? [];
    if (!employeeSearchQuery.trim()) return list;
    const q = employeeSearchQuery.toLowerCase();
    return list.filter(e => e.name.toLowerCase().includes(q) || e.department?.toLowerCase().includes(q));
  }, [employeesQuery.data, employeeSearchQuery]);

  // Loading Framework
  if (conversationsQuery.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER BAR */}
      <View style={styles.header}>
        {view === "conversation" && selectedEmployee ? (
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => { setView("list"); setSelectedEmployee(null); }}>
              <ArrowLeft color="#000" size={24} style={{ marginRight: 8 }} />
            </TouchableOpacity>
            <View style={[styles.avatarContainer, getAvatarRingStyles(selectedEmployee.current_status)]}>
              <Text style={styles.avatarFallback}>{getInitials(selectedEmployee.name)}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.headerTitle} numberOfLines={1}>{selectedEmployee.name}</Text>
              <Text style={styles.headerSubtitle} numberOfLines={1}>{getSubtitle(selectedEmployee)}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.mainTitle}>Messages</Text>
              <Text style={styles.headerSubtitle}>{conversationsQuery.data?.length || 0} active records</Text>
            </View>
            {view !== "conversation" && (
              <TouchableOpacity style={styles.newConvBtn} onPress={() => setView("employees")}>
                <Plus color={Colors.background} size={18} />
                <Text style={styles.newConvText}>New</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* CONVERSATION LISTING BLOCK */}
      {view === "list" && (
        <View style={{ flex: 1 }}>
          {/* List Filter Tabs */}
          <View style={styles.tabContainer}>
            {(["all", "archived", "bookmarked"] as const).map((filter) => (
              <TouchableOpacity
                key={filter}
                style={[styles.tabButton, listFilter === filter && styles.activeTabButton]}
                onPress={() => setListFilter(filter)}
              >
                <Text style={[styles.tabText, listFilter === filter && styles.activeTabText]}>
                  {filter.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Search Inputs */}
          <View style={styles.searchBox}>
            <Search color="#8E8E93" size={16} style={{ marginRight: 6 }} />
            <TextInput
              style={styles.inputField}
              placeholder="Search conversations..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* List Components View */}
          <FlatList
            data={filteredConversations}
            keyExtractor={(item) => item.employee.id || item.employee._id || ""}
            renderItem={({ item }) => {
              const empId = item.employee.id || item.employee._id || "";
              const isFav = bookmarkedConversations.has(empId);
              return (
                <View style={styles.conversationItem}>
                  <TouchableOpacity style={{ flex: 1, flexDirection: "row", alignItems: "center" }} onPress={() => startConversation(item.employee)}>
                    <View style={[styles.largeAvatar, getAvatarRingStyles(item.employee.current_status)]}>
                      <Text style={{ color: "#FFF", fontWeight: "bold" }}>{getInitials(item.employee.name)}</Text>
                      {item.unreadCount > 0 && <View style={styles.badgeDot} />}
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                        <Text style={styles.empName}>{item.employee.name}</Text>
                        {item.lastMessage && <Text style={styles.timeText}>{formatMessageTime(item.lastMessage.timestamp)}</Text>}
                      </View>
                      <Text style={styles.msgPreview} numberOfLines={1}>
                        {item.lastMessage ? item.lastMessage.content : "Tap to open chat history..."}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  
                  {/* Action Item Controllers */}
                  <View style={styles.actionRow}>
                    <TouchableOpacity onPress={() => toggleBookmark(empId)} style={styles.actionBtn}>
                      <Bookmark color={isFav ? "#F59E0B" : "#8E8E93"} size={18} fill={isFav ? "#F59E0B" : "none"} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => toggleArchive(empId)} style={styles.actionBtn}>
                      <Archive color="#8E8E93" size={18} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.centerContainer}>
                <MessageCircle color="#AEAEB2" size={48} />
                <Text style={styles.emptyText}>No matching logs found</Text>
              </View>
            }
          />
        </View>
      )}

      {/* CORE CHAT SCREEN DISPLAY MODULE */}
      {view === "conversation" && selectedEmployee && (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        >
          <FlatList
            ref={flatListRef}
            data={conversationMessages}
            keyExtractor={(item) => item.id}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            renderItem={({ item }) => {
              const isMe = item.sender === currentUser;
              return (
                <View style={[styles.msgWrapper, isMe ? styles.msgRight : styles.msgLeft]}>
                  <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
                    {item.attachment?.url ? (
                      <View style={{ marginBottom: 6 }}>
                        {item.attachment.mimeType?.startsWith("image/") ? (
                          <TouchableOpacity onPress={() => setPreview({ url: item.attachment!.url!, fileName: item.attachment!.fileName! })}>
                            <Image source={{ uri: item.attachment.url }} style={styles.inlineImageAttachment} />
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity style={styles.fileDownloadRow} onPress={() => downloadAttachment(item.attachment!.url!, item.attachment!.fileName!)}>
                            <Download color={isMe ? "#FFF" : "#000"} size={16} />
                            <Text style={[styles.fileDownloadText, { color: isMe ? "#FFF" : "#000" }]} numberOfLines={1}>
                              {item.attachment.fileName}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ) : null}
                    {!!item.content?.trim() && (
                      <Text style={{ color: isMe ? "#FFF" : "#000", fontSize: 15 }}>{item.content}</Text>
                    )}
                    <Text style={[styles.bubbleTime, { color: isMe ? "rgba(255,255,255,0.7)" : "#8E8E93" }]}>
                      {formatMessageTime(item.timestamp)}
                    </Text>
                  </View>
                </View>
              );
            }}
          />

          {/* Emoji Sheet View Alternate mapping */}
          {showEmojiPicker && (
            <View style={styles.emojiRowContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {COMMON_EMOJIS.map(emoji => (
                  <TouchableOpacity key={emoji} onPress={() => setNewMessageContent(p => p + emoji)} style={{ padding: 10 }}>
                    <Text style={{ fontSize: 24 }}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Interactive Chat Control Inputs */}
          <View style={styles.inputToolbar}>
            <TouchableOpacity style={styles.toolBtn} disabled={uploading} onPress={handleFilePick}>
              {uploading ? <ActivityIndicator size="small" color="#007AFF" /> : <Paperclip color="#007AFF" size={22} />}
            </TouchableOpacity>
            <TouchableOpacity style={styles.toolBtn} onPress={() => setShowEmojiPicker(!showEmojiPicker)}>
              <Smile color="#007AFF" size={22} />
            </TouchableOpacity>
            <TextInput
              style={styles.chatInput}
              placeholder="Enter message text..."
              value={newMessageContent}
              onChangeText={setNewMessageContent}
              multiline
            />
            <TouchableOpacity style={[styles.sendBtn, !newMessageContent.trim() && { opacity: 0.5 }]} disabled={!newMessageContent.trim() || sending} onPress={sendMessage}>
              <Send color="#FFF" size={16} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* EMPLOYEE SELECTOR MODAL WINDOW */}
      <Modal visible={view === "employees"} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setView("list")}>
        <SafeAreaView style={{ flex: 1, backgroundColor: "#FFF" }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Employee</Text>
            <TouchableOpacity onPress={() => setView("list")}>
              <X color="#000" size={24} />
            </TouchableOpacity>
          </View>
          <View style={[styles.searchBox, { margin: 16 }]}>
            <Search color="#8E8E93" size={16} style={{ marginRight: 6 }} />
            <TextInput
              style={styles.inputField}
              placeholder="Search by name or department..."
              value={employeeSearchQuery}
              onChangeText={setEmployeeSearchQuery}
            />
          </View>
          <FlatList
            data={filteredEmployees}
            keyExtractor={(item) => item.id || item._id || ""}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.empRowItem} onPress={() => startConversation(item)}>
                <View style={styles.largeAvatar}>
                  <Text style={{ color: "#FFF" }}>{getInitials(item.name)}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ fontSize: 16, fontWeight: "600" }}>{item.name}</Text>
                  <Text style={{ color: "#8E8E93", fontSize: 13 }}>{item.department || "General Staff"}</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>

      {/* LIGHTBOX FULLSCREEN IMAGE VIEWER */}
      <Modal visible={!!preview} transparent animationType="fade" onRequestClose={() => setPreview(null)}>
        <View style={styles.lightboxContainer}>
          <TouchableOpacity style={styles.closeLightbox} onPress={() => setPreview(null)}>
            <X color="#FFF" size={28} />
          </TouchableOpacity>
          {preview && (
            <Image source={{ uri: preview.url }} style={styles.lightboxImage} resizeMode="contain" />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// StyleSheet Configurations reflecting original styles across mobile displays
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { padding: 16, backgroundColor: Colors.background , borderBottomWidth: 1, borderColor: "#E5E5EA" },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  mainTitle: { fontSize: 28, fontWeight: "bold", color: Colors.surface  },
  headerTitle: { fontSize: 17, fontWeight: "600", color: "#000" },
  headerSubtitle: { fontSize: 13, color: "#8E8E93", marginTop: 2 },
  newConvBtn: { flexDirection: "row", backgroundColor: Colors.golden , paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, alignItems: "center" },
  newConvText: { color: Colors.background, fontWeight: "600", marginLeft: 4, fontSize: 14 },
  avatarContainer: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#007AFF", justifyContent: "center", alignItems: "center" },
  avatarFallback: { color: "#FFF", fontWeight: "bold", fontSize: 12 },
  tabContainer: { flexDirection: "row", padding: 8, backgroundColor: Colors.background },
  tabButton: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 12, marginRight: 8, backgroundColor: "#E5E5EA" },
  activeTabButton: { backgroundColor: Colors.golden},
  tabText: { fontSize: 12, fontWeight: "600", color: "#8E8E93" },
  activeTabText: { color: Colors.background },
  searchBox: { flexDirection: "row", marginHorizontal: 16, marginVertical: 8, padding: 8, backgroundColor: "#E5E5EA", borderRadius: 10, alignItems: "center" },
  inputField: { flex: 1, fontSize: 15, padding: 0 },
  conversationItem: { flexDirection: "row", padding: 16, backgroundColor: Colors.background, borderBottomWidth: 1, borderColor: "#E5E5EA", alignItems: "center" },
  largeAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#8E8E93", justifyContent: "center", alignItems: "center", position: "relative" },
  badgeDot: { position: "absolute", top: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: "#FF3B30", borderWidth: 2, borderColor: "#FFF" },
  empName: { fontSize: 16, fontWeight: "600",color:Colors.surface },
  timeText: { fontSize: 12, color: "#8E8E93" },
  msgPreview: { fontSize: 14, color: "#8E8E93", marginTop: 4 },
  actionRow: { flexDirection: "row", marginLeft: 8 },
  actionBtn: { padding: 6, marginLeft: 4 },
  centerContainer: { padding: 40, alignItems: "center", justifyContent: "center" },
  emptyText: { color: "#8E8E93", marginTop: 12, fontSize: 15 },
  msgWrapper: { flexDirection: "row", marginVertical: 4, paddingHorizontal: 12 },
  msgLeft: { justifyContent: "flex-start" },
  msgRight: { justifyContent: "flex-end" },
  bubble: { maxWidth: "75%", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16 },
  bubbleMe: { backgroundColor: "#007AFF", borderBottomRightRadius: 0 },
  bubbleThem: { backgroundColor: "#E5E5EA", borderBottomLeftRadius: 0 },
  bubbleTime: { fontSize: 10, textAlign: "right", marginTop: 4 },
  inputToolbar: { flexDirection: "row", padding: 12, backgroundColor: "#FFF",
     alignItems: "center", borderTopWidth: 1, borderColor: "#E5E5EA",marginBottom:60 },
  toolBtn: { padding: 4, marginRight: 8 },
  chatInput: { flex: 1, backgroundColor: "#E5E5EA", borderRadius: 18, paddingHorizontal: 12, paddingVertical: 6, fontSize: 15, maxHigh: 100 },
  sendBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#007AFF", justifyContent: "center", alignItems: "center", marginLeft: 8 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderColor: "#E5E5EA" },
  modalTitle: { fontSize: 18, fontWeight: "bold" },
  empRowItem: { flexDirection: "row", padding: 16, borderBottomWidth: 1, borderColor: "#E5E5EA", alignItems: "center" },
  inlineImageAttachment: { width: 160, height: 120, borderRadius: 8, marginTop: 4 },
  fileDownloadRow: { flexDirection: "row", alignItems: "center", padding: 6, backgroundColor: "rgba(0,0,0,0.05)", borderRadius: 6 },
  fileDownloadText: { fontSize: 13, marginLeft: 6, maxWidth: 120 },
  emojiRowContainer: { height: 50, backgroundColor: "#F2F2F7", borderTopWidth: 1, borderColor: "#E5E5EA" },
  lightboxContainer: { flex: 1, backgroundColor: "rgba(0,0,0,0.9)", justifyContent: "center", alignItems: "center" },
  closeLightbox: { position: "absolute", top: 40, right: 20, zIndex: 10 },
  lightboxImage: { width: Dimensions.get("window").width, height: Dimensions.get("window").height * 0.7 }
});