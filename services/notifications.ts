import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const SETTINGS_KEY: string = '@fueliq_notification_settings';

// ============================================================================
// Frequency Capping (#14)
// ============================================================================

const FREQUENCY_CAP_KEY = '@fueliq_notification_frequency';
const MAX_NOTIFICATIONS_PER_DAY = 8;

async function checkFrequencyCap(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(FREQUENCY_CAP_KEY);
    const today = new Date().toISOString().split('T')[0];

    if (raw) {
      const data = JSON.parse(raw);
      if (data.date === today) {
        return data.count < MAX_NOTIFICATIONS_PER_DAY;
      }
    }
    return true;
  } catch {
    return true;
  }
}

async function incrementFrequencyCount(): Promise<void> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const raw = await AsyncStorage.getItem(FREQUENCY_CAP_KEY);
    let data = { date: today, count: 0 };

    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.date === today) {
        data = parsed;
      }
    }

    data.count++;
    await AsyncStorage.setItem(FREQUENCY_CAP_KEY, JSON.stringify(data));
  } catch {}
}

// ============================================================================
// Personalized Streak Messages (#12)
// ============================================================================

const STREAK_MESSAGES: Record<string, string[]> = {
  risk: [
    "Your {streak}-day streak is on the line! One quick log saves it",
    "{name}, don't let {streak} days of hard work disappear. Log now!",
    "92% of users who lose their streak never recover it. Save your {streak}-day run!",
  ],
  milestone_7: [
    "1 WEEK! {name}, you're officially in the habit zone!",
    "7 days straight! Only 12% of users make it this far. You're elite.",
  ],
  milestone_14: [
    "2 WEEKS! {name}, this is becoming your identity now",
    "14-day streak! The science says you've built a real habit.",
  ],
  milestone_30: [
    "30 DAYS! {name}, you're in the top 3% of all FuelIQ users",
    "One month of consistency! {name}, this is remarkable.",
  ],
  milestone_100: [
    "100 DAYS! {name}, you're a FuelIQ legend. This streak is unprecedented.",
  ],
};

function getPersonalizedStreakMessage(streak: number, name: string, type: 'risk' | 'celebration'): string {
  let key = 'risk';
  if (type === 'celebration') {
    if (streak >= 100) key = 'milestone_100';
    else if (streak >= 30) key = 'milestone_30';
    else if (streak >= 14) key = 'milestone_14';
    else if (streak >= 7) key = 'milestone_7';
    else return '';
  }

  const messages = STREAK_MESSAGES[key] || STREAK_MESSAGES.risk;
  const template = messages[Math.floor(Math.random() * messages.length)];
  return template.replace(/{streak}/g, String(streak)).replace(/{name}/g, name || 'Champion');
}

// ============================================================================
// Types
// ============================================================================

interface NotificationTime {
  hour: number;
  minute: number;
}

export interface NotificationSettings {
  mealReminders: boolean;
  waterReminders: boolean;
  fastingAlerts: boolean;
  streakWarnings: boolean;
  breakfastTime: NotificationTime;
  lunchTime: NotificationTime;
  dinnerTime: NotificationTime;
  waterInterval: number;
}

// Default notification settings
const DEFAULT_SETTINGS: NotificationSettings = {
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
const BREAKFAST_MESSAGES: string[] = [
  "Good morning! Time to fuel your day \u{1F305}",
  "Rise and shine! What's for breakfast? \u{2600}\u{FE0F}",
  "Morning! Your body needs fuel to crush today \u{1F4AA}",
  "Breakfast time! Start your day with something great \u{1F373}",
  "Good morning, champ! Don't skip the most important meal \u{1F31F}",
];

const LUNCH_MESSAGES: string[] = [
  "Lunchtime! Keep your energy up \u{1F96A}",
  "Midday fuel check! Time to eat \u{1F372}",
  "Lunch o'clock! What's on the menu? \u{1F37D}\u{FE0F}",
  "Power up! A good lunch keeps the afternoon strong \u{26A1}",
  "Half the day crushed! Refuel with a solid lunch \u{1F4AA}",
];

const DINNER_MESSAGES: string[] = [
  "Dinner time! You've earned a great meal today \u{1F37D}\u{FE0F}",
  "Time to wind down with a nourishing dinner \u{1F319}",
  "Evening fuel! Log your dinner and finish strong \u{2B50}",
  "Dinner's calling! What are you cooking tonight? \u{1F468}\u{200D}\u{1F373}",
  "Great day! Cap it off with a balanced dinner \u{1F957}",
];

const WATER_MESSAGES: string[] = [
  "Stay hydrated! You're doing great \u{1F4A7}",
  "Water break! Your body will thank you \u{1F4A6}",
  "Hydration check! Have you had enough water? \u{1F30A}",
  "Drink up! Staying hydrated keeps you sharp \u{1F4A7}",
  "Time for water! Keep that hydration streak going \u{1F3C6}",
];

/**
 * Pick a random message from an array
 */
function randomMessage(messages: string[]): string {
  return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * Configure the default notification handler and categories.
 * Call this once at app startup (e.g. in _layout).
 */
export function configureNotifications(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  // Set notification categories for actionable notifications (not available on web)
  if (Platform.OS !== 'web') {
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

    Notifications.setNotificationCategoryAsync('morning-briefing', [
      {
        identifier: 'VIEW_BRIEFING',
        buttonTitle: 'View Plan',
        options: { opensAppToForeground: true },
      },
      {
        identifier: 'DISMISS',
        buttonTitle: 'Later',
        options: { isDestructive: true },
      },
    ]);

    Notifications.setNotificationCategoryAsync('social-notification', [
      {
        identifier: 'VIEW',
        buttonTitle: 'View',
        options: { opensAppToForeground: true },
      },
      {
        identifier: 'DISMISS',
        buttonTitle: 'Dismiss',
        options: { isDestructive: true },
      },
    ]);
  }
}

/**
 * Request notification permissions from the user.
 * @returns Whether permission was granted
 */
export async function requestPermissions(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();

    if (existingStatus === 'granted') {
      return true;
    }

    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch (error: unknown) {
    if (__DEV__) console.error('Failed to request notification permissions:', error);
    return false;
  }
}

/**
 * Load notification settings from AsyncStorage.
 * Returns DEFAULT_SETTINGS if nothing is saved.
 */
export async function getNotificationSettings(): Promise<NotificationSettings> {
  try {
    const saved = await AsyncStorage.getItem(SETTINGS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<NotificationSettings>;
      // Merge with defaults so new settings keys are always present
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
    return { ...DEFAULT_SETTINGS };
  } catch (error: unknown) {
    if (__DEV__) console.error('Failed to load notification settings:', error);
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Save notification settings to AsyncStorage.
 */
export async function saveNotificationSettings(settings: NotificationSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error: unknown) {
    if (__DEV__) console.error('Failed to save notification settings:', error);
  }
}

interface MealReminderConfig {
  identifier: string;
  time: NotificationTime;
  title: string;
  body: string;
}

/**
 * Cancel all currently-scheduled meal reminders by identifier prefix,
 * then schedule new daily recurring ones at the configured times.
 */
export async function scheduleMealReminders(settings: NotificationSettings): Promise<void> {
  if (!settings.mealReminders) return;

  const canSend = await checkFrequencyCap();
  if (!canSend) return;

  // Cancel existing meal reminders first
  await cancelByIdentifier('meal-breakfast');
  await cancelByIdentifier('meal-lunch');
  await cancelByIdentifier('meal-dinner');

  const meals: MealReminderConfig[] = [
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
        } as any,
      });
      await incrementFrequencyCount();
    } catch (error: unknown) {
      if (__DEV__) console.error(`Failed to schedule ${meal.identifier}:`, error);
    }
  }
}

/**
 * Schedule water reminders every N hours between 8am and 10pm.
 */
export async function scheduleWaterReminders(settings: NotificationSettings): Promise<void> {
  if (!settings.waterReminders) return;

  const canSend = await checkFrequencyCap();
  if (!canSend) return;

  // Cancel existing water reminders first
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notification of scheduled) {
    if (notification.identifier.startsWith('water-')) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }

  const startHour: number = 8;
  const endHour: number = 22; // 10pm
  const interval: number = settings.waterInterval || 2;
  let index: number = 0;

  for (let hour = startHour; hour <= endHour; hour += interval) {
    const wholeHour: number = Math.floor(hour);
    const minute: number = Math.round((hour - wholeHour) * 60);

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
        } as any,
      });
      await incrementFrequencyCount();
      index++;
    } catch (error: unknown) {
      if (__DEV__) console.error(`Failed to schedule water-${index}:`, error);
    }
  }
}

/**
 * Schedule a one-time notification for when a fast is complete.
 * @param endTime - The Date or timestamp when the fast ends
 */
export async function scheduleFastingAlert(endTime: Date | number): Promise<void> {
  try {
    const canSend = await checkFrequencyCap();
    if (!canSend) return;

    // Cancel any existing fasting alert
    await cancelByIdentifier('fasting-complete');

    const triggerDate: Date = endTime instanceof Date ? endTime : new Date(endTime);

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
      } as any,
    });
    await incrementFrequencyCount();
  } catch (error: unknown) {
    if (__DEV__) console.error('Failed to schedule fasting alert:', error);
  }
}

/**
 * Schedule a streak warning notification at 9pm if the user
 * hasn't logged food today. Uses personalized copy based on streak data (#12).
 * identifier: 'streak-warning'
 */
export async function scheduleStreakWarning(streakDays?: number, userName?: string): Promise<void> {
  try {
    const canSend = await checkFrequencyCap();
    if (!canSend) return;

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

    // Use personalized streak message if streak data is available
    let body = "Don't break your streak! Log something before midnight \u{1F525}";
    let title = 'Streak Alert!';

    if (streakDays && streakDays > 0) {
      const personalizedBody = getPersonalizedStreakMessage(
        streakDays,
        userName || 'Champion',
        'risk'
      );
      if (personalizedBody) {
        body = personalizedBody;
      }

      // Also check for celebration messages at milestones
      const celebrationBody = getPersonalizedStreakMessage(
        streakDays,
        userName || 'Champion',
        'celebration'
      );
      if (celebrationBody) {
        title = 'Streak Milestone!';
        body = celebrationBody;
      }
    }

    await Notifications.scheduleNotificationAsync({
      identifier: 'streak-warning',
      content: {
        title,
        body,
        categoryIdentifier: 'streak-warning',
        data: { type: 'streak-warning', streakDays },
      },
      trigger: {
        type: 'date',
        date: triggerDate,
      } as any,
    });
    await incrementFrequencyCount();
  } catch (error: unknown) {
    if (__DEV__) console.error('Failed to schedule streak warning:', error);
  }
}

/**
 * Morning briefing messages -- personalized daily motivation
 */
const MORNING_BRIEFING_MESSAGES: string[] = [
  "Your personalized nutrition plan is ready for today",
  "New day, new goals. Let's crush it",
  "Your AI coach has today's game plan ready",
  "Rise and grind -- your nutrition targets are set",
  "Good morning! Check your daily briefing",
];

/**
 * Streak-aware morning briefing messages (#12)
 */
const STREAK_MORNING_MESSAGES: Record<string, string[]> = {
  low: [
    "Day {streak} -- keep the momentum going! Your plan is ready",
    "Your {streak}-day streak is growing. Here's today's game plan",
  ],
  medium: [
    "{streak} days strong! Your AI coach has something special today",
    "Day {streak} of your streak. You're building something incredible",
  ],
  high: [
    "{streak}-day streak! You're in elite territory. Today's plan is ready",
    "Day {streak}! Less than 5% of users reach this. Let's keep it going",
  ],
  legendary: [
    "Day {streak}. Legendary status. Your personalized plan awaits",
    "{streak} days. Unstoppable. Here's today's blueprint",
  ],
};

/**
 * Schedule a daily morning briefing notification at 7:30am.
 * This drives users back into the app first thing in the morning.
 * Now includes streak-aware personalized copy (#12).
 */
export async function scheduleMorningBriefing(streakDays?: number, userName?: string): Promise<void> {
  try {
    const canSend = await checkFrequencyCap();
    if (!canSend) return;

    await cancelByIdentifier('morning-briefing');

    let body = randomMessage(MORNING_BRIEFING_MESSAGES);
    let title = 'Good Morning \u{2600}\u{FE0F}';

    if (streakDays && streakDays > 0) {
      let tierKey = 'low';
      if (streakDays >= 100) tierKey = 'legendary';
      else if (streakDays >= 30) tierKey = 'high';
      else if (streakDays >= 7) tierKey = 'medium';

      const streakMessages = STREAK_MORNING_MESSAGES[tierKey];
      if (streakMessages && streakMessages.length > 0) {
        const template = streakMessages[Math.floor(Math.random() * streakMessages.length)];
        body = template
          .replace(/{streak}/g, String(streakDays))
          .replace(/{name}/g, userName || 'Champion');
      }

      if (streakDays >= 7) {
        title = `Good Morning, ${userName || 'Champion'}! \u{1F525}`;
      }
    }

    await Notifications.scheduleNotificationAsync({
      identifier: 'morning-briefing',
      content: {
        title,
        body,
        categoryIdentifier: 'morning-briefing',
        data: { type: 'morning-briefing', streakDays },
      },
      trigger: {
        type: 'daily',
        hour: 7,
        minute: 30,
      } as any,
    });
    await incrementFrequencyCount();
  } catch (error: unknown) {
    if (__DEV__) console.error('Failed to schedule morning briefing:', error);
  }
}

/**
 * Cancel all scheduled notifications.
 */
export async function cancelAllScheduled(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error: unknown) {
    if (__DEV__) console.error('Failed to cancel all notifications:', error);
  }
}

/**
 * Cancel a specific scheduled notification by its identifier.
 */
export async function cancelByIdentifier(identifier: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch (error: unknown) {
    // Silently ignore if the identifier doesn't exist
    if (__DEV__) console.warn(`Failed to cancel notification "${identifier}":`, error);
  }
}

/**
 * Master reschedule function: cancels everything and reschedules
 * meal + water reminders based on the provided settings.
 * Fasting alerts and streak warnings are one-time and handled separately.
 */
export async function rescheduleAll(
  settings: NotificationSettings,
  streakDays?: number,
  userName?: string
): Promise<void> {
  try {
    await cancelAllScheduled();
    await scheduleMealReminders(settings);
    await scheduleWaterReminders(settings);
    if (settings.streakWarnings) {
      await scheduleStreakWarning(streakDays, userName);
    }
    await scheduleMorningBriefing(streakDays, userName);
  } catch (error: unknown) {
    if (__DEV__) console.error('Failed to reschedule all notifications:', error);
  }
}

// ============================================================================
// Social Notifications
// ============================================================================

/**
 * Social notification types and their message templates.
 */
type SocialNotificationType =
  | 'friend_request_received'
  | 'friend_request_accepted'
  | 'post_reaction'
  | 'post_comment'
  | 'challenge_starting'
  | 'challenge_ending'
  | 'leaderboard_passed';

interface SocialNotificationData {
  /** Name of the user involved */
  userName?: string;
  /** Name of the challenge */
  challengeName?: string;
  /** Reaction emoji */
  reactionEmoji?: string;
  /** Post ID for navigation */
  postId?: string;
  /** Challenge ID for navigation */
  challengeId?: string;
  /** Rank info */
  rank?: number;
  /** Date of the event (for challenge start/end) */
  eventDate?: Date | number;
}

const SOCIAL_MESSAGES: Record<SocialNotificationType, (data: SocialNotificationData) => { title: string; body: string }> = {
  friend_request_received: (data) => ({
    title: 'New Friend Request \uD83D\uDC4B',
    body: `${data.userName || 'Someone'} wants to be your fitness buddy!`,
  }),
  friend_request_accepted: (data) => ({
    title: 'Friend Request Accepted \uD83C\uDF89',
    body: `${data.userName || 'Someone'} accepted your friend request! Time to motivate each other.`,
  }),
  post_reaction: (data) => ({
    title: `New Reaction ${data.reactionEmoji || '\uD83D\uDD25'}`,
    body: `${data.userName || 'Someone'} reacted to your post!`,
  }),
  post_comment: (data) => ({
    title: 'New Comment \uD83D\uDCAC',
    body: `${data.userName || 'Someone'} commented on your post.`,
  }),
  challenge_starting: (data) => ({
    title: 'Challenge Starting! \uD83C\uDFC1',
    body: `"${data.challengeName || 'A challenge'}" is about to begin. Get ready!`,
  }),
  challenge_ending: (data) => ({
    title: 'Challenge Ending Soon \u23F0',
    body: `"${data.challengeName || 'A challenge'}" ends soon. Make your final push!`,
  }),
  leaderboard_passed: (data) => ({
    title: 'Leaderboard Update \uD83D\uDCC8',
    body: `${data.userName || 'A friend'} just passed your position on the leaderboard! Time to step it up.`,
  }),
};

/**
 * Schedule a social notification.
 * Fires immediately unless an eventDate is provided (for challenge start/end).
 *
 * @param type - The social notification type
 * @param data - Data used to build the notification message
 */
export async function scheduleSocialNotification(
  type: SocialNotificationType,
  data: SocialNotificationData
): Promise<void> {
  try {
    const canSend = await checkFrequencyCap();
    if (!canSend) return;

    const messageBuilder = SOCIAL_MESSAGES[type];
    if (!messageBuilder) {
      if (__DEV__) console.warn(`[Notifications] Unknown social type: ${type}`);
      return;
    }

    const { title, body } = messageBuilder(data);
    const identifier = `social-${type}-${Date.now()}`;

    // Build the trigger: immediate (null) or scheduled to a specific date
    const hasEventDate = data.eventDate != null;
    const triggerDate = hasEventDate
      ? (data.eventDate instanceof Date ? data.eventDate : new Date(data.eventDate as number))
      : null;

    // Don't schedule if the event date is in the past
    if (triggerDate && triggerDate.getTime() <= Date.now()) {
      return;
    }

    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title,
        body,
        categoryIdentifier: 'social-notification',
        data: {
          type: `social-${type}`,
          postId: data.postId || null,
          challengeId: data.challengeId || null,
        },
      },
      trigger: triggerDate
        ? { type: 'date', date: triggerDate } as any
        : null,
    });
    await incrementFrequencyCount();
  } catch (error: unknown) {
    if (__DEV__) console.error(`[Notifications] Failed to schedule social notification (${type}):`, error);
  }
}

// ============================================================================
// Social Accountability Notifications (#15)
// ============================================================================

/**
 * Schedule an accountability notification when a friend logs activity.
 * Uses frequency capping to avoid notification fatigue.
 */
export async function scheduleAccountabilityCheck(friendName: string, friendStreak: number): Promise<void> {
  try {
    const canSend = await checkFrequencyCap();
    if (!canSend) return;

    await Notifications.scheduleNotificationAsync({
      identifier: `accountability-${Date.now()}`,
      content: {
        title: 'Friend Activity',
        body: `${friendName} just logged day ${friendStreak} of their streak! Don't fall behind.`,
        categoryIdentifier: 'social-notification',
        data: { type: 'accountability' },
      },
      trigger: null, // Immediate
    });
    await incrementFrequencyCount();
  } catch (error) {
    if (__DEV__) console.error('[Notifications] Accountability check failed:', error);
  }
}

export { DEFAULT_SETTINGS };
export type { SocialNotificationType, SocialNotificationData };
