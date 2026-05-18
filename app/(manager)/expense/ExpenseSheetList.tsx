import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';

import Colors from '@/constants/colors';
import { apiRequest } from '@/services/api';

interface Props {
  projectId: string;
}

export default function ExpenseSheetList({
  projectId,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [sheets, setSheets] = useState<any[]>([]);
  const [selectedSheet, setSelectedSheet] =
    useState<any>(null);

  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadSheets();
  }, [projectId]);

  const loadSheets = async () => {
    try {
      setLoading(true);

      const res = await apiRequest(
        `/expense-sheets/${projectId}`
      );

      setSheets(res.data?.data || res.data || []);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  const openSheet = async (sheet: any) => {
    try {
      setSelectedSheet(sheet);

      const res = await apiRequest(
        `/expense-items/${sheet._id}`
      );

      setItems(res.data?.data || res.data || []);
    } catch (err) {
      console.log(err);
    }
  };

  const approveSheet = async (id: string) => {
    try {
      await apiRequest(
        `/expense-sheets/${id}/approve`,
        {
          method: 'POST',
        }
      );

      Alert.alert('Success', 'Approved');

      loadSheets();
    } catch (err) {
      console.log(err);
    }
  };

  const rejectSheet = async (id: string) => {
    try {
      await apiRequest(
        `/expense-sheets/${id}/reject`,
        {
          method: 'POST',
        }
      );

      Alert.alert('Rejected');

      loadSheets();
    } catch (err) {
      console.log(err);
    }
  };

  const filteredSheets = sheets.filter((s) =>
    s.name
      ?.toLowerCase()
      .includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator
          size="large"
          color={Colors.primary}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search */}
      <TextInput
        style={styles.searchInput}
        placeholder="Search expenses..."
        placeholderTextColor={Colors.textTertiary}
        value={search}
        onChangeText={setSearch}
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {filteredSheets.map((sheet) => (
          <View
            key={sheet._id}
            style={styles.sheetCard}
          >
            {/* Header */}
            <TouchableOpacity
              onPress={() => openSheet(sheet)}
            >
              <View style={styles.rowBetween}>
                <View>
                  <Text style={styles.sheetTitle}>
                    {sheet.name}
                  </Text>

                  <Text style={styles.sheetDate}>
                    {new Date(
                      sheet.createdAt
                    ).toLocaleDateString()}
                  </Text>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.sheetAmount}>
                    ₹{sheet.totalAmount || 0}
                  </Text>

                  <View
                    style={[
                      styles.statusBadge,
                      sheet.status === 'approved' &&
                        styles.approved,
                      sheet.status === 'rejected' &&
                        styles.rejected,
                      sheet.status === 'submitted' &&
                        styles.submitted,
                    ]}
                  >
                    <Text style={styles.statusText}>
                      {sheet.status}
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>

            {/* Items */}
            {selectedSheet?._id === sheet._id && (
              <View style={styles.itemsContainer}>
                {items.map((item) => (
                  <View
                    key={item._id}
                    style={styles.itemCard}
                  >
                    <Text style={styles.itemTitle}>
                      {item.itemName}
                    </Text>

                    <Text style={styles.itemText}>
                      Vendor: {item.vendorName}
                    </Text>

                    <Text style={styles.itemText}>
                      Qty: {item.quantity}
                    </Text>

                    <Text style={styles.itemText}>
                      Cost: ₹
                      {item.estimatedCost}
                    </Text>
                  </View>
                ))}

                {/* Actions */}
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      styles.approveButton,
                    ]}
                    onPress={() =>
                      approveSheet(sheet._id)
                    }
                  >
                    <Text style={styles.actionText}>
                      Approve
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      styles.rejectButton,
                    ]}
                    onPress={() =>
                      rejectSheet(sheet._id)
                    }
                  >
                    <Text style={styles.actionText}>
                      Reject
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },

  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  searchInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
    color: Colors.text,
  },

  sheetCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },

  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },

  sheetDate: {
    marginTop: 4,
    fontSize: 12,
    color: Colors.textTertiary,
  },

  sheetAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 6,
  },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: Colors.background,
  },

  approved: {
    backgroundColor: '#dcfce7',
  },

  rejected: {
    backgroundColor: '#fee2e2',
  },

  submitted: {
    backgroundColor: '#fef3c7',
  },

  statusText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },

  itemsContainer: {
    marginTop: 16,
  },

  itemCard: {
    backgroundColor: Colors.background,
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
  },

  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 6,
  },

  itemText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 2,
  },

  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },

  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },

  approveButton: {
    backgroundColor: Colors.success,
  },

  rejectButton: {
    backgroundColor: Colors.error,
  },

  actionText: {
    color: '#fff',
    fontWeight: '700',
  },
});