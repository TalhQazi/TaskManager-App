import React, { useState, useMemo, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Dimensions,
  Platform,
  StatusBar,
  Alert,
  Modal,
  KeyboardAvoidingView
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Briefcase,
  Search,
  Plus,
  X,
  ChevronDown,
  Calendar,
  User,
  Layers,
  DollarSign,
  TrendingUp,
  Award
} from "lucide-react-native";
import { useAuth } from "../../../contexts/AuthContext";
import { useTheme } from "../../../contexts/ThemeContext";
import { apiRequest } from "../../../services/api";

export interface CRMDeal {
  id: string;
  name: string;
  company: string;
  value: number;
  stage: string;
  probability: number;
  closeDate: string;
  owner: string;
}

interface CompanyLookup {
  id: string;
  name: string;
}

interface ContactLookup {
  id: string;
  name: string;
}

interface WrappedResponse {
  success: boolean;
  data?: {
    items?: any[];
    metrics?: any;
  };
}

type ApiResponse = WrappedResponse | any;

const STAGES = ["Qualification", "Needs Analysis", "Proposal", "Negotiation", "Closed Won", "Closed Lost"];

const STAGE_CONFIG: Record<string, { bg: string; txt: string; border: string; dot: string }> = {
  "Qualification": { bg: "rgba(100, 116, 139, 0.1)", txt: "#94a3b8", border: "rgba(100, 116, 139, 0.25)", dot: "#94a3b8" },
  "Needs Analysis": { bg: "rgba(56, 189, 248, 0.1)", txt: "#38bdf8", border: "rgba(56, 189, 248, 0.25)", dot: "#38bdf8" },
  "Proposal": { bg: "rgba(99, 102, 241, 0.1)", txt: "#6366f1", border: "rgba(99, 102, 241, 0.25)", dot: "#6366f1" },
  "Negotiation": { bg: "rgba(245, 158, 11, 0.1)", txt: "#f59e0b", border: "rgba(245, 158, 11, 0.25)", dot: "#f59e0b" },
  "Closed Won": { bg: "rgba(16, 185, 129, 0.1)", txt: "#10b981", border: "rgba(16, 185, 129, 0.25)", dot: "#10b981" },
  "Closed Lost": { bg: "rgba(239, 68, 68, 0.1)", txt: "#ef4444", border: "rgba(239, 68, 68, 0.25)", dot: "#ef4444" }
};

const PROB_COLOR = (p: number) => {
  if (p >= 75) return "#10b981";
  if (p >= 50) return "#38bdf8";
  if (p >= 25) return "#f59e0b";
  return "#ef4444";
};

const SCREEN_WIDTH = Dimensions.get("window").width;
const METRIC_CARD_WIDTH = (SCREEN_WIDTH - 40) / 2;

function formatCurrencyShort(val: number) {
  if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
  if (val >= 1000) return `$${(val / 1000).toFixed(0)}K`;
  return `$${val.toLocaleString()}`;
}

function formatDate(dateStr: string) {
  if (!dateStr) return "—";
  const dateObj = new Date(dateStr);
  if (isNaN(dateObj.getTime())) return dateStr;
  return dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function useCountUp(target: number | string, duration = 1000) {
  const [display, setDisplay] = useState<number | string>(typeof target === "number" ? 0 : target);

  useEffect(() => {
    if (typeof target !== "number") {
      setDisplay(target);
      return;
    }
    let start = 0;
    const stepTime = Math.max(Math.floor(duration / target), 16);
    const increment = Math.ceil(target / (duration / stepTime));
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setDisplay(target);
        clearInterval(timer);
      } else {
        setDisplay(start);
      }
    }, stepTime);
    return () => clearInterval(timer);
  }, [target, duration]);

  return display;
}

function StageBadge({ stage }: { stage: string }) {
  const cfg = STAGE_CONFIG[stage] ?? STAGE_CONFIG["Qualification"];
  return (
    <View style={[styles.badgeFrame, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
      <View style={[styles.badgeDotNode, { backgroundColor: cfg.dot }]} />
      <Text style={[styles.badgeTextLabel, { color: cfg.txt }]}>{stage}</Text>
    </View>
  );
}

function ProbBar({ value }: { value: number }) {
  return (
    <View style={styles.probContainer}>
      <View style={styles.probTrack}>
        <View style={[styles.probFill, { width: `${value}%`, backgroundColor: PROB_COLOR(value) }]} />
      </View>
      <Text style={styles.probText}>{value}%</Text>
    </View>
  );
}

function MetricCard({ item, styles }: { item: any; styles: any }) {
  const countUpVal = useCountUp(item.val);
  return (
    <View style={styles.metricCard}>
      <View style={styles.metricCardHeader}>
        <View style={styles.iconContainerBackground}>{item.icon}</View>
        <View style={styles.pulseIndicator} />
      </View>
      <Text style={[styles.metricValue, { color: item.color }]}>
        {item.isCurrency ? formatCurrencyShort(Number(countUpVal)) : countUpVal.toLocaleString()}
      </Text>
      <Text style={styles.metricLabel}>{item.label}</Text>
    </View>
  );
}

export default function CRMDeals() {
  const queryClient = useQueryClient();
  const auth = useAuth();
  const { uiTheme } = useTheme();

  const isMetallic = uiTheme?.theme === "metallic-elite";

  const colors = useMemo(() => {
    const isDark = (uiTheme?.theme as string) === "dark" || isMetallic;
    return {
      background: uiTheme?.panelColors?.dashboardBackground || (isDark ? "#080b10" : "#f8fafc"),
      cardBg: uiTheme?.panelColors?.dashboardCardBackground || (isDark ? "#0f131a" : "#ffffff"),
      text: uiTheme?.panelColors?.dashboardTextColor || (isDark ? "#ffffff" : "#0f172a"),
      mutedText: isDark ? "rgba(255,255,255,0.4)" : "#475569",
      border: uiTheme?.panelColors?.dashboardBackground || (isDark ? "rgba(217,119,6,0.15)" : "#e2e8f0"),
      inputBg: isDark ? "#020617" : "#ffffff",
      inputBorder: isDark ? "rgba(255,255,255,0.1)" : "#cbd5e1",
      primary: uiTheme?.customColors?.primary || "#ffd27a"
    };
  }, [uiTheme, isMetallic]);

  const stylesInstance = useMemo(() => createStyles(colors), [colors]);

  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("All");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStageModal, setShowStageModal] = useState(false);
  const [showOwnerModal, setShowOwnerModal] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<CRMDeal | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    company: "",
    value: "",
    stage: "",
    probability: "50",
    closeDate: new Date().toISOString().split("T")[0],
    owner: ""
  });
  const [newStage, setNewStage] = useState("");
  const [newOwner, setNewOwner] = useState("");

  const [companyDropdownOpen, setCompanyDropdownOpen] = useState(false);
  const [stageDropdownOpen, setStageDropdownOpen] = useState(false);
  const [ownerDropdownOpen, setOwnerDropdownOpen] = useState(false);
  const [assignOwnerDropdownOpen, setAssignOwnerDropdownOpen] = useState(false);

  const dealsQuery = useQuery({
    queryKey: ["crm-deals"],
    queryFn: async () => await apiRequest("/crm-deals", { method: "GET" }) as ApiResponse
  });

  const companiesQuery = useQuery({
    queryKey: ["crm-companies-lookup"],
    queryFn: async () => await apiRequest("/crm-company", { method: "GET" }) as ApiResponse
  });

  const contactsQuery = useQuery({
    queryKey: ["crm-contacts-lookup"],
    queryFn: async () => await apiRequest("/crm-contacts", { method: "GET" }) as ApiResponse
  });

  const deals = dealsQuery.data?.data?.items || dealsQuery.data?.items || [];
  const pipelineMetrics = dealsQuery.data?.data?.metrics || dealsQuery.data?.metrics || { totalValue: 0, weightedValue: 0, wonDeals: 0, activeDeals: 0 };
  const companies = (companiesQuery.data?.data?.items || companiesQuery.data?.items || []) as CompanyLookup[];
  const contacts = (contactsQuery.data?.data?.items || contactsQuery.data?.items || []) as ContactLookup[];

  const createDealMutation = useMutation({
    mutationFn: async (payload: any) => await apiRequest("/crm-deals", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-deals"] });
      setShowCreateModal(false);
      resetFormState();
    },
    onError: (err: any) => Alert.alert("Error", err.message || "Failed to establish transaction.")
  });

  const updateDealMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) =>
      await apiRequest(`/crm-deals/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-deals"] });
      setShowStageModal(false);
      setShowOwnerModal(false);
      setSelectedDeal(null);
      setAssignOwnerDropdownOpen(false);
    },
    onError: (err: any) => Alert.alert("Update Failure", err.message)
  });

  const filteredDeals = useMemo(() => {
    return deals.filter((deal: CRMDeal) => {
      const matchQuery =
        deal.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        deal.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        deal.owner?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchQuery && (stageFilter === "All" || deal.stage === stageFilter);
    });
  }, [deals, searchQuery, stageFilter]);

  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = { All: deals.length };
    STAGES.forEach(s => {
      counts[s] = deals.filter((d: CRMDeal) => d.stage === s).length;
    });
    return counts;
  }, [deals]);

  const resetFormState = () => {
    setFormData({
      name: "",
      company: "",
      value: "",
      stage: "",
      probability: "50",
      closeDate: new Date().toISOString().split("T")[0],
      owner: ""
    });
  };

  const handleCreateSubmit = () => {
    if (!formData.name.trim() || !formData.company || !formData.value || !formData.closeDate || !formData.stage) {
      Alert.alert("Required Fields", "Please complete all fields marked with an asterisk (*).");
      return;
    }
    createDealMutation.mutate({
      name: formData.name.trim(),
      company: formData.company,
      value: Number(formData.value),
      stage: formData.stage,
      probability: Number(formData.probability),
      closeDate: formData.closeDate,
      owner: formData.owner
    });
  };

  if (dealsQuery.isLoading) {
    return (
      <View style={[stylesInstance.screen, stylesInstance.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={stylesInstance.loadingText}>Syncing deal pipelines...</Text>
      </View>
    );
  }

  const kpiMetricsData = [
    { label: "Total Pipeline", val: pipelineMetrics.totalValue, icon: <DollarSign size={14} color="#ffffff" />, color: "#fff", isCurrency: true },
    { label: "Weighted Value", val: pipelineMetrics.weightedValue, icon: <TrendingUp size={14} color="#38bdf8" />, color: "#38bdf8", isCurrency: true },
    { label: "Active Deals", val: pipelineMetrics.activeDeals, icon: <Layers size={14} color="#f59e0b" />, color: "#f59e0b", isCurrency: false },
    { label: "Won Deals", val: pipelineMetrics.wonDeals, icon: <Award size={14} color="#10b981" />, color: "#10b981", isCurrency: false }
  ];

  return (
    <SafeAreaView style={stylesInstance.screen}>
      <StatusBar barStyle="light-content" />
      <View style={stylesInstance.headerRow}>
        <View style={stylesInstance.headerLeft}>
          <View style={[stylesInstance.logoBadge, { backgroundColor: colors.border, borderColor: colors.border }]}>
            <Briefcase size={16} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={stylesInstance.headerTitle}>Deals Pipeline</Text>
            <Text style={stylesInstance.headerSubtitle}>Monitor portfolio metrics and forecasting</Text>
          </View>
        </View>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[stylesInstance.newButton, { backgroundColor: colors.primary }]}
          onPress={() => { resetFormState(); setShowCreateModal(true); }}
        >
          <Plus size={14} color="#080b10" style={{ marginRight: 2 }} />
          <Text style={stylesInstance.newButtonText}>New Deal</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={stylesInstance.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={stylesInstance.metricsGrid}>
          {kpiMetricsData.map((item, idx) => (
            <MetricCard key={idx} item={item} styles={stylesInstance} />
          ))}
        </View>

        <View style={stylesInstance.searchContainer}>
          <View style={stylesInstance.searchBarWrapperFrame}>
            <Search size={14} color={colors.mutedText} />
            <TextInput
              placeholder="Search deals, companies, owners..."
              placeholderTextColor={colors.mutedText}
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={stylesInstance.searchInput}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <X size={14} color={colors.text} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={stylesInstance.filtersScroll}>
          {["All", ...STAGES].map(stage => {
            const isActive = stageFilter === stage;
            return (
              <TouchableOpacity
                key={stage}
                style={[stylesInstance.filterPill, isActive && { backgroundColor: colors.primary, borderColor: "transparent" }]}
                onPress={() => setStageFilter(stage)}
              >
                <Text style={[stylesInstance.filterPillText, isActive && { color: "#080b10", fontWeight: "900" }]}>
                  {stage} <Text style={[stylesInstance.pillCount, isActive && { color: "rgba(8,11,16,0.6)" }]}>({stageCounts[stage] || 0})</Text>
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={stylesInstance.dealsSection}>
          {filteredDeals.length === 0 ? (
            <View style={[stylesInstance.emptyCard, { borderColor: colors.border }]}>
              <Briefcase size={28} color={colors.mutedText} />
              <Text style={stylesInstance.emptyCardText}>No pipeline metrics found matching target query.</Text>
            </View>
          ) : (
            filteredDeals.map((deal: CRMDeal) => {
              return (
                <View key={deal.id} style={[stylesInstance.dealRowCard, { borderColor: colors.border }]}>
                  <View style={stylesInstance.dealCardHeader}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={stylesInstance.dealName} numberOfLines={1}>{deal.name}</Text>
                      <Text style={stylesInstance.dealCompany} numberOfLines={1}>{deal.company}</Text>
                    </View>
                    <StageBadge stage={deal.stage} />
                  </View>

                  <View style={stylesInstance.dealMetaGrid}>
                    <View style={stylesInstance.metaBox}>
                      <Text style={stylesInstance.metaLabel}>Value</Text>
                      <Text style={stylesInstance.metaValue}>${deal.value?.toLocaleString() || "0"}</Text>
                    </View>
                    <View style={stylesInstance.metaBox}>
                      <Text style={stylesInstance.metaLabel}>Probability</Text>
                      <ProbBar value={deal.probability} />
                    </View>
                  </View>

                  <View style={stylesInstance.dealFooterLine}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Calendar size={12} color={colors.mutedText} />
                      <Text style={stylesInstance.dateLabel}>{formatDate(deal.closeDate)}</Text>
                    </View>
                    <View style={stylesInstance.ownerAvatarRow}>
                      <View style={[stylesInstance.miniAvatar, { backgroundColor: colors.border }]}>
                        <Text style={[stylesInstance.miniAvatarTxt, { color: colors.primary }]}>
                          {deal.owner?.charAt(0).toUpperCase() || "?"}
                        </Text>
                      </View>
                      <Text style={stylesInstance.ownerTxt} numberOfLines={1}>{deal.owner || "Unassigned"}</Text>
                    </View>
                  </View>

                  <View style={stylesInstance.actionRow}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={[stylesInstance.actionButton, { borderColor: colors.border }]}
                      onPress={() => { setSelectedDeal(deal); setNewStage(deal.stage); setShowStageModal(true); }}
                    >
                      <Layers size={12} color={colors.primary} style={{ marginRight: 4 }} />
                      <Text style={[stylesInstance.actionButtonText, { color: colors.primary }]}> Stage</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={[stylesInstance.actionButton, stylesInstance.actionButtonOwner]}
                      onPress={() => { setSelectedDeal(deal); setNewOwner(deal.owner || ""); setAssignOwnerDropdownOpen(false); setShowOwnerModal(true); }}
                    >
                      <User size={12} color="#34d399" style={{ marginRight: 4 }} />
                      <Text style={[stylesInstance.actionButtonText, { color: "#34d399" }]}> Owner</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={stylesInstance.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={[stylesInstance.modalCard, { borderColor: colors.border }]}>
            <View style={stylesInstance.modalHeaderTopBarInlineRow}>
              <Text style={stylesInstance.modalTitle}>Create New Deal</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)} style={stylesInstance.modalCloseCircleAnchor}>
                <X size={16} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={stylesInstance.fieldLabel}>Deal Title *</Text>
              <TextInput
                value={formData.name}
                onChangeText={t => setFormData({ ...formData, name: t })}
                placeholder="e.g. Q3 Enterprise Expansion Contract"
                placeholderTextColor={colors.mutedText}
                style={stylesInstance.modalInput}
              />

              <Text style={stylesInstance.fieldLabel}>Associated Corporate Entity *</Text>
              <TouchableOpacity style={stylesInstance.customSelectorTriggerAnchor} onPress={() => setCompanyDropdownOpen(true)}>
                <Text style={stylesInstance.customSelectorTriggerDisplayValue} numberOfLines={1}>
                  {formData.company || "Select Company"}
                </Text>
                <ChevronDown size={14} color={colors.text} />
              </TouchableOpacity>

              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={stylesInstance.fieldLabel}>Deal Valuation ($) *</Text>
                  <TextInput
                    keyboardType="numeric"
                    value={formData.value}
                    onChangeText={t => setFormData({ ...formData, value: t })}
                    placeholder="0"
                    placeholderTextColor={colors.mutedText}
                    style={stylesInstance.modalInput}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={stylesInstance.fieldLabel}>Probability (%)</Text>
                  <TextInput
                    keyboardType="numeric"
                    value={formData.probability}
                    onChangeText={t => setFormData({ ...formData, probability: t })}
                    placeholder="50"
                    placeholderTextColor={colors.mutedText}
                    style={stylesInstance.modalInput}
                  />
                </View>
              </View>

              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={stylesInstance.fieldLabel}>Pipeline Stage *</Text>
                  <TouchableOpacity style={stylesInstance.customSelectorTriggerAnchor} onPress={() => setStageDropdownOpen(true)}>
                    <Text style={stylesInstance.customSelectorTriggerDisplayValue} numberOfLines={1}>
                      {formData.stage || "Select Stage"}
                    </Text>
                    <ChevronDown size={14} color={colors.text} />
                  </TouchableOpacity>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={stylesInstance.fieldLabel}>Estimated Close Date *</Text>
                  <TextInput
                    value={formData.closeDate}
                    onChangeText={t => setFormData({ ...formData, closeDate: t })}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.mutedText}
                    style={stylesInstance.modalInput}
                  />
                </View>
              </View>

              <Text style={stylesInstance.fieldLabel}>Account Owner Assignment</Text>
              <TouchableOpacity style={stylesInstance.customSelectorTriggerAnchor} onPress={() => setOwnerDropdownOpen(true)}>
                <Text style={stylesInstance.customSelectorTriggerDisplayValue} numberOfLines={1}>
                  {formData.owner || "Select Owner"}
                </Text>
                <ChevronDown size={14} color={colors.text} />
              </TouchableOpacity>
            </ScrollView>

            <View style={stylesInstance.modalActionsRow}>
              <TouchableOpacity style={stylesInstance.cancelBtn} onPress={() => setShowCreateModal(false)}>
                <Text style={stylesInstance.cancelBtnTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[stylesInstance.saveBtn, { backgroundColor: colors.primary }]} onPress={handleCreateSubmit}>
                <Text style={stylesInstance.saveBtnTxt}>Create Deal</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal visible={showStageModal} transparent animationType="fade">
        <View style={stylesInstance.modalOverlay}>
          <View style={[stylesInstance.modalCard, { borderColor: colors.border }]}>
            <View style={stylesInstance.modalHeaderTopBarInlineRow}>
              <Text style={stylesInstance.modalTitle}>Update Deal Stage</Text>
              <TouchableOpacity onPress={() => setShowStageModal(false)} style={stylesInstance.modalCloseCircleAnchor}>
                <X size={16} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ marginVertical: 12 }} showsVerticalScrollIndicator={false}>
              {STAGES.map(s => {
                const isSelected = newStage === s;
                return (
                  <TouchableOpacity
                    key={s}
                    style={[stylesInstance.stageSelectOption, isSelected && { backgroundColor: "rgba(255,255,255,0.03)", borderColor: colors.primary }]}
                    onPress={() => setNewStage(s)}
                  >
                    <View style={[styles.badgeDotNode, { backgroundColor: STAGE_CONFIG[s]?.dot || "#fff" }]} />
                    <Text style={[stylesInstance.stageOptionText, isSelected && { color: colors.text, fontWeight: "800" }]}>{s}</Text>
                    {isSelected && <Text style={{ color: colors.primary, fontWeight: "900", marginLeft: "auto" }}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <View style={stylesInstance.modalActionsRow}>
              <TouchableOpacity style={stylesInstance.cancelBtn} onPress={() => setShowStageModal(false)}>
                <Text style={stylesInstance.cancelBtnTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[stylesInstance.saveBtn, { backgroundColor: colors.primary }]}
                onPress={() => updateDealMutation.mutate({ id: selectedDeal!.id, data: { stage: newStage } })}
              >
                <Text style={stylesInstance.saveBtnTxt}>Save Stage</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showOwnerModal} transparent animationType="fade">
        <View style={stylesInstance.modalOverlay}>
          <View style={[stylesInstance.modalCard, { borderColor: colors.border }]}>
            <View style={stylesInstance.modalHeaderTopBarInlineRow}>
              <Text style={stylesInstance.modalTitle}>Assign Pipeline Owner</Text>
              <TouchableOpacity onPress={() => setShowOwnerModal(false)} style={stylesInstance.modalCloseCircleAnchor}>
                <X size={16} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={stylesInstance.fieldLabel}>Select Target Owner Contact</Text>
            
            <TouchableOpacity 
              style={[stylesInstance.customSelectorTriggerAnchor, { marginVertical: 8 }]} 
              onPress={() => setAssignOwnerDropdownOpen(!assignOwnerDropdownOpen)}
            >
              <Text style={stylesInstance.customSelectorTriggerDisplayValue} numberOfLines={1}>
                {newOwner || "Select Owner"}
              </Text>
              <ChevronDown size={14} color={colors.text} />
            </TouchableOpacity>

            {assignOwnerDropdownOpen && (
              <View style={[stylesInstance.inlineDropdownContainer, { borderColor: colors.border }]}>
                <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                  <TouchableOpacity
                    style={stylesInstance.dropdownListItemInteractableRow}
                    onPress={() => { setNewOwner(""); setAssignOwnerDropdownOpen(false); }}
                  >
                    <Text style={stylesInstance.dropdownListItemDisplayValueText}>Unassigned</Text>
                  </TouchableOpacity>
                  {contacts.map(c => (
                    <TouchableOpacity
                      key={c.id}
                      style={stylesInstance.dropdownListItemInteractableRow}
                      onPress={() => { setNewOwner(c.name); setAssignOwnerDropdownOpen(false); }}
                    >
                      <Text style={stylesInstance.dropdownListItemDisplayValueText}>{c.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={stylesInstance.modalActionsRow}>
              <TouchableOpacity style={stylesInstance.cancelBtn} onPress={() => setShowOwnerModal(false)}>
                <Text style={stylesInstance.cancelBtnTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[stylesInstance.saveBtn, { backgroundColor: colors.primary }]}
                onPress={() => updateDealMutation.mutate({ id: selectedDeal!.id, data: { owner: newOwner } })}
              >
                <Text style={stylesInstance.saveBtnTxt}>Assign</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={companyDropdownOpen} transparent animationType="fade">
        <TouchableOpacity style={stylesInstance.dropdownOverlayBackdropClick} activeOpacity={1} onPress={() => setCompanyDropdownOpen(false)}>
          <View style={[stylesInstance.dropdownListLayoutCardContainer, { borderColor: colors.primary }]}>
            <Text style={stylesInstance.dropdownModalTitleHeaderLabel}>Select Corporate Entity</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {companies.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={stylesInstance.dropdownListItemInteractableRow}
                  onPress={() => { setFormData({ ...formData, company: c.name }); setCompanyDropdownOpen(false); }}
                >
                  <Text style={stylesInstance.dropdownListItemDisplayValueText}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={stageDropdownOpen} transparent animationType="fade">
        <TouchableOpacity style={stylesInstance.dropdownOverlayBackdropClick} activeOpacity={1} onPress={() => setStageDropdownOpen(false)}>
          <View style={[stylesInstance.dropdownListLayoutCardContainer, { borderColor: colors.primary }]}>
            <Text style={stylesInstance.dropdownModalTitleHeaderLabel}>Select Target Stage</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {STAGES.map(s => (
                <TouchableOpacity
                  key={s}
                  style={stylesInstance.dropdownListItemInteractableRow}
                  onPress={() => { setFormData({ ...formData, stage: s }); setStageDropdownOpen(false); }}
                >
                  <Text style={stylesInstance.dropdownListItemDisplayValueText}>{s}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={ownerDropdownOpen} transparent animationType="fade">
        <TouchableOpacity style={stylesInstance.dropdownOverlayBackdropClick} activeOpacity={1} onPress={() => setOwnerDropdownOpen(false)}>
          <View style={[stylesInstance.dropdownListLayoutCardContainer, { borderColor: colors.primary }]}>
            <Text style={stylesInstance.dropdownModalTitleHeaderLabel}>Select Core Executive Owner</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                style={stylesInstance.dropdownListItemInteractableRow}
                onPress={() => { setFormData({ ...formData, owner: "Unassigned" }); setOwnerDropdownOpen(false); }}
              >
                <Text style={stylesInstance.dropdownListItemDisplayValueText}>Unassigned</Text>
              </TouchableOpacity>
              {contacts.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={stylesInstance.dropdownListItemInteractableRow}
                  onPress={() => { setFormData({ ...formData, owner: c.name }); setOwnerDropdownOpen(false); }}
                >
                  <Text style={stylesInstance.dropdownListItemDisplayValueText}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  badgeFrame: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1
  },
  badgeDotNode: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginRight: 4
  },
  badgeTextLabel: {
    fontSize: 10,
    fontWeight: "800"
  },
  probContainer: {
    flexDirection: "row",
    alignItems: "center"
  },
  probTrack: {
    width: 54,
    height: 4,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 2,
    marginRight: 6,
    overflow: "hidden"
  },
  probFill: {
    height: "100%",
    borderRadius: 2
  },
  probText: {
    fontSize: 11,
    fontWeight: "700"
  }
});

const createStyles = (colors: any) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background
  },
  centered: {
    justifyContent: "center",
    alignItems: "center"
  },
  loadingText: {
    color: colors.mutedText,
    fontSize: 12,
    marginTop: 12,
    fontWeight: "600"
  },
  scrollContainer: {
    paddingHorizontal: 16,
    paddingBottom: 40
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderColor: colors.border
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    borderWidth: 1
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: colors.text
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.mutedText,
    marginTop: 2
  },
  newButton: {
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center"
  },
  newButtonText: {
    color: "#080b10",
    fontSize: 11,
    fontWeight: "900"
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 14
  },
  metricCard: {
    width: METRIC_CARD_WIDTH,
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10
  },
  metricCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8
  },
  iconContainerBackground: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.03)",
    alignItems: "center",
    justifyContent: "center"
  },
  pulseIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#10b981"
  },
  metricValue: {
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 2
  },
  metricLabel: {
    fontSize: 10,
    color: colors.mutedText,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  searchContainer: {
    marginVertical: 12
  },
  searchBarWrapperFrame: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.15)",
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 38
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 12,
    paddingLeft: 6
  },
  filtersScroll: {
    flexDirection: "row",
    marginVertical: 4,
    paddingBottom: 8,
    gap: 6
  },
  filterPill: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: colors.inputBorder,
    paddingHorizontal: 12,
    height: 28,
    borderRadius: 6,
    justifyContent: "center"
  },
  filterPillText: {
    fontSize: 11,
    color: colors.text,
    fontWeight: "600"
  },
  pillCount: {
    fontSize: 10,
    color: colors.mutedText
  },
  dealsSection: {
    marginTop: 8
  },
  emptyCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    gap: 8
  },
  emptyCardText: {
    color: colors.mutedText,
    fontSize: 12,
    textAlign: "center",
    fontWeight: "500"
  },
  dealRowCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginBottom: 12
  },
  dealCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12
  },
  dealName: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text
  },
  dealCompany: {
    fontSize: 11,
    color: colors.mutedText,
    marginTop: 2
  },
  dealMetaGrid: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.12)",
    padding: 10,
    borderRadius: 10,
    marginBottom: 12
  },
  metaBox: {
    flex: 1
  },
  metaLabel: {
    fontSize: 9,
    color: colors.mutedText,
    textTransform: "uppercase",
    marginBottom: 4,
    fontWeight: "700"
  },
  metaValue: {
    fontSize: 14,
    fontWeight: "800",
    color: "#10b981"
  },
  dealFooterLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.03)",
    paddingBottom: 10,
    marginBottom: 10
  },
  dateLabel: {
    fontSize: 11,
    color: colors.mutedText,
    fontWeight: "500"
  },
  ownerAvatarRow: {
    flexDirection: "row",
    alignItems: "center",
    maxWidth: 140
  },
  miniAvatar: {
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)"
  },
  miniAvatarTxt: {
    fontSize: 9,
    fontWeight: "900"
  },
  ownerTxt: {
    fontSize: 11,
    color: colors.text,
    fontWeight: "600"
  },
  actionRow: {
    flexDirection: "row",
    gap: 8
  },
  actionButton: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.02)",
    borderWidth: 1,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row"
  },
  actionButtonOwner: {
    borderColor: "rgba(16, 185, 129, 0.25)",
    backgroundColor: "rgba(16, 185, 129, 0.02)"
  },
  actionButtonText: {
    fontSize: 11,
    fontWeight: "700"
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16
  },
  modalCard: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    width: "100%",
    maxWidth: 360,
    maxHeight: "85%"
  },
  modalHeaderTopBarInlineRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 12
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: colors.text
  },
  modalCloseCircleAnchor: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
    justifyContent: "center"
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.mutedText,
    textTransform: "uppercase",
    marginBottom: 6,
    marginTop: 12
  },
  modalInput: {
    backgroundColor: "rgba(0,0,0,0.2)",
    borderWidth: 1,
    borderColor: colors.inputBorder,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 8,
    color: colors.text,
    fontSize: 12
  },
  customSelectorTriggerAnchor: {
    height: 40,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: "rgba(0,0,0,0.2)",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  customSelectorTriggerDisplayValue: {
    fontSize: 12,
    color: colors.text,
    fontWeight: "500",
    flex: 1
  },
  inlineDropdownContainer: {
    width: "100%",
    backgroundColor: "rgba(0,0,0,0.2)",
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 2,
    paddingHorizontal: 4,
    overflow: "hidden"
  },
  modalActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingTop: 12
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
    height: 38,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center"
  },
  cancelBtnTxt: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700"
  },
  saveBtn: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center"
  },
  saveBtnTxt: {
    color: "#080b10",
    fontSize: 12,
    fontWeight: "900"
  },
  stageSelectOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "rgba(0,0,0,0.1)",
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 8,
    marginBottom: 6
  },
  stageOptionText: {
    fontSize: 12,
    color: colors.mutedText,
    fontWeight: "600",
    marginLeft: 10
  },
  dropdownOverlayBackdropClick: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center"
  },
  dropdownListLayoutCardContainer: {
    width: SCREEN_WIDTH * 0.85,
    maxWidth: 320,
    maxHeight: 280,
    backgroundColor: colors.cardBg,
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 14
  },
  dropdownModalTitleHeaderLabel: {
    fontSize: 10,
    fontWeight: "900",
    color: colors.primary,
    textTransform: "uppercase",
    marginBottom: 10,
    letterSpacing: 0.5
  },
  dropdownListItemInteractableRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 8
  },
  dropdownListItemDisplayValueText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: "500"
  }
});