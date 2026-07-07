import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

export type EntityLevel = "holding" | "company" | "location" | "department" | "unit";
export type UserRole = "Executive" | "Auditor" | "Accountant" | "PropertyManager";
export type ChartTimeframe = "Daily" | "Monthly" | "Quarterly" | "Yearly";

export interface EntityNode {
  id: string;
  name: string;
  level: EntityLevel;
  parentId?: string;
  children?: EntityNode[];
}

export interface PulseAlert {
  id: string;
  timestamp: Date;
  type: "duplicate_payment" | "missing_receipt" | "vendor_anomaly" | "cash_decline" | "credit_change" | "new_lien" | "system";
  severity: "info" | "warning" | "critical";
  message: string;
  entityName: string;
  resolved: boolean;
  value?: string;
}

export interface FinancialStats {
  revenueToday: number;
  revenueMtd: number;
  revenueYtd: number;
  expensesMtd: number;
  netProfit: number;
  cashPosition: number;
  accountsReceivable: number;
  accountsPayable: number;
  integrityScore: number;
  creditScore: number;
}

interface AtlasBooksContextType {
  activeEntity: EntityNode;
  entities: EntityNode;
  activeRole: UserRole;
  timeframe: ChartTimeframe;
  liveEventStream: PulseAlert[];
  stats: FinancialStats;
  entityHierarchy: EntityNode[];
  selectEntity: (id: string) => void;
  updateRole: (role: UserRole) => void;
  updateTimeframe: (timeframe: ChartTimeframe) => void;
  triggerMockPulseAlert: (type?: string) => void;
  resolveAlert: (id: string) => void;
  bills: any[]; // Add this
  setBills: React.Dispatch<React.SetStateAction<any[]>>; // Add this
}

// --- Mock Data ---
export const mockEntityHierarchy: EntityNode = {
  id: "holding-01",
  name: "Atlas Global Holdings",
  level: "holding",
  children: [
    {
      id: "company-01",
      name: "Atlas Enterprises Tech",
      level: "company",
      parentId: "holding-01",
      children: [
        {
          id: "loc-ny",
          name: "New York HQ",
          level: "location",
          parentId: "company-01",
          children: [
            {
              id: "dept-eng",
              name: "Software Engineering",
              level: "department",
              parentId: "loc-ny",
              children: [
                { id: "unit-saas", name: "SaaS Dev Team", level: "unit", parentId: "dept-eng" },
                { id: "unit-infra", name: "Cloud Infrastructure", level: "unit", parentId: "dept-eng" }
              ]
            }
          ]
        }
      ]
    }
  ]
};

// --- Utilities ---
const findNodeById = (node: EntityNode, id: string): EntityNode | null => {
  if (node.id === id) return node;
  if (node.children) {
    for (const child of node.children) {
      const found = findNodeById(child, id);
      if (found) return found;
    }
  }
  return null;
};

const buildPathToNode = (node: EntityNode, targetId: string, currentPath: EntityNode[] = []): EntityNode[] | null => {
  const path = [...currentPath, node];
  if (node.id === targetId) return path;
  if (node.children) {
    for (const child of node.children) {
      const result = buildPathToNode(child, targetId, path);
      if (result) return result;
    }
  }
  return null;
};

const baseStatsMap: Record<string, FinancialStats> = {
  "holding-01": {
    revenueToday: 184500,
    revenueMtd: 5420900,
    revenueYtd: 65120300,
    expensesMtd: 3105400,
    netProfit: 2315500,
    cashPosition: 24500000,
    accountsReceivable: 4120000,
    accountsPayable: 1850000,
    integrityScore: 98,
    creditScore: 815
  },
  // Add other map entries here...
};

const initialAlerts: PulseAlert[] = [
  {
    id: "alert-1",
    timestamp: new Date(),
    type: "duplicate_payment",
    severity: "critical",
    message: "Potential duplicate checkout detected",
    entityName: "Atlas Enterprises Tech (NY)",
    resolved: false,
    value: "$4,250.00"
  }
];

// --- Provider ---
const AtlasBooksContext = createContext<AtlasBooksContextType | undefined>(undefined);

export const AtlasBooksProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bills, setBills] = useState<any[]>([]); // Add this state
  const [activeEntity, setActiveEntity] = useState<EntityNode>(mockEntityHierarchy);
  const [activeRole, setActiveRole] = useState<UserRole>("Executive");
  const [timeframe, setTimeframe] = useState<ChartTimeframe>("Monthly");
  const [liveEventStream, setLiveEventStream] = useState<PulseAlert[]>(initialAlerts);
  const [stats, setStats] = useState<FinancialStats>(baseStatsMap["holding-01"]);
  const [entityHierarchy, setEntityHierarchy] = useState<EntityNode[]>([mockEntityHierarchy]);

  const selectEntity = useCallback((id: string) => {
    const node = findNodeById(mockEntityHierarchy, id);
    if (node) {
      setActiveEntity(node);
      const path = buildPathToNode(mockEntityHierarchy, id);
      if (path) setEntityHierarchy(path);
      
      const baseStats = baseStatsMap[id] || baseStatsMap["holding-01"];
      setStats(baseStats);
    }
  }, []);

  const updateRole = useCallback((role: UserRole) => setActiveRole(role), []);
  const updateTimeframe = useCallback((tf: ChartTimeframe) => setTimeframe(tf), []);
  const resolveAlert = useCallback((id: string) => {
    setLiveEventStream((prev) => prev.map((alert) => (alert.id === id ? { ...alert, resolved: true } : alert)));
  }, []);

  const triggerMockPulseAlert = useCallback((specificType?: string) => {
    // Logic for generating alerts...
  }, [activeEntity]);

  return (
    <AtlasBooksContext.Provider
      value={{
        activeEntity,
        entities: mockEntityHierarchy,
        activeRole,
        timeframe,
        liveEventStream,
        stats,
        entityHierarchy,
        selectEntity,
        updateRole,
        updateTimeframe,
        triggerMockPulseAlert,
        resolveAlert,
        bills,     // Add this
        setBills,  // Add this
      }}
    >
      {children}
    </AtlasBooksContext.Provider>
  );
};

export const useAtlasBooks = () => {
  const context = useContext(AtlasBooksContext);
  if (!context) {
    throw new Error("useAtlasBooks must be used within an AtlasBooksProvider");
  }
  return context;
};