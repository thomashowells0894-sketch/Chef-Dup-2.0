/**
 * useCommunityFoods — hook for the community food contribution system.
 *
 * Provides functions to submit, search, vote on, and report user-contributed
 * foods. Search results are cached in AsyncStorage. Approved submissions
 * award XP via the gamification system.
 */

import { useState, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useGamification } from '../context/GamificationContext';
import { sanitizeText, sanitizeNumber } from '../lib/validation';

// ============================================================================
// TYPES
// ============================================================================

export type ModerationStatus = 'pending' | 'approved' | 'rejected';

export type FoodCategory =
  | 'fruits'
  | 'vegetables'
  | 'grains'
  | 'dairy'
  | 'meat'
  | 'seafood'
  | 'beverages'
  | 'snacks'
  | 'prepared meals'
  | 'other';

export interface CommunityFood {
  id: string;
  name: string;
  brand: string | null;
  barcode: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  serving_size: number;
  serving_unit: string;
  category: FoodCategory;
  submitted_by: string;
  status: ModerationStatus;
  upvotes: number;
  downvotes: number;
  verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface FoodSubmission {
  name: string;
  brand?: string;
  barcode?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  serving_size: number;
  serving_unit: string;
  category: FoodCategory;
}

export interface ContributorStats {
  user_id: string;
  total_submissions: number;
  approved_count: number;
  total_upvotes: number;
}

export type VoteType = 'up' | 'down';

// ============================================================================
// CONSTANTS
// ============================================================================

const CACHE_PREFIX = '@fueliq_community_foods_';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const SEARCH_PAGE_SIZE = 20;
const XP_REWARD_SUBMISSION = 15;

const FOOD_CATEGORIES: FoodCategory[] = [
  'fruits',
  'vegetables',
  'grains',
  'dairy',
  'meat',
  'seafood',
  'beverages',
  'snacks',
  'prepared meals',
  'other',
];

// ============================================================================
// CACHE HELPERS
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

async function getCached<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      // Expired — remove it asynchronously
      AsyncStorage.removeItem(CACHE_PREFIX + key).catch(() => {});
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

async function setCache<T>(key: string, data: T): Promise<void> {
  try {
    const entry: CacheEntry<T> = { data, timestamp: Date.now() };
    await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch {
    // Cache write failure is non-critical
  }
}

async function invalidateCache(prefix?: string): Promise<void> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const cacheKeys = allKeys.filter((k) =>
      k.startsWith(CACHE_PREFIX + (prefix || ''))
    );
    if (cacheKeys.length > 0) {
      await AsyncStorage.multiRemove(cacheKeys);
    }
  } catch {
    // Non-critical
  }
}

// ============================================================================
// HOOK
// ============================================================================

export interface UseCommunityFoodsReturn {
  // State
  isSubmitting: boolean;
  isSearching: boolean;
  isVoting: boolean;
  searchResults: CommunityFood[];
  topContributors: ContributorStats[];
  error: string | null;

  // Actions
  submitFood: (submission: FoodSubmission) => Promise<CommunityFood | null>;
  searchCommunityFoods: (
    query: string,
    options?: {
      category?: FoodCategory;
      page?: number;
      barcode?: string;
    }
  ) => Promise<CommunityFood[]>;
  voteFood: (foodId: string, voteType: VoteType) => Promise<boolean>;
  reportFood: (foodId: string, reason: string) => Promise<boolean>;
  getTopContributors: (limit?: number) => Promise<ContributorStats[]>;

  // Constants
  categories: FoodCategory[];
}

export function useCommunityFoods(): UseCommunityFoodsReturn {
  const { user } = useAuth();
  const { awardXP, showToast } = useGamification();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [searchResults, setSearchResults] = useState<CommunityFood[]>([]);
  const [topContributors, setTopContributors] = useState<ContributorStats[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Debounce ref for search
  const searchAbortRef = useRef<AbortController | null>(null);

  // --------------------------------------------------------------------------
  // submitFood
  // --------------------------------------------------------------------------
  const submitFood = useCallback(
    async (submission: FoodSubmission): Promise<CommunityFood | null> => {
      if (!user) {
        setError('You must be logged in to submit foods.');
        return null;
      }

      setIsSubmitting(true);
      setError(null);

      try {
        // Sanitize inputs
        const sanitizedName = sanitizeText(submission.name, 200);
        if (!sanitizedName) {
          setError('Food name is required.');
          setIsSubmitting(false);
          return null;
        }

        const sanitizedBrand = submission.brand
          ? sanitizeText(submission.brand, 100)
          : null;
        const sanitizedBarcode = submission.barcode
          ? sanitizeText(submission.barcode, 50)
          : null;

        const row = {
          name: sanitizedName,
          brand: sanitizedBrand,
          barcode: sanitizedBarcode,
          calories: sanitizeNumber(submission.calories, 0, 99999),
          protein: sanitizeNumber(submission.protein, 0, 9999),
          carbs: sanitizeNumber(submission.carbs, 0, 9999),
          fat: sanitizeNumber(submission.fat, 0, 9999),
          fiber: sanitizeNumber(submission.fiber ?? 0, 0, 999),
          sugar: sanitizeNumber(submission.sugar ?? 0, 0, 9999),
          sodium: sanitizeNumber(submission.sodium ?? 0, 0, 99999),
          serving_size: sanitizeNumber(submission.serving_size, 0.1, 9999),
          serving_unit: sanitizeText(submission.serving_unit, 30) || 'serving',
          category: FOOD_CATEGORIES.includes(submission.category)
            ? submission.category
            : 'other',
          submitted_by: user.id,
          status: 'pending' as ModerationStatus,
        };

        const { data, error: insertError } = await supabase
          .from('community_foods')
          .insert(row)
          .select()
          .single();

        if (insertError) {
          if (__DEV__) console.error('[CommunityFoods] Submit error:', insertError);
          setError('Failed to submit food. Please try again.');
          return null;
        }

        // Invalidate search cache since a new food was added
        invalidateCache('search_');

        // Award XP for submission
        await awardXP('LOG_FOOD', 'Food submitted to community!');

        return data as CommunityFood;
      } catch (err: any) {
        if (__DEV__) console.error('[CommunityFoods] Submit exception:', err.message);
        setError('An unexpected error occurred.');
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    [user, awardXP]
  );

  // --------------------------------------------------------------------------
  // searchCommunityFoods
  // --------------------------------------------------------------------------
  const searchCommunityFoods = useCallback(
    async (
      query: string,
      options?: {
        category?: FoodCategory;
        page?: number;
        barcode?: string;
      }
    ): Promise<CommunityFood[]> => {
      // Abort any in-flight search
      if (searchAbortRef.current) {
        searchAbortRef.current.abort();
      }
      const abortController = new AbortController();
      searchAbortRef.current = abortController;

      const trimmedQuery = sanitizeText(query, 100);
      const category = options?.category;
      const page = options?.page ?? 0;
      const barcode = options?.barcode
        ? sanitizeText(options.barcode, 50)
        : undefined;

      // Build cache key
      const cacheKey = `search_${trimmedQuery}_${category || 'all'}_${page}_${barcode || ''}`;

      setIsSearching(true);
      setError(null);

      try {
        // Check cache first
        const cached = await getCached<CommunityFood[]>(cacheKey);
        if (cached && !abortController.signal.aborted) {
          setSearchResults(cached);
          setIsSearching(false);
          return cached;
        }

        // Build Supabase query
        // Show approved foods to everyone, plus the current user's own pending foods
        let supaQuery = supabase
          .from('community_foods')
          .select('*')
          .order('upvotes', { ascending: false })
          .range(page * SEARCH_PAGE_SIZE, (page + 1) * SEARCH_PAGE_SIZE - 1);

        // Moderation filter: approved OR own pending
        if (user) {
          supaQuery = supaQuery.or(
            `status.eq.approved,and(submitted_by.eq.${user.id},status.eq.pending)`
          );
        } else {
          supaQuery = supaQuery.eq('status', 'approved');
        }

        // Text search by name
        if (trimmedQuery) {
          supaQuery = supaQuery.ilike('name', `%${trimmedQuery}%`);
        }

        // Barcode search (exact match)
        if (barcode) {
          supaQuery = supaQuery.eq('barcode', barcode);
        }

        // Category filter
        if (category && FOOD_CATEGORIES.includes(category)) {
          supaQuery = supaQuery.eq('category', category);
        }

        const { data, error: searchError } = await supaQuery;

        if (abortController.signal.aborted) return searchResults;

        if (searchError) {
          if (__DEV__) console.error('[CommunityFoods] Search error:', searchError);
          setError('Search failed. Please try again.');
          return [];
        }

        const results = (data || []) as CommunityFood[];

        // Cache results
        setCache(cacheKey, results);

        setSearchResults(results);
        return results;
      } catch (err: any) {
        if (abortController.signal.aborted) return searchResults;
        if (__DEV__) console.error('[CommunityFoods] Search exception:', err.message);
        setError('An unexpected error occurred during search.');
        return [];
      } finally {
        if (!abortController.signal.aborted) {
          setIsSearching(false);
        }
      }
    },
    [user, searchResults]
  );

  // --------------------------------------------------------------------------
  // voteFood
  // --------------------------------------------------------------------------
  const voteFood = useCallback(
    async (foodId: string, voteType: VoteType): Promise<boolean> => {
      if (!user) {
        setError('You must be logged in to vote.');
        return false;
      }

      setIsVoting(true);
      setError(null);

      try {
        // Check if user already voted on this food
        const { data: existing, error: fetchError } = await supabase
          .from('community_food_votes')
          .select('id, vote_type')
          .eq('food_id', foodId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (fetchError) {
          if (__DEV__) console.error('[CommunityFoods] Vote fetch error:', fetchError);
          setError('Failed to process vote.');
          return false;
        }

        if (existing) {
          if (existing.vote_type === voteType) {
            // Same vote type — remove the vote (toggle off)
            const { error: deleteError } = await supabase
              .from('community_food_votes')
              .delete()
              .eq('id', existing.id);

            if (deleteError) {
              if (__DEV__) console.error('[CommunityFoods] Vote delete error:', deleteError);
              setError('Failed to remove vote.');
              return false;
            }
          } else {
            // Different vote type — update to new type
            const { error: updateError } = await supabase
              .from('community_food_votes')
              .update({ vote_type: voteType })
              .eq('id', existing.id);

            if (updateError) {
              if (__DEV__) console.error('[CommunityFoods] Vote update error:', updateError);
              setError('Failed to update vote.');
              return false;
            }
          }
        } else {
          // No existing vote — insert new one
          const { error: insertError } = await supabase
            .from('community_food_votes')
            .insert({
              food_id: foodId,
              user_id: user.id,
              vote_type: voteType,
            });

          if (insertError) {
            if (__DEV__) console.error('[CommunityFoods] Vote insert error:', insertError);
            setError('Failed to submit vote.');
            return false;
          }
        }

        // Invalidate search cache since vote counts changed
        invalidateCache('search_');

        // Optimistically update search results
        setSearchResults((prev) =>
          prev.map((food) => {
            if (food.id !== foodId) return food;

            let newUpvotes = food.upvotes;
            let newDownvotes = food.downvotes;

            if (existing) {
              // Remove old vote
              if (existing.vote_type === 'up') newUpvotes--;
              else newDownvotes--;

              if (existing.vote_type !== voteType) {
                // Add new vote
                if (voteType === 'up') newUpvotes++;
                else newDownvotes++;
              }
            } else {
              // New vote
              if (voteType === 'up') newUpvotes++;
              else newDownvotes++;
            }

            return {
              ...food,
              upvotes: Math.max(0, newUpvotes),
              downvotes: Math.max(0, newDownvotes),
            };
          })
        );

        return true;
      } catch (err: any) {
        if (__DEV__) console.error('[CommunityFoods] Vote exception:', err.message);
        setError('An unexpected error occurred.');
        return false;
      } finally {
        setIsVoting(false);
      }
    },
    [user]
  );

  // --------------------------------------------------------------------------
  // reportFood
  // --------------------------------------------------------------------------
  const reportFood = useCallback(
    async (foodId: string, reason: string): Promise<boolean> => {
      if (!user) {
        setError('You must be logged in to report foods.');
        return false;
      }

      setError(null);

      const sanitizedReason = sanitizeText(reason, 500);
      if (!sanitizedReason) {
        setError('Please provide a reason for the report.');
        return false;
      }

      try {
        const { error: insertError } = await supabase
          .from('community_food_reports')
          .insert({
            food_id: foodId,
            reporter_id: user.id,
            reason: sanitizedReason,
          });

        if (insertError) {
          if (__DEV__) console.error('[CommunityFoods] Report error:', insertError);
          setError('Failed to submit report.');
          return false;
        }

        showToast('Report submitted. Thank you!', 0);
        return true;
      } catch (err: any) {
        if (__DEV__) console.error('[CommunityFoods] Report exception:', err.message);
        setError('An unexpected error occurred.');
        return false;
      }
    },
    [user, showToast]
  );

  // --------------------------------------------------------------------------
  // getTopContributors
  // --------------------------------------------------------------------------
  const getTopContributors = useCallback(
    async (limit: number = 10): Promise<ContributorStats[]> => {
      setError(null);

      const cacheKey = `contributors_${limit}`;

      try {
        // Check cache
        const cached = await getCached<ContributorStats[]>(cacheKey);
        if (cached) {
          setTopContributors(cached);
          return cached;
        }

        // Query aggregated stats
        // Use a raw RPC or manual aggregation
        const { data, error: queryError } = await supabase
          .from('community_foods')
          .select('submitted_by, status, upvotes')
          .in('status', ['approved', 'pending']);

        if (queryError) {
          if (__DEV__) console.error('[CommunityFoods] Contributors error:', queryError);
          setError('Failed to load contributors.');
          return [];
        }

        // Aggregate in JavaScript
        const statsMap = new Map<string, ContributorStats>();

        for (const row of data || []) {
          const userId = row.submitted_by as string;
          const existing = statsMap.get(userId) || {
            user_id: userId,
            total_submissions: 0,
            approved_count: 0,
            total_upvotes: 0,
          };

          existing.total_submissions++;
          if (row.status === 'approved') existing.approved_count++;
          existing.total_upvotes += (row.upvotes as number) || 0;

          statsMap.set(userId, existing);
        }

        const results = Array.from(statsMap.values())
          .sort((a, b) => b.approved_count - a.approved_count || b.total_upvotes - a.total_upvotes)
          .slice(0, limit);

        setCache(cacheKey, results);
        setTopContributors(results);
        return results;
      } catch (err: any) {
        if (__DEV__) console.error('[CommunityFoods] Contributors exception:', err.message);
        setError('An unexpected error occurred.');
        return [];
      }
    },
    []
  );

  return {
    // State
    isSubmitting,
    isSearching,
    isVoting,
    searchResults,
    topContributors,
    error,

    // Actions
    submitFood,
    searchCommunityFoods,
    voteFood,
    reportFood,
    getTopContributors,

    // Constants
    categories: FOOD_CATEGORIES,
  };
}
