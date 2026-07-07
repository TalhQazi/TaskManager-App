import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/services/api'; 
import { useSocket } from '@/contexts/SocketContext';
import { Coffee, Utensils, CheckCircle, AlertTriangle } from 'lucide-react-native';

export default function BreakTrackingScreen() {
  const { socket } = useSocket();

  // 1. Fetch History Sessions
  const { data: historyData, isLoading: historyLoading, refetch: refetchHistory } = useQuery({
    queryKey: ['break-history'],
    queryFn: () => apiRequest('/user/status-history'),
  });

  // 2. Fetch Live Statuses
  const { data: liveData, isLoading: liveLoading, refetch: refetchLive } = useQuery({
    queryKey: ['team-statuses'],
    queryFn: () => apiRequest('/team/statuses'),
    refetchInterval: 30000, 
  });

  // Use the data directly from React Query
  const sessions = historyData?.sessions || [];
  const liveStatuses = liveData?.items || [];

  // Socket listener to trigger refetch
  useEffect(() => {
    if (!socket) return;
    const handleStatusUpdate = () => {
      refetchHistory();
      refetchLive();
    };
    socket.on("status-update", handleStatusUpdate);
    return () => { socket.off("status-update", handleStatusUpdate); };
  }, [socket, refetchHistory, refetchLive]);

  if (historyLoading || liveLoading) return <ActivityIndicator style={{ flex: 1, backgroundColor: '#0b1323' }} size="large" color="#fff" />;

  const KpiCard = ({ icon: Icon, label, value, color }: any) => (
    <View style={[styles.kpiCard, { borderColor: color + '40' }]}>
      <Icon color={color} size={24} />
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Break Tracking</Text>

      <View style={styles.grid}>
        <KpiCard icon={Utensils} label="Lunch" value={liveStatuses.filter((e: any) => e.current_status === "LUNCH").length} color="#f97316" />
        <KpiCard icon={Coffee} label="Break" value={liveStatuses.filter((e: any) => e.current_status === "BREAK").length} color="#a855f7" />
        <KpiCard icon={CheckCircle} label="Done" value={sessions.length} color="#22c55e" />
        <KpiCard icon={AlertTriangle} label="Late" value={sessions.filter((s: any) => s.isLate).length} color="#ef4444" />
      </View>

      <Text style={styles.sectionTitle}>History Log</Text>
      <FlatList
        data={sessions}
        scrollEnabled={false}
        keyExtractor={(item: any) => item.id}
        renderItem={({ item }) => (
          <View style={styles.logCard}>
            <View>
              <Text style={styles.empName}>{item.employeeName}</Text>
              <Text style={styles.typeText}>{item.type} • {new Date(item.startTime).toLocaleTimeString()}</Text>
            </View>
            <View style={[styles.badge, item.isLate && styles.lateBadge]}>
              <Text style={styles.badgeText}>{item.isLate ? `Late ${item.exceededMinutes}m` : 'On Time'}</Text>
            </View>
          </View>
        )}
      />
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b1323' },
  content: { padding: 20 },
  title: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  sectionTitle: { color: '#94a3b8', fontSize: 16, fontWeight: '600', marginTop: 20, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpiCard: { width: '47%', backgroundColor: '#1e293b', padding: 15, borderRadius: 12, borderWidth: 1 },
  kpiValue: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginVertical: 5 },
  kpiLabel: { color: '#94a3b8', fontSize: 12 },
  logCard: { backgroundColor: '#1e293b', padding: 15, borderRadius: 12, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  empName: { color: '#fff', fontWeight: '600' },
  typeText: { color: '#64748b', fontSize: 12 },
  badge: { backgroundColor: '#064e3b', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  lateBadge: { backgroundColor: '#7f1d1d' },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' }
});