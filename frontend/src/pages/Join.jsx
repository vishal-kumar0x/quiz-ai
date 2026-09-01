import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, User, Key, Loader2, AlertCircle } from 'lucide-react';

export default function Join() {
  const [formData, setFormData] = useState({ name: '', code: '' });
  const [status, setStatus] = useState('input'); // input, connecting, waiting
  const [error, setError] = useState('');
  const [players, setPlayers] = useState([]);
  const ws = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  const handleJoin = (e) => {
    e.preventDefault();
    setError('');
    setStatus('connecting');

    const WS_PROTOCOL = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const API_URL = `${WS_PROTOCOL}//${window.location.host}/ws/join/${formData.code.toUpperCase()}?name=${encodeURIComponent(formData.name)}`;
    ws.current = new WebSocket(API_URL);

    ws.current.onopen = () => {
      setStatus('waiting');
    };

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'PLAYERS_UPDATE') {
        setPlayers(data.players);
      }
      if (data.type === 'START') {
        // Unmount WS so TestRunner can take over
        ws.current.close();
        navigate(`/test/${data.quiz_id}?mode=multiplayer&room=${formData.code.toUpperCase()}&name=${encodeURIComponent(formData.name)}&time=${data.time}`);
      }
    };

    ws.current.onerror = () => {
      setError('Failed to connect. Make sure the room code is correct and the host is active.');
      setStatus('input');
    };

    ws.current.onclose = (e) => {
      if (status === 'waiting') {
        setError('Host closed the room or connection was lost.');
        setStatus('input');
      }
    };
  };

  if (status === 'waiting') {
    return (
      <div className="max-w-2xl mx-auto mt-20 text-center glass-card p-12 animate-slide-up">
        <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto mb-6" />
        <h2 className="text-3xl font-bold mb-2">You're in the Lobby!</h2>
        <p className="text-gray-400 text-lg mb-8">Waiting for the host to officially start the game...</p>
        
        <div className="bg-dark/50 rounded-2xl p-6 border border-gray-700">
           <h3 className="text-xl font-bold mb-4 text-left flex items-center justify-between">
              Connected Players
              <span className="bg-primary/20 text-primary px-3 py-1 rounded-full text-sm">{players.length} Joined</span>
           </h3>
           <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {players.map((p, i) => (
                 <div key={i} className={`p-3 rounded-lg border flex items-center gap-3 transition-all ${p.name === formData.name ? 'bg-primary/10 border-primary text-primary font-bold' : 'bg-dark border-gray-700 text-gray-300'}`}>
                    <User className="w-5 h-5" />
                    <span className="truncate">{p.name} {p.name === formData.name && '(You)'}</span>
                 </div>
              ))}
           </div>
        </div>

        <div className="mt-8 pt-8 border-t border-dark-border flex justify-between">
          <span className="text-sm font-bold text-gray-500">Player Identity Confirmed</span>
          <span className="font-mono bg-dark px-3 py-1 rounded text-primary border border-primary/20">Room: {formData.code.toUpperCase()}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-20">
      <div className="glass-card p-8">
        <div className="text-center mb-8">
          <div className="bg-primary/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Play className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Join a Game</h1>
          <p className="text-gray-400">Enter the room code provided by your host</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl flex items-start gap-3 text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleJoin} className="space-y-6">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
              <Key className="w-4 h-4" /> Room Code
            </label>
            <input
              type="text"
              required
              maxLength="6"
              className="input-field text-center font-mono text-2xl tracking-[0.5em] uppercase"
              placeholder="123ABC"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
              <User className="w-4 h-4" /> Your Name
            </label>
            <input
              type="text"
              required
              maxLength="20"
              className="input-field text-lg"
              placeholder="e.g., Alex"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <button
            type="submit"
            disabled={status === 'connecting'}
            className="btn-primary w-full py-4 text-xl flex justify-center items-center gap-2"
          >
            {status === 'connecting' ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Enter Room'}
          </button>
        </form>
      </div>
    </div>
  );
}
