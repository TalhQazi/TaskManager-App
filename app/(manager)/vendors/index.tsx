import React, { useEffect, useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  Linking,
  RefreshControl,
  Dimensions,
} from "react-native";
// Use useLocalSearchParams if you are using Expo Router
// import { useLocalSearchParams } from "expo-router"; 
import {
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  MapPin,
  Phone,
  Mail,
  Building,
  CheckCircle,
  XCircle,
  Globe,
  ChevronDown,
  X,
} from "lucide-react-native";

// Assume apiFetch client is defined somewhere or adapt your path here
import { apiFetch } from "@/lib/admin/apiClient";
import Colors from "@/constants/colors";

interface Vendor {
  _id: string;
  name: string;
  phone: string;
  email: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  website: string;
  serviceType: string;
  location: string;
  status: "approved" | "not-approved";
  notes: string;
  createdAt: string;
}

interface Location {
  _id: string;
  name: string;
}

interface VendorCategory {
  _id: string;
  name: string;
}

export default function VendorsScreen() {
  // If using Expo Router, extract params like this:
  // const { view: viewId } = useLocalSearchParams<{ view?: string }>();
  const viewId = ""; // Mock or hook parameter placeholder

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [categories, setCategories] = useState<VendorCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Filter Selection States
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Filter Picker Modal Controls
  const [activePicker, setActivePicker] = useState<{ type: "category" | "location" | "status" | "form-location" | "form-status"; options: { label: string; value: string }[] } | null>(null);

  // Dialog Visibility states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isNewCategoryOpen, setIsNewCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);

  // Form input bindings
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    street: "",
    city: "",
    state: "",
    zip: "",
    website: "",
    serviceType: "",
    location: "",
    status: "approved" as "approved" | "not-approved",
    notes: "",
  });

  const fetchData = async () => {
    try {
      const [vendorsRes, locationsRes, categoriesRes] = await Promise.all([
        apiFetch<{ items: Vendor[] }>("/api/vendors"),
        apiFetch<{ items: Location[] }>("/api/locations"),
        apiFetch<{ items: VendorCategory[] }>("/api/vendor-categories"),
      ]);
      setVendors(vendorsRes?.items || []);
      setLocations(locationsRes?.items || []);
      setCategories(categoriesRes?.items || []);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      Alert.alert("Error", "Failed to get list data from the backend server.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const filteredVendors = useMemo(() => {
    return vendors.filter((vendor) => {
      const matchesSearch =
        vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vendor.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vendor.serviceType.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesLocation =
        locationFilter === "all" || vendor.location === locationFilter;
      const matchesStatus =
        statusFilter === "all" || vendor.status === statusFilter;
      const matchesCategory =
        categoryFilter === "all" || vendor.serviceType === categoryFilter;
      return matchesSearch && matchesLocation && matchesStatus && matchesCategory;
    });
  }, [vendors, searchQuery, locationFilter, statusFilter, categoryFilter]);

  const approvedCount = vendors.filter((v) => v.status === "approved").length;
  const notApprovedCount = vendors.filter((v) => v.status === "not-approved").length;

  const validateForm = () => {
    if (!formData.name.trim()) {
      Alert.alert("Validation Error", "Name is required");
      return false;
    }
    if (!formData.phone.trim()) {
      Alert.alert("Validation Error", "Phone is required");
      return false;
    }
    if (!formData.serviceType.trim()) {
      Alert.alert("Validation Error", "Service category selection is required");
      return false;
    }
    return true;
  };

  const handleCreate = async () => {
    if (!validateForm()) return;
    try {
      const payload = {
        ...formData,
        location: formData.location === "none-selected" ? "" : formData.location,
      };
      const res = await apiFetch<{ item: Vendor }>("/api/vendors", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setVendors([res.item, ...vendors]);
      setIsCreateOpen(false);
      resetForm();
      Alert.alert("Success", "Vendor added successfully");
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Something went wrong");
    }
  };

  const handleUpdate = async () => {
    if (!selectedVendor) return;
    if (!validateForm()) return;
    try {
      const payload = {
        ...formData,
        location: formData.location === "none-selected" ? "" : formData.location,
      };
      const res = await apiFetch<{ item: Vendor }>(`/api/vendors/${selectedVendor._id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      setVendors(vendors.map((v) => (v._id === res.item._id ? res.item : v)));
      setIsEditOpen(false);
      setSelectedVendor(null);
      resetForm();
      Alert.alert("Success", "Vendor updated successfully");
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Something went wrong");
    }
  };

  const openDeleteConfirmation = (vendor: Vendor) => {
    Alert.alert(
      "Delete Vendor",
      `Are you sure you want to delete ${vendor.name}? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => handleDelete(vendor._id) },
      ]
    );
  };

  const handleDelete = async (id: string) => {
    try {
      await apiFetch(`/api/vendors/${id}`, { method: "DELETE" });
      setVendors(vendors.filter((v) => v._id !== id));
      Alert.alert("Success", "Vendor deleted successfully");
    } catch (error) {
      Alert.alert("Deletion Failed", "Failed to delete item from server backend.");
    }
  };

  const handleAddCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    try {
      const res = await apiFetch<{ item: VendorCategory }>("/api/vendor-categories", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      setCategories([...categories, res.item].sort((a, b) => a.name.localeCompare(b.name)));
      setFormData({ ...formData, serviceType: res.item.name });
      setIsNewCategoryOpen(false);
      setNewCategoryName("");
      Alert.alert("Success", "Category added successfully");
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Something went wrong");
    }
  };

  const openView = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setIsViewOpen(true);
  };

  // Handle URL link triggers via Deep Link parameters matching web pattern
  useEffect(() => {
    if (!viewId || !viewId.trim()) return;
    const match = vendors.find((v) => String(v._id) === viewId.trim());
    if (match) openView(match);
  }, [vendors, viewId]);

  const openEdit = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setFormData({
      name: vendor.name,
      phone: vendor.phone,
      email: vendor.email,
      street: vendor.street || "",
      city: vendor.city || "",
      state: vendor.state || "",
      zip: vendor.zip || "",
      website: vendor.website || "",
      serviceType: vendor.serviceType,
      location: vendor.location || "none-selected",
      status: vendor.status,
      notes: vendor.notes,
    });
    setIsEditOpen(true);
  };

  const openCreate = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      phone: "",
      email: "",
      street: "",
      city: "",
      state: "",
      zip: "",
      website: "",
      serviceType: categories[0]?.name || "",
      location: "none-selected",
      status: "approved",
      notes: "",
    });
  };

  const formatWebsite = (url: string) => {
    if (!url) return "";
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      return `https://${url}`;
    }
    return url;
  };

  const handleOpenURL = async (url: string) => {
    const formatted = formatWebsite(url);
    const supported = await Linking.canOpenURL(formatted);
    if (supported) {
      await Linking.openURL(formatted);
    } else {
      Alert.alert("Error", "Can't open this website link on your device");
    }
  };

  const openPickerModal = (type: "category" | "location" | "status" | "form-location" | "form-status") => {
    let options: { label: string; value: string }[] = [];
    if (type === "category") {
      options = [{ label: "All Categories", value: "all" }, ...categories.map((c) => ({ label: c.name, value: c.name }))];
    } else if (type === "location") {
      options = [{ label: "All Locations", value: "all" }, ...locations.map((l) => ({ label: l.name, value: l.name }))];
    } else if (type === "status") {
      options = [{ label: "All Status", value: "all" }, { label: "Approved", value: "approved" }, { label: "Not Approved", value: "not-approved" }];
    } else if (type === "form-location") {
      options = [{ label: "None", value: "none-selected" }, ...locations.map((l) => ({ label: l.name, value: l.name }))];
    } else if (type === "form-status") {
      options = [{ label: "Approved", value: "approved" }, { label: "Not Approved", value: "not-approved" }];
    }
    setActivePicker({ type, options });
  };

  const handlePickerSelect = (value: string) => {
    if (!activePicker) return;
    const { type } = activePicker;
    if (type === "category") setCategoryFilter(value);
    else if (type === "location") setLocationFilter(value);
    else if (type === "status") setStatusFilter(value);
    else if (type === "form-location") setFormData({ ...formData, location: value });
    else if (type === "form-status") setFormData({ ...formData, status: value as any });
    setActivePicker(null);
  };

  return (
    <View style={styles.container}>
      {/* Header Toolbar */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Vendor List</Text>
          <Text style={styles.headerSubtitle}>Manage vendors by location and category</Text>
        </View>
        <View style={styles.headerButtonsRow}>
          <TouchableOpacity style={[styles.btn, styles.btnOutline]} onPress={() => setIsNewCategoryOpen(true)}>
            <Plus size={14} color="#0f172a" />
            <Text style={styles.btnOutlineText}>Category</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={openCreate}>
            <Plus size={14} color="#ffffff" />
            <Text style={styles.btnPrimaryText}>Vendor</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Stats Section Cards */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Vendors</Text>
            <Text style={styles.statValue}>{vendors.length}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Approved</Text>
            <Text style={[styles.statValue, { color: "#10b981" }]}>{approvedCount}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Not Approved</Text>
            <Text style={[styles.statValue, { color: "#ef4444" }]}>{notApprovedCount}</Text>
          </View>
        </View>

        {/* Filter Input Card Block */}
        <View style={styles.filterCard}>
          <View style={styles.searchContainer}>
            <Search size={18} color="#64748b" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search vendors..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <View style={styles.dropdownsGrid}>
            <TouchableOpacity style={styles.pickerTrigger} onPress={() => openPickerModal("category")}>
              <Text numberOfLines={1} style={styles.pickerTriggerText}>
                {categoryFilter === "all" ? "All Categories" : categoryFilter}
              </Text>
              <ChevronDown size={16} color="#64748b" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.pickerTrigger} onPress={() => openPickerModal("location")}>
              <Text numberOfLines={1} style={styles.pickerTriggerText}>
                {locationFilter === "all" ? "All Locations" : locationFilter}
              </Text>
              <ChevronDown size={16} color="#64748b" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.pickerTrigger} onPress={() => openPickerModal("status")}>
              <Text numberOfLines={1} style={styles.pickerTriggerText}>
                {statusFilter === "all" ? "All Status" : statusFilter === "approved" ? "Approved" : "Not Approved"}
              </Text>
              <ChevronDown size={16} color="#64748b" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Vendor Content List Feed (Adaptive Native Layout Replacement for Web Table) */}
        <Text style={styles.listHeading}>Vendor List </Text>
        {loading ? (
          <ActivityIndicator size="large" color="#0f172a" style={{ marginTop: 24 }} />
        ) : filteredVendors.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No vendors found</Text>
          </View>
        ) : (
          filteredVendors.map((vendor) => (
            <View key={vendor._id} style={styles.vendorCard}>
              <View style={styles.vendorCardHeader}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.vendorName}>{vendor.name}</Text>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>{vendor.serviceType}</Text>
                  </View>
                </View>
                <View style={[styles.statusBadge, vendor.status === "approved" ? styles.bgSuccess : styles.bgDestructive]}>
                  {vendor.status === "approved" ? <CheckCircle size={12} color="#10b981" /> : <XCircle size={12} color="#ef4444" />}
                  <Text style={[styles.statusBadgeText, vendor.status === "approved" ? styles.textSuccess : styles.textDestructive]}>
                    {vendor.status === "approved" ? "Approved" : "Not Approved"}
                  </Text>
                </View>
              </View>

              <View style={styles.cardDetailsGrid}>
                {vendor.email ? (
                  <TouchableOpacity style={styles.detailRow} onPress={() => Linking.openURL(`mailto:${vendor.email}`)}>
                    <Mail size={14} color="#64748b" />
                    <Text style={[styles.detailText, styles.linkText]}>{vendor.email}</Text>
                  </TouchableOpacity>
                ) : null}

                {vendor.website ? (
                  <TouchableOpacity style={styles.detailRow} onPress={() => handleOpenURL(vendor.website)}>
                    <Globe size={14} color="#64748b" />
                    <Text style={[styles.detailText, styles.linkText]}>{vendor.website}</Text>
                  </TouchableOpacity>
                ) : null}

                <View style={styles.detailRow}>
                  <MapPin size={14} color="#64748b" />
                  <Text style={styles.detailText}>{vendor.location || "No Location Specified"}</Text>
                </View>

                <TouchableOpacity style={styles.detailRow} onPress={() => Linking.openURL(`tel:${vendor.phone}`)}>
                  <Phone size={14} color="#64748b" />
                  <Text style={styles.detailText}>{vendor.phone}</Text>
                </TouchableOpacity>
              </View>

             <View style={styles.cardActionsRow}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => openView(vendor)}>
                  <Eye size={16} color="#64748b" />
                  <Text style={styles.actionBtnText}>View</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => openEdit(vendor)}>
                  <Edit size={16} color="#64748b" />
                  <Text style={styles.actionBtnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => openDeleteConfirmation(vendor)}>
                  <Trash2 size={16} color="#ef4444" />
                  <Text style={[styles.actionBtnText, { color: "#ef4444" }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View> // <--- CHANGE THIS FROM </CopyView> TO </View>
          ))
        )}
      </ScrollView>

      {/* Selector Custom Dropdown Sheet Wrapper */}
      <Modal visible={activePicker !== null} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setActivePicker(null)}>
          <View style={styles.pickerContentContainer}>
            <Text style={styles.pickerModalTitle}>Select Option</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {activePicker?.options.map((opt,index) => (
                <TouchableOpacity key={index} style={styles.pickerOptionItem} onPress={() => handlePickerSelect(opt.value)}>
                  <Text style={styles.pickerOptionText}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Add New Category Custom Modal Setup */}
      <Modal visible={isNewCategoryOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalFormContainer}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Add New Category</Text>
              <TouchableOpacity onPress={() => setIsNewCategoryOpen(false)}>
                <X size={20} color="#0f172a" />
              </TouchableOpacity>
            </View>
            <Text style={styles.fieldLabel}>Category Name</Text>
            <TextInput
              style={styles.modalInput}
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              placeholder="e.g., Electrical"
            />
            <View style={styles.modalFooter}>
              <TouchableOpacity style={[styles.btn, styles.btnOutline]} onPress={() => setIsNewCategoryOpen(false)}>
                <Text style={styles.btnOutlineText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={handleAddCategory}>
                <Text style={styles.btnPrimaryText}>Add Category</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* View Vendor Modal Details View */}
      <Modal visible={isViewOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollFormContainer}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Vendor Details</Text>
              <TouchableOpacity onPress={() => setIsViewOpen(false)}>
                <X size={20} color="#0f172a" />
              </TouchableOpacity>
            </View>

            {selectedVendor && (
              <View style={{ gap: 16, marginVertical: 12 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={styles.viewVendorName}>{selectedVendor.name}</Text>
                  <View style={[styles.statusBadge, selectedVendor.status === "approved" ? styles.bgSuccess : styles.bgDestructive]}>
                    <Text style={selectedVendor.status === "approved" ? styles.textSuccess : styles.textDestructive}>
                      {selectedVendor.status === "approved" ? "Approved" : "Not Approved"}
                    </Text>
                  </View>
                </View>

                <View style={styles.viewDetailGridBlock}>
                  <Text style={styles.viewBlockLabel}>Service Category</Text>
                  <Text style={styles.viewBlockValue}>{selectedVendor.serviceType}</Text>
                </View>

                <View style={styles.viewDetailGridBlock}>
                  <Text style={styles.viewBlockLabel}>Location</Text>
                  <Text style={styles.viewBlockValue}>{selectedVendor.location || "—"}</Text>
                </View>

                <View style={styles.viewDetailGridBlock}>
                  <Text style={styles.viewBlockLabel}>Phone</Text>
                  <Text style={styles.viewBlockValue}>{selectedVendor.phone}</Text>
                </View>

                <View style={styles.viewDetailGridBlock}>
                  <Text style={styles.viewBlockLabel}>Email</Text>
                  <Text style={styles.viewBlockValue}>{selectedVendor.email || "—"}</Text>
                </View>

                <View style={styles.viewDetailGridBlock}>
                  <Text style={styles.viewBlockLabel}>Website</Text>
                  <Text style={[styles.viewBlockValue, selectedVendor.website ? styles.linkText : null]}>
                    {selectedVendor.website || "—"}
                  </Text>
                </View>

                <View style={styles.viewDetailGridBlock}>
                  <Text style={styles.viewBlockLabel}>Address</Text>
                  <Text style={styles.viewBlockValue}>
                    {selectedVendor.street ? `${selectedVendor.street}\n` : ""}
                    {[selectedVendor.city, selectedVendor.state, selectedVendor.zip].filter(Boolean).join(", ") || "—"}
                  </Text>
                </View>

                {selectedVendor.notes ? (
                  <View style={styles.viewDetailGridBlock}>
                    <Text style={styles.viewBlockLabel}>Notes</Text>
                    <Text style={styles.viewNotesBox}>{selectedVendor.notes}</Text>
                  </View>
                ) : null}
              </View>
            )}

            <TouchableOpacity style={[styles.btn, styles.btnPrimary, { marginTop: 12 }]} onPress={() => setIsViewOpen(false)}>
              <Text style={styles.btnPrimaryText}>Close</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Shared Create and Edit Form Unified Screen Overlay Modal */}
      <Modal visible={isCreateOpen || isEditOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollFormContainer}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>{isCreateOpen ? "Add Vendor" : "Edit Vendor"}</Text>
              <TouchableOpacity onPress={() => { setIsCreateOpen(false); setIsEditOpen(false); }}>
                <X size={20} color="#0f172a" />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 12, marginVertical: 8 }}>
              <View>
                <Text style={styles.fieldLabel}>Name *</Text>
                <TextInput style={styles.modalInput} value={formData.name} onChangeText={(text) => setFormData({ ...formData, name: text })} placeholder="Vendor name" />
              </View>

              <View>
                <Text style={styles.fieldLabel}>Phone *</Text>
                <TextInput style={styles.modalInput} keyboardType="phone-pad" value={formData.phone} onChangeText={(text) => setFormData({ ...formData, phone: text })} placeholder="Phone number" />
              </View>

              <View>
                <Text style={styles.fieldLabel}>Email</Text>
                <TextInput style={styles.modalInput} keyboardType="email-address" autoCapitalize="none" value={formData.email} onChangeText={(text) => setFormData({ ...formData, email: text })} placeholder="Email address" />
              </View>

              <View>
                <Text style={styles.fieldLabel}>Website</Text>
                <TextInput style={styles.modalInput} autoCapitalize="none" value={formData.website} onChangeText={(text) => setFormData({ ...formData, website: text })} placeholder="e.g., www.domain.com" />
              </View>

              <View>
                <Text style={styles.fieldLabel}>Service Category *</Text>
                <TextInput style={styles.modalInput} value={formData.serviceType} onChangeText={(text) => setFormData({ ...formData, serviceType: text })} placeholder="e.g., Electrical, Plumbing" />
              </View>

              <View>
                <Text style={styles.fieldLabel}>Location</Text>
                <TouchableOpacity style={styles.formPickerTrigger} onPress={() => openPickerModal("form-location")}>
                  <Text>{formData.location === "none-selected" ? "None" : formData.location}</Text>
                  <ChevronDown size={16} color="#64748b" />
                </TouchableOpacity>
              </View>

              <View>
                <Text style={styles.fieldLabel}>Status *</Text>
                <TouchableOpacity style={styles.formPickerTrigger} onPress={() => openPickerModal("form-status")}>
                  <Text style={{ textTransform: "capitalize" }}>{formData.status === "not-approved" ? "Not Approved" : "Approved"}</Text>
                  <ChevronDown size={16} color="#64748b" />
                </TouchableOpacity>
              </View>

              {/* Collapsible/Grouped Native Address Section */}
              <View style={styles.formAddressGroup}>
                <Text style={styles.addressGroupTitle}>Address Data</Text>
                <View style={{ gap: 8 }}>
                  <TextInput style={styles.modalInput} value={formData.street} onChangeText={(text) => setFormData({ ...formData, street: text })} placeholder="Street Address" />
                  <TextInput style={styles.modalInput} value={formData.city} onChangeText={(text) => setFormData({ ...formData, city: text })} placeholder="City" />
                  <TextInput style={styles.modalInput} value={formData.state} onChangeText={(text) => setFormData({ ...formData, state: text })} placeholder="State" />
                  <TextInput style={styles.modalInput} keyboardType="numeric" value={formData.zip} onChangeText={(text) => setFormData({ ...formData, zip: text })} placeholder="Zip Code" />
                </View>
              </View>

              <View>
                <Text style={styles.fieldLabel}>Notes</Text>
                <TextInput
                  style={[styles.modalInput, styles.textAreaInput]}
                  multiline
                  numberOfLines={3}
                  value={formData.notes}
                  onChangeText={(text) => setFormData({ ...formData, notes: text })}
                  placeholder="Additional notes..."
                />
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={[styles.btn, styles.btnOutline]} onPress={() => { setIsCreateOpen(false); setIsEditOpen(false); }}>
                <Text style={styles.btnOutlineText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={isCreateOpen ? handleCreate : handleUpdate}>
                <Text style={styles.btnPrimaryText}>{isCreateOpen ? "Add Vendor" : "Save Changes"}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderColor: "#e2e8f0",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: Colors.surface,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.surface,
    marginTop: 2,
  },
  headerButtonsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: Colors.surface,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.golden,
  },
  filterCard: {
    backgroundColor: Colors.background,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 10,
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 6,
    paddingHorizontal: 10,
    height: 38,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.surface,
  },
  dropdownsGrid: {
    flexDirection: "row",
    gap: 6,
  },
  pickerTrigger: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 6,
    height: 36,
    paddingHorizontal: 8,
    backgroundColor: "#f8fafc",
  },
  pickerTriggerText: {
    fontSize: 11,
    color: "#0f172a",
    maxWidth: "80%",
  },
  listHeading: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.surface,
    marginBottom: 12,
  },
  emptyContainer: {
    padding: 32,
    alignItems: "center",
  },
  emptyText: {
    color: "#64748b",
    fontSize: 14,
  },
  vendorCard: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 14,
    marginBottom: 12,
  },
  vendorCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderColor: "#f1f5f9",
    paddingBottom: 10,
  },
  vendorName: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.surface,
    marginBottom: 4,
  },
  categoryBadge: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  categoryBadgeText: {
    fontSize: 11,
    color: "#334155",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  bgSuccess: { backgroundColor: "#ecfdf5", borderColor: "#a7f3d0" },
  bgDestructive: { backgroundColor: "#fef2f2", borderColor: "#fecaca" },
  statusBadgeText: { fontSize: 11, fontWeight: "500" },
  textSuccess: { color: "#10b981" },
  textDestructive: { color: "#ef4444" },
  cardDetailsGrid: {
    paddingVertical: 10,
    gap: 6,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    color: "#475569",
  },
  linkText: {
    color: "#2563eb",
    textDecorationLine: "underline",
  },
  cardActionsRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderColor: "#f1f5f9",
    paddingTop: 10,
    justifyContent: "space-around",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    padding: 4,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#64748b",
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  btnPrimary: { backgroundColor: "#0f172a" },
  btnPrimaryText: { color: "#ffffff", fontSize: 13, fontWeight: "500" },
  btnOutline: { borderWidth: 1, borderColor: "#e2e8f0", backgroundColor: "#ffffff" },
  btnOutlineText: { color: "#0f172a", fontSize: 13, fontWeight: "500" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 16,
  },
  pickerContentContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 16,
  },
  pickerModalTitle: { fontSize: 15, fontWeight: "600", marginBottom: 12, color: "#0f172a" },
  pickerOptionItem: { paddingVertical: 12, borderBottomWidth: 1, borderColor: "#f1f5f9" },
  pickerOptionText: { fontSize: 14, color: "#334155" },
  modalFormContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 16,
    gap: 12,
  },
  modalScrollFormContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 16,
    paddingBottom: 24,
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: "#e2e8f0",
    paddingBottom: 10,
    marginBottom: 8,
  },
  modalTitle: { fontSize: 16, fontWeight: "600", color: "#0f172a" },
  fieldLabel: { fontSize: 13, fontWeight: "500", color: "#334155", marginBottom: 4 },
  modalInput: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 6,
    height: 38,
    paddingHorizontal: 10,
    fontSize: 14,
    color: "#0f172a",
    backgroundColor: "#f8fafc",
  },
  formPickerTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 6,
    height: 38,
    paddingHorizontal: 10,
    backgroundColor: "#f8fafc",
  },
  formAddressGroup: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    padding: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  addressGroupTitle: { fontSize: 12, color: "#64748b", fontWeight: "600", marginBottom: 6 },
  textAreaInput: { height: 70, paddingTop: 8, textAlignVertical: "top" },
  modalFooter: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 14 },
  viewVendorName: { fontSize: 18, fontWeight: "700", color: "#0f172a", flex: 1, marginRight: 8 },
  viewDetailGridBlock: { borderBottomWidth: 1, borderColor: "#f1f5f9", paddingBottom: 8 },
  viewBlockLabel: { fontSize: 12, color: "#64748b", marginBottom: 2 },
  viewBlockValue: { fontSize: 14, fontWeight: "500", color: "#0f172a" },
  viewNotesBox: { backgroundColor: "#f8fafc", padding: 8, borderRadius: 4, marginTop: 4, fontSize: 13, color: "#334155" },
});