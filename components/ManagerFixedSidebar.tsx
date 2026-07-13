import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Modal,
  TouchableWithoutFeedback,
  Platform,
  Image,
} from 'react-native';

import { usePathname, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import {
  LayoutDashboard,
  ClipboardCheck,
  ClipboardList,
  Users,
  Megaphone,
  Calendar,
  Clock,
  Coffee,
  FileText,
  CalendarCheck,
  Building,
  CheckSquare,
  FolderOpen,
  DollarSign,
  User,
  Car,
  Wrench,
  MapPin,
  Building2,
  UserRoundX,
  BarChart3,
  MessageSquare,
  Settings,
  ShoppingCart,
  Bug,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  LogOut,
} from 'lucide-react-native';

import { useAuth } from '@/contexts/AuthContext';

const SIDEBAR_WIDTH = 270;

interface NavItem {
  key: string;
  label: string;
  path?: string;
  icon?: any;
  isCustomImage?: boolean;
  imageSource?: string;
  children?: NavItem[];
}

// Unified, cross-platform aligned menu map config
const baseItems: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', path: '/(manager)/home', icon: LayoutDashboard },
  { key: 'compliance', label: 'Compliance Center', path: '/(manager)/compliance-center', icon: ClipboardCheck },
  { key: 'tasks', label: 'Tasks', path: '/(manager)/tasks', icon: ClipboardList },
  { key: 'team', label: 'Employees', path: '/(manager)/team', icon: Users },
  { key: 'announcement', label: 'Announcements', path: '/(manager)/announcement', icon: Megaphone },
  { key: 'schedule', label: 'Scheduling', path: '/(manager)/schedule', icon: Calendar },
  { key: 'timeTracking', label: 'Time Tracking', path: '/(manager)/time-tracking', icon: Clock },
  { key: 'breakHistory', label: 'Break History', path: '/(manager)/break-history', icon: Coffee },
  { key: 'attendance', label: 'Attendance', path: '/(manager)/attendance', icon: Clock },
  {
    key: 'crm',
    label: 'CRM',
    icon: FileText,
    children: [
      { key: 'crmDashboard', label: 'CRM Dashboard', path: '/(manager)/crm/dashboard', icon: CalendarCheck },
      { key: 'crmContacts', label: 'Contacts', path: '/(manager)/crm/contacts', icon: Users },
      { key: 'crmCompanies', label: 'Companies', path: '/(manager)/crm/companies', icon: Building },
      { key: 'crmDeals', label: 'CRM Deals', path: '/(manager)/crm/deals', icon: CheckSquare },
      { key: 'crmTasks', label: 'CRM Tasks', path: '/(manager)/crm/tasks', icon: ClipboardList },
      { key: 'crmFiles', label: 'Files', path: '/(manager)/crm/files', icon: FolderOpen },
    ],
  },
  { key: 'payroll', label: 'Payroll', path: '/(manager)/payroll', icon: DollarSign },
  { key: 'profile', label: 'Profile', path: '/(manager)/profile', icon: User },
  { key: 'eodReports', label: 'EOD Reports', path: '/(manager)/eod-reports', icon: ClipboardCheck },
  { key: 'leaveRequests', label: 'Leave Requests', path: '/(manager)/leave-requests', icon: Calendar },
  { key: 'travelCalendar', label: 'Travel Calendar', path: '/(manager)/travel-calendar', icon: Calendar },
  { key: 'vehicles', label: 'Vehicles', path: '/(manager)/vehicles', icon: Car },
  { key: 'appliances', label: 'Inventory/Appliances', path: '/(manager)/appliances', icon: Wrench },
  { key: 'locations', label: 'Locations', path: '/(manager)/locations', icon: MapPin },
  { key: 'itinerary', label: 'Daily Itinerary', path: '/(manager)/itinerary', icon: MapPin },
  { key: 'vendors', label: 'Vendors', path: '/(manager)/vendors', icon: Building2 },
  { key: 'donothire', label: 'Do Not Hire', path: '/(manager)/donothire', icon: UserRoundX },
  { key: 'onboarding', label: 'Onboarding', path: '/(manager)/onboarding', icon: ClipboardCheck },
  { key: 'reports', label: 'Reports', path: '/(manager)/reports', icon: BarChart3 },
  { key: 'messages', label: 'Messages', path: '/(manager)/messages', icon: MessageSquare }, 
  { key: 'uiCustomization', label: 'UI Customization', path: '/(manager)/ui-customization', icon: Settings },
  { key: 'shoppingLists', label: 'Shopping Lists', path: '/(manager)/shopping-lists', icon: ShoppingCart },
  { key: 'settings', label: 'Settings', path: '/(manager)/settings', icon: Settings },
  { key: 'bugs', label: 'Bugs', path: '/(manager)/bug', icon: Bug },
  { key: 'contracts', label: 'SignaCore', path: '/(manager)/contracts', isCustomImage: true, imageSource: 'https://via.placeholder.com/24' },
  { key: 'uphMaintenance', label: 'Atlas Properties', path: '/(manager)/uph-maintenance', isCustomImage: true, imageSource: 'https://via.placeholder.com/24' },
  { key: 'personalNotes', label: 'Personal Notes', path: '/(manager)/personal-notes', isCustomImage: true, imageSource: 'https://via.placeholder.com/20' },
]; 

// Alphabetically sorts matching web logic, while preserving Dashboard at index 0
const items = [...baseItems].sort((a, b) => {
  if (a.key === 'dashboard') return -1;
  if (b.key === 'dashboard') return 1;
  return a.label.localeCompare(b.label);
});

export default function ManagerFixedSidebar({ isOpen, onClose }: any) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});

  const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (isOpen) {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: -SIDEBAR_WIDTH, duration: 180, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [isOpen]);

  // Clean layout groups for uniform route matching evaluation
  const isActiveRoute = (routePath?: string) => {
    if (!routePath) return false;
    const cleanRoute = routePath.replace(/\/\([^)]+\)/g, '');
    const cleanPathname = pathname.replace(/\/\([^)]+\)/g, '');

    if (cleanRoute === '/home' && (cleanPathname === '/home' || cleanPathname === '/')) {
      return true;
    }
    return cleanPathname === cleanRoute || cleanPathname.startsWith(cleanRoute + '/');
  };

  const navigate = (path: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(path as any);
    onClose();
  };

  const toggleMenu = (menuKey: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setExpandedMenus((prev) => ({
      ...prev,
      [menuKey]: !prev[menuKey],
    }));
  };

  const handleLogout = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    if (logout) {
      await logout();
    }
    onClose();
  };

  const renderItemRow = (item: NavItem, isChild = false) => {
    // Submenu Parent Container Check
    if (item.children) {
      const isExpanded = expandedMenus[item.key] ?? false;
      const hasActiveChild = item.children.some((child) => child.path && isActiveRoute(child.path));
      const rowActive = hasActiveChild || isExpanded;
      const parentIconColor = rowActive ? "#ffd27a" : "#a1a1aa";
      const chevronColor = rowActive ? "#ffd27a" : "#71717a";

      return (
        <View key={item.key} style={styles.submenuContainer}>
          <TouchableOpacity
            style={[styles.item, rowActive && styles.menuItemActive]}
            onPress={() => toggleMenu(item.key)}
          >
            <View style={styles.itemInnerLeftGroup}>
              {item.icon && <item.icon color={parentIconColor} size={20} />}
              <Text style={[styles.menuLabel, rowActive && styles.menuLabelActive]}>{item.label}</Text>
            </View>
            {isExpanded ? (
              <ChevronDown color={chevronColor} size={16} />
            ) : (
              <ChevronRight color={chevronColor} size={16} />
            )}
          </TouchableOpacity>

          {isExpanded && (
            <View style={styles.submenuChildrenBlock}>
              {item.children.map((child) => renderItemRow(child, true))}
            </View>
          )}
        </View>
      );
    }

    // Normal Leaf Nodes / Action Rows
    const active = item.path ? isActiveRoute(item.path) : false;
    const itemIconColor = active ? "#ffd27a" : "#a1a1aa";

    return (
      <TouchableOpacity
        key={item.key}
        style={[
          styles.item,
          isChild && styles.childItemAdjustment,
          active && styles.menuItemActive,
        ]}
        onPress={() => item.path && navigate(item.path)}
      >
        <View style={styles.itemInnerLeftGroup}>
          {item.isCustomImage ? (
            <Image source={{ uri: item.imageSource }} style={styles.customMenuImageStyle} />
          ) : (
            item.icon && <item.icon color={itemIconColor} size={isChild ? 16 : 20} />
          )}

          {/* Branding Highlights */}
          {item.label === 'SignaCore' ? (
            <Text style={[styles.menuLabel, styles.boldWeightText, active && styles.menuLabelActive]}>
              <Text style={styles.blueBrandingText}>Signa</Text>
              <Text style={styles.orangeBrandingText}>Core</Text>
            </Text>
          ) : (
            <Text 
              style={[
                styles.menuLabel, 
                isChild && styles.childLabelText, 
                active && styles.menuLabelActive
              ]}
            >
              {item.label}
            </Text>
          )}
        </View>
        {active && !isChild && (
          <ChevronRight color="#ffd27a" size={16} />
        )}
      </TouchableOpacity>
    );
  };

  const sidebarUI = (
    <View 
      style={[
        styles.container, 
        { 
          paddingTop: Platform.OS === 'ios' ? insets.top + 10 : insets.top + 16,
          paddingBottom: insets.bottom + 16 
        }
      ]}
    >
      {/* HEADER SECTION */}
      <View style={styles.logoSection}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>TaskManager</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeTouchArea}>
            <ChevronLeft color="#f4f4f5" size={24} />
          </TouchableOpacity>
        </View>
        <Text style={styles.logoSubtitle}>Manager Dashboard</Text>
      </View>

      {/* USER CARD WITH AVATAR */}
      <View style={styles.userCard}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>
            {user?.fullName?.charAt(0)?.toUpperCase() ?? 'M'}
          </Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName} numberOfLines={1}>
            {user?.fullName ?? 'Manager'}
          </Text>
          <Text style={styles.userRole} numberOfLines={1}>
            {user?.jobTitle ?? 'Administrator'}
          </Text>
        </View>
        <View style={styles.statusIndicator}>
          <View style={styles.statusDot} />
        </View>
      </View>

      {/* SCROLLABLE ITEMS BOX */}
      <ScrollView style={styles.menuContainer} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPaddingBottom}>
        <Text style={styles.menuHeader}>Main Menu</Text>
        {items.map((item) => renderItemRow(item))}
      </ScrollView>

      {/* FIXED LOGOUT BUTTON SECTION */}
      <View style={styles.logoutSection}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut color="#f87171" size={20} />
          <Text style={styles.logoutLabel}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* BACKDROP */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
      </TouchableWithoutFeedback>

      {/* DRAWER LAYER */}
      <Animated.View
        style={[
          styles.drawer,
          { transform: [{ translateX: slideAnim }] },
        ]}
      >
        {sidebarUI}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
  },
  container: {
    flex: 1,
    backgroundColor: '#133767',
    paddingHorizontal: 14,
    borderRightWidth: 1,
    borderRightColor: '#27272a',
  },
  logoSection: {
    paddingHorizontal: 4,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
    marginBottom: 20,
  },
  logoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  logoText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#f4f4f5',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  logoSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#71717a',
    marginTop: 2,
  },
  closeTouchArea: {
    padding: 4,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    padding: 12,
    backgroundColor: '#133767',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 6,
    gap: 12,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ffffff',
    backgroundColor: '#133767',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f4f4f5',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f4f4f5',
    marginBottom: 2,
  },
  userRole: {
    fontSize: 11,
    fontWeight: '500',
    color: '#71717a',
  },
  statusIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  menuContainer: {
    flex: 1,
  },
  menuHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#71717a',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  scrollPaddingBottom: {
    paddingBottom: 20,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  itemInnerLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  menuItemActive: {
    backgroundColor: '#133767',
    borderColor: '#27272a',
  },
  menuLabel: {
    color: '#a1a1aa',
    fontSize: 13,
    fontWeight: '600',
  },
  menuLabelActive: {
    color: '#ffd27a',
    fontWeight: '700',
  },
  customMenuImageStyle: {
    width: 20,
    height: 20,
    borderRadius: 5,
    resizeMode: 'contain',
  },
  boldWeightText: {
    fontWeight: '900',
  },
  blueBrandingText: {
    color: '#38bdf8',
  },
  orangeBrandingText: {
    color: '#f97316',
  },
  submenuContainer: {
    flexDirection: 'column',
  },
  submenuChildrenBlock: {
    paddingLeft: 14,
    marginLeft: 10,
    borderLeftWidth: 1,
    borderLeftColor: '#27272a',
    marginTop: 2,
    marginBottom: 6,
    gap: 2,
  },
  childItemAdjustment: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 2,
  },
  childLabelText: {
    fontSize: 12,
    color: '#71717a',
    fontWeight: '500',
  },
  logoutSection: {
    borderTopWidth: 1,
    borderTopColor: '#27272a',
    paddingTop: 14,
    marginTop: 10,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  logoutLabel: {
    color: '#f87171',
    fontSize: 13,
    fontWeight: '600',
  },
});