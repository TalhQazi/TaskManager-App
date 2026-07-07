import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LucideIcon } from 'lucide-react-native';

export const KpiCard = ({ title, value, icon: Icon, subtitle }: any) => (
  <View style={styles.card}>
    <View style={styles.header}>
      <Text style={styles.title}>{title}</Text>
      {Icon && <Icon size={16} color="#71717a" />}
    </View>
    <Text style={styles.value}>{value}</Text>
    {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
  </View>
);

const styles = StyleSheet.create({
  card: { backgroundColor: '#18181b', padding: 15, borderRadius: 12, width: '48%', marginBottom: 12, borderWidth: 1, borderColor: '#27272a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  title: { color: '#a1a1aa', fontSize: 10, textTransform: 'uppercase', fontWeight: 'bold' },
  value: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  subtitle: { color: '#52525b', fontSize: 9, marginTop: 4 }
});