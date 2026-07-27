import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  Alert,
  Linking,
  useWindowDimensions,
} from "react-native";
import {
  Search,
  MapPin,
  Phone,
  Mail,
  Building,
  CheckCircle,
  XCircle,
  Users,
  Contact,
  ChevronDown,
  X,
  Check,
  PhoneCall,
} from "lucide-react-native";

import { apiFetch } from "@/lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";
import { s } from "@/util/styles";

interface Vendor {
  _id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
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

interface SelectorOption {
  label: string;
  value: string;
}

function buildColors(uiTheme: any) {
  const isDark = uiTheme.theme !== "crystal-white";
  return {
    background: isDark ? "#090d13" : "#f8fafc",
    surface: isDark ? "#0d1117" : "#ffffff",
    surfaceMuted: isDark ? "#161b22" : "#f1f5f9",
    border: isDark ? "#21262d" : "#e2e8f0",
    text: isDark ? "#c9d1d9" : "#0f172a",
    textBold: isDark ? "#f0f6fc" : "#020617",
    textMuted: isDark ? "#8b949e" : "#64748b",
    primary: "#0ea5e9",
    success: "#10b981",
    warning: "#f59e0b",
    danger: "#ef4444",
    info: "#3b82f6",
  };
}

function createStyles(
  c: ReturnType<typeof buildColors>,
  wp: (percentage: number) => number,
  hp: (percentage: number) => number,
  isTablet: boolean,
  isSmallScreen: boolean,
  screenWidth: number
) {
  const horizontalPadding = isSmallScreen ? wp(3) : isTablet ? wp(6) : wp(4.2);

  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    scrollContainer: { paddingHorizontal: horizontalPadding, paddingTop: hp(2), paddingBottom: hp(5) },
    headerBlock: { marginBottom: hp(2.5) },
    titleRow: { flexDirection: "row", alignItems: "center", gap: wp(2) },
    titleText: { fontSize: isTablet ? 28 : 24, fontWeight: "800", color: c.textBold, letterSpacing: -0.5 },
    subtitleText: { fontSize: isTablet ? 15 : 14, color: c.textMuted, marginTop: hp(0.5) },
    statsContainer: { flexDirection: isSmallScreen ? "column" : "row", gap: wp(3), marginBottom: hp(2.5) },
    statCard: { flex: 1, backgroundColor: c.surface, borderRadius: wp(3), padding: wp(3.5), borderWidth: 1, borderColor: c.border },
    statHeader: { flexDirection: "row", alignItems: "center", gap: wp(1.5), marginBottom: hp(1) },
    statLabel: { fontSize: isTablet ? 13 : 12, fontWeight: "600", color: c.textMuted },
    statValue: { fontSize: isTablet ? 28 : 24, fontWeight: "700" },
    filterCard: { backgroundColor: c.surface, borderRadius: wp(3), padding: wp(3), borderWidth: 1, borderColor: c.border, marginBottom: hp(2.5), gap: hp(1.2) },
    searchWrapper: { flexDirection: "row", alignItems: "center", backgroundColor: c.background, paddingHorizontal: wp(3), borderRadius: wp(2), borderWidth: 1, borderColor: c.border, height: hp(5.5) },
    searchIcon: { marginRight: wp(2) },
    searchInput: { flex: 1, fontSize: isTablet ? 15 : 14, color: c.text, padding: 0 },
    selectorsRow: { flexDirection: isSmallScreen ? "column" : "row", gap: wp(2.5) },
    pickerFilterBtn: { flex: 1, flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: c.background, borderWidth: 1, borderColor: c.border, borderRadius: wp(2), paddingHorizontal: wp(3), height: hp(5.5) },
    pickerFilterText: { fontSize: isTablet ? 14 : 13, color: c.text },
    loaderBox: { paddingVertical: hp(8), alignItems: "center", justifyContent: "center" },
    gridContainer: { flexDirection: isTablet ? "row" : "column", flexWrap: "wrap", gap: wp(3) },
    vendorCard: { width: isTablet ? "48.5%" : "100%", backgroundColor: c.surface, borderRadius: wp(3.5), padding: wp(4), borderWidth: 1, borderColor: c.border },
    cardMainHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: hp(1.8) },
    cardMetaRow: { flexDirection: "row", alignItems: "center", gap: wp(3), flex: 1, paddingRight: wp(2) },
    avatarPhotoFrame: { width: isTablet ? 48 : 40, height: isTablet ? 48 : 40, borderRadius: isTablet ? 24 : 20, backgroundColor: c.primary + "15", alignItems: "center", justifyContent: "center" },
    cardTitleBlock: { flex: 1 },
    vendorNameText: { fontSize: isTablet ? 18 : 16, fontWeight: "700", color: c.textBold },
    serviceTypeText: { fontSize: isTablet ? 14 : 13, color: c.textMuted, marginTop: 1 },
    badgeItem: { paddingHorizontal: wp(2), paddingVertical: hp(0.5), borderRadius: wp(1.5), flexDirection: "row", alignItems: "center", gap: wp(1), borderWidth: 1 },
    badgeItemText: { fontSize: isTablet ? 12 : 11, fontWeight: "700" },
    detailsBlock: { gap: hp(1.2) },
    infoRow: { flexDirection: "row", alignItems: "center", gap: wp(2.5) },
    infoText: { fontSize: isTablet ? 15 : 14, color: c.text, flex: 1 },
    notesDivider: { paddingTop: hp(1.2), borderTopWidth: 1, borderTopColor: c.border + "50", marginTop: hp(0.5) },
    notesText: { fontSize: isTablet ? 14 : 13, color: c.textMuted, lineHeight: 18 },
    
    cardFooterRow: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", marginTop: hp(1.5), paddingTop: hp(1.2), borderTopWidth: 1, borderTopColor: c.border + "40" },
    quickCallBtn: { flexDirection: "row", alignItems: "center", gap: wp(1.5), backgroundColor: c.primary + "15", paddingHorizontal: wp(3), paddingVertical: hp(0.8), borderRadius: wp(2) },
    quickCallBtnText: { color: c.primary, fontWeight: "700", fontSize: isTablet ? 13 : 12 },

    emptyBox: { width: "100%", backgroundColor: c.surface, padding: wp(8), borderRadius: wp(3.5), alignItems: "center", borderWidth: 1, borderColor: c.border },
    emptyTitle: { fontSize: isTablet ? 18 : 16, fontWeight: "700", color: c.textBold, marginTop: hp(1.5), marginBottom: hp(0.5) },
    emptySubtitle: { fontSize: isTablet ? 14 : 13, color: c.textMuted, textAlign: "center" },

    /* Modal Layout Styles */
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: wp(5) },
    dropdownContentCard: { width: "100%", maxWidth: isTablet ? 400 : 320, backgroundColor: c.surface, borderRadius: wp(4), borderWidth: 1, borderColor: c.border, overflow: "hidden", maxHeight: "75%" },
    dropdownHeader: { paddingHorizontal: wp(4), paddingVertical: hp(1.8), borderBottomWidth: 1, borderBottomColor: c.border, flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: c.surfaceMuted },
    dropdownHeaderText: { fontSize: isTablet ? 16 : 15, fontWeight: "700", color: c.textBold },
    dropdownScrollView: { paddingVertical: hp(0.8) },
    dropdownItemRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: wp(4), paddingVertical: hp(1.5) },
    dropdownItemText: { fontSize: isTablet ? 15 : 14, color: c.text, flex: 1 },
    dropdownItemTextActive: { color: c.primary, fontWeight: "600" },

    modalContainer: { flex: 1, backgroundColor: c.background },
    modalHeaderBlock: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: wp(4), borderBottomWidth: 1, borderColor: c.border, backgroundColor: c.surface },
    modalTitleText: { fontSize: isTablet ? 20 : 18, fontWeight: "700", color: c.textBold },
    modalScrollBody: {
      padding: wp(4),
      gap: hp(2),
      maxWidth: isTablet ? 600 : undefined,
      alignSelf: isTablet ? "center" : undefined,
      width: "100%",
    },
    inspectDetailBlock: { gap: hp(2) },
    actionButtonsRow: { flexDirection: "row", gap: wp(3), marginTop: hp(1) },
    callPrimaryBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: wp(2), backgroundColor: c.primary, paddingVertical: hp(1.6), borderRadius: wp(2.5) },
    callPrimaryBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: isTablet ? 15 : 14 },
    emailSecondaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: wp(2), backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, paddingHorizontal: wp(4), paddingVertical: hp(1.6), borderRadius: wp(2.5) },
    emailSecondaryBtnText: { color: c.text, fontWeight: "600", fontSize: isTablet ? 15 : 14 },
    
    infoCardSection: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: wp(3), padding: wp(4), gap: hp(1.8) },
    inspectLabel: { fontSize: isTablet ? 12 : 11, fontWeight: "600", color: c.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
    inspectValue: { fontSize: isTablet ? 15 : 14, color: c.textBold, fontWeight: "500" },
    notesBlockModal: { paddingTop: hp(1.5), borderTopWidth: 1, borderTopColor: c.border + "50" },
    notesTextModal: { fontSize: isTablet ? 14 : 13, color: c.text, lineHeight: 20 },
    footerActionsRow: { flexDirection: "row", justifyContent: "flex-end", gap: wp(2.5), marginTop: hp(1), marginBottom: hp(3) },
    formCancelBtn: { borderWidth: 1, borderColor: c.border, paddingHorizontal: wp(5), paddingVertical: hp(1.5), borderRadius: wp(2), alignItems: "center", justifyContent: "center", backgroundColor: c.surface, width: "100%" },
    formCancelBtnText: { color: c.text, fontWeight: "600", fontSize: isTablet ? 15 : 14 },
  });
}

export default function Vendors() {
  const { uiTheme } = useTheme();
  const { width, height } = useWindowDimensions();
  const wp = useCallback((percentage: number) => (width * percentage) / 100, [width]);
  const hp = useCallback((percentage: number) => (height * percentage) / 100, [height]);
  const isTablet = width >= 768;
  const isSmallScreen = width < 375;

  const colors = useMemo(() => buildColors(uiTheme), [uiTheme]);
  const styles = useMemo(
    () => createStyles(colors, wp, hp, isTablet, isSmallScreen, width),
    [colors, wp, hp, isTablet, isSmallScreen, width]
  );

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [customPickerVisible, setCustomPickerVisible] = useState(false);
  const [customPickerTitle, setCustomPickerTitle] = useState("");
  const [customPickerOptions, setCustomPickerOptions] = useState<SelectorOption[]>([]);
  const [customPickerValue, setCustomPickerValue] = useState("");
  const [customPickerCallback, setCustomPickerCallback] = useState<(val: string) => void>(() => {});

  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      try {
        const [vendorsRes, locationsRes] = await Promise.all([
          apiFetch<{ items: Vendor[] }>("/api/vendors"),
          apiFetch<{ items: Location[] }>("/api/locations"),
        ]);
        if (mounted) {
          setVendors(vendorsRes.items || []);
          setLocations(locationsRes.items || []);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    fetchData();
    return () => {
      mounted = false;
    };
  }, []);

  const handleCallVendor = (phone: string) => {
    if (!phone) {
      Alert.alert("No Phone Number", "This vendor does not have a phone number registered.");
      return;
    }
    const cleanedPhone = phone.replace(/[^0-9+]/g, "");
    Linking.openURL(`tel:${cleanedPhone}`).catch(() => {
      Alert.alert("Error", "Unable to open dialer on this device.");
    });
  };

  const handleEmailVendor = (email: string) => {
    if (!email) return;
    Linking.openURL(`mailto:${email}`).catch(() => {
      Alert.alert("Error", "Unable to open email client on this device.");
    });
  };

  const presentCustomPicker = useCallback((title: string, options: SelectorOption[], currentValue: string, onSelect: (val: string) => void) => {
    setCustomPickerTitle(title);
    setCustomPickerOptions(options);
    setCustomPickerValue(currentValue);
    setCustomPickerCallback(() => onSelect);
    setCustomPickerVisible(true);
  }, []);

  const filteredVendors = useMemo(() => {
    return vendors.filter((vendor) => {
      const matchesSearch =
        (vendor.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (vendor.phone || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (vendor.serviceType || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesLocation =
        locationFilter === "all" || vendor.location === locationFilter;
      const matchesStatus =
        statusFilter === "all" || vendor.status === statusFilter;
      return matchesSearch && matchesLocation && matchesStatus;
    });
  }, [vendors, searchQuery, locationFilter, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: vendors.length,
      approved: vendors.filter((v) => v.status === "approved").length,
      notApproved: vendors.filter((v) => v.status === "not-approved").length,
    };
  }, [vendors]);

  const locationPickerOptions = useMemo(() => {
    return [
      { label: "All Locations", value: "all" },
      ...locations.map((loc) => ({ label: loc.name, value: loc.name })),
    ];
  }, [locations]);

  const statusPickerOptions = useMemo(() => {
    return [
      { label: "All Status", value: "all" },
      { label: "Approved", value: "approved" },
      { label: "Not Approved", value: "not-approved" },
    ];
  }, []);

  return (
    <SafeAreaView style={s(styles.root)}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        <View style={styles.headerBlock}>
          <View style={styles.titleRow}>
            <Contact size={isTablet ? 28 : 24} color={colors.primary} />
            <Text style={styles.titleText}>Vendor Directory</Text>
          </View>
          <Text style={styles.subtitleText}>
            View approved and not-approved vendors by location
          </Text>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Users size={14} color={colors.textMuted} />
              <Text style={styles.statLabel}>Total Vendors</Text>
            </View>
            <Text style={[styles.statValue, { color: colors.textBold }]}>{stats.total}</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <CheckCircle size={14} color={colors.success} />
              <Text style={[styles.statLabel, { color: colors.success }]}>Approved</Text>
            </View>
            <Text style={[styles.statValue, { color: colors.success }]}>{stats.approved}</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <XCircle size={14} color={colors.danger} />
              <Text style={[styles.statLabel, { color: colors.danger }]}>Not Approved</Text>
            </View>
            <Text style={[styles.statValue, { color: colors.danger }]}>{stats.notApproved}</Text>
          </View>
        </View>

        <View style={styles.filterCard}>
          <View style={styles.searchWrapper}>
            <Search size={16} color={colors.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search vendors by name, phone..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <View style={styles.selectorsRow}>
            <TouchableOpacity
              style={styles.pickerFilterBtn}
              onPress={() => presentCustomPicker("Filter by location", locationPickerOptions, locationFilter, setLocationFilter)}
            >
              <Text style={styles.pickerFilterText} numberOfLines={1}>
                {locationFilter === "all" ? "All Locations" : locationFilter}
              </Text>
              <ChevronDown size={14} color={colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.pickerFilterBtn}
              onPress={() => presentCustomPicker("Filter by status", statusPickerOptions, statusFilter, setStatusFilter)}
            >
              <Text style={styles.pickerFilterText} numberOfLines={1}>
                {statusFilter === "all" ? "All Status" : statusFilter === "approved" ? "Approved" : "Not Approved"}
              </Text>
              <ChevronDown size={14} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <View style={styles.loaderBox}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : (
          <View style={styles.gridContainer}>
            {filteredVendors.map((vendor) => {
              const isApproved = vendor.status === "approved";
              return (
                <TouchableOpacity 
                  key={vendor._id} 
                  style={styles.vendorCard}
                  activeOpacity={0.7}
                  onPress={() => {
                    setSelectedVendor(vendor);
                    setIsDetailModalOpen(true);
                  }}
                >
                  <View style={styles.cardMainHeader}>
                    <View style={styles.cardMetaRow}>
                      <View style={styles.avatarPhotoFrame}>
                        <Contact size={isTablet ? 24 : 20} color={colors.primary} />
                      </View>
                      <View style={styles.cardTitleBlock}>
                        <Text style={styles.vendorNameText} numberOfLines={1}>{vendor.name}</Text>
                        <Text style={styles.serviceTypeText} numberOfLines={1}>{vendor.serviceType}</Text>
                      </View>
                    </View>

                    <View style={[
                      styles.badgeItem, 
                      { 
                        backgroundColor: isApproved ? "#e6f4ea" : "#fce8e6", 
                        borderColor: isApproved ? "#ceead6" : "#fad2cf" 
                      }
                    ]}>
                      {isApproved ? (
                        <CheckCircle size={12} color={colors.success} />
                      ) : (
                        <XCircle size={12} color={colors.danger} />
                      )}
                      <Text style={[
                        styles.badgeItemText, 
                        { color: isApproved ? colors.success : colors.danger }
                      ]}>
                        {isApproved ? "Approved" : "Not Approved"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailsBlock}>
                    <View style={styles.infoRow}>
                      <MapPin size={14} color={colors.textMuted} />
                      <Text style={styles.infoText} numberOfLines={1}>{vendor.location}</Text>
                    </View>

                    <View style={styles.infoRow}>
                      <Phone size={14} color={colors.textMuted} />
                      <Text style={styles.infoText} numberOfLines={1}>{vendor.phone}</Text>
                    </View>

                    {!!vendor.email && (
                      <View style={styles.infoRow}>
                        <Mail size={14} color={colors.textMuted} />
                        <Text style={styles.infoText} numberOfLines={1}>{vendor.email}</Text>
                      </View>
                    )}

                    {!!vendor.address && (
                      <View style={styles.infoRow}>
                        <Building size={14} color={colors.textMuted} />
                        <Text style={styles.infoText} numberOfLines={1}>{vendor.address}</Text>
                      </View>
                    )}

                    {!!vendor.notes && (
                      <View style={styles.notesDivider}>
                        <Text style={styles.notesText} numberOfLines={2}>{vendor.notes}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.cardFooterRow}>
                    <TouchableOpacity 
                      style={styles.quickCallBtn}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleCallVendor(vendor.phone);
                      }}
                    >
                      <PhoneCall size={13} color={colors.primary} />
                      <Text style={styles.quickCallBtnText}>Call Vendor</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })}

            {filteredVendors.length === 0 && (
              <View style={styles.emptyBox}>
                <Contact size={40} color={colors.textMuted} style={{ opacity: 0.5 }} />
                <Text style={styles.emptyTitle}>No vendors found</Text>
                <Text style={styles.emptySubtitle}>Try adjusting your filters</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Vendor Detail Modal */}
      <Modal visible={isDetailModalOpen} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeaderBlock}>
            <Text style={styles.modalTitleText}>Vendor Information</Text>
            <TouchableOpacity onPress={() => setIsDetailModalOpen(false)}>
              <X size={20} color={colors.textBold} />
            </TouchableOpacity>
          </View>

          {selectedVendor && (
            <ScrollView contentContainerStyle={styles.modalScrollBody} showsVerticalScrollIndicator={false}>
              <View style={styles.inspectDetailBlock}>
                <View style={{ alignItems: "center", marginVertical: hp(1) }}>
                  <View style={[styles.avatarPhotoFrame, { width: isTablet ? 64 : 52, height: isTablet ? 64 : 52, borderRadius: isTablet ? 32 : 26 }]}>
                    <Contact size={isTablet ? 32 : 26} color={colors.primary} />
                  </View>
                  <Text style={[styles.vendorNameText, { fontSize: isTablet ? 20 : 18, marginTop: hp(1.5) }]}>{selectedVendor.name}</Text>
                  <Text style={{ fontSize: isTablet ? 14 : 13, color: colors.textMuted, marginTop: hp(0.3) }}>{selectedVendor.serviceType}</Text>
                  
                  <View style={[
                    styles.badgeItem, 
                    { 
                      backgroundColor: selectedVendor.status === "approved" ? "#e6f4ea" : "#fce8e6", 
                      borderColor: selectedVendor.status === "approved" ? "#ceead6" : "#fad2cf",
                      marginTop: hp(1)
                    }
                  ]}>
                    {selectedVendor.status === "approved" ? (
                      <CheckCircle size={12} color={colors.success} />
                    ) : (
                      <XCircle size={12} color={colors.danger} />
                    )}
                    <Text style={[
                      styles.badgeItemText, 
                      { color: selectedVendor.status === "approved" ? colors.success : colors.danger }
                    ]}>
                      {selectedVendor.status === "approved" ? "Approved" : "Not Approved"}
                    </Text>
                  </View>
                </View>

                {/* Primary Action Buttons */}
                <View style={styles.actionButtonsRow}>
                  {!!selectedVendor.phone && (
                    <TouchableOpacity
                      style={styles.callPrimaryBtn}
                      onPress={() => handleCallVendor(selectedVendor.phone)}
                      activeOpacity={0.8}
                    >
                      <PhoneCall size={16} color="#FFFFFF" />
                      <Text style={styles.callPrimaryBtnText}>Call {selectedVendor.phone}</Text>
                    </TouchableOpacity>
                  )}

                  {!!selectedVendor.email && (
                    <TouchableOpacity
                      style={styles.emailSecondaryBtn}
                      onPress={() => handleEmailVendor(selectedVendor.email)}
                      activeOpacity={0.7}
                    >
                      <Mail size={16} color={colors.text} />
                      <Text style={styles.emailSecondaryBtnText}>Email</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Detail Information Card */}
                <View style={styles.infoCardSection}>
                  <View style={styles.infoRow}>
                    <MapPin size={16} color={colors.textMuted} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inspectLabel}>Location</Text>
                      <Text style={styles.inspectValue}>{selectedVendor.location || "—"}</Text>
                    </View>
                  </View>

                  <View style={styles.infoRow}>
                    <Phone size={16} color={colors.textMuted} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inspectLabel}>Phone Number</Text>
                      <Text style={styles.inspectValue}>{selectedVendor.phone || "—"}</Text>
                    </View>
                  </View>

                  {!!selectedVendor.email && (
                    <View style={styles.infoRow}>
                      <Mail size={16} color={colors.textMuted} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inspectLabel}>Email Address</Text>
                        <Text style={styles.inspectValue}>{selectedVendor.email}</Text>
                      </View>
                    </View>
                  )}

                  {!!selectedVendor.address && (
                    <View style={styles.infoRow}>
                      <Building size={16} color={colors.textMuted} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inspectLabel}>Street Address</Text>
                        <Text style={styles.inspectValue}>{selectedVendor.address}</Text>
                      </View>
                    </View>
                  )}

                  {!!selectedVendor.notes && (
                    <View style={styles.notesBlockModal}>
                      <Text style={styles.inspectLabel}>Notes</Text>
                      <Text style={styles.notesTextModal}>{selectedVendor.notes}</Text>
                    </View>
                  )}
                </View>

              </View>

              <View style={styles.footerActionsRow}>
                <TouchableOpacity style={styles.formCancelBtn} onPress={() => setIsDetailModalOpen(false)}>
                  <Text style={styles.formCancelBtnText}>Close</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* Filter Options Modal */}
      <Modal visible={customPickerVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.dropdownContentCard}>
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownHeaderText}>{customPickerTitle}</Text>
              <TouchableOpacity onPress={() => setCustomPickerVisible(false)} style={{ padding: 4 }}>
                <X size={18} color={colors.textBold} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.dropdownScrollView} showsVerticalScrollIndicator={false}>
              {customPickerOptions.map((opt) => {
                const isActive = customPickerValue === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={styles.dropdownItemRow}
                    onPress={() => {
                      customPickerCallback(opt.value);
                      setCustomPickerVisible(false);
                    }}
                  >
                    <Text style={[styles.dropdownItemText, isActive && styles.dropdownItemTextActive]}>
                      {opt.label}
                    </Text>
                    {isActive && <Check size={16} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}