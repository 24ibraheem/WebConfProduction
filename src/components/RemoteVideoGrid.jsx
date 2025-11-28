import React, { useEffect, useRef, useState } from 'react';

/**
 * RemoteVideoGrid Component
 * Displays remote peer video streams in a responsive grid layout
 * 
 * @param {Array} remoteStreams - Array of { peerId, stream, id }
 * @param {Object} connectionStatus - Map of peerId -> connectionState
 */
export default function RemoteVideoGrid({ remoteStreams, connectionStatus }) {
  if (!remoteStreams || remoteStreams.length === 0) {
    return null;
  }

  return (
    <div className="w-full">
      {/* Grid layout - responsive */}
      <div className={`grid gap-2 ${
        remoteStreams.length === 1 ? 'grid-cols-1' :
        remoteStreams.length === 2 ? 'grid-cols-2' :
        remoteStreams.length === 3 ? 'grid-cols-3' :
        remoteStreams.length === 4 ? 'grid-cols-2' :
        'grid-cols-3'
      }`}>
        {remoteStreams.map((remoteStream) => (
          <RemoteVideoCard
            key={remoteStream.peerId}
            remoteStream={remoteStream}
            status={connectionStatus[remoteStream.peerId] || 'connecting'}
          />
        ))}
      </div>
      
      {/* Connection summary */}
      <div className="mt-2 text-center">
        <p className="text-[10px] text-slate-500">
          {remoteStreams.length} peer{remoteStreams.length !== 1 ? 's' : ''} connected
        </p>
      </div>
    </div>
  );
}

export function RemoteVideoCard({ remoteStream, status, isMain = false }) {
  const videoRef = useRef(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const peerId = remoteStream?.peerId || null;

  useEffect(() => {
    setIsAudioEnabled(true);
    setAutoplayBlocked(false);
  }, [peerId]);

  useEffect(() => {
    const element = videoRef.current;
    const stream = remoteStream?.stream || null;

    if (!element) {
      return undefined;
    }

    if (!stream) {
      element.pause();
      element.removeAttribute('srcObject');
      element.srcObject = null;
      element.defaultMuted = true;
      element.muted = true;
      element.volume = 0;
      setIsAudioEnabled(true);
      setAutoplayBlocked(false);
      return undefined;
    }

    const peerLabel = peerId ? peerId.substring(0, 8) : 'unknown';

    if (element.srcObject !== stream) {
      element.srcObject = stream;
      element.defaultMuted = !isAudioEnabled;
      console.log(`📺 [RemoteVideoGrid] Attached stream for peer ${peerLabel}`);
    }

    const audioTracks = stream.getAudioTracks();
    const hasAudio = audioTracks.length > 0;

    audioTracks.forEach(track => {
      if (!track.enabled) {
        track.enabled = true;
      }
    });

    element.muted = !isAudioEnabled;
    element.volume = isAudioEnabled ? 1 : 0;
    element.playsInline = true;
    element.defaultMuted = !isAudioEnabled;

    const ensurePlayback = async () => {
      try {
        if (element.paused || element.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) {
          await element.play();
        }
      } catch (error) {
        if (error.name === 'NotAllowedError') {
          console.warn(`⚠️ [RemoteVideoGrid] Autoplay blocked for peer ${peerLabel}.`);
          setAutoplayBlocked(true);
          setIsAudioEnabled(false);
        } else {
          console.error('❌ [RemoteVideoGrid] Failed to start remote stream playback:', error);
        }
      }
    };

    ensurePlayback();

    const handleLoadedData = () => {
      if (element.paused) {
        ensurePlayback();
      }
    };

    element.addEventListener('loadeddata', handleLoadedData);

    if (!hasAudio) {
      setAutoplayBlocked(false);
      setIsAudioEnabled(false);
    }

    return () => {
      element.removeEventListener('loadeddata', handleLoadedData);
      if (element.srcObject === stream) {
        element.srcObject = null;
      }
    };
  }, [remoteStream?.stream, peerId, isAudioEnabled]);

  const handleEnableAudio = async () => {
    const element = videoRef.current;
    if (!element || !remoteStream?.stream) return;

    try {
      element.muted = false;
      element.defaultMuted = false;
      element.volume = 1;
      await element.play();
      setIsAudioEnabled(true);
      setAutoplayBlocked(false);
    } catch (error) {
      console.error('❌ [RemoteVideoGrid] Failed to enable remote audio:', error);
      element.muted = true;
      element.volume = 0;
      setIsAudioEnabled(false);
      setAutoplayBlocked(true);
    }
  };

  // Status badge color
  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return 'bg-emerald-500';
      case 'connecting':
        return 'bg-amber-500';
      case 'disconnected':
        return 'bg-rose-500';
      case 'failed':
        return 'bg-red-600';
      default:
        return 'bg-slate-500';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'disconnected':
        return 'Disconnected';
      case 'failed':
        return 'Failed';
      default:
        return 'Unknown';
    }
  };

  const hasVideo = Boolean(remoteStream?.stream && remoteStream.stream.getVideoTracks().length);
  const hasAudioTrack = Boolean(remoteStream?.stream && remoteStream.stream.getAudioTracks().length);
  const showAudioPrompt = hasAudioTrack && (!isAudioEnabled || autoplayBlocked);

  return (
    <div className={`relative bg-slate-900/50 backdrop-blur-sm rounded-xl overflow-hidden border border-slate-700/50 shadow-lg shadow-black/20 ring-1 ring-white/5 ${isMain ? 'h-full' : ''}`}>
      {/* Video element */}
      <div className={`relative w-full ${isMain ? 'h-full' : ''}`} style={isMain ? {} : { paddingBottom: '75%' }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={!isAudioEnabled}
          className="absolute inset-0 w-full h-full object-cover bg-black"
        />
        
        {showAudioPrompt && (
          <div className="absolute bottom-3 right-3 flex items-center gap-2 bg-black/60 backdrop-blur-sm border border-white/10 px-3 py-2 rounded-lg z-30">
            <span className="text-[10px] text-white/80 font-medium">Click to hear participant</span>
            <button
              type="button"
              onClick={handleEnableAudio}
              className="px-2.5 py-1 rounded-md bg-emerald-500 hover:bg-emerald-400 text-white text-[10px] font-semibold transition-colors"
            >
              Enable Audio
            </button>
          </div>
        )}

        {/* No video overlay */}
        {!hasVideo && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-slate-700 flex items-center justify-center">
                <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <p className="text-xs text-slate-500">No video</p>
            </div>
          </div>
        )}

        {/* Connection status badge - HIDDEN */}
        {/* <div className="absolute top-2 left-2">
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full backdrop-blur-md bg-black bg-opacity-50 ${getStatusColor()} bg-opacity-20`}>
            <div className={`w-1.5 h-1.5 rounded-full ${getStatusColor()}`}></div>
            <span className="text-[10px] text-white font-medium">{getStatusText()}</span>
          </div>
        </div> */}

        {/* Muted indicator */}
        {!hasAudioTrack && (
          <div className="absolute top-2 right-2">
            <div className="p-1.5 rounded-full backdrop-blur-md bg-black bg-opacity-50">
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Peer ID label - HIDDEN */}
      {/* <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2">
        <p className="text-xs text-white font-medium truncate">
          Peer {remoteStream.peerId.substring(0, 8)}
        </p>
      </div> */}
    </div>
  );
}
