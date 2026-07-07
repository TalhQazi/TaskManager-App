import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Linking,
  Platform,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  FileText,
  X,
  Building2,
  CheckCircle2,
  Clock,
  Archive,
  Paperclip,
  Mail,
  Phone,
  Hash,
  Download,
} from "lucide-react-native";
import { apiRequest } from "@/services/api";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";

interface Attachment {
  name: string;
  url: string;
  type: string;
}

interface CompanyRegistryEntry {
  id: string;
  companyName: string;
  entityType: string;
  fein: string;
  phone: string;
  email: string;
  status: "active" | "hold" | "archived";
  notes: string;
  attachments: Attachment[];
  colorTag: "green" | "blue" | "yellow" | "red" | "gray";
  createdAt: string;
  updatedAt: string;
}

interface WrappedResponse {
  success: boolean;
  data?: {
    items?: any[];
  };
}

type ApiResponse = WrappedResponse | any[] | null;

const ENTITY_TYPES = [
  "LLC", "Corporation", "S-Corp", "Partnership",
  "Sole Proprietorship", "Non-Profit", "LLP", "PC",
];

const initialFormData = {
  companyName: "",
  entityType: "",
  fein: "",
  phone: "",
  email: "",
  status: "active" as const,
  notes: "",
  colorTag: "blue" as const,
};

function isValidEIN(ein: string): boolean {
  if (!ein) return true;
  return /^\d{2}-\d{7}$/.test(ein);
}

function formatEIN(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 9);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}-${digits.slice(2)}`;
}

export default function CompanyRegistry() {
  const { uiTheme } = useTheme();
  const auth = useAuth();
  const userRole = auth?.user?.role || "";
  const isMetallic = uiTheme.theme === "metallic-elite";
  const queryClient = useQueryClient();

  const colors = useMemo(() => {
    const isDark = (uiTheme.theme as string) === "dark" || isMetallic;
    return {
      background: uiTheme.panelColors?.dashboardBackground || (isDark ? "#0f172a" : "#f8fafc"),
      cardBg: uiTheme.panelColors?.dashboardCardBackground || (isDark ? "#1e293b" : "#ffffff"),
      text: uiTheme.panelColors?.dashboardTextColor || (isDark ? "#f8fafc" : "#0f172a"),
      mutedText: isDark ? "#94a3b8" : "#64748b",
      border: isDark ? "#334155" : "#e2e8f0",
      innerRowBorder: isDark ? "#232f45" : "#e2e8f0",
      inputBg: isDark ? "#1e293b" : "#ffffff",
      inputText: isDark ? "#f8fafc" : "#0f172a",
      primary: uiTheme.customColors?.primary || "#3b82f6",
      metallicGold: "#ffd27a",
      isDark,
    };
  }, [uiTheme, isMetallic]);

  const colorTags = useMemo(() => {
    if (colors.isDark) {
      return {
        green:  { label: "Parent Company", dot: "#10b981", bg: "#064e3b", text: "#34d399" },
        blue:   { label: "Operational",    dot: "#3b82f6", bg: "#1e3a8a", text: "#60a5fa" },
        yellow: { label: "Missing Info",   dot: "#fbbf24", bg: "#78350f", text: "#fbbf24" },
        red:    { label: "Critical",       dot: "#ef4444", bg: "#7f1d1d", text: "#fca5a5" },
        gray:   { label: "Archived",       dot: "#9ca3af", bg: "#374151", text: "#d1d5db" },
      };
    }
    return {
      green:  { label: "Parent Company", dot: "#10b981", bg: "#e6f4ea", text: "#137333" },
      blue:   { label: "Operational",    dot: "#3b82f6", bg: "#e8f0fe", text: "#1a73e8" },
      yellow: { label: "Missing Info",   dot: "#fbbf24", bg: "#fef7e0", text: "#b06000" },
      red:    { label: "Critical",       dot: "#ef4444", bg: "#fce8e6", text: "#c5221f" },
      gray:   { label: "Archived",       dot: "#9ca3af", bg: "#f1f3f4", text: "#5f6368" },
    };
  }, [colors.isDark]);

  const statusMap = useMemo(() => {
    if (colors.isDark) {
      return {
        active:   { label: "Active",   icon: CheckCircle2, bg: "#064e3b", text: "#34d399" },
        hold:     { label: "Hold",     icon: Clock,        bg: "#78350f", text: "#fbbf24" },
        archived: { label: "Archived", icon: Archive,      bg: "#374151", text: "#d1d5db" },
      };
    }
    return {
      active:   { label: "Active",   icon: CheckCircle2, bg: "#e6f4ea", text: "#137333" },
      hold:     { label: "Hold",     icon: Clock,        bg: "#fef7e0", text: "#b06000" },
      archived: { label: "Archived", icon: Archive,      bg: "#f1f3f4", text: "#5f6368" },
    };
  }, [colors.isDark]);

  const styles = useMemo(() => createStyles(colors, isMetallic), [colors, isMetallic]);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [colorFilter, setColorFilter] = useState("all");

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [viewDrawerOpen, setViewDrawerOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<CompanyRegistryEntry | null>(null);
  
  const [formData, setFormData] = useState({ ...initialFormData });
  const [entries, setEntries] = useState<CompanyRegistryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [einError, setEinError] = useState<string | null>(null);

  const fetchEntries = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiRequest("/company-registry") as ApiResponse;
      let rawItems: any[] = [];
      if (res && typeof res === "object" && "data" in res && res.data?.items) {
        rawItems = res.data.items;
      } else if (res && typeof res === "object" && "items" in res && Array.isArray(res.items)) {
        rawItems = res.items;
      } else if (Array.isArray(res)) {
        rawItems = res;
      }
      const mapped = rawItems.map((item: any) => ({
        id: String(item._id || item.id),
        companyName: item.companyName || "",
        entityType: item.entityType || "",
        fein: item.fein || "",
        phone: item.phone || "",
        email: item.email || "",
        status: item.status || "active",
        notes: item.notes || "",
        attachments: item.attachments || [],
        colorTag: item.colorTag || "blue",
        createdAt: item.createdAt || "",
        updatedAt: item.updatedAt || "",
      }));
      setEntries(mapped);
    } catch {
      Alert.alert("Error", "Failed to load company registry records");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const createMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      return await apiRequest("/company-registry", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-registry"] });
      setFormModalOpen(false);
      resetForm();
      fetchEntries();
    },
    onError: () => {
      Alert.alert("Error", "Failed to save company profile");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: { id: string; data: typeof formData }) => {
      return await apiRequest(`/company-registry/${payload.id}`, {
        method: "PUT",
        body: JSON.stringify(payload.data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-registry"] });
      setFormModalOpen(false);
      setSelectedEntry(null);
      resetForm();
      fetchEntries();
    },
    onError: () => {
      Alert.alert("Error", "Failed to update company data");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/company-registry/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-registry"] });
      setDeleteConfirmOpen(false);
      setSelectedEntry(null);
      fetchEntries();
    },
    onError: () => {
      Alert.alert("Error", "Failed to remove company record");
    },
  });

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q || 
        entry.companyName.toLowerCase().includes(q) || 
        entry.fein.toLowerCase().includes(q) || 
        entry.email.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || entry.status === statusFilter;
      const matchesColor  = colorFilter === "all" || entry.colorTag === colorFilter;
      
      return matchesSearch && matchesStatus && matchesColor;
    });
  }, [entries, searchQuery, statusFilter, colorFilter]);

  const stats = useMemo(() => {
    return {
      total: entries.length,
      active: entries.filter(e => e.status === "active").length,
      hold: entries.filter(e => e.status === "hold").length,
      archived: entries.filter(e => e.status === "archived").length,
    };
  }, [entries]);

  const resetForm = () => {
    setFormData({ ...initialFormData });
    setEinError(null);
  };

  const handleAdd = () => {
    if (!formData.companyName.trim()) return;
    if (!isValidEIN(formData.fein)) {
      setEinError("EIN must be in format XX-XXXXXXX");
      return;
    }
    setEinError(null);
    createMutation.mutate(formData);
  };

  const handleEdit = () => {
    if (!selectedEntry || !formData.companyName.trim()) return;
    if (!isValidEIN(formData.fein)) {
      setEinError("EIN must be in format XX-XXXXXXX");
      return;
    }
    setEinError(null);
    updateMutation.mutate({ id: selectedEntry.id, data: formData });
  };

  const handleDelete = () => {
    if (!selectedEntry) return;
    deleteMutation.mutate(selectedEntry.id);
  };

  const openAddModal = () => {
    setIsEditMode(false);
    resetForm();
    setFormModalOpen(true);
  };

  const openEditModal = (entry: CompanyRegistryEntry) => {
    setSelectedEntry(entry);
    setIsEditMode(true);
    setFormData({
      companyName: entry.companyName,
      entityType: entry.entityType,
      fein: entry.fein,
      phone: entry.phone,
      email: entry.email,
      status: entry.status,
      notes: entry.notes,
      colorTag: entry.colorTag,
    });
    setEinError(null);
    setFormModalOpen(true);
  };

  const openViewDrawer = (entry: CompanyRegistryEntry) => {
    setSelectedEntry(entry);
    setViewDrawerOpen(true);
  };

  const openDeleteConfirm = (entry: CompanyRegistryEntry) => {
    setSelectedEntry(entry);
    setDeleteConfirmOpen(true);
  };

  const handleAttachmentPress = (att: Attachment) => {
    if (!att.url) return;
    Linking.openURL(att.url).catch(() => Alert.alert("Error", "Cannot open file link"));
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  const renderCompanyCard = ({ item }: { item: CompanyRegistryEntry }) => {
    const statusKey = item.status in statusMap ? item.status : "active";
    const tagKey = item.colorTag in colorTags ? item.colorTag : "blue";

    const StatusIcon = statusMap[statusKey]?.icon || CheckCircle2;
    const tagConfig = colorTags[tagKey];
    const statusConfig = statusMap[statusKey];

    return (
      <TouchableOpacity style={styles.card} onPress={() => openViewDrawer(item)}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.identityContainer}>
            <View style={[styles.avatarBadge, { backgroundColor: tagConfig.bg, borderColor: tagConfig.dot + "40" }]}>
              <Text style={[styles.avatarText, { color: tagConfig.text }]}>
                {item.companyName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.cardCompanyName} numberOfLines={1}>{item.companyName}</Text>
              <Text style={styles.cardSubText}>{item.entityType || "No Entity Specified"}</Text>
            </View>
          </View>

          <View style={styles.actionIconsRow}>
            <TouchableOpacity onPress={() => openEditModal(item)} style={styles.iconActionButton}>
              <Edit size={14} color={colors.mutedText} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => openDeleteConfirm(item)} style={styles.iconActionButton}>
              <Trash2 size={14} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.metaInformationGrid}>
          <Text style={styles.monoFein}>{item.fein || "EIN: —"}</Text>
          <Text style={styles.contactValue} numberOfLines={1}>{item.email || "No Email"}</Text>
        </View>

        <View style={styles.cardFooterContainer}>
          <View style={styles.badgeRow}>
            <View style={[styles.pillBadge, { backgroundColor: statusConfig.bg }]}>
              <StatusIcon size={12} color={statusConfig.text} style={{ marginRight: 4 }} />
              <Text style={[styles.badgeLabel, { color: statusConfig.text }]}>{statusConfig.label}</Text>
            </View>

            <View style={[styles.pillBadge, { backgroundColor: tagConfig.bg, marginLeft: 6 }]}>
              <View style={[styles.colorDotIndicator, { backgroundColor: tagConfig.dot }]} />
              <Text style={[styles.badgeLabel, { color: tagConfig.text }]}>{tagConfig.label}</Text>
            </View>
          </View>

          {item.attachments?.length > 0 && (
            <View style={styles.fileCounterPill}>
              <Paperclip size={12} color={colors.mutedText} style={{ marginRight: 2 }} />
              <Text style={styles.fileCounterText}>{item.attachments.length}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.rootContainer}>
      <View style={styles.headerLayout}>
        <View>
          <Text style={styles.appTitle}>Company Registry</Text>
          <Text style={styles.appSubtitle}>Manage company tax &amp; legal information</Text>
        </View>
        <TouchableOpacity style={styles.topPrimaryButton} onPress={openAddModal}>
          <Plus size={16} color={isMetallic ? "#000" : "#fff"} style={{ marginRight: 4 }} />
          <Text style={styles.topPrimaryButtonText}>Add Company</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 64, marginBottom: 14 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.metricsStrip}>
          <View style={[styles.statChip, { borderLeftColor: "#3b82f6" }]}><Text style={styles.statVal}>{stats.total}</Text><Text style={styles.statLabel}>Total</Text></View>
          <View style={[styles.statChip, { borderLeftColor: "#10b981" }]}><Text style={styles.statVal}>{stats.active}</Text><Text style={styles.statLabel}>Active</Text></View>
          <View style={[styles.statChip, { borderLeftColor: "#fbbf24" }]}><Text style={styles.statVal}>{stats.hold}</Text><Text style={styles.statLabel}>On Hold</Text></View>
          <View style={[styles.statChip, { borderLeftColor: "#6b7280" }]}><Text style={styles.statVal}>{stats.archived}</Text><Text style={styles.statLabel}>Archived</Text></View>
        </ScrollView>
      </View>

      <View style={styles.filterSection}>
        <View style={styles.searchBarWrapper}>
          <Search size={16} color={colors.mutedText} style={styles.searchBarIcon} />
          <TextInput 
            placeholder="Search by company, EIN, or email…"
            placeholderTextColor={colors.mutedText}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchBarInput}
          />
          {searchQuery !== "" && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <X size={16} color={colors.mutedText} style={{ marginRight: 8 }} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filterSelectorsGroup}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {["all", "active", "hold", "archived"].map((statusOption) => (
              <TouchableOpacity 
                key={statusOption}
                style={[styles.filterSelectorToggle, statusFilter === statusOption && styles.filterSelectorToggleActive]}
                onPress={() => setStatusFilter(statusOption)}
              >
                <Text style={[styles.filterSelectorToggleText, statusFilter === statusOption && styles.filterSelectorToggleTextActive]}>
                  {statusOption.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      {loading ? (
        <View style={styles.fallbackLoadingViewport}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filteredEntries.length === 0 ? (
        <View style={styles.fallbackLoadingViewport}>
          <Building2 size={44} color={colors.mutedText} style={{ marginBottom: 10 }} />
          <Text style={styles.emptyPromptTitle}>No companies yet</Text>
          <Text style={styles.emptyPromptBody}>Add your first company to get started.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredEntries}
          keyExtractor={(item) => item.id}
          renderItem={renderCompanyCard}
          contentContainerStyle={styles.listViewportContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal visible={viewDrawerOpen} transparent animationType="slide">
        <View style={styles.backdropCoverLayer}>
          <View style={styles.drawerCardStructure}>
            <View style={styles.drawerTitleContainer}>
              <View style={styles.drawerHeaderProfileRow}>
                {selectedEntry && (
                  <View style={[styles.avatarBadgeLarge, { backgroundColor: colorTags[selectedEntry.colorTag in colorTags ? selectedEntry.colorTag : "blue"].bg, borderColor: colorTags[selectedEntry.colorTag in colorTags ? selectedEntry.colorTag : "blue"].dot + "40" }]}>
                    <Text style={[styles.avatarTextLarge, { color: colorTags[selectedEntry.colorTag in colorTags ? selectedEntry.colorTag : "blue"].text }]}>
                      {selectedEntry.companyName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.drawerHeaderMeta}>
                  <Text style={styles.drawerTitleText} numberOfLines={1}>{selectedEntry?.companyName}</Text>
                  <View style={styles.drawerHeaderBadges}>
                    {selectedEntry && (
                      <>
                        <View style={[styles.pillBadge, { backgroundColor: statusMap[selectedEntry.status in statusMap ? selectedEntry.status : "active"].bg }]}>
                          <Text style={[styles.badgeLabel, { color: statusMap[selectedEntry.status in statusMap ? selectedEntry.status : "active"].text }]}>
                            {statusMap[selectedEntry.status in statusMap ? selectedEntry.status : "active"].label}
                          </Text>
                        </View>
                        <View style={[styles.pillBadge, { backgroundColor: colorTags[selectedEntry.colorTag in colorTags ? selectedEntry.colorTag : "blue"].bg, marginLeft: 6 }]}>
                          <Text style={[styles.badgeLabel, { color: colorTags[selectedEntry.colorTag in colorTags ? selectedEntry.colorTag : "blue"].text }]}>
                            {colorTags[selectedEntry.colorTag in colorTags ? selectedEntry.colorTag : "blue"].label}
                          </Text>
                        </View>
                      </>
                    )}
                  </View>
                </View>
                <TouchableOpacity onPress={() => setViewDrawerOpen(false)} style={styles.closeModalCross}>
                  <X size={20} color={colors.text} />
                </TouchableOpacity>
              </View>
            </View>

            {selectedEntry && (
              <ScrollView style={{ padding: 20 }} showsVerticalScrollIndicator={false}>
                <View style={styles.detailHalfWidthGridRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailLabel}>Entity Type</Text>
                    <Text style={styles.detailContentText}>{selectedEntry.entityType || "—"}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailLabel}>EIN / FEIN</Text>
                    <View style={styles.monoFeinBadgeWrapper}>
                      <Text style={styles.detailContentTextMono}>{selectedEntry.fein || "—"}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.detailHalfWidthGridRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailLabel}>Phone</Text>
                    <Text style={styles.detailContentText}>{selectedEntry.phone || "—"}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailLabel}>Email</Text>
                    <Text style={styles.detailContentText}>{selectedEntry.email || "—"}</Text>
                  </View>
                </View>

                {selectedEntry.notes ? (
                  <>
                    <Text style={styles.detailLabel}>Notes</Text>
                    <View style={styles.notesTextWellBox}>
                      <Text style={styles.notesTextValue}>{selectedEntry.notes}</Text>
                    </View>
                  </>
                ) : null}

                <Text style={styles.detailLabel}>Attachments {selectedEntry.attachments?.length > 0 && `(${selectedEntry.attachments.length})`}</Text>
                {Array.isArray(selectedEntry.attachments) && selectedEntry.attachments.length > 0 ? (
                  selectedEntry.attachments.map((file, idx) => (
                    <TouchableOpacity 
                      key={idx} 
                      style={styles.attachmentStripButton}
                      onPress={() => handleAttachmentPress(file)}
                    >
                      <FileText size={16} color={colors.primary} style={{ marginRight: 8 }} />
                      <Text style={styles.attachmentStripText} numberOfLines={1}>{file.name}</Text>
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={styles.emptyStateFallbackSubtext}>No attachments</Text>
                )}
                <View style={{ height: 40 }} />
              </ScrollView>
            )}

            <View style={styles.modalControlActionPanel}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => setViewDrawerOpen(false)}>
                <Text style={styles.modalCancelButtonText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalSubmitButton} 
                onPress={() => { setViewDrawerOpen(false); if (selectedEntry) openEditModal(selectedEntry); }}
              >
                <Text style={styles.modalSubmitButtonText}>Edit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={formModalOpen} transparent animationType="fade">
        <View style={styles.backdropCoverLayer}>
          <View style={styles.modalFormBoxStructure}>
            <View style={styles.webHeaderStickyStyle}>
              <View style={styles.drawerTitleContainer}>
                <Text style={styles.drawerTitleText}>{isEditMode ? "Edit Company" : "Add Company"}</Text>
                <TouchableOpacity onPress={() => setFormModalOpen(false)} style={styles.closeModalCross}>
                  <X size={20} color={colors.text} />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView style={{ padding: 20 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.formLabelTitle}>Company Name *</Text>
              <TextInput 
                style={styles.formInputBox}
                placeholder="Acme Corporation"
                placeholderTextColor={colors.mutedText}
                underlineColorAndroid="transparent"
                value={formData.companyName}
                onChangeText={(text) => setFormData({ ...formData, companyName: text })}
              />

              <Text style={styles.formLabelTitle}>Entity Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalRadioCluster}>
                {ENTITY_TYPES.map((type) => (
                  <TouchableOpacity 
                    key={type} 
                    style={[styles.radioButtonItem, formData.entityType === type && styles.radioButtonItemActive]}
                    onPress={() => setFormData({ ...formData, entityType: type })}
                  >
                    <Text style={[styles.radioButtonText, formData.entityType === type && styles.radioButtonTextActive]}>{type}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.formLabelTitle}>EIN / FEIN</Text>
              <View style={styles.relativeInputContainer}>
                <Hash size={14} color={colors.metallicGold} style={styles.inputLeftIcon} />
                <TextInput 
                  style={[styles.formInputBox, styles.plInputSpaced, einError ? { borderColor: "#ef4444" } : null]}
                  placeholder="12-3456789"
                  placeholderTextColor={colors.mutedText}
                  keyboardType="numeric"
                  underlineColorAndroid="transparent"
                  value={formData.fein}
                  onChangeText={(text) => { setFormData({ ...formData, fein: formatEIN(text) }); setEinError(null); }}
                />
              </View>
              {einError && <Text style={styles.formInlineErrorMessage}>{einError}</Text>}

              <Text style={styles.formLabelTitle}>Phone</Text>
              <View style={styles.relativeInputContainer}>
                <Phone size={14} color={colors.metallicGold} style={styles.inputLeftIcon} />
                <TextInput 
                  style={[styles.formInputBox, styles.plInputSpaced]}
                  placeholder="(555) 123-4567"
                  placeholderTextColor={colors.mutedText}
                  keyboardType="phone-pad"
                  underlineColorAndroid="transparent"
                  value={formData.phone}
                  onChangeText={(text) => setFormData({ ...formData, phone: text })}
                />
              </View>

              <Text style={styles.formLabelTitle}>Email</Text>
              <View style={styles.relativeInputContainer}>
                <Mail size={14} color={colors.metallicGold} style={styles.inputLeftIcon} />
                <TextInput 
                  style={[styles.formInputBox, styles.plInputSpaced]}
                  placeholder="contact@company.com"
                  placeholderTextColor={colors.mutedText}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  underlineColorAndroid="transparent"
                  value={formData.email}
                  onChangeText={(text) => setFormData({ ...formData, email: text })}
                />
              </View>

              <Text style={styles.formLabelTitle}>Status</Text>
              <View style={styles.segmentedControlStrip}>
                {(["active", "hold", "archived"] as const).map((st) => (
                  <TouchableOpacity
                    key={st}
                    style={[styles.segmentButtonUnit, formData.status === st && styles.segmentButtonUnitActive]}
                    onPress={() => setFormData({ ...formData, status: st })}
                  >
                    <Text style={[styles.segmentButtonUnitText, formData.status === st && styles.segmentButtonUnitTextActive]}>
                      {st === "active" ? "✅ Active" : st === "hold" ? "⏸️ Hold" : "📦 Archived"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.formLabelTitle}>Color Tag</Text>
              <View style={styles.colorTagVerticalCluster}>
                {(Object.keys(colorTags) as Array<keyof typeof colorTags>).map((tagKey) => {
                  const currentTag = colorTags[tagKey];
                  const isSelected = formData.colorTag === tagKey;
                  return (
                    <TouchableOpacity
                      key={tagKey}
                      style={[styles.tagSelectionRowUnit, isSelected && { borderColor: currentTag.dot, backgroundColor: currentTag.bg }]}
                      onPress={() => setFormData({ ...formData, colorTag: tagKey })}
                    >
                      <View style={[styles.colorDotIndicator, { backgroundColor: currentTag.dot }]} />
                      <Text style={[styles.badgeLabel, { color: isSelected ? currentTag.text : colors.text }]}>
                        {currentTag.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.formLabelTitle}>Notes</Text>
              <TextInput 
                style={[styles.formInputBox, styles.formInputBoxTextArea]}
                placeholder="Additional notes..."
                placeholderTextColor={colors.mutedText}
                multiline
                numberOfLines={4}
                underlineColorAndroid="transparent"
                value={formData.notes}
                onChangeText={(text) => setFormData({ ...formData, notes: text })}
              />
              <View style={{ height: 40 }} />
            </ScrollView>

            <View style={styles.webFooterStickyStyle}>
              <View style={styles.modalControlActionPanel}>
                <TouchableOpacity style={styles.modalCancelButton} onPress={() => setFormModalOpen(false)} disabled={isSubmitting}>
                  <Text style={styles.modalCancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalSubmitButton} onPress={isEditMode ? handleEdit : handleAdd} disabled={isSubmitting}>
                  {isSubmitting ? <ActivityIndicator size="small" color={isMetallic ? "#000" : "#fff"} /> : <Text style={styles.modalSubmitButtonText}>Save</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={deleteConfirmOpen} transparent animationType="fade">
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteConfirmBox}>
            <View style={styles.deleteIconContainer}>
              <Trash2 size={24} color="#ef4444" />
            </View>
            <Text style={styles.deleteTitle}>Delete Company</Text>
            <Text style={styles.deleteDescription}>
              Are you sure you want to delete <Text style={{ fontWeight: "700", color: colors.text }}>{selectedEntry?.companyName}</Text>? This cannot be undone.
            </Text>
            <View style={styles.deleteActionFlexRow}>
              <TouchableOpacity style={styles.deleteCancelBtn} onPress={() => setDeleteConfirmOpen(false)} disabled={isSubmitting}>
                <Text style={styles.deleteCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteSubmitBtn} onPress={handleDelete} disabled={isSubmitting}>
                {isSubmitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.deleteSubmitBtnText}>Delete</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function createStyles(colors: any, isMetallic: boolean) {
  const isWeb = Platform.OS === "web";
  return StyleSheet.create({
    rootContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    headerLayout: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 10,
    },
    appTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.text,
      letterSpacing: -0.5,
    },
    appSubtitle: {
      fontSize: 13,
      color: colors.mutedText,
      marginTop: 2,
    },
    topPrimaryButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: isMetallic ? colors.metallicGold : colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
    },
    topPrimaryButtonText: {
      color: isMetallic ? "#000" : "#fff",
      fontSize: 13,
      fontWeight: "600",
    },
    metricsStrip: {
      paddingHorizontal: 16,
      alignItems: "center",
      gap: 10,
    },
    statChip: {
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderLeftWidth: 4,
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 14,
      minWidth: 105,
      justifyContent: "center",
    },
    statVal: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
    },
    statLabel: {
      fontSize: 11,
      color: colors.mutedText,
      marginTop: 1,
    },
    filterSection: {
      paddingHorizontal: 16,
      marginBottom: 10,
      gap: 8,
    },
    searchBarWrapper: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      height: 40,
    },
    searchBarIcon: {
      marginLeft: 10,
      marginRight: 6,
    },
    searchBarInput: {
      flex: 1,
      fontSize: 14,
      color: colors.text,
      paddingVertical: 4,
    },
    filterSelectorsGroup: {
      flexDirection: "row",
      paddingVertical: 2,
    },
    filterSelectorToggle: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: colors.isDark ? "#334155" : "#e5e7eb",
    },
    filterSelectorToggleActive: {
      backgroundColor: isMetallic ? colors.metallicGold : colors.primary,
    },
    filterSelectorToggleText: {
      fontSize: 11,
      fontWeight: "600",
      color: colors.mutedText,
    },
    filterSelectorToggleTextActive: {
      color: isMetallic ? "#000" : "#fff",
    },
    fallbackLoadingViewport: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingBottom: 80,
      paddingHorizontal: 32,
    },
    emptyPromptTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginTop: 8,
    },
    emptyPromptBody: {
      fontSize: 13,
      color: colors.mutedText,
      textAlign: "center",
      marginTop: 2,
    },
    listViewportContent: {
      paddingHorizontal: 16,
      paddingBottom: 24,
    },
    card: {
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
    },
    cardHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    identityContainer: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    avatarBadge: {
      width: 32,
      height: 32,
      borderRadius: 8,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: {
      fontSize: 14,
      fontWeight: "700",
    },
    cardCompanyName: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.text,
    },
    cardSubText: {
      fontSize: 12,
      color: colors.mutedText,
      marginTop: 1,
    },
    actionIconsRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    iconActionButton: {
      padding: 6,
      borderRadius: 6,
      backgroundColor: colors.isDark ? "#334155" : "#f3f4f6",
    },
    metaInformationGrid: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 12,
      padding: 8,
      borderRadius: 6,
      backgroundColor: colors.isDark ? "#0f172a" : "#f9fafb",
      borderWidth: 1,
      borderColor: colors.border,
    },
    monoFein: {
      fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
      fontSize: 12,
      color: colors.mutedText,
      fontWeight: "600",
    },
    contactValue: {
      fontSize: 12,
      color: colors.mutedText,
      flex: 1,
      textAlign: "right",
      marginLeft: 12,
    },
    cardFooterContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 12,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.innerRowBorder,
    },
    badgeRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    pillBadge: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    colorDotIndicator: {
      width: 6,
      height: 6,
      borderRadius: 3,
      marginRight: 6,
    },
    badgeLabel: {
      fontSize: 11,
      fontWeight: "600",
    },
    fileCounterPill: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.isDark ? "#334155" : "#f3f4f6",
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
    },
    fileCounterText: {
      fontSize: 11,
      fontWeight: "600",
      color: colors.mutedText,
    },
    backdropCoverLayer: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.6)",
      justifyContent: "flex-end",
    },
    drawerCardStructure: {
      backgroundColor: colors.cardBg,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      maxHeight: "85%",
    },
    modalFormBoxStructure: {
      backgroundColor: colors.cardBg,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      maxHeight: "92%",
    },
    drawerTitleContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.cardBg,
    },
    drawerHeaderProfileRow: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    avatarBadgeLarge: {
      width: 44,
      height: 44,
      borderRadius: 10,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarTextLarge: {
      fontSize: 18,
      fontWeight: "700",
    },
    drawerHeaderMeta: {
      flex: 1,
      marginLeft: 12,
      marginRight: 8,
    },
    drawerHeaderBadges: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 4,
    },
    drawerTitleText: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
    },
    closeModalCross: {
      padding: 4,
    },
    detailLabel: {
      fontSize: 11,
      fontWeight: "600",
      color: colors.mutedText,
      letterSpacing: 0.5,
      marginBottom: 4,
      marginTop: 14,
      textTransform: "uppercase",
    },
    detailContentText: {
      fontSize: 14,
      color: colors.text,
      fontWeight: "500",
    },
    detailContentTextMono: {
      fontSize: 12,
      fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
      color: colors.text,
      fontWeight: "600",
    },
    monoFeinBadgeWrapper: {
      backgroundColor: colors.isDark ? "#0f172a" : "#f3f4f6",
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
      alignSelf: "flex-start",
      borderWidth: 1,
      borderColor: colors.border,
    },
    detailHalfWidthGridRow: {
      flexDirection: "row",
      gap: 16,
      marginBottom: 4,
    },
    notesTextWellBox: {
      backgroundColor: colors.isDark ? "#0f172a" : "#f9fafb",
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
      marginTop: 2,
    },
    notesTextValue: {
      fontSize: 13,
      color: colors.text,
      lineHeight: 18,
    },
    attachmentStripButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.isDark ? "#1e3a8a" : "#eff6ff",
      padding: 12,
      borderRadius: 8,
      marginTop: 6,
      borderWidth: 1,
      borderColor: colors.isDark ? "#232f45" : "#e2e8f0",
    },
    attachmentStripText: {
      fontSize: 13,
      color: colors.isDark ? "#60a5fa" : "#1d4ed8",
      fontWeight: "500",
      flex: 1,
    },
    emptyStateFallbackSubtext: {
      fontSize: 13,
      color: colors.mutedText,
      fontStyle: "italic",
      marginTop: 4,
    },
    modalControlActionPanel: {
      flexDirection: "row",
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: 12,
      backgroundColor: colors.isDark ? "#0f172a" : "#f9fafb",
    },
    modalCancelButton: {
      flex: 1,
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    modalCancelButtonText: {
      color: colors.text,
      fontWeight: "600",
      fontSize: 14,
    },
    modalSubmitButton: {
      flex: 1,
      backgroundColor: isMetallic ? colors.metallicGold : colors.primary,
      borderRadius: 8,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
    },
    modalSubmitButtonText: {
      color: isMetallic ? "#000" : "#fff",
      fontWeight: "600",
      fontSize: 14,
    },
    formLabelTitle: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 6,
      marginTop: 14,
      textTransform: "uppercase",
      letterSpacing: 0.3,
    },
    formInputBox: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.inputBg,
      borderRadius: 8,
      height: 40,
      paddingHorizontal: 12,
      fontSize: 14,
      color: colors.inputText,
    },
    relativeInputContainer: {
      position: "relative",
      justifyContent: "center",
      borderWidth: 0,
      backgroundColor: "transparent",
    },
    inputLeftIcon: {
      position: "absolute",
      left: 12,
      zIndex: 2,
    },
    plInputSpaced: {
      paddingLeft: 36,
    },
    formInputBoxTextArea: {
      height: 80,
      paddingTop: 10,
      textAlignVertical: "top",
    },
    formInlineErrorMessage: {
      color: "#ef4444",
      fontSize: 12,
      marginTop: 4,
      fontWeight: "500",
    },
    horizontalRadioCluster: {
      gap: 6,
      paddingVertical: 2,
    },
    radioButtonItem: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.cardBg,
    },
    radioButtonItemActive: {
      borderColor: isMetallic ? colors.metallicGold : colors.primary,
      backgroundColor: colors.isDark ? "#1e3a8a" : "#eff6ff",
    },
    radioButtonText: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.mutedText,
    },
    radioButtonItemActiveText: {
      color: colors.isDark ? "#60a5fa" : "#1d4ed8",
    },
    radioButtonTextActive: {
      color: colors.isDark ? "#60a5fa" : "#1d4ed8",
    },
    segmentedControlStrip: {
      flexDirection: "row",
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      backgroundColor: colors.isDark ? "#0f172a" : "#f3f4f6",
      padding: 3,
      gap: 4,
    },
    segmentButtonUnit: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      height: 34,
      borderRadius: 6,
    },
    segmentButtonUnitActive: {
      backgroundColor: colors.cardBg,
      shadowColor: "#000",
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    segmentButtonUnitText: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.mutedText,
    },
    segmentButtonUnitTextActive: {
      color: colors.text,
    },
    colorTagVerticalCluster: {
      gap: 6,
    },
    tagSelectionRowUnit: {
      flexDirection: "row",
      alignItems: "center",
      height: 38,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      backgroundColor: colors.cardBg,
    },
    deleteModalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.6)",
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    deleteConfirmBox: {
      backgroundColor: colors.cardBg,
      width: "100%",
      maxWidth: 320,
      borderRadius: 14,
      padding: 20,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    deleteIconContainer: {
      width: 44,
      height: 44,
      borderRadius: 10,
      backgroundColor: "rgba(239,68,68,0.1)",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 12,
    },
    deleteTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 6,
    },
    deleteDescription: {
      fontSize: 13,
      color: colors.mutedText,
      textAlign: "center",
      lineHeight: 18,
      marginBottom: 20,
    },
    deleteActionFlexRow: {
      flexDirection: "row",
      gap: 8,
      width: "100%",
    },
    deleteCancelBtn: {
      flex: 1,
      height: 38,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.cardBg,
    },
    deleteCancelBtnText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.text,
    },
    deleteSubmitBtn: {
      flex: 1,
      height: 38,
      borderRadius: 8,
      backgroundColor: "#ef4444",
      alignItems: "center",
      justifyContent: "center",
    },
    deleteSubmitBtnText: {
      fontSize: 13,
      fontWeight: "600",
      color: "#fff",
    },
    webHeaderStickyStyle: isWeb ? { position: "sticky", top: 0, zIndex: 10, width: "100%" } : { width: "100%" },
    webFooterStickyStyle: isWeb ? { position: "sticky", bottom: 0, zIndex: 10, width: "100%" } : { width: "100%" },
  });
}