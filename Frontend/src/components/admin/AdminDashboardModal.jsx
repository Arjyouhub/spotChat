import React, { useState, useEffect } from 'react';
import { X, ShieldAlert, Users, MessageSquare, Activity, Ban, CheckCircle, RefreshCw } from 'lucide-react';
import API from '../../services/api';
import Avatar from '../common/Avatar';

const AdminDashboardModal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('analytics');
  const [analytics, setAnalytics] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [reportsList, setReportsList] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    fetchData();
  }, [isOpen, activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'analytics') {
        const { data } = await API.get('/admin/analytics');
        setAnalytics(data);
      } else if (activeTab === 'users') {
        const { data } = await API.get('/admin/users');
        setUsersList(data);
      } else if (activeTab === 'reports') {
        const { data } = await API.get('/admin/reports');
        setReportsList(data);
      }
    } catch (err) {
      console.error('Failed to fetch admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBlock = async (userId) => {
    try {
      const { data } = await API.put(`/admin/user-block/${userId}`);
      setUsersList((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, isBlocked: data.isBlocked } : u))
      );
    } catch (err) {
      console.error('Failed to toggle block status:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl p-6 shadow-2xl relative flex flex-col max-h-[85vh]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-blue-600/20 text-blue-400 rounded-2xl border border-blue-500/30">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-100">Admin Control Dashboard</h3>
            <p className="text-xs text-slate-400">Manage users, security moderation, and live analytics</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-slate-800 pb-3">
          {['analytics', 'users', 'reports'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all ${
                activeTab === tab
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {tab}
            </button>
          ))}
          <button
            onClick={fetchData}
            className="ml-auto p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto pr-1">
          {activeTab === 'analytics' && analytics && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="bg-slate-800/50 border border-slate-700/50 p-4 rounded-2xl">
                <Users className="w-5 h-5 text-cyan-400 mb-2" />
                <p className="text-2xl font-black text-slate-100">{analytics.totalUsers}</p>
                <p className="text-xs text-slate-400 font-medium">Total Registered Users</p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700/50 p-4 rounded-2xl">
                <Activity className="w-5 h-5 text-emerald-400 mb-2" />
                <p className="text-2xl font-black text-slate-100">{analytics.onlineUsers}</p>
                <p className="text-xs text-slate-400 font-medium">Active Online Users</p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700/50 p-4 rounded-2xl">
                <MessageSquare className="w-5 h-5 text-blue-400 mb-2" />
                <p className="text-2xl font-black text-slate-100">{analytics.totalMessages}</p>
                <p className="text-xs text-slate-400 font-medium">Messages Delivered</p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700/50 p-4 rounded-2xl">
                <ShieldAlert className="w-5 h-5 text-rose-400 mb-2" />
                <p className="text-2xl font-black text-slate-100">{analytics.pendingReports}</p>
                <p className="text-xs text-slate-400 font-medium">Pending Reports</p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700/50 p-4 rounded-2xl col-span-2">
                <p className="text-xs font-semibold text-slate-400 mb-1">Server Status</p>
                <div className="flex items-center gap-2 text-xs text-emerald-400 font-bold">
                  <CheckCircle className="w-4 h-4" />
                  <span>Healthy & Running ({Math.floor(analytics.serverUptime)}s Uptime)</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-2">
              {usersList.map((u) => (
                <div
                  key={u._id}
                  className="flex items-center justify-between p-3 bg-slate-800/40 border border-slate-800 rounded-2xl"
                >
                  <div className="flex items-center gap-3">
                    <Avatar src={u.avatar} name={u.name} isOnline={u.isOnline} size="md" />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-slate-100">{u.name}</h4>
                        {u.role === 'admin' && (
                          <span className="text-[9px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-extrabold uppercase">
                            Admin
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400">@{u.username || u.email}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleBlock(u._id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                      u.isBlocked
                        ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30'
                    }`}
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>{u.isBlocked ? 'Unblock User' : 'Block User'}</span>
                  </button>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="space-y-3">
              {reportsList.length === 0 ? (
                <p className="text-center text-xs text-slate-500 py-8">No user reports found</p>
              ) : (
                reportsList.map((r) => (
                  <div key={r._id} className="p-4 bg-slate-800/40 border border-slate-800 rounded-2xl">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Avatar src={r.reporter?.avatar} name={r.reporter?.name} size="sm" />
                        <span className="text-xs font-bold text-slate-200">{r.reporter?.name}</span>
                        <span className="text-xs text-slate-500">reported</span>
                        <Avatar src={r.reportedUser?.avatar} name={r.reportedUser?.name} size="sm" />
                        <span className="text-xs font-bold text-slate-200">{r.reportedUser?.name}</span>
                      </div>
                      <span className="text-[10px] bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded-full font-bold uppercase">
                        {r.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-xl">
                      "{r.reason}"
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardModal;
