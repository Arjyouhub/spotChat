import React, { useState, useRef, useEffect } from 'react';
import {
  Check,
  CheckCheck,
  Eye,
  EyeOff,
  Trash2,
  FileText,
  Clock,
  Download,
  Lock,
  Maximize2,
  X,
  Reply,
  Star,
  CornerUpRight,
  Smile,
  Volume2,
  Play,
  Pause,
  Mic,
  AlertCircle,
} from 'lucide-react';
import Avatar from '../common/Avatar';
import API from '../../services/api';
import { useSocket } from '../../context/SocketContext';

const VoiceNotePlayer = ({ audioUrl }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch((err) => console.error('Audio play error:', err));
      setIsPlaying(true);
    }
  };

  const formatSec = (sec) => {
    if (isNaN(sec) || !sec) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-slate-900/60 border border-slate-700/50 rounded-2xl my-1 min-w-[220px]">
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onEnded={() => setIsPlaying(false)}
        preload="metadata"
      />
      <button
        type="button"
        onClick={togglePlay}
        className="p-2.5 bg-gradient-to-tr from-cyan-500 to-blue-600 text-white rounded-full shadow-md hover:scale-105 transition-all flex-shrink-0"
      >
        {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
      </button>

      <div className="flex-1 min-w-0">
        {/* Waveform visualizer */}
        <div className="flex items-center gap-1 h-6 mb-1">
          {[40, 70, 30, 85, 60, 95, 50, 80, 45, 90, 65, 40, 75, 55, 85].map((height, i) => {
            const progress = duration > 0 ? (currentTime / duration) * 15 : 0;
            const isActive = i <= progress;
            return (
              <div
                key={i}
                style={{ height: `${height}%` }}
                className={`w-1 rounded-full transition-all duration-150 ${
                  isActive ? 'bg-cyan-400' : 'bg-slate-700'
                }`}
              />
            );
          })}
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold">
          <span className="flex items-center gap-1">
            <Mic className="w-3 h-3 text-cyan-400" /> Voice Note
          </span>
          <span>{isPlaying ? formatSec(currentTime) : formatSec(duration || currentTime)}</span>
        </div>
      </div>
    </div>
  );
};

const MessageBubble = ({
  message,
  currentUser,
  selectedChat,
  onDeleteForEveryone,
  onDeleteForMe,
  onReply,
  onStarToggle,
  onRetry,
}) => {
  const { socket } = useSocket();
  const [showMenu, setShowMenu] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [viewOnceModal, setViewOnceModal] = useState(false);
  const [imageModal, setImageModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const isSender = (message.sender?._id || message.sender).toString() === (currentUser._id || currentUser).toString();
  const isGroup = selectedChat?.isGroup;
  const isStarred = message.starredBy?.includes(currentUser._id);

  const handleAddReaction = (emoji) => {
    if (socket) {
      socket.emit('message_reaction', {
        chatId: selectedChat._id,
        messageId: message._id,
        emoji,
      });
    }
    setShowReactions(false);
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleOpenViewOnce = async () => {
    if (message.isViewed) return;
    setViewOnceModal(true);
    try {
      await API.put(`/messages/view-once/${message._id}`);
      if (socket) {
        socket.emit('view_once_opened', {
          messageId: message._id,
          chatId: selectedChat._id,
        });
      }
    } catch (err) {
      console.error('Failed to mark view once:', err);
    }
  };

  const renderTicks = () => {
    if (!isSender) return null;

    if (message.status === 'sending') {
      return <Clock className="w-3.5 h-3.5 text-amber-300 animate-spin inline" title="Sending..." />;
    }

    if (message.status === 'failed') {
      return (
        <button
          onClick={() => onRetry && onRetry(message)}
          className="flex items-center gap-1 text-rose-400 font-bold hover:underline ml-1"
          title="Failed to send - Tap to retry"
        >
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Retry</span>
        </button>
      );
    }

    const isRead =
      message.readBy &&
      message.readBy.some((id) => (id._id || id) !== currentUser._id);
    const isDelivered =
      message.deliveredTo &&
      message.deliveredTo.some((id) => (id._id || id) !== currentUser._id);

    if (isRead) {
      return <CheckCheck className="w-4 h-4 text-cyan-400 inline" title="Seen" />;
    } else if (isDelivered) {
      return <CheckCheck className="w-4 h-4 text-slate-400 inline" title="Delivered" />;
    }
    return <Check className="w-4 h-4 text-slate-400 inline" title="Sent" />;
  };

  const isImage =
    message.mediaType === 'image' ||
    (message.mediaUrl &&
      (message.mediaUrl.startsWith('data:image') ||
        /\.(jpeg|jpg|gif|png|webp|svg)$/i.test(message.mediaUrl)));

  const isVideo =
    message.mediaType === 'video' ||
    (message.mediaUrl &&
      (message.mediaUrl.startsWith('data:video') ||
        /\.(mp4|webm|ogg|mov)$/i.test(message.mediaUrl)));

  const isAudio =
    message.mediaType === 'audio' ||
    (message.mediaUrl &&
      (message.mediaUrl.startsWith('data:audio') ||
        /\.(mp3|wav|ogg|m4a)$/i.test(message.mediaUrl)));

  return (
    <div
      className={`relative group flex gap-2.5 my-1.5 ${
        isSender ? 'flex-row-reverse self-end' : 'flex-row self-start'
      } max-w-[85%] sm:max-w-[70%]`}
    >
      {!isSender && isGroup && (
        <Avatar
          src={message.sender?.avatar}
          name={message.sender?.name}
          size="sm"
          className="mt-1"
        />
      )}

      <div
        onMouseLeave={() => setShowMenu(false)}
        className={`relative px-3.5 py-2.5 rounded-2xl shadow-md transition-all ${
          isSender
            ? 'glass-bubble-user text-white'
            : 'glass-bubble-other text-slate-100'
        }`}
      >
        {!isSender && isGroup && (
          <p className="text-[11px] font-bold text-cyan-400 mb-1">
            {message.sender?.name}
          </p>
        )}

        {message.deletedForEveryone ? (
          <p className="text-xs italic text-slate-300 flex items-center gap-1.5 py-0.5">
            <Trash2 className="w-3.5 h-3.5 opacity-70" /> This message was deleted
          </p>
        ) : (
          <>
            {message.isViewOnce ? (
              <div className="my-1">
                {message.isViewed ? (
                  <div className="flex items-center gap-2 px-3 py-2 bg-slate-900/40 rounded-xl border border-slate-700/40 text-slate-400 text-xs italic">
                    <EyeOff className="w-4 h-4 text-slate-500" />
                    <span>Viewed once photo/video</span>
                  </div>
                ) : (
                  <button
                    onClick={handleOpenViewOnce}
                    className="flex items-center gap-2 px-3.5 py-2.5 bg-gradient-to-r from-blue-900/60 to-slate-900/80 hover:from-blue-800/80 hover:to-slate-800/90 rounded-xl border border-blue-500/40 text-blue-200 text-xs font-semibold shadow-inner transition-all group/vo"
                  >
                    <Lock className="w-4 h-4 text-cyan-400 group-hover/vo:scale-110 transition-transform" />
                    <span>View Once Media (Click to open)</span>
                  </button>
                )}
              </div>
            ) : (
              message.mediaUrl && (
                <div className="my-1 rounded-xl overflow-hidden max-w-sm">
                  {isImage && (
                    <div className="relative group/img">
                      <img
                        src={message.mediaUrl}
                        alt="Attachment"
                        className="max-h-72 w-full object-cover rounded-xl cursor-pointer hover:opacity-90 transition-opacity bg-slate-900"
                        onClick={() => setImageModal(true)}
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                      <button
                        onClick={() => setImageModal(true)}
                        className="absolute bottom-2 right-2 p-1.5 bg-black/60 backdrop-blur-md rounded-lg text-white opacity-0 group-hover/img:opacity-100 transition-opacity"
                        title="View photo"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {isVideo && (
                    <video
                      src={message.mediaUrl}
                      controls
                      className="max-h-72 w-full rounded-xl bg-black"
                    />
                  )}

                  {isAudio && (
                    <VoiceNotePlayer audioUrl={message.mediaUrl} />
                  )}

                  {!isImage && !isVideo && !isAudio && (
                    <a
                      href={message.mediaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 p-3 bg-slate-900/50 hover:bg-slate-900/80 rounded-xl border border-slate-700/50 text-xs font-medium text-slate-200 transition-colors"
                    >
                      <FileText className="w-5 h-5 text-cyan-400" />
                      <span className="truncate">Attached File</span>
                      <Download className="w-4 h-4 ml-auto text-slate-400" />
                    </a>
                  )}
                </div>
              )
            )}

            {message.content && (
              <p className="text-sm font-normal leading-relaxed break-words">
                {message.content}
              </p>
            )}
          </>
        )}

        <div className="flex items-center justify-end gap-1.5 text-[10px] opacity-75 mt-1">
          {message.expireAt && (
            <Clock className="w-3 h-3 text-amber-300" title="Disappearing message" />
          )}
          <span>{formatTime(message.createdAt)}</span>
          {renderTicks()}
        </div>
      </div>

      <div className="opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity flex items-center self-center">
        <div className="relative">
          <button
            onClick={() => setShowDeleteModal(true)}
            className="p-1.5 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
            title="Message options & delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Lightbox Modal for Regular Sent Photo */}
      {imageModal && (
        <div
          onClick={() => setImageModal(false)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4"
        >
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setImageModal(false)}
              className="absolute top-4 right-4 bg-slate-800 hover:bg-slate-700 text-white rounded-full p-2.5 shadow-lg z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={message.mediaUrl}
              alt="Photo view"
              className="max-h-[85vh] max-w-full object-contain rounded-2xl shadow-2xl"
            />
          </div>
        </div>
      )}

      {/* View Once Fullscreen Lightbox Modal */}
      {viewOnceModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="relative max-w-3xl w-full max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setViewOnceModal(false)}
              className="absolute top-4 right-4 bg-slate-800 hover:bg-slate-700 text-white rounded-full p-2.5 shadow-lg z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="mb-2 text-cyan-400 text-xs font-semibold tracking-wide flex items-center gap-1.5 bg-slate-900/80 px-4 py-1.5 rounded-full border border-cyan-500/30">
              <Eye className="w-4 h-4" /> View Once Media - Will self-destruct upon closing
            </div>

            {isVideo ? (
              <video src={message.mediaUrl} controls autoPlay className="max-h-[75vh] rounded-2xl" />
            ) : (
              <img src={message.mediaUrl} alt="View once" className="max-h-[75vh] object-contain rounded-2xl" />
            )}
      {/* Single Message Actions & Delete Modal Popup */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-100">Delete Message?</h3>
              <p className="text-xs text-slate-400 mt-1 line-clamp-2 italic">
                "{message.content || (message.mediaType ? `${message.mediaType} attachment` : 'Message')}"
              </p>
            </div>

            <div className="space-y-2 pt-2">
              {isSender && !message.deletedForEveryone && (
                <button
                  onClick={() => {
                    onDeleteForEveryone(message._id);
                    setShowDeleteModal(false);
                  }}
                  className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center gap-2"
                >
                  <span>Delete for Everyone</span>
                </button>
              )}

              <button
                onClick={() => {
                  onDeleteForMe(message._id);
                  setShowDeleteModal(false);
                }}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-all flex items-center justify-center gap-2"
              >
                <span>Delete for Me</span>
              </button>

              {onReply && (
                <button
                  onClick={() => {
                    onReply(message);
                    setShowDeleteModal(false);
                  }}
                  className="w-full py-2.5 px-4 bg-slate-800/60 hover:bg-slate-800 text-cyan-400 rounded-xl text-xs font-semibold border border-slate-700/50 transition-all flex items-center justify-center gap-2"
                >
                  <Reply className="w-4 h-4" />
                  <span>Reply</span>
                </button>
              )}

              <button
                onClick={() => setShowDeleteModal(false)}
                className="w-full py-2 text-xs text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(MessageBubble);
