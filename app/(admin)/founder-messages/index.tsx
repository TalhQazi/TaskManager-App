import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  Alert,
  SafeAreaView,
  Platform,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  Quote,
  ToggleLeft,
  ToggleRight,
} from "lucide-react-native";
import { apiFetch } from "@/lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";

interface FounderMessage {
  _id: string;
  message: string;
  isActive: boolean;
  order: number;
  createdAt: string;
}

export default function FounderMessagesAdmin() {
  const queryClient = useQueryClient();
  const { uiTheme } = useTheme();

  
 const isDark = (uiTheme.theme as string) === "dark" || (uiTheme.theme as string) === "metallic-elite";
  const colors = useMemo(() => ({
    background: uiTheme.panelColors?.dashboardBackground || (isDark ? "#0f172a" : "#f8fafc"),
    cardBg: uiTheme.panelColors?.dashboardCardBackground || (isDark ? "#1e293b" : "#ffffff"),
    text: uiTheme.panelColors?.dashboardTextColor || (isDark ? "#f8fafc" : "#0f172a"),
    mutedText: isDark ? "#94a3b8" : "#64748b",
    border: isDark ? "#334155" : "#e2e8f0",
    inputBg: isDark ? "#0f172a" : "#ffffff",
    inputText: isDark ? "#f8fafc" : "#0f172a",
    primary: uiTheme.customColors?.primary || "#3b82f6",
    success: "#10b981",
    destructive: "#ef4444",
    cardMuted: isDark ? "#1e293b" : "#f1f5f9",
  }), [uiTheme, isDark]);

  const styles = useMemo(() => createStyles(colors), [colors]);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState<FounderMessage | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [editMessageText, setEditMessageText] = useState("");

  const { data: messages = [], isLoading } = useQuery<FounderMessage[]>({
    queryKey: ["founder-messages-admin"],
    queryFn: async () => {
      const res = await apiFetch<{ items: FounderMessage[] }>("/api/founder-messages/admin");
      return res.items;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await apiFetch<{ item: FounderMessage }>("/api/founder-messages/admin", {
        method: "POST",
        body: JSON.stringify({ message }),
      });
      return res.item;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["founder-messages-admin"] });
      setIsCreateOpen(false);
      setNewMessage("");
      Alert.alert("Message created", "New founder message has been added.");
    },
    onError: (err) => {
      Alert.alert("Failed to create message", err instanceof Error ? err.message : "Something went wrong");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, message, isActive }: { id: string; message?: string; isActive?: boolean }) => {
      const res = await apiFetch<{ item: FounderMessage }>(`/api/founder-messages/admin/${id}`, {
        method: "PUT",
        body: JSON.stringify({ message, isActive }),
      });
      return res.item;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["founder-messages-admin"] });
      setIsEditOpen(false);
      setEditingMessage(null);
      setEditMessageText("");
      Alert.alert("Message updated", "Founder message has been updated.");
    },
    onError: (err) => {
      Alert.alert("Failed to update message", err instanceof Error ? err.message : "Something went wrong");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiFetch(`/api/founder-messages/admin/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["founder-messages-admin"] });
      Alert.alert("Message deleted", "Founder message has been removed.");
    },
    onError: (err) => {
      Alert.alert("Failed to delete message", err instanceof Error ? err.message : "Something went wrong");
    },
  });

  const handleCreate = () => {
    if (!newMessage.trim()) {
      Alert.alert("Validation Error", "Message is required");
      return;
    }
    createMutation.mutate(newMessage.trim());
  };

  const handleUpdate = () => {
    if (!editingMessage) return;
    if (!editMessageText.trim()) {
      Alert.alert("Validation Error", "Message is required");
      return;
    }
    updateMutation.mutate({
      id: editingMessage._id,
      message: editMessageText.trim(),
    });
  };

  const handleToggleActive = (message: FounderMessage) => {
    updateMutation.mutate({
      id: message._id,
      isActive: !message.isActive,
    });
  };

  const openEdit = (message: FounderMessage) => {
    setEditingMessage(message);
    setEditMessageText(message.message);
    setIsEditOpen(true);
  };

  const openDelete = (message: FounderMessage) => {
    Alert.alert(
      "Delete Message?",
      `This will permanently delete the message: "${message.message}"`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteMutation.mutate(message._id),
        },
      ]
    );
  };

  const activeCount = useMemo(() => messages.filter((m) => m.isActive).length, [messages]);

  return (
    <SafeAreaView style={styles.rootViewport}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.viewportHeader}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={styles.viewportHeading}>Founder Messages</Text>
            <Text style={styles.viewportSubheading}>Manage motivational messages that appear on the dashboard</Text>
          </View>
          <TouchableOpacity style={styles.globalActionTrigger} onPress={() => setIsCreateOpen(true)}>
            <Plus size={16} color="#fff" style={{ marginRight: 4 }} />
            <Text style={styles.globalActionTriggerText}>Add Message</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsContainerGrid}>
          <View style={styles.metricSummaryBox}>
            <Text style={styles.metricLabel}>Total Messages</Text>
            <Text style={styles.metricCount}>{messages.length}</Text>
          </View>
          <View style={styles.metricSummaryBox}>
            <Text style={styles.metricLabel}>Active Messages</Text>
            <Text style={[styles.metricCount, { color: colors.success }]}>{activeCount}</Text>
          </View>
          <View style={styles.metricSummaryBox}>
            <Text style={styles.metricLabel}>Inactive Messages</Text>
            <Text style={[styles.metricCount, { color: colors.mutedText }]}>{messages.length - activeCount}</Text>
          </View>
        </View>

        <View style={styles.listBlockCardContainer}>
          <View style={styles.cardHeaderTitleBar}>
            <Quote size={18} color={colors.primary} style={{ marginRight: 8 }} />
            <Text style={styles.cardTitleHeading}>All Messages</Text>
          </View>

          {isLoading ? (
            <View style={styles.centeredFallbackContext}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : messages.length === 0 ? (
            <View style={styles.centeredFallbackContext}>
              <Quote size={36} color={colors.mutedText} style={{ opacity: 0.2, marginBottom: 8 }} />
              <Text style={styles.fallbackTitleText}>No messages found. Create your first motivational message!</Text>
            </View>
          ) : (
            <View style={styles.itemsFlowGridList}>
              {messages.map((message, index) => (
                <View
                  key={message._id}
                  style={[
                    styles.messageItemRowCard,
                    { backgroundColor: message.isActive ? colors.cardBg : colors.cardMuted },
                  ]}
                >
                  <View style={styles.messageContentCluster}>
                    <Text style={styles.itemIndexLabel}>{index + 1}</Text>
                    <Text
                      style={[
                        styles.messageParagraphText,
                        { color: message.isActive ? colors.text : colors.mutedText },
                      ]}
                      numberOfLines={2}
                    >
                      "{message.message}"
                    </Text>
                  </View>

                  <View style={styles.itemControlsActionGroup}>
                    <View
                      style={[
                        styles.statusBadgeUnit,
                        {
                          backgroundColor: message.isActive ? `${colors.success}15` : `${colors.mutedText}15`,
                          borderColor: message.isActive ? `${colors.success}30` : `${colors.mutedText}30`,
                        },
                      ]}
                    >
                      <Text style={[styles.statusBadgeText, { color: message.isActive ? colors.success : colors.mutedText }]}>
                        {message.isActive ? "Active" : "Inactive"}
                      </Text>
                    </View>

                    <TouchableOpacity style={styles.rowActionIconButton} onPress={() => handleToggleActive(message)}>
                      {message.isActive ? (
                        <ToggleRight size={22} color={colors.success} />
                      ) : (
                        <ToggleLeft size={22} color={colors.mutedText} />
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.rowActionIconButton} onPress={() => openEdit(message)}>
                      <Edit2 size={15} color={colors.text} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.rowActionIconButton} onPress={() => openDelete(message)}>
                      <Trash2 size={15} color={colors.destructive} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal visible={isCreateOpen} transparent animationType="slide">
        <View style={styles.modalViewportBackdrop}>
          <View style={styles.formSheetContainer}>
            <View style={styles.sheetTopBarHeader}>
              <View>
                <Text style={styles.sheetHeaderHeading}>Add New Message</Text>
                <Text style={styles.sheetHeaderSubheading}>Create a motivational message for users to see on their dashboard.</Text>
              </View>
              <TouchableOpacity onPress={() => setIsCreateOpen(false)} style={styles.sheetCloseTrigger}>
                <X size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 20 }}>
              <Text style={styles.formFieldTitleLabel}>Message</Text>
              <TextInput
                style={styles.baseTextInputField}
                value={newMessage}
                onChangeText={setNewMessage}
                placeholder="Enter a motivational message..."
                placeholderTextColor={colors.mutedText}
                maxLength={200}
                multiline
              />
              <Text style={styles.charCounterText}>{newMessage.length}/200 characters</Text>
            </View>

            <View style={styles.sheetFooterActionLayout}>
              <TouchableOpacity style={styles.sheetSecondaryActionBtn} onPress={() => setIsCreateOpen(false)}>
                <Text style={styles.sheetActionBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sheetPrimaryActionBtn, { backgroundColor: colors.primary }]}
                onPress={handleCreate}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Save size={15} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={[styles.sheetActionBtnText, { color: "#fff" }]}>Save Message</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={isEditOpen} transparent animationType="slide">
        <View style={styles.modalViewportBackdrop}>
          <View style={styles.formSheetContainer}>
            <View style={styles.sheetTopBarHeader}>
              <View>
                <Text style={styles.sheetHeaderHeading}>Edit Message</Text>
                <Text style={styles.sheetHeaderSubheading}>Update this motivational message.</Text>
              </View>
              <TouchableOpacity onPress={() => setIsEditOpen(false)} style={styles.sheetCloseTrigger}>
                <X size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 20 }}>
              <Text style={styles.formFieldTitleLabel}>Message</Text>
              <TextInput
                style={styles.baseTextInputField}
                value={editMessageText}
                onChangeText={setEditMessageText}
                placeholder="Enter a motivational message..."
                placeholderTextColor={colors.mutedText}
                maxLength={200}
                multiline
              />
              <Text style={styles.charCounterText}>{editMessageText.length}/200 characters</Text>
            </View>

            <View style={styles.sheetFooterActionLayout}>
              <TouchableOpacity style={styles.sheetSecondaryActionBtn} onPress={() => setIsEditOpen(false)}>
                <Text style={styles.sheetActionBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sheetPrimaryActionBtn, { backgroundColor: colors.primary }]}
                onPress={handleUpdate}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Save size={15} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={[styles.sheetActionBtnText, { color: "#fff" }]}>Update Message</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    rootViewport: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContainer: {
      paddingBottom: 32,
    },
    viewportHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 12,
    },
    viewportHeading: {
      fontSize: 22,
      fontWeight: "700",
      color: colors.text,
      letterSpacing: -0.5,
    },
    viewportSubheading: {
      fontSize: 12,
      color: colors.mutedText,
      marginTop: 2,
      lineHeight: 16,
    },
    globalActionTrigger: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.primary,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 6,
    },
    globalActionTriggerText: {
      color: "#fff",
      fontSize: 13,
      fontWeight: "600",
    },
    statsContainerGrid: {
      flexDirection: "row",
      paddingHorizontal: 16,
      gap: 10,
      marginBottom: 16,
    },
    metricSummaryBox: {
      flex: 1,
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 12,
    },
    metricLabel: {
      fontSize: 11,
      fontWeight: "500",
      color: colors.mutedText,
    },
    metricCount: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.text,
      marginTop: 4,
    },
    listBlockCardContainer: {
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      marginHorizontal: 16,
      paddingVertical: 14,
    },
    cardHeaderTitleBar: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      marginBottom: 12,
    },
    cardTitleHeading: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.text,
    },
    centeredFallbackContext: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 36,
      paddingHorizontal: 16,
    },
    fallbackTitleText: {
      fontSize: 13,
      color: colors.mutedText,
      textAlign: "center",
      lineHeight: 18,
    },
    itemsFlowGridList: {
      paddingHorizontal: 14,
      gap: 8,
    },
    messageItemRowCard: {
      flexDirection: "column",
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
      gap: 10,
    },
    messageContentCluster: {
      flexDirection: "row",
      alignItems: "flex-start",
      flex: 1,
    },
    itemIndexLabel: {
      fontSize: 13,
      color: colors.mutedText,
      width: 22,
      fontWeight: "500",
    },
    messageParagraphText: {
      flex: 1,
      fontSize: 14,
      fontWeight: "500",
      lineHeight: 18,
    },
    itemControlsActionGroup: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 8,
      gap: 6,
    },
    statusBadgeUnit: {
      borderWidth: 1,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
    },
    statusBadgeText: {
      fontSize: 10,
      fontWeight: "600",
    },
    rowActionIconButton: {
      padding: 6,
      marginLeft: 2,
    },
    modalViewportBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "flex-end",
    },
    formSheetContainer: {
      backgroundColor: colors.cardBg,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      paddingBottom: Platform.OS === "ios" ? 24 : 12,
    },
    sheetTopBarHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderColor: colors.border,
    },
    sheetHeaderHeading: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
    },
    sheetHeaderSubheading: {
      fontSize: 12,
      color: colors.mutedText,
      marginTop: 2,
      maxWidth: "90%",
      lineHeight: 15,
    },
    sheetCloseTrigger: {
      padding: 4,
    },
    formFieldTitleLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 6,
      textTransform: "uppercase",
      letterSpacing: 0.3,
    },
    baseTextInputField: {
      minHeight: 64,
      backgroundColor: colors.inputBg,
      borderRadius: 6,
      paddingHorizontal: 12,
      paddingTop: 10,
      paddingBottom: 10,
      fontSize: 14,
      color: colors.inputText,
      borderWidth: 1,
      borderColor: colors.border,
      textAlignVertical: "top",
    },
    charCounterText: {
      fontSize: 11,
      color: colors.mutedText,
      textAlign: "right",
      marginTop: 4,
    },
    sheetFooterActionLayout: {
      flexDirection: "row",
      paddingHorizontal: 20,
      paddingBottom: 12,
      gap: 12,
    },
    sheetSecondaryActionBtn: {
      flex: 1,
      height: 40,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    sheetPrimaryActionBtn: {
      flex: 1,
      height: 40,
      borderRadius: 6,
      alignItems: "center",
      justifyContent: "center",
    },
    sheetActionBtnText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.text,
    },
  });
}