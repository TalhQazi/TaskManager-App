import React, { useRef } from 'react';
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
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import { usePathname, router } from 'expo-router';
import * as Haptics from 'expo-haptics';

import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Calendar,
  Clock3,
  MessageSquare,
  Bell,
  User,
  Car,
  Wrench,
  Menu,
  ChevronLeft,
  Megaphone,
  Bug,
  Building2,
  UserRoundX,
} from 'lucide-react-native';

import Colors from '@/constants/colors';

const SIDEBAR_WIDTH = 260;

/* MENU */
const items = [
  { key: 'dashboard', label: 'Dashboard', path: '/(manager)/home', icon: LayoutDashboard },
  { key: 'announcement', label: 'Announcement', path: '/(manager)/announcement', icon: Megaphone },
  { key: 'attendance', label: 'Attendance', path: '/(manager)/attendance', icon: Clock3 },
  { key: 'bugs', label: 'Bugs', path: '/(manager)/bug', icon: Bug },
  { key: 'company', label: 'Company', path: '/(manager)/companies', icon: Building2 },
  { key: 'donothire', label: 'Do Not Hire', path: '/(manager)/donothire', icon: UserRoundX },
  { key: 'tasks', label: 'Tasks', path: '/(manager)/tasks', icon: ClipboardList },
  { key: 'team', label: 'Team', path: '/(manager)/team', icon: Users },
  { key: 'vehicles', label: 'Vehicles', path: '/(manager)/vehicles', icon: Car },
  { key: 'appliances', label: 'Appliances', path: '/(manager)/appliances', icon: Wrench },
  { key: 'schedule', label: 'Schedule', path: '/(manager)/schedule', icon: Calendar },
  { key: 'messages', label: 'Messages', path: '/(manager)/messages', icon: MessageSquare },
  { key: 'notifications', label: 'Notifications', path: '/(manager)/notifications', icon: Bell },
  { key: 'profile', label: 'Profile', path: '/(manager)/profile', icon: User },
];

export default function ManagerFixedSidebar({ isOpen, onClose }: any) {
  const pathname = usePathname();

  const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (isOpen) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -SIDEBAR_WIDTH,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isOpen]);

  const navigate = (path: string) => {
    router.push(path as any);
    onClose();
  };

  const sidebarUI = (
    <Animated.View style={[styles.sidebar]}>
      
      {/* YOUR ORIGINAL DESIGN WRAPPED */}
      <LinearGradient
        colors={[Colors.primary, Colors.primaryDark || Colors.primary]}
        style={styles.container}
      >

        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.title}>Menu</Text>

          <TouchableOpacity onPress={onClose}>
            <ChevronLeft color="#fff" />
          </TouchableOpacity>
        </View>

        {/* ITEMS */}
        <ScrollView>
          {items.map((item) => {
            const active = pathname === item.path;

            return (
              <TouchableOpacity
                key={item.key}
                style={[
                  styles.item,
                  active && styles.activeItem,
                ]}
                onPress={() => navigate(item.path)}
              >
                <item.icon color="#fff" size={20} />
                <Text style={styles.label}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

      </LinearGradient>
    </Animated.View>
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

      {/* DRAWER */}
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
    backgroundColor: 'rgba(0,0,0,0.5)',
  },

  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
  },

  sidebar: {
    flex: 1,
  },

  container: {
    flex: 1,
    paddingTop: 50,
    paddingHorizontal: 16,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },

  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },

  item: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    borderRadius: 10,
    marginBottom: 6,
    alignItems: 'center',
  },

  activeItem: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },

  label: {
    color: '#fff',
    fontSize: 14,
  },
});