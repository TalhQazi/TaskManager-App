import React, { useMemo, useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/admin/apiClient";

/* ── Interfaces & Normalization ──────────────────────────────────── */
interface DoNotHireEntry {
  id: string;
  fullName: string;
  phone?: string;
  email?: string;
  reason: string;
  incidentNotes: string;
  createdAt: string;
}

type DoNotHireApi = Omit<DoNotHireEntry, "id"> & {
  _id: string;
};

function normalizeEntry(e: DoNotHireApi): DoNotHireEntry {
  return {
    id: e._id,
    fullName: e.fullName,
    phone: e.phone,
    email: e.email,
    reason: e.reason,
    incidentNotes: e.incidentNotes,
    createdAt: e.createdAt,
  };
}

/* ── Zod Validation Schema ───────────────────────────────────────── */
const schema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  reason: z.string().min(1, "Reason is required"),
  incidentNotes: z.string().min(1, "Incident notes are required"),
});

type Values = z.infer<typeof schema>;

interface DoNotHireProps {
  initialViewId?: string;
}

export default function DoNotHire({ initialViewId }: DoNotHireProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selected, setSelected] = useState<DoNotHireEntry | null>(null);
  const queryClient = useQueryClient();

  const entriesQuery = useQuery({
    queryKey: ["do-not-hire"],
    queryFn: async () => {
      const res = await apiFetch<{ items: DoNotHireApi[] }>("/api/do-not-hire");
      return res.items.map(normalizeEntry);
    },
  });

  const createEntryMutation = useMutation({
    mutationFn: async (payload: Omit<DoNotHireEntry, "id">) => {
      const res = await apiFetch<{ item: DoNotHireApi }>("/api/do-not-hire", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      return normalizeEntry(res.item);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["do-not-hire"] });
    },
  });

  const entries = entriesQuery.data ?? [];

  useEffect(() => {
    if (!initialViewId || viewOpen || open) return;
    const match = entries.find((e) => String(e.id) === initialViewId.trim());
    if (!match) return;

    setSelected(match);
    setViewOpen(true);
  }, [entries, initialViewId, viewOpen, open]);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: "",
      phone: "",
      email: "",
      reason: "",
      incidentNotes: "",
    },
  });

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => {
      return (
        e.fullName.toLowerCase().includes(q) ||
        (e.phone ?? "").toLowerCase().includes(q) ||
        (e.email ?? "").toLowerCase().includes(q) ||
        e.reason.toLowerCase().includes(q)
      );
    });
  }, [entries, searchQuery]);

  const onSubmit = (values: Values) => {
    const now = new Date();
    const payload: Omit<DoNotHireEntry, "id"> = {
      fullName: values.fullName,
      phone: values.phone?.trim() ? values.phone.trim() : undefined,
      email: values.email?.trim() ? values.email.trim() : undefined,
      reason: values.reason,
      incidentNotes: values.incidentNotes,
      createdAt: now.toISOString().slice(0, 10),
    };

    createEntryMutation.mutate(payload, {
      onSuccess: () => {
        setOpen(false);
        form.reset();
        Alert.alert("Entry added", "Do Not Hire record has been saved.");
      },
      onError: (err) => {
        Alert.alert(
          "Failed to add entry",
          err instanceof Error ? err.message : "Something went wrong"
        );
      },
    });
  };

  return (
    <ScrollView style={styles.appContainer} contentContainerStyle={styles.scrollContent}>
      
      {/* ── Header ── */}
      <View style={styles.headerContainer}>
        <View style={styles.headerTextWrapper}>
          <Text style={styles.headerTitle}>Do Not Hire List</Text>
          <Text style={styles.headerSubtitle}>Track and review restricted candidates</Text>
        </View>
        <TouchableOpacity style={styles.addNewButtonTrigger} onPress={() => setOpen(true)}>
          <Feather name="plus" size={16} color="#fff" />
          <Text style={styles.addNewButtonTriggerText}>Add Entry</Text>
        </TouchableOpacity>
      </View>

      {/* ── Search Bar ── */}
      <View style={styles.searchBarContainerFrame}>
        <Feather name="search" size={16} color="#64748b" style={styles.searchIconLayout} />
        <TextInput
          placeholder="Search name, phone, email, or reason..."
          placeholderTextColor="#64748b"
          style={styles.searchTextInputElement}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* ── Main Feed ── */}
      <View style={styles.mainFeedCardContainer}>
        {entriesQuery.isLoading ? (
          <View style={styles.statusFeedbackContainer}>
            <ActivityIndicator size="small" color="#ef4444" />
            <Text style={styles.statusFeedbackText}>Loading entries...</Text>
          </View>
        ) : entriesQuery.isError ? (
          <View style={styles.statusFeedbackContainer}>
            <Feather name="alert-triangle" size={18} color="#ef4444" />
            <Text style={[styles.statusFeedbackText, styles.errorTextColored]}>
              {entriesQuery.error instanceof Error ? entriesQuery.error.message : "Failed to load entries"}
            </Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyStateContainerFrame}>
            <View style={styles.emptyIconCircleWrapper}>
              <Feather name="user-x" size={28} color="#f87171" />
            </View>
            <Text style={styles.emptyStateTitleText}>No entries found</Text>
            <Text style={styles.emptyStateBodyText}>
              {searchQuery ? "Try adjusting your query filter parameters." : "Get started by adding your first record entry."}
            </Text>
            {!searchQuery && (
              <TouchableOpacity style={styles.emptyStateActionBtn} onPress={() => setOpen(true)}>
                <Feather name="plus" size={14} color="#fff" />
                <Text style={styles.emptyStateActionBtnText}>Add Record Entry</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.cardsNativeListWrapper}>
            {filtered.map((entry) => (
              <TouchableOpacity
                key={entry.id}
                style={styles.entryDataRowCardNode}
                onPress={() => {
                  setSelected(entry);
                  setViewOpen(true);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.cardHeaderRowInline}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.candidateNameHeadlineText}>{entry.fullName}</Text>
                    <Text style={styles.candidateReasonExcerptText} numberOfLines={1}>
                      Reason: {entry.reason}
                    </Text>
                  </View>
                  <Text style={styles.cardTimestampText}>
                    {new Date(entry.createdAt).toLocaleDateString()}
                  </Text>
                </View>

                <Text style={styles.cardNotesExcerptBlock} numberOfLines={1}>
                  {entry.incidentNotes}
                </Text>

                <View style={styles.cardMetaContactsFooterTrack}>
                  <View style={styles.metaBadgeContactItem}>
                    <Feather name="phone" size={11} color="#94a3b8" />
                    <Text style={styles.metaBadgeContactItemText} numberOfLines={1}>
                      {entry.phone?.trim() || "—"}
                    </Text>
                  </View>
                  <View style={styles.metaBadgeContactItem}>
                    <Feather name="mail" size={11} color="#94a3b8" />
                    <Text style={styles.metaBadgeContactItemText} numberOfLines={1}>
                      {entry.email?.trim() || "—"}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* ── Stats Metric Footer ── */}
      {filtered.length > 0 && (
        <View style={styles.statsPanelFooterRow}>
          <Text style={styles.statsCountDisplayLabel}>
            Showing {filtered.length} of {entries.length} entries
          </Text>
          <View style={styles.statsIndicatorStatusBadgeRow}>
            <View style={styles.redPulseDotMarkerIndicator} />
            <Text style={styles.statsCountDisplayLabel}>Restricted candidates</Text>
          </View>
        </View>
      )}

      {/* ── Modal: Add Entry Form ── */}
      <Modal visible={open} animationType="slide" transparent>
        <View style={styles.modalOverlayScrimContainer}>
          <View style={styles.modalScrollableWindowBodyContainer}>
            
            {/* Top Right Close 'X' Button */}
            <TouchableOpacity style={styles.modalTopRightCloseButton} onPress={() => setOpen(false)}>
              <Feather name="x" size={20} color="#94a3b8" />
            </TouchableOpacity>

            <ScrollView contentContainerStyle={styles.modalFormContentLayoutView}>
              <View style={styles.modalHeaderTitleBlockRow}>
                <View style={styles.modalHeaderFlexHeadlineRow}>
                  <Feather name="user-x" size={18} color="#ef4444" />
                  <Text style={styles.modalTitleHeadlineLabelText}>Add Do Not Hire Entry</Text>
                </View>
                <Text style={styles.modalSubtitleDescriptionText}>
                  Save an incident record block to prevent future hiring pipelines.
                </Text>
              </View>

              <View style={styles.formInputFieldsVerticalStack}>
                {/* Full Name */}
                <View style={styles.formFieldBlockControlItem}>
                  <Text style={styles.formFieldLabelText}>Full Name</Text>
                  <Controller
                    control={form.control}
                    name="fullName"
                    render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                      <>
                        <TextInput
                          style={[styles.formBaseTextInputField, error && styles.formFieldErrorBorderHighlight]}
                          placeholder="Candidate complete name"
                          placeholderTextColor="#475569"
                          onBlur={onBlur}
                          onChangeText={onChange}
                          value={value}
                        />
                        {error && <Text style={styles.fieldValidationErrorMessageText}>{error.message}</Text>}
                      </>
                    )}
                  />
                </View>

                {/* Phone */}
                <View style={styles.formFieldBlockControlItem}>
                  <Text style={styles.formFieldLabelText}>Phone</Text>
                  <Controller
                    control={form.control}
                    name="phone"
                    render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                      <>
                        <TextInput
                          style={[styles.formBaseTextInputField, error && styles.formFieldErrorBorderHighlight]}
                          placeholder="Optional contact string"
                          placeholderTextColor="#475569"
                          keyboardType="phone-pad"
                          onBlur={onBlur}
                          onChangeText={onChange}
                          value={value}
                        />
                        {error && <Text style={styles.fieldValidationErrorMessageText}>{error.message}</Text>}
                      </>
                    )}
                  />
                </View>

                {/* Email */}
                <View style={styles.formFieldBlockControlItem}>
                  <Text style={styles.formFieldLabelText}>Email</Text>
                  <Controller
                    control={form.control}
                    name="email"
                    render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                      <>
                        <TextInput
                          style={[styles.formBaseTextInputField, error && styles.formFieldErrorBorderHighlight]}
                          placeholder="Optional candidate email address"
                          placeholderTextColor="#475569"
                          keyboardType="email-address"
                          autoCapitalize="none"
                          onBlur={onBlur}
                          onChangeText={onChange}
                          value={value}
                        />
                        {error && <Text style={styles.fieldValidationErrorMessageText}>{error.message}</Text>}
                      </>
                    )}
                  />
                </View>

                {/* Reason */}
                <View style={styles.formFieldBlockControlItem}>
                  <Text style={styles.formFieldLabelText}>Reason Tag</Text>
                  <Controller
                    control={form.control}
                    name="reason"
                    render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                      <>
                        <TextInput
                          style={[styles.formBaseTextInputField, error && styles.formFieldErrorBorderHighlight]}
                          placeholder="Why is this candidate restricted?"
                          placeholderTextColor="#475569"
                          onBlur={onBlur}
                          onChangeText={onChange}
                          value={value}
                        />
                        {error && <Text style={styles.fieldValidationErrorMessageText}>{error.message}</Text>}
                      </>
                    )}
                  />
                </View>

                {/* Incident Notes */}
                <View style={styles.formFieldBlockControlItem}>
                  <Text style={styles.formFieldLabelText}>Incident Narrative Notes</Text>
                  <Controller
                    control={form.control}
                    name="incidentNotes"
                    render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                      <>
                        <TextInput
                          style={[styles.formBaseTextInputField, styles.formTextAreaInputElement, error && styles.formFieldErrorBorderHighlight]}
                          placeholder="Provide context regarding the restriction incident..."
                          placeholderTextColor="#475569"
                          multiline
                          numberOfLines={4}
                          textAlignVertical="top"
                          onBlur={onBlur}
                          onChangeText={onChange}
                          value={value}
                        />
                        {error && <Text style={styles.fieldValidationErrorMessageText}>{error.message}</Text>}
                      </>
                    )}
                  />
                </View>
              </View>

              <View style={styles.modalActionButtonsFooterLayoutRow}>
                <TouchableOpacity style={styles.modalCancelDismissBtn} onPress={() => setOpen(false)}>
                  <Text style={styles.modalCancelDismissBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalSubmitConfirmBtn} onPress={form.handleSubmit(onSubmit)}>
                  <Feather name="plus" size={14} color="#fff" />
                  <Text style={styles.modalSubmitConfirmBtnText}>Add Entry</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Modal: View Details ── */}
      <Modal visible={viewOpen} animationType="fade" transparent>
        <View style={styles.modalOverlayScrimContainer}>
          <View style={[styles.modalScrollableWindowBodyContainer, styles.detailModalModifierPaddingSize]}>
            
            {/* Top Right Close 'X' Button */}
            <TouchableOpacity style={styles.modalTopRightCloseButton} onPress={() => setViewOpen(false)}>
              <Feather name="x" size={20} color="#94a3b8" />
            </TouchableOpacity>

            {selected && (
              <>
                <View style={styles.detailViewHeaderLabelRow}>
                  <Feather name="user-x" size={22} color="#ef4444" />
                  <Text style={styles.detailTitleNameTextLabel}>{selected.fullName}</Text>
                  <Text style={styles.detailDateBadgeTextLabel}>Added: {selected.createdAt}</Text>
                </View>

                <ScrollView style={styles.detailInformationTextScrollFrame}>
                  <Text style={styles.detailGroupSectionLabelText}>REASON RESTRICTED</Text>
                  <Text style={styles.detailGroupReasonPrimaryTextText}>{selected.reason}</Text>

                  <Text style={[styles.detailGroupSectionLabelText, { marginTop: 14 }]}>INCIDENT CHRONOLOGY NOTES</Text>
                  <Text style={styles.detailGroupNotesBodyTextText}>{selected.incidentNotes}</Text>

                  <Text style={[styles.detailGroupSectionLabelText, { marginTop: 14 }]}>VERIFIED CONTACT SIGNATURES</Text>
                  <View style={styles.detailContactBadgeRowBlock}>
                    <Feather name="phone" size={14} color="#94a3b8" />
                    <Text style={styles.detailContactBadgeRowBlockText}>{selected.phone || "No phone documented"}</Text>
                  </View>
                  <View style={styles.detailContactBadgeRowBlock}>
                    <Feather name="mail" size={14} color="#94a3b8" />
                    <Text style={styles.detailContactBadgeRowBlockText}>{selected.email || "No email documented"}</Text>
                  </View>
                </ScrollView>

                <TouchableOpacity style={[styles.modalCancelDismissBtn, { width: '100%', marginTop: 16 }]} onPress={() => setViewOpen(false)}>
                  <Text style={styles.modalCancelDismissBtnText}>Dismiss Record View</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

/* ── Stylesheet Theme Configuration Matrix ──────────────── */
const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    backgroundColor: "#090a10",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 52 : 24,
    paddingBottom: 40,
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
    flexWrap: "wrap",
    gap: 12,
  },
  headerTextWrapper: {
    flex: 1,
    minWidth: 200,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#f1f5f9",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 2,
  },
  addNewButtonTrigger: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#dc2626",
    paddingHorizontal: 14,
    height: 38,
    borderRadius: 8,
    gap: 6,
  },
  addNewButtonTriggerText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  searchBarContainerFrame: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.02)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 16,
  },
  searchIconLayout: {
    marginRight: 8,
  },
  searchTextInputElement: {
    flex: 1,
    color: "#fff",
    fontSize: 13,
  },
  mainFeedCardContainer: {
    marginBottom: 16,
  },
  statusFeedbackContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 30,
    gap: 8,
  },
  statusFeedbackText: {
    color: "#64748b",
    fontSize: 13,
  },
  errorTextColored: {
    color: "#ef4444",
  },
  emptyStateContainerFrame: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    backgroundColor: "rgba(255,255,255,0.01)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    borderStyle: "dashed",
    borderRadius: 12,
    paddingHorizontal: 20,
  },
  emptyIconCircleWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyStateTitleText: {
    color: "#f1f5f9",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  emptyStateBodyText: {
    color: "#64748b",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 16,
    marginBottom: 16,
  },
  emptyStateActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 6,
    gap: 4,
  },
  emptyStateActionBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  cardsNativeListWrapper: {
    gap: 12,
  },
  entryDataRowCardNode: {
    backgroundColor: "rgba(255,255,255,0.02)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    borderRadius: 10,
    padding: 14,
  },
  cardHeaderRowInline: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  candidateNameHeadlineText: {
    color: "#f8fafc",
    fontSize: 15,
    fontWeight: "700",
  },
  candidateReasonExcerptText: {
    color: "#f87171",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  cardTimestampText: {
    color: "#475569",
    fontSize: 10,
    fontWeight: "600",
  },
  cardNotesExcerptBlock: {
    color: "#94a3b8",
    fontSize: 12,
    marginTop: 8,
    lineHeight: 16,
    backgroundColor: "rgba(0,0,0,0.15)",
    padding: 8,
    borderRadius: 6,
  },
  cardMetaContactsFooterTrack: {
    flexDirection: "row",
    marginTop: 10,
    gap: 14,
  },
  metaBadgeContactItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  metaBadgeContactItemText: {
    color: "#475569",
    fontSize: 11,
  },
  statsPanelFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  statsCountDisplayLabel: {
    color: "#475569",
    fontSize: 12,
  },
  statsIndicatorStatusBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  redPulseDotMarkerIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#ef4444",
  },
  modalOverlayScrimContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalScrollableWindowBodyContainer: {
    position: "relative", // Required for absolute placement of X close button
    width: "100%",
    maxWidth: 500,
    backgroundColor: "#11121a",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    maxHeight: "85%",
  },
  modalTopRightCloseButton: {
    position: "absolute",
    top: 14,
    right: 14,
    zIndex: 10,
    padding: 6,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  modalFormContentLayoutView: {
    padding: 18,
  },
  modalHeaderTitleBlockRow: {
    marginBottom: 16,
    paddingRight: 24, // Prevents text crashing into the X button
  },
  modalHeaderFlexHeadlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalTitleHeadlineLabelText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
  modalSubtitleDescriptionText: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 4,
  },
  formInputFieldsVerticalStack: {
    gap: 12,
  },
  formFieldBlockControlItem: {
    gap: 5,
  },
  formFieldLabelText: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  formBaseTextInputField: {
    backgroundColor: "rgba(0,0,0,0.3)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    borderRadius: 8,
    height: 38,
    paddingHorizontal: 10,
    color: "#fff",
    fontSize: 13,
  },
  formTextAreaInputElement: {
    height: 80,
    paddingTop: 8,
    paddingBottom: 8,
  },
  formFieldErrorBorderHighlight: {
    borderColor: "#ef4444",
  },
  fieldValidationErrorMessageText: {
    color: "#f87171",
    fontSize: 10,
    fontWeight: "500",
  },
  modalActionButtonsFooterLayoutRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  modalCancelDismissBtn: {
    flex: 1,
    height: 38,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelDismissBtnText: {
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: "600",
  },
  modalSubmitConfirmBtn: {
    flex: 1,
    height: 38,
    backgroundColor: "#dc2626",
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  modalSubmitConfirmBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  detailModalModifierPaddingSize: {
    padding: 20,
  },
  detailViewHeaderLabelRow: {
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    paddingBottom: 14,
    paddingTop: 8,
    marginBottom: 14,
  },
  detailTitleNameTextLabel: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 6,
    textAlign: "center",
  },
  detailDateBadgeTextLabel: {
    color: "#475569",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  detailInformationTextScrollFrame: {
    maxHeight: 220,
  },
  detailGroupSectionLabelText: {
    color: "#64748b",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  detailGroupReasonPrimaryTextText: {
    color: "#f87171",
    fontSize: 13,
    fontWeight: "600",
  },
  detailGroupNotesBodyTextText: {
    color: "#cbd5e1",
    fontSize: 12,
    lineHeight: 18,
    backgroundColor: "rgba(0,0,0,0.2)",
    padding: 10,
    borderRadius: 8,
  },
  detailContactBadgeRowBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  detailContactBadgeRowBlockText: {
    color: "#94a3b8",
    fontSize: 12,
  },
});