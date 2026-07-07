import React, { useState, useMemo, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Modal,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  Filter,
  ShoppingCart,
  CheckCircle2,
  MoreVertical,
  ChevronRight,
  Store,
  MapPin,
  User,
  Package,
  X,
  Edit2,
  Trash2,
  Check,
} from "lucide-react-native";
import { format } from "date-fns";

// Mock/Adapter placeholders matching your platform configuration layers
import { apiFetch } from "@/lib/admin/apiClient";
import { useAuth } from '@/contexts/AuthContext'; // Hook location configuration matching your project structure

// --- Types ---
interface ShoppingList {
  id: string;
  name: string;
  companyId?: { id: string; name: string };
  locationId?: { id: string; name: string };
  projectId?: { id: string; name: string };
  assignedEmployeeId?: { id: string; name: string; username: string };
  vendors: { id: string; name: string }[];
  notes: string;
  status: "open" | "completed" | "archived";
  createdAt: string;
}

interface ShoppingListItem {
  id: string;
  shoppingListId: string;
  name: string;
  quantity: string;
  vendorId?: { id: string; name: string };
  category: string;
  priority: "low" | "medium" | "high";
  notes: string;
  isPurchased: boolean;
  purchasedAt?: string;
  aisle: string;
}

// --- Main Root Component ---
export default function ShoppingLists() {
  const { width } = useWindowDimensions();
  const queryClient = useQueryClient();
  
  // Custom Hook Authentication Logic
  const { user } = useAuth();
  const isAdmin = ["admin", "super-admin", "manager"].includes(user?.role || '');
  const role = (user?.role || 'employee') as 'employee' | 'manager' | 'admin' | 'super-admin';

  const [activeTab, setActiveTab] = useState("my-lists");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedList, setSelectedList] = useState<ShoppingList | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Queries
  const { data: listsData, isLoading } = useQuery({
    queryKey: ["shopping-lists", activeTab, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      const res = await apiFetch(`/api/shopping-lists?${params.toString()}`);
      return res.items as ShoppingList[];
    },
    refetchInterval: 10000,
  });

  const { data: companies } = useQuery({
    queryKey: ["companies-minimal"],
    queryFn: async () => {
      const res = await apiFetch("/api/companies?limit=100");
      return res.items;
    },
  });

  const { data: locations } = useQuery({
    queryKey: ["locations-minimal"],
    queryFn: async () => {
      const res = await apiFetch("/api/locations?limit=100");
      return res.items;
    },
  });

  const { data: employees } = useQuery({
    queryKey: ["employees-minimal"],
    queryFn: async () => {
      const res = await apiFetch("/api/users?limit=100");
      return res.items;
    },
  });

  const { data: vendors } = useQuery({
    queryKey: ["vendors-minimal"],
    queryFn: async () => {
      const res = await apiFetch("/api/vendors?limit=100");
      return (res.items || []).filter((v: any) => v.status === "approved");
    },
  });

  const deleteListMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiFetch(`/api/shopping-lists/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      Alert.alert("Success", "Shopping list deleted");
      queryClient.invalidateQueries({ queryKey: ["shopping-lists"] });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiFetch(`/api/shopping-lists/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: () => {
      Alert.alert("Success", "Status updated successfully");
      queryClient.invalidateQueries({ queryKey: ["shopping-lists"] });
    },
  });

  const handleDeletePrompt = (id: string) => {
    Alert.alert("Delete List", "Are you sure you want to delete this list?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteListMutation.mutate(id) },
    ]);
  };

  const isLargeScreen = width > 640;

  return (
    <SafeAreaView style={styles.rootContainer}>
      <ScrollView contentContainerStyle={styles.scrollPadding}>
        
        {/* Dynamic Title Headers Block */}
        <View style={styles.headerBlock}>
          <View>
            <Text style={styles.mainTitle}>Shopping & Procurement</Text>
            <Text style={styles.subTitle}>Manage vendor lists, assignments, and real-time tracking.</Text>
          </View>
          <TouchableOpacity 
            style={styles.primaryActionButton}
            onPress={() => setIsCreateModalOpen(true)}
          >
            <Plus size={16} color="#FFF" style={{ marginRight: 6 }} />
            <Text style={styles.primaryActionText}>Create New List</Text>
          </TouchableOpacity>
        </View>

        {/* Dynamic Interactive Segment Tabs */}
        <View style={styles.filterControlRow}>
          <View style={styles.tabTrack}>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === "my-lists" && styles.activeTabButton]}
              onPress={() => setActiveTab("my-lists")}
            >
              <Text style={[styles.tabButtonText, activeTab === "my-lists" && styles.activeTabButtonText]}>
                My Assigned Lists
              </Text>
            </TouchableOpacity>
            {isAdmin && (
              <TouchableOpacity
                style={[styles.tabButton, activeTab === "all-lists" && styles.activeTabButton]}
                onPress={() => setActiveTab("all-lists")}
              >
                <Text style={[styles.tabButtonText, activeTab === "all-lists" && styles.activeTabButtonText]}>
                  All Company Lists
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Search Box Integration Input */}
          <View style={styles.searchWrapperInput}>
            <Search size={16} color="#94a3b8" style={styles.searchIconLayout} />
            <TextInput
              style={styles.textInputBox}
              placeholder="Search lists..."
              placeholderTextColor="#64748b"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* Main Interface Content Render Layers */}
        {isLoading ? (
          <View style={styles.loaderCenterBox}>
            <ActivityIndicator size="large" color="#00C6FF" />
          </View>
        ) : (
          <View style={[styles.listCardGrid, isLargeScreen && styles.listCardGridTwoCol]}>
            {listsData?.length ? (
              listsData.map((list) => (
                <TouchableOpacity
                  key={list.id}
                  activeOpacity={0.8}
                  style={[styles.procureCard, isLargeScreen && styles.procureCardHalfWidth]}
                  onPress={() => {
                    setSelectedList(list);
                    setIsDetailOpen(true);
                  }}
                >
                  <View style={styles.cardHeaderFlex}>
                    <View style={styles.cardInfoIdentity}>
                      <View style={styles.iconContainerBox}>
                        <ShoppingCart size={18} color="#00C6FF" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardMainHeading} numberOfLines={1}>{list.name}</Text>
                        <Text style={styles.cardMetaTimestamp}>
                          {format(new Date(list.createdAt), "MMM d, yyyy")}
                        </Text>
                      </View>
                    </View>
                    <View style={[
                      styles.statusBadgeFrame,
                      list.status === "open" ? styles.badgeOpen :
                      list.status === "completed" ? styles.badgeCompleted : styles.badgeArchived
                    ]}>
                      <Text style={[
                        styles.statusBadgeText,
                        list.status === "open" ? styles.textOpen :
                        list.status === "completed" ? styles.textCompleted : styles.textArchived
                      ]}>
                        {list.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  {/* Card Secondary Descriptors Layout */}
                  <View style={styles.cardSpecsColumn}>
                    {list.locationId && (
                      <View style={styles.specInlineRow}>
                        <MapPin size={14} color="#64748b" />
                        <Text style={styles.specLineText} numberOfLines={1}>{list.locationId.name}</Text>
                      </View>
                    )}
                    {list.assignedEmployeeId && (
                      <View style={styles.specInlineRow}>
                        <User size={14} color="#64748b" />
                        <Text style={styles.specLineText} numberOfLines={1}>
                          Assigned: {list.assignedEmployeeId.name || list.assignedEmployeeId.username}
                        </Text>
                      </View>
                    )}
                    <View style={styles.specInlineRow}>
                      <Store size={14} color="#64748b" />
                      <Text style={styles.specLineText} numberOfLines={1}>
                        {list.vendors?.length ? list.vendors.map((v) => v.name).join(", ") : "No vendors specified"}
                      </Text>
                    </View>
                  </View>

                  {/* Admin Direct Action Panel Overlays */}
                  {isAdmin && (
                    <View style={styles.adminActionFloatingRow}>
                      <TouchableOpacity
                        style={styles.utilityMiniButton}
                        onPress={() => {
                          setSelectedList(list);
                          setIsEditModalOpen(true);
                        }}
                      >
                        <Edit2 size={12} color="#FFF" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.utilityMiniButton, styles.dangerMiniButton]}
                        onPress={() => handleDeletePrompt(list.id)}
                      >
                        <Trash2 size={12} color="#f87171" />
                      </TouchableOpacity>
                    </View>
                  )}
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.blankFallbackStateContainer}>
                <View style={styles.blankIconRing}>
                  <ShoppingCart size={32} color="#334155" />
                </View>
                <Text style={styles.blankStateHeading}>No lists found</Text>
                <Text style={styles.blankStateSubtext}>Try adjusting filters or configure a procurement document sheet.</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* --- Native Sheets & Overlays --- */}
      <CreateListModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        companies={companies}
        locations={locations}
        employees={employees}
        vendors={vendors}
      />

      {isEditModalOpen && selectedList && (
        <EditListModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          list={selectedList}
          companies={companies}
          locations={locations}
          employees={employees}
          vendors={vendors}
        />
      )}

      {selectedList && !isEditModalOpen && (
        <ListDetailModal
          isOpen={isDetailOpen}
          onClose={() => {
            setIsDetailOpen(false);
            setSelectedList(null);
          }}
          list={selectedList}
          allVendors={vendors}
          employees={employees}
          isAdmin={isAdmin}
          onUpdateStatus={(status: string) => updateStatusMutation.mutate({ id: selectedList.id, status })}
        />
      )}
    </SafeAreaView>
  );
}

// --- Native Selection Picker Trigger Custom Component abstraction ---
function NativeSelectTrigger({ label, value, options, onSelect }: { label: string; value: string; options: any[]; onSelect: (val: string) => void }) {
  const handlePickerPress = () => {
    const alertOptions = options?.map((opt) => ({
      text: opt.name || opt.username || "Select Option",
      onPress: () => onSelect(opt.id || opt._id),
    })) || [];
    
    Alert.alert(`Select ${label}`, "Choose an option from the register below:", [
      ...alertOptions,
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const resolvedLabel = options?.find((o) => (o.id || o._id) === value)?.name || "Select item configuration...";

  return (
    <View style={styles.formRowSpace}>
      <Text style={styles.nativeLabelElement}>{label}</Text>
      <TouchableOpacity style={styles.nativeCustomSelectTrigger} onPress={handlePickerPress}>
        <Text style={styles.nativeCustomSelectValueText}>{resolvedLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

// --- Create List Overlay Sheet Component ---
function CreateListModal({ isOpen, onClose, companies, locations, employees, vendors }: any) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({ name: "", companyId: "", locationId: "", notes: "" });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      return apiFetch("/api/shopping-lists", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      Alert.alert("Success", "Shopping list created!");
      queryClient.invalidateQueries({ queryKey: ["shopping-lists"] });
      onClose();
      setFormData({ name: "", companyId: "", locationId: "", notes: "" });
    },
  });

  return (
    <Modal visible={isOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalBackgroundStructure}>
        <View style={styles.sheetHeaderBorder}>
          <Text style={styles.sheetMainHeading}>New Shopping List</Text>
          <TouchableOpacity onPress={onClose}>
            <X size={20} color="#FFF" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalBodyScroller}>
          <View style={styles.formRowSpace}>
            <Text style={styles.nativeLabelElement}>List Name</Text>
            <TextInput
              style={styles.modalFormInputBox}
              value={formData.name}
              placeholderTextColor="#475569"
              placeholder="e.g., Weekly Produce - Downtown"
              onChangeText={(text) => setFormData({ ...formData, name: text })}
            />
          </View>

          <NativeSelectTrigger
            label="Company"
            value={formData.companyId}
            options={companies || []}
            onSelect={(val) => setFormData({ ...formData, companyId: val })}
          />

          <NativeSelectTrigger
            label="Location"
            value={formData.locationId}
            options={locations || []}
            onSelect={(val) => setFormData({ ...formData, locationId: val })}
          />

          <View style={styles.formRowSpace}>
            <Text style={styles.nativeLabelElement}>Internal Notes</Text>
            <TextInput
              style={[styles.modalFormInputBox, { height: 80, textAlignVertical: "top" }]}
              multiline
              value={formData.notes}
              placeholderTextColor="#475569"
              placeholder="Any specific routing instructions..."
              onChangeText={(text) => setFormData({ ...formData, notes: text })}
            />
          </View>
        </ScrollView>

        <View style={styles.sheetFooterBorder}>
          <TouchableOpacity style={styles.cancelActionBtn} onPress={onClose}>
            <Text style={styles.cancelActionBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.confirmActionBtn, !formData.name && { opacity: 0.5 }]}
            disabled={!formData.name}
            onPress={() => mutation.mutate(formData)}
          >
            <Text style={styles.confirmActionBtnText}>Create List</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// --- List Detail Overlay View Management Sheet ---
function ListDetailModal({ isOpen, onClose, list, allVendors, employees, isAdmin, onUpdateStatus }: any) {
  const queryClient = useQueryClient();
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [vendorFilter, setVendorFilter] = useState<string>("all");
  const [hideCompleted, setHideCompleted] = useState(false);
  const [sortByAisle, setSortByAisle] = useState(false);

  const { data: listWithItems, isLoading } = useQuery({
    queryKey: ["shopping-list", list.id],
    queryFn: async () => {
      const res = await apiFetch(`/api/shopping-lists/${list.id}`);
      return res.item;
    },
    enabled: !!list.id,
    refetchInterval: 5000,
  });

  const toggleItemMutation = useMutation({
    mutationFn: async ({ itemId, isPurchased }: { itemId: string; isPurchased: boolean }) => {
      return apiFetch(`/api/shopping-lists/items/${itemId}`, {
        method: "PUT",
        body: JSON.stringify({ isPurchased }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shopping-list", list.id] });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      return apiFetch(`/api/shopping-lists/items/${itemId}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shopping-list", list.id] });
    },
  });

  const filteredItems = useMemo(() => {
    let items = [...(listWithItems?.items || [])];
    if (vendorFilter !== "all") {
      items = items.filter((item: any) => {
        const itemVendorId = item.vendorId?._id || item.vendorId?.id || item.vendorId;
        return itemVendorId === vendorFilter;
      });
    }
    if (hideCompleted) items = items.filter((item: any) => !item.isPurchased);
    if (sortByAisle) {
      items.sort((a: any, b: any) => (a.aisle || "ZZZ").localeCompare(b.aisle || "ZZZ", undefined, { numeric: true }));
    } else {
      items.sort((a: any, b: any) => Number(a.isPurchased) - Number(b.isPurchased));
    }
    return items;
  }, [listWithItems, vendorFilter, hideCompleted, sortByAisle]);

  return (
    <Modal visible={isOpen} animationType="slide" presentationStyle="overFullScreen" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalBackgroundStructure}>
        <View style={styles.sheetHeaderBorder}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={styles.sheetMainHeading} numberOfLines={1}>{list.name}</Text>
            <Text style={styles.subTitle}>{list.locationId?.name || "No location configuration spec"}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
            <X size={22} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* List Status Toggle Ribbon panel layout rules */}
        {isAdmin && (
          <View style={styles.adminStatusRibbonControl}>
            <Text style={styles.ribbonSectionText}>Status Configuration Override:</Text>
            <View style={{ flexDirection: "row", gap: 6 }}>
              {["open", "completed", "archived"].map((st) => (
                <TouchableOpacity
                  key={st}
                  style={[styles.ribbonBadgeButton, list.status === st && styles.ribbonBadgeActive]}
                  onPress={() => onUpdateStatus(st)}
                >
                  <Text style={styles.ribbonBadgeText}>{st.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Embedded Filter Actions Toolbar Segment */}
        <View style={styles.detailFilterActionToolbar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, alignItems: "center" }}>
            <TouchableOpacity
              style={[styles.chipsFilter, vendorFilter === "all" && styles.chipsActive]}
              onPress={() => setVendorFilter("all")}
            >
              <Text style={styles.chipsText}>All Vendors</Text>
            </TouchableOpacity>
            {list.vendors?.map((v: any) => (
              <TouchableOpacity
                key={v.id}
                style={[styles.chipsFilter, vendorFilter === v.id && styles.chipsActive]}
                onPress={() => setVendorFilter(v.id)}
              >
                <Text style={styles.chipsText}>{v.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.utilityActionRowAlignment}>
          <TouchableOpacity
            style={[styles.inlineFilterButtonRow, hideCompleted && styles.inlineFilterActive]}
            onPress={() => setHideCompleted(!hideCompleted)}
          >
            <CheckCircle2 size={14} color={hideCompleted ? "#00C6FF" : "#64748b"} />
            <Text style={[styles.inlineFilterButtonText, hideCompleted && { color: "#00C6FF" }]}>Hide Filled</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.inlineFilterButtonRow, sortByAisle && styles.inlineFilterActive]}
            onPress={() => setSortByAisle(!sortByAisle)}
          >
            <Filter size={14} color={sortByAisle ? "#00C6FF" : "#64748b"} />
            <Text style={[styles.inlineFilterButtonText, sortByAisle && { color: "#00C6FF" }]}>Aisle Sort</Text>
          </TouchableOpacity>
        </View>

        {/* Dynamic Nested Procurement Item FlatList */}
        {isLoading ? (
          <ActivityIndicator size="small" color="#00C6FF" style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={filteredItems}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
            ListEmptyComponent={
              <View style={styles.blankFallbackStateContainer}>
                <Package size={36} color="#334155" />
                <Text style={styles.blankStateSubtext}>No items documented inside list track segment.</Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={[styles.procureItemRowLayout, item.isPurchased && styles.procureItemCompletedOpacity]}>
                <TouchableOpacity
                  style={[styles.itemCheckboxMarker, item.isPurchased && styles.itemCheckboxChecked]}
                  onPress={() => toggleItemMutation.mutate({ itemId: item.id, isPurchased: !item.isPurchased })}
                >
                  {item.isPurchased && <Check size={14} color="#FFF" />}
                </TouchableOpacity>

                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={[styles.itemNameTitle, item.isPurchased && styles.itemNameCompletedLineThrough]}>
                      {item.name}
                    </Text>
                    <View style={styles.quantityBadgeMarker}>
                      <Text style={styles.quantityBadgeText}>{item.quantity}</Text>
                    </View>
                    {item.priority === "high" && (
                      <View style={styles.urgentPriorityBadge}>
                        <Text style={styles.urgentPriorityText}>URGENT</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.itemMetaRow}>
                    <Text style={styles.itemMetaLabelInline}>
                      Aisle: {item.aisle || "N/A"} • Vendor: {item.vendorId?.name || "General Specification"}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity style={{ padding: 6 }} onPress={() => deleteItemMutation.mutate(item.id)}>
                  <Trash2 size={14} color="#ef4444" />
                </TouchableOpacity>
              </View>
            )}
          />
        )}

        <TouchableOpacity style={styles.floatingActionAddBtn} onPress={() => setIsAddItemOpen(true)}>
          <Plus size={20} color="#FFF" style={{ marginRight: 6 }} />
          <Text style={styles.floatingActionAddBtnText}>Add Item</Text>
        </TouchableOpacity>

        <AddItemModal
          isOpen={isAddItemOpen}
          onClose={() => setIsAddItemOpen(false)}
          listId={list.id}
          allVendors={allVendors}
          employees={employees}
          currentAssignedId={list.assignedEmployeeId?.id || list.assignedEmployeeId}
          currentVendorIds={list.vendors?.map((v: any) => v.id || v) || []}
        />
      </SafeAreaView>
    </Modal>
  );
}

// --- Add Item Implementation Sheet Overlay Component ---
function AddItemModal({ isOpen, onClose, listId, allVendors, employees, currentAssignedId, currentVendorIds }: any) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: "",
    quantity: "1",
    vendorId: "",
    category: "General",
    priority: "medium",
    aisle: "",
    notes: "",
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = { ...data };
      if (payload.vendorId === "none" || !payload.vendorId) payload.vendorId = null;
      return apiFetch(`/api/shopping-lists/${listId}/items`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shopping-list", listId] });
      Alert.alert("Success", "Item append processing complete.");
      onClose();
      setFormData({ name: "", quantity: "1", vendorId: "", category: "General", priority: "medium", aisle: "", notes: "" });
    },
  });

  return (
    <Modal visible={isOpen} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <View style={styles.modalBackgroundStructure}>
        <View style={styles.sheetHeaderBorder}>
          <Text style={styles.sheetMainHeading}>Add Item to List</Text>
          <TouchableOpacity onPress={onClose}>
            <X size={20} color="#FFF" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalBodyScroller}>
          <View style={styles.formRowSpace}>
            <Text style={styles.nativeLabelElement}>Item Name</Text>
            <TextInput
              style={styles.modalFormInputBox}
              value={formData.name}
              placeholderTextColor="#475569"
              placeholder="e.g., Avocados (Case)"
              onChangeText={(text) => setFormData({ ...formData, name: text })}
            />
          </View>

          <View style={styles.formRowSpace}>
            <Text style={styles.nativeLabelElement}>Quantity</Text>
            <TextInput
              style={styles.modalFormInputBox}
              value={formData.quantity}
              placeholderTextColor="#475569"
              placeholder="e.g., 2 cases"
              onChangeText={(text) => setFormData({ ...formData, quantity: text })}
            />
          </View>

          <View style={styles.formRowSpace}>
            <Text style={styles.nativeLabelElement}>Aisle (Optional)</Text>
            <TextInput
              style={styles.modalFormInputBox}
              value={formData.aisle}
              placeholderTextColor="#475569"
              placeholder="e.g., 4"
              onChangeText={(text) => setFormData({ ...formData, aisle: text })}
            />
          </View>

          <NativeSelectTrigger
            label="Vendor"
            value={formData.vendorId}
            options={allVendors || []}
            onSelect={(val) => setFormData({ ...formData, vendorId: val })}
          />
        </ScrollView>

        <View style={styles.sheetFooterBorder}>
          <TouchableOpacity style={styles.cancelActionBtn} onPress={onClose}>
            <Text style={styles.cancelActionBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.confirmActionBtn, !formData.name && { opacity: 0.5 }]}
            disabled={!formData.name}
            onPress={() => mutation.mutate(formData)}
          >
            <Text style={styles.confirmActionBtnText}>Add Item</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// --- Edit List Sheet Overlay Component ---
function EditListModal({ isOpen, onClose, list, companies, locations, employees, vendors }: any) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: list.name,
    companyId: list.companyId?.id || list.companyId || "",
    locationId: list.locationId?.id || list.locationId || "",
    notes: list.notes || "",
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      return apiFetch(`/api/shopping-lists/${list.id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      Alert.alert("Success", "Shopping list settings updated");
      queryClient.invalidateQueries({ queryKey: ["shopping-lists"] });
      onClose();
    },
  });

  return (
    <Modal visible={isOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.modalBackgroundStructure}>
        <View style={styles.sheetHeaderBorder}>
          <Text style={styles.sheetMainHeading}>Edit Shopping List</Text>
          <TouchableOpacity onPress={onClose}>
            <X size={20} color="#FFF" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalBodyScroller}>
          <View style={styles.formRowSpace}>
            <Text style={styles.nativeLabelElement}>List Name</Text>
            <TextInput
              style={styles.modalFormInputBox}
              value={formData.name}
              placeholderTextColor="#475569"
              onChangeText={(text) => setFormData({ ...formData, name: text })}
            />
          </View>

          <NativeSelectTrigger
            label="Company"
            value={formData.companyId}
            options={companies || []}
            onSelect={(val) => setFormData({ ...formData, companyId: val })}
          />

          <NativeSelectTrigger
            label="Location"
            value={formData.locationId}
            options={locations || []}
            onSelect={(val) => setFormData({ ...formData, locationId: val })}
          />
        </ScrollView>

        <View style={styles.sheetFooterBorder}>
          <TouchableOpacity style={styles.cancelActionBtn} onPress={onClose}>
            <Text style={styles.cancelActionBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.confirmActionBtn} onPress={() => mutation.mutate(formData)}>
            <Text style={styles.confirmActionBtnText}>Save Changes</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// --- Stylesheet Rules Configuration Matrix ---
const styles = StyleSheet.create({
  rootContainer: { flex: 1, backgroundColor: "#0D1117" },
  scrollPadding: { padding: 16, paddingBottom: 60 },

  // Title Headers UI Structure rules
  headerBlock: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 24 },
  mainTitle: { fontSize: 24, fontWeight: "700", color: "#FFF", letterSpacing: -0.5 },
  subTitle: { fontSize: 13, color: "#64748b", marginTop: 4 },
  primaryActionButton: { flexDirection: "row", alignItems: "center", backgroundColor: "#0072FF", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  primaryActionText: { color: "#FFF", fontSize: 13, fontWeight: "600" },

  // Control Filters segments styling
  filterControlRow: { flexDirection: "column", gap: 12, marginBottom: 20 },
  tabTrack: { flexDirection: "row", backgroundColor: "#161B22", padding: 4, borderRadius: 8, gap: 4 },
  tabButton: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 6 },
  activeTabButton: { backgroundColor: "#0D1117" },
  tabButtonText: { fontSize: 13, color: "#64748b", fontWeight: "500" },
  activeTabButtonText: { color: "#00C6FF" },

  // Inline Search Components
  searchWrapperInput: { position: "relative", justifyContent: "center" },
  searchIconLayout: { position: "absolute", left: 12, zIndex: 5 },
  textInputBox: { height: 40, backgroundColor: "#161B22", borderRadius: 8, paddingLeft: 38, paddingRight: 16, color: "#FFF", fontSize: 14 },

  // Responsive List Card layouts definitions
  listCardGrid: { flexDirection: "column", gap: 12 },
  listCardGridTwoCol: { flexDirection: "row", flexWrap: "wrap" },
  procureCard: { backgroundColor: "#161B22", borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)", padding: 16, position: "relative" },
  procureCardHalfWidth: { width: "49%" },
  cardHeaderFlex: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10 },
  cardInfoIdentity: { flexDirection: "row", gap: 12, flex: 1, alignItems: "center" },
  iconContainerBox: { width: 36, height: 36, borderRadius: 8, backgroundColor: "rgba(0,198,255,0.08)", alignItems: "center", justifyContent: "center" },
  cardMainHeading: { fontSize: 15, fontWeight: "600", color: "#FFF" },
  cardMetaTimestamp: { fontSize: 11, color: "#475569", marginTop: 2 },

  // Core Badge Configurations
  statusBadgeFrame: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusBadgeText: { fontSize: 10, fontWeight: "700" },
  badgeOpen: { backgroundColor: "rgba(16,185,129,0.1)" },
  textOpen: { color: "#10b981" },
  badgeCompleted: { backgroundColor: "rgba(59,130,246,0.1)" },
  textCompleted: { color: "#3b82f6" },
  badgeArchived: { backgroundColor: "rgba(100,116,139,0.1)" },
  textArchived: { color: "#64748b" },

  cardSpecsColumn: { gap: 6, marginTop: 14, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.03)", paddingTop: 12 },
  specInlineRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  specLineText: { fontSize: 12, color: "#94a3b8" },

  adminActionFloatingRow: { flexDirection: "row", gap: 4, position: "absolute", bottom: 12, right: 12 },
  utilityMiniButton: { padding: 6, borderRadius: 6, backgroundColor: "rgba(255,255,255,0.04)" },
  dangerMiniButton: { backgroundColor: "rgba(239,68,68,0.1)" },

  // Fallback states styles structures
  loaderCenterBox: { paddingVertical: 60, alignItems: "center" },
  blankFallbackStateContainer: { paddingVertical: 60, alignItems: "center", width: "100%", justifyContent: "center" },
  blankIconRing: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#161B22", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  blankStateHeading: { fontSize: 16, fontWeight: "600", color: "#94a3b8" },
  blankStateSubtext: { fontSize: 12, color: "#475569", textAlign: "center", marginTop: 4, paddingHorizontal: 32 },

  // Overlaid Modal Presentational style blocks
  modalBackgroundStructure: { flex: 1, backgroundColor: "#0D1117" },
  sheetHeaderBorder: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)", backgroundColor: "#161B22" },
  sheetMainHeading: { fontSize: 18, fontWeight: "700", color: "#FFF" },
  modalBodyScroller: { flex: 1, padding: 16 },

  // Abstracted Form Component Styles
  formRowSpace: { flexDirection: "column", gap: 6, marginBottom: 16 },
  nativeLabelElement: { fontSize: 12, color: "#94a3b8", fontWeight: "600", textTransform: "uppercase" },
  modalFormInputBox: { height: 42, backgroundColor: "#161B22", borderRadius: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", paddingHorizontal: 12, color: "#FFF" },
  nativeCustomSelectTrigger: { height: 42, backgroundColor: "#161B22", borderRadius: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", justifyContent: "center", paddingHorizontal: 12 },
  nativeCustomSelectValueText: { color: "#FFF", fontSize: 13 },

  // Sheet Standard Footers Layouts
  sheetFooterBorder: { flexDirection: "row", justifyContent: "flex-end", gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.06)", backgroundColor: "#161B22" },
  cancelActionBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  cancelActionBtnText: { color: "#94a3b8", fontSize: 13, fontWeight: "500" },
  confirmActionBtn: { backgroundColor: "#0072FF", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  confirmActionBtnText: { color: "#FFF", fontSize: 13, fontWeight: "600" },

  // Detail Sheets specific extensions 
  adminStatusRibbonControl: { flexDirection: "column", gap: 8, padding: 12, backgroundColor: "#161B22", borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.04)" },
  ribbonSectionText: { fontSize: 11, color: "#64748b", fontWeight: "600" },
  ribbonBadgeButton: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4, backgroundColor: "#0D1117" },
  ribbonBadgeActive: { backgroundColor: "#0072FF" },
  ribbonBadgeText: { fontSize: 10, color: "#FFF", fontWeight: "700" },

  detailFilterActionToolbar: { paddingVertical: 10, paddingHorizontal: 16, backgroundColor: "#0D1117", borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.04)" },
  chipsFilter: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: "#161B22" },
  chipsActive: { backgroundColor: "#00C6FF" },
  chipsText: { color: "#FFF", fontSize: 12, fontWeight: "500" },

  utilityActionRowAlignment: { flexDirection: "row", gap: 12, paddingHorizontal: 16, paddingVertical: 8 },
  inlineFilterButtonRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  inlineFilterActive: { opacity: 1 },
  inlineFilterButtonText: { fontSize: 12, color: "#64748b", fontWeight: "500" },

  // Nested Procurement Rows Specific Styles
  procureItemRowLayout: { flexDirection: "row", alignItems: "center", padding: 12, backgroundColor: "#161B22", borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.03)" },
  procureItemCompletedOpacity: { opacity: 0.5 },
  itemCheckboxMarker: { width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: "#475569", alignItems: "center", justifyContent: "center" },
  itemCheckboxChecked: { backgroundColor: "#10b981", borderColor: "#10b981" },
  itemNameTitle: { fontSize: 14, fontWeight: "600", color: "#FFF" },
  itemNameCompletedLineThrough: { textDecorationLine: "line-through", color: "#64748b" },
  quantityBadgeMarker: { paddingHorizontal: 6, paddingVertical: 1, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 4 },
  quantityBadgeText: { fontSize: 10, color: "#94a3b8" },
  urgentPriorityBadge: { paddingHorizontal: 6, paddingVertical: 1, backgroundColor: "rgba(239,68,68,0.1)", borderRadius: 4 },
  urgentPriorityText: { fontSize: 9, color: "#ef4444", fontWeight: "700" },
  itemMetaRow: { marginTop: 4 },
  itemMetaLabelInline: { fontSize: 11, color: "#475569" },

  floatingActionAddBtn: { position: "absolute", bottom: 24, right: 24, backgroundColor: "#0072FF", flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 20, borderRadius: 24, elevation: 5, shadowColor: "#0072FF", shadowOpacity: 0.3, shadowOffset: { width: 0, height: 4 }, shadowRadius: 6 },
  floatingActionAddBtnText: { color: "#FFF", fontSize: 14, fontWeight: "700" },
});