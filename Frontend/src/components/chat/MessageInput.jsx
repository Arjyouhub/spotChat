import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Lock, Clock, X, Image as ImageIcon, Mic, Square, Smile } from 'lucide-react';
import API from '../../services/api';
import { useSocket } from '../../context/SocketContext';

const MessageInput = ({ selectedChat, onSendMessage, onUpdateDisappearing, replyToMessage, onClearReply }) => {
  const { socket } = useSocket();
  const [content, setContent] = useState('');
  const [isViewOnce, setIsViewOnce] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showTimerMenu, setShowTimerMenu] = useState(false);

  // Audio Voice Note Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);

  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    if (isRecording) {
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(recordingTimerRef.current);
      setRecordingTime(0);
    }
    return () => clearInterval(recordingTimerRef.current);
  }, [isRecording]);

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], `voicenote_${Date.now()}.webm`, { type: 'audio/webm' });
        setSelectedFile(audioFile);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Microphone access error:', err);
      alert('Could not access microphone for voice note');
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleInputChange = (e) => {
    setContent(e.target.value);

    if (socket && selectedChat) {
      socket.emit('typing', { room: selectedChat._id });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('stop_typing', { room: selectedChat._id });
      }, 1500);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      if (file.type.startsWith('image/')) {
        setPreviewUrl(URL.createObjectURL(file));
      } else {
        setPreviewUrl(null);
      }
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setIsViewOnce(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() && !selectedFile) return;

    if (socket && selectedChat) {
      socket.emit('stop_typing', { room: selectedChat._id });
    }

    let mediaUrl = '';
    let mediaType = null;

    if (selectedFile) {
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', selectedFile);

        const { data } = await API.post('/media/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        mediaUrl = data.mediaUrl;
        mediaType = data.mediaType;
      } catch (err) {
        console.error('File upload failed:', err);
        alert('Failed to upload attachment');
        setUploading(false);
        return;
      } finally {
        setUploading(false);
      }
    }

    onSendMessage({
      content: content.trim(),
      mediaUrl,
      mediaType,
      isViewOnce,
      replyTo: replyToMessage?._id,
    });

    setContent('');
    clearFile();
    if (onClearReply) onClearReply();
  };

  const handleSetTimer = (seconds) => {
    onUpdateDisappearing(seconds);
    setShowTimerMenu(false);
  };

  const formatRecordingTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-1.5 sm:p-3 bg-white/95 dark:bg-slate-900/95 border-t border-slate-200 dark:border-slate-800/80 backdrop-blur-xl relative transition-colors duration-200">
      {/* Reply Preview Bar */}
      {replyToMessage && (
        <div className="mb-2 p-2 bg-blue-900/20 border-l-4 border-cyan-500 rounded-r-xl flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-cyan-400">
              Replying to {replyToMessage.sender?.name || 'User'}
            </p>
            <p className="text-xs text-slate-300 truncate">{replyToMessage.content || 'Media Message'}</p>
          </div>
          <button onClick={onClearReply} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* File Preview Bar */}
      {selectedFile && (
        <div className="mb-2 p-2 bg-slate-800/80 border border-slate-700/60 rounded-xl flex items-center gap-3">
          {previewUrl ? (
            <img src={previewUrl} alt="Preview" className="w-12 h-12 rounded-lg object-cover" />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-slate-700 flex items-center justify-center text-cyan-400">
              <ImageIcon className="w-6 h-6" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-200 truncate">{selectedFile.name}</p>
            <p className="text-[10px] text-slate-400">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>

          {(selectedFile.type.startsWith('image/') || selectedFile.type.startsWith('video/')) && (
            <button
              type="button"
              onClick={() => setIsViewOnce(!isViewOnce)}
              className={`p-2 rounded-xl border transition-all text-xs font-semibold flex items-center gap-1.5 ${
                isViewOnce
                  ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                  : 'bg-slate-700/50 border-slate-600/50 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Lock className="w-4 h-4" />
              <span>{isViewOnce ? 'View Once ON' : 'View Once OFF'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={clearFile}
            className="p-1 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Disappearing Timer Dropdown Popup */}
      {showTimerMenu && (
        <div className="absolute left-2 bottom-14 z-30 w-48 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-2 text-xs text-slate-200 backdrop-blur-md">
          <p className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Disappearing Messages
          </p>
          <button
            onClick={() => handleSetTimer(0)}
            className={`w-full text-left px-3 py-2 rounded-xl transition-colors ${
              selectedChat.disappearingDuration === 0
                ? 'bg-blue-600 text-white'
                : 'hover:bg-slate-800'
            }`}
          >
            Off
          </button>
          <button
            onClick={() => handleSetTimer(10)}
            className={`w-full text-left px-3 py-2 rounded-xl transition-colors ${
              selectedChat.disappearingDuration === 10
                ? 'bg-blue-600 text-white'
                : 'hover:bg-slate-800'
            }`}
          >
            10 Seconds
          </button>
          <button
            onClick={() => handleSetTimer(60)}
            className={`w-full text-left px-3 py-2 rounded-xl transition-colors ${
              selectedChat.disappearingDuration === 60
                ? 'bg-blue-600 text-white'
                : 'hover:bg-slate-800'
            }`}
          >
            1 Minute
          </button>
          <button
            onClick={() => handleSetTimer(86400)}
            className={`w-full text-left px-3 py-2 rounded-xl transition-colors ${
              selectedChat.disappearingDuration === 86400
                ? 'bg-blue-600 text-white'
                : 'hover:bg-slate-800'
            }`}
          >
            24 Hours
          </button>
        </div>
      )}

      {/* Form Bar */}
      <form onSubmit={handleSubmit} className="flex items-center gap-1 sm:gap-2">
        {/* Disappearing timer trigger button */}
        <button
          type="button"
          onClick={() => setShowTimerMenu(!showTimerMenu)}
          className={`p-1.5 sm:p-2.5 rounded-xl border transition-all flex-shrink-0 ${
            selectedChat.disappearingDuration > 0
              ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
              : 'bg-slate-800 border-slate-700/60 text-slate-400 hover:text-slate-200'
          }`}
          title="Disappearing timer"
        >
          <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {/* Attachment upload trigger */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-1.5 sm:p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700/60 transition-all flex-shrink-0"
          title="Attach media"
        >
          <Paperclip className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="image/*,video/*,audio/*,application/pdf,.doc,.docx"
        />

        {/* Voice Note Recording Bar */}
        {isRecording ? (
          <div className="flex-1 bg-rose-500/10 border border-rose-500/30 rounded-xl px-2.5 py-1.5 sm:px-4 sm:py-2 flex items-center justify-between text-rose-400 text-xs font-semibold animate-pulse min-w-0">
            <div className="flex items-center gap-1.5 min-w-0 truncate">
              <span className="w-2 h-2 bg-rose-500 rounded-full animate-ping flex-shrink-0" />
              <span className="truncate">Recording ({formatRecordingTime(recordingTime)})</span>
            </div>
            <button
              type="button"
              onClick={stopVoiceRecording}
              className="p-1 hover:bg-rose-500/20 rounded-lg text-rose-300 flex-shrink-0"
            >
              <Square className="w-4 h-4 fill-current" />
            </button>
          </div>
        ) : (
          <input
            type="text"
            value={content}
            onChange={handleInputChange}
            placeholder="Type a message..."
            className="flex-1 min-w-0 bg-slate-100 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700/80 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all"
          />
        )}

        {/* Mic Record Voice Note Trigger */}
        {!isRecording && !content.trim() && !selectedFile && (
          <button
            type="button"
            onClick={startVoiceRecording}
            className="p-1.5 sm:p-2.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 rounded-xl border border-slate-700/60 transition-all flex-shrink-0"
            title="Record Voice Note"
          >
            <Mic className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        )}

        {/* Submit Send Button */}
        {(content.trim() || selectedFile) && (
          <button
            type="submit"
            disabled={uploading}
            className="p-1.5 sm:p-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:opacity-40 text-white rounded-xl shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center flex-shrink-0"
          >
            {uploading ? (
              <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4 sm:w-5 sm:h-5" />
            )}
          </button>
        )}
      </form>
    </div>
  );
};

export default MessageInput;
