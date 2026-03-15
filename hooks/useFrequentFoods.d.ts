export interface FrequentFoodItem {
  id: string;
  name: string;
  emoji?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  serving?: string;
  servingUnit?: string;
  count?: number;
  lastUsed?: string;
  pinned?: boolean;
}

export interface UseFrequentFoodsResult {
  frequentFoods: FrequentFoodItem[];
  foods: FrequentFoodItem[];
  isLoading: boolean;
  recordFood: (food: Partial<FrequentFoodItem> & { name: string }) => void;
  trackFood: (food: Partial<FrequentFoodItem> & { name: string }) => void;
  getTopFoods: (limit?: number) => FrequentFoodItem[];
  getRecentFoods: (limit?: number) => FrequentFoodItem[];
  removeFood: (id: string) => void;
  clearAll: () => void;
  togglePin: (foodName: string) => void;
  pinnedFoods: FrequentFoodItem[];
}

export function useFrequentFoods(): UseFrequentFoodsResult;

export default useFrequentFoods;
