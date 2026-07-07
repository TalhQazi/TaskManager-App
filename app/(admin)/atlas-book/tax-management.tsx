import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  SafeAreaView,
  Dimensions,
  Platform,
} from "react-native";
import { apiFetch } from "@/lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Scale,
  Plus,
  RefreshCw,
  Calculator,
  ChevronDown,
  X,
} from "lucide-react-native";
import { s } from "@/util/styles";

const { height } = Dimensions.get("window");

interface AccountItem {
  _id: string;
  name: string;
  type: string;
}

interface TaxRule {
  _id: string;
  country: string;
  taxName: string;
  rate: number;
  account?: {
    name: string;
  };
}

interface TaxForm {
  country: string;
  taxName: string;
  rate: string;
  account: string;
}

interface ApiResponse<T> {
  success: boolean;
  items?: T[];
}

function buildColors(uiTheme: any, isDark: boolean) {
  return {
    background:         uiTheme.panelColors?.dashboardBackground     || (isDark ? "#09090b" : "#F8FAFC"),
    cardBg:             uiTheme.panelColors?.dashboardCardBackground || (isDark ? "#18181b" : "#FFFFFF"),
    text:               uiTheme.panelColors?.dashboardTextColor      || (isDark ? "#F4F4F5" : "#0F172A"),
    textSecondary:      isDark ? "#A1A1AA" : "#475569",
    textMuted:          isDark ? "#71717A" : "#64748B",
    border:             isDark ? "#27272A" : "#E2E8F0",
    borderLight:        isDark ? "rgba(255,255,255,0.05)" : "#F1F5F9",
    inputBg:            isDark ? "#09090b" : "#FFFFFF",
    primary:            uiTheme.customColors?.primary || "#B45309",
    primaryText:        "#FFFFFF",
    primaryTranslucent: isDark ? "rgba(180, 83, 9, 0.25)" : "rgba(180, 83, 9, 0.1)",
    statusActiveBg:     isDark ? "rgba(16, 185, 129, 0.2)" : "#10B981",
    statusActiveText:   isDark ? "#34D399" : "#FFFFFF",
    overlayBg:          "rgba(0, 0, 0, 0.4)",
  };
}

function createStyles(colors: ReturnType<typeof buildColors>) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContainer: {
      paddingHorizontal: 16,
      paddingBottom: 32,
    },
    headerBlock: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 12,
    },
    headerTopRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 6,
    },
    titleContainer: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
      marginRight: 8,
    },
    headerIcon: {
      marginRight: 8,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: "800",
      color: colors.text,
      letterSpacing: -0.5,
    },
    headerActionsRow: {
      flexDirection: "row",
      gap: 8,
    },
    iconActionButton: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.cardBg,
      padding: 10,
      borderRadius: 8,
      justifyContent: "center",
      alignItems: "center",
    },
    disabledOpacity: {
      opacity: 0.4,
    },
    primaryActionButton: {
      flexDirection: "row",
      backgroundColor: colors.primary,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 8,
      alignItems: "center",
      gap: 6,
    },
    primaryActionText: {
      color: colors.primaryText,
      fontSize: 13,
      fontWeight: "600",
    },
    headerSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    kpiContainerRow: {
      paddingHorizontal: 16,
      marginBottom: 16,
    },
    kpiCardFrame: {
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      maxWidth: 340,
    },
    kpiIconBox: {
      padding: 10,
      backgroundColor: colors.primaryTranslucent,
      borderRadius: 10,
      width: 40,
      height: 40,
      justifyContent: "center",
      alignItems: "center",
    },
    kpiDataBox: {
      flex: 1,
    },
    kpiCardMetaLabel: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.primary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 2,
    },
    kpiCardNumericHeading: {
      fontSize: 22,
      fontWeight: "900",
      color: colors.text,
    },
    tableCardHeaderStrip: {
      marginHorizontal: 16,
      marginBottom: 8,
      paddingTop: 4,
    },
    tableHeadingText: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.text,
    },
    centerLoadingState: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: 40,
    },
    emptyStateContainer: {
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      marginHorizontal: 16,
      padding: 32,
      alignItems: "center",
    },
    emptyStateText: {
      fontSize: 13,
      color: colors.textMuted,
      fontStyle: "italic",
    },
    tableCanvasCard: {
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      overflow: "hidden",
    },
    tableHeaderRowFrame: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.borderLight,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    tableHeaderLabelText: {
      fontSize: 9,
      fontWeight: "700",
      color: colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.1,
    },
    colRegion: {
      flex: 1.5,
      paddingRight: 4,
    },
    colType: {
      flex: 1.1,
      paddingRight: 4,
    },
    colRate: {
      flex: 1.1,
      alignItems: "flex-end",
      paddingRight: 6,
    },
    colAccount: {
      flex: 1.6,
      paddingRight: 4,
    },
    colStatus: {
      flex: 0.8,
      alignItems: "flex-end",
    },
    textAlignRight: {
      textAlign: "right",
    },
    tableBodyRowFrame: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    countryLabelText: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.text,
    },
    typeBadgeOutlineFrame: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 4,
      paddingHorizontal: 4,
      paddingVertical: 2,
      backgroundColor: colors.borderLight,
      alignSelf: "flex-start",
    },
    typeBadgeInnerText: {
      fontSize: 9,
      fontWeight: "700",
      color: colors.textSecondary,
    },
    linkedAccountLabelSubtext: {
      fontSize: 11,
      color: colors.textMuted,
      fontStyle: "italic",
    },
    rateValueMonoBoldText: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.primary,
      fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    },
    activeStatusSolidBadgeFrame: {
      backgroundColor: colors.statusActiveBg,
      borderRadius: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    activeStatusSolidBadgeInnerText: {
      color: colors.statusActiveText,
      fontSize: 9,
      fontWeight: "700",
    },
    modalBlurOverlay: {
      flex: 1,
      backgroundColor: colors.overlayBg,
      justifyContent: "flex-end",
      position: "relative",
    },
    modalContentCard: {
      backgroundColor: colors.cardBg,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      width: "100%",
      maxHeight: height * 0.85,
      padding: 20,
    },
    modalCardHeaderTopRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
      paddingBottom: 12,
    },
    modalCardTitleHeading: {
      fontSize: 18,
      fontWeight: "800",
      color: colors.text,
    },
    closeModalCrossButton: {
      padding: 4,
    },
    modalFormScrollContainer: {
      flexGrow: 0,
      marginBottom: 8,
    },
    formElementWrapperFieldBlock: {
      marginBottom: 14,
    },
    formSplitColumnsContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 12,
      marginBottom: 14,
    },
    formSplitFieldColumn: {
      flex: 1,
    },
    formElementFieldLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.textSecondary,
      marginBottom: 6,
    },
    formInputFieldText: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 6,
      height: 38,
      paddingHorizontal: 10,
      fontSize: 13,
      color: colors.text,
      backgroundColor: colors.background,
    },
    formSelectInputAnchor: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 6,
      height: 38,
      paddingHorizontal: 10,
      backgroundColor: colors.background,
      justifyContent: "center",
    },
    selectDropdownFlexRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    customSelectAnchorText: {
      fontSize: 13,
      color: colors.text,
      fontWeight: "500",
      flex: 1,
      marginRight: 4,
    },
    modalCardActionsFooterRow: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 10,
      marginTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
      paddingTop: 14,
    },
    modalCancelButtonAction: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.cardBg,
    },
    modalCancelButtonText: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.textSecondary,
    },
    modalSubmitButtonAction: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 6,
      backgroundColor: colors.primary,
    },
    modalSubmitButtonText: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.primaryText,
    },
    inlineDropdownOverlayContainer: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.overlayBg,
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
      zIndex: 999,
    },
    inlineDropdownCardWindow: {
      backgroundColor: colors.cardBg,
      width: "100%",
      maxWidth: 320,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      maxHeight: height * 0.5,
    },
    inlineDropdownHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingBottom: 12,
      marginBottom: 8,
    },
    inlineDropdownHeaderTitleText: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.text,
    },
    closePickerTouchTarget: {
      padding: 4,
    },
    inlineDropdownScrollCanvas: {
      flexGrow: 0,
    },
    pickerRowSelectionButtonAnchor: {
      paddingVertical: 14,
      paddingHorizontal: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    pickerRowCategoryValueText: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: "500",
    },
    activeGoldenSelectionText: {
      color: colors.primary,
      fontWeight: "700",
    },
  });
}

export default function TaxManagement() {
  const { uiTheme } = useTheme();
  const isDark = (uiTheme.theme as string) === "dark" || (uiTheme.theme as string) === "metallic-elite";
  const colors = useMemo(() => buildColors(uiTheme, isDark), [uiTheme, isDark]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [items, setItems] = useState<TaxRule[]>([]);
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [open, setOpen] = useState<boolean>(false);
  const [showAccountSelector, setShowAccountSelector] = useState<boolean>(false);
  
  const [form, setForm] = useState<TaxForm>({ 
    country: "", 
    taxName: "", 
    rate: "", 
    account: "", 
  });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [taxRes, accountsRes] = await Promise.all([
        apiFetch<ApiResponse<TaxRule>>("/api/atlasbook/tax-settings"),
        apiFetch<ApiResponse<AccountItem>>("/api/atlasbook/accounts"),
      ]);
      if (taxRes?.success) setItems(taxRes.items || []);
      if (accountsRes?.success) setAccounts(accountsRes.items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    try {
      const cleanPayload = {
        ...form,
        rate: parseFloat(form.rate.replace(/\s+/g, "").replace(",", ".")) || 0,
        account: form.account || null,
      };

      const res = await apiFetch<{ success: boolean }>("/api/atlasbook/tax-settings", {
        method: "POST",
        body: JSON.stringify(cleanPayload),
      });
      if (res?.success) {
        setOpen(false);
        setForm({ country: "", taxName: "", rate: "", account: "" });
        load();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const getSelectedAccountName = () => {
    if (!form.account) return "Select Account...";
    const found = accounts.find((a) => a._id === form.account);
    return found ? found.name : "Select Account...";
  };

  const liabilityAccounts = useMemo(() => {
    return accounts.filter((a) => a.type === "Liability");
  }, [accounts]);

  return (
    <SafeAreaView style={s(styles.safeArea)}>
      <View style={s(styles.headerBlock)}>
        <View style={s(styles.headerTopRow)}>
          <View style={s(styles.titleContainer)}>
            <Scale size={24} color={colors.primary} style={s(styles.headerIcon)} />
            <Text style={s(styles.headerTitle)} numberOfLines={1}>Tax Management</Text>
          </View>
          <View style={s(styles.headerActionsRow)}>
            <TouchableOpacity style={s(styles.iconActionButton)} onPress={load} disabled={loading}>
              <RefreshCw size={16} color={colors.textSecondary} style={s(loading && styles.disabledOpacity)} />
            </TouchableOpacity>
            <TouchableOpacity style={s(styles.primaryActionButton)} onPress={() => setOpen(true)}>
              <Plus size={16} color={colors.primaryText} />
              <Text style={s(styles.primaryActionText)}>Configure Tax</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={s(styles.headerSubtitle)}>
          Configure regional tax rates (VAT/GST/Sales Tax) and automate tax accounting.
        </Text>
      </View>

      <View style={s(styles.kpiContainerRow)}>
        <View style={s(styles.kpiCardFrame)}>
          <View style={s(styles.kpiIconBox)}>
            <Calculator size={22} color={colors.primary} />
          </View>
          <View style={s(styles.kpiDataBox)}>
            <Text style={s(styles.kpiCardMetaLabel)}>Active Tax Rules</Text>
            <Text style={s(styles.kpiCardNumericHeading)}>{items.length}</Text>
          </View>
        </View>
      </View>

      <View style={s(styles.tableCardHeaderStrip)}>
        <Text style={s(styles.tableHeadingText)}>Regional Tax Configuration</Text>
      </View>

      {loading ? (
        <View style={s(styles.centerLoadingState)}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : items.length === 0 ? (
        <View style={s(styles.emptyStateContainer)}>
          <Text style={s(styles.emptyStateText)}>No tax rules configured.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s(styles.scrollContainer)} showsVerticalScrollIndicator={false}>
          <View style={s(styles.tableCanvasCard)}>
            <View style={s(styles.tableHeaderRowFrame)}>
              <Text style={s(styles.tableHeaderLabelText, styles.colRegion)}>Region / Country</Text>
              <Text style={s(styles.tableHeaderLabelText, styles.colType)}>Tax Type</Text>
              <Text style={s(styles.tableHeaderLabelText, styles.colRate, styles.textAlignRight)}>Tax Rate (%)</Text>
              <Text style={s(styles.tableHeaderLabelText, styles.colAccount)}>Linked GL Account</Text>
              <Text style={s(styles.tableHeaderLabelText, styles.colStatus, styles.textAlignRight)}>Status</Text>
            </View>

            {items.map((item, index) => (
              <View key={item._id || String(index)} style={s(styles.tableBodyRowFrame)}>
                <View style={s(styles.colRegion)}>
                  <Text style={s(styles.countryLabelText)} numberOfLines={1}>{item.country}</Text>
                </View>

                <View style={s(styles.colType)}>
                  <View style={s(styles.typeBadgeOutlineFrame)}>
                    <Text style={s(styles.typeBadgeInnerText)} numberOfLines={1}>{item.taxName}</Text>
                  </View>
                </View>

                <View style={s(styles.colRate, styles.textAlignRight)}>
                  <Text style={s(styles.rateValueMonoBoldText)}>{item.rate}%</Text>
                </View>

                <View style={s(styles.colAccount)}>
                  <Text style={s(styles.linkedAccountLabelSubtext)} numberOfLines={1}>
                    {item.account?.name || "Not linked"}
                  </Text>
                </View>

                <View style={s(styles.colStatus, styles.textAlignRight)}>
                  <View style={s(styles.activeStatusSolidBadgeFrame)}>
                    <Text style={s(styles.activeStatusSolidBadgeInnerText)}>Active</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      <Modal animationType="slide" transparent={true} visible={open} onRequestClose={() => setOpen(false)}>
        <View style={s(styles.modalBlurOverlay)}>
          <View style={s(styles.modalContentCard)}>
            <View style={s(styles.modalCardHeaderTopRow)}>
              <Text style={s(styles.modalCardTitleHeading)}>Configure New Tax Rule</Text>
              <TouchableOpacity onPress={() => setOpen(false)} style={s(styles.closeModalCrossButton)}>
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={s(styles.modalFormScrollContainer)} keyboardShouldPersistTaps="handled">
              <View style={s(styles.formElementWrapperFieldBlock)}>
                <Text style={s(styles.formElementFieldLabel)}>Region / Country</Text>
                <TextInput
                  style={s(styles.formInputFieldText)}
                  placeholder="e.g., United Kingdom"
                  placeholderTextColor={colors.placeholderText}
                  value={form.country}
                  onChangeText={(text) => setForm({ ...form, country: text })}
                />
              </View>

              <View style={s(styles.formSplitColumnsContainer)}>
                <View style={s(styles.formSplitFieldColumn)}>
                  <Text style={s(styles.formElementFieldLabel)}>Tax Name</Text>
                  <TextInput
                    style={s(styles.formInputFieldText)}
                    placeholder="VAT / GST"
                    placeholderTextColor={colors.placeholderText}
                    value={form.taxName}
                    onChangeText={(text) => setForm({ ...form, taxName: text })}
                />
                </View>
                <View style={s(styles.formSplitFieldColumn)}>
                  <Text style={s(styles.formElementFieldLabel)}>Rate (%)</Text>
                  <TextInput
                    style={s(styles.formInputFieldText)}
                    placeholder="20.0"
                    placeholderTextColor={colors.placeholderText}
                    keyboardType="numeric"
                    value={form.rate}
                    onChangeText={(text) => setForm({ ...form, rate: text })}
                  />
                </View>
              </View>

              <View style={s(styles.formElementWrapperFieldBlock)}>
                <Text style={s(styles.formElementFieldLabel)}>Linked Liability Account</Text>
                <TouchableOpacity 
                  style={s(styles.formSelectInputAnchor)} 
                  activeOpacity={0.7} 
                  onPress={() => setShowAccountSelector(true)}
                >
                  <View style={s(styles.selectDropdownFlexRow)}>
                    <Text style={s(styles.customSelectAnchorText)} numberOfLines={1}>
                      {getSelectedAccountName()}
                    </Text>
                    <ChevronDown size={14} color={colors.textSecondary} />
                  </View>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View style={s(styles.modalCardActionsFooterRow)}>
              <TouchableOpacity style={s(styles.modalCancelButtonAction)} onPress={() => setOpen(false)}>
                <Text style={s(styles.modalCancelButtonText)}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s(styles.modalSubmitButtonAction)} onPress={handleCreate}>
                <Text style={s(styles.modalSubmitButtonText)}>Save Tax Rule</Text>
              </TouchableOpacity>
            </View>
          </View>

          {showAccountSelector && (
            <View style={s(styles.inlineDropdownOverlayContainer)}>
              <View style={s(styles.inlineDropdownCardWindow)}>
                <View style={s(styles.inlineDropdownHeaderRow)}>
                  <Text style={s(styles.inlineDropdownHeaderTitleText)}>Select Account</Text>
                  <TouchableOpacity onPress={() => setShowAccountSelector(false)} style={s(styles.closePickerTouchTarget)}>
                    <X size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                <ScrollView style={s(styles.inlineDropdownScrollCanvas)} keyboardShouldPersistTaps="handled">
                  <TouchableOpacity
                    style={s(styles.pickerRowSelectionButtonAnchor)}
                    onPress={() => {
                      setForm({ ...form, account: "" });
                      setShowAccountSelector(false);
                    }}
                  >
                    <Text style={s(styles.pickerRowCategoryValueText, !form.account && styles.activeGoldenSelectionText)}>
                      Select Account...
                    </Text>
                  </TouchableOpacity>
                  {liabilityAccounts.map((acc, index) => (
                    <TouchableOpacity
                      key={acc._id || String(index)}
                      style={s(styles.pickerRowSelectionButtonAnchor)}
                      onPress={() => {
                        setForm({ ...form, account: acc._id });
                        setShowAccountSelector(false);
                      }}
                    >
                      <Text style={s(styles.pickerRowCategoryValueText, form.account === acc._id && styles.activeGoldenSelectionText)}>
                        {acc.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}