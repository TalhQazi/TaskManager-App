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
  Platform,
  Dimensions,
} from 'react-native';
import { apiFetch } from '@/lib/admin/apiClient';
import { useTheme } from '@/contexts/ThemeContext';
import { s, wp, hp, fs } from '@/util/styles';
import { isDarkTheme } from "@/constants/design/presets";

const { height: WINDOW_HEIGHT } = Dimensions.get('window');

const TYPE_OPTIONS     = ['All', 'Follow-up Call', 'Meeting', 'Reminder'];
const PRIORITY_OPTIONS = ['All', 'Low', 'Medium', 'High', 'Urgent'];

interface Task {
  id?: string;
  _id: string;
  title: string;
  type: string;
  priority: string;
  assignedTo?: string;
  linkedEntity?: string;
  dueDate: string;
  status: string;
  notes?: string;
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const isOverdue = (dateStr: string, status: string) => {
  if (status === 'Completed' || !dateStr) return false;
  return new Date(dateStr) < new Date(new Date().toDateString());
};

function buildColors(uiTheme: any, isDark: boolean) {
  return {
    background:    uiTheme.panelColors?.dashboardBackground     || (isDark ? '#090a0f' : '#f8fafc'),
    cardBg:        uiTheme.panelColors?.dashboardCardBackground || (isDark ? '#0f1117' : '#ffffff'),
    text:          uiTheme.panelColors?.dashboardTextColor      || (isDark ? '#ffffff' : '#0f172a'),
    textSecondary: isDark ? '#a3a3a3' : '#64748b',
    textMuted:     isDark ? '#525252' : '#94a3b8',
    textDark:      isDark ? '#404040' : '#475569',
    border:        isDark ? '#171717' : '#e2e8f0',
    borderLight:   isDark ? '#262626' : '#f1f5f9',
    inputBg:       isDark ? 'rgba(0, 0, 0, 0.2)' : '#f8fafc',
    primary:       uiTheme.customColors?.primary || (isDark ? '#6366f1' : '#4f46e5'),
    overlayBg:     'rgba(15, 23, 42, 0.55)',
    readOnlyBg:    isDark ? 'rgba(245, 158, 11, 0.1)' : '#fffbeb',
    readOnlyBorder:isDark ? 'rgba(245, 158, 11, 0.25)' : '#fde68a',
    readOnlyText:  '#b45309',
    typeColors: {
      'Follow-up Call': { bg: isDark ? 'rgba(99, 102, 241, 0.15)' : '#f0f2ff', text: isDark ? '#818cf8' : '#4338ca', border: isDark ? 'rgba(99, 102, 241, 0.3)' : '#c7d2fe', dot: '#6366f1', icon: '📞' },
      'Meeting':        { bg: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5', text: isDark ? '#34d399' : '#047857', border: isDark ? 'rgba(16, 185, 129, 0.3)' : '#a7f3d0', dot: '#10b981', icon: '🤝' },
      'Reminder':       { bg: isDark ? 'rgba(139, 92, 246, 0.15)' : '#f5f3ff', text: isDark ? '#a78bfa' : '#6d28d9', border: isDark ? 'rgba(139, 92, 246, 0.3)' : '#ddd6fe', dot: '#8b5cf6', icon: '🔔' },
      'Other':          { bg: isDark ? '#27272a' : '#f9fafb', text: isDark ? '#9ca3af' : '#4b5563', border: isDark ? '#3f3f46' : '#e5e7eb', dot: '#9ca3af', icon: '📋' },
    },
    priorityColors: {
      Low:    { bg: isDark ? 'rgba(148, 163, 184, 0.1)' : '#f8fafc', text: isDark ? '#94a3b8' : '#475569', border: isDark ? 'rgba(148, 163, 184, 0.2)' : '#e2e8f0', dot: '#94a3b8', bar: '#cbd5e1' },
      Medium: { bg: isDark ? 'rgba(59, 130, 246, 0.1)' : '#eff6ff', text: isDark ? '#60a5fa' : '#1d4ed8', border: isDark ? 'rgba(59, 130, 246, 0.25)' : '#bfdbfe', dot: '#3b82f6', bar: '#60a5fa' },
      High:   { bg: isDark ? 'rgba(245, 158, 11, 0.1)' : '#fffbeb', text: isDark ? '#fbbf24' : '#b45309', border: isDark ? 'rgba(245, 158, 11, 0.25)' : '#fde68a', dot: '#f59e0b', bar: '#fbbf24' },
      Urgent: { bg: isDark ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2', text: isDark ? '#f87171' : '#b91c1c', border: isDark ? 'rgba(239, 68, 68, 0.25)' : '#fee2e2', dot: '#ef4444', bar: '#ef4444' },
    }
  };
}

function createStyles(colors: ReturnType<typeof buildColors>) {
  return StyleSheet.create({
    appSafeAreaViewContainerBackground: {
      flex: 1,
      backgroundColor: colors.background,
    },
    headerPanelSectionRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: wp(4),
      paddingTop: Platform.OS === 'android' ? hp(5.5) : hp(2),
      paddingBottom: hp(2),
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderColor: colors.border,
    },
    headerLeftMetaStack: {
      flex: 1,
      gap: hp(0.25),
    },
    headerTitleAndAlertIndicatorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: wp(2),
    },
    headerPrimaryHeadlineTextText: {
      fontSize: fs(5.5),
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.5,
    },
    headerOverdueCounterBadgePill: {
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      borderWidth: 1,
      borderColor: 'rgba(239, 68, 68, 0.25)',
      paddingHorizontal: wp(2),
      paddingVertical: hp(0.4),
      borderRadius: wp(10),
    },
    headerOverdueCounterBadgePillTextString: {
      color: '#ef4444',
      fontSize: fs(2.8),
      fontWeight: '700',
    },
    headerSecondarySubheadlineTextString: {
      fontSize: fs(3),
      color: colors.textSecondary,
    },
    readOnlyFloatingStatusBadgeFrame: {
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
    readOnlyStatusIndicatorPulseDot: {
      width: wp(1.5),
      height: wp(1.5),
      borderRadius: wp(0.75),
      backgroundColor: '#f59e0b',
    },
    readOnlyStatusIndicatorLabelTextString: {
      color: colors.readOnlyText,
      fontSize: fs(2.8),
      fontWeight: '700',
    },
    filterWidgetCardWrapperBox: {
      backgroundColor: colors.cardBg,
      borderBottomWidth: 1,
      borderColor: colors.border,
      padding: wp(4),
      gap: hp(1.5),
    },
    searchBarBoxInputFrame: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: wp(3),
      paddingHorizontal: wp(3),
      height: hp(5.5),
    },
    searchBarMagnifierIconGlyph: {
      fontSize: fs(3.5),
      marginRight: wp(2),
    },
    searchBarInputElementTextNode: {
      flex: 1,
      color: colors.text,
      fontSize: fs(3.5),
    },
    searchFieldClearButtonHitbox: {
      padding: wp(1),
    },
    searchFieldClearButtonHitboxTextChar: {
      color: colors.textSecondary,
      fontSize: fs(4.5),
      fontWeight: 'bold',
    },
    scrollCategoryAxisTrackContainerRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    scrollCategoryAxisTrackInlineLabelText: {
      fontSize: fs(2.8),
      fontWeight: '800',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      width: wp(15),
    },
    horizontalScrollTrackContainerGapPadding: {
      gap: wp(1.5),
      alignItems: 'center',
      paddingRight: wp(4),
    },
    filterSelectionButtonChipFrame: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      paddingHorizontal: wp(3),
      paddingVertical: hp(0.75),
      borderRadius: wp(10),
      gap: wp(1),
    },
    chipEmbeddedIconEmoji: {
      fontSize: fs(2.8),
    },
    chipEmbeddedColorIndicatorDot: {
      width: wp(1.5),
      height: wp(1.5),
      borderRadius: wp(0.75),
    },
    filterSelectionButtonChipLabelTextString: {
      fontSize: fs(3),
    },
    centralizedStateFeedbackLayoutContainerBox: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: hp(10),
      paddingHorizontal: wp(8),
      gap: hp(1.5),
    },
    centralizedStateFeedbackLayoutContainerDescriptionString: {
      color: colors.textSecondary,
      fontSize: fs(3.5),
      fontWeight: '500',
    },
    errorTextPromptLabel: {
      color: '#ef4444',
      textAlign: 'center',
      fontSize: fs(3.5),
      fontWeight: '500',
    },
    errorActionRetryTriggerButtonFrame: {
      paddingHorizontal: wp(4),
      paddingVertical: hp(1),
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: wp(2),
    },
    errorActionRetryTriggerButtonTextLabel: {
      color: colors.primary,
      fontSize: fs(3.2),
      fontWeight: '600',
    },
    emptyGraphicPlaceholderIconString: {
      fontSize: fs(8),
    },
    emptyGraphicPlaceholderHeadlineString: {
      fontSize: fs(3.5),
      color: colors.textSecondary,
      fontWeight: '500',
    },
    verticalCardsLayoutListScrollTrack: {
      padding: wp(4),
      gap: hp(1.5),
    },
    taskItemCardContainerBox: {
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderRadius: wp(4),
      padding: wp(4),
      gap: hp(1.5),
    },
    cardHeaderFlexRowContainerSplit: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: wp(3),
    },
    cardHeaderFlexLeftGroupWithIcon: {
      flex: 1,
      flexDirection: 'row',
      gap: wp(2.5),
    },
    cardHeaderEmbeddedStatusBoxIconFrame: {
      width: wp(9),
      height: wp(9),
      borderRadius: wp(2.5),
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    cardHeaderEmbeddedStatusBoxIconEmoji: {
      fontSize: fs(4),
    },
    cardHeaderHeadlineIdentityTextStack: {
      flex: 1,
      gap: hp(0.25),
    },
    cardHeaderTaskHeadingHeadlineText: {
      fontSize: fs(3.5),
      fontWeight: '700',
      lineHeight: fs(4.5),
    },
    textColorHeadlineOverdueRed: {
      color: '#ef4444',
    },
    textColorHeadlineNormalBlack: {
      color: colors.text,
    },
    cardHeaderTaskAssigneeMetaStringLabel: {
      fontSize: fs(3),
      color: colors.textSecondary,
      fontWeight: '500',
    },
    cardMetadataWrapContainerInlineFlowLayoutRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: wp(1.5),
    },
    maxWLinkedEntityBadgeWidthLimiter: {
      maxWidth: wp(38),
    },
    cardProgressBarTrackBackgroundFrame: {
      height: hp(0.5),
      backgroundColor: colors.borderLight,
      borderRadius: wp(10),
      overflow: 'hidden',
      width: '100%',
    },
    cardProgressBarTrackFillBarNode: {
      height: '100%',
      borderRadius: wp(10),
    },
    cardActionSimulatedFooterPanelBar: {
      borderTopWidth: 1,
      borderColor: colors.borderLight,
      paddingTop: hp(1.2),
      marginTop: hp(0.25),
      flexDirection: 'row',
      justifyContent: 'flex-end',
    },
    cardActionSimulatedFooterPanelBarLeftIconTextRowGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: wp(1),
    },
    cardActionSimulatedFooterPanelBarInteractiveLabelString: {
      fontSize: fs(3),
      color: colors.primary,
      fontWeight: '700',
    },
    cardActionSimulatedFooterPanelBarInteractiveArrowSymbol: {
      fontSize: fs(3),
      color: colors.primary,
      fontWeight: 'bold',
    },
    aggregatedListSummaryCalculationMetaCardLabelStringText: {
      fontSize: fs(3),
      color: colors.textSecondary,
      textAlign: 'center',
      fontWeight: '500',
      marginTop: hp(0.5),
      marginBottom: hp(3),
    },
    badgeFrame: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      backgroundColor: colors.cardBg,
      borderColor: colors.border,
      paddingHorizontal: wp(2),
      paddingVertical: hp(0.5),
      borderRadius: wp(10),
      gap: wp(1),
    },
    badgeIconText: {
      fontSize: fs(2.8),
    },
    badgeIndicatorDot: {
      width: wp(1.5),
      height: wp(1.5),
      borderRadius: wp(0.75),
    },
    badgeLabelText: {
      fontSize: fs(2.8),
      fontWeight: '600',
      color: colors.textDark,
    },
    dueDateWrapperInlineRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: wp(1.5),
    },
    dueDateLabelStringText: {
      fontSize: fs(3.5),
    },
    textColorOverdueRed: {
      color: '#dc2626',
      fontWeight: '600',
    },
    textColorNormalGray: {
      color: colors.textDark,
    },
    overdueAlertInlinePill: {
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      paddingHorizontal: wp(1.5),
      paddingVertical: hp(0.15),
      borderRadius: wp(1),
      borderWidth: 1,
      borderColor: 'rgba(239, 68, 68, 0.2)',
    },
    overdueAlertInlinePillText: {
      color: '#ef4444',
      fontSize: fs(2.2),
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    modalOverlayDimBackdropContainerMask: {
      flex: 1,
      backgroundColor: colors.overlayBg,
      justifyContent: 'flex-end',
    },
    modalProfileBottomSheetCardBodyStructure: {
      backgroundColor: colors.cardBg,
      borderTopLeftRadius: wp(6),
      borderTopRightRadius: wp(6),
      height: hp(75),
      overflow: 'hidden',
    },
    bottomSheetTopStructuralDragHandleBarStrip: {
      width: wp(9),
      height: hp(0.5),
      backgroundColor: colors.border,
      borderRadius: wp(0.5),
      alignSelf: 'center',
      marginTop: hp(1.5),
    },
    sheetLayoutIdentityHeaderContainerSectionBlock: {
      padding: wp(5),
      borderBottomWidth: 1,
      marginTop: hp(1.5),
    },
    sheetLayoutIdentityHeaderFlexAlignmentRowWrapper: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      position: 'relative',
    },
    sheetLayoutHeaderIdentityIconSquareBoxFrame: {
      width: wp(11),
      height: wp(11),
      borderRadius: wp(3),
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sheetLayoutHeaderIdentityIconSquareBoxFrameEmojiText: {
      fontSize: fs(5),
    },
    sheetLayoutIdentityHeaderPropertiesStackGroup: {
      flex: 1,
      marginLeft: wp(3),
      marginRight: wp(9),
      gap: hp(0.25),
    },
    sheetLayoutIdentityHeaderTaskNameHeadingText: {
      fontSize: fs(4),
      fontWeight: '800',
      color: colors.text,
      lineHeight: fs(5),
    },
    sheetLayoutIdentityHeaderContextLabelSubtextString: {
      fontSize: fs(3),
      color: colors.textSecondary,
    },
    sheetLayoutIdentityHeaderCloseActionCircularButtonFrame: {
      position: 'absolute',
      top: 0,
      right: 0,
      width: wp(7),
      height: wp(7),
      borderRadius: wp(10),
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sheetLayoutIdentityHeaderCloseActionCircularButtonFrameSymbolText: {
      fontSize: fs(4),
      color: colors.textSecondary,
      fontWeight: 'bold',
      lineHeight: fs(4),
    },
    sheetLayoutHeaderOverdueWarningAlertBannerCardBlockRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      borderWidth: 1,
      borderColor: 'rgba(239, 68, 68, 0.25)',
      borderRadius: wp(3),
      padding: wp(2.5),
      marginTop: hp(1.8),
      gap: wp(2),
    },
    sheetLayoutHeaderOverdueWarningAlertBannerCardBlockRowLabelStringText: {
      fontSize: fs(3),
      fontWeight: '600',
      color: '#ef4444',
    },
    sheetFieldsScrollTrackContainer: {
      flex: 1,
      padding: wp(5),
    },
    sheetFieldsVerticalStackSpacingLayout: {
      paddingBottom: hp(4),
    },
    sheetFieldsStructuralTwoColumnFlexWrapGridSystem: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      rowGap: hp(2.2),
    },
    sheetFieldsTwoColumnFlexCellBlock: {
      width: '50%',
      paddingRight: wp(2),
      gap: hp(0.5),
    },
    sheetFieldsFullWidthColumnFlexCellBlock: {
      width: '100%',
      gap: hp(0.5),
    },
    sheetFieldDefinitionUppercaseLabelHeadingText: {
      fontSize: fs(2.5),
      fontWeight: '800',
      color: colors.textSecondary,
      letterSpacing: 0.8,
    },
    sheetFieldsCellContentBadgePositionerAlignWrapper: {
      alignSelf: 'flex-start',
      marginTop: hp(0.25),
    },
    sheetFieldsCellContentPrimaryNormalDataStringText: {
      fontSize: fs(3.5),
      fontWeight: '600',
      color: colors.textDark,
    },
    sheetFieldsCellContentNotesParagraphDataStringText: {
      fontSize: fs(3.2),
      color: colors.textDark,
      lineHeight: fs(4.5),
      fontWeight: '500',
    },
    sheetLayoutFooterActionControlPanelRowFrameBox: {
      padding: wp(4),
      backgroundColor: colors.inputBg,
      borderTopWidth: 1,
      borderColor: colors.borderLight,
      paddingBottom: Platform.OS === 'ios' ? hp(4.2) : hp(2),
    },
    sheetLayoutFooterActionControlPanelDismissButtonTriggerFrame: {
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: wp(3),
      paddingVertical: hp(1.5),
      alignItems: 'center',
      justifyContent: 'center',
    },
    sheetLayoutFooterActionControlPanelDismissButtonTriggerFrameTextLabel: {
      color: colors.textDark,
      fontSize: fs(3.5),
      fontWeight: '600',
    },
  });
}

function TypeBadge({ type, colors, styles }: { type: string; colors: any; styles: any }) {
  const cfg = colors.typeColors[type as keyof typeof colors.typeColors] || colors.typeColors['Other'];
  return (
    <View style={s([styles.badgeFrame, { backgroundColor: cfg.bg, borderColor: cfg.border }])}>
      <Text style={s(styles.badgeIconText)}>{cfg.icon}</Text>
      <Text style={s([styles.badgeLabelText, { color: cfg.text }])}>{type || 'Other'}</Text>
    </View>
  );
}

function PriorityBadge({ priority, colors, styles }: { priority: string; colors: any; styles: any }) {
  const cfg = colors.priorityColors[priority as keyof typeof colors.priorityColors] || colors.priorityColors['Low'];
  return (
    <View style={s([styles.badgeFrame, { backgroundColor: cfg.bg, borderColor: cfg.border }])}>
      <View style={s([styles.badgeIndicatorDot, { backgroundColor: cfg.dot }])} />
      <Text style={s([styles.badgeLabelText, { color: cfg.text }])}>{priority || '—'}</Text>
    </View>
  );
}

function DueDate({ dateStr, status, styles }: { dateStr: string; status: string; styles: any }) {
  const overdue = isOverdue(dateStr, status);
  return (
    <View style={s(styles.dueDateWrapperInlineRow)}>
      <Text style={s([styles.dueDateLabelStringText, overdue ? styles.textColorOverdueRed : styles.textColorNormalGray])}>
        {overdue ? '⚠ ' : ''}{formatDate(dateStr)}
      </Text>
      {overdue && (
        <View style={s(styles.overdueAlertInlinePill)}>
          <Text style={s(styles.overdueAlertInlinePillText)}>Overdue</Text>
        </View>
      )}
    </View>
  );
}

export default function CRMTasks() {
  const { uiTheme } = useTheme();
  const isDark = isDarkTheme(uiTheme?.theme);
  const colors = useMemo(() => buildColors(uiTheme, isDark), [uiTheme, isDark]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch('/api/crm-tasks');
      setTasks(data.items || []);
    } catch (err: any) {
      setError(err?.message || 'Unable to load CRM tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        task.title?.toLowerCase().includes(q) ||
        task.assignedTo?.toLowerCase().includes(q) ||
        task.linkedEntity?.toLowerCase().includes(q);
      const matchesType     = typeFilter === 'All' || task.type === typeFilter;
      const matchesPriority = priorityFilter === 'All' || task.priority === priorityFilter;
      return matchesSearch && matchesType && matchesPriority;
    });
  }, [tasks, searchQuery, typeFilter, priorityFilter]);

  const typeCounts = useMemo(() => {
    const c: Record<string, number> = { All: tasks.length };
    tasks.forEach((t) => { c[t.type] = (c[t.type] || 0) + 1; });
    return c;
  }, [tasks]);

  const priorityCounts = useMemo(() => {
    const c: Record<string, number> = { All: tasks.length };
    tasks.forEach((t) => { c[t.priority] = (c[t.priority] || 0) + 1; });
    return c;
  }, [tasks]);

  const overdueCount = useMemo(() => {
    return tasks.filter((t) => isOverdue(t.dueDate, t.status)).length;
  }, [tasks]);

  return (
    <SafeAreaView style={s(styles.appSafeAreaViewContainerBackground)}>
      
      <View style={s(styles.headerPanelSectionRow)}>
        <View style={s(styles.headerLeftMetaStack)}>
          <View style={s(styles.headerTitleAndAlertIndicatorRow)}>
            <Text style={s(styles.headerPrimaryHeadlineTextText)}>Tasks</Text>
            {overdueCount > 0 ? (
              <View style={s(styles.headerOverdueCounterBadgePill)}>
                <Text style={s(styles.headerOverdueCounterBadgePillTextString)}>⚠ {overdueCount} overdue</Text>
              </View>
            ) : null}
          </View>
          <Text style={s(styles.headerSecondarySubheadlineTextString)}>Browse CRM task assignments and work.</Text>
        </View>
        <View style={s(styles.readOnlyFloatingStatusBadgeFrame)}>
          <View style={s(styles.readOnlyStatusIndicatorPulseDot)} />
          <Text style={s(styles.readOnlyStatusIndicatorLabelTextString)}>Read-only</Text>
        </View>
      </View>

      <View style={s(styles.filterWidgetCardWrapperBox)}>
        <View style={s(styles.searchBarBoxInputFrame)}>
          <Text style={s(styles.searchBarMagnifierIconGlyph)}>🔍</Text>
          <TextInput
            placeholder="Search by title, assignee, or linked entity…"
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={s(styles.searchBarInputElementTextNode)}
            autoCapitalize="none"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={s(styles.searchFieldClearButtonHitbox)}>
              <Text style={s(styles.searchFieldClearButtonHitboxTextChar)}>×</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={s(styles.scrollCategoryAxisTrackContainerRow)}>
          <Text style={s(styles.scrollCategoryAxisTrackInlineLabelText)}>Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s(styles.horizontalScrollTrackContainerGapPadding)}>
            {TYPE_OPTIONS.map((type) => {
              const active = typeFilter === type;
              const cfg = colors.typeColors[type as keyof typeof colors.typeColors] || colors.typeColors['Other'];
              
              let chipBg = colors.cardBg;
              let chipBorderColor = colors.border;
              let chipTextColor = colors.textSecondary;

              if (active) {
                if (type === 'All') {
                  chipBg = colors.primary;
                  chipBorderColor = colors.primary;
                  chipTextColor = '#ffffff';
                } else {
                  chipBg = cfg.bg;
                  chipBorderColor = cfg.border;
                  chipTextColor = cfg.text;
                }
              }

              return (
                <TouchableOpacity
                  key={type}
                  activeOpacity={0.7}
                  onPress={() => setTypeFilter(type)}
                  style={s([styles.filterSelectionButtonChipFrame, { backgroundColor: chipBg, borderColor: chipBorderColor }])}
                >
                  {type !== 'All' && <Text style={s(styles.chipEmbeddedIconEmoji)}>{cfg.icon}</Text>}
                  <Text style={s([styles.filterSelectionButtonChipLabelTextString, { color: chipTextColor, fontWeight: active ? '700' : '600' }])}>
                    {type} {typeCounts[type] !== undefined ? `(${typeCounts[type] || 0})` : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={s(styles.scrollCategoryAxisTrackContainerRow)}>
          <Text style={s(styles.scrollCategoryAxisTrackInlineLabelText)}>Priority</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s(styles.horizontalScrollTrackContainerGapPadding)}>
            {PRIORITY_OPTIONS.map((p) => {
              const active = priorityFilter === p;
              const cfg = colors.priorityColors[p as keyof typeof colors.priorityColors] || colors.priorityColors['Low'];

              let chipBg = colors.cardBg;
              let chipBorderColor = colors.border;
              let chipTextColor = colors.textSecondary;

              if (active) {
                if (p === 'All') {
                  chipBg = colors.primary;
                  chipBorderColor = colors.primary;
                  chipTextColor = '#ffffff';
                } else {
                  chipBg = cfg.bg;
                  chipBorderColor = cfg.border;
                  chipTextColor = cfg.text;
                }
              }

              return (
                <TouchableOpacity
                  key={p}
                  activeOpacity={0.7}
                  onPress={() => setPriorityFilter(p)}
                  style={s([styles.filterSelectionButtonChipFrame, { backgroundColor: chipBg, borderColor: chipBorderColor }])}
                >
                  {p !== 'All' && active && <View style={s([styles.chipEmbeddedColorIndicatorDot, { backgroundColor: cfg.dot }])} />}
                  <Text style={s([styles.filterSelectionButtonChipLabelTextString, { color: chipTextColor, fontWeight: active ? '700' : '600' }])}>
                    {p} {priorityCounts[p] !== undefined ? `(${priorityCounts[p] || 0})` : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>

      {loading && (
        <View style={s(styles.centralizedStateFeedbackLayoutContainerBox)}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={s(styles.centralizedStateFeedbackLayoutContainerDescriptionString)}>Loading tasks…</Text>
        </View>
      )}

      {!loading && error && (
        <View style={s(styles.centralizedStateFeedbackLayoutContainerBox)}>
          <Text style={s(styles.errorTextPromptLabel)}>{error}</Text>
          <TouchableOpacity onPress={fetchTasks} style={s(styles.errorActionRetryTriggerButtonFrame)}>
            <Text style={s(styles.errorActionRetryTriggerButtonTextLabel)}>Try again</Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && !error && filteredTasks.length === 0 && (
        <View style={s(styles.centralizedStateFeedbackLayoutContainerBox)}>
          <Text style={s(styles.emptyGraphicPlaceholderIconString)}>📋</Text>
          <Text style={s(styles.emptyGraphicPlaceholderHeadlineString)}>No tasks found.</Text>
        </View>
      )}

      {!loading && !error && filteredTasks.length > 0 && (
        <ScrollView contentContainerStyle={s(styles.verticalCardsLayoutListScrollTrack)} showsVerticalScrollIndicator={false}>
          {filteredTasks.map((task) => {
            const overdue = isOverdue(task.dueDate, task.status);
            const priCfg  = colors.priorityColors[task.priority as keyof typeof colors.priorityColors] || colors.priorityColors['Low'];
            const typeCfg = colors.typeColors[task.type as keyof typeof colors.typeColors] || colors.typeColors['Other'];

            let priorityPctWidth: '25%' | '50%' | '75%' | '100%' = '25%';
            if (task.priority === 'Urgent') priorityPctWidth = '100%';
            else if (task.priority === 'High') priorityPctWidth = '75%';
            else if (task.priority === 'Medium') priorityPctWidth = '50%';

            return (
              <TouchableOpacity
                key={task.id || task._id}
                activeOpacity={0.85}
                onPress={() => setSelectedTask(task)}
                style={s([styles.taskItemCardContainerBox, { borderColor: overdue ? '#ef4444' : colors.border }])}
              >
                <View style={s(styles.cardHeaderFlexRowContainerSplit)}>
                  <View style={s(styles.cardHeaderFlexLeftGroupWithIcon)}>
                    <View style={s(styles.cardHeaderEmbeddedStatusBoxIconFrame)}>
                      <Text style={s(styles.cardHeaderEmbeddedStatusBoxIconEmoji)}>{typeCfg.icon}</Text>
                    </View>
                    <View style={s(styles.cardHeaderHeadlineIdentityTextStack)}>
                      <Text style={s([styles.cardHeaderTaskHeadingHeadlineText, overdue ? styles.textColorHeadlineOverdueRed : styles.textColorHeadlineNormalBlack])} numberOfLines={2}>
                        {task.title}
                      </Text>
                      {task.assignedTo ? (
                        <Text style={s(styles.cardHeaderTaskAssigneeMetaStringLabel)} numberOfLines={1}>
                          👤 {task.assignedTo}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  <PriorityBadge priority={task.priority} colors={colors} styles={styles} />
                </View>

                <View style={s(styles.cardMetadataWrapContainerInlineFlowLayoutRow)}>
                  <TypeBadge type={task.type} colors={colors} styles={styles} />
                  <View style={s([styles.badgeFrame, { backgroundColor: overdue ? 'rgba(239, 68, 68, 0.1)' : colors.cardBg, borderColor: overdue ? '#ef4444' : colors.border }])}>
                    <Text style={s([styles.badgeLabelText, overdue ? styles.textColorOverdueRed : styles.textColorNormalGray])}>
                      📅 {formatDate(task.dueDate)} {overdue ? '· Overdue' : ''}
                    </Text>
                  </View>
                  {task.linkedEntity ? (
                    <View style={s([styles.badgeFrame, styles.maxWLinkedEntityBadgeWidthLimiter])}>
                      <Text style={s(styles.badgeLabelText)} numberOfLines={1}>🔗 {task.linkedEntity}</Text>
                    </View>
                  ) : null}
                </View>

                <View style={s(styles.cardProgressBarTrackBackgroundFrame)}>
                  <View style={s([styles.cardProgressBarTrackFillBarNode, { backgroundColor: priCfg.bar, width: priorityPctWidth }])} />
                </View>

                <View style={s(styles.cardActionSimulatedFooterPanelBar)}>
                  <View style={s(styles.cardActionSimulatedFooterPanelBarLeftIconTextRowGroup)}>
                    <Text style={s(styles.cardActionSimulatedFooterPanelBarInteractiveLabelString)}>View Details</Text>
                    <Text style={s(styles.cardActionSimulatedFooterPanelBarInteractiveArrowSymbol)}>→</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
          
          <Text style={s(styles.aggregatedListSummaryCalculationMetaCardLabelStringText)}>
            Showing {filteredTasks.length} of {tasks.length} tasks
          </Text>
        </ScrollView>
      )}

      <Modal visible={selectedTask !== null} transparent={true} animationType="slide" onRequestClose={() => setSelectedTask(null)}>
        <TouchableOpacity style={s(styles.modalOverlayDimBackdropContainerMask)} activeOpacity={1} onPress={() => setSelectedTask(null)}>
          {selectedTask && (
            <View style={s(styles.modalProfileBottomSheetCardBodyStructure)} onStartShouldSetResponder={() => true}>
              
              <View style={s(styles.bottomSheetTopStructuralDragHandleBarStrip)} />

              <View style={s([styles.sheetLayoutIdentityHeaderContainerSectionBlock, { backgroundColor: (colors.typeColors[selectedTask.type as keyof typeof colors.typeColors] || colors.typeColors['Other']).bg, borderColor: (colors.typeColors[selectedTask.type as keyof typeof colors.typeColors] || colors.typeColors['Other']).border }])}>
                <View style={s(styles.sheetLayoutIdentityHeaderFlexAlignmentRowWrapper)}>
                  <View style={s(styles.sheetLayoutHeaderIdentityIconSquareBoxFrame)}>
                    <Text style={s(styles.sheetLayoutHeaderIdentityIconSquareBoxFrameEmojiText)}>{(colors.typeColors[selectedTask.type as keyof typeof colors.typeColors] || colors.typeColors['Other']).icon}</Text>
                  </View>
                  <View style={s(styles.sheetLayoutIdentityHeaderPropertiesStackGroup)}>
                    <Text style={s(styles.sheetLayoutIdentityHeaderTaskNameHeadingText)} numberOfLines={3}>
                      {selectedTask.title}
                    </Text>
                    <Text style={s(styles.sheetLayoutIdentityHeaderContextLabelSubtextString)}>Task information and assignment details.</Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedTask(null)} style={s(styles.sheetLayoutIdentityHeaderCloseActionCircularButtonFrame)}>
                    <Text style={s(styles.sheetLayoutIdentityHeaderCloseActionCircularButtonFrameSymbolText)}>×</Text>
                  </TouchableOpacity>
                </View>

                {isOverdue(selectedTask.dueDate, selectedTask.status) ? (
                  <View style={s(styles.sheetLayoutHeaderOverdueWarningAlertBannerCardBlockRow)}>
                    <Text style={s(styles.sheetLayoutHeaderOverdueWarningAlertBannerCardBlockRowLabelStringText)}>⚠ This task is currently overdue</Text>
                  </View>
                ) : null}
              </View>

              <ScrollView style={s(styles.sheetFieldsScrollTrackContainer)} showsVerticalScrollIndicator={false}>
                <View style={s(styles.sheetFieldsVerticalStackSpacingLayout)}>
                  
                  <View style={s(styles.sheetFieldsStructuralTwoColumnFlexWrapGridSystem)}>
                    
                    <View style={s(styles.sheetFieldsTwoColumnFlexCellBlock)}>
                      <Text style={s(styles.sheetFieldDefinitionUppercaseLabelHeadingText)}>TYPE</Text>
                      <View style={s(styles.sheetFieldsCellContentBadgePositionerAlignWrapper)}>
                        <TypeBadge type={selectedTask.type} colors={colors} styles={styles} />
                      </View>
                    </View>

                    <View style={s(styles.sheetFieldsTwoColumnFlexCellBlock)}>
                      <Text style={s(styles.sheetFieldDefinitionUppercaseLabelHeadingText)}>PRIORITY</Text>
                      <View style={s(styles.sheetFieldsCellContentBadgePositionerAlignWrapper)}>
                        <PriorityBadge priority={selectedTask.priority} colors={colors} styles={styles} />
                      </View>
                    </View>

                    <View style={s(styles.sheetFieldsTwoColumnFlexCellBlock)}>
                      <Text style={s(styles.sheetFieldDefinitionUppercaseLabelHeadingText)}>ASSIGNED TO</Text>
                      <Text style={s(styles.sheetFieldsCellContentPrimaryNormalDataStringText)}>{selectedTask.assignedTo || 'Unassigned'}</Text>
                    </View>

                    <View style={s(styles.sheetFieldsTwoColumnFlexCellBlock)}>
                      <Text style={s(styles.sheetFieldDefinitionUppercaseLabelHeadingText)}>STATUS</Text>
                      <Text style={s(styles.sheetFieldsCellContentPrimaryNormalDataStringText)}>{selectedTask.status || '—'}</Text>
                    </View>

                    <View style={s(styles.sheetFieldsFullWidthColumnFlexCellBlock)}>
                      <Text style={s(styles.sheetFieldDefinitionUppercaseLabelHeadingText)}>DUE DATE</Text>
                      <DueDate dateStr={selectedTask.dueDate} status={selectedTask.status} styles={styles} />
                    </View>

                    <View style={s(styles.sheetFieldsFullWidthColumnFlexCellBlock)}>
                      <Text style={s(styles.sheetFieldDefinitionUppercaseLabelHeadingText)}>LINKED CONTACT / DEAL</Text>
                      <Text style={s(styles.sheetFieldsCellContentPrimaryNormalDataStringText)}>{selectedTask.linkedEntity || '—'}</Text>
                    </View>

                    {selectedTask.notes ? (
                      <View style={s(styles.sheetFieldsFullWidthColumnFlexCellBlock)}>
                        <Text style={s(styles.sheetFieldDefinitionUppercaseLabelHeadingText)}>NOTES</Text>
                        <Text style={s(styles.sheetFieldsCellContentNotesParagraphDataStringText)}>{selectedTask.notes}</Text>
                      </View>
                    ) : null}

                  </View>
                </View>
              </ScrollView>

              <View style={s(styles.sheetLayoutFooterActionControlPanelRowFrameBox)}>
                <TouchableOpacity onPress={() => setSelectedTask(null)} style={s(styles.sheetLayoutFooterActionControlPanelDismissButtonTriggerFrame)}>
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