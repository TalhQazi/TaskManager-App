import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  Dimensions,
  ActivityIndicator,
  SafeAreaView
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/services/api"; 
import { useTheme } from "@/contexts/ThemeContext";
import {
  Users,
  Search,
  Filter,
  Award,
  Clock,
  CheckCircle,
  Eye,
  X,
  FileText,
  Calendar,
  ChevronDown
} from "lucide-react-native";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export interface ContributorProject {
  projectName: string;
  contributionCount: number;
  firstContributionAt: string;
}

export interface ContributorStats {
  totalTasksCreated?: number;
  totalTasksUpdated?: number;
  totalTasksCompleted?: number;
  totalTimeSpent?: number;
  lastContributionAt?: string;
  totalProjectsContributed?: number;
}

export interface Contributor {
  _id: string;
  userId: string;
  name?: string;
  email?: string;
  avatar?: string;
  role: string;
  status?: string;
  department?: string;
  stats?: ContributorStats;
  projects?: ContributorProject[];
}

export interface Contribution {
  _id: string;
  action: string;
  resourceName: string;
  description: string;
  createdAt: string;
  impact: string;
}

interface WrappedResponse {
  success: boolean;
  data?: {
    items?: any[];
  };
}

type ApiResponse = WrappedResponse | any[] | null;

export default function ContributorsIndex() {
  const { uiTheme } = useTheme();
  const isMetallic = uiTheme.theme === "metallic-elite";

  const colors = useMemo(() => {
    const isDark = (uiTheme.theme as string) === "dark" || isMetallic;
    return {
      background: uiTheme.panelColors?.dashboardBackground || (isDark ? "#0f172a" : "#f8fafc"),
      cardBg: uiTheme.panelColors?.dashboardCardBackground || (isDark ? "#1e293b" : "#ffffff"),
      text: uiTheme.panelColors?.dashboardTextColor || (isDark ? "#f8fafc" : "#0f172a"),
      mutedText: isDark ? "#94a3b8" : "#64748b",
      border: isDark ? "#334155" : "#e2e8f0",
      innerRowBorder: isDark ? "#232f45" : "#e2e8f0",
      inputBg: isDark ? "#0f172a" : "#ffffff",
      primary: uiTheme.customColors?.primary || "#3b82f6",
      metallicGold: "#ffd27a",
    };
  }, [uiTheme, isMetallic]);

  const styles = useMemo(() => createStyles(colors, isMetallic), [colors, isMetallic]);

  const [searchTerm, setSearchTerm] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const limit = 20;

  const [roleMenuVisible, setRoleMenuVisible] = useState(false);
  const [selectedContributor, setSelectedContributor] = useState<Contributor | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const contributorsQuery = useQuery<Contributor[]>({
    queryKey: ["contributors", activeSearch, roleFilter, page],
    queryFn: async () => {
      const roleParam = roleFilter === "all" ? "" : roleFilter;
      const qs = `?page=${page}&limit=${limit}&search=${encodeURIComponent(activeSearch)}&role=${roleParam}&_cb=${Date.now()}`;
      const res = await apiRequest(`/contributors${qs}`) as ApiResponse;
      
      if (res && "success" in res && res.success && res.data && Array.isArray(res.data.items)) {
        return res.data.items as Contributor[];
      }
      return Array.isArray(res) ? (res as Contributor[]) : [];
    }
  });

  const topContributorsQuery = useQuery<Contributor[]>({
    queryKey: ["top-contributors"],
    queryFn: async () => {
      const res = await apiRequest("/contributors?limit=5") as ApiResponse;
      
      if (res && "success" in res && res.success && res.data && Array.isArray(res.data.items)) {
        return res.data.items as Contributor[];
      }
      return Array.isArray(res) ? (res as Contributor[]).slice(0, 5) : [];
    }
  });

  const contributionsQuery = useQuery<Contribution[]>({
    queryKey: ["contributor-contributions", selectedContributor?.userId],
    queryFn: async () => {
      if (!selectedContributor?.userId) return [];
      const res = await apiRequest(`/contributors/${selectedContributor.userId}/contributions?limit=50`) as ApiResponse;
      
      if (res && "success" in res && res.success && res.data && Array.isArray(res.data.items)) {
        return res.data.items as Contribution[];
      }
      return Array.isArray(res) ? (res as Contribution[]) : [];
    },
    enabled: isDetailOpen && !!selectedContributor?.userId
  });

  const handleSearchTrigger = () => {
    setPage(1);
    setActiveSearch(searchTerm);
  };

  const getInitials = (name?: string, fallbackId?: string) => {
    if (name && name.trim().length > 0) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (fallbackId) return fallbackId.slice(-2).toUpperCase();
    return "??";
  };

  const getRoleTheme = (role: string) => {
    switch (role?.toLowerCase()) {
      case "admin":
      case "super-admin":
        return { container: "#ffeeef", text: "#ef4444", border: "#fca5a5" };
      case "manager":
        return { container: "#eff6ff", text: "#3b82f6", border: "#93c5fd" };
      case "employee":
        return { container: "#f0fdf4", text: "#22c55e", border: "#86efac" };
      default:
        return { container: colors.background, text: colors.mutedText, border: colors.border };
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "Never";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const contributors = contributorsQuery.data || [];
  const topContributors = topContributorsQuery.data || [];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollMainContainer} showsVerticalScrollIndicator={false}>
        
        <View style={styles.headerBlock}>
          <View style={styles.titleRow}>
            <Users size={24} color={isMetallic ? colors.metallicGold : colors.primary} />
            <Text style={styles.titleText}>Contributors</Text>
          </View>
          <Text style={styles.descText}>Track operational updates, logs, and activity metrics</Text>
        </View>

        {!topContributorsQuery.isLoading && topContributors.length > 0 && (
          <View style={styles.webStyleCard}>
            <View style={styles.cardHeader}>
              <Award size={18} color="#eab308" />
              <View>
                <Text style={styles.cardTitle}>Top Contributors</Text>
                <Text style={styles.cardDesc}>Most active contributors this cycle</Text>
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.leaderboardScroll}>
              {topContributors.map((item: Contributor, idx: number) => {
                const roleColors = getRoleTheme(item.role);
                return (
                  <View key={item._id} style={styles.leaderboardAvatarPod}>
                    <View style={styles.avatarContainer}>
                      <View style={styles.avatarCircleFallback}>
                        <Text style={styles.avatarFallbackText}>
                          {getInitials(item.name, item.userId)}
                        </Text>
                      </View>
                      {idx < 3 && (
                        <View style={styles.podiumBadge}>
                          <Text style={styles.podiumBadgeText}>{idx + 1}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.podNameText} numberOfLines={1}>
                      {item.name || `User (${item.userId.slice(-4)})`}
                    </Text>
                    <View style={[styles.roleBadge, { backgroundColor: roleColors.container, borderColor: roleColors.border }]}>
                      <Text style={[styles.roleBadgeText, { color: roleColors.text }]}>{item.role}</Text>
                    </View>
                    <View style={styles.miniStatsRow}>
                      <View style={styles.miniStatItem}>
                        <CheckCircle size={10} color={colors.mutedText} />
                        <Text style={styles.miniStatValue}>{item.stats?.totalTasksCompleted || 0}t</Text>
                      </View>
                      <View style={styles.miniStatItem}>
                        <Clock size={10} color={colors.mutedText} />
                        <Text style={styles.miniStatValue}>{item.stats?.totalTimeSpent || 0}h</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}

        <View style={styles.webStyleCard}>
          <View style={styles.filterFlexRow}>
            <View style={styles.searchBoxWrapper}>
              <Search size={16} color={colors.mutedText} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search contributors..."
                placeholderTextColor={colors.mutedText}
                value={searchTerm}
                onChangeText={setSearchTerm}
                onSubmitEditing={handleSearchTrigger}
              />
            </View>
            <TouchableOpacity style={styles.searchSubmitBtn} onPress={handleSearchTrigger}>
              <Text style={styles.searchSubmitBtnText}>Search</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.dropdownSelectorTrigger} onPress={() => setRoleMenuVisible(true)}>
            <View style={styles.dropdownInnerFlex}>
              <Filter size={14} color={colors.mutedText} />
              <Text style={styles.dropdownValueText}>
                Role: {roleFilter === "all" ? "All Roles" : roleFilter.toUpperCase()}
              </Text>
            </View>
            <ChevronDown size={16} color={colors.mutedText} />
          </TouchableOpacity>
        </View>

        <View style={styles.webStyleCard}>
          <Text style={styles.cardSectionTitle}>All Contributors</Text>
          <Text style={styles.cardDesc}>
            {contributorsQuery.isLoading ? "Fetching entries..." : `${contributors.length} records populated`}
          </Text>

          {contributorsQuery.isLoading ? (
            <ActivityIndicator size="small" color={colors.primary} style={styles.loaderSpacing} />
          ) : contributors.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Users size={36} color={colors.mutedText} />
              <Text style={styles.emptyText}>No matching items found</Text>
            </View>
          ) : (
            <View style={styles.listContainer}>
              {contributors.map((item: Contributor) => {
                const roleColors = getRoleTheme(item.role);
                return (
                  <View key={item._id} style={styles.contributorListRow}>
                    <View style={styles.rowTopHeaderFlex}>
                      <View style={styles.avatarCircleFallbackSmall}>
                        <Text style={styles.avatarFallbackTextSmall}>
                          {getInitials(item.name, item.userId)}
                        </Text>
                      </View>
                      <View style={styles.flexOne}>
                        <View style={styles.metaBadgeWrapRow}>
                          <Text style={styles.contributorNameText}>
                            {item.name || `User ID: ${item.userId.slice(-6)}`}
                          </Text>
                          <View style={[styles.roleBadge, { backgroundColor: roleColors.container, borderColor: roleColors.border, marginTop: 0 }]}>
                            <Text style={[styles.roleBadgeText, { color: roleColors.text }]}>{item.role}</Text>
                          </View>
                        </View>
                        <Text style={styles.contributorEmailText} numberOfLines={1}>
                          {item.email || `Status: ${item.status || "Active"}`}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.metricsBarPanel}>
                      <View style={styles.metricBlockItem}>
                        <Text style={styles.metricCounter}>{item.stats?.totalTasksCreated || 0}</Text>
                        <Text style={styles.metricLabel}>Created</Text>
                      </View>
                      <View style={styles.metricBlockItem}>
                        <Text style={styles.metricCounter}>{item.stats?.totalTasksUpdated || 0}</Text>
                        <Text style={styles.metricLabel}>Updated</Text>
                      </View>
                      <View style={styles.metricBlockItem}>
                        <Text style={styles.metricCounter}>{item.stats?.totalTasksCompleted || 0}</Text>
                        <Text style={styles.metricLabel}>Completed</Text>
                      </View>
                    </View>

                    <View style={styles.rowFooterActionFlex}>
                      <View>
                        <Text style={styles.miniLabelHeader}>Last Active</Text>
                        <Text style={styles.miniValueContent}>{formatDate(item.stats?.lastContributionAt)}</Text>
                      </View>
                      <TouchableOpacity style={styles.viewDetailsBtn} onPress={() => { setSelectedContributor(item); setIsDetailOpen(true); }}>
                        <Eye size={14} color={isMetallic ? "#000" : "#fff"} />
                        <Text style={styles.viewDetailsBtnText}>Details</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {!contributorsQuery.isLoading && (page > 1 || contributors.length === limit) && (
            <View style={styles.paginationFooterRow}>
              <TouchableOpacity style={[styles.pageBtn, page === 1 && styles.disabledPageBtn]} disabled={page === 1} onPress={() => setPage(p => Math.max(1, p - 1))}>
                <Text style={styles.pageBtnText}>Prev</Text>
              </TouchableOpacity>
              <Text style={styles.pageIndicatorText}>Page {page}</Text>
              <TouchableOpacity style={[styles.pageBtn, contributors.length < limit && styles.disabledPageBtn]} disabled={contributors.length < limit} onPress={() => setPage(p => p + 1)}>
                <Text style={styles.pageBtnText}>Next</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

      </ScrollView>

      <Modal visible={roleMenuVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlayCentered}>
          <View style={[styles.modalBoxCentered, styles.roleModalDimension]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter by Position Role</Text>
              <TouchableOpacity onPress={() => setRoleMenuVisible(false)}><X size={20} color={colors.text} /></TouchableOpacity>
            </View>
            {["all", "admin", "manager", "employee"].map((roleOption) => (
              <TouchableOpacity
                key={roleOption}
                style={[styles.dropdownOptionRow, roleFilter === roleOption && styles.activeOptionRow]}
                onPress={() => { setRoleFilter(roleOption); setPage(1); setRoleMenuVisible(false); }}
              >
                <Text style={styles.optionRowText}>{roleOption === "all" ? "All Roles" : roleOption.toUpperCase()}</Text>
                {roleFilter === roleOption && <CheckCircle size={16} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      <Modal visible={isDetailOpen} transparent={true} animationType="fade">
        <View style={styles.modalOverlayCentered}>
          {selectedContributor && (
            <View style={[styles.modalBoxCentered, styles.detailModalDimension]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Detailed Activity Sheet</Text>
                <TouchableOpacity onPress={() => { setIsDetailOpen(false); setSelectedContributor(null); }}><X size={20} color={colors.text} /></TouchableOpacity>
              </View>

              <FlatList
                data={contributionsQuery.data || []}
                keyExtractor={(item: Contribution) => item._id}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={
                  <View style={styles.detailHeaderGap}>
                    <View style={styles.innerProfileBanner}>
                      <View style={styles.avatarCircleFallback}>
                        <Text style={styles.avatarFallbackText}>{getInitials(selectedContributor.name, selectedContributor.userId)}</Text>
                      </View>
                      <View style={styles.flexOne}>
                        <Text style={styles.profileBannerName}>
                          {selectedContributor.name || `User (${selectedContributor.userId.slice(-6)})`}
                        </Text>
                        <Text style={styles.profileBannerEmail}>
                          {selectedContributor.email || `Status: ${selectedContributor.status || "Active"}`}
                        </Text>
                        <View style={styles.profileBadgeWrapRow}>
                          <View style={[styles.roleBadge, styles.darkSecondaryBadge]}>
                            <Text style={[styles.roleBadgeText, styles.whiteText]}>{selectedContributor.role}</Text>
                          </View>
                          {selectedContributor.department && (
                            <View style={[styles.roleBadge, styles.darkTertiaryBadge]}>
                              <Text style={[styles.roleBadgeText, { color: colors.mutedText }]}>{selectedContributor.department}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>

                    <View style={styles.gridStatsRow}>
                      <View style={styles.gridStatTile}>
                        <Text style={styles.tileCounterText}>{selectedContributor.stats?.totalTasksCreated || 0}</Text>
                        <Text style={styles.tileLabelText}>Created</Text>
                      </View>
                      <View style={styles.gridStatTile}>
                        <Text style={styles.tileCounterText}>{selectedContributor.stats?.totalTasksUpdated || 0}</Text>
                        <Text style={styles.tileLabelText}>Updated</Text>
                      </View>
                      <View style={styles.gridStatTile}>
                        <Text style={styles.tileCounterText}>{selectedContributor.stats?.totalTasksCompleted || 0}</Text>
                        <Text style={styles.tileLabelText}>Completed</Text>
                      </View>
                      <View style={styles.gridStatTile}>
                        <Text style={styles.tileCounterText}>{selectedContributor.projects?.length || 0}</Text>
                        <Text style={styles.tileLabelText}>Projects</Text>
                      </View>
                    </View>

                    <Text style={styles.sectionHeaderMarkerLabel}>Recent Action Trail</Text>
                    {contributionsQuery.isLoading && <ActivityIndicator size="small" color={colors.primary} />}
                    {(contributionsQuery.data || []).length === 0 && !contributionsQuery.isLoading && (
                      <Text style={styles.noContributionsText}>No operations recorded by this contributor target yet.</Text>
                    )}
                  </View>
                }
                renderItem={({ item }: { item: Contribution }) => (
                  <View style={styles.historyLogCardRow}>
                    <View style={styles.historyCardTopRow}>
                      <FileText size={14} color={colors.primary} />
                      <Text style={styles.historyActionTitleText} numberOfLines={1}>
                        {item.action.toUpperCase()}: "{item.resourceName}"
                      </Text>
                    </View>
                    <Text style={styles.historyActionDescText}>{item.description}</Text>
                    <View style={styles.historyMetaFooterFlexRow}>
                      <View style={styles.historyTimestampContainer}>
                        <Calendar size={11} color={colors.mutedText} />
                        <Text style={styles.historyTimestampText}>
                          {new Date(item.createdAt).toLocaleDateString()}
                        </Text>
                      </View>
                      <View style={[styles.roleBadge, styles.darkTertiaryBadge, styles.noMarginTop]}>
                        <Text style={[styles.roleBadgeText, styles.impactText]}>{item.impact} impact</Text>
                      </View>
                    </View>
                  </View>
                )}
                ListFooterComponent={
                  selectedContributor.projects && selectedContributor.projects.length > 0 ? (
                    <View style={styles.projectFooterSection}>
                      <Text style={styles.sectionHeaderMarkerLabel}>Assigned Project Contexts</Text>
                      <View style={styles.projectListGap}>
                        {selectedContributor.projects.map((proj: ContributorProject, idx: number) => (
                          <View key={idx} style={styles.projectContextCard}>
                            <Text style={styles.projectContextTitle}>{proj.projectName}</Text>
                            <Text style={styles.projectContextMeta}>
                              {proj.contributionCount} activities recorded since {new Date(proj.firstContributionAt).toLocaleDateString()}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ) : <View style={styles.emptyFooterSpacer} />
                }
              />
            </View>
          )}
        </View>
      </Modal>

    </SafeAreaView>
  );
}

function createStyles(colors: any, isMetallic: boolean) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollMainContainer: { paddingBottom: 40 },
    headerBlock: { paddingHorizontal: 16, paddingTop: 16, marginBottom: 12 },
    titleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    titleText: { fontSize: 22, fontWeight: "bold", color: colors.text },
    descText: { fontSize: 13, color: colors.mutedText, marginTop: 4 },

    webStyleCard: { backgroundColor: colors.cardBg, marginHorizontal: 16, marginBottom: 14, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: colors.border },
    cardHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
    cardTitle: { color: colors.text, fontSize: 15, fontWeight: "bold" },
    cardDesc: { color: colors.mutedText, fontSize: 12 },
    cardSectionTitle: { color: colors.text, fontSize: 16, fontWeight: "bold" },

    leaderboardScroll: { gap: 14, paddingVertical: 4 },
    leaderboardAvatarPod: { width: 100, alignItems: "center", backgroundColor: colors.background, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
    avatarContainer: { width: 44, height: 44, position: "relative" },
    avatarCircleFallback: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#1e3a8a", justifyContent: "center", alignItems: "center" },
    avatarFallbackText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
    podiumBadge: { position: "absolute", top: -4, right: -4, backgroundColor: "#eab308", width: 16, height: 16, borderRadius: 8, justifyContent: "center", alignItems: "center" },
    podiumBadgeText: { color: "#0f172a", fontSize: 10, fontWeight: "bold" },
    podNameText: { color: colors.text, fontSize: 12, fontWeight: "500", marginTop: 6, width: "100%", textAlign: "center" },

    roleBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, marginTop: 4, alignSelf: "center" },
    roleBadgeText: { fontSize: 10, fontWeight: "600" },
    miniStatsRow: { flexDirection: "row", gap: 6, marginTop: 6, justifyContent: "center" },
    miniStatItem: { flexDirection: "row", alignItems: "center", gap: 2 },
    miniStatValue: { color: colors.mutedText, fontSize: 10 },

    filterFlexRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
    searchBoxWrapper: { flex: 1, flexDirection: "row", backgroundColor: colors.background, borderRadius: 8, alignItems: "center", paddingHorizontal: 10, height: 40, borderWidth: 1, borderColor: colors.border },
    searchIcon: { marginRight: 6 },
    searchInput: { flex: 1, color: colors.text, fontSize: 14 },
    searchSubmitBtn: { backgroundColor: colors.primary, height: 40, paddingHorizontal: 16, borderRadius: 8, justifyContent: "center" },
    searchSubmitBtnText: { color: "#fff", fontSize: 13, fontWeight: "bold" },

    dropdownSelectorTrigger: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.background, height: 40, borderRadius: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border },
    dropdownInnerFlex: { flexDirection: "row", alignItems: "center", gap: 8 },
    dropdownValueText: { color: colors.text, fontSize: 13 },

    emptyContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 32, gap: 8 },
    emptyText: { color: colors.mutedText, fontSize: 13 },

    contributorListRow: { backgroundColor: colors.background, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.innerRowBorder, marginBottom: 10 },
    rowTopHeaderFlex: { flexDirection: "row", alignItems: "center", gap: 10 },
    avatarCircleFallbackSmall: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#1e3a8a", justifyContent: "center", alignItems: "center" },
    avatarFallbackTextSmall: { color: "#fff", fontWeight: "bold", fontSize: 12 },
    contributorNameText: { color: colors.text, fontSize: 14, fontWeight: "600" },
    contributorEmailText: { color: colors.mutedText, fontSize: 12, marginTop: 1 },

    metricsBarPanel: { flexDirection: "row", backgroundColor: colors.cardBg, borderRadius: 8, padding: 8, marginVertical: 10, justifyContent: "space-around" },
    metricBlockItem: { alignItems: "center" },
    metricCounter: { color: colors.text, fontSize: 14, fontWeight: "bold" },
    metricLabel: { color: colors.mutedText, fontSize: 10, marginTop: 1 },

    rowFooterActionFlex: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    miniLabelHeader: { color: colors.mutedText, fontSize: 10 },
    miniValueContent: { color: colors.text, fontSize: 12, fontWeight: "500" },
    viewDetailsBtn: { 
      flexDirection: "row", 
      alignItems: "center", 
      gap: 4, 
      backgroundColor: isMetallic ? colors.metallicGold : colors.primary, 
      paddingHorizontal: 12, 
      paddingVertical: 6, 
      borderRadius: 6 
    },
    viewDetailsBtnText: { 
      color: isMetallic ? "#000" : "#fff", 
      fontSize: 12, 
      fontWeight: "600" 
    },

    paginationFooterRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
    pageBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.background, borderRadius: 6 },
    disabledPageBtn: { opacity: 0.3 },
    pageBtnText: { color: colors.text, fontSize: 12, fontWeight: "bold" },
    pageIndicatorText: { color: colors.mutedText, fontSize: 12 },

    modalOverlayCentered: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "center", alignItems: "center", padding: 16 },
    modalBoxCentered: { backgroundColor: colors.background, width: "100%", borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 16, overflow: "hidden" },
    modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
    modalTitle: { color: colors.text, fontSize: 15, fontWeight: "bold" },

    dropdownOptionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
    activeOptionRow: { backgroundColor: colors.cardBg, paddingHorizontal: 6, borderRadius: 6 },
    optionRowText: { color: colors.text, fontSize: 13 },

    innerProfileBanner: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, backgroundColor: colors.cardBg, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
    profileBannerName: { color: colors.text, fontSize: 16, fontWeight: "bold" },
    profileBannerEmail: { color: colors.mutedText, fontSize: 12 },
    gridStatsRow: { flexDirection: "row", gap: 8 },
    gridStatTile: { flex: 1, backgroundColor: colors.cardBg, padding: 10, borderRadius: 8, alignItems: "center", borderWidth: 1, borderColor: colors.border },
    tileCounterText: { color: colors.text, fontSize: 16, fontWeight: "bold" },
    tileLabelText: { color: colors.mutedText, fontSize: 10, marginTop: 2 },
    sectionHeaderMarkerLabel: { color: colors.primary, fontSize: 11, fontWeight: "bold", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 8 },
    noContributionsText: { color: colors.mutedText, fontSize: 12, textAlign: "center", marginVertical: 16 },

    historyLogCardRow: { backgroundColor: colors.cardBg, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.border, marginBottom: 8 },
    historyActionTitleText: { color: colors.text, fontSize: 12, fontWeight: "600", flex: 1 },
    historyActionDescText: { color: colors.mutedText, fontSize: 12, marginTop: 3 },
    historyMetaFooterFlexRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
    historyTimestampText: { color: colors.mutedText, fontSize: 11 },

    projectContextCard: { backgroundColor: colors.background, padding: 10, borderRadius: 6, borderWidth: 1, borderColor: colors.innerRowBorder },
    projectContextTitle: { color: colors.text, fontSize: 13, fontWeight: "600" },
    projectContextMeta: { color: colors.mutedText, fontSize: 11, marginTop: 2 },

    flexOne: { flex: 1 },
    loaderSpacing: { marginVertical: 24 },
    listContainer: { marginTop: 12, gap: 12 },
    metaBadgeWrapRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
    roleModalDimension: { height: 290 },
    detailModalDimension: { height: SCREEN_HEIGHT * 0.8 },
    detailHeaderGap: { gap: 14, marginBottom: 16 },
    profileBadgeWrapRow: { flexDirection: 'row', marginTop: 4, gap: 6 },
    darkSecondaryBadge: { backgroundColor: '#334155', borderColor: '#475569' },
    darkTertiaryBadge: { backgroundColor: '#1e293b', borderColor: '#334155' },
    whiteText: { color: '#fff' },
    historyCardTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    historyTimestampContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    noMarginTop: { marginTop: 0 },
    impactText: { color: '#eab308', fontSize: 10 },
    projectFooterSection: { marginTop: 14, paddingBottom: 32 },
    projectListGap: { gap: 8, marginTop: 8 },
    emptyFooterSpacer: { height: 40 }
  });
}