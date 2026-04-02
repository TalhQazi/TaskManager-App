import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Modal,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Search, Phone, Mail, ChevronRight, X, Clock, ClipboardCheck } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import Colors from '@/constants/colors';
import { apiRequest } from '@/services/api';

type EmployeeStatus = 'active' | 'inactive' | 'on-leave';

interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  status: EmployeeStatus;
}

type FilterType = 'all' | 'active' | 'on-leave';

export default function ManagerTeamScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const { data: employees = [], isLoading, refetch } = useQuery<Employee[]>({
    queryKey: ['managerEmployees'],
    queryFn: async () => {
      const res = await apiRequest<{ items?: Employee[] }>('/employees');
      return res.data?.items || [];
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const filteredEmployees = employees.filter((employee) => {
    const matchesSearch =
      employee.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.role?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.department?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      filter === 'all' ||
      (filter === 'active' && employee.status === 'active') ||
      (filter === 'on-leave' && employee.status === 'on-leave');
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status: EmployeeStatus) => {
    switch (status) {
      case 'active':
        return Colors.success;
      case 'on-leave':
        return Colors.warning;
      case 'inactive':
        return Colors.textTertiary;
    }
  };

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'on-leave', label: 'On Leave' },
  ];

  const openProfile = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowProfileModal(true);
  };

  // Show loading screen when data is loading initially
  if (isLoading && !refreshing) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Team</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading team members...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Team</Text>
        <Text style={styles.subtitle}>{employees.length} members</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Search size={20} color={Colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search team members..."
            placeholderTextColor={Colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContent}
      >
        {filters.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterChipText, filter === f.key && styles.filterChipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing || isLoading} onRefresh={onRefresh} />}
      >
        {filteredEmployees.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No team members found</Text>
          </View>
        ) : (
          filteredEmployees.map((employee) => (
            <View key={employee.id} style={styles.employeeCard}>
              <View style={styles.employeeHeader}>
                <View style={styles.avatarContainer}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {employee.name?.split(' ').map((n) => n[0]).join('') || '?'}
                    </Text>
                  </View>
                  <View style={[styles.statusDot, { backgroundColor: getStatusColor(employee.status) }]} />
                </View>
                <View style={styles.employeeInfo}>
                  <Text style={styles.employeeName}>{employee.name || 'Unknown'}</Text>
                  <Text style={styles.employeeRole}>{employee.role || 'Staff'}</Text>
                  <Text style={styles.employeeDept}>{employee.department || '-'}</Text>
                </View>
              </View>
              <View style={styles.contactRow}>
                <View style={styles.contactButton}>
                  <Phone size={16} color={Colors.secondary} />
                  <Text style={styles.contactText}>{employee.phone || '-'}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.viewProfile} onPress={() => openProfile(employee)}>
                <Text style={styles.viewProfileText}>View Profile</Text>
                <ChevronRight size={16} color={Colors.secondary} />
              </TouchableOpacity>
            </View>
          ))
        )}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Profile Modal */}
      <Modal
        visible={showProfileModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowProfileModal(false)}
      >
        <View style={[styles.modalContainer, { paddingTop: Platform.OS === 'ios' ? 20 : 0 }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Employee Profile</Text>
            <TouchableOpacity onPress={() => setShowProfileModal(false)}>
              <X size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          {selectedEmployee && (
            <ScrollView style={styles.modalContent}>
              <View style={styles.profileHeader}>
                <View style={styles.profileAvatar}>
                  <Text style={styles.profileAvatarText}>
                    {selectedEmployee.name?.split(' ').map((n) => n[0]).join('') || '?'}
                  </Text>
                </View>
                <Text style={styles.profileName}>{selectedEmployee.name}</Text>
                <Text style={styles.profileRole}>{selectedEmployee.role}</Text>
                <View
                  style={[
                    styles.profileStatusBadge,
                    { backgroundColor: `${getStatusColor(selectedEmployee.status)}20` },
                  ]}
                >
                  <View style={[styles.profileStatusDot, { backgroundColor: getStatusColor(selectedEmployee.status) }]} />
                  <Text style={[styles.profileStatusText, { color: getStatusColor(selectedEmployee.status) }]}>
                    {selectedEmployee.status?.replace('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                  </Text>
                </View>
              </View>

              <View style={styles.profileSection}>
                <Text style={styles.profileSectionTitle}>Contact Information</Text>
                <View style={styles.profileInfoRow}>
                  <Phone size={20} color={Colors.secondary} />
                  <View style={styles.profileInfoContent}>
                    <Text style={styles.profileInfoLabel}>Phone</Text>
                    <Text style={styles.profileInfoValue}>{selectedEmployee.phone || '-'}</Text>
                  </View>
                </View>
                <View style={styles.profileInfoRow}>
                  <Mail size={20} color={Colors.secondary} />
                  <View style={styles.profileInfoContent}>
                    <Text style={styles.profileInfoLabel}>Email</Text>
                    <Text style={styles.profileInfoValue}>{selectedEmployee.email || '-'}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.profileSection}>
                <Text style={styles.profileSectionTitle}>Work Information</Text>
                <View style={styles.profileInfoRow}>
                  <ClipboardCheck size={20} color={Colors.secondary} />
                  <View style={styles.profileInfoContent}>
                    <Text style={styles.profileInfoLabel}>Department</Text>
                    <Text style={styles.profileInfoValue}>{selectedEmployee.department || '-'}</Text>
                  </View>
                </View>
                <View style={styles.profileInfoRow}>
                  <Clock size={20} color={Colors.secondary} />
                  <View style={styles.profileInfoContent}>
                    <Text style={styles.profileInfoLabel}>Role</Text>
                    <Text style={styles.profileInfoValue}>{selectedEmployee.role || '-'}</Text>
                  </View>
                </View>
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>
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
  filterScroll: {
    maxHeight: 50,
    marginTop: 12,
  },
  filterContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: Colors.surface,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    marginTop: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    backgroundColor: Colors.surface,
    borderRadius: 16,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.textTertiary,
  },
  employeeCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  employeeHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.surface,
  },
  statusDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  employeeInfo: {
    flex: 1,
    marginLeft: 14,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  employeeRole: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  employeeDept: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  contactRow: {
    flexDirection: 'row',
    marginTop: 14,
    gap: 12,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  contactText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  viewProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  viewProfileText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.secondary,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  modalContent: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: Colors.surface,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  profileAvatarText: {
    fontSize: 28,
    fontWeight: '600' as const,
    color: Colors.surface,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  profileRole: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  profileStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 12,
    gap: 6,
  },
  profileStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  profileStatusText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  profileSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  profileSectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 16,
  },
  profileInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 14,
  },
  profileInfoContent: {
    flex: 1,
  },
  profileInfoLabel: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  profileInfoValue: {
    fontSize: 15,
    color: Colors.text,
    marginTop: 2,
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
