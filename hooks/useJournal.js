/**
 * useJournal - Wellness journaling hook
 */
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { getDailyJournalPrompt } from '../lib/wellnessEngine';

export function useJournal() {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [todayEntry, setTodayEntry] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [streak, setStreak] = useState(0);

  const todayPrompt = getDailyJournalPrompt();
  const today = new Date().toISOString().split('T')[0];

  const fetchEntries = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(90);
      if (error) throw error;
      setEntries(data || []);
      setTodayEntry(data?.find(e => e.date === today) || null);

      // Calculate journal streak
      let streakCount = 0;
      const dates = (data || []).map(e => e.date);
      let checkDate = today;
      while (dates.includes(checkDate)) {
        streakCount++;
        const d = new Date(checkDate);
        d.setDate(d.getDate() - 1);
        checkDate = d.toISOString().split('T')[0];
      }
      setStreak(streakCount);
    } catch (error) {
      if (__DEV__) console.error('[Journal] Fetch error:', error.message);
    } finally {
      setIsLoading(false);
    }
  }, [user, today]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const saveEntry = useCallback(async (content, mood = 5, tags = []) => {
    if (!user || !content?.trim()) return false;
    try {
      const entryData = {
        user_id: user.id, date: today, content: content.trim(),
        mood, tags, prompt: todayPrompt.question, category: todayPrompt.category,
      };
      if (todayEntry) {
        const { error } = await supabase.from('journal_entries').update(entryData).eq('id', todayEntry.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('journal_entries').insert(entryData);
        if (error) throw error;
      }
      await fetchEntries();
      return true;
    } catch (error) {
      if (__DEV__) console.error('[Journal] Save error:', error.message);
      return false;
    }
  }, [user, today, todayEntry, todayPrompt, fetchEntries]);

  const deleteEntry = useCallback(async (entryId) => {
    if (!user) return false;
    try {
      const { error } = await supabase.from('journal_entries').delete().eq('id', entryId).eq('user_id', user.id);
      if (error) throw error;
      setEntries(prev => prev.filter(e => e.id !== entryId));
      if (todayEntry?.id === entryId) setTodayEntry(null);
      return true;
    } catch { return false; }
  }, [user, todayEntry]);

  return { entries, todayEntry, todayPrompt, isLoading, streak, saveEntry, deleteEntry, refresh: fetchEntries };
}

export default useJournal;
