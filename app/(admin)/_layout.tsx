import React, { useState, useMemo } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AdminHeader from '@/components/AdminHeader';
import AdminFixedSidebar from '@/components/AdminFixedSidebar';
import { AtlasBooksProvider } from './atlas-book/context/AtlasBooksContext';
import { RewardProvider } from '@/contexts/RewardProvider';
import { useTheme } from '@/contexts/ThemeContext';

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { uiTheme } = useTheme();
  const insets = useSafeAreaInsets();

  const styles = useMemo(() => getThemedStyles(uiTheme, insets), [uiTheme, insets]);

  return (
    <View style={styles.root}>
      <AdminHeader
        onMenuPress={() => setSidebarOpen(true)}
      />

      <View style={styles.body}>
        <AtlasBooksProvider>
          <RewardProvider>
            <Stack screenOptions={{ 
              headerShown: false,
              contentStyle: { backgroundColor: uiTheme?.panelColors?.dashboardBackground || '#09090b' }
            }} />
          </RewardProvider>
        </AtlasBooksProvider>
      </View>

      <AdminFixedSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
    </View>
  );
}

const getThemedStyles = (uiTheme: any, insets: any) => {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: uiTheme?.panelColors?.dashboardBackground || '#09090b',
    },
    body: {
      flex: 1,
      paddingBottom: Platform.OS === 'android' ? insets.bottom : 0,
    },
  });
};