import { Stack } from 'expo-router';
import React from 'react';
import Colors from '@/constants/colors';
import { TaskBlasterProvider } from '@/contexts/TaskBlasterContext';
import { RewardProvider } from '@/contexts/RewardProvider';

export default function TasksLayout() {
  return (
    <TaskBlasterProvider>
      <RewardProvider>
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.surface },
        headerTintColor: Colors.primary,
        headerTitleStyle: { fontWeight: '600', color: Colors.text },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[taskId]" options={{ title: 'Task Details' }} />
    </Stack>
    </RewardProvider>
    </TaskBlasterProvider>
  );
}
