import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, usePathname } from 'expo-router';
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  X,
  Clock3,
  Megaphone,
} from 'lucide-react-native';

const items = [
  { label: 'Dashboard', path: '/(manager)/home', icon: LayoutDashboard },
  { label: 'Announcements', path: '/(manager)/announcement', icon: Megaphone },
  { label: 'Tasks', path: '/(manager)/tasks', icon: ClipboardList },
  { label: 'Team', path: '/(manager)/team', icon: Users },
  { label: 'Attendance', path: '/(manager)/attendance', icon: Clock3 },
];

export default function ManagerDrawer({ onClose }) {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();

  return (
    <View style={styles.overlay}>
      
      {/* HEADER SAFE AREA */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={onClose}>
          <X size={26} color="#111" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Menu</Text>

        <View style={{ width: 26 }} />
      </View>

      {/* MENU */}
      <ScrollView contentContainerStyle={styles.menu}>
        {items.map((item) => {
          const active = pathname === item.path;

          return (
            <TouchableOpacity
              key={item.path}
              style={[styles.item, active && styles.activeItem]}
              onPress={() => {
                router.push(item.path as any);
                onClose();
              }}
            >
              <item.icon size={20} color={active ? '#fff' : '#333'} />

              <Text style={[styles.label, active && styles.activeLabel]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ffffff',
    zIndex: 9999,
    elevation: 20,
  },

  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fff',
  },

  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },

  menu: {
    padding: 20,
    gap: 12,
  },

  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
  },

  activeItem: {
    backgroundColor: '#0072FF',
  },

  label: {
    fontSize: 15,
    color: '#333',
  },

  activeLabel: {
    color: '#fff',
    fontWeight: '600',
  },
});