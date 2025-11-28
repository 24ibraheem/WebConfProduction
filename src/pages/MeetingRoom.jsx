import React, { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import SentimentPanel from '../components/SentimentPanel';
import SentimentDashboard from '../components/SentimentDashboard';
import MCQDisplay from '../components/MCQDisplay';
import MCQAnalytics from '../components/MCQAnalytics';
import Chat from '../components/Chat';
import RemoteVideoGrid, { RemoteVideoCard } from '../components/RemoteVideoGrid';
import { Send, Loader, Users, Mic } from 'lucide-react';
import AudioRecorder from '../utils/audioRecorder';
import { useWebRTC } from '../utils/useWebRTC';

export default function MeetingRoom() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const role = searchParams.get('role') || 'participant'; // 'instructor' or 'participant'
  
  const [name, setName] = useState(() => (role === 'instructor' ? 'Instructor-' : 'User-') + Math.random().toString(36).slice(2, 6));
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(name);
  const [joined, setJoined] = useState(false);
  const socketRef = useRef(null);
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const audioRecorderRef = useRef(null);
  const shouldRecordRef = useRef(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [sentiment, setSentiment] = useState({ good: 0, neutral: 0, negative: 0 });
  const [currentSentiment, setCurrentSentiment] = useState(null);
  const [classSummary, setClassSummary] = useState(null);
  const [transcripts, setTranscripts] = useState([]);
  const [mcqSession, setMcqSession] = useState(null);
  const [error, setError] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [difficulty, setDifficulty] = useState('Medium');
  const [generating, setGenerating] = useState(false);
  const [mcqs, setMcqs] = useState([]);
  const [selectedMcq, setSelectedMcq] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [responseCount, setResponseCount] = useState({});
  const [engagementHistory, setEngagementHistory] = useState([
    { time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }), good: 0, neutral: 0, negative: 0 }
  ]);
  const [chatMessages, setChatMessages] = useState([]);
  const [waitingForApproval, setWaitingForApproval] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  
  // YouTube Sharing State
  const [youtubeLink, setYoutubeLink] = useState('');
  const [isSharingYoutube, setIsSharingYoutube] = useState(false);
  const [showYoutubeInput, setShowYoutubeInput] = useState(false);

  const getYoutubeEmbedUrl = (url) => {
    try {
      let videoId = '';
      if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1].split('?')[0];
      } else if (url.includes('youtube.com/watch')) {
        const urlParams = new URLSearchParams(new URL(url).search);
        videoId = urlParams.get('v');
      } else if (url.includes('youtube.com/embed/')) {
        videoId = url.split('youtube.com/embed/')[1].split('?')[0];
      }
      
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
      }
      return null;
    } catch (e) {
      return null;
    }
  };

  // WebRTC P2P Full Mesh - Initialize peer connections
  const { remoteStreams, connectionStatus } = useWebRTC(
    socketRef.current,
    localStreamRef.current,
    participants,
    id
  );

  // Re-attach local stream to video element when it becomes available (e.g. after stopping YouTube share)
  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current && !isSharingYoutube) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  }, [isSharingYoutube]);

  // Real-time engagement tracking - update every 30 seconds
  useEffect(() => {
    if (!joined || role !== 'instructor') return;

    const interval = setInterval(() => {
      const currentTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      setEngagementHistory(prev => {
        const newHistory = [...prev, { 
          time: currentTime, 
          good: sentiment.good, 
          neutral: sentiment.neutral, 
          negative: sentiment.negative 
        }];
        // Keep only last 5 data points
        return newHistory.slice(-5);
      });
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [joined, role, sentiment]);

  // Update engagement on sentiment change
  useEffect(() => {
    if (!joined || role !== 'instructor') return;
    
    setEngagementHistory(prev => {
      const latest = prev[prev.length - 1];
      const currentTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      
      // Update the latest entry if it's the same minute, otherwise add new
      if (latest && latest.time === currentTime) {
        const updated = [...prev];
        updated[updated.length - 1] = { 
          time: currentTime, 
          good: sentiment.good, 
          neutral: sentiment.neutral, 
          negative: sentiment.negative 
        };
        return updated;
      }
      return prev;
    });
  }, [sentiment, joined, role]);

  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  function handleNameChange() {
    if (tempName.trim() && tempName !== name) {
      setName(tempName);
      if (joined && socketRef.current) {
        socketRef.current.emit('update-name', { roomId: id, newName: tempName });
      }
    }
    setIsEditingName(false);
  }

  async function join() {
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }

    try {
      // Initialize socket if not already done
      if (!socketRef.current) {
        const socketUrl = import.meta.env.VITE_SOCKET_SERVER_URL || (window.location.hostname === 'localhost' ? 'http://localhost:3000' : window.location.origin);
        socketRef.current = io(socketUrl, {
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          reconnectionAttempts: 5,
          transports: ['websocket', 'polling']
        });

        // Set up event listeners
        setupSocketListeners(socketRef.current);
      }

      if (role === 'participant') {
        setWaitingForApproval(true);
        socketRef.current.emit('request-to-join', { roomId: id, displayName: name });
      } else {
        await executeJoin();
      }
    } catch (err) {
      setError('Failed to join room: ' + err.message);
    }
  }

  function setupSocketListeners(socket) {
    // Waiting Room Listeners
    socket.on('participant-approved', () => {
      setWaitingForApproval(false);
      executeJoin();
    });

    socket.on('participant-denied', () => {
      setWaitingForApproval(false);
      setError('The host denied your request to join.');
      socket.disconnect();
      socketRef.current = null;
    });

    socket.on('participant-request', (req) => {
      setPendingRequests(prev => [...prev, req]);
    });

    // Existing Listeners
    socket.on('room-state', ({ participants: p, sentiment: s }) => {
      console.log('🔔 [room-state] Received for room', id, 'with', p.length, 'participants:', p.map(pp => `${pp.displayName} (${pp.id.substring(0, 8)}...)`));
      console.log('📍 My socket ID:', socket.id?.substring(0, 8));
      setParticipants(p);
      setSentiment(s);
      
      const currentUser = p.find(participant => participant.id === socket.id);
      if (currentUser && currentUser.sentiment) {
        setCurrentSentiment(currentUser.sentiment);
      }
    });

    socket.on('sentiment-updated', ({ sentiment: s, distribution }) => {
      console.log('Sentiment updated:', distribution);
      setSentiment(distribution);
      if (s === socket.id) {
        setCurrentSentiment(s);
      }
    });

    socket.on('mcq-broadcast', (mcq) => {
      console.log('MCQ broadcasted:', mcq);
      setMcqSession(mcq);
      setMcqs((prev) => [...prev, mcq]);
      if (role === 'instructor') {
        setSelectedMcq(mcq);
      }
    });

    socket.on('mcq-response-update', ({ mcqSessionId, totalResponses, totalParticipants }) => {
      console.log('Response update:', mcqSessionId, totalResponses, '/', totalParticipants);
      setResponseCount(prev => ({
        ...prev,
        [mcqSessionId]: { totalResponses, totalParticipants }
      }));
    });

    socket.on('error', ({ message }) => {
      setError(message);
      setTimeout(() => setError(null), 3000);
    });

    socket.on('user-removed', () => {
      setError('You have been removed from the meeting by the instructor');
      setTimeout(() => {
        handleLeave();
      }, 2000);
    });

    socket.on('force-mute', () => {
      setIsMuted(true);
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach(track => track.enabled = false);
      }
    });

    // YouTube Sharing Listeners
    socket.on('youtube-shared', ({ link }) => {
      console.log('📺 [YouTube] Received shared link:', link);
      setYoutubeLink(link);
      setIsSharingYoutube(true);
    });

    socket.on('youtube-stopped', () => {
      console.log('📺 [YouTube] Sharing stopped');
      setIsSharingYoutube(false);
      setYoutubeLink('');
    });

    socket.on('receive-message', (message) => {
      console.log('💬 [receive-message] From:', message.userName, 'Role:', message.userRole, 'Text:', message.text.substring(0, 40));
      setChatMessages(prev => [...prev, message]);
    });

    socket.on('message-reaction-updated', ({ messageId, reactions }) => {
      setChatMessages(prev =>
        prev.map(msg => 
          msg.id === messageId ? { ...msg, reactions } : msg
        )
      );
    });

    socket.on('class-summary-updated', (summary) => {
      console.log('📊 [class-summary-updated] Class summary updated:', summary);
      setClassSummary(summary);
    });

    socket.on('transcript-created', ({ transcript, totalTranscripts }) => {
      console.log(`📝 [transcript-created] Transcript ${totalTranscripts} received`);
      setTranscripts(prev => [...prev, transcript]);
    });

    socket.on('transcription-error', ({ message }) => {
      console.error('❌ [transcription-error]', message);
      setError(message);
    });
  }

  async function executeJoin() {
    try {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        console.log('✅ Got camera and audio');
      } catch (permissionErr) {
        console.error('❌ Media permission denied (video+audio):', permissionErr.message);
        // Try audio only if video fails
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          console.log('⚠️ Using audio only (video permission denied)');
          setError('Camera permission denied. Using audio only.');
          setIsCameraOff(true); // Camera is off because no permission
        } catch (audioErr) {
          console.error('❌ Audio permission also denied:', audioErr.message);
          setError('Please allow access to camera and microphone');
          return;
        }
      }
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        console.log('✅ Stream attached to video element');
      }

      // Emit join-room AFTER listeners are set up
      console.log('👤 [join-room] Joining room:', id, 'as', name, 'role:', role, 'socket ID:', socketRef.current.id?.substring(0, 8));
      socketRef.current.emit('join-room', { roomId: id, displayName: name, isAdmin: role === 'instructor' });

      setJoined(true);
    } catch (err) {
      setError('Failed to join room: ' + err.message);
    }
  }

  function toggleTranscription() {
    if (isRecordingAudio) {
      // Stop recording
      shouldRecordRef.current = false;
      if (audioRecorderRef.current) {
        if (audioRecorderRef.current.stop) audioRecorderRef.current.stop();
        if (audioRecorderRef.current.destroy) audioRecorderRef.current.destroy();
        audioRecorderRef.current = null;
      }
      setIsRecordingAudio(false);
    } else {
      // Start recording
      shouldRecordRef.current = true;
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        console.log('🎙️ [SpeechRecognition] Starting...');
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event) => {
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            }
          }

          if (finalTranscript) {
            console.log('📝 [SpeechRecognition] Final:', finalTranscript);
            socketRef.current.emit('send-transcript-chunk', {
              roomId: id,
              text: finalTranscript,
              speaker: name
            });
          }
        };

        recognition.onerror = (event) => {
          console.error('❌ [SpeechRecognition] Error:', event.error);
          if (event.error === 'not-allowed') {
            shouldRecordRef.current = false;
            setIsRecordingAudio(false);
            setError('Microphone access denied for transcription');
          }
        };

        recognition.onend = () => {
          console.log('🛑 [SpeechRecognition] Ended');
          if (shouldRecordRef.current) {
            console.log('🔄 [SpeechRecognition] Restarting...');
            try {
              recognition.start();
            } catch (e) {
              console.error('Failed to restart recognition:', e);
              setIsRecordingAudio(false);
              shouldRecordRef.current = false;
            }
          } else {
            setIsRecordingAudio(false);
          }
        };

        try {
          recognition.start();
          // Store the recognition instance directly, but wrap it to match the interface if needed, 
          // or just rely on the fact that SpeechRecognition has a stop() method.
          // The previous code wrapped it, but we can just store it if we are careful.
          // Let's store the recognition object itself so we can access it if needed.
          audioRecorderRef.current = recognition; 
          setIsRecordingAudio(true);
        } catch (err) {
          console.error('Failed to start recognition:', err);
          setError('Failed to start transcription');
          shouldRecordRef.current = false;
        }
      } else {
        console.warn('⚠️ [SpeechRecognition] Not supported. Falling back to AudioRecorder.');
        try {
          if (!localStreamRef.current) {
            setError('No audio stream available');
            shouldRecordRef.current = false;
            return;
          }
          const audioRecorder = new AudioRecorder(localStreamRef.current, (chunk) => {
            socketRef.current.emit('audio-chunk-recorded', {
              roomId: id,
              ...chunk
            });
          });
          audioRecorder.start();
          audioRecorderRef.current = audioRecorder;
          setIsRecordingAudio(true);
        } catch (err) {
          console.error('❌ [AudioRecorder] Failed to start:', err);
          setError('Failed to start audio recorder');
          shouldRecordRef.current = false;
        }
      }
    }
  }

  function handleLeave() {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    // Stop audio recorder if it's running
    shouldRecordRef.current = false;
    if (audioRecorderRef.current) {
      if (audioRecorderRef.current.stop) audioRecorderRef.current.stop();
      if (audioRecorderRef.current.destroy) audioRecorderRef.current.destroy();
      audioRecorderRef.current = null;
      setIsRecordingAudio(false);
    }
    socketRef.current?.disconnect();
    setJoined(false);
    setParticipants([]);
    navigate('/');
  }

  function handleEndMeeting() {
    if (confirm('Are you sure you want to end the meeting? This will generate a class summary and close the session.')) {
      console.log('🛑 Ending meeting...');
      socketRef.current.emit('end-meeting', { roomId: id });
      // Give it a moment to send the event before disconnecting
      setTimeout(() => {
        handleLeave();
        // Redirect to admin dashboard or show summary
        // window.location.href = '/admin'; 
      }, 1000);
    }
  }

  function toggleMute() {
    console.log('🔇 toggleMute called. Joined:', joined, 'Stream:', !!localStreamRef.current);
    if (!joined || !localStreamRef.current) {
      console.log('❌ Cannot toggle mute: joined=', joined, 'stream=', !!localStreamRef.current);
      return;
    }
    const audioTracks = localStreamRef.current.getAudioTracks();
    console.log('🎤 Audio tracks found:', audioTracks.length);
    const audioTrack = audioTracks[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      console.log('✅ Audio track toggled. Enabled:', audioTrack.enabled);
      setIsMuted(!audioTrack.enabled);
    } else {
      console.log('❌ No audio track found');
    }
  }

  function toggleCamera() {
    console.log('📹 toggleCamera called. Joined:', joined, 'Stream:', !!localStreamRef.current);
    if (!joined || !localStreamRef.current) {
      console.log('❌ Cannot toggle camera: joined=', joined, 'stream=', !!localStreamRef.current);
      return;
    }
    const videoTracks = localStreamRef.current.getVideoTracks();
    console.log('📷 Video tracks found:', videoTracks.length);
    if (videoTracks.length === 0) {
      console.log('❌ No video track - camera permission may have been denied');
      setError('Camera is not available. Check permissions.');
      return;
    }
    const videoTrack = videoTracks[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      console.log('✅ Video track toggled. Enabled:', videoTrack.enabled);
      setIsCameraOff(!videoTrack.enabled);
    } else {
      console.log('❌ No video track found');
    }
  }

  function handleRemoveUser(participantId) {
    if (role === 'instructor') {
      socketRef.current.emit('remove-user', { roomId: id, participantId });
    }
  }

  function handleMuteUser(participantId) {
    if (role === 'instructor') {
      socketRef.current.emit('mute-user', { roomId: id, participantId });
    }
  }

  function handleGenerateMCQs() {
    if (!prompt.trim()) {
      setError('Enter a topic for MCQ generation');
      return;
    }

    setGenerating(true);
    socketRef.current.emit('generate-mcq', { roomId: id, topic: prompt, difficulty });

    setTimeout(() => {
      setGenerating(false);
      setPrompt('');
    }, 2000);
  }

  function handleGenerateFromSummary() {
    if ((!classSummary || !classSummary.mainInsights || classSummary.mainInsights.length === 0) && transcripts.length === 0) {
      setError('No class content available yet. Please wait for transcription.');
      return;
    }

    setGenerating(true);
    console.log('🤔 [Generate from Summary] Triggering question generation from summary/transcripts');
    socketRef.current.emit('generate-from-summary', { roomId: id });

    setTimeout(() => {
      setGenerating(false);
    }, 2000);
  }

  function handleSendMessage(text) {
    socketRef.current.emit('send-message', {
      roomId: id,
      userId: socketRef.current.id,
      userName: name,
      userRole: role,
      text
    });
  }

  function handleReactToMessage(messageId, reactionType) {
    socketRef.current.emit('react-to-message', {
      roomId: id,
      messageId,
      reactionType,
      userName: name,
      userId: socketRef.current.id
    });
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-blue-900/10 blur-[120px]"></div>
        <div className="absolute top-[40%] -right-[10%] w-[50%] h-[50%] rounded-full bg-purple-900/10 blur-[120px]"></div>
        <div className="absolute bottom-[-20%] left-[20%] w-[40%] h-[40%] rounded-full bg-emerald-900/10 blur-[100px]"></div>
      </div>

      {/* Header */}
      <div className="bg-slate-900/60 backdrop-blur-xl border-b border-slate-800/50 text-white px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-lg shadow-black/20">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 border border-blue-500/20">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <div className="font-bold text-lg text-white tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-300">
                WebConference
              </div>
              {role === 'instructor' && (
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                  <span className="font-medium">Room ID:</span>
                  <span className="bg-slate-800/80 px-2 py-0.5 rounded-md text-blue-400 font-mono border border-slate-700/50 shadow-inner">{id}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Session Feedback - Compact */}
          {joined && role !== 'instructor' && (
            <div className="flex items-center gap-1 bg-slate-800/50 border border-slate-700/50 p-1.5 rounded-xl mr-2 shadow-sm backdrop-blur-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1.5 hidden sm:block">Session Feedback</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    socketRef.current.emit('submit-sentiment', { roomId: id, sentiment: 'good' });
                    setCurrentSentiment('good');
                  }}
                  className={`p-1.5 rounded-lg transition-all hover:scale-110 ${
                    currentSentiment === 'good' 
                      ? 'bg-emerald-500/20 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)] ring-1 ring-emerald-500/50' 
                      : 'text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10'
                  }`}
                  title="Positive"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-7.536 5.879a1 1 0 001.415 0 3 3 0 014.242 0 1 1 0 001.415-1.415 5 5 0 00-7.072 0 1 1 0 000 1.415z" clipRule="evenodd" /></svg>
                </button>
                <button
                  onClick={() => {
                    socketRef.current.emit('submit-sentiment', { roomId: id, sentiment: 'neutral' });
                    setCurrentSentiment('neutral');
                  }}
                  className={`p-1.5 rounded-lg transition-all hover:scale-110 ${
                    currentSentiment === 'neutral' 
                      ? 'bg-amber-500/20 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.2)] ring-1 ring-amber-500/50' 
                      : 'text-slate-400 hover:text-amber-400 hover:bg-amber-500/10'
                  }`}
                  title="Neutral"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-1.25 6.25a.75.75 0 10-1.5 0 .75.75 0 001.5 0z" clipRule="evenodd" /></svg>
                </button>
                <button
                  onClick={() => {
                    socketRef.current.emit('submit-sentiment', { roomId: id, sentiment: 'negative' });
                    setCurrentSentiment('negative');
                  }}
                  className={`p-1.5 rounded-lg transition-all hover:scale-110 ${
                    currentSentiment === 'negative' 
                      ? 'bg-rose-500/20 text-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.2)] ring-1 ring-rose-500/50' 
                      : 'text-slate-400 hover:text-rose-400 hover:bg-rose-500/10'
                  }`}
                  title="Negative"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-7.536 5.879a1 1 0 001.415 0 3 3 0 014.242 0 1 1 0 001.415-1.415 5 5 0 00-7.072 0 1 1 0 000 1.415z" clipRule="evenodd" /></svg>
                </button>
              </div>
            </div>
          )}

          {/* Name Display/Edit */}
          {joined && (
            <div className="flex items-center gap-2">
              {isEditingName ? (
                <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/50 px-3 py-2 rounded-xl shadow-lg backdrop-blur-sm">
                  <input
                    type="text"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleNameChange()}
                    className="bg-slate-900/50 text-white px-2 py-1 rounded-lg text-sm w-32 focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-slate-700/50 transition-all"
                    autoFocus
                  />
                  <button onClick={handleNameChange} className="text-emerald-400 hover:text-emerald-300 p-1.5 hover:bg-emerald-500/10 rounded-lg transition-colors">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                  </button>
                  <button onClick={() => { setIsEditingName(false); setTempName(name); }} className="text-rose-400 hover:text-rose-300 p-1.5 hover:bg-rose-500/10 rounded-lg transition-colors">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setIsEditingName(true)} 
                  className="flex items-center gap-2 text-slate-300 hover:text-white transition-all bg-slate-800/50 hover:bg-slate-800 px-4 py-2 rounded-xl text-sm border border-slate-700/50 hover:border-slate-600 shadow-sm hover:shadow-md"
                >
                  <span className="font-medium">{name}</span>
                  <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              )}
            </div>
          )}
          
          {role === 'instructor' && (
            <div className="flex items-center gap-2 bg-slate-800/50 border border-slate-700/50 px-4 py-2 rounded-xl shadow-sm backdrop-blur-sm">
              <Users size={16} className="text-blue-400" />
              <span className="text-white text-sm font-medium">{participants.length}</span>
            </div>
          )}
          
          {role === 'instructor' && isRecordingAudio && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-xl animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.2)]">
              <div className="w-2 h-2 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
              <span className="text-red-400 text-xs font-bold tracking-wider">REC</span>
            </div>
          )}

          {error && <div className="text-xs text-rose-200 bg-rose-500/10 border border-rose-500/20 px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg shadow-rose-500/5">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {error}
          </div>}
          
          {!joined ? (
            waitingForApproval ? (
              <div className="flex items-center gap-3 bg-slate-800/50 px-4 py-2 rounded-xl border border-slate-700/50">
                <div className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                <span className="text-slate-300 text-sm font-medium">Waiting for host...</span>
              </div>
            ) : (
              <button onClick={join} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5 border border-blue-500/20">
                Join Room
              </button>
            )
          ) : (
            <div className="flex gap-2">
              {role === 'instructor' && (
                <button onClick={handleEndMeeting} className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-red-500/20 hover:shadow-red-500/40 hover:-translate-y-0.5 border border-red-500/20">
                  End Class
                </button>
              )}
              <button onClick={handleLeave} className="bg-slate-800 hover:bg-slate-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all border border-slate-700 hover:border-slate-600 shadow-sm hover:shadow-md">
                Leave
              </button>
            </div>
          )}
        </div>
      </div>

      {joined && mcqSession && <MCQDisplay mcqSession={mcqSession} socket={socketRef.current} roomId={id} participantId={socketRef.current?.id} onClose={() => setMcqSession(null)} />}

      {role === 'instructor' ? (
        // INSTRUCTOR VIEW - Minimalist Dark Theme
        <div className="flex flex-1 gap-4 overflow-hidden bg-slate-900 p-5">
          {/* Left Side - Video and Poll Generation */}
          <div className="flex-1 flex flex-col gap-4">
            {/* Video Section with Participants Grid */}
            <div className="flex gap-4 flex-1 min-h-0">
              {/* Main Video - Fixed aspect ratio */}
              <div className="flex-1 transition-all duration-500 ease-in-out bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-3xl overflow-hidden relative group shadow-2xl shadow-black/50 ring-1 ring-white/5" style={{ minHeight: '600px', maxHeight: 'calc(100vh - 150px)' }}>
                {isSharingYoutube ? (
                  <iframe 
                    src={getYoutubeEmbedUrl(youtubeLink)} 
                    className="w-full h-full bg-black" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen
                    title="YouTube Video Player"
                  />
                ) : (
                  <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full bg-black object-cover" />
                )}
                
                {/* Camera Off Overlay */}
                {isCameraOff && !isSharingYoutube && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 backdrop-blur-sm">
                    <div className="text-center">
                      <div className="w-24 h-24 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-slate-700/50">
                        <svg className="w-12 h-12 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                      </div>
                      <p className="text-slate-400 font-medium text-lg">Camera Off</p>
                    </div>
                  </div>
                )}

                {/* Video Controls */}
                <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300 z-20 translate-y-4 group-hover:translate-y-0">
                  <div className="flex gap-3 bg-slate-900/90 backdrop-blur-xl p-2.5 rounded-2xl border border-slate-700/50 shadow-2xl shadow-black/50 ring-1 ring-white/10">
                    <button
                      type="button"
                      onClick={(e) => {
                        console.log('🔘 Mute button clicked');
                        e.preventDefault();
                        e.stopPropagation();
                        toggleMute();
                      }}
                      className={`p-4 rounded-xl transition-all duration-200 cursor-pointer ${
                        isMuted ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20' : 'bg-slate-800 hover:bg-slate-700 text-white hover:shadow-lg border border-slate-700 hover:border-slate-600'
                      }`}
                      title={isMuted ? "Unmute" : "Mute"}
                    >
                      {isMuted ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        console.log('🔘 Camera button clicked');
                        e.preventDefault();
                        e.stopPropagation();
                        toggleCamera();
                      }}
                      className={`p-4 rounded-xl transition-all duration-200 cursor-pointer ${
                        isCameraOff ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20' : 'bg-slate-800 hover:bg-slate-700 text-white hover:shadow-lg border border-slate-700 hover:border-slate-600'
                      }`}
                      title={isCameraOff ? "Turn Camera On" : "Turn Camera Off"}
                    >
                      {isCameraOff ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A2 2 0 0019 13V6a2 2 0 00-3.53-1.235L14 6.5V5a2 2 0 00-2-2h-.5L10.5 2H5a2 2 0 00-2 2v.879l-.707-.586zM5 5v8h8V5H5z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                        </svg>
                      )}
                    </button>
                    
                    {/* YouTube Share Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowYoutubeInput(!showYoutubeInput);
                      }}
                      className={`p-4 rounded-xl transition-all duration-200 cursor-pointer ${
                        isSharingYoutube ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'bg-slate-800 hover:bg-slate-700 text-white hover:shadow-lg border border-slate-700 hover:border-slate-600'
                      }`}
                      title="Share YouTube Video"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
                      </svg>
                    </button>
                  </div>
                </div>

                {/* YouTube Input Popover */}
                {showYoutubeInput && (
                  <div className="absolute bottom-28 left-1/2 transform -translate-x-1/2 bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 p-5 rounded-2xl shadow-2xl shadow-black/50 z-30 w-96 animate-in fade-in slide-in-from-bottom-4 duration-200 ring-1 ring-white/10">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-white text-sm font-bold flex items-center gap-2">
                        <div className="w-6 h-6 bg-red-500/10 rounded-lg flex items-center justify-center">
                          <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
                          </svg>
                        </div>
                        Share YouTube Video
                      </h3>
                      <button onClick={() => setShowYoutubeInput(false)} className="text-slate-400 hover:text-white transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                    <input 
                      type="text" 
                      value={youtubeLink}
                      onChange={(e) => setYoutubeLink(e.target.value)}
                      placeholder="Paste YouTube Link here..."
                      className="w-full bg-slate-800/50 text-white text-sm p-3.5 rounded-xl mb-4 border border-slate-700/50 focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20 outline-none transition-all placeholder:text-slate-500"
                      autoFocus
                    />
                    <div className="flex gap-3">
                      <button 
                        onClick={() => {
                          if (getYoutubeEmbedUrl(youtubeLink)) {
                            setIsSharingYoutube(true);
                            setShowYoutubeInput(false);
                            socketRef.current.emit('share-youtube', { roomId: id, link: youtubeLink });
                          } else {
                            alert('Please enter a valid YouTube URL');
                          }
                        }}
                        className="flex-1 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white text-sm py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-red-600/20 hover:shadow-red-600/30 hover:-translate-y-0.5"
                      >
                        Play Video
                      </button>
                      {isSharingYoutube && (
                        <button 
                          onClick={() => {
                            setIsSharingYoutube(false);
                            setYoutubeLink('');
                            setShowYoutubeInput(false);
                            socketRef.current.emit('stop-share-youtube', { roomId: id });
                          }}
                          className="flex-1 bg-slate-800 hover:bg-slate-700 text-white text-sm py-2.5 rounded-xl font-medium transition-all border border-slate-700 hover:border-slate-600"
                        >
                          Stop Sharing
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Participants Grid - Small on right of video */}
              <div className="w-80 bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-4 flex flex-col gap-3 shadow-xl shadow-black/20 ring-1 ring-white/5 overflow-y-auto custom-scrollbar">
                <h3 className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-1 px-1 flex items-center justify-between">
                  <span>Participants</span>
                  <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full text-[10px]">{participants.filter(p => !p.isAdmin).length}</span>
                </h3>
                <div className="grid grid-cols-2 gap-3 content-start">
                  {participants.filter(p => !p.isAdmin).map((p) => {
                    const userStream = remoteStreams.find(s => s.peerId === p.id);
                    return (
                      <div key={p.id} className="bg-slate-950/50 border border-slate-700/50 rounded-2xl p-1 flex flex-col items-center justify-center relative aspect-square hover:border-slate-500 transition-all group cursor-default overflow-hidden shadow-inner">
                        {userStream ? (
                          <div className="absolute inset-0 w-full h-full rounded-xl overflow-hidden">
                            <RemoteVideoCard remoteStream={userStream} status={connectionStatus[p.id]} isMain={true} />
                          </div>
                        ) : (
                          <div className="w-full h-full rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center text-white font-bold text-xl shadow-inner">
                            {p.displayName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        
                        {!userStream && (
                          <div className="absolute bottom-2 left-0 right-0 text-center z-10">
                            <span className="text-slate-300 text-xs font-medium bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-sm">
                              {p.displayName}
                            </span>
                          </div>
                        )}
                        
                        {userStream && (
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2 pt-6 z-10 flex justify-center">
                            <span className="text-white text-[10px] font-medium truncate max-w-[90%]">
                              {p.displayName}
                            </span>
                          </div>
                        )}

                        {/* Instructor Controls */}
                        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-[2px] rounded-xl transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 z-20">
                          <button
                            onClick={() => handleMuteUser(p.id)}
                            className="p-2 bg-amber-500 hover:bg-amber-600 rounded-lg transition shadow-lg shadow-amber-500/20"
                            title="Mute user"
                          >
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleRemoveUser(p.id)}
                            className="p-2 bg-rose-500 hover:bg-rose-600 rounded-lg transition shadow-lg shadow-rose-500/20"
                            title="Remove user"
                          >
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Transcriber Section */}
            <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-6 shadow-xl shadow-black/20 ring-1 ring-white/5">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 ring-1 ring-white/10">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base tracking-tight">Transcriber</h3>
                    <p className="text-xs text-slate-400 font-medium">Real-time speech to text</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isRecordingAudio && (
                    <div className="px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Live</span>
                    </div>
                  )}
                  {role === 'instructor' && (
                    <button
                      onClick={toggleTranscription}
                      className={`p-1.5 rounded-lg transition-all border ${
                        isRecordingAudio 
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20' 
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                      }`}
                      title={isRecordingAudio ? "Stop Transcription" : "Start Transcription"}
                    >
                      {isRecordingAudio ? (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" /></svg>
                      ) : (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {role === 'instructor' ? (
                <div className="space-y-5">
                  {(classSummary && classSummary.mainInsights && classSummary.mainInsights.length > 0) || (transcripts.length > 0) ? (
                    <>
                      {classSummary && classSummary.mainInsights && classSummary.mainInsights.length > 0 ? (
                        <div className="bg-slate-950/50 border border-slate-800/50 rounded-2xl p-4 max-h-32 overflow-y-auto custom-scrollbar shadow-inner">
                          <p className="text-xs text-purple-400 mb-2 font-bold uppercase tracking-wider flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                            Class Insights
                          </p>
                          <ul className="text-xs text-slate-400 space-y-2">
                            {classSummary.mainInsights.slice(0, 3).map((insight, idx) => (
                              <li key={idx} className="flex gap-2 leading-relaxed">
                                <span className="text-purple-500/50 mt-0.5">•</span>
                                <span>{insight.substring(0, 80)}...</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <div className="bg-slate-950/50 border border-slate-800/50 rounded-2xl p-4 max-h-32 overflow-y-auto custom-scrollbar shadow-inner">
                          <p className="text-xs text-blue-400 mb-2 font-bold uppercase tracking-wider flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                            Live Transcripts ({transcripts.length})
                          </p>
                          <p className="text-xs text-slate-400 italic leading-relaxed pl-2 border-l-2 border-slate-800">
                            "{transcripts.slice(-1)[0]?.text.substring(0, 100)}..."
                          </p>
                        </div>
                      )}
                      
                      <div className="flex gap-2">
                        <button
                          onClick={handleGenerateFromSummary}
                          disabled={generating}
                          className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-white px-4 py-3.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:-translate-y-0.5 border border-purple-500/20"
                        >
                          {generating ? (
                            <>
                              <Loader size={18} className="animate-spin" />
                              <span>Generating...</span>
                            </>
                          ) : (
                            <>
                              <Mic size={18} />
                              <span>Generate from Context</span>
                            </>
                          )}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="bg-slate-950/30 border border-slate-800/50 rounded-2xl p-6 text-center border-dashed">
                      <p className="text-sm text-slate-500 font-medium flex flex-col items-center gap-2">
                        {isRecordingAudio ? (
                          <>
                            <span className="flex h-3 w-3 relative">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
                            </span>
                            Listening & Transcribing...
                          </>
                        ) : (
                          <>
                            <Mic size={24} className="text-slate-600 mb-1" />
                            Start recording to generate context
                          </>
                        )}
                      </p>
                    </div>
                  )}
                  
                  <div className="border-t border-slate-800/50 pt-5">
                    <p className="text-xs text-slate-500 mb-3 font-bold uppercase tracking-wider">Custom Topic</p>
                    <div className="flex flex-col gap-3">
                      <div className="flex gap-2">
                        <select
                          value={difficulty}
                          onChange={(e) => setDifficulty(e.target.value)}
                          className="bg-slate-950/50 border border-slate-700/50 rounded-xl px-3 py-3 text-sm text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none transition-all appearance-none cursor-pointer hover:border-slate-600"
                          disabled={generating}
                        >
                          <option value="Easy">Easy</option>
                          <option value="Medium">Medium</option>
                          <option value="Hard">Hard</option>
                        </select>
                        <input
                          type="text"
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value)}
                          placeholder="Enter topic..."
                          className="flex-1 bg-slate-950/50 border border-slate-700/50 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none transition-all"
                          disabled={generating}
                        />
                      </div>
                      <button
                        onClick={handleGenerateMCQs}
                        disabled={generating}
                        className="w-full bg-slate-800 hover:bg-slate-700 disabled:bg-slate-800 disabled:text-slate-600 text-white px-4 py-3.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 border border-slate-700 hover:border-slate-600 shadow-sm hover:shadow-md"
                      >
                        {generating ? (
                          <>
                            <Loader size={16} className="animate-spin" />
                            <span>Generating...</span>
                          </>
                        ) : (
                          <>
                            <Send size={16} />
                            <span>Generate 5 Questions</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-950/30 border border-slate-800/50 rounded-2xl p-6 text-center border-dashed">
                  <p className="text-sm text-slate-500">Questions are generated by the instructor based on class discussion.</p>
                </div>
              )}
            </div>

            {/* Active Polls Section with Live Response Count */}
            {mcqs.length > 0 && (
              <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-5 shadow-xl shadow-black/20 ring-1 ring-white/5">
                <h3 className="font-bold text-slate-200 text-sm mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Active Polls
                </h3>
                <div className="space-y-3">
                  {mcqs.map((mcq, idx) => {
                    const responses = responseCount[mcq.id] || { totalResponses: 0, totalParticipants: 0 };
                    const percentage = responses.totalParticipants > 0 
                      ? Math.round((responses.totalResponses / responses.totalParticipants) * 100) 
                      : 0;
                    
                    return (
                      <div
                        key={mcq.id}
                        className="bg-slate-950/50 border border-slate-800/50 rounded-2xl p-4 hover:border-slate-700 transition-all group"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex-1">
                            <p className="font-medium text-slate-300 text-sm mb-1 line-clamp-1 group-hover:text-white transition-colors">"{mcq.prompt}"</p>
                            <p className="text-slate-500 text-xs font-medium">{mcq.mcqs?.length || 0} questions</p>
                          </div>
                          <button
                            onClick={() => setSelectedMcq(mcq)}
                            className="text-blue-400 hover:text-blue-300 text-xs font-bold ml-3 px-3 py-1.5 bg-blue-500/10 rounded-lg hover:bg-blue-500/20 transition-all border border-blue-500/10 hover:border-blue-500/30"
                          >
                            Analytics
                          </button>
                        </div>
                        
                        {/* Live Response Counter */}
                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex-1 bg-slate-800/50 rounded-full h-2 overflow-hidden border border-slate-700/30">
                            <div 
                              className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-400 font-mono min-w-[60px] text-right font-medium">
                            {responses.totalResponses}/{responses.totalParticipants}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right Side - Live Analytics Panel */}
          <aside className="w-80 bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-5 flex flex-col gap-5 overflow-y-auto shadow-2xl shadow-black/20 ring-1 ring-white/5">
            {/* Chat Component - Fixed at top */}
            <div className="mb-2 flex-shrink-0">
              <Chat
                messages={chatMessages}
                onSendMessage={handleSendMessage}
                onReactToMessage={handleReactToMessage}
                currentUserId={socketRef.current?.id}
                currentRole={role}
              />
            </div>



            {/* Live Analytics Header - REMOVED */}
            {/* <div className="flex items-center gap-3 pb-4 border-b border-slate-700/50">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"></path></svg>
              </div>
              <h2 className="text-base font-bold text-white tracking-tight">Live Analytics</h2>
            </div> */}

            {/* Current Sentiment */}
            <div className="bg-slate-950/50 border border-slate-800/50 rounded-2xl p-3 shadow-inner flex-shrink-0">
              <h3 className="text-slate-400 font-bold text-[10px] mb-2 uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                Current Sentiment
              </h3>
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-col items-center gap-1 flex-1 bg-slate-900/50 rounded-lg p-2 border border-slate-800/50">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.5)]"></div>
                  <span className="text-slate-300 text-[10px] font-medium">Pos</span>
                  <span className="text-white font-bold text-xs">{sentiment.good}</span>
                </div>
                <div className="flex flex-col items-center gap-1 flex-1 bg-slate-900/50 rounded-lg p-2 border border-slate-800/50">
                  <div className="w-2 h-2 bg-amber-400 rounded-full shadow-[0_0_8px_rgba(251,191,36,0.5)]"></div>
                  <span className="text-slate-300 text-[10px] font-medium">Neu</span>
                  <span className="text-white font-bold text-xs">{sentiment.neutral}</span>
                </div>
                <div className="flex flex-col items-center gap-1 flex-1 bg-slate-900/50 rounded-lg p-2 border border-slate-800/50">
                  <div className="w-2 h-2 bg-rose-400 rounded-full shadow-[0_0_8px_rgba(251,113,133,0.5)]"></div>
                  <span className="text-slate-300 text-[10px] font-medium">Neg</span>
                  <span className="text-white font-bold text-xs">{sentiment.negative}</span>
                </div>
              </div>
            </div>

            {/* Engagement Over Time Chart - Real-time */}
            <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 flex-1">
              <h3 className="text-slate-300 font-medium text-xs mb-3 uppercase tracking-wider">Engagement Timeline</h3>
              <div className="h-40 flex items-end justify-around gap-2">
                {engagementHistory.map((data, idx) => {
                  const total = Math.max(data.good + data.neutral + data.negative, 1);
                  const maxHeight = 130;
                  const greenHeight = (data.good / total) * maxHeight;
                  const yellowHeight = (data.neutral / total) * maxHeight;
                  const redHeight = (data.negative / total) * maxHeight;
                  
                  return (
                    <div key={idx} className="flex flex-col items-center flex-1">
                      <div className="w-full flex flex-col-reverse items-center gap-0.5 rounded-sm overflow-hidden">
                        {data.good > 0 && (
                          <div 
                            className="w-full bg-emerald-500 transition-all duration-500 ease-in-out" 
                            style={{ height: `${greenHeight}px`, minHeight: '3px' }}
                          />
                        )}
                        {data.neutral > 0 && (
                          <div 
                            className="w-full bg-amber-500 transition-all duration-500 ease-in-out" 
                            style={{ height: `${yellowHeight}px`, minHeight: '3px' }}
                          />
                        )}
                        {data.negative > 0 && (
                          <div 
                            className="w-full bg-rose-500 transition-all duration-500 ease-in-out" 
                            style={{ height: `${redHeight}px`, minHeight: '3px' }}
                          />
                        )}
                      </div>
                      <span className="text-slate-500 text-[10px] mt-2 font-mono">{data.time}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 text-[10px] text-slate-500 text-center">
                Real-time updates
              </div>
            </div>


          </aside>

          {/* MCQ Analytics Modal */}
          {selectedMcq && (
            <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setSelectedMcq(null)}>
              <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-700">
                  <h3 className="font-semibold text-white text-lg">Poll Analytics</h3>
                  <button onClick={() => setSelectedMcq(null)} className="text-slate-400 hover:text-white transition">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
                  </button>
                </div>
                <MCQAnalytics mcqSession={selectedMcq} socket={socketRef.current} roomId={id} />
              </div>
            </div>
          )}
        </div>
      ) : (
        // PARTICIPANT VIEW - Minimalist Dark Theme
        <div className="flex flex-1 gap-6 overflow-hidden p-6">
          {/* Main Video Area */}
          <div className="flex-1 flex flex-col gap-6 min-h-0">
            {/* Presenter Screen (Instructor) */}
            <div className="flex-1 bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-3xl overflow-hidden relative group shadow-2xl shadow-black/50 ring-1 ring-white/5" style={{ minHeight: '600px', maxHeight: 'calc(100vh - 120px)' }}>
              {(() => {
                if (isSharingYoutube) {
                  return (
                    <iframe 
                      src={getYoutubeEmbedUrl(youtubeLink)} 
                      className="w-full h-full bg-black" 
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                      allowFullScreen
                      title="YouTube Video Player"
                    />
                  );
                }

                // Find instructor stream
                const instructor = participants.find(p => p.isAdmin);
                const instructorStream = instructor ? remoteStreams.find(s => s.peerId === instructor.id) : null;
                
                if (instructorStream) {
                  return <RemoteVideoCard remoteStream={instructorStream} status={connectionStatus[instructorStream.peerId]} isMain={true} />;
                } else {
                  return (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500">
                      <div className="w-24 h-24 bg-slate-800/50 rounded-full flex items-center justify-center mb-6 shadow-inner border border-slate-700/50">
                        <Users size={48} className="text-slate-400" />
                      </div>
                      <p className="text-xl font-bold text-slate-300 tracking-tight">Waiting for Instructor</p>
                      <p className="text-sm text-slate-500 mt-2 font-medium">The instructor's video will appear here</p>
                    </div>
                  );
                }
              })()}
            </div>

            {/* Video Strip: Local + Other Participants */}
            <div className="h-48 flex gap-4 overflow-x-auto pb-2 px-1">
              {/* Local Video (Self) */}
              <div className="w-64 flex-shrink-0 bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden relative group shadow-lg shadow-black/20 ring-1 ring-white/5">
                <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full bg-black object-cover" />
                
                {/* Camera Off Overlay */}
                {(isCameraOff || !joined) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 backdrop-blur-sm">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-3 border border-slate-700/50">
                        <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <p className="text-slate-400 text-xs font-medium">Camera Off</p>
                    </div>
                  </div>
                )}

                {/* Video Controls for Participant */}
                {joined && (
                  <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 z-20 translate-y-2 group-hover:translate-y-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleMute();
                      }}
                      className={`p-2.5 rounded-xl backdrop-blur-xl transition-all cursor-pointer border border-white/10 ${
                        isMuted ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20' : 'bg-slate-800/80 hover:bg-slate-700 text-white hover:shadow-lg'
                      }`}
                    >
                      {isMuted ? (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleCamera();
                      }}
                      className={`p-2.5 rounded-xl backdrop-blur-xl transition-all cursor-pointer border border-white/10 ${
                        isCameraOff ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20' : 'bg-slate-800/80 hover:bg-slate-700 text-white hover:shadow-lg'
                      }`}
                    >
                      {isCameraOff ? (
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A2 2 0 0019 13V6a2 2 0 00-3.53-1.235L14 6.5V5a2 2 0 00-2-2h-.5L10.5 2H5a2 2 0 00-2 2v.879l-.707-.586zM5 5v8h8V5H5z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                        </svg>
                      )}
                    </button>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2">
                  <p className="text-xs text-white font-medium truncate">You (Me)</p>
                </div>
              </div>

              {/* Other Participants (Non-Instructor) */}
              {(() => {
                const instructor = participants.find(p => p.isAdmin);
                const otherStreams = remoteStreams.filter(s => !instructor || s.peerId !== instructor.id);
                
                return otherStreams.map(stream => (
                  <div key={stream.peerId} className="w-56 flex-shrink-0">
                    <RemoteVideoCard remoteStream={stream} status={connectionStatus[stream.peerId]} />
                  </div>
                ));
              })()}
            </div>

            {/* Sentiment Panel - Moved to Top Bar */}
            {/* {joined && (
              <SentimentPanel 
                socket={socketRef.current} 
                roomId={id} 
                currentSentiment={currentSentiment}
                onSentimentChange={setCurrentSentiment}
              />
            )} */}
          </div>

          {/* Right Sidebar: Participants Grid - Dynamic Layout */}
          <aside className="w-72 flex flex-col gap-4">
            {/* Chat Component */}
            <Chat
              messages={chatMessages}
              onSendMessage={handleSendMessage}
              onReactToMessage={handleReactToMessage}
              currentUserId={socketRef.current?.id}
              currentRole={role}
            />

            {/* Participants Grid */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-700">
                <h3 className="font-medium text-slate-200 text-sm flex items-center gap-2">
                  <Users size={16} className="text-slate-400" />
                  <span>Participants</span>
                </h3>
                <span className="text-xs bg-slate-700 text-slate-300 px-2.5 py-1 rounded-full">{participants.length}</span>
              </div>
              
              {/* Dynamic Grid - adjusts columns based on participant count */}
              <div className={`grid gap-2 overflow-y-auto flex-1 auto-rows-min ${
                participants.length === 1 ? 'grid-cols-1' :
                participants.length === 2 ? 'grid-cols-2' :
                participants.length <= 4 ? 'grid-cols-2' :
                participants.length <= 6 ? 'grid-cols-2' :
                participants.length <= 9 ? 'grid-cols-3' :
                'grid-cols-2'
              }`}>
                {participants.map((p) => (
                  <div 
                    key={p.id} 
                    className={`bg-slate-900 border border-slate-700 rounded-lg flex flex-col items-center justify-center relative transition-all hover:border-slate-600 ${
                      participants.length === 1 ? 'p-6' :
                      participants.length === 2 ? 'p-5' :
                      participants.length <= 4 ? 'p-3' :
                      participants.length <= 6 ? 'p-2.5' :
                      participants.length <= 9 ? 'p-2' :
                      'p-2.5'
                    }`}
                  >
                    {/* Avatar */}
                    <div 
                      className={`rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold mb-1.5 ${
                        participants.length === 1 ? 'w-16 h-16 text-2xl' :
                        participants.length === 2 ? 'w-14 h-14 text-xl' :
                        participants.length <= 4 ? 'w-10 h-10 text-base' :
                        participants.length <= 9 ? 'w-8 h-8 text-sm' :
                        'w-7 h-7 text-xs'
                      }`}
                    >
                      {p.displayName.charAt(0).toUpperCase()}
                    </div>
                    
                    {/* Name */}
                    <div 
                      className={`text-slate-300 font-medium text-center truncate w-full ${
                        participants.length === 1 ? 'text-sm' :
                        participants.length === 2 ? 'text-xs' :
                        participants.length <= 9 ? 'text-[11px]' :
                        'text-[10px]'
                      }`}
                    >
                      {p.displayName}
                    </div>
                    
                    {/* Sentiment Indicator */}
                    {p.sentiment && (
                      <div 
                        className={`absolute top-1.5 right-1.5 rounded-full ${
                          participants.length <= 4 ? 'w-2.5 h-2.5' : 'w-2 h-2'
                        } ${
                          p.sentiment === 'good'
                            ? 'bg-emerald-400'
                            : p.sentiment === 'neutral'
                              ? 'bg-amber-400'
                              : 'bg-rose-400'
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
              
              {/* No participants message */}
              {participants.length === 0 && (
                <div className="flex-1 flex items-center justify-center text-slate-500">
                  <div className="text-center">
                    <Users size={40} className="mx-auto mb-2 opacity-30" />
                    <p className="text-xs">No participants yet</p>
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
      {/* Pending Requests Toast */}
      {role === 'instructor' && pendingRequests.length > 0 && (
        <div className="fixed top-20 right-6 z-50 flex flex-col gap-2">
          {pendingRequests.map((req) => (
            <div key={req.socketId} className="bg-slate-800 border border-slate-700 p-4 rounded-xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-right">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 font-bold">
                  {req.displayName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-white font-medium text-sm">{req.displayName}</p>
                  <p className="text-slate-400 text-xs">wants to join</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    socketRef.current.emit('approve-participant', { roomId: id, socketId: req.socketId });
                    setPendingRequests(prev => prev.filter(p => p.socketId !== req.socketId));
                  }}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white p-2 rounded-lg transition"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </button>
                <button 
                  onClick={() => {
                    socketRef.current.emit('deny-participant', { roomId: id, socketId: req.socketId });
                    setPendingRequests(prev => prev.filter(p => p.socketId !== req.socketId));
                  }}
                  className="bg-rose-500 hover:bg-rose-600 text-white p-2 rounded-lg transition"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}