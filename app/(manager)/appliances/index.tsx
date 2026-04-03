import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Search, Wrench, AlertCircle, CheckCircle2, Clock, MapPin } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import Colors from '@/constants/colors';
import { apiRequest } from '@/services/api';

type ApplianceStatus = 'operational' | 'needs-repair' | 'maintenance';

interface Appliance {
  id: string;
  name: string;
  type: string;
  serialNumber: string;
  status: ApplianceStatus;
  location: string;
  lastInspection?: string;
}

export default function ManagerAppliancesScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: appliances = [], isLoading, refetch } = useQuery<Appliance[]>({
    queryKey: ['managerAppliances'],
    queryFn: async () => {
      const res = await apiRequest<{ items?: Appliance[] }>('/appliances');
      return res.data?.items || [];
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const filteredAppliances = appliances.filter((appliance) =>
    appliance.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    appliance.serialNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    appliance.type?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusIcon = (status: ApplianceStatus) => {
    switch (status) {
      case 'operational':
        return <CheckCircle2 size={16} color={Colors.success} />;
      case 'needs-repair':
        return <AlertCircle size={16} color={Colors.error} />;
      case 'maintenance':
        return <Clock size={16} color={Colors.warning} />;
    }
  };

  const getStatusColor = (status: ApplianceStatus) => {
    switch (status) {
      case 'operational':
        return Colors.success;
      case 'needs-repair':
        return Colors.error;
      case 'maintenance':
        return Colors.warning;
    }
  };

  // Show loading screen when data is loading initially
  if (isLoading && !refreshing) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Appliances</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading appliances...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Appliances</Text>
        <Text style={styles.subtitle}>{appliances.length} items</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Search size={20} color={Colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search appliances..."
            placeholderTextColor={Colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing || isLoading} onRefresh={onRefresh} />}
      >
        {filteredAppliances.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No appliances found</Text>
          </View>
        ) : (
          filteredAppliances.map((appliance) => (
            <View key={appliance.id} style={styles.applianceCard}>
              <View style={styles.applianceHeader}>
                <View style={styles.iconContainer}>
                  <Wrench size={24} color={Colors.primary} />
                </View>
                <View style={styles.applianceInfo}>
                  <Text style={styles.applianceName}>{appliance.name || 'Unknown'}</Text>
                  <Text style={styles.applianceType}>{appliance.type || '-'}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(appliance.status)}15` }]}>
                  {getStatusIcon(appliance.status)}
                  <Text style={[styles.statusText, { color: getStatusColor(appliance.status) }]}>
                    {appliance.status?.replace('-', ' ')}
                  </Text>
                </View>
              </View>

              <View style={styles.detailsRow}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Serial Number</Text>
                  <Text style={styles.detailValue}>{appliance.serialNumber || '-'}</Text>
                </View>
              </View>

              <View style={styles.locationRow}>
                <MapPin size={14} color={Colors.textTertiary} />
                <Text style={styles.locationText}>{appliance.location || 'No location'}</Text>
              </View>

              {appliance.lastInspection && (
                <View style={styles.inspectionRow}>
                  <Text style={styles.inspectionLabel}>Last Inspection:</Text>
                  <Text style={styles.inspectionValue}>
                    {new Date(appliance.lastInspection).toLocaleDateString()}
                  </Text>
                </View>
              )}
            </View>
          ))
        )}
        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textTertiary,
    marginTop: 4,
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    fontSize: 15,
    color: Colors.text,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    marginTop: 8,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.textTertiary,
  },
  applianceCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  applianceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.warningLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applianceInfo: {
    flex: 1,
    marginLeft: 12,
  },
  applianceName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  applianceType: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600' as const,
    textTransform: 'capitalize',
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.text,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    gap: 6,
  },
  locationText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  inspectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  inspectionLabel: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  inspectionValue: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.text,
  },
});
