import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';

export default function MCQDisplay({ mcqSession, socket, roomId, participantId, onClose }) {
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(new Set());

  const handleAnswer = (questionIndex, option) => {
    setAnswers({
      ...answers,
      [questionIndex]: option
    });

    // Auto-submit the answer
    socket.emit('submit-mcq-response', {
      roomId,
      mcqSessionId: mcqSession.id,
      questionIndex,
      answer: option
    });

    setSubmitted(new Set([...submitted, questionIndex]));
  };

  if (!mcqSession || !mcqSession.mcqs) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-3xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl shadow-black/50 ring-1 ring-white/10">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600/90 to-emerald-600/90 backdrop-blur-md text-white p-6 border-b border-white/10 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-bold tracking-tight">{mcqSession.prompt || 'MCQ Assessment'}</h2>
            <p className="text-sm mt-1 opacity-90 font-medium">
              {mcqSession.mcqs.length} Questions • Answer all to submit
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-xl transition-all"
            title="Close"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
          {mcqSession.mcqs.map((q, idx) => (
            <div key={idx} className="bg-slate-950/50 border border-slate-800/50 rounded-2xl p-5 shadow-inner">
              <div className="flex items-start gap-3">
                <div className="bg-gradient-to-br from-blue-500 to-emerald-500 text-white rounded-full h-8 w-8 flex items-center justify-center flex-shrink-0 font-bold text-sm">
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-white mb-4 text-base leading-relaxed">{q.question}</p>

                  <div className="space-y-2.5">
                    {q.options.map((option, optIdx) => (
                      <button
                        key={optIdx}
                        onClick={() => handleAnswer(idx, option)}
                        disabled={submitted.has(idx)}
                        className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                          answers[idx] === option
                            ? 'border-emerald-500 bg-emerald-500 bg-opacity-20 text-emerald-300 font-medium shadow-lg shadow-emerald-500/20'
                            : 'border-slate-600 bg-slate-800 text-slate-300 hover:border-slate-500 hover:bg-slate-700'
                        } ${submitted.has(idx) ? 'cursor-not-allowed opacity-60' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition ${
                              answers[idx] === option
                                ? 'border-emerald-400 bg-emerald-500'
                                : 'border-slate-500'
                            }`}
                          >
                            {answers[idx] === option && (
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          <span className="flex-1">{option}</span>
                        </div>
                      </button>
                    ))}
                  </div>

                  {submitted.has(idx) && (
                    <div className="mt-3 text-xs text-emerald-400 font-medium flex items-center gap-1.5 bg-emerald-500 bg-opacity-10 px-3 py-1.5 rounded-lg border border-emerald-500 border-opacity-20">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Answer submitted
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="sticky bottom-0 bg-slate-900 border-t border-slate-700 p-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <p className="text-sm text-slate-300">
              Progress: <span className="font-bold text-white">{submitted.size}</span> / {mcqSession.mcqs.length}
            </p>
            <div className="w-32 bg-slate-700 rounded-full h-2 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-500"
                style={{ width: `${(submitted.size / mcqSession.mcqs.length) * 100}%` }}
              />
            </div>
          </div>
          <p className="text-xs text-slate-500">Answers auto-submit</p>
        </div>
      </div>
    </div>
  );
}
