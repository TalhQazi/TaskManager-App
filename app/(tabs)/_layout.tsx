import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { Slot } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;

  return (
    <View style={styles.container}>
      {/* Permanent Sidebar */}
      <Sidebar />

      {/* Main Content Area - shifted right for sidebar */}
      <View style={[
        styles.content,
        {
          paddingBottom: insets.bottom,
          marginLeft: isLargeScreen ? 280 : 0,
        },
      ]}>
        {/* Persistent Header */}
        <Header />

        {/* Screen Content */}
        <View style={styles.screenContent}>
          <Slot />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  content: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  screenContent: {
    flex: 1,
  },
});
