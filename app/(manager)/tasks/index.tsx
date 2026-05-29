import { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  Alert,
  Dimensions,
} from 'react-native';
import {
  Search,
  ChevronLeft,
  Clock,
  MapPin,
  Calendar,
  User,
  Folder,
  CheckSquare,
  Send,
} from 'lucide-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL, apiRequest } from '@/services/api';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';

import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { getRemainingTime, getTimerState } from '@/util/taskTimer';
import { useGlobalTimer } from '@/hooks/useGlobalTimer';

// Modals / Sheets Components
import CreateExpenseSheet from '../expense/CreateExpenseSheet';
import ExpenseSheetList from '../expense/ExpenseSheetList';

import CreateTaskSheet from '@/components/manager/CreateTaskSheet';
import CreateProjectSheet from '@/components/manager/CreateProjectSheet';
import { ProjectLogoImg } from '@/components/ProjectLogoImg';

interface Project {
  id: string;
  name: string;
  description?: string;
  assignees?: string[];
  logo?: { url?: string };
  attachments?: Array<{ fileName: string; url: string; mimeType: string }>;
  status?: string;
  createdAt?: string;
  tasks: Task[];
  taskCount?: number;
}

interface Task {
  id: string;
  title: string;
  description: string;
  assignees: string[];
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in-progress' | 'completed' | 'overdue';
  dueDate?: string;
  dueTime?: string;
  location?: string;
  projectId?: string;
  createdAt?: string;
  attachments?: Array<{ fileName: string; url: string; mimeType: string }>;
}

interface Comment {
  id: string;
  taskId: string;
  message: string;
  authorUsername: string;
  authorRole?: string;
  createdAt: string;
}

type ViewMode = 'list' | 'project' | 'task-detail';

export default function ManagerTasksScreen() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const scrollViewRef = useRef<ScrollView>(null);
  const now = useGlobalTimer();

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [commentDraft, setCommentDraft] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);

  // Modal Control States
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isExpenseListOpen, setIsExpenseListOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  // Staging Draft Array for Creating Project Tasks inside the Create Project View Flow
  const [projectTasksDraft, setProjectTasksDraft] = useState<any[]>([]);

  // Dummy placeholder dataset for employee dropdown picking
  const activeEmployees = [
    { id: '1', name: 'Suvasis Samantaray', initials: 'SS' },
    { id: '2', name: 'Upendra Rautray', initials: 'UR' },
    { id: '3', name: 'Raghunath Pattnayak', initials: 'RP' }
  ];

  // Fetch projects
  const { data: projects = [], isLoading: projectsLoading, refetch: refetchProjects } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await apiRequest<{ items?: Project[] }>('/projects');
     console.log(res.items)
      return res.data?.items || [];
    },
  });

  // Fetch standalone tasks
  const { data: standaloneTasks = [], isLoading: tasksLoading, refetch: refetchTasks } = useQuery<Task[]>({
    queryKey: ['tasks'],
    queryFn: async () => {
      const res = await apiRequest<{ items?: Task[] }>('/tasks');
      const tasks = res.data?.items || [];
      return tasks.filter((t: Task) => !t.projectId);
    },
  });

  // Create Project API Mutation
  const createProjectMutation = useMutation({
    mutationFn: async (projectPayload: any) => {
      const res = await apiRequest('/projects', {
        method: 'POST',
        body: JSON.stringify(projectPayload),
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setIsProjectModalOpen(false);
      setProjectTasksDraft([]);
      Alert.alert('Success', 'Project workspace created successfully.');
    },
    onError: (error) => {
      Alert.alert('Error', 'Failed to create new project asset workflow.');
      console.error(error);
    }
  });

  // Create Task API Mutation
  const createTaskMutation = useMutation({
    mutationFn: async (taskPayload: any) => {
      const res = await apiRequest('/tasks', {
        method: 'POST',
        body: JSON.stringify(taskPayload),
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      if (selectedProject) {
        loadProject(selectedProject.id);
      }
      setIsTaskModalOpen(false);
    },
    onError: (error) => {
      Alert.alert('Error', 'Could not sync task creation pipeline.');
      console.error(error);
    }
  });

  const loadProject = async (projectId: string) => {
    try {
      const res = await apiRequest<{ item?: Project }>(`/projects/${projectId}`);
      if (res.data?.item) {
        setSelectedProject(res.data.item);
        setViewMode('project');
      }
    } catch (err) {
      console.error('Failed to load project:', err);
    }
  };

  const getTimerColor = (state: string) => {
    switch (state) {
      case 'normal': return '#16a34a';
      case 'warning': return '#eab308';
      case 'critical': return '#ef4444';
      case 'overdue': return '#dc2626';
      default: return Colors.textSecondary || '#666';
    }
  };

  const loadComments = async (taskId: string) => {
    try {
      const res = await apiRequest<{ items?: Comment[] }>(`/tasks/${taskId}/comments`);
      setComments(res.data?.items || []);
    } catch (err) {
      console.error('Failed to load comments:', err);
    }
  };

  const sendCommentMutation = useMutation({
    mutationFn: async ({ taskId, message }: { taskId: string; message: string }) => {
      await apiRequest(`/tasks/${taskId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ message }),
      });
    },
    onSuccess: () => {
      if (selectedTask) {
        loadComments(selectedTask.id);
      }
      setCommentDraft('');
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: string }) => {
      const res = await apiRequest<{ item?: Task }>(`/tasks/${taskId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      return res.data?.item;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchProjects(), refetchTasks()]);
    setRefreshing(false);
  }, [refetchProjects, refetchTasks]);

  const openTaskDetail = (task: Task) => {
    setSelectedTask(task);
    loadComments(task.id);
    setViewMode('task-detail');
  };

  const handleSendComment = () => {
    if (!commentDraft.trim() || !selectedTask) return;
    sendCommentMutation.mutate({ taskId: selectedTask.id, message: commentDraft });
  };

  const handleStatusUpdate = (status: Task['status']) => {
    if (!selectedTask) return;
    updateStatusMutation.mutate({ taskId: selectedTask.id, status });
    setSelectedTask({ ...selectedTask, status });
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString();
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return Colors.error || '#ef4444';
      case 'medium': return Colors.warning || '#eab308';
      case 'low': return Colors.success || '#22c55e';
      default: return Colors.textSecondary || '#666';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return Colors.success || '#22c55e';
      case 'in-progress': return Colors.primary || '#3b82f6';
      case 'pending': return Colors.warning || '#eab308';
      case 'overdue': return Colors.error || '#ef4444';
      default: return Colors.textSecondary || '#666';
    }
  };

  const filterTasks = (tasks: Task[]) => {
    return tasks.filter((task) => {
      const matchesSearch = 
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.assignees.some(a => a.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesSearch;
    });
  };

  const getMimeType = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return 'application/pdf';
      case 'doc':
      case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'jpg':
      case 'jpeg': return 'image/jpeg';
      case 'png': return 'image/png';
      default: return '*/*';
    }
  };

  const openAttachment = async (taskId: string, index: number, fileName: string) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const url = `${API_BASE_URL}/tasks/${taskId}/attachments/${index}/download`;
      const ext = fileName.split('.').pop();
      const fileUri = FileSystem.documentDirectory + `file_${Date.now()}.${ext}`;

      const result = await FileSystem.downloadAsync(url, fileUri, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (result.status !== 200) throw new Error("Download failed");

      if (Platform.OS === 'android') {
        const contentUri = await FileSystem.getContentUriAsync(result.uri);
        await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
          data: contentUri,
          flags: 1,
          type: getMimeType(fileName),
        });
      } else {
        await Sharing.shareAsync(result.uri);
      }
    } catch (err) {
      console.log("Open error:", err);
      Alert.alert("Error", "Could not open attachment.");
    }
  };

  // Callback to intercept task payload creation
  const handleTaskFormSubmit = (taskPayload: any) => {
    if (isProjectModalOpen) {
      // If project setup wizard sheet is visible, save task inside local draft array state
      setProjectTasksDraft((prev) => [...prev, taskPayload]);
      setIsTaskModalOpen(false);
    } else {
      // Create Standalone Task or Directly Add Task under an existing project context
      const targetProjectId = selectedProject?.id || undefined;
      createTaskMutation.mutate({ ...taskPayload, projectId: targetProjectId });
    }
  };

  const filteredStandaloneTasks = filterTasks(standaloneTasks);

  if ((projectsLoading || tasksLoading) && !refreshing) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Tasks</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading tasks...</Text>
        </View>
      </View>
    );
  }

  // TASK DETAIL VIEW
  if (viewMode === 'task-detail' && selectedTask) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.detailHeader}>
          <TouchableOpacity
            onPress={() => setViewMode(selectedProject ? 'project' : 'list')}
            style={styles.backButton}
          >
            <ChevronLeft size={24} color={Colors.text || '#fff'} />
          </TouchableOpacity>
          <Text style={styles.detailHeaderTitle} numberOfLines={1}>Task Details</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.detailContent} showsVerticalScrollIndicator={false} ref={scrollViewRef}>
          <View style={styles.taskInfoCard}>
            <Text style={styles.taskTitle}>{selectedTask.title}</Text>
            <Text style={styles.taskDescription}>{selectedTask.description}</Text>
            {(() => {
              const timer = getRemainingTime(selectedTask.dueDate, now);
              if (!timer) return null;
              const state = getTimerState(timer.totalMs);
              return (
                <Text style={[styles.detailTimerText, { color: getTimerColor(state) }]}>
                  ⏱ Remaining Time: {timer.formatted}
                </Text>
              );
            })()}

            <View style={styles.badgesRow}>
              <View style={[styles.badge, { backgroundColor: `${getPriorityColor(selectedTask.priority)}20` }]}>
                <Text style={[styles.badgeText, { color: getPriorityColor(selectedTask.priority) }]}>
                  {selectedTask.priority.toUpperCase()}
                </Text>
              </View>
              <View style={[styles.badge, { backgroundColor: `${getStatusColor(selectedTask.status)}20` }]}>
                <Text style={[styles.badgeText, { color: getStatusColor(selectedTask.status) }]}>
                  {selectedTask.status.replace('-', ' ').toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <Calendar size={16} color={Colors.textTertiary || '#888'} />
                <Text style={styles.detailLabel}>Due Date</Text>
                <Text style={styles.detailValue}>{formatDate(selectedTask.dueDate)}</Text>
              </View>
              <View style={styles.detailItem}>
                <Clock size={16} color={Colors.textTertiary || '#888'} />
                <Text style={styles.detailLabel}>Due Time</Text>
                <Text style={styles.detailValue}>{selectedTask.dueTime || '—'}</Text>
              </View>
              <View style={styles.detailItem}>
                <MapPin size={16} color={Colors.textTertiary || '#888'} />
                <Text style={styles.detailLabel}>Location</Text>
                <Text style={styles.detailValue}>{selectedTask.location || '—'}</Text>
              </View>
              <View style={styles.detailItem}>
                <User size={16} color={Colors.textTertiary || '#888'} />
                <Text style={styles.detailLabel}>Assignees</Text>
                <Text style={styles.detailValue} numberOfLines={1}>
                  {selectedTask.assignees.length > 0 ? selectedTask.assignees.join(', ') : 'Unassigned'}
                </Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Update Status</Text>
            <View style={styles.statusButtons}>
              {(['pending', 'in-progress', 'completed', 'overdue'] as const).map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[styles.statusButton, selectedTask.status === status && { 
                    backgroundColor: getStatusColor(status),
                    borderColor: getStatusColor(status),
                  }]}
                  onPress={() => handleStatusUpdate(status)}
                >
                  <Text style={[styles.statusButtonText, selectedTask.status === status && { color: Colors.surface || '#000' }]}>
                    {status.replace('-', ' ').toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {selectedTask.attachments && selectedTask.attachments.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Attachments ({selectedTask.attachments.length})</Text>
                <View style={styles.attachmentsList}>
                  {selectedTask.attachments.map((att, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.attachmentItem}
                      onPress={() => {
                        const attachment = selectedTask.attachments?.[idx];
                        if (!attachment) return;
                        openAttachment(selectedTask.id, idx, attachment.fileName);
                      }}
                    >
                      <Text style={styles.attachmentName}>📄 {att.fileName}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </View>

          <View style={styles.commentsSection}>
            <Text style={styles.sectionTitle}>Comments ({comments.length})</Text>
            {comments.length === 0 ? (
              <View style={styles.emptyComments}>
                <Text style={styles.emptyCommentsText}>No comments yet</Text>
              </View>
            ) : (
              comments.map((comment) => (
                <View key={comment.id} style={styles.commentCard}>
                  <View style={styles.commentHeader}>
                    <View style={styles.commentAvatar}>
                      <Text style={styles.commentAvatarText}>
                        {comment.authorUsername?.slice(0, 2).toUpperCase() || '?'}
                      </Text>
                    </View>
                    <View style={styles.commentMeta}>
                      <Text style={styles.commentAuthor}>{comment.authorUsername}</Text>
                      <Text style={styles.commentTime}>{formatMessageTime(comment.createdAt)}</Text>
                    </View>
                  </View>
                  <Text style={styles.commentMessage}>{comment.message}</Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>

        <View style={styles.commentInputContainer}>
          <TextInput
            style={styles.commentInput}
            placeholder="Type a comment..."
            placeholderTextColor={Colors.textTertiary || '#888'}
            value={commentDraft}
            onChangeText={setCommentDraft}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendButton, !commentDraft.trim() && styles.sendButtonDisabled]}
            onPress={handleSendComment}
            disabled={!commentDraft.trim() || sendCommentMutation.isPending}
          >
            <Send size={20} color={commentDraft.trim() ? '#fff' : '#666'} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // PROJECT VIEW
  if (viewMode === 'project' && selectedProject) {
    const projectTasks = filterTasks(selectedProject.tasks || []);
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setViewMode('list')} style={styles.backButton}>
            <ChevronLeft size={24} color={Colors.text || '#fff'} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{selectedProject.name}</Text>
          <TouchableOpacity style={styles.miniActionButton} onPress={() => setIsTaskModalOpen(true)}>
            <Text style={styles.actionButtonText}>+ Task</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.projectInfoCard}>
          <View style={styles.projectActions}>
            <TouchableOpacity style={styles.actionButton} onPress={() => setIsExpenseModalOpen(true)}>
              <Text style={styles.actionButtonText}>+ Create Expense</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, styles.secondaryActionButton]} onPress={() => setIsExpenseListOpen(true)}>
              <Text style={styles.secondaryActionButtonText}>View Expenses</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.projectDescription}>{selectedProject.description || 'No description'}</Text>
          <Text style={styles.projectMeta}>
            {selectedProject.assignees && selectedProject.assignees.length > 0 
              ? `Assignees: ${selectedProject.assignees.join(', ')}` 
              : 'No assignees'}
          </Text>
          <Text style={styles.projectMeta}>{projectTasks.length} tasks in this project</Text>
        </View>

        <View style={styles.filtersContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search tasks..."
            placeholderTextColor={Colors.textTertiary || '#888'}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {projectTasks.length === 0 ? (
            <View style={styles.emptyState}>
              <CheckSquare size={48} color={Colors.textTertiary || '#888'} />
              <Text style={styles.emptyText}>No tasks found</Text>
            </View>
          ) : (
            projectTasks.map((task) => (
              <TouchableOpacity key={task.id} style={styles.taskCard} onPress={() => openTaskDetail(task)}>
                <View style={styles.taskCardHeader}>
                  <Text style={styles.taskCardTitle} numberOfLines={1}>{task.title}</Text>
                  <View style={[styles.priorityDot, { backgroundColor: getPriorityColor(task.priority) }]} />
                </View>
                <Text style={styles.taskCardDesc} numberOfLines={2}>{task.description}</Text>
                {(() => {
                  const timer = getRemainingTime(task.dueDate, now);
                  if (!timer) return null;
                  const state = getTimerState(timer.totalMs);
                  return (
                    <Text style={[styles.timerText, { color: getTimerColor(state) }]}>
                      ⏱ {timer.formatted}
                    </Text>
                  );
                })()}
                <View style={styles.taskCardFooter}>
                  <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(task.status)}20` }]}>
                    <Text style={[styles.statusBadgeText, { color: getStatusColor(task.status) }]}>{task.status}</Text>
                  </View>
                  <Text style={styles.taskCardDate}>{formatDate(task.dueDate)}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>

        {/* Expense Operations Overlays */}
        <Modal visible={isExpenseModalOpen} animationType="slide" transparent={false} onRequestClose={() => setIsExpenseModalOpen(false)}>
          <View style={styles.fullScreenModal}>
            <View style={styles.modalNavHeader}>
              <Text style={styles.modalTitle}>Create Expense Sheet</Text>
              <TouchableOpacity onPress={() => setIsExpenseModalOpen(false)}>
                <Text style={styles.closeText}>Close</Text>
              </TouchableOpacity>
            </View>
            <CreateExpenseSheet projectId={selectedProject?.id} onClose={() => setIsExpenseModalOpen(false)} />
          </View>
        </Modal>

        <Modal visible={isExpenseListOpen} animationType="slide" transparent={false} onRequestClose={() => setIsExpenseListOpen(false)}>
          <View style={styles.fullScreenModal}>
            <View style={styles.modalNavHeader}>
              <Text style={styles.modalTitle}>Expense Sheets</Text>
              <TouchableOpacity onPress={() => setIsExpenseListOpen(false)}>
                <Text style={styles.closeText}>Close</Text>
              </TouchableOpacity>
            </View>
            <ExpenseSheetList projectId={selectedProject?.id} />
          </View>
        </Modal>

        {/* Create Task Modal Overlay Context inside project view */}
        <Modal visible={isTaskModalOpen} animationType="slide" transparent={false} onRequestClose={() => setIsTaskModalOpen(false)}>
          <View style={styles.fullScreenModal}>
            <View style={styles.modalNavHeader}>
              <Text style={styles.modalTitle}>Create Task</Text>
              <TouchableOpacity onPress={() => setIsTaskModalOpen(false)}>
                <Text style={styles.closeText}>Close</Text>
              </TouchableOpacity>
            </View>
            <CreateTaskSheet 
              isDirectTask={false} 
              activeEmployees={activeEmployees} 
              isCreating={createTaskMutation.isPending}
              onAddTaskToProject={handleTaskFormSubmit}
              onCreateStandaloneTask={handleTaskFormSubmit}
              onClose={() => setIsTaskModalOpen(false)} 
            />
          </View>
        </Modal>
      </View>
    );
  }

  // MAIN LIST VIEW (Projects + Standalone Tasks)
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Tasks</Text>
        <View style={styles.headerButtonRow}>
          <TouchableOpacity style={styles.miniActionButton} onPress={() => setIsProjectModalOpen(true)}>
            <Text style={styles.actionButtonText}>+ Project</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.miniActionButton} onPress={() => setIsTaskModalOpen(true)}>
            <Text style={styles.actionButtonText}>+ Task</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.filtersContainer}>
        <View style={styles.searchBox}>
          <Search size={20} color={Colors.textTertiary || '#888'} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search tasks or assignees..."
            placeholderTextColor={Colors.textTertiary || '#888'}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing || projectsLoading || tasksLoading} onRefresh={onRefresh} />}
      >
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Projects</Text>
          {projects.length === 0 ? (
            <View style={styles.emptyState}>
              <Folder size={48} color={Colors.textTertiary || '#888'} />
              <Text style={styles.emptyText}>No projects found</Text>
            </View>
          ) : (
            projects.map((project) => (
              <TouchableOpacity key={project.id} style={styles.projectCard} onPress={() => loadProject(project.id)}>
                <View style={styles.projectCardHeader}>
                  {/*project.logo?.url ? (
                    <Image source={{ uri: project.logo.url }} style={styles.projectLogo} />
                  ) : (
                    <View style={styles.projectLogoPlaceholder}>
                      <Folder size={20} color={Colors.textTertiary || '#888'} />
                    </View>
                  )*/}
                  <ProjectLogoImg
                  projectId={project.id}
                  projectName={project.name}
                  logoUrl={project.logo?.url}
                />
                  <View style={styles.projectCardInfo}>
                    <Text style={styles.projectCardName} numberOfLines={1}>{project.name}

                      
                    </Text>
                    <Text style={styles.projectCardDesc} numberOfLines={1}>{project.description || 'No description'}</Text>
                  </View>
                </View>
                <View style={styles.projectCardFooter}>
                  <Text style={styles.projectCardMeta}>{project.taskCount || (project.tasks?.length || 0)} tasks</Text>
                  <View style={[styles.statusBadge, { backgroundColor: '#e0f2fe' }]}>
                    <Text style={[styles.statusBadgeText, { color: '#0369a1' }]}>{project.status || 'Active'}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Standalone Tasks</Text>
          {filteredStandaloneTasks.length === 0 ? (
            <View style={styles.emptyState}>
              <CheckSquare size={48} color={Colors.textTertiary || '#888'} />
              <Text style={styles.emptyText}>No standalone tasks</Text>
            </View>
          ) : (
            filteredStandaloneTasks.map((task) => (
              <TouchableOpacity key={task.id} style={styles.taskCard} onPress={() => openTaskDetail(task)}>
                <View style={styles.taskCardHeader}>
                  <Text style={styles.taskCardTitle} numberOfLines={1}>{task.title}</Text>
                  <View style={[styles.priorityDot, { backgroundColor: getPriorityColor(task.priority) }]} />
                </View>
                <Text style={styles.taskCardDesc} numberOfLines={2}>{task.description}</Text>
                {(() => {
                  const timer = getRemainingTime(task.dueDate, now);
                  if (!timer) return null;
                  const state = getTimerState(timer.totalMs);
                  return (
                    <Text style={[styles.timerText, { color: getTimerColor(state) }]}>
                      ⏱ {timer.formatted}
                    </Text>
                  );
                })()}
                <View style={styles.taskCardFooter}>
                  <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(task.status)}20` }]}>
                    <Text style={[styles.statusBadgeText, { color: getStatusColor(task.status) }]}>{task.status}</Text>
                  </View>
                  <Text style={styles.taskCardDate}>{formatDate(task.dueDate)}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* FIXED CRASH: Injected core fallback props to eliminate undefined mapping errors */}
      <Modal visible={isProjectModalOpen} animationType="slide" transparent={false} onRequestClose={() => setIsProjectModalOpen(false)}>
        <View style={styles.fullScreenModal}>
          <View style={styles.modalNavHeader}>
            <Text style={styles.modalTitle}>Create Project</Text>
            <TouchableOpacity onPress={() => setIsProjectModalOpen(false)}>
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>
          <CreateProjectSheet 
            activeEmployees={activeEmployees}
            isCreating={createProjectMutation.isPending}
            projectTasks={projectTasksDraft}
            onOpenAddTaskModal={() => setIsTaskModalOpen(true)}
            onRemoveTask={(idx) => setProjectTasksDraft((p) => p.filter((_, i) => i !== idx))}
            onCancel={() => setIsProjectModalOpen(false)}
            onCreateProject={(payload) => createProjectMutation.mutate(payload)}
          />
        </View>
      </Modal>

      {/* Global Context Standalone Task Creator Modal */}
      <Modal visible={isTaskModalOpen} animationType="slide" transparent={false} onRequestClose={() => setIsTaskModalOpen(false)}>
        <View style={styles.fullScreenModal}>
          <View style={styles.modalNavHeader}>
            <Text style={styles.modalTitle}>{isProjectModalOpen ? "Add Task to Project" : "Create Task"}</Text>
            <TouchableOpacity onPress={() => setIsTaskModalOpen(false)}>
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>
          <CreateTaskSheet 
            isDirectTask={!isProjectModalOpen}
            activeEmployees={activeEmployees}
            isCreating={createTaskMutation.isPending}
            onAddTaskToProject={handleTaskFormSubmit}
            onCreateStandaloneTask={handleTaskFormSubmit}
            onClose={() => setIsTaskModalOpen(false)}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1117', paddingTop: Platform.OS === 'ios' ? 50 : 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  title: { fontSize: 24, fontWeight: '700', color: '#fff' },
  headerButtonRow: { flexDirection: 'row', gap: 8 },
  miniActionButton: { backgroundColor: '#1f6feb', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
  actionButtonText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  filtersContainer: { paddingHorizontal: 16, marginBottom: 12 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#161b22', borderRadius: 8, paddingHorizontal: 10, borderHeight: 1, borderWidth: 1, borderColor: '#30363d' },
  searchInput: { flex: 1, height: 40, color: '#fff', marginLeft: 8, fontSize: 14 },
  content: { flex: 1, paddingHorizontal: 16 },
  section: { marginBottom: 24 },
  sectionHeader: { fontSize: 16, fontWeight: '600', color: '#8b949e', marginBottom: 12 },
  projectCard: { backgroundColor: '#161b22', borderRadius: 8, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#30363d' },
  projectCardHeader: { flexDirection: 'row', alignItems: 'center' },
  projectLogo: { width: 36, height: 36, borderRadius: 6 },
  projectLogoPlaceholder: { width: 36, height: 36, borderRadius: 6, backgroundColor: '#21262d', alignItems: 'center', justifyContent: 'center' },
  projectCardInfo: { flex: 1, marginLeft: 12 },
  projectCardName: { color: '#fff', fontSize: 15, fontWeight: '600' },
  projectCardDesc: { color: '#8b949e', fontSize: 13, marginTop: 2 },
  projectCardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, borderTopWidth: 1, borderTopColor: '#30363d', paddingTop: 8 },
  projectCardMeta: { color: '#8b949e', fontSize: 12 },
  taskCard: { backgroundColor: '#161b22', borderRadius: 8, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#30363d' },
  taskCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  taskCardTitle: { color: '#fff', fontSize: 15, fontWeight: '600', flex: 1 },
  priorityDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 8 },
  taskCardDesc: { color: '#8b949e', fontSize: 13, marginTop: 4, marginBottom: 8 },
  timerText: { fontSize: 12, fontWeight: '600', marginBottom: 8 },
  taskCardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  statusBadgeText: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  taskCardDate: { color: '#8b949e', fontSize: 12 },
  emptyState: { padding: 32, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#8b949e', fontSize: 14, marginTop: 8 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#8b949e', fontSize: 14, marginTop: 12 },
  
  // Full-screen Modal Architecture for mobile execution comfort
  fullScreenModal: { flex: 1, backgroundColor: '#0D1117', paddingTop: Platform.OS === 'ios' ? 50 : 20 },
  modalNavHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#30363d' },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#fff' },
  closeText: { color: '#58a6ff', fontSize: 15 },

  // Detail View Architectures
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#30363d' },
  backButton: { padding: 4 },
  detailHeaderTitle: { color: '#fff', fontSize: 16, fontWeight: '600', flex: 1, textAlign: 'center' },
  detailContent: { flex: 1, padding: 16 },
  taskInfoCard: { backgroundColor: '#161b22', borderRadius: 8, padding: 16, borderWidth: 1, borderColor: '#30363d' },
  taskTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 8 },
  taskDescription: { fontSize: 14, color: '#c9d1d9', lineHeight: 20, marginBottom: 12 },
  detailTimerText: { fontSize: 13, fontWeight: '600', marginBottom: 12 },
  badgesRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, borderTopWidth: 1, borderTopColor: '#30363d', paddingTop: 16, marginBottom: 16 },
  detailItem: { width: (Dimensions.get('window').width - 80) / 2, marginBottom: 8 },
  detailLabel: { color: '#8b949e', fontSize: 11, marginTop: 4 },
  detailValue: { color: '#fff', fontSize: 13, fontWeight: '500', marginTop: 2 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#8b949e', marginTop: 16, marginBottom: 10 },
  statusButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  statusButton: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, borderWidth: 1, borderColor: '#30363d', backgroundColor: '#21262d' },
  statusButtonText: { color: '#c9d1d9', fontSize: 11, fontWeight: '600' },
  attachmentsList: { gap: 6 },
  attachmentItem: { backgroundColor: '#21262d', padding: 10, borderRadius: 6, borderWidth: 1, borderColor: '#30363d' },
  attachmentName: { color: '#58a6ff', fontSize: 13 },
  commentsSection: { marginTop: 16, paddingBottom: 40 },
  emptyComments: { padding: 20, alignItems: 'center' },
  emptyCommentsText: { color: '#8b949e', fontSize: 13 },
  commentCard: { backgroundColor: '#161b22', padding: 12, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#30363d' },
  commentHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  commentAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#30363d', alignItems: 'center', justifyContent: 'center' },
  commentAvatarText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  commentMeta: { marginLeft: 10, flex: 1 },
  commentAuthor: { color: '#fff', fontSize: 13, fontWeight: '600' },
  commentTime: { color: '#8b949e', fontSize: 11 },
  commentMessage: { color: '#c9d1d9', fontSize: 13, lineHeight: 18, marginLeft: 38 },
  commentInputContainer: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#161b22', borderTopWidth: 1, borderTopColor: '#30363d' },
  commentInput: { flex: 1, backgroundColor: '#0d1117', borderRadius: 6, borderWidth: 1, borderColor: '#30363d', color: '#fff', paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, maxH: 80 },
  sendButton: { width: 40, height: 40, backgroundColor: '#1f6feb', borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginLeft: 10 },
  sendButtonDisabled: { backgroundColor: '#21262d' },
  projectInfoCard: { backgroundColor: '#161b22', padding: 16, borderBottomWidth: 1, borderBottomColor: '#30363d' },
  projectActions: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  actionButton: { flex: 1, backgroundColor: '#1f6feb', paddingVertical: 8, borderRadius: 6, alignItems: 'center' },
  secondaryActionButton: { backgroundColor: '#21262d', borderWidth: 1, borderColor: '#30363d' },
  secondaryActionButtonText: { color: '#c9d1d9', fontSize: 13, fontWeight: '600' },
  projectDescription: { color: '#c9d1d9', fontSize: 14, marginBottom: 8 },
  projectMeta: { color: '#8b949e', fontSize: 12, marginTop: 2 }
});