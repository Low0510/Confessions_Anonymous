import React, { useState, useEffect, useMemo } from 'react';
import { Confession, UserSessionData, ReactionType, Comment, Avatar } from './types';
import { ConfessionCard } from './components/ConfessionCard';
import { ConfessionDetailModal } from './components/ConfessionDetailModal';
import { CreatePostModal } from './components/CreatePostModal';
import { fetchConfessions, insertConfession, updateConfession, subscribeToConfessions } from './lib/supabaseService';
import { MatchmakerMode } from './components/MatchmakerMode';


// Avatar Generators
const ADJECTIVES = ['Neon', 'Cosmic', 'Glitchy', 'Happy', 'Sleepy', 'Grumpy', 'Shiny', 'Retro', 'Quantum'];
const ANIMALS = ['Panda', 'Cat', 'Fox', 'Axolotl', 'Badger', 'Owl', 'Raccoon', 'Koala', 'Gecko'];
const ICONS = ['🐼', '🐱', '🦊', '🦎', '🦡', '🦉', '🦝', '🐨', '🐊'];
const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e'];

const generateAvatar = (): Avatar => {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animalIdx = Math.floor(Math.random() * ANIMALS.length);
  return {
    name: `${adj} ${ANIMALS[animalIdx]}`,
    icon: ICONS[animalIdx],
    color: COLORS[Math.floor(Math.random() * COLORS.length)]
  };
};

type Tab = 'home' | 'search' | 'profile';

const App = () => {
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedConfessionId, setSelectedConfessionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('home');
  
  // Feed Filter State
  const [feedFilter, setFeedFilter] = useState<'all' | 'popular' | 'polls'>('all');
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  
  const [userSession, setUserSession] = useState<UserSessionData>({ 
      reactedPosts: {}, 
      votedPolls: {}, 
      xp: 0, 
      level: 1, 
      avatar: generateAvatar()
  });
  const [isLoading, setIsLoading] = useState(true);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Load Data from Supabase
  useEffect(() => {
    const loadData = async () => {
      // Load confessions from Supabase
      const fetchedConfessions = await fetchConfessions();
      setConfessions(fetchedConfessions);

      // Load User Session from localStorage (user data stays local)
      const savedSession = localStorage.getItem('uni_confessions_user_session_v2');
      if (savedSession) {
        setUserSession(JSON.parse(savedSession));
      } else {
        setUserSession({
          reactedPosts: {},
          votedPolls: {},
          xp: 0,
          level: 1,
          avatar: generateAvatar()
        });
      }

      // Load Theme from localStorage
      const savedTheme = localStorage.getItem('uni_theme');
      if (savedTheme) {
        setTheme(savedTheme as 'dark' | 'light');
      }

      setIsLoading(false);
    };

    loadData();

    // Subscribe to realtime updates (optional)
    const unsubscribe = subscribeToConfessions((newConfession) => {
      setConfessions(prev => [newConfession, ...prev]);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Save User Session to localStorage
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('uni_confessions_user_session_v2', JSON.stringify(userSession));
    }
  }, [userSession, isLoading]);

  // Save Theme to localStorage
  useEffect(() => {
    if (!isLoading) {
        localStorage.setItem('uni_theme', theme);
    }
  }, [theme, isLoading]);

  const toggleTheme = () => {
      setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const addXP = (amount: number) => {
      setUserSession(prev => {
          const newXP = prev.xp + amount;
          const newLevel = Math.floor(newXP / 100) + 1;
          return { ...prev, xp: newXP, level: newLevel };
      });
  };

  const handlePost = async (newPostData: Omit<Confession, 'id' | 'timestamp' | 'reactions' | 'comments' | 'authorAvatar'>) => {
    const newConfession: Confession = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      reactions: { love: 0, funny: 0, sad: 0, shock: 0, fire: 0 },
      comments: [],
      authorAvatar: userSession.avatar,
      isSafe: true, 
      ...newPostData
    };
    
    // Optimistic update
    // setConfessions(prev => [newConfession, ...prev]);
    
    // Save to Supabase
    const success = await insertConfession(newConfession);
    if (!success) {
      // Rollback on error
      setConfessions(prev => prev.filter(c => c.id !== newConfession.id));
      alert('Failed to post confession. Please try again.');
      return;
    }
    
    addXP(20); 
    setActiveTab('home');
  };

  const handleReact = async (id: string, type: ReactionType) => {
    const confession = confessions.find(c => c.id === id);
    if (!confession) return;

    if (userSession.reactedPosts[id] === type) {
      // Remove reaction
      const newSession = { ...userSession };
      delete newSession.reactedPosts[id];
      setUserSession(newSession);

      const updatedReactions = {
        ...confession.reactions,
        [type]: Math.max(0, confession.reactions[type] - 1)
      };

      // Optimistic update
      setConfessions(prev => prev.map(c => 
        c.id === id ? { ...c, reactions: updatedReactions } : c
      ));

      // Update in Supabase
      await updateConfession(id, { reactions: updatedReactions });
    } else {
      // Add/Change reaction
      const oldType = userSession.reactedPosts[id];
      
      const newSession = { 
        ...userSession, 
        reactedPosts: { ...userSession.reactedPosts, [id]: type } 
      };
      setUserSession(newSession);
      
      if (!oldType) addXP(2); 

      const updatedReactions = { ...confession.reactions };
      if (oldType) {
        updatedReactions[oldType] = Math.max(0, updatedReactions[oldType] - 1);
      }
      updatedReactions[type] = updatedReactions[type] + 1;

      // Optimistic update
      setConfessions(prev => prev.map(c => 
        c.id === id ? { ...c, reactions: updatedReactions } : c
      ));

      // Update in Supabase
      await updateConfession(id, { reactions: updatedReactions });
    }
  };

  const handleComment = async (id: string, text: string) => {
    const confession = confessions.find(c => c.id === id);
    if (!confession) return;

    const newComment: Comment = {
      id: Math.random().toString(36).substr(2, 9),
      text,
      timestamp: Date.now(),
      authorAvatar: userSession.avatar
    };

    const updatedComments = [...(confession.comments || []), newComment];

    // Optimistic update
    setConfessions(prev => prev.map(c =>
      c.id === id ? { ...c, comments: updatedComments } : c
    ));

    // Update in Supabase
    await updateConfession(id, { comments: updatedComments });
    
    addXP(5);
  };

  const handleVote = async (confessionId: string, optionId: string) => {
    if (userSession.votedPolls?.[confessionId]) return;

    const confession = confessions.find(c => c.id === confessionId);
    if (!confession || !confession.pollOptions) return;

    const newSession = { 
        ...userSession, 
        votedPolls: { ...(userSession.votedPolls || {}), [confessionId]: optionId } 
    };
    setUserSession(newSession);
    addXP(5);

    const updatedPollOptions = confession.pollOptions.map(opt => 
      opt.id === optionId ? { ...opt, votes: opt.votes + 1 } : opt
    );

    // Optimistic update
    setConfessions(prev => prev.map(c =>
      c.id === confessionId ? { ...c, pollOptions: updatedPollOptions } : c
    ));

    // Update in Supabase
    await updateConfession(confessionId, { pollOptions: updatedPollOptions });
  };

  // -- Filter Logic --

  const feedConfessions = useMemo(() => {
    let sorted = [...confessions];
    if (feedFilter === 'polls') {
        sorted = sorted.filter(c => c.type === 'poll');
    }
    if (feedFilter === 'popular') {
      sorted.sort((a, b) => {
        const reactionsA = (Object.values(a.reactions) as number[]).reduce((x, y) => x + y, 0);
        const reactionsB = (Object.values(b.reactions) as number[]).reduce((x, y) => x + y, 0);
        return reactionsB - reactionsA;
      });
    } else {
      sorted.sort((a, b) => b.timestamp - a.timestamp);
    }
    return sorted;
  }, [confessions, feedFilter]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const lowerQ = searchQuery.toLowerCase();
    return confessions.filter(c => 
        c.text.toLowerCase().includes(lowerQ) ||
        c.tags.some(t => t.toLowerCase().includes(lowerQ))
    );
  }, [confessions, searchQuery]);

  const trendingTags = useMemo(() => {
      const tags = confessions.flatMap(c => c.tags);
      const counts: Record<string, number> = {};
      tags.forEach(t => counts[t] = (counts[t] || 0) + 1);
      return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(e => e[0]);
  }, [confessions]);

  const selectedConfession = useMemo(() => {
    return confessions.find(c => c.id === selectedConfessionId);
  }, [confessions, selectedConfessionId]);

  if (isLoading) return null;
  const isDark = theme === 'dark';

  // Helper for styling
  const cardBg = isDark ? 'bg-gray-900/60 border-white/10' : 'bg-white/70 border-slate-200';
  const textColor = isDark ? 'text-white' : 'text-slate-900';
  const subTextColor = isDark ? 'text-gray-400' : 'text-slate-500';

  return (
    <div className={`min-h-screen font-sans selection:bg-purple-500/30 transition-colors duration-500 pb-32 ${isDark ? 'bg-[#020617] text-slate-200' : 'bg-[#f8fafc] text-slate-800'}`}>
      
      {/* Ambient Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className={`absolute top-0 left-1/4 w-96 h-96 rounded-full blur-[100px] animate-pulse transition-colors duration-700 ${isDark ? 'bg-indigo-600/20' : 'bg-indigo-400/20'}`} style={{ animationDuration: '8s' }}></div>
        <div className={`absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-[100px] animate-pulse transition-colors duration-700 ${isDark ? 'bg-fuchsia-600/20' : 'bg-pink-400/20'}`} style={{ animationDuration: '10s' }}></div>
      </div>

      {/* --- MINIMAL FLOATING HEADERS --- */}
      
      {/* Top Left: Brand Pill */}
      <div className={`fixed top-6 left-4 z-40 backdrop-blur-2xl border rounded-full px-4 py-2 shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer ${isDark ? 'bg-black/40 border-white/10' : 'bg-white/60 border-white/50'}`} onClick={() => setActiveTab('home')}>
         <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-fuchsia-500 flex items-center justify-center text-[10px] font-bold text-white">
                C
            </div>
            <h1 className={`text-sm font-display font-bold tracking-tight ${textColor}`}>
              Confess<span className="text-indigo-500">.io</span>
            </h1>
         </div>
      </div>

      {/* Top Right: Theme Toggle Pill */}
      <button 
        onClick={toggleTheme}
        className={`fixed top-6 right-4 z-40 p-2.5 rounded-full backdrop-blur-2xl border shadow-lg transition-all duration-300 hover:scale-105 active:scale-95 ${isDark ? 'bg-black/40 border-white/10 text-yellow-400' : 'bg-white/60 border-white/50 text-slate-600'}`}
      >
        {isDark ? (
           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
           </svg>
        ) : (
           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
           </svg>
        )}
      </button>

      <main className="max-w-6xl mx-auto px-4 pt-24 relative z-10">
        
        {/* --- VIEW: HOME --- */}
        {activeTab === 'home' && (
            <div className="animate-fade-in-up">
                <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar px-2 justify-center">
                    {['all', 'popular', 'polls'].map((f) => (
                        <button 
                            key={f}
                            onClick={() => setFeedFilter(f as any)} 
                            className={`px-5 py-2 rounded-full text-xs font-bold capitalize whitespace-nowrap transition-all ${feedFilter === f ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25' : isDark ? 'bg-white/5 text-slate-400 hover:text-white border border-white/5' : 'bg-white text-slate-500 hover:text-slate-800 border border-slate-200 shadow-sm'}`}
                        >
                            {f === 'all' ? 'Fresh' : f} {f === 'popular' && '🔥'} {f === 'polls' && '📊'}
                        </button>
                    ))}
                </div>

                {/* MASONRY GRID LAYOUT */}
                <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
                    {feedConfessions.map((confession) => (
                        <ConfessionCard 
                          key={confession.id} 
                          data={confession} 
                          theme={theme}
                          viewMode="feed"
                          userReaction={userSession.reactedPosts[confession.id]}
                          userVotedOptionId={userSession.votedPolls?.[confession.id]}
                          onReact={handleReact}
                          onComment={handleComment}
                          onVote={handleVote}
                          onContentClick={() => setSelectedConfessionId(confession.id)}
                        />
                    ))}
                    {feedConfessions.length === 0 && (
                        <div className="text-center py-20 opacity-50 col-span-full">No confessions found.</div>
                    )}
                </div>
            </div>
        )}

        {/* --- VIEW: SEARCH --- */}
        {activeTab === 'search' && (
            <div className="animate-fade-in-up max-w-2xl mx-auto">
                <div className="relative mb-8">
                    <input 
                        type="text" 
                        placeholder="Search posts, tags, feelings..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={`w-full py-4 pl-12 pr-4 rounded-2xl text-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-lg ${isDark ? 'bg-white/5 text-white placeholder-gray-500' : 'bg-white text-slate-900 placeholder-slate-400'}`}
                        autoFocus
                    />
                    <svg className={`absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 ${isDark ? 'text-gray-500' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>

                {!searchQuery && (
                    <div className="mb-8">
                        <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 ml-1 ${subTextColor}`}>Trending Tags</h3>
                        <div className="flex flex-wrap gap-2">
                            {trendingTags.map(tag => (
                                <button 
                                    key={tag}
                                    onClick={() => setSearchQuery(tag)}
                                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors border ${isDark ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20' : 'bg-indigo-50 border-indigo-100 text-indigo-600 hover:bg-indigo-100'}`}
                                >
                                    #{tag}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="space-y-6">
                    {searchQuery && searchResults.map((confession) => (
                        <ConfessionCard 
                            key={confession.id} 
                            data={confession} 
                            theme={theme}
                            viewMode="feed"
                            userReaction={userSession.reactedPosts[confession.id]}
                            userVotedOptionId={userSession.votedPolls?.[confession.id]}
                            onReact={handleReact}
                            onComment={handleComment}
                            onVote={handleVote}
                            onContentClick={() => setSelectedConfessionId(confession.id)}
                        />
                    ))}
                    {searchQuery && searchResults.length === 0 && (
                        <div className="text-center py-12">
                            <div className="text-4xl mb-3">🕵️</div>
                            <p className={subTextColor}>No results found for "{searchQuery}"</p>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* --- VIEW: MATCHMAKER (NEW) --- */}
        {activeTab === 'matchmaker' && (
            <MatchmakerMode theme={theme} />
        )}

        {/* --- VIEW: PROFILE --- */}
        {activeTab === 'profile' && (
            <div className="animate-fade-in-up space-y-6 max-w-2xl mx-auto">
                <div className={`p-8 rounded-3xl text-center relative overflow-hidden backdrop-blur-md ${isDark ? 'bg-white/5 border border-white/10' : 'bg-white/60 border border-white/40 shadow-lg'}`}>
                    <div className={`w-24 h-24 mx-auto rounded-2xl flex items-center justify-center text-5xl shadow-2xl mb-4 relative z-10`} style={{ backgroundColor: userSession.avatar.color }}>
                        {userSession.avatar.icon}
                    </div>
                    <h2 className={`text-2xl font-bold mb-1 ${textColor}`}>{userSession.avatar.name}</h2>
                    <p className={`text-sm ${subTextColor}`}>Anonymous Identity</p>

                    <div className="grid grid-cols-3 gap-4 mt-8 relative z-10">
                        <div className={`p-4 rounded-2xl ${isDark ? 'bg-black/20' : 'bg-slate-50'}`}>
                            <div className="text-2xl font-bold text-indigo-500">{userSession.level}</div>
                            <div className="text-[10px] uppercase tracking-wider opacity-60">Level</div>
                        </div>
                        <div className={`p-4 rounded-2xl ${isDark ? 'bg-black/20' : 'bg-slate-50'}`}>
                            <div className="text-2xl font-bold text-purple-500">{userSession.xp}</div>
                            <div className="text-[10px] uppercase tracking-wider opacity-60">XP</div>
                        </div>
                        <div className={`p-4 rounded-2xl ${isDark ? 'bg-black/20' : 'bg-slate-50'}`}>
                            <div className="text-2xl font-bold text-pink-500">{Object.keys(userSession.reactedPosts).length}</div>
                            <div className="text-[10px] uppercase tracking-wider opacity-60">Reacts</div>
                        </div>
                    </div>
                </div>
                
                <div className={`p-6 rounded-3xl border ${cardBg}`}>
                    <h3 className={`font-bold mb-4 ${textColor}`}>How it works</h3>
                    <ul className={`space-y-3 text-sm ${subTextColor}`}>
                        <li className="flex items-center gap-3">
                            <span className="text-lg">🔒</span>
                            <span>Everything is anonymous. No login required.</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <span className="text-lg">💾</span>
                            <span>Your level and identity are saved to this browser.</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <span className="text-lg">🤖</span>
                            <span>AI moderates content to keep it safe.</span>
                        </li>
                    </ul>
                </div>
            </div>
        )}

      </main>

      {/* --- FLOATING DOCK NAVIGATION (New Minimal Design) --- */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
        <div className={`flex items-center gap-1 p-2 rounded-full shadow-2xl backdrop-blur-2xl border transition-colors duration-300 ${isDark ? 'bg-black/60 border-white/10' : 'bg-white/80 border-white/40 shadow-slate-200/50'}`}>
            
            {/* Home Tab */}
            <button 
                onClick={() => setActiveTab('home')}
                className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${activeTab === 'home' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' : 'text-gray-400 hover:bg-black/5 hover:text-gray-500'}`}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={activeTab === 'home' ? 2.5 : 1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                {activeTab === 'home' && <span className="absolute -bottom-6 text-[10px] font-bold opacity-0">Home</span>}
            </button>

            {/* Search Tab */}
            <button 
                onClick={() => setActiveTab('search')}
                className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${activeTab === 'search' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' : 'text-gray-400 hover:bg-black/5 hover:text-gray-500'}`}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={activeTab === 'search' ? 2.5 : 1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
            </button>

            {/* Matchmaker Tab (NEW) */}
             <button 
                onClick={() => setActiveTab('matchmaker')}
                className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${activeTab === 'matchmaker' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30' : 'text-gray-400 hover:bg-black/5 hover:text-gray-500'}`}
            >
                <span className={`text-xl ${activeTab === 'matchmaker' ? 'animate-pulse' : ''}`}>💘</span>
            </button>

            {/* CREATE ACTION (Central) */}
            <div className="w-px h-8 bg-gray-500/20 mx-1"></div>
            <button 
                onClick={() => setIsModalOpen(true)}
                className={`group w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 ${isDark ? 'bg-white text-black' : 'bg-black text-white'}`}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 transition-transform duration-300 group-hover:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
            </button>
            <div className="w-px h-8 bg-gray-500/20 mx-1"></div>

            {/* Profile Tab */}
            <button 
                onClick={() => setActiveTab('profile')}
                className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${activeTab === 'profile' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' : 'text-gray-400 hover:bg-black/5 hover:text-gray-500'}`}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={activeTab === 'profile' ? 2.5 : 1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
            </button>
        </div>
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <CreatePostModal 
          onClose={() => setIsModalOpen(false)}
          onPost={handlePost}
          theme={theme}
        />
      )}

      {/* Detail View Modal */}
      {selectedConfession && (
        <ConfessionDetailModal 
          confession={selectedConfession}
          theme={theme}
          userReaction={userSession.reactedPosts[selectedConfession.id]}
          userVotedOptionId={userSession.votedPolls?.[selectedConfession.id]}
          onClose={() => setSelectedConfessionId(null)}
          onReact={handleReact}
          onComment={handleComment}
          onVote={handleVote}
        />
      )}
    </div>
  );
};

export default App;
