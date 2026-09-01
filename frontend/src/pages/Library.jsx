import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Clock, Loader2, Play, Trash2, X, Settings, Edit3, Check, Search, Megaphone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Library() {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [launchModal, setLaunchModal] = useState({ isOpen: false, quiz: null });
  const [setup, setSetup] = useState({ mode: 'exam', minutes: 5 });
  const [editTagId, setEditTagId] = useState(null);
  const [editTagValue, setEditTagValue] = useState('');
  const [savingTags, setSavingTags] = useState(false);
  const [makingRoom, setMakingRoom] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [announcementMsg, setAnnouncementMsg] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    fetchQuizzes();
    fetchAnnouncement();
  }, []);

  const fetchAnnouncement = async () => {
    try {
      const res = await axios.get('/api/announcement');
      if (res.data?.announcement) setAnnouncementMsg(res.data.announcement);
    } catch(err) { }
  }

  const fetchQuizzes = async () => {
    try {
      const res = await axios.get(`/api/library?limit=100`);
      if (res.data) setQuizzes(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation(); // prevent clicking other elements if the card is clickable
    if (!window.confirm('Are you sure you want to delete this quiz?')) return;
    
    try {
      await axios.delete(`/api/library/${id}`);
      setQuizzes(quizzes.filter(quiz => quiz.id !== id));
    } catch (err) {
      console.error(err);
      alert('Failed to delete the quiz.');
    }
  };

  const handleSaveTags = async (id, e) => {
    e.stopPropagation();
    setSavingTags(true);
    try {
      await axios.put(`/api/library/${id}/tags`, { tags: editTagValue });
      setQuizzes(quizzes.map(q => q.id === id ? { ...q, tags: editTagValue } : q));
      setEditTagId(null);
    } catch (err) {
      console.error(err);
      alert('Failed to update tags.');
    } finally {
      setSavingTags(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  const handleLaunch = (quiz) => {
    setSetup({ mode: 'exam', minutes: quiz.count }); // Default 1 min per question
    setLaunchModal({ isOpen: true, quiz });
  };

  const startQuiz = async () => {
    if (setup.mode === 'host') {
      try {
        setMakingRoom(true);
        const res = await axios.post(`/api/rooms`, {
          quiz_id: launchModal.quiz.id,
          time: setup.minutes
        });
        navigate(`/host/${res.data.code}`);
      } catch (err) {
        console.error(err);
        alert('Failed to start multiplayer room.');
        setMakingRoom(false);
      }
    } else {
      navigate(`/test/${launchModal.quiz.id}?mode=${setup.mode}&time=${setup.minutes}`);
    }
  };

  const filteredQuizzes = quizzes.filter(q => 
    q.topic.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (q.tags && q.tags.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (q.description && q.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="max-w-5xl mx-auto pb-10">
      
      {announcementMsg && (
        <div className="bg-primary/20 border border-primary/50 text-white px-6 py-4 rounded-xl mb-8 flex items-start gap-3 shadow-lg animate-fade-in">
          <Megaphone className="w-6 h-6 text-primary shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-primary mb-1 uppercase tracking-wider">System Broadcast</h3>
            <p className="text-sm whitespace-pre-wrap">{announcementMsg}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Quiz Library</h1>
          <p className="text-gray-400">Access your previously generated AI quizzes</p>
        </div>
        
        <div className="relative w-full md:w-auto">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input 
            type="text" 
            placeholder="Search topics or tags..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pl-10 py-2 w-full md:w-64"
          />
        </div>
      </div>

      {quizzes.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <BookOpen className="w-16 h-16 text-gray-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No quizzes found</h2>
          <p className="text-gray-400 mb-6">You haven't generated any quizzes yet.</p>
          <button onClick={() => navigate('/')} className="btn-primary">
            Create Your First Quiz
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredQuizzes.map((quiz) => (
            <div key={quiz.id} className="glass-card p-6 flex flex-col group hover:border-primary/50 relative">
              <div className="mb-4">
                <div className="flex flex-wrap gap-2 mb-3 items-center min-h-[32px]">
                  <span className="inline-block px-3 py-1 bg-primary/20 text-primary text-xs font-semibold rounded-full">
                    {quiz.level}
                  </span>
                  
                  {editTagId === quiz.id ? (
                    <div className="flex items-center gap-1 w-full mt-2">
                      <input 
                        type="text" 
                        value={editTagValue}
                        onChange={(e) => setEditTagValue(e.target.value)}
                        placeholder="e.g. #math, algebra"
                        className="bg-dark/50 border border-primary/50 text-white text-xs px-2 py-1 rounded w-full flex-1"
                        autoFocus
                      />
                      <button onClick={(e) => handleSaveTags(quiz.id, e)} disabled={savingTags} className="p-1.5 bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-white rounded transition-colors">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setEditTagId(null); }} className="p-1.5 bg-gray-500/20 text-gray-400 hover:bg-gray-500 hover:text-white rounded transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      {quiz.tags && quiz.tags.split(',').filter(t => t.trim()).map(tag => (
                        <span key={tag} className="inline-block px-3 py-1 bg-purple-500/20 text-purple-400 text-xs font-semibold rounded-full">
                          {tag.trim().startsWith('#') ? tag.trim() : `#${tag.trim()}`}
                        </span>
                      ))}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditTagId(quiz.id);
                          setEditTagValue(quiz.tags || '');
                        }}
                        className="p-1 text-gray-500 hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                        title="Edit Tags"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
                <h3 className="text-xl font-bold mb-2 line-clamp-2" title={quiz.topic}>
                  {quiz.topic}
                </h3>
                <p className="text-sm text-gray-400 line-clamp-2">
                  {quiz.description || 'No additional description provided.'}
                </p>
              </div>
              
              <div className="mt-auto flex items-center justify-between border-t border-dark-border pt-4">
                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-4 h-4" /> {quiz.count} Qs
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" /> {quiz.count}m
                  </span>
                </div>
                <div className="flex gap-2">
                  {user?.isAdmin && (
                    <button
                      onClick={(e) => handleDelete(quiz.id, e)}
                      className="bg-red-500/10 hover:bg-red-500/20 text-red-500 p-2 rounded-lg transition-colors"
                      title="Admin Delete Quiz"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleLaunch(quiz)}
                    className="bg-primary/20 hover:bg-primary text-white p-2 rounded-lg transition-colors group-hover:bg-primary"
                    title="Setup Quiz"
                  >
                    <Settings className="w-5 h-5 ml-0.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Launch Setup Modal */}
      {launchModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md p-6 relative animate-slide-up">
            <button 
              onClick={() => setLaunchModal({ isOpen: false, quiz: null })}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
            
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Settings className="text-primary w-6 h-6" />
              Test Configuration
            </h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">Execution Mode</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button 
                    onClick={() => setSetup({ ...setup, mode: 'exam' })}
                    className={`p-3 rounded-xl border text-sm font-semibold transition-all ${setup.mode === 'exam' ? 'border-primary bg-primary/20 text-white' : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:bg-gray-800'}`}
                  >
                    Test / Exam Mode
                    <p className="text-xs font-normal mt-1 opacity-80">Results at the end</p>
                  </button>
                  <button 
                    onClick={() => setSetup({ ...setup, mode: 'practice' })}
                    className={`p-3 rounded-xl border text-sm font-semibold transition-all ${setup.mode === 'practice' ? 'border-primary bg-primary/20 text-white' : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:bg-gray-800'}`}
                  >
                    Practice Mode
                    <p className="text-xs font-normal mt-1 opacity-80">Instant feedback</p>
                  </button>
                  <button 
                    onClick={() => setSetup({ ...setup, mode: 'host' })}
                    className={`p-3 rounded-xl border text-sm font-semibold transition-all ${setup.mode === 'host' ? 'border-primary bg-primary/20 text-white' : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:bg-gray-800'}`}
                  >
                    Host Multiplayer
                    <p className="text-xs font-normal mt-1 opacity-80">Invite friends remotely</p>
                  </button>
                </div>
              </div>

              {setup.mode !== 'practice' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Timer (Minutes)</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="120" 
                    className="input-field text-lg font-bold"
                    value={setup.minutes}
                    onChange={e => setSetup({...setup, minutes: parseInt(e.target.value) || 1 })}
                  />
                  <p className="text-xs text-gray-400 mt-2">Recommended: {launchModal.quiz.count} minutes ({launchModal.quiz.count} questions)</p>
                </div>
              )}

              <button onClick={startQuiz} disabled={makingRoom} className="btn-primary w-full flex items-center justify-center gap-2 py-3 mt-4">
                {makingRoom ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-current" />}
                {setup.mode === 'host' ? 'Create Room' : 'Start Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
