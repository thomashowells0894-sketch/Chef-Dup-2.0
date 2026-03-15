import { getRouteForNotificationData } from '../../lib/notificationRoutes';

describe('notificationRoutes', () => {
  it('routes activation barcode reminders into the scanner', () => {
    expect(
      getRouteForNotificationData({ type: 'activation-reminder', stage: 'first_barcode' })
    ).toBe('/barcode');
  });

  it('routes repeat-log reminders into recents', () => {
    expect(
      getRouteForNotificationData({ type: 'activation-reminder', stage: 'repeat_log' })
    ).toEqual({
      pathname: '/(tabs)/add',
      params: { focus: 'recent', source: 'activation_reminder' },
    });
  });

  it('routes meal reminders into the add screen with the intended meal', () => {
    expect(
      getRouteForNotificationData({ type: 'meal-reminder', meal: 'dinner' })
    ).toEqual({
      pathname: '/(tabs)/add',
      params: { meal: 'dinner', source: 'meal_reminder' },
    });
  });
});
