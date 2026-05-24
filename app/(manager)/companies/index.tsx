import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  FlatList,
  SafeAreaView,
  StatusBar,
  Linking,
  Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/services/api';
import {
  Search,
  X,
  Eye,
  Building2,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  Check,
} from 'lucide-react-native';

/* ── Constants & Styling Configurations ──────────────────────────── */
const STATUS_OPTIONS = ['All', 'Active', 'Prospect', 'Inactive'];
const INDUSTRY_OPTIONS = ['All', 'Technology', 'Finance', 'Healthcare', 'Retail', 'Manufacturing', 'Logistics', 'Other'];

const COLORS = {
  background: '#f8fafc',
  card: '#ffffff',
  text: '#0f172a',
  textLight: '#64748b',
  border: '#e2e8f0',
  indigo: '#4f46e5',
  indigoLight: '#e0e7ff',
  amber: '#b45309',
  amberLight: '#fef3c7',
  amberBorder: '#fde68a',
};

const STATUS_CONFIG: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  Active: { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0', dot: '#10b981' },
  Prospect: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe', dot: '#3b82f6' },
  Inactive: { bg: '#f8fafc', text: '#475569', border: '#cbd5e1', dot: '#94a3b8' },
};

const INDUSTRY_ICONS: Record<string, string> = {
  Technology: '💻',
  Finance: '💰',
  Healthcare: '🏥',
  Retail: '🛍️',
  Manufacturing: '🏭',
  Logistics: '🚚',
  Other: '🏢',
};

/* ── Helper Utilities ────────────────────────────────────────────── */
const getStatusConfig = (status: string) => STATUS_CONFIG[status] || STATUS_CONFIG['Inactive'];
const getIndustryIcon = (industry: string) => INDUSTRY_ICONS[industry] || '🏢';

const getInitials = (name = '') =>
  name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');

const AVATAR_PALETTES = [
  { bg: '#f5f3ff', text: '#6d28d9' },
  { bg: '#fffbeb', text: '#b45309' },
  { bg: '#ecfeff', text: '#0e7490' },
  { bg: '#fff1f2', text: '#be123c' },
  { bg: '#f0fdfa', text: '#0f766e' },
  { bg: '#fff7ed', text: '#c2410c' },
];

const avatarColor = (name = '') => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % AVATAR_PALETTES.length;
  return AVATAR_PALETTES[h];
};

interface Company {
  id?: string;
  _id?: string;
  name: string;
  status: string;
  industry: string;
  website?: string;
  entityType?: string;
  location?: string;
  contactCount?: number;
  activeDeals?: number;
  description?: string;
}

/* ── Shared UI Atoms ─────────────────────────────────────────────── */
const StatusBadge = ({ status }: { status: string }) => {
  const cfg = getStatusConfig(status);
  return (
    <View style={[styles.badgeContainer, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
      <View style={[styles.badgeDot, { backgroundColor: cfg.dot }]} />
      <Text style={[styles.badgeText, { color: cfg.text }]}>{status || 'Unknown'}</Text>
    </View>
  );
};

const CompanyAvatar = ({ name, size = 'md' }: { name: string; size?: 'md' | 'lg' }) => {
  const palette = avatarColor(name);
  const szStyle = size === 'lg' ? styles.avatarLg : styles.avatarMd;
  return (
    <View style={[styles.avatarBase, szStyle, { backgroundColor: palette.bg }]}>
      <Text style={[styles.avatarText, { color: palette.text, fontSize: size === 'lg' ? 18 : 14 }]}>
        {getInitials(name) || '?'}
      </Text>
    </View>
  );
};

const CountPill = ({ value, variant = 'gray' }: { value?: number | string; variant?: 'gray' | 'blue' }) => {
  const pillStyle = variant === 'blue' ? styles.pillBlue : styles.pillGray;
  const textStyle = variant === 'blue' ? styles.pillTextBlue : styles.pillTextGray;
  return (
    <View style={[styles.pillBase, pillStyle]}>
      <Text style={[styles.pillTextBase, textStyle]}>{value ?? '—'}</Text>
    </View>
  );
};

/* ── Main Component Screen ───────────────────────────────────────── */
export default function ManagerCRMCompanies() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [industryFilter, setIndustryFilter] = useState('All');
  const [viewingCompany, setViewingCompany] = useState<Company | null>(null);
  const [industryPickerOpen, setIndustryPickerOpen] = useState(false);

  // Live Query Hook using your apiRequest process
  const { data: companies = [], isLoading, error, refetch } = useQuery<Company[]>({
    queryKey: ['managerCompanies'],
    queryFn: async () => {
      const res = await apiRequest('/crm-company', { method: 'GET' });
      return res?.items || [];
    },
  });

  // Dynamic Status Mutation based on your syntax pattern
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return await apiRequest(`/crm-company/${encodeURIComponent(id)}`, {
        method: 'PUT',
        data: { status },
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['managerCompanies'] });
      if (viewingCompany && (viewingCompany.id === variables.id || viewingCompany._id === variables.id)) {
        setViewingCompany({ ...viewingCompany, status: variables.status });
      }
      Alert.alert('Status Updated', `Company relationship marked as ${variables.status}`);
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.message || 'Failed to rewrite ticket parameters.');
    },
  });

  const filteredCompanies = useMemo(() => {
    return companies.filter((c) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        c.name?.toLowerCase().includes(q) ||
        c.industry?.toLowerCase().includes(q) ||
        c.website?.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
      const matchesIndustry = industryFilter === 'All' || c.industry === industryFilter;
      return matchesSearch && matchesStatus && matchesIndustry;
    });
  }, [companies, searchQuery, statusFilter, industryFilter]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { All: companies.length };
    companies.forEach((c) => {
      if (c.status) counts[c.status] = (counts[c.status] || 0) + 1;
    });
    return counts;
  }, [companies]);

  const handleOpenLink = (url?: string) => {
    if (!url) return;
    const standardUrl = url.startsWith('http') ? url : `https://${url}`;
    Linking.openURL(standardUrl).catch(() => {
      Alert.alert('Error', 'Unable to open website link.');
    });
  };

  const renderCompanyCard = ({ item }: { item: Company }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => setViewingCompany(item)}
    >
      <View style={styles.cardHeaderRow}>
        <CompanyAvatar name={item.name} size="lg" />
        <View style={styles.cardIdentity}>
          <Text style={styles.companyNameText} numberOfLines={1}>{item.name}</Text>
          {item.website && (
            <Text style={styles.companyWebsiteText} numberOfLines={1}>{item.website}</Text>
          )}
        </View>
        <StatusBadge status={item.status} />
      </View>

      <View style={styles.cardMetaRow}>
        {item.industry && (
          <View style={styles.metaChip}>
            <Text style={styles.metaChipText}>
              {getIndustryIcon(item.industry)} {item.industry}
            </Text>
          </View>
        )}
        <View style={[styles.metaChip, { backgroundColor: '#f1f5f9' }]}>
          <Text style={[styles.metaChipText, { color: '#475569', fontWeight: '600' }]}>
            👤 {item.contactCount ?? '—'} contacts
          </Text>
        </View>
        <View style={[styles.metaChip, { backgroundColor: COLORS.indigoLight, borderColor: '#c7d2fe', borderWidth: 1 }]}>
          <Text style={[styles.metaChipText, { color: COLORS.indigo, fontWeight: '600' }]}>
            🤝 {item.activeDeals ?? '—'} deals
          </Text>
        </View>
      </View>

      <View style={styles.cardActionContainer}>
        <TouchableOpacity 
          style={styles.cardActionBtn} 
          onPress={() => setViewingCompany(item)}
        >
          <Eye size={14} color={COLORS.indigo} style={{ marginRight: 6 }} />
          <Text style={styles.cardActionText}>View Details</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header View */}
      <View style={styles.headerContainer}>
        <View>
          <Text style={styles.headerTitle}>Companies</Text>
          <Text style={styles.headerSubtitle}>Organization & relationship metrics</Text>
        </View>
        <View style={styles.readOnlyBadge}>
          <View style={styles.readOnlyDot} />
          <Text style={styles.readOnlyText}>Live CRM</Text>
        </View>
      </View>

      {/* Control Panel: Search & Advanced Filters */}
      <View style={styles.filterSection}>
        <View style={styles.searchContainer}>
          <Search size={16} color={COLORS.textLight} style={styles.searchIcon} />
          <TextInput
            placeholder="Search name, industry, or website..."
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

        <View style={styles.filterRowsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusChipsContainer}>
            {STATUS_OPTIONS.map((s) => {
              const active = statusFilter === s;
              const cfg = getStatusConfig(s);
              return (
                <TouchableOpacity
                  key={s}
                  onPress={() => setStatusFilter(s)}
                  style={[
                    styles.statusChip,
                    active && s === 'All' && { backgroundColor: COLORS.indigo, borderColor: COLORS.indigo },
                    active && s !== 'All' && { backgroundColor: cfg.bg, borderColor: cfg.border }
                  ]}
                >
                  {s !== 'All' && active && <View style={[styles.chipDot, { backgroundColor: cfg.dot }]} />}
                  <Text style={[
                    styles.statusChipText,
                    active && s === 'All' && { color: '#ffffff' },
                    active && s !== 'All' && { color: cfg.text }
                  ]}>
                    {s} <Text style={{ opacity: 0.7 }}>({statusCounts[s] || 0})</Text>
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <TouchableOpacity 
            style={styles.industryTriggerBtn}
            onPress={() => setIndustryPickerOpen(true)}
          >
            <Text style={styles.industryTriggerText} numberOfLines={1}>
              {industryFilter === 'All' ? 'Industries' : industryFilter}
            </Text>
            <ChevronDown size={12} color="#334155" style={{ marginLeft: 2 }} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Query State Content Engine */}
      {isLoading ? (
        <View style={styles.centerBlock}>
          <ActivityIndicator size="large" color={COLORS.indigo} />
          <Text style={styles.stateBlockText}>Loading dynamic data resources...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerBlock}>
          <Text style={styles.errorText}>{(error as any)?.message || 'Unable to sync with live data.'}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <RefreshCw size={14} color="#ffffff" style={{ marginRight: 6 }} />
            <Text style={styles.retryBtnText}>Retry Connection</Text>
          </TouchableOpacity>
        </View>
      ) : filteredCompanies.length === 0 ? (
        <View style={styles.centerBlock}>
          <Building2 size={40} color={COLORS.textLight} style={{ opacity: 0.4, marginBottom: 8 }} />
          <Text style={styles.stateBlockText}>No companies matching filters found.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredCompanies}
          keyExtractor={(item) => item.id || item._id || Math.random().toString()}
          renderItem={renderCompanyCard}
          contentContainerStyle={styles.listContainer}
          ListFooterComponent={
            <Text style={styles.footerCountText}>
              Showing {filteredCompanies.length} of {companies.length} companies
            </Text>
          }
        />
      )}

      {/* Interactive Details Modal Sheet */}
      <Modal visible={viewingCompany !== null} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalDragHandle} />
            
            {viewingCompany && (
              <>
                <View style={[styles.modalHeader, { backgroundColor: getStatusConfig(viewingCompany.status).bg, borderBottomColor: getStatusConfig(viewingCompany.status).border }]}>
                  <CompanyAvatar name={viewingCompany.name} size="lg" />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.modalTitle} numberOfLines={2}>{viewingCompany.name}</Text>
                    <Text style={styles.modalSubtitle}>
                      {getIndustryIcon(viewingCompany.industry)} {viewingCompany.industry || 'Company Profile'}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.modalCloseCircle} onPress={() => setViewingCompany(null)}>
                    <X size={16} color={COLORS.text} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody}>
                  <View style={styles.gridContainer}>
                    <View style={styles.gridColumn}>
                      <Text style={styles.gridLabel}>Industry</Text>
                      <Text style={styles.gridValue}>{viewingCompany.industry || '—'}</Text>
                    </View>

                    <View style={styles.gridColumn}>
                      <Text style={styles.gridLabel}>Entity Type</Text>
                      <Text style={styles.gridValue}>{viewingCompany.entityType || '—'}</Text>
                    </View>

                    <View style={styles.gridColumn}>
                      <Text style={styles.gridLabel}>Location</Text>
                      <Text style={styles.gridValue}>{viewingCompany.location || '—'}</Text>
                    </View>

                    <View style={styles.gridColumn}>
                      <Text style={styles.gridLabel}>Current Status</Text>
                      <View style={{ marginTop: 4 }}><StatusBadge status={viewingCompany.status} /></View>
                    </View>

                    <View style={styles.gridColumn}>
                      <Text style={styles.gridLabel}>Contacts Count</Text>
                      <View style={{ alignItems: 'flex-start', marginTop: 4 }}><CountPill value={viewingCompany.contactCount} /></View>
                    </View>

                    <View style={styles.gridColumn}>
                      <Text style={styles.gridLabel}>Active Pipeline</Text>
                      <View style={{ alignItems: 'flex-start', marginTop: 4 }}><CountPill value={viewingCompany.activeDeals} variant="blue" /></View>
                    </View>

                    {viewingCompany.website && (
                      <View style={styles.gridFullWidth}>
                        <Text style={styles.gridLabel}>Official Website</Text>
                        <TouchableOpacity style={styles.linkRow} onPress={() => handleOpenLink(viewingCompany.website)}>
                          <Text style={styles.linkText} numberOfLines={1}>{viewingCompany.website}</Text>
                          <ExternalLink size={12} color={COLORS.indigo} style={{ marginLeft: 4 }} />
                        </TouchableOpacity>
                      </View>
                    )}

                    <View style={styles.gridFullWidth}>
                      <Text style={styles.gridLabel}>Description</Text>
                      <Text style={styles.descriptionValue}>
                        {viewingCompany.description || 'No descriptive details available.'}
                      </Text>
                    </View>

                    {/* Integrated Status Pipeline Mutation Swapper Controls */}
                    <View style={[styles.gridFullWidth, { marginTop: 8, borderTopWidth: 1, borderColor: COLORS.border, paddingTop: 14 }]}>
                      <Text style={styles.gridLabel}>Change Relationship Status State</Text>
                      <View style={styles.mutationBtnContainer}>
                        {STATUS_OPTIONS.filter(o => o !== 'All').map((opt) => (
                          <TouchableOpacity
                            key={opt}
                            style={[
                              styles.mutationOptBtn,
                              viewingCompany.status === opt && { backgroundColor: COLORS.indigo, borderColor: COLORS.indigo }
                            ]}
                            onPress={() => updateStatusMutation.mutate({ 
                              id: (viewingCompany.id || viewingCompany._id)!, 
                              status: opt 
                            })}
                          >
                            <Text style={[styles.mutationOptText, viewingCompany.status === opt && { color: '#ffffff' }]}>
                              {opt}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                  </View>
                </ScrollView>
              </>
            )}

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.modalCloseActionBtn} onPress={() => setViewingCompany(null)}>
                <Text style={styles.modalCloseActionText}>Dismiss Sheet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Select Industry Picker Overlay Modal */}
      <Modal visible={industryPickerOpen} animationType="fade" transparent>
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setIndustryPickerOpen(false)}>
          <View style={styles.pickerContentContainer}>
            <Text style={styles.pickerHeaderTitle}>Select Industry Segment</Text>
            <ScrollView>
              {INDUSTRY_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.pickerItemRow, industryFilter === opt && { backgroundColor: COLORS.indigoLight }]}
                  onPress={() => {
                    setIndustryFilter(opt);
                    setIndustryPickerOpen(false);
                  }}
                >
                  <Text style={[styles.pickerItemText, industryFilter === opt && { color: COLORS.indigo, fontWeight: '700' }]}>
                    {opt !== 'All' ? `${getIndustryIcon(opt)}  ${opt}` : '🏢 All Industries'}
                  </Text>
                  {industryFilter === opt && <Check size={14} color={COLORS.indigo} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

/* ── UI Architecture Styling Configurations ─────────────────────── */
const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: COLORS.background },
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: COLORS.card, borderBottomWidth: 1, borderColor: COLORS.border },
  headerTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 12, color: COLORS.textLight, marginTop: 1 },
  readOnlyBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eff6ff', borderColor: '#bfdbfe', borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  readOnlyDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.indigo, marginRight: 5 },
  readOnlyText: { fontSize: 11, fontWeight: '600', color: COLORS.indigo },
  filterSection: { backgroundColor: COLORS.card, paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1, borderColor: COLORS.border, gap: 10 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 12, paddingHorizontal: 10, height: 42 },
  searchIcon: { marginRight: 6 },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text, padding: 0 },
  filterRowsContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusChipsContainer: { paddingRight: 4 },
  statusChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginRight: 6 },
  chipDot: { width: 5, height: 5, borderRadius: 2.5, marginRight: 4 },
  statusChipText: { fontSize: 11, fontWeight: '600', color: COLORS.textLight },
  industryTriggerBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 10, height: 32, justifyContent: 'center', maxWidth: 120 },
  industryTriggerText: { fontSize: 11, color: '#334155', fontWeight: '600' },
  centerBlock: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  stateBlockText: { fontSize: 13, color: COLORS.textLight, marginTop: 8, fontWeight: '500' },
  errorText: { fontSize: 14, color: '#ef4444', textAlign: 'center', marginBottom: 12, paddingHorizontal: 16 },
  retryBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.indigo, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  retryBtnText: { color: '#ffffff', fontWeight: '600', fontSize: 13 },
  listContainer: { padding: 16, gap: 12 },
  footerCountText: { fontSize: 12, color: COLORS.textLight, textAlign: 'center', marginTop: 4, marginBottom: 16 },
  
  /* Company Layout Component Card */
  card: { backgroundColor: COLORS.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  cardIdentity: { flex: 1 },
  companyNameText: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  companyWebsiteText: { fontSize: 12, color: COLORS.indigo, marginTop: 2 },
  cardMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  metaChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#f1f5f9' },
  metaChipText: { fontSize: 11, color: '#475569', fontWeight: '500' },
  cardActionContainer: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderColor: '#f1f5f9' },
  cardActionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f3ff', borderColor: '#e0e7ff', borderWidth: 1, paddingVertical: 8, borderRadius: 10 },
  cardActionText: { fontSize: 12, color: COLORS.indigo, fontWeight: '600' },

  /* Molecule Atoms Config */
  badgeContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  badgeDot: { width: 6, height: 6, borderRadius: 3, marginRight: 4 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  avatarBase: { justifyContent: 'center', alignItems: 'center' },
  avatarMd: { width: 36, height: 36, borderRadius: 8 },
  avatarLg: { width: 46, height: 46, borderRadius: 12 },
  avatarText: { fontWeight: '700' },
  pillBase: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  pillGray: { backgroundColor: '#f1f5f9' },
  pillBlue: { backgroundColor: '#eff6ff', borderColor: '#dbeafe', borderWidth: 1 },
  pillTextBase: { fontSize: 13, fontWeight: '600' },
  pillTextGray: { color: '#334155' },
  pillTextBlue: { color: COLORS.indigo },

  /* Bottom Interactive Modal Elements */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
  modalDragHandle: { width: 36, height: 4, backgroundColor: '#cbd5e1', borderRadius: 2, alignSelf: 'center', marginTop: 10 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, paddingRight: 8 },
  modalSubtitle: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  modalCloseCircle: { padding: 6, backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: COLORS.border },
  modalBody: { padding: 16 },
  modalFooter: { padding: 16, backgroundColor: '#f8fafc', borderTopWidth: 1, borderColor: '#f1f5f9' },
  modalCloseActionBtn: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: COLORS.border, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  modalCloseActionText: { color: '#475569', fontWeight: '600', fontSize: 14 },
  
  /* Details Screen Informative Grid */
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 16 },
  gridColumn: { width: '50%', paddingRight: 6 },
  gridFullWidth: { width: '100%' },
  gridLabel: { fontSize: 10, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.6 },
  gridValue: { fontSize: 14, fontWeight: '500', color: '#334155', marginTop: 4 },
  descriptionValue: { fontSize: 14, fontWeight: '400', color: '#334155', marginTop: 4, lineHeight: 20 },
  linkRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  linkText: { fontSize: 14, fontWeight: '500', color: COLORS.indigo, textDecorationLine: 'underline' },

  /* Mutation Selection State Subcomponents */
  mutationBtnContainer: { flexDirection: 'row', gap: 6, marginTop: 8 },
  mutationOptBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#ffffff' },
  mutationOptText: { fontSize: 12, fontWeight: '600', color: COLORS.textLight },

  /* Industry Dropdown Backdrop Selection Panel */
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.3)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  pickerContentContainer: { backgroundColor: '#ffffff', borderRadius: 16, width: '100%', maxHeight: '60%', padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 },
  pickerHeaderTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 12, paddingHorizontal: 4 },
  pickerItemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, borderRadius: 8, marginVertical: 1 },
  pickerItemText: { fontSize: 14, color: '#334155', fontWeight: '500' },
});