import React, { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import { useSocket } from '@/contexts/SocketContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast, type ToastVariant } from '@/hooks/use-toast';

// Configure foreground notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

interface PopupOptions {
  title: string;
  body: string;
  variant?: ToastVariant;
  channelId?: string;
  data?: Record<string, any>;
}

export function GlobalNotificationManager() {
  const { socket, isConnected } = useSocket();
  const { user } = useAuth();
  const lastEventRef = useRef<Map<string, number>>(new Map());

  // Set up Android Channels and request permissions on mount
  useEffect(() => {
    async function configureNotifications() {
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (Platform.OS === 'android') {
          // Channel 1: General Notifications
          await Notifications.setNotificationChannelAsync('default', {
            name: 'General Notifications',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#3B82F6',
            showBadge: true,
          });

          // Channel 2: Messages
          await Notifications.setNotificationChannelAsync('messages', {
            name: 'Messages & Chats',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 200, 150, 200],
            lightColor: '#10B981',
            showBadge: true,
          });

          // Channel 3: Urgent Alerts & Patents
          await Notifications.setNotificationChannelAsync('alerts', {
            name: 'Urgent Alerts & Expirations',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 400, 200, 400],
            lightColor: '#EF4444',
            showBadge: true,
          });
        }
      } catch (err) {
        console.warn('[GlobalNotificationManager] Failed to set up notifications:', err);
      }
    }

    configureNotifications();
  }, []);

  // Show both in-app toast banner and native system heads-up notification
  const showNotificationPopup = ({ title, body, variant = 'default', channelId = 'default', data }: PopupOptions) => {
    // Prevent duplicate bursts of the exact same notification within 2 seconds
    const key = `${title}:${body}`;
    const now = Date.now();
    const lastTime = lastEventRef.current.get(key) || 0;
    if (now - lastTime < 2000) {
      return;
    }
    lastEventRef.current.set(key, now);

    // 1. In-App Animated Toast Banner
    toast({
      title,
      description: body,
      variant,
    });

    // 2. Haptic feedback
    try {
      if (variant === 'destructive') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      } else if (variant === 'success') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      }
    } catch {}

    // 3. Native Android Heads-Up Notification
    try {
      Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
          data: data || {},
          ...(Platform.OS === 'android' ? { channelId } : {}),
        },
        trigger: null, // deliver immediately
      }).catch((err) => {
        console.log('[GlobalNotificationManager] scheduleNotificationAsync notice:', err?.message);
      });
    } catch {}
  };

  // Helper to determine if a notification is addressed to the current logged-in user
  const isForMe = (data: any) => {
    if (!data) return false;
    if (data.audience === 'all' || data.audience === 'everyone') return true;

    const myEmail = String(user?.email || '').toLowerCase().trim();
    const myUsername = String(user?.username || '').toLowerCase().trim();
    const myName = String(user?.fullName || '').toLowerCase().trim();
    const myRole = String(user?.role || '').toLowerCase().trim();

    const recipient = String(data.recipient || '').toLowerCase();
    const assignees = Array.isArray(data.assignees)
      ? data.assignees.map((a: any) => String(a).toLowerCase().trim())
      : [];

    if (myEmail && recipient.includes(myEmail)) return true;
    if (myUsername && recipient.includes(myUsername)) return true;
    if (myName && recipient.includes(myName)) return true;
    if (myRole && recipient.includes(myRole)) return true;
    if (assignees.some((a: string) => a === myEmail || a === myUsername || a === myName)) return true;

    // Privileged roles receive system broadcasts and manager alerts
    if (['admin', 'super-admin', 'manager'].includes(myRole)) {
      if (recipient.includes('admin') || recipient.includes('manager') || data.audience === 'targeted') {
        return true;
      }
    }
    return false;
  };

  // Subscribe to real-time socket events
  useEffect(() => {
    if (!socket || !isConnected) return;

    // 1. General & System Notifications
    const handleNewNotification = (notif: any) => {
      if (!isForMe(notif)) return;

      const actorName = String(notif.actor || notif.sender || '').toLowerCase().trim();
      const myName = String(user?.fullName || '').toLowerCase().trim();
      const myUsername = String(user?.username || '').toLowerCase().trim();
      const myEmail = String(user?.email || '').toLowerCase().trim();

      // Don't notify self for self-generated actions (unless it's an alert or patent)
      if (
        actorName &&
        (actorName === myName || actorName === myUsername || actorName === myEmail) &&
        notif.category !== 'PATENT_EXPIRING'
      ) {
        return;
      }

      const title = notif.title || 'Notification';
      const body = notif.content || notif.message || notif.details || '';
      let variant: ToastVariant = 'default';
      let channelId = 'default';

      if (notif.category === 'PATENT_EXPIRING') {
        variant = 'destructive';
        channelId = 'alerts';
      } else if (notif.category === 'PROJECT_COMPLETED' || notif.category === 'TASK_COMPLETED') {
        variant = 'success';
      } else if (notif.category === 'TASK_CREATED' || notif.category === 'PROJECT_CREATED') {
        variant = 'info';
      }

      showNotificationPopup({
        title,
        body,
        variant,
        channelId,
        data: notif,
      });
    };

    // 2. Messages (Direct & Group)
    const handleNewMessage = (msg: any) => {
      if (!msg) return;

      const sender = String(msg.sender || '').trim();
      const myName = String(user?.fullName || '').toLowerCase().trim();
      const myUsername = String(user?.username || '').toLowerCase().trim();
      const myEmail = String(user?.email || '').toLowerCase().trim();

      // Don't notify self for own sent message
      if (
        sender.toLowerCase() === myName ||
        sender.toLowerCase() === myUsername ||
        sender.toLowerCase() === myEmail
      ) {
        return;
      }

      const recipient = String(msg.recipient || '').toLowerCase();
      const isDirectForMe =
        (myEmail && recipient.includes(myEmail)) ||
        (myUsername && recipient.includes(myUsername)) ||
        (myName && recipient.includes(myName));
      const isGroup = !!msg.groupId;

      if (!isDirectForMe && !isGroup && recipient) return;

      const content =
        msg.content ||
        (msg.attachment ? 'Sent an attachment' : msg.voiceNote ? 'Sent a voice note' : 'New message');

      showNotificationPopup({
        title: `💬 ${sender || 'New Message'}`,
        body: content,
        variant: 'info',
        channelId: 'messages',
        data: msg,
      });
    };

    // 3. Patent Expiring Alert
    const handlePatentExpiring = (data: any) => {
      const myRole = String(user?.role || '').toLowerCase();
      if (!['super-admin', 'admin', 'manager'].includes(myRole)) return;

      showNotificationPopup({
        title: '⚠️ Patent Expiring Soon',
        body: `Patent "${data.patentName || 'Document'}" is expiring in ${data.daysUntilExpiration ?? 'a few'} day(s)!`,
        variant: 'destructive',
        channelId: 'alerts',
        data,
      });
    };

    // 4. Task Created
    const handleTaskCreated = (data: any) => {
      const actorName = String(data.actor || data.creator || '').toLowerCase().trim();
      const myName = String(user?.fullName || '').toLowerCase().trim();
      const myUsername = String(user?.username || '').toLowerCase().trim();
      if (actorName && (actorName === myName || actorName === myUsername)) return;

      showNotificationPopup({
        title: '📋 New Task Created',
        body: `"${data.resourceName || data.title || 'Task'}" was created by ${data.actor || data.creator || 'team member'}`,
        variant: 'info',
        channelId: 'default',
        data,
      });
    };

    // 5. Project Created
    const handleProjectCreated = (data: any) => {
      const actorName = String(data.actor || data.creator || '').toLowerCase().trim();
      const myName = String(user?.fullName || '').toLowerCase().trim();
      const myUsername = String(user?.username || '').toLowerCase().trim();
      if (actorName && (actorName === myName || actorName === myUsername)) return;

      showNotificationPopup({
        title: '📁 New Project Created',
        body: `Project "${data.resourceName || data.name || 'Project'}" was created`,
        variant: 'info',
        channelId: 'default',
        data,
      });
    };

    // 6. Project Completed
    const handleProjectCompleted = (data: any) => {
      showNotificationPopup({
        title: '✅ Project Completed',
        body: `Project "${data.resourceName || data.name || 'Project'}" has been marked as completed!`,
        variant: 'success',
        channelId: 'default',
        data,
      });
    };

    socket.on('new-notification', handleNewNotification);
    socket.on('new-message', handleNewMessage);
    socket.on('patent-expiring', handlePatentExpiring);
    socket.on('task-created', handleTaskCreated);
    socket.on('project-created', handleProjectCreated);
    socket.on('project-completed', handleProjectCompleted);

    return () => {
      socket.off('new-notification', handleNewNotification);
      socket.off('new-message', handleNewMessage);
      socket.off('patent-expiring', handlePatentExpiring);
      socket.off('task-created', handleTaskCreated);
      socket.off('project-created', handleProjectCreated);
      socket.off('project-completed', handleProjectCompleted);
    };
  }, [socket, isConnected, user]);

  return null;
}
