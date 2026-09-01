import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Loader2, Sparkles, AlertCircle } from 'lucide-react';

export default function Generator() {
  const [formData, setFormData] = useState({
    topic: '',
    tags: '',
    level: 'Intermediate (Class 11-12)',
    count: 5,
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await axios.post(`/api/generate`, formData);
      if (res.data.status === 'success') {
        const quizId = res.data.quiz.id;
        navigate('/library');
      }
    } catch (err) {
      setError(err.response?.data || 'Failed to generate quiz. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-10">
      <div className="glass-card p-8">
        <div className="text-center mb-8">
          <div className="bg-primary/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Create New Quiz</h1>
          <p className="text-gray-400">Powered by Gemini AI</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl flex items-start gap-3 text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Topic</label>
              <input
                type="text"
                required
                className="input-field"
                placeholder="e.g., Photosynthesis, Python..."
                value={formData.topic}
                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Hashtags / Tags (Optional)</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g., #biology, #exam2026"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Difficulty Level</label>
              <select
                className="input-field"
                value={formData.level}
                onChange={(e) => setFormData({ ...formData, level: e.target.value })}
              >
                <option>Primary (Class 1-5)</option>
                <option>Middle (Class 6-8)</option>
                <option>High School</option>
                <option>Intermediate (Class 11-12)</option>
                <option>University</option>
                <option>Professional</option>
                <option>JEE Main / NEET</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Question Count</label>
              <input
                type="number"
                min="1"
                max="30"
                className="input-field"
                value={formData.count}
                onChange={(e) => setFormData({ ...formData, count: parseInt(e.target.value) })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Additional Instructions (Optional)</label>
            <textarea
              className="input-field min-h-[100px] resize-y"
              placeholder="e.g., 'Focus heavily on numerical problems' or 'Make options tricky'"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !formData.topic}
            className="btn-primary w-full flex justify-center items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Crafting your questions...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Generate Quiz
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
