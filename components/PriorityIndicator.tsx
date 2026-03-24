import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';

interface PriorityIndicatorProps {
  priority: 'low' | 'medium' | 'high';
}

const priorityConfig = {
  low: { label: 'Low', color: Colors.textTertiary, bg: Colors.surfaceAlt },
  medium: { label: 'Medium', color: Colors.warning, bg: Colors.warningLight },
  high: { label: 'High', color: Colors.error, bg: Colors.errorLight },
};

export default function PriorityIndicator({ priority }: PriorityIndicatorProps) {
  const config = priorityConfig[priority];

  return (
    <View style={[styles.container, { backgroundColor: config.bg }]}>
      <Text style={[styles.text, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  text: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
});
