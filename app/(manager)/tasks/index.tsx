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
} from 'react-native';
import {
  Search,
  ChevronLeft,
  Clock,
  MapPin,
  Calendar,
  CheckCircle2,
  User,
  Folder,
  CheckSquare,
  Send,
} from 'lucide-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/services/api';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';

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
  
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [commentDraft, setCommentDraft] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);

  // Fetch projects
  const { data: projects = [], isLoading: projectsLoading, refetch: refetchProjects } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await apiRequest<{ items?: Project[] }>('/projects');
      return res.data?.items || [];
    },
  });

  // Fetch standalone tasks (tasks without project)
  const { data: standaloneTasks = [], isLoading: tasksLoading, refetch: refetchTasks } = useQuery<Task[]>({
    queryKey: ['tasks'],
    queryFn: async () => {
      const res = await apiRequest<{ items?: Task[] }>('/tasks');
      const tasks = res.data?.items || [];
      return tasks.filter((t: Task) => !t.projectId);
    },
  });

  // Load project with tasks
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

  // Load task comments
  const loadComments = async (taskId: string) => {
    try {
      const res = await apiRequest<{ items?: Comment[] }>(`/tasks/${taskId}/comments`);
      setComments(res.data?.items || []);
    } catch (err) {
      console.error('Failed to load comments:', err);
    }
  };

  // Send comment mutation
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

  // Update task status mutation
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
      case 'high': return Colors.error;
      case 'medium': return Colors.warning;
      case 'low': return Colors.success;
      default: return Colors.textSecondary;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return Colors.success;
      case 'in-progress': return Colors.primary;
      case 'pending': return Colors.warning;
      case 'overdue': return Colors.error;
      default: return Colors.textSecondary;
    }
  };

  // Filter tasks
  const filterTasks = (tasks: Task[]) => {
    return tasks.filter((task) => {
      const matchesSearch = 
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.assignees.some(a => a.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesSearch;
    });
  };

  const filteredStandaloneTasks = filterTasks(standaloneTasks);

  // Show loading screen when data is loading
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
        {/* Header */}
        <View style={styles.detailHeader}>
          <TouchableOpacity
            onPress={() => setViewMode(selectedProject ? 'project' : 'list')}
            style={styles.backButton}
          >
            <ChevronLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.detailHeaderTitle} numberOfLines={1}>Task Details</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.detailContent} showsVerticalScrollIndicator={false} ref={scrollViewRef}>
          {/* Task Info Card */}
          <View style={styles.taskInfoCard}>
            <Text style={styles.taskTitle}>{selectedTask.title}</Text>
            <Text style={styles.taskDescription}>{selectedTask.description}</Text>

            {/* Status & Priority */}
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

            {/* Task Details */}
            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <Calendar size={16} color={Colors.textTertiary} />
                <Text style={styles.detailLabel}>Due Date</Text>
                <Text style={styles.detailValue}>{formatDate(selectedTask.dueDate)}</Text>
              </View>
              <View style={styles.detailItem}>
                <Clock size={16} color={Colors.textTertiary} />
                <Text style={styles.detailLabel}>Due Time</Text>
                <Text style={styles.detailValue}>{selectedTask.dueTime || '—'}</Text>
              </View>
              <View style={styles.detailItem}>
                <MapPin size={16} color={Colors.textTertiary} />
                <Text style={styles.detailLabel}>Location</Text>
                <Text style={styles.detailValue}>{selectedTask.location || '—'}</Text>
              </View>
              <View style={styles.detailItem}>
                <User size={16} color={Colors.textTertiary} />
                <Text style={styles.detailLabel}>Assignees</Text>
                <Text style={styles.detailValue} numberOfLines={1}>
                  {selectedTask.assignees.length > 0 ? selectedTask.assignees.join(', ') : 'Unassigned'}
                </Text>
              </View>
            </View>

            {/* Status Update Section */}
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
                  <Text style={[styles.statusButtonText, selectedTask.status === status && { color: Colors.surface }]}>
                    {status.replace('-', ' ').toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Attachments */}
            {selectedTask.attachments && selectedTask.attachments.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Attachments ({selectedTask.attachments.length})</Text>
                <View style={styles.attachmentsList}>
                  {selectedTask.attachments.map((att, idx) => (
                    <TouchableOpacity key={idx} style={styles.attachmentItem}>
                      <Text style={styles.attachmentName}>📄 {att.fileName}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </View>

          {/* Comments Section */}
          <View style={styles.commentsSection}>
            <Text style={styles.sectionTitle}>Comments ({comments.length})</Text>
            {comments.length === 0 ? (
              <View style={styles.emptyComments}>
                <Text style={styles.emptyCommentsText}>No comments yet</Text>
                <Text style={styles.emptyCommentsSubtext}>Be the first to comment</Text>
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
            <View style={{ height: 20 }} />
          </View>
        </ScrollView>

        {/* Comment Input */}
        <View style={styles.commentInputContainer}>
          <TextInput
            style={styles.commentInput}
            placeholder="Type a comment..."
            placeholderTextColor={Colors.textTertiary}
            value={commentDraft}
            onChangeText={setCommentDraft}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendButton, !commentDraft.trim() && styles.sendButtonDisabled]}
            onPress={handleSendComment}
            disabled={!commentDraft.trim() || sendCommentMutation.isPending}
          >
            <Send size={20} color={commentDraft.trim() ? Colors.surface : Colors.textTertiary} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // Show loading screen for project
  if (refreshing && selectedProject && viewMode === 'project') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setViewMode('list')} style={styles.backButton}>
            <ChevronLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{selectedProject?.name}</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading project tasks...</Text>
        </View>
      </View>
    );
  }

  // PROJECT VIEW
  if (viewMode === 'project' && selectedProject) {
    const projectTasks = filterTasks(selectedProject.tasks || []);
    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setViewMode('list')} style={styles.backButton}>
            <ChevronLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{selectedProject.name}</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Project Info */}
        <View style={styles.projectInfoCard}>
          <Text style={styles.projectDescription}>{selectedProject.description || 'No description'}</Text>
          <Text style={styles.projectMeta}>
            {selectedProject.assignees?.length > 0 
              ? `Assignees: ${selectedProject.assignees.join(', ')}` 
              : 'No assignees'}
          </Text>
          <Text style={styles.projectMeta}>{projectTasks.length} tasks in this project</Text>
        </View>

        {/* Filters */}
        <View style={styles.filtersContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search tasks..."
            placeholderTextColor={Colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Tasks List */}
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {projectTasks.length === 0 ? (
            <View style={styles.emptyState}>
              <CheckSquare size={48} color={Colors.textTertiary} />
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
                <View style={styles.taskCardFooter}>
                  <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(task.status)}20` }]}>
                    <Text style={[styles.statusBadgeText, { color: getStatusColor(task.status) }]}>{task.status}</Text>
                  </View>
                  <Text style={styles.taskCardDate}>{formatDate(task.dueDate)}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
          <View style={{ height: 20 }} />
        </ScrollView>
      </View>
    );
  }

  // MAIN LIST VIEW (Projects + Tasks)
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Tasks</Text>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <View style={styles.searchBox}>
          <Search size={20} color={Colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search tasks or assignees..."
            placeholderTextColor={Colors.textTertiary}
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
        {/* Projects Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Projects</Text>
          {projects.length === 0 ? (
            <View style={styles.emptyState}>
              <Folder size={48} color={Colors.textTertiary} />
              <Text style={styles.emptyText}>No projects found</Text>
            </View>
          ) : (
            projects.map((project) => (
              <TouchableOpacity key={project.id} style={styles.projectCard} onPress={() => loadProject(project.id)}>
                <View style={styles.projectCardHeader}>
                  {project.logo?.url ? (
                    <Image source={{ uri: project.logo.url }} style={styles.projectLogo} />
                  ) : (
                    <View style={styles.projectLogoPlaceholder}>
                      <Folder size={20} color={Colors.textTertiary} />
                    </View>
                  )}
                  <View style={styles.projectCardInfo}>
                    <Text style={styles.projectCardName} numberOfLines={1}>{project.name}</Text>
                    <Text style={styles.projectCardDesc} numberOfLines={1}>{project.description || 'No description'}</Text>
                  </View>
                </View>
                <View style={styles.projectCardFooter}>
                  <Text style={styles.projectCardMeta}>{project.taskCount || (project.tasks?.length || 0)} tasks</Text>
                  <View style={[styles.statusBadge, { backgroundColor: Colors.infoLight }]}>
                    <Text style={[styles.statusBadgeText, { color: Colors.info }]}>{project.status || 'Active'}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Standalone Tasks Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Standalone Tasks</Text>
          {filteredStandaloneTasks.length === 0 ? (
            <View style={styles.emptyState}>
              <CheckSquare size={48} color={Colors.textTertiary} />
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
        <View style={{ height: 20 }} />
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
    textAlign: 'center',
  },
  backButton: {
    padding: 8,
  },
  placeholder: {
    width: 40,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 15,
    color: Colors.text,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginTop: 16,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 12,
  },
  // Project Card Styles
  projectCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  projectCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  projectLogo: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.background,
  },
  projectLogoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.infoLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  projectCardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  projectCardName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  projectCardDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  projectCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  projectCardMeta: {
    fontSize: 13,
    color: Colors.textTertiary,
  },
  // Task Card Styles
  taskCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  taskCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  taskCardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  priorityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 8,
  },
  taskCardDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 12,
    lineHeight: 18,
  },
  taskCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
    textTransform: 'capitalize',
  },
  taskCardDate: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textTertiary,
    marginTop: 8,
  },
  // Project View Styles
  projectInfoCard: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  projectDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  projectMeta: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  // Task Detail Styles
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  detailHeaderTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
    textAlign: 'center',
  },
  detailContent: {
    flex: 1,
  },
  taskInfoCard: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  taskTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 12,
  },
  taskDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: '45%',
  },
  detailLabel: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.text,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 12,
    marginTop: 8,
  },
  statusButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  statusButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  statusButtonText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  attachmentsList: {
    gap: 8,
  },
  attachmentItem: {
    backgroundColor: Colors.background,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  attachmentName: {
    fontSize: 13,
    color: Colors.text,
  },
  // Comments Styles
  commentsSection: {
    padding: 16,
  },
  emptyComments: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyCommentsText: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: Colors.text,
  },
  emptyCommentsSubtext: {
    fontSize: 13,
    color: Colors.textTertiary,
    marginTop: 4,
  },
  commentCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentAvatarText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.surface,
  },
  commentMeta: {
    marginLeft: 10,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  commentTime: {
    fontSize: 11,
    color: Colors.textTertiary,
  },
  commentMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginLeft: 42,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  commentInput: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
    maxHeight: 100,
    minHeight: 44,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.surfaceAlt,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 16,
  },
});
