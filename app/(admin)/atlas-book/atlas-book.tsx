import React, { useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  Image,
} from "react-native";
import {
  Building2,
  Landmark,
  LayoutDashboard,
  ListTree,
  Calculator,
  ArrowRightLeft,
  Receipt,
  Wallet,
  Users,
  UserCheck,
  ScanLine,
  Box,
  Coins,
  PiggyBank,
  PieChart,
  ShieldAlert,
  CreditCard,
  ShieldCheck,
  BarChart3,
  ClipboardCheck,
  Globe,
  Scale,
  Activity,
  Timer,
  Search,
  ArrowRight,
} from "lucide-react-native";
import { useTheme } from "@/contexts/ThemeContext";

const { width } = Dimensions.get("window");
const COLUMN_WIDTH = (width - 44) / 2;

interface ModuleItem {
  id: string;
  title: string;
  icon: React.ComponentType<any>;
  color: string;
  bg: string;
}

export const atlasModules: ModuleItem[] = [
  { id: "company", title: "Company Management", icon: Building2, color: "#3B82F6", bg: "rgba(59,130,246,0.12)" },
  { id: "property", title: "Property Management", icon: Landmark, color: "#10B981", bg: "rgba(16,185,129,0.12)" },
  { id: "unit", title: "Unit Management", icon: LayoutDashboard, color: "#6366F1", bg: "rgba(99,102,241,0.12)" },
  { id: "coa", title: "Chart of Accounts", icon: ListTree, color: "#8B5CF6", bg: "rgba(139,92,246,0.12)" },
  { id: "gl", title: "General Ledger", icon: Calculator, color: "#F97316", bg: "rgba(249,115,22,0.12)" },
  { id: "transactions", title: "Transaction Management", icon: ArrowRightLeft, color: "#EC4899", bg: "rgba(236,72,153,0.12)" },
  { id: "ap", title: "Accounts Payable", icon: Receipt, color: "#EF4444", bg: "rgba(239,68,68,0.12)" },
  { id: "ar", title: "Accounts Receivable", icon: Wallet, color: "#06B6D4", bg: "rgba(6,182,212,0.12)" },
  { id: "vendor", title: "Vendor Management", icon: Users, color: "#F59E0B", bg: "rgba(245,158,11,0.12)" },
  { id: "customer", title: "Customer/Tenant Management", icon: UserCheck, color: "#14B8A6", bg: "rgba(20,184,166,0.12)" },
  { id: "ocr", title: "Receipt & OCR Module", icon: ScanLine, color: "#8B5CF6", bg: "rgba(139,92,246,0.12)" },
  { id: "inventory", title: "Inventory Management", icon: Box, color: "#2563EB", bg: "rgba(37,99,235,0.12)" },
  { id: "payroll", title: "Payroll Module", icon: Coins, color: "#16A34A", bg: "rgba(22,163,74,0.12)" },
  { id: "budget", title: "Budget Management", icon: ShieldCheck,color: "#EAB308", bg: "rgba(234,179,8,0.12)" },
  { id: "reporting", title: "Financial Reporting", icon: PieChart, color: "#4F46E5", bg: "rgba(79,70,229,0.12)" },
  { id: "fraud", title: "Fraud Detection", icon: ShieldAlert, color: "#DC2626", bg: "rgba(220,38,38,0.12)" },
  { id: "credit", title: "Credit Monitoring", icon: CreditCard, color: "#0284C7", bg: "rgba(2,132,199,0.12)" },
  { id: "title", title: "Title & Lien Monitoring", icon: ShieldCheck, color: "#65A30D", bg: "rgba(101,163,13,0.12)" },
  { id: "analytics", title: "Dashboard & Analytics", icon: BarChart3, color: "#E11D48", bg: "rgba(225,29,72,0.12)" },
  { id: "audit", title: "Audit & Compliance", icon: ClipboardCheck, color: "#475569", bg: "rgba(71,85,105,0.12)" },
  { id: "currency", title: "Multi-Currency Module", icon: Globe, color: "#0891B2", bg: "rgba(8,145,178,0.12)" },
  { id: "tax", title: "Tax Management", icon: Scale, color: "#EA580C", bg: "rgba(234,88,12,0.12)" },
  { id: "fixed-assets", title: "Fixed Asset Management", icon: Activity, color: "#1D4ED8", bg: "rgba(29,78,216,0.12)" },
  { id: "loans", title: "Loan & Financing", icon: Landmark, color: "#047857", bg: "rgba(4,120,87,0.12)" },
  { id: "investor", title: "Investor Reporting", icon: PieChart, color: "#6D28D9", bg: "rgba(109,40,217,0.12)" },
  { id: "approval", title: "Approval Workflow", icon: Timer, color: "#B45309", bg: "rgba(180,83,9,0.12)" },
  { id: "search", title: "Search & Analytics", icon: Search, color: "#4338CA", bg: "rgba(67,56,202,0.12)" },
];

function buildColors(uiTheme: any, isDark: boolean) {
  return {
    background:       uiTheme.panelColors?.dashboardBackground     || (isDark ? "#09090b" : "#F8FAFC"),
    cardBg:           uiTheme.panelColors?.dashboardCardBackground || (isDark ? "#18181b" : "#FFFFFF"),
    text:             uiTheme.panelColors?.dashboardTextColor      || (isDark ? "#F4F4F5" : "#0F172A"),
    textSecondary:    isDark ? "#A1A1AA" : "#475569",
    border:           isDark ? "#27272A" : "#E2E8F0",
    primary:          uiTheme.customColors?.primary || "#FFD27A",
  };
}

function createStyles(colors: ReturnType<typeof buildColors>) {
  return StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: colors.background },
    scrollContainerPadding: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 40 },
    headerLayoutColumn: { marginBottom: 24, flexDirection: "column", gap: 12 },
    logoTitleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    logoImagePlaceholder: { width: 36, height: 36, resizeMode: "contain" },
    mainTitleText: { fontSize: 26, fontWeight: "900", letterSpacing: -0.5, color: colors.text },
    subtitleText: { fontSize: 14, fontWeight: "400", lineHeight: 20, color: colors.textSecondary },
    modulesGrid: { justifyContent: "space-between" },
    cardWrapper: {
      width: COLUMN_WIDTH,
      borderRadius: 16,
      borderWidth: 1,
      padding: 16,
      marginBottom: 12,
      justifyContent: "space-between",
      minHeight: 140,
      backgroundColor: colors.cardBg,
      borderColor: colors.border,
    },
    iconBoxContainer: { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center", marginBottom: 12 },
    cardTitleText: { fontSize: 14, fontWeight: "700", lineHeight: 18, marginBottom: 12, color: colors.text },
    actionFooterRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: "auto" },
    actionFooterText: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, color: colors.textSecondary },
  });
}

export default function AtlasBookDashboard() {
  const { uiTheme } = useTheme();
  const isDark = (uiTheme.theme as string) === "dark" || (uiTheme.theme as string) === "metallic-elite";
  const colors = useMemo(() => buildColors(uiTheme, isDark), [uiTheme, isDark]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.mainContainer}>
      <FlatList
        data={atlasModules}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.modulesGrid}
        contentContainerStyle={styles.scrollContainerPadding}
        ListHeaderComponent={
          <View style={styles.headerLayoutColumn}>
            <View style={styles.logoTitleRow}>
              <Image source={{ uri: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=80&auto=format&fit=crop&q=60" }} style={styles.logoImagePlaceholder} />
              <Text style={styles.mainTitleText}>
                Atlas<Text style={{ color: colors.primary }}>Books</Text>
              </Text>
            </View>
            <Text style={styles.subtitleText}>
              The ultimate business engine for comprehensive financial and operational management.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const IconComponent = item.icon;
          return (
            <TouchableOpacity activeOpacity={0.8} style={styles.cardWrapper}>
              <View>
                <View style={[styles.iconBoxContainer, { backgroundColor: item.bg }]}>
                  <IconComponent size={22} color={item.color} />
                </View>
                <Text style={styles.cardTitleText} numberOfLines={2}>
                  {item.title}
                </Text>
              </View>
              <View style={styles.actionFooterRow}>
                <Text style={styles.actionFooterText}>View Module</Text>
                <ArrowRight size={12} color={colors.textSecondary} />
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}