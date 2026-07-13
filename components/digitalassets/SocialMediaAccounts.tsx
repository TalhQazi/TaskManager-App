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
  Platform,
  Clipboard
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/services/api";
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  X, 
  CheckCircle, 
  Copy,
  Eye,
  EyeOff,
  Globe,
  ClipboardCheck,
  ExternalLink
} from "lucide-react-native";
import { useTheme } from "@/contexts/ThemeContext";
import { s } from "@/util/styles";

interface SocialMediaAccount {
  _id: string;
  platform: string;
  brand: string;
  url: string;
  username: string;
  accountHandle: string;
  accountEmail?: string;
  password?: string;
  status: "Active" | "Inactive" | "Suspended";
  notes: string;
  createdAt: string;
}

interface ApiResponse<T> {
  success?: boolean;
  data?: {
    items?: T[];
  };
  items?: T[];
}

const platformOptions = [
  "Instagram",
  "Facebook",
  "YouTube",
  "TikTok",
  "LinkedIn",
  "X (Twitter)",
  "Liberty social",
  "Rumble",
  "Truth Social",
  "Threads",
  "Other",
];

export function SocialMediaAccounts() {
  const themeContext = useTheme();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [platformPickerOpen, setPlatformPickerOpen] = useState(false);
  const [statusPickerOpen, setStatusPickerOpen] = useState(false);

  const [selectedAccount, setSelectedAccount] = useState<SocialMediaAccount | null>(null);
  const [viewingAccount, setViewingAccount] = useState<SocialMediaAccount | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [securePasswordDisplay, setSecurePasswordDisplay] = useState(true);

  const [formData, setFormData] = useState<Partial<SocialMediaAccount>>({
    platform: "",
    brand: "",
    url: "",
    username: "",
    accountHandle: "",
    accountEmail: "",
    password: "",
    status: "Active",
    notes: "",
  });

  const activeColors = useMemo(() => {
    const uiTheme = themeContext?.uiTheme;
    const currentTheme = uiTheme?.theme as unknown as string;
    const isDark = currentTheme === "dark" || currentTheme === "metallic-elite";

    return {
      background: uiTheme?.panelColors?.dashboardBackground || (isDark ? "#090a0f" : "#f8fafc"),
      surface: uiTheme?.panelColors?.dashboardCardBackground || (isDark ? "#0f1117" : "#ffffff"),
      border: uiTheme?.panelColors?.borderColor || (isDark ? "rgba(255,255,255,0.08)" : "#e2e8f0"),
      borderLight: uiTheme?.panelColors?.borderColor || (isDark ? "rgba(255,255,255,0.04)" : "#f1f5f9"),
      surfaceVariant: isDark ? "rgba(255,255,255,0.05)" : "#f1f5f9",
      text: uiTheme?.panelColors?.dashboardTextColor || (isDark ? "#ffffff" : "#0f172a"),
      textMuted: isDark ? "#94a3b8" : "#64748b",
      textLight: isDark ? "#64748b" : "#94a3b8",
      primary: uiTheme?.customColors?.primary || "#6366f1",
      primaryLight: isDark ? "rgba(99, 102, 241, 0.15)" : "#f5f3ff",
      danger: "#ef4444",
      dangerBg: isDark ? "rgba(239, 68, 68, 0.15)" : "#fee2e2",
      dangerBorder: isDark ? "rgba(239, 68, 68, 0.3)" : "#fca5a5",
      success: isDark ? "#4ade80" : "#166534",
      successBg: isDark ? "rgba(34, 197, 94, 0.15)" : "#dcfce7",
      successBorder: isDark ? "rgba(34, 197, 94, 0.3)" : "#bbf7d0",
      purple: isDark ? "#a855f7" : "#4f46e5",
      purpleLight: isDark ? "rgba(168, 85, 247, 0.15)" : "#f5f3ff",
      overlay: isDark ? "rgba(0, 0, 0, 0.6)" : "rgba(15, 23, 42, 0.4)",
    };
  }, [themeContext]);

  const statusThemes = useMemo(() => {
    return {
      Active: { bg: activeColors.successBg, text: activeColors.success, border: activeColors.successBorder },
      Inactive: { bg: activeColors.surfaceVariant, text: activeColors.textMuted, border: activeColors.border },
      Suspended: { bg: activeColors.dangerBg, text: activeColors.danger, border: activeColors.dangerBorder },
    };
  }, [activeColors]);

  const styles = useMemo(() => getStyles(activeColors), [activeColors]);

  const accountsQuery = useQuery<SocialMediaAccount[]>({
    queryKey: ["social-media-accounts"],
    queryFn: async () => {
      const res = (await apiRequest<any>("/social-media")) as ApiResponse<SocialMediaAccount>;
      const items = res?.items || res?.data?.items || [];
      return items.map((item: any) => ({
        ...item,
        username: item.username || item.accountHandle || "",
      }));
    },
  });

  const accounts = useMemo(() => {
    let list = (accountsQuery.data || []).slice();

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((a) => {
        const platform = String(a.platform || "").toLowerCase();
        const brand = String(a.brand || "").toLowerCase();
        const username = String(a.username || "").toLowerCase();
        const handle = String(a.accountHandle || "").toLowerCase();
        const notes = String(a.notes || "").toLowerCase();
        return platform.includes(q) || brand.includes(q) || username.includes(q) || handle.includes(q) || notes.includes(q);
      });
    }

    return list.sort((a, b) => String(a.platform || "").localeCompare(String(b.platform || "")));
  }, [accountsQuery.data, searchQuery]);

  const resetForm = () => {
    setFormData({
      platform: "",
      brand: "",
      url: "",
      username: "",
      accountHandle: "",
      accountEmail: "",
      password: "",
      status: "Active",
      notes: "",
    });
    setSelectedAccount(null);
  };

  const handleSave = async () => {
    const handle = formData.accountHandle || formData.username;

    if (!formData.platform || !handle) {
      Alert.alert("Validation Error", "Platform structure designation and Username are mandatory fields.");
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        ...formData,
        accountHandle: handle,
        username: formData.username || handle,
      };

      if (selectedAccount) {
        await apiRequest(`/social-media/${selectedAccount._id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest("/social-media", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      await accountsQuery.refetch();
      setIsFormOpen(false);
      resetForm();
    } catch (err) {
      Alert.alert("Persistence Error", err instanceof Error ? err.message : "Failed to sync structural changes.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (account: SocialMediaAccount) => {
    Alert.alert(
      "Confirm Removal",
      `Are you sure you want to delete access reference credentials for @${account.username} (${account.platform})?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Profile",
          style: "destructive",
          onPress: async () => {
            try {
              await apiRequest(`/social-media/${account._id}`, { method: "DELETE" });
              await accountsQuery.refetch();
              if (isViewOpen) setIsViewOpen(false);
            } catch (err) {
              Alert.alert("Error", err instanceof Error ? err.message : "Failed to purge record safely.");
            }
          },
        },
      ]
    );
  };

  const handleUrlRedirect = async (urlStr: string) => {
    if (!urlStr) return;
    const format = urlStr.startsWith("http") ? urlStr : `https://${urlStr}`;
    try {
      const balance = await Linking.canOpenURL(format);
      if (balance) await Linking.openURL(format);
    } catch {
      Alert.alert("Linkage Failure", "Cannot resolve external browser path routing.");
    }
  };

  const triggerClipboardCopy = (text: string, label: string) => {
    if (!text) return;
    Clipboard.setString(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <SafeAreaView style={styles.baseLayoutContainer}>
      <View style={styles.headerSearchBarArea}>
        <View style={styles.searchBarWrapper}>
          <Search size={16} color={activeColors.textLight} style={styles.searchIconAbsolute} />
          <TextInput
            style={styles.searchBarInputField}
            placeholder="Search platform, brand, profile..."
            placeholderTextColor={activeColors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
        </View>
        <TouchableOpacity 
          style={styles.addAssetFabBtn} 
          activeOpacity={0.85} 
          onPress={() => { resetForm(); setIsFormOpen(true); }}
        >
          <Plus size={16} color="#fff" />
          <Text style={styles.addAssetFabBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollBlockLayout} showsVerticalScrollIndicator={false}>
        {accountsQuery.isLoading ? (
          <ActivityIndicator size="small" color={activeColors.primary} style={styles.loaderSpacing} />
        ) : accounts.length === 0 ? (
          <View style={styles.emptyCardState}>
            <Globe size={32} color={activeColors.textMuted} />
            <Text style={styles.emptyCardText}>No matching social identity matrices mapped into directory database architecture.</Text>
          </View>
        ) : (
          <View style={styles.entriesDirectoryStack}>
            {accounts.map((account, index) => {
              const theme = statusThemes[account.status] || statusThemes["Active"];
              return (
                <TouchableOpacity 
                  key={account._id} 
                  style={styles.accountRowItemCard}
                  activeOpacity={0.7}
                  onPress={() => { setViewingAccount(account); setIsViewOpen(true); }}
                >
                  <View style={styles.cardHeaderTopLine}>
                    <View style={styles.titleBlockContainer}>
                      <View style={styles.titleMetaFlexWrap}>
                        <Text style={styles.cardMainTitle}>{account.platform}</Text>
                        {account.brand ? <Text style={styles.brandSubTitleText}>• {account.brand}</Text> : null}
                      </View>
                      <Text style={styles.profileHandleText}>@{account.username}</Text>
                    </View>
                    
                    <View style={[styles.statusBadge, { backgroundColor: theme.bg, borderColor: theme.border }]}>
                      <Text style={[styles.statusBadgeText, { color: theme.text }]}>{account.status}</Text>
                    </View>
                  </View>

                  {account.notes ? (
                    <Text style={styles.conceptTextContentDisplay} numberOfLines={1}>{account.notes}</Text>
                  ) : null}

                  <View style={styles.cardFooterActionsFlex}>
                    <Text style={styles.indexCounterText}>#{(index + 1).toString().padStart(2, "0")}</Text>
                    <View style={styles.actionButtonGroup}>
                      {account.url ? (
                        <TouchableOpacity style={styles.rowIconActionButton} onPress={() => handleUrlRedirect(account.url)}>
                          <ExternalLink size={12} color={activeColors.textMuted} />
                        </TouchableOpacity>
                      ) : null}
                      <TouchableOpacity 
                        style={styles.rowIconActionButton} 
                        onPress={() => { setSelectedAccount(account); setFormData(account); setIsFormOpen(true); }}
                      >
                        <Edit2 size={12} color={activeColors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.rowIconActionButton} onPress={() => handleDelete(account)}>
                        <Trash2 size={12} color={activeColors.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      <Modal visible={isFormOpen} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalScrollFormContainer}>
          <View style={styles.modalSheetFormHeader}>
            <Text style={styles.modalSheetFormTitle}>{selectedAccount ? "Update Matrix Identity" : "Map New Platform Boundary"}</Text>
            <TouchableOpacity onPress={() => setIsFormOpen(false)} style={styles.closeSheetCircleButton}>
              <X size={16} color={activeColors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.innerFormKeyboardPadding} keyboardShouldPersistTaps="handled">
            <View style={styles.formInputSectionSpace}>
              
              <View style={styles.inputContainerUnit}>
                <Text style={styles.formInputLabel}>Social Platform Core Engine *</Text>
                <TouchableOpacity style={styles.formCustomSelectPickerTrigger} onPress={() => setPlatformPickerOpen(true)}>
                  <Text style={styles.formCustomSelectPickerValueText}>{formData.platform || "Select platform target network"}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inputContainerUnit}>
                <Text style={styles.formInputLabel}>Associated Enterprise Brand</Text>
                <TextInput
                  style={styles.formInputBlock}
                  placeholder="e.g., Nootech Production Engine"
                  placeholderTextColor={activeColors.textMuted}
                  value={formData.brand}
                  onChangeText={(val) => setFormData({ ...formData, brand: val })}
                />
              </View>

              <View style={styles.inputContainerUnit}>
                <Text style={styles.formInputLabel}>Target Base Account Profile URL</Text>
                <TextInput
                  style={styles.formInputBlock}
                  placeholder="https://instagram.com/workspace"
                  placeholderTextColor={activeColors.textMuted}
                  autoCapitalize="none"
                  keyboardType="url"
                  value={formData.url}
                  onChangeText={(val) => setFormData({ ...formData, url: val })}
                />
              </View>

              <View style={styles.inputContainerUnit}>
                <Text style={styles.formInputLabel}>Account Username / Handler *</Text>
                <TextInput
                  style={styles.formInputBlock}
                  placeholder="e.g., dev_ops_admin"
                  placeholderTextColor={activeColors.textMuted}
                  autoCapitalize="none"
                  value={formData.username}
                  onChangeText={(val) => setFormData({ ...formData, username: val, accountHandle: val })}
                />
              </View>

              <View style={styles.twoColumnInlineInputRow}>
                <View style={styles.flexOne}>
                  <Text style={styles.formInputLabel}>Login Registered Email</Text>
                  <TextInput
                    style={styles.formInputBlock}
                    placeholder="vault@domain.in"
                    placeholderTextColor={activeColors.textMuted}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={formData.accountEmail}
                    onChangeText={(val) => setFormData({ ...formData, accountEmail: val })}
                  />
                </View>
                <View style={styles.flexOne}>
                  <Text style={styles.formInputLabel}>Passphrase Cipher</Text>
                  <TextInput
                    style={styles.formInputBlock}
                    placeholder="🔑 Safe token string"
                    placeholderTextColor={activeColors.textMuted}
                    autoCapitalize="none"
                    value={formData.password}
                    onChangeText={(val) => setFormData({ ...formData, password: val })}
                  />
                </View>
              </View>

              <View style={styles.inputContainerUnit}>
                <Text style={styles.formInputLabel}>Directory Operations Status</Text>
                <TouchableOpacity style={styles.formCustomSelectPickerTrigger} onPress={() => setStatusPickerOpen(true)}>
                  <Text style={styles.formCustomSelectPickerValueText}>{formData.status}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inputContainerUnit}>
                <Text style={styles.formInputLabel}>Internal Strategic Notes</Text>
                <TextInput
                  style={[styles.formInputBlock, styles.formInputTextAreaBlock]}
                  placeholder="Write programmatic logic, configurations, recovery protocols..."
                  placeholderTextColor={activeColors.textMuted}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  value={formData.notes}
                  onChangeText={(val) => setFormData({ ...formData, notes: val })}
                />
              </View>
            </View>

            <View style={styles.formActionSubmissionSectionRow}>
              <TouchableOpacity style={styles.formCancelDismissBtn} onPress={() => setIsFormOpen(false)}>
                <Text style={styles.formCancelDismissBtnText}>Dismiss</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.formSubmitActionBtn} onPress={handleSave} disabled={isSubmitting}>
                {isSubmitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.formSubmitActionBtnText}>Sync Profile</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal visible={platformPickerOpen} transparent={true} animationType="fade">
        <View style={styles.centeredModalDimOverlay}>
          <View style={styles.pickerOptionsPanelBox}>
            <View style={styles.pickerHeaderSection}>
              <Text style={styles.pickerHeaderTitleText}>Platform Engine Node</Text>
              <TouchableOpacity onPress={() => setPlatformPickerOpen(false)}><X size={16} color={activeColors.textMuted} /></TouchableOpacity>
            </View>
            <ScrollView style={styles.maxHeightScrollPanel} showsVerticalScrollIndicator={false}>
              {platformOptions.map((plt) => (
                <TouchableOpacity
                  key={plt}
                  style={[styles.pickerRowOptionItem, formData.platform === plt && styles.activePickerRowOptionItem]}
                  onPress={() => { setFormData({ ...formData, platform: plt }); setPlatformPickerOpen(false); }}
                >
                  <Text style={[styles.pickerRowOptionItemText, formData.platform === plt && styles.activePickerRowOptionItemText]}>{plt}</Text>
                  {formData.platform === plt && <CheckCircle size={14} color={activeColors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={statusPickerOpen} transparent={true} animationType="fade">
        <View style={styles.centeredModalDimOverlay}>
          <View style={styles.pickerOptionsPanelBox}>
            <View style={styles.pickerHeaderSection}>
              <Text style={styles.pickerHeaderTitleText}>Directory Node Status</Text>
              <TouchableOpacity onPress={() => setStatusPickerOpen(false)}><X size={16} color={activeColors.textMuted} /></TouchableOpacity>
            </View>
            {["Active", "Inactive", "Suspended"].map((st) => (
              <TouchableOpacity
                key={st}
                style={[styles.pickerRowOptionItem, formData.status === st && styles.activePickerRowOptionItem]}
                onPress={() => { setFormData({ ...formData, status: st as any }); setStatusPickerOpen(false); }}
              >
                <Text style={[styles.pickerRowOptionItemText, formData.status === st && styles.activePickerRowOptionItemText]}>{st}</Text>
                {formData.status === st && <CheckCircle size={14} color={activeColors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      <Modal visible={isViewOpen} transparent={true} animationType="fade">
        <View style={styles.centeredModalDimOverlay}>
          {viewingAccount ? (
            <View style={styles.inspectorDetailOverlayCard}>
              <View style={styles.inspectorHeaderBlock}>
                <View style={styles.flexOne}>
                  <Text style={styles.inspectorPlatformMainTitle}>{viewingAccount.platform}</Text>
                  <Text style={styles.inspectorHandleSubText}>@{viewingAccount.username}</Text>
                </View>
                <TouchableOpacity 
                  onPress={() => { setIsViewOpen(false); setViewingAccount(null); setSecurePasswordDisplay(true); }}
                  style={styles.inspectorCloseCircleBtn}
                >
                  <X size={14} color={activeColors.textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.maxHeightInspectorScroll} showsVerticalScrollIndicator={false}>
                <View style={styles.inspectorInformationGridStack}>
                  
                  <View style={styles.twoColumnInlineInputRow}>
                    <View style={styles.flexOne}>
                      <Text style={styles.metaDataHeaderMiniLabel}>Brand Mapping</Text>
                      <Text style={styles.metaDataTextValue}>{viewingAccount.brand || "—"}</Text>
                    </View>
                    <View style={styles.flexOne}>
                      <Text style={styles.metaDataHeaderMiniLabel}>Status State</Text>
                      <View style={[styles.statusBadge, { backgroundColor: statusThemes[viewingAccount.status]?.bg, borderColor: statusThemes[viewingAccount.status]?.border, alignSelf: "flex-start", marginTop: s(4) }]}>
                        <Text style={[styles.statusBadgeText, { color: statusThemes[viewingAccount.status]?.text }]}>{viewingAccount.status}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.credentialsIntegrationVaultSafeBox}>
                    <Text style={styles.credentialsVaultHeaderMiniTitle}>Access Cryptography Parameters</Text>
                    
                    <View style={styles.credentialSecretInteractiveDataRow}>
                      <View style={styles.flexOne}>
                        <Text style={styles.vaultMetaFieldMiniLabel}>Registered Gateway Email</Text>
                        <Text style={styles.vaultValueMonoTextString} numberOfLines={1}>{viewingAccount.accountEmail || "None defined"}</Text>
                      </View>
                      {viewingAccount.accountEmail ? (
                        <TouchableOpacity 
                          style={styles.vaultActionIconButtonUnit}
                          onPress={() => triggerClipboardCopy(viewingAccount.accountEmail!, "email")}
                        >
                          {copiedField === "email" ? <ClipboardCheck size={13} color={activeColors.success} /> : <Copy size={13} color={activeColors.purple} />}
                        </TouchableOpacity>
                      ) : null}
                    </View>

                    <View style={styles.vaultInteractiveDividerRow}>
                      <View style={styles.flexOne}>
                        <Text style={styles.vaultMetaFieldMiniLabel}>Passphrase Code String</Text>
                        <Text style={styles.vaultValueMonoTextString} numberOfLines={1}>
                          {viewingAccount.password ? (securePasswordDisplay ? "••••••••••••" : viewingAccount.password) : "None mapped"}
                        </Text>
                      </View>
                      {viewingAccount.password ? (
                        <View style={styles.rowFlexGap}>
                          <TouchableOpacity style={styles.vaultActionIconButtonUnit} onPress={() => setSecurePasswordDisplay(!securePasswordDisplay)}>
                            {securePasswordDisplay ? <Eye size={13} color={activeColors.textMuted} /> : <EyeOff size={13} color={activeColors.textMuted} />}
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={styles.vaultActionIconButtonUnit}
                            onPress={() => triggerClipboardCopy(viewingAccount.password!, "pass")}
                          >
                            {copiedField === "pass" ? <ClipboardCheck size={13} color={activeColors.success} /> : <Copy size={13} color={activeColors.purple} />}
                          </TouchableOpacity>
                        </View>
                      ) : null}
                    </View>
                  </View>

                  {viewingAccount.url ? (
                    <View>
                      <Text style={styles.metaDataHeaderMiniLabel}>Target Gateway Anchor URL</Text>
                      <TouchableOpacity style={styles.inspectorInlineUrlRoutingRow} onPress={() => handleUrlRedirect(viewingAccount.url)}>
                        <Text style={styles.inspectorUrlRoutingText} numberOfLines={1}>{viewingAccount.url}</Text>
                        <ExternalLink size={12} color={activeColors.primary} />
                      </TouchableOpacity>
                    </View>
                  ) : null}

                  {viewingAccount.notes ? (
                    <View>
                      <Text style={styles.metaDataHeaderMiniLabel}>Logistical Operation Details</Text>
                      <Text style={styles.inspectorNotesParagraphText}>{viewingAccount.notes}</Text>
                    </View>
                  ) : null}

                </View>
              </ScrollView>

              <View style={styles.inspectorActionControlFooterButtonsRow}>
                <TouchableOpacity 
                  style={styles.inspectorEditActionControlBtn}
                  onPress={() => {
                    const current = viewingAccount;
                    setIsViewOpen(false);
                    setViewingAccount(null);
                    setSecurePasswordDisplay(true);
                    setSelectedAccount(current);
                    setFormData(current);
                    setIsFormOpen(true);
                  }}
                >
                  <Edit2 size={13} color={activeColors.text} />
                  <Text style={styles.inspectorEditActionControlBtnText}>Modify Node Parameters</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.inspectorDismissCloseControlBtn} 
                  onPress={() => { setIsViewOpen(false); setViewingAccount(null); setSecurePasswordDisplay(true); }}
                >
                  <Text style={styles.inspectorDismissCloseControlBtnText}>Dismiss</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const getStyles = (activeColors: any) => StyleSheet.create({
  baseLayoutContainer: { flex: 1, backgroundColor: activeColors.background },
  headerSearchBarArea: { flexDirection: "row", paddingHorizontal: s(16), paddingTop: s(14), paddingBottom: s(2), gap: s(10), alignItems: "center" },
  searchBarWrapper: { flex: 1, position: "relative", justifyContent: "center" },
  searchIconAbsolute: { position: "absolute", left: s(12), zIndex: 5 },
  searchBarInputField: { height: s(38), backgroundColor: activeColors.surface, borderWidth: 1, borderColor: activeColors.border, borderRadius: s(8), paddingLeft: s(36), paddingRight: s(12), fontSize: 13, color: activeColors.text },
  flexOne: { flex: 1 },
  loaderSpacing: { marginTop: s(32) },
  titleBlockContainer: { flex: 1, paddingRight: s(6) },
  titleMetaFlexWrap: { flexDirection: "row", alignItems: "center", gap: s(6), flexWrap: "wrap" },
  rowFlexGap: { flexDirection: "row", gap: s(4) },
  maxHeightScrollPanel: { maxHeight: s(280) },
  maxHeightInspectorScroll: { maxHeight: s(350) },
  
  addAssetFabBtn: { flexDirection: "row", alignItems: "center", gap: s(4), backgroundColor: activeColors.primary, height: s(38), paddingHorizontal: s(14), borderRadius: s(8) },
  addAssetFabBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  
  scrollBlockLayout: { padding: s(16), paddingTop: s(12) },
  emptyCardState: { alignItems: "center", justifyContent: "center", padding: s(32), backgroundColor: activeColors.surface, borderRadius: s(12), borderWidth: 1, borderColor: activeColors.border, borderStyle: "dashed", gap: s(10) },
  emptyCardText: { color: activeColors.textLight, fontSize: 13, textAlign: "center", lineHeight: 18 },

  entriesDirectoryStack: { gap: s(10) },
  accountRowItemCard: {
    backgroundColor: activeColors.surface,
    borderRadius: s(12),
    padding: s(14),
    borderWidth: 1,
    borderColor: activeColors.border,
    ...Platform.select({
      ios: { shadowColor: activeColors.text, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 3 },
      android: { elevation: 1 }
    })
  },
  cardHeaderTopLine: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  cardMainTitle: { fontSize: 14, fontWeight: "700", color: activeColors.text },
  brandSubTitleText: { fontSize: 12, color: activeColors.textMuted, fontWeight: "500" },
  profileHandleText: { fontSize: 13, color: activeColors.purple, fontWeight: "600", marginTop: s(2) },
  
  statusBadge: { paddingHorizontal: s(6), paddingVertical: s(2), borderRadius: s(4), borderWidth: 1 },
  statusBadgeText: { fontSize: 8, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.3 },

  conceptTextContentDisplay: { fontSize: 12, color: activeColors.textMuted, marginTop: s(10), backgroundColor: activeColors.background, paddingHorizontal: s(8), paddingVertical: s(6), borderRadius: s(6), borderWidth: 1, borderColor: activeColors.borderLight },

  cardFooterActionsFlex: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: activeColors.borderLight, paddingTop: s(8), marginTop: s(10) },
  indexCounterText: { fontSize: 11, fontFamily: Platform.OS === "ios" ? "Courier" : "monospace", color: activeColors.textLight },
  actionButtonGroup: { flexDirection: "row", alignItems: "center", gap: s(6) },
  rowIconActionButton: { padding: s(6), borderRadius: s(6), backgroundColor: activeColors.background, borderWidth: 1, borderColor: activeColors.borderLight },

  modalScrollFormContainer: { flex: 1, backgroundColor: activeColors.surface },
  modalSheetFormHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: s(16), borderBottomWidth: 1, borderBottomColor: activeColors.borderLight },
  modalSheetFormTitle: { fontSize: 15, fontWeight: "700", color: activeColors.text },
  closeSheetCircleButton: { padding: s(6), backgroundColor: activeColors.borderLight, borderRadius: s(16) },

  innerFormKeyboardPadding: { padding: s(16), paddingBottom: s(40) },
  formInputSectionSpace: { gap: s(14) },
  inputContainerUnit: { flexDirection: "column" },
  formInputLabel: { fontSize: 12, fontWeight: "600", color: activeColors.textMuted, marginBottom: s(5) },
  formInputBlock: { borderWidth: 1, borderColor: activeColors.border, borderRadius: s(8), paddingHorizontal: s(12), paddingVertical: s(8), fontSize: 14, color: activeColors.text, backgroundColor: activeColors.surface },
  twoColumnInlineInputRow: { flexDirection: "row", gap: s(12) },
  formCustomSelectPickerTrigger: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: activeColors.border, borderRadius: s(8), paddingHorizontal: s(12), paddingVertical: s(9), backgroundColor: activeColors.surface, minHeight: s(40) },
  formCustomSelectPickerValueText: { fontSize: 13, fontWeight: "500", color: activeColors.text },
  formInputTextAreaBlock: { minHeight: s(70), paddingVertical: s(8) },

  formActionSubmissionSectionRow: { flexDirection: "row", gap: s(12), marginTop: s(24), paddingTop: s(16), borderTopWidth: 1, borderTopColor: activeColors.borderLight },
  formCancelDismissBtn: { flex: 1, paddingVertical: s(12), borderWidth: 1, borderColor: activeColors.border, borderRadius: s(8), alignItems: "center", backgroundColor: activeColors.surface },
  formCancelDismissBtnText: { fontSize: 14, fontWeight: "600", color: activeColors.textMuted },
  formSubmitActionBtn: { flex: 2, paddingVertical: s(12), backgroundColor: activeColors.primary, borderRadius: s(8), alignItems: "center", justifyContent: "center" },
  formSubmitActionBtnText: { fontSize: 14, fontWeight: "600", color: "#fff" },

  centeredModalDimOverlay: { flex: 1, backgroundColor: activeColors.overlay, justifyContent: "center", alignItems: "center", padding: s(20) },
  pickerOptionsPanelBox: { backgroundColor: activeColors.surface, width: "100%", maxWidth: s(300), borderRadius: s(12), padding: s(16), borderWidth: 1, borderColor: activeColors.border },
  pickerHeaderSection: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingBottom: s(10), borderBottomWidth: 1, borderBottomColor: activeColors.borderLight, marginBottom: s(8) },
  pickerHeaderTitleText: { fontSize: 13, fontWeight: "700", color: activeColors.text },
  pickerRowOptionItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: s(10), paddingHorizontal: s(8), borderRadius: s(6) },
  activePickerRowOptionItem: { backgroundColor: activeColors.primaryLight },
  pickerRowOptionItemText: { fontSize: 13, color: activeColors.textMuted, fontWeight: "500" },
  activePickerRowOptionItemText: { color: activeColors.primary, fontWeight: "700" },

  inspectorDetailOverlayCard: { backgroundColor: activeColors.surface, width: "100%", maxWidth: s(340), borderRadius: s(16), padding: s(16), borderWidth: 1, borderColor: activeColors.border },
  inspectorHeaderBlock: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", borderBottomWidth: 1, borderBottomColor: activeColors.borderLight, paddingBottom: s(12), marginBottom: s(12) },
  inspectorPlatformMainTitle: { fontSize: 16, fontWeight: "700", color: activeColors.text },
  inspectorHandleSubText: { fontSize: 13, color: activeColors.purple, fontWeight: "600", marginTop: s(2) },
  inspectorCloseCircleBtn: { padding: s(4), backgroundColor: activeColors.borderLight, borderRadius: s(12) },
  inspectorInformationGridStack: { gap: s(12) },
  metaDataHeaderMiniLabel: { fontSize: 11, fontWeight: "600", color: activeColors.textLight, textTransform: "uppercase", letterSpacing: 0.3 },
  metaDataTextValue: { fontSize: 13, color: activeColors.text, fontWeight: "500", marginTop: s(2) },
  
  credentialsIntegrationVaultSafeBox: { backgroundColor: activeColors.background, padding: s(12), borderRadius: s(10), borderWidth: 1, borderColor: activeColors.border, gap: s(8) },
  credentialsVaultHeaderMiniTitle: { fontSize: 10, fontWeight: "700", color: activeColors.textLight, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: s(2) },
  credentialSecretInteractiveDataRow: { flexDirection: "row", alignItems: "center", gap: s(8) },
  vaultInteractiveDividerRow: { flexDirection: "row", alignItems: "center", gap: s(8), borderTopWidth: 1, borderTopColor: activeColors.borderLight, paddingTop: s(8), marginTop: s(8) },
  vaultMetaFieldMiniLabel: { fontSize: 10, color: activeColors.textMuted },
  vaultValueMonoTextString: { fontSize: 12, color: activeColors.text, fontFamily: Platform.OS === "ios" ? "Courier" : "monospace", fontWeight: "600", marginTop: s(1) },
  vaultActionIconButtonUnit: { padding: s(5), backgroundColor: activeColors.surface, borderRadius: s(4), borderWidth: 1, borderColor: activeColors.borderLight },
  
  inspectorInlineUrlRoutingRow: { flexDirection: "row", alignItems: "center", gap: s(4), marginTop: s(2) },
  inspectorUrlRoutingText: { fontSize: 13, color: activeColors.primary, fontWeight: "500", textDecorationLine: "underline" },
  inspectorNotesParagraphText: { fontSize: 12, color: activeColors.textMuted, lineHeight: 16, marginTop: s(2) },
  
  inspectorActionControlFooterButtonsRow: { flexDirection: "row", gap: s(10), marginTop: s(16), paddingTop: s(12), borderTopWidth: 1, borderTopColor: activeColors.borderLight },
  inspectorEditActionControlBtn: { flex: 1.5, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: s(6), paddingVertical: s(8), backgroundColor: activeColors.borderLight, borderRadius: s(8) },
  inspectorEditActionControlBtnText: { fontSize: 12, fontWeight: "600", color: activeColors.text },
  inspectorDismissCloseControlBtn: { flex: 1, paddingVertical: s(8), backgroundColor: activeColors.primary, borderRadius: s(8), alignItems: "center", justifyContent: "center" },
  inspectorDismissCloseControlBtnText: { fontSize: 12, fontWeight: "600", color: "#fff" }
});