import React, { useEffect, useRef, useState } from 'react';
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  PhoneOff,
  User,
  Maximize2,
  Minimize2,
  Sparkles,
  RefreshCw,
  FlipHorizontal,
  SwitchCamera,
  ScreenShare,
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

  useEffect(() => {
    if (myVideoRef.current && stream) {
      myVideoRef.current.srcObject = stream;
    }
    if (userVideoRef.current && remoteStream) {
      userVideoRef.current.srcObject = remoteStream;
    }
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.play().catch(() => {});
    }
  }, [stream, remoteStream, callAccepted, swapViews]);

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
      className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-2xl flex flex-col items-center justify-between p-4 sm:p-6 select-none"
    >
      {/* Hidden Remote Audio Element for guaranteed remote stream audio output */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* Top Header Controls & HD Badge */}
      <div className="w-full max-w-5xl flex items-center justify-between bg-slate-900/70 border border-slate-800 rounded-2xl px-6 py-3 backdrop-blur-md shadow-xl z-20">
        <div className="flex items-center gap-3">
          <Avatar src={partner?.avatar} name={partner?.name} size="sm" />
          <div>
            <h3 className="text-sm font-bold text-slate-100">{partner?.name}</h3>
            <p className="text-[11px] text-cyan-400 font-medium flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${callAccepted ? 'bg-emerald-500 animate-ping' : 'bg-amber-500 animate-pulse'}`} />
              {callAccepted ? `Call Connected (${formatTimer(callDuration)})` : callState || `Calling (${callType})...`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* HD Quality Tag */}
          <div className="hidden sm:flex items-center gap-1 px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 rounded-full text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>HD Ultra Clarity</span>
          </div>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Video Stream Container */}
      <div className="relative w-full max-w-5xl flex-1 my-3 bg-slate-900 border border-slate-800/80 rounded-3xl overflow-hidden flex items-center justify-center shadow-2xl group">
        {/* Main Canvas Stream */}
        {callAccepted && remoteStream ? (
          <video
            ref={(node) => {
              const targetRef = swapViews ? myVideoRef : userVideoRef;
              targetRef.current = node;
              const targetStream = swapViews ? stream : remoteStream;
              if (node && targetStream && node.srcObject !== targetStream) {
                node.srcObject = targetStream;
                node.play().catch((err) => console.warn('Video play warning:', err));
              }
            }}
            autoPlay
            playsInline
            muted={swapViews ? isMuted : false}
            style={{
              transform: swapViews && isMirrored ? 'scaleX(-1)' : 'none',
            }}
            className="w-full h-full object-cover rounded-3xl transition-transform duration-300"
          />
        ) : (
          <div className="flex flex-col items-center gap-4 p-8 text-center">
            <Avatar
              src={partner?.avatar}
              name={partner?.name}
              size="xl"
              className="ring-4 ring-blue-500/40 animate-pulse shadow-2xl shadow-blue-500/20"
            />
            <h2 className="text-2xl font-bold text-slate-100">{partner?.name}</h2>
            <p className="text-xs text-slate-400 font-medium">Ringing for answer...</p>
          </div>
        )}

        {/* Local Stream Floating PIP Box (Click to swap views) */}
        {stream && (
          <div
            onClick={() => setSwapViews(!swapViews)}
            className="absolute bottom-4 right-4 w-36 h-48 sm:w-48 sm:h-64 bg-slate-950 border-2 border-cyan-500/40 hover:border-cyan-400 rounded-2xl overflow-hidden shadow-2xl z-20 cursor-pointer transition-all hover:scale-105 group/pip"
            title="Click to swap video view"
          >
            {callType === 'video' && !isVideoOff ? (
              <video
                ref={(node) => {
                  const targetRef = swapViews ? userVideoRef : myVideoRef;
                  targetRef.current = node;
                  const targetStream = swapViews ? remoteStream : stream;
                  if (node && targetStream && node.srcObject !== targetStream) {
                    node.srcObject = targetStream;
                    node.play().catch((err) => console.warn('PIP video play warning:', err));
                  }
                }}
                autoPlay
                muted={!swapViews}
                playsInline
                style={{
                  transform: !swapViews && isMirrored ? 'scaleX(-1)' : 'none',
                }}
                className="w-full h-full object-cover transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full bg-slate-900 flex items-center justify-center text-slate-500">
                <User className="w-8 h-8" />
              </div>
            )}
            <div className="absolute top-2 right-2 p-1 bg-black/60 backdrop-blur-md rounded-lg text-white opacity-0 group-hover/pip:opacity-100 transition-opacity">
              <RefreshCw className="w-3.5 h-3.5" />
            </div>
          </div>
        )}
      </div>

      {/* Floating Call Action Controls Bar */}
      <div className="flex items-center gap-3 sm:gap-4 bg-slate-900/90 border border-slate-800 px-5 sm:px-6 py-3.5 rounded-full backdrop-blur-xl shadow-2xl z-20">
        {/* Mute Mic */}
        <button
          onClick={toggleMute}
          className={`p-3.5 rounded-full border transition-all ${
            isMuted
              ? 'bg-rose-600 border-rose-500 text-white shadow-lg shadow-rose-600/30'
              : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
          }`}
          title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        {/* Toggle Video Camera */}
        {callType === 'video' && (
          <>
            <button
              onClick={toggleCamera}
              className={`p-3.5 rounded-full border transition-all ${
                isVideoOff
                  ? 'bg-rose-600 border-rose-500 text-white shadow-lg shadow-rose-600/30'
                  : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
              }`}
              title={isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
            >
              {isVideoOff ? <VideoOff className="w-5 h-5" /> : <VideoIcon className="w-5 h-5" />}
            </button>

            {/* Mirror Camera Toggle Button */}
            <button
              onClick={toggleMirror}
              className={`p-3.5 rounded-full border transition-all ${
                isMirrored
                  ? 'bg-cyan-600/30 border-cyan-500 text-cyan-300'
                  : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
              }`}
              title={isMirrored ? 'Disable Mirror Camera' : 'Enable Mirror Camera'}
            >
              <FlipHorizontal className="w-5 h-5" />
            </button>

            {/* Screen Share Button */}
            <button
              onClick={async () => {
                try {
                  const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                  if (myVideoRef.current) myVideoRef.current.srcObject = screenStream;
                } catch (err) {
                  console.error('Screen sharing error:', err);
                }
              }}
              className="p-3.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-400 rounded-full transition-all"
              title="Share Screen"
            >
              <ScreenShare className="w-5 h-5" />
            </button>

            {/* Switch Camera (Front / Back) Button */}
            <button
              onClick={switchCamera}
              className="p-3.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-full transition-all"
              title={`Switch Camera (${facingMode === 'user' ? 'Front' : 'Back'})`}
            >
              <SwitchCamera className="w-5 h-5" />
            </button>
          </>
        )}

        {/* End Call */}
        <button
          onClick={endCall}
          className="p-3.5 bg-rose-600 hover:bg-rose-500 border border-rose-500 text-white rounded-full shadow-lg shadow-rose-600/40 transition-all scale-110"
          title="End Call"
        >
          <PhoneOff className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default VideoCallModal;
