import React, { useEffect, useRef, useState } from 'react';
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  PhoneOff,
  Maximize2,
  Minimize2,
  Sparkles,
  RefreshCw,
  FlipHorizontal,
  SwitchCamera,
  ScreenShare,
  User,
  AlertTriangle,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useCall } from '../../context/CallContext';
import Avatar from '../common/Avatar';

const VideoCallModal = () => {
  const {
    stream,
    remoteStream,
    receivingCall,
    callAccepted,
    isCalling,
    targetUser,
    caller,
    callType,
    isMuted,
    isVideoOff,
    isMirrored,
    facingMode,
    callDuration,
    callState,
    netQuality,
    endCall,
    toggleMute,
    toggleCamera,
    toggleMirror,
    switchCamera,
  } = useCall();

  const myVideoRef = useRef(null);
  const userVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const modalContainerRef = useRef(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [swapViews, setSwapViews] = useState(false);

  // Bind local stream
  useEffect(() => {
    const localVideo = swapViews ? userVideoRef.current : myVideoRef.current;
    if (localVideo && stream) {
      localVideo.srcObject = stream;
      localVideo.play().catch((err) => console.warn('[Video] Local play error:', err));
    }
  }, [stream, swapViews, callAccepted]);

  // Bind remote stream
  useEffect(() => {
    const remoteVideo = swapViews ? myVideoRef.current : userVideoRef.current;
    if (remoteVideo && remoteStream) {
      remoteVideo.srcObject = remoteStream;
      remoteVideo.play().catch((err) => console.warn('[Video] Remote play error:', err));
    }
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.play().catch((err) => console.warn('[Audio] Remote audio play error:', err));
    }
  }, [remoteStream, swapViews, callAccepted]);

  const formatTimer = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      modalContainerRef.current?.requestFullscreen().catch((err) => console.error(err));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch((err) => console.error(err));
      setIsFullscreen(false);
    }
  };

  const partner = targetUser || caller;

  if (!isCalling && !callAccepted && !receivingCall) return null;

  return (
    <div
      ref={modalContainerRef}
      className="fixed inset-0 z-[99999] bg-slate-950 flex flex-col justify-between p-2 sm:p-4 select-none overflow-hidden"
    >
      {/* Hidden Remote Audio Element for guaranteed remote audio playback */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* Top Header Bar */}
      <div className="w-full max-w-5xl mx-auto flex items-center justify-between bg-slate-900/80 border border-slate-800/80 rounded-2xl px-3.5 py-2.5 sm:px-5 sm:py-3 backdrop-blur-md shadow-lg z-20">
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar src={partner?.avatar} name={partner?.name} size="sm" />
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-bold text-slate-100 truncate">{partner?.name}</h3>
            <p className="text-[10px] sm:text-[11px] font-semibold flex items-center gap-1.5 truncate">
              {netQuality === 'poor' || callState.includes('Poor') ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  <span className="text-rose-400 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span>Connection Poor - Reconnecting...</span>
                  </span>
                </>
              ) : callAccepted ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span className="text-emerald-400 font-bold">Connected ({formatTimer(callDuration)})</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-amber-400">{callState || `Calling (${callType})...`}</span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {netQuality === 'poor' ? (
            <div className="flex items-center gap-1 px-2.5 py-1 bg-rose-500/20 border border-rose-500/40 text-rose-300 rounded-full text-xs font-bold animate-pulse">
              <WifiOff className="w-3.5 h-3.5" />
              <span>Poor Network</span>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-1 px-2.5 py-1 bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 rounded-full text-xs font-semibold">
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              <span>HD Ultra</span>
            </div>
          )}

          <button
            onClick={toggleFullscreen}
            className="p-2 hover:bg-slate-800 rounded-xl text-slate-300 hover:text-white transition-colors"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Video Stream Window */}
      <div className="relative w-full max-w-5xl mx-auto flex-1 my-2 bg-slate-900 border border-slate-800/80 rounded-3xl overflow-hidden flex items-center justify-center shadow-2xl">
        {callAccepted && remoteStream ? (
          <video
            ref={swapViews ? myVideoRef : userVideoRef}
            autoPlay
            playsInline
            muted={swapViews}
            style={{
              transform: swapViews && isMirrored ? 'scaleX(-1)' : 'none',
            }}
            className="w-full h-full object-cover rounded-3xl"
          />
        ) : (
          <div className="flex flex-col items-center gap-3 sm:gap-4 p-6 text-center">
            <Avatar
              src={partner?.avatar}
              name={partner?.name}
              size="xl"
              className="ring-4 ring-emerald-500/40 animate-pulse shadow-2xl shadow-emerald-500/20"
            />
            <h2 className="text-xl sm:text-2xl font-bold text-slate-100">{partner?.name}</h2>
            <p className="text-xs sm:text-sm text-emerald-400 font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Ringing for answer...</span>
            </p>
          </div>
        )}

        {/* Picture-In-Picture Floating Video Box (Click to swap views) */}
        {stream && (
          <div
            onClick={() => setSwapViews(!swapViews)}
            className="absolute bottom-3 right-3 w-28 h-40 sm:w-44 sm:h-60 bg-slate-950 border-2 border-cyan-500/50 hover:border-cyan-400 rounded-2xl overflow-hidden shadow-2xl z-20 cursor-pointer transition-all hover:scale-105 group/pip"
            title="Click to swap video view"
          >
            {callType === 'video' && !isVideoOff ? (
              <video
                ref={swapViews ? userVideoRef : myVideoRef}
                autoPlay
                playsInline
                muted={!swapViews}
                style={{
                  transform: !swapViews && isMirrored ? 'scaleX(-1)' : 'none',
                }}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center text-slate-500 gap-1">
                <User className="w-6 h-6 sm:w-8 sm:h-8" />
                <span className="text-[10px] font-semibold">Camera Off</span>
              </div>
            )}

            <div className="absolute top-1.5 right-1.5 p-1 bg-black/60 backdrop-blur-md rounded-lg text-white opacity-0 group-hover/pip:opacity-100 transition-opacity">
              <RefreshCw className="w-3 h-3" />
            </div>
          </div>
        )}
      </div>

      {/* Responsive Floating Action Controls Bar */}
      <div className="w-full max-w-5xl mx-auto flex items-center justify-center gap-2.5 sm:gap-4 bg-slate-900/90 border border-slate-800 px-4 py-2.5 sm:px-6 sm:py-3.5 rounded-full backdrop-blur-xl shadow-2xl z-20 flex-wrap">
        {/* Mute Mic */}
        <button
          onClick={toggleMute}
          className={`p-3 sm:p-3.5 rounded-full border transition-all ${
            isMuted
              ? 'bg-rose-600 border-rose-500 text-white shadow-lg shadow-rose-600/30'
              : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
          }`}
          title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
        >
          {isMuted ? <MicOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Mic className="w-4 h-4 sm:w-5 sm:h-5" />}
        </button>

        {/* Toggle Camera */}
        {callType === 'video' && (
          <>
            <button
              onClick={toggleCamera}
              className={`p-3 sm:p-3.5 rounded-full border transition-all ${
                isVideoOff
                  ? 'bg-rose-600 border-rose-500 text-white shadow-lg shadow-rose-600/30'
                  : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
              }`}
              title={isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
            >
              {isVideoOff ? <VideoOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <VideoIcon className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>

            {/* Mirror Camera */}
            <button
              onClick={toggleMirror}
              className={`p-3 sm:p-3.5 rounded-full border transition-all ${
                isMirrored
                  ? 'bg-cyan-600/30 border-cyan-500 text-cyan-300'
                  : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
              }`}
              title={isMirrored ? 'Disable Mirror' : 'Enable Mirror'}
            >
              <FlipHorizontal className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Screen Share */}
            <button
              onClick={async () => {
                try {
                  const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                  if (myVideoRef.current) myVideoRef.current.srcObject = screenStream;
                } catch (err) {
                  console.error('Screen sharing error:', err);
                }
              }}
              className="p-3 sm:p-3.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-400 rounded-full transition-all"
              title="Share Screen"
            >
              <ScreenShare className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Switch Camera */}
            <button
              onClick={switchCamera}
              className="p-3 sm:p-3.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-full transition-all"
              title={`Switch Camera (${facingMode === 'user' ? 'Front' : 'Back'})`}
            >
              <SwitchCamera className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </>
        )}

        {/* End Call */}
        <button
          onClick={endCall}
          className="p-3.5 sm:p-4 bg-rose-600 hover:bg-rose-500 border border-rose-500 text-white rounded-full shadow-xl shadow-rose-600/50 transition-all hover:scale-105"
          title="End Call"
        >
          <PhoneOff className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      </div>
    </div>
  );
};

export default VideoCallModal;
