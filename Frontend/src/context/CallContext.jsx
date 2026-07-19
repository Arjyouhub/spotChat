import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';

const CallContext = createContext();

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
};

const getHDConstraints = (type, facing = 'user') => ({
  video:
    type === 'video'
      ? {
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          frameRate: { ideal: 30, max: 60 },
          facingMode: facing,
        }
      : false,
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 48000,
    channelCount: 2,
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

  const connectionRef = useRef(null);
  const localStreamRef = useRef(null);

  useEffect(() => {
    if (!socket) return;

    socket.on('incoming_call', ({ from, name, avatar, signal, callType }) => {
      setReceivingCall(true);
      setCaller({ id: from, name, avatar });
      setCallerSignal(signal);
      setCallType(callType || 'video');
    });

    socket.on('call_accepted', async ({ signal }) => {
      setCallAccepted(true);
      setIsCalling(false);
      if (connectionRef.current) {
        try {
          await connectionRef.current.setRemoteDescription(new RTCSessionDescription(signal));
          applyHDBitrateOptimization(connectionRef.current);
        } catch (e) {
          console.error('Error setting remote description on call acceptance:', e);
        }
      }
    });

    socket.on('ice_candidate', async ({ candidate }) => {
      if (connectionRef.current && candidate) {
        try {
          await connectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error('Error adding ICE candidate:', e);
        }
      }
    });

    socket.on('call_rejected', () => {
      cleanupCall();
      alert('Call was declined');
    });

    socket.on('call_ended', () => {
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

  const callUser = async (userToCall, type = 'video') => {
    if (!socket || !userToCall) return;

    setCallType(type);
    setIsCalling(true);
    setTargetUser(userToCall);

    try {
      const currentStream = await navigator.mediaDevices.getUserMedia(getHDConstraints(type, facingMode));

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
            to: userToCall._id,
            candidate: event.candidate,
          });
        }
      };

      peer.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
        }
      };

      const offer = await peer.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: type === 'video',
      });
      await peer.setLocalDescription(offer);

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
      console.error('Error accessing HD media devices for call:', err);
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: type === 'video',
          audio: true,
        });
        setStream(fallbackStream);
        localStreamRef.current = fallbackStream;
      } catch (fallbackErr) {
        alert('Could not access microphone/camera. Please check permissions.');
        cleanupCall();
      }
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
    cleanupCall();
  };

  const endCall = () => {
    const peerId = targetUser ? targetUser._id : caller ? caller.id : null;
    if (socket && peerId) {
      socket.emit('end_call', { to: peerId });
    }
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
