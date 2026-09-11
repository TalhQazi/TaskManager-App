import React, { useState, useMemo } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ManagerHeader from '@/components/ManagerHeader';
import ManagerFixedSidebar from '@/components/ManagerFixedSidebar';
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";

function ManagerLayoutContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { uiTheme } = useTheme(); 
  const insets = useSafeAreaInsets();

  const styles = useMemo(() => getThemedStyles(uiTheme, insets), [uiTheme, insets]);

  return (
    <View style={styles.root}> 
      <ManagerHeader onMenuPress={() => setSidebarOpen(true)} />

      <View style={styles.body}>
        <Stack 
          screenOptions={{ 
            headerShown: false,
            contentStyle: { backgroundColor: uiTheme?.panelColors?.dashboardBackground || '#f8fafc' }
          }} 
        />
      </View>

      <ManagerFixedSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)} 
      />
    </View>
  );
}

// 2. Main exported component providing the theme down to the content
export default function ManagerLayout() {
  return (
    <ThemeProvider>
      <ManagerLayoutContent />
    </ThemeProvider>
  );
}

const getThemedStyles = (uiTheme: any, insets: any) => {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: uiTheme?.panelColors?.dashboardBackground || '#f8fafc',
    },
    body: {
      flex: 1,
      marginTop: Platform.OS === 'android' ? 0 : -20,
      paddingBottom: Platform.OS === 'android' ? insets.bottom : 0,
    },
  });
};