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
import { useTheme } from '@/contexts/ThemeContext';
import { s, wp, hp, fs } from '@/util/styles';

const { height: WINDOW_HEIGHT } = Dimensions.get('window');

const STATUS_OPTIONS = ['All', 'Active', 'Prospect', 'Inactive'];
const INDUSTRY_OPTIONS = ['All', 'Technology', 'Finance', 'Healthcare', 'Retail', 'Manufacturing', 'Logistics', 'Other'];

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

function buildColors(uiTheme: any, isDark: boolean) {
  return {
    background:    uiTheme.panelColors?.dashboardBackground     || (isDark ? '#0f1117' : '#f8fafc'),
    cardBg:        uiTheme.panelColors?.dashboardCardBackground || (isDark ? '#171717' : '#ffffff'),
    text:          uiTheme.panelColors?.dashboardTextColor      || (isDark ? '#ffffff' : '#0f172a'),
    textSecondary: isDark ? '#94a3b8' : '#64748b',
    textMuted:     isDark ? '#64748b' : '#94a3b8',
    textDark:      isDark ? '#737373' : '#334155',
    border:        isDark ? '#262626' : '#e2e8f0',
    borderLight:   isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9',
    inputBg:       isDark ? 'rgba(0,0,0,0.2)' : '#f8fafc',
    primary:       uiTheme.customColors?.primary || (isDark ? '#6366f1' : '#4f46e5'),
    readOnlyBg:    isDark ? 'rgba(245, 158, 11, 0.1)' : '#fffbeb',
    readOnlyBorder:isDark ? 'rgba(245, 158, 11, 0.25)' : '#fde68a',
    readOnlyText:  '#b45309',
    overlayBg:     'rgba(15, 23, 42, 0.4)',
    status: {
      Active:   { bg: isDark ? 'rgba(16, 185, 129, 0.1)' : '#ecfdf5', text: isDark ? '#34d399' : '#047857', border: isDark ? 'rgba(16, 185, 129, 0.25)' : '#a7f3d0', dot: '#10b981' },
      Prospect: { bg: isDark ? 'rgba(59, 130, 246, 0.1)' : '#eff6ff', text: isDark ? '#60a5fa' : '#1d4ed8', border: isDark ? 'rgba(59, 130, 246, 0.25)' : '#bfdbfe', dot: '#3b82f6' },
      Inactive: { bg: isDark ? 'rgba(148, 163, 184, 0.1)' : '#f8fafc', text: isDark ? '#94a3b8' : '#475569', border: isDark ? 'rgba(148, 163, 184, 0.25)' : '#e2e8f0', dot: '#94a3b8' },
      Unknown:  { bg: isDark ? '#27272a' : '#f4f4f5', text: isDark ? '#a1a1aa' : '#71717a', border: isDark ? '#3f3f46' : '#e4e4e7', dot: '#a1a1aa' },
    }
  };
}

function createStyles(colors: ReturnType<typeof buildColors>) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    headerContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: wp(4),
      paddingTop: Platform.OS === 'android' ? hp(5) : hp(2),
      paddingBottom: hp(1.5),
    },
    headerTitle: {
      fontSize: fs(6),
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.5,
    },
    headerSubtitle: {
      fontSize: fs(3.2),
      color: colors.textSecondary,
      marginTop: hp(0.25),
    },
    readOnlyBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.readOnlyBg,
      borderWidth: 1,
      borderColor: colors.readOnlyBorder,
      paddingHorizontal: wp(2.5),
      paddingVertical: hp(0.6),
      borderRadius: wp(10),
      gap: wp(1.5),
    },
    readOnlyPulseDot: {
      width: wp(1.5),
      height: wp(1.5),
      borderRadius: wp(0.75),
      backgroundColor: '#fbbf24',
    },
    readOnlyText: {
      color: colors.readOnlyText,
      fontSize: fs(2.8),
      fontWeight: '700',
    },
    controlsWidget: {
      backgroundColor: colors.cardBg,
      borderBottomWidth: 1,
      borderColor: colors.border,
      padding: wp(3.5),
      gap: hp(1.5),
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: wp(3),
      paddingHorizontal: wp(3),
      height: hp(5.5),
    },
    searchIconSymbol: {
      fontSize: fs(3.5),
      marginRight: wp(1.5),
    },
    searchInput: {
      flex: 1,
      color: colors.text,
      fontSize: fs(3.5),
    },
    searchClearHitbox: {
      padding: wp(1),
    },
    searchClearText: {
      color: colors.textMuted,
      fontSize: fs(4.5),
      fontWeight: 'bold',
    },
    filterRowsBlock: {
      gap: hp(1.2),
    },
    statusScrollContainer: {
      gap: wp(2),
      paddingVertical: hp(0.25),
    },
    statusChip: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      paddingHorizontal: wp(3),
      paddingVertical: hp(0.75),
      borderRadius: wp(10),
      gap: wp(1.5),
    },
    chipIndicatorDot: {
      width: wp(1.5),
      height: wp(1.5),
      borderRadius: wp(0.75),
    },
    statusChipText: {
      fontSize: fs(3),
    },
    industrySelectorDropdownButton: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: wp(3),
      paddingVertical: hp(1),
      borderRadius: wp(2.5),
    },
    industrySelectorText: {
      fontSize: fs(3.2),
      fontWeight: '600',
      color: colors.textMuted,
    },
    dropdownCaret: {
      fontSize: fs(2.5),
      color: colors.textSecondary,
    },
    centeredStateBlock: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: hp(7.5),
      gap: hp(1.2),
    },
    stateMetaMessageText: {
      color: colors.textSecondary,
      fontSize: fs(3.5),
      fontWeight: '500',
    },
    emptyGraphicIcon: {
      fontSize: fs(9),
      color: colors.textMuted,
    },
    errorTextHeading: {
      color: '#ef4444',
      fontSize: fs(3.5),
      fontWeight: '600',
      textAlign: 'center',
      paddingHorizontal: wp(6),
    },
    retryButtonAction: {
      marginTop: hp(0.75),
      paddingHorizontal: wp(3.5),
      paddingVertical: hp(0.75),
      backgroundColor: colors.inputBg,
      borderRadius: wp(2),
    },
    retryButtonActionText: {
      color: colors.primary,
      fontSize: fs(3.2),
      fontWeight: '600',
    },
    listScroller: {
      padding: wp(4),
      gap: hp(1.5),
    },
    companyCardItem: {
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: wp(4),
      padding: wp(3.5),
      gap: hp(1.5),
    },
    cardTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    cardMiddleIdentificationBlock: {
      flex: 1,
      marginLeft: wp(3),
      marginRight: wp(2),
      gap: hp(0.25),
    },
    cardCompanyName: {
      fontSize: fs(3.8),
      fontWeight: '700',
      color: colors.text,
    },
    cardCompanyWebsite: {
      fontSize: fs(3),
      color: colors.primary,
    },
    cardMetadataFooterMetricsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: wp(2),
      paddingTop: hp(1.2),
      borderTopWidth: 1,
      borderColor: colors.borderLight,
    },
    cardTagItem: {
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: wp(2.5),
      paddingVertical: hp(0.5),
      borderRadius: wp(2),
    },
    cardTagItemText: {
      fontSize: fs(2.8),
      fontWeight: '600',
      color: colors.textDark,
    },
    indexFooterRecordCounterText: {
      textAlign: 'center',
      color: colors.textMuted,
      fontSize: fs(3),
      marginTop: hp(1),
      marginBottom: hp(2.5),
    },
    badgeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      paddingHorizontal: wp(2),
      paddingVertical: hp(0.5),
      borderRadius: wp(10),
      gap: wp(1),
    },
    badgeDot: {
      width: wp(1.2),
      height: wp(1.2),
      borderRadius: wp(0.6),
    },
    badgeText: {
      fontSize: fs(2.8),
      fontWeight: '700',
    },
    avatarBase: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarMedium: {
      width: wp(9.5),
      height: wp(9.5),
      borderRadius: wp(2.5),
    },
    avatarLarge: {
      width: wp(13),
      height: wp(13),
      borderRadius: wp(3.5),
    },
    avatarText: {
      fontWeight: 'bold',
    },
    pillContainer: {
      paddingHorizontal: wp(2),
      paddingVertical: hp(0.5),
      borderRadius: wp(1.5),
      alignItems: 'center',
      justifyContent: 'center',
    },
    pillGrayBg: { backgroundColor: colors.inputBg },
    pillBlueBg: { backgroundColor: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.25)', borderWidth: 1 },
    pillText: { fontSize: fs(3), fontWeight: '700' },
    pillGrayText: { color: colors.textDark },
    pillBlueText: { color: colors.primary },
    modalBlurDimBackdrop: {
      flex: 1,
      backgroundColor: colors.overlayBg,
      justifyContent: 'flex-end',
    },
    industryDrawerLayoutContainer: {
      backgroundColor: colors.cardBg,
      borderTopLeftRadius: wp(6),
      borderTopRightRadius: wp(6),
      paddingBottom: Platform.OS === 'ios' ? hp(4) : hp(3),
      maxHeight: WINDOW_HEIGHT * 0.6,
    },
    drawerDragHandleIndicatorBar: {
      width: wp(10),
      height: hp(0.5),
      backgroundColor: colors.border,
      borderRadius: wp(0.5),
      alignSelf: 'center',
      marginTop: hp(1.2),
    },
    drawerModalHeaderHeadline: {
      fontSize: fs(4),
      fontWeight: '800',
      color: colors.text,
      textAlign: 'center',
      marginVertical: hp(1.8),
    },
    drawerItemsContentScroll: {
      paddingHorizontal: wp(4),
    },
    drawerSelectionItemRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: hp(1.8),
      borderBottomWidth: 1,
      borderColor: colors.borderLight,
    },
    drawerSelectionItemRowActive: {
      backgroundColor: colors.inputBg,
    },
    drawerSelectionRowLabel: {
      fontSize: fs(3.5),
      fontWeight: '600',
      color: colors.textDark,
    },
    drawerSelectionRowCheckmark: {
      fontSize: fs(3.5),
      fontWeight: 'bold',
      color: colors.primary,
    },
    profileBottomSheetCardBody: {
      backgroundColor: colors.cardBg,
      borderTopLeftRadius: wp(7),
      borderTopRightRadius: wp(7),
      height: WINDOW_HEIGHT * 0.85,
    },
    profileSheetHeaderBlock: {
      padding: wp(4),
      borderBottomWidth: 1,
      borderColor: colors.border,
      marginTop: hp(1.2),
    },
    profileSheetHeaderFlexAligner: {
      flexDirection: 'row',
      alignItems: 'center',
      position: 'relative',
    },
    profileSheetHeaderIdentGroup: {
      flex: 1,
      marginLeft: wp(3),
      marginRight: wp(8),
      gap: hp(0.25),
    },
    profileSheetCompanyNameTitle: {
      fontSize: fs(4),
      fontWeight: '800',
      color: colors.text,
      lineHeight: fs(5),
    },
    profileSheetCompanyIndustrySubhead: {
      fontSize: fs(3),
      color: colors.textSecondary,
      fontWeight: '500',
    },
    profileSheetCloseCircularHandleButton: {
      position: 'absolute',
      top: hp(0.5),
      right: 0,
      width: wp(7),
      height: wp(7),
      borderRadius: wp(3.5),
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    profileSheetCloseCircularHandleButtonText: {
      fontSize: fs(4),
      color: colors.textSecondary,
      fontWeight: '700',
      lineHeight: fs(4.5),
    },
    profileSheetFieldGridScrollTrack: {
      flex: 1,
      padding: wp(4),
    },
    metaInformationGridSystem: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      rowGap: hp(2),
    },
    gridCellHalfColumnWidth: {
      width: '50%',
      paddingRight: wp(2),
    },
    gridCellFullColumnWidth: {
      width: '100%',
    },
    metaCellUppercaseLabelText: {
      fontSize: fs(2.5),
      fontWeight: '800',
      color: colors.textMuted,
      letterSpacing: 0.8,
      marginBottom: hp(0.5),
    },
    metaCellContentDataValueString: {
      fontSize: fs(3.5),
      fontWeight: '600',
      color: colors.textDark,
      lineHeight: fs(4.5),
    },
    hyperlinkTextValueString: {
      color: colors.primary,
      textDecorationLine: 'underline',
    },
    badgeAlignWrapper: {
      alignSelf: 'flex-start',
    },
    profileSheetBottomFooterControlActionRow: {
      padding: wp(4),
      backgroundColor: colors.inputBg,
      borderTopWidth: 1,
      borderColor: colors.borderLight,
      paddingBottom: Platform.OS === 'ios' ? hp(4) : hp(2),
    },
    profileSheetDismissButtonFrame: {
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: wp(3),
      paddingVertical: hp(1.5),
      alignItems: 'center',
      justifyContent: 'center',
    },
    profileSheetDismissButtonFrameText: {
      color: colors.textSecondary,
      fontSize: fs(3.5),
      fontWeight: '700',
    },
  });
}

function StatusBadge({ status, colors, styles }: { status: string; colors: any; styles: any }) {
  const cfg = colors.status[status as keyof typeof colors.status] || colors.status.Unknown;
  return (
    <View style={s([styles.badgeContainer, { backgroundColor: cfg.bg, borderColor: cfg.border }])}>
      <View style={s([styles.badgeDot, { backgroundColor: cfg.dot }])} />
      <Text style={s([styles.badgeText, { color: cfg.text }])}>{status || 'Unknown'}</Text>
    </View>
  );
}

function CompanyAvatar({ name, size = 'md', styles }: { name: string; size?: 'sm' | 'lg'; styles: any }) {
  const palette = avatarColor(name);
  const sizeStyle = size === 'lg' ? styles.avatarLarge : styles.avatarMedium;
  return (
    <View style={s([styles.avatarBase, sizeStyle, { backgroundColor: palette.bg }])}>
      <Text style={s([styles.avatarText, { color: palette.text, fontSize: size === 'lg' ? fs(4.5) : fs(3.5) }])}>
        {getInitials(name)}
      </Text>
    </View>
  );
}

function CountPill({ value, variant = 'gray', styles }: { value: any; variant?: 'gray' | 'blue'; styles: any }) {
  const isBlue = variant === 'blue';
  return (
    <View style={s([styles.pillContainer, isBlue ? styles.pillBlueBg : styles.pillGrayBg])}>
      <Text style={s([styles.pillText, isBlue ? styles.pillBlueText : styles.pillGrayText])}>
        {value ?? '—'}
      </Text>
    </View>
  );
}

export default function ManagerCRMCompanies() {
  const { uiTheme } = useTheme();
  const isDark = (uiTheme?.theme as string) === 'dark' || (uiTheme?.theme as string) === 'metallic-elite';
  const colors = useMemo(() => buildColors(uiTheme, isDark), [uiTheme, isDark]);
  const styles = useMemo(() => createStyles(colors), [colors]);

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
    <SafeAreaView style={s(styles.safeArea)}>
      <View style={s(styles.headerContainer)}>
        <View>
          <Text style={s(styles.headerTitle)}>Companies</Text>
          <Text style={s(styles.headerSubtitle)}>View organization details and relationships.</Text>
        </View>
        <View style={s(styles.readOnlyBadge)}>
          <View style={s(styles.readOnlyPulseDot)} />
          <Text style={s(styles.readOnlyText)}>Read-only view</Text>
        </View>
      </View>

      <View style={s(styles.controlsWidget)}>
        <View style={s(styles.searchContainer)}>
          <Text style={s(styles.searchIconSymbol)}>🔍</Text>
          <TextInput
            style={s(styles.searchInput)}
            placeholder="Search by name, industry, or website…"
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={s(styles.searchClearHitbox)}>
              <Text style={s(styles.searchClearText)}>×</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={s(styles.filterRowsBlock)}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s(styles.statusScrollContainer)}
          >
            {STATUS_OPTIONS.map((sItem) => {
              const active = statusFilter === sItem;
              const cfg = colors.status[sItem as keyof typeof colors.status] || colors.status.Unknown;
              
              let badgeBg = colors.cardBg;
              let badgeBorder = colors.border;
              let badgeText = colors.textSecondary;

              if (active) {
                if (sItem === 'All') {
                  badgeBg = colors.primary;
                  badgeBorder = colors.primary;
                  badgeText = '#ffffff';
                } else {
                  badgeBg = cfg.bg;
                  badgeBorder = cfg.border;
                  badgeText = cfg.text;
                }
              }

              return (
                <TouchableOpacity
                  key={sItem}
                  activeOpacity={0.7}
                  onPress={() => setStatusFilter(sItem)}
                  style={s([styles.statusChip, { backgroundColor: badgeBg, borderColor: badgeBorder }])}
                >
                  {sItem !== 'All' && active && <View style={s([styles.chipIndicatorDot, { backgroundColor: cfg.dot }])} />}
                  <Text style={s([styles.statusChipText, { color: badgeText, fontWeight: active ? '700' : '500' }])}>
                    {sItem} {statusCounts[sItem] !== undefined ? `(${statusCounts[sItem] || 0})` : '(0)'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <TouchableOpacity
            activeOpacity={0.7}
            style={s(styles.industrySelectorDropdownButton)}
            onPress={() => setIndustryModalOpen(true)}
          >
            <Text style={s(styles.industrySelectorText)} numberOfLines={1}>
              {industryFilter === 'All' ? '📂 All Industries' : `${getIndustryIcon(industryFilter)} ${industryFilter}`}
            </Text>
            <Text style={s(styles.dropdownCaret)}>▼</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading && (
        <View style={s(styles.centeredStateBlock)}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={s(styles.stateMetaMessageText)}>Loading companies…</Text>
        </View>
      )}

      {!loading && error && (
        <View style={s(styles.centeredStateBlock)}>
          <Text style={s(styles.errorTextHeading)}>{error}</Text>
          <TouchableOpacity onPress={fetchCompanies} style={s(styles.retryButtonAction)}>
            <Text style={s(styles.retryButtonActionText)}>Try again</Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && !error && filteredCompanies.length === 0 && (
        <View style={s(styles.centeredStateBlock)}>
          <Text style={s(styles.emptyGraphicIcon)}>🏢</Text>
          <Text style={s(styles.stateMetaMessageText)}>No companies found.</Text>
        </View>
      )}

      {!loading && !error && filteredCompanies.length > 0 && (
        <ScrollView contentContainerStyle={s(styles.listScroller)} showsVerticalScrollIndicator={false}>
          {filteredCompanies.map((company) => (
            <TouchableOpacity
              key={company.id || company._id}
              activeOpacity={0.9}
              style={s(styles.companyCardItem)}
              onPress={() => setViewingCompany(company)}
            >
              <View style={s(styles.cardTopRow)}>
                <CompanyAvatar name={company.name} styles={styles} />
                <View style={s(styles.cardMiddleIdentificationBlock)}>
                  <Text style={s(styles.cardCompanyName)} numberOfLines={1}>
                    {company.name}
                  </Text>
                  {company.website ? (
                    <Text style={s(styles.cardCompanyWebsite)} numberOfLines={1}>
                      {company.website}
                    </Text>
                  ) : null}
                </View>
                <StatusBadge status={company.status} colors={colors} styles={styles} />
              </View>

              <View style={s(styles.cardMetadataFooterMetricsRow)}>
                {company.industry ? (
                  <View style={s(styles.cardTagItem)}>
                    <Text style={s(styles.cardTagItemText)}>
                      {getIndustryIcon(company.industry)} {company.industry}
                    </Text>
                  </View>
                ) : null}
                <View style={s(styles.cardTagItem)}>
                  <Text style={s(styles.cardTagItemText)}>👤 {company.contactCount ?? 0} contacts</Text>
                </View>
                <View style={s([styles.cardTagItem, styles.pillBlueBg])}>
                  <Text style={s([styles.cardTagItemText, styles.pillBlueText])}>🤝 {company.activeDeals ?? 0} deals</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
          
          <Text style={s(styles.indexFooterRecordCounterText)}>
            Showing {filteredCompanies.length} of {companies.length} companies
          </Text>
        </ScrollView>
      )}

      <Modal visible={industryModalOpen} transparent animationType="slide" onRequestClose={() => setIndustryModalOpen(false)}>
        <TouchableOpacity style={s(styles.modalBlurDimBackdrop)} activeOpacity={1} onPress={() => setIndustryModalOpen(false)}>
          <View style={s(styles.industryDrawerLayoutContainer)} onStartShouldSetResponder={() => true}>
            <View style={s(styles.drawerDragHandleIndicatorBar)} />
            <Text style={s(styles.drawerModalHeaderHeadline)}>Select Industry</Text>
            <ScrollView style={s(styles.drawerItemsContentScroll)}>
              {INDUSTRY_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={s([styles.drawerSelectionItemRow, industryFilter === opt && styles.drawerSelectionItemRowActive])}
                  onPress={() => {
                    setIndustryFilter(opt);
                    setIndustryModalOpen(false);
                  }}
                >
                  <Text style={s(styles.drawerSelectionRowLabel)}>
                    {opt === 'All' ? '📂 All Industries' : `${getIndustryIcon(opt)} ${opt}`}
                  </Text>
                  {industryFilter === opt && <Text style={s(styles.drawerSelectionRowCheckmark)}>✓</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={viewingCompany !== null} transparent animationType="slide" onRequestClose={() => setViewingCompany(null)}>
        <TouchableOpacity style={s(styles.modalBlurDimBackdrop)} activeOpacity={1} onPress={() => setViewingCompany(null)}>
          {viewingCompany && (
            <View style={s(styles.profileBottomSheetCardBody)} onStartShouldSetResponder={() => true}>
              <View style={s(styles.drawerDragHandleIndicatorBar)} />

              <View style={s([styles.profileSheetHeaderBlock, { backgroundColor: (colors.status[viewingCompany.status as keyof typeof colors.status] || colors.status.Unknown).bg }])}>
                <View style={s(styles.profileSheetHeaderFlexAligner)}>
                  <CompanyAvatar name={viewingCompany.name} size="lg" styles={styles} />
                  <View style={s(styles.profileSheetHeaderIdentGroup)}>
                    <Text style={s(styles.profileSheetCompanyNameTitle)} numberOfLines={2}>
                      {viewingCompany.name}
                    </Text>
                    <Text style={s(styles.profileSheetCompanyIndustrySubhead)}>
                      {getIndustryIcon(viewingCompany.industry)} {viewingCompany.industry || 'CRM Relationship Profile'}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setViewingCompany(null)} style={s(styles.profileSheetCloseCircularHandleButton)}>
                    <Text style={s(styles.profileSheetCloseCircularHandleButtonText)}>×</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <ScrollView style={s(styles.profileSheetFieldGridScrollTrack)} showsVerticalScrollIndicator={false}>
                <View style={s(styles.metaInformationGridSystem)}>
                  
                  <View style={s(styles.gridCellHalfColumnWidth)}>
                    <Text style={s(styles.metaCellUppercaseLabelText)}>INDUSTRY</Text>
                    <Text style={s(styles.metaCellContentDataValueString)}>{viewingCompany.industry || '—'}</Text>
                  </View>

                  <View style={s(styles.gridCellHalfColumnWidth)}>
                    <Text style={s(styles.metaCellUppercaseLabelText)}>ENTITY TYPE</Text>
                    <Text style={s(styles.metaCellContentDataValueString)}>{viewingCompany.entityType || '—'}</Text>
                  </View>

                  <View style={s(styles.gridCellHalfColumnWidth)}>
                    <Text style={s(styles.metaCellUppercaseLabelText)}>STATUS</Text>
                    <View style={s(styles.badgeAlignWrapper)}>
                      <StatusBadge status={viewingCompany.status} colors={colors} styles={styles} />
                    </View>
                  </View>

                  <View style={s(styles.gridCellHalfColumnWidth)}>
                    <Text style={s(styles.metaCellUppercaseLabelText)}>WEBSITE</Text>
                    {viewingCompany.website ? (
                      <TouchableOpacity onPress={() => handleWebsitePress(viewingCompany.website)}>
                        <Text style={s([styles.metaCellContentDataValueString, styles.hyperlinkTextValueString])} numberOfLines={1}>
                          {viewingCompany.website}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <Text style={s(styles.metaCellContentDataValueString)}>—</Text>
                    )}
                  </View>

                  <View style={s(styles.gridCellHalfColumnWidth)}>
                    <Text style={s(styles.metaCellUppercaseLabelText)}>LOCATION</Text>
                    <Text style={s(styles.metaCellContentDataValueString)}>{viewingCompany.location || '—'}</Text>
                  </View>

                  <View style={s(styles.gridCellHalfColumnWidth)}>
                    <Text style={s(styles.metaCellUppercaseLabelText)}>CONTACTS</Text>
                    <View style={s(styles.badgeAlignWrapper)}>
                      <CountPill value={viewingCompany.contactCount} styles={styles} />
                    </View>
                  </View>

                  <View style={s(styles.gridCellHalfColumnWidth)}>
                    <Text style={s(styles.metaCellUppercaseLabelText)}>ACTIVE DEALS</Text>
                    <View style={s(styles.badgeAlignWrapper)}>
                      <CountPill value={viewingCompany.activeDeals} variant="blue" styles={styles} />
                    </View>
                  </View>

                  <View style={s(styles.gridCellFullColumnWidth)}>
                    <Text style={s(styles.metaCellUppercaseLabelText)}>DESCRIPTION</Text>
                    <Text style={s(styles.metaCellContentDataValueString)}>
                      {viewingCompany.description || 'No description available for this organization.'}
                    </Text>
                  </View>

                </View>
              </ScrollView>

              <View style={s(styles.profileSheetBottomFooterControlActionRow)}>
                <TouchableOpacity onPress={() => setViewingCompany(null)} style={s(styles.profileSheetDismissButtonFrame)}>
                  <Text style={s(styles.profileSheetDismissButtonFrameText)}>Close</Text>
                </TouchableOpacity>
              </View>

            </View>
          )}
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}