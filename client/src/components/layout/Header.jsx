import { Link } from 'react-router-dom';
import { Database, Server, Plus } from 'lucide-react';

export function Header({
  title = 'Dashboard',
  subtitle = 'Overview of API test targets and load performance metrics',
  serverStatus = 'online',
  databaseStatus = 'connected',
}) {
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
