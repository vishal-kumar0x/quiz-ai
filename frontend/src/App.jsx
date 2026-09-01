import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import Generator from './pages/Generator';
import Library from './pages/Library';
import TestRunner from './pages/TestRunner';
import Results from './pages/Results';
import HostLobby from './pages/HostLobby';
import Join from './pages/Join';
import AdminDashboard from './pages/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';

export default function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col pt-32 md:pt-20">
        <Navbar />
        <main className="flex-grow container mx-auto px-4 py-8 animate-fade-in">
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/generate" element={<ProtectedRoute><Generator /></ProtectedRoute>} />
              <Route path="/library" element={<ProtectedRoute><Library /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
              <Route path="/test/:id" element={<TestRunner />} />
              <Route path="/results" element={<Results />} />
              <Route path="/host/:code" element={<ProtectedRoute><HostLobby /></ProtectedRoute>} />
              <Route path="/join" element={<Join />} />
            </Routes>
          </ErrorBoundary>
        </main>
      </div>
    </Router>
  );
}
