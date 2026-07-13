import React, { useEffect, useMemo, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  Switch,
  Dimensions,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import {
  RefreshCw,
  Upload,
  Trash2,
  Eye,
} from "lucide-react-native";
import { apiFetch, toProxiedUrl } from "@/lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";

interface MemeItem {
  id: string;
  imageUrl: string;
  caption?: string;
  category?: string;
  isActive: boolean;
  createdAt?: string;
}

interface TopMeme {
  memeId: string;
  views: number;
  imageUrl: string;
  caption?: string;
  category?: string;
  isActive: boolean;
}

interface Stats {
  totalMemes: number;
  activeMemes: number;
  totalViews: number;
  top: TopMeme[];
}

const categories = ["motivational", "funny", "productivity", "general"] as const;
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = (SCREEN_WIDTH - 80) / 2;

export default function Memes() {
  const { uiTheme } = useTheme();
  const isDark = (uiTheme.theme as string) === "dark" || (uiTheme.theme as string) === "metallic-elite";

  const colors = useMemo(() => ({
    background: uiTheme.panelColors?.dashboardBackground || (isDark ? "#0f172a" : "#f8fafc"),
    cardBg: uiTheme.panelColors?.dashboardCardBackground || (isDark ? "#1e293b" : "#ffffff"),
    text: uiTheme.panelColors?.dashboardTextColor || (isDark ? "#f8fafc" : "#0f172a"),
    mutedText: isDark ? "#94a3b8" : "#64748b",
    border: isDark ? "#334155" : "#e2e8f0",
    inputBg: isDark ? "#0f172a" : "#ffffff",
    inputBorder: isDark ? "#334155" : "#d1d5db",
    inputText: isDark ? "#f8fafc" : "#111827",
    primary: uiTheme.customColors?.primary || "#3b82f6",
    primaryMuted: isDark ? "rgba(59, 130, 246, 0.2)" : "rgba(59, 130, 246, 0.1)",
    chipUnselected: isDark ? "#334155" : "#e2e8f0",
    activeDot: "#10B981",
    inactiveDot: isDark ? "#64748b" : "#94a3b8",
    dangerBg: "rgba(239, 68, 68, 0.15)",
    dangerBorder: "rgba(239, 68, 68, 0.3)",
    dangerText: isDark ? "#f87171" : "#dc2626",
    trackFalse: isDark ? "#334155" : "#cbd5e1",
    trackTrue: "#3b82f6",
    white: "#ffffff"
  }), [uiTheme, isDark]);

  const styles = useMemo(() => createStyles(colors), [colors]);

  const [items, setItems] = useState<MemeItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [category, setCategory] = useState<(typeof categories)[number]>("motivational");
  const [active, setActive] = useState(true);

  const pickImage = async () => {
    setErr("");
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert("Permission Denied", "System access to media galleries is required to upload assets.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled && result.assets?.[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch (pickerError) {
      setErr("Failed to open media resource container.");
    }
  };

  async function refresh() {
    setLoading(true);
    setErr("");
    try {
      const [list, s] = await Promise.all([
        apiFetch<{ items: any[] }>("/api/meme/admin/list", { method: "GET" }),
        apiFetch<Stats>("/api/meme/admin/stats", { method: "GET" }),
      ]);
      
      setItems(
        (list.items || []).map((m) => ({
          id: String(m.id || m._id || ""),
          imageUrl: String(m.imageUrl || ""),
          caption: String(m.caption || ""),
          category: String(m.category || "general"),
          isActive: Boolean(m.isActive),
          createdAt: m.createdAt ? String(m.createdAt) : undefined,
        }))
      );
      setStats(s);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function onUpload() {
    if (!imageUri) {
      setErr("Please choose a valid image asset from system gallery.");
      return;
    }
    setLoading(true);
    setErr("");
    try {
      const fd = new FormData();
      
      fd.append("file", {
        uri: imageUri,
        name: "meme_upload.jpg",
        type: "image/jpeg",
      } as any);
      
      fd.append("caption", caption);
      fd.append("category", category);
      fd.append("isActive", active ? "true" : "false");

      await apiFetch<{ item: MemeItem }>("/api/meme/admin/upload", {
        method: "POST",
        body: fd,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setImageUri(null);
      setCaption("");
      setCategory("motivational");
      setActive(true);
      Alert.alert("Success", "Meme asset published to CDN distribution paths.");
      await refresh();
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(id: string, isActive: boolean) {
    setLoading(true);
    setErr("");
    try {
      await apiFetch<{ item: MemeItem }>(`/api/meme/admin/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !isActive }),
      });
      await refresh();
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  async function remove(id: string) {
    Alert.alert(
      "Confirm Action",
      "Are you sure you want to permanently purge this meme asset record from active system repositories?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            setErr("");
            try {
              await apiFetch<{ ok: true }>(`/api/meme/admin/${encodeURIComponent(id)}`, {
                method: "DELETE",
              });
              await refresh();
            } catch (e: any) {
              setErr(String(e?.message || e));
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.headerBlockInlineRow}>
        <View style={styles.headerTitlesStack}>
          <Text style={styles.mainTitleText}>Memes Dashboard</Text>
          <Text style={styles.subTitleDescription}>
            Upload, activate/deactivate, delete, and view delivery stats.
          </Text>
        </View>

        <TouchableOpacity style={styles.refreshTouchableIconBtn} onPress={refresh} disabled={loading}>
          <RefreshCw size={16} color={colors.text} style={loading ? styles.rotatingLoaderIcon : undefined} />
        </TouchableOpacity>
      </View>

      {err ? (
        <View style={styles.errorBannerContainer}>
          <Text style={styles.errorBannerTextContent}>{err}</Text>
        </View>
      ) : null}

      {stats ? (
        <View style={styles.metricsGridContainer}>
          <View style={styles.metricCardItemField}>
            <Text style={styles.metricCardMiniLabelText}>Total Memes</Text>
            <Text style={styles.metricCardValueMetricDisplay}>{stats.totalMemes}</Text>
          </View>
          <View style={styles.metricCardItemField}>
            <Text style={styles.metricCardMiniLabelText}>Active Nodes</Text>
            <Text style={styles.metricCardValueMetricDisplay}>{stats.activeMemes}</Text>
          </View>
          <View style={[styles.metricCardItemField, { width: "100%" }]}>
            <Text style={styles.metricCardMiniLabelText}>Total Views (Impressions)</Text>
            <View style={styles.inlineIconLabelWrapper}>
              <Eye size={14} color={colors.mutedText} />
              <Text style={styles.metricCardValueMetricDisplay}>{stats.totalViews}</Text>
            </View>
          </View>
        </View>
      ) : null}

      <View style={styles.formContainerContentCard}>
        <Text style={styles.formSectionHeaderTitle}>Publish Meme Asset</Text>
        
        <TouchableOpacity style={styles.nativeImagePickerTouchSurface} onPress={pickImage}>
          {imageUri ? (
            <View style={styles.previewImageContainerWrapper}>
              <Image source={{ uri: imageUri }} style={styles.formInputSourcePreviewImage} />
              <View style={styles.changeOverlayHintBadge}>
                <Text style={styles.changeOverlayHintBadgeText}>Tap to swap image file</Text>
              </View>
            </View>
          ) : (
            <View style={styles.emptyPickerInteractiveGraphicBlock}>
              <Upload size={24} color={colors.mutedText} style={styles.genericCenterIconSpacing} />
              <Text style={styles.pickerPrimaryActionText}>Select Meme Image</Text>
              <Text style={styles.pickerSecondaryConstraintsLabel}>JPG / PNG preferred resolution bounds</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.formInputsVerticalWrapperStack}>
          <View style={styles.formInputFieldGroup}>
            <Text style={styles.inputFieldFormLevelLabel}>CAPTION TEXT (OPTIONAL)</Text>
            <TextInput
              style={styles.textInputLineBound}
              value={caption}
              onChangeText={setCaption}
              placeholder="Stay sharp..."
              placeholderTextColor={colors.mutedText}
            />
          </View>

          <View style={styles.formInputFieldGroup}>
            <Text style={styles.inputFieldFormLevelLabel}>CATEGORY</Text>
            <View style={styles.horizontalChipsCategoryLayoutRow}>
              {categories.map((c) => {
                const isSelected = category === c;
                return (
                  <TouchableOpacity
                    key={c}
                    style={[styles.categoryChipItemNode, isSelected ? styles.categoryChipItemNodeSelected : null]}
                    onPress={() => setCategory(c)}
                  >
                    <Text style={[styles.categoryChipItemText, isSelected ? styles.categoryChipItemTextSelected : null]}>
                      {c}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.formInlineToggleSystemRow}>
            <View style={styles.toggleTextLabelsGroup}>
              <Text style={styles.toggleMainLabelText}>Active</Text>
            </View>
            <Switch
              value={active}
              onValueChange={setActive}
              trackColor={{ false: colors.trackFalse, true: colors.trackTrue }}
              thumbColor={colors.white}
            />
          </View>

          <TouchableOpacity
            style={[styles.primaryActionUploadSubmitBtn, (!imageUri || loading) ? styles.disabledButtonState : null]}
            onPress={onUpload}
            disabled={!imageUri || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.primaryActionUploadSubmitBtnText}>Upload Meme Asset</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.formContainerContentCard}>
        <View style={styles.feedCardHeaderBlockRowInline}>
          <Text style={styles.formSectionHeaderTitle}>All memes</Text>
          <Text style={styles.itemsCounterLabelText}>{items.length} items</Text>
        </View>

        <View style={styles.twoColumnGridFlexWrapperRow}>
          {items.map((m) => {
            const resolvedImgSrc = toProxiedUrl(m.imageUrl) || m.imageUrl;
            return (
              <View key={m.id} style={styles.gridMemeThumbnailItemCard}>
                <View style={styles.gridImageCroppingBoxContainer}>
                  <Image source={{ uri: resolvedImgSrc }} style={styles.gridAssetRenderedImage} />
                </View>

                <View style={styles.gridItemCardDataMetaDescriptionBody}>
                  <View style={styles.badgeLabelContainerInlineRow}>
                    <Text style={styles.gridItemCardCategoryLabelText}>{m.category}</Text>
                    <View style={[styles.statusIndicatorMicroDotNode, m.isActive ? styles.bgDotActive : styles.bgDotInactive]} />
                  </View>

                  <Text style={styles.gridItemCardCaptionContentText} numberOfLines={2}>
                    {m.caption || "(no operational caption recorded)"}
                  </Text>

                  <View style={styles.gridCardActionManagementButtonRow}>
                    <TouchableOpacity
                      style={styles.bgLinkBtnGray}
                      onPress={() => toggleActive(m.id, m.isActive)}
                    >
                      <Text style={styles.gridActionContextLinkBtnText}>
                        {m.isActive ? "Mute" : "Live"}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.bgLinkBtnDanger}
                      onPress={() => remove(m.id)}
                    >
                      <Trash2 size={12} color={colors.dangerText} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {stats?.top?.length ? (
        <View style={styles.formContainerContentCard}>
          <Text style={styles.formSectionHeaderTitle}>Top viewed</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScrollGapContainer}>
            {stats.top.map((t) => {
              const topImgSrc = toProxiedUrl(t.imageUrl) || t.imageUrl;
              return (
                <View key={t.memeId} style={styles.horizontalTopPerformerAssetCard}>
                  <Image source={{ uri: topImgSrc }} style={styles.horizontalTopPerformerImage} />
                  <View style={styles.horizontalTopPerformerOverlayMeta}>
                    <Text style={styles.horizontalTopPerformerViewsCountText}>{t.views} views</Text>
                    <Text style={styles.horizontalTopPerformerCaptionText} numberOfLines={1}>
                      {t.caption || "Untitled Node"}
                    </Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      ) : null}
    </ScrollView>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      padding: 16,
      gap: 16,
    },
    headerBlockInlineRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 12,
    },
    headerTitlesStack: {
      flex: 1,
      gap: 4,
    },
    mainTitleText: {
      fontSize: 22,
      fontWeight: "700",
      color: colors.text,
    },
    subTitleDescription: {
      fontSize: 13,
      color: colors.mutedText,
      lineHeight: 18,
    },
    refreshTouchableIconBtn: {
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      width: 38,
      height: 38,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
    },
    rotatingLoaderIcon: {
      opacity: 0.6,
    },
    errorBannerContainer: {
      backgroundColor: colors.dangerBg,
      borderWidth: 1,
      borderColor: colors.dangerBorder,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    errorBannerTextContent: {
      fontSize: 13,
      color: colors.dangerText,
    },
    metricsGridContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    metricCardItemField: {
      flex: 1,
      minWidth: (SCREEN_WIDTH - 42) / 2,
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      padding: 12,
      gap: 4,
    },
    metricCardMiniLabelText: {
      fontSize: 12,
      color: colors.mutedText,
    },
    metricCardValueMetricDisplay: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.text,
    },
    inlineIconLabelWrapper: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    formContainerContentCard: {
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 16,
      gap: 14,
    },
    formSectionHeaderTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
    },
    nativeImagePickerTouchSurface: {
      width: "100%",
      minHeight: 140,
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: colors.border,
      borderRadius: 10,
      overflow: "hidden",
      alignItems: "center",
      justifyContent: "center",
    },
    emptyPickerInteractiveGraphicBlock: {
      padding: 24,
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
    },
    genericCenterIconSpacing: {
      marginBottom: 4,
    },
    pickerPrimaryActionText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.mutedText,
    },
    pickerSecondaryConstraintsLabel: {
      fontSize: 11,
      color: colors.mutedText,
      textAlign: "center",
    },
    previewImageContainerWrapper: {
      width: "100%",
      height: 180,
      position: "relative",
    },
    formInputSourcePreviewImage: {
      width: "100%",
      height: "100%",
      resizeMode: "cover",
    },
    changeOverlayHintBadge: {
      position: "absolute",
      bottom: 8,
      right: 8,
      backgroundColor: "rgba(0,0,0,0.6)",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
    },
    changeOverlayHintBadgeText: {
      fontSize: 10,
      color: "#FFF",
      fontWeight: "500",
    },
    formInputsVerticalWrapperStack: {
      gap: 12,
    },
    formInputFieldGroup: {
      gap: 6,
    },
    inputFieldFormLevelLabel: {
      fontSize: 10,
      fontWeight: "700",
      color: colors.mutedText,
      letterSpacing: 0.5,
    },
    textInputLineBound: {
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 8,
      height: 40,
      paddingHorizontal: 12,
      color: colors.inputText,
      fontSize: 13,
    },
    horizontalChipsCategoryLayoutRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
    },
    categoryChipItemNode: {
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 6,
    },
    categoryChipItemNodeSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryMuted,
    },
    categoryChipItemText: {
      fontSize: 12,
      color: colors.mutedText,
      textTransform: "capitalize",
    },
    categoryChipItemTextSelected: {
      color: colors.primary,
      fontWeight: "600",
    },
    formInlineToggleSystemRow: {
      flexDirection: "row",
      justifyContent: "flex-end",
      alignItems: "center",
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      padding: 10,
      borderRadius: 8,
      gap: 12,
      marginVertical: 4,
    },
    toggleTextLabelsGroup: {
      flex: 1,
      gap: 2,
    },
    toggleMainLabelText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.text,
    },
    primaryActionUploadSubmitBtn: {
      backgroundColor: colors.primary,
      height: 42,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 6,
    },
    disabledButtonState: {
      opacity: 0.4,
    },
    primaryActionUploadSubmitBtnText: {
      fontSize: 14,
      fontWeight: "600",
      color: "#FFF",
    },
    feedCardHeaderBlockRowInline: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    itemsCounterLabelText: {
      fontSize: 12,
      color: colors.mutedText,
    },
    twoColumnGridFlexWrapperRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    gridMemeThumbnailItemCard: {
      width: CARD_WIDTH,
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 10,
      overflow: "hidden",
    },
    gridImageCroppingBoxContainer: {
      width: "100%",
      aspectRatio: 1,
      backgroundColor: "#000",
    },
    gridAssetRenderedImage: {
      width: "100%",
      height: "100%",
      resizeMode: "cover",
    },
    gridItemCardDataMetaDescriptionBody: {
      padding: 10,
      gap: 6,
    },
    badgeLabelContainerInlineRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    gridItemCardCategoryLabelText: {
      fontSize: 11,
      color: colors.mutedText,
      textTransform: "uppercase",
      fontWeight: "500",
    },
    statusIndicatorMicroDotNode: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    bgDotActive: { backgroundColor: colors.activeDot },
    bgDotInactive: { backgroundColor: colors.inactiveDot },
    gridItemCardCaptionContentText: {
      fontSize: 12,
      color: colors.mutedText,
      lineHeight: 16,
      height: 32,
    },
    gridCardActionManagementButtonRow: {
      flexDirection: "row",
      gap: 6,
      marginTop: 4,
    },
    bgLinkBtnGray: {
      flex: 1,
      height: 28,
      borderRadius: 6,
      justifyContent: "center",
      alignItems: "center",
      flexDirection: "row",
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    bgLinkBtnDanger: {
      width: 28,
      height: 28,
      borderRadius: 6,
      justifyContent: "center",
      alignItems: "center",
      flexDirection: "row",
      backgroundColor: colors.dangerBg,
      borderWidth: 1,
      borderColor: colors.dangerBorder,
    },
    gridActionContextLinkBtnText: {
      fontSize: 11,
      color: colors.text,
      fontWeight: "600",
    },
    horizontalScrollGapContainer: {
      gap: 12,
      paddingRight: 16,
    },
    horizontalTopPerformerAssetCard: {
      width: 140,
      height: 140,
      borderRadius: 10,
      overflow: "hidden",
      position: "relative",
      backgroundColor: "#000",
    },
    horizontalTopPerformerImage: {
      width: "100%",
      height: "100%",
      resizeMode: "cover",
      opacity: 0.7,
    },
    horizontalTopPerformerOverlayMeta: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      padding: 8,
      backgroundColor: "rgba(0,0,0,0.5)",
      gap: 1,
    },
    horizontalTopPerformerViewsCountText: {
      fontSize: 10,
      fontWeight: "700",
      color: colors.primary,
    },
    horizontalTopPerformerCaptionText: {
      fontSize: 11,
      color: "#FFF",
    },
  });
}