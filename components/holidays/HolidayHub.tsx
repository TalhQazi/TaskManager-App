import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
} from "react-native";
import {
  Calendar as CalendarIcon,
  List as ListIcon,
  Search,
  Plus,
  Sparkles,
  Clock,
} from "lucide-react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTokens } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  HolidayItem,
  HolidayPayload,
  getHolidays,
  getUpcomingHolidays,
  createHoliday,
  updateHoliday,
  deleteHoliday,
} from "@/lib/admin/apiClient";
import HolidayCard from "./HolidayCard";
import HolidayCalendarView from "./HolidayCalendarView";
import HolidayDetailModal from "./HolidayDetailModal";
import HolidayEditorModal from "./HolidayEditorModal";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

interface HolidayHubProps {
  role?: "employee" | "manager" | "admin";
  headerTitle?: string;
}

const CATEGORY_TABS: { id: string; label: string }[] = [
  { id: "all", label: "All Holidays" },
  { id: "national", label: "National" },
  { id: "religious", label: "Religious" },
  { id: "cultural", label: "Cultural" },
];

const COUNTRY_OPTIONS = [
  { label: "All Locations", value: "all" },
  { label: "🌐 Global", value: "global" },
  { label: "🇺🇸 United States", value: "US" },
  { label: "🇮🇳 India", value: "IN" },
  { label: "🇨🇦 Canada", value: "CA" },
  { label: "🇬🇧 United Kingdom", value: "GB" },
  { label: "🇦🇺 Australia", value: "AU" },
  { label: "🇫🇷 France", value: "FR" },
  { label: "🇩🇪 Germany", value: "DE" },
  { label: "🇨🇳 China", value: "CN" },
];

export default function HolidayHub({
  role = "employee",
  headerTitle = "Holiday Calendar",
}: HolidayHubProps) {
  const tokens = useTokens();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const isAdmin = role === "admin" || user?.role === "admin" || user?.role === "super-admin";

  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedCountry, setSelectedCountry] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [selectedHoliday, setSelectedHoliday] = useState<HolidayItem | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [editorModalOpen, setEditorModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<HolidayItem | null>(null);

  // Queries
  const {
    data: holidaysData,
    isLoading: loadingHolidays,
    isRefetching: refetchingHolidays,
    refetch: refetchHolidays,
  } = useQuery({
    queryKey: ["holidays", selectedCountry, selectedCategory, searchQuery],
    queryFn: () =>
      getHolidays({
        country: selectedCountry !== "all" ? selectedCountry : undefined,
        category: selectedCategory !== "all" ? selectedCategory : undefined,
        search: searchQuery.trim() || undefined,
        active: "true",
      }),
  });

  const { data: upcomingData } = useQuery({
    queryKey: ["holidays-upcoming"],
    queryFn: () => getUpcomingHolidays(),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: HolidayPayload) => createHoliday(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
      queryClient.invalidateQueries({ queryKey: ["holidays-upcoming"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<HolidayPayload> }) =>
      updateHoliday(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
      queryClient.invalidateQueries({ queryKey: ["holidays-upcoming"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteHoliday(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
      queryClient.invalidateQueries({ queryKey: ["holidays-upcoming"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const holidays = holidaysData?.items || [];
  const nextHoliday = upcomingData?.nextHoliday;

  const handleOpenDetail = (holiday: HolidayItem) => {
    setSelectedHoliday(holiday);
    setDetailModalOpen(true);
  };

  const handleOpenCreate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingHoliday(null);
    setEditorModalOpen(true);
  };

  const handleOpenEdit = (holiday: HolidayItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingHoliday(holiday);
    setEditorModalOpen(true);
  };

  const handleDelete = (holiday: HolidayItem) => {
    Alert.alert(
      "Delete Holiday",
      `Are you sure you want to delete "${holiday.displayName}"? This will remove it from all company schedules.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteMutation.mutate(holiday.id),
        },
      ]
    );
  };

  const handleSaveHoliday = async (payload: HolidayPayload, id?: string) => {
    if (id) {
      await updateMutation.mutateAsync({ id, payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: tokens.canvas }]}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refetchingHolidays}
            onRefresh={refetchHolidays}
            tintColor={tokens.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Title Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: tokens.textPrimary }]}>{headerTitle}</Text>
            <Text style={[styles.subtitle, { color: tokens.textMuted }]}>
              {role === "admin"
                ? "Manage global, regional, and company holidays"
                : role === "manager"
                ? "Team holiday calendar and localized schedules"
                : "Upcoming company observances and scheduled time off"}
            </Text>
          </View>

          {isAdmin && (
            <TouchableOpacity
              onPress={handleOpenCreate}
              style={[styles.addBtn, { backgroundColor: tokens.primary }]}
              activeOpacity={0.8}
            >
              <Plus size={16} color="#ffffff" style={{ marginRight: 4 }} />
              <Text style={styles.addBtnText}>Add Holiday</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Hero Spotlight: Next Upcoming Holiday */}
        {nextHoliday && (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => handleOpenDetail(nextHoliday)}
            style={styles.heroCard}
          >
            <LinearGradient
              colors={[
                nextHoliday.themeConfig?.colorConfig?.from || "#1e3a8a",
                nextHoliday.themeConfig?.colorConfig?.via || "#3b82f6",
                nextHoliday.themeConfig?.colorConfig?.to || "#60a5fa",
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroGradient}
            >
              <View style={styles.heroTopRow}>
                <View style={styles.heroBadge}>
                  <Sparkles size={13} color="#ffffff" style={{ marginRight: 4 }} />
                  <Text style={styles.heroBadgeText}>Next Observed Holiday</Text>
                </View>

                <View style={styles.heroCountdownPill}>
                  <Clock size={12} color="#ffffff" style={{ marginRight: 4 }} />
                  <Text style={styles.heroCountdownText}>
                    {nextHoliday.status === "today"
                      ? "TODAY"
                      : nextHoliday.daysUntil === 1
                      ? "Tomorrow"
                      : `In ${nextHoliday.daysUntil} Days`}
                  </Text>
                </View>
              </View>

              <Text style={styles.heroTitle} numberOfLines={1}>
                {nextHoliday.displayName}
              </Text>
              <Text style={styles.heroDate}>
                {nextHoliday.calculatedDates?.startDateStr} • {nextHoliday.region} ({nextHoliday.country_code?.toUpperCase()})
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Search & View Switcher Bar */}
        <View style={styles.controlsRow}>
          <View style={[styles.searchBox, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
            <Search size={16} color={tokens.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search holidays, country, region..."
              placeholderTextColor={tokens.textMuted}
              style={[styles.searchInput, { color: tokens.textPrimary }]}
            />
          </View>

          {/* Segmented View Switcher */}
          <View style={[styles.viewSwitcher, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setViewMode("list");
              }}
              style={[
                styles.switchBtn,
                viewMode === "list" && { backgroundColor: tokens.primary },
              ]}
            >
              <ListIcon
                size={16}
                color={viewMode === "list" ? "#ffffff" : tokens.textSecondary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setViewMode("calendar");
              }}
              style={[
                styles.switchBtn,
                viewMode === "calendar" && { backgroundColor: tokens.primary },
              ]}
            >
              <CalendarIcon
                size={16}
                color={viewMode === "calendar" ? "#ffffff" : tokens.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Category Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {CATEGORY_TABS.map((tab) => {
            const isSelected = selectedCategory === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedCategory(tab.id);
                }}
                style={[
                  styles.filterChip,
                  { backgroundColor: tokens.surface, borderColor: tokens.border },
                  isSelected && {
                    backgroundColor: "rgba(59, 130, 246, 0.15)",
                    borderColor: tokens.primary,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: tokens.textSecondary },
                    isSelected && { color: tokens.primary, fontWeight: "700" },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Country Quick Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.countryScroll}
        >
          {COUNTRY_OPTIONS.map((c) => {
            const isSelected = selectedCountry === c.value;
            return (
              <TouchableOpacity
                key={c.value}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedCountry(c.value);
                }}
                style={[
                  styles.countryChip,
                  { backgroundColor: tokens.surface, borderColor: tokens.border },
                  isSelected && {
                    backgroundColor: tokens.primary,
                    borderColor: tokens.primary,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.countryChipText,
                    { color: tokens.textSecondary },
                    isSelected && { color: "#ffffff", fontWeight: "700" },
                  ]}
                >
                  {c.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Main Content Area */}
        {loadingHolidays ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={tokens.primary} />
            <Text style={[styles.loadingText, { color: tokens.textMuted }]}>
              Loading holiday calendar...
            </Text>
          </View>
        ) : holidays.length === 0 ? (
          <View style={[styles.emptyContainer, { borderColor: tokens.border }]}>
            <CalendarIcon size={36} color={tokens.textMuted} style={{ marginBottom: 10 }} />
            <Text style={[styles.emptyTitle, { color: tokens.textPrimary }]}>No Holidays Found</Text>
            <Text style={[styles.emptySubtitle, { color: tokens.textMuted }]}>
              {searchQuery
                ? `No holidays match "${searchQuery}". Try clearing filters.`
                : "No holidays found for the selected category or country."}
            </Text>
            {(searchQuery || selectedCategory !== "all" || selectedCountry !== "all") && (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                  setSelectedCountry("all");
                }}
                style={[styles.resetBtn, { borderColor: tokens.primary }]}
              >
                <Text style={[styles.resetBtnText, { color: tokens.primary }]}>Reset Filters</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : viewMode === "calendar" ? (
          <HolidayCalendarView
            holidays={holidays}
            onSelectHoliday={handleOpenDetail}
            onEditHoliday={handleOpenEdit}
            onDeleteHoliday={handleDelete}
            isAdmin={isAdmin}
          />
        ) : (
          <View style={styles.listContainer}>
            <View style={styles.listHeaderRow}>
              <Text style={[styles.listCountText, { color: tokens.textMuted }]}>
                Showing {holidays.length} {holidays.length === 1 ? "holiday" : "holidays"}
              </Text>
            </View>

            {holidays.map((h) => (
              <HolidayCard
                key={h.id}
                holiday={h}
                onPress={handleOpenDetail}
                onEdit={handleOpenEdit}
                onDelete={handleDelete}
                isAdmin={isAdmin}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Modals */}
      <HolidayDetailModal
        visible={detailModalOpen}
        holiday={selectedHoliday}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedHoliday(null);
        }}
      />

      {isAdmin && (
        <HolidayEditorModal
          visible={editorModalOpen}
          holiday={editingHoliday}
          onClose={() => {
            setEditorModalOpen(false);
            setEditingHoliday(null);
          }}
          onSave={handleSaveHoliday}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
  },
  addBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  heroCard: {
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 16,
  },
  heroGradient: {
    padding: 16,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  heroBadgeText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  heroCountdownPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  heroCountdownText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
  },
  heroTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  heroDate: {
    color: "rgba(255, 255, 255, 0.85)",
    fontSize: 12,
    marginTop: 4,
    fontWeight: "500",
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    height: "100%",
  },
  viewSwitcher: {
    flexDirection: "row",
    borderRadius: 10,
    borderWidth: 1,
    padding: 3,
  },
  switchBtn: {
    width: 36,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 7,
  },
  filterScroll: {
    gap: 8,
    paddingBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  countryScroll: {
    gap: 8,
    paddingBottom: 14,
  },
  countryChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 7,
    borderWidth: 1,
  },
  countryChipText: {
    fontSize: 11,
    fontWeight: "500",
  },
  listContainer: {
    marginTop: 4,
  },
  listHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  listCountText: {
    fontSize: 12,
    fontWeight: "500",
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 13,
    marginTop: 10,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 36,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 4,
    maxWidth: 280,
  },
  resetBtn: {
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  resetBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
