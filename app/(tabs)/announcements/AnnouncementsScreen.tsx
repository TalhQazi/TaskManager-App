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
      <View style={styles.loaderCenterContainer}>
        <ActivityIndicator size="large" color="#00C6FF" />
        <Text style={styles.loadingPulseText}>Refreshing control feed...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.mainLayoutContainer, { paddingTop: insets.top - insets.top  }]}>
      
      {/* HIGH-DENSITY DASHBOARD PANEL */}
      <View style={styles.controlDeckWidgetCard}>
        <View style={styles.identityRowHeader}>
          <View style={styles.brandingBoxIcon}>
            <Bell size={20} color="#00C6FF" />
          </View>
          <View>
            <Text style={styles.layoutTitleHeading}>Announcements</Text>
            <Text style={styles.layoutSubtitleText}>Stay updated with operational instructions</Text>
          </View>
        </View>

        {/* METRICS ROW STRIP CHIPS */}
        <View style={styles.metricsBarWrapperRow}>
          <TouchableOpacity 
            style={[styles.metricChipButton, tab === 'unread' && styles.metricChipButtonActive]} 
            onPress={() => setTab('unread')}
          >
            <Bell size={12} color={tab === 'unread' ? '#00C6FF' : '#8b949e'} />
            <Text style={[styles.metricChipValue, tab === 'unread' && { color: '#00C6FF' }]}>
              {metrics.unreadCount}
            </Text>
            <Text style={styles.metricChipLabel}>Unread</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.metricChipButton, tab === 'all' && styles.metricChipButtonActive]} 
            onPress={() => setTab('all')}
          >
            <Layers size={12} color="#8b949e" />
            <Text style={styles.metricChipValue}>{metrics.totalCount}</Text>
            <Text style={styles.metricChipLabel}>All</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.metricChipButton, tab === 'emergency' && styles.metricChipButtonActive]} 
            onPress={() => setTab('emergency')}
          >
            <Flame size={12} color="#f87171" />
            <Text style={[styles.metricChipValue, { color: '#f87171' }]}>{metrics.emergencyCount}</Text>
            <Text style={styles.metricChipLabel}>Urgent</Text>
          </TouchableOpacity>
        </View>

        {/* TAB NAVIGATION ROW CONTROLS */}
        <View style={styles.inlineHorizontalTabsStrip}>
          {['unread', 'all', 'important', 'emergency'].map((tabKey) => (
            <TouchableOpacity
              key={tabKey}
              onPress={() => setTab(tabKey)}
              style={[styles.navigationTabButtonItem, tab === tabKey && styles.navigationTabButtonActive]}
            >
              <Text style={[styles.navigationTabTextItem, tab === tabKey && styles.navigationTabActiveText]}>
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
        contentContainerStyle={styles.scrollListContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#00C6FF" />
        }
        renderItem={({ item }) => {
          const uiColors = priorityColors[item.priority] || priorityColors.low;
          return (
            <View style={[
              styles.announcementCardLayoutBox,
              item.emergency ? styles.cardBorderEmergency : !item.isRead ? styles.cardBorderUnread : styles.cardBorderNormal
            ]}>
              {item.emergency && (
                <View style={styles.alertHeaderEmergencyBadgeStrip}>
                  <AlertTriangle size={12} color="#f87171" />
                  <Text style={styles.alertHeaderEmergencyBadgeText}>EMERGENCY</Text>
                </View>
              )}

              {!item.isRead && !item.emergency && (
                <View style={styles.unreadPulseIndicatorDot} />
              )}

              <Text style={styles.announcementCardTitleText}>{item.title}</Text>

              {/* DENSE BADGE CONTAINER LAYOUTS */}
              <View style={styles.badgeWrapFlexContainerRow}>
                <View style={[styles.badgeContainerView, { backgroundColor: uiColors.bg, borderColor: uiColors.border }]}>
                  <Text style={[styles.badgeContentLabelText, { color: uiColors.text }]}>
                    {item.priority.toUpperCase()}
                  </Text>
                </View>

                {item.requiresAcknowledgement && !item.isAcknowledged && (
                  <View style={[styles.badgeContainerView, styles.badgeAckRequired]}>
                    <Text style={[styles.badgeContentLabelText, { color: '#fb923c' }]}>Requires Ack</Text>
                  </View>
                )}

                {item.isAcknowledged && (
                  <View style={[styles.badgeContainerView, styles.badgeAckSuccess]}>
                    <CheckCircle2 size={10} color="#4ade80" style={{ marginRight: 4 }} />
                    <Text style={[styles.badgeContentLabelText, { color: '#4ade80' }]}>Acknowledged</Text>
                  </View>
                )}
              </View>

              <Text style={styles.metaInformationLineText}>
                From {item.authorName} • {new Date(item.createdAt).toLocaleDateString()}
              </Text>

              <Text style={styles.bodyDescriptionPreviewText} numberOfLines={3}>
                {item.body}
              </Text>

              {/* CONTROL INTERACTIVE ROUTING PANEL */}
              <View style={styles.actionButtonsContainerRow}>
                <TouchableOpacity 
                  activeOpacity={0.7}
                  disabled={readMutation.isPending}
                  style={[styles.interactiveActionButtonBase, styles.buttonVariantOutline]}
                  onPress={() => handleActionPress(item)}
                >
                  {item.isRead ? (
                    <>
                      <Eye size={14} color="#f0f6fc" style={{ marginRight: 6 }} />
                      <Text style={styles.buttonActionTextLabel}>Read</Text>
                    </>
                  ) : (
                    <>
                      <EyeOff size={14} color="#00C6FF" style={{ marginRight: 6 }} />
                      <Text style={[styles.buttonActionTextLabel, { color: '#00C6FF' }]}>Mark as Read</Text>
                    </>
                  )}
                </TouchableOpacity>

                {item.requiresAcknowledgement && !item.isAcknowledged && (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={[styles.interactiveActionButtonBase, styles.buttonVariantSuccessFilled]}
                    onPress={() => {
                      setSelectedAnnouncement(item);
                      setShowAcknowledgementModal(true);
                    }}
                  >
                    <CheckCircle2 size={14} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={[styles.buttonActionTextLabel, { color: '#fff', fontWeight: '700' }]}>
                      Acknowledge
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.dashboardFramedEmptyLayoutView}>
            <View style={styles.emptyIconCircleWrapperBorder}>
              <Inbox size={28} color="rgba(255,255,255,0.2)" />
            </View>
            <Text style={styles.emptyViewHeaderTitleText}>No announcements</Text>
           
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
        <View style={styles.modalScreenOverlayContainer}>
          <View style={styles.modalContentSheetSurfaceCard}>
            <View style={styles.modalHeaderTitleControlsRow}>
              <Text style={styles.modalHeadingTitleText}>Review Directive</Text>
              <TouchableOpacity 
                style={styles.modalDismissIconCircularButton} 
                onPress={() => setShowAcknowledgementModal(false)}
              >
                <X size={16} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalDynamicBodyScrollingRegion} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalAnnouncementContentTitle}>{selectedAnnouncement?.title}</Text>
              <Text style={styles.modalAnnouncementContentBody}>{selectedAnnouncement?.body}</Text>
              
              <View style={styles.warningAcknowledgementCardNoticeBox}>
                <AlertTriangle size={16} color="#fb923c" style={{ marginRight: 10, marginTop: 2 }} />
                <Text style={styles.warningAcknowledgementNoticeParagraphText}>
                  By confirming below, you certify that you have read, understand, and agree to adhere to the updates detailed above.
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalActionWorkflowFooterPanel}>
              <TouchableOpacity
                style={styles.modalDismissFallbackButton}
                onPress={() => setShowAcknowledgementModal(false)}
              >
                <Text style={styles.modalDismissFallbackButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalExecuteSuccessButton}
                disabled={acknowledgeMutation.isPending}
                onPress={() => selectedAnnouncement && acknowledgeMutation.mutate(selectedAnnouncement.id)}
              >
                {acknowledgeMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalExecuteSuccessButtonText}>I Acknowledge</Text>
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
    borderRadius: 16,
    padding: 12,
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 6,
  },
  identityRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  brandingBoxIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 198, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  layoutTitleHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff'
  },
  layoutSubtitleText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 1
  },
  metricsBarWrapperRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  metricChipButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  metricChipButtonActive: {
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  metricChipValue: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
    marginRight: 4,
  },
  metricChipLabel: {
    color: '#8b949e',
    fontSize: 10,
    fontWeight: '500',
  },
  inlineHorizontalTabsStrip: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 8,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
  },
  navigationTabButtonItem: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 6,
  },
  navigationTabButtonActive: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  navigationTabTextItem: {
    color: '#8b949e',
    fontSize: 11,
    fontWeight: '600',
  },
  navigationTabActiveText: {
    color: '#fff',
  },
  scrollListContainer: {
    paddingHorizontal: 12,
    paddingBottom: 32,
    paddingTop: 4,
  },
  announcementCardLayoutBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
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
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 20,
    marginBottom: 10,
  },
  alertHeaderEmergencyBadgeText: {
    color: '#f87171',
    fontSize: 9,
    fontWeight: '800',
    marginLeft: 4,
    letterSpacing: 0.3,
  },
  unreadPulseIndicatorDot: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#00C6FF',
  },
  announcementCardTitleText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    lineHeight: 20,
  },
  badgeWrapFlexContainerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
    marginBottom: 6,
  },
  badgeContainerView: {
    borderWidth: 1,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeContentLabelText: {
    fontSize: 10,
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
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    marginVertical: 4,
  },
  bodyDescriptionPreviewText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 18,
    marginVertical: 4,
  },
  actionButtonsContainerRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  interactiveActionButtonBase: {
    flex: 1,
    height: 34,
    borderRadius: 8,
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
    fontSize: 12,
    fontWeight: '600',
    color: '#f0f6fc',
  },
  dashboardFramedEmptyLayoutView: {
    backgroundColor: 'rgba(255,255,255,0.01)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    paddingVertical: 44,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  emptyIconCircleWrapperBorder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.02)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  emptyViewHeaderTitleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f0f6fc',
    marginBottom: 4,
  },
  emptyViewParagraphBodyText: {
    color: '#8b949e',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
  loaderCenterContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#090d13',
  },
  loadingPulseText: {
    marginTop: 12,
    color: '#8b949e',
    fontSize: 12,
    fontWeight: '500',
  },
  modalScreenOverlayContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContentSheetSurfaceCard: {
    backgroundColor: '#0d1117',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingBottom: 34,
    maxHeight: '80%',
  },
  modalHeaderTitleControlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  modalHeadingTitleText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
  },
  modalDismissIconCircularButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalDynamicBodyScrollingRegion: {
    padding: 16,
  },
  modalAnnouncementContentTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  modalAnnouncementContentBody: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 22,
    marginBottom: 20,
  },
  warningAcknowledgementCardNoticeBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(249, 115, 22, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.15)',
    padding: 12,
    borderRadius: 10,
    marginBottom: 24,
  },
  warningAcknowledgementNoticeParagraphText: {
    flex: 1,
    fontSize: 12,
    color: '#fb923c',
    lineHeight: 18,
  },
  modalActionWorkflowFooterPanel: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  modalDismissFallbackButton: {
    flex: 1,
    height: 42,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  modalDismissFallbackButtonText: {
    color: '#8b949e',
    fontSize: 13,
    fontWeight: '600',
  },
  modalExecuteSuccessButton: {
    flex: 2,
    height: 42,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#16a34a',
  },
  modalExecuteSuccessButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
});