import { by, device, element, expect, waitFor } from 'detox';
import { launchWithUrl } from './helpers';

describe('Deep Links', () => {
  beforeEach(async () => {
    await device.terminateApp();
  });

  it('should open invalid password recovery links inside the app', async () => {
    await launchWithUrl('fueliq://update-password?type=magiclink');

    await waitFor(element(by.id('update-password-screen'))).toBeVisible().withTimeout(10000);
    await expect(element(by.id('password-reset-invalid-state'))).toBeVisible();
  });
});
