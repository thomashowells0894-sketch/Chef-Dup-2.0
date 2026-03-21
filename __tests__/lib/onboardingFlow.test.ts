import {
  ONBOARDING_STEP_COUNT,
  buildStarterPlan,
  canContinueOnboardingStep,
  sanitizeDecimalInput,
  sanitizeIntegerInput,
} from '../../lib/onboardingFlow';

describe('onboardingFlow', () => {
  it('cuts onboarding down to a three-step essentials flow', () => {
    expect(ONBOARDING_STEP_COUNT).toBe(3);

    expect(
      canContinueOnboardingStep(1, {
        goal: null,
      })
    ).toBe(false);

    expect(
      canContinueOnboardingStep(1, {
        goal: 'lose',
      })
    ).toBe(true);

    expect(
      canContinueOnboardingStep(2, {
        ageStr: '29',
        weightRaw: '180',
        heightUnit: 'ft',
        heightFt: '5',
      })
    ).toBe(true);

    expect(
      canContinueOnboardingStep(2, {
        ageStr: '12',
        weightRaw: '180',
        heightUnit: 'ft',
        heightFt: '5',
      })
    ).toBe(false);
  });

  it('builds starter targets from the minimal profile and marks extra setup as deferred', () => {
    const plan = buildStarterPlan({
      goal: 'build',
      gender: 'male',
      ageStr: '31',
      heightUnit: 'ft',
      heightFt: '5',
      heightIn: '11',
      weightRaw: '182.4',
      goalWeightRaw: '190',
      activityLevel: 'active',
      enableMealReminders: true,
      enableWorkoutReminders: true,
      enableStreakWarnings: true,
      enableAI: true,
      waterGoal: 3000,
    });

    expect(plan.calories).toBeGreaterThan(2000);
    expect(plan.macros.protein).toBeGreaterThan(150);
    expect(plan.profileUpdates.weeklyGoal).toBe('gain05');
    expect(plan.profileUpdates.macroPreset).toBe('highProtein');
    expect(plan.profileUpdates.goalWeight).toBeCloseTo(190, 1);
    expect(plan.onboardingData).toEqual(
      expect.objectContaining({
        goal: 'build',
        activityLevel: 'active',
        deferredSetup: true,
        setupVersion: 'streamlined-v1',
        waterGoal: 3000,
      })
    );
  });

  it('sanitizes numeric onboarding inputs for stable mobile entry', () => {
    expect(sanitizeIntegerInput('2a9!', 3)).toBe('29');
    expect(sanitizeDecimalInput('182..45lbs')).toBe('182.4');
  });
});
