import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Radio, Send, ShieldAlert, X } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { apiRequest } from "@/services/api";

interface CompanyBroadcastCreatorModalProps {
  visible: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export const CompanyBroadcastCreatorModal: React.FC<CompanyBroadcastCreatorModalProps> = ({
  visible,
  onClose,
  onCreated,
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [priority, setPriority] = useState<"urgent" | "normal">("urgent");
  const [targetScope, setTargetScope] = useState<"all" | "department" | "role">("all");
  const [targetValue, setTargetValue] = useState("");
  const [requiresAck, setRequiresAck] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  if (!visible) return null;

  const handleSubmit = async () => {
    if (!title.trim() || !mediaUrl.trim()) {
      Alert.alert("Missing Details", "Please provide a broadcast title and video URL.");
      return;
    }

    setSubmitting(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await apiRequest("/company-reels/broadcasts", {
        method: "POST",
        body: JSON.stringify({
          title,
          description,
          mediaUrl,
          priority,
          targetScope,
          targetValues: targetValue ? [targetValue.trim()] : [],
          requiresAcknowledgment: requiresAck,
        }),
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Broadcast Published", "Your video broadcast is now active for targeted employees.");
      setTitle("");
      setDescription("");
      setMediaUrl("");
      setTargetValue("");
      if (onCreated) onCreated();
      onClose();
    } catch (err: any) {
      console.error("[Broadcast Creator] Submit error:", err);
      Alert.alert("Error", err.message || "Failed to publish broadcast.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.titleWithIcon}>
              <Radio size={20} color="#EF4444" style={{ marginRight: 8 }} />
              <Text style={styles.headerTitle}>Post Team Broadcast</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.closeBtn}
            >
              <X size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 30 }}>
            {/* Title */}
            <Text style={styles.label}>Broadcast Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Critical Safety Alert / Equipment Protocol"
              placeholderTextColor="#64748B"
              value={title}
              onChangeText={setTitle}
            />

            {/* Description */}
            <Text style={styles.label}>Description / Instructions</Text>
            <TextInput
              style={[styles.input, { height: 75, textAlignVertical: "top" }]}
              placeholder="Provide background context or compliance instructions..."
              placeholderTextColor="#64748B"
              multiline
              value={description}
              onChangeText={setDescription}
            />

            {/* Video URL */}
            <Text style={styles.label}>Video Clip URL (MP4 / HLS) *</Text>
            <TextInput
              style={styles.input}
              placeholder="https://commondatastorage.googleapis.com/..."
              placeholderTextColor="#64748B"
              value={mediaUrl}
              onChangeText={setMediaUrl}
              autoCapitalize="none"
            />

            {/* Priority Selector */}
            <Text style={styles.label}>Broadcast Priority</Text>
            <View style={styles.segmentedRow}>
              <TouchableOpacity
                style={[
                  styles.segBtn,
                  priority === "urgent" && styles.segBtnUrgentActive,
                ]}
                onPress={() => setPriority("urgent")}
              >
                <ShieldAlert
                  size={14}
                  color={priority === "urgent" ? "#EF4444" : "#94A3B8"}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.segBtnText,
                    priority === "urgent" && { color: "#EF4444", fontWeight: "800" },
                  ]}
                >
                  Urgent Interrupt
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.segBtn,
                  priority === "normal" && styles.segBtnNormalActive,
                ]}
                onPress={() => setPriority("normal")}
              >
                <Text
                  style={[
                    styles.segBtnText,
                    priority === "normal" && { color: "#38BDF8", fontWeight: "800" },
                  ]}
                >
                  Standard Notice
                </Text>
              </TouchableOpacity>
            </View>

            {/* Target Scope */}
            <Text style={styles.label}>Target Audience</Text>
            <View style={styles.segmentedRow}>
              {(["all", "department", "role"] as const).map((sc) => (
                <TouchableOpacity
                  key={sc}
                  style={[
                    styles.segBtn,
                    targetScope === sc && styles.segBtnNormalActive,
                  ]}
                  onPress={() => setTargetScope(sc)}
                >
                  <Text
                    style={[
                      styles.segBtnText,
                      targetScope === sc && { color: "#38BDF8", fontWeight: "800" },
                    ]}
                  >
                    {sc.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {targetScope !== "all" && (
              <TextInput
                style={[styles.input, { marginTop: 8 }]}
                placeholder={
                  targetScope === "department"
                    ? "Enter department name (e.g. Operations, Field)"
                    : "Enter role name (e.g. technician, driver)"
                }
                placeholderTextColor="#64748B"
                value={targetValue}
                onChangeText={setTargetValue}
              />
            )}

            {/* Acknowledgment Toggle */}
            <View style={styles.switchRow}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.switchTitle}>Enforce Mandatory Acknowledgment</Text>
                <Text style={styles.switchSub}>
                  Requires employee to sign off electronically before clearing the notice.
                </Text>
              </View>
              <Switch
                value={requiresAck}
                onValueChange={setRequiresAck}
                trackColor={{ false: "#334155", true: "#22C55E" }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* Publish Button */}
            <TouchableOpacity
              style={styles.publishBtn}
              disabled={submitting}
              onPress={handleSubmit}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Send size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.publishBtnText}>Publish Broadcast</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: "#0F172A",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 18,
    paddingHorizontal: 16,
    maxHeight: "92%",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  titleWithIcon: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  label: {
    color: "#CBD5E1",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: "#1E293B",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: "#F8FAFC",
    fontSize: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  segmentedRow: {
    flexDirection: "row",
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 3,
    gap: 4,
  },
  segBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: 10,
  },
  segBtnUrgentActive: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
  },
  segBtnNormalActive: {
    backgroundColor: "rgba(56, 189, 248, 0.2)",
  },
  segBtnText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 14,
    padding: 14,
    marginTop: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  switchTitle: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  switchSub: {
    color: "#94A3B8",
    fontSize: 11,
    lineHeight: 15,
  },
  publishBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0284C7",
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: "#0284C7",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  publishBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
});
