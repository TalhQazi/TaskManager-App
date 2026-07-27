import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  Image,
  Dimensions,
  SafeAreaView,
  StatusBar,
  FlatList,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch, toProxiedUrl } from "../../../lib/admin/apiClient";

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

interface SelectedAsset {
  uri: string;
  fileName: string;
  type: string;
  base64: string;
  size: number;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

function toText(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export default function EmployeeBugs() {
  const auth = useAuth();
  const currentUsername = auth?.user?.fullName || auth?.user?.username || "";

  const { uiTheme } = useTheme();
  const styles = useMemo(() => getThemedStyles(uiTheme), [uiTheme]);

  const isLightTheme = useMemo(() => {
    return uiTheme.theme?.includes("crystal") || uiTheme.panelColors?.dashboardTextColor === "#000000";
  }, [uiTheme]);

  const primaryColor = useMemo(() => {
    return uiTheme.customColors?.primary || "#ffd27a";
  }, [uiTheme]);

  const placeholderColor = useMemo(() => {
    return isLightTheme ? "#94a3b8" : "#71717a";
  }, [isLightTheme]);

  const textColor = useMemo(() => {
    return uiTheme.panelColors?.dashboardTextColor || (isLightTheme ? "#ffffff" : "#09090b");
  }, [uiTheme, isLightTheme]);

  const tintColor = useMemo(() => {
    return uiTheme.panelColors?.dashboardTextColor || (isLightTheme ? "#0f172a" : "#ffffff");
  }, [uiTheme, isLightTheme]);

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
  const [submitFiles, setSubmitFiles] = useState<SelectedAsset[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [proxiedUrls, setProxiedUrls] = useState<string[]>([]);

  const load = async () => {
    let res: { items?: any[] } = {};
    try {
      setApiError(null);
      try {
        res = await apiFetch<{ items?: any[] }>("/api/bugs/");
      } catch {
        res = await apiFetch<{ items?: any[] }>("/api/bugs");
      }

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
    } catch (e: any) {
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

  useEffect(() => {
    load();
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
    setProxiedUrls([]);
    try {
      const res = await apiFetch<{ item: BugItem }>(`/api/bugs/${encodeURIComponent(b.id)}`);
      if (res?.item) {
        const updatedItem = { ...b, ...res.item };
        setSelected((prev) => (prev?.id === b.id ? updatedItem : prev));
        
        if (updatedItem.attachments && updatedItem.attachments.length > 0) {
          const resolved = await Promise.all(
            updatedItem.attachments.map(async (att) => {
              try {
                return await toProxiedUrl(String(att.url));
              } catch {
                return String(att.url || "");
              }
            })
          );
          setProxiedUrls(resolved);
        }
      }
    } catch {
      if (b.attachments && b.attachments.length > 0) {
        const resolved = await Promise.all(
          b.attachments.map(async (att) => {
            try {
              return await toProxiedUrl(String(att.url));
            } catch {
              return String(att.url || "");
            }
          })
        );
        setProxiedUrls(resolved);
      }
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
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to update bug");
    } finally {
      setUpdating(false);
    }
  };

  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Permission Required", "Photo gallery access is required to upload screenshots.");
      return;
    }

    const remainingCount = 5 - submitFiles.length;
    if (remainingCount <= 0) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: remainingCount,
      base64: true,
      quality: 0.5,
    });

    if (!result.canceled && result.assets) {
      const parsedAssets: SelectedAsset[] = result.assets.slice(0, remainingCount).map((asset) => {
        const name = asset.fileName || `upload_${Date.now()}.jpg`;
        const extension = name.split(".").pop() || "jpg";
        return {
          uri: asset.uri,
          fileName: name,
          type: `image/${extension === "jpg" ? "jpeg" : extension}`,
          base64: asset.base64 || "",
          size: asset.fileSize || 0,
        };
      });

      setSubmitFiles((prev) => [...prev, ...parsedAssets]);
    }
  };

  const removeFile = (index: number) => {
    setSubmitFiles((prev) => prev.filter((_, idx) => idx !== index));
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
        fileName: f.fileName,
        url: `data:${f.type};base64,${f.base64}`,
        mimeType: f.type,
        size: f.size,
      }));

      await apiFetch("/api/bugs", {
        method: "POST",
        body: JSON.stringify({
          title: submitTitle.trim(),
          description: submitDesc.trim(),
          attachments,
          source: { panel: "employee", path: "Mobile Application Context Layer" },
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle={isLightTheme ? "dark-content" : "light-content"}
        backgroundColor={uiTheme.panelColors?.dashboardBackground || "#09090b"}
      />
      
      <View style={styles.headerLayoutRow}>
        <View style={{ flex: 1 }}>
          <View style={styles.titleInlineContainer}>
            <MaterialCommunityIcons name="bug" size={24} color={primaryColor} style={{ marginRight: 6 }} />
            <Text style={styles.headerPrimaryText}>Bug Reports</Text>
          </View>
          <Text style={styles.subtitleMutedText}>
            View all bug reports and submit new ones.{" "}
            {openCount > 0 ? `${openCount} open bug${openCount !== 1 ? "s" : ""}.` : ""}
          </Text>
        </View>
      </View>

      <View style={styles.actionButtonBarRow}>
        <TouchableOpacity style={styles.refreshControlBtn} onPress={() => void load()} disabled={loading}>
          <Text style={styles.refreshControlBtnText}>Refresh</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.reportSubmissionBtn, { backgroundColor: primaryColor }]} onPress={() => { resetSubmit(); setSubmitOpen(true); }}>
          <Text style={[styles.reportSubmissionBtnText, { color: textColor }]}>+ Report Bug</Text>
        </TouchableOpacity>
      </View>

      {!!apiError && (
        <View style={styles.errorLoggingContainer}>
          <MaterialCommunityIcons name="alert-circle" size={20} color="#f87171" style={{ marginRight: 8 }} />
          <Text style={styles.errorLoggingText}>{apiError}</Text>
        </View>
      )}

      <View style={styles.searchFilterControlCard}>
        <TextInput
          style={styles.searchBoxInput}
          placeholder="Search bugs..."
          placeholderTextColor={placeholderColor}
          value={q}
          onChangeText={setQ}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabContainerRow}>
          <TouchableOpacity
            style={[styles.filtrationTabSelector, statusFilter === "all" && [styles.filtrationTabSelectorActive, { backgroundColor: primaryColor }]]}
            onPress={() => setStatusFilter("all")}
          >
            <Text style={[styles.filtrationTabSelectorText, statusFilter === "all" && [styles.filtrationTabSelectorTextActive, { color: textColor }]]}>
              All ({items.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filtrationTabSelector, statusFilter === "open" && [styles.filtrationTabSelectorActive, { backgroundColor: primaryColor }]]}
            onPress={() => setStatusFilter("open")}
          >
            <Text style={[styles.filtrationTabSelectorText, statusFilter === "open" && [styles.filtrationTabSelectorTextActive, { color: textColor }]]}>
              Open ({openCount})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filtrationTabSelector, statusFilter === "closed" && [styles.filtrationTabSelectorActive, { backgroundColor: primaryColor }]]}
            onPress={() => setStatusFilter("closed")}
          >
            <Text style={[styles.filtrationTabSelectorText, statusFilter === "closed" && [styles.filtrationTabSelectorTextActive, { color: textColor }]]}>
              Closed ({items.length - openCount})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.activityIndicatorCentering}>
          <ActivityIndicator size="large" color={primaryColor} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={<Text style={styles.gridSectionHeaderText}>Bug Reports ({filtered.length})</Text>}
          ListEmptyComponent={
            <View style={styles.emptyRecordsPlaceholderCard}>
              <Text style={styles.emptyRecordsPlaceholderText}>No bugs found.</Text>
            </View>
          }
          renderItem={({ item: b }) => (
            <TouchableOpacity style={styles.bugDataListItemCard} onPress={() => openBug(b)}>
              <View style={styles.bugCardHeaderLayout}>
                <View style={[styles.badgeIndicatorBlock, { backgroundColor: b.status === "closed" ? "rgba(115,115,115,0.15)" : "rgba(34,197,94,0.15)" }]}>
                  <Text style={[styles.badgeIndicatorText, { color: b.status === "closed" ? "#737373" : "#22c55e" }]}>
                    {b.status}
                  </Text>
                </View>
                <Text style={styles.bugCardSourceText}>{b.source?.path?.split("/").pop() || "System"}</Text>
              </View>
              <Text style={styles.bugCardTitleText}>{b.title}</Text>
              <Text style={styles.bugCardDescriptionPreview} numberOfLines={2}>{b.description}</Text>
              {!!b.taskTitle && (
                <Text style={styles.bugCardAssociatedTaskHint} numberOfLines={1}>Task: {b.taskTitle}</Text>
              )}
              <View style={styles.bugCardFooterLayout}>
                <Text style={styles.bugCardAuthorMetaText}>{b.createdByUsername || "-"}</Text>
                <Text style={styles.bugCardAuthorMetaText}>
                  {b.createdAt ? new Date(b.createdAt).toLocaleDateString() : ""}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      <Modal visible={viewOpen} animationType="slide" transparent={true} onRequestClose={() => setViewOpen(false)}>
        <View style={styles.modalBackdropOverlay}>
          <View style={styles.modalContentSheetFrame}>
            <View style={styles.modalContentSheetHeader}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.modalSheetTitleText}>{selected?.title || "Bug"}</Text>
                <Text style={styles.modalSheetSubtitleText}>{selected?.source?.path || selected?.source?.panel || ""}</Text>
              </View>
              <TouchableOpacity style={styles.modalHeaderDismissCircle} onPress={() => setViewOpen(false)}>
                <Ionicons name="close" size={20} color={tintColor} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 16 }} contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
              <View style={styles.modalMetaInfoRow}>
                <View style={[styles.badgeIndicatorBlock, { backgroundColor: selected?.status === "closed" ? "rgba(115,115,115,0.15)" : "rgba(34,197,94,0.15)" }]}>
                  <Text style={[styles.badgeIndicatorText, { color: selected?.status === "closed" ? "#737373" : "#22c55e" }]}>
                    {selected?.status}
                  </Text>
                </View>
                <Text style={styles.modalMetaAuthorLabel}>
                  {selected?.createdByUsername ? `Posted by ${selected.createdByUsername}` : ""}
                  {selected?.createdByRole ? ` (${selected.createdByRole})` : ""}
                </Text>
              </View>

              <View style={styles.modalBodyContentWrapperTextarea}>
                <Text style={styles.modalBodyContentDescriptionText}>{selected?.description}</Text>
              </View>

              {selected?.attachments && selected.attachments.length > 0 && (
                <View style={styles.attachmentsSectionBlock}>
                  <Text style={styles.attachmentsSectionHeading}>Attachments ({selected.attachments.length})</Text>
                  <View style={styles.attachmentsGridDisplayLayout}>
                    {selected.attachments.map((att, i) => {
                      const localSourceUri = proxiedUrls[i] || "";
                      return (
                        <TouchableOpacity
                          key={i}
                          style={styles.attachmentThumbnailTouchFrame}
                          onPress={() => localSourceUri && setLightbox({ urls: proxiedUrls, index: i })}
                        >
                          {localSourceUri ? (
                            <Image source={{ uri: localSourceUri }} style={styles.attachmentThumbnailImageInstance} />
                          ) : (
                            <View style={styles.attachmentLoadingPlaceholderBox}>
                              <ActivityIndicator size="small" color={primaryColor} />
                            </View>
                          )}
                          <View style={styles.attachmentZoomOverlayActionIndicator}>
                            <Ionicons name="search-outline" size={18} color="#ffffff" />
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooterPanelActionContainer}>
              <TouchableOpacity style={styles.modalFooterPanelCancelBtn} onPress={() => setViewOpen(false)} disabled={updating}>
                <Text style={[styles.modalFooterPanelCancelBtnText, { color: tintColor }]}>Close</Text>
              </TouchableOpacity>
              {selected?.createdByUsername === currentUsername && (
                <TouchableOpacity
                  style={[styles.modalFooterPanelMutationBtn, { backgroundColor: primaryColor }]}
                  onPress={() => void updateStatus(selected?.status === "closed" ? "open" : "closed")}
                  disabled={updating}
                >
                  {updating ? (
                    <ActivityIndicator size="small" color={textColor} />
                  ) : (
                    <Text style={[styles.modalFooterPanelMutationBtnText, { color: textColor }]}>
                      {selected?.status === "closed" ? "Reopen" : "Mark Resolved"}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={submitOpen} animationType="slide" transparent={true} onRequestClose={() => { if (!submitting) { resetSubmit(); setSubmitOpen(false); } }}>
        <View style={styles.modalBackdropOverlay}>
          <View style={styles.modalContentSheetFrame}>
            <View style={styles.modalContentSheetHeader}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <MaterialCommunityIcons name="bug" size={20} color={primaryColor} style={{ marginRight: 6 }} />
                <Text style={styles.modalSheetTitleText}>Report a Bug</Text>
              </View>
              <TouchableOpacity style={styles.modalHeaderDismissCircle} onPress={() => { resetSubmit(); setSubmitOpen(false); }} disabled={submitting}>
                <Ionicons name="close" size={20} color={tintColor} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 16 }} contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalSheetSubtitleText}>Describe the issue you encountered. Screenshots are helpful.</Text>

              <View style={styles.inputStackGroupElement}>
                <Text style={styles.inputStackFieldLabelText}>Title <Text style={{ color: "#ef4444" }}>*</Text></Text>
                <TextInput
                  style={styles.inputStackFieldTextInputWidget}
                  placeholder="Brief summary of the issue"
                  placeholderTextColor={placeholderColor}
                  value={submitTitle}
                  onChangeText={setSubmitTitle}
                  editable={!submitting}
                />
              </View>

              <View style={styles.inputStackGroupElement}>
                <Text style={styles.inputStackFieldLabelText}>Description <Text style={{ color: "#ef4444" }}>*</Text></Text>
                <TextInput
                  style={[styles.inputStackFieldTextInputWidget, styles.inputStackFieldTextareaInputWidget]}
                  placeholder="Steps to reproduce, expected vs actual behavior..."
                  placeholderTextColor={placeholderColor}
                  multiline={true}
                  numberOfLines={4}
                  value={submitDesc}
                  onChangeText={setSubmitDesc}
                  editable={!submitting}
                />
              </View>

              <View style={styles.inputStackGroupElement}>
                <Text style={styles.inputStackFieldLabelText}>Screenshots (up to 5)</Text>
                <View style={styles.uploaderThumbnailsGridFlowContainer}>
                  {submitFiles.map((file, i) => (
                    <View key={i} style={styles.uploaderPreviewFrameThumbnailBox}>
                      <Image source={{ uri: file.uri }} style={styles.uploaderPreviewFrameThumbnailImage} />
                      <TouchableOpacity style={styles.uploaderPreviewFrameThumbnailDismissBtn} onPress={() => removeFile(i)} disabled={submitting}>
                        <Ionicons name="close" size={12} color="#ffffff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  {submitFiles.length < 5 && (
                    <TouchableOpacity style={styles.uploaderTriggerTargetButtonSquare} onPress={handlePickImage} disabled={submitting}>
                      <Ionicons name="cloud-upload-outline" size={22} color={placeholderColor} />
                      <Text style={styles.uploaderTriggerTargetButtonSquareText}>Add</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {!!submitError && <Text style={styles.submitProcessMessageBannerTextError}>{submitError}</Text>}
              {!!submitSuccess && <Text style={styles.submitProcessMessageBannerTextSuccess}>{submitSuccess}</Text>}
            </ScrollView>

            <View style={styles.modalFooterPanelActionContainer}>
              <TouchableOpacity style={styles.modalFooterPanelCancelBtn} onPress={() => { resetSubmit(); setSubmitOpen(false); }} disabled={submitting}>
                <Text style={[styles.modalFooterPanelCancelBtnText, { color: tintColor }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalFooterPanelMutationBtn, { backgroundColor: primaryColor }, (!submitTitle.trim() || !submitDesc.trim() || submitting) && { opacity: 0.5 }]}
                onPress={handleSubmit}
                disabled={!submitTitle.trim() || !submitDesc.trim() || submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={textColor} />
                ) : (
                  <Text style={[styles.modalFooterPanelMutationBtnText, { color: textColor }]}>Submit Report</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={lightbox !== null} transparent={true} animationType="fade" onRequestClose={() => setLightbox(null)}>
        {lightbox && (
          <View style={styles.lightboxFullViewportContainer} onStartShouldSetResponder={() => true} onResponderRelease={() => setLightbox(null)}>
            <TouchableOpacity style={styles.lightboxTopBarCloseCircle} onPress={() => setLightbox(null)}>
              <Ionicons name="close" size={24} color="#ffffff" />
            </TouchableOpacity>

            {lightbox.urls.length > 1 && (
              <Text style={styles.lightboxTopBarCounterLabel}>
                {lightbox.index + 1} / {lightbox.urls.length}
              </Text>
            )}

            <View style={styles.lightboxMiddleImageFrameViewport} onStartShouldSetResponder={() => true}>
              {lightbox.urls.length > 1 && lightbox.index > 0 && (
                <TouchableOpacity
                  style={[styles.lightboxNavigationArrowBtn, styles.lightboxNavigationArrowBtnLeft]}
                  onPress={() => setLightbox((lb) => lb ? { ...lb, index: lb.index - 1 } : null)}
                >
                  <Ionicons name="chevron-back" size={24} color="#ffffff" />
                </TouchableOpacity>
              )}

              <Image source={{ uri: lightbox.urls[lightbox.index] }} style={styles.lightboxPrimaryImageInstance} resizeMode="contain" />

              {lightbox.urls.length > 1 && lightbox.index < lightbox.urls.length - 1 && (
                <TouchableOpacity
                  style={[styles.lightboxNavigationArrowBtn, styles.lightboxNavigationArrowBtnRight]}
                  onPress={() => setLightbox((lb) => lb ? { ...lb, index: lb.index + 1 } : null)}
                >
                  <Ionicons name="chevron-forward" size={24} color="#ffffff" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </Modal>
    </SafeAreaView>
  );
}

const getThemedStyles = (uiTheme: any) => {
  const isLightTheme = uiTheme.theme?.includes("crystal") || uiTheme.panelColors?.dashboardTextColor === "#000000";
  const structuralBorderColor = isLightTheme ? "rgba(0, 0, 0, 0.08)" : "rgba(255, 255, 255, 0.08)";
  const surfaceAlphaColor = isLightTheme ? "rgba(0, 0, 0, 0.03)" : "rgba(255, 255, 255, 0.03)";

  const bg = uiTheme.panelColors?.dashboardBackground || (isLightTheme ? "#ffffff" : "#09090b");
  const cardBg = uiTheme.panelColors?.dashboardCardBackground || (isLightTheme ? "#f8fafc" : "#18181b");
  const tintColor = uiTheme.panelColors?.dashboardTextColor || (isLightTheme ? "#0f172a" : "#ffffff");
  const mutedText = isLightTheme ? "#64748b" : "#a1a1aa";

  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: bg,
    },
    scrollContainer: {
      paddingHorizontal: 16,
      paddingBottom: 40,
    },
    headerLayoutRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 8,
    },
    titleInlineContainer: {
      flexDirection: "row",
      alignItems: "center",
    },
    headerPrimaryText: {
      fontSize: 24,
      fontWeight: "800",
      color: tintColor,
      letterSpacing: -0.5,
    },
    subtitleMutedText: {
      fontSize: 12,
      color: mutedText,
      marginTop: 4,
      lineHeight: 16,
    },
    actionButtonBarRow: {
      flexDirection: "row",
      paddingHorizontal: 16,
      gap: 8,
      marginBottom: 12,
    },
    refreshControlBtn: {
      flex: 1,
      height: 38,
      borderRadius: 8,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: surfaceAlphaColor,
      borderWidth: 1,
      borderColor: structuralBorderColor,
    },
    refreshControlBtnText: {
      fontSize: 13,
      fontWeight: "600",
      color: tintColor,
    },
    reportSubmissionBtn: {
      flex: 1.2,
      height: 38,
      borderRadius: 8,
      justifyContent: "center",
      alignItems: "center",
    },
    reportSubmissionBtnText: {
      fontSize: 13,
      fontWeight: "700",
    },
    errorLoggingContainer: {
      backgroundColor: "rgba(239, 68, 68, 0.08)",
      borderColor: "rgba(239, 68, 68, 0.2)",
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      marginHorizontal: 16,
      marginBottom: 12,
      flexDirection: "row",
      alignItems: "center",
    },
    errorLoggingText: {
      fontSize: 12,
      color: "#ef4444",
      lineHeight: 16,
      flex: 1,
    },
    searchFilterControlCard: {
      backgroundColor: cardBg,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: structuralBorderColor,
      padding: 12,
      marginHorizontal: 16,
      marginBottom: 16,
    },
    searchBoxInput: {
      backgroundColor: bg,
      borderWidth: 1,
      borderColor: structuralBorderColor,
      borderRadius: 8,
      height: 40,
      paddingHorizontal: 12,
      fontSize: 14,
      color: tintColor,
      marginBottom: 10,
    },
    tabContainerRow: {
      flexDirection: "row",
      gap: 6,
    },
    filtrationTabSelector: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
      backgroundColor: bg,
      borderWidth: 1,
      borderColor: structuralBorderColor,
    },
    filtrationTabSelectorActive: {
      borderColor: "transparent",
    },
    filtrationTabSelectorText: {
      fontSize: 11,
      fontWeight: "600",
      color: mutedText,
    },
    filtrationTabSelectorTextActive: {
      fontWeight: "700",
    },
    gridSectionHeaderText: {
      fontSize: 15,
      fontWeight: "700",
      color: tintColor,
      marginBottom: 10,
    },
    activityIndicatorCentering: {
      paddingVertical: 40,
      justifyContent: "center",
      alignItems: "center",
    },
    emptyRecordsPlaceholderCard: {
      backgroundColor: cardBg,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: structuralBorderColor,
      padding: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyRecordsPlaceholderText: {
      fontSize: 13,
      color: mutedText,
      fontStyle: "italic",
    },
    bugDataListItemCard: {
      backgroundColor: cardBg,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: structuralBorderColor,
      padding: 14,
      marginBottom: 10,
    },
    bugCardHeaderLayout: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
    },
    badgeIndicatorBlock: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 4,
    },
    badgeIndicatorText: {
      fontSize: 10,
      fontWeight: "700",
      textTransform: "uppercase",
    },
    bugCardSourceText: {
      fontSize: 10,
      color: mutedText,
      fontWeight: "500",
    },
    bugCardTitleText: {
      fontSize: 14,
      fontWeight: "700",
      color: tintColor,
      lineHeight: 18,
      marginBottom: 4,
    },
    bugCardDescriptionPreview: {
      fontSize: 12,
      color: mutedText,
      lineHeight: 16,
      marginBottom: 8,
    },
    bugCardAssociatedTaskHint: {
      fontSize: 11,
      color: mutedText,
      backgroundColor: bg,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      alignSelf: "flex-start",
      marginBottom: 8,
      borderWidth: 1,
      borderColor: structuralBorderColor,
    },
    bugCardFooterLayout: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: structuralBorderColor,
    },
    bugCardAuthorMetaText: {
      fontSize: 10,
      color: mutedText,
    },
    modalBackdropOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.75)",
      justifyContent: "flex-end",
    },
    modalContentSheetFrame: {
      backgroundColor: cardBg,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: "90%",
      borderWidth: 1,
      borderColor: structuralBorderColor,
    },
    modalContentSheetHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: structuralBorderColor,
      alignItems: "center",
    },
    modalSheetTitleText: {
      color: tintColor,
      fontSize: 16,
      fontWeight: "800",
    },
    modalSheetSubtitleText: {
      fontSize: 12,
      color: mutedText,
      marginTop: 2,
    },
    modalHeaderDismissCircle: {
      padding: 6,
      borderRadius: 99,
      backgroundColor: surfaceAlphaColor,
    },
    modalMetaInfoRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 12,
    },
    modalMetaAuthorLabel: {
      fontSize: 12,
      color: mutedText,
      flex: 1,
    },
    modalBodyContentWrapperTextarea: {
      backgroundColor: bg,
      borderWidth: 1,
      borderColor: structuralBorderColor,
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
    },
    modalBodyContentDescriptionText: {
      fontSize: 13,
      color: tintColor,
      lineHeight: 18,
    },
    attachmentsSectionBlock: {
      marginBottom: 16,
    },
    attachmentsSectionHeading: {
      fontSize: 13,
      fontWeight: "600",
      color: tintColor,
      marginBottom: 8,
    },
    attachmentsGridDisplayLayout: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    attachmentThumbnailTouchFrame: {
      width: (SCREEN_WIDTH - 48) / 2,
      height: 100,
      borderRadius: 8,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: structuralBorderColor,
      backgroundColor: surfaceAlphaColor,
      position: "relative",
    },
    attachmentThumbnailImageInstance: {
      width: "100%",
      height: "100%",
      objectFit: "cover",
    },
    attachmentLoadingPlaceholderBox: {
      width: "100%",
      height: "100%",
      justifyContent: "center",
      alignItems: "center",
    },
    attachmentZoomOverlayActionIndicator: {
      position: "absolute",
      inset: 0,
      backgroundColor: "rgba(0,0,0,0.2)",
      justifyContent: "center",
      alignItems: "center",
      opacity: 0.8,
    },
    inputStackGroupElement: {
      marginBottom: 14,
    },
    inputStackFieldLabelText: {
      color: tintColor,
      fontSize: 13,
      fontWeight: "600",
      marginBottom: 6,
    },
    inputStackFieldTextInputWidget: {
      backgroundColor: bg,
      borderWidth: 1,
      borderColor: structuralBorderColor,
      borderRadius: 8,
      paddingHorizontal: 12,
      height: 40,
      fontSize: 14,
      color: tintColor,
    },
    inputStackFieldTextareaInputWidget: {
      height: 90,
      paddingVertical: 10,
      textAlignVertical: "top",
    },
    uploaderThumbnailsGridFlowContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    uploaderPreviewFrameThumbnailBox: {
      width: 64,
      height: 64,
      borderRadius: 8,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: structuralBorderColor,
      position: "relative",
    },
    uploaderPreviewFrameThumbnailImage: {
      width: "100%",
      height: "100%",
      objectFit: "cover",
    },
    uploaderPreviewFrameThumbnailDismissBtn: {
      position: "absolute",
      top: 2,
      right: 2,
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: "rgba(0,0,0,0.7)",
      justifyContent: "center",
      alignItems: "center",
    },
    uploaderTriggerTargetButtonSquare: {
      width: 64,
      height: 64,
      borderRadius: 8,
      borderWidth: 2,
      borderStyle: "dashed",
      borderColor: structuralBorderColor,
      justifyContent: "center",
      alignItems: "center",
      gap: 2,
    },
    uploaderTriggerTargetButtonSquareText: {
      fontSize: 10,
      color: mutedText,
      fontWeight: "500",
    },
    submitProcessMessageBannerTextError: {
      fontSize: 12,
      color: "#ef4444",
      marginTop: 4,
    },
    submitProcessMessageBannerTextSuccess: {
      fontSize: 12,
      color: "#16a34a",
      marginTop: 4,
    },
    modalFooterPanelActionContainer: {
      flexDirection: "row",
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: structuralBorderColor,
      gap: 10,
    },
    modalFooterPanelCancelBtn: {
      flex: 1,
      height: 42,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: structuralBorderColor,
      justifyContent: "center",
      alignItems: "center",
    },
    modalFooterPanelCancelBtnText: {
      fontSize: 13,
      fontWeight: "700",
    },
    modalFooterPanelMutationBtn: {
      flex: 1.4,
      height: 42,
      borderRadius: 8,
      justifyContent: "center",
      alignItems: "center",
    },
    modalFooterPanelMutationBtnText: {
      fontSize: 13,
      fontWeight: "700",
    },
    lightboxFullViewportContainer: {
      flex: 1,
      backgroundColor: "#000000",
      justifyContent: "center",
      alignItems: "center",
    },
    lightboxTopBarCloseCircle: {
      position: "absolute",
      top: 40,
      right: 16,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "rgba(255,255,255,0.15)",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 10,
    },
    lightboxTopBarCounterLabel: {
      position: "absolute",
      top: 50,
      color: "rgba(255,255,255,0.7)",
      fontSize: 14,
      fontWeight: "500",
      zIndex: 5,
    },
    lightboxMiddleImageFrameViewport: {
      width: SCREEN_WIDTH,
      height: SCREEN_HEIGHT - 120,
      justifyContent: "center",
      alignItems: "center",
      position: "relative",
    },
    lightboxPrimaryImageInstance: {
      width: "100%",
      height: "100%",
    },
    lightboxNavigationArrowBtn: {
      position: "absolute",
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "rgba(255,255,255,0.15)",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 10,
    },
    lightboxNavigationArrowBtnLeft: {
      left: 16,
    },
    lightboxNavigationArrowBtnRight: {
      right: 16,
    },
  });
};