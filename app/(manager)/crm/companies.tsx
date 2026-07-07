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
  Platform,
} from 'react-native';
import { apiFetch } from '@/lib/admin/apiClient';
import Colors from '@/constants/colors';

const { height: WINDOW_HEIGHT } = Dimensions.get('window');

/* ── Constants ───────────────────────────────────────────────────── */
const STATUS_OPTIONS = ['All', 'Active', 'Prospect', 'Inactive'];
const INDUSTRY_OPTIONS = ['All', 'Technology', 'Finance', 'Healthcare', 'Retail', 'Manufacturing', 'Logistics', 'Other'];

const STATUS_CONFIG: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  Active:   { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0', dot: '#10b981' },
  Prospect: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe', dot: '#3b82f6' },
  Inactive: { bg: '#f8fafc', text: '#475569', border: '#e2e8f0', dot: '#94a3b8' },
  Unknown:  { bg: '#f4f4f5', text: '#71717a', border: '#e4e4e7', dot: '#a1a1aa' },
};

const INDUSTRY_ICONS: Record<string, string> = {
  Technology:    '💻',
  Finance:       '💰',
  Healthcare:    '🏥',
  Retail:        '🛍️',
  Manufacturing: '🏭',
  Logistics:     '🚚',
  Other:         '🏢',
};

const AVATAR_PALETTES = [
  { bg: '#ede9fe', text: '#6d28d9' },
  { bg: '#fef3c7', text: '#b45309' },
  { bg: '#cffafe', text: '#0369a1' },
  { bg: '#ffe4e6', text: '#be123c' },
  { bg: '#ccfbf1', text: '#0f766e' },
  { bg: '#ffedd5', text: '#c2410c' },
];

/* ── Helpers ─────────────────────────────────────────────────────── */
const getStatusConfig = (status: string) => STATUS_CONFIG[status] || STATUS_CONFIG['Unknown'];
const getIndustryIcon = (industry: string) => INDUSTRY_ICONS[industry] || '🏢';

const getInitials = (name = '') => {
  if (!name) return '?';
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
};

const avatarColor = (name = '') => {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) % AVATAR_PALETTES.length;
  }
  return AVATAR_PALETTES[Math.abs(h)];
};

/* ── Shared UI Components ────────────────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
  const cfg = getStatusConfig(status);
  return (
    <View style={[styles.badgeContainer, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
      <View style={[styles.badgeDot, { backgroundColor: cfg.dot }]} />
      <Text style={[styles.badgeText, { color: cfg.text }]}>{status || 'Unknown'}</Text>
    </View>
  );
}

function CompanyAvatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'lg' }) {
  const palette = avatarColor(name);
  const sizeStyle = size === 'lg' ? styles.avatarLarge : styles.avatarMedium;
  return (
    <View style={[styles.avatarBase, sizeStyle, { backgroundColor: palette.bg }]}>
      <Text style={[styles.avatarText, { color: palette.text, fontSize: size === 'lg' ? 18 : 14 }]}>
        {getInitials(name)}
      </Text>
    </View>
  );
}

function CountPill({ value, variant = 'gray' }: { value: any; variant?: 'gray' | 'blue' }) {
  const isBlue = variant === 'blue';
  return (
    <View style={[styles.pillContainer, isBlue ? styles.pillBlueBg : styles.pillGrayBg]}>
      <Text style={[styles.pillText, isBlue ? styles.pillBlueText : styles.pillGrayText]}>
        {value ?? '—'}
      </Text>
    </View>
  );
}

/* ── Main Export Component ───────────────────────────────────────── */
export default function ManagerCRMCompanies() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [industryFilter, setIndustryFilter] = useState('All');
  const [viewingCompany, setViewingCompany] = useState<any>(null);
  const [industryModalOpen, setIndustryModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch('/api/crm-company');
      setCompanies(data.items || []);
    } catch (err: any) {
      setError(err?.message || 'Unable to load companies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

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
      if (c.status) {
        counts[c.status] = (counts[c.status] || 0) + 1;
      }
    });
    return counts;
  }, [companies]);

  const handleWebsitePress = (url: string) => {
    if (!url) return;
    const cleanUrl = url.toLowerCase().startsWith('http') ? url : `https://${url}`;
    Linking.openURL(cleanUrl).catch(() => {});
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Page Header */}
      <View style={styles.headerContainer}>
        <View>
          <Text style={styles.headerTitle}>Companies</Text>
          <Text style={styles.headerSubtitle}>View organization details and relationships.</Text>
        </View>
        <View style={styles.readOnlyBadge}>
          <View style={styles.readOnlyPulseDot} />
          <Text style={styles.readOnlyText}>Read-only view</Text>
        </View>
      </View>

      {/* Control Panel (Search + Filter Track) */}
      <View style={styles.controlsWidget}>
        {/* Search Field */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchIconSymbol}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, industry, or website…"
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.searchClearHitbox}>
              <Text style={styles.searchClearText}>×</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Dual Filter Rows */}
        <View style={styles.filterRowsBlock}>
          {/* Status Segment horizontal scroller */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statusScrollContainer}
          >
            {STATUS_OPTIONS.map((s) => {
              const active = statusFilter === s;
              const cfg = getStatusConfig(s);
              
              let badgeBg = '#ffffff';
              let badgeBorder = '#e2e8f0';
              let badgeText = '#64748b';

              if (active) {
                if (s === 'All') {
                  badgeBg = '#4f46e5';
                  badgeBorder = '#4f46e5';
                  badgeText = '#ffffff';
                } else {
                  badgeBg = cfg.bg;
                  badgeBorder = cfg.border;
                  badgeText = cfg.text;
                }
              }

              return (
                <TouchableOpacity
                  key={s}
                  activeOpacity={0.7}
                  onPress={() => setStatusFilter(s)}
                  style={[styles.statusChip, { backgroundColor: badgeBg, borderColor: badgeBorder }]}
                >
                  {s !== 'All' && active && <View style={[styles.chipIndicatorDot, { backgroundColor: cfg.dot }]} />}
                  <Text style={[styles.statusChipText, { color: badgeText, fontWeight: active ? '700' : '500' }]}>
                    {s} {statusCounts[s] !== undefined ? `(${statusCounts[s] || 0})` : '(0)'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Industry Selection Trigger Trigger */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.industrySelectorDropdownButton}
            onPress={() => setIndustryModalOpen(true)}
          >
            <Text style={styles.industrySelectorText} numberOfLines={1}>
              {industryFilter === 'All' ? '📂 All Industries' : `${getIndustryIcon(industryFilter)} ${industryFilter}`}
            </Text>
            <Text style={styles.dropdownCaret}>▼</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Dynamic Status Blocks */}
      {loading && (
        <View style={styles.centeredStateBlock}>
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text style={styles.stateMetaMessageText}>Loading companies…</Text>
        </View>
      )}

      {!loading && error && (
        <View style={styles.centeredStateBlock}>
          <Text style={styles.errorTextHeading}>{error}</Text>
          <TouchableOpacity onPress={fetchCompanies} style={styles.retryButtonAction}>
            <Text style={styles.retryButtonActionText}>Try again</Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && !error && filteredCompanies.length === 0 && (
        <View style={styles.centeredStateBlock}>
          <Text style={styles.emptyGraphicIcon}>🏢</Text>
          <Text style={styles.stateMetaMessageText}>No companies found.</Text>
        </View>
      )}

      {/* Primary Vertical Content Scroll Container */}
      {!loading && !error && filteredCompanies.length > 0 && (
        <ScrollView contentContainerStyle={styles.listScroller} showsVerticalScrollIndicator={false}>
          {filteredCompanies.map((company) => (
            <TouchableOpacity
              key={company.id || company._id}
              activeOpacity={0.9}
              style={styles.companyCardItem}
              onPress={() => setViewingCompany(company)}
            >
              {/* Profile Top Row */}
              <View style={styles.cardTopRow}>
                <CompanyAvatar name={company.name} />
                <View style={styles.cardMiddleIdentificationBlock}>
                  <Text style={styles.cardCompanyName} numberOfLines={1}>
                    {company.name}
                  </Text>
                  {company.website ? (
                    <Text style={styles.cardCompanyWebsite} numberOfLines={1}>
                      {company.website}
                    </Text>
                  ) : null}
                </View>
                <StatusBadge status={company.status} />
              </View>

              {/* Tag Metric Summary Footer Grid Row */}
              <View style={styles.cardMetadataFooterMetricsRow}>
                {company.industry ? (
                  <View style={styles.cardTagItem}>
                    <Text style={styles.cardTagItemText}>
                      {getIndustryIcon(company.industry)} {company.industry}
                    </Text>
                  </View>
                ) : null}
                <View style={styles.cardTagItem}>
                  <Text style={styles.cardTagItemText}>👤 {company.contactCount ?? 0} contacts</Text>
                </View>
                <View style={[styles.cardTagItem, styles.pillBlueBg]}>
                  <Text style={[styles.cardTagItemText, styles.pillBlueText]}>🤝 {company.activeDeals ?? 0} deals</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
          
          <Text style={styles.indexFooterRecordCounterText}>
            Showing {filteredCompanies.length} of {companies.length} companies
          </Text>
        </ScrollView>
      )}

      {/* ── Native Drawer Option Sheet for Industries ── */}
      <Modal visible={industryModalOpen} transparent animationType="slide" onRequestClose={() => setIndustryModalOpen(false)}>
        <TouchableOpacity style={styles.modalBlurDimBackdrop} activeOpacity={1} onPress={() => setIndustryModalOpen(false)}>
          <View style={styles.industryDrawerLayoutContainer} onStartShouldSetResponder={() => true}>
            <View style={styles.drawerDragHandleIndicatorBar} />
            <Text style={styles.drawerModalHeaderHeadline}>Select Industry</Text>
            <ScrollView style={styles.drawerItemsContentScroll}>
              {INDUSTRY_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.drawerSelectionItemRow, industryFilter === opt && styles.drawerSelectionItemRowActive]}
                  onPress={() => {
                    setIndustryFilter(opt);
                    setIndustryModalOpen(false);
                  }}
                >
                  <Text style={styles.drawerSelectionRowLabel}>
                    {opt === 'All' ? '📂 All Industries' : `${getIndustryIcon(opt)} ${opt}`}
                  </Text>
                  {industryFilter === opt && <Text style={styles.drawerSelectionRowCheckmark}>✓</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Detail Profile Bottom Sheet Modal Layer ── */}
      <Modal visible={viewingCompany !== null} transparent animationType="slide" onRequestClose={() => setViewingCompany(null)}>
        <TouchableOpacity style={styles.modalBlurDimBackdrop} activeOpacity={1} onPress={() => setViewingCompany(null)}>
          {viewingCompany && (
            <View style={styles.profileBottomSheetCardBody} onStartShouldSetResponder={() => true}>
              {/* Top Drag Indicator Element */}
              <View style={styles.drawerDragHandleIndicatorBar} />

              {/* Dynamic Header Layout Block */}
              <View style={[styles.profileSheetHeaderBlock, { backgroundColor: getStatusConfig(viewingCompany.status).bg }]}>
                <View style={styles.profileSheetHeaderFlexAligner}>
                  <CompanyAvatar name={viewingCompany.name} size="lg" />
                  <View style={styles.profileSheetHeaderIdentGroup}>
                    <Text style={styles.profileSheetCompanyNameTitle} numberOfLines={2}>
                      {viewingCompany.name}
                    </Text>
                    <Text style={styles.profileSheetCompanyIndustrySubhead}>
                      {getIndustryIcon(viewingCompany.industry)} {viewingCompany.industry || 'CRM Relationship Profile'}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setViewingCompany(null)} style={styles.profileSheetCloseCircularHandleButton}>
                    <Text style={styles.profileSheetCloseCircularHandleButtonText}>×</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Structured Metadata Fields Grid Display Box */}
              <ScrollView style={styles.profileSheetFieldGridScrollTrack} showsVerticalScrollIndicator={false}>
                <View style={styles.metaInformationGridSystem}>
                  
                  <View style={styles.gridCellHalfColumnWidth}>
                    <Text style={styles.metaCellUppercaseLabelText}>INDUSTRY</Text>
                    <Text style={styles.metaCellContentDataValueString}>{viewingCompany.industry || '—'}</Text>
                  </View>

                  <View style={styles.gridCellHalfColumnWidth}>
                    <Text style={styles.metaCellUppercaseLabelText}>ENTITY TYPE</Text>
                    <Text style={styles.metaCellContentDataValueString}>{viewingCompany.entityType || '—'}</Text>
                  </View>

                  <View style={styles.gridCellHalfColumnWidth}>
                    <Text style={styles.metaCellUppercaseLabelText}>STATUS</Text>
                    <View style={styles.badgeAlignWrapper}>
                      <StatusBadge status={viewingCompany.status} />
                    </View>
                  </View>

                  <View style={styles.gridCellHalfColumnWidth}>
                    <Text style={styles.metaCellUppercaseLabelText}>WEBSITE</Text>
                    {viewingCompany.website ? (
                      <TouchableOpacity onPress={() => handleWebsitePress(viewingCompany.website)}>
                        <Text style={[styles.metaCellContentDataValueString, styles.hyperlinkTextValueString]} numberOfLines={1}>
                          {viewingCompany.website}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <Text style={styles.metaCellContentDataValueString}>—</Text>
                    )}
                  </View>

                  <View style={styles.gridCellHalfColumnWidth}>
                    <Text style={styles.metaCellUppercaseLabelText}>LOCATION</Text>
                    <Text style={styles.metaCellContentDataValueString}>{viewingCompany.location || '—'}</Text>
                  </View>

                  <View style={styles.gridCellHalfColumnWidth}>
                    <Text style={styles.metaCellUppercaseLabelText}>CONTACTS</Text>
                    <View style={styles.badgeAlignWrapper}>
                      <CountPill value={viewingCompany.contactCount} />
                    </View>
                  </View>

                  <View style={styles.gridCellHalfColumnWidth}>
                    <Text style={styles.metaCellUppercaseLabelText}>ACTIVE DEALS</Text>
                    <View style={styles.badgeAlignWrapper}>
                      <CountPill value={viewingCompany.activeDeals} variant="blue" />
                    </View>
                  </View>

                  <View style={styles.gridCellFullColumnWidth}>
                    <Text style={styles.metaCellUppercaseLabelText}>DESCRIPTION</Text>
                    <Text style={styles.metaCellContentDataValueString}>
                      {viewingCompany.description || 'No description available for this organization.'}
                    </Text>
                  </View>

                </View>
              </ScrollView>

              {/* Action Sheet Dismiss Control Bar */}
              <View style={styles.profileSheetBottomFooterControlActionRow}>
                <TouchableOpacity onPress={() => setViewingCompany(null)} style={styles.profileSheetDismissButtonFrame}>
                  <Text style={styles.profileSheetDismissButtonFrameText}>Close</Text>
                </TouchableOpacity>
              </View>

            </View>
          )}
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}

/* ── Native Stylesheet Definition ────────────────────────────────── */
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 40 : 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.surface,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  readOnlyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 99,
    gap: 6,
  },
  readOnlyPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fbbf24',
  },
  readOnlyText: {
    color: '#b45309',
    fontSize: 11,
    fontWeight: '700',
  },
  controlsWidget: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    gap: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIconSymbol: {
    fontSize: 14,
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    color: '#0f172a',
    fontSize: 14,
  },
  searchClearHitbox: {
    padding: 4,
  },
  searchClearText: {
    color: '#94a3b8',
    fontSize: 18,
    fontWeight: 'bold',
  },
  filterRowsBlock: {
    gap: 10,
  },
  statusScrollContainer: {
    gap: 8,
    paddingVertical: 2,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
    gap: 6,
  },
  chipIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusChipText: {
    fontSize: 12,
  },
  industrySelectorDropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  industrySelectorText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.surface,
  },
  dropdownCaret: {
    fontSize: 10,
    color: '#64748b',
  },
  centeredStateBlock: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    gap: 10,
  },
  stateMetaMessageText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyGraphicIcon: {
    fontSize: 36,
    color: '#94a3b8',
  },
  errorTextHeading: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  retryButtonAction: {
    marginTop: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
  },
  retryButtonActionText: {
    color: '#2563eb',
    fontSize: 13,
    fontWeight: '600',
  },
  listScroller: {
    padding: 16,
    gap: 12,
  },
  companyCardItem: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 14,
    gap: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardMiddleIdentificationBlock: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
    gap: 2,
  },
  cardCompanyName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  cardCompanyWebsite: {
    fontSize: 12,
    color: '#6366f1',
  },
  cardMetadataFooterMetricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: '#f1f5f9',
  },
  cardTagItem: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cardTagItemText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  indexFooterRecordCounterText: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 8,
    marginBottom: 20,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 99,
    gap: 4,
  },
  badgeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  avatarBase: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarMedium: {
    width: 38,
    height: 38,
    borderRadius: 10,
  },
  avatarLarge: {
    width: 52,
    height: 52,
    borderRadius: 14,
  },
  avatarText: {
    fontWeight: 'bold',
  },
  pillContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillGrayBg: { backgroundColor: '#f1f5f9' },
  pillBlueBg: { backgroundColor: '#eff6ff', borderColor: '#dbeafe', borderWidth: 1 },
  pillText: { fontSize: 12, fontWeight: '700' },
  pillGrayText: { color: '#334155' },
  pillBlueText: { color: '#1e40af' },
  modalBlurDimBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  industryDrawerLayoutContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    maxHeight: WINDOW_HEIGHT * 0.6,
  },
  drawerDragHandleIndicatorBar: {
    width: 40,
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
  },
  drawerModalHeaderHeadline: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    marginVertical: 14,
  },
  drawerItemsContentScroll: {
    paddingHorizontal: 16,
  },
  drawerSelectionItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
  },
  drawerSelectionItemRowActive: {
    backgroundColor: '#fafafa',
  },
  drawerSelectionRowLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  drawerSelectionRowCheckmark: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4f46e5',
  },
  profileBottomSheetCardBody: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: WINDOW_HEIGHT * 0.85,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 24,
  },
  profileSheetHeaderBlock: {
    padding: 16,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 10,
  },
  profileSheetHeaderFlexAligner: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  profileSheetHeaderIdentGroup: {
    flex: 1,
    marginLeft: 12,
    marginRight: 32,
    gap: 2,
  },
  profileSheetCompanyNameTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    lineHeight: 20,
  },
  profileSheetCompanyIndustrySubhead: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  profileSheetCloseCircularHandleButton: {
    position: 'absolute',
    top: 4,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileSheetCloseCircularHandleButtonText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '700',
    lineHeight: 18,
  },
  profileSheetFieldGridScrollTrack: {
    flex: 1,
    padding: 16,
  },
  metaInformationGridSystem: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 16,
  },
  gridCellHalfColumnWidth: {
    width: '50%',
    paddingRight: 8,
  },
  gridCellFullColumnWidth: {
    width: '100%',
  },
  metaCellUppercaseLabelText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  metaCellContentDataValueString: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    lineHeight: 18,
  },
  hyperlinkTextValueString: {
    color: '#4f46e5',
    textDecorationLine: 'underline',
  },
  badgeAlignWrapper: {
    alignSelf: 'flex-start',
  },
  profileSheetBottomFooterControlActionRow: {
    padding: 16,
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderColor: '#f1f5f9',
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  profileSheetDismissButtonFrame: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileSheetDismissButtonFrameText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '700',
  },
});