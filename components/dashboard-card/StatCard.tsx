import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export function StatCard({ title, value, icon: Icon, variant, onPress }: any) {
  // Map your variant colors to actual hex
  const colors = {
    primary: ['#1e3a8a', '#1e40af'],
    green: ['#064e3b', '#065f46'],
    red: ['#7f1d1d', '#991b1b'],
    gold: ['#78350f', '#92400e'],
    // Add remaining mappings...
  };

  return (
    <TouchableOpacity style={styles.cardContainer} onPress={onPress}>
      <LinearGradient 
        colors={colors[variant as keyof typeof colors] || ['#262626', '#171717']} 
        style={styles.cardGradient}
      >
        <View style={styles.content}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.value}>{value}</Text>
        </View>
        <View style={styles.iconBox}>
          <Icon size={24} color="#fff" />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cardContainer: { height: 110, borderRadius: 16, overflow: 'hidden', elevation: 5 },
  cardGradient: { flex: 1, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: '#d4d4d4', fontSize: 12, fontWeight: '600' },
  value: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginTop: 4 },
  iconBox: { width: 45, height: 45, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }
});