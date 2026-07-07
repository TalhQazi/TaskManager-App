import React, { useEffect, useState, useMemo } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  SafeAreaView,
  Dimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Search,
  Image as ImageIcon,
  Check,
  FolderOpen,
  X,
  ChevronLeft,
  ChevronRight
} from "lucide-react-native";
import { apiFetch } from "@/lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";

type AssetItem = {
  id: string;
  _id?: string;
  originalFilename: string;
  mimeType: string;
  urlOriginal: string;
  sizeBytes?: number;
  attachment?: { url: string; fileName: string };
  proxiedUrl?: string;
};

type FolderItem = {
  id: string;
  name: string;
  assetCount?: number;
  children?: FolderItem[];
};

interface AssetLibraryPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (url: string, fileName: string) => void;
  imagesOnly?: boolean;
  moduleName?: "asset-library" | "company-information";
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const COLUMN_WIDTH = (SCREEN_WIDTH - 44) / 3;

export default function AssetLibraryPicker({
  open,
  onOpenChange,
  onSelect,
  imagesOnly = true,
  moduleName = "asset-library",
}: AssetLibraryPickerProps) {
  const { uiTheme } = useTheme();
 const isDark = useMemo(
     () => ["dark-minimal", "neon-tech", "metallic-elite", "executive-black", "high-contrast", "energy-mode"].includes(uiTheme.theme),
     [uiTheme.theme]
   );
  const colors = useMemo(() => ({
    background: uiTheme?.panelColors?.dashboardBackground || (isDark ? "#0F172A" : "#F8FAFC"),
    cardBg: uiTheme?.panelColors?.dashboardCardBackground || (isDark ? "#1E293B" : "#FFFFFF"),
    text: uiTheme?.panelColors?.dashboardTextColor || (isDark ? "#FFFFFF" : "#0F172A"),
    muted: isDark ? "#94A3B8" : "#64748B",
    border: isDark ? "#334155" : "#E2E8F0",
    primary: uiTheme?.customColors?.primary || "#133767",
    surface: isDark ? "#334155" : "#F1F5F9",
    inputBg: isDark ? "#0F172A" : "#FFFFFF",
    white: "#FFFFFF"
  }), [uiTheme, isDark]);

  const styles = useMemo(() => createStyles(colors), [colors]);

  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>("");
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedAssetUrl, setSelectedAssetUrl] = useState<string>("");
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 60;

  const flatFolders = useMemo(() => {
    const result: { id: string; name: string; depth: number }[] = [];
    const walk = (items: FolderItem[], depth: number) => {
      for (const f of items) {
        result.push({ id: f.id, name: f.name, depth });
        if (f.children?.length) walk(f.children, depth + 1);
      }
    };
    walk(folders, 0);
    return result;
  }, [folders]);

  useEffect(() => {
    if (!open) return;
    const fetchFolders = async () => {
      try {
        const res = await apiFetch<{ items: FolderItem[] }>(`/api/asset-library/folders?module=${moduleName}`);
        setFolders(res.items || []);
      } catch {
        // ignore
      }
    };
    void fetchFolders();
  }, [open, moduleName]);

  useEffect(() => {
    setPage(1);
  }, [selectedFolderId, search]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);

    const params = new URLSearchParams();
    params.set("module", moduleName);
    if (selectedFolderId) params.set("folderId", selectedFolderId);
    if (imagesOnly) params.set("type", "image");
    if (search.trim()) params.set("q", search.trim());
    params.set("sort", "az");
    params.set("limit", itemsPerPage.toString());
    params.set("page", page.toString());

    const fetchAssets = async () => {
      try {
        const res = await apiFetch<{ items: AssetItem[]; total: number; totalPages: number }>(
          `/api/asset-library/assets?${params.toString()}`
        );
        
        if (!cancelled) {
          const itemsWithProxies = await Promise.all(
            (res.items || []).map(async (asset) => {
              const baseTargetUrl = asset.urlOriginal || asset.attachment?.url || "";
              const proxiedUrl = await toProxiedUrlAsync(baseTargetUrl);
              return { ...asset, proxiedUrl };
            })
          );

          setAssets(itemsWithProxies);
          setTotalItems(res.total || 0);
          setTotalPages(res.totalPages || 1);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void fetchAssets();

    return () => {
      cancelled = true;
    };
  }, [open, selectedFolderId, search, imagesOnly, page, moduleName]);

  const handleSelect = () => {
    if (!selectedAssetUrl) return;
    const asset = assets.find((a) => (a.urlOriginal || a.attachment?.url || "") === selectedAssetUrl);
    onSelect(selectedAssetUrl, asset?.originalFilename || asset?.attachment?.fileName || "image");
    handleClose();
  };

  const handleClose = () => {
    onOpenChange(false);
    setSelectedAssetUrl("");
    setSearch("");
  };

  const renderAssetCard = ({ item }: { item: AssetItem }) => {
    const rawUrl = item.urlOriginal || item.attachment?.url || "";
    const isSelected = selectedAssetUrl === rawUrl;

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setSelectedAssetUrl(rawUrl)}
        style={[
          styles.assetGridItem,
          isSelected ? { borderColor: colors.primary } : styles.assetItemFieldUnselected,
        ]}
      >
        {item.proxiedUrl ? (
          <Image source={{ uri: item.proxiedUrl }} style={styles.gridImage} resizeMode="cover" />
        ) : (
          <View style={[styles.gridImage, styles.imageCenterPlaceholder, { backgroundColor: colors.surface }]}>
            <ImageIcon size={20} color={colors.muted} />
          </View>
        )}
        {isSelected && (
          <View style={styles.selectedGridOverlay}>
            <Check size={24} color="#fff" style={styles.checkDropShadow} />
          </View>
        )}
        <View style={styles.assetNameLabelContainer}>
          <Text numberOfLines={1} style={styles.assetMiniLabel}>
            {item.originalFilename || "image"}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={open} animationType="slide" transparent={false} onRequestClose={handleClose}>
      <SafeAreaView style={[styles.modalSafeContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeaderLayout, { borderColor: colors.border }]}>
          <View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <ImageIcon size={18} color={colors.text} />
              <Text style={[styles.modalTitleText, { color: colors.text }]}>
                Pick from {moduleName === "asset-library" ? "Images" : "Company Info"}
              </Text>
            </View>
            <Text style={[styles.modalSubtitleText, { color: colors.muted }]}>Select an image resource asset below</Text>
          </View>
          <TouchableOpacity style={[styles.closeHeaderButton, { backgroundColor: colors.surface }]} onPress={handleClose}>
            <X size={20} color={colors.muted} />
          </TouchableOpacity>
        </View>

        <View style={[styles.folderRowContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
            <TouchableOpacity
              onPress={() => setSelectedFolderId("")}
              style={[styles.folderChip, !selectedFolderId ? { backgroundColor: `${colors.primary}1A`, borderColor: colors.primary } : { backgroundColor: colors.cardBg, borderColor: colors.border }]}
            >
              <FolderOpen size={14} color={!selectedFolderId ? colors.primary : colors.muted} />
              <Text style={[styles.folderChipText, { color: !selectedFolderId ? colors.primary : colors.muted }, !selectedFolderId && styles.folderChipTextActive]}>All Files</Text>
            </TouchableOpacity>

            {flatFolders.map((f) => {
              const isFolderSelected = selectedFolderId === f.id;
              return (
                <TouchableOpacity
                  key={f.id}
                  onPress={() => setSelectedFolderId(f.id)}
                  style={[
                    styles.folderChip,
                    isFolderSelected ? { backgroundColor: `${colors.primary}1A`, borderColor: colors.primary } : { backgroundColor: colors.cardBg, borderColor: colors.border },
                    { marginLeft: f.depth * 4 }
                  ]}
                >
                  <FolderOpen size={13} color={isFolderSelected ? colors.primary : colors.muted} />
                  <Text style={[styles.folderChipText, { color: isFolderSelected ? colors.primary : colors.muted }, isFolderSelected && styles.folderChipTextActive]}>
                    {f.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.mainWrapper}>
          <View style={styles.searchBarContainer}>
            <Search size={16} color={colors.muted} style={styles.searchIconFrame} />
            <TextInput
              placeholder="Search images..."
              placeholderTextColor={colors.muted}
              value={search}
              onChangeText={setSearch}
              style={[styles.searchInputBox, { borderColor: colors.border, color: colors.text, backgroundColor: colors.cardBg }]}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {loading ? (
            <View style={styles.fallbackCenteringView}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : assets.length === 0 ? (
            <View style={styles.fallbackCenteringView}>
              <Text style={[styles.emptyResultsText, { color: colors.muted }]}>No images found</Text>
            </View>
          ) : (
            <FlatList
              data={assets}
              renderItem={renderAssetCard}
              keyExtractor={(item) => item.id || item._id || Math.random().toString()}
              numColumns={3}
              contentContainerStyle={styles.gridContentLayout}
              columnWrapperStyle={{ gap: 6 }}
            />
          )}
        </View>

        {totalPages > 1 && (
          <View style={[styles.paginationRowStrip, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Text style={[styles.paginationStateMetrics, { color: colors.muted }]}>
              Showing {Math.min((page - 1) * itemsPerPage + 1, totalItems)} - {Math.min(page * itemsPerPage, totalItems)} of {totalItems}
            </Text>
            <View style={styles.paginationControllerGroup}>
              <TouchableOpacity
                disabled={page === 1 || loading}
                onPress={() => setPage((p) => Math.max(1, p - 1))}
                style={[styles.pageIndicatorArrowBtn, { borderColor: colors.border, backgroundColor: colors.cardBg }, page === 1 && { opacity: 0.4 }]}
              >
                <ChevronLeft size={16} color={colors.text} />
              </TouchableOpacity>
              
              <Text style={[styles.pageStepText, { color: colors.text }]}>
                {page} <Text style={{ color: colors.muted }}>/</Text> {totalPages}
              </Text>

              <TouchableOpacity
                disabled={page === totalPages || loading}
                onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                style={[styles.pageIndicatorArrowBtn, { borderColor: colors.border, backgroundColor: colors.cardBg }, page === totalPages && { opacity: 0.4 }]}
              >
                <ChevronRight size={16} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={[styles.modalActionFooterPanel, { borderColor: colors.border, backgroundColor: colors.cardBg }]}>
          <TouchableOpacity style={[styles.dialogSecondaryBtn, { borderColor: colors.border }]} onPress={handleClose}>
            <Text style={[styles.dialogSecondaryBtnTxt, { color: colors.text }]}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.dialogPrimaryBtn, { backgroundColor: colors.primary }, !selectedAssetUrl && { backgroundColor: colors.muted }]}
            disabled={!selectedAssetUrl}
            onPress={handleSelect}
          >
            <Check size={16} color="#ffffff" style={{ marginRight: 4 }} />
            <Text style={styles.dialogPrimaryBtnTxt}>Use Image</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

async function toProxiedUrlAsync(url: string): Promise<string> {
  if (!url || url.startsWith("data:")) return url;
  if (url.includes("/api/s3-proxy/")) return url;

  const s3Match = url.match(/https:\/\/[^/]+\.s3\.[^/]+\.amazonaws\.com\/(.+)/);
  if (!s3Match) return url;

  const s3Key = s3Match[1];
  const baseUrl = (process.env.EXPO_PUBLIC_API_URL || "https://task.se7eninc.com").replace(/\/$/, "");

  let token = "";
  try {
    const adminAuth = await AsyncStorage.getItem("taskflow_auth");
    if (adminAuth) {
      const parsed = JSON.parse(adminAuth);
      token = parsed.token || "";
    }
    if (!token) {
      const empAuth = await AsyncStorage.getItem("employee_auth");
      if (empAuth) {
        const parsed = JSON.parse(empAuth);
        token = parsed.token || "";
      }
    }
  } catch {
    // fallback
  }

  return `${baseUrl}/api/s3-proxy/${s3Key}${token ? `?token=${token}` : ""}`;
}

function createStyles(colors: any) {
  return StyleSheet.create({
    modalSafeContainer: {
      flex: 1,
    },
    modalHeaderLayout: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
    },
    modalTitleText: {
      fontSize: 16,
      fontWeight: "600",
    },
    modalSubtitleText: {
      fontSize: 12,
      marginTop: 2,
    },
    closeHeaderButton: {
      padding: 6,
      borderRadius: 20,
    },
    folderRowContainer: {
      paddingVertical: 10,
      borderBottomWidth: 1,
    },
    folderChip: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      borderWidth: 1,
      gap: 4,
    },
    folderChipText: {
      fontSize: 12,
      fontWeight: "500",
    },
    folderChipTextActive: {
      fontWeight: "600",
    },
    mainWrapper: {
      flex: 1,
      padding: 16,
    },
    searchBarContainer: {
      position: "relative",
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 12,
    },
    searchIconFrame: {
      position: "absolute",
      left: 10,
      zIndex: 2,
    },
    searchInputBox: {
      flex: 1,
      height: 38,
      borderWidth: 1,
      borderRadius: 6,
      paddingLeft: 34,
      paddingRight: 12,
      fontSize: 14,
    },
    fallbackCenteringView: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 40,
    },
    emptyResultsText: {
      fontSize: 14,
    },
    gridContentLayout: {
      gap: 6,
      paddingBottom: 20,
    },
    assetGridItem: {
      width: COLUMN_WIDTH,
      height: COLUMN_WIDTH,
      borderRadius: 6,
      borderWidth: 2,
      overflow: "hidden",
      position: "relative",
    },
    assetItemFieldUnselected: {
      borderColor: "transparent",
    },
    gridImage: {
      width: "100%",
      height: "100%",
    },
    imageCenterPlaceholder: {
      alignItems: "center",
      justifyContent: "center",
    },
    selectedGridOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(19, 55, 103, 0.25)",
      alignItems: "center",
      justifyContent: "center",
    },
    checkDropShadow: {
      textShadowColor: "rgba(0, 0, 0, 0.4)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 3,
    },
    assetNameLabelContainer: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: "rgba(0,0,0,0.6)",
      paddingVertical: 2,
      paddingHorizontal: 4,
    },
    assetMiniLabel: {
      color: "#ffffff",
      fontSize: 9,
      textAlign: "center",
    },
    paginationRowStrip: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderTopWidth: 1,
      borderBottomWidth: 1,
    },
    paginationStateMetrics: {
      fontSize: 11,
      fontWeight: "500",
    },
    paginationControllerGroup: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    pageIndicatorArrowBtn: {
      borderWidth: 1,
      padding: 4,
      borderRadius: 4,
    },
    pageStepText: {
      fontSize: 11,
      fontWeight: "600",
      paddingHorizontal: 4,
    },
    modalActionFooterPanel: {
      flexDirection: "row",
      justifyContent: "flex-end",
      padding: 16,
      borderTopWidth: 1,
      gap: 10,
    },
    dialogSecondaryBtn: {
      borderWidth: 1,
      borderRadius: 6,
      paddingHorizontal: 14,
      paddingVertical: 8,
      justifyContent: "center",
    },
    dialogSecondaryBtnTxt: {
      fontSize: 13,
      fontWeight: "500",
    },
    dialogPrimaryBtn: {
      borderRadius: 6,
      paddingHorizontal: 14,
      paddingVertical: 8,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },
    dialogPrimaryBtnTxt: {
      fontSize: 13,
      fontWeight: "600",
      color: "#ffffff",
    },
  });
}