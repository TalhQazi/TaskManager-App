import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';

import Colors from '@/constants/colors';

export default function AttendanceHeader() {
  const [currentTime, setCurrentTime] =
    useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString([], {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.title}>
          Attendance
        </Text>

        <Text style={styles.date}>
          {formatDate(currentTime)}
        </Text>
      </View>

      <Text style={styles.time}>
        {formatTime(currentTime)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
  },

  date: {
    marginTop: 4,
    color: Colors.textSecondary,
  },

  time: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
  },
});