import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = '@vibefit_notification_settings';

// Default notification settings
const DEFAULT_SETTINGS = {
  mealReminders: true,
  waterReminders: true,
  fastingAlerts: true,
  streakWarnings: true,
  // Meal reminder times (24h format)
  breakfastTime: { hour: 8, minute: 0 },
  lunchTime: { hour: 12, minute: 30 },
  dinnerTime: { hour: 18, minute: 30 },
  // Water reminder interval in hours
  waterInterval: 2,
};

// Motivating meal reminder messages
const BREAKFAST_MESSAGES = [
  "Good morning! Time to fuel your day \u{1F305}",
  "Rise and shine! What's for breakfast? \u{2600}\u{FE0F}",
  "Morning! Your body needs fuel to crush today \u{1F4AA}",
  "Breakfast time! Start your day with something great \u{1F373}",
  "Good morning, champ! Don't skip the most important meal \u{1F31F}",
];

const LUNCH_MESSAGES = [
  "Lunchtime! Keep your energy up \u{1F96A}",
  "Midday fuel check! Time to eat \u{1F372}",
  "Lunch o'clock! What's on the menu? \u{1F37D}\u{FE0F}",
  "Power up! A good lunch keeps the afternoon strong \u{26A1}",
  "Half the day crushed! Refuel with a solid lunch \u{1F4AA}",
];

const DINNER_MESSAGES = [
  "Dinner time! You've earned a great meal today \u{1F37D}\u{FE0F}",
  "Time to wind down with a nourishing dinner \u{1F319}",
  "Evening fuel! Log your dinner and finish strong \u{2B50}",
  "Dinner's calling! What are you cooking tonight? \u{1F468}\u{200D}\u{1F373}",
  "Great day! Cap it off with a balanced dinner \u{1F957}",
];

const WATER_MESSAGES = [
  "Stay hydrated! You're doing great \u{1F4A7}",
  "Water break! Your body will thank you \u{1F4A6}",
  "Hydration check! Have you had enough water? \u{1F30A}",
  "Drink up! Staying hydrated keeps you sharp \u{1F4A7}",
  "Time for water! Keep that hydration streak going \u{1F3C6}",
];

/**
 * Pick a random message from an array
 */
function randomMessage(messages) {
  return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * Configure the default notification handler and categories.
 * Call this once at app startup (e.g. in _layout).
 */
export function configureNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  // Set notification categories for actionable notifications
  Notifications.setNotificationCategoryAsync('meal-reminder', [
    {
      identifier: 'LOG_MEAL',
      buttonTitle: 'Log Meal',
      options: { opensAppToForeground: true },
    },
    {
      identifier: 'DISMISS',
      buttonTitle: 'Dismiss',
      options: { isDestructive: true },
    },
  ]);

  Notifications.setNotificationCategoryAsync('water-reminder', [
    {
      identifier: 'LOG_WATER',
      buttonTitle: 'Log Water',
      options: { opensAppToForeground: true },
    },
    {
      identifier: 'DISMISS',
      buttonTitle: 'Dismiss',
      options: { isDestructive: true },
    },
  ]);

  Notifications.setNotificationCategoryAsync('streak-warning', [
    {
      identifier: 'LOG_FOOD',
      buttonTitle: 'Log Now',
      options: { opensAppToForeground: true },
    },
  ]);

  Notifications.setNotificationCategoryAsync('fasting-alert', [
    {
      identifier: 'VIEW_FAST',
      buttonTitle: 'View Fast',
      options: { opensAppToForeground: true },
    },
  ]);
}

/**
 * Request notification permissions from the user.
 * @returns {Promise<boolean>} Whether permission was granted
 */
export async function requestPermissions() {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();

    if (existingStatus === 'granted') {
      return true;
    }

    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    if (__DEV__) console.error('Failed to request notification permissions:', error);
    return false;
  }
}

/**
 * Load notification settings from AsyncStorage.
 * Returns DEFAULT_SETTINGS if nothing is saved.
 * @returns {Promise<object>}
 */
export async function getNotificationSettings() {
  try {
    const saved = await AsyncStorage.getItem(SETTINGS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Merge with defaults so new settings keys are always present
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
    return { ...DEFAULT_SETTINGS };
  } catch (error) {
    if (__DEV__) console.error('Failed to load notification settings:', error);
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Save notification settings to AsyncStorage.
 * @param {object} settings
 * @returns {Promise<void>}
 */
export async function saveNotificationSettings(settings) {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    if (__DEV__) console.error('Failed to save notification settings:', error);
  }
}

/**
 * Cancel all currently-scheduled meal reminders by identifier prefix,
 * then schedule new daily recurring ones at the configured times.
 * @param {object} settings - Notification settings object
 */
export async function scheduleMealReminders(settings) {
  if (!settings.mealReminders) return;

  // Cancel existing meal reminders first
  await cancelByIdentifier('meal-breakfast');
  await cancelByIdentifier('meal-lunch');
  await cancelByIdentifier('meal-dinner');

  const meals = [
    {
      identifier: 'meal-breakfast',
      time: settings.breakfastTime,
      title: 'Breakfast Reminder',
      body: randomMessage(BREAKFAST_MESSAGES),
    },
    {
      identifier: 'meal-lunch',
      time: settings.lunchTime,
      title: 'Lunch Reminder',
      body: randomMessage(LUNCH_MESSAGES),
    },
    {
      identifier: 'meal-dinner',
      time: settings.dinnerTime,
      title: 'Dinner Reminder',
      body: randomMessage(DINNER_MESSAGES),
    },
  ];

  for (const meal of meals) {
    try {
      await Notifications.scheduleNotificationAsync({
        identifier: meal.identifier,
        content: {
          title: meal.title,
          body: meal.body,
          categoryIdentifier: 'meal-reminder',
          data: { type: 'meal-reminder', meal: meal.identifier },
        },
        trigger: {
          type: 'daily',
          hour: meal.time.hour,
          minute: meal.time.minute,
        },
      });
    } catch (error) {
      if (__DEV__) console.error(`Failed to schedule ${meal.identifier}:`, error);
    }
  }
}

/**
 * Schedule water reminders every N hours between 8am and 10pm.
 * @param {object} settings - Notification settings object
 */
export async function scheduleWaterReminders(settings) {
  if (!settings.waterReminders) return;

  // Cancel existing water reminders first
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notification of scheduled) {
    if (notification.identifier.startsWith('water-')) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }

  const startHour = 8;
  const endHour = 22; // 10pm
  const interval = settings.waterInterval || 2;
  let index = 0;

  for (let hour = startHour; hour <= endHour; hour += interval) {
    const wholeHour = Math.floor(hour);
    const minute = Math.round((hour - wholeHour) * 60);

    try {
      await Notifications.scheduleNotificationAsync({
        identifier: `water-${index}`,
        content: {
          title: 'Hydration Reminder',
          body: randomMessage(WATER_MESSAGES),
          categoryIdentifier: 'water-reminder',
          data: { type: 'water-reminder' },
        },
        trigger: {
          type: 'daily',
          hour: wholeHour,
          minute,
        },
      });
      index++;
    } catch (error) {
      if (__DEV__) console.error(`Failed to schedule water-${index}:`, error);
    }
  }
}

/**
 * Schedule a one-time notification for when a fast is complete.
 * @param {Date|number} endTime - The Date or timestamp when the fast ends
 */
export async function scheduleFastingAlert(endTime) {
  try {
    // Cancel any existing fasting alert
    await cancelByIdentifier('fasting-complete');

    const triggerDate = endTime instanceof Date ? endTime : new Date(endTime);

    // Don't schedule if the end time is in the past
    if (triggerDate.getTime() <= Date.now()) {
      return;
    }

    await Notifications.scheduleNotificationAsync({
      identifier: 'fasting-complete',
      content: {
        title: 'Fast Complete! \u{1F389}',
        body: "You crushed your fast! Amazing discipline \u{1F4AA}\u{1F525}",
        categoryIdentifier: 'fasting-alert',
        data: { type: 'fasting-alert' },
      },
      trigger: {
        type: 'date',
        date: triggerDate,
      },
    });
  } catch (error) {
    if (__DEV__) console.error('Failed to schedule fasting alert:', error);
  }
}

/**
 * Schedule a streak warning notification at 9pm if the user
 * hasn't logged food today.
 * identifier: 'streak-warning'
 */
export async function scheduleStreakWarning() {
  try {
    // Cancel any existing streak warning
    await cancelByIdentifier('streak-warning');

    // Schedule for today at 9pm
    const now = new Date();
    const triggerDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      21, // 9pm
      0,
      0
    );

    // If it's already past 9pm today, schedule for tomorrow
    if (triggerDate.getTime() <= Date.now()) {
      triggerDate.setDate(triggerDate.getDate() + 1);
    }

    await Notifications.scheduleNotificationAsync({
      identifier: 'streak-warning',
      content: {
        title: 'Streak Alert!',
        body: "Don't break your streak! Log something before midnight \u{1F525}",
        categoryIdentifier: 'streak-warning',
        data: { type: 'streak-warning' },
      },
      trigger: {
        type: 'date',
        date: triggerDate,
      },
    });
  } catch (error) {
    if (__DEV__) console.error('Failed to schedule streak warning:', error);
  }
}

/**
 * Cancel all scheduled notifications.
 */
export async function cancelAllScheduled() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    if (__DEV__) console.error('Failed to cancel all notifications:', error);
  }
}

/**
 * Cancel a specific scheduled notification by its identifier.
 * @param {string} identifier
 */
export async function cancelByIdentifier(identifier) {
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch (error) {
    // Silently ignore if the identifier doesn't exist
    if (__DEV__) console.warn(`Failed to cancel notification "${identifier}":`, error);
  }
}

/**
 * Master reschedule function: cancels everything and reschedules
 * meal + water reminders based on the provided settings.
 * Fasting alerts and streak warnings are one-time and handled separately.
 * @param {object} settings - Notification settings object
 */
export async function rescheduleAll(settings) {
  try {
    await cancelAllScheduled();
    await scheduleMealReminders(settings);
    await scheduleWaterReminders(settings);
    if (settings.streakWarnings) {
      await scheduleStreakWarning();
    }
  } catch (error) {
    if (__DEV__) console.error('Failed to reschedule all notifications:', error);
  }
}

export { DEFAULT_SETTINGS };
