import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Briefcase,
  Search,
  Filter,
  ChevronDown,
} from "lucide-react-native";
import { format, parseISO, addDays } from "date-fns";

// --- API Implementation Imports ---
import { getEmployeeSchedule } from "@/lib/admin/apiClient";
import { s, wp, hp, fs } from "@/util/styles";

interface ScheduleEvent {
  id: string;
  title: string;
  day: string;
  location: string;
  startTime: string;
  endTime: string;
  type: string;
}

// --- Shared Internal UI Layout Subcomponents ---
function Card({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={s([styles.card, style])}>{children}</View>;
}

function Badge({ children, style }: { children: React.ReactNode; style?: any }) {
  return (
    <View style={s([styles.badge, style])}>
      <Text style={s(styles.badgeText)}>{children}</Text>
    </View>
  );
}

export default function EmployeeScheduleScreen() {
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  useEffect(() => {
    const loadSchedule = async () => {
      try {
        const res = await getEmployeeSchedule();
        setEvents(res.items || []);
      } catch (err) {
        console.error("Failed to load schedule:", err);
      } finally {
        setLoading(false);
      }
    };
    loadSchedule();
  }, []);

  // Filter logic fully matching web setup
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const matchesSearch =
        event.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.location?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === "all" || event.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [events, searchTerm, filterType]);

  // Synchronized with Web: Since backend sends raw days ("Tue"), sort is raw layout map
  const upcomingEvents = filteredEvents;
  const pastEvents: ScheduleEvent[] = []; // Preserved structural array variable matching web setup

  const getTypeColorStyles = (type: string) => {
    switch (type?.toLowerCase()) {
      case "meeting":
        return { bg: "#4c1d9530", text: "#ddd6fe", border: "#7c3aed40" };
      case "shift":
        return { bg: "#1e3a8a30", text: "#bfdbfe", border: "#3b82f640" };
      case "training":
        return { bg: "#064e3b30", text: "#a7f3d0", border: "#10b98140" };
      case "overtime":
        return { bg: "#7c2d1230", text: "#ffedd5", border: "#f9731640" };
      case "holiday":
        return { bg: "#7f1d1d30", text: "#fca5a5", border: "#ef444440" };
      default:
        return { bg: "#27272a50", text: "#d4d4d8", border: "#3f3f4650" };
    }
  };

  const formatEventDate = (day: string) => {
    if (day && !day.includes("-")) {
      return day;
    }
    try {
      const date = parseISO(day);
      return format(date, "MMM d, yyyy");
    } catch {
      return day || "No date";
    }
  };

  const formatEventDay = (day: string) => {
    if (day && !day.includes("-")) {
      return day;
    }
    try {
      const date = parseISO(day);
      const today = new Date();
      const tomorrow = addDays(today, 1);

      if (format(date, "yyyy-MM-dd") === format(today, "yyyy-MM-dd")) {
        return "Today";
      }
      if (format(date, "yyyy-MM-dd") === format(tomorrow, "yyyy-MM-dd")) {
        return "Tomorrow";
      }
      return format(date, "EEEE");
    } catch {
      return "";
    }
  };

  // Extract list of unique filterable event types dynamically
  const uniqueTypes = useMemo(() => {
    return Array.from(new Set(events.map((e) => e.type).filter(Boolean)));
  }, [events]);

  if (loading) {
    return (
      <View style={s([styles.container, styles.center])}>
        <CalendarIcon color="#27272a" size={fs(12)} style={s({ marginBottom: hp(1.5) })} />
        <ActivityIndicator size="small" color="#3b82f6" />
        <Text style={s(styles.loadingText)}>Loading schedule...</Text>
      </View>
    );
  }

  return (
    <View style={s(styles.container)}>
      <ScrollView contentContainerStyle={s(styles.scrollContainer)} showsVerticalScrollIndicator={false}>
        
        {/* Header Title Bar */}
        <View style={s(styles.headerRow)}>
          <Text style={s(styles.mainHeading)}>My Schedule</Text>
          <View style={s(styles.countBadge)}>
            <Text style={s(styles.countBadgeText)}>{upcomingEvents.length} upcoming</Text>
          </View>
        </View>

        {/* Search and Dropdown Filter Panel */}
        <Card style={styles.filterCard}>
          <View style={s(styles.filterLayoutRow)}>
            <View style={s(styles.searchBarWrapper)}>
              <Search color="#71717a" size={fs(4)} style={s(styles.searchIcon)} />
              <TextInput
                style={s(styles.searchInput)}
                placeholder="Search events..."
                placeholderTextColor="#71717a"
                value={searchTerm}
                onChangeText={setSearchTerm}
              />
            </View>

            <TouchableOpacity 
              activeOpacity={0.8}
              style={s(styles.dropdownSelector)}
              onPress={() => setShowFilterDropdown(!showFilterDropdown)}
            >
              <Filter color="#a1a1aa" size={fs(3.5)} style={s({ marginRight: wp(1.5) })} />
              <Text style={s(styles.dropdownValueText)}>
                {filterType === "all" ? "All Types" : filterType.charAt(0).toUpperCase() + filterType.slice(1)}
              </Text>
              <ChevronDown color="#71717a" size={fs(3.5)} style={s({ marginLeft: wp(1.5) })} />
            </TouchableOpacity>
          </View>

          {/* Dynamic Mobile Accordion for Native Select option */}
          {showFilterDropdown && (
            <View style={s(styles.dropdownOptionsContainer)}>
              <TouchableOpacity 
                style={s([styles.dropdownOptionItem, filterType === "all" && styles.activeOption])}
                onPress={() => { setFilterType("all"); setShowFilterDropdown(false); }}
              >
                <Text style={s([styles.optionText, filterType === "all" && styles.activeOptionText])}>All Types</Text>
              </TouchableOpacity>
              {uniqueTypes.map((type) => (
                <TouchableOpacity 
                  key={type}
                  style={s([styles.dropdownOptionItem, filterType === type && styles.activeOption])}
                  onPress={() => { setFilterType(type); setShowFilterDropdown(false); }}
                >
                  <Text style={s([styles.optionText, filterType === type && styles.activeOptionText])}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </Card>

        {/* Upcoming Events Main Block Section */}
        <Card>
          <View style={s(styles.cardHeaderBar)}>
            <CalendarIcon color="#ffffff" size={fs(4.5)} style={s({ marginRight: wp(2) })} />
            <Text style={s(styles.cardTitleText)}>Upcoming Events</Text>
            {upcomingEvents.length > 0 && (
              <View style={s(styles.totalIndicatorBadge)}>
                <Text style={s(styles.indicatorText)}>{upcomingEvents.length}</Text>
              </View>
            )}
          </View>

          {upcomingEvents.length === 0 ? (
            <View style={s(styles.emptyContainer)}>
              <CalendarIcon color="#27272a" size={fs(11)} style={s({ marginBottom: hp(1.5), opacity: 0.5 })} />
              <Text style={s(styles.emptyText)}>No upcoming events found</Text>
            </View>
          ) : (
            <View style={s(styles.eventsListDivider)}>
              {upcomingEvents.map((event) => {
                const colors = getTypeColorStyles(event.type);
                return (
                  <View key={event.id} style={s(styles.eventListItem)}>
                    <View style={s(styles.eventLeftWrapper)}>
                      <View style={s(styles.briefcaseIconBox)}>
                        <Briefcase color="#3b82f6" size={fs(5)} />
                      </View>
                      
                      <View style={s({ flex: 1 })}>
                        <View style={s(styles.titleBadgeRow)}>
                          <Text style={s(styles.eventTitleText)} numberOfLines={2}>{event.title}</Text>
                          <View style={s([styles.typeBadge, { backgroundColor: colors.bg, borderColor: colors.border }])}>
                            <Text style={s([styles.typeBadgeText, { color: colors.text }])}>{event.type}</Text>
                          </View>
                        </View>

                        {/* Event Meta Details Grid Mapping */}
                        <View style={s(styles.metaFlexWrap)}>
                          <View style={s(styles.metaItem)}>
                            <CalendarIcon color="#71717a" size={fs(3.2)} style={s({ marginRight: wp(1) })} />
                            <Text style={s(styles.metaItemText)}>
                              {formatEventDate(event.day)}
                              {formatEventDay(event.day) ? (
                                <Text style={s(styles.highlightDayText)}> ({formatEventDay(event.day)})</Text>
                              ) : null}
                            </Text>
                          </View>

                          <View style={s(styles.metaItem)}>
                            <Clock color="#71717a" size={fs(3.2)} style={s({ marginRight: wp(1) })} />
                            <Text style={s(styles.metaItemText)}>
                              {event.startTime || "--:--"} - {event.endTime || "--:--"}
                            </Text>
                          </View>

                          <View style={s(styles.metaItem)}>
                            <MapPin color="#71717a" size={fs(3.2)} style={s({ marginRight: wp(1) })} />
                            <Text style={s(styles.metaItemText)} numberOfLines={1}>
                              {event.location || "No location"}
                            </Text>
                          </View>
                        </View>

                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </Card>

      </ScrollView>
    </View>
  );
}

// --- Deep Dark Mode Theme Stylesheet ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#09090b" },
  center: { justifyContent: "center", alignItems: "center" },
  loadingText: { color: "#a1a1aa", fontSize: fs(3.2), marginTop: hp(1.2) },
  scrollContainer: { paddingHorizontal: wp(4), paddingTop: hp(2.5), paddingBottom: hp(5) },

  // Header Styles
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: hp(2) },
  mainHeading: { color: "#ffffff", fontSize: fs(5.8), fontWeight: "bold", letterSpacing: -0.5 },
  countBadge: { borderColor: "#27272a", borderWidth: 1, paddingHorizontal: wp(2.5), paddingVertical: hp(0.5), borderRadius: wp(5) },
  countBadgeText: { color: "#a1a1aa", fontSize: fs(2.8), fontWeight: "500" },

  // Filters Controls Styles
  filterCard: { padding: wp(3), zIndex: 10 },
  filterLayoutRow: { flexDirection: "row", gap: wp(2.5) },
  searchBarWrapper: { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: "#09090b", borderColor: "#27272a", borderWidth: 1, borderRadius: wp(2), paddingHorizontal: wp(2.5), height: hp(5) },
  searchIcon: { marginRight: wp(2) },
  searchInput: { flex: 1, color: "#ffffff", fontSize: fs(3.5), paddingVertical: 0 },
  dropdownSelector: { flexDirection: "row", alignItems: "center", backgroundColor: "#1c1c1f", borderColor: "#27272a", borderWidth: 1, borderRadius: wp(2), paddingHorizontal: wp(3), height: hp(5) },
  dropdownValueText: { color: "#ffffff", fontSize: fs(3.2), fontWeight: "500" },
  
  // Custom Dropdown Open State Components
  dropdownOptionsContainer: { marginTop: hp(1.2), borderTopWidth: 1, borderTopColor: "#27272a", paddingTop: hp(0.5) },
  dropdownOptionItem: { paddingVertical: hp(1.2), paddingHorizontal: wp(2), borderRadius: wp(1.5) },
  activeOption: { backgroundColor: "#1e3a8a30" },
  optionText: { color: "#a1a1aa", fontSize: fs(3.2) },
  activeOptionText: { color: "#3b82f6", fontWeight: "600" },

  // Main Cards UI Layout Structure
  card: { backgroundColor: "#18181b", borderColor: "#27272a", borderWidth: 1, borderRadius: wp(3), marginBottom: hp(2), overflow: "hidden" },
  cardHeaderBar: { padding: wp(4), borderBottomWidth: 1, borderBottomColor: "#27272a", flexDirection: "row", alignItems: "center", backgroundColor: "#1c1c1f" },
  cardTitleText: { color: "#ffffff", fontSize: fs(3.8), fontWeight: "600" },
  totalIndicatorBadge: { backgroundColor: "#133767", paddingHorizontal: wp(2), paddingVertical: hp(0.2), borderRadius: wp(1.5), marginLeft: wp(2) },
  indicatorText: { color: "#ffffff", fontSize: fs(2.8), fontWeight: "700" },

  // List Rows Mapping Layout
  eventsListDivider: { backgroundColor: "#18181b" },
  eventListItem: { padding: wp(4), borderBottomWidth: 1, borderBottomColor: "#27272a" },
  eventLeftWrapper: { flexDirection: "row", gap: wp(3) },
  briefcaseIconBox: { width: wp(11), height: wp(11), borderRadius: wp(2.5), backgroundColor: "#13376715", justifyContent: "center", alignItems: "center" },
  
  titleBadgeRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: wp(1.5), marginBottom: hp(0.8) },
  eventTitleText: { color: "#ffffff", fontSize: fs(3.5), fontWeight: "600", flex: 1, minWidth: wp(40) },
  typeBadge: { paddingHorizontal: wp(2), paddingVertical: hp(0.3), borderRadius: wp(1), borderWidth: 1 },
  typeBadgeText: { fontSize: fs(2.5), fontWeight: "700", textTransform: "uppercase" },

  // Meta Elements Wrapper 
  metaFlexWrap: { flexDirection: "row", flexWrap: "wrap", columnGap: wp(3.5), rowGap: hp(0.5), marginTop: hp(0.5) },
  metaItem: { flexDirection: "row", alignItems: "center" },
  metaItemText: { color: "#a1a1aa", fontSize: fs(2.8) },
  highlightDayText: { color: "#3b82f6", fontWeight: "500" },

  // Empty List View Layout Placeholder
  emptyContainer: { padding: wp(10), alignItems: "center", justifyContent: "center" },
  emptyText: { color: "#71717a", fontSize: fs(3.2) },
  badge: { paddingHorizontal: wp(2), paddingVertical: hp(0.3), borderRadius: wp(1) },
  badgeText: { fontSize: fs(2.8), fontWeight: "600" }
});