

// components/ui/Badge.tsx
import { View, Text, StyleSheet } from 'react-native';

export const Card = ({ children, style }: any) => <View style={[styles.card, style]}>{children}</View>;

export const Badge = ({ children, variant = 'default' }: any) => (
  <View style={[styles.badge, variant === 'outline' ? styles.outline : styles.default]}>
    <Text style={styles.text}>{children}</Text>
  </View>
);
const styles = StyleSheet.create({ 
  card: { backgroundColor: '#18181b', borderRadius: 12, borderWidth: 1, borderColor: '#27272a', padding: 16 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  default: { backgroundColor: '#27272a' },
  outline: { borderWidth: 1, borderColor: '#3f3f46' },
  text: { color: 'white', fontSize: 10 }
});