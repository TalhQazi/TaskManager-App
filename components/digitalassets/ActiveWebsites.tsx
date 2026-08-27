import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  Linking,
  useWindowDimensions,
  Platform
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  ExternalLink,
  Lock,
  X,
  Copy,
  Check
} from "lucide-react-native";
import { apiFetch } from "@/lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";
import { isDarkTheme } from "@/constants/design/presets";

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

const STATUS_COLORS = {
  Live: { bg: "rgba(34, 197, 94, 0.15)", text: "#22c55e", border: "rgba(34, 197, 94, 0.3)" },
  Maintenance: { bg: "rgba(245, 158, 11, 0.15)", text: "#f59e0b", border: "rgba(245, 158, 11, 0.3)" },
  Development: { bg: "rgba(59, 130, 246, 0.15)", text: "#3b82f6", border: "rgba(59, 130, 246, 0.3)" },
  Offline: { bg: "rgba(239, 68, 68, 0.15)", text: "#ef4444", border: "rgba(239, 68, 68, 0.3)" },
};

export function ActiveWebsites() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const { uiTheme } = useTheme() as any;
  const isDark = isDarkTheme(uiTheme?.theme);

  const colors = useMemo(() => {
    return {
      background: uiTheme?.panelColors?.dashboardBackground || (isDark ? "#090a0f" : "#f8fafc"),
      surface: uiTheme?.panelColors?.dashboardCardBackground || (isDark ? "#0f1117" : "#ffffff"),
      modalBg: isDark ? "#1e293b" : "#ffffff",
      inputBg: isDark ? "#0f172a" : "#f1f5f9",
      border: uiTheme?.panelColors?.borderColor || (isDark ? "rgba(255,255,255,0.12)" : "#e2e8f0"),
      borderLight: uiTheme?.panelColors?.borderColor || (isDark ? "rgba(255,255,255,0.06)" : "#f1f5f9"),
      text: uiTheme?.panelColors?.dashboardTextColor || (isDark ? "#f8fafc" : "#0f172a"),
      textMuted: isDark ? "#94a3b8" : "#64748b",
      primary: uiTheme?.customColors?.primary || "#0072FF",
      primaryText: "#ffffff",
    };
  }, [uiTheme, isDark]);

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
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

  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewingWebsite, setViewingWebsite] = useState<Website | null>(null);
  const [selectedWebsite, setSelectedWebsite] = useState<Website | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCredentials, setShowCredentials] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const websitesQuery = useQuery<Website[]>({
    queryKey: ["active-websites"],
    queryFn: async () => {
      const res = await apiFetch<{ items: Website[] }>("/api/websites/active");
      return res.items || [];
    },
  });

  const websites = useMemo(() => {
    const list = websitesQuery.data || [];
    const filtered = list.filter(
      (w) =>
        (w.siteName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (w.url || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (w.platform || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (w.hostingProvider || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
    return filtered.slice().sort((a, b) => (a.siteName || "").localeCompare(b.siteName || ""));
  }, [websitesQuery.data, searchQuery]);

  const resetForm = useCallback(() => {
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
  }, []);

  const handleSave = async () => {
    if (!formData.siteName || !formData.url) {
      Alert.alert("Validation Error", "Site Name and URL are required.");
      return;
    }

    try {
      setIsSubmitting(true);
      if (selectedWebsite) {
        await apiFetch(`/api/websites/${selectedWebsite._id}`, {
          method: "PUT",
          body: JSON.stringify(formData),
        });
      } else {
        await apiFetch("/api/websites", {
          method: "POST",
          body: JSON.stringify({
            ...formData,
            websiteType: "active",
          }),
        });
      }

      await websitesQuery.refetch();
      setIsEditDialogOpen(false);
      resetForm();
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to save website details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (website: Website) => {
    Alert.alert(
      "Confirm Delete",
      `Are you sure you want to delete "${website.siteName}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await apiFetch(`/api/websites/${website._id}`, {
                method: "DELETE",
              });
              await websitesQuery.refetch();
            } catch (err: any) {
              Alert.alert("Error", err?.message || "Failed to delete website.");
            }
          },
        },
      ]
    );
  };

  const handleEdit = (website: Website) => {
    setSelectedWebsite(website);
    setFormData(website);
    setIsEditDialogOpen(true);
  };

  const copyToClipboard = async (text: string, label: string) => {
    if (!text) return;
    await Clipboard.setStringAsync(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const openUrl = (url: string) => {
    if (!url) return;
    const formatted = url.startsWith("http") ? url : `https://${url}`;
    Linking.openURL(formatted).catch(() => {
      Alert.alert("Invalid URL", "Unable to open link.");
    });
  };

  return (
    <View style={styles.container}>
      {/* Toolbar */}
      <View style={[styles.toolbar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.searchContainer, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
          <Search size={16} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search active websites..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => {
            resetForm();
            setIsEditDialogOpen(true);
          }}
          activeOpacity={0.8}
        >
          <Plus size={16} color="#ffffff" style={styles.addIcon} />
          <Text style={styles.addButtonText}>Add Website</Text>
        </TouchableOpacity>
      </View>

      {/* Table Content */}
      {websitesQuery.isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : websites.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            {'No websites yet. Click "Add Website" to get started.'}
          </Text>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={[styles.tableCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.tableRowHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.headerCell, { width: 40, color: colors.textMuted }]}>#</Text>
              <Text style={[styles.headerCell, { width: 160, color: colors.textMuted }]}>SITE NAME</Text>
              <Text style={[styles.headerCell, { width: 180, color: colors.textMuted }]}>URL</Text>
              <Text style={[styles.headerCell, { width: 110, color: colors.textMuted }]}>PLATFORM</Text>
              <Text style={[styles.headerCell, { width: 110, color: colors.textMuted }]}>HOSTING</Text>
              <Text style={[styles.headerCell, { width: 110, color: colors.textMuted }]}>STATUS</Text>
              <Text style={[styles.headerCell, { width: 120, textAlign: "right", color: colors.textMuted }]}>ACTIONS</Text>
            </View>

            {websites.map((website, index) => {
              const statusCfg = STATUS_COLORS[website.status] || STATUS_COLORS.Live;
              const isCredsVisible = showCredentials === website._id;

              return (
                <View key={website._id}>
                  <TouchableOpacity
                    style={[styles.tableRow, { borderBottomColor: colors.borderLight }]}
                    onPress={() => {
                      setViewingWebsite(website);
                      setIsViewOpen(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.cellText, { width: 40, color: colors.textMuted, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" }]}>
                      {index + 1}
                    </Text>
                    <Text style={[styles.cellTextBold, { width: 160, color: colors.text }]} numberOfLines={1}>
                      {website.siteName}
                    </Text>
                    <TouchableOpacity
                      style={{ width: 180, flexDirection: "row", alignItems: "center" }}
                      onPress={() => openUrl(website.url)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.linkText, { color: colors.primary }]} numberOfLines={1}>
                        {website.url.length > 22 ? website.url.slice(0, 22) + "..." : website.url}
                      </Text>
                      <ExternalLink size={12} color={colors.primary} style={{ marginLeft: 4 }} />
                    </TouchableOpacity>
                    <Text style={[styles.cellText, { width: 110, color: colors.text }]} numberOfLines={1}>
                      {website.platform || "N/A"}
                    </Text>
                    <Text style={[styles.cellText, { width: 110, color: colors.text }]} numberOfLines={1}>
                      {website.hostingProvider || "N/A"}
                    </Text>
                    <View style={{ width: 110 }}>
                      <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg, borderColor: statusCfg.border }]}>
                        <Text style={[styles.statusBadgeText, { color: statusCfg.text }]}>{website.status}</Text>
                      </View>
                    </View>
                    <View style={styles.actionsCell}>
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => handleEdit(website)}
                        activeOpacity={0.7}
                      >
                        <Edit2 size={15} color="#3b82f6" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => setShowCredentials(isCredsVisible ? null : website._id)}
                        activeOpacity={0.7}
                      >
                        <Lock size={15} color="#f59e0b" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => handleDelete(website)}
                        activeOpacity={0.7}
                      >
                        <Trash2 size={15} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>

                  {isCredsVisible && (
                    <View style={[styles.credentialsInlinePanel, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                      <View style={styles.credRow}>
                        <Text style={[styles.credLabel, { color: colors.textMuted }]}>LOGIN EMAIL:</Text>
                        <Text style={[styles.credValue, { color: colors.text }]}>{website.loginEmail || "No email set"}</Text>
                        {website.loginEmail ? (
                          <TouchableOpacity onPress={() => copyToClipboard(website.loginEmail || "", "email")}>
                            <Copy size={13} color={colors.primary} />
                          </TouchableOpacity>
                        ) : null}
                      </View>
                      <View style={[styles.credRow, { marginTop: 6 }]}>
                        <Text style={[styles.credLabel, { color: colors.textMuted }]}>PASSWORD:</Text>
                        <Text style={[styles.credValue, { color: colors.text }]}>{website.loginPassword || "No password set"}</Text>
                        {website.loginPassword ? (
                          <TouchableOpacity onPress={() => copyToClipboard(website.loginPassword || "", "password")}>
                            <Copy size={13} color={colors.primary} />
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* CREATE / EDIT MODAL */}
      <Modal
        visible={isEditDialogOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setIsEditDialogOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.modalBg, borderColor: colors.border, maxWidth: isTablet ? 500 : "100%" }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitleText, { color: colors.text }]}>
                {selectedWebsite ? "Edit Website" : "Add New Website"}
              </Text>
              <TouchableOpacity onPress={() => setIsEditDialogOpen(false)} activeOpacity={0.7}>
                <X size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.formScrollContent} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>Site Name *</Text>
                <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.modalInput, { color: colors.text }]}
                    placeholder="e.g., Company Main Site"
                    placeholderTextColor={colors.textMuted}
                    value={formData.siteName || ""}
                    onChangeText={(txt) => setFormData({ ...formData, siteName: txt })}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>URL *</Text>
                <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.modalInput, { color: colors.text }]}
                    placeholder="https://example.com"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="none"
                    value={formData.url || ""}
                    onChangeText={(txt) => setFormData({ ...formData, url: txt })}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>Platform</Text>
                <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.modalInput, { color: colors.text }]}
                    placeholder="e.g., WordPress, React, etc."
                    placeholderTextColor={colors.textMuted}
                    value={formData.platform || ""}
                    onChangeText={(txt) => setFormData({ ...formData, platform: txt })}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>Hosting Provider</Text>
                <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.modalInput, { color: colors.text }]}
                    placeholder="e.g., AWS, DigitalOcean"
                    placeholderTextColor={colors.textMuted}
                    value={formData.hostingProvider || ""}
                    onChangeText={(txt) => setFormData({ ...formData, hostingProvider: txt })}
                  />
                </View>
              </View>

              <View style={styles.gridTwoColumns}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 6 }]}>
                  <Text style={[styles.fieldLabel, { color: colors.text }]}>Login Email</Text>
                  <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                    <TextInput
                      style={[styles.modalInput, { color: colors.text }]}
                      placeholder="admin@example.com"
                      placeholderTextColor={colors.textMuted}
                      autoCapitalize="none"
                      value={formData.loginEmail || ""}
                      onChangeText={(txt) => setFormData({ ...formData, loginEmail: txt })}
                    />
                  </View>
                </View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 6 }]}>
                  <Text style={[styles.fieldLabel, { color: colors.text }]}>Password</Text>
                  <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                    <TextInput
                      style={[styles.modalInput, { color: colors.text }]}
                      placeholder="Password"
                      placeholderTextColor={colors.textMuted}
                      secureTextEntry
                      value={formData.loginPassword || ""}
                      onChangeText={(txt) => setFormData({ ...formData, loginPassword: txt })}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>Status</Text>
                <View style={styles.statusOptionsRow}>
                  {(["Live", "Maintenance", "Development", "Offline"] as const).map((st) => {
                    const isSelected = (formData.status || "Live") === st;
                    return (
                      <TouchableOpacity
                        key={st}
                        style={[
                          styles.statusChipOption,
                          { backgroundColor: isSelected ? colors.primary : colors.inputBg, borderColor: colors.border },
                        ]}
                        onPress={() => setFormData({ ...formData, status: st })}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.statusChipText, { color: isSelected ? "#ffffff" : colors.text }]}>{st}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>Notes</Text>
                <View style={[styles.inputWrapper, styles.multilineWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.modalInput, styles.multilineInput, { color: colors.text }]}
                    placeholder="Additional notes..."
                    placeholderTextColor={colors.textMuted}
                    multiline
                    numberOfLines={3}
                    value={formData.notes || ""}
                    onChangeText={(txt) => setFormData({ ...formData, notes: txt })}
                  />
                </View>
              </View>
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn, { borderColor: colors.border }]}
                onPress={() => setIsEditDialogOpen(false)}
                activeOpacity={0.7}
              >
                <Text style={[styles.cancelBtnText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                onPress={handleSave}
                disabled={isSubmitting}
                activeOpacity={0.8}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.saveBtnText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* VIEW WEBSITE DETAILS MODAL */}
      <Modal
        visible={isViewOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setIsViewOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.modalBg, borderColor: colors.border, maxWidth: isTablet ? 500 : "100%" }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitleText, { color: colors.text }]}>Website Details</Text>
              <TouchableOpacity onPress={() => setIsViewOpen(false)} activeOpacity={0.7}>
                <X size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            {viewingWebsite && (
              <ScrollView contentContainerStyle={styles.formScrollContent} showsVerticalScrollIndicator={false}>
                <View style={[styles.viewGridRow, { borderBottomColor: colors.borderLight, paddingBottom: 12 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.viewLabelText, { color: colors.textMuted }]}>SITE NAME</Text>
                    <Text style={[styles.viewValueBold, { color: colors.text }]}>{viewingWebsite.siteName}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.viewLabelText, { color: colors.textMuted }]}>STATUS</Text>
                    <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLORS[viewingWebsite.status] || STATUS_COLORS.Live).bg, borderColor: (STATUS_COLORS[viewingWebsite.status] || STATUS_COLORS.Live).border }]}>
                      <Text style={[styles.statusBadgeText, { color: (STATUS_COLORS[viewingWebsite.status] || STATUS_COLORS.Live).text }]}>
                        {viewingWebsite.status}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.viewGridRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.viewLabelText, { color: colors.textMuted }]}>PLATFORM</Text>
                    <Text style={[styles.viewValueText, { color: colors.text }]}>{viewingWebsite.platform || "N/A"}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.viewLabelText, { color: colors.textMuted }]}>HOSTING</Text>
                    <Text style={[styles.viewValueText, { color: colors.text }]}>{viewingWebsite.hostingProvider || "N/A"}</Text>
                  </View>
                </View>

                <View style={[styles.credentialsBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                  <View style={styles.credBoxItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.viewLabelText, { color: colors.textMuted }]}>LOGIN EMAIL</Text>
                      <Text style={[styles.credMonoText, { color: colors.text }]}>{viewingWebsite.loginEmail || "No email set"}</Text>
                    </View>
                    {viewingWebsite.loginEmail ? (
                      <TouchableOpacity onPress={() => copyToClipboard(viewingWebsite.loginEmail || "", "viewEmail")}>
                        {copiedField === "viewEmail" ? <Check size={16} color="#22c55e" /> : <Copy size={16} color={colors.primary} />}
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  <View style={[styles.credBoxItem, { marginTop: 10 }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.viewLabelText, { color: colors.textMuted }]}>PASSWORD</Text>
                      <Text style={[styles.credMonoText, { color: colors.text }]}>{viewingWebsite.loginPassword || "No password set"}</Text>
                    </View>
                    {viewingWebsite.loginPassword ? (
                      <TouchableOpacity onPress={() => copyToClipboard(viewingWebsite.loginPassword || "", "viewPass")}>
                        {copiedField === "viewPass" ? <Check size={16} color="#22c55e" /> : <Copy size={16} color={colors.primary} />}
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>

                <View style={styles.viewBlockGroup}>
                  <Text style={[styles.viewLabelText, { color: colors.textMuted }]}>URL</Text>
                  <TouchableOpacity onPress={() => openUrl(viewingWebsite.url)} style={styles.flexRowCenter} activeOpacity={0.7}>
                    <Text style={[styles.viewValueLink, { color: colors.primary }]}>{viewingWebsite.url}</Text>
                    <ExternalLink size={13} color={colors.primary} style={{ marginLeft: 4 }} />
                  </TouchableOpacity>
                </View>

                {viewingWebsite.notes ? (
                  <View style={styles.viewBlockGroup}>
                    <Text style={[styles.viewLabelText, { color: colors.textMuted }]}>NOTES</Text>
                    <Text style={[styles.viewNotesText, { color: colors.text }]}>{viewingWebsite.notes}</Text>
                  </View>
                ) : null}
              </ScrollView>
            )}

            <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn, { borderColor: colors.border }]}
                onPress={() => {
                  setIsViewOpen(false);
                  if (viewingWebsite) handleEdit(viewingWebsite);
                }}
                activeOpacity={0.7}
              >
                <Edit2 size={14} color={colors.text} style={{ marginRight: 6 }} />
                <Text style={[styles.cancelBtnText, { color: colors.text }]}>Edit Details</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                onPress={() => setIsViewOpen(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.saveBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    gap: 10,
    flexWrap: "wrap",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    height: 40,
    paddingHorizontal: 10,
    flex: 1,
    minWidth: 200,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  addIcon: {
    marginRight: 6,
  },
  addButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  loaderContainer: {
    paddingVertical: 32,
    alignItems: "center",
  },
  emptyCard: {
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 13,
  },
  tableCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  tableRowHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerCell: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  cellText: {
    fontSize: 12,
  },
  cellTextBold: {
    fontSize: 13,
    fontWeight: "700",
  },
  linkText: {
    fontSize: 12,
    fontWeight: "600",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  actionsCell: {
    width: 120,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  actionBtn: {
    padding: 6,
    borderRadius: 6,
  },
  credentialsInlinePanel: {
    padding: 10,
    marginHorizontal: 14,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  credRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  credLabel: {
    fontSize: 10,
    fontWeight: "800",
  },
  credValue: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    flex: 1,
    marginHorizontal: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalCard: {
    width: "100%",
    maxHeight: "85%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    paddingBottom: 12,
    marginBottom: 12,
  },
  modalTitleText: {
    fontSize: 16,
    fontWeight: "700",
  },
  formScrollContent: {
    paddingBottom: 12,
  },
  inputGroup: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
  },
  inputWrapper: {
    borderWidth: 1,
    borderRadius: 8,
    height: 42,
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  multilineWrapper: {
    height: 80,
    paddingVertical: 8,
  },
  modalInput: {
    fontSize: 13,
    paddingVertical: 0,
    flex: 1,
  },
  multilineInput: {
    textAlignVertical: "top",
  },
  gridTwoColumns: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statusOptionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  statusChipOption: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    borderTopWidth: 1,
    paddingTop: 12,
    gap: 8,
  },
  modalBtn: {
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },
  cancelBtn: {
    borderWidth: 1,
    backgroundColor: "transparent",
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
  saveBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  viewGridRow: {
    flexDirection: "row",
    marginBottom: 12,
    gap: 12,
  },
  viewLabelText: {
    fontSize: 10,
    fontWeight: "800",
    marginBottom: 3,
  },
  viewValueBold: {
    fontSize: 14,
    fontWeight: "700",
  },
  viewValueText: {
    fontSize: 13,
  },
  credentialsBox: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginVertical: 12,
  },
  credBoxItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  credMonoText: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    marginTop: 2,
  },
  viewBlockGroup: {
    marginBottom: 12,
  },
  flexRowCenter: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
  },
  viewValueLink: {
    fontSize: 13,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  viewNotesText: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },
});