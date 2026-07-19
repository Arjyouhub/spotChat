import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';
import API from '../services/api';

const CallContext = createContext();

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' },
    { urls: 'stun:stun.services.mozilla.com' },
  ],
};

const getHDConstraints = (type, facing = 'user') => ({
  video:
    type === 'video'
      ? {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        }
      : false,
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
});

const applyHDBitrateOptimization = (peer) => {
  try {
    peer.getSenders().forEach((sender) => {
      if (sender.track && sender.track.kind === 'video') {
        const params = sender.getParameters();
        if (!params.encodings || params.encodings.length === 0) {
          params.encodings = [{}];
        }
        params.encodings[0].maxBitrate = 3000000; // 3 Mbps
        params.encodings[0].maxFramerate = 30;
        sender.setParameters(params).catch((err) => console.warn('HD bitrate warning:', err));
      }
    });
  } catch (err) {
    console.warn('Bitrate tuning error:', err);
  }
};

export const CallProvider = ({ children }) => {
  const { socket } = useSocket();
  const { user } = useAuth();

  const [stream, setStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState(null);
  const [callerSignal, setCallerSignal] = useState(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [callType, setCallType] = useState('video');
  const [targetUser, setTargetUser] = useState(null);

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isMirrored, setIsMirrored] = useState(true);
  const [facingMode, setFacingMode] = useState('user');
  const [callDuration, setCallDuration] = useState(0);

  const connectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const ringtoneAudioRef = useRef(null);
  const ringbackAudioRef = useRef(null);
  const callTimerIntervalRef = useRef(null);
  const activeChatIdRef = useRef(null);

  const audioCtxRef = useRef(null);
  const ringtoneIntervalRef = useRef(null);

  const saveCallLogToChat = async (status, durationSec = 0, targetChatId = null) => {
    try {
      const chatId = targetChatId || activeChatIdRef.current;
      if (!chatId) return;

      const mins = Math.floor(durationSec / 60);
      const secs = durationSec % 60;
      const durationStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

      const contentText =
        status === 'completed'
          ? `${callType === 'video' ? '📹 Video call' : '📞 Voice call'} (${durationStr})`
          : `${callType === 'video' ? '📹 Missed video call' : '📞 Missed voice call'}`;

      const { data } = await API.post('/messages', {
        chatId,
        content: contentText,
        isCallLog: true,
        callType,
        callStatus: status,
        callDuration: durationSec,
      });

      if (socket) {
        socket.emit('new_message', data);
      }
    } catch (e) {
      console.error('Error saving call log:', e);
    }
  };

  // Preload Pleasant Melodic Ringtone & Classic Ringback Audio
  useEffect(() => {
    try {
      ringtoneAudioRef.current = new Audio('/assets/sounds/ringtone.mp3');
      ringtoneAudioRef.current.loop = true;
      ringtoneAudioRef.current.preload = 'auto';

      ringbackAudioRef.current = new Audio('/assets/sounds/ringback.mp3');
      ringbackAudioRef.current.loop = true;
      ringbackAudioRef.current.preload = 'auto';
    } catch (e) {
      console.warn('Audio preloading error:', e);
    }

    return () => {
      if (ringtoneAudioRef.current) {
        try { ringtoneAudioRef.current.pause(); } catch (e) {}
        ringtoneAudioRef.current = null;
      }
      if (ringbackAudioRef.current) {
        try { ringbackAudioRef.current.pause(); } catch (e) {}
        ringbackAudioRef.current = null;
      }
    };
  }, []);

  // Play Sound (Incoming Ringtone vs Outgoing Ringback)
  const startRingtone = (isIncoming = false) => {
    // Stop any active sound first to prevent overlapping
    stopRingtone();

    const targetAudio = isIncoming ? ringtoneAudioRef.current : ringbackAudioRef.current;

    try {
      if (targetAudio) {
        targetAudio.currentTime = 0;
        const playPromise = targetAudio.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            console.warn('[Audio] HTML5 ringtone play restricted, starting Web Audio chime fallback:', err);
            startWebAudioChimeSynth(isIncoming);
          });
        }
      } else {
        startWebAudioChimeSynth(isIncoming);
      }
    } catch (e) {
      startWebAudioChimeSynth(isIncoming);
    }
  };

  // Web Audio API Soft Chime & Ringback Synthesizer
  const startWebAudioChimeSynth = (isIncoming = false) => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const playMelodicPulse = () => {
        if (!audioCtxRef.current) return;
        const now = ctx.currentTime;

        if (isIncoming) {
          // Soft Melodic Chime Notes: C5 (523Hz), E5 (659Hz), G5 (784Hz), C6 (1046Hz)
          const notes = [
            { freq: 523.25, timeOffset: 0.0, dur: 0.3 },
            { freq: 659.25, timeOffset: 0.2, dur: 0.3 },
            { freq: 783.99, timeOffset: 0.4, dur: 0.4 },
            { freq: 1046.50, timeOffset: 0.65, dur: 0.6 },
          ];

          notes.forEach(({ freq, timeOffset, dur }) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + timeOffset);

            gain.gain.setValueAtTime(0, now + timeOffset);
            gain.gain.linearRampToValueAtTime(0.12, now + timeOffset + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + timeOffset + dur);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now + timeOffset);
            osc.stop(now + timeOffset + dur);
          });
        } else {
          // Outgoing call ringback pulse
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain = ctx.createGain();

          osc1.type = 'sine';
          osc2.type = 'sine';
          osc1.frequency.setValueAtTime(440, now);
          osc2.frequency.setValueAtTime(480, now);

          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(0.08, now + 0.05);
          gain.gain.setValueAtTime(0.08, now + 1.8);
          gain.gain.linearRampToValueAtTime(0, now + 2.0);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(ctx.destination);

          osc1.start(now);
          osc2.start(now);
          osc1.stop(now + 2.0);
          osc2.stop(now + 2.0);
        }
      };

      playMelodicPulse();
      clearInterval(ringtoneIntervalRef.current);
      ringtoneIntervalRef.current = setInterval(playMelodicPulse, isIncoming ? 2500 : 4000);
    } catch (e) {
      console.error('Web Audio Synth error:', e);
    }
  };

  const stopRingtone = () => {
    if (ringtoneAudioRef.current) {
      try {
        ringtoneAudioRef.current.pause();
        ringtoneAudioRef.current.currentTime = 0;
      } catch (e) {}
    }
    if (ringbackAudioRef.current) {
      try {
        ringbackAudioRef.current.pause();
        ringbackAudioRef.current.currentTime = 0;
      } catch (e) {}
    }
    clearInterval(ringtoneIntervalRef.current);
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch (e) {}
      audioCtxRef.current = null;
    }
  };

  // Call Duration Timer
  useEffect(() => {
    if (callAccepted && !callEnded) {
      stopRingtone();
      callTimerIntervalRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(callTimerIntervalRef.current);
      setCallDuration(0);
    }
    return () => clearInterval(callTimerIntervalRef.current);
  }, [callAccepted, callEnded]);

  useEffect(() => {
    if (receivingCall) {
      startRingtone(true);
    } else if (isCalling) {
      startRingtone(false);
    } else {
      stopRingtone();
    }
  }, [receivingCall, isCalling]);

  const [callState, setCallState] = useState('Idle');

  useEffect(() => {
    if (!socket) return;

    socket.on('incoming_call', ({ from, name, avatar, signal, callType }) => {
      console.log('[WebRTC] Socket incoming-call received from:', name);
      console.log('[WebRTC] Offer received');
      setReceivingCall(true);
      setCaller({ id: from, name, avatar });
      setCallerSignal(signal);
      setCallType(callType || 'video');
      setCallState('Connecting...');
    });

    socket.on('call_accepted', async ({ signal }) => {
      console.log('[WebRTC] Socket call-accepted received');
      console.log('[WebRTC] Answer received');
      setCallAccepted(true);
      setIsCalling(false);
      setCallState('Connected');
      if (connectionRef.current) {
        try {
          await connectionRef.current.setRemoteDescription(new RTCSessionDescription(signal));
          applyHDBitrateOptimization(connectionRef.current);
        } catch (e) {
          console.error('[WebRTC] Error setting remote description on call acceptance:', e);
          setCallState('Call Failed');
        }
      }
    });

    socket.on('ice_candidate', async ({ candidate }) => {
      console.log('[WebRTC] ICE candidate received:', candidate);
      if (connectionRef.current && candidate) {
        try {
          await connectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error('[WebRTC] Error adding ICE candidate:', e);
        }
      }
    });

    socket.on('call_rejected', () => {
      console.log('[WebRTC] Socket call-rejected received');
      setCallState('Call Ended');
      cleanupCall();
      alert('Call was declined');
    });

    socket.on('call_ended', () => {
      console.log('[WebRTC] Socket call-ended received');
      setCallState('Call Ended');
      cleanupCall();
    });

    return () => {
      socket.off('incoming_call');
      socket.off('call_accepted');
      socket.off('ice_candidate');
      socket.off('call_rejected');
      socket.off('call_ended');
    };
  }, [socket]);

  const callUser = async (userToCall, type = 'video', chatId = null) => {
    if (!socket || !userToCall) return;
    if (chatId) activeChatIdRef.current = chatId;

    console.log('[WebRTC] Initiating call to:', userToCall.name, 'Type:', type);
    setCallType(type);
    setIsCalling(true);
    setTargetUser(userToCall);
    setCallState('Connecting...');

    try {
      const currentStream = await navigator.mediaDevices.getUserMedia(getHDConstraints(type, facingMode));
      console.log('[WebRTC] Media permissions granted');

      setStream(currentStream);
      localStreamRef.current = currentStream;

      const peer = new RTCPeerConnection(ICE_SERVERS);
      connectionRef.current = peer;

      peer.oniceconnectionstatechange = () => {
        console.log('[WebRTC] ICE state:', peer.iceConnectionState);
        if (peer.iceConnectionState === 'connected') setCallState('Connected');
        if (peer.iceConnectionState === 'disconnected') setCallState('Reconnecting...');
        if (peer.iceConnectionState === 'failed') setCallState('Call Failed');
      };

      peer.onconnectionstatechange = () => {
        console.log('[WebRTC] Connection state:', peer.connectionState);
        if (peer.connectionState === 'connected') setCallState('Connected');
        if (peer.connectionState === 'failed') setCallState('Call Failed');
      };

      peer.onsignalingstatechange = () => {
        console.log('[WebRTC] Signaling state:', peer.signalingState);
      };

      currentStream.getTracks().forEach((track) => {
        peer.addTrack(track, currentStream);
      });

      peer.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('[WebRTC] ICE candidate sent:', event.candidate);
          socket.emit('ice_candidate', {
            to: userToCall._id,
            candidate: event.candidate,
          });
        }
      };

      peer.ontrack = (event) => {
        console.log('[WebRTC] Remote track received:', event.track);
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
        }
      };

      const offer = await peer.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: type === 'video',
      });
      await peer.setLocalDescription(offer);
      console.log('[WebRTC] Offer created:', offer);

      socket.emit('call_user', {
        userToCall: userToCall._id,
        signalData: offer,
        from: user._id,
        name: user.name,
        avatar: user.avatar,
        callType: type,
      });

      applyHDBitrateOptimization(peer);
    } catch (err) {
      console.error('[WebRTC] Error accessing media devices for call:', err);
      setCallState('Call Failed');
      alert('Could not access microphone/camera. Please check permissions.');
      cleanupCall();
    }
  };

  const answerCall = async () => {
    if (!socket || !caller || !callerSignal) return;

    setCallAccepted(true);
    setReceivingCall(false);

    try {
      const currentStream = await navigator.mediaDevices.getUserMedia(getHDConstraints(callType, facingMode));

      setStream(currentStream);
      localStreamRef.current = currentStream;

      const peer = new RTCPeerConnection(ICE_SERVERS);
      connectionRef.current = peer;

      currentStream.getTracks().forEach((track) => {
        peer.addTrack(track, currentStream);
      });

      peer.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('ice_candidate', {
            to: caller.id,
            candidate: event.candidate,
          });
        }
      };

      peer.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
        }
      };

      await peer.setRemoteDescription(new RTCSessionDescription(callerSignal));
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);

      socket.emit('answer_call', {
        to: caller.id,
        signal: answer,
      });

      applyHDBitrateOptimization(peer);
    } catch (err) {
      console.error('Error answering HD call:', err);
      cleanupCall();
    }
  };

  const rejectCall = () => {
    if (socket && caller) {
      socket.emit('reject_call', { to: caller.id });
    }
    saveCallLogToChat('rejected', 0);
    cleanupCall();
  };

  const endCall = () => {
    const peerId = targetUser ? targetUser._id : caller ? caller.id : null;
    if (socket && peerId) {
      socket.emit('end_call', { to: peerId });
    }
    saveCallLogToChat(callDuration > 0 ? 'completed' : 'cancelled', callDuration);
    cleanupCall();
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleCamera = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const toggleMirror = () => {
    setIsMirrored((prev) => !prev);
  };

  const switchCamera = async () => {
    if (callType !== 'video' || !localStreamRef.current) return;
    const nextFacingMode = facingMode === 'user' ? 'environment' : 'user';

    try {
      const newVideoStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: nextFacingMode,
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
        },
      });

      const newVideoTrack = newVideoStream.getVideoTracks()[0];
      const oldVideoTrack = localStreamRef.current.getVideoTracks()[0];

      if (oldVideoTrack) {
        localStreamRef.current.removeTrack(oldVideoTrack);
        oldVideoTrack.stop();
      }

      localStreamRef.current.addTrack(newVideoTrack);
      setStream(new MediaStream(localStreamRef.current.getTracks()));
      setFacingMode(nextFacingMode);

      if (connectionRef.current) {
        const sender = connectionRef.current
          .getSenders()
          .find((s) => s.track && s.track.kind === 'video');
        if (sender) {
          await sender.replaceTrack(newVideoTrack);
        }
      }
    } catch (err) {
      console.error('Camera switch failed:', err);
    }
  };

  const cleanupCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (connectionRef.current) {
      connectionRef.current.close();
    }

    setStream(null);
    setRemoteStream(null);
    setReceivingCall(false);
    setCaller(null);
    setCallerSignal(null);
    setCallAccepted(false);
    setCallEnded(true);
    setIsCalling(false);
    setTargetUser(null);
    setIsMuted(false);
    setIsVideoOff(false);
    setIsMirrored(true);
    setFacingMode('user');
  };

  return (
    <CallContext.Provider
      value={{
        stream,
        remoteStream,
        receivingCall,
        caller,
        callAccepted,
        callEnded,
        isCalling,
        callType,
        targetUser,
        isMuted,
        isVideoOff,
        isMirrored,
        facingMode,
        callDuration,
        callState,
        callUser,
        answerCall,
        rejectCall,
        endCall,
        toggleMute,
        toggleCamera,
        toggleMirror,
        switchCamera,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => useContext(CallContext);
