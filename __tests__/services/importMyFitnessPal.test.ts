import {
  parseMyFitnessPalCsv,
} from '../../services/importMyFitnessPal';

describe('parseMyFitnessPalCsv', () => {
  it('parses a flat diary csv with FuelIQ-style headers', () => {
    const parsed = parseMyFitnessPalCsv(`
Date,Meal,Food Name,Calories,Protein (g),Carbs (g),Fat (g),Serving
2026-03-10,Breakfast,Greek Yogurt,150,15,10,4,170 g
2026-03-10,Lunch,Chicken Bowl,520,45,35,18,1 bowl
2026-03-11,Snacks,Protein Bar,210,20,18,7,1 bar
    `);

    expect(parsed.summary).toEqual({
      entryCount: 3,
      dayCount: 2,
      mealCount: 3,
      uniqueFoodCount: 3,
      skippedCount: 0,
      startDate: '2026-03-10',
      endDate: '2026-03-11',
    });

    expect(parsed.entries[0]).toEqual(
      expect.objectContaining({
        dateKey: '2026-03-10',
        mealType: 'breakfast',
        name: 'Greek Yogurt',
        calories: 150,
        protein: 15,
        carbs: 10,
        fat: 4,
        serving: '170 g',
      })
    );
  });

  it('supports common MyFitnessPal-style headers, blank carry-forward cells, and totals rows', () => {
    const parsed = parseMyFitnessPalCsv(`
Entry Date,Meal Name,Food,Calories,Carbohydrates,Fat,Protein,Amount
3/10/2026,Breakfast,Eggs,140,1,10,12,2 eggs
,,Breakfast Total,140,1,10,12,
,Lunch,Chicken Wrap,480,35,16,38,1 wrap
3/11/2026,Snack,Protein Shake,,5,2,25,1 shake
    `);

    expect(parsed.summary.entryCount).toBe(3);
    expect(parsed.summary.skippedCount).toBe(1);

    expect(parsed.entries).toEqual([
      expect.objectContaining({
        dateKey: '2026-03-10',
        mealType: 'breakfast',
        name: 'Eggs',
      }),
      expect.objectContaining({
        dateKey: '2026-03-10',
        mealType: 'lunch',
        name: 'Chicken Wrap',
      }),
      expect.objectContaining({
        dateKey: '2026-03-11',
        mealType: 'snacks',
        name: 'Protein Shake',
        calories: 138,
      }),
    ]);
  });

  it('throws when the csv is missing the required header fields', () => {
    expect(() =>
      parseMyFitnessPalCsv(`
Food,Calories,Protein
Greek Yogurt,150,15
      `)
    ).toThrow('Could not find the required Date, Meal, and Food Name columns.');
  });

  it('preserves quoted commas and escaped quotes in csv fields', () => {
    const parsed = parseMyFitnessPalCsv(`
Date,Meal,Food Name,Calories,Protein (g),Carbs (g),Fat (g),Serving
2026-03-12,Dinner,"Chicken, Rice Bowl",620,42,58,18,"1 bowl, large"
2026-03-12,Snacks,"Protein ""Deluxe"" Bar",220,20,23,7,1 bar
    `);

    expect(parsed.entries).toEqual([
      expect.objectContaining({
        dateKey: '2026-03-12',
        mealType: 'dinner',
        name: 'Chicken, Rice Bowl',
        serving: '1 bowl, large',
      }),
      expect.objectContaining({
        dateKey: '2026-03-12',
        mealType: 'snacks',
        name: 'Protein "Deluxe" Bar',
        serving: '1 bar',
      }),
    ]);
  });
});
