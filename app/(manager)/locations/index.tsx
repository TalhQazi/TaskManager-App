import React, { useMemo, useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  useWindowDimensions,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import {
  Plus,
  Search,
  MapPin,
  Building2,
  Phone,
  MoreHorizontal,
  Clock,
  X,
  Save,
  Trash2,
  Edit3,
  Eye,
  User,
  Image as ImageIcon,
  Users,
  Layers,
} from "lucide-react-native";

// Mock/API fetch abstraction layers mapping to your backend routes
import { apiFetch } from "@/lib/admin/apiClient";

interface Location {
  id: string;
  name: string;
  type: "office" | "warehouse" | "facility" | "site";
  country: string;
  city: string;
  phone: string;
  manager: string;
  employeeCount: number;
  status: "active" | "inactive";
  operatingHours: string;
  photoDataUrl?: string;
  photoFileName?: string;
}

type LocationApi = Omit<Location, "id"> & {
  _id: string;
  contactPhone?: string;
  contactName?: string;
  tasksCount?: number;
};

function normalizeLocation(l: LocationApi): Location {
  return {
    id: l._id,
    name: l.name,
    type: l.type,
    country: l.country,
    city: l.city,
    phone: l.phone || l.contactPhone || "",
    manager: l.manager || l.contactName || "",
    employeeCount: Number.isFinite(l.employeeCount) ? l.employeeCount : (l.tasksCount || 0),
    status: l.status,
    operatingHours: l.operatingHours || "9:00 AM - 5:00 PM",
    photoDataUrl: l.photoDataUrl || "",
    photoFileName: l.photoFileName || "",
  };
}

const createLocationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["office", "warehouse", "facility", "site"]),
  country: z.string().min(1, "Country is required"),
  city: z.string().min(1, "City is required"),
  status: z.enum(["active", "inactive"]),
  contactName: z.string().optional().default(""),
  contactPhone: z.string().optional().default(""),
  tasksCount: z.coerce.number().optional().default(0),
  photoDataUrl: z.string().optional().default(""),
  photoFileName: z.string().optional().default(""),
});

type CreateLocationValues = z.infer<typeof createLocationSchema>;

const countryFlags: Record<string, string> = {
  USA: "🇺🇸", UK: "🇬🇧", Canada: "🇨🇦", India: "🇮🇳", Germany: "🇩🇪", France: "🇫🇷", Australia: "🇦🇺"
};

export default function Locations() {
  const { width } = useWindowDimensions(); 
  const params = useLocalSearchParams();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  
  // Dialog management overlays
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);

  // Tanstack React Query engine operations
  const locationsQuery = useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const res = await apiFetch<{ items: LocationApi[] }>("/api/locations");
      return res.items.map(normalizeLocation);
    },
  });

  const locations = locationsQuery.data ?? [];

  // Deep-linking feature parity with the web's url param checks
  useEffect(() => {
    if (params.view && locations.length > 0) {
      const match = locations.find((l) => String(l.id) === String(params.view));
      if (match) {
        setSelectedLocation(match);
        setIsViewOpen(true);
      }
    }
  }, [params.view, locations]);

  // Network Mutation Operations
  const createLocationMutation = useMutation({
    mutationFn: async (payload: CreateLocationValues) => {
      return await apiFetch("/api/locations", {
        method: "POST",
        body: JSON.stringify({
          ...payload,
          manager: payload.contactName,
          phone: payload.contactPhone,
          employeeCount: payload.tasksCount,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      setIsCreateOpen(false);
      reset();
    },
  });

  const updateLocationMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: CreateLocationValues }) => {
      return await apiFetch(`/api/locations/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          ...payload,
          manager: payload.contactName,
          phone: payload.contactPhone,
          employeeCount: payload.tasksCount,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      setIsEditOpen(false);
    },
  });

  const deleteLocationMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiFetch(`/api/locations/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      setIsActionMenuOpen(false);
      setIsViewOpen(false);
      setSelectedLocation(null);
    },
  });

  // Complete Form Hook matching the requested Zod specifications
  const { control, handleSubmit, reset, setValue, watch } = useForm<CreateLocationValues>({
    resolver: zodResolver(createLocationSchema),
    defaultValues: {
      name: "", type: "office", country: "", city: "", status: "active", contactName: "", contactPhone: "", tasksCount: 0, photoDataUrl: "", photoFileName: ""
    },
  });

  const filteredLocations = useMemo(() => {
    return locations.filter(
      (l) =>
        l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.city.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [locations, searchQuery]);

  const typeCounts = useMemo(() => {
    return {
      office: locations.filter((l) => l.type === "office").length,
      warehouse: locations.filter((l) => l.type === "warehouse").length,
      facility: locations.filter((l) => l.type === "facility").length,
      site: locations.filter((l) => l.type === "site").length,
    };
  }, [locations]);

  const handleEditOpen = (location: Location) => {
    setSelectedLocation(location);
    reset({
      name: location.name,
      type: location.type,
      country: location.country,
      city: location.city,
      status: location.status,
      contactName: location.manager,
      contactPhone: location.phone,
      tasksCount: location.employeeCount,
      photoDataUrl: location.photoDataUrl,
      photoFileName: location.photoFileName,
    });
    setIsActionMenuOpen(false);
    setIsEditOpen(true);
  };

  // Production Ready Native Image Picker Engine Setup
  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert(
        "Permissions Required", 
        "Access to the media library is needed to update the facility layout illustration logs."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7,
      base64: true, // Enabled to populate the photoDataUrl with a web-compliant payload string
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const selectedAsset = result.assets[0];
      
      // Compute raw or safe filename configuration parameters
      const uriParts = selectedAsset.uri.split("/");
      const fallbackFileName = uriParts[uriParts.length - 1] || "uploaded_asset.jpg";
      const fileName = selectedAsset.fileName || fallbackFileName;

      // Construct a unified Base64 Data URL string mapping seamlessly to backend expectances
      const dataUrlString = selectedAsset.base64 
        ? `data:image/jpeg;base64,${selectedAsset.base64}` 
        : selectedAsset.uri;

      setValue("photoDataUrl", dataUrlString);
      setValue("photoFileName", fileName);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Premium Obsidian Top Bar Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Locations</Text>
          <Text style={styles.headerSubtitle}>Enterprise Infrastructure Matrix</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => { reset(); setIsCreateOpen(true); }}>
          <Plus color="#09090b" size={16} strokeWidth={2.5} />
          <Text style={styles.addButtonText}>Add Location</Text>
        </TouchableOpacity>
      </View>

      {/* Luxury Horizontally Scrollable Analytics Panels */}
      <View style={styles.statsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsScrollContent}>
          {Object.entries(typeCounts).map(([type, count]) => (
            <View key={type} style={styles.statCard}>
              <View style={styles.statCardRow}>
                <Text style={styles.statLabel}>{type}</Text>
                <View style={styles.statDot} />
              </View>
              <Text style={styles.statNumber}>{count}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Sleek Dark Search Layout Context Component */}
      <View style={styles.searchBarContainer}>
        <Search color="#a1a1aa" size={16} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Filter locations registry..."
          placeholderTextColor="#71717a"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Unified Enterprise Dynamic Feed */}
      {locationsQuery.isLoading ? (
        <ActivityIndicator size="small" color="#ffd27a" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredLocations}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[styles.locationRow, item.status === "inactive" && { opacity: 0.5 }]} 
              onPress={() => { setSelectedLocation(item); setIsViewOpen(true); }}
            >
              <View style={styles.rowMain}>
                {item.photoDataUrl ? (
                  <Image source={{ uri: item.photoDataUrl }} style={styles.locationThumbnail} />
                ) : (
                  <View style={styles.iconWrapper}>
                    <Building2 size={18} color="#ffd27a" />
                  </View>
                )}
                <View style={styles.infoBlock}>
                  <Text style={styles.locationName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.locationSub} numberOfLines={1}>
                    {countryFlags[item.country] || "📍"} {item.city} • {item.employeeCount} Operators
                  </Text>
                </View>
              </View>

              <View style={styles.rowActions}>
                <View style={[styles.statusIndicator, item.status === "active" ? styles.statusActive : styles.statusInactive]} />
                <TouchableOpacity onPress={() => { setSelectedLocation(item); setIsActionMenuOpen(true); }} style={styles.moreButton}>
                  <MoreHorizontal color="#a1a1aa" size={18} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Core Dynamic Action Overlay Layer Sheet */}
      <Modal visible={isActionMenuOpen} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setIsActionMenuOpen(false)}>
          <View style={styles.actionSheet}>
            <View style={styles.sheetHeaderAccent} />
            <Text style={styles.actionSheetTitle}>{selectedLocation?.name}</Text>
            
            <TouchableOpacity style={styles.actionItem} onPress={() => { setIsActionMenuOpen(false); setIsViewOpen(true); }}>
              <Eye size={16} color="#ffd27a" />
              <Text style={styles.actionItemText}>View Details</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionItem} onPress={() => selectedLocation && handleEditOpen(selectedLocation)}>
              <Edit3 size={16} color="#ffd27a" />
              <Text style={styles.actionItemText}>Modify Details</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionItem, styles.deleteAction]} 
              onPress={() => selectedLocation && deleteLocationMutation.mutate(selectedLocation.id)}
            >
              <Trash2 size={16} color="#ef4444" />
              <Text style={[styles.actionItemText, { color: "#ef4444" }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Complete High-Fidelity Creation and Modification Modal Panel Context */}
      <Modal visible={isCreateOpen || isEditOpen} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, backgroundColor: "#09090b" }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{isEditOpen ? "Update Location" : "Add Location"}</Text>
            <TouchableOpacity onPress={() => { setIsCreateOpen(false); setIsEditOpen(false); reset(); }}>
              <X color="#fafafa" size={20} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.formContainer} showsVerticalScrollIndicator={false}>
            {/* Native Dynamic Image Matrix Implementation */}
            <Text style={styles.inputLabel}>Asset Media Snapshot</Text>
            <Controller
              control={control}
              name="photoDataUrl"
              render={({ field: { value } }) => (
                <View style={{ marginBottom: 16 }}>
                  {value ? (
                    <View style={styles.mediaPreviewContainer}>
                      <Image source={{ uri: value }} style={styles.mediaPreviewImage} />
                      <TouchableOpacity style={styles.mediaRemoveBadge} onPress={() => { setValue("photoDataUrl", ""); setValue("photoFileName", ""); }}>
                        <X color="#09090b" size={14} strokeWidth={3} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity style={styles.mediaDropzone} onPress={handlePickImage}>
                      <ImageIcon color="#ffd27a" size={24} strokeWidth={1.5} />
                      <Text style={styles.mediaDropzoneText}>Attach Media Profile Stream</Text>
                      <Text style={styles.mediaDropzoneSubtext}>Supports PNG/JPG native system uploads</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            />

            <Text style={styles.inputLabel}>Facility Identity Core Designation *</Text>
            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, value }, fieldState: { error } }) => (
                <View style={{ marginBottom: 14 }}>
                  <TextInput style={styles.formInput} onChangeText={onChange} value={value} placeholder="e.g. Sector-B Megahub" placeholderTextColor="#52525b" />
                  {error && <Text style={styles.errorText}>{error.message}</Text>}
                </View>
              )}
            />

            <Text style={styles.inputLabel}>Functional Category Matrix Class</Text>
            <Controller
              control={control}
              name="type"
              render={({ field: { onChange, value } }) => (
                <View style={styles.pickerRow}>
                  {["office", "warehouse", "facility", "site"].map((t) => (
                    <TouchableOpacity 
                      key={t} 
                      style={[styles.pickerChip, value === t && styles.pickerChipSelected]} 
                      onPress={() => onChange(t)}
                    >
                      <Text style={[styles.pickerChipText, value === t && styles.pickerChipTextSelected]}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            />

            <View style={{ flexDirection: "row", gap: 12, marginBottom: 14 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>City Center *</Text>
                <Controller
                  control={control}
                  name="city"
                  render={({ field: { onChange, value }, fieldState: { error } }) => (
                    <View>
                      <TextInput style={styles.formInput} onChangeText={onChange} value={value} placeholder="Berlin" placeholderTextColor="#52525b" />
                      {error && <Text style={styles.errorText}>{error.message}</Text>}
                    </View>
                  )}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Sovereign Country *</Text>
                <Controller
                  control={control}
                  name="country"
                  render={({ field: { onChange, value }, fieldState: { error } }) => (
                    <View>
                      <TextInput style={styles.formInput} onChangeText={onChange} value={value} placeholder="Germany" placeholderTextColor="#52525b" />
                      {error && <Text style={styles.errorText}>{error.message}</Text>}
                    </View>
                  )}
                />
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 12, marginBottom: 14 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Assigned Registry Manager</Text>
                <Controller
                  control={control}
                  name="contactName"
                  render={({ field: { onChange, value } }) => (
                    <TextInput style={styles.formInput} onChangeText={onChange} value={value} placeholder="Alex Vance" placeholderTextColor="#52525b" />
                  )}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Direct Operators Count</Text>
                <Controller
                  control={control}
                  name="tasksCount"
                  render={({ field: { onChange, value } }) => (
                    <TextInput style={styles.formInput} keyboardType="numeric" onChangeText={onChange} value={String(value)} placeholder="0" placeholderTextColor="#52525b" />
                  )}
                />
              </View>
            </View>

            <Text style={styles.inputLabel}>Communications Uplink String (Phone)</Text>
            <Controller
              control={control}
              name="contactPhone"
              render={({ field: { onChange, value } }) => (
                <TextInput style={[styles.formInput, { marginBottom: 14 }]} keyboardType="phone-pad" onChangeText={onChange} value={value} placeholder="+49 00 0000" placeholderTextColor="#52525b" />
              )}
            />

            <Text style={styles.inputLabel}>Operations Status Directive State</Text>
            <Controller
              control={control}
              name="status"
              render={({ field: { onChange, value } }) => (
                <View style={styles.pickerRow}>
                  {["active", "inactive"].map((s) => (
                    <TouchableOpacity 
                      key={s} 
                      style={[styles.pickerChip, value === s && styles.pickerChipSelected]} 
                      onPress={() => onChange(s)}
                    >
                      <Text style={[styles.pickerChipText, value === s && styles.pickerChipTextSelected]}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            />

            <TouchableOpacity 
              style={styles.saveButton} 
              onPress={handleSubmit((data) => {
                if (isEditOpen && selectedLocation) {
                  updateLocationMutation.mutate({ id: selectedLocation.id, payload: data });
                } else {
                  createLocationMutation.mutate(data);
                }
              })}
            >
              <Save size={16} color="#09090b" strokeWidth={2.5} />
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Full Feature Parity Infrastructure Deep View Inspection Dashboard */}
      <Modal visible={isViewOpen} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: "#09090b" }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Infrastructure Core Snapshot</Text>
            <TouchableOpacity onPress={() => setIsViewOpen(false)}>
              <X color="#fafafa" size={20} />
            </TouchableOpacity>
          </View>
          {selectedLocation && (
            <ScrollView contentContainerStyle={styles.detailsContainer} showsVerticalScrollIndicator={false}>
              {selectedLocation.photoDataUrl ? (
                <Image source={{ uri: selectedLocation.photoDataUrl }} style={styles.detailsHeroImage} />
              ) : (
                <View style={styles.detailsHeaderCard}>
                  <Building2 size={36} color="#ffd27a" strokeWidth={1.5} />
                </View>
              )}

              <View style={styles.detailsMetaSection}>
                <Text style={styles.detailsMainTitle}>{selectedLocation.name}</Text>
                <Text style={styles.detailsMainSub}>{selectedLocation.city}, {selectedLocation.country}</Text>
              </View>

              <View style={styles.detailCard}>
                <View style={styles.detailItem}>
                  <Layers size={14} color="#ffd27a" />
                  <Text style={styles.detailItemText}>Facility Profile Classification: <Text style={{ color: "#fafafa", textTransform: "capitalize" }}>{selectedLocation.type}</Text></Text>
                </View>
                <View style={styles.detailItem}>
                  <Clock size={14} color="#ffd27a" />
                  <Text style={styles.detailItemText}>Standard Operational Lifecycle: <Text style={{ color: "#fafafa" }}>{selectedLocation.operatingHours}</Text></Text>
                </View>
                <View style={styles.detailItem}>
                  <User size={14} color="#ffd27a" />
                  <Text style={styles.detailItemText}>Assigned Commanding Officer: <Text style={{ color: "#fafafa" }}>{selectedLocation.manager || "Unassigned"}</Text></Text>
                </View>
                <View style={styles.detailItem}>
                  <Users size={14} color="#ffd27a" />
                  <Text style={styles.detailItemText}>Active Registry Operator Footprint: <Text style={{ color: "#fafafa" }}>{selectedLocation.employeeCount}</Text></Text>
                </View>
                <View style={styles.detailItem}>
                  <Phone size={14} color="#ffd27a" />
                  <Text style={styles.detailItemText}>Communications Array Uplink: <Text style={{ color: "#fafafa" }}>{selectedLocation.phone || "No Active Uplink Address"}</Text></Text>
                </View>
              </View>

              <TouchableOpacity style={styles.inlineEditButton} onPress={() => handleEditOpen(selectedLocation)}>
                <Edit3 size={14} color="#09090b" strokeWidth={2.5} />
                <Text style={styles.inlineEditButtonText}>Modify Asset Records</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Premium #09090b Dark Gold Luxury Fluid System Style Sheet Matrix
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#09090b",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fafafa",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#a1a1aa",
    marginTop: 2,
  },
  addButton: {
    flexDirection: "row",
    backgroundColor: "#ffd27a",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: "center",
    gap: 6,
  },
  addButtonText: {
    color: "#09090b",
    fontSize: 12,
    fontWeight: "700",
  },
  statsContainer: {
    marginVertical: 10,
  },
  statsScrollContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  statCard: {
    backgroundColor: "#18181b",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minWidth: 115,
  },
  statCardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  statLabel: {
    fontSize: 11,
    color: "#a1a1aa",
    textTransform: "uppercase",
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  statDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#ffd27a",
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fafafa",
    marginTop: 6,
  },
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#18181b",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 6,
    marginHorizontal: 20,
    marginVertical: 8,
    paddingHorizontal: 12,
    height: 42,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#fafafa",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    marginTop: 8,
  },
  locationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#18181b",
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#27272a",
    marginBottom: 10,
  },
  rowMain: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  locationThumbnail: {
    width: 38,
    height: 38,
    borderRadius: 6,
    marginRight: 12,
    backgroundColor: "#27272a",
  },
  iconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 6,
    backgroundColor: "rgba(255, 210, 122, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 210, 122, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  infoBlock: {
    flex: 1,
  },
  locationName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fafafa",
  },
  locationSub: {
    fontSize: 12,
    color: "#a1a1aa",
    marginTop: 3,
  },
  rowActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statusIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusActive: {
    backgroundColor: "#ffd27a",
  },
  statusInactive: {
    backgroundColor: "#3f3f46",
  },
  moreButton: {
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(9, 9, 11, 0.75)",
    justifyContent: "flex-end",
  },
  actionSheet: {
    backgroundColor: "#18181b",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderWidth: 1,
    borderColor: "#27272a",
    padding: 20,
    paddingBottom: 36,
  },
  sheetHeaderAccent: {
    width: 36,
    height: 4,
    backgroundColor: "#27272a",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  actionSheetTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fafafa",
    marginBottom: 16,
    textAlign: "center",
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#27272a",
  },
  actionItemText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#e4e4e7",
  },
  deleteAction: {
    borderBottomWidth: 0,
    marginTop: 4,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#27272a",
    backgroundColor: "#18181b",
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fafafa",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  formContainer: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#a1a1aa",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 8,
  },
  formInput: {
    backgroundColor: "#18181b",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 6,
    paddingHorizontal: 12,
    height: 42,
    fontSize: 14,
    color: "#fafafa",
  },
  pickerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginVertical: 6,
    marginBottom: 14,
  },
  pickerChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#27272a",
    backgroundColor: "#18181b",
  },
  pickerChipSelected: {
    backgroundColor: "rgba(255, 210, 122, 0.1)",
    borderColor: "#ffd27a",
  },
  pickerChipText: {
    fontSize: 12,
    color: "#a1a1aa",
    textTransform: "capitalize",
    fontWeight: "500",
  },
  pickerChipTextSelected: {
    color: "#ffd27a",
    fontWeight: "700",
  },
  saveButton: {
    flexDirection: "row",
    backgroundColor: "#ffd27a",
    borderRadius: 6,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 24,
  },
  saveButtonText: {
    color: "#09090b",
    fontSize: 13,
    fontWeight: "700",
  },
  errorText: {
    fontSize: 11,
    color: "#ef4444",
    marginTop: 4,
  },
  mediaDropzone: {
    width: "100%",
    backgroundColor: "#18181b",
    borderWidth: 1,
    borderColor: "#27272a",
    borderStyle: "dashed",
    borderRadius: 8,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  mediaDropzoneText: {
    color: "#fafafa",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 8,
  },
  mediaDropzoneSubtext: {
    color: "#71717a",
    fontSize: 11,
    marginTop: 2,
  },
  mediaPreviewContainer: {
    position: "relative",
    width: "100%",
    height: 160,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#27272a",
  },
  mediaPreviewImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  mediaRemoveBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "#ffd27a",
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  detailsContainer: {
    padding: 20,
  },
  detailsHeroImage: {
    width: "100%",
    height: 180,
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: "#18181b",
    borderWidth: 1,
    borderColor: "#27272a",
  },
  detailsHeaderCard: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#18181b",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 8,
    height: 100,
    marginBottom: 16,
  },
  detailsMetaSection: {
    marginBottom: 20,
  },
  detailsMainTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#fafafa",
    letterSpacing: -0.3,
  },
  detailsMainSub: {
    fontSize: 13,
    color: "#a1a1aa",
    marginTop: 4,
  },
  detailCard: {
    backgroundColor: "#18181b",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 8,
    padding: 16,
    gap: 14,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  detailItemText: {
    fontSize: 13,
    color: "#a1a1aa",
    fontWeight: "500",
  },
  inlineEditButton: {
    flexDirection: "row",
    backgroundColor: "#ffd27a",
    borderRadius: 6,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 20,
  },
  inlineEditButtonText: {
    color: "#09090b",
    fontSize: 13,
    fontWeight: "700",
  },
});