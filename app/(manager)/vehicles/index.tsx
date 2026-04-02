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
import { Search, Car, AlertCircle, CheckCircle2, Clock } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import Colors from '@/constants/colors';
import { apiRequest } from '@/services/api';

type VehicleStatus = 'available' | 'in-use' | 'maintenance';

interface Vehicle {
  id: string;
  name: string;
  type: string;
  licensePlate: string;
  status: VehicleStatus;
  assignedTo?: string;
  lastService?: string;
}

export default function ManagerVehiclesScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: vehicles = [], isLoading, refetch } = useQuery<Vehicle[]>({
    queryKey: ['managerVehicles'],
    queryFn: async () => {
      const res = await apiRequest<{ items?: Vehicle[] }>('/vehicles');
      return res.data?.items || [];
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const filteredVehicles = vehicles.filter((vehicle) =>
    vehicle.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vehicle.licensePlate?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vehicle.type?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusIcon = (status: VehicleStatus) => {
    switch (status) {
      case 'available':
        return <CheckCircle2 size={16} color={Colors.success} />;
      case 'in-use':
        return <Clock size={16} color={Colors.warning} />;
      case 'maintenance':
        return <AlertCircle size={16} color={Colors.error} />;
    }
  };

  const getStatusColor = (status: VehicleStatus) => {
    switch (status) {
      case 'available':
        return Colors.success;
      case 'in-use':
        return Colors.warning;
      case 'maintenance':
        return Colors.error;
    }
  };

  // Show loading screen when data is loading initially
  if (isLoading && !refreshing) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Vehicles</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading vehicles...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Vehicles</Text>
        <Text style={styles.subtitle}>{vehicles.length} vehicles</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Search size={20} color={Colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search vehicles..."
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
        {filteredVehicles.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No vehicles found</Text>
          </View>
        ) : (
          filteredVehicles.map((vehicle) => (
            <View key={vehicle.id} style={styles.vehicleCard}>
              <View style={styles.vehicleHeader}>
                <View style={styles.iconContainer}>
                  <Car size={24} color={Colors.primary} />
                </View>
                <View style={styles.vehicleInfo}>
                  <Text style={styles.vehicleName}>{vehicle.name || 'Unknown'}</Text>
                  <Text style={styles.vehicleType}>{vehicle.type || '-'}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(vehicle.status)}15` }]}>
                  {getStatusIcon(vehicle.status)}
                  <Text style={[styles.statusText, { color: getStatusColor(vehicle.status) }]}>
                    {vehicle.status?.replace('-', ' ')}
                  </Text>
                </View>
              </View>

              <View style={styles.detailsRow}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>License Plate</Text>
                  <Text style={styles.detailValue}>{vehicle.licensePlate || '-'}</Text>
                </View>
                {vehicle.assignedTo && (
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Assigned To</Text>
                    <Text style={styles.detailValue}>{vehicle.assignedTo}</Text>
                  </View>
                )}
              </View>

              {vehicle.lastService && (
                <View style={styles.serviceRow}>
                  <Text style={styles.serviceLabel}>Last Service:</Text>
                  <Text style={styles.serviceValue}>
                    {new Date(vehicle.lastService).toLocaleDateString()}
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
  vehicleCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  vehicleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.infoLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleInfo: {
    flex: 1,
    marginLeft: 12,
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  vehicleType: {
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
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    gap: 6,
  },
  serviceLabel: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  serviceValue: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.text,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 16,
  },
});
