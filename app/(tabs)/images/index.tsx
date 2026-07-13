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
  Dimensions,
  Image,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import * as FileSystem from "expo-file-system";
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

// --- API Implementation Imports ---
import { apiFetch, toProxiedUrl } from "@/lib/admin/apiClient";

const { width, height } = Dimensions.get("window");

// --- TypeScript Definitions ---
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

// --- Shared Helper Functions ---
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

  // --- React Queries ---
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

  // --- File Download Utility using Expo FileSystem ---
  const downloadAsset = async (asset: Asset) => {
    try {
      setIsDownloading(true);
      const res = await apiFetch<{ url: string; fileName: string }>(
        `/api/asset-library/assets/${encodeURIComponent(asset.id)}/download`,
        { method: "POST" }
      );

      const safeUrl = toProxiedUrl(res.url) || res.url;
      const targetFilename = res.fileName || asset.attachment?.fileName || "asset";
      const localUri = `${FileSystem.documentDirectory}${Date.now()}_${targetFilename}`;

      const downloadResult = await FileSystem.downloadAsync(safeUrl, localUri);
      
      if (downloadResult.status === 200) {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(downloadResult.uri, { mimeType: asset.attachment?.mimeType || asset.mimeType });
        }
      } else {
        console.error("Download failed status: ", downloadResult.status);
      }
    } catch (error) {
      console.error("Native download layer fault: ", error);
    } finally {
      setIsDownloading(false);
    }
  };

  const copyToClipboard = async (urlStr: string) => {
    const link = toProxiedUrl(urlStr) || urlStr;
    if (link) {
      await Clipboard.setStringAsync(link);
    }
  };

  // --- Recursive Render Folder Trees ---
  const renderFolderNode = (node: FolderNode, depth = 0) => {
    const isActive = selectedFolderId === node.id;
    const hasChildren = Boolean(node.children?.length);
    const isExpanded = expandedFolderIds[node.id] ?? true;
    return (
      <View key={node.id}>
        <TouchableOpacity
          activeOpacity={0.7}
          className="w-full flex flex-row items-center rounded-md py-2 px-2"
          style={[styles.folderButton, isActive && styles.bgMuted, { paddingLeft: 8 + depth * 14 }]}
          onPress={() => setSelectedFolderId(node.id)}
        >
          {hasChildren ? (
            <TouchableOpacity
              activeOpacity={0.5}
              style={styles.expandChevronHitbox}
              onPress={() => setExpandedFolderIds((prev) => ({ ...prev, [node.id]: !(prev[node.id] ?? true) }))}
            >
              <ChevronRight color="#a1a1aa" size={16} style={isExpanded && styles.rotate90} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 24 }} />
          )}
          {isActive ? <FolderOpen color="#3b82f6" size={16} /> : <Folder color="#a1a1aa" size={16} />}
          <Text style={styles.folderText} numberOfLines={1}>{node.name}</Text>
          <View style={styles.badgeCount}>
            <Text style={styles.badgeText}>{Number(node.assetCount || 0)}</Text>
          </View>
        </TouchableOpacity>
        {hasChildren && isExpanded ? node.children!.map((c) => renderFolderNode(c, depth + 1)) : null}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Module Header Title */}
        <View style={styles.header}>
          <Text style={styles.mainTitle}>{title}</Text>
          <Text style={styles.subTitle}>{description}</Text>
        </View>

        {/* Global Root Assets Shortcut */}
        <View style={styles.card}>
          <View style={styles.cardHeader}><Text style={styles.cardTitle}>Folders</Text></View>
          <View style={{ padding: 8 }}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={[styles.folderButton, !selectedFolderId && styles.bgMuted]}
              onPress={() => setSelectedFolderId(null)}
            >
              <View style={{ width: 12 }} />
              <Folder color={!selectedFolderId ? "#3b82f6" : "#a1a1aa"} size={16} />
              <Text style={styles.folderText}>All Assets</Text>
              <View style={styles.badgeCount}><Text style={styles.badgeText}>{total}</Text></View>
            </TouchableOpacity>
            {foldersQuery.isLoading ? (
              <ActivityIndicator size="small" color="#3b82f6" style={{ marginVertical: 12 }} />
            ) : (
              (foldersQuery.data ?? []).map((n) => renderFolderNode(n, 0))
            )}
          </View>
        </View>

        {/* Assets Explorer Block */}
        <View style={styles.card}>
          <View style={[styles.cardHeader, { flexDirection: "column", gap: 10 }]}>
            <Text style={styles.cardTitle}>Assets</Text>
            
            {/* Filter and Sorting Header Controls Rows */}
            <View style={styles.controlsRow}>
              <TouchableOpacity style={styles.pickerTrigger} onPress={() => setShowTypePicker(true)}>
                <Text style={styles.pickerText}>{typeFilter === "" ? "All Types" : typeFilter.toUpperCase()}</Text>
                <ChevronDown color="#71717a" size={14} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.pickerTrigger} onPress={() => setShowSortPicker(true)}>
                <Text style={styles.pickerText}>Sort: {sort.toUpperCase()}</Text>
                <ChevronDown color="#71717a" size={14} />
              </TouchableOpacity>
            </View>

            {/* Input Search Box */}
            <View style={styles.searchContainer}>
              <Search color="#71717a" size={16} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                value={search}
                onChangeText={(text) => { setPage(1); setSearch(text); }}
                placeholder="Search approved assets..."
                placeholderTextColor="#71717a"
              />
            </View>
          </View>

          {/* Grid Layout Implementation */}
          <View style={styles.assetsGridContent}>
            {assetsQuery.isLoading ? (
              <View style={styles.statusBox}><ActivityIndicator size="small" color="#3b82f6" /></View>
            ) : assets.length === 0 ? (
              <View style={styles.statusBox}><Text style={styles.mutedText}>No assets found</Text></View>
            ) : (
              <View style={styles.gridContainer}>
                {assets.map((a) => {
                  const url = a.urlThumbnail || a.attachment?.url || "";
                  const mime = a.attachment?.mimeType || a.mimeType || "";
                  const isImage = mime.startsWith("image/");
                  const thumb = toProxiedUrl(url) || url;
                  return (
                    <TouchableOpacity
                      key={a.id}
                      activeOpacity={0.8}
                      style={styles.gridItem}
                      onPress={() => setPreview(a)}
                    >
                      <View style={styles.imagePlaceholderBox}>
                        {isImage && thumb ? (
                          <Image source={{ uri: thumb }} style={styles.gridImage} resizeMode="cover" />
                        ) : (
                          <View style={styles.fallbackIconCenter}>
                            {mime === "application/pdf" ? <FileText color="#71717a" size={28} /> : <ImageIcon color="#71717a" size={28} />}
                          </View>
                        )}
                        <TouchableOpacity
                          activeOpacity={0.6}
                          style={styles.floatingCopyLink}
                          onPress={() => copyToClipboard(a.attachment?.url || "")}
                        >
                          <LinkIcon color="#ffffff" size={12} />
                        </TouchableOpacity>
                      </View>
                      <View style={styles.gridItemFooter}>
                        <Text style={styles.assetTitleText} numberOfLines={1}>
                          {a.title?.trim() || a.originalFilename || a.attachment?.fileName || "Asset"}
                        </Text>
                        <Text style={styles.assetSizeText}>{formatBytes(a.sizeBytes || a.attachment?.size)}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Grid Footnotes Pagination System Layout */}
            <View style={styles.paginationRow}>
              <Text style={styles.totalIndicatorText}>{total} items total</Text>
              <View style={styles.pageButtonsContainer}>
                <TouchableOpacity
                  style={[styles.navBtn, page <= 1 && styles.disabledBtn]}
                  disabled={page <= 1 || assetsQuery.isLoading}
                  onPress={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <Text style={styles.navBtnText}>Prev</Text>
                </TouchableOpacity>
                <Text style={styles.pageIndicatorText}>Page {page} of {totalPages}</Text>
                <TouchableOpacity
                  style={[styles.navBtn, page >= totalPages && styles.disabledBtn]}
                  disabled={page >= totalPages || assetsQuery.isLoading}
                  onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  <Text style={styles.navBtnText}>Next</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* --- Native Picker Modals fallback overlays for web select components --- */}
      <Modal visible={showTypePicker} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowTypePicker(false)}>
          <View style={styles.bottomSheetContainer}>
            <Text style={styles.sheetHeading}>Select Asset Filter Type</Text>
            {([
              { label: "All types", value: "" },
              { label: "Images Only", value: "image" },
              { label: "PDF Documents", value: "pdf" },
            ] as const).map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={styles.sheetItem}
                onPress={() => { setPage(1); setTypeFilter(opt.value); setShowTypePicker(false); }}
              >
                <Text style={[styles.sheetItemText, typeFilter === opt.value && styles.activeSheetItemText]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showSortPicker} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowSortPicker(false)}>
          <View style={styles.bottomSheetContainer}>
            <Text style={styles.sheetHeading}>Select Sorting Priority</Text>
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
                style={styles.sheetItem}
                onPress={() => { setPage(1); setSort(opt.value); setShowSortPicker(false); }}
              >
                <Text style={[styles.sheetItemText, sort === opt.value && styles.activeSheetItemText]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* --- Asset Lightbox / Preview Details Modal Panel Overlay --- */}
      <Modal visible={Boolean(preview)} animationType="fade" transparent={false}>
        <View style={styles.previewViewContainer}>
          <View style={styles.previewHeaderBar}>
            <Text style={styles.previewHeaderTitle} numberOfLines={1}>
              {preview?.originalFilename || preview?.attachment?.fileName || "Asset Viewer"}
            </Text>
            <TouchableOpacity onPress={() => setPreview(null)} style={styles.closeModalHitbox}>
              <X color="#ffffff" size={22} />
            </TouchableOpacity>
          </View>

          {preview && (
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              <View style={styles.lightboxDisplayCard}>
                {(() => {
                  const url = preview.attachment?.url || "";
                  const mime = preview.attachment?.mimeType || preview.mimeType || "";
                  const isImage = mime.startsWith("image/");
                  const safeUrl = toProxiedUrl(url);

                  if (isImage && safeUrl) {
                    return <Image source={{ uri: safeUrl }} style={styles.lightboxImage} resizeMode="contain" />;
                  }
                  return (
                    <View style={styles.unsupportedPlaceholder}>
                      {mime === "application/pdf" ? <FileText color="#a1a1aa" size={48} /> : <ImageIcon color="#a1a1aa" size={48} />}
                      <Text style={styles.unsupportedText}>File type preview is best viewed directly post download.</Text>
                    </View>
                  );
                })()}
              </View>

              {/* Operations Action Panel Layout Buttons */}
              <View style={styles.actionButtonsContainer}>
                <TouchableOpacity style={styles.secondaryActionBtn} onPress={() => copyToClipboard(preview.attachment?.url || "")}>
                  <Text style={styles.secondaryActionText}>Copy Asset Link</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.primaryActionBtn} disabled={isDownloading} onPress={() => downloadAsset(preview)}>
                  {isDownloading ? <ActivityIndicator size="small" color="#ffffff" /> : <Download color="#ffffff" size={16} />}
                  <Text style={styles.primaryActionText}>{isDownloading ? "Downloading..." : "Download File"}</Text>
                </TouchableOpacity>
              </View>

              {/* Asset Technical Specs Meta Properties Grid Wrapper */}
              {/* Asset Technical Specs Meta Properties Grid Wrapper */}
              <View style={styles.detailsCardBlock}>
                <Text style={styles.detailsHeading}>Asset Specific Metadata Properties</Text>
                <View style={styles.metadataGridRow}>
                  <Text style={styles.metaLabel}>File String:</Text>
                  <Text style={styles.metaValue}>{preview.originalFilename || preview.attachment?.fileName || "—"}</Text>
                </View>
                <View style={styles.metadataGridRow}>
                  <Text style={styles.metaLabel}>Mime Configuration:</Text>
                  <Text style={styles.metaValue}>{preview.mimeType || preview.attachment?.mimeType || "—"}</Text>
                </View>
                <View style={styles.metadataGridRow}>
                  <Text style={styles.metaLabel}>Computed Weight Size:</Text>
                  <Text style={styles.metaValue}>{formatBytes(preview.sizeBytes || preview.attachment?.size)}</Text>
                </View>
                {preview.width && preview.height && (
                  <View style={styles.metadataGridRow}>
                    <Text style={styles.metaLabel}>Dimensions Grid:</Text>
                    <Text style={styles.metaValue}>{preview.width} × {preview.height} px</Text>
                  </View>
                )}
                {preview.folderId && (
                  <View style={styles.metadataGridRow}>
                    <Text style={styles.metaLabel}>Assigned Folder Target:</Text>
                    <Text style={styles.metaValue}>
                      {allFolders.find((f) => f.id === preview.folderId)?.name || "—"}
                    </Text>
                  </View>
                )}
                {preview.tags?.length ? (
                  <View style={styles.metadataGridRow}>
                    <Text style={styles.metaLabel}>Keywords Tags:</Text>
                    <Text style={styles.metaValue}>{preview.tags.join(", ")}</Text>
                  </View>
                ) : null}
              </View> {/* <--- FIXED HERE: Changed from </ScrollView> to </View> */}
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
}

// --- Deep Matte Dark Theme Stylesheet Definitions ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#09090b" },
  scrollContainer: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 40 },
  header: { marginBottom: 20 },
  mainTitle: { color: "#ffffff", fontSize: 24, fontWeight: "bold", letterSpacing: -0.5 },
  subTitle: { color: "#a1a1aa", fontSize: 13, marginTop: 4, lineHeight: 18 },

  // Structural Atomic Box Panels Card Layout
  card: { backgroundColor: "#18181b", borderColor: "#27272a", borderWidth: 1, borderRadius: 12, marginBottom: 16, overflow: "hidden" },
  cardHeader: { padding: 16, backgroundColor: "#1c1c1f", borderBottomWidth: 1, borderBottomColor: "#27272a" },
  cardTitle: { color: "#ffffff", fontSize: 15, fontWeight: "600" },

  // Folders UI Tree layout styling rows
  folderButton: { flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, marginVertical: 1 },
  bgMuted: { backgroundColor: "#27272a" },
  expandChevronHitbox: { width: 24, height: 24, justifyContent: "center", alignItems: "center" },
  rotate90: { transform: [{ rotate: "90deg" }] },
  folderText: { color: "#e4e4e7", fontSize: 14, marginLeft: 10, flex: 1 },
  badgeCount: { backgroundColor: "#27272a", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  badgeText: { color: "#a1a1aa", fontSize: 11, fontWeight: "600" },

  // Filter Dropdowns Control Row
  controlsRow: { flexDirection: "row", gap: 10, width: "100%" },
  pickerTrigger: { flex: 1, height: 40, backgroundColor: "#09090b", borderColor: "#27272a", borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pickerText: { color: "#e4e4e7", fontSize: 12, fontWeight: "500" },

  // Search Controls Components Box
  searchContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "#09090b", borderColor: "#27272a", borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, height: 40, width: "100%" },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: "#ffffff", fontSize: 14, paddingVertical: 0 },

  // Responsive Core Grid Mapping Items
  assetsGridContent: { padding: 12 },
  statusBox: { padding: 40, alignItems: "center" },
  mutedText: { color: "#71717a", fontSize: 13 },
  gridContainer: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  gridItem: { width: (width - 66) / 2, backgroundColor: "#1c1c1f", borderRadius: 8, borderColor: "#27272a", borderWidth: 1, overflow: "hidden", marginBottom: 4 },
  imagePlaceholderBox: { width: "100%", aspectRatio: 1, backgroundColor: "#09090b", justifyContent: "center", alignItems: "center", position: "relative" },
  gridImage: { width: "100%", height: "100%" },
  fallbackIconCenter: { alignItems: "center", justifyContent: "center" },
  floatingCopyLink: { position: "absolute", right: 6, top: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: "#00000090", justifyContent: "center", alignItems: "center" },
  gridItemFooter: { padding: 8, borderTopWidth: 1, borderTopColor: "#27272a" },
  assetTitleText: { color: "#ffffff", fontSize: 12, fontWeight: "500" },
  assetSizeText: { color: "#71717a", fontSize: 10, marginTop: 2 },

  // Navigations Footer Pagination Strip Styles
  paginationRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 16, borderTopWidth: 1, borderTopColor: "#27272a", paddingTop: 12 },
  totalIndicatorText: { color: "#71717a", fontSize: 12 },
  pageButtonsContainer: { flexDirection: "row", alignItems: "center", gap: 8 },
  navBtn: { paddingVertical: 6, paddingHorizontal: 12, borderColor: "#27272a", borderWidth: 1, borderRadius: 6, backgroundColor: "#1c1c1f" },
  navBtnText: { color: "#ffffff", fontSize: 12, fontWeight: "500" },
  pageIndicatorText: { color: "#a1a1aa", fontSize: 11 },
  disabledBtn: { opacity: 0.4 },

  // Overlay Selector Action Sheets Bottom fallbacks elements
  modalOverlay: { flex: 1, backgroundColor: "#00000070", justifyContent: "flex-end" },
  bottomSheetContainer: { backgroundColor: "#18181b", borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, borderTopWidth: 1, borderTopColor: "#27272a" },
  sheetHeading: { color: "#ffffff", fontSize: 15, fontWeight: "600", marginBottom: 12 },
  sheetItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#27272a" },
  sheetItemText: { color: "#a1a1aa", fontSize: 14 },
  activeSheetItemText: { color: "#3b82f6", fontWeight: "600" },

  // Preview / Lightbox Canvas Modal Styles Elements
  previewViewContainer: { flex: 1, backgroundColor: "#09090b" },
  previewHeaderBar: { height: 60, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: "#27272a", flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#18181b" },
  previewHeaderTitle: { color: "#ffffff", fontSize: 15, fontWeight: "600", width: "80%" },
  closeModalHitbox: { width: 36, height: 36, justifyContent: "center", alignItems: "center" },
  lightboxDisplayCard: { width: "100%", height: height * 0.4, backgroundColor: "#141416", borderHorizontalWidth: 1, borderVerticalWidth: 1, borderColor: "#27272a", borderRadius: 8, justifyContent: "center", alignItems: "center", overflow: "hidden", marginBottom: 16 },
  lightboxImage: { width: "100%", height: "100%" },
  unsupportedPlaceholder: { padding: 24, alignItems: "center" },
  unsupportedText: { color: "#71717a", fontSize: 12, textAlign: "center", marginTop: 12, maxWidth: "80%" },
  actionButtonsContainer: { flexDirection: "row", gap: 10, marginBottom: 20 },
  primaryActionBtn: { flex: 1, height: 44, backgroundColor: "#3b82f6", borderRadius: 8, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  primaryActionText: { color: "#ffffff", fontSize: 14, fontWeight: "700" },
  secondaryActionBtn: { flex: 1, height: 44, borderColor: "#27272a", borderWidth: 1, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: "#1c1c1f" },
  secondaryActionText: { color: "#e4e4e7", fontSize: 14, fontWeight: "600" },
  detailsCardBlock: { backgroundColor: "#18181b", padding: 16, borderRadius: 10, borderColor: "#27272a", borderWidth: 1, gap: 10 },
  detailsHeading: { color: "#ffffff", fontSize: 14, fontWeight: "600", borderBottomWidth: 1, borderBottomColor: "#27272a", paddingBottom: 6 },
  metadataGridRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  metaLabel: { color: "#71717a", fontSize: 12, fontWeight: "500" },
  metaValue: { color: "#e4e4e7", fontSize: 12, maxWidth: "60%", textAlign: "right" }
});