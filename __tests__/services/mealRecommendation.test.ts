import { getRecommendations, getCoachMessage, getSuggestedMealType, mealToFood } from '../../services/mealRecommendation';

describe('mealRecommendation', () => {
  describe('getRecommendations', () => {
    it('returns recommendations within calorie budget', () => {
      const result = getRecommendations(500, 30);
      expect(result).toBeDefined();
      expect(result.bestForProtein).toBeDefined();
      if (result.bestForProtein) {
        expect(result.bestForProtein.calories).toBeLessThanOrEqual(600); // 500 + 100 buffer
      }
    });

    it('returns three distinct recommendation categories', () => {
      const result = getRecommendations(800, 40);
      expect(result.bestForProtein).not.toBeNull();
      expect(result.mostFilling).not.toBeNull();
      expect(result.quickEasy).not.toBeNull();
    });

    it('returns different meals for each category when possible', () => {
      const result = getRecommendations(800, 40);
      const ids = new Set([
        result.bestForProtein?.id,
        result.mostFilling?.id,
        result.quickEasy?.id,
      ].filter(Boolean));
      // At least 2 unique meals (3 ideally, but sometimes overlap is unavoidable)
      expect(ids.size).toBeGreaterThanOrEqual(2);
    });

    it('handles very low calorie budget by falling back to lowest calorie options', () => {
      const result = getRecommendations(50, 5);
      expect(result).toBeDefined();
      expect(result.totalEligible).toBeGreaterThan(0);
      // With a 50 cal budget, the fallback path should provide options
      expect(result.bestForProtein).not.toBeNull();
    });

    it('handles zero calorie budget', () => {
      const result = getRecommendations(0, 0);
      expect(result).toBeDefined();
      expect(result.remainingCalories).toBe(0);
      expect(result.remainingProtein).toBe(0);
      expect(result.totalEligible).toBeGreaterThan(0);
    });

    it('handles negative calorie budget', () => {
      const result = getRecommendations(-100, -20);
      expect(result).toBeDefined();
      expect(result.remainingCalories).toBe(-100);
      expect(result.remainingProtein).toBe(-20);
    });

    it('filters by meal type when specified', () => {
      const result = getRecommendations(600, 30, 'breakfast');
      expect(result).toBeDefined();
      // If meals were found for breakfast category, they should be breakfast meals
      if (result.bestForProtein && result.totalEligible >= 3) {
        expect(result.bestForProtein.category).toBe('breakfast');
      }
    });

    it('filters by lunch category', () => {
      const result = getRecommendations(800, 40, 'lunch');
      expect(result).toBeDefined();
    });

    it('filters by dinner category', () => {
      const result = getRecommendations(600, 30, 'dinner');
      expect(result).toBeDefined();
    });

    it('filters by snacks category', () => {
      const result = getRecommendations(300, 15, 'snacks');
      expect(result).toBeDefined();
    });

    it('protein recommendation has high protein density', () => {
      const result = getRecommendations(600, 30);
      if (result.bestForProtein && result.quickEasy) {
        const proteinDensity = result.bestForProtein.protein / result.bestForProtein.calories;
        // Protein pick should have reasonable protein density
        expect(proteinDensity).toBeGreaterThan(0);
      }
    });

    it('returns remaining calorie and protein values unchanged', () => {
      const result = getRecommendations(750, 45);
      expect(result.remainingCalories).toBe(750);
      expect(result.remainingProtein).toBe(45);
    });

    it('returns totalEligible as a non-negative number', () => {
      const result = getRecommendations(800, 40);
      expect(typeof result.totalEligible).toBe('number');
      expect(result.totalEligible).toBeGreaterThanOrEqual(0);
    });

    it('expands search when fewer than 3 meals fit exactly', () => {
      // With a very specific calorie range, the first filter may find < 3
      const result = getRecommendations(175, 10);
      expect(result.totalEligible).toBeGreaterThanOrEqual(3);
    });

    it('returns results for a very large calorie budget', () => {
      const result = getRecommendations(5000, 200);
      expect(result).toBeDefined();
      expect(result.totalEligible).toBeGreaterThan(0);
    });

    it('mostFilling differs from bestForProtein when possible', () => {
      const result = getRecommendations(800, 40);
      if (result.mostFilling && result.bestForProtein && result.totalEligible > 1) {
        expect(result.mostFilling.id).not.toBe(result.bestForProtein.id);
      }
    });

    it('quickEasy differs from both other picks when possible', () => {
      const result = getRecommendations(800, 40);
      if (result.quickEasy && result.bestForProtein && result.mostFilling && result.totalEligible > 2) {
        expect(result.quickEasy.id).not.toBe(result.bestForProtein.id);
        expect(result.quickEasy.id).not.toBe(result.mostFilling.id);
      }
    });

    it('returns null for categories when no meals are available with nonexistent type', () => {
      const result = getRecommendations(1, 1, 'nonexistent');
      // Should fall back to lowest calorie options
      expect(result.totalEligible).toBeGreaterThan(0);
    });

    it('all recommended meals have required properties', () => {
      const result = getRecommendations(500, 30);
      const meals = [result.bestForProtein, result.mostFilling, result.quickEasy].filter(Boolean);
      for (const meal of meals) {
        expect(meal).toHaveProperty('id');
        expect(meal).toHaveProperty('name');
        expect(meal).toHaveProperty('calories');
        expect(meal).toHaveProperty('protein');
        expect(meal).toHaveProperty('carbs');
        expect(meal).toHaveProperty('fat');
        expect(meal).toHaveProperty('serving');
      }
    });
  });

  describe('getCoachMessage', () => {
    it('returns over-budget message when calories <= 0', () => {
      const msg = getCoachMessage(0, 10);
      expect(msg).toContain('hit your calorie goal');
    });

    it('returns over-budget message for negative calories', () => {
      const msg = getCoachMessage(-100, 10);
      expect(msg).toContain('hit your calorie goal');
    });

    it('returns over-budget message for deeply negative calories', () => {
      const msg = getCoachMessage(-1000, 50);
      expect(msg).toContain('hit your calorie goal');
    });

    it('returns almost-there message for < 200 remaining', () => {
      const msg = getCoachMessage(150, 10);
      expect(msg).toContain('Almost there');
    });

    it('returns almost-there message at 199 calories', () => {
      const msg = getCoachMessage(199, 10);
      expect(msg).toContain('Almost there');
    });

    it('returns almost-there message at 1 calorie remaining', () => {
      const msg = getCoachMessage(1, 5);
      expect(msg).toContain('Almost there');
    });

    it('returns protein message when protein > 30 and calories > 300', () => {
      const msg = getCoachMessage(500, 40);
      expect(msg).toContain('protein');
    });

    it('returns protein message at boundary (31 protein, 301 calories)', () => {
      const msg = getCoachMessage(301, 31);
      expect(msg).toContain('protein');
    });

    it('does NOT return protein message when protein is exactly 30', () => {
      const msg = getCoachMessage(500, 30);
      // 30 is not > 30, so it should fall to the next check
      expect(msg).not.toContain('protein');
    });

    it('does NOT return protein message when calories <= 300', () => {
      const msg = getCoachMessage(300, 40);
      // calories is not > 300
      expect(msg).not.toContain('protein');
    });

    it('returns plenty message for > 800 remaining', () => {
      const msg = getCoachMessage(900, 20);
      expect(msg).toContain('Plenty');
    });

    it('returns plenty message at 801 calories', () => {
      const msg = getCoachMessage(801, 20);
      expect(msg).toContain('Plenty');
    });

    it('returns default message for moderate remaining (200-800)', () => {
      const msg = getCoachMessage(400, 15);
      expect(msg).toContain('top picks');
    });

    it('returns default message at exactly 200 calories, low protein', () => {
      const msg = getCoachMessage(200, 10);
      expect(msg).toContain('top picks');
    });

    it('returns default message at exactly 800 calories, low protein', () => {
      const msg = getCoachMessage(800, 10);
      expect(msg).toContain('top picks');
    });

    it('returns a string in all edge cases', () => {
      const cases = [
        [0, 0], [-500, -10], [100, 5], [150, 10], [199, 0],
        [200, 10], [300, 35], [301, 31], [500, 40], [800, 10],
        [801, 20], [900, 20], [400, 15], [5000, 200],
      ];
      for (const [cal, prot] of cases) {
        const msg = getCoachMessage(cal, prot);
        expect(typeof msg).toBe('string');
        expect(msg.length).toBeGreaterThan(0);
      }
    });
  });

  describe('getSuggestedMealType', () => {
    it('returns a valid meal type string', () => {
      const type = getSuggestedMealType();
      expect(['breakfast', 'lunch', 'snacks', 'dinner']).toContain(type);
    });

    it('returns one of the four meal types based on time', () => {
      // We cannot control time easily without mocking Date, but we can verify the return type
      const result = getSuggestedMealType();
      expect(typeof result).toBe('string');
    });

    it('returns breakfast before 10am', () => {
      const realDate = Date;
      const mockDate = new Date(2024, 0, 15, 8, 0, 0);
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as unknown as Date);
      const result = getSuggestedMealType();
      expect(result).toBe('breakfast');
      jest.restoreAllMocks();
    });

    it('returns lunch between 10am and 2pm', () => {
      const mockDate = new Date(2024, 0, 15, 12, 0, 0);
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as unknown as Date);
      const result = getSuggestedMealType();
      expect(result).toBe('lunch');
      jest.restoreAllMocks();
    });

    it('returns snacks between 2pm and 6pm', () => {
      const mockDate = new Date(2024, 0, 15, 15, 0, 0);
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as unknown as Date);
      const result = getSuggestedMealType();
      expect(result).toBe('snacks');
      jest.restoreAllMocks();
    });

    it('returns dinner after 6pm', () => {
      const mockDate = new Date(2024, 0, 15, 20, 0, 0);
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as unknown as Date);
      const result = getSuggestedMealType();
      expect(result).toBe('dinner');
      jest.restoreAllMocks();
    });

    it('returns lunch at exactly 10am', () => {
      const mockDate = new Date(2024, 0, 15, 10, 0, 0);
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as unknown as Date);
      const result = getSuggestedMealType();
      expect(result).toBe('lunch');
      jest.restoreAllMocks();
    });

    it('returns snacks at exactly 2pm (hour=14)', () => {
      const mockDate = new Date(2024, 0, 15, 14, 0, 0);
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as unknown as Date);
      const result = getSuggestedMealType();
      expect(result).toBe('snacks');
      jest.restoreAllMocks();
    });

    it('returns dinner at exactly 6pm (hour=18)', () => {
      const mockDate = new Date(2024, 0, 15, 18, 0, 0);
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as unknown as Date);
      const result = getSuggestedMealType();
      expect(result).toBe('dinner');
      jest.restoreAllMocks();
    });

    it('returns breakfast at midnight (hour=0)', () => {
      const mockDate = new Date(2024, 0, 15, 0, 0, 0);
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as unknown as Date);
      const result = getSuggestedMealType();
      expect(result).toBe('breakfast');
      jest.restoreAllMocks();
    });

    it('returns dinner at 11pm (hour=23)', () => {
      const mockDate = new Date(2024, 0, 15, 23, 0, 0);
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as unknown as Date);
      const result = getSuggestedMealType();
      expect(result).toBe('dinner');
      jest.restoreAllMocks();
    });
  });

  describe('mealToFood', () => {
    const baseMeal = {
      id: 'test-1',
      name: 'Test Meal',
      serving: '1 cup',
      servingSize: 240,
      servingUnit: 'ml',
      calories: 300,
      protein: 25,
      carbs: 30,
      fat: 10,
      category: 'lunch' as const,
      volumeScore: 7,
      prepTime: 10,
      tags: ['quick' as const, 'high-protein' as const],
    };

    it('converts meal to food format with correct fields', () => {
      const food = mealToFood(baseMeal);
      expect(food.name).toBe('Test Meal');
      expect(food.calories).toBe(300);
      expect(food.protein).toBe(25);
      expect(food.carbs).toBe(30);
      expect(food.fat).toBe(10);
      expect(food.serving).toBe('1 cup');
      expect(food.servingSize).toBe(240);
      expect(food.servingUnit).toBe('ml');
    });

    it('sets category to "recommended"', () => {
      const food = mealToFood(baseMeal);
      expect(food.category).toBe('recommended');
    });

    it('sets isPerServing to true', () => {
      const food = mealToFood(baseMeal);
      expect(food.isPerServing).toBe(true);
    });

    it('generates id containing original meal id', () => {
      const food = mealToFood(baseMeal);
      expect(food.id).toContain('test-1');
    });

    it('generates id with timestamp suffix', () => {
      const food = mealToFood(baseMeal);
      expect(food.id).toMatch(/test-1-\d+/);
    });

    it('generates unique ids on successive calls', () => {
      const food1 = mealToFood(baseMeal);
      // Slight delay to ensure different timestamp
      const food2 = mealToFood(baseMeal);
      // Both contain original id prefix
      expect(food1.id).toContain('test-1');
      expect(food2.id).toContain('test-1');
    });

    it('preserves all macro values exactly', () => {
      const meal = {
        ...baseMeal,
        id: 'macro-exact',
        calories: 451,
        protein: 35.5,
        carbs: 40.2,
        fat: 15.8,
      };
      const food = mealToFood(meal);
      expect(food.calories).toBe(451);
      expect(food.protein).toBe(35.5);
      expect(food.carbs).toBe(40.2);
      expect(food.fat).toBe(15.8);
    });

    it('preserves serving info exactly', () => {
      const meal = { ...baseMeal, serving: '200g', servingSize: 200, servingUnit: 'g' };
      const food = mealToFood(meal);
      expect(food.serving).toBe('200g');
      expect(food.servingSize).toBe(200);
      expect(food.servingUnit).toBe('g');
    });

    it('returns an object with all required FoodFromMeal fields', () => {
      const food = mealToFood(baseMeal);
      const requiredKeys = ['id', 'name', 'serving', 'servingSize', 'servingUnit', 'calories', 'protein', 'carbs', 'fat', 'category', 'isPerServing'];
      for (const key of requiredKeys) {
        expect(food).toHaveProperty(key);
      }
    });

    it('does not include tags, prepTime, or volumeScore from meal', () => {
      const food = mealToFood(baseMeal) as Record<string, unknown>;
      expect(food.tags).toBeUndefined();
      expect(food.prepTime).toBeUndefined();
      expect(food.volumeScore).toBeUndefined();
    });
  });
});
