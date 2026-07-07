import React, { useState, useEffect } from "react";
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
  Dimensions,Platform
} from "react-native";
import { apiFetch } from "@/lib/admin/apiClient";
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
  ChevronDown,RefreshCw,
  X
  
} from "lucide-react-native";
import { s } from "@/util/styles";

const { height, width } = Dimensions.get("window");

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
  user: { icon: User, color: "#475569", bg: "#f8fafc", borderColor: "#e2e8f0" }
};

export default function ArchiveData() {
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
    totalPages: 1
  });

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
            totalPages: res.totalPages || 1
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
      setPagination(prev => ({ ...prev, total: Math.max(0, prev.total - 1) }));
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
        { text: "Delete Forever", style: "destructive", onPress: () => handleDelete(id) }
      ]
    );
  };

  const handleDelete = async (id: string) => {
    try {
      await apiFetch(`/api/archive/${id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((i) => i.id !== id));
      setPagination(prev => ({ ...prev, total: Math.max(0, prev.total - 1) }));
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
    { id: "user", name: "Users" }
  ];

  const activeFilterLabel = filterOptions.find(f => f.id === typeFilter)?.name || "All Types";

  return (
    <SafeAreaView style={s(styles.safeArea)}>
      
      <View style={s(styles.headerBlock)}>
        <View style={s(styles.titleRow)}>
          <Archive size={26} color="#b45309" style={s(styles.headerIcon)} />
          <Text style={s(styles.headerTitle)}>Archive Data</Text>
        </View>
        <Text style={s(styles.headerSubtitle)}>
          View and manage archived comments, attachments, and other items. Items can be restored or permanently deleted.
        </Text>
      </View>

      {error && (
        <View style={s(styles.errorAlertFrame)}>
          <AlertCircle size={16} color="#ef4444" style={s(styles.iconInlineMarginRight)} />
          <Text style={s(styles.errorAlertText)}>{error}</Text>
        </View>
      )}

      <View style={s(styles.filterCardSurface)}>
        <View style={s(styles.searchFieldWrapperFlex)}>
          <Search size={16} color="#64748b" style={s(styles.searchIconPadding)} />
          <TextInput
            style={s(styles.searchBarInputFieldText)}
            placeholder="Search archived items..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View style={s(styles.filterActionControlsRow)}>
          <TouchableOpacity 
            style={s(styles.dropdownMenuTriggerAnchor)} 
            activeOpacity={0.7}
            onPress={() => setShowTypeDropdown(true)}
          >
            <Text style={s(styles.dropdownMenuTriggerText)} numberOfLines={1}>{activeFilterLabel}</Text>
            <ChevronDown size={14} color="#64748b" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={s(styles.refreshModuleButton)} 
            onPress={() => void fetchArchive(1)}
            disabled={loading}
          >
            <RefreshCw size={14} color="#475569" style={s(loading && styles.processingOpacity)} />
            <Text style={s(styles.refreshButtonLabelText)}>Refresh</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={s(styles.metricsRowStripContainer)}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s(styles.metricsScrollCanvas)}>
          <View style={s(styles.metricDataBoxFrame, styles.themeSlateStatsBg)}>
            <Text style={s(styles.metricNumericValueText)}>{pagination.total}</Text>
            <Text style={s(styles.metricLabelMetaText)}>Total Archived</Text>
          </View>
          <View style={s(styles.metricDataBoxFrame, styles.themeBlueStatsBg)}>
            <Text style={s(styles.metricNumericValueText)}>{items.filter(i => i.itemType === "comment").length}</Text>
            <Text style={s(styles.metricLabelMetaText)}>Comments</Text>
          </View>
          <View style={s(styles.metricDataBoxFrame, styles.themePurpleStatsBg)}>
            <Text style={s(styles.metricNumericValueText)}>{items.filter(i => i.itemType === "attachment").length}</Text>
            <Text style={s(styles.metricLabelMetaText)}>Attachments</Text>
          </View>
          <View style={s(styles.metricDataBoxFrame, styles.themeGoldStatsBg)}>
            <Text style={s(styles.metricNumericValueText)}>{items.filter(i => i.itemType === "task").length}</Text>
            <Text style={s(styles.metricLabelMetaText)}>Tasks</Text>
          </View>
        </ScrollView>
      </View>

      {loading && items.length === 0 ? (
        <View style={s(styles.centerStatusLoadingEngine)}>
          <ActivityIndicator size="large" color="#b45309" />
          <Text style={s(styles.loadingProgressSubtext)}>Loading archived items...</Text>
        </View>
      ) : filteredItems.length === 0 ? (
        <View style={s(styles.emptyStateFallbackContainer)}>
          <Archive size={48} color="#cbd5e1" style={s(styles.emptyStateCentralIcon)} />
          <Text style={s(styles.emptyStateMainHeading)}>No archived items found</Text>
          <Text style={s(styles.emptyStateParagraphSubtext)}>Archived comments and attachments will appear here.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s(styles.mainRegistryScrollCanvas)} showsVerticalScrollIndicator={false}>
          <View style={s(styles.registryCardsStackLayout)}>
            {filteredItems.map((item, idx) => {
              const typeConfig = itemTypeMap[item.itemType] || { icon: FileText, color: "#64748b", bg: "#f1f5f9", borderColor: "#e2e8f0" };
              const RenderedIcon = typeConfig.icon;
              const globalIndexCounter = (pagination.page - 1) * pagination.limit + idx + 1;

              return (
                <View key={item.id || idx.toString()} style={s(styles.registryRowItemCard)}>
                  <View style={s(styles.rowCardHeaderTopLineAlignment)}>
                    <View style={s(styles.rowCardLeftIconIndicatorBlock, { backgroundColor: typeConfig.bg, borderColor: typeConfig.borderColor })}>
                      <RenderedIcon size={14} color={typeConfig.color} />
                      <View style={s(styles.indexBadgePinCircle)}>
                        <Text style={s(styles.indexBadgePinInnerText)}>{globalIndexCounter}</Text>
                      </View>
                    </View>

                    <View style={s(styles.metadataLabelsColumnFlow)}>
                      <View style={s(styles.badgeMetaRowFlexContainer)}>
                        <View style={s(styles.typeBadgeContainer, { backgroundColor: typeConfig.bg, borderColor: typeConfig.borderColor })}>
                          <Text style={s(styles.typeBadgeInnerText, { color: typeConfig.color })}>{item.itemType}</Text>
                        </View>
                        <Text style={s(styles.originParentHierarchyLabelSubtext)} numberOfLines={1}>
                          from <Text style={s(styles.originParentNameHighlightBoldText)}>{item.parentName || "Unknown"}</Text>
                        </Text>
                      </View>

                      {item.itemType === "comment" && (
                        <Text style={s(styles.textBodyContentDisplayParagraph)} numberOfLines={4}>
                          {item.itemData.message || "—"}
                        </Text>
                      )}

                      {item.itemType === "attachment" && (
                        <View style={s(styles.attachmentInnerPayloadLayoutBlock)}>
                          <Text style={s(styles.attachmentFileNameLabelText)} numberOfLines={1}>
                            {item.itemData.fileName || "Unknown file"}
                          </Text>
                          {item.itemData.size > 0 && (
                            <Text style={s(styles.attachmentMetaSizeInfoSubtext)}>
                              ({(item.itemData.size / 1024).toFixed(1)} KB)
                            </Text>
                          )}
                          {item.itemData.mimeType?.startsWith("image/") && item.itemData.url && (
                            <TouchableOpacity 
                              style={s(styles.thumbnailPreviewTouchBoundary)}
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
                          <Text style={s(styles.taskTitleLabelHeaderText)} numberOfLines={2}>
                            {item.itemData.title || "—"}
                          </Text>
                          <View style={s(styles.taskPropertiesBadgeWrapRow)}>
                            {item.itemData.status && (
                              <View style={s(styles.taskPropertyMutedBadgeFrame)}>
                                <Text style={s(styles.taskPropertyMutedBadgeInnerText)}>{item.itemData.status}</Text>
                              </View>
                            )}
                            {item.itemData.priority && (
                              <View style={s(styles.taskPropertyMutedBadgeFrame)}>
                                <Text style={s(styles.taskPropertyMutedBadgeInnerText)}>{item.itemData.priority}</Text>
                              </View>
                            )}
                          </View>
                        </View>
                      )}

                      {item.itemType === "user" && (
                        <View style={s(styles.userInnerPayloadLayoutBlock)}>
                          <Text style={s(styles.userProfileFullNameText)} numberOfLines={1}>
                            {item.itemData.name || "—"}
                          </Text>
                          <Text style={s(styles.userProfileMetaSpecsSubtext)} numberOfLines={1}>
                            {item.itemData.email} • {item.itemData.role}
                          </Text>
                        </View>
                      )}

                      <View style={s(styles.chronologyFooterRowMetaBlock)}>
                        {item.itemData.authorUsername && (
                          <View style={s(styles.inlineMetaFlexAlignmentRow)}>
                            <User size={10} color="#94a3b8" style={s(styles.iconInlineMarginRight)} />
                            <Text style={s(styles.chronologyMetaInnerText)} numberOfLines={1}>{item.itemData.authorUsername}</Text>
                          </View>
                        )}
                        <View style={s(styles.inlineMetaFlexAlignmentRow)}>
                          <Calendar size={10} color="#94a3b8" style={s(styles.iconInlineMarginRight)} />
                          <Text style={s(styles.chronologyMetaInnerText)} numberOfLines={1}>{formatDateLabel(item.createdAt)}</Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  <View style={s(styles.rowCardActionsControlPanelStrip)}>
                    <TouchableOpacity 
                      style={s(styles.actionButtonFrame, styles.actionRestoreThemeButton)} 
                      activeOpacity={0.7}
                      onPress={() => void handleRestore(item.id)}
                      disabled={restoringId === item.id}
                    >
                      {restoringId === item.id ? (
                        <ActivityIndicator size="small" color="#16a34a" />
                      ) : (
                        <>
                          <RotateCcw size={12} color="#16a34a" style={s(styles.iconInlineMarginRight)} />
                          <Text style={s(styles.actionButtonLabelText, styles.actionRestoreLabelThemeText)}>Restore</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={s(styles.actionButtonFrame, styles.actionDeleteThemeButton)} 
                      activeOpacity={0.7}
                      onPress={() => handleDeleteConfirmation(item.id)}
                    >
                      <Trash2 size={12} color="#dc2626" style={s(styles.iconInlineMarginRight)} />
                      <Text style={s(styles.actionButtonLabelText, styles.actionDeleteLabelThemeText)}>Delete</Text>
                    </TouchableOpacity>
                  </View>

                </View>
              );
            })}
          </View>
        </ScrollView>
      )}

      <Modal animationType="slide" transparent={true} visible={showTypeDropdown} onRequestClose={() => setShowTypeDropdown(false)}>
        <View style={s(styles.modalOverlayBlurUnderlay)}>
          <View style={s(styles.dropdownPickerContentWindowCard)}>
            <View style={s(styles.dropdownPickerHeaderRow)}>
              <Text style={s(styles.dropdownPickerHeaderTitleText)}>Filter by type</Text>
              <TouchableOpacity onPress={() => setShowTypeDropdown(false)} style={s(styles.closeModalCrossTouchTarget)}>
                <X size={16} color="#475569" />
              </TouchableOpacity>
            </View>
            <ScrollView style={s(styles.dropdownPickerItemsScrollCanvas)} keyboardShouldPersistTaps="handled">
              {filterOptions.map((option) => {
                const isOptionActive = typeFilter === option.id;
                return (
                  <TouchableOpacity
                    key={option.id}
                    style={s(styles.dropdownPickerSelectionOptionRowAnchor)}
                    onPress={() => {
                      setTypeFilter(option.id);
                      setShowTypeDropdown(false);
                    }}
                  >
                    <Text style={s(styles.dropdownPickerOptionValueText, isOptionActive && styles.activeGoldenSelectionText)}>
                      {option.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal animationType="fade" transparent={true} visible={!!previewUrl} onRequestClose={() => setPreviewUrl(null)}>
        <View style={s(styles.lightboxBackgroundWindowOverlay)}>
          <View style={s(styles.lightboxHeaderNavigationBarRow)}>
            <Text style={s(styles.lightboxHeaderTitleLabelText)} numberOfLines={1}>{previewName}</Text>
            <TouchableOpacity onPress={() => setPreviewUrl(null)} style={s(styles.closeLightboxCircularButtonAnchor)}>
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  headerBlock: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  headerIcon: {
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#64748b",
    lineHeight: 18,
  },
  errorAlertFrame: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fee2e2",
    borderRadius: 8,
    marginHorizontal: 16,
    padding: 10,
    marginBottom: 12,
  },
  errorAlertText: {
    fontSize: 12,
    color: "#ef4444",
    flex: 1,
  },
  filterCardSurface: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    marginHorizontal: 16,
    padding: 12,
    gap: 10,
    marginBottom: 14,
  },
  searchFieldWrapperFlex: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 6,
    paddingHorizontal: 10,
    height: 38,
    backgroundColor: "#ffffff",
  },
  searchIconPadding: {
    marginRight: 6,
  },
  searchBarInputFieldText: {
    flex: 1,
    fontSize: 13,
    color: "#0f172a",
    height: "100%",
  },
  filterActionControlsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  dropdownMenuTriggerAnchor: {
    flex: 1.3,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 6,
    height: 36,
    paddingHorizontal: 10,
    backgroundColor: "#f8fafc",
  },
  dropdownMenuTriggerText: {
    fontSize: 12,
    color: "#334155",
    fontWeight: "600",
  },
  refreshModuleButton: {
    flex: 0.9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 6,
    height: 36,
    backgroundColor: "#ffffff",
    gap: 4,
  },
  processingOpacity: {
    opacity: 0.4,
  },
  refreshButtonLabelText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  metricsRowStripContainer: {
    marginBottom: 14,
  },
  metricsScrollCanvas: {
    paddingHorizontal: 16,
    gap: 8,
  },
  metricDataBoxFrame: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    minWidth: 110,
  },
  themeSlateStatsBg: { backgroundColor: "#f1f5f9", borderColor: "#e2e8f0" },
  themeBlueStatsBg: { backgroundColor: "#eff6ff", borderColor: "#bfdbfe" },
  themePurpleStatsBg: { backgroundColor: "#f5f3ff", borderColor: "#ddd6fe" },
  themeGoldStatsBg: { backgroundColor: "#fffbeb", borderColor: "#fde68a" },
  metricNumericValueText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
  },
  metricLabelMetaText: {
    fontSize: 10,
    color: "#64748b",
    fontWeight: "600",
    marginTop: 1,
  },
  centerStatusLoadingEngine: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  loadingProgressSubtext: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 8,
  },
  emptyStateFallbackContainer: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    marginHorizontal: 16,
    paddingVertical: 48,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyStateCentralIcon: {
    marginBottom: 10,
    opacity: 0.6,
  },
  emptyStateMainHeading: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 4,
  },
  emptyStateParagraphSubtext: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
  },
  mainRegistryScrollCanvas: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  registryCardsStackLayout: {
    gap: 12,
  },
  registryRowItemCard: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 14,
  },
  rowCardHeaderTopLineAlignment: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  rowCardLeftIconIndicatorBlock: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    marginRight: 12,
  },
  indexBadgePinCircle: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#ffffff",
    borderWidth: 0.5,
    borderColor: "#cbd5e1",
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
    color: "#334155",
  },
  metadataLabelsColumnFlow: {
    flex: 1,
  },
  badgeMetaRowFlexContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 5,
    flexWrap: "wrap",
  },
  typeBadgeContainer: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  typeBadgeInnerText: {
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  originParentHierarchyLabelSubtext: {
    fontSize: 11,
    color: "#64748b",
  },
  originParentNameHighlightBoldText: {
    fontWeight: "600",
    color: "#334155",
  },
  textBodyContentDisplayParagraph: {
    fontSize: 13,
    color: "#1e293b",
    lineHeight: 18,
  },
  attachmentInnerPayloadLayoutBlock: {
    width: "100%",
  },
  attachmentFileNameLabelText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
  },
  attachmentMetaSizeInfoSubtext: {
    fontSize: 10,
    color: "#64748b",
    marginTop: 1,
    marginBottom: 4,
  },
  thumbnailPreviewTouchBoundary: {
    width: 96,
    height: 64,
    borderRadius: 6,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#f1f5f9",
    marginTop: 4,
  },
  thumbnailPreviewImageNode: {
    width: "100%",
    height: "100%",
  },
  taskInnerPayloadLayoutBlock: {
    width: "100%",
  },
  taskTitleLabelHeaderText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
  },
  taskPropertiesBadgeWrapRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  taskPropertyMutedBadgeFrame: {
    backgroundColor: "#f1f5f9",
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  taskPropertyMutedBadgeInnerText: {
    fontSize: 9,
    color: "#475569",
    fontWeight: "600",
    textTransform: "capitalize",
  },
  userInnerPayloadLayoutBlock: {
    width: "100%",
  },
  userProfileFullNameText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
  },
  userProfileMetaSpecsSubtext: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 1,
  },
  chronologyFooterRowMetaBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 6,
    flexWrap: "wrap",
  },
  inlineMetaFlexAlignmentRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconInlineMarginRight: {
    marginRight: 4,
  },
  chronologyMetaInnerText: {
    fontSize: 10,
    color: "#94a3b8",
    fontWeight: "500",
  },
  rowCardActionsControlPanelStrip: {
    flexDirection: "row",
    justifyContent: "flex-end",
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 10,
    marginTop: 10,
    gap: 8,
  },
  actionButtonFrame: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 10,
  },
  actionRestoreThemeButton: {
    borderColor: "#bbf7d0",
    backgroundColor: "#f0fdf4",
  },
  actionDeleteThemeButton: {
    borderColor: "#fecaca",
    backgroundColor: "#fef2f2",
  },
  actionButtonLabelText: {
    fontSize: 11,
    fontWeight: "600",
  },
  actionRestoreLabelThemeText: { color: "#16a34a" },
  actionDeleteLabelThemeText: { color: "#dc2626" },
  modalOverlayBlurUnderlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    justifyContent: "flex-end",
  },
  dropdownPickerContentWindowCard: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    width: "100%",
    maxHeight: height * 0.5,
    padding: 20,
  },
  dropdownPickerHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingBottom: 12,
    marginBottom: 8,
  },
  dropdownPickerHeaderTitleText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
  },
  closeModalCrossTouchTarget: {
    padding: 4,
  },
  dropdownPickerItemsScrollCanvas: {
    flexGrow: 0,
  },
  dropdownPickerSelectionOptionRowAnchor: {
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  dropdownPickerOptionValueText: {
    fontSize: 14,
    color: "#334155",
    fontWeight: "500",
  },
  activeGoldenSelectionText: {
    color: "#b45309",
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
    top: Platform.OS === "ios" ? 50 : 24,
    left: 0,
    right: 0,
    height: 50,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    zIndex: 10,
  },
  lightboxHeaderTitleLabelText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
    marginRight: 16,
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
    width: width,
    height: height * 0.75,
    justifyContent: "center",
    alignItems: "center",
  },
  lightboxRenderedImageNode: {
    width: "100%",
    height: "100%",
  }
});