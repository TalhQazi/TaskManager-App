import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  Dimensions,Platform
} from "react-native";

// Native Dark Vector Icons
import {
  ClipboardList,
  Calendar,
  Clock,
  Search,
} from "lucide-react-native";

// Shared API mapping from your internal data module layers
import { getEmployeeScrumRecords } from "@/lib/admin/apiClient";

// --- Type Safety Blueprints ---
interface ScrumRecord {
  id: string;
  date: string;
  clockIn: string;
  clockOut: string;
  totalHours: number;
  scrum: string;
  createdAt: string;
}

// --- Premium Dark Mode Colors ---
const THEME = {
  bgCanvas: "#0B0F19",
  bgSurface: "#161D30",
  bgCard: "#1F2A45",
  border: "#2A3958",
  textPrimary: "#F3F4F6",
  textSecondary: "#9CA3AF",
  textMuted: "#6B7280",
  primary: "#3B82F6",
  accent: "#10B981",
  danger: "#EF4444",
};

export default function ScrumRecords() {
  const [records, setRecords] = useState<ScrumRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // --- Initial Data Matrix Synchronization ---
  useEffect(() => {
    const loadRecords = async () => {
      try {
        const res = await getEmployeeScrumRecords();
        
        // Sort by date descending (newest first)
        const sorted = (res.items || []).sort((a: ScrumRecord, b: ScrumRecord) => {
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        });
        setRecords(sorted);
      } catch (err) {
        console.error("Failed to load scrum records:", err);
        Alert.alert("Error", "Failed to load synchronization scrum records");
      } finally {
        setLoading(false);
      }
    };
    loadRecords();
  }, []);

  // --- Formatting & Parser Utility Functions ---
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const parseScrumDetails = (scrum: string) => {
    try {
      const parsed = JSON.parse(scrum);
      return {
        tasksCompleted: parsed.tasksCompleted || "",
        issuesBlockers: parsed.issuesBlockers || "",
        notes: parsed.notes || "",
      };
    } catch {
      // Graceful fallback for unstructured or legacy raw string payloads
      return { tasksCompleted: scrum, issuesBlockers: "", notes: "" };
    }
  };

  // --- Optimizing Search Index Matrix Filter ---
  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const normalSearch = searchTerm.toLowerCase();
      const scrumMatch = record.scrum.toLowerCase().includes(normalSearch);
      const dateMatch = new Date(record.date).toLocaleDateString().includes(searchTerm);
      return scrumMatch || dateMatch;
    });
  }, [records, searchTerm]);

  // --- Loading State Renderer View ---
  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainerFallback}>
        <View style={styles.headerLayoutPadding}>
          <Text style={styles.headerMainTitleText}>Scrum Records</Text>
        </View>
        <View style={styles.loadingPulseCard}>
          <ClipboardList size={40} color={THEME.textMuted} style={styles.pulseIconStyle} />
          <ActivityIndicator size="small" color={THEME.primary} style={{ marginTop: 8 }} />
          <Text style={styles.fallbackMutedMessageText}>Loading system logs timeline...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.mainContainerWrapper}>
      
      {/* --- Section Header Row Layout --- */}
      <View style={styles.headerLayoutPadding}>
        <View style={styles.headerTitleRowFlex}>
          <View>
            <Text style={styles.headerMainTitleText}>Scrum Records</Text>
            <Text style={styles.headerSubtitleText}>Your daily scrum entries and work logs</Text>
          </View>
          <View style={styles.metricsBadgeIndicator}>
            <Text style={styles.metricsBadgeText}>{records.length} records</Text>
          </View>
        </View>
      </View>

      {/* --- Fuzzy Context Search Container --- */}
      <View style={styles.searchControlCardContainer}>
        <View style={styles.searchBarInputWrapper}>
          <Search size={16} color={THEME.textMuted} style={styles.searchInlineLensIcon} />
          <TextInput
            placeholder="Search scrum records..."
            placeholderTextColor={THEME.textMuted}
            value={searchTerm}
            onChangeText={(text) => setSearchTerm(text)}
            style={styles.nativeInputFieldStyle}
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {/* --- Optimized Native Layout Stream List --- */}
      <FlatList
        data={filteredRecords}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainerContentPadding}
        ListHeaderComponent={
          <Text style={styles.feedStructureTitleHeader}>Daily Scrum Entries</Text>
        }
        ListEmptyComponent={
          <View style={styles.emptyFeedFallbackContainer}>
            <ClipboardList size={56} color={THEME.border} />
            <Text style={styles.emptyBoldTitleText}>No scrum records yet</Text>
            <Text style={styles.emptySubDetailMutedText}>
              Your scrum entries will appear here after you clock out with scrum details.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const details = parseScrumDetails(item.scrum);
          return (
            <View style={styles.scrumDataCardItemRow}>
              
              {/* Card Meta Timeline Top Header Bar */}
              <View style={styles.cardHeaderTimelineRow}>
                <View style={styles.calendarInlineMetaLine}>
                  <Calendar size={14} color={THEME.textMuted} />
                  <Text style={styles.cardFormattedDateText}>{formatDate(item.date)}</Text>
                </View>
                <View style={styles.durationBadgeWrapper}>
                  <Text style={styles.durationBadgeText}>
                    {item.totalHours?.toFixed(2) || "0.00"}h
                  </Text>
                </View>
              </View>

              {/* Time Matrix Shift Parameters Grid Line */}
              <View style={styles.shiftTimelineParametersGrid}>
                <View style={styles.gridMetricBlockItem}>
                  <Text style={styles.gridMetricLabelKey}>Clock In</Text>
                  <View style={styles.timeLineValueLineIconRow}>
                    <Clock size={12} color={THEME.accent} />
                    <Text style={styles.gridMetricTimeValueText}>{item.clockIn || "--:--"}</Text>
                  </View>
                </View>

                <View style={styles.gridMetricBlockItem}>
                  <Text style={styles.gridMetricLabelKey}>Clock Out</Text>
                  <View style={styles.timeLineValueLineIconRow}>
                    <Clock size={12} color={THEME.primary} />
                    <Text style={styles.gridMetricTimeValueText}>{item.clockOut || "--:--"}</Text>
                  </View>
                </View>
              </View>

              {/* Parsed System Scrum Details Box */}
              <View style={styles.scrumDetailsParsedContentBox}>
                {details.tasksCompleted ? (
                  <View style={styles.detailTextParagraphWrap}>
                    <Text style={styles.detailLabelBoldPrefixText}>Tasks Done:</Text>
                    <Text style={styles.detailDescriptionValueBodyText}>{details.tasksCompleted}</Text>
                  </View>
                ) : null}

                {details.issuesBlockers ? (
                  <View style={styles.detailTextParagraphWrap}>
                    <Text style={[styles.detailLabelBoldPrefixText, { color: THEME.danger }]}>Issues:</Text>
                    <Text style={[styles.detailDescriptionValueBodyText, { color: "rgba(239,68,68,0.85)" }]}>
                      {details.issuesBlockers}
                    </Text>
                  </View>
                ) : null}

                {details.notes ? (
                  <View style={styles.detailTextParagraphWrap}>
                    <Text style={styles.detailLabelBoldPrefixText}>Notes:</Text>
                    <Text style={styles.detailDescriptionValueBodyText}>{details.notes}</Text>
                  </View>
                ) : null}

                {!details.tasksCompleted && !details.issuesBlockers && !details.notes ? (
                  <Text style={styles.noInformationItalicText}>No scrum details submitted with this record</Text>
                ) : null}
              </View>

            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  mainContainerWrapper: {
    flex: 1,
    backgroundColor: THEME.bgCanvas,
  },
  centerContainerFallback: {
    flex: 1,
    backgroundColor: THEME.bgCanvas,
  },
  headerLayoutPadding: {
    paddingHorizontal: 16,
    marginTop: 14,
    marginBottom: 12,
  },
  headerTitleRowFlex: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerMainTitleText: {
    fontSize: 22,
    fontWeight: "800",
    color: THEME.textPrimary,
  },
  headerSubtitleText: {
    fontSize: 13,
    color: THEME.textMuted,
    marginTop: 2,
  },
  metricsBadgeIndicator: {
    borderWidth: 1,
    borderColor: THEME.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: THEME.bgSurface,
  },
  metricsBadgeText: {
    color: THEME.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  searchControlCardContainer: {
    backgroundColor: THEME.bgSurface,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 12,
    marginHorizontal: 16,
    padding: 10,
    marginBottom: 16,
  },
  searchBarInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.bgCanvas,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 8,
    height: 40,
    paddingHorizontal: 10,
  },
  searchInlineLensIcon: {
    marginRight: 8,
  },
  nativeInputFieldStyle: {
    flex: 1,
    color: THEME.textPrimary,
    fontSize: 14,
    height: "100%",
  },
  listContainerContentPadding: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  feedStructureTitleHeader: {
    fontSize: 15,
    fontWeight: "700",
    color: THEME.textSecondary,
    marginBottom: 12,
    marginTop: 4,
  },
  loadingPulseCard: {
    backgroundColor: THEME.bgSurface,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 12,
    marginHorizontal: 16,
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  pulseIconStyle: {
    opacity: 0.6,
  },
  fallbackMutedMessageText: {
    color: THEME.textMuted,
    fontSize: 13,
  },
  emptyFeedFallbackContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
    paddingHorizontal: 20,
  },
  emptyBoldTitleText: {
    fontSize: 16,
    fontWeight: "700",
    color: THEME.textSecondary,
    marginTop: 14,
    marginBottom: 4,
  },
  emptySubDetailMutedText: {
    fontSize: 13,
    color: THEME.textMuted,
    textAlign: "center",
    lineHeight: 18,
  },
  scrumDataCardItemRow: {
    backgroundColor: THEME.bgSurface,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  cardHeaderTimelineRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
    paddingBottom: 10,
    marginBottom: 10,
  },
  calendarInlineMetaLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cardFormattedDateText: {
    fontSize: 13,
    fontWeight: "700",
    color: THEME.textPrimary,
  },
  durationBadgeWrapper: {
    backgroundColor: "rgba(59,130,246,0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  durationBadgeText: {
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontSize: 11,
    fontWeight: "700",
    color: THEME.primary,
  },
  shiftTimelineParametersGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 12,
  },
  gridMetricBlockItem: {
    flex: 1,
    backgroundColor: THEME.bgCanvas,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 8,
    padding: 8,
  },
  gridMetricLabelKey: {
    fontSize: 10,
    color: THEME.textMuted,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  timeLineValueLineIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  gridMetricTimeValueText: {
    fontSize: 13,
    fontWeight: "600",
    color: THEME.textPrimary,
  },
  scrumDetailsParsedContentBox: {
    backgroundColor: THEME.bgCard,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  detailTextParagraphWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
  },
  detailLabelBoldPrefixText: {
    fontSize: 12,
    fontWeight: "700",
    color: THEME.textPrimary,
    marginRight: 5,
    lineHeight: 18,
  },
  detailDescriptionValueBodyText: {
    flex: 1,
    fontSize: 12,
    color: THEME.textSecondary,
    lineHeight: 18,
  },
  noInformationItalicText: {
    fontSize: 12,
    color: THEME.textMuted,
    fontStyle: "italic",
  },
});