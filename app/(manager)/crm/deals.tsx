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

const { height: WINDOW_HEIGHT } = Dimensions.get('window');

/* ── Constants ───────────────────────────────────────────────────── */
const STAGES = ['Qualification', 'Needs Analysis', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];

const STAGE_CONFIG: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  'Qualification':  { bg: 'rgba(148, 163, 184, 0.1)', text: '#94a3b8', border: 'rgba(148, 163, 184, 0.25)', dot: '#94a3b8' },
  'Needs Analysis': { bg: 'rgba(56, 189, 248, 0.1)',  text: '#38bdf8', border: 'rgba(56, 189, 248, 0.25)',  dot: '#38bdf8' },
  'Proposal':       { bg: 'rgba(129, 140, 248, 0.1)',  text: '#818cf8', border: 'rgba(129, 140, 248, 0.25)',  dot: '#818cf8' },
  'Negotiation':    { bg: 'rgba(251, 191, 36, 0.1)',  text: '#fbbf24', border: 'rgba(251, 191, 36, 0.25)',  dot: '#fbbf24' },
  'Closed Won':     { bg: 'rgba(52, 211, 153, 0.1)',  text: '#34d399', border: 'rgba(52, 211, 153, 0.25)',  dot: '#34d399' },
  'Closed Lost':    { bg: 'rgba(248, 113, 113, 0.1)',  text: '#f87171', border: 'rgba(248, 113, 113, 0.25)',  dot: '#f87171' },
  'Unknown':        { bg: 'rgba(115, 115, 115, 0.1)',  text: '#a3a3a3', border: 'rgba(115, 115, 115, 0.25)',  dot: '#a3a3a3' },
};

const getProbColor = (p: number) => {
  if (p >= 75) return '#10b981'; // emerald
  if (p >= 50) return '#3b82f6'; // blue
  if (p >= 25) return '#f59e0b'; // amber
  return '#ef4444'; // red
};

/* ── Helpers ─────────────────────────────────────────────────────── */
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

/* ── Shared UI Subcomponents ─────────────────────────────────────── */
function StageBadge({ stage }: { stage: string }) {
  const cfg = STAGE_CONFIG[stage] ?? STAGE_CONFIG['Unknown'];
  return (
    <View style={[styles.badgeFrame, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
      <View style={[styles.badgeDot, { backgroundColor: cfg.dot }]} />
      <Text style={[styles.badgeText, { color: cfg.text }]}>{stage || 'Unknown'}</Text>
    </View>
  );
}

function ProbBar({ value }: { value: number }) {
  const color = getProbColor(value);
  return (
    <View style={styles.probBarRowWrapper}>
      <View style={styles.probTrackBackground}>
        <View style={[styles.probFillTrack, { width: `${value}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.probPercentageLabelText}>{value}%</Text>
    </View>
  );
}

/* ── Main Component Export ───────────────────────────────────────── */
export default function CRMDealsReadOnly() {
  const [deals, setDeals] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('All');
  const [selectedDeal, setSelectedDeal] = useState<any>(null);
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
    STAGES.forEach((s) => {
      counts[s] = deals.filter((d) => d.stage === s).length;
    });
    return counts;
  }, [deals]);

  const totalFilteredValue = useMemo(() => {
    return filteredDeals.reduce((sum, d) => sum + (d.value || 0), 0);
  }, [filteredDeals]);

  return (
    <SafeAreaView style={styles.appSafeAreaViewBackground}>
      {/* Absolute Top Subtle Decorative Gradient Accent Bar Replacement */}
      <View style={styles.topAccentBarDecoration} />

      {/* Screen Header Panel */}
      <View style={styles.headerLayoutViewContainer}>
        <View style={styles.headerLeftAlignmentGroup}>
          <View style={styles.headerIconProfilePlaceholderSquare}>
            <Text style={styles.headerEmojiSymbolIcon}>💼</Text>
          </View>
          <View>
            <Text style={styles.headerScreenHeadlineText}>Deals</Text>
            <Text style={styles.headerScreenSubheadlineText}>Review pipeline deals · Manager view</Text>
          </View>
        </View>
        <View style={styles.readOnlyFloatingStatusBadge}>
          <View style={styles.readOnlyIndicatorAmberDot} />
          <Text style={styles.readOnlyTextStringLabel}>Read-only</Text>
        </View>
      </View>

      {/* Control Widgets Workspace (Search Input Field + Scrolling Filter Track) */}
      <View style={styles.filterWorkspaceBoxWrapper}>
        {/* Search Layout Group */}
        <View style={styles.searchBarBoxFrame}>
          <Text style={styles.searchGlassGlyphSymbol}>🔍</Text>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search deals, companies, owners…"
            placeholderTextColor="#525252"
            style={styles.searchBarInputTextNode}
            autoCapitalize="none"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.searchFieldClearTriggerHitbox}>
              <Text style={styles.searchFieldClearTriggerSymbolText}>×</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Stage Navigation Category Track */}
        <View style={styles.horizontalScrollOuterAxisWrapperRow}>
          <Text style={styles.scrollSectionTrackContextInlineLabel}>Stage:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterTrackInnerScrollerContainer}>
            {['All', ...STAGES].map((s) => {
              const cfg = s !== 'All' ? STAGE_CONFIG[s] : null;
              const isActive = stageFilter === s;

              let customChipBg = 'transparent';
              let customChipBorderColor = '#262626';
              let customChipTextColor = '#737373';

              if (isActive) {
                if (cfg) {
                  customChipBg = cfg.bg;
                  customChipBorderColor = cfg.border;
                  customChipTextColor = cfg.text;
                } else {
                  customChipBg = 'rgba(255, 255, 255, 0.1)';
                  customChipBorderColor = 'rgba(255, 255, 255, 0.2)';
                  customChipTextColor = '#ffffff';
                }
              }

              return (
                <TouchableOpacity
                  key={s}
                  activeOpacity={0.7}
                  onPress={() => setStageFilter(s)}
                  style={[
                    styles.filterChipButtonActionFrame,
                    { backgroundColor: customChipBg, borderColor: customChipBorderColor },
                  ]}
                >
                  {cfg && <View style={[styles.chipIndicatorDotNode, { backgroundColor: cfg.dot }]} />}
                  <Text style={[styles.filterChipButtonLabelText, { color: customChipTextColor, fontWeight: isActive ? '700' : '600' }]}>
                    {s}
                  </Text>
                  <View style={[styles.counterPillWrapperDecoration, { backgroundColor: isActive ? 'rgba(255,255,255,0.15)' : '#262626' }]}>
                    <Text style={styles.counterPillWrapperDecorationValueText}>{stageCounts[s] ?? 0}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>

      {/* Status Feedback Layers */}
      {error && (
        <View style={styles.alertFeedbackCardContainerRow}>
          <Text style={styles.alertFeedbackWarningIconGlyph}>⚠</Text>
          <Text style={styles.alertFeedbackPayloadDescriptionText} numberOfLines={2}>{error}</Text>
          <TouchableOpacity onPress={() => setError(null)} style={styles.alertFeedbackDismissActionHitbox}>
            <Text style={styles.alertFeedbackDismissActionSymbol}>×</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading && (
        <View style={styles.stateBlockCentralizedFeedbackContainer}>
          <ActivityIndicator size="large" color="#38bdf8" />
          <Text style={styles.stateBlockContextDescriptionStringText}>Loading pipeline deals…</Text>
        </View>
      )}

      {!loading && filteredDeals.length === 0 && (
        <View style={styles.stateBlockCentralizedFeedbackContainer}>
          <View style={styles.emptyResultsGraphicBoxIconCard}>
            <Text style={styles.emptyResultsGraphicBoxIconCardGlyphSymbol}>🔍</Text>
          </View>
          <Text style={styles.emptyResultsHeadlinePromptMessageText}>No deals found</Text>
          <Text style={styles.emptyResultsSubheadingExplanationPromptText}>Try adjusting your search query parameters or stage selections.</Text>
        </View>
      )}

      {/* Primary Deal Cards Vertical Scroll List Workspace */}
      {!loading && filteredDeals.length > 0 && (
        <ScrollView contentContainerStyle={styles.verticalCardsLayoutListScrollTrack} showsVerticalScrollIndicator={false}>
          {filteredDeals.map((deal) => (
            <TouchableOpacity
              key={deal.id || deal._id}
              activeOpacity={0.85}
              onPress={() => setSelectedDeal(deal)}
              style={styles.dealListItemCardContainerBox}
            >
              {/* Profile Main Header Identity Grid Row */}
              <View style={styles.cardLayoutIdentitySplitHeaderRow}>
                <View style={styles.cardIdentityLeftInfoStack}>
                  <Text style={styles.cardDealProfileTitleHeadingText} numberOfLines={1}>
                    {deal.name}
                  </Text>
                  <View style={styles.cardCompanyAffiliationMetadataRowInlineLayout}>
                    {deal.company ? (
                      <View style={styles.companyCharacterSymbolAvatarSquareIcon}>
                        <Text style={styles.companyCharacterSymbolAvatarSquareIconLetterChar}>
                          {deal.company.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    ) : null}
                    <Text style={styles.cardAssociatedCompanyNameLabelString} numberOfLines={1}>
                      {deal.company || '—'}
                    </Text>
                  </View>
                </View>
                <StageBadge stage={deal.stage} />
              </View>

              {/* Data Properties Meta Dashboard Split Block */}
              <View style={styles.cardPropertiesSystemQuadGridDisplayGrid}>
                
                <View style={styles.cardPropertyQuadGridCellFieldBox}>
                  <Text style={styles.quadGridCellFieldBoxLabelUppercaseText}>VALUE</Text>
                  <Text style={styles.quadGridCellFieldBoxDataValueTextEmeraldCurrencyString}>
                    {formatCurrency(deal.value)}
                  </Text>
                </View>

                <View style={styles.cardPropertyQuadGridCellFieldBox}>
                  <Text style={styles.quadGridCellFieldBoxLabelUppercaseText}>PROBABILITY</Text>
                  {deal.probability != null ? (
                    <ProbBar value={deal.probability} />
                  ) : (
                    <Text style={styles.quadGridCellFieldBoxDataFallbackMutedString}>—</Text>
                  )}
                </View>

                <View style={styles.cardPropertyQuadGridCellFieldBox}>
                  <Text style={styles.quadGridCellFieldBoxLabelUppercaseText}>CLOSE DATE</Text>
                  <Text style={styles.quadGridCellFieldBoxDataNormalWhiteString}>
                    {formatDate(deal.closeDate)}
                  </Text>
                </View>

                <View style={styles.cardPropertyQuadGridCellFieldBox}>
                  <Text style={styles.quadGridCellFieldBoxLabelUppercaseText}>OWNER</Text>
                  <View style={styles.cardAccountOwnerAffiliationRowInlineGroup}>
                    {deal.owner ? (
                      <View style={styles.accountOwnerAvatarCircleProfileIcon}>
                        <Text style={styles.accountOwnerAvatarCircleProfileIconLetterChar}>
                          {deal.owner.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    ) : null}
                    <Text style={styles.quadGridCellFieldBoxDataNormalWhiteString} numberOfLines={1}>
                      {deal.owner || '—'}
                    </Text>
                  </View>
                </View>

              </View>

              {/* Bottom Card Disclosure Actions Panel Trigger */}
              <View style={styles.cardActionFooterSimulatedRowFrame}>
                <Text style={styles.cardActionFooterSimulatedRowFrameInteractiveActionTextString}>View Details →</Text>
              </View>
            </TouchableOpacity>
          ))}

          {/* Aggregated Calculation Total Metric Footer Box Component */}
          <View style={styles.aggregatedListSummaryCalculationMetaCardContainerBoxRow}>
            <Text style={styles.aggregatedListSummaryCalculationMetaCardLabelStringText}>
              Showing <Text style={styles.whiteHighlightTextAccent}>{filteredDeals.length}</Text> of{' '}
              <Text style={styles.whiteHighlightTextAccent}>{deals.length}</Text> deals
            </Text>
            <Text style={styles.aggregatedListSummaryCalculationMetaCardLabelStringText}>
              Total Volume:{' '}
              <Text style={styles.quadGridCellFieldBoxDataValueTextEmeraldCurrencyString}>
                {formatCurrency(totalFilteredValue)}
              </Text>
            </Text>
          </View>
        </ScrollView>
      )}

      {/* ── Native Slide Overlay Profile Bottom Sheet Modal ── */}
      <Modal visible={selectedDeal !== null} transparent={true} animationType="slide" onRequestClose={() => setSelectedDeal(null)}>
        <TouchableOpacity style={styles.modalOverlayDimBackdropContainerMask} activeOpacity={1} onPress={() => setSelectedDeal(null)}>
          {selectedDeal && (
            <View style={styles.modalProfileBottomSheetCardBodyStructure} onStartShouldSetResponder={() => true}>
              
              {/* Bottom Sheet Structural Header Drag Handle Strip */}
              <View style={styles.bottomSheetTopStructuralDragHandleBarStrip} />

              {/* Summary Primary Heading Identity Display Container Row */}
              <View style={styles.sheetLayoutIdentityHeaderContainerSectionBlock}>
                <View style={styles.sheetLayoutIdentityHeaderFlexAlignmentRowWrapper}>
                  <View style={styles.headerIconProfilePlaceholderSquare}>
                    <Text style={styles.headerEmojiSymbolIcon}>💼</Text>
                  </View>
                  <View style={styles.sheetLayoutIdentityHeaderPropertiesStackGroup}>
                    <Text style={styles.sheetLayoutIdentityHeaderDealNameHeadingText} numberOfLines={2}>
                      {selectedDeal.name}
                    </Text>
                    <Text style={styles.sheetLayoutIdentityHeaderContextLabelSubtextString}>Deal summary & pipeline timeline info</Text>
                    <View style={styles.sheetLayoutIdentityHeaderBadgePositionerAlignWrapper}>
                      <StageBadge stage={selectedDeal.stage} />
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedDeal(null)} style={styles.sheetLayoutIdentityHeaderCloseActionCircularButtonFrame}>
                    <Text style={styles.sheetLayoutIdentityHeaderCloseActionCircularButtonFrameSymbolText}>×</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Structured Attribute Specification Rows Container Box Section */}
              <ScrollView style={styles.sheetFieldsScrollTrackContainer} showsVerticalScrollIndicator={false}>
                <View style={styles.sheetFieldsVerticalStackSpacingLayout}>
                  
                  {/* Financial Value Statement Banner Frame */}
                  <View style={styles.sheetFinancialValueStatementHighlightBannerBox}>
                    <View style={styles.sheetFinancialValueStatementLeftIndicatorInlineLabelGroup}>
                      <Text style={styles.sheetFinancialValueStatementBannerEmojiSymbolIcon}>💰</Text>
                      <Text style={styles.sheetFinancialValueStatementBannerLabelUppercaseText}>DEAL VALUE</Text>
                    </View>
                    <Text style={styles.sheetFinancialValueStatementBannerLargeEmeraldCurrencyStringText}>
                      {formatCurrency(selectedDeal.value)}
                    </Text>
                  </View>

                  {/* Sub-Property Feature Information Cell Breakdown Field Grid */}
                  <View style={styles.sheetFieldsStructuralTwoColumnFlexWrapGridSystem}>
                    
                    <View style={styles.sheetFieldsTwoColumnFlexCellBlock}>
                      <View style={styles.sheetFieldsCellIconAndContextLabelRowGroupInlineHeader}>
                        <Text style={styles.sheetFieldsCellIconGlyphInlineSymbol}>🏢</Text>
                        <Text style={styles.quadGridCellFieldBoxLabelUppercaseText}>COMPANY</Text>
                      </View>
                      <Text style={styles.sheetFieldsCellContentPrimaryWhiteDataStringText} numberOfLines={1}>
                        {selectedDeal.company || '—'}
                      </Text>
                    </View>

                    <View style={styles.sheetFieldsTwoColumnFlexCellBlock}>
                      <View style={styles.sheetFieldsCellIconAndContextLabelRowGroupInlineHeader}>
                        <Text style={styles.sheetFieldsCellIconGlyphInlineSymbol}>👤</Text>
                        <Text style={styles.quadGridCellFieldBoxLabelUppercaseText}>OWNER</Text>
                      </View>
                      <Text style={styles.sheetFieldsCellContentPrimaryWhiteDataStringText} numberOfLines={1}>
                        {selectedDeal.owner || '—'}
                      </Text>
                    </View>

                    <View style={styles.sheetFieldsTwoColumnFlexCellBlock}>
                      <View style={styles.sheetFieldsCellIconAndContextLabelRowGroupInlineHeader}>
                        <Text style={styles.sheetFieldsCellIconGlyphInlineSymbol}>📅</Text>
                        <Text style={styles.quadGridCellFieldBoxLabelUppercaseText}>CLOSE DATE</Text>
                      </View>
                      <Text style={styles.sheetFieldsCellContentPrimaryWhiteDataStringText} numberOfLines={1}>
                        {formatDate(selectedDeal.closeDate)}
                      </Text>
                    </View>

                    <View style={styles.sheetFieldsTwoColumnFlexCellBlock}>
                      <View style={styles.sheetFieldsCellIconAndContextLabelRowGroupInlineHeader}>
                        <Text style={styles.sheetFieldsCellIconGlyphInlineSymbol}>🎯</Text>
                        <Text style={styles.quadGridCellFieldBoxLabelUppercaseText}>PROBABILITY</Text>
                      </View>
                      {selectedDeal.probability != null ? (
                        <ProbBar value={selectedDeal.probability} />
                      ) : (
                        <Text style={styles.quadGridCellFieldBoxDataFallbackMutedString}>—</Text>
                      )}
                    </View>

                  </View>
                </View>
              </ScrollView>

              {/* Profile Sheet Dismiss Action Bottom Control Panel Box */}
              <View style={styles.sheetLayoutFooterActionControlPanelRowFrameBox}>
                <TouchableOpacity onPress={() => setSelectedDeal(null)} style={styles.sheetLayoutFooterActionControlPanelDismissButtonTriggerFrame}>
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

/* ── Native Component Stylesheet Definitions ────────────────────── */
const styles = StyleSheet.create({
  appSafeAreaViewBackground: {
    flex: 1,
    backgroundColor: '#090a0f',
  },
  topAccentBarDecoration: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#38bdf8',
    zIndex: 999,
  },
  headerLayoutViewContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 44 : 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: '#171717',
  },
  headerLeftAlignmentGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconProfilePlaceholderSquare: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerEmojiSymbolIcon: {
    fontSize: 20,
  },
  headerScreenHeadlineText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  headerScreenSubheadlineText: {
    fontSize: 11,
    color: '#a3a3a3',
    marginTop: 1,
  },
  readOnlyFloatingStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 99,
    gap: 6,
  },
  readOnlyIndicatorAmberDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fbbf24',
  },
  readOnlyTextStringLabel: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: '700',
  },
  filterWorkspaceBoxWrapper: {
    backgroundColor: '#0f1117',
    borderBottomWidth: 1,
    borderColor: '#171717',
    padding: 16,
    gap: 14,
  },
  searchBarBoxFrame: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchGlassGlyphSymbol: {
    fontSize: 14,
    marginRight: 8,
  },
  searchBarInputTextNode: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
  },
  searchFieldClearTriggerHitbox: {
    padding: 6,
  },
  searchFieldClearTriggerSymbolText: {
    color: '#737373',
    fontSize: 20,
    fontWeight: 'bold',
    lineHeight: 20,
  },
  horizontalScrollOuterAxisWrapperRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scrollSectionTrackContextInlineLabel: {
    fontSize: 12,
    color: '#737373',
    fontWeight: '600',
    marginRight: 10,
  },
  filterTrackInnerScrollerContainer: {
    gap: 8,
    alignItems: 'center',
  },
  filterChipButtonActionFrame: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  chipIndicatorDotNode: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  filterChipButtonLabelText: {
    fontSize: 12,
  },
  counterPillWrapperDecoration: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  counterPillWrapperDecorationValueText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff',
  },
  alertFeedbackCardContainerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.25)',
    margin: 16,
    marginBottom: 0,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 10,
  },
  alertFeedbackWarningIconGlyph: {
    color: '#f87171',
    fontSize: 16,
    fontWeight: 'bold',
  },
  alertFeedbackPayloadDescriptionText: {
    flex: 1,
    color: '#fca5a5',
    fontSize: 13,
    fontWeight: '500',
  },
  alertFeedbackDismissActionHitbox: {
    padding: 4,
  },
  alertFeedbackDismissActionSymbol: {
    color: '#f87171',
    fontSize: 20,
    lineHeight: 20,
  },
  stateBlockCentralizedFeedbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
    gap: 12,
  },
  stateBlockContextDescriptionStringText: {
    color: '#a3a3a3',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyResultsGraphicBoxIconCard: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#171717',
    borderWidth: 1,
    borderColor: '#262626',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyResultsGraphicBoxIconCardGlyphSymbol: {
    fontSize: 24,
  },
  emptyResultsHeadlinePromptMessageText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#e5e5e5',
    textAlign: 'center',
  },
  emptyResultsSubheadingExplanationPromptText: {
    fontSize: 12,
    color: '#737373',
    textAlign: 'center',
    lineHeight: 16,
  },
  verticalCardsLayoutListScrollTrack: {
    padding: 16,
    gap: 14,
  },
  dealListItemCardContainerBox: {
    backgroundColor: '#0f1117',
    borderWidth: 1,
    borderColor: '#171717',
    borderRadius: 16,
    padding: 16,
    gap: 16,
  },
  cardLayoutIdentitySplitHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  cardIdentityLeftInfoStack: {
    flex: 1,
    gap: 4,
  },
  cardDealProfileTitleHeadingText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  cardCompanyAffiliationMetadataRowInlineLayout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  companyCharacterSymbolAvatarSquareIcon: {
    width: 18,
    height: 18,
    borderRadius: 4,
    backgroundColor: '#171717',
    borderWidth: 1,
    borderColor: '#262626',
    justifyContent: 'center',
    alignItems: 'center',
  },
  companyCharacterSymbolAvatarSquareIconLetterChar: {
    fontSize: 9,
    fontWeight: '800',
    color: '#a3a3a3',
  },
  cardAssociatedCompanyNameLabelString: {
    fontSize: 13,
    color: '#a3a3a3',
    fontWeight: '500',
  },
  cardPropertiesSystemQuadGridDisplayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#171717',
  },
  cardPropertyQuadGridCellFieldBox: {
    width: '50%',
    paddingRight: 6,
    gap: 4,
  },
  quadGridCellFieldBoxLabelUppercaseText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#525252',
    letterSpacing: 0.8,
  },
  quadGridCellFieldBoxDataValueTextEmeraldCurrencyString: {
    fontSize: 14,
    fontWeight: '900',
    color: '#34d399',
  },
  quadGridCellFieldBoxDataNormalWhiteString: {
    fontSize: 13,
    fontWeight: '600',
    color: '#e5e5e5',
  },
  quadGridCellFieldBoxDataFallbackMutedString: {
    fontSize: 13,
    color: '#404040',
    fontWeight: '600',
  },
  cardAccountOwnerAffiliationRowInlineGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  accountOwnerAvatarCircleProfileIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#1e3a8a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountOwnerAvatarCircleProfileIconLetterChar: {
    fontSize: 9,
    fontWeight: '800',
    color: '#ffffff',
  },
  cardActionFooterSimulatedRowFrame: {
    alignItems: 'flex-end',
    paddingTop: 4,
  },
  cardActionFooterSimulatedRowFrameInteractiveActionTextString: {
    fontSize: 12,
    color: '#38bdf8',
    fontWeight: '700',
  },
  aggregatedListSummaryCalculationMetaCardContainerBoxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    paddingHorizontal: 4,
    marginBottom: 24,
  },
  aggregatedListSummaryCalculationMetaCardLabelStringText: {
    fontSize: 12,
    color: '#525252',
    fontWeight: '600',
  },
  whiteHighlightTextAccent: {
    color: '#a3a3a3',
    fontWeight: '700',
  },
  badgeFrame: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  probBarRowWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  probTrackBackground: {
    width: 64,
    height: 6,
    borderRadius: 99,
    backgroundColor: '#171717',
    overflow: 'hidden',
  },
  probFillTrack: {
    height: '100%',
    borderRadius: 99,
  },
  probPercentageLabelText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#a3a3a3',
  },
  modalOverlayDimBackdropContainerMask: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalProfileBottomSheetCardBodyStructure: {
    backgroundColor: '#0f1117',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: '#262626',
    height: WINDOW_HEIGHT * 0.75,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 24,
  },
  bottomSheetTopStructuralDragHandleBarStrip: {
    width: 36,
    height: 4,
    backgroundColor: '#262626',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
  },
  sheetLayoutIdentityHeaderContainerSectionBlock: {
    padding: 20,
    borderBottomWidth: 1,
    borderColor: '#171717',
  },
  sheetLayoutIdentityHeaderFlexAlignmentRowWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    position: 'relative',
  },
  sheetLayoutIdentityHeaderPropertiesStackGroup: {
    flex: 1,
    marginLeft: 14,
    marginRight: 36,
    gap: 4,
  },
  sheetLayoutIdentityHeaderDealNameHeadingText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
    lineHeight: 22,
  },
  sheetLayoutIdentityHeaderContextLabelSubtextString: {
    fontSize: 12,
    color: '#737373',
    fontWeight: '500',
  },
  sheetLayoutIdentityHeaderBadgePositionerAlignWrapper: {
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  sheetLayoutIdentityHeaderCloseActionCircularButtonFrame: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#171717',
    borderWidth: 1,
    borderColor: '#262626',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetLayoutIdentityHeaderCloseActionCircularButtonFrameSymbolText: {
    fontSize: 18,
    color: '#a3a3a3',
    fontWeight: 'bold',
    lineHeight: 18,
  },
  sheetFieldsScrollTrackContainer: {
    flex: 1,
    padding: 20,
  },
  sheetFieldsVerticalStackSpacingLayout: {
    gap: 16,
    paddingBottom: 24,
  },
  sheetFinancialValueStatementHighlightBannerBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 211, 153, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.15)',
    borderRadius: 14,
    padding: 16,
  },
  sheetFinancialValueStatementLeftIndicatorInlineLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sheetFinancialValueStatementBannerEmojiSymbolIcon: {
    fontSize: 18,
  },
  sheetFinancialValueStatementBannerLabelUppercaseText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#737373',
    letterSpacing: 0.8,
  },
  sheetFinancialValueStatementBannerLargeEmeraldCurrencyStringText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#34d399',
  },
  sheetFieldsStructuralTwoColumnFlexWrapGridSystem: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 14,
  },
  sheetFieldsTwoColumnFlexCellBlock: {
    width: '50%',
    paddingRight: 8,
    gap: 6,
  },
  sheetFieldsCellIconAndContextLabelRowGroupInlineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sheetFieldsCellIconGlyphInlineSymbol: {
    fontSize: 13,
  },
  sheetFieldsCellContentPrimaryWhiteDataStringText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#e5e5e5',
  },
  sheetLayoutFooterActionControlPanelRowFrameBox: {
    padding: 20,
    backgroundColor: '#0a0b0f',
    borderTopWidth: 1,
    borderColor: '#171717',
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
  },
  sheetLayoutFooterActionControlPanelDismissButtonTriggerFrame: {
    backgroundColor: '#171717',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetLayoutFooterActionControlPanelDismissButtonTriggerFrameTextLabel: {
    color: '#a3a3a3',
    fontSize: 14,
    fontWeight: '700',
  },
});