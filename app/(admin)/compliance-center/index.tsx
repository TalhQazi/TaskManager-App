import React, { useEffect, useState, useMemo, useCallback } from "react";
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
  useWindowDimensions,
  SafeAreaView
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { apiFetch } from "@/lib/admin/apiClient";

import { useAuth } from "../../../contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Shield,
  History,
  User,
  Clock,
  ArrowRight,
  Upload,
  Lock,
  Plus,
  Search,
  RefreshCw,
  TrendingUp,
  Calendar,
  ChevronDown,
  X
} from "lucide-react-native";
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

export default function ComplianceCenter() {
  const { width, height } = useWindowDimensions();
  const wp = useCallback((percentage: number) => (width * percentage) / 100, [width]);
  const hp = useCallback((percentage: number) => (height * percentage) / 100, [height]);
  const isTablet = width >= 768;
  const isSmallScreen = width < 375;

  const { uiTheme } = useTheme();
  const isMetallic = uiTheme?.theme === "metallic-elite";
  const auth = useAuth();
  const isAdmin = auth?.user?.role === "admin" || auth?.user?.role === "super-admin";

  const isDark = isDarkTheme(uiTheme?.theme);

  const colors = useMemo(() => {
    return {
      background: uiTheme?.panelColors?.dashboardBackground || (isDark ? "#0f172a" : "#f8fafc"),
      cardBg: uiTheme?.panelColors?.dashboardCardBackground || (isDark ? "#1e293b" : "#ffffff"),
      modalBg: isDark ? "#1e293b" : "#ffffff",
      text: uiTheme?.panelColors?.dashboardTextColor || (isDark ? "#f8fafc" : "#0f172a"),
      mutedText: isDark ? "#94a3b8" : "#64748b",
      border: isDark ? "rgba(255, 255, 255, 0.15)" : "#cbd5e1",
      inputBg: isDark ? "#0f172a" : "#f1f5f9",
      primary: uiTheme.customColors?.primary || "#00C6FF",
      primaryText: "#0f172a",
      metallicGold: "#ffd27a",
      metallicGradientEnd: "#d8a537",
      green: "#22c55e",
      amber: "#f59e0b",
      red: "#ef4444",
      purple: "#9333ea"
    };
  }, [uiTheme, isMetallic, isDark]);

  const styles = useMemo(() => createStyles(colors, isMetallic, isTablet, isSmallScreen, wp, hp, height, width, isDark), [colors, isMetallic, isTablet, isSmallScreen, wp, hp, height, width, isDark]);

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
  const [overrideScore, setOverrideScore] = useState("");
  const [overrideStatus, setOverrideStatus] = useState("");
  const [overrideReason, setOverrideReason] = useState("");

  const [isCreateOpen, setIsCreateOpen] = useState(false);
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

  const [pickerField, setPickerField] = useState<{ visible: boolean; type: string; options: { label: string; value: string }[] | null }>({
    visible: false,
    type: "",
    options: null
  });

  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const loadData = async () => {
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
      Alert.alert("Error", "Failed to load compliance data. Make sure backend is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
      const complianceRes = await apiFetch<{ items: ChecklistItem[] }>("/api/websites/" + site._id + "/compliance");
      setChecklistItems(complianceRes.items || []);

      const historyRes = await apiFetch<{ items: ChecklistHistory[] }>("/api/websites/" + site._id + "/history");
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
      Alert.alert("Error", "Evidence (Screenshot, log file or URL) is required to complete this item.");
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

      Alert.alert("Success", `Updated status for "${item.title}"`);

      setChecklistItems((prev) =>
        prev.map((i) => (i._id === item._id ? res.item : i))
      );

      setSelectedWebsite((prev) =>
        prev ? { ...prev, readinessScore: res.readinessScore } : null
      );

      setWebsites((prev) =>
        prev.map((w) => (w._id === selectedWebsite._id ? { ...w, readinessScore: res.readinessScore } : w))
      );

      const historyRes = await apiFetch<{ items: ChecklistHistory[] }>("/api/websites/" + selectedWebsite._id + "/history");
      setSiteHistory(historyRes.items || []);
      setEditingItem(null);

      loadData();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update checklist item.");
    } finally {
      setActionLoading(false);
    }
  };

  const submitOverride = async () => {
    if (!selectedWebsite) return;
    if (!overrideReason) {
      Alert.alert("Error", "Override reason is required.");
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

      Alert.alert("Success", "Admin parameters overridden successfully.");
      setSelectedWebsite(res.item);
      setOverrideReason("");
      setOverrideScore("");
      setOverrideStatus("");
      setIsOverrideOpen(false);

      setWebsites((prev) =>
        prev.map((w) => (w._id === selectedWebsite._id ? res.item : w))
      );

      const historyRes = await apiFetch<{ items: ChecklistHistory[] }>("/api/websites/" + selectedWebsite._id + "/history");
      setSiteHistory(historyRes.items || []);

      loadData();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Override failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDocumentPick = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: ["image/*", "application/pdf"] });
      if (!res.canceled && res.assets?.[0]) {
        setItemEvidenceFile(res.assets[0].uri);
        Alert.alert("File Ready", "Attachment evidence registered successfully.");
      }
    } catch (err) {
      Alert.alert("Error", "Failed to acquire document reference.");
    }
  };

  const handleCreateWebsite = async () => {
    if (!newSite.siteName || !newSite.url) {
      Alert.alert("Error", "Site name and URL are required.");
      return;
    }

    setActionLoading(true);
    try {
      await apiFetch("/api/websites", {
        method: "POST",
        body: JSON.stringify(newSite),
      });

      Alert.alert("Success", "Registered website launch project successfully.");
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

      loadData();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to create site launch record.");
    } finally {
      setActionLoading(false);
    }
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

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const openPicker = (type: string, options: { label: string; value: string }[]) => {
    setPickerField({ visible: true, type, options });
  };

  const handlePickerSelect = (value: string) => {
    const type = pickerField.type;
    if (type === "scoreFilter") setScoreFilter(value);
    else if (type === "envFilter") setEnvFilter(value);
    else if (type === "buFilter") setBuFilter(value);
    else if (type === "itemStatus") setItemStatus(value as ChecklistItem["status"]);
    else if (type === "websiteType") setNewSite(p => ({ ...p, websiteType: value as "active" | "future" }));
    else if (type === "environment") setNewSite(p => ({ ...p, environment: value }));
    else if (type === "businessUnit") setNewSite(p => ({ ...p, businessUnit: value }));
    else if (type === "complianceTemplate") setNewSite(p => ({ ...p, complianceTemplate: value }));
    else if (type === "overrideStatus") setOverrideStatus(value);
    else if (type === "siteStatus") setNewSite(p => ({ ...p, status: value as any }));

    setPickerField({ visible: false, type: "", options: null });
  };

  const renderRivets = () => {
    if (!isMetallic) return null;
    return (
      <>
        <View style={[styles.rivet, { top: 6, left: 6 }]} />
        <View style={[styles.rivet, { top: 6, right: 6 }]} />
        <View style={[styles.rivet, { bottom: 6, left: 6 }]} />
        <View style={[styles.rivet, { bottom: 6, right: 6 }]} />
      </>
    );
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

  const templateOptions = useMemo(() => {
    return templates.map(t => ({ label: t.name, value: t.key }));
  }, [templates]);

  return (
    <SafeAreaView style={styles.safeContainer}>
      <ScrollView contentContainerStyle={styles.mainScroll} showsVerticalScrollIndicator={false}>
        
        {/* Header Block */}
        <View style={styles.headerRow}>
          <View style={styles.flex1}>
            <View style={styles.titleWrapper}>
              <Shield size={isTablet ? 28 : 24} color={isMetallic ? colors.metallicGold : colors.primary} style={styles.headerIcon} />
              <Text style={styles.mainTitleText}>Website Compliance Center</Text>
            </View>
            <Text style={styles.subtitleText}>
              Track website deployment readiness, execute checklist templates, audit launch tasks, and view accountability logs.
            </Text>
          </View>
        </View>

        {/* Global Toolbar Action Triggers */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity style={[styles.button, styles.btnOutlineText, styles.flexRow, styles.marginRight8]} onPress={loadData} disabled={loading} activeOpacity={0.7}>
            <RefreshCw size={14} color={colors.text} style={[styles.marginRight6, loading && styles.spin]} />
            <Text style={styles.btnOutlineText}>Refresh</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.btnPrimary, styles.flexRow, styles.flex1]} onPress={() => setIsCreateOpen(true)} activeOpacity={0.8}>
            <Plus size={14} color={colors.primaryText} style={styles.marginRight6} />
            <Text style={styles.btnPrimaryText}>Register Site Launch</Text>
          </TouchableOpacity>
        </View>

        {/* Analytical Scorecards Summary Dashboard Grid */}
        {report && (
          <View style={styles.analyticsGrid}>
            <View style={styles.card}>
              {renderRivets()}
              <Text style={styles.cardDesc}>Average Readiness Score</Text>
              <Text style={[styles.cardTitle, isMetallic && styles.textGold]}>{report.avgScore}%</Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressBar, { width: `${report.avgScore}%`, backgroundColor: colors.primary }]} />
              </View>
              <View style={[styles.flexRow, styles.marginTop6]}>
                <TrendingUp size={12} color={colors.green} style={styles.marginRight4} />
                <Text style={styles.miniCardText}>Across {report.totalWebsites} monitored launch paths.</Text>
              </View>
            </View>

            <View style={styles.card}>
              {renderRivets()}
              <Text style={styles.cardDesc}>Green (100% Safe)</Text>
              <Text style={[styles.cardTitle, { color: colors.green }]}>
                {report.statusBreakdown.green} <Text style={styles.cardTitleSub}>sites</Text>
              </Text>
              <View style={styles.dotContainer}>
                {Array.from({ length: Math.min(5, report.statusBreakdown.green) }).map((_, i) => (
                  <View key={i} style={[styles.indicatorDot, { backgroundColor: colors.green }]} />
                ))}
              </View>
              <Text style={[styles.miniCardText, styles.marginTop6]}>100% compliant with standard policies.</Text>
            </View>

            <View style={styles.card}>
              {renderRivets()}
              <Text style={styles.cardDesc}>Yellow (80%-99%)</Text>
              <Text style={[styles.cardTitle, { color: colors.amber }]}>
                {report.statusBreakdown.yellow} <Text style={styles.cardTitleSub}>sites</Text>
              </Text>
              <View style={styles.dotContainer}>
                {Array.from({ length: Math.min(5, report.statusBreakdown.yellow) }).map((_, i) => (
                  <View key={i} style={[styles.indicatorDot, { backgroundColor: colors.amber }]} />
                ))}
              </View>
              <Text style={[styles.miniCardText, styles.marginTop6]}>Approaching launch readiness, checklist pending.</Text>
            </View>

            <View style={styles.card}>
              {renderRivets()}
              <Text style={styles.cardDesc}>Red (Blocked/Early)</Text>
              <Text style={[styles.cardTitle, { color: colors.red }]}>
                {report.statusBreakdown.red} <Text style={styles.cardTitleSub}>sites</Text>
              </Text>
              <View style={styles.dotContainer}>
                {Array.from({ length: Math.min(5, report.statusBreakdown.red) }).map((_, i) => (
                  <View key={i} style={[styles.indicatorDot, { backgroundColor: colors.red }]} />
                ))}
              </View>
              <Text style={[styles.miniCardText, styles.marginTop6]}>Requires direct focus and QA check before launch.</Text>
            </View>
          </View>
        )}

        {/* Main Search and Query Filter Configurations */}
        <View style={styles.filterCard}>
          {renderRivets()}
          <Text style={styles.filterCardTitle}>Filters</Text>
          <Text style={styles.filterCardDesc}>Refine website scorecards list</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.fieldLabel}>Search</Text>
            <View style={styles.searchContainer}>
              <Search size={14} color={colors.mutedText} style={styles.searchIconNative} />
              <TextInput
                style={styles.nativeInputStyle}
                placeholder="Site name, developer, domain..."
                placeholderTextColor={colors.mutedText}
                value={search}
                onChangeText={setSearch}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.fieldLabel}>Readiness Status</Text>
            <TouchableOpacity
              style={styles.dropdownTrigger}
              onPress={() => openPicker("scoreFilter", [
                { label: "All Scores", value: "all" },
                { label: "Green (100%)", value: "green" },
                { label: "Yellow (80% - 99%)", value: "yellow" },
                { label: "Red (0% - 79%)", value: "red" }
              ])}
              activeOpacity={0.7}
            >
              <Text style={styles.dropdownValue}>
                {scoreFilter === "all" ? "All Scores" : scoreFilter === "green" ? "Green (100%)" : scoreFilter === "yellow" ? "Yellow (80% - 99%)" : "Red (0% - 79%)"}
              </Text>
              <ChevronDown size={14} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.fieldLabel}>Environment</Text>
            <TouchableOpacity
              style={styles.dropdownTrigger}
              onPress={() => openPicker("envFilter", [
                { label: "All Environments", value: "all" },
                { label: "Production", value: "Production" },
                { label: "Staging", value: "Staging" },
                { label: "Development", value: "Development" }
              ])}
              activeOpacity={0.7}
            >
              <Text style={styles.dropdownValue}>{envFilter === "all" ? "All Environments" : envFilter}</Text>
              <ChevronDown size={14} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.fieldLabel}>Business Unit</Text>
            <TouchableOpacity
              style={styles.dropdownTrigger}
              onPress={() => openPicker("buFilter", [
                { label: "All Units", value: "all" },
                { label: "Marketing", value: "Marketing" },
                { label: "SaaS", value: "SaaS" },
                { label: "E-Commerce", value: "E-Commerce" },
                { label: "Operations", value: "Operations" }
              ])}
              activeOpacity={0.7}
            >
              <Text style={styles.dropdownValue}>{buFilter === "all" ? "All Units" : buFilter}</Text>
              <ChevronDown size={14} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Task Completion Employee Leaderboard Panel */}
        <View style={styles.filterCard}>
          {renderRivets()}
          <View style={[styles.flexRow, styles.marginBottom4]}>
            <TrendingUp size={16} color={colors.text} style={styles.marginRight6} />
            <Text style={styles.filterCardTitle}>Employee Leaderboard</Text>
          </View>
          <Text style={styles.filterCardDesc}>Top completions contribution count</Text>
          <View style={styles.marginTop10}>
            {leaderboard.length === 0 ? (
              <Text style={styles.emptyStateText}>No task completion records registered yet.</Text>
            ) : (
              leaderboard.map((item, idx) => (
                <View key={item.username} style={styles.leaderboardRow}>
                  <View style={styles.flexRow}>
                    <View style={[styles.leaderboardBadge, idx === 0 ? { backgroundColor: colors.metallicGold } : idx === 1 ? { backgroundColor: "#e2e8f0" } : { backgroundColor: colors.border }]}>
                      <Text style={[styles.leaderboardBadgeText, (idx === 0 || idx === 1) && { color: "#000" }]}>{idx + 1}</Text>
                    </View>
                    <Text style={styles.leaderboardName}>{item.username}</Text>
                  </View>
                  <View style={styles.badgeWrapperInline}>
                    <Text style={styles.inlineBadgeText}>{item.count} items</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Scorecard Table View */}
        <View style={styles.tableCard}>
          {renderRivets()}
          <View style={styles.tableHeaderContainer}>
            <Text style={styles.filterCardTitle}>Websites Launch & Compliance Status</Text>
            <Text style={styles.filterCardDesc}>Active launch pipeline scorecards and checkpoints verification.</Text>
          </View>

          {loading ? (
            <View style={styles.tableLoaderWrapper}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loaderSubText}>Fetching launch scorecards...</Text>
            </View>
          ) : filteredWebsites.length === 0 ? (
            <Text style={styles.tableEmptyText}>No websites matching active filters. Register a new site to monitor.</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.horizontalTableContainer}>
                <View style={styles.tableRowHeader}>
                  <Text style={[styles.tableCellHeader, { width: 180 }]}>Site Details</Text>
                  <Text style={[styles.tableCellHeader, { width: 140 }]}>Lead & Unit</Text>
                  <Text style={[styles.tableCellHeader, { width: 150 }]}>Launch Date / Countdown</Text>
                  <Text style={[styles.tableCellHeader, { width: 140 }]}>Readiness Score</Text>
                  <Text style={[styles.tableCellHeader, { width: 120 }]}></Text>
                </View>
                {filteredWebsites.map((site) => {
                  const countdown = getCountdownDays(site.launchDate);
                  return (
                    <View key={site._id} style={styles.tableRowBody}>
                      <View style={{ width: 180, justifyContent: "center" }}>
                        <Text style={styles.siteNameTextTable} numberOfLines={1}>{site.siteName}</Text>
                        <Text style={styles.siteUrlTextTable} numberOfLines={1}>{site.url}</Text>
                        <View style={styles.flexRow}>
                          <View style={styles.miniBadgeStyle}><Text style={styles.miniBadgeText}>{site.environment}</Text></View>
                          {site.platform ? <View style={[styles.miniBadgeStyle, styles.marginBackdropOutline]}><Text style={styles.miniBadgeText}>{site.platform}</Text></View> : null}
                        </View>
                      </View>
                      <View style={{ width: 140, justifyContent: "center" }}>
                        <Text style={styles.leadDevText}>{site.leadDeveloper || "Unassigned"}</Text>
                        <Text style={styles.buText}>{site.businessUnit}</Text>
                      </View>
                      <View style={{ width: 150, justifyContent: "center" }}>
                        {site.launchDate ? (
                          <View>
                            <View style={styles.flexRow}>
                              <Calendar size={12} color={colors.mutedText} style={styles.marginRight4} />
                              <Text style={styles.dateLabelText}>{new Date(site.launchDate).toLocaleDateString()}</Text>
                            </View>
                            {countdown !== null && (
                              <Text style={styles.countdownValueText}>
                                {countdown > 0 ? `${countdown} days left` : countdown === 0 ? "Launch Today!" : `${Math.abs(countdown)} days ago`}
                              </Text>
                            )}
                          </View>
                        ) : (
                          <Text style={styles.dateLabelText}>Not set</Text>
                        )}
                      </View>
                      <View style={{ width: 140, justifyContent: "center" }}>
                        <View style={styles.flexRow}>
                          <View style={[styles.scoreTag, { backgroundColor: site.readinessScore === 100 ? colors.green : site.readinessScore >= 80 ? colors.amber : colors.red }]}>
                            <Text style={styles.scoreTagText}>{site.readinessScore}% {site.readinessScore === 100 ? "Green" : site.readinessScore >= 80 ? "Yellow" : "Red"}</Text>
                          </View>
                        </View>
                        <View style={[styles.progressTrack, styles.marginTop4]}>
                          <View style={[styles.progressBar, { width: `${site.readinessScore}%`, backgroundColor: site.readinessScore === 100 ? colors.green : site.readinessScore >= 80 ? colors.amber : colors.red }]} />
                        </View>
                        {site.overrideReason && (
                          <View style={styles.overrideTagBadge}><Text style={styles.overrideTagBadgeText}>Overridden</Text></View>
                        )}
                      </View>
                      <View style={{ width: 120, justifyContent: "center", alignItems: "flex-end" }}>
                        <TouchableOpacity style={[styles.button, styles.btnOutline, styles.flexRow]} onPress={() => openComplianceDrawer(site)} activeOpacity={0.7}>
                          <Text style={styles.btnOutlineText}>View Checklist</Text>
                          <ArrowRight size={12} color={colors.text} style={styles.marginLeft4} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          )}
        </View>

        {/* Historical Operational Audit Logs View */}
        <View style={styles.tableCard}>
          {renderRivets()}
          <View style={styles.tableHeaderContainer}>
            <View style={styles.flexRow}>
              <History size={16} color={colors.text} style={styles.marginRight6} />
              <Text style={styles.filterCardTitle}>Global Compliance Audit Logs</Text>
            </View>
            <Text style={styles.filterCardDesc}>Real-time updates, checklist logs, state transitions, and compliance history</Text>
          </View>
          <View style={styles.auditLogContainer}>
            {siteHistory.length === 0 && !selectedWebsite ? (
              <Text style={styles.auditEmptyText}>Select a website checklist to view detailed audit feeds.</Text>
            ) : siteHistory.length === 0 ? (
              <Text style={styles.auditEmptyText}>No operations logs parsed yet for this track container.</Text>
            ) : (
              siteHistory.map((log) => (
                <View key={log._id} style={styles.auditLogRow}>
                  <View style={[styles.flexRow, styles.flexWrap]}>
                    <View style={styles.auditActionBadge}><Text style={styles.auditActionText}>{log.action.replace(/_/g, " ")}</Text></View>
                    <View style={[styles.flexRow, styles.marginLeft6]}>
                      <User size={12} color={colors.mutedText} style={styles.marginRight4} />
                      <Text style={styles.auditUserText}>{log.username}</Text>
                    </View>
                    <View style={[styles.flexRow, styles.marginLeft6]}>
                      <Clock size={11} color={colors.mutedText} style={styles.marginRight4} />
                      <Text style={styles.auditUserText}>{new Date(log.createdAt).toLocaleString()}</Text>
                    </View>
                  </View>
                  {log.notes ? <Text style={styles.auditNotesText}>{log.notes}</Text> : null}
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {/* =========================================================================
          MODAL 1: REGISTER NEW WEBSITE LAUNCH PROJECT
          ========================================================================= */}
      <Modal visible={isCreateOpen} animationType="slide" transparent onRequestClose={() => setIsCreateOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContentLarge}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Register Website Launch</Text>
              <TouchableOpacity onPress={() => setIsCreateOpen(false)} activeOpacity={0.7}>
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalFormScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>Website Name *</Text>
                <TextInput
                  style={styles.modalTextInput}
                  placeholder="Acme Saas Product"
                  placeholderTextColor={colors.mutedText}
                  value={newSite.siteName}
                  onChangeText={(txt) => setNewSite(p => ({ ...p, siteName: txt }))}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>Domain URL *</Text>
                <TextInput
                  style={styles.modalTextInput}
                  placeholder="e.g., https://acme.com"
                  placeholderTextColor={colors.mutedText}
                  autoCapitalize="none"
                  value={newSite.url}
                  onChangeText={(txt) => setNewSite(p => ({ ...p, url: txt }))}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>Website Type</Text>
                <TouchableOpacity
                  style={styles.dropdownTrigger}
                  onPress={() => openPicker("websiteType", [
                    { label: "Active Project", value: "active" },
                    { label: "Future Pipeline", value: "future" }
                  ])}
                  activeOpacity={0.7}
                >
                  <Text style={styles.dropdownValue}>
                    {newSite.websiteType === "active" ? "Active Project" : "Future Pipeline"}
                  </Text>
                  <ChevronDown size={14} color={colors.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>Environment</Text>
                <TouchableOpacity
                  style={styles.dropdownTrigger}
                  onPress={() => openPicker("environment", [
                    { label: "Production", value: "Production" },
                    { label: "Staging", value: "Staging" },
                    { label: "Development", value: "Development" }
                  ])}
                  activeOpacity={0.7}
                >
                  <Text style={styles.dropdownValue}>{newSite.environment}</Text>
                  <ChevronDown size={14} color={colors.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>Business Unit Delegation</Text>
                <TouchableOpacity
                  style={styles.dropdownTrigger}
                  onPress={() => openPicker("businessUnit", [
                    { label: "Marketing", value: "Marketing" },
                    { label: "SaaS", value: "SaaS" },
                    { label: "E-Commerce", value: "E-Commerce" },
                    { label: "Operations", value: "Operations" }
                  ])}
                  activeOpacity={0.7}
                >
                  <Text style={styles.dropdownValue}>{newSite.businessUnit}</Text>
                  <ChevronDown size={14} color={colors.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>Lead Developer</Text>
                <TextInput
                  style={styles.modalTextInput}
                  placeholder="Dev name"
                  placeholderTextColor={colors.mutedText}
                  value={newSite.leadDeveloper}
                  onChangeText={(txt) => setNewSite(p => ({ ...p, leadDeveloper: txt }))}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>Platform</Text>
                <TextInput
                  style={styles.modalTextInput}
                  placeholder="e.g., Next.js, WordPress, React Native Web"
                  placeholderTextColor={colors.mutedText}
                  value={newSite.platform}
                  onChangeText={(txt) => setNewSite(p => ({ ...p, platform: txt }))}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>Compliance Template</Text>
                <TouchableOpacity
                  style={styles.dropdownTrigger}
                  onPress={() => openPicker("complianceTemplate", templateOptions)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.dropdownValue}>
                    {templates.find(t => t.key === newSite.complianceTemplate)?.name || "Select standard criteria track..."}
                  </Text>
                  <ChevronDown size={14} color={colors.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>Target Launch Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.modalTextInput}
                  placeholder="e.g., 2026-12-31"
                  placeholderTextColor={colors.mutedText}
                  value={newSite.launchDate}
                  onChangeText={(txt) => setNewSite(p => ({ ...p, launchDate: txt }))}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooterActions}>
              <TouchableOpacity style={[styles.button, styles.btnOutline, styles.marginRight8]} onPress={() => setIsCreateOpen(false)} activeOpacity={0.7}>
                <Text style={styles.btnOutlineText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.btnPrimary, styles.flex1]} onPress={handleCreateWebsite} disabled={actionLoading} activeOpacity={0.8}>
                {actionLoading ? <ActivityIndicator size="small" color={colors.primaryText} /> : <Text style={styles.btnPrimaryText}>Save Record</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* =========================================================================
          MODAL 2: DETAILED WEBSITE CHECKLIST DRAWER PANEL
          ========================================================================= */}
      <Modal 
  visible={isDrawerOpen} 
  animationType="slide" 
  transparent={true} 
  onRequestClose={closeDrawer}
>
  <View style={styles.modalBackdrop}>
    <View style={styles.modalContentLarge}>
      {/* Modal Header */}
      <View style={styles.modalHeader}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={styles.modalTitle} numberOfLines={1}>
            {selectedWebsite?.siteName}
          </Text>
          <Text style={styles.modalSubTitleText} numberOfLines={1}>
            {selectedWebsite?.url}
          </Text>
        </View>
        <TouchableOpacity onPress={closeDrawer} activeOpacity={0.7}>
          <X size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      {actionLoading && checklistItems.length === 0 ? (
        <View style={styles.centeredLoader}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.modalFormScroll} showsVerticalScrollIndicator={false}>
          
          {/* Admin Override Action Banner */}
          {isAdmin && (
            <View style={styles.adminActionBanner}>
              <Lock size={14} color={colors.text} style={styles.marginRight6} />
              <Text style={styles.adminBannerText}>Privileged Administrative Core Mode</Text>
              <TouchableOpacity style={[styles.button, styles.btnOutline, styles.miniBtnOverride]} onPress={() => setIsOverrideOpen(true)} activeOpacity={0.7}>
                <Text style={styles.btnOutlineText}>Override Parameters</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Score Status Layout */}
          <View style={styles.drawerScoreBlock}>
            <Text style={styles.fieldLabel}>Current Compliance Summary</Text>
            <Text style={styles.drawerScoreValue}>{selectedWebsite?.readinessScore}% Complete</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressBar, { width: `${selectedWebsite?.readinessScore || 0}%`, backgroundColor: colors.primary }]} />
            </View>
          </View>

          {/* Categorized Verification Checks Accordion */}
          <Text style={styles.categoryDividerTitle}>Compliance Checkpoints</Text>
          {Object.keys(groupedChecklistItems).map((catName) => {
            const isExpanded = !!expandedCategories[catName];
            return (
              <View key={catName} style={styles.accordionContainer}>
                <TouchableOpacity style={styles.accordionHeader} onPress={() => toggleCategory(catName)} activeOpacity={0.7}>
                  <Text style={styles.accordionTitleText}>{catName}</Text>
                  <ChevronDown size={16} color={colors.text} style={isExpanded ? { transform: [{ rotate: "180deg" }] } : undefined} />
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.accordionBodyContent}>
                    {groupedChecklistItems[catName].map((item) => (
                      <View key={item._id} style={styles.checkItemCard}>
                        <View style={styles.flexRowHeaderItem}>
                          <View style={styles.flex1}>
                            <Text style={styles.checkItemTitle}>{item.title}</Text>
                            <Text style={styles.checkItemDesc}>{item.description}</Text>
                          </View>
                          <View style={[styles.statusIndicatorTag, { backgroundColor: item.status === "completed" ? colors.green : item.status === "in-progress" ? colors.purple : item.status === "blocked" ? colors.red : colors.mutedText }]}>
                            <Text style={styles.statusIndicatorText}>{item.status}</Text>
                          </View>
                        </View>

                        {item.notes ? (
                          <View style={styles.evidenceNotesContainer}>
                            <Text style={styles.evidenceNotesPreview}>
                              <Text style={{ fontWeight: "700" }}>Notes: </Text>
                              {item.notes}
                            </Text>
                          </View>
                        ) : null}

                        <TouchableOpacity
                          style={[styles.button, styles.btnOutline, styles.marginTop6, styles.flexRow]}
                          onPress={() => {
                            setEditingItem(item);
                            setItemStatus(item.status);
                            setItemNotes(item.notes || "");
                            setItemEvidenceUrl(item.evidenceUrl || "");
                            setItemEvidenceFile(item.evidenceFile || "");
                            setItemBlockedReason(item.blockedReason || "");
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.btnOutlineText}>Update Verification Status</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  </View>
</Modal>

      {/* =========================================================================
          MODAL 3: UPDATE SPECIFIC CHECKLIST ITEM LOGS / EVIDENCE
          ========================================================================= */}
      <Modal visible={editingItem !== null} animationType="fade" transparent onRequestClose={() => setEditingItem(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContentMedium}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={1}>Verify: {editingItem?.title}</Text>
              <TouchableOpacity onPress={() => setEditingItem(null)} activeOpacity={0.7}>
                <X size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalFormScroll}>
              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>Task Resolution State</Text>
                <TouchableOpacity
                  style={styles.dropdownTrigger}
                  onPress={() => openPicker("itemStatus", [
                    { label: "Pending Check", value: "pending" },
                    { label: "In Progress", value: "in-progress" },
                    { label: "Blocked / Flagged", value: "blocked" },
                    { label: "Completed Verification", value: "completed" }
                  ])}
                  activeOpacity={0.7}
                >
                  <Text style={styles.dropdownValue}>{itemStatus}</Text>
                  <ChevronDown size={14} color={colors.text} />
                </TouchableOpacity>
              </View>

              {itemStatus === "blocked" && (
                <View style={styles.inputGroup}>
                  <Text style={styles.fieldLabel}>Blocked Reason *</Text>
                  <TextInput
                    style={styles.modalTextInput}
                    placeholder="Provide blocker details..."
                    placeholderTextColor={colors.mutedText}
                    value={itemBlockedReason}
                    onChangeText={setItemBlockedReason}
                  />
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>Evidence Audit URL</Text>
                <TextInput
                  style={styles.modalTextInput}
                  placeholder="https://github.com/log-reference"
                  placeholderTextColor={colors.mutedText}
                  autoCapitalize="none"
                  value={itemEvidenceUrl}
                  onChangeText={setItemEvidenceUrl}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>Attachment Asset Evidence (Screenshot/PDF)</Text>
                <TouchableOpacity style={[styles.button, styles.btnOutline, styles.flexRow]} onPress={handleDocumentPick} activeOpacity={0.7}>
                  <Upload size={14} color={colors.text} style={styles.marginRight6} />
                  <Text style={styles.btnOutlineText} numberOfLines={1}>
                    {itemEvidenceFile ? "Replace Embedded Asset Reference" : "Upload Verification File"}
                  </Text>
                </TouchableOpacity>
                {itemEvidenceFile ? <Text style={styles.fileUriLabelText} numberOfLines={1}>{itemEvidenceFile}</Text> : null}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>Action Clarification Notes</Text>
                <TextInput
                  style={[styles.modalTextInput, styles.multilineInput]}
                  placeholder="Log any operational adjustments made to resolve or execute task..."
                  placeholderTextColor={colors.mutedText}
                  multiline
                  numberOfLines={3}
                  value={itemNotes}
                  onChangeText={setItemNotes}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooterActions}>
              <TouchableOpacity style={[styles.button, styles.btnOutline, styles.marginRight8]} onPress={() => setEditingItem(null)} activeOpacity={0.7}>
                <Text style={styles.btnOutlineText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.btnPrimary, { flex: 1 }]} onPress={() => editingItem && saveChecklistItem(editingItem)} disabled={actionLoading} activeOpacity={0.8}>
                {actionLoading ? <ActivityIndicator size="small" color={colors.primaryText} /> : <Text style={styles.btnPrimaryText}>Commit Verification</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* =========================================================================
          MODAL 4: ADMIN PARAMETER OVERRIDE CONTROLS
          ========================================================================= */}
      <Modal visible={isOverrideOpen} animationType="fade" transparent onRequestClose={() => setIsOverrideOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContentMedium}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Privileged Parameter Override</Text>
              <TouchableOpacity onPress={() => setIsOverrideOpen(false)} activeOpacity={0.7}>
                <X size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalFormScroll}>
              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>Forced Readiness Score (0-100)</Text>
                <TextInput
                  style={styles.modalTextInput}
                  placeholder="Leave empty to let system auto-calculate score"
                  placeholderTextColor={colors.mutedText}
                  keyboardType="numeric"
                  value={overrideScore}
                  onChangeText={setOverrideScore}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>Enforced Launch Status Override</Text>
                <TouchableOpacity
                  style={styles.dropdownTrigger}
                  onPress={() => openPicker("overrideStatus", [
                    { label: "Keep Current Status", value: "" },
                    { label: "Live", value: "Live" },
                    { label: "Maintenance", value: "Maintenance" },
                    { label: "Development", value: "Development" },
                    { label: "Offline", value: "Offline" }
                  ])}
                  activeOpacity={0.7}
                >
                  <Text style={styles.dropdownValue}>{overrideStatus || "Keep Current Status"}</Text>
                  <ChevronDown size={14} color={colors.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>Administrative Justification Reason *</Text>
                <TextInput
                  style={[styles.modalTextInput, styles.multilineInput]}
                  placeholder="Log the security or business justification for bypassing template criteria limits..."
                  placeholderTextColor={colors.mutedText}
                  multiline
                  numberOfLines={3}
                  value={overrideReason}
                  onChangeText={setOverrideReason}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooterActions}>
              <TouchableOpacity style={[styles.button, styles.btnOutline, styles.marginRight8]} onPress={() => setIsOverrideOpen(false)} activeOpacity={0.7}>
                <Text style={styles.btnOutlineText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.btnPrimary, { backgroundColor: colors.red, flex: 1 }]} onPress={submitOverride} disabled={actionLoading} activeOpacity={0.8}>
                {actionLoading ? <ActivityIndicator size="small" color="#ffffff" /> : <Text style={[styles.btnPrimaryText, { color: "#ffffff" }]}>Apply Override</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* =========================================================================
          MODAL 5: CUSTOM DROPDOWN PICKER SELECTOR PANEL
          ========================================================================= */}
      <Modal visible={pickerField.visible} animationType="fade" transparent onRequestClose={() => setPickerField({ visible: false, type: "", options: null })}>
        <View style={styles.pickerBackdropOuter}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setPickerField({ visible: false, type: "", options: null })} />
          <View style={styles.pickerInnerPanelCard}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitleHeaderText}>Select Option</Text>
              <TouchableOpacity onPress={() => setPickerField({ visible: false, type: "", options: null })} activeOpacity={0.7}>
                <X size={18} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.pickerOptionsContainerScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {pickerField.options && pickerField.options.length > 0 ? (
                pickerField.options.map((opt) => (
                  <TouchableOpacity key={opt.value} style={styles.pickerOptionItemRow} onPress={() => handlePickerSelect(opt.value)} activeOpacity={0.7}>
                    <Text style={styles.pickerOptionLabelText}>{opt.label}</Text>
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={styles.emptyStateText}>No options available</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

// =========================================================================
// STYLE ENGINE CREATOR
// =========================================================================
function createStyles(
  colors: any,
  isMetallic: boolean,
  isTablet: boolean,
  isSmallScreen: boolean,
  wp: (percentage: number) => number,
  hp: (percentage: number) => number,
  windowHeight: number,
  windowWidth: number,
  isDark: boolean
) {
  return StyleSheet.create({
    safeContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    mainScroll: {
      paddingHorizontal: isTablet ? wp(6) : wp(4),
      paddingTop: hp(2),
      paddingBottom: hp(6),
    },
    headerRow: {
      marginBottom: hp(2),
    },
    titleWrapper: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: hp(0.6),
    },
    headerIcon: {
      marginRight: wp(2),
    },
    mainTitleText: {
      fontSize: isTablet ? 24 : 20,
      fontWeight: "800",
      color: colors.text,
      letterSpacing: -0.3,
    },
    subtitleText: {
      fontSize: isTablet ? 14 : 12,
      color: colors.mutedText,
      lineHeight: isTablet ? 20 : 17,
    },
    actionButtonsRow: {
      flexDirection: "row",
      marginBottom: hp(2),
    },
    button: {
      height: hp(4.8),
      borderRadius: wp(2),
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: wp(3.5),
    },
    btnOutline: {
      backgroundColor: colors.primary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    btnOutlineText: {
      fontSize: isTablet ? 13 : 12,
      fontWeight: "600",
      color: colors.text,
    },
    btnPrimary: {
      backgroundColor: isMetallic ? colors.metallicGold : colors.primary,
    },
    btnPrimaryText: {
      fontSize: isTablet ? 13 : 12,
      fontWeight: "700",
      color: colors.primaryText,
    },
    flexRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    flex1: {
      flex: 1,
    },
    flexWrap: {
      flexWrap: "wrap",
    },
    marginRight4: { marginRight: 4 },
    marginRight6: { marginRight: 6 },
    marginRight8: { marginRight: 8 },
    marginLeft4: { marginLeft: 4 },
    marginLeft6: { marginLeft: 6 },
    marginTop4: { marginTop: 4 },
    marginTop6: { marginTop: 6 },
    marginTop10: { marginTop: 10 },
    marginBottom4: { marginBottom: 4 },
    spin: { transform: [{ rotate: "45deg" }] },
    
    // Cards Layout
    analyticsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      marginBottom: hp(1),
      gap: wp(2),
    },
    card: {
      width: isTablet ? "23.5%" : "48%",
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: wp(3),
      padding: wp(3.5),
      marginBottom: hp(1.2),
      position: "relative",
    },
    cardDesc: {
      fontSize: isTablet ? 12 : 11,
      color: colors.mutedText,
      fontWeight: "500",
    },
    cardTitle: {
      fontSize: isTablet ? 24 : 20,
      fontWeight: "800",
      color: colors.text,
      marginVertical: hp(0.5),
    },
    cardTitleSub: {
      fontSize: 12,
      color: colors.mutedText,
      fontWeight: "400",
    },
    textGold: {
      color: colors.metallicGold,
    },
    progressTrack: {
      height: 4,
      backgroundColor: colors.border,
      borderRadius: 2,
      width: "100%",
      overflow: "hidden",
    },
    progressBar: {
      height: "100%",
    },
    miniCardText: {
      fontSize: isTablet ? 11 : 10,
      color: colors.mutedText,
    },
    dotContainer: {
      flexDirection: "row",
      marginTop: hp(0.8),
    },
    indicatorDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      marginRight: 4,
    },
    
    // Filters Panel Layout
    filterCard: {
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: wp(3),
      padding: wp(4),
      marginBottom: hp(2),
      position: "relative",
    },
    filterCardTitle: {
      fontSize: isTablet ? 15 : 14,
      fontWeight: "700",
      color: colors.text,
    },
    filterCardDesc: {
      fontSize: isTablet ? 12 : 11,
      color: colors.mutedText,
      marginBottom: hp(1.2),
    },
    inputGroup: {
      marginBottom: hp(1.5),
    },
    fieldLabel: {
      fontSize: isTablet ? 13 : 12,
      fontWeight: "600",
      color: colors.mutedText,
      marginBottom: hp(0.6),
    },
    searchContainer: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.inputBg,
      borderRadius: wp(2),
      height: hp(4.8),
      paddingHorizontal: wp(3),
    },
    searchIconNative: {
      marginRight: wp(2),
    },
    nativeInputStyle: {
      flex: 1,
      color: colors.mutedText,
      fontSize: isTablet ? 13 : 12,
    },
    dropdownTrigger: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.inputBg,
      borderRadius: wp(2),
      height: hp(4.8),
      paddingHorizontal: wp(3),
    },
    dropdownValue: {
      fontSize: isTablet ? 13 : 12,
      color: colors.mutedText,
      fontWeight: "500",
    },
    
    // Leaderboard Blocks
    leaderboardRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: hp(1),
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    leaderboardBadge: {
      width: 20,
      height: 20,
      borderRadius: 10,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 8,
    },
    leaderboardBadgeText: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.text,
    },
    leaderboardName: {
      fontSize: isTablet ? 13 : 12,
      fontWeight: "500",
      color: colors.text,
    },
    badgeWrapperInline: {
      backgroundColor: colors.primary,
      paddingHorizontal: 2,
      paddingVertical: 2,
      borderRadius: 4,
    },
    inlineBadgeText: {
      fontSize: 11,
      color: colors.text,
    },
    emptyStateText: {
      fontSize: isTablet ? 12 : 11,
      color: colors.mutedText,
      textAlign: "center",
      paddingVertical: hp(1),
    },

    // Horizontal Datatable Layout
    tableCard: {
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: wp(3),
      paddingVertical: hp(1.8),
      marginBottom: hp(2),
      position: "relative",
    },
    tableHeaderContainer: {
      paddingHorizontal: wp(4),
      marginBottom: hp(1.2),
    },
    tableLoaderWrapper: {
      alignItems: "center",
      paddingVertical: hp(3),
    },
    loaderSubText: {
      fontSize: 12,
      color: colors.mutedText,
      marginTop: 6,
    },
    tableEmptyText: {
      fontSize: isTablet ? 13 : 12,
      color: colors.mutedText,
      textAlign: "center",
      paddingHorizontal: wp(4),
      paddingVertical: hp(2),
    },
    horizontalTableContainer: {
      flexDirection: "column",
    },
    tableRowHeader: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingHorizontal: wp(4),
      paddingVertical: hp(1.2),
      backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
    },
    tableCellHeader: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.mutedText,
      textTransform: "uppercase",
    },
    tableRowBody: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingHorizontal: wp(4),
      paddingVertical: hp(1.4),
    },
    siteNameTextTable: {
      fontSize: isTablet ? 14 : 13,
      fontWeight: "700",
      color: colors.text,
    },
    siteUrlTextTable: {
      fontSize: 11,
      color: colors.mutedText,
      marginBottom: 4,
    },
    miniBadgeStyle: {
      backgroundColor: colors.border,
      paddingHorizontal: 5,
      paddingVertical: 1,
      borderRadius: 4,
      marginRight: 4,
    },
    miniBadgeText: {
      fontSize: 9,
      fontWeight: "600",
      color: colors.primary,
    },
    marginBackdropOutline: {
      backgroundColor: "transparent",
      borderWidth: 0.5,
      borderColor: colors.mutedText,
    },
    leadDevText: {
      fontSize: isTablet ? 13 : 12,
      fontWeight: "600",
      color: colors.text,
    },
    buText: {
      fontSize: 11,
      color: colors.mutedText,
    },
    dateLabelText: {
      fontSize: isTablet ? 13 : 12,
      color: colors.text,
    },
    countdownValueText: {
      fontSize: 11,
      fontWeight: "600",
      color: colors.amber,
    },
    scoreTag: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      alignSelf: "flex-start",
    },
    scoreTagText: {
      fontSize: 11,
      fontWeight: "700",
      color: "#fff",
    },
    overrideTagBadge: {
      backgroundColor: "rgba(239, 68, 68, 0.1)",
      borderWidth: 0.5,
      borderColor: colors.red,
      paddingHorizontal: 4,
      paddingVertical: 1,
      borderRadius: 4,
      alignSelf: "flex-start",
      marginTop: 3,
    },
    overrideTagBadgeText: {
      fontSize: 9,
      color: colors.red,
      fontWeight: "600",
    },

    // Audit logs engine styles
    auditLogContainer: {
      paddingHorizontal: wp(4),
    },
    auditEmptyText: {
      fontSize: 12,
      color: colors.mutedText,
      paddingVertical: hp(1.2),
    },
    auditLogRow: {
      paddingVertical: hp(1.2),
      borderBottomWidth: 0.5,
      borderBottomColor: colors.border,
    },
    auditActionBadge: {
      backgroundColor: "rgba(0, 198, 255, 0.1)",
      paddingHorizontal: 5,
      paddingVertical: 1,
      borderRadius: 4,
    },
    auditActionText: {
      fontSize: 10,
      fontWeight: "700",
      color: colors.primary,
      textTransform: "uppercase",
    },
    auditUserText: {
      fontSize: 11,
      color: colors.mutedText,
    },
    auditNotesText: {
      fontSize: 12,
      color: colors.text,
      marginTop: 4,
      paddingLeft: 4,
      borderLeftWidth: 2,
      borderLeftColor: colors.border,
    },

    // Premium Rivets
    rivet: {
      position: "absolute",
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
    },

    // Modals Engineering Layout
    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.75)",
      justifyContent: "center",
      alignItems: "center",
      padding: wp(4),
    },
    modalContentLarge: {
      backgroundColor: colors.primaryBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: wp(4),
      width: "100%",
      maxWidth: isTablet ? 650 : "100%",
      maxHeight: windowHeight * 0.85,
      padding: wp(4),
    },
    modalContentMedium: {
      backgroundColor: colors.primaryBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: wp(4),
      width: "100%",
      maxWidth: isTablet ? 550 : "100%",
      maxHeight: windowHeight * 0.75,
      padding: wp(4),
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingBottom: hp(1.4),
      marginBottom: hp(1.4),
    },
    modalTitle: {
      fontSize: isTablet ? 17 : 15,
      fontWeight: "700",
      color: colors.text,
    },
    modalSubTitleText: {
      fontSize: isTablet ? 12 : 11,
      color: colors.mutedText,
      marginTop: 2,
    },
    modalFormScroll: {
      paddingBottom: hp(2),
    },
    modalTextInput: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.inputBg,
      borderRadius: wp(2),
      height: hp(4.8),
      paddingHorizontal: wp(3),
      fontSize: isTablet ? 13 : 12,
      color: colors.text,
    },
    multilineInput: {
      height: hp(9),
      paddingTop: hp(1),
      textAlignVertical: "top",
    },
    modalFooterActions: {
      flexDirection: "row",
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: hp(1.4),
      marginTop: hp(1),
    },
    centeredLoader: {
      paddingVertical: hp(5),
      alignItems: "center",
    },

    // Checklist components within Drawer
    adminActionBanner: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(239, 68, 68, 0.08)",
      borderWidth: 1,
      borderColor: "rgba(239, 68, 68, 0.2)",
      borderRadius: wp(2),
      padding: wp(2.5),
      marginBottom: hp(1.5),
    },
    adminBannerText: {
      fontSize: isTablet ? 12 : 11,
      fontWeight: "600",
      color: colors.text,
      flex: 1,
    },
    miniBtnOverride: {
      height: hp(3.6),
      paddingHorizontal: wp(2.5),
    },
    drawerScoreBlock: {
      backgroundColor: colors.inputBg,
      borderRadius: wp(2.5),
      padding: wp(3),
      marginBottom: hp(2),
      borderWidth: 1,
      borderColor: colors.border,
    },
    drawerScoreValue: {
      fontSize: isTablet ? 18 : 16,
      fontWeight: "800",
      color: colors.mutedText,
      marginBottom: hp(0.6),
    },
    categoryDividerTitle: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.mutedText,
      textTransform: "uppercase",
      marginBottom: hp(1),
      letterSpacing: 0.5,
    },
    accordionContainer: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: wp(2.5),
      marginBottom: hp(1.2),
      overflow: "hidden",
      backgroundColor: colors.cardBg,
    },
    accordionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: wp(3.5),
      backgroundColor: colors.inputBg,
    },
    accordionTitleText: {
      fontSize: isTablet ? 14 : 13,
      fontWeight: "700",
      color: colors.mutedText,
    },
    accordionBodyContent: {
      padding: wp(3),
    },
    checkItemCard: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: wp(2),
      padding: wp(2.5),
      marginBottom: hp(1.2),
      backgroundColor: colors.inputBg,
    },
    flexRowHeaderItem: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    checkItemTitle: {
      fontSize: isTablet ? 13 : 12,
      fontWeight: "600",
      color: colors.text,
    },
    checkItemDesc: {
      fontSize: 11,
      color: colors.mutedText,
      marginTop: 2,
    },
    statusIndicatorTag: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      height: 18,
      justifyContent: "center",
    },
    statusIndicatorText: {
      fontSize: 9,
      fontWeight: "700",
      color: "#fff",
      textTransform: "uppercase",
    },
    evidenceNotesPreview: {
      fontSize: 11,
      color: colors.mutedText,
      backgroundColor: colors.cardBg,
      padding: 6,
      borderRadius: 4,
      marginTop: 6,
    },
    fileUriLabelText: {
      fontSize: 11,
      color: colors.primary,
      marginTop: 4,
    },

    // Custom selector layout
    pickerBackdropOuter: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.75)",
      justifyContent: "center",
      alignItems: "center",
      padding: wp(4),
    },
    pickerInnerPanelCard: {
      backgroundColor: colors.modalBg,
      borderRadius: wp(3),
      width: "100%",
      maxWidth: isTablet ? 400 : 320,
      maxHeight: windowHeight * 0.5,
      padding: wp(4),
      borderWidth: 1,
      borderColor: colors.border,
      elevation: 5,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
    },
    pickerHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingBottom: hp(1),
      marginBottom: hp(1),
    },
    pickerTitleHeaderText: {
      fontSize: isTablet ? 14 : 13,
      fontWeight: "700",
      color: colors.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    pickerOptionsContainerScroll: {
      marginBottom: hp(1),
    },
    pickerOptionItemRow: {
      paddingVertical: hp(1.4),
      borderBottomWidth: 0.5,
      borderBottomColor: colors.border,
      alignItems: "center",
    },
    pickerOptionLabelText: {
      fontSize: isTablet ? 14 : 13,
      color: colors.textMuted,
      fontWeight: "600",
      textAlign: "left"
    },
  });
}