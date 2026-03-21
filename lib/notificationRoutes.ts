type NotificationRoute =
  | string
  | {
      pathname: string;
      params?: Record<string, string>;
    };

function toText(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function normalizeMealType(value: unknown): string | null {
  const raw = toText(value)?.toLowerCase();
  if (!raw) {
    return null;
  }

  let meal = raw.startsWith('meal-') ? raw.slice(5) : raw;
  if (meal === 'snack') {
    meal = 'snacks';
  }

  return ['breakfast', 'lunch', 'dinner', 'snacks'].includes(meal) ? meal : null;
}

export function getRouteForNotificationData(data: Record<string, unknown> | null | undefined): NotificationRoute | null {
  if (!data) {
    return null;
  }

  const type = toText(data.type);
  if (!type) {
    return null;
  }

  switch (type) {
    case 'activation-reminder': {
      const stage = toText(data.stage);
      if (stage === 'first_barcode') {
        return '/barcode';
      }

      if (stage === 'repeat_log') {
        return {
          pathname: '/(tabs)/add',
          params: { focus: 'recent', source: 'activation_reminder' },
        };
      }

      return {
        pathname: '/(tabs)/add',
        params: { source: 'activation_reminder' },
      };
    }
    case 'meal-reminder':
      return {
        pathname: '/(tabs)/add',
        params: {
          meal: normalizeMealType(data.meal) || 'breakfast',
          source: 'meal_reminder',
        },
      };
    case 'streak-warning':
      return {
        pathname: '/(tabs)/add',
        params: { focus: 'recent', source: 'streak_warning' },
      };
    case 'water-reminder':
      return '/water-tracker';
    case 'morning-briefing':
      return '/(tabs)';
    case 'fasting-alert':
      return '/(tabs)';
    case 'social-notification':
      return '/social-feed';
    default:
      return null;
  }
}

export default getRouteForNotificationData;
