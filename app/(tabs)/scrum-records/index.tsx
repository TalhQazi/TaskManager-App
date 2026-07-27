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
  Dimensions,
  Platform,
  StatusBar,
} from "react-native";
import {
  ClipboardList,
  Calendar,
  Clock,
  Search,
} from "lucide-react-native";
import { getEmployeeScrumRecords } from "@/lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";
import { s, wp, hp, fs } from "@/util/styles";

interface ScrumRecord {
  id: string;
  date: string;
  clockIn: string;
  clockOut: string;
  totalHours: number;
  scrum: string;
  createdAt: string;
}

interface ScrumDetails {
  tasksCompleted: string;
  issuesBlockers: string;
  notes: string;
}

export default function ScrumRecords() {
  const { uiTheme } = useTheme();
  const [records, setRecords] = useState<ScrumRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const isLightTheme = useMemo(() => {
    return uiTheme.theme?.includes("crystal") || uiTheme.panelColors?.dashboardTextColor === "#000000";
  }, [uiTheme]);

  const bg = useMemo(() => uiTheme.panelColors?.dashboardBackground || (isLightTheme ? "#ffffff" : "#09090b"), [uiTheme, isLightTheme]);
  const cardBg = useMemo(() => uiTheme.panelColors?.dashboardCardBackground || (isLightTheme ? "#f8fafc" : "#18181b"), [uiTheme, isLightTheme]);
  const tintColor = useMemo(() => uiTheme.panelColors?.dashboardTextColor || (isLightTheme ? "#0f172a" : "#ffffff"), [uiTheme, isLightTheme]);
  const mutedText = useMemo(() => (isLightTheme ? "#64748b" : "#a1a1aa"), [isLightTheme]);
  const primaryColor = useMemo(() => uiTheme.customColors?.primary || "#133767", [uiTheme]);
  const border = useMemo(() => (isLightTheme ? "rgba(0, 0, 0, 0.08)" : "rgba(255, 255, 255, 0.08)"), [isLightTheme]);

  useEffect(() => {
    const loadRecords = async () => {
      try {
        const res = await getEmployeeScrumRecords();
        const sorted = (res.items || []).sort((a: ScrumRecord, b: ScrumRecord) => {
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        });
        setRecords(sorted);
      } catch (err) {
        console.error(err);
        Alert.alert("Error", "Failed to load synchronization scrum records");
      } finally {
        setLoading(false);
      }
    };
    loadRecords();
  }, []);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const parseScrumDetails = (scrum: string): ScrumDetails => {
    try {
      const parsed = JSON.parse(scrum);
      return {
        tasksCompleted: parsed.tasksCompleted || "",
        issuesBlockers: parsed.issuesBlockers || "",
        notes: parsed.notes || "",
      };
    } catch {
      return { tasksCompleted: scrum, issuesBlockers: "", notes: "" };
    }
  };

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const normalSearch = searchTerm.toLowerCase();
      const scrumMatch = record.scrum.toLowerCase().includes(normalSearch);
      const dateMatch = new Date(record.date).toLocaleDateString().includes(searchTerm);
      return scrumMatch || dateMatch;
    });
  }, [records, searchTerm]);

  if (loading) {
    return (
      <SafeAreaView style={s([styles.centerContainerFallback, { backgroundColor: bg }])}>
        <StatusBar barStyle={isLightTheme ? "dark-content" : "light-content"} backgroundColor={bg} />
        <View style={s(styles.headerLayoutPadding)}>
          <Text style={s([styles.headerMainTitleText, { color: tintColor }])}>Scrum Records</Text>
        </View>
        <View style={s([styles.loadingPulseCard, { backgroundColor: cardBg, borderColor: border }])}>
          <ClipboardList size={fs(10)} color={mutedText} style={s(styles.pulseIconStyle)} />
          <ActivityIndicator size="small" color={primaryColor} style={s({ marginTop: hp(1) })} />
          <Text style={s([styles.fallbackMutedMessageText, { color: mutedText }])}>Loading system logs timeline...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s([styles.mainContainerWrapper, { backgroundColor: bg }])}>
      <StatusBar barStyle={isLightTheme ? "dark-content" : "light-content"} backgroundColor={bg} />
      
      <View style={s(styles.headerLayoutPadding)}>
        <View style={s(styles.headerTitleRowFlex)}>
          <View>
            <Text style={s([styles.headerMainTitleText, { color: tintColor }])}>Scrum Records</Text>
            <Text style={s([styles.headerSubtitleText, { color: mutedText }])}>Your daily scrum entries and work logs</Text>
          </View>
          <View style={s([styles.metricsBadgeIndicator, { backgroundColor: cardBg, borderColor: border }])}>
            <Text style={s([styles.metricsBadgeText, { color: tintColor }])}>{records.length} records</Text>
          </View>
        </View>
      </View>

      <View style={s([styles.searchControlCardContainer, { backgroundColor: cardBg, borderColor: border }])}>
        <View style={s([styles.searchBarInputWrapper, { backgroundColor: bg, borderColor: border }])}>
          <Search size={fs(3.8)} color={mutedText} style={s(styles.searchInlineLensIcon)} />
          <TextInput
            placeholder="Search scrum records..."
            placeholderTextColor={mutedText}
            value={searchTerm}
            onChangeText={setSearchTerm}
            style={s([styles.nativeInputFieldStyle, { color: tintColor }])}
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      <FlatList
        data={filteredRecords}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s(styles.listContainerContentPadding)}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Text style={s([styles.feedStructureTitleHeader, { color: mutedText }])}>Daily Scrum Entries</Text>
        }
        ListEmptyComponent={
          <View style={s(styles.emptyFeedFallbackContainer)}>
            <ClipboardList size={fs(14)} color={border} />
            <Text style={s([styles.emptyBoldTitleText, { color: tintColor }])}>No scrum records yet</Text>
            <Text style={s([styles.emptySubDetailMutedText, { color: mutedText }])}>
              Your scrum entries will appear here after you clock out with scrum details.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const details = parseScrumDetails(item.scrum);
          return (
            <View style={s([styles.scrumDataCardItemRow, { backgroundColor: cardBg, borderColor: border }])}>
              
              <View style={s([styles.cardHeaderTimelineRow, { borderBottomColor: border }])}>
                <View style={s(styles.calendarInlineMetaLine)}>
                  <Calendar size={fs(3.5)} color={mutedText} />
                  <Text style={s([styles.cardFormattedDateText, { color: tintColor }])}>{formatDate(item.date)}</Text>
                </View>
                <View style={s([styles.durationBadgeWrapper, { backgroundColor: isLightTheme ? "rgba(19, 55, 103, 0.08)" : "rgba(59, 130, 246, 0.15)" }])}>
                  <Text style={s([styles.durationBadgeText, { color: primaryColor }])}>
                    {item.totalHours?.toFixed(2) || "0.00"}h
                  </Text>
                </View>
              </View>

              <View style={s(styles.shiftTimelineParametersGrid)}>
                <View style={s([styles.gridMetricBlockItem, { backgroundColor: bg, borderColor: border }])}>
                  <Text style={s([styles.gridMetricLabelKey, { color: mutedText }])}>Clock In</Text>
                  <View style={s(styles.timeLineValueLineIconRow)}>
                    <Clock size={fs(3.2)} color="rgb(34, 197, 94)" />
                    <Text style={s([styles.gridMetricTimeValueText, { color: tintColor }])}>{item.clockIn || "--:--"}</Text>
                  </View>
                </View>

                <View style={s([styles.gridMetricBlockItem, { backgroundColor: bg, borderColor: border }])}>
                  <Text style={s([styles.gridMetricLabelKey, { color: mutedText }])}>Clock Out</Text>
                  <View style={s(styles.timeLineValueLineIconRow)}>
                    <Clock size={fs(3.2)} color={primaryColor} />
                    <Text style={s([styles.gridMetricTimeValueText, { color: tintColor }])}>{item.clockOut || "--:--"}</Text>
                  </View>
                </View>
              </View>

              <View style={s([styles.scrumDetailsParsedContentBox, { backgroundColor: bg, borderColor: border }])}>
                {details.tasksCompleted ? (
                  <View style={s(styles.detailTextParagraphWrap)}>
                    <Text style={s([styles.detailLabelBoldPrefixText, { color: tintColor }])}>Tasks Done:</Text>
                    <Text style={s([styles.detailDescriptionValueBodyText, { color: mutedText }])}>{details.tasksCompleted}</Text>
                  </View>
                ) : null}

                {details.issuesBlockers ? (
                  <View style={s(styles.detailTextParagraphWrap)}>
                    <Text style={s([styles.detailLabelBoldPrefixText, { color: "rgb(239, 68, 68)" }])}>Issues:</Text>
                    <Text style={s([styles.detailDescriptionValueBodyText, { color: isLightTheme ? "rgb(185, 28, 28)" : "rgba(239, 68, 68, 0.9)" }])}>
                      {details.issuesBlockers}
                    </Text>
                  </View>
                ) : null}

                {details.notes ? (
                  <View style={s(styles.detailTextParagraphWrap)}>
                    <Text style={s([styles.detailLabelBoldPrefixText, { color: tintColor }])}>Notes:</Text>
                    <Text style={s([styles.detailDescriptionValueBodyText, { color: mutedText }])}>{details.notes}</Text>
                  </View>
                ) : null}

                {!details.tasksCompleted && !details.issuesBlockers && !details.notes ? (
                  <Text style={s([styles.noInformationItalicText, { color: mutedText }])}>No scrum details submitted with this record</Text>
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
  },
  centerContainerFallback: {
    flex: 1,
  },
  headerLayoutPadding: {
    paddingHorizontal: wp(4),
    marginTop: hp(1.8),
    marginBottom: hp(1.5),
  },
  headerTitleRowFlex: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerMainTitleText: {
    fontSize: fs(5.5),
    fontWeight: "800",
  },
  headerSubtitleText: {
    fontSize: fs(3.2),
    marginTop: hp(0.3),
  },
  metricsBadgeIndicator: {
    borderWidth: 1,
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.6),
    borderRadius: wp(2),
  },
  metricsBadgeText: {
    fontSize: fs(2.8),
    fontWeight: "600",
  },
  searchControlCardContainer: {
    borderWidth: 1,
    borderRadius: wp(3),
    marginHorizontal: wp(4),
    padding: wp(2.5),
    marginBottom: hp(2),
  },
  searchBarInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: wp(2),
    height: hp(5),
    paddingHorizontal: wp(2.5),
  },
  searchInlineLensIcon: {
    marginRight: wp(2),
  },
  nativeInputFieldStyle: {
    flex: 1,
    fontSize: fs(3.2),
    height: "100%",
    paddingVertical: 0,
  },
  listContainerContentPadding: {
    paddingHorizontal: wp(4),
    paddingBottom: hp(4),
  },
  feedStructureTitleHeader: {
    fontSize: fs(3.5),
    fontWeight: "700",
    marginBottom: hp(1.5),
    marginTop: hp(0.5),
  },
  loadingPulseCard: {
    borderWidth: 1,
    borderRadius: wp(3),
    marginHorizontal: wp(4),
    padding: wp(8),
    alignItems: "center",
    justifyContent: "center",
    gap: hp(1.5),
  },
  pulseIconStyle: {
    opacity: 0.6,
  },
  fallbackMutedMessageText: {
    fontSize: fs(3.2),
  },
  emptyFeedFallbackContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: hp(8),
    paddingHorizontal: wp(5),
  },
  emptyBoldTitleText: {
    fontSize: fs(4),
    fontWeight: "700",
    marginTop: hp(1.8),
    marginBottom: hp(0.5),
  },
  emptySubDetailMutedText: {
    fontSize: fs(3.2),
    textAlign: "center",
    lineHeight: fs(4.5),
  },
  scrumDataCardItemRow: {
    borderWidth: 1,
    borderRadius: wp(3),
    padding: wp(3.5),
    marginBottom: hp(1.5),
  },
  cardHeaderTimelineRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    paddingBottom: hp(1.2),
    marginBottom: hp(1.2),
  },
  calendarInlineMetaLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp(1.5),
  },
  cardFormattedDateText: {
    fontSize: fs(3.2),
    fontWeight: "700",
  },
  durationBadgeWrapper: {
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.4),
    borderRadius: wp(1.5),
  },
  durationBadgeText: {
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontSize: fs(2.8),
    fontWeight: "700",
  },
  shiftTimelineParametersGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: hp(1.5),
    gap: wp(3),
  },
  gridMetricBlockItem: {
    flex: 1,
    borderWidth: 1,
    borderRadius: wp(2),
    padding: wp(2),
  },
  gridMetricLabelKey: {
    fontSize: fs(2.5),
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: hp(0.5),
  },
  timeLineValueLineIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp(1.2),
  },
  gridMetricTimeValueText: {
    fontSize: fs(3.2),
    fontWeight: "600",
  },
  scrumDetailsParsedContentBox: {
    borderWidth: 1,
    borderRadius: wp(2),
    padding: wp(3),
    gap: hp(1),
  },
  detailTextParagraphWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
  },
  detailLabelBoldPrefixText: {
    fontSize: fs(2.8),
    fontWeight: "700",
    marginRight: wp(1.2),
    lineHeight: fs(4.2),
  },
  detailDescriptionValueBodyText: {
    flex: 1,
    fontSize: fs(2.8),
    lineHeight: fs(4.2),
  },
  noInformationItalicText: {
    fontSize: fs(2.8),
    fontStyle: "italic",
  },
});