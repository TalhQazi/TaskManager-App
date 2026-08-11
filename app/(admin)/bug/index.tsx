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
  useWindowDimensions,
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

function toText(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function resolveAttachmentUrl(urlPath: string | undefined): string | null {
  if (!urlPath || typeof urlPath !== "string" || urlPath.trim() === "") return null;
  return urlPath;
}

function buildColors(uiTheme: any, isDark: boolean) {
  const bg = uiTheme?.panelColors?.dashboardBackground || (isDark ? "#09090b" : "#f8fafc");
  const cardBg = uiTheme?.panelColors?.dashboardCardBackground || (isDark ? "#141417" : "#ffffff");
  const text = uiTheme?.panelColors?.dashboardTextColor || (isDark ? "#f4f4f5" : "#0f172a");
  const textSecondary = isDark ? "#9ca3af" : "#475569";
  const textMuted = isDark ? "#71717a" : "#64748b";
  const border = uiTheme?.panelColors?.borderColor || (isDark ? "rgba(255, 255, 255, 0.08)" : "#e2e8f0");
  const primary = uiTheme?.customColors?.primary || (isDark ? "#3b82f6" : "#0284c7");
  const inputBg = isDark ? "#1e293b" : "#f1f5f9";

  return {
    background: bg,
    cardBg: cardBg,
    text: text,
    textSecondary: textSecondary,
    textMuted: textMuted,
    border: border,
    borderLight: isDark ? "rgba(255, 255, 255, 0.05)" : "#f1f5f9",
    inputBg: inputBg,
    primary: primary,
    primaryBgLight: isDark ? "rgba(59, 130, 246, 0.15)" : "rgba(2, 132, 199, 0.1)",
    primaryBorder: isDark ? "rgba(59, 130, 246, 0.3)" : "rgba(2, 132, 199, 0.25)",
    golden: uiTheme?.customColors?.golden || "#b45309",
    success: isDark ? "#34d399" : "#16a34a",
    danger: isDark ? "#f87171" : "#ef4444",
    dangerBg: isDark ? "rgba(239, 68, 68, 0.15)" : "#fee2e2",
    dangerBorder: isDark ? "rgba(239, 68, 68, 0.3)" : "#fca5a5",
    badgeOpenBg: isDark ? "rgba(56, 189, 248, 0.15)" : "#e0f2fe",
    badgeOpenText: isDark ? "#38bdf8" : "#0369a1",
    badgeClosedBg: isDark ? "rgba(113, 113, 122, 0.15)" : "#f1f5f9",
    badgeClosedText: isDark ? "#a1a1aa" : "#475569",
    overlayBg: "rgba(0, 0, 0, 0.85)",
    modalPanelBg: isDark ? "#0f172a" : "#ffffff",
    previewBg: isDark ? "#1e293b" : "#f8fafc",
    modalText: isDark ? "#f8fafc" : "#0f172a",
    modalTextSecondary: isDark ? "#94a3b8" : "#64748b",
    modalBorder: isDark ? "rgba(255, 255, 255, 0.12)" : "#e2e8f0",
  };
}

export default function ManagerBugs() {
  const { width, height } = useWindowDimensions();
  const wp = useCallback((percentage: number) => (width * percentage) / 100, [width]);
  const hp = useCallback((percentage: number) => (height * percentage) / 100, [height]);
  const isTablet = width >= 768;
  const isSmallScreen = width < 375;

  const { uiTheme } = useTheme();
  const currentPathname = usePathname();
  const isDark = (uiTheme.theme as string) === "dark" || (uiTheme.theme as string) === "metallic-elite";
  const colors = useMemo(() => buildColors(uiTheme, isDark), [uiTheme, isDark]);
  const styles = useMemo(
    () => createStyles(colors, wp, hp, isTablet, isSmallScreen, height, width),
    [colors, wp, hp, isTablet, isSmallScreen, height, width]
  );

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
    <SafeAreaView style={[s(styles.container), { backgroundColor: colors.background }]}>
      <View style={s(styles.header)}>
        <View style={s(styles.headerTitleContainer)}>
          <Bug size={26} color={colors.golden} style={s(styles.headerIcon)} />
          <View style={{ flex: 1 }}>
            <Text style={[s(styles.headerTitle), { color: colors.text }]}>Bug Reports</Text>
            <Text style={[s(styles.headerSubtitle), { color: colors.textSecondary }]}>
              {openCount > 0 ? `${openCount} open bug${openCount !== 1 ? "s" : ""}.` : "No open bugs."}
            </Text>
          </View>
        </View>

        <View style={s(styles.actionRow)}>
          <TouchableOpacity style={[s(styles.btn), s(styles.btnOutline), { backgroundColor: colors.cardBg, borderColor: colors.border }]} onPress={() => void load()} activeOpacity={0.7}>
            <RefreshCw size={14} color={colors.text} style={s({ marginRight: 6 })} />
            <Text style={[s(styles.btnOutlineText), { color: colors.text }]}>Refresh</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s(styles.btn), s(styles.btnPrimary), { backgroundColor: colors.primary }]} onPress={() => { resetSubmit(); setSubmitOpen(true); }} activeOpacity={0.8}>
            <Text style={s(styles.btnPrimaryText)}>+ Report Bug</Text>
          </TouchableOpacity>
        </View>
      </View>

      {apiError && (
        <View style={s(styles.errorBanner)}>
          <Text style={s(styles.errorText)}>{apiError}</Text>
        </View>
      )}

      <View style={[s(styles.searchCard), { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        <TextInput
          placeholder="Search bugs..."
          placeholderTextColor={colors.textMuted}
          style={[s(styles.searchInput), { backgroundColor: colors.inputBg, color: colors.text }]}
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
                style={[s(styles.tabButton), { backgroundColor: isActive ? colors.primary : colors.inputBg }]}
                activeOpacity={0.7}
              >
                <Text style={[s(styles.tabButtonText), { color: isActive ? "#ffffff" : colors.textSecondary }]}>
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
          key={isTablet ? "tablet-grid" : "mobile-list"}
          data={filtered}
          keyExtractor={(item) => item.id}
          numColumns={isTablet ? 2 : 1}
          columnWrapperStyle={isTablet ? s(styles.columnWrapper) : undefined}
          contentContainerStyle={s(styles.listContent)}
          ListEmptyComponent={
            <View style={s(styles.emptyContainer)}>
              <Text style={[s(styles.emptyText), { color: colors.textMuted }]}>No bugs found.</Text>
            </View>
          }
          renderItem={({ item: b }) => {
            const isOpen = b.status !== "closed";
            return (
              <TouchableOpacity style={[s(styles.bugCard), { backgroundColor: colors.cardBg, borderColor: colors.border }]} onPress={() => openBug(b)} activeOpacity={0.8}>
                <View style={s(styles.cardHeaderRow)}>
                  <View style={[s(styles.badge), isOpen ? styles.badgeOpen : styles.badgeClosed]}>
                    <Text style={[s(styles.badgeText), isOpen ? styles.badgeTextOpen : styles.badgeTextClosed]}>
                      {isOpen ? "Open" : "Closed"}
                    </Text>
                  </View>
                  <View style={s(styles.metaRowElement)}>
                    <MapPin size={12} color={colors.textMuted} style={s({ marginRight: 3 })} />
                    <Text style={[s(styles.metaRowText), { color: colors.textSecondary }]} numberOfLines={1}>
                      {b.source?.path || b.source?.panel || "System"}
                    </Text>
                  </View>
                </View>

                <Text style={[s(styles.cardTitle), { color: colors.text }]}>{b.title}</Text>
                
                {b.taskTitle ? (
                  <View style={[s(styles.taskBadge), { backgroundColor: colors.primaryBgLight, borderColor: colors.primaryBorder }]}>
                    <Layers size={11} color={colors.primary} style={s({ marginRight: 4 })} />
                    <Text style={[s(styles.taskBadgeText), { color: colors.primary }]} numberOfLines={1}>Task: {b.taskTitle}</Text>
                  </View>
                ) : null}

                <Text style={[s(styles.cardDesc), { color: colors.textSecondary }]} numberOfLines={2}>{b.description}</Text>

                <View style={[s(styles.cardFooter), { borderTopColor: colors.borderLight }]}>
                  <View style={s(styles.metaRowElement)}>
                    <User size={12} color={colors.textMuted} style={s({ marginRight: 4 })} />
                    <Text style={[s(styles.footerUserData), { color: colors.text }]}>
                      {b.createdByUsername || "Anonymous"}
                      {b.createdByRole ? ` (${b.createdByRole})` : ""}
                    </Text>
                  </View>
                  <View style={s(styles.metaRowElement)}>
                    <Calendar size={12} color={colors.textMuted} style={s({ marginRight: 4 })} />
                    <Text style={[s(styles.metaRowText), { color: colors.textSecondary }]}>
                      {b.createdAt ? new Date(b.createdAt).toLocaleDateString() : "-"}
                    </Text>
                  </View>
                </View>
                {b.attachments && b.attachments.length > 0 ? (
                  <Text style={[s(styles.attachmentMiniIndicator), { color: colors.primary, backgroundColor: colors.primaryBgLight }]}>📎 {b.attachments.length} Attachment(s)</Text>
                ) : null}
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* View Details Modal */}
      <Modal visible={viewOpen} animationType="slide" transparent={true} onRequestClose={() => setViewOpen(false)}>
        <View style={s(styles.modalOverlay)}>
          <View style={[s(styles.modalContent), { backgroundColor: colors.modalPanelBg }]}>
            <View style={[s(styles.modalHeader), { borderBottomColor: colors.modalBorder }]}>
              <View style={s(styles.modalHeaderTopLine)}>
                <Text style={[s(styles.modalTitle), { color: colors.modalText }]} numberOfLines={2}>{selected?.title || "Bug Details"}</Text>
                <TouchableOpacity onPress={() => setViewOpen(false)} style={s(styles.closeIconButton)} activeOpacity={0.7}>
                  <X size={18} color={colors.modalTextSecondary} />
                </TouchableOpacity>
              </View>
              <Text style={[s(styles.modalSubtitle), { color: colors.modalTextSecondary }]}>
                {selected?.source?.path || selected?.source?.panel || "No source data"}
              </Text>
            </View>

            <ScrollView style={s(styles.modalBody)} showsVerticalScrollIndicator={true}>
              <View style={s(styles.cardHeaderRow)}>
                <View style={[s(styles.badge), selected?.status !== "closed" ? styles.badgeOpen : styles.badgeClosed]}>
                  <Text style={[s(styles.badgeText), selected?.status !== "closed" ? styles.badgeTextOpen : styles.badgeTextClosed]}>
                    {selected?.status === "closed" ? "Closed" : "Open"}
                  </Text>
                </View>
                {selected?.createdByUsername ? (
                  <Text style={[s(styles.metaRowText), { color: colors.modalTextSecondary }]}>
                    By {selected.createdByUsername} {selected.createdByRole ? `(${selected.createdByRole})` : ""}
                  </Text>
                ) : null}
              </View>

              {selected?.taskTitle ? (
                <View style={[s(styles.taskBadge), { marginTop: hp(1), backgroundColor: colors.primaryBgLight, borderColor: colors.primaryBorder }]}>
                  <Text style={{ fontSize: isTablet ? 13 : 12, fontWeight: "600", color: colors.primary }}>Linked Task: {selected.taskTitle}</Text>
                </View>
              ) : null}

              <View style={[s(styles.descContainer), { backgroundColor: colors.previewBg, borderColor: colors.modalBorder }]}>
                <Text style={[s(styles.fullDescText), { color: colors.modalText }]}>{selected?.description}</Text>
              </View>

              {selected?.attachments && selected.attachments.length > 0 ? (
                <View style={{ marginTop: hp(2) }}>
                  <Text style={[s(styles.sectionLabel), { color: colors.modalText }]}>Attachments ({selected.attachments.length})</Text>
                  <View style={s(styles.imageGrid)}>
                    {selected.attachments.map((att, i) => {
                      const src = resolveAttachmentUrl(att.url);
                      if (!src) return null;
                      
                      const allUrls = selected.attachments!
                        .map(a => resolveAttachmentUrl(a.url))
                        .filter((u): u is string => u !== null);
                      
                      return (
                        <TouchableOpacity key={i} style={[s(styles.gridImageWrapper), { borderColor: colors.modalBorder }]} onPress={() => setLightbox({ urls: allUrls, index: i })} activeOpacity={0.8}>
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

            <View style={[s(styles.modalFooter), { borderTopColor: colors.modalBorder }]}>
              <TouchableOpacity style={[s(styles.btn), s(styles.btnOutline), { borderColor: colors.modalBorder, backgroundColor: colors.modalPanelBg }]} onPress={() => setViewOpen(false)} disabled={updating} activeOpacity={0.7}>
                <Text style={[s(styles.btnOutlineText), { color: colors.modalTextSecondary }]}>Close</Text>
              </TouchableOpacity>
              {selected?.status === "closed" ? (
                <TouchableOpacity style={[s(styles.btn), s(styles.btnPrimary), { backgroundColor: colors.primary }]} onPress={() => void updateStatus("open")} disabled={updating} activeOpacity={0.8}>
                  <Text style={s(styles.btnPrimaryText)}>Reopen</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={[s(styles.btn), s(styles.btnDanger), { backgroundColor: colors.danger }]} onPress={() => void updateStatus("closed")} disabled={updating} activeOpacity={0.8}>
                  <Text style={s(styles.btnPrimaryText)}>Mark Closed</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Solid Opaque Report Bug Modal */}
      <Modal visible={submitOpen} animationType="slide" transparent={true} onRequestClose={() => setSubmitOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={s(styles.modalOverlay)}>
          <View style={[s(styles.modalContent), { backgroundColor: colors.modalPanelBg }]}>
            <View style={[s(styles.modalHeader), { borderBottomColor: colors.modalBorder }]}>
              <View style={s(styles.modalHeaderTopLine)}>
                <View style={s(styles.headerTitleContainer)}>
                  <Bug size={20} color={colors.primary} style={s({ marginRight: 6 })} />
                  <Text style={[s(styles.modalTitle), { color: colors.modalText }]}>Report a Bug</Text>
                </View>
                <TouchableOpacity onPress={() => setSubmitOpen(false)} style={s(styles.closeIconButton)} activeOpacity={0.7}>
                  <X size={18} color={colors.modalTextSecondary} />
                </TouchableOpacity>
              </View>
              <Text style={[s(styles.modalSubtitle), { color: colors.modalTextSecondary }]}>Describe the issue you encountered. Screenshots are helpful.</Text>
            </View>

            <ScrollView style={s(styles.modalBody)} keyboardShouldPersistTaps="handled">
              <View style={s(styles.formGroup)}>
                <Text style={[s(styles.formLabel), { color: colors.modalTextSecondary }]}>
                  Title <Text style={{ color: colors.danger }}>*</Text>
                </Text>
                <TextInput
                  placeholder="Brief summary of the issue"
                  placeholderTextColor={colors.modalTextSecondary}
                  style={[s(styles.formInput), { backgroundColor: colors.inputBg, borderColor: colors.modalBorder, color: colors.modalText }]}
                  value={submitTitle}
                  onChangeText={setSubmitTitle}
                />
              </View>

              <View style={s(styles.formGroup)}>
                <Text style={[s(styles.formLabel), { color: colors.modalTextSecondary }]}>
                  Description <Text style={{ color: colors.danger }}>*</Text>
                </Text>
                <TextInput
                  placeholder="Steps to reproduce, expected vs actual behavior..."
                  placeholderTextColor={colors.modalTextSecondary}
                  multiline={true}
                  numberOfLines={4}
                  style={[s(styles.formInput), s(styles.formTextArea), { backgroundColor: colors.inputBg, borderColor: colors.modalBorder, color: colors.modalText }]}
                  value={submitDesc}
                  onChangeText={setSubmitDesc}
                />
              </View>

              <View style={s(styles.formGroup)}>
                <Text style={[s(styles.formLabel), { color: colors.modalTextSecondary }]}>Screenshots (up to 5)</Text>
                <View style={s(styles.pickerRow)}>
                  {submitFiles.map((file, i) => (
                    <View key={i} style={[s(styles.previewImageContainer), { borderColor: colors.modalBorder }]}>
                      <Image source={{ uri: file.uri }} style={s(styles.previewImage)} />
                      <TouchableOpacity style={s(styles.removeImageBadge)} onPress={() => removeFile(i)} activeOpacity={0.7}>
                        <X size={10} color="#ffffff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  {submitFiles.length < 5 ? (
                    <TouchableOpacity style={[s(styles.imagePickerButton), { backgroundColor: colors.inputBg, borderColor: colors.modalBorder }]} onPress={handlePickImage} activeOpacity={0.7}>
                      <Upload size={18} color={colors.modalTextSecondary} />
                      <Text style={[s(styles.imagePickerText), { color: colors.modalTextSecondary }]}>Add</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>

              {submitError && <Text style={s(styles.formError)}>{submitError}</Text>}
              {submitSuccess && <Text style={s(styles.formSuccess)}>{submitSuccess}</Text>}
            </ScrollView>

            <View style={[s(styles.modalFooter), { borderTopColor: colors.modalBorder }]}>
              <TouchableOpacity style={[s(styles.btn), s(styles.btnOutline), { borderColor: colors.modalBorder, backgroundColor: colors.modalPanelBg }]} onPress={() => { resetSubmit(); setSubmitOpen(false); }} disabled={submitting} activeOpacity={0.7}>
                <Text style={[s(styles.btnOutlineText), { color: colors.modalTextSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s(styles.btn), s(styles.btnPrimary), { backgroundColor: colors.primary }]} onPress={() => void handleSubmit()} disabled={submitting} activeOpacity={0.8}>
                <Text style={s(styles.btnPrimaryText)}>{submitting ? "Submitting..." : "Submit Report"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Lightbox Preview */}
      {lightbox ? (
        <Modal visible={true} transparent={true} animationType="fade">
          <View style={s(styles.lightboxContainer)}>
            <TouchableOpacity style={s(styles.lightboxClose)} onPress={() => setLightbox(null)} activeOpacity={0.7}>
              <X size={24} color="#ffffff" />
            </TouchableOpacity>

            {lightbox.urls.length > 1 ? (
              <Text style={s(styles.lightboxCounter)}>
                {lightbox.index + 1} / {lightbox.urls.length}
              </Text>
            ) : null}

            {lightbox.urls.length > 1 && lightbox.index > 0 ? (
              <TouchableOpacity
                style={[s(styles.lightboxNav), { left: wp(4) }]}
                onPress={() => setLightbox(lb => lb ? { ...lb, index: lb.index - 1 } : null)}
                activeOpacity={0.7}
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
                style={[s(styles.lightboxNav), { right: wp(4) }]}
                onPress={() => setLightbox(lb => lb ? { ...lb, index: lb.index + 1 } : null)}
                activeOpacity={0.7}
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

const createStyles = (
  colors: ReturnType<typeof buildColors>,
  wp: (percentage: number) => number,
  hp: (percentage: number) => number,
  isTablet: boolean,
  isSmallScreen: boolean,
  windowHeight: number,
  windowWidth: number
) => {
  const gridImageWidth = isTablet ? wp(18) : wp(40);

  return StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      paddingHorizontal: isTablet ? wp(6) : isSmallScreen ? wp(3) : wp(4.2),
      paddingTop: hp(1.8),
      paddingBottom: hp(1.8),
    },
    headerTitleContainer: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    headerIcon: {
      marginRight: wp(2),
    },
    headerTitle: {
      fontSize: isTablet ? 26 : 22,
      fontWeight: "800",
      letterSpacing: -0.5,
    },
    headerSubtitle: {
      fontSize: isTablet ? 13 : 12,
      marginTop: hp(0.3),
    },
    actionRow: {
      flexDirection: "row",
      gap: wp(2),
      marginTop: hp(1.5),
    },
    btn: {
      height: hp(5.2),
      borderRadius: wp(2),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: wp(4),
      flex: 1,
    },
    btnOutline: {
      borderWidth: 1,
    },
    btnOutlineText: {
      fontSize: isTablet ? 14 : 13,
      fontWeight: "600",
    },
    btnPrimary: {},
    btnPrimaryText: {
      color: "#ffffff",
      fontSize: isTablet ? 14 : 13,
      fontWeight: "700",
    },
    btnDanger: {},
    errorBanner: {
      marginHorizontal: isTablet ? wp(6) : wp(4.2),
      padding: wp(3),
      backgroundColor: colors.dangerBg,
      borderRadius: wp(2),
      borderWidth: 1,
      borderColor: colors.dangerBorder,
      marginBottom: hp(1),
    },
    errorText: {
      color: colors.danger,
      fontSize: isTablet ? 13 : 12,
    },
    searchCard: {
      marginHorizontal: isTablet ? wp(6) : isSmallScreen ? wp(3) : wp(4.2),
      marginTop: hp(1),
      padding: wp(3.5),
      borderRadius: wp(3),
      borderWidth: 1,
    },
    searchInput: {
      height: hp(4.8),
      borderRadius: wp(2),
      paddingHorizontal: wp(3),
      fontSize: isTablet ? 14 : 13,
    },
    tabsContainer: {
      flexDirection: "row",
      gap: wp(2),
      marginTop: hp(1.2),
    },
    tabButton: {
      paddingHorizontal: wp(3.5),
      paddingVertical: hp(0.8),
      borderRadius: wp(1.8),
    },
    tabButtonText: {
      fontSize: isTablet ? 13 : 12,
      fontWeight: "600",
    },
    loaderContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    listContent: {
      paddingHorizontal: isTablet ? wp(6) : isSmallScreen ? wp(3) : wp(4.2),
      paddingTop: hp(1.8),
      paddingBottom: hp(5),
      gap: wp(3),
    },
    columnWrapper: {
      justifyContent: "space-between",
      gap: wp(3),
    },
    emptyContainer: {
      paddingVertical: hp(6),
      alignItems: "center",
    },
    emptyText: {
      fontSize: isTablet ? 14 : 13,
      fontStyle: "italic",
    },
    bugCard: {
      borderRadius: wp(3),
      padding: wp(4),
      borderWidth: 1,
      gap: hp(1),
      width: isTablet ? "48.5%" : "100%",
    },
    cardHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    badge: {
      paddingHorizontal: wp(2),
      paddingVertical: hp(0.3),
      borderRadius: wp(1),
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
      fontSize: isTablet ? 12 : 11,
    },
    cardTitle: {
      fontSize: isTablet ? 16 : 14,
      fontWeight: "700",
      lineHeight: isTablet ? 22 : 18,
    },
    taskBadge: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      paddingHorizontal: wp(2),
      paddingVertical: hp(0.4),
      borderRadius: wp(1.5),
      borderWidth: 1,
    },
    taskBadgeText: {
      fontSize: isTablet ? 12 : 11,
      fontWeight: "600",
    },
    cardDesc: {
      fontSize: isTablet ? 13 : 12,
      lineHeight: isTablet ? 18 : 16,
    },
    cardFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
      borderTopWidth: 1,
      paddingTop: hp(1),
      marginTop: hp(0.5),
    },
    footerUserData: {
      fontSize: isTablet ? 12 : 11,
      fontWeight: "600",
    },
    attachmentMiniIndicator: {
      fontSize: isTablet ? 11 : 10,
      fontWeight: "600",
      alignSelf: "flex-start",
      paddingHorizontal: wp(2),
      paddingVertical: hp(0.3),
      borderRadius: wp(1),
      marginTop: hp(0.3),
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.overlayBg,
      justifyContent: "flex-end",
    },
    modalContent: {
      borderTopLeftRadius: wp(5),
      borderTopRightRadius: wp(5),
      maxHeight: windowHeight * 0.88,
      paddingBottom: Platform.OS === "ios" ? hp(4) : hp(2.5),
    },
    modalHeader: {
      paddingHorizontal: wp(5),
      paddingVertical: hp(2),
      borderBottomWidth: 1,
    },
    modalHeaderTopLine: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    closeIconButton: {
      padding: wp(1),
    },
    modalTitle: {
      fontSize: isTablet ? 18 : 16,
      fontWeight: "700",
      flex: 1,
      marginRight: wp(2),
    },
    modalSubtitle: {
      fontSize: isTablet ? 13 : 12,
      marginTop: hp(0.3),
    },
    modalBody: {
      paddingHorizontal: wp(5),
      paddingVertical: hp(2),
    },
    descContainer: {
      borderRadius: wp(2.5),
      padding: wp(3.5),
      borderWidth: 1,
      marginTop: hp(1.5),
    },
    fullDescText: {
      fontSize: isTablet ? 14 : 13,
      lineHeight: isTablet ? 20 : 18,
    },
    sectionLabel: {
      fontSize: isTablet ? 14 : 13,
      fontWeight: "700",
      marginBottom: hp(1),
    },
    imageGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: wp(2),
    },
    gridImageWrapper: {
      width: gridImageWidth,
      height: hp(10),
      borderRadius: wp(2),
      overflow: "hidden",
      borderWidth: 1,
      position: "relative",
    },
    gridImage: {
      width: "100%",
      height: "100%",
    },
    zoomOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.25)",
      alignItems: "center",
      justifyContent: "center",
    },
    modalFooter: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: wp(2.5),
      paddingHorizontal: wp(5),
      paddingTop: hp(1.8),
      borderTopWidth: 1,
    },
    formGroup: {
      marginBottom: hp(1.8),
    },
    formLabel: {
      fontSize: isTablet ? 13 : 12,
      fontWeight: "700",
      marginBottom: hp(0.6),
    },
    formInput: {
      height: hp(5.2),
      borderWidth: 1,
      borderRadius: wp(2),
      paddingHorizontal: wp(3),
      fontSize: isTablet ? 14 : 13,
    },
    formTextArea: {
      minHeight: hp(12),
      paddingTop: hp(1.2),
      textAlignVertical: "top",
    },
    pickerRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: wp(2),
      paddingTop: hp(0.5),
    },
    previewImageContainer: {
      width: wp(16),
      height: wp(16),
      borderRadius: wp(2),
      overflow: "hidden",
      borderWidth: 1,
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
      backgroundColor: "rgba(0,0,0,0.75)",
      borderRadius: 10,
      width: 18,
      height: 18,
      alignItems: "center",
      justifyContent: "center",
    },
    imagePickerButton: {
      width: wp(16),
      height: wp(16),
      borderRadius: wp(2),
      borderWidth: 1.5,
      borderStyle: "dashed",
      alignItems: "center",
      justifyContent: "center",
      gap: 2,
    },
    imagePickerText: {
      fontSize: 10,
      fontWeight: "600",
    },
    formError: {
      fontSize: isTablet ? 13 : 12,
      color: colors.danger,
      fontWeight: "600",
      marginTop: hp(0.5),
    },
    formSuccess: {
      fontSize: isTablet ? 13 : 12,
      color: colors.success,
      fontWeight: "600",
      marginTop: hp(0.5),
    },
    lightboxContainer: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.95)",
      justifyContent: "center",
      alignItems: "center",
    },
    lightboxImage: {
      width: windowWidth,
      height: windowHeight * 0.8,
    },
    lightboxClose: {
      position: "absolute",
      top: Platform.OS === "ios" ? hp(6) : hp(3),
      right: wp(5),
      zIndex: 10,
      padding: wp(2),
      backgroundColor: "rgba(255,255,255,0.15)",
      borderRadius: 20,
    },
    lightboxCounter: {
      position: "absolute",
      top: Platform.OS === "ios" ? hp(6.5) : hp(3.5),
      color: "rgba(255,255,255,0.8)",
      fontSize: isTablet ? 15 : 13,
      fontWeight: "600",
    },
    lightboxNav: {
      position: "absolute",
      top: "50%",
      transform: [{ translateY: -20 }],
      zIndex: 10,
      padding: wp(2),
      backgroundColor: "rgba(255,255,255,0.15)",
      borderRadius: 24,
    },
  });
};