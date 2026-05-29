import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Switch } from 'react-native';
import {
  Bell,
  Mail,
  Send,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';

import apiRequest from '@/services/api';

type EmailPreferences = {
  userRegistration: boolean;
  managerRegistration: boolean;
  forgotPassword: boolean;
  taskAssignment: boolean;
  fileAttachment: boolean;
  commentAdded: boolean;
  replyAdded: boolean;
  projectAssignment: boolean;
  projectReassignment: boolean;
};

type Template = {
  enabled: boolean;
  subject: string;
  body: string;
};

type SystemTemplates = {
  templates: Record<string, Template>;
};

const templateDescriptions: Record<
  keyof EmailPreferences,
  { title: string; description: string }
> = {
  userRegistration: {
    title: 'User Registration',
    description: 'New employee registration email',
  },
  managerRegistration: {
    title: 'Manager Registration',
    description: 'New manager account email',
  },
  forgotPassword: {
    title: 'Forgot Password',
    description: 'Password reset emails',
  },
  taskAssignment: {
    title: 'Task Assignment',
    description: 'Task assigned notifications',
  },
  fileAttachment: {
    title: 'File Attachment',
    description: 'File upload notifications',
  },
  commentAdded: {
    title: 'Task Comment',
    description: 'Comment added notifications',
  },
  replyAdded: {
    title: 'Reply Added',
    description: 'Reply & mention notifications',
  },
  projectAssignment: {
    title: 'Project Assignment',
    description: 'Project assignment notifications',
  },
  projectReassignment: {
    title: 'Project Reassignment',
    description: 'Project reassignment notifications',
  },
};

export default function EmailSettingsScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showTemplates, setShowTemplates] = useState(false);

  const [preferences, setPreferences] =
    useState<EmailPreferences | null>(null);

  const [templates, setTemplates] =
    useState<SystemTemplates | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);

      const settingsRes = await apiRequest<any>(
        '/email/settings',
      );

      const templateRes = await apiRequest<any>(
        '/email/system-templates',
      );

      setPreferences(settingsRes.data.item.preferences);
      setTemplates(templateRes.data.item);
    } catch (error: any) {
      Alert.alert(
        'Error',
        error?.message || 'Failed to load settings',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const updatePreference = async (
    key: keyof EmailPreferences,
    value: boolean,
  ) => {
    if (!preferences) return;

    const updated = {
      ...preferences,
      [key]: value,
    };

    setPreferences(updated);

    try {
      setSaving(true);

      await apiRequest('/email/settings', {
        method: 'PUT',
        body: JSON.stringify({
          preferences: updated,
        }),
      });
    } catch (error: any) {
      Alert.alert(
        'Error',
        error?.message || 'Failed to save settings',
      );
    } finally {
      setSaving(false);
    }
  };

  const sendTestEmail = async () => {
    try {
      setSaving(true);

      const res = await apiRequest<any>(
        '/email/test',
        {
          method: 'POST',
        },
      );

      Alert.alert(
        'Success',
        res.data?.message || 'Test email sent',
      );
    } catch (error: any) {
      Alert.alert(
        'Error',
        error?.message || 'Failed to send test email',
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading || !preferences) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          Email Notification Settings
        </Text>

        <Text style={styles.subtitle}>
          Manage your email notifications
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Bell size={20} color="#2563eb" />
          <Text style={styles.cardTitle}>
            Notification Preferences
          </Text>
        </View>

        {Object.entries(preferences).map(([key, value]) => (
          <View style={styles.item} key={key}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>
                {
                  templateDescriptions[
                    key as keyof EmailPreferences
                  ].title
                }
              </Text>

              <Text style={styles.itemDesc}>
                {
                  templateDescriptions[
                    key as keyof EmailPreferences
                  ].description
                }
              </Text>
            </View>

            <Switch
              value={value}
              onValueChange={(val) =>
                updatePreference(
                  key as keyof EmailPreferences,
                  val,
                )
              }
            />
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          setShowTemplates(!showTemplates)
        }
      >
        <View style={styles.cardHeader}>
          <Mail size={20} color="#2563eb" />

          <Text style={styles.cardTitle}>
            Email Templates
          </Text>

          {showTemplates ? (
            <ChevronUp
              size={18}
              color="#666"
              style={{ marginLeft: 'auto' }}
            />
          ) : (
            <ChevronDown
              size={18}
              color="#666"
              style={{ marginLeft: 'auto' }}
            />
          )}
        </View>

        {showTemplates &&
          templates &&
          Object.entries(
            templates.templates,
          ).map(([key, template]) => (
            <View
              key={key}
              style={styles.templateBox}
            >
              <Text style={styles.templateTitle}>
                {
                  templateDescriptions[
                    key as keyof EmailPreferences
                  ]?.title
                }
              </Text>

              <Text style={styles.templateSubject}>
                Subject: {template.subject}
              </Text>

              <Text style={styles.templateBody}>
                {template.body}
              </Text>
            </View>
          ))}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.testButton}
        onPress={sendTestEmail}
        disabled={saving}
      >
        <Send size={18} color="#fff" />

        <Text style={styles.testButtonText}>
          {saving
            ? 'Sending...'
            : 'Send Test Email'}
        </Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fb',
  },

  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  header: {
    padding: 20,
  },

  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111',
  },

  subtitle: {
    marginTop: 6,
    color: '#666',
  },

  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 14,
    padding: 16,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },

  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111',
  },

  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },

  itemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
  },

  itemDesc: {
    fontSize: 12,
    color: '#777',
    marginTop: 4,
  },

  templateBox: {
    backgroundColor: '#f7f7f7',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },

  templateTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },

  templateSubject: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },

  templateBody: {
    fontSize: 12,
    color: '#666',
  },

  testButton: {
    marginHorizontal: 16,
    backgroundColor: '#2563eb',
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },

  testButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});