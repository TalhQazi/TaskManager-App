import React, { useState, useCallback ,useRef, useEffect} from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
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
  MapPin,
  User,
  ChevronLeft,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import StatusBadge from '@/components/StatusBadge';
import PriorityIndicator from '@/components/PriorityIndicator';
import { apiRequest } from '@/services/api';
import { Task, TaskStatus } from '@/types';

import { io, Socket } from 'socket.io-client';

const STATUS_OPTIONS: { key: TaskStatus; label: string; color: string }[] = [
  { key: 'pending', label: 'Pending', color: '#F59E0B' },
  { key: 'in_progress', label: 'In Progress', color: '#3B82F6' },
  { key: 'completed', label: 'Completed', color: '#22C55E' },
];

const SOCKET_URL = 'https://task.se7eninc.com';

export default function TaskDetailScreen() {
  const socketRef = useRef<Socket | null>(null);
  const params = useLocalSearchParams<{ taskId?: string | string[] }>();
  const taskId = Array.isArray(params.taskId) ? params.taskId[0] : params.taskId;
  const router = useRouter();
  const queryClient = useQueryClient();
  const [newNote, setNewNote] = useState<string>('');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [isSocketConnected, setIsSocketConnected] = useState(false);


 useEffect(() => {
  if (!taskId) return;

  socketRef.current = io(SOCKET_URL, { transports: ['websocket'] });
  const socket = socketRef.current;

  socket.on('connect', () => {
    setIsSocketConnected(true);
    socket.emit('joinTask', taskId);
  });

  // Listen for the comment event
  socket.on('newComment', (newComment) => {
    // Update the specific comments query cache
    queryClient.setQueryData(['task-comments', taskId], (oldData: any) => {
      return oldData ? [...oldData, newComment] : [newComment];
    });
  });

  return () => {
    socket.emit('leaveTask', taskId);
    socket.disconnect();
  };
}, [taskId, queryClient]);

  const { data: task, isLoading, error } = useQuery<Task>({
    queryKey: ['task', String(taskId || '')],
    enabled: !!taskId,
    queryFn: async () => {
      try {
        const res = await apiRequest<{ item?: any; error?: { message?: string } }>(`/tasks/${taskId}`);
        
        // Check if API returned an error
        if (res.error) {
          console.error('[Task Detail] API error:', res.error);
          throw new Error(res.error.message || 'Failed to load task');
        }
        
        const t = res.data?.item;
        if (!t) {
          console.error('[Task Detail] No task item in response:', res);
          throw new Error('Task not found');
        }
        
        return {
          id: String(t.id ?? t._id ?? ''),
          title: String(t.title ?? ''),
          description: String(t.description ?? ''),
          status: (String(t.status || 'pending').replace('-', '_') as any) as TaskStatus,
          priority: (t.priority ?? 'medium') as any,
          assignedDate: String(t.createdAt ?? ''),
          dueDate: t.dueDate ? new Date(t.dueDate).toISOString().split('T')[0] : '',
          notes: Array.isArray(t.notes) ? t.notes : [],
          images: Array.isArray(t.images) ? t.images : [],
          category: String(t.location || t.category || 'Task'),
          location: String(t.location || ''),
          assignees: Array.isArray(t.assignees) ? t.assignees : [],
        } as Task;
      } catch (err: any) {
        console.error('[Task Detail] Error fetching task:', err);
        throw err;
      }
    },
  });


  const { data: comments, isLoading: commentsLoading } = useQuery({
  queryKey: ['task-comments', taskId],
  enabled: !!taskId,
  queryFn: async () => {
    const res = await apiRequest<{ items: any[] }>(`/tasks/${taskId}/comments`);
    return res.data?.items || [];
  },
});

  const statusMutation = useMutation({
    mutationFn: async (newStatus: TaskStatus) => {
      try {
        const backendStatus = String(newStatus).replace('_', '-');
        await apiRequest<{ item: any }>(`/tasks/${taskId}/status`, {
          method: 'PATCH',
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

  const _noteMutation = useMutation({
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

  const noteMutation = useMutation({
    mutationFn: async (note: string) => {
      // This calls the same endpoint used by your web app's sendComment logic
      return await apiRequest(`/tasks/${taskId}/comments`, {
        method: 'POST',
        body: JSON.stringify({
          message: note,
        }),
      });
    },
    onSuccess: () => {
      setNewNote('');
       queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    },
    onError: (err) => {
      Alert.alert('Error', 'Failed to send note.');
      console.error(err);
    }
  });


  const handleStatusChange = useCallback(
    (newStatus: TaskStatus) => {
      Alert.alert(
        'Update Status',
        `Change status to "${newStatus.replace('_', ' ')}"?`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => setShowStatusDropdown(false) },
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

  if (!taskId) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Invalid task id</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <AlertCircle color={Colors.error} size={48} style={{ marginBottom: 16 }} />
        <Text style={styles.errorText}>
          {error instanceof Error ? error.message : 'Failed to load task'}
        </Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => queryClient.invalidateQueries({ queryKey: ['task', String(taskId)] })}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Back Button Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ChevronLeft color={Colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Task Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Task Title & Meta */}
        <View style={styles.topSection}>
          <View style={styles.metaRow}>
            <StatusBadge status={task.status} size="medium" />
            <PriorityIndicator priority={task.priority} />
          </View>
          <Text style={styles.title}>{task.title}</Text>
          <Text style={styles.description}>{task.description}</Text>
        </View>

        {/* Task Details Card */}
        <View style={styles.detailsCard}>
          {/* Location */}
          <View style={styles.detailRow}>
            <MapPin color={Colors.textTertiary} size={16} />
            <Text style={styles.detailLabel}>Location</Text>
            <Text style={styles.detailValue}>{task.location || task.category || 'Not specified'}</Text>
          </View>
          <View style={styles.detailDivider} />

          {/* Assigned Date */}
          <View style={styles.detailRow}>
            <CalendarDays color={Colors.textTertiary} size={16} />
            <Text style={styles.detailLabel}>Assigned</Text>
            <Text style={styles.detailValue}>
              {task.assignedDate ? new Date(task.assignedDate).toLocaleDateString() : 'N/A'}
            </Text>
          </View>
          <View style={styles.detailDivider} />

          {/* Due Date */}
          <View style={styles.detailRow}>
            <Clock color={Colors.textTertiary} size={16} />
            <Text style={styles.detailLabel}>Due Date</Text>
            <Text style={styles.detailValue}>{task.dueDate || 'No due date'}</Text>
          </View>
          <View style={styles.detailDivider} />

          {/* Assignees */}
          <View style={styles.assigneesRow}>
            <User color={Colors.textTertiary} size={16} />
            <Text style={styles.detailLabel}>Assignees</Text>
          </View>
          <View style={styles.assigneesList}>
            {task.assignees && task.assignees.length > 0 ? (
              task.assignees.map((assignee, idx) => (
                <View key={idx} style={styles.assigneeChip}>
                  <Text style={styles.assigneeText}>{assignee}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.noAssigneesText}>No assignees</Text>
            )}
          </View>
        </View>

        {/* Status Update Section */}
        <View style={styles.statusSection}>
          <Text style={styles.sectionTitle}>Task Status</Text>
          
          {/* Current Status Display */}
          <TouchableOpacity 
            style={styles.currentStatusBtn}
            onPress={() => setShowStatusDropdown(!showStatusDropdown)}
          >
            <View style={[styles.statusDot, { backgroundColor: 
              task.status === 'completed' ? '#22C55E' : 
              task.status === 'in_progress' ? '#3B82F6' : '#F59E0B'
            }]} />
            <Text style={styles.currentStatusText}>
              {task.status.replace('_', ' ').toUpperCase()}
            </Text>
          </TouchableOpacity>

          {/* Status Options Dropdown */}
          {showStatusDropdown && (
            <View style={styles.statusDropdown}>
              {STATUS_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.statusOption,
                    task.status === option.key && styles.statusOptionActive
                  ]}
                  onPress={() => handleStatusChange(option.key)}
                  disabled={statusMutation.isPending || task.status === option.key}
                >
                  <View style={[styles.statusDot, { backgroundColor: option.color }]} />
                  <Text style={[
                    styles.statusOptionText,
                    task.status === option.key && styles.statusOptionTextActive
                  ]}>
                    {option.label}
                  </Text>
                  {task.status === option.key && (
                    <CheckCircle2 color={option.color} size={16} style={styles.statusCheck} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Quick Action Buttons */}
          <View style={styles.quickActions}>
            {task.status === 'pending' && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.startBtn]}
                onPress={() => handleStatusChange('in_progress')}
                disabled={statusMutation.isPending}
              >
                <Loader color="#FFFFFF" size={18} />
                <Text style={styles.actionBtnText}>Start Task</Text>
              </TouchableOpacity>
            )}
            {task.status === 'in_progress' && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.completeBtn]}
                onPress={() => handleStatusChange('completed')}
                disabled={statusMutation.isPending}
              >
                <CheckCircle2 color="#FFFFFF" size={18} />
                <Text style={styles.actionBtnText}>Mark Complete</Text>
              </TouchableOpacity>
            )}
            {task.status === 'completed' && (
              <View style={styles.completedBanner}>
                <CheckCircle2 color={Colors.success} size={20} />
                <Text style={styles.completedText}>Task Completed</Text>
              </View>
            )}
          </View>
        </View>

        {/* Notes Section */}
        <View style={styles.notesSection}>
         {/* <View style={styles.notesTitleRow}>
            <MessageSquare color={Colors.primary} size={18} />
            <Text style={styles.sectionTitle}>Notes ({task.notes.length})</Text>
          </View>

          task.notes.map((note, idx) => (
            <View key={idx} style={styles.noteItem}>
              <View style={styles.noteBullet} />
              <Text style={styles.noteText}>{note}</Text>
            </View>
          ))*/}
          <View style={styles.notesSection}>
  <View style={styles.notesTitleRow}>
    <MessageSquare color={Colors.primary} size={18} />
    <Text style={styles.sectionTitle}>
      Comments ({comments?.length || 0})
    </Text>
  </View>

  {commentsLoading ? (
    <ActivityIndicator size="small" color={Colors.primary} />
  ) : comments?.length === 0 ? (
    <Text style={styles.noAssigneesText}>No comments yet.</Text>
  ) : (
    comments.map((comment: any) => (
      <View key={comment.id || comment._id} style={styles.commentContainer}>
        <View style={styles.commentHeader}>
          <Text style={styles.commentAuthor}>{comment.authorUsername}</Text>
          <Text style={styles.commentDate}>
            {new Date(comment.createdAt).toLocaleDateString()}
          </Text>
        </View>
        <Text style={styles.noteText}>{comment.message}</Text> 
      </View>
    ))
  )}

 
</View>

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

        {/* Photo Upload */}
        <TouchableOpacity style={styles.uploadBtn} activeOpacity={0.7}>
          <Camera color={Colors.secondary} size={20} />
          <Text style={styles.uploadBtnText}>Upload Photo Evidence</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  errorText: {
    fontSize: 16,
    color: Colors.error || '#EF4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600' as const,
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
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text,
    lineHeight: 28,
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
  assigneesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
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
    flexShrink: 1,
    textAlign: 'right',
  },
  detailDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: 12,
  },
  assigneesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingLeft: 24,
  },
  assigneeChip: {
    backgroundColor: Colors.infoLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  assigneeText: {
    fontSize: 12,
    color: Colors.secondary,
    fontWeight: '500' as const,
  },
  noAssigneesText: {
    fontSize: 13,
    color: Colors.textTertiary,
    fontStyle: 'italic',
  },
  statusSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 12,
  },
  currentStatusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  currentStatusText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  statusDropdown: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  statusOptionActive: {
    backgroundColor: Colors.infoLight,
  },
  statusOptionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.text,
  },
  statusOptionTextActive: {
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  statusCheck: {
    marginLeft: 'auto',
  },
  quickActions: {
    marginTop: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  startBtn: {
    backgroundColor: Colors.secondary,
  },
  completeBtn: {
    backgroundColor: Colors.success,
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FFFFFF',
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


  commentContainer: {
  backgroundColor: Colors.surface,
  padding: 12,
  borderRadius: 10,
  marginBottom: 10,
  borderWidth: 1,
  borderColor: Colors.borderLight,
},
commentHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginBottom: 4,
},
commentAuthor: {
  fontSize: 13,
  fontWeight: '700',
  color: Colors.primary,
},
commentDate: {
  fontSize: 11,
  color: Colors.textTertiary,
},
});
