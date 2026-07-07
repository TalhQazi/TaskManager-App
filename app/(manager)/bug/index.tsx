import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  Image,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  Dimensions,
  KeyboardAvoidingView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { apiFetch, toProxiedUrl } from "@/lib/admin/apiClient";

import {
  Bug,
  Upload,
  X,
  ZoomIn,
  ChevronLeft,
  ChevronRight,
  MapPin,
  User,
  Calendar,
  Layers,
  RefreshCw,
} from "lucide-react-native";
import Colors from "@/constants/colors";

type BugStatus = "open" | "closed";

type BugItem = {
  id: string;
  title: string;
  description: string;
  status?: BugStatus;
  taskTitle?: string;
  createdByUsername?: string;
  createdByRole?: string;
  createdAt?: string;
  source?: { panel?: string; path?: string };
  attachments?: { fileName?: string; url?: string; mimeType?: string; size?: number }[];
};

type StatusFilter = "all" | "open" | "closed";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

function toText(v: unknown) {
  return typeof v === "string" ? v : "";
}

// Safely resolve either raw inline Base64 data strings or proxied asset paths
function resolveAttachmentUrl(urlPath: string | undefined): string {
  const urlString = String(urlPath || "");
  if (urlString.startsWith("data:")) {
    return urlString; // Use raw base64 data string directly
  }
  return toProxiedUrl(urlString) ?? ""; // Route standard relative path strings through secure API proxy
}

export default function ManagerBugs() {
  

  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [items, setItems] = useState<BugItem[]>([]);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Lightbox
  const [lightbox, setLightbox] = useState<{ urls: string[]; index: number } | null>(null);

  // View dialog
  const [viewOpen, setViewOpen] = useState(false);
  const [selected, setSelected] = useState<BugItem | null>(null);
  const [updating, setUpdating] = useState(false);

  // Submit dialog
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitTitle, setSubmitTitle] = useState("");
  const [submitDesc, setSubmitDesc] = useState("");
  const [submitFiles, setSubmitFiles] = useState<{ uri: string; base64: string; name: string; type: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const load = async () => {
    const res = await apiFetch<{ items?: any[] }>("/api/bugs");
    const list = Array.isArray(res?.items) ? res.items : [];
    const mapped: BugItem[] = list
      .map((x: any) => ({
        id: String(x.id || x._id || ""),
        title: toText(x.title),
        description: toText(x.description),
        status: (x.status === "closed" ? "closed" : "open") as BugStatus,
        taskTitle: toText(x.taskTitle),
        createdByUsername: toText(x.createdByUsername),
        createdByRole: toText(x.createdByRole),
        createdAt: toText(x.createdAt),
        source: x.source && typeof x.source === "object" ? x.source : undefined,
        attachments: Array.isArray(x.attachments) ? x.attachments : [],
      }))
      .filter((x) => Boolean(x.id));
    setItems(mapped);
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setApiError(null);
        await load();
      } catch (e) {
        if (!mounted) return;
        setApiError(e instanceof Error ? e.message : "Failed to load bugs");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const filtered = useMemo(() => {
    let list = items;
    if (statusFilter !== "all") list = list.filter((b) => b.status === statusFilter);
    const query = q.trim().toLowerCase();
    if (!query) return list;
    return list.filter((b) => {
      const where = `${b.title} ${b.description} ${b.taskTitle || ""} ${b.createdByUsername || ""} ${b.source?.path || ""}`.toLowerCase();
      return where.includes(query);
    });
  }, [items, q, statusFilter]);

  const openCount = items.filter((b) => b.status === "open").length;

  const openBug = async (b: BugItem) => {
    setSelected(b);
    setViewOpen(true);
    try {
      const res = await apiFetch<{ item: BugItem }>(`/api/bugs/${encodeURIComponent(b.id)}`);
      if (res?.item) setSelected((prev) => (prev?.id === b.id ? { ...prev, ...res.item } : prev));
    } catch { /* ignore */ }
  };

  const updateStatus = async (next: BugStatus) => {
    if (!selected) return;
    try {
      setUpdating(true);
      const res = await apiFetch<{ item?: any }>(`/api/bugs/${encodeURIComponent(selected.id)}`, {
        method: "PUT",
        body: JSON.stringify({ status: next }),
      });
      const merged: BugItem = {
        ...selected,
        status: (res?.item?.status === "closed" ? "closed" : "open") as BugStatus,
      };
      setSelected(merged);
      setItems((prev) => prev.map((x) => (x.id === merged.id ? { ...x, status: merged.status } : x)));
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Failed to update bug");
    } finally {
      setUpdating(false);
    }
  };

  const handlePickImage = async () => {
    if (submitFiles.length >= 5) return;

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      setSubmitError("Permission to access camera roll is required.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 5 - submitFiles.length,
      base64: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets) {
      const selectedImages = result.assets.map((asset) => {
        const filename = asset.uri.split("/").pop() || "upload.jpg";
        const extension = filename.split(".").pop();
        const mimeType = asset.mimeType || `image/${extension === "png" ? "png" : "jpeg"}`;
        return {
          uri: asset.uri,
          base64: `data:${mimeType};base64,${asset.base64}`,
          name: filename,
          type: mimeType,
        };
      });
      setSubmitFiles((p) => [...p, ...selectedImages].slice(0, 5));
    }
  };

  const removeFile = (i: number) => {
    setSubmitFiles((p) => p.filter((_, idx) => idx !== i));
  };

  const resetSubmit = () => {
    setSubmitTitle("");
    setSubmitDesc("");
    setSubmitFiles([]);
    setSubmitError(null);
    setSubmitSuccess(null);
  };

  const handleSubmit = async () => {
    if (!submitTitle.trim() || !submitDesc.trim()) {
      setSubmitError("Title and description are required.");
      return;
    }
    try {
      setSubmitting(true);
      setSubmitError(null);
      
      const attachments = submitFiles.map((f) => ({
        fileName: f.name,
        url: f.base64,
        mimeType: f.type,
        size: 0,
      }));

      await apiFetch("/api/bugs", {
        method: "POST",
        body: JSON.stringify({
          title: submitTitle.trim(),
          description: submitDesc.trim(),
          attachments,
          source: { panel: "manager", path: `Mobile App (${Platform.OS})` },
        }),
      });

      setSubmitSuccess("Bug report submitted successfully!");
      await load();
      setTimeout(() => {
        setSubmitOpen(false);
        resetSubmit();
      }, 1200);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Failed to submit bug report.");
    } finally {
      setSubmitting(false);
    }
  };

  const statusTabs: { label: string; value: StatusFilter }[] = [
    { label: `All (${items.length})`, value: "all" },
    { label: `Open (${openCount})`, value: "open" },
    { label: `Closed (${items.length - openCount})`, value: "closed" },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Area */}
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <Bug size={24} color={Colors.golden} style={styles.headerIcon} />
          <Text style={styles.headerTitle}>Bug Reports</Text>
        </View>
        <Text style={styles.headerSubtitle}>
          {openCount > 0 ? `${openCount} open bug${openCount !== 1 ? "s" : ""}.` : "No open bugs."}
        </Text>
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.btn, styles.btnOutline, { flex: 1 }]} onPress={() => void load()}>
            <RefreshCw size={14} color={Colors.surface}  style={{ marginRight: 6 }} />
            <Text style={styles.btnOutlineText}>Refresh</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.btnPrimary, { flex: 1.3 }]} onPress={() => { resetSubmit(); setSubmitOpen(true); }}>
            <Text style={styles.btnPrimaryText}>+ Report Bug</Text>
          </TouchableOpacity>
        </View>
      </View>

      {apiError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{apiError}</Text>
        </View>
      )}

      {/* Control Panel (Search + Status Tabs) */}
      <View style={styles.searchCard}>
        <TextInput
          placeholder="Search bugs..."
          placeholderTextColor="#64748b"
          style={styles.searchInput}
          value={q}
          onChangeText={setQ}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContainer}>
          {statusTabs.map((tab) => {
            const isActive = statusFilter === tab.value;
            return (
              <TouchableOpacity
                key={tab.value}
                onPress={() => setStatusFilter(tab.value)}
                style={[styles.tabButton, isActive && styles.tabButtonActive]}
              >
                <Text style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Primary Data List Component */}
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#0284c7" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No bugs found.</Text>
            </View>
          }
          renderItem={({ item: b }) => {
            const isOpen = b.status !== "closed";
            return (
              <TouchableOpacity style={styles.bugCard} onPress={() => openBug(b)}>
                <View style={styles.cardHeaderRow}>
                  <View style={[styles.badge, isOpen ? styles.badgeOpen : styles.badgeClosed]}>
                    <Text style={[styles.badgeText, isOpen ? styles.badgeTextOpen : styles.badgeTextClosed]}>
                      {isOpen ? "Open" : "Closed"}
                    </Text>
                  </View>
                  <View style={styles.metaRowElement}>
                    <MapPin size={12} color="#64748b" style={{ marginRight: 3 }} />
                    <Text style={styles.metaRowText} numberOfLines={1}>
                      {b.source?.path || b.source?.panel || "System"}
                    </Text>
                  </View>
                </View>

                <Text style={styles.cardTitle}>{b.title}</Text>
                
                {b.taskTitle ? (
                  <View style={styles.taskBadge}>
                    <Layers size={11} color="#0284c7" style={{ marginRight: 4 }} />
                    <Text style={styles.taskBadgeText} numberOfLines={1}>Task: {b.taskTitle}</Text>
                  </View>
                ) : null}

                <Text style={styles.cardDesc} numberOfLines={2}>{b.description}</Text>

                <View style={styles.cardFooter}>
                  <View style={styles.metaRowElement}>
                    <User size={12} color="#64748b" style={{ marginRight: 4 }} />
                    <Text style={styles.footerUserData}>
                      {b.createdByUsername || "Anonymous"}
                      {b.createdByRole ? ` (${b.createdByRole})` : ""}
                    </Text>
                  </View>
                  <View style={styles.metaRowElement}>
                    <Calendar size={12} color="#64748b" style={{ marginRight: 4 }} />
                    <Text style={styles.metaRowText}>
                      {b.createdAt ? new Date(b.createdAt).toLocaleDateString() : "-"}
                    </Text>
                  </View>
                </View>
                {b.attachments && b.attachments.length > 0 ? (
                  <Text style={styles.attachmentMiniIndicator}>📎 {b.attachments.length} Attachment(s)</Text>
                ) : null}
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* View Details Dialog Modal */}
      <Modal visible={viewOpen} animationType="slide" transparent={true} onRequestClose={() => setViewOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={2}>{selected?.title || "Bug Details"}</Text>
              <Text style={styles.modalSubtitle}>
                {selected?.source?.path || selected?.source?.panel || "No source data"}
              </Text>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={true}>
              <View style={styles.cardHeaderRow}>
                <View style={[styles.badge, selected?.status !== "closed" ? styles.badgeOpen : styles.badgeClosed]}>
                  <Text style={[styles.badgeText, selected?.status !== "closed" ? styles.badgeTextOpen : styles.badgeTextClosed]}>
                    {selected?.status === "closed" ? "Closed" : "Open"}
                  </Text>
                </View>
                {selected?.createdByUsername ? (
                  <Text style={styles.metaRowText}>
                    By {selected.createdByUsername} {selected.createdByRole ? `(${selected.createdByRole})` : ""}
                  </Text>
                ) : null}
              </View>

              {selected?.taskTitle ? (
                <View style={[styles.taskBadge, { marginTop: 10 }]}>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: "#0284c7" }}>Linked Task: {selected.taskTitle}</Text>
                </View>
              ) : null}

              <View style={styles.descContainer}>
                <Text style={styles.fullDescText}>{selected?.description}</Text>
              </View>

              {selected?.attachments && selected.attachments.length > 0 ? (
                <View style={{ marginTop: 16 }}>
                  <Text style={styles.sectionLabel}>Attachments ({selected.attachments.length})</Text>
                  <View style={styles.imageGrid}>
                    {selected.attachments.map((att, i) => {
                      const src = resolveAttachmentUrl(att.url);
                      const allUrls = selected.attachments!.map(a => resolveAttachmentUrl(a.url));
                      
                      return (
                        <TouchableOpacity key={i} style={styles.gridImageWrapper} onPress={() => setLightbox({ urls: allUrls, index: i })}>
                          <Image source={{ uri: src }} style={styles.gridImage} />
                          <View style={styles.zoomOverlay}>
                            <ZoomIn size={16} color="#ffffff" />
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ) : null}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={[styles.btn, styles.btnOutline]} onPress={() => setViewOpen(false)} disabled={updating}>
                <Text style={styles.btnOutlineText}>Close</Text>
              </TouchableOpacity>
              {selected?.status === "closed" ? (
                <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={() => void updateStatus("open")} disabled={updating}>
                  <Text style={styles.btnPrimaryText}>Reopen</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={[styles.btn, styles.btnDanger]} onPress={() => void updateStatus("closed")} disabled={updating}>
                  <Text style={styles.btnPrimaryText}>Mark Closed</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Submit Form Dialog Modal */}
      <Modal visible={submitOpen} animationType="slide" transparent={true} onRequestClose={() => setSubmitOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.headerTitleContainer}>
                <Bug size={18} color="#0284c7" style={{ marginRight: 6 }} />
                <Text style={styles.modalTitle}>Report a Bug</Text>
              </View>
              <Text style={styles.modalSubtitle}>Describe the issue you encountered. Screenshots are helpful.</Text>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Title <Text style={{ color: "#ef4444" }}>*</Text></Text>
                <TextInput
                  placeholder="Brief summary of the issue"
                  placeholderTextColor="#94a3b8"
                  style={styles.formInput}
                  value={submitTitle}
                  onChangeText={setSubmitTitle}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Description <Text style={{ color: "#ef4444" }}>*</Text></Text>
                <TextInput
                  placeholder="Steps to reproduce, expected vs actual behavior..."
                  placeholderTextColor="#94a3b8"
                  multiline={true}
                  numberOfLines={4}
                  style={[styles.formInput, styles.formTextArea]}
                  value={submitDesc}
                  onChangeText={setSubmitDesc}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Screenshots (up to 5)</Text>
                <View style={styles.pickerRow}>
                  {submitFiles.map((file, i) => (
                    <View key={i} style={styles.previewImageContainer}>
                      <Image source={{ uri: file.uri }} style={styles.previewImage} />
                      <TouchableOpacity style={styles.removeImageBadge} onPress={() => removeFile(i)}>
                        <X size={10} color="#ffffff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  {submitFiles.length < 5 ? (
                    <TouchableOpacity style={styles.imagePickerButton} onPress={handlePickImage}>
                      <Upload size={18} color="#64748b" />
                      <Text style={styles.imagePickerText}>Add</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>

              {submitError && <Text style={styles.formError}>{submitError}</Text>}
              {submitSuccess && <Text style={styles.formSuccess}>{submitSuccess}</Text>}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={[styles.btn, styles.btnOutline]} onPress={() => { resetSubmit(); setSubmitOpen(false); }} disabled={submitting}>
                <Text style={styles.btnOutlineText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={() => void handleSubmit()} disabled={submitting}>
                <Text style={styles.btnPrimaryText}>{submitting ? "Submitting..." : "Submit Report"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Native Full-Screen Lightbox Paginated Viewer */}
      {lightbox ? (
        <Modal visible={true} transparent={true} animationType="fade">
          <View style={styles.lightboxContainer}>
            <TouchableOpacity style={styles.lightboxClose} onPress={() => setLightbox(null)}>
              <X size={24} color="#ffffff" />
            </TouchableOpacity>

            {lightbox.urls.length > 1 ? (
              <Text style={styles.lightboxCounter}>
                {lightbox.index + 1} / {lightbox.urls.length}
              </Text>
            ) : null}

            {lightbox.urls.length > 1 && lightbox.index > 0 ? (
              <TouchableOpacity
                style={[styles.lightboxNav, { left: 16 }]}
                onPress={() => setLightbox(lb => lb ? { ...lb, index: lb.index - 1 } : null)}
              >
                <ChevronLeft size={28} color="#ffffff" />
              </TouchableOpacity>
            ) : null}

            <Image
              source={{ uri: lightbox.urls[lightbox.index] }}
              style={styles.lightboxImage}
              resizeMode="contain"
            />

            {lightbox.urls.length > 1 && lightbox.index < lightbox.urls.length - 1 ? (
              <TouchableOpacity
                style={[styles.lightboxNav, { right: 16 }]}
                onPress={() => setLightbox(lb => lb ? { ...lb, index: lb.index + 1 } : null)}
              >
                <ChevronRight size={28} color="#ffffff" />
              </TouchableOpacity>
            ) : null}
          </View>
        </Modal>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerIcon: {
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.golden ,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 4,
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  btn: {
    height: 40,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  btnOutline: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  btnOutlineText: {
    color: Colors.surface ,
    fontSize: 14,
    fontWeight: "500",
  },
  btnPrimary: {
    backgroundColor: "#0284c7",
  },
  btnPrimaryText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "500",
  },
  btnDanger: {
    backgroundColor: "#ef4444",
  },
  errorBanner: {
    margin: 16,
    padding: 12,
    backgroundColor: "#fee2e2",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#fca5a5",
  },
  errorText: {
    color: "#b91c1c",
    fontSize: 13,
  },
  searchCard: {
    backgroundColor: Colors.background,
    marginHorizontal: 16,
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  searchInput: {
    height: 40,
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: Colors.text ,
  },
  tabsContainer: {
    flexDirection: "row",
    gap: 6,
    marginTop: 10,
    paddingBottom: 2,
  },
  tabButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#f1f5f9",
  },
  tabButtonActive: {
    backgroundColor: "#0284c7",
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#475569",
  },
  tabButtonTextActive: {
    color: "#ffffff",
  },
  loaderContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyText: {
    color: "#64748b",
    fontSize: 14,
    fontStyle: "italic",
  },
  bugCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 6,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeOpen: {
    backgroundColor: "#e0f2fe",
  },
  badgeClosed: {
    backgroundColor: "#f1f5f9",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  badgeTextOpen: {
    color: "#0369a1",
  },
  badgeTextClosed: {
    color: "#475569",
  },
  metaRowElement: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaRowText: {
    fontSize: 11,
    color: Colors.surface,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.surface ,
    lineHeight: 20,
  },
  taskBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f9ff",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  taskBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#0284c7",
  },
  cardDesc: {
    fontSize: 13,
    color: Colors.textTertiary,
    lineHeight: 18,
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 10,
    marginTop: 4,
  },
  footerUserData: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.surface,
  },
  attachmentMiniIndicator: {
    fontSize: 11,
    color: "#0284c7",
    fontWeight: "600",
    backgroundColor: "#f0f9ff",
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "85%",
    paddingBottom: Platform.OS === "ios" ? 34 : 24,
  },
  modalHeader: {
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.surface ,
  },
  modalSubtitle: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  modalBody: {
    padding: 16,
  },
  descContainer: {
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginTop: 12,
  },
  fullDescText: {
    fontSize: 13,
    color: "#1e293b",
    lineHeight: 20,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.surface ,
    marginBottom: 8,
  },
  imageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  gridImageWrapper: {
    width: (SCREEN_WIDTH - 40) / 2,
    aspectRatio: 1.5,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    position: "relative",
  },
  gridImage: {
    width: "100%",
    height: "100%",
  },
  zoomOverlay: {
    position: "absolute",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  formGroup: {
    marginBottom: 14,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  formInput: {
    height: 40,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 6,
    paddingHorizontal: 10,
    fontSize: 14,
    color: Colors.text ,
  },
  formTextArea: {
    height: 100,
    paddingTop: 8,
    textAlignVertical: "top",
  },
  pickerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingTop: 4,
  },
  previewImageContainer: {
    width: 64,
    height: 64,
    borderRadius: 6,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    position: "relative",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  removeImageBadge: {
    position: "absolute",
    top: 2,
    right: 2,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 10,
    width: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  imagePickerButton: {
    width: 64,
    height: 64,
    borderRadius: 6,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  imagePickerText: {
    fontSize: 9,
    fontWeight: "500",
    color: "#64748b",
  },
  formError: {
    fontSize: 12,
    color: "#ef4444",
    fontWeight: "500",
  },
  formSuccess: {
    fontSize: 12,
    color: "#16a34a",
    fontWeight: "500",
  },
  lightboxContainer: {
    flex: 1,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
  },
  lightboxImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.8,
  },
  lightboxClose: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 20,
    right: 20,
    zIndex: 10,
    padding: 8,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 20,
  },
  lightboxCounter: {
    position: "absolute",
    top: Platform.OS === "ios" ? 56 : 26,
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    fontWeight: "600",
  },
  lightboxNav: {
    position: "absolute",
    top: "50%",
    transform: [{ translateY: -20 }],
    zIndex: 10,
    padding: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 24,
  },
});