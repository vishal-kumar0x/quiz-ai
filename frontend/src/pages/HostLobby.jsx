import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, Play, AlertCircle, RefreshCw, Trophy, LogOut, X } from 'lucide-react';

export default function HostLobby() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [players, setPlayers] = useState([]);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('waiting'); // waiting, running, finished
  const [roomMeta, setRoomMeta] = useState(null);
  const ws = useRef(null);

  useEffect(() => {
    const WS_PROTOCOL = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const API_URL = `${WS_PROTOCOL}//${window.location.host}/ws/host/${code}`;
    ws.current = new WebSocket(API_URL);

    ws.current.onopen = () => {
      console.log('Host connected to room');
      setError('');
    };

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'ROOM_META') {
        setRoomMeta({ quiz_id: data.quiz_id, time: data.time });
      }
      if (data.type === 'PLAYERS_UPDATE') {
        const sortedPlayers = data.players ? data.players.sort((a,b) => b.score - a.score) : [];
        setPlayers(sortedPlayers);
        
        // Auto-check if everyone is finished
        if (sortedPlayers.length > 0 && sortedPlayers.every(p => p.status === 'finished')) {
          setStatus('finished');
        }
      }
    };

    ws.current.onerror = () => {
      setError('Connection failed. Room may not exist or backend is missing.');
    };

    ws.current.onclose = () => {
      setError('Disconnected from room.');
    };

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [code]);

  const triggerStart = () => {
    if (players.length === 0) {
      if (!window.confirm("No players joined yet! Start anyway?")) return false;
    }
    ws.current.send(JSON.stringify({ action: "START" }));
    setStatus('running');
    return true;
  };

  const handleStartMonitor = () => {
    triggerStart();
  };

  const handleStartPlay = () => {
    if (triggerStart() && roomMeta) {
      // Physically spawn the active test into a child tab acting as a standard player!
      window.open(`/test/${roomMeta.quiz_id}?mode=multiplayer&room=${code}&name=AdminHost&time=${roomMeta.time}`, '_blank');
    }
  };

  const handleExit = () => {
    if (window.confirm("Are you sure you want to close this room? It will disconnect all players.")) {
      ws.current.send(JSON.stringify({ action: "KICK_ALL" }));
      navigate('/library');
    }
  };

  const handleKick = (playerName) => {
    if (window.confirm(`Are you sure you want to kick ${playerName}?`)) {
      ws.current.send(JSON.stringify({ action: "KICK", name: playerName }));
    }
  };

  const activeCount = players.filter(p => p.status === 'playing' || p.status === 'waiting').length;
  const finishedCount = players.filter(p => p.status === 'finished').length;
  const totalCount = players.length;
  const progressPercent = totalCount > 0 ? Math.round((finishedCount / totalCount) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto py-10">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold mb-4">Multiplayer Lobby</h1>
        <p className="text-gray-400 text-lg mb-8">Share this code with your participants to join:</p>
        
        <div className="bg-primary/20 border-2 border-primary inline-block rounded-3xl p-8 mb-8">
          <span className="text-6xl font-mono font-black tracking-widest text-white">{code}</span>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl flex items-center justify-center gap-3 text-red-400">
          <AlertCircle className="w-5 h-5" />
          <p>{error}</p>
        </div>
      )}

      <div className="glass-card mb-10 p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex-1 w-full">
          <h2 className="text-2xl font-bold flex items-center gap-3 mb-2">
            <Users className="text-primary w-6 h-6" /> 
            Live Status: {finishedCount} / {totalCount} Completed
          </h2>
          
          {/* Progress Bar */}
          {status !== 'waiting' && totalCount > 0 && (
            <div className="w-full bg-dark rounded-full h-3 mt-4 border border-gray-700 overflow-hidden">
              <div 
                className="bg-primary h-3 rounded-full transition-all duration-1000 ease-out relative overflow-hidden" 
                style={{ width: `${progressPercent}%` }}
              >
                <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite]" />
              </div>
            </div>
          )}

          {status === 'running' && <p className="text-yellow-400 mt-4 flex items-center gap-2"><RefreshCw className="w-4 h-4 animate-spin"/> Game in progress... {activeCount} remaining</p>}
          {status === 'finished' && <p className="text-green-400 mt-4 font-bold flex items-center gap-2"><Trophy className="w-5 h-5"/> Everyone has submitted their answers!</p>}
        </div>
        
        <div className="flex flex-col gap-3 min-w-[200px]">
          {status === 'waiting' && (
            <>
              <button 
                onClick={handleStartMonitor}
                className="btn-primary text-lg px-6 py-3 flex items-center justify-center gap-3 shadow-lg hover:shadow-primary/30 w-full"
              >
                <Play className="w-5 h-5 fill-current" />
                Start & Monitor
              </button>
              <button 
                onClick={handleStartPlay}
                className="bg-transparent border-2 border-primary text-primary hover:bg-primary/10 text-lg px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-3 w-full transition-all"
              >
                <Users className="w-5 h-5" />
                Start & Play Along
              </button>
            </>
          )}
          {(status === 'running' || status === 'finished') && (
            <button 
              onClick={handleExit}
              className="px-6 py-4 rounded-xl font-bold transition-all border flex items-center justify-center gap-2 bg-red-500/10 border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white w-full"
            >
              <LogOut className="w-5 h-5" />
              End Session
            </button>
          )}
        </div>
      </div>

      <div className={`glass-card p-6 min-h-[400px] transition-all duration-500 ${status === 'finished' ? 'border-primary/50 shadow-[0_0_30px_rgba(var(--primary-rgb),0.2)]' : ''}`}>
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-dark-border">
          <Trophy className={`w-8 h-8 ${status === 'finished' ? 'text-primary' : 'text-gray-500'}`} />
          <h2 className="text-3xl font-bold">Leaderboard</h2>
        </div>

        {players.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 py-20 animate-fade-in">
            <Users className="w-20 h-20 mb-6 opacity-30" />
            <p className="text-xl font-medium">Waiting for participants to join...</p>
            <p className="text-gray-600 mt-2">The ranking will appear here automatically.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {players.map((p, idx) => {
              // Styling based on rank
              let rankStyle = "bg-dark/40 border-dark-border";
              let medal = null;
              
              if (p.score > 0 || status === 'finished') {
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
                <div 
                  key={idx} 
                  className={`flex justify-between items-center p-5 rounded-xl border transition-all duration-500 ${rankStyle} ${p.status === 'finished' ? 'animate-fade-in' : ''}`}
                >
                  <div className="flex items-center gap-5">
                    <div className="w-10 h-10 flex items-center justify-center bg-dark rounded-lg border border-gray-700 font-mono text-xl font-bold text-gray-400">
                      {medal ? <span className="text-2xl drop-shadow-md">{medal}</span> : `#${idx + 1}`}
                    </div>
                    <span className="font-bold text-2xl tracking-wide">{p.name}</span>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {status === 'waiting' && (
                      <button 
                        onClick={() => handleKick(p.name)}
                        className="text-gray-500 hover:text-red-500 p-2 transition-colors mr-2"
                        title="Kick Player"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                    {p.status === 'playing' ? (
                      <span className="flex items-center gap-2 text-yellow-400 font-mono italic">
                        <RefreshCw className="w-4 h-4 animate-spin" /> In Progress...
                      </span>
                    ) : p.status === 'waiting' ? (
                       <span className="text-gray-500 font-mono italic">Lobby...</span>
                    ) : (
                      <div className="text-right">
                        <span className="text-sm text-gray-400 block mb-1">FINAL SCORE</span>
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
      </div>
    </div>
  );
}
