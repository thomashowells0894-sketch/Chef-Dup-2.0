import { foodDatabase } from '../data/foods';
import type { ProductResult } from '../services/openFoodFacts';
import {
  bigramSimilarity,
  expandCommonFoodAbbreviations,
  getCuratedSearchAdjustment,
  getCuratedLocalFoodBoost,
  normalizeFoodSearchText,
} from './foodSearchCurations';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

type LocalSearchResult = ProductResult & { isLocal: boolean; _score: number };

export function searchLocalFoodDatabase(query: string, limit: number = 5): ProductResult[] {
  const normalizedQuery = expandCommonFoodAbbreviations(query);
  if (normalizedQuery.length < 2) {
    return [];
  }

  const queryTokens = normalizedQuery.split(' ').filter(Boolean);

  return foodDatabase
    .map((food) => {
      const normalizedName = normalizeFoodSearchText(food.name);
      const exactPhrasePattern = new RegExp(`(^|\\s)${escapeRegExp(normalizedQuery)}(\\s|$)`);
      const curation = getCuratedSearchAdjustment(normalizedQuery, {
        name: food.name,
        source: 'local',
        barcode: `local-${food.id || food.name}`,
        id: food.id,
      });
      const curationBoost = getCuratedLocalFoodBoost(normalizedQuery, food);
      let score = 0;

      if (normalizedName === normalizedQuery) score += 200;
      if (normalizedName.startsWith(`${normalizedQuery} `)) score += 120;
      if (exactPhrasePattern.test(normalizedName)) score += 95;
      if (queryTokens.every((token) => normalizedName.includes(token))) score += 80;

      score += bigramSimilarity(normalizedName, normalizedQuery) * 40;
      score += curationBoost;

      if (score < 25 && curationBoost < 18) {
        return null;
      }

      return {
        barcode: `local-${food.id || food.name}`,
        canonicalId: curation.profileId || String(food.id || food.name).toLowerCase(),
        name: food.name,
        brand: null,
        image: null,
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
        serving: food.serving,
        servingSize: 1,
        servingUnit: 'serving',
        source: 'local',
        sourceLabel: 'FuelIQ',
        qualityTag: 'curated',
        qualityLabel: curationBoost >= 18 ? 'Top Pick' : 'Curated',
        trustScore: clamp(84 + Math.round(curationBoost / 2), 84, 96),
        reportable: true,
        resultKind: 'canonical',
        isLocal: true,
        _score: score,
      } as LocalSearchResult;
    })
    .filter((food): food is LocalSearchResult => Boolean(food))
    .sort((a, b) => b._score - a._score)
    .slice(0, limit)
    .map(({ _score, ...food }) => food);
}
