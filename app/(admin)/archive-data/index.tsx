import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
  Image,
  SafeAreaView,
  Platform,
  useWindowDimensions,
} from "react-native";
import { apiFetch } from "@/lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Archive,
  RotateCcw,
  Trash2,
  MessageSquare,
  Paperclip,
  FileText,
  AlertCircle,
  Calendar,
  User,
  Search,
  ChevronDown,
  RefreshCw,
  X,
} from "lucide-react-native";
import { s } from "@/util/styles";

interface ArchivedItem {
  id: string;
  itemType: string;
  itemData: Record<string, any>;
  parentType: string;
  parentId: string;
  parentName: string;
  archivedByUsername: string;
  archivedByRole: string;
  createdAt: string;
}

interface PaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ItemTypeConfig {
  icon: React.ComponentType<any>;
  color: string;
  bg: string;
  borderColor: string;
}

const itemTypeMap: Record<string, ItemTypeConfig> = {
  comment: { icon: MessageSquare, color: "#2563eb", bg: "#eff6ff", borderColor: "#bfdbfe" },
  attachment: { icon: Paperclip, color: "#7c3aed", bg: "#f5f3ff", borderColor: "#ddd6fe" },
  task: { icon: FileText, color: "#d97706", bg: "#fffbeb", borderColor: "#fde68a" },
  user: { icon: User, color: "#475569", bg: "#f8fafc", borderColor: "#e2e8f0" },
};

export default function ArchiveData() {
  const { width, height } = useWindowDimensions();
  const wp = useCallback((percentage: number) => (width * percentage) / 100, [width]);
  const hp = useCallback((percentage: number) => (height * percentage) / 100, [height]);
  const isTablet = width >= 768;
  const isSmallScreen = width < 375;

  const [items, setItems] = useState<ArchivedItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [showTypeDropdown, setShowTypeDropdown] = useState<boolean>(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string>("");

  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });

  const { uiTheme } = useTheme() as any;

  const isLightTheme = useMemo(() => {
    return (
      uiTheme?.theme?.includes("crystal") ||
      uiTheme?.panelColors?.dashboardTextColor === "#000000"
    );
  }, [uiTheme]);

  const activeColors = useMemo(() => {
    const bg = uiTheme?.panelColors?.dashboardBackground || (isLightTheme ? "#f8fafc" : "#09090b");
    const surface = uiTheme?.panelColors?.dashboardCardBackground || (isLightTheme ? "#ffffff" : "#141417");
    const textColor = uiTheme?.panelColors?.dashboardTextColor || (isLightTheme ? "#0f172a" : "#f4f4f5");
    const textSecondary = isLightTheme ? "#64748b" : "#9ca3af";
    const border = uiTheme?.panelColors?.borderColor || (isLightTheme ? "#e2e8f0" : "rgba(255, 255, 255, 0.08)");
    const primary = uiTheme?.customColors?.primary || "#b45309";
    const inputBg = isLightTheme ? "#ffffff" : "rgba(255, 255, 255, 0.04)";

    return {
      background: bg,
      surface: surface,
      text: textColor,
      textSecondary: textSecondary,
      border: border,
      primary: primary,
      inputBg: inputBg,
      modalBg: "#0f172a",
      modalInputBg: "#1e293b",
      modalText: "#f8fafc",
      modalTextSecondary: "#94a3b8",
      modalBorder: "rgba(255, 255, 255, 0.12)",
    };
  }, [uiTheme, isLightTheme]);

  const styles = useMemo(
    () => createStyles(activeColors, wp, hp, isTablet, isSmallScreen, height),
    [activeColors, wp, hp, isTablet, isSmallScreen, height]
  );

  const fetchArchive = async (pageTarget = pagination.page) => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ page: String(pageTarget), limit: "20" });
      if (typeFilter !== "all") params.set("itemType", typeFilter);

      const res = await apiFetch<any>(`/api/archive?${params.toString()}`);
      if (res) {
        setItems(res.items || []);
        if (res.total !== undefined) {
          setPagination({
            page: res.page || 1,
            limit: res.limit || 20,
            total: res.total || 0,
            totalPages: res.totalPages || 1,
          });
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load archive data stream.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchive(1);
  }, [typeFilter]);

  const handleRestore = async (id: string) => {
    try {
      setRestoringId(id);
      await apiFetch(`/api/archive/${id}/restore`, { method: "POST" });
      setItems((prev) => prev.filter((i) => i.id !== id));
      setPagination((prev) => ({ ...prev, total: Math.max(0, prev.total - 1) }));
      Alert.alert("Restored", "Item has been restored successfully.");
    } catch (e) {
      Alert.alert("Restore Failed", e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setRestoringId(null);
    }
  };

  const handleDeleteConfirmation = (id: string) => {
    Alert.alert(
      "Permanently Delete?",
      "This will permanently remove this item. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete Forever", style: "destructive", onPress: () => handleDelete(id) },
      ]
    );
  };

  const handleDelete = async (id: string) => {
    try {
      await apiFetch(`/api/archive/${id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((i) => i.id !== id));
      setPagination((prev) => ({ ...prev, total: Math.max(0, prev.total - 1) }));
      Alert.alert("Deleted", "Item permanently deleted.");
    } catch (e) {
      Alert.alert("Delete Failed", e instanceof Error ? e.message : "Something went wrong");
    }
  };

  const filteredItems = items.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const data = item.itemData;
    return (
      (data.message || "").toLowerCase().includes(q) ||
      (data.fileName || "").toLowerCase().includes(q) ||
      (data.name || "").toLowerCase().includes(q) ||
      (data.email || "").toLowerCase().includes(q) ||
      (data.username || "").toLowerCase().includes(q) ||
      (item.parentName || "").toLowerCase().includes(q) ||
      (data.authorUsername || "").toLowerCase().includes(q)
    );
  });

  const formatDateLabel = (rawDate: string) => {
    if (!rawDate) return "—";
    return new Date(rawDate).toLocaleString();
  };

  const filterOptions = [
    { id: "all", name: "All Types" },
    { id: "comment", name: "Comments" },
    { id: "attachment", name: "Attachments" },
    { id: "task", name: "Tasks" },
    { id: "user", name: "Users" },
  ];

  const activeFilterLabel = filterOptions.find((f) => f.id === typeFilter)?.name || "All Types";

  return (
    <SafeAreaView style={[s(styles.safeArea), { backgroundColor: activeColors.background }]}>
      
      <View style={s(styles.headerBlock)}>
        <View style={s(styles.titleRow)}>
          <Archive size={26} color={activeColors.primary} style={s(styles.headerIcon)} />
          <Text style={[s(styles.headerTitle), { color: activeColors.text }]}>Archive Data</Text>
        </View>
        <Text style={[s(styles.headerSubtitle), { color: activeColors.textSecondary }]}>
          View and manage archived comments, attachments, and other items. Items can be restored or permanently deleted.
        </Text>
      </View>

      {error && (
        <View style={s(styles.errorAlertFrame)}>
          <AlertCircle size={16} color="#ef4444" style={s(styles.iconInlineMarginRight)} />
          <Text style={s(styles.errorAlertText)}>{error}</Text>
        </View>
      )}

      <View style={[s(styles.filterCardSurface), { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
        <View style={[s(styles.searchFieldWrapperFlex), { backgroundColor: activeColors.inputBg, borderColor: activeColors.border }]}>
          <Search size={16} color={activeColors.textSecondary} style={s(styles.searchIconPadding)} />
          <TextInput
            style={[s(styles.searchBarInputFieldText), { color: activeColors.text }]}
            placeholder="Search archived items..."
            placeholderTextColor={activeColors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View style={s(styles.filterActionControlsRow)}>
          <TouchableOpacity 
            style={[s(styles.dropdownMenuTriggerAnchor), { backgroundColor: activeColors.inputBg, borderColor: activeColors.border }]} 
            activeOpacity={0.7}
            onPress={() => setShowTypeDropdown(true)}
          >
            <Text style={[s(styles.dropdownMenuTriggerText), { color: activeColors.text }]} numberOfLines={1}>{activeFilterLabel}</Text>
            <ChevronDown size={14} color={activeColors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[s(styles.refreshModuleButton), { backgroundColor: activeColors.inputBg, borderColor: activeColors.border }]} 
            onPress={() => void fetchArchive(1)}
            disabled={loading}
          >
            <RefreshCw size={14} color={activeColors.textSecondary} style={s(loading && styles.processingOpacity)} />
            <Text style={[s(styles.refreshButtonLabelText), { color: activeColors.text }]}>Refresh</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={s(styles.metricsRowStripContainer)}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s(styles.metricsScrollCanvas)}>
          <View style={[s(styles.metricDataBoxFrame), styles.themeSlateStatsBg, { borderColor: activeColors.border }]}>
            <Text style={[s(styles.metricNumericValueText), { color: activeColors.text }]}>{pagination.total}</Text>
            <Text style={[s(styles.metricLabelMetaText), { color: activeColors.textSecondary }]}>Total Archived</Text>
          </View>
          <View style={[s(styles.metricDataBoxFrame), styles.themeBlueStatsBg]}>
            <Text style={s(styles.metricNumericValueTextBlue)}>{items.filter((i) => i.itemType === "comment").length}</Text>
            <Text style={[s(styles.metricLabelMetaText), { color: activeColors.textSecondary }]}>Comments</Text>
          </View>
          <View style={[s(styles.metricDataBoxFrame), styles.themePurpleStatsBg]}>
            <Text style={s(styles.metricNumericValueTextPurple)}>{items.filter((i) => i.itemType === "attachment").length}</Text>
            <Text style={[s(styles.metricLabelMetaText), { color: activeColors.textSecondary }]}>Attachments</Text>
          </View>
          <View style={[s(styles.metricDataBoxFrame), styles.themeGoldStatsBg]}>
            <Text style={s(styles.metricNumericValueTextGold)}>{items.filter((i) => i.itemType === "task").length}</Text>
            <Text style={[s(styles.metricLabelMetaText), { color: activeColors.textSecondary }]}>Tasks</Text>
          </View>
        </ScrollView>
      </View>

      {loading && items.length === 0 ? (
        <View style={s(styles.centerStatusLoadingEngine)}>
          <ActivityIndicator size="large" color={activeColors.primary} />
          <Text style={[s(styles.loadingProgressSubtext), { color: activeColors.textSecondary }]}>Loading archived items...</Text>
        </View>
      ) : filteredItems.length === 0 ? (
        <View style={[s(styles.emptyStateFallbackContainer), { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
          <Archive size={48} color={activeColors.textSecondary} style={s(styles.emptyStateCentralIcon)} />
          <Text style={[s(styles.emptyStateMainHeading), { color: activeColors.text }]}>No archived items found</Text>
          <Text style={[s(styles.emptyStateParagraphSubtext), { color: activeColors.textSecondary }]}>Archived comments and attachments will appear here.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s(styles.mainRegistryScrollCanvas)} showsVerticalScrollIndicator={false}>
          <View style={s(styles.registryCardsStackLayout)}>
            {filteredItems.map((item, idx) => {
              const typeConfig = itemTypeMap[item.itemType] || { icon: FileText, color: "#64748b", bg: "rgba(100, 116, 139, 0.15)", borderColor: "rgba(100, 116, 139, 0.3)" };
              const RenderedIcon = typeConfig.icon;
              const globalIndexCounter = (pagination.page - 1) * pagination.limit + idx + 1;

              return (
                <View key={item.id || idx.toString()} style={[s(styles.registryRowItemCard), { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
                  <View style={s(styles.rowCardHeaderTopLineAlignment)}>
                    <View style={s(styles.rowCardLeftIconIndicatorBlock, { backgroundColor: typeConfig.bg, borderColor: typeConfig.borderColor })}>
                      <RenderedIcon size={14} color={typeConfig.color} />
                      <View style={[s(styles.indexBadgePinCircle), { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
                        <Text style={[s(styles.indexBadgePinInnerText), { color: activeColors.text }]}>{globalIndexCounter}</Text>
                      </View>
                    </View>

                    <View style={s(styles.metadataLabelsColumnFlow)}>
                      <View style={s(styles.badgeMetaRowFlexContainer)}>
                        <View style={s(styles.typeBadgeContainer, { backgroundColor: typeConfig.bg, borderColor: typeConfig.borderColor })}>
                          <Text style={s(styles.typeBadgeInnerText, { color: typeConfig.color })}>{item.itemType}</Text>
                        </View>
                        <Text style={[s(styles.originParentHierarchyLabelSubtext), { color: activeColors.textSecondary }]} numberOfLines={1}>
                          from <Text style={[s(styles.originParentNameHighlightBoldText), { color: activeColors.text }]}>{item.parentName || "Unknown"}</Text>
                        </Text>
                      </View>

                      {item.itemType === "comment" && (
                        <Text style={[s(styles.textBodyContentDisplayParagraph), { color: activeColors.text }]} numberOfLines={4}>
                          {item.itemData.message || "—"}
                        </Text>
                      )}

                      {item.itemType === "attachment" && (
                        <View style={s(styles.attachmentInnerPayloadLayoutBlock)}>
                          <Text style={[s(styles.attachmentFileNameLabelText), { color: activeColors.text }]} numberOfLines={1}>
                            {item.itemData.fileName || "Unknown file"}
                          </Text>
                          {item.itemData.size > 0 && (
                            <Text style={[s(styles.attachmentMetaSizeInfoSubtext), { color: activeColors.textSecondary }]}>
                              ({(item.itemData.size / 1024).toFixed(1)} KB)
                            </Text>
                          )}
                          {item.itemData.mimeType?.startsWith("image/") && item.itemData.url && (
                            <TouchableOpacity 
                              style={[s(styles.thumbnailPreviewTouchBoundary), { borderColor: activeColors.border, backgroundColor: activeColors.inputBg }]}
                              activeOpacity={0.8}
                              onPress={() => {
                                setPreviewUrl(item.itemData.url);
                                setPreviewName(item.itemData.fileName || "Image Preview");
                              }}
                            >
                              <Image source={{ uri: item.itemData.url }} style={s(styles.thumbnailPreviewImageNode)} />
                            </TouchableOpacity>
                          )}
                        </View>
                      )}

                      {item.itemType === "task" && (
                        <View style={s(styles.taskInnerPayloadLayoutBlock)}>
                          <Text style={[s(styles.taskTitleLabelHeaderText), { color: activeColors.text }]} numberOfLines={2}>
                            {item.itemData.title || "—"}
                          </Text>
                          <View style={s(styles.taskPropertiesBadgeWrapRow)}>
                            {item.itemData.status && (
                              <View style={[s(styles.taskPropertyMutedBadgeFrame), { backgroundColor: activeColors.inputBg }]}>
                                <Text style={[s(styles.taskPropertyMutedBadgeInnerText), { color: activeColors.textSecondary }]}>{item.itemData.status}</Text>
                              </View>
                            )}
                            {item.itemData.priority && (
                              <View style={[s(styles.taskPropertyMutedBadgeFrame), { backgroundColor: activeColors.inputBg }]}>
                                <Text style={[s(styles.taskPropertyMutedBadgeInnerText), { color: activeColors.textSecondary }]}>{item.itemData.priority}</Text>
                              </View>
                            )}
                          </View>
                        </View>
                      )}

                      {item.itemType === "user" && (
                        <View style={s(styles.userInnerPayloadLayoutBlock)}>
                          <Text style={[s(styles.userProfileFullNameText), { color: activeColors.text }]} numberOfLines={1}>
                            {item.itemData.name || "—"}
                          </Text>
                          <Text style={[s(styles.userProfileMetaSpecsSubtext), { color: activeColors.textSecondary }]} numberOfLines={1}>
                            {item.itemData.email} • {item.itemData.role}
                          </Text>
                        </View>
                      )}

                      <View style={s(styles.chronologyFooterRowMetaBlock)}>
                        {item.itemData.authorUsername && (
                          <View style={s(styles.inlineMetaFlexAlignmentRow)}>
                            <User size={10} color={activeColors.textSecondary} style={s(styles.iconInlineMarginRight)} />
                            <Text style={[s(styles.chronologyMetaInnerText), { color: activeColors.textSecondary }]} numberOfLines={1}>{item.itemData.authorUsername}</Text>
                          </View>
                        )}
                        <View style={s(styles.inlineMetaFlexAlignmentRow)}>
                          <Calendar size={10} color={activeColors.textSecondary} style={s(styles.iconInlineMarginRight)} />
                          <Text style={[s(styles.chronologyMetaInnerText), { color: activeColors.textSecondary }]} numberOfLines={1}>{formatDateLabel(item.createdAt)}</Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  <View style={[s(styles.rowCardActionsControlPanelStrip), { borderTopColor: activeColors.border }]}>
                    <TouchableOpacity 
                      style={[s(styles.actionButtonFrame), styles.actionRestoreThemeButton]} 
                      activeOpacity={0.7}
                      onPress={() => void handleRestore(item.id)}
                      disabled={restoringId === item.id}
                    >
                      {restoringId === item.id ? (
                        <ActivityIndicator size="small" color="#16a34a" />
                      ) : (
                        <>
                          <RotateCcw size={12} color="#16a34a" style={s(styles.iconInlineMarginRight)} />
                          <Text style={[s(styles.actionButtonLabelText), styles.actionRestoreLabelThemeText]}>Restore</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[s(styles.actionButtonFrame), styles.actionDeleteThemeButton]} 
                      activeOpacity={0.7}
                      onPress={() => handleDeleteConfirmation(item.id)}
                    >
                      <Trash2 size={12} color="#dc2626" style={s(styles.iconInlineMarginRight)} />
                      <Text style={[s(styles.actionButtonLabelText), styles.actionDeleteLabelThemeText]}>Delete</Text>
                    </TouchableOpacity>
                  </View>

                </View>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* Solid Dark Opaque Dropdown Picker Modal */}
      <Modal animationType="slide" transparent={true} visible={showTypeDropdown} onRequestClose={() => setShowTypeDropdown(false)}>
        <View style={s(styles.modalOverlayBlurUnderlay)}>
          <View style={[s(styles.dropdownPickerContentWindowCard), { backgroundColor: activeColors.modalBg }]}>
            <View style={[s(styles.dropdownPickerHeaderRow), { borderBottomColor: activeColors.modalBorder }]}>
              <Text style={[s(styles.dropdownPickerHeaderTitleText), { color: activeColors.modalText }]}>Filter by type</Text>
              <TouchableOpacity onPress={() => setShowTypeDropdown(false)} style={s(styles.closeModalCrossTouchTarget)} activeOpacity={0.7}>
                <X size={16} color={activeColors.modalTextSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={s(styles.dropdownPickerItemsScrollCanvas)} keyboardShouldPersistTaps="handled">
              {filterOptions.map((option) => {
                const isOptionActive = typeFilter === option.id;
                return (
                  <TouchableOpacity
                    key={option.id}
                    style={[s(styles.dropdownPickerSelectionOptionRowAnchor), { borderBottomColor: activeColors.modalBorder }]}
                    activeOpacity={0.7}
                    onPress={() => {
                      setTypeFilter(option.id);
                      setShowTypeDropdown(false);
                    }}
                  >
                    <Text style={[s(styles.dropdownPickerOptionValueText), { color: isOptionActive ? activeColors.primary : activeColors.modalText }, isOptionActive && styles.activeGoldenSelectionText]}>
                      {option.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Lightbox Preview Modal */}
      <Modal animationType="fade" transparent={true} visible={!!previewUrl} onRequestClose={() => setPreviewUrl(null)}>
        <View style={s(styles.lightboxBackgroundWindowOverlay)}>
          <View style={s(styles.lightboxHeaderNavigationBarRow)}>
            <Text style={s(styles.lightboxHeaderTitleLabelText)} numberOfLines={1}>{previewName}</Text>
            <TouchableOpacity onPress={() => setPreviewUrl(null)} style={s(styles.closeLightboxCircularButtonAnchor)} activeOpacity={0.7}>
              <X size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>
          <View style={s(styles.lightboxCentralImageDisplayFrame)}>
            {previewUrl && (
              <Image source={{ uri: previewUrl }} style={s(styles.lightboxRenderedImageNode)} resizeMode="contain" />
            )}
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const createStyles = (
  colors: any,
  wp: (percentage: number) => number,
  hp: (percentage: number) => number,
  isTablet: boolean,
  isSmallScreen: boolean,
  windowHeight: number
) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
    },
    headerBlock: {
      paddingHorizontal: isTablet ? wp(6) : isSmallScreen ? wp(3) : wp(4.2),
      paddingTop: hp(2),
      paddingBottom: hp(1.2),
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: hp(0.6),
    },
    headerIcon: {
      marginRight: wp(2),
    },
    headerTitle: {
      fontSize: isTablet ? 26 : 22,
      fontWeight: "800",
      letterSpacing: -0.5,
    },
    headerSubtitle: {
      fontSize: isTablet ? 13 : 12,
      lineHeight: isTablet ? 18 : 16,
    },
    errorAlertFrame: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(239, 68, 68, 0.1)",
      borderWidth: 1,
      borderColor: "rgba(239, 68, 68, 0.3)",
      borderRadius: wp(2),
      marginHorizontal: isTablet ? wp(6) : wp(4.2),
      padding: wp(2.5),
      marginBottom: hp(1.5),
    },
    errorAlertText: {
      fontSize: isTablet ? 13 : 12,
      color: "#ef4444",
      flex: 1,
    },
    filterCardSurface: {
      borderWidth: 1,
      borderRadius: wp(3),
      marginHorizontal: isTablet ? wp(6) : isSmallScreen ? wp(3) : wp(4.2),
      padding: wp(3),
      gap: hp(1.2),
      marginBottom: hp(1.8),
    },
    searchFieldWrapperFlex: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderRadius: wp(2),
      paddingHorizontal: wp(2.5),
      height: hp(4.8),
    },
    searchIconPadding: {
      marginRight: wp(1.5),
    },
    searchBarInputFieldText: {
      flex: 1,
      fontSize: isTablet ? 14 : 13,
      height: "100%",
    },
    filterActionControlsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: wp(2),
    },
    dropdownMenuTriggerAnchor: {
      flex: 1.3,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderWidth: 1,
      borderRadius: wp(2),
      height: hp(4.5),
      paddingHorizontal: wp(2.5),
    },
    dropdownMenuTriggerText: {
      fontSize: isTablet ? 13 : 12,
      fontWeight: "600",
    },
    refreshModuleButton: {
      flex: 0.9,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderRadius: wp(2),
      height: hp(4.5),
      gap: wp(1),
    },
    processingOpacity: {
      opacity: 0.4,
    },
    refreshButtonLabelText: {
      fontSize: isTablet ? 13 : 12,
      fontWeight: "600",
    },
    metricsRowStripContainer: {
      marginBottom: hp(1.8),
    },
    metricsScrollCanvas: {
      paddingHorizontal: isTablet ? wp(6) : wp(4.2),
      gap: wp(2),
    },
    metricDataBoxFrame: {
      borderWidth: 1,
      borderRadius: wp(2.5),
      paddingVertical: hp(1.2),
      paddingHorizontal: wp(3.5),
      minWidth: isTablet ? wp(18) : wp(28),
    },
    themeSlateStatsBg: { backgroundColor: "rgba(148, 163, 184, 0.12)" },
    themeBlueStatsBg: { backgroundColor: "rgba(37, 99, 235, 0.12)", borderColor: "rgba(37, 99, 235, 0.3)" },
    themePurpleStatsBg: { backgroundColor: "rgba(124, 58, 237, 0.12)", borderColor: "rgba(124, 58, 237, 0.3)" },
    themeGoldStatsBg: { backgroundColor: "rgba(217, 119, 6, 0.12)", borderColor: "rgba(217, 119, 6, 0.3)" },
    metricNumericValueText: {
      fontSize: isTablet ? 20 : 18,
      fontWeight: "800",
    },
    metricNumericValueTextBlue: {
      fontSize: isTablet ? 20 : 18,
      fontWeight: "800",
      color: "#3b82f6",
    },
    metricNumericValueTextPurple: {
      fontSize: isTablet ? 20 : 18,
      fontWeight: "800",
      color: "#a855f7",
    },
    metricNumericValueTextGold: {
      fontSize: isTablet ? 20 : 18,
      fontWeight: "800",
      color: "#f59e0b",
    },
    metricLabelMetaText: {
      fontSize: isTablet ? 11 : 10,
      fontWeight: "600",
      marginTop: hp(0.2),
    },
    centerStatusLoadingEngine: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: hp(8),
    },
    loadingProgressSubtext: {
      fontSize: isTablet ? 14 : 13,
      marginTop: hp(1),
    },
    emptyStateFallbackContainer: {
      borderWidth: 1,
      borderRadius: wp(3),
      marginHorizontal: isTablet ? wp(6) : wp(4.2),
      paddingVertical: hp(6),
      paddingHorizontal: wp(5),
      alignItems: "center",
      justifyContent: "center",
    },
    emptyStateCentralIcon: {
      marginBottom: hp(1.2),
      opacity: 0.6,
    },
    emptyStateMainHeading: {
      fontSize: isTablet ? 16 : 14,
      fontWeight: "700",
      marginBottom: hp(0.5),
    },
    emptyStateParagraphSubtext: {
      fontSize: isTablet ? 13 : 12,
      textAlign: "center",
    },
    mainRegistryScrollCanvas: {
      paddingHorizontal: isTablet ? wp(6) : isSmallScreen ? wp(3) : wp(4.2),
      paddingBottom: hp(5),
    },
    registryCardsStackLayout: {
      flexDirection: isTablet ? "row" : "column",
      flexWrap: isTablet ? "wrap" : "nowrap",
      gap: wp(3),
    },
    registryRowItemCard: {
      borderWidth: 1,
      borderRadius: wp(3),
      padding: wp(3.5),
      width: isTablet ? "48.5%" : "100%",
    },
    rowCardHeaderTopLineAlignment: {
      flexDirection: "row",
      alignItems: "flex-start",
    },
    rowCardLeftIconIndicatorBlock: {
      width: isTablet ? 36 : 32,
      height: isTablet ? 36 : 32,
      borderRadius: isTablet ? 18 : 16,
      borderWidth: 1,
      justifyContent: "center",
      alignItems: "center",
      position: "relative",
      marginRight: wp(3),
    },
    indexBadgePinCircle: {
      position: "absolute",
      top: -4,
      right: -4,
      borderWidth: 0.5,
      borderRadius: 8,
      minWidth: 15,
      height: 15,
      paddingHorizontal: 2,
      justifyContent: "center",
      alignItems: "center",
    },
    indexBadgePinInnerText: {
      fontSize: 8,
      fontWeight: "800",
    },
    metadataLabelsColumnFlow: {
      flex: 1,
    },
    badgeMetaRowFlexContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: wp(1.5),
      marginBottom: hp(0.6),
      flexWrap: "wrap",
    },
    typeBadgeContainer: {
      borderWidth: 1,
      borderRadius: wp(1),
      paddingHorizontal: wp(1.5),
      paddingVertical: hp(0.2),
    },
    typeBadgeInnerText: {
      fontSize: 9,
      fontWeight: "700",
      textTransform: "uppercase",
    },
    originParentHierarchyLabelSubtext: {
      fontSize: isTablet ? 12 : 11,
    },
    originParentNameHighlightBoldText: {
      fontWeight: "600",
    },
    textBodyContentDisplayParagraph: {
      fontSize: isTablet ? 14 : 13,
      lineHeight: isTablet ? 20 : 18,
    },
    attachmentInnerPayloadLayoutBlock: {
      width: "100%",
    },
    attachmentFileNameLabelText: {
      fontSize: isTablet ? 14 : 13,
      fontWeight: "700",
    },
    attachmentMetaSizeInfoSubtext: {
      fontSize: 10,
      marginTop: hp(0.2),
      marginBottom: hp(0.5),
    },
    thumbnailPreviewTouchBoundary: {
      width: wp(24),
      height: hp(8),
      borderRadius: wp(1.5),
      overflow: "hidden",
      borderWidth: 1,
      marginTop: hp(0.5),
    },
    thumbnailPreviewImageNode: {
      width: "100%",
      height: "100%",
    },
    taskInnerPayloadLayoutBlock: {
      width: "100%",
    },
    taskTitleLabelHeaderText: {
      fontSize: isTablet ? 14 : 13,
      fontWeight: "700",
    },
    taskPropertiesBadgeWrapRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: wp(1),
      marginTop: hp(0.5),
    },
    taskPropertyMutedBadgeFrame: {
      borderRadius: wp(1),
      paddingHorizontal: wp(1.5),
      paddingVertical: hp(0.2),
    },
    taskPropertyMutedBadgeInnerText: {
      fontSize: 9,
      fontWeight: "600",
      textTransform: "capitalize",
    },
    userInnerPayloadLayoutBlock: {
      width: "100%",
    },
    userProfileFullNameText: {
      fontSize: isTablet ? 14 : 13,
      fontWeight: "700",
    },
    userProfileMetaSpecsSubtext: {
      fontSize: isTablet ? 12 : 11,
      marginTop: hp(0.2),
    },
    chronologyFooterRowMetaBlock: {
      flexDirection: "row",
      alignItems: "center",
      gap: wp(2.5),
      marginTop: hp(0.8),
      flexWrap: "wrap",
    },
    inlineMetaFlexAlignmentRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    iconInlineMarginRight: {
      marginRight: wp(1),
    },
    chronologyMetaInnerText: {
      fontSize: 10,
      fontWeight: "500",
    },
    rowCardActionsControlPanelStrip: {
      flexDirection: "row",
      justifyContent: "flex-end",
      borderTopWidth: 1,
      paddingTop: hp(1.2),
      marginTop: hp(1.2),
      gap: wp(2),
    },
    actionButtonFrame: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      height: hp(3.6),
      borderRadius: wp(1.5),
      borderWidth: 1,
      paddingHorizontal: wp(2.5),
    },
    actionRestoreThemeButton: {
      borderColor: "rgba(34, 197, 94, 0.4)",
      backgroundColor: "rgba(34, 197, 94, 0.12)",
    },
    actionDeleteThemeButton: {
      borderColor: "rgba(239, 68, 68, 0.4)",
      backgroundColor: "rgba(239, 68, 68, 0.12)",
    },
    actionButtonLabelText: {
      fontSize: isTablet ? 12 : 11,
      fontWeight: "600",
    },
    actionRestoreLabelThemeText: { color: "#16a34a" },
    actionDeleteLabelThemeText: { color: "#dc2626" },
    modalOverlayBlurUnderlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.85)",
      justifyContent: "flex-end",
    },
    dropdownPickerContentWindowCard: {
      borderTopLeftRadius: wp(5),
      borderTopRightRadius: wp(5),
      width: "100%",
      maxHeight: windowHeight * 0.5,
      padding: wp(5),
    },
    dropdownPickerHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderBottomWidth: 1,
      paddingBottom: hp(1.5),
      marginBottom: hp(1),
    },
    dropdownPickerHeaderTitleText: {
      fontSize: isTablet ? 17 : 15,
      fontWeight: "700",
    },
    closeModalCrossTouchTarget: {
      padding: wp(1),
    },
    dropdownPickerItemsScrollCanvas: {
      flexGrow: 0,
    },
    dropdownPickerSelectionOptionRowAnchor: {
      paddingVertical: hp(1.8),
      paddingHorizontal: wp(1),
      borderBottomWidth: 1,
    },
    dropdownPickerOptionValueText: {
      fontSize: isTablet ? 15 : 14,
      fontWeight: "500",
    },
    activeGoldenSelectionText: {
      fontWeight: "700",
    },
    lightboxBackgroundWindowOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.92)",
      justifyContent: "center",
      alignItems: "center",
    },
    lightboxHeaderNavigationBarRow: {
      position: "absolute",
      top: Platform.OS === "ios" ? hp(6) : hp(3),
      left: 0,
      right: 0,
      height: hp(6),
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: wp(5),
      zIndex: 10,
    },
    lightboxHeaderTitleLabelText: {
      color: "#ffffff",
      fontSize: isTablet ? 15 : 14,
      fontWeight: "600",
      flex: 1,
      marginRight: wp(4),
    },
    closeLightboxCircularButtonAnchor: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: "rgba(255, 255, 255, 0.15)",
      justifyContent: "center",
      alignItems: "center",
    },
    lightboxCentralImageDisplayFrame: {
      width: wp(100),
      height: windowHeight * 0.75,
      justifyContent: "center",
      alignItems: "center",
    },
    lightboxRenderedImageNode: {
      width: "100%",
      height: "100%",
    },
  });