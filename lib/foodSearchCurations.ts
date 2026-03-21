import type { ProductResult } from '../services/openFoodFacts';

interface CuratedFoodProfile {
  id: string;
  aliases: string[];
  localIds?: string[];
  nameTerms: string[];
  preferredSources?: ProductResult['source'][];
  preferredBrands?: string[];
  rankingBoost: number;
  trustBoost: number;
}

interface CuratedFoodLike {
  name: string;
  brand?: string | null;
  source?: ProductResult['source'];
  barcode?: string;
  id?: string | number;
}

export interface CuratedSearchAdjustment {
  profileId: string | null;
  rankingBoost: number;
  trustBoost: number;
}

const COMMON_FOOD_ABBREVIATIONS: Record<string, string> = {
  chkn: 'chicken',
  brst: 'breast',
  grnd: 'ground',
  whl: 'whole',
  org: 'organic',
  nat: 'natural',
  pnt: 'peanut',
  bttr: 'butter',
  choc: 'chocolate',
  strwbry: 'strawberry',
  blubrry: 'blueberry',
  brkfst: 'breakfast',
  sndk: 'sandwich',
  yog: 'yogurt',
  yogrt: 'yogurt',
  avocdo: 'avocado',
  avo: 'avocado',
  broc: 'broccoli',
  cauli: 'cauliflower',
  sw: 'sweet',
  pot: 'potato',
  tom: 'tomato',
  sal: 'salmon',
  tuna: 'tuna',
  turk: 'turkey',
  spag: 'spaghetti',
  oatml: 'oatmeal',
  pb: 'peanut butter',
  oj: 'orange juice',
};

const CURATED_TOP_FOOD_PROFILES: CuratedFoodProfile[] = [
  {
    id: 'chicken-breast',
    aliases: ['chicken breast', 'grilled chicken', 'chkn brst', 'lean chicken'],
    localIds: ['chicken-breast'],
    nameTerms: ['chicken', 'breast'],
    preferredSources: ['local', 'usda'],
    rankingBoost: 28,
    trustBoost: 10,
  },
  {
    id: 'turkey-breast',
    aliases: ['turkey breast', 'sliced turkey', 'lean turkey'],
    localIds: ['turkey-breast'],
    nameTerms: ['turkey', 'breast'],
    preferredSources: ['local', 'usda'],
    rankingBoost: 24,
    trustBoost: 9,
  },
  {
    id: 'ground-beef-90',
    aliases: ['lean ground beef', 'ground beef', 'beef mince', 'lean mince'],
    localIds: ['ground-beef-90'],
    nameTerms: ['ground', 'beef'],
    preferredSources: ['local', 'usda'],
    rankingBoost: 22,
    trustBoost: 8,
  },
  {
    id: 'steak',
    aliases: ['steak', 'sirloin steak', 'ribeye steak', 'beef steak', 'steak grilled'],
    localIds: ['sirloin-steak', 'ribeye-steak'],
    nameTerms: ['steak'],
    preferredSources: ['local', 'usda'],
    rankingBoost: 26,
    trustBoost: 10,
  },
  {
    id: 'eggs',
    aliases: ['egg', 'eggs', 'whole egg', 'whole eggs'],
    localIds: ['eggs'],
    nameTerms: ['egg'],
    preferredSources: ['local', 'usda'],
    rankingBoost: 20,
    trustBoost: 8,
  },
  {
    id: 'egg-whites',
    aliases: ['egg white', 'egg whites', 'liquid egg whites'],
    localIds: ['egg-whites'],
    nameTerms: ['egg', 'white'],
    preferredSources: ['local', 'usda'],
    rankingBoost: 24,
    trustBoost: 9,
  },
  {
    id: 'greek-yogurt',
    aliases: ['greek yogurt', 'greek yoghurt', 'protein yogurt', 'protein yoghurt', 'skyr', 'yogurt'],
    localIds: ['greek-yogurt'],
    nameTerms: ['greek', 'yogurt'],
    preferredSources: ['local', 'usda'],
    preferredBrands: ['oikos', 'fage', 'chobani', 'yopro', 'yo pro'],
    rankingBoost: 30,
    trustBoost: 11,
  },
  {
    id: 'cottage-cheese',
    aliases: ['cottage cheese', 'high protein cottage cheese'],
    localIds: ['cottage-cheese'],
    nameTerms: ['cottage', 'cheese'],
    preferredSources: ['local', 'usda'],
    preferredBrands: ['good culture', 'daisy'],
    rankingBoost: 24,
    trustBoost: 9,
  },
  {
    id: 'salmon',
    aliases: ['salmon', 'salmon fillet', 'atlantic salmon'],
    localIds: ['salmon'],
    nameTerms: ['salmon'],
    preferredSources: ['local', 'usda'],
    rankingBoost: 20,
    trustBoost: 8,
  },
  {
    id: 'tuna-canned',
    aliases: ['tuna', 'tuna canned', 'canned tuna', 'tuna can'],
    localIds: ['tuna-canned'],
    nameTerms: ['tuna'],
    preferredSources: ['local', 'usda'],
    rankingBoost: 22,
    trustBoost: 8,
  },
  {
    id: 'tofu-firm',
    aliases: ['tofu', 'firm tofu', 'extra firm tofu'],
    localIds: ['tofu-firm'],
    nameTerms: ['tofu'],
    preferredSources: ['local', 'usda'],
    rankingBoost: 18,
    trustBoost: 7,
  },
  {
    id: 'protein-shake',
    aliases: ['protein shake', 'protein drink', 'whey shake', 'whey protein', 'fairlife protein shake', 'core power'],
    localIds: ['protein-shake', 'whey-protein'],
    nameTerms: ['protein', 'shake'],
    preferredSources: ['local', 'usda', 'open_food_facts', 'fatsecret'],
    preferredBrands: ['fairlife', 'core power', 'premier protein', 'optimum nutrition', 'myprotein'],
    rankingBoost: 32,
    trustBoost: 10,
  },
  {
    id: 'protein-bar',
    aliases: ['protein bar', 'protein bars', 'quest bar', 'barebells'],
    localIds: ['protein-bar'],
    nameTerms: ['protein', 'bar'],
    preferredSources: ['local', 'usda', 'open_food_facts', 'fatsecret'],
    preferredBrands: ['quest', 'barebells', 'grenade', 'fulfil', 'fulfilment'],
    rankingBoost: 30,
    trustBoost: 9,
  },
  {
    id: 'beef-jerky',
    aliases: ['beef jerky', 'jerky'],
    localIds: ['beef-jerky'],
    nameTerms: ['beef', 'jerky'],
    preferredSources: ['local', 'usda', 'open_food_facts', 'fatsecret'],
    rankingBoost: 20,
    trustBoost: 8,
  },
  {
    id: 'oatmeal',
    aliases: ['oatmeal', 'oats', 'porridge', 'overnight oats'],
    localIds: ['oatmeal'],
    nameTerms: ['oatmeal'],
    preferredSources: ['local', 'usda'],
    rankingBoost: 24,
    trustBoost: 8,
  },
  {
    id: 'white-rice',
    aliases: ['rice', 'white rice', 'jasmine rice', 'basmati rice'],
    localIds: ['white-rice'],
    nameTerms: ['white', 'rice'],
    preferredSources: ['local', 'usda'],
    rankingBoost: 22,
    trustBoost: 8,
  },
  {
    id: 'brown-rice',
    aliases: ['brown rice'],
    localIds: ['brown-rice'],
    nameTerms: ['brown', 'rice'],
    preferredSources: ['local', 'usda'],
    rankingBoost: 20,
    trustBoost: 8,
  },
  {
    id: 'quinoa',
    aliases: ['quinoa'],
    localIds: ['quinoa'],
    nameTerms: ['quinoa'],
    preferredSources: ['local', 'usda'],
    rankingBoost: 18,
    trustBoost: 7,
  },
  {
    id: 'sweet-potato',
    aliases: ['sweet potato', 'sweet potatoes'],
    localIds: ['sweet-potato'],
    nameTerms: ['sweet', 'potato'],
    preferredSources: ['local', 'usda'],
    rankingBoost: 20,
    trustBoost: 7,
  },
  {
    id: 'pasta',
    aliases: ['pasta'],
    localIds: ['pasta'],
    nameTerms: ['pasta'],
    preferredSources: ['local', 'usda'],
    rankingBoost: 16,
    trustBoost: 6,
  },
  {
    id: 'whole-wheat-bread',
    aliases: ['whole wheat bread', 'bread', 'toast'],
    localIds: ['whole-wheat-bread'],
    nameTerms: ['bread'],
    preferredSources: ['local', 'usda'],
    rankingBoost: 18,
    trustBoost: 6,
  },
  {
    id: 'toast',
    aliases: ['toast', 'toast with butter', 'buttered toast'],
    localIds: ['toast-with-butter', 'whole-wheat-bread', 'white-bread', 'sourdough-bread'],
    nameTerms: ['toast'],
    preferredSources: ['local', 'usda'],
    rankingBoost: 22,
    trustBoost: 7,
  },
  {
    id: 'bagel',
    aliases: ['bagel'],
    localIds: ['bagel'],
    nameTerms: ['bagel'],
    preferredSources: ['local', 'usda'],
    rankingBoost: 15,
    trustBoost: 5,
  },
  {
    id: 'rice-cakes',
    aliases: ['rice cake', 'rice cakes'],
    localIds: ['rice-cakes'],
    nameTerms: ['rice', 'cake'],
    preferredSources: ['local', 'usda', 'open_food_facts'],
    preferredBrands: ['quaker'],
    rankingBoost: 18,
    trustBoost: 6,
  },
  {
    id: 'peanut-butter',
    aliases: ['peanut butter', 'pb'],
    localIds: ['peanut-butter'],
    nameTerms: ['peanut', 'butter'],
    preferredSources: ['local', 'usda', 'open_food_facts'],
    rankingBoost: 20,
    trustBoost: 7,
  },
  {
    id: 'almonds',
    aliases: ['almonds', 'almonds raw'],
    localIds: ['almonds'],
    nameTerms: ['almond'],
    preferredSources: ['local', 'usda'],
    rankingBoost: 16,
    trustBoost: 6,
  },
  {
    id: 'banana',
    aliases: ['banana'],
    localIds: ['banana'],
    nameTerms: ['banana'],
    preferredSources: ['local', 'usda'],
    rankingBoost: 14,
    trustBoost: 5,
  },
  {
    id: 'apple',
    aliases: ['apple'],
    localIds: ['apple'],
    nameTerms: ['apple'],
    preferredSources: ['local', 'usda'],
    rankingBoost: 12,
    trustBoost: 5,
  },
  {
    id: 'blueberries',
    aliases: ['blueberries', 'blueberry', 'berries'],
    localIds: ['blueberries'],
    nameTerms: ['blueberr'],
    preferredSources: ['local', 'usda'],
    rankingBoost: 14,
    trustBoost: 5,
  },
  {
    id: 'strawberries',
    aliases: ['strawberries', 'strawberry'],
    localIds: ['strawberries'],
    nameTerms: ['strawberr'],
    preferredSources: ['local', 'usda'],
    rankingBoost: 14,
    trustBoost: 5,
  },
  {
    id: 'avocado',
    aliases: ['avocado', 'avo'],
    localIds: ['avocado'],
    nameTerms: ['avocado'],
    preferredSources: ['local', 'usda'],
    rankingBoost: 16,
    trustBoost: 6,
  },
  {
    id: 'broccoli',
    aliases: ['broccoli'],
    localIds: ['broccoli'],
    nameTerms: ['broccoli'],
    preferredSources: ['local', 'usda'],
    rankingBoost: 14,
    trustBoost: 5,
  },
  {
    id: 'spinach',
    aliases: ['spinach'],
    localIds: ['spinach'],
    nameTerms: ['spinach'],
    preferredSources: ['local', 'usda'],
    rankingBoost: 12,
    trustBoost: 5,
  },
];

const NORMALIZED_PROFILES = CURATED_TOP_FOOD_PROFILES.map((profile) => ({
  ...profile,
  aliases: profile.aliases.map((alias) => normalizeFoodSearchText(alias)),
  nameTerms: profile.nameTerms.map((term) => normalizeFoodSearchText(term)),
  preferredBrands: (profile.preferredBrands || []).map((brand) => normalizeFoodSearchText(brand)),
}));

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getBigrams(value: string): Set<string> {
  const normalized = normalizeFoodSearchText(value);
  const bigrams = new Set<string>();

  for (let index = 0; index < normalized.length - 1; index += 1) {
    bigrams.add(normalized.slice(index, index + 2));
  }

  return bigrams;
}

export function bigramSimilarity(a: string, b: string): number {
  const left = getBigrams(a);
  const right = getBigrams(b);
  if (left.size === 0 || right.size === 0) {
    return 0;
  }

  let intersection = 0;
  left.forEach((bigram) => {
    if (right.has(bigram)) {
      intersection += 1;
    }
  });

  return (2 * intersection) / (left.size + right.size);
}

function tokenize(value: string): string[] {
  return normalizeFoodSearchText(value)
    .split(' ')
    .filter(Boolean);
}

function getLocalId(food: CuratedFoodLike): string {
  if (food.id !== undefined && food.id !== null) {
    return String(food.id);
  }

  if (typeof food.barcode === 'string' && food.barcode.startsWith('local-')) {
    return food.barcode.replace(/^local-/, '');
  }

  return '';
}

function getBestAliasMatchScore(value: string, aliases: string[]): number {
  const normalizedValue = normalizeFoodSearchText(value);
  if (!normalizedValue) {
    return 0;
  }

  let bestScore = 0;
  aliases.forEach((alias) => {
    if (normalizedValue === alias) {
      bestScore = Math.max(bestScore, 1);
      return;
    }

    if (normalizedValue.startsWith(alias) || alias.startsWith(normalizedValue)) {
      bestScore = Math.max(bestScore, 0.84);
    }

    if (normalizedValue.includes(alias) || alias.includes(normalizedValue)) {
      bestScore = Math.max(bestScore, 0.72);
    }

    const similarity = bigramSimilarity(normalizedValue, alias);
    if (similarity >= 0.92) {
      bestScore = Math.max(bestScore, 0.82);
    } else if (similarity >= 0.82) {
      bestScore = Math.max(bestScore, 0.68);
    } else if (similarity >= 0.72) {
      bestScore = Math.max(bestScore, 0.56);
    }
  });

  return bestScore;
}

function getTokenCoverageScore(value: string, terms: string[]): number {
  const tokens = tokenize(value);
  if (tokens.length === 0 || terms.length === 0) {
    return 0;
  }

  const matchedTerms = terms.filter((term) =>
    tokens.some((token) => token.includes(term) || term.includes(token))
  );

  if (matchedTerms.length === terms.length) {
    return 0.78;
  }

  const coverage = matchedTerms.length / terms.length;
  if (coverage >= 0.8) {
    return 0.62;
  }
  if (coverage >= 0.6) {
    return 0.48;
  }
  return 0;
}

function getPreferredBrandScore(food: CuratedFoodLike, brands: string[]): number {
  const normalizedBrand = normalizeFoodSearchText(food.brand || '');
  if (!normalizedBrand) {
    return 0;
  }

  for (const brand of brands) {
    if (
      normalizedBrand === brand ||
      normalizedBrand.includes(brand) ||
      brand.includes(normalizedBrand)
    ) {
      return 1;
    }
  }

  return 0;
}

function getQueryMatchStrength(query: string, profile: typeof NORMALIZED_PROFILES[number]): number {
  return Math.max(
    getBestAliasMatchScore(query, profile.aliases),
    getTokenCoverageScore(query, profile.nameTerms),
  );
}

function getProductMatchStrength(
  food: CuratedFoodLike,
  profile: typeof NORMALIZED_PROFILES[number],
): { strength: number; preferredBrandScore: number; preferredSourceMatch: boolean } {
  const localId = getLocalId(food);
  const normalizedName = normalizeFoodSearchText(food.name);
  const preferredBrandScore = getPreferredBrandScore(food, profile.preferredBrands || []);
  const preferredSourceMatch = Boolean(
    food.source && profile.preferredSources?.includes(food.source)
  );

  let strength = 0;

  if (profile.localIds?.includes(localId)) {
    strength = Math.max(strength, 1);
  }

  strength = Math.max(
    strength,
    getTokenCoverageScore(normalizedName, profile.nameTerms),
    getBestAliasMatchScore(normalizedName, profile.aliases) * 0.9,
  );

  if (preferredBrandScore > 0) {
    strength = Math.max(strength, 0.86);
  }

  return { strength, preferredBrandScore, preferredSourceMatch };
}

export function normalizeFoodSearchText(value: string = ''): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function expandCommonFoodAbbreviations(value: string = ''): string {
  const words = normalizeFoodSearchText(value).split(' ').filter(Boolean);
  if (words.length === 0) {
    return '';
  }

  return words
    .map((word) => COMMON_FOOD_ABBREVIATIONS[word] || word)
    .join(' ');
}

export function getCuratedSearchAdjustment(
  query: string,
  food: CuratedFoodLike,
): CuratedSearchAdjustment {
  const normalizedQuery = normalizeFoodSearchText(query);
  if (!normalizedQuery || !food?.name) {
    return { profileId: null, rankingBoost: 0, trustBoost: 0 };
  }

  let bestAdjustment: CuratedSearchAdjustment = {
    profileId: null,
    rankingBoost: 0,
    trustBoost: 0,
  };

  NORMALIZED_PROFILES.forEach((profile) => {
    const queryStrength = getQueryMatchStrength(normalizedQuery, profile);
    if (queryStrength < 0.48) {
      return;
    }

    const { strength, preferredBrandScore, preferredSourceMatch } = getProductMatchStrength(food, profile);
    if (strength < 0.5) {
      return;
    }

    const sourceMultiplier = preferredSourceMatch ? 1.08 : 0.94;
    const brandMultiplier = preferredBrandScore > 0 ? 1.12 : 1;
    const rankingBoost = Math.round(
      profile.rankingBoost * queryStrength * strength * sourceMultiplier * brandMultiplier
    );
    const trustBoost = Math.round(
      profile.trustBoost * strength * (preferredSourceMatch ? 1 : 0.72)
    );

    if (
      rankingBoost > bestAdjustment.rankingBoost ||
      (
        rankingBoost === bestAdjustment.rankingBoost &&
        trustBoost > bestAdjustment.trustBoost
      )
    ) {
      bestAdjustment = {
        profileId: profile.id,
        rankingBoost: clamp(rankingBoost, 0, 42),
        trustBoost: clamp(trustBoost, 0, 16),
      };
    }
  });

  return bestAdjustment;
}

export function getCuratedLocalFoodBoost(query: string, food: CuratedFoodLike): number {
  return getCuratedSearchAdjustment(query, {
    ...food,
    source: 'local',
    barcode: food.barcode || (food.id ? `local-${food.id}` : undefined),
  }).rankingBoost;
}
