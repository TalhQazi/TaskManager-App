import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Slot } from 'expo-router';

import Sidebar from '@/components/Sidebar'; 
import Header from '@/components/Header';
import { SidebarProvider } from '@/contexts/SidebarContext';
import { useTheme } from '@/contexts/ThemeContext';

export default function TabLayout() {
  const { uiTheme, isDark } = useTheme();
  const bg = uiTheme?.panelColors?.dashboardBackground || (isDark ? '#09090b' : '#09090b');

  return (
    <SidebarProvider>
      <View style={[styles.container, { backgroundColor: bg }]}> 
        {/* Persistent Header (openSidebar works out of the box inside here) */}
        <Header />

        {/* Main Content Area */}
        <View style={[styles.content, { backgroundColor: bg }]}>
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
    marginTop: -40,
  },
});