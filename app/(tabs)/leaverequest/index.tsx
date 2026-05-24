import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';

import {
  Calendar,
  Plus,
  Trash2,
} from 'lucide-react-native';

import apiRequest from '@/services/api';

type LeaveType =
  | 'pto'
  | 'vacation'
  | 'sick'
  | 'holiday'
  | 'unpaid'
  | 'other';

type LeaveStatus =
  | 'pending'
  | 'approved'
  | 'rejected';

type LeaveRequestItem = {
  id: string;
  employeeName: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  status: LeaveStatus;
  reason?: string;
  exemptFromEOD?: boolean;
};

function toDateInputValue(d: Date) {
  const year = d.getFullYear();
  const month = String(
    d.getMonth() + 1,
  ).padStart(2, '0');

  const day = String(
    d.getDate(),
  ).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export default function LeaveRequestsScreen() {
  const today = useMemo(() => new Date(), []);

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [items, setItems] = useState<
    LeaveRequestItem[]
  >([]);

  const [type, setType] =
    useState<LeaveType>('pto');

  const [startDate, setStartDate] =
    useState(toDateInputValue(today));

  const [endDate, setEndDate] =
    useState(toDateInputValue(today));

  const [reason, setReason] =
    useState('');

  const loadRequests = async () => {
    try {
      setLoading(true);

      const res = await apiRequest<any>(
        '/leave-requests/me',
      );

      setItems(res.data.items || []);
    } catch (error: any) {
      Alert.alert(
        'Error',
        error?.message ||
          'Failed to load requests',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const submitLeave = async () => {
    try {
      setSubmitting(true);

      await apiRequest(
        '/leave-requests',
        {
          method: 'POST',
          body: JSON.stringify({
            type,
            startDate,
            endDate,
            reason,
            exemptFromEOD: true,
          }),
        },
      );

      Alert.alert(
        'Success',
        'Leave request submitted',
      );

      setReason('');

      loadRequests();
    } catch (error: any) {
      Alert.alert(
        'Error',
        error?.message ||
          'Failed to submit request',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const deleteRequest = async (
    id: string,
  ) => {
    try {
      await apiRequest(
        `/leave-requests/${id}`,
        {
          method: 'DELETE',
        },
      );

      Alert.alert(
        'Success',
        'Request deleted',
      );

      loadRequests();
    } catch (error: any) {
      Alert.alert(
        'Error',
        error?.message ||
          'Delete failed',
      );
    }
  };

  const renderStatus = (
    status: LeaveStatus,
  ) => {
    if (status === 'approved') {
      return (
        <View
          style={[
            styles.badge,
            styles.greenBadge,
          ]}
        >
          <Text style={styles.badgeText}>
            Approved
          </Text>
        </View>
      );
    }

    if (status === 'rejected') {
      return (
        <View
          style={[
            styles.badge,
            styles.redBadge,
          ]}
        >
          <Text style={styles.badgeText}>
            Rejected
          </Text>
        </View>
      );
    }

    return (
      <View
        style={[
          styles.badge,
          styles.grayBadge,
        ]}
      >
        <Text style={styles.badgeText}>
          Pending
        </Text>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>
            Leave Requests
          </Text>

          <Text style={styles.subtitle}>
            Request leave and track status
          </Text>
        </View>

        <Calendar
          size={24}
          color="#666"
        />
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Plus
            size={18}
            color="#2563eb"
          />

          <Text style={styles.cardTitle}>
            Create Request
          </Text>
        </View>

        <Text style={styles.label}>
          Leave Type
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={
            false
          }
          style={{ marginBottom: 16 }}
        >
          {[
            'pto',
            'vacation',
            'sick',
            'holiday',
            'unpaid',
            'other',
          ].map((item) => (
            <TouchableOpacity
              key={item}
              style={[
                styles.typeButton,
                type === item &&
                  styles.activeType,
              ]}
              onPress={() =>
                setType(item as LeaveType)
              }
            >
              <Text
                style={[
                  styles.typeText,
                  type === item &&
                    styles.activeTypeText,
                ]}
              >
                {item.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.label}>
          Start Date
        </Text>

        <TextInput
          value={startDate}
          onChangeText={setStartDate}
          style={styles.input}
          placeholder="YYYY-MM-DD"
        />

        <Text style={styles.label}>
          End Date
        </Text>

        <TextInput
          value={endDate}
          onChangeText={setEndDate}
          style={styles.input}
          placeholder="YYYY-MM-DD"
        />

        <Text style={styles.label}>
          Reason
        </Text>

        <TextInput
          value={reason}
          onChangeText={setReason}
          style={[
            styles.input,
            {
              height: 100,
              textAlignVertical: 'top',
            },
          ]}
          multiline
          placeholder="Reason..."
        />

        <TouchableOpacity
          style={styles.submitButton}
          onPress={submitLeave}
          disabled={submitting}
        >
          <Text
            style={styles.submitButtonText}
          >
            {submitting
              ? 'Submitting...'
              : 'Submit Request'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          My Requests
        </Text>

        {loading ? (
          <ActivityIndicator
            size="large"
            color="#2563eb"
            style={{ marginTop: 20 }}
          />
        ) : items.length === 0 ? (
          <Text style={styles.emptyText}>
            No leave requests yet
          </Text>
        ) : (
          items.map((item) => (
            <View
              key={item.id}
              style={styles.requestItem}
            >
              <View style={{ flex: 1 }}>
                <View
                  style={styles.requestTop}
                >
                  <Text
                    style={
                      styles.requestType
                    }
                  >
                    {item.type.toUpperCase()}
                  </Text>

                  {renderStatus(
                    item.status,
                  )}
                </View>

                <Text
                  style={styles.requestDate}
                >
                  {new Date(
                    item.startDate,
                  ).toLocaleDateString()}
                  {' - '}
                  {new Date(
                    item.endDate,
                  ).toLocaleDateString()}
                </Text>

                {!!item.reason && (
                  <Text
                    style={
                      styles.requestReason
                    }
                  >
                    {item.reason}
                  </Text>
                )}
              </View>

              {item.status ===
                'pending' && (
                <TouchableOpacity
                  onPress={() =>
                    deleteRequest(
                      item.id,
                    )
                  }
                >
                  <Trash2
                    size={20}
                    color="red"
                  />
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fb',
  },

  header: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111',
  },

  subtitle: {
    marginTop: 4,
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
    gap: 10,
    marginBottom: 16,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },

  label: {
    marginBottom: 8,
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
  },

  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },

  typeButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#eee',
    marginRight: 10,
  },

  activeType: {
    backgroundColor: '#2563eb',
  },

  typeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#444',
  },

  activeTypeText: {
    color: '#fff',
  },

  submitButton: {
    backgroundColor: '#2563eb',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },

  submitButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },

  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#777',
  },

  requestItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },

  requestTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },

  requestType: {
    fontSize: 15,
    fontWeight: '700',
  },

  requestDate: {
    color: '#666',
    fontSize: 13,
    marginBottom: 4,
  },

  requestReason: {
    fontSize: 13,
    color: '#222',
  },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },

  greenBadge: {
    backgroundColor: '#16a34a',
  },

  redBadge: {
    backgroundColor: '#dc2626',
  },

  grayBadge: {
    backgroundColor: '#777',
  },

  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
});