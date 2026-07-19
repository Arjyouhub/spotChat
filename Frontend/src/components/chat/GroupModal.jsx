import React, { useState, useEffect } from 'react';
import { X, Users, Check, Search } from 'lucide-react';
import API from '../../services/api';
import Avatar from '../common/Avatar';

const GroupModal = ({ isOpen, onClose, onGroupCreated }) => {
  const [groupName, setGroupName] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const fetchAllUsers = async () => {
      try {
        const { data } = await API.get('/users');
        setUsers(data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchAllUsers();
  }, [isOpen]);

  const toggleSelectUser = (user) => {
    if (selectedUsers.some((u) => u._id === user._id)) {
      setSelectedUsers(selectedUsers.filter((u) => u._id !== user._id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!groupName.trim() || selectedUsers.length < 1) {
      alert('Please enter a group name and select at least 1 member');
      return;
    }

    setLoading(true);
    try {
      const { data } = await API.post('/chats/group', {
        name: groupName.trim(),
        users: JSON.stringify(selectedUsers.map((u) => u._id)),
      });

      onGroupCreated(data);
      onClose();
      setGroupName('');
      setSelectedUsers([]);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-blue-600/20 text-blue-400 rounded-2xl border border-blue-500/30">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-100">Create Group Chat</h3>
            <p className="text-xs text-slate-400">Select participants and enter group name</p>
          </div>
        </div>

        <form onSubmit={handleCreateGroup} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Group Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Project Developers"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700/80 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Add Members ({selectedUsers.length} selected)
            </label>
            <div className="relative mb-2">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                placeholder="Search contacts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-800/60 border border-slate-700/50 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none"
              />
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              {filteredUsers.map((u) => {
                const isSelected = selectedUsers.some((selected) => selected._id === u._id);
                return (
                  <div
                    key={u._id}
                    onClick={() => toggleSelectUser(u)}
                    className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-blue-600/20 border border-blue-500/40 text-white'
                        : 'hover:bg-slate-800/60 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar src={u.avatar} name={u.name} size="sm" />
                      <div>
                        <p className="text-xs font-semibold text-slate-100">{u.name}</p>
                        <p className="text-[10px] text-slate-400">{u.email}</p>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-cyan-400" />}
                  </div>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !groupName.trim() || selectedUsers.length < 1}
            className="w-full mt-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl shadow-lg transition-all"
          >
            {loading ? 'Creating Group...' : 'Create Group'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default GroupModal;
