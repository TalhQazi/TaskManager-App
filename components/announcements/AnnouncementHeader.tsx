import React from 'react';

import {
  View,
  Text,
  StyleSheet,
} from 'react-native';

import { Bell } from 'lucide-react-native';

import Colors from '@/constants/colors';

interface Props {
  unreadCount: number;
}

export default function AnnouncementHeader({
  unreadCount,
}: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Bell
          size={24}
          color="#FFFFFF"
        />
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>
          Announcements
        </Text>

        <Text style={styles.subtitle}>
          {unreadCount > 0
            ? `${unreadCount} unread announcements`
            : 'You are all caught up'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 18,
  },

  iconContainer: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  content: {
    marginLeft: 14,
    flex: 1,
  },

  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text,
  },

  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: Colors.textSecondary,
  },
});