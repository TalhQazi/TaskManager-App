import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  FlatList,
  SafeAreaView,
  StatusBar,
  Alert,
  ScrollView,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/services/api';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Search,
  X,
  Plus,
  UserX,
  AlertTriangle,
  Phone,
  Mail,
  Calendar,
  ChevronRight,
  FileText
} from 'lucide-react-native';

/* ── Data Interfaces & Typings ─────────────────────────────────── */
interface DoNotHireEntry {
  id: string;
  fullName: string;
  phone?: string;
  email?: string;
  reason: string;
  incidentNotes: string;
  createdAt: string;
}

type DoNotHireApi = Omit<DoNotHireEntry, 'id'> & {
  _id: string;
};

/* ── Normalization Utilities ───────────────────────────────────── */
function normalizeEntry(e: DoNotHireApi): DoNotHireEntry {
  return {
    id: e._id || String(Math.random()),
    fullName: e.fullName || 'Unknown Candidate',
    phone: e.phone,
    email: e.email,
    reason: e.reason || 'No reason specified',
    incidentNotes: e.incidentNotes || '',
    createdAt: e.createdAt || new Date().toISOString(),
  };
}

/* ── Validation Schemas ────────────────────────────────────────── */
const schema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  reason: z.string().min(1, 'Reason is required'),
  incidentNotes: z.string().min(1, 'Incident notes are required'),
});

type Values = z.infer<typeof schema>;

const COLORS = {
  background: '#f8fafc',
  card: '#ffffff',
  text: '#0f172a',
  textLight: '#64748b',
  border: '#e2e8f0',
  destructive: '#ef4444',
  destructiveLight: '#fef2f2',
  destructiveBorder: '#fee2e2',
  primary: '#4f46e5',
  inputBg: '#f1f5f9',
};

export default function DoNotHireMobile() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<DoNotHireEntry | null>(null);

  /* ── React Query Hooks ─────────────────────────────────────────── */
  const entriesQuery = useQuery({
    queryKey: ['do-not-hire'],
    queryFn: async () => {
      const res = await apiRequest('/do-not-hire', { method: 'GET' });
      
      // ✅ FIX: Extract accurately from res.data.items based on your runtime log
      const items = res?.data?.items || res?.items || [];
      
      return items.map(normalizeEntry);
    },
  });

  const createEntryMutation = useMutation({
    mutationFn: async (payload: Omit<DoNotHireEntry, 'id'>) => {
      return await apiRequest('/do-not-hire', {
        method: 'POST',
        data: payload,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['do-not-hire'] });
    },
  });

  const entries = entriesQuery.data ?? [];

  /* ── React Hook Form Setup ─────────────────────────────────────── */
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: '',
      phone: '',
      email: '',
      reason: '',
      incidentNotes: '',
    },
  });

  /* ── Filter Engine ─────────────────────────────────────────────── */
  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => {
      return (
        e.fullName.toLowerCase().includes(q) ||
        (e.phone ?? '').toLowerCase().includes(q) ||
        (e.email ?? '').toLowerCase().includes(q) ||
        e.reason.toLowerCase().includes(q)
      );
    });
  }, [entries, searchQuery]);

  /* ── Action Handlers ───────────────────────────────────────────── */
  const onSubmit = (values: Values) => {
    const now = new Date();
    const payload: Omit<DoNotHireEntry, 'id'> = {
      fullName: values.fullName,
      phone: values.phone?.trim() ? values.phone.trim() : undefined,
      email: values.email?.trim() ? values.email.trim() : undefined,
      reason: values.reason,
      incidentNotes: values.incidentNotes,
      createdAt: now.toISOString().slice(0, 10),
    };

    createEntryMutation.mutate(payload, {
      onSuccess: () => {
        setCreateModalOpen(false);
        reset();
        Alert.alert('Entry Added', 'Do Not Hire record has been saved successfully.');
      },
      onError: (err: any) => {
        Alert.alert('Error', err?.message || 'Failed to add record definition.');
      },
    });
  };

  const handleOpenDetails = (entry: DoNotHireEntry) => {
    setSelectedEntry(entry);
    setViewModalOpen(true);
  };

  const renderItem = ({ item }: { item: DoNotHireEntry }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => handleOpenDetails(item)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.avatarPlaceholder}>
          <UserX size={18} color={COLORS.destructive} />
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.fullName}</Text>
          <Text style={styles.cardReason} numberOfLines={1}>{item.reason}</Text>
        </View>
        <View style={styles.dateContainer}>
          <Calendar size={12} color={COLORS.textLight} style={{ marginRight: 4 }} />
          <Text style={styles.dateText}>
            {new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </Text>
        </View>
      </View>

      <Text style={styles.cardNotes} numberOfLines={2}>
        {item.incidentNotes}
      </Text>

      <View style={styles.cardMetaRow}>
        <View style={styles.contactChipsGroup}>
          {!!item.phone && (
            <View style={styles.metaChip}>
              <Phone size={11} color={COLORS.textLight} style={{ marginRight: 4 }} />
              <Text style={styles.metaChipText} numberOfLines={1}>{item.phone}</Text>
            </View>
          )}
          {!!item.email && (
            <View style={styles.metaChip}>
              <Mail size={11} color={COLORS.textLight} style={{ marginRight: 4 }} />
              <Text style={styles.metaChipText} numberOfLines={1}>{item.email}</Text>
            </View>
          )}
        </View>
        <ChevronRight size={16} color={COLORS.textLight} />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Screen Header */}
      <View style={styles.screenHeader}>
        <View>
          <Text style={styles.screenTitle}>Do Not Hire List</Text>
          <Text style={styles.screenSubtitle}>Track and review restricted candidates</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          activeOpacity={0.8}
          onPress={() => setCreateModalOpen(true)}
        >
          <Plus size={16} color="#ffffff" style={{ marginRight: 4 }} />
          <Text style={styles.addButtonText}>Add Entry</Text>
        </TouchableOpacity>
      </View>

      {/* Search Input Box Layout */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Search size={16} color={COLORS.textLight} style={styles.searchIcon} />
          <TextInput
            placeholder="Search by name, phone, email, or reason..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
            placeholderTextColor={COLORS.textLight}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={16} color={COLORS.textLight} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Main Core View Area Block */}
      {entriesQuery.isLoading ? (
        <View style={styles.centerBlock}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.stateBlockText}>Loading restricted database entries...</Text>
        </View>
      ) : entriesQuery.isError ? (
        <View style={styles.centerBlock}>
          <AlertTriangle size={32} color={COLORS.destructive} style={{ marginBottom: 8 }} />
          <Text style={styles.errorText}>
            {(entriesQuery.error as any)?.message || 'Failed to sync remote storage logs.'}
          </Text>
        </View>
      ) : filteredEntries.length === 0 ? (
        <View style={styles.centerBlock}>
          <View style={styles.emptyIconCircle}>
            <UserX size={36} color={COLORS.destructive} />
          </View>
          <Text style={styles.emptyTitle}>No Entries Found</Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery ? 'Try adjusting your search criteria keywords.' : 'Add your first restricted entry record to get started.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredEntries}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          ListFooterComponent={
            <View style={styles.footerCounters}>
              <Text style={styles.footerCountText}>
                Showing {filteredEntries.length} of {entries.length} restricted records
              </Text>
              <View style={styles.restrictionStatusIndicator}>
                <View style={styles.indicatorDot} />
                <Text style={styles.indicatorLabel}>Active Enforcement</Text>
              </View>
            </View>
          }
        />
      )}

      {/* Creation Sheet Modal */}
      <Modal visible={createModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalDragHandle} />
            
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderIconContainer}>
                <UserX size={18} color={COLORS.destructive} />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.modalTitle}>Add Do Not Hire Entry</Text>
                <Text style={styles.modalSubtitle}>Save an incident record to prevent future hiring cycles.</Text>
              </View>
              <TouchableOpacity style={styles.closeCircle} onPress={() => setCreateModalOpen(false)}>
                <X size={16} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
              <View style={styles.formSpacing}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Full Name *</Text>
                  <Controller
                    control={control}
                    name="fullName"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextInput
                        style={[styles.formInput, errors.fullName && styles.inputErrorBorder]}
                        placeholder="Candidate complete reference legal name"
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value}
                        placeholderTextColor={COLORS.textLight}
                      />
                    )}
                  />
                  {errors.fullName && <Text style={styles.errorLabelText}>{errors.fullName.message}</Text>}
                </View>

                <View style={styles.formRowGrid}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Phone (Optional)</Text>
                    <Controller
                      control={control}
                      name="phone"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          style={styles.formInput}
                          placeholder="+1 (555) 000-0000"
                          onBlur={onBlur}
                          onChangeText={onChange}
                          value={value}
                          keyboardType="phone-pad"
                          placeholderTextColor={COLORS.textLight}
                        />
                      )}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Email (Optional)</Text>
                    <Controller
                      control={control}
                      name="email"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          style={[styles.formInput, errors.email && styles.inputErrorBorder]}
                          placeholder="name@domain.com"
                          onBlur={onBlur}
                          onChangeText={onChange}
                          value={value}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          placeholderTextColor={COLORS.textLight}
                        />
                      )}
                    />
                    {errors.email && <Text style={styles.errorLabelText}>{errors.email.message}</Text>}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Reason *</Text>
                  <Controller
                    control={control}
                    name="reason"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextInput
                        style={[styles.formInput, errors.reason && styles.inputErrorBorder]}
                        placeholder="Why is this candidate restricted?"
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value}
                        placeholderTextColor={COLORS.textLight}
                      />
                    )}
                  />
                  {errors.reason && <Text style={styles.errorLabelText}>{errors.reason.message}</Text>}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Incident Notes *</Text>
                  <Controller
                    control={control}
                    name="incidentNotes"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextInput
                        style={[styles.formTextArea, errors.incidentNotes && styles.inputErrorBorder]}
                        placeholder="Provide deep structural logs of corporate policy infractions..."
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                        placeholderTextColor={COLORS.textLight}
                      />
                    )}
                  />
                  {errors.incidentNotes && <Text style={styles.errorLabelText}>{errors.incidentNotes.message}</Text>}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setCreateModalOpen(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.submitBtn, createEntryMutation.isPending && { opacity: 0.6 }]} 
                onPress={handleSubmit(onSubmit)}
                disabled={createEntryMutation.isPending}
              >
                {createEntryMutation.isPending ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Plus size={14} color="#ffffff" style={{ marginRight: 4 }} />
                    <Text style={styles.submitBtnText}>Add Entry</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Read-Only Entry Details Bottom Draw Modal Sheet */}
      <Modal visible={viewModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalDragHandle} />

            {selectedEntry && (
              <>
                <View style={[styles.modalHeader, styles.viewHeaderBorder]}>
                  <View style={[styles.avatarPlaceholder, { backgroundColor: COLORS.destructiveLight }]}>
                    <UserX size={20} color={COLORS.destructive} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.detailsViewTitle}>{selectedEntry.fullName}</Text>
                    <Text style={styles.detailsViewSubtitle}>Restricted Entity Documented Profile</Text>
                  </View>
                  <TouchableOpacity style={styles.closeCircle} onPress={() => setViewModalOpen(false)}>
                    <X size={16} color={COLORS.text} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody}>
                  <View style={styles.detailsGrid}>
                    
                    <View style={styles.detailBlockHalf}>
                      <Text style={styles.detailLabel}>Filing Timestamp</Text>
                      <View style={styles.detailValueIconRow}>
                        <Calendar size={14} color={COLORS.textLight} style={{ marginRight: 4 }} />
                        <Text style={styles.detailValueText}>
                          {new Date(selectedEntry.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.detailBlockHalf}>
                      <Text style={styles.detailLabel}>Enforcement State</Text>
                      <View style={styles.dangerStatusBadge}>
                        <View style={[styles.indicatorDot, { backgroundColor: COLORS.destructive }]} />
                        <Text style={styles.dangerBadgeText}>No Hire</Text>
                      </View>
                    </View>

                    <View style={styles.detailBlockFull}>
                      <Text style={styles.detailLabel}>Reasoning Category</Text>
                      <Text style={[styles.detailValueText, { fontWeight: '600', color: COLORS.text }]}>
                        {selectedEntry.reason}
                      </Text>
                    </View>

                    <View style={styles.detailBlockHalf}>
                      <Text style={styles.detailLabel}>Phone Endpoint</Text>
                      <View style={styles.detailValueIconRow}>
                        <Phone size={14} color={COLORS.textLight} style={{ marginRight: 4 }} />
                        <Text style={styles.detailValueText}>{selectedEntry.phone?.trim() || '—'}</Text>
                      </View>
                    </View>

                    <View style={styles.detailBlockHalf}>
                      <Text style={styles.detailLabel}>Email Endpoint</Text>
                      <View style={styles.detailValueIconRow}>
                        <Mail size={14} color={COLORS.textLight} style={{ marginRight: 4 }} />
                        <Text style={styles.detailValueText} numberOfLines={1}>{selectedEntry.email?.trim() || '—'}</Text>
                      </View>
                    </View>

                    <View style={styles.detailBlockFull}>
                      <Text style={styles.detailLabel}>Internal Documentation Log Narrative</Text>
                      <View style={styles.narrativeTextBox}>
                        <FileText size={14} color={COLORS.textLight} style={styles.narrativeIconPlacement} />
                        <Text style={styles.narrativeContentText}>
                          {selectedEntry.incidentNotes}
                        </Text>
                      </View>
                    </View>

                  </View>
                </ScrollView>

                {/* ✅ FIX: Moved the footer inside the fragment match bounds */}
                <View style={styles.modalFooter}>
                  <TouchableOpacity style={styles.dismissActionBtn} onPress={() => setViewModalOpen(false)}>
                    <Text style={styles.dismissActionBtnText}>Close Profile Review</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}


/* ── Layout Styles ──────────────────────────────────────────────── */
const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: COLORS.background },
  screenHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#ffffff', borderBottomWidth: 1, borderColor: COLORS.border },
  screenTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, letterSpacing: -0.5 },
  screenSubtitle: { fontSize: 12, color: COLORS.textLight, marginTop: 1 },
  addButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.text, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  addButtonText: { color: '#ffffff', fontSize: 13, fontWeight: '600' },
  searchSection: { backgroundColor: '#ffffff', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderColor: COLORS.border },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.inputBg, borderRadius: 10, paddingHorizontal: 10, height: 40 },
  searchIcon: { marginRight: 6 },
  searchInput: { flex: 1, fontSize: 13, color: COLORS.text, padding: 0 },
  centerBlock: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  stateBlockText: { fontSize: 13, color: COLORS.textLight, marginTop: 8, fontWeight: '500' },
  errorText: { fontSize: 13, color: COLORS.destructive, textAlign: 'center', fontWeight: '500' },
  listContainer: { padding: 16, gap: 12 },
  
  card: { backgroundColor: COLORS.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  avatarPlaceholder: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  headerInfo: { flex: 1, marginLeft: 10, paddingRight: 4 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  cardReason: { fontSize: 12, color: COLORS.destructive, fontWeight: '500', marginTop: 1 },
  dateContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: '#f1f5f9' },
  dateText: { fontSize: 11, color: COLORS.textLight, fontWeight: '500' },
  cardNotes: { fontSize: 13, color: '#334155', marginTop: 10, lineHeight: 18 },
  cardMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderColor: '#f8fafc' },
  contactChipsGroup: { flexDirection: 'row', gap: 6, flex: 1, paddingRight: 8 },
  metaChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, maxWidth: 130 },
  metaChipText: { fontSize: 11, color: '#475569', fontWeight: '500' },
  
  footerCounters: { marginTop: 4, marginBottom: 24, gap: 8, alignItems: 'center' },
  footerCountText: { fontSize: 12, color: COLORS.textLight, textAlign: 'center' },
  restrictionStatusIndicator: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.destructiveLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: COLORS.destructiveBorder },
  indicatorDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.destructive, marginRight: 6 },
  indicatorLabel: { fontSize: 11, fontWeight: '600', color: COLORS.destructive },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.35)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#ffffff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '88%' },
  modalDragHandle: { width: 32, height: 4, backgroundColor: '#cbd5e1', borderRadius: 2, alignSelf: 'center', marginTop: 8 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: COLORS.border },
  modalHeaderIconContainer: { width: 34, height: 34, borderRadius: 10, backgroundColor: COLORS.destructiveLight, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.destructiveBorder },
  modalTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  modalSubtitle: { fontSize: 11, color: COLORS.textLight, marginTop: 1 },
  closeCircle: { padding: 6, backgroundColor: '#f1f5f9', borderRadius: 16 },
  modalBody: { padding: 16 },
  modalFooter: { flexDirection: 'row', gap: 10, padding: 16, backgroundColor: '#f8fafc', borderTopWidth: 1, borderColor: COLORS.border },
  
  formSpacing: { gap: 14, paddingBottom: 24 },
  inputGroup: { gap: 5 },
  formRowGrid: { flexDirection: 'row', gap: 10 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: '#475569' },
  formInput: { height: 40, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 10, fontSize: 13, color: COLORS.text, backgroundColor: '#ffffff' },
  formTextArea: { height: 90, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, color: COLORS.text, backgroundColor: '#ffffff' },
  inputErrorBorder: { borderColor: COLORS.destructive },
  errorLabelText: { fontSize: 11, color: COLORS.destructive, fontWeight: '500', marginTop: 1 },
  cancelBtn: { flex: 1, height: 40, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' },
  cancelBtnText: { color: '#475569', fontSize: 13, fontWeight: '600' },
  submitBtn: { flex: 1, height: 40, borderRadius: 8, backgroundColor: COLORS.text, justifyContent: 'center', alignItems: 'center', flexDirection: 'row' },
  submitBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '600' },

  viewHeaderBorder: { borderBottomWidth: 1, borderColor: '#f1f5f9', paddingBottom: 14 },
  detailsViewTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  detailsViewSubtitle: { fontSize: 11, fontWeight: '500', color: COLORS.destructive, marginTop: 1 },
  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 16, paddingBottom: 16 },
  detailBlockHalf: { width: '50%', paddingRight: 4 },
  detailBlockFull: { width: '100%' },
  detailLabel: { fontSize: 10, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 },
  detailValueText: { fontSize: 13, fontWeight: '500', color: '#334155', marginTop: 4 },
  detailValueIconRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  dangerStatusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.destructiveLight, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 4 },
  dangerBadgeText: { fontSize: 11, fontWeight: '600', color: COLORS.destructive },
  narrativeTextBox: { backgroundColor: '#f8fafc', borderRadius: 8, padding: 10, marginTop: 6, borderWidth: 1, borderColor: '#f1f5f9', position: 'relative' },
  narrativeIconPlacement: { position: 'absolute', top: 10, left: 10 },
  narrativeContentText: { fontSize: 13, color: '#334155', lineHeight: 18, paddingLeft: 20 },
  dismissActionBtn: { width: '100%', height: 40, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' },
  dismissActionBtnText: { color: '#475569', fontSize: 13, fontWeight: '600' },
  
  emptyIconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.destructiveLight, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  emptySubtitle: { fontSize: 12, color: COLORS.textLight, textAlign: 'center', paddingHorizontal: 24, marginTop: 4, lineHeight: 16 },
});