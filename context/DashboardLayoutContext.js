import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@vibefit_dashboard_layout';

// Default dashboard cards configuration
const DEFAULT_LAYOUT = {
  streak: { visible: true, order: 0 },
  macros: { visible: true, order: 1 },
  water: { visible: true, order: 2 },
  fasting: { visible: true, order: 3 },
  mood: { visible: true, order: 4 },
  quickActions: { visible: true, order: 5 },
};

const CARD_INFO = {
  streak: { label: 'Streak Badge', description: 'Shows your current streak' },
  macros: { label: 'Macros Card', description: 'Calories & macro tracking' },
  water: { label: 'Hydration HUD', description: 'Water intake tracker' },
  fasting: { label: 'Fasting Timer', description: 'Intermittent fasting' },
  mood: { label: 'Mood Tracker', description: 'Bio-feedback nexus' },
  quickActions: { label: 'Quick Actions', description: 'Add food, barcode, recipes' },
};

const DashboardLayoutContext = createContext(null);

export function DashboardLayoutProvider({ children }) {
  const [layout, setLayout] = useState(DEFAULT_LAYOUT);
  const [isLoading, setIsLoading] = useState(true);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  // Load saved layout
  useEffect(() => {
    loadLayout();
  }, []);

  const loadLayout = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults in case new cards were added
        setLayout({ ...DEFAULT_LAYOUT, ...parsed });
      }
    } catch (e) {
      if (__DEV__) console.error('Failed to load dashboard layout:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const saveLayout = async (newLayout) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newLayout));
      setLayout(newLayout);
    } catch (e) {
      if (__DEV__) console.error('Failed to save dashboard layout:', e);
    }
  };

  const toggleCardVisibility = useCallback((cardKey) => {
    const current = layoutRef.current;
    const newLayout = {
      ...current,
      [cardKey]: {
        ...current[cardKey],
        visible: !current[cardKey].visible,
      },
    };
    saveLayout(newLayout);
  }, []);

  const reorderCards = useCallback((cardKey, newOrder) => {
    const newLayout = { ...layoutRef.current };
    const oldOrder = newLayout[cardKey].order;

    // Adjust other cards
    Object.keys(newLayout).forEach((key) => {
      if (key === cardKey) {
        newLayout[key].order = newOrder;
      } else if (newOrder < oldOrder) {
        // Moving up - shift others down
        if (newLayout[key].order >= newOrder && newLayout[key].order < oldOrder) {
          newLayout[key].order += 1;
        }
      } else {
        // Moving down - shift others up
        if (newLayout[key].order > oldOrder && newLayout[key].order <= newOrder) {
          newLayout[key].order -= 1;
        }
      }
    });

    saveLayout(newLayout);
  }, []);

  const resetLayout = useCallback(() => {
    saveLayout(DEFAULT_LAYOUT);
  }, []);

  const isCardVisible = useCallback((cardKey) => {
    return layout[cardKey]?.visible ?? true;
  }, [layout]);

  const getVisibleCards = useCallback(() => {
    return Object.entries(layout)
      .filter(([_, config]) => config.visible)
      .sort((a, b) => a[1].order - b[1].order)
      .map(([key]) => key);
  }, [layout]);

  const getAllCards = useCallback(() => {
    return Object.entries(layout)
      .sort((a, b) => a[1].order - b[1].order)
      .map(([key, config]) => ({
        key,
        ...config,
        ...CARD_INFO[key],
      }));
  }, [layout]);

  const value = useMemo(() => ({
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

export function useDashboardLayout() {
  const context = useContext(DashboardLayoutContext);
  if (!context) {
    throw new Error('useDashboardLayout must be used within DashboardLayoutProvider');
  }
  return context;
}
