import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@vibefit_workout_templates';
const MAX_TEMPLATES = 50;

export default function useWorkoutTemplates() {
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load templates from storage on mount
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) setTemplates(JSON.parse(stored));
      } catch {
        // Silently fail - start fresh
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Persist helper
  const persist = async (updated) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Storage write failed - templates are still in memory
    }
  };

  /**
   * Save a completed/generated workout as a template.
   * @param {object} workout - The workout data (from generate-workout or history)
   * @param {string} name - Template name
   * @param {string} emoji - Template emoji
   * @returns {object} The saved template
   */
  const saveAsTemplate = useCallback(
    async (workout, name, emoji) => {
      const exercises = (workout.main_set || workout.exercises || []).map((ex) => ({
        name: ex.name || '',
        sets: ex.sets || 0,
        reps: ex.reps || 0,
        restSeconds: parseInt(ex.rest, 10) || 60,
        notes: ex.tips || ex.notes || '',
      }));

      const template = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
        name: name || workout.title || 'Workout Template',
        emoji: emoji || '💪',
        type: workout.type || workout.goal || 'custom',
        exercises,
        duration: workout.duration || 0,
        difficulty: Math.min(5, Math.max(1, Math.round((workout.difficulty_rating || 5) / 2))),
        createdAt: new Date().toISOString(),
        lastUsedAt: null,
        useCount: 0,
        isFavorite: false,
      };

      const updated = [template, ...templates].slice(0, MAX_TEMPLATES);
      setTemplates(updated);
      await persist(updated);
      return template;
    },
    [templates]
  );

  /**
   * Create a blank template manually.
   * @param {object} data - Template fields
   * @returns {object} The created template
   */
  const createTemplate = useCallback(
    async (data) => {
      const template = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
        name: data.name || 'New Template',
        emoji: data.emoji || '💪',
        type: data.type || 'custom',
        exercises: (data.exercises || []).map((ex) => ({
          name: ex.name || '',
          sets: ex.sets || 3,
          reps: ex.reps || 10,
          restSeconds: ex.restSeconds || 60,
          notes: ex.notes || '',
        })),
        duration: data.duration || 30,
        difficulty: data.difficulty || 3,
        createdAt: new Date().toISOString(),
        lastUsedAt: null,
        useCount: 0,
        isFavorite: false,
      };

      const updated = [template, ...templates].slice(0, MAX_TEMPLATES);
      setTemplates(updated);
      await persist(updated);
      return template;
    },
    [templates]
  );

  /**
   * Update template fields.
   * @param {string} id
   * @param {object} data - Partial template fields to update
   */
  const editTemplate = useCallback(
    async (id, data) => {
      const updated = templates.map((t) => {
        if (t.id !== id) return t;
        return {
          ...t,
          ...data,
          exercises: data.exercises
            ? data.exercises.map((ex) => ({
                name: ex.name || '',
                sets: ex.sets || 3,
                reps: ex.reps || 10,
                restSeconds: ex.restSeconds || 60,
                notes: ex.notes || '',
              }))
            : t.exercises,
        };
      });
      setTemplates(updated);
      await persist(updated);
    },
    [templates]
  );

  /**
   * Delete a template by id.
   * @param {string} id
   */
  const deleteTemplate = useCallback(
    async (id) => {
      const updated = templates.filter((t) => t.id !== id);
      setTemplates(updated);
      await persist(updated);
    },
    [templates]
  );

  /**
   * Toggle favorite status.
   * @param {string} id
   */
  const toggleFavorite = useCallback(
    async (id) => {
      const updated = templates.map((t) =>
        t.id === id ? { ...t, isFavorite: !t.isFavorite } : t
      );
      setTemplates(updated);
      await persist(updated);
    },
    [templates]
  );

  /**
   * Mark template as used. Updates lastUsedAt and increments useCount.
   * Returns the template data for starting a workout.
   * @param {string} id
   * @returns {object|null} The template data, or null if not found
   */
  const useTemplate = useCallback(
    async (id) => {
      let found = null;
      const updated = templates.map((t) => {
        if (t.id !== id) return t;
        found = {
          ...t,
          lastUsedAt: new Date().toISOString(),
          useCount: (t.useCount || 0) + 1,
        };
        return found;
      });

      if (found) {
        // Re-sort by lastUsedAt descending
        updated.sort((a, b) => {
          const aDate = a.lastUsedAt || a.createdAt;
          const bDate = b.lastUsedAt || b.createdAt;
          return new Date(bDate) - new Date(aDate);
        });
        setTemplates(updated);
        await persist(updated);
      }

      return found;
    },
    [templates]
  );

  /**
   * Filter templates by workout type.
   * @param {string} type
   * @returns {Array}
   */
  const getTemplatesByType = useCallback(
    (type) => {
      if (!type || type === 'all') return templates;
      return templates.filter(
        (t) => t.type?.toLowerCase() === type.toLowerCase()
      );
    },
    [templates]
  );

  /**
   * Get favorited templates.
   * @returns {Array}
   */
  const getFavorites = useCallback(() => {
    return templates.filter((t) => t.isFavorite);
  }, [templates]);

  /**
   * Get most recently used templates.
   * @param {number} limit
   * @returns {Array}
   */
  const getRecentlyUsed = useCallback(
    (limit = 5) => {
      return templates
        .filter((t) => t.lastUsedAt)
        .sort((a, b) => new Date(b.lastUsedAt) - new Date(a.lastUsedAt))
        .slice(0, limit);
    },
    [templates]
  );

  return {
    templates,
    isLoading,
    saveAsTemplate,
    createTemplate,
    editTemplate,
    deleteTemplate,
    toggleFavorite,
    useTemplate,
    getTemplatesByType,
    getFavorites,
    getRecentlyUsed,
  };
}
