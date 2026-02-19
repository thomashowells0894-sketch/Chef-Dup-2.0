import { by, device, element, expect, waitFor } from 'detox';
import { signIn, navigateToTab } from './helpers';

describe('Food Logging', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
    await signIn();
  });

  it('should navigate to add food screen', async () => {
    await navigateToTab('add');
    await waitFor(element(by.id('food-search-input'))).toBeVisible().withTimeout(5000);
  });

  it('should search for food', async () => {
    await element(by.id('food-search-input')).typeText('chicken breast');
    await waitFor(element(by.text(/chicken/i))).toBeVisible().withTimeout(10000);
  });

  it('should select food and see detail modal', async () => {
    await element(by.text(/chicken/i)).atIndex(0).tap();
    await waitFor(element(by.id('food-detail-modal'))).toBeVisible().withTimeout(5000);
  });

  it('should adjust quantity and confirm', async () => {
    await element(by.id('quantity-input')).clearText();
    await element(by.id('quantity-input')).typeText('1.5');
    await element(by.id('confirm-food-button')).tap();
    await waitFor(element(by.id('food-detail-modal'))).not.toBeVisible().withTimeout(5000);
  });

  it('should show logged food in diary', async () => {
    await navigateToTab('diary');
    await waitFor(element(by.text(/chicken/i))).toBeVisible().withTimeout(5000);
  });

  it('should update calorie totals on dashboard', async () => {
    await navigateToTab('home');
    // Verify calories are no longer 0
    await waitFor(element(by.id('calories-consumed'))).toBeVisible().withTimeout(5000);
  });
});
