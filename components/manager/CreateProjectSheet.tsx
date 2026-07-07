import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Plus, X, Users, Paperclip, ImageIcon, FolderPlus, Trash2 } from 'lucide-react-native';
import Colors from '@/constants/colors';

interface TaskDraft {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in-progress' | 'completed' | 'overdue';
}

interface CreateProjectSheetProps {
  activeEmployees: Array<{ id: string; name: string; initials: string }>;
  isCreating: boolean;
  onCreateProject: (projectData: any) => void;
  onOpenAddTaskModal: () => void;
  projectTasks: TaskDraft[];
  onRemoveTask: (index: number) => void;
  onCancel: () => void;
  onClose?: () => void;
}

export default function CreateProjectSheet({
  activeEmployees = [],       
  isCreating = false,        
  onCreateProject = () => {}, 
  onOpenAddTaskModal = () => {},
  projectTasks = [],         
  onRemoveTask = () => {},
  onCancel = () => {},
  onClose = () => {}
}: CreateProjectSheetProps) {
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [attachmentFiles, setAttachmentFiles] = useState<any[]>([]);

  const handlePickLogo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]) {
      setLogoUri(result.assets[0].uri);
    }
  };

  const handlePickAttachments = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        multiple: true,
      });

      if (!result.canceled && result.assets) {
        setAttachmentFiles((prev) => [...prev, ...result.assets]);
      }
    } catch (err) {
      console.log('Error picking documents:', err);
    }
  };

  const toggleAssignee = (name: string) => {
    setSelectedAssignees((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  const handleSubmit = () => {
    if (!projectName.trim()) {
      Alert.alert('Validation Error', 'Project Name is required.');
      return;
    }
    onCreateProject({
      name: projectName,
      description: projectDescription,
      assignees: selectedAssignees,
      logoUri,
      attachments: attachmentFiles,
      tasks: projectTasks
    });
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <Text style={styles.sheetTitle}>Create Project</Text>
      <Text style={styles.sheetSubtitle}>Create an enterprise workspace asset and distribute it.</Text>

      {/* Project Name */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Project Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="Project name"
          placeholderTextColor="#888"
          value={projectName}
          onChangeText={setProjectName}
        />
      </View>

      {/* Description */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Project Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Short project description"
          placeholderTextColor="#888"
          value={projectDescription}
          onChangeText={setProjectDescription}
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Logo Section */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Project Logo</Text>
        {/* ✅ FIXED: Replaced web <div> with native layout wrapper View components */}
        <View style={styles.logoRow}>
          <TouchableOpacity style={styles.rowButton} onPress={handlePickLogo}>
            <ImageIcon size={16} color={Colors.text || '#fff'} />
            <Text style={styles.rowButtonText}>Upload Logo</Text>
          </TouchableOpacity>
          {logoUri ? (
            <Image source={{ uri: logoUri }} style={styles.logoPreview} />
          ) : (
            <View style={styles.logoPlaceholder}>
              <Text style={styles.placeholderText}>No logo</Text>
            </View>
          )}
        </View>
      </View>

      {/* Multi Attachments Pickers */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Project Attachments</Text>
        <View style={styles.rowGrid}>
          <TouchableOpacity style={[styles.rowButton, { flex: 1 }]} onPress={handlePickAttachments}>
            <Paperclip size={16} color={Colors.text || '#fff'} />
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

      {/* Assignees Component Accordion Selector */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Assignees</Text>
        <TouchableOpacity style={styles.dropdownTrigger} onPress={() => setShowAssigneeDropdown(!showAssigneeDropdown)}>
          <Users size={16} color="#888" />
          <Text style={styles.dropdownTriggerText} numberOfLines={1}>
            {selectedAssignees.length > 0 ? selectedAssignees.join(', ') : 'Select assignees'}
          </Text>
        </TouchableOpacity>

        {showAssigneeDropdown && (
          <View style={styles.dropdownBox}>
            {activeEmployees.map((employee) => {
              const isChecked = selectedAssignees.includes(employee.name);
              return (
                <TouchableOpacity key={employee.id} style={styles.dropdownItem} onPress={() => toggleAssignee(employee.name)}>
                  <View style={[styles.checkbox, isChecked && styles.checkboxChecked]} />
                  <Text style={styles.dropdownItemText}>{employee.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {/* Dynamic Embedded Tasks List */}
      <View style={styles.tasksSection}>
        <View style={styles.tasksHeader}>
          <Text style={styles.label}>Project Tasks</Text>
          <TouchableOpacity style={styles.addTaskBtn} onPress={onOpenAddTaskModal}>
            <Plus size={14} color="#fff" />
            <Text style={styles.addTaskBtnText}>Add Task</Text>
          </TouchableOpacity>
        </View>

        {projectTasks.length > 0 ? (
          <View style={styles.tasksContainer}>
            {projectTasks.map((task, idx) => (
              <View key={idx} style={styles.taskCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.taskCardTitle}>{task.title || `Task ${idx + 1}`}</Text>
                  <Text style={styles.taskCardDesc} numberOfLines={1}>{task.description || 'No description'}</Text>
                  <View style={styles.badgeRow}>
                    <Text style={styles.badge}>{task.priority}</Text>
                    <Text style={styles.badge}>{task.status}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => onRemoveTask(idx)} style={styles.deleteTaskBtn}>
                  <X size={16} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyTasksBox}>
            <Text style={styles.emptyTasksText}>No tasks added yet. Add at least one task to build the project scope framework.</Text>
          </View>
        )}
      </View>

      {/* Action Footer Button Group */}
      <View style={styles.footerRow}>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={isCreating}>
          {isCreating ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitButtonText}>Create Project</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// Fixed missing container style configurations added down here
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  sheetTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 4 },
  sheetSubtitle: { fontSize: 13, color: '#8b949e', marginBottom: 24 },
  formGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#8b949e', marginBottom: 8 },
  input: { backgroundColor: '#161b22', borderWidth: 1, borderColor: '#30363d', borderRadius: 6, paddingHorizontal: 12, height: 40, color: '#fff', fontSize: 14 },
  textArea: { height: 80, paddingVertical: 8, textAlignVertical: 'top' },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#21262d', borderWidth: 1, borderColor: '#30363d', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6 },
  rowButtonText: { color: '#fff', fontSize: 13, fontWeight: '500' },
  logoPreview: { width: 44, height: 44, borderRadius: 6 },
  logoPlaceholder: { width: 44, height: 44, borderRadius: 6, backgroundColor: '#161b22', borderWidth: 1, borderColor: '#30363d', alignItems: 'center', justifyContent: 'center' },
  placeholderText: { color: '#8b949e', fontSize: 11 },
  rowGrid: { flexDirection: 'row', gap: 10 },
  filesRowContainer: { marginTop: 10, flexDirection: 'row' },
  fileCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#161b22', borderWidth: 1, borderColor: '#30363d', borderRadius: 20, paddingLeft: 12, paddingRight: 8, paddingVertical: 4, marginRight: 8 },
  fileCardText: { color: '#c9d1d9', fontSize: 12, maxWidth: 120 },
  dropdownTrigger: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#161b22', borderWidth: 1, borderColor: '#30363d', borderRadius: 6, paddingHorizontal: 12, height: 40 },
  dropdownTriggerText: { color: '#fff', fontSize: 14, flex: 1 },
  dropdownBox: { backgroundColor: '#161b22', borderWidth: 1, borderColor: '#30363d', borderRadius: 6, marginTop: 4, paddingVertical: 4 },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12 },
  dropdownItemText: { color: '#c9d1d9', fontSize: 14 },
  checkbox: { width: 16, height: 16, borderWidth: 1, borderColor: '#30363d', borderRadius: 4 },
  checkboxChecked: { backgroundColor: '#1f6feb', borderColor: '#1f6feb' },
  tasksSection: { marginTop: 8, marginBottom: 24 },
  tasksHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  addTaskBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#1f6feb', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6 },
  addTaskBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  tasksContainer: { gap: 10 },
  taskCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#161b22', borderWidth: 1, borderColor: '#30363d', padding: 12, borderRadius: 8 },
  taskCardTitle: { color: '#fff', fontSize: 14, fontWeight: '600' },
  taskCardDesc: { color: '#8b949e', fontSize: 12, marginTop: 2, marginBottom: 6 },
  badgeRow: { flexDirection: 'row', gap: 6 },
  badge: { backgroundColor: '#21262d', color: '#8b949e', fontSize: 10, fontWeight: '600', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, textTransform: 'uppercase' },
  deleteTaskBtn: { padding: 6 },
  emptyTasksBox: { backgroundColor: '#161b22', borderStyle: 'dashed', borderWidth: 1, borderColor: '#30363d', padding: 20, borderRadius: 8, alignItems: 'center' },
  emptyTasksText: { color: '#8b949e', fontSize: 12, textAlign: 'center', lineHeight: 18 },
  footerRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, paddingBottom: 40, marginTop: 10 },
  cancelButton: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 6 },
  cancelButtonText: { color: '#8b949e', fontSize: 14, fontWeight: '500' },
  submitButton: { backgroundColor: '#238636', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 6, justifyContent: 'center', alignItems: 'center', minWidth: 120 },
  submitButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' }
});