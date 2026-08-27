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
  SafeAreaView,
  Dimensions,
  Platform,
} from 'react-native';
import { apiFetch } from '@/lib/admin/apiClient';
import { useTheme } from '@/contexts/ThemeContext';
import { s, wp, hp, fs } from '@/util/styles';
import { isDarkTheme } from "@/constants/design/presets";

const STAGES = ['Qualification', 'Needs Analysis', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];

interface Deal {
  id?: string;
  _id: string;
  name: string;
  company?: string;
  stage: string;
  value: number;
  probability?: number;
  closeDate: string;
  owner?: string;
}

const getProbColor = (p: number) => {
  if (p >= 75) return '#10b981';
  if (p >= 50) return '#3b82f6';
  if (p >= 25) return '#f59e0b';
  return '#ef4444';
};

const formatCurrency = (val: number) => {
  if (!val) return '$0';
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
  return `$${val.toLocaleString('en-US')}`;
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

function buildColors(uiTheme: any, isDark: boolean) {
  return {
    background:    uiTheme.panelColors?.dashboardBackground     || (isDark ? '#090a0f' : '#f8fafc'),
    cardBg:        uiTheme.panelColors?.dashboardCardBackground || (isDark ? '#0f1117' : '#ffffff'),
    cardBgSub:     isDark ? '#0f1117' : '#ffffff',
    text:          uiTheme.panelColors?.dashboardTextColor      || (isDark ? '#ffffff' : '#0f172a'),
    textSecondary: isDark ? '#a3a3a3' : '#475569',
    textMuted:     isDark ? '#525252' : '#94a3b8',
    textDark:      isDark ? '#404040' : '#64748b',
    border:        isDark ? '#171717' : '#e2e8f0',
    borderLight:   isDark ? '#262626' : '#f1f5f9',
    inputBg:       isDark ? 'rgba(0, 0, 0, 0.2)' : '#f1f5f9',
    primary:       uiTheme.customColors?.primary || '#38bdf8',
    accentBg:      isDark ? 'rgba(56, 189, 248, 0.1)' : 'rgba(56, 189, 248, 0.15)',
    accentBorder:  isDark ? 'rgba(56, 189, 248, 0.25)' : 'rgba(56, 189, 248, 0.3)',
    overlayBg:     'rgba(0, 0, 0, 0.75)',
    stageColors: {
      'Qualification':  { bg: isDark ? 'rgba(148, 163, 184, 0.1)' : '#f1f5f9', text: isDark ? '#94a3b8' : '#475569', border: isDark ? 'rgba(148, 163, 184, 0.25)' : '#cbd5e1', dot: '#94a3b8' },
      'Needs Analysis': { bg: isDark ? 'rgba(56, 189, 248, 0.1)' : '#e0f2fe', text: isDark ? '#38bdf8' : '#0369a1', border: isDark ? 'rgba(56, 189, 248, 0.25)' : '#7dd3fc', dot: '#38bdf8' },
      'Proposal':       { bg: isDark ? 'rgba(129, 140, 248, 0.1)' : '#e0e7ff', text: isDark ? '#818cf8' : '#4338ca', border: isDark ? 'rgba(129, 140, 248, 0.25)' : '#a5b4fc', dot: '#818cf8' },
      'Negotiation':    { bg: isDark ? 'rgba(251, 191, 36, 0.1)' : '#fef3c7', text: isDark ? '#fbbf24' : '#b45309', border: isDark ? 'rgba(251, 191, 36, 0.25)' : '#fde68a', dot: '#fbbf24' },
      'Closed Won':     { bg: isDark ? 'rgba(52, 211, 153, 0.1)' : '#d1fae5', text: isDark ? '#34d399' : '#065f46', border: isDark ? 'rgba(52, 211, 153, 0.25)' : '#6ee7b7', dot: '#34d399' },
      'Closed Lost':    { bg: isDark ? 'rgba(248, 113, 113, 0.1)' : '#fee2e2', text: isDark ? '#f87171' : '#991b1b', border: isDark ? 'rgba(248, 113, 113, 0.25)' : '#fca5a5', dot: '#f87171' },
      'Unknown':        { bg: isDark ? 'rgba(115, 115, 115, 0.1)' : '#f4f4f5', text: isDark ? '#a3a3a3' : '#71717a', border: isDark ? 'rgba(115, 115, 115, 0.25)' : '#e4e4e7', dot: '#a3a3a3' },
    }
  };
}

function createStyles(colors: ReturnType<typeof buildColors>) {
  return StyleSheet.create({
    appSafeAreaViewBackground: {
      flex: 1,
      backgroundColor: colors.background,
    },
    topAccentBarDecoration: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: hp(0.4),
      backgroundColor: colors.primary,
      zIndex: 999,
    },
    headerLayoutViewContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: wp(4),
      paddingTop: Platform.OS === 'android' ? hp(5.5) : hp(2.5),
      paddingBottom: hp(2),
      borderBottomWidth: 1,
      borderColor: colors.border,
    },
    headerLeftAlignmentGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: wp(3),
    },
    headerIconProfilePlaceholderSquare: {
      width: wp(10.5),
      height: wp(10.5),
      borderRadius: wp(3),
      backgroundColor: colors.accentBg,
      borderWidth: 1,
      borderColor: colors.accentBorder,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerEmojiSymbolIcon: {
      fontSize: fs(5),
    },
    headerScreenHeadlineText: {
      fontSize: fs(5.5),
      fontWeight: '900',
      color: colors.text,
      letterSpacing: -0.5,
    },
    headerScreenSubheadlineText: {
      fontSize: fs(2.8),
      color: colors.textSecondary,
      marginTop: hp(0.1),
    },
    readOnlyFloatingStatusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(251, 191, 36, 0.05)',
      borderWidth: 1,
      borderColor: 'rgba(251, 191, 36, 0.25)',
      paddingHorizontal: wp(2.5),
      paddingVertical: hp(0.6),
      borderRadius: wp(10),
      gap: wp(1.5),
    },
    readOnlyIndicatorAmberDot: {
      width: wp(1.5),
      height: wp(1.5),
      borderRadius: wp(0.75),
      backgroundColor: '#fbbf24',
    },
    readOnlyTextStringLabel: {
      color: '#fbbf24',
      fontSize: fs(2.8),
      fontWeight: '700',
    },
    filterWorkspaceBoxWrapper: {
      backgroundColor: colors.cardBgSub,
      borderBottomWidth: 1,
      borderColor: colors.border,
      padding: wp(4),
      gap: hp(1.8),
    },
    searchBarBoxFrame: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.borderLight,
      borderRadius: wp(3),
      paddingHorizontal: wp(3),
      height: hp(5.5),
    },
    searchGlassGlyphSymbol: {
      fontSize: fs(3.5),
      marginRight: wp(2),
    },
    searchBarInputTextNode: {
      flex: 1,
      color: colors.text,
      fontSize: fs(3.5),
    },
    searchFieldClearTriggerHitbox: {
      padding: wp(1.5),
    },
    searchFieldClearTriggerSymbolText: {
      color: colors.textSecondary,
      fontSize: fs(5),
      fontWeight: 'bold',
      lineHeight: fs(5),
    },
    horizontalScrollOuterAxisWrapperRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    scrollSectionTrackContextInlineLabel: {
      fontSize: fs(3),
      color: colors.textSecondary,
      fontWeight: '600',
      marginRight: wp(2.5),
    },
    filterTrackInnerScrollerContainer: {
      gap: wp(2),
      alignItems: 'center',
    },
    filterChipButtonActionFrame: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      paddingHorizontal: wp(2.5),
      paddingVertical: hp(0.75),
      borderRadius: wp(2),
      gap: wp(1.5),
    },
    chipIndicatorDotNode: {
      width: wp(1.5),
      height: wp(1.5),
      borderRadius: wp(0.75),
    },
    filterChipButtonLabelText: {
      fontSize: fs(3),
    },
    counterPillWrapperDecoration: {
      paddingHorizontal: wp(1.5),
      paddingVertical: hp(0.25),
      borderRadius: wp(1.5),
    },
    counterPillWrapperDecorationValueText: {
      fontSize: fs(2.5),
      fontWeight: '800',
      color: colors.text,
    },
    alertFeedbackCardContainerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(248, 113, 113, 0.1)',
      borderWidth: 1,
      borderColor: 'rgba(248, 113, 113, 0.25)',
      margin: wp(4),
      marginBottom: 0,
      paddingHorizontal: wp(3.5),
      paddingVertical: hp(1.2),
      borderRadius: wp(3),
      gap: wp(2.5),
    },
    alertFeedbackWarningIconGlyph: {
      color: '#f87171',
      fontSize: fs(4),
      fontWeight: 'bold',
    },
    alertFeedbackPayloadDescriptionText: {
      flex: 1,
      color: '#fca5a5',
      fontSize: fs(3.2),
      fontWeight: '500',
    },
    alertFeedbackDismissActionHitbox: {
      padding: wp(1),
    },
    alertFeedbackDismissActionSymbol: {
      color: '#f87171',
      fontSize: fs(5),
      lineHeight: fs(5),
    },
    stateBlockCentralizedFeedbackContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: hp(10),
      paddingHorizontal: wp(8),
      gap: hp(1.5),
    },
    stateBlockContextDescriptionStringText: {
      color: colors.textSecondary,
      fontSize: fs(3.5),
      fontWeight: '500',
    },
    emptyResultsGraphicBoxIconCard: {
      width: wp(14),
      height: wp(14),
      borderRadius: wp(4),
      backgroundColor: colors.border,
      borderWidth: 1,
      borderColor: colors.borderLight,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyResultsGraphicBoxIconCardGlyphSymbol: {
      fontSize: fs(6),
    },
    emptyResultsHeadlinePromptMessageText: {
      fontSize: fs(4),
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
    },
    emptyResultsSubheadingExplanationPromptText: {
      fontSize: fs(3),
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: fs(4),
    },
    verticalCardsLayoutListScrollTrack: {
      padding: wp(4),
      gap: hp(1.8),
    },
    dealListItemCardContainerBox: {
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: wp(4),
      padding: wp(4),
      gap: hp(2),
    },
    cardLayoutIdentitySplitHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: wp(3),
    },
    cardIdentityLeftInfoStack: {
      flex: 1,
      gap: hp(0.5),
    },
    cardDealProfileTitleHeadingText: {
      fontSize: fs(4),
      fontWeight: '800',
      color: colors.text,
    },
    cardCompanyAffiliationMetadataRowInlineLayout: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: wp(1.5),
    },
    companyCharacterSymbolAvatarSquareIcon: {
      width: wp(4.5),
      height: wp(4.5),
      borderRadius: wp(1),
      backgroundColor: colors.border,
      borderWidth: 1,
      borderColor: colors.borderLight,
      justifyContent: 'center',
      alignItems: 'center',
    },
    companyCharacterSymbolAvatarSquareIconLetterChar: {
      fontSize: fs(2.2),
      fontWeight: '800',
      color: colors.textSecondary,
    },
    cardAssociatedCompanyNameLabelString: {
      fontSize: fs(3.2),
      color: colors.textSecondary,
      fontWeight: '500',
    },
    cardPropertiesSystemQuadGridDisplayGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      rowGap: hp(1.5),
      backgroundColor: colors.inputBg,
      borderRadius: wp(3),
      padding: wp(3),
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardPropertyQuadGridCellFieldBox: {
      width: '50%',
      paddingRight: wp(1.5),
      gap: hp(0.5),
    },
    quadGridCellFieldBoxLabelUppercaseText: {
      fontSize: fs(2.2),
      fontWeight: '800',
      color: colors.textDark,
      letterSpacing: 0.8,
    },
    quadGridCellFieldBoxDataValueTextEmeraldCurrencyString: {
      fontSize: fs(3.5),
      fontWeight: '900',
      color: '#34d399',
    },
    quadGridCellFieldBoxDataNormalWhiteString: {
      fontSize: fs(3.2),
      fontWeight: '600',
      color: colors.textMuted,
    },
    quadGridCellFieldBoxDataFallbackMutedString: {
      fontSize: fs(3.2),
      color: colors.textDark,
      fontWeight: '600',
    },
    cardAccountOwnerAffiliationRowInlineGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: wp(1.5),
    },
    accountOwnerAvatarCircleProfileIcon: {
      width: wp(4.5),
      height: wp(4.5),
      borderRadius: wp(2.25),
      backgroundColor: '#1e3a8a',
      justifyContent: 'center',
      alignItems: 'center',
    },
    accountOwnerAvatarCircleProfileIconLetterChar: {
      fontSize: fs(2.2),
      fontWeight: '800',
      color: '#ffffff',
    },
    cardActionFooterSimulatedRowFrame: {
      alignItems: 'flex-end',
      paddingTop: hp(0.5),
    },
    cardActionFooterSimulatedRowFrameInteractiveActionTextString: {
      fontSize: fs(3),
      color: colors.primary,
      fontWeight: '700',
    },
    aggregatedListSummaryCalculationMetaCardContainerBoxRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: hp(1),
      paddingHorizontal: wp(1),
      marginBottom: hp(3),
    },
    aggregatedListSummaryCalculationMetaCardLabelStringText: {
      fontSize: fs(3),
      color: colors.textMuted,
      fontWeight: '600',
    },
    whiteHighlightTextAccent: {
      color: colors.textSecondary,
      fontWeight: '700',
    },
    badgeFrame: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      paddingHorizontal: wp(2),
      paddingVertical: hp(0.5),
      borderRadius: wp(1.5),
      gap: wp(1),
    },
    badgeDot: {
      width: wp(1.5),
      height: wp(1.5),
      borderRadius: wp(0.75),
    },
    badgeText: {
      fontSize: fs(2.8),
      fontWeight: '700',
    },
    probBarRowWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: wp(1.5),
      marginTop: hp(0.25),
    },
    probTrackBackground: {
      width: wp(16),
      height: hp(0.75),
      borderRadius: wp(10),
      backgroundColor: colors.border,
      overflow: 'hidden',
    },
    probFillTrack: {
      height: '100%',
      borderRadius: wp(10),
    },
    probPercentageLabelText: {
      fontSize: fs(2.8),
      fontWeight: '800',
      color: colors.textSecondary,
    },
    modalOverlayDimBackdropContainerMask: {
      flex: 1,
      backgroundColor: colors.overlayBg,
      justifyContent: 'flex-end',
    },
    modalProfileBottomSheetCardBodyStructure: {
      backgroundColor: colors.background,
      borderTopLeftRadius: wp(6),
      borderTopRightRadius: wp(6),
      borderWidth: 1,
      borderColor: colors.borderLight,
      height: hp(75),
    },
    bottomSheetTopStructuralDragHandleBarStrip: {
      width: wp(9),
      height: hp(0.5),
      backgroundColor: colors.borderLight,
      borderRadius: wp(0.5),
      alignSelf: 'center',
      marginTop: hp(1.5),
    },
    sheetLayoutIdentityHeaderContainerSectionBlock: {
      padding: wp(5),
      borderBottomWidth: 1,
      borderColor: colors.border,
    },
    sheetLayoutIdentityHeaderFlexAlignmentRowWrapper: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      position: 'relative',
    },
    sheetLayoutIdentityHeaderPropertiesStackGroup: {
      flex: 1,
      marginLeft: wp(3.5),
      marginRight: wp(9),
      gap: hp(0.5),
    },
    sheetLayoutIdentityHeaderDealNameHeadingText: {
      fontSize: fs(4.5),
      fontWeight: '900',
      color: colors.text,
      lineHeight: fs(5.5),
    },
    sheetLayoutIdentityHeaderContextLabelSubtextString: {
      fontSize: fs(3),
      color: colors.textSecondary,
      fontWeight: '500',
    },
    sheetLayoutIdentityHeaderBadgePositionerAlignWrapper: {
      alignSelf: 'flex-start',
      marginTop: hp(0.75),
    },
    sheetLayoutIdentityHeaderCloseActionCircularButtonFrame: {
      position: 'absolute',
      top: 0,
      right: 0,
      width: wp(7),
      height: wp(7),
      borderRadius: wp(2),
      backgroundColor: colors.border,
      borderWidth: 1,
      borderColor: colors.borderLight,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sheetLayoutIdentityHeaderCloseActionCircularButtonFrameSymbolText: {
      fontSize: fs(4.5),
      color: colors.textSecondary,
      fontWeight: 'bold',
      lineHeight: fs(4.5),
    },
    sheetFieldsScrollTrackContainer: {
      flex: 1,
      padding: wp(5),
    },
    sheetFieldsVerticalStackSpacingLayout: {
      gap: hp(2),
      paddingBottom: hp(3),
    },
    sheetFinancialValueStatementHighlightBannerBox: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: wp(3.5),
      padding: wp(4),
    },
    sheetFinancialValueStatementHighlightBannerBoxActive: {
      backgroundColor: 'rgba(52, 211, 153, 0.03)',
      borderColor: 'rgba(52, 211, 153, 0.15)',
    },
    sheetFinancialValueStatementLeftIndicatorInlineLabelGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: wp(2),
    },
    sheetFinancialValueStatementBannerEmojiSymbolIcon: {
      fontSize: fs(4.5),
    },
    sheetFinancialValueStatementBannerLabelUppercaseText: {
      fontSize: fs(2.5),
      fontWeight: '800',
      color: colors.textSecondary,
      letterSpacing: 0.8,
    },
    sheetFinancialValueStatementBannerLargeEmeraldCurrencyStringText: {
      fontSize: fs(5),
      fontWeight: '900',
      color: '#34d399',
    },
    sheetFieldsStructuralTwoColumnFlexWrapGridSystem: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      rowGap: hp(1.8),
    },
    sheetFieldsTwoColumnFlexCellBlock: {
      width: '50%',
      paddingRight: wp(2),
      gap: hp(0.75),
    },
    sheetFieldsCellIconAndContextLabelRowGroupInlineHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: wp(1.5),
    },
    sheetFieldsCellIconGlyphInlineSymbol: {
      fontSize: fs(3.2),
    },
    sheetFieldsCellContentPrimaryWhiteDataStringText: {
      fontSize: fs(3.5),
      fontWeight: '700',
      color: colors.text,
    },
    sheetLayoutFooterActionControlPanelRowFrameBox: {
      padding: wp(5),
      backgroundColor: colors.background,
      borderTopWidth: 1,
      borderColor: colors.border,
      paddingBottom: Platform.OS === 'ios' ? hp(4.5) : hp(2.5),
    },
    sheetLayoutFooterActionControlPanelDismissButtonTriggerFrame: {
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: wp(3),
      paddingVertical: hp(1.8),
      alignItems: 'center',
      justifyContent: 'center',
    },
    sheetLayoutFooterActionControlPanelDismissButtonTriggerFrameTextLabel: {
      color: colors.textSecondary,
      fontSize: fs(3.5),
      fontWeight: '700',
    },
  });
}

function StageBadge({ stage, colors, styles }: { stage: string; colors: any; styles: any }) {
  const cfg = colors.stageColors[stage as keyof typeof colors.stageColors] ?? colors.stageColors['Unknown'];
  return (
    <View style={s([styles.badgeFrame, { backgroundColor: cfg.bg, borderColor: cfg.border }])}>
      <View style={s([styles.badgeDot, { backgroundColor: cfg.dot }])} />
      <Text style={s([styles.badgeText, { color: cfg.text }])}>{stage || 'Unknown'}</Text>
    </View>
  );
}

function ProbBar({ value, styles }: { value: number; styles: any }) {
  const color = getProbColor(value);
  return (
    <View style={s(styles.probBarRowWrapper)}>
      <View style={s(styles.probTrackBackground)}>
        <View style={s([styles.probFillTrack, { width: `${value}%`, backgroundColor: color }])} />
      </View>
      <Text style={s(styles.probPercentageLabelText)}>{value}%</Text>
    </View>
  );
}

export default function CRMDealsReadOnly() {
  const { uiTheme } = useTheme();
  const isDark = isDarkTheme(uiTheme?.theme);
  const colors = useMemo(() => buildColors(uiTheme, isDark), [uiTheme, isDark]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [deals, setDeals] = useState<Deal[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('All');
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDeals = () => {
    setLoading(true);
    setError(null);
    apiFetch('/api/crm-deals')
      .then((data: any) => setDeals(data.items || []))
      .catch((err: any) => setError(err?.message || 'Unable to load pipeline deals'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDeals();
  }, []);

  const filteredDeals = useMemo(() => {
    return deals.filter((deal) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        deal.name?.toLowerCase().includes(q) ||
        deal.company?.toLowerCase().includes(q) ||
        deal.owner?.toLowerCase().includes(q);
      return matchesSearch && (stageFilter === 'All' || deal.stage === stageFilter);
    });
  }, [deals, searchQuery, stageFilter]);

  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = { All: deals.length };
    STAGES.forEach((sItem) => {
      counts[sItem] = deals.filter((d) => d.stage === sItem).length;
    });
    return counts;
  }, [deals]);

  const totalFilteredValue = useMemo(() => {
    return filteredDeals.reduce((sum, d) => sum + (d.value || 0), 0);
  }, [filteredDeals]);

  return (
    <SafeAreaView style={s(styles.appSafeAreaViewBackground)}>
      <View style={s(styles.topAccentBarDecoration)} />

      <View style={s(styles.headerLayoutViewContainer)}>
        <View style={s(styles.headerLeftAlignmentGroup)}>
          <View style={s(styles.headerIconProfilePlaceholderSquare)}>
            <Text style={s(styles.headerEmojiSymbolIcon)}>💼</Text>
          </View>
          <View>
            <Text style={s(styles.headerScreenHeadlineText)}>Deals</Text>
            <Text style={s(styles.headerScreenSubheadlineText)}>Review pipeline deals · Manager view</Text>
          </View>
        </View>
        <View style={s(styles.readOnlyFloatingStatusBadge)}>
          <View style={s(styles.readOnlyIndicatorAmberDot)} />
          <Text style={s(styles.readOnlyTextStringLabel)}>Read-only</Text>
        </View>
      </View>

      <View style={s(styles.filterWorkspaceBoxWrapper)}>
        <View style={s(styles.searchBarBoxFrame)}>
          <Text style={s(styles.searchGlassGlyphSymbol)}>🔍</Text>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search deals, companies, owners…"
            placeholderTextColor={colors.textSecondary}
            style={s(styles.searchBarInputTextNode)}
            autoCapitalize="none"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={s(styles.searchFieldClearTriggerHitbox)}>
              <Text style={s(styles.searchFieldClearTriggerSymbolText)}>×</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={s(styles.horizontalScrollOuterAxisWrapperRow)}>
          <Text style={s(styles.scrollSectionTrackContextInlineLabel)}>Stage:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s(styles.filterTrackInnerScrollerContainer)}>
            {['All', ...STAGES].map((sItem) => {
              const cfg = sItem !== 'All' ? colors.stageColors[sItem as keyof typeof colors.stageColors] : null;
              const isActive = stageFilter === sItem;

              let customChipBg = 'transparent';
              let customChipBorderColor = colors.border;
              let customChipTextColor = colors.textSecondary;

              if (isActive) {
                if (cfg) {
                  customChipBg = cfg.bg;
                  customChipBorderColor = cfg.border;
                  customChipTextColor = cfg.text;
                } else {
                  customChipBg = colors.borderLight;
                  customChipBorderColor = colors.border;
                  customChipTextColor = colors.text;
                }
              }

              return (
                <TouchableOpacity
                  key={sItem}
                  activeOpacity={0.7}
                  onPress={() => setStageFilter(sItem)}
                  style={s([
                    styles.filterChipButtonActionFrame,
                    { backgroundColor: customChipBg, borderColor: customChipBorderColor },
                  ])}
                >
                  {cfg && <View style={s([styles.chipIndicatorDotNode, { backgroundColor: cfg.dot }])} />}
                  <Text style={s([styles.filterChipButtonLabelText, { color: customChipTextColor, fontWeight: isActive ? '700' : '600' }])}>
                    {sItem}
                  </Text>
                  <View style={s([styles.counterPillWrapperDecoration, { backgroundColor: isActive ? colors.borderLight : colors.border }])}>
                    <Text style={s([styles.counterPillWrapperDecorationValueText, { color: isActive ? colors.text : colors.textSecondary }])}>{stageCounts[sItem] ?? 0}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>

      {error && (
        <View style={s(styles.alertFeedbackCardContainerRow)}>
          <Text style={s(styles.alertFeedbackWarningIconGlyph)}>⚠</Text>
          <Text style={s(styles.alertFeedbackPayloadDescriptionText)} numberOfLines={2}>{error}</Text>
          <TouchableOpacity onPress={() => setError(null)} style={s(styles.alertFeedbackDismissActionHitbox)}>
            <Text style={s(styles.alertFeedbackDismissActionSymbol)}>×</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading && (
        <View style={s(styles.stateBlockCentralizedFeedbackContainer)}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={s(styles.stateBlockContextDescriptionStringText)}>Loading pipeline deals…</Text>
        </View>
      )}

      {!loading && filteredDeals.length === 0 && (
        <View style={s(styles.stateBlockCentralizedFeedbackContainer)}>
          <View style={s(styles.emptyResultsGraphicBoxIconCard)}>
            <Text style={s(styles.emptyResultsGraphicBoxIconCardGlyphSymbol)}>🔍</Text>
          </View>
          <Text style={s(styles.emptyResultsHeadlinePromptMessageText)}>No deals found</Text>
          <Text style={s(styles.emptyResultsSubheadingExplanationPromptText)}>Try adjusting your search query parameters or stage selections.</Text>
        </View>
      )}

      {!loading && filteredDeals.length > 0 && (
        <ScrollView contentContainerStyle={s(styles.verticalCardsLayoutListScrollTrack)} showsVerticalScrollIndicator={false}>
          {filteredDeals.map((deal) => (
            <TouchableOpacity
              key={deal.id || deal._id}
              activeOpacity={0.85}
              onPress={() => setSelectedDeal(deal)}
              style={s(styles.dealListItemCardContainerBox)}
            >
              <View style={s(styles.cardLayoutIdentitySplitHeaderRow)}>
                <View style={s(styles.cardIdentityLeftInfoStack)}>
                  <Text style={s(styles.cardDealProfileTitleHeadingText)} numberOfLines={1}>
                    {deal.name}
                  </Text>
                  <View style={s(styles.cardCompanyAffiliationMetadataRowInlineLayout)}>
                    {deal.company ? (
                      <View style={s(styles.companyCharacterSymbolAvatarSquareIcon)}>
                        <Text style={s(styles.companyCharacterSymbolAvatarSquareIconLetterChar)}>
                          {deal.company.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    ) : null}
                    <Text style={s(styles.cardAssociatedCompanyNameLabelString)} numberOfLines={1}>
                      {deal.company || '—'}
                    </Text>
                  </View>
                </View>
                <StageBadge stage={deal.stage} colors={colors} styles={styles} />
              </View>

              <View style={s(styles.cardPropertiesSystemQuadGridDisplayGrid)}>
                
                <View style={s(styles.cardPropertyQuadGridCellFieldBox)}>
                  <Text style={s(styles.quadGridCellFieldBoxLabelUppercaseText)}>VALUE</Text>
                  <Text style={s(styles.quadGridCellFieldBoxDataValueTextEmeraldCurrencyString)}>
                    {formatCurrency(deal.value)}
                  </Text>
                </View>

                <View style={s(styles.cardPropertyQuadGridCellFieldBox)}>
                  <Text style={s(styles.quadGridCellFieldBoxLabelUppercaseText)}>PROBABILITY</Text>
                  {deal.probability != null ? (
                    <ProbBar value={deal.probability} styles={styles} />
                  ) : (
                    <Text style={s(styles.quadGridCellFieldBoxDataFallbackMutedString)}>—</Text>
                  )}
                </View>

                <View style={s(styles.cardPropertyQuadGridCellFieldBox)}>
                  <Text style={s(styles.quadGridCellFieldBoxLabelUppercaseText)}>CLOSE DATE</Text>
                  <Text style={s(styles.quadGridCellFieldBoxDataNormalWhiteString)}>
                    {formatDate(deal.closeDate)}
                  </Text>
                </View>

                <View style={s(styles.cardPropertyQuadGridCellFieldBox)}>
                  <Text style={s(styles.quadGridCellFieldBoxLabelUppercaseText)}>OWNER</Text>
                  <View style={s(styles.cardAccountOwnerAffiliationRowInlineGroup)}>
                    {deal.owner ? (
                      <View style={s(styles.accountOwnerAvatarCircleProfileIcon)}>
                        <Text style={s(styles.accountOwnerAvatarCircleProfileIconLetterChar)}>
                          {deal.owner.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    ) : null}
                    <Text style={s(styles.quadGridCellFieldBoxDataNormalWhiteString)} numberOfLines={1}>
                      {deal.owner || '—'}
                    </Text>
                  </View>
                </View>

              </View>

              <View style={s(styles.cardActionFooterSimulatedRowFrame)}>
                <Text style={s(styles.cardActionFooterSimulatedRowFrameInteractiveActionTextString)}>View Details →</Text>
              </View>
            </TouchableOpacity>
          ))}

          <View style={s(styles.aggregatedListSummaryCalculationMetaCardContainerBoxRow)}>
            <Text style={s(styles.aggregatedListSummaryCalculationMetaCardLabelStringText)}>
              Showing <Text style={s(styles.whiteHighlightTextAccent)}>{filteredDeals.length}</Text> of{' '}
              <Text style={s(styles.whiteHighlightTextAccent)}>{deals.length}</Text> deals
            </Text>
            <Text style={s(styles.aggregatedListSummaryCalculationMetaCardLabelStringText)}>
              Total Volume:{' '}
              <Text style={s(styles.quadGridCellFieldBoxDataValueTextEmeraldCurrencyString)}>
                {formatCurrency(totalFilteredValue)}
              </Text>
            </Text>
          </View>
        </ScrollView>
      )}

      <Modal visible={selectedDeal !== null} transparent={true} animationType="slide" onRequestClose={() => setSelectedDeal(null)}>
        <TouchableOpacity style={s(styles.modalOverlayDimBackdropContainerMask)} activeOpacity={1} onPress={() => setSelectedDeal(null)}>
          {selectedDeal && (
            <View style={s(styles.modalProfileBottomSheetCardBodyStructure)} onStartShouldSetResponder={() => true}>
              
              <View style={s(styles.bottomSheetTopStructuralDragHandleBarStrip)} />

              <View style={s(styles.sheetLayoutIdentityHeaderContainerSectionBlock)}>
                <View style={s(styles.sheetLayoutIdentityHeaderFlexAlignmentRowWrapper)}>
                  <View style={s(styles.headerIconProfilePlaceholderSquare)}>
                    <Text style={s(styles.headerEmojiSymbolIcon)}>💼</Text>
                  </View>
                  <View style={s(styles.sheetLayoutIdentityHeaderPropertiesStackGroup)}>
                    <Text style={s(styles.sheetLayoutIdentityHeaderDealNameHeadingText)} numberOfLines={2}>
                      {selectedDeal.name}
                    </Text>
                    <Text style={s(styles.sheetLayoutIdentityHeaderContextLabelSubtextString)}>Deal summary & pipeline timeline info</Text>
                    <View style={s(styles.sheetLayoutIdentityHeaderBadgePositionerAlignWrapper)}>
                      <StageBadge stage={selectedDeal.stage} colors={colors} styles={styles} />
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedDeal(null)} style={s(styles.sheetLayoutIdentityHeaderCloseActionCircularButtonFrame)}>
                    <Text style={s(styles.sheetLayoutIdentityHeaderCloseActionCircularButtonFrameSymbolText)}>×</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <ScrollView style={s(styles.sheetFieldsScrollTrackContainer)} showsVerticalScrollIndicator={false}>
                <View style={s(styles.sheetFieldsVerticalStackSpacingLayout)}>
                  
                  <View style={s([styles.sheetFinancialValueStatementHighlightBannerBox, isDark && styles.sheetFinancialValueStatementHighlightBannerBoxActive])}>
                    <View style={s(styles.sheetFinancialValueStatementLeftIndicatorInlineLabelGroup)}>
                      <Text style={s(styles.sheetFinancialValueStatementBannerEmojiSymbolIcon)}>💰</Text>
                      <Text style={s(styles.sheetFinancialValueStatementBannerLabelUppercaseText)}>DEAL VALUE</Text>
                    </View>
                    <Text style={s(styles.sheetFinancialValueStatementBannerLargeEmeraldCurrencyStringText)}>
                      {formatCurrency(selectedDeal.value)}
                    </Text>
                  </View>

                  <View style={s(styles.sheetFieldsStructuralTwoColumnFlexWrapGridSystem)}>
                    
                    <View style={s(styles.sheetFieldsTwoColumnFlexCellBlock)}>
                      <View style={s(styles.sheetFieldsCellIconAndContextLabelRowGroupInlineHeader)}>
                        <Text style={s(styles.sheetFieldsCellIconGlyphInlineSymbol)}>🏢</Text>
                        <Text style={s(styles.quadGridCellFieldBoxLabelUppercaseText)}>COMPANY</Text>
                      </View>
                      <Text style={s(styles.sheetFieldsCellContentPrimaryWhiteDataStringText)} numberOfLines={1}>
                        {selectedDeal.company || '—'}
                      </Text>
                    </View>

                    <View style={s(styles.sheetFieldsTwoColumnFlexCellBlock)}>
                      <View style={s(styles.sheetFieldsCellIconAndContextLabelRowGroupInlineHeader)}>
                        <Text style={s(styles.sheetFieldsCellIconGlyphInlineSymbol)}>👤</Text>
                        <Text style={s(styles.quadGridCellFieldBoxLabelUppercaseText)}>OWNER</Text>
                      </View>
                      <Text style={s(styles.sheetFieldsCellContentPrimaryWhiteDataStringText)} numberOfLines={1}>
                        {selectedDeal.owner || '—'}
                      </Text>
                    </View>

                    <View style={s(styles.sheetFieldsTwoColumnFlexCellBlock)}>
                      <View style={s(styles.sheetFieldsCellIconAndContextLabelRowGroupInlineHeader)}>
                        <Text style={s(styles.sheetFieldsCellIconGlyphInlineSymbol)}>📅</Text>
                        <Text style={s(styles.quadGridCellFieldBoxLabelUppercaseText)}>CLOSE DATE</Text>
                      </View>
                      <Text style={s(styles.sheetFieldsCellContentPrimaryWhiteDataStringText)} numberOfLines={1}>
                        {formatDate(selectedDeal.closeDate)}
                      </Text>
                    </View>

                    <View style={s(styles.sheetFieldsTwoColumnFlexCellBlock)}>
                      <View style={s(styles.sheetFieldsCellIconAndContextLabelRowGroupInlineHeader)}>
                        <Text style={s(styles.sheetFieldsCellIconGlyphInlineSymbol)}>🎯</Text>
                        <Text style={s(styles.quadGridCellFieldBoxLabelUppercaseText)}>PROBABILITY</Text>
                      </View>
                      {selectedDeal.probability != null ? (
                        <ProbBar value={selectedDeal.probability} styles={styles} />
                      ) : (
                        <Text style={s(styles.quadGridCellFieldBoxDataFallbackMutedString)}>—</Text>
                      )}
                    </View>

                  </View>
                </View>
              </ScrollView>

              <View style={s(styles.sheetLayoutFooterActionControlPanelRowFrameBox)}>
                <TouchableOpacity onPress={() => setSelectedDeal(null)} style={s(styles.sheetLayoutFooterActionControlPanelDismissButtonTriggerFrame)}>
                  <Text style={s(styles.sheetLayoutFooterActionControlPanelDismissButtonTriggerFrameTextLabel)}>Close</Text>
                </TouchableOpacity>
              </View>

            </View>
          )}
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}