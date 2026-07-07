import React, { useEffect, useMemo, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  SafeAreaView,
  Dimensions,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  Filter,
  ShoppingCart,
  CheckCircle2,
  MapPin,
  User,
  Store,
  Package,
  X,
  Edit2,
  Trash2,
  Check,
  ChevronLeft,
  ChevronRight,
} from "lucide-react-native";
import { format } from "date-fns";
import { apiFetch } from "@/lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";


import { useAuth } from "@/contexts/AuthContext"; 

const { width } = Dimensions.get("window");

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
  vendorId?: { id: string; name: string; _id?: string };
  category: string;
  priority: "low" | "medium" | "high";
  notes: string;
  isPurchased: boolean;
  purchasedAt?: string;
  aisle: string;
  assignedEmployeeId?: { id: string; name: string; username: string };
}

function safeExtractArray<T>(response: any): T[] {
  if (!response) return [];
  if (response && typeof response === "object" && "items" in response) {
    return Array.isArray(response.items) ? response.items : [];
  }
  return Array.isArray(response) ? response : [];
}

export default function ShoppingLists() {
  const { uiTheme } = useTheme();
   const  auth  = useAuth();

const isDark = useMemo(
    () => ["dark-minimal", "neon-tech", "metallic-elite", "executive-black", "high-contrast", "energy-mode"].includes(uiTheme.theme),
    [uiTheme.theme]
  );
  const colors = useMemo(() => ({
    background: uiTheme?.panelColors?.dashboardBackground || (isDark ? "#0D1117" : "#F8FAFC"),
    cardBg: uiTheme?.panelColors?.dashboardCardBackground || (isDark ? "#161B22" : "#FFFFFF"),
    text: uiTheme?.panelColors?.dashboardTextColor || (isDark ? "#FFFFFF" : "#0F172A"),
    muted: isDark ? "#8B949E" : "#57606A",
    border: isDark ? "#30363D" : "#D0D7DE",
    primary: "#0072FF",
    accent: "#00C6FF",
    success: "#2EA44F",
    warning: "#F59E0B",
    danger: "#FF7B72",
    white: "#FFFFFF",
    inputBg: isDark ? "#0D1117" : "#F1F5F9",
  }), [uiTheme, isDark]);

  const styles = useMemo(() => createStyles(colors), [colors]);

  const [activeTab, setActiveTab] = useState("my-lists");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedList, setSelectedList] = useState<ShoppingList | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const queryClient = useQueryClient();
 
  
  const isAdmin = ["admin", "super-admin", "manager"].includes(auth?.user?.role || "");

  const { data: listsData, isLoading } = useQuery({
    queryKey: ["shopping-lists", activeTab, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      const res = await apiFetch<{ items: ShoppingList[] }>(`/api/shopping-lists?${params.toString()}`);
      return safeExtractArray<ShoppingList>(res);
    },
    refetchInterval: 10000,
  });

  const { data: companies } = useQuery({
    queryKey: ["companies-minimal"],
    queryFn: async () => {
      const res = await apiFetch<unknown>("/api/companies?limit=100");
      return safeExtractArray<any>(res);
    }
  });

  const { data: locations } = useQuery({
    queryKey: ["locations-minimal"],
    queryFn: async () => {
      const res = await apiFetch<unknown>("/api/locations?limit=100");
      return safeExtractArray<any>(res);
    }
  });

  const { data: employees } = useQuery({
    queryKey: ["employees-minimal"],
    queryFn: async () => {
      const res = await apiFetch<unknown>("/api/users?limit=100");
      return safeExtractArray<any>(res);
    }
  });

  const { data: vendors } = useQuery({
    queryKey: ["vendors-minimal"],
    queryFn: async () => {
      const res = await apiFetch<any>("/api/vendors?limit=100");
      return safeExtractArray<any>(res).filter((v: any) => v.status === "approved");
    }
  });

  const deleteListMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiFetch(`/api/shopping-lists/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      Alert.alert("Success", "Shopping list deleted");
      void queryClient.invalidateQueries({ queryKey: ["shopping-lists"] });
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiFetch(`/api/shopping-lists/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status })
      });
    },
    onSuccess: () => {
      Alert.alert("Success", "Status updated");
      void queryClient.invalidateQueries({ queryKey: ["shopping-lists"] });
    }
  });

  const handleDeletePress = (listId: string) => {
    Alert.alert("Delete List", "Are you sure you want to delete this list?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteListMutation.mutate(listId) }
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Shopping & Procurement</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>Manage vendor lists, assignments, and real-time store tracking.</Text>
        </View>
        <TouchableOpacity 
          style={[styles.createButton, { backgroundColor: colors.background }]} 
          onPress={() => setIsCreateModalOpen(true)}
        >
          <Plus color={colors.white} size={16} style={{ marginRight: 6 }} />
          <Text style={styles.createButtonText}>Create New List</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterSection}>
        <View style={styles.tabsContainer}>
          <TouchableOpacity 
            style={[styles.tabTrigger, activeTab === "my-lists" && { borderBottomColor: colors.primary }]} 
            onPress={() => setActiveTab("my-lists")}
          >
            <Text style={[styles.tabText, { color: activeTab === "my-lists" ? colors.text : colors.muted }]}>My Assigned Lists</Text>
          </TouchableOpacity>
          {isAdmin && (
            <TouchableOpacity 
              style={[styles.tabTrigger, activeTab === "all-lists" && { borderBottomColor: colors.primary }]} 
              onPress={() => setActiveTab("all-lists")}
            >
              <Text style={[styles.tabText, { color: activeTab === "all-lists" ? colors.text : colors.muted }]}>All Company Lists</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={[styles.searchBox, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <Search color={colors.muted} size={16} style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Search lists..."
            style={[styles.searchInput, { color: colors.text }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={colors.muted}
          />
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}>
          {listsData && listsData.length > 0 ? (
            listsData.map((list) => (
              <TouchableOpacity
                key={list.id}
                style={[styles.listCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
                onPress={() => {
                  setSelectedList(list);
                  setIsDetailOpen(true);
                }}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleBlock}>
                    <View style={[styles.iconWrapper, { backgroundColor: `${colors.primary}15` }]}>
                      <ShoppingCart color={colors.primary} size={18} />
                    </View>
                    <View>
                      <Text style={[styles.cardTitle, { color: colors.text }]}>{list.name}</Text>
                      <Text style={[styles.cardDate, { color: colors.muted }]}>
                        {format(new Date(list.createdAt), "MMM d, yyyy")}
                      </Text>
                    </View>
                  </View>
                  <View style={[
                    styles.statusBadge, 
                    { backgroundColor: list.status === "open" ? `${colors.success}20` : list.status === "completed" ? `${colors.primary}20` : `${colors.muted}20` }
                  ]}>
                    <Text style={[
                      styles.statusBadgeText, 
                      { color: list.status === "open" ? colors.success : list.status === "completed" ? colors.primary : colors.muted }
                    ]}>
                      {list.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardInfoRows}>
                  {list.locationId && (
                    <View style={styles.infoRow}>
                      <MapPin color={colors.muted} size={14} style={{ marginRight: 6 }} />
                      <Text style={[styles.infoRowText, { color: colors.muted }]} numberOfLines={1}>{list.locationId.name}</Text>
                    </View>
                  )}
                  {list.assignedEmployeeId && (
                    <View style={styles.infoRow}>
                      <User color={colors.muted} size={14} style={{ marginRight: 6 }} />
                      <Text style={[styles.infoRowText, { color: colors.muted }]} numberOfLines={1}>
                        Assigned to: {list.assignedEmployeeId.name || list.assignedEmployeeId.username}
                      </Text>
                    </View>
                  )}
                  <View style={styles.infoRow}>
                    <Store color={colors.muted} size={14} style={{ marginRight: 6 }} />
                    <Text style={[styles.infoRowText, { color: colors.muted }]} numberOfLines={1}>
                      {list.vendors?.length ? list.vendors.map(v => v.name).join(", ") : "No vendors specified"}
                    </Text>
                  </View>
                </View>

                {isAdmin && (
                  <View style={[styles.adminActionsRow, { borderTopColor: colors.border }]}>
                    <TouchableOpacity 
                      style={[styles.actionIconButton, { backgroundColor: colors.inputBg }]} 
                      onPress={() => {
                        setSelectedList(list);
                        setIsEditModalOpen(true);
                      }}
                    >
                      <Edit2 color={colors.text} size={14} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.actionIconButton, { backgroundColor: `${colors.danger}15` }]} 
                      onPress={() => handleDeletePress(list.id)}
                    >
                      <Trash2 color={colors.danger} size={14} />
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconWrapper, { backgroundColor: colors.cardBg }]}>
                <ShoppingCart color={colors.muted} size={32} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No lists found</Text>
              <Text style={[styles.emptySubtitle, { color: colors.muted }]}>Try adjusting your filters or create a new list.</Text>
            </View>
          )}
        </ScrollView>
      )}

      <CreateListModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        companies={companies}
        locations={locations}
        colors={colors}
        styles={styles}
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
          colors={colors}
          styles={styles}
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
          colors={colors}
          styles={styles}
        />
      )}
    </SafeAreaView>
  );
}

function CreateListModal({ isOpen, onClose, companies, locations, colors, styles }: any) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: "",
    companyId: "",
    locationId: "",
    notes: ""
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      return apiFetch("/api/shopping-lists", {
        method: "POST",
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      Alert.alert("Success", "Shopping list created!");
      void queryClient.invalidateQueries({ queryKey: ["shopping-lists"] });
      onClose();
      setFormData({ name: "", companyId: "", locationId: "", notes: "" });
    }
  });

  return (
    <Modal visible={isOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border, backgroundColor: colors.cardBg }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>New Shopping List</Text>
          <TouchableOpacity onPress={onClose}>
            <X color={colors.text} size={24} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalFormContent}>
          <View style={styles.inputGroup}>
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>List Name</Text>
            <TextInput
              value={formData.name}
              onChangeText={text => setFormData({ ...formData, name: text })}
              placeholder="e.g., Weekly Produce - Downtown"
              placeholderTextColor={colors.muted}
              style={[styles.input, { backgroundColor: colors.cardBg, color: colors.text, borderColor: colors.border }]}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>Company ID</Text>
            <TextInput
              value={formData.companyId}
              onChangeText={text => setFormData({ ...formData, companyId: text })}
              placeholder="Enter Company ID ID"
              placeholderTextColor={colors.muted}
              style={[styles.input, { backgroundColor: colors.cardBg, color: colors.text, borderColor: colors.border }]}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>Location ID</Text>
            <TextInput
              value={formData.locationId}
              onChangeText={text => setFormData({ ...formData, locationId: text })}
              placeholder="Enter Location ID"
              placeholderTextColor={colors.muted}
              style={[styles.input, { backgroundColor: colors.cardBg, color: colors.text, borderColor: colors.border }]}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>Internal Notes</Text>
            <TextInput
              value={formData.notes}
              onChangeText={text => setFormData({ ...formData, notes: text })}
              placeholder="Any specific instructions..."
              placeholderTextColor={colors.muted}
              multiline
              textAlignVertical="top"
              style={[styles.input, { backgroundColor: colors.cardBg, color: colors.text, borderColor: colors.border, height: 80, paddingTop: 10 }]}
            />
          </View>
        </ScrollView>

        <View style={[styles.modalFooter, { borderTopColor: colors.border, backgroundColor: colors.cardBg }]}>
          <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={onClose}>
            <Text style={[styles.cancelBtnText, { color: colors.text }]}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.background }]}
            onPress={() => mutation.mutate(formData)}
            disabled={mutation.isPending || !formData.name}
          >
            <Text style={styles.saveBtnText}>{mutation.isPending ? "Creating..." : "Create List"}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ListDetailModal({ isOpen, onClose, list, allVendors, employees, isAdmin, onUpdateStatus, colors, styles }: any) {
  const queryClient = useQueryClient();
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [vendorFilter, setVendorFilter] = useState<string>("all");
  const [hideCompleted, setHideCompleted] = useState(false);
  const [sortByAisle, setSortByAisle] = useState(false);

  const { data: listWithItems, isLoading } = useQuery({
    queryKey: ["shopping-list", list.id],
    queryFn: async () => {
      const res = await apiFetch<{ item: any }>(`/api/shopping-lists/${list.id}`);
      return res.item;
    },
    enabled: !!list.id,
    refetchInterval: 5000,
  });

  const toggleItemMutation = useMutation({
    mutationFn: async ({ itemId, isPurchased }: { itemId: string; isPurchased: boolean }) => {
      return apiFetch(`/api/shopping-lists/items/${itemId}`, {
        method: "PUT",
        body: JSON.stringify({ isPurchased })
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["shopping-list", list.id] });
    }
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      return apiFetch(`/api/shopping-lists/items/${itemId}`, { method: "DELETE" });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["shopping-list", list.id] });
      Alert.alert("Success", "Item removed");
    }
  });

  const filteredItems = useMemo(() => {
    let items = [...(listWithItems?.items || [])];
    
    if (vendorFilter !== "all") {
      items = items.filter((item: any) => {
        const itemVendorId = item.vendorId?._id || item.vendorId?.id || item.vendorId;
        return itemVendorId === vendorFilter;
      });
    }
    
    if (hideCompleted) {
      items = items.filter((item: any) => !item.isPurchased);
    }
    
    if (sortByAisle) {
      items.sort((a: any, b: any) => {
        const aisleA = a.aisle || "ZZZ";
        const aisleB = b.aisle || "ZZZ";
        return aisleA.localeCompare(aisleB, undefined, { numeric: true });
      });
    } else {
      items.sort((a: any, b: any) => Number(a.isPurchased) - Number(b.isPurchased));
    }
    
    return items;
  }, [listWithItems, vendorFilter, hideCompleted, sortByAisle]);

  return (
    <Modal visible={isOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border, backgroundColor: colors.cardBg, paddingRight: 40 }]}>
          <View style={{ minWidth: 0, flex: 1 }}>
            <Text style={[styles.modalTitle, { color: colors.text }]} numberOfLines={1}>{list.name}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
              <Text style={{ fontSize: 11, color: colors.muted }}>📍 {list.locationId?.name || "No location"}</Text>
              <Text style={{ fontSize: 11, color: colors.muted }}>👤 {list.assignedEmployeeId?.name || "Unassigned"}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={{ position: "absolute", right: 16, top: 16 }}>
            <X color={colors.text} size={24} />
          </TouchableOpacity>
        </View>

        <View style={[styles.detailControlsRow, { backgroundColor: colors.cardBg, borderBottomColor: colors.border }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 4 }}>
            <TouchableOpacity 
              style={[styles.controlBadge, vendorFilter === "all" ? { backgroundColor: colors.primary } : { backgroundColor: colors.inputBg }]}
              onPress={() => setVendorFilter("all")}
            >
              <Text style={[styles.controlBadgeText, { color: vendorFilter === "all" ? colors.white : colors.text }]}>All</Text>
            </TouchableOpacity>
            {list.vendors?.map((v: any) => (
              <TouchableOpacity 
                key={v.id}
                style={[styles.controlBadge, vendorFilter === v.id ? { backgroundColor: colors.primary } : { backgroundColor: colors.inputBg }]}
                onPress={() => setVendorFilter(v.id)}
              >
                <Text style={[styles.controlBadgeText, { color: vendorFilter === v.id ? colors.white : colors.text }]}>{v.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
            <TouchableOpacity 
              style={[styles.utilButton, hideCompleted && { backgroundColor: `${colors.primary}15` }]} 
              onPress={() => setHideCompleted(!hideCompleted)}
            >
              <Text style={[styles.utilButtonText, { color: hideCompleted ? colors.primary : colors.muted }]}>Hide Completed</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.utilButton, sortByAisle && { backgroundColor: `${colors.primary}15` }]} 
              onPress={() => setSortByAisle(!sortByAisle)}
            >
              <Text style={[styles.utilButtonText, { color: sortByAisle ? colors.primary : colors.muted }]}>Sort by Aisle</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={{ flex: 1, padding: 16 }}>
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : filteredItems.length > 0 ? (
            filteredItems.map((item: any) => (
              <View 
                key={item.id} 
                style={[
                  styles.itemListItem, 
                  { backgroundColor: colors.cardBg, borderColor: colors.border },
                  item.isPurchased && { opacity: 0.6, backgroundColor: `${colors.success}05` }
                ]}
              >
                <TouchableOpacity 
                  style={[styles.itemCheckTrigger, { borderColor: colors.border }, item.isPurchased && { backgroundColor: colors.success, borderColor: colors.success }]}
                  onPress={() => toggleItemMutation.mutate({ itemId: item.id, isPurchased: !item.isPurchased })}
                >
                  {item.isPurchased && <Check color={colors.white} size={14} />}
                </TouchableOpacity>

                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={[styles.itemName, { color: colors.text }, item.isPurchased && { textDecorationLine: "line-through" }]}>{item.name}</Text>
                    <View style={[styles.qtyBadge, { backgroundColor: colors.inputBg }]}>
                      <Text style={{ fontSize: 10, color: colors.text }}>{item.quantity}</Text>
                    </View>
                    {item.priority === "high" && (
                      <View style={{ backgroundColor: `${colors.danger}15`, paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4 }}>
                        <Text style={{ fontSize: 9, color: colors.danger, fontWeight: "700" }}>URGENT</Text>
                      </View>
                    )}
                  </View>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                    <Text style={{ fontSize: 11, color: colors.muted }}>🏪 {item.vendorId?.name || "General"}</Text>
                    {item.aisle ? <Text style={{ fontSize: 11, color: colors.muted }}>📦 Aisle {item.aisle}</Text> : null}
                  </View>
                </View>

                {isAdmin && (
                  <TouchableOpacity style={{ padding: 6 }} onPress={() => deleteItemMutation.mutate(item.id)}>
                    <Trash2 color={colors.danger} size={14} />
                  </TouchableOpacity>
                )}
              </View>
            ))
          ) : (
            <View style={{ alignItems: "center", paddingVertical: 40 }}>
              <Package color={colors.muted} size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
              <Text style={{ color: colors.muted, fontSize: 13 }}>No items in this list</Text>
            </View>
          )}
        </ScrollView>

        <View style={[styles.modalFooter, { borderTopColor: colors.border, backgroundColor: colors.cardBg }]}>
          <TouchableOpacity 
            style={[styles.saveBtn, { backgroundColor: colors.primary, flex: 1 }]} 
            onPress={() => setIsAddItemOpen(true)}
          >
            <Plus color={colors.white} size={16} style={{ marginRight: 6 }} />
            <Text style={styles.saveBtnText}>Add Item</Text>
          </TouchableOpacity>
        </View>

        <AddItemModal 
          isOpen={isAddItemOpen} 
          onClose={() => setIsAddItemOpen(false)} 
          listId={list.id} 
          employees={employees}
          allVendors={allVendors}
          currentAssignedId={list.assignedEmployeeId?._id || list.assignedEmployeeId?.id || list.assignedEmployeeId}
          currentVendorIds={list.vendors?.map((v: any) => v._id || v.id) || []}
          colors={colors}
          styles={styles}
        />
      </SafeAreaView>
    </Modal>
  );
}

function AddItemModal({ isOpen, onClose, listId, allVendors, employees, currentAssignedId, currentVendorIds, colors, styles }: any) {
  const queryClient = useQueryClient();
  const [listData, setListData] = useState({
    assignedEmployeeId: currentAssignedId || "",
    vendorIds: currentVendorIds || []
  });
  const [formData, setFormData] = useState({
    name: "",
    quantity: "1",
    vendorId: "",
    category: "General",
    priority: "medium",
    aisle: "",
    notes: "",
    assignedEmployeeId: ""
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (listData.assignedEmployeeId !== currentAssignedId) {
        await apiFetch(`/api/shopping-lists/${listId}`, {
          method: "PUT",
          body: JSON.stringify({
            assignedEmployeeId: listData.assignedEmployeeId,
            vendors: listData.vendorIds
          })
        });
      }

      const payload = { ...data };
      if (!payload.assignedEmployeeId) payload.assignedEmployeeId = null;
      return apiFetch(`/api/shopping-lists/${listId}/items`, {
        method: "POST",
        body: JSON.stringify(payload)
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["shopping-list", listId] });
      void queryClient.invalidateQueries({ queryKey: ["shopping-lists"] });
      onClose();
      setFormData({ name: "", quantity: "1", vendorId: "", category: "General", priority: "medium", aisle: "", notes: "", assignedEmployeeId: "" });
      Alert.alert("Success", "Item added and list settings updated");
    },
    onError: () => Alert.alert("Error", "Failed to add item. Please try again.")
  });

  return (
    <Modal visible={isOpen} animationType="slide" transparent>
      <View style={styles.nestedModalOverlay}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={[styles.nestedModalContent, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border, backgroundColor: colors.cardBg }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Add Item to List</Text>
            <TouchableOpacity onPress={onClose}>
              <X color={colors.text} size={20} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ padding: 16 }}>
            <View style={styles.inputGroup}>
              <Text style={[styles.fieldLabel, { color: colors.muted }]}>Item Name</Text>
              <TextInput
                value={formData.name}
                onChangeText={text => setFormData({ ...formData, name: text })}
                placeholder="e.g., Avocados (Case)"
                placeholderTextColor={colors.muted}
                style={[styles.input, { backgroundColor: colors.cardBg, color: colors.text, borderColor: colors.border }]}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.fieldLabel, { color: colors.muted }]}>Quantity</Text>
              <TextInput
                value={formData.quantity}
                onChangeText={text => setFormData({ ...formData, quantity: text })}
                placeholder="1 unit"
                placeholderTextColor={colors.muted}
                style={[styles.input, { backgroundColor: colors.cardBg, color: colors.text, borderColor: colors.border }]}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.fieldLabel, { color: colors.muted }]}>Aisle (Optional)</Text>
              <TextInput
                value={formData.aisle}
                onChangeText={text => setFormData({ ...formData, aisle: text })}
                placeholder="e.g., 4"
                placeholderTextColor={colors.muted}
                style={[styles.input, { backgroundColor: colors.cardBg, color: colors.text, borderColor: colors.border }]}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.fieldLabel, { color: colors.muted }]}>Vendor ID (Optional)</Text>
              <TextInput
                value={formData.vendorId}
                onChangeText={text => setFormData({ ...formData, vendorId: text })}
                placeholder="Enter Vendor ID"
                placeholderTextColor={colors.muted}
                style={[styles.input, { backgroundColor: colors.cardBg, color: colors.text, borderColor: colors.border }]}
              />
            </View>

            <View style={{ height: 20 }} />
          </ScrollView>

          <View style={[styles.modalFooter, { borderTopColor: colors.border, backgroundColor: colors.cardBg }]}>
            <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={onClose}>
              <Text style={[styles.cancelBtnText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.primary }]}
              onPress={() => mutation.mutate(formData)}
              disabled={!formData.name}
            >
              <Text style={styles.saveBtnText}>Add Item</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function EditListModal({ isOpen, onClose, list, colors, styles }: any) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: list.name,
    companyId: list.companyId?._id || list.companyId?.id || list.companyId || "",
    locationId: list.locationId?._id || list.locationId?.id || list.locationId || "",
    assignedEmployeeId: list.assignedEmployeeId?._id || list.assignedEmployeeId?.id || list.assignedEmployeeId || "",
    notes: list.notes || "",
    status: list.status || "open"
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      return apiFetch(`/api/shopping-lists/${list.id}`, {
        method: "PUT",
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      Alert.alert("Success", "Shopping list updated!");
      void queryClient.invalidateQueries({ queryKey: ["shopping-lists"] });
      onClose();
    },
    onError: () => Alert.alert("Error", "Failed to update list")
  });

  return (
    <Modal visible={isOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border, backgroundColor: colors.cardBg }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Shopping List</Text>
          <TouchableOpacity onPress={onClose}>
            <X color={colors.text} size={24} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalFormContent}>
          <View style={styles.inputGroup}>
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>List Name</Text>
            <TextInput
              value={formData.name}
              onChangeText={text => setFormData({ ...formData, name: text })}
              style={[styles.input, { backgroundColor: colors.cardBg, color: colors.text, borderColor: colors.border }]}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>Company ID</Text>
            <TextInput
              value={formData.companyId}
              onChangeText={text => setFormData({ ...formData, companyId: text })}
              style={[styles.input, { backgroundColor: colors.cardBg, color: colors.text, borderColor: colors.border }]}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>Location ID</Text>
            <TextInput
              value={formData.locationId}
              onChangeText={text => setFormData({ ...formData, locationId: text })}
              style={[styles.input, { backgroundColor: colors.cardBg, color: colors.text, borderColor: colors.border }]}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>Employee ID Assignment</Text>
            <TextInput
              value={formData.assignedEmployeeId}
              onChangeText={text => setFormData({ ...formData, assignedEmployeeId: text })}
              style={[styles.input, { backgroundColor: colors.cardBg, color: colors.text, borderColor: colors.border }]}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>Notes</Text>
            <TextInput
              value={formData.notes}
              onChangeText={text => setFormData({ ...formData, notes: text })}
              multiline
              textAlignVertical="top"
              style={[styles.input, { backgroundColor: colors.cardBg, color: colors.text, borderColor: colors.border, height: 80, paddingTop: 10 }]}
            />
          </View>
        </ScrollView>

        <View style={[styles.modalFooter, { borderTopColor: colors.border, backgroundColor: colors.cardBg }]}>
          <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={onClose}>
            <Text style={[styles.cancelBtnText, { color: colors.text }]}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.background }]}
            onPress={() => mutation.mutate(formData)}
            disabled={mutation.isPending || !formData.name}
          >
            <Text style={styles.saveBtnText}>{mutation.isPending ? "Saving..." : "Save Changes"}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1 },
    header: { padding: 16, borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    title: { fontSize: 20, fontWeight: "700" },
    subtitle: { fontSize: 12, marginTop: 2, width: width * 0.55 },
    createButton: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12,
       paddingVertical: 8, borderRadius: 8 },
    createButtonText: { color: colors.white, fontSize: 12, fontWeight: "600" },
    filterSection: { padding: 16, gap: 12 },
    tabsContainer: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.border },
    tabTrigger: { paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: 2, borderBottomColor: "transparent" },
    tabText: { fontSize: 13, fontWeight: "600" },
    searchBox: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, height: 40 },
    searchInput: { flex: 1, fontSize: 14 },
    listCard: { borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 12 },
    cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
    cardTitleBlock: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1, paddingRight: 8 },
    iconWrapper: { width: 36, height: 36, borderRadius: 8, alignItems: "center", justifyContent: "center" },
    cardTitle: { fontSize: 15, fontWeight: "600" },
    cardDate: { fontSize: 11, marginTop: 2 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    statusBadgeText: { fontSize: 10, fontWeight: "700" },
    cardInfoRows: { marginTop: 14, gap: 6 },
    infoRow: { flexDirection: "row", alignItems: "center" },
    infoRowText: { fontSize: 12, flex: 1 },
    adminActionsRow: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
    actionIconButton: { padding: 8, borderRadius: 6 },
    emptyContainer: { alignItems: "center", justifyContent: "center", marginTop: 60, paddingHorizontal: 24 },
    emptyIconWrapper: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: 12 },
    emptyTitle: { fontSize: 16, fontWeight: "600" },
    emptySubtitle: { fontSize: 13, textAlign: "center", marginTop: 4 },
    modalContainer: { flex: 1 },
    modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1 },
    modalTitle: { fontSize: 18, fontWeight: "700" },
    modalFormContent: { flex: 1, padding: 16 },
    inputGroup: { marginBottom: 16 },
    fieldLabel: { fontSize: 13, fontWeight: "500", marginBottom: 6 },
    input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, height: 40, fontSize: 14 },
    modalFooter: { flexDirection: "row", justifyContent: "flex-end", gap: 12, padding: 16, borderTopWidth: 1 },
    cancelBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, justifyContent: "center", alignItems: "center" },
    cancelBtnText: { fontSize: 14, fontWeight: "600" },
    saveBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, justifyContent: "center", alignItems: "center", flexDirection: "row" },
    saveBtnText: { color: colors.white, fontSize: 14, fontWeight: "600" },
    detailControlsRow: { padding: 16, borderBottomWidth: 1 },
    controlBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginRight: 6 },
    controlBadgeText: { fontSize: 12, fontWeight: "500" },
    utilButton: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
    utilButtonText: { fontSize: 12, fontWeight: "600" },
    itemListItem: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 8 },
    itemCheckTrigger: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: "center", justifyContent: "center" },
    itemName: { fontSize: 14, fontWeight: "500" },
    qtyBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    nestedModalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 20 },
    nestedModalContent: { borderRadius: 12, borderWidth: 1, maxHeight: "80%", overflow: "hidden" }
  });
}