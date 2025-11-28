import { useEffect, useRef, useState } from 'react';

/**
 * Custom React Hook for WebRTC Full Mesh P2P connections
 * Manages peer-to-peer video/audio connections between participants
 * 
 * @param {Object} socket - Socket.IO client instance
 * @param {MediaStream} localStream - Local user's media stream (audio/video)
 * @param {Array} participants - Array of participant objects from room
 * @param {string} roomId - Current meeting room ID
 * @returns {Object} { remoteStreams, connectionStatus }
 */
export function useWebRTC(socket, localStream, participants, roomId) {
  const [remoteStreams, setRemoteStreams] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState({});
  const [socketId, setSocketId] = useState(socket?.id);
  
  const peerConnectionsRef = useRef({});
  const remoteStreamsRef = useRef({});
  const localStreamRef = useRef(localStream);

  // Update localStreamRef when localStream changes
  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  // Update socketId when socket connects
  useEffect(() => {
    if (socket) {
      if (socket.id) setSocketId(socket.id);
      
      const onConnect = () => {
        console.log('🔌 [WebRTC] Socket connected, ID:', socket.id);
        setSocketId(socket.id);
      };
      
      socket.on('connect', onConnect);
      return () => socket.off('connect', onConnect);
    }
  }, [socket]);

  // STUN server configuration for NAT traversal
  const configuration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' }
    ]
  };

  /**
   * Creates RTCPeerConnection for a specific peer
   */
  const createPeerConnection = (peerId) => {
    console.log(`📡 [WebRTC] createPeerConnection: ${peerId.substring(0, 8)}`);
    
    const pc = new RTCPeerConnection(configuration);
    
    // Add local stream tracks to connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
        console.log(`🎬 [WebRTC] addTrackHandler: Added ${track.kind} track to peer ${peerId.substring(0, 8)}`);
      });
    }

    // Handle incoming remote tracks
    pc.ontrack = (event) => {
      console.log(`🎥 [WebRTC] ontrack: Received ${event.track.kind} from peer ${peerId.substring(0, 8)}`);
      const [remoteStream] = event.streams;
      
      if (remoteStream) {
        remoteStreamsRef.current[peerId] = remoteStream;
        setRemoteStreams(prev => {
          const existing = prev.find(s => s.peerId === peerId);
          if (existing) {
            return prev.map(s => s.peerId === peerId ? { ...s, stream: remoteStream } : s);
          }
          return [...prev, { peerId, stream: remoteStream, id: remoteStream.id }];
        });
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        console.log(`❄️ [WebRTC] Sending ICE candidate to ${peerId.substring(0, 8)}`);
        socket.emit('ice-candidate', {
          roomId,
          to: peerId,
          from: socket.id,
          candidate: event.candidate
        });
      }
    };

    // Monitor connection state
    pc.onconnectionstatechange = () => {
      console.log(`🔌 [WebRTC] Connection state with ${peerId.substring(0, 8)}: ${pc.connectionState}`);
      setConnectionStatus(prev => ({ ...prev, [peerId]: pc.connectionState }));
      
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        console.log(`❌ [WebRTC] Connection ${pc.connectionState} with peer ${peerId.substring(0, 8)}`);
        closePeerConnection(peerId);
      }
    };

    // Monitor ICE connection state
    pc.oniceconnectionstatechange = () => {
      console.log(`🧊 [WebRTC] ICE connection state with ${peerId.substring(0, 8)}: ${pc.iceConnectionState}`);
    };

    peerConnectionsRef.current[peerId] = pc;
    return pc;
  };

  /**
   * Creates and sends WebRTC offer to peer
   */
  const createAndSendOffer = async (peerId) => {
    if (!socket) return;
    
    try {
      const pc = peerConnectionsRef.current[peerId] || createPeerConnection(peerId);
      
      console.log(`📤 [WebRTC] Creating offer for ${peerId.substring(0, 8)}`);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      console.log(`📨 [WebRTC] Sending offer to ${peerId.substring(0, 8)}`);
      socket.emit('offer', {
        roomId,
        to: peerId,
        from: socket.id,
        offer
      });
    } catch (error) {
      console.error(`❌ [WebRTC] Error creating offer for ${peerId.substring(0, 8)}:`, error);
    }
  };

  /**
   * Handles incoming WebRTC offer
   */
  const handleOffer = async ({ from, offer }) => {
    if (!socket) return;
    
    try {
      console.log(`📥 [WebRTC] Received offer from ${from.substring(0, 8)}`);
      const pc = peerConnectionsRef.current[from] || createPeerConnection(from);
      
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      
      console.log(`📤 [WebRTC] Creating answer for ${from.substring(0, 8)}`);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      console.log(`📨 [WebRTC] Sending answer to ${from.substring(0, 8)}`);
      socket.emit('answer', {
        roomId,
        to: from,
        from: socket.id,
        answer
      });
    } catch (error) {
      console.error(`❌ [WebRTC] Error handling offer from ${from.substring(0, 8)}:`, error);
    }
  };

  /**
   * Handles incoming WebRTC answer
   */
  const handleAnswer = async ({ from, answer }) => {
    try {
      console.log(`📥 [WebRTC] Received answer from ${from.substring(0, 8)}`);
      const pc = peerConnectionsRef.current[from];
      
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        console.log(`✅ [WebRTC] Set remote description from ${from.substring(0, 8)}`);
      }
    } catch (error) {
      console.error(`❌ [WebRTC] Error handling answer from ${from.substring(0, 8)}:`, error);
    }
  };

  /**
   * Handles incoming ICE candidate
   */
  const handleIceCandidate = async ({ from, candidate }) => {
    try {
      console.log(`❄️ [WebRTC] Received ICE candidate from ${from.substring(0, 8)}`);
      const pc = peerConnectionsRef.current[from];
      
      if (pc && candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
        console.log(`✅ [WebRTC] Added ICE candidate from ${from.substring(0, 8)}`);
      }
    } catch (error) {
      console.error(`❌ [WebRTC] Error adding ICE candidate from ${from.substring(0, 8)}:`, error);
    }
  };

  /**
   * Closes peer connection and cleans up
   */
  const closePeerConnection = (peerId) => {
    console.log(`🔌 [WebRTC] Closing connection with ${peerId.substring(0, 8)}`);
    
    const pc = peerConnectionsRef.current[peerId];
    if (pc) {
      pc.close();
      delete peerConnectionsRef.current[peerId];
    }
    
    delete remoteStreamsRef.current[peerId];
    setRemoteStreams(prev => prev.filter(s => s.peerId !== peerId));
    setConnectionStatus(prev => {
      const newStatus = { ...prev };
      delete newStatus[peerId];
      return newStatus;
    });
  };

  /**
   * Closes all peer connections
   */
  const closeAllConnections = () => {
    console.log('🔌 [WebRTC] Closing all connections');
    Object.keys(peerConnectionsRef.current).forEach(closePeerConnection);
  };

  // Set up Socket.IO event listeners for signaling
  useEffect(() => {
    if (!socket) return;

    // Bind handlers to refs to avoid dependency issues
    const onOffer = ({ from, offer }) => handleOffer({ from, offer });
    const onAnswer = ({ from, answer }) => handleAnswer({ from, answer });
    const onIceCandidate = ({ from, candidate }) => handleIceCandidate({ from, candidate });

    socket.on('offer', onOffer);
    socket.on('answer', onAnswer);
    socket.on('ice-candidate', onIceCandidate);

    return () => {
      socket.off('offer', onOffer);
      socket.off('answer', onAnswer);
      socket.off('ice-candidate', onIceCandidate);
    };
  }, [socket]);

  // Create peer connections when participants join
  useEffect(() => {
    if (!socket || !socketId || !localStream || !participants.length) return;

    // Wait a bit for participant list to stabilize
    const timer = setTimeout(() => {
      participants.forEach(participant => {
        // Don't create connection to yourself
        if (participant.id === socketId) return;
        
        // If connection doesn't exist, create it and send offer
        // To avoid glare (both sides creating offers), only the peer with the "lower" ID initiates
        if (!peerConnectionsRef.current[participant.id]) {
          console.log(`🆕 [WebRTC] New participant detected: ${participant.displayName} (${participant.id.substring(0, 8)})`);
          
          // Simple string comparison for ID
          if (socketId < participant.id) {
            console.log(`👉 [WebRTC] I am initiating connection to ${participant.id.substring(0, 8)} (my ID is smaller)`);
            createAndSendOffer(participant.id);
          } else {
            console.log(`⏳ [WebRTC] Waiting for ${participant.id.substring(0, 8)} to initiate connection (my ID is larger)`);
          }
        }
      });

      // Clean up connections for participants who left
      const participantIds = participants.map(p => p.id);
      Object.keys(peerConnectionsRef.current).forEach(peerId => {
        if (!participantIds.includes(peerId)) {
          console.log(`👋 [WebRTC] Participant left: ${peerId.substring(0, 8)}`);
          closePeerConnection(peerId);
        }
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [socket, socketId, localStream, participants]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      closeAllConnections();
    };
  }, []);

  return {
    remoteStreams,
    connectionStatus
  };
}