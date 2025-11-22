
import React, { useState, useRef } from 'react';
import { analyzeConfession } from '../services/geminiService';
import { Confession, PostType, PollOption } from '../types';
import { AudioRecorder } from './AudioRecorder';
import { VideoRecorder } from './VideoRecorder';

interface CreatePostModalProps {
  onClose: () => void;
  onPost: (confession: Omit<Confession, 'id' | 'timestamp' | 'reactions' | 'comments' | 'authorAvatar'>) => void;
  theme: 'dark' | 'light';
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({ onClose, onPost, theme }) => {
  const [postType, setPostType] = useState<PostType>('text');
  const [text, setText] = useState('');
  const [image, setImage] = useState<string | undefined>(undefined);
  const [audio, setAudio] = useState<string | undefined>(undefined);
  const [video, setVideo] = useState<string | undefined>(undefined);
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);
  const [showVideoRecorder, setShowVideoRecorder] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  // Styles based on theme
  const bgClass = theme === 'dark' ? 'bg-[#0f172a] border-white/10' : 'bg-white/90 border-black/5';
  const textClass = theme === 'dark' ? 'text-white placeholder-gray-600' : 'text-slate-800 placeholder-slate-400';
  const subTextClass = theme === 'dark' ? 'text-gray-400' : 'text-slate-500';
  const inputBgClass = theme === 'dark' ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-100 border-slate-200 text-slate-800';

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAudio(reader.result as string);
        setShowAudioRecorder(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddOption = () => {
    if (pollOptions.length < 4) {
      setPollOptions([...pollOptions, '']);
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...pollOptions];
    newOptions[index] = value;
    setPollOptions(newOptions);
  };

  const handleSubmit = async () => {
    // Validation
    if (!text.trim()) return;
    if (postType === 'poll' && pollOptions.some(opt => !opt.trim())) return;

    setIsAnalyzing(true);
    
    // Call Gemini API to analyze (works for both normal posts and poll questions)
    const aiResult = await analyzeConfession(text, image);

    if (!aiResult.isSafe) {
        const proceed = window.confirm(`⚠️ Safety Alert: The AI flagged this content as potentially unsafe (${aiResult.flagReason || "general safety"}). \n\nWe want to keep this space positive. Are you sure you want to post this?`);
        if (!proceed) {
            setIsAnalyzing(false);
            return;
        }
    }

    const finalPollOptions: PollOption[] | undefined = postType === 'poll' 
      ? pollOptions.map((opt, i) => ({
          id: `opt_${i}_${Date.now()}`,
          text: opt,
          votes: 0
        }))
      : undefined;

    onPost({
      type: postType,
      text, // This acts as the Question for polls
      image: postType === 'text' ? image : undefined,
      audio: postType === 'text' ? audio : undefined,
      video: postType === 'video' ? video : undefined,
      pollOptions: finalPollOptions,
      ...aiResult
    });

    setIsAnalyzing(false);
    onClose();
  };

  const tabs: { id: PostType, label: string, icon: string }[] = [
      { id: 'text', label: 'Story', icon: '✍️' },
      { id: 'poll', label: 'Poll', icon: '📊' },
      { id: 'video', label: 'Video', icon: '📹' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md transition-opacity" onClick={onClose}></div>
      
      <div className={`${bgClass} backdrop-blur-xl border rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative animate-fade-in-up z-10 transition-colors duration-300`}>
        
        {/* Header */}
        <div className={`p-5 border-b ${theme === 'dark' ? 'border-white/5' : 'border-slate-200'} flex justify-between items-center`}>
          <h2 className={`text-xl font-display font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Create Confession
          </h2>
          <button onClick={onClose} className={`p-2 rounded-full hover:bg-black/5 transition-colors ${subTextClass}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="px-2 pt-2 flex gap-1 bg-black/5">
          {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setPostType(tab.id)}
                className={`flex-1 py-3 text-sm font-bold transition-all rounded-t-xl flex items-center justify-center gap-2 ${
                    postType === tab.id 
                    ? (theme === 'dark' ? 'bg-[#0f172a] text-indigo-400' : 'bg-white text-indigo-600 shadow-sm') 
                    : 'text-gray-500 hover:text-gray-400'
                }`}
              >
                  <span>{tab.icon}</span>
                  {tab.label}
              </button>
          ))}
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <textarea
            className={`w-full bg-transparent text-lg resize-none focus:outline-none min-h-[100px] ${textClass}`}
            placeholder={
                postType === 'poll' ? "Ask a question..." :
                postType === 'video' ? "Describe what you're showing..." :
                "Speak your mind... (Nobody will know it's you)"
            }
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoFocus
          />

          {postType === 'poll' && (
            <div className="space-y-3 animate-fade-in-up">
              {pollOptions.map((opt, idx) => (
                <input
                  key={idx}
                  type="text"
                  value={opt}
                  onChange={(e) => handleOptionChange(idx, e.target.value)}
                  placeholder={`Option ${idx + 1}`}
                  className={`w-full px-4 py-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all ${inputBgClass}`}
                />
              ))}
              {pollOptions.length < 4 && (
                <button 
                  onClick={handleAddOption}
                  className="text-sm text-indigo-500 font-medium hover:text-indigo-400 flex items-center gap-1"
                >
                  + Add Option
                </button>
              )}
            </div>
          )}

          {postType === 'video' && (
              <div className="animate-fade-in-up">
                  {!video && !showVideoRecorder && (
                       <button 
                       onClick={() => setShowVideoRecorder(true)}
                       className="w-full py-12 border-2 border-dashed border-indigo-500/30 rounded-2xl flex flex-col items-center justify-center hover:bg-indigo-500/5 transition-colors group"
                     >
                       <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                           <span className="text-3xl">📹</span>
                       </div>
                       <span className="font-medium text-indigo-400">Record Video (10s)</span>
                     </button>
                  )}

                  {showVideoRecorder && (
                      <VideoRecorder 
                        onRecordingComplete={(data) => {
                            setVideo(data);
                            setShowVideoRecorder(false);
                        }}
                        onCancel={() => setShowVideoRecorder(false)}
                      />
                  )}

                  {video && (
                      <div className="relative rounded-xl overflow-hidden border border-indigo-500/30">
                          <video src={video} controls className="w-full aspect-video bg-black" />
                          <button 
                            onClick={() => setVideo(undefined)}
                            className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600"
                          >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                      </div>
                  )}
              </div>
          )}

          {postType === 'text' && (
            <>
              {image && (
                <div className={`relative rounded-xl overflow-hidden border group ${theme === 'dark' ? 'border-white/10' : 'border-slate-200'}`}>
                  <img src={image} alt="Upload preview" className="w-full h-48 object-cover" />
                  <button 
                    onClick={() => setImage(undefined)}
                    className="absolute top-2 right-2 bg-black/60 hover:bg-red-500 p-1.5 rounded-full text-white transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              )}

              {audio && !showAudioRecorder && (
                <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-xl border border-indigo-500/20">
                  <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white">
                    🎤
                  </div>
                  <span className="text-indigo-400 text-sm font-medium">Audio attached</span>
                  <button onClick={() => setAudio(undefined)} className="ml-auto text-xs font-medium text-red-400 hover:text-red-300">Remove</button>
                </div>
              )}

              {showAudioRecorder && (
                <AudioRecorder 
                  onRecordingComplete={(data) => {
                    setAudio(data);
                    setShowAudioRecorder(false);
                  }}
                  onCancel={() => setShowAudioRecorder(false)}
                />
              )}

              {/* Toolbar */}
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors border ${inputBgClass}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className={`text-sm font-medium ${subTextClass}`}>Photo</span>
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleImageUpload}
                />

                <button 
                  onClick={() => setShowAudioRecorder(true)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors border ${inputBgClass} ${audio ? 'border-red-500/50' : ''}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${audio ? 'text-red-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                  <span className={`text-sm font-medium ${subTextClass}`}>Record</span>
                </button>

                <button 
                  onClick={() => audioInputRef.current?.click()}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors border ${inputBgClass}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                  <span className={`text-sm font-medium ${subTextClass}`}>Upload Audio</span>
                </button>
                <input 
                  type="file" 
                  ref={audioInputRef} 
                  className="hidden" 
                  accept="audio/*" 
                  onChange={handleAudioUpload}
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className={`p-4 border-t ${theme === 'dark' ? 'bg-black/20 border-white/5' : 'bg-slate-50 border-slate-200'} flex justify-end`}>
          <button
            disabled={(!text && !image && !audio && !video) || isAnalyzing}
            onClick={handleSubmit}
            className={`px-8 py-3 rounded-xl font-bold text-white transition-all transform active:scale-95 ${
              (!text && !image && !audio && !video) || isAnalyzing
                ? 'bg-gray-500/50 cursor-not-allowed'
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-indigo-500/25'
            }`}
          >
            {isAnalyzing ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                AI Safe Check...
              </span>
            ) : (
              postType === 'poll' ? 'Launch Poll' : 'Confess'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
    