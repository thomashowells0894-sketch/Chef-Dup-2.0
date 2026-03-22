import { buildQuickLogItems } from '../../lib/quickLogItems';

describe('buildQuickLogItems', () => {
  it('prioritizes saved meals before repeat foods', () => {
    const items = buildQuickLogItems({
      recipes: [
        {
          id: 'recipe-1',
          name: 'Chicken Rice Bowl',
          emoji: '🍚',
          calories: 520,
          protein: 42,
          carbs: 48,
          fat: 14,
          servings: 2,
        },
      ],
      frequentFoods: [
        {
          id: 'food-1',
          name: 'Banana',
          emoji: '🍌',
          calories: 105,
          protein: 1,
          carbs: 27,
          fat: 0,
        },
      ],
      limit: 4,
    });

    expect(items[0]).toMatchObject({
      kind: 'saved_meal',
      name: 'Chicken Rice Bowl',
      serving: '1 serving (1/2 recipe)',
    });
    expect(items[1]).toMatchObject({
      kind: 'food',
      name: 'Banana',
    });
  });

  it('dedupes foods that overlap with saved meals and backfills defaults', () => {
    const items = buildQuickLogItems({
      recipes: [
        {
          id: 'recipe-1',
          name: 'Greek Yogurt',
          emoji: '🥛',
          calories: 240,
          protein: 20,
          carbs: 12,
          fat: 5,
          servings: 1,
        },
      ],
      frequentFoods: [
        {
          id: 'food-1',
          name: 'Greek Yogurt',
          emoji: '🥛',
          calories: 100,
          protein: 17,
          carbs: 6,
          fat: 1,
        },
      ],
      limit: 4,
    });

    expect(items.map((item) => item.name)).toEqual([
      'Greek Yogurt',
      'Coffee',
      'Eggs (2)',
      'Banana',
    ]);
  });
});
