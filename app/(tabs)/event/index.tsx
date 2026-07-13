import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
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
// (Adjust path as needed to match your project architecture)
import { getEmployeeSchedule } from "@/lib/admin/apiClient";

const { width } = Dimensions.get("window");

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
  return <View style={[styles.card, style]}>{children}</View>;
}

function Badge({ children, style }: { children: React.ReactNode; style?: any }) {
  return (
    <View style={[styles.badge, style]}>
      <Text style={styles.badgeText}>{children}</Text>
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
      <View style={[styles.container, styles.center]}>
        <CalendarIcon color="#27272a" size={48} style={{ marginBottom: 12 }} />
        <ActivityIndicator size="small" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading schedule...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* Header Title Bar */}
        <View style={styles.headerRow}>
          <Text style={styles.mainHeading}>My Schedule</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{upcomingEvents.length} upcoming</Text>
          </View>
        </View>

        {/* Search and Dropdown Filter Panel */}
        <Card style={styles.filterCard}>
          <View style={styles.filterLayoutRow}>
            <View style={styles.searchBarWrapper}>
              <Search color="#71717a" size={16} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search events..."
                placeholderTextColor="#71717a"
                value={searchTerm}
                onChangeText={setSearchTerm}
              />
            </View>

            <TouchableOpacity 
              activeOpacity={0.8}
              style={styles.dropdownSelector}
              onPress={() => setShowFilterDropdown(!showFilterDropdown)}
            >
              <Filter color="#a1a1aa" size={14} style={{ marginRight: 6 }} />
              <Text style={styles.dropdownValueText}>
                {filterType === "all" ? "All Types" : filterType.charAt(0).toUpperCase() + filterType.slice(1)}
              </Text>
              <ChevronDown color="#71717a" size={14} style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </View>

          {/* Dynamic Mobile Accordion for Native Select option */}
          {showFilterDropdown && (
            <View style={styles.dropdownOptionsContainer}>
              <TouchableOpacity 
                style={[styles.dropdownOptionItem, filterType === "all" && styles.activeOption]}
                onPress={() => { setFilterType("all"); setShowFilterDropdown(false); }}
              >
                <Text style={[styles.optionText, filterType === "all" && styles.activeOptionText]}>All Types</Text>
              </TouchableOpacity>
              {uniqueTypes.map((type) => (
                <TouchableOpacity 
                  key={type}
                  style={[styles.dropdownOptionItem, filterType === type && styles.activeOption]}
                  onPress={() => { setFilterType(type); setShowFilterDropdown(false); }}
                >
                  <Text style={[styles.optionText, filterType === type && styles.activeOptionText]}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </Card>

        {/* Upcoming Events Main Block Section */}
        <Card>
          <View style={styles.cardHeaderBar}>
            <CalendarIcon color="#ffffff" size={18} style={{ marginRight: 8 }} />
            <Text style={styles.cardTitleText}>Upcoming Events</Text>
            {upcomingEvents.length > 0 && (
              <View style={styles.totalIndicatorBadge}>
                <Text style={styles.indicatorText}>{upcomingEvents.length}</Text>
              </View>
            )}
          </View>

          {upcomingEvents.length === 0 ? (
            <View style={styles.emptyContainer}>
              <CalendarIcon color="#27272a" size={44} style={{ marginBottom: 12, opacity: 0.5 }} />
              <Text style={styles.emptyText}>No upcoming events found</Text>
            </View>
          ) : (
            <View style={styles.eventsListDivider}>
              {upcomingEvents.map((event) => {
                const colors = getTypeColorStyles(event.type);
                return (
                  <View key={event.id} style={styles.eventListItem}>
                    <View style={styles.eventLeftWrapper}>
                      <View style={styles.briefcaseIconBox}>
                        <Briefcase color="#3b82f6" size={20} />
                      </View>
                      
                      <View style={{ flex: 1 }}>
                        <View style={styles.titleBadgeRow}>
                          <Text style={styles.eventTitleText} numberOfLines={2}>{event.title}</Text>
                          <View style={[styles.typeBadge, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                            <Text style={[styles.typeBadgeText, { color: colors.text }]}>{event.type}</Text>
                          </View>
                        </View>

                        {/* Event Meta Details Grid Mapping */}
                        <View style={styles.metaFlexWrap}>
                          <View style={styles.metaItem}>
                            <CalendarIcon color="#71717a" size={13} style={{ marginRight: 4 }} />
                            <Text style={styles.metaItemText}>
                              {formatEventDate(event.day)}
                              {formatEventDay(event.day) ? (
                                <Text style={styles.highlightDayText}> ({formatEventDay(event.day)})</Text>
                              ) : null}
                            </Text>
                          </View>

                          <View style={styles.metaItem}>
                            <Clock color="#71717a" size={13} style={{ marginRight: 4 }} />
                            <Text style={styles.metaItemText}>
                              {event.startTime || "--:--"} - {event.endTime || "--:--"}
                            </Text>
                          </View>

                          <View style={styles.metaItem}>
                            <MapPin color="#71717a" size={13} style={{ marginRight: 4 }} />
                            <Text style={styles.metaItemText} numberOfLines={1}>
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
  loadingText: { color: "#a1a1aa", fontSize: 13, marginTop: 10 },
  scrollContainer: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 40 },

  // Header Styles
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  mainHeading: { color: "#ffffff", fontSize: 24, fontWeight: "bold", letterSpacing: -0.5 },
  countBadge: { borderColor: "#27272a", borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  countBadgeText: { color: "#a1a1aa", fontSize: 12, fontWeight: "500" },

  // Filters Controls Styles
  filterCard: { padding: 12, zIndex: 10 },
  filterLayoutRow: { flexDirection: "row", gap: 10 },
  searchBarWrapper: { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: "#09090b", borderColor: "#27272a", borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, height: 40 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: "#ffffff", fontSize: 14, paddingVertical: 0 },
  dropdownSelector: { flexDirection: "row", alignItems: "center", backgroundColor: "#1c1c1f", borderColor: "#27272a", borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, height: 40 },
  dropdownValueText: { color: "#ffffff", fontSize: 13, fontWeight: "500" },
  
  // Custom Dropdown Open State Components
  dropdownOptionsContainer: { marginTop: 10, borderTopWidth: 1, borderTopColor: "#27272a", paddingTop: 4 },
  dropdownOptionItem: { paddingVertical: 10, paddingHorizontal: 8, borderRadius: 6 },
  activeOption: { backgroundColor: "#1e3a8a30" },
  optionText: { color: "#a1a1aa", fontSize: 13 },
  activeOptionText: { color: "#3b82f6", fontWeight: "600" },

  // Main Cards UI Layout Structure
  card: { backgroundColor: "#18181b", borderColor: "#27272a", borderWidth: 1, borderRadius: 12, marginBottom: 16, overflow: "hidden" },
  cardHeaderBar: { padding: 16, borderBottomWidth: 1, borderBottomColor: "#27272a", flexDirection: "row", alignItems: "center", backgroundColor: "#1c1c1f" },
  cardTitleText: { color: "#ffffff", fontSize: 15, fontWeight: "600" },
  totalIndicatorBadge: { backgroundColor: "#133767", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginLeft: 8 },
  indicatorText: { color: "#ffffff", fontSize: 11, fontWeight: "700" },

  // List Rows Mapping Layout
  eventsListDivider: { backgroundColor: "#18181b" },
  eventListItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: "#27272a" },
  eventLeftWrapper: { flexDirection: "row", gap: 12 },
  briefcaseIconBox: { width: 44, height: 44, borderRadius: 10, backgroundColor: "#13376715", justifyContent: "center", alignItems: "center", shrink: 0 },
  
  titleBadgeRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 6, marginBottom: 6 },
  eventTitleText: { color: "#ffffff", fontSize: 14, fontWeight: "600", flex: 1, minWidth: width * 0.4 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, borderWidth: 1 },
  typeBadgeText: { fontSize: 10, fontWeight: "700", textTransform: "uppercase" },

  // Meta Elements Wrapper 
  metaFlexWrap: { flexDirection: "row", flexWrap: "wrap", columnGap: 14, rowGap: 4, marginTop: 4 },
  metaItem: { flexDirection: "row", alignItems: "center" },
  metaItemText: { color: "#a1a1aa", fontSize: 12 },
  highlightDayText: { color: "#3b82f6", fontWeight: "500" },

  // Empty List View Layout Placeholder
  emptyContainer: { padding: 40, alignItems: "center", justifyContent: "center" },
  emptyText: { color: "#71717a", fontSize: 13 }
});