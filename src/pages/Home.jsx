import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const [meetingId, setMeetingId] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function createMeeting() {
    setLoading(true);
    try {
      const res = await fetch('/api/create-meeting', { method: 'POST' });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}. Make sure the backend server is running on port 3000.`);
      }
      const data = await res.json();
      alert(`Meeting Created!\nRoom Code: ${data.meetingId}\n\nShare this code with participants to join.`);
      navigate(`/room/${data.meetingId}?role=instructor`);
    } catch (error) {
      console.error('Error creating meeting:', error);
      alert(`Failed to create meeting.\n\n${error.message}\n\nMake sure:\n1. Backend server is running (npm start in server/)\n2. MongoDB is running\n3. Port 3000 is not in use`);
    } finally {
      setLoading(false);
    }
  }

  function join() {
    if (!meetingId.trim()) {
      alert('Enter meeting id');
      return;
    }
    navigate(`/room/${meetingId}?role=participant`);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-gradient-to-br from-blue-600/20 to-purple-600/20 blur-[120px] animate-pulse"></div>
        <div className="absolute top-[40%] -right-[10%] w-[60%] h-[60%] rounded-full bg-gradient-to-br from-emerald-600/20 to-teal-600/20 blur-[120px] animate-pulse delay-1000"></div>
        <div className="absolute bottom-[-20%] left-[20%] w-[50%] h-[50%] rounded-full bg-gradient-to-br from-rose-600/10 to-orange-600/10 blur-[100px] animate-pulse delay-700"></div>
      </div>

      <div className="max-w-5xl w-full relative z-10">
        <div className="text-center mb-16">

          <h1 className="text-7xl font-extrabold text-white mb-6 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-emerald-400 drop-shadow-lg">
            WebConference
          </h1>
          <p className="text-slate-300 text-xl max-w-2xl mx-auto leading-relaxed font-light">
            Web Application for Content Delivery with <span className="text-blue-400 font-medium">Video Conferencing, Automated Polling</span> and <span className="text-purple-400 font-medium">Real-Time Analysis</span>.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Host Meeting Card */}
          <div className="bg-slate-900/40 backdrop-blur-2xl border border-slate-700/50 rounded-3xl p-8 hover:border-blue-500/50 transition-all duration-500 group hover:shadow-[0_0_40px_-10px_rgba(59,130,246,0.3)] hover:-translate-y-2 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-5 mb-6">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-2xl flex items-center justify-center text-blue-400 text-3xl group-hover:scale-110 transition-transform duration-300 border border-blue-500/20 shadow-lg shadow-blue-500/10">
                  👨‍🏫
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-white tracking-tight">Host Meeting</h2>
                  <p className="text-blue-400/80 text-sm font-medium uppercase tracking-wider mt-1">For Instructors & Leads</p>
                </div>
              </div>
              <p className="text-slate-400 mb-8 leading-relaxed text-lg">
                Create a new session with advanced analytics, automated transcription, and real-time engagement tracking.
              </p>
              <button 
                onClick={createMeeting} 
                disabled={loading} 
                className="w-full bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-500 hover:via-blue-400 hover:to-indigo-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-white px-6 py-4 rounded-2xl font-bold text-lg transition-all duration-300 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/50 flex items-center justify-center gap-3 group-hover:scale-[1.02]"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Creating Space...</span>
                  </>
                ) : (
                  <>
                    <span>Create New Space</span>
                    <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </button>
              
              <div className="mt-8 pt-6 border-t border-slate-700/50">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2.5 text-sm text-slate-400 group-hover:text-slate-300 transition-colors">
                    <div className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]"></div>
                    Sentiment Analysis
                  </div>
                  <div className="flex items-center gap-2.5 text-sm text-slate-400 group-hover:text-slate-300 transition-colors">
                    <div className="w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.6)]"></div>
                    AI Polls
                  </div>
                  <div className="flex items-center gap-2.5 text-sm text-slate-400 group-hover:text-slate-300 transition-colors">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"></div>
                    Live Transcription
                  </div>
                  <div className="flex items-center gap-2.5 text-sm text-slate-400 group-hover:text-slate-300 transition-colors">
                    <div className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]"></div>
                    Analytics
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Join Meeting Card */}
          <div className="bg-slate-900/40 backdrop-blur-2xl border border-slate-700/50 rounded-3xl p-8 hover:border-emerald-500/50 transition-all duration-500 group hover:shadow-[0_0_40px_-10px_rgba(16,185,129,0.3)] hover:-translate-y-2 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-5 mb-6">
                <div className="w-14 h-14 bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 rounded-2xl flex items-center justify-center text-emerald-400 text-3xl group-hover:scale-110 transition-transform duration-300 border border-emerald-500/20 shadow-lg shadow-emerald-500/10">
                  👥
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-white tracking-tight">Join Meeting</h2>
                  <p className="text-emerald-400/80 text-sm font-medium uppercase tracking-wider mt-1">For Participants & Students</p>
                </div>
              </div>
              <p className="text-slate-400 mb-8 leading-relaxed text-lg">
                Enter the room code provided by your host to join the session and participate in real-time.
              </p>
              
              <div className="space-y-5">
                <div className="relative group/input">
                  <input 
                    value={meetingId} 
                    onChange={(e) => setMeetingId(e.target.value)} 
                    placeholder="Enter room code (e.g. 4A2B...)" 
                    onKeyPress={(e) => e.key === 'Enter' && join()} 
                    className="w-full bg-slate-950/60 border border-slate-700 rounded-2xl px-6 py-4 text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all font-mono tracking-wider text-lg group-hover/input:border-slate-600" 
                  />
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none group-focus-within/input:text-emerald-500 transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                  </div>
                </div>
                
                <button 
                  onClick={join} 
                  className="w-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:via-emerald-400 hover:to-teal-500 text-white px-6 py-4 rounded-2xl font-bold text-lg transition-all duration-300 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/50 flex items-center justify-center gap-3 group-hover:scale-[1.02]"
                >
                  <span>Join Session</span>
                  <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-700/50">
                <p className="text-center text-slate-500 text-sm font-medium">
                  No account required. Just enter the code and join.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-20 text-center">
          <a href="/admin" className="inline-flex items-center gap-2 text-slate-500 hover:text-white transition-all duration-300 text-sm font-medium px-6 py-3 rounded-full hover:bg-slate-800/50 border border-transparent hover:border-slate-700">
            <span>Admin Dashboard</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}
