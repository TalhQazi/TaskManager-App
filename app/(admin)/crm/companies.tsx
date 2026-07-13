import React, { useState, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Alert,
  Platform,
  RefreshControl,
  KeyboardAvoidingView
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  Briefcase,
  Layers,
  MapPin,
  Users,
  Target,
  FileText,
  Globe,
  X,
  ChevronDown
} from "lucide-react-native";
import { useAuth } from "../../../contexts/AuthContext";
import { useTheme } from "../../../contexts/ThemeContext";
import { apiRequest } from "../../../services/api";

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");

const STATUS_OPTIONS = ["All", "Active", "Prospect", "Inactive"];
const INDUSTRY_OPTIONS = ["All", "Technology", "Finance", "Healthcare", "Retail", "Manufacturing", "Logistics", "Other"];
const ENTITY_TYPE_OPTIONS = ["LLC single member", "LLC multi member", "S Corp", "C Corp", "DBA", "Other"];

const COUNTRIES = [
  "USA/US", "United Kingdom/UK", "Canada", "Australia", "Germany", "France", "India", "Pakistan",
  "United Arab Emirates", "Saudi Arabia", "Singapore", "Japan", "China", "South Korea", "Brazil",
  "Mexico", "Argentina", "Spain", "Italy", "Netherlands", "Sweden", "Norway", "Denmark", "Switzerland",
  "Belgium", "Austria", "Poland", "Czech Republic", "Russia", "Turkey", "Egypt", "South Africa",
  "Nigeria", "Kenya", "Indonesia", "Thailand", "Vietnam", "Philippines", "Malaysia", "Bangladesh",
  "Sri Lanka", "Nepal", "New Zealand", "Ireland", "Portugal", "Greece", "Finland", "Ukraine"
];

interface Company {
  id: string;
  name: string;
  industry: string;
  entityType: string;
  contactCount: number;
  activeDeals: number;
  status: "Active" | "Prospect" | "Inactive";
  website?: string;
  location?: string;
  description?: string;
}

interface WrappedResponse {
  success: boolean;
  data?: {
    items?: Company[];
  };
}

type ApiResponse = WrappedResponse | any;

const STATUS_CONFIG = {
  Active: { bg: "rgba(16, 185, 129, 0.1)", text: "#10b981", dot: "#10b981" },
  Prospect: { bg: "rgba(56, 189, 248, 0.1)", text: "#38bdf8", dot: "#38bdf8" },
  Inactive: { bg: "rgba(148, 163, 184, 0.1)", text: "#94a3b8", dot: "#94a3b8" }
};

export default function CRMCompanies() {
  const queryClient = useQueryClient();
  const auth = useAuth();
  const { uiTheme } = useTheme();

  const userRole = auth?.user?.role || "user";
  const isAdmin = userRole === "admin" || userRole === "super-admin";
  const isMetallic = uiTheme?.theme === "metallic-elite";

  const colors = useMemo(() => {
    const isDark = (uiTheme?.theme as string) === "dark" || isMetallic;
    return {
      background: uiTheme?.panelColors?.dashboardBackground || (isDark ? "#080b10" : "#f8fafc"),
      cardBg: uiTheme?.panelColors?.dashboardCardBackground || (isDark ? "#0f131a" : "#ffffff"),
      text: uiTheme?.panelColors?.dashboardTextColor || (isDark ? "#ffffff" : "#0f172a"),
      mutedText: isDark ? "rgba(255,255,255,0.4)" : "#475569",
      border: uiTheme?.panelColors?.borderColor || (isDark ? "rgba(217,119,6,0.15)" : "#e2e8f0"),
      inputBg: isDark ? "#020617" : "#ffffff",
      inputBorder: isDark ? "rgba(255,255,255,0.1)" : "#cbd5e1",
      primary: uiTheme?.customColors?.primary || "#ffd27a"
    };
  }, [uiTheme, isMetallic]);

  const styles = useMemo(() => createStyles(colors), [colors]);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [industryFilter, setIndustryFilter] = useState("All");

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [viewingCompany, setViewingCompany] = useState<Company | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    industry: "Technology",
    entityType: "LLC single member",
    contactCount: "",
    activeDeals: "",
    status: "Active" as Company["status"],
    website: "",
    location: "USA/US",
    description: ""
  });

  const [formErrors, setFormErrors] = useState<{ name?: string }>({});
  const [countrySearch, setCountrySearch] = useState("");
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);

  const [industryPickerOpen, setIndustryPickerOpen] = useState(false);
  const [statusPickerOpen, setStatusPickerOpen] = useState(false);
  const [formIndustryPickerOpen, setFormIndustryPickerOpen] = useState(false);
  const [formEntityPickerOpen, setFormEntityPickerOpen] = useState(false);
  const [formStatusPickerOpen, setFormStatusPickerOpen] = useState(false);

  const companiesQuery = useQuery<Company[]>({
    queryKey: ["crm-companies"],
    queryFn: async () => {
      const res = await apiRequest("/crm-company") as ApiResponse;
      if (res && res.success && res.data && Array.isArray(res.data.items)) {
        return res.data.items as Company[];
      }
      return Array.isArray(res) ? res : [];
    }
  });

  const saveCompanyMutation = useMutation({
    mutationFn: async (payload: any) => {
      const method = editingCompany ? "PUT" : "POST";
      const endpoint = editingCompany ? `/crm-company/${editingCompany.id}` : "/crm-company";
      return await apiRequest(endpoint, {
        method,
        body: JSON.stringify(payload)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-companies"] });
      setIsFormModalOpen(false);
      setEditingCompany(null);
      resetFormState();
      Alert.alert("Success", "Company profile configuration successfully verified.");
    },
    onError: (err: any) => {
      Alert.alert("Database Sync Error", err.message || "Failed to commit record updates.");
    }
  });

  const filteredCompanies = useMemo(() => {
    const records = companiesQuery.data || [];
    return records.filter(c => {
      const criteria = searchQuery.toLowerCase();
      const matchesSearch =
        c.name.toLowerCase().includes(criteria) ||
        c.industry.toLowerCase().includes(criteria) ||
        c.website?.toLowerCase().includes(criteria);
      const matchesStatus = statusFilter === "All" || c.status === statusFilter;
      const matchesIndustry = industryFilter === "All" || c.industry === industryFilter;
      return matchesSearch && matchesStatus && matchesIndustry;
    });
  }, [companiesQuery.data, searchQuery, statusFilter, industryFilter]);

  const metricsSummary = useMemo(() => {
    const records = companiesQuery.data || [];
    return {
      total: records.length,
      active: records.filter(c => c.status === "Active").length,
      prospect: records.filter(c => c.status === "Prospect").length,
      deals: records.reduce((sum, c) => sum + (Number(c.activeDeals) || 0), 0)
    };
  }, [companiesQuery.data]);

  const filteredCountries = useMemo(() => {
    if (!countrySearch) return COUNTRIES.slice(0, 5);
    return COUNTRIES.filter(c => c.toLowerCase().includes(countrySearch.toLowerCase())).slice(0, 5);
  }, [countrySearch]);

  const resetFormState = () => {
    setFormData({
      name: "",
      industry: "Technology",
      entityType: "LLC single member",
      contactCount: "",
      activeDeals: "",
      status: "Active",
      website: "",
      location: "USA/US",
      description: ""
    });
    setFormErrors({});
    setCountrySearch("");
    setShowCountryDropdown(false);
  };

  const initCreateModal = () => {
    setEditingCompany(null);
    resetFormState();
    setIsFormModalOpen(true);
  };

  const initUpdateModal = (company: Company) => {
    setEditingCompany(company);
    setFormData({
      name: company.name,
      industry: company.industry,
      entityType: company.entityType || "LLC single member",
      contactCount: company.contactCount?.toString() || "0",
      activeDeals: company.activeDeals?.toString() || "0",
      status: company.status,
      website: company.website || "",
      location: company.location || "USA/US",
      description: company.description || ""
    });
    setFormErrors({});
    setCountrySearch(company.location || "");
    setShowCountryDropdown(false);
    setIsFormModalOpen(true);
  };

  const runValidation = () => {
    const errors: { name?: string } = {};
    if (!formData.name.trim()) errors.name = "Company legal designation identity required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const commitFormSave = () => {
    if (!runValidation()) return;
    const payload = {
      ...formData,
      contactCount: formData.contactCount ? parseInt(formData.contactCount, 10) : 0,
      activeDeals: formData.activeDeals ? parseInt(formData.activeDeals, 10) : 0
    };
    saveCompanyMutation.mutate(payload);
  };

  return (
    <SafeAreaView style={styles.rootContainer}>
      <StatusBar barStyle="light-content" />
      <View style={styles.headerDeck}>
        <View style={styles.headerTitleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.screenHeading}>Companies</Text>
            <Text style={styles.screenCaption}>Track global structural organizations and client profiles</Text>
          </View>
          <TouchableOpacity style={styles.createNewEntityBtn} onPress={initCreateModal}>
            <Plus size={14} color="#080b10" />
            <Text style={styles.createNewBtnText}>Add Company</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.metricsSummarySection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.metricsStripScrollContainer}>
          {[
            { label: "Total Accounts", value: metricsSummary.total, tint: colors.primary },
            { label: "Active Matrix", value: metricsSummary.active, tint: "#10b981" },
            { label: "Pipeline Prospects", value: metricsSummary.prospect, tint: "#38bdf8" },
            { label: "Tracked Deal Cycles", value: metricsSummary.deals, tint: "#a78bfa" }
          ].map((item, idx) => (
            <View key={idx} style={styles.summaryKpiCardFrame}>
              <Text style={styles.kpiCardMetaLabel} numberOfLines={1}>{item.label}</Text>
              <Text style={[styles.kpiCardMetricValue, { color: item.tint }]}>{item.value}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      <View style={styles.filterControlDeskBlock}>
        <View style={styles.searchFilterInputFrameBody}>
          <Search size={14} color={colors.mutedText} />
          <TextInput
            style={styles.searchFilterTextInputField}
            placeholder="Search operational domain indices..."
            placeholderTextColor={colors.mutedText}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <X size={14} color={colors.text} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.inlineSelectorsLayoutGrid}>
          <TouchableOpacity style={styles.customFilterSelectorAnchor} onPress={() => setIndustryPickerOpen(true)}>
            <Text style={styles.customFilterSelectorValueDisplay} numberOfLines={1}>
              {industryFilter === "All" ? "Industry: All" : industryFilter}
            </Text>
            <ChevronDown size={12} color={colors.text} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.customFilterSelectorAnchor} onPress={() => setStatusPickerOpen(true)}>
            <Text style={styles.customFilterSelectorValueDisplay} numberOfLines={1}>
              {statusFilter === "All" ? "Status: All" : statusFilter}
            </Text>
            <ChevronDown size={12} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {companiesQuery.isLoading ? (
        <View style={styles.centerLoadingIndicatorDeck}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.syncLoadingTextLabel}>Resolving Companies Data Ledger...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.mainFeedListContentContainer}
          refreshControl={<RefreshControl refreshing={companiesQuery.isRefetching} onRefresh={() => queryClient.invalidateQueries({ queryKey: ["crm-companies"] })} tintColor={colors.primary} />}
        >
          {filteredCompanies.length === 0 ? (
            <View style={styles.emptyDatasetWarningLayoutBox}>
              <Briefcase size={32} color={colors.mutedText} />
              <Text style={styles.emptyDatasetWarningTextHeadline}>No entities mapped</Text>
              <Text style={styles.emptyDatasetWarningTextCaption}>Adjust parameters or query terms to sync metrics.</Text>
            </View>
          ) : (
            filteredCompanies.map(company => {
              const config = STATUS_CONFIG[company.status] || STATUS_CONFIG.Inactive;
              const initials = company.name?.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase() || "?";

              return (
                <TouchableOpacity key={company.id} style={styles.companyRecordCardSurface} onPress={() => { setViewingCompany(company); setIsDetailsModalOpen(true); }}>
                  <View style={styles.cardHeaderFlexInlineRow}>
                    <View style={[styles.avatarBoxCellFallback, { backgroundColor: colors.border }]}>
                      <Text style={[styles.avatarTextLabel, { color: colors.primary }]}>{initials}</Text>
                    </View>

                    <View style={{ flex: 1, marginLeft: 12, marginRight: 8 }}>
                      <Text style={styles.companyCardPrimaryTitle} numberOfLines={1}>{company.name}</Text>
                      {company.website ? <Text style={styles.companyCardSecondarySubtitle} numberOfLines={1}>{company.website}</Text> : null}
                    </View>

                    <View style={[styles.statusBadgeFrameLabel, { backgroundColor: config.bg }]}>
                      <View style={[styles.statusIndicatorDotGraphicNode, { backgroundColor: config.dot }]} />
                      <Text style={[styles.statusBadgeTextValue, { color: config.text }]}>{company.status}</Text>
                    </View>
                  </View>

                  <View style={styles.cardDetailsMetricGridStructure}>
                    <View style={styles.metaSubCardNodeBlock}>
                      <Text style={styles.metaNodeFieldLabel}>Industry</Text>
                      <Text style={styles.metaNodeFieldValueText} numberOfLines={1}>{company.industry}</Text>
                    </View>
                    <View style={styles.metaSubCardNodeBlock}>
                      <Text style={styles.metaNodeFieldLabel}>Location</Text>
                      <Text style={styles.metaNodeFieldValueText} numberOfLines={1}>{company.location || "—"}</Text>
                    </View>
                    <View style={styles.metaSubCardNodeBlock}>
                      <Text style={styles.metaNodeFieldLabel}>Contacts</Text>
                      <Text style={styles.metaNodeFieldValueText}>{company.contactCount || 0}</Text>
                    </View>
                    <View style={styles.metaSubCardNodeBlock}>
                      <Text style={styles.metaNodeFieldLabel}>Pipelines</Text>
                      <Text style={[styles.metaNodeFieldValueText, { color: "#a78bfa" }]}>{company.activeDeals || 0}</Text>
                    </View>
                  </View>

                  <View style={styles.rowActionTriggerControlFooterBar}>
                    <TouchableOpacity style={styles.footerInlineActionBtnAnchor} onPress={() => { setViewingCompany(company); setIsDetailsModalOpen(true); }}>
                      <Text style={styles.footerActionLabelTextStandard}>View</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.footerInlineActionBtnAnchor, styles.footerActionBorderAccentDividerLeft]} onPress={() => initUpdateModal(company)}>
                      <Text style={[styles.footerActionLabelTextAccent, { color: colors.primary }]}>Edit</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}

      <Modal visible={isFormModalOpen} animationType="slide" transparent>
        <View style={styles.modalBackdropOverlayScrim}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalContentCoreSurfaceSheet}>
            <View style={styles.modalHeaderTopBarInlineRow}>
              <Text style={styles.modalMainTitleHeading}>{editingCompany ? "Edit Company Structure" : "Register New Structural Entity"}</Text>
              <TouchableOpacity onPress={() => setIsFormModalOpen(false)} style={styles.modalCloseActionCircleAnchor}>
                <X size={16} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalFormBodyScrollWrapper} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={styles.formFieldLabelTextSignature}>Company Legal Name *</Text>
              <TextInput
                style={[styles.formInputPrimitiveTextField, formErrors.name ? styles.inputValidationErrorBorderOutline : null]}
                placeholder="Enter corporate entity registration name"
                placeholderTextColor={colors.mutedText}
                value={formData.name}
                onChangeText={val => setFormData(p => ({ ...p, name: val }))}
              />
              {formErrors.name ? <Text style={styles.errorMessagingOutputNodeText}>{formErrors.name}</Text> : null}

              <View style={styles.twoColumnInputsContainerFlexRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.formFieldLabelTextSignature}>Operational Focus Focus *</Text>
                  <TouchableOpacity style={styles.customSelectorFormAnchorTrigger} onPress={() => setFormIndustryPickerOpen(true)}>
                    <Text style={styles.customSelectorFormDisplayValueText} numberOfLines={1}>{formData.industry}</Text>
                    <ChevronDown size={14} color={colors.text} />
                  </TouchableOpacity>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.formFieldLabelTextSignature}>Web Domain URL</Text>
                  <TextInput
                    style={styles.formInputPrimitiveTextField}
                    placeholder="e.g. enterprise.com"
                    placeholderTextColor={colors.mutedText}
                    value={formData.website}
                    onChangeText={val => setFormData(p => ({ ...p, website: val }))}
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                </View>
              </View>

              <Text style={styles.formFieldLabelTextSignature}>Entity Structure Layout Type</Text>
              <TouchableOpacity style={styles.customSelectorFormAnchorTrigger} onPress={() => setFormEntityPickerOpen(true)}>
                <Text style={styles.customSelectorFormDisplayValueText} numberOfLines={1}>{formData.entityType}</Text>
                <ChevronDown size={14} color={colors.text} />
              </TouchableOpacity>

              <Text style={styles.formFieldLabelTextSignature}>Geographic Localization Country</Text>
              <TextInput
                style={styles.formInputPrimitiveTextField}
                placeholder="Search localization maps..."
                placeholderTextColor={colors.mutedText}
                value={countrySearch}
                onChangeText={val => {
                  setCountrySearch(val);
                  setFormData(p => ({ ...p, location: val }));
                  setShowCountryDropdown(true);
                }}
                onFocus={() => setShowCountryDropdown(true)}
              />

              {showCountryDropdown && filteredCountries.length > 0 && (
                <View style={styles.countryDropdownMapResultsCluster}>
                  {filteredCountries.map(country => (
                    <TouchableOpacity
                      key={country}
                      style={styles.countryDropdownInteractableRowNode}
                      onPress={() => {
                        setFormData(p => ({ ...p, location: country }));
                        setCountrySearch(country);
                        setShowCountryDropdown(false);
                      }}
                    >
                      <MapPin size={12} color={colors.primary} style={{ marginRight: 6 }} />
                      <Text style={styles.countryDropdownRowTextValue}>{country}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text style={styles.formFieldLabelTextSignature}>Strategic Portfolio Summary</Text>
              <TextInput
                style={[styles.formInputPrimitiveTextField, styles.formTextareaMultilineHeightBlock]}
                placeholder="Internal dynamic executive notes..."
                placeholderTextColor={colors.mutedText}
                multiline
                numberOfLines={3}
                value={formData.description}
                onChangeText={val => setFormData(p => ({ ...p, description: val }))}
              />

              <View style={styles.threeColumnInputsLayoutGridRow}>
                <View style={styles.threeColumnInputSegmentCell}>
                  <Text style={styles.formFieldLabelTextSignature}>Contacts</Text>
                  <TextInput
                    style={styles.formInputPrimitiveTextField}
                    placeholder="0"
                    placeholderTextColor={colors.mutedText}
                    keyboardType="numeric"
                    value={formData.contactCount}
                    onChangeText={val => setFormData(p => ({ ...p, contactCount: val }))}
                  />
                </View>

                <View style={[styles.threeColumnInputSegmentCell, { marginHorizontal: 8 }]}>
                  <Text style={styles.formFieldLabelTextSignature}>Deals</Text>
                  <TextInput
                    style={styles.formInputPrimitiveTextField}
                    placeholder="0"
                    placeholderTextColor={colors.mutedText}
                    keyboardType="numeric"
                    value={formData.activeDeals}
                    onChangeText={val => setFormData(p => ({ ...p, activeDeals: val }))}
                  />
                </View>

                <View style={styles.threeColumnInputSegmentCell}>
                  <Text style={styles.formFieldLabelTextSignature}>Status</Text>
                  <TouchableOpacity style={styles.customSelectorFormAnchorTrigger} onPress={() => setFormStatusPickerOpen(true)}>
                    <Text style={styles.customSelectorFormDisplayValueText} numberOfLines={1}>{formData.status}</Text>
                    <ChevronDown size={14} color={colors.text} />
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalStickyFooterActionsBarContainer}>
              <TouchableOpacity style={styles.formActionDismissModalBtn} onPress={() => setIsFormModalOpen(false)} disabled={saveCompanyMutation.isPending}>
                <Text style={styles.formDismissBtnLabelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.formActionSubmitModalBtn, { backgroundColor: colors.primary }, saveCompanyMutation.isPending && styles.disabledActionBtnState]}
                onPress={commitFormSave}
                disabled={saveCompanyMutation.isPending}
              >
                {saveCompanyMutation.isPending ? (
                  <ActivityIndicator size="small" color="#080b10" />
                ) : (
                  <Text style={styles.formSubmitBtnLabelText}>{editingCompany ? "Save Profile" : "Register Unit"}</Text>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal visible={isDetailsModalOpen} animationType="fade" transparent>
        <View style={styles.modalBackdropOverlayScrim}>
          <SafeAreaView style={styles.detailsModalProfileCenterSurfaceSheet}>
            {viewingCompany && (
              <View style={{ flex: 1 }}>
                <View style={styles.modalHeaderTopBarInlineRow}>
                  <Text style={styles.modalMainTitleHeading}>Corporate Dossier File Details</Text>
                  <TouchableOpacity onPress={() => setIsDetailsModalOpen(false)} style={styles.modalCloseActionCircleAnchor}>
                    <X size={16} color={colors.text} />
                  </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
                  <View style={styles.detailsHeaderProfileIdentityCardFlexRow}>
                    <View style={[styles.avatarBoxCellFallback, { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.border }]}>
                      <Text style={[styles.avatarTextLabel, { fontSize: 14, color: colors.primary }]}>
                        {viewingCompany.name?.slice(0, 2).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.detailsMainCorporateTitleText}>{viewingCompany.name}</Text>
                      {viewingCompany.website ? <Text style={styles.detailsHeaderWebsiteLinkHighlightText}>{viewingCompany.website}</Text> : null}
                    </View>
                  </View>

                  <View style={styles.detailsStructuralMetricsLayoutGridMatrix}>
                    {[
                      { icon: <Briefcase size={14} color={colors.primary} />, title: "Sector Scope", val: viewingCompany.industry },
                      { icon: <Layers size={14} color={colors.primary} />, title: "Structure Build", val: viewingCompany.entityType || "—" },
                      { icon: <MapPin size={14} color={colors.primary} />, title: "Localization Map", val: viewingCompany.location || "—" },
                      { icon: <Users size={14} color={colors.primary} />, title: "Linked Directory", val: viewingCompany.contactCount || 0 },
                      { icon: <Target size={14} color="#a78bfa" />, title: "Active Pipelines", val: viewingCompany.activeDeals || 0, accent: "#a78bfa" },
                      { icon: <Globe size={14} color={colors.primary} />, title: "Operation Status", val: viewingCompany.status }
                    ].map((cell, idx) => (
                      <View key={idx} style={styles.detailsCellGridNodeBlockFrame}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 }}>
                          {cell.icon}
                          <Text style={styles.detailsCellFieldLabelTitle}>{cell.title}</Text>
                        </View>
                        <Text style={[styles.detailsCellFieldValueText, cell.accent ? { color: cell.accent } : { color: colors.text }]} numberOfLines={1}>
                          {cell.val}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {viewingCompany.description ? (
                    <View style={styles.detailsLongFormSummaryBlockContainerWell}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
                        <FileText size={14} color={colors.primary} />
                        <Text style={styles.detailsLongFormHeaderSectionLabel}>Operational Background Invariant Summary</Text>
                      </View>
                      <Text style={styles.detailsLongFormContentBodyParagraphText}>{viewingCompany.description}</Text>
                    </View>
                  ) : null}
                </ScrollView>

                <View style={styles.modalStickyFooterActionsBarContainer}>
                  <TouchableOpacity style={styles.formActionDismissModalBtn} onPress={() => setIsDetailsModalOpen(false)}>
                    <Text style={styles.formDismissBtnLabelText}>Close</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.formActionSubmitModalBtn, { backgroundColor: colors.primary }]}
                    onPress={() => {
                      setIsDetailsModalOpen(false);
                      initUpdateModal(viewingCompany);
                    }}
                  >
                    <Text style={styles.formSubmitBtnLabelText}>Edit Company</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </SafeAreaView>
        </View>
      </Modal>

      <Modal visible={industryPickerOpen} transparent animationType="fade">
        <TouchableOpacity style={styles.dropdownModalClickBackdropOverlay} activeOpacity={1} onPress={() => setIndustryPickerOpen(false)}>
          <View style={styles.dropdownOptionSelectionListSurfaceBox}>
            <Text style={styles.dropdownSelectionHeaderHeadlineTitle}>Select Operational Industry Focus</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {INDUSTRY_OPTIONS.map(opt => {
                const isActive = industryFilter === opt;
                return (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.dropdownItemSelectorNodeRowFrame, isActive && styles.dropdownItemSelectorNodeRowFrameActive]}
                    onPress={() => { setIndustryFilter(opt); setIndustryPickerOpen(false); }}
                  >
                    <Text style={[styles.dropdownItemDisplayValueLabelText, isActive && { color: colors.primary, fontWeight: "700" }]}>{opt}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={statusPickerOpen} transparent animationType="fade">
        <TouchableOpacity style={styles.dropdownModalClickBackdropOverlay} activeOpacity={1} onPress={() => setStatusPickerOpen(false)}>
          <View style={styles.dropdownOptionSelectionListSurfaceBox}>
            <Text style={styles.dropdownSelectionHeaderHeadlineTitle}>Select Filter Lifecycle Phase Status</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {STATUS_OPTIONS.map(opt => {
                const isActive = statusFilter === opt;
                return (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.dropdownItemSelectorNodeRowFrame, isActive && styles.dropdownItemSelectorNodeRowFrameActive]}
                    onPress={() => { setStatusFilter(opt); setStatusPickerOpen(false); }}
                  >
                    <Text style={[styles.dropdownItemDisplayValueLabelText, isActive && { color: colors.primary, fontWeight: "700" }]}>{opt}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={formIndustryPickerOpen} transparent animationType="fade">
        <TouchableOpacity style={styles.dropdownModalClickBackdropOverlay} activeOpacity={1} onPress={() => setFormIndustryPickerOpen(false)}>
          <View style={styles.dropdownOptionSelectionListSurfaceBox}>
            <Text style={styles.dropdownSelectionHeaderHeadlineTitle}>Industry Operational Focus Selector</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {INDUSTRY_OPTIONS.filter(i => i !== "All").map(opt => {
                const isActive = formData.industry === opt;
                return (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.dropdownItemSelectorNodeRowFrame, isActive && styles.dropdownItemSelectorNodeRowFrameActive]}
                    onPress={() => { setFormData(p => ({ ...p, industry: opt })); setFormIndustryPickerOpen(false); }}
                  >
                    <Text style={[styles.dropdownItemDisplayValueLabelText, isActive && { color: colors.primary, fontWeight: "700" }]}>{opt}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={formEntityPickerOpen} transparent animationType="fade">
        <TouchableOpacity style={styles.dropdownModalClickBackdropOverlay} activeOpacity={1} onPress={() => setFormEntityPickerOpen(false)}>
          <View style={styles.dropdownOptionSelectionListSurfaceBox}>
            <Text style={styles.dropdownSelectionHeaderHeadlineTitle}>Entity Architecture Layout Selector</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {ENTITY_TYPE_OPTIONS.map(opt => {
                const isActive = formData.entityType === opt;
                return (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.dropdownItemSelectorNodeRowFrame, isActive && styles.dropdownItemSelectorNodeRowFrameActive]}
                    onPress={() => { setFormData(p => ({ ...p, entityType: opt })); setFormEntityPickerOpen(false); }}
                  >
                    <Text style={[styles.dropdownItemDisplayValueLabelText, isActive && { color: colors.primary, fontWeight: "700" }]}>{opt}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={formStatusPickerOpen} transparent animationType="fade">
        <TouchableOpacity style={styles.dropdownModalClickBackdropOverlay} activeOpacity={1} onPress={() => setFormStatusPickerOpen(false)}>
          <View style={styles.dropdownOptionSelectionListSurfaceBox}>
            <Text style={styles.dropdownSelectionHeaderHeadlineTitle}>Account Lifecycle Status Selector</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {STATUS_OPTIONS.filter(s => s !== "All").map(opt => {
                const isActive = formData.status === opt;
                return (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.dropdownItemSelectorNodeRowFrame, isActive && styles.dropdownItemSelectorNodeRowFrameActive]}
                    onPress={() => { setFormData(p => ({ ...p, status: opt as any })); setFormStatusPickerOpen(false); }}
                  >
                    <Text style={[styles.dropdownItemDisplayValueLabelText, isActive && { color: colors.primary, fontWeight: "700" }]}>{opt}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: colors.background
  },
  centerLoadingIndicatorDeck: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  syncLoadingTextLabel: {
    marginTop: 12,
    fontSize: 12,
    color: colors.mutedText,
    fontWeight: "500"
  },
  headerDeck: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  headerTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12
  },
  screenHeading: {
    fontSize: 22,
    fontWeight: "900",
    color: colors.text
  },
  screenCaption: {
    fontSize: 11,
    color: colors.mutedText,
    marginTop: 2
  },
  createNewEntityBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },
  createNewBtnText: {
    color: "#080b10",
    fontSize: 11,
    fontWeight: "800"
  },
  metricsSummarySection: {
    marginTop: 12
  },
  metricsStripScrollContainer: {
    paddingHorizontal: 16,
    gap: 8
  },
  summaryKpiCardFrame: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    minWidth: 110,
    justifyContent: "center"
  },
  kpiCardMetaLabel: {
    color: colors.mutedText,
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  kpiCardMetricValue: {
    fontSize: 18,
    fontWeight: "900",
    marginTop: 2
  },
  filterControlDeskBlock: {
    paddingHorizontal: 16,
    marginTop: 14,
    gap: 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  searchFilterInputFrameBody: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.15)",
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 38
  },
  searchFilterTextInputField: {
    flex: 1,
    color: colors.text,
    fontSize: 12,
    paddingLeft: 6
  },
  inlineSelectorsLayoutGrid: {
    flexDirection: "row",
    gap: 8
  },
  customFilterSelectorAnchor: {
    flex: 1,
    height: 36,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: "rgba(0,0,0,0.15)",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  customFilterSelectorValueDisplay: {
    fontSize: 11,
    color: colors.text,
    fontWeight: "600",
    flex: 1
  },
  mainFeedListContentContainer: {
    padding: 16,
    paddingBottom: 40
  },
  emptyDatasetWarningLayoutBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    gap: 4
  },
  emptyDatasetWarningTextHeadline: {
    color: colors.text,
    fontWeight: "800",
    fontSize: 13,
    marginTop: 8
  },
  emptyDatasetWarningTextCaption: {
    color: colors.mutedText,
    fontSize: 11,
    textAlign: "center"
  },
  companyRecordCardSurface: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12
  },
  cardHeaderFlexInlineRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  avatarBoxCellFallback: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)"
  },
  avatarTextLabel: {
    fontSize: 11,
    fontWeight: "900"
  },
  companyCardPrimaryTitle: {
    color: colors.text,
    fontWeight: "800",
    fontSize: 14
  },
  companyCardSecondarySubtitle: {
    color: colors.mutedText,
    fontSize: 11,
    marginTop: 1
  },
  statusBadgeFrameLabel: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12
  },
  statusIndicatorDotGraphicNode: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginRight: 4
  },
  statusBadgeTextValue: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  cardDetailsMetricGridStructure: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 12,
    marginHorizontal: -4
  },
  metaSubCardNodeBlock: {
    backgroundColor: "rgba(0,0,0,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.02)",
    width: (SCREEN_WIDTH - 56) / 2,
    marginHorizontal: 4,
    marginBottom: 6,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  metaNodeFieldLabel: {
    color: colors.mutedText,
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  metaNodeFieldValueText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2
  },
  rowActionTriggerControlFooterBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.03)",
    marginTop: 8,
    paddingTop: 8
  },
  footerInlineActionBtnAnchor: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4
  },
  footerActionBorderAccentDividerLeft: {
    borderLeftWidth: 1,
    borderLeftColor: "rgba(255,255,255,0.03)"
  },
  footerActionLabelTextStandard: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "700"
  },
  footerActionLabelTextAccent: {
    fontSize: 11,
    fontWeight: "800"
  },
  modalBackdropOverlayScrim: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "flex-end"
  },
  modalContentCoreSurfaceSheet: {
    backgroundColor: colors.cardBg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: "88%"
  },
  detailsModalProfileCenterSurfaceSheet: {
    backgroundColor: colors.cardBg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    height: "75%"
  },
  modalHeaderTopBarInlineRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  modalMainTitleHeading: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "900"
  },
  modalCloseActionCircleAnchor: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
    justifyContent: "center"
  },
  modalFormBodyScrollWrapper: {
    padding: 16
  },
  formFieldLabelTextSignature: {
    color: colors.mutedText,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 6
  },
  formInputPrimitiveTextField: {
    backgroundColor: "rgba(0,0,0,0.2)",
    borderWidth: 1,
    borderColor: colors.inputBorder,
    color: colors.text,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    fontSize: 12,
    marginBottom: 12
  },
  inputValidationErrorBorderOutline: {
    borderColor: "rgba(239,68,68,0.4)"
  },
  errorMessagingOutputNodeText: {
    color: "#ef4444",
    fontSize: 11,
    marginTop: -8,
    marginBottom: 10,
    fontWeight: "600"
  },
  twoColumnInputsContainerFlexRow: {
    flexDirection: "row"
  },
  customSelectorFormAnchorTrigger: {
    height: 40,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: "rgba(0,0,0,0.2)",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12
  },
  customSelectorFormDisplayValueText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: "500",
    flex: 1
  },
  formTextareaMultilineHeightBlock: {
    height: 72,
    paddingTop: 10,
    textAlignVertical: "top"
  },
  threeColumnInputsLayoutGridRow: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  threeColumnInputSegmentCell: {
    flex: 1
  },
  countryDropdownMapResultsCluster: {
    backgroundColor: "rgba(0,0,0,0.4)",
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 8,
    marginTop: -8,
    marginBottom: 12,
    padding: 4
  },
  countryDropdownInteractableRowNode: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10
  },
  countryDropdownRowTextValue: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "500"
  },
  modalStickyFooterActionsBarContainer: {
    flexDirection: "row",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.cardBg,
    gap: 10
  },
  formActionDismissModalBtn: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 10,
    height: 40,
    alignItems: "center",
    justifyContent: "center"
  },
  formDismissBtnLabelText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700"
  },
  formActionSubmitModalBtn: {
    flex: 1,
    borderRadius: 10,
    height: 40,
    alignItems: "center",
    justifyContent: "center"
  },
  formSubmitBtnLabelText: {
    color: "#080b10",
    fontSize: 12,
    fontWeight: "900"
  },
  disabledActionBtnState: {
    opacity: 0.5
  },
  detailsHeaderProfileIdentityCardFlexRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16
  },
  detailsMainCorporateTitleText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900"
  },
  detailsHeaderWebsiteLinkHighlightText: {
    color: "#38bdf8",
    fontSize: 12,
    marginTop: 2,
    fontWeight: "500"
  },
  detailsStructuralMetricsLayoutGridMatrix: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4
  },
  detailsCellGridNodeBlockFrame: {
    backgroundColor: "rgba(0,0,0,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.02)",
    width: (SCREEN_WIDTH - 40) / 2,
    marginHorizontal: 4,
    marginBottom: 8,
    borderRadius: 10,
    padding: 10
  },
  detailsCellFieldLabelTitle: {
    color: colors.mutedText,
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  detailsCellFieldValueText: {
    fontSize: 13,
    fontWeight: "800",
    marginTop: 2
  },
  detailsLongFormSummaryBlockContainerWell: {
    backgroundColor: "rgba(0,0,0,0.15)",
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 12,
    padding: 12,
    marginTop: 8
  },
  detailsLongFormHeaderSectionLabel: {
    color: colors.mutedText,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  detailsLongFormContentBodyParagraphText: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500"
  },
  dropdownModalClickBackdropOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center"
  },
  dropdownOptionSelectionListSurfaceBox: {
    width: SCREEN_WIDTH * 0.88,
    maxWidth: 340,
    maxHeight: SCREEN_HEIGHT * 0.45,
    backgroundColor: colors.cardBg,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 14,
    padding: 16
  },
  dropdownSelectionHeaderHeadlineTitle: {
    fontSize: 11,
    fontWeight: "900",
    color: colors.primary,
    textTransform: "uppercase",
    marginBottom: 12,
    letterSpacing: 0.5
  },
  dropdownItemSelectorNodeRowFrame: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  dropdownItemSelectorNodeRowFrameActive: {
    backgroundColor: "rgba(217,119,6,0.05)"
  },
  dropdownItemDisplayValueLabelText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: "500"
  }
});