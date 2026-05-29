import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';

import {
  LogIn,
  LogOut,
  Timer,
} from 'lucide-react-native';

import Colors from '@/constants/colors';

export default function TimeStats() {
  const stats = [
    {
      title: 'Clock In',
      value: '09:15 AM',
      icon: LogIn,
      color: Colors.success,
    },
    {
      title: 'Clock Out',
      value: '--:--',
      icon: LogOut,
      color: Colors.error,
    },
    {
      title: 'Duration',
      value: '05:42:12',
      icon: Timer,
      color: Colors.primary,
    },
  ];

  return (
    <View style={styles.row}>
      {stats.map((item, index) => {
        const Icon = item.icon;

        return (
          <View
            key={index}
            style={styles.card}
          >
            <View
              style={[
                styles.iconContainer,
                {
                  backgroundColor: `${item.color}15`,
                },
              ]}
            >
              <Icon
                size={20}
                color={item.color}
              />
            </View>

            <Text style={styles.title}>
              {item.title}
            </Text>

            <Text style={styles.value}>
              {item.value}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 10,
  },

  card: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
  },

  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  title: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },

  value: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
});