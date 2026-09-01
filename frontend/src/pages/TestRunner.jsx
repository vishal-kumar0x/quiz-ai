import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Loader2, Clock, CheckCircle, AlertCircle, Eye } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function TestRunner() {
  const { loading: authLoading } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Parse query params
  const searchParams = new URLSearchParams(location.search);
  const mode = searchParams.get('mode') || 'exam';
  const initialTime = searchParams.get('time') ? parseInt(searchParams.get('time')) * 60 : 0;
  const roomCode = searchParams.get('room');
  const playerName = searchParams.get('name');

  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [revealed, setRevealed] = useState({}); // For practice mode: tracks which questions the user checked
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFinished, setIsFinished] = useState(false);
  const [players, setPlayers] = useState([]);
  const [savedResults, setSavedResults] = useState(null);
  const [activeTab, setActiveTab] = useState('leaderboard'); // leaderboard, analysis
  const ws = useRef(null);

  useEffect(() => {
    if (mode === 'multiplayer' && roomCode && playerName) {
      const WS_PROTOCOL = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const API_URL = `${WS_PROTOCOL}//${window.location.host}/ws/join/${roomCode.toUpperCase()}?name=${encodeURIComponent(playerName)}`;
      ws.current = new WebSocket(API_URL);
      
      ws.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'PLAYERS_UPDATE') {
          const sortedPlayers = data.players ? data.players.sort((a,b) => b.score - a.score) : [];
          setPlayers(sortedPlayers);
        }
        if (data.type === 'ALREADY_FINISHED') {
          setIsFinished(true);
          const cached = localStorage.getItem(`quiz_session_${roomCode}_${playerName}`);
          if (cached) {
             setSavedResults(JSON.parse(cached));
          }
        }
      };

      return () => {
        if (ws.current) ws.current.close();
      };
    }
  }, [mode, roomCode, playerName]);

  useEffect(() => {
    if (authLoading) return;
    
    // Refresh Lock Exploit Mitigation check
    if (mode === 'multiplayer' && roomCode && playerName) {
       const cachedBytes = localStorage.getItem(`quiz_session_${roomCode}_${playerName}`);
       if (cachedBytes) {
          setIsFinished(true);
          setSavedResults(JSON.parse(cachedBytes));
       }
    }

    const fetchQuiz = async () => {
      try {
        const res = await axios.get(`/api/library/${id}`);
        setQuiz(res.data);
        if (mode === 'exam' || mode === 'multiplayer') {
          setTimeLeft(initialTime > 0 ? initialTime : res.data.count * 60);
        }
      } catch (err) {
        setError('Failed to load quiz');
      } finally {
        setLoading(false);
      }
    };
    fetchQuiz();
  }, [id, authLoading]);

  useEffect(() => {
    if (mode === 'practice' || !timeLeft || !quiz) return;
    
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }

    const timerId = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timerId);
  }, [timeLeft, quiz]);

  const handleSelect = (idx, value) => {
    if (revealed[idx]) return; // Prevent changing answer after it's revealed in practice mode
    setAnswers(prev => ({ ...prev, [idx]: value }));
  };

  const handleReveal = (idx) => {
    if (!answers[idx]) return;
    setRevealed(prev => ({ ...prev, [idx]: true }));
  };

  const handleSubmit = () => {
    let score = 0;
    const results = quiz.questions.map((q, idx) => {
      const isCorrect = answers[idx]?.trim() === q.answer.trim();
      if (isCorrect) score++;
      return {
        question: q.question,
        selected: answers[idx] || null,
        correct: q.answer,
        isCorrect,
        explanation: q.explanation
      };
    });

    if (mode === 'multiplayer' && ws.current) {
      // Secure local offline lock
      localStorage.setItem(`quiz_session_${roomCode}_${playerName}`, JSON.stringify({ score, total: quiz.count, results }));
      setSavedResults({ score, total: quiz.count, results });
      // Broadcast score to host
      ws.current.send(JSON.stringify({ action: "FINISH", score }));
      setIsFinished(true);
      return;
    }

    // Delay navigation slightly to let WS send complete
    setTimeout(() => {
      // Pass data to results page via React Router state
      navigate('/results', { 
        state: { 
          score, 
          total: quiz.count, 
          results,
          topic: quiz.topic 
        } 
      });
    }, 100);
  };

  if (loading) return <div className="flex justify-center mt-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;
  if (error) return <div className="text-center mt-20 text-red-400 text-xl">{error}</div>;
  if (!quiz) return <div className="flex justify-center mt-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;

  if (isFinished) {
    const isGlobalFinish = players.length > 0 && players.every(p => p.status === 'finished');
    const myRank = players.findIndex(p => p.name === playerName) + 1;

    return (
      <div className="max-w-4xl mx-auto py-10 mt-4 animate-fade-in">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold mb-4 text-primary">Score Submitted!</h1>
          {savedResults && (
             <div className="inline-block bg-primary/20 border-2 border-primary rounded-3xl p-4 mb-4">
                <span className="text-2xl font-bold text-white">Your Score: {savedResults.score} / {savedResults.total}</span>
             </div>
          )}
          {!isGlobalFinish && <p className="text-gray-400 text-lg animate-pulse">Waiting for other players to finish...</p>}
          {isGlobalFinish && <p className="text-green-400 font-bold text-lg">Everyone has completed the test!</p>}
        </div>

        <div className={`glass-card p-6 min-h-[400px] transition-all duration-500 ${isGlobalFinish ? 'border-primary/50 shadow-[0_0_30px_rgba(var(--primary-rgb),0.2)]' : ''}`}>
          
          <div className="flex bg-dark rounded-xl p-2 mb-8 border border-gray-700">
             <button 
                onClick={() => setActiveTab('leaderboard')}
                className={`flex-1 py-3 font-bold rounded-lg transition-all ${activeTab === 'leaderboard' ? 'bg-primary text-dark' : 'text-gray-400 hover:text-white'}`}
             >
                Global Leaderboard
             </button>
             <button 
                onClick={() => setActiveTab('analysis')}
                className={`flex-1 py-3 font-bold rounded-lg transition-all ${activeTab === 'analysis' ? 'bg-primary text-dark' : 'text-gray-400 hover:text-white'}`}
             >
                Your Analysis
             </button>
          </div>

          {activeTab === 'leaderboard' && (
             <div className="space-y-4 animate-fade-in">
               {players.map((p, idx) => {
                 let rankStyle = "bg-dark/40 border-dark-border";
                 let medal = null;
                 
                 if (p.score > 0 || isGlobalFinish) {
                   if (idx === 0) {
                     rankStyle = "bg-yellow-500/10 border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.1)] scale-[1.02] z-10 relative";
                     medal = "🥇";
                   } else if (idx === 1) {
                     rankStyle = "bg-gray-300/10 border-gray-400/50";
                     medal = "🥈";
                   } else if (idx === 2) {
                     rankStyle = "bg-amber-700/10 border-amber-700/50";
                     medal = "🥉";
                   }
                 }

                 return (
                   <div key={idx} className={`flex justify-between items-center p-5 rounded-xl border transition-all duration-500 ${rankStyle}`}>
                     <div className="flex items-center gap-5">
                       <div className="w-10 h-10 flex items-center justify-center bg-dark rounded-lg border border-gray-700 font-mono text-xl font-bold text-gray-400">
                         {medal ? <span className="text-2xl drop-shadow-md">{medal}</span> : `#${idx + 1}`}
                       </div>
                       <span className="font-bold text-2xl tracking-wide">{p.name} {p.name === playerName && '(You)'}</span>
                     </div>
                     
                     <div className="flex items-center gap-4">
                       {p.status === 'playing' ? (
                         <span className="text-yellow-400 font-mono italic">
                           In Progress...
                         </span>
                       ) : (
                         <div className="text-right">
                           <span className="text-sm text-gray-400 block mb-1">SCORE</span>
                           <span className="font-mono font-black text-3xl text-primary drop-shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]">
                             {p.score}
                           </span>
                         </div>
                       )}
                     </div>
                   </div>
                 );
               })}
             </div>
          )}

          {activeTab === 'analysis' && savedResults && (
             <div className="space-y-6 animate-fade-in text-left">
                {savedResults.results.map((r, i) => (
                   <div key={i} className={`p-6 rounded-2xl border ${r.isCorrect ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                      <p className="text-lg font-bold mb-4">{i + 1}. {r.question}</p>
                      <div className="space-y-2 mb-4">
                         <div className="flex items-center gap-2">
                            <span className="text-gray-400 w-24">Your Answer:</span>
                            <span className={`font-medium ${r.isCorrect ? 'text-green-400' : 'text-red-400'}`}>{r.selected || 'Unanswered'}</span>
                         </div>
                         {!r.isCorrect && (
                            <div className="flex items-center gap-2">
                               <span className="text-gray-400 w-24">Correct:</span>
                               <span className="font-medium text-green-400">{r.correct}</span>
                            </div>
                         )}
                      </div>
                      {r.explanation && (
                         <div className="bg-dark/50 p-4 rounded-xl text-sm text-gray-300 italic border border-gray-700/50">
                            {r.explanation}
                         </div>
                      )}
                   </div>
                ))}
             </div>
          )}

          {activeTab === 'analysis' && !savedResults && (
             <div className="py-20 text-center text-gray-500 animate-fade-in">
                <AlertCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-xl">Analysis data was lost due to a sudden browser refresh.</p>
             </div>
          )}
          
          <div className="mt-12 text-center">
            <button onClick={() => navigate('/library')} className="btn-primary px-8 py-3 text-lg">Leave Room</button>
          </div>
        </div>
      </div>
    );
  }

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const isLowTime = timeLeft < 60;

  return (
    <div className="max-w-3xl mx-auto pb-20 mt-4">
      {/* Top Bar - No longer sticky to prevent overlapping questions */}
      <div className="glass-card mb-8 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="font-bold text-2xl mb-1">{quiz.topic}</h2>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400 bg-dark/50 px-3 py-1 rounded-full border border-gray-700 font-medium capitalize">
              Mode: <span className={mode === 'practice' ? 'text-purple-400' : 'text-primary'}>{mode}</span>
            </span>
            <span className="text-sm text-gray-400">
              Answered: <span className="text-white">{Object.keys(answers).length}</span> / {quiz.count}
            </span>
          </div>
        </div>
        {mode !== 'practice' && (
          <div className={`flex items-center gap-2 px-5 py-3 rounded-xl border font-mono font-bold text-xl shadow-lg ${isLowTime ? 'bg-red-500/10 border-red-500/50 text-red-500 animate-pulse' : 'bg-primary/10 border-primary/30 text-primary'}`}>
            <Clock className="w-6 h-6" />
            {formatTime(timeLeft)}
          </div>
        )}
      </div>

      <div className="space-y-8">
        {(quiz.questions || []).map((q, idx) => (
          <div key={idx} className="glass-card p-6 md:p-8 animate-slide-up" style={{ animationDelay: `${idx * 0.1}s` }}>
            <h3 className="text-xl font-semibold mb-6 flex gap-3">
              <span className="text-primary flex-shrink-0">{idx + 1}.</span>
              {q.question}
            </h3>
            
            <div className="space-y-3">
              {(q.options || []).map((opt, optIdx) => {
                const isSelected = answers[idx] === opt;
                const isRevealed = revealed[idx];
                const isCorrectOpt = opt === q.answer;
                
                let optionStyle = 'border-dark-border bg-dark/30 hover:border-gray-500 hover:bg-dark-card';
                if (isSelected && !isRevealed) {
                  optionStyle = 'border-primary bg-primary/10';
                } else if (isRevealed) {
                  if (isCorrectOpt) {
                    optionStyle = 'border-green-500 bg-green-500/10 text-green-400';
                  } else if (isSelected && !isCorrectOpt) {
                    optionStyle = 'border-red-500 bg-red-500/10 text-red-400 opacity-60';
                  } else {
                    optionStyle = 'border-dark-border bg-dark/10 opacity-40 grayscale';
                  }
                }

                return (
                  <label 
                    key={optIdx} 
                    className={`flex items-start p-4 rounded-xl border transition-all ${isRevealed ? 'cursor-default' : 'cursor-pointer'} ${optionStyle}`}
                  >
                    <input
                      type="radio"
                      name={`q-${idx}`}
                      value={opt}
                      checked={isSelected}
                      disabled={isRevealed}
                      onChange={() => handleSelect(idx, opt)}
                      className="mt-1 w-5 h-5 text-primary bg-dark border-gray-600 focus:ring-primary focus:ring-2 disabled:opacity-50"
                    />
                    <span className="ml-3 text-lg leading-relaxed flex-1">{opt}</span>
                    {isRevealed && isCorrectOpt && <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />}
                    {isRevealed && isSelected && !isCorrectOpt && <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />}
                  </label>
                );
              })}
            </div>

            {/* Practice Mode: Check Answer Button & Explanation */}
            {mode === 'practice' && (
              <div className="mt-6 border-t border-dark-border pt-4">
                {!revealed[idx] ? (
                  <button 
                    onClick={() => handleReveal(idx)}
                    disabled={!answers[idx]}
                    className="flex items-center gap-2 text-primary bg-primary/10 hover:bg-primary/20 disabled:opacity-50 disabled:hover:bg-primary/10 px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    <Eye className="w-4 h-4" /> Check Answer
                  </button>
                ) : (
                  <div className="bg-dark/50 rounded-xl p-4 border border-gray-700 animate-slide-up">
                    <p className="font-semibold mb-2 flex items-center gap-2 text-white">
                      {answers[idx] === q.answer ? (
                        <span className="text-green-400 flex items-center gap-1"><CheckCircle className="w-4 h-4"/> Correct!</span>
                      ) : (
                        <span className="text-red-400 flex items-center gap-1"><AlertCircle className="w-4 h-4"/> Incorrect!</span>
                      )}
                    </p>
                    <p className="text-gray-300 leading-relaxed text-sm">
                      <span className="font-medium text-gray-400 block mb-1">Explanation:</span>
                      {q.explanation || "No explanation provided for this question."}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-12 text-center">
        <button onClick={handleSubmit} className="btn-primary px-12 py-4 text-lg">
          Submit Final Answers
        </button>
      </div>
    </div>
  );
}
