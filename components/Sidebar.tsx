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
  Brain,
  ClipboardCheck,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { s, wp, hp, fs } from '@/util/styles';

const SIDEBAR_WIDTH = Math.min(320, wp(75));

interface MenuItem {
  icon: React.ComponentType<{ color: string; size: number }>;
  label: string;
  route: string;
}

const MENU_ITEMS: MenuItem[] = [
  { icon: Megaphone, label: 'Announcements', route: '/announcements' },
  { icon: Clock, label: 'Attendance', route: '/(tabs)/clock' },
  { label: 'Company Information', icon: FileText, route: '/(tabs)/company-information'},
  { label: 'Daily Itinerary', route: '/(tabs)/itinerary', icon: MapPin },
  { icon: LayoutDashboard, label: 'Dashboard', route: '/(tabs)/home' },
  { icon: Mail, label: 'Email Settings', route: '/(tabs)/email-settings' },
  { label: 'EOD Reports', route: '/(tabs)/eod-reports', icon: ClipboardCheck },
  { icon: Calendar1, label: 'Event', route: '/(tabs)/event' },
  { icon: Image, label: 'Images', route: '/(tabs)/images' },
  { label: 'Leave Requests', route: '/(tabs)/leaverequest', icon: Calendar }, 
  
  { icon: MessageSquare, label: 'Messages', route: '/(tabs)/messages' }, 
  { icon: ClipboardList, label: 'My Tasks', route: '/(tabs)/tasks' },
  { icon: Bell, label: 'Notifications', route: '/(tabs)/notifications' }, 
  { icon: DollarSign, label: 'Payroll', route: '/(tabs)/payroll' },
 { label: 'Personal Notes', route: '/(tabs)/knowledgehub', icon: Book },
  { icon: ClipboardList, label: 'Scrum Records', route: '/scrum-records' },
  { icon: ShoppingCart, label: 'Shopping Lists', route: '/(tabs)/shopping-lists' },
  { label: 'Theme Engine', route: '/(tabs)/theme-engine', icon: Settings },
  { label: 'Time Logs', route: '/(tabs)/time-logs', icon: Clock10 },
  { icon: Car, label: 'Travel Calendar', route: '/(tabs)/travelcalender' },
  { icon: Settings2, label: 'Setting', route: '/(tabs)/setting' }
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

  const effectiveWidth = Math.min(320, Math.max(240, Math.floor(width * 0.82)));
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
      style={s([
        styles.sidebar,
        {
          width: effectiveWidth,
          paddingTop: insets.top + hp(2),
          paddingBottom: insets.bottom + hp(2),
        },
      ])}
    >
      {!isLargeScreen && (
        <TouchableOpacity
          style={s(styles.closeButton)}
          onPress={closeSidebar}
          activeOpacity={0.7}
        >
          <View style={s(styles.closeButtonBg)}>
            <X color="#f4f4f5" size={fs(4.5)} />
          </View>
        </TouchableOpacity>
      )}

      <View style={s(styles.logoSection)}>
        <View style={s(styles.logoContainer)}>
          <Text style={s(styles.logoText)}>TaskManager</Text>
        </View>
        <Text style={s(styles.logoSubtitle)}>Employee Portal</Text>
      </View>

      <View style={s(styles.userCard)}>
        <View style={s(styles.avatarContainer)}>
          <Text style={s(styles.avatarText)}>
            {user?.fullName?.charAt(0)?.toUpperCase() ?? 'E'}
          </Text>
        </View>
        <View style={s(styles.userInfo)}>
          <Text style={s(styles.userName)} numberOfLines={1}>
            {user?.fullName ?? 'Employee'}
          </Text>
          <Text style={s(styles.userRole)} numberOfLines={1}>
            {user?.jobTitle ?? 'Staff Member'}
          </Text>
        </View>
        <View style={s(styles.statusIndicator)}>
          <View style={s(styles.statusDot)} />
        </View>
      </View>

      <ScrollView style={s(styles.menuContainer)} showsVerticalScrollIndicator={false}>
        <Text style={s(styles.menuHeader)}>Main Menu</Text>
        
        {MENU_ITEMS.map((item, index) => {
          const isActive = isActiveRoute(item.route);
          const itemIconColor = isActive ? "#ffd27a" : "#a1a1aa";

          return (
            <TouchableOpacity
              key={index}
              style={s([
                styles.menuItem,
                isActive && styles.menuItemActive,
              ])}
              onPress={() => handleNavigate(item.route)}
              activeOpacity={0.8}
            >
              <View style={s(styles.itemInnerLeftGroup)}>
                <item.icon color={itemIconColor} size={fs(4.8)} />
                <Text style={s([
                  styles.menuLabel,
                  isActive && styles.menuLabelActive,
                ])}>
                  {item.label}
                </Text>
              </View>
              {isActive && (
                <ChevronRight color="#ffd27a" size={fs(4)} />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={s(styles.bottomSection)}>
        <View style={s(styles.divider)} />
        
        <TouchableOpacity
          style={s(styles.bottomItem)}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <LogOut color="#ef4444" size={fs(4.8)} />
          <Text style={s(styles.logoutLabel)}>Sign Out</Text>
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
      <View style={s(styles.modalContainer)}>
        <TouchableWithoutFeedback onPress={closeSidebar}>
          <Animated.View 
            style={[
              StyleSheet.absoluteFillObject,
              styles.backdrop,
              { opacity: backdropAnim }
            ]} 
          />
        </TouchableWithoutFeedback>

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
    top: hp(2.2),
    right: wp(4),
    zIndex: 10001,
  },
  closeButtonBg: {
    width: wp(8),
    height: wp(8),
    borderRadius: wp(1.8),
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoSection: {
    paddingHorizontal: wp(5),
    paddingBottom: hp(1.8),
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
    marginBottom: hp(2.5),
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(3),
  },
  logoText: {
    fontSize: fs(4.2),
    fontWeight: '800',
    color: '#f4f4f5',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  logoSubtitle: {
    fontSize: fs(3),
    fontWeight: '500',
    color: '#71717a',
    marginTop: 2,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: wp(3.5),
    marginBottom: hp(2.8),
    padding: wp(3),
    backgroundColor: '#133767',
    borderWidth: 0.5,
    borderColor: '#ffffffd7',
    borderRadius: wp(2),
    gap: wp(3),
  },
  avatarContainer: {
    width: wp(10),
    height: wp(10),
    borderRadius: wp(5),
    borderWidth: 1,
    borderColor: '#ffffff',
    backgroundColor: '#133767',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: fs(4),
    fontWeight: '700',
    color: '#f4f4f5',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: fs(3.5),
    fontWeight: '700',
    color: '#f4f4f5',
    marginBottom: 2,
  },
  userRole: {
    fontSize: fs(2.8),
    fontWeight: '500',
    color: '#71717a',
  },
  statusIndicator: {
    width: wp(6),
    height: wp(6),
    borderRadius: wp(3),
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    width: wp(2.2),
    height: wp(2.2),
    borderRadius: wp(1.1),
    backgroundColor: '#10b981',
  },
  menuContainer: {
    flex: 1,
    paddingHorizontal: wp(3.5),
  },
  menuHeader: {
    fontSize: fs(2.8),
    fontWeight: '700',
    color: '#71717a',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: hp(1.5),
    paddingHorizontal: wp(1),
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: hp(1.3),
    paddingHorizontal: wp(3),
    borderRadius: wp(1.8),
    marginBottom: hp(0.5),
    borderWidth: 1,
    borderColor: 'transparent',
  },
  itemInnerLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(3),
    flex: 1,
  },
  menuItemActive: {
    backgroundColor: '#133767',
    borderColor: '#27272a',
  },
  menuLabel: {
    color: '#a1a1aa',
    fontSize: fs(3.3),
    fontWeight: '600',
  },
  menuLabelActive: {
    color: '#ffd27a',
    fontWeight: '700',
  },
  bottomSection: {
    paddingHorizontal: wp(3.5),
    paddingTop: hp(1),
  },
  divider: {
    height: 1,
    backgroundColor: '#27272a',
    marginBottom: hp(1.5),
  },
  bottomItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(3),
    paddingVertical: hp(1.3),
    borderRadius: wp(1.8),
    gap: wp(3),
    marginBottom: hp(1),
  },
  logoutLabel: {
    fontSize: fs(3.3),
    fontWeight: '600',
    color: '#ef4444',
  },
});