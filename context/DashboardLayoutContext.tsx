import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY: string = '@vibefit_dashboard_layout';

// Default dashboard cards configuration
interface CardConfig {
  visible: boolean;
  order: number;
}

interface CardInfo {
  label: string;
  description: string;
}

type LayoutMap = Record<string, CardConfig>;

export interface DashboardCard extends CardConfig, CardInfo {
  key: string;
}

const DEFAULT_LAYOUT: LayoutMap = {
  streak: { visible: true, order: 0 },
  macros: { visible: true, order: 1 },
  water: { visible: true, order: 2 },
  fasting: { visible: true, order: 3 },
  mood: { visible: true, order: 4 },
  quickActions: { visible: true, order: 5 },
};

const CARD_INFO: Record<string, CardInfo> = {
  streak: { label: 'Streak Badge', description: 'Shows your current streak' },
  macros: { label: 'Macros Card', description: 'Calories & macro tracking' },
  water: { label: 'Hydration HUD', description: 'Water intake tracker' },
  fasting: { label: 'Fasting Timer', description: 'Intermittent fasting' },
  mood: { label: 'Mood Tracker', description: 'Bio-feedback nexus' },
  quickActions: { label: 'Quick Actions', description: 'Add food, barcode, recipes' },
};

interface DashboardLayoutContextValue {
  layout: LayoutMap;
  isLoading: boolean;
  toggleCardVisibility: (cardKey: string) => void;
  reorderCards: (cardKey: string, newOrder: number) => void;
  resetLayout: () => void;
  isCardVisible: (cardKey: string) => boolean;
  getVisibleCards: () => string[];
  getAllCards: () => DashboardCard[];
}

const DashboardLayoutContext = createContext<DashboardLayoutContextValue | null>(null);

interface DashboardLayoutProviderProps {
  children: React.ReactNode;
}

export function DashboardLayoutProvider({ children }: DashboardLayoutProviderProps): React.ReactElement {
  const [layout, setLayout] = useState<LayoutMap>(DEFAULT_LAYOUT);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const layoutRef = useRef<LayoutMap>(layout);
  layoutRef.current = layout;

  // Load saved layout
  useEffect(() => {
    loadLayout();
  }, []);

  const loadLayout = async (): Promise<void> => {
    try {
      const stored: string | null = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: LayoutMap = JSON.parse(stored);
        // Merge with defaults in case new cards were added
        setLayout({ ...DEFAULT_LAYOUT, ...parsed });
      }
    } catch (e) {
      if (__DEV__) console.error('Failed to load dashboard layout:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const saveLayout = async (newLayout: LayoutMap): Promise<void> => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newLayout));
      setLayout(newLayout);
    } catch (e) {
      if (__DEV__) console.error('Failed to save dashboard layout:', e);
    }
  };

  const toggleCardVisibility = useCallback((cardKey: string): void => {
    const current: LayoutMap = layoutRef.current;
    const existing = current[cardKey];
    if (!existing) return;
    const newLayout: LayoutMap = {
      ...current,
      [cardKey]: {
        ...existing,
        visible: !existing.visible,
      },
    };
    saveLayout(newLayout);
  }, []);

  const reorderCards = useCallback((cardKey: string, newOrder: number): void => {
    const newLayout: LayoutMap = { ...layoutRef.current };
    const card = newLayout[cardKey];
    if (!card) return;
    const oldOrder: number = card.order;

    // Adjust other cards
    Object.keys(newLayout).forEach((key: string) => {
      const entry = newLayout[key];
      if (!entry) return;
      if (key === cardKey) {
        entry.order = newOrder;
      } else if (newOrder < oldOrder) {
        // Moving up - shift others down
        if (entry.order >= newOrder && entry.order < oldOrder) {
          entry.order += 1;
        }
      } else {
        // Moving down - shift others up
        if (entry.order > oldOrder && entry.order <= newOrder) {
          entry.order -= 1;
        }
      }
    });

    saveLayout(newLayout);
  }, []);

  const resetLayout = useCallback((): void => {
    saveLayout(DEFAULT_LAYOUT);
  }, []);

  const isCardVisible = useCallback((cardKey: string): boolean => {
    return layout[cardKey]?.visible ?? true;
  }, [layout]);

  const getVisibleCards = useCallback((): string[] => {
    return Object.entries(layout)
      .filter(([_, config]: [string, CardConfig]) => config.visible)
      .sort((a: [string, CardConfig], b: [string, CardConfig]) => a[1].order - b[1].order)
      .map(([key]: [string, CardConfig]) => key);
  }, [layout]);

  const getAllCards = useCallback((): DashboardCard[] => {
    return Object.entries(layout)
      .sort((a: [string, CardConfig], b: [string, CardConfig]) => a[1].order - b[1].order)
      .map(([key, config]: [string, CardConfig]) => ({
        key,
        ...config,
        label: CARD_INFO[key]?.label ?? key,
        description: CARD_INFO[key]?.description ?? '',
      }));
  }, [layout]);

  const value: DashboardLayoutContextValue = useMemo(() => ({
    layout,
    isLoading,
    toggleCardVisibility,
    reorderCards,
    resetLayout,
    isCardVisible,
    getVisibleCards,
    getAllCards,
  }), [layout, isLoading, toggleCardVisibility, reorderCards, resetLayout, isCardVisible, getVisibleCards, getAllCards]);

  return (
    <DashboardLayoutContext.Provider value={value}>
      {children}
    </DashboardLayoutContext.Provider>
  );
}

export function useDashboardLayout(): DashboardLayoutContextValue {
  const context = useContext(DashboardLayoutContext);
  if (!context) {
    throw new Error('useDashboardLayout must be used within DashboardLayoutProvider');
  }
  return context;
}
