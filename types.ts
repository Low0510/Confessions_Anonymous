
export type ReactionType = 'love' | 'funny' | 'sad' | 'shock' | 'fire';
export type PostType = 'text' | 'poll' | 'video';

export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface Comment {
  id: string;
  text: string;
  timestamp: number;
  authorAvatar: Avatar; 
}

export interface Avatar {
  name: string;
  color: string; // Hex code
  icon: string; // Emoji
}

export interface Confession {
  id: string;
  type: PostType;
  text: string; // For polls, this is the Question
  image?: string; 
  audio?: string; 
  video?: string; // Base64 video data
  pollOptions?: PollOption[]; // Only if type === 'poll'
  timestamp: number;
  authorAvatar: Avatar;
  
  // Interaction Data
  reactions: Record<ReactionType, number>;
  comments: Comment[];
  
  // AI Generated fields
  tags: string[];
  sentiment: 'happy' | 'sad' | 'angry' | 'funny' | 'neutral' | 'romantic';
  emoji: string;
  colorTheme: string; 
  isSafe: boolean;
  flagReason?: string;
}

export interface AIAnalysisResult {
  tags: string[];
  sentiment: Confession['sentiment'];
  emoji: string;
  colorTheme: string;
  isSafe: boolean;
  flagReason?: string;
}

export interface UserSessionData {
  avatar: Avatar;
  xp: number;
  level: number;
  reactedPosts: Record<string, ReactionType>;
  votedPolls: Record<string, string>; // postId -> optionId
}

export type Tab = 'home' | 'search' | 'matchmaker' | 'profile';
