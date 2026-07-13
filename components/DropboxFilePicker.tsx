import React, { useState, useEffect, useCallback } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  FlatList,
  ActivityIndicator,
  Platform,
  Alert,
  SafeAreaView,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import * as WebBrowser from "expo-web-browser";
import {
  Loader2,
  FolderOpen,
  FileText,
  ChevronRight,
  ArrowLeft,
  Check,
  CloudOff,
  RefreshCw,
  Image as ImageIcon,
  Film,
  Archive,
  FileSpreadsheet,
  AlertCircle,
  X,
} from "lucide-react-native";
import { apiFetch } from "@/lib/admin/apiClient";

// Ensure WebBrowser can handle authentication session results correctly
WebBrowser.maybeCompleteAuthSession();

// --- Exported Types ---
export type DropboxFileEntry = {
  id: string;
  name: string;
  path: string;
  pathDisplay: string;
  type: "file" | "folder";
  size: number;
  modified: string;
};

export type DropboxSelectedFile = {
  file_name: string;
  file_type: string;
  file_size: number;
  dropbox_file_id: string;
  dropbox_path: string;
  temporary_link: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (files: DropboxSelectedFile[]) => void;
  multiple?: boolean;
};

// --- Helpers ---
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function getFileExtension(name: string): string {
  const parts = name.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
}

function getMimeFromExt(ext: string): string {
  const map: Record<string, string> = {
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    mp4: "video/mp4",
    zip: "application/zip",
    txt: "text/plain",
  };
  return map[ext] || "application/octet-stream";
}

function getFileIcon(name: string) {
  const ext = getFileExtension(name);
  const images = ["png", "jpg", "jpeg", "gif", "webp", "svg"];
  const videos = ["mp4", "mov", "avi"];
  const archives = ["zip", "rar", "7z"];
  const spreadsheets = ["xls", "xlsx", "csv"];

  if (images.includes(ext)) return <ImageIcon size={20} color="#34d399" style={styles.iconShrink} />;
  if (videos.includes(ext)) return <Film size={20} color="#c084fc" style={styles.iconShrink} />;
  if (archives.includes(ext)) return <Archive size={20} color="#fbbf24" style={styles.iconShrink} />;
  if (spreadsheets.includes(ext)) return <FileSpreadsheet size={20} color="#4ade80" style={styles.iconShrink} />;
  return <FileText size={20} color="#60a5fa" style={styles.iconShrink} />;
}

const DROPBOX_BLUE = "#0061FF";

export function DropboxIcon({ size = 14 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 43 40" fill="none">
      <Path d="M12.5 0L0 8.1L8.6 13.7L21.5 5.9L12.5 0Z" fill={DROPBOX_BLUE} />
      <Path d="M0 21.9L12.5 30L21.5 22.1L8.6 13.7L0 21.9Z" fill={DROPBOX_BLUE} />
      <Path d="M21.5 22.1L30.5 30L43 21.9L34.4 13.7L21.5 22.1Z" fill={DROPBOX_BLUE} />
      <Path d="M43 8.1L30.5 0L21.5 5.9L34.4 13.7L43 8.1Z" fill={DROPBOX_BLUE} />
    </Svg>
  );
}

// --- Main Component ---
export default function DropboxFilePicker({ open, onOpenChange, onSelect, multiple = false }: Props) {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [entries, setEntries] = useState<DropboxFileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPath, setCurrentPath] = useState("");
  const [pathHistory, setPathHistory] = useState<string[]>([""]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [browserError, setBrowserError] = useState<string | null>(null);

  const loadFolder = async (path: string) => {
    try {
      setLoading(true);
      setBrowserError(null);
      const res = await apiFetch<{ entries: DropboxFileEntry[] }>("/api/dropbox/files/list", {
        method: "POST",
        body: JSON.stringify({ path }),
      });
      setEntries(res.entries || []);
      setCurrentPath(path);
    } catch (err) {
      setBrowserError(err instanceof Error ? err.message : "Failed to load files");
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const checkStatus = useCallback(async () => {
    try {
      setConnected(null);
      setBrowserError(null);
      const res = await apiFetch<{ connected: boolean }>("/api/dropbox/status");
      setConnected(res.connected);
      if (res.connected) {
        void loadFolder("");
      }
    } catch {
      setConnected(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setSelected(new Set());
      setBrowserError(null);
      void checkStatus();
    }
  }, [open, checkStatus]);

  // Handle native WebBrowser authentication session loop
  const startOAuth = async () => {
    try {
      const res = await apiFetch<{ authUrl: string }>("/api/dropbox/auth-url");
      if (!res.authUrl) {
        Alert.alert("Error", "Failed to get Dropbox auth URL.");
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(res.authUrl, "myapp://dropbox-callback");
      
      if (result.type === "success") {
        Alert.alert("Dropbox Connected", "Your Dropbox account has been linked successfully.");
        void checkStatus();
      }
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to start Dropbox authentication.");
    }
  };

  const navigateToFolder = (folderPath: string) => {
    setPathHistory((prev) => [...prev, folderPath]);
    void loadFolder(folderPath);
  };

  const navigateBack = () => {
    if (pathHistory.length <= 1) return;
    const newHistory = [...pathHistory];
    newHistory.pop();
    const parentPath = newHistory[newHistory.length - 1];
    setPathHistory(newHistory);
    void loadFolder(parentPath);
  };

  const toggleSelect = (entry: DropboxFileEntry) => {
    if (entry.type === "folder") {
      navigateToFolder(entry.path);
      return;
    }
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(entry.id)) {
        next.delete(entry.id);
      } else {
        if (!multiple) next.clear();
        next.add(entry.id);
      }
      return next;
    });
  };

  const confirmSelection = async () => {
    const selectedEntries = entries.filter((e) => selected.has(e.id) && e.type === "file");
    if (selectedEntries.length === 0) return;

    try {
      setConfirming(true);
      const results: DropboxSelectedFile[] = await Promise.all(
        selectedEntries.map(async (entry) => {
          const linkRes = await apiFetch<{ link: string }>("/api/dropbox/files/temporary-link", {
            method: "POST",
            body: JSON.stringify({ path: entry.path }),
          });
          const ext = getFileExtension(entry.name);
          return {
            file_name: entry.name,
            file_type: getMimeFromExt(ext),
            file_size: entry.size,
            dropbox_file_id: entry.id,
            dropbox_path: entry.path,
            temporary_link: linkRes.link || "",
          };
        })
      );

      onSelect(results);
      onOpenChange(false);
      Alert.alert("Success", `${results.length} file(s) attached successfully.`);
    } catch (err) {
      Alert.alert("Attachment Failed", err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setConfirming(false);
    }
  };

  const sortedEntries = [...entries].sort((a, b) => {
    if (a.type === "folder" && b.type !== "folder") return -1;
    if (a.type !== "folder" && b.type === "folder") return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <Modal visible={open} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <SafeAreaView style={styles.modalContainer}>
          
          {/* Header Layout Component */}
          <View style={styles.modalHeader}>
            <View style={styles.headerTitleRow}>
              <DropboxIcon size={22} />
              <Text style={styles.modalTitle}>Attach from Dropbox</Text>
            </View>
            <TouchableOpacity onPress={() => onOpenChange(false)} style={styles.closeButton}>
              <X size={20} color="#71717a" />
            </TouchableOpacity>
          </View>

          {/* Not Connected State View */}
          {connected === false && (
            <View style={styles.centeredContainer}>
              <View style={styles.iconCircleWrapper}>
                <CloudOff size={32} color="#71717a" />
              </View>
              <Text style={styles.fallbackText}>
                Connect your Dropbox account to browse and attach files directly.
              </Text>
              <TouchableOpacity style={styles.connectButton} onPress={startOAuth}>
                <DropboxIcon size={16} />
                <Text style={styles.connectButtonText}>Connect Dropbox</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Status Loading Spinnery Check */}
          {connected === null && (
            <View style={styles.centeredContainer}>
              <ActivityIndicator size="large" color="#71717a" />
            </View>
          )}

          {/* Connected File Matrix Layout Browser */}
          {connected === true && (
            <View style={styles.browserContainer}>
              
              {/* Native Mini Header / Breadcrumb Simulator */}
              <View style={styles.breadcrumbBar}>
                <Text style={styles.breadcrumbRootText} numberOfLines={1}>
                  Dropbox{currentPath ? ` ${currentPath}` : " /"}
                </Text>
                <TouchableOpacity onPress={() => void loadFolder(currentPath)} style={styles.refreshButtonPill}>
                  <RefreshCw size={14} color="#71717a" />
                </TouchableOpacity>
              </View>

              {/* Back Button Controller Row */}
              {pathHistory.length > 1 && (
                <TouchableOpacity style={styles.backButtonRow} onPress={navigateBack}>
                  <ArrowLeft size={16} color="#71717a" />
                  <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
              )}

              {/* Error Matrix State Notification Block */}
              {browserError && (
                <View style={styles.centeredContainer}>
                  <AlertCircle size={28} color="#ef4444" />
                  <Text style={styles.fallbackText}>{browserError}</Text>
                  <TouchableOpacity style={styles.retryButton} onPress={() => void loadFolder(currentPath)}>
                    <Text style={styles.retryButtonText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Core Native Scroll Listing */}
              {!browserError && (
                <FlatList
                  data={sortedEntries}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.listScrollContent}
                  ListEmptyComponent={
                    loading ? null : (
                      <View style={styles.emptyContainer}>
                        <FolderOpen size={40} color="#d4d4d8" />
                        <Text style={styles.emptyText}>This folder is empty</Text>
                      </View>
                    )
                  }
                  ListHeaderComponent={
                    loading ? (
                      <ActivityIndicator size="small" color={DROPBOX_BLUE} style={{ marginVertical: 20 }} />
                    ) : null
                  }
                  renderItem={({ item }) => {
                    const isFolder = item.type === "folder";
                    const isSelected = selected.has(item.id);

                    return (
                      <Pressable
                        onPress={() => toggleSelect(item)}
                        style={[styles.itemRow, isSelected && styles.itemRowSelected]}
                      >
                        {isFolder ? <FolderOpen size={20} color="#fbbf24" /> : getFileIcon(item.name)}

                        <View style={styles.itemMetadataColumn}>
                          <Text style={styles.itemNameText} numberOfLines={1}>{item.name}</Text>
                          {!isFolder && (
                            <Text style={styles.itemSubText}>
                              {formatBytes(item.size)} • {new Date(item.modified).toLocaleDateString()}
                            </Text>
                          )}
                        </View>

                        {isFolder ? (
                          <ChevronRight size={16} color="#a1a1aa" />
                        ) : (
                          <View style={[styles.checkboxCircle, isSelected && styles.checkboxCircleChecked]}>
                            {isSelected && <Check size={12} color="#ffffff" />}
                          </View>
                        )}
                      </Pressable>
                    );
                  }}
                />
              )}

              {/* Footer Execution Action Row Matrix */}
              <View style={styles.modalFooter}>
                <Text style={styles.footerSelectionCounter}>
                  {selected.size > 0 ? `${selected.size} file(s) selected` : "Select a file"}
                </Text>
                <View style={styles.footerActionsGroup}>
                  <TouchableOpacity style={styles.cancelButton} onPress={() => onOpenChange(false)}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    disabled={selected.size === 0 || confirming}
                    style={[styles.attachButton, selected.size > 0 && { backgroundColor: DROPBOX_BLUE }]}
                    onPress={confirmSelection}
                  >
                    {confirming && <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 6 }} />}
                    <Text style={styles.attachButtonText}>
                      Attach{selected.size > 0 ? ` (${selected.size})` : ""}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

            </View>
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

// --- Layout Stylesheet Matrix ---
const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    height: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: "#e4e4e7",
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#09090b",
  },
  closeButton: {
    padding: 4,
  },
  centeredContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  iconCircleWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#f4f4f5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  fallbackText: {
    fontSize: 14,
    color: "#71717a",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  connectButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: DROPBOX_BLUE,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  connectButtonText: {
    color: "#ffffff",
    fontWeight: "500",
    fontSize: 14,
  },
  browserContainer: {
    flex: 1,
  },
  breadcrumbBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#f4f4f5",
  },
  breadcrumbRootText: {
    fontSize: 12,
    color: "#71717a",
    flex: 1,
    marginRight: 8,
  },
  refreshButtonPill: {
    padding: 4,
  },
  backButtonRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
  },
  backButtonText: {
    fontSize: 14,
    color: "#71717a",
  },
  listScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 14,
    color: "#a1a1aa",
    marginTop: 8,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderColor: "#f4f4f5",
    borderRadius: 8,
    marginVertical: 1,
  },
  itemRowSelected: {
    backgroundColor: "#eff6ff",
    borderColor: "#bfdbfe",
  },
  iconShrink: {
    flexShrink: 0,
  },
  itemMetadataColumn: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  itemNameText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#09090b",
  },
  itemSubText: {
    fontSize: 11,
    color: "#71717a",
    marginTop: 2,
  },
  checkboxCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#d4d4d8",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxCircleChecked: {
    backgroundColor: DROPBOX_BLUE,
    borderColor: DROPBOX_BLUE,
  },
  modalFooter: {
    borderTopWidth: 1,
    borderColor: "#e4e4e7",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    ...Platform.select({
      ios: { paddingBottom: 32 },
    }),
  },
  footerSelectionCounter: {
    fontSize: 12,
    color: "#71717a",
  },
  footerActionsGroup: {
    flexDirection: "row",
    gap: 8,
  },
  cancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#d4d4d8",
  },
  cancelButtonText: {
    fontSize: 13,
    color: "#27272a",
    fontWeight: "500",
  },
  attachButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#a1a1aa",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  },
  attachButtonText: {
    fontSize: 13,
    color: "#ffffff",
    fontWeight: "500",
  },
  retryButton: {
    backgroundColor: "#f4f4f5",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginTop: 8,
  },
  retryButtonText: {
    fontSize: 12,
    color: "#18181b",
  },
});