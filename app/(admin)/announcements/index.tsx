import React, { useState, useEffect, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
  SafeAreaView,
  Dimensions
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Plus, 
  Search, 
  Bell, 
  Megaphone, 
  Trash2, 
  Edit, 
  Eye, 
  AlertCircle, 
  Archive, 
  Pin, 
  Calendar, 
  X, 
  ChevronDown 
} from "lucide-react-native";
import { apiFetch } from "@/lib/admin/apiClient";
import { useAuth } from "../../../contexts/AuthContext"; 
import { useTheme } from "../../../contexts/ThemeContext";
import { getAnnouncementWebSocket } from "@/lib/announcementWebSocket";
import { s } from "@/util/styles";
import AnnouncementAnalytics from "./component/AnnouncementAnalytics";

const { height } = Dimensions.get("window");

interface Announcement {
  id: string;
  title: string;
  body: string;
  priority: "low" | "medium" | "high" | "critical";
  category: string;
  status: "draft" | "scheduled" | "active" | "expired" | "archived";
  authorName: string;
  authorRole: string;
  createdAt: string;
  expiresAt?: string;
  scheduledFor?: string;
  repeat?: string;
  pinned: boolean;
  emergency: boolean;
  requiresAcknowledgement: boolean;
  sendPush?: boolean;
  sendEmail?: boolean;
  sendSms?: boolean;
  readPercentage: number;
  acknowledgedPercentage: number;
  targetSummary: string;
  isRead: boolean;
  isAcknowledged: boolean;
}

interface AnnouncementsApiResponse {
  items: Announcement[];
  total: number;
}

export default function Announcements() {
  const [tab, setTab] = useState<string>("all");
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const limit = 20;

  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterAuthor, setFilterAuthor] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo, setFilterDateTo] = useState<string>("");

  const [activeDropdown, setActiveDropdown] = useState<"priority" | "category" | "formPriority" | "formCategory" | "formRepeat" | null>(null);

  const [formTitle, setFormTitle] = useState<string>("");
  const [formBody, setFormBody] = useState<string>("");
  const [formPriority, setFormPriority] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [formCategory, setFormCategory] = useState<string>("general");
  const [formScheduledFor, setFormScheduledFor] = useState<string>("");
  const [formExpiresAt, setFormExpiresAt] = useState<string>("");
  const [formRepeat, setFormRepeat] = useState<string>("none");
  const [formRequiresAcknowledgement, setFormRequiresAcknowledgement] = useState<boolean>(false);
  const [formSendPush, setFormSendPush] = useState<boolean>(false);
  const [formSendEmail, setFormSendEmail] = useState<boolean>(false);
  const [formSendSms, setFormSendSms] = useState<boolean>(false);
  const [formPinned, setFormPinned] = useState<boolean>(false);
  const [formEmergency, setFormEmergency] = useState<boolean>(false);

  const auth = useAuth();
  const themeContext = useTheme() as any;

  const activeColors = useMemo(() => {
    if (themeContext?.colors) {
      return {
        ...themeContext.colors,
        text: "#ffffff"
      };
    }
    const uiTheme = themeContext?.uiTheme;
    if (uiTheme) {
      const isDark = uiTheme.theme === "dark" || uiTheme.theme === "metallic-elite";
      return {
        background: uiTheme.panelColors?.dashboardBackground || (isDark ? "#0f172a" : "#f8fafc"),
        surface: uiTheme.panelColors?.dashboardCardBackground || (isDark ? "#1e293b" : "#ffffff"),
        primary: uiTheme.customColors?.primary || "#b45309",
        border: uiTheme.panelColors?.borderColor || (isDark ? "#334155" : "#e2e8f0"),
        text: "#ffffff",
        textSecondary: isDark ? "#94a3b8" : "#64748b"
      };
    }
    return {
      background: "#f8fafc",
      surface: "#ffffff",
      primary: "#b45309",
      border: "#e2e8f0",
      text: "#ffffff",
      textSecondary: "#64748b"
    };
  }, [themeContext]);

  const userRole = auth?.user?.role || "";
  const isAdmin = ["super-admin", "admin", "manager", "team-lead"].includes(userRole);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isAdmin) return;

    const ws = getAnnouncementWebSocket();
    ws.connect({
      onNewAnnouncement: () => {
        void queryClient.invalidateQueries({ queryKey: ["announcements"] });
        Alert.alert("New Announcement", "A new announcement has been published");
      },
      onAnnouncementPublished: () => {
        void queryClient.invalidateQueries({ queryKey: ["announcements"] });
      },
      onAnnouncementUpdated: () => {
        void queryClient.invalidateQueries({ queryKey: ["announcements"] });
      },
      onAnnouncementDeleted: () => {
        void queryClient.invalidateQueries({ queryKey: ["announcements"] });
      },
      onAnnouncementExpired: () => {
        void queryClient.invalidateQueries({ queryKey: ["announcements"] });
      },
    });
  }, [isAdmin, queryClient]);

  const { data: announcementsData, isLoading } = useQuery<AnnouncementsApiResponse>({
    queryKey: ["announcements", tab, page, filterPriority, filterCategory, filterAuthor, filterDateFrom, filterDateTo],
    queryFn: async () => {
      const params = new URLSearchParams({
        tab,
        page: page.toString(),
        limit: limit.toString(),
      });
      if (filterPriority && filterPriority !== "all") params.append("priority", filterPriority);
      if (filterCategory && filterCategory !== "all") params.append("category", filterCategory);
      if (filterAuthor && filterAuthor !== "all") params.append("author", filterAuthor);
      if (filterDateFrom) params.append("dateFrom", filterDateFrom);
      if (filterDateTo) params.append("dateTo", filterDateTo);
      
      const res = await apiFetch<any>(`/api/announcements?${params.toString()}`);
      return res as AnnouncementsApiResponse;
    },
    enabled: isAdmin,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiFetch<any>(`/api/announcements/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["announcements"] });
      Alert.alert("Success", "Announcement deleted successfully");
    },
    onError: () => {
      Alert.alert("Error", "Failed to delete announcement");
    },
  });

  const pinMutation = useMutation({
    mutationFn: async ({ id, pinned }: { id: string; pinned: boolean }) => {
      return apiFetch<any>(`/api/announcements/${id}/pin`, {
        method: "POST",
        body: JSON.stringify({ pinned }),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["announcements"] });
      Alert.alert("Success", "Dashboard pin priority configured");
    },
    onError: () => {
      Alert.alert("Error", "Failed to adjust pin configurations");
    }
  });

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiFetch<any>(`/api/announcements/${id}/archive`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["announcements"] });
      Alert.alert("Success", "Announcement archived");
    },
    onError: () => {
      Alert.alert("Error", "Failed to archive item record");
    }
  });

  const submitUpsertMutation = useMutation({
    mutationFn: async () => {
      const targetUrl = selectedAnnouncement ? `/api/announcements/${selectedAnnouncement.id}` : "/api/announcements";
      const targetMethod = selectedAnnouncement ? "PUT" : "POST";
      return apiFetch<any>(targetUrl, {
        method: targetMethod,
        body: JSON.stringify({
          title: formTitle,
          body: formBody,
          priority: formPriority,
          category: formCategory,
          scheduledFor: formScheduledFor ? `${formScheduledFor}T00:00:00.000Z` : undefined,
          expiresAt: formExpiresAt ? `${formExpiresAt}T23:59:59.000Z` : undefined,
          repeat: formRepeat,
          requiresAcknowledgement: formRequiresAcknowledgement,
          sendPush: formSendPush,
          sendEmail: formSendEmail,
          sendSms: formSendSms,
          pinned: formPinned,
          emergency: formEmergency
        })
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["announcements"] });
      setShowCreateModal(false);
      setSelectedAnnouncement(null);
      Alert.alert("Success", "Announcement stored successfully");
    },
    onError: () => {
      Alert.alert("Error", "Failed to process announcement payload entry");
    }
  });

  const triggerOpenUpsertDialog = (targetItem?: Announcement) => {
    if (targetItem) {
      setSelectedAnnouncement(targetItem);
      setFormTitle(targetItem.title || "");
      setFormBody(targetItem.body || "");
      setFormPriority(targetItem.priority || "medium");
      setFormCategory(targetItem.category || "general");
      setFormScheduledFor(targetItem.scheduledFor ? targetItem.scheduledFor.split("T")[0] : "");
      setFormExpiresAt(targetItem.expiresAt ? targetItem.expiresAt.split("T")[0] : "");
      setFormRepeat(targetItem.repeat || "none");
      setFormRequiresAcknowledgement(targetItem.requiresAcknowledgement || false);
      setFormSendPush(targetItem.sendPush || false);
      setFormSendEmail(targetItem.sendEmail || false);
      setFormSendSms(targetItem.sendSms || false);
      setFormPinned(targetItem.pinned || false);
      setFormEmergency(targetItem.emergency || false);
    } else {
      setSelectedAnnouncement(null);
      setFormTitle("");
      setFormBody("");
      setFormPriority("medium");
      setFormCategory("general");
      setFormScheduledFor("");
      setFormExpiresAt("");
      setFormRepeat("none");
      setFormRequiresAcknowledgement(false);
      setFormSendPush(false);
      setFormSendEmail(false);
      setFormSendSms(false);
      setFormPinned(false);
      setFormEmergency(false);
    }
    setShowCreateModal(true);
  };

  const fireDeleteAlertCheck = (targetId: string) => {
    Alert.alert(
      "Delete Announcement?",
      "This action cannot be undone. The announcement and all related data will be permanently deleted.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(targetId) }
      ]
    );
  };

  const priorityOptions = [
    { id: "all", name: "All Priorities" },
    { id: "low", name: "Low" },
    { id: "medium", name: "Medium" },
    { id: "high", name: "High" },
    { id: "critical", name: "Critical" }
  ];

  const categoryOptions = [
    { id: "all", name: "All Categories" },
    { id: "general", name: "General" },
    { id: "policy", name: "Policy" },
    { id: "training", name: "Training" },
    { id: "safety", name: "Safety" },
    { id: "hr", name: "HR" },
    { id: "it", name: "IT" },
    { id: "operations", name: "Operations" }
  ];

  const repeatOptions = [
    { id: "none", name: "No Repeat" },
    { id: "daily", name: "Daily" },
    { id: "weekly", name: "Weekly" }
  ];

  const priorityFormOptions = priorityOptions.filter(p => p.id !== "all");
  const categoryFormOptions = categoryOptions.filter(c => c.id !== "all");

  const tabsStripOptions = [
    { value: "all", label: "All" },
    { value: "active", label: "Active" },
    { value: "unread", label: "Unread" },
    { value: "important", label: "Important" },
    { value: "archived", label: "Archived" },
    { value: "emergency", label: "Emergency" }
  ];

  const currentPriorityLabel = priorityOptions.find(p => p.id === filterPriority)?.name || "All Priorities";
  const currentCategoryLabel = categoryOptions.find(c => c.id === filterCategory)?.name || "All Categories";

  const formPriorityLabel = priorityOptions.find(p => p.id === formPriority)?.name || "Medium";
  const formCategoryLabel = categoryOptions.find(c => c.id === formCategory)?.name || "General";
  const formRepeatLabel = repeatOptions.find(r => r.id === formRepeat)?.name || "No Repeat";

  if (!isAdmin) {
    return (
      <SafeAreaView style={s(styles.safeAreaDeniedCanvas)}>
        <View style={s(styles.deniedCenterAlertWrapper)}>
          <AlertCircle size={44} color="#dc2626" style={s(styles.centeredIconMargin)} />
          <Text style={s(styles.deniedMainTitleLabelText)}>Access Denied</Text>
          <Text style={s(styles.deniedSubtextLabelPara)}>You don't have permission to access this page</Text>
        </View>
      </SafeAreaView>
    );
  }

  const announcements = announcementsData?.items || [];
  const total = announcementsData?.total || 0;

  return (
    <SafeAreaView style={[s(styles.safeAreaContainer), { backgroundColor: activeColors.background }]}>
      <ScrollView contentContainerStyle={s(styles.mainBodyScrollCanvas)} showsVerticalScrollIndicator={false}>
        
        <View style={s(styles.topDashboardHeaderBlock)}>
          <View style={s(styles.headerTitleContainerStrip)}>
            <Megaphone size={26} color={activeColors.primary} style={s(styles.inlineMarginRightSpacing)} />
            <View>
              <Text style={[s(styles.headerMainTitleTextLabel), { color: activeColors.text }]}>Announcements</Text>
              <Text style={[s(styles.headerSubtitleTextMeta), { color: activeColors.textSecondary }]}>Manage company announcements and communications</Text>
            </View>
          </View>

          <TouchableOpacity 
            style={[s(styles.createAnchorTriggerActionButton), { backgroundColor: activeColors.primary }]}
            activeOpacity={0.8}
            onPress={() => triggerOpenUpsertDialog()}
          >
            <Plus size={14} color="#ffffff" style={s(styles.inlineMarginRightSpacing)} />
            <Text style={s(styles.createAnchorTriggerButtonText)}>Create Announcement</Text>
          </TouchableOpacity>
        </View>

        <View style={s(styles.navigationTabsHorizontalScrollViewStrip)}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s(styles.tabsHorizontalItemsWrapLayout)}>
            {tabsStripOptions.map((tOpt) => {
              const isTabActive = tab === tOpt.value;
              return (
                <TouchableOpacity
                  key={tOpt.value}
                  style={[
                    s(styles.tabNavigationCellButton), 
                    isTabActive ? { backgroundColor: "#fffbeb", borderColor: "#fde68a" } : { backgroundColor: activeColors.surface, borderColor: activeColors.border }
                  ]}
                  onPress={() => {
                    setTab(tOpt.value);
                    setPage(1);
                  }}
                >
                  <Text style={[s(styles.tabNavigationCellInnerText), isTabActive ? { color: activeColors.primary } : { color: activeColors.textSecondary }]}>
                    {tOpt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={[s(styles.filterMetricsSurfaceCardWell), { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
          <View style={s(styles.filterSelectorsGridFlexLayoutRow)}>
            <TouchableOpacity 
              style={[s(styles.dropdownTriggerInteractiveAnchorBox), { backgroundColor: activeColors.background, borderColor: activeColors.border }]}
              onPress={() => setActiveDropdown("priority")}
            >
              <Text style={[s(styles.dropdownTriggerSelectionValueText), { color: activeColors.text }]} numberOfLines={1}>{currentPriorityLabel}</Text>
              <ChevronDown size={14} color={activeColors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[s(styles.dropdownTriggerInteractiveAnchorBox), { backgroundColor: activeColors.background, borderColor: activeColors.border }]}
              onPress={() => setActiveDropdown("category")}
            >
              <Text style={[s(styles.dropdownTriggerSelectionValueText), { color: activeColors.text }]} numberOfLines={1}>{currentCategoryLabel}</Text>
              <ChevronDown size={14} color={activeColors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={[s(styles.searchTextFieldBoxWrapperInline), { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
            <Search size={14} color={activeColors.textSecondary} style={s(styles.inlineMarginRightSpacing)} />
            <TextInput
              style={[s(styles.searchTextFieldInputFieldNative), { color: activeColors.text }]}
              placeholder="Filter by author..."
              placeholderTextColor={activeColors.textSecondary}
              value={filterAuthor === "all" ? "" : filterAuthor}
              onChangeText={(text) => {
                setFilterAuthor(text || "all");
                setPage(1);
              }}
            />
          </View>

          <View style={s(styles.dateRangeFieldsFlexAlignmentStripRow)}>
            <View style={[s(styles.dateRangeFieldInputCellBox), { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
              <Text style={[s(styles.dateRangeFieldDescriptorTextLabel), { color: activeColors.textSecondary }]}>From:</Text>
              <TextInput
                style={[s(styles.dateRangeInputFieldNativeElement), { color: activeColors.text }]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={activeColors.textSecondary}
                value={filterDateFrom}
                onChangeText={(val) => { setFilterDateFrom(val); setPage(1); }}
              />
            </View>
            <View style={[s(styles.dateRangeFieldInputCellBox), { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
              <Text style={[s(styles.dateRangeFieldDescriptorTextLabel), { color: activeColors.textSecondary }]}>To:</Text>
              <TextInput
                style={[s(styles.dateRangeInputFieldNativeElement), { color: activeColors.text }]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={activeColors.textSecondary}
                value={filterDateTo}
                onChangeText={(val) => { setFilterDateTo(val); setPage(1); }}
              />
            </View>
          </View>

          {(filterPriority !== "all" || filterCategory !== "all" || filterAuthor !== "all" || filterDateFrom || filterDateTo) ? (
            <TouchableOpacity 
              style={s(styles.clearFiltersActionBlockButton)}
              onPress={() => {
                setFilterPriority("all");
                setFilterCategory("all");
                setFilterAuthor("all");
                setFilterDateFrom("");
                setFilterDateTo("");
                setPage(1);
              }}
            >
              <X size={12} color="#dc2626" style={s(styles.inlineMarginRightSpacing)} />
              <Text style={s(styles.clearFiltersActionBlockButtonText)}>Clear Filters</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {isLoading ? (
          <View style={s(styles.loaderCentralEngineIndicatorSpacingCanvas)}>
            <ActivityIndicator size="large" color={activeColors.primary} />
          </View>
        ) : announcements.length === 0 ? (
          <View style={[s(styles.emptyFallbackStateDisplayGraphicCard), { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
            <Bell size={40} color={activeColors.border} style={s(styles.centeredIconMargin)} />
            <Text style={[s(styles.emptyFallbackStateMainHeadingText), { color: activeColors.text }]}>No announcements yet</Text>
            <Text style={[s(styles.emptyFallbackStateSecondaryParagraphText), { color: activeColors.textSecondary }]}>Create your first announcement to get started</Text>
          </View>
        ) : (
          <View style={s(styles.registryRowItemsVerticalStackLayoutGrid)}>
            {announcements.map((announcement) => (
              <View key={announcement.id} style={[s(styles.itemRegistryRowContainerCard), { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
                <View style={s(styles.itemRegistryCardHeaderLineRow)}>
                  <View style={s(styles.itemRegistryTitleGroupingMetaColumn)}>
                    <Text style={[s(styles.itemRegistryAnnouncementTitleHeaderText), { color: activeColors.text }]} numberOfLines={2}>
                      {announcement.title}
                    </Text>
                    <View style={s(styles.itemRegistryBadgesFlexibleWrapLayoutStrip)}>
                      <View style={[s(styles.itemPriorityInlineBadgeBoxFrame), announcement.priority === "critical" && styles.itemPriorityCriticalBg]}>
                        <Text style={s(styles.itemPriorityInlineBadgeInnerText)}>{announcement.priority}</Text>
                      </View>
                      <View style={s(styles.itemCategoryInlineBadgeBoxFrame)}>
                        <Text style={s(styles.itemCategoryInlineBadgeInnerText)}>{announcement.category}</Text>
                      </View>
                      {announcement.pinned && (
                        <View style={s(styles.itemPinnedInlineBadgeBoxFrame)}>
                          <Pin size={10} color={activeColors.primary} />
                        </View>
                      )}
                      {announcement.emergency && (
                        <View style={s(styles.itemEmergencyInlineBadgeBoxFrame)}>
                          <Text style={s(styles.itemEmergencyInlineBadgeInnerText)}>Emergency</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                <Text style={[s(styles.itemRegistryAnnouncementBodyMessageParagraphText), { color: activeColors.text }]} numberOfLines={4}>
                  {announcement.body}
                </Text>

                <View style={s(styles.itemRegistryActionsControlBarPanelStrip)}>
                  <TouchableOpacity 
                    style={[s(styles.itemControlPanelUtilityButtonFrame), s(styles.itemControlPanelViewThemeButton), { backgroundColor: activeColors.background, borderColor: activeColors.border }]}
                    onPress={() => {
                      setSelectedAnnouncement(announcement); 
                      setShowAnalyticsModal(true);         
                    }}
                  >
                    <Eye size={12} color={activeColors.textSecondary} />
                    <Text style={[s(styles.itemControlPanelUtilityButtonInnerText), { color: activeColors.textSecondary }]}>View</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[s(styles.itemControlPanelUtilityButtonFrame), s(styles.itemControlPanelEditThemeButton)]}
                    onPress={() => triggerOpenUpsertDialog(announcement)}
                  >
                    <Edit size={12} color={activeColors.primary} />
                    <Text style={[s(styles.itemControlPanelUtilityButtonInnerText), { color: activeColors.primary }]}>Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[s(styles.itemControlPanelUtilityButtonFrame), announcement.pinned && s(styles.itemControlPanelEditThemeButton), { backgroundColor: activeColors.background, borderColor: activeColors.border }]}
                    onPress={() => pinMutation.mutate({ id: announcement.id, pinned: !announcement.pinned })}
                  >
                    <Pin size={12} color={announcement.pinned ? activeColors.primary : activeColors.textSecondary} />
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[s(styles.itemControlPanelUtilityButtonFrame), { backgroundColor: activeColors.background, borderColor: activeColors.border }]}
                    onPress={() => archiveMutation.mutate(announcement.id)}
                  >
                    <Archive size={12} color={activeColors.textSecondary} />
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[s(styles.itemControlPanelUtilityButtonFrame), s(styles.itemControlPanelDeleteThemeButton)]}
                    onPress={() => fireDeleteAlertCheck(announcement.id)}
                  >
                    <Trash2 size={12} color="#dc2626" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {total > limit && (
          <View style={[s(styles.paginationControlsFooterBarLayoutBlock), { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
            <TouchableOpacity 
              style={[s(styles.paginationArrowStepBoundaryButton), page === 1 && styles.paginationArrowDisabledOpacity, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}
              disabled={page === 1}
              onPress={() => setPage(p => Math.max(1, p - 1))}
            >
              <Text style={[s(styles.paginationArrowStepLabelText), { color: activeColors.textSecondary }]}>Previous</Text>
            </TouchableOpacity>
            <Text style={[s(styles.paginationIndexDisplayIndicatorLabelText), { color: activeColors.textSecondary }]}>
              Page {page} of {Math.ceil(total / limit)}
            </Text>
            <TouchableOpacity 
              style={[s(styles.paginationArrowStepBoundaryButton), page * limit >= total && styles.paginationArrowDisabledOpacity, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}
              disabled={page * limit >= total}
              onPress={() => setPage(p => p + 1)}
            >
              <Text style={[s(styles.paginationArrowStepLabelText), { color: activeColors.textSecondary }]}>Next</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>

      <Modal animationType="slide" transparent={true} visible={activeDropdown !== null} onRequestClose={() => setActiveDropdown(null)}>
        <View style={s(styles.pickerOverlayModalSheetBlurWindow)}>
          <View style={[s(styles.pickerContentWindowCardSurface), { backgroundColor: activeColors.surface }]}>
            <View style={[s(styles.pickerContentHeaderBarTopRow), { borderBottomColor: activeColors.border }]}>
              <Text style={[s(styles.pickerContentHeaderTitleHeadingText), { color: activeColors.text }]}>Select Value</Text>
              <TouchableOpacity onPress={() => setActiveDropdown(null)} style={s(styles.pickerCloseCrossTouchTargetBoundary)}>
                <X size={16} color={activeColors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={s(styles.pickerSelectionItemsScrollCanvasList)} keyboardShouldPersistTaps="handled">
              {activeDropdown === "priority" && priorityOptions.map((opt) => (
                <TouchableOpacity key={opt.id} style={[s(styles.pickerSelectionOptionRowAnchorTile), { borderBottomColor: activeColors.border }]} onPress={() => { setFilterPriority(opt.id); setActiveDropdown(null); }}>
                  <Text style={[s(styles.pickerSelectionOptionValueLabelString), { color: activeColors.text }]}>{opt.name}</Text>
                </TouchableOpacity>
              ))}
              {activeDropdown === "formPriority" && priorityFormOptions.map((opt) => (
                <TouchableOpacity key={opt.id} style={[s(styles.pickerSelectionOptionRowAnchorTile), { borderBottomColor: activeColors.border }]} onPress={() => { setFormPriority(opt.id as any); setActiveDropdown(null); }}>
                  <Text style={[s(styles.pickerSelectionOptionValueLabelString), formPriority === opt.id && { color: activeColors.primary }]}>{opt.name}</Text>
                </TouchableOpacity>
              ))}
              {activeDropdown === "category" && categoryOptions.map((opt) => (
                <TouchableOpacity key={opt.id} style={[s(styles.pickerSelectionOptionRowAnchorTile), { borderBottomColor: activeColors.border }]} onPress={() => { setFilterCategory(opt.id); setActiveDropdown(null); }}>
                  <Text style={[s(styles.pickerSelectionOptionValueLabelString), { color: activeColors.text }]}>{opt.name}</Text>
                </TouchableOpacity>
              ))}
              {activeDropdown === "formCategory" && categoryFormOptions.map((opt) => (
                <TouchableOpacity key={opt.id} style={[s(styles.pickerSelectionOptionRowAnchorTile), { borderBottomColor: activeColors.border }]} onPress={() => { setFormCategory(opt.id); setActiveDropdown(null); }}>
                  <Text style={[s(styles.pickerSelectionOptionValueLabelString), formCategory === opt.id && { color: activeColors.primary }]}>{opt.name}</Text>
                </TouchableOpacity>
              ))}
              {activeDropdown === "formRepeat" && repeatOptions.map((opt) => (
                <TouchableOpacity key={opt.id} style={[s(styles.pickerSelectionOptionRowAnchorTile), { borderBottomColor: activeColors.border }]} onPress={() => { setFormRepeat(opt.id); setActiveDropdown(null); }}>
                  <Text style={[s(styles.pickerSelectionOptionValueLabelString), formRepeat === opt.id && { color: activeColors.primary }]}>{opt.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal animationType="slide" transparent={true} visible={showCreateModal} onRequestClose={() => setShowCreateModal(false)}>
        <View style={s(styles.pickerOverlayModalSheetBlurWindow)}>
          <View style={[s(styles.formWindowCardSurfaceExtendedHeight), { backgroundColor: activeColors.surface }]}>
            <View style={[s(styles.pickerContentHeaderBarTopRow), { borderBottomColor: activeColors.border }]}>
              <Text style={[s(styles.pickerContentHeaderTitleHeadingText), { color: activeColors.text }]}>
                {selectedAnnouncement ? "Edit Announcement" : "Create Announcement"}
              </Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)} style={s(styles.pickerCloseCrossTouchTargetBoundary)}>
                <X size={16} color={activeColors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={s(styles.formScrollingLayoutCanvas)}>
              <View style={s(styles.formInputFieldsGroupSpacerContainer)}>
                
                <Text style={[s(styles.formInputFieldTitleTextLabel), { color: activeColors.textSecondary }]}>Title</Text>
                <TextInput
                  style={[s(styles.formInputTextNativeFieldElement), { color: activeColors.text, borderColor: activeColors.border, backgroundColor: activeColors.background }]}
                  placeholder="Enter announcement title"
                  placeholderTextColor={activeColors.textSecondary}
                  value={formTitle}
                  onChangeText={setFormTitle}
                />

                <Text style={[s(styles.formInputFieldTitleTextLabel), { color: activeColors.textSecondary }]}>Content</Text>
                <TextInput
                  style={[s(styles.formTextAreaNativeFieldElement), { color: activeColors.text, borderColor: activeColors.border, backgroundColor: activeColors.background }]}
                  placeholder="Enter announcement content body details..."
                  placeholderTextColor={activeColors.textSecondary}
                  value={formBody}
                  onChangeText={setFormBody}
                  multiline={true}
                  numberOfLines={4}
                />

                <View style={s(styles.filterSelectorsGridFlexLayoutRow)}>
                  <View style={s(styles.flexFieldCellUnit)}>
                    <Text style={[s(styles.formInputFieldTitleTextLabel), { color: activeColors.textSecondary }]}>Priority</Text>
                    <TouchableOpacity style={[s(styles.dropdownTriggerInteractiveAnchorBox), { backgroundColor: activeColors.background, borderColor: activeColors.border }]} onPress={() => setActiveDropdown("formPriority")}>
                      <Text style={[s(styles.dropdownTriggerSelectionValueText), { color: activeColors.text }]} numberOfLines={1}>{formPriorityLabel}</Text>
                      <ChevronDown size={14} color={activeColors.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  <View style={s(styles.flexFieldCellUnit)}>
                    <Text style={[s(styles.formInputFieldTitleTextLabel), { color: activeColors.textSecondary }]}>Category</Text>
                    <TouchableOpacity style={[s(styles.dropdownTriggerInteractiveAnchorBox), { backgroundColor: activeColors.background, borderColor: activeColors.border }]} onPress={() => setActiveDropdown("formCategory")}>
                      <Text style={[s(styles.dropdownTriggerSelectionValueText), { color: activeColors.text }]} numberOfLines={1}>{formCategoryLabel}</Text>
                      <ChevronDown size={14} color={activeColors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={s(styles.filterSelectorsGridFlexLayoutRow)}>
                  <View style={s(styles.flexFieldCellUnit)}>
                    <Text style={[s(styles.formInputFieldTitleTextLabel), { color: activeColors.textSecondary }]}>Schedule For (Optional)</Text>
                    <View style={[s(styles.searchTextFieldBoxWrapperInline), { backgroundColor: activeColors.background, borderColor: activeColors.border }]}>
                      <Calendar size={14} color={activeColors.textSecondary} style={s(styles.inlineMarginRightSpacing)} />
                      <TextInput
                        style={[s(styles.searchTextFieldInputFieldNative), { color: activeColors.text }]}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={activeColors.textSecondary}
                        value={formScheduledFor}
                        onChangeText={setFormScheduledFor}
                      />
                    </View>
                  </View>

                  <View style={s(styles.flexFieldCellUnit)}>
                    <Text style={[s(styles.formInputFieldTitleTextLabel), { color: activeColors.textSecondary }]}>Expires At (Optional)</Text>
                    <View style={[s(styles.searchTextFieldBoxWrapperInline), { backgroundColor: activeColors.background, borderColor: activeColors.border }]}>
                      <Calendar size={14} color={activeColors.textSecondary} style={s(styles.inlineMarginRightSpacing)} />
                      <TextInput
                        style={[s(styles.searchTextFieldInputFieldNative), { color: activeColors.text }]}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={activeColors.textSecondary}
                        value={formExpiresAt}
                        onChangeText={setFormExpiresAt}
                      />
                    </View>
                  </View>
                </View>

                <Text style={[s(styles.formInputFieldTitleTextLabel), { color: activeColors.textSecondary }]}>Repeat</Text>
                <TouchableOpacity style={[s(styles.dropdownTriggerInteractiveAnchorBox), { backgroundColor: activeColors.background, borderColor: activeColors.border }]} onPress={() => setActiveDropdown("formRepeat")}>
                  <Text style={[s(styles.dropdownTriggerSelectionValueText), { color: activeColors.text }]} numberOfLines={1}>{formRepeatLabel}</Text>
                  <ChevronDown size={14} color={activeColors.textSecondary} />
                </TouchableOpacity>

                <View style={[s(styles.toggleOptionRowWrapperAlignment), { borderBottomColor: activeColors.border }]}>
                  <Text style={[s(styles.toggleOptionMainTitleText), { color: activeColors.text }]}>Require read acknowledgement</Text>
                  <TouchableOpacity 
                    style={[s(styles.customSwitchTrackFrame), formRequiresAcknowledgement ? { backgroundColor: activeColors.primary } : { backgroundColor: "#cbd5e1" }]}
                    onPress={() => setFormRequiresAcknowledgement(!formRequiresAcknowledgement)}
                  >
                    <View style={[s(styles.customSwitchKnobCircle), formRequiresAcknowledgement ? styles.customSwitchKnobActivePosition : styles.customSwitchKnobInactivePosition]} />
                  </TouchableOpacity>
                </View>

                <View style={[s(styles.toggleOptionRowWrapperAlignment), { borderBottomColor: activeColors.border }]}>
                  <Text style={[s(styles.toggleOptionMainTitleText), { color: activeColors.text }]}>Send push notification</Text>
                  <TouchableOpacity 
                    style={[s(styles.customSwitchTrackFrame), formSendPush ? { backgroundColor: activeColors.primary } : { backgroundColor: "#cbd5e1" }]}
                    onPress={() => setFormSendPush(!formSendPush)}
                  >
                    <View style={[s(styles.customSwitchKnobCircle), formSendPush ? styles.customSwitchKnobActivePosition : styles.customSwitchKnobInactivePosition]} />
                  </TouchableOpacity>
                </View>

                <View style={[s(styles.toggleOptionRowWrapperAlignment), { borderBottomColor: activeColors.border }]}>
                  <Text style={[s(styles.toggleOptionMainTitleText), { color: activeColors.text }]}>Send email notification</Text>
                  <TouchableOpacity 
                    style={[s(styles.customSwitchTrackFrame), formSendEmail ? { backgroundColor: activeColors.primary } : { backgroundColor: "#cbd5e1" }]}
                    onPress={() => setFormSendEmail(!formSendEmail)}
                  >
                    <View style={[s(styles.customSwitchKnobCircle), formSendEmail ? styles.customSwitchKnobActivePosition : styles.customSwitchKnobInactivePosition]} />
                  </TouchableOpacity>
                </View>

                <View style={[s(styles.toggleOptionRowWrapperAlignment), { borderBottomColor: activeColors.border }]}>
                  <Text style={[s(styles.toggleOptionMainTitleText), { color: activeColors.text }]}>Send SMS notification</Text>
                  <TouchableOpacity 
                    style={[s(styles.customSwitchTrackFrame), formSendSms ? { backgroundColor: activeColors.primary } : { backgroundColor: "#cbd5e1" }]}
                    onPress={() => setFormSendSms(!formSendSms)}
                  >
                    <View style={[s(styles.customSwitchKnobCircle), formSendSms ? styles.customSwitchKnobActivePosition : styles.customSwitchKnobInactivePosition]} />
                  </TouchableOpacity>
                </View>

                <View style={[s(styles.toggleOptionRowWrapperAlignment), { borderBottomColor: activeColors.border }]}>
                  <Text style={[s(styles.toggleOptionMainTitleText), { color: activeColors.text }]}>Pin to dashboard</Text>
                  <TouchableOpacity 
                    style={[s(styles.customSwitchTrackFrame), formPinned ? { backgroundColor: activeColors.primary } : { backgroundColor: "#cbd5e1" }]}
                    onPress={() => setFormPinned(!formPinned)}
                  >
                    <View style={[s(styles.customSwitchKnobCircle), formPinned ? styles.customSwitchKnobActivePosition : styles.customSwitchKnobInactivePosition]} />
                  </TouchableOpacity>
                </View>

                <View style={[s(styles.toggleOptionRowWrapperAlignment), { borderBottomColor: activeColors.border }]}>
                  <Text style={[s(styles.toggleOptionMainTitleText), { color: activeColors.text }]}>Mark as emergency alert</Text>
                  <TouchableOpacity 
                    style={[s(styles.customSwitchTrackFrame), formEmergency ? { backgroundColor: activeColors.primary } : { backgroundColor: "#cbd5e1" }]}
                    onPress={() => setFormEmergency(!formEmergency)}
                  >
                    <View style={[s(styles.customSwitchKnobCircle), formEmergency ? styles.customSwitchKnobActivePosition : styles.customSwitchKnobInactivePosition]} />
                  </TouchableOpacity>
                </View>

                <View style={[s(styles.modalActionButtonsFooterRowContainer), { borderTopColor: activeColors.border }]}>
                  <TouchableOpacity style={s(styles.modalDismissCancelTextLinkButton)} onPress={() => setShowCreateModal(false)}>
                    <Text style={[s(styles.modalDismissCancelTextLinkLabelText), { color: activeColors.textSecondary }]}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[s(styles.formSubmitActionStripExecuteButton), { backgroundColor: activeColors.primary }]}
                    onPress={() => submitUpsertMutation.mutate()}
                    disabled={submitUpsertMutation.isPending}
                  >
                    {submitUpsertMutation.isPending ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={s(styles.formSubmitActionStripExecuteButtonText)}>
                        {selectedAnnouncement ? "Save Changes" : "Create"}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>

              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {selectedAnnouncement && (
        <AnnouncementAnalytics
          isOpen={showAnalyticsModal}
          onClose={() => {
            setShowAnalyticsModal(false);
            setSelectedAnnouncement(null); 
          }}
          announcementId={selectedAnnouncement.id}
        />
      )}

      <Modal animationType="fade" transparent={true} visible={false} onRequestClose={() => setShowAnalyticsModal(false)}>
        <View style={s(styles.pickerOverlayModalSheetBlurWindow)}>
          <View style={[s(styles.pickerContentWindowCardSurface), { backgroundColor: activeColors.surface }]}>
            <View style={[s(styles.pickerContentHeaderBarTopRow), { borderBottomColor: activeColors.border }]}>
              <Text style={[s(styles.pickerContentHeaderTitleHeadingText), { color: activeColors.text }]}>Announcement Insights Analytics</Text>
              <TouchableOpacity onPress={() => setShowAnalyticsModal(false)} style={s(styles.pickerCloseCrossTouchTargetBoundary)}>
                <X size={16} color={activeColors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={s(styles.analyticsInsightMetricsBlockGrid)}>
              {selectedAnnouncement && (
                <>
                  <View style={[s(styles.analyticsInsightMetricCellCard), { backgroundColor: activeColors.background, borderColor: activeColors.border }]}>
                    <Text style={[s(styles.analyticsInsightMetricNumericText), { color: activeColors.primary }]}>{selectedAnnouncement.readPercentage || 0}%</Text>
                    <Text style={[s(styles.analyticsInsightMetricLabelMetaText), { color: activeColors.textSecondary }]}>Read Percentage</Text>
                  </View>
                  <View style={[s(styles.analyticsInsightMetricCellCard), { backgroundColor: activeColors.background, borderColor: activeColors.border }]}>
                    <Text style={[s(styles.analyticsInsightMetricNumericText), { color: activeColors.primary }]}>{selectedAnnouncement.acknowledgedPercentage || 0}%</Text>
                    <Text style={[s(styles.analyticsInsightMetricLabelMetaText), { color: activeColors.textSecondary }]}>Acknowledged</Text>
                  </View>
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeAreaContainer: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  safeAreaDeniedCanvas: {
    flex: 1,
    backgroundColor: "#0f172a",
    justifyContent: "center",
    alignItems: "center",
  },
  deniedCenterAlertWrapper: {
    alignItems: "center",
    paddingHorizontal: 32,
  },
  centeredIconMargin: {
    marginBottom: 12,
  },
  deniedMainTitleLabelText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#ffffff",
    marginBottom: 6,
  },
  deniedSubtextLabelPara: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
  },
  mainBodyScrollCanvas: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  topDashboardHeaderBlock: {
    paddingVertical: 16,
    gap: 12,
  },
  headerTitleContainerStrip: {
    flexDirection: "row",
    alignItems: "center",
  },
  inlineMarginRightSpacing: {
    marginRight: 6,
  },
  headerMainTitleTextLabel: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -0.5,
  },
  headerSubtitleTextMeta: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 1,
  },
  createAnchorTriggerActionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#b45309",
    borderRadius: 8,
    height: 40,
    paddingHorizontal: 16,
  },
  createAnchorTriggerButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  navigationTabsHorizontalScrollViewStrip: {
    marginBottom: 14,
  },
  tabsHorizontalItemsWrapLayout: {
    gap: 6,
  },
  tabNavigationCellButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 6,
    borderWidth: 1,
  },
  tabNavigationCellInnerText: {
    fontSize: 12,
    fontWeight: "600",
  },
  filterMetricsSurfaceCardWell: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 12,
    gap: 10,
    marginBottom: 16,
  },
  filterSelectorsGridFlexLayoutRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  flexFieldCellUnit: {
    flex: 1,
    gap: 4
  },
  dropdownTriggerInteractiveAnchorBox: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 6,
    height: 36,
    paddingHorizontal: 10,
    backgroundColor: "#f8fafc",
  },
  dropdownTriggerSelectionValueText: {
    fontSize: 12,
    color: "#334155",
    fontWeight: "600",
    flex: 1,
  },
  searchTextFieldBoxWrapperInline: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 6,
    paddingHorizontal: 10,
    height: 38,
    backgroundColor: "#ffffff",
  },
  searchTextFieldInputFieldNative: {
    flex: 1,
    fontSize: 13,
    color: "#0f172a",
    height: "100%",
  },
  dateRangeFieldsFlexAlignmentStripRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  dateRangeFieldInputCellBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 6,
    height: 36,
    paddingHorizontal: 8,
    backgroundColor: "#ffffff",
  },
  dateRangeFieldDescriptorTextLabel: {
    fontSize: 11,
    color: "#64748b",
    marginRight: 4,
    fontWeight: "600",
  },
  dateRangeInputFieldNativeElement: {
    flex: 1,
    fontSize: 12,
    color: "#0f172a",
    padding: 0,
    height: "100%",
  },
  clearFiltersActionBlockButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#fecaca",
    backgroundColor: "#fef2f2",
    borderRadius: 6,
  },
  clearFiltersActionBlockButtonText: {
    fontSize: 12,
    color: "#dc2626",
    fontWeight: "700",
  },
  loaderCentralEngineIndicatorSpacingCanvas: {
    paddingVertical: 48,
  },
  emptyFallbackStateDisplayGraphicCard: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingVertical: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyFallbackStateMainHeadingText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 2,
  },
  emptyFallbackStateSecondaryParagraphText: {
    fontSize: 12,
    color: "#64748b",
  },
  registryRowItemsVerticalStackLayoutGrid: {
    gap: 12,
  },
  itemRegistryRowContainerCard: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 14,
  },
  itemRegistryCardHeaderLineRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  itemRegistryTitleGroupingMetaColumn: {
    flex: 1,
  },
  itemRegistryAnnouncementTitleHeaderText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -0.2,
    lineHeight: 18,
  },
  itemRegistryBadgesFlexibleWrapLayoutStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
    flexWrap: "wrap",
  },
  itemPriorityInlineBadgeBoxFrame: {
    backgroundColor: "#f1f5f9",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  itemPriorityCriticalBg: {
    backgroundColor: "#fee2e2",
  },
  itemPriorityInlineBadgeInnerText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#475569",
    textTransform: "uppercase",
  },
  itemCategoryInlineBadgeBoxFrame: {
    backgroundColor: "#fffbeb",
    borderWidth: 0.5,
    borderColor: "#fde68a",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  itemCategoryInlineBadgeInnerText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#b45309",
    textTransform: "capitalize",
  },
  itemPinnedInlineBadgeBoxFrame: {
    paddingHorizontal: 2,
  },
  itemEmergencyInlineBadgeBoxFrame: {
    backgroundColor: "#b91c1c",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  itemEmergencyInlineBadgeInnerText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#ffffff"
  },
  itemRegistryAnnouncementBodyMessageParagraphText: {
    fontSize: 13,
    color: "#334155",
    lineHeight: 18,
    marginVertical: 8,
  },
  itemRegistryActionsControlBarPanelStrip: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 6,
    marginTop: 10,
  },
  itemControlPanelUtilityButtonFrame: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 28,
    width: 32,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
  },
  itemControlPanelViewThemeButton: {
    width: 54,
    gap: 4,
  },
  itemControlPanelEditThemeButton: {
    width: 54,
    gap: 4,
    borderColor: "#fde68a",
    backgroundColor: "#fffbeb",
  },
  itemControlPanelDeleteThemeButton: {
    borderColor: "#fecaca",
    backgroundColor: "#fef2f2",
  },
  itemControlPanelUtilityButtonInnerText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  paginationControlsFooterBarLayoutBlock: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    marginTop: 14,
  },
  paginationArrowStepBoundaryButton: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: "#ffffff",
  },
  paginationArrowDisabledOpacity: {
    opacity: 0.4,
  },
  paginationArrowStepLabelText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  paginationIndexDisplayIndicatorLabelText: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "600",
  },
  pickerOverlayModalSheetBlurWindow: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    justifyContent: "flex-end",
  },
  pickerContentWindowCardSurface: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    width: "100%",
    maxHeight: height * 0.45,
    padding: 20,
  },
  formWindowCardSurfaceExtendedHeight: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    width: "100%",
    maxHeight: height * 0.85,
    padding: 20,
  },
  pickerContentHeaderBarTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingBottom: 12,
    marginBottom: 8,
  },
  pickerContentHeaderTitleHeadingText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
  },
  pickerCloseCrossTouchTargetBoundary: {
    padding: 4,
  },
  pickerSelectionItemsScrollCanvasList: {
    flexGrow: 0,
  },
  pickerSelectionOptionRowAnchorTile: {
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  pickerSelectionOptionValueLabelString: {
    fontSize: 14,
    color: "#334155",
    fontWeight: "500",
  },
  formScrollingLayoutCanvas: {
    paddingBottom: 24,
  },
  formInputFieldsGroupSpacerContainer: {
    gap: 12,
    paddingVertical: 8,
  },
  formInputFieldTitleTextLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    marginTop: 2,
  },
  formInputTextNativeFieldElement: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 6,
    height: 40,
    paddingHorizontal: 10,
    fontSize: 13,
    color: "#0f172a",
    backgroundColor: "#ffffff",
  },
  formTextAreaNativeFieldElement: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 6,
    minHeight: 80,
    paddingHorizontal: 10,
    paddingTop: 8,
    fontSize: 13,
    color: "#0f172a",
    backgroundColor: "#ffffff",
    textAlignVertical: "top",
  },
  toggleOptionRowWrapperAlignment: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9"
  },
  toggleOptionMainTitleText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1e293b",
    flex: 1,
    marginRight: 8
  },
  customSwitchTrackFrame: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
    justifyContent: "center"
  },
  customSwitchKnobCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#ffffff"
  },
  customSwitchKnobActivePosition: {
    alignSelf: "flex-end"
  },
  customSwitchKnobInactivePosition: {
    alignSelf: "flex-start"
  },
  modalActionButtonsFooterRowContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 12,
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 14,
  },
  modalDismissCancelTextLinkButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  modalDismissCancelTextLinkLabelText: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "600",
  },
  formSubmitActionStripExecuteButton: {
    backgroundColor: "#b45309",
    height: 40,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  formSubmitActionStripExecuteButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  analyticsInsightMetricsBlockGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    paddingVertical: 12,
  },
  analyticsInsightMetricCellCard: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  analyticsInsightMetricNumericText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#b45309",
  },
  analyticsInsightMetricLabelMetaText: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "600",
    marginTop: 2,
  }
});