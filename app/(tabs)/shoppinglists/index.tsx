import React, { useEffect, useState, useMemo } from 'react';
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
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ShoppingCart,
  MapPin,
  Search,
  Plus,
  Check,
  CheckCircle2,
  Filter,
  X,
  Package,
} from 'lucide-react-native';
import { API_BASE_URL } from '@/services/api';

// --- Types ---
interface ShoppingList {
  id: string;
  name: string;
  companyId?: { id: string; name: string };
  locationId?: { id: string; name: string };
  projectId?: { id: string; name: string };
  notes: string;
  status: "open" | "completed" | "archived";
  createdAt: string;
}

interface ShoppingListItem {
  id: string;
  name: string;
  quantity: string;
  vendorId?: { id: string; name: string };
  category: string;
  priority: "low" | "medium" | "high";
  notes: string;
  isPurchased: boolean;
  aisle: string;
}

interface MinimalItem {
  id: string;
  name: string;
}

export default function ShoppingListsScreen() {
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [activeTab, setActiveTab] = useState<'my-lists' | 'all-lists'>('my-lists');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Detail Modal States
  const [selectedList, setSelectedList] = useState<ShoppingList | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [listItems, setListItems] = useState<ShoppingListItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);

  // Create List Modal States
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [subModalType, setSubModalType] = useState<'company' | 'location' | null>(null);
  
  // Data Repositories for Selection Drops
  const [companies, setCompanies] = useState<MinimalItem[]>([]);
  const [locations, setLocations] = useState<MinimalItem[]>([]);

  // Form Fields
  const [newListName, setNewListName] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<MinimalItem | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<MinimalItem | null>(null);
  const [newListNotes, setNewListNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Detail Filter States
  const [vendorFilter, setVendorFilter] = useState<string>('all');
  const [hideCompleted, setHideCompleted] = useState(false);
  const [sortByAisle, setSortByAisle] = useState(false);

  useEffect(() => {
    loadShoppingLists();
    loadMinimalData();
  }, [activeTab]);

  // Safely constructs endpoint URL without duplicating /api segment
  const getCleanEndpoint = (endpointPath: string) => {
    const cleanBase = API_BASE_URL.endsWith('/api') ? API_BASE_URL.slice(0, -4) : API_BASE_URL;
    return `${cleanBase}${endpointPath}`;
  };

  const loadShoppingLists = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('auth_token');
      
      const response = await fetch(getCleanEndpoint('/api/shopping-lists'), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (!response.ok) throw new Error('Failed to load shopping lists');
      
      setLists(data.items || data || []);
    } catch (err) {
      console.log('LISTS FETCH ERROR:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch references correctly adjusting URL concatenation rules
  const loadMinimalData = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const headers = { Authorization: `Bearer ${token}` };
      const cacheBuster = Date.now();

      const companiesUrl = getCleanEndpoint(`/api/companies?limit=100&_cb=${cacheBuster}`);
      const locationsUrl = getCleanEndpoint(`/api/locations?limit=100&_cb=${cacheBuster}`);

      const [resComp, resLoc] = await Promise.all([
        fetch(companiesUrl, { headers }),
        fetch(locationsUrl, { headers })
      ]);

      const dComp = await resComp.json();
      const dLoc = await resLoc.json();

      if (resComp.ok) {
        const companyArray = dComp.items || dComp.data || (Array.isArray(dComp) ? dComp : []);
        setCompanies(companyArray.map((c: any) => ({ id: c._id || c.id, name: c.name })));
      }
      
      if (resLoc.ok) {
        const locationArray = dLoc.items || dLoc.data || (Array.isArray(dLoc) ? dLoc : []);
        setLocations(locationArray.map((l: any) => ({ id: l._id || l.id, name: l.name })));
      }
    } catch (err) {
      console.log('MINIMAL REPOS FETCH ERROR:', err);
    }
  };

  const handleCreateShoppingList = async () => {
    if (!newListName.trim()) {
      Alert.alert("Validation Error", "Please provide an actionable list name.");
      return;
    }

    try {
      setIsSubmitting(true);
      const token = await AsyncStorage.getItem('auth_token');

      const payload = {
        name: newListName,
        companyId: selectedCompany?.id || null,
        locationId: selectedLocation?.id || null,
        notes: newListNotes,
      };

      const response = await fetch(getCleanEndpoint('/api/shopping-lists'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Failed to build list asset');

      Alert.alert("Success", "Shopping list registered completely!");
      setCreateModalVisible(false);
      resetForm();
      loadShoppingLists();
    } catch (err) {
      Alert.alert("Submission Failure", "Could not submit context parameters onto backend API.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setNewListName('');
    setSelectedCompany(null);
    setSelectedLocation(null);
    setNewListNotes('');
  };

  const fetchListDetails = async (listId: string) => {
    try {
      setItemsLoading(true);
      const token = await AsyncStorage.getItem('auth_token');
      const response = await fetch(getCleanEndpoint(`/api/shopping-lists/${listId}`), {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok && data.item) {
        setListItems(data.item.items || []);
      }
    } catch (err) {
      console.log('ITEMS FETCH ERROR:', err);
    } finally {
      setItemsLoading(false);
    }
  };

  const toggleItemPurchase = async (itemId: string, currentStatus: boolean) => {
    try {
      setListItems(prev => prev.map(item => item.id === itemId ? { ...item, isPurchased: !currentStatus } : item));
      
      const token = await AsyncStorage.getItem('auth_token');
      await fetch(getCleanEndpoint(`/api/shopping-lists/items/${itemId}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isPurchased: !currentStatus })
      });
    } catch (err) {
      if (selectedList) fetchListDetails(selectedList.id);
      Alert.alert("Error", "Failed to update item status");
    }
  };

  const filteredLists = useMemo(() => {
    return lists.filter(list => 
      list.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      list.locationId?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, lists]);

  const filteredItems = useMemo(() => {
    let items = [...listItems];
    if (vendorFilter !== 'all') {
      items = items.filter(item => {
        const itemVendorId = item.vendorId?.id || item.vendorId;
        return itemVendorId === vendorFilter;
      });
    }
    if (hideCompleted) {
      items = items.filter(item => !item.isPurchased);
    }
    if (sortByAisle) {
      items.sort((a, b) => (a.aisle || 'ZZZ').localeCompare(b.aisle || 'ZZZ', undefined, { numeric: true }));
    } else {
      items.sort((a, b) => Number(a.isPurchased) - Number(b.isPurchased));
    }
    return items;
  }, [listItems, vendorFilter, hideCompleted, sortByAisle]);

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'open': return { bg: '#e6f4ea', text: '#137333' };
      case 'completed': return { bg: '#e8f0fe', text: '#1a73e8' };
      default: return { bg: '#f1f3f4', text: '#5f6368' };
    }
  };

  const getSubModalData = () => {
    switch (subModalType) {
      case 'company': return companies;
      case 'location': return locations;
      default: return [];
    }
  };

  const renderListCard = ({ item }: { item: ShoppingList }) => {
    const statusColor = getStatusStyle(item.status);
    return (
      <TouchableOpacity 
        style={styles.card} 
        activeOpacity={0.7}
        onPress={() => {
          setSelectedList(item);
          setDetailModalVisible(true);
          fetchListDetails(item.id);
        }}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleContainer}>
            <View style={styles.iconWrapper}>
              <ShoppingCart size={18} color="#2563eb" />
            </View>
            <View>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardSubtitle}>
                {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
            <Text style={[styles.statusText, { color: statusColor.text }]}>{item.status.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          {item.companyId && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabelText}>Company:</Text>
              <Text style={styles.metaValueText} numberOfLines={1}>{item.companyId.name}</Text>
            </View>
          )}
          {item.locationId && (
            <View style={styles.metaRow}>
              <MapPin size={14} color="#6b7280" />
              <Text style={styles.metaValueText} numberOfLines={1}>{item.locationId.name}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loaderText}>Loading procurement lists...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Shopping & Procurement</Text>
          <Text style={styles.subtitle}>Real-time supply tracking and vendor management</Text>
        </View>
        <TouchableOpacity 
          style={styles.fabButton} 
          activeOpacity={0.8}
          onPress={() => setCreateModalVisible(true)}
        >
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Segmented Tab Buttons */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'my-lists' && styles.activeTabButton]}
          onPress={() => setActiveTab('my-lists')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'my-lists' && styles.activeTabButtonText]}>My Assigned</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'all-lists' && styles.activeTabButton]}
          onPress={() => setActiveTab('all-lists')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'all-lists' && styles.activeTabButtonText]}>All Lists</Text>
        </TouchableOpacity>
      </View>

      {/* Search Layout Section */}
      <View style={styles.searchContainer}>
        <Search size={18} color="#9ca3af" style={styles.searchIcon} />
        <TextInput
          placeholder="Search corporate lists..."
          value={searchTerm}
          onChangeText={setSearchTerm}
          style={styles.searchInput}
          placeholderTextColor="#9ca3af"
        />
      </View>

      {/* Main Content List Container */}
      {filteredLists.length === 0 ? (
        <View style={styles.emptyContainer}>
          <ShoppingCart size={64} color="#d1d5db" />
          <Text style={styles.emptyTitle}>No procurement lists found</Text>
          <Text style={styles.emptySubtitle}>Try adjusting filters or check configuration settings.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredLists}
          keyExtractor={(item) => item.id}
          renderItem={renderListCard}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}

      {/* --- Create New List Modal Component --- */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={createModalVisible}
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalOverlayContainer}>
          <View style={styles.formModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Shopping List</Text>
              <TouchableOpacity onPress={() => { setCreateModalVisible(false); resetForm(); }}>
                <X size={22} color="#111827" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.formScrollBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>List Name</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g., Weekly Produce - Downtown"
                  placeholderTextColor="#9ca3af"
                  value={newListName}
                  onChangeText={setNewListName}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Company</Text>
                <TouchableOpacity 
                  style={styles.selectorDropdown}
                  onPress={() => setSubModalType('company')}
                >
                  <Text style={[styles.selectorText, !selectedCompany && styles.placeholderText]}>
                    {selectedCompany ? selectedCompany.name : "Select Company"}
                  </Text>
                  <Filter size={16} color="#6b7280" />
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Location</Text>
                <TouchableOpacity 
                  style={styles.selectorDropdown}
                  onPress={() => setSubModalType('location')}
                >
                  <Text style={[styles.selectorText, !selectedLocation && styles.placeholderText]}>
                    {selectedLocation ? selectedLocation.name : "Select Location"}
                  </Text>
                  <MapPin size={16} color="#6b7280" />
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Internal Notes</Text>
                <TextInput
                  style={[styles.formInput, styles.textAreaInput]}
                  placeholder="Any specific delivery instructions..."
                  placeholderTextColor="#9ca3af"
                  multiline={true}
                  numberOfLines={3}
                  value={newListNotes}
                  onChangeText={setNewListNotes}
                />
              </View>
            </ScrollView>

            <View style={styles.formFooterActions}>
              <TouchableOpacity 
                style={styles.cancelFormButton}
                onPress={() => { setCreateModalVisible(false); resetForm(); }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.submitFormButton, !newListName.trim() && styles.disabledSubmitButton]}
                onPress={handleCreateShoppingList}
                disabled={isSubmitting || !newListName.trim()}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Create List</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* --- Context Lookup Sub-Modal Selectors --- */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={subModalType !== null}
        onRequestClose={() => setSubModalType(null)}
      >
        <View style={styles.subModalOverlay}>
          <View style={styles.subModalContent}>
            <View style={styles.subModalHeader}>
              <Text style={styles.subModalTitle}>Select {subModalType ? subModalType.toUpperCase() : ''}</Text>
              <TouchableOpacity onPress={() => setSubModalType(null)}>
                <X size={20} color="#111827" />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={getSubModalData()}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const isSelected = (subModalType === 'company' && selectedCompany?.id === item.id) ||
                                  (subModalType === 'location' && selectedLocation?.id === item.id);

                return (
                  <TouchableOpacity 
                    style={[styles.subModalItemRow, isSelected && styles.subModalItemRowActive]}
                    onPress={() => {
                      if (subModalType === 'company') setSelectedCompany(item);
                      if (subModalType === 'location') setSelectedLocation(item);
                      setSubModalType(null);
                    }}
                  >
                    <Text style={[styles.subModalItemText, isSelected && styles.subModalItemTextActive]}>
                      {item.name}
                    </Text>
                    {isSelected && <Check size={16} color="#2563eb" />}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <Text style={styles.subModalEmptyText}>No configuration entities found.</Text>
              }
              contentContainerStyle={{ paddingBottom: 16 }}
            />
          </View>
        </View>
      </Modal>

      {/* --- Detailed Content Items Overlay Modal --- */}
      {selectedList && (
        <Modal
          animationType="slide"
          transparent={false}
          visible={detailModalVisible}
          onRequestClose={() => setDetailModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            {/* Modal Navigation Header */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.modalTitle} numberOfLines={1}>{selectedList.name}</Text>
                <Text style={styles.modalSubtitle}>{selectedList.locationId?.name || "No location chosen"}</Text>
              </View>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)} style={styles.closeModalButton}>
                <X size={22} color="#111827" />
              </TouchableOpacity>
            </View>

            {/* Sub-filtering Inline Controls Container */}
            <View style={styles.modalFilterBar}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, alignItems: 'center' }}>
                <TouchableOpacity 
                  style={[styles.inlineFilterBadge, vendorFilter === 'all' && styles.activeInlineBadge]}
                  onPress={() => setVendorFilter('all')}
                >
                  <Text style={[styles.inlineBadgeText, vendorFilter === 'all' && styles.activeInlineBadgeText]}>All Items</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>

            {/* Practical Utility Toggle Controls */}
            <View style={styles.utilityActionRow}>
              <TouchableOpacity 
                style={[styles.utilityButton, hideCompleted && styles.activeUtilityButton]} 
                onPress={() => setHideCompleted(!hideCompleted)}
              >
                <CheckCircle2 size={15} color={hideCompleted ? "#2563eb" : "#6b7280"} />
                <Text style={[styles.utilityButtonText, hideCompleted && styles.activeUtilityText]}>Hide Completed</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.utilityButton, sortByAisle && styles.activeUtilityButton]} 
                onPress={() => setSortByAisle(!sortByAisle)}
              >
                <Filter size={15} color={sortByAisle ? "#2563eb" : "#6b7280"} />
                <Text style={[styles.utilityButtonText, sortByAisle && styles.activeUtilityText]}>Sort Aisle</Text>
              </TouchableOpacity>
            </View>

            {/* List Array Execution Context */}
            {itemsLoading ? (
              <View style={styles.loaderContainer}>
                <ActivityIndicator size="small" color="#2563eb" />
                <Text style={styles.loaderText}>Syncing store values...</Text>
              </View>
            ) : (
              <FlatList
                data={filteredItems}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: 16 }}
                renderItem={({ item }) => (
                  <View style={[styles.itemCard, item.isPurchased && styles.itemCardCompleted]}>
                    <TouchableOpacity 
                      style={[styles.checkbox, item.isPurchased && styles.checkboxChecked]}
                      onPress={() => toggleItemPurchase(item.id, item.isPurchased)}
                    >
                      {item.isPurchased && <Check size={14} color="#fff" />}
                    </TouchableOpacity>
                    
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.itemName, item.isPurchased && styles.itemNameCompleted]}>{item.name}</Text>
                        <View style={styles.qtyBadge}>
                          <Text style={styles.qtyText}>{item.quantity}</Text>
                        </View>
                        {item.priority === 'high' && (
                          <View style={styles.urgentBadge}>
                            <Text style={styles.urgentText}>URGENT</Text>
                          </View>
                        )}
                      </View>
                      
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 12 }}>
                        {item.aisle ? <Text style={styles.itemMetaText}>📦 Aisle {item.aisle}</Text> : null}
                      </View>
                    </View>
                  </View>
                )}
                ListEmptyComponent={
                  <View style={styles.innerEmptyState}>
                    <Package size={48} color="#d1d5db" />
                    <Text style={styles.innerEmptyText}>No pending procurement items here.</Text>
                  </View>
                }
              />
            )}
          </View>
        </Modal>
      )}
    </View>
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
    paddingTop: 24,
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
  fabButton: {
    backgroundColor: '#2563eb',
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#2563eb',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  tabContainer: {
    flexDirection: 'row',
    padding: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 8,
    margin: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTabButton: {
    backgroundColor: '#fff',
    elevation: 1,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  activeTabButtonText: {
    color: '#0f172a',
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 14,
    color: '#0f172a',
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconWrapper: {
    padding: 8,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  cardSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  cardBody: {
    marginTop: 12,
    gap: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaLabelText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  metaValueText: {
    fontSize: 13,
    color: '#475569',
    flex: 1,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loaderText: {
    marginTop: 8,
    color: '#64748b',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalOverlayContainer: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  formModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#64748b',
  },
  closeModalButton: {
    padding: 4,
  },
  formScrollBody: {
    padding: 20,
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
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
  textAreaInput: {
    height: 80,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  selectorDropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    backgroundColor: '#f8fafc',
  },
  selectorText: {
    fontSize: 14,
    color: '#0f172a',
  },
  placeholderText: {
    color: '#94a3b8',
  },
  formFooterActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 8,
    gap: 12,
  },
  cancelFormButton: {
    flex: 1,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  submitFormButton: {
    flex: 1,
    height: 44,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  disabledSubmitButton: {
    backgroundColor: '#93c5fd',
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  subModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  subModalContent: {
    backgroundColor: '#fff',
    width: '100%',
    maxHeight: '70%',
    borderRadius: 16,
    padding: 20,
    elevation: 5,
  },
  subModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
  },
  subModalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  subModalItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderColor: '#f8fafc',
  },
  subModalItemRowActive: {
    backgroundColor: '#f0fdf4',
  },
  subModalItemText: {
    fontSize: 14,
    color: '#334155',
  },
  subModalItemTextActive: {
    color: '#166534',
    fontWeight: '500',
  },
  subModalEmptyText: {
    textAlign: 'center',
    color: '#94a3b8',
    marginVertical: 24,
  },
  modalFilterBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  inlineFilterBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#e2e8f0',
  },
  activeInlineBadge: {
    backgroundColor: '#2563eb',
  },
  inlineBadgeText: {
    fontSize: 12,
    color: '#475569',
  },
  activeInlineBadgeText: {
    color: '#fff',
    fontWeight: '600',
  },
  utilityActionRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
  },
  utilityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  activeUtilityButton: {
    backgroundColor: '#eff6ff',
    borderRadius: 6,
  },
  utilityButtonText: {
    fontSize: 12,
    color: '#6b7280',
  },
  activeUtilityText: {
    color: '#2563eb',
    fontWeight: '500',
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  itemCardCompleted: {
    backgroundColor: '#f8fafc',
    opacity: 0.6,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
  },
  itemNameCompleted: {
    textDecorationLine: 'line-through',
    color: '#94a3b8',
  },
  qtyBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  qtyText: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
  },
  urgentBadge: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  urgentText: {
    fontSize: 9,
    color: '#ef4444',
    fontWeight: '700',
  },
  itemMetaText: {
    fontSize: 11,
    color: '#64748b',
  },
  innerEmptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  innerEmptyText: {
    fontSize: 13,
    color: '#94a3b8',
  },
});