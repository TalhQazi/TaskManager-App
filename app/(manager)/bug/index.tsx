import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { usePathname } from "expo-router";
import {
  Bug,
  MapPin,
  User,
  Calendar,
  Layers,
  RefreshCw,
  X,
  AlertCircle,
} from "lucide-react-native";
import { apiFetch } from "@/lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";
import { wp, hp, fs } from "@/util/styles";

import BugDashboardAnalytics from "@/components/bugs/BugDashboardAnalytics";
import ReportBugModal from "@/components/bugs/ReportBugModal";
import BugCollaborationModal from "@/components/bugs/BugCollaborationModal";

type BugStatus = "open" | "closed" | string;

type BugItem = {
  id: string;
  title: string;
  description: string;
  status: BugStatus;
  taskTitle?: string;
  createdByUsername?: string;
  createdByRole?: string;
  assignedDeveloperName?: string;
  createdAt?: string;
  source?: { panel?: string; path?: string };
  attachments?: { fileName?: string; url?: string }[];
};

type StatusFilter = "all" | "open" | "AWAITING_REPORTER_CONFIRMATION" | "closed";

function toText(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function buildColors(uiTheme: any, isDark: boolean) {
  return {
    background: uiTheme.panelColors?.dashboardBackground || (isDark ? "#09090b" : "#F8FAFC"),
    cardBg: uiTheme.panelColors?.dashboardCardBackground || (isDark ? "#18181b" : "#FFFFFF"),
    text: uiTheme.panelColors?.dashboardTextColor || (isDark ? "#F4F4F5" : "#0F172A"),
    textSecondary: isDark ? "#A1A1AA" : "#475569",
    textMuted: isDark ? "#71717A" : "#64748B",
    border: isDark ? "#27272A" : "#E2E8F0",
    inputBg: isDark ? "#09090b" : "#F1F5F9",
    primary: uiTheme.customColors?.primary || (isDark ? "#3b82f6" : "#0284c7"),
    primaryBgLight: "rgba(2, 132, 199, 0.1)",
    primaryBorder: "rgba(2, 132, 199, 0.25)",
    golden: uiTheme.customColors?.golden || "#B45309",
    danger: isDark ? "#F87171" : "#ef4444",
    dangerBg: isDark ? "rgba(239, 68, 68, 0.15)" : "#fee2e2",
    dangerBorder: isDark ? "rgba(239, 68, 68, 0.3)" : "#fca5a5",
    badgeOpenBg: isDark ? "rgba(56, 189, 248, 0.15)" : "#e0f2fe",
    badgeOpenText: isDark ? "#38bdf8" : "#0369a1",
    badgeClosedBg: isDark ? "rgba(113, 113, 122, 0.15)" : "#f1f5f9",
    badgeClosedText: isDark ? "#a1a1aa" : "#475569",
  };
}

export default function ManagerBugs() {
  const { uiTheme } = useTheme();
  const activePath = usePathname();
  const isDark = (uiTheme.theme as string) === "dark" || (uiTheme.theme as string) === "metallic-elite";
  const colors = useMemo(() => buildColors(uiTheme, isDark), [uiTheme, isDark]);

  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [items, setItems] = useState<BugItem[]>([]);

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 25;

  const [collabOpen, setCollabOpen] = useState(false);
  const [selectedBugId, setSelectedBugId] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);

  const load = useCallback(async (targetPage = page) => {
    try {
      setLoading(true);
      setApiError(null); // Reset error state prior to fetching

      const params = new URLSearchParams();
      params.set("page", String(targetPage));
      params.set("limit", String(limit));
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (q.trim()) params.set("q", q.trim());

      const res = await apiFetch<{
        items?: any[];
        pagination?: { totalItems: number; totalPages: number; currentPage: number };
      }>(`/bugs?${params.toString()}`);

      const list = Array.isArray(res?.items) ? res.items : [];
      const mapped: BugItem[] = list
        .map((x: any) => ({
          id: String(x.id || x._id || ""),
          title: toText(x.title),
          description: toText(x.description),
          status: toText(x.status || "OPEN"),
          taskTitle: toText(x.taskTitle),
          createdByUsername: toText(x.createdByUsername),
          createdByRole: toText(x.createdByRole),
          assignedDeveloperName: toText(x.assignedDeveloperName),
          createdAt: toText(x.createdAt),
          source: x.source && typeof x.source === "object" ? x.source : undefined,
          attachments: Array.isArray(x.attachments) ? x.attachments : [],
        }))
        .filter((x) => Boolean(x.id));

      setItems(mapped);

      if (res?.pagination) {
        setTotalPages(res.pagination.totalPages || 1);
        setTotalItems(res.pagination.totalItems || list.length);
        setPage(res.pagination.currentPage || targetPage);
      } else {
        setTotalItems(list.length);
        setTotalPages(1);
      }

      // Ensure error is explicitly removed once data successfully arrives
      setApiError(null);
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Failed to load bugs");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, q]);

  useEffect(() => {
    void load(1);
  }, [statusFilter, q]);

  const openBug = (b: BugItem) => {
    setSelectedBugId(b.id);
    setCollabOpen(true);
  };

  const statusTabs = useMemo((): { label: string; value: StatusFilter }[] => [
    { label: "Open", value: "open" },
    { label: "Awaiting Verify", value: "AWAITING_REPORTER_CONFIRMATION" },
    { label: "Closed", value: "closed" },
    { label: "All", value: "all" },
  ], []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerTitleContainer}>
          <Bug size={fs(5)} color={colors.golden} style={{ marginRight: wp(2) }} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>Bug Reports</Text>
        </View>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
          Total {totalItems} bug report{totalItems !== 1 ? "s" : ""} found.
        </Text>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.btn, styles.btnOutline, { borderColor: colors.border, backgroundColor: colors.cardBg }]}
            onPress={() => void load(1)}
            disabled={loading}
          >
            <RefreshCw size={fs(3.5)} color={colors.text} style={{ marginRight: wp(1.5) }} />
            <Text style={[styles.btnOutlineText, { color: colors.text }]}>Refresh</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.btnPrimary, { backgroundColor: colors.primary }]}
            onPress={() => setReportOpen(true)}
          >
            <Text style={styles.btnPrimaryText}>+ Report Bug</Text>
          </TouchableOpacity>
        </View>
      </View>

      <BugDashboardAnalytics />

      {/* Render error banner ONLY when NOT loading and an error exists */}
      {!loading && apiError && items.length == 0 && (
        <View style={[styles.errorBanner, { backgroundColor: colors.dangerBg, borderColor: colors.dangerBorder }]}>
          <View style={styles.errorContent}>
            <AlertCircle size={fs(3.8)} color={colors.danger} style={{ marginRight: wp(2) }} />
            <Text style={[styles.errorText, { color: colors.danger }]}>{apiError}</Text>
          </View>
          <TouchableOpacity onPress={() => setApiError(null)} style={styles.dismissBtn}>
            <X size={fs(3.5)} color={colors.danger} />
          </TouchableOpacity>
        </View>
      )}

      <View style={[styles.searchCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        <TextInput
          placeholder="Search bugs..."
          placeholderTextColor={colors.textMuted}
          style={[styles.searchInput, { backgroundColor: colors.inputBg, color: colors.text }]}
          value={q}
          onChangeText={setQ}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContainer}>
          {statusTabs.map((tab) => {
            const isActive = statusFilter === tab.value;
            return (
              <TouchableOpacity
                key={tab.value}
                onPress={() => setStatusFilter(tab.value)}
                style={[
                  styles.tabButton,
                  { backgroundColor: isActive ? colors.primary : colors.inputBg },
                ]}
              >
                <Text style={[styles.tabButtonText, { color: isActive ? "#ffffff" : colors.textSecondary }]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No bugs found.</Text>
            </View>
          }
          renderItem={({ item: b }) => {
            const isOpen = b.status !== "closed";
            return (
              <TouchableOpacity
                style={[styles.bugCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
                onPress={() => openBug(b)}
              >
                <View style={styles.cardHeaderRow}>
                  <View style={[styles.badge, { backgroundColor: isOpen ? colors.badgeOpenBg : colors.badgeClosedBg }]}>
                    <Text style={[styles.badgeText, { color: isOpen ? colors.badgeOpenText : colors.badgeClosedText }]}>
                      {b.status}
                    </Text>
                  </View>
                  <View style={styles.metaRowElement}>
                    <MapPin size={fs(3)} color={colors.textMuted} style={{ marginRight: wp(0.75) }} />
                    <Text style={[styles.metaRowText, { color: colors.textSecondary }]} numberOfLines={1}>
                      {b.source?.path || "System"}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.cardTitle, { color: colors.text }]}>{b.title}</Text>

                {b.taskTitle ? (
                  <View style={[styles.taskBadge, { backgroundColor: colors.primaryBgLight, borderColor: colors.primaryBorder }]}>
                    <Layers size={fs(2.8)} color={colors.primary} style={{ marginRight: wp(1) }} />
                    <Text style={[styles.taskBadgeText, { color: colors.primary }]} numberOfLines={1}>
                      Task: {b.taskTitle}
                    </Text>
                  </View>
                ) : null}

                <Text style={[styles.cardDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                  {b.description}
                </Text>

                <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                  <View style={styles.metaRowElement}>
                    <User size={fs(3)} color={colors.textMuted} style={{ marginRight: wp(1) }} />
                    <Text style={[styles.footerUserData, { color: colors.text }]}>
                      {b.createdByUsername || "Anonymous"}
                    </Text>
                  </View>
                  <View style={styles.metaRowElement}>
                    <Calendar size={fs(3)} color={colors.textMuted} style={{ marginRight: wp(1) }} />
                    <Text style={[styles.metaRowText, { color: colors.textSecondary }]}>
                      {b.createdAt ? new Date(b.createdAt).toLocaleDateString() : "-"}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {totalPages > 1 && (
        <View style={[styles.paginationBar, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.pageBtn, { borderColor: colors.border }]}
            onPress={() => void load(page - 1)}
            disabled={page <= 1 || loading}
          >
            <Text style={[styles.pageBtnText, { color: colors.text }]}>Previous</Text>
          </TouchableOpacity>
          <Text style={[styles.pageInfoText, { color: colors.textSecondary }]}>
            Page {page} of {totalPages}
          </Text>
          <TouchableOpacity
            style={[styles.pageBtn, { borderColor: colors.border }]}
            onPress={() => void load(page + 1)}
            disabled={page >= totalPages || loading}
          >
            <Text style={[styles.pageBtnText, { color: colors.text }]}>Next</Text>
          </TouchableOpacity>
        </View>
      )}

      <BugCollaborationModal
        bugId={selectedBugId}
        open={collabOpen}
        onOpenChange={setCollabOpen}
        onBugUpdated={() => void load()}
      />

      <ReportBugModal
        open={reportOpen}
        onOpenChange={setReportOpen}
        onSuccess={() => void load(1)}
        defaultSourcePanel="manager"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: wp(4),
    paddingTop: hp(1.5),
    paddingBottom: hp(2),
    borderBottomWidth: 1,
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: fs(5),
    fontWeight: "800",
  },
  headerSubtitle: {
    fontSize: fs(3),
    marginTop: hp(0.5),
  },
  actionRow: {
    flexDirection: "row",
    gap: wp(2),
    marginTop: hp(1.5),
  },
  btn: {
    height: hp(4.5),
    borderRadius: wp(2),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: wp(3),
  },
  btnOutline: {
    flex: 1,
    borderWidth: 1,
  },
  btnOutlineText: {
    fontSize: fs(3.2),
    fontWeight: "600",
  },
  btnPrimary: {
    flex: 1.3,
  },
  btnPrimaryText: {
    color: "#ffffff",
    fontSize: fs(3.2),
    fontWeight: "600",
  },
  errorBanner: {
    marginHorizontal: wp(4),
    marginTop: hp(1),
    marginBottom: hp(1),
    padding: wp(3),
    borderRadius: wp(2),
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  errorContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  errorText: {
    fontSize: fs(3),
    fontWeight: "500",
    flex: 1,
  },
  dismissBtn: {
    padding: wp(1),
    marginLeft: wp(2),
  },
  searchCard: {
    marginHorizontal: wp(4),
    padding: wp(3),
    borderRadius: wp(2.5),
    borderWidth: 1,
    marginBottom: hp(1),
  },
  searchInput: {
    height: hp(4.5),
    borderRadius: wp(1.5),
    paddingHorizontal: wp(3),
    fontSize: fs(3.2),
  },
  tabsContainer: {
    flexDirection: "row",
    gap: wp(1.5),
    marginTop: hp(1),
  },
  tabButton: {
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.6),
    borderRadius: wp(1.5),
  },
  tabButtonText: {
    fontSize: fs(2.8),
    fontWeight: "600",
  },
  loaderContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingHorizontal: wp(4),
    paddingBottom: hp(2),
    gap: hp(1.2),
  },
  emptyContainer: {
    paddingVertical: hp(5),
    alignItems: "center",
  },
  emptyText: {
    fontSize: fs(3.5),
    fontStyle: "italic",
  },
  bugCard: {
    borderRadius: wp(2.5),
    padding: wp(3.5),
    borderWidth: 1,
    gap: hp(0.6),
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badge: {
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.2),
    borderRadius: wp(1),
  },
  badgeText: {
    fontSize: fs(2.3),
    fontWeight: "700",
    textTransform: "uppercase",
  },
  metaRowElement: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaRowText: {
    fontSize: fs(2.8),
  },
  cardTitle: {
    fontSize: fs(3.5),
    fontWeight: "700",
  },
  taskBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.3),
    borderRadius: wp(1),
    borderWidth: 1,
  },
  taskBadgeText: {
    fontSize: fs(2.6),
    fontWeight: "600",
  },
  cardDesc: {
    fontSize: fs(3),
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    paddingTop: hp(1),
    marginTop: hp(0.5),
  },
  footerUserData: {
    fontSize: fs(2.8),
    fontWeight: "600",
  },
  paginationBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.2),
    borderTopWidth: 1,
  },
  pageBtn: {
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.8),
    borderRadius: wp(1.5),
    borderWidth: 1,
  },
  pageBtnText: {
    fontSize: fs(2.8),
    fontWeight: "600",
  },
  pageInfoText: {
    fontSize: fs(2.8),
    fontWeight: "600",
  },
});