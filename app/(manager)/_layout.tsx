import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ManagerHeader from '@/components/ManagerHeader';
import ManagerFixedSidebar from '@/components/ManagerFixedSidebar';

export default function ManagerLayout() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <ManagerHeader />
      <View style={styles.body}>
        <ManagerFixedSidebar />
        <View style={[styles.content, { paddingBottom: insets.bottom }]}>
          <Stack screenOptions={{ headerShown: false }} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  body: {
    flex: 1,
    flexDirection: 'row',
  },
  content: {
    flex: 1,
  },
});
