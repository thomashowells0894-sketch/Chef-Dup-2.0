import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@fueliq_allergens';

const COMMON_ALLERGENS = [
  { name: 'Dairy', emoji: '\uD83E\uDD5B', keywords: ['dairy', 'milk', 'cheese', 'butter', 'cream', 'yogurt', 'whey', 'casein'] },
  { name: 'Gluten', emoji: '\uD83C\uDF3E', keywords: ['gluten', 'wheat', 'barley', 'rye', 'bread', 'pasta', 'flour'] },
  { name: 'Nuts', emoji: '\uD83E\uDD5C', keywords: ['nuts', 'almond', 'cashew', 'walnut', 'pecan', 'pistachio', 'macadamia'] },
  { name: 'Peanuts', emoji: '\uD83E\uDD5C', keywords: ['peanut', 'peanuts', 'peanut butter'] },
  { name: 'Shellfish', emoji: '\uD83E\uDD90', keywords: ['shellfish', 'shrimp', 'crab', 'lobster', 'oyster', 'clam', 'mussel', 'scallop'] },
  { name: 'Fish', emoji: '\uD83D\uDC1F', keywords: ['fish', 'salmon', 'tuna', 'cod', 'tilapia', 'anchovy', 'sardine'] },
  { name: 'Eggs', emoji: '\uD83E\uDD5A', keywords: ['egg', 'eggs', 'mayonnaise', 'meringue'] },
  { name: 'Soy', emoji: '\uD83E\uDED8', keywords: ['soy', 'soybean', 'tofu', 'tempeh', 'edamame', 'miso', 'soy sauce'] },
  { name: 'Sesame', emoji: '\uD83E\uDED8', keywords: ['sesame', 'tahini', 'sesame oil', 'sesame seeds'] },
  { name: 'Tree Nuts', emoji: '\uD83C\uDF30', keywords: ['tree nut', 'almond', 'cashew', 'walnut', 'pecan', 'hazelnut', 'brazil nut'] },
  { name: 'Wheat', emoji: '\uD83C\uDF3E', keywords: ['wheat', 'flour', 'bread', 'pasta', 'couscous', 'semolina'] },
  { name: 'Corn', emoji: '\uD83C\uDF3D', keywords: ['corn', 'maize', 'cornstarch', 'corn syrup', 'popcorn', 'polenta'] },
  { name: 'Sulfites', emoji: '\uD83C\uDF77', keywords: ['sulfite', 'sulfites', 'wine', 'dried fruit', 'vinegar'] },
  { name: 'Lactose', emoji: '\uD83E\uDD5B', keywords: ['lactose', 'milk', 'dairy', 'cream', 'ice cream', 'cheese'] },
];

function generateId() {
  return `alg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

export { COMMON_ALLERGENS };

export default function useAllergens() {
  const [allergens, setAllergens] = useState([]);
  const [reactions, setReactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load from storage on mount
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setAllergens(parsed.allergens || []);
          setReactions(parsed.reactions || []);
        }
      } catch {
        // Storage read failed
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Persist data
  const persist = async (updatedAllergens, updatedReactions) => {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          allergens: updatedAllergens,
          reactions: updatedReactions,
        })
      );
    } catch {
      // Storage write failed
    }
  };

  const addAllergen = useCallback(
    async (data) => {
      const newAllergen = {
        id: generateId(),
        name: data.name || 'Unknown',
        emoji: data.emoji || '\u26A0\uFE0F',
        severity: data.severity || 'mild',
        notes: data.notes || '',
        createdAt: new Date().toISOString(),
      };
      const updated = [...allergens, newAllergen];
      setAllergens(updated);
      await persist(updated, reactions);
      return newAllergen;
    },
    [allergens, reactions]
  );

  const removeAllergen = useCallback(
    async (id) => {
      const updated = allergens.filter((a) => a.id !== id);
      setAllergens(updated);
      await persist(updated, reactions);
    },
    [allergens, reactions]
  );

  const logReaction = useCallback(
    async (data) => {
      const newReaction = {
        id: generateId(),
        date: data.date || new Date().toISOString(),
        allergen: data.allergen || '',
        food: data.food || '',
        symptoms: data.symptoms || [],
        severity: data.severity || 1,
        notes: data.notes || '',
      };
      const updated = [newReaction, ...reactions];
      setReactions(updated);
      await persist(allergens, updated);
      return newReaction;
    },
    [allergens, reactions]
  );

  const getReactionHistory = useCallback(
    (allergenId) => {
      // Find allergen name by id
      const allergen = allergens.find((a) => a.id === allergenId);
      if (!allergen) return [];
      return reactions.filter(
        (r) => r.allergen.toLowerCase() === allergen.name.toLowerCase()
      );
    },
    [allergens, reactions]
  );

  const getRecentReactions = useCallback(
    (limit = 10) => {
      return reactions.slice(0, limit);
    },
    [reactions]
  );

  const getAllergenNames = useCallback(() => {
    return allergens.map((a) => a.name);
  }, [allergens]);

  const checkFood = useCallback(
    (foodName) => {
      if (!foodName) return [];
      const lower = foodName.toLowerCase();
      const matches = [];

      allergens.forEach((userAllergen) => {
        // Find the common allergen entry to get keywords
        const common = COMMON_ALLERGENS.find(
          (c) => c.name.toLowerCase() === userAllergen.name.toLowerCase()
        );
        const keywords = common
          ? common.keywords
          : [userAllergen.name.toLowerCase()];

        for (const keyword of keywords) {
          if (lower.includes(keyword)) {
            matches.push(userAllergen);
            break;
          }
        }
      });

      return matches;
    },
    [allergens]
  );

  return {
    allergens,
    reactions,
    isLoading,
    addAllergen,
    removeAllergen,
    logReaction,
    getReactionHistory,
    getRecentReactions,
    getAllergenNames,
    checkFood,
  };
}
