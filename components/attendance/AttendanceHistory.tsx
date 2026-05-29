import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
} from 'react-native';

import Colors from '@/constants/colors';

const DATA = [
  {
    id: '1',
    date: 'May 18',
    in: '09:10',
    out: '06:22',
    hours: '9.2h',
  },
  {
    id: '2',
    date: 'May 17',
    in: '09:00',
    out: '06:10',
    hours: '9.1h',
  },
];

export default function AttendanceHistory() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Attendance History
      </Text>

      <FlatList
        data={DATA}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View>
              <Text style={styles.date}>
                {item.date}
              </Text>

              <Text style={styles.time}>
                {item.in} - {item.out}
              </Text>
            </View>

            <Text style={styles.hours}>
              {item.hours}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 40,
  },

  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 14,
    color: Colors.text,
  },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  date: {
    fontWeight: '700',
    color: Colors.text,
  },

  time: {
    marginTop: 4,
    color: Colors.textSecondary,
  },

  hours: {
    fontWeight: '700',
    color: Colors.primary,
  },
});