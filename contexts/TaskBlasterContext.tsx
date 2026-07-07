import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { AccessibilityInfo } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type TaskBlasterPriority = "low" | "medium" | "high" | "top" | "red";

export interface TaskBlasterTask {
  id: string;
  title: string;
  priority: TaskBlasterPriority;
  status: string;
}

export interface TaskBlasterSettings {
  enabled: boolean;
  soundEnabled: boolean;
  animationEnabled: boolean;
  autoMode: boolean;
  priorityOnly: boolean;
}

export interface TaskBlasterState {
  isVisible: boolean;
  task: TaskBlasterTask | null;
  settings: TaskBlasterSettings;
  lastTriggeredAt: number | null;
  completedTasksCount: number;
  streakCount: number;
}

interface TaskBlasterContextType {
  state: TaskBlasterState;
  settings: TaskBlasterSettings;
  updateSettings: (settings: Partial<TaskBlasterSettings>) => void;
  triggerBlaster: (task: TaskBlasterTask) => boolean;
  dismissBlaster: () => void;
  popBlaster: () => void;
  isEligible: (task: TaskBlasterTask) => boolean;
  incrementCompletedCount: () => void;
  isHydrated: boolean; // Tracks async engine preparation status
}

const defaultSettings: TaskBlasterSettings = {
  enabled: true,
  soundEnabled: true,
  animationEnabled: true,
  autoMode: false,
  priorityOnly: true,
};

const STORAGE_KEY = "task_blaster_settings";
const COMPLETED_COUNT_KEY = "task_blaster_completed_count";
const LAST_TRIGGERED_KEY = "task_blaster_last_triggered";

const TaskBlasterContext = createContext<TaskBlasterContextType | null>(null);

export function useTaskBlasterContext() {
  const context = useContext(TaskBlasterContext);
  if (!context) {
    throw new Error("useTaskBlasterContext must be used within a TaskBlasterProvider");
  }
  return context;
}

interface TaskBlasterProviderProps {
  children: ReactNode;
}

export function TaskBlasterProvider({ children }: TaskBlasterProviderProps) {
  const [settings, setSettings] = useState<TaskBlasterSettings>(defaultSettings);
  const [isVisible, setIsVisible] = useState(false);
  const [currentTask, setCurrentTask] = useState<TaskBlasterTask | null>(null);
  const [completedCount, setCompletedCount] = useState(0);
  const [lastTriggeredAt, setLastTriggeredAt] = useState<number | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [reducedMotionEnabled, setReducedMotionEnabled] = useState(false);

  // Hydrate states asynchronously upon mobile platform execution 
  useEffect(() => {
    const hydrateStorageData = async () => {
      try {
        const [savedSettings, savedCount, savedTriggered] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          AsyncStorage.getItem(COMPLETED_COUNT_KEY),
          AsyncStorage.getItem(LAST_TRIGGERED_KEY),
        ]);

        if (savedSettings) {
          setSettings({ ...defaultSettings, ...JSON.parse(savedSettings) });
        }
        if (savedCount) {
          setCompletedCount(parseInt(savedCount, 10));
        }
        if (savedTriggered) {
          setLastTriggeredAt(parseInt(savedTriggered, 10));
        }

        // Native System Accessibility Check for reduced motion setup
        const reducedMotion = await AccessibilityInfo.isReduceMotionEnabled();
        setReducedMotionEnabled(reducedMotion);
      } catch (err) {
        console.error("Failed to load native storage variables:", err);
      } finally {
        setIsHydrated(true);
      }
    };

    hydrateStorageData();

    // Listen to changing device runtime accessibility preferences dynamically
    const motionListener = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (isReduceMotionEnabled) => setReducedMotionEnabled(isReduceMotionEnabled)
    );

    return () => {
      motionListener.remove();
    };
  }, []);

  const updateSettings = useCallback((newSettings: Partial<TaskBlasterSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(err =>
        console.error("Failed writing settings payload", err)
      );
      return updated;
    });
  }, []);

  const isEligible = useCallback((task: TaskBlasterTask): boolean => {
    if (!settings.enabled) return false;

    const isTopPriority = task.priority === "top" || task.priority === "high";
    const isRedPriority = task.priority === "red";

    if (settings.priorityOnly && !(isTopPriority || isRedPriority)) {
      return false;
    }

    const newCount = completedCount + 1;
    const isStreakMilestone = newCount === 3 || newCount === 5 || newCount === 10;

    if (!(isTopPriority || isRedPriority || isStreakMilestone)) {
      return false;
    }

    // Explicit 20-second threshold check loop rule
    if (lastTriggeredAt) {
      const timeSinceLastTrigger = Date.now() - lastTriggeredAt;
      if (timeSinceLastTrigger < 20000) {
        return false;
      }
    }

    return true;
  }, [settings.enabled, settings.priorityOnly, completedCount, lastTriggeredAt]);

  const triggerBlaster = useCallback((task: TaskBlasterTask): boolean => {
    // Blocks interaction if native hardware motion configuration constraints are active
    if (reducedMotionEnabled) {
      return false;
    }

    if (!isEligible(task)) {
      return false;
    }

    const now = Date.now();
    setCurrentTask(task);
    setIsVisible(true);
    setLastTriggeredAt(now);
    
    AsyncStorage.setItem(LAST_TRIGGERED_KEY, now.toString()).catch(err =>
      console.error("Failed persisting trigger timestamp payload", err)
    );
    
    return true;
  }, [isEligible, reducedMotionEnabled]);

  const dismissBlaster = useCallback(() => {
    setIsVisible(false);
    setCurrentTask(null);
  }, []);

  const popBlaster = useCallback(() => {
    setIsVisible(false);
    setCurrentTask(null);
  }, []);

  const incrementCompletedCount = useCallback(() => {
    setCompletedCount((prev) => {
      const updatedCount = prev + 1;
      AsyncStorage.setItem(COMPLETED_COUNT_KEY, updatedCount.toString()).catch(err =>
        console.error("Failed updating execution metrics counters", err)
      );
      return updatedCount;
    });
  }, []);

  const state: TaskBlasterState = {
    isVisible,
    task: currentTask,
    settings,
    lastTriggeredAt,
    completedTasksCount: completedCount,
    streakCount: completedCount,
  };

  const value: TaskBlasterContextType = {
    state,
    settings,
    updateSettings,
    triggerBlaster,
    dismissBlaster,
    popBlaster,
    isEligible,
    incrementCompletedCount,
    isHydrated,
  };

  return (
    <TaskBlasterContext.Provider value={value}>
      {children}
    </TaskBlasterContext.Provider>
  );
}