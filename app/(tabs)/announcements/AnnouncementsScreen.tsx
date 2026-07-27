import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  Bell, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertTriangle, 
  Layers, 
  Flame, 
  Inbox,
  X 
} from 'lucide-react-native';

// IMPORT YOUR EXACT API MODULE HERE
import { apiRequest } from '@/services/api'; // Adjust this path to match your file structure
import { getAnnouncementWebSocket } from "@/services/announcementWebSocket";
import { s, wp, hp, fs } from '@/util/styles';

export interface Announcement {
  id: string;
  title: string;
  body: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: string;
  authorName: string;
  createdAt: string;
  expiresAt?: string;
  emergency: boolean;
  requiresAcknowledgement: boolean;
  isRead: boolean;
  isAcknowledged: boolean;
}

interface EmployeeAnnouncementsProps {
  cacheScope?: string;
}

const priorityColors = {
  low: { bg: 'rgba(59, 130, 246, 0.1)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.15)' },
  medium: { bg: 'rgba(234, 179, 8, 0.1)', text: '#facc15', border: 'rgba(234, 179, 8, 0.15)' },
  high: { bg: 'rgba(249, 115, 22, 0.1)', text: '#fb923c', border: 'rgba(249, 115, 22, 0.15)' },
  critical: { bg: 'rgba(239, 68, 68, 0.1)', text: '#f87171', border: 'rgba(239, 68, 68, 0.15)' },
};

export default function EmployeeAnnouncements({
  cacheScope = "employee",
}: EmployeeAnnouncementsProps) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [showAcknowledgementModal, setShowAcknowledgementModal] = useState(false);
  const [tab, setTab] = useState<string>("unread");

  // Live WebSocket Synced Hooks
  useEffect(() => {
    const ws = getAnnouncementWebSocket();
    ws.connect({
      onNewAnnouncement: () => {
        invalidateAllQueries();
        Alert.alert("New Notification", "A new corporate update has been posted.");
      },
      onAnnouncementPublished: () => invalidateAllQueries(),
      onAnnouncementUpdated: () => invalidateAllQueries(),
    });
    return () => {};
  }, [queryClient, cacheScope]);

  const invalidateAllQueries = () => {
    queryClient.invalidateQueries({ queryKey: [`${cacheScope}-announcements`] });
    queryClient.invalidateQueries({ queryKey: [`${cacheScope}-announcement-unread`] });
    queryClient.invalidateQueries({ queryKey: ["employee-announcement-unread"] });
  };

  // TanStack Query configured to unpack your apiRequest structure
  const { data: announcementsData, isLoading, refetch, isRefetching } = useQuery({
    queryKey: [`${cacheScope}-announcements`, tab],
    queryFn: async () => {
      // Stripped the leading /api/ since your base URL includes it implicitly
      const response = await apiRequest<{ items: Announcement[] }>(
        `/announcements?filter=${encodeURIComponent(tab)}`
      );
      return response.data; // Reading from the custom wrapper envelope
    },
  });

  const announcements = announcementsData?.items || [];

  // Computed Context Metrics Summary
  const metrics = useMemo(() => {
    return {
      unreadCount: announcements.filter(a => !a.isRead).length,
      totalCount: announcements.length,
      emergencyCount: announcements.filter(a => a.emergency).length
    };
  }, [announcements]);

  // Mark as Read Mutation
  const readMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/announcements/${id}/read`, { method: "POST" });
    },
    onSuccess: () => {
      invalidateAllQueries();
    },
  });

  // Acknowledge Submission Mutation
  const acknowledgeMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/announcements/${id}/acknowledge`, { method: "POST" });
    },
    onSuccess: () => {
      invalidateAllQueries();
      setShowAcknowledgementModal(false);
      setSelectedAnnouncement(null);
    },
  });

  const handleActionPress = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    if (!announcement.isRead) {
      readMutation.mutate(announcement.id);
    }
    if (announcement.requiresAcknowledgement && !announcement.isAcknowledged) {
      setShowAcknowledgementModal(true);
    }
  };

  if (isLoading) {
    return (
      <View style={s(styles.loaderCenterContainer)}>
        <ActivityIndicator size="large" color="#00C6FF" />
        <Text style={s(styles.loadingPulseText)}>Refreshing control feed...</Text>
      </View>
    );
  }

  return (
    <View style={s([styles.mainLayoutContainer, { paddingTop: insets.top - insets.top }])}>
      
      {/* HIGH-DENSITY DASHBOARD PANEL */}
      <View style={s(styles.controlDeckWidgetCard)}>
        <View style={s(styles.identityRowHeader)}>
          <View style={s(styles.brandingBoxIcon)}>
            <Bell size={fs(5)} color="#00C6FF" />
          </View>
          <View>
            <Text style={s(styles.layoutTitleHeading)}>Announcements</Text>
            <Text style={s(styles.layoutSubtitleText)}>Stay updated with operational instructions</Text>
          </View>
        </View>

        {/* METRICS ROW STRIP CHIPS */}
        <View style={s(styles.metricsBarWrapperRow)}>
          <TouchableOpacity 
            style={s([styles.metricChipButton, tab === 'unread' && styles.metricChipButtonActive])} 
            onPress={() => setTab('unread')}
          >
            <Bell size={fs(3)} color={tab === 'unread' ? '#00C6FF' : '#8b949e'} />
            <Text style={s([styles.metricChipValue, tab === 'unread' && { color: '#00C6FF' }])}>
              {metrics.unreadCount}
            </Text>
            <Text style={s(styles.metricChipLabel)}>Unread</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={s([styles.metricChipButton, tab === 'all' && styles.metricChipButtonActive])} 
            onPress={() => setTab('all')}
          >
            <Layers size={fs(3)} color="#8b949e" />
            <Text style={s(styles.metricChipValue)}>{metrics.totalCount}</Text>
            <Text style={s(styles.metricChipLabel)}>All</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={s([styles.metricChipButton, tab === 'emergency' && styles.metricChipButtonActive])} 
            onPress={() => setTab('emergency')}
          >
            <Flame size={fs(3)} color="#f87171" />
            <Text style={s([styles.metricChipValue, { color: '#f87171' }])}>{metrics.emergencyCount}</Text>
            <Text style={s(styles.metricChipLabel)}>Urgent</Text>
          </TouchableOpacity>
        </View>

        {/* TAB NAVIGATION ROW CONTROLS */}
        <View style={s(styles.inlineHorizontalTabsStrip)}>
          {['unread', 'all', 'important', 'emergency'].map((tabKey) => (
            <TouchableOpacity
              key={tabKey}
              onPress={() => setTab(tabKey)}
              style={s([styles.navigationTabButtonItem, tab === tabKey && styles.navigationTabButtonActive])}
            >
              <Text style={s([styles.navigationTabTextItem, tab === tabKey && styles.navigationTabActiveText])}>
                {tabKey.charAt(0).toUpperCase() + tabKey.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ANNOUNCEMENT FEED LIST VIEW */}
      <FlatList
        data={announcements}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s(styles.scrollListContainer)}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#00C6FF" />
        }
        renderItem={({ item }) => {
          const uiColors = priorityColors[item.priority] || priorityColors.low;
          return (
            <View style={s([
              styles.announcementCardLayoutBox,
              item.emergency ? styles.cardBorderEmergency : !item.isRead ? styles.cardBorderUnread : styles.cardBorderNormal
            ])}>
              {item.emergency && (
                <View style={s(styles.alertHeaderEmergencyBadgeStrip)}>
                  <AlertTriangle size={fs(3)} color="#f87171" />
                  <Text style={s(styles.alertHeaderEmergencyBadgeText)}>EMERGENCY</Text>
                </View>
              )}

              {!item.isRead && !item.emergency && (
                <View style={s(styles.unreadPulseIndicatorDot)} />
              )}

              <Text style={s(styles.announcementCardTitleText)}>{item.title}</Text>

              {/* DENSE BADGE CONTAINER LAYOUTS */}
              <View style={s(styles.badgeWrapFlexContainerRow)}>
                <View style={s([styles.badgeContainerView, { backgroundColor: uiColors.bg, borderColor: uiColors.border }])}>
                  <Text style={s([styles.badgeContentLabelText, { color: uiColors.text }])}>
                    {item.priority.toUpperCase()}
                  </Text>
                </View>

                {item.requiresAcknowledgement && !item.isAcknowledged && (
                  <View style={s([styles.badgeContainerView, styles.badgeAckRequired])}>
                    <Text style={s([styles.badgeContentLabelText, { color: '#fb923c' }])}>Requires Ack</Text>
                  </View>
                )}

                {item.isAcknowledged && (
                  <View style={s([styles.badgeContainerView, styles.badgeAckSuccess])}>
                    <CheckCircle2 size={fs(2.5)} color="#4ade80" style={s({ marginRight: wp(1) })} />
                    <Text style={s([styles.badgeContentLabelText, { color: '#4ade80' }])}>Acknowledged</Text>
                  </View>
                )}
              </View>

              <Text style={s(styles.metaInformationLineText)}>
                From {item.authorName} • {new Date(item.createdAt).toLocaleDateString()}
              </Text>

              <Text style={s(styles.bodyDescriptionPreviewText)} numberOfLines={3}>
                {item.body}
              </Text>

              {/* CONTROL INTERACTIVE ROUTING PANEL */}
              <View style={s(styles.actionButtonsContainerRow)}>
                <TouchableOpacity 
                  activeOpacity={0.7}
                  disabled={readMutation.isPending}
                  style={s([styles.interactiveActionButtonBase, styles.buttonVariantOutline])}
                  onPress={() => handleActionPress(item)}
                >
                  {item.isRead ? (
                    <>
                      <Eye size={fs(3.5)} color="#f0f6fc" style={s({ marginRight: wp(1.5) })} />
                      <Text style={s(styles.buttonActionTextLabel)}>Read</Text>
                    </>
                  ) : (
                    <>
                      <EyeOff size={fs(3.5)} color="#00C6FF" style={s({ marginRight: wp(1.5) })} />
                      <Text style={s([styles.buttonActionTextLabel, { color: '#00C6FF' }])}>Mark as Read</Text>
                    </>
                  )}
                </TouchableOpacity>

                {item.requiresAcknowledgement && !item.isAcknowledged && (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={s([styles.interactiveActionButtonBase, styles.buttonVariantSuccessFilled])}
                    onPress={() => {
                      setSelectedAnnouncement(item);
                      setShowAcknowledgementModal(true);
                    }}
                  >
                    <CheckCircle2 size={fs(3.5)} color="#fff" style={s({ marginRight: wp(1.5) })} />
                    <Text style={s([styles.buttonActionTextLabel, { color: '#fff', fontWeight: '700' }])}>
                      Acknowledge
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={s(styles.dashboardFramedEmptyLayoutView)}>
            <View style={s(styles.emptyIconCircleWrapperBorder)}>
              <Inbox size={fs(7)} color="rgba(255,255,255,0.2)" />
            </View>
            <Text style={s(styles.emptyViewHeaderTitleText)}>No announcements</Text>
           
          </View>
        }
      />

      {/* SHEET MODAL DIALOG CONTAINER */}
      <Modal
        visible={showAcknowledgementModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAcknowledgementModal(false)}
      >
        <View style={s(styles.modalScreenOverlayContainer)}>
          <View style={s(styles.modalContentSheetSurfaceCard)}>
            <View style={s(styles.modalHeaderTitleControlsRow)}>
              <Text style={s(styles.modalHeadingTitleText)}>Review Directive</Text>
              <TouchableOpacity 
                style={s(styles.modalDismissIconCircularButton)} 
                onPress={() => setShowAcknowledgementModal(false)}
              >
                <X size={fs(4)} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={s(styles.modalDynamicBodyScrollingRegion)} showsVerticalScrollIndicator={false}>
              <Text style={s(styles.modalAnnouncementContentTitle)}>{selectedAnnouncement?.title}</Text>
              <Text style={s(styles.modalAnnouncementContentBody)}>{selectedAnnouncement?.body}</Text>
              
              <View style={s(styles.warningAcknowledgementCardNoticeBox)}>
                <AlertTriangle size={fs(4)} color="#fb923c" style={s({ marginRight: wp(2.5), marginTop: hp(0.25) })} />
                <Text style={s(styles.warningAcknowledgementNoticeParagraphText)}>
                  By confirming below, you certify that you have read, understand, and agree to adhere to the updates detailed above.
                </Text>
              </View>
            </ScrollView>

            <View style={s(styles.modalActionWorkflowFooterPanel)}>
              <TouchableOpacity
                style={s(styles.modalDismissFallbackButton)}
                onPress={() => setShowAcknowledgementModal(false)}
              >
                <Text style={s(styles.modalDismissFallbackButtonText)}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={s(styles.modalExecuteSuccessButton)}
                disabled={acknowledgeMutation.isPending}
                onPress={() => selectedAnnouncement && acknowledgeMutation.mutate(selectedAnnouncement.id)}
              >
                {acknowledgeMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={s(styles.modalExecuteSuccessButtonText)}>I Acknowledge</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  mainLayoutContainer: { 
    flex: 1, 
    backgroundColor: '#090d13' 
  },
  controlDeckWidgetCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: wp(4),
    padding: wp(3),
    marginHorizontal: wp(3),
    marginTop: hp(1),
    marginBottom: hp(0.75),
  },
  identityRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(1.5),
  },
  brandingBoxIcon: {
    width: wp(9),
    height: wp(9),
    borderRadius: wp(2.5),
    backgroundColor: 'rgba(0, 198, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: wp(3),
  },
  layoutTitleHeading: {
    fontSize: fs(4.5),
    fontWeight: '800',
    color: '#fff'
  },
  layoutSubtitleText: {
    fontSize: fs(2.8),
    color: 'rgba(255,255,255,0.5)',
    marginTop: hp(0.1)
  },
  metricsBarWrapperRow: {
    flexDirection: 'row',
    gap: wp(1.5),
    marginBottom: hp(1.5),
  },
  metricChipButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
    borderRadius: wp(2),
    paddingVertical: hp(0.75),
    paddingHorizontal: wp(2),
  },
  metricChipButtonActive: {
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  metricChipValue: {
    color: '#fff',
    fontSize: fs(3),
    fontWeight: '700',
    marginLeft: wp(1.5),
    marginRight: wp(1),
  },
  metricChipLabel: {
    color: '#8b949e',
    fontSize: fs(2.5),
    fontWeight: '500',
  },
  inlineHorizontalTabsStrip: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: wp(2),
    padding: wp(0.75),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
  },
  navigationTabButtonItem: {
    flex: 1,
    paddingVertical: hp(0.75),
    alignItems: 'center',
    borderRadius: wp(1.5),
  },
  navigationTabButtonActive: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  navigationTabTextItem: {
    color: '#8b949e',
    fontSize: fs(2.8),
    fontWeight: '600',
  },
  navigationTabActiveText: {
    color: '#fff',
  },
  scrollListContainer: {
    paddingHorizontal: wp(3),
    paddingBottom: hp(4),
    paddingTop: hp(0.5),
  },
  announcementCardLayoutBox: {
    borderRadius: wp(3),
    borderWidth: 1,
    padding: wp(3.5),
    marginBottom: hp(1.2),
    position: 'relative',
    backgroundColor: 'rgba(255, 255, 255, 0.015)',
  },
  cardBorderEmergency: {
    borderColor: 'rgba(239, 68, 68, 0.4)',
    backgroundColor: 'rgba(239, 68, 68, 0.03)',
  },
  cardBorderUnread: {
    borderColor: 'rgba(0, 198, 255, 0.25)',
    backgroundColor: 'rgba(0, 198, 255, 0.015)',
  },
  cardBorderNormal: {
    borderColor: 'rgba(255,255,255,0.04)',
  },
  alertHeaderEmergencyBadgeStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    paddingVertical: hp(0.4),
    paddingHorizontal: wp(2),
    borderRadius: wp(5),
    marginBottom: hp(1.2),
  },
  alertHeaderEmergencyBadgeText: {
    color: '#f87171',
    fontSize: fs(2.2),
    fontWeight: '800',
    marginLeft: wp(1),
    letterSpacing: 0.3,
  },
  unreadPulseIndicatorDot: {
    position: 'absolute',
    top: hp(1.5),
    right: wp(3.5),
    width: wp(1.8),
    height: wp(1.8),
    borderRadius: wp(0.9),
    backgroundColor: '#00C6FF',
  },
  announcementCardTitleText: {
    fontSize: fs(3.8),
    fontWeight: '700',
    color: '#fff',
    lineHeight: fs(5),
  },
  badgeWrapFlexContainerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(1.5),
    marginTop: hp(1),
    marginBottom: hp(0.75),
  },
  badgeContainerView: {
    borderWidth: 1,
    paddingVertical: hp(0.25),
    paddingHorizontal: wp(2),
    borderRadius: wp(1.5),
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeContentLabelText: {
    fontSize: fs(2.5),
    fontWeight: '700',
  },
  badgeAckRequired: {
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
    borderColor: 'rgba(249, 115, 22, 0.15)',
  },
  badgeAckSuccess: {
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    borderColor: 'rgba(74, 222, 128, 0.15)',
  },
  metaInformationLineText: {
    fontSize: fs(2.8),
    color: 'rgba(255,255,255,0.4)',
    marginVertical: hp(0.5),
  },
  bodyDescriptionPreviewText: {
    fontSize: fs(3.2),
    color: 'rgba(255,255,255,0.75)',
    lineHeight: fs(4.5),
    marginVertical: hp(0.5),
  },
  actionButtonsContainerRow: {
    flexDirection: 'row',
    gap: wp(2),
    marginTop: hp(1.2),
  },
  interactiveActionButtonBase: {
    flex: 1,
    height: hp(4.2),
    borderRadius: wp(2),
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  buttonVariantOutline: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  buttonVariantSuccessFilled: {
    backgroundColor: '#166534',
  },
  buttonActionTextLabel: {
    fontSize: fs(3),
    fontWeight: '600',
    color: '#f0f6fc',
  },
  dashboardFramedEmptyLayoutView: {
    backgroundColor: 'rgba(255,255,255,0.01)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
    borderRadius: wp(4),
    paddingVertical: hp(5.5),
    paddingHorizontal: wp(5),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: hp(2),
  },
  emptyIconCircleWrapperBorder: {
    width: wp(12),
    height: wp(12),
    borderRadius: wp(6),
    backgroundColor: 'rgba(255,255,255,0.02)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp(1.5),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  emptyViewHeaderTitleText: {
    fontSize: fs(3.5),
    fontWeight: '700',
    color: '#f0f6fc',
    marginBottom: hp(0.5),
  },
  emptyViewParagraphBodyText: {
    color: '#8b949e',
    fontSize: fs(2.8),
    textAlign: 'center',
    lineHeight: fs(4),
  },
  loaderCenterContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#090d13',
  },
  loadingPulseText: {
    marginTop: hp(1.5),
    color: '#8b949e',
    fontSize: fs(3),
    fontWeight: '500',
  },
  modalScreenOverlayContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContentSheetSurfaceCard: {
    backgroundColor: '#0d1117',
    borderTopLeftRadius: wp(5),
    borderTopRightRadius: wp(5),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingBottom: hp(4.2),
    maxHeight: '80%',
  },
  modalHeaderTitleControlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: wp(4),
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  modalHeadingTitleText: {
    fontSize: fs(3.8),
    fontWeight: '800',
    color: '#fff',
  },
  modalDismissIconCircularButton: {
    width: wp(6.5),
    height: wp(6.5),
    borderRadius: wp(3.25),
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalDynamicBodyScrollingRegion: {
    padding: wp(4),
  },
  modalAnnouncementContentTitle: {
    fontSize: fs(4.5),
    fontWeight: '700',
    color: '#fff',
    marginBottom: hp(1.5),
  },
  modalAnnouncementContentBody: {
    fontSize: fs(3.5),
    color: 'rgba(255,255,255,0.8)',
    lineHeight: fs(5.5),
    marginBottom: hp(2.5),
  },
  warningAcknowledgementCardNoticeBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(249, 115, 22, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.15)',
    padding: wp(3),
    borderRadius: wp(2.5),
    marginBottom: hp(3),
  },
  warningAcknowledgementNoticeParagraphText: {
    flex: 1,
    fontSize: fs(3),
    color: '#fb923c',
    lineHeight: fs(4.5),
  },
  modalActionWorkflowFooterPanel: {
    flexDirection: 'row',
    gap: wp(2.5),
    paddingHorizontal: wp(4),
    marginTop: hp(1),
  },
  modalDismissFallbackButton: {
    flex: 1,
    height: hp(5.2),
    borderRadius: wp(2),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  modalDismissFallbackButtonText: {
    color: '#8b949e',
    fontSize: fs(3.2),
    fontWeight: '600',
  },
  modalExecuteSuccessButton: {
    flex: 2,
    height: hp(5.2),
    borderRadius: wp(2),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#16a34a',
  },
  modalExecuteSuccessButtonText: {
    color: '#fff',
    fontSize: fs(3.2),
    fontWeight: '700',
  },
});