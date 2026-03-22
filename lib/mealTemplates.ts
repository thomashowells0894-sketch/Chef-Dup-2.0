type TemplateMealType = 'breakfast' | 'lunch' | 'dinner' | 'snacks';

interface MealTemplateItem {
  name?: string | null;
}

interface BuildMealTemplateNameInput {
  mealType: TemplateMealType;
  items: MealTemplateItem[];
  existingNames?: string[];
}

const MEAL_TEMPLATE_LABELS: Record<TemplateMealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snacks: 'Snack',
};

const MEAL_TEMPLATE_EMOJIS: Record<TemplateMealType, string> = {
  breakfast: '🍳',
  lunch: '🥗',
  dinner: '🍲',
  snacks: '🥤',
};

function normalizeTemplateName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function getUniqueItemNames(items: MealTemplateItem[]): string[] {
  const seen = new Set<string>();
  const orderedNames: string[] = [];

  items.forEach((item) => {
    const trimmedName = String(item?.name || '').trim();
    if (!trimmedName) {
      return;
    }

    const normalizedName = normalizeTemplateName(trimmedName);
    if (seen.has(normalizedName)) {
      return;
    }

    seen.add(normalizedName);
    orderedNames.push(trimmedName);
  });

  return orderedNames;
}

export function getMealTemplateEmoji(mealType: TemplateMealType): string {
  return MEAL_TEMPLATE_EMOJIS[mealType] || '🍽️';
}

export function summarizeMealTemplateItems(items: MealTemplateItem[], limit: number = 2): string {
  const names = getUniqueItemNames(items);
  if (names.length === 0) {
    return 'Saved meal';
  }

  const previewNames = names.slice(0, Math.max(1, limit));
  const remainder = Math.max(names.length - previewNames.length, 0);
  const joinedPreview = previewNames.join(' + ');

  return remainder > 0 ? `${joinedPreview} +${remainder} more` : joinedPreview;
}

export function buildMealTemplateName({
  mealType,
  items,
  existingNames = [],
}: BuildMealTemplateNameInput): string {
  const mealLabel = MEAL_TEMPLATE_LABELS[mealType] || 'Meal';
  const names = getUniqueItemNames(items);

  let baseName = mealLabel;
  if (names.length === 1) {
    baseName = `${names[0]} ${mealLabel}`.trim();
  } else if (names.length >= 2) {
    baseName = `${names[0]} + ${names[1]}`.trim();
  }

  const existingNameSet = new Set(existingNames.map(normalizeTemplateName));
  if (!existingNameSet.has(normalizeTemplateName(baseName))) {
    return baseName;
  }

  let suffix = 2;
  let candidate = `${baseName} ${suffix}`;
  while (existingNameSet.has(normalizeTemplateName(candidate))) {
    suffix += 1;
    candidate = `${baseName} ${suffix}`;
  }

  return candidate;
}
