import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import Sidebar from '../../ui/Sidebar';
import Topbar from '../../ui/Topbar';
import SentimentDashboard from '../../components/SentimentDashboard';
import MCQAnalytics from '../../components/MCQAnalytics';
import { Send, Loader, Clock, Play, FileText, BarChart2, ChevronRight, Calendar, BookOpen, Settings } from 'lucide-react';

export default function AdminDashboard() {
  const socketRef = useRef(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [joined, setJoined] = useState(false);
  const [displayName] = useState('Instructor-' + Math.random().toString(36).slice(2, 6));
  const [sentiment, setSentiment] = useState({ good: 0, neutral: 0, negative: 0 });
  const [participants, setParticipants] = useState([]);
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [mcqs, setMcqs] = useState([]);
  const [selectedMcq, setSelectedMcq] = useState(null);
  const [error, setError] = useState(null);

  // History State
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab]);

  async function fetchHistory() {
    setLoadingHistory(true);
    try {
      const res = await fetch('/api/meeting-history');
      if (!res.ok) throw new Error('Failed to fetch history');
      const data = await res.json();
      setHistory(data);
    } catch (err) {
      console.error(err);
      setError('Could not load meeting history');
    } finally {
      setLoadingHistory(false);
    }
  }

  async function fetchMeetingDetails(meetingId) {
    setLoadingAnalytics(true);
    try {
      const res = await fetch(`/api/meeting-analytics/${meetingId}`);
      if (!res.ok) throw new Error('Failed to fetch details');
      const data = await res.json();
      setSelectedMeeting(data);
    } catch (err) {
      console.error(err);
      setError('Could not load meeting details');
    } finally {
      setLoadingAnalytics(false);
    }
  }

  function joinAsAdmin() {
    if (!roomId.trim()) {
      setError('Enter a room ID');
      return;
    }

    try {
      // Use Vite env var, or default to localhost:3000 in dev, or window.origin in prod
      const socketUrl = import.meta.env.VITE_SOCKET_SERVER_URL || (window.location.hostname === 'localhost' ? 'http://localhost:3000' : window.location.origin);
      socketRef.current = io(socketUrl);

      socketRef.current.emit('join-room', { roomId, displayName, isAdmin: true });

      socketRef.current.on('room-state', ({ participants: p, sentiment: s }) => {
        setParticipants(p);
        setSentiment(s);
      });

      socketRef.current.on('sentiment-updated', ({ distribution }) => {
        setSentiment(distribution);
      });

      socketRef.current.on('mcq-broadcast', (mcq) => {
        setMcqs((prev) => [...prev, mcq]);
        setSelectedMcq(mcq);
      });

      socketRef.current.on('error', ({ message }) => {
        setError(message);
        setTimeout(() => setError(null), 3000);
      });

      setJoined(true);
    } catch (err) {
      setError('Failed to join: ' + err.message);
    }
  }

  function handleGenerateMCQs() {
    if (!prompt.trim()) {
      setError('Enter a prompt for MCQ generation');
      return;
    }

    setGenerating(true);
    socketRef.current.emit('generate-mcq', { roomId, prompt });

    setTimeout(() => {
      setGenerating(false);
      setPrompt('');
    }, 2000);
  }

  return (
    <div className="min-h-screen flex bg-slate-950">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Topbar onMenuClick={() => setIsSidebarOpen(true)} />

        <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
          {/* DASHBOARD VIEW */}
          {activeTab === 'dashboard' && (
            <>
              {/* Join Room Section */}
              {!joined && (
                <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl shadow-lg p-8 mb-8 border border-slate-800 max-w-2xl mx-auto mt-10">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                      <Play size={20} />
                    </div>
                    <h2 className="text-xl font-bold text-white">Start Admin Session</h2>
                  </div>
                  
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={roomId}
                      onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                      placeholder="Enter Room ID (e.g., ABC12345)"
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-5 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 focus:outline-none transition-all"
                    />
                    <button
                      onClick={joinAsAdmin}
                      className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white px-8 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40"
                    >
                      Join as Admin
                    </button>
                  </div>
                  {error && <div className="mt-4 text-sm text-rose-300 bg-rose-500/10 border border-rose-500/20 px-4 py-2 rounded-lg flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {error}
                  </div>}
                </div>
              )}

              {joined && (
                <>
                  {/* Error Display */}
                  {error && (
                    <div className="mb-6 text-sm text-rose-300 bg-rose-500/10 px-4 py-3 rounded-xl border border-rose-500/20 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      {error}
                    </div>
                  )}

                  {/* MCQ Generation Section */}
                  <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl shadow-lg p-6 mb-6 border border-slate-800 border-l-4 border-l-purple-500">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
                        <FileText size={18} />
                      </div>
                      <h3 className="text-lg font-bold text-white">Generate MCQs</h3>
                    </div>
                    
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Example: Generate 10 MCQs on Data Structures..."
                        className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-5 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 focus:outline-none transition-all"
                        disabled={generating}
                      />
                      <button
                        onClick={handleGenerateMCQs}
                        disabled={generating}
                        className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-white px-8 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 flex items-center gap-2"
                      >
                        {generating ? <Loader size={18} className="animate-spin" /> : <Send size={18} />}
                        {generating ? 'Generating...' : 'Generate'}
                      </button>
                    </div>
                  </div>

                  {/* Main Dashboard Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Sentiment Dashboard */}
                    <div className="lg:col-span-1">
                      <SentimentDashboard sentiment={sentiment} />
                    </div>

                    {/* Right: Participants & MCQ History */}
                    <div className="lg:col-span-2 space-y-6">
                      {/* Participants */}
                      <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-slate-800">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-bold text-white">Active Participants</h3>
                          <span className="bg-slate-800 text-slate-300 px-2.5 py-1 rounded-lg text-sm font-medium border border-slate-700">{participants.length}</span>
                        </div>
                        
                        <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                          {participants.length === 0 ? (
                            <div className="text-center py-8 text-slate-500 bg-slate-950/30 rounded-xl border border-slate-800/50">
                              <p>Waiting for participants...</p>
                            </div>
                          ) : (
                            participants
                              .filter((p) => !p.isAdmin)
                              .map((p) => (
                                <div key={p.id} className="border border-slate-700/50 rounded-xl p-3 flex justify-between items-center bg-slate-950/30 hover:bg-slate-800/50 transition-colors">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                                      {p.displayName.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                      <p className="font-medium text-slate-200 text-sm">{p.displayName}</p>
                                      <p className="text-xs text-slate-500">Joined {new Date(p.joinedAt).toLocaleTimeString()}</p>
                                    </div>
                                  </div>
                                  {p.sentiment && (
                                    <span
                                      className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                                        p.sentiment === 'good'
                                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                          : p.sentiment === 'neutral'
                                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                      }`}
                                    >
                                      {p.sentiment.charAt(0).toUpperCase() + p.sentiment.slice(1)}
                                    </span>
                                  )}
                                </div>
                              ))
                          )}
                        </div>
                      </div>

                      {/* MCQ History */}
                      <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-slate-800">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-bold text-white">MCQ Sessions</h3>
                          <span className="bg-slate-800 text-slate-300 px-2.5 py-1 rounded-lg text-sm font-medium border border-slate-700">{mcqs.length}</span>
                        </div>
                        
                        <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                          {mcqs.length === 0 ? (
                            <div className="text-center py-8 text-slate-500 bg-slate-950/30 rounded-xl border border-slate-800/50">
                              <p>No MCQs generated yet</p>
                            </div>
                          ) : (
                            mcqs.map((mcq, idx) => (
                              <button
                                key={mcq.id}
                                onClick={() => setSelectedMcq(mcq)}
                                className={`w-full text-left border rounded-xl p-3 transition-all ${
                                  selectedMcq?.id === mcq.id
                                    ? 'border-blue-500/50 bg-blue-500/10'
                                    : 'border-slate-700/50 bg-slate-950/30 hover:border-blue-500/30 hover:bg-slate-800/50'
                                }`}
                              >
                                <div className="flex justify-between items-start mb-1">
                                  <p className="font-medium text-slate-200 text-sm">Session {idx + 1}</p>
                                  <span className="text-xs text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">{mcq.mcqs.length} Qs</span>
                                </div>
                                <p className="text-sm text-slate-400 truncate">{mcq.prompt}</p>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* MCQ Analytics */}
                  {selectedMcq && (
                    <div className="mt-6">
                      <MCQAnalytics mcqSession={selectedMcq} socket={socketRef.current} roomId={roomId} />
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* HISTORY VIEW */}
          {activeTab === 'history' && (
            <div className="space-y-6">
              {selectedMeeting ? (
                // Detailed View
                <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl shadow-lg border border-slate-800 overflow-hidden">
                  <div className="bg-slate-900/80 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => setSelectedMeeting(null)}
                        className="p-2 hover:bg-slate-800 rounded-full transition text-slate-400 hover:text-white"
                      >
                        <ChevronRight className="rotate-180" size={20} />
                      </button>
                      <div>
                        <h2 className="text-xl font-bold text-white">Meeting Details</h2>
                        <p className="text-sm text-slate-400 font-mono">ID: {selectedMeeting.meeting.meetingId}</p>
                      </div>
                    </div>
                    <span className="text-sm text-slate-500 bg-slate-950 px-3 py-1 rounded-full border border-slate-800">
                      {new Date(selectedMeeting.meeting.createdAt).toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Summary Card */}
                    <div className="bg-indigo-950/20 rounded-xl p-6 border border-indigo-500/20">
                      <h3 className="font-bold text-indigo-400 mb-4 flex items-center gap-2">
                        <FileText size={18} /> Class Summary
                      </h3>
                      {selectedMeeting.summary ? (
                        <div className="space-y-4">
                          <div>
                            <p className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-2">Key Topics</p>
                            <div className="flex flex-wrap gap-2">
                              {selectedMeeting.summary.keyTopics.map((topic, i) => (
                                <span key={i} className="bg-indigo-500/10 text-indigo-300 px-2.5 py-1 rounded-lg text-xs border border-indigo-500/20">
                                  {topic}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-2">Main Insights</p>
                            <ul className="space-y-2">
                              {selectedMeeting.summary.mainInsights.map((insight, i) => (
                                <li key={i} className="text-sm text-indigo-200/80 flex gap-2">
                                  <span className="text-indigo-500 mt-1">•</span>
                                  <span>{insight}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-sm text-indigo-400/60 italic">No summary generated for this session.</p>
                        </div>
                      )}
                    </div>

                    {/* Stats Card */}
                    <div className="bg-emerald-950/20 rounded-xl p-6 border border-emerald-500/20">
                      <h3 className="font-bold text-emerald-400 mb-4 flex items-center gap-2">
                        <BarChart2 size={18} /> Engagement Stats
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-900/50 p-4 rounded-xl border border-emerald-500/10">
                          <p className="text-xs text-emerald-400/80 uppercase tracking-wider mb-1">Transcripts</p>
                          <p className="text-3xl font-bold text-white">{selectedMeeting.transcripts.length}</p>
                        </div>
                        <div className="bg-slate-900/50 p-4 rounded-xl border border-emerald-500/10">
                          <p className="text-xs text-emerald-400/80 uppercase tracking-wider mb-1">MCQ Sessions</p>
                          <p className="text-3xl font-bold text-white">{selectedMeeting.mcqs.length}</p>
                        </div>
                        <div className="bg-slate-900/50 p-4 rounded-xl border border-emerald-500/10 col-span-2">
                          <p className="text-xs text-emerald-400/80 uppercase tracking-wider mb-1">Average Sentiment</p>
                          <p className="text-xl font-medium text-white capitalize flex items-center gap-2">
                            {selectedMeeting.summary?.averageSentiment || 'N/A'}
                            {selectedMeeting.summary?.averageSentiment === 'positive' && <span className="text-emerald-400">😊</span>}
                            {selectedMeeting.summary?.averageSentiment === 'neutral' && <span className="text-amber-400">😐</span>}
                            {selectedMeeting.summary?.averageSentiment === 'negative' && <span className="text-rose-400">😟</span>}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* MCQ Details Section */}
                  {selectedMeeting.mcqs && selectedMeeting.mcqs.length > 0 && (
                    <div className="px-6 pb-6">
                      <div className="bg-slate-900/30 rounded-xl p-6 border border-slate-800">
                        <h3 className="font-bold text-slate-300 mb-4 flex items-center gap-2">
                          <FileText size={18} /> MCQ Sessions Details
                        </h3>
                        <div className="space-y-4">
                          {selectedMeeting.mcqs.map((mcq, idx) => (
                            <div key={idx} className="bg-slate-950/50 rounded-lg p-4 border border-slate-800/50">
                              <div className="flex justify-between items-start mb-3">
                                <h4 className="text-white font-medium text-sm">{mcq.prompt || 'Generated Quiz'}</h4>
                                <span className="text-xs text-slate-500 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                                  {new Date(mcq.createdAt).toLocaleTimeString()}
                                </span>
                              </div>
                              <div className="space-y-3">
                                {mcq.questions.map((q, qIdx) => (
                                  <div key={qIdx} className="pl-3 border-l-2 border-slate-800">
                                    <p className="text-slate-300 text-sm mb-2">{qIdx + 1}. {q.question}</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      {q.options.map((opt, oIdx) => (
                                        <div key={oIdx} className={`text-xs p-2 rounded ${
                                          opt === q.answer 
                                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                            : 'bg-slate-900 text-slate-500'
                                        }`}>
                                          {opt}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <div className="mt-3 pt-3 border-t border-slate-800/50 flex items-center gap-4 text-xs text-slate-400">
                                <span>Responses: <span className="text-white">{mcq.responses?.length || 0}</span></span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Transcripts Section */}
                  {selectedMeeting.transcripts && selectedMeeting.transcripts.length > 0 && (
                    <div className="px-6 pb-6">
                      <div className="bg-slate-900/30 rounded-xl p-6 border border-slate-800">
                        <h3 className="font-bold text-slate-300 mb-4 flex items-center gap-2">
                          <FileText size={18} /> Session Transcripts
                        </h3>
                        <div className="bg-slate-950/50 rounded-lg p-4 border border-slate-800/50 max-h-96 overflow-y-auto custom-scrollbar space-y-3">
                          {selectedMeeting.transcripts.map((t, idx) => (
                            <div key={idx} className="flex gap-3">
                              <div className="flex-shrink-0 w-16 text-xs text-slate-500 pt-1">
                                {new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                              <div className="flex-1">
                                <p className="text-xs font-bold text-blue-400 mb-0.5">{t.speaker || 'Instructor'}</p>
                                <p className="text-sm text-slate-300 leading-relaxed">{t.rawText}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                // List View
                <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl shadow-lg border border-slate-800 overflow-hidden">
                  <div className="px-6 py-5 border-b border-slate-800">
                    <h2 className="text-lg font-bold text-white">Past Meetings</h2>
                  </div>
                  
                  {loadingHistory ? (
                    <div className="p-12 flex justify-center">
                      <Loader className="animate-spin text-blue-500" size={32} />
                    </div>
                  ) : history.length === 0 ? (
                    <div className="p-16 text-center text-slate-500">
                      <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Calendar size={32} className="opacity-50" />
                      </div>
                      <p className="text-lg font-medium text-slate-400">No meeting history found</p>
                      <p className="text-sm mt-1">Start a new session to see it here</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-800">
                      {history.map((meeting) => (
                        <div key={meeting._id} className="p-5 hover:bg-slate-800/30 transition flex items-center justify-between group">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 flex items-center justify-center text-blue-400 font-bold border border-blue-500/20">
                              {meeting.meetingId.substring(0, 2)}
                            </div>
                            <div>
                              <h3 className="font-medium text-slate-200 text-lg">Meeting {meeting.meetingId}</h3>
                              <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-0.5">
                                <Calendar size={14} />
                                {new Date(meeting.createdAt).toLocaleDateString()} <span className="text-slate-700">•</span> {new Date(meeting.createdAt).toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-8">
                            <div className="text-right hidden sm:block">
                              <p className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Transcripts</p>
                              <p className="font-medium text-slate-300">{meeting.transcriptCount || 0}</p>
                            </div>
                            <div className="text-right hidden sm:block">
                              <p className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Avg. Sentiment</p>
                              <p className="font-medium text-slate-300 capitalize">
                                {meeting.summary?.averageSentiment || 'N/A'}
                              </p>
                            </div>
                            <div className="text-right hidden sm:block">
                              <p className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Status</p>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                meeting.status === 'active' 
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                  : 'bg-slate-800 text-slate-400 border-slate-700'
                              }`}>
                                {meeting.status}
                              </span>
                            </div>
                            <button
                              onClick={() => fetchMeetingDetails(meeting.meetingId)}
                              className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition border border-transparent hover:border-slate-700"
                            >
                              <ChevronRight size={20} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TOPICS VIEW */}
          {activeTab === 'topics' && (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mb-4 border border-slate-800">
                <BookOpen size={32} className="opacity-50" />
              </div>
              <h2 className="text-xl font-bold text-slate-400">Topics Management</h2>
              <p className="text-sm mt-2">Manage your course topics and curriculum here.</p>
            </div>
          )}

          {/* SETTINGS VIEW */}
          {activeTab === 'settings' && (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mb-4 border border-slate-800">
                <Settings size={32} className="opacity-50" />
              </div>
              <h2 className="text-xl font-bold text-slate-400">Settings</h2>
              <p className="text-sm mt-2">Configure your admin preferences.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}