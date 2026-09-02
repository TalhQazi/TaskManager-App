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
import { useTheme } from '@/contexts/ThemeContext';
import { s, wp, hp, fs } from '@/util/styles';
import { isDarkTheme } from "@/constants/design/presets";

const STATUS_OPTIONS = ['All', 'Active', 'Pending', 'Inactive'];

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

function buildColors(uiTheme: any, isDark: boolean) {
  return {
    background:      uiTheme.panelColors?.dashboardBackground     || (isDark ? '#0f1117' : '#f8fafc'),
    cardBg:          uiTheme.panelColors?.dashboardCardBackground || (isDark ? '#171717' : '#ffffff'),
    cardBgSub:       isDark ? 'rgba(30, 41, 59, 0.3)' : '#e2e8f0',
    text:            uiTheme.panelColors?.dashboardTextColor      || (isDark ? '#ffffff' : '#0f172a'),
    textSecondary:   isDark ? '#94a3b8' : '#475569',
    textMuted:       isDark ? '#64748b' : '#94a3b8',
    textDark:        isDark ? '#737373' : '#525252',
    border:          isDark ? '#262626' : '#e2e8f0',
    borderLight:     isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    primary:         uiTheme.customColors?.primary || '#38bdf8',
    accentBg:        isDark ? 'rgba(56, 189, 248, 0.15)' : 'rgba(14, 165, 233, 0.1)',
    accentBorder:    isDark ? 'rgba(56, 189, 248, 0.3)' : 'rgba(14, 165, 233, 0.2)',
    inputBg:         isDark ? 'rgba(0,0,0,0.2)' : '#ffffff',
    overlayBg:       'rgba(0,0,0,0.8)',
    status: {
      Active:   { bg: 'rgba(16, 185, 129, 0.1)', text: '#34d399', border: 'rgba(16, 185, 129, 0.25)', dot: '#34d399' },
      Pending:  { bg: 'rgba(245, 158, 11, 0.1)',  text: '#fbbf24', border: 'rgba(245, 158, 11, 0.25)',  dot: '#fbbf24' },
      Inactive: { bg: isDark ? 'rgba(115, 115, 115, 0.15)' : 'rgba(0,0,0,0.05)', text: isDark ? '#a3a3a3' : '#737373', border: isDark ? 'rgba(115, 115, 115, 0.25)' : 'rgba(0,0,0,0.1)', dot: isDark ? '#a3a3a3' : '#737373' },
      Unknown:  { bg: 'rgba(148, 163, 184, 0.1)',  text: '#94a3b8', border: 'rgba(148, 163, 184, 0.25)',  dot: '#94a3b8' },
    }
  };
}

function createStyles(colors: ReturnType<typeof buildColors>) {
  return StyleSheet.create({
    rootContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    topAccentBar: {
      height: hp(0.3),
      backgroundColor: colors.primary,
      width: '100%',
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: wp(4),
      paddingTop: hp(2),
      marginBottom: hp(2),
    },
    headerTitleGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: wp(3),
    },
    headerIconContainer: {
      width: wp(10),
      height: wp(10),
      borderRadius: wp(3),
      backgroundColor: colors.accentBg,
      borderWidth: 1,
      borderColor: colors.accentBorder,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerIconText: {
      fontSize: fs(4.5),
    },
    headerMainTitle: {
      color: colors.text,
      fontSize: fs(5.5),
      fontWeight: '900',
      letterSpacing: -0.5,
    },
    headerSubtitle: {
      color: colors.textSecondary,
      fontSize: fs(2.8),
      marginTop: hp(0.1),
    },
    readOnlyBadge: {
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
      borderWidth: 1,
      borderColor: 'rgba(245, 158, 11, 0.25)',
      paddingHorizontal: wp(2),
      paddingVertical: hp(0.5),
      borderRadius: wp(1.5),
    },
    readOnlyText: {
      color: '#fbbf24',
      fontSize: fs(2.5),
      fontWeight: '700',
    },
    errorBanner: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      borderWidth: 1,
      borderColor: 'rgba(239, 68, 68, 0.25)',
      padding: wp(3),
      marginHorizontal: wp(4),
      borderRadius: wp(3),
      marginBottom: hp(2),
    },
    errorText: {
      color: '#fca5a5',
      fontSize: fs(3.2),
      flex: 1,
    },
    errorCloseText: {
      color: '#ef4444',
      fontSize: fs(4.5),
      fontWeight: 'bold',
      paddingHorizontal: wp(1),
    },
    filterWidgetSection: {
      backgroundColor: colors.cardBgSub,
      borderWidth: 1,
      borderColor: colors.borderLight,
      borderRadius: wp(4),
      padding: wp(3),
      marginHorizontal: wp(4),
      gap: hp(1.5),
      marginBottom: hp(1.8),
    },
    searchBarWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: wp(3),
      paddingHorizontal: wp(3),
      height: hp(5.2),
      position: 'relative',
    },
    searchIconLeft: {
      fontSize: fs(3.5),
      marginRight: wp(2),
    },
    searchInputField: {
      flex: 1,
      color: colors.text,
      fontSize: fs(3.2),
      paddingVertical: 0,
    },
    clearSearchButton: {
      position: 'absolute',
      right: wp(3),
      padding: wp(1),
    },
    clearSearchText: {
      color: colors.textSecondary,
      fontSize: fs(4.5),
      fontWeight: 'bold',
    },
    pillsScrollTrack: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: wp(2),
    },
    filterPillElement: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      paddingHorizontal: wp(2.5),
      paddingVertical: hp(0.75),
      borderRadius: wp(2),
      gap: wp(1.5),
    },
    filterPillInactive: {
      backgroundColor: 'transparent',
      borderColor: colors.border,
    },
    pillTextLabel: {
      fontSize: fs(3),
      fontWeight: '600',
    },
    pillCounterFrame: {
      paddingHorizontal: wp(1.2),
      paddingVertical: hp(0.2),
      borderRadius: wp(1),
    },
    pillCounterText: {
      fontSize: fs(2.2),
      fontWeight: '700',
    },
    loaderCenterState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: hp(5),
      gap: hp(1.2),
    },
    loaderMetaText: {
      color: colors.textSecondary,
      fontSize: fs(3.2),
    },
    recordsListLayout: {
      paddingHorizontal: wp(4),
      paddingBottom: hp(4),
      gap: hp(1.2),
    },
    emptyResultsState: {
      alignItems: 'center',
      paddingVertical: hp(7.5),
    },
    emptyIconGraphic: {
      fontSize: fs(8),
      marginBottom: hp(1.2),
    },
    emptyStateTitle: {
      color: colors.text,
      fontSize: fs(3.8),
      fontWeight: '700',
    },
    emptyStateSubtitle: {
      color: colors.textDark,
      fontSize: fs(3),
      textAlign: 'center',
      marginTop: hp(0.5),
    },
    contactRowItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.borderLight,
      borderRadius: wp(3.5),
      padding: wp(3),
      gap: wp(3),
    },
    contactRowMetaDetails: {
      flex: 1,
      gap: hp(0.25),
    },
    contactCardTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: hp(0.25),
    },
    contactMainNameText: {
      color: colors.text,
      fontSize: fs(3.8),
      fontWeight: '700',
      flex: 1,
      marginRight: wp(2),
    },
    contactCompanySubtitleText: {
      color: colors.textSecondary,
      fontSize: fs(3),
    },
    contactSublineTruncateText: {
      color: colors.textDark,
      fontSize: fs(3),
      marginTop: hp(0.1),
    },
    badgeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      paddingHorizontal: wp(2),
      paddingVertical: hp(0.4),
      borderRadius: wp(1.5),
      gap: wp(1),
    },
    badgeDot: {
      width: wp(1.2),
      height: wp(1.2),
      borderRadius: wp(0.6),
    },
    badgeText: {
      fontSize: fs(2.5),
      fontWeight: '700',
    },
    avatarText: {
      color: '#ffffff',
      fontWeight: 'bold',
    },
    modalBackgroundOverlay: {
      flex: 1,
      backgroundColor: colors.overlayBg,
      justifyContent: 'center',
      alignItems: 'center',
      padding: wp(5),
    },
    modalSheetBody: {
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: wp(5),
      width: '100%',
      maxWidth: wp(90),
      padding: wp(5),
    },
    modalHeadRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderColor: colors.border,
      paddingBottom: hp(2),
      position: 'relative',
    },
    modalHeaderTitleBox: {
      flex: 1,
      marginLeft: wp(3.5),
      gap: hp(0.25),
    },
    modalProfileName: {
      color: colors.text,
      fontSize: fs(4.5),
      fontWeight: '900',
    },
    modalProfileCompany: {
      color: colors.textSecondary,
      fontSize: fs(3.2),
    },
    modalBadgeShift: {
      alignSelf: 'flex-start',
      marginTop: hp(0.5),
    },
    modalCloseCircle: {
      position: 'absolute',
      top: -hp(0.5),
      right: -wp(1),
      width: wp(7),
      height: wp(7),
      borderRadius: wp(3.5),
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalCloseCircleText: {
      color: colors.textSecondary,
      fontSize: fs(4),
      fontWeight: 'bold',
      lineHeight: fs(4.5),
    },
    modalFieldsList: {
      marginVertical: hp(2),
      gap: hp(1),
    },
    detailInfoBlock: {
      flexDirection: 'row',
      backgroundColor: colors.borderLight,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: wp(3),
      padding: wp(2.5),
      alignItems: 'center',
      gap: wp(3),
    },
    infoBlockIconFrame: {
      width: wp(8),
      height: wp(8),
      borderRadius: wp(2),
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    infoBlockTextFrame: {
      flex: 1,
    },
    infoBlockMetaLabel: {
      color: colors.textDark,
      fontSize: fs(2.2),
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    infoBlockValue: {
      color: colors.text,
      fontSize: fs(3.2),
      marginTop: hp(0.25),
    },
    actionLinkText: {
      color: '#38bdf8',
      textDecorationLine: 'underline',
    },
    modalActionButtonDismiss: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: wp(3),
      paddingVertical: hp(1.5),
      alignItems: 'center',
    },
    modalActionButtonDismissText: {
      color: colors.textSecondary,
      fontSize: fs(3.2),
      fontWeight: '600',
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

function Avatar({ name, size = 'md', styles }: { name: string; size?: 'sm' | 'md' | 'lg'; styles: any }) {
  const gradientColors = getAvatarGradient(name);
  const dim = size === 'sm' ? wp(8) : size === 'md' ? wp(10) : wp(16);
  const fontSize = size === 'sm' ? fs(2.8) : size === 'md' ? fs(3.2) : fs(5);
  const gradId = `avatarGrad-${name.replace(/\s+/g, '')}`;

  return (
    <View style={s({ width: dim, height: dim, borderRadius: dim / 2, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' })}>
      <Svg style={StyleSheet.absoluteFill}>
        <Defs>
          <SvgLinearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={gradientColors[0]} />
            <Stop offset="100%" stopColor={gradientColors[1]} />
          </SvgLinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${gradId})`} />
      </Svg>
      <Text style={s([styles.avatarText, { fontSize }])}>{getInitials(name)}</Text>
    </View>
  );
}

export default function CRMContacts() {
  const { uiTheme } = useTheme();
  const isDark = isDarkTheme(uiTheme?.theme);
  const colors = useMemo(() => buildColors(uiTheme, isDark), [uiTheme, isDark]);
  const styles = useMemo(() => createStyles(colors), [colors]);

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
    STATUS_OPTIONS.slice(1).forEach((sItem) => {
      counts[sItem] = contacts.filter((c) => c.status === sItem).length;
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
    <SafeAreaView style={s(styles.rootContainer)}>
      <View style={s(styles.topAccentBar)} />

      <View style={s(styles.headerRow)}>
        <View style={s(styles.headerTitleGroup)}>
          <View style={s(styles.headerIconContainer)}>
            <Text style={s(styles.headerIconText)}>👥</Text>
          </View>
          <View>
            <Text style={s(styles.headerMainTitle)}>Contacts</Text>
            <Text style={s(styles.headerSubtitle)}>View and manage CRM profiles</Text>
          </View>
        </View>
        <View style={s(styles.readOnlyBadge)}>
          <Text style={s(styles.readOnlyText)}>Read-Only</Text>
        </View>
      </View>

      {error && (
        <View style={s(styles.errorBanner)}>
          <Text style={s(styles.errorText)}>⚠ {error}</Text>
          <TouchableOpacity onPress={() => setError(null)}>
            <Text style={s(styles.errorCloseText)}>×</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={s(styles.filterWidgetSection)}>
        <View style={s(styles.searchBarWrapper)}>
          <Text style={s(styles.searchIconLeft)}>🔍</Text>
          <TextInput
            style={s(styles.searchInputField)}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by name, email, company..."
            placeholderTextColor={colors.textMuted}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={s(styles.clearSearchButton)}>
              <Text style={s(styles.clearSearchText)}>×</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s(styles.pillsScrollTrack)}>
          {STATUS_OPTIONS.map((sItem) => {
            const cfg = sItem !== 'All' ? colors.status[sItem as keyof typeof colors.status] : null;
            const isActive = statusFilter === sItem;
            return (
              <TouchableOpacity
                key={sItem}
                onPress={() => setStatusFilter(sItem)}
                style={s([
                  styles.filterPillElement,
                  isActive 
                    ? { backgroundColor: cfg ? cfg.bg : colors.borderLight, borderColor: cfg ? cfg.border : colors.border }
                    : styles.filterPillInactive
                ])}
              >
                {cfg && <View style={s([styles.badgeDot, { backgroundColor: cfg.dot }])} />}
                <Text style={s([styles.pillTextLabel, isActive ? { color: cfg ? cfg.text : colors.text } : { color: colors.textDark }])}>
                  {sItem}
                </Text>
                <View style={s([styles.pillCounterFrame, isActive ? { backgroundColor: colors.borderLight } : { backgroundColor: colors.border }])}>
                  <Text style={s([styles.pillCounterText, { color: isActive ? colors.text : colors.textSecondary }])}>{statusCounts[sItem] ?? 0}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={s(styles.loaderCenterState)}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={s(styles.loaderMetaText)}>Syncing contact index...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s(styles.recordsListLayout)} showsVerticalScrollIndicator={false}>
          {filteredContacts.length === 0 ? (
            <View style={s(styles.emptyResultsState)}>
              <Text style={s(styles.emptyIconGraphic)}>🔍</Text>
              <Text style={s(styles.emptyStateTitle)}>No matches found</Text>
              <Text style={s(styles.emptyStateSubtitle)}>Try tweaking your search terms or active filters</Text>
            </View>
          ) : (
            filteredContacts.map((contact) => (
              <TouchableOpacity
                key={contact.id || contact._id}
                style={s(styles.contactRowItem)}
                onPress={() => setViewingContact(contact)}
                activeOpacity={0.7}
              >
                <Avatar name={contact.name} size="md" styles={styles} />
                
                <View style={s(styles.contactRowMetaDetails)}>
                  <View style={s(styles.contactCardTopRow)}>
                    <Text style={s(styles.contactMainNameText)} numberOfLines={1}>{contact.name}</Text>
                    <StatusBadge status={contact.status} colors={colors} styles={styles} />
                  </View>
                  
                  {contact.company ? (
                    <Text style={s(styles.contactCompanySubtitleText)} numberOfLines={1}>🏢 {contact.company}</Text>
                  ) : null}
                  
                  <Text style={s(styles.contactSublineTruncateText)} numberOfLines={1}>✉ {contact.email || '—'}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      <Modal
        visible={viewingContact !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setViewingContact(null)}
      >
        <View style={s(styles.modalBackgroundOverlay)}>
          <View style={s(styles.modalSheetBody)}>
            {viewingContact && (
              <>
                <View style={s(styles.modalHeadRow)}>
                  <Avatar name={viewingContact.name} size="lg" styles={styles} />
                  <View style={s(styles.modalHeaderTitleBox)}>
                    <Text style={s(styles.modalProfileName)} numberOfLines={1}>{viewingContact.name}</Text>
                    {viewingContact.company && (
                      <Text style={s(styles.modalProfileCompany)} numberOfLines={1}>🏢 {viewingContact.company}</Text>
                    )}
                    <View style={s(styles.modalBadgeShift)}>
                      <StatusBadge status={viewingContact.status} colors={colors} styles={styles} />
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => setViewingContact(null)} style={s(styles.modalCloseCircle)}>
                    <Text style={s(styles.modalCloseCircleText)}>×</Text>
                  </TouchableOpacity>
                </View>

                <View style={s(styles.modalFieldsList)}>
                  <TouchableOpacity 
                    style={s(styles.detailInfoBlock)} 
                    onPress={() => handleEmailPress(viewingContact.email)}
                    disabled={!viewingContact.email}
                  >
                    <View style={s(styles.infoBlockIconFrame)}><Text>✉️</Text></View>
                    <View style={s(styles.infoBlockTextFrame)}>
                      <Text style={s(styles.infoBlockMetaLabel)}>EMAIL ADDRESS</Text>
                      <Text style={s([styles.infoBlockValue, viewingContact.email && styles.actionLinkText])} numberOfLines={1}>
                        {viewingContact.email || '—'}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={s(styles.detailInfoBlock)} 
                    onPress={() => handlePhonePress(viewingContact.phone)}
                    disabled={!viewingContact.phone}
                  >
                    <View style={s(styles.infoBlockIconFrame)}><Text>📞</Text></View>
                    <View style={s(styles.infoBlockTextFrame)}>
                      <Text style={s(styles.infoBlockMetaLabel)}>PHONE NUMBER</Text>
                      <Text style={s([styles.infoBlockValue, viewingContact.phone && styles.actionLinkText])} numberOfLines={1}>
                        {viewingContact.phone || '—'}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <View style={s(styles.detailInfoBlock)}>
                    <View style={s(styles.infoBlockIconFrame)}><Text>🏢</Text></View>
                    <View style={s(styles.infoBlockTextFrame)}>
                      <Text style={s(styles.infoBlockMetaLabel)}>COMPANY</Text>
                      <Text style={s(styles.infoBlockValue)} numberOfLines={1}>{viewingContact.company || '—'}</Text>
                    </View>
                  </View>
                </View>

                <TouchableOpacity onPress={() => setViewingContact(null)} style={s(styles.modalActionButtonDismiss)}>
                  <Text style={s(styles.modalActionButtonDismissText)}>Close Profile</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}