import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Modal,
  TouchableWithoutFeedback,
  Platform,
  Image,
} from 'react-native';

import { usePathname, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Calendar,
  Clock3,
  MessageSquare,
  Bell,
  User,
  Car,
  Wrench,
  Menu,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Megaphone,
  Bug,
  Building2,
  UserRoundX,
  Settings,
  Activity,
  Mail,
  ShoppingCart,
  Building,
  FileText,
  Book,
  ImageIcon,
  Quote,
  Square,
  UserCircle,
  Compass,
  Video,
  Wallet,
  Calendar1,
  Clock,
  Coffee,
  Layers,
  Shield,
  Landmark,
  FolderOpen,
  BarChart,
  Globe,
  Lightbulb,
  Database,
  Archive,
  History,
  Locate,
  Home,
  Globe2,
  LogOut,
  Calendar1Icon,
  CaseLower,
  Contact2,
  Linkedin,
  HistoryIcon,
  File,
  PowerOff,
  FileLineChart,
  NotebookTabs,
  AlertCircle,
  Speaker,
  Workflow,
} from 'lucide-react-native';

import { useAuth } from '@/contexts/AuthContext';

const SIDEBAR_WIDTH = 270;

const MENU_ITEMS = [
  {
    id: 1,
    label: 'Activity Logs',
    icon: Activity,
    path: '/(admin)/activity-logs',
    superAdminOnly: true,
  },
  {
    id: 2,
    label: 'Announcements',
    icon: Megaphone,
    path: '/(admin)/announcements',
  },
  {
    id: 3,
    label: 'Archive Data',
    icon: Archive,
    path: '/(admin)/archive-data',
  },
  {
    id: 4,
    label: 'AtlasBook',
    icon: Book,
    children: [
      { label: "Accounts Payable", path: "/(admin)/atlas-book/accountpayble" },
      { label: "Accounts Receivable", path: "/(admin)/atlas-book/accountreceivable" },
      { label: "Approval Workflow", path: "/(admin)/atlas-book/approvalworkflow" },
      { label: "AtlasBook Dashboard", path: "/(admin)/atlas-book/atlas-book" },
      { label: "Audit & Compliance", path: "/(admin)/atlas-book/auditcompliance" },
      { label: "Budget Management", path: "/(admin)/atlas-book/budgetmanagement" },
      { label: "Chart of Accounts", path: "/(admin)/atlas-book/chartofaccount" },
      { label: "Company Management", path: "/(admin)/atlas-book/companymanagement" },
      { label: "Credit Monitoring", path: "/(admin)/atlas-book/creditmonitoring" },
      { label: "Customer/Tenant Management", path: "/(admin)/atlas-book/customer-tenant-management" },
      { label: "Dashboard & Analytics", path: "/(admin)/atlas-book/dashboard-analytics" },
      { label: "Financial Reporting", path: "/(admin)/atlas-book/financial-reporting" },
      { label: "Fixed Asset Management", path: "/(admin)/atlas-book/fixed-assets" },
      { label: "Fraud Detection", path: "/(admin)/atlas-book/fraud-detection" },
      { label: "General Ledger", path: "/(admin)/atlas-book/general-ledger" },
      { label: "Inventory Management", path: "/(admin)/atlas-book/inventory-management" },
      { label: "Investor Reporting", path: "/(admin)/atlas-book/investor-reporting" },
      { label: "Loan & Financing", path: "/(admin)/atlas-book/loans-financing" },
      { label: "Multi-Currency Module", path: "/(admin)/atlas-book/currency-module" },
      { label: "Payroll Module", path: "/(admin)/atlas-book/payroll-module" },
      { label: "Property Management", path: "/(admin)/atlas-book/property-management" },
      { label: "Receipt & OCR Module", path: "/(admin)/atlas-book/ocr-module" },
      { label: "Search & Analytics", path: "/(admin)/atlas-book/search-analytics" },
      { label: "Tax Management", path: "/(admin)/atlas-book/tax-management" },
      { label: "Title & Lien Monitoring", path: "/(admin)/atlas-book/title-line-monitoring" },
      { label: "Transaction Management", path: "/(admin)/atlas-book/transactions" },
      { label: "Unit Management", path: "/(admin)/atlas-book/unitmanagement" },
      { label: "Vendor Management", path: "/(admin)/atlas-book/vendormanagement" },
    ],
  },
  {
    id: 45,
    label: 'Atlas Properties',
    icon: Home,
    path: '/(admin)/atlas-property',
  },
  {
    id: 5,
    label: 'Break History',
    icon: Coffee,
    path: '/(admin)/break-history',
  },
  {
    id: 6,
    label: 'Bug Reports',
    icon: Bug,
    path: '/(admin)/bug',
  },
  {
    id: 7,
    label: 'Companies',
    icon: Landmark,
    path: '/(admin)/companies',
  },
  {
    id: 8,
    label: 'Company Information',
    icon: FileText,
    path: '/(admin)/company-information',
  },
  {
    id: 82,
    label: 'Compliance Center',
    icon: FileText,
    path: '/(admin)/compliance-center',
  },
  {
    id: 9,
    label: 'Contributors',
    icon: Users,
    path: '/(admin)/contributors',
  },
  {
    id: 10,
    label: 'CRM',
    icon: FileText,
    children: [
      { icon: Activity, label: "CommandCore®", path: "/(admin)/crm/commandcore" },
      { icon: Building, label: "Companies", path: "/(admin)/crm/companies" },
      { icon: Users, label: "Contacts", path: "/(admin)/crm/contacts" },
      { icon: Calendar, label: "CRM Dashboard", path: "/(admin)/crm/dashboard" },
      { icon: Square, label: "CRM Deals", path: "/(admin)/crm/deals" },
      { icon: ClipboardList, label: "CRM Tasks", path: "/(admin)/crm/tasks" },
      { icon: FolderOpen, label: "Files", path: "/(admin)/crm/files" },
    ],
  },
  {
    id: 11,
    label: 'Dashboard',
    icon: LayoutDashboard,
    path: '/(admin)/home',
  },
  {
    id: 12,
    label: 'Delegation',
    icon: Shield,
    children: [
      { icon: User, label: "Team Lead Mappings", path: "/(admin)/delegation/TeamLeadMappings" },
      { icon: Shield, label: "Task Permissions", path: "/(admin)/delegation/TaskPermissions" },
    ],
  },
  {
    id: 13,
    label: 'Digital Assets',
    icon: Globe,
    path: '/(admin)/digital-assets',
  },
  {
    id: 14,
    label: 'EIN List',
    icon: Building,
    path: '/(admin)/enlist',
  },
  {
    id: 15,
    label: 'Employee Directory',
    icon: UserCircle,
    path: '/(admin)/employee-directory',
  },
  {
    id: 16,
    label: 'EOD Reports',
    icon: ClipboardList,
    path: '/(admin)/eod-reports',
  },
  {
    id: 17,
    label: 'Founder Messages',
    icon: Quote,
    path: '/(admin)/founder-messages',
  },
  {
    id: 18,
    label: 'Images',
    icon: FolderOpen,
    path: '/(admin)/images',
  },
  {
    id: 19,
    label: 'Imported Asana Data',
    icon: Database,
    path: '/(admin)/asana-data',
  },
  {
    id: 20,
    label: 'Intellectual Property',
    icon: Lightbulb,
    path: '/(admin)/intellectual-property',
  },
  {
    id: 21,
    label: 'Itinerary History',
    icon: Compass,
    path: '/(admin)/itineraries',
  },
  {
    id: 22,
    label: 'Leave Requests',
    icon: Calendar1,
    path: '/(admin)/leave-requests',
  },
  {
    id: 121,
    label: 'Legal Tracker',
    icon: Layers,
    children: [
      { icon: Calendar1Icon, label: "Calender", path: "/(admin)/legaltrak/calender" },
      { icon: CaseLower, label: "Cases", path: "/(admin)/legaltrak/cases" },
      { icon: Contact2, label: "Contacts", path: "/(admin)/legaltrak/contacts" },
      { icon: HistoryIcon, label: "Dead Lines", path: "/(admin)/legaltrak/deadlines" },
      { icon: File, label: "Docements", path: "/(admin)/legaltrak/doccument" },
      { icon: PowerOff, label: "Evidense", path: "/(admin)/legaltrak/evidense" },
      { icon: FileLineChart, label: "Fillings", path: "/(admin)/legaltrak/fillings" },
      { icon: NotebookTabs, label: "Notes", path: "/(admin)/legaltrak/notes" },
      { icon: AlertCircle, label: "Notifications", path: "/(admin)/legaltrak/notifications" },
      { icon: Speaker, label: "Reports", path: "/(admin)/legaltrak/reports" },
      { icon: Workflow, label: "Task", path: "/(admin)/legaltrak/task" },
    ],
  },
  {
    id: 23,
    label: 'Memes',
    icon: ImageIcon,
    path: '/(admin)/memes',
  },
  {
    id: 24,
    label: 'Messaging',
    icon: MessageSquare,
    path: '/(admin)/messaging',
  },
  {
    id: 25,
    label: 'New Hire Reporting',
    icon: ClipboardList,
    path: '/(admin)/new-hire-reporting',
  },
  {
    id: 26,
    label: 'Onboarding',
    icon: ClipboardList,
    path: '/(admin)/onboarding',
  },
  {
    id: 27,
    label: 'Operations',
    icon: Layers,
    children: [
      { icon: User, label: "Do Not Hire", path: "/(admin)/operations/do-not-hire" },
      { icon: Wrench, label: "Inventory/Appliances", path: "/(admin)/operations/appliances" },
      { icon: Locate, label: "Locations", path: "/(admin)/operations/locations" },
      { icon: Bell, label: "Notifications", path: "/(admin)/operations/notifications" },
      { icon: Calendar, label: "Scheduling", path: "/(admin)/operations/scheduling" },
      { icon: Car, label: "Vehicles", path: "/(admin)/operations/vehicles" },
    ],
  },
  {
    id: 28,
    label: 'Payroll',
    icon: Wallet,
    path: '/(admin)/payroll',
  },
  {
    id: 29,
    label: 'Personal Notes',
    icon: Book,
    path: '/(admin)/personal-notes',
  },
  {
    id: 30,
    label: 'Reports',
    icon: BarChart,
    path: '/(admin)/reports',
  },
  {
    id: 31,
    label: 'Shopping Lists',
    icon: ShoppingCart,
    path: '/(admin)/shopping-lists',
  },
  {
    id: 32,
    label: 'SignaCore',
    icon: FileText,
    path: '/(admin)/signacore',
  },
  {
    id: 33,
    label: 'System Email Settings',
    icon: Mail,
    path: '/(admin)/system-email-settings',
    superAdminOnly: true,
  },
  {
    id: 34,
    label: 'Task History',
    icon: History,
    path: '/(admin)/task-history',
  },
  {
    id: 35,
    label: 'Task Management',
    icon: History,
    path: '/(admin)/task-management',
  },
  {
    id: 36,
    label: 'Time Tracking',
    icon: Clock,
    path: '/(admin)/time-tracking',
  },
  {
    id: 316,
    label: 'Theme Engine',
    icon: Lightbulb,
    path: '/(admin)/theme-engine',
  },
  {
    id: 37,
    label: 'Travel Calendar',
    icon: Calendar1,
    path: '/(admin)/travel-calendar',
  },
  {
    id: 39,
    label: 'User Management',
    icon: Users,
    path: '/(admin)/users',
  },
  {
    id: 40,
    label: 'Vendors',
    icon: Building2,
    path: '/(admin)/vendors',
  },
  {
    id: 41,
    label: 'Video Messages',
    icon: Video,
    path: '/(admin)/video-messages',
  },
  {
    id: 42,
    label: 'Settings',
    icon: Settings,
    path: '/(admin)/settings',
  },
 /* {
    id: 43,
    label: 'Webview',
    icon: Globe2,
    path: '/(admin)/webview',
  },*/
];

export default function AdminFixedSidebar({ isOpen, onClose }: any) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  
  const [expandedMenus, setExpandedMenus] = useState<Record<number, boolean>>({});

  const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (isOpen) {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: -SIDEBAR_WIDTH, duration: 180, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [isOpen]);

  // Route evaluation clearing layout group notation loops
  const isActiveRoute = (routePath?: string) => {
    if (!routePath) return false;
    const cleanRoute = routePath.replace(/\/\([^)]+\)/g, '');
    const cleanPathname = pathname.replace(/\/\([^)]+\)/g, '');

    if (cleanRoute === '/home' && (cleanPathname === '/home' || cleanPathname === '/')) {
      return true;
    }
    return cleanPathname === cleanRoute || cleanPathname.startsWith(cleanRoute + '/');
  };

  const toggleSubmenu = (id: number) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    setExpandedMenus(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const navigate = (path: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    router.push(path as any);
    onClose();
  };

  const handleLogout = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    if (logout) {
      await logout();
    }
    onClose();
  };

  const filteredMenu = MENU_ITEMS.filter(item => {
    if (item.superAdminOnly) {
      return user?.role === 'super-admin';
    }
    return true;
  }).sort((a, b) => {
    if (a.label === 'Dashboard') return -1;
    if (b.label === 'Dashboard') return 1;
    return a.label.localeCompare(b.label);
  });

  const sidebarUI = (
    <View 
      style={[
        styles.container, 
        { 
          paddingTop: Platform.OS === 'ios' ? insets.top + 10 : insets.top + 16,
          paddingBottom: insets.bottom + 16 
        }
      ]}
    >
      {/* HEADER SECTION */}
      <View style={styles.logoSection}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>TaskManager</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeTouchArea}>
            <ChevronLeft color="#f4f4f5" size={24} />
          </TouchableOpacity>
        </View>
        <Text style={styles.logoSubtitle}>Admin Dashboard</Text>
      </View>

      {/* USER CARD WITH AVATAR */}
      <View style={styles.userCard}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>
            {user?.fullName?.charAt(0)?.toUpperCase() ?? 'A'}
          </Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName} numberOfLines={1}>
            {user?.fullName ?? 'Administrator'}
          </Text>
          <Text style={styles.userRole} numberOfLines={1}>
            {user?.role === 'super-admin' ? 'Super Admin' : 'Admin'}
          </Text>
        </View>
        <View style={styles.statusIndicator}>
          <View style={styles.statusDot} />
        </View>
      </View>

      {/* SCROLLABLE ITEMS BOX */}
      <ScrollView style={styles.menuContainer} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPaddingBottom}>
        <Text style={styles.menuHeader}>Main Menu</Text>
        
        {filteredMenu.map((item) => {
          const hasChildren = item.children && item.children.length > 0;
          const isExpanded = !!expandedMenus[item.id];
          const isParentActive = !hasChildren 
            ? (item.path ? isActiveRoute(item.path) : false) 
            : item.children?.some(child => child.path && isActiveRoute(child.path));

          const rowActive = isParentActive || isExpanded;
          const parentIconColor = rowActive ? "#ffd27a" : "#a1a1aa";
          const chevronColor = rowActive ? "#ffd27a" : "#71717a";

          return (
            <View key={item.id} style={styles.submenuContainer}>
              <TouchableOpacity
                style={[styles.item, isParentActive && styles.menuItemActive]}
                onPress={() => {
                  if (hasChildren) {
                    toggleSubmenu(item.id);
                  } else if (item.path) {
                    navigate(item.path);
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={styles.itemInnerLeftGroup}>
                  <item.icon color={parentIconColor} size={20} />
                  
                  {item.label === 'SignaCore' ? (
                    <Text style={[styles.menuLabel, styles.boldWeightText, isParentActive && styles.menuLabelActive]}>
                      <Text style={styles.blueBrandingText}>Signa</Text>
                      <Text style={styles.orangeBrandingText}>Core</Text>
                    </Text>
                  ) : (
                    <Text style={[styles.menuLabel, rowActive && styles.menuLabelActive]}>
                      {item.label}
                    </Text>
                  )}
                </View>
                
                {hasChildren ? (
                  isExpanded ? (
                    <ChevronDown color={chevronColor} size={16} />
                  ) : (
                    <ChevronRight color={chevronColor} size={16} />
                  )
                ) : (
                  isParentActive && <ChevronRight color="#ffd27a" size={16} />
                )}
              </TouchableOpacity>

              {/* NESTED SUBMENU CHILDREN */}
              {hasChildren && isExpanded && (
                <View style={styles.submenuChildrenBlock}>
                  {item.children?.map((child, index) => {
                    const isChildActive = child.path ? isActiveRoute(child.path) : false;
                    const childIconColor = isChildActive ? "#ffd27a" : "#a1a1aa";

                    return (
                      <TouchableOpacity
                        key={`${item.id}-child-${index}`}
                        style={[
                          styles.item,
                          styles.childItemAdjustment,
                          isChildActive && styles.menuItemActive
                        ]}
                        onPress={() => child.path && navigate(child.path)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.itemInnerLeftGroup}>
                          {child.icon ? (
                            <child.icon color={childIconColor} size={16} />
                          ) : (
                            <View style={[styles.submenuDotIndicator, isChildActive && styles.activeSubmenuDotIndicator]} />
                          )}
                          <Text 
                            style={[
                              styles.menuLabel, 
                              styles.childLabelText, 
                              isChildActive && styles.menuLabelActive
                            ]}
                          >
                            {child.label}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* FIXED LOGOUT BUTTON SECTION */}
      <View style={styles.logoutSection}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut color="#f87171" size={20} />
          <Text style={styles.logoutLabel}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* BACKDROP */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
      </TouchableWithoutFeedback>

      {/* DRAWER LAYER */}
      <Animated.View
        style={[
          styles.drawer,
          { transform: [{ translateX: slideAnim }] },
        ]}
      >
        {sidebarUI}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
  },
  container: {
    flex: 1,
    backgroundColor: '#133767',
    paddingHorizontal: 14,
    borderRightWidth: 1,
    borderRightColor: '#27272a',
  },
  logoSection: {
    paddingHorizontal: 4,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
    marginBottom: 20,
  },
  logoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  logoText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#f4f4f5',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  logoSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#71717a',
    marginTop: 2,
  },
  closeTouchArea: {
    padding: 4,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    padding: 12,
    backgroundColor: '#133767',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 6,
    gap: 12,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ffffff',
    backgroundColor: '#133767',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f4f4f5',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f4f4f5',
    marginBottom: 2,
  },
  userRole: {
    fontSize: 11,
    fontWeight: '500',
    color: '#71717a',
  },
  statusIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  menuContainer: {
    flex: 1,
  },
  menuHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#71717a',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  scrollPaddingBottom: {
    paddingBottom: 20,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  itemInnerLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  menuItemActive: {
    backgroundColor: '#133767',
    borderColor: '#27272a',
  },
  menuLabel: {
    color: '#a1a1aa',
    fontSize: 13,
    fontWeight: '600',
  },
  menuLabelActive: {
    color: '#ffd27a',
    fontWeight: '700',
  },
  boldWeightText: {
    fontWeight: '900',
  },
  blueBrandingText: {
    color: '#38bdf8',
  },
  orangeBrandingText: {
    color: '#f97316',
  },
  submenuContainer: {
    flexDirection: 'column',
  },
  submenuChildrenBlock: {
    paddingLeft: 14,
    marginLeft: 10,
    borderLeftWidth: 1,
    borderLeftColor: '#27272a',
    marginTop: 2,
    marginBottom: 6,
    gap: 2,
  },
  childItemAdjustment: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 2,
  },
  childLabelText: {
    fontSize: 12,
    color: '#71717a',
    fontWeight: '500',
  },
  submenuDotIndicator: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#71717a',
    marginLeft: 4,
  },
  activeSubmenuDotIndicator: {
    backgroundColor: '#ffd27a',
  },
  logoutSection: {
    borderTopWidth: 1,
    borderTopColor: '#27272a',
    paddingTop: 14,
    marginTop: 10,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  logoutLabel: {
    color: '#f87171',
    fontSize: 13,
    fontWeight: '600',
  },
});