import { by, device, element, expect, waitFor } from 'detox';

export const TEST_USER = {
  email: 'e2e-test@fueliq.app',
  password: 'TestPass123!',
};

export async function signIn() {
  await waitFor(element(by.text('Sign In'))).toBeVisible().withTimeout(10000);
  await element(by.id('email-input')).typeText(TEST_USER.email);
  await element(by.id('password-input')).typeText(TEST_USER.password);
  await element(by.id('sign-in-button')).tap();
  await waitFor(element(by.id('dashboard-screen'))).toBeVisible().withTimeout(15000);
}

export async function signOut() {
  await element(by.id('profile-tab')).tap();
  await waitFor(element(by.text('Sign Out'))).toBeVisible().withTimeout(5000);
  await element(by.text('Sign Out')).tap();
  await waitFor(element(by.text('Sign In'))).toBeVisible().withTimeout(10000);
}

export async function navigateToTab(tabName: string) {
  await element(by.id(`${tabName}-tab`)).tap();
  await waitFor(element(by.id(`${tabName}-screen`))).toBeVisible().withTimeout(5000);
}

export async function dismissAlert() {
  try {
    await element(by.text('OK')).tap();
  } catch {
    // No alert to dismiss
  }
}
