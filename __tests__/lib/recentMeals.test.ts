import { buildRepeatMealSuggestions, type RecentMealSnapshot } from '../../lib/recentMeals';

function createSnapshot(
  mealType: RecentMealSnapshot['mealType'],
  dateKey: string,
  overrides: Partial<RecentMealSnapshot> = {}
): RecentMealSnapshot {
  return {
    id: `${dateKey}:${mealType}`,
    dateKey,
    mealType,
    updatedAt: `${dateKey}T12:00:00.000Z`,
    itemCount: 2,
    totals: {
      calories: 540,
      protein: 36,
      carbs: 40,
      fat: 18,
    },
    items: [
      { name: 'Chicken Breast', calories: 220, protein: 40, carbs: 0, fat: 5 },
      { name: 'Rice', calories: 320, protein: 6, carbs: 40, fat: 3 },
    ],
    ...overrides,
  };
}

describe('buildRepeatMealSuggestions', () => {
  it('prioritizes unlogged meal slots and the preferred meal type', () => {
    const suggestions = buildRepeatMealSuggestions({
      snapshots: [
        createSnapshot('breakfast', '2026-03-13', {
          items: [{ name: 'Eggs', calories: 200, protein: 18, carbs: 2, fat: 14 }],
          totals: { calories: 200, protein: 18, carbs: 2, fat: 14 },
          itemCount: 1,
        }),
        createSnapshot('lunch', '2026-03-13'),
        createSnapshot('dinner', '2026-03-12', {
          totals: { calories: 690, protein: 42, carbs: 55, fat: 24 },
        }),
      ],
      selectedDateKey: '2026-03-14',
      currentMeals: {
        breakfast: [{ name: 'Protein Oats' } as any],
        lunch: [],
        dinner: [],
        snacks: [],
      },
      preferredMealType: 'lunch',
      limit: 3,
    });

    expect(suggestions[0].targetMealType).toBe('lunch');
    expect(suggestions[0].alreadyLoggedToday).toBe(false);
    expect(suggestions[1].targetMealType).toBe('dinner');
    expect(suggestions[2].targetMealType).toBe('breakfast');
  });

  it('skips same-day snapshots and keeps the best snapshot per meal type', () => {
    const suggestions = buildRepeatMealSuggestions({
      snapshots: [
        createSnapshot('breakfast', '2026-03-14', {
          totals: { calories: 100, protein: 5, carbs: 10, fat: 2 },
        }),
        createSnapshot('breakfast', '2026-03-13', {
          totals: { calories: 430, protein: 32, carbs: 38, fat: 14 },
        }),
        createSnapshot('breakfast', '2026-03-10', {
          totals: { calories: 260, protein: 14, carbs: 30, fat: 7 },
        }),
      ],
      selectedDateKey: '2026-03-14',
      currentMeals: {},
      preferredMealType: 'breakfast',
      limit: 3,
    });

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].snapshot.dateKey).toBe('2026-03-13');
    expect(suggestions[0].daysSinceSource).toBe(1);
  });
});
