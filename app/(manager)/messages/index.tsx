import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Search, MessageSquare, User, Plus } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import { apiRequest } from '@/services/api';

interface User {
  id: string;
  fullName?: string;
  name?: string;
  email: string;
  role: string;
  jobTitle?: string;
  department?: string;
}

interface Conversation {
  id: string;
  participantId: string;
  participantName: string;
  participantRole: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

export default function MessagesScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showContacts, setShowContacts] = useState(false);

  // Fetch conversations using existing endpoint
  const { data: conversations = [], isLoading: conversationsLoading, refetch: refetchConversations } = useQuery<Conversation[]>({
    queryKey: ['conversations'],
    queryFn: async () => {
      const userId = 'current-user'; // Backend will identify from auth token
      const res = await apiRequest<{ items?: any[] }>(`/messages/conversations/${userId}`);
      // Map backend response to frontend format
      return res.data?.items?.map((conv: any) => ({
        id: conv.id || `${conv.employee?.id}`,
        participantId: conv.employee?.id || conv.employee?.name,
        participantName: conv.employee?.name || 'Unknown',
        participantRole: conv.employee?.department || 'Employee',
        lastMessage: conv.lastMessage?.content || 'No messages',
        lastMessageTime: conv.lastMessage?.timestamp || conv.lastMessage?.createdAt,
        unreadCount: conv.unreadCount || 0,
      })) || [];
    },
  });

  // Fetch all users for contacts list
  const { data: users = [], isLoading: usersLoading, refetch: refetchUsers } = useQuery<User[]>({
    queryKey: ['chatUsers'],
    queryFn: async () => {
      const res = await apiRequest<{ items?: User[] }>('/employees');
      return res.data?.items || [];
    },
    enabled: showContacts,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchConversations(), refetchUsers()]);
    setRefreshing(false);
  }, [refetchConversations, refetchUsers]);

  const filteredUsers = users.filter((user) =>
    (user.fullName || user.name || user.email)?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.role?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.jobTitle?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (timestamp: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getInitials = (name: string) => {
    return name
      ?.split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?';
  };

  const getRoleColor = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'admin':
      case 'superadmin':
        return Colors.error;
      case 'manager':
        return Colors.primary;
      case 'employee':
        return Colors.success;
      default:
        return Colors.textSecondary;
    }
  };

  const handleChatPress = (userId: string, userName: string, userRole: string) => {
    router.push({
      pathname: '/(manager)/messages/chat',
      params: { userId, userName, userRole },
    });
  };

  // Show loading screen when data is loading initially
  if (conversationsLoading && !refreshing) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Messages</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading conversations...</Text>
        </View>
      </View>
    );
  }

  if (showContacts) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setShowContacts(false)} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>New Chat</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchBox}>
            <Search size={20} color={Colors.textTertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search contacts..."
              placeholderTextColor={Colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
          </View>
        </View>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing || usersLoading} onRefresh={onRefresh} />}
        >
          <Text style={styles.sectionTitle}>All Contacts ({filteredUsers.length})</Text>
          
          {filteredUsers.length === 0 ? (
            <View style={styles.emptyState}>
              <User size={48} color={Colors.textTertiary} />
              <Text style={styles.emptyText}>No contacts found</Text>
            </View>
          ) : (
            filteredUsers.map((user) => (
              <TouchableOpacity
                key={user.id}
                style={styles.contactCard}
                onPress={() => handleChatPress(user.id, user.fullName || user.name || user.email, user.role)}
                activeOpacity={0.7}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{getInitials(user.fullName || user.name || user.email)}</Text>
                </View>
                <View style={styles.contactInfo}>
                  <View style={styles.nameRow}>
                    <Text style={styles.contactName}>{user.fullName || user.name || user.email}</Text>
                    <View style={[styles.roleBadge, { backgroundColor: `${getRoleColor(user.role)}20` }]}>
                      <Text style={[styles.roleText, { color: getRoleColor(user.role) }]}>
                        {user.role}
                      </Text>
                    </View>
                  </View>
                  {user.jobTitle && (
                    <Text style={styles.contactSubtitle}>{user.jobTitle}</Text>
                  )}
                  <Text style={styles.contactEmail}>{user.email}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
          <View style={{ height: 20 }} />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        <TouchableOpacity style={styles.newChatButton} onPress={() => setShowContacts(true)}>
          <Plus size={24} color={Colors.surface} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing || conversationsLoading} onRefresh={onRefresh} />}
      >
        {conversations.length === 0 ? (
          <View style={styles.emptyState}>
            <MessageSquare size={64} color={Colors.textTertiary} />
            <Text style={styles.emptyTitle}>No messages yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap the + button to start a new chat
            </Text>
            <TouchableOpacity style={styles.startChatButton} onPress={() => setShowContacts(true)}>
              <Text style={styles.startChatText}>Start New Chat</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Recent Chats</Text>
            {conversations.map((conversation) => (
              <TouchableOpacity
                key={conversation.id}
                style={styles.conversationCard}
                onPress={() => handleChatPress(conversation.participantId, conversation.participantName, conversation.participantRole)}
                activeOpacity={0.7}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{getInitials(conversation.participantName)}</Text>
                </View>
                <View style={styles.conversationInfo}>
                  <View style={styles.conversationHeader}>
                    <Text style={styles.conversationName}>{conversation.participantName}</Text>
                    <Text style={styles.timeText}>{formatTime(conversation.lastMessageTime)}</Text>
                  </View>
                  <View style={styles.messageRow}>
                    <Text style={[styles.lastMessage, conversation.unreadCount > 0 && styles.unreadMessage]} numberOfLines={1}>
                      {conversation.lastMessage}
                    </Text>
                    {conversation.unreadCount > 0 && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{conversation.unreadCount}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}
        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  backText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600' as const,
  },
  placeholder: {
    width: 50,
  },
  newChatButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    fontSize: 15,
    color: Colors.text,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textTertiary,
    marginBottom: 12,
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textTertiary,
    marginTop: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: Colors.textTertiary,
    marginTop: 12,
  },
  startChatButton: {
    marginTop: 24,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  startChatText: {
    color: Colors.surface,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  conversationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.surface,
  },
  conversationInfo: {
    flex: 1,
    marginLeft: 14,
  },
  contactInfo: {
    flex: 1,
    marginLeft: 14,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  timeText: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    flex: 1,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '600' as const,
    textTransform: 'capitalize',
  },
  contactSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  contactEmail: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lastMessage: {
    flex: 1,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  unreadMessage: {
    fontWeight: '600' as const,
    color: Colors.text,
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  badgeText: {
    color: Colors.surface,
    fontSize: 12,
    fontWeight: '700' as const,
    paddingHorizontal: 6,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 16,
  },
});
