import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Edit3, MessageCircle, Menu } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useSidebar } from '@/contexts/SidebarContext';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/services/api';
import { Conversation } from '@/types';

export default function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { openSidebar } = useSidebar();
  const { user } = useAuth();

  const { data: conversations } = useQuery<Conversation[]>({
    queryKey: ['conversations'],
    queryFn: async () => {
      try {
        const res = await apiRequest<{ items: any[] }>('/messages');
        const items = res.data?.items ?? [];

        const myId = user?.id || user?.fullName || 'employee';

        const map = new Map<string, any>();
        for (const m of items) {
          const sender = String(m.sender || '');
          const recipient = String(m.recipient || '');
          const other = sender === myId ? recipient : sender;
          if (!other) continue;

          const prev = map.get(other);
          if (!prev || new Date(String(m.timestamp || 0)).getTime() > new Date(String(prev.timestamp || 0)).getTime()) {
            map.set(other, m);
          }
        }

        const derived: Conversation[] = Array.from(map.entries()).map(([other, last]) => ({
          id: other,
          participantName: other,
          participantRole: String(last.type || ''),
          participantAvatar: String(last.senderAvatar || ''),
          lastMessage: String(last.content || ''),
          lastMessageTime: String(last.timestamp || new Date().toISOString()),
          unreadCount: 0,
        }));

        return derived;
      } catch {
        return [];
      }
    },
  });

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 24) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const renderConversation = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={styles.convItem}
      onPress={() => router.push(`/(tabs)/messages/${item.id}` as any)}
      activeOpacity={0.7}
      testID={`conversation-${item.id}`}
    >
      <View style={styles.avatarContainer}>
        {item.participantAvatar ? (
          <Image source={{ uri: item.participantAvatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>
              {item.participantName.charAt(0)}
            </Text>
          </View>
        )}
        {item.unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{item.unreadCount}</Text>
          </View>
        )}
      </View>

      <View style={styles.convContent}>
        <View style={styles.convTopRow}>
          <Text
            style={[styles.convName, item.unreadCount > 0 && styles.convNameUnread]}
            numberOfLines={1}
          >
            {item.participantName}
          </Text>
          <Text style={styles.convTime}>{formatTime(item.lastMessageTime)}</Text>
        </View>
        <Text style={styles.convRole}>{item.participantRole}</Text>
        <Text
          style={[styles.convLastMsg, item.unreadCount > 0 && styles.convLastMsgUnread]}
          numberOfLines={1}
        >
          {item.lastMessage}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <MessageCircle color={Colors.textTertiary} size={48} />
      <Text style={styles.emptyTitle}>No messages yet</Text>
      <Text style={styles.emptySubtitle}>Your conversations will appear here</Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.hamburgerBtn}
          onPress={openSidebar}
          activeOpacity={0.7}
          testID="messages-hamburger"
        >
          <Menu color={Colors.surface} size={22} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity style={styles.composeBtn}>
          <Edit3 color={Colors.surface} size={18} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <FlatList
          data={conversations}
          renderItem={renderConversation}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmpty}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
  },
  hamburgerBtn: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  composeBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  listContent: {
    paddingTop: 12,
    paddingBottom: 24,
  },
  convItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 14,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.infoLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  unreadBadge: {
    position: 'absolute',
    top: -2,
    right: -4,
    backgroundColor: Colors.secondary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: Colors.background,
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700' as const,
  },
  convContent: {
    flex: 1,
  },
  convTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  convName: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: Colors.text,
    flex: 1,
  },
  convNameUnread: {
    fontWeight: '700' as const,
  },
  convTime: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginLeft: 8,
  },
  convRole: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 1,
  },
  convLastMsg: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 3,
  },
  convLastMsgUnread: {
    color: Colors.text,
    fontWeight: '500' as const,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginLeft: 84,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
