import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Animated,
  TouchableWithoutFeedback,
  Modal,
  Image,
  useWindowDimensions,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  LayoutDashboard,
  ClipboardList,
  Clock,
  MessageSquare,
  Calendar,
  Bell,
  LogOut,
  X,
  Megaphone,
  Mail,
  DollarSign,
  ShoppingCart,
  Car,
  FileText,
  MapPin,
  Calendar1,
  Image as ImageIcon,
  Book,
  Settings,
  Settings2,
  ClipboardCheck,
  Timer,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { useTokens } from '@/contexts/ThemeContext';
import { apiRequest } from '@/services/api';
import { toProxiedUrl, initToken } from '@/util/toProxiedUrl';
import { useQuery } from '@tanstack/react-query';
import { MIN_TOUCH } from '@/constants/design/tokens';

interface MenuItem {
  icon: React.ComponentType<{ color: string; size: number }>;
  label: string;
  route: string;
}

interface MenuSection {
  heading: string;
  items: MenuItem[];
}

/**
 * Navigation, grouped by what the user is trying to do.
 *
 * These were previously 21 items in one flat alphabetical list, which put "Announcements"
 * above "Dashboard" and buried "My Tasks" in the middle. Every route is preserved exactly
 * as it was — only the ordering and grouping changed.
 */
const MENU_SECTIONS: MenuSection[] = [
  {
    heading: 'Workspace',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', route: '/(tabs)/home' },
      { icon: ClipboardList, label: 'My Tasks', route: '/(tabs)/tasks' },
      { icon: MessageSquare, label: 'Messages', route: '/(tabs)/messages' },
      { icon: Bell, label: 'Notifications', route: '/(tabs)/notifications' },
    ],
  },
  {
    heading: 'Time & Attendance',
    items: [
      { icon: Clock, label: 'Attendance', route: '/(tabs)/clock' },
      { icon: Timer, label: 'Time Logs', route: '/(tabs)/time-logs' },
      { icon: Calendar, label: 'Leave Requests', route: '/(tabs)/leaverequest' },
      { icon: ClipboardCheck, label: 'EOD Reports', route: '/(tabs)/eod-reports' },
      { icon: ClipboardList, label: 'Scrum Records', route: '/scrum-records' },
    ],
  },
  {
    heading: 'Workplace',
    items: [
      { icon: Megaphone, label: 'Announcements', route: '/announcements' },
      { icon: Calendar1, label: 'Event', route: '/(tabs)/event' },
      { icon: MapPin, label: 'Daily Itinerary', route: '/(tabs)/itinerary' },
      { icon: Car, label: 'Travel Calendar', route: '/(tabs)/travelcalender' },
      { icon: ShoppingCart, label: 'Shopping Lists', route: '/(tabs)/shopping-lists' },
      { icon: ImageIcon, label: 'Images', route: '/(tabs)/images' },
    ],
  },
  {
    heading: 'Resources',
    items: [
      { icon: FileText, label: 'Company Information', route: '/(tabs)/company-information' },
      { icon: Book, label: 'Personal Notes', route: '/(tabs)/knowledgehub' },
      { icon: DollarSign, label: 'Payroll', route: '/(tabs)/payroll' },
    ],
  },
  {
    heading: 'Settings',
    items: [
      { icon: Mail, label: 'Email Settings', route: '/(tabs)/email-settings' },
      { icon: Settings, label: 'Theme Engine', route: '/(tabs)/theme-engine' },
      { icon: Settings2, label: 'Setting', route: '/(tabs)/setting' },
    ],
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
  const t = useTokens();

  const [jwtToken, setJwtToken] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    (async () => {
      const token = await initToken();
      setJwtToken(token);
    })();
  }, []);

  const { data: userSettings } = useQuery({
    queryKey: ['userSettings'],
    queryFn: async () => {
      try {
        const res = await apiRequest<any>('/settings');
        return res.data?.item || res.data || null;
      } catch {
        return null;
      }
    },
  });

  const rawAvatarPath = useMemo(() => {
    return (
      userSettings?.item?.avatarDataUrl ||
      userSettings?.item?.avatarUrl ||
      userSettings?.item?.avatar ||
      userSettings?.item?.photo ||
      userSettings?.item?.profilePicture ||
      userSettings?.avatarDataUrl ||
      userSettings?.avatarUrl ||
      userSettings?.avatar ||
      userSettings?.photo ||
      userSettings?.profilePicture ||
      user?.avatarUrl ||
      (user as any)?.avatarDataUrl ||
      (user as any)?.avatar ||
      (user as any)?.photo ||
      (user as any)?.profilePicture ||
      (user as any)?.image ||
      null
    );
  }, [userSettings, user]);

  const resolvedAvatarUri = useMemo(() => {
    return toProxiedUrl(rawAvatarPath, jwtToken);
  }, [rawAvatarPath, jwtToken]);

  useEffect(() => {
    setAvatarError(false);
  }, [resolvedAvatarUri]);

  const effectiveWidth = Math.min(320, Math.max(260, Math.floor(width * 0.82)));
  const slideAnim = useRef(new Animated.Value(-effectiveWidth)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    if (isOpen) {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: -effectiveWidth, duration: 180, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [isOpen, effectiveWidth, slideAnim, backdropAnim, mounted]);

  const handleNavigate = (route: string) => {
    closeSidebar();
    setTimeout(() => {
      router.push(route as any);
    }, 100);
  };

  const handleLogout = () => {
    closeSidebar();
    logout();
  };

  /**
   * Matches on a full path segment rather than a bare prefix. The old check used
   * `pathname.startsWith(route)`, which lit up "Time Logs" for any path merely beginning
   * with `/time-log`.
   */
  const isActiveRoute = (route: string) => {
    const target = route.replace('/(tabs)', '') || '/';
    if (target === '/home' && (pathname === '/home' || pathname === '/')) return true;
    return pathname === target || pathname === route || pathname.startsWith(`${target}/`);
  };

  const initial = user?.fullName?.charAt(0)?.toUpperCase() ?? 'E';

  const sidebarBody = (
    <View
      style={[
        styles.sidebar,
        {
          width: effectiveWidth,
          backgroundColor: t.color.surface,
          borderRightColor: t.color.border,
          paddingTop: insets.top + t.space.md,
          paddingBottom: insets.bottom + t.space.md,
        },
      ]}
    >
      <View style={[styles.brandRow, { paddingHorizontal: t.space.lg, paddingBottom: t.space.md }]}>
        <View style={styles.flex}>
          <Text style={[t.type.sectionTitle, { color: t.color.text }]} numberOfLines={1}>
            TaskManager
          </Text>
          <Text style={[t.type.meta, { color: t.color.textTertiary, marginTop: 1 }]}>Employee Portal</Text>
        </View>
        <Pressable
          onPress={closeSidebar}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Close navigation menu"
          style={({ pressed }) => [
            styles.closeBtn,
            { borderRadius: t.radius.md, backgroundColor: t.color.surfaceSunken },
            pressed && { opacity: 0.6 },
          ]}
        >
          <X color={t.color.textSecondary} size={19} />
        </Pressable>
      </View>

      <Pressable
        onPress={() => handleNavigate('/(tabs)/profile')}
        accessibilityRole="button"
        accessibilityLabel={`${user?.fullName ?? 'Employee'}, open profile`}
        style={({ pressed }) => [
          styles.userCard,
          {
            marginHorizontal: t.space.md,
            marginBottom: t.space.lg,
            padding: t.space.md,
            backgroundColor: t.color.surfaceSunken,
            borderColor: t.color.border,
            borderRadius: t.radius.lg,
          },
          pressed && { backgroundColor: t.color.surfaceActive },
        ]}
      >
        <View
          style={[
            styles.avatar,
            { backgroundColor: t.color.primarySoft, borderColor: t.color.primaryBorder },
          ]}
        >
          {resolvedAvatarUri && !avatarError ? (
            <Image
              source={{ uri: resolvedAvatarUri }}
              style={styles.avatarImage}
              resizeMode="cover"
              onError={() => setAvatarError(true)}
            />
          ) : (
            <Text style={[styles.avatarText, { color: t.color.primary }]}>{initial}</Text>
          )}
        </View>
        <View style={styles.flex}>
          <Text style={[t.type.cardTitle, { color: t.color.text }]} numberOfLines={1}>
            {user?.fullName ?? 'Employee'}
          </Text>
          <Text style={[t.type.caption, { color: t.color.textSecondary }]} numberOfLines={1}>
            {user?.jobTitle ?? 'Staff Member'}
          </Text>
        </View>
        <View style={[styles.statusDot, { backgroundColor: t.color.success }]} />
      </Pressable>

      <ScrollView
        style={[styles.menu, { paddingHorizontal: t.space.md }]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: t.space.lg }}
      >
        {MENU_SECTIONS.map((section) => (
          <View key={section.heading} style={{ marginBottom: t.space.lg }}>
            <Text
              style={[
                t.type.meta,
                { color: t.color.textTertiary, marginBottom: 6, paddingHorizontal: t.space.sm, letterSpacing: 0.6 },
              ]}
            >
              {section.heading.toUpperCase()}
            </Text>

            {section.items.map((item) => {
              const isActive = isActiveRoute(item.route);
              const fg = isActive ? t.color.primary : t.color.textSecondary;

              return (
                <Pressable
                  key={item.route}
                  onPress={() => handleNavigate(item.route)}
                  accessibilityRole="link"
                  accessibilityLabel={item.label}
                  accessibilityState={{ selected: isActive }}
                  style={({ pressed }) => [
                    styles.menuItem,
                    { borderRadius: t.radius.md, paddingHorizontal: t.space.sm },
                    // The previous active style used the same colour as the sidebar
                    // background, making the current page effectively unmarked.
                    isActive && { backgroundColor: t.color.primarySoft },
                    pressed && !isActive && { backgroundColor: t.color.surfaceActive },
                  ]}
                >
                  {/* Colour alone can't carry the active state on the greyscale presets. */}
                  <View
                    style={[
                      styles.activeBar,
                      { backgroundColor: isActive ? t.color.primary : 'transparent' },
                    ]}
                  />
                  <item.icon color={fg} size={19} />
                  <Text
                    style={[
                      t.type.body,
                      { color: isActive ? t.color.primary : t.color.text, fontWeight: isActive ? '700' : '500', flex: 1 },
                    ]}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </ScrollView>

      <View style={[styles.bottom, { paddingHorizontal: t.space.md, borderTopColor: t.color.border }]}>
        <Pressable
          onPress={handleLogout}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          style={({ pressed }) => [
            styles.menuItem,
            { borderRadius: t.radius.md, paddingHorizontal: t.space.sm, marginTop: t.space.md },
            pressed && { backgroundColor: t.color.dangerSoft },
          ]}
        >
          <View style={styles.activeBar} />
          <LogOut color={t.color.danger} size={19} />
          <Text style={[t.type.body, { color: t.color.danger, fontWeight: '600' }]}>Sign Out</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="none"
      onRequestClose={closeSidebar}
      statusBarTranslucent
    >
      <View style={styles.modalContainer}>
        <TouchableWithoutFeedback onPress={closeSidebar}>
          <Animated.View
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: t.color.overlay, zIndex: 9998 },
              { opacity: backdropAnim },
            ]}
          />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[
            styles.drawerPanel,
            { width: effectiveWidth, transform: [{ translateX: slideAnim }] },
          ]}
        >
          {sidebarBody}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  modalContainer: { flex: 1, flexDirection: 'row' },
  drawerPanel: { position: 'absolute', top: 0, bottom: 0, left: 0, zIndex: 10000 },
  sidebar: { flex: 1, borderRightWidth: 1 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  closeBtn: { width: MIN_TOUCH, height: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
  userCard: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { fontSize: 16, fontWeight: '700' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  menu: { flex: 1 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: MIN_TOUCH, marginBottom: 2 },
  activeBar: { width: 3, height: 18, borderRadius: 2 },
  bottom: { borderTopWidth: 1 },
});
