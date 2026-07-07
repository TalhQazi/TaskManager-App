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
} from "react-native";
import { Calendar, Plus, Trash2, ChevronDown } from "lucide-react-native";

// --- API & State Toast Imports ---
// Replace paths with your exact workspace directory layout structures
import { createLeaveRequest, deleteLeaveRequest, getMyLeaveRequests } from "@/lib/admin/apiClient";

type LeaveType = "pto" | "vacation" | "sick" | "holiday" | "unpaid" | "other";
type LeaveStatus = "pending" | "approved" | "rejected";

type LeaveRequestItem = {
  id: string;
  employeeName: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  status: LeaveStatus;
  reason?: string;
  exemptFromEOD?: boolean;
  createdAt?: string;
};

function toDateInputValue(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// --- Native Render Badge Layout Component ---
function StatusBadge({ status }: { status: LeaveStatus }) {
  if (status === "approved") {
    return (
      <View style={[styles.badge, { backgroundColor: "#16a34a30", borderColor: "#16a34a60" }]}>
        <Text style={[styles.badgeText, { color: "#4ade80" }]}>Approved</Text>
      </View>
    );
  }
  if (status === "rejected") {
    return (
      <View style={[styles.badge, { backgroundColor: "#dc262630", borderColor: "#dc262660" }]}>
        <Text style={[styles.badgeText, { color: "#f87171" }]}>Rejected</Text>
      </View>
    );
  }
  return (
    <View style={[styles.badge, { backgroundColor: "#27272a50", borderColor: "#3f3f46" }]}>
      <Text style={[styles.badgeText, { color: "#a1a1aa" }]}>Pending</Text>
    </View>
  );
}

export default function EmployeeLeaveRequestsScreen() {
  const today = useMemo(() => new Date(), []);
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
     // Alert.alert("Error", e instanceof Error ? e.message : "Failed to load leave requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
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
     // Alert.alert("Error", e instanceof Error ? e.message : "Failed to submit leave request");
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
             // Alert.alert("Error", e instanceof Error ? e.message : "Failed to delete leave request");
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
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* Screen Header Title Segment */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.mainHeading}>Leave Requests</Text>
            <Text style={styles.subHeading}>Request PTO/leave and track approval status.</Text>
          </View>
          <Calendar color="#a1a1aa" size={24} />
        </View>

        {/* Create Request Module Card Form */}
        <View style={styles.card}>
          <View style={styles.cardHeaderBar}>
            <Plus color="#ffffff" size={18} style={{ marginRight: 8 }} />
            <View>
              <Text style={styles.cardTitleText}>Create Request</Text>
              <Text style={styles.cardDescriptionText}>Submit a new leave request (admin will approve/reject).</Text>
            </View>
          </View>

          <View style={styles.cardContent}>
            
            {/* Custom Dropdown Picker Element */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Type</Text>
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.customPickerTrigger}
                onPress={() => setShowTypePicker(true)}
              >
                <Text style={styles.pickerValueText}>{type.toUpperCase()}</Text>
                <ChevronDown color="#71717a" size={16} />
              </TouchableOpacity>
            </View>

            {/* Date Range Inputs */}
            <View style={styles.gridRow}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>Start Date</Text>
                <TextInput
                  style={styles.textInput}
                  value={startDate}
                  onChangeText={setStartDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#71717a"
                />
              </View>

              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>End Date</Text>
                <TextInput
                  style={styles.textInput}
                  value={endDate}
                  onChangeText={setEndDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#71717a"
                />
              </View>
            </View>

            {/* Optional Reason Context Textarea */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Reason (optional)</Text>
              <TextInput
                style={[styles.textInput, styles.textAreaInput]}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                value={reason}
                onChangeText={setReason}
                placeholder="Write your primary structural context reason here..."
                placeholderTextColor="#71717a"
              />
            </View>

            {/* Submit Control Action Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.primarySubmitBtn, submitting && styles.disabledBtn]}
              disabled={submitting}
              onPress={onSubmit}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.submitBtnText}>Submit Request</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Existing Leave Requests Log Module */}
        <View style={styles.card}>
          <View style={styles.cardHeaderBar}>
            <View>
              <Text style={styles.cardTitleText}>My Requests</Text>
              <Text style={styles.cardDescriptionText}>Pending requests can be deleted before approval.</Text>
            </View>
          </View>

          <View style={[styles.cardContent, { padding: 12 }]}>
            {loading ? (
              <ActivityIndicator size="small" color="#3b82f6" style={{ marginVertical: 20 }} />
            ) : items.length === 0 ? (
              <Text style={styles.emptyStateText}>No leave requests filed yet.</Text>
            ) : (
              <View style={{ gap: 10 }}>
                {items.map((r) => (
                  <View key={r.id} style={styles.requestItemRow}>
                    <View style={{ flex: 1, gap: 4 }}>
                      <div style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <Text style={styles.requestTypeName}>{r.type}</Text>
                        <StatusBadge status={r.status} />
                        {r.exemptFromEOD && (
                          <View style={[styles.badge, styles.outlineBadge]}>
                            <Text style={styles.outlineBadgeText}>EOD Exempt</Text>
                          </View>
                        )}
                      </div>
                      
                      <Text style={styles.requestTimeText}>
                        {formatLocaleDateStr(r.startDate)} - {formatLocaleDateStr(r.endDate)}
                      </Text>
                      
                      {r.reason ? <Text style={styles.requestReasonText}>{r.reason}</Text> : null}
                    </View>

                    {r.status === "pending" && (
                      <TouchableOpacity
                        activeOpacity={0.7}
                        style={styles.deleteActionButton}
                        onPress={() => onDelete(r.id)}
                      >
                        <Trash2 color="#f87171" size={15} style={{ marginRight: 4 }} />
                        <Text style={styles.deleteBtnText}>Delete</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

      </ScrollView>

      {/* Type Picker Bottom Action Sheet Overlay */}
      <Modal visible={showTypePicker} transparent animationType="slide">
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowTypePicker(false)}
        >
          <View style={styles.bottomSheetContainer}>
            <Text style={styles.sheetHeading}>Select Leave Category Type</Text>
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
                style={[styles.sheetItem, type === opt.key && styles.activeSheetItem]}
                onPress={() => {
                  setType(opt.key);
                  setShowTypePicker(false);
                }}
              >
                <Text style={[styles.sheetItemText, type === opt.key && styles.activeSheetItemText]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// --- Matte Deep Dark Structural Layout Stylesheet Configuration ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#09090b" },
  scrollContainer: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 40 },
  
  // Header Elements Configuration Styles 
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, gap: 12 },
  mainHeading: { color: "#ffffff", fontSize: 24, fontWeight: "bold", letterSpacing: -0.5 },
  subHeading: { color: "#a1a1aa", fontSize: 13, marginTop: 4 },

  // Base Structural Atomic Components Cards Architecture 
  card: { backgroundColor: "#18181b", borderColor: "#27272a", borderWidth: 1, borderRadius: 12, marginBottom: 16, overflow: "hidden" },
  cardHeaderBar: { padding: 16, backgroundColor: "#1c1c1f", borderBottomWidth: 1, borderBottomColor: "#27272a", flexDirection: "row", alignItems: "flex-start" },
  cardTitleText: { color: "#ffffff", fontSize: 15, fontWeight: "600" },
  cardDescriptionText: { color: "#a1a1aa", fontSize: 12, marginTop: 2, maxWidth: "95%" },
  cardContent: { padding: 16 },

  // Form Field Component Layout Grid Rules 
  formGroup: { marginBottom: 14, gap: 6 },
  gridRow: { flexDirection: "row", gap: 12 },
  formLabel: { color: "#e4e4e7", fontSize: 13, fontWeight: "500" },
  
  // Custom Selector Dropdown Replacement components 
  customPickerTrigger: { height: 42, backgroundColor: "#09090b", borderColor: "#27272a", borderWidth: 1, borderRadius: 6, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pickerValueText: { color: "#ffffff", fontSize: 13, fontWeight: "600" },

  // Native Inputs Base Styling Definitions 
  textInput: { height: 42, backgroundColor: "#09090b", borderColor: "#27272a", borderWidth: 1, borderRadius: 6, paddingHorizontal: 12, color: "#ffffff", fontSize: 13 },
  textAreaInput: { height: 80, paddingTop: 10, paddingBottom: 10 },

  // Form Button Actions 
  primarySubmitBtn: { height: 44, backgroundColor: "#3b82f6", borderRadius: 6, alignItems: "center", justifyContent: "center", marginTop: 4 },
  submitBtnText: { color: "#ffffff", fontSize: 14, fontWeight: "600" },
  disabledBtn: { opacity: 0.5 },

  // Requests Feed Components Rows Layout mapping 
  emptyStateText: { color: "#71717a", fontSize: 13, textAlign: "center", paddingVertical: 16 },
  requestItemRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 12, borderColor: "#27272a", borderWidth: 1, borderRadius: 8, backgroundColor: "#1c1c1f", gap: 12 },
  requestTypeName: { color: "#ffffff", fontSize: 14, fontWeight: "600", textTransform: "capitalize" },
  requestTimeText: { color: "#71717a", fontSize: 12 },
  requestReasonText: { color: "#e4e4e7", fontSize: 13, marginTop: 2 },
  
  // Atomic Native Badge Layout Structures 
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, borderWidth: 1, justifyContent: "center", alignItems: "center" },
  badgeText: { fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  outlineBadge: { borderColor: "#27272a", backgroundColor: "transparent" },
  outlineBadgeText: { color: "#a1a1aa", fontSize: 10, fontWeight: "600" },

  // Destructive Delete Actions Button Component 
  deleteActionButton: { flexDirection: "row", alignItems: "center", height: 32, paddingHorizontal: 10, borderColor: "#27272a", borderWidth: 1, borderRadius: 6, backgroundColor: "#09090b" },
  deleteBtnText: { color: "#f87171", fontSize: 12, fontWeight: "500" },

  // Native Picker Bottom Sheets Modal Fallbacks
  modalOverlay: { flex: 1, backgroundColor: "#00000060", justifyContent: "flex-end" },
  bottomSheetContainer: { backgroundColor: "#18181b", borderTopLeftRadius: 14, borderTopRightRadius: 14, padding: 20, borderTopWidth: 1, borderTopColor: "#27272a" },
  sheetHeading: { color: "#ffffff", fontSize: 15, fontWeight: "600", marginBottom: 12 },
  sheetItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#27272a" },
  activeSheetItem: { backgroundColor: "#1c1c1f" },
  sheetItemText: { color: "#a1a1aa", fontSize: 14 },
  activeSheetItemText: { color: "#3b82f6", fontWeight: "600" },
});