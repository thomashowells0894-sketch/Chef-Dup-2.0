import { shouldAllowDeferredStartupPrompts } from '../../lib/startupExperience';

describe('startupExperience', () => {
  it('blocks deferred prompts before the startup delay elapses', () => {
    expect(shouldAllowDeferredStartupPrompts({
      hasUser: true,
      delayElapsed: false,
      activationStage: 'complete',
      foodLogCount: 8,
      hasCompletedOnboarding: true,
      profileHydrationState: 'complete',
    })).toBe(false);
  });

  it('blocks deferred prompts for first-meal users before first value', () => {
    expect(shouldAllowDeferredStartupPrompts({
      hasUser: true,
      delayElapsed: true,
      activationStage: 'first_meal',
      foodLogCount: 0,
      hasCompletedOnboarding: false,
      profileHydrationState: 'incomplete',
    })).toBe(false);
  });

  it('allows deferred prompts for returning activated users once the delay passes', () => {
    expect(shouldAllowDeferredStartupPrompts({
      hasUser: true,
      delayElapsed: true,
      activationStage: 'first_meal',
      foodLogCount: 0,
      hasCompletedOnboarding: true,
      profileHydrationState: 'complete',
    })).toBe(true);
  });

  it('allows deferred prompts after the first successful log', () => {
    expect(shouldAllowDeferredStartupPrompts({
      hasUser: true,
      delayElapsed: true,
      activationStage: 'first_meal',
      foodLogCount: 1,
      hasCompletedOnboarding: false,
      profileHydrationState: 'incomplete',
    })).toBe(true);
  });
});
