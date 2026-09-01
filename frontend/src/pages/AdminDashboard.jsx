import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ShieldAlert, Server, HardDrive, Users, Settings, Activity, Trash2, Download, Send, Megaphone, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [announcementMsg, setAnnouncementMsg] = useState('');
  const [broadcasting, setBroadcasting] = useState(false);

  const fetchStats = async () => {
    try {
      const res = await axios.get('/api/admin/stats');
      setStats(res.data);
      setAnnouncementMsg(res.data.announcement || '');
    } catch (err) {
      console.error("Failed to fetch admin stats");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000); // Poll every 5s for live memory updates
    return () => clearInterval(interval);
  }, []);

  const handleBroadcast = async (e) => {
    e.preventDefault();
    setBroadcasting(true);
    try {
      await axios.post('/api/admin/announcement', { message: announcementMsg });
      alert("Announcement Broadcasted Successfully!");
    } catch (err) {
      alert("Failed to broadcast message.");
    } finally {
      setBroadcasting(false);
    }
  };

  const handleNuke = async () => {
    const confirm1 = window.confirm("WARNING: You are about to DELETE EVERY SINGLE QUIZ AND QUESTION from the platform.\n\nAre you absolutely sure?");
    if (!confirm1) return;
    const confirm2 = window.prompt("To proceed with the Nuclear Wipe, please type: 'I AM SURE'");
    if (confirm2 !== 'I AM SURE') return;

    try {
      await axios.delete('/api/admin/system/nuke');
      alert("System Annihilated. All data cleared.");
      fetchStats();
    } catch (err) {
      alert("Wipe Failed.");
    }
  };

  const handleExport = () => {
    window.location.href = '/api/admin/system/export';
  };

  if (loading || !stats) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-yellow-400 mb-4" />
        <p className="text-gray-400">Authenticating God-Mode Access...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto animate-fade-in pb-20">
      
      <div className="flex items-center gap-3 mb-8 pb-6 border-b border-dark-border">
        <div className="p-3 bg-yellow-400/10 rounded-xl border border-yellow-400/20">
          <ShieldAlert className="w-8 h-8 text-yellow-500" />
        </div>
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-amber-600">
            System Control Panel
          </h1>
          <p className="text-gray-400">Server Administrator Protocol • {user.email}</p>
        </div>
      </div>

      {/* Live Server Stats */}
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Activity className="text-primary"/> Live Telemetry</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12">
        
        <div className="glass-card p-6 rounded-2xl border-t-2 border-t-blue-500 flex flex-col relative overflow-hidden">
          <Server className="absolute -right-4 -bottom-4 w-24 h-24 opacity-5" />
          <span className="text-gray-400 text-sm font-semibold mb-1">RAM Memory Usage</span>
          <span className="text-4xl font-black text-blue-400">{stats.memoryMB}<span className="text-xl"> MB</span></span>
          <div className="w-full bg-dark-paper h-1 mt-4 rounded-full overflow-hidden">
             <div className="bg-blue-500 h-full animate-pulse" style={{width: `${Math.min(stats.memoryMB / 10, 100)}%`}}></div>
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl border-t-2 border-t-purple-500 flex flex-col relative overflow-hidden">
          <Users className="absolute -right-4 -bottom-4 w-24 h-24 opacity-5" />
          <span className="text-gray-400 text-sm font-semibold mb-1">Active UDP Multi-Rooms</span>
          <span className="text-4xl font-black text-purple-400">{stats.activeRooms}</span>
          <span className="text-xs text-gray-500 mt-2">Live WebSockets connected</span>
        </div>

        <div className="glass-card p-6 rounded-2xl border-t-2 border-t-emerald-500 flex flex-col relative overflow-hidden">
          <HardDrive className="absolute -right-4 -bottom-4 w-24 h-24 opacity-5" />
          <span className="text-gray-400 text-sm font-semibold mb-1">Total SQLite Quizzes</span>
          <span className="text-4xl font-black text-emerald-400">{stats.totalQuizzes}</span>
          <span className="text-xs text-emerald-500/50 mt-2">({stats.totalQuestions} isolated questions)</span>
        </div>

        <div className="glass-card p-6 rounded-2xl border-t-2 border-t-amber-500 flex flex-col relative overflow-hidden">
          <Settings className="absolute -right-4 -bottom-4 w-24 h-24 opacity-5" />
          <span className="text-gray-400 text-sm font-semibold mb-1">Registered Accounts</span>
          <span className="text-4xl font-black text-amber-500">{stats.totalUsers}</span>
          <span className="text-xs text-gray-500 mt-2">Total recognized emails</span>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Comms & Controls */}
        <div className="lg:col-span-1 space-y-8">
          
          <div className="glass-card p-6 rounded-2xl">
             <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Megaphone className="w-5 h-5 text-primary"/> Global Broadcast</h2>
             <p className="text-xs text-gray-400 mb-4">Post a sticky announcement banner to every user's Library.</p>
             <form onSubmit={handleBroadcast}>
               <textarea 
                  value={announcementMsg}
                  onChange={(e) => setAnnouncementMsg(e.target.value)}
                  placeholder="Enter system broadcast message... (Leave blank to clear)"
                  className="w-full bg-dark/50 border border-dark-border rounded-xl p-3 text-sm min-h-[100px] mb-4 focus:border-primary focus:outline-none"
               />
               <button type="submit" disabled={broadcasting} className="w-full btn-primary py-2 flex items-center justify-center gap-2 text-sm">
                 {broadcasting ? <Loader2 className="w-4 h-4 animate-spin"/> : <><Send className="w-4 h-4"/> Publish Broadcast</>}
               </button>
             </form>
          </div>

          <div className="glass-card p-6 rounded-2xl border border-red-500/20 bg-red-500/5">
             <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-red-500"><ShieldAlert className="w-5 h-5"/> God-Mode Controls</h2>
             <p className="text-xs text-red-400/80 mb-6">These operations perform raw physical actions on the binary SQLite database.</p>
             
             <div className="flex flex-col gap-3">
               <button onClick={handleExport} className="w-full flex items-center justify-center gap-2 bg-dark-paper hover:bg-dark-border py-3 rounded-lg text-sm font-semibold transition-colors text-blue-400 border border-blue-500/30">
                 <Download className="w-4 h-4" /> Download Raw SQLite Backup
               </button>
               <button onClick={handleNuke} className="w-full flex items-center justify-center gap-2 bg-red-500/20 hover:bg-red-500/40 py-3 rounded-lg text-sm font-semibold transition-colors text-red-400 border border-red-500/50">
                 <Trash2 className="w-4 h-4" /> NUKE ALL SERVER DATA
               </button>
             </div>
          </div>

        </div>

        {/* Right Column: Audience Directory */}
        <div className="lg:col-span-2">
           <div className="glass-card p-0 rounded-2xl overflow-hidden h-full flex flex-col">
              <div className="p-6 border-b border-dark-border bg-dark-paper/30">
                <h2 className="text-lg font-bold flex items-center gap-2"><Users className="w-5 h-5 text-primary"/> Audience Directory</h2>
                <p className="text-xs text-gray-400 mt-1">Live tracking of all authenticated email addresses.</p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-dark/50 text-gray-400 text-xs uppercase">
                    <tr>
                      <th className="px-6 py-4">Account Email</th>
                      <th className="px-6 py-4">First Joined</th>
                      <th className="px-6 py-4">Last Login</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-border">
                    {stats.usersDirectory?.map((usr, i) => (
                      <tr key={i} className="hover:bg-dark-paper/50 transition-colors">
                        <td className="px-6 py-4 font-medium text-white flex items-center gap-2">
                           <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs">
                             {usr.email.charAt(0).toUpperCase()}
                           </div>
                           {usr.email}
                        </td>
                        <td className="px-6 py-4 text-gray-400">{new Date(usr.joined_at).toLocaleString()}</td>
                        <td className="px-6 py-4 text-gray-400">{new Date(usr.last_login).toLocaleString()}</td>
                      </tr>
                    ))}
                    {(!stats.usersDirectory || stats.usersDirectory.length === 0) && (
                       <tr>
                         <td colSpan="3" className="px-6 py-8 text-center text-gray-500">No registered users found.</td>
                       </tr>
                    )}
                  </tbody>
                </table>
              </div>
           </div>
        </div>

      </div>

    </div>
  );
}
