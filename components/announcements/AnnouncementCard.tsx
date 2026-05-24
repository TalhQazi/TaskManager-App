import React from 'react';

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

import {
  AlertTriangle,
  CheckCircle2,
  Eye,
} from 'lucide-react-native';

import Colors from '@/constants/colors';

interface Props {
  item: any;
  onPress: () => void;
}

export default function AnnouncementCard({
  item,
  onPress,
}: Props) {
  const getPriorityColor = () => {
    switch (item.priority) {
      case 'critical':
        return '#EF4444';

      case 'high':
        return '#F97316';

      case 'medium':
        return '#EAB308';

      default:
        return '#3B82F6';
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        styles.card,

        item.emergency && styles.emergencyCard,

        !item.isRead && styles.unreadCard,
      ]}
    >
      {/* TOP */}

      <View style={styles.topRow}>
        <View
          style={[
            styles.priorityBadge,
            {
              backgroundColor: `${getPriorityColor()}20`,
            },
          ]}
        >
          <Text
            style={[
              styles.priorityText,
              {
                color: getPriorityColor(),
              },
            ]}
          >
            {item.priority.toUpperCase()}
          </Text>
        </View>

        {!item.isRead && (
          <View style={styles.unreadDot} />
        )}
      </View>

      {/* EMERGENCY */}

      {item.emergency && (
        <View style={styles.emergencyBadge}>
          <AlertTriangle
            size={14}
            color="#EF4444"
          />

          <Text style={styles.emergencyText}>
            EMERGENCY
          </Text>
        </View>
      )}

      {/* TITLE */}

      <Text style={styles.title}>
        {item.title}
      </Text>

      {/* BODY */}

      <Text
        numberOfLines={3}
        style={styles.body}
      >
        {item.body}
      </Text>

      {/* FOOTER */}

      <View style={styles.footer}>
        <Text style={styles.author}>
          {item.authorName}
        </Text>

        <Text style={styles.date}>
          {new Date(
            item.createdAt
          ).toLocaleDateString()}
        </Text>
      </View>

      {/* ACKNOWLEDGED */}

      {item.isAcknowledged && (
        <View style={styles.acknowledged}>
          <CheckCircle2
            size={14}
            color={Colors.success}
          />

          <Text style={styles.ackText}>
            Acknowledged
          </Text>
        </View>
      )}

      {/* READ */}

      {item.isRead && (
        <View style={styles.readRow}>
          <Eye
            size={14}
            color={Colors.textTertiary}
          />

          <Text style={styles.readText}>
            Read
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },

  unreadCard: {
    borderColor: Colors.primary,
    backgroundColor: Colors.infoLight,
  },

  emergencyCard: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },

  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 30,
  },

  priorityText: {
    fontSize: 11,
    fontWeight: '700',
  },

  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },

  emergencyBadge: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  emergencyText: {
    color: '#EF4444',
    fontWeight: '700',
    fontSize: 12,
  },

  title: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },

  body: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 22,
    color: Colors.textSecondary,
  },

  footer: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  author: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },

  date: {
    fontSize: 12,
    color: Colors.textTertiary,
  },

  acknowledged: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  ackText: {
    color: Colors.success,
    fontWeight: '600',
    fontSize: 13,
  },

  readRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  readText: {
    color: Colors.textTertiary,
    fontSize: 12,
  },
});