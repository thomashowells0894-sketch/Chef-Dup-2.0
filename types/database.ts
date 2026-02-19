/** Supabase row types */

export interface DbProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  weight: number | null;
  height: number | null;
  age: number | null;
  gender: string | null;
  activity_level: string | null;
  goal: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbFoodLog {
  id: string;
  user_id: string;
  date: string;
  name: string;
  emoji: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  serving: string | null;
  serving_size: number | null;
  serving_unit: string | null;
  meal_type: string | null;
  water_amount: number | null;
  created_at: string;
}

export interface DbWorkout {
  id: string;
  user_id: string;
  date: string;
  name: string;
  emoji: string | null;
  duration: number | null;
  calories_burned: number | null;
  created_at: string;
}

export interface DbSocialPost {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  post_type: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
}

export interface DbChallenge {
  id: string;
  title: string;
  description: string;
  challenge_type: string;
  target_value: number;
  start_date: string;
  end_date: string;
  created_by: string;
  created_at: string;
}

export interface DbFriendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
}

export interface DbJournalEntry {
  id: string;
  user_id: string;
  date: string;
  content: string;
  mood: number | null;
  energy: number | null;
  tags: string[] | null;
  created_at: string;
}
