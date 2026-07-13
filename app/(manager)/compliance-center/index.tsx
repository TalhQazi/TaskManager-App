import React, { useEffect, useState, useMemo } from "react";
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
import { apiFetch, toProxiedUrl } from "@/lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Shield,
  RefreshCw,
  Plus,
  TrendingUp,
  Search,
  Calendar,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  X,
  User,
  Clock,
  History,
  Lock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  ArrowRight,
  FileText
} from "lucide-react-native";

// --- Types & Interfaces ---
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
  const { uiTheme } = useTheme();
  const isMetallic = true;//uiTheme?.theme === "metallic-elite";
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "super-admin";

  // Data state
  const [websites, setWebsites] = useState<Website[]>([]);
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [report, setReport] = useState<ComplianceReport | null>(null);

  // Loading state
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Filters state
  const [search, setSearch] = useState("");
  const [scoreFilter, setScoreFilter] = useState("all");
  const [envFilter, setEnvFilter] = useState("all");
  const [buFilter, setBuFilter] = useState("all");

  // Selection state
  const [selectedWebsite, setSelectedWebsite] = useState<Website | null>(null);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [siteHistory, setSiteHistory] = useState<ChecklistHistory[]>([]);
  
  // Modals visibility state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isOverrideOpen, setIsOverrideOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Custom Selector Modals for Dropdowns on mobile
  const [activePicker, setActivePicker] = useState<{ type: string; current: string; options: string[] } | null>(null);

  // Override Form state
  const [overrideScore, setOverrideScore] = useState("");
  const [overrideStatus, setOverrideStatus] = useState("");
  const [overrideReason, setOverrideReason] = useState("");

  // Accordion open tracker for checklist categories
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  // Create website form state
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

  // Edit checkpoint entry state
  const [editingItem, setEditingItem] = useState<ChecklistItem | null>(null);
  const [itemStatus, setItemStatus] = useState<ChecklistItem["status"]>("pending");
  const [itemNotes, setItemNotes] = useState("");
  const [itemEvidenceUrl, setItemEvidenceUrl] = useState("");
  const [itemEvidenceFile, setItemEvidenceFile] = useState("");
  const [itemBlockedReason, setItemBlockedReason] = useState("");

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
      console.error(err);
      Alert.alert("Error", "Failed to load compliance records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
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

  // Safe file loader abstracting base64 strings
  const simulateEvidenceUpload = () => {
    // In React Native, this would use DocumentPicker / ImagePicker
    // Setting clean sample mock base64 to match web file conversion workflows
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

  // Theme-color helpers
  const themeStyles = {
    bg: isMetallic ? "#111315" : "#f8fafc",
    cardBg: isMetallic ? "#2b2c2d" : "#ffffff",
    border: isMetallic ? "rgba(255,210,122,0.2)" : "#e2e8f0",
    text: isMetallic ? "#ffffff" : "#0f172a",
    mutedText: isMetallic ? "#a1a1aa" : "#64748b",
    primary: isMetallic ? "#ffd27a" : "#133767",
    accent: isMetallic ? "#d8a537" : "#00C6FF",
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
    else if (type === "websiteType") setNewSite({ ...newSite, websiteType: value as any });
    else if (type === "environment") setNewSite({ ...newSite, environment: value });
    else if (type === "businessUnit") setNewSite({ ...newSite, businessUnit: value });
    else if (type === "complianceTemplate") setNewSite({ ...newSite, complianceTemplate: value });
    else if (type === "overrideStatus") setOverrideStatus(value);
    else if (type === "itemStatus") setItemStatus(value as any);

    setActivePicker(null);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeStyles.bg }]}>
      {/* Main List holding headers, metrics, and items avoiding view nesting limits */}
      <FlatList
        data={filteredWebsites}
        keyExtractor={(item) => item._id}
        refreshing={loading}
        onRefresh={() => void loadData()}
        ListHeaderComponent={
          <View style={styles.headerPadding}>
            {/* Title Section */}
            <View style={styles.topBar}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Shield size={28} color={themeStyles.primary} />
                <Text style={[styles.mainTitle, { color: themeStyles.text }]}>Compliance Center</Text>
              </View>
              <View style={styles.actionRow}>
                <TouchableOpacity style={[styles.btnOutline, { borderColor: themeStyles.border }]} onPress={() => void loadData()}>
                  <RefreshCw size={14} color={themeStyles.text} />
                  <Text style={[styles.btnOutlineText, { color: themeStyles.text }]}>Sync</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btnPrimary, { backgroundColor: themeStyles.primary }]} onPress={() => setIsCreateOpen(true)}>
                  <Plus size={14} color={isMetallic ? "#000" : "#fff"} />
                  <Text style={[styles.btnPrimaryText, { color: isMetallic ? "#000" : "#fff" }]}>Register</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Metrics Dashboard */}
            {report && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll} contentContainerStyle={{ gap: 12 }}>
                <View style={[styles.statCard, { backgroundColor: themeStyles.cardBg, borderColor: themeStyles.border }]}>
                  <Text style={[styles.statLabel, { color: themeStyles.mutedText }]}>Average Score</Text>
                  <Text style={[styles.statValue, { color: themeStyles.primary }]}>{report.avgScore}%</Text>
                  <Text style={[styles.statSub, { color: themeStyles.mutedText }]}>{report.totalWebsites} Pipelines tracked</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: themeStyles.cardBg, borderColor: themeStyles.border }]}>
                  <Text style={[styles.statLabel, { color: themeStyles.mutedText }]}>Green (100%)</Text>
                  <Text style={styles.textGreen}>{report.statusBreakdown.green} sites</Text>
                  <Text style={[styles.statSub, { color: themeStyles.mutedText }]}>Fully Compliant</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: themeStyles.cardBg, borderColor: themeStyles.border }]}>
                  <Text style={[styles.statLabel, { color: themeStyles.mutedText }]}>Yellow (80-99%)</Text>
                  <Text style={styles.textAmber}>{report.statusBreakdown.yellow} sites</Text>
                  <Text style={[styles.statSub, { color: themeStyles.mutedText }]}>Approaching Verification</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: themeStyles.cardBg, borderColor: themeStyles.border }]}>
                  <Text style={[styles.statLabel, { color: themeStyles.mutedText }]}>Red (&lt;80%)</Text>
                  <Text style={styles.textRed}>{report.statusBreakdown.red} sites</Text>
                  <Text style={[styles.statSub, { color: themeStyles.mutedText }]}>Early Stage / Action Required</Text>
                </View>
              </ScrollView>
            )}

            {/* Filter Panel */}
            <View style={[styles.filterContainer, { backgroundColor: themeStyles.cardBg, borderColor: themeStyles.border }]}>
              <Text style={[styles.sectionTitle, { color: themeStyles.text }]}>Filters</Text>
              <View style={styles.searchWrapper}>
                <Search size={16} color={themeStyles.mutedText} style={styles.searchIcon} />
                <TextInput
                  placeholder="Search project domain or lead..."
                  placeholderTextColor={themeStyles.mutedText}
                  value={search}
                  onChangeText={setSearch}
                  style={[styles.inputField, { color: themeStyles.text, borderColor: themeStyles.border }]}
                />
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ marginTop: 8 }}>
                <TouchableOpacity style={[styles.dropdownTrigger, { borderColor: themeStyles.border }]} onPress={() => openPicker("scoreFilter", scoreFilter, ["all", "green", "yellow", "red"])}>
                  <Text style={[styles.dropdownTriggerText, { color: themeStyles.text }]}>Score: {scoreFilter}</Text>
                  <ChevronDown size={14} color={themeStyles.mutedText} />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.dropdownTrigger, { borderColor: themeStyles.border }]} onPress={() => openPicker("envFilter", envFilter, ["all", "Production", "Staging", "Development"])}>
                  <Text style={[styles.dropdownTriggerText, { color: themeStyles.text }]}>Env: {envFilter}</Text>
                  <ChevronDown size={14} color={themeStyles.mutedText} />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.dropdownTrigger, { borderColor: themeStyles.border }]} onPress={() => openPicker("buFilter", buFilter, ["all", "Marketing", "SaaS", "E-Commerce", "Operations"])}>
                  <Text style={[styles.dropdownTriggerText, { color: themeStyles.text }]}>BU: {buFilter}</Text>
                  <ChevronDown size={14} color={themeStyles.mutedText} />
                </TouchableOpacity>
              </ScrollView>
            </View>

            <Text style={[styles.listHeaderTitle, { color: themeStyles.text }]}>Monitored Launch Pipelines</Text>
          </View>
        }
        renderItem={({ item }) => {
          const countdown = getCountdownDays(item.launchDate);
          return (
            <View style={[styles.siteCard, { backgroundColor: themeStyles.cardBg, borderColor: themeStyles.border }]}>
              <View style={styles.siteHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.siteNameText, { color: themeStyles.text }]}>{item.siteName}</Text>
                  <Text style={[styles.siteUrlText, { color: themeStyles.accent }]}>{item.url}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: item.readinessScore === 100 ? "#22c55e" : item.readinessScore >= 80 ? "#f59e0b" : "#ef4444" }]}>
                  <Text style={styles.badgeText}>{item.readinessScore}%</Text>
                </View>
              </View>

              <View style={styles.detailsGrid}>
                <View>
                  <Text style={[styles.detailLabel, { color: themeStyles.mutedText }]}>Lead Developer</Text>
                  <Text style={[styles.detailValue, { color: themeStyles.text }]}>{item.leadDeveloper || "Unassigned"}</Text>
                </View>
                <View>
                  <Text style={[styles.detailLabel, { color: themeStyles.mutedText }]}>Unit / Env</Text>
                  <Text style={[styles.detailValue, { color: themeStyles.text }]}>{item.businessUnit} • {item.environment}</Text>
                </View>
              </View>

              {item.launchDate && (
                <View style={styles.countdownRow}>
                  <Calendar size={14} color={themeStyles.mutedText} />
                  <Text style={[styles.countdownText, { color: themeStyles.text }]}>
                    {new Date(item.launchDate).toLocaleDateString()} ({countdown !== null && countdown > 0 ? `${countdown} days left` : countdown === 0 ? "Launch Day!" : "Launched"})
                  </Text>
                </View>
              )}

              {item.overrideReason && (
                <View style={styles.overrideIndicator}>
                  <Lock size={12} color="#a855f7" />
                  <Text style={styles.overrideIndicatorText} numberOfLines={1}>Forced: {item.overrideReason}</Text>
                </View>
              )}

              <TouchableOpacity style={[styles.viewChecklistBtn, { backgroundColor: themeStyles.primary }]} onPress={() => openComplianceDrawer(item)}>
                <Text style={[styles.viewChecklistBtnText, { color: isMetallic ? "#000" : "#fff" }]}>View Checklist & Audits</Text>
                <ChevronRight size={14} color={isMetallic ? "#000" : "#fff"} />
              </TouchableOpacity>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyView}>
            <Text style={{ color: themeStyles.mutedText }}>No pipelines match active filter queries.</Text>
          </View>
        }
        ListFooterComponent={
          /* Global Contributions Leaderboard inside safe footer view */
          <View style={styles.footerContainer}>
            <View style={[styles.leaderboardCard, { backgroundColor: themeStyles.cardBg, borderColor: themeStyles.border }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 }}>
                <TrendingUp size={18} color={themeStyles.primary} />
                <Text style={[styles.sectionTitle, { color: themeStyles.text, marginBottom: 0 }]}>Employee Leaderboard</Text>
              </View>
              {leaderboard.map((item, idx) => (
                <View key={item.username} style={[styles.leaderboardRow, { borderBottomColor: themeStyles.border }]}>
                  <Text style={[styles.leaderboardRank, { color: themeStyles.primary }]}>#{idx + 1}</Text>
                  <Text style={[styles.leaderboardName, { color: themeStyles.text }]}>{item.username}</Text>
                  <Text style={[styles.leaderboardCount, { color: themeStyles.mutedText }]}>{item.count} tasks done</Text>
                </View>
              ))}
            </View>
          </View>
        }
      />

      {/* --- SIDE/DRAWER CHECKLIST DETAILS MODAL --- */}
      <Modal visible={isDrawerOpen} animationType="slide" onRequestClose={closeDrawer}>
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: themeStyles.bg }]}>
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.modalTitle, { color: themeStyles.text }]}>{selectedWebsite?.siteName} Checklist</Text>
              <Text style={[styles.modalSubtitle, { color: themeStyles.mutedText }]}>{selectedWebsite?.environment} • {selectedWebsite?.businessUnit}</Text>
            </View>
            <TouchableOpacity onPress={closeDrawer} style={styles.closeBtn}>
              <X size={20} color={themeStyles.text} />
            </TouchableOpacity>
          </View>

          {actionLoading && checklistItems.length === 0 ? (
            <View style={styles.loaderCentering}>
              <ActivityIndicator size="large" color={themeStyles.primary} />
            </View>
          ) : (
            <ScrollView style={styles.modalScrollBody} contentContainerStyle={{ paddingBottom: 32 }}>
              {/* Admin Force Buttons */}
              {isAdmin && (
                <TouchableOpacity style={styles.adminOverrideTrigger} onPress={() => { setOverrideScore(String(selectedWebsite?.readinessScore || "")); setOverrideStatus(selectedWebsite?.status || ""); setIsOverrideOpen(true); }}>
                  <Lock size={14} color="#a855f7" />
                  <Text style={styles.adminOverrideTriggerText}>Access Admin Override Panel</Text>
                </TouchableOpacity>
              )}

              {/* Categorized Accordion Elements */}
              {Object.entries(groupedChecklistItems).map(([category, items]) => {
                const isExpanded = !!expandedCategories[category];
                const completedCount = items.filter((i) => i.status === "completed").length;
                return (
                  <View key={category} style={[styles.accordionBox, { backgroundColor: themeStyles.cardBg, borderColor: themeStyles.border }]}>
                    <TouchableOpacity style={styles.accordionHeader} onPress={() => toggleCategory(category)}>
                      <Text style={[styles.accordionTitle, { color: themeStyles.text }]}>{category}</Text>
                      <View style={styles.accordionBadgeRow}>
                        <View style={styles.miniBadge}>
                          <Text style={styles.miniBadgeText}>{completedCount}/{items.length} Done</Text>
                        </View>
                        {isExpanded ? <ChevronDown size={16} color={themeStyles.text} /> : <ChevronRight size={16} color={themeStyles.text} />}
                      </View>
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={styles.accordionContent}>
                        {items.map((item) => {
                          const isEditing = editingItem?._id === item._id;
                          return (
                            <View key={item._id} style={[styles.checkpointItem, { borderColor: themeStyles.border }]}>
                              <View style={styles.checkpointTop}>
                                <View style={styles.checkpointStatusIndicator}>
                                  {item.status === "completed" ? <CheckCircle2 size={16} color="#22c55e" /> : item.status === "blocked" ? <XCircle size={16} color="#ef4444" /> : <AlertTriangle size={16} color="#f59e0b" />}
                                  <Text style={[styles.checkpointTitleText, { color: themeStyles.text }]}>{item.title}</Text>
                                </View>
                                {item.requiresEvidence && <Text style={styles.evidenceLabelAlert}>Evidence Required</Text>}
                              </View>
                              <Text style={[styles.checkpointDescText, { color: themeStyles.mutedText }]}>{item.description}</Text>

                              {item.notes && !isEditing && (
                                <View style={styles.notesBlock}><Text style={styles.notesText}><Text style={{ fontWeight: "bold" }}>Notes: </Text>{item.notes}</Text></View>
                              )}
                              {item.status === "blocked" && item.blockedReason && !isEditing && (
                                <View style={styles.blockedBlock}><Text style={styles.blockedText}><Text style={{ fontWeight: "bold" }}>Reason: </Text>{item.blockedReason}</Text></View>
                              )}

                              {isEditing ? (
                                <View style={styles.editCheckpointForm}>
                                  <Text style={styles.formSectionLabel}>Change Verification Status</Text>
                                  <TouchableOpacity style={[styles.dropdownTrigger, { borderColor: themeStyles.border, marginBottom: 8 }]} onPress={() => openPicker("itemStatus", itemStatus, ["pending", "in-progress", "blocked", "completed"])}>
                                    <Text style={[styles.dropdownTriggerText, { color: themeStyles.text }]}>{itemStatus}</Text>
                                    <ChevronDown size={14} color={themeStyles.mutedText} />
                                  </TouchableOpacity>

                                  <Text style={styles.formSectionLabel}>Evidence Resource Link URL</Text>
                                  <TextInput value={itemEvidenceUrl} onChangeText={setItemEvidenceUrl} placeholder="https://..." placeholderTextColor={themeStyles.mutedText} style={[styles.inputField, { color: themeStyles.text, borderColor: themeStyles.border, marginBottom: 8 }]} />

                                  {itemStatus === "blocked" && (
                                    <>
                                      <Text style={styles.formSectionLabel}>Reason Blocked *</Text>
                                      <TextInput value={itemBlockedReason} onChangeText={setItemBlockedReason} placeholder="Explain block root cause..." placeholderTextColor={themeStyles.mutedText} style={[styles.inputField, { color: themeStyles.text, borderColor: themeStyles.border, marginBottom: 8 }]} />
                                    </>
                                  )}

                                  <TouchableOpacity style={styles.uploadSimulatedBtn} onPress={simulateEvidenceUpload}>
                                    <Text style={styles.uploadSimulatedBtnText}>{itemEvidenceFile ? "✓ File Ready" : "Attach Screenshot Evidence"}</Text>
                                  </TouchableOpacity>

                                  <Text style={styles.formSectionLabel}>Audit Verification Notes</Text>
                                  <TextInput value={itemNotes} onChangeText={setItemNotes} placeholder="Add verification confirmation metrics..." placeholderTextColor={themeStyles.mutedText} multiline numberOfLines={2} style={[styles.inputField, { color: themeStyles.text, borderColor: themeStyles.border, height: 50, textAlignVertical: "top" }]} />

                                  <View style={styles.editActionRow}>
                                    <TouchableOpacity style={styles.btnCancelMini} onPress={() => setEditingItem(null)}><Text style={{ color: "#ef4444" }}>Cancel</Text></TouchableOpacity>
                                    <TouchableOpacity style={[styles.btnSaveMini, { backgroundColor: themeStyles.primary }]} onPress={() => void saveChecklistItem(item)}><Text style={{ color: isMetallic ? "#000" : "#fff", fontWeight: "bold" }}>Save</Text></TouchableOpacity>
                                  </View>
                                </View>
                              ) : (
                                <TouchableOpacity style={styles.updateCheckpointTriggerRow} onPress={() => { setEditingItem(item); setItemStatus(item.status); setItemNotes(item.notes || ""); setItemEvidenceUrl(item.evidenceUrl || ""); setItemEvidenceFile(""); setItemBlockedReason(item.blockedReason || ""); }}>
                                  <Text style={{ color: themeStyles.accent, fontSize: 12, fontWeight: "600" }}>Update Checkpoint</Text>
                                  <ArrowRight size={12} color={themeStyles.accent} />
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

              {/* History Trail Logs within Drawer */}
              <View style={[styles.historyWrapper, { backgroundColor: themeStyles.cardBg, borderColor: themeStyles.border }]}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 }}>
                  <History size={16} color={themeStyles.text} />
                  <Text style={[styles.sectionTitle, { color: themeStyles.text, marginBottom: 0 }]}>Checkpoint Audit Trail</Text>
                </View>
                {siteHistory.length === 0 ? (
                  <Text style={{ color: themeStyles.mutedText, fontSize: 12, textAlign: "center", paddingVertical: 12 }}>No execution signatures registered yet.</Text>
                ) : (
                  siteHistory.map((log) => (
                    <View key={log._id} style={styles.historyLogItem}>
                      <View style={styles.historyLogMeta}>
                        <Text style={[styles.logUser, { color: themeStyles.text }]}>{log.username}</Text>
                        <Text style={{ color: themeStyles.mutedText, fontSize: 10 }}>{new Date(log.createdAt).toLocaleDateString()}</Text>
                      </View>
                      <Text style={[styles.logNotes, { color: themeStyles.text }]}>{log.notes}</Text>
                    </View>
                  ))
                )}
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* --- REGISTER SITE ENTRY DIALOG --- */}
      <Modal visible={isCreateOpen} animationType="slide" onRequestClose={() => setIsCreateOpen(false)}>
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: themeStyles.bg }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: themeStyles.text }]}>Register Website Launch</Text>
            <TouchableOpacity onPress={() => setIsCreateOpen(false)} style={styles.closeBtn}><X size={20} color={themeStyles.text} /></TouchableOpacity>
          </View>
          <ScrollView style={{ padding: 16 }} contentContainerStyle={{ gap: 12, paddingBottom: 40 }}>
            <View>
              <Text style={[styles.formSectionLabel, { color: themeStyles.text }]}>Website Name *</Text>
              <TextInput value={newSite.siteName} onChangeText={(text) => setNewSite({ ...newSite, siteName: text })} placeholder="e.g. Acme SaaS Platform" placeholderTextColor={themeStyles.mutedText} style={[styles.inputField, { color: themeStyles.text, borderColor: themeStyles.border }]} />
            </View>
            <View>
              <Text style={[styles.formSectionLabel, { color: themeStyles.text }]}>Domain / URL *</Text>
              <TextInput value={newSite.url} onChangeText={(text) => setNewSite({ ...newSite, url: text })} placeholder="e.g. acme.com" placeholderTextColor={themeStyles.mutedText} autoCapitalize="none" style={[styles.inputField, { color: themeStyles.text, borderColor: themeStyles.border }]} />
            </View>

            <View style={styles.splitRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.formSectionLabel, { color: themeStyles.text }]}>Type</Text>
                <TouchableOpacity style={[styles.dropdownTrigger, { borderColor: themeStyles.border }]} onPress={() => openPicker("websiteType", newSite.websiteType, ["active", "future"])}>
                  <Text style={[styles.dropdownTriggerText, { color: themeStyles.text }]}>{newSite.websiteType}</Text>
                  <ChevronDown size={14} color={themeStyles.mutedText} />
                </TouchableOpacity>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.formSectionLabel, { color: themeStyles.text }]}>Environment</Text>
                <TouchableOpacity style={[styles.dropdownTrigger, { borderColor: themeStyles.border }]} onPress={() => openPicker("environment", newSite.environment, ["Production", "Staging", "Development"])}>
                  <Text style={[styles.dropdownTriggerText, { color: themeStyles.text }]}>{newSite.environment}</Text>
                  <ChevronDown size={14} color={themeStyles.mutedText} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.splitRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.formSectionLabel, { color: themeStyles.text }]}>Business Unit</Text>
                <TouchableOpacity style={[styles.dropdownTrigger, { borderColor: themeStyles.border }]} onPress={() => openPicker("businessUnit", newSite.businessUnit, ["Marketing", "SaaS", "E-Commerce", "Operations"])}>
                  <Text style={[styles.dropdownTriggerText, { color: themeStyles.text }]}>{newSite.businessUnit}</Text>
                  <ChevronDown size={14} color={themeStyles.mutedText} />
                </TouchableOpacity>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.formSectionLabel, { color: themeStyles.text }]}>Lead Developer</Text>
                <TextInput value={newSite.leadDeveloper} onChangeText={(text) => setNewSite({ ...newSite, leadDeveloper: text })} placeholder="username" placeholderTextColor={themeStyles.mutedText} style={[styles.inputField, { color: themeStyles.text, borderColor: themeStyles.border }]} />
              </View>
            </View>

            <View>
              <Text style={[styles.formSectionLabel, { color: themeStyles.text }]}>Platform Engine</Text>
              <TextInput value={newSite.platform} onChangeText={(text) => setNewSite({ ...newSite, platform: text })} placeholder="e.g. Next.js, Webflow" placeholderTextColor={themeStyles.mutedText} style={[styles.inputField, { color: themeStyles.text, borderColor: themeStyles.border }]} />
            </View>

            <View>
              <Text style={[styles.formSectionLabel, { color: themeStyles.text }]}>Compliance Template Map</Text>
              <TouchableOpacity style={[styles.dropdownTrigger, { borderColor: themeStyles.border }]} onPress={() => openPicker("complianceTemplate", newSite.complianceTemplate, templates.map((t) => t.key))}>
                <Text style={[styles.dropdownTriggerText, { color: themeStyles.text }]}>{newSite.complianceTemplate || "Select template path"}</Text>
                <ChevronDown size={14} color={themeStyles.mutedText} />
              </TouchableOpacity>
            </View>

            <View>
              <Text style={[styles.formSectionLabel, { color: themeStyles.text }]}>Target Launch Date (YYYY-MM-DD)</Text>
              <TextInput value={newSite.launchDate} onChangeText={(text) => setNewSite({ ...newSite, launchDate: text })} placeholder="e.g. 2026-12-31" placeholderTextColor={themeStyles.mutedText} style={[styles.inputField, { color: themeStyles.text, borderColor: themeStyles.border }]} />
            </View>

            <TouchableOpacity style={[styles.btnSubmitFull, { backgroundColor: themeStyles.primary }]} disabled={actionLoading} onPress={handleCreateWebsite}>
              <Text style={{ color: isMetallic ? "#000" : "#fff", fontWeight: "bold", textAlign: "center" }}>Create Pipeline Profile</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* --- ADMIN OVERRIDE MODAL --- */}
      <Modal visible={isOverrideOpen} transparent animationType="fade" onRequestClose={() => setIsOverrideOpen(false)}>
        <View style={styles.dialogOverlay}>
          <View style={[styles.dialogContent, { backgroundColor: themeStyles.cardBg }]}>
            <Text style={[styles.modalTitle, { color: themeStyles.text }]}>Admin Override Panel</Text>
            <Text style={{ color: "#ef4444", fontSize: 11, marginBottom: 12 }}>Forcing parameters updates accountability logs bypass signatures.</Text>

            <Text style={styles.formSectionLabel}>Force Readiness Score (0-100)</Text>
            <TextInput value={overrideScore} onChangeText={setOverrideScore} keyboardType="numeric" placeholder="100" placeholderTextColor={themeStyles.mutedText} style={[styles.inputField, { color: themeStyles.text, borderColor: themeStyles.border, marginBottom: 8 }]} />

            <Text style={styles.formSectionLabel}>Force Site Status</Text>
            <TouchableOpacity style={[styles.dropdownTrigger, { borderColor: themeStyles.border, marginBottom: 8 }]} onPress={() => openPicker("overrideStatus", overrideStatus, ["Live", "Maintenance", "Development", "Offline"])}>
              <Text style={[styles.dropdownTriggerText, { color: themeStyles.text }]}>{overrideStatus || "Select Status"}</Text>
              <ChevronDown size={14} color={themeStyles.mutedText} />
            </TouchableOpacity>

            <Text style={styles.formSectionLabel}>Override Reason Protocol *</Text>
            <TextInput value={overrideReason} onChangeText={setOverrideReason} placeholder="Detail cause for authorization bypass..." placeholderTextColor={themeStyles.mutedText} multiline numberOfLines={3} style={[styles.inputField, { color: themeStyles.text, borderColor: themeStyles.border, height: 60, textAlignVertical: "top" }]} />

            <View style={styles.dialogActions}>
              <TouchableOpacity style={styles.btnCancelMini} onPress={() => setIsOverrideOpen(false)}><Text style={{ color: themeStyles.text }}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.btnSaveMini, { backgroundColor: "#a855f7" }]} onPress={submitOverride}><Text style={{ color: "#fff", fontWeight: "bold" }}>Authorize Bypass</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* --- BOTTOM DROPDOWN SELECT SHEET COMPONENT --- */}
      <Modal visible={activePicker !== null} transparent animationType="slide" onRequestClose={() => setActivePicker(null)}>
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setActivePicker(null)}>
          <View style={[styles.pickerContainer, { backgroundColor: themeStyles.cardBg }]}>
            <View style={styles.pickerHeader}>
              <Text style={[styles.pickerTitle, { color: themeStyles.text }]}>Select Option</Text>
              <TouchableOpacity onPress={() => setActivePicker(null)}><X size={18} color={themeStyles.text} /></TouchableOpacity>
            </View>
            <ScrollView>
              {activePicker?.options.map((opt) => (
                <TouchableOpacity key={opt} style={[styles.pickerOptionRow, activePicker.current === opt && { backgroundColor: "rgba(0,0,0,0.05)" }]} onPress={() => handlePickerSelect(opt)}>
                  <Text style={[styles.pickerOptionText, { color: themeStyles.text }, activePicker.current === opt && { fontWeight: "bold" }]}>{opt || "None"}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// --- Native Styles Object Compiler ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerPadding: {
    padding: 16,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  mainTitle: {
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
  },
  btnOutline: {
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  btnOutlineText: {
    fontSize: 12,
    fontWeight: "600",
  },
  btnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  btnPrimaryText: {
    fontSize: 12,
    fontWeight: "700",
  },
  statsScroll: {
    marginBottom: 16,
  },
  statCard: {
    width: 140,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  statValue: {
    fontSize: 22,
    fontWeight: "900",
    marginVertical: 4,
  },
  statSub: {
    fontSize: 10,
  },
  textGreen: { color: "#22c55e", fontSize: 22, fontWeight: "900", marginVertical: 4 },
  textAmber: { color: "#f59e0b", fontSize: 22, fontWeight: "900", marginVertical: 4 },
  textRed: { color: "#ef4444", fontSize: 22, fontWeight: "900", marginVertical: 4 },
  filterContainer: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 8,
  },
  searchWrapper: {
    position: "relative",
    justifyContent: "center",
  },
  searchIcon: {
    position: "absolute",
    left: 10,
    zIndex: 1,
  },
  inputField: {
    height: 36,
    borderWidth: 1,
    borderRadius: 6,
    paddingLeft: 32,
    paddingRight: 10,
    fontSize: 13,
    backgroundColor: "rgba(0,0,0,0.02)",
  },
  dropdownTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 100,
    backgroundColor: "rgba(0,0,0,0.01)",
  },
  dropdownTriggerText: {
    fontSize: 11,
    fontWeight: "500",
    marginRight: 4,
  },
  listHeaderTitle: {
    fontSize: 15,
    fontWeight: "800",
    marginTop: 4,
  },
  siteCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
  },
  siteHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "start",
    marginBottom: 10,
  },
  siteNameText: {
    fontSize: 15,
    fontWeight: "bold",
  },
  siteUrlText: {
    fontSize: 12,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "bold",
  },
  detailsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "rgba(0,0,0,0.02)",
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: "500",
  },
  detailValue: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 1,
  },
  countdownRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
  },
  countdownText: {
    fontSize: 11,
    fontWeight: "500",
  },
  overrideIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(168,85,247,0.1)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    marginBottom: 8,
    alignSelf: "flex-start",
  },
  overrideIndicatorText: {
    color: "#a855f7",
    fontSize: 10,
    fontWeight: "600",
    maxWidth: 200,
  },
  viewChecklistBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 4,
  },
  viewChecklistBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  emptyView: {
    padding: 32,
    alignItems: "center",
  },
  footerContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  leaderboardCard: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  leaderboardRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  leaderboardRank: {
    width: 28,
    fontSize: 12,
    fontWeight: "900",
  },
  leaderboardName: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
  leaderboardCount: {
    fontSize: 11,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  modalSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  modalScrollBody: {
    padding: 16,
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
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(168,85,247,0.3)",
    padding: 8,
    borderRadius: 6,
    marginBottom: 16,
    backgroundColor: "rgba(168,85,247,0.03)",
  },
  adminOverrideTriggerText: {
    color: "#a855f7",
    fontSize: 12,
    fontWeight: "600",
  },
  accordionBox: {
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
    overflow: "hidden",
  },
  accordionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    backgroundColor: "rgba(0,0,0,0.01)",
  },
  accordionTitle: {
    fontSize: 13,
    fontWeight: "bold",
  },
  accordionBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  miniBadge: {
    backgroundColor: "rgba(0,0,0,0.06)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  miniBadgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  accordionContent: {
    padding: 10,
    gap: 10,
    backgroundColor: "rgba(0,0,0,0.01)",
  },
  checkpointItem: {
    borderBottomWidth: 1,
    paddingBottom: 10,
    marginBottom: 4,
  },
  checkpointTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  checkpointStatusIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  checkpointTitleText: {
    fontSize: 13,
    fontWeight: "600",
  },
  evidenceLabelAlert: {
    color: "#f59e0b",
    fontSize: 9,
    fontWeight: "bold",
    backgroundColor: "rgba(245,158,11,0.1)",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  checkpointDescText: {
    fontSize: 11,
    marginTop: 4,
    paddingLeft: 22,
  },
  notesBlock: {
    backgroundColor: "rgba(0,0,0,0.04)",
    padding: 6,
    borderRadius: 4,
    marginTop: 6,
    marginLeft: 22,
  },
  notesText: { fontSize: 11 },
  blockedBlock: {
    backgroundColor: "rgba(239,68,68,0.08)",
    padding: 6,
    borderRadius: 4,
    marginTop: 6,
    marginLeft: 22,
  },
  blockedText: { color: "#ef4444", fontSize: 11 },
  updateCheckpointTriggerRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    gap: 2,
    marginTop: 8,
  },
  editCheckpointForm: {
    backgroundColor: "rgba(0,0,0,0.02)",
    padding: 10,
    borderRadius: 6,
    marginTop: 8,
  },
  formSectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 4,
    color: "gray",
  },
  uploadSimulatedBtn: {
    backgroundColor: "rgba(0,0,0,0.05)",
    padding: 8,
    borderRadius: 6,
    alignItems: "center",
    marginBottom: 8,
  },
  uploadSimulatedBtnText: {
    fontSize: 12,
    fontWeight: "500",
  },
  editActionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 10,
  },
  btnCancelMini: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  btnSaveMini: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 4,
  },
  historyWrapper: {
    marginTop: 16,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
  },
  historyLogItem: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.03)",
  },
  historyLogMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  logUser: { fontSize: 11, fontWeight: "bold" },
  logNotes: { fontSize: 11, marginTop: 2 },
  splitRow: {
    flexDirection: "row",
    gap: 10,
  },
  btnSubmitFull: {
    paddingVertical: 12,
    borderRadius: 6,
    marginTop: 12,
  },
  dialogOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  dialogContent: {
    borderRadius: 10,
    padding: 16,
  },
  dialogActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 14,
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  pickerContainer: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    maxHeight: Dimensions.get("window").height * 0.45,
    paddingBottom: Platform.OS === "ios" ? 24 : 12,
  },
  pickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  pickerTitle: {
    fontSize: 14,
    fontWeight: "bold",
  },
  pickerOptionRow: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  pickerOptionText: {
    fontSize: 14,
  },
});