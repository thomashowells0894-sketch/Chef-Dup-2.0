export interface SearchQualityRule {
  queryTerms: string[];
  preferredSources?: string[];
  preferredBrands?: string[];
  preferredNameTerms?: string[];
  boost: number;
}

export const QUERY_REWRITES: Record<string, string> = {
  'coke zero': 'coca cola zero sugar',
  'diet coke': 'coca cola light',
  yoghurt: 'yogurt',
  'greek yoghurt': 'greek yogurt',
  'protein yoghurt': 'greek yogurt',
  'protein yogurt': 'greek yogurt',
  skyr: 'greek yogurt',
  porridge: 'oatmeal',
  'overnight oats': 'oatmeal',
  whey: 'protein shake',
  'whey shake': 'protein shake',
  'protein drink': 'protein shake',
  'egg white': 'egg whites',
  'egg whites': 'egg whites',
  'jasmine rice': 'white rice',
  'basmati rice': 'white rice',
  'sweet potatoes': 'sweet potato',
  fries: 'french fries',
  crisps: 'potato chips',
  'pb toast': 'peanut butter toast',
  'maccies': 'mcdonalds',
  'mcds': 'mcdonalds',
};

export const SEARCH_QUALITY_RULES: SearchQualityRule[] = [
  {
    queryTerms: ['protein', 'bar'],
    preferredSources: ['local', 'usda', 'open_food_facts'],
    preferredBrands: ['quest', 'barebells', 'grenade', 'fulfil'],
    boost: 16,
  },
  {
    queryTerms: ['chicken', 'breast'],
    preferredSources: ['local', 'usda'],
    preferredNameTerms: ['chicken', 'breast'],
    boost: 14,
  },
  {
    queryTerms: ['greek', 'yogurt'],
    preferredSources: ['local', 'usda'],
    preferredNameTerms: ['greek', 'yogurt'],
    boost: 12,
  },
  {
    queryTerms: ['oatmeal'],
    preferredSources: ['local', 'usda'],
    preferredNameTerms: ['oatmeal'],
    boost: 12,
  },
  {
    queryTerms: ['banana'],
    preferredSources: ['local', 'usda'],
    preferredNameTerms: ['banana'],
    boost: 10,
  },
  {
    queryTerms: ['egg'],
    preferredSources: ['local', 'usda'],
    preferredNameTerms: ['egg'],
    boost: 10,
  },
  {
    queryTerms: ['mcdonalds'],
    preferredSources: ['restaurant', 'nutritionix'],
    preferredBrands: ['mcdonalds'],
    boost: 22,
  },
  {
    queryTerms: ['starbucks'],
    preferredSources: ['restaurant', 'nutritionix'],
    preferredBrands: ['starbucks'],
    boost: 20,
  },
  {
    queryTerms: ['subway'],
    preferredSources: ['restaurant', 'nutritionix'],
    preferredBrands: ['subway'],
    boost: 20,
  },
  {
    queryTerms: ['greggs'],
    preferredSources: ['restaurant', 'nutritionix'],
    preferredBrands: ['greggs'],
    boost: 20,
  },
];
