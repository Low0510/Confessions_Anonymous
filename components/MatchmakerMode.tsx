
import React, { useState, useRef, useEffect } from 'react';
import { generateStyledImage } from '../services/geminiService';

interface SavedPhoto {
  id: string;
  url: string;
  date: string;
  rotation: number;
  xOffset: number;
  yOffset: number;
  filter: FilterType;
  caption: string;
}

type FilterType = 'cartoon' | 'sketch' | 'kawaii' | 'anime';

const FILTERS: Record<FilterType, string> = {
  cartoon: 'Pixar 3D',
  sketch: 'Pencil',
  kawaii: 'Soft Cute',
  anime: 'Anime'
};

const FORTUNES = [
  "Your soulmate is in the library.",
  "Love is closer than you think.",
  "Study date imminent.",
  "Someone has a crush on you.",
  "Your vibe attracts your tribe.",
  "Lucky color: Red.",
  "Focus on yourself today.",
  "A surprise is coming."
];

export const MatchmakerMode: React.FC<{ theme: 'dark' | 'light' }> = ({ theme }) => {
  const [currentPhoto, setCurrentPhoto] = useState<string | null>(null);
  const [tempPhoto, setTempPhoto] = useState<string | null>(null);
  
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEjecting, setIsEjecting] = useState(false);
  const [isDeveloping, setIsDeveloping] = useState(false);
  
  const [savedPhotos, setSavedPhotos] = useState<SavedPhoto[]>([]);
  const [showGallery, setShowGallery] = useState(false);
  const [flashTrigger, setFlashTrigger] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [filterMode, setFilterMode] = useState<FilterType>('cartoon');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null); // Ref to track stream for reliable cleanup

  const isDark = theme === 'dark';

  // Initialize
  useEffect(() => {
    const saved = localStorage.getItem('uni_polaroids_v2');
    if (saved) {
      setSavedPhotos(JSON.parse(saved));
    }
    
    // Auto-start camera when entering tab
    startCamera();

    // Cleanup on unmount (leaving tab)
    return () => {
      stopCamera();
    };
  }, []);

  // Re-attach stream to video element when React re-renders video tag
  useEffect(() => {
    if (isCameraOn && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [isCameraOn, showGallery]);

  const startCamera = async () => {
    if (streamRef.current) return; // Already running

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 720 } } 
      });
      
      streamRef.current = mediaStream;
      setIsCameraOn(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Camera error", err);
      setIsCameraOn(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsCameraOn(false);
  };

  const togglePower = () => {
    if (isCameraOn) {
      stopCamera();
    } else {
      startCamera();
    }
  };

  const cycleFilter = () => {
    const modes: FilterType[] = ['cartoon', 'anime', 'kawaii', 'sketch'];
    const currentIdx = modes.indexOf(filterMode);
    const nextIdx = (currentIdx + 1) % modes.length;
    setFilterMode(modes[nextIdx]);
  };

  const takePhoto = async () => {
    if (!isCameraOn || !videoRef.current || isEjecting || isProcessing || tempPhoto) return;

    // 1. Visual FX
    setFlashTrigger(true);
    setTimeout(() => setFlashTrigger(false), 150);

    // 2. Capture
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    if (canvas && video) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0);
        
        const originalBase64 = canvas.toDataURL('image/jpeg', 0.8);
        setTempPhoto(originalBase64);
        setCurrentPhoto(null);
        
        setIsEjecting(true);
        setIsProcessing(true);
        
        setTimeout(() => {
          setIsEjecting(false);
        }, 1000);

        try {
          // 3. AI Transform
          const aiImage = await generateStyledImage(originalBase64, filterMode);
          setCurrentPhoto(aiImage);
          setIsDeveloping(true);
          setIsProcessing(false);
          setTimeout(() => setIsDeveloping(false), 3000);

        } catch (error) {
          console.error("AI Generation failed, fallback");
          setCurrentPhoto(originalBase64);
          setIsProcessing(false);
          setIsDeveloping(true);
          setTimeout(() => setIsDeveloping(false), 3000);
        }
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (currentPhoto) {
      savePhoto(currentPhoto);
      setTempPhoto(null); 
      setCurrentPhoto(null);
    }
  };

  const savePhoto = (url: string) => {
    const newPhoto: SavedPhoto = {
      id: Date.now().toString(),
      url,
      date: new Date().toLocaleDateString(),
      rotation: Math.random() * 10 - 5,
      xOffset: Math.random() * 20 - 10,
      yOffset: Math.random() * 20 - 10,
      filter: filterMode,
      caption: FORTUNES[Math.floor(Math.random() * FORTUNES.length)]
    };
    const updated = [newPhoto, ...savedPhotos];
    setSavedPhotos(updated);
    localStorage.setItem('uni_polaroids_v2', JSON.stringify(updated));
  };

  const deletePhoto = (id: string) => {
    const updated = savedPhotos.filter(p => p.id !== id);
    setSavedPhotos(updated);
    localStorage.setItem('uni_polaroids_v2', JSON.stringify(updated));
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] relative overflow-hidden">
      
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Full Screen Flash */}
      <div className={`fixed inset-0 bg-white z-[100] pointer-events-none transition-opacity duration-150 ease-out ${flashTrigger ? 'opacity-100' : 'opacity-0'}`}></div>

      {/* --- VINTAGE CAMERA UI --- */}
      <div className="relative z-20 mt-8 transform scale-90 md:scale-100 transition-transform duration-500 select-none">
        
        {/* Camera Body */}
        <div className="w-80 h-80 bg-[#f0f0f0] rounded-[2.5rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] relative flex flex-col items-center justify-center border-b-8 border-[#dcdcdc]">
           
           {/* Leather Grip */}
           <div className="absolute bottom-0 w-full h-1/2 bg-[#2a2a2a] rounded-b-[2rem] overflow-hidden">
              <div className="absolute inset-0 opacity-40 bg-[url('https://www.transparenttextures.com/patterns/leather.png')]"></div>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-2 flex">
                  <div className="h-full w-1/6 bg-red-500"></div>
                  <div className="h-full w-1/6 bg-orange-500"></div>
                  <div className="h-full w-1/6 bg-yellow-500"></div>
                  <div className="h-full w-1/6 bg-green-500"></div>
                  <div className="h-full w-1/6 bg-blue-500"></div>
                  <div className="h-full w-1/6 bg-purple-500"></div>
              </div>
           </div>

           {/* Top: Flash, Viewfinder, Power */}
           <div className="absolute top-6 w-full px-8 flex justify-between items-center z-30">
               {/* Flash Unit */}
               <div className="w-16 h-10 bg-[#333] rounded-lg border-2 border-[#555] relative overflow-hidden shadow-inner">
                   <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#fff_0%,_#888_100%)] opacity-30"></div>
               </div>
               
               {/* Power Toggle Switch */}
               <button 
                  onClick={togglePower}
                  className="flex flex-col items-center gap-1 group cursor-pointer"
               >
                  <div className={`w-8 h-4 rounded-full relative transition-colors ${isCameraOn ? 'bg-green-500' : 'bg-gray-400'}`}>
                      <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${isCameraOn ? 'left-4.5' : 'left-0.5'}`}></div>
                  </div>
                  <span className="text-[6px] font-bold tracking-widest text-gray-400 uppercase">POWER</span>
               </button>

               {/* Viewfinder */}
               <div className="w-12 h-10 bg-[#111] rounded-lg border-4 border-[#333] relative overflow-hidden shadow-inner">
                   <div className="absolute top-1 right-1 w-3 h-3 bg-white/20 rounded-full blur-[1px]"></div>
                   <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-blue-500/10"></div>
               </div>
           </div>

           {/* Center: Lens Assembly */}
           <div className="relative w-48 h-48 rounded-full bg-[#1a1a1a] shadow-[0_10px_20px_rgba(0,0,0,0.5),inset_0_2px_4px_rgba(255,255,255,0.1)] flex items-center justify-center z-20 border-[6px] border-[#333]">
              
              <div className="absolute inset-0 rounded-full border border-white/10"></div>
              <div className="absolute top-2 text-[6px] text-gray-500 tracking-widest font-mono">LENS 25mm 1:2.8</div>

              {/* The Eye / Lens Cap */}
              <div className="w-36 h-36 rounded-full overflow-hidden bg-black relative border-8 border-[#0a0a0a] shadow-inner group">
                 
                 {isCameraOn ? (
                    <>
                      <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline 
                        muted 
                        className="w-full h-full object-cover transform scale-x-[-1]"
                      />
                      {/* Crosshair */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-40 pointer-events-none">
                          <div className="w-4 h-4 border border-white/50 rounded-full"></div>
                          <div className="absolute w-full h-px bg-white/10"></div>
                          <div className="absolute h-full w-px bg-white/10"></div>
                      </div>
                    </>
                 ) : (
                   /* Lens Cap UI */
                   <div className="w-full h-full bg-[#1a1a1a] flex items-center justify-center relative">
                      <div className="absolute inset-0 bg-[radial-gradient(circle,_#333_0%,_#000_100%)]"></div>
                      <div className="z-10 text-gray-700 font-display font-bold text-sm tracking-widest flex flex-col items-center">
                          <span>INSTA</span>
                          <span>GEMINI</span>
                      </div>
                      <div className="absolute w-full h-px bg-[#222] rotate-45"></div>
                      <div className="absolute w-full h-px bg-[#222] -rotate-45"></div>
                   </div>
                 )}
                 
                 {/* Glass Reflection */}
                 <div className="absolute -top-10 -right-10 w-24 h-24 bg-gradient-to-br from-white/10 to-transparent rounded-full blur-md pointer-events-none"></div>
              </div>

              {/* Mode Dial */}
              <button 
                 onClick={cycleFilter}
                 disabled={!isCameraOn}
                 className={`absolute -bottom-4 -right-4 w-16 h-16 bg-[#eee] rounded-full shadow-[0_4px_6px_rgba(0,0,0,0.3)] border-4 border-[#dcdcdc] flex flex-col items-center justify-center active:scale-95 transition-transform z-40 ${!isCameraOn ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                 <div className="w-1 h-2 bg-red-500 mb-1"></div>
                 <span className="text-[8px] font-bold text-gray-700 uppercase">{FILTERS[filterMode]}</span>
                 <span className="text-[6px] text-gray-400">FILTER</span>
              </button>
           </div>

           {/* Shutter Button */}
           <button 
             onClick={takePhoto}
             disabled={!isCameraOn || !!tempPhoto}
             className={`absolute bottom-8 left-6 w-14 h-14 rounded-full border-4 border-[#ccc] shadow-[0_4px_10px_rgba(0,0,0,0.3)] transition-all active:scale-90 active:shadow-none z-30 flex items-center justify-center
                ${(!isCameraOn || !!tempPhoto) ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#ef4444] hover:bg-[#dc2626] cursor-pointer'}`}
           >
             <div className="w-10 h-10 rounded-full border border-white/20 shadow-inner"></div>
           </button>

           {/* Ejection Slot */}
           <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-56 h-3 bg-[#111] rounded-full shadow-[inset_0_-2px_4px_rgba(0,0,0,0.8)] z-10"></div>
        </div>

        {/* --- POLAROID --- */}
        {tempPhoto && (
           <div 
             draggable={!isProcessing}
             onDragStart={(e) => e.dataTransfer.setData('text/plain', 'photo')}
             className={`absolute left-1/2 -translate-x-1/2 w-44 p-3 pb-10 bg-white shadow-xl z-0 cursor-grab active:cursor-grabbing transition-all ease-out
               ${isEjecting ? 'top-0 duration-[800ms]' : '-top-56 duration-300'}
             `}
           >
              <div className="w-full aspect-square bg-[#111] overflow-hidden relative">
                  <img 
                    src={tempPhoto} 
                    className="absolute inset-0 w-full h-full object-cover filter brightness-[0.1] sepia grayscale blur-[2px]"
                  />
                  {currentPhoto && (
                    <img 
                        src={currentPhoto}
                        className={`absolute inset-0 w-full h-full object-cover transition-all duration-[4000ms] ease-in-out ${isDeveloping ? 'opacity-0 filter blur-sm sepia' : 'opacity-100 filter blur-0 sepia-0'}`}
                    />
                  )}
                  {isProcessing && (
                      <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-full h-full bg-black/50 flex items-center justify-center">
                            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          </div>
                      </div>
                  )}
              </div>
              <div className="mt-3 flex justify-center">
                 <div className={`h-2 w-24 bg-gray-100 rounded transition-opacity duration-[3000ms] ${isDeveloping ? 'opacity-0' : 'opacity-100'}`}>
                     <p className="font-handwriting text-[10px] text-gray-500 text-center pt-0.5">
                        {new Date().toLocaleDateString()} • {FILTERS[filterMode]}
                     </p>
                 </div>
              </div>
           </div>
        )}
      </div>

      {/* --- DROP ZONE --- */}
      <div 
        className="fixed bottom-24 right-6 z-40 flex flex-col items-center gap-2"
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
      >
        <div className={`transition-all duration-300 ${dragActive ? 'scale-110 rotate-6' : 'scale-100'}`}>
           <button 
             onClick={() => setShowGallery(true)}
             className={`w-20 h-20 rounded-xl shadow-[0_8px_20px_rgba(0,0,0,0.3)] flex items-center justify-center border-4 relative overflow-hidden group ${isDark ? 'bg-gray-800 border-gray-600' : 'bg-[#fcf6e9] border-[#eaddcf]'}`}
           >
             <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cork-board.png')]"></div>
             {savedPhotos.length > 0 ? (
               <div className="relative w-16 h-16">
                   {savedPhotos.slice(0, 3).map((p, i) => (
                       <img 
                         key={p.id}
                         src={p.url} 
                         className="absolute top-2 left-2 w-12 h-12 object-cover border-2 border-white shadow-sm"
                         style={{ transform: `rotate(${i * 5}deg)` }}
                       />
                   ))}
               </div>
             ) : (
               <span className="text-2xl opacity-50">📂</span>
             )}
             <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-md z-20 border-2 border-white">
               {savedPhotos.length}
             </div>
           </button>
        </div>
      </div>
      
      {/* --- GALLERY OVERLAY --- */}
      {showGallery && (
        <div className="absolute inset-0 z-50 bg-[#0f172a]/95 backdrop-blur-xl p-4 animate-fade-in-up overflow-y-auto">
          <div className="flex items-center justify-between mb-8 max-w-5xl mx-auto mt-4">
            <button 
              onClick={() => setShowGallery(false)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full font-bold transition-all bg-white text-slate-900 hover:bg-gray-200 shadow-lg"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              Return to Camera
            </button>
            <h2 className="text-2xl font-display font-bold text-white">My Polaroids</h2>
          </div>

          <div className="max-w-6xl mx-auto min-h-[60vh] p-10 bg-[#e8dccc] rounded-[2rem] shadow-[inset_0_0_40px_rgba(0,0,0,0.1)] border-8 border-[#d6c6b0] relative overflow-hidden">
            <div className="absolute inset-0 opacity-40 bg-[url('https://www.transparenttextures.com/patterns/cork-board.png')] pointer-events-none"></div>
            <div className="relative z-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-12">
                {savedPhotos.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-32 opacity-40 text-[#8c7b62]">
                    <div className="text-7xl mb-6">🎞️</div>
                    <p className="font-display text-3xl font-bold">Empty Wall</p>
                    <p className="mt-2">Snap some photos to fill this space.</p>
                </div>
                )}

                {savedPhotos.map((photo) => (
                <div 
                    key={photo.id}
                    className="group relative bg-white p-3 pb-12 shadow-[0_10px_20px_rgba(0,0,0,0.15)] transform transition-all duration-300 hover:scale-110 hover:z-20 hover:shadow-2xl cursor-pointer"
                    style={{ 
                    transform: `rotate(${photo.rotation}deg) translate(${photo.xOffset}px, ${photo.yOffset}px)` 
                    }}
                >
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-24 bg-black/10 -rotate-12 z-[-1]"></div>
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-red-500 shadow-md border border-red-700 z-20"></div>
                    <div className="aspect-square bg-gray-100 overflow-hidden mb-2 relative">
                        <img src={photo.url} alt="Memory" className="w-full h-full object-cover" />
                    </div>
                    <div className="text-center absolute bottom-3 left-0 w-full px-2">
                        <p className="font-handwriting text-gray-800 font-bold text-[10px] mb-0.5">{photo.caption}</p>
                        <p className="text-[8px] text-gray-400 uppercase tracking-wider">{photo.date}</p>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); deletePhoto(photo.id); }}
                      className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 transition-all scale-0 group-hover:scale-100 shadow-md"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
