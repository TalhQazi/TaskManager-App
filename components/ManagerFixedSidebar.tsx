import React, { useRef, useState, useMemo, useEffect } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';

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
  Book,
} from 'lucide-react-native';

import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { apiRequest } from '@/services/api';
import { s } from '@/util/styles';
import { toProxiedUrl, initToken } from '@/util/toProxiedUrl';

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

interface EmployeeMeResponse {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  current_status?: string;
  role?: string;
}

/**
 * Bulletproof Image URL Converter
 * Converts `/uploads/xxx.png` -> `https://task.se7eninc.com/api/s3-proxy/xxx.png?token=...`
 */
const getDisplayImageUrl = (rawPath?: string | null, activeToken?: string | null) => {
  if (!rawPath || typeof rawPath !== 'string' || !rawPath.trim()) return null;

  if (rawPath.startsWith('data:') || rawPath.startsWith('file://') || rawPath.startsWith('content://')) {
    return rawPath;
  }

  let path = rawPath.trim();

  if (path.includes('token=')) return path;

  // Map /uploads/ or uploads/ -> /api/s3-proxy/
  if (path.startsWith('/uploads/')) {
    path = path.replace('/uploads/', '/api/s3-proxy/');
  } else if (path.startsWith('uploads/')) {
    path = path.replace('uploads/', '/api/s3-proxy/');
  } else if (!path.startsWith('/api/s3-proxy/') && !path.startsWith('http')) {
    path = `/api/s3-proxy/${path.replace(/^\//, '')}`;
  }

  if (!path.startsWith('http://') && !path.startsWith('https://')) {
    path = `https://task.se7eninc.com${path.startsWith('/') ? path : `/${path}`}`;
  }

  try {
    const proxied = toProxiedUrl(path);
    if (proxied && proxied.includes('token=')) {
      return proxied;
    }
  } catch (e) {
    // Fall back to manual token attachment
  }

  if (activeToken) {
    const separator = path.includes('?') ? '&' : '?';
    return `${path}${separator}token=${activeToken}`;
  }

  return path;
};

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
  { key: 'appliances', label: 'Personal Notes', path: '/(manager)/knowledgehub', icon: Book },
  { key: 'profile', label: 'Profile', path: '/(manager)/profile', icon: User },
  { key: 'eodReports', label: 'EOD Reports', path: '/(manager)/eod-reports', icon: ClipboardCheck },
  { key: 'leaveRequests', label: 'Leave Requests', path: '/(manager)/leave-requests', icon: Calendar },
  { key: 'travelCalendar', label: 'Travel Calendar', path: '/(manager)/travel-calendar', icon: Calendar },
  { key: 'vehicles', label: 'Vehicles', path: '/(manager)/vehicles', icon: Car },
  { key: 'appliance', label: 'Inventory/Appliances', path: '/(manager)/appliances', icon: Wrench },
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
  { key: 'contracts', label: 'SignaCore', path: '/(manager)/contracts', isCustomImage: true, imageSource: '/uploads/asset-library/signacore.png' },
  { key: 'uphMaintenance', label: 'Atlas Properties', path: '/(manager)/uph-maintenance', isCustomImage: true, imageSource: '/uploads/asset-library/atlas.png' },
];

function buildColors(uiTheme: any) {
  const isDark = uiTheme.theme !== 'crystal-white';
  return {
    background: uiTheme.panelColors?.dashboardBackground || (isDark ? '#133767' : '#ffffff'),
    cardBg: uiTheme.panelColors?.dashboardCardBackground || (isDark ? '#0f2d55' : '#f1f5f9'),
    text: uiTheme.panelColors?.dashboardTextColor || (isDark ? '#f4f4f5' : '#000000'),
    textSecondary: isDark ? '#a1a1aa' : '#475569',
    border: isDark ? '#27272a' : 'rgba(0, 0, 0, 0.08)',
    primary: uiTheme.customColors?.primary || '#ffd27a',
    danger: '#f87171',
    overlay: 'rgba(0,0,0,0.5)',
  };
}

function createStyles(colors: ReturnType<typeof buildColors>) {
  return StyleSheet.create({
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.overlay,
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
      backgroundColor: colors.background,
      paddingHorizontal: 14,
      borderRightWidth: 1,
      borderRightColor: colors.border,
    },
    logoSection: {
      paddingHorizontal: 4,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
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
      color: colors.text,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    logoSubtitle: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.textSecondary,
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
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 6,
      gap: 12,
    },
    avatarContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.text,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    avatarImage: {
      width: '100%',
      height: '100%',
      borderRadius: 20,
    },
    avatarText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    userInfo: {
      flex: 1,
    },
    userName: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 2,
    },
    userRole: {
      fontSize: 11,
      fontWeight: '500',
      color: colors.textSecondary,
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
      color: colors.textSecondary,
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
      backgroundColor: colors.cardBg,
      borderColor: colors.border,
    },
    menuLabel: {
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: '600',
    },
    menuLabelActive: {
      color: colors.primary,
      fontWeight: '700',
    },
    customMenuImageStyle: {
      width: 20,
      height: 20,
      borderRadius: 4,
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
      borderLeftColor: colors.border,
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
      color: colors.textSecondary,
      fontWeight: '500',
    },
    logoutSection: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
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
      color: colors.danger,
      fontSize: 13,
      fontWeight: '600',
    },
  });
}

export default function ManagerFixedSidebar({ isOpen, onClose }: any) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { uiTheme } = useTheme();
  const colors = useMemo(() => buildColors(uiTheme), [uiTheme]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [jwtToken, setJwtToken] = useState<string | null>(null);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});
  const [imageErrorKeys, setImageErrorKeys] = useState<Record<string, boolean>>({});
  const [avatarError, setAvatarError] = useState(false);

  const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Retrieve JWT Token
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        await initToken();
        let token =
          (user as any)?.token ||
          (user as any)?.accessToken ||
          (user as any)?.jwt;

        if (!token) {
          const keys = await AsyncStorage.getAllKeys();
          const possibleTokenKeys = keys.filter((k) =>
            /token|jwt|auth|session/i.test(k)
          );
          for (const key of possibleTokenKeys) {
            const val = await AsyncStorage.getItem(key);
            if (val && typeof val === 'string' && val.length > 10) {
              token = val;
              break;
            }
          }
        }

        if (isMounted && token) {
          setJwtToken(token);
        }
      } catch (err) {
        console.error('Failed to load token in sidebar:', err);
      }
    })();

    return () => { isMounted = false; };
  }, [user]);

  // Fetch employee profile data
  const { data: employeeStatus } = useQuery<EmployeeMeResponse | null>({
    queryKey: ['managerEmployeeStatus'],
    queryFn: async () => {
      try {
        const res = await apiRequest<{ item: EmployeeMeResponse }>('/employees/me');
        return res.data?.item || null;
      } catch (e) {
        return null;
      }
    },
    enabled: isOpen,
  });

  // Fetch user settings
  const { data: userSettings } = useQuery<any>({
    queryKey: ['userSettings'],
    queryFn: async () => {
      try {
        const res = await apiRequest<any>('/settings');
        return res.data?.item || res.data || null;
      } catch (e) {
        return null;
      }
    },
    enabled: isOpen,
  });

  // Resolve raw avatar path across all endpoints
  const rawAvatarPath = useMemo(() => {
    return (
      userSettings?.avatarDataUrl ||
      userSettings?.avatarUrl ||
      employeeStatus?.avatarUrl ||
      (user as any)?.avatarUrl ||
      (user as any)?.avatarDataUrl ||
      null
    );
  }, [userSettings, employeeStatus, user]);

  const userAvatarUri = useMemo(() => {
    return getDisplayImageUrl(rawAvatarPath, jwtToken);
  }, [rawAvatarPath, jwtToken]);

  useEffect(() => {
    setAvatarError(false);
  }, [userAvatarUri]);

  const items = useMemo(() => {
    return [...baseItems].sort((a, b) => {
      if (a.key === 'dashboard') return -1;
      if (b.key === 'dashboard') return 1;
      return a.label.localeCompare(b.label);
    });
  }, []);

  useEffect(() => {
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
    if (item.children) {
      const isExpanded = expandedMenus[item.key] ?? false;
      const hasActiveChild = item.children.some((child) => child.path && isActiveRoute(child.path));
      const rowActive = hasActiveChild || isExpanded;
      const parentIconColor = rowActive ? colors.primary : colors.textSecondary;
      const chevronColor = rowActive ? colors.primary : colors.textSecondary;

      return (
        <View key={item.key} style={s(styles.submenuContainer)}>
          <TouchableOpacity
            style={s([styles.item, rowActive && styles.menuItemActive])}
            onPress={() => toggleMenu(item.key)}
          >
            <View style={s(styles.itemInnerLeftGroup)}>
              {item.icon && <item.icon color={parentIconColor} size={20} />}
              <Text style={s([styles.menuLabel, rowActive && styles.menuLabelActive])}>{item.label}</Text>
            </View>
            {isExpanded ? (
              <ChevronDown color={chevronColor} size={16} />
            ) : (
              <ChevronRight color={chevronColor} size={16} />
            )}
          </TouchableOpacity>

          {isExpanded && (
            <View style={s(styles.submenuChildrenBlock)}>
              {item.children.map((child) => renderItemRow(child, true))}
            </View>
          )}
        </View>
      );
    }

    const active = item.path ? isActiveRoute(item.path) : false;
    const itemIconColor = active ? colors.primary : colors.textSecondary;

    const customImageUri = item.isCustomImage ? getDisplayImageUrl(item.imageSource, jwtToken) : null;
    const hasImageError = imageErrorKeys[item.key];

    return (
      <TouchableOpacity
        key={item.key}
        style={s([
          styles.item,
          isChild && styles.childItemAdjustment,
          active && styles.menuItemActive,
        ])}
        onPress={() => item.path && navigate(item.path)}
      >
        <View style={s(styles.itemInnerLeftGroup)}>
          {item.isCustomImage && customImageUri && !hasImageError ? (
            <Image
              source={{ uri: customImageUri }}
              style={s(styles.customMenuImageStyle)}
              resizeMode="contain"
              onError={() => setImageErrorKeys((prev) => ({ ...prev, [item.key]: true }))}
            />
          ) : (
            item.icon && <item.icon color={itemIconColor} size={isChild ? 16 : 20} />
          )}

          {item.label === 'SignaCore' ? (
            <Text style={s([styles.menuLabel, styles.boldWeightText, active && styles.menuLabelActive])}>
              <Text style={s(styles.blueBrandingText)}>Signa</Text>
              <Text style={s(styles.orangeBrandingText)}>Core</Text>
            </Text>
          ) : (
            <Text
              style={s([
                styles.menuLabel,
                isChild && styles.childLabelText,
                active && styles.menuLabelActive,
              ])}
            >
              {item.label}
            </Text>
          )}
        </View>
        {active && !isChild && <ChevronRight color={colors.primary} size={16} />}
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={isOpen} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={s([styles.backdrop, { opacity: fadeAnim }])} />
      </TouchableWithoutFeedback>

      <Animated.View style={s([styles.drawer, { transform: [{ translateX: slideAnim }] }])}>
        <View
          style={s([
            styles.container,
            {
              paddingTop: Platform.OS === 'ios' ? insets.top + 10 : insets.top + 16,
              paddingBottom: insets.bottom + 16,
            },
          ])}
        >
          <View style={s(styles.logoSection)}>
            <View style={s(styles.logoContainer)}>
              <Text style={s(styles.logoText)}>TaskManager</Text>
              <TouchableOpacity onPress={onClose} style={s(styles.closeTouchArea)}>
                <ChevronLeft color={colors.text} size={24} />
              </TouchableOpacity>
            </View>
            <Text style={s(styles.logoSubtitle)}>Manager Dashboard</Text>
          </View>

          <View style={s(styles.userCard)}>
            <View style={s(styles.avatarContainer)}>
              {userAvatarUri && !avatarError ? (
                <Image
                  source={{ uri: userAvatarUri }}
                  style={s(styles.avatarImage)}
                  resizeMode="cover"
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <Text style={s(styles.avatarText)}>
                  {(employeeStatus?.name || user?.fullName || 'M').charAt(0).toUpperCase()}
                </Text>
              )}
            </View>
            <View style={s(styles.userInfo)}>
              <Text style={s(styles.userName)} numberOfLines={1}>
                {employeeStatus?.name || user?.fullName || 'Manager'}
              </Text>
              <Text style={s(styles.userRole)} numberOfLines={1}>
                {(employeeStatus?.role || user?.jobTitle || 'Administrator').toUpperCase()}
              </Text>
            </View>
            <View style={s(styles.statusIndicator)}>
              <View style={s(styles.statusDot)} />
            </View>
          </View>

          <ScrollView style={s(styles.menuContainer)} showsVerticalScrollIndicator={false} contentContainerStyle={s(styles.scrollPaddingBottom)}>
            <Text style={s(styles.menuHeader)}>Main Menu</Text>
            {items.map((item) => renderItemRow(item))}
          </ScrollView>

          <View style={s(styles.logoutSection)}>
            <TouchableOpacity style={s(styles.logoutButton)} onPress={handleLogout}>
              <LogOut color={colors.danger} size={20} />
              <Text style={s(styles.logoutLabel)}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}