import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from "react-native";
import { DollarSign, Layers, PlusCircle, PieChart } from "lucide-react-native";

import { MobileCostManager } from "@/components/cost-manager/MobileCostManager";
import CreateExpenseSheet from "../expense/CreateExpenseSheet";
import ExpenseSheetList from "../expense/ExpenseSheetList";

interface ExpenseSheetProps {
  projectId: string;
  projectName?: string;
  onClose?: () => void;
}

export default function ExpenseSheet({ projectId, projectName = "Project", onClose }: ExpenseSheetProps) {
  const { width } = useWindowDimensions();
  const isSmall = width < 375;

  const [activeTab, setActiveTab] = useState<"cost-sheet" | "list" | "create">("cost-sheet");

  return (
    <View style={styles.container}>
      {/* Tab Controls Navigation */}
     

      {/* Tab Panels */}
      <View style={styles.contentView}>
        {activeTab === "cost-sheet" && (
          <MobileCostManager projectId={projectId} projectName={projectName} />
        )}

        {activeTab === "list" && <ExpenseSheetList projectId={projectId} />}

        {activeTab === "create" && (
          <CreateExpenseSheet
            projectId={projectId}
            onClose={() => {
              if (onClose) onClose();
              else setActiveTab("list");
            }}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0d1117",
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#161b22",
    borderBottomWidth: 1,
    borderBottomColor: "#30363d",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: "#21262d",
    borderWidth: 1,
    borderColor: "#30363d",
  },
  tabBtnActive: {
    backgroundColor: "rgba(31, 111, 235, 0.15)",
    borderColor: "#1f6feb",
  },
  tabBtnText: {
    color: "#8b949e",
    fontSize: 11,
    fontWeight: "600",
  },
  tabBtnTextActive: {
    color: "#58a6ff",
    fontWeight: "bold",
  },
  contentView: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
});