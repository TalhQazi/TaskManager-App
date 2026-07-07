import React, { useEffect, useMemo, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  ScrollView,
  Image,
  Dimensions,
  ActivityIndicator,
  Alert,
  Modal,
} from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import {
  ChevronRight,
  Folder,
  FolderOpen,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  Download,
  Link as LinkIcon,
  FileText,
  File,
  X,
} from "lucide-react-native";
import { apiFetch, toProxiedUrl } from "@/lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

type FolderNode = {
  id: string;
  name: string;
  parentFolderId?: string | null;
  isArchived?: boolean;
  isReadOnly?: boolean;
  sortOrder?: number;
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
  extension?: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  urlThumbnail?: string;
  urlPreview?: string;
  createdAt?: string;
  updatedAt?: string;
  attachment?: { fileName?: string; url?: string; mimeType?: string; size?: number };
};

type BrandKit = {
  id: string;
  name: string;
  description?: string;
  colors?: string[];
  guidelines?: string;
  assetIds?: string[];
};

type Paginated<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

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

export default function AssetLibrary({
  moduleName = "asset-library",
  title = "Images",
  description = "Upload, organize, preview, and download assets.",
}) {
  const queryClient = useQueryClient();
  const { uiTheme } = useTheme();

  const isDark = (uiTheme.theme as string) === "dark" || (uiTheme.theme as string) === "metallic-elite";

  const colors = useMemo(() => ({
    background: uiTheme.panelColors?.dashboardBackground || (isDark ? "#0f172a" : "#f8fafc"),
    cardBg: uiTheme.panelColors?.dashboardCardBackground || (isDark ? "#1e293b" : "#ffffff"),
    text: uiTheme.panelColors?.dashboardTextColor || (isDark ? "#f8fafc" : "#0f172a"),
    mutedText: isDark ? "#94a3b8" : "#64748b",
    border: isDark ? "#334155" : "#e2e8f0",
    inputBg: isDark ? "#0f172a" : "#ffffff",
    inputText: isDark ? "#f8fafc" : "#0f172a",
    primary: uiTheme.customColors?.primary || "#4f46e5",
    tabTrack: isDark ? "#1e293b" : "#e5e7eb",
    tabActive: isDark ? "#334155" : "#ffffff",
    folderActiveBg: isDark ? "rgba(79, 70, 229, 0.15)" : "#eef2f6",
    folderBg: isDark ? "#1e293b" : "#f3F4F6",
    contextBg: isDark ? "rgba(59, 130, 246, 0.15)" : "#eff6ff",
    contextText: isDark ? "#60a5fa" : "#1e40af",
    contextBorder: isDark ? "rgba(59, 130, 246, 0.3)" : "#bfdbfe",
    destructive: "#ef4444",
  }), [uiTheme, isDark]);

  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"assets" | "brand-kits">("assets");
  const [sort] = useState<"newest" | "oldest" | "az" | "za">("az");
  const [page, setPage] = useState(1);
  const limit = 25;

  const [expandedFolderIds, setExpandedFolderIds] = useState<Record<string, boolean>>({});
  const [preview, setPreview] = useState<Asset | null>(null);

  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [folderModalMode, setFolderModalMode] = useState<"create" | "rename">("create");
  const [folderNameInput, setFolderNameInput] = useState("");

  const [isBrandKitModalOpen, setIsBrandKitModalOpen] = useState(false);
  const [brandKitName, setBrandKitName] = useState("");
  const [brandKitDescription, setBrandKitDescription] = useState("");
  const [brandKitColors, setBrandKitColors] = useState("");
  const [brandKitGuidelines, setBrandKitGuidelines] = useState("");

  const foldersQuery = useQuery({
    queryKey: ["company-information-images", "folders", moduleName],
    queryFn: async () => {
      const res = await apiFetch<{ items: FolderNode[] }>(`/asset-library/folders?module=${moduleName}`);
      return res.items || [];
    },
  });

  const globalStatsQuery = useQuery({
    queryKey: ["company-information-images", "stats", moduleName],
    queryFn: async () => {
      return await apiFetch<{ totalAssets: number }>(`/asset-library/stats?module=${moduleName}`);
    },
  });

  const assetsQuery = useQuery({
    queryKey: ["company-information-images", "assets", moduleName, selectedFolderId, search, sort, page],
    queryFn: async () => {
      const queryParts = [
        `module=${encodeURIComponent(moduleName)}`,
        `page=${page}`,
        `limit=${limit}`
      ];
      if (selectedFolderId) queryParts.push(`folderId=${encodeURIComponent(selectedFolderId)}`);
      if (search.trim()) queryParts.push(`q=${encodeURIComponent(search.trim())}`);
      if (sort) queryParts.push(`sort=${encodeURIComponent(sort)}`);
      
      return apiFetch<Paginated<Asset>>(`/asset-library/assets?${queryParts.join("&")}`);
    },
    enabled: !foldersQuery.isLoading,
  });

  const brandKitsQuery = useQuery({
    queryKey: ["company-information-images", "brand-kits"],
    queryFn: async () => {
      const res = await apiFetch<{ items: BrandKit[] }>("/asset-library/brand-kits");
      return res.items || [];
    },
  });

  const createFolderMutation = useMutation({
    mutationFn: async () => {
      return apiFetch<{ item: FolderNode }>("/asset-library/folders", {
        method: "POST",
        body: JSON.stringify({
          name: folderNameInput.trim(),
          parentFolderId: selectedFolderId,
          module: moduleName,
        }),
      });
    },
    onSuccess: () => {
      setIsFolderModalOpen(false);
      setFolderNameInput("");
      queryClient.invalidateQueries({ queryKey: ["company-information-images", "folders"] });
    },
  });

  const renameFolderMutation = useMutation({
    mutationFn: async () => {
      return apiFetch<{ item: FolderNode }>(`/asset-library/folders/${encodeURIComponent(selectedFolderId!)}`, {
        method: "PATCH",
        body: JSON.stringify({ name: folderNameInput.trim() }),
      });
    },
    onSuccess: () => {
      setIsFolderModalOpen(false);
      setFolderNameInput("");
      queryClient.invalidateQueries({ queryKey: ["company-information-images", "folders"] });
    },
  });

  const deleteFolderMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiFetch(`/asset-library/folders/${encodeURIComponent(id)}`, { method: "DELETE" });
    },
    onSuccess: () => {
      setSelectedFolderId(null);
      queryClient.invalidateQueries({ queryKey: ["company-information-images"] });
    },
  });

  const uploadAssetsMutation = useMutation({
    mutationFn: async (pickedFile: DocumentPicker.DocumentPickerResult) => {
      if (pickedFile.canceled || !pickedFile.assets) return;
      
      const fileData = pickedFile.assets[0];
      const fd = new FormData();
      if (selectedFolderId) fd.append("folderId", selectedFolderId);
      fd.append("module", moduleName);
      
      fd.append("files", {
        uri: fileData.uri,
        name: fileData.name,
        type: fileData.mimeType || "application/octet-stream",
      } as any);

      return apiFetch("/asset-library/assets/upload", {
        method: "POST",
        body: fd,
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-information-images"] });
      Alert.alert("Success", "Asset uploaded successfully");
    },
    onError: (err: any) => {
      Alert.alert("Upload Failed", err?.message || "Something went wrong.");
    }
  });

  const createBrandKitMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiFetch("/asset-library/brand-kits", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      setIsBrandKitModalOpen(false);
      setBrandKitName("");
      setBrandKitDescription("");
      setBrandKitColors("");
      setBrandKitGuidelines("");
      queryClient.invalidateQueries({ queryKey: ["company-information-images", "brand-kits"] });
    },
  });

  const allFolders = useMemo(() => flattenFolders(foldersQuery.data ?? []), [foldersQuery.data]);
  const selectedFolder = useMemo(
    () => (selectedFolderId ? allFolders.find((f) => f.id === selectedFolderId) ?? null : null),
    [allFolders, selectedFolderId]
  );

  const handlePickAndUpload = async () => {
    if (selectedFolder?.isReadOnly) {
      Alert.alert("Read Only", "This folder cannot be modified.");
      return;
    }
    const result = await DocumentPicker.getDocumentAsync({
      type: ["image/*", "application/pdf"],
      copyToCacheDirectory: true
    });
    uploadAssetsMutation.mutate(result);
  };

  const handleDownloadAsset = async (asset: Asset) => {
    try {
      const res = await apiFetch<{ url: string; fileName: string }>(
        `/asset-library/assets/${encodeURIComponent(asset.id)}/download`,
        { method: "POST" }
      );
      const safeUrl = toProxiedUrl(res.url) || res.url;
      const fileSystemModule = FileSystem as any;
      const baseDir = fileSystemModule.documentDirectory || "";
      const fileUri = `${baseDir}${res.fileName || "downloaded_asset"}`;
      
      Alert.alert("Downloading", "Saving asset to device cache...");
      const downloadRes = await FileSystem.downloadAsync(safeUrl, fileUri);
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(downloadRes.uri);
      } else {
        Alert.alert("Success", `File downloaded to temporary cache: ${downloadRes.uri}`);
      }
    } catch (err) {
      Alert.alert("Download Error", "Could not complete image/file download.");
    }
  };

  const renderFolderNode = (node: FolderNode, depth = 0) => {
    const isActive = selectedFolderId === node.id;
    const hasChildren = Boolean(node.children?.length);
    const isExpanded = expandedFolderIds[node.id] ?? true;

    return (
      <View key={node.id} style={{ paddingLeft: depth * 12 }}>
        <TouchableOpacity
          style={[styles.folderItem, isActive ? styles.folderItemActive : null]}
          onPress={() => setSelectedFolderId(node.id)}
        >
          {hasChildren ? (
            <TouchableOpacity
              onPress={() => setExpandedFolderIds(p => ({ ...p, [node.id]: !isExpanded }))}
              style={styles.chevronTouchable}
            >
              <ChevronRight size={16} color={colors.mutedText} style={{ transform: [{ rotate: isExpanded ? "90deg" : "0deg" }] }} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 16 }} />
          )}
          {isActive ? <FolderOpen size={18} color={colors.primary} /> : <Folder size={18} color={colors.mutedText} />}
          <Text style={[styles.folderText, isActive ? styles.folderTextActive : null]} numberOfLines={1}>
            {node.name}
          </Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{node.assetCount || 0}</Text>
          </View>
        </TouchableOpacity>
        {hasChildren && isExpanded && node.children!.map((c) => renderFolderNode(c, depth + 1))}
      </View>
    );
  };

  const assets = assetsQuery.data?.items || [];

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>{title}</Text>
        <Text style={styles.headerSub}>{description}</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === "assets" ? styles.tabActive : null]}
          onPress={() => setActiveTab("assets")}
        >
          <Text style={[styles.tabText, activeTab === "assets" ? styles.tabTextActive : null]}>Assets</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === "brand-kits" ? styles.tabActive : null]}
          onPress={() => setActiveTab("brand-kits")}
        >
          <Text style={[styles.tabText, activeTab === "brand-kits" ? styles.tabTextActive : null]}>Brand Kits</Text>
        </TouchableOpacity>
      </View>

      {activeTab === "assets" ? (
        <View style={{ flex: 1 }}>
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => {
                setFolderModalMode("create");
                setFolderNameInput("");
                setIsFolderModalOpen(true);
              }}
            >
              <Plus size={16} color={colors.text} />
              <Text style={styles.actionBtnText}>Folder</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionBtn, styles.primaryBtn]} onPress={handlePickAndUpload}>
              {uploadAssetsMutation.isPending ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Upload size={16} color="#FFF" />
                  <Text style={[styles.actionBtnText, { color: "#FFF" }]}>Upload</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {selectedFolder && (
            <View style={styles.contextHeader}>
              <Text style={styles.contextText} numberOfLines={1}>Active: {selectedFolder.name}</Text>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <TouchableOpacity onPress={() => {
                  setFolderModalMode("rename");
                  setFolderNameInput(selectedFolder.name);
                  setIsFolderModalOpen(true);
                }}><Pencil size={16} color={colors.text} /></TouchableOpacity>
                <TouchableOpacity onPress={() => {
                  Alert.alert("Delete Folder", "Are you sure you want to delete this folder?", [
                    { text: "Cancel", style: "cancel" },
                    { text: "Delete", style: "destructive", onPress: () => deleteFolderMutation.mutate(selectedFolderId!) }
                  ]);
                }}><Trash2 size={16} color={colors.destructive} /></TouchableOpacity>
              </View>
            </View>
          )}

          <View style={styles.treeSection}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.treeScroll}>
              <TouchableOpacity
                style={[styles.folderItem, !selectedFolderId ? styles.folderItemActive : null, { marginRight: 8 }]}
                onPress={() => setSelectedFolderId(null)}
              >
                <Folder size={18} color={!selectedFolderId ? colors.primary : colors.mutedText} />
                <Text style={[styles.folderText, !selectedFolderId ? styles.folderTextActive : null]}>
                  All Assets ({globalStatsQuery.data?.totalAssets || 0})
                </Text>
              </TouchableOpacity>
              {(foldersQuery.data || []).map((node) => renderFolderNode(node, 0))}
            </ScrollView>
          </View>

          <View style={styles.searchBarContainer}>
            <Search size={16} color={colors.mutedText} style={{ marginRight: 6 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search assets..."
              placeholderTextColor={colors.mutedText}
              value={search}
              onChangeText={(txt) => { setPage(1); setSearch(txt); }}
            />
          </View>

          {assetsQuery.isLoading ? (
            <ActivityIndicator size="large" style={{ marginTop: 24 }} color={colors.primary} />
          ) : (
            <FlatList
              data={assets}
              keyExtractor={(item) => item.id}
              numColumns={2}
              columnWrapperStyle={{ justifyContent: "space-between", paddingHorizontal: 12 }}
              renderItem={({ item }) => {
                const url = item.urlThumbnail || item.attachment?.url || "";
                const isImage = (item.mimeType || item.attachment?.mimeType || "").startsWith("image/");
                return (
                  <TouchableOpacity style={styles.assetCard} onPress={() => setPreview(item)}>
                    <View style={styles.assetPreviewWrapper}>
                      {isImage && url ? (
                        <Image source={{ uri: toProxiedUrl(url) || url }} style={styles.assetImage} />
                      ) : (
                        <FileText size={40} color={colors.mutedText} />
                      )}
                    </View>
                    <View style={styles.assetCardMeta}>
                      <Text style={styles.assetCardTitle} numberOfLines={1}>
                        {item.title || item.originalFilename || "Asset"}
                      </Text>
                      <Text style={styles.assetCardSize}>{formatBytes(item.sizeBytes || item.attachment?.size)}</Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={<Text style={styles.emptyText}>No assets found in this group.</Text>}
            />
          )}
        </View>
      ) : (
        <ScrollView style={{ flex: 1, paddingHorizontal: 12 }}>
          <TouchableOpacity style={[styles.actionBtn, { marginVertical: 12 }]} onPress={() => setIsBrandKitModalOpen(true)}>
            <Plus size={16} color={colors.text} />
            <Text style={styles.actionBtnText}>Create Brand Kit</Text>
          </TouchableOpacity>

          {brandKitsQuery.data?.map((kit) => (
            <View key={kit.id} style={styles.brandCard}>
              <Text style={styles.brandTitle}>{kit.name}</Text>
              {kit.description ? <Text style={styles.brandDesc}>{kit.description}</Text> : null}
              <View style={styles.colorPaletteRow}>
                {kit.colors?.map((col, idx) => (
                  <View key={idx} style={[styles.colorBubble, { backgroundColor: col }]} />
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <Modal visible={isFolderModalOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalHeader}>{folderModalMode === "create" ? "Create Folder" : "Rename Folder"}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Folder Name"
              placeholderTextColor={colors.mutedText}
              value={folderNameInput}
              onChangeText={setFolderNameInput}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setIsFolderModalOpen(false)}>
                <Text style={{ color: colors.text }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmit, { backgroundColor: colors.primary }]}
                onPress={() => folderModalMode === "create" ? createFolderMutation.mutate() : renameFolderMutation.mutate()}
              >
                <Text style={{ color: "#FFF", fontWeight: "600" }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={Boolean(preview)} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { width: SCREEN_WIDTH * 0.9, maxHeight: SCREEN_HEIGHT * 0.8 }]}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle} numberOfLines={1}>{preview?.originalFilename || "Asset View"}</Text>
              <TouchableOpacity onPress={() => setPreview(null)}><X size={20} color={colors.text} /></TouchableOpacity>
            </View>

            {preview && (
              <ScrollView contentContainerStyle={{ paddingBottom: 16 }}>
                <View style={styles.previewVisualContainer}>
                  {(preview.mimeType || preview.attachment?.mimeType || "").startsWith("image/") ? (
                    <Image
                      source={{ uri: toProxiedUrl(preview.urlPreview || preview.attachment?.url || "") }}
                      style={styles.previewImageElement}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={styles.fallbackIconFrame}>
                      <File size={64} color={colors.mutedText} />
                      <Text style={{ marginTop: 8, color: colors.mutedText }}>Document Preview Limited</Text>
                    </View>
                  )}
                </View>

                <View style={styles.previewActionToolbar}>
                  <TouchableOpacity style={styles.toolbarBtn} onPress={() => handleDownloadAsset(preview)}>
                    <Download size={16} color={colors.mutedText} />
                    <Text style={styles.toolbarBtnText}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.toolbarBtn} onPress={() => Alert.alert("Link Copied", preview.attachment?.url)}>
                    <LinkIcon size={16} color={colors.mutedText} />
                    <Text style={styles.toolbarBtnText}>Copy URL</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.metaMetadataBlock}>
                  <Text style={styles.metaHeaderLabel}>Details</Text>
                  <Text style={styles.metaRowText}><Text style={{ fontWeight: "600", color: colors.mutedText }}>Type:</Text> {preview.mimeType || "Unknown"}</Text>
                  <Text style={styles.metaRowText}><Text style={{ fontWeight: "600", color: colors.mutedText }}>Size:</Text> {formatBytes(preview.sizeBytes || preview.attachment?.size)}</Text>
                  {preview.tags?.length ? (
                    <Text style={styles.metaRowText}><Text style={{ fontWeight: "600", color: colors.mutedText }}>Tags:</Text> {preview.tags.join(", ")}</Text>
                  ) : null}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={isBrandKitModalOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalHeader}>Create Brand Kit</Text>
            <TextInput style={styles.modalInput} placeholder="Kit Name" placeholderTextColor={colors.mutedText} value={brandKitName} onChangeText={setBrandKitName} />
            <TextInput style={styles.modalInput} placeholder="Description" placeholderTextColor={colors.mutedText} value={brandKitDescription} onChangeText={setBrandKitDescription} />
            <TextInput style={styles.modalInput} placeholder="Colors (Hex codes comma separated)" placeholderTextColor={colors.mutedText} value={brandKitColors} onChangeText={setBrandKitColors} />
            <TextInput style={[styles.modalInput, { height: 60, textAlignVertical: "top" }]} multiline placeholder="Usage Guidelines" placeholderTextColor={colors.mutedText} value={brandKitGuidelines} onChangeText={setBrandKitGuidelines} />
            
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setIsBrandKitModalOpen(false)}>
                <Text style={{ color: colors.text }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmit, { backgroundColor: colors.primary }]}
                onPress={() => {
                  const processedColors = brandKitColors.split(",").map(c => c.trim()).filter(c => c.startsWith("#"));
                  createBrandKitMutation.mutate({ name: brandKitName, description: brandKitDescription, colors: processedColors, guidelines: brandKitGuidelines });
                }}
              >
                <Text style={{ color: "#FFF", fontWeight: "600" }}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function createStyles(colors: any, isDark: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingTop: 16,
    },
    headerContainer: {
      paddingHorizontal: 16,
      marginBottom: 12,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: "700",
      color: colors.text,
    },
    headerSub: {
      fontSize: 13,
      color: colors.mutedText,
      marginTop: 2,
    },
    tabContainer: {
      flexDirection: "row",
      backgroundColor: colors.tabTrack,
      borderRadius: 8,
      marginHorizontal: 16,
      padding: 3,
      marginBottom: 14,
    },
    tabButton: {
      flex: 1,
      paddingVertical: 8,
      alignItems: "center",
      borderRadius: 6,
    },
    tabActive: {
      backgroundColor: colors.tabActive,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 1,
      elevation: 2,
    },
    tabText: {
      fontSize: 14,
      fontWeight: "500",
      color: colors.mutedText,
    },
    tabTextActive: {
      color: colors.mutedText,
      fontWeight: "600",
    },
    actionRow: {
      flexDirection: "row",
      paddingHorizontal: 16,
      gap: 10,
      marginBottom: 12,
    },
    actionBtn: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 6,
      gap: 6,
    },
    primaryBtn: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    actionBtnText: {
      fontSize: 14,
      fontWeight: "500",
      color: colors.text,
    },
    contextHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: colors.contextBg,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.contextBorder,
    },
    contextText: {
      fontSize: 12,
      color: colors.contextText,
      fontWeight: "500",
      flex: 1,
    },
    treeSection: {
      maxHeight: 46,
      marginBottom: 8,
    },
    treeScroll: {
      paddingHorizontal: 16,
      flexDirection: "row",
    },
    folderItem: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.folderBg,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 6,
      gap: 6,
      
    },
    folderItemActive: {
      backgroundColor: colors.folderActiveBg,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    folderText: {
      fontSize: 13,
      color: colors.mutedText,
    },
    folderTextActive: {
      color: colors.primary,
      fontWeight: "600",
    },
    chevronTouchable: {
      padding: 2,
    },
    badge: {
      backgroundColor: isDark ? "#334155" : "#e5e7eb",
      borderRadius: 10,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    badgeText: {
      fontSize: 10,
      color: colors.mutedText,
      fontWeight: "600",
    },
    searchBarContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      marginHorizontal: 16,
      paddingHorizontal: 10,
      height: 40,
      marginBottom: 12,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      color: colors.text,
    },
    assetCard: {
      width: "48%",
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      marginBottom: 12,
      overflow: "hidden",
    },
    assetPreviewWrapper: {
      height: 120,
      backgroundColor: isDark ? "#0f172a" : "#f3f4f6",
      justifyContent: "center",
      alignItems: "center",
    },
    assetImage: {
      width: "100%",
      height: "100%",
      resizeMode: "cover",
    },
    assetCardMeta: {
      padding: 8,
    },
    assetCardTitle: {
      fontSize: 12,
      fontWeight: "500",
      color: colors.text,
    },
    assetCardSize: {
      fontSize: 11,
      color: colors.mutedText,
      marginTop: 2,
    },
    emptyText: {
      textAlign: "center",
      color: colors.mutedText,
      marginTop: 32,
      fontSize: 14,
    },
    brandCard: {
      backgroundColor: colors.cardBg,
      padding: 14,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 10,
    },
    brandTitle: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.text,
    },
    brandDesc: {
      fontSize: 12,
      color: colors.mutedText,
      marginTop: 4,
    },
    colorPaletteRow: {
      flexDirection: "row",
      gap: 6,
      marginTop: 10,
    },
    colorBubble: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    modalCard: {
      width: "85%",
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 20,
      shadowColor: "#000",
      shadowOpacity: 0.15,
      shadowRadius: 10,
      elevation: 5,
    },
    modalHeader: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 14,
    },
    modalInput: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.inputBg,
      borderRadius: 6,
      paddingHorizontal: 10,
      height: 40,
      fontSize: 14,
      marginBottom: 14,
      color: colors.mutedText,
    },
    modalActions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 12,
    },
    modalCancel: {
      paddingVertical: 8,
      paddingHorizontal: 14,
    },
    modalSubmit: {
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 6,
    },
    previewHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingBottom: 10,
      marginBottom: 12,
    },
    previewTitle: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.text,
      flex: 1,
      marginRight: 8,
    },
    previewVisualContainer: {
      width: "100%",
      height: 220,
      backgroundColor: isDark ? "#0f172a" : "#f3f4f6",
      borderRadius: 8,
      justifyContent: "center",
      alignItems: "center",
      overflow: "hidden",
    },
    previewImageElement: {
      width: "100%",
      height: "100%",
    },
    fallbackIconFrame: {
      alignItems: "center",
    },
    previewActionToolbar: {
      flexDirection: "row",
      gap: 10,
      marginVertical: 14,
    },
    toolbarBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 6,
      backgroundColor: colors.folderBg,
    },
    toolbarBtnText: {
      fontSize: 13,
      color: colors.mutedText,
      fontWeight: "500",
    },
    metaMetadataBlock: {
      backgroundColor: colors.folderBg,
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    metaHeaderLabel: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.mutedText,
      marginBottom: 6,
    },
    metaRowText: {
      fontSize: 12,
      color: colors.mutedText,
      marginBottom: 4,
    },
  });
}