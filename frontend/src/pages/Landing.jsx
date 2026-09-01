import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Users, Database, ShieldCheck, Play, Mail, KeyRound, Loader2 } from 'lucide-react';

export default function Landing() {
  const { login, user, loading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) return alert("Enter a valid email.");
    
    setAuthLoading(true);
    const success = await login(email);
    setAuthLoading(false);

    if (success) {
      navigate('/library');
    } else {
      alert("Login failed. Please try again.");
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  if (user) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4">
        <Sparkles className="w-16 h-16 text-primary mb-6 animate-pulse" />
        <h1 className="text-4xl font-bold mb-4">Welcome back, {user.name}!</h1>
        <p className="text-xl text-gray-400 mb-8 max-w-2xl">
          Ready to generate more AI-powered tests or host a live multiplayer room?
        </p>
        <div className="flex gap-4">
          <button onClick={() => navigate('/generate')} className="btn-primary flex items-center gap-2">
            <Sparkles className="w-5 h-5" /> Generate New Quiz
          </button>
          <button onClick={() => navigate('/library')} className="glass-card hover:bg-dark-paper px-6 py-2 rounded-xl border border-primary/20 transition-all text-white font-semibold">
            Open Library
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 flex flex-col items-center">
      
      {/* Hero Section */}
      <div className="text-center mt-10 mb-20 animate-fade-in relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/20 blur-[100px] rounded-full -z-10 pointer-events-none"></div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-sm font-semibold mb-6">
          <Sparkles className="w-4 h-4" /> Gemini AI Powered
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight">
          The Ultimate <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">Multiplayer</span><br/> AI Quiz Platform
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Instantly generate comprehensive practice tests on any topic using Google's Gemini AI. Save them to your library, study locally, or host live competitive rooms with your friends!
        </p>
        
        <div className="flex flex-col items-center justify-center bg-dark-paper/80 backdrop-blur-md border border-dark-border p-8 rounded-2xl shadow-2xl max-w-sm mx-auto">
          <h3 className="text-lg font-bold mb-2">Login / Register</h3>
          <p className="text-sm text-gray-400 mb-6">Enter your email to instantly access your platform.</p>
          
          <div className="w-full">
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <div className="relative">
                <Mail className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input 
                  type="email" 
                  placeholder="name@email.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field pl-10 py-3 w-full text-center"
                  required
                />
              </div>
              <button type="submit" disabled={authLoading || !email} className="btn-primary py-3 flex items-center justify-center gap-2">
                {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Access Platform"}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
        <div className="glass-card p-8 rounded-2xl hover:-translate-y-2 transition-transform duration-300">
          <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-6">
            <Database className="w-6 h-6 text-blue-400" />
          </div>
          <h3 className="text-xl font-bold mb-3">Persistent Library</h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            Every AI quiz you generate is permanently saved to an ultra-fast SQLite database. Search via tags, edit metadata, and build your curriculum over time.
          </p>
        </div>

        <div className="glass-card p-8 rounded-2xl relative overflow-hidden hover:-translate-y-2 transition-transform duration-300 border border-primary/30">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Users className="w-32 h-32" />
          </div>
          <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center mb-6">
            <Play className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-xl font-bold mb-3">Live Competitions</h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            Launch any quiz in Multiplayer Mode. Your browser becomes a glowing Leaderboard Host while participants join instantly using a 6-digit Room Code.
          </p>
        </div>

        <div className="glass-card p-8 rounded-2xl hover:-translate-y-2 transition-transform duration-300">
          <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-6">
            <ShieldCheck className="w-6 h-6 text-purple-400" />
          </div>
          <h3 className="text-xl font-bold mb-3">Secure & Native</h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            Fully protected by enterprise-grade Rate Limiters and Role-Based Access Controls. Only designated Administrators can execute destructive deletions.
          </p>
        </div>
      </div>
    </div>
  );
}
