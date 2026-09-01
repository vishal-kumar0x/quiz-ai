import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Trophy, Home, RotateCcw, CheckCircle, XCircle } from 'lucide-react';

export default function Results() {
  const { state } = useLocation();
  const navigate = useNavigate();

  if (!state) {
    return (
      <div className="flex flex-col items-center justify-center mt-20 text-center">
        <h2 className="text-2xl font-bold mb-4">No Results Found</h2>
        <button onClick={() => navigate('/')} className="btn-primary">
          Go Home
        </button>
      </div>
    );
  }

  const { score, total, results, topic } = state;
  const percentage = Math.round((score / total) * 100);
  
  let resultMsg = "Good effort!";
  if (percentage >= 80) resultMsg = "Excellent Work!";
  if (percentage === 100) resultMsg = "Perfect Score!";

  return (
    <div className="max-w-4xl mx-auto pb-20 mt-10">
      <div className="glass-card p-12 text-center mb-12 relative overflow-hidden">
        {percentage > 60 && (
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/20 to-transparent -z-10 animate-fade-in" />
        )}
        
        <Trophy className={`w-24 h-24 mx-auto mb-6 ${percentage >= 80 ? 'text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]' : 'text-gray-400'}`} />
        <h1 className="text-4xl font-bold mb-2">{resultMsg}</h1>
        <p className="text-xl text-gray-300 mb-8">{topic}</p>
        
        <div className="inline-block bg-dark border border-dark-border rounded-3xl px-12 py-6 mb-8">
          <div className="text-5xl font-bold mb-2">
            <span className={percentage >= 50 ? 'text-green-400' : 'text-red-400'}>{score}</span> 
            <span className="text-gray-500"> / {total}</span>
          </div>
          <div className="text-gray-400 font-medium">({percentage}%)</div>
        </div>

        <div className="flex justify-center gap-4">
          <button onClick={() => navigate('/library')} className="btn-primary flex items-center gap-2">
            <RotateCcw className="w-5 h-5" /> Take Another Test
          </button>
          <button onClick={() => navigate('/')} className="bg-dark/50 hover:bg-dark-border text-white px-6 py-3 rounded-xl border border-dark-border transition">
            <Home className="w-5 h-5 inline mr-2" /> Home
          </button>
        </div>
      </div>

      <h2 className="text-2xl font-bold mb-6">Detailed Review</h2>
      <div className="space-y-6">
        {results?.map((res, idx) => (
          <div key={idx} className={`glass-card p-6 border-l-4 ${res.isCorrect ? 'border-l-green-500' : 'border-l-red-500'}`}>
            <h3 className="text-lg font-semibold mb-4">
              {idx + 1}. {res.question}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="bg-dark/50 p-4 rounded-xl border border-dark-border">
                <div className="text-sm font-medium text-gray-400 mb-1 flex items-center gap-1">
                  Your Answer: 
                  {res.isCorrect ? <CheckCircle className="w-4 h-4 text-green-500 inline" /> : <XCircle className="w-4 h-4 text-red-500 inline" />}
                </div>
                <div className={res.isCorrect ? 'text-green-400' : 'text-red-400'}>
                  {res.selected || <span className="text-gray-500 italic">Not answered</span>}
                </div>
              </div>
              
              {!res.isCorrect && (
                <div className="bg-green-500/10 p-4 rounded-xl border border-green-500/30">
                  <div className="text-sm font-medium text-green-500/80 mb-1">Correct Answer:</div>
                  <div className="text-green-400">{res.correct}</div>
                </div>
              )}
            </div>

            {res.explanation && (
              <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 text-sm">
                <span className="font-semibold text-primary">Explanation:</span> {res.explanation}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
