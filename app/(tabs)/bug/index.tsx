import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Image,
  FlatList,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { apiFetch } from "../../../lib/admin/apiClient"; // Keep your existing paths

import { useAuth } from '@/contexts/AuthContext';


// --- Premium Aesthetic ---
const COLORS = {
  background: "#09090b",
  card: "#18181b",
  primary: "#ffd27a",
  text: "#ffffff",
  textMuted: "#a1a1aa",
  border: "#27272a",
  error: "#ef4444",
};

// --- Types ---
type BugStatus = "open" | "closed";
type StatusFilter = "all" | "open" | "closed";
type BugItem = {
  id: string; title: string; description: string; status?: BugStatus;
  taskTitle?: string; createdByUsername?: string; createdByRole?: string;
  createdAt?: string; source?: { panel?: string; path?: string };
  attachments?: { fileName?: string; url?: string; mimeType?: string; size?: number }[];
};

export default function EmployeeBugs() {
  const auth = useAuth();
  console.log('lkdkjfd',auth);
  const currentUsername = auth?.user?.fullName || "";

  // State
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<BugItem[]>([]);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [viewOpen, setViewOpen] = useState(false);
  const [selected, setSelected] = useState<BugItem | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  // Submit State
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitTitle, setSubmitTitle] = useState("");
  const [submitDesc, setSubmitDesc] = useState("");
  const [submitFiles, setSubmitFiles] = useState<ImagePicker.ImagePickerAsset[]>([]);

  // --- Logic ---
const load = async () => {
  try {
    setApiError(null);
    const res = await apiFetch<{ items?: any[] }>("/api/bugs");
    
    const list = Array.isArray(res?.items) ? res.items : [];
    setItems(list.map((x: any) => ({
      id: String(x.id || x._id || ""),
      title: x.title || "",
      description: x.description || "",
      status: x.status === "closed" ? "closed" : "open",
      attachments: Array.isArray(x.attachments) ? x.attachments : [],
      createdAt: x.createdAt,
      createdByUsername: x.createdByUsername
    })));
  } catch (e: any) {
    // 1. Debugging: Check the structure of your error object in the console
    console.log("Full Error Object:", JSON.stringify(e, null, 2));

    // 2. Extract the actual message:
    // Some API wrappers store the backend error in e.response.data.message or e.response.data.error
    const serverErrorMessage = 
      e?.response?.data?.message || 
      e?.response?.data?.error || 
      e?.data?.message || 
      e?.message;

    setApiError(serverErrorMessage || "Failed to load bugs. Please try again.");
  } finally {
    setLoading(false);
  }
};

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return items.filter((b) => {
      const matchesStatus = statusFilter === "all" || b.status === statusFilter;
      const matchesSearch = !q || b.title.toLowerCase().includes(q.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [items, q, statusFilter]);

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.5,
    });
    if (!result.canceled) setSubmitFiles([...submitFiles, result.assets[0]]);
  };

  return (
    <View style={styles.container}>

      {apiError && (
      <View style={styles.errorBanner}>
        <MaterialCommunityIcons name="alert-circle" size={20} color="#f87171" />
        <Text style={styles.errorText}>{apiError}</Text>
      </View>
    )}

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Bug Reports</Text>
        <TouchableOpacity style={styles.btnPrimary} onPress={() => setSubmitOpen(true)}>
          <Text style={styles.btnText}>+ Report Bug</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Bar */}
      <View style={styles.filterBar}>
        <TextInput 
          style={styles.searchInput} 
          placeholder="Search bugs..." 
          placeholderTextColor={COLORS.textMuted}
          value={q} 
          onChangeText={setQ} 
        />
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => { setSelected(item); setViewOpen(true); }}>
            <View style={styles.row}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <View style={[styles.badge, { backgroundColor: item.status === "open" ? "#22c55e" : COLORS.border }]}>
                <Text style={{ color: COLORS.text, fontSize: 10 }}>{item.status}</Text>
              </View>
            </View>
            <Text style={styles.textMuted}>{item.description}</Text>
          </TouchableOpacity>
        )}
      />

      {/* Detail Modal */}
      <Modal visible={viewOpen} animationType="slide">
        <View style={styles.modalContainer}>
          <Text style={styles.title}>{selected?.title}</Text>
          <Text style={[styles.textMuted, { marginBottom: 20 }]}>{selected?.description}</Text>
          <TouchableOpacity style={styles.btnSecondary} onPress={() => setViewOpen(false)}>
            <Text style={{ color: COLORS.text }}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Submit Modal */}
      <Modal visible={submitOpen} animationType="slide">
        <View style={styles.modalContainer}>
          <Text style={styles.title}>New Report</Text>
          <TextInput style={styles.input} placeholder="Title" placeholderTextColor={COLORS.textMuted} value={submitTitle} onChangeText={setSubmitTitle} />
          <TextInput style={[styles.input, { height: 100 }]} placeholder="Description" placeholderTextColor={COLORS.textMuted} value={submitDesc} onChangeText={setSubmitDesc} multiline />
          <TouchableOpacity style={styles.btnPrimary} onPress={handlePickImage}><Text style={styles.btnText}>Add Attachment</Text></TouchableOpacity>
          <View style={{ height: 20 }} />
          <TouchableOpacity style={styles.btnSecondary} onPress={() => setSubmitOpen(false)}><Text style={{ color: COLORS.text }}>Cancel</Text></TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, paddingTop: 50 },
  title: { fontSize: 24, fontWeight: "800", color: COLORS.text },
  filterBar: { paddingHorizontal: 16 },
  searchInput: { backgroundColor: COLORS.card, color: COLORS.text, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border },
  card: { backgroundColor: COLORS.card, padding: 16, borderRadius: 12, marginVertical: 8, borderWidth: 1, borderColor: COLORS.border },
  cardTitle: { color: COLORS.text, fontSize: 16, fontWeight: "600" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  textMuted: { color: COLORS.textMuted, fontSize: 14 },
  modalContainer: { flex: 1, backgroundColor: COLORS.background, padding: 40 },
  input: { backgroundColor: COLORS.card, color: COLORS.text, padding: 16, borderRadius: 8, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border },
  btnPrimary: { backgroundColor: COLORS.primary, padding: 12, borderRadius: 8, alignItems: "center" },
  btnSecondary: { backgroundColor: COLORS.border, padding: 12, borderRadius: 8, alignItems: "center" },
  btnText: { color: COLORS.background, fontWeight: "700" },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#450a0a", // Deep Red background
    padding: 16,
    margin: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#7f1d1d", // Border to match
  },
  errorText: {
    color: "#fecaca", // Light red text for contrast
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
});