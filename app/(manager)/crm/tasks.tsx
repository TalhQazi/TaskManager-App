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
import Colors from '@/constants/colors';

const { height: WINDOW_HEIGHT } = Dimensions.get('window');

/* ── Constants ───────────────────────────────────────────────────── */
const TYPE_OPTIONS     = ['All', 'Follow-up Call', 'Meeting', 'Reminder'];
const PRIORITY_OPTIONS = ['All', 'Low', 'Medium', 'High', 'Urgent'];

const TYPE_CONFIG: Record<string, { bg: string; text: string; border: string; dot: string; icon: string }> = {
  'Follow-up Call': { bg: '#f0f2ff', text: '#4338ca', border: '#c7d2fe', dot: '#6366f1', icon: '📞' },
  'Meeting':        { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0', dot: '#10b981', icon: '🤝' },
  'Reminder':       { bg: '#f5f3ff', text: '#6d28d9', border: '#ddd6fe', dot: '#8b5cf6', icon: '🔔' },
  'Other':          { bg: '#f9fafb', text: '#4b5563', border: '#e5e7eb', dot: '#9ca3af', icon: '📋' },
};

const PRIORITY_CONFIG: Record<string, { bg: string; text: string; border: string; dot: string; bar: string }> = {
  Low:    { bg: '#f8fafc', text: '#475569', border: '#e2e8f0', dot: '#94a3b8', bar: '#cbd5e1' },
  Medium: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe', dot: '#3b82f6', bar: '#60a5fa' },
  High:   { bg: '#fffbeb', text: '#b45309', border: '#fde68a', dot: '#f59e0b', bar: '#fbbf24' },
  Urgent: { bg: '#fef2f2', text: '#b91c1c', border: '#fee2e2', dot: '#ef4444', bar: '#ef4444' },
};

/* ── Helpers ─────────────────────────────────────────────────────── */
const getTypeConfig     = (t: string) => TYPE_CONFIG[t] || TYPE_CONFIG['Other'];
const getPriorityConfig = (p: string) => PRIORITY_CONFIG[p] || PRIORITY_CONFIG['Low'];

const formatDate = (dateStr: string) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const isOverdue = (dateStr: string, status: string) => {
  if (status === 'Completed' || !dateStr) return false;
  return new Date(dateStr) < new Date(new Date().toDateString());
};

/* ── Shared UI Subcomponents ─────────────────────────────────────── */
function TypeBadge({ type }: { type: string }) {
  const cfg = getTypeConfig(type);
  return (
    <View style={[styles.badgeFrame, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
      <Text style={styles.badgeIconText}>{cfg.icon}</Text>
      <Text style={[styles.badgeLabelText, { color: cfg.text }]}>{type || 'Other'}</Text>
    </View>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const cfg = getPriorityConfig(priority);
  return (
    <View style={[styles.badgeFrame, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
      <View style={[styles.badgeIndicatorDot, { backgroundColor: cfg.dot }]} />
      <Text style={[styles.badgeLabelText, { color: cfg.text }]}>{priority || '—'}</Text>
    </View>
  );
}

function DueDate({ dateStr, status }: { dateStr: string; status: string }) {
  const overdue = isOverdue(dateStr, status);
  return (
    <View style={styles.dueDateWrapperInlineRow}>
      <Text style={[styles.dueDateLabelStringText, overdue ? styles.textColorOverdueRed : styles.textColorNormalGray]}>
        {overdue ? '⚠ ' : ''}{formatDate(dateStr)}
      </Text>
      {overdue && (
        <View style={styles.overdueAlertInlinePill}>
          <Text style={styles.overdueAlertInlinePillText}>Overdue</Text>
        </View>
      )}
    </View>
  );
}

/* ── Main Component Export ───────────────────────────────────────── */
export default function CRMTasks() {
  const [tasks, setTasks]                   = useState<any[]>([]);
  const [searchQuery, setSearchQuery]       = useState('');
  const [typeFilter, setTypeFilter]         = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [selectedTask, setSelectedTask]     = useState<any>(null);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState<string | null>(null);

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
    <SafeAreaView style={styles.appSafeAreaViewContainerBackground}>
      
      {/* Page Header Area */}
      <View style={styles.headerPanelSectionRow}>
        <View style={styles.headerLeftMetaStack}>
          <View style={styles.headerTitleAndAlertIndicatorRow}>
            <Text style={styles.headerPrimaryHeadlineTextText}>Tasks</Text>
            {overdueCount > 0 ? (
              <View style={styles.headerOverdueCounterBadgePill}>
                <Text style={styles.headerOverdueCounterBadgePillTextString}>⚠ {overdueCount} overdue</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.headerSecondarySubheadlineTextString}>Browse CRM task assignments and work.</Text>
        </View>
        <View style={styles.readOnlyFloatingStatusBadgeFrame}>
          <View style={styles.readOnlyStatusIndicatorPulseDot} />
          <Text style={styles.readOnlyStatusIndicatorLabelTextString}>Read-only</Text>
        </View>
      </View>

      {/* Control Widgets Panel Wrapper (Search Input + Horizontal Chips Scroller) */}
      <View style={styles.filterWidgetCardWrapperBox}>
        {/* Search Field Group */}
        <View style={styles.searchBarBoxInputFrame}>
          <Text style={styles.searchBarMagnifierIconGlyph}>🔍</Text>
          <TextInput
            placeholder="Search by title, assignee, or linked entity…"
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchBarInputElementTextNode}
            autoCapitalize="none"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.searchFieldClearButtonHitbox}>
              <Text style={styles.searchFieldClearButtonHitboxTextChar}>×</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Type Category Selection Track */}
        <View style={styles.scrollCategoryAxisTrackContainerRow}>
          <Text style={styles.scrollCategoryAxisTrackInlineLabelText}>Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScrollTrackContainerGapPadding}>
            {TYPE_OPTIONS.map((type) => {
              const active = typeFilter === type;
              const cfg = getTypeConfig(type);
              
              let chipBg = '#ffffff';
              let chipBorderColor = '#e5e7eb';
              let chipTextColor = '#6b7280';

              if (active) {
                if (type === 'All') {
                  chipBg = '#4f46e5';
                  chipBorderColor = '#4f46e5';
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
                  style={[styles.filterSelectionButtonChipFrame, { backgroundColor: chipBg, borderColor: chipBorderColor }]}
                >
                  {type !== 'All' && <Text style={styles.chipEmbeddedIconEmoji}>{cfg.icon}</Text>}
                  <Text style={[styles.filterSelectionButtonChipLabelTextString, { color: chipTextColor, fontWeight: active ? '700' : '600' }]}>
                    {type} {typeCounts[type] !== undefined ? `(${typeCounts[type] || 0})` : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Priority Level Selection Track */}
        <View style={styles.scrollCategoryAxisTrackContainerRow}>
          <Text style={styles.scrollCategoryAxisTrackInlineLabelText}>Priority</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScrollTrackContainerGapPadding}>
            {PRIORITY_OPTIONS.map((p) => {
              const active = priorityFilter === p;
              const cfg = getPriorityConfig(p);

              let chipBg = '#ffffff';
              let chipBorderColor = '#e5e7eb';
              let chipTextColor = '#6b7280';

              if (active) {
                if (p === 'All') {
                  chipBg = '#4f46e5';
                  chipBorderColor = '#4f46e5';
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
                  style={[styles.filterSelectionButtonChipFrame, { backgroundColor: chipBg, borderColor: chipBorderColor }]}
                >
                  {p !== 'All' && active && <View style={[styles.chipEmbeddedColorIndicatorDot, { backgroundColor: cfg.dot }]} />}
                  <Text style={[styles.filterSelectionButtonChipLabelTextString, { color: chipTextColor, fontWeight: active ? '700' : '600' }]}>
                    {p} {priorityCounts[p] !== undefined ? `(${priorityCounts[p] || 0})` : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>

      {/* Dynamic Activity Layers Rendering Context */}
      {loading && (
        <View style={styles.centralizedStateFeedbackLayoutContainerBox}>
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text style={styles.centralizedStateFeedbackLayoutContainerDescriptionString}>Loading tasks…</Text>
        </View>
      )}

      {!loading && error && (
        <View style={styles.centralizedStateFeedbackLayoutContainerBox}>
          <Text style={styles.errorTextPromptLabel}>{error}</Text>
          <TouchableOpacity onPress={fetchTasks} style={styles.errorActionRetryTriggerButtonFrame}>
            <Text style={styles.errorActionRetryTriggerButtonTextLabel}>Try again</Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && !error && filteredTasks.length === 0 && (
        <View style={styles.centralizedStateFeedbackLayoutContainerBox}>
          <Text style={styles.emptyGraphicPlaceholderIconString}>📋</Text>
          <Text style={styles.emptyGraphicPlaceholderHeadlineString}>No tasks found.</Text>
        </View>
      )}

      {/* Main Core Feed List Container Scroll Axis */}
      {!loading && !error && filteredTasks.length > 0 && (
        <ScrollView contentContainerStyle={styles.verticalCardsLayoutListScrollTrack} showsVerticalScrollIndicator={false}>
          {filteredTasks.map((task) => {
            const overdue = isOverdue(task.dueDate, task.status);
            const priCfg  = getPriorityConfig(task.priority);

            let priorityPctWidth: '25%' | '50%' | '75%' | '100%' = '25%';
            if (task.priority === 'Urgent') priorityPctWidth = '100%';
            else if (task.priority === 'High') priorityPctWidth = '75%';
            else if (task.priority === 'Medium') priorityPctWidth = '50%';

            return (
              <TouchableOpacity
                key={task.id || task._id}
                activeOpacity={0.85}
                onPress={() => setSelectedTask(task)}
                style={[styles.taskItemCardContainerBox, { borderColor: overdue ? '#fca5a5' : '#e5e7eb' }]}
              >
                {/* Header Information Identification Section Segment Block */}
                <View style={styles.cardHeaderFlexRowContainerSplit}>
                  <View style={styles.cardHeaderFlexLeftGroupWithIcon}>
                    <View style={styles.cardHeaderEmbeddedStatusBoxIconFrame}>
                      <Text style={styles.cardHeaderEmbeddedStatusBoxIconEmoji}>{getTypeConfig(task.type).icon}</Text>
                    </View>
                    <View style={styles.cardHeaderHeadlineIdentityTextStack}>
                      <Text style={[styles.cardHeaderTaskHeadingHeadlineText, overdue ? styles.textColorHeadlineOverdueRed : styles.textColorHeadlineNormalBlack]} numberOfLines={2}>
                        {task.title}
                      </Text>
                      {task.assignedTo ? (
                        <Text style={styles.cardHeaderTaskAssigneeMetaStringLabel} numberOfLines={1}>
                          👤 {task.assignedTo}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  <PriorityBadge priority={task.priority} />
                </View>

                {/* Sub-Property Feature Information Tags Alignment Layout Frame */}
                <View style={styles.cardMetadataWrapContainerInlineFlowLayoutRow}>
                  <TypeBadge type={task.type} />
                  <View style={[styles.badgeFrame, { backgroundColor: overdue ? '#fef2f2' : '#f9fafb', borderColor: overdue ? '#fca5a5' : '#e5e7eb' }]}>
                    <Text style={[styles.badgeLabelText, overdue ? styles.textColorOverdueRed : styles.textColorNormalGray]}>
                      📅 {formatDate(task.dueDate)} {overdue ? '· Overdue' : ''}
                    </Text>
                  </View>
                  {task.linkedEntity ? (
                    <View style={[styles.badgeFrame, styles.maxWLinkedEntityBadgeWidthLimiter]}>
                      <Text style={styles.badgeLabelText} numberOfLines={1}>🔗 {task.linkedEntity}</Text>
                    </View>
                  ) : null}
                </View>

                {/* Simulated Linear Priority Distribution Bar Component Block */}
                <View style={styles.cardProgressBarTrackBackgroundFrame}>
                  <View style={[styles.cardProgressBarTrackFillBarNode, { backgroundColor: priCfg.bar, width: priorityPctWidth }]} />
                </View>

                {/* Footer Simulated Actions Sheet Panel Row Component Trigger */}
                <View style={styles.cardActionSimulatedFooterPanelBar}>
                  <View style={styles.cardActionSimulatedFooterPanelBarLeftIconTextRowGroup}>
                    <Text style={styles.cardActionSimulatedFooterPanelBarInteractiveLabelString}>View Details</Text>
                    <Text style={styles.cardActionSimulatedFooterPanelBarInteractiveArrowSymbol}>→</Text>
                  </View>
                </View> {/* <-- Corrected closing View tag here */}
              </TouchableOpacity>
            );
          })}
          
          <Text style={styles.aggregatedListSummaryCalculationMetaCardLabelStringText}>
            Showing {filteredTasks.length} of {tasks.length} tasks
          </Text>
        </ScrollView>
      )}

      {/* ── Native Slide Overlay Specification Profile Bottom Sheet Modal ── */}
      <Modal visible={selectedTask !== null} transparent={true} animationType="slide" onRequestClose={() => setSelectedTask(null)}>
        <TouchableOpacity style={styles.modalOverlayDimBackdropContainerMask} activeOpacity={1} onPress={() => setSelectedTask(null)}>
          {selectedTask && (
            <View style={styles.modalProfileBottomSheetCardBodyStructure} onStartShouldSetResponder={() => true}>
              
              {/* Drag Handle Cosmetic Bar Design Accent Strip */}
              <View style={styles.bottomSheetTopStructuralDragHandleBarStrip} />

              {/* Sheet Core Dynamic Title Panel Layout Segment Area */}
              <View style={[styles.sheetLayoutIdentityHeaderContainerSectionBlock, { backgroundColor: getTypeConfig(selectedTask.type).bg, borderColor: getTypeConfig(selectedTask.type).border }]}>
                <View style={styles.sheetLayoutIdentityHeaderFlexAlignmentRowWrapper}>
                  <View style={styles.sheetLayoutHeaderIdentityIconSquareBoxFrame}>
                    <Text style={styles.sheetLayoutHeaderIdentityIconSquareBoxFrameEmojiText}>{getTypeConfig(selectedTask.type).icon}</Text>
                  </View>
                  <View style={styles.sheetLayoutIdentityHeaderPropertiesStackGroup}>
                    <Text style={styles.sheetLayoutIdentityHeaderTaskNameHeadingText} numberOfLines={3}>
                      {selectedTask.title}
                    </Text>
                    <Text style={styles.sheetLayoutIdentityHeaderContextLabelSubtextString}>Task information and assignment details.</Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedTask(null)} style={styles.sheetLayoutIdentityHeaderCloseActionCircularButtonFrame}>
                    <Text style={styles.sheetLayoutIdentityHeaderCloseActionCircularButtonFrameSymbolText}>×</Text>
                  </TouchableOpacity>
                </View>

                {isOverdue(selectedTask.dueDate, selectedTask.status) ? (
                  <View style={styles.sheetLayoutHeaderOverdueWarningAlertBannerCardBlockRow}>
                    <Text style={styles.sheetLayoutHeaderOverdueWarningAlertBannerCardBlockRowLabelStringText}>⚠ This task is currently overdue</Text>
                  </View>
                ) : null}
              </View>

              {/* Scrolling Detail Fields Definition Track Structure Grid */}
              <ScrollView style={styles.sheetFieldsScrollTrackContainer} showsVerticalScrollIndicator={false}>
                <View style={styles.sheetFieldsVerticalStackSpacingLayout}>
                  
                  <View style={styles.sheetFieldsStructuralTwoColumnFlexWrapGridSystem}>
                    
                    <View style={styles.sheetFieldsTwoColumnFlexCellBlock}>
                      <Text style={styles.sheetFieldDefinitionUppercaseLabelHeadingText}>TYPE</Text>
                      <View style={styles.sheetFieldsCellContentBadgePositionerAlignWrapper}>
                        <TypeBadge type={selectedTask.type} />
                      </View>
                    </View>

                    <View style={styles.sheetFieldsTwoColumnFlexCellBlock}>
                      <Text style={styles.sheetFieldDefinitionUppercaseLabelHeadingText}>PRIORITY</Text>
                      <View style={styles.sheetFieldsCellContentBadgePositionerAlignWrapper}>
                        <PriorityBadge priority={selectedTask.priority} />
                      </View>
                    </View>

                    <View style={styles.sheetFieldsTwoColumnFlexCellBlock}>
                      <Text style={styles.sheetFieldDefinitionUppercaseLabelHeadingText}>ASSIGNED TO</Text>
                      <Text style={styles.sheetFieldsCellContentPrimaryNormalDataStringText}>{selectedTask.assignedTo || 'Unassigned'}</Text>
                    </View>

                    <View style={styles.sheetFieldsTwoColumnFlexCellBlock}>
                      <Text style={styles.sheetFieldDefinitionUppercaseLabelHeadingText}>STATUS</Text>
                      <Text style={styles.sheetFieldsCellContentPrimaryNormalDataStringText}>{selectedTask.status || '—'}</Text>
                    </View>

                    <View style={styles.sheetFieldsFullWidthColumnFlexCellBlock}>
                      <Text style={styles.sheetFieldDefinitionUppercaseLabelHeadingText}>DUE DATE</Text>
                      <DueDate dateStr={selectedTask.dueDate} status={selectedTask.status} />
                    </View>

                    <View style={styles.sheetFieldsFullWidthColumnFlexCellBlock}>
                      <Text style={styles.sheetFieldDefinitionUppercaseLabelHeadingText}>LINKED CONTACT / DEAL</Text>
                      <Text style={styles.sheetFieldsCellContentPrimaryNormalDataStringText}>{selectedTask.linkedEntity || '—'}</Text>
                    </View>

                    {selectedTask.notes ? (
                      <View style={styles.sheetFieldsFullWidthColumnFlexCellBlock}>
                        <Text style={styles.sheetFieldDefinitionUppercaseLabelHeadingText}>NOTES</Text>
                        <Text style={styles.sheetFieldsCellContentNotesParagraphDataStringText}>{selectedTask.notes}</Text>
                      </View>
                    ) : null}

                  </View>
                </View>
              </ScrollView>

              {/* Base Controls Actions Panel Dismiss Area Frame Component */}
              <View style={styles.sheetLayoutFooterActionControlPanelRowFrameBox}>
                <TouchableOpacity onPress={() => setSelectedTask(null)} style={styles.sheetLayoutFooterActionControlPanelDismissButtonTriggerFrame}>
                  <Text style={styles.sheetLayoutFooterActionControlPanelDismissButtonTriggerFrameTextLabel}>Close</Text>
                </TouchableOpacity>
              </View>

            </View>
          )}
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}

/* ── Native Stylesheet Definition Declarations ──────────────────── */
const styles = StyleSheet.create({
  appSafeAreaViewContainerBackground: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerPanelSectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 40 : 16,
    paddingBottom: 16,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  headerLeftMetaStack: {
    flex: 1,
    gap: 2,
  },
  headerTitleAndAlertIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerPrimaryHeadlineTextText: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.surface,
    letterSpacing: -0.5,
  },
  headerOverdueCounterBadgePill: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
  },
  headerOverdueCounterBadgePillTextString: {
    color: '#b91c1c',
    fontSize: 11,
    fontWeight: '700',
  },
  headerSecondarySubheadlineTextString: {
    fontSize: 12,
    color: '#64748b',
  },
  readOnlyFloatingStatusBadgeFrame: {
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
  readOnlyStatusIndicatorPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#f59e0b',
  },
  readOnlyStatusIndicatorLabelTextString: {
    color: '#b45309',
    fontSize: 11,
    fontWeight: '700',
  },
  filterWidgetCardWrapperBox: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    gap: 12,
  },
  searchBarBoxInputFrame: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchBarMagnifierIconGlyph: {
    fontSize: 14,
    marginRight: 8,
  },
  searchBarInputElementTextNode: {
    flex: 1,
    color: '#0f172a',
    fontSize: 14,
  },
  searchFieldClearButtonHitbox: {
    padding: 4,
  },
  searchFieldClearButtonHitboxTextChar: {
    color: '#94a3b8',
    fontSize: 18,
    fontWeight: 'bold',
  },
  scrollCategoryAxisTrackContainerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scrollCategoryAxisTrackInlineLabelText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    width: 60,
  },
  horizontalScrollTrackContainerGapPadding: {
    gap: 6,
    alignItems: 'center',
    paddingRight: 16,
  },
  filterSelectionButtonChipFrame: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
    gap: 4,
  },
  chipEmbeddedIconEmoji: {
    fontSize: 11,
  },
  chipEmbeddedColorIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  filterSelectionButtonChipLabelTextString: {
    fontSize: 12,
  },
  centralizedStateFeedbackLayoutContainerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
    gap: 12,
  },
  centralizedStateFeedbackLayoutContainerDescriptionString: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
  },
  errorTextPromptLabel: {
    color: '#ef4444',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
  },
  errorActionRetryTriggerButtonFrame: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
  },
  errorActionRetryTriggerButtonTextLabel: {
    color: '#4f46e5',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyGraphicPlaceholderIconString: {
    fontSize: 32,
  },
  emptyGraphicPlaceholderHeadlineString: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  verticalCardsLayoutListScrollTrack: {
    padding: 16,
    gap: 12,
  },
  taskItemCardContainerBox: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeaderFlexRowContainerSplit: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  cardHeaderFlexLeftGroupWithIcon: {
    flex: 1,
    flexDirection: 'row',
    gap: 10,
  },
  cardHeaderEmbeddedStatusBoxIconFrame: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardHeaderEmbeddedStatusBoxIconEmoji: {
    fontSize: 16,
  },
  cardHeaderHeadlineIdentityTextStack: {
    flex: 1,
    gap: 2,
  },
  cardHeaderTaskHeadingHeadlineText: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  textColorHeadlineOverdueRed: {
    color: '#991b1b',
  },
  textColorHeadlineNormalBlack: {
    color: '#0f172a',
  },
  cardHeaderTaskAssigneeMetaStringLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  cardMetadataWrapContainerInlineFlowLayoutRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  maxWLinkedEntityBadgeWidthLimiter: {
    maxWidth: 150,
  },
  cardProgressBarTrackBackgroundFrame: {
    height: 4,
    backgroundColor: '#f1f5f9',
    borderRadius: 99,
    overflow: 'hidden',
    width: '100%',
  },
  cardProgressBarTrackFillBarNode: {
    height: '100%',
    borderRadius: 99,
  },
  cardActionSimulatedFooterPanelBar: {
    borderTopWidth: 1,
    borderColor: '#f1f5f9',
    paddingTop: 10,
    marginTop: 2,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  cardActionSimulatedFooterPanelBarLeftIconTextRowGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardActionSimulatedFooterPanelBarInteractiveLabelString: {
    fontSize: 12,
    color: '#4f46e5',
    fontWeight: '700',
  },
  cardActionSimulatedFooterPanelBarInteractiveArrowSymbol: {
    fontSize: 12,
    color: '#4f46e5',
    fontWeight: 'bold',
  },
  aggregatedListSummaryCalculationMetaCardLabelStringText: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    fontWeight: '500',
    marginTop: 4,
    marginBottom: 24,
  },
  badgeFrame: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 99,
    gap: 4,
  },
  badgeIconText: {
    fontSize: 11,
  },
  badgeIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeLabelText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  dueDateWrapperInlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dueDateLabelStringText: {
    fontSize: 14,
  },
  textColorOverdueRed: {
    color: '#dc2626',
    fontWeight: '600',
  },
  textColorNormalGray: {
    color: '#475569',
  },
  overdueAlertInlinePill: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#fee2e2',
  },
  overdueAlertInlinePillText: {
    color: '#ef4444',
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  modalOverlayDimBackdropContainerMask: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  modalProfileBottomSheetCardBodyStructure: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: WINDOW_HEIGHT * 0.75,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
    overflow: 'hidden',
  },
  bottomSheetTopStructuralDragHandleBarStrip: {
    width: 36,
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
  },
  sheetLayoutIdentityHeaderContainerSectionBlock: {
    padding: 20,
    borderBottomWidth: 1,
    marginTop: 12,
  },
  sheetLayoutIdentityHeaderFlexAlignmentRowWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    position: 'relative',
  },
  sheetLayoutHeaderIdentityIconSquareBoxFrame: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetLayoutHeaderIdentityIconSquareBoxFrameEmojiText: {
    fontSize: 20,
  },
  sheetLayoutIdentityHeaderPropertiesStackGroup: {
    flex: 1,
    marginLeft: 12,
    marginRight: 36,
    gap: 2,
  },
  sheetLayoutIdentityHeaderTaskNameHeadingText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    lineHeight: 20,
  },
  sheetLayoutIdentityHeaderContextLabelSubtextString: {
    fontSize: 12,
    color: '#64748b',
  },
  sheetLayoutIdentityHeaderCloseActionCircularButtonFrame: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 99,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetLayoutIdentityHeaderCloseActionCircularButtonFrameSymbolText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: 'bold',
    lineHeight: 16,
  },
  sheetLayoutHeaderOverdueWarningAlertBannerCardBlockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fee2e2',
    borderRadius: 12,
    padding: 10,
    marginTop: 14,
    gap: 8,
  },
  sheetLayoutHeaderOverdueWarningAlertBannerCardBlockRowLabelStringText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#b91c1c',
  },
  sheetFieldsScrollTrackContainer: {
    flex: 1,
    padding: 20,
  },
  sheetFieldsVerticalStackSpacingLayout: {
    paddingBottom: 32,
  },
  sheetFieldsStructuralTwoColumnFlexWrapGridSystem: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 18,
  },
  sheetFieldsTwoColumnFlexCellBlock: {
    width: '50%',
    paddingRight: 8,
    gap: 4,
  },
  sheetFieldsFullWidthColumnFlexCellBlock: {
    width: '100%',
    gap: 4,
  },
  sheetFieldDefinitionUppercaseLabelHeadingText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.8,
  },
  sheetFieldsCellContentBadgePositionerAlignWrapper: {
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  sheetFieldsCellContentPrimaryNormalDataStringText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  sheetFieldsCellContentNotesParagraphDataStringText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    fontWeight: '500',
  },
  sheetLayoutFooterActionControlPanelRowFrameBox: {
    padding: 16,
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderColor: '#e2e8f0',
    paddingBottom: Platform.OS === 'ios' ? 36 : 16,
  },
  sheetLayoutFooterActionControlPanelDismissButtonTriggerFrame: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetLayoutFooterActionControlPanelDismissButtonTriggerFrameTextLabel: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '600',
  },
});