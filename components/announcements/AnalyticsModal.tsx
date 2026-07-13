import React,{useEffect} from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { X, Users, Eye, CheckCircle2 } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/services/api';

export default function AnalyticsModal({ visible, onClose, announcementId }) {
  const { data: response, isLoading } = useQuery({
  queryKey: ['analytics', announcementId],
  queryFn: () => apiRequest(`/announcements/${announcementId}/analytics`),
  enabled: !!visible && !!announcementId,
});

// Extract the nested data
const analyticsData = response?.data; 
const userList = analyticsData?.userList || [];



  return (
  <Modal visible={visible} animationType="slide" transparent>
  <View style={styles.overlay}>
    <View style={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Analytics</Text>
        <TouchableOpacity onPress={onClose}><X size={24} color="#fff" /></TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" style={{ marginVertical: 20 }} />
      ) : (
        <FlatList
          data={userList}
          // The modal will now only grow as large as the data provided
          // up to the 80% screen height limit defined in styles.content
          ListHeaderComponent={
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Read</Text>
                <Text style={styles.statValue}>{analyticsData?.readPercentage || 0}%</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Ack</Text>
                <Text style={styles.statValue}>{analyticsData?.acknowledgedPercentage || 0}%</Text>
              </View>
            </View>
          }
          keyExtractor={(item, index) => index.toString()}
          renderItem={({ item }) => (
            <View style={styles.userRow}>
              <Text style={styles.userName}>{item.userName}</Text>
              <Text style={styles.statusText}>{item.readAt ? "Read" : "Unread"}</Text>
            </View>
          )}
        />
      )}
    </View>
  </View>
</Modal>
  );
}

const styles = StyleSheet.create({
 overlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end' // This moves content to the bottom
  },
  // Remove fixed marginTop and set width to full
  content: { 
    maxHeight: '80%', 
    backgroundColor: '#1e293b', 
    borderTopLeftRadius: 20, 
    borderTopRightRadius: 20, 
    padding: 20,
    width: '100%'
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  title: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  statsGrid: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: '#334155', padding: 15, borderRadius: 10, alignItems: 'center' },
  statLabel: { color: '#94a3b8', fontSize: 12 },
  statValue: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  userRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#334155' },
  userName: { color: '#fff' },
  statusText: { color: '#94a3b8' }
});