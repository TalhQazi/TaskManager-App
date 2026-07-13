import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Dimensions,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

const COLORS = {
  background: "#09090b", // Deep Black
  card: "#18181b",      // Dark Grey Card
  primary: "#ffd27a",   // Gold Accent
  text: "#ffffff",      // White Text
  textMuted: "#a1a1aa", // Muted Text
  border: "#27272a",    // Subtle Border
  success: "#22c55e",
  info: "#3b82f6",
};

import {
  getTodayTimeEntry,
  clockIn,
  submitScrumAndClockOut,
  getEmployeeTimeEntryHistory,
  getEmployeeProfile,
  submitEODReport,
  getOnboardingStatus,
} from "@/lib/admin/apiClient";

export default function EmployeeClockedScreen() {
  const queryClient = useQueryClient();
  const navigation = useNavigation<any>();
  const [currentTime, setCurrentTime] = useState(new Date());

  const [showScrumModal, setShowScrumModal] = useState(false);
  const [inputType, setInputType] = useState<"text" | "voice">("text");
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [validationError, setValidationError] = useState("");
  const [eodData, setEodData] = useState({ tasksCompleted: "", issuesBlockers: "", notes: "" });

  const { data: profileData, isLoading: profileLoading } = useQuery({ queryKey: ["employeeProfile"], queryFn: getEmployeeProfile });
  const { data: todayEntryData, isLoading: entryLoading } = useQuery({ queryKey: ["todayTimeEntry"], queryFn: getTodayTimeEntry });
  const { data: historyData, isLoading: historyLoading } = useQuery({ queryKey: ["timeEntryHistory"], queryFn: getEmployeeTimeEntryHistory });
  const { data: onboardingData, isLoading: onboardingLoading } = useQuery({
    queryKey: ["onboardingStatus"],
    queryFn: () => getOnboardingStatus().catch(() => ({ item: { overallStatus: "not_started", progress: 0 } })),
  });

  const clockInMutation = useMutation({
    mutationFn: clockIn,
    onSuccess: () => { Alert.alert("Success", "Clocked in successfully"); queryClient.invalidateQueries(["todayTimeEntry"]); queryClient.invalidateQueries(["timeEntryHistory"]); },
    onError: (err: any) => Alert.alert("Clock In Failed", err.message || "Something went wrong."),
  });

  const clockOutMutation = useMutation({
    mutationFn: async () => {
      await submitEODReport({ inputType, tasksCompleted: eodData.tasksCompleted.trim(), issuesBlockers: eodData.issuesBlockers.trim(), notes: eodData.notes.trim(), transcription: inputType === "voice" ? transcription.trim() : undefined });
      return submitScrumAndClockOut(JSON.stringify({ tasksCompleted: eodData.tasksCompleted.trim(), issuesBlockers: eodData.issuesBlockers.trim(), notes: eodData.notes.trim() }));
    },
    onSuccess: () => { setShowScrumModal(false); setEodData({ tasksCompleted: "", issuesBlockers: "", notes: "" }); setTranscription(""); queryClient.invalidateQueries(["todayTimeEntry"]); queryClient.invalidateQueries(["timeEntryHistory"]); },
    onError: (err: any) => Alert.alert("Clock Out Failed", err.message || "Failed to submit logs."),
  });

  useEffect(() => { const timer = setInterval(() => setCurrentTime(new Date()), 1000); return () => clearInterval(timer); }, []);

  const formatTime = (date: Date) => date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const formatDate = (date: Date) => date.toLocaleDateString([], { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const formatLocalClock = (timeStr?: string | null, isoAt?: string | null): string => {
    if (isoAt) { const d = new Date(isoAt); return Number.isFinite(d.getTime()) ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--:--"; }
    return String(timeStr || "").trim() || "--:--";
  };

  const getDuration = () => {
    const entry = todayEntryData?.item;
    if (!entry?.clockInAt) return "--:--:--";
    const start = new Date(entry.clockInAt);
    const end = entry.clockOutAt ? new Date(entry.clockOutAt) : currentTime;
    const diff = Math.floor((end.getTime() - start.getTime()) / 1000);
    return `${Math.floor(diff / 3600).toString().padStart(2, "0")}:${Math.floor((diff % 3600) / 60).toString().padStart(2, "0")}:${(diff % 60).toString().padStart(2, "0")}`;
  };

  const timeEntry = todayEntryData?.item;
  const isClockedIn = Boolean(timeEntry?.clockInAt || timeEntry?.clockIn) && !Boolean(timeEntry?.clockOutAt || timeEntry?.clockOut);
  const isClockedOut = Boolean(timeEntry?.clockInAt || timeEntry?.clockIn) && Boolean(timeEntry?.clockOutAt || timeEntry?.clockOut);
  const isOnboardingApproved = (onboardingData?.item?.overallStatus || "not_started") === "approved";

  if (profileLoading || entryLoading || onboardingLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ marginTop: 12, color: COLORS.textMuted }}>Loading Workspace Details...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.headerTitle}>Attendance</Text>
          {profileData?.item?.name && <Text style={styles.subtext}>Welcome, {profileData.item.name}</Text>}
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={[styles.clockTimer, { color: COLORS.primary }]}>{formatTime(currentTime)}</Text>
          <Text style={styles.dateLabel}>{formatDate(currentTime)}</Text>
        </View>
      </View>

      {!isOnboardingApproved && (
        <View style={styles.warningBanner}>
          <Ionicons name="alert-circle" size={24} color={COLORS.primary} style={{ marginRight: 10 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.warningTitle}>Onboarding Required</Text>
            <Text style={styles.warningText}>Please complete your onboarding before clocking in.</Text>
          </View>
          <TouchableOpacity style={styles.warningActionBtn} onPress={() => navigation.navigate("profile")}>
            <Text style={{ color: COLORS.background, fontWeight: '700' }}>Complete</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={[styles.card, { borderLeftColor: COLORS.primary, borderLeftWidth: 4 }]}>
        <View style={styles.cardRow}>
          <View style={styles.iconCircleContainer}>
            <View style={[styles.iconCircle, { backgroundColor: COLORS.border }]}>
              <MaterialCommunityIcons name="clock-outline" size={28} color={COLORS.primary} />
            </View>
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.cardLabelText}>Current Status</Text>
              <Text style={styles.cardMainText}>{isClockedIn ? "Clocked In" : isClockedOut ? "Shift Complete" : "Not Clocked In"}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.metricsGrid}>
        <View style={styles.gridItem}><Ionicons name="log-in-outline" size={20} color={COLORS.primary} /><Text style={styles.gridLabel}>Clock In</Text><Text style={styles.gridValue}>{formatLocalClock(timeEntry?.clockIn, timeEntry?.clockInAt)}</Text></View>
        <View style={styles.gridItem}><Ionicons name="log-out-outline" size={20} color={COLORS.primary} /><Text style={styles.gridLabel}>Clock Out</Text><Text style={styles.gridValue}>{formatLocalClock(timeEntry?.clockOut, timeEntry?.clockOutAt)}</Text></View>
        <View style={styles.gridItem}><MaterialCommunityIcons name="timer-sand" size={20} color={COLORS.primary} /><Text style={styles.gridLabel}>Duration</Text><Text style={styles.gridValue}>{isClockedIn || isClockedOut ? getDuration() : "--:--:--"}</Text></View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionHeading}>Actions</Text>
        <View style={styles.buttonContainerRow}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.primary }, (isClockedIn || isClockedOut || clockInMutation.isLoading || !isOnboardingApproved) && { opacity: 0.5 }]} disabled={isClockedIn || isClockedOut || clockInMutation.isLoading || !isOnboardingApproved} onPress={() => clockInMutation.mutate()}>
            <Text style={{ color: COLORS.background, fontWeight: '700' }}>Clock In</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.border }, !isClockedIn && { opacity: 0.5 }]} disabled={!isClockedIn} onPress={() => setShowScrumModal(true)}>
            <Text style={{ color: COLORS.text, fontWeight: '700' }}>Clock Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.tableBlockHeader}>Attendance History</Text>
      <View style={styles.tableCard}>
        <View style={[styles.tableRow, { backgroundColor: COLORS.border }]}>
          <Text style={[styles.tableCell, { color: COLORS.text, fontWeight: 'bold' }]}>Date</Text>
          <Text style={[styles.tableCell, { color: COLORS.text, fontWeight: 'bold' }]}>In</Text>
          <Text style={[styles.tableCell, { color: COLORS.text, fontWeight: 'bold' }]}>Out</Text>
          <Text style={[styles.tableCell, { color: COLORS.text, fontWeight: 'bold' }]}>Hours</Text>
        </View>
        {historyData?.items?.map((item: any) => (
          <View key={item.id} style={styles.tableRow}>
            <Text style={styles.tableCell}>{new Date(item.date).toLocaleDateString([], { month: "short", day: "numeric" })}</Text>
            <Text style={styles.tableCell}>{formatLocalClock(item.clockIn, item.clockInAt)}</Text>
            <Text style={styles.tableCell}>{formatLocalClock(item.clockOut, item.clockOutAt)}</Text>
            <Text style={styles.tableCell}>{item.totalHours?.toFixed(2) || "0.00"}</Text>
          </View>
        ))}
      </View>

      <Modal visible={showScrumModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: 'bold' }}>End-of-Day Report</Text>
              <TouchableOpacity onPress={() => setShowScrumModal(false)}><Ionicons name="close" size={24} color={COLORS.text} /></TouchableOpacity>
            </View>
            <ScrollView style={{ padding: 16 }}>
              <Text style={{ color: COLORS.textMuted, marginBottom: 8 }}>Tasks Completed *</Text>
              <TextInput style={styles.textAreaInput} multiline numberOfLines={4} value={eodData.tasksCompleted} onChangeText={(txt) => setEodData(prev => ({ ...prev, tasksCompleted: txt }))} />
              <TouchableOpacity style={[styles.submitButton, { backgroundColor: COLORS.primary }]} onPress={() => clockOutMutation.mutate()}><Text style={{ color: COLORS.background, fontWeight: 'bold' }}>Submit & Clock Out</Text></TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.background },
  headerRow: { flexDirection: "row", justifyContent: "space-between", marginVertical: 14 },
  headerTitle: { fontSize: 24, fontWeight: "700", color: COLORS.text },
  clockTimer: { fontSize: 22, fontWeight: "700" },
  dateLabel: { fontSize: 12, color: COLORS.textMuted },
  subtext: { fontSize: 13, color: COLORS.textMuted },
  warningBanner: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.card, padding: 14, borderRadius: 8, marginVertical: 12, borderColor: COLORS.primary, borderWidth: 1 },
  warningTitle: { fontWeight: "700", color: COLORS.primary, fontSize: 14 },
  warningText: { fontSize: 13, color: COLORS.textMuted },
  warningActionBtn: { backgroundColor: COLORS.primary, padding: 8, borderRadius: 6 },
  card: { backgroundColor: COLORS.card, borderRadius: 10, padding: 16, marginVertical: 8, borderWidth: 1, borderColor: COLORS.border },
  cardRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  iconCircleContainer: { flexDirection: "row", alignItems: "center" },
  iconCircle: { width: 48, height: 48, borderRadius: 24, justifyContent: "center", alignItems: "center" },
  cardLabelText: { fontSize: 12, color: COLORS.textMuted },
  cardMainText: { fontSize: 18, fontWeight: "700", color: COLORS.text },
  metricsGrid: { flexDirection: "row", justifyContent: "space-between", marginVertical: 8 },
  gridItem: { flex: 1, backgroundColor: COLORS.card, marginHorizontal: 4, padding: 12, borderRadius: 8, alignItems: "center", borderWidth: 1, borderColor: COLORS.border },
  gridLabel: { fontSize: 11, color: COLORS.textMuted, marginVertical: 3 },
  gridValue: { fontSize: 15, fontWeight: "600", color: COLORS.text },
  sectionHeading: { fontSize: 16, fontWeight: "600", color: COLORS.text },
  buttonContainerRow: { flexDirection: "row", gap: 12 },
  actionBtn: { flex: 1, height: 46, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  tableBlockHeader: { fontSize: 16, fontWeight: "600", color: COLORS.text, marginTop: 18, marginBottom: 8 },
  tableCard: { backgroundColor: COLORS.card, borderRadius: 8, overflow: "hidden", borderWidth: 1, borderColor: COLORS.border },
  tableRow: { flexDirection: "row", padding: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tableCell: { flex: 1, fontSize: 13, color: COLORS.text, textAlign: "left" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)" },
  modalContent: { backgroundColor: COLORS.card, borderTopLeftRadius: 16, borderTopRightRadius: 16, marginTop: 100, flex: 1 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  textAreaInput: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 10, fontSize: 14, color: COLORS.text, textAlignVertical: "top", marginBottom: 12 },
  submitButton: { height: 48, borderRadius: 8, justifyContent: "center", alignItems: "center", marginTop: 16 },
});