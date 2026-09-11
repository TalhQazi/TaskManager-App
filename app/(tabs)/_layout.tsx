import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Slot } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Sidebar from '@/components/Sidebar'; 
import Header from '@/components/Header';
import { SidebarProvider } from '@/contexts/SidebarContext';
import { useTheme } from '@/contexts/ThemeContext';

export default function TabLayout() {
  const { uiTheme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const bg = uiTheme?.panelColors?.dashboardBackground || (isDark ? '#09090b' : '#09090b');

  return (
    <SidebarProvider>
      <View style={[styles.container, { backgroundColor: bg }]}> 
        {/* Persistent Header (openSidebar works out of the box inside here) */}
        <Header />

        {/* Main Content Area */}
        <View
          style={[
            styles.content,
            {
              backgroundColor: bg,
              marginTop: Platform.OS === 'android' ? 0 : -40,
              paddingBottom: Platform.OS === 'android' ? insets.bottom : 0,
            },
          ]}
        >
          <Slot />
        </View>

        {/* Sidebar Overlay (No props needed, reads from hook inside) */}
        <Sidebar />
      </View>
    </SidebarProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  content: {
    flex: 1,
    backgroundColor: '#09090b',
  },
});