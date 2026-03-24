import { Stack } from 'expo-router';
import React from 'react';

export default function ClockLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
