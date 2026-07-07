import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Pin, MoreHorizontal, TrendingUp, AlertTriangle } from 'lucide-react-native';
import Colors from '@/constants/colors';

// Added onMorePress and onView to the props interface
interface AdminAnnouncementCardProps {
  item: any;
  onPress: () => void;      // Keep this required
  onView?: () => void;      // Added ? (Optional)
  onMorePress?: () => void; // Added ? (Optional)
  onDelete?: () => void;    // Added ? (Optional)
  onEdit?: () => void;      // Added ? (Optional)
  onArchive?: () => void;   // Added ? (Optional)
  onPin?: () => void;       // Added ? (Optional)
}

export default function AdminAnnouncementCard({ 
  item, 
  onPress, 
  onView, 
  onMorePress 
}: AdminAnnouncementCardProps) {
  
  return (
    <TouchableOpacity style={[styles.card, item.emergency && styles.emergencyCard]} onPress={onPress}>
      {item.emergency && (
        <View style={styles.emergencyBadge}>
          <AlertTriangle size={12} color="#f87171" />
          <Text style={styles.emergencyText}>EMERGENCY</Text>
        </View>
      )}

      {item.pinned && <Pin size={16} color="#00C6FF" style={styles.pinIcon} />}

      <Text style={styles.title} numberOfLines={2}>{item.title}</Text>

      <View style={styles.statsGrid}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Read</Text>
          <Text style={styles.statValue}>{item.readPercentage || 0}%</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Ack</Text>
          <Text style={styles.statValue}>{item.acknowledgedPercentage || 0}%</Text>
        </View>
      </View>

      <View style={styles.footer}>
        {/* Using the new onView prop for Analytics */}
        <TouchableOpacity style={styles.actionBtn} onPress={onView}>
          <TrendingUp size={16} color="#fff" />
          <Text style={styles.actionText}>Analytics</Text>
        </TouchableOpacity>

        {/* Using the new onMorePress prop for the action modal */}
        <TouchableOpacity style={styles.moreBtn} onPress={onMorePress}>
          <MoreHorizontal size={20} color="#94a3b8" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // ... (keep your existing styles as they are)
  card: { backgroundColor: '#1e293b', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#334155' },
  emergencyCard: { borderColor: '#ef444455', backgroundColor: '#450a0a44' },
  emergencyBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#450a0a', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start', marginBottom: 8 },
  emergencyText: { color: '#f87171', fontSize: 10, fontWeight: 'bold', marginLeft: 4 },
  pinIcon: { position: 'absolute', top: 16, right: 16 },
  title: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 12 },
  statsGrid: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statBox: { flex: 1, backgroundColor: '#334155', padding: 8, borderRadius: 6 },
  statLabel: { color: '#94a3b8', fontSize: 10 },
  statValue: { color: '#fff', fontWeight: 'bold' },
  footer: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#334155', padding: 8, borderRadius: 6 },
  actionText: { color: '#fff', fontSize: 12 },
  moreBtn: { padding: 8, backgroundColor: '#334155', borderRadius: 6 }
});