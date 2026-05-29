import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Modal,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Edit3, MessageCircle, Menu, Search, X, User } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useSidebar } from '@/contexts/SidebarContext';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/services/api';
import { Conversation } from '@/types';

type UserItem = {
  id: string;
  name: string;
  username?: string;
  email?: string;
  role: string;
  status?: string;
  avatarUrl?: string;
};

export default function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { openSidebar } = useSidebar();
  const { user } = useAuth();
  const [showUserList, setShowUserList] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: conversations } = useQuery<Conversation[]>({
    queryKey: ['conversations'],
    queryFn: async () => {
      try {
        const res = await apiRequest<{ items: any[] }>('/messages');
        const items = res.data?.items ?? [];

        const myId = user?.id || user?.fullName || user?.username || 'employee';

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

  // Fetch all users for messaging
  const { data: allUsers } = useQuery<UserItem[]>({
    queryKey: ['allUsers'],
    queryFn: async () => {
      try {
        const res = await apiRequest<{ items: UserItem[] }>('/users/all');
        return res.data?.items ?? [];
      } catch {
        return [];
      }
    },
    enabled: showUserList,
  });

  const myId = user?.id || user?.fullName || user?.username || 'employee';

  // Filter out current user and apply search
  const filteredUsers = allUsers?.filter(u => {
    if (u.id === myId) return false;
    if (u.username === myId) return false;
    if (u.name === myId) return false;
    
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      u.name?.toLowerCase().includes(query) ||
      u.username?.toLowerCase().includes(query) ||
      u.email?.toLowerCase().includes(query) ||
      u.role?.toLowerCase().includes(query)
    );
  }) ?? [];

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

  const startConversation = (targetUser: UserItem) => {
    setShowUserList(false);
    const conversationId = targetUser.username || targetUser.name || targetUser.id;
    router.push(`/(tabs)/messages/${encodeURIComponent(conversationId)}` as any);
  };

  const renderUserItem = ({ item }: { item: UserItem }) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => startConversation(item)}
      activeOpacity={0.7}
    >
      <View style={styles.userAvatarContainer}>
        {item.avatarUrl ? (
          <Image source={{ uri: item.avatarUrl }} style={styles.userAvatar} />
        ) : (
          <View style={styles.userAvatarPlaceholder}>
            <Text style={styles.userAvatarInitial}>{item.name?.charAt(0)?.toUpperCase()}</Text>
          </View>
        )}
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.userRole}>{item.role}</Text>
        {item.email && <Text style={styles.userEmail}>{item.email}</Text>}
      </View>
      <MessageCircle color={Colors.primary} size={20} />
    </TouchableOpacity>
  );

  const renderConversation = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={styles.convItem}
      onPress={() => router.push(`/(tabs)/messages/${encodeURIComponent(item.id)}` as any)}
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
      <Text style={styles.emptySubtitle}>Tap the + button to start a conversation</Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: /*insets.top*/0 }]}>
      <View style={styles.header}>
       {/* <TouchableOpacity
          style={styles.hamburgerBtn}
          onPress={openSidebar}
          activeOpacity={0.7}
          testID="messages-hamburger"
        >
          <Menu color={Colors.surface} size={22} />
        </TouchableOpacity>*/}
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity 
          style={styles.composeBtn}
          onPress={() => setShowUserList(true)}
        >
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

      {/* User Selection Modal */}
      <Modal
        visible={showUserList}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowUserList(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Message</Text>
              <TouchableOpacity onPress={() => setShowUserList(false)}>
                <X color={Colors.text} size={24} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <Search color={Colors.textTertiary} size={18} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search users..."
                placeholderTextColor={Colors.textTertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <FlatList
              data={filteredUsers}
              renderItem={renderUserItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.userList}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={() => (
                <View style={styles.emptyUsersContainer}>
                  <User color={Colors.textTertiary} size={48} />
                  <Text style={styles.emptyUsersText}>No users found</Text>
                </View>
              )}
            />
          </View>
        </View>
      </Modal>
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 8,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
  },
  userList: {
    paddingHorizontal: 20,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  userAvatarContainer: {
    width: 48,
    height: 48,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  userAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.infoLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarInitial: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  userRole: {
    fontSize: 12,
    color: Colors.textTertiary,
    textTransform: 'capitalize' as const,
    marginTop: 2,
  },
  userEmail: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  emptyUsersContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyUsersText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
