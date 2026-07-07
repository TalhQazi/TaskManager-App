import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator, 
  Alert,
  Linking
} from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getMyItinerary, completeItineraryStop, ItineraryStop } from "@/lib/admin/apiClient"; // Ensure path is correct
import { useSocket } from "@/contexts/SocketContext";
import { 
  MapPin, Navigation, CheckCircle2, Circle, Clock, 
  Map, RefreshCw, AlertCircle, Check, ExternalLink, TrendingUp
} from "lucide-react-native";

const COLORS = {
  background: "#09090b",
  card: "#18181b",
  indigo: "#6366f1",
  emerald: "#10b981",
  text: "#ffffff",
  textMuted: "#a1a1aa",
  border: "rgba(255,255,255,0.1)",
};

export default function EmployeeItinerary() {
  const queryClient = useQueryClient();
  const { socket } = useSocket();
  const [dateStr] = useState(() => new Date().toLocaleDateString("en-CA"));
  const [loadingStopId, setLoadingStopId] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["employee-itinerary", dateStr],
    queryFn: async () => (await getMyItinerary(dateStr)).item,
  });

  // Socket logic
  useEffect(() => {
    if (!socket) return;
    const handleItineraryUpdate = (payload: any) => {
      if (data && data._id === payload.itineraryId) {
        queryClient.invalidateQueries({ queryKey: ["employee-itinerary", dateStr] });
      }
    };
    socket.on("itinerary-update", handleItineraryUpdate);
    return () => { socket.off("itinerary-update", handleItineraryUpdate); };
  }, [socket, data, queryClient, dateStr]);

  const handleToggleComplete = async (stopId: string, currentStatus: boolean) => {
    if (!data) return;
    try {
      setLoadingStopId(stopId);
      await completeItineraryStop(data._id || data.id, stopId, !currentStatus);
      queryClient.setQueryData(["employee-itinerary", dateStr], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          stops: old.stops.map((s: ItineraryStop) => 
            s._id === stopId ? { ...s, completed: !currentStatus } : s
          )
        };
      });
    } catch {
      Alert.alert("Error", "Failed to update status.");
    } finally {
      setLoadingStopId(null);
    }
  };

  if (isLoading) return (
    <View style={styles.center}><ActivityIndicator size="large" color={COLORS.indigo} /></View>
  );

  if (error) return (
    <View style={styles.center}>
      <AlertCircle color="#ef4444" size={48} />
      <Text style={styles.text}>Failed to load route</Text>
      <TouchableOpacity onPress={() => refetch()}><Text style={{color: COLORS.indigo}}>Retry</Text></TouchableOpacity>
    </View>
  );

  const stops = data?.stops || [];
  const sortedStops = [...stops].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
  const activeStop = sortedStops.find(s => !s.completed);
  const progressPercent = stops.length > 0 ? Math.round((stops.filter(s => s.completed).length / stops.length) * 100) : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 50 }}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Daily Itinerary</Text>
        <Text style={styles.textMuted}>{dateStr}</Text>
        
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
        </View>
        <Text style={styles.textMuted}>{stops.filter(s => s.completed).length} of {stops.length} stops completed</Text>
      </View>

      {/* Active Stop Card */}
      {activeStop ? (
        <View style={styles.activeCard}>
          <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 10}}>
             <MapPin color={COLORS.indigo} size={24} />
             <Text style={styles.cardTitle}>Up Next: {activeStop.title}</Text>
          </View>
          <Text style={styles.textMuted}>{activeStop.address}</Text>
          
          <TouchableOpacity 
            style={styles.completeBtn}
            onPress={() => handleToggleComplete(activeStop._id, false)}
            disabled={loadingStopId === activeStop._id}
          >
            {loadingStopId === activeStop._id ? <RefreshCw color="white" /> : <Text style={styles.btnText}>Complete Stop</Text>}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.activeCard}><Text style={styles.text}>All tasks done for today!</Text></View>
      )}

      {/* Timeline */}
      <Text style={styles.sectionHeader}>Route Timeline</Text>
      {sortedStops.map((stop, index) => (
        <View key={stop._id} style={styles.timelineRow}>
          <View style={[styles.dot, { backgroundColor: stop.completed ? COLORS.emerald : COLORS.indigo }]} />
          <View style={{flex: 1}}>
            <Text style={[styles.text, stop.completed && {textDecorationLine: 'line-through'}]}>{stop.title}</Text>
            <Text style={styles.textMuted}>{stop.address}</Text>
            {!stop.completed && (
              <TouchableOpacity onPress={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${stop.latitude},${stop.longitude}`)}>
                <Text style={{color: COLORS.indigo, marginTop: 5}}>Navigate</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  header: { padding: 20, backgroundColor: COLORS.card, borderRadius: 16, marginBottom: 20 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.text },
  text: { color: COLORS.text, fontSize: 16 },
  textMuted: { color: COLORS.textMuted, fontSize: 14, marginTop: 4 },
  progressBarBg: { height: 8, backgroundColor: '#333', borderRadius: 4, marginVertical: 10 },
  progressBarFill: { height: 8, backgroundColor: COLORS.indigo, borderRadius: 4 },
  activeCard: { backgroundColor: COLORS.card, padding: 20, borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: COLORS.indigo },
  cardTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold', marginLeft: 10 },
  completeBtn: { backgroundColor: COLORS.emerald, padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 15 },
  btnText: { color: 'white', fontWeight: 'bold' },
  sectionHeader: { color: COLORS.textMuted, fontSize: 12, textTransform: 'uppercase', marginBottom: 10 },
  timelineRow: { flexDirection: 'row', marginBottom: 20 },
  dot: { width: 12, height: 12, borderRadius: 6, marginRight: 15, marginTop: 5 }
});