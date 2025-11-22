
import React, { useState, useRef, useEffect } from 'react';

interface VideoRecorderProps {
  onRecordingComplete: (videoData: string) => void;
  onCancel: () => void;
}

export const VideoRecorder: React.FC<VideoRecorderProps> = ({ onRecordingComplete, onCancel }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(mediaStream);
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Camera access is required to record video.");
      onCancel();
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const startRecording = () => {
    if (!stream) return;
    
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;
    chunksRef.current = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => {
        const base64Video = reader.result as string;
        onRecordingComplete(base64Video);
        stopCamera();
      };
    };

    mediaRecorder.start();
    setIsRecording(true);
    
    // Auto stop after 10 seconds
    timerRef.current = window.setInterval(() => {
      setRecordingTime(prev => {
        if (prev >= 10) {
            stopRecording();
            return 10;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4 bg-black/20 rounded-xl border border-white/10 relative overflow-hidden">
      <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
        <video 
            ref={videoPreviewRef} 
            autoPlay 
            muted 
            className={`w-full h-full object-cover transform scale-x-[-1] ${isRecording ? 'opacity-100' : 'opacity-80'}`} 
        />
        
        {/* Overlay UI */}
        <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-black/50 text-white font-mono text-sm border border-white/20 backdrop-blur-sm">
            00:{recordingTime.toString().padStart(2, '0')} / 00:10
        </div>

        {isRecording && (
            <div className="absolute top-4 left-4 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
                <span className="text-xs text-white font-bold uppercase tracking-wider">REC</span>
            </div>
        )}
      </div>

      <div className="flex items-center gap-6">
        {!isRecording ? (
          <button
            type="button"
            onClick={startRecording}
            className="w-16 h-16 rounded-full border-4 border-white/30 flex items-center justify-center transition-all hover:scale-110 hover:border-red-500 group"
          >
            <div className="w-12 h-12 rounded-full bg-red-500 group-hover:scale-90 transition-transform"></div>
          </button>
        ) : (
          <button
            type="button"
            onClick={stopRecording}
            className="w-16 h-16 rounded-full border-4 border-red-500/50 flex items-center justify-center transition-all hover:bg-red-500/10"
          >
            <div className="w-6 h-6 rounded-sm bg-red-500"></div>
          </button>
        )}

        <button
          type="button"
          onClick={onCancel}
          className="absolute top-2 right-2 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
        >
           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
             <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
           </svg>
        </button>
      </div>
      
      <p className="text-xs text-gray-400 text-center max-w-xs">
        Record a short 10s clip. Your face will be visible, so consider wearing a mask if you want total anonymity!
      </p>
    </div>
  );
};
