import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  Image,
  FlatList,
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
import { API_BASE_URL, apiRequest } from '@/services/api';
import { Task, TaskStatus } from '@/types';
import * as ImagePicker from 'expo-image-picker';
import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { MaterialIcons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import * as IntentLauncher from 'expo-intent-launcher';
import { s, wp, hp, fs } from '@/util/styles';

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
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!taskId) return;

    socketRef.current = io(SOCKET_URL, { transports: ['websocket'] });
    const socket = socketRef.current;

    socket.on('connect', () => {
      setIsSocketConnected(true);
      socket.emit('joinTask', taskId);
    });

    socket.on('newComment', (newComment) => {
      queryClient.setQueryData(['task-comments', taskId], (oldData: any) => {
        return oldData ? [...oldData, newComment] : [newComment];
      });
    });

    return () => {
      socket.emit('leaveTask', taskId);
      socket.disconnect();
    };
  }, [taskId, queryClient]);

  const renderImage = ({ item }: { item: string }) => (
    <Image source={{ uri: item }} style={s(styles.image)} />
  );

  const handleUploadPhoto = async () => {
    try {
      setUploading(true);
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission required", "Allow access to photos");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], 
        quality: 0.7,
        allowsMultipleSelection: false,
      });

      if (result.canceled) return;

      const image = result.assets[0];
      const token = await AsyncStorage.getItem('auth_token');

      if (!token) {
        Alert.alert("Error", "User not authenticated");
        return;
      }

      const formData = new FormData();

      formData.append("files", {
        uri: Platform.OS === 'android' ? image.uri : image.uri.replace('file://', ''),
        name: image.fileName || `photo_${Date.now()}.jpg`,
        type: image.mimeType || 'image/jpeg',
      } as any);

      formData.append("title", "Task Photo");
      formData.append("description", "Photo Evidence");

      console.log("UPLOAD URL:", `${API_BASE_URL}/tasks/upload`);

      const res = await fetch(`${API_BASE_URL}/tasks/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const text = await res.text();
      console.log("UPLOAD RESPONSE:", text);

      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("Invalid server response");
      }

      if (!res.ok) {
        throw new Error(data?.error?.message || "Upload failed");
      }

      if (data?.item?.attachment?.url) {
        let imageUrl = data.item.attachment.url;

        if (!imageUrl.startsWith("data:image")) {
          imageUrl = `data:image/jpeg;base64,${imageUrl}`;
        }

        setImages(prev => [...prev, imageUrl]);
      }
      setUploading(false);
      Alert.alert("Success", "Photo uploaded successfully");

    } catch (err: any) {
      setUploading(false);
      console.error("UPLOAD ERROR:", err);
      Alert.alert("Error", err.message || "Upload failed");
    }
  };

  const handleUploadDocument = async () => {
    try {
      setUploading(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*", 
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      const token = await AsyncStorage.getItem('auth_token');

      const formData = new FormData();

      formData.append("files", {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || "application/octet-stream",
      } as any);

      formData.append("title", "Task File");
      formData.append("description", "Task Attachment");

      const res = await fetch(`${API_BASE_URL}/tasks/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();

      if (data?.item?.attachment?.url) {
        //Attachment loaded
      }
      setUploading(false);
      Alert.alert("Success", "File uploaded");
    } catch (e) {
      console.log(e);
      setUploading(false);
      Alert.alert("Error", "Upload failed");
    }
  };

  const getFileType = (base64: string) => {
    if (base64.includes("application/pdf")) return "pdf";
    if (base64.includes("image")) return "image";
    if (base64.includes("wordprocessingml")) return "doc";
    return "file";
  };

  const openBase64File = async (base64Data: string, type: string) => {
    try {
      let mimeType = "*/*";
      let extension = "file";

      if (type === "pdf") {
        mimeType = "application/pdf";
        extension = "pdf";
      } else if (type === "doc") {
        mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        extension = "docx";
      } else if (type === "image") {
        mimeType = "image/jpeg";
        extension = "jpg";
      }

      const fileName = `file_${Date.now()}.${extension}`;
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

      const base64 = base64Data.includes(",")
        ? base64Data.split(",")[1]
        : base64Data;

      if (!base64) {
        Alert.alert("Error", "Invalid file data");
        return;
      }

      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (Platform.OS === "android") {
        const contentUri = await FileSystem.getContentUriAsync(fileUri);

        await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
          data: contentUri,
          flags: 1, 
          type: mimeType,
        });
      } else {
        await Sharing.shareAsync(fileUri, { mimeType });
      }
    } catch (e) {
      console.error("❌ Open File Error:", e);
      Alert.alert("Error", "No application found to open this file type.");
    }
  };

  const openTaskFile = async (base64Data: string, type: string) => {
    try {
      setUploading(true); 
      
      let mimeType = "application/octet-stream";
      let extension = "file";

      if (type === "pdf") {
        mimeType = "application/pdf";
        extension = "pdf";
      } else if (type === "image") {
        mimeType = "image/jpeg";
        extension = "jpg";
      } else if (type === "doc") {
        mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        extension = "docx";
      }

      const fileName = `Task_${Date.now()}.${extension}`;
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
      const cleanBase64 = base64Data.includes(",") ? base64Data.split(",")[1] : base64Data;

      await FileSystem.writeAsStringAsync(fileUri, cleanBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (Platform.OS === 'android') {
        const contentUri = await FileSystem.getContentUriAsync(fileUri);

        try {
          await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
            data: contentUri,
            flags: 1, 
            type: mimeType,
          });
        } catch (e) {
          await Sharing.shareAsync(fileUri, { mimeType });
        }
      } else {
        await Sharing.shareAsync(fileUri, { mimeType, UTI: type === 'pdf' ? 'com.adobe.pdf' : undefined });
      }
    } catch (error: any) {
      console.log("Error", "Could not open file: " + error.message);
      Alert.alert("Error", "Could not open file: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const { data: task, isLoading, error } = useQuery<Task>({
    queryKey: ['task', String(taskId || '')],
    enabled: !!taskId,
    queryFn: async () => {
      try {
        const res = await apiRequest<{ item?: any; error?: { message?: string } }>(`/tasks/${taskId}`);
        console.log("TASK API FULL RESPONSE:", res.data.attachments);
      
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
          attachments: Array.isArray(t.attachments) ? t.attachments : [],

          images: Array.isArray(t.attachments)
            ? t.attachments.map((item: any) => {
                let img = item.url || "";
                if (!img.startsWith("data:image")) {
                  img = `data:image/jpeg;base64,${img}`;
                }
                return img;
              })
            : [],
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

  const attachmentsArray = Array.isArray(task?.attachments) ? task.attachments : [];

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

  const noteMutation = useMutation({
    mutationFn: async (note: string) => {
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
      <View style={s(styles.loadingContainer)}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!taskId) {
    return (
      <View style={s(styles.loadingContainer)}>
        <Text style={s(styles.errorText)}>Invalid task id</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={s(styles.loadingContainer)}>
        <AlertCircle color={Colors.error} size={fs(10)} style={s({ marginBottom: hp(2) })} />
        <Text style={s(styles.errorText)}>
          {error instanceof Error ? error.message : 'Failed to load task'}
        </Text>
        <TouchableOpacity 
          style={s(styles.retryButton)}
          onPress={() => queryClient.invalidateQueries({ queryKey: ['task', String(taskId)] })}
        >
          <Text style={s(styles.retryButtonText)}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s(styles.container)}>
      {/* Back Button Header */}
      <View style={s(styles.header)}>
        <TouchableOpacity 
          style={s(styles.backButton)} 
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ChevronLeft color={Colors.text} size={fs(5.5)} />
        </TouchableOpacity>
        <Text style={s(styles.headerTitle)}>Task Details</Text>
        <View style={s(styles.headerSpacer)} />
      </View>

      <ScrollView
        style={s(styles.scrollView)}
        contentContainerStyle={s(styles.contentContainer)}
        showsVerticalScrollIndicator={false}
      >
        {/* Task Title & Meta */}
        <View style={s(styles.topSection)}>
          <View style={s(styles.metaRow)}>
            <StatusBadge status={task?.status} size="medium" />
            <PriorityIndicator priority={task?.priority} />
          </View>
          <Text style={s(styles.title)}>{task?.title}</Text>
          <Text style={s(styles.description)}>{task?.description}</Text>
        </View>

        {/* Task Details Card */}
        <View style={s(styles.detailsCard)}>
          {/* Location */}
          <View style={s(styles.detailRow)}>
            <MapPin color={Colors.textTertiary} size={fs(3.8)} />
            <Text style={s(styles.detailLabel)}>Location</Text>
            <Text style={s(styles.detailValue)}>{task?.location || task?.category || 'Not specified'}</Text>
          </View>
          <View style={s(styles.detailDivider)} />

          {/* Assigned Date */}
          <View style={s(styles.detailRow)}>
            <CalendarDays color={Colors.textTertiary} size={fs(3.8)} />
            <Text style={s(styles.detailLabel)}>Assigned</Text>
            <Text style={s(styles.detailValue)}>
              {task?.assignedDate ? new Date(task.assignedDate).toLocaleDateString() : 'N/A'}
            </Text>
          </View>
          <View style={s(styles.detailDivider)} />

          {/* Due Date */}
          <View style={s(styles.detailRow)}>
            <Clock color={Colors.textTertiary} size={fs(3.8)} />
            <Text style={s(styles.detailLabel)}>Due Date</Text>
            <Text style={s(styles.detailValue)}>{task?.dueDate || 'No due date'}</Text>
          </View>
          <View style={s(styles.detailDivider)} />

          {/* Assignees */}
          <View style={s(styles.assigneesRow)}>
            <User color={Colors.textTertiary} size={fs(3.8)} />
            <Text style={s(styles.detailLabel)}>Assignees</Text>
          </View>
          <View style={s(styles.assigneesList)}>
            {task?.assignees && task.assignees.length > 0 ? (
              task.assignees.map((assignee, idx) => (
                <View key={idx} style={s(styles.assigneeChip)}>
                  <Text style={s(styles.assigneeText)}>{assignee}</Text>
                </View>
              ))
            ) : (
              <Text style={s(styles.noAssigneesText)}>No assignees</Text>
            )}
          </View>
        </View>

        {/* Status Update Section */}
        <View style={s(styles.statusSection)}>
          <Text style={s(styles.sectionTitle)}>Task Status</Text>
          
          {/* Current Status Display */}
          <TouchableOpacity 
            style={s(styles.currentStatusBtn)}
            onPress={() => setShowStatusDropdown(!showStatusDropdown)}
          >
            <View style={s([styles.statusDot, { backgroundColor: 
              task?.status === 'completed' ? '#22C55E' : 
              task?.status === 'in_progress' ? '#3B82F6' : '#F59E0B'
            }])} />
            <Text style={s(styles.currentStatusText)}>
              {task?.status?.replace('_', ' ')?.toUpperCase()}
            </Text>
          </TouchableOpacity>

          {/* Status Options Dropdown */}
          {showStatusDropdown && (
            <View style={s(styles.statusDropdown)}>
              {STATUS_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={s([
                    styles.statusOption,
                    task?.status === option.key && styles.statusOptionActive
                  ])}
                  onPress={() => handleStatusChange(option.key)}
                  disabled={statusMutation.isPending || task?.status === option.key}
                >
                  <View style={s([styles.statusDot, { backgroundColor: option.color }])} />
                  <Text style={s([
                    styles.statusOptionText,
                    task?.status === option.key && styles.statusOptionTextActive
                  ])}>
                    {option.label}
                  </Text>
                  {task?.status === option.key && (
                    <CheckCircle2 color={option.color} size={fs(3.8)} style={s(styles.statusCheck)} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Quick Action Buttons */}
          <View style={s(styles.quickActions)}>
            {task?.status === 'pending' && (
              <TouchableOpacity
                style={s([styles.actionBtn, styles.startBtn])}
                onPress={() => handleStatusChange('in_progress')}
                disabled={statusMutation.isPending}
              >
                <Loader color="#FFFFFF" size={fs(4.2)} />
                <Text style={s(styles.actionBtnText)}>Start Task</Text>
              </TouchableOpacity>
            )}
            {task?.status === 'in_progress' && (
              <TouchableOpacity
                style={s([styles.actionBtn, styles.completeBtn])}
                onPress={() => handleStatusChange('completed')}
                disabled={statusMutation.isPending}
              >
                <CheckCircle2 color="#FFFFFF" size={fs(4.2)} />
                <Text style={s(styles.actionBtnText)}>Mark Complete</Text>
              </TouchableOpacity>
            )}
            {task?.status === 'completed' && (
              <View style={s(styles.completedBanner)}>
                <CheckCircle2 color={Colors.success} size={fs(4.8)} />
                <Text style={s(styles.completedText)}>Task Completed</Text>
              </View>
            )}
          </View>
        </View>

        {/* Notes Section */}
        <View style={s(styles.notesSection)}>
          <View style={s(styles.notesSection)}>
            <View style={s(styles.notesTitleRow)}>
              <MessageSquare color={Colors.primary} size={fs(4.2)} />
              <Text style={s(styles.sectionTitle)}>
                Comments ({comments?.length || 0})
              </Text>
            </View>

            {commentsLoading ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : comments?.length === 0 ? (
              <Text style={s(styles.noAssigneesText)}>No comments yet.</Text>
            ) : (
              comments?.map((comment: any) => (
                <View key={comment.id || comment._id} style={s(styles.commentContainer)}>
                  <View style={s(styles.commentHeader)}>
                    <Text style={s(styles.commentAuthor)}>{comment.authorUsername}</Text>
                    <Text style={s(styles.commentDate)}>
                      {new Date(comment.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text style={s(styles.noteText)}>{comment.message}</Text> 
                </View>
              ))
            )}
          </View>

          <View style={s(styles.noteInputRow)}>
            <TextInput
              style={s(styles.noteInput)}
              placeholder="Add a note..."
              placeholderTextColor={Colors.textTertiary}
              value={newNote}
              onChangeText={setNewNote}
              multiline
              testID="task-note-input"
            />
            <TouchableOpacity
              style={s([styles.noteSendBtn, !newNote.trim() && styles.noteSendBtnDisabled])}
              onPress={handleAddNote}
              disabled={!newNote.trim() || noteMutation.isPending}
            >
              <Send color={newNote.trim() ? Colors.primary : Colors.textTertiary} size={fs(4.2)} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={s({ padding: wp(2.5) })}>
            <View style={s(styles.gallery)}>
              {attachmentsArray.map((item: any, index: number) => {
                const url = item.url;
                const fileType = getFileType(url);

                return (
                  <TouchableOpacity
                    key={index}
                    style={s(styles.fileButton)}
                    activeOpacity={0.7}
                    onPress={() => openTaskFile(url, fileType)}
                  >
                    <MaterialIcons name="insert-drive-file" size={fs(4.2)} color="#333" />
                    <Text style={s(styles.fileButtonText)}>
                      File {index + 1}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* Photo Upload */}
        <TouchableOpacity 
          style={s(styles.uploadBtn)} 
          activeOpacity={0.7} 
          onPress={handleUploadDocument} 
          disabled={uploading}
        >
          {uploading ? (
            <>
              <ActivityIndicator size="small" color={Colors.secondary} />
              <Text style={s(styles.uploadBtnText)}>Uploading...</Text>
            </>
          ) : (
            <>
              <Camera color={Colors.secondary} size={fs(4.8)} />
              <Text style={s(styles.uploadBtnText)}>Upload Photo Evidence</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={s({ height: hp(5) })} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(3.5),
    backgroundColor: '#f2f2f2',
    borderRadius: wp(2),
    marginVertical: hp(0.8),
    marginHorizontal: wp(1),
  },
  fileButtonText: {
    marginLeft: wp(2),
    fontSize: fs(3.5),
    color: '#333',
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  gallery: {
    flexDirection: 'row',
    flexWrap: 'wrap', 
    marginTop: hp(1.2),
  },
  image: {
    width: '30%',      
    aspectRatio: 1,    
    margin: '1.5%',
    borderRadius: wp(2),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(4),
    paddingTop: hp(1.5),
    paddingBottom: hp(1),
  },
  backButton: {
    width: wp(10),
    height: wp(10),
    borderRadius: wp(3),
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: fs(4.5),
    fontWeight: '700' as const,
    color: Colors.text,
  },
  headerSpacer: {
    width: wp(10),
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: wp(5),
    paddingTop: hp(1),
    paddingBottom: hp(3),
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  errorText: {
    fontSize: fs(3.8),
    color: Colors.error || '#EF4444',
    textAlign: 'center',
    marginBottom: hp(2),
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: wp(6),
    paddingVertical: hp(1.5),
    borderRadius: wp(3),
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: fs(3.2),
    fontWeight: '600' as const,
  },
  topSection: {
    marginBottom: hp(2),
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    marginBottom: hp(1.5),
  },
  title: {
    fontSize: fs(5),
    fontWeight: '700' as const,
    color: Colors.text,
    lineHeight: fs(6.5),
    marginBottom: hp(1),
  },
  description: {
    fontSize: fs(3.2),
    color: Colors.textSecondary,
    lineHeight: fs(4.5),
  },
  detailsCard: {
    backgroundColor: Colors.surface,
    borderRadius: wp(3.5),
    padding: wp(4),
    marginBottom: hp(2),
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },
  assigneesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    marginBottom: hp(1),
  },
  detailLabel: {
    flex: 1,
    fontSize: fs(3),
    color: Colors.textSecondary,
  },
  detailValue: {
    fontSize: fs(3.2),
    fontWeight: '600' as const,
    color: Colors.text,
    flexShrink: 1,
    textAlign: 'right',
  },
  detailDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: hp(1.5),
  },
  assigneesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(2),
    paddingLeft: wp(6),
  },
  assigneeChip: {
    backgroundColor: Colors.infoLight,
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.5),
    borderRadius: wp(3),
  },
  assigneeText: {
    fontSize: fs(2.8),
    color: Colors.secondary,
    fontWeight: '500' as const,
  },
  noAssigneesText: {
    fontSize: fs(3),
    color: Colors.textTertiary,
    fontStyle: 'italic',
  },
  statusSection: {
    marginBottom: hp(2.5),
  },
  sectionTitle: {
    fontSize: fs(3.5),
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: hp(1.5),
  },
  currentStatusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    backgroundColor: Colors.surface,
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    borderRadius: wp(3),
    marginBottom: hp(1.5),
  },
  statusDot: {
    width: wp(2.5),
    height: wp(2.5),
    borderRadius: wp(1.25),
  },
  currentStatusText: {
    fontSize: fs(3.2),
    fontWeight: '600' as const,
    color: Colors.text,
  },
  statusDropdown: {
    backgroundColor: Colors.surface,
    borderRadius: wp(3),
    marginBottom: hp(1.5),
    overflow: 'hidden',
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2.5),
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  statusOptionActive: {
    backgroundColor: Colors.infoLight,
  },
  statusOptionText: {
    flex: 1,
    fontSize: fs(3.2),
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
    marginTop: hp(1),
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(2),
    paddingVertical: hp(1.8),
    borderRadius: wp(3),
  },
  startBtn: {
    backgroundColor: Colors.secondary,
  },
  completeBtn: {
    backgroundColor: Colors.success,
  },
  actionBtnText: {
    fontSize: fs(3.5),
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  completedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(2),
    backgroundColor: Colors.successLight,
    borderRadius: wp(3),
    paddingVertical: hp(1.8),
  },
  completedText: {
    fontSize: fs(3.5),
    fontWeight: '600' as const,
    color: Colors.success,
  },
  notesSection: {
    marginBottom: hp(2.5),
  },
  notesTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    marginBottom: hp(1.2),
  },
  noteItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: wp(2.5),
    marginBottom: hp(1),
    paddingLeft: wp(1),
  },
  noteBullet: {
    width: wp(1.5),
    height: wp(1.5),
    borderRadius: wp(0.75),
    backgroundColor: Colors.secondary,
    marginTop: hp(0.8),
  },
  noteText: {
    flex: 1,
    fontSize: fs(3.2),
    color: Colors.text,
    lineHeight: fs(4.5),
  },
  noteInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: wp(2),
    marginTop: hp(1),
  },
  noteInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: wp(3),
    padding: wp(3),
    fontSize: fs(3.2),
    color: Colors.text,
    minHeight: hp(5.5),
    maxHeight: hp(12),
    borderWidth: 1,
    borderColor: Colors.border,
  },
  noteSendBtn: {
    width: wp(11),
    height: wp(11),
    borderRadius: wp(3),
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
    gap: wp(2),
    backgroundColor: Colors.surface,
    borderRadius: wp(3),
    paddingVertical: hp(1.8),
    borderWidth: 1.5,
    borderColor: Colors.secondary,
    borderStyle: 'dashed',
  },
  uploadBtnText: {
    fontSize: fs(3.2),
    fontWeight: '600' as const,
    color: Colors.secondary,
  },
  commentContainer: {
    backgroundColor: Colors.surface,
    padding: wp(3),
    borderRadius: wp(2.5),
    marginBottom: hp(1.2),
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: hp(0.5),
  },
  commentAuthor: {
    fontSize: fs(3),
    fontWeight: '700',
    color: Colors.primary,
  },
  commentDate: {
    fontSize: fs(2.5),
    color: Colors.textTertiary,
  },
});