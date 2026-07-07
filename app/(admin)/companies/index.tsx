import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Modal,
  SafeAreaView,
  Image,
  Alert
} from "react-native";
import { 
  Building2, 
  AlertTriangle, 
  Plus, 
  Search, 
  MoreHorizontal, 
  Eye, 
  Edit, 
  Trash2, 
  MapPin, 
  Mail, 
  Phone, 
  Globe, 
  Sparkles, 
  X,
  Upload,
  Image as ImageIcon,
  FolderOpen,
  Check,
  ChevronLeft,
  ChevronRight
} from "lucide-react-native";
import { useTheme } from "@/contexts/ThemeContext";
import { createResource, deleteResource, listResource, updateResource, apiFetch } from "@/lib/admin/apiClient";
import * as ImagePicker from "expo-image-picker";
const { width, height } = Dimensions.get("window");

const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria",
  "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan",
  "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cambodia", "Cameroon",
  "Canada", "Cape Verde", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica",
  "Croatia", "Cuba", "Cyprus", "Czech Republic", "Denmark", "Djibouti", "Dominica", "Dominican Republic", "Ecuador", "Egypt",
  "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland", "France", "Gabon",
  "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana",
  "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel",
  "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Korea North", "Korea South", "Kuwait",
  "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg",
  "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico",
  "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia", "Nauru",
  "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Macedonia", "Norway", "Oman", "Pakistan",
  "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar",
  "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia",
  "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa",
  "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria", "Taiwan", "Tajikistan",
  "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu",
  "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City", "Venezuela",
  "Vietnam", "Yemen", "Zambia", "Zimbabwe"
];

interface Company {
  id: string;
  name: string;
  code: string;
  description?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  contact?: {
    email?: string;
    phone?: string;
    website?: string;
  };
  status: "active" | "inactive" | "suspended";
  settings?: {
    timezone?: string;
    dateFormat?: string;
    currency?: string;
  };
  logo?: string;
  einNumber?: string;
  charterNumber?: string;
  stateOfIncorporation?: string;
  foreignEntities?: Array<{ state: string; documentNumber: string }>;
  originalFilingDate?: string;
  annualReportDueDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

type AssetItem = {
  id: string;
  _id?: string;
  originalFilename: string;
  mimeType: string;
  urlOriginal: string;
  attachment?: { url: string; fileName: string };
};

type FolderItem = {
  id: string;
  name: string;
  children?: FolderItem[];
};

export default function Companies() {
  const { uiTheme } = useTheme();
  
  const [loading, setLoading] = useState<boolean>(true);
  const [isBackgroundRefetching, setIsBackgroundRefetching] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [companiesList, setCompaniesList] = useState<Company[]>([]);
  
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  const [addCompanyOpen, setAddCompanyOpen] = useState<boolean>(false);
  const [viewCompanyOpen, setViewCompanyOpen] = useState<boolean>(false);
  const [editCompanyOpen, setEditCompanyOpen] = useState<boolean>(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<boolean>(false);
  
  const [statusFilterPickerOpen, setStatusFilterPickerOpen] = useState<boolean>(false);
  const [countryAddPickerOpen, setCountryAddPickerOpen] = useState<boolean>(false);
  const [countryEditPickerOpen, setCountryEditPickerOpen] = useState<boolean>(false);
  const [statusAddPickerOpen, setStatusAddPickerOpen] = useState<boolean>(false);
  const [statusEditPickerOpen, setStatusEditPickerOpen] = useState<boolean>(false);
  const [actionMenuOpen, setActionMenuOpen] = useState<boolean>(false);
  
  const [imageLibraryOpen, setImageLibraryOpen] = useState<boolean>(false);
  const [imageTarget, setImageTarget] = useState<"add" | "edit">("add");
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>("");
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [assetsLoading, setAssetsLoading] = useState<boolean>(false);
  const [assetSearch, setAssetSearch] = useState<string>("");
  const [selectedAssetUrl, setSelectedAssetUrl] = useState<string>("");
  const [assetPage, setAssetPage] = useState<number>(1);
  const [assetTotalItems, setAssetTotalItems] = useState<number>(0);
  const [assetTotalPages, setAssetTotalPages] = useState<number>(1);
  const itemsPerPage = 30;

  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  const [addFormData, setAddFormData] = useState({
    name: "",
    description: "",
    status: "active" as Company["status"],
    street: "",
    city: "",
    state: "",
    zipCode: "",
    country: "United States",
    email: "",
    phone: "",
    website: "",
    logo: "",
    timezone: "UTC",
    dateFormat: "MM/DD/YYYY",
    currency: "USD",
    einNumber: "",
    charterNumber: "",
    stateOfIncorporation: "",
    foreignEntities: [] as Array<{ state: string; documentNumber: string }>,
    originalFilingDate: "",
    annualReportDueDate: "",
  });

  const [editFormData, setEditFormData] = useState({
    name: "",
    code: "",
    description: "",
    status: "active" as Company["status"],
    street: "",
    city: "",
    state: "",
    zipCode: "",
    country: "",
    email: "",
    phone: "",
    website: "",
    logo: "",
    timezone: "UTC",
    dateFormat: "MM/DD/YYYY",
    currency: "USD",
    einNumber: "",
    charterNumber: "",
    stateOfIncorporation: "",
    foreignEntities: [] as Array<{ state: string; documentNumber: string }>,
    originalFilingDate: "",
    annualReportDueDate: "",
  });

  const styles = useMemo(() => getThemedStyles(uiTheme), [uiTheme]);

  const toProxiedUrl = (url: string): string => {
    if (!url || url.startsWith("data:")) return url;
    if (url.includes("/api/s3-proxy/")) return url;
    const s3Match = url.match(/https:\/\/[^/]+\.s3\.[^/]+\.amazonaws\.com\/(.+)/);
    if (!s3Match) return url;
    const s3Key = s3Match[1];
    const baseUrl = "https://task.se7eninc.com";
    return `${baseUrl}/api/s3-proxy/${s3Key}`;
  };

  const flatFolders = useMemo(() => {
    const result: { id: string; name: string; depth: number }[] = [];
    const walk = (items: FolderItem[], depth: number) => {
      for (const f of items) {
        result.push({ id: f.id, name: f.name, depth });
        if (f.children?.length) walk(f.children, depth + 1);
      }
    };
    walk(folders, 0);
    return result;
  }, [folders]);

  useEffect(() => {
    if (!imageLibraryOpen) return;
    (async () => {
      try {
        const res = await apiFetch<{ items: FolderItem[] }>("/api/asset-library/folders?module=asset-library");
        setFolders(res.items || []);
      } catch { /* ignore */ }
    })();
  }, [imageLibraryOpen]);

  useEffect(() => {
    if (!imageLibraryOpen) return;
    let cancelled = false;
    setAssetsLoading(true);
    const params = new URLSearchParams();
    params.set("module", "asset-library");
    if (selectedFolderId) params.set("folderId", selectedFolderId);
    params.set("type", "image");
    if (assetSearch.trim()) params.set("q", assetSearch.trim());
    params.set("sort", "az");
    params.set("limit", itemsPerPage.toString());
    params.set("page", assetPage.toString());

    (async () => {
      try {
        const res = await apiFetch<{ items: AssetItem[], total: number, totalPages: number }>(`/api/asset-library/assets?${params.toString()}`);
        if (!cancelled) {
          setAssets(res.items || []);
          setAssetTotalItems(res.total || 0);
          setAssetTotalPages(res.totalPages || 1);
        }
      } catch { /* ignore */ }
      if (!cancelled) setAssetsLoading(false);
    })();
    return () => { cancelled = true; };
  }, [imageLibraryOpen, selectedFolderId, assetSearch, assetPage]);

  const normalizeApiResponse = (res: any): Company[] => {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (Array.isArray(res.items)) return res.items;
    if (Array.isArray(res.data)) return res.data;
    return [];
  };

  const load = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      } else {
        setIsBackgroundRefetching(true);
      }
      setApiError(null);
      const res = await listResource<any>("companies");
      setCompaniesList(normalizeApiResponse(res));
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Failed to load companies");
      setCompaniesList([]);
    } finally {
      setLoading(false);
      setIsBackgroundRefetching(false);
    }
  };

  useEffect(() => {
    load(true);
  }, []);

  const refreshCompanies = async () => {
    try {
      const res = await listResource<any>("companies");
      setCompaniesList(normalizeApiResponse(res));
    } catch {
      setCompaniesList([]);
    }
  };

  const generatePrefix = (name: string) => {
    if (!name || typeof name !== "string") return "XXX";
    const cleanName = name.replace(/[^a-zA-Z0-9\s]/g, "");
    const words = cleanName.trim().split(/\s+/).filter(w => w.length > 0);
    if (words.length === 0) return "XXX";
    if (words.length === 1) {
      const word = words[0];
      let prefix = "";
      for (let i = 0; i < Math.min(3, word.length); i++) {
        prefix += word.charAt(i).toUpperCase();
      }
      return prefix || "XXX";
    }
    return words.slice(0, 3).map(word => word.charAt(0).toUpperCase()).join("") || "XXX";
  };

  const getNextSequence = () => {
    const safeList = Array.isArray(companiesList) ? companiesList : [];
    if (safeList.length === 0) return 1;
    const maxSequence = Math.max(...safeList.map(c => (c as any).sequence || 0));
    return maxSequence + 1;
  };

  const handleAddCompany = async () => {
    if (!addFormData.name.trim()) return;
    try {
      setApiError(null);
      setIsAdding(true);
      const computedCode = `${generatePrefix(addFormData.name)}-${String(getNextSequence()).padStart(3, "0")}`;
      
      const newCompany = {
        name: addFormData.name.trim(),
        code: computedCode,
        description: addFormData.description.trim(),
        status: addFormData.status,
        logo: addFormData.logo,
        address: {
          street: addFormData.street.trim(),
          city: addFormData.city.trim(),
          state: addFormData.state.trim(),
          zipCode: addFormData.zipCode.trim(),
          country: addFormData.country.trim(),
        },
        contact: {
          email: addFormData.email.trim(),
          phone: addFormData.phone.trim(),
          website: addFormData.website.trim(),
        },
        settings: {
          timezone: addFormData.timezone,
          dateFormat: addFormData.dateFormat,
          currency: addFormData.currency,
        },
        einNumber: addFormData.einNumber.trim(),
        charterNumber: addFormData.charterNumber.trim(),
        stateOfIncorporation: addFormData.stateOfIncorporation.trim(),
        foreignEntities: addFormData.foreignEntities,
        originalFilingDate: addFormData.originalFilingDate || undefined,
        annualReportDueDate: addFormData.annualReportDueDate || undefined,
      };

      await createResource<Company>("companies", newCompany);
      await refreshCompanies();
      setAddCompanyOpen(false);
      resetAddForm();
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Failed to create company");
    } finally {
      setIsAdding(false);
    }
  };

  const resetAddForm = () => {
    setAddFormData({
      name: "",
      description: "",
      status: "active",
      street: "",
      city: "",
      state: "",
      zipCode: "",
      country: "United States",
      email: "",
      phone: "",
      website: "",
      logo: "",
      timezone: "UTC",
      dateFormat: "MM/DD/YYYY",
      currency: "USD",
      einNumber: "",
      charterNumber: "",
      stateOfIncorporation: "",
      foreignEntities: [],
      originalFilingDate: "",
      annualReportDueDate: "",
    });
  };

  const handleViewCompany = (company: Company) => {
    setSelectedCompany(company);
    setActionMenuOpen(false);
    setViewCompanyOpen(true);
  };

  const handleEditCompany = (company: Company) => {
    setSelectedCompany(company);
    setEditFormData({
      name: company.name,
      code: company.code,
      description: company.description || "",
      status: company.status,
      street: company.address?.street || "",
      city: company.address?.city || "",
      state: company.address?.state || "",
      zipCode: company.address?.zipCode || "",
      country: company.address?.country || "",
      email: company.contact?.email || "",
      phone: company.contact?.phone || "",
      website: company.contact?.website || "",
      logo: company.logo || "",
      timezone: company.settings?.timezone || "UTC",
      dateFormat: company.settings?.dateFormat || "MM/DD/YYYY",
      currency: company.settings?.currency || "USD",
      einNumber: company.einNumber || "",
      charterNumber: company.charterNumber || "",
      stateOfIncorporation: company.stateOfIncorporation || "",
      foreignEntities: company.foreignEntities || [],
      originalFilingDate: company.originalFilingDate ? new Date(company.originalFilingDate).toISOString().split('T')[0] : "",
      annualReportDueDate: company.annualReportDueDate ? new Date(company.annualReportDueDate).toISOString().split('T')[0] : "",
    });
    setActionMenuOpen(false);
    setEditCompanyOpen(true);
  };

  const saveEditCompany = async () => {
    if (!selectedCompany || !editFormData.name.trim()) return;
    try {
      setApiError(null);
      await updateResource<Company>("companies", selectedCompany.id, {
        name: editFormData.name.trim(),
        description: editFormData.description.trim(),
        status: editFormData.status,
        logo: editFormData.logo,
        address: {
          street: editFormData.street.trim(),
          city: editFormData.city.trim(),
          state: editFormData.state.trim(),
          zipCode: editFormData.zipCode.trim(),
          country: editFormData.country.trim(),
        },
        contact: {
          email: editFormData.email.trim(),
          phone: editFormData.phone.trim(),
          website: editFormData.website.trim(),
        },
        settings: {
          timezone: editFormData.timezone,
          dateFormat: editFormData.dateFormat,
          currency: editFormData.currency,
        },
        einNumber: editFormData.einNumber.trim(),
        charterNumber: editFormData.charterNumber.trim(),
        stateOfIncorporation: editFormData.stateOfIncorporation.trim(),
        foreignEntities: editFormData.foreignEntities,
        originalFilingDate: editFormData.originalFilingDate || undefined,
        annualReportDueDate: editFormData.annualReportDueDate || undefined,
      });

      await refreshCompanies();
      setEditCompanyOpen(false);
      setSelectedCompany(null);
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Failed to update company");
    }
  };

  const handleDeleteConfirm = (company: Company) => {
    setSelectedCompany(company);
    setActionMenuOpen(false);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedCompany) return;
    try {
      setApiError(null);
      await deleteResource("companies", selectedCompany.id);
      await refreshCompanies();
      setDeleteConfirmOpen(false);
      setSelectedCompany(null);
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Failed to delete company");
    }
  };

  const _simulateLocalUpload = (target: "add" | "edit") => {
    const mockImage = "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=200&auto=format&fit=crop";
    if (target === "add") {
      setAddFormData(p => ({ ...p, logo: mockImage }));
    } else {
      setEditFormData(p => ({ ...p, logo: mockImage }));
    }
    Alert.alert("Local Device Upload", "Selected image from native media gallery successfully.");
  };

  const handleLocalImageUpload = async (target: "add" | "edit") => {
    // Request permission to access media library
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert("Permission Denied", "You need to allow gallery access to upload a logo.");
      return;
    }

    // Launch the native image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const selectedImageUri = result.assets[0].uri;
      
      if (target === "add") {
        setAddFormData(p => ({ ...p, logo: selectedImageUri }));
      } else {
        setEditFormData(p => ({ ...p, logo: selectedImageUri }));
      }
    }
  };

  const triggerImagePicker = (target: "add" | "edit") => {
    setImageTarget(target);
    setSelectedAssetUrl("");
    setAssetSearch("");
    setAssetPage(1);
    setSelectedFolderId("");
    setImageLibraryOpen(true);
  };

  const confirmAssetSelection = () => {
    if (!selectedAssetUrl) return;
    if (imageTarget === "add") {
      setAddFormData(p => ({ ...p, logo: selectedAssetUrl }));
    } else {
      setEditFormData(p => ({ ...p, logo: selectedAssetUrl }));
    }
    setImageLibraryOpen(false);
  };

  const filteredCompanies = useMemo(() => {
    const list = Array.isArray(companiesList) ? companiesList : [];
    return list
      .filter((company) => {
        if (!company) return false;
        const matchesSearch =
          (company.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          (company.code || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          (company.description || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          (company.contact?.email || "").toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === "all" || company.status === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [companiesList, searchQuery, statusFilter]);

  const openActionMenu = (company: Company) => {
    setSelectedCompany(company);
    setActionMenuOpen(true);
  };

  const safeKpiCount = (status: string) => {
    const list = Array.isArray(companiesList) ? companiesList : [];
    return list.filter(c => c.status === status).length;
  };

  if (loading) {
    return (
      <View style={styles.centerDeck}>
        <ActivityIndicator size="large" color={uiTheme.customColors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.rootContainer}>
      <View style={styles.headerDeck}>
        <View style={styles.headerTitleRow}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Building2 size={20} color={uiTheme.customColors.primary} />
              <Text style={styles.screenHeading}>Companies</Text>
            </View>
            <Text style={styles.screenCaption}>Manage your organizations, companies, and business entities with ease.</Text>
          </View>
          <TouchableOpacity style={styles.addCompanyHeaderButton} onPress={() => setAddCompanyOpen(true)}>
            <Plus size={14} color="#09090b" style={{ marginRight: 4 }} />
            <Text style={styles.addCompanyHeaderButtonText}>Add Company</Text>
          </TouchableOpacity>
        </View>
      </View>

      {apiError && (
        <View style={styles.alertPanelError}>
          <AlertTriangle size={14} color="#ef4444" style={{ marginRight: 6 }} />
          <Text style={styles.errorTextLabel}>{apiError}</Text>
        </View>
      )}

      <View style={styles.summaryGridContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
          <View style={styles.summaryKpiCard}>
            <Text style={styles.kpiCardMetaLabel}>Total Companies</Text>
            <Text style={styles.kpiCardMetricValue}>{Array.isArray(companiesList) ? companiesList.length : 0}</Text>
          </View>
          <View style={styles.summaryKpiCard}>
            <Text style={[styles.kpiCardMetaLabel, { color: uiTheme.customColors.primary }]}>Active</Text>
            <Text style={styles.kpiCardMetricValue}>{safeKpiCount("active")}</Text>
          </View>
          <View style={styles.summaryKpiCard}>
            <Text style={styles.kpiCardMetaLabel}>Inactive</Text>
            <Text style={styles.kpiCardMetricValue}>{safeKpiCount("inactive")}</Text>
          </View>
          <View style={styles.summaryKpiCard}>
            <Text style={[styles.kpiCardMetaLabel, { color: "#f59e0b" }]}>Suspended</Text>
            <Text style={styles.kpiCardMetricValue}>{safeKpiCount("suspended")}</Text>
          </View>
        </ScrollView>
      </View>

      <View style={styles.searchAndFiltersDeck}>
        <View style={styles.searchFieldInputFrame}>
          <Search size={14} color="rgba(148,163,184,0.5)" style={styles.searchIconAbsolute} />
          <TextInput
            style={styles.searchTextInputElement}
            placeholder="Search by name, code, or email..."
            placeholderTextColor="rgba(148,163,184,0.4)"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity style={styles.pickerSelectorAnchor} onPress={() => setStatusFilterPickerOpen(true)}>
          <Text style={styles.pickerSelectorValueText}>{statusFilter.toUpperCase()}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollWrapper}
        refreshControl={
          <RefreshControl refreshing={isBackgroundRefetching} onRefresh={() => load(false)} tintColor={uiTheme.customColors.primary} />
        }
      >
        <View style={styles.blockSectionHeaderRow}>
          <Text style={styles.blockTitleText}>Companies</Text>
          {filteredCompanies.length > 0 && (
            <View style={styles.countBadgeFrame}>
              <Text style={styles.countBadgeText}>{filteredCompanies.length} total</Text>
            </View>
          )}
        </View>

        {filteredCompanies.length === 0 ? (
          <View style={styles.emptyContainerState}>
            <Building2 size={40} color={uiTheme.panelColors.dashboardTextColor} style={{ opacity: 0.2, marginBottom: 12 }} />
            <Text style={styles.emptyResultsWarningText}>No companies found</Text>
            <Text style={styles.emptyResultsSubText}>Try adjusting your filters or add a new company</Text>
          </View>
        ) : (
          filteredCompanies.map((company) => (
            <View key={company.id} style={styles.companyCardNodeFrame}>
              <View style={styles.cardHeaderTopInlineRow}>
                <View style={styles.companyProfileAvatarGroup}>
                  <View style={styles.avatarFallbackWell}>
                    {company.logo ? (
                      <Image source={{ uri: toProxiedUrl(company.logo) }} style={styles.avatarLogoImage} />
                    ) : (
                      <Text style={styles.avatarFallbackText}>{company.code?.slice(0, 2).toUpperCase() || "CO"}</Text>
                    )}
                  </View>
                  <View style={{ flex: 1, paddingRight: 4 }}>
                    <Text style={styles.companyCardTitleName} numberOfLines={1}>{company.name}</Text>
                    <Text style={styles.companyCardSubCode}>{company.code}</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.actionMenuTriggerButton} onPress={() => openActionMenu(company)}>
                  <MoreHorizontal size={16} color={uiTheme.panelColors.dashboardTextColor} />
                </TouchableOpacity>
              </View>

              <View style={styles.cardMiddleBadgesContainer}>
                <View style={[
                  styles.statusBadgeBase,
                  company.status === "active" && styles.statusBadgeActive,
                  company.status === "inactive" && styles.statusBadgeInactive,
                  company.status === "suspended" && styles.statusBadgeSuspended
                ]}>
                  <Text style={[
                    styles.statusBadgeText,
                    company.status === "active" && { color: "#4ade80" },
                    company.status === "inactive" && { color: "#94a3b8" },
                    company.status === "suspended" && { color: "#fca5a5" }
                  ]}>{company.status.toUpperCase()}</Text>
                </View>
              </View>

              <View style={styles.cardInfoMetaGridSpec}>
                {company.contact?.email ? (
                  <View style={styles.metaRowItemInline}>
                    <Mail size={12} color="rgba(148,163,184,0.5)" />
                    <Text style={[styles.metaRowItemText, { flexShrink: 1 }]}>{company.contact.email}</Text>
                  </View>
                ) : null}
                {company.contact?.phone ? (
                  <View style={styles.metaRowItemInline}>
                    <Phone size={12} color="rgba(148,163,184,0.5)" />
                    <Text style={[styles.metaRowItemText, { flexShrink: 1 }]} >
                      {company.contact.phone}
                    </Text>
                  </View>
                ) : null}
                <View style={styles.metaRowItemInline}>
                  <MapPin size={12} color="rgba(148,163,184,0.5)" />
                  <Text style={[styles.metaRowItemText, { flexShrink: 1 }]} >
                    {[company.address?.city, company.address?.state, company.address?.country].filter(Boolean).join(", ") || "—"}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={statusFilterPickerOpen} transparent animationType="fade" onRequestClose={() => setStatusFilterPickerOpen(false)}>
        <TouchableOpacity style={styles.modalBackdropOverlay} activeOpacity={1} onPress={() => setStatusFilterPickerOpen(false)}>
          <View style={styles.modalSelectionBoxSurface}>
            <Text style={styles.selectionModalTitleHeading}>Filter Status</Text>
            {["all", "active", "inactive", "suspended"].map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[styles.selectionOptionRowElement, statusFilter === opt && styles.activeSelectionOptionRowElement]}
                onPress={() => {
                  setStatusFilter(opt);
                  setStatusFilterPickerOpen(false);
                }}
              >
                <Text style={[styles.selectionOptionRowText, statusFilter === opt && { color: uiTheme.customColors.primary, fontWeight: "700" }]}>
                  {opt.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={actionMenuOpen} transparent animationType="fade" onRequestClose={() => setActionMenuOpen(false)}>
        <TouchableOpacity style={styles.modalBackdropOverlay} activeOpacity={1} onPress={() => setActionMenuOpen(false)}>
          <View style={styles.modalSelectionBoxSurface}>
            <Text style={styles.selectionModalTitleHeading} numberOfLines={1}>{selectedCompany?.name || "Options"}</Text>
            <TouchableOpacity style={styles.actionMenuRowItemOption} onPress={() => selectedCompany && handleViewCompany(selectedCompany)}>
              <Eye size={16} color={uiTheme.panelColors.dashboardTextColor} />
              <Text style={styles.actionMenuRowItemOptionText}>View Details</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionMenuRowItemOption} onPress={() => selectedCompany && handleEditCompany(selectedCompany)}>
              <Edit size={16} color={uiTheme.panelColors.dashboardTextColor} />
              <Text style={styles.actionMenuRowItemOptionText}>Edit Company</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionMenuRowItemOption, { borderBottomWidth: 0 }]} onPress={() => selectedCompany && handleDeleteConfirm(selectedCompany)}>
              <Trash2 size={16} color="#ef4444" />
              <Text style={[styles.actionMenuRowItemOptionText, { color: "#ef4444" }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={deleteConfirmOpen} transparent animationType="fade" onRequestClose={() => setDeleteConfirmOpen(false)}>
        <TouchableOpacity style={styles.modalBackdropOverlay} activeOpacity={1} onPress={() => setDeleteConfirmOpen(false)}>
          <View style={styles.modalSelectionBoxSurface}>
            <Text style={[styles.selectionModalTitleHeading, { color: "#ef4444" }]}>Delete Company</Text>
            <Text style={{ fontSize: 13, color: uiTheme.panelColors.dashboardTextColor, opacity: 0.7, marginBottom: 16 }}>
              This action cannot be undone. The company will be permanently removed from the system.
            </Text>
            {selectedCompany ? (
              <View style={styles.deleteTargetHighlightCard}>
                <Text style={{ fontSize: 13, fontWeight: "700", color: uiTheme.panelColors.dashboardTextColor }}>{selectedCompany.name}</Text>
                <Text style={{ fontSize: 11, color: uiTheme.panelColors.dashboardTextColor, opacity: 0.5, marginTop: 2 }}>{selectedCompany.code}</Text>
              </View>
            ) : null}
            <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
              <TouchableOpacity style={styles.formDismissActionModalButton} onPress={() => setDeleteConfirmOpen(false)}>
                <Text style={{ fontSize: 12, fontWeight: "600", color: uiTheme.panelColors.dashboardTextColor }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.formSubmitActionModalButton, { backgroundColor: "#ef4444" }]} onPress={confirmDelete}>
                <Text style={{ fontSize: 12, fontWeight: "700", color: "#ffffff" }}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={addCompanyOpen} transparent animationType="slide" onRequestClose={() => setAddCompanyOpen(false)}>
        <SafeAreaView style={styles.fullscreenModalContainer}>
          <View style={styles.fullscreenModalHeaderTopBar}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.fullscreenModalMainTitleHeading}>Add New Company</Text>
              <Text style={styles.fullscreenModalMainSubtitleCap}>Create a new company profile and add it to the directory</Text>
            </View>
            <TouchableOpacity onPress={() => { setAddCompanyOpen(false); resetAddForm(); }}>
              <X size={20} color={uiTheme.panelColors.dashboardTextColor} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.fullscreenModalFormScrollBody}>
            <View style={styles.formFieldLayoutRowStack}>
              <Text style={styles.formInputGroupFieldNameLabel}>Company Name *</Text>
              <TextInput
                style={styles.formTextInputWidgetContainer}
                value={addFormData.name}
                onChangeText={(val) => setAddFormData({ ...addFormData, name: val })}
                placeholder="e.g., TaskFlow Inc."
                placeholderTextColor="rgba(148,163,184,0.3)"
              />
            </View>

            <View style={styles.formFieldLayoutRowStack}>
              <Text style={styles.formInputGroupFieldNameLabel}>Company Code (Auto-generated)</Text>
              <TextInput
                style={[styles.formTextInputWidgetContainer, { backgroundColor: "rgba(148,163,184,0.06)", color: "rgba(148,163,184,0.5)" }]}
                value={addFormData.name ? `${generatePrefix(addFormData.name)}-${String(getNextSequence()).padStart(3, "0")}` : ""}
                editable={false}
                placeholder="Will be generated automatically"
                placeholderTextColor="rgba(148,163,184,0.3)"
              />
              <Text style={styles.formFieldHelperInfoCaptionText}>Code is automatically generated based on company name</Text>
            </View>

            <View style={styles.formFieldLayoutRowStack}>
              <Text style={styles.formInputGroupFieldNameLabel}>Description</Text>
              <TextInput
                style={styles.formTextareaInputWidgetContainer}
                value={addFormData.description}
                onChangeText={(val) => setAddFormData({ ...addFormData, description: val })}
                placeholder="Brief description of the company"
                placeholderTextColor="rgba(148,163,184,0.3)"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.formFieldLayoutRowStack}>
              <Text style={styles.formInputGroupFieldNameLabel}>Status</Text>
              <TouchableOpacity style={styles.formPickerInlineTriggerElement} onPress={() => setStatusAddPickerOpen(true)}>
                <Text style={{ fontSize: 13, color: uiTheme.panelColors.dashboardTextColor }}>
                  {addFormData.status.charAt(0).toUpperCase() + addFormData.status.slice(1)}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.sectionalDividerHeaderLine}>
              <Text style={styles.sectionalDividerHeaderTitle}>Address</Text>
            </View>

            <View style={styles.formFieldLayoutRowStack}>
              <Text style={styles.formInputGroupFieldNameLabel}>Country</Text>
              <TouchableOpacity style={styles.formPickerInlineTriggerElement} onPress={() => setCountryAddPickerOpen(true)}>
                <Text style={{ fontSize: 13, color: uiTheme.panelColors.dashboardTextColor }}>{addFormData.country || "Select Country"}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formFieldLayoutRowStack}>
              <Text style={styles.formInputGroupFieldNameLabel}>Street Address</Text>
              <TextInput
                style={styles.formTextInputWidgetContainer}
                value={addFormData.street}
                onChangeText={(val) => setAddFormData({ ...addFormData, street: val })}
                placeholder="Street Address"
                placeholderTextColor="rgba(148,163,184,0.3)"
              />
            </View>

            <View style={styles.formDualColumnGridInlineInputRow}>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={styles.formInputGroupFieldNameLabel}>City</Text>
                <TextInput
                  style={styles.formTextInputWidgetContainer}
                  value={addFormData.city}
                  onChangeText={(val) => setAddFormData({ ...addFormData, city: val })}
                  placeholder="City"
                  placeholderTextColor="rgba(148,163,184,0.3)"
                />
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={styles.formInputGroupFieldNameLabel}>State</Text>
                <TextInput
                  style={styles.formTextInputWidgetContainer}
                  value={addFormData.state}
                  onChangeText={(val) => setAddFormData({ ...addFormData, state: val })}
                  placeholder="State"
                  placeholderTextColor="rgba(148,163,184,0.3)"
                />
              </View>
            </View>

            <View style={styles.formFieldLayoutRowStack}>
              <Text style={styles.formInputGroupFieldNameLabel}>Zip Code</Text>
              <TextInput
                style={styles.formTextInputWidgetContainer}
                value={addFormData.zipCode}
                onChangeText={(val) => setAddFormData({ ...addFormData, zipCode: val })}
                placeholder="Zip Code"
                placeholderTextColor="rgba(148,163,184,0.3)"
              />
            </View>

            <View style={styles.sectionalDividerHeaderLine}>
              <Text style={styles.sectionalDividerHeaderTitle}>Contact Information</Text>
            </View>

            <View style={styles.formFieldLayoutRowStack}>
              <Text style={styles.formInputGroupFieldNameLabel}>Email Address</Text>
              <TextInput
                style={styles.formTextInputWidgetContainer}
                value={addFormData.email}
                onChangeText={(val) => setAddFormData({ ...addFormData, email: val })}
                placeholder="Email Address"
                placeholderTextColor="rgba(148,163,184,0.3)"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formFieldLayoutRowStack}>
              <Text style={styles.formInputGroupFieldNameLabel}>Phone Number</Text>
              <TextInput
                style={styles.formTextInputWidgetContainer}
                value={addFormData.phone}
                onChangeText={(val) => setAddFormData({ ...addFormData, phone: val })}
                placeholder="Phone Number"
                placeholderTextColor="rgba(148,163,184,0.3)"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.formFieldLayoutRowStack}>
              <Text style={styles.formInputGroupFieldNameLabel}>Website URL</Text>
              <TextInput
                style={styles.formTextInputWidgetContainer}
                value={addFormData.website}
                onChangeText={(val) => setAddFormData({ ...addFormData, website: val })}
                placeholder="Website URL"
                placeholderTextColor="rgba(148,163,184,0.3)"
                keyboardType="url"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.sectionalDividerHeaderLine}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Sparkles size={14} color={uiTheme.customColors.primary} />
                <Text style={[styles.sectionalDividerHeaderTitle, { color: uiTheme.customColors.primary }]}>Corporate Compliance</Text>
              </View>
            </View>

            <View style={styles.formDualColumnGridInlineInputRow}>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={styles.formInputGroupFieldNameLabel}>EIN Number</Text>
                <TextInput
                  style={styles.formTextInputWidgetContainer}
                  value={addFormData.einNumber}
                  onChangeText={(val) => setAddFormData({ ...addFormData, einNumber: val })}
                  placeholder="XX-XXXXXXX"
                  placeholderTextColor="rgba(148,163,184,0.3)"
                />
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={styles.formInputGroupFieldNameLabel}>Charter Number</Text>
                <TextInput
                  style={styles.formTextInputWidgetContainer}
                  value={addFormData.charterNumber}
                  onChangeText={(val) => setAddFormData({ ...addFormData, charterNumber: val })}
                  placeholder="Charter #"
                  placeholderTextColor="rgba(148,163,184,0.3)"
                />
              </View>
            </View>

            <View style={styles.formFieldLayoutRowStack}>
              <Text style={styles.formInputGroupFieldNameLabel}>State of Incorporation</Text>
              <TextInput
                style={styles.formTextInputWidgetContainer}
                value={addFormData.stateOfIncorporation}
                onChangeText={(val) => setAddFormData({ ...addFormData, stateOfIncorporation: val })}
                placeholder="Delaware"
                placeholderTextColor="rgba(148,163,184,0.3)"
              />
            </View>

            <View style={styles.formDualColumnGridInlineInputRow}>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={styles.formInputGroupFieldNameLabel}>Original Filing Date</Text>
                <TextInput
                  style={styles.formTextInputWidgetContainer}
                  value={addFormData.originalFilingDate}
                  onChangeText={(val) => setAddFormData({ ...addFormData, originalFilingDate: val })}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="rgba(148,163,184,0.3)"
                />
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={[styles.formInputGroupFieldNameLabel, { color: uiTheme.customColors.primary }]}>Annual Report Due</Text>
                <TextInput
                  style={[styles.formTextInputWidgetContainer, { borderColor: "rgba(212,163,89,0.3)" }]}
                  value={addFormData.annualReportDueDate}
                  onChangeText={(val) => setAddFormData({ ...addFormData, annualReportDueDate: val })}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="rgba(148,163,184,0.3)"
                />
              </View>
            </View>

            <View style={styles.sectionalDividerHeaderLine}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                <Text style={styles.sectionalDividerHeaderTitle}>Foreign Entity Filings</Text>
                <TouchableOpacity 
                  style={styles.inlineActionRowMiniButton}
                  onPress={() => setAddFormData(prev => ({
                    ...prev,
                    foreignEntities: [...prev.foreignEntities, { state: "", documentNumber: "" }]
                  }))}
                >
                  <Plus size={10} color={uiTheme.customColors.primary} style={{ marginRight: 2 }} />
                  <Text style={styles.inlineActionRowMiniButtonText}>Add State</Text>
                </TouchableOpacity>
              </View>
            </View>

            {addFormData.foreignEntities.map((entity, index) => (
              <View key={index} style={styles.dynamicRowBlockContainer}>
                <TextInput
                  style={[styles.formTextInputWidgetContainer, { flex: 1, height: 32 }]}
                  placeholder="State"
                  placeholderTextColor="rgba(148,163,184,0.3)"
                  value={entity.state}
                  onChangeText={(val) => {
                    const cloned = [...addFormData.foreignEntities];
                    cloned[index].state = val;
                    setAddFormData(p => ({ ...p, foreignEntities: cloned }));
                  }}
                />
                <TextInput
                  style={[styles.formTextInputWidgetContainer, { flex: 1, height: 32 }]}
                  placeholder="Doc #"
                  placeholderTextColor="rgba(148,163,184,0.3)"
                  value={entity.documentNumber}
                  onChangeText={(val) => {
                    const cloned = [...addFormData.foreignEntities];
                    cloned[index].documentNumber = val;
                    setAddFormData(p => ({ ...p, foreignEntities: cloned }));
                  }}
                />
                <TouchableOpacity 
                  onPress={() => {
                    const cloned = addFormData.foreignEntities.filter((_, idx) => idx !== index);
                    setAddFormData(p => ({ ...p, foreignEntities: cloned }));
                  }}
                  style={{ padding: 4 }}
                >
                  <X size={14} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))}

            <View style={styles.sectionalDividerHeaderLine}>
              <Text style={styles.sectionalDividerHeaderTitle}>Company Logo</Text>
            </View>

            <View style={styles.imageUploaderComponentFrame}>
              {addFormData.logo ? (
                <View style={styles.uploadedImagePreviewCanvas}>
                  <Image source={{ uri: toProxiedUrl(addFormData.logo) }} style={styles.uploadedCoreImageElement} />
                  <TouchableOpacity style={styles.removeImageAbsoluteBadge} onPress={() => setAddFormData(p => ({ ...p, logo: "" }))}>
                    <X size={12} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              ) : null}
              <View style={{ flexDirection: "row", gap: 10, flex: 1 }}>
                <TouchableOpacity style={styles.mediaActionUploadButton} onPress={() => handleLocalImageUpload("add")}>
                  <Upload size={14} color={uiTheme.customColors.primary} />
                  <Text style={styles.mediaActionUploadButtonText}>Upload Logo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.mediaActionUploadButton, { borderColor: "rgba(99,102,241,0.2)" }]} onPress={() => triggerImagePicker("add")}>
                  <ImageIcon size={14} color="#818cf8" />
                  <Text style={[styles.mediaActionUploadButtonText, { color: "#818cf8" }]}>Pick from Images</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          <View style={styles.fullscreenModalFooterButtonBar}>
            <TouchableOpacity style={styles.formDismissActionModalButton} onPress={() => { setAddCompanyOpen(false); resetAddForm(); }}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: uiTheme.panelColors.dashboardTextColor }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.formSubmitActionModalButton, { backgroundColor: uiTheme.customColors.primary }]} 
              onPress={handleAddCompany}
              disabled={isAdding || !addFormData.name.trim()}
            >
              {isAdding ? (
                <ActivityIndicator size="small" color="#09090b" />
              ) : (
                <Text style={styles.formSubmitActionModalButtonText}>Add Company</Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      <Modal visible={editCompanyOpen} transparent animationType="slide" onRequestClose={() => setEditCompanyOpen(false)}>
        <SafeAreaView style={styles.fullscreenModalContainer}>
          <View style={styles.fullscreenModalHeaderTopBar}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.fullscreenModalMainTitleHeading}>Edit Company</Text>
              <Text style={styles.fullscreenModalMainSubtitleCap}>Update company information and save changes</Text>
            </View>
            <TouchableOpacity onPress={() => setEditCompanyOpen(false)}>
              <X size={20} color={uiTheme.panelColors.dashboardTextColor} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.fullscreenModalFormScrollBody}>
            <View style={styles.formFieldLayoutRowStack}>
              <Text style={styles.formInputGroupFieldNameLabel}>Company Name *</Text>
              <TextInput
                style={styles.formTextInputWidgetContainer}
                value={editFormData.name}
                onChangeText={(val) => setEditFormData({ ...editFormData, name: val })}
              />
            </View>

            <View style={styles.formFieldLayoutRowStack}>
              <Text style={styles.formInputGroupFieldNameLabel}>Company Code</Text>
              <TextInput
                style={[styles.formTextInputWidgetContainer, { backgroundColor: "rgba(148,163,184,0.06)", color: "rgba(148,163,184,0.5)" }]}
                value={editFormData.code}
                editable={false}
              />
            </View>

            <View style={styles.formFieldLayoutRowStack}>
              <Text style={styles.formInputGroupFieldNameLabel}>Description</Text>
              <TextInput
                style={styles.formTextareaInputWidgetContainer}
                value={editFormData.description}
                onChangeText={(val) => setEditFormData({ ...editFormData, description: val })}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.formFieldLayoutRowStack}>
              <Text style={styles.formInputGroupFieldNameLabel}>Status</Text>
              <TouchableOpacity style={styles.formPickerInlineTriggerElement} onPress={() => setStatusEditPickerOpen(true)}>
                <Text style={{ fontSize: 13, color: uiTheme.panelColors.dashboardTextColor }}>
                  {editFormData.status.charAt(0).toUpperCase() + editFormData.status.slice(1)}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.sectionalDividerHeaderLine}>
              <Text style={styles.sectionalDividerHeaderTitle}>Address</Text>
            </View>

            <View style={styles.formFieldLayoutRowStack}>
              <Text style={styles.formInputGroupFieldNameLabel}>Country</Text>
              <TouchableOpacity style={styles.formPickerInlineTriggerElement} onPress={() => setCountryEditPickerOpen(true)}>
                <Text style={{ fontSize: 13, color: uiTheme.panelColors.dashboardTextColor }}>{editFormData.country || "Select Country"}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formFieldLayoutRowStack}>
              <Text style={styles.formInputGroupFieldNameLabel}>Street Address</Text>
              <TextInput
                style={styles.formTextInputWidgetContainer}
                value={editFormData.street}
                onChangeText={(val) => setEditFormData({ ...editFormData, street: val })}
              />
            </View>

            <View style={styles.formDualColumnGridInlineInputRow}>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={styles.formInputGroupFieldNameLabel}>City</Text>
                <TextInput
                  style={styles.formTextInputWidgetContainer}
                  value={editFormData.city}
                  onChangeText={(val) => setEditFormData({ ...editFormData, city: val })}
                />
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={styles.formInputGroupFieldNameLabel}>State</Text>
                <TextInput
                  style={styles.formTextInputWidgetContainer}
                  value={editFormData.state}
                  onChangeText={(val) => setEditFormData({ ...editFormData, state: val })}
                />
              </View>
            </View>

            <View style={styles.formFieldLayoutRowStack}>
              <Text style={styles.formInputGroupFieldNameLabel}>Zip Code</Text>
              <TextInput
                style={styles.formTextInputWidgetContainer}
                value={editFormData.zipCode}
                onChangeText={(val) => setEditFormData({ ...editFormData, zipCode: val })}
              />
            </View>

            <View style={styles.sectionalDividerHeaderLine}>
              <Text style={styles.sectionalDividerHeaderTitle}>Contact Information</Text>
            </View>

            <View style={styles.formFieldLayoutRowStack}>
              <Text style={styles.formInputGroupFieldNameLabel}>Email Address</Text>
              <TextInput
                style={styles.formTextInputWidgetContainer}
                value={editFormData.email}
                onChangeText={(val) => setEditFormData({ ...editFormData, email: val })}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formFieldLayoutRowStack}>
              <Text style={styles.formInputGroupFieldNameLabel}>Phone Number</Text>
              <TextInput
                style={styles.formTextInputWidgetContainer}
                value={editFormData.phone}
                onChangeText={(val) => setEditFormData({ ...editFormData, phone: val })}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.formFieldLayoutRowStack}>
              <Text style={styles.formInputGroupFieldNameLabel}>Website URL</Text>
              <TextInput
                style={styles.formTextInputWidgetContainer}
                value={editFormData.website}
                onChangeText={(val) => setEditFormData({ ...editFormData, website: val })}
                keyboardType="url"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.sectionalDividerHeaderLine}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Sparkles size={14} color={uiTheme.customColors.primary} />
                <Text style={[styles.sectionalDividerHeaderTitle, { color: uiTheme.customColors.primary }]}>Corporate Compliance</Text>
              </View>
            </View>

            <View style={styles.formDualColumnGridInlineInputRow}>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={styles.formInputGroupFieldNameLabel}>EIN Number</Text>
                <TextInput
                  style={styles.formTextInputWidgetContainer}
                  value={editFormData.einNumber}
                  onChangeText={(val) => setEditFormData({ ...editFormData, einNumber: val })}
                />
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={styles.formInputGroupFieldNameLabel}>Charter Number</Text>
                <TextInput
                  style={styles.formTextInputWidgetContainer}
                  value={editFormData.charterNumber}
                  onChangeText={(val) => setEditFormData({ ...editFormData, charterNumber: val })}
                />
              </View>
            </View>

            <View style={styles.formFieldLayoutRowStack}>
              <Text style={styles.formInputGroupFieldNameLabel}>State of Incorporation</Text>
              <TextInput
                style={styles.formTextInputWidgetContainer}
                value={editFormData.stateOfIncorporation}
                onChangeText={(val) => setEditFormData({ ...editFormData, stateOfIncorporation: val })}
              />
            </View>

            <View style={styles.formDualColumnGridInlineInputRow}>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={styles.formInputGroupFieldNameLabel}>Original Filing Date</Text>
                <TextInput
                  style={styles.formTextInputWidgetContainer}
                  value={editFormData.originalFilingDate}
                  onChangeText={(val) => setEditFormData({ ...editFormData, originalFilingDate: val })}
                />
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={[styles.formInputGroupFieldNameLabel, { color: uiTheme.customColors.primary }]}>Annual Report Due</Text>
                <TextInput
                  style={[styles.formTextInputWidgetContainer, { borderColor: "rgba(212,163,89,0.3)" }]}
                  value={editFormData.annualReportDueDate}
                  onChangeText={(val) => setEditFormData({ ...editFormData, annualReportDueDate: val })}
                />
              </View>
            </View>

            <View style={styles.sectionalDividerHeaderLine}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                <Text style={styles.sectionalDividerHeaderTitle}>Foreign Entity Filings</Text>
                <TouchableOpacity 
                  style={styles.inlineActionRowMiniButton}
                  onPress={() => setEditFormData(prev => ({
                    ...prev,
                    foreignEntities: [...prev.foreignEntities, { state: "", documentNumber: "" }]
                  }))}
                >
                  <Plus size={10} color={uiTheme.customColors.primary} style={{ marginRight: 2 }} />
                  <Text style={styles.inlineActionRowMiniButtonText}>Add State</Text>
                </TouchableOpacity>
              </View>
            </View>

            {editFormData.foreignEntities.map((entity, index) => (
              <View key={index} style={styles.dynamicRowBlockContainer}>
                <TextInput
                  style={[styles.formTextInputWidgetContainer, { flex: 1, height: 32 }]}
                  placeholder="State"
                  placeholderTextColor="rgba(148,163,184,0.3)"
                  value={entity.state}
                  onChangeText={(val) => {
                    const cloned = [...editFormData.foreignEntities];
                    cloned[index].state = val;
                    setEditFormData(p => ({ ...p, foreignEntities: cloned }));
                  }}
                />
                <TextInput
                  style={[styles.formTextInputWidgetContainer, { flex: 1, height: 32 }]}
                  placeholder="Doc #"
                  placeholderTextColor="rgba(148,163,184,0.3)"
                  value={entity.documentNumber}
                  onChangeText={(val) => {
                    const cloned = [...editFormData.foreignEntities];
                    cloned[index].documentNumber = val;
                    setEditFormData(p => ({ ...p, foreignEntities: cloned }));
                  }}
                />
                <TouchableOpacity 
                  onPress={() => {
                    const cloned = editFormData.foreignEntities.filter((_, idx) => idx !== index);
                    setEditFormData(p => ({ ...p, foreignEntities: cloned }));
                  }}
                  style={{ padding: 4 }}
                >
                  <X size={14} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))}

            <View style={styles.sectionalDividerHeaderLine}>
              <Text style={styles.sectionalDividerHeaderTitle}>Company Logo</Text>
            </View>

            <View style={styles.imageUploaderComponentFrame}>
              {editFormData.logo ? (
                <View style={styles.uploadedImagePreviewCanvas}>
                  <Image source={{ uri: toProxiedUrl(editFormData.logo) }} style={styles.uploadedCoreImageElement} />
                  <TouchableOpacity style={styles.removeImageAbsoluteBadge} onPress={() => setEditFormData(p => ({ ...p, logo: "" }))}>
                    <X size={12} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              ) : null}
              <View style={{ flexDirection: "row", gap: 10, flex: 1 }}>
                <TouchableOpacity style={styles.mediaActionUploadButton} onPress={() => handleLocalImageUpload("edit")}>
                  <Upload size={14} color={uiTheme.customColors.primary} />
                  <Text style={styles.mediaActionUploadButtonText}>Upload Logo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.mediaActionUploadButton, { borderColor: "rgba(99,102,241,0.2)" }]} onPress={() => triggerImagePicker("edit")}>
                  <ImageIcon size={14} color="#818cf8" />
                  <Text style={[styles.mediaActionUploadButtonText, { color: "#818cf8" }]}>Pick from Images</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          <View style={styles.fullscreenModalFooterButtonBar}>
            <TouchableOpacity style={styles.formDismissActionModalButton} onPress={() => setEditCompanyOpen(false)}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: uiTheme.panelColors.dashboardTextColor }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.formSubmitActionModalButton, { backgroundColor: uiTheme.customColors.primary }]} 
              onPress={saveEditCompany}
              disabled={!editFormData.name.trim()}
            >
              <Text style={styles.formSubmitActionModalButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      <Modal visible={viewCompanyOpen} transparent animationType="slide" onRequestClose={() => setViewCompanyOpen(false)}>
        <SafeAreaView style={styles.fullscreenModalContainer}>
          <View style={styles.fullscreenModalHeaderTopBar}>
            <Text style={styles.fullscreenModalMainTitleHeading}>Company Details</Text>
            <TouchableOpacity onPress={() => setViewCompanyOpen(false)}>
              <X size={20} color={uiTheme.panelColors.dashboardTextColor} />
            </TouchableOpacity>
          </View>

          {selectedCompany ? (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.fullscreenModalFormScrollBody}>
              <View style={styles.viewSheetIdentityPlateRow}>
                <View style={styles.avatarFallbackWellLarge}>
                  {selectedCompany.logo ? (
                    <Image source={{ uri: toProxiedUrl(selectedCompany.logo) }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                  ) : (
                    <Text style={{ fontSize: 18, fontWeight: "800", color: "#ffffff" }}>
                      {selectedCompany.code?.slice(0, 2).toUpperCase() || "CO"}
                    </Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.viewSheetPrimaryNameText}>{selectedCompany.name}</Text>
                  <Text style={styles.viewSheetSubCodeText}>{selectedCompany.code}</Text>
                  <View style={[
                    styles.statusBadgeBase,
                    { marginTop: 6, alignSelf: "flex-start" },
                    selectedCompany.status === "active" && styles.statusBadgeActive,
                    selectedCompany.status === "inactive" && styles.statusBadgeInactive,
                    selectedCompany.status === "suspended" && styles.statusBadgeSuspended
                  ]}>
                    <Text style={[
                      styles.statusBadgeText,
                      selectedCompany.status === "active" && { color: "#4ade80" },
                      selectedCompany.status === "inactive" && { color: "#94a3b8" },
                      selectedCompany.status === "suspended" && { color: "#fca5a5" }
                    ]}>{selectedCompany.status.toUpperCase()}</Text>
                  </View>
                </View>
              </View>

              {selectedCompany.description ? (
                <View style={styles.viewSheetRecordRowBlock}>
                  <Text style={styles.viewSheetRecordLabel}>Description</Text>
                  <View style={styles.viewSheetDescriptionTextWell}>
                    <Text style={styles.viewSheetDescriptionContentText}>{selectedCompany.description}</Text>
                  </View>
                </View>
              ) : null}

              <View style={styles.viewSheetRecordRowBlock}>
                <Text style={styles.viewSheetRecordLabel}>Contact Information</Text>
                <View style={styles.viewSheetDetailsGridContainer}>
                  {selectedCompany.contact?.email ? (
                    <View style={styles.viewSheetGridItemElement}>
                      <Mail size={14} color="rgba(148,163,184,0.4)" />
                      <Text style={styles.viewSheetGridItemValueText}>{selectedCompany.contact.email}</Text>
                    </View>
                  ) : null}
                  {selectedCompany.contact?.phone ? (
                    <View style={styles.viewSheetGridItemElement}>
                      <Phone size={14} color="rgba(148,163,184,0.4)" />
                      <Text style={styles.viewSheetGridItemValueText}>{selectedCompany.contact.phone}</Text>
                    </View>
                  ) : null}
                  {selectedCompany.contact?.website ? (
                    <View style={styles.viewSheetGridItemElement}>
                      <Globe size={14} color={uiTheme.customColors.primary} />
                      <Text style={[styles.viewSheetGridItemValueText, { color: "#60a5fa" }]}>{selectedCompany.contact.website}</Text>
                    </View>
                  ) : null}
                </View>
              </View>

              {(selectedCompany.address?.street || selectedCompany.address?.city) ? (
                <View style={styles.viewSheetRecordRowBlock}>
                  <Text style={styles.viewSheetRecordLabel}>Address</Text>
                  <View style={styles.viewSheetGridItemElement}>
                    <MapPin size={14} color="rgba(148,163,184,0.4)" />
                    <Text style={styles.viewSheetGridItemValueText}>
                      {[selectedCompany.address?.street, selectedCompany.address?.city, selectedCompany.address?.state, selectedCompany.address?.zipCode, selectedCompany.address?.country].filter(Boolean).join(", ")}
                    </Text>
                  </View>
                </View>
              ) : null}

              <View style={styles.viewSheetRecordRowBlock}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <Sparkles size={14} color={uiTheme.customColors.primary} />
                  <Text style={[styles.viewSheetRecordLabel, { marginBottom: 0, color: uiTheme.customColors.primary }]}>Corporate Compliance</Text>
                </View>
                <View style={styles.complianceDataMatrixGridContainer}>
                  <View style={styles.complianceDataMatrixGridCell}>
                    <Text style={styles.complianceMatrixCellLabel}>EIN Number</Text>
                    <Text style={styles.complianceMatrixCellValue}>{selectedCompany.einNumber || "N/A"}</Text>
                  </View>
                  <View style={styles.complianceDataMatrixGridCell}>
                    <Text style={styles.complianceMatrixCellLabel}>Charter Number</Text>
                    <Text style={styles.complianceMatrixCellValue}>{selectedCompany.charterNumber || "N/A"}</Text>
                  </View>
                  <View style={styles.complianceDataMatrixGridCell}>
                    <Text style={styles.complianceMatrixCellLabel}>State of Incorporation</Text>
                    <Text style={styles.complianceMatrixCellValue}>{selectedCompany.stateOfIncorporation || "N/A"}</Text>
                  </View>
                  <View style={styles.complianceDataMatrixGridCell}>
                    <Text style={styles.complianceMatrixCellLabel}>Original Filing Date</Text>
                    <Text style={styles.complianceMatrixCellValue}>
                      {selectedCompany.originalFilingDate ? new Date(selectedCompany.originalFilingDate).toLocaleDateString() : "N/A"}
                    </Text>
                  </View>
                  <View style={styles.complianceMatrixHighlightDueBannerCell}>
                    <Text style={styles.complianceHighlightDueLabel}>Annual Report Due Date</Text>
                    <Text style={styles.complianceHighlightDueValue}>
                      {selectedCompany.annualReportDueDate ? new Date(selectedCompany.annualReportDueDate).toLocaleDateString() : "N/A"}
                    </Text>
                  </View>
                </View>
              </View>
            </ScrollView>
          ) : null}

          <View style={styles.fullscreenModalFooterButtonBar}>
            <TouchableOpacity style={[styles.formSubmitActionModalButton, { backgroundColor: uiTheme.customColors.primary, width: "100%" }]} onPress={() => setViewCompanyOpen(false)}>
              <Text style={styles.formSubmitActionModalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      <Modal visible={statusAddPickerOpen} transparent animationType="fade" onRequestClose={() => setStatusAddPickerOpen(false)}>
        <TouchableOpacity style={styles.modalBackdropOverlay} activeOpacity={1} onPress={() => setStatusAddPickerOpen(false)}>
          <View style={styles.modalSelectionBoxSurface}>
            <Text style={styles.selectionModalTitleHeading}>Select Status</Text>
            {["active", "inactive", "suspended"].map((st) => (
              <TouchableOpacity key={st} style={styles.selectionOptionRowElement} onPress={() => { setAddFormData({ ...addFormData, status: st as any }); setStatusAddPickerOpen(false); }}>
                <Text style={styles.selectionOptionRowText}>{st.charAt(0).toUpperCase() + st.slice(1)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={statusEditPickerOpen} transparent animationType="fade" onRequestClose={() => setStatusEditPickerOpen(false)}>
        <TouchableOpacity style={styles.modalBackdropOverlay} activeOpacity={1} onPress={() => setStatusEditPickerOpen(false)}>
          <View style={styles.modalSelectionBoxSurface}>
            <Text style={styles.selectionModalTitleHeading}>Select Status</Text>
            {["active", "inactive", "suspended"].map((st) => (
              <TouchableOpacity key={st} style={styles.selectionOptionRowElement} onPress={() => { setEditFormData({ ...editFormData, status: st as any }); setStatusEditPickerOpen(false); }}>
                <Text style={styles.selectionOptionRowText}>{st.charAt(0).toUpperCase() + st.slice(1)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={countryAddPickerOpen} transparent animationType="fade" onRequestClose={() => setCountryAddPickerOpen(false)}>
        <TouchableOpacity style={styles.modalBackdropOverlay} activeOpacity={1} onPress={() => setCountryAddPickerOpen(false)}>
          <View style={[styles.modalSelectionBoxSurface, { maxHeight: height * 0.6, maxWidth: 320 }]}>
            <Text style={styles.selectionModalTitleHeading}>Select Country</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {COUNTRIES.map((ct) => (
                <TouchableOpacity key={ct} style={styles.selectionOptionRowElement} onPress={() => { setAddFormData({ ...addFormData, country: ct }); setCountryAddPickerOpen(false); }}>
                  <Text style={styles.selectionOptionRowText}>{ct}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={countryEditPickerOpen} transparent animationType="fade" onRequestClose={() => setCountryEditPickerOpen(false)}>
        <TouchableOpacity style={styles.modalBackdropOverlay} activeOpacity={1} onPress={() => setCountryEditPickerOpen(false)}>
          <View style={[styles.modalSelectionBoxSurface, { maxHeight: height * 0.6, maxWidth: 320 }]}>
            <Text style={styles.selectionModalTitleHeading}>Select Country</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {COUNTRIES.map((ct) => (
                <TouchableOpacity key={ct} style={styles.selectionOptionRowElement} onPress={() => { setEditFormData({ ...editFormData, country: ct }); setCountryEditPickerOpen(false); }}>
                  <Text style={styles.selectionOptionRowText}>{ct}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={imageLibraryOpen} transparent animationType="fade" onRequestClose={() => setImageLibraryOpen(false)}>
        <SafeAreaView style={styles.imagePickerOverlayContainer}>
          <View style={styles.imagePickerModalSurface}>
            <View style={styles.imagePickerModalHeaderRowContainer}>
              <View style={{ flex: 1 }}>
                <Text style={styles.imagePickerMainTitleHeading}>Pick Image Asset</Text>
                <Text style={styles.imagePickerMainSubtitleCap}>Select an image from the remote asset catalog</Text>
              </View>
              <TouchableOpacity onPress={() => setImageLibraryOpen(false)} style={{ padding: 4 }}>
                <X size={20} color={uiTheme.panelColors.dashboardTextColor} />
              </TouchableOpacity>
            </View>

            <View style={styles.imagePickerDualColumnWorkspaceRowLayout}>
              <View style={styles.imagePickerFolderSidebarLayout}>
                <TouchableOpacity 
                  style={[styles.imagePickerFolderNavigationRowAnchor, !selectedFolderId && styles.imagePickerFolderNavigationActiveAnchor]}
                  onPress={() => { setSelectedFolderId(""); setAssetPage(1); }}
                >
                  <FolderOpen size={14} color={!selectedFolderId ? uiTheme.customColors.primary : "rgba(148,163,184,0.5)"} />
                  <Text style={[styles.imagePickerFolderNavigationItemText, !selectedFolderId && { color: uiTheme.customColors.primary, fontWeight: "700" }]} numberOfLines={1}>All Files</Text>
                </TouchableOpacity>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
                  {flatFolders.map((f) => (
                    <TouchableOpacity
                      key={f.id}
                      style={[styles.imagePickerFolderNavigationRowAnchor, selectedFolderId === f.id && styles.imagePickerFolderNavigationActiveAnchor, { paddingLeft: 8 + (f.depth * 10) }]}
                      onPress={() => { setSelectedFolderId(f.id); setAssetPage(1); }}
                    >
                      <FolderOpen size={12} color={selectedFolderId === f.id ? uiTheme.customColors.primary : "rgba(148,163,184,0.4)"} />
                      <Text style={[styles.imagePickerFolderNavigationItemText, selectedFolderId === f.id && { color: uiTheme.customColors.primary, fontWeight: "700" }]} numberOfLines={1}>{f.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.imagePickerCoreContentWorkspaceView}>
                <View style={styles.imagePickerWorkspaceFilterInputFrame}>
                  <Search size={14} color="rgba(148,163,184,0.4)" style={styles.imagePickerWorkspaceSearchIconAbsolute} />
                  <TextInput
                    style={styles.imagePickerWorkspaceTextInputWidget}
                    placeholder="Search images..."
                    placeholderTextColor="rgba(148,163,184,0.3)"
                    value={assetSearch}
                    onChangeText={setAssetSearch}
                  />
                </View>

                {assetsLoading ? (
                  <View style={styles.imagePickerWorkspaceStatusCenterDeck}>
                    <ActivityIndicator size="small" color={uiTheme.customColors.primary} />
                  </View>
                ) : assets.length === 0 ? (
                  <View style={styles.imagePickerWorkspaceStatusCenterDeck}>
                    <Text style={styles.imagePickerWorkspaceWarningEmptyStateText}>No images found</Text>
                  </View>
                ) : (
                  <ScrollView contentContainerStyle={styles.imagePickerAssetMatrixGridDisplayLayout} showsVerticalScrollIndicator={false}>
                    {assets.map((asset) => {
                      const assetUrl = asset.urlOriginal || asset.attachment?.url || "";
                      const isAssetSelected = selectedAssetUrl === assetUrl;
                      return (
                        <TouchableOpacity 
                          key={asset.id || asset._id} 
                          style={[styles.imagePickerGridAssetCardCellFrame, isAssetSelected && styles.imagePickerGridAssetCardActiveCellFrame]}
                          onPress={() => setSelectedAssetUrl(assetUrl)}
                        >
                          <Image source={{ uri: toProxiedUrl(assetUrl) }} style={{ width: "100%", height: "100%", borderRadius: 6 }} resizeMode="cover" />
                          {isAssetSelected && (
                            <View style={styles.imagePickerAssetSelectionOverlayCheckBadge}>
                              <Check size={12} color="#ffffff" />
                            </View>
                          )}
                          <View style={styles.imagePickerAssetCaptionMetaLabelWell}>
                            <Text style={styles.imagePickerAssetCaptionMetaLabelText} numberOfLines={1}>{asset.originalFilename || "image"}</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}

                {assetTotalPages > 1 && (
                  <View style={styles.imagePickerPaginationControlBannerRow}>
                    <TouchableOpacity 
                      disabled={assetPage === 1 || assetsLoading} 
                      onPress={() => setAssetPage(p => Math.max(1, p - 1))}
                      style={[styles.imagePickerPaginationArrowInlineButton, assetPage === 1 && { opacity: 0.3 }]}
                    >
                      <ChevronLeft size={16} color={uiTheme.panelColors.dashboardTextColor} />
                    </TouchableOpacity>
                    <Text style={styles.imagePickerPaginationMetricStatusCounterLabelText}>{assetPage} / {assetTotalPages}</Text>
                    <TouchableOpacity 
                      disabled={assetPage === assetTotalPages || assetsLoading} 
                      onPress={() => setAssetPage(p => Math.min(assetTotalPages, p + 1))}
                      style={[styles.imagePickerPaginationArrowInlineButton, assetPage === assetTotalPages && { opacity: 0.3 }]}
                    >
                      <ChevronRight size={16} color={uiTheme.panelColors.dashboardTextColor} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.imagePickerModalFooterActionButtonBar}>
              <TouchableOpacity style={styles.formDismissActionModalButton} onPress={() => setImageLibraryOpen(false)}>
                <Text style={{ fontSize: 12, fontWeight: "600", color: uiTheme.panelColors.dashboardTextColor }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.formSubmitActionModalButton, { backgroundColor: uiTheme.customColors.primary }]} 
                disabled={!selectedAssetUrl}
                onPress={confirmAssetSelection}
              >
                <Text style={styles.formSubmitActionModalButtonText}>Select Image</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}

const getThemedStyles = (uiTheme: any) => {
  const isLightTheme = uiTheme.theme.includes("crystal") || uiTheme.panelColors.dashboardTextColor === "#000000";
  const structuralBorderColor = isLightTheme ? "rgba(0, 0, 0, 0.08)" : "rgba(255, 255, 255, 0.08)";
  const surfaceAlphaColor = isLightTheme ? "rgba(0, 0, 0, 0.03)" : "rgba(255, 255, 255, 0.03)";

  return StyleSheet.create({
    rootContainer: {
      flex: 1,
      backgroundColor: uiTheme.panelColors.dashboardBackground,
    },
    centerDeck: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: uiTheme.panelColors.dashboardBackground,
    },
    headerDeck: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 12,
    },
    headerTitleRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    screenHeading: {
      fontSize: 22,
      fontWeight: "800",
      letterSpacing: -0.5,
      color: uiTheme.panelColors.dashboardTextColor,
    },
    screenCaption: {
      fontSize: 12,
      color: uiTheme.panelColors.dashboardTextColor,
      opacity: 0.6,
      marginTop: 4,
      lineHeight: 16,
    },
    addCompanyHeaderButton: {
      height: 36,
      paddingHorizontal: 12,
      borderRadius: 8,
      backgroundColor: uiTheme.customColors.primary,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },
    addCompanyHeaderButtonText: {
      fontSize: 12,
      fontWeight: "700",
      color: isLightTheme ? "#ffffff" : "#09090b",
    },
    alertPanelError: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(239,68,68,0.1)",
      borderWidth: 1,
      borderColor: "rgba(239,68,68,0.2)",
      marginHorizontal: 16,
      marginVertical: 4,
      padding: 10,
      borderRadius: 8,
    },
    errorTextLabel: {
      color: "#f87171",
      fontSize: 12,
      flex: 1,
    },
    summaryGridContainer: {
      marginVertical: 6,
    },
    summaryKpiCard: {
      minWidth: 110,
      borderWidth: 1,
      borderColor: structuralBorderColor,
      backgroundColor: uiTheme.panelColors.dashboardCardBackground,
      borderRadius: 10,
      padding: 10,
      justifyContent: "center",
    },
    kpiCardMetaLabel: {
      fontSize: 10,
      fontWeight: "600",
      color: uiTheme.panelColors.dashboardTextColor,
      opacity: 0.5,
    },
    kpiCardMetricValue: {
      fontSize: 16,
      fontWeight: "700",
      color: uiTheme.panelColors.dashboardTextColor,
      marginTop: 2,
    },
    searchAndFiltersDeck: {
      flexDirection: "row",
      paddingHorizontal: 16,
      marginVertical: 8,
      gap: 8,
    },
    searchFieldInputFrame: {
      flex: 1,
      height: 36,
      position: "relative",
    },
    searchIconAbsolute: {
      position: "absolute",
      left: 10,
      top: 11,
      zIndex: 2,
    },
    searchTextInputElement: {
      height: "100%",
      backgroundColor: uiTheme.panelColors.dashboardCardBackground,
      borderWidth: 1,
      borderColor: structuralBorderColor,
      borderRadius: 8,
      paddingLeft: 30,
      paddingRight: 10,
      fontSize: 12,
      color: uiTheme.panelColors.dashboardTextColor,
    },
    pickerSelectorAnchor: {
      height: 36,
      backgroundColor: uiTheme.panelColors.dashboardCardBackground,
      borderWidth: 1,
      borderColor: structuralBorderColor,
      borderRadius: 8,
      justifyContent: "center",
      paddingHorizontal: 12,
    },
    pickerSelectorValueText: {
      fontSize: 11,
      fontWeight: "700",
      color: uiTheme.panelColors.dashboardTextColor,
    },
    scrollWrapper: {
      paddingHorizontal: 16,
      paddingBottom: 32,
    },
    blockSectionHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 8,
      marginBottom: 12,
      gap: 8,
    },
    blockTitleText: {
      fontSize: 14,
      fontWeight: "700",
      color: uiTheme.panelColors.dashboardTextColor,
    },
    countBadgeFrame: {
      backgroundColor: "rgba(212,163,89,0.1)",
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    countBadgeText: {
      fontSize: 10,
      color: uiTheme.customColors.primary,
      fontWeight: "600",
    },
    emptyContainerState: {
      paddingVertical: 48,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyResultsWarningText: {
      fontSize: 14,
      fontWeight: "700",
      color: uiTheme.panelColors.dashboardTextColor,
      opacity: 0.6,
    },
    emptyResultsSubText: {
      fontSize: 11,
      color: uiTheme.panelColors.dashboardTextColor,
      opacity: 0.4,
      marginTop: 4,
      textAlign: "center",
    },
    companyCardNodeFrame: {
      borderWidth: 1,
      borderColor: structuralBorderColor,
      borderRadius: 12,
      padding: 12,
      marginBottom: 10,
      backgroundColor: uiTheme.panelColors.dashboardCardBackground,
    },
    cardHeaderTopInlineRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    companyProfileAvatarGroup: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
      gap: 10,
    },
    avatarFallbackWell: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: isLightTheme ? "rgba(0,0,0,0.05)" : "#1e293b",
      borderWidth: 1,
      borderColor: structuralBorderColor,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    avatarLogoImage: {
      width: "100%",
      height: "100%",
      resizeMode: "cover",
    },
    avatarFallbackText: {
      fontSize: 10,
      fontWeight: "700",
      color: uiTheme.panelColors.dashboardTextColor,
    },
    companyCardTitleName: {
      fontSize: 14,
      fontWeight: "700",
      color: uiTheme.panelColors.dashboardTextColor,
    },
    companyCardSubCode: {
      fontSize: 10,
      color: uiTheme.panelColors.dashboardTextColor,
      opacity: 0.4,
      marginTop: 1,
    },
    actionMenuTriggerButton: {
      padding: 4,
      borderRadius: 6,
    },
    cardMiddleBadgesContainer: {
      flexDirection: "row",
      marginTop: 8,
      marginBottom: 4,
    },
    statusBadgeBase: {
      paddingHorizontal: 6,
      paddingVertical: 1.5,
      borderRadius: 4,
      borderWidth: 1,
    },
    statusBadgeActive: {
      backgroundColor: "rgba(34,197,94,0.1)",
      borderColor: "rgba(34,197,94,0.15)",
    },
    statusBadgeInactive: {
      backgroundColor: "rgba(148,163,184,0.1)",
      borderColor: "rgba(148,163,184,0.15)",
    },
    statusBadgeSuspended: {
      backgroundColor: "rgba(239,68,68,0.1)",
      borderColor: "rgba(239,68,68,0.15)",
    },
    statusBadgeText: {
      fontSize: 8,
      fontWeight: "700",
    },
    cardInfoMetaGridSpec: {
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: structuralBorderColor,
      gap: 4,
    },
    metaRowItemInline: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      flex: 1,
    },
    metaRowItemText: {
      fontSize: 11,
      color: uiTheme.panelColors.dashboardTextColor,
      opacity: 0.6,
    },
    modalBackdropOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.6)",
      justifyContent: "center",
      alignItems: "center",
      padding: 24,
    },
    modalSelectionBoxSurface: {
      width: "100%",
      maxWidth: 290,
      backgroundColor: uiTheme.panelColors.dashboardCardBackground,
      borderWidth: 1,
      borderColor: structuralBorderColor,
      borderRadius: 12,
      padding: 14,
    },
    selectionModalTitleHeading: {
      fontSize: 13,
      fontWeight: "700",
      color: uiTheme.panelColors.dashboardTextColor,
      opacity: 0.4,
      marginBottom: 8,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    selectionOptionRowElement: {
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: structuralBorderColor,
    },
    activeSelectionOptionRowElement: {
      backgroundColor: "rgba(212,163,89,0.04)",
    },
    selectionOptionRowText: {
      fontSize: 13,
      color: uiTheme.panelColors.dashboardTextColor,
    },
    actionMenuRowItemOption: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      gap: 10,
      borderBottomWidth: 1,
      borderBottomColor: structuralBorderColor,
    },
    actionMenuRowItemOptionText: {
      fontSize: 13,
      color: uiTheme.panelColors.dashboardTextColor,
      fontWeight: "500",
    },
    deleteTargetHighlightCard: {
      backgroundColor: surfaceAlphaColor,
      borderWidth: 1,
      borderColor: structuralBorderColor,
      borderRadius: 8,
      padding: 10,
      marginBottom: 12,
    },
    fullscreenModalContainer: {
      flex: 1,
      backgroundColor: uiTheme.panelColors.dashboardCardBackground,
    },
    fullscreenModalHeaderTopBar: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: structuralBorderColor,
    },
    fullscreenModalMainTitleHeading: {
      fontSize: 18,
      fontWeight: "800",
      color: uiTheme.panelColors.dashboardTextColor,
    },
    fullscreenModalMainSubtitleCap: {
      fontSize: 11,
      color: uiTheme.panelColors.dashboardTextColor,
      opacity: 0.5,
      marginTop: 2,
    },
    fullscreenModalFormScrollBody: {
      padding: 16,
      paddingBottom: 40,
      gap: 14,
    },
    formFieldLayoutRowStack: {
      gap: 6,
    },
    formInputGroupFieldNameLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: uiTheme.panelColors.dashboardTextColor,
      opacity: 0.7,
    },
    formFieldHelperInfoCaptionText: {
      fontSize: 10,
      color: uiTheme.panelColors.dashboardTextColor,
      opacity: 0.4,
      marginTop: -2,
    },
    formTextInputWidgetContainer: {
      height: 38,
      borderWidth: 1,
      borderColor: structuralBorderColor,
      borderRadius: 8,
      paddingHorizontal: 12,
      fontSize: 13,
      color: uiTheme.panelColors.dashboardTextColor,
      backgroundColor: surfaceAlphaColor,
    },
    formTextareaInputWidgetContainer: {
      borderWidth: 1,
      borderColor: structuralBorderColor,
      borderRadius: 8,
      padding: 10,
      fontSize: 13,
      color: uiTheme.panelColors.dashboardTextColor,
      backgroundColor: surfaceAlphaColor,
    },
    formPickerInlineTriggerElement: {
      height: 38,
      borderWidth: 1,
      borderColor: structuralBorderColor,
      borderRadius: 8,
      justifyContent: "center",
      paddingHorizontal: 12,
      backgroundColor: surfaceAlphaColor,
    },
    sectionalDividerHeaderLine: {
      marginTop: 12,
      paddingBottom: 4,
      borderBottomWidth: 1,
      borderBottomColor: structuralBorderColor,
    },
    sectionalDividerHeaderTitle: {
      fontSize: 11,
      fontWeight: "700",
      textTransform: "uppercase",
      color: uiTheme.panelColors.dashboardTextColor,
      opacity: 0.4,
      letterSpacing: 0.5,
    },
    inlineActionRowMiniButton: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 2,
      paddingHorizontal: 6,
    },
    inlineActionRowMiniButtonText: {
      fontSize: 11,
      fontWeight: "600",
      color: uiTheme.customColors.primary,
    },
    dynamicRowBlockContainer: {
      flexDirection: "row",
      gap: 8,
      alignItems: "center",
    },
    formDualColumnGridInlineInputRow: {
      flexDirection: "row",
      gap: 12,
    },
    imageUploaderComponentFrame: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    uploadedImagePreviewCanvas: {
      width: 50,
      height: 50,
      borderRadius: 8,
      position: "relative",
      borderWidth: 1,
      borderColor: structuralBorderColor,
    },
    uploadedCoreImageElement: {
      width: "100%",
      height: "100%",
      borderRadius: 8,
    },
    removeImageAbsoluteBadge: {
      position: "absolute",
      top: -4,
      right: -4,
      backgroundColor: "#ef4444",
      width: 16,
      height: 16,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
    },
    mediaActionUploadButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      height: 38,
      paddingHorizontal: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: "rgba(212,163,89,0.2)",
      backgroundColor: surfaceAlphaColor,
      gap: 6,
    },
    mediaActionUploadButtonText: {
      fontSize: 12,
      fontWeight: "600",
      color: uiTheme.customColors.primary,
    },
    imagePickerOverlayContainer: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.6)",
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: 24,
    },
    imagePickerModalSurface: {
      width: "92%",
      height: "82%",
      backgroundColor: uiTheme.panelColors.dashboardCardBackground,
      borderWidth: 1,
      borderColor: structuralBorderColor,
      borderRadius: 12,
      overflow: "hidden",
    },
    imagePickerModalHeaderRowContainer: {
      flexDirection: "row",
      padding: 14,
      borderBottomWidth: 1,
      borderBottomColor: structuralBorderColor,
      alignItems: "flex-start",
    },
    imagePickerMainTitleHeading: {
      fontSize: 15,
      fontWeight: "800",
      color: uiTheme.panelColors.dashboardTextColor,
    },
    imagePickerMainSubtitleCap: {
      fontSize: 11,
      color: uiTheme.panelColors.dashboardTextColor,
      opacity: 0.5,
      marginTop: 2,
    },
    imagePickerDualColumnWorkspaceRowLayout: {
      flex: 1,
      flexDirection: "row",
    },
    imagePickerFolderSidebarLayout: {
      width: 120,
      borderRightWidth: 1,
      borderRightColor: structuralBorderColor,
      backgroundColor: surfaceAlphaColor,
    },
    imagePickerFolderNavigationRowAnchor: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 8,
      paddingHorizontal: 10,
      gap: 6,
    },
    imagePickerFolderNavigationActiveAnchor: {
      backgroundColor: "rgba(212,163,89,0.08)",
    },
    imagePickerFolderNavigationItemText: {
      fontSize: 11,
      color: uiTheme.panelColors.dashboardTextColor,
      flex: 1,
    },
    imagePickerCoreContentWorkspaceView: {
      flex: 1,
      padding: 10,
    },
    imagePickerWorkspaceFilterInputFrame: {
      height: 34,
      position: "relative",
      marginBottom: 10,
    },
    imagePickerWorkspaceSearchIconAbsolute: {
      position: "absolute",
      left: 8,
      top: 10,
      zIndex: 2,
    },
    imagePickerWorkspaceTextInputWidget: {
      height: "100%",
      borderWidth: 1,
      borderColor: structuralBorderColor,
      borderRadius: 6,
      backgroundColor: uiTheme.panelColors.dashboardBackground,
      paddingLeft: 26,
      paddingRight: 8,
      fontSize: 11,
      color: uiTheme.panelColors.dashboardTextColor,
    },
    imagePickerWorkspaceStatusCenterDeck: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    imagePickerWorkspaceWarningEmptyStateText: {
      fontSize: 12,
      color: uiTheme.panelColors.dashboardTextColor,
      opacity: 0.5,
    },
    imagePickerAssetMatrixGridDisplayLayout: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      paddingBottom: 16,
    },
    imagePickerGridAssetCardCellFrame: {
      width: "31%",
      aspectRatio: 1,
      borderWidth: 2,
      borderColor: "transparent",
      borderRadius: 8,
      position: "relative",
      overflow: "hidden",
    },
    imagePickerGridAssetCardActiveCellFrame: {
      borderColor: uiTheme.customColors.primary,
    },
    imagePickerAssetSelectionOverlayCheckBadge: {
      position: "absolute",
      inset: 0,
      backgroundColor: "rgba(212,163,89,0.2)",
      justifyContent: "center",
      alignItems: "center",
    },
    imagePickerAssetCaptionMetaLabelWell: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: "rgba(0,0,0,0.6)",
      paddingVertical: 2,
      paddingHorizontal: 4,
    },
    imagePickerAssetCaptionMetaLabelText: {
      fontSize: 8,
      color: "#ffffff",
      textAlign: "center",
    },
    imagePickerPaginationControlBannerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 16,
      paddingVertical: 6,
      borderTopWidth: 1,
      borderTopColor: structuralBorderColor,
    },
    imagePickerPaginationArrowInlineButton: {
      padding: 4,
    },
    imagePickerPaginationMetricStatusCounterLabelText: {
      fontSize: 11,
      fontWeight: "700",
      color: uiTheme.panelColors.dashboardTextColor,
    },
    imagePickerModalFooterActionButtonBar: {
      flexDirection: "row",
      justifyContent: "flex-end",
      padding: 10,
      borderTopWidth: 1,
      borderTopColor: structuralBorderColor,
      gap: 8,
    },
    viewSheetIdentityPlateRow: {
      flexDirection: "row",
      gap: 14,
      alignItems: "center",
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: structuralBorderColor,
    },
    avatarFallbackWellLarge: {
      width: 48,
      height: 48,
      borderRadius: 10,
      backgroundColor: "#1e293b",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      borderWidth: 1,
      borderColor: structuralBorderColor,
    },
    viewSheetPrimaryNameText: {
      fontSize: 16,
      fontWeight: "800",
      color: uiTheme.panelColors.dashboardTextColor,
    },
    viewSheetSubCodeText: {
      fontSize: 12,
      color: uiTheme.panelColors.dashboardTextColor,
      opacity: 0.4,
      marginTop: 1,
    },
    viewSheetRecordRowBlock: {
      gap: 4,
      marginTop: 4,
    },
    viewSheetRecordLabel: {
      fontSize: 11,
      fontWeight: "700",
      color: uiTheme.panelColors.dashboardTextColor,
      opacity: 0.4,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 2,
    },
    viewSheetDescriptionTextWell: {
      padding: 10,
      borderRadius: 8,
      backgroundColor: surfaceAlphaColor,
      borderWidth: 1,
      borderColor: structuralBorderColor,
    },
    viewSheetDescriptionContentText: {
      fontSize: 12,
      color: uiTheme.panelColors.dashboardTextColor,
      lineHeight: 16,
      opacity: 0.8,
    },
    viewSheetDetailsGridContainer: {
      gap: 6,
    },
    viewSheetGridItemElement: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 2,
    },
    viewSheetGridItemValueText: {
      fontSize: 12,
      color: uiTheme.panelColors.dashboardTextColor,
      opacity: 0.8,
    },
    complianceDataMatrixGridContainer: {
      borderWidth: 1,
      borderColor: structuralBorderColor,
      borderRadius: 10,
      overflow: "hidden",
      backgroundColor: surfaceAlphaColor,
    },
    complianceDataMatrixGridCell: {
      padding: 10,
      borderBottomWidth: 1,
      borderBottomColor: structuralBorderColor,
    },
    complianceMatrixCellLabel: {
      fontSize: 9,
      color: uiTheme.panelColors.dashboardTextColor,
      opacity: 0.4,
      textTransform: "uppercase",
    },
    complianceMatrixCellValue: {
      fontSize: 13,
      fontWeight: "600",
      color: uiTheme.panelColors.dashboardTextColor,
      marginTop: 2,
    },
    complianceMatrixHighlightDueBannerCell: {
      padding: 10,
      backgroundColor: "rgba(212,163,89,0.05)",
    },
    complianceHighlightDueLabel: {
      fontSize: 9,
      fontWeight: "700",
      color: uiTheme.customColors.primary,
      textTransform: "uppercase",
    },
    complianceHighlightDueValue: {
      fontSize: 13,
      fontWeight: "800",
      color: uiTheme.customColors.primary,
      marginTop: 2,
    },
    fullscreenModalFooterButtonBar: {
      flexDirection: "row",
      justifyContent: "flex-end",
      padding: 12,
      borderTopWidth: 1,
      borderTopColor: structuralBorderColor,
      backgroundColor: uiTheme.panelColors.dashboardBackground,
      gap: 10,
    },
    formDismissActionModalButton: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: structuralBorderColor,
      justifyContent: "center",
      alignItems: "center",
    },
    formSubmitActionModalButton: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 6,
      justifyContent: "center",
      alignItems: "center",
      minWidth: 100,
    },
    formSubmitActionModalButtonText: {
      fontSize: 12,
      fontWeight: "700",
      color: isLightTheme ? "#ffffff" : "#09090b",
    },
  });
};