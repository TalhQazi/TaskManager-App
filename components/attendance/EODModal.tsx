import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';

import Colors from '@/constants/colors';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: {
    tasks: string;
    issues: string;
    notes: string;
  }) => void;
}

export default function EODModal({
  visible,
  onClose,
  onSubmit,
}: Props) {
  const [tasks, setTasks] = useState('');
  const [issues, setIssues] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    const trimmedTasks = tasks.trim();

    // 1. Check for blank input
    if (!trimmedTasks) {
      Alert.alert(
        'Validation Required',
        'Please enter completed tasks before checking out.'
      );
      return;
    }

    // 2. Validate against 10-character threshold
    if (trimmedTasks.length < 10) {
      Alert.alert(
        'More Detail Required',
        'Please provide more details about tasks completed (at least 10 characters).'
      );
      return;
    }

    // Pass data payload safely back up to parent container context hook
    onSubmit({
      tasks: trimmedTasks,
      issues: issues.trim(),
      notes: notes.trim(),
    });

    // Clear buffer records out of runtime states
    setTasks('');
    setIssues('');
    setNotes('');

    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>
              End Of Day Report
            </Text>

            <Text style={styles.label}>
              Tasks Completed *
            </Text>
            <TextInput
              multiline
              value={tasks}
              onChangeText={setTasks}
              placeholder="Describe your tracking tasks deployment parameters..."
              placeholderTextColor="#8b949e"
              style={styles.input}
            />
            <Text style={styles.hintText}>Minimum 10 characters required</Text>

            <Text style={styles.label}>
              Issues / Blockers
            </Text>
            <TextInput
              multiline
              value={issues}
              onChangeText={setIssues}
              placeholder="Any system barriers blocking workflows..."
              placeholderTextColor="#8b949e"
              style={[styles.input, { minHeight: 70 }]}
            />

            <Text style={styles.label}>
              Notes
            </Text>
            <TextInput
              multiline
              value={notes}
              onChangeText={setNotes}
              placeholder="Additional annotations context..."
              placeholderTextColor="#8b949e"
              style={[styles.input, { minHeight: 60 }]}
            />

            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}
              activeOpacity={0.8}
            >
              <Text style={styles.submitText}>
                Submit & Clock Out
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelText}>
                Cancel
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },

  container: {
    backgroundColor: Colors.surface || '#161b22',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
  },

  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text || '#fff',
    marginBottom: 12,
  },

  label: {
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 14,
    color: Colors.text || '#fff',
    fontSize: 14,
  },

  input: {
    minHeight: 90,
    backgroundColor: Colors.surfaceAlt || '#0D1117',
    borderRadius: 14,
    padding: 14,
    textAlignVertical: 'top',
    color: Colors.text || '#fff',
    borderWidth: 1,
    borderColor: '#30363d',
  },

  hintText: {
    color: '#8b949e',
    fontSize: 11,
    marginTop: 4,
    paddingLeft: 4,
  },

  submitButton: {
    height: 52,
    backgroundColor: Colors.primary || '#238636',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },

  submitText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },

  cancelButton: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight || '#30363d',
    marginBottom: 10,
  },

  cancelText: {
    color: '#8b949e',
    fontWeight: '600',
  },
});