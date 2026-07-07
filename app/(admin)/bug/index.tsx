import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Modal,
  SafeAreaView,
  Image,
  Alert
} from "react-native";
import { useTheme } from "@/contexts/ThemeContext";
import { apiFetch } from "@/lib/admin/apiClient";
import { X } from "lucide-react-native";

const { width, height } = Dimensions.get("window");

type BugStatus = "open" | "closed";

interface Attachment {
  fileName?: string;
  url?: string;
  mimeType?: string;
  size?: number;
}

interface BugItem {
  id: string;
  title: string;
  description: string;
  status?: BugStatus;
  taskTitle?: string;
  createdByUsername?: string;
  createdByRole?: string;
  createdAt?: string;
  source?: { panel?: string; path?: string };
  attachments?: Attachment[];
}

export default function Bugs() {
  const { uiTheme } = useTheme();
  const [loading, setLoading] = useState<boolean>(true);
  const [isBackgroundRefetching, setIsBackgroundRefetching] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [items, setItems] = useState<BugItem[]>([]);
  const [q, setQ] = useState<string>("");

  const [viewOpen, setViewOpen] = useState<boolean>(false);
  const [selected, setSelected] = useState<BugItem | null>(null);
  const [updating, setUpdating] = useState<boolean>(false);
  const [isEditingBug, setIsEditingBug] = useState<boolean>(false);
  const [editBugTitle, setEditBugTitle] = useState<string>("");
  const [editBugDesc, setEditBugDesc] = useState<string>("");

  const styles = useMemo(() => getThemedStyles(uiTheme), [uiTheme]);

  const load = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      } else {
        setIsBackgroundRefetching(true);
      }
      setApiError(null);
      const res = await apiFetch<{ items?: any[] }>("/api/bugs");
      const list = Array.isArray(res?.items) ? res.items : [];

      const mapped: BugItem[] = list
        .map((x: any) => ({
          id: String(x.id || x._id || ""),
          title: typeof x.title === "string" ? x.title : "",
          description: typeof x.description === "string" ? x.description : "",
          status: (x.status === "closed" ? "closed" : "open") as BugStatus,
          taskTitle: typeof x.taskTitle === "string" ? x.taskTitle : "",
          createdByUsername: typeof x.createdByUsername === "string" ? x.createdByUsername : "",
          createdByRole: typeof x.createdByRole === "string" ? x.createdByRole : "",
          createdAt: typeof x.createdAt === "string" ? x.createdAt : "",
          source: x.source && typeof x.source === "object" ? x.source : undefined,
          attachments: Array.isArray(x.attachments) ? x.attachments : [],
        }))
        .filter((x) => Boolean(x.id));

      setItems(mapped);
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Failed to load bugs");
    } finally {
      setLoading(false);
      setIsBackgroundRefetching(false);
    }
  };

  useEffect(() => {
    load(true);
  }, []);

  const filtered = useMemo(() => {
    const openOnly = items.filter((b) => b.status === "open");
    const query = q.trim().toLowerCase();
    if (!query) return openOnly;
    return openOnly.filter((b) => {
      const where = `${b.title} ${b.description} ${b.taskTitle || ""} ${b.createdByUsername || ""} ${b.source?.path || ""}`.toLowerCase();
      return where.includes(query);
    });
  }, [items, q]);

  const openBug = async (b: BugItem) => {
    setIsEditingBug(false);
    setSelected(b);
    setViewOpen(true);
    try {
      const res = await apiFetch<{ item: BugItem }>(`/api/bugs/${encodeURIComponent(b.id)}`);
      if (res?.item) {
        setSelected((prev) => (prev?.id === b.id ? { ...prev, ...res.item } : prev));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const updateBugDetails = async () => {
    if (!selected || !editBugTitle.trim() || !editBugDesc.trim()) return;
    try {
      setUpdating(true);
      setApiError(null);
      const res = await apiFetch<{ item?: any }>(`/api/bugs/${encodeURIComponent(selected.id)}`, {
        method: "PUT",
        body: JSON.stringify({ title: editBugTitle, description: editBugDesc }),
      });
      const updated = res?.item;
      if (updated) {
        const merged: BugItem = {
          ...selected,
          title: typeof updated.title === "string" ? updated.title : "",
          description: typeof updated.description === "string" ? updated.description : "",
        };
        setSelected(merged);
        setItems((prev) => prev.map((x) => (x.id === merged.id ? { ...x, title: merged.title, description: merged.description } : x)));
        setIsEditingBug(false);
      }
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Failed to update bug details");
    } finally {
      setUpdating(false);
    }
  };

  const updateStatus = async (next: BugStatus) => {
    if (!selected) return;
    try {
      setUpdating(true);
      setApiError(null);
      const res = await apiFetch<{ item?: any }>(`/api/bugs/${encodeURIComponent(selected.id)}`, {
        method: "PUT",
        body: JSON.stringify({ status: next }),
      });
      const updated = res?.item;
      const merged: BugItem = {
        ...selected,
        status: (updated?.status === "closed" ? "closed" : "open") as BugStatus,
      };
      setSelected(merged);
      setItems((prev) => prev.map((x) => (x.id === merged.id ? { ...x, status: merged.status } : x)));
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Failed to update bug");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerDeck}>
        <ActivityIndicator size="large" color={uiTheme.customColors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.rootContainer}>
      <View style={styles.headerDeck}>
        <View style={styles.headerTitleRow}>
          <View>
            <Text style={styles.screenHeading}>Complete Bug Report</Text>
            <Text style={styles.screenCaption}>Comprehensive list of system bug reports.</Text>
          </View>
          <TouchableOpacity style={styles.refreshButtonElement} onPress={() => void load(true)}>
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      </View>

      {apiError && (
        <View style={styles.alertPanelError}>
          <Text style={styles.errorTextLabel}>{apiError}</Text>
        </View>
      )}

      <View style={styles.searchContainerCard}>
        <TextInput
          style={styles.searchTextInputElement}
          placeholder="Search bugs..."
          placeholderTextColor="rgba(148,163,184,0.4)"
          value={q}
          onChangeText={setQ}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollWrapper}
        refreshControl={
          <RefreshControl refreshing={isBackgroundRefetching} onRefresh={() => load(false)} tintColor={uiTheme.customColors.primary} />
        }
      >
        <Text style={styles.blockTitleText}>Bugs ({filtered.length})</Text>

        {filtered.length === 0 ? (
          <View style={styles.emptyContainerState}>
            <Text style={styles.emptyResultsWarningText}>No open bugs found.</Text>
          </View>
        ) : (
          filtered.map((b) => (
            <TouchableOpacity key={b.id} style={styles.bugCardNodeFrame} onPress={() => openBug(b)} activeOpacity={0.7}>
              <View style={styles.cardHeaderTopInlineRow}>
                <View style={[styles.badgeBase, b.status === "closed" ? styles.badgeClosed : styles.badgeOpen]}>
                  <Text style={[styles.badgeText, b.status === "closed" ? { color: "#64748b" } : { color: uiTheme.customColors.primary }]}>
                    {b.status === "closed" ? "Closed" : "Open"}
                  </Text>
                </View>
                <Text style={styles.sourcePathMetaLabel} numberOfLines={1}>
                  {b.source?.path?.split("/").pop() || b.source?.panel || "System"}
                </Text>
              </View>

              <Text style={styles.bugPlateTitleHeading as any}>{b.title}</Text>
              <Text style={styles.bugPlateDescriptionBody as any} numberOfLines={2}>
                {b.description}
              </Text>

              {b.taskTitle ? (
                <Text style={styles.taskReferenceSubLabel} numberOfLines={1}>
                  Task: {b.taskTitle}
                </Text>
              ) : null}

              <View style={styles.cardFooterMetaBottomRow}>
                <View style={styles.userAvatarInlineGroup}>
                  <View style={styles.avatarMiniNodeWell}>
                    <Text style={styles.avatarMiniInitialText}>
                      {b.createdByUsername?.charAt(0).toUpperCase() || "A"}
                    </Text>
                  </View>
                  <Text style={styles.metaAuthorUsernameText}>{b.createdByUsername}</Text>
                  {b.createdByRole ? (
                    <Text style={styles.metaAuthorRoleText}>({b.createdByRole})</Text>
                  ) : null}
                </View>
                <Text style={styles.metaCreationTimestampText}>
                  {b.createdAt ? new Date(b.createdAt).toLocaleDateString() : ""}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <Modal visible={viewOpen} transparent animationType="fade" onRequestClose={() => setViewOpen(false)}>
        <TouchableOpacity style={styles.modalBlurOverlay} activeOpacity={1} onPress={() => setViewOpen(false)}>
          <View style={styles.modalContentCard} onStartShouldSetResponder={() => true}>
            <View style={styles.modalCardHeaderTopRow}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={styles.modalCardTitleHeading}>
                  {isEditingBug ? "Edit Bug Details" : (selected?.title || "Bug")}
                </Text>
                {selected?.source?.path || selected?.source?.panel ? (
                  <Text style={styles.modalCardSubtitlePath}>
                    {selected?.source?.path || selected?.source?.panel}
                  </Text>
                ) : null}
              </View>
              <TouchableOpacity onPress={() => setViewOpen(false)} style={styles.closeModalCrossButton}>
                <X size={18} color={uiTheme.panelColors.dashboardTextColor} style={{ opacity: 0.5 }} />
              </TouchableOpacity>
            </View>

            {selected ? (
              <ScrollView showsVerticalScrollIndicator={false} style={styles.modalMainScrollCanvas}>
                <View style={styles.modalMetaBadgeRow}>
                  <View style={[styles.badgeBase, selected.status === "closed" ? styles.badgeClosed : styles.badgeOpen]}>
                    <Text style={[styles.badgeText, selected.status === "closed" ? { color: "#64748b" } : { color: uiTheme.customColors.primary }]}>
                      {selected.status === "closed" ? "Closed" : "Open"}
                    </Text>
                  </View>
                  <Text style={styles.modalAuthorMetaText}>
                    {selected.createdByUsername ? `Posted by ${selected.createdByUsername}` : ""}
                    {selected.createdByRole ? ` (${selected.createdByRole})` : ""}
                  </Text>
                </View>

                {isEditingBug ? (
                  <View style={styles.modalFormWrapperContainer}>
                    <Text style={styles.formFieldNameLabel}>Bug Title</Text>
                    <TextInput
                      style={styles.modalFormInputText}
                      value={editBugTitle}
                      onChangeText={setEditBugTitle}
                    />
                    <Text style={styles.formFieldNameLabel}>Bug Description</Text>
                    <TextInput
                      style={styles.modalFormTextareaElement}
                      value={editBugDesc}
                      onChangeText={setEditBugDesc}
                      multiline
                      numberOfLines={5}
                      textAlignVertical="top"
                    />
                  </View> 
                ) : (
                  <View style={styles.modalDescriptionViewportBox}>
                    <Text style={styles.modalDescriptionContentText}>{selected.description}</Text>
                  </View>
                )}

                {selected.attachments && selected.attachments.length > 0 ? (
                  <View style={styles.attachmentsSectionWrapperBlock}>
                    <Text style={styles.attachmentsCountHeadingLabel}>Attachments ({selected.attachments.length})</Text>
                    <View style={styles.attachmentsGridDisplayLayout}>
                      {selected.attachments.map((att, i) => (
                        <View key={i} style={styles.attachmentImageContainerFrame}>
                          {att.url ? (
                            <Image
                              source={{ uri: att.url }}
                              style={styles.attachmentRenderedImageElement}
                              resizeMode="contain"
                            />
                          ) : null}
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}
              </ScrollView>
            ) : null}

            <View style={styles.modalCardActionsFooterRow}>
              {isEditingBug ? (
                <>
                  <TouchableOpacity style={styles.modalCancelButtonAction} onPress={() => setIsEditingBug(false)} disabled={updating}>
                    <Text style={styles.modalCancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.modalSubmitButtonAction, { backgroundColor: uiTheme.customColors.primary }]} 
                    onPress={() => void updateBugDetails()} 
                    disabled={updating || !editBugTitle.trim() || !editBugDesc.trim()}
                  >
                    <Text style={styles.modalSubmitButtonText}>Save Changes</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity style={styles.modalCancelButtonAction} onPress={() => setViewOpen(false)} disabled={updating}>
                    <Text style={styles.modalCancelButtonText}>Close</Text>
                  </TouchableOpacity>
                  {selected?.status === "open" && (
                    <TouchableOpacity 
                      style={styles.modalEditButtonAction} 
                      onPress={() => {
                        setEditBugTitle(selected.title || "");
                        setEditBugDesc(selected.description || "");
                        setIsEditingBug(true);
                      }} 
                      disabled={updating}
                    >
                      <Text style={styles.modalEditButtonText}>Edit</Text>
                    </TouchableOpacity>
                  )}
                  {selected?.status === "closed" ? (
                    <TouchableOpacity 
                      style={[styles.modalSubmitButtonAction, { backgroundColor: uiTheme.customColors.primary }]} 
                      onPress={() => void updateStatus("open")} 
                      disabled={updating}
                    >
                      <Text style={styles.modalSubmitButtonText}>Reopen</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity 
                      style={[styles.modalSubmitButtonAction, { backgroundColor: uiTheme.customColors.primary }]} 
                      onPress={() => void updateStatus("closed")} 
                      disabled={updating}
                    >
                      <Text style={styles.modalSubmitButtonText}>Mark Closed</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const getThemedStyles = (uiTheme: any) => {
  const isLightTheme = uiTheme.theme.includes("crystal") || uiTheme.panelColors.dashboardTextColor === "#000000";
  const structuralBorderColor = isLightTheme ? "rgba(0, 0, 0, 0.08)" : "rgba(255, 255, 255, 0.08)";
  const surfaceAlphaColor = isLightTheme ? "rgba(0, 0, 0, 0.03)" : "rgba(255, 255, 255, 0.03)";

  return StyleSheet.create({
    rootContainer: {
      flex: 1,
      backgroundColor: uiTheme.panelColors.dashboardBackground,
    },
    centerDeck: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: uiTheme.panelColors.dashboardBackground,
    },
    headerDeck: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 8,
    },
    headerTitleRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    screenHeading: {
      fontSize: 22,
      fontWeight: "800",
      letterSpacing: -0.5,
      color: uiTheme.panelColors.dashboardTextColor,
    },
    screenCaption: {
      fontSize: 12,
      color: uiTheme.panelColors.dashboardTextColor,
      opacity: 0.6,
      marginTop: 4,
    },
    refreshButtonElement: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: structuralBorderColor,
      backgroundColor: uiTheme.panelColors.dashboardCardBackground,
    },
    refreshButtonText: {
      fontSize: 12,
      fontWeight: "600",
      color: uiTheme.panelColors.dashboardTextColor,
    },
    alertPanelError: {
      backgroundColor: "rgba(239,68,68,0.1)",
      borderWidth: 1,
      borderColor: "rgba(239,68,68,0.2)",
      marginHorizontal: 16,
      marginTop: 8,
      padding: 12,
      borderRadius: 8,
    },
    errorTextLabel: {
      color: "#f87171",
      fontSize: 12,
    },
    searchContainerCard: {
      marginHorizontal: 16,
      marginTop: 12,
      marginBottom: 4,
      padding: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: structuralBorderColor,
      backgroundColor: uiTheme.panelColors.dashboardCardBackground,
    },
    searchTextInputElement: {
      height: 38,
      backgroundColor: surfaceAlphaColor,
      borderWidth: 1,
      borderColor: structuralBorderColor,
      borderRadius: 8,
      paddingHorizontal: 12,
      fontSize: 13,
      color: uiTheme.panelColors.dashboardTextColor,
    },
    scrollWrapper: {
      padding: 16,
      paddingBottom: 40,
    },
    blockTitleText: {
      fontSize: 15,
      fontWeight: "700",
      color: uiTheme.panelColors.dashboardTextColor,
      marginBottom: 12,
    },
    emptyContainerState: {
      paddingVertical: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyResultsWarningText: {
      fontSize: 13,
      color: uiTheme.panelColors.dashboardTextColor,
      opacity: 0.4,
      fontStyle: "italic",
    },
    bugCardNodeFrame: {
      borderWidth: 1,
      borderColor: structuralBorderColor,
      borderRadius: 14,
      padding: 14,
      marginBottom: 12,
      backgroundColor: uiTheme.panelColors.dashboardCardBackground,
    },
    cardHeaderTopInlineRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
    },
    badgeBase: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      borderWidth: 1,
    },
    badgeOpen: {
      backgroundColor: "rgba(59,130,246,0.1)",
      borderColor: "rgba(59,130,246,0.2)",
    },
    badgeClosed: {
      backgroundColor: "rgba(100,116,139,0.1)",
      borderColor: "rgba(100,116,139,0.2)",
    },
    badgeText: {
      fontSize: 9,
      fontWeight: "700",
      textTransform: "uppercase",
    },
    sourcePathMetaLabel: {
      fontSize: 10,
      fontWeight: "500",
      color: uiTheme.panelColors.dashboardTextColor,
      opacity: 0.5,
      maxWidth: width * 0.45,
    },
    bugPlateTitleHeading: {
      fontSize: 15,
      fontWeight: "700",
      color: uiTheme.panelColors.dashboardTextColor,
      marginBottom: 4,
    },
    bugPlateDescriptionBody: {
      fontSize: 12,
      color: uiTheme.panelColors.dashboardTextColor,
      opacity: 0.7,
      lineHeight: 16,
      marginBottom: 8,
    },
    taskReferenceSubLabel: {
      fontSize: 11,
      fontWeight: "500",
      color: uiTheme.panelColors.dashboardTextColor,
      opacity: 0.4,
      marginBottom: 12,
    },
    cardFooterMetaBottomRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderTopWidth: 1,
      borderTopColor: structuralBorderColor,
      paddingTop: 10,
    },
    userAvatarInlineGroup: {
      flexDirection: "row",
      alignItems: "center",
    },
    avatarMiniNodeWell: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: "rgba(59,130,246,0.1)",
      alignItems: "center",
      justifyContent: "center",
      marginRight: 6,
    },
    avatarMiniInitialText: {
      fontSize: 10,
      fontWeight: "700",
      color: uiTheme.customColors.primary,
    },
    metaAuthorUsernameText: {
      fontSize: 11,
      fontWeight: "600",
      color: uiTheme.panelColors.dashboardTextColor,
      opacity: 0.8,
    },
    metaAuthorRoleText: {
      fontSize: 10,
      color: uiTheme.panelColors.dashboardTextColor,
      opacity: 0.4,
      marginLeft: 3,
    },
    metaCreationTimestampText: {
      fontSize: 10,
      color: uiTheme.panelColors.dashboardTextColor,
      opacity: 0.4,
    },
    modalBlurOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.6)",
      justifyContent: "flex-end",
    },
    modalContentCard: {
      backgroundColor: uiTheme.panelColors.dashboardCardBackground,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      width: "100%",
      maxHeight: height * 0.85,
      padding: 20,
      borderWidth: 1,
      borderColor: structuralBorderColor,
    },
    modalCardHeaderTopRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: structuralBorderColor,
      paddingBottom: 12,
    },
    modalCardTitleHeading: {
      fontSize: 17,
      fontWeight: "800",
      color: uiTheme.panelColors.dashboardTextColor,
    },
    modalCardSubtitlePath: {
      fontSize: 11,
      color: uiTheme.panelColors.dashboardTextColor,
      opacity: 0.5,
      marginTop: 2,
    },
    closeModalCrossButton: {
      padding: 4,
    },
    modalMainScrollCanvas: {
      flexGrow: 0,
    },
    modalMetaBadgeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 14,
    },
    modalAuthorMetaText: {
      fontSize: 11,
      color: uiTheme.panelColors.dashboardTextColor,
      opacity: 0.6,
    },
    modalFormWrapperContainer: {
      gap: 10,
      marginBottom: 12,
    },
    formFieldNameLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: uiTheme.panelColors.dashboardTextColor,
      opacity: 0.7,
    },
    modalFormInputText: {
      borderWidth: 1,
      borderColor: structuralBorderColor,
      borderRadius: 8,
      height: 38,
      paddingHorizontal: 12,
      fontSize: 13,
      color: uiTheme.panelColors.dashboardTextColor,
      backgroundColor: surfaceAlphaColor,
    },
    modalFormTextareaElement: {
      borderWidth: 1,
      borderColor: structuralBorderColor,
      borderRadius: 8,
      padding: 12,
      fontSize: 13,
      color: uiTheme.panelColors.dashboardTextColor,
      backgroundColor: surfaceAlphaColor,
    },
    modalDescriptionViewportBox: {
      borderRadius: 8,
      borderWidth: 1,
      borderColor: structuralBorderColor,
      padding: 12,
      backgroundColor: surfaceAlphaColor,
      marginBottom: 16,
    },
    modalDescriptionContentText: {
      fontSize: 13,
      color: uiTheme.panelColors.dashboardTextColor,
      lineHeight: 18,
    },
    attachmentsSectionWrapperBlock: {
      marginBottom: 16,
    },
    attachmentsCountHeadingLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: uiTheme.panelColors.dashboardTextColor,
      marginBottom: 8,
    },
    attachmentsGridDisplayLayout: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    attachmentImageContainerFrame: {
      width: "48%",
      aspectRatio: 1.3,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: structuralBorderColor,
      backgroundColor: surfaceAlphaColor,
      overflow: "hidden",
    },
    attachmentRenderedImageElement: {
      width: "100%",
      height: "100%",
    },
    modalCardActionsFooterRow: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 10,
      marginTop: 12,
      borderTopWidth: 1,
      borderTopColor: structuralBorderColor,
      paddingTop: 14,
    },
    modalCancelButtonAction: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: structuralBorderColor,
      backgroundColor: surfaceAlphaColor,
    },
    modalCancelButtonText: {
      fontSize: 12,
      fontWeight: "600",
      color: uiTheme.panelColors.dashboardTextColor,
      opacity: 0.8,
    },
    modalEditButtonAction: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: structuralBorderColor,
      backgroundColor: surfaceAlphaColor,
    },
    modalEditButtonText: {
      fontSize: 12,
      fontWeight: "600",
      color: uiTheme.panelColors.dashboardTextColor,
    },
    modalSubmitButtonAction: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 6,
      justifyContent: "center",
      alignItems: "center",
    },
    modalSubmitButtonText: {
      fontSize: 12,
      fontWeight: "700",
      color: isLightTheme ? "#ffffff" : "#09090b",
    },
  });
};