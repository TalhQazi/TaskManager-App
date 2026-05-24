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

export type AnnouncementPriority =
  | 'low'
  | 'medium'
  | 'high'
  | 'critical';

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

export default function AnnouncementsScreen() {
  const insets = useSafeAreaInsets();

  const queryClient = useQueryClient();

  const [selectedAnnouncement, setSelectedAnnouncement] =
    useState<Announcement | null>(null);

  const [tab, setTab] = useState<
    'unread' | 'all' | 'important' | 'emergency'
  >('unread');

  const {
    data: announcements = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery<Announcement[]>({
    queryKey: ['announcements', tab],

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
        return announcements.filter(
          (a) =>
            a.priority === 'high' ||
            a.priority === 'critical'
        );

      case 'emergency':
        return announcements.filter(
          (a) => a.emergency
        );

      default:
        return announcements;
    }
  }, [announcements, tab]);

  const readMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest(`/announcements/${id}/read`, {
        method: 'POST',
      });
    },

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['announcements'],
      });
    },
  });

  const acknowledgeMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest(
        `/announcements/${id}/acknowledge`,
        {
          method: 'POST',
        }
      );
    },

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['announcements'],
      });
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
        <ActivityIndicator
          size="large"
          color={Colors.primary}
        />

        <Text style={styles.loadingText}>
          Loading announcements...
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top-30,
        },
      ]}
    >
      <AnnouncementHeader
        unreadCount={
          announcements.filter((a) => !a.isRead)
            .length
        }
      />

      <AnnouncementTabs
        activeTab={tab}
        onChange={setTab}
      />

      <FlatList
        data={filteredAnnouncements}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
          />
        }
        renderItem={({ item }) => (
          <AnnouncementCard
            item={item}
            onPress={() => handleOpen(item)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>
              No announcements
            </Text>

            <Text style={styles.emptySubtitle}>
              You're all caught up
            </Text>
          </View>
        }
      />

      <AnnouncementModal
        visible={!!selectedAnnouncement}
        announcement={selectedAnnouncement}
        onClose={() =>
          setSelectedAnnouncement(null)
        }
        onAcknowledge={(id) =>
          acknowledgeMutation.mutate(id)
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  list: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },

  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: Colors.textSecondary,
  },

  emptyContainer: {
    alignItems: 'center',
    marginTop: 100,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },

  emptySubtitle: {
    marginTop: 6,
    color: Colors.textSecondary,
  },
});