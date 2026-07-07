import React, { useState, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FlashList } from "@shopify/flash-list";
import { Search, Plus, Trash2, Edit3, Mail, Phone, Briefcase, X } from "lucide-react-native";
import { useAuth } from "../../../contexts/AuthContext";
import { useTheme } from "../../../contexts/ThemeContext";
import { apiRequest } from "../../../services/api";

const STATUS_OPTIONS = ["All", "Active", "Pending", "Inactive"];

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  status: "Active" | "Pending" | "Inactive";
}

interface Company {
  id: string;
  name: string;
}

interface WrappedResponse {
  success: boolean;
  data?: {
    items?: any[];
  };
}

type ApiResponse = WrappedResponse | any;

const STATUS_CONFIG = {
  Active: { bg: "rgba(16, 185, 129, 0.1)", text: "#10b981", dot: "#10b981" },
  Pending: { bg: "rgba(245, 158, 11, 0.1)", text: "#f59e0b", dot: "#f59e0b" },
  Inactive: { bg: "rgba(148, 163, 184, 0.1)", text: "#94a3b8", dot: "#94a3b8" }
};

export default function Contacts() {
  const queryClient = useQueryClient();
  const auth = useAuth();
  const { uiTheme } = useTheme();

  const isMetallic = uiTheme?.theme === "metallic-elite";

  const colors = useMemo(() => {
    const isDark = (uiTheme?.theme as string) === "dark" || isMetallic;
    return {
      background: uiTheme?.panelColors?.dashboardBackground || (isDark ? "#080b10" : "#f8fafc"),
      cardBg: uiTheme?.panelColors?.dashboardCardBackground || (isDark ? "#0f131a" : "#ffffff"),
      text: uiTheme?.panelColors?.dashboardTextColor || (isDark ? "#ffffff" : "#0f172a"),
      mutedText: isDark ? "rgba(255,255,255,0.4)" : "#475569",
      border: uiTheme?.panelColors?.borderColor || (isDark ? "rgba(217,119,6,0.15)" : "#e2e8f0"),
      inputBg: isDark ? "#020617" : "#ffffff",
      inputBorder: isDark ? "rgba(255,255,255,0.1)" : "#cbd5e1",
      primary: uiTheme?.customColors?.primary || "#ffd27a"
    };
  }, [uiTheme, isMetallic]);

  const styles = useMemo(() => createStyles(colors), [colors]);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [formErrors, setFormErrors] = useState<{ name?: string; email?: string; phone?: string; company?: string }>({});
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    status: "Active" as Contact["status"]
  });

  const contactsQuery = useQuery<Contact[]>({
    queryKey: ["crm-contacts"],
    queryFn: async () => {
      const res = await apiRequest("/crm-contacts", { method: "GET" }) as ApiResponse;
      if (res && res.success && res.data && Array.isArray(res.data.items)) {
        return res.data.items as Contact[];
      }
      return Array.isArray(res) ? res : [];
    }
  });

  const companiesQuery = useQuery<Company[]>({
    queryKey: ["crm-companies"],
    enabled: isModalOpen,
    queryFn: async () => {
      const res = await apiRequest("/crm-company", { method: "GET" }) as ApiResponse;
      if (res && res.success && res.data && Array.isArray(res.data.items)) {
        return res.data.items as Company[];
      }
      return Array.isArray(res) ? res : [];
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      const url = editingContact ? `/crm-contacts/${editingContact.id}` : "/crm-contacts";
      const method = editingContact ? "PUT" : "POST";
      return await apiRequest(url, {
        method,
        body: JSON.stringify({
          name: payload.name.trim(),
          email: payload.email.trim(),
          phone: payload.phone.trim(),
          company: payload.company,
          status: payload.status
        })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-contacts"] });
      handleCloseModal();
    },
    onError: (err: any) => {
      Alert.alert("Save Failed", err.message || "Failed to sync transaction context.");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/crm-contacts/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-contacts"] });
    },
    onError: (err: any) => {
      Alert.alert("Delete Failed", err.message || "Could not delete tracking record.");
    }
  });

  const filteredContacts = useMemo(() => {
    const rawList = contactsQuery.data || [];
    return rawList.filter(c => {
      const target = searchQuery.toLowerCase();
      const matchesSearch =
        c.name?.toLowerCase().includes(target) ||
        c.email?.toLowerCase().includes(target) ||
        c.phone?.includes(target) ||
        c.company?.toLowerCase().includes(target);
      const matchesStatus = statusFilter === "All" || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [contactsQuery.data, searchQuery, statusFilter]);

  const metricsSummary = useMemo(() => {
    const rawList = contactsQuery.data || [];
    return {
      total: rawList.length,
      active: rawList.filter(c => c.status === "Active").length,
      pending: rawList.filter(c => c.status === "Pending").length,
      inactive: rawList.filter(c => c.status === "Inactive").length
    };
  }, [contactsQuery.data]);

  const handleOpenAddModal = () => {
    setEditingContact(null);
    setFormData({ name: "", email: "", phone: "", company: "", status: "Active" });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (contact: Contact) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name || "",
      email: contact.email || "",
      phone: contact.phone || "",
      company: contact.company || "",
      status: contact.status || "Active"
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingContact(null);
    setFormErrors({});
  };

  const validateFormSchema = () => {
    const errors: typeof formErrors = {};
    if (!formData.name.trim()) errors.name = "Name designation is required";
    if (!formData.email.trim()) {
      errors.email = "Email address link identity required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Invalid structure string format rules";
    }
    if (!formData.phone.trim()) errors.phone = "Phone coordinate values required";
    if (!formData.company.trim()) errors.company = "Corporate association context required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const executeSaveAction = () => {
    if (!validateFormSchema()) return;
    saveMutation.mutate(formData);
  };

  const displayDeleteAlert = (id: string) => {
    Alert.alert(
      "Confirm Removal",
      "Are you sure you want to permanently erase this profile node configuration context?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Confirm", style: "destructive", onPress: () => deleteMutation.mutate(id) }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.rootContainer}>
      <StatusBar barStyle="light-content" />
      <View style={styles.headerDeckFrame}>
        <View style={styles.headerFlexRowInline}>
          <View style={{ flex: 1 }}>
            <Text style={styles.screenHeading}>Contacts</Text>
            <Text style={styles.screenCaption}>Manage global relational indices and communications pipeline</Text>
          </View>
          <TouchableOpacity style={styles.createNewEntityBtn} onPress={handleOpenAddModal}>
            <Plus size={14} color="#080b10" />
            <Text style={styles.createNewBtnText}>Add Contact</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.metricsStripContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.metricsHorizontalScrollTrack}>
          {[
            { label: "Total Data", value: metricsSummary.total, tint: colors.text },
            { label: "Active Nodes", value: metricsSummary.active, tint: "#10b981" },
            { label: "Pending Verification", value: metricsSummary.pending, tint: "#f59e0b" },
            { label: "Archived State", value: metricsSummary.inactive, tint: colors.mutedText }
          ].map(item => (
            <View key={item.label} style={styles.metricsKpiBoxFrame}>
              <Text style={styles.kpiCardMetaLabelText} numberOfLines={1}>{item.label}</Text>
              <Text style={[styles.kpiCardMetricValueText, { color: item.tint }]}>{item.value}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      <View style={styles.filterControlWorkspaceBlock}>
        <View style={styles.searchFilterInputBoxBody}>
          <Search size={14} color={colors.mutedText} />
          <TextInput
            style={styles.searchFilterTextInputFieldWidget}
            placeholder="Search operational profile data parameters..."
            placeholderTextColor={colors.mutedText}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <X size={14} color={colors.text} />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterPillsScrollFlexContainer}>
          {STATUS_OPTIONS.map(opt => {
            const isActive = statusFilter === opt;
            return (
              <TouchableOpacity
                key={opt}
                style={[styles.filterPillNodeFrameAnchor, isActive && { backgroundColor: colors.primary, borderColor: "transparent" }]}
                onPress={() => setStatusFilter(opt)}
              >
                <Text style={[styles.filterPillLabelTextValue, isActive && { color: "#080b10", fontWeight: "900" }]}>{opt}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {contactsQuery.isLoading ? (
        <View style={styles.centerLoadingStateDeck}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.syncStatusLoadingTextLabel}>Synchronizing System Contacts Directory...</Text>
        </View>
      ) : filteredContacts.length === 0 ? (
        <View style={styles.centerLoadingStateDeck}>
          <Briefcase size={32} color={colors.mutedText} />
          <Text style={styles.emptyDatasetWarningTextHeadline}>No active files located</Text>
          <Text style={styles.emptyDatasetWarningTextCaption}>Adjust tracking filter matrices or structural queries.</Text>
        </View>
      ) : (
        <View style={{ flex: 1, width: "100%" }}>
          <FlashList
            data={filteredContacts}
            
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
            renderItem={({ item }) => {
              const badgeCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.Inactive;
              const initials = item.name?.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase() || "?";

              return (
                <View style={styles.contactProfileRowCardSurface}>
                  <View style={styles.cardHeaderFlexInlineRow}>
                    <View style={[styles.avatarBoxCellFallback, { backgroundColor: colors.border }]}>
                      <Text style={[styles.avatarTextLabel, { color: colors.primary }]}>{initials}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12, marginRight: 8 }}>
                      <Text style={styles.contactCardPrimaryTitleText} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.contactCardSecondarySubtitleText} numberOfLines={1}>{item.company}</Text>
                    </View>
                    <View style={[styles.statusBadgeFrameLabel, { backgroundColor: badgeCfg.bg }]}>
                      <View style={[styles.statusIndicatorDotGraphicNode, { backgroundColor: badgeCfg.dot }]} />
                      <Text style={[styles.statusBadgeTextValue, { color: badgeCfg.text }]}>{item.status}</Text>
                    </View>
                  </View>

                  <View style={styles.cardInfoLongFormGridContainer}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <Mail size={12} color={colors.primary} />
                      <Text style={styles.longFormMetadataLineText} numberOfLines={1}>{item.email}</Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Phone size={12} color={colors.primary} />
                      <Text style={styles.longFormMetadataMonoLineText} numberOfLines={1}>{item.phone}</Text>
                    </View>
                  </View>

                  <View style={styles.rowActionTriggerControlFooterBar}>
                    <TouchableOpacity style={styles.footerInlineActionBtnAnchor} onPress={() => handleOpenEditModal(item)}>
                      <Edit3 size={12} color={colors.primary} style={{ marginRight: 4 }} />
                      <Text style={[styles.footerActionLabelTextValue, { color: colors.primary }]}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.footerInlineActionBtnAnchor, styles.footerActionBorderAccentDividerLeft]} onPress={() => displayDeleteAlert(item.id)}>
                      <Trash2 size={12} color="#ef4444" style={{ marginRight: 4 }} />
                      <Text style={[styles.footerActionLabelTextValue, { color: "#ef4444" }]}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
          />
        </View>
      )}

      <Modal visible={isModalOpen} animationType="slide" transparent onRequestClose={handleCloseModal}>
        <View style={styles.modalBackdropOverlayScrim}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalContentCoreSurfaceSheet}>
            <View style={styles.modalHeaderTopBarInlineRow}>
              <Text style={styles.modalMainTitleHeading}>{editingContact ? "Edit Identity Profile" : "Register Core Contact Profile"}</Text>
              <TouchableOpacity onPress={handleCloseModal} style={styles.modalCloseActionCircleAnchor}>
                <X size={16} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalFormBodyScrollWrapper} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={styles.formFieldLabelTextSignature}>Full Legal Name *</Text>
              <TextInput
                style={[styles.formInputPrimitiveTextField, formErrors.name ? styles.inputValidationErrorBorderOutline : null]}
                placeholder="Enter client baseline identity name"
                placeholderTextColor={colors.mutedText}
                value={formData.name}
                onChangeText={text => setFormData(p => ({ ...p, name: text }))}
              />
              {formErrors.name && <Text style={styles.errorMessagingOutputNodeText}>{formErrors.name}</Text>}

              <Text style={styles.formFieldLabelTextSignature}>Communication Domain Email *</Text>
              <TextInput
                style={[styles.formInputPrimitiveTextField, formErrors.email ? styles.inputValidationErrorBorderOutline : null]}
                placeholder="e.g. communication@node.com"
                keyboardType="email-address"
                placeholderTextColor={colors.mutedText}
                autoCapitalize="none"
                value={formData.email}
                onChangeText={val => setFormData(p => ({ ...p, email: val }))}
              />
              {formErrors.email && <Text style={styles.errorMessagingOutputNodeText}>{formErrors.email}</Text>}

              <Text style={styles.formFieldLabelTextSignature}>Mobile Telephony Coordinate *</Text>
              <TextInput
                style={[styles.formInputPrimitiveTextField, formErrors.phone ? styles.inputValidationErrorBorderOutline : null]}
                placeholder="e.g. +1 (555) 000-0000"
                keyboardType="phone-pad"
                placeholderTextColor={colors.mutedText}
                value={formData.phone}
                onChangeText={val => setFormData(p => ({ ...p, phone: val }))}
              />
              {formErrors.phone && <Text style={styles.errorMessagingOutputNodeText}>{formErrors.phone}</Text>}

              <Text style={styles.formFieldLabelTextSignature}>Corporate Entity Node Mapping *</Text>
              <View style={styles.formSelectorGridClusterWrapperContainer}>
                {companiesQuery.isLoading ? (
                  <View style={styles.formInlineFeedbackActivityRow}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.syncStatusLoadingTextLabel}>Mapping available records index...</Text>
                  </View>
                ) : companiesQuery.data && companiesQuery.data.length > 0 ? (
                  <View style={styles.flexBoxWrapLayoutContainer}>
                    {companiesQuery.data.map(comp => {
                      const isSelected = formData.company === comp.name;
                      return (
                        <TouchableOpacity
                          key={comp.id || comp.name}
                          style={[styles.selectableFormPillItemNode, isSelected && { backgroundColor: "rgba(217,119,6,0.1)", borderColor: colors.primary }]}
                          onPress={() => setFormData(p => ({ ...p, company: comp.name }))}
                        >
                          <Text style={[styles.selectableFormPillItemLabelText, isSelected && { color: colors.primary, fontWeight: "800" }]}>
                            {comp.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : (
                  <Text style={styles.formAlternativeFeedbackWarningLabel}>No structural enterprise entities configured in baseline database maps.</Text>
                )}
              </View>
              {formErrors.company && <Text style={styles.errorMessagingOutputNodeText}>{formErrors.company}</Text>}

              <Text style={styles.formFieldLabelTextSignature}>Account Verification Pipeline Phase Status</Text>
              <View style={styles.flexBoxWrapLayoutContainer}>
                {STATUS_OPTIONS.filter(s => s !== "All").map(st => {
                  const isSelected = formData.status === st;
                  return (
                    <TouchableOpacity
                      key={st}
                      style={[styles.formActionSelectorBlockCell, isSelected && { borderColor: colors.primary, backgroundColor: "rgba(217,119,6,0.06)" }]}
                      onPress={() => setFormData(p => ({ ...p, status: st as any }))}
                    >
                      <Text style={[styles.formActionSelectorBlockCellText, isSelected && { color: colors.primary, fontWeight: "800" }]}>
                        {st}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <View style={styles.modalStickyFooterActionsBarContainer}>
              <TouchableOpacity style={styles.formActionDismissModalBtn} onPress={handleCloseModal} disabled={saveMutation.isPending}>
                <Text style={styles.formDismissBtnLabelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.formActionSubmitModalBtn, { backgroundColor: colors.primary }, saveMutation.isPending && styles.disabledActionBtnState]}
                onPress={executeSaveAction}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? (
                  <ActivityIndicator size="small" color="#080b10" />
                ) : (
                  <Text style={styles.formSubmitBtnLabelText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: colors.background
  },
  centerLoadingStateDeck: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40
  },
  syncStatusLoadingTextLabel: {
    marginTop: 10,
    fontSize: 12,
    color: colors.mutedText,
    fontWeight: "500"
  },
  headerDeckFrame: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  headerFlexRowInline: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12
  },
  screenHeading: {
    fontSize: 22,
    fontWeight: "900",
    color: colors.text
  },
  screenCaption: {
    fontSize: 11,
    color: colors.mutedText,
    marginTop: 2
  },
  createNewEntityBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },
  createNewBtnText: {
    color: "#080b10",
    fontSize: 11,
    fontWeight: "800"
  },
  metricsStripContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  metricsHorizontalScrollTrack: {
    paddingHorizontal: 16,
    gap: 8
  },
  metricsKpiBoxFrame: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    minWidth: 105,
    justifyContent: "center"
  },
  kpiCardMetaLabelText: {
    fontSize: 9,
    color: colors.mutedText,
    textTransform: "uppercase",
    fontWeight: "700"
  },
  kpiCardMetricValueText: {
    fontSize: 18,
    fontWeight: "900",
    marginTop: 2
  },
  filterControlWorkspaceBlock: {
    paddingHorizontal: 16,
    marginTop: 14,
    gap: 10,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  searchFilterInputBoxBody: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.15)",
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 38
  },
  searchFilterTextInputFieldWidget: {
    flex: 1,
    color: colors.text,
    fontSize: 12,
    paddingLeft: 6
  },
  filterPillsScrollFlexContainer: {
    gap: 6
  },
  filterPillNodeFrameAnchor: {
    paddingHorizontal: 12,
    height: 28,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: colors.inputBorder,
    justifyContent: "center",
    alignItems: "center"
  },
  filterPillLabelTextValue: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "600"
  },
  emptyDatasetWarningTextHeadline: {
    color: colors.text,
    fontWeight: "800",
    fontSize: 13,
    marginTop: 8
  },
  emptyDatasetWarningTextCaption: {
    color: colors.mutedText,
    fontSize: 11,
    textAlign: "center"
  },
  contactProfileRowCardSurface: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 14,
    marginTop: 12
  },
  cardHeaderFlexInlineRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  avatarBoxCellFallback: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)"
  },
  avatarTextLabel: {
    fontSize: 11,
    fontWeight: "900"
  },
  contactCardPrimaryTitleText: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text
  },
  contactCardSecondarySubtitleText: {
    fontSize: 11,
    color: colors.mutedText,
    marginTop: 1
  },
  statusBadgeFrameLabel: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10
  },
  statusIndicatorDotGraphicNode: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginRight: 4
  },
  statusBadgeTextValue: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  cardInfoLongFormGridContainer: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.03)",
    paddingVertical: 10,
    marginVertical: 12
  },
  longFormMetadataLineText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "500"
  },
  longFormMetadataMonoLineText: {
    color: colors.mutedText,
    fontSize: 11,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace"
  },
  rowActionTriggerControlFooterBar: {
    flexDirection: "row",
    gap: 10
  },
  footerInlineActionBtnAnchor: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.02)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.03)",
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row"
  },
  footerActionBorderAccentDividerLeft: {
    borderColor: "rgba(239,68,68,0.1)"
  },
  footerActionLabelTextValue: {
    fontSize: 11,
    fontWeight: "700"
  },
  modalBackdropOverlayScrim: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16
  },
  modalContentCoreSurfaceSheet: {
    backgroundColor: colors.cardBg,
    borderRadius: 20,
    padding: 16,
    width: "100%",
    maxWidth: 360,
    maxHeight: "85%",
    borderWidth: 1,
    borderColor: colors.border
  },
  modalHeaderTopBarInlineRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 12
  },
  modalMainTitleHeading: {
    fontSize: 15,
    fontWeight: "900",
    color: colors.text
  },
  modalCloseActionCircleAnchor: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
    justifyContent: "center"
  },
  modalFormBodyScrollWrapper: {
    paddingBottom: 16
  },
  formFieldLabelTextSignature: {
    color: colors.mutedText,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 12
  },
  formInputPrimitiveTextField: {
    backgroundColor: "rgba(0,0,0,0.2)",
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    color: colors.text,
    fontSize: 12
  },
  inputValidationErrorBorderOutline: {
    borderColor: "rgba(239,68,68,0.4)"
  },
  errorMessagingOutputNodeText: {
    color: "#ef4444",
    fontSize: 11,
    marginTop: 4,
    fontWeight: "600"
  },
  formSelectorGridClusterWrapperContainer: {
    marginTop: 4,
    gap: 6
  },
  formInlineFeedbackActivityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4
  },
  flexBoxWrapLayoutContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4
  },
  selectableFormPillItemNode: {
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: colors.inputBorder,
    justifyContent: "center",
    alignItems: "center"
  },
  selectableFormPillItemLabelText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "500"
  },
  formAlternativeFeedbackWarningLabel: {
    color: colors.mutedText,
    fontSize: 11,
    paddingVertical: 4
  },
  formActionSelectorBlockCell: {
    flex: 1,
    minWidth: "28%",
    height: 36,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.02)"
  },
  formActionSelectorBlockCellText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "600"
  },
  modalStickyFooterActionsBarContainer: {
    flexDirection: "row",
    gap: 10,
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingTop: 12,
    marginTop: 12
  },
  formActionDismissModalBtn: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
    justifyContent: "center"
  },
  formDismissBtnLabelText: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 12
  },
  formActionSubmitModalBtn: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center"
  },
  formSubmitBtnLabelText: {
    color: "#080b10",
    fontWeight: "900",
    fontSize: 12
  },
  disabledActionBtnState: {
    opacity: 0.5
  }
});