import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  SafeAreaView,
  Platform,
} from 'react-native';
import { 
  Calendar, 
  MapPin, 
  DollarSign, 
  Eye, 
  ChevronRight, 
  Filter, 
  X,
  AlertCircle
} from 'lucide-react-native';


// --- Types & API Mimic Interfaces ---
interface TravelCalendar {
  _id: string;
  title: string;
  status: 'planned' | 'approved' | 'in-progress' | 'completed' | 'cancelled';
  purpose: 'business' | 'conference' | 'meeting' | 'training' | 'personal';
  startDate: string;
  endDate: string;
  destination: string;
  description?: string;
  notes?: string;
  budget: {
    currency: string;
    estimated: number;
  };
}

interface TravelCalendarFilters {
  startDate?: string;
  endDate?: string;
  status?: string;
}

const formatShortDate = (dateString: string) => {
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return 'N/A';
  }
};

const formatLongDate = (dateString: string) => {
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  } catch {
    return 'N/A';
  }
};

// Temporary internal component props mock-up for API reference
// Replace this with your project's strict context importing rules
const travelCalendarApi = {
  getTravelCalendars: async (filters: TravelCalendarFilters): Promise<{ success: boolean; data: { items: TravelCalendar[] } }> => {
    // Simulating API return configuration context values
    return { success: true, data: { items: [] } };
  }
};

export default function EmployeeTravelCalendarScreen() {
  const [travelCalendars, setTravelCalendars] = useState<TravelCalendar[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<TravelCalendarFilters>({});
  const [selectedCalendar, setSelectedCalendar] = useState<TravelCalendar | null>(null);
  
  // Modals Visibility Configurations
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [viewDialogVisible, setViewDialogVisible] = useState(false);
  const [statusSelectorVisible, setStatusSelectorVisible] = useState(false);

  // Load travel calendars context
  const loadTravelCalendars = async () => {
    try {
      setLoading(true);
      const response = await travelCalendarApi.getTravelCalendars(filters);
      if (response.success) {
        setTravelCalendars(response.data.items);
      }
    } catch (error) {
      console.error("Failed to load travel calendars:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTravelCalendars();
  }, [filters]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "planned": return { bg: '#e0f2fe', text: '#0369a1' };
      case "approved": return { bg: '#dcfce7', text: '#15803d' };
      case "in-progress": return { bg: '#fef9c3', text: '#a16207' };
      case "completed": return { bg: '#f3e8ff', text: '#6b21a8' };
      case "cancelled": return { bg: '#fee2e2', text: '#b91c1c' };
      default: return { bg: '#f1f5f9', text: '#334155' };
    }
  };

  const getPurposeColor = (purpose: string) => {
    switch (purpose) {
      case "business": return { bg: '#eff6ff', text: '#1d4ed8' };
      case "conference": return { bg: '#faf5ff', text: '#7e22ce' };
      case "meeting": return { bg: '#f0fdf4', text: '#166534' };
      case "training": return { bg: '#fff7ed', text: '#c2410c' };
      case "personal": return { bg: '#fdf2f8', text: '#be185d' };
      default: return { bg: '#f8fafc', text: '#475569' };
    }
  };

  const renderCalendarCard = ({ item }: { item: TravelCalendar }) => {
    const statusStyle = getStatusColor(item.status);
    const purposeStyle = getPurposeColor(item.purpose);

    return (
      <TouchableOpacity 
        style={styles.card} 
        activeOpacity={0.7}
        onPress={() => {
          setSelectedCalendar(item);
          setViewDialogVisible(true);
        }}
      >
        <View style={styles.cardHeaderRow}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
            <View style={styles.badgeRow}>
              <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
                <Text style={[styles.badgeText, { color: statusStyle.text }]}>{item.status.toUpperCase()}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: purposeStyle.bg }]}>
                <Text style={[styles.badgeText, { color: purposeStyle.text }]}>{item.purpose}</Text>
              </View>
            </View>
          </View>
          <ChevronRight size={18} color="#94a3b8" />
        </View>

        <View style={styles.cardContent}>
          <View style={styles.metaInfoRow}>
            <Calendar size={14} color="#64748b" />
            <Text style={styles.metaInfoText}>
  {new Date(item.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - {new Date(item.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
</Text>
          </View>
          
          <View style={styles.metaInfoRow}>
            <MapPin size={14} color="#64748b" />
            <Text style={styles.metaInfoText} numberOfLines={1}>{item.destination}</Text>
          </View>

          {item.description ? (
            <Text style={styles.cardDescription} numberOfLines={2}>{item.description}</Text>
          ) : null}

          {item.budget.estimated > 0 ? (
            <View style={styles.budgetRow}>
              <DollarSign size={14} color="#0f172a" />
              <Text style={styles.budgetText}>
                Budget: <Text style={{ fontWeight: '600' }}>{item.budget.currency} {item.budget.estimated}</Text>
              </Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loaderText}>Syncing travel database configurations...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Panel */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>My Travel Calendar</Text>
          <Text style={styles.subtitle}>View your assigned business travel schedules</Text>
        </View>
        <TouchableOpacity 
          style={styles.filterTriggerButton}
          onPress={() => setFilterModalVisible(true)}
          activeOpacity={0.8}
        >
          <Filter size={18} color="#475569" />
          {Object.keys(filters).length > 0 && <View style={styles.filterActiveDot} />}
        </TouchableOpacity>
      </View>

      {/* Primary Display Content Container */}
      {travelCalendars.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Calendar size={64} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>No schedules tracked</Text>
          <Text style={styles.emptySubtitle}>No corporate travel itineraries matched active filter states.</Text>
          {Object.keys(filters).length > 0 && (
            <TouchableOpacity 
              style={styles.clearFiltersShortcut}
              onPress={() => setFilters({})}
            >
              <Text style={styles.clearFiltersShortcutText}>Reset Filters</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={travelCalendars}
          keyExtractor={(item) => item._id}
          renderItem={renderCalendarCard}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* --- Filters Backdrop Sheet --- */}
      <Modal
        visible={filterModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.bottomSheetOverlay}>
          <View style={styles.bottomSheetContainer}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalHeaderTitle}>Filter Itineraries</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <X size={22} color="#0f172a" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.formBody}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Start Date (YYYY-MM-DD)</Text>
                <TextInput 
                  style={styles.formInput}
                  placeholder="e.g. 2026-05-01"
                  placeholderTextColor="#94a3b8"
                  value={filters.startDate || ""}
                  onChangeText={(val) => setFilters({ ...filters, startDate: val || undefined })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>End Date (YYYY-MM-DD)</Text>
                <TextInput 
                  style={styles.formInput}
                  placeholder="e.g. 2026-05-15"
                  placeholderTextColor="#94a3b8"
                  value={filters.endDate || ""}
                  onChangeText={(val) => setFilters({ ...filters, endDate: val || undefined })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Workflow Status</Text>
                <TouchableOpacity 
                  style={styles.formSelector}
                  onPress={() => setStatusSelectorVisible(true)}
                >
                  <Text style={[styles.selectorValueText, !filters.status && { color: '#94a3b8' }]}>
                    {filters.status ? filters.status.toUpperCase() : "Select specific operational status"}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View style={styles.sheetFooterActions}>
              <TouchableOpacity 
                style={styles.sheetResetButton}
                onPress={() => {
                  setFilters({});
                  setFilterModalVisible(false);
                }}
              >
                <Text style={styles.sheetResetButtonText}>Reset All</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.sheetApplyButton}
                onPress={() => setFilterModalVisible(false)}
              >
                <Text style={styles.sheetApplyButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* --- Nested Status Inner Picker Modal --- */}
      <Modal
        visible={statusSelectorVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setStatusSelectorVisible(false)}
      >
        <View style={styles.dialogOverlay}>
          <View style={styles.pickerContainer}>
            <Text style={styles.pickerTitle}>Select Status Flag</Text>
            {['planned', 'approved', 'in-progress', 'completed', 'cancelled'].map((status) => (
              <TouchableOpacity
                key={status}
                style={styles.pickerItemRow}
                onPress={() => {
                  setFilters({ ...filters, status });
                  setStatusSelectorVisible(false);
                }}
              >
                <Text style={styles.pickerItemText}>{status.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity 
              style={[styles.pickerItemRow, { borderBottomWidth: 0, marginTop: 4 }]}
              onPress={() => {
                setFilters({ ...filters, status: undefined });
                setStatusSelectorVisible(false);
              }}
            >
              <Text style={[styles.pickerItemText, { color: '#ef4444', fontWeight: '600' }]}>CLEAR STATUS SELECTION</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* --- Complete Travel Context Fullscreen View Dialog --- */}
      <Modal
        visible={viewDialogVisible}
        animationType="slide"
        onRequestClose={() => setViewDialogVisible(false)}
      >
        <SafeAreaView style={styles.fullscreenModalContainer}>
          <View style={styles.modalHeaderRow}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.modalHeaderTitle} numberOfLines={1}>Itinerary Parameters</Text>
              <Text style={styles.modalHeaderSubtitle}>Comprehensive internal deployment file</Text>
            </View>
            <TouchableOpacity onPress={() => setViewDialogVisible(false)}>
              <X size={24} color="#0f172a" />
            </TouchableOpacity>
          </View>

          {selectedCalendar && (
            <ScrollView contentContainerStyle={styles.detailsViewBody}>
              <View style={styles.detailsMainBlock}>
                <Text style={styles.detailsTitle}>{selectedCalendar.title}</Text>
                <View style={[styles.badgeRow, { marginTop: 8 }]}>
                  <View style={[styles.badge, { backgroundColor: getStatusColor(selectedCalendar.status).bg }]}>
                    <Text style={[styles.badgeText, { color: getStatusColor(selectedCalendar.status).text }]}>
                      {selectedCalendar.status.toUpperCase()}
                    </Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: getPurposeColor(selectedCalendar.purpose).bg }]}>
                    <Text style={[styles.badgeText, { color: getPurposeColor(selectedCalendar.purpose).text }]}>
                      {selectedCalendar.purpose}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.detailsGrid}>
                <View style={styles.gridElement}>
  <Text style={styles.gridLabel}>Start Date</Text>
  <Text style={styles.gridValue}>
    {new Date(selectedCalendar.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
  </Text>
</View>

<View style={styles.gridElement}>
  <Text style={styles.gridLabel}>End Date</Text>
  <Text style={styles.gridValue}>
    {new Date(selectedCalendar.endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
  </Text>
</View>

                <View style={[styles.gridElement, { width: '100%' }]}>
                  <Text style={styles.gridLabel}>Destination Target</Text>
                  <Text style={styles.gridValue}>{selectedCalendar.destination}</Text>
                </View>
              </View>

              {selectedCalendar.description && (
                <View style={styles.detailsSection}>
                  <Text style={styles.sectionLabel}>Description / Objectives</Text>
                  <Text style={styles.sectionValueText}>{selectedCalendar.description}</Text>
                </View>
              )}

              {selectedCalendar.notes && (
                <View style={styles.detailsSection}>
                  <Text style={styles.sectionLabel}>Internal Logistics Notes</Text>
                  <Text style={styles.sectionValueText}>{selectedCalendar.notes}</Text>
                </View>
              )}

              {selectedCalendar.budget.estimated > 0 && (
                <View style={[styles.detailsSection, styles.detailBudgetCard]}>
                  <Text style={[styles.sectionLabel, { color: '#1e293b' }]}>Financial Allocation Limits</Text>
                  <Text style={styles.detailBudgetAmount}>
                    {selectedCalendar.budget.currency} {selectedCalendar.budget.estimated.toLocaleString()}
                  </Text>
                </View>
              )}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 16 : 8,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  filterTriggerButton: {
    backgroundColor: '#f1f5f9',
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  filterActiveDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563eb',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 1,
    shadowColor: '#0f172a',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
    paddingBottom: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  cardContent: {
    marginTop: 10,
    gap: 6,
  },
  metaInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaInfoText: {
    fontSize: 13,
    color: '#475569',
  },
  cardDescription: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    lineHeight: 16,
  },
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  budgetText: {
    fontSize: 12,
    color: '#1e293b',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loaderText: {
    marginTop: 12,
    color: '#64748b',
    fontSize: 13,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  clearFiltersShortcut: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#2563eb',
    borderRadius: 6,
  },
  clearFiltersShortcutText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  bottomSheetContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalHeaderSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  formBody: {
    padding: 16,
    gap: 14,
  },
  formGroup: {
    gap: 6,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  formSelector: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  selectorValueText: {
    fontSize: 14,
    color: '#0f172a',
  },
  sheetFooterActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 8,
    gap: 12,
  },
  sheetResetButton: {
    flex: 1,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  sheetResetButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  sheetApplyButton: {
    flex: 2,
    height: 44,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  sheetApplyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  dialogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  pickerContainer: {
    backgroundColor: '#fff',
    width: '100%',
    borderRadius: 12,
    padding: 16,
  },
  pickerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
    textAlign: 'center',
  },
  pickerItemRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
    alignItems: 'center',
  },
  pickerItemText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
  },
  fullscreenModalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  detailsViewBody: {
    padding: 16,
    gap: 16,
  },
  detailsMainBlock: {
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
    paddingBottom: 16,
  },
  detailsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    backgroundColor: '#f8fafc',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  gridElement: {
    width: '47%',
    gap: 2,
  },
  gridLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  gridValue: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '500',
  },
  detailsSection: {
    gap: 4,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  sectionValueText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
  },
  detailBudgetCard: {
    backgroundColor: '#eff6ff',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  detailBudgetAmount: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1d4ed8',
    marginTop: 2,
  },
});