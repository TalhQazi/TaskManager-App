import React, { useMemo, useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  FlatList,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import Svg, { Line, Circle, G, Text as SvgText } from "react-native-svg";
import * as Location from "expo-location";

// Maintain baseline API & context imports
import { apiFetch } from "@/lib/admin/apiClient";
import { useSocket } from "@/contexts/SocketContext";

/* ── Interfaces ──────────────────────────────────────────────────── */
interface Employee {
  id: string;
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface Task {
  id: string;
  _id: string;
  title: string;
  status: string;
  assignees?: string[];
}

interface LocationItem {
  id: string;
  _id: string;
  name: string;
  address: string;
  city: string;
}

interface ItineraryStop {
  id?: string;
  _id?: string;
  title: string;
  address: string;
  latitude: number;
  longitude: number;
  estimatedDurationMinutes: number;
  sequenceOrder: number;
  travelTimeToNext: number;
  taskId?: string;
  locationId?: string;
  completed?: boolean;
}

interface Itinerary {
  id: string;
  _id: string;
  userId: string;
  date: string;
  startTime: string;
  optimized: boolean;
  stops: ItineraryStop[];
}

export default function ItineraryBuilder() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [locations, setLocations] = useState<LocationItem[]>([]);

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [startTime, setStartTime] = useState<string>("08:00");
  const [navApp, setNavApp] = useState<'google' | 'apple' | 'waze'>("google");

  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [stops, setStops] = useState<ItineraryStop[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const { socket } = useSocket();

  // Pickers Visibility State
  const [employeePickerVisible, setEmployeePickerVisible] = useState(false);
  const [navAppPickerVisible, setNavAppPickerVisible] = useState(false);

  // Search & add stop state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showAddMenu, setShowAddMenu] = useState<boolean>(false);

  // Form input for new custom stop
  const [customTitle, setCustomTitle] = useState("");
  const [customAddress, setCustomAddress] = useState("");
  const [customLat, setCustomLat] = useState("34.0522");
  const [customLng, setCustomLng] = useState("-118.2437");
  const [customDuration, setCustomDuration] = useState("30");

  // Custom simulation alert / toast controller helper
  const triggerToast = (title: string, description: string) => {
    Alert.alert(title, description);
  };

  // Fetch baseline employees, tasks, locations
  useEffect(() => {
    async function fetchBaselines() {
      try {
        const [empRes, taskRes, locRes] = await Promise.all([
          apiFetch<any>("/api/employees"),
          apiFetch<any>("/api/tasks"),
          apiFetch<any>("/api/locations")
        ]);

        const emps = Array.isArray(empRes) ? empRes : (empRes?.items || []);
        const tsk = Array.isArray(taskRes) ? taskRes : (taskRes?.items || []);
        const loc = Array.isArray(locRes) ? locRes : (locRes?.items || []);

        setEmployees(emps);
        setTasks(tsk);
        setLocations(loc);

        if (emps.length > 0) {
          setSelectedEmployeeId(emps[0]._id || emps[0].id);
        }
      } catch (err) {
        console.error("Error loading baseline data:", err);
      }
    }
    fetchBaselines();
  }, []);

  // Fetch itinerary whenever employee or date changes
  useEffect(() => {
    if (!selectedEmployeeId || !selectedDate) return;
    fetchItinerary();
  }, [selectedEmployeeId, selectedDate]);

  useEffect(() => {
    if (!socket || !itinerary) return;

    const handleItineraryUpdate = (payload: { itineraryId: string; userId: string; date: string; stopId?: string; completed?: boolean; }) => {
      if (payload.itineraryId === itinerary._id) {
        fetchItinerary();
        triggerToast("Live Sync", "Itinerary has been updated in real time.");
      }
    };

    const handleLocationPing = (payload: { itineraryId: string; userId: string; latitude: number; longitude: number; reoptimized: boolean; timestamp: string; }) => {
      if (payload.itineraryId === itinerary._id) {
        fetchItinerary();
        triggerToast("Live GPS", payload.reoptimized ? "Route was reoptimized from current location." : "Live location was received.");
      }
    };

    socket.on("itinerary-update", handleItineraryUpdate);
    socket.on("itinerary-location", handleLocationPing);
    return () => {
      socket.off("itinerary-update", handleItineraryUpdate);
      socket.off("itinerary-location", handleLocationPing);
    };
  }, [socket, itinerary]);

  async function fetchItinerary() {
    setLoading(true);
    try {
      const res = await apiFetch<{ items: Itinerary[] }>(
        `/api/itineraries?employeeId=${selectedEmployeeId}&date=${selectedDate}`
      );
      if (res.items && res.items.length > 0) {
        const item = res.items[0];
        setItinerary(item);
        setStartTime(item.startTime || "08:00");
        const sortedStops = [...item.stops].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
        setStops(sortedStops);
      } else {
        setItinerary(null);
        setStops([]);
      }
    } catch (err) {
      console.error("Failed to fetch itinerary", err);
    } finally {
      setLoading(false);
    }
  }

  // Create or save daily itinerary
  async function saveItinerary(updatedStops = stops) {
    if (!selectedEmployeeId) {
      triggerToast("Selection required", "Please select an employee.");
      return;
    }
    try {
      const payload = {
        userId: selectedEmployeeId,
        date: selectedDate,
        startTime,
        stops: updatedStops.map((s, idx) => ({ ...s, sequenceOrder: idx }))
      };

      const res = await apiFetch<{ item: Itinerary }>("/api/itineraries", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      setItinerary(res.item);
      const sortedStops = [...res.item.stops].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
      setStops(sortedStops);
      triggerToast("Itinerary Saved", "Daily itinerary has been saved successfully.");
    } catch (err: any) {
      triggerToast("Save failed", err.message || "Unable to save itinerary");
    }
  }

  // Add search matches
  const searchResults = useMemo(() => {
    if (!searchQuery) return [];
    const q = searchQuery.toLowerCase();

    const matchedTasks = tasks
      .filter(t => t.title.toLowerCase().includes(q))
      .map(t => ({
        type: "task" as const,
        id: t._id || t.id,
        title: t.title,
        subtitle: `Task - Status: ${t.status}`,
        address: "Field Location Assigned",
        lat: 34.0522 + (Math.random() - 0.5) * 0.1,
        lng: -118.2437 + (Math.random() - 0.5) * 0.1
      }));

    const matchedLocations = locations
      .filter(l => l.name.toLowerCase().includes(q) || l.address.toLowerCase().includes(q))
      .map(l => ({
        type: "location" as const,
        id: l._id || l.id,
        title: l.name,
        subtitle: `Location - ${l.city}`,
        address: l.address || `${l.city}, CA`,
        lat: 34.0622 + (Math.random() - 0.5) * 0.05,
        lng: -118.2537 + (Math.random() - 0.5) * 0.05
      }));

    return [...matchedTasks, ...matchedLocations];
  }, [searchQuery, tasks, locations]);

  // Add stop triggers
  function addStop(item: { title: string; address: string; lat: number; lng: number; type: "task" | "location"; id: string }) {
    const newStop: ItineraryStop = {
      title: item.title,
      address: item.address,
      latitude: item.lat,
      longitude: item.lng,
      estimatedDurationMinutes: 30,
      sequenceOrder: stops.length,
      travelTimeToNext: 0,
      taskId: item.type === "task" ? item.id : undefined,
      locationId: item.type === "location" ? item.id : undefined,
      completed: false
    };

    const nextStops = [...stops, newStop];
    setStops(nextStops);
    setSearchQuery("");
    setShowAddMenu(false);
    triggerToast("Stop Added", `"${item.title}" added to daily stop list.`);
    saveItinerary(nextStops);
  }

  function addCustomStop() {
    if (!customTitle || !customAddress) {
      triggerToast("Validation Error", "Title and Address are required");
      return;
    }

    const newStop: ItineraryStop = {
      title: customTitle,
      address: customAddress,
      latitude: Number(customLat) || 34.0522,
      longitude: Number(customLng) || -118.2437,
      estimatedDurationMinutes: Number(customDuration) || 30,
      sequenceOrder: stops.length,
      travelTimeToNext: 0,
      completed: false
    };

    const nextStops = [...stops, newStop];
    setStops(nextStops);
    setCustomTitle("");
    setCustomAddress("");
    setCustomLat("34.0522");
    setCustomLng("-118.2437");
    setCustomDuration("30");
    setShowAddMenu(false);
    triggerToast("Custom Stop Added", `"${newStop.title}" added successfully.`);
    saveItinerary(nextStops);
  }

  // Remove stop
  function removeStop(index: number) {
    const nextStops = stops.filter((_, idx) => idx !== index);
    setStops(nextStops);
    triggerToast("Stop Removed", "Stop was deleted from list.");
    saveItinerary(nextStops);
  }

  // Manual re-sequence controls
  function moveStop(index: number, direction: "up" | "down") {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === stops.length - 1) return;

    const targetIdx = direction === "up" ? index - 1 : index + 1;
    const nextStops = [...stops];
    const temp = nextStops[index];
    nextStops[index] = nextStops[targetIdx];
    nextStops[targetIdx] = temp;

    const updated = nextStops.map((s, idx) => ({ ...s, sequenceOrder: idx }));
    setStops(updated);
    saveItinerary(updated);
  }

  // Optimize stops trigger
  async function handleOptimize() {
    if (!itinerary || stops.length <= 1) {
      triggerToast("Insufficient stops", "Add at least 2 stops to optimize route.");
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch<{ item: Itinerary }>(`/api/itineraries/${itinerary._id}/optimize`, {
        method: "POST"
      });

      setItinerary(res.item);
      const sortedStops = [...res.item.stops].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
      setStops(sortedStops);
      triggerToast("Route Optimized!", "Shortest route sequence computed and timeline updated.");
    } catch (err: any) {
      triggerToast("Optimization failed", err.message);
    } finally {
      setLoading(false);
    }
  }

  // Native Geolocation Handler
  async function sendLocationPing(reopt = false) {
    if (!itinerary) return triggerToast('No itinerary', 'Save or load an itinerary first');
    
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return triggerToast('Permission Denied', 'Location accessibility permissions required.');
    }

    try {
      setLoading(true);
      let location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      const res = await apiFetch<any>(`/api/itineraries/${itinerary._id}/location`, {
        method: 'POST',
        body: JSON.stringify({ latitude, longitude, reoptimize: reopt })
      });
      setItinerary(res.item);
      const sortedStops = [...res.item.stops].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
      setStops(sortedStops);
      triggerToast('Location Sent', reopt ? 'Re-optimization attempted' : 'Location saved');
    } catch (err: any) {
      triggerToast('Ping failed', err.message || 'Unable to send location');
    } finally {
      setLoading(false);
    }
  }

  // Generate full day timeline display helper
  const timelineData = useMemo(() => {
    if (stops.length === 0) return [];

    let currentMinutes = 0;
    const [h, m] = startTime.split(":").map(Number);
    if (!isNaN(h)) currentMinutes = h * 60 + (m || 0);

    return stops.map((stop, idx) => {
      const startHour = Math.floor(currentMinutes / 60) % 24;
      const startMin = currentMinutes % 60;
      const startStr = `${String(startHour).padStart(2, "0")}:${String(startMin).padStart(2, "0")}`;

      const workDuration = stop.estimatedDurationMinutes || 30;
      currentMinutes += workDuration;

      const endHour = Math.floor(currentMinutes / 60) % 24;
      const endMin = currentMinutes % 60;
      const endStr = `${String(endHour).padStart(2, "0")}:${String(endMin).padStart(2, "0")}`;

      const travelTime = stop.travelTimeToNext || 0;
      const nextArrivalMinutes = currentMinutes + travelTime;

      const nextStartHour = Math.floor(nextArrivalMinutes / 60) % 24;
      const nextStartMin = nextArrivalMinutes % 60;
      const nextArrivalStr = `${String(nextStartHour).padStart(2, "0")}:${String(nextStartMin).padStart(2, "0")}`;

      currentMinutes += travelTime;

      return {
        ...stop,
        startTimeStr: startStr,
        endTimeStr: endStr,
        nextArrivalStr,
        workDuration,
        travelTime
      };
    });
  }, [stops, startTime]);

  // Deep Link Launching Map Configuration
  const openExternalMapApp = async (lat: number, lng: number, appMode = navApp) => {
    let url = "";
    if (appMode === "apple") {
      url = `maps://?daddr=${lat},${lng}`;
    } else if (appMode === "waze") {
      url = `waze://?ll=${lat},${lng}&navigate=yes`;
    } else {
      url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    }

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        // Fallback for standard browsers or web
        const fallbackUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
        await Linking.openURL(fallbackUrl);
      }
    } catch (e) {
      triggerToast("Error", "Could not trigger navigation launch parameters.");
    }
  };

  const currentSelectedEmployeeName = employees.find(e => e.id === selectedEmployeeId || e._id === selectedEmployeeId)?.name || "Select Employee";

  return (
    <ScrollView style={styles.appContainer} contentContainerStyle={styles.scrollContent}>
      
      {/* ── Header ── */}
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Smart Daily Itinerary</Text>
        <Text style={styles.headerSubtitle}>
          Build, structure, and optimize staff schedules with GPS route matrices and dynamic TSP solvers.
        </Text>
      </View>

      {/* ── Control Filters Panel ── */}
      <View style={styles.controlPanelCard}>
        {/* Employee Selector */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Select Employee</Text>
          <TouchableOpacity style={styles.pickerTrigger} onPress={() => setEmployeePickerVisible(true)}>
            <Feather name="users" size={16} color="#94a3b8" style={styles.inputIcon} />
            <Text style={styles.pickerTriggerText}>{currentSelectedEmployeeName}</Text>
            <Feather name="chevron-down" size={14} color="#64748b" />
          </TouchableOpacity>
        </View>

        {/* Date Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Itinerary Date</Text>
          <View style={styles.pickerTrigger}>
            <Feather name="calendar" size={16} color="#94a3b8" style={styles.inputIcon} />
            <TextInput
              style={styles.textInputStyle}
              value={selectedDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#475569"
              onChangeText={setSelectedDate}
            />
          </View>
        </View>

        {/* Time Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Start Work Day</Text>
          <View style={styles.pickerTrigger}>
            <Feather name="clock" size={16} color="#94a3b8" style={styles.inputIcon} />
            <TextInput
              style={styles.textInputStyle}
              value={startTime}
              placeholder="08:00"
              placeholderTextColor="#475569"
              onChangeText={setStartTime}
            />
          </View>
        </View>

        {/* Navigation App Picker */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Navigation App</Text>
          <TouchableOpacity style={styles.pickerTrigger} onPress={() => setNavAppPickerVisible(true)}>
            <Text style={styles.pickerTriggerText}>{navApp.toUpperCase()} MAPS</Text>
            <Feather name="chevron-down" size={14} color="#64748b" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.primarySaveButton} onPress={() => saveItinerary()}>
          <Text style={styles.primarySaveButtonText}>Apply Time Parameters</Text>
        </TouchableOpacity>

        {/* GPS Controls Row */}
        <View style={styles.gpsSimulationButtonRow}>
          <TouchableOpacity style={styles.gpsSimulationButton} onPress={() => sendLocationPing(false)}>
            <Text style={styles.gpsSimulationButtonText}>Simulate GPS Ping</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.gpsSimulationButton, styles.gpsReoptButton]} onPress={() => sendLocationPing(true)}>
            <Text style={[styles.gpsSimulationButtonText, styles.gpsReoptButtonText]}>Simulate GPS + Re-optimize</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Stop Manager Block ── */}
      <View style={styles.sectionContainerCard}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>
            <Feather name="layers" size={16} color="#60a5fa" /> Itinerary Stops ({stops.length})
          </Text>

          <View style={styles.actionHeaderRowRightButtons}>
            <TouchableOpacity style={styles.smallAddStopBtn} onPress={() => setShowAddMenu(!showAddMenu)}>
              <Feather name="plus" size={14} color="#93c5fd" />
              <Text style={styles.smallAddStopBtnText}>Add</Text>
            </TouchableOpacity>

            {stops.length > 1 && (
              <TouchableOpacity style={styles.smallOptimizeBtn} onPress={handleOptimize} disabled={loading}>
                {loading ? <ActivityIndicator size="small" color="#10b981" /> : <Feather name="shuffle" size={12} color="#34d399" />}
                <Text style={styles.smallOptimizeBtnText}>Optimize</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Dynamic Search & Add Menu Overlay Component */}
        {showAddMenu && (
          <View style={styles.addMenuPopoverContainer}>
            <Text style={styles.addMenuSubtitleText}>INTEGRATE TASKS & LOCATIONS</Text>
            <View style={styles.searchBarInlineFrame}>
              <Feather name="search" size={16} color="#64748b" style={styles.searchIcon} />
              <TextInput
                style={styles.searchTextInputElement}
                placeholder="Search tasks, clients, locations..."
                placeholderTextColor="#64748b"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* Render Internal Match Query List */}
            {searchQuery.length > 0 && (
              <View style={styles.searchResultsContainer}>
                {searchResults.length === 0 ? (
                  <Text style={styles.emptyResultsText}>No database elements found.</Text>
                ) : (
                  searchResults.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.searchResultListItem}
                      onPress={() => addStop({ ...item, type: item.type as "task" | "location", id: item.id })}
                    >
                      <View>
                        <Text style={styles.searchResultItemTitle}>{item.title}</Text>
                        <Text style={styles.searchResultItemSubtitle}>{item.subtitle}</Text>
                      </View>
                      <View style={styles.badgeLabelItem}>
                        <Text style={styles.badgeLabelItemText}>+ {item.type}</Text>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}

            {/* Custom Coordinates Frame Input */}
            <View style={styles.customCoordsDividerBorder}>
              <Text style={styles.addMenuSubtitleText}>OR ADD CUSTOM COORDINATES</Text>
              <View style={styles.flexInputsRow}>
                <TextInput style={[styles.inlineFlexField, { flex: 1 }]} placeholder="Stop Title" placeholderTextColor="#475569" value={customTitle} onChangeText={setCustomTitle} />
                <TextInput style={[styles.inlineFlexField, { flex: 1 }]} placeholder="Full Address" placeholderTextColor="#475569" value={customAddress} onChangeText={setCustomAddress} />
              </View>
              <View style={styles.flexInputsRow}>
                <TextInput style={[styles.inlineFlexField, { flex: 1 }]} placeholder="Lat" placeholderTextColor="#475569" value={customLat} onChangeText={setCustomLat} />
                <TextInput style={[styles.inlineFlexField, { flex: 1 }]} placeholder="Lng" placeholderTextColor="#475569" value={customLng} onChangeText={setCustomLng} />
                <TextInput style={[styles.inlineFlexField, { flex: 0.8 }]} placeholder="Mins" placeholderTextColor="#475569" keyboardType="numeric" value={customDuration} onChangeText={setCustomDuration} />
              </View>
              <TouchableOpacity style={styles.customAddButtonTrigger} onPress={addCustomStop}>
                <Text style={styles.customAddButtonTriggerText}>Add Custom Stop</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Listing Current Active Stops Feed */}
        {stops.length === 0 ? (
          <View style={styles.fallbackEmptyStateFrame}>
            <Feather name="compass" size={36} color="#475569" style={styles.centeredIconPulse} />
            <Text style={styles.fallbackTitleHeadlineText}>No stops added yet</Text>
            <Text style={styles.fallbackBodySubtitleText}>
              Click 'Add Stop' to select existing assigned tasks, company sites, or custom addresses for this daily route.
            </Text>
          </View>
        ) : (
          <View style={styles.stopsNativeListWrapper}>
            {stops.map((stop, idx) => {
              const isCompleted = stop.completed;
              return (
                <View key={idx} style={[styles.stopFeedItemNodeCard, isCompleted && styles.stopFeedItemNodeCardCompleted]}>
                  <View style={styles.stopCardLeftSegment}>
                    <View style={styles.stopSequenceCircleBadge}>
                      <Text style={styles.stopSequenceCircleBadgeText}>{idx + 1}</Text>
                    </View>
                    <View style={{ flex: 1, paddingRight: 4 }}>
                      <View style={styles.stopItemHeadlineBadgeRow}>
                        <Text style={[styles.stopItemTitleLabel, isCompleted && styles.lineThroughTextStyle]} numberOfLines={1}>
                          {stop.title}
                        </Text>
                        {stop.taskId && (
                          <View style={styles.miniTypeBadgeElement}><Text style={styles.miniTypeBadgeElementText}>TASK</Text></View>
                        )}
                      </View>
                      <Text style={styles.stopItemAddressMetaString} numberOfLines={1}>
                        <Feather name="map-pin" size={10} color="#f87171" /> {stop.address}
                      </Text>
                      <Text style={styles.stopItemSubDurationMetaString}>
                        Duration: {stop.estimatedDurationMinutes} mins  •  GPS: {stop.latitude?.toFixed(2)}, {stop.longitude?.toFixed(2)}
                      </Text>
                    </View>
                  </View>

                  {/* Actions Column Right */}
                  <View style={styles.stopCardRightActionsTrack}>
                    <View style={styles.actionControlsSequenceRowInline}>
                      <TouchableOpacity style={styles.miniActionButtonNode} disabled={idx === 0} onPress={() => moveStop(idx, "up")}>
                        <Feather name="arrow-up" size={12} color={idx === 0 ? "#1e293b" : "#94a3b8"} />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.miniActionButtonNode} disabled={idx === stops.length - 1} onPress={() => moveStop(idx, "down")}>
                        <Feather name="arrow-down" size={12} color={idx === stops.length - 1 ? "#1e293b" : "#94a3b8"} />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.actionControlsSequenceRowInline}>
                      <TouchableOpacity style={styles.miniActionButtonNode} onPress={() => openExternalMapApp(stop.latitude, stop.longitude)}>
                        <Feather name="external-link" size={12} color="#60a5fa" />
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.miniActionButtonNode, styles.miniActionDeleteButtonNode]} onPress={() => removeStop(idx)}>
                        <Feather name="trash-2" size={12} color="#f87171" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* ── Route Schema Matrix Render SVG Map ── */}
      {stops.length > 0 && (
        <View style={styles.sectionContainerCard}>
          <Text style={styles.sectionTitle}><Feather name="compass" size={16} color="#818cf8" /> Route Schema Map</Text>
          <View style={styles.svgMapCanvasWrapper}>
            <Svg height="150" width="100%" viewBox="0 0 340 120">
              {stops.map((stop, idx) => {
                if (idx === stops.length - 1) return null;
                const spacing = 260 / Math.max(1, stops.length - 1);
                const x1 = 40 + idx * spacing;
                const y1 = 60 + (idx % 2 === 0 ? -15 : 15);
                const x2 = 40 + (idx + 1) * spacing;
                const y2 = 60 + ((idx + 1) % 2 === 0 ? -15 : 15);
                return (
                  <Line
                    key={`line-${idx}`}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="rgba(99, 102, 241, 0.4)"
                    strokeWidth="2"
                    strokeDasharray="4 3"
                  />
                );
              })}

              {stops.map((stop, idx) => {
                const spacing = 260 / Math.max(1, stops.length - 1);
                const x = 40 + idx * spacing;
                const y = 60 + (idx % 2 === 0 ? -15 : 15);
                return (
                  <G key={`node-${idx}`}>
                    <Circle cx={x} cy={y} r="10" fill="rgba(59, 130, 246, 0.15)" stroke="rgba(59, 130, 246, 0.5)" strokeWidth="1" />
                    <Circle cx={x} cy={y} r="6" fill={stop.completed ? "#10b981" : "#3b82f6"} />
                    <SvgText x={x} y={y - 12} fill="#e2e8f0" fontSize="8" fontWeight="bold" textAnchor="middle">
                      {idx + 1}
                    </SvgText>
                  </G>
                );
              })}
            </Svg>
            <View style={styles.legendCanvasRow}>
              <View style={styles.legendItemInline}><View style={[styles.legendDotItem, { backgroundColor: '#3b82f6' }]} /><Text style={styles.legendDotItemLabel}>Pending</Text></View>
              <View style={styles.legendItemInline}><View style={[styles.legendDotItem, { backgroundColor: '#10b981' }]} /><Text style={styles.legendDotItemLabel}>Completed</Text></View>
            </View>
          </View>
        </View>
      )}

      {/* ── Day Timeline View Section ── */}
      <View style={styles.sectionContainerCard}>
        <Text style={styles.sectionTitle}><Feather name="clock" size={16} color="#818cf8" /> Day Timeline View</Text>
        
        {timelineData.length === 0 ? (
          <View style={styles.emptyTimelineStateHolder}>
            <Text style={styles.fallbackBodySubtitleText}>Timeline details will compute automatically as stops are populated.</Text>
          </View>
        ) : (
          <View style={styles.timelineVerticalTrackBranchContainer}>
            {timelineData.map((item, idx) => {
              const isCompleted = item.completed;
              return (
                <View key={idx} style={styles.timelineRowElementFrame}>
                  {/* Left structural node connection anchor */}
                  <View style={styles.timelineLeftConnectorBlock}>
                    <View style={[styles.timelineStatusRingAnchor, isCompleted ? styles.timelineRingEmerald : styles.timelineRingBlue]}>
                      {isCompleted && <Feather name="check" size={8} color="#10b981" />}
                    </View>
                    {idx < timelineData.length - 1 && <View style={styles.verticalInterconnectLineBar} />}
                  </View>

                  {/* Body Box */}
                  <View style={styles.timelineDataContentBubbleCard}>
                    <View style={styles.timelineContentBubbleTopBarMeta}>
                      <View style={styles.timelineTimeFrameBoxBadge}>
                        <Text style={styles.timelineTimeFrameBoxBadgeText}>{item.startTimeStr} - {item.endTimeStr}</Text>
                      </View>
                      <Text style={styles.timelineTaskMinsCountText}>{item.workDuration} min task</Text>
                    </View>
                    <Text style={[styles.timelineItemHeadlineTextString, isCompleted && styles.lineThroughTextStyle]}>{item.title}</Text>
                    <Text style={styles.timelineItemMetaAddressTruncated} numberOfLines={1}>{item.address}</Text>

                    {idx < timelineData.length - 1 && (
                      <View style={styles.travelTimeInterconnectLayoutAlertBox}>
                        <Feather name="navigation" size={10} color="#a5b4fc" style={{ transform: [{ rotate: '45deg' }] }} />
                        <Text style={styles.travelTimeInterconnectLayoutAlertBoxText}>
                          Travel time to Stop {idx + 2}: {item.travelTimeToNext} mins
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}

            {/* End Day Marker Node */}
            <View style={styles.timelineRowElementFrame}>
              <View style={styles.timelineLeftConnectorBlock}>
                <View style={[styles.timelineStatusRingAnchor, { borderColor: '#818cf8' }]} />
              </View>
              <View style={styles.finalEodBlockFrameBadge}>
                <Text style={styles.finalEodBlockFrameBadgeText}>🏁 Estimated EOD: {timelineData[timelineData.length - 1]?.nextArrivalStr || "Complete"}</Text>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* ── Native Pickers (Employee Selector Modal) ── */}
      <Modal visible={employeePickerVisible} transparent animationType="slide">
        <View style={styles.modalOverlayContainer}>
          <View style={styles.modalContentBody}>
            <Text style={styles.modalTitleHeadlineText}>Select Employee Staff</Text>
            <FlatList
              data={employees}
              keyExtractor={(item) => item.id || item._id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalSelectionListItemRow}
                  onPress={() => {
                    setSelectedEmployeeId(item.id || item._id);
                    setEmployeePickerVisible(false);
                  }}
                >
                  <Text style={styles.modalSelectionListItemRowText}>{item.name} ({item.role})</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.modalCloseTriggerBtn} onPress={() => setEmployeePickerVisible(false)}>
              <Text style={styles.modalCloseTriggerBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Native Pickers (Nav App Selector Modal) ── */}
      <Modal visible={navAppPickerVisible} transparent animationType="slide">
        <View style={styles.modalOverlayContainer}>
          <View style={styles.modalContentBody}>
            <Text style={styles.modalTitleHeadlineText}>Select Navigation Mapping Preference</Text>
            {(['google', 'apple', 'waze'] as const).map((appOption) => (
              <TouchableOpacity
                key={appOption}
                style={styles.modalSelectionListItemRow}
                onPress={() => {
                  setNavApp(appOption);
                  setNavAppPickerVisible(false);
                }}
              >
                <Text style={styles.modalSelectionListItemRowText}>{appOption.toUpperCase()} MAPS</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.modalCloseTriggerBtn} onPress={() => setNavAppPickerVisible(false)}>
              <Text style={styles.modalCloseTriggerBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

/* ── StyleSheet Design Matrix Configurations ───────────────────── */
const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    backgroundColor: "#0b0c16",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 48 : 24,
    paddingBottom: 40,
  },
  headerContainer: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#60a5fa",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#94a3b8",
    marginTop: 4,
    lineHeight: 18,
  },
  controlPanelCard: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#94a3b8",
    textTransform: "uppercase",
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  pickerTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(0,0,0,0.4)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
  },
  pickerTriggerText: {
    color: "#fff",
    fontSize: 13,
    flex: 1,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInputStyle: {
    flex: 1,
    color: "#fff",
    fontSize: 13,
    padding: 0,
  },
  primarySaveButton: {
    backgroundColor: "#2563eb",
    height: 42,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  primarySaveButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  gpsSimulationButtonRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  gpsSimulationButton: {
    flex: 1,
    backgroundColor: "rgba(51, 65, 85, 0.4)",
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: "center",
  },
  gpsSimulationButtonText: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "600",
  },
  gpsReoptButton: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
  },
  gpsReoptButtonText: {
    color: "#34d399",
  },
  sectionContainerCard: {
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#fff",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionHeaderRowRightButtons: {
    flexDirection: "row",
    gap: 6,
  },
  smallAddStopBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(37, 99, 235, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.3)",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
  },
  smallAddStopBtnText: {
    color: "#93c5fd",
    fontSize: 12,
    fontWeight: "600",
  },
  smallOptimizeBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
  },
  smallOptimizeBtnText: {
    color: "#34d399",
    fontSize: 12,
    fontWeight: "600",
  },
  fallbackEmptyStateFrame: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderStyle: "dashed",
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  centeredIconPulse: {
    marginBottom: 8,
  },
  fallbackTitleHeadlineText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  fallbackBodySubtitleText: {
    color: "#64748b",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 16,
  },
  stopsNativeListWrapper: {
    gap: 10,
  },
  stopFeedItemNodeCard: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.01)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 10,
    padding: 12,
    justifyContent: "space-between",
  },
  stopFeedItemNodeCardCompleted: {
    backgroundColor: "rgba(16, 185, 129, 0.03)",
    borderColor: "rgba(16, 185, 129, 0.15)",
  },
  stopCardLeftSegment: {
    flexDirection: "row",
    gap: 10,
    flex: 1,
  },
  stopSequenceCircleBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  stopSequenceCircleBadgeText: {
    color: "#60a5fa",
    fontSize: 11,
    fontWeight: "700",
  },
  stopItemHeadlineBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  stopItemTitleLabel: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    maxWidth: "75%",
  },
  lineThroughTextStyle: {
    textDecorationLine: "line-through",
    color: "#475569",
  },
  miniTypeBadgeElement: {
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  miniTypeBadgeElementText: {
    color: "#60a5fa",
    fontSize: 8,
    fontWeight: "700",
  },
  stopItemAddressMetaString: {
    color: "#94a3b8",
    fontSize: 12,
    marginTop: 2,
  },
  stopItemSubDurationMetaString: {
    color: "#475569",
    fontSize: 10,
    marginTop: 4,
  },
  stopCardRightActionsTrack: {
    flexDirection: "column",
    justifyContent: "center",
    gap: 6,
  },
  actionControlsSequenceRowInline: {
    flexDirection: "row",
    gap: 4,
  },
  miniActionButtonNode: {
    width: 24,
    height: 24,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  miniActionDeleteButtonNode: {
    backgroundColor: "rgba(248, 113, 113, 0.08)",
  },
  addMenuPopoverContainer: {
    backgroundColor: "rgba(0,0,0,0.5)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
  },
  addMenuSubtitleText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#60a5fa",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  searchBarInlineFrame: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 6,
    paddingHorizontal: 8,
    height: 36,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchTextInputElement: {
    flex: 1,
    color: "#fff",
    fontSize: 12,
  },
  searchResultsContainer: {
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 6,
    marginTop: 6,
    maxHeight: 120,
    overflow: "scroll",
  },
  emptyResultsText: {
    color: "#475569",
    fontSize: 11,
    padding: 8,
  },
  searchResultListItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 8,
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  searchResultItemTitle: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  searchResultItemSubtitle: {
    color: "#64748b",
    fontSize: 10,
  },
  badgeLabelItem: {
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeLabelItemText: {
    color: "#60a5fa",
    fontSize: 9,
  },
  customCoordsDividerBorder: {
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginTop: 10,
    pt: 8,
  },
  flexInputsRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 6,
  },
  inlineFlexField: {
    backgroundColor: "rgba(0,0,0,0.3)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 6,
    height: 32,
    paddingHorizontal: 8,
    color: "#fff",
    fontSize: 11,
  },
  customAddButtonTrigger: {
    backgroundColor: "#2563eb",
    height: 32,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  customAddButtonTriggerText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  svgMapCanvasWrapper: {
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 8,
    padding: 8,
    alignItems: "center",
    marginTop: 8,
  },
  legendCanvasRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  legendItemInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendDotItem: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendDotItemLabel: {
    color: "#94a3b8",
    fontSize: 10,
  },
  emptyTimelineStateHolder: {
    paddingVertical: 20,
    alignItems: "center",
  },
  timelineVerticalTrackBranchContainer: {
    paddingLeft: 8,
    marginTop: 12,
  },
  timelineRowElementFrame: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  timelineLeftConnectorBlock: {
    alignItems: "center",
    width: 16,
  },
  timelineStatusRingAnchor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    backgroundColor: "#0b0c16",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  timelineRingBlue: {
    borderColor: "#3b82f6",
  },
  timelineRingEmerald: {
    borderColor: "#10b981",
  },
  verticalInterconnectLineBar: {
    flex: 1,
    width: 1,
    borderLeftWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderStyle: "dashed",
    marginVertical: 4,
  },
  timelineDataContentBubbleCard: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
    borderRadius: 8,
    padding: 10,
  },
  timelineContentBubbleTopBarMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  timelineTimeFrameBoxBadge: {
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  timelineTimeFrameBoxBadgeText: {
    color: "#60a5fa",
    fontSize: 10,
    fontWeight: "700",
  },
  timelineTaskMinsCountText: {
    color: "#64748b",
    fontSize: 10,
  },
  timelineItemHeadlineTextString: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  timelineItemMetaAddressTruncated: {
    color: "#64748b",
    fontSize: 11,
    marginTop: 2,
  },
  travelTimeInterconnectLayoutAlertBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(129, 140, 248, 0.08)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 8,
    alignSelf: "flex-start",
  },
  travelTimeInterconnectLayoutAlertBoxText: {
    color: "#c7d2fe",
    fontSize: 9,
    fontWeight: "600",
  },
  finalEodBlockFrameBadge: {
    backgroundColor: "rgba(129, 140, 248, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(129, 140, 248, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  finalEodBlockFrameBadgeText: {
    color: "#a5b4fc",
    fontSize: 11,
    fontWeight: "700",
  },
  modalOverlayContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalContentBody: {
    backgroundColor: "#1e293b",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: "50%",
  },
  modalTitleHeadlineText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 12,
    textAlign: "center",
  },
  modalSelectionListItemRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  modalSelectionListItemRowText: {
    color: "#e2e8f0",
    fontSize: 14,
  },
  modalCloseTriggerBtn: {
    backgroundColor: "rgba(255,255,255,0.05)",
    height: 38,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  modalCloseTriggerBtnText: {
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: "600",
  },
});