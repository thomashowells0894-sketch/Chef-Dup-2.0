/**
 * useSocialFeed - Community social feed with posts, reactions, comments, friend activity
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';

const REACTION_TYPES = ['fire', 'clap', 'flex', 'heart'];
const PHOTO_BUCKET = 'social-photos';

export function useSocialFeed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(0);
  const PAGE_SIZE = 20;

  const fetchPosts = useCallback(async (page = 0, refresh = false) => {
    if (!user) return;
    try {
      if (refresh) { setIsRefreshing(true); pageRef.current = 0; }
      else setIsLoading(true);

      const { data, error } = await supabase
        .from('social_posts')
        .select(`
          *,
          profiles!social_posts_user_id_fkey(name, avatar_url),
          social_likes(user_id),
          social_comments(id),
          social_reactions(user_id, reaction_type)
        `)
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (error) { if (__DEV__) console.error('[Social] Feed error:', error.message); return; }

      const formatted = (data || []).map(post => {
        // Build reaction counts from social_reactions
        const reactionRows = post.social_reactions || [];
        const reactions = {};
        for (const type of REACTION_TYPES) {
          reactions[type] = reactionRows.filter(r => r.reaction_type === type).length;
        }
        const userReaction = reactionRows.find(r => r.user_id === user.id)?.reaction_type || null;

        return {
          id: post.id,
          userId: post.user_id,
          userName: post.profiles?.name || 'Anonymous',
          avatarUrl: post.profiles?.avatar_url,
          type: post.type,
          content: post.content,
          imageUrl: post.image_url,
          metadata: post.metadata || {},
          likesCount: post.social_likes?.length || 0,
          commentsCount: post.social_comments?.length || 0,
          isLiked: post.social_likes?.some(l => l.user_id === user.id) || false,
          reactions,
          userReaction,
          createdAt: post.created_at,
        };
      });

      if (refresh || page === 0) setPosts(formatted);
      else setPosts(prev => [...prev, ...formatted]);

      setHasMore(formatted.length === PAGE_SIZE);
      pageRef.current = page;
    } catch (error) {
      if (__DEV__) console.error('[Social] Fetch failed:', error.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user]);

  useEffect(() => { fetchPosts(0); }, [fetchPosts]);

  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) fetchPosts(pageRef.current + 1);
  }, [isLoading, hasMore, fetchPosts]);

  const refresh = useCallback(() => fetchPosts(0, true), [fetchPosts]);

  const createPost = useCallback(async (postData) => {
    if (!user) return null;
    try {
      const { data, error } = await supabase
        .from('social_posts')
        .insert({ user_id: user.id, type: postData.type, content: postData.content, image_url: postData.imageUrl, metadata: postData.metadata })
        .select()
        .single();
      if (error) throw error;
      await refresh();
      return data;
    } catch (error) {
      if (__DEV__) console.error('[Social] Create post error:', error.message);
      return null;
    }
  }, [user, refresh]);

  /**
   * Toggle a reaction on a post. If reactionType is provided, use the reactions table.
   * Falls back to legacy social_likes toggle if no reactionType.
   */
  const toggleLike = useCallback(async (postId, reactionType) => {
    if (!user) return;
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    if (reactionType && REACTION_TYPES.includes(reactionType)) {
      // Reaction system: upsert into social_reactions
      const currentReaction = post.userReaction;

      if (currentReaction === reactionType) {
        // Remove reaction (optimistic)
        setPosts(prev => prev.map(p => {
          if (p.id !== postId) return p;
          const newReactions = { ...p.reactions, [reactionType]: Math.max(0, (p.reactions[reactionType] || 0) - 1) };
          return { ...p, userReaction: null, reactions: newReactions };
        }));
        try {
          await supabase.from('social_reactions').delete().eq('post_id', postId).eq('user_id', user.id);
        } catch {
          // Revert on failure
          setPosts(prev => prev.map(p => p.id === postId ? { ...p, userReaction: currentReaction, reactions: post.reactions } : p));
        }
      } else {
        // Add or change reaction (optimistic)
        setPosts(prev => prev.map(p => {
          if (p.id !== postId) return p;
          const newReactions = { ...p.reactions };
          if (currentReaction) {
            newReactions[currentReaction] = Math.max(0, (newReactions[currentReaction] || 0) - 1);
          }
          newReactions[reactionType] = (newReactions[reactionType] || 0) + 1;
          return { ...p, userReaction: reactionType, reactions: newReactions };
        }));
        try {
          await supabase.from('social_reactions').upsert(
            { post_id: postId, user_id: user.id, reaction_type: reactionType },
            { onConflict: 'post_id,user_id' }
          );
        } catch {
          // Revert on failure
          setPosts(prev => prev.map(p => p.id === postId ? { ...p, userReaction: currentReaction, reactions: post.reactions } : p));
        }
      }
    } else {
      // Legacy like toggle (backwards compatible)
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, isLiked: !p.isLiked, likesCount: p.isLiked ? p.likesCount - 1 : p.likesCount + 1 } : p));

      try {
        if (post.isLiked) {
          await supabase.from('social_likes').delete().eq('post_id', postId).eq('user_id', user.id);
        } else {
          await supabase.from('social_likes').insert({ post_id: postId, user_id: user.id });
        }
      } catch {
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, isLiked: post.isLiked, likesCount: post.likesCount } : p));
      }
    }
  }, [user, posts]);

  /**
   * Get reaction counts for a specific post.
   */
  const getReactions = useCallback(async (postId) => {
    try {
      const { data, error } = await supabase
        .from('social_reactions')
        .select('reaction_type')
        .eq('post_id', postId);
      if (error) throw error;
      const counts = {};
      for (const type of REACTION_TYPES) {
        counts[type] = (data || []).filter(r => r.reaction_type === type).length;
      }
      return counts;
    } catch {
      return { fire: 0, clap: 0, flex: 0, heart: 0 };
    }
  }, []);

  /**
   * Fetch comments for a specific post, with user profile data.
   */
  const fetchComments = useCallback(async (postId) => {
    try {
      const { data, error } = await supabase
        .from('social_comments')
        .select('*, profiles!social_comments_user_id_fkey(name, avatar_url)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []).map(c => ({
        id: c.id,
        userId: c.user_id,
        userName: c.profiles?.name || 'Anonymous',
        avatarUrl: c.profiles?.avatar_url,
        content: c.content || c.body || '',
        createdAt: c.created_at,
      }));
    } catch (error) {
      if (__DEV__) console.error('[Social] Fetch comments error:', error.message);
      return [];
    }
  }, []);

  const addComment = useCallback(async (postId, content) => {
    if (!user || !content?.trim()) return null;
    try {
      const { data, error } = await supabase
        .from('social_comments')
        .insert({ post_id: postId, user_id: user.id, content: content.trim() })
        .select('*, profiles!social_comments_user_id_fkey(name, avatar_url)')
        .single();
      if (error) throw error;
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p));
      return {
        id: data.id,
        userId: data.user_id,
        userName: data.profiles?.name || 'Anonymous',
        avatarUrl: data.profiles?.avatar_url,
        content: data.content,
        createdAt: data.created_at,
      };
    } catch (error) {
      if (__DEV__) console.error('[Social] Comment error:', error.message);
      return null;
    }
  }, [user]);

  const deletePost = useCallback(async (postId) => {
    if (!user) return false;
    try {
      const { error } = await supabase.from('social_posts').delete().eq('id', postId).eq('user_id', user.id);
      if (error) throw error;
      setPosts(prev => prev.filter(p => p.id !== postId));
      return true;
    } catch { return false; }
  }, [user]);

  /**
   * Log an activity to the friend_activity table so friends see it in their feed.
   */
  const logFriendActivity = useCallback(async (activityType, title, metadata = {}) => {
    if (!user) return;
    try {
      await supabase.from('friend_activity').insert({
        user_id: user.id,
        activity_type: activityType,
        title,
        metadata,
      });
    } catch (error) {
      if (__DEV__) console.error('[Social] Log activity error:', error.message);
    }
  }, [user]);

  /**
   * Share a workout summary as a social post + log friend activity.
   * @param {Object} workout - { name, duration, caloriesBurned, exercises, xpEarned }
   */
  const shareWorkoutSummary = useCallback(async (workout) => {
    if (!user) return null;
    const content = `Completed ${workout.name || 'a workout'}! ${workout.duration ? `${workout.duration} min` : ''} ${workout.caloriesBurned ? `| ${workout.caloriesBurned} kcal burned` : ''}`.trim();
    const metadata = {
      duration: workout.duration,
      calories: workout.caloriesBurned,
      exercises: workout.exercises,
      xp: workout.xpEarned,
    };
    const post = await createPost({ type: 'workout', content, metadata });
    if (post) {
      await logFriendActivity('workout', `Completed ${workout.name || 'a workout'}`, metadata);
    }
    return post;
  }, [user, createPost, logFriendActivity]);

  /**
   * Share a meal achievement as a social post + log friend activity.
   * @param {Object} meal - { name, calories, protein, carbs, fat, photoUrl }
   */
  const shareMealAchievement = useCallback(async (meal) => {
    if (!user) return null;
    const content = meal.name
      ? `Hit my nutrition goals with ${meal.name}!`
      : 'Crushed my nutrition targets today!';
    const metadata = {
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat,
    };
    const post = await createPost({
      type: 'meal',
      content,
      imageUrl: meal.photoUrl,
      metadata,
    });
    if (post) {
      await logFriendActivity('meal', content, metadata);
    }
    return post;
  }, [user, createPost, logFriendActivity]);

  /**
   * Share a streak milestone as a social post + log friend activity.
   * @param {Object} streak - { days, type }
   */
  const shareStreak = useCallback(async (streak) => {
    if (!user) return null;
    const streakType = streak.type || 'logging';
    const content = `${streak.days}-day ${streakType} streak! Consistency is key.`;
    const metadata = { streakDays: streak.days, streakType };
    const post = await createPost({ type: 'milestone', content, metadata });
    if (post) {
      await logFriendActivity('streak', `${streak.days}-day ${streakType} streak`, metadata);
    }
    return post;
  }, [user, createPost, logFriendActivity]);

  /**
   * Share a personal record as a social post + log friend activity.
   * @param {Object} pr - { exercise, value, unit, previous }
   */
  const sharePR = useCallback(async (pr) => {
    if (!user) return null;
    const improvement = pr.previous ? ` (up from ${pr.previous} ${pr.unit || ''})` : '';
    const content = `New PR! ${pr.exercise}: ${pr.value} ${pr.unit || ''}${improvement}`;
    const metadata = {
      exercise: pr.exercise,
      value: pr.value,
      unit: pr.unit,
      previous: pr.previous,
    };
    const post = await createPost({ type: 'achievement', content, metadata });
    if (post) {
      await logFriendActivity('achievement', `New PR on ${pr.exercise}: ${pr.value} ${pr.unit || ''}`, metadata);
    }
    return post;
  }, [user, createPost, logFriendActivity]);

  /**
   * Upload a photo to Supabase Storage and return the public URL.
   * Accepts a local file URI (e.g. from expo-image-picker).
   * @param {string} localUri - The local file URI to upload
   * @returns {Promise<string|null>} The public URL of the uploaded photo, or null on failure
   */
  const uploadPhoto = useCallback(async (localUri) => {
    if (!user || !localUri) return null;
    try {
      const fileExt = localUri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const contentType = fileExt === 'png' ? 'image/png' : 'image/jpeg';

      // Read file as base64 and convert to ArrayBuffer for Supabase upload
      const base64 = await FileSystem.readAsStringAsync(localUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const { error: uploadError } = await supabase.storage
        .from(PHOTO_BUCKET)
        .upload(fileName, decode(base64), {
          contentType,
          upsert: false,
        });

      if (uploadError) {
        if (__DEV__) console.error('[Social] Photo upload error:', uploadError.message);
        return null;
      }

      const { data: urlData } = supabase.storage
        .from(PHOTO_BUCKET)
        .getPublicUrl(fileName);

      return urlData?.publicUrl || null;
    } catch (error) {
      if (__DEV__) console.error('[Social] Photo upload failed:', error.message);
      return null;
    }
  }, [user]);

  /**
   * Pick a photo from the device library.
   * @returns {Promise<string|null>} The local URI of the picked image, or null
   */
  const pickPhoto = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') return null;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]) return null;
      return result.assets[0].uri;
    } catch {
      return null;
    }
  }, []);

  /**
   * Create a post with an optional photo attachment.
   * If photoUri is provided, the photo is uploaded first and the URL is attached to the post.
   * @param {Object} postData - { type, content, metadata, photoUri }
   * @returns {Promise<Object|null>} The created post or null
   */
  const createPostWithPhoto = useCallback(async (postData) => {
    if (!user) return null;
    try {
      let photoUrl = postData.imageUrl || null;

      // If a local photo URI is provided, upload it first
      if (postData.photoUri) {
        const uploadedUrl = await uploadPhoto(postData.photoUri);
        if (uploadedUrl) {
          photoUrl = uploadedUrl;
        }
      }

      const { data, error } = await supabase
        .from('social_posts')
        .insert({
          user_id: user.id,
          type: postData.type || 'post',
          content: postData.content,
          image_url: photoUrl,
          metadata: postData.metadata,
        })
        .select()
        .single();
      if (error) throw error;
      await refresh();
      return data;
    } catch (error) {
      if (__DEV__) console.error('[Social] Create post with photo error:', error.message);
      return null;
    }
  }, [user, uploadPhoto, refresh]);

  /**
   * Get friend activity feed - notable events from friends.
   * @param {string[]} friendIds - Array of friend user IDs
   * @param {number} limit - Max number of items to return
   */
  const getFriendActivity = useCallback(async (friendIds, limit = 30) => {
    if (!user || !friendIds?.length) return [];
    try {
      const { data, error } = await supabase
        .from('friend_activity')
        .select('*, profiles!friend_activity_user_id_fkey(name, avatar_url)')
        .in('user_id', friendIds)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []).map(item => ({
        id: item.id,
        userId: item.user_id,
        userName: item.profiles?.name || 'Anonymous',
        avatarUrl: item.profiles?.avatar_url,
        activityType: item.activity_type,
        title: item.title,
        metadata: item.metadata || {},
        createdAt: item.created_at,
      }));
    } catch (error) {
      if (__DEV__) console.error('[Social] Friend activity error:', error.message);
      return [];
    }
  }, [user]);

  return {
    posts,
    isLoading,
    isRefreshing,
    hasMore,
    loadMore,
    refresh,
    createPost,
    createPostWithPhoto,
    uploadPhoto,
    pickPhoto,
    toggleLike,
    addComment,
    deletePost,
    getReactions,
    fetchComments,
    getFriendActivity,
    shareWorkoutSummary,
    shareMealAchievement,
    shareStreak,
    sharePR,
    logFriendActivity,
  };
}

export default useSocialFeed;
