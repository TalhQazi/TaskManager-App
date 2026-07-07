import React, { useState, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Linking,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Rect } from 'react-native-svg';
import { apiFetch } from '@/lib/admin/apiClient';

const { width } = Dimensions.get('window');
const STATUS_OPTIONS = ['All', 'Active', 'Pending', 'Inactive'];

const STATUS_CONFIG: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  Active:   { bg: 'rgba(16, 185, 129, 0.1)', text: '#34d399', border: 'rgba(16, 185, 129, 0.25)', dot: '#34d399' },
  Pending:  { bg: 'rgba(245, 158, 11, 0.1)',   text: '#fbbf24', border: 'rgba(245, 158, 11, 0.25)',   dot: '#fbbf24' },
  Inactive: { bg: 'rgba(115, 115, 115, 0.1)', text: '#a3a3a3', border: 'rgba(115, 115, 115, 0.25)', dot: '#a3a3a3' },
  Unknown:  { bg: 'rgba(148, 163, 184, 0.1)',  text: '#94a3b8', border: 'rgba(148, 163, 184, 0.25)',  dot: '#94a3b8' },
};

// Translated Tailwind linear gradient definitions to raw hex pairs
const AVATAR_GRADIENTS = [
  ['#0284c7', '#1d4ed8'],
  ['#7c3aed', '#4338ca'],
  ['#059669', '#0f766e'],
  ['#d97706', '#ea580c'],
  ['#f43f5e', '#db2777'],
  ['#06b6d4', '#0284c7'],
];

const getAvatarGradient = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name?.length || 0; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
};

const getInitials = (name: string) => {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  return parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : parts[0][0].toUpperCase();
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.Unknown;
  return (
    <View style={[styles.badgeContainer, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
      <View style={[styles.badgeDot, { backgroundColor: cfg.dot }]} />
      <Text style={[styles.badgeText, { color: cfg.text }]}>{status || 'Unknown'}</Text>
    </View>
  );
}

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const gradientColors = getAvatarGradient(name);
  const dim = size === 'sm' ? 32 : size === 'md' ? 40 : 64;
  const fontSize = size === 'sm' ? 11 : size === 'md' ? 13 : 20;
  const gradId = `avatarGrad-${name.replace(/\s+/g, '')}`;

  return (
    <View style={{ width: dim, height: dim, borderRadius: dim / 2, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' }}>
      <Svg style={StyleSheet.absoluteFill}>
        <Defs>
          <SvgLinearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={gradientColors[0]} />
            <Stop offset="100%" stopColor={gradientColors[1]} />
          </SvgLinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${gradId})`} />
      </Svg>
      <Text style={[styles.avatarText, { fontSize }]}>{getInitials(name)}</Text>
    </View>
  );
}

export default function CRMContacts() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [viewingContact, setViewingContact] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiFetch('/api/crm-contacts')
      .then((data: any) => setContacts(data.items || []))
      .catch((err: any) => setError(err?.message || 'Unable to load contacts'))
      .finally(() => setLoading(false));
  }, []);

  const filteredContacts = useMemo(() => contacts.filter((c) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      c.name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q) ||
      c.company?.toLowerCase().includes(q);
    return matchesSearch && (statusFilter === 'All' || c.status === statusFilter);
  }), [contacts, searchQuery, statusFilter]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { All: contacts.length };
    STATUS_OPTIONS.slice(1).forEach((s) => {
      counts[s] = contacts.filter((c) => c.status === s).length;
    });
    return counts;
  }, [contacts]);

  const handleEmailPress = (email: string) => {
    if (email) Linking.openURL(`mailto:${email}`);
  };

  const handlePhonePress = (phone: string) => {
    if (phone) Linking.openURL(`tel:${phone}`);
  };

  return (
    <SafeAreaView style={styles.rootContainer}>
      {/* Top Accent Bar */}
      <View style={styles.topAccentBar} />

      {/* ── Header ── */}
      <View style={styles.headerRow}>
        <View style={styles.headerTitleGroup}>
          <View style={styles.headerIconContainer}>
            <Text style={styles.headerIconText}>👥</Text>
          </View>
          <View>
            <Text style={styles.headerMainTitle}>Contacts</Text>
            <Text style={styles.headerSubtitle}>View and manage CRM profiles</Text>
          </View>
        </View>
        <View style={styles.readOnlyBadge}>
          <Text style={styles.readOnlyText}>Read-Only</Text>
        </View>
      </View>

      {/* ── Error Banner ── */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>⚠ {error}</Text>
          <TouchableOpacity onPress={() => setError(null)}>
            <Text style={styles.errorCloseText}>×</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Search + Filter Widget Area ── */}
      <View style={styles.filterWidgetSection}>
        <View style={styles.searchBarWrapper}>
          <Text style={styles.searchIconLeft}>🔍</Text>
          <TextInput
            style={styles.searchInputField}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by name, email, company..."
            placeholderTextColor="#64748b"
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchButton}>
              <Text style={styles.clearSearchText}>×</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Horizontal Status Selector Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsScrollTrack}>
          {STATUS_OPTIONS.map((s) => {
            const cfg = s !== 'All' ? STATUS_CONFIG[s] : null;
            const isActive = statusFilter === s;
            return (
              <TouchableOpacity
                key={s}
                onPress={() => setStatusFilter(s)}
                style={[
                  styles.filterPillElement,
                  isActive 
                    ? { backgroundColor: cfg ? cfg.bg : 'rgba(255,255,255,0.1)', borderColor: cfg ? cfg.border : 'rgba(255,255,255,0.2)' }
                    : styles.filterPillInactive
                ]}
              >
                {cfg && <View style={[styles.badgeDot, { backgroundColor: cfg.dot }]} />}
                <Text style={[styles.pillTextLabel, isActive ? { color: cfg ? cfg.text : '#fff' } : { color: '#737373' }]}>
                  {s}
                </Text>
                <View style={[styles.pillCounterFrame, isActive ? { backgroundColor: 'rgba(255,255,255,0.15)' } : { backgroundColor: '#262626' }]}>
                  <Text style={styles.pillCounterText}>{statusCounts[s] ?? 0}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Core Activity Monitor / List ── */}
      {loading ? (
        <View style={styles.loaderCenterState}>
          <ActivityIndicator size="large" color="#38bdf8" />
          <Text style={styles.loaderMetaText}>Syncing contact index...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.recordsListLayout} showsVerticalScrollIndicator={false}>
          {filteredContacts.length === 0 ? (
            <View style={styles.emptyResultsState}>
              <Text style={styles.emptyIconGraphic}>🔍</Text>
              <Text style={styles.emptyStateTitle}>No matches found</Text>
              <Text style={styles.emptyStateSubtitle}>Try tweaking your search terms or active filters</Text>
            </View>
          ) : (
            filteredContacts.map((contact) => (
              <TouchableOpacity
                key={contact.id || contact._id}
                style={styles.contactRowItem}
                onPress={() => setViewingContact(contact)}
                activeOpacity={0.7}
              >
                <Avatar name={contact.name} size="md" />
                
                <View style={styles.contactRowMetaDetails}>
                  <View style={styles.contactCardTopRow}>
                    <Text style={styles.contactMainNameText} numberOfLines={1}>{contact.name}</Text>
                    <StatusBadge status={contact.status} />
                  </View>
                  
                  {contact.company ? (
                    <Text style={styles.contactCompanySubtitleText} numberOfLines={1}>🏢 {contact.company}</Text>
                  ) : null}
                  
                  <Text style={styles.contactSublineTruncateText} numberOfLines={1}>✉ {contact.email || '—'}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      {/* ── Native Detail Sheet Modal overlay ── */}
      <Modal
        visible={viewingContact !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setViewingContact(null)}
      >
        <View style={styles.modalBackgroundOverlay}>
          <View style={styles.modalSheetBody}>
            {viewingContact && (
              <>
                {/* Sheet Head Banner */}
                <View style={styles.modalHeadRow}>
                  <Avatar name={viewingContact.name} size="lg" />
                  <View style={styles.modalHeaderTitleBox}>
                    <Text style={styles.modalProfileName} numberOfLines={1}>{viewingContact.name}</Text>
                    {viewingContact.company && (
                      <Text style={styles.modalProfileCompany} numberOfLines={1}>🏢 {viewingContact.company}</Text>
                    )}
                    <View style={styles.modalBadgeShift}>
                      <StatusBadge status={viewingContact.status} />
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => setViewingContact(null)} style={styles.modalCloseCircle}>
                    <Text style={styles.modalCloseCircleText}>×</Text>
                  </TouchableOpacity>
                </View>

                {/* Sheet Descriptive Fields */}
                <View style={styles.modalFieldsList}>
                  {/* Email block */}
                  <TouchableOpacity 
                    style={styles.detailInfoBlock} 
                    onPress={() => handleEmailPress(viewingContact.email)}
                    disabled={!viewingContact.email}
                  >
                    <View style={styles.infoBlockIconFrame}><Text>✉️</Text></View>
                    <View style={styles.infoBlockTextFrame}>
                      <Text style={styles.infoBlockMetaLabel}>EMAIL ADDRESS</Text>
                      <Text style={[styles.infoBlockValue, viewingContact.email && styles.actionLinkText]} numberOfLines={1}>
                        {viewingContact.email || '—'}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Phone Block */}
                  <TouchableOpacity 
                    style={styles.detailInfoBlock} 
                    onPress={() => handlePhonePress(viewingContact.phone)}
                    disabled={!viewingContact.phone}
                  >
                    <View style={styles.infoBlockIconFrame}><Text>📞</Text></View>
                    <View style={styles.infoBlockTextFrame}>
                      <Text style={styles.infoBlockMetaLabel}>PHONE NUMBER</Text>
                      <Text style={[styles.infoBlockValue, viewingContact.phone && styles.actionLinkText]} numberOfLines={1}>
                        {viewingContact.phone || '—'}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Company Block */}
                  <View style={styles.detailInfoBlock}>
                    <View style={styles.infoBlockIconFrame}><Text>🏢</Text></View>
                    <View style={styles.infoBlockTextFrame}>
                      <Text style={styles.infoBlockMetaLabel}>COMPANY</Text>
                      <Text style={styles.infoBlockValue} numberOfLines={1}>{viewingContact.company || '—'}</Text>
                    </View>
                  </View>
                </View>

                {/* Dismiss Action Button */}
                <TouchableOpacity onPress={() => setViewingContact(null)} style={styles.modalActionButtonDismiss}>
                  <Text style={styles.modalActionButtonDismissText}>Close Profile</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#0f1117',
  },
  topAccentBar: {
    height: 2,
    backgroundColor: '#38bdf8',
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    marginBottom: 16,
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIconText: {
    fontSize: 18,
  },
  headerMainTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 1,
  },
  readOnlyBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  readOnlyText: {
    color: '#fbbf24',
    fontSize: 10,
    fontWeight: '700',
  },
  errorBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    padding: 12,
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 13,
    flex: 1,
  },
  errorCloseText: {
    color: '#ef4444',
    fontSize: 18,
    fontWeight: 'bold',
    paddingHorizontal: 4,
  },
  filterWidgetSection: {
    backgroundColor: 'rgba(30, 41, 59, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 12,
    marginHorizontal: 16,
    gap: 12,
    marginBottom: 14,
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    position: 'relative',
  },
  searchIconLeft: {
    fontSize: 14,
    marginRight: 8,
  },
  searchInputField: {
    flex: 1,
    color: '#ffffff',
    fontSize: 13,
    paddingVertical: 0,
  },
  clearSearchButton: {
    position: 'absolute',
    right: 12,
    padding: 4,
  },
  clearSearchText: {
    color: '#737373',
    fontSize: 18,
    fontWeight: 'bold',
  },
  pillsScrollTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterPillElement: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  filterPillInactive: {
    backgroundColor: 'transparent',
    borderColor: '#262626',
  },
  pillTextLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  pillCounterFrame: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  pillCounterText: {
    color: '#e5e5e5',
    fontSize: 9,
    fontWeight: '700',
  },
  loaderCenterState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  loaderMetaText: {
    color: '#64748b',
    fontSize: 13,
  },
  recordsListLayout: {
    paddingHorizontal: 16,
    paddingBottom: 30,
    gap: 10,
  },
  emptyResultsState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIconGraphic: {
    fontSize: 32,
    marginBottom: 10,
  },
  emptyStateTitle: {
    color: '#d4d4d4',
    fontSize: 15,
    fontWeight: '700',
  },
  emptyStateSubtitle: {
    color: '#525252',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  contactRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    padding: 12,
    gap: 12,
  },
  contactRowMetaDetails: {
    flex: 1,
    gap: 2,
  },
  contactCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  contactMainNameText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  contactCompanySubtitleText: {
    color: '#8a8a8a',
    fontSize: 12,
  },
  contactSublineTruncateText: {
    color: '#525252',
    fontSize: 12,
    marginTop: 1,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  badgeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  avatarText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  modalBackgroundOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalSheetBody: {
    backgroundColor: '#171717',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    padding: 20,
  },
  modalHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#262626',
    paddingBottom: 16,
    position: 'relative',
  },
  modalHeaderTitleBox: {
    flex: 1,
    marginLeft: 14,
    gap: 2,
  },
  modalProfileName: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
  },
  modalProfileCompany: {
    color: '#737373',
    fontSize: 13,
  },
  modalBadgeShift: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  modalCloseCircle: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#262626',
    borderWidth: 1,
    borderColor: '#404040',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseCircleText: {
    color: '#a3a3a3',
    fontSize: 16,
    fontWeight: 'bold',
    lineHeight: 18,
  },
  modalFieldsList: {
    marginVertical: 16,
    gap: 8,
  },
  detailInfoBlock: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    gap: 12,
  },
  infoBlockIconFrame: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#262626',
    borderWidth: 1,
    borderColor: '#404040',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoBlockTextFrame: {
    flex: 1,
  },
  infoBlockMetaLabel: {
    color: '#525252',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  infoBlockValue: {
    color: '#e5e5e5',
    fontSize: 13,
    marginTop: 2,
  },
  actionLinkText: {
    color: '#38bdf8',
    textDecorationLine: 'underline',
  },
  modalActionButtonDismiss: {
    backgroundColor: '#262626',
    borderWidth: 1,
    borderColor: '#404040',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalActionButtonDismissText: {
    color: '#a3a3a3',
    fontSize: 13,
    fontWeight: '600',
  },
});