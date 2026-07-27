import React, { useState, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Polygon, Polyline, Circle } from 'react-native-svg';
import { apiFetch } from '@/lib/admin/apiClient';
import { useTheme } from '@/contexts/ThemeContext';
import { s, wp, hp, fs } from '@/util/styles';

const STAT_CARD_CONFIG = [
  { key: 'contacts',     label: 'Total Contacts',  icon: '👥', color: '#38bdf8', border: 'rgba(14, 165, 233, 0.2)', bg: 'rgba(14, 165, 233, 0.1)' },
  { key: 'companies',    label: 'Companies',        icon: '🏢', color: '#818cf8', border: 'rgba(99, 102, 241, 0.2)',  bg: 'rgba(99, 102, 241, 0.1)' },
  { key: 'activeDeals',  label: 'Active Deals',     icon: '⚡', color: '#fbbf24', border: 'rgba(245, 158, 11, 0.2)',  bg: 'rgba(245, 158, 11, 0.1)' },
  { key: 'wonDeals',     label: 'Won Deals',        icon: '🏆', color: '#34d399', border: 'rgba(16, 185, 129, 0.2)', bg: 'rgba(16, 185, 129, 0.1)' },
  { key: 'lostDeals',    label: 'Lost Deals',       icon: '📉', color: '#f87171', border: 'rgba(239, 68, 68, 0.2)',     bg: 'rgba(239, 68, 68, 0.1)' },
  { key: 'activeTasks',  label: 'Pending Tasks',    icon: '📋', color: '#a78bfa', border: 'rgba(139, 92, 246, 0.2)',  bg: 'rgba(139, 92, 246, 0.1)' },
  { key: 'pipelineValue',label: 'Pipeline Value',   icon: '💰', color: '#2dd4bf', border: 'rgba(20, 184, 166, 0.2)',    bg: 'rgba(20, 184, 166, 0.1)', wide: true },
  { key: 'revenue',      label: 'Closed Revenue',   icon: '📈', color: '#6ee7b7', border: 'rgba(52, 211, 153, 0.2)',  bg: 'rgba(52, 211, 153, 0.1)', wide: true },
];

const STAGE_CONFIG: Record<string, { barColors: string[]; text: string }> = {
  Leads:     { barColors: ['#0ea5e9', '#60a5fa'], text: '#38bdf8' },
  Qualified: { barColors: ['#6366f1', '#a78bfa'], text: '#818cf8' },
  Proposal:  { barColors: ['#f59e0b', '#fb923c'], text: '#fbbf24' },
  Won:       { barColors: ['#10b981', '#2dd4bf'], text: '#34d399' },
};

const TYPE_CONFIG: Record<string, { icon: string; bg: string; text: string; border: string }> = {
  deal:          { icon: '💼', bg: 'rgba(14, 165, 233, 0.1)',     text: '#38bdf8', border: 'rgba(14, 165, 233, 0.2)' },
  task:          { icon: '✅', bg: 'rgba(16, 185, 129, 0.1)', text: '#34d399', border: 'rgba(16, 185, 129, 0.2)' },
  communication: { icon: '💬', bg: 'rgba(139, 92, 246, 0.1)',  text: '#a78bfa', border: 'rgba(139, 92, 246, 0.2)' },
};

const PRIORITY_CONFIG: Record<string, { dot: string; text: string; bg: string; border: string }> = {
  Urgent: { dot: '#f87171', text: '#fca5a5', bg: 'rgba(239, 68, 68, 0.1)',    border: 'rgba(239, 68, 68, 0.25)' },
  High:   { dot: '#fb923c', text: '#fdba74', bg: 'rgba(249, 115, 22, 0.1)', border: 'rgba(249, 115, 22, 0.25)' },
  Medium: { dot: '#fbbf24', text: '#fde047', bg: 'rgba(245, 158, 11, 0.1)',  border: 'rgba(245, 158, 11, 0.25)' },
  Low:    { dot: '#64748b', text: '#94a3b8', bg: 'rgba(148, 163, 184, 0.1)',  border: 'rgba(148, 163, 184, 0.25)' },
};

const formatCurrency = (value: number) => {
  if (!value) return '$0';
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
};

function CountUp({ target, duration = 1000, style }: { target: number; duration?: number; style?: any }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!target) return;
    let startTimestamp: number | null = null;
    let animationFrameId: number;

    const tick = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      
      if (progress < 1) {
        animationFrameId = requestAnimationFrame(tick);
      }
    };

    animationFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrameId);
  }, [target, duration]);

  return <Text style={style}>{count.toLocaleString()}</Text>;
}

function buildColors(uiTheme: any, isDark: boolean) {
  return {
    background:      uiTheme.panelColors?.dashboardBackground     || (isDark ? '#0f1117' : '#F8FAFC'),
    cardBg:          uiTheme.panelColors?.dashboardCardBackground || (isDark ? '#171717' : '#FFFFFF'),
    cardBgSub:       isDark ? 'rgba(30, 41, 59, 0.4)' : '#F1F5F9',
    text:            uiTheme.panelColors?.dashboardTextColor      || (isDark ? '#ffffff' : '#0F172A'),
    textSecondary:   isDark ? '#94a3b8' : '#475569',
    textMuted:       isDark ? '#64748b' : '#94A3B8',
    textDark:        isDark ? '#737373' : '#64748B',
    border:          isDark ? '#262626' : '#E2E8F0',
    borderLight:     isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)',
    primary:         uiTheme.customColors?.primary || '#0ea5e9',
    accentBg:        'rgba(56, 189, 248, 0.15)',
    accentBorder:    'rgba(56, 189, 248, 0.3)',
    statusLive:      '#10b981',
    statusSync:      '#f59e0b',
    barFillDefault:  isDark ? '#404040' : '#CBD5E1',
    barTrack:        isDark ? '#262626' : '#E2E8F0',
  };
}

function createStyles(colors: ReturnType<typeof buildColors>) {
  return StyleSheet.create({
    rootContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    topAccentBar: {
      height: hp(0.4),
      backgroundColor: colors.primary,
      width: '100%',
    },
    scrollLayout: {
      paddingHorizontal: wp(4),
      paddingVertical: hp(2.5),
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: hp(2.5),
    },
    headerTitleGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: wp(3),
    },
    headerIconContainer: {
      width: wp(10.5),
      height: wp(10.5),
      borderRadius: wp(2.5),
      backgroundColor: colors.accentBg,
      borderWidth: 1,
      borderColor: colors.accentBorder,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerIconText: {
      fontSize: fs(5),
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
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.borderLight,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: wp(2.5),
      paddingVertical: hp(0.75),
      borderRadius: wp(2),
    },
    statusDot: {
      width: wp(1.5),
      height: wp(1.5),
      borderRadius: wp(0.75),
      marginRight: wp(1.5),
    },
    statusBadgeText: {
      color: colors.textSecondary,
      fontSize: fs(2.8),
      fontWeight: '600',
    },
    errorContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      borderWidth: 1,
      borderColor: 'rgba(239, 68, 68, 0.3)',
      borderRadius: wp(3),
      padding: wp(3),
      marginBottom: hp(2),
      gap: wp(2.5),
    },
    errorIcon: {
      color: '#f87171',
      fontSize: fs(4),
    },
    errorText: {
      color: '#fca5a5',
      fontSize: fs(3.2),
      flex: 1,
    },
    loaderContainer: {
      paddingVertical: hp(5),
      alignItems: 'center',
      gap: hp(1.5),
    },
    loaderText: {
      color: colors.textMuted,
      fontSize: fs(3.2),
    },
    statsFlexGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: wp(3),
      marginBottom: hp(2.5),
    },
    statCardItem: {
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderRadius: wp(4),
      padding: wp(4),
    },
    statCardItemHalf: {
      width: (wp(100) - wp(8) - wp(3)) / 2.2,
    },
    statCardItemWide: {
      width: '100%',
    },
    statCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: hp(1.5),
    },
    statIconFrame: {
      width: wp(9),
      height: wp(9),
      borderRadius: wp(2.5),
      borderWidth: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    statIcon: {
      fontSize: fs(4),
    },
    pulseDot: {
      width: wp(1.2),
      height: wp(1.2),
      borderRadius: wp(0.6),
      backgroundColor: '#10b981',
    },
    statValueText: {
      fontSize: fs(6),
      fontWeight: '800',
    },
    statLabelText: {
      color: colors.textSecondary,
      fontSize: fs(2.5),
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: hp(0.5),
    },
    chartBlockCard: {
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: wp(4),
      padding: wp(4),
      marginBottom: hp(2.5),
    },
    chartHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: hp(2),
    },
    blockCardTitle: {
      color: colors.text,
      fontSize: fs(4),
      fontWeight: '700',
    },
    blockCardSubtitle: {
      color: colors.textDark,
      fontSize: fs(3),
      marginTop: hp(0.25),
    },
    countPillBadge: {
      backgroundColor: colors.borderLight,
      paddingHorizontal: wp(2),
      paddingVertical: hp(0.5),
      borderRadius: wp(1.5),
    },
    countPillText: {
      color: colors.textSecondary,
      fontSize: fs(2.8),
      fontWeight: '500',
    },
    emptyChartState: {
      height: hp(15),
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyStateText: {
      color: colors.textDark,
      fontSize: fs(3.2),
    },
    barsContainer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      height: hp(16),
      paddingTop: hp(1.2),
    },
    barColumnWrapper: {
      flex: 1,
      alignItems: 'center',
    },
    barValueLabel: {
      fontSize: fs(2.5),
      fontWeight: '700',
      color: colors.textDark,
      marginBottom: hp(0.5),
    },
    primaryHighlightText: {
      color: '#38bdf8',
    },
    barTrackContainer: {
      height: hp(10),
      width: wp(3.5),
      backgroundColor: colors.barTrack,
      borderRadius: wp(1),
      justifyContent: 'flex-end',
      overflow: 'hidden',
    },
    barFilling: {
      width: '100%',
      borderRadius: wp(1),
    },
    barAxisLabel: {
      fontSize: fs(2.2),
      color: colors.textDark,
      marginTop: hp(0.75),
      textTransform: 'uppercase',
    },
    stagesBlockSpace: {
      gap: hp(2),
      marginTop: hp(1.8),
    },
    stageRowsContainer: {
      gap: hp(1.2),
    },
    stageHorizontalRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: wp(2.5),
    },
    stageLabelWidth: {
      width: wp(18),
    },
    stageNameText: {
      fontSize: fs(3),
      fontWeight: '600',
    },
    stageProgressTrack: {
      flex: 1,
      height: hp(2.5),
      backgroundColor: colors.barTrack,
      borderRadius: wp(1.5),
      overflow: 'hidden',
    },
    stageProgressFill: {
      height: '100%',
      borderRadius: wp(1.5),
      justifyContent: 'center',
      alignItems: 'flex-end',
      paddingRight: wp(1.5),
    },
    stageCountInsideBar: {
      color: '#ffffff',
      fontSize: fs(2.2),
      fontWeight: '700',
    },
    stagePercentWidth: {
      width: wp(8),
      alignItems: 'flex-end',
    },
    stagePercentText: {
      color: colors.textDark,
      fontSize: fs(2.8),
      fontWeight: '700',
    },
    svgTrendContainer: {
      backgroundColor: colors.borderLight,
      borderRadius: wp(3),
      padding: wp(2.5),
      borderWidth: 1,
      borderColor: colors.border,
    },
    svgLabelTitle: {
      fontSize: fs(2.2),
      fontWeight: '700',
      color: colors.textDark,
      letterSpacing: 0.5,
      marginBottom: hp(0.75),
    },
    svgLineGraph: {
      width: '100%',
      height: hp(7.5),
    },
    tabPanelCardContainer: {
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: wp(4),
      overflow: 'hidden',
      marginBottom: hp(2.5),
    },
    tabsHeaderTrack: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderColor: colors.border,
    },
    tabButtonElement: {
      flex: 1,
      paddingVertical: hp(1.8),
      alignItems: 'center',
      backgroundColor: 'transparent',
    },
    activeTabButtonElement: {
      backgroundColor: colors.borderLight,
      borderBottomWidth: 2,
      borderBottomColor: colors.primary,
    },
    tabButtonLabelText: {
      color: colors.textDark,
      fontSize: fs(3.2),
      fontWeight: '600',
    },
    activeTabButtonLabelText: {
      color: colors.text,
    },
    tabbedPanelBodyContent: {
      padding: wp(3),
    },
    emptyPanelBlock: {
      paddingVertical: hp(4),
      alignItems: 'center',
    },
    activityItemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: wp(3),
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingVertical: hp(1.2),
    },
    activityIconBox: {
      width: wp(8.5),
      height: wp(8.5),
      borderRadius: wp(2),
      borderWidth: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    activityIconSymbolText: {
      fontSize: fs(3.5),
    },
    activityContentMainDetails: {
      flex: 1,
    },
    activityDescriptionPrimaryText: {
      color: colors.text,
      fontSize: fs(3.2),
      lineHeight: fs(4.5),
    },
    activityMetadataSubLine: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: hp(0.4),
    },
    activityUserTextLabel: {
      color: colors.textDark,
      fontSize: fs(2.8),
    },
    metaSplitDot: {
      color: colors.textDark,
      marginHorizontal: wp(1),
    },
    activityTimeTextLabel: {
      color: colors.textSecondary,
      fontSize: fs(2.8),
    },
    followupItemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: hp(1.2),
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: wp(3),
    },
    calendarDateBlockBox: {
      width: wp(10),
      height: wp(10),
      borderRadius: wp(2),
      backgroundColor: colors.barTrack,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    calendarMonthAbbrText: {
      fontSize: fs(2),
      fontWeight: '700',
      color: colors.textSecondary,
      textTransform: 'uppercase',
    },
    calendarDayNumberText: {
      fontSize: fs(3.8),
      fontWeight: '900',
      color: colors.text,
      lineHeight: fs(4),
      marginTop: hp(0.1),
    },
    followupContentGroup: {
      flex: 1,
    },
    followupContactNameText: {
      color: colors.text,
      fontSize: fs(3.5),
      fontWeight: '600',
    },
    followupTaskDetailsSubtitle: {
      color: colors.textDark,
      fontSize: fs(3),
      marginTop: hp(0.25),
    },
    priorityPillLabel: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: wp(2),
      paddingVertical: hp(0.5),
      borderRadius: wp(1.5),
      borderWidth: 1,
      gap: wp(1.2),
    },
    priorityStatusDotIndicator: {
      width: wp(1.2),
      height: wp(1.2),
      borderRadius: wp(0.6),
    },
    priorityPillLabelText: {
      fontSize: fs(2.5),
      fontWeight: '700',
    },
    footerNoteContainer: {
      paddingVertical: hp(1.2),
      alignItems: 'center',
    },
    footerTrackingText: {
      color: colors.textDark,
      fontSize: fs(2.8),
    },
  });
}

export default function CRMDashboard() {
  const { uiTheme } = useTheme();
  const isDark = (uiTheme?.theme as string) === 'dark' || (uiTheme?.theme as string) === 'metallic-elite';
  const colors = useMemo(() => buildColors(uiTheme, isDark), [uiTheme, isDark]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<'activity' | 'followups'>('activity');

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiFetch('/api/crm-dashboard')
      .then((res: any) => setData(res))
      .catch((err: any) => setError(err?.message || 'Unable to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  const monthlyDeals = useMemo(() => data?.monthlyDeals || [], [data]);
  const conversionStages = useMemo(() => data?.conversionStages || [], [data]);
  const recentActivities = useMemo(() => data?.recentActivities || [], [data]);
  const upcomingFollowups = useMemo(() => data?.upcomingFollowups || [], [data]);
  const metrics = data?.metrics || {};

  const maxDeals = Math.max(...monthlyDeals.map((d: any) => d.deals || 0), 1);

  return (
    <SafeAreaView style={s(styles.rootContainer)}>
      <View style={s(styles.topAccentBar)} />

      <ScrollView contentContainerStyle={s(styles.scrollLayout)} showsVerticalScrollIndicator={false}>
        
        <View style={s(styles.headerRow)}>
          <View style={s(styles.headerTitleGroup)}>
            <View style={s(styles.headerIconContainer)}>
              <Text style={s(styles.headerIconText)}>📊</Text>
            </View>
            <View>
              <Text style={s(styles.headerMainTitle)}>CRM Dashboard</Text>
              <Text style={s(styles.headerSubtitle)}>Pipeline health & follow-ups summary</Text>
            </View>
          </View>
          
          <View style={s(styles.statusBadge)}>
            <View style={s([styles.statusDot, { backgroundColor: loading ? colors.statusSync : colors.statusLive }])} />
            <Text style={s(styles.statusBadgeText)}>
              {loading ? 'Syncing…' : 'Live'}
            </Text>
          </View>
        </View>

        {error && (
          <View style={s(styles.errorContainer)}>
            <Text style={s(styles.errorIcon)}>⚠</Text>
            <Text style={s(styles.errorText)}>{error}</Text>
          </View>
        )}

        {loading && (
          <View style={s(styles.loaderContainer)}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={s(styles.loaderText)}>Loading dashboard intelligence...</Text>
          </View>
        )}

        {!loading && data && (
          <>
            <View style={s(styles.statsFlexGrid)}>
              {STAT_CARD_CONFIG.map((card) => {
                const raw = metrics[card.key] ?? 0;
                const isCurrency = card.key === 'pipelineValue' || card.key === 'revenue';
                return (
                  <View
                    key={card.key}
                    style={s([
                      styles.statCardItem,
                      { borderColor: card.border },
                      card.wide ? styles.statCardItemWide : styles.statCardItemHalf
                    ])}
                  >
                    <View style={s(styles.statCardHeader)}>
                      <View style={s([styles.statIconFrame, { backgroundColor: card.bg, borderColor: card.border }])}>
                        <Text style={s(styles.statIcon)}>{card.icon}</Text>
                      </View>
                      <View style={s(styles.pulseDot)} />
                    </View>
                    
                    {isCurrency ? (
                      <Text style={s([styles.statValueText, { color: card.color }])}>
                        {formatCurrency(raw)}
                      </Text>
                    ) : (
                      <CountUp target={raw} style={s([styles.statValueText, { color: card.color }])} />
                    )}
                    
                    <Text style={s(styles.statLabelText)}>{card.label}</Text>
                  </View>
                );
              })}
            </View>

            <View style={s(styles.chartBlockCard)}>
              <View style={s(styles.chartHeaderRow)}>
                <View>
                  <Text style={s(styles.blockCardTitle)}>Monthly Deals</Text>
                  <Text style={s(styles.blockCardSubtitle)}>Closed & expected deal volume</Text>
                </View>
                <View style={s(styles.countPillBadge)}>
                  <Text style={s(styles.countPillText)}>{monthlyDeals.length} Months</Text>
                </View>
              </View>

              {monthlyDeals.length === 0 ? (
                <View style={s(styles.emptyChartState)}><Text style={s(styles.emptyStateText)}>No chart telemetry available</Text></View>
              ) : (
                <View style={s(styles.barsContainer)}>
                  {monthlyDeals.map((item: any, i: number) => {
                    const pct = Math.max((item.deals || 0) / maxDeals * 100, 4);
                    const isMax = item.deals === maxDeals;
                    return (
                      <View key={i} style={s(styles.barColumnWrapper)}>
                        <Text style={s([styles.barValueLabel, isMax && styles.primaryHighlightText])}>
                          {item.deals || 0}
                        </Text>
                        <View style={s(styles.barTrackContainer)}>
                          <View style={s([styles.barFilling, { height: `${pct}%`, backgroundColor: isMax ? colors.primary : colors.barFillDefault }])} />
                        </View>
                        <Text style={s(styles.barAxisLabel)}>{item.month}</Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            <View style={s(styles.chartBlockCard)}>
              <Text style={s(styles.blockCardTitle)}>Conversion Stages</Text>
              <Text style={s(styles.blockCardSubtitle)}>Stage-by-stage pipeline distribution</Text>

              {conversionStages.length === 0 ? (
                <View style={s(styles.emptyChartState)}><Text style={s(styles.emptyStateText)}>No conversion distribution data</Text></View>
              ) : (
                <View style={s(styles.stagesBlockSpace)}>
                  <View style={s(styles.stageRowsContainer)}>
                    {conversionStages.map((stage: any) => {
                      const cfg = STAGE_CONFIG[stage.stage] || { barColors: [colors.barFillDefault, colors.barFillDefault], text: colors.textSecondary };
                      return (
                        <View key={stage.stage} style={s(styles.stageHorizontalRow)}>
                          <View style={s(styles.stageLabelWidth)}>
                            <Text style={s([styles.stageNameText, { color: cfg.text }])}>{stage.stage}</Text>
                          </View>
                          
                          <View style={s(styles.stageProgressTrack)}>
                            <View style={s([styles.stageProgressFill, { width: `${Math.max(stage.percent, 5)}%`, backgroundColor: cfg.barColors[0] }])}>
                              <Text style={s(styles.stageCountInsideBar)}>{stage.count}</Text>
                            </View>
                          </View>
                          
                          <View style={s(styles.stagePercentWidth)}>
                            <Text style={s(styles.stagePercentText)}>{stage.percent}%</Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>

                  {conversionStages.length > 1 && (
                    <View style={s(styles.svgTrendContainer)}>
                      <Text style={s(styles.svgLabelTitle)}>TELEMETRY TREND</Text>
                      <Svg viewBox="0 0 500 80" style={s(styles.svgLineGraph)}>
                        <Defs>
                          <LinearGradient id="trendGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                            <Stop offset="0%" stopColor="#38bdf8" stopOpacity={0.3} />
                            <Stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
                          </LinearGradient>
                        </Defs>
                        
                        <Polygon
                          points={`0,80 ${conversionStages.map((s: any, i: number) => {
                            const x = (i / (conversionStages.length - 1)) * 500;
                            const y = 80 - (s.percent / 100) * 80;
                            return `${x},${y}`;
                          }).join(' ')} 500,80`}
                          fill="url(#trendGrad)"
                        />
                        
                        <Polyline
                          points={conversionStages.map((s: any, i: number) => {
                            const x = (i / (conversionStages.length - 1)) * 500;
                            const y = 80 - (s.percent / 100) * 80;
                            return `${x},${y}`;
                          }).join(' ')}
                          fill="none"
                          stroke="#38bdf8"
                          strokeWidth="3"
                        />
                        
                        {conversionStages.map((s: any, i: number) => {
                          const x = (i / (conversionStages.length - 1)) * 500;
                          const y = 80 - (s.percent / 100) * 80;
                          return (
                            <Circle key={s.stage} cx={x} cy={y} r="5" fill="#171717" stroke="#38bdf8" strokeWidth="2" />
                          );
                        })}
                      </Svg>
                    </View>
                  )}
                </View>
              )}
            </View>

            <View style={s(styles.tabPanelCardContainer)}>
              <View style={s(styles.tabsHeaderTrack)}>
                <TouchableOpacity
                  onPress={() => setActivePanel('activity')}
                  style={s([styles.tabButtonElement, activePanel === 'activity' && styles.activeTabButtonElement])}
                >
                  <Text style={s([styles.tabButtonLabelText, activePanel === 'activity' && styles.activeTabButtonLabelText])}>
                    Recent Activity ({recentActivities.length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setActivePanel('followups')}
                  style={s([styles.tabButtonElement, activePanel === 'followups' && styles.activeTabButtonElement])}
                >
                  <Text style={s([styles.tabButtonLabelText, activePanel === 'followups' && styles.activeTabButtonLabelText])}>
                    Follow-ups ({upcomingFollowups.length})
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={s(styles.tabbedPanelBodyContent)}>
                {activePanel === 'activity' ? (
                  recentActivities.length === 0 ? (
                    <View style={s(styles.emptyPanelBlock)}><Text style={s(styles.emptyStateText)}>No recent activity items</Text></View>
                  ) : (
                    recentActivities.map((item: any) => {
                      const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.communication;
                      return (
                        <View key={item.id} style={s(styles.activityItemRow)}>
                          <View style={s([styles.activityIconBox, { backgroundColor: cfg.bg, borderColor: cfg.border }])}>
                            <Text style={s(styles.activityIconSymbolText)}>{cfg.icon}</Text>
                          </View>
                          <View style={s(styles.activityContentMainDetails)}>
                            <Text style={s(styles.activityDescriptionPrimaryText)}>{item.text}</Text>
                            <View style={s(styles.activityMetadataSubLine)}>
                              <Text style={s(styles.activityUserTextLabel)}>{item.user}</Text>
                              {item.time && <Text style={s(styles.metaSplitDot)}>·</Text>}
                              {item.time && <Text style={s(styles.activityTimeTextLabel)}>{item.time}</Text>}
                            </View>
                          </View>
                        </View>
                      );
                    })
                  )
                ) : (
                  upcomingFollowups.length === 0 ? (
                    <View style={s(styles.emptyPanelBlock)}><Text style={s(styles.emptyStateText)}>No upcoming tasks scheduled</Text></View>
                  ) : (
                    upcomingFollowups.map((item: any) => {
                      const pCfg = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG.Low;
                      const [month, day] = item.date ? item.date.split(' ') : ['', ''];
                      return (
                        <View key={item.id} style={s(styles.followupItemRow)}>
                          <View style={s(styles.calendarDateBlockBox)}>
                            <Text style={s(styles.calendarMonthAbbrText)}>{month}</Text>
                            <Text style={s(styles.calendarDayNumberText)}>{day}</Text>
                          </View>
                          
                          <View style={s(styles.followupContentGroup)}>
                            <Text style={s(styles.followupContactNameText)}>{item.contact}</Text>
                            {item.task && <Text style={s(styles.followupTaskDetailsSubtitle)}>{item.task}</Text>}
                          </View>

                          <View style={s([styles.priorityPillLabel, { backgroundColor: pCfg.bg, borderColor: pCfg.border }])}>
                            <View style={s([styles.priorityStatusDotIndicator, { backgroundColor: pCfg.dot }])} />
                            <Text style={s([styles.priorityPillLabelText, { color: pCfg.text }])}>{item.priority}</Text>
                          </View>
                        </View>
                      );
                    })
                  )
                )}
              </View>
            </View>

            <View style={s(styles.footerNoteContainer)}>
              <Text style={s(styles.footerTrackingText)}>CRM Dashboard · Data updates dynamically on layout load</Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}