import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CalendarDays,
  Clock,
  MessageSquare,
  Camera,
  Send,
  CheckCircle2,
  Loader,
  AlertCircle,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import StatusBadge from '@/components/StatusBadge';
import PriorityIndicator from '@/components/PriorityIndicator';
import { apiRequest } from '@/services/api';
import { mockTasks } from '@/services/mockData';
import { Task, TaskStatus } from '@/types';

export default function TaskDetailScreen() {
  const { taskId } = useLocalSearchParams<{ taskId: string }>();
  const queryClient = useQueryClient();
  const [newNote, setNewNote] = useState<string>('');

  const { data: task, isLoading } = useQuery<Task | undefined>({
    queryKey: ['task', taskId],
    queryFn: async () => {
      try {
        const res = await apiRequest<{ item?: any }>(`/tasks/${taskId}`);
        const t = res.data?.item;
        if (!t) return undefined;
        return {
          id: String(t.id ?? t._id ?? ''),
          title: String(t.title ?? ''),
          description: String(t.description ?? ''),
          status: (String(t.status || 'pending').replace('-', '_') as any) as TaskStatus,
          priority: (t.priority ?? 'medium') as any,
          assignedDate: String(t.createdAt ?? ''),
          dueDate: t.dueDate ? new Date(t.dueDate).toISOString().split('T')[0] : '',
          notes: [],
          images: [],
          category: String(t.location || 'Task'),
        } as Task;
      } catch {
        return mockTasks.find((t) => t.id === taskId);
      }
    },
  });

  const statusMutation = useMutation({
    mutationFn: async (newStatus: TaskStatus) => {
      try {
        const backendStatus = String(newStatus).replace('_', '-');
        await apiRequest<{ item: any }>(`/tasks/${taskId}`, {
          method: 'PUT',
          body: JSON.stringify({ status: backendStatus }),
        });

        return { ...task, status: newStatus };
      } catch {
        console.log('[Task] Status update (demo mode):', newStatus);
        return { ...task, status: newStatus };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const noteMutation = useMutation({
    mutationFn: async (note: string) => {
      try {
        return { note };
      } catch {
        console.log('[Task] Note added (demo mode):', note);
        return { note };
      }
    },
    onSuccess: () => {
      setNewNote('');
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    },
  });

  const handleStatusChange = useCallback(
    (newStatus: TaskStatus) => {
      Alert.alert(
        'Update Status',
        `Change status to "${newStatus.replace('_', ' ')}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Confirm', onPress: () => statusMutation.mutate(newStatus) },
        ],
      );
    },
    [statusMutation],
  );

  const handleAddNote = useCallback(() => {
    if (!newNote.trim()) return;
    noteMutation.mutate(newNote.trim());
  }, [newNote, noteMutation]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!task) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Task not found</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: task.category }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topSection}>
          <View style={styles.metaRow}>
            <StatusBadge status={task.status} size="medium" />
            <PriorityIndicator priority={task.priority} />
          </View>
          <Text style={styles.title}>{task.title}</Text>
          <Text style={styles.description}>{task.description}</Text>
        </View>

        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <CalendarDays color={Colors.textTertiary} size={16} />
            <Text style={styles.detailLabel}>Assigned</Text>
            <Text style={styles.detailValue}>{task.assignedDate}</Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailRow}>
            <Clock color={Colors.textTertiary} size={16} />
            <Text style={styles.detailLabel}>Due Date</Text>
            <Text style={styles.detailValue}>{task.dueDate}</Text>
          </View>
        </View>

        <View style={styles.statusSection}>
          <Text style={styles.sectionTitle}>Update Status</Text>
          <View style={styles.statusButtons}>
            {task.status !== 'pending' ? null : (
              <TouchableOpacity
                style={[styles.statusBtn, styles.statusBtnInProgress]}
                onPress={() => handleStatusChange('in_progress')}
                disabled={statusMutation.isPending}
                activeOpacity={0.7}
              >
                <Loader color={Colors.secondary} size={16} />
                <Text style={[styles.statusBtnText, { color: Colors.secondary }]}>
                  Start Task
                </Text>
              </TouchableOpacity>
            )}
            {task.status === 'in_progress' && (
              <TouchableOpacity
                style={[styles.statusBtn, styles.statusBtnComplete]}
                onPress={() => handleStatusChange('completed')}
                disabled={statusMutation.isPending}
                activeOpacity={0.7}
              >
                <CheckCircle2 color={Colors.success} size={16} />
                <Text style={[styles.statusBtnText, { color: Colors.success }]}>
                  Mark Complete
                </Text>
              </TouchableOpacity>
            )}
            {task.status === 'completed' && (
              <View style={styles.completedBanner}>
                <CheckCircle2 color={Colors.success} size={18} />
                <Text style={styles.completedText}>This task is completed</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.notesSection}>
          <View style={styles.notesTitleRow}>
            <MessageSquare color={Colors.primary} size={16} />
            <Text style={styles.sectionTitle}>Notes ({task.notes.length})</Text>
          </View>

          {task.notes.map((note, idx) => (
            <View key={idx} style={styles.noteItem}>
              <View style={styles.noteBullet} />
              <Text style={styles.noteText}>{note}</Text>
            </View>
          ))}

          <View style={styles.noteInputRow}>
            <TextInput
              style={styles.noteInput}
              placeholder="Add a note..."
              placeholderTextColor={Colors.textTertiary}
              value={newNote}
              onChangeText={setNewNote}
              multiline
              testID="task-note-input"
            />
            <TouchableOpacity
              style={[styles.noteSendBtn, !newNote.trim() && styles.noteSendBtnDisabled]}
              onPress={handleAddNote}
              disabled={!newNote.trim() || noteMutation.isPending}
            >
              <Send color={newNote.trim() ? Colors.primary : Colors.textTertiary} size={18} />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.uploadBtn} activeOpacity={0.7}>
          <Camera color={Colors.secondary} size={20} />
          <Text style={styles.uploadBtnText}>Upload Photo Evidence</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  errorText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  topSection: {
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    lineHeight: 26,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  detailsCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailLabel: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  detailDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: 12,
  },
  statusSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 10,
  },
  statusButtons: {
    gap: 8,
  },
  statusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  statusBtnInProgress: {
    borderColor: Colors.secondary,
    backgroundColor: Colors.infoLight,
  },
  statusBtnComplete: {
    borderColor: Colors.success,
    backgroundColor: Colors.successLight,
  },
  statusBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  completedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.successLight,
    borderRadius: 12,
    paddingVertical: 14,
  },
  completedText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.success,
  },
  notesSection: {
    marginBottom: 20,
  },
  notesTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  noteItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
    paddingLeft: 4,
  },
  noteBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.secondary,
    marginTop: 6,
  },
  noteText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  noteInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  noteInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: Colors.text,
    minHeight: 44,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  noteSendBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  noteSendBtnDisabled: {
    opacity: 0.6,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: Colors.secondary,
    borderStyle: 'dashed',
  },
  uploadBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.secondary,
  },
});
