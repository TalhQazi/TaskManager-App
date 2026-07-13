import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { AccessibilityInfo } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/admin/apiClient";
import { useAuth } from "@/contexts/AuthContext"; // Your single, unified auth context
import { TaskCompletionEffect } from "@/components/TaskCompletionEffect";


interface RewardContextType {
  triggerReward: (x: number, y: number) => void;
}

interface ActiveReward {
  id: string; 
  x: number;
  y: number;
}

const RewardContext = createContext<RewardContextType | null>(null);

export const useRewards = () => {
  const context = useContext(RewardContext);
  if (!context) throw new Error("useRewards must be used within a RewardProvider");
  return context;
};

export const RewardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeRewards, setActiveRewards] = useState<ActiveReward[]>([]);
  const [reducedMotionEnabled, setReducedMotionEnabled] = useState(false);

  // Consume your single source of truth for authentication
  const { isAuthenticated } = useAuth();

  // 1. Fetch Global System Settings
  const systemSettingsQuery = useQuery({
    queryKey: ["system-settings-public"],
    enabled: !!isAuthenticated, // Only runs if unified auth confirms user is logged in
    queryFn: async () => {
      const res = await apiFetch<{ item: { taskRewardSystemEnabled: boolean } }>("/api/system-settings/public");
      return res.item;
    },
  });

  // 2. Fetch User Preferences
  const userPrefsQuery = useQuery({
    queryKey: ["settings"], 
    enabled: !!isAuthenticated,
    queryFn: async () => {
      const res = await apiFetch<{ item: { rewardSettings: any } }>("/api/settings");
      return res.item;
    },
  });

  // Native Device Accessibility Bridge (Replaces web window.matchMedia)
  useEffect(() => {
    let isMounted = true;

    const checkMotionPreference = async () => {
      try {
        const isReduceMotionEnabled = await AccessibilityInfo.isReduceMotionEnabled();
        if (isMounted) setReducedMotionEnabled(isReduceMotionEnabled);
      } catch (err) {
        console.log("[Rewards] Native accessibility check failed:", err);
      }
    };

    checkMotionPreference();

    // Listen for real-time OS settings changes
    const motionListener = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (isReduceMotionEnabled) => {
        if (isMounted) setReducedMotionEnabled(isReduceMotionEnabled);
      }
    );

    return () => {
      isMounted = false;
      motionListener.remove();
    };
  }, []);

  const triggerReward = useCallback((x: number, y: number) => {
    // Drop execution immediately if the reward system is explicitly disabled globally
    if (systemSettingsQuery.data?.taskRewardSystemEnabled === false) return;

    // Drop execution if the device OS enforces reduced motion
    if (reducedMotionEnabled) return;

    // Collision-free key generation for rapid mobile touch interactions
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    setActiveRewards((prev) => [...prev, { id: uniqueId, x, y }]);
  }, [systemSettingsQuery.data, reducedMotionEnabled]);

  const removeReward = (id: string) => {
    setActiveRewards((prev) => prev.filter((r) => r.id !== id));
  };

  const baseSettings = userPrefsQuery.data?.rewardSettings || {
    animationsEnabled: true,
    hapticsEnabled: true,
    soundEnabled: false,
  };

  // Merge backend user preferences with local native rules
  const rewardSettings = useMemo(() => ({
    ...baseSettings,
    animationsEnabled: reducedMotionEnabled ? false : baseSettings.animationsEnabled,
  }), [baseSettings, reducedMotionEnabled]);

  const contextValue = useMemo(() => ({ triggerReward }), [triggerReward]);

  return (
    <RewardContext.Provider value={contextValue}>
      {children}
      {activeRewards.map((reward) => (
        
        <TaskCompletionEffect
          key={reward.id}
          x={reward.x}
          y={reward.y}
          settings={rewardSettings}
          onComplete={() => removeReward(reward.id)}
        />
      ))}
    </RewardContext.Provider>
  );
};