import React, { useEffect, useMemo, useState, useRef } from "react";
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
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useSocket } from "@/contexts/SocketContext";
import { useTheme } from "@/contexts/ThemeContext";
import { s, wp, hp, fs } from "@/util/styles";
import { toProxiedUrlUpload, initToken } from "@/util/toProxiedUrl";
import * as DocumentPicker from "expo-document-picker";
import {
  getEmployeeConversations,
  getConversation,
  sendMessage,
  markMessagesAsRead,
  getEmployeeProfile,
  toggleMessageReaction,
  uploadMessageAttachment,
} from "@/lib/admin/apiClient";

const { width, height } = Dimensions.get("window");

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

interface MessageReaction {
  emoji: string;
  username: string;
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
  reactions?: MessageReaction[];
}

const normalizeMessage = (m: any): Message => {
  if (!m) {
    return {
      id: "",
      sender: "",
      recipient: "",
      content: "",
      timestamp: new Date().toISOString(),
      type: "direct",
      status: "sent",
      reactions: [],
    };
  }
  return {
    id: String(m.id || m._id || ""),
    sender: String(m.sender || ""),
    recipient: String(m.recipient || ""),
    content: String(m.content || ""),
    timestamp: String(m.timestamp || m.createdAt || new Date().toISOString()),
    type: String(m.type || "direct"),
    status: String(m.status || "sent"),
    attachment: m.attachment,
    reactions: Array.isArray(m.reactions)
      ? m.reactions.map((r: any) => ({ emoji: String(r.emoji || ""), username: String(r.username || "") }))
      : [],
  };
};

const isDuplicateMessage = (prev: Message[], newMsg: Message): boolean => {
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
};

export default function EmployeeMessages() {
  const queryClient = useQueryClient();
  const { uiTheme } = useTheme();
  const { socket } = useSocket();

  const [tokenReady, setTokenReady] = useState(false);

  useEffect(() => {
    (async () => {
      await initToken();
      setTokenReady(true);
    })();
  }, []);

  const getResolvedAvatarUri = (avatarRaw?: string) => {
    if (!avatarRaw) return null;
    let url = avatarRaw;
    if (url.startsWith("/uploads/avatars/")) {
      url = url.replace("/uploads/avatars/", "/api/s3-proxy/avatars/");
    }
    if (!url.startsWith("http") && !url.startsWith("data:")) {
      url = `https://task.se7eninc.com${url.startsWith("/") ? "" : "/"}${url}`;
    }
    return tokenReady ? toProxiedUrlUpload(url) : null;
  };

  const isLightTheme = useMemo(() => {
    return uiTheme.theme?.includes("crystal") || uiTheme.panelColors?.dashboardTextColor === "#000000";
  }, [uiTheme]);

  const bg = useMemo(() => uiTheme.panelColors?.dashboardBackground || (isLightTheme ? "#ffffff" : "#09090b"), [uiTheme, isLightTheme]);
  const cardBg = useMemo(() => uiTheme.panelColors?.dashboardCardBackground || (isLightTheme ? "#f8fafc" : "#18181b"), [uiTheme, isLightTheme]);
  const tintColor = useMemo(() => uiTheme.panelColors?.dashboardTextColor || (isLightTheme ? "#0f172a" : "#ffffff"), [uiTheme, isLightTheme]);
  const mutedText = useMemo(() => (isLightTheme ? "#64748b" : "#a1a1aa"), [isLightTheme]);
  const primaryColor = useMemo(() => uiTheme.customColors?.primary || "#133767", [uiTheme]);
  const border = useMemo(() => (isLightTheme ? "rgba(0, 0, 0, 0.08)" : "rgba(255, 255, 255, 0.08)"), [isLightTheme]);

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

  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const timer = setInterval(() => setNowTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const loadConversations = async () => {
      try {
        const profileRes = await getEmployeeProfile();
        const name = profileRes.item.name;
        setEmployeeName(name);
        const convRes = await getEmployeeConversations(name);
        setConversations(convRes.items || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadConversations();
  }, []);

  useEffect(() => {
    if (!socket || !employeeName) return;

    const handleNewMessage = (data: any) => {
      if (data && (data.sender === employeeName || data.recipient === employeeName)) {
        const normalized = normalizeMessage(data);
        if (!normalized.id) return;

        const partnerName = selectedConversation?.employee?.name;
        if (partnerName && (normalized.sender === partnerName || normalized.recipient === partnerName)) {
          setMessages((prev) => {
            if (isDuplicateMessage(prev, normalized)) return prev;
            return [...prev, normalized].sort((a, b) => a.timestamp.localeCompare(b.timestamp) || a.id.localeCompare(b.id));
          });
        }

        getEmployeeConversations(employeeName)
          .then((res) => setConversations(res.items || []))
          .catch(() => {});
      }
    };

    socket.on("new-message", handleNewMessage);
    return () => {
      socket.off("new-message", handleNewMessage);
    };
  }, [socket, employeeName, selectedConversation?.employee?.name]);

  useEffect(() => {
    if (!socket) return;
    const handleReaction = (payload: { messageId?: string; reactions?: MessageReaction[] }) => {
      if (!payload?.messageId) return;
      setMessages((prev) =>
        prev.map((m) => (m.id === payload.messageId ? { ...m, reactions: payload.reactions || [] } : m))
      );
    };
    socket.on("message-reaction", handleReaction);
    return () => {
      socket.off("message-reaction", handleReaction);
    };
  }, [socket]);

  useEffect(() => {
    if (!socket) return;

    const handleStatusUpdate = (payload: {
      userId: string;
      current_status: "AVAILABLE" | "LUNCH" | "BREAK";
      lunch_start_time: string | null;
      lunch_expected_end: string | null;
      break_start_time: string | null;
      name: string;
    }) => {
      setConversations((prev) =>
        prev.map((c) => {
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
        })
      );

      setSelectedConversation((prev) => {
        if (prev && (prev.employee.id === payload.userId || prev.employee.name === payload.name)) {
          return {
            ...prev,
            employee: {
              ...prev.employee,
              current_status: payload.current_status,
              lunch_start_time: payload.lunch_start_time,
              lunch_expected_end: payload.lunch_expected_end,
              break_start_time: payload.break_start_time,
            },
          };
        }
        return prev;
      });
    };

    socket.on("status-update", handleStatusUpdate);
    return () => {
      socket.off("status-update", handleStatusUpdate);
    };
  }, [socket]);

  useEffect(() => {
    if (!selectedConversation || !employeeName) return;
    const interval = setInterval(async () => {
      try {
        const res = await getConversation(employeeName, selectedConversation.employee.name);
        setMessages(res.items || []);
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, [selectedConversation?.employee?.name, employeeName]);

  useEffect(() => {
    if (!selectedConversation || !employeeName) return;

    const loadMessages = async () => {
      try {
        const res = await getConversation(employeeName, selectedConversation.employee.name);
        setMessages(res.items || []);

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
      const newMessage = {
        sender: employeeName,
        recipient: selectedConversation.employee.name,
        content: messageInput.trim(),
        timestamp: new Date().toISOString(),
        type: "direct" as const,
        status: "sent",
      };

      const res = await sendMessage(newMessage);
      const resItem = res?.item || res;
      setMessages((prev) => {
        const normalized = normalizeMessage(resItem);
        if (!normalized.id) return prev;
        if (isDuplicateMessage(prev, normalized)) return prev;
        return [...prev, normalized].sort((a, b) => a.timestamp.localeCompare(b.timestamp) || a.id.localeCompare(b.id));
      });
      setMessageInput("");

      setConversations((prev) =>
        prev.map((c) =>
          c.employee.id === selectedConversation.employee.id ? { ...c, lastMessage: resItem } : c
        )
      );
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const handlePickDocument = async () => {
    if (!selectedConversation || !employeeName) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];

      setUploading(true);
      const fileObj = {
        uri: asset.uri,
        name: asset.name,
        type: asset.mimeType || "application/octet-stream",
      } as any;

      const up = await uploadMessageAttachment(fileObj);
      const attachment = up?.attachment || up;

      const payload = {
        sender: employeeName,
        recipient: selectedConversation.employee.name,
        content: messageInput.trim(),
        timestamp: new Date().toISOString(),
        type: "direct" as const,
        status: "sent",
        attachment,
      };

      const res = await sendMessage(payload);
      const resItem = res?.item || res;
      setMessages((prev) => {
        const normalized = normalizeMessage(resItem);
        if (!normalized.id) return prev;
        if (isDuplicateMessage(prev, normalized)) return prev;
        return [...prev, normalized].sort((a, b) => a.timestamp.localeCompare(b.timestamp) || a.id.localeCompare(b.id));
      });
      setMessageInput("");

      setConversations((prev) =>
        prev.map((c) =>
          c.employee.id === selectedConversation.employee.id ? { ...c, lastMessage: resItem } : c
        )
      );
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to send attachment");
    } finally {
      setUploading(false);
    }
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!employeeName) return;
    try {
      const res = await toggleMessageReaction(messageId, emoji, employeeName);
      setMessages((prev) =>
        prev.map((m) => (m.id === res?.messageId ? { ...m, reactions: res?.reactions || [] } : m))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const filteredConversations = useMemo(() => {
    return conversations.filter((c) =>
      c.employee?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [conversations, searchTerm]);

  const formatTime = (timestamp: string) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const getSubtitle = (emp: any) => {
    if (emp.current_status === "LUNCH" && emp.lunch_start_time) {
      const start = new Date(emp.lunch_start_time).getTime();
      const expectedEnd = emp.lunch_expected_end ? new Date(emp.lunch_expected_end).getTime() : start + 30 * 60 * 1000;
      const diff = expectedEnd - nowTime;
      const timeStr = new Date(start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      if (diff > 0) {
        return `On Lunch since ${timeStr} (${Math.floor(diff / 60000)}m remaining)`;
      }
      return `Overdue Lunch since ${timeStr} (${Math.floor(-diff / 60000)}m overdue)`;
    }
    if (emp.current_status === "BREAK" && emp.break_start_time) {
      const start = new Date(emp.break_start_time).getTime();
      const expectedEnd = start + 15 * 60 * 1000;
      const diff = expectedEnd - nowTime;
      const timeStr = new Date(start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      if (diff > 0) {
        return `On Break since ${timeStr} (${Math.floor(diff / 60000)}m remaining)`;
      }
      return `Overdue Break since ${timeStr} (${Math.floor(-diff / 60000)}m overdue)`;
    }
    return emp.department || "No department";
  };

  if (loading) {
    return (
      <SafeAreaView style={s([styles.container, { backgroundColor: bg, justifyContent: "center" }])}>
        <ActivityIndicator size="large" color={primaryColor} />
      </SafeAreaView>
    );
  }

  if (selectedConversation) {
    const avatarUri = getResolvedAvatarUri(selectedConversation.employee.avatarUrl);
    return (
      <SafeAreaView style={s([styles.container, { backgroundColor: bg }])}>
        <StatusBar barStyle={isLightTheme ? "dark-content" : "light-content"} backgroundColor={bg} />
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={s({ flex: 1, marginBottom: hp(5) })}>
          <View style={s([styles.chatHeader, { borderColor: border, backgroundColor: cardBg }])}>
            <TouchableOpacity onPress={() => setSelectedConversation(null)} style={s(styles.backButton)}>
              <Ionicons name="chevron-back" size={fs(5.5)} color={tintColor} />
            </TouchableOpacity>
            
            <View style={s(styles.avatarContainer)}>
              <View style={s([styles.avatarCircle, { backgroundColor: primaryColor, overflow: "hidden" }])}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={s(styles.avatarImage)} />
                ) : (
                  <Text style={s(styles.avatarText)}>{selectedConversation.employee.initials}</Text>
                )}
              </View>
              {selectedConversation.employee.status === "active" && (
                <View style={s([styles.statusDot, { backgroundColor: selectedConversation.employee.current_status === "LUNCH" ? "#f59e0b" : selectedConversation.employee.current_status === "BREAK" ? "#8b5cf6" : "#22c55e" }])} />
              )}
            </View>

            <View style={s({ flex: 1, marginLeft: wp(2.5) })}>
              <View style={s({ flexDirection: "row", alignItems: "center", gap: wp(1.5) })}>
                <Text style={s([styles.headerTitle, { color: tintColor }])} numberOfLines={1}>
                  {selectedConversation.employee.name}
                </Text>
                {selectedConversation.employee.current_status && selectedConversation.employee.current_status !== "AVAILABLE" && (
                  <View style={s([styles.statusPill, { backgroundColor: selectedConversation.employee.current_status === "LUNCH" ? "rgba(245,158,11,0.15)" : "rgba(139,92,246,0.15)" }])}>
                    <Text style={s([styles.statusPillText, { color: selectedConversation.employee.current_status === "LUNCH" ? "#d97706" : "#7c3aed" }])}>
                      {selectedConversation.employee.current_status === "LUNCH" ? "Lunch" : "Break"}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={s([styles.headerSubtitle, { color: mutedText }])} numberOfLines={1}>
                {getSubtitle(selectedConversation.employee)}
              </Text>
            </View>
          </View>

          <ScrollView
            ref={scrollRef}
            contentContainerStyle={s(styles.messagesContainer)}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          >
            {messages.length === 0 ? (
              <View style={s(styles.emptyState)}>
                <Ionicons name="chatbubble-ellipses-outline" size={fs(10)} color={mutedText} />
                <Text style={s([styles.emptyText, { color: mutedText }])}>No messages yet</Text>
                <Text style={s([styles.emptySub, { color: mutedText }])}>Start the conversation!</Text>
              </View>
            ) : (
              messages.map((msg) => {
                const isMe = msg.sender === employeeName;
                const attachmentUrl = msg.attachment?.url || "";
                const attachmentName = msg.attachment?.fileName || "attachment";
                const isImage = msg.attachment?.mimeType?.startsWith("image/") || false;
                const resolvedAttachmentUri = attachmentUrl ? (toProxiedUrlUpload(attachmentUrl) || attachmentUrl) : "";

                return (
                  <View key={msg.id} style={s([styles.messageRow, isMe ? styles.messageRowMe : styles.messageRowPartner])}>
                    <View style={s([styles.messageBubble, isMe ? { backgroundColor: primaryColor } : { backgroundColor: cardBg, borderColor: border, borderWidth: 1 }])}>
                      {attachmentUrl ? (
                        isImage ? (
                          <TouchableOpacity onPress={() => setPreview({ url: resolvedAttachmentUri, fileName: attachmentName })}>
                            <Image source={{ uri: resolvedAttachmentUri }} style={s(styles.messageImagePreview)} resizeMode="cover" />
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity onPress={() => setPreview({ url: resolvedAttachmentUri, fileName: attachmentName })} style={s({ marginBottom: hp(1) })}>
                            <Text style={s([styles.messageContent, { textDecorationLine: "underline" }, isMe ? { color: "#ffffff" } : { color: tintColor }])}>
                              📎 {attachmentName}
                            </Text>
                          </TouchableOpacity>
                        )
                      ) : null}

                      {msg.content?.trim() ? (
                        <Text style={s([styles.messageContent, isMe ? { color: "#ffffff" } : { color: tintColor }])}>
                          {msg.content}
                        </Text>
                      ) : null}
                      
                      <View style={s(styles.messageMeta)}>
                        <Text style={s([styles.messageTime, isMe ? { color: "rgba(255,255,255,0.7)" } : { color: mutedText }])}>
                          {formatTime(msg.timestamp)}
                        </Text>
                        {isMe && (
                          <Ionicons 
                            name={msg.status === "read" ? "checkmark-done" : "checkmark"} 
                            size={fs(3)} 
                            color="rgba(255,255,255,0.7)" 
                            style={s({ marginLeft: wp(1) })}
                          />
                        )}
                      </View>
                    </View>

                    {msg.reactions && msg.reactions.length > 0 && (
                      <View style={s(styles.reactionsWrapper)}>
                        {msg.reactions.map((r, i) => (
                          <TouchableOpacity key={i} onPress={() => toggleReaction(msg.id, r.emoji)} style={s([styles.reactionBadge, { backgroundColor: cardBg, borderColor: border }])}>
                            <Text style={s(styles.reactionEmojiText)}>{r.emoji}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </ScrollView>

          <View style={s([styles.inputContainer, { borderColor: border, backgroundColor: bg }])}>
            <TouchableOpacity
              onPress={handlePickDocument}
              disabled={uploading}
              style={s([styles.attachButton, { borderColor: border }])}
            >
              <Ionicons name="attach" size={fs(4.5)} color={mutedText} />
            </TouchableOpacity>

            <TextInput
              value={messageInput}
              onChangeText={setMessageInput}
              placeholder="Type a message..."
              placeholderTextColor={mutedText}
              style={s([styles.textInput, { color: tintColor, borderColor: border, backgroundColor: cardBg }])}
              multiline
            />
            <TouchableOpacity
              onPress={handleSendMessage}
              disabled={(!messageInput.trim() && !uploading) || sending}
              style={s([styles.sendButton, { backgroundColor: messageInput.trim() ? primaryColor : mutedText }])}
            >
              <Ionicons name="send" size={fs(3.8)} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

        <Modal visible={Boolean(preview)} transparent animationType="fade">
          <View style={s(styles.modalContainer)}>
            <TouchableOpacity style={s(styles.modalClose)} onPress={() => setPreview(null)}>
              <Ionicons name="close" size={fs(6)} color="#ffffff" />
            </TouchableOpacity>
            {preview && (
              <Image source={{ uri: preview.url }} style={s(styles.modalImage)} resizeMode="contain" />
            )}
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s([styles.container, { backgroundColor: bg }])}>
      <StatusBar barStyle={isLightTheme ? "dark-content" : "light-content"} backgroundColor={bg} />
      <View style={s(styles.listHeader)}>
        <Text style={s([styles.listTitle, { color: tintColor }])}>Messages</Text>
      </View>

      <View style={s([styles.searchBlock, { backgroundColor: cardBg, borderColor: border }])}>
        <Ionicons name="search" size={fs(3.8)} color={mutedText} style={s({ marginRight: wp(2) })} />
        <TextInput
          placeholder="Search conversations..."
          placeholderTextColor={mutedText}
          value={searchTerm}
          onChangeText={setSearchTerm}
          style={s([styles.searchField, { color: tintColor }])}
        />
      </View>

      <ScrollView contentContainerStyle={s({ paddingBottom: hp(2.5) })} showsVerticalScrollIndicator={false}>
        {filteredConversations.length === 0 ? (
          <View style={s(styles.emptyStateContainer)}>
            <Ionicons name="chatbubbles-outline" size={fs(10)} color={mutedText} />
            <Text style={s([styles.emptyStateText, { color: mutedText }])}>
              {searchTerm ? "No conversations found" : "No conversations yet"}
            </Text>
          </View>
        ) : (
          filteredConversations.map((conversation) => {
            const avatarUri = getResolvedAvatarUri(conversation.employee.avatarUrl);
            return (
              <TouchableOpacity
                key={conversation.employee.id}
                onPress={() => setSelectedConversation(conversation)}
                style={s([styles.conversationRow, { borderBottomColor: border }])}
                activeOpacity={0.7}
              >
                <View style={s(styles.avatarContainer)}>
                  <View style={s([styles.avatarCircle, { backgroundColor: primaryColor, overflow: "hidden" }])}>
                    {avatarUri ? (
                      <Image source={{ uri: avatarUri }} style={s(styles.avatarImage)} />
                    ) : (
                      <Text style={s(styles.avatarText)}>{conversation.employee.initials}</Text>
                    )}
                  </View>
                  {conversation.employee.status === "active" && (
                    <View style={s([styles.statusDot, { backgroundColor: conversation.employee.current_status === "LUNCH" ? "#f59e0b" : conversation.employee.current_status === "BREAK" ? "#8b5cf6" : "#22c55e" }])} />
                  )}
                </View>

                <View style={s({ flex: 1, marginLeft: wp(3) })}>
                  <View style={s({ flexDirection: "row", justifyContent: "space-between", alignItems: "center" })}>
                    <View style={s({ flexDirection: "row", alignItems: "center", gap: wp(1.5) })}>
                      <Text style={s([styles.convName, { color: tintColor }])} numberOfLines={1}>
                        {conversation.employee.name}
                      </Text>
                      {conversation.employee.current_status && conversation.employee.current_status !== "AVAILABLE" && (
                        <View style={s([styles.statusPill, { backgroundColor: conversation.employee.current_status === "LUNCH" ? "rgba(245,158,11,0.15)" : "rgba(139,92,246,0.15)" }])}>
                          <Text style={s([styles.statusPillText, { color: conversation.employee.current_status === "LUNCH" ? "#d97706" : "#7c3aed", fontSize: fs(2.2) }])}>
                            {conversation.employee.current_status === "LUNCH" ? "Lunch" : "Break"}
                          </Text>
                        </View>
                      )}
                    </View>
                    {conversation.lastMessage && (
                      <Text style={s({ color: mutedText, fontSize: fs(2.5) })}>
                        {formatTime(conversation.lastMessage.timestamp)}
                      </Text>
                    )}
                  </View>

                  <Text style={s([styles.convMessage, { color: mutedText }])} numberOfLines={1}>
                    {conversation.lastMessage ? conversation.lastMessage.content : "No messages yet"}
                  </Text>
                </View>

                {conversation.unreadCount > 0 && (
                  <View style={s([styles.unreadBadge, { backgroundColor: primaryColor }])}>
                    <Text style={s(styles.unreadBadgeText)}>{conversation.unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  chatHeader: { flexDirection: "row", alignItems: "center", padding: wp(3), borderBottomWidth: 1 },
  backButton: { marginRight: wp(2), padding: wp(1) },
  avatarContainer: { position: "relative" },
  avatarCircle: { width: wp(10), height: wp(10), borderRadius: wp(5), justifyContent: "center", alignItems: "center" },
  avatarImage: { width: "100%", height: "100%", resizeMode: "cover" },
  avatarText: { color: "#ffffff", fontWeight: "700", fontSize: fs(3.2) },
  statusDot: { position: "absolute", bottom: 0, right: 0, width: wp(2.8), height: wp(2.8), borderRadius: wp(1.4), borderWidth: 2, borderColor: "#ffffff" },
  headerTitle: { fontSize: fs(3.8), fontWeight: "700" },
  headerSubtitle: { fontSize: fs(2.8), marginTop: hp(0.3) },
  statusPill: { paddingHorizontal: wp(1.5), paddingVertical: hp(0.3), borderRadius: wp(1) },
  statusPillText: { fontSize: fs(2.5), fontWeight: "600" },
  messagesContainer: { padding: wp(4), paddingBottom: hp(4) },
  emptyState: { padding: wp(10), alignItems: "center", justifyContent: "center" },
  emptyText: { fontSize: fs(3.8), fontWeight: "600", marginTop: hp(1.5) },
  emptySub: { fontSize: fs(3), marginTop: hp(0.5) },
  messageRow: { marginBottom: hp(2), flexDirection: "column" },
  messageRowMe: { alignItems: "flex-end" },
  messageRowPartner: { alignItems: "flex-start" },
  messageBubble: { padding: wp(3), borderRadius: wp(4), maxWidth: "75%", minWidth: wp(15) },
  messageContent: { fontSize: fs(3.2), lineHeight: fs(4.2) },
  messageImagePreview: { width: wp(50), height: hp(20), borderRadius: wp(2), marginBottom: hp(1) },
  messageMeta: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", marginTop: hp(0.5) },
  messageTime: { fontSize: fs(2.2) },
  reactionsWrapper: { flexDirection: "row", gap: wp(1), marginTop: hp(0.3) },
  reactionBadge: { paddingHorizontal: wp(1.5), paddingVertical: hp(0.3), borderRadius: wp(2.5), borderWidth: 1 },
  reactionEmojiText: { fontSize: fs(2.8) },
  inputContainer: { flexDirection: "row", alignItems: "center", padding: wp(3), borderTopWidth: 1, gap: wp(2.5) },
  attachButton: { width: wp(10), height: wp(10), borderRadius: wp(5), borderWidth: 1, justifyContent: "center", alignItems: "center" },
  textInput: { flex: 1, height: hp(5), borderWidth: 1, borderRadius: wp(5), paddingHorizontal: wp(4), fontSize: fs(3.2), paddingTop: hp(1) },
  sendButton: { width: wp(10), height: wp(10), borderRadius: wp(5), justifyContent: "center", alignItems: "center" },
  modalContainer: { flex: 1, backgroundColor: "#000000", justifyContent: "center", alignItems: "center" },
  modalClose: { position: "absolute", top: hp(5), right: wp(5), zIndex: 10, padding: wp(2) },
  modalImage: { width: width, height: height * 0.8 },
  listHeader: { paddingHorizontal: wp(4), paddingTop: hp(2), marginBottom: hp(1.5) },
  listTitle: { fontSize: fs(5.5), fontWeight: "800", letterSpacing: -0.5 },
  searchBlock: { flexDirection: "row", alignItems: "center", paddingHorizontal: wp(3), marginHorizontal: wp(4), height: hp(5.2), borderRadius: wp(2.5), borderWidth: 1, marginBottom: hp(2) },
  searchField: { flex: 1, fontSize: fs(3.2) },
  emptyStateContainer: { padding: wp(10), alignItems: "center" },
  emptyStateText: { fontSize: fs(3.2), marginTop: hp(1) },
  conversationRow: { flexDirection: "row", alignItems: "center", padding: wp(4), borderBottomWidth: 1 },
  convName: { fontSize: fs(3.5), fontWeight: "700" },
  convMessage: { fontSize: fs(3), marginTop: hp(0.5) },
  unreadBadge: { width: wp(5), height: wp(5), borderRadius: wp(2.5), justifyContent: "center", alignItems: "center", marginLeft: wp(2) },
  unreadBadgeText: { color: "#ffffff", fontSize: fs(2.5), fontWeight: "700" },
});