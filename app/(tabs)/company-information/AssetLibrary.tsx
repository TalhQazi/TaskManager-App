import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { 
  Search, Folder, FolderOpen, Image as ImageIcon, 
  Download, X, FileText, ChevronRight, Link as LinkIcon 
} from "lucide-react-native";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as Clipboard from "expo-clipboard";
import { apiFetch, toProxiedUrl } from "@/lib/admin/apiClient"; 

// --- Constants / Theme ---
const COLORS = {
  background: "#09090b",
  card: "#18181b",
  primary: "#ffd27a",
  text: "#ffffff",
  textMuted: "#a1a1aa",
  border: "#27272a",
};

// --- Helper Functions ---
function formatBytes(bytes: number | undefined) {
  const b = Number(bytes || 0);
  if (!b) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(b) / Math.log(1024)), units.length - 1);
  const v = b / Math.pow(1024, i);
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

export default function EmployeeAssetLibraryMobile({
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
  const [preview, setPreview] = useState<any | null>(null);

  // --- Data ---
  const { data: folders = [] } = useQuery({
    queryKey: ["asset-library", "folders", "employee", moduleName],
    queryFn: async () => (await apiFetch<{ items: any[] }>(`/api/asset-library/folders?module=${moduleName}`)).items || [],
  });

  const { data: assetsData, isLoading } = useQuery({
    queryKey: ["assets", moduleName, selectedFolderId, search],
    queryFn: async () => {
      const qs = `?module=${moduleName}&folderId=${selectedFolderId || ""}&q=${search}`;
      return await apiFetch<any>(`/api/asset-library/assets${qs}`);
    },
  });

  // --- Download Logic (Native) ---
  const downloadAsset = async (asset: any) => {
    try {
      const res = await apiFetch<{ url: string; fileName: string }>(
        `/api/asset-library/assets/${asset.id}/download`,
        { method: "POST" }
      );
      
      const fileUri = FileSystem.documentDirectory + (res.fileName || "asset.dat");
      const { uri } = await FileSystem.downloadAsync(toProxiedUrl(res.url)!, fileUri);
      await Sharing.shareAsync(uri); // Opens native share sheet
    } catch (e) {
      Alert.alert("Download Failed", "Could not save the file.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>

      {/* Folder Header */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.folderScroll}>
        <TouchableOpacity 
          style={[styles.chip, !selectedFolderId && styles.activeChip]}
          onPress={() => setSelectedFolderId(null)}
        >
          <Folder size={14} color={!selectedFolderId ? "#000" : COLORS.textMuted} />
          <Text style={[styles.chipText, !selectedFolderId && styles.activeChipText]}>All</Text>
        </TouchableOpacity>
        {folders.map((f: any) => (
          <TouchableOpacity 
            key={f.id} 
            style={[styles.chip, selectedFolderId === f.id && styles.activeChip]}
            onPress={() => setSelectedFolderId(f.id)}
          >
            <FolderOpen size={14} color={selectedFolderId === f.id ? "#000" : COLORS.textMuted} />
            <Text style={[styles.chipText, selectedFolderId === f.id && styles.activeChipText]}>{f.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Search size={18} color={COLORS.textMuted} />
        <TextInput 
          style={styles.searchInput}
          placeholder="Search assets..." 
          placeholderTextColor={COLORS.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Grid */}
      <FlatList
        data={assetsData?.items || []}
        numColumns={2}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 50 }}
        ListEmptyComponent={isLoading ? <ActivityIndicator color={COLORS.primary} /> : null}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => setPreview(item)}>
            <View style={styles.thumb}>
               <ImageIcon size={32} color={COLORS.primary} />
            </View>
            <Text style={styles.assetTitle} numberOfLines={1}>{item.title || item.originalFilename}</Text>
            <Text style={styles.assetMeta}>{formatBytes(item.attachment?.size)}</Text>
          </TouchableOpacity>
        )}
      />

      {/* Detail Modal */}
      <Modal visible={!!preview} animationType="slide">
        <View style={styles.modal}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => setPreview(null)}><X color={COLORS.text} /></TouchableOpacity>
          <Text style={styles.modalTitle}>{preview?.title || "Asset Details"}</Text>
          
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.btnSecondary} onPress={() => Clipboard.setStringAsync(preview?.attachment?.url)}>
              <LinkIcon size={18} color={COLORS.text} />
              <Text style={{color: COLORS.text, marginLeft: 8}}>Copy Link</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnPrimary} onPress={() => downloadAsset(preview)}>
              <Download size={18} color="#000" />
              <Text style={{fontWeight: '700', marginLeft: 8}}>Download</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 20 },
  title: { fontSize: 24, fontWeight: "800", color: COLORS.text, marginTop: 40 },
  description: { color: COLORS.textMuted, fontSize: 14, marginBottom: 20 },
  folderScroll: { flexGrow: 0, marginBottom: 15 },
  chip: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, backgroundColor: COLORS.card, borderRadius: 20, marginRight: 8 },
  activeChip: { backgroundColor: COLORS.primary },
  chipText: { color: COLORS.text, marginLeft: 6, fontSize: 13 },
  activeChipText: { color: "#000", fontWeight: '600' },
  searchContainer: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.card, padding: 12, borderRadius: 8, marginBottom: 15 },
  searchInput: { flex: 1, color: COLORS.text, marginLeft: 10 },
  card: { flex: 1, backgroundColor: COLORS.card, margin: 6, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  thumb: { aspectRatio: 1, backgroundColor: "#09090b", justifyContent: "center", alignItems: "center", borderRadius: 8, marginBottom: 8 },
  assetTitle: { color: COLORS.text, fontSize: 12, fontWeight: "500" },
  assetMeta: { color: COLORS.textMuted, fontSize: 10, marginTop: 4 },
  modal: { flex: 1, backgroundColor: COLORS.background, padding: 40, justifyContent: 'center' },
  closeBtn: { position: 'absolute', top: 50, right: 20 },
  modalTitle: { color: COLORS.text, fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  btnRow: { flexDirection: 'row', gap: 10 },
  btnPrimary: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.primary, padding: 15, borderRadius: 8 },
  btnSecondary: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.border, padding: 15, borderRadius: 8 }
});