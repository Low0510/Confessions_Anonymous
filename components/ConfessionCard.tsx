
import React, { useRef, useState, useEffect } from 'react';
import { Confession, ReactionType } from '../types';
import html2canvas from 'html2canvas';

interface ConfessionCardProps {
  data: Confession;
  userReaction?: ReactionType;
  userVotedOptionId?: string;
  theme: 'dark' | 'light';
  viewMode?: 'feed' | 'detail';
  onReact: (id: string, type: ReactionType) => void;
  onComment: (id: string, text: string) => void;
  onVote: (id: string, optionId: string) => void;
  onContentClick?: () => void;
}

const REACTION_ICONS: Record<ReactionType, string> = {
  love: '❤️',
  funny: '😂',
  sad: '😢',
  shock: '🤯',
  fire: '🔥'
};

export const ConfessionCard: React.FC<ConfessionCardProps> = ({ 
  data, 
  userReaction, 
  userVotedOptionId,
  theme,
  viewMode = 'feed',
  onReact, 
  onComment,
  onVote,
  onContentClick
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const isDark = theme === 'dark';

  // Dynamic classes based on theme
  const cardBgClass = isDark 
    ? 'bg-gray-900/60 border-white/10 shadow-black/50' 
    : 'bg-white/70 border-white/60 shadow-slate-200/50';
  const textPrimary = isDark ? 'text-white' : 'text-slate-800';
  const textSecondary = isDark ? 'text-gray-400' : 'text-slate-500';
  const dividerClass = isDark ? 'border-white/5' : 'border-slate-200/60';
  const inputBgClass = isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-100 border-slate-200 text-slate-800';

  const toggleAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (time: number) => {
    if (!time || isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    if (!cardRef.current || isSharing) return;
    setIsSharing(true);

    try {
      // Wait a brief moment to ensure UI is stable
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(cardRef.current, {
        useCORS: true, // Allow loading cross-origin images
        scale: 2, // High resolution
        backgroundColor: isDark ? '#0f172a' : '#f8fafc', // Match body bg
        logging: false,
        ignoreElements: (element) => element.classList.contains('no-share') // Hide elements tagged with no-share
      });

      const image = canvas.toDataURL("image/png");

      // Check if Web Share API is supported for files
      if (navigator.share) {
        const blob = await (await fetch(image)).blob();
        const file = new File([blob], `uniconfess-${data.id}.png`, { type: 'image/png' });
        
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
           await navigator.share({
             files: [file],
             title: 'UniConfess',
             text: 'Check out this confession on UniConfess!'
           });
           setIsSharing(false);
           return;
        }
      }

      // Fallback: Download the image
      const link = document.createElement('a');
      link.href = image;
      link.download = `uniconfess-${data.id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error) {
      console.error("Error generating share image", error);
      alert("Could not generate image. Text copied to clipboard instead.");
      
      // Fallback to text copy
      const fancyText = `✨ "${data.text}" - ${data.authorAvatar?.name || 'Anonymous'}`;
      navigator.clipboard.writeText(fancyText);
    } finally {
      setIsSharing(false);
    }
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim()) {
      onComment(data.id, newComment);
      setNewComment('');
    }
  };

  const timeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  };

  const totalVotes = data.pollOptions?.reduce((acc, opt) => acc + opt.votes, 0) || 0;
  const reactionKeys = Object.keys(REACTION_ICONS) as ReactionType[];

  return (
    <div className={`group relative mb-6 break-inside-avoid animate-fade-in-up ${viewMode === 'feed' ? 'cursor-pointer' : ''}`} onClick={viewMode === 'feed' ? onContentClick : undefined}>
      {/* Glow effect behind the card - No hover movement */}
      <div 
        className="absolute -inset-0.5 bg-gradient-to-r opacity-50 blur transition duration-1000 group-hover:opacity-100 rounded-3xl no-share"
        style={{ 
          backgroundImage: `linear-gradient(to right, ${data.colorTheme}, #4f46e5)`,
          opacity: isDark ? 0.3 : 0.6 
        }}
      ></div>
      
      <div 
        ref={cardRef}
        className={`relative backdrop-blur-xl border rounded-3xl overflow-hidden shadow-2xl transition-colors duration-300 ${cardBgClass} ${viewMode === 'feed' ? 'hover:shadow-indigo-500/10 hover:border-indigo-500/30' : ''}`}
      >
        
        {/* Header */}
        <div className={`px-5 py-4 flex justify-between items-start border-b ${dividerClass}`}>
          <div className="flex items-center gap-3">
            <div 
              className="w-9 h-9 rounded-full flex items-center justify-center text-lg shadow-inner relative"
              style={{ backgroundColor: data.authorAvatar?.color || data.colorTheme }}
            >
              {data.authorAvatar?.icon || '👤'}
              <div className="absolute -bottom-1 -right-1 bg-white dark:bg-gray-800 rounded-full p-0.5 text-[9px]">
                  {data.emoji}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`font-display font-bold tracking-wide text-sm ${textPrimary}`}>
                   {data.authorAvatar?.name || 'Anonymous'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md uppercase tracking-wider border ${isDark ? 'bg-white/5 text-white/60 border-white/10' : 'bg-slate-200/50 text-slate-500 border-slate-200'}`}>
                  {data.type}
                </span>
                <span className={`text-[10px] ${textSecondary}`}>{timeAgo(data.timestamp)}</span>
              </div>
            </div>
          </div>
          
          <button 
            onClick={handleShare} 
            disabled={isSharing}
            className={`no-share ${textSecondary} hover:text-indigo-500 transition-colors p-1.5 hover:bg-white/5 rounded-full`}
          >
            {isSharing ? (
               <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
               </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4">
          <h3 className={`${textPrimary} text-base leading-relaxed whitespace-pre-wrap font-light mb-4`}>
            {data.text}
          </h3>

          {/* Video Player */}
          {data.video && (
              <div 
                className="mb-4 rounded-xl overflow-hidden border border-white/10 shadow-lg bg-black relative"
                onClick={(e) => e.stopPropagation()} // Allow video controls to work
              >
                 {/* Use a thumbnail for feed view, or auto-play on hover? Standard video tag works */}
                 <video src={data.video} controls className="w-full h-auto bg-black max-h-[400px]" />
              </div>
          )}

          {/* Poll Rendering */}
          {data.type === 'poll' && data.pollOptions && (
            <div 
              className="space-y-2 mb-4"
              onClick={(e) => e.stopPropagation()} // Allow poll interaction without opening details
            >
              {data.pollOptions.map((option) => {
                const percentage = totalVotes === 0 ? 0 : Math.round((option.votes / totalVotes) * 100);
                const isVoted = userVotedOptionId === option.id;
                const isWinner = Math.max(...data.pollOptions!.map(o => o.votes)) === option.votes && totalVotes > 0;

                return (
                  <div
                    key={option.id}
                    onClick={() => onVote(data.id, option.id)}
                    className={`relative w-full overflow-hidden rounded-lg border transition-all cursor-pointer group/poll ${
                      isVoted 
                        ? 'border-indigo-500 ring-1 ring-indigo-500' 
                        : isDark ? 'border-white/10 hover:border-white/30' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div 
                      className={`absolute top-0 left-0 bottom-0 transition-all duration-1000 ease-out ${isVoted ? 'bg-indigo-500/20' : 'bg-gray-500/10'}`}
                      style={{ width: `${percentage}%` }}
                    ></div>

                    <div className="relative flex justify-between items-center px-3 py-2.5">
                      <span className={`font-medium text-sm z-10 ${textPrimary} ${isVoted ? 'font-bold' : ''}`}>
                        {option.text}
                        {isVoted && <span className="ml-2 text-[10px] bg-indigo-500 text-white px-1 py-0.5 rounded">You</span>}
                      </span>
                      {userVotedOptionId && (
                         <div className="flex items-center gap-1.5 z-10">
                           {isWinner && <span className="text-sm animate-bounce-subtle">🏆</span>}
                           <span className={`text-xs font-bold ${textPrimary}`}>{percentage}%</span>
                         </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div className={`text-[10px] text-right ${textSecondary}`}>
                {totalVotes} votes
              </div>
            </div>
          )}

          {data.image && (
            <div className="mb-4 rounded-xl overflow-hidden border border-white/10 shadow-lg">
              <img src={data.image} alt="Confession" className="w-full h-auto object-cover" />
            </div>
          )}

          {data.audio && (
            <div className="mb-4" onClick={(e) => e.stopPropagation()}>
              <audio 
                ref={audioRef} 
                src={data.audio} 
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)} 
                className="hidden" 
              />
              <div
                className={`w-full p-3 rounded-xl border transition-all ${isDark ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}
              >
                <div className="flex items-center gap-3">
                    <div 
                      onClick={toggleAudio}
                      className="cursor-pointer w-10 h-10 rounded-full flex items-center justify-center text-white shadow-lg relative overflow-hidden flex-shrink-0 transition-transform hover:scale-105 active:scale-95"
                      style={{ backgroundColor: data.colorTheme }}
                    >
                       {!isPlaying ? (
                          <svg className="w-4 h-4 ml-0.5 relative z-10" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                       ) : (
                          <svg className="w-4 h-4 relative z-10" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                       )}
                    </div>
                    <div className="flex flex-col w-full gap-1.5">
                        <div className="flex justify-between items-center text-[10px] font-bold tracking-wide opacity-70 uppercase">
                            <span className={textPrimary}>Audio Clip</span>
                            <span className={textSecondary}>{formatTime(currentTime)} / {formatTime(duration)}</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max={duration || 0}
                            step="0.1"
                            value={currentTime}
                            onChange={handleSeek}
                            onClick={(e) => e.stopPropagation()}
                            className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-indigo-500 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}
                        />
                    </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-1.5 mt-2">
            {data.tags.map((tag, i) => (
              <span key={i} className="text-[10px] font-medium text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded hover:bg-blue-500/20 transition-colors">
                #{tag}
              </span>
            ))}
          </div>
        </div>

        {/* Action Bar */}
        <div className={`px-5 py-3 border-t flex items-center justify-between ${dividerClass} ${isDark ? 'bg-black/20' : 'bg-slate-50/50'}`} onClick={(e) => e.stopPropagation()}>
          
          <div className="flex items-center gap-3 relative">
            {/* Main React Button */}
            <button 
              onClick={() => setShowReactions(!showReactions)}
              className={`no-share flex items-center gap-1.5 px-2.5 py-1.5 rounded-full transition-all duration-300 group/react ${showReactions ? 'bg-indigo-500/20 text-indigo-500' : `${textSecondary} hover:bg-white/5 hover:text-indigo-400`}`}
            >
               <span className="text-lg transition-transform duration-300 group-hover/react:scale-125 group-hover/react:-rotate-12 drop-shadow-sm">
                 {userReaction ? REACTION_ICONS[userReaction] : '😶'}
               </span>
            </button>

            {/* Individual Reaction Counts */}
            <div className="flex items-center gap-1.5">
              {reactionKeys.map((type) => {
                 const count = data.reactions[type];
                 if (count === 0) return null;
                 const isUserReaction = userReaction === type;
                 
                 return (
                    <div
                        key={type}
                        className={`
                            flex items-center gap-1 px-2 py-0.5 rounded-full border text-[12px] font-bold 
                            ${isUserReaction 
                                ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' 
                                : isDark ? 'bg-white/5 border-white/5 text-gray-400' : 'bg-white border-slate-200 text-slate-600'}
                        `}
                    >
                        <span>{REACTION_ICONS[type]}</span>
                        <span>{count}</span>
                    </div>
                 );
              })}
            </div>

            {/* Popup Menu */}
            {showReactions && (
              <div className={`no-share absolute bottom-full left-0 mb-2 p-1.5 rounded-2xl flex gap-1 shadow-2xl animate-fade-in-up origin-bottom-left z-20 backdrop-blur-xl border ${isDark ? 'bg-gray-900/95 border-white/20' : 'bg-white/95 border-slate-200'}`}>
                {reactionKeys.map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      onReact(data.id, type);
                      setShowReactions(false);
                    }}
                    className={`p-1.5 rounded-xl transition-all duration-200 hover:scale-125 active:scale-90 ${userReaction === type ? 'bg-white/10' : 'hover:bg-white/5'}`}
                  >
                    <span className="text-xl drop-shadow-sm select-none">{REACTION_ICONS[type]}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Comment Count / Toggle */}
          <button 
              onClick={viewMode === 'feed' ? onContentClick : undefined}
              className={`no-share flex items-center gap-1.5 px-2.5 py-1.5 rounded-full hover:bg-black/5 transition-all ${textSecondary} hover:text-blue-500 ${viewMode === 'detail' ? 'cursor-default' : ''}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span className="font-medium text-xs">{data.comments?.length || 0}</span>
          </button>
        </div>

        {/* Comments Section - Only Visible in DETAIL View */}
        {viewMode === 'detail' && (
          <div className={`no-share border-t p-5 animate-fade-in-up ${dividerClass} ${isDark ? 'bg-black/30' : 'bg-slate-50'}`}>
             <div className="max-h-[400px] overflow-y-auto space-y-3 mb-4 pr-2 custom-scrollbar">
               {data.comments && data.comments.length > 0 ? (
                 data.comments.map(comment => (
                   <div key={comment.id} className="flex gap-3">
                     <div 
                        className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
                        style={{ backgroundColor: comment.authorAvatar?.color || '#666' }}
                     >
                       {comment.authorAvatar?.icon}
                     </div>
                     <div className={`rounded-2xl rounded-tl-none p-3 flex-1 border ${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
                        <div className="flex items-center justify-between mb-1">
                            <span className={`text-xs font-bold opacity-70 ${textPrimary}`}>{comment.authorAvatar?.name || 'Unknown'}</span>
                            <span className={`text-[10px] ${textSecondary}`}>{timeAgo(comment.timestamp)}</span>
                        </div>
                       <p className={`text-sm ${textPrimary}`}>{comment.text}</p>
                     </div>
                   </div>
                 ))
               ) : (
                 <div className={`text-center py-6 text-sm italic ${textSecondary}`}>
                    <div className="text-2xl mb-2">💬</div>
                    No comments yet. Start the conversation!
                 </div>
               )}
             </div>

             <form onSubmit={handleCommentSubmit} className="relative mt-4">
               <input
                 ref={commentInputRef}
                 type="text"
                 value={newComment}
                 onChange={(e) => setNewComment(e.target.value)}
                 placeholder="Write an anonymous comment..."
                 className={`w-full rounded-full py-3 pl-4 pr-12 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner ${inputBgClass}`}
                 autoFocus
               />
               <button 
                 type="submit"
                 disabled={!newComment.trim()}
                 className="absolute right-1.5 top-1.5 p-1.5 rounded-full bg-indigo-600 text-white disabled:opacity-50 disabled:bg-transparent disabled:text-gray-500 hover:bg-indigo-500 transition-all"
               >
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                   <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                 </svg>
               </button>
             </form>
          </div>
        )}

      </div>
    </div>
  );
};
    