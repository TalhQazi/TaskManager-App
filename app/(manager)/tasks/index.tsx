import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Platform,
  KeyboardAvoidingView,
  Alert,
  Image,
  useWindowDimensions,
} from "react-native";
import {
  Plus,
  Search,
  Calendar,
  MapPin,
  FileText,
  Check,
  ChevronsUpDown,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Users,
  Edit,
  Trash2,
  X,
  Send,
  RefreshCw,
  Paperclip,
  MessageSquare,
  Archive,
  TrendingUp,
  Flame,
  Video,
  ChevronDown,
  Printer,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Layers,
  Sliders,
  Square,
  CheckSquare,
} from "lucide-react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { apiRequest } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { useSocket } from "@/contexts/SocketContext";
import { useTaskBlasterContext } from "@/contexts/TaskBlasterContext";
import { useRewards } from "@/contexts/RewardContext";
import { useGlobalTimer } from "@/hooks/useGlobalTimer";
import { getRemainingTime, getTimerState } from "@/util/taskTimer";

import FollowUpControlCenter from "@/components/shared/FollowUpControlCenter";
import { VideoRecorderModal } from "@/components/admin/VideoRecorderModal";
import { TaskTimeline } from "@/components/shared/TaskTimeLine";
import CreateExpenseSheet from "../expense/CreateExpenseSheet";
import TaskExpensesPanel from "@/components/cost-manager/TaskExpensesPanel";
import ExpenseSheetList from "../expense/ExpenseSheetList";

import {
  getProjectCostSheet,
  createCostSection,
  PURCHASE_STATUS_META,
  CERT_STATUS_META,
  formatMoney,
  dollarsToCents,
  PurchaseStatus,
} from "@/services/costManager";
import MobileCostManager from "@/components/cost-manager/MobileCostManager";



// ==========================================
// CENTRAL DYNAMIC THEME & COLOR PALETTE
// ==========================================
const buildColors = () => ({
  bgPrimary: "#0d1117",
  bgSecondary: "#161b22",
  bgTertiary: "#21262d",
  border: "#30363d",
  textPrimary: "#ffffff",
  textSecondary: "#8b949e",
  textMuted: "#4b5563",
  textLight: "#c9d1d9",
  accentBlue: "#1f6feb",
  accentBlueLight: "#58a6ff",
  accentGreen: "#238636",
  accentGreenLight: "#56d364",
  accentYellow: "#fbbf24",
  accentOrange: "#f97316",
  accentRed: "#ff7b72",
  accentRedDark: "#f85149",
  accentPurple: "#8b5cf6",
});

interface FileObject {
  fileName: string;
  url: string;
  mimeType: string;
  size: number;
}

interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

interface Task {
  id: string;
  taskNumber?: number;
  title: string;
  description: string;
  assignees: string[];
  priority: "low" | "medium" | "high";
  status: "pending" | "in-progress" | "completed" | "overdue";
  executionPriority?: number | null;
  dueDate: string;
  dueTime?: string;
  location?: string;
  introVideoUrl?: string;
  createdAt: string;
  projectId?: string | { _id?: string; id?: string };
  attachments?: FileObject[];
  attachment?: FileObject;
  subtasks?: Subtask[];
}

interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
  assignees?: string[];
  logo?: { url?: string; fileName?: string };
  taskCount?: number;
  status?: string;
  attachments?: FileObject[];
}

interface TaskComment {
  id: string;
  taskId?: string;
  projectId?: string;
  message: string;
  authorUsername: string;
  createdAt: string;
}

type TabMode = "all" | "projects" | "tasks";
type ProjectDetailTab = "overview" | "tasks" | "discussion";
const PAGE_SIZE = 25;

// Utility to resolve asset/logo URLs with authentication tokens
const getDisplayImageUrl = (rawPath?: string | null, activeToken?: string | null) => {
  if (!rawPath || typeof rawPath !== "string" || !rawPath.trim()) return null;

  if (rawPath.startsWith("data:") || rawPath.startsWith("file://") || rawPath.startsWith("content://")) {
    return rawPath;
  }

  let path = rawPath.trim();
  if (path.includes("token=")) return path;

  if (path.startsWith("/uploads/")) {
    path = path.replace("/uploads/", "/api/s3-proxy/");
  } else if (path.startsWith("uploads/")) {
    path = path.replace("uploads/", "/api/s3-proxy/");
  } else if (!path.startsWith("/api/s3-proxy/") && !path.startsWith("http")) {
    path = `/api/s3-proxy/${path.replace(/^\//, "")}`;
  }

  if (!path.startsWith("http://") && !path.startsWith("https://")) {
    path = `https://task.se7eninc.com${path.startsWith("/") ? path : `/${path}`}`;
  }

  if (activeToken) {
    const separator = path.includes("?") ? "&" : "?";
    return `${path}${separator}token=${activeToken}`;
  }

  return path;
};

// =======================================================
// DYNAMIC RESPONSIVE STYLE GENERATOR FUNCTIONS
// =======================================================
function createStyles(
  colors: ReturnType<typeof buildColors>,
  wp: (percentage: number) => number,
  hp: (percentage: number) => number,
  isTablet: boolean,
  isSmallScreen: boolean
) {
  const horizontalPadding = isSmallScreen ? wp(3) : isTablet ? wp(6) : wp(4.2);

  return StyleSheet.create({
    fullscreenContainer: { flex: 1, backgroundColor: colors.bgPrimary },
    navbarHeaderFrame: {
      flexDirection: "row",
      alignItems: "center",
      paddingTop: Platform.OS === "ios" ? hp(6) : hp(2.5),
      paddingBottom: hp(1.8),
      paddingHorizontal: horizontalPadding,
      backgroundColor: colors.bgSecondary,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: wp(2.5),
      minHeight: hp(8),
    },
    navbarBackBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: wp(1),
      marginRight: wp(2),
      backgroundColor: colors.bgTertiary,
      paddingHorizontal: wp(2.5),
      paddingVertical: hp(0.8),
      borderRadius: wp(1.5),
      borderWidth: 1,
      borderColor: colors.border,
    },
    backBtnText: { color: colors.textPrimary, fontSize: isTablet ? 14 : 12, fontWeight: "bold" },
    navbarHeadlineHeading: { fontSize: isTablet ? 22 : 18, fontWeight: "bold", color: colors.textPrimary },
    navbarSubheadingDescription: { fontSize: 11, color: colors.textSecondary, marginTop: hp(0.2) },
    headerButtonClusterRow: { flexDirection: "row", gap: wp(1.5), flexWrap: "wrap" },
    primaryActionButtonNode: {
      flexDirection: "row",
      alignItems: "center",
      gap: wp(1),
      backgroundColor: colors.accentGreen,
      paddingHorizontal: wp(2.8),
      paddingVertical: hp(0.8),
      borderRadius: wp(1.5),
      minHeight: hp(4),
    },
    primaryActionButtonNodeText: { color: colors.textPrimary, fontSize: 11, fontWeight: "bold" },
    filterSuiteControlCenterBox: { backgroundColor: colors.bgSecondary, paddingBottom: hp(1), borderBottomWidth: 1, borderBottomColor: colors.border },
    searchBarLayoutFrame: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.bgPrimary,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: wp(1.5),
      marginHorizontal: horizontalPadding,
      marginVertical: hp(0.8),
      paddingHorizontal: wp(2.5),
      height: hp(4.8),
    },
    searchBarInputField: { flex: 1, color: colors.textPrimary, fontSize: 13, paddingVertical: 0 },
    filterPillsHorizontalScrollTrack: { paddingHorizontal: horizontalPadding, gap: wp(1.5), height: hp(4.2), alignItems: "center" },
    filterDropdownSelectorPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: wp(1),
      backgroundColor: colors.bgTertiary,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: wp(2.2),
      paddingVertical: hp(0.5),
      borderRadius: wp(1.5),
    },
    filterDropdownSelectorPillText: { color: colors.textLight, fontSize: 11, fontWeight: "600" },
    inlineFilterChoiceTrayOverlay: { backgroundColor: colors.bgSecondary, marginHorizontal: horizontalPadding, marginTop: hp(0.5), borderRadius: wp(1.5), borderWidth: 1, borderColor: colors.border },
    inlineFilterChoiceOptionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: wp(2.8), borderBottomWidth: 1, borderBottomColor: colors.border },
    inlineFilterChoiceOptionRowText: { color: colors.textLight, fontSize: 12, fontWeight: "500" },
    scrollContainerBodyViewport: { flex: 1, paddingHorizontal: horizontalPadding },
    tabSwitcherCapsuleContainerRow: {
      flexDirection: "row",
      backgroundColor: "rgba(255,255,255,0.02)",
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: wp(2),
      padding: wp(0.8),
      marginBottom: hp(0.3),
      marginTop: hp(1),
    },
    tabSwitcherSelectionPillBtn: { flex: 1, paddingVertical: hp(1), alignItems: "center", borderRadius: wp(1.5) },
    tabSwitcherSelectionPillBtnActive: { backgroundColor: colors.bgTertiary },
    tabSwitcherSelectionPillBtnText: { color: colors.textSecondary, fontSize: 12, fontWeight: "600" },
    tabSwitcherSelectionPillBtnTextActive: { color: colors.textPrimary },
    leaderboardMetricsContainerCard: { backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.border, borderRadius: wp(2.5), padding: wp(3), marginTop: hp(0.5) },
    leaderboardMetricsTitleContainerRow: { flexDirection: "row", alignItems: "center", gap: wp(1.5), marginBottom: hp(1) },
    leaderboardMetricsTitleHeadingText: { fontSize: 12, fontWeight: "bold", color: colors.accentYellow, textTransform: "uppercase" },
    emptyStateItalicTextCaptionString: { color: colors.textSecondary, fontSize: 12, fontStyle: "italic" },
    leaderboardIndivProfileCard: { backgroundColor: colors.bgPrimary, borderWidth: 1, borderColor: colors.border, borderRadius: wp(1.5), padding: wp(2), minWidth: wp(30) },
    verticalBlockAssetSectionContainer: { flexDirection: "column", gap: hp(1), marginTop: hp(0.8) },
    verticalBlockAssetSectionHeadingLabel: { fontSize: 14, fontWeight: "bold", color: colors.textPrimary, marginBottom: hp(0.3), marginTop: hp(0.5) },
    premiumAssetDisplayListItemCard: { backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.border, borderRadius: wp(2), padding: wp(3), gap: hp(0.8) },
    assetCardHeaderRow: { flexDirection: "row", alignItems: "center", gap: wp(2.5) },
    assetThumbnailImage: { width: wp(10), height: wp(10), borderRadius: wp(1.5), backgroundColor: colors.bgPrimary, borderWidth: 0.5, borderColor: colors.border },
    assetPlaceholderBox: { width: wp(10), height: wp(10), borderRadius: wp(1.5), backgroundColor: colors.bgPrimary, borderWidth: 0.5, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
    premiumAssetDisplayCardTitleText: { fontSize: 15, fontWeight: "bold", color: colors.textPrimary, flex: 1 },
    premiumAssetDisplayCardSubTextDescription: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
    inlineProjectTeamLabelMetaTextString: { fontSize: 12, color: colors.textSecondary },
    footerInlineMetadataLabelString: { fontSize: 11, color: colors.accentBlueLight, fontWeight: "bold" },
    projectStatusInlineBadgeBox: { backgroundColor: "rgba(255,255,255,0.04)", paddingHorizontal: wp(1.8), paddingVertical: hp(0.3), borderRadius: wp(1), borderWidth: 1, borderColor: colors.border },
    projectStatusInlineBadgeBoxTextString: { color: colors.textLight, fontSize: 10, fontWeight: "bold" },
    priorityLabelIndicatorString: { fontSize: 11, color: colors.textSecondary, fontWeight: "600" },
    timerCountdownDisplayString: { fontSize: 12, fontWeight: "bold", color: colors.accentRedDark },
    combinedBadgesInlineMatrixRow: { flexDirection: "row", gap: wp(1), flexWrap: "wrap", alignItems: "center" },
    condensedInlineStatusBadgePill: { backgroundColor: "rgba(88,166,255,0.1)", paddingHorizontal: wp(1.8), paddingVertical: hp(0.3), borderRadius: wp(1) },
    condensedInlineStatusBadgePillText: { color: colors.accentBlueLight, fontSize: 10, fontWeight: "bold" },
    projectPortalOverviewDisplayBannerCard: { backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.border, borderRadius: wp(2.5), padding: wp(3.5), gap: hp(1.2) },
    projectPortalOverviewHeadlineTitleText: { fontSize: 18, fontWeight: "bold", color: colors.textPrimary, flex: 1 },
    projectPortalOverviewBodyDescriptionText: { fontSize: 13, color: colors.textLight, lineHeight: 18 },
    projectPortalMetaFooterActionsRowTrack: { flexDirection: "row", gap: wp(2), borderTopWidth: 1, borderTopColor: colors.border, paddingTop: hp(1.2), flexWrap: "wrap" },
    projectPortalActionLauncherGridBtn: { flex: 1, minWidth: wp(22), backgroundColor: colors.accentBlue, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: wp(1), paddingVertical: hp(1), borderRadius: wp(1.5) },
    projectPortalActionLauncherGridBtnText: { color: colors.textPrimary, fontSize: 11, fontWeight: "bold" },
    webStyleProjectBadgeLabelPill: { backgroundColor: "rgba(88,166,255,0.15)", paddingHorizontal: wp(1.8), paddingVertical: hp(0.3), borderRadius: wp(1), borderWidth: 0.5, borderColor: "rgba(88,166,255,0.3)", alignSelf: "flex-start", marginBottom: hp(0.8) },
    webStyleProjectBadgeLabelPillText: { color: colors.accentBlueLight, fontSize: 10, fontWeight: "bold", textTransform: "uppercase" },
    fullscreenModalViewFrameContainer: { flex: 1, backgroundColor: colors.bgPrimary },
    modalNavigationHeaderTopbarNavBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: wp(3.5), backgroundColor: colors.bgSecondary, borderBottomWidth: 1, borderBottomColor: colors.border, paddingTop: Platform.OS === "ios" ? hp(5.5) : hp(1.8) },
    modalNavigationHeaderTopbarNavBarTitleHeading: { fontSize: 14, fontWeight: "bold", color: colors.textPrimary },
    modalNavigationHeaderTopbarNavBarCloseTouchNodeBtn: { padding: wp(1.5) },
    modalHeaderIdLabelString: { color: colors.textSecondary, fontSize: 11, fontWeight: "500" },
    splitLayoutInspectorWorkspaceContainerBlockRow: { flexDirection: isTablet ? "row" : "column", padding: wp(3.5), gap: wp(3.5) },
    leftNarrativeFlowStreamColumnBlock: { gap: hp(1.5), flex: isTablet ? 1.6 : undefined },
    inspectorHeadlineTaskTitleText: { fontSize: 20, fontWeight: "bold", color: colors.textPrimary },
    sectionSmallCapHeadingLabel: { fontSize: 11, fontWeight: "bold", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 },
    narrativeDescriptionTextCardBoxFrame: { backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.border, padding: wp(3), borderRadius: wp(2), gap: hp(1) },
    narrativeDescriptionBodyMarkdownText: { color: colors.textLight, fontSize: 14, lineHeight: 20 },
    timelineStepContainerItemRow: { flexDirection: "row", alignItems: "center", gap: wp(1.5), flexWrap: "wrap" },
    timelineStepContainerItemRowLabel: { fontSize: 12, color: colors.textSecondary },
    timelineStepContainerItemRowValue: { fontSize: 12, color: colors.textPrimary, fontWeight: "600" },
    attachedFileAssetDocumentDisplayCardItemTile: { backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.border, borderRadius: wp(2), padding: wp(2.5), width: wp(32), alignItems: "center", gap: hp(0.8) },
    attachedFileAssetDocumentDisplayCardItemTileNameTextString: { fontSize: 11, color: colors.textLight, textAlign: "center", width: "100%" },
    discussionSectionWrapperContainerBox: { gap: hp(1), marginTop: hp(1.5) },
    commentActivityFeedListItemBubbleCard: { backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.border, padding: wp(2.5), borderRadius: wp(2), marginBottom: hp(0.8) },
    commentActivityFeedListItemBubbleCardHeaderFlexRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: hp(0.5) },
    commentActivityFeedListItemBubbleCardAuthorNameString: { fontSize: 12, fontWeight: "bold", color: colors.textPrimary },
    commentActivityFeedListItemBubbleCardTimestampString: { fontSize: 10, color: colors.textSecondary },
    commentActivityFeedListItemBubbleCardBodyMarkdownMessageString: { color: colors.textLight, fontSize: 13, lineHeight: 16 },
    rightStructuralParameterMetadataColumnPropertyBoardStrip: { backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.border, padding: wp(3.5), borderRadius: wp(2.5), gap: hp(1.5), marginTop: isTablet ? 0 : hp(1.2), flex: isTablet ? 1 : undefined },
    propertyInspectorIndivCardItemBlockNode: { borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: hp(1.2) },
    propertyInspectorIndivCardItemBlockNodeLabel: { fontSize: 10, fontWeight: "bold", color: colors.textSecondary, textTransform: "uppercase" },
    propertyInspectorIndivCardItemBlockNodeValue: { fontSize: 13, color: colors.textPrimary, marginTop: hp(0.3) },
    utilityFrameworkLauncherActionRowBtn: { flexDirection: "row", alignItems: "center", gap: wp(1.5), backgroundColor: colors.bgTertiary, padding: wp(2), borderRadius: wp(1.5), justifyContent: "center", borderWidth: 1, borderColor: colors.border, minHeight: hp(4.5) },
    utilityFrameworkLauncherActionRowBtnText: { color: colors.textLight, fontSize: 11, fontWeight: "bold" },
    stickyDiscussionAccessoryComposerInputDockBar: { flexDirection: "row", alignItems: "center", backgroundColor: colors.bgSecondary, borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: wp(3), paddingVertical: hp(1), gap: wp(2) },
    mediaCaptureTriggerTouchNodeBtn: { padding: wp(2), backgroundColor: "rgba(139,92,246,0.1)", borderRadius: wp(1.5) },
    composerDockInputFieldElement: { flex: 1, backgroundColor: colors.bgPrimary, borderWidth: 1, borderColor: colors.border, borderRadius: wp(1.5), color: colors.textPrimary, paddingHorizontal: wp(2.5), paddingVertical: hp(0.8), fontSize: 13, minHeight: hp(4.8) },
    composerDockSendTouchActionNodeBtn: { backgroundColor: colors.accentBlue, width: hp(4.8), height: hp(4.8), alignItems: "center", justifyContent: "center", borderRadius: wp(1.5) },
    inspectorTaskMarkCompleteActionExecuteBtn: { backgroundColor: colors.accentGreen, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: wp(1), paddingVertical: hp(1.2), borderRadius: wp(1.5), marginTop: hp(0.5) },
    
    webHeadlineHeading: { fontSize: 20, fontWeight: "bold", color: colors.textPrimary },
    webSubheadingDescription: { fontSize: 12, color: colors.textSecondary, marginTop: hp(0.3) },
    webMediaAttachmentRowStrip: { flexDirection: "row", gap: wp(2), alignItems: "center", marginTop: hp(0.5), width: "100%", flexWrap: "wrap" },
    webUploadMediaButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: colors.bgTertiary, borderWidth: 1, borderColor: colors.border, paddingHorizontal: wp(3), paddingVertical: hp(1), borderRadius: wp(1.5), minHeight: hp(4.8) },
    webUploadMediaButtonText: { color: colors.textLight, fontSize: 13, fontWeight: "600" },
    webStatusBadgeIndicatorLabel: { flex: 1, minWidth: wp(30), paddingHorizontal: wp(2), paddingVertical: hp(1), borderRadius: wp(1.5), backgroundColor: colors.bgPrimary, borderWidth: 1, borderColor: colors.border, minHeight: hp(4.8), justifyContent: "center" },
    webSubtaskContainerPanelFrame: { backgroundColor: colors.bgPrimary, borderWidth: 1, borderColor: colors.border, borderRadius: wp(2), padding: wp(3), marginTop: hp(0.5) },
    webAlertWarningCalloutBox: { flexDirection: "row", gap: wp(2), backgroundColor: "rgba(251,191,36,0.07)", borderWidth: 1, borderColor: "rgba(251,191,36,0.2)", borderRadius: wp(1.5), padding: wp(2.5), marginTop: hp(1) },
    webAlertWarningCalloutBoxTextString: { flex: 1, color: colors.accentYellow, fontSize: 12, lineHeight: 16 },
    webInlineTaskDisplayBadgeRow: { flexDirection: "row", alignItems: "center", backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.border, borderRadius: wp(1.5), paddingHorizontal: wp(2.5), paddingVertical: hp(1), marginTop: hp(0.5) },
    webActionBlockDockControlsRow: { flexDirection: "row", justifyContent: "flex-end", gap: wp(3), marginTop: hp(3), borderTopWidth: 1, borderTopColor: colors.border, paddingTop: hp(2) },
    webCancelActionTouchNode: { paddingHorizontal: wp(4), paddingVertical: hp(1.2), justifyContent: "center" },
    webSubmitActionTouchNode: { backgroundColor: colors.accentGreen, paddingHorizontal: wp(5), paddingVertical: hp(1.2), borderRadius: wp(1.5), justifyContent: "center", alignItems: "center" },

    previewGridContainer: { flexDirection: "row", flexWrap: "wrap", gap: wp(2), marginTop: hp(1), width: "100%" },
    previewThumbnailWrapper: { position: "relative", width: wp(18), height: wp(18), borderRadius: wp(2), borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgPrimary, overflow: "visible" },
    previewThumbnailImage: { width: "100%", height: "100%", borderRadius: wp(1.5) },
    previewThumbnailFallback: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center", padding: wp(1), gap: hp(0.3) },
    previewThumbnailFallbackText: { color: colors.textSecondary, fontSize: 8, textAlign: "center", width: "100%" },
    previewRemoveBadgeButton: { position: "absolute", top: -wp(1.2), right: -wp(1.2), backgroundColor: colors.accentRedDark, borderRadius: wp(2.5), width: wp(4.5), height: wp(4.5), alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.bgSecondary, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1 }
  });
}

function createManagerStyles(
  colors: ReturnType<typeof buildColors>,
  wp: (percentage: number) => number,
  hp: (percentage: number) => number,
  isTablet: boolean,
  isSmallScreen: boolean
) {
  return StyleSheet.create({
    managerContainerBlock: { gap: hp(1.5), marginTop: hp(0.5) },
    actionGridRowToolbar: { flexDirection: "row", gap: wp(1.5), flexWrap: "wrap" },
    toolbarActionBtn: { flex: 1, minWidth: wp(25), flexDirection: "row", alignItems: "center", justifyContent: "center", gap: wp(1), backgroundColor: colors.bgTertiary, borderWidth: 1, borderColor: colors.border, paddingVertical: hp(1), paddingHorizontal: wp(1.5), borderRadius: wp(1.5) },
    toolbarActionBtnText: { color: colors.textLight, fontSize: 11, fontWeight: "600" },
    financialMetricsGridContainer: { flexDirection: "row", flexWrap: "wrap", gap: wp(1.5) },
    metricSummaryCardNode: { flex: 1, minWidth: isTablet ? "22%" : "47%", backgroundColor: colors.bgPrimary, borderWidth: 1, borderColor: colors.border, padding: wp(2.5), borderRadius: wp(2), gap: hp(0.3) },
    metricSummaryCardNodeLabel: { fontSize: 10, fontWeight: "bold", color: colors.textSecondary, textTransform: "uppercase" },
    managerStatValText: { fontSize: 14, fontWeight: "900", color: colors.textPrimary },
    progressMetricsRowTrack: { flexDirection: "row", gap: wp(2), backgroundColor: colors.bgSecondary, padding: wp(2.5), borderRadius: wp(2), borderWidth: 1, borderColor: colors.border },
    progressDataBlock: { flex: 1, gap: hp(0.3) },
    progressDataBlockTitle: { color: colors.textSecondary, fontSize: 11, fontWeight: "600" },
    progressDataBlockValue: { color: colors.textPrimary, fontSize: 15, fontWeight: "900" },
    blockerAlertsBannerFrame: { padding: wp(2), borderRadius: wp(1.5), backgroundColor: colors.bgPrimary, borderWidth: 1, borderColor: colors.border, justifyContent: "center" },
    costSectionWrapperContainerCard: { backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.border, borderRadius: wp(2), padding: wp(2.5), gap: hp(1) },
    costSectionWrapperContainerCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: hp(0.8) },
    costSectionWrapperContainerCardHeaderTitle: { fontSize: 13, fontWeight: "bold", color: colors.textPrimary },
    costSectionWrapperContainerCardHeaderSubtotal: { fontSize: 11, color: colors.textSecondary, fontWeight: "600" },
    emulatedTableHeaderRowBlock: { flexDirection: "row", width: 770, paddingVertical: hp(0.6), backgroundColor: colors.bgPrimary, borderRadius: wp(1), paddingHorizontal: wp(1.5) },
    thCell: { fontSize: 10, fontWeight: "bold", color: colors.textSecondary },
    emptyTableInlineLabelNoticeString: { color: colors.textSecondary, fontSize: 12, fontStyle: "italic" },
    emulatedTableDataRowBlock: { flexDirection: "row", width: 770, paddingVertical: hp(1), borderBottomWidth: 0.5, borderBottomColor: colors.border, paddingHorizontal: wp(1.5), alignItems: "center" },
    tdCell: { fontSize: 12, color: colors.textLight },
    statusWrapperBadgeCell: { borderWidth: 1, paddingHorizontal: wp(1), paddingVertical: hp(0.2), borderRadius: wp(1), alignItems: "center", justifyContent: "center" },
    addInlineRowActionBtn: { flexDirection: "row", alignItems: "center", gap: wp(1), paddingTop: hp(0.5) },
    addInlineRowActionBtnText: { color: colors.accentBlueLight, fontSize: 11, fontWeight: "bold" },
    certificationDataNodeLineRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: hp(0.8), borderBottomWidth: 0.5, borderBottomColor: colors.border },
    sectionCreationInputWrapperRowFrame: { flexDirection: "row", gap: wp(1.5), marginTop: hp(0.5), alignItems: "center" },
    sectionCreationInputFieldElement: { flex: 1, backgroundColor: colors.bgPrimary, borderWidth: 1, borderColor: colors.border, borderRadius: wp(1.5), color: colors.textPrimary, paddingHorizontal: wp(2.5), paddingVertical: hp(0.8), fontSize: 12, minHeight: hp(4.8) },
    sectionCreationSubmitTouchNodeBtn: { backgroundColor: colors.accentBlue, paddingHorizontal: wp(3), paddingVertical: hp(1), borderRadius: wp(1.5), justifyContent: "center", minHeight: hp(4.8) },
  });
}

function createDialogStyles(
  colors: ReturnType<typeof buildColors>,
  wp: (percentage: number) => number,
  hp: (percentage: number) => number,
  isTablet: boolean,
  isSmallScreen: boolean
) {
  return StyleSheet.create({
    modalBlurOverlay: { flex: 1, backgroundColor: "rgba(13, 17, 23, 0.75)", justifyContent: "center", padding: isSmallScreen ? wp(3) : wp(4) },
    modalDialogContentBox: { backgroundColor: colors.bgSecondary, borderRadius: wp(3), borderWidth: 1, borderColor: colors.border, padding: wp(4), maxHeight: "90%", width: "100%", maxWidth: isTablet ? 560 : undefined, alignSelf: "center" },
    modalHeaderContainerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: hp(1.8), borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: hp(1) },
    modalHeaderHeading: { fontSize: 16, fontWeight: "bold", color: colors.textPrimary },
    modalFormBody: { flexDirection: "column", gap: hp(1.5) },
    fieldInputLabel: { fontSize: 11, color: colors.textSecondary, marginBottom: hp(0.5), fontWeight: "bold" },
    modalTextInput: { backgroundColor: colors.bgPrimary, borderWidth: 1, borderColor: colors.border, borderRadius: wp(1.5), color: colors.textPrimary, paddingHorizontal: wp(2.5), fontSize: 13, height: hp(4.8) },
    dropdownTriggerPill: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.bgPrimary, borderWidth: 1, borderColor: colors.border, borderRadius: wp(1.5), paddingHorizontal: wp(2.5), height: hp(4.8) },
    dropdownMenuOptionsWrapperFrame: { backgroundColor: colors.bgPrimary, borderWidth: 1, borderColor: colors.border, borderRadius: wp(1.5), marginTop: hp(0.5), overflow: "hidden" },
    dropdownMenuOptionsItemRow: { padding: wp(2.5), borderBottomWidth: 0.5, borderBottomColor: colors.border },
    modalActionRowFooter: { flexDirection: "row", justifyContent: "flex-end", gap: wp(2.5), marginTop: hp(2.5) },
    modalCancelTouchNode: { paddingHorizontal: wp(3.5), paddingVertical: hp(1), justifyContent: "center" },
    modalSubmitTouchNode: { backgroundColor: colors.accentBlue, paddingHorizontal: wp(4), paddingVertical: hp(1), borderRadius: wp(1.5), minWidth: wp(20), alignItems: "center", justifyContent: "center" },
  });
}

// =======================================================
// SYSTEM CORE COST MANAGER DIALOGS
// =======================================================
interface ItemInputDialogModalProps {
  sectionId: string;
  projectId: string;
  onClose: () => void;
  onSuccess: () => void;
}

function ItemInputDialogModal({ sectionId, projectId, onClose, onSuccess }: ItemInputDialogModalProps) {
  const { width, height } = useWindowDimensions();
  const wp = (percentage: number) => (width * percentage) / 100;
  const hp = (percentage: number) => (height * percentage) / 100;
  const isTablet = width >= 768;
  const isSmallScreen = width < 375;
  const colors = useMemo(() => buildColors(), []);

  const dialogStyles = useMemo(
    () => createDialogStyles(colors, wp, hp, isTablet, isSmallScreen),
    [width, height, isTablet, isSmallScreen]
  );

  const [itemName, setItemName] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [qty, setQty] = useState("1");
  const [unitCost, setUnitCost] = useState("");
  const [locationName, setLocationName] = useState("");
  const [shelf, setShelf] = useState("");
  const [purchaseStatus, setPurchaseStatus] = useState<PurchaseStatus>("not_purchased");
  const [saving, setSaving] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  
  const handleSaveItem = async () => {
    if (!itemName.trim()) {
      Alert.alert("Required Input", "Please enter an item name.");
      return;
    }
    setSaving(true);
    try {
      const calculatedTotalCents = dollarsToCents(unitCost) * (Number(qty) || 1);
      const payload = {
        itemName: itemName.trim(),
        qty: Number(qty) || 1,
        unitCostCents: dollarsToCents(unitCost),
        estimatedTotalCents: calculatedTotalCents,
        purchaseStatus,
        vendor: vendorName.trim() ? { name: vendorName.trim() } : null,
        storage: {
          locationName: locationName.trim() || undefined,
          shelf: shelf.trim() || undefined,
        },
        paidCents: purchaseStatus === "purchased" || purchaseStatus === "stored" ? calculatedTotalCents : 0,
      };

      await apiRequest(`/cost-manager/sections/${sectionId}/items`, {
        method: "POST",
        data: payload,
      });
      onSuccess();
    } catch (err) {
      Alert.alert("Operational Error", "Could not commit line item data structure variables.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={dialogStyles.modalBlurOverlay}>
        <ScrollView style={dialogStyles.modalDialogContentBox} contentContainerStyle={{ paddingBottom: hp(2.5) }}>
          <View style={dialogStyles.modalHeaderContainerRow}>
            <Text style={dialogStyles.modalHeaderHeading}>Add Section Line Item</Text>
            <TouchableOpacity onPress={onClose}><X size={16} color="#8b949e" /></TouchableOpacity>
          </View>

          <View style={dialogStyles.modalFormBody}>
            <View>
              <Text style={dialogStyles.fieldInputLabel}>Item Identifier Name *</Text>
              <TextInput style={dialogStyles.modalTextInput} value={itemName} onChangeText={setItemName} placeholder="e.g. Aluminum prototypes brackets" placeholderTextColor="#4b5563" />
            </View>

            <View>
              <Text style={dialogStyles.fieldInputLabel}>Supplier Vendor Contact</Text>
              <TextInput style={dialogStyles.modalTextInput} value={vendorName} onChangeText={setVendorName} placeholder="e.g. McMaster-Carr Logistics" placeholderTextColor="#4b5563" />
            </View>

            <View style={{ flexDirection: "row", gap: wp(2) }}>
              <View style={{ flex: 1 }}>
                <Text style={dialogStyles.fieldInputLabel}>Quantity Vol</Text>
                <TextInput style={dialogStyles.modalTextInput} keyboardType="number-pad" value={qty} onChangeText={setQty} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={dialogStyles.fieldInputLabel}>Unit Cost ($)</Text>
                <TextInput style={dialogStyles.modalTextInput} keyboardType="decimal-pad" value={unitCost} onChangeText={setUnitCost} placeholder="0.00" placeholderTextColor="#4b5563" />
              </View>
            </View>

            <View style={{ position: "relative", zIndex: 100 }}>
              <Text style={dialogStyles.fieldInputLabel}>Procurement Purchase Status</Text>
              <TouchableOpacity style={dialogStyles.dropdownTriggerPill} onPress={() => setShowStatusDropdown(!showStatusDropdown)}>
                <Text style={{ color: "#fff", fontSize: 13 }}>{PURCHASE_STATUS_META[purchaseStatus]?.label || purchaseStatus}</Text>
                <ChevronDown size={14} color="#8b949e" />
              </TouchableOpacity>
              
              {showStatusDropdown && (
                <View style={dialogStyles.dropdownMenuOptionsWrapperFrame}>
                  {(Object.keys(PURCHASE_STATUS_META) as PurchaseStatus[]).map((statusKey) => (
                    <TouchableOpacity
                      key={statusKey}
                      style={dialogStyles.dropdownMenuOptionsItemRow}
                      onPress={() => { setPurchaseStatus(statusKey); setShowStatusDropdown(false); }}
                    >
                      <Text style={{ color: PURCHASE_STATUS_META[statusKey].color, fontSize: 12, fontWeight: "600" }}>
                        {PURCHASE_STATUS_META[statusKey].label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={{ flexDirection: "row", gap: wp(2), marginTop: hp(0.5) }}>
              <View style={{ flex: 1 }}>
                <Text style={dialogStyles.fieldInputLabel}>Storage Facility Hub</Text>
                <TextInput style={dialogStyles.modalTextInput} value={locationName} onChangeText={setLocationName} placeholder="e.g. Grid Position Alpha" placeholderTextColor="#4b5563" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={dialogStyles.fieldInputLabel}>Shelf/Bin Index</Text>
                <TextInput style={dialogStyles.modalTextInput} value={shelf} onChangeText={setShelf} placeholder="e.g. A4-B2" placeholderTextColor="#4b5563" />
              </View>
            </View>
          </View>

          <View style={dialogStyles.modalActionRowFooter}>
            <TouchableOpacity style={dialogStyles.modalCancelTouchNode} onPress={onClose}>
              <Text style={{ color: "#c9d1d9", fontSize: 13 }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={dialogStyles.modalSubmitTouchNode} onPress={handleSaveItem} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 13 }}>Commit Parameters</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ==========================================
// COST MANAGER CONTAINER PANEL
// ==========================================
interface MobileCostManagerProps {
  projectId: string;
  projectName: string;
  tasks: Array<{ id: string; title: string }>;
}

function MobileCostManager_({ projectId, projectName, tasks }: MobileCostManagerProps) {
  const { width, height } = useWindowDimensions();
  const wp = (percentage: number) => (width * percentage) / 100;
  const hp = (percentage: number) => (height * percentage) / 100;
  const isTablet = width >= 768;
  const isSmallScreen = width < 375;
  const colors = useMemo(() => buildColors(), []);

  const managerStyles = useMemo(
    () => createManagerStyles(colors, wp, hp, isTablet, isSmallScreen),
    [width, height, isTablet, isSmallScreen]
  );

  const queryClient = useQueryClient();
  const [activeSectionInput, setActiveSectionInput] = useState("");
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [activeDialogTargetId, setActiveDialogTargetId] = useState<string | null>(null);

  const { data: costData, isLoading } = useQuery({
    queryKey: ["project-cost-sheet", projectId],
    queryFn: () => getProjectCostSheet(projectId).then(res => res.data),
    enabled: !!projectId,
  });

  const addSectionMutation = useMutation({
    mutationFn: (name: string) => createCostSection(costData?.sheet?.id || "", { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-cost-sheet", projectId] });
      setActiveSectionInput("");
    }
  });

  if (isLoading || !costData) {
    return <ActivityIndicator color="#58a6ff" style={{ marginVertical: hp(2.5) }} />;
  }

  const { summary, sections = [], certifications = [] } = costData;

  return (
    <View style={managerStyles.managerContainerBlock}>
      <View style={managerStyles.actionGridRowToolbar}>
        <TouchableOpacity style={managerStyles.toolbarActionBtn} onPress={() => Alert.alert("Telemetry Status Check", "Matching automated criteria models...")}>
          <Sliders size={12} color="#c9d1d9" style={[{transform: [{rotate: '90deg'}]}]} />
          <Text style={managerStyles.toolbarActionBtnText} numberOfLines={1}>What Can I Buy Now?</Text>
        </TouchableOpacity>
        <TouchableOpacity style={managerStyles.toolbarActionBtn} onPress={() => Alert.alert("Location Finder Matrix", "Initializing inventory physical maps arrays...")}>
          <MapPin size={12} color="#c9d1d9" />
          <Text style={managerStyles.toolbarActionBtnText} numberOfLines={1}>Location Finder</Text>
        </TouchableOpacity>
        <TouchableOpacity style={managerStyles.toolbarActionBtn} onPress={() => Alert.alert("Export Operation", "Compiling ledgers data matrices...")}>
          <FileText size={12} color="#c9d1d9" />
          <Text style={managerStyles.toolbarActionBtnText} numberOfLines={1}>Export</Text>
        </TouchableOpacity>
      </View>

      <View style={managerStyles.financialMetricsGridContainer}>
        <View style={managerStyles.metricSummaryCardNode}>
          <Text style={managerStyles.metricSummaryCardNodeLabel}>Projected Prototype Cost</Text>
          <Text style={managerStyles.managerStatValText}>{formatMoney(summary?.projectedCents || 0)}</Text>
        </View>
        <View style={managerStyles.metricSummaryCardNode}>
          <Text style={managerStyles.metricSummaryCardNodeLabel}>Amount Spent So Far</Text>
          <Text style={[managerStyles.managerStatValText, { color: "#56d364" }]}>{formatMoney(summary?.spentCents || 0)}</Text>
        </View>
        <View style={managerStyles.metricSummaryCardNode}>
          <Text style={managerStyles.metricSummaryCardNodeLabel}>Remaining to Prototype</Text>
          <Text style={managerStyles.managerStatValText}>{formatMoney(summary?.remainingCents || 0)}</Text>
        </View>
        <View style={managerStyles.metricSummaryCardNode}>
          <Text style={managerStyles.metricSummaryCardNodeLabel}>Available Budget</Text>
          <Text style={[managerStyles.managerStatValText, { color: "#58a6ff" }]}>{formatMoney(summary?.availableBudgetCents || 0)}</Text>
        </View>
      </View>

      <View style={managerStyles.progressMetricsRowTrack}>
        <View style={managerStyles.progressDataBlock}>
          <Text style={managerStyles.progressDataBlockTitle}>Purchased ({summary?.purchasedCount || 0} of {summary?.totalCount || 0} items)</Text>
          <Text style={managerStyles.progressDataBlockValue}>{summary?.purchasedPct || 0}%</Text>
        </View>
        <View style={managerStyles.progressDataBlock}>
          <Text style={managerStyles.progressDataBlockTitle}>Build Readiness</Text>
          <Text style={[managerStyles.progressDataBlockValue, { color: "#56d364" }]}>{summary?.buildReadinessPct || 0}%</Text>
        </View>
      </View>

      <View style={managerStyles.blockerAlertsBannerFrame}>
        {summary?.nextBlocker ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: wp(1.5) }}>
            <AlertTriangle size={14} color="#ff7b72" />
            <Text style={{ color: "#ff7b72", fontSize: 12, fontWeight: "bold", flex: 1 }}>Blocker: {summary.nextBlocker.itemName} requires urgent component fulfillment</Text>
          </View>
        ) : (
          <View style={{ flexDirection: "row", alignItems: "center", gap: wp(1.5) }}>
            <Check size={14} color="#56d364" />
            <Text style={{ color: "#56d364", fontSize: 12, fontWeight: "bold" }}>No open blockers</Text>
          </View>
        )}
      </View>

      <View style={{ gap: hp(1.5), marginTop: hp(1) }}>
        {sections.map((sect) => {
          const isCollapsed = !!collapsedSections[sect.id];
          return (
            <View key={sect.id} style={managerStyles.costSectionWrapperContainerCard}>
              <TouchableOpacity
                style={managerStyles.costSectionWrapperContainerCardHeader}
                onPress={() => setCollapsedSections({ ...collapsedSections, [sect.id]: !isCollapsed })}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: wp(1.5), flex: 1 }}>
                  {isCollapsed ? <ChevronRight size={14} color="#8b949e" /> : <ChevronDown size={14} color="#8b949e" />}
                  <Text style={managerStyles.costSectionWrapperContainerCardHeaderTitle} numberOfLines={1}>✓ {sect.name}</Text>
                  <Text style={{ fontSize: 11, color: "#8b949e" }}>({sect.items?.length || 0})</Text>
                </View>
                <Text style={managerStyles.costSectionWrapperContainerCardHeaderSubtotal}>
                  {formatMoney(sect.subtotalPaidCents)} / {formatMoney(sect.subtotalEstimatedCents)}
                </Text>
              </TouchableOpacity>

              {!isCollapsed && (
                <View style={{ marginTop: hp(0.8) }}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={true} contentContainerStyle={{ flexDirection: "column" }}>
                    <View style={managerStyles.emulatedTableHeaderRowBlock}>
                      <Text style={[managerStyles.thCell, { width: 110 }]}>Item</Text>
                      <Text style={[managerStyles.thCell, { width: 95 }]}>Vendor</Text>
                      <Text style={[managerStyles.thCell, { width: 40 }]}>Qty</Text>
                      <Text style={[managerStyles.thCell, { width: 80 }]}>Unit Cost</Text>
                      <Text style={[managerStyles.thCell, { width: 85 }]}>Est. Total</Text>
                      <Text style={[managerStyles.thCell, { width: 75 }]}>Paid</Text>
                      <Text style={[managerStyles.thCell, { width: 80 }]}>Remaining</Text>
                      <Text style={[managerStyles.thCell, { width: 95 }]}>Status</Text>
                      <Text style={[managerStyles.thCell, { width: 110 }]}>Location</Text>
                    </View>

                    {(!sect.items || sect.items.length === 0) ? (
                      <View style={{ width: 770, paddingVertical: hp(2), alignItems: "center" }}>
                        <Text style={managerStyles.emptyTableInlineLabelNoticeString}>No line items registered.</Text>
                      </View>
                    ) : (
                      sect.items.map((item) => {
                        const sMeta = PURCHASE_STATUS_META[item.purchaseStatus] || { label: "Unknown", color: "#c9d1d9" };
                        const locationStr = [item.storage?.locationName, item.storage?.shelf].filter(Boolean).join(" / ") || "—";
                        return (
                          <View key={item.id} style={managerStyles.emulatedTableDataRowBlock}>
                            <Text style={[managerStyles.tdCell, { width: 110, color: "#fff", fontWeight: "bold" }]} numberOfLines={1}>{item.itemName}</Text>
                            <Text style={[managerStyles.tdCell, { width: 95 }]} numberOfLines={1}>{item.vendor?.name || "—"}</Text>
                            <Text style={[managerStyles.tdCell, { width: 40 }]}>{item.qty}</Text>
                            <Text style={[managerStyles.tdCell, { width: 80 }]}>{formatMoney(item.unitCostCents)}</Text>
                            <Text style={[managerStyles.tdCell, { width: 85, fontWeight: "bold", color: "#fff" }]}>{formatMoney(item.estimatedTotalCents)}</Text>
                            <Text style={[managerStyles.tdCell, { width: 75, color: "#56d364" }]}>{formatMoney(item.paidCents)}</Text>
                            <Text style={[managerStyles.tdCell, { width: 80 }]}>{formatMoney(item.remainingCents)}</Text>
                            <View style={[managerStyles.statusWrapperBadgeCell, { width: 95, borderColor: sMeta.color }]}>
                              <Text style={{ color: sMeta.color, fontSize: 9, fontWeight: "bold" }}>{sMeta.label}</Text>
                            </View>
                            <Text style={[managerStyles.tdCell, { width: 110 }]} numberOfLines={1}>{locationStr}</Text>
                          </View>
                        );
                      })
                    )}
                  </ScrollView>

                  <TouchableOpacity style={managerStyles.addInlineRowActionBtn} onPress={() => setActiveDialogTargetId(sect.id)}>
                    <Plus size={12} color="#58a6ff" />
                    <Text style={managerStyles.addInlineRowActionBtnText}>Add Line Item</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
      </View>

      <View style={[managerStyles.costSectionWrapperContainerCard, { marginTop: hp(1.5) }]}>
        <Text style={[managerStyles.costSectionWrapperContainerCardHeaderTitle, { marginBottom: hp(0.8) }]}>Testing & Certification System Requirements</Text>
        {certifications.length === 0 ? (
          <Text style={[managerStyles.emptyTableInlineLabelNoticeString, { textAlign: "left", paddingVertical: hp(0.5) }]}>
            No testing, UL listing, permit, or certification requirements yet.
          </Text>
        ) : (
          certifications.map((cert) => {
            const cMeta = CERT_STATUS_META[cert.status] || { label: "Unknown", color: "#c9d1d9" };
            return (
              <View key={cert.id} style={managerStyles.certificationDataNodeLineRow}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "#fff", fontSize: 13, fontWeight: "bold" }}>{cert.name}</Text>
                  <Text style={{ color: "#8b949e", fontSize: 11 }}>Lab: {cert.authorityOrLab || "—"} • Standard: {cert.standard || "—"}</Text>
                </View>
                <View style={[managerStyles.statusWrapperBadgeCell, { borderColor: cMeta.color }]}>
                  <Text style={{ color: cMeta.color, fontSize: 9, fontWeight: "900" }}>{cMeta.label}</Text>
                </View>
              </View>
            );
          })
        )}
        <TouchableOpacity style={[managerStyles.addInlineRowActionBtn, { marginTop: hp(0.8) }]} onPress={() => Alert.alert("Add Requirement", "Open lab testing registration criteria sheets...")}>
          <Plus size={12} color="#58a6ff" />
          <Text style={managerStyles.addInlineRowActionBtnText}>Add Requirement</Text>
        </TouchableOpacity>
      </View>

      <View style={managerStyles.sectionCreationInputWrapperRowFrame}>
        <TextInput
          style={managerStyles.sectionCreationInputFieldElement}
          placeholder="New Cost Section label heading..."
          placeholderTextColor="#4b5563"
          value={activeSectionInput}
          onChangeText={setActiveSectionInput}
        />
        <TouchableOpacity style={managerStyles.sectionCreationSubmitTouchNodeBtn} onPress={() => { if (activeSectionInput.trim()) addSectionMutation.mutate(activeSectionInput.trim()); }}>
          <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 12 }}>Add Cost Section</Text>
        </TouchableOpacity>
      </View>

      {activeDialogTargetId !== null && (
        <ItemInputDialogModal
          sectionId={activeDialogTargetId}
          projectId={projectId}
          onClose={() => setActiveDialogTargetId(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["project-cost-sheet", projectId] });
            setActiveDialogTargetId(null);
          }}
        />
      )}
    </View>
  );
}

// ==========================================
// CORE WORKSPACE SCREEN COMPONENT
// ==========================================
export default function MobileTasksScreen() {
  const { width, height } = useWindowDimensions();
  const wp = (percentage: number) => (width * percentage) / 100;
  const hp = (percentage: number) => (height * percentage) / 100;
  const isTablet = width >= 768;
  const isSmallScreen = width < 375;
  const colors = useMemo(() => buildColors(), []);
  

  const styles = useMemo(
    () => createStyles(colors, wp, hp, isTablet, isSmallScreen),
    [width, height, isTablet, isSmallScreen]
  );
  const dialogStyles = useMemo(
    () => createDialogStyles(colors, wp, hp, isTablet, isSmallScreen),
    [width, height, isTablet, isSmallScreen]
  );

  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const { socket } = useSocket();
  const { triggerBlaster, incrementCompletedCount } = useTaskBlasterContext();
  const { triggerReward } = useRewards();
  const now = useGlobalTimer();

  const [jwtToken, setJwtToken] = useState<string | null>(null);

  // Navigation Scope States
  const [activeTab, setActiveTab] = useState<TabMode>("all");
  const [currentViewMode, setCurrentViewMode] = useState<"list" | "project-detail">("list");
  const [activeProjectTab, setActiveProjectTab] = useState<ProjectDetailTab>("tasks");
  const [modalTab, setModalTab] = useState<"overview" | "followup" | "expenses" | "discussion">("overview");
  // Filtering & Query Matrix States
  const [projectSearchQuery, setProjectSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [assignmentFilter, setAssignmentFilter] = useState("all");
  const [viewByPriority, setViewByPriority] = useState(false);
  const [taskPage, setTaskPage] = useState(1);
  const [projectPage, setProjectPage] = useState(1);

  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [commentDraft, setCommentDraft] = useState("");

  // Window Toggles & Modal Panels Switches
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isViewTaskModalOpen, setIsViewTaskModalOpen] = useState(false);
  const [isCreateExpenseOpen, setIsCreateExpenseOpen] = useState(false);
  const [isExpenseListOpen, setIsExpenseListOpen] = useState(false);
  const [isVideoRecorderOpen, setIsVideoRecorderOpen] = useState(false);
  const [expandedFilterTray, setExpandedFilterTray] = useState<"status" | "priority" | "assignment" | null>(null);

  // Picker & Selection Context Handlers
  const [showAssigneePickerOverlay, setShowAssigneePickerOverlay] = useState(false);
  const [assigneePickerTarget, setAssigneePickerTarget] = useState<"project" | "standalone-task" | "project-subtask" | null>(null);

  // Live Socket Event Pipelines
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [othersTyping, setOthersTyping] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // --- Dynamic Form Formations: Create Project Scope ---
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  const [newProjectLogo, setNewProjectLogo] = useState<FileObject | null>(null);
  const [newProjectAttachments, setNewProjectAttachments] = useState<FileObject[]>([]);
  const [newProjectAssignees, setNewProjectAssignees] = useState<string[]>([]);
  const [newProjectTasks, setNewProjectTasks] = useState<Partial<Task>[]>([]);

  // --- Dynamic Form Formations: Complete Project Subtask Setup ---
  const [isInnerTaskBuilderOpen, setIsInnerTaskBuilderOpen] = useState(false);
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [subtaskDesc, setSubtaskDesc] = useState("");
  const [subtaskPriority, setSubtaskPriority] = useState<Task["priority"]>("medium");
  const [subtaskStatus, setSubtaskStatus] = useState<Task["status"]>("pending");
  const [subtaskAssignees, setSubtaskAssignees] = useState<string[]>([]);
  const [subtaskAttachments, setSubtaskAttachments] = useState<FileObject[]>([]);
  const [subtaskLocation, setSubtaskLocation] = useState("");
  const [subtaskDueDate, setSubtaskDueDate] = useState("");
  const [subtaskDueTime, setSubtaskDueTime] = useState("");
  const [showSubtaskPriorityDropdown, setShowSubtaskPriorityDropdown] = useState(false);
  const [showSubtaskStatusDropdown, setShowSubtaskStatusDropdown] = useState(false);

  // --- Dynamic Form Formations: Standalone Task Configuration ---
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskAssignees, setNewTaskAssignees] = useState<string[]>([]);
  const [newTaskPriority, setNewTaskPriority] = useState<Task["priority"]>("medium");
  const [newTaskStatus, setNewTaskStatus] = useState<Task["status"]>("pending");
  const [newTaskLocation, setNewTaskLocation] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [newTaskDueTime, setNewTaskDueTime] = useState("");
  const [newTaskAttachments, setNewTaskAttachments] = useState<FileObject[]>([]);

  // Standalone Dropdown Menu Display Flags
  const [showTaskPriorityDropdown, setShowTaskPriorityDropdown] = useState(false);
  const [showTaskStatusDropdown, setShowTaskStatusDropdown] = useState(false);

  const [commentAttachments, setCommentAttachments] = useState<FileObject[]>([]);

  // Retrieve auth token for image requests

  const handleOpenTask = (task: Task) => {
    setSelectedTask(task);
    setModalTab("overview");
    setIsViewTaskModalOpen(true);
    void fetchTaskComments(task.id);
  };
  
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        let token =
          (currentUser as any)?.token ||
          (currentUser as any)?.accessToken ||
          (currentUser as any)?.jwt;

        if (!token) {
          const keys = await AsyncStorage.getAllKeys();
          const possibleTokenKeys = keys.filter((k) =>
            /token|jwt|auth|session/i.test(k)
          );
          for (const key of possibleTokenKeys) {
            const val = await AsyncStorage.getItem(key);
            if (val && typeof val === "string" && val.length > 10) {
              token = val;
              break;
            }
          }
        }

        if (isMounted && token) {
          setJwtToken(token);
        }
      } catch (err) {
        console.error("Failed to retrieve token:", err);
      }
    })();
    return () => { isMounted = false; };
  }, [currentUser]);

  // Fetch Team Directory API Sync Hooks
  const { data: usersContainer = { items: [] } } = useQuery({
    queryKey: ["workspace-users"],
    queryFn: async () => {
      const res = await apiRequest<{ items: any[] }>("/users");
      return res.data || { items: [] };
    },
  });

  const resolvedWorkspaceAssignees = useMemo(() => {
    const itemsList = usersContainer.items || [];
    if (itemsList.length > 0) {
      return itemsList.map(u => u.name || u.username);
    }
    return ["Talha Qazi", "Nathan Reardon", "Sarah Connor", "Alex Mercer", "Emma Watson"];
  }, [usersContainer]);

  const { data: tasksContainer = { items: [], totalPages: 1 }, isLoading: isTasksLoading } = useQuery({
    queryKey: ["tasks", taskPage, projectSearchQuery, statusFilter, priorityFilter, assignmentFilter, viewByPriority, selectedProject?.id],
    queryFn: async () => {
      let endpoint = `/tasks?page=${taskPage}&limit=${PAGE_SIZE}&search=${projectSearchQuery}&status=${statusFilter}&priority=${priorityFilter}&assignment=${assignmentFilter}${viewByPriority ? "&sort=priority" : ""}`;
      
      if (selectedProject?.id) {
        endpoint += `&projectId=${selectedProject.id}`;
      }

      const res = await apiRequest<{ items: any[]; totalPages: number }>(endpoint);
      return { 
        items: (res.data?.items || []).map((t: any) => ({ id: t._id || t.id, ...t })), 
        totalPages: res.data?.totalPages || 1 
      };
    },
  });

  const { data: projectsContainer = { items: [], totalPages: 1 }, isLoading: isProjectsLoading } = useQuery({
    queryKey: ["projects", projectPage, projectSearchQuery],
    queryFn: async () => {
      const res = await apiRequest<{ items: Project[]; totalPages: number }>(`/projects?page=${projectPage}&limit=${PAGE_SIZE}&search=${projectSearchQuery}`);
      return { items: (res.data?.items || []).map((p: any) => ({ id: p._id || p.id, ...p })), totalPages: res.data?.totalPages || 1 };
    },
  });

  const { data: topContributors = [] } = useQuery({
    queryKey: ["top-contributors"],
    queryFn: async () => {
      const res = await apiRequest<{ contributors: any[] }>("/contributors/top?limit=5");
      return res.data?.contributors || [];
    },
  });

  useEffect(() => {
    if (!socket || !selectedTask) return;
    socket.emit("join-task", selectedTask.id);

    socket.on("new-comment", (comment: TaskComment) => {
      setComments((prev) => prev.some(c => c.id === comment.id) ? prev : [...prev, comment]);
    });

    socket.on("typing", ({ username, typing, taskId }: { username: string; typing: boolean; taskId: string }) => {
      if (taskId !== selectedTask.id || username === currentUser?.username) return;
      setOthersTyping(prev => typing ? (prev.includes(username) ? prev : [...prev, username]) : prev.filter(u => u !== username));
    });

    return () => {
      socket.off("new-comment");
      socket.off("typing");
      socket.emit("leave-task", selectedTask.id);
    };
  }, [socket, selectedTask?.id]);

  const fetchTaskComments = async (taskId: string) => {
    const res = await apiRequest<{ items: TaskComment[] }>(`/tasks/${taskId}/comments`);
    setComments(res.data?.items || []);
  };

 const handlePostComment = async () => {
  if (!commentDraft.trim() && commentAttachments.length === 0) return;
  if (!selectedTask) return;

  try {
    const res = await apiRequest<{ item: TaskComment }>(`/tasks/${selectedTask.id}/comments`, {
      method: "POST",
      data: { 
        message: commentDraft.trim(),
        attachments: commentAttachments,
      },
    });
    setComments((c) => [...c, res.data!.item]);
    setCommentDraft("");
    setCommentAttachments([]);
  } catch (err) {
    Alert.alert("Error", "Failed to post comment.");
  }
};

  const emitTypingStatus = (text: string) => {
    setCommentDraft(text);
    if (!socket || !selectedTask) return;

    if (!isTyping) {
      setIsTyping(true);
      socket.emit("typing", { typing: true, username: currentUser?.username, taskId: selectedTask.id });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socket.emit("typing", { typing: false, username: currentUser?.username, taskId: selectedTask.id });
    }, 2000);
  };

  const launchNativeImagePickerPipeline = async (target: "project-logo" | "project-attachments" | "task-attachments" | "subtask-attachments") => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert("Permission Required", "Fulfillment requires system photo library access authorization scopes.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: target !== "project-logo",
        quality: 0.8,
        base64: true,
      });

      if (result.canceled || !result.assets) return;

      const processedFiles: FileObject[] = result.assets.map((asset) => {
        const fileStamp = Date.now().toString().substring(6);
        const inferredExt = asset.uri.split(".").pop() || "jpg";
        return {
          fileName: asset.fileName || `Attachment_${fileStamp}.${inferredExt}`,
          url: asset.base64 ? `data:${asset.mimeType || "image/jpeg"};base64,${asset.base64}` : asset.uri,
          mimeType: asset.mimeType || "image/jpeg",
          size: asset.fileSize || 1024 * 100,
        };
      });

      if (target === "project-logo") {
        setNewProjectLogo(processedFiles[0]);
      } else if (target === "project-attachments") {
        setNewProjectAttachments((prev) => [...prev, ...processedFiles]);
      } else if (target === "task-attachments") {
        setNewTaskAttachments((prev) => [...prev, ...processedFiles]);
      } else if (target === "subtask-attachments") {
        setSubtaskAttachments((prev) => [...prev, ...processedFiles]);
      }
    } catch (err) {
      Alert.alert("System Exception", "An error occurred executing native library selection queries.");
    }
  };

  const createProjectMutation = useMutation({
    mutationFn: async (payload: any) => await apiRequest("/projects", { method: "POST", data: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setIsCreateProjectOpen(false);
      setNewProjectName("");
      setNewProjectDesc("");
      setNewProjectLogo(null);
      setNewProjectAttachments([]);
      setNewProjectAssignees([]);
      setNewProjectTasks([]);
      Alert.alert("Success", "Project dataset created successfully.");
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (payload: any) => await apiRequest("/tasks", { method: "POST", data: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setIsCreateTaskOpen(false);
      setNewTaskTitle("");
      setNewTaskDesc("");
      setNewTaskAssignees([]);
      setNewTaskLocation("");
      setNewTaskDueDate("");
      setNewTaskDueTime("");
      setNewTaskAttachments([]);
      Alert.alert("Success", "Task dataset committed safely.");
    },
  });

  const updateTaskStatusMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: Task["status"] }) => {
      return await apiRequest(`/tasks/${taskId}`, { method: "PATCH", data: { status } });
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      if (res?.data) {
        setSelectedTask({ id: res.data._id || res.data.id, ...res.data });
      }
    }
  });

  const updateTaskPriorityMutation = useMutation({
    mutationFn: async ({ taskId, priority }: { taskId: string; priority: Task["priority"] }) => {
      return await apiRequest(`/tasks/${taskId}`, { method: "PATCH", data: { priority } });
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      if (res?.data) {
        setSelectedTask({ id: res.data._id || res.data.id, ...res.data });
      }
    }
  });

  const toggleSubtaskMutation = useMutation({
    mutationFn: async ({ taskId, subtaskId, completed }: { taskId: string; subtaskId: string; completed: boolean }) => {
      return await apiRequest(`/tasks/${taskId}/subtasks/${subtaskId}`, { method: "PATCH", data: { completed } });
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      if (res?.data) {
        setSelectedTask({ id: res.data._id || res.data.id, ...res.data });
      }
    }
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      return await apiRequest(`/tasks/${taskId}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setIsViewTaskModalOpen(false);
      setSelectedTask(null);
      Alert.alert("Success", "Task deleted successfully.");
    }
  });

  const resolvedTasks = useMemo(() => {
    let base = tasksContainer.items || [];
    if (selectedProject) {
      base = base.filter((t: any) => {
        const rawProjectId = typeof t.projectId === "object"
          ? (t.projectId?._id || t.projectId?.id)
          : t.projectId;
        return String(rawProjectId) === String(selectedProject.id);
      });
    }
    if (projectSearchQuery) {
      base = base.filter((t: Task) => t.title.toLowerCase().includes(projectSearchQuery.toLowerCase()));
    }
    return base;
  }, [tasksContainer.items, selectedProject, projectSearchQuery]);

  const handleToggleAssigneeSelection = (name: string) => {
    if (assigneePickerTarget === "project") {
      setNewProjectAssignees(p => p.includes(name) ? p.filter(x => x !== name) : [...p, name]);
    } else if (assigneePickerTarget === "standalone-task") {
      setNewTaskAssignees(p => p.includes(name) ? p.filter(x => x !== name) : [...p, name]);
    } else if (assigneePickerTarget === "project-subtask") {
      setSubtaskAssignees(p => p.includes(name) ? p.filter(x => x !== name) : [...p, name]);
    }
  };

  const commitSubtaskToProjectBuilder = () => {
    if (!subtaskTitle.trim() || !subtaskDesc.trim()) {
      Alert.alert("Required Input Fields", "Task title parameters and structural descriptions are absolute prerequisites.");
      return;
    }
    const subtaskNode: Partial<Task> = {
      title: subtaskTitle.trim(),
      description: subtaskDesc.trim(),
      priority: subtaskPriority,
      status: subtaskStatus,
      location: subtaskLocation.trim() || undefined,
      dueDate: subtaskDueDate.trim() || new Date().toISOString().split("T")[0],
      dueTime: subtaskDueTime.trim() || undefined,
      assignees: subtaskAssignees,
      attachments: subtaskAttachments,
    };

    setNewProjectTasks(p => [...p, subtaskNode]);
    
    setSubtaskTitle("");
    setSubtaskDesc("");
    setSubtaskPriority("medium");
    setSubtaskStatus("pending");
    setSubtaskLocation("");
    setSubtaskDueDate("");
    setSubtaskDueTime("");
    setSubtaskAssignees([]);
    setSubtaskAttachments([]);
    setIsInnerTaskBuilderOpen(false);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.fullscreenContainer}>
      
      {/* Top Header Navigation Strip */}
      <View style={styles.navbarHeaderFrame}>
        {currentViewMode !== "list" && (
          <TouchableOpacity style={styles.navbarBackBtn} onPress={() => { setSelectedProject(null); setCurrentViewMode("list"); }}>
            <ChevronLeft size={16} color="#fff" />
            <Text style={styles.backBtnText}>Back to Projects</Text>
          </TouchableOpacity>
        )}
        
        {currentViewMode === "list" ? (
          <View style={{ flex: 1 }}>
            <Text style={styles.navbarHeadlineHeading}>Task Management</Text>
            <Text style={styles.navbarSubheadingDescription}>Create, assign, and track all tasks</Text>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            <Text style={styles.navbarHeadlineHeading} numberOfLines={1}>{selectedProject?.name}</Text>
            <Text style={styles.navbarSubheadingDescription}>Project Workspace Pipeline</Text>
          </View>
        )}
        
        {currentViewMode === "list" && (
          <View style={styles.headerButtonClusterRow}>
            <TouchableOpacity style={styles.primaryActionButtonNode} onPress={() => setIsCreateProjectOpen(true)}>
              <Plus size={14} color="#fff" />
              <Text style={styles.primaryActionButtonNodeText}>Project</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.primaryActionButtonNode, { backgroundColor: "#1f6feb" }]} onPress={() => { setIsCreateTaskOpen(true); }}>
              <Plus size={14} color="#fff" />
              <Text style={styles.primaryActionButtonNodeText}>Add Task</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Control Filter Bar Hub */}
      {currentViewMode === "list" && (
        <View style={styles.filterSuiteControlCenterBox}>
          <View style={styles.searchBarLayoutFrame}>
            <Search size={14} color="#8b949e" style={{ marginRight: wp(1.5) }} />
            <TextInput
              style={styles.searchBarInputField}
              placeholder="Search projects or tasks..."
              placeholderTextColor="#4b5563"
              value={projectSearchQuery}
              onChangeText={setProjectSearchQuery}
            />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterPillsHorizontalScrollTrack}>
            <TouchableOpacity style={styles.filterDropdownSelectorPill} onPress={() => setExpandedFilterTray(expandedFilterTray === "status" ? null : "status")}>
              <Text style={styles.filterDropdownSelectorPillText}>Status: {statusFilter.toUpperCase()}</Text>
              <ChevronDown size={10} color="#8b949e" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.filterDropdownSelectorPill} onPress={() => setExpandedFilterTray(expandedFilterTray === "priority" ? null : "priority")}>
              <Text style={styles.filterDropdownSelectorPillText}>Priority: {priorityFilter.toUpperCase()}</Text>
              <ChevronDown size={10} color="#8b949e" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.filterDropdownSelectorPill} onPress={() => setExpandedFilterTray(expandedFilterTray === "assignment" ? null : "assignment")}>
              <Text style={styles.filterDropdownSelectorPillText}>Assignment</Text>
              <ChevronDown size={10} color="#8b949e" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterDropdownSelectorPill, viewByPriority && { backgroundColor: "rgba(249,115,22,0.15)", borderColor: "#f97316" }]}
              onPress={() => setViewByPriority(!viewByPriority)}
            >
              <Flame size={12} color={viewByPriority ? "#f97316" : "#8b949e"} style={{ marginRight: wp(1) }} />
              <Text style={[styles.filterDropdownSelectorPillText, viewByPriority && { color: "#f97316" }]}>View by Priority</Text>
            </TouchableOpacity>
          </ScrollView>

          {expandedFilterTray === "status" && (
            <View style={styles.inlineFilterChoiceTrayOverlay}>
              {["all", "pending", "in-progress", "completed", "overdue"].map((st) => (
                <TouchableOpacity key={st} style={styles.inlineFilterChoiceOptionRow} onPress={() => { setStatusFilter(st); setExpandedFilterTray(null); }}>
                  <Text style={[styles.inlineFilterChoiceOptionRowText, statusFilter === st && { color: "#58a6ff" }]}>{st.toUpperCase()}</Text>
                  {statusFilter === st && <Check size={12} color="#58a6ff" />}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {expandedFilterTray === "priority" && (
            <View style={styles.inlineFilterChoiceTrayOverlay}>
              {["all", "low", "medium", "high"].map((pr) => (
                <TouchableOpacity key={pr} style={styles.inlineFilterChoiceOptionRow} onPress={() => { setPriorityFilter(pr); setExpandedFilterTray(null); }}>
                  <Text style={[styles.inlineFilterChoiceOptionRowText, priorityFilter === pr && { color: "#58a6ff" }]}>{pr.toUpperCase()}</Text>
                  {priorityFilter === pr && <Check size={12} color="#58a6ff" />}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {expandedFilterTray === "assignment" && (
            <View style={styles.inlineFilterChoiceTrayOverlay}>
              {["all", "me", "assigned", "unassigned"].map((asg) => (
                <TouchableOpacity key={asg} style={styles.inlineFilterChoiceOptionRow} onPress={() => { setAssignmentFilter(asg); setExpandedFilterTray(null); }}>
                  <Text style={[styles.inlineFilterChoiceOptionRowText, assignmentFilter === asg && { color: "#58a6ff" }]}>{asg.toUpperCase()}</Text>
                  {assignmentFilter === asg && <Check size={12} color="#58a6ff" />}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Viewport Content Scrolling Pane */}
      <ScrollView style={styles.scrollContainerBodyViewport} contentContainerStyle={{ paddingBottom: hp(3) }}>
        {currentViewMode === "list" && (
          <View style={{ gap: hp(1.5), marginTop: hp(1.5) }}>
            <View style={styles.tabSwitcherCapsuleContainerRow}>
              {(["all", "projects", "tasks"] as TabMode[]).map((tab) => (
                <TouchableOpacity
                  key={tab}
                  style={[styles.tabSwitcherSelectionPillBtn, activeTab === tab && styles.tabSwitcherSelectionPillBtnActive]}
                  onPress={() => setActiveTab(tab)}
                >
                  <Text style={[styles.tabSwitcherSelectionPillBtnText, activeTab === tab && styles.tabSwitcherSelectionPillBtnTextActive]}>
                    {tab === "all" ? "All Assets" : tab === "projects" ? "Projects Only" : "Tasks Only"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.leaderboardMetricsContainerCard}>
              <View style={styles.leaderboardMetricsTitleContainerRow}>
                <TrendingUp size={14} color="#fbbf24" />
                <Text style={styles.leaderboardMetricsTitleHeadingText}>Top Contributors</Text>
              </View>
              {topContributors.length === 0 ? (
                <Text style={styles.emptyStateItalicTextCaptionString}>No contributors tracked yet.</Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: wp(2.5) }}>
                  {topContributors.map((c, idx) => (
                    <View key={c.userId || idx} style={styles.leaderboardIndivProfileCard}>
                      <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 12 }}>{c.name}</Text>
                      <Text style={{ color: "#8b949e", fontSize: 10 }}>Completed: {c.stats?.totalTasksCompleted || 0}</Text>
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>

            {(activeTab === "all" || activeTab === "projects") && (
              <View style={styles.verticalBlockAssetSectionContainer}>
                <Text style={styles.verticalBlockAssetSectionHeadingLabel}>Projects</Text>
                {isProjectsLoading ? <ActivityIndicator color="#58a6ff" /> : projectsContainer.items.map((proj) => {
                  const hasTeam = Array.isArray(proj.assignees) && proj.assignees.length > 0;
                  const logoUri = getDisplayImageUrl(proj.logo?.url, jwtToken);
                  return (
                    <TouchableOpacity
                      key={proj.id}
                      style={styles.premiumAssetDisplayListItemCard}
                      onPress={() => { 
                        setSelectedProject(proj); 
                        setActiveProjectTab("tasks");
                        setCurrentViewMode("project-detail"); 
                      }}
                    >
                      <View style={styles.assetCardHeaderRow}>
                        {logoUri ? (
                          <Image source={{ uri: logoUri }} style={styles.assetThumbnailImage} resizeMode="cover" />
                        ) : (
                          <View style={styles.assetPlaceholderBox}>
                            <FileText size={16} color="#8b949e" />
                          </View>
                        )}
                        <Text style={styles.premiumAssetDisplayCardTitleText} numberOfLines={1}>{proj.name}</Text>
                        <View style={styles.projectStatusInlineBadgeBox}>
                          <Text style={styles.projectStatusInlineBadgeBoxTextString}>{proj.status || "Pending"}</Text>
                        </View>
                      </View>
                      {!!proj.description && <Text style={styles.premiumAssetDisplayCardSubTextDescription} numberOfLines={2}>{proj.description}</Text>}
                      <Text style={styles.inlineProjectTeamLabelMetaTextString}>
                        Team: {hasTeam ? proj.assignees?.join(", ") : "Unassigned"}
                      </Text>
                      <Text style={styles.footerInlineMetadataLabelString}>
                        {proj.taskCount || 0} Total Tasks
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {(activeTab === "all" || activeTab === "tasks") && (
              <View style={styles.verticalBlockAssetSectionContainer}>
                <Text style={styles.verticalBlockAssetSectionHeadingLabel}>Tasks</Text>
                {isTasksLoading ? <ActivityIndicator color="#58a6ff" /> : tasksContainer.items.map((task, index) => {
                  const timer = task.dueDate ? getRemainingTime(task.dueDate, now) : null;
                  const tState = timer ? getTimerState(timer.totalMs) : null;
                  const firstAttach = task.attachments?.[0]?.url || task.attachment?.url;
                  const attachUri = getDisplayImageUrl(firstAttach, jwtToken);
                  const hasAssignees = Array.isArray(task.assignees) && task.assignees.length > 0;
                  const completedSubtasks = task.subtasks?.filter(s => s.completed).length || 0;
                  const totalSubtasks = task.subtasks?.length || 0;

                  return (
                    <TouchableOpacity
                      key={task.id}
                      style={styles.premiumAssetDisplayListItemCard}
                      onPress={() => { setSelectedTask(task); setIsViewTaskModalOpen(true); void fetchTaskComments(task.id); }}
                    >
                      <View style={styles.assetCardHeaderRow}>
                        {attachUri ? (
                          <Image source={{ uri: attachUri }} style={styles.assetThumbnailImage} resizeMode="cover" />
                        ) : (
                          <View style={styles.assetPlaceholderBox}>
                            <FileText size={16} color="#58a6ff" />
                          </View>
                        )}
                        <Text style={styles.premiumAssetDisplayCardTitleText} numberOfLines={1}>
                          {task.taskNumber || (index + 1)}. {task.title}
                        </Text>
                        <Text style={styles.priorityLabelIndicatorString}>{task.priority} priority</Text>
                      </View>
                      <Text style={styles.premiumAssetDisplayCardSubTextDescription} numberOfLines={2}>{task.description}</Text>
                      
                      {!!task.location && (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: wp(1) }}>
                          <MapPin size={11} color="#8b949e" />
                          <Text style={{ color: "#8b949e", fontSize: 11 }}>{task.location}</Text>
                        </View>
                      )}

                      {timer && (
                        <Text style={[styles.timerCountdownDisplayString, {
                          color: tState === "critical" || tState === "overdue" ? "#f85149" : tState === "warning" ? "#d29922" : "#56d364"
                        }]}>
                          ⏱ Due: {task.dueDate} ({timer.formatted})
                        </Text>
                      )}
                      
                      <View style={styles.combinedBadgesInlineMatrixRow}>
                        <View style={styles.condensedInlineStatusBadgePill}>
                          <Text style={styles.condensedInlineStatusBadgePillText}>{task.status.toUpperCase()}</Text>
                        </View>
                        {hasAssignees && (
                          <View style={[styles.condensedInlineStatusBadgePill, { backgroundColor: "rgba(139,92,246,0.1)" }]}>
                            <Text style={[styles.condensedInlineStatusBadgePillText, { color: "#8b5cf6" }]}>👤 {task.assignees.join(", ")}</Text>
                          </View>
                        )}
                        {totalSubtasks > 0 && (
                          <View style={[styles.condensedInlineStatusBadgePill, { backgroundColor: "rgba(251,191,36,0.1)" }]}>
                            <Text style={[styles.condensedInlineStatusBadgePillText, { color: "#fbbf24" }]}>☑ {completedSubtasks}/{totalSubtasks} subtasks</Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Project Pipeline Layer */}
        {currentViewMode === "project-detail" && selectedProject && (
          <View style={{ gap: hp(1.5), marginTop: hp(1.5) }}>
            <View style={styles.projectPortalOverviewDisplayBannerCard}>
              <View style={styles.assetCardHeaderRow}>
                {selectedProject.logo?.url ? (
                  <Image source={{ uri: getDisplayImageUrl(selectedProject.logo.url, jwtToken)! }} style={styles.assetThumbnailImage} resizeMode="cover" />
                ) : (
                  <View style={styles.assetPlaceholderBox}>
                    <FileText size={18} color="#58a6ff" />
                  </View>
                )}
                <Text style={styles.projectPortalOverviewHeadlineTitleText}>{selectedProject.name} Project</Text>
                <View style={styles.projectStatusInlineBadgeBox}>
                  <Text style={styles.projectStatusInlineBadgeBoxTextString}>{selectedProject.status || "In Progress"}</Text>
                </View>
              </View>
              
              <Text style={styles.projectPortalOverviewBodyDescriptionText}>{selectedProject.description || "—"}</Text>
              <Text style={styles.inlineProjectTeamLabelMetaTextString}>
                Team: {selectedProject.assignees?.join(", ") || "Unassigned"}
              </Text>
              
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: hp(0.5) }}>
                <Text style={styles.footerInlineMetadataLabelString}>{resolvedTasks.length} Total Tasks</Text>
                <Text style={{ color: "#8b949e", fontSize: 11 }}>Created {selectedProject.createdAt || "2026-03-26"}</Text>
              </View>

              <View style={styles.projectPortalMetaFooterActionsRowTrack}>
                <TouchableOpacity style={[styles.projectPortalActionLauncherGridBtn, { backgroundColor: "#1f6feb" }]} onPress={() => setIsCreateTaskOpen(true)}>
                  <Plus size={12} color="#fff" />
                  <Text style={styles.projectPortalActionLauncherGridBtnText}>Add Task</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.projectPortalActionLauncherGridBtn, { backgroundColor: "#238636" }]} onPress={() => setIsCreateExpenseOpen(true)}>
                  <Plus size={12} color="#fff" />
                  <Text style={styles.projectPortalActionLauncherGridBtnText}>Create Expense</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.projectPortalActionLauncherGridBtn, { backgroundColor: "#21262d" }]} onPress={() => setIsExpenseListOpen(true)}>
                  <Layers size={12} color="#fff" />
                  <Text style={styles.projectPortalActionLauncherGridBtnText}>View Expenses</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.tabSwitcherCapsuleContainerRow}>
              {(["overview", "tasks", "discussion"] as ProjectDetailTab[]).map((tab) => (
                <TouchableOpacity
                  key={tab}
                  style={[styles.tabSwitcherSelectionPillBtn, activeProjectTab === tab && styles.tabSwitcherSelectionPillBtnActive]}
                  onPress={() => setActiveProjectTab(tab)}
                >
                  <Text style={[styles.tabSwitcherSelectionPillBtnText, activeProjectTab === tab && styles.tabSwitcherSelectionPillBtnTextActive]}>
                    {tab === "overview" ? "Cost Sheet Overview" : tab === "tasks" ? "Task Pipeline" : "Discussion Feed"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {activeProjectTab === "overview" && (
              <View style={{ marginTop: hp(0.5) }}>
                <MobileCostManager
                  projectId={selectedProject.id}
                  projectName={selectedProject.name}
                  tasks={resolvedTasks.map((t) => ({ id: t.id, title: t.title }))}
                />
              </View>
            )}

            {activeProjectTab === "tasks" && (
              <View style={{ gap: hp(1) }}>
                <Text style={styles.verticalBlockAssetSectionHeadingLabel}>Project Tasks Pipeline ({resolvedTasks.length})</Text>
                {isTasksLoading ? (
                  <ActivityIndicator color="#58a6ff" style={{ marginVertical: hp(2) }} />
                ) : resolvedTasks.length === 0 ? (
                  <Text style={styles.emptyStateItalicTextCaptionString}>No tasks mapped inside this project container structure.</Text>
                ) : (
                  resolvedTasks.map((task, index) => {
                    const firstAttach = task.attachments?.[0]?.url || task.attachment?.url;
                    const attachUri = getDisplayImageUrl(firstAttach, jwtToken);
                    const hasAssignees = Array.isArray(task.assignees) && task.assignees.length > 0;
                    const completedSubtasks = task.subtasks?.filter(s => s.completed).length || 0;
                    const totalSubtasks = task.subtasks?.length || 0;

                    return (
                      <TouchableOpacity
                        key={task.id}
                        style={styles.premiumAssetDisplayListItemCard}
                        onPress={() => { setSelectedTask(task); setIsViewTaskModalOpen(true); void fetchTaskComments(task.id); }}
                      >
                        <View style={styles.assetCardHeaderRow}>
                          {attachUri ? (
                            <Image source={{ uri: attachUri }} style={styles.assetThumbnailImage} resizeMode="cover" />
                          ) : (
                            <View style={styles.assetPlaceholderBox}>
                              <FileText size={16} color="#58a6ff" />
                            </View>
                          )}
                          <Text style={styles.premiumAssetDisplayCardTitleText} numberOfLines={1}>{task.taskNumber || (index + 1)}. {task.title}</Text>
                          <Text style={styles.priorityLabelIndicatorString}>{task.priority} priority</Text>
                        </View>
                        <Text style={styles.premiumAssetDisplayCardSubTextDescription} numberOfLines={2}>{task.description}</Text>
                        
                        {!!task.location && (
                          <View style={{ flexDirection: "row", alignItems: "center", gap: wp(1) }}>
                            <MapPin size={11} color="#8b949e" />
                            <Text style={{ color: "#8b949e", fontSize: 11 }}>{task.location}</Text>
                          </View>
                        )}

                        <View style={styles.combinedBadgesInlineMatrixRow}>
                          <View style={styles.condensedInlineStatusBadgePill}>
                            <Text style={styles.condensedInlineStatusBadgePillText}>{task.status.toUpperCase()}</Text>
                          </View>
                          {hasAssignees && (
                            <View style={[styles.condensedInlineStatusBadgePill, { backgroundColor: "rgba(139,92,246,0.1)" }]}>
                              <Text style={[styles.condensedInlineStatusBadgePillText, { color: "#8b949e" }]}>👤 {task.assignees.join(", ")}</Text>
                            </View>
                          )}
                          {totalSubtasks > 0 && (
                            <View style={[styles.condensedInlineStatusBadgePill, { backgroundColor: "rgba(251,191,36,0.1)" }]}>
                              <Text style={[styles.condensedInlineStatusBadgePillText, { color: "#fbbf24" }]}>☑ {completedSubtasks}/{totalSubtasks}</Text>
                            </View>
                          )}
                        </View>
                        <Text style={{ color: "#8b949e", fontSize: 11, marginTop: hp(0.3) }}>Due: {task.dueDate || "—"}</Text>
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            )}

            {activeProjectTab === "discussion" && (
              <View style={styles.discussionSectionWrapperContainerBox}>
                <Text style={styles.sectionSmallCapHeadingLabel}>Project Global Discussions Channel</Text>
                <Text style={styles.emptyStateItalicTextCaptionString}>Use the communication tray dock sheet to collaborate contextually.</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Task View Detail Sheet */}
      <Modal visible={false} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setIsViewTaskModalOpen(false)}>
        <View style={styles.fullscreenModalViewFrameContainer}>
          <View style={styles.modalNavigationHeaderTopbarNavBar}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: wp(1.5) }}>
              <View style={styles.webStyleProjectBadgeLabelPill}>
                <Text style={styles.webStyleProjectBadgeLabelPillText}>Task Details</Text>
              </View>
              {selectedTask && <Text style={styles.modalHeaderIdLabelString}>• ID: {selectedTask.id.substring(0, 6)}</Text>}
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: wp(2) }}>
              {selectedTask && (
                <TouchableOpacity 
                  onPress={() => {
                    Alert.alert("Delete Task", "Are you sure you want to delete this task?", [
                      { text: "Cancel", style: "cancel" },
                      { text: "Delete", style: "destructive", onPress: () => deleteTaskMutation.mutate(selectedTask.id) }
                    ]);
                  }}
                  style={{ padding: wp(1) }}
                >
                  <Trash2 size={16} color="#ff7b72" />
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.modalNavigationHeaderTopbarNavBarCloseTouchNodeBtn} onPress={() => setIsViewTaskModalOpen(false)}>
                <X size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {selectedTask && (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: hp(5) }}>
              <View style={styles.splitLayoutInspectorWorkspaceContainerBlockRow}>
                <View style={styles.leftNarrativeFlowStreamColumnBlock}>
                  <Text style={styles.inspectorHeadlineTaskTitleText}>{selectedTask.title}</Text>
                  
                  <View style={{ gap: hp(0.8), marginTop: hp(1.2) }}>
                    <Text style={styles.sectionSmallCapHeadingLabel}>Description</Text>
                    <View style={styles.narrativeDescriptionTextCardBoxFrame}>
                      <Text style={styles.narrativeDescriptionBodyMarkdownText}>{selectedTask.description}</Text>
                    </View>
                  </View>

                  {/* Subtasks / Checklist Section */}
                  <View style={{ gap: hp(0.8), marginTop: hp(1.5) }}>
                    <Text style={styles.sectionSmallCapHeadingLabel}>Subtasks & Checklist</Text>
                    <View style={styles.narrativeDescriptionTextCardBoxFrame}>
                      {(!selectedTask.subtasks || selectedTask.subtasks.length === 0) ? (
                        <Text style={styles.emptyStateItalicTextCaptionString}>No subtasks registered.</Text>
                      ) : (
                        selectedTask.subtasks.map((sub) => (
                          <TouchableOpacity
                            key={sub.id}
                            style={{ flexDirection: "row", alignItems: "center", gap: wp(2), paddingVertical: hp(0.5) }}
                            onPress={() => toggleSubtaskMutation.mutate({ taskId: selectedTask.id, subtaskId: sub.id, completed: !sub.completed })}
                          >
                            {sub.completed ? <CheckSquare size={16} color="#56d364" /> : <Square size={16} color="#8b949e" />}
                            <Text style={[styles.narrativeDescriptionBodyMarkdownText, sub.completed && { textDecorationLine: "line-through", color: "#8b949e" }]} numberOfLines={1}>
                              {sub.title}
                            </Text>
                          </TouchableOpacity>
                        ))
                      )}
                    </View>
                  </View>

                  <View style={{ marginTop: hp(1.5) }}>
                    <TaskExpensesPanel taskId={selectedTask.id} />
                  </View>

                  <View style={{ gap: hp(1), marginTop: hp(2) }}>
                    <Text style={styles.sectionSmallCapHeadingLabel}>Timeline Tracking Block</Text>
                    <View style={styles.narrativeDescriptionTextCardBoxFrame}>
                      <View style={styles.timelineStepContainerItemRow}>
                        <CheckCircle2 size={12} color="#56d364" />
                        <Text style={styles.timelineStepContainerItemRowLabel}>Created On Platform Line: </Text>
                        <Text style={styles.timelineStepContainerItemRowValue}>{selectedTask.createdAt || "1 Jul 2026"}</Text>
                      </View>
                      <View style={styles.timelineStepContainerItemRow}>
                        <Clock size={12} color="#58a6ff" />
                        <Text style={styles.timelineStepContainerItemRowLabel}>Due Date & Time: </Text>
                        <Text style={styles.timelineStepContainerItemRowValue}>{selectedTask.dueDate || "—"} {selectedTask.dueTime || ""}</Text>
                      </View>
                      {!!selectedTask.location && (
                        <View style={styles.timelineStepContainerItemRow}>
                          <MapPin size={12} color="#fbbf24" />
                          <Text style={styles.timelineStepContainerItemRowLabel}>Location Site: </Text>
                          <Text style={styles.timelineStepContainerItemRowValue}>{selectedTask.location}</Text>
                        </View>
                      )}
                      <View style={styles.timelineStepContainerItemRow}>
                        <Users size={12} color="#8b5cf6" />
                        <Text style={styles.timelineStepContainerItemRowLabel}>Operators: </Text>
                        <Text style={styles.timelineStepContainerItemRowValue}>
                          {selectedTask.assignees?.length > 0 ? selectedTask.assignees.join(", ") : "Unassigned"}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={{ gap: hp(1), marginTop: hp(2) }}>
                    <Text style={styles.sectionSmallCapHeadingLabel}>Attached Specification File Assets</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: wp(2) }}>
                      {selectedTask.attachments?.map((file, i) => {
                        const fileUri = getDisplayImageUrl(file.url, jwtToken);
                        return (
                          <View key={i} style={styles.attachedFileAssetDocumentDisplayCardItemTile}>
                            {file.mimeType?.startsWith("image/") || fileUri ? (
                              <Image source={{ uri: fileUri! }} style={{ width: "100%", height: hp(7.5), borderRadius: wp(1) }} />
                            ) : (
                              <FileText size={20} color="#58a6ff" />
                            )}
                            <Text style={styles.attachedFileAssetDocumentDisplayCardItemTileNameTextString} numberOfLines={1}>{file.fileName}</Text>
                          </View>
                        );
                      })}
                    </ScrollView>
                  </View>

                  <View style={{ marginTop: hp(2) }}>
                    <TaskTimeline task={selectedTask} />
                  </View>

                  <View style={styles.discussionSectionWrapperContainerBox}>
                    <Text style={styles.sectionSmallCapHeadingLabel}>Activity Feed Conversations ({comments.length})</Text>
                    {comments.map((c) => (
                      <View key={c.id} style={styles.commentActivityFeedListItemBubbleCard}>
                        <View style={styles.commentActivityFeedListItemBubbleCardHeaderFlexRow}>
                          <Text style={styles.commentActivityFeedListItemBubbleCardAuthorNameString}>{c.authorUsername}</Text>
                          <Text style={styles.commentActivityFeedListItemBubbleCardTimestampString}>Just now</Text>
                        </View>
                        <Text style={styles.commentActivityFeedListItemBubbleCardBodyMarkdownMessageString}>{c.message}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                <View style={styles.rightStructuralParameterMetadataColumnPropertyBoardStrip}>
                  <Text style={styles.sectionSmallCapHeadingLabel}>Properties Engine</Text>
                  
                  <View style={styles.propertyInspectorIndivCardItemBlockNode}>
                    <Text style={styles.propertyInspectorIndivCardItemBlockNodeLabel}>Assignees Stack</Text>
                    <Text style={styles.propertyInspectorIndivCardItemBlockNodeValue}>
                      {selectedTask.assignees?.length > 0 ? selectedTask.assignees.join(", ") : "Unassigned"}
                    </Text>
                  </View>

                  <View style={styles.propertyInspectorIndivCardItemBlockNode}>
                    <Text style={styles.propertyInspectorIndivCardItemBlockNodeLabel}>Priority Class</Text>
                    <View style={{ flexDirection: "row", gap: wp(1), marginTop: hp(0.5) }}>
                      {(["low", "medium", "high"] as Task["priority"][]).map((pr) => (
                        <TouchableOpacity
                          key={pr}
                          style={[
                            styles.condensedInlineStatusBadgePill,
                            selectedTask.priority === pr && { backgroundColor: "rgba(249,115,22,0.2)", borderColor: "#f97316", borderWidth: 1 }
                          ]}
                          onPress={() => updateTaskPriorityMutation.mutate({ taskId: selectedTask.id, priority: pr })}
                        >
                          <Text style={[styles.condensedInlineStatusBadgePillText, selectedTask.priority === pr && { color: "#f97316" }]}>
                            {pr.toUpperCase()}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.propertyInspectorIndivCardItemBlockNode}>
                    <Text style={styles.propertyInspectorIndivCardItemBlockNodeLabel}>Workflow Control State</Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: wp(1), marginTop: hp(0.5) }}>
                      {(["pending", "in-progress", "completed", "overdue"] as Task["status"][]).map((st) => (
                        <TouchableOpacity
                          key={st}
                          style={[
                            styles.condensedInlineStatusBadgePill,
                            selectedTask.status === st && { backgroundColor: "rgba(35,134,54,0.2)", borderColor: "#238636", borderWidth: 1 }
                          ]}
                          onPress={() => updateTaskStatusMutation.mutate({ taskId: selectedTask.id, status: st })}
                        >
                          <Text style={[styles.condensedInlineStatusBadgePillText, selectedTask.status === st && { color: "#56d364" }]}>
                            {st.toUpperCase()}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <TouchableOpacity style={styles.utilityFrameworkLauncherActionRowBtn} onPress={() => Alert.alert("Print Workflow Processed", "Generating data matrices...")}>
                    <Printer size={12} color="#c9d1d9" />
                    <Text style={styles.utilityFrameworkLauncherActionRowBtnText}>Print Asset PDF Documentation</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          )}

          <View style={styles.stickyDiscussionAccessoryComposerInputDockBar}>
            <TouchableOpacity style={styles.mediaCaptureTriggerTouchNodeBtn} onPress={() => setIsVideoRecorderOpen(true)}>
              <Video size={14} color="#8b5cf6" />
            </TouchableOpacity>
            <TextInput
              style={styles.composerDockInputFieldElement}
              placeholder="Write a comment reply response..."
              placeholderTextColor="#8b949e"
              value={commentDraft}
              onChangeText={emitTypingStatus}
            />
            <TouchableOpacity style={styles.composerDockSendTouchActionNodeBtn} onPress={handlePostComment}>
              <Send size={12} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* FULL TASK INSPECTOR MODAL */}
<Modal
  visible={isViewTaskModalOpen}
  animationType="slide"
  presentationStyle="pageSheet"
  onRequestClose={() => setIsViewTaskModalOpen(false)}
>
  <KeyboardAvoidingView
    behavior={Platform.OS === "ios" ? "padding" : "height"}
    style={styles.fullscreenModalViewFrameContainer}
  >
    {/* Navigation Topbar */}
    <View style={styles.modalNavigationHeaderTopbarNavBar}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: wp(1.5), flex: 1 }}>
        <View style={styles.webStyleProjectBadgeLabelPill}>
          <Text style={styles.webStyleProjectBadgeLabelPillText}>Task Details</Text>
        </View>
        {selectedTask && (
          <Text style={styles.modalHeaderIdLabelString} numberOfLines={1}>
            • ID: {selectedTask.id.substring(0, 8)}
          </Text>
        )}
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: wp(2) }}>
        {selectedTask && (
          <TouchableOpacity
            onPress={() => {
              Alert.alert(
                "Delete Task",
                "Are you sure you want to delete this task? This action cannot be undone.",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => deleteTaskMutation.mutate(selectedTask.id),
                  },
                ]
              );
            }}
            style={{ padding: wp(1) }}
          >
            <Trash2 size={18} color="#ff7b72" />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.modalNavigationHeaderTopbarNavBarCloseTouchNodeBtn}
          onPress={() => setIsViewTaskModalOpen(false)}
        >
          <X size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>

    {/* Web-Style Sub-Tab Header Strip */}
    {selectedTask && (
      <View style={styles.tabSwitcherCapsuleContainerRow}>
        <TouchableOpacity
          style={[
            styles.tabSwitcherSelectionPillBtn,
            modalTab === "overview" && styles.tabSwitcherSelectionPillBtnActive,
          ]}
          onPress={() => setModalTab("overview")}
        >
          <Text
            style={[
              styles.tabSwitcherSelectionPillBtnText,
              modalTab === "overview" && styles.tabSwitcherSelectionPillBtnTextActive,
            ]}
          >
            Overview
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabSwitcherSelectionPillBtn,
            modalTab === "followup" && styles.tabSwitcherSelectionPillBtnActive,
          ]}
          onPress={() => setModalTab("followup")}
        >
          <Text
            style={[
              styles.tabSwitcherSelectionPillBtnText,
              modalTab === "followup" && styles.tabSwitcherSelectionPillBtnTextActive,
            ]}
          >
            Follow-Ups
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabSwitcherSelectionPillBtn,
            modalTab === "expenses" && styles.tabSwitcherSelectionPillBtnActive,
          ]}
          onPress={() => setModalTab("expenses")}
        >
          <Text
            style={[
              styles.tabSwitcherSelectionPillBtnText,
              modalTab === "expenses" && styles.tabSwitcherSelectionPillBtnTextActive,
            ]}
          >
            Expenses
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabSwitcherSelectionPillBtn,
            modalTab === "discussion" && styles.tabSwitcherSelectionPillBtnActive,
          ]}
          onPress={() => setModalTab("discussion")}
        >
          <Text
            style={[
              styles.tabSwitcherSelectionPillBtnText,
              modalTab === "discussion" && styles.tabSwitcherSelectionPillBtnTextActive,
            ]}
          >
            Discussion ({comments.length})
          </Text>
        </TouchableOpacity>
      </View>
    )}

    {/* Body Viewport */}
    {selectedTask && (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: hp(6) }}>
        <View style={styles.splitLayoutInspectorWorkspaceContainerBlockRow}>
          
          {/* TAB 1: OVERVIEW */}
          {modalTab === "overview" && (
            <View style={styles.leftNarrativeFlowStreamColumnBlock}>
              <Text style={styles.inspectorHeadlineTaskTitleText}>{selectedTask.title}</Text>

              {/* Description */}
              <View style={{ gap: hp(0.8), marginTop: hp(1) }}>
                <Text style={styles.sectionSmallCapHeadingLabel}>Description</Text>
                <View style={styles.narrativeDescriptionTextCardBoxFrame}>
                  <Text style={styles.narrativeDescriptionBodyMarkdownText}>
                    {selectedTask.description || "No description provided."}
                  </Text>
                </View>
              </View>

              {/* Checklist & Subtasks */}
              <View style={{ gap: hp(0.8), marginTop: hp(1.5) }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={styles.sectionSmallCapHeadingLabel}>Subtasks & Checklist</Text>
                  <Text style={{ color: "#8b949e", fontSize: 11 }}>
                    {selectedTask.subtasks?.filter((s) => s.completed).length || 0} of{" "}
                    {selectedTask.subtasks?.length || 0} done
                  </Text>
                </View>
                <View style={styles.narrativeDescriptionTextCardBoxFrame}>
                  {!selectedTask.subtasks || selectedTask.subtasks.length === 0 ? (
                    <Text style={styles.emptyStateItalicTextCaptionString}>No subtasks registered.</Text>
                  ) : (
                    selectedTask.subtasks.map((sub) => (
                      <TouchableOpacity
                        key={sub.id}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: wp(2),
                          paddingVertical: hp(0.6),
                        }}
                        onPress={() =>
                          toggleSubtaskMutation.mutate({
                            taskId: selectedTask.id,
                            subtaskId: sub.id,
                            completed: !sub.completed,
                          })
                        }
                      >
                        {sub.completed ? (
                          <CheckSquare size={16} color="#56d364" />
                        ) : (
                          <Square size={16} color="#8b949e" />
                        )}
                        <Text
                          style={[
                            styles.narrativeDescriptionBodyMarkdownText,
                            sub.completed && { textDecorationLine: "line-through", color: "#8b949e" },
                          ]}
                          numberOfLines={1}
                        >
                          {sub.title}
                        </Text>
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              </View>

              {/* Timeline Tracking */}
              <View style={{ gap: hp(1), marginTop: hp(1.5) }}>
                <Text style={styles.sectionSmallCapHeadingLabel}>Timeline Tracking Block</Text>
                <View style={styles.narrativeDescriptionTextCardBoxFrame}>
                  <View style={styles.timelineStepContainerItemRow}>
                    <CheckCircle2 size={12} color="#56d364" />
                    <Text style={styles.timelineStepContainerItemRowLabel}>Created On Platform Line: </Text>
                    <Text style={styles.timelineStepContainerItemRowValue}>
                      {selectedTask.createdAt || "2026-03-26"}
                    </Text>
                  </View>
                  <View style={styles.timelineStepContainerItemRow}>
                    <Clock size={12} color="#58a6ff" />
                    <Text style={styles.timelineStepContainerItemRowLabel}>Due Date & Time: </Text>
                    <Text style={styles.timelineStepContainerItemRowValue}>
                      {selectedTask.dueDate || "—"} {selectedTask.dueTime || ""}
                    </Text>
                  </View>
                  {!!selectedTask.location && (
                    <View style={styles.timelineStepContainerItemRow}>
                      <MapPin size={12} color="#fbbf24" />
                      <Text style={styles.timelineStepContainerItemRowLabel}>Location Site: </Text>
                      <Text style={styles.timelineStepContainerItemRowValue}>{selectedTask.location}</Text>
                    </View>
                  )}
                  <View style={styles.timelineStepContainerItemRow}>
                    <Users size={12} color="#8b5cf6" />
                    <Text style={styles.timelineStepContainerItemRowLabel}>Operators: </Text>
                    <Text style={styles.timelineStepContainerItemRowValue}>
                      {selectedTask.assignees?.length > 0 ? selectedTask.assignees.join(", ") : "Unassigned"}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Attachments */}
              {selectedTask.attachments && selectedTask.attachments.length > 0 && (
                <View style={{ gap: hp(1), marginTop: hp(1.5) }}>
                  <Text style={styles.sectionSmallCapHeadingLabel}>Attached File Assets</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: wp(2) }}>
                    {selectedTask.attachments.map((file, i) => {
                      const fileUri = getDisplayImageUrl(file.url, jwtToken);
                      return (
                        <View key={i} style={styles.attachedFileAssetDocumentDisplayCardItemTile}>
                          {file.mimeType?.startsWith("image/") || fileUri ? (
                            <Image
                              source={{ uri: fileUri! }}
                              style={{ width: "100%", height: hp(7.5), borderRadius: wp(1) }}
                            />
                          ) : (
                            <FileText size={20} color="#58a6ff" />
                          )}
                          <Text
                            style={styles.attachedFileAssetDocumentDisplayCardItemTileNameTextString}
                            numberOfLines={1}
                          >
                            {file.fileName}
                          </Text>
                        </View>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {/* Visual Timeline Component */}
              <View style={{ marginTop: hp(1.5) }}>
                <TaskTimeline task={selectedTask} />
              </View>
            </View>
          )}

          {/* TAB 2: FOLLOW-UP CONTROL CENTER */}
          {modalTab === "followup" && (
            <View style={{ flex: 1 }}>
              <FollowUpControlCenter taskId={selectedTask.id} />
            </View>
          )}

          {/* TAB 3: EXPENSES PANEL */}
          {modalTab === "expenses" && (
            <View style={{ flex: 1 }}>
              <TaskExpensesPanel taskId={selectedTask.id} />
            </View>
          )}

          {/* TAB 4: DISCUSSION STREAM */}
          {modalTab === "discussion" && (
            <View style={styles.leftNarrativeFlowStreamColumnBlock}>
              <Text style={styles.sectionSmallCapHeadingLabel}>
                Activity Feed & Live Discussions ({comments.length})
              </Text>

              {othersTyping.length > 0 && (
                <Text style={{ color: "#58a6ff", fontSize: 11, fontStyle: "italic" }}>
                  {othersTyping.join(", ")} {othersTyping.length === 1 ? "is" : "are"} typing...
                </Text>
              )}

              {comments.length === 0 ? (
                <Text style={styles.emptyStateItalicTextCaptionString}>
                  No comments posted yet. Start the conversation below.
                </Text>
              ) : (
                comments.map((c) => (
                  <View key={c.id} style={styles.commentActivityFeedListItemBubbleCard}>
                    <View style={styles.commentActivityFeedListItemBubbleCardHeaderFlexRow}>
                      <Text style={styles.commentActivityFeedListItemBubbleCardAuthorNameString}>
                        {c.authorUsername}
                      </Text>
                      <Text style={styles.commentActivityFeedListItemBubbleCardTimestampString}>
                        {c.createdAt ? new Date(c.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Just now"}
                      </Text>
                    </View>
                    <Text style={styles.commentActivityFeedListItemBubbleCardBodyMarkdownMessageString}>
                      {c.message}
                    </Text>
                  </View>
                ))
              )}
            </View>
          )}

          {/* RIGHT SIDEBAR: PROPERTIES ENGINE */}
          <View style={styles.rightStructuralParameterMetadataColumnPropertyBoardStrip}>
            <Text style={styles.sectionSmallCapHeadingLabel}>Properties Engine</Text>

            {/* Assignees Selector */}
            <View style={styles.propertyInspectorIndivCardItemBlockNode}>
              <Text style={styles.propertyInspectorIndivCardItemBlockNodeLabel}>Assignees Stack</Text>
              <Text style={styles.propertyInspectorIndivCardItemBlockNodeValue}>
                {selectedTask.assignees?.length > 0 ? selectedTask.assignees.join(", ") : "Unassigned"}
              </Text>
            </View>

            {/* Priority Switcher */}
            <View style={styles.propertyInspectorIndivCardItemBlockNode}>
              <Text style={styles.propertyInspectorIndivCardItemBlockNodeLabel}>Priority Class</Text>
              <View style={{ flexDirection: "row", gap: wp(1), marginTop: hp(0.5) }}>
                {(["low", "medium", "high"] as Task["priority"][]).map((pr) => (
                  <TouchableOpacity
                    key={pr}
                    style={[
                      styles.condensedInlineStatusBadgePill,
                      selectedTask.priority === pr && {
                        backgroundColor: "rgba(249,115,22,0.2)",
                        borderColor: "#f97316",
                        borderWidth: 1,
                      },
                    ]}
                    onPress={() => updateTaskPriorityMutation.mutate({ taskId: selectedTask.id, priority: pr })}
                  >
                    <Text
                      style={[
                        styles.condensedInlineStatusBadgePillText,
                        selectedTask.priority === pr && { color: "#f97316" },
                      ]}
                    >
                      {pr.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Status Switcher */}
            <View style={styles.propertyInspectorIndivCardItemBlockNode}>
              <Text style={styles.propertyInspectorIndivCardItemBlockNodeLabel}>Workflow Status State</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: wp(1), marginTop: hp(0.5) }}>
                {(["pending", "in-progress", "completed", "overdue"] as Task["status"][]).map((st) => (
                  <TouchableOpacity
                    key={st}
                    style={[
                      styles.condensedInlineStatusBadgePill,
                      selectedTask.status === st && {
                        backgroundColor: "rgba(35,134,54,0.2)",
                        borderColor: "#238636",
                        borderWidth: 1,
                      },
                    ]}
                    onPress={() => updateTaskStatusMutation.mutate({ taskId: selectedTask.id, status: st })}
                  >
                    <Text
                      style={[
                        styles.condensedInlineStatusBadgePillText,
                        selectedTask.status === st && { color: "#56d364" },
                      ]}
                    >
                      {st.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Print Asset Action Button */}
            <TouchableOpacity
              style={styles.utilityFrameworkLauncherActionRowBtn}
              onPress={() =>
                Alert.alert("Generating PDF Matrix", `Exporting task ledger summary for #${selectedTask.id.substring(0, 6)}...`)
              }
            >
              <Printer size={12} color="#c9d1d9" />
              <Text style={styles.utilityFrameworkLauncherActionRowBtnText}>Print Asset PDF Documentation</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    )}

  {/* Thumbnail Preview Grid for Comment Attachments */}
{/* Thumbnail Preview Grid for Comment Attachments */}
{commentAttachments.length > 0 && (
  <View style={{ backgroundColor: colors.bgSecondary, paddingHorizontal: wp(3), paddingTop: hp(1), borderTopWidth: 1, borderTopColor: colors.border }}>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: wp(2) }}>
      {commentAttachments.map((file, i) => {
        const fileUri = getDisplayImageUrl(file.url, jwtToken);
        return (
          <View key={i} style={styles.previewThumbnailWrapper}>
            {file.mimeType?.startsWith("image/") || fileUri ? (
              <Image source={{ uri: fileUri! }} style={styles.previewThumbnailImage} />
            ) : (
              <View style={styles.previewThumbnailFallback}>
                <FileText size={16} color="#8b949e" />
                <Text style={styles.previewThumbnailFallbackText} numberOfLines={1}>{file.fileName}</Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.previewRemoveBadgeButton}
              onPress={() => setCommentAttachments((prev) => prev.filter((_, idx) => idx !== i))}
            >
              <X size={10} color="#fff" />
            </TouchableOpacity>
          </View>
        );
      })}
    </ScrollView>
  </View>
)}

{/* Sticky Discussion Dock (Bottom Bar) */}
<View style={styles.stickyDiscussionAccessoryComposerInputDockBar}>
  {/* Video Recorder Trigger */}
  <TouchableOpacity
    style={styles.mediaCaptureTriggerTouchNodeBtn}
    onPress={() => setIsVideoRecorderOpen(true)}
  >
    <Video size={16} color="#8b5cf6" />
  </TouchableOpacity>

  {/* File / Image Attachment Trigger */}
  <TouchableOpacity
    style={styles.mediaCaptureTriggerTouchNodeBtn}
    onPress={async () => {
      try {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permissionResult.granted) {
          Alert.alert("Permission Required", "System photo library access authorization is required.");
          return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsMultipleSelection: true,
          quality: 0.8,
          base64: true,
        });

        if (result.canceled || !result.assets) return;

        const processedFiles: FileObject[] = result.assets.map((asset) => {
          const fileStamp = Date.now().toString().substring(6);
          const inferredExt = asset.uri.split(".").pop() || "jpg";
          return {
            fileName: asset.fileName || `Attachment_${fileStamp}.${inferredExt}`,
            url: asset.base64 ? `data:${asset.mimeType || "image/jpeg"};base64,${asset.base64}` : asset.uri,
            mimeType: asset.mimeType || "image/jpeg",
            size: asset.fileSize || 1024 * 100,
          };
        });

        setCommentAttachments((prev) => [...prev, ...processedFiles]);
      } catch (err) {
        Alert.alert("System Exception", "An error occurred selecting files.");
      }
    }}
  >
    <Paperclip size={16} color="#58a6ff" />
  </TouchableOpacity>

  <TextInput
    style={styles.composerDockInputFieldElement}
    placeholder="Write a comment reply response..."
    placeholderTextColor="#8b949e"
    value={commentDraft}
    onChangeText={emitTypingStatus}
  />
  <TouchableOpacity
    style={styles.composerDockSendTouchActionNodeBtn}
    onPress={handlePostComment}
  >
    <Send size={14} color="#fff" />
  </TouchableOpacity>
</View>
  </KeyboardAvoidingView>
</Modal>

      {/* CREATE PROJECT MODAL */}
      <Modal visible={isCreateProjectOpen} animationType="slide" presentationStyle="formSheet">
        <View style={[styles.fullscreenModalViewFrameContainer, { backgroundColor: "#161b22" }]}>
          <View style={styles.modalNavigationHeaderTopbarNavBar}>
            <View style={{ flex: 1 }}>
              <Text style={styles.webHeadlineHeading}>Create Project</Text>
              <Text style={styles.webSubheadingDescription}>Build a new project container boundary.</Text>
            </View>
            <TouchableOpacity onPress={() => setIsCreateProjectOpen(false)}><X size={18} color="#8b949e" /></TouchableOpacity>
          </View>
          
          <ScrollView 
            style={{ padding: wp(4) }} 
            contentContainerStyle={[{ gap: hp(2), paddingBottom: hp(7) }, isTablet && { maxWidth: 640, alignSelf: "center", width: "100%" }]}
          >
            <View>
              <Text style={dialogStyles.fieldInputLabel}>Project Name *</Text>
              <TextInput 
                style={dialogStyles.modalTextInput} 
                value={newProjectName} 
                onChangeText={setNewProjectName} 
                placeholder="Enter project designation" 
                placeholderTextColor="#4b5563" 
              />
            </View>

            <View>
              <Text style={dialogStyles.fieldInputLabel}>Project Description</Text>
              <TextInput 
                style={[dialogStyles.modalTextInput, { height: hp(10), textAlignVertical: "top", paddingTop: hp(1) }]} 
                multiline 
                value={newProjectDesc} 
                onChangeText={setNewProjectDesc} 
                placeholder="Enter core scope description attributes..." 
                placeholderTextColor="#4b5563" 
              />
            </View>

            <View>
              <Text style={dialogStyles.fieldInputLabel}>Project Logo</Text>
              <View style={styles.webMediaAttachmentRowStrip}>
                <TouchableOpacity style={styles.webUploadMediaButton} onPress={() => launchNativeImagePickerPipeline("project-logo")}>
                  <Plus size={14} color="#58a6ff" />
                  <Text style={styles.webUploadMediaButtonText}>Select Logo</Text>
                </TouchableOpacity>
                <View style={styles.webStatusBadgeIndicatorLabel}>
                  {newProjectLogo ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: wp(2.5) }}>
                      <Image source={{ uri: newProjectLogo.url }} style={{ width: wp(11), height: wp(11), borderRadius: wp(1.5), backgroundColor: '#0d1117' }} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: "#fff", fontSize: 12 }} numberOfLines={1}>{newProjectLogo.fileName}</Text>
                        <TouchableOpacity onPress={() => setNewProjectLogo(null)} style={{ marginTop: hp(0.3) }}>
                          <Text style={{ color: "#ff7b72", fontSize: 11, fontWeight: "bold" }}>Remove Option</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <Text style={{ color: "#8b949e", fontSize: 12 }}>No logo configured</Text>
                  )}
                </View>
              </View>
            </View>

            <View>
              <Text style={dialogStyles.fieldInputLabel}>Project Attachments</Text>
              <View style={styles.webMediaAttachmentRowStrip}>
                <TouchableOpacity style={styles.webUploadMediaButton} onPress={() => launchNativeImagePickerPipeline("project-attachments")}>
                  <Paperclip size={12} color="#58a6ff" style={{ marginRight: wp(1) }} />
                  <Text style={styles.webUploadMediaButtonText}>+ Add Files/Images</Text>
                </TouchableOpacity>
              </View>
              
              {newProjectAttachments.length > 0 && (
                <View style={styles.previewGridContainer}>
                  {newProjectAttachments.map((file, i) => (
                    <View key={i} style={styles.previewThumbnailWrapper}>
                      {file.mimeType?.startsWith("image/") ? (
                        <Image source={{ uri: file.url }} style={styles.previewThumbnailImage} />
                      ) : (
                        <View style={styles.previewThumbnailFallback}>
                          <FileText size={20} color="#8b949e" />
                          <Text style={styles.previewThumbnailFallbackText} numberOfLines={1}>{file.fileName}</Text>
                        </View>
                      )}
                      <TouchableOpacity 
                        style={styles.previewRemoveBadgeButton} 
                        onPress={() => setNewProjectAttachments(p => p.filter((_, idx) => idx !== i))}
                      >
                        <X size={10} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View>
              <Text style={dialogStyles.fieldInputLabel}>Project Assignees Pool</Text>
              <TouchableOpacity style={dialogStyles.dropdownTriggerPill} onPress={() => { setAssigneePickerTarget("project"); setShowAssigneePickerOverlay(true); }}>
                <Text style={{ color: newProjectAssignees.length > 0 ? "#fff" : "#4b5563", fontSize: 13 }}>
                  {newProjectAssignees.length > 0 ? `${newProjectAssignees.length} operators chosen` : "Select workspace assignees"}
                </Text>
                <ChevronsUpDown size={14} color="#8b949e" />
              </TouchableOpacity>
              {newProjectAssignees.length > 0 && (
                <Text style={{ color: "#8b949e", fontSize: 11, marginTop: hp(0.5) }}>
                  Selected: {newProjectAssignees.join(", ")}
                </Text>
              )}
            </View>

            <View style={styles.webSubtaskContainerPanelFrame}>
              <Text style={[dialogStyles.fieldInputLabel, { color: "#fff" }]}>Configure Task</Text>
              
              <TouchableOpacity 
                style={[styles.webUploadMediaButton, { backgroundColor: "#1f6feb", borderColor: "#1f6feb", marginVertical: hp(0.8) }]} 
                onPress={() => setIsInnerTaskBuilderOpen(true)}
              >
                <Plus size={14} color="#fff" />
                <Text style={[styles.webUploadMediaButtonText, { color: "#fff" }]}>Add Task</Text>
              </TouchableOpacity>

              {newProjectTasks.length === 0 ? (
                <View style={styles.webAlertWarningCalloutBox}>
                  <AlertTriangle size={14} color="#fbbf24" style={{ marginTop: hp(0.3) }} />
                  <Text style={styles.webAlertWarningCalloutBoxTextString}>
                    No subtasks mapped yet. At least one operational task entry is mandatory.
                  </Text>
                </View>
              ) : (
                <View style={{ gap: hp(0.8), marginTop: hp(0.8) }}>
                  {newProjectTasks.map((t, idx) => (
                    <View key={idx} style={styles.webInlineTaskDisplayBadgeRow}>
                      <Text style={{ color: "#fff", fontSize: 12, flex: 1 }} numberOfLines={1}>{idx + 1}. {t.title} ({t.priority?.toUpperCase()} - {t.location || "No Loc"})</Text>
                      <TouchableOpacity onPress={() => setNewProjectTasks(p => p.filter((_, i) => i !== idx))}>
                        <X size={12} color="#ff7b72" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.webActionBlockDockControlsRow}>
              <TouchableOpacity style={styles.webCancelActionTouchNode} onPress={() => setIsCreateProjectOpen(false)}>
                <Text style={{ color: "#c9d1d9", fontSize: 13 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.webSubmitActionTouchNode, newProjectTasks.length === 0 && { opacity: 0.5 }]} 
                disabled={newProjectTasks.length === 0}
                onPress={() => {
                  if (!newProjectName.trim()) {
                    Alert.alert("Input Error", "Project classification label string is mandatory.");
                    return;
                  }
                  createProjectMutation.mutate({
                    name: newProjectName.trim(),
                    description: newProjectDesc.trim(),
                    assignees: newProjectAssignees,
                    tasks: newProjectTasks,
                    logo: newProjectLogo?.url || undefined
                  });
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 13 }}>Create Project Matrix</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* CREATE STANDALONE TASK MODAL */}
      <Modal visible={isCreateTaskOpen} animationType="slide" presentationStyle="formSheet">
        <View style={[styles.fullscreenModalViewFrameContainer, { backgroundColor: "#161b22" }]}>
          <View style={styles.modalNavigationHeaderTopbarNavBar}>
            <View style={{ flex: 1 }}>
              <Text style={styles.webHeadlineHeading}>Create Standalone Task</Text>
              <Text style={styles.webSubheadingDescription}>Configure standard properties fields maps.</Text>
            </View>
            <TouchableOpacity onPress={() => setIsCreateTaskOpen(false)}><X size={18} color="#8b949e" /></TouchableOpacity>
          </View>
          
          <ScrollView 
            style={{ padding: wp(4) }} 
            contentContainerStyle={[{ gap: hp(1.8), paddingBottom: hp(7) }, isTablet && { maxWidth: 640, alignSelf: "center", width: "100%" }]}
          >
            <View>
              <Text style={dialogStyles.fieldInputLabel}>Task Title *</Text>
              <TextInput style={dialogStyles.modalTextInput} value={newTaskTitle} onChangeText={setNewTaskTitle} placeholder="Enter parameter title" placeholderTextColor="#4b5563" />
            </View>

            <View>
              <Text style={dialogStyles.fieldInputLabel}>Task Description *</Text>
              <TextInput style={[dialogStyles.modalTextInput, { height: hp(8.5), textAlignVertical: "top", paddingTop: hp(0.8) }]} multiline value={newTaskDesc} onChangeText={setNewTaskDesc} placeholder="Enter clear statement parameters..." placeholderTextColor="#4b5563" />
            </View>

            <View>
              <Text style={dialogStyles.fieldInputLabel}>Location Field Context</Text>
              <TextInput style={dialogStyles.modalTextInput} value={newTaskLocation} onChangeText={setNewTaskLocation} placeholder="e.g. Main Laboratory Lab-B" placeholderTextColor="#4b5563" />
            </View>

            <View style={{ flexDirection: "row", gap: wp(2) }}>
              <View style={{ flex: 1 }}>
                <Text style={dialogStyles.fieldInputLabel}>Due Date Matrix</Text>
                <TextInput style={dialogStyles.modalTextInput} value={newTaskDueDate} onChangeText={setNewTaskDueDate} placeholder="YYYY-MM-DD" placeholderTextColor="#4b5563" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={dialogStyles.fieldInputLabel}>Due Time Matrix</Text>
                <TextInput style={dialogStyles.modalTextInput} value={newTaskDueTime} onChangeText={setNewTaskDueTime} placeholder="HH:MM" placeholderTextColor="#4b5563" />
              </View>
            </View>

            <View>
              <Text style={dialogStyles.fieldInputLabel}>Operators Allocation Matrix</Text>
              <TouchableOpacity style={dialogStyles.dropdownTriggerPill} onPress={() => { setAssigneePickerTarget("standalone-task"); setShowAssigneePickerOverlay(true); }}>
                <Text style={{ color: "#fff", fontSize: 13 }}>
                  {newTaskAssignees.length > 0 ? `${newTaskAssignees.length} operators chosen` : "Select assignees"}
                </Text>
                <ChevronsUpDown size={14} color="#8b949e" />
              </TouchableOpacity>
            </View>

            <View style={{ position: "relative", zIndex: 450 }}>
              <Text style={dialogStyles.fieldInputLabel}>Priority</Text>
              <TouchableOpacity style={dialogStyles.dropdownTriggerPill} onPress={() => setShowTaskPriorityDropdown(!showTaskPriorityDropdown)}>
                <Text style={{ color: "#fff", fontSize: 13 }}>{newTaskPriority.toUpperCase()}</Text>
                <ChevronDown size={14} color="#8b949e" />
              </TouchableOpacity>
              {showTaskPriorityDropdown && (
                <View style={dialogStyles.dropdownMenuOptionsWrapperFrame}>
                  {(["high", "medium", "low"] as Task["priority"][]).map((pr) => (
                    <TouchableOpacity key={pr} style={dialogStyles.dropdownMenuOptionsItemRow} onPress={() => { setNewTaskPriority(pr); setShowTaskPriorityDropdown(false); }}>
                      <Text style={{ color: "#fff", fontSize: 13 }}>{pr.toUpperCase()}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={{ position: "relative", zIndex: 400 }}>
              <Text style={dialogStyles.fieldInputLabel}>Status</Text>
              <TouchableOpacity style={dialogStyles.dropdownTriggerPill} onPress={() => setShowTaskStatusDropdown(!showTaskStatusDropdown)}>
                <Text style={{ color: "#fff", fontSize: 13 }}>{newTaskStatus.toUpperCase()}</Text>
                <ChevronDown size={14} color="#8b949e" />
              </TouchableOpacity>
              {showTaskStatusDropdown && (
                <View style={dialogStyles.dropdownMenuOptionsWrapperFrame}>
                  {(["pending", "in-progress", "completed", "overdue"] as Task["status"][]).map((st) => (
                    <TouchableOpacity key={st} style={dialogStyles.dropdownMenuOptionsItemRow} onPress={() => { setNewTaskStatus(st); setShowTaskStatusDropdown(false); }}>
                      <Text style={{ color: "#fff", fontSize: 13 }}>{st.toUpperCase()}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View>
              <Text style={dialogStyles.fieldInputLabel}>Task Attachments Matrix</Text>
              <View style={styles.webMediaAttachmentRowStrip}>
                <TouchableOpacity style={styles.webUploadMediaButton} onPress={() => launchNativeImagePickerPipeline("task-attachments")}>
                  <Paperclip size={12} color="#58a6ff" style={{ marginRight: wp(1) }} />
                  <Text style={styles.webUploadMediaButtonText}>+ Add Files/Images</Text>
                </TouchableOpacity>
              </View>
              
              {newTaskAttachments.length > 0 && (
                <View style={styles.previewGridContainer}>
                  {newTaskAttachments.map((file, i) => (
                    <View key={i} style={styles.previewThumbnailWrapper}>
                      {file.mimeType?.startsWith("image/") ? (
                        <Image source={{ uri: file.url }} style={styles.previewThumbnailImage} />
                      ) : (
                        <View style={styles.previewThumbnailFallback}>
                          <FileText size={20} color="#8b949e" />
                          <Text style={styles.previewThumbnailFallbackText} numberOfLines={1}>{file.fileName}</Text>
                        </View>
                      )}
                      <TouchableOpacity 
                        style={styles.previewRemoveBadgeButton} 
                        onPress={() => setNewTaskAttachments(p => p.filter((_, idx) => idx !== i))}
                      >
                        <X size={10} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.webActionBlockDockControlsRow}>
              <TouchableOpacity style={styles.webCancelActionTouchNode} onPress={() => setIsCreateTaskOpen(false)}>
                <Text style={{ color: "#c9d1d9", fontSize: 13 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.webSubmitActionTouchNode} 
                onPress={() => {
                  if (!newTaskTitle.trim() || !newTaskDesc.trim()) {
                    Alert.alert("Input Error", "Fields marked with asterisks are absolute prerequisites.");
                    return;
                  }
                  createTaskMutation.mutate({
                    title: newTaskTitle.trim(),
                    description: newTaskDesc.trim(),
                    priority: newTaskPriority,
                    status: newTaskStatus,
                    location: newTaskLocation.trim() || undefined,
                    dueDate: newTaskDueDate.trim() || new Date().toISOString().split("T")[0],
                    dueTime: newTaskDueTime.trim() || undefined,
                    assignees: newTaskAssignees,
                    attachments: newTaskAttachments,
                    projectId: selectedProject?.id || undefined
                  });
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 13 }}>Create Task</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* PROJECT INNER SUBTASK MODAL */}
      <Modal visible={isInnerTaskBuilderOpen} animationType="slide" presentationStyle="formSheet">
        <View style={[styles.fullscreenModalViewFrameContainer, { backgroundColor: "#161b22" }]}>
          <View style={styles.modalNavigationHeaderTopbarNavBar}>
            <View style={{ flex: 1 }}>
              <Text style={styles.webHeadlineHeading}>Configure Project Task</Text>
              <Text style={styles.webSubheadingDescription}>Build full properties matrices inside project scope.</Text>
            </View>
            <TouchableOpacity onPress={() => setIsInnerTaskBuilderOpen(false)}><X size={18} color="#8b949e" /></TouchableOpacity>
          </View>
          
          <ScrollView 
            style={{ padding: wp(4) }} 
            contentContainerStyle={[{ gap: hp(1.8), paddingBottom: hp(5) }, isTablet && { maxWidth: 640, alignSelf: "center", width: "100%" }]}
          >
            <View>
              <Text style={dialogStyles.fieldInputLabel}>Task Title *</Text>
              <TextInput style={dialogStyles.modalTextInput} value={subtaskTitle} onChangeText={setSubtaskTitle} placeholder="e.g. Assemble structural arrays frame" placeholderTextColor="#4b5563" />
            </View>

            <View>
              <Text style={dialogStyles.fieldInputLabel}>Task Description *</Text>
              <TextInput style={[dialogStyles.modalTextInput, { height: hp(8.5), textAlignVertical: "top", paddingTop: hp(0.8) }]} multiline value={subtaskDesc} onChangeText={setSubtaskDesc} placeholder="Enter operational guidelines..." placeholderTextColor="#4b5563" />
            </View>

            <View>
              <Text style={dialogStyles.fieldInputLabel}>Location Field</Text>
              <TextInput style={dialogStyles.modalTextInput} value={subtaskLocation} onChangeText={setSubtaskLocation} placeholder="e.g. External Field Matrix Site A" placeholderTextColor="#4b5563" />
            </View>

            <View style={{ flexDirection: "row", gap: wp(2) }}>
              <View style={{ flex: 1 }}>
                <Text style={dialogStyles.fieldInputLabel}>Due Date Matrix</Text>
                <TextInput style={dialogStyles.modalTextInput} value={subtaskDueDate} onChangeText={setSubtaskDueDate} placeholder="YYYY-MM-DD" placeholderTextColor="#4b5563" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={dialogStyles.fieldInputLabel}>Due Time Matrix</Text>
                <TextInput style={dialogStyles.modalTextInput} value={subtaskDueTime} onChangeText={setSubtaskDueTime} placeholder="HH:MM" placeholderTextColor="#4b5563" />
              </View>
            </View>

            <View>
              <Text style={dialogStyles.fieldInputLabel}>Assignees Directory Pool</Text>
              <TouchableOpacity style={dialogStyles.dropdownTriggerPill} onPress={() => { setAssigneePickerTarget("project-subtask"); setShowAssigneePickerOverlay(true); }}>
                <Text style={{ color: "#fff", fontSize: 13 }}>
                  {subtaskAssignees.length > 0 ? `${subtaskAssignees.length} operators chosen` : "Select assignees"}
                </Text>
                <ChevronsUpDown size={14} color="#8b949e" />
              </TouchableOpacity>
              {subtaskAssignees.length > 0 && <Text style={{ color: "#8b949e", fontSize: 11, marginTop: hp(0.3) }}>{subtaskAssignees.join(", ")}</Text>}
            </View>

            <View style={{ position: "relative", zIndex: 600 }}>
              <Text style={dialogStyles.fieldInputLabel}>Priority Rank</Text>
              <TouchableOpacity style={dialogStyles.dropdownTriggerPill} onPress={() => setShowSubtaskPriorityDropdown(!showSubtaskPriorityDropdown)}>
                <Text style={{ color: "#fff", fontSize: 13 }}>{subtaskPriority.toUpperCase()}</Text>
                <ChevronDown size={14} color="#8b949e" />
              </TouchableOpacity>
              {showSubtaskPriorityDropdown && (
                <View style={dialogStyles.dropdownMenuOptionsWrapperFrame}>
                  {(["high", "medium", "low"] as Task["priority"][]).map((pr) => (
                    <TouchableOpacity key={pr} style={dialogStyles.dropdownMenuOptionsItemRow} onPress={() => { setSubtaskPriority(pr); setShowSubtaskPriorityDropdown(false); }}>
                      <Text style={{ color: "#fff", fontSize: 13 }}>{pr.toUpperCase()}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={{ position: "relative", zIndex: 550 }}>
              <Text style={dialogStyles.fieldInputLabel}>Workflow Status State</Text>
              <TouchableOpacity style={dialogStyles.dropdownTriggerPill} onPress={() => setShowSubtaskStatusDropdown(!showSubtaskStatusDropdown)}>
                <Text style={{ color: "#fff", fontSize: 13 }}>{subtaskStatus.toUpperCase()}</Text>
                <ChevronDown size={14} color="#8b949e" />
              </TouchableOpacity>
              {showSubtaskStatusDropdown && (
                <View style={dialogStyles.dropdownMenuOptionsWrapperFrame}>
                  {(["pending", "in-progress", "completed", "overdue"] as Task["status"][]).map((st) => (
                    <TouchableOpacity key={st} style={dialogStyles.dropdownMenuOptionsItemRow} onPress={() => { setSubtaskStatus(st); setShowSubtaskStatusDropdown(false); }}>
                      <Text style={{ color: "#fff", fontSize: 13 }}>{st.toUpperCase()}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View>
              <Text style={dialogStyles.fieldInputLabel}>Subtask Files / Images</Text>
              <View style={styles.webMediaAttachmentRowStrip}>
                <TouchableOpacity style={styles.webUploadMediaButton} onPress={() => launchNativeImagePickerPipeline("subtask-attachments")}>
                  <Paperclip size={12} color="#58a6ff" style={{ marginRight: wp(1) }} />
                  <Text style={styles.webUploadMediaButtonText}>+ Add Files/Images</Text>
                </TouchableOpacity>
              </View>
              
              {subtaskAttachments.length > 0 && (
                <View style={styles.previewGridContainer}>
                  {subtaskAttachments.map((file, i) => (
                    <View key={i} style={styles.previewThumbnailWrapper}>
                      {file.mimeType?.startsWith("image/") ? (
                        <Image source={{ uri: file.url }} style={styles.previewThumbnailImage} />
                      ) : (
                        <View style={styles.previewThumbnailFallback}>
                          <FileText size={20} color="#8b949e" />
                          <Text style={styles.previewThumbnailFallbackText} numberOfLines={1}>{file.fileName}</Text>
                        </View>
                      )}
                      <TouchableOpacity 
                        style={styles.previewRemoveBadgeButton} 
                        onPress={() => setSubtaskAttachments(p => p.filter((_, idx) => idx !== i))}
                      >
                        <X size={10} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <TouchableOpacity style={[styles.inspectorTaskMarkCompleteActionExecuteBtn, { marginTop: hp(1.5) }]} onPress={commitSubtaskToProjectBuilder}>
              <Text style={{ color: "#fff", fontWeight: "bold" }}>Save to Project Structure</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* ASSIGNEES PICKER MODAL */}
      <Modal visible={showAssigneePickerOverlay} transparent animationType="fade">
        <View style={dialogStyles.modalBlurOverlay}>
          <View style={[dialogStyles.modalDialogContentBox, { height: hp(45) }]}>
            <View style={dialogStyles.modalHeaderContainerRow}>
              <Text style={dialogStyles.modalHeaderHeading}>Select Assignees Matrix</Text>
              <TouchableOpacity onPress={() => setShowAssigneePickerOverlay(false)}><X size={16} color="#8b949e" /></TouchableOpacity>
            </View>
            <ScrollView>
              {resolvedWorkspaceAssignees.map((name) => {
                let checked = false;
                if (assigneePickerTarget === "project") checked = newProjectAssignees.includes(name);
                if (assigneePickerTarget === "standalone-task") checked = newTaskAssignees.includes(name);
                if (assigneePickerTarget === "project-subtask") checked = subtaskAssignees.includes(name);

                return (
                  <TouchableOpacity 
                    key={name} 
                    style={[dialogStyles.dropdownMenuOptionsItemRow, { flexDirection: "row", justifyContent: "space-between" }]}
                    onPress={() => handleToggleAssigneeSelection(name)}
                  >
                    <Text style={{ color: "#fff", fontSize: 13 }}>{name}</Text>
                    {checked && <Check size={14} color="#58a6ff" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={[styles.inspectorTaskMarkCompleteActionExecuteBtn, { marginTop: hp(1.2) }]} onPress={() => setShowAssigneePickerOverlay(false)}>
              <Text style={{ color: "#fff", fontWeight: "bold" }}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={isCreateExpenseOpen} animationType="slide">
        <View style={styles.fullscreenModalViewFrameContainer}>
          <View style={styles.modalNavigationHeaderTopbarNavBar}>
            <Text style={styles.modalNavigationHeaderTopbarNavBarTitleHeading}>Create Project Expense Matrix</Text>
            <TouchableOpacity onPress={() => setIsCreateExpenseOpen(false)}><X size={16} color="#fff" /></TouchableOpacity>
          </View>
          {selectedProject && <CreateExpenseSheet projectId={selectedProject.id} onClose={() => setIsCreateExpenseOpen(false)} />}
        </View>
      </Modal>

     <Modal visible={isExpenseListOpen} animationType="slide">
  <View style={styles.fullscreenModalViewFrameContainer}>
    <View style={styles.modalNavigationHeaderTopbarNavBar}>
      <Text style={styles.modalNavigationHeaderTopbarNavBarTitleHeading}>
        Project Financial Ledgers
      </Text>
      <TouchableOpacity onPress={() => setIsExpenseListOpen(false)}>
        <X size={18} color="#fff" />
      </TouchableOpacity>
    </View>
    {selectedProject ? (
      <ExpenseSheetList projectId={selectedProject.id} />
    ) : null}
  </View>
</Modal>

     <VideoRecorderModal
  isOpen={isVideoRecorderOpen}
  onClose={() => setIsVideoRecorderOpen(false)}
  onSave={(file) => {
    setCommentAttachments((prev) => [
      ...prev,
      {
        fileName: file.name || "Recorded_Video.mp4",
        url: file.uri,
        mimeType: "video/mp4",
        size: file.size || 1024 * 500,
      },
    ]);
  }}
/>
    </KeyboardAvoidingView>
  );
}