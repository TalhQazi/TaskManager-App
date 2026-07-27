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
import { useTheme } from "@/contexts/ThemeContext";
import { s, wp, hp, fs } from "@/util/styles";

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

function buildColors(uiTheme: any, isDark: boolean) {
  return {
    background:    uiTheme.panelColors?.dashboardBackground     || (isDark ? "#090a10" : "#f8fafc"),
    cardBg:        uiTheme.panelColors?.dashboardCardBackground || (isDark ? "rgba(255,255,255,0.02)" : "#ffffff"),
    text:          uiTheme.panelColors?.dashboardTextColor      || (isDark ? "#f1f5f9" : "#0f172a"),
    textSecondary: isDark ? "#64748b" : "#475569",
    textMuted:     isDark ? "#94a3b8" : "#64748b",
    textDark:      isDark ? "#475569" : "#94a3b8",
    border:        isDark ? "rgba(255,255,255,0.07)" : "#e2e8f0",
    borderLight:   isDark ? "rgba(255,255,255,0.05)" : "#f1f5f9",
    inputBg:       isDark ? "rgba(0,0,0,0.3)" : "#f1f5f9",
    primary:       uiTheme.customColors?.primary || "#dc2626",
    overlayBg:     "rgba(0,0,0,0.75)",
    modalBg:       isDark ? "#11121a" : "#ffffff",
  };
}

function createStyles(colors: ReturnType<typeof buildColors>) {
  return StyleSheet.create({
    appContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      paddingHorizontal: wp(4),
      paddingTop: Platform.OS === 'ios' ? hp(6) : hp(3),
      paddingBottom: hp(5),
    },
    headerContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: hp(2.2),
      flexWrap: "wrap",
      gap: wp(3),
    },
    headerTextWrapper: {
      flex: 1,
      minWidth: wp(50),
    },
    headerTitle: {
      fontSize: fs(6),
      fontWeight: "900",
      color: colors.text,
      letterSpacing: -0.5,
    },
    headerSubtitle: {
      fontSize: fs(3.2),
      color: colors.textSecondary,
      marginTop: hp(0.25),
    },
    addNewButtonTrigger: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.primary,
      paddingHorizontal: wp(3.5),
      height: hp(4.8),
      borderRadius: wp(2),
      gap: wp(1.5),
    },
    addNewButtonTriggerText: {
      color: "#fff",
      fontSize: fs(3.2),
      fontWeight: "700",
    },
    searchBarContainerFrame: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: wp(2),
      paddingHorizontal: wp(3),
      height: hp(5.2),
      marginBottom: hp(2),
    },
    searchIconLayout: {
      marginRight: wp(2),
    },
    searchTextInputElement: {
      flex: 1,
      color: colors.text,
      fontSize: fs(3.2),
    },
    mainFeedCardContainer: {
      marginBottom: hp(2),
    },
    statusFeedbackContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: hp(3.8),
      gap: wp(2),
    },
    statusFeedbackText: {
      color: colors.textSecondary,
      fontSize: fs(3.2),
    },
    errorTextColored: {
      color: "#ef4444",
    },
    emptyStateContainerFrame: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: hp(5),
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.borderLight,
      borderStyle: "dashed",
      borderRadius: wp(3),
      paddingHorizontal: wp(5),
    },
    emptyIconCircleWrapper: {
      width: wp(14),
      height: wp(14),
      borderRadius: wp(7),
      backgroundColor: "rgba(239, 68, 68, 0.1)",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: hp(1.5),
    },
    emptyStateTitleText: {
      color: colors.text,
      fontSize: fs(4),
      fontWeight: "700",
      marginBottom: hp(0.5),
    },
    emptyStateBodyText: {
      color: colors.textSecondary,
      fontSize: fs(3),
      textAlign: "center",
      lineHeight: fs(4),
      marginBottom: hp(2),
    },
    emptyStateActionBtn: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.borderLight,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: wp(3),
      height: hp(4),
      borderRadius: wp(1.5),
      gap: wp(1),
    },
    emptyStateActionBtnText: {
      color: "#fff",
      fontSize: fs(3),
      fontWeight: "600",
    },
    cardsNativeListWrapper: {
      gap: hp(1.5),
    },
    entryDataRowCardNode: {
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: wp(2.5),
      padding: wp(3.5),
    },
    cardHeaderRowInline: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    candidateNameHeadlineText: {
      color: colors.text,
      fontSize: fs(3.8),
      fontWeight: "700",
    },
    candidateReasonExcerptText: {
      color: "#f87171",
      fontSize: fs(3),
      fontWeight: "500",
      marginTop: hp(0.25),
    },
    cardTimestampText: {
      color: colors.textDark,
      fontSize: fs(2.5),
      fontWeight: "600",
    },
    cardNotesExcerptBlock: {
      color: colors.textMuted,
      fontSize: fs(3),
      marginTop: hp(1),
      lineHeight: fs(4),
      backgroundColor: "rgba(0,0,0,0.15)",
      padding: wp(2),
      borderRadius: wp(1.5),
    },
    cardMetaContactsFooterTrack: {
      flexDirection: "row",
      marginTop: hp(1.2),
      gap: wp(3.5),
    },
    metaBadgeContactItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: wp(1),
      flex: 1,
    },
    metaBadgeContactItemText: {
      color: colors.textDark,
      fontSize: fs(2.8),
    },
    statsPanelFooterRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: hp(1),
      paddingTop: hp(1.5),
      borderTopWidth: 1,
      borderColor: colors.borderLight,
    },
    statsCountDisplayLabel: {
      color: colors.textDark,
      fontSize: fs(3),
    },
    statsIndicatorStatusBadgeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: wp(1.5),
    },
    redPulseDotMarkerIndicator: {
      width: wp(1.5),
      height: wp(1.5),
      borderRadius: wp(0.75),
      backgroundColor: "#ef4444",
    },
    modalOverlayScrimContainer: {
      flex: 1,
      backgroundColor: colors.overlayBg,
      justifyContent: "center",
      alignItems: "center",
      padding: wp(4),
    },
    modalScrollableWindowBodyContainer: {
      position: "relative",
      width: "100%",
      maxWidth: 500,
      backgroundColor: colors.modalBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: wp(3.5),
      maxHeight: "85%",
    },
    modalTopRightCloseButton: {
      position: "absolute",
      top: hp(1.8),
      right: wp(3.5),
      zIndex: 10,
      padding: wp(1.5),
      borderRadius: wp(5),
      backgroundColor: colors.borderLight,
    },
    modalFormContentLayoutView: {
      padding: wp(4.5),
    },
    modalHeaderTitleBlockRow: {
      marginBottom: hp(2),
      paddingRight: wp(6),
    },
    modalHeaderFlexHeadlineRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: wp(2),
    },
    modalTitleHeadlineLabelText: {
      color: colors.textMuted,
      fontSize: fs(4),
      fontWeight: "800",
    },
    modalSubtitleDescriptionText: {
      color: colors.textSecondary,
      fontSize: fs(3),
      marginTop: hp(0.5),
    },
    formInputFieldsVerticalStack: {
      gap: hp(1.5),
    },
    formFieldBlockControlItem: {
      gap: hp(0.6),
    },
    formFieldLabelText: {
      color: colors.textMuted,
      fontSize: fs(2.8),
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: 0.3,
    },
    formBaseTextInputField: {
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: wp(2),
      height: hp(4.8),
      paddingHorizontal: wp(2.5),
      color: colors.text,
      fontSize: fs(3.2),
    },
    formTextAreaInputElement: {
      height: hp(10),
      paddingTop: hp(1),
      paddingBottom: hp(1),
    },
    formFieldErrorBorderHighlight: {
      borderColor: "#ef4444",
    },
    fieldValidationErrorMessageText: {
      color: "#f87171",
      fontSize: fs(2.5),
      fontWeight: "500",
    },
    modalActionButtonsFooterLayoutRow: {
      flexDirection: "row",
      gap: wp(2.5),
      marginTop: hp(2.5),
    },
    modalCancelDismissBtn: {
      flex: 1,
      height: hp(4.8),
      backgroundColor: colors.borderLight,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: wp(2),
      alignItems: "center",
      justifyContent: "center",
    },
    modalCancelDismissBtnText: {
      color: colors.textMuted,
      fontSize: fs(3.2),
      fontWeight: "600",
    },
    modalSubmitConfirmBtn: {
      flex: 1,
      height: hp(4.8),
      backgroundColor: colors.primary,
      borderRadius: wp(2),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: wp(1.5),
    },
    modalSubmitConfirmBtnText: {
      color: "#fff",
      fontSize: fs(3.2),
      fontWeight: "700",
    },
    detailModalModifierPaddingSize: {
      padding: wp(5),
    },
    detailViewHeaderLabelRow: {
      alignItems: "center",
      borderBottomWidth: 1,
      borderColor: colors.borderLight,
      paddingBottom: hp(1.8),
      paddingTop: hp(1),
      marginBottom: hp(1.8),
    },
    detailTitleNameTextLabel: {
      color: colors.text,
      fontSize: fs(4.5),
      fontWeight: "900",
      marginTop: hp(0.75),
      textAlign: "center",
    },
    detailDateBadgeTextLabel: {
      color: colors.textDark,
      fontSize: fs(2.8),
      fontWeight: "600",
      marginTop: hp(0.25),
    },
    detailInformationTextScrollFrame: {
      maxHeight: hp(28),
    },
    detailGroupSectionLabelText: {
      color: colors.textSecondary,
      fontSize: fs(2.5),
      fontWeight: "700",
      letterSpacing: 0.5,
      marginBottom: hp(0.5),
    },
    detailGroupReasonPrimaryTextText: {
      color: "#f87171",
      fontSize: fs(3.2),
      fontWeight: "600",
    },
    detailGroupNotesBodyTextText: {
      color: colors.text,
      fontSize: fs(3),
      lineHeight: fs(4.5),
      backgroundColor: "rgba(0,0,0,0.2)",
      padding: wp(2.5),
      borderRadius: wp(2),
    },
    detailContactBadgeRowBlock: {
      flexDirection: "row",
      alignItems: "center",
      gap: wp(2),
      marginTop: hp(0.5),
    },
    detailContactBadgeRowBlockText: {
      color: colors.textMuted,
      fontSize: fs(3),
    },
  });
}

export default function DoNotHire({ initialViewId }: DoNotHireProps) {
  const { uiTheme } = useTheme();
  const isDark = (uiTheme?.theme as string) === 'dark' || (uiTheme?.theme as string) === 'metallic-elite';
  const colors = useMemo(() => buildColors(uiTheme, isDark), [uiTheme, isDark]);
  const styles = useMemo(() => createStyles(colors), [colors]);

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
      onError: (err: any) => {
        Alert.alert(
          "Failed to add entry",
          err instanceof Error ? err.message : "Something went wrong"
        );
      },
    });
  };

  return (
    <ScrollView style={s(styles.appContainer)} contentContainerStyle={s(styles.scrollContent)}>
      
      <View style={s(styles.headerContainer)}>
        <View style={s(styles.headerTextWrapper)}>
          <Text style={s(styles.headerTitle)}>Do Not Hire List</Text>
          <Text style={s(styles.headerSubtitle)}>Track and review restricted candidates</Text>
        </View>
        <TouchableOpacity style={s(styles.addNewButtonTrigger)} onPress={() => setOpen(true)}>
          <Feather name="plus" size={fs(4)} color="#fff" />
          <Text style={s(styles.addNewButtonTriggerText)}>Add Entry</Text>
        </TouchableOpacity>
      </View>

      <View style={s(styles.searchBarContainerFrame)}>
        <Feather name="search" size={fs(4)} color={colors.textSecondary} style={s(styles.searchIconLayout)} />
        <TextInput
          placeholder="Search name, phone, email, or reason..."
          placeholderTextColor={colors.textSecondary}
          style={s(styles.searchTextInputElement)}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={s(styles.mainFeedCardContainer)}>
        {entriesQuery.isLoading ? (
          <View style={s(styles.statusFeedbackContainer)}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={s(styles.statusFeedbackText)}>Loading entries...</Text>
          </View>
        ) : entriesQuery.isError ? (
          <View style={s(styles.statusFeedbackContainer)}>
            <Feather name="alert-triangle" size={fs(4.5)} color="#ef4444" />
            <Text style={s([styles.statusFeedbackText, styles.errorTextColored])}>
              {entriesQuery.error instanceof Error ? entriesQuery.error.message : "Failed to load entries"}
            </Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={s(styles.emptyStateContainerFrame)}>
            <View style={s(styles.emptyIconCircleWrapper)}>
              <Feather name="user-x" size={fs(7)} color="#f87171" />
            </View>
            <Text style={s(styles.emptyStateTitleText)}>No entries found</Text>
            <Text style={s(styles.emptyStateBodyText)}>
              {searchQuery ? "Try adjusting your query filter parameters." : "Get started by adding your first record entry."}
            </Text>
            {!searchQuery && (
              <TouchableOpacity style={s(styles.emptyStateActionBtn)} onPress={() => setOpen(true)}>
                <Feather name="plus" size={fs(3.5)} color="#fff" />
                <Text style={s(styles.emptyStateActionBtnText)}>Add Record Entry</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={s(styles.cardsNativeListWrapper)}>
            {filtered.map((entry) => (
              <TouchableOpacity
                key={entry.id}
                style={s(styles.entryDataRowCardNode)}
                onPress={() => {
                  setSelected(entry);
                  setViewOpen(true);
                }}
                activeOpacity={0.7}
              >
                <View style={s(styles.cardHeaderRowInline)}>
                  <View style={s({ flex: 1, paddingRight: wp(2) })}>
                    <Text style={s(styles.candidateNameHeadlineText)}>{entry.fullName}</Text>
                    <Text style={s(styles.candidateReasonExcerptText)} numberOfLines={1}>
                      Reason: {entry.reason}
                    </Text>
                  </View>
                  <Text style={s(styles.cardTimestampText)}>
                    {new Date(entry.createdAt).toLocaleDateString()}
                  </Text>
                </View>

                <Text style={s(styles.cardNotesExcerptBlock)} numberOfLines={1}>
                  {entry.incidentNotes}
                </Text>

                <View style={s(styles.cardMetaContactsFooterTrack)}>
                  <View style={s(styles.metaBadgeContactItem)}>
                    <Feather name="phone" size={fs(2.8)} color={colors.textMuted} />
                    <Text style={s(styles.metaBadgeContactItemText)} numberOfLines={1}>
                      {entry.phone?.trim() || "—"}
                    </Text>
                  </View>
                  <View style={s(styles.metaBadgeContactItem)}>
                    <Feather name="mail" size={fs(2.8)} color={colors.textMuted} />
                    <Text style={s(styles.metaBadgeContactItemText)} numberOfLines={1}>
                      {entry.email?.trim() || "—"}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {filtered.length > 0 && (
        <View style={s(styles.statsPanelFooterRow)}>
          <Text style={s(styles.statsCountDisplayLabel)}>
            Showing {filtered.length} of {entries.length} entries
          </Text>
          <View style={s(styles.statsIndicatorStatusBadgeRow)}>
            <View style={s(styles.redPulseDotMarkerIndicator)} />
            <Text style={s(styles.statsCountDisplayLabel)}>Restricted candidates</Text>
          </View>
        </View>
      )}

      <Modal visible={open} animationType="slide" transparent>
        <View style={s(styles.modalOverlayScrimContainer)}>
          <View style={s(styles.modalScrollableWindowBodyContainer)}>
            
            <TouchableOpacity style={s(styles.modalTopRightCloseButton)} onPress={() => setOpen(false)}>
              <Feather name="x" size={fs(5)} color={colors.textMuted} />
            </TouchableOpacity>

            <ScrollView contentContainerStyle={s(styles.modalFormContentLayoutView)}>
              <View style={s(styles.modalHeaderTitleBlockRow)}>
                <View style={s(styles.modalHeaderFlexHeadlineRow)}>
                  <Feather name="user-x" size={fs(4.5)} color="#ef4444" />
                  <Text style={s(styles.modalTitleHeadlineLabelText)}>Add Do Not Hire Entry</Text>
                </View>
                <Text style={s(styles.modalSubtitleDescriptionText)}>
                  Save an incident record block to prevent future hiring pipelines.
                </Text>
              </View>

              <View style={s(styles.formInputFieldsVerticalStack)}>
                <View style={s(styles.formFieldBlockControlItem)}>
                  <Text style={s(styles.formFieldLabelText)}>Full Name</Text>
                  <Controller
                    control={form.control}
                    name="fullName"
                    render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                      <>
                        <TextInput
                          style={s([styles.formBaseTextInputField, error && styles.formFieldErrorBorderHighlight])}
                          placeholder="Candidate complete name"
                          placeholderTextColor={colors.textSecondary}
                          onBlur={onBlur}
                          onChangeText={onChange}
                          value={value}
                        />
                        {error && <Text style={s(styles.fieldValidationErrorMessageText)}>{error.message}</Text>}
                      </>
                    )}
                  />
                </View>

                <View style={s(styles.formFieldBlockControlItem)}>
                  <Text style={s(styles.formFieldLabelText)}>Phone</Text>
                  <Controller
                    control={form.control}
                    name="phone"
                    render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                      <>
                        <TextInput
                          style={s([styles.formBaseTextInputField, error && styles.formFieldErrorBorderHighlight])}
                          placeholder="Optional contact string"
                          placeholderTextColor={colors.textSecondary}
                          keyboardType="phone-pad"
                          onBlur={onBlur}
                          onChangeText={onChange}
                          value={value}
                        />
                        {error && <Text style={s(styles.fieldValidationErrorMessageText)}>{error.message}</Text>}
                      </>
                    )}
                  />
                </View>

                <View style={s(styles.formFieldBlockControlItem)}>
                  <Text style={s(styles.formFieldLabelText)}>Email</Text>
                  <Controller
                    control={form.control}
                    name="email"
                    render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                      <>
                        <TextInput
                          style={s([styles.formBaseTextInputField, error && styles.formFieldErrorBorderHighlight])}
                          placeholder="Optional candidate email address"
                          placeholderTextColor={colors.textSecondary}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          onBlur={onBlur}
                          onChangeText={onChange}
                          value={value}
                        />
                        {error && <Text style={s(styles.fieldValidationErrorMessageText)}>{error.message}</Text>}
                      </>
                    )}
                  />
                </View>

                <View style={s(styles.formFieldBlockControlItem)}>
                  <Text style={s(styles.formFieldLabelText)}>Reason Tag</Text>
                  <Controller
                    control={form.control}
                    name="reason"
                    render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                      <>
                        <TextInput
                          style={s([styles.formBaseTextInputField, error && styles.formFieldErrorBorderHighlight])}
                          placeholder="Why is this candidate restricted?"
                          placeholderTextColor={colors.textSecondary}
                          onBlur={onBlur}
                          onChangeText={onChange}
                          value={value}
                        />
                        {error && <Text style={s(styles.fieldValidationErrorMessageText)}>{error.message}</Text>}
                      </>
                    )}
                  />
                </View>

                <View style={s(styles.formFieldBlockControlItem)}>
                  <Text style={s(styles.formFieldLabelText)}>Incident Narrative Notes</Text>
                  <Controller
                    control={form.control}
                    name="incidentNotes"
                    render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                      <>
                        <TextInput
                          style={s([styles.formBaseTextInputField, styles.formTextAreaInputElement, error && styles.formFieldErrorBorderHighlight])}
                          placeholder="Provide context regarding the restriction incident..."
                          placeholderTextColor={colors.textSecondary}
                          multiline
                          numberOfLines={4}
                          textAlignVertical="top"
                          onBlur={onBlur}
                          onChangeText={onChange}
                          value={value}
                        />
                        {error && <Text style={s(styles.fieldValidationErrorMessageText)}>{error.message}</Text>}
                      </>
                    )}
                  />
                </View>
              </View>

              <View style={s(styles.modalActionButtonsFooterLayoutRow)}>
                <TouchableOpacity style={s(styles.modalCancelDismissBtn)} onPress={() => setOpen(false)}>
                  <Text style={s(styles.modalCancelDismissBtnText)}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s(styles.modalSubmitConfirmBtn)} onPress={form.handleSubmit(onSubmit)}>
                  <Feather name="plus" size={fs(3.5)} color="#fff" />
                  <Text style={s(styles.modalSubmitConfirmBtnText)}>Add Entry</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={viewOpen} animationType="fade" transparent>
        <View style={s(styles.modalOverlayScrimContainer)}>
          <View style={s([styles.modalScrollableWindowBodyContainer, styles.detailModalModifierPaddingSize])}>
            
            <TouchableOpacity style={s(styles.modalTopRightCloseButton)} onPress={() => setViewOpen(false)}>
              <Feather name="x" size={fs(5)} color={colors.textMuted} />
            </TouchableOpacity>

            {selected && (
              <>
                <View style={s(styles.detailViewHeaderLabelRow)}>
                  <Feather name="user-x" size={fs(5.5)} color="#ef4444" />
                  <Text style={s(styles.detailTitleNameTextLabel)}>{selected.fullName}</Text>
                  <Text style={s(styles.detailDateBadgeTextLabel)}>Added: {selected.createdAt}</Text>
                </View>

                <ScrollView style={s(styles.detailInformationTextScrollFrame)}>
                  <Text style={s(styles.detailGroupSectionLabelText)}>REASON RESTRICTED</Text>
                  <Text style={s(styles.detailGroupReasonPrimaryTextText)}>{selected.reason}</Text>

                  <Text style={s([styles.detailGroupSectionLabelText, { marginTop: hp(1.8) }])}>INCIDENT CHRONOLOGY NOTES</Text>
                  <Text style={s(styles.detailGroupNotesBodyTextText)}>{selected.incidentNotes}</Text>

                  <Text style={s([styles.detailGroupSectionLabelText, { marginTop: hp(1.8) }])}>VERIFIED CONTACT SIGNATURES</Text>
                  <View style={s(styles.detailContactBadgeRowBlock)}>
                    <Feather name="phone" size={fs(3.5)} color={colors.textMuted} />
                    <Text style={s(styles.detailContactBadgeRowBlockText)}>{selected.phone || "No phone documented"}</Text>
                  </View>
                  <View style={s(styles.detailContactBadgeRowBlock)}>
                    <Feather name="mail" size={fs(3.5)} color={colors.textMuted} />
                    <Text style={s(styles.detailContactBadgeRowBlockText)}>{selected.email || "No email documented"}</Text>
                  </View>
                </ScrollView>

                <TouchableOpacity style={s([styles.modalCancelDismissBtn, { width: '100%', marginTop: hp(2) }])} onPress={() => setViewOpen(false)}>
                  <Text style={s(styles.modalCancelDismissBtnText)}>Dismiss Record View</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}