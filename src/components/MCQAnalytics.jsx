import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

export default function MCQAnalytics({ mcqSession, socket, roomId }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    socket.emit('get-mcq-analytics', { roomId, mcqSessionId: mcqSession.id });

    const handleAnalytics = (data) => {
      if (data.mcqSessionId === mcqSession.id) {
        setAnalytics(data);
        setLoading(false);
      }
    };

    const handleResponseUpdate = (data) => {
      if (data.mcqSessionId === mcqSession.id) {
        // Refresh analytics when new response comes in
        socket.emit('get-mcq-analytics', { roomId, mcqSessionId: mcqSession.id });
      }
    };

    socket.on('mcq-analytics', handleAnalytics);
    socket.on('mcq-response-update', handleResponseUpdate);
    
    return () => {
      socket.off('mcq-analytics', handleAnalytics);
      socket.off('mcq-response-update', handleResponseUpdate);
    };
  }, [mcqSession.id, socket, roomId]);

  if (loading) {
    return (
      <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 flex flex-col items-center justify-center h-96 shadow-inner">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-slate-400 font-medium">Loading analytics...</p>
      </div>
    );
  }

  if (!analytics) return null;

  const overallAccuracy = analytics.questionAnalytics.length > 0 && analytics.totalResponses > 0
    ? analytics.questionAnalytics.reduce((sum, q) => sum + q.correctCount, 0) / (analytics.totalResponses * analytics.questionAnalytics.length) * 100
    : 0;

  const participationRate = analytics.totalParticipants > 0 
    ? (analytics.totalResponses / analytics.totalParticipants) * 100 
    : 0;

  return (
    <div className="space-y-5">
      {/* Header Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 shadow-lg shadow-blue-500/20">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-blue-200" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
            </svg>
            <p className="text-xs text-blue-200 font-medium uppercase tracking-wider">Participants</p>
          </div>
          <p className="text-3xl font-bold text-white">{analytics.totalParticipants}</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg p-4 shadow-lg shadow-emerald-500/20">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-emerald-200" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <p className="text-xs text-emerald-200 font-medium uppercase tracking-wider">Responses</p>
          </div>
          <p className="text-3xl font-bold text-white">{analytics.totalResponses}</p>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg p-4 shadow-lg shadow-amber-500/20">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-amber-200" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
            </svg>
            <p className="text-xs text-amber-200 font-medium uppercase tracking-wider">Participation</p>
          </div>
          <p className="text-3xl font-bold text-white">{participationRate.toFixed(0)}%</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-4 shadow-lg shadow-purple-500/20">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-purple-200" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <p className="text-xs text-purple-200 font-medium uppercase tracking-wider">Accuracy</p>
          </div>
          <p className="text-3xl font-bold text-white">{overallAccuracy.toFixed(1)}%</p>
        </div>
      </div>

      {/* Per-Question Analytics */}
      <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-5 pb-4 border-b border-slate-800">
          <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
            <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
          </svg>
          <h3 className="text-lg font-bold text-white">Detailed Question Analysis</h3>
        </div>

        <div className="space-y-4">
          {analytics.questionAnalytics.map((question, idx) => {
            const correctPercentage = analytics.totalResponses > 0 
              ? (question.correctCount / analytics.totalResponses) * 100 
              : 0;
            const totalResponses = Object.values(question.responses).reduce((a, b) => a + b, 0);

            return (
              <div key={idx} className="bg-slate-950/30 border border-slate-700/50 rounded-xl p-4 hover:border-slate-600 transition">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="bg-gradient-to-br from-blue-500 to-emerald-500 text-white rounded-full h-8 w-8 flex items-center justify-center flex-shrink-0 font-bold text-sm">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-white text-base leading-relaxed mb-2">
                        {question.question}
                      </p>
                      <div className="flex items-center gap-2 text-sm">
                        <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-slate-400">Correct: </span>
                        <span className="font-semibold text-emerald-400">{question.correctAnswer}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <div className="bg-emerald-500 bg-opacity-20 border border-emerald-500 border-opacity-30 rounded-lg px-3 py-2">
                      <div className="text-2xl font-bold text-emerald-400">{correctPercentage.toFixed(0)}%</div>
                      <div className="text-xs text-emerald-300 mt-0.5">accuracy</div>
                    </div>
                  </div>
                </div>

                {/* Response Distribution */}
                <div className="space-y-2.5 mt-4">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Response Distribution</p>
                  {Object.entries(question.responses).length > 0 ? (
                    Object.entries(question.responses).map(([answer, count]) => {
                      const percentage = totalResponses > 0 ? (count / totalResponses) * 100 : 0;
                      const isCorrect = answer === question.correctAnswer;

                      return (
                        <div key={answer} className="flex items-center gap-3">
                          <div className="flex items-center gap-2 w-40 flex-shrink-0">
                            {isCorrect ? (
                              <CheckCircle size={18} className="text-emerald-400 flex-shrink-0" />
                            ) : (
                              <XCircle size={18} className="text-rose-400 flex-shrink-0" />
                            )}
                            <span className="text-sm text-slate-300 truncate">{answer}</span>
                          </div>
                          <div className="flex-1 bg-slate-800 rounded-full overflow-hidden h-7 min-w-0">
                            <div
                              className={`h-full flex items-center justify-end px-2 transition-all duration-500 ${
                                isCorrect 
                                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' 
                                  : 'bg-gradient-to-r from-rose-500 to-rose-600'
                              }`}
                              style={{ width: `${Math.max(percentage, 5)}%` }}
                            >
                              {percentage > 15 && (
                                <span className="text-xs font-bold text-white whitespace-nowrap">{percentage.toFixed(0)}%</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 w-16 justify-end">
                            <span className="text-sm font-bold text-white">{count}</span>
                            <span className="text-xs text-slate-500">votes</span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-slate-500 italic text-center py-2">No responses yet</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
