import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Dimensions,
  ActivityIndicator,
  Alert,
  Platform,
  Image,
  KeyboardAvoidingView,
  SafeAreaView,
  FlatList
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as Clipboard from "expo-clipboard";
import { apiRequest } from "@/services/api";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Folder,
  ChevronRight,
  Search,
  Trash2,
  Upload,
  Link as LinkIcon,
  FileText,
  History,
  File,
  X,
  Edit2,
  Check,
  FolderPlus,
  Move
} from "lucide-react-native";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface FolderNode {
  id: string;
  name: string;
  parentFolderId?: string | null;
  isArchived?: boolean;
  isReadOnly?: boolean;
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
  currentVersionNumber?: number;
  urlThumbnail?: string;
  urlPreview?: string;
  attachment?: { fileName?: string; url?: string; mimeType?: string; size?: number };
}

interface AssetLibraryProps {
  moduleName?: string;
  title?: string;
  description?: string;
  hideHeaderCarousel?: boolean;
}


interface FoldersResponse {
  items?: FolderNode[];
  data?: {
    items?: FolderNode[];
  };
}



function formatBytes(bytes: number | undefined) {
  const b = Number(bytes || 0);
  if (!b) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(b) / Math.log(1024)), units.length - 1);
  return `${(b / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export default function AssetLibrary({
  moduleName = "asset-library",
  title = "Images",
  description = "Upload, organize, preview, and download assets.",
  hideHeaderCarousel = false
}: AssetLibraryProps) {
  const queryClient = useQueryClient();
  const { uiTheme } = useTheme();

  const colors = useMemo(() => ({
    background: uiTheme.panelColors.dashboardBackground,
    cardBg: uiTheme.panelColors.dashboardCardBackground,
    text: uiTheme.panelColors.dashboardTextColor,
    primary: uiTheme.customColors.primary,
  }), [uiTheme]);

  const styles = useMemo(() => createStyles(colors), [colors]);

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"" | "image" | "pdf">("");
  const [sort, setSort] = useState("az");
  const [page, setPage] = useState(1);
  const limit = 25;

  const [createFolderVisible, setCreateFolderVisible] = useState(false);
  const [renameFolderVisible, setRenameFolderVisible] = useState(false);
  const [moveAssetVisible, setMoveAssetVisible] = useState(false);
  const [editAssetVisible, setEditAssetVisible] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [bulkTagVisible, setBulkTagVisible] = useState(false);

  const [newFolderName, setNewFolderName] = useState("");
  const [editFolderName, setEditFolderName] = useState("");
  const [targetAssetToMove, setTargetAssetToMove] = useState<Asset | null>(null);
  const [bulkTags, setBulkTags] = useState("");
  const [previewAsset, setPreviewAsset] = useState<Asset | null>(null);
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());

  const [assetForm, setAssetForm] = useState({ title: "", description: "", tags: "" });

  const foldersQuery = useQuery({
    queryKey: ["folders", moduleName],
    queryFn: async () => {
      const res = await apiRequest<any>(`/asset-library/folders?module=${moduleName}`);
      return res?.items || res?.data?.items || [];
    }
  });

  const flatFoldersList = useMemo(() => {
    const out: FolderNode[] = [];
    function flatten(nodes: FolderNode[]) {
      for (const n of nodes) {
        out.push(n);
        if (n.children) flatten(n.children);
      }
    }
    flatten(foldersQuery.data || []);
    return out;
  }, [foldersQuery.data]);

  const currentFolder = useMemo(() => 
    flatFoldersList.find(f => f.id === currentFolderId) || null, 
    [flatFoldersList, currentFolderId]
  );

  const currentSubFolders = useMemo(() => {
    if (!currentFolderId) {
      return (foldersQuery.data || []).filter((f: FolderNode) => !f.parentFolderId);
    }
    return currentFolder?.children || [];
  }, [foldersQuery.data, currentFolderId, currentFolder]);

  const breadcrumbTrail = useMemo(() => {
    const trail: FolderNode[] = [];
    let current = currentFolder;
    while (current) {
      trail.unshift(current);
      const parentId = current.parentFolderId;
      current = parentId ? flatFoldersList.find(f => f.id === parentId) || null : null;
    }
    return trail;
  }, [currentFolder, flatFoldersList]);

  const assetsQuery = useQuery({
    queryKey: ["assets", moduleName, currentFolderId, search, typeFilter, sort, page],
    queryFn: async () => {
      const qs = `?module=${moduleName}&folderId=${currentFolderId || ""}&q=${search}&type=${typeFilter}&sort=${sort}&page=${page}&limit=${limit}`;
      const res = await apiRequest<any>(`/asset-library/assets${qs}`);
      return res || { items: [], totalPages: 1, total: 0 };
    }
  });

  const versionsQuery = useQuery({
    queryKey: ["asset-versions", previewAsset?.id],
    queryFn: async () => {
      if (!previewAsset?.id) return [];
      const res = await apiRequest<any>(`/asset-library/assets/${previewAsset.id}/versions`);
      return res?.items || [];
    },
    enabled: historyVisible && !!previewAsset?.id
  });

  const createFolderMutation = useMutation({
    mutationFn: (name: string) => apiRequest("/asset-library/folders", {
      method: "POST",
      body: JSON.stringify({ name, parentFolderId: currentFolderId, module: moduleName })
    }),
    onSuccess: () => {
      setCreateFolderVisible(false);
      setNewFolderName("");
      queryClient.invalidateQueries({ queryKey: ["folders", moduleName] });
    }
  });

  const renameFolderMutation = useMutation({
    mutationFn: (name: string) => apiRequest(`/asset-library/folders/${currentFolderId}`, {
      method: "PATCH",
      body: JSON.stringify({ name })
    }),
    onSuccess: () => {
      setRenameFolderVisible(false);
      queryClient.invalidateQueries({ queryKey: ["folders", moduleName] });
    }
  });

  const deleteFolderMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/asset-library/folders/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      setCurrentFolderId(null);
      queryClient.invalidateQueries({ queryKey: ["folders", moduleName] });
    }
  });

  const uploadAssetMutation = useMutation({
    mutationFn: async (fileUri: string) => {
      const formData = new FormData();
      if (currentFolderId) formData.append("folderId", currentFolderId);
      formData.append("module", moduleName);
      
      const filename = fileUri.split("/").pop() || "upload.jpg";
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;
      
      formData.append("files", {
        uri: fileUri,
        name: filename,
        type,
      } as unknown as Blob);

      return apiRequest("/asset-library/assets/upload", {
        method: "POST",
        body: formData,
        headers: { "Content-Type": "multipart/form-data" }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      Alert.alert("Success", "Asset uploaded accurately.");
    }
  });

  const moveAssetMutation = useMutation({
    mutationFn: (folderId: string | null) => apiRequest(`/asset-library/assets/${targetAssetToMove?.id}`, {
      method: "PATCH",
      body: JSON.stringify({ folderId })
    }),
    onSuccess: () => {
      setMoveAssetVisible(false);
      setTargetAssetToMove(null);
      setPreviewAsset(null);
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      Alert.alert("Moved", "Asset shifted cleanly.");
    }
  });

  const patchAssetMutation = useMutation({
    mutationFn: (payload: any) => apiRequest(`/asset-library/assets/${previewAsset?.id}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    }),
    onSuccess: (data) => {
      setEditAssetVisible(false);
      if (data?.item) setPreviewAsset(data.item);
      queryClient.invalidateQueries({ queryKey: ["assets"] });
    }
  });

  const deleteAssetMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/asset-library/assets/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      setPreviewAsset(null);
      queryClient.invalidateQueries({ queryKey: ["assets"] });
    }
  });

  const bulkTagMutation = useMutation({
    mutationFn: (tags: string[]) => apiRequest("/asset-library/assets/bulk", {
      method: "PATCH",
      body: JSON.stringify({ assetIds: Array.from(selectedAssetIds), tags })
    }),
    onSuccess: () => {
      setBulkTagVisible(false);
      setBulkTags("");
      setSelectedAssetIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["assets"] });
    }
  });

  const handleUploadSelection = async () => {
    if (currentFolder?.isReadOnly) {
      Alert.alert("Read Only", "This folder configuration prevents writing modifications.");
      return;
    }
    Alert.alert("Select File Type", "Choose file injection strategy:", [
      { text: "Images from Library", onPress: async () => {
          const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
          if (!res.canceled && res.assets?.[0]?.uri) uploadAssetMutation.mutate(res.assets[0].uri);
      }},
      { text: "Documents / PDFs", onPress: async () => {
          const res = await DocumentPicker.getDocumentAsync({ type: ["image/*", "application/pdf"] });
          if (!res.canceled && res.assets?.[0]?.uri) uploadAssetMutation.mutate(res.assets[0].uri);
      }},
      { text: "Cancel", style: "cancel" }
    ]);
  };

  const toggleAssetSelection = (id: string) => {
    const next = new Set(selectedAssetIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedAssetIds(next);
  };

  const assets = assetsQuery.data?.items || [];
  const totalPages = assetsQuery.data?.totalPages || 1;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topHeader}>
        <Text style={styles.titleText}>{title}</Text>
        <Text style={styles.descText}>{description}</Text>
      </View>

      <View style={styles.controlRow}>
        <View style={styles.searchBoxWrapper}>
          <Search size={16} color="#94a3b8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search assets within folder..."
            placeholderTextColor="#64748b"
            value={search}
            onChangeText={(text) => { setPage(1); setSearch(text); }}
          />
        </View>
        <TouchableOpacity style={styles.actionIconButton} onPress={() => setCreateFolderVisible(true)}>
          <FolderPlus size={20} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionIconButton} onPress={handleUploadSelection}>
          <Upload size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.breadcrumbContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.breadcrumbScroll}>
          <TouchableOpacity onPress={() => setCurrentFolderId(null)}>
            <Text style={[styles.crumbText, !currentFolderId && styles.activeCrumb]}>Root</Text>
          </TouchableOpacity>
          {breadcrumbTrail.map((crumb, idx) => (
            <React.Fragment key={crumb.id}>
              <Text style={styles.crumbDivider}>/</Text>
              <TouchableOpacity onPress={() => setCurrentFolderId(crumb.id)}>
                <Text style={[styles.crumbText, idx === breadcrumbTrail.length - 1 && styles.activeCrumb]} numberOfLines={1}>
                  {crumb.name}
                </Text>
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </ScrollView>
        {currentFolderId && (
          <View style={styles.folderManagementIcons}>
            <TouchableOpacity style={styles.miniFolderAction} onPress={() => { setEditFolderName(currentFolder?.name || ""); setRenameFolderVisible(true); }}>
              <Edit2 size={14} color="#eab308" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.miniFolderAction} onPress={() => {
              Alert.alert("Archive Folder", "Are you sure you want to delete this folder step tree?", [
                { text: "Cancel" },
                { text: "Delete", style: "destructive", onPress: () => deleteFolderMutation.mutate(currentFolderId) }
              ]);
            }}>
              <Trash2 size={14} color="#ef4444" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {currentSubFolders.length > 0 && (
        <View style={styles.subFoldersSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subFolderScrollContainer}>
            {currentSubFolders.map((sub) => (
              <TouchableOpacity key={sub.id} style={styles.subFolderCard} onPress={() => { setPage(1); setCurrentFolderId(sub.id); }}>
                <Folder size={18} color={colors.primary} />
                <View>
                  <Text style={styles.subFolderName} numberOfLines={1}>{sub.name}</Text>
                  <Text style={styles.subFolderCount}>{sub.assetCount || 0} items</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.filterBar}>
        <View style={styles.filterGroup}>
          <TouchableOpacity style={[styles.filterChip, typeFilter === "" && styles.activeChip]} onPress={() => { setPage(1); setTypeFilter(""); }}><Text style={styles.chipText}>All Files</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.filterChip, typeFilter === "image" && styles.activeChip]} onPress={() => { setPage(1); setTypeFilter("image"); }}><Text style={styles.chipText}>Images</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.filterChip, typeFilter === "pdf" && styles.activeChip]} onPress={() => { setPage(1); setTypeFilter("pdf"); }}><Text style={styles.chipText}>PDFs</Text></TouchableOpacity>
        </View>
        {selectedAssetIds.size > 0 && (
          <TouchableOpacity style={styles.bulkTagTrigger} onPress={() => setBulkTagVisible(true)}>
            <Text style={styles.bulkTagText}>Bulk Tag ({selectedAssetIds.size})</Text>
          </TouchableOpacity>
        )}
      </View>

      {assetsQuery.isLoading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loaderMargin} />
      ) : (
        <FlatList
          data={assets}
          numColumns={2}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.gridContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <File size={48} color="#475569" />
              <Text style={styles.emptyText}>No assets found inside this directory</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isSelected = selectedAssetIds.has(item.id);
            const isImage = (item.mimeType || item.attachment?.mimeType || "").startsWith("image/");
            return (
              <TouchableOpacity 
                style={[styles.assetGridCard, isSelected && styles.selectedCardBorder]}
                onPress={() => setPreviewAsset(item)}
                onLongPress={() => toggleAssetSelection(item.id)}
              >
                <View style={styles.thumbnailWrapper}>
                  {isImage && (item.urlThumbnail || item.attachment?.url) ? (
                    <Image source={{ uri: item.urlThumbnail || item.attachment?.url }} style={styles.thumbnailImage} />
                  ) : (
                    <View style={styles.fallbackIconWrapper}>
                      {item.mimeType === "application/pdf" ? <FileText size={36} color={colors.primary} /> : <File size={36} color="#94a3b8" />}
                    </View>
                  )}
                  <TouchableOpacity style={styles.checkboxPosition} onPress={() => toggleAssetSelection(item.id)}>
                    <View style={[styles.customCheck, isSelected && styles.customCheckActive]}>
                      {isSelected && <Check size={10} color="#fff" />}
                    </View>
                  </TouchableOpacity>
                </View>
                <View style={styles.cardInfoContainer}>
                  <Text style={styles.assetTitleText} numberOfLines={1}>{item.title || item.originalFilename || "Asset File"}</Text>
                  <Text style={styles.assetMetaText}>{formatBytes(item.sizeBytes || item.attachment?.size)}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      <View style={styles.paginationFooter}>
        <TouchableOpacity style={[styles.pageBtn, page === 1 && styles.disabledPageBtn]} disabled={page === 1} onPress={() => setPage(p => Math.max(1, p - 1))}><Text style={styles.pageBtnText}>Prev</Text></TouchableOpacity>
        <Text style={styles.pageIndicatorText}>Page {page} of {totalPages}</Text>
        <TouchableOpacity style={[styles.pageBtn, page >= totalPages && styles.disabledPageBtn]} disabled={page >= totalPages} onPress={() => setPage(p => Math.min(totalPages, p + 1))}><Text style={styles.pageBtnText}>Next</Text></TouchableOpacity>
      </View>
      
      <Modal visible={createFolderVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlayCentered}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.modalBoxCentered, styles.height230]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={1}>Create Folder in {currentFolder ? currentFolder.name : 'Root'}</Text>
              <TouchableOpacity onPress={() => setCreateFolderVisible(false)}><X size={20} color={colors.text} /></TouchableOpacity>
            </View>
            <TextInput 
              style={styles.modalInput} 
              placeholder="Folder Name" 
              placeholderTextColor="#64748b"
              value={newFolderName}
              onChangeText={setNewFolderName}
            />
            <TouchableOpacity style={styles.modalSubmitButton} onPress={() => createFolderMutation.mutate(newFolderName)}>
              <Text style={styles.submitBtnText}>Create Folder</Text>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal visible={renameFolderVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlayCentered}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.modalBoxCentered, styles.height230]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Rename Folder</Text>
              <TouchableOpacity onPress={() => setRenameFolderVisible(false)}><X size={20} color={colors.text} /></TouchableOpacity>
            </View>
            <TextInput style={styles.modalInput} value={editFolderName} onChangeText={setEditFolderName} />
            <TouchableOpacity style={[styles.modalSubmitButton, styles.bgYellow]} onPress={() => renameFolderMutation.mutate(editFolderName)}>
              <Text style={styles.submitBtnText}>Save Changes</Text>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal visible={!!previewAsset} transparent={true} animationType="fade">
        <View style={styles.modalOverlayCentered}>
          {previewAsset && (
            <View style={[styles.modalBoxCentered, styles.heightMax]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle} numberOfLines={1}>{previewAsset.title || previewAsset.originalFilename}</Text>
                <TouchableOpacity onPress={() => setPreviewAsset(null)}><X size={20} color={colors.text} /></TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.paddingBottom24}>
                <View style={styles.previewMediaBox}>
                  {(previewAsset.mimeType || previewAsset.attachment?.mimeType || "").startsWith("image/") ? (
                    <Image source={{ uri: previewAsset.attachment?.url || previewAsset.urlPreview }} style={styles.fullPreviewImg} resizeMode="contain" />
                  ) : (
                    <View style={styles.nonImagePreviewPlaceholder}>
                      <FileText size={64} color={colors.primary} />
                      <Text style={styles.nonImageText}>Document File Container Object</Text>
                    </View>
                  )}
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.actionRibbonContainer}>
                  <TouchableOpacity style={styles.ribbonBtn} onPress={() => Clipboard.setStringAsync(previewAsset.attachment?.url || "")}>
                    <LinkIcon size={14} color={colors.text} /><Text style={styles.ribbonBtnText}>Copy URL</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.ribbonBtn} onPress={() => { setTargetAssetToMove(previewAsset); setMoveAssetVisible(true); }}>
                    <Move size={14} color={colors.text} /><Text style={styles.ribbonBtnText}>Move File</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.ribbonBtn} onPress={() => { setAssetForm({ title: previewAsset.title || "", description: previewAsset.description || "", tags: (previewAsset.tags || []).join(", ") }); setEditAssetVisible(true); }}>
                    <Edit2 size={14} color={colors.text} /><Text style={styles.ribbonBtnText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.ribbonBtn} onPress={() => setHistoryVisible(true)}>
                    <History size={14} color={colors.text} /><Text style={styles.ribbonBtnText}>History</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.ribbonBtn, styles.bgRed]} onPress={() => {
                    Alert.alert("Delete Asset", "Are you sure?", [
                      { text: "Cancel" },
                      { text: "Delete", style: "destructive", onPress: () => deleteAssetMutation.mutate(previewAsset.id) }
                    ]);
                  }}>
                    <Trash2 size={14} color="#fff" /><Text style={[styles.ribbonBtnText, styles.textWhite]}>Delete</Text>
                  </TouchableOpacity>
                </ScrollView>

                <Text style={styles.metaSectionTitle}>File Configuration Details</Text>
                <View style={styles.metaDataBlock}>
                  <Text style={styles.metaLabelText}>Filename: <Text style={styles.metaValueText}>{previewAsset.originalFilename || "—"}</Text></Text>
                  <Text style={styles.metaLabelText}>Mime Type: <Text style={styles.metaValueText}>{previewAsset.mimeType || "—"}</Text></Text>
                  <Text style={styles.metaLabelText}>Size Metric: <Text style={styles.metaValueText}>{formatBytes(previewAsset.sizeBytes)}</Text></Text>
                  <Text style={styles.metaLabelText}>Tags Applied: <Text style={styles.metaValueText}>{(previewAsset.tags || []).join(", ") || "None"}</Text></Text>
                </View>
              </ScrollView>
            </View>
          )}
        </View>
      </Modal>

      <Modal visible={moveAssetVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlayCentered}>
          <View style={[styles.modalBoxCentered, styles.heightMed]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={1}>Move "{targetAssetToMove?.title || targetAssetToMove?.originalFilename}" To:</Text>
              <TouchableOpacity onPress={() => { setMoveAssetVisible(false); setTargetAssetToMove(null); }}><X size={20} color={colors.text} /></TouchableOpacity>
            </View>
            <ScrollView style={styles.flex1}>
              <TouchableOpacity style={styles.folderSelectorRow} onPress={() => moveAssetMutation.mutate(null)}>
                <Folder size={18} color="#94a3b8" />
                <Text style={styles.folderRowText}>[ Move to Root Directory ]</Text>
              </TouchableOpacity>
              {flatFoldersList.map(folder => (
                <TouchableOpacity key={folder.id} style={styles.folderSelectorRow} onPress={() => moveAssetMutation.mutate(folder.id)}>
                  <ChevronRight size={14} color="#64748b" />
                  <Folder size={18} color={colors.primary} />
                  <Text style={styles.folderRowText}>{folder.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={editAssetVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlayCentered}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.modalBoxCentered, styles.height380]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Asset Properties</Text>
              <TouchableOpacity onPress={() => setEditAssetVisible(false)}><X size={20} color={colors.text} /></TouchableOpacity>
            </View>
            <TextInput style={styles.modalInput} placeholder="Asset Title" placeholderTextColor="#64748b" value={assetForm.title} onChangeText={(t) => setAssetForm(p => ({ ...p, title: t }))} />
            <TextInput style={styles.modalInput} placeholder="Asset Description" placeholderTextColor="#64748b" value={assetForm.description} onChangeText={(t) => setAssetForm(p => ({ ...p, description: t }))} />
            <TextInput style={styles.modalInput} placeholder="Tags (Comma separated)" placeholderTextColor="#64748b" value={assetForm.tags} onChangeText={(t) => setAssetForm(p => ({ ...p, tags: t }))} />
            <TouchableOpacity style={styles.modalSubmitButton} onPress={() => {
              const tagsArr = assetForm.tags.split(",").map(t => t.trim()).filter(Boolean);
              patchAssetMutation.mutate({ title: assetForm.title, description: assetForm.description, tags: tagsArr });
            }}>
              <Text style={styles.submitBtnText}>Save Changes</Text>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal visible={historyVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlayCentered}>
          <View style={[styles.modalBoxCentered, styles.height350]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Version Log Log</Text>
              <TouchableOpacity onPress={() => setHistoryVisible(false)}><X size={20} color={colors.text} /></TouchableOpacity>
            </View>
            {versionsQuery.isLoading ? <ActivityIndicator size="small" color={colors.primary} /> : (
              <FlatList
                data={versionsQuery.data}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <View style={styles.versionCardRow}>
                    <Text style={styles.versionTitleText}>Version: {item.versionNumber}</Text>
                    <Text style={styles.versionNotesText} numberOfLines={1}>Note: {item.changeNote || "Initial Asset Ingestion"}</Text>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={bulkTagVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlayCentered}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.modalBoxCentered, styles.height230]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Apply Bulk Tags</Text>
              <TouchableOpacity onPress={() => setBulkTagVisible(false)}><X size={20} color={colors.text} /></TouchableOpacity>
            </View>
            <TextInput style={styles.modalInput} placeholder="logo, doc, active" placeholderTextColor="#64748b" value={bulkTags} onChangeText={setBulkTags} />
            <TouchableOpacity style={styles.modalSubmitButton} onPress={() => {
              const parsedArr = bulkTags.split(",").map(t => t.trim()).filter(Boolean);
              bulkTagMutation.mutate(parsedArr);
            }}>
              <Text style={styles.submitBtnText}>Process Batch Pipeline Tags</Text>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const createStyles = (colors: { background: string; cardBg: string; text: string; primary: string }) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    topHeader: { paddingHorizontal: 16, paddingTop: 12 },
    titleText: { fontSize: 20, fontWeight: "bold", color: colors.text },
    descText: { fontSize: 13, color: "#94a3b8", marginTop: 2 },
    controlRow: { flexDirection: "row", paddingHorizontal: 16, gap: 10, alignItems: "center", marginTop: 12, marginBottom: 8 },
    searchBoxWrapper: { flex: 1, flexDirection: "row", backgroundColor: colors.cardBg, borderRadius: 8, alignItems: "center", paddingHorizontal: 10, height: 42, borderWidth: 1, borderColor: "#334155" },
    searchIcon: { marginRight: 8 },
    searchInput: { flex: 1, color: colors.text, fontSize: 14 },
    actionIconButton: { backgroundColor: colors.primary, width: 42, height: 42, borderRadius: 8, justifyContent: "center", alignItems: "center" },
    breadcrumbContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.cardBg, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#334155' },
    breadcrumbScroll: { alignItems: 'center', gap: 6 },
    crumbText: { color: '#94a3b8', fontSize: 13, fontWeight: '500' },
    activeCrumb: { color: colors.primary, fontWeight: 'bold' },
    crumbDivider: { color: '#475569', fontSize: 12 },
    folderManagementIcons: { flexDirection: 'row', gap: 12, alignItems: 'center', marginLeft: 8 },
    miniFolderAction: { padding: 4, backgroundColor: colors.background, borderRadius: 4 },
    subFoldersSection: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.cardBg },
    subFolderScrollContainer: { paddingHorizontal: 16, gap: 10 },
    subFolderCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.cardBg, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, minWidth: 130, borderWidth: 1, borderColor: '#334155' },
    subFolderName: { color: colors.text, fontSize: 13, fontWeight: '600', maxWidth: 110 },
    subFolderCount: { color: '#64748b', fontSize: 11 },
    filterBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, marginVertical: 10 },
    filterGroup: { flexDirection: "row", gap: 6 },
    filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: colors.cardBg, borderWidth: 1, borderColor: "#334155" },
    activeChip: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { color: "#fff", fontSize: 12, fontWeight: "600" },
    bulkTagTrigger: { backgroundColor: "#10b981", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    bulkTagText: { color: "#fff", fontSize: 12, fontWeight: "bold" },
    gridContainer: { paddingHorizontal: 10, paddingBottom: 80 },
    assetGridCard: { flex: 0.5, backgroundColor: colors.cardBg, margin: 6, borderRadius: 10, borderWidth: 1, borderColor: "#334155", overflow: "hidden" },
    selectedCardBorder: { borderColor: colors.primary, borderWidth: 2 },
    thumbnailWrapper: { aspectRatio: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" },
    thumbnailImage: { width: "100%", height: "100%" },
    fallbackIconWrapper: { alignItems: "center", justifyContent: "center" },
    checkboxPosition: { position: "absolute", left: 8, top: 8, zIndex: 10 },
    customCheck: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: "#fff", backgroundColor: "rgba(15,23,42,0.65)", justifyContent: "center", alignItems: "center" },
    customCheckActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    cardInfoContainer: { padding: 8 },
    assetTitleText: { color: colors.text, fontSize: 12, fontWeight: "600" },
    assetMetaText: { color: "#94a3b8", fontSize: 11, marginTop: 2 },
    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 10 },
    emptyText: { color: '#64748b', fontSize: 13 },
    paginationFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderTopWidth: 1, borderTopColor: colors.cardBg, backgroundColor: colors.background },
    pageBtn: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.cardBg, borderRadius: 6 },
    disabledPageBtn: { opacity: 0.4 },
    pageBtnText: { color: colors.text, fontSize: 12, fontWeight: "bold" },
    pageIndicatorText: { color: "#94a3b8", fontSize: 13 },
    modalOverlayCentered: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "center", alignItems: "center", padding: 16 },
    modalBoxCentered: { backgroundColor: colors.background, width: "100%", borderRadius: 14, borderWidth: 1, borderColor: colors.cardBg, padding: 16, overflow: "hidden" },
    modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.cardBg },
    modalTitle: { color: colors.text, fontSize: 15, fontWeight: "bold", flex: 1 },
    modalInput: { backgroundColor: colors.cardBg, color: colors.text, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: "#334155", fontSize: 14, marginBottom: 12 },
    modalSubmitButton: { backgroundColor: colors.primary, padding: 14, borderRadius: 8, alignItems: "center" },
    submitBtnText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
    folderSelectorRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.cardBg },
    folderRowText: { color: colors.text, fontSize: 14 },
    previewMediaBox: { width: "100%", height: 200, backgroundColor: colors.background, borderRadius: 8, justifyContent: "center", alignItems: "center", marginBottom: 14 },
    fullPreviewImg: { width: "100%", height: "100%" },
    nonImagePreviewPlaceholder: { alignItems: "center", justifyContent: "center" },
    nonImageText: { color: "#64748b", fontSize: 12, marginTop: 10 },
    actionRibbonContainer: { flexDirection: "row", gap: 8, marginBottom: 16 },
    ribbonBtn: { flexDirection: "row", backgroundColor: colors.cardBg, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, alignItems: "center", gap: 6, marginRight: 6 },
    ribbonBtnText: { color: colors.text, fontSize: 12, fontWeight: "600" },
    metaSectionTitle: { color: colors.primary, fontWeight: "bold", fontSize: 12, textTransform: "uppercase", marginBottom: 8 },
    metaDataBlock: { backgroundColor: colors.cardBg, padding: 12, borderRadius: 8, gap: 6, borderWidth: 1, borderColor: "#334155" },
    metaLabelText: { color: "#94a3b8", fontSize: 12, fontWeight: "600" },
    metaValueText: { color: colors.text, fontWeight: "normal" },
    versionCardRow: { padding: 12, backgroundColor: colors.cardBg, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: "#334155" },
    versionTitleText: { color: colors.text, fontSize: 13, fontWeight: "bold" },
    versionNotesText: { color: "#94a3b8", fontSize: 12, marginTop: 2 },
    height230: { height: 230 },
    height350: { height: 350 },
    height380: { height: 380 },
    heightMed: { height: SCREEN_HEIGHT * 0.6 },
    heightMax: { height: SCREEN_HEIGHT * 0.8 },
    bgYellow: { backgroundColor: '#eab308' },
    bgRed: { backgroundColor: '#ef4444' },
    textWhite: { color: '#ffffff' },
    loaderMargin: { marginTop: 40 },
    paddingBottom24: { paddingBottom: 24 },
    flex1: { flex: 1 }
  });