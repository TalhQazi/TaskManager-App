import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/colors';
import { apiRequest } from '@/services/api';

import AnnouncementHeader from '@/components/announcements/AnnouncementHeader';
import AnnouncementTabs from '@/components/announcements/AnnouncementTabs';
import AnnouncementCard from '@/components/announcements/AnnouncementCard';
import AnnouncementModal from '@/components/announcements/AnnouncementModal';

export type AnnouncementPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Announcement {
  id: string;
  title: string;
  body: string;
  priority: AnnouncementPriority;
  emergency: boolean;
  requiresAcknowledgement: boolean;
  isAcknowledged: boolean;
  isRead: boolean;
  authorName: string;
  createdAt: string;
  expiresAt?: string;
}

interface AnnouncementsScreenProps {
  /** Separates caching & data tracking between 'employee' and 'manager' screens */
  cacheScope?: 'employee' | 'manager';
}

export default function AnnouncementsScreen({ cacheScope = 'employee' }: AnnouncementsScreenProps) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [tab, setTab] = useState<'unread' | 'all' | 'important' | 'emergency'>('unread');

  // Scoping cacheKey by 'employee-announcements' or 'manager-announcements'
  const queryScopeKey = `${cacheScope}-announcements`;

  const {
    data: announcements = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery<Announcement[]>({
    queryKey: [queryScopeKey, tab],
    queryFn: async () => {
      const res = await apiRequest<{ items: Announcement[] }>(
        `/announcements?filter=${tab}`
      );
      return res.data?.items || [];
    },
  });

  const filteredAnnouncements = useMemo(() => {
    switch (tab) {
      case 'unread':
        return announcements.filter((a) => !a.isRead);
      case 'important':
        return announcements.filter((a) => a.priority === 'high' || a.priority === 'critical');
      case 'emergency':
        return announcements.filter((a) => a.emergency);
      default:
        return announcements;
    }
  }, [announcements, tab]);

  const readMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest(`/announcements/${id}/read`, { method: 'POST' });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [queryScopeKey] });
    },
  });

  const acknowledgeMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest(`/announcements/${id}/acknowledge`, { method: 'POST' });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [queryScopeKey] });
    },
  });

  const handleOpen = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    if (!announcement.isRead) {
      readMutation.mutate(announcement.id);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={Colors.primary || '#1f6feb'} />
        <Text style={styles.loadingText}>Loading announcements...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top - 30 }]}>
      <AnnouncementHeader unreadCount={announcements.filter((a) => !a.isRead).length} />
      <AnnouncementTabs activeTab={tab} onChange={setTab} />

      <FlatList
        data={filteredAnnouncements}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={isRefetching} 
            onRefresh={refetch} 
            tintColor={Colors.primary || '#1f6feb'}
          />
        }
        renderItem={({ item }) => (
          <AnnouncementCard item={item} onPress={() => handleOpen(item)} />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No announcements</Text>
            <Text style={styles.emptySubtitle}>You're all caught up</Text>
          </View>
        }
      />

      <AnnouncementModal
        visible={!!selectedAnnouncement}
        announcement={selectedAnnouncement}
        onClose={() => setSelectedAnnouncement(null)}
        onAcknowledge={(id) => acknowledgeMutation.mutate(id)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background || '#0D1117' },
  list: { paddingHorizontal: 16, paddingBottom: 30 },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background || '#0D1117' },
  loadingText: { marginTop: 12, fontSize: 15, color: '#8b949e' },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  emptySubtitle: { marginTop: 6, color: '#8b949e' },
});