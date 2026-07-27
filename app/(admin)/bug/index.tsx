import React, { useEffect, useMemo, useState, useCallback } from "react";
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
import { usePathname } from "expo-router";
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
import { apiFetch } from "@/lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";
import { s } from "@/util/styles";

type BugStatus = "open" | "closed";

type BugItem = {
  id: string;
  title: string;
  description: string;
  status: BugStatus;
  taskTitle?: string;
  createdByUsername?: string;
  createdByRole?: string;
  createdAt?: string;
  source?: { panel?: string; path?: string };
  attachments?: { fileName?: string; url?: string; mimeType?: string; size?: number }[];
};

type StatusFilter = "all" | "open" | "closed";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const GRID_IMAGE_WIDTH = (SCREEN_WIDTH - 40) / 2;

function toText(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function resolveAttachmentUrl(urlPath: string | undefined): string | null {
  if (!urlPath || typeof urlPath !== "string" || urlPath.trim() === "") return null;
  return urlPath;
}

function buildColors(uiTheme: any, isDark: boolean) {
  return {
    background:      uiTheme.panelColors?.dashboardBackground     || (isDark ? "#09090b" : "#F8FAFC"),
    cardBg:          uiTheme.panelColors?.dashboardCardBackground || (isDark ? "#18181b" : "#FFFFFF"),
    text:            uiTheme.panelColors?.dashboardTextColor      || (isDark ? "#F4F4F5" : "#0F172A"),
    textSecondary:   isDark ? "#A1A1AA" : "#475569",
    textMuted:       isDark ? "#71717A" : "#64748B",
    border:          isDark ? "#27272A" : "#E2E8F0",
    borderLight:     isDark ? "rgba(255,255,255,0.05)" : "#F1F5F9",
    inputBg:         isDark ? "#09090b" : "#F1F5F9",
    primary:         uiTheme.customColors?.primary || (isDark ? "#3b82f6" : "#0284c7"),
    primaryBgLight:  "rgba(2, 132, 199, 0.1)",
    primaryBorder:   "rgba(2, 132, 199, 0.25)",
    golden:          uiTheme.customColors?.golden || "#B45309",
    success:         isDark ? "#34D399" : "#16a34a",
    danger:          isDark ? "#F87171" : "#ef4444",
    dangerBg:        isDark ? "rgba(239, 68, 68, 0.15)" : "#fee2e2",
    dangerBorder:    isDark ? "rgba(239, 68, 68, 0.3)" : "#fca5a5",
    badgeOpenBg:     isDark ? "rgba(56, 189, 248, 0.15)" : "#e0f2fe",
    badgeOpenText:   isDark ? "#38bdf8" : "#0369a1",
    badgeClosedBg:   isDark ? "rgba(113, 113, 122, 0.15)" : "#f1f5f9",
    badgeClosedText: isDark ? "#a1a1aa" : "#475569",
    overlayBg:       "rgba(0, 0, 0, 0.5)",
    modalPanelBg:    isDark ? "#18181b" : "#ffffff",
    previewBg:       isDark ? "#09090b" : "#f8fafc",
  };
}

function createStyles(colors: ReturnType<typeof buildColors>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 16,
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
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
      fontWeight: "800",
      color: colors.text,
      letterSpacing: -0.5,
    },
    headerSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
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
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    btnOutlineText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "500",
    },
    btnPrimary: {
      backgroundColor: colors.primary,
    },
    btnPrimaryText: {
      color: "#ffffff",
      fontSize: 14,
      fontWeight: "500",
    },
    btnDanger: {
      backgroundColor: colors.danger,
    },
    errorBanner: {
      margin: 16,
      padding: 12,
      backgroundColor: colors.dangerBg,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.dangerBorder,
    },
    errorText: {
      color: colors.danger,
      fontSize: 13,
    },
    searchCard: {
      backgroundColor: colors.cardBg,
      marginHorizontal: 16,
      marginTop: 14,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchInput: {
      height: 40,
      backgroundColor: colors.inputBg,
      borderRadius: 8,
      paddingHorizontal: 12,
      fontSize: 14,
      color: colors.text,
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
      backgroundColor: colors.inputBg,
    },
    tabButtonActive: {
      backgroundColor: colors.primary,
    },
    tabButtonText: {
      fontSize: 12,
      fontWeight: "500",
      color: colors.textSecondary,
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
      color: colors.textMuted,
      fontSize: 14,
      fontStyle: "italic",
    },
    bugCard: {
      backgroundColor: colors.cardBg,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
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
      backgroundColor: colors.badgeOpenBg,
    },
    badgeClosed: {
      backgroundColor: colors.badgeClosedBg,
    },
    badgeText: {
      fontSize: 10,
      fontWeight: "700",
      textTransform: "uppercase",
    },
    badgeTextOpen: {
      color: colors.badgeOpenText,
    },
    badgeTextClosed: {
      color: colors.badgeClosedText,
    },
    metaRowElement: {
      flexDirection: "row",
      alignItems: "center",
    },
    metaRowText: {
      fontSize: 11,
      color: colors.textSecondary,
    },
    cardTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.text,
      lineHeight: 20,
    },
    taskBadge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.primaryBgLight,
      alignSelf: "flex-start",
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.primaryBorder,
    },
    taskBadgeText: {
      fontSize: 11,
      fontWeight: "600",
      color: colors.primary,
    },
    cardDesc: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
      marginTop: 2,
    },
    cardFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
      paddingTop: 10,
      marginTop: 4,
    },
    footerUserData: {
      fontSize: 11,
      fontWeight: "600",
      color: colors.text,
    },
    attachmentMiniIndicator: {
      fontSize: 11,
      color: colors.primary,
      fontWeight: "600",
      backgroundColor: colors.primaryBgLight,
      alignSelf: "flex-start",
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      marginTop: 4,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.overlayBg,
      justifyContent: "flex-end",
    },
    modalContent: {
      backgroundColor: colors.modalPanelBg,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: "85%",
      paddingBottom: Platform.OS === "ios" ? 34 : 24,
    },
    modalHeader: {
      padding: 18,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      fontSize: 17,
      fontWeight: "700",
      color: colors.text,
    },
    modalSubtitle: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    modalBody: {
      padding: 16,
    },
    descContainer: {
      backgroundColor: colors.previewBg,
      borderRadius: 10,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
      marginTop: 12,
    },
    fullDescText: {
      fontSize: 13,
      color: colors.text,
      lineHeight: 20,
    },
    sectionLabel: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 8,
    },
    imageGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    gridImageWrapper: {
      width: GRID_IMAGE_WIDTH,
      aspectRatio: 1.5,
      borderRadius: 8,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: colors.border,
      position: "relative",
    },
    gridImage: {
      width: GRID_IMAGE_WIDTH,
      height: "100%",
    },
    zoomOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
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
      borderTopColor: colors.border,
    },
    formGroup: {
      marginBottom: 14,
    },
    formLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.textSecondary,
      textTransform: "uppercase",
      marginBottom: 4,
    },
    formInput: {
      height: 40,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 6,
      paddingHorizontal: 10,
      fontSize: 14,
      color: colors.text,
      backgroundColor: colors.cardBg,
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
      borderColor: colors.border,
      position: "relative",
    },
    previewImage: {
      width: 64,
      height: 64,
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
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
      gap: 2,
      backgroundColor: colors.cardBg,
    },
    imagePickerText: {
      fontSize: 9,
      fontWeight: "500",
      color: colors.textSecondary,
    },
    formError: {
      fontSize: 12,
      color: colors.danger,
      fontWeight: "500",
    },
    formSuccess: {
      fontSize: 12,
      color: colors.success,
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
}

export default function ManagerBugs() {
  const { uiTheme } = useTheme();
  const currentPathname = usePathname();
  const isDark = (uiTheme.theme as string) === "dark" || (uiTheme.theme as string) === "metallic-elite";
  const colors = useMemo(() => buildColors(uiTheme, isDark), [uiTheme, isDark]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [items, setItems] = useState<BugItem[]>([]);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [lightbox, setLightbox] = useState<{ urls: string[]; index: number } | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [selected, setSelected] = useState<BugItem | null>(null);
  const [updating, setUpdating] = useState(false);

  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitTitle, setSubmitTitle] = useState("");
  const [submitDesc, setSubmitDesc] = useState("");
  const [submitFiles, setSubmitFiles] = useState<{ uri: string; base64: string; name: string; type: string; size: number }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    let mounted = true;
    const initialize = async () => {
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
    };
    initialize();
    return () => { mounted = false; };
  }, [load]);

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

  const openCount = useMemo(() => items.filter((b) => b.status === "open").length, [items]);

  const openBug = async (b: BugItem) => {
    setSelected(b);
    setViewOpen(true);
    try {
      const res = await apiFetch<{ item: BugItem }>(`/api/bugs/${encodeURIComponent(b.id)}`);
      if (res?.item) setSelected((prev) => (prev?.id === b.id ? { ...prev, ...res.item } : prev));
    } catch { 
      // Safe boundary fallback
    }
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
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
          base64: `data:${mimeType};base64,${asset.base64 || ""}`,
          name: filename,
          type: mimeType,
          size: asset.fileSize || 0,
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
    setSubmitting(true);
    setSubmitError(null);
    try {
      const attachments = submitFiles.map((f) => ({
        fileName: f.name,
        url: f.base64,
        mimeType: f.type,
        size: f.size,
      }));

      await apiFetch("/api/bugs", {
        method: "POST",
        body: JSON.stringify({
          title: submitTitle.trim(),
          description: submitDesc.trim(),
          attachments,
          source: { 
            panel: "admin", 
            path: `Mobile App (${Platform.OS}) - ${currentPathname || "/admin/bugs"}` 
          },
        }),
      });

      setSubmitSuccess("Your bug report has been sent successfully!");
      await load();
      setTimeout(() => {
        setSubmitOpen(false);
        resetSubmit();
      }, 1200);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Failed to submit.");
    } finally {
      setSubmitting(false);
    }
  };

  const statusTabs = useMemo((): { label: string; value: StatusFilter }[] => [
    { label: `All (${items.length})`, value: "all" },
    { label: `Open (${openCount})`, value: "open" },
    { label: `Closed (${items.length - openCount})`, value: "closed" },
  ], [items.length, openCount]);

  return (
    <SafeAreaView style={s(styles.container)}>
      <View style={s(styles.header)}>
        <View style={s(styles.headerTitleContainer)}>
          <Bug size={24} color={colors.golden} style={s(styles.headerIcon)} />
          <Text style={s(styles.headerTitle)}>Bug Reports</Text>
        </View>
        <Text style={s(styles.headerSubtitle)}>
          {openCount > 0 ? `${openCount} open bug${openCount !== 1 ? "s" : ""}.` : "No open bugs."}
        </Text>
        <View style={s(styles.actionRow)}>
          <TouchableOpacity style={s([styles.btn, styles.btnOutline, { flex: 1 }])} onPress={() => void load()}>
            <RefreshCw size={14} color={colors.text} style={s({ marginRight: 6 })} />
            <Text style={s(styles.btnOutlineText)}>Refresh</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s([styles.btn, styles.btnPrimary, { flex: 1.3 }])} onPress={() => { resetSubmit(); setSubmitOpen(true); }}>
            <Text style={s(styles.btnPrimaryText)}>+ Report Bug</Text>
          </TouchableOpacity>
        </View>
      </View>

      {apiError && (
        <View style={s(styles.errorBanner)}>
          <Text style={s(styles.errorText)}>{apiError}</Text>
        </View>
      )}

      <View style={s(styles.searchCard)}>
        <TextInput
          placeholder="Search bugs..."
          placeholderTextColor={colors.textMuted}
          style={s(styles.searchInput)}
          value={q}
          onChangeText={setQ}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s(styles.tabsContainer)}>
          {statusTabs.map((tab) => {
            const isActive = statusFilter === tab.value;
            return (
              <TouchableOpacity
                key={tab.value}
                onPress={() => setStatusFilter(tab.value)}
                style={s([styles.tabButton, isActive && styles.tabButtonActive])}
              >
                <Text style={s([styles.tabButtonText, isActive && styles.tabButtonTextActive])}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={s(styles.loaderContainer)}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s(styles.listContent)}
          ListEmptyComponent={
            <View style={s(styles.emptyContainer)}>
              <Text style={s(styles.emptyText)}>No bugs found.</Text>
            </View>
          }
          renderItem={({ item: b }) => {
            const isOpen = b.status !== "closed";
            return (
              <TouchableOpacity style={s(styles.bugCard)} onPress={() => openBug(b)}>
                <View style={s(styles.cardHeaderRow)}>
                  <View style={s([styles.badge, isOpen ? styles.badgeOpen : styles.badgeClosed])}>
                    <Text style={s([styles.badgeText, isOpen ? styles.badgeTextOpen : styles.badgeTextClosed])}>
                      {isOpen ? "Open" : "Closed"}
                    </Text>
                  </View>
                  <View style={s(styles.metaRowElement)}>
                    <MapPin size={12} color={colors.textMuted} style={s({ marginRight: 3 })} />
                    <Text style={s(styles.metaRowText)} numberOfLines={1}>
                      {b.source?.path || b.source?.panel || "System"}
                    </Text>
                  </View>
                </View>

                <Text style={s(styles.cardTitle)}>{b.title}</Text>
                
                {b.taskTitle ? (
                  <View style={s(styles.taskBadge)}>
                    <Layers size={11} color={colors.primary} style={s({ marginRight: 4 })} />
                    <Text style={s(styles.taskBadgeText)} numberOfLines={1}>Task: {b.taskTitle}</Text>
                  </View>
                ) : null}

                <Text style={s(styles.cardDesc)} numberOfLines={2}>{b.description}</Text>

                <View style={s(styles.cardFooter)}>
                  <View style={s(styles.metaRowElement)}>
                    <User size={12} color={colors.textMuted} style={s({ marginRight: 4 })} />
                    <Text style={s(styles.footerUserData)}>
                      {b.createdByUsername || "Anonymous"}
                      {b.createdByRole ? ` (${b.createdByRole})` : ""}
                    </Text>
                  </View>
                  <View style={s(styles.metaRowElement)}>
                    <Calendar size={12} color={colors.textMuted} style={s({ marginRight: 4 })} />
                    <Text style={s(styles.metaRowText)}>
                      {b.createdAt ? new Date(b.createdAt).toLocaleDateString() : "-"}
                    </Text>
                  </View>
                </View>
                {b.attachments && b.attachments.length > 0 ? (
                  <Text style={s(styles.attachmentMiniIndicator)}>📎 {b.attachments.length} Attachment(s)</Text>
                ) : null}
              </TouchableOpacity>
            );
          }}
        />
      )}

      <Modal visible={viewOpen} animationType="slide" transparent={true} onRequestClose={() => setViewOpen(false)}>
        <View style={s(styles.modalOverlay)}>
          <View style={s(styles.modalContent)}>
            <View style={s(styles.modalHeader)}>
              <Text style={s(styles.modalTitle)} numberOfLines={2}>{selected?.title || "Bug Details"}</Text>
              <Text style={s(styles.modalSubtitle)}>
                {selected?.source?.path || selected?.source?.panel || "No source data"}
              </Text>
            </View>

            <ScrollView style={s(styles.modalBody)} showsVerticalScrollIndicator={true}>
              <View style={s(styles.cardHeaderRow)}>
                <View style={s([styles.badge, selected?.status !== "closed" ? styles.badgeOpen : styles.badgeClosed])}>
                  <Text style={s([styles.badgeText, selected?.status !== "closed" ? styles.badgeTextOpen : styles.badgeTextClosed])}>
                    {selected?.status === "closed" ? "Closed" : "Open"}
                  </Text>
                </View>
                {selected?.createdByUsername ? (
                  <Text style={s(styles.metaRowText)}>
                    By {selected.createdByUsername} {selected.createdByRole ? `(${selected.createdByRole})` : ""}
                  </Text>
                ) : null}
              </View>

              {selected?.taskTitle ? (
                <View style={s([styles.taskBadge, { marginTop: 10 }])}>
                  <Text style={s({ fontSize: 12, fontWeight: "600", color: colors.primary })}>Linked Task: {selected.taskTitle}</Text>
                </View>
              ) : null}

              <View style={s(styles.descContainer)}>
                <Text style={s(styles.fullDescText)}>{selected?.description}</Text>
              </View>

              {selected?.attachments && selected.attachments.length > 0 ? (
                <View style={s({ marginTop: 16 })}>
                  <Text style={s(styles.sectionLabel)}>Attachments ({selected.attachments.length})</Text>
                  <View style={s(styles.imageGrid)}>
                    {selected.attachments.map((att, i) => {
                      const src = resolveAttachmentUrl(att.url);
                      if (!src) return null;
                      
                      const allUrls = selected.attachments!
                        .map(a => resolveAttachmentUrl(a.url))
                        .filter((u): u is string => u !== null);
                      
                      return (
                        <TouchableOpacity key={i} style={s(styles.gridImageWrapper)} onPress={() => setLightbox({ urls: allUrls, index: i })}>
                          <Image source={{ uri: src }} style={s(styles.gridImage)} />
                          <View style={s(styles.zoomOverlay)}>
                            <ZoomIn size={16} color="#ffffff" />
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ) : null}
            </ScrollView>

            <View style={s(styles.modalFooter)}>
              <TouchableOpacity style={s([styles.btn, styles.btnOutline])} onPress={() => setViewOpen(false)} disabled={updating}>
                <Text style={s(styles.btnOutlineText)}>Close</Text>
              </TouchableOpacity>
              {selected?.status === "closed" ? (
                <TouchableOpacity style={s([styles.btn, styles.btnPrimary])} onPress={() => void updateStatus("open")} disabled={updating}>
                  <Text style={s(styles.btnPrimaryText)}>Reopen</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={s([styles.btn, styles.btnDanger])} onPress={() => void updateStatus("closed")} disabled={updating}>
                  <Text style={s(styles.btnPrimaryText)}>Mark Closed</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={submitOpen} animationType="slide" transparent={true} onRequestClose={() => setSubmitOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={s(styles.modalOverlay)}>
          <View style={s(styles.modalContent)}>
            <View style={s(styles.modalHeader)}>
              <View style={s(styles.headerTitleContainer)}>
                <Bug size={18} color={colors.primary} style={s({ marginRight: 6 })} />
                <Text style={s(styles.modalTitle)}>Report a Bug</Text>
              </View>
              <Text style={s(styles.modalSubtitle)}>Describe the issue you encountered. Screenshots are helpful.</Text>
            </View>

            <ScrollView style={s(styles.modalBody)}>
              <View style={s(styles.formGroup)}>
                <Text style={s(styles.formLabel)}>Title <Text style={s({ color: colors.danger })}>*</Text></Text>
                <TextInput
                  placeholder="Brief summary of the issue"
                  placeholderTextColor={colors.textMuted}
                  style={s(styles.formInput)}
                  value={submitTitle}
                  onChangeText={setSubmitTitle}
                />
              </View>

              <View style={s(styles.formGroup)}>
                <Text style={s(styles.formLabel)}>Description <Text style={s({ color: colors.danger })}>*</Text></Text>
                <TextInput
                  placeholder="Steps to reproduce, expected vs actual behavior..."
                  placeholderTextColor={colors.textMuted}
                  multiline={true}
                  numberOfLines={4}
                  style={s([styles.formInput, styles.formTextArea])}
                  value={submitDesc}
                  onChangeText={setSubmitDesc}
                />
              </View>

              <View style={s(styles.formGroup)}>
                <Text style={s(styles.formLabel)}>Screenshots (up to 5)</Text>
                <View style={s(styles.pickerRow)}>
                  {submitFiles.map((file, i) => (
                    <View key={i} style={s(styles.previewImageContainer)}>
                      <Image source={{ uri: file.uri }} style={s(styles.previewImage)} />
                      <TouchableOpacity style={s(styles.removeImageBadge)} onPress={() => removeFile(i)}>
                        <X size={10} color="#ffffff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  {submitFiles.length < 5 ? (
                    <TouchableOpacity style={s(styles.imagePickerButton)} onPress={handlePickImage}>
                      <Upload size={18} color={colors.textSecondary} />
                      <Text style={s(styles.imagePickerText)}>Add</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>

              {submitError && <Text style={s(styles.formError)}>{submitError}</Text>}
              {submitSuccess && <Text style={s(styles.formSuccess)}>{submitSuccess}</Text>}
            </ScrollView>

            <View style={s(styles.modalFooter)}>
              <TouchableOpacity style={s([styles.btn, styles.btnOutline])} onPress={() => { resetSubmit(); setSubmitOpen(false); }} disabled={submitting}>
                <Text style={s(styles.btnOutlineText)}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s([styles.btn, styles.btnPrimary])} onPress={() => void handleSubmit()} disabled={submitting}>
                <Text style={s(styles.btnPrimaryText)}>{submitting ? "Submitting..." : "Submit Report"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {lightbox ? (
        <Modal visible={true} transparent={true} animationType="fade">
          <View style={s(styles.lightboxContainer)}>
            <TouchableOpacity style={s(styles.lightboxClose)} onPress={() => setLightbox(null)}>
              <X size={24} color="#ffffff" />
            </TouchableOpacity>

            {lightbox.urls.length > 1 ? (
              <Text style={s(styles.lightboxCounter)}>
                {lightbox.index + 1} / {lightbox.urls.length}
              </Text>
            ) : null}

            {lightbox.urls.length > 1 && lightbox.index > 0 ? (
              <TouchableOpacity
                style={s([styles.lightboxNav, { left: 16 }])}
                onPress={() => setLightbox(lb => lb ? { ...lb, index: lb.index - 1 } : null)}
              >
                <ChevronLeft size={28} color="#ffffff" />
              </TouchableOpacity>
            ) : null}

            <Image
              source={{ uri: lightbox.urls[lightbox.index] }}
              style={s(styles.lightboxImage)}
              resizeMode="contain"
            />

            {lightbox.urls.length > 1 && lightbox.index < lightbox.urls.length - 1 ? (
              <TouchableOpacity
                style={s([styles.lightboxNav, { right: 16 }])}
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