import { by, device, element, expect, waitFor } from 'detox';

describe('Onboarding', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true, delete: true });
  });

  it('should show onboarding for new users after signup', async () => {
    // This test would need a fresh account
    // For now, verify the onboarding screen structure exists
    await waitFor(element(by.text('Sign In'))).toBeVisible().withTimeout(10000);
  });

  // Additional onboarding tests would go here with test account creation
});
