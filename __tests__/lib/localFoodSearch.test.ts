import {
  expandCommonFoodAbbreviations,
  getCuratedSearchAdjustment,
} from '../../lib/foodSearchCurations';
import { searchLocalFoodDatabase } from '../../lib/localFoodSearch';

describe('food search curations', () => {
  it('expands common gym-food abbreviations', () => {
    expect(expandCommonFoodAbbreviations('chkn brst')).toBe('chicken breast');
    expect(expandCommonFoodAbbreviations('pb toast')).toBe('peanut butter toast');
  });

  it('assigns a meaningful curated boost for greek yogurt aliases', () => {
    const adjustment = getCuratedSearchAdjustment('protein yogurt', {
      name: 'Greek Yogurt',
      barcode: 'local-greek-yogurt',
      source: 'local',
    });

    expect(adjustment.profileId).toBe('greek-yogurt');
    expect(adjustment.rankingBoost).toBeGreaterThan(0);
    expect(adjustment.trustBoost).toBeGreaterThan(0);
  });
});

describe('searchLocalFoodDatabase', () => {
  it('surfaces greek yogurt for protein-yogurt style queries', () => {
    const results = searchLocalFoodDatabase('protein yogurt', 5);

    expect(results[0].name).toBe('Greek Yogurt');
    expect(results[0].qualityLabel).toBe('Top Pick');
  });

  it('surfaces chicken breast for abbreviated gym-food queries', () => {
    const results = searchLocalFoodDatabase('chkn brst', 5);

    expect(results[0].name).toBe('Chicken Breast');
  });
});
