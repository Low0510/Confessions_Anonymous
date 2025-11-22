import { supabase } from './supabase';
import { Confession } from '../types';

// Fetch all confessions
export const fetchConfessions = async (): Promise<Confession[]> => {
  const { data, error } = await supabase
    .from('confessions')
    .select('*')
    .order('timestamp', { ascending: false });

  if (error) {
    console.error('Error fetching confessions:', error);
    return [];
  }

  return data.map(row => ({
    id: row.id,
    type: row.type as 'text' | 'poll',
    text: row.text,
    image: row.image || undefined,
    pollOptions: row.poll_options || undefined,
    timestamp: row.timestamp,
    reactions: row.reactions,
    comments: row.comments || [],
    sentiment: row.sentiment,
    emoji: row.emoji,
    tags: row.tags || [],
    colorTheme: row.color_theme,
    authorAvatar: row.author_avatar,
    isSafe: row.is_safe
  }));
};

// Insert a new confession
export const insertConfession = async (confession: Confession): Promise<boolean> => {
  const { error } = await supabase
    .from('confessions')
    .insert([{
      id: confession.id,
      type: confession.type,
      text: confession.text,
      image: confession.image || null,
      poll_options: confession.pollOptions || null,
      timestamp: confession.timestamp,
      reactions: confession.reactions,
      comments: confession.comments || [],
      sentiment: confession.sentiment,
      emoji: confession.emoji,
      tags: confession.tags,
      color_theme: confession.colorTheme,
      author_avatar: confession.authorAvatar,
      is_safe: confession.isSafe
    }]);

  if (error) {
    console.error('Error inserting confession:', error);
    return false;
  }

  return true;
};

// Update confession (for reactions, comments, poll votes)
export const updateConfession = async (id: string, updates: Partial<Confession>): Promise<boolean> => {
  const updateData: any = {};
  
  if (updates.reactions) updateData.reactions = updates.reactions;
  if (updates.comments) updateData.comments = updates.comments;
  if (updates.pollOptions) updateData.poll_options = updates.pollOptions;

  const { error } = await supabase
    .from('confessions')
    .update(updateData)
    .eq('id', id);

  if (error) {
    console.error('Error updating confession:', error);
    return false;
  }

  return true;
};

// Subscribe to realtime changes (optional)
export const subscribeToConfessions = (callback: (confession: Confession) => void) => {
  const channel = supabase
    .channel('confessions-channel')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'confessions' },
      (payload) => {
        const row = payload.new;
        const confession: Confession = {
          id: row.id,
          type: row.type,
          text: row.text,
          image: row.image || undefined,
          pollOptions: row.poll_options || undefined,
          timestamp: row.timestamp,
          reactions: row.reactions,
          comments: row.comments || [],
          sentiment: row.sentiment,
          emoji: row.emoji,
          tags: row.tags || [],
          colorTheme: row.color_theme,
          authorAvatar: row.author_avatar,
          isSafe: row.is_safe
        };
        callback(confession);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};