import React from 'react';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { useCall } from '../../context/CallContext';
import Avatar from '../common/Avatar';

const IncomingCallModal = () => {
  const { receivingCall, caller, callType, answerCall, rejectCall, callAccepted } = useCall();

  if (!receivingCall || callAccepted) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 select-none animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-sm w-full shadow-2xl space-y-6 text-center">
        <div className="relative inline-block mx-auto">
          <Avatar src={caller?.avatar} name={caller?.name} size="xl" />
          <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center text-white shadow-lg animate-bounce">
            {callType === 'video' ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
          </div>
        </div>

        <div>
          <h3 className="text-xl font-bold text-slate-100">{caller?.name || 'Incoming Call'}</h3>
          <p className="text-xs font-semibold text-emerald-400 mt-1 flex items-center justify-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Incoming {callType === 'video' ? 'Video' : 'Voice'} Call...</span>
          </p>
        </div>

        <div className="flex items-center justify-center gap-6 pt-2">
          {/* Decline Button */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              onClick={rejectCall}
              className="w-14 h-14 bg-rose-600 hover:bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-rose-600/40 transition-all hover:scale-105"
              title="Decline Call"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
            <span className="text-[11px] font-semibold text-rose-400">Decline</span>
          </div>

          {/* Accept / Answer Button */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              onClick={answerCall}
              className="w-16 h-16 bg-emerald-500 hover:bg-emerald-400 text-white rounded-full flex items-center justify-center shadow-xl shadow-emerald-500/50 transition-all hover:scale-110 animate-pulse"
              title="Accept & Answer Call"
            >
              <Phone className="w-7 h-7" />
            </button>
            <span className="text-[11px] font-bold text-emerald-400">Accept</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallModal;
