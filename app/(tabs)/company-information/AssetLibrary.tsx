import React, { useState, useMemo, useEffect } from "react";
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
  Image,
  SafeAreaView,
  StatusBar,
  FlatList,
  Linking,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "@/contexts/ThemeContext";
import { apiFetch, toProxiedUrl } from "../../../lib/admin/apiClient";
import { s, wp, hp, fs } from "@/util/styles";

type FolderNode = {
  id: string;
  name: string;
  parentFolderId?: string | null;
  assetCount?: number;
  children?: FolderNode[];
};

type Asset = {
  id: string;
  folderId?: string | null;
  title?: string;
  description?: string;
  tags?: string[];
  originalFilename?: string;
  mimeType?: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  checksumSha256?: string;
  currentVersionNumber?: number;
  urlThumbnail?: string;
  urlPreview?: string;
  updatedAt?: string;
  attachment?: { fileName?: string; url?: string; mimeType?: string; size?: number };
};

type Paginated<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type SortOption = "newest" | "oldest" | "az" | "za" | "size-asc" | "size-desc";
type TypeFilterOption = "" | "image" | "pdf";

function flattenFolders(tree: FolderNode[], out: FolderNode[] = []): FolderNode[] {
  for (const n of tree) {
    out.push(n);
    if (n.children?.length) flattenFolders(n.children, out);
  }
  return out;
}

function formatBytes(bytes: number | undefined) {
  const b = Number(bytes || 0);
  if (!b) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(b) / Math.log(1024)), units.length - 1);
  const v = b / Math.pow(1024, i);
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

const getFullUrl = (url: string | undefined): string => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  return `https://task.se7eninc.com${url.startsWith("/") ? "" : "/"}${url}`;
};

function AssetImage({ url, style, resizeMode, fallbackColor }: { url: string; style: any; resizeMode?: "contain" | "cover"; fallbackColor: string }) {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const resolvePath = async () => {
      try {
        const res = toProxiedUrl(url);
        const finalUrl = res instanceof Promise ? await res : res;
        if (mounted) {
          const full = getFullUrl(typeof finalUrl === "string" ? finalUrl : url);
          setResolvedUrl(full);
        }
      } catch {
        if (mounted) setResolvedUrl(getFullUrl(url));
      } finally {
        if (mounted) setLoading(false);
      }
    };
    resolvePath();
    return () => {
      mounted = false;
    };
  }, [url]);

  if (loading) {
    return (
      <View style={[style, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="small" color={fallbackColor} />
      </View>
    );
  }

  if (!resolvedUrl || resolvedUrl.trim() === "") return null;

  return <Image source={{ uri: resolvedUrl }} style={style} resizeMode={resizeMode} />;
}

export default function EmployeeAssetLibrary({
  moduleName = "asset-library",
  title = "Images",
  description = "Browse and download approved brand assets.",
}: {
  moduleName?: string;
  title?: string;
  description?: string;
}) {
  const { uiTheme } = useTheme();
  const styles = useMemo(() => getThemedStyles(uiTheme), [uiTheme]);

  const isLightTheme = useMemo(() => {
    return uiTheme.theme?.includes("crystal") || uiTheme.panelColors?.dashboardTextColor === "#000000";
  }, [uiTheme]);

  const primaryColor = useMemo(() => {
    return uiTheme.customColors?.primary || "#ffd27a";
  }, [uiTheme]);

  const placeholderColor = useMemo(() => {
    return isLightTheme ? "#94a3b8" : "#71717a";
  }, [isLightTheme]);

  const textColor = useMemo(() => {
    return uiTheme.panelColors?.dashboardTextColor || (isLightTheme ? "#ffffff" : "#09090b");
  }, [uiTheme, isLightTheme]);

  const tintColor = useMemo(() => {
    return uiTheme.panelColors?.dashboardTextColor || (isLightTheme ? "#0f172a" : "#ffffff");
  }, [uiTheme, isLightTheme]);

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState<Asset | null>(null);
  const [typeFilter, setTypeFilter] = useState<TypeFilterOption>("");
  const [sort, setSort] = useState<SortOption>("az");
  const [page, setPage] = useState(1);
  const limit = 24;

  const [folderDrawerOpen, setFolderDrawerOpen] = useState(false);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [expandedFolderIds, setExpandedFolderIds] = useState<Record<string, boolean>>({});

  const foldersQuery = useQuery({
    queryKey: ["asset-library", "folders", "employee", moduleName],
    queryFn: async () => {
      const res = await apiFetch<{ items: FolderNode[] }>(`/api/asset-library/folders?module=${moduleName}`);
      return res.items || [];
    },
  });

  const assetsQuery = useQuery({
    queryKey: ["asset-library", "assets", "employee", moduleName, selectedFolderId, search, typeFilter, sort, page, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("module", moduleName);
      if (selectedFolderId) params.set("folderId", selectedFolderId);
      if (search.trim()) params.set("q", search.trim());
      if (typeFilter) params.set("type", typeFilter);
      if (sort) params.set("sort", sort);
      params.set("page", String(page));
      params.set("limit", String(limit));
      const qs = params.toString() ? `?${params.toString()}` : "";
      return await apiFetch<Paginated<Asset>>(`/api/asset-library/assets${qs}`);
    },
    enabled: !foldersQuery.isLoading,
  });

  const allFolders = useMemo(() => flattenFolders(foldersQuery.data ?? []), [foldersQuery.data]);
  const assets = assetsQuery.data?.items ?? [];
  const totalPages = assetsQuery.data?.totalPages ?? 1;
  const total = assetsQuery.data?.total ?? assets.length;

  const currentFolder = useMemo(() => {
    if (!selectedFolderId) return null;
    return allFolders.find((f) => f.id === selectedFolderId) || null;
  }, [selectedFolderId, allFolders]);

  const handleCopyLink = async (asset: Asset) => {
    try {
      const url = asset.attachment?.url || asset.urlPreview || "";
      const rawLink = toProxiedUrl(url);
      const link = rawLink instanceof Promise ? await rawLink : rawLink;
      const finalLink = getFullUrl(link || url);
      if (finalLink) {
        await Clipboard.setStringAsync(finalLink);
        Alert.alert("Success", "Asset download link copied to clipboard.");
      }
    } catch {
      Alert.alert("Error", "Failed to copy asset URL link.");
    }
  };

  const handleDownload = async (asset: Asset) => {
    try {
      const res = await apiFetch<{ url: string; fileName: string }>(
        `/api/asset-library/assets/${encodeURIComponent(asset.id)}/download`,
        { method: "POST" }
      );
      
      const rawUrl = toProxiedUrl(res.url);
      const safeUrl = rawUrl instanceof Promise ? await rawUrl : rawUrl;
      const finalUrl = getFullUrl(safeUrl || res.url || asset.attachment?.url);

      if (finalUrl) {
        await Linking.openURL(finalUrl);
      } else {
        Alert.alert("Error", "Invalid asset download URL.");
      }
    } catch (e: any) {
      // Direct fallback to attachment URL if API endpoint fails
      const directUrl = getFullUrl(asset.attachment?.url);
      if (directUrl) {
        try {
          await Linking.openURL(directUrl);
          return;
        } catch {}
      }
      Alert.alert("Download Failed", e?.message || "Could not initialize document extraction resource.");
    }
  };

  const renderFolderItem = (node: FolderNode, depth = 0) => {
    const isActive = selectedFolderId === node.id;
    const hasChildren = Boolean(node.children?.length);
    const isExpanded = expandedFolderIds[node.id] ?? true;

    return (
      <View key={node.id}>
        <TouchableOpacity
          style={s([styles.folderItemRow, isActive && styles.folderItemRowActive, { paddingLeft: wp(4 + depth * 4) }])}
          onPress={() => {
            setSelectedFolderId(node.id);
            setPage(1);
            setFolderDrawerOpen(false);
          }}
        >
          {hasChildren ? (
            <TouchableOpacity
              style={s(styles.folderExpandIndicator)}
              onPress={(e) => {
                e.stopPropagation();
                setExpandedFolderIds((prev) => ({ ...prev, [node.id]: !(prev[node.id] ?? true) }));
              }}
            >
              <Ionicons
                name={isExpanded ? "chevron-down" : "chevron-forward"}
                size={fs(4)}
                color={tintColor}
              />
            </TouchableOpacity>
          ) : (
            <View style={s({ width: wp(5) })} />
          )}
          <Ionicons
            name={isActive ? "folder-open" : "folder"}
            size={fs(4.5)}
            color={isActive ? primaryColor : tintColor}
            style={s({ marginRight: wp(2) })}
          />
          <Text style={s([styles.folderItemText, isActive && styles.folderItemTextActive])} numberOfLines={1}>
            {node.name}
          </Text>
          <View style={s(styles.folderBadge)}>
            <Text style={s(styles.folderBadgeText)}>{Number(node.assetCount || 0)}</Text>
          </View>
        </TouchableOpacity>
        {hasChildren && isExpanded && node.children!.map((c) => renderFolderItem(c, depth + 1))}
      </View>
    );
  };

  return (
    <SafeAreaView style={s(styles.safeArea)}>
      <StatusBar
        barStyle={isLightTheme ? "dark-content" : "light-content"}
        backgroundColor={uiTheme.panelColors?.dashboardBackground || "#09090b"}
      />

      <View style={s(styles.headerLayoutRow)}>
        <View style={s({ flex: 1, marginRight: wp(2) })}>
          <Text style={s(styles.headerPrimaryText)} numberOfLines={1}>{title}</Text>
          <Text style={s(styles.subtitleMutedText)} numberOfLines={2}>{description}</Text>
        </View>
        <TouchableOpacity style={s(styles.folderMenuTrigger)} onPress={() => setFolderDrawerOpen(true)}>
          <Ionicons name="folder-outline" size={fs(4.8)} color={tintColor} />
          <Text style={s(styles.folderMenuTriggerText)}>Folders</Text>
        </TouchableOpacity>
      </View>

      <View style={s(styles.searchFilterControlCard)}>
        <View style={s(styles.searchContainer)}>
          <Ionicons name="search" size={fs(4.2)} color={placeholderColor} style={s(styles.searchIcon)} />
          <TextInput
            style={s(styles.searchBoxInput)}
            placeholder="Search assets..."
            placeholderTextColor={placeholderColor}
            value={search}
            onChangeText={(txt) => {
              setPage(1);
              setSearch(txt);
            }}
          />
        </View>

        <View style={s(styles.filterControlsActionRow)}>
          <TouchableOpacity style={s(styles.filterMenuButton)} onPress={() => setFilterModalOpen(true)}>
            <Ionicons name="options-outline" size={fs(4)} color={tintColor} style={s({ marginRight: wp(1.5) })} />
            <Text style={s(styles.filterMenuButtonText)}>
              Filters {typeFilter || sort !== "az" ? "•" : ""}
            </Text>
          </TouchableOpacity>

          <View style={s(styles.activeFolderBreadcrumb)}>
            <Text style={s(styles.activeFolderBreadcrumbText)} numberOfLines={1}>
              Active: {currentFolder ? currentFolder.name : "All Assets"}
            </Text>
          </View>
        </View>
      </View>

      {assetsQuery.isLoading ? (
        <View style={s(styles.activityIndicatorCentering)}>
          <ActivityIndicator size="large" color={primaryColor} />
        </View>
      ) : (
        <FlatList
          data={assets}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={s(styles.gridScrollContainer)}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={s(styles.gridSectionHeaderText)}>Assets Found ({total})</Text>
          }
          ListEmptyComponent={
            <View style={s(styles.emptyRecordsPlaceholderCard)}>
              <Text style={s(styles.emptyRecordsPlaceholderText)}>No assets found in target scope.</Text>
            </View>
          }
          renderItem={({ item: a }) => {
            const url = a.urlThumbnail || a.attachment?.url || "";
            const mime = a.attachment?.mimeType || a.mimeType || "";
            const isImage = mime.startsWith("image/");

            return (
              <TouchableOpacity style={s(styles.assetGridItemCard)} onPress={() => setPreview(a)}>
                <View style={s(styles.assetThumbnailWrapperFrame)}>
                  {isImage && url ? (
                    <AssetImage url={url} style={s(styles.assetThumbnailImageInstance)} fallbackColor={primaryColor} />
                  ) : (
                    <View style={s(styles.assetThumbnailFilePlaceholder)}>
                      <MaterialCommunityIcons
                        name={mime === "application/pdf" ? "file-pdf-box" : "file-document-outline"}
                        size={fs(10)}
                        color={placeholderColor}
                      />
                    </View>
                  )}
                  <TouchableOpacity
                    style={s(styles.assetInlineActionCopyButton)}
                    onPress={() => void handleCopyLink(a)}
                  >
                    <Ionicons name="link-outline" size={fs(4)} color="#ffffff" />
                  </TouchableOpacity>
                </View>
                <View style={s(styles.assetMetaDetailsContainer)}>
                  <Text style={s(styles.assetMetaTitleText)} numberOfLines={1}>
                    {a.title?.trim() || a.originalFilename || a.attachment?.fileName || "Asset File"}
                  </Text>
                  <Text style={s(styles.assetMetaMetricsLabel)} numberOfLines={1}>
                    {formatBytes(a.sizeBytes || a.attachment?.size)}
                    {a.width && a.height ? ` • ${a.width}×${a.height}` : ""}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
          ListFooterComponent={
            <View style={s(styles.paginationPanelLayoutRow)}>
              <TouchableOpacity
                style={s([styles.paginationControlBtn, page <= 1 && styles.paginationControlBtnDisabled])}
                disabled={page <= 1}
                onPress={() => setPage((p) => Math.max(1, p - 1))}
              >
                <Text style={s(styles.paginationControlBtnText)}>Prev</Text>
              </TouchableOpacity>
              <Text style={s(styles.paginationStateLabel)}>
                Page {page} of {totalPages}
              </Text>
              <TouchableOpacity
                style={s([styles.paginationControlBtn, page >= totalPages && styles.paginationControlBtnDisabled])}
                disabled={page >= totalPages}
                onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                <Text style={s(styles.paginationControlBtnText)}>Next</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      <Modal visible={folderDrawerOpen} animationType="slide" transparent={true} onRequestClose={() => setFolderDrawerOpen(false)}>
        <View style={s(styles.modalBackdropOverlay)}>
          <View style={s(styles.modalContentSheetFrame)}>
            <View style={s(styles.modalContentSheetHeader)}>
              <Text style={s(styles.modalSheetTitleText)}>Asset Folders</Text>
              <TouchableOpacity style={s(styles.modalHeaderDismissCircle)} onPress={() => setFolderDrawerOpen(false)}>
                <Ionicons name="close" size={fs(5)} color={tintColor} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={s({ paddingVertical: hp(1.5) })}>
              <TouchableOpacity
                style={s([styles.folderItemRow, !selectedFolderId && styles.folderItemRowActive, { paddingLeft: wp(4) }])}
                onPress={() => {
                  setSelectedFolderId(null);
                  setPage(1);
                  setFolderDrawerOpen(false);
                }}
              >
                <View style={s({ width: wp(5) })} />
                <Ionicons name="grid" size={fs(4.5)} color={!selectedFolderId ? primaryColor : tintColor} style={s({ marginRight: wp(2) })} />
                <Text style={s([styles.folderItemText, !selectedFolderId && styles.folderItemTextActive])}>All Assets</Text>
              </TouchableOpacity>
              {(foldersQuery.data || []).map((n) => renderFolderItem(n, 0))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={filterModalOpen} animationType="fade" transparent={true} onRequestClose={() => setFilterModalOpen(false)}>
        <View style={s(styles.filterModalCenteredBackdrop)}>
          <View style={s(styles.filterModalCardSurface)}>
            <Text style={s(styles.filterModalTitleText)}>Filter & Sort Options</Text>

            <Text style={s(styles.filterLabelHeading)}>Asset Extension Type</Text>
            <View style={s(styles.filterOptionToggleRow)}>
              {(["", "image", "pdf"] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={s([styles.filterToggleChip, typeFilter === t && [styles.filterToggleChipActive, { backgroundColor: primaryColor }]])}
                  onPress={() => setTypeFilter(t)}
                >
                  <Text style={s([styles.filterToggleChipText, typeFilter === t && styles.filterToggleChipTextActive])}>
                    {t === "" ? "All Types" : t === "image" ? "Images Only" : "PDFs Only"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s(styles.filterLabelHeading)}>Sort Sequence Order</Text>
            <ScrollView style={s({ maxHeight: hp(25) })} showsVerticalScrollIndicator={false}>
              {([
                { key: "newest", label: "Date Added: Newest" },
                { key: "oldest", label: "Date Added: Oldest" },
                { key: "az", label: "Alphabetical: A–Z" },
                { key: "za", label: "Alphabetical: Z–A" },
                { key: "size-asc", label: "File Size: Smallest" },
                { key: "size-desc", label: "File Size: Largest" },
              ] as const).map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  style={s([styles.sortSelectRow, sort === opt.key && styles.sortSelectRowActive])}
                  onPress={() => setSort(opt.key)}
                >
                  <Text style={s([styles.sortSelectRowText, sort === opt.key && [styles.sortSelectRowTextActive, { color: primaryColor }]])}>
                    {opt.label}
                  </Text>
                  {sort === opt.key && <Ionicons name="checkmark" size={fs(4)} color={primaryColor} />}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={s([styles.filterApplyPrimaryButton, { backgroundColor: primaryColor }])}
              onPress={() => {
                setPage(1);
                setFilterModalOpen(false);
              }}
            >
              <Text style={s([styles.filterApplyPrimaryButtonText, { color: isLightTheme ? "#ffffff" : "#09090b" }])}>Apply Parameters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={Boolean(preview)} animationType="slide" transparent={true} onRequestClose={() => setPreview(null)}>
        <View style={s(styles.modalBackdropOverlay)}>
          <View style={s([styles.modalContentSheetFrame, { height: "85%" }])}>
            <View style={s(styles.modalContentSheetHeader)}>
              <View style={s({ flex: 1, marginRight: wp(2) })}>
                <Text style={s(styles.modalSheetTitleText)} numberOfLines={1}>
                  {preview?.originalFilename || preview?.attachment?.fileName || "Asset Inspection Overview"}
                </Text>
              </View>
              <TouchableOpacity style={s(styles.modalHeaderDismissCircle)} onPress={() => setPreview(null)}>
                <Ionicons name="close" size={fs(5)} color={tintColor} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1, padding: wp(4) }} showsVerticalScrollIndicator={false}>
              {(() => {
                if (!preview) return null;
                const url = preview.attachment?.url || preview.urlPreview || "";
                const mime = preview.attachment?.mimeType || preview.mimeType || "";
                const isImage = mime.startsWith("image/");

                return (
                  <View style={s(styles.previewViewportContainerBox)}>
                    {isImage && url ? (
                      <AssetImage url={url} style={s(styles.previewViewportImageInstance)} resizeMode="contain" fallbackColor={primaryColor} />
                    ) : (
                      <View style={s(styles.previewViewportDocFallbackFrame)}>
                        <MaterialCommunityIcons
                          name={mime === "application/pdf" ? "file-pdf-box" : "file-document-outline"}
                          size={fs(16)}
                          color={placeholderColor}
                        />
                        <Text style={s(styles.previewViewportDocFallbackText)}>
                          {mime === "application/pdf" ? "Portable Document Object Format" : "Binary Content Asset Pipeline"}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })()}

              {preview && (
                <View style={s(styles.detailMetadataBlockCard)}>
                  <Text style={s(styles.detailMetadataHeading)}>Resource Specifications</Text>
                  
                  <View style={s(styles.detailMetadataRowItem)}>
                    <Text style={s(styles.detailMetadataKeyLabel)}>Filename</Text>
                    <Text style={s(styles.detailMetadataValueLabel)}>{preview.originalFilename || preview.attachment?.fileName || "—"}</Text>
                  </View>

                  <View style={s(styles.detailMetadataRowItem)}>
                    <Text style={s(styles.detailMetadataKeyLabel)}>MIME Extension Type</Text>
                    <Text style={s(styles.detailMetadataValueLabel)}>{preview.mimeType || preview.attachment?.mimeType || "—"}</Text>
                  </View>

                  <View style={s(styles.detailMetadataRowItem)}>
                    <Text style={s(styles.detailMetadataKeyLabel)}>Memory Footprint</Text>
                    <Text style={s(styles.detailMetadataValueLabel)}>{formatBytes(preview.sizeBytes || preview.attachment?.size)}</Text>
                  </View>

                  {preview.width && preview.height ? (
                    <View style={s(styles.detailMetadataRowItem)}>
                      <Text style={s(styles.detailMetadataKeyLabel)}>Native Matrix Dimensions</Text>
                      <Text style={s(styles.detailMetadataValueLabel)}>{preview.width}×{preview.height} px</Text>
                    </View>
                  ) : null}

                  {preview.currentVersionNumber ? (
                    <View style={s(styles.detailMetadataRowItem)}>
                      <Text style={s(styles.detailMetadataKeyLabel)}>Revision Version</Text>
                      <Text style={s(styles.detailMetadataValueLabel)}>v{preview.currentVersionNumber}</Text>
                    </View>
                  ) : null}

                  <View style={s(styles.detailMetadataRowItem)}>
                    <Text style={s(styles.detailMetadataKeyLabel)}>Assigned Folder Target</Text>
                    <Text style={s(styles.detailMetadataValueLabel)}>
                      {preview.folderId ? (allFolders.find((f) => f.id === preview.folderId)?.name || "System Base Root") : "System Base Root"}
                    </Text>
                  </View>

                  {preview.updatedAt ? (
                    <View style={s(styles.detailMetadataRowItem)}>
                      <Text style={s(styles.detailMetadataKeyLabel)}>Last Modification</Text>
                      <Text style={s(styles.detailMetadataValueLabel)}>{new Date(preview.updatedAt).toLocaleString()}</Text>
                    </View>
                  ) : null}
                </View>
              )}
            </ScrollView>

            <View style={s(styles.modalFooterPanelActionContainer)}>
              <TouchableOpacity style={s(styles.modalFooterPanelCancelBtn)} onPress={() => setPreview(null)}>
                <Text style={s([styles.modalFooterPanelCancelBtnText, { color: tintColor }])}>Dismiss</Text>
              </TouchableOpacity>
              {preview && (
                <TouchableOpacity
                  style={s([styles.modalFooterPanelMutationBtn, { backgroundColor: primaryColor }])}
                  onPress={() => void handleDownload(preview)}
                >
                  <Ionicons name="download-outline" size={fs(4)} color={textColor} style={s({ marginRight: wp(1.5) })} />
                  <Text style={s([styles.modalFooterPanelMutationBtnText, { color: textColor }])}>Download</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const getThemedStyles = (uiTheme: any) => {
  const isLightTheme = uiTheme.theme?.includes("crystal") || uiTheme.panelColors?.dashboardTextColor === "#000000";
  const structuralBorderColor = isLightTheme ? "rgba(0, 0, 0, 0.08)" : "rgba(255, 255, 255, 0.08)";
  const surfaceAlphaColor = isLightTheme ? "rgba(0, 0, 0, 0.03)" : "rgba(255, 255, 255, 0.03)";

  const bg = uiTheme.panelColors?.dashboardBackground || (isLightTheme ? "#ffffff" : "#09090b");
  const cardBg = uiTheme.panelColors?.dashboardCardBackground || (isLightTheme ? "#f8fafc" : "#18181b");
  const tintColor = uiTheme.panelColors?.dashboardTextColor || (isLightTheme ? "#0f172a" : "#ffffff");
  const mutedText = isLightTheme ? "#64748b" : "#a1a1aa";

  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: bg,
    },
    headerLayoutRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: wp(4),
      paddingTop: hp(1.8),
      paddingBottom: hp(1.5),
    },
    headerPrimaryText: {
      fontSize: fs(5.2),
      fontWeight: "800",
      color: tintColor,
      letterSpacing: -0.5,
    },
    subtitleMutedText: {
      fontSize: fs(3),
      color: mutedText,
      marginTop: 2,
      lineHeight: fs(4),
    },
    folderMenuTrigger: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: surfaceAlphaColor,
      borderWidth: 1,
      borderColor: structuralBorderColor,
      paddingHorizontal: wp(3),
      paddingVertical: hp(1),
      borderRadius: wp(2),
    },
    folderMenuTriggerText: {
      fontSize: fs(3),
      fontWeight: "600",
      color: tintColor,
      marginLeft: wp(1.5),
    },
    searchFilterControlCard: {
      backgroundColor: cardBg,
      borderRadius: wp(3),
      borderWidth: 1,
      borderColor: structuralBorderColor,
      padding: wp(3),
      marginHorizontal: wp(4),
      marginBottom: hp(1.5),
    },
    searchContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: bg,
      borderWidth: 1,
      borderColor: structuralBorderColor,
      borderRadius: wp(2),
      height: hp(5),
      paddingHorizontal: wp(2.5),
      marginBottom: hp(1.2),
    },
    searchIcon: {
      marginRight: wp(1.5),
    },
    searchBoxInput: {
      flex: 1,
      fontSize: fs(3.5),
      color: tintColor,
      height: "100%",
    },
    filterControlsActionRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    filterMenuButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: bg,
      borderWidth: 1,
      borderColor: structuralBorderColor,
      paddingHorizontal: wp(2.5),
      paddingVertical: hp(0.6),
      borderRadius: wp(1.5),
    },
    filterMenuButtonText: {
      fontSize: fs(2.8),
      fontWeight: "600",
      color: tintColor,
    },
    activeFolderBreadcrumb: {
      flex: 1,
      alignItems: "flex-end",
      marginLeft: wp(3),
    },
    activeFolderBreadcrumbText: {
      fontSize: fs(2.8),
      color: mutedText,
      fontWeight: "500",
    },
    gridSectionHeaderText: {
      fontSize: fs(3.5),
      fontWeight: "700",
      color: tintColor,
      marginHorizontal: wp(1),
      marginBottom: hp(1.2),
    },
    gridScrollContainer: {
      paddingHorizontal: wp(3),
      paddingBottom: hp(5),
    },
    activityIndicatorCentering: {
      paddingVertical: hp(8),
      justifyContent: "center",
      alignItems: "center",
    },
    emptyRecordsPlaceholderCard: {
      backgroundColor: cardBg,
      borderRadius: wp(3),
      borderWidth: 1,
      borderColor: structuralBorderColor,
      padding: wp(10),
      alignItems: "center",
      justifyContent: "center",
      marginHorizontal: wp(1),
    },
    emptyRecordsPlaceholderText: {
      fontSize: fs(3.2),
      color: mutedText,
      fontStyle: "italic",
    },
    assetGridItemCard: {
      flex: 1,
      backgroundColor: cardBg,
      borderRadius: wp(2.5),
      borderWidth: 1,
      borderColor: structuralBorderColor,
      margin: wp(1),
      overflow: "hidden",
    },
    assetThumbnailWrapperFrame: {
      width: "100%",
      aspectRatio: 1,
      backgroundColor: bg,
      justifyContent: "center",
      alignItems: "center",
      position: "relative",
      borderBottomWidth: 1,
      borderBottomColor: structuralBorderColor,
    },
    assetThumbnailImageInstance: {
      width: "100%",
      height: "100%",
      resizeMode: "cover",
    },
    assetThumbnailFilePlaceholder: {
      justifyContent: "center",
      alignItems: "center",
    },
    assetInlineActionCopyButton: {
      position: "absolute",
      top: hp(0.8),
      right: wp(1.5),
      width: wp(7),
      height: wp(7),
      borderRadius: wp(3.5),
      backgroundColor: "rgba(0,0,0,0.6)",
      justifyContent: "center",
      alignItems: "center",
    },
    assetMetaDetailsContainer: {
      padding: wp(2),
    },
    assetMetaTitleText: {
      fontSize: fs(3),
      fontWeight: "600",
      color: tintColor,
      marginBottom: 2,
    },
    assetMetaMetricsLabel: {
      fontSize: fs(2.5),
      color: mutedText,
    },
    paginationPanelLayoutRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingTop: hp(2),
      paddingBottom: hp(1),
      marginHorizontal: wp(1),
    },
    paginationControlBtn: {
      paddingHorizontal: wp(3.5),
      paddingVertical: hp(0.9),
      borderRadius: wp(1.5),
      backgroundColor: cardBg,
      borderWidth: 1,
      borderColor: structuralBorderColor,
    },
    paginationControlBtnDisabled: {
      opacity: 0.4,
    },
    paginationControlBtnText: {
      fontSize: fs(3),
      fontWeight: "600",
      color: tintColor,
    },
    paginationStateLabel: {
      fontSize: fs(3),
      color: mutedText,
    },
    modalBackdropOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.75)",
      justifyContent: "flex-end",
    },
    modalContentSheetFrame: {
      backgroundColor: cardBg,
      borderTopLeftRadius: wp(4),
      borderTopRightRadius: wp(4),
      height: "70%",
      borderWidth: 1,
      borderColor: structuralBorderColor,
    },
    modalContentSheetHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: wp(4),
      paddingVertical: hp(1.8),
      borderBottomWidth: 1,
      borderBottomColor: structuralBorderColor,
      alignItems: "center",
    },
    modalSheetTitleText: {
      color: tintColor,
      fontSize: fs(4),
      fontWeight: "800",
    },
    modalHeaderDismissCircle: {
      padding: wp(1.5),
      borderRadius: wp(10),
      backgroundColor: surfaceAlphaColor,
    },
    folderItemRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: hp(1.2),
      paddingRight: wp(4),
      borderBottomWidth: 1,
      borderBottomColor: "rgba(255,255,255,0.02)",
    },
    folderItemRowActive: {
      backgroundColor: surfaceAlphaColor,
    },
    folderExpandIndicator: {
      width: wp(5),
      height: hp(3.5),
      justifyContent: "center",
      alignItems: "center",
    },
    folderItemText: {
      fontSize: fs(3.2),
      color: tintColor,
      flex: 1,
    },
    folderItemTextActive: {
      fontWeight: "700",
    },
    folderBadge: {
      paddingHorizontal: wp(1.5),
      paddingVertical: hp(0.2),
      borderRadius: wp(1),
      backgroundColor: bg,
      borderWidth: 1,
      borderColor: structuralBorderColor,
    },
    folderBadgeText: {
      fontSize: fs(2.5),
      color: mutedText,
      fontWeight: "600",
    },
    filterModalCenteredBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.6)",
      justifyContent: "center",
      alignItems: "center",
      padding: wp(5),
    },
    filterModalCardSurface: {
      width: "100%",
      backgroundColor: cardBg,
      borderRadius: wp(3.5),
      borderWidth: 1,
      borderColor: structuralBorderColor,
      padding: wp(4),
    },
    filterModalTitleText: {
      fontSize: fs(3.8),
      fontWeight: "800",
      color: tintColor,
      marginBottom: hp(1.8),
    },
    filterLabelHeading: {
      fontSize: fs(3),
      fontWeight: "700",
      color: mutedText,
      marginBottom: hp(1),
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    filterOptionToggleRow: {
      flexDirection: "row",
      gap: wp(1.5),
      marginBottom: hp(2),
    },
    filterToggleChip: {
      flex: 1,
      height: hp(4.2),
      borderRadius: wp(1.5),
      backgroundColor: bg,
      borderWidth: 1,
      borderColor: structuralBorderColor,
      justifyContent: "center",
      alignItems: "center",
    },
    filterToggleChipActive: {
      borderColor: "transparent",
    },
    filterToggleChipText: {
      fontSize: fs(2.8),
      fontWeight: "600",
      color: mutedText,
    },
    filterToggleChipTextActive: {
      color: "#09090b",
      fontWeight: "700",
    },
    sortSelectRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: hp(1.2),
      borderBottomWidth: 1,
      borderBottomColor: structuralBorderColor,
    },
    sortSelectRowActive: {
      borderBottomColor: "transparent",
    },
    sortSelectRowText: {
      fontSize: fs(3.2),
      color: tintColor,
    },
    sortSelectRowTextActive: {
      fontWeight: "600",
    },
    filterApplyPrimaryButton: {
      height: hp(5),
      borderRadius: wp(2),
      justifyContent: "center",
      alignItems: "center",
      marginTop: hp(2.2),
    },
    filterApplyPrimaryButtonText: {
      fontSize: fs(3.2),
      fontWeight: "700",
    },
    previewViewportContainerBox: {
      width: "100%",
      height: hp(28),
      backgroundColor: bg,
      borderRadius: wp(2),
      borderWidth: 1,
      borderColor: structuralBorderColor,
      overflow: "hidden",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: hp(2),
    },
    previewViewportImageInstance: {
      width: "100%",
      height: "100%",
    },
    previewViewportDocFallbackFrame: {
      justifyContent: "center",
      alignItems: "center",
      padding: wp(5),
    },
    previewViewportDocFallbackText: {
      fontSize: fs(3),
      color: mutedText,
      marginTop: hp(1),
      fontWeight: "500",
    },
    detailMetadataBlockCard: {
      backgroundColor: bg,
      borderRadius: wp(2),
      borderWidth: 1,
      borderColor: structuralBorderColor,
      padding: wp(3),
      marginBottom: hp(2.5),
    },
    detailMetadataHeading: {
      fontSize: fs(3.2),
      fontWeight: "700",
      color: tintColor,
      marginBottom: hp(1.2),
      borderBottomWidth: 1,
      borderBottomColor: structuralBorderColor,
      paddingBottom: hp(0.8),
    },
    detailMetadataRowItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: hp(0.6),
    },
    detailMetadataKeyLabel: {
      fontSize: fs(3),
      color: mutedText,
      flex: 1,
      marginRight: wp(2),
    },
    detailMetadataValueLabel: {
      fontSize: fs(3),
      color: tintColor,
      fontWeight: "500",
      textAlign: "right",
      flex: 1.5,
    },
    modalFooterPanelActionContainer: {
      flexDirection: "row",
      padding: wp(4),
      borderTopWidth: 1,
      borderTopColor: structuralBorderColor,
      gap: wp(2.5),
    },
    modalFooterPanelCancelBtn: {
      flex: 1,
      height: hp(5),
      borderRadius: wp(2),
      borderWidth: 1,
      borderColor: structuralBorderColor,
      justifyContent: "center",
      alignItems: "center",
    },
    modalFooterPanelCancelBtnText: {
      fontSize: fs(3.2),
      fontWeight: "700",
    },
    modalFooterPanelMutationBtn: {
      flex: 1.4,
      height: hp(5),
      borderRadius: wp(2),
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
    },
    modalFooterPanelMutationBtnText: {
      fontSize: fs(3.2),
      fontWeight: "700",
    },
  });
};