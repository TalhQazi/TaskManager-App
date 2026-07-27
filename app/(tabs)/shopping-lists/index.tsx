import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  SafeAreaView,
  StatusBar,
  Alert,
  Dimensions,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/admin/apiClient";
import { s, wp, hp, fs } from "@/util/styles";

const { height } = Dimensions.get("window");

interface ShoppingList {
  id: string;
  name: string;
  companyId?: { id: string; name: string };
  locationId?: { id: string; name: string };
  projectId?: { id: string; name: string };
  assignedEmployeeId?: { id: string; _id?: string; name: string; username: string };
  vendors: { id: string; _id?: string; name: string }[];
  notes: string;
  status: "open" | "completed" | "archived";
  createdAt: string;
}

interface ShoppingListItem {
  id: string;
  shoppingListId: string;
  name: string;
  quantity: string;
  vendorId?: { id: string; _id?: string; name: string };
  assignedEmployeeId?: { id: string; _id?: string; name: string; username: string };
  category: string;
  priority: "low" | "medium" | "high";
  notes: string;
  isPurchased: boolean;
  purchasedAt?: string;
  aisle: string;
}

interface OptionItem {
  id: string;
  name: string;
}

export default function ShoppingLists() {
  const [activeTab, setActiveTab] = useState("my-lists");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedList, setSelectedList] = useState<ShoppingList | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const queryClient = useQueryClient();
  const { uiTheme } = useTheme();
  const { user } = useAuth();

  const isAdmin = useMemo(() => {
    const role = user?.role || "";
    return ["admin", "super-admin", "manager"].includes(role);
  }, [user]);

  const isLightTheme = useMemo(() => {
    return uiTheme.theme?.includes("crystal") || uiTheme.panelColors?.dashboardTextColor === "#000000";
  }, [uiTheme]);

  const bg = useMemo(() => uiTheme.panelColors?.dashboardBackground || (isLightTheme ? "#ffffff" : "#09090b"), [uiTheme, isLightTheme]);
  const cardBg = useMemo(() => uiTheme.panelColors?.dashboardCardBackground || (isLightTheme ? "#f8fafc" : "#18181b"), [uiTheme, isLightTheme]);
  const tintColor = useMemo(() => uiTheme.panelColors?.dashboardTextColor || (isLightTheme ? "#0f172a" : "#ffffff"), [uiTheme, isLightTheme]);
  const mutedText = useMemo(() => (isLightTheme ? "#64748b" : "#a1a1aa"), [isLightTheme]);
  const primaryColor = useMemo(() => uiTheme.customColors?.primary || "#133767", [uiTheme]);
  const border = useMemo(() => (isLightTheme ? "rgba(0, 0, 0, 0.08)" : "rgba(255, 255, 255, 0.08)"), [isLightTheme]);

  const { data: listsData, isLoading } = useQuery({
    queryKey: ["shopping-lists", activeTab, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      const res = await apiFetch<{ items: ShoppingList[] }>(`/api/shopping-lists?${params.toString()}`);
      return res.items || [];
    },
    refetchInterval: 10000,
  });

  const { data: companies } = useQuery({
    queryKey: ["companies-minimal"],
    queryFn: async () => {
      const res = await apiFetch<{ items: any[] }>("/api/companies?limit=100");
      return (res.items || []).map((c) => ({ id: c.id || c._id, name: c.name }));
    },
  });

  const { data: locations } = useQuery({
    queryKey: ["locations-minimal"],
    queryFn: async () => {
      const res = await apiFetch<{ items: any[] }>("/api/locations?limit=100");
      return (res.items || []).map((l) => ({ id: l.id || l._id, name: l.name }));
    },
  });

  const { data: employees } = useQuery({
    queryKey: ["employees-minimal"],
    queryFn: async () => {
      const res = await apiFetch<{ items: any[] }>("/api/users?limit=100");
      return (res.items || []).map((e) => ({ id: e.id || e._id, name: e.name || e.username }));
    },
  });

  const { data: vendors } = useQuery({
    queryKey: ["vendors-minimal"],
    queryFn: async () => {
      const res = await apiFetch<{ items: any[] }>("/api/vendors?limit=100");
      return (res.items || [])
        .filter((v: any) => v.status === "approved")
        .map((v) => ({ id: v.id || v._id, name: v.name }));
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
      Alert.alert("Success", "Status updated");
      queryClient.invalidateQueries({ queryKey: ["shopping-lists"] });
    },
  });

  const getStatusColor = (status: string) => {
    if (status === "open") return "#10B981";
    if (status === "completed") return "#3B82F6";
    return "#6B7280";
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  return (
    <SafeAreaView style={s([styles.container, { backgroundColor: bg }])}>
      <StatusBar barStyle={isLightTheme ? "dark-content" : "light-content"} backgroundColor={bg} />

      <ScrollView contentContainerStyle={s(styles.scrollContent)} showsVerticalScrollIndicator={false}>
        <View style={s(styles.headerSection)}>
          <View>
            <Text style={s([styles.headerTitle, { color: tintColor }])}>Shopping & Procurement</Text>
            <Text style={s([styles.headerSubtitle, { color: mutedText }])}>
              Manage vendor lists, assignments, and real-time store tracking.
            </Text>
          </View>

          <TouchableOpacity
            style={s([styles.createButton, { backgroundColor: primaryColor }])}
            onPress={() => setIsCreateModalOpen(true)}
          >
            <Ionicons name="add" size={fs(4.5)} color="#ffffff" />
            <Text style={s(styles.createButtonText)}>Create New List</Text>
          </TouchableOpacity>
        </View>

        <View style={s(styles.filterSection)}>
          <View style={s([styles.tabsTrack, { backgroundColor: cardBg, borderColor: border }])}>
            <TouchableOpacity
              style={s([styles.tabItem, activeTab === "my-lists" && { backgroundColor: primaryColor }])}
              onPress={() => setActiveTab("my-lists")}
            >
              <Text style={s([styles.tabText, { color: activeTab === "my-lists" ? "#ffffff" : mutedText }])}>
                My Assigned Lists
              </Text>
            </TouchableOpacity>

            {isAdmin && (
              <TouchableOpacity
                style={s([styles.tabItem, activeTab === "all-lists" && { backgroundColor: primaryColor }])}
                onPress={() => setActiveTab("all-lists")}
              >
                <Text style={s([styles.tabText, { color: activeTab === "all-lists" ? "#ffffff" : mutedText }])}>
                  All Company Lists
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={s([styles.searchBox, { backgroundColor: cardBg, borderColor: border }])}>
            <Ionicons name="search-outline" size={fs(4.2)} color={mutedText} style={s({ marginRight: wp(2) })} />
            <TextInput
              placeholder="Search lists..."
              placeholderTextColor={mutedText}
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={s([styles.searchInput, { color: tintColor }])}
            />
          </View>
        </View>

        {isLoading ? (
          <View style={s(styles.centerContainer)}>
            <ActivityIndicator size="large" color={primaryColor} />
          </View>
        ) : !listsData || listsData.length === 0 ? (
          <View style={s([styles.emptyContainer, { backgroundColor: cardBg, borderColor: border }])}>
            <Ionicons name="cart-outline" size={fs(12)} color={mutedText} />
            <Text style={s([styles.emptyTitle, { color: tintColor }])}>No lists found</Text>
            <Text style={s([styles.emptySubtitle, { color: mutedText }])}>
              Try adjusting your filters or create a new list.
            </Text>
          </View>
        ) : (
          <View style={s(styles.listGrid)}>
            {listsData.map((list) => (
              <View key={list.id} style={s([styles.cardWrapper, { backgroundColor: cardBg, borderColor: border }])}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    setSelectedList(list);
                    setIsDetailOpen(true);
                  }}
                  style={s(styles.cardInner)}
                >
                  <View style={s(styles.cardHeader)}>
                    <View style={s(styles.cardTitleGroup)}>
                      <View style={s([styles.cardIconBox, { backgroundColor: primaryColor + "15" }])}>
                        <Ionicons name="cart-outline" size={fs(4.5)} color={primaryColor} />
                      </View>
                      <View style={s({ flex: 1 })}>
                        <Text style={s([styles.listNameText, { color: tintColor }])} numberOfLines={1}>
                          {list.name}
                        </Text>
                        <Text style={s([styles.listDateText, { color: mutedText }])}>
                          {formatDate(list.createdAt)}
                        </Text>
                      </View>
                    </View>

                    <View style={s([styles.statusBadge, { backgroundColor: getStatusColor(list.status) + "20" }])}>
                      <Text style={s([styles.statusBadgeText, { color: getStatusColor(list.status) }])}>
                        {list.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <View style={s(styles.cardBody)}>
                    {list.locationId && (
                      <View style={s(styles.metaItemRow)}>
                        <Ionicons name="location-outline" size={fs(3.5)} color={mutedText} />
                        <Text style={s([styles.metaItemText, { color: mutedText }])} numberOfLines={1}>
                          {list.locationId.name}
                        </Text>
                      </View>
                    )}

                    {list.assignedEmployeeId && (
                      <View style={s(styles.metaItemRow)}>
                        <Ionicons name="person-outline" size={fs(3.5)} color={mutedText} />
                        <Text style={s([styles.metaItemText, { color: mutedText }])} numberOfLines={1}>
                          Assigned to: {list.assignedEmployeeId.name || list.assignedEmployeeId.username}
                        </Text>
                      </View>
                    )}

                    <View style={s(styles.metaItemRow)}>
                      <Ionicons name="storefront-outline" size={fs(3.5)} color={mutedText} />
                      <Text style={s([styles.metaItemText, { color: mutedText }])} numberOfLines={1}>
                        {list.vendors?.length
                          ? list.vendors.map((v) => v.name).join(", ")
                          : "No vendors specified"}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>

                {isAdmin && (
                  <View style={s([styles.cardAdminActions, { borderTopColor: border }])}>
                    <TouchableOpacity
                      style={s(styles.actionIconButton)}
                      onPress={() => {
                        setSelectedList(list);
                        setIsEditModalOpen(true);
                      }}
                    >
                      <Ionicons name="create-outline" size={fs(4.2)} color={tintColor} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={s(styles.actionIconButton)}
                      onPress={() => {
                        Alert.alert("Delete List", "Are you sure you want to delete this list?", [
                          { text: "Cancel", style: "cancel" },
                          { text: "Delete", style: "destructive", onPress: () => deleteListMutation.mutate(list.id) },
                        ]);
                      }}
                    >
                      <Ionicons name="trash-outline" size={fs(4.2)} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <CreateListModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        companies={companies || []}
        locations={locations || []}
        employees={employees || []}
        vendors={vendors || []}
        cardBg={cardBg}
        tintColor={tintColor}
        mutedText={mutedText}
        border={border}
        primaryColor={primaryColor}
        bg={bg}
      />

      {isEditModalOpen && selectedList && (
        <EditListModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          list={selectedList}
          companies={companies || []}
          locations={locations || []}
          employees={employees || []}
          vendors={vendors || []}
          cardBg={cardBg}
          tintColor={tintColor}
          mutedText={mutedText}
          border={border}
          primaryColor={primaryColor}
          bg={bg}
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
          allVendors={vendors || []}
          employees={employees || []}
          isAdmin={isAdmin}
          onUpdateStatus={(status: string) => updateStatusMutation.mutate({ id: selectedList.id, status })}
          cardBg={cardBg}
          tintColor={tintColor}
          mutedText={mutedText}
          border={border}
          primaryColor={primaryColor}
          bg={bg}
        />
      )}
    </SafeAreaView>
  );
}

function CreateListModal({
  isOpen,
  onClose,
  companies,
  locations,
  employees,
  vendors,
  cardBg,
  tintColor,
  mutedText,
  border,
  primaryColor,
  bg,
}: any) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: "",
    companyId: "",
    locationId: "",
    notes: "",
    vendorIds: [] as string[],
  });

  const [pickerModal, setPickerModal] = useState<{
    visible: boolean;
    title: string;
    items: OptionItem[];
    onSelect: (id: string) => void;
  }>({
    visible: false,
    title: "",
    items: [],
    onSelect: () => {},
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      return apiFetch("/api/shopping-lists", {
        method: "POST",
        body: JSON.stringify({
          ...data,
          vendors: data.vendorIds,
        }),
      });
    },
    onSuccess: () => {
      Alert.alert("Success", "Shopping list created!");
      queryClient.invalidateQueries({ queryKey: ["shopping-lists"] });
      onClose();
      setFormData({ name: "", companyId: "", locationId: "", notes: "", vendorIds: [] });
    },
  });

  const selectedCompanyName = useMemo(() => {
    return companies.find((c: OptionItem) => c.id === formData.companyId)?.name || "Select Company";
  }, [companies, formData.companyId]);

  const selectedLocationName = useMemo(() => {
    return locations.find((l: OptionItem) => l.id === formData.locationId)?.name || "Select Location";
  }, [locations, formData.locationId]);

  return (
    <Modal visible={isOpen} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s(styles.modalOverlay)}>
        <View style={s([styles.modalContainer, { backgroundColor: cardBg }])}>
          <View style={s([styles.modalHeaderRow, { borderBottomColor: border }])}>
            <Text style={s([styles.modalTitleText, { color: tintColor }])}>New Shopping List</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={fs(5)} color={tintColor} />
            </TouchableOpacity>
          </View>

          <ScrollView style={s(styles.modalBody)} showsVerticalScrollIndicator={false}>
            <Text style={s([styles.inputLabel, { color: mutedText }])}>List Name</Text>
            <TextInput
              style={s([styles.modalTextInput, { backgroundColor: bg, borderColor: border, color: tintColor }])}
              placeholder="e.g., Weekly Produce - Downtown"
              placeholderTextColor={mutedText}
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
            />

            <Text style={s([styles.inputLabel, { color: mutedText, marginTop: hp(1.5) }])}>Company</Text>
            <TouchableOpacity
              style={s([styles.dropdownSelector, { backgroundColor: bg, borderColor: border }])}
              onPress={() =>
                setPickerModal({
                  visible: true,
                  title: "Select Company",
                  items: companies,
                  onSelect: (id) => setFormData({ ...formData, companyId: id }),
                })
              }
            >
              <Text style={s([styles.dropdownSelectorText, { color: formData.companyId ? tintColor : mutedText }])}>
                {selectedCompanyName}
              </Text>
              <Ionicons name="chevron-down" size={fs(4)} color={mutedText} />
            </TouchableOpacity>

            <Text style={s([styles.inputLabel, { color: mutedText, marginTop: hp(1.5) }])}>Location</Text>
            <TouchableOpacity
              style={s([styles.dropdownSelector, { backgroundColor: bg, borderColor: border }])}
              onPress={() =>
                setPickerModal({
                  visible: true,
                  title: "Select Location",
                  items: locations,
                  onSelect: (id) => setFormData({ ...formData, locationId: id }),
                })
              }
            >
              <Text style={s([styles.dropdownSelectorText, { color: formData.locationId ? tintColor : mutedText }])}>
                {selectedLocationName}
              </Text>
              <Ionicons name="chevron-down" size={fs(4)} color={mutedText} />
            </TouchableOpacity>

            <Text style={s([styles.inputLabel, { color: mutedText, marginTop: hp(1.5) }])}>Internal Notes</Text>
            <TextInput
              style={s([styles.modalTextInput, { backgroundColor: bg, borderColor: border, color: tintColor }])}
              placeholder="Any specific instructions..."
              placeholderTextColor={mutedText}
              value={formData.notes}
              onChangeText={(text) => setFormData({ ...formData, notes: text })}
            />
          </ScrollView>

          <View style={s([styles.modalFooterRow, { borderTopColor: border }])}>
            <TouchableOpacity style={s(styles.modalCancelButton)} onPress={onClose}>
              <Text style={s([styles.modalCancelText, { color: mutedText }])}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s([styles.modalSubmitButton, { backgroundColor: primaryColor }])}
              onPress={() => mutation.mutate(formData)}
              disabled={mutation.isPending || !formData.name}
            >
              {mutation.isPending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={s(styles.modalSubmitText)}>Create List</Text>
              )}
            </TouchableOpacity>
          </View>

          <CustomPickerModal
            visible={pickerModal.visible}
            title={pickerModal.title}
            items={pickerModal.items}
            onClose={() => setPickerModal({ ...pickerModal, visible: false })}
            onSelect={(id) => {
              pickerModal.onSelect(id);
              setPickerModal({ ...pickerModal, visible: false });
            }}
            cardBg={cardBg}
            tintColor={tintColor}
            border={border}
          />
        </View>
      </View>
    </Modal>
  );
}

function ListDetailModal({
  isOpen,
  onClose,
  list,
  allVendors,
  employees,
  isAdmin,
  onUpdateStatus,
  cardBg,
  tintColor,
  mutedText,
  border,
  primaryColor,
  bg,
}: any) {
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
        body: JSON.stringify({ isPurchased }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shopping-list", list.id] });
    },
    onError: () => Alert.alert("Error", "Failed to update item status"),
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      return apiFetch(`/api/shopping-lists/items/${itemId}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shopping-list", list.id] });
      Alert.alert("Success", "Item removed");
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
    <Modal visible={isOpen} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s(styles.modalOverlay)}>
        <View style={s([styles.fullModalContainer, { backgroundColor: cardBg }])}>
          <View style={s([styles.detailHeader, { borderBottomColor: border }])}>
            <View style={s({ flex: 1 })}>
              <View style={s(styles.detailHeaderTopRow)}>
                <Ionicons name="cart-outline" size={fs(5)} color={primaryColor} />
                <Text style={s([styles.detailTitleText, { color: tintColor }])} numberOfLines={1}>
                  {list.name}
                </Text>
              </View>

              <View style={s(styles.detailMetaSubRow)}>
                {list.locationId && (
                  <Text style={s([styles.detailMetaSubText, { color: mutedText }])}>
                    Location: {list.locationId.name}
                  </Text>
                )}
                {list.assignedEmployeeId && (
                  <Text style={s([styles.detailMetaSubText, { color: mutedText }])}>
                    Assigned: {list.assignedEmployeeId.name || list.assignedEmployeeId.username}
                  </Text>
                )}
              </View>

              {isAdmin && (
                <View style={s(styles.statusBadgeRow)}>
                  {["open", "completed", "archived"].map((st) => (
                    <TouchableOpacity
                      key={st}
                      style={s([
                        styles.statusPillBadge,
                        { backgroundColor: list.status === st ? primaryColor : bg, borderColor: border },
                      ])}
                      onPress={() => onUpdateStatus(st)}
                    >
                      <Text
                        style={s([
                          styles.statusPillBadgeText,
                          { color: list.status === st ? "#ffffff" : mutedText },
                        ])}
                      >
                        {st.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <TouchableOpacity style={s(styles.detailCloseBtn)} onPress={onClose}>
              <Ionicons name="close" size={fs(5.5)} color={tintColor} />
            </TouchableOpacity>
          </View>

          <View style={s([styles.detailControlBar, { borderBottomColor: border, backgroundColor: bg }])}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s(styles.vendorChipsScroll)}>
              <TouchableOpacity
                style={s([
                  styles.filterChip,
                  { backgroundColor: vendorFilter === "all" ? primaryColor : cardBg, borderColor: border },
                ])}
                onPress={() => setVendorFilter("all")}
              >
                <Text style={s([styles.filterChipText, { color: vendorFilter === "all" ? "#ffffff" : tintColor }])}>
                  All
                </Text>
              </TouchableOpacity>

              {list.vendors?.map((v: any) => (
                <TouchableOpacity
                  key={v.id || v._id}
                  style={s([
                    styles.filterChip,
                    { backgroundColor: vendorFilter === (v.id || v._id) ? primaryColor : cardBg, borderColor: border },
                  ])}
                  onPress={() => setVendorFilter(v.id || v._id)}
                >
                  <Text style={s([styles.filterChipText, { color: vendorFilter === (v.id || v._id) ? "#ffffff" : tintColor }])}>
                    {v.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={s(styles.toggleButtonsRow)}>
              <TouchableOpacity
                style={s([styles.toggleOptionBtn, hideCompleted && { backgroundColor: primaryColor + "15" }])}
                onPress={() => setHideCompleted(!hideCompleted)}
              >
                <Ionicons
                  name={hideCompleted ? "checkbox" : "square-outline"}
                  size={fs(3.8)}
                  color={hideCompleted ? primaryColor : mutedText}
                />
                <Text style={s([styles.toggleOptionText, { color: hideCompleted ? primaryColor : mutedText }])}>
                  Hide Completed
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={s([styles.toggleOptionBtn, sortByAisle && { backgroundColor: primaryColor + "15" }])}
                onPress={() => setSortByAisle(!sortByAisle)}
              >
                <Ionicons name="funnel-outline" size={fs(3.8)} color={sortByAisle ? primaryColor : mutedText} />
                <Text style={s([styles.toggleOptionText, { color: sortByAisle ? primaryColor : mutedText }])}>
                  Sort by Aisle
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {isLoading ? (
            <View style={s(styles.centerContainer)}>
              <ActivityIndicator size="large" color={primaryColor} />
            </View>
          ) : (
            <FlatList
              data={filteredItems}
              keyExtractor={(item) => item.id}
              contentContainerStyle={s(styles.itemsListContent)}
              ListEmptyComponent={
                <View style={s(styles.emptyItemsBox)}>
                  <Ionicons name="cube-outline" size={fs(10)} color={mutedText} />
                  <Text style={s([styles.emptyItemsText, { color: mutedText }])}>No items in this list</Text>
                </View>
              }
              renderItem={({ item }) => (
                <View
                  style={s([
                    styles.itemCardRow,
                    {
                      backgroundColor: item.isPurchased ? cardBg : bg,
                      borderColor: border,
                      opacity: item.isPurchased ? 0.6 : 1,
                    },
                  ])}
                >
                  <TouchableOpacity
                    style={s(styles.checkboxTouchable)}
                    onPress={() => toggleItemMutation.mutate({ itemId: item.id, isPurchased: !item.isPurchased })}
                  >
                    <Ionicons
                      name={item.isPurchased ? "checkbox" : "square-outline"}
                      size={fs(5)}
                      color={item.isPurchased ? "#10B981" : mutedText}
                    />
                  </TouchableOpacity>

                  <View style={s({ flex: 1, marginLeft: wp(2) })}>
                    <View style={s(styles.itemTitleRow)}>
                      <Text
                        style={s([
                          styles.itemNameText,
                          { color: tintColor },
                          item.isPurchased && styles.strikethroughText,
                        ])}
                      >
                        {item.name}
                      </Text>
                      <View style={s([styles.qtyBadge, { backgroundColor: primaryColor + "15" }])}>
                        <Text style={s([styles.qtyBadgeText, { color: primaryColor }])}>{item.quantity}</Text>
                      </View>
                      {item.priority === "high" && (
                        <View style={s(styles.urgentBadge)}>
                          <Text style={s(styles.urgentBadgeText)}>URGENT</Text>
                        </View>
                      )}
                    </View>

                    <View style={s(styles.itemMetaRow)}>
                      <Text style={s([styles.itemMetaText, { color: mutedText }])}>
                        Vendor: {item.vendorId?.name || "General"}
                      </Text>
                      {item.aisle ? (
                        <Text style={s([styles.itemMetaText, { color: mutedText }])}>
                          • Aisle {item.aisle}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  <TouchableOpacity
                    style={s(styles.deleteItemBtn)}
                    onPress={() => deleteItemMutation.mutate(item.id)}
                  >
                    <Ionicons name="trash-outline" size={fs(4.2)} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              )}
            />
          )}

          <View style={s([styles.detailFooterBar, { borderTopColor: border }])}>
            <TouchableOpacity
              style={s([styles.addItemModalTrigger, { backgroundColor: primaryColor }])}
              onPress={() => setIsAddItemOpen(true)}
            >
              <Ionicons name="add" size={fs(4.5)} color="#ffffff" />
              <Text style={s(styles.addItemModalTriggerText)}>Add Item</Text>
            </TouchableOpacity>
          </View>

          <AddItemModal
            isOpen={isAddItemOpen}
            onClose={() => setIsAddItemOpen(false)}
            listId={list.id}
            allVendors={allVendors}
            employees={employees}
            currentAssignedId={
              list.assignedEmployeeId?._id || list.assignedEmployeeId?.id || list.assignedEmployeeId
            }
            currentVendorIds={list.vendors?.map((v: any) => v._id || v.id) || []}
            cardBg={cardBg}
            tintColor={tintColor}
            mutedText={mutedText}
            border={border}
            primaryColor={primaryColor}
            bg={bg}
          />
        </View>
      </View>
    </Modal>
  );
}

function AddItemModal({
  isOpen,
  onClose,
  listId,
  allVendors,
  employees,
  currentAssignedId,
  currentVendorIds,
  cardBg,
  tintColor,
  mutedText,
  border,
  primaryColor,
  bg,
}: any) {
  const queryClient = useQueryClient();
  const [listData, setListData] = useState({
    assignedEmployeeId: currentAssignedId || "",
    vendorIds: currentVendorIds || [],
  });

  const [formData, setFormData] = useState({
    name: "",
    quantity: "1",
    vendorId: "",
    category: "General",
    priority: "medium",
    aisle: "",
    notes: "",
    assignedEmployeeId: "",
  });

  const [pickerModal, setPickerModal] = useState<{
    visible: boolean;
    title: string;
    items: OptionItem[];
    onSelect: (id: string) => void;
  }>({
    visible: false,
    title: "",
    items: [],
    onSelect: () => {},
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (
        listData.assignedEmployeeId !== currentAssignedId ||
        JSON.stringify(listData.vendorIds.sort()) !== JSON.stringify(currentVendorIds.sort())
      ) {
        await apiFetch(`/api/shopping-lists/${listId}`, {
          method: "PUT",
          body: JSON.stringify({
            assignedEmployeeId: listData.assignedEmployeeId,
            vendors: listData.vendorIds,
          }),
        });
      }

      const payload = { ...data };
      if (payload.vendorId === "none") payload.vendorId = null;
      if (payload.assignedEmployeeId === "none" || !payload.assignedEmployeeId) payload.assignedEmployeeId = null;

      return apiFetch(`/api/shopping-lists/${listId}/items`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shopping-list", listId] });
      queryClient.invalidateQueries({ queryKey: ["shopping-lists"] });
      onClose();
      setFormData({
        name: "",
        quantity: "1",
        vendorId: "",
        category: "General",
        priority: "medium",
        aisle: "",
        notes: "",
        assignedEmployeeId: "",
      });
      Alert.alert("Success", "Item added and list settings updated");
    },
    onError: () => Alert.alert("Error", "Failed to add item. Please try again."),
  });

  return (
    <Modal visible={isOpen} animationType="fade" transparent onRequestClose={onClose}>
      <View style={s(styles.modalOverlay)}>
        <View style={s([styles.modalContainer, { backgroundColor: cardBg }])}>
          <View style={s([styles.modalHeaderRow, { borderBottomColor: border }])}>
            <Text style={s([styles.modalTitleText, { color: tintColor }])}>Add Item to List</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={fs(5)} color={tintColor} />
            </TouchableOpacity>
          </View>

          <ScrollView style={s(styles.modalBody)} showsVerticalScrollIndicator={false}>
            <Text style={s([styles.inputLabel, { color: mutedText }])}>Item Name</Text>
            <TextInput
              style={s([styles.modalTextInput, { backgroundColor: bg, borderColor: border, color: tintColor }])}
              placeholder="e.g., Avocados (Case)"
              placeholderTextColor={mutedText}
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
            />

            <Text style={s([styles.inputLabel, { color: mutedText, marginTop: hp(1.5) }])}>Quantity</Text>
            <TextInput
              style={s([styles.modalTextInput, { backgroundColor: bg, borderColor: border, color: tintColor }])}
              placeholder="1 unit"
              placeholderTextColor={mutedText}
              value={formData.quantity}
              onChangeText={(text) => setFormData({ ...formData, quantity: text })}
            />

            <Text style={s([styles.inputLabel, { color: mutedText, marginTop: hp(1.5) }])}>Priority</Text>
            <TouchableOpacity
              style={s([styles.dropdownSelector, { backgroundColor: bg, borderColor: border }])}
              onPress={() =>
                setPickerModal({
                  visible: true,
                  title: "Select Priority",
                  items: [
                    { id: "low", name: "Low" },
                    { id: "medium", name: "Medium" },
                    { id: "high", name: "High" },
                  ],
                  onSelect: (id) => setFormData({ ...formData, priority: id as any }),
                })
              }
            >
              <Text style={s([styles.dropdownSelectorText, { color: tintColor, textTransform: "capitalize" }])}>
                {formData.priority}
              </Text>
              <Ionicons name="chevron-down" size={fs(4)} color={mutedText} />
            </TouchableOpacity>

            <Text style={s([styles.inputLabel, { color: mutedText, marginTop: hp(1.5) }])}>Aisle (Optional)</Text>
            <TextInput
              style={s([styles.modalTextInput, { backgroundColor: bg, borderColor: border, color: tintColor }])}
              placeholder="e.g., 4"
              placeholderTextColor={mutedText}
              value={formData.aisle}
              onChangeText={(text) => setFormData({ ...formData, aisle: text })}
            />
          </ScrollView>

          <View style={s([styles.modalFooterRow, { borderTopColor: border }])}>
            <TouchableOpacity style={s(styles.modalCancelButton)} onPress={onClose}>
              <Text style={s([styles.modalCancelText, { color: mutedText }])}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s([styles.modalSubmitButton, { backgroundColor: primaryColor }])}
              onPress={() => mutation.mutate(formData)}
              disabled={mutation.isPending || !formData.name}
            >
              {mutation.isPending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={s(styles.modalSubmitText)}>Add Item</Text>
              )}
            </TouchableOpacity>
          </View>

          <CustomPickerModal
            visible={pickerModal.visible}
            title={pickerModal.title}
            items={pickerModal.items}
            onClose={() => setPickerModal({ ...pickerModal, visible: false })}
            onSelect={(id) => {
              pickerModal.onSelect(id);
              setPickerModal({ ...pickerModal, visible: false });
            }}
            cardBg={cardBg}
            tintColor={tintColor}
            border={border}
          />
        </View>
      </View>
    </Modal>
  );
}

function EditListModal({
  isOpen,
  onClose,
  list,
  companies,
  locations,
  employees,
  vendors,
  cardBg,
  tintColor,
  mutedText,
  border,
  primaryColor,
  bg,
}: any) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: list.name,
    companyId: list.companyId?._id || list.companyId?.id || list.companyId || "",
    locationId: list.locationId?._id || list.locationId?.id || list.locationId || "",
    assignedEmployeeId:
      list.assignedEmployeeId?._id || list.assignedEmployeeId?.id || list.assignedEmployeeId || "",
    vendorIds: list.vendors?.map((v: any) => v._id || v.id || v) || [],
    notes: list.notes || "",
    status: list.status || "open",
  });

  const [pickerModal, setPickerModal] = useState<{
    visible: boolean;
    title: string;
    items: OptionItem[];
    onSelect: (id: string) => void;
  }>({
    visible: false,
    title: "",
    items: [],
    onSelect: () => {},
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      return apiFetch(`/api/shopping-lists/${list.id}`, {
        method: "PUT",
        body: JSON.stringify({
          ...data,
          vendors: data.vendorIds,
        }),
      });
    },
    onSuccess: () => {
      Alert.alert("Success", "Shopping list updated!");
      queryClient.invalidateQueries({ queryKey: ["shopping-lists"] });
      onClose();
    },
    onError: () => Alert.alert("Error", "Failed to update list"),
  });

  const selectedCompanyName = useMemo(() => {
    return companies.find((c: OptionItem) => c.id === formData.companyId)?.name || "Select Company";
  }, [companies, formData.companyId]);

  const selectedLocationName = useMemo(() => {
    return locations.find((l: OptionItem) => l.id === formData.locationId)?.name || "Select Location";
  }, [locations, formData.locationId]);

  const selectedEmployeeName = useMemo(() => {
    return employees.find((e: OptionItem) => e.id === formData.assignedEmployeeId)?.name || "Select Employee";
  }, [employees, formData.assignedEmployeeId]);

  return (
    <Modal visible={isOpen} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s(styles.modalOverlay)}>
        <View style={s([styles.modalContainer, { backgroundColor: cardBg }])}>
          <View style={s([styles.modalHeaderRow, { borderBottomColor: border }])}>
            <Text style={s([styles.modalTitleText, { color: tintColor }])}>Edit Shopping List</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={fs(5)} color={tintColor} />
            </TouchableOpacity>
          </View>

          <ScrollView style={s(styles.modalBody)} showsVerticalScrollIndicator={false}>
            <Text style={s([styles.inputLabel, { color: mutedText }])}>List Name</Text>
            <TextInput
              style={s([styles.modalTextInput, { backgroundColor: bg, borderColor: border, color: tintColor }])}
              placeholder="e.g., Weekly Produce"
              placeholderTextColor={mutedText}
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
            />

            <Text style={s([styles.inputLabel, { color: mutedText, marginTop: hp(1.5) }])}>Company</Text>
            <TouchableOpacity
              style={s([styles.dropdownSelector, { backgroundColor: bg, borderColor: border }])}
              onPress={() =>
                setPickerModal({
                  visible: true,
                  title: "Select Company",
                  items: companies,
                  onSelect: (id) => setFormData({ ...formData, companyId: id }),
                })
              }
            >
              <Text style={s([styles.dropdownSelectorText, { color: tintColor }])}>{selectedCompanyName}</Text>
              <Ionicons name="chevron-down" size={fs(4)} color={mutedText} />
            </TouchableOpacity>

            <Text style={s([styles.inputLabel, { color: mutedText, marginTop: hp(1.5) }])}>Location</Text>
            <TouchableOpacity
              style={s([styles.dropdownSelector, { backgroundColor: bg, borderColor: border }])}
              onPress={() =>
                setPickerModal({
                  visible: true,
                  title: "Select Location",
                  items: locations,
                  onSelect: (id) => setFormData({ ...formData, locationId: id }),
                })
              }
            >
              <Text style={s([styles.dropdownSelectorText, { color: tintColor }])}>{selectedLocationName}</Text>
              <Ionicons name="chevron-down" size={fs(4)} color={mutedText} />
            </TouchableOpacity>

            <Text style={s([styles.inputLabel, { color: mutedText, marginTop: hp(1.5) }])}>Assign To</Text>
            <TouchableOpacity
              style={s([styles.dropdownSelector, { backgroundColor: bg, borderColor: border }])}
              onPress={() =>
                setPickerModal({
                  visible: true,
                  title: "Select Employee",
                  items: employees,
                  onSelect: (id) => setFormData({ ...formData, assignedEmployeeId: id }),
                })
              }
            >
              <Text style={s([styles.dropdownSelectorText, { color: tintColor }])}>{selectedEmployeeName}</Text>
              <Ionicons name="chevron-down" size={fs(4)} color={mutedText} />
            </TouchableOpacity>
          </ScrollView>

          <View style={s([styles.modalFooterRow, { borderTopColor: border }])}>
            <TouchableOpacity style={s(styles.modalCancelButton)} onPress={onClose}>
              <Text style={s([styles.modalCancelText, { color: mutedText }])}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s([styles.modalSubmitButton, { backgroundColor: primaryColor }])}
              onPress={() => mutation.mutate(formData)}
              disabled={mutation.isPending || !formData.name}
            >
              {mutation.isPending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={s(styles.modalSubmitText)}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>

          <CustomPickerModal
            visible={pickerModal.visible}
            title={pickerModal.title}
            items={pickerModal.items}
            onClose={() => setPickerModal({ ...pickerModal, visible: false })}
            onSelect={(id) => {
              pickerModal.onSelect(id);
              setPickerModal({ ...pickerModal, visible: false });
            }}
            cardBg={cardBg}
            tintColor={tintColor}
            border={border}
          />
        </View>
      </View>
    </Modal>
  );
}

function CustomPickerModal({ visible, title, items, onClose, onSelect, cardBg, tintColor, border }: any) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={s(styles.pickerOverlay)} activeOpacity={1} onPress={onClose}>
        <View style={s([styles.pickerContent, { backgroundColor: cardBg }])}>
          <Text style={s([styles.pickerTitle, { color: tintColor }])}>{title}</Text>
          <ScrollView style={s({ maxHeight: height * 0.4 })}>
            {items.map((item: OptionItem) => (
              <TouchableOpacity
                key={item.id}
                style={s([styles.pickerItem, { borderBottomColor: border }])}
                onPress={() => onSelect(item.id)}
              >
                <Text style={s([styles.pickerItemText, { color: tintColor }])}>{item.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: wp(4), paddingBottom: hp(5) },
  headerSection: { marginBottom: hp(2) },
  headerTitle: { fontSize: fs(5.5), fontWeight: "800", letterSpacing: -0.5 },
  headerSubtitle: { fontSize: fs(3.2), marginTop: hp(0.3) },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.2),
    borderRadius: wp(2.5),
    marginTop: hp(1.5),
    gap: wp(1.5),
  },
  createButtonText: { color: "#ffffff", fontSize: fs(3.5), fontWeight: "700" },
  filterSection: { marginBottom: hp(2) },
  tabsTrack: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: wp(2.5),
    padding: wp(1),
    marginBottom: hp(1.5),
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: hp(1),
    borderRadius: wp(2),
  },
  tabText: { fontSize: fs(3.2), fontWeight: "600" },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: wp(2.5),
    paddingHorizontal: wp(3),
    height: hp(5),
  },
  searchInput: { flex: 1, fontSize: fs(3.2), paddingVertical: 0 },
  centerContainer: { paddingVertical: hp(10), alignItems: "center" },
  emptyContainer: {
    borderWidth: 1,
    borderRadius: wp(3.5),
    padding: wp(8),
    alignItems: "center",
    justifyContent: "center",
    marginTop: hp(2),
  },
  emptyTitle: { fontSize: fs(4), fontWeight: "700", marginTop: hp(1.5) },
  emptySubtitle: { fontSize: fs(3.2), marginTop: hp(0.5), textAlign: "center" },
  listGrid: { gap: hp(1.8) },
  cardWrapper: { borderWidth: 1, borderRadius: wp(3.5), overflow: "hidden" },
  cardInner: { padding: wp(4) },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  cardTitleGroup: { flexDirection: "row", alignItems: "center", flex: 1, marginRight: wp(2) },
  cardIconBox: {
    width: wp(10),
    height: wp(10),
    borderRadius: wp(2.5),
    alignItems: "center",
    justifyContent: "center",
    marginRight: wp(2.5),
  },
  listNameText: { fontSize: fs(3.8), fontWeight: "700" },
  listDateText: { fontSize: fs(2.8), marginTop: hp(0.2) },
  statusBadge: { paddingHorizontal: wp(2.5), paddingVertical: hp(0.4), borderRadius: wp(1.5) },
  statusBadgeText: { fontSize: fs(2.5), fontWeight: "700" },
  cardBody: { marginTop: hp(1.5), gap: hp(0.8) },
  metaItemRow: { flexDirection: "row", alignItems: "center", gap: wp(1.5) },
  metaItemText: { fontSize: fs(3) },
  cardAdminActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    borderTopWidth: 1,
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.8),
    gap: wp(2),
  },
  actionIconButton: { padding: wp(1.5) },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: wp(4) },
  modalContainer: { width: "100%", borderRadius: wp(4), overflow: "hidden", maxHeight: height * 0.8 },
  fullModalContainer: { width: "100%", height: "90%", borderRadius: wp(4), overflow: "hidden" },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: wp(4),
    borderBottomWidth: 1,
  },
  modalTitleText: { fontSize: fs(4.2), fontWeight: "800" },
  modalBody: { padding: wp(4) },
  inputLabel: { fontSize: fs(3), fontWeight: "600", marginBottom: hp(0.5) },
  modalTextInput: { borderWidth: 1, borderRadius: wp(2), paddingHorizontal: wp(3), paddingVertical: hp(1.2), fontSize: fs(3.2) },
  dropdownSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: wp(2),
    paddingHorizontal: wp(3),
    paddingVertical: hp(1.2),
  },
  dropdownSelectorText: { fontSize: fs(3.2) },
  modalFooterRow: { flexDirection: "row", justifyContent: "flex-end", padding: wp(4), borderTopWidth: 1, gap: wp(2) },
  modalCancelButton: { paddingHorizontal: wp(4), paddingVertical: hp(1.2) },
  modalCancelText: { fontSize: fs(3.2), fontWeight: "600" },
  modalSubmitButton: { paddingHorizontal: wp(4), paddingVertical: hp(1.2), borderRadius: wp(2) },
  modalSubmitText: { color: "#ffffff", fontSize: fs(3.2), fontWeight: "700" },
  detailHeader: { flexDirection: "row", padding: wp(4), borderBottomWidth: 1 },
  detailHeaderTopRow: { flexDirection: "row", alignItems: "center", gap: wp(2) },
  detailTitleText: { fontSize: fs(4.5), fontWeight: "800", flex: 1 },
  detailMetaSubRow: { marginTop: hp(0.5), gap: hp(0.2) },
  detailMetaSubText: { fontSize: fs(2.8) },
  statusBadgeRow: { flexDirection: "row", gap: wp(1.5), marginTop: hp(1) },
  statusPillBadge: { borderWidth: 1, borderRadius: wp(1.5), paddingHorizontal: wp(2), paddingVertical: hp(0.3) },
  statusPillBadgeText: { fontSize: fs(2.2), fontWeight: "700" },
  detailCloseBtn: { padding: wp(1) },
  detailControlBar: { padding: wp(3), borderBottomWidth: 1 },
  vendorChipsScroll: { gap: wp(1.5), paddingBottom: hp(1) },
  filterChip: { borderWidth: 1, borderRadius: wp(3), paddingHorizontal: wp(3), paddingVertical: hp(0.6) },
  filterChipText: { fontSize: fs(2.8), fontWeight: "600" },
  toggleButtonsRow: { flexDirection: "row", gap: wp(3), marginTop: hp(0.5) },
  toggleOptionBtn: { flexDirection: "row", alignItems: "center", gap: wp(1.5), paddingVertical: hp(0.5) },
  toggleOptionText: { fontSize: fs(2.8), fontWeight: "600" },
  itemsListContent: { padding: wp(4) },
  emptyItemsBox: { paddingVertical: hp(8), alignItems: "center" },
  emptyItemsText: { fontSize: fs(3.5), marginTop: hp(1) },
  itemCardRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: wp(3),
    borderRadius: wp(2.5),
    borderWidth: 1,
    marginBottom: hp(1.2),
  },
  checkboxTouchable: { padding: wp(1) },
  itemTitleRow: { flexDirection: "row", alignItems: "center", gap: wp(2) },
  itemNameText: { fontSize: fs(3.2), fontWeight: "700" },
  strikethroughText: { textDecorationLine: "line-through" },
  qtyBadge: { paddingHorizontal: wp(1.5), paddingVertical: hp(0.2), borderRadius: wp(1) },
  qtyBadgeText: { fontSize: fs(2.2), fontWeight: "700" },
  urgentBadge: { backgroundColor: "rgba(239,68,68,0.15)", paddingHorizontal: wp(1.5), paddingVertical: hp(0.2), borderRadius: wp(1) },
  urgentBadgeText: { color: "#EF4444", fontSize: fs(2.1), fontWeight: "700" },
  itemMetaRow: { flexDirection: "row", alignItems: "center", gap: wp(1.5), marginTop: hp(0.3) },
  itemMetaText: { fontSize: fs(2.5) },
  deleteItemBtn: { padding: wp(1.5) },
  detailFooterBar: { padding: wp(3), borderTopWidth: 1 },
  addItemModalTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: hp(1.2),
    borderRadius: wp(2.5),
    gap: wp(1.5),
  },
  addItemModalTriggerText: { color: "#ffffff", fontSize: fs(3.5), fontWeight: "700" },
  pickerOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: wp(6) },
  pickerContent: { borderRadius: wp(3), padding: wp(4) },
  pickerTitle: { fontSize: fs(4), fontWeight: "800", marginBottom: hp(1.5), textAlign: "center" },
  pickerItem: { paddingVertical: hp(1.5), borderBottomWidth: 1, alignItems: "center" },
  pickerItemText: { fontSize: fs(3.5), fontWeight: "600" },
});