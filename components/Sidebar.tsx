import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  TouchableWithoutFeedback,
  Modal,
  Platform,
} from 'react-native';
import { useWindowDimensions } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  LayoutDashboard,
  ClipboardList,
  Clock,
  MessageSquare,
  Calendar,
  User,
  Bell,
  LogOut,
  ChevronRight,
  X,
  Megaphone,
  Mail,
  DollarSign,
  ShoppingCart,
  Car,
  Bug,
  FileText,
  MapPin,
  Calendar1,
  Image,
  Book,
  Settings,
  Clock10,
  Settings2,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from '@/contexts/SidebarContext';

const SIDEBAR_WIDTH = 280;

interface MenuItem {
  icon: React.ComponentType<{ color: string; size: number }>;
  label: string;
  route: string;
}

const MENU_ITEMS: MenuItem[] = [
  { icon: Megaphone, label: 'Announcements', route: '/announcements' },
  { icon: Clock, label: 'Attendance', route: '/(tabs)/clock' },
  { label: 'Bug Reports',icon: Bug, route: '/(tabs)/bug'},
  { label: 'Company Information', icon: FileText, route: '/(tabs)/company-information'},
  { label: 'Daily Itinerary', route: '/(tabs)/itinerary', icon: MapPin },
  
  { icon: LayoutDashboard, label: 'Dashboard', route: '/(tabs)/home' },
  { icon: Mail, label: 'Email Settings', route: '/(tabs)/email-settings' },
  { icon: Calendar1, label: 'Event', route: '/(tabs)/event' },
  { icon: Image, label: 'Images', route: '/(tabs)/images' },
  { label: 'Leave Requests', route: '/(tabs)/leaverequest', icon: Calendar },
  { icon: MessageSquare, label: 'Messages', route: '/(tabs)/messages' },
  { label: 'My Notes', icon: Book, route: '/(tabs)/my-notes'},

  { icon: ClipboardList, label: 'My Tasks', route: '/(tabs)/tasks' },
  { icon: Bell, label: 'Notifications', route: '/(tabs)/notifications' },
  { icon: DollarSign, label: 'Payroll', route: '/(tabs)/payroll' },
  { icon: ClipboardList, label: 'Scrum Records', route: '/scrum-records' },
  { icon: ShoppingCart, label: 'Shopping Lists', route: '/(tabs)/shoppinglists' },
  { label: 'Theme Engine', route: '/(tabs)/theme-engine', icon: Settings },
  { label: 'Time Logs', route: '/(tabs)/time-logs', icon: Clock10 },
  { icon: Car, label: 'Travel Calendar', route: '/(tabs)/travelcalender' },
{ icon: Settings2, label: 'Setting', route: '/(tabs)/home' }
  /*{ icon: Calendar, label: 'Schedule', route: '/schedule' },
  { icon: User, label: 'Profile', route: '/(tabs)/profile' },*/
  
];

interface SidebarProps {
  isVisible?: boolean;
}

export default function Sidebar({ isVisible = true }: SidebarProps) {
  const { user, logout } = useAuth();
  const { isOpen, closeSidebar } = useSidebar();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;

  const effectiveWidth = Math.min(SIDEBAR_WIDTH, Math.max(240, Math.floor(width * 0.82)));
  const slideAnim = useRef(new Animated.Value(isLargeScreen ? 0 : -effectiveWidth)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isLargeScreen) {
      slideAnim.setValue(0);
      backdropAnim.setValue(0);
      return;
    }

    if (!mounted) return;

    if (isOpen) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -effectiveWidth,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isOpen, isLargeScreen, effectiveWidth, slideAnim, backdropAnim, mounted]);

  useEffect(() => {
    if (isLargeScreen) return;
    if (!isOpen) {
      slideAnim.setValue(-effectiveWidth);
    }
  }, [isLargeScreen, effectiveWidth, slideAnim, isOpen]);

  const handleNavigate = (route: string) => {
    if (!isLargeScreen) {
      closeSidebar();
    }
    setTimeout(() => {
      router.push(route as any);
    }, 100);
  };

  const handleLogout = () => {
    if (!isLargeScreen) closeSidebar();
    logout();
  };

  const isActiveRoute = (route: string) => {
    if (route === '/(tabs)/home' && (pathname === '/(tabs)/home' || pathname === '/')) {
      return true;
    }
    return pathname.startsWith(route.replace('/(tabs)', '')) || pathname === route;
  };

  const sidebarBody = (
    <View
      style={[
        styles.sidebar,
        {
          width: effectiveWidth,
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 16,
        },
      ]}
    >
      {/* Close Button - Only on mobile drawer */}
      {!isLargeScreen && (
        <TouchableOpacity
          style={styles.closeButton}
          onPress={closeSidebar}
          activeOpacity={0.7}
        >
          <View style={styles.closeButtonBg}>
            <X color="#f4f4f5" size={18} />
          </View>
        </TouchableOpacity>
      )}

      {/* Logo Section */}
      <View style={styles.logoSection}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>TaskManager</Text>
        </View>
        <Text style={styles.logoSubtitle}>Employee Portal</Text>
      </View>

      {/* User Card */}
      <View style={styles.userCard}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>
            {user?.fullName?.charAt(0)?.toUpperCase() ?? 'E'}
          </Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName} numberOfLines={1}>
            {user?.fullName ?? 'Employee'}
          </Text>
          <Text style={styles.userRole} numberOfLines={1}>
            {user?.jobTitle ?? 'Staff Member'}
          </Text>
        </View>
        <View style={styles.statusIndicator}>
          <View style={styles.statusDot} />
        </View>
      </View>

      {/* Navigation Menu */}
      <ScrollView style={styles.menuContainer} showsVerticalScrollIndicator={false}>
        <Text style={styles.menuHeader}>Main Menu</Text>
        
        {MENU_ITEMS.map((item,index) => {
          const isActive = isActiveRoute(item.route);
          const itemIconColor = isActive ? "#ffd27a" : "#a1a1aa";

          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.menuItem,
                isActive && styles.menuItemActive,
              ]}
              onPress={() => handleNavigate(item.route)}
              activeOpacity={0.8}
            >
              <View style={styles.itemInnerLeftGroup}>
                <item.icon color={itemIconColor} size={20} />
                <Text style={[
                  styles.menuLabel,
                  isActive && styles.menuLabelActive,
                ]}>
                  {item.label}
                </Text>
              </View>
              {isActive && (
                <ChevronRight color="#ffd27a" size={16} />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomSection}>
        <View style={styles.divider} />
        
        <TouchableOpacity
          style={styles.bottomItem}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <LogOut color="#ef4444" size={20} />
          <Text style={styles.logoutLabel}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (isLargeScreen) {
    return sidebarBody;
  }

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="none"
      onRequestClose={closeSidebar}
      statusBarTranslucent
    >
      <View style={styles.modalContainer}>
        {/* Backdrop */}
        <TouchableWithoutFeedback onPress={closeSidebar}>
          <Animated.View 
            style={[
              StyleSheet.absoluteFillObject,
              styles.backdrop,
              { opacity: backdropAnim }
            ]} 
          />
        </TouchableWithoutFeedback>

        {/* Sliding Sidebar Panel */}
        <Animated.View
          style={[
            styles.drawerPanel,
            {
              width: effectiveWidth,
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          {sidebarBody}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  drawerPanel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    zIndex: 10000,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    zIndex: 9998,
  },
  sidebar: {
    flex: 1,
    backgroundColor: '#133767',
    borderRightWidth: 1,
    borderRightColor: '#27272a',
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 16,
    zIndex: 10001,
  },
  closeButtonBg: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoSection: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
    marginBottom: 20,
  },
  logoContainer: {
    flexDirection: 'row',
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
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 14,
    marginBottom: 24,
    padding: 12,
    backgroundColor: '#133767',
    borderWidth: .1,
    borderColor: '#ffffffd7',
    borderRadius: 6,
    gap: 12,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth:1,
    borderColor:'#ffffff',
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
    paddingHorizontal: 14,
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
  menuItem: {
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
  bottomSection: {
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#27272a',
    marginBottom: 12,
  },
  bottomItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 6,
    gap: 12,
    marginBottom: 8,
  },
  logoutLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ef4444',
  },
});