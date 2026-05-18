import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import {
  User,
  Mail,
  Phone,
  Briefcase,
  Building2,
  Shield,
  Calendar,
  ChevronRight,
  LogOut,
  FileText,
  Settings,
  HelpCircle,
  Menu,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { apiRequest } from '@/services/api';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { openSidebar } = useSidebar();

  const { data: meData } = useQuery({
    queryKey: ['authMe'],
    queryFn: async () => {
      const res = await apiRequest<{
        item: {
          id: string;
          name: string;
          email: string;
          role: string;
          status: string;
          phone?: string;
          department?: string;
          company?: string;
          hireDate?: string;
          employeeRole?: string;
        };
      }>('/auth/me');
      console.log('[Profile] Fetched user data:', res.data?.item);
      console.log("MOBILE PROFILE DATA:", JSON.stringify(res.data?.item, null, 2)); 
      return res.data?.item;
    },
    enabled: !!user,
  });

  const resolved = {
    email: meData?.email ?? user?.email ?? '',
    phone: meData?.phone ?? user?.phone ?? '',
    employeeRole: meData?.employeeRole ?? user?.jobTitle ?? '',
    department: meData?.department ?? user?.department ?? '',
    company: meData?.company ?? user?.company ?? '',
    hireDate: meData?.hireDate ?? user?.hireDate ?? '',
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  const profileFields = [
    { icon: Mail, label: 'Email', value: resolved.email },
    { icon: Phone, label: 'Phone', value: resolved.phone },
    { icon: Briefcase, label: 'Role', value: resolved.employeeRole },
    { icon: Building2, label: 'Department', value: resolved.department },
    { icon: Shield, label: 'Company', value: resolved.company },
    { icon: Calendar, label: 'Hire Date', value: resolved.hireDate },
  ];

  const menuItems = [
    { icon: FileText, label: 'Onboarding Documents', color: Colors.secondary },
    { icon: Settings, label: 'App Settings', color: Colors.textSecondary },
    { icon: HelpCircle, label: 'Help & Support', color: Colors.textSecondary },
  ];

  return (
    <View style={[styles.container, { paddingTop: /*insets.top*/0 }]}>
      {/*<View style={styles.header}>
        <TouchableOpacity
          style={styles.hamburgerBtn}
          onPress={openSidebar}
          activeOpacity={0.7}
          testID="profile-hamburger"
        >
          <Menu color={Colors.surface} size={22} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>*/}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileCard}>
          {user?.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <User color={Colors.primary} size={36} />
            </View>
          )}
          <Text style={styles.fullName}>{user?.fullName ?? 'Employee'}</Text>
          <Text style={styles.jobTitle}>{user?.jobTitle ?? ''}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{user?.role?.toUpperCase() ?? 'EMPLOYEE'}</Text>
          </View>
        </View>

        <View style={styles.detailsCard}>
          {profileFields.map((field, idx) => (
            <React.Fragment key={field.label}>
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <field.icon color={Colors.primary} size={16} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>{field.label}</Text>
                  <Text style={styles.detailValue}>{field.value}</Text>
                </View>
              </View>
              {idx < profileFields.length - 1 && <View style={styles.detailDivider} />}
            </React.Fragment>
          ))}
        </View>

        <View style={styles.menuCard}>
          {menuItems.map((item, idx) => (
            <React.Fragment key={item.label}>
              <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
                <View style={[styles.menuIcon, { backgroundColor: `${item.color}15` }]}>
                  <item.icon color={item.color} size={18} />
                </View>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <ChevronRight color={Colors.textTertiary} size={16} />
              </TouchableOpacity>
              {idx < menuItems.length - 1 && <View style={styles.detailDivider} />}
            </React.Fragment>
          ))}
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.7}
          testID="logout-button"
        >
          <LogOut color={Colors.error} size={18} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Version 1.0.0</Text>
        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
  },
  hamburgerBtn: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
  },
  profileCard: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    marginBottom: 12,
    borderWidth: 3,
    borderColor: Colors.surface,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
  },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.infoLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  fullName: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  jobTitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  roleBadge: {
    backgroundColor: Colors.infoLight,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  detailsCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  detailIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    color: Colors.textTertiary,
    fontWeight: '500' as const,
  },
  detailValue: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500' as const,
    marginTop: 1,
  },
  detailDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginHorizontal: 14,
  },
  menuCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 4,
    marginBottom: 24,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  menuIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500' as const,
    color: Colors.text,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.errorLight,
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 16,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.error,
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.textTertiary,
  },
});
