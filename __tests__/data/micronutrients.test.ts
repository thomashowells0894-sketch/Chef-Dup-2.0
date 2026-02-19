/**
 * Tests for micronutrient data and related functions.
 *
 * The micronutrient data lives in lib/nutritionIntelligence.ts as MICRONUTRIENT_RDA.
 * These tests verify the integrity and correctness of the RDA database,
 * the getMicronutrientRDA function, and the gap analysis function.
 */

import {
  MICRONUTRIENT_RDA,
  getMicronutrientRDA,
  analyzeMicronutrientGaps,
} from '../../lib/nutritionIntelligence';

// =============================================================================
// getRDA returns correct values for male/female
// =============================================================================

describe('getRDA gender-specific values', () => {
  it('returns higher iron RDA for females than males', () => {
    const maleRDA = getMicronutrientRDA('male');
    const femaleRDA = getMicronutrientRDA('female');
    expect(femaleRDA.iron.recommended).toBeGreaterThan(maleRDA.iron.recommended);
  });

  it('returns higher fiber RDA for males than females', () => {
    const maleRDA = getMicronutrientRDA('male');
    const femaleRDA = getMicronutrientRDA('female');
    expect(maleRDA.fiber.recommended).toBeGreaterThan(femaleRDA.fiber.recommended);
  });

  it('returns equal vitamin D RDA for both genders', () => {
    const maleRDA = getMicronutrientRDA('male');
    const femaleRDA = getMicronutrientRDA('female');
    expect(maleRDA.vitaminD.recommended).toBe(femaleRDA.vitaminD.recommended);
  });

  it('returns equal calcium RDA for both genders', () => {
    const maleRDA = getMicronutrientRDA('male');
    const femaleRDA = getMicronutrientRDA('female');
    expect(maleRDA.calcium.recommended).toBe(femaleRDA.calcium.recommended);
  });

  it('returns equal B12 RDA for both genders', () => {
    const maleRDA = getMicronutrientRDA('male');
    const femaleRDA = getMicronutrientRDA('female');
    expect(maleRDA.vitaminB12.recommended).toBe(femaleRDA.vitaminB12.recommended);
  });

  it('returns higher vitamin C for males', () => {
    const maleRDA = getMicronutrientRDA('male');
    const femaleRDA = getMicronutrientRDA('female');
    expect(maleRDA.vitaminC.recommended).toBeGreaterThan(femaleRDA.vitaminC.recommended);
  });

  it('returns higher omega-3 for males', () => {
    const maleRDA = getMicronutrientRDA('male');
    const femaleRDA = getMicronutrientRDA('female');
    expect(maleRDA.omega3.recommended).toBeGreaterThan(femaleRDA.omega3.recommended);
  });
});

// =============================================================================
// getDeficiencyAlerts identifies correct severity levels
// =============================================================================

describe('deficiency severity levels', () => {
  it('marks zero intake as "deficient"', () => {
    const result = analyzeMicronutrientGaps({}, 'male');
    for (const gap of result.gaps) {
      expect(gap.status).toBe('deficient');
      expect(gap.percentage).toBe(0);
    }
  });

  it('marks 40% intake as "deficient"', () => {
    const rda = getMicronutrientRDA('male');
    const intake = { iron: rda.iron.recommended * 0.4 };
    const result = analyzeMicronutrientGaps(intake, 'male');
    const ironGap = result.gaps.find(g => g.key === 'iron');
    expect(ironGap).toBeDefined();
    expect(ironGap!.status).toBe('deficient');
    expect(ironGap!.percentage).toBeLessThan(50);
  });

  it('marks 60% intake as "low"', () => {
    const rda = getMicronutrientRDA('male');
    const intake = { iron: rda.iron.recommended * 0.6 };
    const result = analyzeMicronutrientGaps(intake, 'male');
    const ironGap = result.gaps.find(g => g.key === 'iron');
    expect(ironGap).toBeDefined();
    expect(ironGap!.status).toBe('low');
  });

  it('marks 95% intake as "adequate"', () => {
    const rda = getMicronutrientRDA('male');
    const intake = { iron: rda.iron.recommended * 0.95 };
    const result = analyzeMicronutrientGaps(intake, 'male');
    const ironEntry = result.adequate.find(g => g.key === 'iron');
    expect(ironEntry).toBeDefined();
    expect(ironEntry!.status).toBe('adequate');
  });

  it('marks 100%+ intake as "adequate"', () => {
    const rda = getMicronutrientRDA('male');
    const intake = { iron: rda.iron.recommended * 1.5 };
    const result = analyzeMicronutrientGaps(intake, 'male');
    const ironEntry = result.adequate.find(g => g.key === 'iron');
    expect(ironEntry).toBeDefined();
    expect(ironEntry!.status).toBe('adequate');
    expect(ironEntry!.percentage).toBeGreaterThan(100);
  });
});

// =============================================================================
// All nutrients have required fields
// =============================================================================

describe('nutrient data integrity', () => {
  it('every nutrient has a human-readable name', () => {
    for (const [key, nutrient] of Object.entries(MICRONUTRIENT_RDA)) {
      expect(nutrient.name).toBeTruthy();
      expect(nutrient.name.length).toBeGreaterThan(0);
    }
  });

  it('every nutrient has a unit', () => {
    for (const [key, nutrient] of Object.entries(MICRONUTRIENT_RDA)) {
      expect(nutrient.unit).toBeTruthy();
      expect(['mcg', 'mg', 'g']).toContain(nutrient.unit);
    }
  });

  it('every nutrient has positive male and female RDA values', () => {
    for (const [key, nutrient] of Object.entries(MICRONUTRIENT_RDA)) {
      expect(nutrient.male).toBeGreaterThan(0);
      expect(nutrient.female).toBeGreaterThan(0);
    }
  });

  it('upper limit is null or a positive number', () => {
    for (const [key, nutrient] of Object.entries(MICRONUTRIENT_RDA)) {
      if (nutrient.ul !== null) {
        expect(typeof nutrient.ul).toBe('number');
        expect(nutrient.ul).toBeGreaterThan(0);
      }
    }
  });

  it('nutrients without upper limits include certain vitamins', () => {
    expect(MICRONUTRIENT_RDA.vitaminK.ul).toBeNull();
    expect(MICRONUTRIENT_RDA.vitaminB1.ul).toBeNull();
    expect(MICRONUTRIENT_RDA.vitaminB2.ul).toBeNull();
    expect(MICRONUTRIENT_RDA.vitaminB12.ul).toBeNull();
    expect(MICRONUTRIENT_RDA.potassium.ul).toBeNull();
    expect(MICRONUTRIENT_RDA.fiber.ul).toBeNull();
    expect(MICRONUTRIENT_RDA.omega3.ul).toBeNull();
  });

  it('nutrients with upper limits include known ones', () => {
    expect(MICRONUTRIENT_RDA.vitaminA.ul).toBe(3000);
    expect(MICRONUTRIENT_RDA.vitaminC.ul).toBe(2000);
    expect(MICRONUTRIENT_RDA.vitaminD.ul).toBe(100);
    expect(MICRONUTRIENT_RDA.sodium.ul).toBe(2300);
    expect(MICRONUTRIENT_RDA.iron.ul).toBe(45);
    expect(MICRONUTRIENT_RDA.zinc.ul).toBe(40);
  });
});

// =============================================================================
// Upper limits are validated against RDA
// =============================================================================

describe('upper limit validation', () => {
  it('upper limit is greater than male RDA when defined (excluding magnesium supplement UL)', () => {
    for (const [key, nutrient] of Object.entries(MICRONUTRIENT_RDA)) {
      if (nutrient.ul !== null && key !== 'magnesium') {
        expect(nutrient.ul).toBeGreaterThanOrEqual(nutrient.male);
      }
    }
  });

  it('upper limit is greater than female RDA when defined (excluding magnesium supplement UL)', () => {
    for (const [key, nutrient] of Object.entries(MICRONUTRIENT_RDA)) {
      if (nutrient.ul !== null && key !== 'magnesium') {
        expect(nutrient.ul).toBeGreaterThanOrEqual(nutrient.female);
      }
    }
  });

  // Special note: magnesium UL (350mg from supplements) is less than male RDA (420mg)
  // This is because the UL for magnesium is specifically for supplemental magnesium,
  // not total dietary intake. This is a known exception.
  it('identifies magnesium UL exception (supplement-specific UL)', () => {
    const mag = MICRONUTRIENT_RDA.magnesium;
    // The UL of 350 is for supplemental magnesium only
    // Male RDA of 420 includes dietary sources
    expect(mag.ul).toBe(350);
    expect(mag.male).toBe(420);
  });
});

// =============================================================================
// Overall score calculation
// =============================================================================

describe('overall micronutrient score', () => {
  it('returns 0% score when all nutrients are deficient', () => {
    const result = analyzeMicronutrientGaps({}, 'male');
    expect(result.overallScore).toBe(0);
  });

  it('returns 100% score when all nutrients are adequate', () => {
    const rda = getMicronutrientRDA('male');
    const intake: Record<string, number> = {};
    for (const [key, nutrient] of Object.entries(rda)) {
      intake[key] = nutrient.recommended;
    }
    const result = analyzeMicronutrientGaps(intake, 'male');
    expect(result.overallScore).toBe(100);
  });

  it('returns intermediate score for mixed intake', () => {
    const rda = getMicronutrientRDA('male');
    const keys = Object.keys(rda);
    const intake: Record<string, number> = {};
    // Only meet half the nutrients
    keys.forEach((key, i) => {
      if (i % 2 === 0) intake[key] = rda[key].recommended;
    });
    const result = analyzeMicronutrientGaps(intake, 'male');
    expect(result.overallScore).toBeGreaterThan(0);
    expect(result.overallScore).toBeLessThan(100);
  });

  it('gaps are sorted by percentage ascending', () => {
    const intake = {
      iron: 2, // low %
      vitaminC: 80, // higher %
    };
    const result = analyzeMicronutrientGaps(intake, 'male');
    for (let i = 1; i < result.gaps.length; i++) {
      expect(result.gaps[i].percentage).toBeGreaterThanOrEqual(result.gaps[i - 1].percentage);
    }
  });

  it('each gap entry has consumed, recommended, unit, and percentage', () => {
    const result = analyzeMicronutrientGaps({ iron: 5 }, 'male');
    for (const gap of result.gaps) {
      expect(typeof gap.consumed).toBe('number');
      expect(typeof gap.recommended).toBe('number');
      expect(typeof gap.unit).toBe('string');
      expect(typeof gap.percentage).toBe('number');
      expect(typeof gap.nutrient).toBe('string');
      expect(typeof gap.key).toBe('string');
      expect(typeof gap.status).toBe('string');
    }
  });
});

// =============================================================================
// Specific nutrient RDA values
// =============================================================================

describe('specific RDA values', () => {
  it('vitamin A: male 900mcg, female 700mcg', () => {
    expect(MICRONUTRIENT_RDA.vitaminA.male).toBe(900);
    expect(MICRONUTRIENT_RDA.vitaminA.female).toBe(700);
    expect(MICRONUTRIENT_RDA.vitaminA.unit).toBe('mcg');
  });

  it('iron: male 8mg, female 18mg', () => {
    expect(MICRONUTRIENT_RDA.iron.male).toBe(8);
    expect(MICRONUTRIENT_RDA.iron.female).toBe(18);
    expect(MICRONUTRIENT_RDA.iron.unit).toBe('mg');
  });

  it('calcium: 1000mg for both genders', () => {
    expect(MICRONUTRIENT_RDA.calcium.male).toBe(1000);
    expect(MICRONUTRIENT_RDA.calcium.female).toBe(1000);
  });

  it('potassium: male 3400mg, female 2600mg', () => {
    expect(MICRONUTRIENT_RDA.potassium.male).toBe(3400);
    expect(MICRONUTRIENT_RDA.potassium.female).toBe(2600);
  });

  it('sodium: 1500mg for both, UL 2300mg', () => {
    expect(MICRONUTRIENT_RDA.sodium.male).toBe(1500);
    expect(MICRONUTRIENT_RDA.sodium.female).toBe(1500);
    expect(MICRONUTRIENT_RDA.sodium.ul).toBe(2300);
  });

  it('vitamin D: 15mcg for both, UL 100mcg', () => {
    expect(MICRONUTRIENT_RDA.vitaminD.male).toBe(15);
    expect(MICRONUTRIENT_RDA.vitaminD.female).toBe(15);
    expect(MICRONUTRIENT_RDA.vitaminD.ul).toBe(100);
  });
});
