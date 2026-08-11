import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  useWindowDimensions,
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
  const { width, height } = useWindowDimensions();
  const wp = useCallback((percentage: number) => (width * percentage) / 100, [width]);
  const hp = useCallback((percentage: number) => (height * percentage) / 100, [height]);
  const isTablet = width >= 768;
  const isSmallScreen = width < 375;

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
  const { uiTheme } = useTheme() as any;

  const isLightTheme = useMemo(() => {
    return (
      uiTheme?.theme?.includes("crystal") ||
      uiTheme?.panelColors?.dashboardTextColor === "#000000"
    );
  }, [uiTheme]);

  const activeColors = useMemo(() => {
    const bg = uiTheme?.panelColors?.dashboardBackground || (isLightTheme ? "#f8fafc" : "#09090b");
    const surface = uiTheme?.panelColors?.dashboardCardBackground || (isLightTheme ? "#ffffff" : "#141417");
    const textColor = uiTheme?.panelColors?.dashboardTextColor || (isLightTheme ? "#0f172a" : "#f4f4f5");
    const textSecondary = isLightTheme ? "#64748b" : "#9ca3af";
    const border = uiTheme?.panelColors?.borderColor || (isLightTheme ? "#e2e8f0" : "rgba(255, 255, 255, 0.08)");
    const primary = uiTheme?.customColors?.primary || "#b45309";
    const inputBg = isLightTheme ? "#f1f5f9" : "rgba(255, 255, 255, 0.04)";

    return {
      background: bg,
      surface: surface,
      text: textColor,
      textSecondary: textSecondary,
      border: border,
      primary: primary,
      inputBg: inputBg,
      // Solid dark modal colors
      modalBg: "#0f172a",
      modalInputBg: "#1e293b",
      modalText: "#f8fafc",
      modalTextSecondary: "#94a3b8",
      modalBorder: "rgba(255, 255, 255, 0.12)",
    };
  }, [uiTheme, isLightTheme]);

  const styles = useMemo(
    () => createStyles(activeColors, wp, hp, isTablet, isSmallScreen, height),
    [activeColors, wp, hp, isTablet, isSmallScreen, height]
  );

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
            <View style={{ flex: 1 }}>
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
                  activeOpacity={0.7}
                  style={[
                    s(styles.tabNavigationCellButton), 
                    isTabActive 
                      ? { backgroundColor: "rgba(180, 83, 9, 0.15)", borderColor: activeColors.primary } 
                      : { backgroundColor: activeColors.surface, borderColor: activeColors.border }
                  ]}
                  onPress={() => {
                    setTab(tOpt.value);
                    setPage(1);
                  }}
                >
                  <Text style={[s(styles.tabNavigationCellInnerText), isTabActive ? { color: activeColors.primary, fontWeight: "700" } : { color: activeColors.textSecondary }]}>
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
              style={[s(styles.dropdownTriggerInteractiveAnchorBox), { backgroundColor: activeColors.inputBg, borderColor: activeColors.border }]}
              activeOpacity={0.7}
              onPress={() => setActiveDropdown("priority")}
            >
              <Text style={[s(styles.dropdownTriggerSelectionValueText), { color: activeColors.text }]} numberOfLines={1}>{currentPriorityLabel}</Text>
              <ChevronDown size={14} color={activeColors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[s(styles.dropdownTriggerInteractiveAnchorBox), { backgroundColor: activeColors.inputBg, borderColor: activeColors.border }]}
              activeOpacity={0.7}
              onPress={() => setActiveDropdown("category")}
            >
              <Text style={[s(styles.dropdownTriggerSelectionValueText), { color: activeColors.text }]} numberOfLines={1}>{currentCategoryLabel}</Text>
              <ChevronDown size={14} color={activeColors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={[s(styles.searchTextFieldBoxWrapperInline), { backgroundColor: activeColors.inputBg, borderColor: activeColors.border }]}>
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
            <View style={[s(styles.dateRangeFieldInputCellBox), { backgroundColor: activeColors.inputBg, borderColor: activeColors.border }]}>
              <Text style={[s(styles.dateRangeFieldDescriptorTextLabel), { color: activeColors.textSecondary }]}>From:</Text>
              <TextInput
                style={[s(styles.dateRangeInputFieldNativeElement), { color: activeColors.text }]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={activeColors.textSecondary}
                value={filterDateFrom}
                onChangeText={(val) => { setFilterDateFrom(val); setPage(1); }}
              />
            </View>
            <View style={[s(styles.dateRangeFieldInputCellBox), { backgroundColor: activeColors.inputBg, borderColor: activeColors.border }]}>
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
              activeOpacity={0.7}
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
            <Bell size={40} color={activeColors.textSecondary} style={s(styles.centeredIconMargin)} />
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
                    style={[s(styles.itemControlPanelUtilityButtonFrame), s(styles.itemControlPanelViewThemeButton), { backgroundColor: activeColors.inputBg, borderColor: activeColors.border }]}
                    activeOpacity={0.7}
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
                    activeOpacity={0.7}
                    onPress={() => triggerOpenUpsertDialog(announcement)}
                  >
                    <Edit size={12} color={activeColors.primary} />
                    <Text style={[s(styles.itemControlPanelUtilityButtonInnerText), { color: activeColors.primary }]}>Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[s(styles.itemControlPanelUtilityButtonFrame), announcement.pinned && s(styles.itemControlPanelEditThemeButton), { backgroundColor: activeColors.inputBg, borderColor: activeColors.border }]}
                    activeOpacity={0.7}
                    onPress={() => pinMutation.mutate({ id: announcement.id, pinned: !announcement.pinned })}
                  >
                    <Pin size={12} color={announcement.pinned ? activeColors.primary : activeColors.textSecondary} />
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[s(styles.itemControlPanelUtilityButtonFrame), { backgroundColor: activeColors.inputBg, borderColor: activeColors.border }]}
                    activeOpacity={0.7}
                    onPress={() => archiveMutation.mutate(announcement.id)}
                  >
                    <Archive size={12} color={activeColors.textSecondary} />
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[s(styles.itemControlPanelUtilityButtonFrame), s(styles.itemControlPanelDeleteThemeButton)]}
                    activeOpacity={0.7}
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
              activeOpacity={0.7}
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
              activeOpacity={0.7}
              onPress={() => setPage(p => p + 1)}
            >
              <Text style={[s(styles.paginationArrowStepLabelText), { color: activeColors.textSecondary }]}>Next</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>

      {/* Value Selector Modal - Solid Dark Surface */}
      <Modal animationType="slide" transparent={true} visible={activeDropdown !== null} onRequestClose={() => setActiveDropdown(null)}>
        <View style={s(styles.pickerOverlayModalSheetBlurWindow)}>
          <View style={[s(styles.pickerContentWindowCardSurface), { backgroundColor: activeColors.modalBg }]}>
            <View style={[s(styles.pickerContentHeaderBarTopRow), { borderBottomColor: activeColors.modalBorder }]}>
              <Text style={[s(styles.pickerContentHeaderTitleHeadingText), { color: activeColors.modalText }]}>Select Value</Text>
              <TouchableOpacity onPress={() => setActiveDropdown(null)} style={s(styles.pickerCloseCrossTouchTargetBoundary)} activeOpacity={0.7}>
                <X size={16} color={activeColors.modalTextSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={s(styles.pickerSelectionItemsScrollCanvasList)} keyboardShouldPersistTaps="handled">
              {activeDropdown === "priority" && priorityOptions.map((opt) => (
                <TouchableOpacity key={opt.id} style={[s(styles.pickerSelectionOptionRowAnchorTile), { borderBottomColor: activeColors.modalBorder }]} activeOpacity={0.7} onPress={() => { setFilterPriority(opt.id); setActiveDropdown(null); }}>
                  <Text style={[s(styles.pickerSelectionOptionValueLabelString), { color: activeColors.modalText }]}>{opt.name}</Text>
                </TouchableOpacity>
              ))}
              {activeDropdown === "formPriority" && priorityFormOptions.map((opt) => (
                <TouchableOpacity key={opt.id} style={[s(styles.pickerSelectionOptionRowAnchorTile), { borderBottomColor: activeColors.modalBorder }]} activeOpacity={0.7} onPress={() => { setFormPriority(opt.id as any); setActiveDropdown(null); }}>
                  <Text style={[s(styles.pickerSelectionOptionValueLabelString), formPriority === opt.id ? { color: activeColors.primary, fontWeight: "700" } : { color: activeColors.modalText }]}>{opt.name}</Text>
                </TouchableOpacity>
              ))}
              {activeDropdown === "category" && categoryOptions.map((opt) => (
                <TouchableOpacity key={opt.id} style={[s(styles.pickerSelectionOptionRowAnchorTile), { borderBottomColor: activeColors.modalBorder }]} activeOpacity={0.7} onPress={() => { setFilterCategory(opt.id); setActiveDropdown(null); }}>
                  <Text style={[s(styles.pickerSelectionOptionValueLabelString), { color: activeColors.modalText }]}>{opt.name}</Text>
                </TouchableOpacity>
              ))}
              {activeDropdown === "formCategory" && categoryFormOptions.map((opt) => (
                <TouchableOpacity key={opt.id} style={[s(styles.pickerSelectionOptionRowAnchorTile), { borderBottomColor: activeColors.modalBorder }]} activeOpacity={0.7} onPress={() => { setFormCategory(opt.id); setActiveDropdown(null); }}>
                  <Text style={[s(styles.pickerSelectionOptionValueLabelString), formCategory === opt.id ? { color: activeColors.primary, fontWeight: "700" } : { color: activeColors.modalText }]}>{opt.name}</Text>
                </TouchableOpacity>
              ))}
              {activeDropdown === "formRepeat" && repeatOptions.map((opt) => (
                <TouchableOpacity key={opt.id} style={[s(styles.pickerSelectionOptionRowAnchorTile), { borderBottomColor: activeColors.modalBorder }]} activeOpacity={0.7} onPress={() => { setFormRepeat(opt.id); setActiveDropdown(null); }}>
                  <Text style={[s(styles.pickerSelectionOptionValueLabelString), formRepeat === opt.id ? { color: activeColors.primary, fontWeight: "700" } : { color: activeColors.modalText }]}>{opt.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Create/Edit Modal - Solid Dark Surface */}
      <Modal animationType="slide" transparent={true} visible={showCreateModal} onRequestClose={() => setShowCreateModal(false)}>
        <View style={s(styles.pickerOverlayModalSheetBlurWindow)}>
          <View style={[s(styles.formWindowCardSurfaceExtendedHeight), { backgroundColor: activeColors.modalBg }]}>
            <View style={[s(styles.pickerContentHeaderBarTopRow), { borderBottomColor: activeColors.modalBorder }]}>
              <Text style={[s(styles.pickerContentHeaderTitleHeadingText), { color: activeColors.modalText }]}>
                {selectedAnnouncement ? "Edit Announcement" : "Create Announcement"}
              </Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)} style={s(styles.pickerCloseCrossTouchTargetBoundary)} activeOpacity={0.7}>
                <X size={16} color={activeColors.modalTextSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={s(styles.formScrollingLayoutCanvas)}>
              <View style={s(styles.formInputFieldsGroupSpacerContainer)}>
                
                <Text style={[s(styles.formInputFieldTitleTextLabel), { color: activeColors.modalTextSecondary }]}>Title</Text>
                <TextInput
                  style={[s(styles.formInputTextNativeFieldElement), { color: activeColors.modalText, borderColor: activeColors.modalBorder, backgroundColor: activeColors.modalInputBg }]}
                  placeholder="Enter announcement title"
                  placeholderTextColor={activeColors.modalTextSecondary}
                  value={formTitle}
                  onChangeText={setFormTitle}
                />

                <Text style={[s(styles.formInputFieldTitleTextLabel), { color: activeColors.modalTextSecondary }]}>Content</Text>
                <TextInput
                  style={[s(styles.formTextAreaNativeFieldElement), { color: activeColors.modalText, borderColor: activeColors.modalBorder, backgroundColor: activeColors.modalInputBg }]}
                  placeholder="Enter announcement content body details..."
                  placeholderTextColor={activeColors.modalTextSecondary}
                  value={formBody}
                  onChangeText={setFormBody}
                  multiline={true}
                  numberOfLines={4}
                />

                <View style={s(styles.filterSelectorsGridFlexLayoutRow)}>
                  <View style={s(styles.flexFieldCellUnit)}>
                    <Text style={[s(styles.formInputFieldTitleTextLabel), { color: activeColors.modalTextSecondary }]}>Priority</Text>
                    <TouchableOpacity style={[s(styles.dropdownTriggerInteractiveAnchorBox), { backgroundColor: activeColors.modalInputBg, borderColor: activeColors.modalBorder }]} activeOpacity={0.7} onPress={() => setActiveDropdown("formPriority")}>
                      <Text style={[s(styles.dropdownTriggerSelectionValueText), { color: activeColors.modalText }]} numberOfLines={1}>{formPriorityLabel}</Text>
                      <ChevronDown size={14} color={activeColors.modalTextSecondary} />
                    </TouchableOpacity>
                  </View>

                  <View style={s(styles.flexFieldCellUnit)}>
                    <Text style={[s(styles.formInputFieldTitleTextLabel), { color: activeColors.modalTextSecondary }]}>Category</Text>
                    <TouchableOpacity style={[s(styles.dropdownTriggerInteractiveAnchorBox), { backgroundColor: activeColors.modalInputBg, borderColor: activeColors.modalBorder }]} activeOpacity={0.7} onPress={() => setActiveDropdown("formCategory")}>
                      <Text style={[s(styles.dropdownTriggerSelectionValueText), { color: activeColors.modalText }]} numberOfLines={1}>{formCategoryLabel}</Text>
                      <ChevronDown size={14} color={activeColors.modalTextSecondary} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={s(styles.filterSelectorsGridFlexLayoutRow)}>
                  <View style={s(styles.flexFieldCellUnit)}>
                    <Text style={[s(styles.formInputFieldTitleTextLabel), { color: activeColors.modalTextSecondary }]}>Schedule For (Optional)</Text>
                    <View style={[s(styles.searchTextFieldBoxWrapperInline), { backgroundColor: activeColors.modalInputBg, borderColor: activeColors.modalBorder }]}>
                      <Calendar size={14} color={activeColors.modalTextSecondary} style={s(styles.inlineMarginRightSpacing)} />
                      <TextInput
                        style={[s(styles.searchTextFieldInputFieldNative), { color: activeColors.modalText }]}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={activeColors.modalTextSecondary}
                        value={formScheduledFor}
                        onChangeText={setFormScheduledFor}
                      />
                    </View>
                  </View>

                  <View style={s(styles.flexFieldCellUnit)}>
                    <Text style={[s(styles.formInputFieldTitleTextLabel), { color: activeColors.modalTextSecondary }]}>Expires At (Optional)</Text>
                    <View style={[s(styles.searchTextFieldBoxWrapperInline), { backgroundColor: activeColors.modalInputBg, borderColor: activeColors.modalBorder }]}>
                      <Calendar size={14} color={activeColors.modalTextSecondary} style={s(styles.inlineMarginRightSpacing)} />
                      <TextInput
                        style={[s(styles.searchTextFieldInputFieldNative), { color: activeColors.modalText }]}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={activeColors.modalTextSecondary}
                        value={formExpiresAt}
                        onChangeText={setFormExpiresAt}
                      />
                    </View>
                  </View>
                </View>

                <Text style={[s(styles.formInputFieldTitleTextLabel), { color: activeColors.modalTextSecondary }]}>Repeat</Text>
                <TouchableOpacity style={[s(styles.dropdownTriggerInteractiveAnchorBox), { backgroundColor: activeColors.modalInputBg, borderColor: activeColors.modalBorder }]} activeOpacity={0.7} onPress={() => setActiveDropdown("formRepeat")}>
                  <Text style={[s(styles.dropdownTriggerSelectionValueText), { color: activeColors.modalText }]} numberOfLines={1}>{formRepeatLabel}</Text>
                  <ChevronDown size={14} color={activeColors.modalTextSecondary} />
                </TouchableOpacity>

                <View style={[s(styles.toggleOptionRowWrapperAlignment), { borderBottomColor: activeColors.modalBorder }]}>
                  <Text style={[s(styles.toggleOptionMainTitleText), { color: activeColors.modalText }]}>Require read acknowledgement</Text>
                  <TouchableOpacity 
                    style={[s(styles.customSwitchTrackFrame), formRequiresAcknowledgement ? { backgroundColor: activeColors.primary } : { backgroundColor: "rgba(255, 255, 255, 0.15)" }]}
                    activeOpacity={0.8}
                    onPress={() => setFormRequiresAcknowledgement(!formRequiresAcknowledgement)}
                  >
                    <View style={[s(styles.customSwitchKnobCircle), formRequiresAcknowledgement ? styles.customSwitchKnobActivePosition : styles.customSwitchKnobInactivePosition]} />
                  </TouchableOpacity>
                </View>

                <View style={[s(styles.toggleOptionRowWrapperAlignment), { borderBottomColor: activeColors.modalBorder }]}>
                  <Text style={[s(styles.toggleOptionMainTitleText), { color: activeColors.modalText }]}>Send push notification</Text>
                  <TouchableOpacity 
                    style={[s(styles.customSwitchTrackFrame), formSendPush ? { backgroundColor: activeColors.primary } : { backgroundColor: "rgba(255, 255, 255, 0.15)" }]}
                    activeOpacity={0.8}
                    onPress={() => setFormSendPush(!formSendPush)}
                  >
                    <View style={[s(styles.customSwitchKnobCircle), formSendPush ? styles.customSwitchKnobActivePosition : styles.customSwitchKnobInactivePosition]} />
                  </TouchableOpacity>
                </View>

                <View style={[s(styles.toggleOptionRowWrapperAlignment), { borderBottomColor: activeColors.modalBorder }]}>
                  <Text style={[s(styles.toggleOptionMainTitleText), { color: activeColors.modalText }]}>Send email notification</Text>
                  <TouchableOpacity 
                    style={[s(styles.customSwitchTrackFrame), formSendEmail ? { backgroundColor: activeColors.primary } : { backgroundColor: "rgba(255, 255, 255, 0.15)" }]}
                    activeOpacity={0.8}
                    onPress={() => setFormSendEmail(!formSendEmail)}
                  >
                    <View style={[s(styles.customSwitchKnobCircle), formSendEmail ? styles.customSwitchKnobActivePosition : styles.customSwitchKnobInactivePosition]} />
                  </TouchableOpacity>
                </View>

                <View style={[s(styles.toggleOptionRowWrapperAlignment), { borderBottomColor: activeColors.modalBorder }]}>
                  <Text style={[s(styles.toggleOptionMainTitleText), { color: activeColors.modalText }]}>Send SMS notification</Text>
                  <TouchableOpacity 
                    style={[s(styles.customSwitchTrackFrame), formSendSms ? { backgroundColor: activeColors.primary } : { backgroundColor: "rgba(255, 255, 255, 0.15)" }]}
                    activeOpacity={0.8}
                    onPress={() => setFormSendSms(!formSendSms)}
                  >
                    <View style={[s(styles.customSwitchKnobCircle), formSendSms ? styles.customSwitchKnobActivePosition : styles.customSwitchKnobInactivePosition]} />
                  </TouchableOpacity>
                </View>

                <View style={[s(styles.toggleOptionRowWrapperAlignment), { borderBottomColor: activeColors.modalBorder }]}>
                  <Text style={[s(styles.toggleOptionMainTitleText), { color: activeColors.modalText }]}>Pin to dashboard</Text>
                  <TouchableOpacity 
                    style={[s(styles.customSwitchTrackFrame), formPinned ? { backgroundColor: activeColors.primary } : { backgroundColor: "rgba(255, 255, 255, 0.15)" }]}
                    activeOpacity={0.8}
                    onPress={() => setFormPinned(!formPinned)}
                  >
                    <View style={[s(styles.customSwitchKnobCircle), formPinned ? styles.customSwitchKnobActivePosition : styles.customSwitchKnobInactivePosition]} />
                  </TouchableOpacity>
                </View>

                <View style={[s(styles.toggleOptionRowWrapperAlignment), { borderBottomColor: activeColors.modalBorder }]}>
                  <Text style={[s(styles.toggleOptionMainTitleText), { color: activeColors.modalText }]}>Mark as emergency alert</Text>
                  <TouchableOpacity 
                    style={[s(styles.customSwitchTrackFrame), formEmergency ? { backgroundColor: activeColors.primary } : { backgroundColor: "rgba(255, 255, 255, 0.15)" }]}
                    activeOpacity={0.8}
                    onPress={() => setFormEmergency(!formEmergency)}
                  >
                    <View style={[s(styles.customSwitchKnobCircle), formEmergency ? styles.customSwitchKnobActivePosition : styles.customSwitchKnobInactivePosition]} />
                  </TouchableOpacity>
                </View>

                <View style={[s(styles.modalActionButtonsFooterRowContainer), { borderTopColor: activeColors.modalBorder }]}>
                  <TouchableOpacity style={s(styles.modalDismissCancelTextLinkButton)} activeOpacity={0.7} onPress={() => setShowCreateModal(false)}>
                    <Text style={[s(styles.modalDismissCancelTextLinkLabelText), { color: activeColors.modalTextSecondary }]}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[s(styles.formSubmitActionStripExecuteButton), { backgroundColor: activeColors.primary }]}
                    activeOpacity={0.8}
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

    </SafeAreaView>
  );
}

const createStyles = (
  colors: any,
  wp: (percentage: number) => number,
  hp: (percentage: number) => number,
  isTablet: boolean,
  isSmallScreen: boolean,
  windowHeight: number
) =>
  StyleSheet.create({
    safeAreaContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    safeAreaDeniedCanvas: {
      flex: 1,
      backgroundColor: "#0f172a",
      justifyContent: "center",
      alignItems: "center",
    },
    deniedCenterAlertWrapper: {
      alignItems: "center",
      paddingHorizontal: wp(8),
    },
    centeredIconMargin: {
      marginBottom: hp(1.5),
    },
    deniedMainTitleLabelText: {
      fontSize: isTablet ? 24 : 20,
      fontWeight: "800",
      color: "#ffffff",
      marginBottom: hp(0.8),
    },
    deniedSubtextLabelPara: {
      fontSize: isTablet ? 14 : 13,
      color: "rgba(255, 255, 255, 0.6)",
      textAlign: "center",
    },
    mainBodyScrollCanvas: {
      paddingHorizontal: isTablet ? wp(6) : isSmallScreen ? wp(3) : wp(4.2),
      paddingBottom: hp(5),
    },
    topDashboardHeaderBlock: {
      paddingVertical: hp(2),
      gap: hp(1.5),
      flexDirection: isTablet ? "row" : "column",
      justifyContent: isTablet ? "space-between" : "flex-start",
      alignItems: isTablet ? "center" : "stretch",
    },
    headerTitleContainerStrip: {
      flexDirection: "row",
      alignItems: "center",
    },
    inlineMarginRightSpacing: {
      marginRight: wp(1.5),
    },
    headerMainTitleTextLabel: {
      fontSize: isTablet ? 26 : 22,
      fontWeight: "800",
      letterSpacing: -0.5,
    },
    headerSubtitleTextMeta: {
      fontSize: isTablet ? 13 : 12,
      marginTop: hp(0.2),
    },
    createAnchorTriggerActionButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: wp(2.5),
      height: hp(5.2),
      paddingHorizontal: wp(4),
    },
    createAnchorTriggerButtonText: {
      color: "#ffffff",
      fontSize: isTablet ? 14 : 13,
      fontWeight: "700",
    },
    navigationTabsHorizontalScrollViewStrip: {
      marginBottom: hp(1.8),
    },
    tabsHorizontalItemsWrapLayout: {
      gap: wp(2),
    },
    tabNavigationCellButton: {
      paddingVertical: hp(1),
      paddingHorizontal: wp(3.5),
      borderRadius: wp(2),
      borderWidth: 1,
    },
    tabNavigationCellInnerText: {
      fontSize: isTablet ? 13 : 12,
      fontWeight: "600",
    },
    filterMetricsSurfaceCardWell: {
      borderWidth: 1,
      borderRadius: wp(3),
      padding: wp(3.5),
      gap: hp(1.2),
      marginBottom: hp(2),
    },
    filterSelectorsGridFlexLayoutRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: wp(2),
    },
    flexFieldCellUnit: {
      flex: 1,
      gap: hp(0.5),
    },
    dropdownTriggerInteractiveAnchorBox: {
      flex: 1,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderWidth: 1,
      borderRadius: wp(2),
      height: hp(4.8),
      paddingHorizontal: wp(2.5),
    },
    dropdownTriggerSelectionValueText: {
      fontSize: isTablet ? 13 : 12,
      fontWeight: "600",
      flex: 1,
    },
    searchTextFieldBoxWrapperInline: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderRadius: wp(2),
      paddingHorizontal: wp(2.5),
      height: hp(4.8),
    },
    searchTextFieldInputFieldNative: {
      flex: 1,
      fontSize: isTablet ? 14 : 13,
      height: "100%",
    },
    dateRangeFieldsFlexAlignmentStripRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: wp(2),
    },
    dateRangeFieldInputCellBox: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderRadius: wp(2),
      height: hp(4.8),
      paddingHorizontal: wp(2.5),
    },
    dateRangeFieldDescriptorTextLabel: {
      fontSize: isTablet ? 12 : 11,
      marginRight: wp(1),
      fontWeight: "600",
    },
    dateRangeInputFieldNativeElement: {
      flex: 1,
      fontSize: isTablet ? 13 : 12,
      padding: 0,
      height: "100%",
    },
    clearFiltersActionBlockButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: hp(1.2),
      borderWidth: 1,
      borderColor: "rgba(239, 68, 68, 0.3)",
      backgroundColor: "rgba(239, 68, 68, 0.1)",
      borderRadius: wp(2),
    },
    clearFiltersActionBlockButtonText: {
      fontSize: isTablet ? 13 : 12,
      color: "#dc2626",
      fontWeight: "700",
    },
    loaderCentralEngineIndicatorSpacingCanvas: {
      paddingVertical: hp(6),
    },
    emptyFallbackStateDisplayGraphicCard: {
      borderWidth: 1,
      borderRadius: wp(3),
      paddingVertical: hp(6),
      alignItems: "center",
      justifyContent: "center",
    },
    emptyFallbackStateMainHeadingText: {
      fontSize: isTablet ? 16 : 14,
      fontWeight: "700",
      marginBottom: hp(0.5),
    },
    emptyFallbackStateSecondaryParagraphText: {
      fontSize: isTablet ? 13 : 12,
    },
    registryRowItemsVerticalStackLayoutGrid: {
      flexDirection: isTablet ? "row" : "column",
      flexWrap: isTablet ? "wrap" : "nowrap",
      gap: wp(3),
    },
    itemRegistryRowContainerCard: {
      borderWidth: 1,
      borderRadius: wp(3),
      padding: wp(4),
      width: isTablet ? "48.5%" : "100%",
    },
    itemRegistryCardHeaderLineRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: hp(0.8),
    },
    itemRegistryTitleGroupingMetaColumn: {
      flex: 1,
    },
    itemRegistryAnnouncementTitleHeaderText: {
      fontSize: isTablet ? 16 : 14,
      fontWeight: "800",
      letterSpacing: -0.2,
      lineHeight: isTablet ? 22 : 18,
    },
    itemRegistryBadgesFlexibleWrapLayoutStrip: {
      flexDirection: "row",
      alignItems: "center",
      gap: wp(1.5),
      marginTop: hp(0.8),
      flexWrap: "wrap",
    },
    itemPriorityInlineBadgeBoxFrame: {
      backgroundColor: "rgba(148, 163, 184, 0.15)",
      borderRadius: wp(1),
      paddingHorizontal: wp(2),
      paddingVertical: hp(0.3),
    },
    itemPriorityCriticalBg: {
      backgroundColor: "rgba(239, 68, 68, 0.2)",
    },
    itemPriorityInlineBadgeInnerText: {
      fontSize: 9,
      fontWeight: "700",
      color: "#f87171",
      textTransform: "uppercase",
    },
    itemCategoryInlineBadgeBoxFrame: {
      backgroundColor: "rgba(245, 158, 11, 0.15)",
      borderWidth: 0.5,
      borderColor: "rgba(245, 158, 11, 0.3)",
      borderRadius: wp(1),
      paddingHorizontal: wp(2),
      paddingVertical: hp(0.3),
    },
    itemCategoryInlineBadgeInnerText: {
      fontSize: 9,
      fontWeight: "700",
      color: "#fbbf24",
      textTransform: "capitalize",
    },
    itemPinnedInlineBadgeBoxFrame: {
      paddingHorizontal: wp(0.5),
    },
    itemEmergencyInlineBadgeBoxFrame: {
      backgroundColor: "#b91c1c",
      borderRadius: wp(1),
      paddingHorizontal: wp(2),
      paddingVertical: hp(0.3),
    },
    itemEmergencyInlineBadgeInnerText: {
      fontSize: 9,
      fontWeight: "700",
      color: "#ffffff",
    },
    itemRegistryAnnouncementBodyMessageParagraphText: {
      fontSize: isTablet ? 14 : 13,
      lineHeight: isTablet ? 20 : 18,
      marginVertical: hp(1),
    },
    itemRegistryActionsControlBarPanelStrip: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: wp(1.5),
      marginTop: hp(1.2),
    },
    itemControlPanelUtilityButtonFrame: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      height: hp(3.8),
      minWidth: wp(9),
      paddingHorizontal: wp(2),
      borderRadius: wp(1.5),
      borderWidth: 1,
    },
    itemControlPanelViewThemeButton: {
      gap: wp(1),
    },
    itemControlPanelEditThemeButton: {
      gap: wp(1),
      borderColor: "rgba(245, 158, 11, 0.4)",
      backgroundColor: "rgba(245, 158, 11, 0.15)",
    },
    itemControlPanelDeleteThemeButton: {
      borderColor: "rgba(239, 68, 68, 0.4)",
      backgroundColor: "rgba(239, 68, 68, 0.15)",
    },
    itemControlPanelUtilityButtonInnerText: {
      fontSize: isTablet ? 12 : 11,
      fontWeight: "600",
    },
    paginationControlsFooterBarLayoutBlock: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: wp(3),
      borderWidth: 1,
      borderRadius: wp(2.5),
      marginTop: hp(2),
    },
    paginationArrowStepBoundaryButton: {
      borderWidth: 1,
      borderRadius: wp(1.5),
      paddingVertical: hp(0.8),
      paddingHorizontal: wp(3),
    },
    paginationArrowDisabledOpacity: {
      opacity: 0.4,
    },
    paginationArrowStepLabelText: {
      fontSize: isTablet ? 13 : 11,
      fontWeight: "600",
    },
    paginationIndexDisplayIndicatorLabelText: {
      fontSize: isTablet ? 13 : 12,
      fontWeight: "600",
    },
    pickerOverlayModalSheetBlurWindow: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.85)",
      justifyContent: "flex-end",
    },
    pickerContentWindowCardSurface: {
      borderTopLeftRadius: wp(5),
      borderTopRightRadius: wp(5),
      width: "100%",
      maxHeight: windowHeight * 0.5,
      padding: wp(5),
    },
    formWindowCardSurfaceExtendedHeight: {
      borderTopLeftRadius: wp(5),
      borderTopRightRadius: wp(5),
      width: "100%",
      maxHeight: windowHeight * 0.88,
      padding: wp(5),
    },
    pickerContentHeaderBarTopRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderBottomWidth: 1,
      paddingBottom: hp(1.5),
      marginBottom: hp(1),
    },
    pickerContentHeaderTitleHeadingText: {
      fontSize: isTablet ? 17 : 15,
      fontWeight: "700",
    },
    pickerCloseCrossTouchTargetBoundary: {
      padding: wp(1),
    },
    pickerSelectionItemsScrollCanvasList: {
      flexGrow: 0,
    },
    pickerSelectionOptionRowAnchorTile: {
      paddingVertical: hp(1.8),
      paddingHorizontal: wp(1),
      borderBottomWidth: 1,
    },
    pickerSelectionOptionValueLabelString: {
      fontSize: isTablet ? 15 : 14,
      fontWeight: "500",
    },
    formScrollingLayoutCanvas: {
      paddingBottom: hp(4),
    },
    formInputFieldsGroupSpacerContainer: {
      gap: hp(1.5),
      paddingVertical: hp(1),
    },
    formInputFieldTitleTextLabel: {
      fontSize: isTablet ? 13 : 12,
      fontWeight: "700",
      marginTop: hp(0.3),
    },
    formInputTextNativeFieldElement: {
      borderWidth: 1,
      borderRadius: wp(2),
      height: hp(5.2),
      paddingHorizontal: wp(3),
      fontSize: isTablet ? 14 : 13,
    },
    formTextAreaNativeFieldElement: {
      borderWidth: 1,
      borderRadius: wp(2),
      minHeight: hp(11),
      paddingHorizontal: wp(3),
      paddingTop: hp(1.2),
      fontSize: isTablet ? 14 : 13,
      textAlignVertical: "top",
    },
    toggleOptionRowWrapperAlignment: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: hp(1.5),
      borderBottomWidth: 1,
    },
    toggleOptionMainTitleText: {
      fontSize: isTablet ? 14 : 13,
      fontWeight: "600",
      flex: 1,
      marginRight: wp(2),
    },
    customSwitchTrackFrame: {
      width: isTablet ? 50 : 44,
      height: isTablet ? 28 : 24,
      borderRadius: 14,
      padding: 2,
      justifyContent: "center",
    },
    customSwitchKnobCircle: {
      width: isTablet ? 24 : 20,
      height: isTablet ? 24 : 20,
      borderRadius: 12,
      backgroundColor: "#ffffff",
    },
    customSwitchKnobActivePosition: {
      alignSelf: "flex-end",
    },
    customSwitchKnobInactivePosition: {
      alignSelf: "flex-start",
    },
    modalActionButtonsFooterRowContainer: {
      flexDirection: "row",
      justifyContent: "flex-end",
      alignItems: "center",
      gap: wp(3),
      marginTop: hp(2),
      borderTopWidth: 1,
      paddingTop: hp(1.8),
    },
    modalDismissCancelTextLinkButton: {
      paddingVertical: hp(1.2),
      paddingHorizontal: wp(3.5),
    },
    modalDismissCancelTextLinkLabelText: {
      fontSize: isTablet ? 14 : 13,
      fontWeight: "600",
    },
    formSubmitActionStripExecuteButton: {
      height: hp(5.2),
      borderRadius: wp(2),
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: wp(5),
    },
    formSubmitActionStripExecuteButtonText: {
      color: "#ffffff",
      fontSize: isTablet ? 14 : 13,
      fontWeight: "700",
    },
  });