import React, { useState, useRef } from 'react';
import { X, User, Sparkles, Image as ImageIcon, AtSign, Upload, Camera } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import Avatar from '../common/Avatar';
import API from '../../services/api';

const ProfileModal = ({ isOpen, onClose }) => {
  const { user, updateProfile } = useAuth();
  const { socket } = useSocket();
  const [name, setName] = useState(user?.name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [status, setStatus] = useState(user?.status || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState(null);

  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleAvatarFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingAvatar(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const { data } = await API.post('/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setAvatar(data.mediaUrl);
    } catch (err) {
      console.error('Failed to upload profile picture:', err);
      setError('Failed to upload profile picture');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await updateProfile({ name, username, status, avatar }, socket);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-bold text-slate-100 mb-6">User Profile Settings</h3>

        {/* Avatar Preview with Camera Upload Overlay Button */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <Avatar src={avatar || user?.avatar} name={name || user?.name} size="xl" />
            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              {uploadingAvatar ? (
                <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera className="w-6 h-6 text-white" />
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="mt-3 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700/80 rounded-xl text-xs font-semibold text-cyan-400 flex items-center gap-1.5 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{uploadingAvatar ? 'Uploading...' : 'Upload Profile Photo'}</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleAvatarFileChange}
            accept="image/*"
            className="hidden"
          />

          <p className="text-xs text-slate-400 font-medium mt-1">
            @{username || user?.username || 'username'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Display Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-800/80 border border-slate-700/80 focus:border-blue-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Unique Username (@handle)
            </label>
            <div className="relative">
              <AtSign className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="john_doe"
                className="w-full bg-slate-800/80 border border-slate-700/80 focus:border-blue-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Status Message (About)
            </label>
            <div className="relative">
              <Sparkles className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
              <input
                type="text"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                placeholder="Hey there! I am using spotChat"
                className="w-full bg-slate-800/80 border border-slate-700/80 focus:border-blue-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Avatar URL (Optional Manual Link)
            </label>
            <div className="relative">
              <ImageIcon className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
              <input
                type="text"
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                placeholder="https://..."
                className="w-full bg-slate-800/80 border border-slate-700/80 focus:border-blue-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || uploadingAvatar}
            className="w-full mt-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold py-3 rounded-xl shadow-lg transition-all"
          >
            {loading ? 'Saving Changes...' : 'Save Profile'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProfileModal;
