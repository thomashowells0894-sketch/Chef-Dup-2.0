interface TourStep {
  title: string;
  description: string;
  emoji: string;
  color: string;
}

export const DASHBOARD_TOUR: TourStep[] = [
  {
    title: 'Welcome to FuelIQ!',
    description: 'Your AI-powered fitness companion. Let me show you around.',
    emoji: '\ud83d\udc4b',
    color: '#00D4FF',
  },
  {
    title: 'AI Food Scanner',
    description: 'Point your camera at any food and AI instantly logs it with accurate macros.',
    emoji: '\ud83d\udcf8',
    color: '#FF6B35',
  },
  {
    title: 'Smart Meal Planning',
    description: 'AI generates personalized meal plans based on your goals and preferences.',
    emoji: '\ud83c\udf7d\ufe0f',
    color: '#00E676',
  },
  {
    title: 'AI Workout Generator',
    description: 'Get custom workouts tailored to your fitness level and goals.',
    emoji: '\ud83d\udcaa',
    color: '#A78BFA',
  },
  {
    title: 'Track Everything',
    description: 'Weight, sleep, water, supplements, habits, fasting - all in one place.',
    emoji: '\ud83d\udcca',
    color: '#FFB300',
  },
  {
    title: 'Daily Challenges & Achievements',
    description: 'Earn XP, unlock badges, and complete daily challenges to stay motivated.',
    emoji: '\ud83c\udfc6',
    color: '#FFD700',
  },
  {
    title: 'AI Chat Nutritionist',
    description: 'Chat with your AI nutritionist anytime. It knows your diet, goals, and progress.',
    emoji: '\ud83e\udd16',
    color: '#00D4FF',
  },
  {
    title: 'You\'re All Set!',
    description: 'Start logging your first meal and watch FuelIQ work its magic.',
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
