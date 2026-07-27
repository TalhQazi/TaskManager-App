import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { Calendar, Plus, Trash2, ChevronDown } from "lucide-react-native";
import { createLeaveRequest, deleteLeaveRequest, getMyLeaveRequests } from "@/lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";
import { s, wp, hp, fs } from "@/util/styles";

type LeaveType = "pto" | "vacation" | "sick" | "holiday" | "unpaid" | "other";
type LeaveStatus = "pending" | "approved" | "rejected";

interface LeaveRequestItem {
  id: string;
  employeeName: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  status: LeaveStatus;
  reason?: string;
  exemptFromEOD?: boolean;
  createdAt?: string;
}

function toDateInputValue(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function StatusBadge({ status }: { status: LeaveStatus }) {
  if (status === "approved") {
    return (
      <View style={s([styles.badge, { backgroundColor: "rgba(34,197,94,0.15)", borderColor: "rgba(34,197,94,0.3)" }])}>
        <Text style={s([styles.badgeText, { color: "#22c55e" }])}>Approved</Text>
      </View>
    );
  }
  if (status === "rejected") {
    return (
      <View style={s([styles.badge, { backgroundColor: "rgba(239,68,68,0.15)", borderColor: "rgba(239,68,68,0.3)" }])}>
        <Text style={s([styles.badgeText, { color: "#ef4444" }])}>Rejected</Text>
      </View>
    );
  }
  return (
    <View style={s([styles.badge, { backgroundColor: "rgba(113,113,122,0.15)", borderColor: "rgba(113,113,122,0.3)" }])}>
      <Text style={s([styles.badgeText, { color: "#a1a1aa" }])}>Pending</Text>
    </View>
  );
}

export default function EmployeeLeaveRequestsScreen() {
  const { uiTheme } = useTheme();
  const today = useMemo(() => new Date(), []);
  
  const isLightTheme = useMemo(() => {
    return uiTheme.theme?.includes("crystal") || uiTheme.panelColors?.dashboardTextColor === "#000000";
  }, [uiTheme]);

  const bg = useMemo(() => uiTheme.panelColors?.dashboardBackground || (isLightTheme ? "#ffffff" : "#09090b"), [uiTheme, isLightTheme]);
  const cardBg = useMemo(() => uiTheme.panelColors?.dashboardCardBackground || (isLightTheme ? "#f8fafc" : "#18181b"), [uiTheme, isLightTheme]);
  const tintColor = useMemo(() => uiTheme.panelColors?.dashboardTextColor || (isLightTheme ? "#0f172a" : "#ffffff"), [uiTheme, isLightTheme]);
  const mutedText = useMemo(() => (isLightTheme ? "#64748b" : "#a1a1aa"), [isLightTheme]);
  const primaryColor = useMemo(() => uiTheme.customColors?.primary || "#3b82f6", [uiTheme]);
  const border = useMemo(() => (isLightTheme ? "rgba(0, 0, 0, 0.08)" : "rgba(255, 255, 255, 0.08)"), [isLightTheme]);
  const headerBg = useMemo(() => (isLightTheme ? "#f1f5f9" : "#1c1c1f"), [isLightTheme]);
  const inputBg = useMemo(() => (isLightTheme ? "#ffffff" : "#09090b"), [isLightTheme]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [items, setItems] = useState<LeaveRequestItem[]>([]);

  const [type, setType] = useState<LeaveType>("pto");
  const [startDate, setStartDate] = useState(toDateInputValue(today));
  const [endDate, setEndDate] = useState(toDateInputValue(today));
  const [reason, setReason] = useState("");
  const [showTypePicker, setShowTypePicker] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getMyLeaveRequests();
      setItems(res.items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onSubmit = async () => {
    if (!startDate || !endDate) {
      Alert.alert("Validation", "Please verify your start and end date periods are completed.");
      return;
    }
    try {
      setSubmitting(true);
      await createLeaveRequest({
        type,
        startDate,
        endDate,
        reason,
        exemptFromEOD: true,
      });
      Alert.alert("Success", "Leave request submitted successfully.");
      setReason("");
      await load();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = (id: string) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to withdraw and delete this pending request?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteLeaveRequest(id);
              await load();
            } catch (e) {
              console.error(e);
            }
          },
        },
      ]
    );
  };

  const formatLocaleDateStr = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  return (
    <SafeAreaView style={s([styles.container, { backgroundColor: bg }])}>
      <StatusBar barStyle={isLightTheme ? "dark-content" : "light-content"} backgroundColor={bg} />
      <ScrollView contentContainerStyle={s(styles.scrollContainer)} showsVerticalScrollIndicator={false}>
        
        <View style={s(styles.headerRow)}>
          <View style={s({ flex: 1 })}>
            <Text style={s([styles.mainHeading, { color: tintColor }])}>Leave Requests</Text>
            <Text style={s([styles.subHeading, { color: mutedText }])}>Request PTO/leave and track approval status.</Text>
          </View>
          <Calendar color={mutedText} size={fs(6)} />
        </View>

        <View style={s([styles.card, { backgroundColor: cardBg, borderColor: border }])}>
          <View style={s([styles.cardHeaderBar, { backgroundColor: headerBg, borderBottomColor: border }])}>
            <Plus color={tintColor} size={fs(4.5)} style={s({ marginRight: wp(2) })} />
            <View style={s({ flex: 1 })}>
              <Text style={s([styles.cardTitleText, { color: tintColor }])}>Create Request</Text>
              <Text style={s([styles.cardDescriptionText, { color: mutedText }])}>Submit a new leave request (admin will approve/reject).</Text>
            </View>
          </View>

          <View style={s(styles.cardContent)}>
            <View style={s(styles.formGroup)}>
              <Text style={s([styles.formLabel, { color: tintColor }])}>Type</Text>
              <TouchableOpacity
                activeOpacity={0.8}
                style={s([styles.customPickerTrigger, { backgroundColor: inputBg, borderColor: border }])}
                onPress={() => setShowTypePicker(true)}
              >
                <Text style={s([styles.pickerValueText, { color: tintColor }])}>{type.toUpperCase()}</Text>
                <ChevronDown color={mutedText} size={fs(4)} />
              </TouchableOpacity>
            </View>

            <View style={s(styles.gridRow)}>
              <View style={s([styles.formGroup, { flex: 1 }])}>
                <Text style={s([styles.formLabel, { color: tintColor }])}>Start Date</Text>
                <TextInput
                  style={s([styles.textInput, { backgroundColor: inputBg, borderColor: border, color: tintColor }])}
                  value={startDate}
                  onChangeText={setStartDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={mutedText}
                />
              </View>

              <View style={s([styles.formGroup, { flex: 1 }])}>
                <Text style={s([styles.formLabel, { color: tintColor }])}>End Date</Text>
                <TextInput
                  style={s([styles.textInput, { backgroundColor: inputBg, borderColor: border, color: tintColor }])}
                  value={endDate}
                  onChangeText={setEndDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={mutedText}
                />
              </View>
            </View>

            <View style={s(styles.formGroup)}>
              <Text style={s([styles.formLabel, { color: tintColor }])}>Reason (optional)</Text>
              <TextInput
                style={s([styles.textInput, styles.textAreaInput, { backgroundColor: inputBg, borderColor: border, color: tintColor }])}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                value={reason}
                onChangeText={setReason}
                placeholder="Write your primary structural context reason here..."
                placeholderTextColor={mutedText}
              />
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              style={s([styles.primarySubmitBtn, { backgroundColor: primaryColor }, submitting && styles.disabledBtn])}
              disabled={submitting}
              onPress={onSubmit}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={s(styles.submitBtnText)}>Submit Request</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={s([styles.card, { backgroundColor: cardBg, borderColor: border }])}>
          <View style={s([styles.cardHeaderBar, { backgroundColor: headerBg, borderBottomColor: border }])}>
            <View>
              <Text style={s([styles.cardTitleText, { color: tintColor }])}>My Requests</Text>
              <Text style={s([styles.cardDescriptionText, { color: mutedText }])}>Pending requests can be deleted before approval.</Text>
            </View>
          </View>

          <View style={s([styles.cardContent, { padding: wp(3) }])}>
            {loading ? (
              <ActivityIndicator size="small" color={primaryColor} style={s({ marginVertical: hp(2.5) })} />
            ) : items.length === 0 ? (
              <Text style={s([styles.emptyStateText, { color: mutedText }])}>No leave requests filed yet.</Text>
            ) : (
              <View style={s({ gap: hp(1.2) })}>
                {items.map((r) => (
                  <View key={r.id} style={s([styles.requestItemRow, { backgroundColor: inputBg, borderColor: border }])}>
                    <View style={s({ flex: 1, gap: hp(0.5) })}>
                      <View style={s({ flexDirection: "row", alignItems: "center", gap: wp(1.5), flexWrap: "wrap" })}>
                        <Text style={s([styles.requestTypeName, { color: tintColor }])}>{r.type}</Text>
                        <StatusBadge status={r.status} />
                        {r.exemptFromEOD ? (
                          <View style={s([styles.badge, styles.outlineBadge, { borderColor: border }])}>
                            <Text style={s([styles.outlineBadgeText, { color: mutedText }])}>EOD Exempt</Text>
                          </View>
                        ) : null}
                      </View>
                      
                      <Text style={s([styles.requestTimeText, { color: mutedText }])}>
                        {formatLocaleDateStr(r.startDate)} - {formatLocaleDateStr(r.endDate)}
                      </Text>
                      
                      {r.reason ? <Text style={s([styles.requestReasonText, { color: tintColor }])}>{r.reason}</Text> : null}
                    </View>

                    {r.status === "pending" ? (
                      <TouchableOpacity
                        activeOpacity={0.7}
                        style={s([styles.deleteActionButton, { backgroundColor: cardBg, borderColor: border }])}
                        onPress={() => onDelete(r.id)}
                      >
                        <Trash2 color="#ef4444" size={fs(3.5)} style={s({ marginRight: wp(1) })} />
                        <Text style={s(styles.deleteBtnText)}>Delete</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

      </ScrollView>

      <Modal visible={showTypePicker} transparent animationType="slide">
        <TouchableOpacity 
          style={s(styles.modalOverlay)} 
          activeOpacity={1} 
          onPress={() => setShowTypePicker(false)}
        >
          <View style={s([styles.bottomSheetContainer, { backgroundColor: cardBg, borderTopColor: border }])}>
            <Text style={s([styles.sheetHeading, { color: tintColor }])}>Select Leave Category Type</Text>
            {([
              { key: "pto", label: "Paid Time Off (PTO)" },
              { key: "vacation", label: "Vacation Leave" },
              { key: "sick", label: "Sick Leave" },
              { key: "holiday", label: "Holiday Exemption" },
              { key: "unpaid", label: "Unpaid Leave" },
              { key: "other", label: "Other Reasons" },
            ] as const).map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={s([styles.sheetItem, { borderBottomColor: border }, type === opt.key && { backgroundColor: inputBg }])}
                onPress={() => {
                  setType(opt.key);
                  setShowTypePicker(false);
                }}
              >
                <Text style={s([styles.sheetItemText, { color: mutedText }, type === opt.key && { color: primaryColor, fontWeight: "600" }])}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContainer: { paddingHorizontal: wp(4), paddingTop: hp(2.5), paddingBottom: hp(5) },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: hp(2.5), gap: wp(3) },
  mainHeading: { fontSize: fs(5.8), fontWeight: "bold", letterSpacing: -0.5 },
  subHeading: { fontSize: fs(3.2), marginTop: hp(0.5) },
  card: { borderWidth: 1, borderRadius: wp(3), marginBottom: hp(2), overflow: "hidden" },
  cardHeaderBar: { padding: wp(4), borderBottomWidth: 1, flexDirection: "row", alignItems: "flex-start" },
  cardTitleText: { fontSize: fs(3.8), fontWeight: "600" },
  cardDescriptionText: { fontSize: fs(3), marginTop: hp(0.3), maxWidth: "95%" },
  cardContent: { padding: wp(4) },
  formGroup: { marginBottom: hp(1.8), gap: hp(0.8) },
  gridRow: { flexDirection: "row", gap: wp(3) },
  formLabel: { fontSize: fs(3.2), fontWeight: "500" },
  customPickerTrigger: { height: hp(5.2), borderWidth: 1, borderRadius: wp(1.5), paddingHorizontal: wp(3), flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pickerValueText: { fontSize: fs(3.2), fontWeight: "600" },
  textInput: { height: hp(5.2), borderWidth: 1, borderRadius: wp(1.5), paddingHorizontal: wp(3), fontSize: fs(3.2) },
  textAreaInput: { height: hp(10), paddingTop: hp(1.2), paddingBottom: hp(1.2) },
  primarySubmitBtn: { height: hp(5.5), borderRadius: wp(1.5), alignItems: "center", justifyContent: "center", marginTop: hp(0.5) },
  submitBtnText: { color: "#ffffff", fontSize: fs(3.5), fontWeight: "600" },
  disabledBtn: { opacity: 0.5 },
  emptyStateText: { fontSize: fs(3.2), textAlign: "center", paddingVertical: hp(2) },
  requestItemRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: wp(3), borderWidth: 1, borderRadius: wp(2), gap: wp(3) },
  requestTypeName: { fontSize: fs(3.5), fontWeight: "600", textTransform: "capitalize" },
  requestTimeText: { fontSize: fs(3) },
  requestReasonText: { fontSize: fs(3.2), marginTop: hp(0.3) },
  badge: { paddingHorizontal: wp(2), paddingVertical: hp(0.3), borderRadius: wp(1), borderWidth: 1, justifyContent: "center", alignItems: "center" },
  badgeText: { fontSize: fs(2.5), fontWeight: "700", textTransform: "uppercase" },
  outlineBadge: { backgroundColor: "transparent" },
  outlineBadgeText: { fontSize: fs(2.5), fontWeight: "600" },
  deleteActionButton: { flexDirection: "row", alignItems: "center", height: hp(4), paddingHorizontal: wp(2.5), borderWidth: 1, borderRadius: wp(1.5) },
  deleteBtnText: { color: "#ef4444", fontSize: fs(3), fontWeight: "500" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  bottomSheetContainer: { borderTopLeftRadius: wp(3.5), borderTopRightRadius: wp(3.5), padding: wp(5), borderTopWidth: 1 },
  sheetHeading: { fontSize: fs(3.8), fontWeight: "600", marginBottom: hp(1.5) },
  sheetItem: { paddingVertical: hp(1.8), borderBottomWidth: 1 },
  sheetItemText: { fontSize: fs(3.5) },
});