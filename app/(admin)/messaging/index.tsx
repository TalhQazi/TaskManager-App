import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  Modal,
  SafeAreaView,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Linking,Dimensions,ScrollView
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Plus,
  Search,
  Send,
  ArrowLeft,
  MessageCircle,
  Archive,
  Bookmark,
  Paperclip,
  Download,
  X,
  ChevronDown,
} from "lucide-react-native";
import * as DocumentPicker from "expo-document-picker";
import { useSocket } from "@/contexts/SocketContext";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch, listResource, toProxiedUrl } from "@/lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";
const { width: SCREEN_WIDTH } = Dimensions.get("window");
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

type MessageApi = Omit<Message, "id"> & { _id: string };

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
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

interface MobileFormPickerProps {
  label: string;
  value: string;
  items: { label: string; value: string }[];
  onValueChange: (val: string) => void;
  colors: any;
  styles: any;
}

function MobileFormPicker({
  label,
  value,
  items,
  onValueChange,
  colors,
  styles,
}: MobileFormPickerProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const selectedItem = items.find((i) => i.value === value);

  return (
    <View style={styles.formGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TouchableOpacity style={styles.pickerTrigger} onPress={() => setModalOpen(true)}>
        <Text style={styles.pickerTriggerText}>
          {selectedItem ? selectedItem.label : label}
        </Text>
        <ChevronDown size={16} color={colors.mutedText} />
      </TouchableOpacity>

      <Modal visible={modalOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.pickerModalCard}>
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>Select {label}</Text>
              <TouchableOpacity onPress={() => setModalOpen(false)}>
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {items.map((item) => (
                <TouchableOpacity
                  key={item.value}
                  style={[styles.pickerItemRow, item.value === value ? styles.pickerItemRowActive : null]}
                  onPress={() => {
                    onValueChange(item.value);
                    setModalOpen(false);
                  }}
                >
                  <Text style={[styles.pickerItemText, item.value === value ? styles.pickerItemTextActive : null]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default function Messaging() {
  const { user, isLoading: authLoading } = useAuth();
  const { uiTheme } = useTheme();
  const isDark = (uiTheme.theme as string) === "dark" || (uiTheme.theme as string) === "metallic-elite";

  const colors = useMemo(() => ({
    background: uiTheme.panelColors?.dashboardBackground || (isDark ? "#0F172A" : "#F8FAFC"),
    cardBg: uiTheme.panelColors?.dashboardCardBackground || (isDark ? "#1E293B" : "#FFFFFF"),
    text: uiTheme.panelColors?.dashboardTextColor || (isDark ? "#FFFFFF" : "#0F172A"),
    mutedText: isDark ? "#94A3B8" : "#6B7280",
    border: isDark ? "#1E293B" : "#E2E8F0",
    innerBorder: isDark ? "#334155" : "#CBD5E1",
    inputBg: isDark ? "#0F172A" : "#FFFFFF",
    inputText: isDark ? "#FFFFFF" : "#0F172A",
    primary: uiTheme.customColors?.primary || "#2563EB",
    accent: "#3B82F6",
    danger: "#EF4444",
    warning: "#F59E0B",
    purple: "#8B5CF6",
    unreadBadge: "#EF4444",
    senderBubble: "#2563EB",
    recipientBubble: isDark ? "#1E293B" : "#E2E8F0",
    activeRowBg: isDark ? "rgba(37, 99, 235, 0.15)" : "#EFF6FF",
    errorBg: isDark ? "rgba(239, 68, 68, 0.1)" : "#FEF2F2",
    errorBorder: isDark ? "rgba(239, 68, 68, 0.2)" : "#FEE2E2",
    lightboxBg: "#000000",
    white: "#FFFFFF",
    grayE5: "#E5E7EB",
    gray9CA3: "#9CA3AF"
  }), [uiTheme, isDark]);

  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationMessages, setConversationMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const { socket } = useSocket();

  const [nowTime, setNowTime] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNowTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const [view, setView] = useState<"list" | "conversation" | "employees">("list");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [listFilter, setListFilter] = useState<"all" | "archived" | "bookmarked">("all");

  const [archivedConversations, setArchivedConversations] = useState<Set<string>>(new Set());
  const [bookmarkedConversations, setBookmarkedConversations] = useState<Set<string>>(new Set());

  const [searchQuery, setSearchQuery] = useState("");
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState("");

  const [newMessageContent, setNewMessageContent] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<{ url: string; fileName: string } | null>(null);

  const flatListRef = useRef<FlatList<Message>>(null);
  const currentUser = (user?.fullName || user?.username || "Employee").trim();

  useEffect(() => {
    if (!authLoading && currentUser) {
      loadConversations(true);
      loadEmployees();
    }
  }, [authLoading, currentUser]);

  useEffect(() => {
    if (!socket || authLoading) return;
    const handleNewMessage = (msg: any) => {
      const normalized = normalizeMessage(msg);
      if (!normalized.id) return;
      loadConversations();
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
  }, [socket, view, selectedEmployee?.name, authLoading]);

  useEffect(() => {
    if (view !== "conversation" || !selectedEmployee || authLoading) return;
    const interval = setInterval(() => {
      loadConversationMessages(selectedEmployee.name);
    }, 4000);
    return () => clearInterval(interval);
  }, [view, selectedEmployee?.name, authLoading]);

  const loadEmployees = async () => {
    try {
      const rawEmployeeData = await listResource<any>("employees");
      const employeesList = Array.isArray(rawEmployeeData)
        ? rawEmployeeData
        : (rawEmployeeData?.items && Array.isArray(rawEmployeeData.items))
        ? rawEmployeeData.items
        : [];
      setEmployees(employeesList);
    } catch (e) {
      console.error(e);
    }
  };

  const loadConversations = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      setApiError(null);
      const res = await apiFetch<{ items?: any[] }>(`/api/messages/conversations/${encodeURIComponent(currentUser)}`);
      const convs = res.items ?? [];
      setConversations(convs.map((c) => ({
        employee: c.employee,
        lastMessage: c.lastMessage ? normalizeMessage(c.lastMessage) : null,
        unreadCount: c.unreadCount || 0,
      })));
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Failed to sync conversation indexes.");
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  const loadConversationMessages = async (employeeName: string) => {
    try {
      const res = await apiFetch<{ items?: MessageApi[] }>(
        `/api/messages/conversation/${encodeURIComponent(currentUser)}/${encodeURIComponent(employeeName)}`
      );
      const msgs = res.items ?? [];
      setConversationMessages(msgs.map(normalizeMessage).sort((a, b) => a.id.localeCompare(b.id)));
    } catch (e) {
      console.error(e);
    }
  };

  const markMessagesAsRead = async (sender: string) => {
    try {
      await apiFetch("/api/messages/mark-read", {
        method: "POST",
        body: JSON.stringify({ sender, recipient: currentUser }),
      });
      await loadConversations();
    } catch (e) {
      console.error(e);
    }
  };

  const startConversation = async (employee: Employee) => {
    setSelectedEmployee(employee);
    setView("conversation");
    setEmployeeSearchQuery("");
    await loadConversationMessages(employee.name);
    if (employee.name) {
      await markMessagesAsRead(employee.name);
    }
  };

  const pickAndUploadFile = async () => {
    if (!selectedEmployee) return;
    try {
      const pickerResult = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });

      if (pickerResult.canceled || !pickerResult.assets?.[0]) return;

      setUploading(true);
      const pickedFile = pickerResult.assets[0];

      const fd = new FormData();
      fd.append("file", {
        uri: pickedFile.uri,
        name: pickedFile.name,
        type: pickedFile.mimeType || "application/octet-stream",
      } as any);

      const res = await apiFetch<{ attachment: any }>("/api/messages/upload", {
        method: "POST",
        body: fd,
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res?.attachment) {
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

        const postRes = await apiFetch<{ item?: MessageApi }>("/api/messages", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        if (postRes?.item) {
          setConversationMessages((prev) => [...prev, normalizeMessage(postRes.item)]);
          setNewMessageContent("");
          await loadConversations();
        }
      }
    } catch (e) {
      Alert.alert("Upload Interrupted", "Could not safely dispatch multi-part attachment form payload.");
    } finally {
      setUploading(false);
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
        await loadConversations();
      }
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Failed to route outbound data text.");
    } finally {
      setSending(false);
    }
  };

  const handleDownloadAttachment = async (url: string) => {
    const safeUrl = toProxiedUrl(url) || url;
    const supported = await Linking.canOpenURL(safeUrl);
    if (supported) {
      await Linking.openURL(safeUrl);
    } else {
      Alert.alert("Handler Error", "No system application registration found to open this attachment link.");
    }
  };

  const getAvatarRingStyles = (empStatus: string | undefined) => {
    if (empStatus === "LUNCH") return { borderColor: colors.warning, borderWidth: 2.5 };
    if (empStatus === "BREAK") return { borderColor: colors.purple, borderWidth: 2.5 };
    return { borderColor: "transparent", borderWidth: 0 };
  };

  const getSubtitle = (emp: any) => {
    if (emp.current_status === "LUNCH" && emp.lunch_start_time) {
      const start = new Date(emp.lunch_start_time).getTime();
      const expectedEnd = emp.lunch_expected_end ? new Date(emp.lunch_expected_end).getTime() : start + 30 * 60 * 1000;
      const diff = expectedEnd - nowTime;
      if (diff > 0) return `On Lunch (${Math.floor(diff / 60000)}m left)`;
      return `Overdue Lunch (${Math.floor(-diff / 60000)}m over)`;
    }
    if (emp.current_status === "BREAK" && emp.break_start_time) {
      const start = new Date(emp.break_start_time).getTime();
      const diff = (start + 15 * 60 * 1000) - nowTime;
      if (diff > 0) return `On Break (${Math.floor(diff / 60000)}m left)`;
      return `Overdue Break (${Math.floor(-diff / 60000)}m over)`;
    }
    return emp.department || "Corporate Member";
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  const filteredConversations = useMemo(() => {
    let list = conversations;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((c) => c.employee.name.toLowerCase().includes(q));
    }
    if (listFilter === "archived") {
      return list.filter((c) => archivedConversations.has(c.employee.id || c.employee._id || ""));
    }
    if (listFilter === "bookmarked") {
      return list.filter((c) => bookmarkedConversations.has(c.employee.id || c.employee._id || ""));
    }
    return list.filter((c) => !archivedConversations.has(c.employee.id || c.employee._id || ""));
  }, [conversations, searchQuery, listFilter, archivedConversations, bookmarkedConversations]);

  const filteredEmployees = useMemo(() => {
    if (!employeeSearchQuery.trim()) return employees;
    const q = employeeSearchQuery.toLowerCase();
    return employees.filter((e) => e.name.toLowerCase().includes(q) || e.email.toLowerCase().includes(q));
  }, [employees, employeeSearchQuery]);

  const toggleSet = (id: string, setType: "archive" | "bookmark") => {
    const targetSet = setType === "archive" ? archivedConversations : bookmarkedConversations;
    const setSetter = setType === "archive" ? setArchivedConversations : setBookmarkedConversations;
    const next = new Set(targetSet);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSetter(next);
  };

  if (authLoading || (loading && view === "list")) {
    return (
      <View style={styles.centerLoadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        keyboardVerticalOffset={Platform.OS === "ios" ? 44 : 0}
        style={styles.flexFill}
      >
        <View style={styles.screenHeaderContainer}>
          {view === "conversation" && selectedEmployee ? (
            <View style={styles.headerRowInline}>
              <TouchableOpacity onPress={() => { setView("list"); setSelectedEmployee(null); }} style={styles.backTouchBtn}>
                <ArrowLeft size={22} color={colors.text} />
              </TouchableOpacity>
              <View style={[styles.avatarFrame, getAvatarRingStyles(selectedEmployee.current_status)]}>
                <Text style={styles.avatarFallbackText}>{getInitials(selectedEmployee.name)}</Text>
              </View>
              <View style={styles.headerTitlesBlock}>
                <Text style={styles.headerPrimaryProfileTitle} numberOfLines={1}>{selectedEmployee.name}</Text>
                <Text style={styles.headerSecondarySubtitleText} numberOfLines={1}>{getSubtitle(selectedEmployee)}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.headerRowInlineSpaceBetween}>
              <View>
                <Text style={styles.screenMainDashboardTitleText}>Messaging</Text>
                <Text style={styles.counterTrackerMetaText}>{conversations.length} total feeds</Text>
              </View>
              <TouchableOpacity style={styles.accentActionButtonNode} onPress={() => setView("employees")}>
                <Plus size={16} color="#FFF" />
                <Text style={styles.accentActionButtonNodeText}>New</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {apiError && (
          <View style={styles.errorNotificationAlertBanner}>
            <Text style={styles.errorNotificationAlertBannerText}>{apiError}</Text>
          </View>
        )}

        {view === "list" && (
          <View style={styles.flexFill}>
            <View style={styles.horizontalFilterChipsScrollContainerRow}>
              {(["all", "archived", "bookmarked"] as const).map((filterOpt) => (
                <TouchableOpacity
                  key={filterOpt}
                  style={[styles.filterChipItemNode, listFilter === filterOpt ? styles.filterChipItemNodeSelected : null]}
                  onPress={() => setListFilter(filterOpt)}
                >
                  <Text style={[styles.filterChipItemTextText, listFilter === filterOpt ? styles.filterChipItemTextTextSelected : null]}>
                    {filterOpt.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.searchBarInputGroupFieldCard}>
              <Search size={16} color={colors.mutedText} style={styles.searchFieldLeftAbsoluteIconIcon} />
              <TextInput
                style={styles.searchBarNativeTextInputField}
                placeholder="Search Conversations..."
                placeholderTextColor={colors.mutedText}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <FlatList
              data={filteredConversations}
              keyExtractor={(item) => item.employee.id || item.employee._id || String(Math.random())}
              contentContainerStyle={styles.flatListVerticalScrollGapPaddingContainer}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const empId = item.employee.id || item.employee._id || "";
                const isArchived = archivedConversations.has(empId);
                const isBookmarked = bookmarkedConversations.has(empId);

                return (
                  <View style={styles.conversationListItemWrapperCardNode}>
                    <TouchableOpacity style={styles.conversationListItemMainInteractiveSurfaceTouch} onPress={() => startConversation(item.employee)}>
                      <View style={[styles.avatarLargeFrameCircle, getAvatarRingStyles(item.employee.current_status)]}>
                        <Text style={styles.avatarFallbackText}>{getInitials(item.employee.name)}</Text>
                        {item.unreadCount > 0 && !isArchived && (
                          <View style={styles.absoluteBadgeBadgeContainerIndicatorBadge}>
                            <Text style={styles.absoluteBadgeBadgeContainerIndicatorBadgeText}>{item.unreadCount}</Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.metaDataTextStackBodyBlock}>
                        <View style={styles.inlineHeaderRowMetaTextWrapper}>
                          <Text style={styles.employeeCardNameTextHeadline} numberOfLines={1}>{item.employee.name}</Text>
                          {item.lastMessage && (
                            <Text style={styles.lastMessageReceiptTimeTextStamp}>{formatMessageTime(item.lastMessage.timestamp)}</Text>
                          )}
                        </View>
                        <Text style={[styles.lastMessageContentMessagePreviewTruncatedText, item.unreadCount > 0 ? styles.textWeightMediumWhiteHighlight : null]} numberOfLines={1}>
                          {item.lastMessage ? item.lastMessage.content : "Start a conversation..."}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    <View style={styles.actionShortcutControlsInlineRow}>
                      <TouchableOpacity onPress={() => toggleSet(empId, "bookmark")} style={styles.actionShortcutContextSquareIconBtn}>
                        <Bookmark size={15} color={isBookmarked ? colors.warning : colors.mutedText} fill={isBookmarked ? colors.warning : "none"} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => toggleSet(empId, "archive")} style={styles.actionShortcutContextSquareIconBtn}>
                        <Archive size={15} color={isArchived ? colors.accent : colors.mutedText} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyIndexStateFeedbackBoxContainer}>
                  <MessageCircle size={36} color={colors.mutedText} />
                  <Text style={styles.emptyIndexStateFeedbackBoxTitleText}>No conversations matched criteria</Text>
                </View>
              }
            />
          </View>
        )}

        {view === "conversation" && selectedEmployee && (
          <View style={styles.flexFill}>
            <FlatList
              ref={flatListRef}
              data={conversationMessages}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.chatLogFlatListInternalScrollContainerSpacing}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isMe = item.sender === currentUser;
                const hasAttachment = !!item.attachment?.url;

                return (
                  <View style={[styles.chatBubbleLayoutWrapperFlexRowContainer, isMe ? styles.rowDirectionReverse : styles.rowDirectionStandard]}>
                    <View style={styles.chatBubbleAvatarFallbackFrameMiniCircle}>
                      <Text style={styles.chatBubbleAvatarFallbackFrameMiniCircleText}>{getInitials(item.sender)}</Text>
                    </View>

                    <View style={[styles.chatMessageContentBoxBubbleContainerNode, isMe ? styles.bgBubbleSenderPrimaryTheme : styles.bgBubbleRecipientMutedSystemDark]}>
                      {hasAttachment && (
                        <TouchableOpacity
                          style={styles.attachmentInteractiveSurfacePreviewLinkBox}
                          onPress={() => item.attachment?.url && setPreview({ url: item.attachment.url || "", fileName: item.attachment.fileName || "file" })}
                        >
                         <Image 
  source={{ 
    uri: item.attachment?.url 
      ? (toProxiedUrl(item.attachment.url) || item.attachment.url) 
      : "" 
  }} 
  style={styles.attachmentThumbnailImageFrameRender} 
/>
                          <Text style={[styles.attachmentFileNameLabelTextString, isMe ? styles.textWhite : styles.textGrayE5]} numberOfLines={1}>
                            {item.attachment?.fileName}
                          </Text>
                        </TouchableOpacity>
                      )}

                      {item.content?.trim() ? (
                        <Text style={[styles.chatBubbleContentBodyLiteralText, isMe ? styles.textWhite : styles.textGrayE5]}>
                          {item.content}
                        </Text>
                      ) : null}

                      <Text style={[styles.chatBubbleMicroTimeReceiptStampText, isMe ? styles.textWhiteMutedOpacity : styles.textGray9CA3]}>
                        {formatMessageTime(item.timestamp)}
                      </Text>
                    </View>
                  </View>
                );
              }}
            />

            <View 
              style={[
                styles.inputDockLayoutFooterFixedContainerAreaBar, 
                { paddingBottom: insets.bottom > 0 ? insets.bottom + 6 : 12 }
              ]}
            >
              <TouchableOpacity style={styles.inputDockUtilityIconButtonCircleTouchSurface} onPress={pickAndUploadFile} disabled={uploading}>
                {uploading ? <ActivityIndicator size="small" color={colors.mutedText} /> : <Paperclip size={18} color={colors.mutedText} />}
              </TouchableOpacity>

              <TextInput
                style={styles.inputDockMultilineTextInputNativeField}
                placeholder={`Message ${selectedEmployee.name}...`}
                placeholderTextColor={colors.mutedText}
                value={newMessageContent}
                onChangeText={setNewMessageContent}
                multiline
              />

              <TouchableOpacity
                style={[styles.inputDockSubmitSendIconButtonCircleTouchSurface, !newMessageContent.trim() ? styles.disabledButtonStateFadeOpacity : null]}
                onPress={sendMessage}
                disabled={!newMessageContent.trim() || sending}
              >
                <Send size={16} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        <Modal visible={view === "employees"} animationType="slide" transparent>
          <View style={styles.modalViewportBackdropDimOverlayWrapperMask}>
            <SafeAreaView style={styles.modalContentCardSheetContainerBody}>
              <View style={styles.modalContentHeaderBlockRowInline}>
                <Text style={styles.modalContentHeaderBlockRowInlineTitleHeadlineText}>Select Team Member</Text>
                <TouchableOpacity style={styles.modalContentHeaderCloseIconButtonTouchSurface} onPress={() => setView("list")}>
                  <X size={20} color={colors.mutedText} />
                </TouchableOpacity>
              </View>

              <View style={styles.searchBarInputGroupFieldCard}>
                <Search size={16} color={colors.mutedText} style={styles.searchFieldLeftAbsoluteIconIcon} />
                <TextInput
                  style={styles.searchBarNativeTextInputField}
                  placeholder="Search directory..."
                  placeholderTextColor={colors.mutedText}
                  value={employeeSearchQuery}
                  onChangeText={setEmployeeSearchQuery}
                />
              </View>

              <FlatList
                data={filteredEmployees}
                keyExtractor={(item) => item.id || item._id || String(Math.random())}
                contentContainerStyle={styles.flatListVerticalScrollGapPaddingContainer}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.directoryEmployeeItemBarCardRowTouchSurface} onPress={() => startConversation(item)}>
                    <View style={styles.avatarLargeFrameCircle}>
                      <Text style={styles.avatarFallbackText}>{getInitials(item.name)}</Text>
                    </View>
                    <View style={styles.flexFill}>
                      <Text style={styles.employeeCardNameTextHeadline}>{item.name}</Text>
                      <Text style={styles.directoryEmployeeItemSubTextSubtitleString}>{item.email} • {item.department || "General Operations"}</Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            </SafeAreaView>
          </View>
        </Modal>

        <Modal visible={Boolean(preview)} transparent animationType="fade">
          <View style={styles.lightboxViewportContainerMaskScrim}>
            <SafeAreaView style={styles.lightboxSafeAreaContentContainerWrapper}>
              <View style={styles.lightboxTopManagementMenuBarRowInline}>
                <Text style={styles.lightboxTopMenuBarFileNameLabelStringText} numberOfLines={1}>{preview?.fileName}</Text>
                <View style={styles.inlineHeaderRowMetaTextWrapper}>
                  <TouchableOpacity onPress={() => preview?.url && handleDownloadAttachment(preview.url)} style={styles.lightboxControlHeaderActionIconButtonTouchSurface}>
                    <Download size={20} color={colors.white} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setPreview(null)} style={styles.lightboxControlHeaderActionIconButtonTouchSurface}>
                    <X size={20} color={colors.white} />
                  </TouchableOpacity>
                </View>
              </View>
              {preview?.url && (
                <Image source={{ uri: toProxiedUrl(preview.url) || preview.url }} style={styles.lightboxCoreImageCanvasRenderFrame} resizeMode="contain" />
              )}
            </SafeAreaView>
          </View>
        </Modal>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    flexFill: {
      flex: 1,
    },
    centerLoadingContainer: {
      flex: 1,
      backgroundColor: colors.background,
      alignItems: "center",
      justifyContent: "center",
    },
    screenHeaderContainer: {
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    headerRowInline: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    headerRowInlineSpaceBetween: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    backTouchBtn: {
      padding: 4,
      marginRight: 2,
    },
    avatarFrame: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarFallbackText: {
      color: "#FFF",
      fontSize: 12,
      fontWeight: "700",
    },
    headerTitlesBlock: {
      flex: 1,
      gap: 2,
    },
    headerPrimaryProfileTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
    },
    headerSecondarySubtitleText: {
      fontSize: 12,
      color: colors.mutedText,
    },
    screenMainDashboardTitleText: {
      fontSize: 22,
      fontWeight: "800",
      color: colors.text,
      letterSpacing: -0.5,
    },
    counterTrackerMetaText: {
      fontSize: 12,
      color: colors.mutedText,
      marginTop: 2,
    },
    accentActionButtonNode: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 8,
      gap: 6,
    },
    accentActionButtonNodeText: {
      color: "#FFF",
      fontSize: 13,
      fontWeight: "600",
    },
    errorNotificationAlertBanner: {
      backgroundColor: colors.errorBg,
      padding: 10,
      marginHorizontal: 16,
      marginTop: 10,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.errorBorder,
    },
    errorNotificationAlertBannerText: {
      color: colors.danger,
      fontSize: 12,
      textAlign: "center",
    },
    horizontalFilterChipsScrollContainerRow: {
      flexDirection: "row",
      paddingHorizontal: 16,
      paddingVertical: 10,
      gap: 8,
    },
    filterChipItemNode: {
      backgroundColor: colors.cardBg,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    filterChipItemNodeSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.accent,
    },
    filterChipItemTextText: {
      color: colors.mutedText,
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.5,
    },
    filterChipItemTextTextSelected: {
      color: "#FFF",
    },
    searchBarInputGroupFieldCard: {
      marginHorizontal: 16,
      marginBottom: 12,
      position: "relative",
      justifyContent: "center",
    },
    searchFieldLeftAbsoluteIconIcon: {
      position: "absolute",
      left: 12,
      zIndex: 2,
    },
    searchBarNativeTextInputField: {
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 8,
      height: 38,
      paddingLeft: 36,
      paddingRight: 12,
      color: colors.inputText,
      fontSize: 13,
    },
    flatListVerticalScrollGapPaddingContainer: {
      paddingHorizontal: 16,
      paddingBottom: 24,
      gap: 8,
    },
    conversationListItemWrapperCardNode: {
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingRight: 8,
      overflow: "hidden",
    },
    conversationListItemMainInteractiveSurfaceTouch: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      padding: 12,
      gap: 12,
    },
    avatarLargeFrameCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
    },
    absoluteBadgeBadgeContainerIndicatorBadge: {
      position: "absolute",
      top: -4,
      right: -4,
      backgroundColor: colors.unreadBadge,
      minWidth: 16,
      height: 16,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 4,
    },
    absoluteBadgeBadgeContainerIndicatorBadgeText: {
      color: "#FFF",
      fontSize: 9,
      fontWeight: "800",
    },
    metaDataTextStackBodyBlock: {
      flex: 1,
      gap: 4,
    },
    inlineHeaderRowMetaTextWrapper: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 6,
    },
    employeeCardNameTextHeadline: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
    },
    lastMessageReceiptTimeTextStamp: {
      fontSize: 11,
      color: colors.mutedText,
    },
    lastMessageContentMessagePreviewTruncatedText: {
      fontSize: 13,
      color: colors.mutedText,
    },
    textWeightMediumWhiteHighlight: {
      fontWeight: "600",
      color: colors.text,
    },
    actionShortcutControlsInlineRow: {
      flexDirection: "row",
      gap: 2,
    },
    actionShortcutContextSquareIconBtn: {
      width: 32,
      height: 32,
      borderRadius: 6,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyIndexStateFeedbackBoxContainer: {
      padding: 48,
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
    },
    emptyIndexStateFeedbackBoxTitleText: {
      color: colors.mutedText,
      fontSize: 14,
      fontWeight: "500",
    },
    chatLogFlatListInternalScrollContainerSpacing: {
      padding: 16,
      gap: 14,
    },
    chatBubbleLayoutWrapperFlexRowContainer: {
      flexDirection: "row",
      gap: 10,
      width: "100%",
    },
    rowDirectionStandard: {
      flexDirection: "row",
    },
    rowDirectionReverse: {
      flexDirection: "row-reverse",
    },
    chatBubbleAvatarFallbackFrameMiniCircle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
    },
    chatBubbleAvatarFallbackFrameMiniCircleText: {
      color: colors.mutedText,
      fontSize: 10,
      fontWeight: "700",
    },
    chatMessageContentBoxBubbleContainerNode: {
      maxWidth: "75%",
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 4,
    },
    bgBubbleSenderPrimaryTheme: {
      backgroundColor: colors.senderBubble,
      borderBottomRightRadius: 2,
    },
    bgBubbleRecipientMutedSystemDark: {
      backgroundColor: colors.recipientBubble,
      borderBottomLeftRadius: 2,
      borderWidth: 1,
      borderColor: colors.border,
    },
    attachmentInteractiveSurfacePreviewLinkBox: {
      backgroundColor: "rgba(0,0,0,0.2)",
      borderRadius: 8,
      padding: 6,
      gap: 6,
      marginBottom: 4,
      maxWidth: 200,
    },
    attachmentThumbnailImageFrameRender: {
      width: "100%",
      height: 110,
      borderRadius: 6,
      backgroundColor: "#000",
    },
    attachmentFileNameLabelTextString: {
      fontSize: 11,
      textDecorationLine: "underline",
    },
    chatBubbleContentBodyLiteralText: {
      fontSize: 14,
      lineHeight: 19,
    },
    chatBubbleMicroTimeReceiptStampText: {
      fontSize: 10,
      textAlign: "right",
      marginTop: 2,
    },
    textWhite: { color: colors.white },
    textGrayE5: { color: colors.grayE5 },
    textWhiteMutedOpacity: { color: "rgba(255,255,255,0.7)" },
    textGray9CA3: { color: colors.gray9CA3 },
    inputDockLayoutFooterFixedContainerAreaBar: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingTop: 10,
      borderTopWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      gap: 8,
    },
    inputDockUtilityIconButtonCircleTouchSurface: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.cardBg,
      alignItems: "center",
      justifyContent: "center",
    },
    inputDockMultilineTextInputNativeField: {
      flex: 1,
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 18,
      paddingHorizontal: 14,
      paddingTop: 8,
      paddingBottom: 8,
      color: colors.inputText,
      fontSize: 14,
      maxHeight: 90,
      minHeight: 36,
    },
    inputDockSubmitSendIconButtonCircleTouchSurface: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.senderBubble,
      alignItems: "center",
      justifyContent: "center",
    },
    disabledButtonStateFadeOpacity: {
      opacity: 0.4,
    },
    modalViewportBackdropDimOverlayWrapperMask: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.6)",
      justifyContent: "flex-end",
    },
    modalContentCardSheetContainerBody: {
      height: "85%",
      backgroundColor: colors.background,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalContentHeaderBlockRowInline: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 16,
    },
    modalContentHeaderBlockRowInlineTitleHeadlineText: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
    },
    modalContentHeaderCloseIconButtonTouchSurface: {
      padding: 4,
    },
    directoryEmployeeItemBarCardRowTouchSurface: {
      flexDirection: "row",
      alignItems: "center",
      padding: 12,
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      gap: 12,
    },
    directoryEmployeeItemSubTextSubtitleString: {
      fontSize: 12,
      color: colors.mutedText,
      marginTop: 2,
    },
    lightboxViewportContainerMaskScrim: {
      flex: 1,
      backgroundColor: colors.lightboxBg,
    },
    lightboxSafeAreaContentContainerWrapper: {
      flex: 1,
      justifyContent: "center",
    },
    lightboxTopManagementMenuBarRowInline: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 16,
      height: 50,
    },
    lightboxTopMenuBarFileNameLabelStringText: {
      color: colors.white,
      fontSize: 14,
      fontWeight: "600",
      flex: 1,
      marginRight: 16,
    },
    lightboxControlHeaderActionIconButtonTouchSurface: {
      padding: 8,
    },
    lightboxCoreImageCanvasRenderFrame: {
      flex: 1,
      width: "100%",
    },
    formGroup: {
      marginBottom: 12,
    },
    inputLabel: {
      fontSize: 13,
      fontWeight: "500",
      color: colors.text,
      marginBottom: 4,
    },
    pickerTrigger: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      height: 40,
      backgroundColor: colors.inputBg,
    },
    pickerTriggerText: {
      fontSize: 14,
      color: colors.inputText,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    pickerModalCard: {
      width: SCREEN_WIDTH * 0.8,
      backgroundColor: colors.cardBg,
      borderRadius: 12,
      padding: 16,
      maxHeight: 280,
    },
    pickerModalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingBottom: 8,
      marginBottom: 6,
    },
    pickerModalTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
    },
    pickerItemRow: {
      paddingVertical: 10,
      paddingHorizontal: 6,
      borderRadius: 6,
    },
    pickerItemRowActive: {
      backgroundColor: colors.activeRowBg,
    },
    pickerItemText: {
      fontSize: 14,
      color: colors.text,
    },
    pickerItemTextActive: {
      color: colors.primary,
      fontWeight: "600",
    },
  });
}