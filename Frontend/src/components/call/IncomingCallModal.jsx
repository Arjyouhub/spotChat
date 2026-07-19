import React from 'react';
import { Phone, PhoneOff, Video, CheckCircle2 } from 'lucide-react';
import { useCall } from '../../context/CallContext';
import Avatar from '../common/Avatar';

const IncomingCallModal = () => {
  const { receivingCall, caller, callType, answerCall, rejectCall, callAccepted } = useCall();

  if (!receivingCall || callAccepted) return null;

  return (
    <>
      {/* Top Floating Quick-Answer Bar (Un-missable Banner) */}
      <div className="fixed top-3 left-3 right-3 sm:left-auto sm:right-6 sm:w-96 z-[999999] bg-slate-900/95 border-2 border-emerald-500/80 rounded-3xl p-4 shadow-2xl backdrop-blur-2xl ring-4 ring-emerald-500/20 animate-bounce">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar src={caller?.avatar} name={caller?.name} size="md" />
            <div className="min-w-0">
              <h4 className="text-xs sm:text-sm font-bold text-slate-100 truncate">
                {caller?.name || 'Incoming Call'}
              </h4>
              <p className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                {callType === 'video' ? <Video className="w-3.5 h-3.5" /> : <Phone className="w-3.5 h-3.5" />}
                <span>Incoming {callType === 'video' ? 'Video' : 'Voice'} Call</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={rejectCall}
              className="p-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-full shadow-lg shadow-rose-600/40 transition-transform hover:scale-105"
              title="Decline"
            >
              <PhoneOff className="w-4 h-4" />
            </button>
            <button
              onClick={answerCall}
              className="px-3.5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-full font-bold text-xs flex items-center gap-1.5 shadow-xl shadow-emerald-500/50 transition-transform hover:scale-105 animate-pulse"
              title="Accept & Answer Call"
            >
              <Phone className="w-4 h-4" />
              <span>ANSWER</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Full-Screen Backdrop Overlay */}
      <div className="fixed inset-0 z-[999990] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 select-none">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-sm w-full shadow-2xl space-y-6 text-center">
          <div className="relative inline-block mx-auto">
            <Avatar src={caller?.avatar} name={caller?.name} size="xl" />
            <div className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center text-white shadow-lg animate-bounce">
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

          <div className="flex items-center justify-center gap-8 pt-2">
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
              <span className="text-[11px] font-bold text-emerald-400">Accept & Answer</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default IncomingCallModal;
