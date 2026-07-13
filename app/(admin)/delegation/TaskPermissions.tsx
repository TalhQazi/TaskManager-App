import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  ActivityIndicator,
  Alert,
  Switch,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Shield, CheckCircle, XCircle, ChevronDown } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { apiRequest } from '@/services/api';

interface TaskPermission {
  id: string;
  taskId: string;
  canReassign: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Task {
  id: string;
  title: string;
  taskNumber?: string;
}

export default function TaskPermissions() {
  const queryClient = useQueryClient();
  const { uiTheme } = useTheme();

  const isMetallic = uiTheme?.theme === 'metallic-elite';

  const colors = useMemo(() => {
    const isDark = (uiTheme?.theme as string) === 'dark' || isMetallic;
    return {
      background: uiTheme?.panelColors?.dashboardBackground || (isDark ? '#080a0f' : '#f8fafc'),
      cardBg: uiTheme?.panelColors?.dashboardCardBackground || (isDark ? '#0f1117' : '#ffffff'),
      text: uiTheme?.panelColors?.dashboardTextColor || (isDark ? '#ffffff' : '#0f172a'),
      textSecondary: isDark ? '#94a3b8' : '#64748b',
      border: uiTheme?.panelColors?.borderColor || (isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'),
      primary: uiTheme?.customColors?.primary || '#0072FF',
      error: '#ef4444',
      success: '#10b981',
    };
  }, [uiTheme, isMetallic]);

  const styles = useMemo(() => createStyles(colors), [colors]);

  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [taskPickerOpen, setTaskPickerOpen] = useState(false);
  const [formData, setFormData] = useState({
    taskId: '',
    canReassign: true,
  });

  const { data: permissionsData = [], isLoading: loadingPermissions } = useQuery({
    queryKey: ['task-permissions'],
    queryFn: async () => {
      const res = await apiRequest('/task-permissions');
      return res?.items || res?.data?.items || [];
    },
  });

  const { data: tasksData = [], isLoading: loadingTasks } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const res = await apiRequest('/tasks');
      return res?.items || res?.data?.items || [];
    },
  });

  const isLoading = loadingPermissions || loadingTasks;
  const permissions: TaskPermission[] = Array.isArray(permissionsData) ? permissionsData : [];
  const tasks: Task[] = Array.isArray(tasksData) ? tasksData : [];

  const addPermissionMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest('/task-permissions', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-permissions'] });
      setDialogOpen(false);
      setFormData({ taskId: '', canReassign: true });
      Alert.alert('Success', 'Permission saved');
    },
    onError: () => Alert.alert('Error', 'Failed to save'),
  });

  const deletePermissionMutation = useMutation({
    mutationFn: async (taskId: string) => {
      return await apiRequest(`/task-permissions?taskId=${taskId}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-permissions'] });
    },
    onError: () => Alert.alert('Error', 'Failed to delete'),
  });

  const handleSubmit = () => {
    if (!formData.taskId) {
      Alert.alert('Validation Error', 'Task selection is required');
      return;
    }
    addPermissionMutation.mutate(formData);
  };

  const confirmDelete = (taskId: string, title: string) => {
    Alert.alert('Delete Permission', `Delete permission for "${title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deletePermissionMutation.mutate(taskId) },
    ]);
  };

  const getTaskTitle = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    return task ? `${task.taskNumber ? `#${task.taskNumber} ` : ''}${task.title}` : 'Select a task';
  };

  const filteredPermissions = useMemo(() => {
    return permissions.filter((p) =>
      getTaskTitle(p.taskId).toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [permissions, searchTerm, tasks]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTextContainer}>
          <Text style={styles.title}>Task Permissions</Text>
          <Text style={styles.subtitle}>Manage task-specific reassignment</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => setDialogOpen(true)}>
          <Plus size={16} color={colors.background} />
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filteredPermissions.length === 0 ? (
        <View style={styles.centerContainer}>
          <Shield size={48} color={colors.textSecondary} style={{ opacity: 0.5, marginBottom: 12 }} />
          <Text style={styles.emptyTitle}>No permissions found</Text>
        </View>
      ) : (
        <FlatList
          data={filteredPermissions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const title = getTaskTitle(item.taskId);
            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.taskTitle}>{title}</Text>
                  <TouchableOpacity onPress={() => confirmDelete(item.taskId, title)}>
                    <Trash2 size={20} color={colors.error} />
                  </TouchableOpacity>
                </View>
                <View style={styles.cardBody}>
                  <View style={[styles.badge, { backgroundColor: item.canReassign ? colors.success + '20' : colors.error + '20' }]}>
                    {item.canReassign ? <CheckCircle size={14} color={colors.success} /> : <XCircle size={14} color={colors.error} />}
                    <Text style={[styles.badgeText, { color: item.canReassign ? colors.success : colors.error }]}>
                      {item.canReassign ? 'Allowed' : 'Blocked'}
                    </Text>
                  </View>
                  <Text style={styles.dateText}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                </View>
              </View>
            );
          }}
          contentContainerStyle={styles.listContent}
        />
      )}

      <Modal visible={dialogOpen} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <Text style={styles.modalTitle}>Add Task Permission</Text>
            
            <Text style={styles.label}>Select Task</Text>
            <TouchableOpacity style={styles.dropdown} onPress={() => setTaskPickerOpen(true)}>
              <Text style={{ color: colors.text }}>{getTaskTitle(formData.taskId)}</Text>
              <ChevronDown size={16} color={colors.textSecondary} />
            </TouchableOpacity>

            <View style={styles.switchContainer}>
              <Text style={styles.label}>Allow reassignment</Text>
              <Switch
                value={formData.canReassign}
                onValueChange={(val) => setFormData({ ...formData, canReassign: val })}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setDialogOpen(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.submitButton, { backgroundColor: colors.primary }]} onPress={handleSubmit}>
                <Text style={styles.submitButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={taskPickerOpen} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.pickerModalContent, { backgroundColor: colors.background }]}>
            <Text style={styles.modalTitle}>Select Task</Text>
            <FlatList
              data={tasks}
              keyExtractor={(t) => t.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.pickerItem}
                  onPress={() => {
                    setFormData({ ...formData, taskId: item.id });
                    setTaskPickerOpen(false);
                  }}
                >
                  <Text style={{ color: colors.text }}>{item.taskNumber ? `#${item.taskNumber} ` : ''}{item.title}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.cancelButton} onPress={() => setTaskPickerOpen(false)}>
              <Text style={styles.cancelButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  headerTextContainer: { flex: 1 },
  title: { fontSize: 24, fontWeight: 'bold', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  addButton: { flexDirection: 'row', backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  addButtonText: { color: colors.background, fontWeight: '600', marginLeft: 6 },
  listContent: { paddingHorizontal: 20, paddingBottom: 20 },
  card: { backgroundColor: colors.cardBg, padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  taskTitle: { fontSize: 16, fontWeight: '600', color: colors.text, flex: 1, marginRight: 12 },
  cardBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 16 },
  badgeText: { fontSize: 12, fontWeight: '600', marginLeft: 4 },
  dateText: { fontSize: 12, color: colors.textSecondary },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.text },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '80%' },
  pickerModalContent: { height: '60%', width: '90%', borderRadius: 20, padding: 20, alignSelf: 'center' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 },
  dropdown: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 8, marginBottom: 20 },
  pickerItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  switchContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  cancelButton: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  cancelButtonText: { color: colors.text, fontWeight: '600' },
  submitButton: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, minWidth: 140, alignItems: 'center' },
  submitButtonText: { color: colors.background, fontWeight: '600' }
});