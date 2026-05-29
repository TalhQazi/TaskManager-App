import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';

import ManagerHeader from '@/components/ManagerHeader';
import ManagerFixedSidebar from '@/components/ManagerFixedSidebar';

export default function ManagerLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <View style={styles.root}>
      
      {/* HEADER WITH MENU BUTTON */}
      <ManagerHeader onMenuPress={() => setSidebarOpen(true)} />

      {/* MAIN CONTENT (NO PUSH, NO MARGIN) */}
      <View style={styles.body}>
        <Stack screenOptions={{ headerShown: false }} />
      </View>

      {/* OVERLAY SIDEBAR */}
      <ManagerFixedSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  body: {
    flex: 1,
  },
});