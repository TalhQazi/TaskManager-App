import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  Dimensions,
  Platform,
} from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Shield,
  RefreshCw,
  Plus,
  TrendingUp,
  Search,
  Calendar,
  ChevronRight,
  ChevronDown,
  X,
  Lock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  History
} from "lucide-react-native";
import { s, wp, hp, fs } from "@/util/styles";
import { isDarkTheme } from "@/constants/design/presets";

interface Website {
  _id: string;
  siteName: string;
  url: string;
  websiteType: "active" | "future";
  platform?: string;
  hostingProvider?: string;
  status: "Live" | "Maintenance" | "Development" | "Offline";
  owner?: string;
  notes?: string;
  launchDate?: string;
  businessUnit: string;
  environment: string;
  leadDeveloper?: string;
  complianceTemplate?: string;
  readinessScore: number;
  overrideReason?: string;
  createdAt: string;
  updatedAt: string;
}

interface ChecklistItem {
  _id: string;
  websiteId: string;
  category: string;
  title: string;
  description: string;
  requiresEvidence: boolean;
  status: "pending" | "in-progress" | "blocked" | "completed";
  notes?: string;
  evidenceUrl?: string;
  evidenceFile?: string;
  blockedReason?: string;
  completedBy?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface ChecklistHistory {
  _id: string;
  websiteId: string;
  itemId?: string;
  action: string;
  previousState?: string;
  newState?: string;
  notes?: string;
  userId: string;
  username: string;
  ipAddress?: string;
  deviceInfo?: string;
  createdAt: string;
}

interface ChecklistTemplate {
  _id: string;
  name: string;
  key: string;
  categories: {
    name: string;
    items: {
      title: string;
      description: string;
      requiresEvidence: boolean;
    }[];
  }[];
}

interface LeaderboardItem {
  username: string;
  count: number;
}

interface ComplianceReport {
  totalWebsites: number;
  avgScore: number;
  statusBreakdown: {
    red: number;
    yellow: number;
    green: number;
  };
  buPerformance: {
    name: string;
    avgScore: number;
    count: number;
  }[];
}

function buildColors(uiTheme: any, isDark: boolean, isMetallic: boolean) {
  return {
    background:    uiTheme.panelColors?.dashboardBackground     || (isMetallic ? "#111315" : isDark ? "#09090b" : "#F8FAFC"),
    cardBg:        uiTheme.panelColors?.dashboardCardBackground || (isMetallic ? "#2b2c2d" : isDark ? "#18181b" : "#FFFFFF"),
    text:          uiTheme.panelColors?.dashboardTextColor      || (isMetallic ? "#ffffff" : isDark ? "#F4F4F5" : "#0F172A"),
    textSecondary: isDark || isMetallic ? "#A1A1AA" : "#475569",
    textMuted:     isDark || isMetallic ? "#71717A" : "#64748B",
    border:        isMetallic ? "rgba(255,210,122,0.2)" : (isDark ? "#27272A" : "#E2E8F0"),
    borderLight:   isDark || isMetallic ? "rgba(255,255,255,0.05)" : "#F1F5F9",
    inputBg:       isDark || isMetallic ? "#1c1c1e" : "#FFFFFF",
    primary:       isMetallic ? "#ffd27a" : (uiTheme.customColors?.primary || (isDark ? "#3b82f6" : "#133767")),
    accent:        isMetallic ? "#ffd27a" : "#00C6FF",
    overlayBg:     "rgba(0, 0, 0, 0.5)",
    success:       "#22c55e",
    warning:       "#f59e0b",
    danger:        "#ef4444",
    dangerBg:      isDark || isMetallic ? "rgba(239, 68, 68, 0.15)" : "#fee2e2",
    dangerBorder:  isDark || isMetallic ? "rgba(239, 68, 68, 0.3)" : "#fca5a5",
    purple:        "#a855f7",
    purpleBg:      isDark || isMetallic ? "rgba(168, 85, 247, 0.15)" : "rgba(168, 85, 247, 0.1)",
    badgeText:     "#ffffff",
  };
}

function createStyles(colors: ReturnType<typeof buildColors>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    headerPadding: {
      padding: wp(4),
    },
    topBar: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      flexWrap: "wrap",
      gap: wp(2),
      marginBottom: hp(2),
    },
    mainTitle: {
      fontSize: fs(5),
      fontWeight: "900",
      letterSpacing: -0.5,
      color: colors.text,
    },
    actionRow: {
      flexDirection: "row",
      gap: wp(2),
    },
    btnOutline: {
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: "row",
      alignItems: "center",
      gap: wp(1),
      paddingHorizontal: wp(3),
      paddingVertical: hp(0.75),
      borderRadius: wp(1.5),
      backgroundColor: colors.cardBg,
    },
    btnOutlineText: {
      fontSize: fs(3),
      fontWeight: "600",
      color: colors.text,
    },
    btnPrimary: {
      flexDirection: "row",
      alignItems: "center",
      gap: wp(1),
      paddingHorizontal: wp(3),
      paddingVertical: hp(0.75),
      borderRadius: wp(1.5),
      backgroundColor: colors.primary,
    },
    btnPrimaryText: {
      fontSize: fs(3),
      fontWeight: "700",
    },
    statsScroll: {
      marginBottom: hp(2),
    },
    statCard: {
      width: wp(35),
      padding: wp(3),
      borderRadius: wp(2),
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.cardBg,
    },
    statLabel: {
      fontSize: fs(2.8),
      fontWeight: "600",
      color: colors.textSecondary,
    },
    statValue: {
      fontSize: fs(5.5),
      fontWeight: "900",
      marginVertical: hp(0.5),
      color: colors.primary,
    },
    statSub: {
      fontSize: fs(2.5),
      color: colors.textMuted,
    },
    textGreen: { color: colors.success, fontSize: fs(5.5), fontWeight: "900", marginVertical: hp(0.5) },
    textAmber: { color: colors.warning, fontSize: fs(5.5), fontWeight: "900", marginVertical: hp(0.5) },
    textRed: { color: colors.danger, fontSize: fs(5.5), fontWeight: "900", marginVertical: hp(0.5) },
    filterContainer: {
      padding: wp(3.5),
      borderRadius: wp(2.5),
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.cardBg,
      marginBottom: hp(2),
    },
    sectionTitle: {
      fontSize: fs(3.5),
      fontWeight: "bold",
      marginBottom: hp(1),
      color: colors.text,
    },
    searchWrapper: {
      position: "relative",
      justifyContent: "center",
    },
    searchIcon: {
      position: "absolute",
      left: wp(2.5),
      zIndex: 1,
    },
    inputField: {
      height: hp(4.8),
      borderWidth: 1,
      borderRadius: wp(1.5),
      paddingLeft: wp(8.5),
      paddingRight: wp(2.5),
      fontSize: fs(3.2),
      color: colors.text,
      borderColor: colors.border,
      backgroundColor: colors.inputBg,
    },
    dropdownTrigger: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: wp(1.5),
      paddingHorizontal: wp(2.5),
      paddingVertical: hp(0.75),
      minWidth: wp(28),
      backgroundColor: colors.inputBg,
    },
    dropdownTriggerText: {
      fontSize: fs(2.8),
      fontWeight: "500",
      marginRight: wp(1),
      color: colors.textMuted,
    },
    listHeaderTitle: {
      fontSize: fs(3.8),
      fontWeight: "800",
      marginTop: hp(0.5),
      color: colors.text,
    },
    siteCard: {
      marginHorizontal: wp(4),
      marginBottom: hp(1.5),
      borderRadius: wp(2.5),
      borderWidth: 1,
      borderColor: colors.border,
      padding: wp(3.5),
      backgroundColor: colors.cardBg,
    },
    siteHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: hp(1.2),
    },
    siteNameText: {
      fontSize: fs(3.8),
      fontWeight: "bold",
      color: colors.text,
    },
    siteUrlText: {
      fontSize: fs(3),
      marginTop: hp(0.25),
      color: colors.accent,
    },
    badge: {
      paddingHorizontal: wp(2),
      paddingVertical: hp(0.4),
      borderRadius: wp(3),
    },
    badgeText: {
      color: colors.badgeText,
      fontSize: fs(2.8),
      fontWeight: "bold",
    },
    detailsGrid: {
      flexDirection: "row",
      justifyContent: "space-between",
      padding: wp(2),
      borderRadius: wp(1.5),
      marginBottom: hp(1),
      backgroundColor: colors.borderLight,
    },
    detailLabel: {
      fontSize: fs(2.5),
      fontWeight: "500",
      color: colors.textMuted,
    },
    detailValue: {
      fontSize: fs(3),
      fontWeight: "600",
      marginTop: hp(0.1),
      color: colors.textMuted,
    },
    countdownRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: wp(1),
      marginBottom: hp(1),
    },
    countdownText: {
      fontSize: fs(2.8),
      fontWeight: "500",
      color: colors.text,
    },
    overrideIndicator: {
      flexDirection: "row",
      alignItems: "center",
      gap: wp(1),
      backgroundColor: colors.purpleBg,
      paddingHorizontal: wp(1.5),
      paddingVertical: hp(0.4),
      borderRadius: wp(1),
      marginBottom: hp(1),
      alignSelf: "flex-start",
    },
    overrideIndicatorText: {
      color: colors.purple,
      fontSize: fs(2.5),
      fontWeight: "600",
      maxWidth: wp(50),
    },
    viewChecklistBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: wp(1),
      paddingVertical: hp(1),
      borderRadius: wp(1.5),
      marginTop: hp(0.5),
      backgroundColor: colors.primary,
    },
    viewChecklistBtnText: {
      fontSize: fs(3),
      fontWeight: "700",
    },
    emptyView: {
      padding: hp(4),
      alignItems: "center",
    },
    footerContainer: {
      padding: wp(4),
      paddingBottom: hp(4),
    },
    leaderboardCard: {
      padding: wp(3.5),
      borderRadius: wp(2.5),
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.cardBg,
    },
    leaderboardRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: hp(1),
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    leaderboardRank: {
      width: wp(7),
      fontSize: fs(3),
      fontWeight: "900",
      color: colors.primary,
    },
    leaderboardName: {
      flex: 1,
      fontSize: fs(3.2),
      fontWeight: "600",
      color: colors.text,
    },
    leaderboardCount: {
      fontSize: fs(2.8),
      color: colors.textMuted,
    },
    modalContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      padding: wp(4),
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      fontSize: fs(4),
      fontWeight: "bold",
      color: colors.text,
    },
    modalSubtitle: {
      fontSize: fs(2.8),
      marginTop: hp(0.25),
      color: colors.textSecondary,
    },
    closeBtn: {
      padding: wp(1),
    },
    modalScrollBody: {
      padding: wp(4),
    },
    loaderCentering: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    adminOverrideTrigger: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: wp(1.5),
      borderWidth: 1,
      borderColor: colors.border,
      padding: wp(2),
      borderRadius: wp(1.5),
      marginBottom: hp(2),
      backgroundColor: colors.purpleBg,
    },
    adminOverrideTriggerText: {
      color: colors.purple,
      fontSize: fs(3),
      fontWeight: "600",
    },
    accordionBox: {
      borderRadius: wp(2),
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.cardBg,
      marginBottom: hp(1.2),
      overflow: "hidden",
    },
    accordionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: wp(3),
      backgroundColor: colors.borderLight,
    },
    accordionTitle: {
      fontSize: fs(3.2),
      fontWeight: "bold",
      color: colors.textMuted,
    },
    accordionBadgeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: wp(2),
    },
    miniBadge: {
      paddingHorizontal: wp(1.5),
      paddingVertical: hp(0.25),
      borderRadius: wp(1),
      backgroundColor: colors.background,
    },
    miniBadgeText: {
      fontSize: fs(2.5),
      fontWeight: "600",
      color: colors.textSecondary,
    },
    accordionContent: {
      padding: wp(2.5),
      gap: hp(1.2),
    },
    checkpointItem: {
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
      paddingBottom: hp(1.2),
      marginBottom: hp(0.5),
    },
    checkpointTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    checkpointStatusIndicator: {
      flexDirection: "row",
      alignItems: "center",
      gap: wp(1.5),
      flex: 1,
    },
    checkpointTitleText: {
      fontSize: fs(3.2),
      fontWeight: "600",
      color: colors.text,
    },
    evidenceLabelAlert: {
      color: colors.warning,
      fontSize: fs(2.2),
      fontWeight: "bold",
      backgroundColor: "rgba(245,158,11,0.1)",
      paddingHorizontal: wp(1),
      paddingVertical: hp(0.15),
      borderRadius: wp(0.8),
    },
    checkpointDescText: {
      fontSize: fs(2.8),
      marginTop: hp(0.5),
      paddingLeft: wp(5.5),
      color: colors.textSecondary,
    },
    notesBlock: {
      padding: wp(1.5),
      borderRadius: wp(1),
      marginTop: hp(0.75),
      marginLeft: wp(5.5),
      backgroundColor: colors.borderLight,
    },
    notesText: { fontSize: fs(2.8), color: colors.text },
    blockedBlock: {
      backgroundColor: colors.dangerBg,
      padding: wp(1.5),
      borderRadius: wp(1),
      marginTop: hp(0.75),
      marginLeft: wp(5.5),
    },
    blockedText: { color: colors.danger, fontSize: fs(2.8) },
    updateCheckpointTriggerRow: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-end",
      gap: wp(0.5),
      marginTop: hp(1),
    },
    editCheckpointForm: {
      padding: wp(2.5),
      borderRadius: wp(1.5),
      marginTop: hp(1),
      backgroundColor: colors.borderLight,
    },
    formSectionLabel: {
      fontSize: fs(2.8),
      fontWeight: "600",
      marginBottom: hp(0.5),
      color: colors.textSecondary,
    },
    uploadSimulatedBtn: {
      padding: wp(2),
      borderRadius: wp(1.5),
      alignItems: "center",
      marginBottom: hp(1),
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    uploadSimulatedBtnText: {
      fontSize: fs(3),
      fontWeight: "500",
      color: colors.text,
    },
    editActionRow: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: wp(3),
      marginTop: hp(1.2),
    },
    btnCancelMini: {
      paddingVertical: hp(0.75),
      paddingHorizontal: wp(3),
    },
    btnSaveMini: {
      paddingVertical: hp(0.75),
      paddingHorizontal: wp(3.5),
      borderRadius: wp(1),
    },
    historyWrapper: {
      marginTop: hp(2),
      borderRadius: wp(2.5),
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.cardBg,
      padding: wp(3),
    },
    historyLogItem: {
      paddingVertical: hp(0.75),
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    historyLogMeta: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    logUser: { fontSize: fs(2.8), fontWeight: "bold", color: colors.text },
    logNotes: { fontSize: fs(2.8), marginTop: hp(0.25), color: colors.textSecondary },
    splitRow: {
      flexDirection: "row",
      gap: wp(2.5),
    },
    btnSubmitFull: {
      paddingVertical: hp(1.5),
      borderRadius: wp(1.5),
      marginTop: hp(1.5),
    },
    dialogOverlay: {
      flex: 1,
      backgroundColor: colors.overlayBg,
      justifyContent: "center",
      padding: wp(5),
    },
    dialogContent: {
      borderRadius: wp(2.5),
      padding: wp(4),
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    dialogActions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: wp(3),
      marginTop: hp(1.8),
    },
    pickerOverlay: {
      flex: 1,
      backgroundColor: colors.overlayBg,
      justifyContent: "flex-end",
    },
    pickerContainer: {
      borderTopLeftRadius: wp(3),
      borderTopRightRadius: wp(3),
      backgroundColor: colors.cardBg,
      maxHeight: Dimensions.get("window").height * 0.45,
      paddingBottom: Platform.OS === "ios" ? hp(3) : hp(1.5),
    },
    pickerHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: wp(4),
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    pickerTitle: {
      fontSize: fs(3.5),
      fontWeight: "bold",
      color: colors.text,
    },
    pickerOptionRow: {
      paddingVertical: hp(1.8),
      paddingHorizontal: wp(4),
    },
    pickerOptionText: {
      fontSize: fs(3.5),
      color: colors.text,
    },
  });
}

export default function ComplianceCenter() {
  const { uiTheme } = useTheme();
  const isMetallic = (uiTheme?.theme as string) === "metallic-elite";
  const isDark = isDarkTheme(uiTheme?.theme);
  
  const colors = useMemo(() => buildColors(uiTheme, isDark, isMetallic), [uiTheme, isDark, isMetallic]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "super-admin";

  const [websites, setWebsites] = useState<Website[]>([]);
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [report, setReport] = useState<ComplianceReport | null>(null);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [scoreFilter, setScoreFilter] = useState("all");
  const [envFilter, setEnvFilter] = useState("all");
  const [buFilter, setBuFilter] = useState("all");

  const [selectedWebsite, setSelectedWebsite] = useState<Website | null>(null);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [siteHistory, setSiteHistory] = useState<ChecklistHistory[]>([]);
  
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isOverrideOpen, setIsOverrideOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [activePicker, setActivePicker] = useState<{ type: string; current: string; options: string[] } | null>(null);

  const [overrideScore, setOverrideScore] = useState("");
  const [overrideStatus, setOverrideStatus] = useState("");
  const [overrideReason, setOverrideReason] = useState("");

  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const [newSite, setNewSite] = useState({
    siteName: "",
    url: "",
    websiteType: "active" as "active" | "future",
    platform: "",
    hostingProvider: "",
    status: "Development" as "Live" | "Maintenance" | "Development" | "Offline",
    owner: "",
    notes: "",
    launchDate: "",
    businessUnit: "Marketing",
    environment: "Production",
    leadDeveloper: "",
    complianceTemplate: "",
  });

  const [editingItem, setEditingItem] = useState<ChecklistItem | null>(null);
  const [itemStatus, setItemStatus] = useState<ChecklistItem["status"]>("pending");
  const [itemNotes, setItemNotes] = useState("");
  const [itemEvidenceUrl, setItemEvidenceUrl] = useState("");
  const [itemEvidenceFile, setItemEvidenceFile] = useState("");
  const [itemBlockedReason, setItemBlockedReason] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const activeRes = await apiFetch<{ items: Website[] }>("/api/websites/active");
      const futureRes = await apiFetch<{ items: Website[] }>("/api/websites/future");
      const combined = [...(activeRes.items || []), ...(futureRes.items || [])];
      setWebsites(combined);

      const templatesRes = await apiFetch<{ items: ChecklistTemplate[] }>("/api/websites/templates");
      setTemplates(templatesRes.items || []);

      const leaderboardRes = await apiFetch<{ items: LeaderboardItem[] }>("/api/websites/compliance/leaderboard");
      setLeaderboard(leaderboardRes.items || []);

      const reportsRes = await apiFetch<{ item: ComplianceReport }>("/api/websites/compliance/reports");
      setReport(reportsRes.item || null);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to load compliance records.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredWebsites = useMemo(() => {
    return websites.filter((site) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        site.siteName.toLowerCase().includes(q) ||
        site.url.toLowerCase().includes(q) ||
        (site.platform && site.platform.toLowerCase().includes(q)) ||
        (site.leadDeveloper && site.leadDeveloper.toLowerCase().includes(q));

      const matchesEnv = envFilter === "all" || site.environment === envFilter;
      const matchesBu = buFilter === "all" || site.businessUnit === buFilter;

      let matchesScore = true;
      if (scoreFilter === "green") matchesScore = site.readinessScore === 100;
      else if (scoreFilter === "yellow") matchesScore = site.readinessScore >= 80 && site.readinessScore < 100;
      else if (scoreFilter === "red") matchesScore = site.readinessScore < 80;

      return matchesSearch && matchesEnv && matchesBu && matchesScore;
    });
  }, [websites, search, envFilter, buFilter, scoreFilter]);

  const openComplianceDrawer = async (site: Website) => {
    setSelectedWebsite(site);
    setIsDrawerOpen(true);
    setActionLoading(true);
    try {
      const complianceRes = await apiFetch<{ items: ChecklistItem[] }>(`/api/websites/${site._id}/compliance`);
      setChecklistItems(complianceRes.items || []);

      const historyRes = await apiFetch<{ items: ChecklistHistory[] }>(`/api/websites/${site._id}/history`);
      setSiteHistory(historyRes.items || []);
    } catch (err) {
      Alert.alert("Error", "Failed to load site compliance checklist.");
    } finally {
      setActionLoading(false);
    }
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedWebsite(null);
    setChecklistItems([]);
    setSiteHistory([]);
    setEditingItem(null);
    setExpandedCategories({});
  };

  const saveChecklistItem = async (item: ChecklistItem) => {
    if (!selectedWebsite) return;
    if (
      itemStatus === "completed" &&
      item.requiresEvidence &&
      !itemEvidenceUrl &&
      !itemEvidenceFile &&
      !item.evidenceUrl &&
      !item.evidenceFile
    ) {
      Alert.alert("Evidence Required", "Evidence (Screenshot file or URL) is required to clear this item.");
      return;
    }

    setActionLoading(true);
    try {
      const res = await apiFetch<{ item: ChecklistItem; readinessScore: number }>(
        `/api/websites/${selectedWebsite._id}/compliance/${item._id}`,
        {
          method: "PUT",
          body: JSON.stringify({
            status: itemStatus,
            notes: itemNotes,
            evidenceUrl: itemEvidenceUrl,
            evidenceFile: itemEvidenceFile || undefined,
            blockedReason: itemStatus === "blocked" ? itemBlockedReason : "",
          }),
        }
      );

      setChecklistItems((prev) => prev.map((i) => (i._id === item._id ? res.item : i)));
      setSelectedWebsite((prev) => (prev ? { ...prev, readinessScore: res.readinessScore } : null));
      setWebsites((prev) => prev.map((w) => (w._id === selectedWebsite._id ? { ...w, readinessScore: res.readinessScore } : w)));

      const historyRes = await apiFetch<{ items: ChecklistHistory[] }>(`/api/websites/${selectedWebsite._id}/history`);
      setSiteHistory(historyRes.items || []);
      setEditingItem(null);
      void loadData();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update checklist item.");
    } finally {
      setActionLoading(false);
    }
  };

  const submitOverride = async () => {
    if (!selectedWebsite) return;
    if (!overrideReason) {
      Alert.alert("Required Field", "Override reason is required.");
      return;
    }

    setActionLoading(true);
    try {
      const res = await apiFetch<{ item: Website }>(`/api/websites/${selectedWebsite._id}/override`, {
        method: "PUT",
        body: JSON.stringify({
          readinessScore: overrideScore !== "" ? Number(overrideScore) : undefined,
          status: overrideStatus || undefined,
          overrideReason,
        }),
      });

      setSelectedWebsite(res.item);
      setOverrideReason("");
      setOverrideScore("");
      setOverrideStatus("");
      setIsOverrideOpen(false);
      setWebsites((prev) => prev.map((w) => (w._id === selectedWebsite._id ? res.item : w)));

      const historyRes = await apiFetch<{ items: ChecklistHistory[] }>(`/api/websites/${selectedWebsite._id}/history`);
      setSiteHistory(historyRes.items || []);
      void loadData();
    } catch (err: any) {
      Alert.alert("Override Failed", err.message || "Manual parameter force failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateWebsite = async () => {
    if (!newSite.siteName || !newSite.url) {
      Alert.alert("Missing Fields", "Site name and URL paths are required.");
      return;
    }

    setActionLoading(true);
    try {
      await apiFetch("/api/websites", {
        method: "POST",
        body: JSON.stringify(newSite),
      });

      setIsCreateOpen(false);
      setNewSite({
        siteName: "",
        url: "",
        websiteType: "active",
        platform: "",
        hostingProvider: "",
        status: "Development",
        owner: "",
        notes: "",
        launchDate: "",
        businessUnit: "Marketing",
        environment: "Production",
        leadDeveloper: "",
        complianceTemplate: "",
      });
      void loadData();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to create site registry item.");
    } finally {
      setActionLoading(false);
    }
  };

  const simulateEvidenceUpload = () => {
    setItemEvidenceFile("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==");
    Alert.alert("Attachment Added", "Evidence attachment file processed.");
  };

  const getCountdownDays = (dateStr?: string) => {
    if (!dateStr) return null;
    const launch = new Date(dateStr);
    const now = new Date();
    launch.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    const diff = launch.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const groupedChecklistItems = useMemo(() => {
    const groups: Record<string, ChecklistItem[]> = {};
    checklistItems.forEach((item) => {
      const cat = item.category || "General";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return groups;
  }, [checklistItems]);

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const openPicker = (type: string, current: string, options: string[]) => {
    setActivePicker({ type, current, options });
  };

  const handlePickerSelect = (value: string) => {
    if (!activePicker) return;
    const { type } = activePicker;
    if (type === "scoreFilter") setScoreFilter(value);
    else if (type === "envFilter") setEnvFilter(value);
    else if (type === "buFilter") setBuFilter(value);
    else if (type === "websiteType") setNewSite({ ...newSite, websiteType: value as "active" | "future" });
    else if (type === "environment") setNewSite({ ...newSite, environment: value });
    else if (type === "businessUnit") setNewSite({ ...newSite, businessUnit: value });
    else if (type === "complianceTemplate") setNewSite({ ...newSite, complianceTemplate: value });
    else if (type === "overrideStatus") setOverrideStatus(value);
    else if (type === "itemStatus") setItemStatus(value as ChecklistItem["status"]);

    setActivePicker(null);
  };

  return (
    <SafeAreaView style={s(styles.container)}>
      <FlatList
        data={filteredWebsites}
        keyExtractor={(item) => item._id}
        refreshing={loading}
        onRefresh={() => void loadData()}
        ListHeaderComponent={
          <View style={s(styles.headerPadding)}>
            <View style={s(styles.topBar)}>
              <View style={s({ flexDirection: "row", alignItems: "center", gap: wp(2) })}>
                <Shield size={fs(7)} color={colors.primary} />
                <Text style={s(styles.mainTitle)}>Compliance Center</Text>
              </View>
              <View style={s(styles.actionRow)}>
                <TouchableOpacity style={s(styles.btnOutline)} onPress={() => void loadData()}>
                  <RefreshCw size={fs(3.5)} color={colors.text} />
                  <Text style={s(styles.btnOutlineText)}>Sync</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s(styles.btnPrimary)} onPress={() => setIsCreateOpen(true)}>
                  <Plus size={fs(3.5)} color={isMetallic ? "#000" : "#fff"} />
                  <Text style={s([styles.btnPrimaryText, { color: isMetallic ? "#000" : "#fff" }])}>Register</Text>
                </TouchableOpacity>
              </View>
            </View>

            {report && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s(styles.statsScroll)} contentContainerStyle={s({ gap: wp(3) })}>
                <View style={s(styles.statCard)}>
                  <Text style={s(styles.statLabel)}>Average Score</Text>
                  <Text style={s(styles.statValue)}>{report.avgScore}%</Text>
                  <Text style={s(styles.statSub)}>{report.totalWebsites} Pipelines tracked</Text>
                </View>
                <View style={s(styles.statCard)}>
                  <Text style={s(styles.statLabel)}>Green (100%)</Text>
                  <Text style={s(styles.textGreen)}>{report.statusBreakdown.green} sites</Text>
                  <Text style={s(styles.statSub)}>Fully Compliant</Text>
                </View>
                <View style={s(styles.statCard)}>
                  <Text style={s(styles.statLabel)}>Yellow (80-99%)</Text>
                  <Text style={s(styles.textAmber)}>{report.statusBreakdown.yellow} sites</Text>
                  <Text style={s(styles.statSub)}>Approaching Verification</Text>
                </View>
                <View style={s(styles.statCard)}>
                  <Text style={s(styles.statLabel)}>Red (&lt;80%)</Text>
                  <Text style={s(styles.textRed)}>{report.statusBreakdown.red} sites</Text>
                  <Text style={s(styles.statSub)}>Early Stage / Action Required</Text>
                </View>
              </ScrollView>
            )}

            <View style={s(styles.filterContainer)}>
              <Text style={s(styles.sectionTitle)}>Filters</Text>
              <View style={s(styles.searchWrapper)}>
                <Search size={fs(4)} color={colors.textMuted} style={s(styles.searchIcon)} />
                <TextInput
                  placeholder="Search project domain or lead..."
                  placeholderTextColor={colors.textMuted}
                  value={search}
                  onChangeText={setSearch}
                  style={s(styles.inputField)}
                />
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s({ gap: wp(2) })} style={s({ marginTop: hp(1) })}>
                <TouchableOpacity style={s(styles.dropdownTrigger)} onPress={() => openPicker("scoreFilter", scoreFilter, ["all", "green", "yellow", "red"])}>
                  <Text style={s(styles.dropdownTriggerText)}>Score: {scoreFilter}</Text>
                  <ChevronDown size={fs(3.5)} color={colors.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity style={s(styles.dropdownTrigger)} onPress={() => openPicker("envFilter", envFilter, ["all", "Production", "Staging", "Development"])}>
                  <Text style={s(styles.dropdownTriggerText)}>Env: {envFilter}</Text>
                  <ChevronDown size={fs(3.5)} color={colors.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity style={s(styles.dropdownTrigger)} onPress={() => openPicker("buFilter", buFilter, ["all", "Marketing", "SaaS", "E-Commerce", "Operations"])}>
                  <Text style={s(styles.dropdownTriggerText)}>BU: {buFilter}</Text>
                  <ChevronDown size={fs(3.5)} color={colors.textMuted} />
                </TouchableOpacity>
              </ScrollView>
            </View>

            <Text style={s(styles.listHeaderTitle)}>Monitored Launch Pipelines</Text>
          </View>
        }
        renderItem={({ item }) => {
          const countdown = getCountdownDays(item.launchDate);
          return (
            <View style={s(styles.siteCard)}>
              <View style={s(styles.siteHeader)}>
                <View style={s({ flex: 1 })}>
                  <Text style={s(styles.siteNameText)}>{item.siteName}</Text>
                  <Text style={s(styles.siteUrlText)}>{item.url}</Text>
                </View>
                <View style={s([styles.badge, { backgroundColor: item.readinessScore === 100 ? colors.success : item.readinessScore >= 80 ? colors.warning : colors.danger }])}>
                  <Text style={s(styles.badgeText)}>{item.readinessScore}%</Text>
                </View>
              </View>

              <View style={s(styles.detailsGrid)}>
                <View>
                  <Text style={s(styles.detailLabel)}>Lead Developer</Text>
                  <Text style={s(styles.detailValue)}>{item.leadDeveloper || "Unassigned"}</Text>
                </View>
                <View>
                  <Text style={s(styles.detailLabel)}>Unit / Env</Text>
                  <Text style={s(styles.detailValue)}>{item.businessUnit} • {item.environment}</Text>
                </View>
              </View>

              {item.launchDate && (
                <View style={s(styles.countdownRow)}>
                  <Calendar size={fs(3.5)} color={colors.textMuted} />
                  <Text style={s(styles.countdownText)}>
                    {new Date(item.launchDate).toLocaleDateString()} ({countdown !== null && countdown > 0 ? `${countdown} days left` : countdown === 0 ? "Launch Day!" : "Launched"})
                  </Text>
                </View>
              )}

              {item.overrideReason && (
                <View style={s(styles.overrideIndicator)}>
                  <Lock size={fs(3)} color={colors.purple} />
                  <Text style={s(styles.overrideIndicatorText)} numberOfLines={1}>Forced: {item.overrideReason}</Text>
                </View>
              )}

              <TouchableOpacity style={s(styles.viewChecklistBtn)} onPress={() => openComplianceDrawer(item)}>
                <Text style={s([styles.viewChecklistBtnText, { color: isMetallic ? "#000" : "#fff" }])}>View Checklist & Audits</Text>
                <ChevronRight size={fs(3.5)} color={isMetallic ? "#000" : "#fff"} />
              </TouchableOpacity>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={s(styles.emptyView)}>
            <Text style={s({ color: colors.textMuted })}>No pipelines match active filter queries.</Text>
          </View>
        }
        ListFooterComponent={
          <View style={s(styles.footerContainer)}>
            <View style={s(styles.leaderboardCard)}>
              <View style={s({ flexDirection: "row", alignItems: "center", gap: wp(1.5), marginBottom: hp(1.5) })}>
                <TrendingUp size={fs(4.5)} color={colors.primary} />
                <Text style={s([styles.sectionTitle, { marginBottom: 0 }])}>Employee Leaderboard</Text>
              </View>
              {leaderboard.map((item, idx) => (
                <View key={item.username} style={s(styles.leaderboardRow)}>
                  <Text style={s(styles.leaderboardRank)}>#{idx + 1}</Text>
                  <Text style={s(styles.leaderboardName)}>{item.username}</Text>
                  <Text style={s(styles.leaderboardCount)}>{item.count} tasks done</Text>
                </View>
              ))}
            </View>
          </View>
        }
      />

      <Modal visible={isDrawerOpen} animationType="slide" onRequestClose={closeDrawer}>
        <SafeAreaView style={s(styles.modalContainer)}>
          <View style={s(styles.modalHeader)}>
            <View style={s({ flex: 1 })}>
              <Text style={s(styles.modalTitle)}>{selectedWebsite?.siteName} Checklist</Text>
              <Text style={s(styles.modalSubtitle)}>{selectedWebsite?.environment} • {selectedWebsite?.businessUnit}</Text>
            </View>
            <TouchableOpacity onPress={closeDrawer} style={s(styles.closeBtn)}>
              <X size={fs(5)} color={colors.text} />
            </TouchableOpacity>
          </View>

          {actionLoading && checklistItems.length === 0 ? (
            <View style={s(styles.loaderCentering)}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <ScrollView style={s(styles.modalScrollBody)} contentContainerStyle={s({ paddingBottom: hp(4) })}>
              {isAdmin && (
                <TouchableOpacity style={s(styles.adminOverrideTrigger)} onPress={() => { setOverrideScore(String(selectedWebsite?.readinessScore || "")); setOverrideStatus(selectedWebsite?.status || ""); setIsOverrideOpen(true); }}>
                  <Lock size={fs(3.5)} color={colors.purple} />
                  <Text style={s(styles.adminOverrideTriggerText)}>Access Admin Override Panel</Text>
                </TouchableOpacity>
              )}

              {Object.entries(groupedChecklistItems).map(([category, items]) => {
                const isExpanded = !!expandedCategories[category];
                const completedCount = items.filter((i) => i.status === "completed").length;
                return (
                  <View key={category} style={s(styles.accordionBox)}>
                    <TouchableOpacity style={s(styles.accordionHeader)} onPress={() => toggleCategory(category)}>
                      <Text style={s(styles.accordionTitle)}>{category}</Text>
                      <View style={s(styles.accordionBadgeRow)}>
                        <View style={s(styles.miniBadge)}>
                          <Text style={s(styles.miniBadgeText)}>{completedCount}/{items.length} Done</Text>
                        </View>
                        {isExpanded ? <ChevronDown size={fs(4)} color={colors.text} /> : <ChevronRight size={fs(4)} color={colors.text} />}
                      </View>
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={s(styles.accordionContent)}>
                        {items.map((item) => {
                          const isEditing = editingItem?._id === item._id;
                          return (
                            <View key={item._id} style={s(styles.checkpointItem)}>
                              <View style={s(styles.checkpointTop)}>
                                <View style={s(styles.checkpointStatusIndicator)}>
                                  {item.status === "completed" ? <CheckCircle2 size={fs(4)} color={colors.success} /> : item.status === "blocked" ? <XCircle size={fs(4)} color={colors.danger} /> : <AlertTriangle size={fs(4)} color={colors.warning} />}
                                  <Text style={s(styles.checkpointTitleText)}>{item.title}</Text>
                                </View>
                                {item.requiresEvidence && <Text style={s(styles.evidenceLabelAlert)}>Evidence Required</Text>}
                              </View>
                              <Text style={s(styles.checkpointDescText)}>{item.description}</Text>

                              {item.notes && !isEditing && (
                                <View style={s(styles.notesBlock)}><Text style={s(styles.notesText)}><Text style={s({ fontWeight: "bold" })}>Notes: </Text>{item.notes}</Text></View>
                              )}
                              {item.status === "blocked" && item.blockedReason && !isEditing && (
                                <View style={s(styles.blockedBlock)}><Text style={s(styles.blockedText)}><Text style={s({ fontWeight: "bold" })}>Reason: </Text>{item.blockedReason}</Text></View>
                              )}

                              {isEditing ? (
                                <View style={s(styles.editCheckpointForm)}>
                                  <Text style={s(styles.formSectionLabel)}>Change Verification Status</Text>
                                  <TouchableOpacity style={s([styles.dropdownTrigger, { marginBottom: hp(1) }])} onPress={() => openPicker("itemStatus", itemStatus, ["pending", "in-progress", "blocked", "completed"])}>
                                    <Text style={s(styles.dropdownTriggerText)}>{itemStatus}</Text>
                                    <ChevronDown size={fs(3.5)} color={colors.textMuted} />
                                  </TouchableOpacity>

                                  <Text style={s(styles.formSectionLabel)}>Evidence Resource Link URL</Text>
                                  <TextInput value={itemEvidenceUrl} onChangeText={setItemEvidenceUrl} placeholder="https://..." placeholderTextColor={colors.textMuted} style={s([styles.inputField, { marginBottom: hp(1) }])} />

                                  {itemStatus === "blocked" && (
                                    <>
                                      <Text style={s(styles.formSectionLabel)}>Reason Blocked *</Text>
                                      <TextInput value={itemBlockedReason} onChangeText={setItemBlockedReason} placeholder="Explain block root cause..." placeholderTextColor={colors.textMuted} style={s([styles.inputField, { marginBottom: hp(1) }])} />
                                    </>
                                  )}

                                  <TouchableOpacity style={s(styles.uploadSimulatedBtn)} onPress={simulateEvidenceUpload}>
                                    <Text style={s(styles.uploadSimulatedBtnText)}>{itemEvidenceFile ? "✓ File Ready" : "Attach Screenshot Evidence"}</Text>
                                  </TouchableOpacity>

                                  <Text style={s(styles.formSectionLabel)}>Audit Verification Notes</Text>
                                  <TextInput value={itemNotes} onChangeText={setItemNotes} placeholder="Add verification confirmation metrics..." placeholderTextColor={colors.textMuted} multiline numberOfLines={2} style={s([styles.inputField, { height: hp(6.2), textAlignVertical: "top" }])} />

                                  <View style={s(styles.editActionRow)}>
                                    <TouchableOpacity style={s(styles.btnCancelMini)} onPress={() => setEditingItem(null)}><Text style={s({ color: colors.danger })}>Cancel</Text></TouchableOpacity>
                                    <TouchableOpacity style={s([styles.btnSaveMini, { backgroundColor: colors.primary }])} onPress={() => void saveChecklistItem(item)}><Text style={s({ color: isMetallic ? "#000" : "#fff", fontWeight: "bold" })}>Save</Text></TouchableOpacity>
                                  </View>
                                </View>
                              ) : (
                                <TouchableOpacity style={s(styles.updateCheckpointTriggerRow)} onPress={() => { setEditingItem(item); setItemStatus(item.status); setItemNotes(item.notes || ""); setItemEvidenceUrl(item.evidenceUrl || ""); setItemEvidenceFile(""); setItemBlockedReason(item.blockedReason || ""); }}>
                                  <Text style={s({ color: colors.accent, fontSize: fs(3), fontWeight: "600" })}>Update Checkpoint</Text>
                                  <ArrowRight size={fs(3)} color={colors.accent} />
                                </TouchableOpacity>
                              )}
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                );
              })}

              <View style={s(styles.historyWrapper)}>
                <View style={s({ flexDirection: "row", alignItems: "center", gap: wp(1.5), marginBottom: hp(1.5) })}>
                  <History size={fs(4)} color={colors.text} />
                  <Text style={s([styles.sectionTitle, { marginBottom: 0 }])}>Checkpoint Audit Trail</Text>
                </View>
                {siteHistory.length === 0 ? (
                  <Text style={s({ color: colors.textMuted, fontSize: fs(3), textAlign: "center", paddingVertical: hp(1.5) })}>No execution signatures registered yet.</Text>
                ) : (
                  siteHistory.map((log) => (
                    <View key={log._id} style={s(styles.historyLogItem)}>
                      <View style={s(styles.historyLogMeta)}>
                        <Text style={s(styles.logUser)}>{log.username}</Text>
                        <Text style={s({ color: colors.textMuted, fontSize: fs(2.5) })}>{new Date(log.createdAt).toLocaleDateString()}</Text>
                      </View>
                      <Text style={s(styles.logNotes)}>{log.notes}</Text>
                    </View>
                  ))
                )}
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      <Modal visible={isCreateOpen} animationType="slide" onRequestClose={() => setIsCreateOpen(false)}>
        <SafeAreaView style={s(styles.modalContainer)}>
          <View style={s(styles.modalHeader)}>
            <Text style={s(styles.modalTitle)}>Register Website Launch</Text>
            <TouchableOpacity onPress={() => setIsCreateOpen(false)} style={s(styles.closeBtn)}><X size={fs(5)} color={colors.text} /></TouchableOpacity>
          </View>
          <ScrollView style={s({ padding: wp(4) })} contentContainerStyle={s({ gap: hp(1.5), paddingBottom: hp(5) })}>
            <View>
              <Text style={s(styles.formSectionLabel)}>Website Name *</Text>
              <TextInput value={newSite.siteName} onChangeText={(text) => setNewSite({ ...newSite, siteName: text })} placeholder="e.g. Acme SaaS Platform" placeholderTextColor={colors.textMuted} style={s(styles.inputField)} />
            </View>
            <View>
              <Text style={s(styles.formSectionLabel)}>Domain / URL *</Text>
              <TextInput value={newSite.url} onChangeText={(text) => setNewSite({ ...newSite, url: text })} placeholder="e.g. acme.com" placeholderTextColor={colors.textMuted} autoCapitalize="none" style={s(styles.inputField)} />
            </View>

            <View style={s(styles.splitRow)}>
              <View style={s({ flex: 1 })}>
                <Text style={s(styles.formSectionLabel)}>Type</Text>
                <TouchableOpacity style={s(styles.dropdownTrigger)} onPress={() => openPicker("websiteType", newSite.websiteType, ["active", "future"])}>
                  <Text style={s(styles.dropdownTriggerText)}>{newSite.websiteType}</Text>
                  <ChevronDown size={fs(3.5)} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
              <View style={s({ flex: 1 })}>
                <Text style={s(styles.formSectionLabel)}>Environment</Text>
                <TouchableOpacity style={s(styles.dropdownTrigger)} onPress={() => openPicker("environment", newSite.environment, ["Production", "Staging", "Development"])}>
                  <Text style={s(styles.dropdownTriggerText)}>{newSite.environment}</Text>
                  <ChevronDown size={fs(3.5)} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={s(styles.splitRow)}>
              <View style={s({ flex: 1 })}>
                <Text style={s(styles.formSectionLabel)}>Business Unit</Text>
                <TouchableOpacity style={s(styles.dropdownTrigger)} onPress={() => openPicker("businessUnit", newSite.businessUnit, ["Marketing", "SaaS", "E-Commerce", "Operations"])}>
                  <Text style={s(styles.dropdownTriggerText)}>{newSite.businessUnit}</Text>
                  <ChevronDown size={fs(3.5)} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
              <View style={s({ flex: 1 })}>
                <Text style={s(styles.formSectionLabel)}>Lead Developer</Text>
                <TextInput value={newSite.leadDeveloper} onChangeText={(text) => setNewSite({ ...newSite, leadDeveloper: text })} placeholder="username" placeholderTextColor={colors.textMuted} style={s(styles.inputField)} />
              </View>
            </View>

            <View>
              <Text style={s(styles.formSectionLabel)}>Platform Engine</Text>
              <TextInput value={newSite.platform} onChangeText={(text) => setNewSite({ ...newSite, platform: text })} placeholder="e.g. Next.js, Webflow" placeholderTextColor={colors.textMuted} style={s(styles.inputField)} />
            </View>

            <View>
              <Text style={s(styles.formSectionLabel)}>Compliance Template Map</Text>
              <TouchableOpacity style={s(styles.dropdownTrigger)} onPress={() => openPicker("complianceTemplate", newSite.complianceTemplate, templates.map((t) => t.key))}>
                <Text style={s(styles.dropdownTriggerText)}>{newSite.complianceTemplate || "Select template path"}</Text>
                <ChevronDown size={fs(3.5)} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View>
              <Text style={s(styles.formSectionLabel)}>Target Launch Date (YYYY-MM-DD)</Text>
              <TextInput value={newSite.launchDate} onChangeText={(text) => setNewSite({ ...newSite, launchDate: text })} placeholder="e.g. 2026-12-31" placeholderTextColor={colors.textMuted} style={s(styles.inputField)} />
            </View>

            <TouchableOpacity style={s(styles.btnSubmitFull)} disabled={actionLoading} onPress={handleCreateWebsite}>
              <Text style={s({ color: isMetallic ? "#000" : "#fff", fontWeight: "bold", textAlign: "center" })}>Create Pipeline Profile</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal visible={isOverrideOpen} transparent animationType="fade" onRequestClose={() => setIsOverrideOpen(false)}>
        <View style={s(styles.dialogOverlay)}>
          <View style={s(styles.dialogContent)}>
            <Text style={s(styles.modalTitle)}>Admin Override Panel</Text>
            <Text style={s({ color: colors.danger, fontSize: fs(2.8), marginBottom: hp(1.5) })}>Forcing parameters updates accountability logs bypass signatures.</Text>

            <Text style={s(styles.formSectionLabel)}>Force Readiness Score (0-100)</Text>
            <TextInput value={overrideScore} onChangeText={setOverrideScore} keyboardType="numeric" placeholder="100" placeholderTextColor={colors.textMuted} style={s([styles.inputField, { marginBottom: hp(1) }])} />

            <Text style={s(styles.formSectionLabel)}>Force Site Status</Text>
            <TouchableOpacity style={s([styles.dropdownTrigger, { marginBottom: hp(1) }])} onPress={() => openPicker("overrideStatus", overrideStatus, ["Live", "Maintenance", "Development", "Offline"])}>
              <Text style={s(styles.dropdownTriggerText)}>{overrideStatus || "Select Status"}</Text>
              <ChevronDown size={fs(3.5)} color={colors.textMuted} />
            </TouchableOpacity>

            <Text style={s(styles.formSectionLabel)}>Override Reason Protocol *</Text>
            <TextInput value={overrideReason} onChangeText={setOverrideReason} placeholder="Detail cause for authorization bypass..." placeholderTextColor={colors.textMuted} multiline numberOfLines={3} style={s([styles.inputField, { height: hp(7.5), textAlignVertical: "top" }])} />

            <View style={s(styles.dialogActions)}>
              <TouchableOpacity style={s(styles.btnCancelMini)} onPress={() => setIsOverrideOpen(false)}><Text style={s({ color: colors.text })}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={s([styles.btnSaveMini, { backgroundColor: colors.purple }])} onPress={submitOverride}><Text style={s({ color: "#fff", fontWeight: "bold" })}>Authorize Bypass</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={activePicker !== null} transparent animationType="slide" onRequestClose={() => setActivePicker(null)}>
        <TouchableOpacity style={s(styles.pickerOverlay)} activeOpacity={1} onPress={() => setActivePicker(null)}>
          <View style={s(styles.pickerContainer)}>
            <View style={s(styles.pickerHeader)}>
              <Text style={s(styles.pickerTitle)}>Select Option</Text>
              <TouchableOpacity onPress={() => setActivePicker(null)}><X size={fs(4.5)} color={colors.text} /></TouchableOpacity>
            </View>
            <ScrollView>
              {activePicker?.options.map((opt) => (
                <TouchableOpacity key={opt} style={s([styles.pickerOptionRow, activePicker.current === opt && { backgroundColor: colors.borderLight }])} onPress={() => handlePickerSelect(opt)}>
                  <Text style={s([styles.pickerOptionText, activePicker.current === opt && { fontWeight: "bold" }])}>{opt || "None"}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}