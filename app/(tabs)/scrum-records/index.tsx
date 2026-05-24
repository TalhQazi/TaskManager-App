import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  ClipboardList,
  Calendar,
  Clock,
  Search,
} from 'lucide-react-native';
import { API_BASE_URL } from '@/services/api';



interface ScrumRecord {
  id: string;
  date: string;
  clockIn: string;
  clockOut: string;
  totalHours: number;
  scrum: string;
  createdAt: string;
}

export default function ScrumRecordsScreen() {
  const [records, setRecords] = useState<ScrumRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<ScrumRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadRecords();
  }, []);

  useEffect(() => {
    filterRecords();
  }, [searchTerm, records]);

  const loadRecords = async () => {
    try {
      setLoading(true);

      const token = await AsyncStorage.getItem(
        'auth_token',
      );

      const response = await fetch(
        `${API_BASE_URL}/employees/me/scrum-records`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      console.log('SCRUM RECORDS:', data);

      if (!response.ok) {
        throw new Error(
          data?.error?.message ||
            'Failed to load scrum records',
        );
      }

      const sorted = (data.items || []).sort(
        (a: ScrumRecord, b: ScrumRecord) =>
          new Date(b.date).getTime() -
          new Date(a.date).getTime(),
      );

      setRecords(sorted);
    } catch (err) {
      console.log('SCRUM ERROR:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterRecords = () => {
    const filtered = records.filter(
      (record) =>
        record.scrum
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        new Date(record.date)
          .toLocaleDateString()
          .includes(searchTerm),
    );

    setFilteredRecords(filtered);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(
      'en-US',
      {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      },
    );
  };

  const parseScrumDetails = (scrum: string) => {
    try {
      const parsed = JSON.parse(scrum);

      return {
        tasksCompleted:
          parsed.tasksCompleted || '',
        issuesBlockers:
          parsed.issuesBlockers || '',
        notes: parsed.notes || '',
      };
    } catch {
      return {
        tasksCompleted: scrum,
        issuesBlockers: '',
        notes: '',
      };
    }
  };

  const renderItem = ({
    item,
  }: {
    item: ScrumRecord;
  }) => {
    const details = parseScrumDetails(item.scrum);

    return (
      <View style={styles.card}>
        <View style={styles.row}>
          <Calendar size={16} color="#6b7280" />

          <Text style={styles.date}>
            {formatDate(item.date)}
          </Text>
        </View>

        <View style={styles.timeRow}>
          <View style={styles.timeBox}>
            <Clock size={14} color="green" />

            <Text style={styles.timeText}>
              In: {item.clockIn || '--:--'}
            </Text>
          </View>

          <View style={styles.timeBox}>
            <Clock size={14} color="#2563eb" />

            <Text style={styles.timeText}>
              Out: {item.clockOut || '--:--'}
            </Text>
          </View>
        </View>

        <View style={styles.hoursBadge}>
          <Text style={styles.hoursText}>
            {item.totalHours?.toFixed(2) || '0'}h
          </Text>
        </View>

        {details.tasksCompleted ? (
          <View style={styles.section}>
            <Text style={styles.label}>
              Tasks Done
            </Text>

            <Text style={styles.value}>
              {details.tasksCompleted}
            </Text>
          </View>
        ) : null}

        {details.issuesBlockers ? (
          <View style={styles.section}>
            <Text style={styles.label}>
              Issues / Blockers
            </Text>

            <Text style={styles.redText}>
              {details.issuesBlockers}
            </Text>
          </View>
        ) : null}

        {details.notes ? (
          <View style={styles.section}>
            <Text style={styles.label}>
              Notes
            </Text>

            <Text style={styles.grayText}>
              {details.notes}
            </Text>
          </View>
        ) : null}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator
          size="large"
          color="#2563eb"
        />

        <Text style={{ marginTop: 10 }}>
          Loading scrum records...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{
          paddingBottom: 30,
        }}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>
              Scrum Records
            </Text>

            <Text style={styles.subtitle}>
              Your daily scrum entries
            </Text>
          </View>

          <View style={styles.countBadge}>
            <Text style={styles.countText}>
              {records.length}
            </Text>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <Search
            size={18}
            color="#9ca3af"
            style={styles.searchIcon}
          />

          <TextInput
            placeholder="Search scrum..."
            value={searchTerm}
            onChangeText={setSearchTerm}
            style={styles.searchInput}
          />
        </View>

        {filteredRecords.length === 0 ? (
          <View style={styles.empty}>
            <ClipboardList
              size={70}
              color="#d1d5db"
            />

            <Text style={styles.emptyTitle}>
              No scrum records yet
            </Text>

            <Text style={styles.emptyText}>
              Your scrum entries will appear
              here
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredRecords}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            scrollEnabled={false}
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },

  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
  },

  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
  },

  subtitle: {
    marginTop: 4,
    color: '#6b7280',
  },

  countBadge: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },

  countText: {
    fontWeight: '700',
  },

  searchContainer: {
    marginHorizontal: 16,
    marginBottom: 14,
    backgroundColor: '#fff',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },

  searchIcon: {
    marginRight: 8,
  },

  searchInput: {
    flex: 1,
    height: 48,
  },

  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 16,
    padding: 16,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  date: {
    marginLeft: 8,
    fontWeight: '600',
    color: '#111827',
  },

  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  timeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  timeText: {
    marginLeft: 4,
    color: '#374151',
  },

  hoursBadge: {
    alignSelf: 'flex-start',
    marginTop: 12,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },

  hoursText: {
    color: '#2563eb',
    fontWeight: '700',
  },

  section: {
    marginTop: 14,
  },

  label: {
    fontWeight: '700',
    marginBottom: 4,
    color: '#111827',
  },

  value: {
    color: '#374151',
    lineHeight: 20,
  },

  redText: {
    color: '#dc2626',
    lineHeight: 20,
  },

  grayText: {
    color: '#6b7280',
    lineHeight: 20,
  },

  empty: {
    alignItems: 'center',
    marginTop: 80,
    paddingHorizontal: 30,
  },

  emptyTitle: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },

  emptyText: {
    marginTop: 6,
    textAlign: 'center',
    color: '#6b7280',
  },
});