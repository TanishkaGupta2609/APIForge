import { Link, useNavigate } from 'react-router-dom';
import { Database, Server, Plus, LogOut, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

export function Header({
  title = 'Dashboard',
  subtitle = 'Overview of API test targets and load performance metrics',
  serverStatus = 'online',
  databaseStatus = 'connected',
}) {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="border-b border-slate-800 bg-slate-900/40 backdrop-blur-sm px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-white">{title}</h1>
        <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
      </div>

      <div className="flex items-center gap-3">
        {/* Backend Server Status */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-900 border border-slate-800 text-slate-300">
          <Server className="h-3 w-3 text-indigo-400" />
          <span>API:</span>
          <span
            className={`font-semibold capitalize ${
              serverStatus === 'online' ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {serverStatus}
          </span>
        </div>

        {/* Database Status */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-900 border border-slate-800 text-slate-300">
          <Database className="h-3 w-3 text-indigo-400" />
          <span>DB:</span>
          <span
            className={`font-semibold capitalize ${
              databaseStatus === 'connected' ? 'text-emerald-400' : 'text-amber-400'
            }`}
          >
            {databaseStatus}
          </span>
        </div>

        {/* User Account / Session Controls */}
        {isAuthenticated && user ? (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/60 text-xs text-slate-200">
              <User className="h-3.5 w-3.5 text-indigo-400" />
              <span className="font-medium max-w-[120px] truncate">{user.name}</span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-md transition"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <Link
            to="/login"
            className="text-xs font-medium text-slate-300 hover:text-white px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 transition"
          >
            Sign In
          </Link>
        )}

        {/* Quick Launch CTA */}
        <Link
          to="/tests"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded-lg transition shadow-sm shadow-indigo-950"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Test</span>
        </Link>
      </div>
    </header>
  );
}

export default Header;
