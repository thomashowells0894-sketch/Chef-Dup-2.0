import {
  buildMeasureQuickAmounts,
  calculateFoodDetailValues,
  convertFoodDetailQuantity,
  DEFAULT_SERVING_QUICK_AMOUNTS,
  getFoodMeasurementOption,
} from '../../lib/foodDetailMath';

describe('foodDetailMath', () => {
  it('uses the actual serving size when converting weighted foods', () => {
    const measurement = getFoodMeasurementOption({
      serving: '50g',
      servingSize: 50,
      servingUnit: 'g',
    });

    const values = calculateFoodDetailValues(
      { calories: 180, protein: 12, carbs: 20, fat: 6 },
      '100',
      'measure',
      measurement,
    );

    expect(values).toEqual(
      expect.objectContaining({
        calories: 360,
        protein: 24,
        carbs: 40,
        fat: 12,
      }),
    );
  });

  it('only enables direct measurement mode for trusted units', () => {
    expect(
      getFoodMeasurementOption({
        serving: '1 large egg',
        servingSize: 1,
        servingUnit: 'large',
      }),
    ).toBeNull();

    expect(
      getFoodMeasurementOption({
        serving: '240 ml',
        servingSize: 240,
        servingUnit: 'ml',
      }),
    ).toEqual(
      expect.objectContaining({
        unitKey: 'ml',
        shortLabel: 'ml',
        selectorLabel: 'Milliliters',
        baseAmount: 240,
      }),
    );
  });

  it('converts between serving and measurement quantities without assuming 100g', () => {
    const measurement = getFoodMeasurementOption({
      serving: '240 ml',
      servingSize: 240,
      servingUnit: 'ml',
    });

    expect(convertFoodDetailQuantity('1.5', 'serving', 'measure', measurement)).toBe('360');
    expect(convertFoodDetailQuantity('120', 'measure', 'serving', measurement)).toBe('0.5');
  });

  it('builds quick amounts around the real serving size', () => {
    const measurement = getFoodMeasurementOption({
      serving: '32g',
      servingSize: 32,
      servingUnit: 'g',
    });

    expect(buildMeasureQuickAmounts(measurement)).toEqual([
      { amount: '16', label: '16g' },
      { amount: '30', label: '30g' },
      { amount: '50', label: '50g' },
      { amount: '65', label: '65g' },
    ]);
    expect(DEFAULT_SERVING_QUICK_AMOUNTS).toHaveLength(4);
  });
});
