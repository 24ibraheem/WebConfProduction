import React, { useEffect, useState } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function SentimentDashboard({ sentiment = { good: 0, neutral: 0, negative: 0 } }) {
  const total = sentiment.good + sentiment.neutral + sentiment.negative;

  const data = {
    labels: ['Good', 'Neutral', 'Bad'],
    datasets: [
      {
        data: [sentiment.good, sentiment.neutral, sentiment.negative],
        backgroundColor: ['#22c55e', '#eab308', '#ef4444'],
        borderColor: ['#16a34a', '#ca8a04', '#dc2626'],
        borderWidth: 2
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { padding: 15, font: { size: 12 } }
      }
    }
  };

  return (
    <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-slate-800">
      <h2 className="text-lg font-bold text-white mb-4">Session Sentiment</h2>

      <div className="h-64">
        {total > 0 ? (
          <Doughnut data={data} options={options} />
        ) : (
          <div className="h-full flex items-center justify-center text-slate-500 bg-slate-950/30 rounded-xl border border-slate-800/50">
            <p>No responses yet</p>
          </div>
        )}
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <div className="bg-emerald-950/30 rounded-xl p-3 border border-emerald-500/20">
          <p className="text-xs text-emerald-400 font-medium uppercase tracking-wider">Good</p>
          <p className="text-2xl font-bold text-white">{sentiment.good}</p>
        </div>
        <div className="bg-amber-950/30 rounded-xl p-3 border border-amber-500/20">
          <p className="text-xs text-amber-400 font-medium uppercase tracking-wider">Neutral</p>
          <p className="text-2xl font-bold text-white">{sentiment.neutral}</p>
        </div>
        <div className="bg-rose-950/30 rounded-xl p-3 border border-rose-500/20">
          <p className="text-xs text-rose-400 font-medium uppercase tracking-wider">Bad</p>
          <p className="text-2xl font-bold text-white">{sentiment.negative}</p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-800">
        <p className="text-sm text-slate-400">
          Total responses: <span className="font-semibold text-white">{total}</span>
        </p>
      </div>
    </div>
  );
}