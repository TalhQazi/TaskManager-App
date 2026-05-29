import React from 'react';

import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';

import {
  X,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react-native';

import Colors from '@/constants/colors';

interface Props {
  visible: boolean;

  announcement: any;

  onClose: () => void;

  onAcknowledge: (
    id: string
  ) => void;
}

export default function AnnouncementModal({
  visible,
  announcement,
  onClose,
  onAcknowledge,
}: Props) {
  if (!announcement) return null;

  const showAcknowledgeButton =
    announcement.requiresAcknowledgement &&
    !announcement.isAcknowledged;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* HEADER */}

          <View style={styles.header}>
            <View style={styles.headerLeft}>
              {announcement.emergency ? (
                <AlertTriangle
                  size={20}
                  color="#EF4444"
                />
              ) : (
                <CheckCircle2
                  size={20}
                  color={Colors.primary}
                />
              )}

              <Text style={styles.headerTitle}>
                Announcement
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
            >
              <X
                size={22}
                color={
                  Colors.textSecondary
                }
              />
            </TouchableOpacity>
          </View>

          {/* CONTENT */}

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={
              false
            }
          >
            <Text style={styles.title}>
              {announcement.title}
            </Text>

            <View style={styles.metaRow}>
              <Text style={styles.author}>
                {announcement.authorName}
              </Text>

              <Text style={styles.date}>
                {new Date(
                  announcement.createdAt
                ).toLocaleDateString()}
              </Text>
            </View>

            {announcement.emergency && (
              <View
                style={
                  styles.emergencyBanner
                }
              >
                <AlertTriangle
                  size={16}
                  color="#EF4444"
                />

                <Text
                  style={
                    styles.emergencyText
                  }
                >
                  Emergency
                  Announcement
                </Text>
              </View>
            )}

            <Text style={styles.body}>
              {announcement.body}
            </Text>
          </ScrollView>

          {/* FOOTER */}

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
            >
              <Text
                style={
                  styles.closeButtonText
                }
              >
                Close
              </Text>
            </TouchableOpacity>

            {showAcknowledgeButton && (
              <TouchableOpacity
                style={
                  styles.acknowledgeButton
                }
                onPress={() => {
                  onAcknowledge(
                    announcement.id
                  );

                  onClose();
                }}
              >
                <CheckCircle2
                  size={18}
                  color="#FFFFFF"
                />

                <Text
                  style={
                    styles.acknowledgeText
                  }
                >
                  Acknowledge
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor:
      'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },

  modal: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    paddingBottom: 20,
  },

  header: {
    flexDirection: 'row',
    justifyContent:
      'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor:
      Colors.borderLight,
  },

  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 18,
  },

  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
    lineHeight: 32,
  },

  metaRow: {
    flexDirection: 'row',
    justifyContent:
      'space-between',
    marginTop: 14,
  },

  author: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },

  date: {
    fontSize: 12,
    color: Colors.textTertiary,
  },

  emergencyBanner: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
  },

  emergencyText: {
    color: '#EF4444',
    fontWeight: '700',
  },

  body: {
    marginTop: 20,
    fontSize: 15,
    lineHeight: 26,
    color: Colors.textSecondary,
    paddingBottom: 30,
  },

  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 12,
  },

  closeButton: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor:
      Colors.surfaceAlt,
  },

  closeButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },

  acknowledgeButton: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    backgroundColor: Colors.success,
  },

  acknowledgeText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});