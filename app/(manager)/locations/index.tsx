import React, { useMemo, useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
  Image
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";
import { s } from "@/util/styles";
import {
  Plus,
  Search,
  MapPin,
  Users,
  Building2,
  Phone,
  MoreHorizontal,
  Map,
  Navigation,
  Image as ImageIcon,
  X,
  Save
} from "lucide-react-native";
import { isDarkTheme } from "@/constants/design/presets";

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
};

function normalizeLocation(l: LocationApi): Location {
  return {
    id: l._id,
    name: l.name,
    type: l.type,
    country: l.country,
    city: l.city,
    phone:
      l.phone ||
      (l as unknown as { contactPhone?: string }).contactPhone ||
      (l as unknown as { contact_number?: string }).contact_number ||
      "",
    manager:
      l.manager ||
      (l as unknown as { contactName?: string }).contactName ||
      (l as unknown as { managerName?: string }).managerName ||
      "",
    employeeCount: l.employeeCount,
    status: l.status,
    operatingHours: l.operatingHours || "",
    photoDataUrl: (l as unknown as { photoDataUrl?: string }).photoDataUrl,
    photoFileName: (l as unknown as { photoFileName?: string }).photoFileName,
  };
}

const typeIcons = {
  office: Building2,
  warehouse: Building2,
  facility: Building2,
  site: MapPin,
};

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
  Afghanistan: "🇦🇫",
  Albania: "🇦🇱",
  Algeria: "🇩🇿",
  Argentina: "🇦🇷",
  Australia: "🇦🇺",
  Austria: "🇦🇹",
  Bangladesh: "🇧🇩",
  Belgium: "🇧🇪",
  Brazil: "🇧🇷",
  Canada: "🇨🇦",
  Chile: "🇨🇱",
  China: "🇨🇳",
  Colombia: "🇨🇴",
  "Czech Republic": "🇨🇿",
  Denmark: "🇩🇰",
  Egypt: "🇪🇬",
  Ethiopia: "🇪🇹",
  Finland: "🇫🇮",
  France: "🇫🇷",
  Germany: "🇩🇪",
  Greece: "🇬🇷",
  Hungary: "🇭🇺",
  India: "🇮🇳",
  Indonesia: "🇮🇩",
  Iran: "🇮🇷",
  Iraq: "🇮🇶",
  Ireland: "🇮🇪",
  Israel: "🇮🇱",
  Italy: "🇮🇹",
  Japan: "🇯🇵",
  Kenya: "🇰🇪",
  Malaysia: "🇲🇾",
  Mexico: "🇲🇽",
  Morocco: "🇲🇦",
  Netherlands: "🇳🇱",
  "New Zealand": "🇳🇿",
  Nigeria: "🇳🇬",
  Norway: "🇳🇴",
  Pakistan: "🇵🇰",
  Peru: "🇵🇪",
  Philippines: "🇵🇭",
  Poland: "🇵🇱",
  Portugal: "🇵🇹",
  Russia: "🇷🇺",
  "Saudi Arabia": "🇸🇦",
  Singapore: "🇸🇬",
  "South Africa": "🇿🇦",
  "South Korea": "🇰🇷",
  Spain: "🇪🇸",
  Sweden: "🇸🇪",
  Switzerland: "🇨🇭",
  Thailand: "🇹🇭",
  Turkey: "🇹🇷",
  UAE: "🇦🇪",
  UK: "🇬🇧",
  USA: "🇺🇸",
  Vietnam: "🇻🇳",
  Yemen: "🇾🇪",
};

const COUNTRIES_LIST = Object.keys(countryFlags);

function buildColors(uiTheme: any) {
  const isDark = isDarkTheme(uiTheme?.theme);
  return {
    background:      uiTheme.panelColors?.dashboardBackground     || (isDark ? "#09090b" : "#ffffff"),
    panelHeader:     uiTheme.panelColors?.dashboardCardBackground || (isDark ? "#141517" : "#f8fafc"),
    cardBg:          uiTheme.panelColors?.dashboardCardBackground || (isDark ? "#141517" : "#f8fafc"),
    text:            uiTheme.panelColors?.dashboardTextColor      || (isDark ? "#f8fafc" : "#000000"),
    textSecondary:   isDark ? "#94a3b8" : "#475569",
    border:          isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)",
    primary:         uiTheme.customColors?.primary                || "#3b82f6",
    success:         "#16C784",
    warning:         "#F59E0B",
    danger:          "#EF4444",
    info:            "#0ea5e9"
  };
}

function createStyles(
  colors: ReturnType<typeof buildColors>,
  wp: (percentage: number) => number,
  hp: (percentage: number) => number
) {
  return StyleSheet.create({
    viewport: {
      flex: 1,
      backgroundColor: colors.background,
    },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: wp(4.2),
      paddingTop: hp(2),
      marginBottom: hp(2),
    },
    pageTitle: {
      fontSize: wp(6),
      fontWeight: "900",
      color: colors.text,
    },
    pageSubtitle: {
      fontSize: wp(3.3),
      color: colors.textSecondary,
      marginTop: hp(0.25),
    },
    addBtnUnit: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.primary,
      paddingVertical: hp(1),
      paddingHorizontal: wp(3.5),
      borderRadius: wp(2.5),
      gap: wp(1.5),
    },
    addBtnUnitText: {
      color: "#ffffff",
      fontSize: wp(3),
      fontWeight: "700",
    },
    statsClusterGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      paddingHorizontal: wp(4.2),
      gap: wp(2.5),
      marginBottom: hp(2),
    },
    statCardItem: {
      width: wp(43),
      backgroundColor: colors.cardBg,
      borderRadius: wp(3),
      borderWidth: 1,
      borderColor: colors.border,
      padding: wp(3.2),
    },
    statCardFlex: {
      flexDirection: "row",
      alignItems: "center",
      gap: wp(2.5),
    },
    statIconWrap: {
      padding: wp(2),
      borderRadius: wp(2),
    },
    statLabelText: {
      fontSize: wp(3),
      color: colors.textSecondary,
      textTransform: "capitalize",
    },
    statCountValue: {
      fontSize: wp(5),
      fontWeight: "800",
      color: colors.text,
    },
    searchSectionRow: {
      paddingHorizontal: wp(4.2),
      marginBottom: hp(2),
    },
    searchInputContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: wp(2.5),
      paddingHorizontal: wp(3.2),
      height: hp(5.2),
    },
    searchBarTextField: {
      flex: 1,
      color: colors.text,
      fontSize: wp(3.3),
      paddingLeft: wp(2),
    },
    gridFrameOuter: {
      marginHorizontal: wp(4.2),
      backgroundColor: colors.cardBg,
      borderRadius: wp(3),
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
      marginBottom: hp(2),
    },
    loadingBoxArea: {
      padding: wp(8),
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: wp(2),
    },
    loadingBoxText: {
      color: colors.textSecondary,
      fontSize: wp(3.3),
    },
    errorBoxText: {
      padding: wp(6),
      fontSize: wp(3.3),
      color: colors.danger,
      textAlign: "center",
    },
    emptyStateContainer: {
      padding: wp(8),
      alignItems: "center",
      justifyContent: "center",
    },
    emptyStateIconBox: {
      width: wp(14),
      height: wp(14),
      borderRadius: wp(7),
      backgroundColor: "rgba(59, 130, 246, 0.1)",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: hp(1.5),
    },
    emptyStateHeading: {
      fontSize: wp(4),
      fontWeight: "700",
      color: colors.text,
      marginBottom: hp(0.5),
    },
    emptyStateSubtext: {
      fontSize: wp(3.3),
      color: colors.textSecondary,
      textAlign: "center",
      marginBottom: hp(2),
    },
    emptyStateAddBtn: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.primary,
      paddingVertical: hp(1),
      paddingHorizontal: wp(3.5),
      borderRadius: wp(2.5),
      gap: wp(1.5),
    },
    locationItemsStack: {
      padding: wp(3.2),
      gap: hp(1.5),
    },
    locationCardFrame: {
      backgroundColor: colors.cardBg,
      borderRadius: wp(3),
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },
    locationCardPadding: {
      padding: wp(4),
    },
    locationCardTopLine: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    locationMetaLeftBlock: {
      flexDirection: "row",
      alignItems: "center",
      gap: wp(3),
      flex: 1,
    },
    locationImageAtom: {
      width: wp(11),
      height: wp(11),
      borderRadius: wp(2.5),
    },
    locationIconPlaceholder: {
      width: wp(11),
      height: wp(11),
      borderRadius: wp(2.5),
      alignItems: "center",
      justifyContent: "center",
    },
    locationInfoTextColumn: {
      flex: 1,
    },
    locationTitleLabel: {
      fontSize: wp(3.6),
      fontWeight: "700",
      color: colors.text,
    },
    typeBadgeWrapper: {
      alignSelf: "flex-start",
      paddingHorizontal: wp(2),
      paddingVertical: hp(0.3),
      borderRadius: wp(1.5),
      marginTop: hp(0.5),
    },
    typeBadgeText: {
      fontSize: wp(2.5),
      fontWeight: "700",
      textTransform: "capitalize",
    },
    actionTriggerDotBtn: {
      padding: wp(1.5),
      borderRadius: wp(2),
    },
    locationBodyDataBlock: {
      marginTop: hp(1.5),
      gap: hp(1),
    },
    locationDetailRowItem: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: wp(2),
    },
    locationDetailRowItemText: {
      fontSize: wp(3.3),
      color: colors.textSecondary,
    },
    locationCardFooterDivider: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: hp(1.5),
      paddingTop: hp(1.5),
      borderTopWidth: 1,
      borderColor: "rgba(255,255,255,0.05)",
    },
    employeeCounterRowFlex: {
      flexDirection: "row",
      alignItems: "center",
      gap: wp(1.5),
    },
    employeeCounterText: {
      fontSize: wp(3.3),
      color: colors.textSecondary,
    },
    statusIndicatorRowFlex: {
      flexDirection: "row",
      alignItems: "center",
      gap: wp(1.5),
    },
    statusDotCore: {
      width: wp(1.5),
      height: wp(1.5),
      borderRadius: wp(0.75),
    },
    statusTextLabel: {
      fontSize: wp(3),
      fontWeight: "600",
      textTransform: "capitalize",
    },
    summaryFooterStatusBar: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: wp(4.2),
      marginBottom: hp(3),
    },
    summaryFooterText: {
      fontSize: wp(3.3),
      color: colors.textSecondary,
    },
    summaryAggregateRowFlex: {
      flexDirection: "row",
      alignItems: "center",
      gap: wp(1.5),
    },
    modalOverlayMask: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    modalContentBoxContainer: {
      width: wp(92),
      backgroundColor: colors.background,
      borderRadius: wp(4),
      borderWidth: 1,
      borderColor: colors.border,
      maxHeight: "85%",
      overflow: "hidden",
    },
    modalHeaderBar: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: wp(4.2),
      borderBottomWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.panelHeader,
    },
    modalHeaderTitleLayoutRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: wp(2),
    },
    modalHeaderTitleText: {
      fontSize: wp(4),
      fontWeight: "800",
      color: colors.text,
    },
    modalHeaderSubtitleText: {
      fontSize: wp(3),
      color: colors.textSecondary,
      paddingHorizontal: wp(4.2),
      marginTop: hp(1),
    },
    formScrollViewScrollableArea: {
      padding: wp(4.2),
    },
    formInputGroupBlock: {
      marginBottom: hp(1.7),
    },
    formInputGroupLabelText: {
      fontSize: wp(3.3),
      fontWeight: "600",
      color: colors.text,
      marginBottom: hp(0.75),
    },
    formInputTextControlField: {
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: wp(2),
      paddingHorizontal: wp(3),
      height: hp(5),
      color: colors.text,
      fontSize: wp(3.3),
    },
    formInputGroupErrorMessage: {
      fontSize: wp(2.8),
      color: colors.danger,
      marginTop: hp(0.5),
    },
    horizontalPickerOptionScroller: {
      flexDirection: "row",
      gap: wp(2),
      paddingVertical: hp(0.25),
    },
    pickerOptionCapsuleBtn: {
      paddingHorizontal: wp(3.5),
      paddingVertical: hp(0.8),
      borderRadius: wp(5),
      borderWidth: 1,
    },
    pickerOptionCapsuleBtnText: {
      fontSize: wp(3),
      fontWeight: "600",
      textTransform: "capitalize",
    },
    mediaUploadWorkspaceBox: {
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: colors.border,
      borderRadius: wp(3),
      padding: wp(4.2),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.cardBg,
    },
    mediaUploadPreviewFrame: {
      position: "relative",
      width: "100%",
      height: hp(18),
      borderRadius: wp(2),
      overflow: "hidden",
    },
    mediaUploadPreviewImageElement: {
      width: "100%",
      height: "100%",
    },
    mediaUploadRemoveOverlayBtn: {
      position: "absolute",
      top: hp(1),
      right: wp(2),
      width: wp(7),
      height: wp(7),
      borderRadius: wp(3.5),
      backgroundColor: colors.danger,
      alignItems: "center",
      justifyContent: "center",
    },
    mediaUploadHelperPrimaryText: {
      fontSize: wp(3.3),
      color: colors.textSecondary,
      marginTop: hp(0.75),
    },
    mediaUploadHelperSecondaryText: {
      fontSize: wp(2.8),
      color: colors.textSecondary,
      opacity: 0.6,
      marginTop: hp(0.25),
    },
    modalActionsFooterPane: {
      flexDirection: "row",
      justifyContent: "flex-end",
      padding: wp(3),
      borderTopWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.panelHeader,
      gap: wp(2),
    },
    modalFooterDismissBtn: {
      paddingHorizontal: wp(3.5),
      height: hp(4.8),
      borderRadius: wp(2),
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalFooterDismissBtnText: {
      fontSize: wp(3),
      fontWeight: "600",
      color: colors.text,
    },
    modalFooterSubmitBtn: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.primary,
      paddingHorizontal: wp(3.5),
      height: hp(4.8),
      borderRadius: wp(2),
      gap: wp(1.5),
    },
    modalFooterSubmitBtnText: {
      color: "#ffffff",
      fontSize: wp(3),
      fontWeight: "700",
    },
    viewDialogMediaHeroBanner: {
      width: "100%",
      height: hp(18),
      borderRadius: wp(3),
      marginBottom: hp(2),
    },
    viewDialogGridSystem: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: wp(3.5),
    },
    viewDialogGridColumnUnit: {
      width: "47%",
    },
    viewDialogFieldMetaLabelText: {
      fontSize: wp(2.8),
      color: colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.3,
    },
    viewDialogFieldMetaValueText: {
      fontSize: wp(3.3),
      fontWeight: "600",
      color: colors.text,
      marginTop: hp(0.25),
    },
    inlineBadgeStatusRowFlex: {
      flexDirection: "row",
      alignItems: "center",
      gap: wp(1.5),
      marginTop: hp(0.5),
    },
    inlineBadgeStatusDot: {
      width: wp(1.5),
      height: wp(1.5),
      borderRadius: wp(0.75),
    },
    inlineBadgeStatusLabel: {
      fontSize: wp(3.3),
      fontWeight: "600",
    },
    inlineBadgeTypeCapsule: {
      alignSelf: "flex-start",
      paddingHorizontal: wp(2),
      paddingVertical: hp(0.3),
      borderRadius: wp(1.5),
      marginTop: hp(0.25),
    },
    inlineBadgeTypeLabel: {
      fontSize: wp(3),
      fontWeight: "700",
      textTransform: "capitalize",
    },
    actionSheetDrawerPanelOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.6)",
      justifyContent: "flex-end",
    },
    actionSheetDrawerPanelSheet: {
      backgroundColor: colors.panelHeader,
      borderTopLeftRadius: wp(4),
      borderTopRightRadius: wp(4),
      borderWidth: 1,
      borderColor: colors.border,
      paddingBottom: hp(3),
    },
    actionSheetHeaderBlock: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: wp(4.2),
      borderBottomWidth: 1,
      borderColor: colors.border,
    },
    actionSheetHeaderTitleText: {
      fontSize: wp(3.3),
      fontWeight: "700",
      color: colors.textSecondary,
      textTransform: "uppercase",
    },
    actionSheetOptionRowLink: {
      paddingVertical: hp(1.7),
      paddingHorizontal: wp(4.2),
      borderBottomWidth: 1,
      borderColor: colors.border,
    },
    actionSheetOptionRowLinkText: {
      fontSize: wp(3.5),
      color: colors.text,
    },
    alertDialogContainerFrame: {
      width: wp(85),
      backgroundColor: colors.background,
      borderRadius: wp(3.5),
      borderWidth: 1,
      borderColor: colors.border,
      padding: wp(4.2),
    },
    alertDialogHeadingText: {
      fontSize: wp(4),
      fontWeight: "700",
      color: colors.text,
      marginBottom: hp(1),
    },
    alertDialogDescriptionText: {
      fontSize: wp(3.3),
      color: colors.textSecondary,
      lineHeight: hp(2.2),
      marginBottom: hp(2.5),
    },
    alertDialogActionsRowFlex: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: wp(2.5),
    },
    alertDialogCancelBtn: {
      paddingHorizontal: wp(3.5),
      height: hp(4.5),
      borderRadius: wp(2),
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    alertDialogCancelBtnText: {
      fontSize: wp(3),
      fontWeight: "600",
      color: colors.text,
    },
    alertDialogConfirmDeleteBtn: {
      backgroundColor: colors.danger,
      paddingHorizontal: wp(3.5),
      height: hp(4.5),
      borderRadius: wp(2),
      justifyContent: "center",
      alignItems: "center",
    },
    alertDialogConfirmDeleteBtnText: {
      color: "#ffffff",
      fontSize: wp(3),
      fontWeight: "700",
    }
  });
}

export default function Locations() {
  const { width, height } = useWindowDimensions();
  const wp = useMemo(() => (p: number) => (width * p) / 100, [width]);
  const hp = useMemo(() => (p: number) => (height * p) / 100, [height]);

  const { uiTheme } = useTheme();
  const colors = useMemo(() => buildColors(uiTheme), [uiTheme]);
  const styles = useMemo(() => createStyles(colors, wp, hp), [colors, wp, hp]);

  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);

  const queryClient = useQueryClient();

  // Optimizes payload size by fetching lightweight summary fields for bulk list
  const locationsQuery = useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const res = await apiFetch<{ items: LocationApi[] }>("/api/locations?exclude=photoDataUrl&summary=true");
      return res.items.map(normalizeLocation);
    },
  });

  // On-demand detail fetch for heavy fields (like base64 photos) when viewing or editing
  const locationDetailQuery = useQuery({
    queryKey: ["location", selectedLocation?.id],
    queryFn: async () => {
      if (!selectedLocation?.id) return null;
      const res = await apiFetch<{ item: LocationApi }>(`/api/locations/${selectedLocation.id}`);
      return normalizeLocation(res.item);
    },
    enabled: Boolean(selectedLocation?.id && (isViewOpen || isEditOpen)),
  });

  const activeLocation = locationDetailQuery.data ?? selectedLocation;

  const locations = locationsQuery.data ?? [];

  const createLocationMutation = useMutation({
    mutationFn: async (payload: CreateLocationValues) => {
      const res = await apiFetch<{ item: LocationApi }>("/api/locations", {
        method: "POST",
        body: JSON.stringify({
          ...payload,
          manager: payload.contactName,
          phone: payload.contactPhone,
        }),
      });
      return normalizeLocation(res.item);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["locations"] });
    },
  });

  const updateLocationMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: CreateLocationValues }) => {
      const res = await apiFetch<{ item: LocationApi }>(`/api/locations/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          ...payload,
          manager: payload.contactName,
          phone: payload.contactPhone,
        }),
      });
      return normalizeLocation(res.item);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["locations"] });
    },
  });

  const deleteLocationMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiFetch<{ ok: true }>(`/api/locations/${id}`, { method: "DELETE" });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["locations"] });
    },
  });

  const createForm = useForm<CreateLocationValues>({
    resolver: zodResolver(createLocationSchema),
    defaultValues: {
      name: "",
      type: "office",
      country: "",
      city: "",
      status: "active",
      contactName: "",
      contactPhone: "",
      tasksCount: 0,
      photoDataUrl: "",
      photoFileName: "",
    },
  });

  const editForm = useForm<CreateLocationValues>({
    resolver: zodResolver(createLocationSchema),
    defaultValues: {
      name: "",
      type: "office",
      country: "",
      city: "",
      status: "active",
      contactName: "",
      contactPhone: "",
      tasksCount: 0,
      photoDataUrl: "",
      photoFileName: "",
    },
  });

  useEffect(() => {
    if (activeLocation && isEditOpen) {
      editForm.reset({
        name: activeLocation.name,
        type: activeLocation.type,
        country: activeLocation.country,
        city: activeLocation.city,
        status: activeLocation.status,
        contactName: activeLocation.manager || "",
        contactPhone: activeLocation.phone || "",
        tasksCount: Number.isFinite(activeLocation.employeeCount) ? activeLocation.employeeCount : 0,
        photoDataUrl: activeLocation.photoDataUrl || "",
        photoFileName: activeLocation.photoFileName || "",
      });
    }
  }, [activeLocation, isEditOpen, editForm]);

  const onCreateLocation = (values: CreateLocationValues) => {
    createLocationMutation.mutate(values, {
      onSuccess: () => {
        setIsCreateOpen(false);
        createForm.reset();
        Alert.alert("Location added", "New location has been added.");
      },
      onError: (err) => {
        Alert.alert("Failed to add location", err instanceof Error ? err.message : "Something went wrong");
      },
    });
  };

  const onEditLocation = (values: CreateLocationValues) => {
    if (!selectedLocation) return;
    updateLocationMutation.mutate(
      { id: selectedLocation.id, payload: values },
      {
        onSuccess: () => {
          setIsEditOpen(false);
          Alert.alert("Location updated", "Location has been updated.");
        },
        onError: (err) => {
          Alert.alert("Failed to update location", err instanceof Error ? err.message : "Something went wrong");
        },
      },
    );
  };

  const confirmDelete = () => {
    if (!selectedLocation) return;
    deleteLocationMutation.mutate(selectedLocation.id, {
      onSuccess: () => {
        setIsDeleteOpen(false);
        setSelectedLocation(null);
        Alert.alert("Location deleted", "Location has been removed.");
      },
      onError: (err) => {
        Alert.alert("Failed to delete location", err instanceof Error ? err.message : "Something went wrong");
      },
    });
  };

  const openActionMenu = (location: Location) => {
    setSelectedLocation(location);
    setIsActionSheetOpen(true);
  };

  const triggerViewOption = () => {
    setIsActionSheetOpen(false);
    setIsViewOpen(true);
  };

  const triggerEditOption = () => {
    setIsActionSheetOpen(false);
    setIsEditOpen(true);
  };

  const triggerDeleteOption = () => {
    setIsActionSheetOpen(false);
    setIsDeleteOpen(true);
  };

  const filteredLocations = useMemo(() => {
    return locations.filter(
      (location) =>
        location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        location.city.toLowerCase().includes(searchQuery.toLowerCase()),
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

  const totalEmployees = useMemo(() => {
    return locations.reduce((acc, loc) => acc + loc.employeeCount, 0);
  }, [locations]);

  const typeStylesMap = {
    office: { bg: "rgba(59, 130, 246, 0.1)", text: colors.primary },
    warehouse: { bg: "rgba(245, 158, 11, 0.1)", text: colors.warning },
    facility: { bg: "rgba(14, 165, 233, 0.1)", text: colors.info },
    site: { bg: "rgba(22, 199, 132, 0.1)", text: colors.success },
  };

  return (
    <SafeAreaView style={s(styles.viewport)} edges={["top", "left", "right"]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        
        <View style={s(styles.headerRow)}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={s(styles.pageTitle)}>Locations Management</Text>
            <Text style={s(styles.pageSubtitle)}>Manage all business locations and sites</Text>
          </View>
          <TouchableOpacity style={s(styles.addBtnUnit)} onPress={() => setIsCreateOpen(true)}>
            <Plus size={15} color="#ffffff" />
            <Text style={s(styles.addBtnUnitText)}>Add Location</Text>
          </TouchableOpacity>
        </View>

        <View style={s(styles.statsClusterGrid)}>
          {(["office", "warehouse", "facility", "site"] as const).map((type) => {
            const count = typeCounts[type] || 0;
            const IconComponent = typeIcons[type];
            const currentStyle = typeStylesMap[type];

            return (
              <View key={type} style={s(styles.statCardItem)}>
                <View style={s(styles.statCardFlex)}>
                  <View style={s([styles.statIconWrap, { backgroundColor: currentStyle.bg }])}>
                    <IconComponent size={18} color={currentStyle.text} />
                  </View>
                  <View>
                    <Text style={s(styles.statLabelText)}>{type}s</Text>
                    <Text style={s(styles.statCountValue)}>{count}</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        <View style={s(styles.searchSectionRow)}>
          <View style={s(styles.searchInputContainer)}>
            <Search size={16} color={colors.textSecondary} />
            <TextInput
              style={s(styles.searchBarTextField)}
              placeholder="Search locations..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
            />
          </View>
        </View>

        <View style={s(styles.gridFrameOuter)}>
          {locationsQuery.isLoading ? (
            <View style={s(styles.loadingBoxArea)}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={s(styles.loadingBoxText)}>Loading locations...</Text>
            </View>
          ) : locationsQuery.isError ? (
            <Text style={s(styles.errorBoxText)}>
              {locationsQuery.error instanceof Error ? locationsQuery.error.message : "Failed to load locations"}
            </Text>
          ) : filteredLocations.length === 0 ? (
            <View style={s(styles.emptyStateContainer)}>
              <View style={s(styles.emptyStateIconBox)}>
                <Map size={24} color={colors.primary} />
              </View>
              <Text style={s(styles.emptyStateHeading)}>No locations found</Text>
              <Text style={s(styles.emptyStateSubtext)}>
                {searchQuery ? "Try adjusting your search" : "Get started by adding your first location"}
              </Text>
              {!searchQuery && (
                <TouchableOpacity style={s(styles.emptyStateAddBtn)} onPress={() => setIsCreateOpen(true)}>
                  <Plus size={15} color="#ffffff" />
                  <Text style={s(styles.addBtnUnitText)}>Add Location</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={s(styles.locationItemsStack)}>
              {filteredLocations.map((location) => {
                const SpecificIcon = typeIcons[location.type];
                const typeStyle = typeStylesMap[location.type];

                return (
                  <View key={location.id} style={s([styles.locationCardFrame, location.status === "inactive" && { opacity: 0.6 }])}>
                    <View style={s(styles.locationCardPadding)}>
                      <View style={s(styles.locationCardTopLine)}>
                        <View style={s(styles.locationMetaLeftBlock)}>
                          {location.photoDataUrl ? (
                            <Image source={{ uri: location.photoDataUrl }} style={s(styles.locationImageAtom)} resizeMode="cover" />
                          ) : (
                            <View style={s([styles.locationIconPlaceholder, { backgroundColor: typeStyle.bg }])}>
                              <SpecificIcon size={20} color={typeStyle.text} />
                            </View>
                          )}
                          <View style={s(styles.locationInfoTextColumn)}>
                            <Text style={s(styles.locationTitleLabel)} numberOfLines={1}>{location.name}</Text>
                            <View style={s([styles.typeBadgeWrapper, { backgroundColor: typeStyle.bg }])}>
                              <Text style={s([styles.typeBadgeText, { color: typeStyle.text }])}>{location.type}</Text>
                            </View>
                          </View>
                        </View>
                        <TouchableOpacity style={s(styles.actionTriggerDotBtn)} onPress={() => openActionMenu(location)}>
                          <MoreHorizontal size={16} color={colors.textSecondary} />
                        </TouchableOpacity>
                      </View>

                      <View style={s(styles.locationBodyDataBlock)}>
                        <View style={s(styles.locationDetailRowItem)}>
                          <MapPin size={14} color={colors.textSecondary} style={{ marginTop: 2 }} />
                          <View>
                            <Text style={s(styles.locationDetailRowItemText)}>{location.country}</Text>
                            <Text style={s(styles.locationDetailRowItemText)}>{location.city}</Text>
                          </View>
                        </View>
                        {!!location.phone && (
                          <View style={s(styles.locationDetailRowItem)}>
                            <Phone size={14} color={colors.textSecondary} />
                            <Text style={s(styles.locationDetailRowItemText)}>{location.phone}</Text>
                          </View>
                        )}
                      </View>

                      <View style={s(styles.locationCardFooterDivider)}>
                        <View style={s(styles.employeeCounterRowFlex)}>
                          <Users size={14} color={colors.textSecondary} />
                          <Text style={s(styles.employeeCounterText)}>{location.employeeCount} employees</Text>
                        </View>
                        <View style={s(styles.statusIndicatorRowFlex)}>
                          <View style={s([styles.statusDotCore, { backgroundColor: location.status === "active" ? colors.success : colors.textSecondary }])} />
                          <Text style={s([styles.statusTextLabel, { color: location.status === "active" ? colors.success : colors.textSecondary }])}>
                            {location.status}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {filteredLocations.length > 0 && (
          <View style={s(styles.summaryFooterStatusBar)}>
            <Text style={s(styles.summaryFooterText)}>Showing {filteredLocations.length} of {locations.length} locations</Text>
            <View style={s(styles.summaryAggregateRowFlex)}>
              <Navigation size={14} color={colors.primary} />
              <Text style={s(styles.summaryFooterText)}>Total employees: {totalEmployees}</Text>
            </View>
          </View>
        )}
      </ScrollView>

      <Modal visible={isCreateOpen} transparent animationType="slide">
        <View style={s(styles.modalOverlayMask)}>
          <View style={s(styles.modalContentBoxContainer)}>
            <View style={s(styles.modalHeaderBar)}>
              <View style={s(styles.modalHeaderTitleLayoutRow)}>
                <MapPin size={18} color={colors.primary} />
                <Text style={s(styles.modalHeaderTitleText)}>Add Location</Text>
              </View>
              <TouchableOpacity onPress={() => setIsCreateOpen(false)}>
                <X size={18} color={colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={s(styles.modalHeaderSubtitleText)}>Add a new business location.</Text>

            <ScrollView contentContainerStyle={s(styles.formScrollViewScrollableArea)}>
              <View style={s(styles.formInputGroupBlock)}>
                <Text style={s(styles.formInputGroupLabelText)}>Name</Text>
                <Controller
                  control={createForm.control}
                  name="name"
                  render={({ field: { onChange, value }, fieldState: { error } }) => (
                    <View>
                      <TextInput style={s(styles.formInputTextControlField)} placeholder="e.g. Warehouse B" placeholderTextColor={colors.textSecondary} onChangeText={onChange} value={value} />
                      {error && <Text style={s(styles.formInputGroupErrorMessage)}>{error.message}</Text>}
                    </View>
                  )}
                />
              </View>

              <View style={s(styles.formInputGroupBlock)}>
                <Text style={s(styles.formInputGroupLabelText)}>Type</Text>
                <Controller
                  control={createForm.control}
                  name="type"
                  render={({ field: { onChange, value } }) => (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s(styles.horizontalPickerOptionScroller)}>
                      {(["office", "warehouse", "facility", "site"] as const).map((typeOption) => {
                        const isSelected = value === typeOption;
                        return (
                          <TouchableOpacity
                            key={typeOption}
                            style={s([styles.pickerOptionCapsuleBtn, { backgroundColor: isSelected ? colors.primary : colors.cardBg, borderColor: colors.border }])}
                            onPress={() => onChange(typeOption)}
                          >
                            <Text style={s([styles.pickerOptionCapsuleBtnText, { color: isSelected ? "#ffffff" : colors.text }])}>{typeOption}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  )}
                />
              </View>

              <View style={s(styles.formInputGroupBlock)}>
                <Text style={s(styles.formInputGroupLabelText)}>Status</Text>
                <Controller
                  control={createForm.control}
                  name="status"
                  render={({ field: { onChange, value } }) => (
                    <View style={s({ flexDirection: "row", gap: 10 })}>
                      {(["active", "inactive"] as const).map((statusOption) => {
                        const isSelected = value === statusOption;
                        return (
                          <TouchableOpacity
                            key={statusOption}
                            style={s([styles.pickerOptionCapsuleBtn, { backgroundColor: isSelected ? colors.primary : colors.cardBg, borderColor: colors.border, flex: 1, alignItems: "center" }])}
                            onPress={() => onChange(statusOption)}
                          >
                            <Text style={s([styles.pickerOptionCapsuleBtnText, { color: isSelected ? "#ffffff" : colors.text }])}>{statusOption}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                />
              </View>

              <View style={s(styles.formInputGroupBlock)}>
                <Text style={s(styles.formInputGroupLabelText)}>Country</Text>
                <Controller
                  control={createForm.control}
                  name="country"
                  render={({ field: { onChange, value }, fieldState: { error } }) => (
                    <View>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s(styles.horizontalPickerOptionScroller)}>
                        {COUNTRIES_LIST.map((cty) => {
                          const isSelected = value === cty;
                          return (
                            <TouchableOpacity
                              key={cty}
                              style={s([styles.pickerOptionCapsuleBtn, { backgroundColor: isSelected ? colors.primary : colors.cardBg, borderColor: colors.border }])}
                              onPress={() => onChange(cty)}
                            >
                              <Text style={s([styles.pickerOptionCapsuleBtnText, { color: isSelected ? "#ffffff" : colors.text }])}>
                                {countryFlags[cty]} {cty}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                      {error && <Text style={s(styles.formInputGroupErrorMessage)}>{error.message}</Text>}
                    </View>
                  )}
                />
              </View>

              <View style={s(styles.formInputGroupBlock)}>
                <Text style={s(styles.formInputGroupLabelText)}>City</Text>
                <Controller
                  control={createForm.control}
                  name="city"
                  render={({ field: { onChange, value }, fieldState: { error } }) => (
                    <View>
                      <TextInput style={s(styles.formInputTextControlField)} placeholder="e.g. New York, NY 10001" placeholderTextColor={colors.textSecondary} onChangeText={onChange} value={value} />
                      {error && <Text style={s(styles.formInputGroupErrorMessage)}>{error.message}</Text>}
                    </View>
                  )}
                />
              </View>

              <View style={s(styles.formInputGroupBlock)}>
                <Text style={s(styles.formInputGroupLabelText)}>Phone</Text>
                <Controller
                  control={createForm.control}
                  name="contactPhone"
                  render={({ field: { onChange, value } }) => (
                    <TextInput style={s(styles.formInputTextControlField)} placeholder="e.g. +1 (555) 123-4567" placeholderTextColor={colors.textSecondary} onChangeText={onChange} value={value} />
                  )}
                />
              </View>

              <View style={s(styles.formInputGroupBlock)}>
                <Text style={s(styles.formInputGroupLabelText)}>Manager</Text>
                <Controller
                  control={createForm.control}
                  name="contactName"
                  render={({ field: { onChange, value } }) => (
                    <TextInput style={s(styles.formInputTextControlField)} placeholder="e.g. John Smith" placeholderTextColor={colors.textSecondary} onChangeText={onChange} value={value} />
                  )}
                />
              </View>

              <View style={s(styles.formInputGroupBlock)}>
                <Text style={s(styles.formInputGroupLabelText)}>Employees</Text>
                <Controller
                  control={createForm.control}
                  name="tasksCount"
                  render={({ field: { onChange, value } }) => (
                    <TextInput style={s(styles.formInputTextControlField)} keyboardType="numeric" placeholder="0" placeholderTextColor={colors.textSecondary} onChangeText={(text) => onChange(Number(text) || 0)} value={String(value || "")} />
                  )}
                />
              </View>

              <View style={s(styles.formInputGroupBlock)}>
                <Text style={s(styles.formInputGroupLabelText)}>Location Photo</Text>
                <Controller
                  control={createForm.control}
                  name="photoDataUrl"
                  render={({ field: { onChange, value } }) => (
                    <View>
                      {value ? (
                        <View style={s(styles.mediaUploadWorkspaceBox)}>
                          <View style={s(styles.mediaUploadPreviewFrame)}>
                            <Image source={{ uri: value }} style={s(styles.mediaUploadPreviewImageElement)} />
                            <TouchableOpacity style={s(styles.mediaUploadRemoveOverlayBtn)} onPress={() => { onChange(""); createForm.setValue("photoFileName", ""); }}>
                              <X size={14} color="#ffffff" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : (
                        <TouchableOpacity style={s(styles.mediaUploadWorkspaceBox)} onPress={() => {
                          onChange("https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=600&auto=format&fit=cover");
                          createForm.setValue("photoFileName", "mock_location.jpg");
                        }}>
                          <ImageIcon size={24} color={colors.textSecondary} />
                          <Text style={s(styles.mediaUploadHelperPrimaryText)}>Click to upload location photo</Text>
                          <Text style={s(styles.mediaUploadHelperSecondaryText)}>JPG, PNG up to 5MB</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                />
              </View>
            </ScrollView>

            <View style={s(styles.modalActionsFooterPane)}>
              <TouchableOpacity style={s(styles.modalFooterDismissBtn)} onPress={() => setIsCreateOpen(false)}>
                <Text style={s(styles.modalFooterDismissBtnText)}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s(styles.modalFooterSubmitBtn)} onPress={createForm.handleSubmit(onCreateLocation)}>
                <Plus size={14} color="#ffffff" />
                <Text style={s(styles.modalFooterSubmitBtnText)}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={isEditOpen} transparent animationType="slide">
        <View style={s(styles.modalOverlayMask)}>
          <View style={s(styles.modalContentBoxContainer)}>
            <View style={s(styles.modalHeaderBar)}>
              <View style={s(styles.modalHeaderTitleLayoutRow)}>
                <MapPin size={18} color={colors.primary} />
                <Text style={s(styles.modalHeaderTitleText)}>Edit Location</Text>
              </View>
              <TouchableOpacity onPress={() => setIsEditOpen(false)}>
                <X size={18} color={colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={s(styles.modalHeaderSubtitleText)}>Edit location details.</Text>

            {locationDetailQuery.isLoading ? (
              <View style={s(styles.loadingBoxArea)}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={s(styles.loadingBoxText)}>Fetching location details...</Text>
              </View>
            ) : (
              <ScrollView contentContainerStyle={s(styles.formScrollViewScrollableArea)}>
                <View style={s(styles.formInputGroupBlock)}>
                  <Text style={s(styles.formInputGroupLabelText)}>Name</Text>
                  <Controller
                    control={editForm.control}
                    name="name"
                    render={({ field: { onChange, value }, fieldState: { error } }) => (
                      <View>
                        <TextInput style={s(styles.formInputTextControlField)} placeholder="e.g. Warehouse B" placeholderTextColor={colors.textSecondary} onChangeText={onChange} value={value} />
                        {error && <Text style={s(styles.formInputGroupErrorMessage)}>{error.message}</Text>}
                      </View>
                    )}
                  />
                </View>

                <View style={s(styles.formInputGroupBlock)}>
                  <Text style={s(styles.formInputGroupLabelText)}>Type</Text>
                  <Controller
                    control={editForm.control}
                    name="type"
                    render={({ field: { onChange, value } }) => (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s(styles.horizontalPickerOptionScroller)}>
                        {(["office", "warehouse", "facility", "site"] as const).map((typeOption) => {
                          const isSelected = value === typeOption;
                          return (
                            <TouchableOpacity
                              key={typeOption}
                              style={s([styles.pickerOptionCapsuleBtn, { backgroundColor: isSelected ? colors.primary : colors.cardBg, borderColor: colors.border }])}
                              onPress={() => onChange(typeOption)}
                            >
                              <Text style={s([styles.pickerOptionCapsuleBtnText, { color: isSelected ? "#ffffff" : colors.text }])}>{typeOption}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    )}
                  />
                </View>

                <View style={s(styles.formInputGroupBlock)}>
                  <Text style={s(styles.formInputGroupLabelText)}>Status</Text>
                  <Controller
                    control={editForm.control}
                    name="status"
                    render={({ field: { onChange, value } }) => (
                      <View style={s({ flexDirection: "row", gap: 10 })}>
                        {(["active", "inactive"] as const).map((statusOption) => {
                          const isSelected = value === statusOption;
                          return (
                            <TouchableOpacity
                              key={statusOption}
                              style={s([styles.pickerOptionCapsuleBtn, { backgroundColor: isSelected ? colors.primary : colors.cardBg, borderColor: colors.border, flex: 1, alignItems: "center" }])}
                              onPress={() => onChange(statusOption)}
                            >
                              <Text style={s([styles.pickerOptionCapsuleBtnText, { color: isSelected ? "#ffffff" : colors.text }])}>{statusOption}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  />
                </View>

                <View style={s(styles.formInputGroupBlock)}>
                  <Text style={s(styles.formInputGroupLabelText)}>Country</Text>
                  <Controller
                    control={editForm.control}
                    name="country"
                    render={({ field: { onChange, value }, fieldState: { error } }) => (
                      <View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s(styles.horizontalPickerOptionScroller)}>
                          {COUNTRIES_LIST.map((cty) => {
                            const isSelected = value === cty;
                            return (
                              <TouchableOpacity
                                key={cty}
                                style={s([styles.pickerOptionCapsuleBtn, { backgroundColor: isSelected ? colors.primary : colors.cardBg, borderColor: colors.border }])}
                                onPress={() => onChange(cty)}
                              >
                                <Text style={s([styles.pickerOptionCapsuleBtnText, { color: isSelected ? "#ffffff" : colors.text }])}>
                                  {countryFlags[cty]} {cty}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                        {error && <Text style={s(styles.formInputGroupErrorMessage)}>{error.message}</Text>}
                      </View>
                    )}
                  />
                </View>

                <View style={s(styles.formInputGroupBlock)}>
                  <Text style={s(styles.formInputGroupLabelText)}>City</Text>
                  <Controller
                    control={editForm.control}
                    name="city"
                    render={({ field: { onChange, value }, fieldState: { error } }) => (
                      <View>
                        <TextInput style={s(styles.formInputTextControlField)} placeholder="e.g. New York, NY 10001" placeholderTextColor={colors.textSecondary} onChangeText={onChange} value={value} />
                        {error && <Text style={s(styles.formInputGroupErrorMessage)}>{error.message}</Text>}
                      </View>
                    )}
                  />
                </View>

                <View style={s(styles.formInputGroupBlock)}>
                  <Text style={s(styles.formInputGroupLabelText)}>Phone</Text>
                  <Controller
                    control={editForm.control}
                    name="contactPhone"
                    render={({ field: { onChange, value } }) => (
                      <TextInput style={s(styles.formInputTextControlField)} placeholder="e.g. +1 (555) 123-4567" placeholderTextColor={colors.textSecondary} onChangeText={onChange} value={value} />
                    )}
                  />
                </View>

                <View style={s(styles.formInputGroupBlock)}>
                  <Text style={s(styles.formInputGroupLabelText)}>Manager</Text>
                  <Controller
                    control={editForm.control}
                    name="contactName"
                    render={({ field: { onChange, value } }) => (
                      <TextInput style={s(styles.formInputTextControlField)} placeholder="e.g. John Smith" placeholderTextColor={colors.textSecondary} onChangeText={onChange} value={value} />
                    )}
                  />
                </View>

                <View style={s(styles.formInputGroupBlock)}>
                  <Text style={s(styles.formInputGroupLabelText)}>Employees</Text>
                  <Controller
                    control={editForm.control}
                    name="tasksCount"
                    render={({ field: { onChange, value } }) => (
                      <TextInput style={s(styles.formInputTextControlField)} keyboardType="numeric" placeholder="0" placeholderTextColor={colors.textSecondary} onChangeText={(text) => onChange(Number(text) || 0)} value={String(value || "")} />
                    )}
                  />
                </View>

                <View style={s(styles.formInputGroupBlock)}>
                  <Text style={s(styles.formInputGroupLabelText)}>Location Photo</Text>
                  <Controller
                    control={editForm.control}
                    name="photoDataUrl"
                    render={({ field: { onChange, value } }) => (
                      <View>
                        {value ? (
                          <View style={s(styles.mediaUploadWorkspaceBox)}>
                            <View style={s(styles.mediaUploadPreviewFrame)}>
                              <Image source={{ uri: value }} style={s(styles.mediaUploadPreviewImageElement)} />
                              <TouchableOpacity style={s(styles.mediaUploadRemoveOverlayBtn)} onPress={() => { onChange(""); editForm.setValue("photoFileName", ""); }}>
                                <X size={14} color="#ffffff" />
                              </TouchableOpacity>
                            </View>
                          </View>
                        ) : (
                          <TouchableOpacity style={s(styles.mediaUploadWorkspaceBox)} onPress={() => {
                            onChange("https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=600&auto=format&fit=cover");
                            editForm.setValue("photoFileName", "mock_location.jpg");
                          }}>
                            <ImageIcon size={24} color={colors.textSecondary} />
                            <Text style={s(styles.mediaUploadHelperPrimaryText)}>Click to upload location photo</Text>
                            <Text style={s(styles.mediaUploadHelperSecondaryText)}>JPG, PNG up to 5MB</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  />
                </View>
              </ScrollView>
            )}

            <View style={s(styles.modalActionsFooterPane)}>
              <TouchableOpacity style={s(styles.modalFooterDismissBtn)} onPress={() => setIsEditOpen(false)}>
                <Text style={s(styles.modalFooterDismissBtnText)}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s(styles.modalFooterSubmitBtn)} onPress={editForm.handleSubmit(onEditLocation)}>
                <Save size={14} color="#ffffff" />
                <Text style={s(styles.modalFooterSubmitBtnText)}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={isViewOpen} transparent animationType="slide">
        <View style={s(styles.modalOverlayMask)}>
          <View style={s(styles.modalContentBoxContainer)}>
            <View style={s(styles.modalHeaderBar)}>
              <View style={s(styles.modalHeaderTitleLayoutRow)}>
                <MapPin size={18} color={colors.primary} />
                <Text style={s(styles.modalHeaderTitleText)}>Location Details</Text>
              </View>
              <TouchableOpacity onPress={() => setIsViewOpen(false)}>
                <X size={18} color={colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={s(styles.modalHeaderSubtitleText)}>View location information.</Text>

            {locationDetailQuery.isLoading ? (
              <View style={s(styles.loadingBoxArea)}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={s(styles.loadingBoxText)}>Loading details...</Text>
              </View>
            ) : activeLocation ? (
              <ScrollView contentContainerStyle={s(styles.formScrollViewScrollableArea)}>
                {activeLocation.photoDataUrl && (
                  <Image source={{ uri: activeLocation.photoDataUrl }} style={s(styles.viewDialogMediaHeroBanner)} resizeMode="cover" />
                )}

                <View style={s(styles.viewDialogGridSystem)}>
                  <View style={s(styles.viewDialogGridColumnUnit)}>
                    <Text style={s(styles.viewDialogFieldMetaLabelText)}>Name</Text>
                    <Text style={s(styles.viewDialogFieldMetaValueText)}>{activeLocation.name}</Text>
                  </View>

                  <View style={s(styles.viewDialogGridColumnUnit)}>
                    <Text style={s(styles.viewDialogFieldMetaLabelText)}>Type</Text>
                    <View style={s([styles.inlineBadgeTypeCapsule, { backgroundColor: typeStylesMap[activeLocation.type]?.bg }])}>
                      <Text style={s([styles.inlineBadgeTypeLabel, { color: typeStylesMap[activeLocation.type]?.text }])}>
                        {activeLocation.type}
                      </Text>
                    </View>
                  </View>

                  <View style={s(styles.viewDialogGridColumnUnit)}>
                    <Text style={s(styles.viewDialogFieldMetaLabelText)}>Country</Text>
                    <Text style={s(styles.viewDialogFieldMetaValueText)}>
                      {countryFlags[activeLocation.country] || ""} {activeLocation.country}
                    </Text>
                  </View>

                  <View style={s(styles.viewDialogGridColumnUnit)}>
                    <Text style={s(styles.viewDialogFieldMetaLabelText)}>City</Text>
                    <Text style={s(styles.viewDialogFieldMetaValueText)}>{activeLocation.city}</Text>
                  </View>

                  <View style={s(styles.viewDialogGridColumnUnit)}>
                    <Text style={s(styles.viewDialogFieldMetaLabelText)}>Phone</Text>
                    <Text style={s(styles.viewDialogFieldMetaValueText)}>{activeLocation.phone || "—"}</Text>
                  </View>

                  <View style={s(styles.viewDialogGridColumnUnit)}>
                    <Text style={s(styles.viewDialogFieldMetaLabelText)}>Manager</Text>
                    <Text style={s(styles.viewDialogFieldMetaValueText)}>{activeLocation.manager || "—"}</Text>
                  </View>

                  <View style={s(styles.viewDialogGridColumnUnit)}>
                    <Text style={s(styles.viewDialogFieldMetaLabelText)}>Employees</Text>
                    <Text style={s(styles.viewDialogFieldMetaValueText)}>{activeLocation.employeeCount}</Text>
                  </View>

                  <View style={s(styles.viewDialogGridColumnUnit)}>
                    <Text style={s(styles.viewDialogFieldMetaLabelText)}>Status</Text>
                    <View style={s(styles.inlineBadgeStatusRowFlex)}>
                      <View style={s([styles.inlineBadgeStatusDot, { backgroundColor: activeLocation.status === "active" ? colors.success : colors.textSecondary }])} />
                      <Text style={s([styles.inlineBadgeStatusLabel, { color: activeLocation.status === "active" ? colors.success : colors.textSecondary }])}>
                        {activeLocation.status}
                      </Text>
                    </View>
                  </View>
                </View>
              </ScrollView>
            ) : null}

            <View style={s(styles.modalActionsFooterPane)}>
              <TouchableOpacity style={s(styles.modalFooterDismissBtn)} onPress={() => setIsViewOpen(false)}>
                <Text style={s(styles.modalFooterDismissBtnText)}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s(styles.modalFooterSubmitBtn)} onPress={triggerEditOption}>
                <Text style={s(styles.modalFooterSubmitBtnText)}>Edit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={isActionSheetOpen} transparent animationType="fade">
        <TouchableOpacity style={s(styles.actionSheetDrawerPanelOverlay)} activeOpacity={1} onPress={() => setIsActionSheetOpen(false)}>
          <View style={s(styles.actionSheetDrawerPanelSheet)}>
            <View style={s(styles.actionSheetHeaderBlock)}>
              <Text style={s(styles.actionSheetHeaderTitleText)}>Location Actions</Text>
              <TouchableOpacity onPress={() => setIsActionSheetOpen(false)}>
                <X size={16} color={colors.text} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={s(styles.actionSheetOptionRowLink)} onPress={triggerViewOption}>
              <Text style={s(styles.actionSheetOptionRowLinkText)}>View Details</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s(styles.actionSheetOptionRowLink)} onPress={triggerEditOption}>
              <Text style={s(styles.actionSheetOptionRowLinkText)}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s(styles.actionSheetOptionRowLink)} onPress={triggerDeleteOption}>
              <Text style={s([styles.actionSheetOptionRowLinkText, { color: colors.danger }])}>Delete</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={isDeleteOpen} transparent animationType="fade">
        <View style={s(styles.modalOverlayMask)}>
          <View style={s(styles.alertDialogContainerFrame)}>
            <Text style={s(styles.alertDialogHeadingText)}>Delete location?</Text>
            <Text style={s(styles.alertDialogDescriptionText)}>
              This action cannot be undone. This will permanently remove the location.
            </Text>
            <View style={s(styles.alertDialogActionsRowFlex)}>
              <TouchableOpacity style={s(styles.alertDialogCancelBtn)} onPress={() => setIsDeleteOpen(false)}>
                <Text style={s(styles.alertDialogCancelBtnText)}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s(styles.alertDialogConfirmDeleteBtn)} onPress={confirmDelete}>
                <Text style={s(styles.alertDialogConfirmDeleteBtnText)}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}