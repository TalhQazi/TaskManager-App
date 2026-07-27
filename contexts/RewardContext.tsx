import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { View, StyleSheet, AccessibilityInfo } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { TaskCompletionEffect } from "@/components/reward/TaskCompletionEffect";

interface RewardContextType {
  triggerReward: (x: number, y: number) => void;
}

const RewardContext = createContext<RewardContextType | null>(null);

export const useRewards = () => {
  const context = useContext(RewardContext);
  if (!context) throw new Error("useRewards must be used within a RewardProvider");
  return context;
};

export const RewardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeRewards, setActiveRewards] = useState<{ id: number; x: number; y: number }[]>([]);
  const [isReduceMotionEnabled, setIsReduceMotionEnabled] = useState(false);
  const { user } = useAuth();
  const isAuthenticated = !!user;


  useEffect(() => {
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (enabled) => setIsReduceMotionEnabled(enabled)
    );
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      setIsReduceMotionEnabled(enabled);
    });
    return () => subscription.remove();
  }, []);

  // 1. Fetch Global System Settings
  const systemSettingsQuery = useQuery({
    queryKey: ["system-settings-public"],
    enabled: isAuthenticated,
    queryFn: async () => {
      const res = await apiRequest<{ item: { taskRewardSystemEnabled: boolean } }>("/system-settings/public");
      return res.data?.item;
    },
  });

  // 2. Fetch User Preferences
  const userPrefsQuery = useQuery({
    queryKey: ["settings"],
    enabled: isAuthenticated,
    queryFn: async () => {
      const res = await apiRequest<{ item: { rewardSettings: any } }>("/settings");
      return res.data?.item;
    },
  });

  const triggerReward = useCallback((x: number, y: number) => {
    // Check Global Disable State
    if (systemSettingsQuery.data?.taskRewardSystemEnabled === false) return;

    // Check OS Level accessibility settings
    if (isReduceMotionEnabled) return;

    setActiveRewards((prev) => [...prev, { id: Date.now(), x, y }]);
  }, [systemSettingsQuery.data, isReduceMotionEnabled]);

  const removeReward = (id: number) => {
    setActiveRewards((prev) => prev.filter((r) => r.id !== id));
  };

  const rewardSettings = userPrefsQuery.data?.rewardSettings || {
    animationsEnabled: true,
    hapticsEnabled: true,
    soundEnabled: false,
  };

  return (
    <RewardContext.Provider value={{ triggerReward }}>
      {children}
      {/* Absolute context overlay rendering rewards on top of coordinates */}
      {activeRewards.length > 0 && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {activeRewards.map((reward) => (
            <TaskCompletionEffect
              key={reward.id}
              x={reward.x}
              y={reward.y}
              settings={rewardSettings}
              onComplete={() => removeReward(reward.id)}
            />
          ))}
        </View>
      )}
    </RewardContext.Provider>
  );
};