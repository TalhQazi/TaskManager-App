import React, { useState, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  SafeAreaView
} from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Polygon, Polyline, Circle } from 'react-native-svg';
import { apiFetch } from '@/lib/admin/apiClient';

const { width } = Dimensions.get('window');

// Converted styling classes to hex/rgba configurations for native style compilation
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
  communication: { icon: 'rgba(139, 92, 246, 0.1)', bg: 'rgba(139, 92, 246, 0.1)',  text: '#a78bfa', border: 'rgba(139, 92, 246, 0.2)' },
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

// Pure Native Frame Animation Implementation for numerical increments
function CountUp({ target, duration = 1000, style }: { target: number; duration?: number; style?: any }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!target) return;
    let startTimestamp: number | null = null;
    let animationFrameId: number;

    const tick = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // Cubic Out Easing
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

export default function CRMDashboard() {
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
    <SafeAreaView style={styles.rootContainer}>
      {/* Top Accent Indicator */}
      <View style={styles.topAccentBar} />

      <ScrollView contentContainerStyle={styles.scrollLayout} showsVerticalScrollIndicator={false}>
        
        {/* ── Header ── */}
        <View style={styles.headerRow}>
          <View style={styles.headerTitleGroup}>
            <View style={styles.headerIconContainer}>
              <Text style={styles.headerIconText}>📊</Text>
            </View>
            <View>
              <Text style={styles.headerMainTitle}>CRM Dashboard</Text>
              <Text style={styles.headerSubtitle}>Pipeline health & follow-ups summary</Text>
            </View>
          </View>
          
          <View style={styles.statusBadge}>
            <View style={[styles.statusDot, { backgroundColor: loading ? '#f59e0b' : '#10b981' }]} />
            <Text style={styles.statusBadgeText}>
              {loading ? 'Syncing…' : 'Live'}
            </Text>
          </View>
        </View>

        {/* ── Error Notification ── */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>⚠</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* ── Loading Skeleton Indicator ── */}
        {loading && (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#38bdf8" />
            <Text style={styles.loaderText}>Loading dashboard intelligence...</Text>
          </View>
        )}

        {!loading && data && (
          <>
            {/* ── Stat Cards Block (Grid Equivalent) ── */}
            <View style={styles.statsFlexGrid}>
              {STAT_CARD_CONFIG.map((card) => {
                const raw = metrics[card.key] ?? 0;
                const isCurrency = card.key === 'pipelineValue' || card.key === 'revenue';
                return (
                  <View
                    key={card.key}
                    style={[
                      styles.statCardItem,
                      { borderColor: card.border },
                      card.wide ? styles.statCardItemWide : styles.statCardItemHalf
                    ]}
                  >
                    <View style={styles.statCardHeader}>
                      <View style={[styles.statIconFrame, { backgroundColor: card.bg, borderColor: card.border }]}>
                        <Text style={styles.statIcon}>{card.icon}</Text>
                      </View>
                      <View style={styles.pulseDot} />
                    </View>
                    
                    {isCurrency ? (
                      <Text style={[styles.statValueText, { color: card.color }]}>
                        {formatCurrency(raw)}
                      </Text>
                    ) : (
                      <CountUp target={raw} style={[styles.statValueText, { color: card.color }]} />
                    )}
                    
                    <Text style={styles.statLabelText}>{card.label}</Text>
                  </View>
                );
              })}
            </View>

            {/* ── Monthly Deals Bar Chart Container ── */}
            <View style={styles.chartBlockCard}>
              <View style={styles.chartHeaderRow}>
                <View>
                  <Text style={styles.blockCardTitle}>Monthly Deals</Text>
                  <Text style={styles.blockCardSubtitle}>Closed & expected deal volume</Text>
                </View>
                <View style={styles.countPillBadge}>
                  <Text style={styles.countPillText}>{monthlyDeals.length} Months</Text>
                </View>
              </View>

              {monthlyDeals.length === 0 ? (
                <View style={styles.emptyChartState}><Text style={styles.emptyStateText}>No chart telemetry available</Text></View>
              ) : (
                <View style={styles.barsContainer}>
                  {monthlyDeals.map((item: any, i: number) => {
                    const pct = Math.max((item.deals || 0) / maxDeals * 100, 4);
                    const isMax = item.deals === maxDeals;
                    return (
                      <View key={i} style={styles.barColumnWrapper}>
                        <Text style={[styles.barValueLabel, isMax && styles.primaryHighlightText]}>
                          {item.deals || 0}
                        </Text>
                        <View style={styles.barTrackContainer}>
                          <View style={[styles.barFilling, { height: `${pct}%`, backgroundColor: isMax ? '#0ea5e9' : '#404040' }]} />
                        </View>
                        <Text style={styles.barAxisLabel}>{item.month}</Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            {/* ── Conversion Stages Card (React Native SVG Graph Integration) ── */}
            <View style={styles.chartBlockCard}>
              <Text style={styles.blockCardTitle}>Conversion Stages</Text>
              <Text style={styles.blockCardSubtitle}>Stage-by-stage pipeline distribution</Text>

              {conversionStages.length === 0 ? (
                <View style={styles.emptyChartState}><Text style={styles.emptyStateText}>No conversion distribution data</Text></View>
              ) : (
                <View style={styles.stagesBlockSpace}>
                  <View style={styles.stageRowsContainer}>
                    {conversionStages.map((stage: any) => {
                      const cfg = STAGE_CONFIG[stage.stage] || { barColors: ['#404040', '#525252'], text: '#94a3b8' };
                      return (
                        <View key={stage.stage} style={styles.stageHorizontalRow}>
                          <View style={styles.stageLabelWidth}>
                            <Text style={[styles.stageNameText, { color: cfg.text }]}>{stage.stage}</Text>
                          </View>
                          
                          <View style={styles.stageProgressTrack}>
                            <View style={[styles.stageProgressFill, { width: `${Math.max(stage.percent, 5)}%`, backgroundColor: cfg.barColors[0] }]}>
                              <Text style={styles.stageCountInsideBar}>{stage.count}</Text>
                            </View>
                          </View>
                          
                          <View style={styles.stagePercentWidth}>
                            <Text style={styles.stagePercentText}>{stage.percent}%</Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>

                  {/* SVG Trend Graph conversion running natively using react-native-svg lines */}
                  {conversionStages.length > 1 && (
                    <View style={styles.svgTrendContainer}>
                      <Text style={styles.svgLabelTitle}>TELEMETRY TREND</Text>
                      <Svg viewBox="0 0 500 80" style={styles.svgLineGraph}>
                        <Defs>
                          <LinearGradient id="trendGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                            <Stop offset="0%" stopColor="#38bdf8" stopOpacity={0.3} />
                            <Stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
                          </LinearGradient>
                        </Defs>
                        
                        {/* Area Polygon */}
                        <Polygon
                          points={`0,80 ${conversionStages.map((s: any, i: number) => {
                            const x = (i / (conversionStages.length - 1)) * 500;
                            const y = 80 - (s.percent / 100) * 80;
                            return `${x},${y}`;
                          }).join(' ')} 500,80`}
                          fill="url(#trendGrad)"
                        />
                        
                        {/* Stroke Line */}
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
                        
                        {/* Node Dots */}
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

            {/* ── Tabbed View Section (Recent Activity / Follow-ups) ── */}
            <View style={styles.tabPanelCardContainer}>
              <View style={styles.tabsHeaderTrack}>
                <TouchableOpacity
                  onPress={() => setActivePanel('activity')}
                  style={[styles.tabButtonElement, activePanel === 'activity' && styles.activeTabButtonElement]}
                >
                  <Text style={[styles.tabButtonLabelText, activePanel === 'activity' && styles.activeTabButtonLabelText]}>
                    Recent Activity ({recentActivities.length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setActivePanel('followups')}
                  style={[styles.tabButtonElement, activePanel === 'followups' && styles.activeTabButtonElement]}
                >
                  <Text style={[styles.tabButtonLabelText, activePanel === 'followups' && styles.activeTabButtonLabelText]}>
                    Follow-ups ({upcomingFollowups.length})
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Panel Renderer Content */}
              <View style={styles.tabbedPanelBodyContent}>
                {activePanel === 'activity' ? (
                  recentActivities.length === 0 ? (
                    <View style={styles.emptyPanelBlock}><Text style={styles.emptyStateText}>No recent activity items</Text></View>
                  ) : (
                    recentActivities.map((item: any) => {
                      const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.communication;
                      return (
                        <View key={item.id} style={styles.activityItemRow}>
                          <View style={[styles.activityIconBox, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
                            <Text style={styles.activityIconSymbolText}>{cfg.icon}</Text>
                          </View>
                          <View style={styles.activityContentMainDetails}>
                            <Text style={styles.activityDescriptionPrimaryText}>{item.text}</Text>
                            <View style={styles.activityMetadataSubLine}>
                              <Text style={styles.activityUserTextLabel}>{item.user}</Text>
                              {item.time && <Text style={styles.metaSplitDot}>·</Text>}
                              {item.time && <Text style={styles.activityTimeTextLabel}>{item.time}</Text>}
                            </View>
                          </View>
                        </View>
                      );
                    })
                  )
                ) : (
                  upcomingFollowups.length === 0 ? (
                    <View style={styles.emptyPanelBlock}><Text style={styles.emptyStateText}>No upcoming tasks scheduled</Text></View>
                  ) : (
                    upcomingFollowups.map((item: any) => {
                      const pCfg = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG.Low;
                      const [month, day] = item.date ? item.date.split(' ') : ['', ''];
                      return (
                        <View key={item.id} style={styles.followupItemRow}>
                          <View style={styles.calendarDateBlockBox}>
                            <Text style={styles.calendarMonthAbbrText}>{month}</Text>
                            <Text style={styles.calendarDayNumberText}>{day}</Text>
                          </View>
                          
                          <View style={styles.followupContentGroup}>
                            <Text style={styles.followupContactNameText}>{item.contact}</Text>
                            {item.task && <Text style={styles.followupTaskDetailsSubtitle}>{item.task}</Text>}
                          </View>

                          <View style={[styles.priorityPillLabel, { backgroundColor: pCfg.bg, borderColor: pCfg.border }]}>
                            <View style={[styles.priorityStatusDotIndicator, { backgroundColor: pCfg.dot }]} />
                            <Text style={[styles.priorityPillLabelText, { color: pCfg.text }]}>{item.priority}</Text>
                          </View>
                        </View>
                      );
                    })
                  )
                )}
              </View>
            </View>

            {/* ── Footer Metadata View Legibility Block ── */}
            <View style={styles.footerNoteContainer}>
              <Text style={styles.footerTrackingText}>CRM Dashboard · Data updates dynamically on layout load</Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#0f1117',
  },
  topAccentBar: {
    height: 3,
    backgroundColor: '#38bdf8',
    width: '100%',
  },
  scrollLayout: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIconText: {
    fontSize: 20,
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
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusBadgeText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 10,
  },
  errorIcon: {
    color: '#f87171',
    fontSize: 16,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 13,
    flex: 1,
  },
  loaderContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  loaderText: {
    color: '#64748b',
    fontSize: 13,
  },
  statsFlexGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 20,
  },
  statCardItem: {
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  statCardItemHalf: {
    width: (width - 44) / 2,
  },
  statCardItemWide: {
    width: '100%',
  },
  statCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statIconFrame: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 16,
  },
  pulseDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#10b981',
  },
  statValueText: {
    fontSize: 24,
    fontWeight: '800',
  },
  statLabelText: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  chartBlockCard: {
    backgroundColor: '#171717',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  chartHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  blockCardTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  blockCardSubtitle: {
    color: '#737373',
    fontSize: 12,
    marginTop: 2,
  },
  countPillBadge: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  countPillText: {
    color: '#a3a3a3',
    fontSize: 11,
    fontWeight: '500',
  },
  emptyChartState: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#525252',
    fontSize: 13,
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'end',
    justifyContent: 'space-between',
    height: 130,
    paddingTop: 10,
  },
  barColumnWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  barValueLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#525252',
    marginBottom: 4,
  },
  primaryHighlightText: {
    color: '#38bdf8',
  },
  barTrackContainer: {
    height: 80,
    width: 14,
    backgroundColor: '#262626',
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFilling: {
    width: '100%',
    borderRadius: 4,
  },
  barAxisLabel: {
    fontSize: 9,
    color: '#737373',
    marginTop: 6,
    textTransform: 'uppercase',
  },
  stagesBlockSpace: {
    gap: 16,
    marginTop: 14,
  },
  stageRowsContainer: {
    gap: 10,
  },
  stageHorizontalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stageLabelWidth: {
    width: 75,
  },
  stageNameText: {
    fontSize: 12,
    fontWeight: '600',
  },
  stageProgressTrack: {
    flex: 1,
    height: 20,
    backgroundColor: '#262626',
    borderRadius: 6,
    overflow: 'hidden',
  },
  stageProgressFill: {
    height: '100%',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 6,
  },
  stageCountInsideBar: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '700',
  },
  stagePercentWidth: {
    width: 32,
    alignItems: 'flex-end',
  },
  stagePercentText: {
    color: '#737373',
    fontSize: 11,
    fontWeight: '700',
  },
  svgTrendContainer: {
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#262626',
  },
  svgLabelTitle: {
    fontSize: 9,
    fontWeight: '700',
    color: '#404040',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  svgLineGraph: {
    width: '100%',
    height: 60,
  },
  tabPanelCardContainer: {
    backgroundColor: '#171717',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
  },
  tabsHeaderTrack: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#262626',
  },
  tabButtonElement: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  activeTabButtonElement: {
    backgroundColor: 'rgba(56, 189, 248, 0.04)',
    borderBottomWidth: 2,
    borderBottomColor: '#0ea5e9',
  },
  tabButtonLabelText: {
    color: '#737373',
    fontSize: 13,
    fontWeight: '600',
  },
  activeTabButtonLabelText: {
    color: '#ffffff',
  },
  tabbedPanelBodyContent: {
    padding: 12,
  },
  emptyPanelBlock: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  activityItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingall: 10,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
    paddingVertical: 10,
  },
  activityIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityIconSymbolText: {
    fontSize: 14,
  },
  activityContentMainDetails: {
    flex: 1,
  },
  activityDescriptionPrimaryText: {
    color: '#e5e5e5',
    fontSize: 13,
    lineHeight: 18,
  },
  activityMetadataSubLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  activityUserTextLabel: {
    color: '#737373',
    fontSize: 11,
  },
  metaSplitDot: {
    color: '#404040',
    marginHorizontal: 4,
  },
  activityTimeTextLabel: {
    color: '#525252',
    fontSize: 11,
  },
  followupItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
    gap: 12,
  },
  calendarDateBlockBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#262626',
    borderWidth: 1,
    borderColor: '#404040',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarMonthAbbrText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#a3a3a3',
    textTransform: 'uppercase',
  },
  calendarDayNumberText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#ffffff',
    lineHeight: 16,
    marginTop: 1,
  },
  followupContentGroup: {
    flex: 1,
  },
  followupContactNameText: {
    color: '#e5e5e5',
    fontSize: 14,
    fontWeight: '600',
  },
  followupTaskDetailsSubtitle: {
    color: '#737373',
    fontSize: 12,
    marginTop: 2,
  },
  priorityPillLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    gap: 5,
  },
  priorityStatusDotIndicator: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  priorityPillLabelText: {
    fontSize: 10,
    fontWeight: '700',
  },
  footerNoteContainer: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  footerTrackingText: {
    color: '#404040',
    fontSize: 11,
  },
});