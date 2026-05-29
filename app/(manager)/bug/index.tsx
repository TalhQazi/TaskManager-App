import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Dimensions,
} from 'react-native';

import {
  Bug,
  Upload,
  X,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
} from 'lucide-react-native';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';

import Colors from '@/constants/colors';
import { apiRequest } from '@/services/api';

// --- Type Defs ---
type BugStatus = 'open' | 'closed';
type StatusFilter = 'all' | 'open' | 'closed';

interface BugItem {
  id: string;
  title: string;
  description: string;
  status: BugStatus;
  taskTitle?: string;
  createdByUsername?: string;
  createdByRole?: string;
  createdAt?: string;
  source?: { panel?: string; path?: string };
  attachments?: { fileName?: string; url?: string; mimeType?: string; size?: number }[];
}

interface LocalFile {
  name: string;
  uri: string;
  type: string;
  size?: number;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Helper to convert file URI to base64 DataURL for payload compatibility
const fileToDataUrl = async (uri: string): Promise<string> => {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    throw new Error('Failed to parse file payload');
  }
};

export default function ManagerBugsScreen() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Modal Views UI States
  const [lightbox, setLightbox] = useState<{ urls: string[]; index: number } | null>(null);
  const [selected, setSelected] = useState<BugItem | null>(null);
  const [submitOpen, setSubmitOpen] = useState(false);

  // Manual Form Input States
  const [submitTitle, setSubmitTitle] = useState('');
  const [submitDesc, setSubmitDesc] = useState('');
  const [submitFiles, setSubmitFiles] = useState<LocalFile[]>([]);

  // --- React Query Data Fetch Pipeline ---
  const { data: bugs = [], isLoading, refetch } = useQuery<BugItem[]>({
    queryKey: ['managerBugs'],
    queryFn: async () => {
      // Adjusted wrapper signature matching your application structure template
      const res = await apiRequest<{ items?: any[] }>('/bugs', { method: 'GET' });
      const rawList = res.data?.items || [];
      
      return rawList.map((x: any) => ({
        id: String(x.id || x._id || ''),
        title: String(x.title || ''),
        description: String(x.description || ''),
        status: (x.status === 'closed' ? 'closed' : 'open') as BugStatus,
        taskTitle: x.taskTitle ? String(x.taskTitle) : undefined,
        createdByUsername: x.createdByUsername ? String(x.createdByUsername) : undefined,
        createdByRole: x.createdByRole ? String(x.createdByRole) : undefined,
        createdAt: x.createdAt ? String(x.createdAt) : undefined,
        source: x.source && typeof x.source === 'object' ? x.source : undefined,
        attachments: Array.isArray(x.attachments) ? x.attachments : [],
      }));
    },
  });

  // --- Mutations ---
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: BugStatus }) => {
      return await apiRequest(`/bugs/${encodeURIComponent(id)}`, {
        method: 'PUT',
        data: { status },
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['managerBugs'] });
      if (selected && selected.id === variables.id) {
        setSelected({ ...selected, status: variables.status });
      }
      Alert.alert('Status Updated', `Issue marked as ${variables.status}`);
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.message || 'Failed to rewrite ticket parameters.');
    },
  });

  const createBugMutation = useMutation({
    mutationFn: async (payload: { title: string; description: string; attachments: any[]; source: any }) => {
      return await apiRequest('/bugs', {
        method: 'POST',
        data: payload,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managerBugs'] });
      Alert.alert('Success', 'Bug report submitted successfully!');
      setSubmitOpen(false);
      setSubmitTitle('');
      setSubmitDesc('');
      setSubmitFiles([]);
    },
    onError: (err: any) => {
      Alert.alert('Submission Error', err?.message || 'Could not commit bug parameters.');
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // --- Filtering Filter Logic ---
  const filteredBugs = bugs.filter((bug) => {
    if (statusFilter !== 'all' && bug.status !== statusFilter) return false;
    if (!searchQuery.trim()) return true;
    
    const q = searchQuery.toLowerCase();
    return (
      bug.title.toLowerCase().includes(q) ||
      bug.description.toLowerCase().includes(q) ||
      bug.createdByUsername?.toLowerCase().includes(q) ||
      bug.source?.path?.toLowerCase().includes(q)
    );
  });

  const openCount = bugs.filter((b) => b.status === 'open').length;

  const handlePickDocument = async () => {
    if (submitFiles.length >= 5) {
      Alert.alert('Limit Reached', 'You can upload up to 5 screenshots max.');
      return;
    }
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'image/*',
        multiple: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSubmitFiles((prev) => [
          ...prev,
          {
            name: asset.name,
            uri: asset.uri,
            type: asset.mimeType || 'image/jpeg',
            size: asset.size,
          },
        ]);
      }
    } catch {
      Alert.alert('Error', 'Failed to retrieve asset path');
    }
  };

  const handleFormSubmit = async () => {
    if (!submitTitle.trim() || !submitDesc.trim()) {
      Alert.alert('Validation Error', 'Title and description fields are strictly required.');
      return;
    }
    try {
      const base64Attachments = await Promise.all(
        submitFiles.map(async (file) => ({
          fileName: file.name,
          url: await fileToDataUrl(file.uri),
          mimeType: file.type,
          size: file.size || 0,
        }))
      );

      createBugMutation.mutate({
        title: submitTitle.trim(),
        description: submitDesc.trim(),
        attachments: base64Attachments,
        source: { panel: 'manager-mobile', path: '/mobile-bugs-dashboard' },
      });
    } catch {
      Alert.alert('Error', 'Failed to compress images for upload assets.');
    }
  };

  // --- Core Layout Loading Screen Engine ---
  if (isLoading && !refreshing) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Bug Tracker</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading tickets...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Header Panel Row */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Bug Tracker</Text>
          <Text style={styles.subtitle}>
            {openCount > 0 ? `${openCount} Open issues require review` : 'All systems clear'}
          </Text>
        </View>
      </View>

      {/* Primary Context Action */}
      <TouchableOpacity style={styles.primaryActionButton} onPress={() => setSubmitOpen(true)}>
        <Bug size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
        <Text style={styles.primaryActionText}>Report New Bug</Text>
      </TouchableOpacity>

      {/* Filter and Inputs Wrapper Panel */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Search size={20} color={Colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by title, author, context..."
            placeholderTextColor={Colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Segmented Tab Filter Selection Row */}
        <View style={styles.tabBarRow}>
          {(['all', 'open', 'closed'] as StatusFilter[]).map((filterOpt) => (
            <TouchableOpacity
              key={filterOpt}
              onPress={() => setStatusFilter(filterOpt)}
              style={[styles.tabItem, statusFilter === filterOpt && styles.tabItemActive]}
            >
              <Text style={[styles.tabLabel, statusFilter === filterOpt && styles.tabLabelActive]}>
                {filterOpt.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Ticket List View Container */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing || isLoading} onRefresh={onRefresh} />}
      >
        {filteredBugs.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No matching bug issues cataloged.</Text>
          </View>
        ) : (
          filteredBugs.map((bug) => (
            <TouchableOpacity key={bug.id} style={styles.bugCard} onPress={() => setSelected(bug)}>
              <View style={styles.bugCardHeader}>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: bug.status === 'closed' ? `${Colors.success}15` : `${Colors.error}15` },
                  ]}
                >
                  <Text style={[styles.statusText, { color: bug.status === 'closed' ? Colors.success : Colors.error }]}>
                    {bug.status}
                  </Text>
                </View>
                <Text style={styles.metaTracePath} numberOfLines={1}>
                  {bug.source?.path?.split('/').pop() || bug.source?.panel || 'System'}
                </Text>
              </View>

              <Text style={styles.bugName} numberOfLines={1}>{bug.title}</Text>
              <Text style={styles.bugDescription} numberOfLines={2}>{bug.description}</Text>

              <View style={styles.detailsRow}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Author</Text>
                  <Text style={styles.detailValue}>{bug.createdByUsername || 'System'}</Text>
                </View>
                {bug.createdAt && (
                  <View style={[styles.detailItem, { alignItems: 'flex-end' }]}>
                    <Text style={styles.detailLabel}>Date</Text>
                    <Text style={styles.detailValue}>{new Date(bug.createdAt).toLocaleDateString()}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))
        )}
        <View style={{ height: 30 }} />
      </ScrollView>

      {/* --- Ticket Detail View Drawer Drawer Modal --- */}
      <Modal visible={!!selected} animationType="slide" transparent>
        <View style={styles.modalBlurBackground}>
          <View style={styles.modalBottomContainer}>
            <View style={styles.modalDragHandle} />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
              <Text style={styles.modalViewTitle}>{selected?.title}</Text>
              <Text style={styles.modalViewPathSub}>{selected?.source?.path || 'Global Scope'}</Text>

              <View style={styles.inlineMetaRow}>
                <Text style={styles.metaAuthorText}>
                  Posted by {selected?.createdByUsername || 'System'} ({selected?.createdByRole || 'User'})
                </Text>
              </View>

              <Text style={styles.fieldSectionLabel}>Description</Text>
              <View style={styles.descriptionContentCard}>
                <Text style={styles.descriptionContentText}>{selected?.description}</Text>
              </View>

              {/* Attachments Mapping */}
              {selected?.attachments && selected.attachments.length > 0 && (
                <View style={{ marginTop: 16 }}>
                  <Text style={styles.fieldSectionLabel}>Screenshots ({selected.attachments.length})</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                    {selected.attachments.map((att, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.attachmentThumbnailWrapper}
                        onPress={() => {
                          const allImgUrls = selected.attachments!.map((a) => a.url || '');
                          setLightbox({ urls: allImgUrls, index });
                        }}
                      >
                        <Image source={{ uri: att.url }} style={styles.thumbnailImage} />
                        <View style={styles.thumbnailZoomBadge}>
                          <Maximize2 size={12} color="#FFFFFF" />
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooterRow}>
              <TouchableOpacity style={styles.footerCancelButton} onPress={() => setSelected(null)}>
                <Text style={styles.footerCancelButtonText}>Dismiss</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.footerActionButton,
                  { backgroundColor: selected?.status === 'closed' ? Colors.error : Colors.success },
                ]}
                disabled={updateStatusMutation.isPending}
                onPress={() =>
                  selected &&
                  updateStatusMutation.mutate({
                    id: selected.id,
                    status: selected.status === 'closed' ? 'open' : 'closed',
                  })
                }
              >
                {updateStatusMutation.isPending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.footerActionButtonText}>
                    {selected?.status === 'closed' ? 'Reopen Ticket' : 'Resolve Issue'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* --- Bug Creation Sheet Modal Form --- */}
      <Modal visible={submitOpen} animationType="slide" transparent>
        <View style={styles.modalBlurBackground}>
          <View style={styles.modalBottomContainer}>
            <View style={styles.modalDragHandle} />
            <Text style={styles.modalViewTitle}>File Bug Report</Text>
            <Text style={styles.modalViewPathSub}>Provide operational logs or diagnostic details.</Text>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 8 }}>
              <Text style={styles.fieldSectionLabel}>Issue Summary *</Text>
              <TextInput
                placeholder="Brief summary of the defect..."
                placeholderTextColor={Colors.textTertiary}
                style={styles.formInputText}
                value={submitTitle}
                onChangeText={setSubmitTitle}
              />

              <Text style={styles.fieldSectionLabel}>Detailed Reproduction Steps *</Text>
              <TextInput
                placeholder="What parameters caused this error?"
                placeholderTextColor={Colors.textTertiary}
                style={[styles.formInputText, styles.formInputTextMultiline]}
                multiline
                numberOfLines={3}
                value={submitDesc}
                onChangeText={setSubmitDesc}
              />

              <Text style={styles.fieldSectionLabel}>Attach Previews (Max 5)</Text>
              <View style={styles.formFilePreviewsGrid}>
                {submitFiles.map((file, i) => (
                  <View key={i} style={styles.formImageFrameBox}>
                    <Image source={{ uri: file.uri }} style={styles.formThumbnailPhoto} />
                    <TouchableOpacity
                      style={styles.removeFileOverlayButton}
                      onPress={() => setSubmitFiles((p) => p.filter((_, idx) => idx !== i))}
                    >
                      <X size={12} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ))}

                {submitFiles.length < 5 && (
                  <TouchableOpacity style={styles.filePickerTriggerBox} onPress={handlePickDocument}>
                    <Upload size={20} color={Colors.textTertiary} />
                    <Text style={styles.pickerHintLabel}>Add Image</Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>

            <View style={styles.modalFooterRow}>
              <TouchableOpacity
                style={styles.footerCancelButton}
                onPress={() => {
                  setSubmitOpen(false);
                  setSubmitFiles([]);
                }}
                disabled={createBugMutation.isPending}
              >
                <Text style={styles.footerCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.footerActionButton, { backgroundColor: Colors.primary }]}
                onPress={handleFormSubmit}
                disabled={createBugMutation.isPending}
              >
                {createBugMutation.isPending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.footerActionButtonText}>Commit Ticket</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* --- Screen Fullscreen Carousel Lightbox --- */}
      {lightbox && (
        <Modal visible={true} transparent animationType="fade">
          <View style={styles.lightboxContainer}>
            <TouchableOpacity style={styles.lightboxCloseButton} onPress={() => setLightbox(null)}>
              <X size={24} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.lightboxImageFrame}>
              {lightbox.urls.length > 1 && lightbox.index > 0 && (
                <TouchableOpacity
                  style={[styles.navButtonBase, styles.navButtonLeft]}
                  onPress={() => setLightbox((p) => (p ? { ...p, index: p.index - 1 } : null))}
                >
                  <ChevronLeft size={28} color="#FFFFFF" />
                </TouchableOpacity>
              )}

              <Image source={{ uri: lightbox.urls[lightbox.index] }} style={styles.lightboxMainImage} />

              {lightbox.urls.length > 1 && lightbox.index < lightbox.urls.length - 1 && (
                <TouchableOpacity
                  style={[styles.navButtonBase, styles.navButtonRight]}
                  onPress={() => setLightbox((p) => (p ? { ...p, index: p.index + 1 } : null))}
                >
                  <ChevronRight size={28} color="#FFFFFF" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

// --- Styled Token Design Alignment ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textTertiary,
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  primaryActionButton: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    marginHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 10,
    gap: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    fontSize: 15,
    color: Colors.text,
  },
  tabBarRow: {
    flexDirection: 'row',
    backgroundColor: Colors.borderLight,
    borderRadius: 8,
    padding: 2,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  tabItemActive: {
    backgroundColor: Colors.surface,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  tabLabelActive: {
    color: Colors.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textTertiary,
  },
  bugCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  bugCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  metaTracePath: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontWeight: '500',
    maxWidth: '60%',
  },
  bugName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  bugDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text,
  },

  // Modal Structural Blueprint Styles
  modalBlurBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalBottomContainer: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 34,
    maxHeight: SCREEN_HEIGHT * 0.82,
  },
  modalDragHandle: {
    width: 36,
    height: 5,
    backgroundColor: Colors.border,
    borderRadius: 2.5,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalViewTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  modalViewPathSub: {
    fontSize: 13,
    color: Colors.textTertiary,
    marginTop: 2,
    marginBottom: 8,
  },
  inlineMetaRow: {
    marginBottom: 12,
  },
  metaAuthorText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  fieldSectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 12,
    marginBottom: 6,
  },
  descriptionContentCard: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  descriptionContentText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  attachmentThumbnailWrapper: {
    marginRight: 8,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  thumbnailImage: {
    width: 80,
    height: 80,
  },
  thumbnailZoomBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 4,
    borderRadius: 4,
  },
  modalFooterRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: 12,
  },
  footerCancelButton: {
    flex: 1,
    backgroundColor: Colors.borderLight,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerCancelButtonText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  footerActionButton: {
    flex: 1.5,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerActionButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },

  // Input Elements
  formInputText: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  formInputTextMultiline: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  formFilePreviewsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  formImageFrameBox: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  formThumbnailPhoto: {
    width: '100%',
    height: '100%',
  },
  removeFileOverlayButton: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filePickerTriggerBox: {
    width: 60,
    height: 60,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.textTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  pickerHintLabel: {
    fontSize: 9,
    color: Colors.textTertiary,
    marginTop: 2,
    fontWeight: '500',
  },

  // Fullscreen Lightbox Properties
  lightboxContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 8,
    borderRadius: 24,
    zIndex: 10,
  },
  lightboxImageFrame: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxMainImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  navButtonBase: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.1)',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 12,
  },
  navButtonLeft: {
    left: 16,
  },
  navButtonRight: {
    right: 16,
  },
});