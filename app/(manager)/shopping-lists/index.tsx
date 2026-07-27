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
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  Filter,
  ShoppingCart,
  CheckCircle2,
  Store,
  MapPin,
  User,
  Package,
  X,
  Edit2,
  Trash2,
  Check,
  ChevronDown,
} from "lucide-react-native";
import { format } from "date-fns";
import { apiFetch } from "@/lib/admin/apiClient";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { s } from "@/util/styles";

interface ShoppingList {
  id: string;
  _id?: string;
  name: string;
  companyId?: { id?: string; _id?: string; name: string } | string;
  locationId?: { id?: string; _id?: string; name: string } | string;
  projectId?: { id?: string; _id?: string; name: string } | string;
  assignedEmployeeId?: { id?: string; _id?: string; name: string; username: string } | string;
  vendors: { id?: string; _id?: string; name: string }[];
  notes: string;
  status: "open" | "completed" | "archived";
  createdAt: string;
}

interface ShoppingListItem {
  id: string;
  _id?: string;
  shoppingListId: string;
  name: string;
  quantity: string;
  vendorId?: { id?: string; _id?: string; name: string };
  category: string;
  priority: "low" | "medium" | "high";
  notes: string;
  isPurchased: boolean;
  purchasedAt?: string;
  aisle: string;
}

interface MinimalItem {
  id?: string;
  _id?: string;
  name?: string;
  username?: string;
  status?: string;
}

interface PickerConfig {
  visible: boolean;
  title: string;
  options: MinimalItem[];
  selectedValue: string;
  onSelect: (id: string) => void;
}

function buildColors(uiTheme: any) {
  const isDark = uiTheme.theme !== "crystal-white";
  return {
    background:      uiTheme.panelColors?.dashboardBackground     || (isDark ? "#0d1117" : "#ffffff"),
    cardBg:          uiTheme.panelColors?.dashboardCardBackground || (isDark ? "#161b22" : "#f8fafc"),
    panelHeader:     uiTheme.panelColors?.dashboardCardBackground || (isDark ? "#161b22" : "#f1f5f9"),
    text:            uiTheme.panelColors?.dashboardTextColor      || (isDark ? "#ffffff" : "#000000"),
    textSecondary:   isDark ? "#94a3b8" : "#475569",
    border:          isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)",
    primary:         uiTheme.customColors?.primary                || "#0072ff",
    accent:          "#00c6ff",
    success:         "#10b981",
    danger:          "#ef4444",
    warning:         "#f59e0b",
    overlay:         "rgba(0, 0, 0, 0.6)",
    tabBg:           isDark ? "#161b22" : "#f1f5f9",
    tabActive:       isDark ? "#0d1117" : "#ffffff",
    itemSelectedBg:  isDark ? "rgba(0, 198, 255, 0.08)" : "rgba(0, 198, 255, 0.15)",
  };
}

function createStyles(
  colors: ReturnType<typeof buildColors>,
  wp: (percentage: number) => number,
  hp: (percentage: number) => number,
  isTablet: boolean,
  isSmallScreen: boolean
) {
  const horizontalPadding = isSmallScreen ? wp(3) : isTablet ? wp(6) : wp(4.2);

  return StyleSheet.create({
    rootContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    responsiveContentWrapper: {
      flex: 1,
      width: "100%",
      maxWidth: 1024,
      alignSelf: "center",
    },
    scrollPadding: {
      paddingHorizontal: horizontalPadding,
      paddingTop: hp(2),
      paddingBottom: hp(8),
    },
    headerBlock: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      flexWrap: "wrap",
      gap: wp(3),
      marginBottom: hp(2.5),
    },
    mainTitle: {
      fontSize: isSmallScreen ? wp(5) : isTablet ? wp(5.5) : wp(6),
      fontWeight: "700",
      color: colors.text,
      letterSpacing: -0.5,
    },
    subTitle: {
      fontSize: isSmallScreen ? wp(3) : wp(3.3),
      color: colors.textSecondary,
      marginTop: hp(0.5),
    },
    primaryActionButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.primary,
      paddingVertical: hp(1.2),
      paddingHorizontal: wp(4),
      borderRadius: wp(2),
    },
    primaryActionText: {
      color: "#ffffff",
      fontSize: wp(3.3),
      fontWeight: "600",
    },
    filterControlRow: {
      flexDirection: "column",
      gap: hp(1.5),
      marginBottom: hp(2.5),
    },
    tabTrack: {
      flexDirection: "row",
      backgroundColor: colors.tabBg,
      padding: wp(1),
      borderRadius: wp(2),
      gap: wp(1),
    },
    tabButton: {
      flex: 1,
      paddingVertical: hp(1),
      alignItems: "center",
      borderRadius: wp(1.5),
    },
    activeTabButton: {
      backgroundColor: colors.tabActive,
    },
    tabButtonText: {
      fontSize: wp(3.3),
      color: colors.textSecondary,
      fontWeight: "500",
    },
    activeTabButtonText: {
      color: colors.accent,
      fontWeight: "700",
    },
    searchWrapperInput: {
      position: "relative",
      justifyContent: "center",
    },
    searchIconLayout: {
      position: "absolute",
      left: wp(3),
      zIndex: 5,
    },
    textInputBox: {
      height: hp(5.2),
      backgroundColor: colors.cardBg,
      borderRadius: wp(2),
      borderWidth: 1,
      borderColor: colors.border,
      paddingLeft: wp(9.5),
      paddingRight: wp(4),
      color: colors.text,
      fontSize: wp(3.5),
    },
    loaderCenterBox: {
      paddingVertical: hp(7),
      alignItems: "center",
    },
    listCardGrid: {
      flexDirection: "column",
      gap: hp(1.5),
    },
    listCardGridTwoCol: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
    },
    procureCard: {
      backgroundColor: colors.cardBg,
      borderRadius: wp(3),
      borderWidth: 1,
      borderColor: colors.border,
      padding: wp(4),
      position: "relative",
      width: "100%",
    },
    procureCardHalfWidth: {
      width: isTablet ? "48.5%" : "100%",
    },
    cardHeaderFlex: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: wp(2.5),
    },
    cardInfoIdentity: {
      flexDirection: "row",
      gap: wp(3),
      flex: 1,
      alignItems: "center",
    },
    iconContainerBox: {
      width: wp(9),
      height: wp(9),
      borderRadius: wp(2),
      backgroundColor: "rgba(0,198,255,0.08)",
      alignItems: "center",
      justifyContent: "center",
    },
    cardMainHeading: {
      fontSize: wp(3.8),
      fontWeight: "600",
      color: colors.text,
    },
    cardMetaTimestamp: {
      fontSize: wp(2.8),
      color: colors.textSecondary,
      marginTop: hp(0.25),
    },
    statusBadgeFrame: {
      paddingHorizontal: wp(2),
      paddingVertical: hp(0.4),
      borderRadius: wp(1.5),
    },
    statusBadgeText: {
      fontSize: wp(2.5),
      fontWeight: "700",
    },
    badgeOpen: {
      backgroundColor: "rgba(16,185,129,0.1)",
    },
    textOpen: {
      color: colors.success,
    },
    badgeCompleted: {
      backgroundColor: "rgba(59,130,246,0.1)",
    },
    textCompleted: {
      color: colors.primary,
    },
    badgeArchived: {
      backgroundColor: "rgba(100,116,139,0.1)",
    },
    textArchived: {
      color: colors.textSecondary,
    },
    cardSpecsColumn: {
      gap: hp(0.75),
      marginTop: hp(1.8),
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: hp(1.5),
    },
    specInlineRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: wp(2),
    },
    specLineText: {
      fontSize: wp(3),
      color: colors.textSecondary,
    },
    adminActionFloatingRow: {
      flexDirection: "row",
      gap: wp(1),
      position: "absolute",
      bottom: hp(1.5),
      right: wp(3),
    },
    utilityMiniButton: {
      padding: wp(1.5),
      borderRadius: wp(1.5),
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    dangerMiniButton: {
      backgroundColor: "rgba(239,68,68,0.1)",
    },
    blankFallbackStateContainer: {
      paddingVertical: hp(7),
      alignItems: "center",
      width: "100%",
      justifyContent: "center",
    },
    blankIconRing: {
      width: wp(16),
      height: wp(16),
      borderRadius: wp(8),
      backgroundColor: colors.cardBg,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: hp(1.5),
    },
    blankStateHeading: {
      fontSize: wp(4),
      fontWeight: "600",
      color: colors.text,
    },
    blankStateSubtext: {
      fontSize: wp(3),
      color: colors.textSecondary,
      textAlign: "center",
      marginTop: hp(0.5),
      paddingHorizontal: wp(8),
    },
    modalBackgroundStructure: {
      flex: 1,
      backgroundColor: colors.background,
    },
    sheetHeaderBorder: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: wp(4),
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.panelHeader,
    },
    sheetMainHeading: {
      fontSize: wp(4.5),
      fontWeight: "700",
      color: colors.text,
    },
    modalBodyScroller: {
      flex: 1,
      padding: wp(4),
    },
    formRowSpace: {
      flexDirection: "column",
      gap: hp(0.75),
      marginBottom: hp(2),
    },
    nativeLabelElement: {
      fontSize: wp(3),
      color: colors.textSecondary,
      fontWeight: "600",
      textTransform: "uppercase",
    },
    modalFormInputBox: {
      height: hp(5.2),
      backgroundColor: colors.cardBg,
      borderRadius: wp(2),
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: wp(3),
      color: colors.text,
      fontSize: wp(3.5),
    },
    nativeCustomSelectTrigger: {
      height: hp(5.2),
      backgroundColor: colors.cardBg,
      borderRadius: wp(2),
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: wp(3),
    },
    nativeCustomSelectValueText: {
      color: colors.text,
      fontSize: wp(3.3),
    },
    sheetFooterBorder: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: wp(2.5),
      padding: wp(4),
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.panelHeader,
    },
    cancelActionBtn: {
      paddingVertical: hp(1.2),
      paddingHorizontal: wp(4),
      borderRadius: wp(2),
    },
    cancelActionBtnText: {
      color: colors.textSecondary,
      fontSize: wp(3.3),
      fontWeight: "500",
    },
    confirmActionBtn: {
      backgroundColor: colors.primary,
      paddingVertical: hp(1.2),
      paddingHorizontal: wp(4),
      borderRadius: wp(2),
    },
    confirmActionBtnText: {
      color: "#ffffff",
      fontSize: wp(3.3),
      fontWeight: "600",
    },
    adminStatusRibbonControl: {
      flexDirection: "column",
      gap: hp(1),
      padding: wp(3),
      backgroundColor: colors.panelHeader,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    ribbonSectionText: {
      fontSize: wp(2.8),
      color: colors.textSecondary,
      fontWeight: "600",
    },
    ribbonBadgeButton: {
      paddingHorizontal: wp(2.5),
      paddingVertical: hp(0.5),
      borderRadius: wp(1),
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    ribbonBadgeActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    ribbonBadgeText: {
      fontSize: wp(2.5),
      color: "#ffffff",
      fontWeight: "700",
    },
    detailFilterActionToolbar: {
      paddingVertical: hp(1.2),
      paddingHorizontal: wp(4),
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    chipsFilter: {
      paddingHorizontal: wp(3),
      paddingVertical: hp(0.75),
      borderRadius: wp(4),
      backgroundColor: colors.cardBg,
      marginRight: wp(2),
    },
    chipsActive: {
      backgroundColor: colors.accent,
    },
    chipsText: {
      color: "#ffffff",
      fontSize: wp(3),
      fontWeight: "500",
    },
    utilityActionRowAlignment: {
      flexDirection: "row",
      gap: wp(3),
      paddingHorizontal: wp(4),
      paddingVertical: hp(1),
    },
    inlineFilterButtonRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: wp(1.5),
    },
    inlineFilterActive: {
      opacity: 1,
    },
    inlineFilterButtonText: {
      fontSize: wp(3),
      color: colors.textSecondary,
      fontWeight: "500",
    },
    procureItemRowLayout: {
      flexDirection: "row",
      alignItems: "center",
      padding: wp(3),
      backgroundColor: colors.cardBg,
      borderRadius: wp(2),
      marginBottom: hp(1),
      borderWidth: 1,
      borderColor: colors.border,
    },
    procureItemCompletedOpacity: {
      opacity: 0.5,
    },
    itemCheckboxMarker: {
      width: wp(5),
      height: wp(5),
      borderRadius: wp(1),
      borderWidth: 2,
      borderColor: colors.textSecondary,
      alignItems: "center",
      justifyContent: "center",
    },
    itemCheckboxChecked: {
      backgroundColor: colors.success,
      borderColor: colors.success,
    },
    itemNameTitle: {
      fontSize: wp(3.5),
      fontWeight: "600",
      color: colors.text,
    },
    itemNameCompletedLineThrough: {
      textDecorationLine: "line-through",
      color: colors.textSecondary,
    },
    quantityBadgeMarker: {
      paddingHorizontal: wp(1.5),
      paddingVertical: hp(0.2),
      backgroundColor: colors.background,
      borderRadius: wp(1),
    },
    quantityBadgeText: {
      fontSize: wp(2.5),
      color: colors.textSecondary,
    },
    urgentPriorityBadge: {
      paddingHorizontal: wp(1.5),
      paddingVertical: hp(0.2),
      backgroundColor: "rgba(239,68,68,0.1)",
      borderRadius: wp(1),
    },
    urgentPriorityText: {
      fontSize: wp(2.3),
      color: colors.danger,
      fontWeight: "700",
    },
    itemMetaRow: {
      marginTop: hp(0.5),
    },
    itemMetaLabelInline: {
      fontSize: wp(2.8),
      color: colors.textSecondary,
    },
    floatingActionAddBtn: {
      position: "absolute",
      bottom: hp(3),
      right: wp(5),
      backgroundColor: colors.primary,
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: hp(1.5),
      paddingHorizontal: wp(5),
      borderRadius: wp(6),
      elevation: 5,
      shadowColor: colors.primary,
      shadowOpacity: 0.3,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 6,
    },
    floatingActionAddBtnText: {
      color: "#ffffff",
      fontSize: wp(3.5),
      fontWeight: "700",
    },
    modalOverlayMask: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: "center",
      alignItems: "center",
    },
    pickerOptionsContainer: {
      width: isTablet ? wp(50) : wp(88),
      maxWidth: 480,
      backgroundColor: colors.background,
      borderRadius: wp(3.5),
      borderWidth: 1,
      borderColor: colors.border,
      maxHeight: "65%",
      overflow: "hidden",
    },
    pickerOptionItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: hp(1.5),
      paddingHorizontal: wp(4),
      borderBottomWidth: 1,
      borderColor: colors.border,
    },
    pickerOptionItemText: {
      fontSize: wp(3.5),
      color: colors.text,
      fontWeight: "500",
    },
  });
}

export default function ShoppingLists() {
  const { width, height } = useWindowDimensions();
  const isTablet = width >= 768;
  const isSmallScreen = width < 360;

  const wp = useMemo(() => (p: number) => (width * p) / 100, [width]);
  const hp = useMemo(() => (p: number) => (height * p) / 100, [height]);

  const queryClient = useQueryClient();
  const { uiTheme } = useTheme();
  const colors = useMemo(() => buildColors(uiTheme), [uiTheme]);
  const styles = useMemo(() => createStyles(colors, wp, hp, isTablet, isSmallScreen), [colors, wp, hp, isTablet, isSmallScreen]);
  const { user } = useAuth();

  const isAdmin = ["admin", "super-admin", "manager"].includes(user?.role || "");

  const [activeTab, setActiveTab] = useState("my-lists");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedList, setSelectedList] = useState<ShoppingList | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const [pickerConfig, setPickerConfig] = useState<PickerConfig>({
    visible: false,
    title: "",
    options: [],
    selectedValue: "",
    onSelect: () => {},
  });

  const openPicker = (title: string, options: MinimalItem[], selectedValue: string, onSelect: (id: string) => void) => {
    setPickerConfig({
      visible: true,
      title,
      options,
      selectedValue,
      onSelect: (id) => {
        onSelect(id);
        setPickerConfig((prev) => ({ ...prev, visible: false }));
      },
    });
  };

  const { data: listsData, isLoading } = useQuery({
    queryKey: ["shopping-lists", activeTab, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      const res = await apiFetch<{ items: ShoppingList[] }>(`/api/shopping-lists?${params.toString()}`);
      return (res.items || []).map(list => ({
        ...list,
        id: list.id || list._id || "",
      }));
    },
    refetchInterval: 10000,
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies-minimal"],
    queryFn: async () => {
      const res = await apiFetch<{ items: MinimalItem[] }>("/api/companies?limit=100");
      return res.items || [];
    },
  });

  const { data: locations = [] } = useQuery({
    queryKey: ["locations-minimal"],
    queryFn: async () => {
      const res = await apiFetch<{ items: MinimalItem[] }>("/api/locations?limit=100");
      return res.items || [];
    },
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees-minimal"],
    queryFn: async () => {
      const res = await apiFetch<{ items: MinimalItem[] }>("/api/users?limit=100");
      return res.items || [];
    },
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ["vendors-minimal"],
    queryFn: async () => {
      const res = await apiFetch<{ items: MinimalItem[] }>("/api/vendors?limit=100");
      return (res.items || []).filter((v) => v.status === "approved");
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

  return (
    <SafeAreaView style={s(styles.rootContainer)} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={s(styles.scrollPadding)} showsVerticalScrollIndicator={false}>
        <View style={s(styles.responsiveContentWrapper)}>
          <View style={s(styles.headerBlock)}>
            <View style={{ flex: 1, paddingRight: wp(2) }}>
              <Text style={s(styles.mainTitle)}>Shopping & Procurement</Text>
              <Text style={s(styles.subTitle)}>Manage vendor lists, assignments, and real-time tracking.</Text>
            </View>
            <TouchableOpacity 
              style={s(styles.primaryActionButton)}
              onPress={() => setIsCreateModalOpen(true)}
            >
              <Plus size={16} color="#ffffff" style={{ marginRight: wp(1.5) }} />
              <Text style={s(styles.primaryActionText)}>Create New List</Text>
            </TouchableOpacity>
          </View>

          <View style={s(styles.filterControlRow)}>
            <View style={s(styles.tabTrack)}>
              <TouchableOpacity
                style={s([styles.tabButton, activeTab === "my-lists" && styles.activeTabButton])}
                onPress={() => setActiveTab("my-lists")}
              >
                <Text style={s([styles.tabButtonText, activeTab === "my-lists" && styles.activeTabButtonText])}>
                  My Assigned Lists
                </Text>
              </TouchableOpacity>
              {isAdmin && (
                <TouchableOpacity
                  style={s([styles.tabButton, activeTab === "all-lists" && styles.activeTabButton])}
                  onPress={() => setActiveTab("all-lists")}
                >
                  <Text style={s([styles.tabButtonText, activeTab === "all-lists" && styles.activeTabButtonText])}>
                    All Company Lists
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={s(styles.searchWrapperInput)}>
              <Search size={16} color={colors.textSecondary} style={s(styles.searchIconLayout)} />
              <TextInput
                style={s(styles.textInputBox)}
                placeholder="Search lists..."
                placeholderTextColor={colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
              />
            </View>
          </View>

          {isLoading ? (
            <View style={s(styles.loaderCenterBox)}>
              <ActivityIndicator size="small" color={colors.accent} />
            </View>
          ) : (
            <View style={s([styles.listCardGrid, isTablet && styles.listCardGridTwoCol])}>
              {listsData?.length ? (
                listsData.map((list) => {
                  const locObj = list.locationId as { id?: string; _id?: string; name: string } | undefined;
                  const empObj = list.assignedEmployeeId as { id?: string; _id?: string; name: string; username: string } | undefined;
                  return (
                    <TouchableOpacity
                      key={list.id}
                      activeOpacity={0.8}
                      style={s([styles.procureCard, isTablet && styles.procureCardHalfWidth])}
                      onPress={() => {
                        setSelectedList(list);
                        setIsDetailOpen(true);
                      }}
                    >
                      <View style={s(styles.cardHeaderFlex)}>
                        <View style={s(styles.cardInfoIdentity)}>
                          <View style={s(styles.iconContainerBox)}>
                            <ShoppingCart size={18} color={colors.accent} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={s(styles.cardMainHeading)} numberOfLines={1}>{list.name}</Text>
                            <Text style={s(styles.cardMetaTimestamp)}>
                              {format(new Date(list.createdAt), "MMM d, yyyy")}
                            </Text>
                          </View>
                        </View>
                        <View style={s([
                          styles.statusBadgeFrame,
                          list.status === "open" ? styles.badgeOpen :
                          list.status === "completed" ? styles.badgeCompleted : styles.badgeArchived
                        ])}>
                          <Text style={s([
                            styles.statusBadgeText,
                            list.status === "open" ? styles.textOpen :
                            list.status === "completed" ? styles.textCompleted : styles.textArchived
                          ])}>
                            {list.status.toUpperCase()}
                          </Text>
                        </View>
                      </View>

                      <View style={s(styles.cardSpecsColumn)}>
                        {locObj && locObj.name && (
                          <View style={s(styles.specInlineRow)}>
                            <MapPin size={14} color={colors.textSecondary} />
                            <Text style={s(styles.specLineText)} numberOfLines={1}>{locObj.name}</Text>
                          </View>
                        )}
                        {empObj && (empObj.name || empObj.username) && (
                          <View style={s(styles.specInlineRow)}>
                            <User size={14} color={colors.textSecondary} />
                            <Text style={s(styles.specLineText)} numberOfLines={1}>
                              Assigned: {empObj.name || empObj.username}
                            </Text>
                          </View>
                        )}
                        <View style={s(styles.specInlineRow)}>
                          <Store size={14} color={colors.textSecondary} />
                          <Text style={s(styles.specLineText)} numberOfLines={1}>
                            {list.vendors?.length ? list.vendors.map((v) => v.name).join(", ") : "No vendors specified"}
                          </Text>
                        </View>
                      </View>

                      {isAdmin && (
                        <View style={s(styles.adminActionFloatingRow)}>
                          <TouchableOpacity
                            style={s(styles.utilityMiniButton)}
                            onPress={() => {
                              setSelectedList(list);
                              setIsEditModalOpen(true);
                            }}
                          >
                            <Edit2 size={12} color={colors.text} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={s([styles.utilityMiniButton, styles.dangerMiniButton])}
                            onPress={() => handleDeletePrompt(list.id)}
                          >
                            <Trash2 size={12} color={colors.danger} />
                          </TouchableOpacity>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View style={s(styles.blankFallbackStateContainer)}>
                  <View style={s(styles.blankIconRing)}>
                    <ShoppingCart size={32} color={colors.textSecondary} />
                  </View>
                  <Text style={s(styles.blankStateHeading)}>No lists found</Text>
                  <Text style={s(styles.blankStateSubtext)}>Try adjusting filters or configure a procurement document sheet.</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      <CreateListModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        companies={companies}
        locations={locations}
        colors={colors}
        styles={styles}
        openPicker={openPicker}
      />

      {isEditModalOpen && selectedList && (
        <EditListModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          list={selectedList}
          companies={companies}
          locations={locations}
          colors={colors}
          styles={styles}
          openPicker={openPicker}
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
          openPicker={openPicker}
        />
      )}

      <Modal visible={pickerConfig.visible} transparent animationType="fade" onRequestClose={() => setPickerConfig(p => ({ ...p, visible: false }))}>
        <View style={s(styles.modalOverlayMask)}>
          <View style={s(styles.pickerOptionsContainer)}>
            <View style={s(styles.sheetHeaderBorder)}>
              <Text style={s(styles.sheetMainHeading)}>{pickerConfig.title}</Text>
              <TouchableOpacity onPress={() => setPickerConfig(p => ({ ...p, visible: false }))} style={{ padding: wp(1) }}>
                <X size={16} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {pickerConfig.options.map((option) => {
                const optId = option.id || option._id || "";
                const optName = option.name || option.username || "";
                const isSelected = pickerConfig.selectedValue === optId;
                return (
                  <TouchableOpacity
                    key={optId}
                    style={s([styles.pickerOptionItem, isSelected && { backgroundColor: colors.itemSelectedBg }])}
                    onPress={() => pickerConfig.onSelect(optId)}
                  >
                    <Text style={s([styles.pickerOptionItemText, isSelected && { color: colors.accent, fontWeight: "700" }])}>
                      {optName}
                    </Text>
                    {isSelected && <Check size={16} color={colors.accent} />}
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

interface TriggerProps {
  label: string;
  value: string;
  options: MinimalItem[];
  onSelect: (val: string) => void;
  colors: any;
  styles: any;
  openPicker: (title: string, options: MinimalItem[], selectedValue: string, onSelect: (id: string) => void) => void;
}

function NativeSelectTrigger({ label, value, options, onSelect, styles, openPicker }: TriggerProps) {
  const resolvedLabel = options?.find((o) => (o.id || o._id) === value)?.name || options?.find((o) => (o.id || o._id) === value)?.username || "Select configuration element...";

  return (
    <View style={s(styles.formRowSpace)}>
      <Text style={s(styles.nativeLabelElement)}>{label}</Text>
      <TouchableOpacity 
        style={s(styles.nativeCustomSelectTrigger)} 
        onPress={() => openPicker(`Select ${label}`, options, value, onSelect)}
      >
        <Text style={s(styles.nativeCustomSelectValueText)}>{resolvedLabel}</Text>
        <ChevronDown size={14} color={s(styles.nativeCustomSelectValueText).color} />
      </TouchableOpacity>
    </View>
  );
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  companies: MinimalItem[];
  locations: MinimalItem[];
  colors: any;
  styles: any;
  openPicker: any;
}

function CreateListModal({ isOpen, onClose, companies, locations, styles, openPicker }: ModalProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({ name: "", companyId: "", locationId: "", notes: "" });

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
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
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={s(styles.modalBackgroundStructure)}>
        <View style={s(styles.sheetHeaderBorder)}>
          <Text style={s(styles.sheetMainHeading)}>New Shopping List</Text>
          <TouchableOpacity onPress={onClose}>
            <X size={20} color={s(styles.sheetMainHeading).color} />
          </TouchableOpacity>
        </View>

        <ScrollView style={s(styles.modalBodyScroller)} keyboardShouldPersistTaps="handled">
          <View style={s(styles.formRowSpace)}>
            <Text style={s(styles.nativeLabelElement)}>List Name</Text>
            <TextInput
              style={s(styles.modalFormInputBox)}
              value={formData.name}
              placeholderTextColor={s(styles.subTitle).color}
              placeholder="e.g., Weekly Produce - Downtown"
              onChangeText={(text) => setFormData({ ...formData, name: text })}
            />
          </View>

          <NativeSelectTrigger
            label="Company"
            value={formData.companyId}
            options={companies}
            onSelect={(val) => setFormData({ ...formData, companyId: val })}
            colors={null}
            styles={styles}
            openPicker={openPicker}
          />

          <NativeSelectTrigger
            label="Location"
            value={formData.locationId}
            options={locations}
            onSelect={(val) => setFormData({ ...formData, locationId: val })}
            colors={null}
            styles={styles}
            openPicker={openPicker}
          />

          <View style={s(styles.formRowSpace)}>
            <Text style={s(styles.nativeLabelElement)}>Internal Notes</Text>
            <TextInput
              style={s([styles.modalFormInputBox, { height: 80, textAlignVertical: "top" }])}
              multiline
              value={formData.notes}
              placeholderTextColor={s(styles.subTitle).color}
              placeholder="Any specific routing instructions..."
              onChangeText={(text) => setFormData({ ...formData, notes: text })}
            />
          </View>
        </ScrollView>

        <View style={s(styles.sheetFooterBorder)}>
          <TouchableOpacity style={s(styles.cancelActionBtn)} onPress={onClose}>
            <Text style={s(styles.cancelActionBtnText)}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s([styles.confirmActionBtn, !formData.name && { opacity: 0.5 }])}
            disabled={!formData.name}
            onPress={() => mutation.mutate(formData)}
          >
            <Text style={s(styles.confirmActionBtnText)}>Create List</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

interface ListDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  list: ShoppingList;
  allVendors: MinimalItem[];
  employees: MinimalItem[];
  isAdmin: boolean;
  onUpdateStatus: (status: string) => void;
  colors: any;
  styles: any;
  openPicker: any;
}

function ListDetailModal({ isOpen, onClose, list, allVendors, employees, isAdmin, onUpdateStatus, colors, styles, openPicker }: ListDetailModalProps) {
  const queryClient = useQueryClient();
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [vendorFilter, setVendorFilter] = useState<string>("all");
  const [hideCompleted, setHideCompleted] = useState(false);
  const [sortByAisle, setSortByAisle] = useState(false);

  const { data: listWithItems, isLoading } = useQuery({
    queryKey: ["shopping-list", list.id],
    queryFn: async () => {
      const res = await apiFetch<{ item: ShoppingList & { items: ShoppingListItem[] } }>(`/api/shopping-lists/${list.id}`);
      const item = res.item;
      if (item) {
        item.id = item.id || item._id || "";
        if (item.items) {
          item.items = item.items.map(i => ({ ...i, id: i.id || i._id || "" }));
        }
      }
      return item;
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
      items = items.filter((item) => {
        const itemVendorId = item.vendorId?._id || item.vendorId?.id || item.vendorId;
        return itemVendorId === vendorFilter;
      });
    }
    if (hideCompleted) items = items.filter((item) => !item.isPurchased);
    if (sortByAisle) {
      items.sort((a, b) => (a.aisle || "ZZZ").localeCompare(b.aisle || "ZZZ", undefined, { numeric: true }));
    } else {
      items.sort((a, b) => Number(a.isPurchased) - Number(b.isPurchased));
    }
    return items;
  }, [listWithItems, vendorFilter, hideCompleted, sortByAisle]);

  const locObj = list.locationId as { id?: string; _id?: string; name: string } | undefined;

  return (
    <Modal visible={isOpen} animationType="slide" presentationStyle="overFullScreen" onRequestClose={onClose}>
      <SafeAreaView style={s(styles.modalBackgroundStructure)}>
        <View style={s(styles.sheetHeaderBorder)}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={s(styles.sheetMainHeading)} numberOfLines={1}>{list.name}</Text>
            <Text style={s(styles.subTitle)}>{locObj?.name || "No location configuration spec"}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
            <X size={22} color={s(styles.sheetMainHeading).color} />
          </TouchableOpacity>
        </View>

        {isAdmin && (
          <View style={s(styles.adminStatusRibbonControl)}>
            <Text style={s(styles.ribbonSectionText)}>Status Configuration Override:</Text>
            <View style={{ flexDirection: "row", gap: 6 }}>
              {["open", "completed", "archived"].map((st) => (
                <TouchableOpacity
                  key={st}
                  style={s([styles.ribbonBadgeButton, list.status === st && styles.ribbonBadgeActive])}
                  onPress={() => onUpdateStatus(st)}
                >
                  <Text style={s(styles.ribbonBadgeText)}>{st.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={s(styles.detailFilterActionToolbar)}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={s([styles.chipsFilter, vendorFilter === "all" && styles.chipsActive])}
              onPress={() => setVendorFilter("all")}
            >
              <Text style={s(styles.chipsText)}>All Vendors</Text>
            </TouchableOpacity>
            {list.vendors?.map((v) => {
              const vId = v.id || v._id || "";
              return (
                <TouchableOpacity
                  key={vId}
                  style={s([styles.chipsFilter, vendorFilter === vId && styles.chipsActive])}
                  onPress={() => setVendorFilter(vId)}
                >
                  <Text style={s(styles.chipsText)}>{v.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={s(styles.utilityActionRowAlignment)}>
          <TouchableOpacity
            style={s([styles.inlineFilterButtonRow, hideCompleted && styles.inlineFilterActive])}
            onPress={() => setHideCompleted(!hideCompleted)}
          >
            <CheckCircle2 size={14} color={hideCompleted ? colors.accent : colors.textSecondary} />
            <Text style={s([styles.inlineFilterButtonText, hideCompleted && { color: colors.accent }])}>Hide Filled</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s([styles.inlineFilterButtonRow, sortByAisle && styles.inlineFilterActive])}
            onPress={() => setSortByAisle(!sortByAisle)}
          >
            <Filter size={14} color={sortByAisle ? colors.accent : colors.textSecondary} />
            <Text style={s([styles.inlineFilterButtonText, sortByAisle && { color: colors.accent }])}>Aisle Sort</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <ActivityIndicator size="small" color={colors.accent} style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={filteredItems}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={s(styles.blankFallbackStateContainer)}>
                <Package size={36} color={colors.textSecondary} />
                <Text style={s(styles.blankStateSubtext)}>No items documented inside list track segment.</Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={s([styles.procureItemRowLayout, item.isPurchased && styles.procureItemCompletedOpacity])}>
                <TouchableOpacity
                  style={s([styles.itemCheckboxMarker, item.isPurchased && styles.itemCheckboxChecked])}
                  onPress={() => toggleItemMutation.mutate({ itemId: item.id, isPurchased: !item.isPurchased })}
                >
                  {item.isPurchased && <Check size={14} color="#ffffff" />}
                </TouchableOpacity>

                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <Text style={s([styles.itemNameTitle, item.isPurchased && styles.itemNameCompletedLineThrough])}>
                      {item.name}
                    </Text>
                    <View style={s(styles.quantityBadgeMarker)}>
                      <Text style={s(styles.quantityBadgeText)}>{item.quantity}</Text>
                    </View>
                    {item.priority === "high" && (
                      <View style={s(styles.urgentPriorityBadge)}>
                        <Text style={s(styles.urgentPriorityText)}>URGENT</Text>
                      </View>
                    )}
                  </View>

                  <View style={s(styles.itemMetaRow)}>
                    <Text style={s(styles.itemMetaLabelInline)}>
                      Aisle: {item.aisle || "N/A"} • Vendor: {item.vendorId?.name || "General Specification"}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity style={{ padding: 6 }} onPress={() => deleteItemMutation.mutate(item.id)}>
                  <Trash2 size={14} color={colors.danger} />
                </TouchableOpacity>
              </View>
            )}
          />
        )}

        <TouchableOpacity style={s(styles.floatingActionAddBtn)} onPress={() => setIsAddItemOpen(true)}>
          <Plus size={20} color="#ffffff" style={{ marginRight: 6 }} />
          <Text style={s(styles.floatingActionAddBtnText)}>Add Item</Text>
        </TouchableOpacity>

        <AddItemModal
          isOpen={isAddItemOpen}
          onClose={() => setIsAddItemOpen(false)}
          listId={list.id}
          allVendors={allVendors}
          employees={employees}
          styles={styles}
          openPicker={openPicker}
        />
      </SafeAreaView>
    </Modal>
  );
}

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  listId: string;
  allVendors: MinimalItem[];
  employees: MinimalItem[];
  styles: any;
  openPicker: any;
}

function AddItemModal({ isOpen, onClose, listId, allVendors, styles, openPicker }: AddItemModalProps) {
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
    mutationFn: async (data: typeof formData) => {
      const payload = { ...data };
      if (payload.vendorId === "none" || !payload.vendorId) (payload as any).vendorId = null;
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
      <View style={s(styles.modalBackgroundStructure)}>
        <View style={s(styles.sheetHeaderBorder)}>
          <Text style={s(styles.sheetMainHeading)}>Add Item to List</Text>
          <TouchableOpacity onPress={onClose}>
            <X size={20} color={s(styles.sheetMainHeading).color} />
          </TouchableOpacity>
        </View>

        <ScrollView style={s(styles.modalBodyScroller)} keyboardShouldPersistTaps="handled">
          <View style={s(styles.formRowSpace)}>
            <Text style={s(styles.nativeLabelElement)}>Item Name</Text>
            <TextInput
              style={s(styles.modalFormInputBox)}
              value={formData.name}
              placeholderTextColor={s(styles.subTitle).color}
              placeholder="e.g., Avocados (Case)"
              onChangeText={(text) => setFormData({ ...formData, name: text })}
            />
          </View>

          <View style={s(styles.formRowSpace)}>
            <Text style={s(styles.nativeLabelElement)}>Quantity</Text>
            <TextInput
              style={s(styles.modalFormInputBox)}
              value={formData.quantity}
              placeholderTextColor={s(styles.subTitle).color}
              placeholder="e.g., 2 cases"
              onChangeText={(text) => setFormData({ ...formData, quantity: text })}
            />
          </View>

          <View style={s(styles.formRowSpace)}>
            <Text style={s(styles.nativeLabelElement)}>Aisle (Optional)</Text>
            <TextInput
              style={s(styles.modalFormInputBox)}
              value={formData.aisle}
              placeholderTextColor={s(styles.subTitle).color}
              placeholder="e.g., 4"
              onChangeText={(text) => setFormData({ ...formData, aisle: text })}
            />
          </View>

          <NativeSelectTrigger
            label="Vendor"
            value={formData.vendorId}
            options={allVendors}
            onSelect={(val) => setFormData({ ...formData, vendorId: val })}
            colors={null}
            styles={styles}
            openPicker={openPicker}
          />
        </ScrollView>

        <View style={s(styles.sheetFooterBorder)}>
          <TouchableOpacity style={s(styles.cancelActionBtn)} onPress={onClose}>
            <Text style={s(styles.cancelActionBtnText)}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s([styles.confirmActionBtn, !formData.name && { opacity: 0.5 }])}
            disabled={!formData.name}
            onPress={() => mutation.mutate(formData)}
          >
            <Text style={s(styles.confirmActionBtnText)}>Add Item</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

interface EditListModalProps {
  isOpen: boolean;
  onClose: () => void;
  list: ShoppingList;
  companies: MinimalItem[];
  locations: MinimalItem[];
  colors: any;
  styles: any;
  openPicker: any;
}

function EditListModal({ isOpen, onClose, list, companies, locations, styles, openPicker }: EditListModalProps) {
  const queryClient = useQueryClient();

  const initialCompanyId = useMemo(() => {
    if (typeof list.companyId === "string") return list.companyId;
    return list.companyId?.id || list.companyId?._id || "";
  }, [list.companyId]);

  const initialLocationId = useMemo(() => {
    if (typeof list.locationId === "string") return list.locationId;
    return list.locationId?.id || list.locationId?._id || "";
  }, [list.locationId]);

  const [formData, setFormData] = useState({
    name: list.name,
    companyId: initialCompanyId,
    locationId: initialLocationId,
    notes: list.notes || "",
  });

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
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
    onError: (err: any) => {
      Alert.alert("Mutation Failure", err?.message || "Failed to finalize specified updates.");
    }
  });

  return (
    <Modal visible={isOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={s(styles.modalBackgroundStructure)}>
        <View style={s(styles.sheetHeaderBorder)}>
          <Text style={s(styles.sheetMainHeading)}>Edit Shopping List</Text>
          <TouchableOpacity onPress={onClose}>
            <X size={20} color={s(styles.sheetMainHeading).color} />
          </TouchableOpacity>
        </View>

        <ScrollView style={s(styles.modalBodyScroller)} keyboardShouldPersistTaps="handled">
          <View style={s(styles.formRowSpace)}>
            <Text style={s(styles.nativeLabelElement)}>List Name</Text>
            <TextInput
              style={s(styles.modalFormInputBox)}
              value={formData.name}
              placeholderTextColor={s(styles.subTitle).color}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
            />
          </View>

          <NativeSelectTrigger
            label="Company"
            value={formData.companyId}
            options={companies}
            onSelect={(val) => setFormData({ ...formData, companyId: val })}
            colors={null}
            styles={styles}
            openPicker={openPicker}
          />

          <NativeSelectTrigger
            label="Location"
            value={formData.locationId}
            options={locations}
            onSelect={(val) => setFormData({ ...formData, locationId: val })}
            colors={null}
            styles={styles}
            openPicker={openPicker}
          />
        </ScrollView>

        <View style={s(styles.sheetFooterBorder)}>
          <TouchableOpacity style={s(styles.cancelActionBtn)} onPress={onClose}>
            <Text style={s(styles.cancelActionBtnText)}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s(styles.confirmActionBtn)} onPress={() => mutation.mutate(formData)}>
            <Text style={s(styles.confirmActionBtnText)}>Save Changes</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}