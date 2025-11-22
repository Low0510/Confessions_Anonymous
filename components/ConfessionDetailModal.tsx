
import React from 'react';
import { Confession, ReactionType } from '../types';
import { ConfessionCard } from './ConfessionCard';

interface ConfessionDetailModalProps {
  confession: Confession;
  theme: 'dark' | 'light';
  userReaction?: ReactionType;
  userVotedOptionId?: string;
  onClose: () => void;
  onReact: (id: string, type: ReactionType) => void;
  onComment: (id: string, text: string) => void;
  onVote: (id: string, optionId: string) => void;
}

export const ConfessionDetailModal: React.FC<ConfessionDetailModalProps> = ({
  confession,
  theme,
  userReaction,
  userVotedOptionId,
  onClose,
  onReact,
  onComment,
  onVote
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity" 
        onClick={onClose}
      ></div>
      
      {/* Modal Content */}
      <div className="relative w-full max-w-2xl z-10 my-8">
        <ConfessionCard 
          data={confession}
          viewMode="detail"
          theme={theme}
          userReaction={userReaction}
          userVotedOptionId={userVotedOptionId}
          onReact={onReact}
          onComment={onComment}
          onVote={onVote}
        />
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute -top-12 right-0 p-2 text-white/80 hover:text-white bg-black/20 hover:bg-black/40 rounded-full transition-colors backdrop-blur-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};
