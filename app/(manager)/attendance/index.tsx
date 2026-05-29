import React, { useState } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Alert,
} from 'react-native';

//import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import Colors from '@/constants/colors';

import AttendanceHeader from '@/components/attendance/AttendanceHeader';
import StatusCard from '@/components/attendance/StatusCard';
import TimeStats from '@/components/attendance/TimeStats';
import AttendanceActions from '@/components/attendance/AttendanceActions';
import AttendanceHistory from '@/components/attendance/AttendanceHistory';
import EODModal from '@/components/attendance/EODModal';

import { apiRequest } from '@/services/api'; // adjust if path differs

export default function AttendanceScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const queryClient = useQueryClient();

  const { data: timeEntry } = useQuery({
  queryKey: ['active-time-entry'],
  queryFn: async () => {
    return await apiRequest('/time-entries/active', {
      method: 'GET',
    });
  },
});

  const onRefresh = async () => {
    try {
      setRefreshing(true);

      // trigger refetch if you use queries
      await queryClient.invalidateQueries({ queryKey: ['attendance-today'] });
      await queryClient.invalidateQueries({ queryKey: ['attendance-history'] });

    } finally {
      setRefreshing(false);
    }
  };

 const clockOutMutation = useMutation({
  mutationFn: async (eodData: {
    tasks: string;
    issues: string;
    notes: string;
  }) => {
    // Safely check if there's an active active session to end
    const entryId = timeEntry?.id || timeEntry?.item?.id || timeEntry?._id;
    
    if (!entryId) {
      throw new Error('No active time entry session found');
    }

    // Combine your modal strings to fit the 'scrum' notes field monitored by the backend admin panels
    const formattedScrumText = `
Tasks: ${eodData.tasks || 'None'}
Issues: ${eodData.issues || 'None'}
Notes: ${eodData.notes || 'None'}
    `.trim();

    // Change endpoint to the specialized clock-out routine route
    return await apiRequest(`/time-entries/${entryId}/clock-out`, {
      method: 'POST',
      data: {
        scrum: formattedScrumText,
      },
    });
  },

  onSuccess: async () => {
    // Invalidate the cache queries to reset UI elements instantly
    await queryClient.invalidateQueries({ queryKey: ['active-time-entry'] });
    await queryClient.invalidateQueries({ queryKey: ['attendance-today'] });
    await queryClient.invalidateQueries({ queryKey: ['attendance-history'] });

    Alert.alert('Success', 'Clocked out successfully');
    setShowModal(false);
  },

  onError: (err: any) => {
    // Pull the error message from api response or fall back to default
    const clientError = err?.response?.data?.error?.message || err.message;
    Alert.alert('Clock Out Failed', clientError || 'An unexpected error occurred');
  },
});

  return (
    <View style={styles.container}>
      <AttendanceHeader />

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <StatusCard />
        <TimeStats />

        <AttendanceActions onClockOut={() => setShowModal(true)} />

        <AttendanceHistory />
      </ScrollView>

      <EODModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={(data) => {
          clockOutMutation.mutate(data);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
