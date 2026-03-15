import { format } from 'date-fns';
import type { DateKey, MealType } from '../types';

export interface ImportedFoodDiaryEntry {
  dateKey: DateKey;
  mealType: MealType;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  serving: string;
  source: 'myfitnesspal_import';
  sourceLabel: 'MyFitnessPal Import';
}

export interface MyFitnessPalImportSummary {
  entryCount: number;
  dayCount: number;
  mealCount: number;
  uniqueFoodCount: number;
  skippedCount: number;
  startDate: DateKey;
  endDate: DateKey;
}

export interface ParsedMyFitnessPalImport {
  entries: ImportedFoodDiaryEntry[];
  summary: MyFitnessPalImportSummary;
}

interface ParsedHeaderMap {
  date: number | null;
  meal: number | null;
  name: number | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  serving: number | null;
}

const SOURCE = 'myfitnesspal_import';
const SOURCE_LABEL = 'MyFitnessPal Import';

const HEADER_ALIASES = {
  date: ['date', 'entrydate', 'loggeddate', 'day'],
  meal: ['meal', 'mealname', 'mealtype'],
  name: ['foodname', 'food', 'fooditem', 'itemname', 'item', 'description', 'name'],
  calories: ['calories', 'calorie', 'energy', 'kcal'],
  protein: ['protein', 'proteing'],
  carbs: ['carbs', 'carbohydrates', 'carbohydrateg', 'carbohydratesg'],
  fat: ['fat', 'fatg'],
  serving: ['serving', 'servings', 'servingsize', 'servingdescription', 'amount', 'portion'],
} as const;

const MEAL_TYPE_ORDER: Record<MealType, number> = {
  breakfast: 0,
  lunch: 1,
  dinner: 2,
  snacks: 3,
};

function normalizeHeader(header: string): string {
  return (header || '')
    .replace(/^\uFEFF/, '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

function normalizeFoodName(name: string): string {
  return (name || '').trim().replace(/\s+/g, ' ');
}

function normalizeServing(serving: string): string {
  return (serving || '').trim().replace(/\s+/g, ' ') || '1 serving';
}

function parseNumber(value: string): number | null {
  if (!value || !value.trim()) {
    return null;
  }

  const match = value.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
  if (!match) {
    return null;
  }

  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function makeDateKey(year: number, month: number, day: number): DateKey | null {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return format(date, 'yyyy-MM-dd');
}

function parseYear(value: number): number {
  if (value >= 100) {
    return value;
  }

  return value >= 70 ? 1900 + value : 2000 + value;
}

function parseDateKey(value: string): DateKey | null {
  const trimmed = (value || '').trim();
  if (!trimmed) {
    return null;
  }

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return makeDateKey(
      Number(isoMatch[1]),
      Number(isoMatch[2]),
      Number(isoMatch[3]),
    );
  }

  const slashMatch = trimmed.match(/^(\d{1,4})[/. -](\d{1,2})[/. -](\d{1,4})$/);
  if (slashMatch) {
    const left = Number(slashMatch[1]);
    const middle = Number(slashMatch[2]);
    const right = Number(slashMatch[3]);

    if (slashMatch[1].length === 4) {
      return makeDateKey(left, middle, right);
    }

    const year = parseYear(right);
    if (left > 12) {
      return makeDateKey(year, middle, left);
    }
    if (middle > 12) {
      return makeDateKey(year, left, middle);
    }
    return makeDateKey(year, left, middle);
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return format(parsed, 'yyyy-MM-dd');
}

function normalizeMealType(value: string): MealType | null {
  const normalized = (value || '').trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (normalized.includes('breakfast')) {
    return 'breakfast';
  }
  if (normalized.includes('lunch') || normalized.includes('brunch')) {
    return 'lunch';
  }
  if (normalized.includes('dinner') || normalized.includes('supper')) {
    return 'dinner';
  }
  if (normalized.includes('snack')) {
    return 'snacks';
  }

  return 'snacks';
}

function isSkippableFoodName(name: string): boolean {
  const normalized = normalizeFoodName(name).toLowerCase();
  if (!normalized) {
    return true;
  }

  return (
    normalized === 'total' ||
    normalized === 'totals' ||
    normalized.endsWith(' total') ||
    normalized.endsWith(' totals')
  );
}

function parseCsvTable(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];
    const nextChar = csvText[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      currentRow.push(currentField);
      currentField = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        index += 1;
      }
      currentRow.push(currentField);
      rows.push(currentRow);
      currentRow = [];
      currentField = '';
      continue;
    }

    currentField += char;
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
}

function findColumnIndex(
  normalizedHeaders: string[],
  aliases: readonly string[],
): number | null {
  const match = normalizedHeaders.findIndex((header) => aliases.some((alias) => alias === header));
  return match >= 0 ? match : null;
}

function getHeaderMap(row: string[]): ParsedHeaderMap {
  const normalizedHeaders = row.map(normalizeHeader);
  return {
    date: findColumnIndex(normalizedHeaders, HEADER_ALIASES.date),
    meal: findColumnIndex(normalizedHeaders, HEADER_ALIASES.meal),
    name: findColumnIndex(normalizedHeaders, HEADER_ALIASES.name),
    calories: findColumnIndex(normalizedHeaders, HEADER_ALIASES.calories),
    protein: findColumnIndex(normalizedHeaders, HEADER_ALIASES.protein),
    carbs: findColumnIndex(normalizedHeaders, HEADER_ALIASES.carbs),
    fat: findColumnIndex(normalizedHeaders, HEADER_ALIASES.fat),
    serving: findColumnIndex(normalizedHeaders, HEADER_ALIASES.serving),
  };
}

function headerScore(headerMap: ParsedHeaderMap): number {
  return Object.values(headerMap).filter((index) => index !== null).length;
}

function getCell(row: string[], index: number | null): string {
  if (index === null || index < 0) {
    return '';
  }
  return row[index] || '';
}

function selectHeaderRow(rows: string[][]): { index: number; headerMap: ParsedHeaderMap } {
  let bestIndex = -1;
  let bestMap: ParsedHeaderMap | null = null;
  let bestScore = -1;

  const searchLimit = Math.min(rows.length, 5);
  for (let index = 0; index < searchLimit; index += 1) {
    const row = rows[index];
    const candidate = getHeaderMap(row);
    const score = headerScore(candidate);
    if (score > bestScore) {
      bestScore = score;
      bestMap = candidate;
      bestIndex = index;
    }
  }

  if (!bestMap || bestIndex < 0 || bestMap.date === null || bestMap.meal === null || bestMap.name === null) {
    throw new Error('Could not find the required Date, Meal, and Food Name columns.');
  }

  return { index: bestIndex, headerMap: bestMap };
}

export function parseMyFitnessPalCsv(csvText: string): ParsedMyFitnessPalImport {
  const normalizedText = (csvText || '').trim();
  if (!normalizedText) {
    throw new Error('Paste your MyFitnessPal CSV export first.');
  }

  const rows = parseCsvTable(normalizedText).filter((row) =>
    row.some((cell) => cell && cell.trim().length > 0)
  );

  if (rows.length < 2) {
    throw new Error('This CSV does not contain any food diary rows.');
  }

  const { index: headerIndex, headerMap } = selectHeaderRow(rows);
  const entries: ImportedFoodDiaryEntry[] = [];
  let skippedCount = 0;
  let lastDateKey: DateKey | null = null;
  let lastMealType: MealType | null = null;

  rows.slice(headerIndex + 1).forEach((row) => {
    const rawDate = getCell(row, headerMap.date).trim();
    const rawMeal = getCell(row, headerMap.meal).trim();
    const rawName = getCell(row, headerMap.name).trim();

    const parsedDateKey = parseDateKey(rawDate);
    if (parsedDateKey) {
      lastDateKey = parsedDateKey;
    }

    const parsedMealType = normalizeMealType(rawMeal);
    if (parsedMealType) {
      lastMealType = parsedMealType;
    }

    const dateKey = parsedDateKey || lastDateKey;
    const mealType = parsedMealType || lastMealType;
    const name = normalizeFoodName(rawName);

    if (!dateKey || !mealType || isSkippableFoodName(name)) {
      skippedCount += 1;
      return;
    }

    const protein = parseNumber(getCell(row, headerMap.protein)) || 0;
    const carbs = parseNumber(getCell(row, headerMap.carbs)) || 0;
    const fat = parseNumber(getCell(row, headerMap.fat)) || 0;
    const calories =
      parseNumber(getCell(row, headerMap.calories)) ||
      Math.round(protein * 4 + carbs * 4 + fat * 9);

    entries.push({
      dateKey,
      mealType,
      name,
      calories,
      protein,
      carbs,
      fat,
      serving: normalizeServing(getCell(row, headerMap.serving)),
      source: SOURCE,
      sourceLabel: SOURCE_LABEL,
    });
  });

  if (entries.length === 0) {
    throw new Error('No importable food rows were found in this CSV.');
  }

  entries.sort((left, right) => {
    if (left.dateKey !== right.dateKey) {
      return left.dateKey.localeCompare(right.dateKey);
    }
    if (left.mealType !== right.mealType) {
      return MEAL_TYPE_ORDER[left.mealType] - MEAL_TYPE_ORDER[right.mealType];
    }
    return left.name.localeCompare(right.name);
  });

  const dateKeys = [...new Set(entries.map((entry) => entry.dateKey))];
  const mealKeys = new Set(entries.map((entry) => `${entry.dateKey}:${entry.mealType}`));
  const uniqueFoodNames = new Set(entries.map((entry) => entry.name.toLowerCase()));

  return {
    entries,
    summary: {
      entryCount: entries.length,
      dayCount: dateKeys.length,
      mealCount: mealKeys.size,
      uniqueFoodCount: uniqueFoodNames.size,
      skippedCount,
      startDate: dateKeys[0],
      endDate: dateKeys[dateKeys.length - 1],
    },
  };
}
