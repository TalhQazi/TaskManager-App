import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ClipboardList,
  Calendar,
  User,
  Bell,
  LogOut,
  ChevronRight,
  X,
  LayoutDashboard,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useSidebar } from '@/contexts/SidebarContext';
import { useAuth } from '@/contexts/AuthContext';

const SIDEBAR_WIDTH = 290;

interface MenuItem {
  icon: React.ComponentType<{ color: string; size: number }>;
  label: string;
  route: string;
  color: string;
  description: string;
}

const MENU_ITEMS: MenuItem[] = [
  {
    icon: ClipboardList,
    label: 'My Tasks',
    route: '/(tabs)/tasks',
    color: Colors.warning,
    description: 'View assigned tasks',
  },
  {
    icon: Calendar,
    label: 'Schedule',
    route: '/schedule',
    color: Colors.secondary,
    description: 'Upcoming shifts',
  },
  {
    icon: User,
    label: 'Profile',
    route: '/(tabs)/profile',
    color: Colors.primary,
    description: 'Account & settings',
  },
  {
    icon: Bell,
    label: 'Notifications',
    route: '/notifications',
    color: '#8B5CF6',
    description: 'Alerts & updates',
  },
];

export default function Sidebar() {
  const { isOpen, closeSidebar } = useSidebar();
  const { user, logout } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isOpen) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 68,
          friction: 12,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 260,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -SIDEBAR_WIDTH,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isOpen, slideAnim, backdropAnim]);

  const handleNavigate = (route: string) => {
    closeSidebar();
    setTimeout(() => {
      router.push(route as any);
    }, 150);
  };

  const handleLogout = () => {
    closeSidebar();
    setTimeout(() => {
      logout();
    }, 300);
  };

  return (
    <View
      style={StyleSheet.absoluteFillObject}
      pointerEvents={isOpen ? 'auto' : 'none'}
    >
      <TouchableWithoutFeedback onPress={closeSidebar}>
        <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]} />
      </TouchableWithoutFeedback>

      <Animated.View
        style={[
          styles.sidebar,
          {
            transform: [{ translateX: slideAnim }],
            paddingTop: insets.top + 8,
            paddingBottom: insets.bottom + 20,
          },
        ]}
      >
        <TouchableOpacity style={styles.closeBtn} onPress={closeSidebar} activeOpacity={0.7}>
          <X color={Colors.textSecondary} size={18} />
        </TouchableOpacity>

        <View style={styles.userSection}>
          {user?.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>{user?.fullName?.charAt(0) ?? 'E'}</Text>
            </View>
          )}
          <Text style={styles.userName} numberOfLines={1}>
            {user?.fullName ?? 'Employee'}
          </Text>
          <Text style={styles.userJobTitle} numberOfLines={1}>
            {user?.jobTitle ?? ''}
          </Text>
          <View style={styles.companyPill}>
            <View style={styles.activeDot} />
            <Text style={styles.companyText} numberOfLines={1}>
              {user?.company ?? ''}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.menuSection}>
          <Text style={styles.menuSectionLabel}>NAVIGATION</Text>
          {MENU_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={styles.menuItem}
              onPress={() => handleNavigate(item.route)}
              activeOpacity={0.7}
              testID={`sidebar-${item.label.toLowerCase().replace(' ', '-')}`}
            >
              <View style={[styles.menuIconWrap, { backgroundColor: `${item.color}18` }]}>
                <item.icon color={item.color} size={20} />
              </View>
              <View style={styles.menuTextBlock}>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Text style={styles.menuDesc}>{item.description}</Text>
              </View>
              <ChevronRight color={Colors.textTertiary} size={15} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.bottomSection}>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.logoutItem}
            onPress={handleLogout}
            activeOpacity={0.7}
            testID="sidebar-logout"
          >
            <View style={[styles.menuIconWrap, { backgroundColor: Colors.errorLight }]}>
              <LogOut color={Colors.error} size={20} />
            </View>
            <Text style={styles.logoutLabel}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.52)',
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: Colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 24,
  },
  closeBtn: {
    alignSelf: 'flex-end',
    marginRight: 16,
    marginBottom: 8,
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'flex-start',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 12,
    borderWidth: 2.5,
    borderColor: Colors.primary,
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.infoLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 2.5,
    borderColor: Colors.primary,
  },
  avatarInitial: {
    fontSize: 26,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  userJobTitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 10,
    fontWeight: '500' as const,
  },
  companyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
  },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Colors.clockedIn,
  },
  companyText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.clockedIn,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginHorizontal: 20,
    marginVertical: 8,
  },
  menuSection: {
    flex: 1,
    paddingTop: 8,
  },
  menuSectionLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.textTertiary,
    letterSpacing: 1.2,
    paddingHorizontal: 20,
    marginBottom: 6,
    marginTop: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 11,
    marginHorizontal: 8,
    borderRadius: 14,
    gap: 12,
    marginBottom: 2,
  },
  menuIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTextBlock: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  menuDesc: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 1,
  },
  bottomSection: {
    paddingTop: 8,
  },
  logoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 8,
    borderRadius: 14,
    gap: 12,
    marginTop: 4,
  },
  logoutLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.error,
  },
});
