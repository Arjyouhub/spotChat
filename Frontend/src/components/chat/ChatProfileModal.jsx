import React, { useState } from 'react';
import {
  X,
  Shield,
  Bell,
  BellOff,
  Trash2,
  Ban,
  Flag,
  Lock,
  Image as ImageIcon,
  FileText,
  Link as LinkIcon,
  Mic,
  Calendar,
  Mail,
  User as UserIcon,
  Phone,
  Video,
  CheckCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import Avatar from '../common/Avatar';
import API from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { useCall } from '../../context/CallContext';

const ChatProfileModal = ({
  isOpen,
  onClose,
  chat,
  currentUser,
  messages = [],
  onClearChat,
  onDeleteChat,
}) => {
  const { onlineUsers } = useSocket();
  const { callUser } = useCall();

  const [activeTab, setActiveTab] = useState('media');
  const [isMuted, setIsMuted] = useState(false);
  const [showEnlargedAvatar, setShowEnlargedAvatar] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [showReportInput, setShowReportInput] = useState(false);

  if (!isOpen || !chat) return null;

  const isGroup = chat.isGroup;

  const getOtherUser = () => {
    if (isGroup || !chat.users) return null;
    const myId = (currentUser?._id || '').toString();
    const found = chat.users.find((u) => {
      const uid = typeof u === 'string' ? u : (u?._id || u || '').toString();
      return uid !== myId;
    });

    if (found && typeof found === 'object' && (found.name || found.username)) {
      return found;
    }

    const msgSender = messages.find((m) => {
      const sid = (m.sender?._id || m.sender || '').toString();
      return sid && sid !== myId && typeof m.sender === 'object' && m.sender.name;
    })?.sender;

    if (msgSender) return msgSender;

    if (found) {
      return typeof found === 'string' ? { _id: found, name: 'User' } : found;
    }
    return null;
  };

  const partner = getOtherUser();
  const title = isGroup ? chat.chatName : partner?.name || 'User';
  const username = isGroup ? null : partner?.username || partner?.email?.split('@')[0];
  const avatarSrc = isGroup ? chat.groupAvatar : partner?.avatar;
  const isOnline = partner?._id ? (onlineUsers.get(partner._id.toString())?.isOnline ?? partner.isOnline ?? false) : false;
  const lastSeen = partner?._id ? (onlineUsers.get(partner._id.toString())?.lastSeen ?? partner.lastSeen ?? null) : null;

  // Filter Shared Media from messages
  const sharedMedia = messages.filter((m) => m.mediaType === 'image' || m.mediaType === 'video');
  const sharedDocs = messages.filter((m) => m.mediaType === 'file' || (m.mediaUrl && m.mediaType !== 'image' && m.mediaType !== 'video' && m.mediaType !== 'audio'));
  const sharedVoice = messages.filter((m) => m.mediaType === 'audio');
  const sharedLinks = messages.filter((m) => m.content && (m.content.includes('http://') || m.content.includes('https://')));

  const handleReportUser = async () => {
    if (!reportReason.trim() || !partner) return;
    try {
      await API.post('/admin/report', {
        reportedUserId: partner._id,
        reason: reportReason,
      });
      alert('Report submitted successfully. Our team will review it.');
      setReportReason('');
      setShowReportInput(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Could not submit report');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex justify-end transition-all select-none">
      {/* Sliding Drawer */}
      <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full flex flex-col overflow-y-auto shadow-2xl relative">
        {/* Header Bar */}
        <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between sticky top-0 z-20 backdrop-blur-md">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-cyan-400" />
            <span>{isGroup ? 'Group Info' : 'Contact Info'}</span>
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profile Card Header */}
        <div className="p-6 flex flex-col items-center border-b border-slate-800/80 bg-slate-950/40 text-center">
          <div
            onClick={() => setShowEnlargedAvatar(true)}
            className="relative cursor-pointer group mb-3"
            title="Click to view full photo"
          >
            <Avatar src={avatarSrc} name={title} isOnline={isOnline} size="xl" />
            <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold">
              View
            </div>
          </div>

          <h2 className="text-lg font-bold text-slate-100">{title}</h2>
          {username && <p className="text-xs text-cyan-400 font-semibold mt-0.5">@{username}</p>}

          <p className="text-xs text-slate-400 mt-1">
            {isGroup ? (
              `${chat.users?.length || 0} members`
            ) : isOnline ? (
              <span className="text-emerald-400 font-semibold flex items-center justify-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" /> Online
              </span>
            ) : lastSeen ? (
              `Last seen ${new Date(lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
            ) : (
              'Offline'
            )}
          </p>

          {/* Call Quick Triggers */}
          {!isGroup && partner && (
            <div className="flex items-center gap-4 mt-4">
              <button
                onClick={() => {
                  onClose();
                  callUser(partner, 'audio');
                }}
                className="flex flex-col items-center gap-1 p-2.5 bg-slate-800 hover:bg-slate-700/80 rounded-2xl border border-slate-700/50 text-cyan-400 w-20 transition-all"
              >
                <Phone className="w-5 h-5" />
                <span className="text-[11px] font-semibold text-slate-300">Audio</span>
              </button>
              <button
                onClick={() => {
                  onClose();
                  callUser(partner, 'video');
                }}
                className="flex flex-col items-center gap-1 p-2.5 bg-slate-800 hover:bg-slate-700/80 rounded-2xl border border-slate-700/50 text-blue-400 w-20 transition-all"
              >
                <Video className="w-5 h-5" />
                <span className="text-[11px] font-semibold text-slate-300">Video</span>
              </button>
            </div>
          )}
        </div>

        {/* Bio / Email / Metadata Details */}
        <div className="p-4 space-y-3 border-b border-slate-800 text-xs">
          {partner?.status && (
            <div className="p-3 bg-slate-800/40 border border-slate-800 rounded-xl">
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">About / Bio</p>
              <p className="text-slate-200">{partner.status}</p>
            </div>
          )}

          {partner?.email && (
            <div className="flex items-center gap-3 p-3 bg-slate-800/40 border border-slate-800 rounded-xl text-slate-300">
              <Mail className="w-4 h-4 text-cyan-400 flex-shrink-0" />
              <span className="truncate">{partner.email}</span>
            </div>
          )}

          {partner?.createdAt && (
            <div className="flex items-center gap-3 p-3 bg-slate-800/40 border border-slate-800 rounded-xl text-slate-300">
              <Calendar className="w-4 h-4 text-cyan-400 flex-shrink-0" />
              <span>Joined {new Date(partner.createdAt).toLocaleDateString([], { month: 'short', year: 'numeric' })}</span>
            </div>
          )}

          {/* End-to-End Encryption Notice */}
          <div className="p-3.5 bg-cyan-950/20 border border-cyan-500/30 rounded-2xl flex items-start gap-3 text-cyan-300">
            <Lock className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-bold text-xs">End-to-End Encrypted</p>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                Messages and calls are secured with ECDH P-256 and AES-256-GCM encryption. No third party can read them.
              </p>
            </div>
          </div>
        </div>

        {/* Shared Media Tabs */}
        <div className="p-4 flex-1">
          <div className="flex bg-slate-800/60 p-1 rounded-xl mb-4 border border-slate-700/50 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('media')}
              className={`flex-1 py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1 ${
                activeTab === 'media' ? 'bg-cyan-500 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Media ({sharedMedia.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('docs')}
              className={`flex-1 py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1 ${
                activeTab === 'docs' ? 'bg-cyan-500 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Files ({sharedDocs.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('voice')}
              className={`flex-1 py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1 ${
                activeTab === 'voice' ? 'bg-cyan-500 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Audio ({sharedVoice.length})</span>
            </button>
          </div>

          {/* Shared Media Content */}
          <div className="max-h-60 overflow-y-auto">
            {activeTab === 'media' && (
              sharedMedia.length === 0 ? (
                <p className="text-center py-6 text-slate-500 text-xs italic">No photos or videos shared yet</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {sharedMedia.map((m) => (
                    <a
                      key={m._id}
                      href={m.mediaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="aspect-square bg-slate-800 rounded-xl overflow-hidden border border-slate-700/50 hover:opacity-90 transition-opacity relative group"
                    >
                      {m.mediaType === 'image' ? (
                        <img src={m.mediaUrl} alt="Shared" className="w-full h-full object-cover" />
                      ) : (
                        <video src={m.mediaUrl} className="w-full h-full object-cover" />
                      )}
                    </a>
                  ))}
                </div>
              )
            )}

            {activeTab === 'docs' && (
              sharedDocs.length === 0 ? (
                <p className="text-center py-6 text-slate-500 text-xs italic">No documents shared yet</p>
              ) : (
                <div className="space-y-2">
                  {sharedDocs.map((m) => (
                    <a
                      key={m._id}
                      href={m.mediaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 bg-slate-800/60 border border-slate-700/50 rounded-xl flex items-center gap-3 hover:bg-slate-800 transition-colors text-xs text-slate-200"
                    >
                      <FileText className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                      <span className="truncate flex-1">Document Attachment</span>
                    </a>
                  ))}
                </div>
              )
            )}

            {activeTab === 'voice' && (
              sharedVoice.length === 0 ? (
                <p className="text-center py-6 text-slate-500 text-xs italic">No voice notes shared yet</p>
              ) : (
                <div className="space-y-2">
                  {sharedVoice.map((m) => (
                    <div key={m._id} className="p-2.5 bg-slate-800/60 border border-slate-700/50 rounded-xl flex items-center gap-3">
                      <Mic className="w-4 h-4 text-cyan-400" />
                      <audio src={m.mediaUrl} controls className="w-full h-8" />
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>

        {/* Action Buttons Footer (Mute, Clear, Block, Report) */}
        <div className="p-4 border-t border-slate-800 space-y-2 bg-slate-950/40 text-xs font-semibold">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="w-full flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-800 rounded-xl border border-slate-700/50 text-slate-200 transition-colors"
          >
            <span className="flex items-center gap-2.5">
              {isMuted ? <BellOff className="w-4 h-4 text-amber-400" /> : <Bell className="w-4 h-4 text-slate-400" />}
              <span>Mute Notifications</span>
            </span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full ${isMuted ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-700 text-slate-400'}`}>
              {isMuted ? 'Muted' : 'Unmuted'}
            </span>
          </button>

          <button
            onClick={() => {
              if (confirm('Are you sure you want to clear all message history in this chat?')) {
                onClearChat();
                onClose();
              }
            }}
            className="w-full flex items-center gap-2.5 p-3 bg-slate-800/50 hover:bg-rose-500/10 hover:border-rose-500/30 rounded-xl border border-slate-700/50 text-slate-200 hover:text-rose-400 transition-colors"
          >
            <Trash2 className="w-4 h-4 text-rose-400" />
            <span>Clear Chat History</span>
          </button>

          {!isGroup && partner && (
            <>
              {showReportInput ? (
                <div className="p-3 bg-slate-800/80 border border-slate-700 rounded-xl space-y-2">
                  <input
                    type="text"
                    placeholder="Reason for reporting..."
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 outline-none"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setShowReportInput(false)}
                      className="px-2.5 py-1 text-slate-400 hover:text-slate-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleReportUser}
                      className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg"
                    >
                      Submit Report
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowReportInput(true)}
                  className="w-full flex items-center gap-2.5 p-3 bg-slate-800/50 hover:bg-slate-800 rounded-xl border border-slate-700/50 text-rose-400 transition-colors"
                >
                  <Flag className="w-4 h-4" />
                  <span>Report User</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Enlarged Avatar Modal */}
      {showEnlargedAvatar && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
          <button
            onClick={() => setShowEnlargedAvatar(false)}
            className="absolute top-4 right-4 p-2 bg-slate-800 rounded-full text-white"
          >
            <X className="w-6 h-6" />
          </button>
          <img src={avatarSrc} alt={title} className="max-w-full max-h-[80vh] rounded-3xl shadow-2xl object-contain" />
        </div>
      )}
    </div>
  );
};

export default ChatProfileModal;
