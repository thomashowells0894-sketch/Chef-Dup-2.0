import { by, device, element, expect, waitFor } from 'detox';
import { TEST_USER, signIn, signOut } from './helpers';

describe('Authentication', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should show auth screen on first launch', async () => {
    await waitFor(element(by.text('Sign In'))).toBeVisible().withTimeout(10000);
  });

  it('should show error for invalid credentials', async () => {
    await element(by.id('email-input')).typeText('invalid@test.com');
    await element(by.id('password-input')).typeText('wrong');
    await element(by.id('sign-in-button')).tap();
    await waitFor(element(by.text('Error'))).toBeVisible().withTimeout(5000);
  });

  it('should sign in with valid credentials', async () => {
    await signIn();
    await expect(element(by.id('dashboard-screen'))).toBeVisible();
  });

  it('should sign out successfully', async () => {
    await signIn();
    await signOut();
    await expect(element(by.text('Sign In'))).toBeVisible();
  });

  it('should enforce password requirements on sign up', async () => {
    await element(by.text('Create Account')).tap();
    await element(by.id('email-input')).typeText('newuser@test.com');
    await element(by.id('password-input')).typeText('weak');
    await element(by.id('sign-up-button')).tap();
    await waitFor(element(by.text(/password/i))).toBeVisible().withTimeout(5000);
  });
});
