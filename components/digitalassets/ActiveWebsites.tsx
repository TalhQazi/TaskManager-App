import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  Linking,
  Clipboard,
  Platform
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/services/api";
import { 
  Plus, 
  Edit2, 
  Trash2, 
  ExternalLink, 
  X, 
  Globe, 
  Layers, 
  HardDrive, 
  Copy, 
  ChevronRight, 
  CheckCircle 
} from "lucide-react-native";
import { useTheme } from "@/contexts/ThemeContext";
import { s } from "@/util/styles";

export interface Website {
  _id: string;
  siteName: string;
  url: string;
  platform: string;
  hostingProvider: string;
  loginEmail?: string;
  loginPassword?: string;
  status: "Live" | "Maintenance" | "Development" | "Offline";
  notes: string;
  createdAt: string;
}

export default function ActiveWebsites() {
  const themeContext = useTheme() as any;
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);

  const [selectedWebsite, setSelectedWebsite] = useState<Website | null>(null);
  const [viewingWebsite, setViewingWebsite] = useState<Website | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<Website>>({
    siteName: "",
    url: "",
    platform: "",
    hostingProvider: "",
    loginEmail: "",
    loginPassword: "",
    status: "Live",
    notes: "",
  });

  const activeColors = useMemo(() => {
    const uiTheme = themeContext?.uiTheme;
    const isDark = uiTheme?.theme === "dark" || uiTheme?.theme === "metallic-elite";

    return {
      background: uiTheme?.panelColors?.dashboardBackground || (isDark ? "#090a0f" : "#f8fafc"),
      surface: uiTheme?.panelColors?.dashboardCardBackground || (isDark ? "#0f1117" : "#ffffff"),
      border: uiTheme?.panelColors?.borderColor || (isDark ? "rgba(255,255,255,0.08)" : "#e2e8f0"),
      borderLight: uiTheme?.panelColors?.borderColor || (isDark ? "rgba(255,255,255,0.04)" : "#f1f5f9"),
      surfaceVariant: isDark ? "rgba(255,255,255,0.05)" : "#f1f5f9",
      text: uiTheme?.panelColors?.dashboardTextColor || (isDark ? "#ffffff" : "#0f172a"),
      textMuted: isDark ? "#94a3b8" : "#64748b",
      textLight: isDark ? "#64748b" : "#94a3b8",
      primary: uiTheme?.customColors?.primary || "#0072FF",
      primaryLight: isDark ? "rgba(0, 114, 255, 0.15)" : "#eff6ff",
      danger: "#ef4444",
      dangerBg: isDark ? "rgba(239, 68, 68, 0.15)" : "#fee2e2",
      dangerBorder: isDark ? "rgba(239, 68, 68, 0.3)" : "#fca5a5",
      success: isDark ? "#4ade80" : "#166534",
      successBg: isDark ? "rgba(34, 197, 94, 0.15)" : "#dcfce7",
      successBorder: isDark ? "rgba(34, 197, 94, 0.3)" : "#bbf7d0",
      warning: isDark ? "#facc15" : "#854d0e",
      warningBg: isDark ? "rgba(234, 179, 8, 0.15)" : "#fef9c3",
      warningBorder: isDark ? "rgba(234, 179, 8, 0.3)" : "#fef08a",
      info: isDark ? "#60a5fa" : "#1e40af",
      infoBg: isDark ? "rgba(59, 130, 246, 0.15)" : "#dbeafe",
      infoBorder: isDark ? "rgba(59, 130, 246, 0.3)" : "#bfdbfe",
    };
  }, [themeContext]);

  const statusThemes = useMemo(() => {
    return {
      Live: { container: activeColors.successBg, text: activeColors.success, border: activeColors.successBorder },
      Maintenance: { container: activeColors.warningBg, text: activeColors.warning, border: activeColors.warningBorder },
      Development: { container: activeColors.infoBg, text: activeColors.info, border: activeColors.infoBorder },
      Offline: { container: activeColors.dangerBg, text: activeColors.danger, border: activeColors.dangerBorder },
    };
  }, [activeColors]);

const websitesQuery = useQuery<Website[]>({
  queryKey: ["active-websites"],
  queryFn: async () => {
    const res = await apiRequest<any>("/websites/active");
    if (res && res.success && res.data && Array.isArray(res.data.items)) {
      return res.data.items;
    }
   return Array.isArray(res) ? res : res?.data?.items || res?.data || [];
  },
});

  const websites = useMemo(() => 
    (websitesQuery.data || []).slice().sort((a, b) => a.siteName.localeCompare(b.siteName)),
    [websitesQuery.data]
  );

  const resetForm = () => {
    setFormData({
      siteName: "",
      url: "",
      platform: "",
      hostingProvider: "",
      loginEmail: "",
      loginPassword: "",
      status: "Live",
      notes: "",
    });
    setSelectedWebsite(null);
  };

  const handleSave = async () => {
    if (!formData.siteName || !formData.url) {
      Alert.alert("Required Fields Missing", "Site Name and URL must be filled out.");
      return;
    }

    try {
      setIsSubmitting(true);
      if (selectedWebsite) {
        await apiRequest(`/websites/${selectedWebsite._id}`, {
          method: "PUT",
          body: JSON.stringify(formData),
        });
      } else {
        await apiRequest("/websites", {
          method: "POST",
          body: JSON.stringify({
            ...formData,
            websiteType: "active",
          }),
        });
      }

      await websitesQuery.refetch();
      setIsFormOpen(false);
      resetForm();
    } catch (err) {
      Alert.alert("Save Operation Failed", err instanceof Error ? err.message : "Error dispatching network payload");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (website: Website) => {
    Alert.alert(
      "Confirm Deletion",
      `Are you sure you want to permanently delete ${website.siteName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await apiRequest(`/websites/${website._id}`, { method: "DELETE" });
              await websitesQuery.refetch();
              if (isViewOpen) setIsViewOpen(false);
            } catch (err) {
              Alert.alert("Error", err instanceof Error ? err.message : "Failed to remove entry");
            }
          }
        }
      ]
    );
  };

  const handleEdit = (website: Website) => {
    setSelectedWebsite(website);
    setFormData(website);
    setIsFormOpen(true);
  };

  const handleUrlRedirect = async (urlStr: string) => {
    const formattedUrl = urlStr.startsWith("http") ? urlStr : `https://${urlStr}`;
    const supported = await Linking.canOpenURL(formattedUrl);
    if (supported) {
      await Linking.openURL(formattedUrl);
    } else {
      Alert.alert("Invalid Link Structure", `Cannot evaluate or open target destination: ${formattedUrl}`);
    }
  };

  const copyToClipboard = (text?: string, label?: string) => {
    if (!text) return;
    Clipboard.setString(text);
    setCopiedField(label || "field");
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <SafeAreaView style={[s(styles.baseContainer), { backgroundColor: activeColors.background }]}>
      <ScrollView contentContainerStyle={s(styles.scrollBlock)} showsVerticalScrollIndicator={false}>
        
        <TouchableOpacity 
          style={[s(styles.addAssetPrimaryBtn), { backgroundColor: activeColors.primary }]}
          activeOpacity={0.8}
          onPress={() => { resetForm(); setIsFormOpen(true); }}
        >
          <Plus size={16} color="#fff" />
          <Text style={s(styles.addAssetPrimaryBtnText)}>Add Website</Text>
        </TouchableOpacity>

        {websitesQuery.isLoading ? (
          <ActivityIndicator size="small" color={activeColors.primary} style={s(styles.loaderMargin)} />
        ) : websites.length === 0 ? (
          <View style={[s(styles.emptyCardState), { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
            <Globe size={32} color={activeColors.textMuted} />
            <Text style={[s(styles.emptyCardText), { color: activeColors.textMuted }]}>No websites found. Click "Add Website" to populate dashboard metrics.</Text>
          </View>
        ) : (
          <View style={s(styles.entriesDirectoryStack)}>
            {websites.map((website, index) => {
              const currentStatus = website.status || "Offline";
              const currentTheme = statusThemes[currentStatus];
              return (
                <TouchableOpacity
                  key={website._id}
                  style={[s(styles.websiteItemRowCard), { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}
                  activeOpacity={0.9}
                  onPress={() => { setViewingWebsite(website); setIsViewOpen(true); }}
                >
                  <View style={[s(styles.cardHeaderTopLine), { borderBottomColor: activeColors.borderLight }]}>
                    <View style={s(styles.flexOnePadding)}>
                      <Text style={[s(styles.cardMainTitle), { color: activeColors.text }]} numberOfLines={1}>{website.siteName}</Text>
                      <TouchableOpacity 
                        style={s(styles.inlineUrlLinkRow)}
                        onPress={() => handleUrlRedirect(website.url)}
                      >
                        <Text style={[s(styles.inlineUrlLinkText), { color: activeColors.primary }]} numberOfLines={1}>{website.url}</Text>
                        <ExternalLink size={11} color={activeColors.primary} />
                      </TouchableOpacity>
                    </View>
                    <View style={[s(styles.statusBadge), { backgroundColor: currentTheme.container, borderColor: currentTheme.border }]}>
                      <Text style={[s(styles.statusBadgeText), { color: currentTheme.text }]}>{website.status}</Text>
                    </View>
                  </View>

                  <View style={s(styles.cardMetaGridInfo)}>
                    <View style={s(styles.metaRowItem)}>
                      <Layers size={12} color={activeColors.textMuted} />
                      <Text style={[s(styles.metaRowText), { color: activeColors.textMuted }]} numberOfLines={1}>{website.platform || "Unassigned Platform"}</Text>
                    </View>
                    <View style={s(styles.metaRowItem)}>
                      <HardDrive size={12} color={activeColors.textMuted} />
                      <Text style={[s(styles.metaRowText), { color: activeColors.textMuted }]} numberOfLines={1}>{website.hostingProvider || "Unallocated Host"}</Text>
                    </View>
                  </View>

                  <View style={[s(styles.cardFooterActionsFlex), { borderTopColor: activeColors.borderLight }]}>
                    <Text style={[s(styles.indexCounterText), { color: activeColors.textLight }]}>#{(index + 1).toString().padStart(2, "0")}</Text>
                    <View style={s(styles.actionButtonGroup)}>
                      <TouchableOpacity style={[s(styles.rowIconActionButton), { backgroundColor: activeColors.background, borderColor: activeColors.borderLight }]} onPress={() => handleEdit(website)}>
                        <Edit2 size={14} color={activeColors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity style={[s(styles.rowIconActionButton), { backgroundColor: activeColors.background, borderColor: activeColors.borderLight }]} onPress={() => handleDelete(website)}>
                        <Trash2 size={14} color={activeColors.danger} />
                      </TouchableOpacity>
                      <ChevronRight size={16} color={activeColors.textLight} style={s(styles.chevronMargin)} />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      <Modal visible={isFormOpen} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[s(styles.modalScrollFormContainer), { backgroundColor: activeColors.surface }]}>
          <View style={[s(styles.modalSheetFormHeader), { borderBottomColor: activeColors.borderLight }]}>
            <Text style={[s(styles.modalSheetFormTitle), { color: activeColors.text }]}>{selectedWebsite ? "Edit Website Node" : "Register Website Asset"}</Text>
            <TouchableOpacity onPress={() => setIsFormOpen(false)} style={[s(styles.closeSheetCircleButton), { backgroundColor: activeColors.background }]}>
              <X size={18} color={activeColors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={s(styles.innerFormKeyboardPadding)} keyboardShouldPersistTaps="handled">
            <View style={s(styles.formInputSectionSpace)}>
              <View style={s(styles.inputContainerUnit)}>
                <Text style={[s(styles.formInputLabel), { color: activeColors.textMuted }]}>Site Name *</Text>
                <TextInput
                  style={[s(styles.formInputBlock), { borderColor: activeColors.border, color: activeColors.text, backgroundColor: activeColors.background }]}
                  placeholder="e.g., Company Main Storefront"
                  placeholderTextColor={activeColors.textLight}
                  value={formData.siteName}
                  onChangeText={(val) => setFormData({ ...formData, siteName: val })}
                />
              </View>

              <View style={s(styles.inputContainerUnit)}>
                <Text style={[s(styles.formInputLabel), { color: activeColors.textMuted }]}>Destination Domain URL *</Text>
                <TextInput
                  style={[s(styles.formInputBlock), { borderColor: activeColors.border, color: activeColors.text, backgroundColor: activeColors.background }]}
                  placeholder="https://example.com"
                  placeholderTextColor={activeColors.textLight}
                  autoCapitalize="none"
                  keyboardType="url"
                  value={formData.url}
                  onChangeText={(val) => setFormData({ ...formData, url: val })}
                />
              </View>

              <View style={s(styles.inputContainerUnit)}>
                <Text style={[s(styles.formInputLabel), { color: activeColors.textMuted }]}>Platform Framework Architecture</Text>
                <TextInput
                  style={[s(styles.formInputBlock), { borderColor: activeColors.border, color: activeColors.text, backgroundColor: activeColors.background }]}
                  placeholder="e.g., WordPress, Next.js, Expo Web"
                  placeholderTextColor={activeColors.textLight}
                  value={formData.platform}
                  onChangeText={(val) => setFormData({ ...formData, platform: val })}
                />
              </View>

              <View style={s(styles.inputContainerUnit)}>
                <Text style={[s(styles.formInputLabel), { color: activeColors.textMuted }]}>Cloud Hosting Engine Provider</Text>
                <TextInput
                  style={[s(styles.formInputBlock), { borderColor: activeColors.border, color: activeColors.text, backgroundColor: activeColors.background }]}
                  placeholder="e.g., AWS EC2, Vercel Pipeline"
                  placeholderTextColor={activeColors.textLight}
                  value={formData.hostingProvider}
                  onChangeText={(val) => setFormData({ ...formData, hostingProvider: val })}
                />
              </View>

              <View style={s(styles.twoColumnInlineInputRow)}>
                <View style={[s(styles.inputContainerUnit), { flex: 1 }]}>
                  <Text style={[s(styles.formInputLabel), { color: activeColors.textMuted }]}>Login Access Identifier</Text>
                  <TextInput
                    style={[s(styles.formInputBlock), { borderColor: activeColors.border, color: activeColors.text, backgroundColor: activeColors.background }]}
                    placeholder="admin@email.com"
                    placeholderTextColor={activeColors.textLight}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={formData.loginEmail}
                    onChangeText={(val) => setFormData({ ...formData, loginEmail: val })}
                  />
                </View>
                <View style={[s(styles.inputContainerUnit), { flex: 1 }]}>
                  <Text style={[s(styles.formInputLabel), { color: activeColors.textMuted }]}>Access Keyphrase</Text>
                  <TextInput
                    style={[s(styles.formInputBlock), { borderColor: activeColors.border, color: activeColors.text, backgroundColor: activeColors.background }]}
                    placeholder="Password"
                    placeholderTextColor={activeColors.textLight}
                    autoCapitalize="none"
                    secureTextEntry
                    value={formData.loginPassword}
                    onChangeText={(val) => setFormData({ ...formData, loginPassword: val })}
                  />
                </View>
              </View>

              <View style={s(styles.inputContainerUnit)}>
                <Text style={[s(styles.formInputLabel), { color: activeColors.textMuted }]}>Operational Lifecycle Status</Text>
                <TouchableOpacity 
                  style={[s(styles.formCustomSelectPickerTrigger), { borderColor: activeColors.border, backgroundColor: activeColors.background }]}
                  onPress={() => setStatusMenuOpen(true)}
                >
                  <Text style={[s(styles.formCustomSelectPickerValueText), { color: activeColors.text }]}>{formData.status}</Text>
                  <Layers size={14} color={activeColors.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={s(styles.inputContainerUnit)}>
                <Text style={[s(styles.formInputLabel), { color: activeColors.textMuted }]}>Internal Documentation Notes</Text>
                <TextInput
                  style={[s(styles.formInputBlock), s(styles.formInputTextAreaBlock), { borderColor: activeColors.border, color: activeColors.text, backgroundColor: activeColors.background }]}
                  placeholder="Log specific deployment revisions or server instructions..."
                  placeholderTextColor={activeColors.textLight}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  value={formData.notes}
                  onChangeText={(val) => setFormData({ ...formData, notes: val })}
                />
              </View>
            </View>

            <View style={[s(styles.formActionSubmissionSectionRow), { borderTopColor: activeColors.borderLight }]}>
              <TouchableOpacity 
                style={[s(styles.formCancelDismissBtn), { borderColor: activeColors.border, backgroundColor: activeColors.surface }]} 
                onPress={() => setIsFormOpen(false)}
              >
                <Text style={[s(styles.formCancelDismissBtnText), { color: activeColors.textMuted }]}>Dismiss</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[s(styles.formSubmitActionBtn), { backgroundColor: activeColors.primary }]} 
                onPress={handleSave}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={s(styles.formSubmitActionBtnText)}>Commit Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal visible={statusMenuOpen} transparent={true} animationType="fade">
        <View style={s(styles.centeredModalDimOverlay)}>
          <View style={[s(styles.pickerOptionsPanelBox), { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
            <View style={[s(styles.pickerHeaderSection), { borderBottomColor: activeColors.borderLight }]}>
              <Text style={[s(styles.pickerHeaderTitleText), { color: activeColors.text }]}>Select Operational State</Text>
              <TouchableOpacity onPress={() => setStatusMenuOpen(false)}>
                <X size={16} color={activeColors.textMuted} />
              </TouchableOpacity>
            </View>
            {(["Live", "Maintenance", "Development", "Offline"] as Website["status"][]).map((stateOption) => (
              <TouchableOpacity
                key={stateOption}
                style={[s(styles.pickerRowOptionItem), formData.status === stateOption && [s(styles.activePickerRowOptionItem), { backgroundColor: activeColors.primaryLight }]]}
                onPress={() => {
                  setFormData({ ...formData, status: stateOption });
                  setStatusMenuOpen(false);
                }}
              >
                <Text style={[s(styles.pickerRowOptionItemText), { color: activeColors.textMuted }, formData.status === stateOption && [s(styles.activePickerRowOptionItemText), { color: activeColors.primary }]]}>
                  {stateOption}
                </Text>
                {formData.status === stateOption && <CheckCircle size={14} color={activeColors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      <Modal visible={isViewOpen} transparent={true} animationType="fade">
        <View style={s(styles.centeredModalDimOverlay)}>
          {viewingWebsite && (
            <View style={[s(styles.detailsViewOverlayDialogBox), { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
              <View style={[s(styles.detailsDialogHeaderBlock), { borderBottomColor: activeColors.borderLight }]}>
                <View style={s(styles.flexOne)}>
                  <Text style={[s(styles.detailsDialogTopMiniHeader), { color: activeColors.textLight }]}>Asset Profile Inspect</Text>
                  <Text style={[s(styles.detailsDialogMainTitleText), { color: activeColors.text }]}>{viewingWebsite.siteName}</Text>
                </View>
                <TouchableOpacity 
                  style={[s(styles.closeSheetCircleButton), { backgroundColor: activeColors.background }]} 
                  onPress={() => { setIsViewOpen(false); setViewingWebsite(null); }}
                >
                  <X size={16} color={activeColors.textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView style={s(styles.maxHeightFourHundred)} showsVerticalScrollIndicator={false}>
                <View style={s(styles.detailsInspectorSheetDataBody)}>
                  <View style={s(styles.inlineSplitDetailDataRow)}>
                    <View style={s(styles.flexOne)}>
                      <Text style={[s(styles.inspectorDataLabel), { color: activeColors.textMuted }]}>Infrastructure Status</Text>
                      <View style={[s(styles.statusBadge), statusThemes[viewingWebsite.status || "Offline"], s(styles.statusBadgeAlign)]}>
                        <Text style={[s(styles.statusBadgeText), { color: statusThemes[viewingWebsite.status || "Offline"]?.text }]}>
                          {viewingWebsite.status}
                        </Text>
                      </View>
                    </View>
                    <View style={s(styles.flexOne)}>
                      <Text style={[s(styles.inspectorDataLabel), { color: activeColors.textMuted }]}>Platform Matrix</Text>
                      <Text style={[s(styles.inspectorDataValueText), { color: activeColors.text }]}>{viewingWebsite.platform || "None declared"}</Text>
                    </View>
                  </View>

                  <View style={s(styles.inlineSplitDetailDataRow)}>
                    <View style={s(styles.flexOne)}>
                      <Text style={[s(styles.inspectorDataLabel), { color: activeColors.textMuted }]}>Cloud Server Host Engine</Text>
                      <Text style={[s(styles.inspectorDataValueText), { color: activeColors.text }]}>{viewingWebsite.hostingProvider || "None declared"}</Text>
                    </View>
                  </View>

                  <View style={[s(styles.credentialsVaultInspectionCard), { backgroundColor: activeColors.background, borderColor: activeColors.border }]}>
                    <View style={s(styles.vaultEntryBlockRow)}>
                      <View style={s(styles.flexOne)}>
                        <Text style={[s(styles.vaultMiniLabel), { color: activeColors.textLight }]}>Access Identifier / Email</Text>
                        <Text style={[s(styles.vaultMonospaceContentText), { color: activeColors.text }]} numberOfLines={1}>
                          {viewingWebsite.loginEmail || "No login identity configured"}
                        </Text>
                      </View>
                      {viewingWebsite.loginEmail && (
                        <TouchableOpacity 
                          style={[s(styles.vaultRowCopyActionBtn), { backgroundColor: activeColors.surface, borderColor: activeColors.border }]} 
                          onPress={() => copyToClipboard(viewingWebsite.loginEmail, "Email")}
                        >
                          {copiedField === "Email" ? <CheckCircle size={14} color={activeColors.success} /> : <Copy size={13} color={activeColors.textMuted} />}
                        </TouchableOpacity>
                      )}
                    </View>

                    <View style={[s(styles.vaultEntryBlockRow), s(styles.vaultRowDivider), { borderTopColor: activeColors.borderLight }]}>
                      <View style={s(styles.flexOne)}>
                        <Text style={[s(styles.vaultMiniLabel), { color: activeColors.textLight }]}>Encrypted Access Token</Text>
                        <Text style={[s(styles.vaultMonospaceContentText), { color: activeColors.text }]} numberOfLines={1}>
                          {viewingWebsite.loginPassword || "No passkey configured"}
                        </Text>
                      </View>
                      {viewingWebsite.loginPassword && (
                        <TouchableOpacity 
                          style={[s(styles.vaultRowCopyActionBtn), { backgroundColor: activeColors.surface, borderColor: activeColors.border }]} 
                          onPress={() => copyToClipboard(viewingWebsite.loginPassword, "Password")}
                        >
                          {copiedField === "Password" ? <CheckCircle size={14} color={activeColors.success} /> : <Copy size={13} color={activeColors.textMuted} />}
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  <View style={[s(styles.inspectorEndpointUrlLinkCardBlock), { backgroundColor: activeColors.primaryLight, borderColor: activeColors.border }]}>
                    <Text style={[s(styles.inspectorDataLabel), { color: activeColors.primary }]}>Destination End-Point URL</Text>
                    <TouchableOpacity 
                      style={s(styles.inspectorUrlTriggerRow)}
                      onPress={() => handleUrlRedirect(viewingWebsite.url)}
                    >
                      <Text style={[s(styles.inspectorUrlStringDisplay), { color: activeColors.primary }]} numberOfLines={1}>{viewingWebsite.url}</Text>
                      <ExternalLink size={13} color={activeColors.primary} />
                    </TouchableOpacity>
                  </View>

                  {viewingWebsite.notes && (
                    <View style={s(styles.marginTopSix)}>
                      <Text style={[s(styles.inspectorDataLabel), { color: activeColors.textMuted }]}>Internal Core Documentation Notes</Text>
                      <Text style={[s(styles.inspectorNotesTextContentBlock), { color: activeColors.textMuted }]}>{viewingWebsite.notes}</Text>
                    </View>
                  )}
                </View>
              </ScrollView>

              <View style={[s(styles.inspectorDetailsModalActionRowFooter), { borderTopColor: activeColors.borderLight }]}>
                <TouchableOpacity 
                  style={[s(styles.inspectorModalModifyActionBtn), { borderColor: activeColors.border }]}
                  onPress={() => {
                    setIsViewOpen(false);
                    handleEdit(viewingWebsite);
                  }}
                >
                  <Edit2 size={13} color={activeColors.textMuted} />
                  <Text style={[s(styles.inspectorModalModifyActionBtnText), { color: activeColors.textMuted }]}>Modify Node</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[s(styles.inspectorModalCloseDismissBtn), { backgroundColor: activeColors.text }]}
                  onPress={() => { setIsViewOpen(false); setViewingWebsite(null); }}
                >
                  <Text style={[s(styles.inspectorModalCloseDismissBtnText), { color: activeColors.surface }]}>Close Inspector</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  baseContainer: { 
    flex: 1 
  },
  scrollBlock: { 
    padding: 16 
  },
  addAssetPrimaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
      android: { elevation: 2 }
    })
  },
  addAssetPrimaryBtnText: { 
    color: "#fff", 
    fontSize: 14, 
    fontWeight: "600" 
  },
  loaderMargin: { 
    marginTop: 32 
  },
  emptyCardState: { 
    alignItems: "center", 
    justifyContent: "center", 
    padding: 32, 
    borderRadius: 12, 
    borderWidth: 1, 
    borderStyle: "dashed", 
    gap: 10, 
    marginTop: 12 
  },
  emptyCardText: { 
    fontSize: 13, 
    textAlign: "center", 
    lineHeight: 18 
  },
  entriesDirectoryStack: { 
    gap: 12 
  },
  websiteItemRowCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.02, shadowRadius: 3 },
      android: { elevation: 1 }
    })
  },
  cardHeaderTopLine: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "flex-start", 
    borderBottomWidth: 1, 
    paddingBottom: 10 
  },
  cardMainTitle: { 
    fontSize: 15, 
    fontWeight: "600" 
  },
  inlineUrlLinkRow: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 4, 
    marginTop: 3 
  },
  inlineUrlLinkText: { 
    fontSize: 12, 
    marginRight: 2 
  },
  statusBadge: { 
    paddingHorizontal: 8, 
    paddingVertical: 3, 
    borderRadius: 6, 
    borderWidth: 1 
  },
  statusBadgeText: { 
    fontSize: 10, 
    fontWeight: "700", 
    textTransform: "uppercase", 
    letterSpacing: 0.3 
  },
  cardMetaGridInfo: { 
    flexDirection: "row", 
    gap: 16, 
    marginTop: 10, 
    paddingBottom: 10 
  },
  metaRowItem: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 6, 
    flex: 1 
  },
  metaRowText: { 
    fontSize: 12 
  },
  cardFooterActionsFlex: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    borderTopWidth: 1, 
    paddingTop: 10, 
    marginTop: 4 
  },
  indexCounterText: { 
    fontVariant: ["tabular-nums"], 
    fontSize: 11, 
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace" 
  },
  actionButtonGroup: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 4 
  },
  rowIconActionButton: { 
    padding: 6, 
    borderRadius: 6, 
    borderWidth: 1 
  },
  modalScrollFormContainer: { 
    flex: 1 
  },
  modalSheetFormHeader: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    padding: 16, 
    borderBottomWidth: 1 
  },
  modalSheetFormTitle: { 
    fontSize: 16, 
    fontWeight: "700" 
  },
  closeSheetCircleButton: { 
    padding: 6, 
    borderRadius: 16 
  },
  innerFormKeyboardPadding: { 
    padding: 16, 
    paddingBottom: 40 
  },
  formInputSectionSpace: { 
    gap: 14 
  },
  inputContainerUnit: { 
    flexDirection: "column" 
  },
  formInputLabel: { 
    fontSize: 13, 
    fontWeight: "500", 
    marginBottom: 5 
  },
  formInputBlock: { 
    borderWidth: 1, 
    borderRadius: 8, 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    fontSize: 14 
  },
  twoColumnInlineInputRow: { 
    flexDirection: "row", 
    gap: 12 
  },
  formCustomSelectPickerTrigger: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    borderWidth: 1, 
    borderRadius: 8, 
    paddingHorizontal: 12, 
    paddingVertical: 10 
  },
  formCustomSelectPickerValueText: { 
    fontSize: 14, 
    fontWeight: "500" 
  },
  formInputTextAreaBlock: { 
    minHeight: 80, 
    paddingVertical: 10 
  },
  formActionSubmissionSectionRow: { 
    flexDirection: "row", 
    gap: 12, 
    marginTop: 24, 
    paddingTop: 16, 
    borderTopWidth: 1 
  },
  formCancelDismissBtn: { 
    flex: 1, 
    paddingVertical: 12, 
    borderWidth: 1, 
    borderRadius: 8, 
    alignItems: "center" 
  },
  formCancelDismissBtnText: { 
    fontSize: 14, 
    fontWeight: "600" 
  },
  formSubmitActionBtn: { 
    flex: 2, 
    paddingVertical: 12, 
    borderRadius: 8, 
    alignItems: "center", 
    justifyContent: "center" 
  },
  formSubmitActionBtnText: { 
    fontSize: 14, 
    fontWeight: "600", 
    color: "#fff" 
  },
  centeredModalDimOverlay: { 
    flex: 1, 
    backgroundColor: "rgba(0,0,0,0.5)", 
    justifyContent: "center", 
    alignItems: "center", 
    padding: 20 
  },
  pickerOptionsPanelBox: { 
    width: "100%", 
    maxWidth: 300, 
    borderRadius: 12, 
    padding: 16, 
    borderWidth: 1 
  },
  pickerHeaderSection: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    paddingBottom: 10, 
    borderBottomWidth: 1, 
    marginBottom: 8 
  },
  pickerHeaderTitleText: { 
    fontSize: 14, 
    fontWeight: "600" 
  },
  pickerRowOptionItem: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    paddingVertical: 10, 
    paddingHorizontal: 8, 
    borderRadius: 6 
  },
  activePickerRowOptionItem: {},
  pickerRowOptionItemText: { 
    fontSize: 14 
  },
  activePickerRowOptionItemText: { 
    fontWeight: "600" 
  },
  detailsViewOverlayDialogBox: { 
    width: "100%", 
    maxWidth: 360, 
    borderRadius: 16, 
    padding: 16, 
    borderWidth: 1 
  },
  detailsDialogHeaderBlock: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "flex-start", 
    borderBottomWidth: 1, 
    paddingBottom: 12, 
    marginBottom: 12 
  },
  detailsDialogTopMiniHeader: { 
    fontSize: 10, 
    fontWeight: "700", 
    textTransform: "uppercase", 
    letterSpacing: 0.5 
  },
  detailsDialogMainTitleText: { 
    fontSize: 16, 
    fontWeight: "700", 
    marginTop: 2 
  },
  detailsInspectorSheetDataBody: { 
    gap: 14 
  },
  inlineSplitDetailDataRow: { 
    flexDirection: "row", 
    gap: 12 
  },
  inspectorDataLabel: { 
    fontSize: 10, 
    fontWeight: "700", 
    textTransform: "uppercase", 
    letterSpacing: 0.3 
  },
  inspectorDataValueText: { 
    fontSize: 13, 
    fontWeight: "500", 
    marginTop: 2 
  },
  credentialsVaultInspectionCard: { 
    borderWidth: 1, 
    borderRadius: 10, 
    padding: 12, 
    marginVertical: 4 
  },
  vaultEntryBlockRow: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "space-between", 
    gap: 8 
  },
  vaultMiniLabel: { 
    fontSize: 9, 
    fontWeight: "700", 
    textTransform: "uppercase" 
  },
  vaultMonospaceContentText: { 
    fontSize: 12, 
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace", 
    marginTop: 2 
  },
  vaultRowCopyActionBtn: { 
    padding: 6, 
    borderWidth: 1, 
    borderRadius: 6 
  },
  inspectorEndpointUrlLinkCardBlock: { 
    borderWidth: 1, 
    padding: 12, 
    borderRadius: 8 
  },
  inspectorUrlTriggerRow: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "space-between", 
    gap: 8, 
    marginTop: 4 
  },
  inspectorUrlStringDisplay: { 
    flex: 1, 
    fontSize: 12, 
    fontWeight: "500" 
  },
  inspectorNotesTextContentBlock: { 
    fontSize: 12, 
    lineHeight: 18, 
    marginTop: 3 
  },
  inspectorDetailsModalActionRowFooter: { 
    flexDirection: "row", 
    gap: 10, 
    marginTop: 20, 
    paddingTop: 12, 
    borderTopWidth: 1 
  },
  inspectorModalModifyActionBtn: { 
    flex: 1, 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "center", 
    gap: 6, 
    paddingVertical: 10, 
    borderWidth: 1, 
    borderRadius: 8 
  },
  inspectorModalModifyActionBtnText: { 
    fontSize: 13, 
    fontWeight: "600" 
  },
  inspectorModalCloseDismissBtn: { 
    flex: 1, 
    paddingVertical: 10, 
    borderRadius: 8, 
    alignItems: "center", 
    justifyContent: "center" 
  },
  inspectorModalCloseDismissBtnText: { 
    fontSize: 13, 
    fontWeight: "600" 
  },
  flexOne: { 
    flex: 1 
  },
  flexOnePadding: { 
    flex: 1, 
    paddingRight: 8 
  },
  chevronMargin: { 
    marginLeft: 4 
  },
  statusBadgeAlign: { 
    alignSelf: "flex-start", 
    marginTop: 4 
  },
  vaultRowDivider: { 
    borderTopWidth: 1, 
    paddingTop: 8, 
    marginTop: 8 
  },
  marginTopSix: { 
    marginTop: 6 
  },
  maxHeightFourHundred: { 
    maxHeight: 400 
  }
});