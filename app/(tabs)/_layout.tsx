import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Slot } from 'expo-router';

import Sidebar from '@/components/Sidebar'; 
import Header from '@/components/Header';
import Colors from '@/constants/colors';
import { SidebarProvider } from '@/contexts/SidebarContext'; // Use your generated provider

export default function TabLayout() {
  return (
    <SidebarProvider>
      <View style={styles.container}> 
        {/* Persistent Header (openSidebar works out of the box inside here) */}
        <Header />

        {/* Main Content Area */}
        <View style={styles.content}>
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
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
    backgroundColor: Colors.surface || '#ffffff',
  },
});