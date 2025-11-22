import React, { useState, useRef } from 'react';

interface AudioRecorderProps {
  onRecordingComplete: (audioData: string) => void;
  onCancel: () => void;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ onRecordingComplete, onCancel }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          onRecordingComplete(base64Audio);
        };
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Microphone access is required to record audio.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4 bg-gray-50/10 rounded-xl border border-white/10">
      <div className="text-2xl font-mono font-bold text-white">
        {formatTime(recordingTime)}
      </div>
      
      <div className="flex items-center gap-4">
        {!isRecording ? (
          <button
            type="button"
            onClick={startRecording}
            className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-all hover:scale-110 shadow-lg shadow-red-500/50"
          >
            <div className="w-4 h-4 rounded-full bg-white"></div>
          </button>
        ) : (
          <button
            type="button"
            onClick={stopRecording}
            className="w-12 h-12 rounded-full border-2 border-red-500 flex items-center justify-center transition-all hover:bg-red-500/10"
          >
            <div className="w-4 h-4 rounded-sm bg-red-500 animate-pulse"></div>
          </button>
        )}

        {!isRecording && recordingTime === 0 && (
           <span className="text-sm text-gray-400">Tap to record</span>
        )}
        
        {recordingTime > 0 && !isRecording && (
          <span className="text-sm text-green-400">Recording saved!</span>
        )}

        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-gray-400 hover:text-white underline"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
