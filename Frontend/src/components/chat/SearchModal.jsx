import React, { useState, useEffect } from 'react';
import { X, Search, MessageSquare, AtSign } from 'lucide-react';
import API from '../../services/api';
import Avatar from '../common/Avatar';
import { useSocket } from '../../context/SocketContext';

const SearchModal = ({ isOpen, onClose, onChatCreated }) => {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const { onlineUsers } = useSocket();

  useEffect(() => {
    if (!isOpen) return;
    setQuery('');
    setUsers([]);
  }, [isOpen]);

  useEffect(() => {
    const clean = query.replace('@', '').trim();
    if (!clean || clean.length < 2) {
      setUsers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const { data } = await API.get(`/users?search=${encodeURIComponent(clean)}`);
        setUsers(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelectUser = async (userId) => {
    try {
      const { data } = await API.post('/chats', { userId });
      onChatCreated(data);
      onClose();
    } catch (err) {
      console.error(err);
      alert('Could not start conversation');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-bold text-slate-100 mb-1">Find Users</h3>
        <p className="text-xs text-slate-400 mb-4">Search by username to start a chat</p>

        <div className="relative mb-4">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Type @username or display name (min 2 chars)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-slate-800/80 border border-slate-700/80 focus:border-blue-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none"
          />
        </div>

        <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
          {loading ? (
            <div className="text-center py-8 text-slate-500 text-xs">Searching users...</div>
          ) : query.trim().length < 2 ? (
            <div className="text-center py-8 text-slate-500 text-xs italic">
              Search by username to start a chat. (Type at least 2 characters)
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">No matching users found</div>
          ) : (
            <div className="text-center py-8 text-slate-500 text-xs">No matching users found</div>
          ) : (
            users.map((u) => {
              const isOnline = onlineUsers.get(u._id.toString())?.isOnline ?? u.isOnline;
              const handle = u.username || u.email.split('@')[0];
              return (
                <div
                  key={u._id}
                  onClick={() => handleSelectUser(u._id)}
                  className="flex items-center justify-between p-3 hover:bg-slate-800/80 rounded-2xl cursor-pointer transition-colors border border-transparent hover:border-slate-700/50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar src={u.avatar} name={u.name} isOnline={isOnline} size="md" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-bold text-slate-100 truncate">{u.name}</h4>
                        <span className="text-[10px] font-semibold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full">
                          @{handle}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {u.status || u.email}
                      </p>
                    </div>
                  </div>
                  <MessageSquare className="w-4 h-4 text-cyan-400 ml-2 flex-shrink-0" />
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchModal;
