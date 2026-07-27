import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/services/api';
import { Message } from '@/types';
import { io } from "socket.io-client";
import { s, wp, hp, fs } from '@/util/styles';

type SocketMessage = {
  id?: string;
  sender: string;
  recipient: string;
  content: string;
  timestamp: string;
};

export default function ChatScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const [inputText, setInputText] = useState<string>('');
  const flatListRef = useRef<FlatList<Message>>(null);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const socketRef = useRef<any>(null);

  const myId = user?.fullName;
  const other = String(conversationId || '');

  const { data: messages } = useQuery<Message[]>({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      try {
        const res = await apiRequest<{ items: any[] }>('/messages');
        const items = res.data?.items ?? [];

        const filtered = items.filter((m) => {
          const sender = String(m.sender || '');
          const recipient = String(m.recipient || '');
          return (sender === myId && recipient === other) || (sender === other && recipient === myId);
        });

        return filtered.map((m) => ({
          id: String(m.id ?? m._id ?? ''),
          senderId: String(m.sender || ''),
          senderName: String(m.sender || ''),
          senderAvatar: String(m.senderAvatar || ''),
          content: String(m.content || ''),
          timestamp: String(m.timestamp || new Date().toISOString()),
          read: String(m.status || '') === 'read',
          conversationId: other,
        } as Message));
      } catch {
        return [];
      }
    },
    enabled: !!conversationId,
  });

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const payload = {
        sender: myId,
        senderAvatar: '',
        recipient: other,
        content,
        timestamp: new Date().toISOString(),
        type: 'direct',
        status: 'sent',
      };
      const res = await apiRequest<{ item: any }>('/messages', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data?.item;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      await queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  useEffect(() => {
    socketRef.current = io("https://task.se7eninc.com", {
      path: "/api/socket.io",
      transports: ["polling", "websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      timeout: 20000,
    });

    const socket = socketRef.current;

    socket.on("connect", () => {
      console.log("✅ Mobile connected", myId);
      socket.emit("join", { user: myId });
    });

    socket.on("connect_error", (err: any) => {
      console.log("ERROR:", err.message);
    });

    socket.on("disconnect", (reason: any) => {
      console.log(" DISCONNECTED:", reason);
    });

    socket.on("new-message", (data: SocketMessage) => {
      console.log(" Mobile received:", data);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const handleSend = useCallback(() => {
    if (!inputText.trim()) return;

    const message = {
      sender: myId,
      recipient: other,
      content: inputText.trim(),
      timestamp: new Date().toISOString(),
      type: 'direct',
      status: 'sent',
    };

    socketRef.current.emit("send-message", message);

    sendMutation.mutate(inputText.trim());
    setInputText('');
  }, [inputText, sendMutation]);

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwn = item.senderId === myId;

    return (
      <View style={s([styles.messageBubbleRow, isOwn && styles.messageBubbleRowOwn])}>
        <View style={s([styles.messageBubble, isOwn ? styles.messageBubbleOwn : styles.messageBubbleOther])}>
          <Text style={s([styles.messageText, isOwn && styles.messageTextOwn])}>{item.content}</Text>
          <Text style={s([styles.messageTime, isOwn && styles.messageTimeOwn])}>
            {new Date(item.timestamp).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: other || 'Chat' }} />
      <KeyboardAvoidingView
        style={s(styles.container)}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={hp(11)}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s(styles.messagesList)}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />

        <View style={s(styles.inputBar)}>
          <TextInput
            style={s(styles.chatInput)}
            placeholder="Type a message..."
            placeholderTextColor={Colors.textTertiary}
            value={inputText}
            onChangeText={setInputText}
            multiline
            testID="chat-input"
          />
          <TouchableOpacity
            style={s([styles.sendButton, !inputText.trim() && styles.sendButtonDisabled])}
            onPress={handleSend}
            disabled={!inputText.trim()}
          >
            <Send color={inputText.trim() ? '#FFFFFF' : Colors.textTertiary} size={fs(4.2)} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  messagesList: {
    paddingHorizontal: wp(4),
    paddingTop: hp(1.5),
    paddingBottom: hp(1),
  },
  messageBubbleRow: {
    flexDirection: 'row',
    marginBottom: hp(1),
  },
  messageBubbleRowOwn: {
    justifyContent: 'flex-end',
  },
  messageBubble: {
    maxWidth: '78%',
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(1.2),
    borderRadius: wp(4),
  },
  messageBubbleOwn: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: wp(1),
  },
  messageBubbleOther: {
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: wp(1),
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 1,
  },
  messageText: {
    fontSize: fs(3.2),
    color: Colors.text,
    lineHeight: fs(4.5),
  },
  messageTextOwn: {
    color: '#FFFFFF',
  },
  messageTime: {
    fontSize: fs(2.2),
    color: Colors.textTertiary,
    marginTop: hp(0.5),
    alignSelf: 'flex-end',
  },
  messageTimeOwn: {
    color: 'rgba(255,255,255,0.6)',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: wp(3),
    paddingVertical: hp(1),
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: wp(2),
  },
  chatInput: {
    flex: 1,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: wp(5),
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.2),
    fontSize: fs(3.2),
    color: Colors.text,
    maxHeight: hp(12),
    minHeight: hp(5),
  },
  sendButton: {
    width: wp(10),
    height: wp(10),
    borderRadius: wp(5),
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.surfaceAlt,
  },
});