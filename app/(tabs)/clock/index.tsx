import React, { useEffect, useState, useMemo } from "react";
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
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "@/contexts/ThemeContext";
import {
  getTodayTimeEntry,
  clockIn,
  submitScrumAndClockOut,
  getEmployeeTimeEntryHistory,
  getEmployeeProfile,
  submitEODReport,
  getOnboardingStatus,
} from "@/lib/admin/apiClient";
import { s, wp, hp, fs } from "@/util/styles";

export default function EmployeeClockedScreen() {
  const queryClient = useQueryClient();
  const navigation = useNavigation<any>();
  const { uiTheme } = useTheme();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [showScrumModal, setShowScrumModal] = useState(false);
  const [inputType] = useState<"text" | "voice">("text");
  const [eodData, setEodData] = useState({ tasksCompleted: "", issuesBlockers: "", notes: "" });

  const styles = useMemo(() => getThemedStyles(uiTheme), [uiTheme]);
  
  const isLightTheme = useMemo(() => {
    return uiTheme.theme?.includes("crystal") || uiTheme.panelColors?.dashboardTextColor === "#000000";
  }, [uiTheme]);

  const textColor = useMemo(() => {
    return uiTheme.panelColors?.dashboardTextColor || (isLightTheme ? "#0f172a" : "#ffffff");
  }, [uiTheme, isLightTheme]);

  const primaryColor = useMemo(() => {
    return uiTheme.customColors?.primary || "#ffd27a";
  }, [uiTheme]);

  const placeholderColor = useMemo(() => {
    return isLightTheme ? "#94a3b8" : "#71717a";
  }, [isLightTheme]);

  const { data: profileData, isLoading: profileLoading } = useQuery({ 
    queryKey: ["employeeProfile"], 
    queryFn: getEmployeeProfile 
  });
  
  const { data: todayEntryData, isLoading: entryLoading } = useQuery({ 
    queryKey: ["todayTimeEntry"], 
    queryFn: getTodayTimeEntry 
  });
  
  const { data: historyData, isLoading: historyLoading } = useQuery({ 
    queryKey: ["timeEntryHistory"], 
    queryFn: getEmployeeTimeEntryHistory 
  });
  
  const { data: onboardingData, isLoading: onboardingLoading } = useQuery({
    queryKey: ["onboardingStatus"],
    queryFn: () => getOnboardingStatus().catch(() => ({ item: { overallStatus: "completed", progress: 100 } })),
  });

  const clockInMutation = useMutation({
    mutationFn: clockIn,
    onSuccess: () => { 
      Alert.alert("Success", "Clocked in successfully"); 
      queryClient.invalidateQueries({ queryKey: ["todayTimeEntry"] }); 
      queryClient.invalidateQueries({ queryKey: ["timeEntryHistory"] }); 
    },
    onError: (err: any) => Alert.alert("Clock In Failed", err.message || "Something went wrong."),
  });

  const clockOutMutation = useMutation({
    mutationFn: async () => {
      const formattedRawInput = [
        `Tasks Completed: ${eodData.tasksCompleted.trim()}`,
        eodData.issuesBlockers.trim() ? `Issues & Blockers: ${eodData.issuesBlockers.trim()}` : "",
        eodData.notes.trim() ? `Notes: ${eodData.notes.trim()}` : ""
      ].filter(Boolean).join("\n");

      await submitEODReport({ 
        inputType, 
        rawInput: formattedRawInput
      });

      return submitScrumAndClockOut(JSON.stringify({ 
        tasksCompleted: eodData.tasksCompleted.trim(), 
        issuesBlockers: eodData.issuesBlockers.trim(), 
        notes: eodData.notes.trim() 
      }));
    },
    onSuccess: () => { 
      setShowScrumModal(false); 
      setEodData({ tasksCompleted: "", issuesBlockers: "", notes: "" }); 
      queryClient.invalidateQueries({ queryKey: ["todayTimeEntry"] }); 
      queryClient.invalidateQueries({ queryKey: ["timeEntryHistory"] }); 
    },
    onError: (err: any) => Alert.alert("Clock Out Failed", err.message || "Failed to submit logs."),
  });

  useEffect(() => { 
    const timer = setInterval(() => setCurrentTime(new Date()), 1000); 
    return () => clearInterval(timer); 
  }, []);

  const formatTime = (date: Date) => date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const formatDate = (date: Date) => date.toLocaleDateString([], { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  
  const formatLocalClock = (timeStr?: string | null, isoAt?: string | null): string => {
    if (isoAt) { 
      const d = new Date(isoAt); 
      return Number.isFinite(d.getTime()) ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--:--"; 
    }
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
  
  const onboardingStatus = onboardingData?.item?.overallStatus || "completed";
  const isOnboardingApproved = onboardingStatus === "approved" || onboardingStatus === "completed" || onboardingStatus === "submitted";

  if (profileLoading || entryLoading || onboardingLoading || historyLoading) {
    return (
      <View style={s(styles.center)}>
        <ActivityIndicator size="large" color={primaryColor} />
        <Text style={s(styles.loadingText)}>Loading Workspace Details...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={s(styles.container)} contentContainerStyle={s({ paddingBottom: hp(5) })} showsVerticalScrollIndicator={false}>
      <View style={s(styles.headerRow)}>
        <View>
          <Text style={s(styles.headerTitle)}>Attendance</Text>
          {profileData?.item?.name && <Text style={s(styles.subtext)}>Welcome, {profileData.item.name}</Text>}
        </View>
        <View style={s({ alignItems: "flex-end" })}>
          <Text style={s([styles.clockTimer, { color: primaryColor }])}>{formatTime(currentTime)}</Text>
          <Text style={s(styles.dateLabel)}>{formatDate(currentTime)}</Text>
        </View>
      </View>

      {!isOnboardingApproved && onboardingStatus !== "not_started" && (
        <View style={s(styles.warningBanner)}>
          <Ionicons name="alert-circle" size={fs(5)} color="#ef4444" style={s({ marginRight: wp(2.5) })} />
          <View style={s({ flex: 1 })}>
            <Text style={s(styles.warningTitle)}>Onboarding Required</Text>
            <Text style={s(styles.warningText)}>Please complete your onboarding setup configuration.</Text>
          </View>
          <TouchableOpacity style={s([styles.warningActionBtn, { backgroundColor: primaryColor }])} onPress={() => navigation.navigate("profile")}>
            <Text style={s([styles.btnDarkText, { color: isLightTheme ? "#ffffff" : "#09090b" }])}>Complete</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={s([styles.card, { borderLeftColor: primaryColor, borderLeftWidth: wp(1) }])}>
        <View style={s(styles.cardRow)}>
          <View style={s(styles.iconCircleContainer)}>
            <View style={s(styles.iconCircle)}>
              <MaterialCommunityIcons name="clock-outline" size={fs(5.5)} color={primaryColor} />
            </View>
            <View style={s({ marginLeft: wp(3) })}>
              <Text style={s(styles.cardLabelText)}>Current Status</Text>
              <Text style={s(styles.cardMainText)}>{isClockedIn ? "Clocked In" : isClockedOut ? "Shift Complete" : "Not Clocked In"}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={s(styles.metricsGrid)}>
        <View style={s(styles.gridItem)}>
          <Ionicons name="log-in-outline" size={fs(4.5)} color={primaryColor} />
          <Text style={s(styles.gridLabel)}>Clock In</Text>
          <Text style={s(styles.gridValue)}>{formatLocalClock(timeEntry?.clockIn, timeEntry?.clockInAt)}</Text>
        </View>
        <View style={s(styles.gridItem)}>
          <Ionicons name="log-out-outline" size={fs(4.5)} color={primaryColor} />
          <Text style={s(styles.gridLabel)}>Clock Out</Text>
          <Text style={s(styles.gridValue)}>{formatLocalClock(timeEntry?.clockOut, timeEntry?.clockOutAt)}</Text>
        </View>
        <View style={s(styles.gridItem)}>
          <MaterialCommunityIcons name="timer-sand" size={fs(4.5)} color={primaryColor} />
          <Text style={s(styles.gridLabel)}>Duration</Text>
          <Text style={s(styles.gridValue)}>{isClockedIn || isClockedOut ? getDuration() : "--:--:--"}</Text>
        </View>
      </View>

      <View style={s(styles.card)}>
        <Text style={s(styles.sectionHeading)}>Actions</Text>
        <View style={s(styles.buttonContainerRow)}>
          <TouchableOpacity 
            style={s([styles.actionBtn, { backgroundColor: primaryColor }, (isClockedIn || isClockedOut || clockInMutation.isPending) && { opacity: 0.4 }])} 
            disabled={isClockedIn || isClockedOut || clockInMutation.isPending} 
            onPress={() => clockInMutation.mutate()}
          >
            <Text style={s([styles.btnDarkText, { color: isLightTheme ? "#ffffff" : "#09090b" }])}>Clock In</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={s([styles.actionBtn, styles.btnSecondary, !isClockedIn && { opacity: 0.4 }])} 
            disabled={!isClockedIn} 
            onPress={() => setShowScrumModal(true)}
          >
            <Text style={s(styles.btnLightText)}>Clock Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={s(styles.tableBlockHeader)}>Attendance History</Text>
      <View style={s(styles.tableCard)}>
        <View style={s(styles.tableHeaderRow)}>
          <Text style={s(styles.tableHeaderCell)}>Date</Text>
          <Text style={s(styles.tableHeaderCell)}>In</Text>
          <Text style={s(styles.tableHeaderCell)}>Out</Text>
          <Text style={s(styles.tableHeaderCell)}>Hours</Text>
        </View>
        {historyData?.items?.map((item: any) => (
          <View key={item.id} style={s(styles.tableDataRow)}>
            <Text style={s(styles.tableCell)}>{new Date(item.date).toLocaleDateString([], { month: "short", day: "numeric" })}</Text>
            <Text style={s(styles.tableCell)}>{formatLocalClock(item.clockIn, item.clockInAt)}</Text>
            <Text style={s(styles.tableCell)}>{formatLocalClock(item.clockOut, item.clockOutAt)}</Text>
            <Text style={s(styles.tableCell)}>{item.totalHours?.toFixed(2) || "0.00"}</Text>
          </View>
        ))}
      </View>

      <Modal visible={showScrumModal} animationType="slide" transparent>
        <View style={s(styles.modalOverlay)}>
          <View style={s(styles.modalContent)}>
            <View style={s(styles.modalHeader)}>
              <Text style={s(styles.modalHeaderTitle)}>End-of-Day Report</Text>
              <TouchableOpacity onPress={() => setShowScrumModal(false)}>
                <Ionicons name="close" size={fs(5)} color={textColor} />
              </TouchableOpacity>
            </View>
            <ScrollView style={s({ padding: wp(4) })} contentContainerStyle={s({ paddingBottom: hp(5) })} showsVerticalScrollIndicator={false}>
              <Text style={s(styles.inputLabel)}>Tasks Completed *</Text>
              <TextInput 
                style={s(styles.textAreaInput)} 
                multiline 
                numberOfLines={4} 
                value={eodData.tasksCompleted} 
                placeholder="Enter completed operational targets..."
                placeholderTextColor={placeholderColor}
                onChangeText={(txt) => setEodData(prev => ({ ...prev, tasksCompleted: txt }))} 
              />
              
              <Text style={s(styles.inputLabel)}>Issues & Blockers</Text>
              <TextInput 
                style={s(styles.textAreaInput)} 
                multiline 
                numberOfLines={3} 
                value={eodData.issuesBlockers} 
                placeholder="List context roadblocks or execution bottlenecks..."
                placeholderTextColor={placeholderColor}
                onChangeText={(txt) => setEodData(prev => ({ ...prev, issuesBlockers: txt }))} 
              />
              
              <Text style={s(styles.inputLabel)}>Additional Notes</Text>
              <TextInput 
                style={s(styles.textAreaInput)} 
                multiline 
                numberOfLines={3} 
                value={eodData.notes} 
                placeholder="Optional notes or context overrides..."
                placeholderTextColor={placeholderColor}
                onChangeText={(txt) => setEodData(prev => ({ ...prev, notes: txt }))} 
              />

              <TouchableOpacity 
                style={s([styles.submitButton, { backgroundColor: primaryColor }, !eodData.tasksCompleted.trim() && { opacity: 0.4 }])} 
                disabled={!eodData.tasksCompleted.trim() || clockOutMutation.isPending}
                onPress={() => clockOutMutation.mutate()}
              >
                {clockOutMutation.isPending ? (
                  <ActivityIndicator size="small" color={isLightTheme ? "#ffffff" : "#09090b"} />
                ) : (
                  <Text style={s([styles.btnDarkText, { color: isLightTheme ? "#ffffff" : "#09090b" }])}>Submit & Clock Out</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const getThemedStyles = (uiTheme: any) => {
  const isLightTheme = uiTheme.theme?.includes("crystal") || uiTheme.panelColors?.dashboardTextColor === "#000000";
  const structuralBorderColor = isLightTheme ? "rgba(0, 0, 0, 0.08)" : "rgba(255, 255, 255, 0.08)";
  const surfaceAlphaColor = isLightTheme ? "rgba(0, 0, 0, 0.03)" : "rgba(255, 255, 255, 0.03)";
  
  const bg = uiTheme.panelColors?.dashboardBackground || (isLightTheme ? "#ffffff" : "#09090b");
  const cardBg = uiTheme.panelColors?.dashboardCardBackground || (isLightTheme ? "#f8fafc" : "#18181b");
  const textColor = uiTheme.panelColors?.dashboardTextColor || (isLightTheme ? "#0f172a" : "#ffffff");
  const mutedText = isLightTheme ? "#64748b" : "#a1a1aa";

  return StyleSheet.create({
    container: { 
      flex: 1, 
      backgroundColor: bg, 
      padding: wp(4) 
    },
    center: { 
      flex: 1, 
      justifyContent: "center", 
      alignItems: "center", 
      backgroundColor: bg 
    },
    loadingText: {
      marginTop: hp(1.5),
      color: mutedText,
      fontSize: fs(3.5),
    },
    headerRow: { 
      flexDirection: "row", 
      justifyContent: "space-between", 
      marginVertical: hp(1.8),
      alignItems: "center"
    },
    headerTitle: { 
      fontSize: fs(6), 
      fontWeight: "800", 
      color: textColor,
      letterSpacing: -0.5
    },
    clockTimer: { 
      fontSize: fs(5), 
      fontWeight: "700",
      letterSpacing: 0.5
    },
    dateLabel: { 
      fontSize: fs(3), 
      color: mutedText,
      marginTop: 2
    },
    subtext: { 
      fontSize: fs(3.2), 
      color: mutedText,
      marginTop: 2
    },
    warningBanner: { 
      flexDirection: "row", 
      alignItems: "center", 
      backgroundColor: cardBg, 
      padding: wp(3.5), 
      borderRadius: wp(2.5), 
      marginVertical: hp(1.5), 
      borderColor: "rgba(239, 68, 68, 0.3)", 
      borderWidth: 1 
    },
    warningTitle: { 
      fontWeight: "700", 
      color: "#ef4444", 
      fontSize: fs(3.5) 
    },
    warningText: { 
      fontSize: fs(3), 
      color: mutedText,
      marginTop: 1
    },
    warningActionBtn: { 
      paddingVertical: hp(0.8),
      paddingHorizontal: wp(3), 
      borderRadius: wp(1.5) 
    },
    card: { 
      backgroundColor: cardBg, 
      borderRadius: wp(3), 
      padding: wp(4), 
      marginVertical: hp(1), 
      borderWidth: 1, 
      borderColor: structuralBorderColor 
    },
    cardRow: { 
      flexDirection: "row", 
      justifyContent: "space-between", 
      alignItems: "center" 
    },
    iconCircleContainer: { 
      flexDirection: "row", 
      alignItems: "center" 
    },
    iconCircle: { 
      width: wp(11), 
      height: wp(11), 
      borderRadius: wp(5.5), 
      backgroundColor: surfaceAlphaColor,
      justifyContent: "center", 
      alignItems: "center",
      borderWidth: 1,
      borderColor: structuralBorderColor
    },
    cardLabelText: { 
      fontSize: fs(3), 
      color: mutedText 
    },
    cardMainText: { 
      fontSize: fs(4.2), 
      fontWeight: "700", 
      color: textColor,
      marginTop: 1
    },
    metricsGrid: { 
      flexDirection: "row", 
      justifyContent: "space-between", 
      marginVertical: hp(1),
      gap: wp(2)
    },
    gridItem: { 
      flex: 1, 
      backgroundColor: cardBg, 
      padding: wp(3), 
      borderRadius: wp(2.5), 
      alignItems: "center", 
      borderWidth: 1, 
      borderColor: structuralBorderColor 
    },
    gridLabel: { 
      fontSize: fs(2.8), 
      color: mutedText, 
      marginVertical: hp(0.5),
      fontWeight: "500"
    },
    gridValue: { 
      fontSize: fs(3.5), 
      fontWeight: "700", 
      color: textColor 
    },
    sectionHeading: { 
      fontSize: fs(3.8), 
      fontWeight: "700", 
      color: textColor,
      marginBottom: hp(1.5)
    },
    buttonContainerRow: { 
      flexDirection: "row", 
      gap: wp(3) 
    },
    actionBtn: { 
      flex: 1, 
      height: hp(5.5), 
      borderRadius: wp(2), 
      justifyContent: "center", 
      alignItems: "center" 
    },
    btnSecondary: {
      backgroundColor: surfaceAlphaColor,
      borderWidth: 1,
      borderColor: structuralBorderColor
    },
    btnDarkText: { 
      fontWeight: "700", 
      fontSize: fs(3.5) 
    },
    btnLightText: { 
      color: textColor, 
      fontWeight: "700",
      fontSize: fs(3.5)
    },
    tableBlockHeader: { 
      fontSize: fs(4), 
      fontWeight: "700", 
      color: textColor, 
      marginTop: hp(2.5), 
      marginBottom: hp(1.2) 
    },
    tableCard: { 
      backgroundColor: cardBg, 
      borderRadius: wp(2.5), 
      overflow: "hidden", 
      borderWidth: 1, 
      borderColor: structuralBorderColor 
    },
    tableHeaderRow: { 
      flexDirection: "row", 
      padding: wp(3), 
      backgroundColor: surfaceAlphaColor,
      borderBottomWidth: 1,
      borderBottomColor: structuralBorderColor
    },
    tableHeaderCell: { 
      flex: 1, 
      fontSize: fs(3.2), 
      color: textColor, 
      fontWeight: "700", 
      textAlign: "left" 
    },
    tableDataRow: { 
      flexDirection: "row", 
      padding: wp(3), 
      borderBottomWidth: 1, 
      borderBottomColor: structuralBorderColor 
    },
    tableCell: { 
      flex: 1, 
      fontSize: fs(3.2), 
      color: textColor, 
      opacity: 0.85,
      textAlign: "left" 
    },
    modalOverlay: { 
      flex: 1, 
      backgroundColor: "rgba(0,0,0,0.75)",
      justifyContent: "flex-end"
    },
    modalContent: { 
      backgroundColor: cardBg, 
      borderTopLeftRadius: wp(5), 
      borderTopRightRadius: wp(5), 
      height: "85%",
      borderWidth: 1,
      borderColor: structuralBorderColor
    },
    modalHeader: { 
      flexDirection: "row", 
      justifyContent: "space-between", 
      padding: wp(4.5), 
      borderBottomWidth: 1, 
      borderBottomColor: structuralBorderColor,
      alignItems: "center"
    },
    modalHeaderTitle: { 
      color: textColor, 
      fontSize: fs(4.5), 
      fontWeight: "800" 
    },
    inputLabel: {
      color: textColor,
      fontSize: fs(3.2),
      fontWeight: "600",
      marginBottom: hp(0.8),
      marginTop: hp(1)
    },
    textAreaInput: { 
      backgroundColor: bg, 
      borderWidth: 1, 
      borderColor: structuralBorderColor, 
      borderRadius: wp(2), 
      padding: wp(3), 
      fontSize: fs(3.5), 
      color: textColor, 
      textAlignVertical: "top", 
      marginBottom: hp(1.8),
      minHeight: hp(10)
    },
    submitButton: { 
      height: hp(5.8), 
      borderRadius: wp(2), 
      justifyContent: "center", 
      alignItems: "center", 
      marginTop: hp(1.5) 
    },
  });
};