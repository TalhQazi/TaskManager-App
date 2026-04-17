import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,Image
} from 'react-native';
import { User, Mail, Phone, Briefcase, Building2, Calendar, LogOut } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import Colors from '@/constants/colors';
import { apiRequest } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

interface ProfileData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  department?: string;
  company?: string;
  hireDate?: string;
}

export default function ManagerProfileScreen() {
  const { user, logout } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const { data: profile, isLoading, refetch } = useQuery<ProfileData>({
    queryKey: ['managerProfile'],
    queryFn: async () => {
      const res = await apiRequest<{ item?: ProfileData }>('/auth/me');
      return res.data?.item || (user as unknown as ProfileData);
    },
  });

  const { data: userSettings } = useQuery({
  queryKey: ['userSettings'],
  queryFn: async () => {
    const res = await apiRequest('/settings');
    return res.data;
  },
  });

  const avatarUrlRaw =
  userSettings?.item?.avatarDataUrl ||   
  userSettings?.item?.avatarUrl ||
  userSettings?.item?.avatar ||
  null;

const avatarUrl = avatarUrlRaw
  ? avatarUrlRaw.startsWith('http')
    ? avatarUrlRaw
    : `https://task.se7eninc.com${avatarUrlRaw}`
  : null;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const initials = (profile?.name || user?.fullName || 'M')
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const profileFields = [
    { icon: Mail, label: 'Email', value: profile?.email || user?.email || '-' },
    { icon: Phone, label: 'Phone', value: profile?.phone || '-' },
    { icon: Briefcase, label: 'Role', value: profile?.role || user?.jobTitle || 'Manager' },
    { icon: Building2, label: 'Department', value: profile?.department || user?.department || '-' },
    { icon: Building2, label: 'Company', value: profile?.company || user?.company || '-' },
    { icon: Calendar, label: 'Hire Date', value: profile?.hireDate || user?.hireDate || '-' },
  ];

  // Show loading screen when data is loading initially
  if (isLoading && !refreshing) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.name}>{user?.fullName || 'Manager'}</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing || isLoading} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
         {/* <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>*/}

          <View style={styles.avatar}>
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={styles.avatarImage}
              onError={(e) => console.log("Image error:", e.nativeEvent)}
            />
          ) : (
            <Text style={styles.avatarText}>{initials}</Text>
          )}
        </View>
          <Text style={styles.name}>{profile?.name || user?.fullName || 'Manager'}</Text>
          <Text style={styles.role}>{profile?.role || user?.jobTitle || 'Manager'}</Text>
        </View>

        <View style={styles.infoSection}>
          {profileFields.map((field, index) => (
            <View key={field.label} style={[styles.infoRow, index === profileFields.length - 1 && styles.lastRow]}>
              <View style={styles.iconContainer}>
                <field.icon size={20} color={Colors.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>{field.label}</Text>
                <Text style={styles.infoValue}>{field.value}</Text>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={logout} activeOpacity={0.8}>
          <LogOut size={20} color={Colors.error} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  avatarImage: {
  width: '100%',
  height: '100%',
  borderRadius: 50,
},
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '700' as const,
    color: Colors.surface,
  },
  name: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  role: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  infoSection: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.infoLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
    marginLeft: 14,
  },
  infoLabel: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: Colors.text,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.errorLight,
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.error,
    marginLeft: 8,
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
