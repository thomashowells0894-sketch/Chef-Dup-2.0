import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_SETTINGS,
  scheduleActivationReminder,
  scheduleMealReminders,
  scheduleSocialNotification,
  scheduleAccountabilityCheck,
} from '../../services/notifications';
import { formatLocalDateKey } from '../../lib/date';

const mockScheduleNotificationAsync = jest.fn();
const mockCancelScheduledNotificationAsync = jest.fn(() => Promise.resolve());
const mockGetAllScheduledNotificationsAsync = jest.fn(() => Promise.resolve([]));

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  setNotificationCategoryAsync: jest.fn(() => Promise.resolve()),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  scheduleNotificationAsync: (...args: unknown[]) => mockScheduleNotificationAsync(...args),
  cancelScheduledNotificationAsync: (...args: unknown[]) => mockCancelScheduledNotificationAsync(...args),
  getAllScheduledNotificationsAsync: (...args: unknown[]) => mockGetAllScheduledNotificationsAsync(...args),
  cancelAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve()),
}));

describe('notification scheduling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockScheduleNotificationAsync.mockResolvedValue(undefined);
    const today = formatLocalDateKey(new Date());
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === '@fueliq_notification_frequency') {
        return Promise.resolve(JSON.stringify({ date: today, count: 8 }));
      }
      return Promise.resolve(null);
    });
  });

  it('schedules recurring meal reminders even when the immediate notification cap is full', async () => {
    await scheduleMealReminders(DEFAULT_SETTINGS);

    expect(mockScheduleNotificationAsync).toHaveBeenCalledTimes(3);
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('schedules future-dated social notifications without consuming the immediate cap', async () => {
    await scheduleSocialNotification('challenge_starting', {
      challengeName: 'March Push',
      eventDate: Date.now() + 60_000,
    });

    expect(mockScheduleNotificationAsync).toHaveBeenCalledTimes(1);
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('still caps immediate accountability notifications', async () => {
    await scheduleAccountabilityCheck('Alex', 12);

    expect(mockScheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('tracks immediate social notifications against the daily cap', async () => {
    const today = formatLocalDateKey(new Date());
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === '@fueliq_notification_frequency') {
        return Promise.resolve(JSON.stringify({ date: today, count: 0 }));
      }
      return Promise.resolve(null);
    });

    await scheduleSocialNotification('post_comment', { userName: 'Alex' });

    expect(mockScheduleNotificationAsync).toHaveBeenCalledTimes(1);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      '@fueliq_notification_frequency',
      JSON.stringify({ date: today, count: 1 })
    );
  });

  it('applies the immediate cap against the local calendar day', async () => {
    const previousTZ = process.env.TZ;
    process.env.TZ = 'America/Los_Angeles';
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-08T07:30:00Z'));

    try {
      const today = formatLocalDateKey(new Date());
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key === '@fueliq_notification_frequency') {
          return Promise.resolve(JSON.stringify({ date: today, count: 8 }));
        }
        return Promise.resolve(null);
      });

      await scheduleAccountabilityCheck('Alex', 12);

      expect(mockScheduleNotificationAsync).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
      process.env.TZ = previousTZ;
    }
  });

  it('schedules a first-week activation reminder without consuming the immediate cap', async () => {
    await scheduleActivationReminder('repeat_log', 'Alex');

    expect(mockScheduleNotificationAsync).toHaveBeenCalledTimes(1);
    expect(mockCancelScheduledNotificationAsync).toHaveBeenCalledWith('activation-reminder');
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });
});
