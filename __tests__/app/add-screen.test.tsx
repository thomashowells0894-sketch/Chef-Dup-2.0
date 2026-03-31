import React from 'react';
import { StyleSheet, View } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import AddScreen from '../../app/(tabs)/add';
import { Spacing } from '../../constants/theme';

jest.setTimeout(20000);

const mockPush = jest.fn();
const mockUseLocalSearchParams = jest.fn();

const localEggResult = {
  id: 'eggs',
  name: 'Eggs',
  calories: 155,
  protein: 13,
  carbs: 1,
  fat: 11,
  serving: '2 eggs',
  servingSize: 2,
  servingUnit: 'serving',
  source: 'local',
  sourceLabel: 'FuelIQ',
  qualityTag: 'curated',
  qualityLabel: 'Curated',
  confidenceLevel: 'high',
  confidenceReason: 'Curated nutrition data',
  resultKind: 'canonical',
  reportable: true,
  emoji: '🥚',
};

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    navigate: mockPush,
    back: jest.fn(),
  }),
  useLocalSearchParams: () => mockUseLocalSearchParams(),
  useFocusEffect: (callback: () => void) => callback(),
}));

jest.mock('@react-navigation/bottom-tabs', () => ({
  useBottomTabBarHeight: () => 95,
}));

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    SafeAreaView: ({ children, ...props }: any) => <View {...props}>{children}</View>,
    useSafeAreaInsets: () => ({ top: 0, bottom: 20, left: 0, right: 0 }),
  };
});

jest.mock('expo-image', () => ({
  Image: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

jest.mock('expo-av', () => ({
  Audio: {
    requestPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
    setAudioModeAsync: jest.fn(() => Promise.resolve()),
    Recording: {
      createAsync: jest.fn(() => Promise.resolve({ recording: null })),
    },
  },
}));

jest.mock('expo-file-system', () => ({
  readAsStringAsync: jest.fn(() => Promise.resolve('')),
  deleteAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../components/ScreenErrorBoundary', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('../../components/FoodDetailModal', () => () => null);
jest.mock('../../components/RecipeBuilderModal', () => () => null);
jest.mock('../../components/QuickLogSheet', () => () => null);
jest.mock('../../components/QuickCalModal', () => () => null);
jest.mock('../../components/ExerciseDurationModal', () => () => null);
jest.mock('../../components/VoiceRecordingModal', () => () => null);
jest.mock('../../components/VoiceResultsSheet', () => () => null);
jest.mock('../../components/UndoToast', () => () => null);
jest.mock('../../components/MyFitnessPalImportCard', () => () => null);

jest.mock('../../services/ai', () => ({
  parseVoiceFood: jest.fn(() => Promise.resolve({ transcript: '', foods: [] })),
}));

jest.mock('../../services/openFoodFacts', () => ({
  productToFood: (product: any) => product,
}));

jest.mock('../../services/foodSearch', () => ({
  buildSearchResultIdentityKey: (item: any) => item.id || item.name,
  getRecentSearches: jest.fn(() => Promise.resolve([])),
  getTrendingTerms: jest.fn(() => Promise.resolve([])),
  normalizeBarcodeQuery: (value: string) => value,
  searchAllSources: jest.fn(() => Promise.resolve({
    products: [localEggResult],
    sources: {
      local: 1,
      restaurant: 0,
      openFoodFacts: 0,
      usda: 0,
      fatSecret: 0,
      nutritionix: 0,
    },
  })),
  groupSearchResultsForDisplay: (results: any[]) => (
    results.length > 0
      ? [{ key: 'best_matches', title: 'Best Matches', subtitle: 'Closest trusted results', items: results }]
      : []
  ),
}));

jest.mock('../../lib/localFoodSearch', () => ({
  searchLocalFoodDatabase: (query: string) => {
    const normalized = String(query || '').toLowerCase();
    if (normalized.includes('egg')) {
      return [localEggResult];
    }
    return [];
  },
}));

jest.mock('../../context/FoodContext', () => ({
  useFood: () => ({
    addFood: jest.fn(() => Promise.resolve()),
    addExercise: jest.fn(() => Promise.resolve()),
    dayData: {},
    removeFood: jest.fn(() => Promise.resolve()),
    recentLogs: [],
    refreshDate: jest.fn(),
    selectedDateKey: '2026-03-28',
    getDefaultMealType: () => 'breakfast',
    recipes: [],
    recentFoods: [],
    recentFoodsLoading: false,
    recentFoodsError: null,
    fetchRecentFoods: jest.fn(),
  }),
}));

jest.mock('../../context/ProfileContext', () => ({
  useProfile: () => ({ profile: { weight: 80 } }),
}));

jest.mock('../../context/FastingContext', () => ({
  useFasting: () => ({ recordMealLogged: jest.fn() }),
}));

jest.mock('../../hooks/useFrequentFoods', () => ({
  useFrequentFoods: () => ({
    getTopFoods: () => [],
    getRecentFoods: () => [],
  }),
}));

jest.mock('../../hooks/useFavoriteFoods', () => ({
  useFavoriteFoods: () => ({
    favorites: [],
  }),
}));

jest.mock('../../context/SubscriptionContext', () => ({
  useIsPremium: () => ({ isPremium: false, isLoading: false }),
}));

jest.mock('../../lib/recentMeals', () => ({
  useRecentMealSnapshots: () => ({ recentMeals: [] }),
}));

jest.mock('../../lib/tabSwitchTrace', () => ({
  scheduleTabScreenReady: jest.fn(),
}));

jest.mock('../../lib/startupTrace', () => ({
  recordFirstSearchFromStartup: jest.fn(),
}));

jest.mock('../../services/barcodeService', () => ({
  rememberBarcodeCorrection: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../lib/activationTracker', () => ({
  recordAddOpened: jest.fn(),
  recordBarcodeCorrected: jest.fn(),
  recordSearchAddSucceeded: jest.fn(() => Promise.resolve()),
  recordSearchCompleted: jest.fn(),
  recordQuickAddUsed: jest.fn(),
  recordSearchReformulated: jest.fn(() => Promise.resolve()),
  recordRepeatLogUsed: jest.fn(() => Promise.resolve()),
  recordSearchResultSelected: jest.fn(),
  recordSearchStarted: jest.fn(),
}));

jest.mock('../../lib/haptics', () => ({
  hapticLight: jest.fn(() => Promise.resolve()),
  hapticSuccess: jest.fn(() => Promise.resolve()),
}));

describe('AddScreen active food search layout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('prioritizes the results list and hides Fast Capture when a food query is present', async () => {
    mockUseLocalSearchParams.mockReturnValue({
      query: 'eggs',
      meal: 'breakfast',
    });

    const screen = render(<AddScreen />);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByTestId('food-search-results-list')).toBeTruthy();
      expect(screen.getByTestId('food-search-active-content')).toBeTruthy();
    });

    expect(screen.queryByText('Fast Capture')).toBeNull();
    expect(screen.queryByTestId('food-search-idle-content')).toBeNull();
    expect(screen.getByText('Eggs')).toBeTruthy();
  });

  it('enters active search layout even before the query is long enough to run the full search', async () => {
    mockUseLocalSearchParams.mockReturnValue({
      query: 'e',
      meal: 'breakfast',
    });

    const screen = render(<AddScreen />);

    await act(async () => {
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByTestId('food-search-empty-state')).toBeTruthy();
      expect(screen.getByTestId('food-search-active-content')).toBeTruthy();
    });

    expect(screen.queryByText('Fast Capture')).toBeNull();
    expect(screen.getByText('Keep typing to search foods')).toBeTruthy();
  });

  it('keeps the active-search list mounted and configured for keyboard-open scrolling', async () => {
    mockUseLocalSearchParams.mockReturnValue({
      query: 'eggs',
      meal: 'breakfast',
    });

    const screen = render(<AddScreen />);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    const input = screen.getByTestId('food-search-input');
    fireEvent(input, 'focus');

    await waitFor(() => {
      expect(screen.getByTestId('food-search-results-list')).toBeTruthy();
    });

    const resultsList = screen.getByTestId('food-search-results-list');
    expect(resultsList.props.keyboardShouldPersistTaps).toBe('always');
    expect(resultsList.props.keyboardDismissMode).toBe('interactive');
    expect(screen.getByText('Eggs')).toBeTruthy();
  });

  it('adds bottom inset padding so the floating tab bar does not cover the last results', async () => {
    mockUseLocalSearchParams.mockReturnValue({
      query: 'eggs',
      meal: 'breakfast',
    });

    const screen = render(<AddScreen />);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByTestId('food-search-results-list')).toBeTruthy();
    });

    const resultsList = screen.getByTestId('food-search-results-list');
    const flattenedStyle = StyleSheet.flatten(resultsList.props.contentContainerStyle);

    expect(flattenedStyle.paddingBottom).toBe(Math.max(95 + Spacing.lg, 20 + 104));
  });

  it('preserves active search layout and query text when switching meal tabs mid-search', async () => {
    mockUseLocalSearchParams.mockReturnValue({
      query: 'eggs',
      meal: 'breakfast',
    });

    const screen = render(<AddScreen />);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    fireEvent.press(screen.getByText('Lunch'));

    await waitFor(() => {
      expect(screen.getByTestId('food-search-active-content')).toBeTruthy();
      expect(screen.getByTestId('food-search-results-list')).toBeTruthy();
    });

    expect(screen.getByDisplayValue('eggs')).toBeTruthy();
    expect(screen.queryByText('Fast Capture')).toBeNull();
  });

  it('resets the active-search list to the top when the query is refined', async () => {
    mockUseLocalSearchParams.mockReturnValue({
      query: 'eggs',
      meal: 'breakfast',
    });

    const screen = render(<AddScreen />);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByTestId('food-search-results-list')).toBeTruthy();
    });

    expect(screen.getByTestId('food-search-active-content').props.nativeID).toBe('eggs::breakfast::0');

    fireEvent.changeText(screen.getByTestId('food-search-input'), 'M&S eggs');

    await waitFor(() => {
      expect(screen.getByDisplayValue('M&S eggs')).toBeTruthy();
      expect(screen.getByTestId('food-search-active-content').props.nativeID).toBe('M&S eggs::breakfast::0');
    });
  });
});
