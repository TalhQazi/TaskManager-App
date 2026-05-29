import React from 'react';

import {
  ScrollView,
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native';

import Colors from '@/constants/colors';

type TabType =
  | 'unread'
  | 'all'
  | 'important'
  | 'emergency';

interface Props {
  activeTab: TabType;

  onChange: (tab: TabType) => void;
}

const tabs: TabType[] = [
  'unread',
  'all',
  'important',
  'emergency',
];

export default function AnnouncementTabs({
  activeTab,
  onChange,
}: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {tabs.map((tab) => {
        const active = activeTab === tab;

        return (
          <TouchableOpacity
            key={tab}
            activeOpacity={0.8}
            onPress={() => onChange(tab)}
            style={[
              styles.tab,

              active && styles.activeTab,
            ]}
          >
            <Text
              style={[
                styles.tabText,

                active &&
                  styles.activeTabText,
              ]}
            >
              {tab.charAt(0).toUpperCase() +
                tab.slice(1)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
    alignItems: 'center',marginTop: 12,
  },

  tab: {
    paddingHorizontal: 14,
    paddingVertical: 7, // reduced height
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    minHeight: 34, // smaller height
    justifyContent: 'center',
    alignItems: 'center',
  },

  activeTab: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },

  tabText: {
    fontSize: 12, // reduced text size
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'capitalize',
  },

  activeTabText: {
    color: '#FFFFFF',
  },
});