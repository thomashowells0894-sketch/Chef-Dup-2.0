import { buildFoodLogInsertPayload } from '../../lib/mealLogPayload';

describe('buildFoodLogInsertPayload', () => {
  it('persists serving metadata for repeat logging and relaunch hydration', () => {
    expect(
      buildFoodLogInsertPayload('user-1', '2026-03-22', 'breakfast', {
        name: 'Protein Oats',
        calories: 320,
        protein: 28,
        carbs: 35,
        fat: 8,
        serving: '50g',
        servingSize: 50,
        servingUnit: 'g',
      } as any),
    ).toEqual({
      user_id: 'user-1',
      date: '2026-03-22',
      name: 'Protein Oats',
      calories: 320,
      protein: 28,
      carbs: 35,
      fat: 8,
      meal_type: 'breakfast',
      serving: '50g',
      serving_size: 50,
      serving_unit: 'g',
    });
  });

  it('strips invalid serving sizes instead of persisting bad numeric defaults', () => {
    expect(
      buildFoodLogInsertPayload('user-1', '2026-03-22', 'snacks', {
        name: 'Mystery Snack',
        calories: 180,
        protein: 4,
        carbs: 22,
        fat: 8,
        serving: '1 serving',
        servingSize: 0,
        servingUnit: 'serving',
      } as any),
    ).toEqual(
      expect.objectContaining({
        serving: '1 serving',
        serving_size: null,
        serving_unit: 'serving',
      }),
    );
  });
});

