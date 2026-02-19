import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { safeJSONParse, isValidArray } from '../lib/validation';

const STORAGE_KEY = '@vibefit_food_photos';
const MAX_ENTRIES = 500;

export function useFoodPhotos() {
  const [photos, setPhotos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load from AsyncStorage on mount
  useEffect(() => {
    async function load() {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = safeJSONParse(stored, []);
          if (isValidArray(parsed)) {
            // Filter out malformed entries
            const valid = parsed.filter(
              (p) =>
                p &&
                typeof p === 'object' &&
                typeof p.id === 'string' &&
                typeof p.uri === 'string' &&
                typeof p.createdAt === 'string'
            );
            // Sort newest first
            const sorted = valid.sort(
              (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
            );
            setPhotos(sorted);
          }
        }
      } catch (error) {
        if (__DEV__) console.error('Failed to load food photos:', error.message);
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, []);

  // Persist to AsyncStorage whenever photos change
  useEffect(() => {
    if (isLoading) return;

    async function save() {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(photos));
      } catch (error) {
        if (__DEV__) console.error('Failed to save food photos:', error.message);
      }
    }

    save();
  }, [photos, isLoading]);

  // Add a new photo entry
  const addPhoto = useCallback((data) => {
    const now = new Date();
    const newPhoto = {
      id: `fp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      uri: data.uri || '',
      date: data.date || now.toISOString().split('T')[0],
      mealType: data.mealType || 'snack',
      foodName: data.foodName || 'Unknown Food',
      calories: data.calories || 0,
      protein: data.protein || 0,
      carbs: data.carbs || 0,
      fat: data.fat || 0,
      notes: data.notes || '',
      createdAt: data.createdAt || now.toISOString(),
    };

    setPhotos((prev) => {
      const updated = [newPhoto, ...prev];
      // Trim oldest if exceeding max
      if (updated.length > MAX_ENTRIES) {
        return updated.slice(0, MAX_ENTRIES);
      }
      return updated;
    });

    return newPhoto;
  }, []);

  // Delete a photo by id (also removes the file if it exists)
  const deletePhoto = useCallback(async (id) => {
    const photo = photos.find((p) => p.id === id);
    if (photo && photo.uri) {
      try {
        const info = await FileSystem.getInfoAsync(photo.uri);
        if (info.exists) {
          await FileSystem.deleteAsync(photo.uri, { idempotent: true });
        }
      } catch (error) {
        if (__DEV__) console.error('Failed to delete photo file:', error.message);
      }
    }
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  }, [photos]);

  // Get photos filtered by a specific date (YYYY-MM-DD)
  const getPhotosByDate = useCallback(
    (date) => {
      return photos.filter((p) => p.date === date);
    },
    [photos]
  );

  // Get photos filtered by meal type
  const getPhotosByMeal = useCallback(
    (mealType) => {
      return photos.filter((p) => p.mealType === mealType);
    },
    [photos]
  );

  // Get the most recent N photos
  const getRecentPhotos = useCallback(
    (limit = 10) => {
      return photos.slice(0, limit);
    },
    [photos]
  );

  // Get total photo count
  const getPhotoCount = useCallback(() => {
    return photos.length;
  }, [photos]);

  // Get date range: first and last photo dates
  const getDateRange = useCallback(() => {
    if (photos.length === 0) return { first: null, last: null };
    // photos are sorted newest first
    return {
      first: photos[photos.length - 1].createdAt,
      last: photos[0].createdAt,
    };
  }, [photos]);

  return {
    photos,
    isLoading,
    addPhoto,
    deletePhoto,
    getPhotosByDate,
    getPhotosByMeal,
    getRecentPhotos,
    getPhotoCount,
    getDateRange,
  };
}
