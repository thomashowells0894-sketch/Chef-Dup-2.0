import {
  buildMealTemplateName,
  getMealTemplateEmoji,
  summarizeMealTemplateItems,
} from '../../lib/mealTemplates';

describe('mealTemplates', () => {
  it('builds a single-item template name with the meal label', () => {
    expect(buildMealTemplateName({
      mealType: 'breakfast',
      items: [{ name: 'Greek Yogurt' }],
    })).toBe('Greek Yogurt Breakfast');
  });

  it('builds a two-item template name from the first two unique foods', () => {
    expect(buildMealTemplateName({
      mealType: 'lunch',
      items: [{ name: 'Chicken Breast' }, { name: 'Rice' }, { name: 'Rice' }],
    })).toBe('Chicken Breast + Rice');
  });

  it('adds a numeric suffix when the generated name already exists', () => {
    expect(buildMealTemplateName({
      mealType: 'dinner',
      items: [{ name: 'Salmon' }, { name: 'Rice' }],
      existingNames: ['Salmon + Rice', 'Salmon + Rice 2'],
    })).toBe('Salmon + Rice 3');
  });

  it('summarizes meal items with a remainder count', () => {
    expect(summarizeMealTemplateItems(
      [{ name: 'Eggs' }, { name: 'Toast' }, { name: 'Banana' }],
      2
    )).toBe('Eggs + Toast +1 more');
  });

  it('maps meal types to stable template emojis', () => {
    expect(getMealTemplateEmoji('snacks')).toBe('🥤');
  });
});
