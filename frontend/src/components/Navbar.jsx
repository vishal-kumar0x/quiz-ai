import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Sparkles, Library, Play, LogOut, ShieldAlert, Crown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navLink = (path, icon, text) => {
    const isActive = location.pathname === path;
    return (
      <Link
        to={path}
        className={`flex items-center gap-2 px-3 md:px-4 py-2 text-sm md:text-base rounded-lg transition-all ${
          isActive 
            ? 'bg-primary/20 text-primary font-semibold' 
            : 'text-gray-400 hover:text-white hover:bg-dark-border'
        }`}
      >
        {icon}
        {text}
      </Link>
    );
  };

  return (
    <nav className="fixed top-0 w-full z-50 glass-card !rounded-none !border-t-0 !border-x-0 bg-dark/90">
      <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <Link to="/" className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent flex items-center gap-2 hover:opacity-80 transition-opacity">
          <Sparkles className="text-primary" />
          QuizAI
        </Link>
        <div className="flex flex-wrap justify-center gap-2 md:gap-4 items-center">
          {user && (
            <>
              {navLink('/generate', <Sparkles size={18} />, 'Generator')}
              {navLink('/library', <Library size={18} />, 'Library')}
              {user.isAdmin && navLink('/admin', <ShieldAlert size={18} className="text-yellow-400" />, 'Admin Panel')}
            </>
          )}
          {navLink('/join', <Play size={18} />, 'Join Game')}
          
          {user && (
            <div className="flex items-center gap-3 ml-2 pl-4 border-l border-white/10">
              <div className="text-sm text-gray-400 flex items-center gap-1.5 font-medium hidden md:flex">
                {user.isAdmin ? (
                  <span className="flex items-center gap-1.5 text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded border border-yellow-400/20">
                    <Crown size={14} className="animate-pulse" /> Admin
                  </span>
                ) : (
                  user.email
                )}
              </div>
              <button 
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 md:px-4 py-2 text-sm md:text-base rounded-lg transition-all text-red-400 hover:text-white hover:bg-red-500/20"
              >
                <LogOut size={16} className="md:w-[18px] md:h-[18px]" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
