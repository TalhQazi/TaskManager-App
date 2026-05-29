import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Users, X, ChevronsUpDown, Paperclip } from 'lucide-react-native';
import Colors from '@/constants/colors';

interface CreateTaskSheetProps {
  isDirectTask: boolean;
  activeEmployees: Array<{ id: string; name: string; initials: string }>;
  isCreating: boolean;
  onAddTaskToProject: (taskData: any) => void; 
  onCreateStandaloneTask: (taskData: any) => void;
  onClose: () => void;
}

export default function CreateTaskSheet({
  isDirectTask,
  activeEmployees = [],
  isCreating = false,
  onAddTaskToProject = () => {},
  onCreateStandaloneTask = () => {},
  onClose = () => {}
}: CreateTaskSheetProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [status, setStatus] = useState<'pending' | 'in-progress' | 'completed' | 'overdue'>('pending');
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [showAssignees, setShowAssignees] = useState(false);
  const [attachmentFiles, setAttachmentFiles] = useState<any[]>([]);

  const handlePickAttachments = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', multiple: true });
      if (!result.canceled && result.assets) {
        setAttachmentFiles((prev) => [...prev, ...result.assets]);
      }
    } catch (err) {
      console.log(err);
    }
  };

  const toggleAssignee = (name: string) => {
    setSelectedAssignees((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  const handleSave = () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert('Validation Error', 'Task title and scope descriptions are required.');
      return;
    }

    const payload = {
      title,
      description,
      priority,
      status,
      assignees: selectedAssignees,
      attachments: attachmentFiles
    };

    if (isDirectTask) {
      onCreateStandaloneTask(payload);
    } else {
      onAddTaskToProject(payload);
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <Text style={styles.sheetTitle}>{isDirectTask ? 'Create Standalone Task' : 'Create Task'}</Text>
      <Text style={styles.sheetSubtitle}>
        {isDirectTask ? 'Deploy a standalone workforce directive module pipeline.' : 'Configure metrics under the staging project context.'}
      </Text>

      {/* Title */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Task Title *</Text>
        <TextInput 
          style={styles.input} 
          placeholder="Task title" 
          placeholderTextColor="#8b949e" 
          value={title} 
          onChangeText={setTitle} 
        />
      </View>

      {/* Description */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Task Description *</Text>
        <TextInput 
          style={[styles.input, styles.textArea]} 
          placeholder="Describe metrics requirement..." 
          placeholderTextColor="#8b949e" 
          value={description} 
          onChangeText={setDescription} 
          multiline 
          numberOfLines={3} 
        />
      </View>

      {/* Priority Selector Segment style synced with project buttons */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Priority</Text>
        <View style={styles.segmentContainer}>
          {(['high', 'medium', 'low'] as const).map((p) => (
            <TouchableOpacity key={p} style={[styles.segment, priority === p && styles.segmentSelected]} onPress={() => setPriority(p)}>
              <Text style={[styles.segmentText, priority === p && styles.segmentTextSelected]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Status Selector Segment style */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Status</Text>
        <View style={styles.segmentContainer}>
          {(['pending', 'in-progress', 'completed'] as const).map((s) => (
            <TouchableOpacity key={s} style={[styles.segment, status === s && styles.segmentSelected]} onPress={() => setStatus(s)}>
              <Text style={[styles.segmentText, status === s && styles.segmentTextSelected]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Assignees List Selector matched perfectly to Project Selector */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Assignees</Text>
        <TouchableOpacity style={styles.dropdownTrigger} onPress={() => setShowAssignees(!showAssignees)}>
          <Users size={16} color="#8b949e" />
          <Text style={styles.dropdownTriggerText} numberOfLines={1}>
            {selectedAssignees.length > 0 ? selectedAssignees.join(', ') : 'Select assignees'}
          </Text>
        </TouchableOpacity>

        {showAssignees && (
          <View style={styles.dropdownBox}>
            {activeEmployees.map((emp) => {
              const isChecked = selectedAssignees.includes(emp.name);
              return (
                <TouchableOpacity key={emp.id} style={styles.dropdownItem} onPress={() => toggleAssignee(emp.name)}>
                  <View style={[styles.checkbox, isChecked && styles.checkboxChecked]} />
                  <Text style={styles.dropdownItemText}>{emp.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {/* File Attachments */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Task Attachments</Text>
        <View style={styles.rowGrid}>
          <TouchableOpacity style={[styles.rowButton, { flex: 1 }]} onPress={handlePickAttachments}>
            <Paperclip size={16} color="#c9d1d9" />
            <Text style={styles.rowButtonText}>+ Add Files/Images</Text>
          </TouchableOpacity>
        </View>

        {attachmentFiles.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filesRowContainer}>
            {attachmentFiles.map((file, idx) => (
              <View key={idx} style={styles.fileCard}>
                <Text style={styles.fileCardText} numberOfLines={1}>{file.name}</Text>
                <TouchableOpacity onPress={() => setAttachmentFiles((p) => p.filter((_, i) => i !== idx))}>
                  <X size={14} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Action Footers matched directly to project layout configuration alignment */}
      <View style={styles.footerRow}>
        <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.submitButton} onPress={handleSave} disabled={isCreating}>
          {isCreating ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitButtonText}>{isDirectTask ? 'Create Task' : 'Add to Project'}</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16},
  sheetTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 4 },
  sheetSubtitle: { fontSize: 13, color: '#8b949e', marginBottom: 24 },
  formGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#8b949e', marginBottom: 8 },
  input: { backgroundColor: '#161b22', borderWidth: 1, borderColor: '#30363d', borderRadius: 6, paddingHorizontal: 12, height: 40, color: '#fff', fontSize: 14 },
  textArea: { height: 80, paddingVertical: 8, textAlignVertical: 'top' },
  
  // Segment design selectors mapping consistent text and boundaries
  segmentContainer: { flexDirection: 'row', gap: 8, backgroundColor: '#161b22', padding: 4, borderRadius: 6, borderWidth: 1, borderColor: '#30363d' },
  segment: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 4 },
  segmentSelected: { backgroundColor: '#1f6feb' },
  segmentText: { color: '#8b949e', fontSize: 12, textTransform: 'uppercase', fontWeight: '600' },
  segmentTextSelected: { color: '#fff' },

  // Dropdown assignees theme layout
  dropdownTrigger: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#161b22', borderWidth: 1, borderColor: '#30363d', borderRadius: 6, paddingHorizontal: 12, height: 40 },
  dropdownTriggerText: { color: '#fff', fontSize: 14, flex: 1 },
  dropdownBox: { backgroundColor: '#161b22', borderWidth: 1, borderColor: '#30363d', borderRadius: 6, marginTop: 4, paddingVertical: 4 },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12 },
  dropdownItemText: { color: '#c9d1d9', fontSize: 14 },
  checkbox: { width: 16, height: 16, borderWidth: 1, borderColor: '#30363d', borderRadius: 4 },
  checkboxChecked: { backgroundColor: '#1f6feb', borderColor: '#1f6feb' },

  // Attachments wrapper UI mirroring Project Sheet exactly
  rowGrid: { flexDirection: 'row', gap: 10 },
  rowButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#21262d', borderWidth: 1, borderColor: '#30363d', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6 },
  rowButtonText: { color: '#c9d1d9', fontSize: 13, fontWeight: '500' },
  filesRowContainer: { marginTop: 10, flexDirection: 'row' },
  fileCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#161b22', borderWidth: 1, borderColor: '#30363d', borderRadius: 20, paddingLeft: 12, paddingRight: 8, paddingVertical: 4, marginRight: 8 },
  fileCardText: { color: '#c9d1d9', fontSize: 12, maxWidth: 120 },

  // Aligned Button Layout Footer configurations
  footerRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, paddingBottom: 40, marginTop: 10 },
  cancelButton: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 6 },
  cancelButtonText: { color: '#8b949e', fontSize: 14, fontWeight: '500' },
  submitButton: { backgroundColor: '#238636', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 6, justifyContent: 'center', alignItems: 'center', minWidth: 120 },
  submitButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' }
});