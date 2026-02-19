import { supabase } from './supabase';

type AutoPostType = 'streak_milestone' | 'weight_milestone' | 'challenge_complete' | 'level_up';

interface AutoPostData {
  type: AutoPostType;
  title: string;
  body: string;
  emoji: string;
}

const AUTO_POST_TEMPLATES: Record<AutoPostType, (data: Record<string, unknown>) => AutoPostData> = {
  streak_milestone: (data) => ({
    type: 'streak_milestone',
    title: `${data.days}-Day Streak!`,
    body: `Just hit a ${data.days}-day logging streak! Consistency is key.`,
    emoji: '\uD83D\uDD25',
  }),
  weight_milestone: (data) => ({
    type: 'weight_milestone',
    title: 'Weight Milestone!',
    body: `Down ${data.amount} ${data.unit} from my starting weight!`,
    emoji: '\u2696\uFE0F',
  }),
  challenge_complete: (data) => ({
    type: 'challenge_complete',
    title: 'Challenge Complete!',
    body: `Just completed the "${data.challengeName}" challenge!`,
    emoji: '\uD83C\uDFC6',
  }),
  level_up: (data) => ({
    type: 'level_up',
    title: `Level ${data.level}!`,
    body: `Just reached Level ${data.level}: ${data.levelName}`,
    emoji: '\u2B06\uFE0F',
  }),
};

export async function createAutoPost(
  type: AutoPostType,
  data: Record<string, unknown>,
  userId: string,
  userName: string,
): Promise<boolean> {
  try {
    const template = AUTO_POST_TEMPLATES[type];
    if (!template) return false;

    const post = template(data);

    const { error } = await supabase.from('social_posts').insert({
      user_id: userId,
      user_name: userName,
      content: `${post.emoji} ${post.title}\n\n${post.body}`,
      post_type: 'auto_achievement',
      metadata: { type: post.type, ...data },
    });

    if (error) {
      if (__DEV__) console.error('[AutoPost] Create failed:', error.message);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
