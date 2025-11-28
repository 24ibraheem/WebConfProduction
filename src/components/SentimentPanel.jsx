import React, { useState } from 'react';

export default function SentimentPanel({ socket, roomId, currentSentiment, onSentimentChange }) {
  const [submitted, setSubmitted] = useState(false);

  const handleSentiment = (sentiment) => {
    socket.emit('submit-sentiment', { roomId, sentiment });
    setSubmitted(true);
    
    // Update the current sentiment in parent component
    if (onSentimentChange) {
      onSentimentChange(sentiment);
    }

    setTimeout(() => setSubmitted(false), 2000);
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-medium text-slate-300 text-sm">Session Feedback</h3>
        {submitted && (
          <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Submitted
          </span>
        )}
      </div>

      <div className="flex justify-center gap-3">
        <button
          onClick={() => handleSentiment('good')}
          className={`flex flex-col items-center justify-center px-6 py-4 rounded-lg transition-all duration-200 border ${
            currentSentiment === 'good'
              ? 'bg-emerald-500 bg-opacity-20 border-emerald-500 shadow-lg shadow-emerald-500/20'
              : 'bg-slate-700 bg-opacity-50 border-slate-600 hover:bg-opacity-70 hover:border-slate-500'
          }`}
        >
          <span className="text-2xl mb-1.5">😊</span>
          <span className="text-xs font-medium text-slate-300">Positive</span>
        </button>

        <button
          onClick={() => handleSentiment('neutral')}
          className={`flex flex-col items-center justify-center px-6 py-4 rounded-lg transition-all duration-200 border ${
            currentSentiment === 'neutral'
              ? 'bg-amber-500 bg-opacity-20 border-amber-500 shadow-lg shadow-amber-500/20'
              : 'bg-slate-700 bg-opacity-50 border-slate-600 hover:bg-opacity-70 hover:border-slate-500'
          }`}
        >
          <span className="text-2xl mb-1.5">😐</span>
          <span className="text-xs font-medium text-slate-300">Neutral</span>
        </button>

        <button
          onClick={() => handleSentiment('negative')}
          className={`flex flex-col items-center justify-center px-6 py-4 rounded-lg transition-all duration-200 border ${
            currentSentiment === 'negative'
              ? 'bg-rose-500 bg-opacity-20 border-rose-500 shadow-lg shadow-rose-500/20'
              : 'bg-slate-700 bg-opacity-50 border-slate-600 hover:bg-opacity-70 hover:border-slate-500'
          }`}
        >
          <span className="text-2xl mb-1.5">😞</span>
          <span className="text-xs font-medium text-slate-300">Negative</span>
        </button>
      </div>
    </div>
  );
}
