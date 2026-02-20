// Mock supabase before importing the module
jest.mock('../../lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: jest.fn(),
    },
  },
}));

jest.mock('../../lib/rateLimiter', () => ({
  checkAIRateLimit: jest.fn(() => ({ allowed: true, retryAfterMs: 0, message: '' })),
}));

import {
  isAIServiceAvailable,
  analyzeFoodImage,
  generateWorkout,
  chatWithNutritionist,
  parseVoiceFood,
  generateWeeklyDigest,
  generateMealPlan,
  suggestFoodSwaps,
  setAIPremiumStatus,
} from '../../services/ai';
import { supabase } from '../../lib/supabase';
import { checkAIRateLimit } from '../../lib/rateLimiter';

const mockInvoke = supabase.functions.invoke as jest.Mock;
const mockRateLimit = checkAIRateLimit as jest.Mock;

describe('AI Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setAIPremiumStatus(true);
    mockRateLimit.mockReturnValue({ allowed: true, retryAfterMs: 0, message: '' });
  });

  describe('isAIServiceAvailable', () => {
    it('returns true when supabase is configured', () => {
      expect(isAIServiceAvailable()).toBe(true);
    });
  });

  describe('analyzeFoodImage', () => {
    it('throws on invalid input', async () => {
      await expect(analyzeFoodImage('')).rejects.toThrow('Invalid image data');
      await expect(analyzeFoodImage(null as unknown as string)).rejects.toThrow('Invalid image data');
    });

    it('returns normalized food scan result', async () => {
      mockInvoke.mockResolvedValue({
        data: { name: 'Apple', calories: 95, protein: 0, carbs: 25, fat: 0, emoji: '🍎', serving: '1 medium', confidence: 'high' },
        error: null,
      });

      const result = await analyzeFoodImage('base64imagedata');
      expect(result.name).toBe('Apple');
      expect(result.calories).toBe(95);
      expect(result.emoji).toBe('🍎');
    });

    it('provides defaults for missing fields', async () => {
      mockInvoke.mockResolvedValue({
        data: {},
        error: null,
      });

      const result = await analyzeFoodImage('base64imagedata');
      expect(result.name).toBe('Unknown Food');
      expect(result.calories).toBe(0);
      expect(result.emoji).toBe('🍽️');
      expect(result.serving).toBe('1 serving');
      expect(result.confidence).toBe('medium');
    });

    it('respects rate limiting', async () => {
      mockRateLimit.mockReturnValue({ allowed: false, retryAfterMs: 5000, message: 'Too many requests' });

      await expect(analyzeFoodImage('base64data')).rejects.toThrow('Too many requests');
      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it('deduplicates concurrent identical requests', async () => {
      mockInvoke.mockResolvedValue({
        data: { name: 'Apple', calories: 95, protein: 0, carbs: 25, fat: 0 },
        error: null,
      });

      const image = 'a'.repeat(100);
      const [r1, r2] = await Promise.all([
        analyzeFoodImage(image),
        analyzeFoodImage(image),
      ]);

      expect(r1.name).toBe('Apple');
      expect(r2.name).toBe('Apple');
      // Should only invoke once due to deduplication
      expect(mockInvoke).toHaveBeenCalledTimes(1);
    });
  });

  describe('generateWorkout', () => {
    it('throws on invalid params', async () => {
      await expect(generateWorkout(null as unknown as Record<string, unknown>)).rejects.toThrow('Invalid workout parameters');
    });

    it('sanitizes input parameters', async () => {
      mockInvoke.mockResolvedValue({
        data: { title: 'Custom Workout', warmup: [], main_set: [], cooldown: [] },
        error: null,
      });

      await generateWorkout({ goal: 'hypertrophy', level: 3, duration: 45 });
      expect(mockInvoke).toHaveBeenCalledWith('ai-brain', expect.objectContaining({
        body: expect.objectContaining({
          type: 'generate-workout',
        }),
      }));
    });

    it('provides defaults for missing response fields', async () => {
      mockInvoke.mockResolvedValue({
        data: {},
        error: null,
      });

      const result = await generateWorkout({ goal: 'strength', level: 2, duration: 30 });
      expect(result.title).toBe('Custom Workout');
      expect(result.warmup).toEqual([]);
      expect(result.main_set).toEqual([]);
      expect(result.cooldown).toEqual([]);
    });
  });

  describe('chatWithNutritionist', () => {
    it('throws on empty message', async () => {
      await expect(chatWithNutritionist('')).rejects.toThrow('Please enter a message');
      await expect(chatWithNutritionist('   ')).rejects.toThrow('Please enter a message');
    });

    it('returns chat response', async () => {
      mockInvoke.mockResolvedValue({
        data: { reply: 'Eat more protein!', suggestions: ['Chicken', 'Fish'], foodItems: [] },
        error: null,
      });

      const result = await chatWithNutritionist('How much protein should I eat?');
      expect(result.reply).toBe('Eat more protein!');
      expect(result.suggestions).toEqual(['Chicken', 'Fish']);
    });

    it('sanitizes conversation history', async () => {
      mockInvoke.mockResolvedValue({
        data: { reply: 'response' },
        error: null,
      });

      await chatWithNutritionist('Hello', [
        { role: 'user', content: 'Hi' },
        { role: 'assistant', content: 'Hello!' },
        { role: 'hacker', content: 'evil' }, // invalid role normalized to 'assistant'
      ]);

      const callBody = mockInvoke.mock.calls[0]![1].body;
      expect(callBody.payload.conversationHistory[2]!.role).toBe('assistant');
    });
  });

  describe('parseVoiceFood', () => {
    it('throws on empty audio', async () => {
      await expect(parseVoiceFood('')).rejects.toThrow('No audio data');
    });

    it('returns transcript and foods', async () => {
      mockInvoke.mockResolvedValue({
        data: { transcript: 'I ate an apple', foods: [{ name: 'Apple', calories: 95 }] },
        error: null,
      });

      const result = await parseVoiceFood('base64audio');
      expect(result.transcript).toBe('I ate an apple');
      expect(result.foods).toHaveLength(1);
    });
  });

  describe('generateWeeklyDigest', () => {
    it('throws on invalid input', async () => {
      await expect(generateWeeklyDigest(null as unknown as Record<string, unknown>)).rejects.toThrow('No weekly data');
    });

    it('returns digest with defaults', async () => {
      mockInvoke.mockResolvedValue({
        data: {},
        error: null,
      });

      const result = await generateWeeklyDigest({ weekCalories: 14000 });
      expect(result.headline).toBe('Your Weekly Summary');
      expect(result.weeklyScore).toBe(50);
      expect(result.generatedAt).toBeDefined();
    });
  });

  describe('generateMealPlan', () => {
    it('throws on invalid params', async () => {
      await expect(generateMealPlan(null as unknown as Record<string, unknown>)).rejects.toThrow('Invalid meal plan parameters');
    });

    it('returns meal plan', async () => {
      mockInvoke.mockResolvedValue({
        data: { days: [{ meals: [] }], shoppingList: ['chicken'], coachNote: 'Great plan!' },
        error: null,
      });

      const result = await generateMealPlan({ calorieTarget: 2000, goal: 'maintain' });
      expect(result.days).toHaveLength(1);
      expect(result.shoppingList).toEqual(['chicken']);
      expect(result.coachNote).toBe('Great plan!');
    });
  });

  describe('suggestFoodSwaps', () => {
    it('throws when no food name provided', async () => {
      await expect(suggestFoodSwaps({} as { foodName: string })).rejects.toThrow('Please provide a food item');
    });

    it('returns swap suggestions', async () => {
      mockInvoke.mockResolvedValue({
        data: {
          originalFood: { name: 'Fries' },
          swaps: [{ name: 'Sweet Potato Fries', calories: 150 }],
          tip: 'Swap tip!',
        },
        error: null,
      });

      const result = await suggestFoodSwaps({ foodName: 'Fries', calories: 300, protein: 3, carbs: 40, fat: 15 });
      expect(result.swaps).toHaveLength(1);
      expect(result.tip).toBe('Swap tip!');
    });
  });

  describe('error handling', () => {
    it('handles supabase function errors', async () => {
      mockInvoke.mockResolvedValue({
        data: null,
        error: { message: 'Function error' },
      });

      await expect(analyzeFoodImage('base64data')).rejects.toThrow();
    });

    it('handles error in response data', async () => {
      mockInvoke.mockResolvedValue({
        data: { error: 'AI processing failed' },
        error: null,
      });

      await expect(analyzeFoodImage('base64data')).rejects.toThrow('AI processing failed');
    });

    it('handles null response data', async () => {
      mockInvoke.mockResolvedValue({
        data: null,
        error: null,
      });

      await expect(analyzeFoodImage('base64data')).rejects.toThrow('Empty response');
    });
  });
});
