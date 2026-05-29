import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';

import {
  Clock,
} from 'lucide-react-native';

import Colors from '@/constants/colors';

export default function StatusCard() {
  const isClockedIn = true;

  return (
    <View style={styles.card}>
      <View style={styles.left}>
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: isClockedIn
                ? Colors.successLight
                : Colors.surfaceAlt,
            },
          ]}
        >
          <Clock
            size={28}
            color={
              isClockedIn
                ? Colors.success
                : Colors.textSecondary
            }
          />
        </View>

        <View>
          <Text style={styles.label}>
            Current Status
          </Text>

          <Text style={styles.status}>
            {isClockedIn
              ? 'Clocked In'
              : 'Not Clocked In'}
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.badge,
          {
            backgroundColor: isClockedIn
              ? Colors.successLight
              : Colors.surfaceAlt,
          },
        ]}
      >
        <Text
          style={[
            styles.badgeText,
            {
              color: isClockedIn
                ? Colors.success
                : Colors.textSecondary,
            },
          ]}
        >
          {isClockedIn ? 'Active' : 'Idle'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  left: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  iconContainer: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  label: {
    color: Colors.textSecondary,
    marginBottom: 4,
  },

  status: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },

  badge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },

  badgeText: {
    fontWeight: '600',
  },
});