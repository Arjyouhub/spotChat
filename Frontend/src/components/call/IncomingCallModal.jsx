import React from 'react';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { useCall } from '../../context/CallContext';
import Avatar from '../common/Avatar';

const IncomingCallModal = () => {
  const { receivingCall, caller, callType, answerCall, rejectCall, callAccepted } =
    useCall();

  if (!receivingCall || callAccepted) return null;

  return (
    <div className="fixed top-4 sm:top-6 right-4 sm:right-6 left-4 sm:left-auto z-50 bg-slate-900/95 border border-cyan-500/40 rounded-3xl p-4 sm:p-5 shadow-2xl backdrop-blur-xl max-w-sm w-auto sm:w-full ring-pulse">
      <div className="flex items-center gap-4">
        <Avatar src={caller?.avatar} name={caller?.name} size="lg" />
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-slate-100 truncate">
            {caller?.name}
          </h4>
          <p className="text-xs text-cyan-400 font-medium flex items-center gap-1 mt-0.5">
            {callType === 'video' ? (
              <Video className="w-3.5 h-3.5" />
            ) : (
              <Phone className="w-3.5 h-3.5" />
            )}
            <span>Incoming {callType} call...</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-5">
        <button
          onClick={rejectCall}
          className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30 transition-all"
        >
          <PhoneOff className="w-4 h-4" />
          <span>Decline</span>
        </button>
        <button
          onClick={answerCall}
          className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all animate-pulse"
        >
          <Phone className="w-4 h-4" />
          <span>Accept</span>
        </button>
      </div>
    </div>
  );
};

export default IncomingCallModal;
