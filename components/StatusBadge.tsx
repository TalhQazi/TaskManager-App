import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';
import { TaskStatus } from '@/types';

interface StatusBadgeProps {
  status: TaskStatus;
  size?: 'small' | 'medium';
}

const statusConfig: Record<TaskStatus, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pending', color: Colors.warning, bg: Colors.warningLight },
  in_progress: { label: 'In Progress', color: Colors.inProgress, bg: Colors.infoLight },
  completed: { label: 'Completed', color: Colors.success, bg: Colors.successLight },
};

export default function StatusBadge({ status, size = 'small' }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: 'Unknown', color: Colors.textSecondary, bg: Colors.surfaceAlt };

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }, size === 'medium' && styles.badgeMedium]}>
      <View style={[styles.dot, { backgroundColor: config.color }]} />
      <Text style={[styles.label, { color: config.color }, size === 'medium' && styles.labelMedium]}>
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
  },
  badgeMedium: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  labelMedium: {
    fontSize: 13,
  },
});
