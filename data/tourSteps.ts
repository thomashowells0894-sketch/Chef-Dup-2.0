interface TourStep {
  title: string;
  description: string;
  emoji: string;
  color: string;
}

export const DASHBOARD_TOUR: TourStep[] = [
  {
    title: 'Today shows what matters now',
    description: 'Open FuelIQ and see your calories, protein, water, movement, and the single next action for today.',
    emoji: '\ud83d\udc4b',
    color: '#00D4FF',
  },
  {
    title: 'Log fast',
    description: 'Use Log for search, barcode, and repeat foods so meals are captured in seconds.',
    emoji: '\ud83d\udcf8',
    color: '#FF6B35',
  },
  {
    title: 'Trust the target',
    description: 'Your calorie and protein targets stay visible all day, so you always know where you stand.',
    emoji: '\ud83c\udfaf',
    color: '#00E676',
  },
  {
    title: 'Go deeper only when you want to',
    description: 'Advanced coaching, trends, and recovery live behind secondary entry points instead of cluttering the home screen.',
    emoji: '\ud83d\udee0\ufe0f',
    color: '#A78BFA',
  },
  {
    title: 'Start with your first meal',
    description: 'The fastest way to feel the product is simple: log food, check today, repeat.',
    emoji: '\ud83d\ude80',
    color: '#00E676',
  },
];

export const WHATS_NEW_STEPS: TourStep[] = [
  {
    title: 'What\'s New',
    description: 'We\'ve added tons of new features to help you reach your goals faster.',
    emoji: '\u2728',
    color: '#00D4FF',
  },
  {
    title: 'Workout Templates',
    description: 'Save your favorite workouts and reuse them anytime.',
    emoji: '\ud83d\udccb',
    color: '#FF6B35',
  },
  {
    title: 'Sleep & Recovery',
    description: 'Track sleep quality and muscle recovery for optimal training.',
    emoji: '\ud83d\ude34',
    color: '#A78BFA',
  },
  {
    title: 'Breathing Exercises',
    description: 'Guided breathing sessions for stress relief and focus.',
    emoji: '\ud83c\udf2c\ufe0f',
    color: '#6495ED',
  },
  {
    title: 'Habit Tracker',
    description: 'Build custom daily habits with streaks and weekly grids.',
    emoji: '\u2705',
    color: '#00E676',
  },
  {
    title: 'Social Sharing',
    description: 'Share beautiful progress cards with friends and on social media.',
    emoji: '\ud83d\udce4',
    color: '#FFB300',
  },
];

export type { TourStep };
