import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

import {
  LogIn,
  LogOut,
} from 'lucide-react-native';

import Colors from '@/constants/colors';

interface Props {
  onClockOut: () => void;
}

export default function AttendanceActions({
  onClockOut,
}: Props) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.button,
          {
            backgroundColor:
              Colors.success,
          },
        ]}
        activeOpacity={0.8}
      >
        <LogIn
          size={20}
          color="#fff"
        />

        <Text style={styles.text}>
          Clock In
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.button,
          {
            backgroundColor:
              Colors.error,
          },
        ]}
        activeOpacity={0.8}
        onPress={onClockOut}
      >
        <LogOut
          size={20}
          color="#fff"
        />

        <Text style={styles.text}>
          Clock Out
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 20,
  },

  button: {
    flex: 1,
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },

  text: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});