import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { format, parseISO, addDays } from "date-fns";
import { useTheme } from "@/contexts/ThemeContext";
import { getEmployeeSchedule } from "@/lib/admin/apiClient";

interface ScheduleEvent {
  id: string;
  title: string;
  day: string;
  location: string;
  startTime: string;
  endTime: string;
  type: string;
}

export default function EmployeeSchedule() {
  const { uiTheme } = useTheme();

  const isLightTheme = useMemo(() => {
    return uiTheme.theme?.includes("crystal") || uiTheme.panelColors?.dashboardTextColor === "#000000";
  }, [uiTheme]);

  const bg = useMemo(() => uiTheme.panelColors?.dashboardBackground || (isLightTheme ? "#ffffff" : "#09090b"), [uiTheme, isLightTheme]);
  const cardBg = useMemo(() => uiTheme.panelColors?.dashboardCardBackground || (isLightTheme ? "#18181b" : "#18181b"), [uiTheme, isLightTheme]);
  const tintColor = useMemo(() => uiTheme.panelColors?.dashboardTextColor || (isLightTheme ? "#0f172a" : "#ffffff"), [uiTheme, isLightTheme]);
  const mutedText = useMemo(() => (isLightTheme ? "#64748b" : "#a1a1aa"), [isLightTheme]);
  const primaryColor = useMemo(() => uiTheme.customColors?.primary || "#6366f1", [uiTheme]);
  const border = useMemo(() => (isLightTheme ? "rgba(0, 0, 0, 0.08)" : "rgba(255, 255, 255, 0.08)"), [isLightTheme]);

  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);

  useEffect(() => {
    async function loadSchedule() {
      try {
        const res = await getEmployeeSchedule();
        setEvents(res.items || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadSchedule();
  }, []);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const titleMatch = (event.title || "").toLowerCase().includes(searchTerm.toLowerCase());
      const locationMatch = (event.location || "").toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSearch = titleMatch || locationMatch;
      const matchesType = filterType === "all" || event.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [events, searchTerm, filterType]);

  const uniqueTypes = useMemo(() => {
    return Array.from(new Set(events.map((e) => e.type).filter(Boolean)));
  }, [events]);

  const upcomingEvents = filteredEvents;
  const pastEvents: ScheduleEvent[] = [];

  const formatEventDate = (day: string) => {
    if (day && !day.includes("-")) return day;
    try {
      return format(parseISO(day), "MMM d, yyyy");
    } catch {
      return day || "No date";
    }
  };

  const formatEventDay = (day: string) => {
    if (day && !day.includes("-")) return day;
    try {
      const date = parseISO(day);
      const today = new Date();
      const tomorrow = addDays(today, 1);
      
      if (format(date, "yyyy-MM-dd") === format(today, "yyyy-MM-dd")) return "Today";
      if (format(date, "yyyy-MM-dd") === format(tomorrow, "yyyy-MM-dd")) return "Tomorrow";
      return format(date, "EEEE");
    } catch {
      return "";
    }
  };

  const badgeColorMap: Record<string, { bg: string; text: string }> = {
    meeting: { bg: "rgba(168, 85, 247, 0.12)", text: "#a855f7" },
    shift: { bg: "rgba(59, 130, 246, 0.12)", text: "#3b82f6" },
    training: { bg: "rgba(34, 197, 94, 0.12)", text: "#22c55e" },
    overtime: { bg: "rgba(249, 115, 22, 0.12)", text: "#f97316" },
    holiday: { bg: "rgba(239, 68, 68, 0.12)", text: "#ef4444" },
  };

  const getTypeStyle = (type: string) => {
    return badgeColorMap[type?.toLowerCase()] || { bg: "rgba(113, 113, 122, 0.12)", text: "#a1a1aa" };
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.mainContainer, { backgroundColor: bg, justifyContent: "center" }]}>
        <ActivityIndicator size="large" color={primaryColor} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.mainContainer, { backgroundColor: bg }]}>
      <StatusBar barStyle={isLightTheme ? "dark-content" : "light-content"} backgroundColor={bg} />
      
      <ScrollView contentContainerStyle={styles.scrollArea} showsVerticalScrollIndicator={false}>
        <View style={styles.viewHeaderRow}>
          <Text style={[styles.viewTitle, { color: tintColor }]}>My Schedule</Text>
          <View style={[styles.countTag, { borderColor: border }]}>
            <Text style={[styles.countTagText, { color: tintColor }]}>{upcomingEvents.length} upcoming</Text>
          </View>
        </View>

        <View style={[styles.searchFilterCard, { backgroundColor: cardBg, borderColor: border }]}>
          <View style={styles.searchBarContainer}>
            <Ionicons name="search" size={16} color={mutedText} style={styles.searchIcon} />
            <TextInput
              placeholder="Search events..."
              placeholderTextColor={mutedText}
              value={searchTerm}
              onChangeText={setSearchTerm}
              style={[styles.inputField, { color: tintColor }]}
            />
          </View>

          <TouchableOpacity 
            style={[styles.dropdownTriggerRow, { borderTopColor: border }]} 
            onPress={() => setShowTypeDropdown(!showTypeDropdown)}
            activeOpacity={0.8}
          >
            <Ionicons name="funnel-outline" size={14} color={mutedText} style={{ marginRight: 6 }} />
            <Text style={[styles.dropdownSelectedLabel, { color: tintColor }]}>
              {filterType === "all" ? "All Types" : filterType.charAt(0).toUpperCase() + filterType.slice(1)}
            </Text>
            <Ionicons name={showTypeDropdown ? "chevron-up" : "chevron-down"} size={14} color={mutedText} />
          </TouchableOpacity>

          {showTypeDropdown && (
            <View style={[styles.dropdownContentMenu, { borderTopColor: border }]}>
              <TouchableOpacity 
                style={styles.dropdownOptionRow} 
                onPress={() => { setFilterType("all"); setShowTypeDropdown(false); }}
              >
                <Text style={[styles.dropdownOptionText, { color: filterType === "all" ? primaryColor : tintColor }]}>All Types</Text>
              </TouchableOpacity>
              {uniqueTypes.map((type) => (
                <TouchableOpacity 
                  key={type} 
                  style={styles.dropdownOptionRow} 
                  onPress={() => { setFilterType(type); setShowTypeDropdown(false); }}
                >
                  <Text style={[styles.dropdownOptionText, { color: filterType === type ? primaryColor : tintColor }]}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={[styles.eventsGroupWrapper, { backgroundColor: cardBg, borderColor: border }]}>
          <View style={[styles.sectionHeadingRow, { borderBottomColor: border }]}>
            <Ionicons name="calendar" size={16} color={tintColor} style={{ marginRight: 6 }} />
            <Text style={[styles.sectionTitleLabel, { color: tintColor }]}>Upcoming Events</Text>
            {upcomingEvents.length > 0 && (
              <View style={[styles.inlineBadgeMetric, { backgroundColor: "rgba(19,55,103,0.15)" }]}>
                <Text style={styles.inlineBadgeMetricText}>{upcomingEvents.length}</Text>
              </View>
            )}
          </View>

          {upcomingEvents.length === 0 ? (
            <View style={styles.fallbackEmptyPane}>
              <Ionicons name="calendar-outline" size={36} color={mutedText} style={{ opacity: 0.4 }} />
              <Text style={[styles.fallbackEmptyLabel, { color: mutedText }]}>No upcoming events</Text>
            </View>
          ) : (
            <View style={styles.nodesListStack}>
              {upcomingEvents.map((event) => {
                const colorConfig = getTypeStyle(event.type);
                const dayLabel = formatEventDay(event.day);
                return (
                  <View key={event.id} style={[styles.eventItemRowNode, { borderBottomColor: border }]}>
                    <View style={[styles.eventSquareAvatar, { backgroundColor: "rgba(19,55,103,0.08)" }]}>
                      <Ionicons name="briefcase" size={18} color="#133767" />
                    </View>
                    <View style={styles.eventMainMetaBlock}>
                      <View style={styles.eventTopLineInfo}>
                        <Text style={[styles.eventMainTitle, { color: tintColor }]} numberOfLines={1}>{event.title}</Text>
                        <View style={[styles.typeBadgeContainer, { backgroundColor: colorConfig.bg }]}>
                          <Text style={[styles.typeBadgeValue, { color: colorConfig.text }]}>{event.type}</Text>
                        </View>
                      </View>

                      <View style={styles.eventSubDetailsLayoutGrid}>
                        <View style={styles.subDetailItemRow}>
                          <Ionicons name="calendar-outline" size={11} color={mutedText} />
                          <Text style={[styles.subDetailItemText, { color: mutedText }]}>
                            {formatEventDate(event.day)}
                            {dayLabel ? <Text style={{ color: primaryColor, fontWeight: "600" }}> ({dayLabel})</Text> : null}
                          </Text>
                        </View>

                        <View style={styles.subDetailItemRow}>
                          <Ionicons name="time-outline" size={11} color={mutedText} />
                          <Text style={[styles.subDetailItemText, { color: mutedText }]}>
                            {event.startTime || "--:--"} - {event.endTime || "--:--"}
                          </Text>
                        </View>

                        <View style={styles.subDetailItemRow}>
                          <Ionicons name="map-outline" size={11} color={mutedText} />
                          <Text style={[styles.subDetailItemText, { color: mutedText }]} numberOfLines={1}>
                            {event.location || "No location"}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {pastEvents.length > 0 && (
          <View style={[styles.eventsGroupWrapper, { backgroundColor: cardBg, borderColor: border, marginTop: 16 }]}>
            <View style={[styles.sectionHeadingRow, { borderBottomColor: border }]}>
              <Ionicons name="calendar-outline" size={16} color={mutedText} style={{ marginRight: 6 }} />
              <Text style={[styles.sectionTitleLabel, { color: mutedText }]}>Past Events</Text>
              <View style={[styles.inlineBadgeMetric, { backgroundColor: "rgba(113,113,122,0.15)" }]}>
                <Text style={[styles.inlineBadgeMetricText, { color: mutedText }]}>{pastEvents.length}</Text>
              </View>
            </View>
            <View style={[styles.nodesListStack, { opacity: 0.6 }]}>
              {pastEvents.slice(0, 5).map((event) => (
                <View key={event.id} style={[styles.eventItemRowNode, { borderBottomColor: border }]}>
                  <View style={[styles.eventSquareAvatar, { backgroundColor: "rgba(113,113,122,0.08)" }]}>
                    <Ionicons name="briefcase-outline" size={18} color={mutedText} />
                  </View>
                  <View style={styles.eventMainMetaBlock}>
                    <View style={styles.eventTopLineInfo}>
                      <Text style={[styles.eventMainTitle, { color: tintColor }]} numberOfLines={1}>{event.title}</Text>
                      <View style={[styles.typeBadgeContainer, { backgroundColor: "rgba(113,113,122,0.1)" }]}>
                        <Text style={[styles.typeBadgeValue, { color: mutedText }]}>{event.type}</Text>
                      </View>
                    </View>
                    <View style={styles.eventSubDetailsLayoutGrid}>
                      <View style={styles.subDetailItemRow}>
                        <Ionicons name="calendar-outline" size={11} color={mutedText} />
                        <Text style={[styles.subDetailItemText, { color: mutedText }]}>{formatEventDate(event.day)}</Text>
                      </View>
                      <View style={styles.subDetailItemRow}>
                        <Ionicons name="time-outline" size={11} color={mutedText} />
                        <Text style={[styles.subDetailItemText, { color: mutedText }]}>{event.startTime} - {event.endTime}</Text>
                      </View>
                      <View style={styles.subDetailItemRow}>
                        <Ionicons name="map-outline" size={11} color={mutedText} />
                        <Text style={[styles.subDetailItemText, { color: mutedText }]}>{event.location || "No location"}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  scrollArea: {
    padding: 16,
  },
  viewHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  viewTitle: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  countTag: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  countTagText: {
    fontSize: 12,
    fontWeight: "600",
  },
  searchFilterCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    marginBottom: 16,
  },
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.03)",
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
  },
  searchIcon: {
    marginRight: 6,
  },
  inputField: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  dropdownTriggerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  dropdownSelectedLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
  dropdownContentMenu: {
    marginTop: 6,
    paddingTop: 4,
    borderTopWidth: 1,
    gap: 2,
  },
  dropdownOptionRow: {
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  dropdownOptionText: {
    fontSize: 13,
    fontWeight: "500",
  },
  eventsGroupWrapper: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  sectionHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
  },
  sectionTitleLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  inlineBadgeMetric: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  inlineBadgeMetricText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#133767",
  },
  fallbackEmptyPane: {
    padding: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  fallbackEmptyLabel: {
    fontSize: 13,
    marginTop: 8,
    fontWeight: "500",
  },
  nodesListStack: {
    flexDirection: "column",
  },
  eventItemRowNode: {
    flexDirection: "row",
    padding: 14,
    borderBottomWidth: 1,
    alignItems: "flex-start",
  },
  eventSquareAvatar: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  eventMainMetaBlock: {
    flex: 1,
  },
  eventTopLineInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  eventMainTitle: {
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
    marginRight: 8,
  },
  typeBadgeContainer: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeBadgeValue: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  eventSubDetailsLayoutGrid: {
    flexDirection: "column",
    gap: 4,
  },
  subDetailItemRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  subDetailItemText: {
    fontSize: 12,
    marginLeft: 5,
  },
});