import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Image,
  SafeAreaView,
  StatusBar,
  Dimensions,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import {
  ChevronRight,
  Download,
  FileText,
  Folder,
  FolderOpen,
  Image as ImageIcon,
  Search,
  Link as LinkIcon,
  ChevronDown,
  X,
} from "lucide-react-native";
import { apiFetch, toProxiedUrl } from "@/lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { s, wp, hp, fs } from "@/util/styles";

const { width, height } = Dimensions.get("window");

interface FolderNode {
  id: string;
  name: string;
  parentFolderId?: string | null;
  assetCount?: number;
  children?: FolderNode[];
}

interface Asset {
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
  resolvedThumb?: string;
  resolvedPreview?: string;
}

interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

function ImageWithLoader({
  uri,
  style,
  resizeMode = "cover",
  indicatorColor = "#3b82f6",
}: {
  uri: string;
  style: any;
  resizeMode?: "cover" | "contain" | "stretch" | "center";
  indicatorColor?: string;
}) {
  const [loading, setLoading] = useState(true);

  return (
    <View style={styles.imageLoaderWrapper}>
      {loading && (
        <View style={styles.imageLoaderContainer}>
          <ActivityIndicator size="small" color={indicatorColor} />
        </View>
      )}
      <Image
        source={{ uri }}
        style={style}
        resizeMode={resizeMode}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onError={() => setLoading(false)}
      />
    </View>
  );
}

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

export default function EmployeeAssetLibraryScreen({
  moduleName = "asset-library",
  title = "Images",
  description = "Browse and download approved brand assets.",
}: {
  moduleName?: string;
  title?: string;
  description?: string;
}) {
  const { uiTheme } = useTheme();
  const { token } = useAuth() as any;

  const isLightTheme = useMemo(() => {
    return uiTheme.theme?.includes("crystal") || uiTheme.panelColors?.dashboardTextColor === "#000000";
  }, [uiTheme]);

  const bg = useMemo(() => uiTheme.panelColors?.dashboardBackground || (isLightTheme ? "#ffffff" : "#09090b"), [uiTheme, isLightTheme]);
  const cardBg = useMemo(() => uiTheme.panelColors?.dashboardCardBackground || (isLightTheme ? "#f8fafc" : "#18181b"), [uiTheme, isLightTheme]);
  const tintColor = useMemo(() => uiTheme.panelColors?.dashboardTextColor || (isLightTheme ? "#0f172a" : "#ffffff"), [uiTheme, isLightTheme]);
  const mutedText = useMemo(() => (isLightTheme ? "#64748b" : "#a1a1aa"), [isLightTheme]);
  const primaryColor = useMemo(() => uiTheme.customColors?.primary || "#3b82f6", [uiTheme]);
  const border = useMemo(() => (isLightTheme ? "rgba(0, 0, 0, 0.08)" : "rgba(255, 255, 255, 0.08)"), [isLightTheme]);
  const headerBg = useMemo(() => (isLightTheme ? "#f1f5f9" : "#1c1c1f"), [isLightTheme]);
  const inputBg = useMemo(() => (isLightTheme ? "#ffffff" : "#09090b"), [isLightTheme]);

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState<Asset | null>(null);
  const [typeFilter, setTypeFilter] = useState<"" | "image" | "pdf">("");
  const [sort, setSort] = useState<"newest" | "oldest" | "az" | "za" | "size-asc" | "size-desc">("az");
  const [page, setPage] = useState(1);
  const limit = 24;

  const [expandedFolderIds, setExpandedFolderIds] = useState<Record<string, boolean>>({});
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showSortPicker, setShowSortPicker] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const resolveUrlWithToken = useMemo(() => {
    return (rawUrl?: string) => {
      if (!rawUrl) return "";
      let url = rawUrl;
      if (url.startsWith("/uploads/")) {
        url = url.replace("/uploads/", "/api/s3-proxy/");
      }
      if (!url.startsWith("http") && !url.startsWith("data:")) {
        url = `https://task.se7eninc.com${url.startsWith("/") ? "" : "/"}${url}`;
      }
      let finalUrl = toProxiedUrl(url) || url;
      if (token && !finalUrl.includes("token=")) {
        finalUrl += `${finalUrl.includes("?") ? "&" : "?"}token=${token}`;
      }
      return finalUrl;
    };
  }, [token]);

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

      const res = await apiFetch<Paginated<Asset>>(`/api/asset-library/assets${qs}`);

      if (res?.items) {
        res.items = res.items.map((item) => {
          const rawThumb = item.urlThumbnail || item.attachment?.url || "";
          const rawPreview = item.attachment?.url || item.urlPreview || "";

          return {
            ...item,
            resolvedThumb: resolveUrlWithToken(rawThumb),
            resolvedPreview: resolveUrlWithToken(rawPreview),
          };
        });
      }
      return res;
    },
    enabled: !foldersQuery.isLoading,
  });

  const allFolders = useMemo(() => flattenFolders(foldersQuery.data ?? []), [foldersQuery.data]);
  const assets = assetsQuery.data?.items ?? [];
  const totalPages = assetsQuery.data?.totalPages ?? 1;
  const total = assetsQuery.data?.total ?? assets.length;

  const downloadAsset = async (asset: Asset) => {
    try {
      setIsDownloading(true);
      const res = await apiFetch<{ url: string; fileName: string }>(
        `/api/asset-library/assets/${encodeURIComponent(asset.id)}/download`,
        { method: "POST" }
      );

      const safeUrl = resolveUrlWithToken(res.url);
      const targetFilename = res.fileName || asset.attachment?.fileName || "asset";
      const localUri = `${FileSystem.documentDirectory}${Date.now()}_${targetFilename}`;

      const downloadResult = await FileSystem.downloadAsync(safeUrl, localUri);

      if (downloadResult.status === 200) {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(downloadResult.uri, { mimeType: asset.attachment?.mimeType || asset.mimeType });
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsDownloading(false);
    }
  };

  const copyToClipboard = async (urlStr: string) => {
    const link = resolveUrlWithToken(urlStr);
    if (link) {
      await Clipboard.setStringAsync(link);
    }
  };

  const renderFolderNode = (node: FolderNode, depth = 0) => {
    const isActive = selectedFolderId === node.id;
    const hasChildren = Boolean(node.children?.length);
    const isExpanded = expandedFolderIds[node.id] ?? true;
    return (
      <View key={node.id}>
        <TouchableOpacity
          activeOpacity={0.7}
          style={s([styles.folderButton, isActive && { backgroundColor: isLightTheme ? "rgba(0,0,0,0.05)" : "#27272a" }, { paddingLeft: wp(2 + depth * 3.5) }])}
          onPress={() => setSelectedFolderId(node.id)}
        >
          {hasChildren ? (
            <TouchableOpacity
              activeOpacity={0.5}
              style={s(styles.expandChevronHitbox)}
              onPress={() => setExpandedFolderIds((prev) => ({ ...prev, [node.id]: !isExpanded }))}
            >
              <ChevronRight color={mutedText} size={fs(4)} style={isExpanded ? styles.rotate90 : undefined} />
            </TouchableOpacity>
          ) : (
            <View style={s({ width: wp(6) })} />
          )}
          {isActive ? <FolderOpen color={primaryColor} size={fs(4)} /> : <Folder color={mutedText} size={fs(4)} />}
          <Text style={s([styles.folderText, { color: tintColor }])} numberOfLines={1}>{node.name}</Text>
          <View style={s([styles.badgeCount, { backgroundColor: isLightTheme ? "rgba(0,0,0,0.05)" : "#27272a" }])}>
            <Text style={s([styles.badgeText, { color: mutedText }])}>{Number(node.assetCount || 0)}</Text>
          </View>
        </TouchableOpacity>
        {hasChildren && isExpanded ? node.children!.map((c) => renderFolderNode(c, depth + 1)) : null}
      </View>
    );
  };

  return (
    <View style={s([styles.container, { backgroundColor: bg }])}>
      <ScrollView contentContainerStyle={s(styles.scrollContainer)} showsVerticalScrollIndicator={false}>
        <View style={s(styles.header)}>
          <Text style={s([styles.mainTitle, { color: tintColor }])}>{title}</Text>
          <Text style={s([styles.subTitle, { color: mutedText }])}>{description}</Text>
        </View>

        <View style={s([styles.card, { backgroundColor: cardBg, borderColor: border }])}>
          <View style={s([styles.cardHeader, { backgroundColor: headerBg, borderBottomColor: border }])}>
            <Text style={s([styles.cardTitle, { color: tintColor }])}>Folders</Text>
          </View>
          <View style={s({ padding: wp(2) })}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={s([styles.folderButton, !selectedFolderId && { backgroundColor: isLightTheme ? "rgba(0,0,0,0.05)" : "#27272a" }])}
              onPress={() => setSelectedFolderId(null)}
            >
              <View style={s({ width: wp(3) })} />
              <Folder color={!selectedFolderId ? primaryColor : mutedText} size={fs(4)} />
              <Text style={s([styles.folderText, { color: tintColor }])}>All Assets</Text>
              <View style={s([styles.badgeCount, { backgroundColor: isLightTheme ? "rgba(0,0,0,0.05)" : "#27272a" }])}>
                <Text style={s([styles.badgeText, { color: mutedText }])}>{total}</Text>
              </View>
            </TouchableOpacity>
            {foldersQuery.isLoading ? (
              <ActivityIndicator size="small" color={primaryColor} style={s({ marginVertical: hp(1.5) })} />
            ) : (
              (foldersQuery.data ?? []).map((n) => renderFolderNode(n, 0))
            )}
          </View>
        </View>

        <View style={s([styles.card, { backgroundColor: cardBg, borderColor: border }])}>
          <View style={s([styles.cardHeader, { backgroundColor: headerBg, borderBottomColor: border, flexDirection: "column", gap: hp(1.2) }])}>
            <Text style={s([styles.cardTitle, { color: tintColor }])}>Assets</Text>

            <View style={s(styles.controlsRow)}>
              <TouchableOpacity style={s([styles.pickerTrigger, { backgroundColor: inputBg, borderColor: border }])} onPress={() => setShowTypePicker(true)}>
                <Text style={s([styles.pickerText, { color: tintColor }])}>{typeFilter === "" ? "All Types" : typeFilter.toUpperCase()}</Text>
                <ChevronDown color={mutedText} size={fs(3.5)} />
              </TouchableOpacity>

              <TouchableOpacity style={s([styles.pickerTrigger, { backgroundColor: inputBg, borderColor: border }])} onPress={() => setShowSortPicker(true)}>
                <Text style={s([styles.pickerText, { color: tintColor }])}>Sort: {sort.toUpperCase()}</Text>
                <ChevronDown color={mutedText} size={fs(3.5)} />
              </TouchableOpacity>
            </View>

            <View style={s([styles.searchContainer, { backgroundColor: inputBg, borderColor: border }])}>
              <Search color={mutedText} size={fs(4)} style={s(styles.searchIcon)} />
              <TextInput
                style={s([styles.searchInput, { color: tintColor }])}
                value={search}
                onChangeText={(text) => { setPage(1); setSearch(text); }}
                placeholder="Search approved assets..."
                placeholderTextColor={mutedText}
              />
            </View>
          </View>

          <View style={s(styles.assetsGridContent)}>
            {assetsQuery.isLoading ? (
              <View style={s(styles.statusBox)}>
                <ActivityIndicator size="small" color={primaryColor} />
              </View>
            ) : assets.length === 0 ? (
              <View style={s(styles.statusBox)}>
                <Text style={s([styles.mutedText, { color: mutedText }])}>No assets found</Text>
              </View>
            ) : (
              <View style={s(styles.gridContainer)}>
                {assets.map((a) => {
                  const mime = a.attachment?.mimeType || a.mimeType || "";
                  const isImage = mime.startsWith("image/");
                  return (
                    <TouchableOpacity
                      key={a.id}
                      activeOpacity={0.8}
                      style={s([styles.gridItem, { backgroundColor: isLightTheme ? "#ffffff" : "#1c1c1f", borderColor: border }])}
                      onPress={() => setPreview(a)}
                    >
                      <View style={s([styles.imagePlaceholderBox, { backgroundColor: inputBg }])}>
                        {isImage && a.resolvedThumb ? (
                          <ImageWithLoader
                            uri={a.resolvedThumb}
                            style={s(styles.gridImage)}
                            resizeMode="cover"
                            indicatorColor={primaryColor}
                          />
                        ) : (
                          <View style={s(styles.fallbackIconCenter)}>
                            {mime === "application/pdf" ? <FileText color={mutedText} size={fs(7)} /> : <ImageIcon color={mutedText} size={fs(7)} />}
                          </View>
                        )}
                        <TouchableOpacity
                          activeOpacity={0.6}
                          style={s(styles.floatingCopyLink)}
                          onPress={(e) => {
                            e.stopPropagation();
                            copyToClipboard(a.attachment?.url || "");
                          }}
                        >
                          <LinkIcon color="#ffffff" size={fs(3)} />
                        </TouchableOpacity>
                      </View>
                      <View style={s([styles.gridItemFooter, { borderTopColor: border }])}>
                        <Text style={s([styles.assetTitleText, { color: tintColor }])} numberOfLines={1}>
                          {a.title?.trim() || a.originalFilename || a.attachment?.fileName || "Asset"}
                        </Text>
                        <Text style={s([styles.assetSizeText, { color: mutedText }])}>{formatBytes(a.sizeBytes || a.attachment?.size)}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <View style={s([styles.paginationRow, { borderTopColor: border }])}>
              <Text style={s([styles.totalIndicatorText, { color: mutedText }])}>{total} items total</Text>
              <View style={s(styles.pageButtonsContainer)}>
                <TouchableOpacity
                  style={s([styles.navBtn, { borderColor: border, backgroundColor: isLightTheme ? "#ffffff" : "#1c1c1f" }, page <= 1 && styles.disabledBtn])}
                  disabled={page <= 1 || assetsQuery.isLoading}
                  onPress={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <Text style={s([styles.navBtnText, { color: tintColor }])}>Prev</Text>
                </TouchableOpacity>
                <Text style={s([styles.pageIndicatorText, { color: mutedText }])}>Page {page} of {totalPages}</Text>
                <TouchableOpacity
                  style={s([styles.navBtn, { borderColor: border, backgroundColor: isLightTheme ? "#ffffff" : "#1c1c1f" }, page >= totalPages && styles.disabledBtn])}
                  disabled={page >= totalPages || assetsQuery.isLoading}
                  onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  <Text style={s([styles.navBtnText, { color: tintColor }])}>Next</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Type Filter Bottom Sheet Picker */}
      <Modal visible={showTypePicker} transparent animationType="slide">
        <TouchableOpacity style={s(styles.modalOverlay)} activeOpacity={1} onPress={() => setShowTypePicker(false)}>
          <View style={s([styles.bottomSheetContainer, { backgroundColor: cardBg, borderTopColor: border }])}>
            <Text style={s([styles.sheetHeading, { color: tintColor }])}>Select Asset Filter Type</Text>
            {([
              { label: "All types", value: "" },
              { label: "Images Only", value: "image" },
              { label: "PDF Documents", value: "pdf" },
            ] as const).map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={s([styles.sheetItem, { borderBottomColor: border }])}
                onPress={() => { setPage(1); setTypeFilter(opt.value); setShowTypePicker(false); }}
              >
                <Text style={s([styles.sheetItemText, { color: mutedText }, typeFilter === opt.value && { color: primaryColor, fontWeight: "600" }])}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Sort Filter Bottom Sheet Picker */}
      <Modal visible={showSortPicker} transparent animationType="slide">
        <TouchableOpacity style={s(styles.modalOverlay)} activeOpacity={1} onPress={() => setShowSortPicker(false)}>
          <View style={s([styles.bottomSheetContainer, { backgroundColor: cardBg, borderTopColor: border }])}>
            <Text style={s([styles.sheetHeading, { color: tintColor }])}>Select Sorting Priority</Text>
            {([
              { label: "Newest Updates", value: "newest" },
              { label: "Oldest Configuration", value: "oldest" },
              { label: "Alphabetical (A-Z)", value: "az" },
              { label: "Reverse Order (Z-A)", value: "za" },
              { label: "Size Increasing", value: "size-asc" },
              { label: "Size Decreasing", value: "size-desc" },
            ] as const).map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={s([styles.sheetItem, { borderBottomColor: border }])}
                onPress={() => { setPage(1); setSort(opt.value); setShowSortPicker(false); }}
              >
                <Text style={s([styles.sheetItemText, { color: mutedText }, sort === opt.value && { color: primaryColor, fontWeight: "600" }])}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Web-Style Asset Details & Lightbox Preview Modal */}
      <Modal visible={Boolean(preview)} animationType="fade" transparent={true}>
        <View style={s(styles.webLightboxBackdrop)}>
          <View style={s([styles.webLightboxBox, { backgroundColor: cardBg, borderColor: border }])}>
            {/* Header / Title Bar */}
            <View style={s([styles.previewHeaderBar, { backgroundColor: headerBg, borderBottomColor: border }])}>
              <Text style={s([styles.previewHeaderTitle, { color: tintColor }])} numberOfLines={1}>
                {preview?.originalFilename || preview?.attachment?.fileName || "Asset Details"}
              </Text>
              <TouchableOpacity onPress={() => setPreview(null)} style={s(styles.closeModalHitbox)}>
                <X color={tintColor} size={fs(5.5)} />
              </TouchableOpacity>
            </View>

            {preview ? (
              <ScrollView contentContainerStyle={s({ padding: wp(4) })} showsVerticalScrollIndicator={false}>
                <View style={s([styles.lightboxDisplayCard, { backgroundColor: isLightTheme ? "#f1f5f9" : "#141416", borderColor: border }])}>
                  {(() => {
                    const mime = preview.attachment?.mimeType || preview.mimeType || "";
                    const isImage = mime.startsWith("image/");

                    if (isImage && preview.resolvedPreview) {
                      return (
                        <ImageWithLoader
                          uri={preview.resolvedPreview}
                          style={s(styles.lightboxImage)}
                          resizeMode="contain"
                          indicatorColor={primaryColor}
                        />
                      );
                    }
                    return (
                      <View style={s(styles.unsupportedPlaceholder)}>
                        {mime === "application/pdf" ? <FileText color={mutedText} size={fs(12)} /> : <ImageIcon color={mutedText} size={fs(12)} />}
                        <Text style={s([styles.unsupportedText, { color: mutedText }])}>File type preview is best viewed directly post download.</Text>
                      </View>
                    );
                  })()}
                </View>

                <View style={s(styles.actionButtonsContainer)}>
                  <TouchableOpacity style={s([styles.secondaryActionBtn, { borderColor: border, backgroundColor: isLightTheme ? "#ffffff" : "#1c1c1f" }])} onPress={() => copyToClipboard(preview.attachment?.url || "")}>
                    <Text style={s([styles.secondaryActionText, { color: tintColor }])}>Copy Asset Link</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={s([styles.primaryActionBtn, { backgroundColor: primaryColor }])} disabled={isDownloading} onPress={() => downloadAsset(preview)}>
                    {isDownloading ? <ActivityIndicator size="small" color="#ffffff" /> : <Download color="#ffffff" size={fs(4)} />}
                    <Text style={s(styles.primaryActionText)}>{isDownloading ? "Downloading..." : "Download File"}</Text>
                  </TouchableOpacity>
                </View>

                <View style={s([styles.detailsCardBlock, { backgroundColor: cardBg, borderColor: border }])}>
                  <Text style={s([styles.detailsHeading, { color: tintColor, borderBottomColor: border }])}>Asset Specific Metadata Properties</Text>
                  <View style={s(styles.metadataGridRow)}>
                    <Text style={s([styles.metaLabel, { color: mutedText }])}>File String:</Text>
                    <Text style={s([styles.metaValue, { color: tintColor }])}>{preview.originalFilename || preview.attachment?.fileName || "—"}</Text>
                  </View>
                  <View style={s(styles.metadataGridRow)}>
                    <Text style={s([styles.metaLabel, { color: mutedText }])}>Mime Configuration:</Text>
                    <Text style={s([styles.metaValue, { color: tintColor }])}>{preview.mimeType || preview.attachment?.mimeType || "—"}</Text>
                  </View>
                  <View style={s(styles.metadataGridRow)}>
                    <Text style={s([styles.metaLabel, { color: mutedText }])}>Computed Weight Size:</Text>
                    <Text style={s([styles.metaValue, { color: tintColor }])}>{formatBytes(preview.sizeBytes || preview.attachment?.size)}</Text>
                  </View>
                  {preview.width && preview.height ? (
                    <View style={s(styles.metadataGridRow)}>
                      <Text style={s([styles.metaLabel, { color: mutedText }])}>Dimensions Grid:</Text>
                      <Text style={s([styles.metaValue, { color: tintColor }])}>{preview.width} × {preview.height} px</Text>
                    </View>
                  ) : null}
                  {preview.folderId ? (
                    <View style={s(styles.metadataGridRow)}>
                      <Text style={s([styles.metaLabel, { color: mutedText }])}>Assigned Folder Target:</Text>
                      <Text style={s([styles.metaValue, { color: tintColor }])}>
                        {allFolders.find((f) => f.id === preview.folderId)?.name || "—"}
                      </Text>
                    </View>
                  ) : null}
                  {Boolean(preview.tags?.length) ? (
                    <View style={s(styles.metadataGridRow)}>
                      <Text style={s([styles.metaLabel, { color: mutedText }])}>Keywords Tags:</Text>
                      <Text style={s([styles.metaValue, { color: tintColor }])}>{preview.tags?.join(", ")}</Text>
                    </View>
                  ) : null}
                </View>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContainer: { paddingHorizontal: wp(4), paddingTop: hp(2.5), paddingBottom: hp(5) },
  header: { marginBottom: hp(2.5) },
  mainTitle: { fontSize: fs(5.8), fontWeight: "bold", letterSpacing: -0.5 },
  subTitle: { fontSize: fs(3.2), marginTop: hp(0.5), lineHeight: fs(4.5) },
  card: { borderWidth: 1, borderRadius: wp(3), marginBottom: hp(2), overflow: "hidden" },
  cardHeader: { padding: wp(4), borderBottomWidth: 1 },
  cardTitle: { fontSize: fs(3.8), fontWeight: "600" },
  folderButton: { flexDirection: "row", alignItems: "center", paddingVertical: hp(1.2), paddingHorizontal: wp(3), borderRadius: wp(2), marginVertical: hp(0.2) },
  expandChevronHitbox: { width: wp(6), height: wp(6), justifyContent: "center", alignItems: "center" },
  rotate90: { transform: [{ rotate: "90deg" }] },
  folderText: { fontSize: fs(3.5), marginLeft: wp(2.5), flex: 1 },
  badgeCount: { paddingHorizontal: wp(2), paddingVertical: hp(0.3), borderRadius: wp(3) },
  badgeText: { fontSize: fs(2.8), fontWeight: "600" },
  controlsRow: { flexDirection: "row", gap: wp(2.5), width: "100%" },
  pickerTrigger: { flex: 1, height: hp(5), borderWidth: 1, borderRadius: wp(2), paddingHorizontal: wp(3), flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pickerText: { fontSize: fs(3), fontWeight: "500" },
  searchContainer: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: wp(2), paddingHorizontal: wp(3), height: hp(5), width: "100%" },
  searchIcon: { marginRight: wp(2) },
  searchInput: { flex: 1, fontSize: fs(3.5), paddingVertical: 0 },
  assetsGridContent: { padding: wp(3) },
  statusBox: { padding: wp(10), alignItems: "center" },
  mutedText: { fontSize: fs(3.2) },
  gridContainer: { flexDirection: "row", flexWrap: "wrap", gap: wp(2.5) },
  gridItem: { width: wp(40), borderRadius: wp(2), borderWidth: 1, overflow: "hidden", marginBottom: hp(0.5) },
  imagePlaceholderBox: { width: "100%", aspectRatio: 1, justifyContent: "center", alignItems: "center", position: "relative" },
  gridImage: { width: "100%", height: "100%" },
  fallbackIconCenter: { alignItems: "center", justifyContent: "center" },
  floatingCopyLink: { position: "absolute", right: wp(1.5), top: hp(0.8), width: wp(6), height: wp(6), borderRadius: wp(3), backgroundColor: "#00000090", justifyContent: "center", alignItems: "center", zIndex: 5 },
  gridItemFooter: { padding: wp(2), borderTopWidth: 1 },
  assetTitleText: { fontSize: fs(3), fontWeight: "500" },
  assetSizeText: { fontSize: fs(2.5), marginTop: hp(0.3) },
  paginationRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: hp(2), borderTopWidth: 1, paddingTop: hp(1.5) },
  totalIndicatorText: { fontSize: fs(3) },
  pageButtonsContainer: { flexDirection: "row", alignItems: "center", gap: wp(2) },
  navBtn: { paddingVertical: hp(0.8), paddingHorizontal: wp(3), borderWidth: 1, borderRadius: wp(1.5) },
  navBtnText: { fontSize: fs(3), fontWeight: "500" },
  pageIndicatorText: { fontSize: fs(2.8) },
  disabledBtn: { opacity: 0.4 },
  modalOverlay: { flex: 1, backgroundColor: "#00000070", justifyContent: "flex-end" },
  bottomSheetContainer: { borderTopLeftRadius: wp(4), borderTopRightRadius: wp(4), padding: wp(5), borderTopWidth: 1 },
  sheetHeading: { fontSize: fs(3.8), fontWeight: "600", marginBottom: hp(1.5) },
  sheetItem: { paddingVertical: hp(1.8), borderBottomWidth: 1 },
  sheetItemText: { fontSize: fs(3.5) },
  webLightboxBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "center", alignItems: "center", padding: wp(3) },
  webLightboxBox: { width: width * 0.95, maxHeight: height * 0.9, borderRadius: wp(3), borderWidth: 1, overflow: "hidden" },
  previewHeaderBar: { height: hp(6.5), paddingHorizontal: wp(4), borderBottomWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  previewHeaderTitle: { fontSize: fs(3.8), fontWeight: "600", width: "80%" },
  closeModalHitbox: { width: wp(9), height: wp(9), justifyContent: "center", alignItems: "center" },
  lightboxDisplayCard: { width: "100%", height: hp(35), borderWidth: 1, borderRadius: wp(2), justifyContent: "center", alignItems: "center", overflow: "hidden", marginBottom: hp(2) },
  lightboxImage: { width: "100%", height: "100%" },
  imageLoaderWrapper: { width: "100%", height: "100%", position: "relative", justifyContent: "center", alignItems: "center" },
  imageLoaderContainer: { ...StyleSheet.absoluteFillObject, justifyContent: "center", alignItems: "center", zIndex: 1 },
  unsupportedPlaceholder: { padding: wp(6), alignItems: "center" },
  unsupportedText: { fontSize: fs(3), textAlign: "center", marginTop: hp(1.5), maxWidth: "80%" },
  actionButtonsContainer: { flexDirection: "row", gap: wp(2.5), marginBottom: hp(2.5) },
  primaryActionBtn: { flex: 1, height: hp(5.5), borderRadius: wp(2), flexDirection: "row", alignItems: "center", justifyContent: "center", gap: wp(2) },
  primaryActionText: { color: "#ffffff", fontSize: fs(3.5), fontWeight: "700" },
  secondaryActionBtn: { flex: 1, height: hp(5.5), borderWidth: 1, borderRadius: wp(2), alignItems: "center", justifyContent: "center" },
  secondaryActionText: { fontSize: fs(3.5), fontWeight: "600" },
  detailsCardBlock: { padding: wp(4), borderRadius: wp(2.5), borderWidth: 1, gap: hp(1.2) },
  detailsHeading: { fontSize: fs(3.5), fontWeight: "600", borderBottomWidth: 1, paddingBottom: hp(0.8) },
  metadataGridRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: hp(0.3) },
  metaLabel: { fontSize: fs(3), fontWeight: "500" },
  metaValue: { fontSize: fs(3), maxWidth: "60%", textAlign: "right" },
});