import React, { useState, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';

import AdminHeader from '@/components/AdminHeader';
import AdminFixedSidebar from '@/components/AdminFixedSidebar';
import { AtlasBooksProvider } from './atlas-book/context/AtlasBooksContext';
import { RewardProvider } from '@/contexts/RewardProvider';
import { useTheme } from '@/contexts/ThemeContext';

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { uiTheme } = useTheme();

  const styles = useMemo(() => getThemedStyles(uiTheme), [uiTheme]);

  return (
    <View style={styles.root} key={uiTheme.theme}>
      <AdminHeader
        onMenuPress={() => setSidebarOpen(true)}
      />

      <View style={styles.body}>
        <AtlasBooksProvider>
          <RewardProvider>
            <Stack screenOptions={{ 
              headerShown: false,
              contentStyle: { backgroundColor: uiTheme.panelColors.dashboardBackground }
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

const getThemedStyles = (uiTheme: any) => {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: uiTheme.panelColors.dashboardBackground,
    },
    body: {
      flex: 1,
    },
  });
};