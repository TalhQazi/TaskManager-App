import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';

import * as DocumentPicker from 'expo-document-picker';

import Colors from '@/constants/colors';
import { apiRequest } from '@/services/api';

interface Props {
  projectId: string;
  onClose: () => void;
}

interface Vendor {
  _id: string;
  name: string;
  phone?: string;
}

interface ExpenseRow {
  item: string;
  vendorId: string;
  vendorName: string;
  qty: number;
  price: number;
  total: number;
  files: any[];
}

export default function CreateExpenseSheet({
  projectId,
  onClose,
}: Props) {
  const [name, setName] = useState('');
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [items, setItems] = useState<ExpenseRow[]>([]);
  const [loading, setLoading] = useState(false);

  // Load vendors
  useEffect(() => {
    loadVendors();
  }, []);

  const loadVendors = async () => {
    try {
      const res = await apiRequest('/vendors');

      setVendors(res.data?.items || []);
    } catch (err) {
      console.log(err);
    }
  };

  const addRow = () => {
    setItems((prev) => [
      ...prev,
      {
        item: '',
        vendorId: '',
        vendorName: '',
        qty: 1,
        price: 0,
        total: 0,
        files: [],
      },
    ]);
  };

  const removeRow = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateRow = (
    index: number,
    field: keyof ExpenseRow,
    value: any
  ) => {
    const updated = [...items];

    updated[index][field] = value;

    updated[index].total =
      Number(updated[index].qty || 0) *
      Number(updated[index].price || 0);

    setItems(updated);
  };

  const selectVendor = (
    index: number,
    vendorId: string
  ) => {
    const vendor = vendors.find((v) => v._id === vendorId);

    const updated = [...items];

    updated[index].vendorId = vendorId;
    updated[index].vendorName = vendor?.name || '';

    setItems(updated);
  };

  const pickFiles = async (index: number) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      updateRow(index, 'files', result.assets || []);
    } catch (err) {
      console.log(err);
    }
  };

  const totalAmount = useMemo(() => {
    return items.reduce((sum, item) => sum + item.total, 0);
  }, [items]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Validation', 'Please enter expense sheet name');
      return;
    }

    if (items.length === 0) {
      Alert.alert('Validation', 'Please add at least one item');
      return;
    }

    try {
      setLoading(true);

      // 1. Create sheet
      const sheetRes = await apiRequest('/expense-sheets', {
        method: 'POST',
        body: JSON.stringify({
          projectId,
          name,
        }),
      });

      const sheetId =
        sheetRes.data?._id ||
        sheetRes.data?.item?._id;

      // 2. Create items
      for (const item of items) {
        const itemRes = await apiRequest('/expense-items', {
          method: 'POST',
          body: JSON.stringify({
            sheetId,
            itemName: item.item,
            vendorId: item.vendorId,
            vendorName: item.vendorName,
            quantity: item.qty,
            unitCost: item.price,
            estimatedCost: item.total,
          }),
        });

        const itemId =
          itemRes.data?._id ||
          itemRes.data?.item?._id;

        // 3. Upload attachments
        if (item.files?.length > 0) {
          const formData = new FormData();

          formData.append('expenseId', itemId);
          formData.append('itemId', itemId);

          item.files.forEach((file: any) => {
            formData.append('files', {
              uri: file.uri,
              name: file.name,
              type: file.mimeType || 'application/octet-stream',
            } as any);
          });

          await apiRequest('/expense-attachments', {
            method: 'POST',
            body: formData,
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });
        }
      }

      Alert.alert('Success', 'Expense sheet created');

      onClose();
    } catch (err) {
      console.log(err);

      Alert.alert('Error', 'Failed to create expense sheet');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Sheet Name */}
        <Text style={styles.label}>Expense Sheet Name</Text>

        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Enter sheet name"
          placeholderTextColor={Colors.textTertiary}
        />

        {/* Rows */}
        {items.map((row, index) => (
          <View key={index} style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>
                Item #{index + 1}
              </Text>

              <TouchableOpacity
                onPress={() => removeRow(index)}
              >
                <Text style={styles.removeText}>Remove</Text>
              </TouchableOpacity>
            </View>

            {/* Item */}
            <TextInput
              style={styles.input}
              value={row.item}
              onChangeText={(text) =>
                updateRow(index, 'item', text)
              }
              placeholder="Item name"
              placeholderTextColor={Colors.textTertiary}
            />

            {/* Vendors */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 12 }}
            >
              {vendors.map((vendor) => {
                const selected =
                  row.vendorId === vendor._id;

                return (
                  <TouchableOpacity
                    key={vendor._id}
                    style={[
                      styles.vendorChip,
                      selected && styles.vendorChipActive,
                    ]}
                    onPress={() =>
                      selectVendor(index, vendor._id)
                    }
                  >
                    <Text
                      style={[
                        styles.vendorChipText,
                        selected &&
                          styles.vendorChipTextActive,
                      ]}
                    >
                      {vendor.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Qty */}
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={String(row.qty)}
              onChangeText={(text) =>
                updateRow(index, 'qty', text)
              }
              placeholder="Quantity"
              placeholderTextColor={Colors.textTertiary}
            />

            {/* Price */}
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={String(row.price)}
              onChangeText={(text) =>
                updateRow(index, 'price', text)
              }
              placeholder="Price"
              placeholderTextColor={Colors.textTertiary}
            />

            {/* Total */}
            <View style={styles.totalBox}>
              <Text style={styles.totalText}>
                Total: ₹{row.total}
              </Text>
            </View>

            {/* Files */}
            <TouchableOpacity
              style={styles.fileButton}
              onPress={() => pickFiles(index)}
            >
              <Text style={styles.fileButtonText}>
                Upload Files ({row.files?.length || 0})
              </Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* Add Row */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={addRow}
        >
          <Text style={styles.addButtonText}>
            + Add Row
          </Text>
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.grandTotal}>
            Grand Total: ₹{totalAmount}
          </Text>

          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>
                Save Expense
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },

  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },

  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    color: Colors.text,
  },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },

  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    alignItems: 'center',
  },

  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },

  removeText: {
    color: Colors.error,
    fontWeight: '600',
  },

  vendorChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 8,
  },

  vendorChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },

  vendorChipText: {
    color: Colors.text,
    fontSize: 13,
  },

  vendorChipTextActive: {
    color: '#fff',
    fontWeight: '700',
  },

  totalBox: {
    backgroundColor: Colors.background,
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },

  totalText: {
    fontWeight: '700',
    color: Colors.text,
  },

  fileButton: {
    backgroundColor: Colors.infoLight,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },

  fileButtonText: {
    color: Colors.info,
    fontWeight: '600',
  },

  addButton: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 20,
  },

  addButtonText: {
    color: Colors.primary,
    fontWeight: '700',
  },

  footer: {
    marginBottom: 40,
  },

  grandTotal: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
  },

  saveButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },

  saveButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});