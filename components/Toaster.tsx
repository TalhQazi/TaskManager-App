import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useToast } from '@/hooks/use-toast';

export function Toaster() {
  const { toasts } = useToast();


  const visibleToasts = toasts.filter((t) => t.open !== false);

  return (
    <View style={styles.container}>
      {visibleToasts.map((t) => {
        const isDestructive = t.variant === 'destructive';
        const isSuccess = t.variant === 'success';

        return (
          <View 
            key={t.id} 
            style={[
              styles.toast, 
              isDestructive && styles.toastDestructive,
              isSuccess && styles.toastSuccess
            ]}
          >
            {t.title && <Text style={styles.title}>{t.title}</Text>}
            {t.description && <Text style={styles.desc}>{t.description}</Text>}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', top: 60, left: 16, right: 16, zIndex: 9999 },
  toast: { backgroundColor: '#0d1117', padding: 16, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#21262d', elevation: 5 },
  toastDestructive: { backgroundColor: '#7a1c1c', borderColor: '#f85149' },
  toastSuccess: { backgroundColor: '#0e4429', borderColor: '#238636' },
  title: { color: '#f0f6fc', fontWeight: '800', fontSize: 14 },
  desc: { color: '#8b949e', fontSize: 12, marginTop: 4, lineHeight: 16 }
});