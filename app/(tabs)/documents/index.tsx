import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Modal,
  FlatList,
  Platform,
  Linking
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { 
  CheckCircle, 
  XCircle, 
  Upload, 
  FileText, 
  Download, 
  FolderOpen, 
  ChevronDown 
} from "lucide-react-native";

// API Adaptations
import { getEmployeeDocuments, uploadDocument } from "@/lib/admin/apiClient";

const { width } = Dimensions.get("window");
const CONTRACT_TYPES = ["W-4", "I-9", "Agreement", "NDA", "Policy Acknowledgment", "Other"];

interface DocumentItem {
  id: string;
  docType?: string;
  status: "pending" | "completed";
  fileUrl?: string;
}

// --- Premium UI Layout Components ---

function Card({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

function PremiumButton({ 
  onPress, 
  children, 
  variant = "primary", 
  disabled = false, 
  icon: Icon 
}: any) {
  const isPrimary = variant === "primary";
  const isOutline = variant === "outline";
  
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      style={[
        styles.btnBase,
        isPrimary && styles.btnPrimary,
        isOutline && styles.btnOutline,
        disabled && styles.btnDisabled
      ]}
    >
      {Icon && <Icon size={16} color={isPrimary ? "#09090b" : "#ffd27a"} style={{ marginRight: 6 }} />}
      <Text style={[styles.btnText, isOutline && { color: "#ffd27a" }, isPrimary && { color: "#09090b" }]}>
        {children}
      </Text>
    </TouchableOpacity>
  );
}

// --- Main Component ---

export default function DocumentsScreen() {
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [pickedFile, setPickedFile] = useState<any>(null);
  const [docType, setDocType] = useState("W-4");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [showTypeModal, setShowTypeModal] = useState(false);

  const loadDocs = async () => {
    try {
      setLoading(true);
      const res = await getEmployeeDocuments();
      setDocs(res?.items || []);
    } catch (err) {
      console.error("Failed to load documents", err);
      setDocs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocs();
  }, []);

  // Native File Picker Adapter
  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const fileAsset = result.assets[0];
        setPickedFile({
          uri: fileAsset.uri,
          name: fileAsset.name,
          type: fileAsset.mimeType || "application/octet-stream",
        });
      }
    } catch (err) {
      console.error("Document picking error: ", err);
    }
  };

  // Multipart Native Upload Handling
  const handleUpload = async () => {
    if (!pickedFile || !docType) return;

    try {
      setUploading(true);
      const formData = new FormData();
      
      // Native Form Data formatting mapping parameters safely
      formData.append("file", {
        uri: Platform.OS === "ios" ? pickedFile.uri.replace("file://", "") : pickedFile.uri,
        name: pickedFile.name,
        type: pickedFile.type,
      } as any);
      
      formData.append("docType", docType);

      await uploadDocument(formData);
      setPickedFile(null);
      await loadDocs();
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (url: string | undefined) => {
    if (!url) return;
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      console.error("Cannot open download link location natively");
    }
  };

  const filteredDocs = filterType === "all" 
    ? docs 
    : docs.filter(d => d.docType === filterType);

  const completedCount = docs.filter(d => d.status === "completed").length;
  const pendingCount = docs.filter(d => d.status === "pending").length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      
      {/* Header Metric Row */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.headerTitle}>Document Center</Text>
          <Text style={styles.headerSub}>Manage your contracts and required credentials</Text>
        </View>
        <View style={styles.badgeContainer}>
          <View style={styles.counterBadge}>
            <CheckCircle size={12} color="#ffd27a" style={{ marginRight: 4 }} />
            <Text style={styles.counterText}>{completedCount} Done</Text>
          </View>
          <View style={[styles.counterBadge, { borderColor: "#3f3f46" }]}>
            <XCircle size={12} color="#a1a1aa" style={{ marginRight: 4 }} />
            <Text style={[styles.counterText, { color: "#a1a1aa" }]}>{pendingCount} Open</Text>
          </View>
        </View>
      </View>

      {/* Premium Document Upload Section */}
      <Card>
        <View style={[styles.row, { marginBottom: 16 }]}>
          <Upload size={18} color="#ffd27a" style={{ marginRight: 8 }} />
          <Text style={styles.cardTitle}>Upload Document</Text>
        </View>

        <View style={styles.uploadControlsBlock}>
          {/* Custom Select Box Trigger Modal */}
          <TouchableOpacity 
            style={styles.customSelectBox} 
            onPress={() => setShowTypeModal(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.customSelectText}>{docType}</Text>
            <ChevronDown size={16} color="#ffd27a" />
          </TouchableOpacity>

          <View style={styles.actionButtonsRow}>
            <View style={{ flex: 1 }}>
              <PremiumButton 
                variant="outline" 
                icon={FolderOpen} 
                onPress={handlePickDocument}
              >
                {pickedFile ? pickedFile.name : "Choose File"}
              </PremiumButton>
            </View>

            <View style={{ flex: 1 }}>
              <PremiumButton 
                variant="primary" 
                icon={Upload} 
                disabled={!pickedFile || uploading}
                onPress={handleUpload}
              >
                {uploading ? "Uploading..." : "Upload"}
              </PremiumButton>
            </View>
          </View>
        </View>
      </Card>

      {/* Filter Horizontal Pills Row */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollView}>
        <TouchableOpacity 
          style={[styles.filterPill, filterType === "all" && styles.filterPillActive]}
          onPress={() => setFilterType("all")}
        >
          <Text style={[styles.filterPillText, filterType === "all" && styles.filterPillTextActive]}>
            All ({docs.length})
          </Text>
        </TouchableOpacity>
        {CONTRACT_TYPES.map(type => {
          const count = docs.filter(d => d.docType === type).length;
          if (count === 0) return null;
          return (
            <TouchableOpacity 
              key={type}
              style={[styles.filterPill, filterType === type && styles.filterPillActive]}
              onPress={() => setFilterType(type)}
            >
              <Text style={[styles.filterPillText, filterType === type && styles.filterPillTextActive]}>
                {type} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Documents Core Listing */}
      <Card>
        <View style={[styles.row, { marginBottom: 16 }]}>
          <FileText size={18} color="#ffd27a" style={{ marginRight: 8 }} />
          <Text style={styles.cardTitle}>Your Documents</Text>
        </View>

        {loading ? (
          <View style={styles.stateContainer}>
            <ActivityIndicator size="small" color="#ffd27a" />
            <Text style={styles.stateMutedText}>Syncing records...</Text>
          </View>
        ) : filteredDocs.length === 0 ? (
          <View style={styles.stateContainer}>
            <FileText size={28} color="#27272a" />
            <Text style={styles.stateMutedText}>No matching documents found</Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {filteredDocs.map((doc) => {
              const isDone = doc.status === "completed";
              return (
                <View 
                  key={doc.id} 
                  style={[
                    styles.documentRowItem,
                    isDone ? styles.itemCompletedBorder : styles.itemPendingBorder
                  ]}
                >
                  <View style={styles.row}>
                    <View style={styles.iconWrapper}>
                      {isDone ? (
                        <CheckCircle size={20} color="#ffd27a" />
                      ) : (
                        <XCircle size={20} color="#71717a" />
                      )}
                    </View>
                    <View>
                      <Text style={styles.docItemTitle}>{doc.docType || "Unknown Type"}</Text>
                      <View style={[styles.inlineBadge, isDone ? styles.badgeGold : styles.badgeDark]}>
                        <Text style={[styles.inlineBadgeText, isDone ? { color: "#ffd27a" } : { color: "#a1a1aa" }]}>
                          {isDone ? "✓ Completed" : "⏳ Pending"}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {doc.fileUrl && (
                    <TouchableOpacity 
                      style={styles.downloadIconBtn} 
                      onPress={() => handleDownload(doc.fileUrl)}
                      activeOpacity={0.7}
                    >
                      <Download size={16} color="#ffd27a" />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </Card>

      {/* Premium Select Dropdown Native Modal Backdrop Overlay */}
      <Modal visible={showTypeModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeaderTitle}>Select Document Type</Text>
            <FlatList
              data={CONTRACT_TYPES}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[styles.modalItem, item === docType && styles.modalItemActive]}
                  onPress={() => {
                    setDocType(item);
                    setShowTypeModal(false);
                  }}
                >
                  <Text style={[styles.modalItemText, item === docType && { color: "#ffd27a", fontWeight: "700" }]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.modalCancelClose} onPress={() => setShowTypeModal(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

// Single structured central premium dark aesthetic stylesheet wrapper
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#09090b" },
  contentContainer: { padding: 16, paddingBottom: 40 },
  row: { flexDirection: "row", alignItems: "center" },
  
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 },
  headerTitle: { color: "#ffffff", fontSize: 22, fontWeight: "bold", trackingLetter: -0.5 },
  headerSub: { color: "#a1a1aa", fontSize: 13, marginTop: 2 },
  badgeContainer: { flexDirection: "row", gap: 6 },
  counterBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "#1c1917", borderColor: "#ffd27a50", borderWidth: 1, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 20 },
  counterText: { color: "#ffd27a", fontSize: 11, fontWeight: "600" },

  card: { backgroundColor: "#121214", borderColor: "#1e1e21", borderWidth: 1, borderRadius: 12, padding: 16, marginBottom: 16 },
  cardTitle: { color: "#ffffff", fontSize: 15, fontWeight: "700", letterSpacing: 0.2 },
  
  uploadControlsBlock: { gap: 12 },
  customSelectBox: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#1c1917", borderColor: "#27272a", borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  customSelectText: { color: "#ffffff", fontSize: 14, fontWeight: "500" },
  actionButtonsRow: { flexDirection: "row", gap: 10 },

  btnBase: { height: 40, borderRadius: 8, flexDirection: "row", justifyContent: "center", alignItems: "center", paddingHorizontal: 12 },
  btnPrimary: { backgroundColor: "#ffd27a" },
  btnOutline: { backgroundColor: "transparent", borderColor: "#ffd27a40", borderWidth: 1 },
  btnDisabled: { opacity: 0.4 },
  btnText: { fontSize: 13, fontWeight: "700" },

  filterScrollView: { flexDirection: "row", marginBottom: 16 },
  filterPill: { backgroundColor: "#121214", borderColor: "#27272a", borderWidth: 1, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, marginRight: 8 },
  filterPillActive: { backgroundColor: "#ffd27a", borderColor: "#ffd27a" },
  filterPillText: { color: "#a1a1aa", fontSize: 12, fontWeight: "600" },
  filterPillTextActive: { color: "#09090b" },

  stateContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 32, gap: 8 },
  stateMutedText: { color: "#71717a", fontSize: 13, fontWeight: "500" },

  documentRowItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 14, borderWidth: 1, borderRadius: 10, backgroundColor: "#18181b50" },
  itemCompletedBorder: { borderColor: "#ffd27a30", backgroundColor: "#ffd27a06" },
  itemPendingBorder: { borderColor: "#27272a" },
  iconWrapper: { marginRight: 12, justifyContent: "center", alignItems: "center" },
  docItemTitle: { color: "#ffffff", fontSize: 14, fontWeight: "600" },
  
  inlineBadge: { alignSelf: "flex-start", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4 },
  badgeGold: { backgroundColor: "#ffd27a15" },
  badgeDark: { backgroundColor: "#27272a50" },
  inlineBadgeText: { fontSize: 10, fontWeight: "700" },
  downloadIconBtn: { width: 34, height: 34, borderRadius: 8, backgroundColor: "#1c1917", borderColor: "#ffd27a30", borderWidth: 1, justifyContent: "center", alignItems: "center" },

  modalOverlay: { flex: 1, backgroundColor: "#000000aa", justifyContent: "center", alignItems: "center", padding: 24 },
  modalContent: { width: "100%", maxHeigh: width * 1.2, backgroundColor: "#121214", borderColor: "#27272a", borderWidth: 1, borderRadius: 16, padding: 20 },
  modalHeaderTitle: { color: "#ffffff", fontSize: 16, fontWeight: "700", marginBottom: 14, textAlign: "center" },
  modalItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#1e1e21", alignItems: "center" },
  modalItemActive: { backgroundColor: "#ffd27a0a" },
  modalItemText: { color: "#a1a1aa", fontSize: 14, fontWeight: "500" },
  modalCancelClose: { marginTop: 12, paddingVertical: 10, alignItems: "center" },
  modalCancelText: { color: "#71717a", fontSize: 14, fontWeight: "700" }
});