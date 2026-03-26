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
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from '@/contexts/SidebarContext';

const SIDEBAR_WIDTH = 280;

interface MenuItem {
  icon: React.ComponentType<{ color: string; size: number }>;
  label: string;
  route: string;
  color: string;
}

const MENU_ITEMS: MenuItem[] = [
  {
    icon: LayoutDashboard,
    label: 'Dashboard',
    route: '/(tabs)/home',
    color: Colors.primary,
  },
  {
    icon: ClipboardList,
    label: 'My Tasks',
    route: '/(tabs)/tasks',
    color: Colors.warning,
  },
  {
    icon: Clock,
    label: 'Clock In',
    route: '/(tabs)/clock',
    color: Colors.success,
  },
  {
    icon: MessageSquare,
    label: 'Messages',
    route: '/(tabs)/messages',
    color: Colors.secondary,
  },
  {
    icon: Calendar,
    label: 'Schedule',
    route: '/schedule',
    color: '#8B5CF6',
  },
  {
    icon: User,
    label: 'Profile',
    route: '/(tabs)/profile',
    color: '#F97316',
  },
  {
    icon: Bell,
    label: 'Notifications',
    route: '/notifications',
    color: '#EC4899',
  },
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
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -effectiveWidth,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 200,
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
            <X color={Colors.textSecondary} size={20} />
          </View>
        </TouchableOpacity>
      )}

      {/* Logo Section */}
      <View style={styles.logoSection}>
        <View style={styles.logoContainer}>
          <View style={styles.logoIcon}>
            <LayoutDashboard color="#FFFFFF" size={24} />
          </View>
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
        <Text style={styles.menuHeader}>MAIN MENU</Text>
        
        {MENU_ITEMS.map((item) => {
          const isActive = isActiveRoute(item.route);
          return (
            <TouchableOpacity
              key={item.label}
              style={[
                styles.menuItem,
                isActive && styles.menuItemActive,
              ]}
              onPress={() => handleNavigate(item.route)}
              activeOpacity={0.8}
            >
              <View style={[
                styles.iconContainer,
                isActive && { backgroundColor: `${item.color}20` },
                !isActive && { backgroundColor: `${item.color}12` },
              ]}>
                <item.icon 
                  color={isActive ? item.color : Colors.textSecondary} 
                  size={20} 
                />
              </View>
              <Text style={[
                styles.menuLabel,
                isActive && styles.menuLabelActive,
              ]}>
                {item.label}
              </Text>
              {isActive && (
                <View style={styles.activeIndicator}>
                  <ChevronRight color={item.color} size={16} />
                </View>
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
          <View style={[styles.iconContainer, { backgroundColor: `${Colors.error}12` }]}>
            <LogOut color={Colors.error} size={20} />
          </View>
          <Text style={styles.logoutLabel}>Sign Out</Text>
        </TouchableOpacity>

      </View>
    </View>
  );

  // Large screen - permanent sidebar
  if (isLargeScreen) {
    return sidebarBody;
  }

  // Mobile drawer using Modal for proper full-screen overlay
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
    elevation: 10000,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    zIndex: 9998,
  },
  sidebar: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 16,
    zIndex: 10001,
  },
  closeButtonBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  logoText: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  logoSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textTertiary,
    marginTop: 2,
    marginLeft: 56,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 14,
    backgroundColor: Colors.infoLight,
    borderRadius: 16,
    gap: 12,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 2,
  },
  userRole: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  statusIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.success,
  },
  menuContainer: {
    flex: 1,
    paddingHorizontal: 12,
  },
  menuHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textTertiary,
    letterSpacing: 1.5,
    marginBottom: 12,
    marginLeft: 8,
    marginTop: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 4,
    borderRadius: 14,
    gap: 12,
  },
  menuItemActive: {
    backgroundColor: Colors.infoLight,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  menuLabelActive: {
    color: Colors.text,
    fontWeight: '700',
  },
  activeIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  bottomSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginBottom: 12,
  },
  bottomItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 12,
    marginBottom: 8,
  },
  logoutLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.error,
  },
  versionText: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: 8,
  },
});
