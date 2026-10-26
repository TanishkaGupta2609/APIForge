import { NavLink } from 'react-router-dom';
import {
  Activity,
  Server,
  Play,
  History,
  FlaskConical,
  Shield,
  Layers,
} from 'lucide-react';

export function Sidebar() {
  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: Activity },
    { name: 'Target APIs', path: '/targets', icon: Server },
    { name: 'Run Load Test', path: '/tests', icon: Play },
    { name: 'Test History', path: '/history', icon: History },
    { name: 'Demo API Sandbox', path: '/demo', icon: FlaskConical },
  ];

  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-950 flex flex-col justify-between shrink-0 h-[calc(100vh-4rem)] sticky top-16 select-none hidden md:flex">
      {/* Primary Navigation */}
      <div className="p-4 space-y-6">
        <div>
          <div className="px-3 mb-2 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
            Platform Navigation
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition ${
                      isActive
                        ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                    }`
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div>
          <div className="px-3 mb-2 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
            Engine & Security
          </div>
          <div className="space-y-2 px-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-2">
                <Layers className="h-3.5 w-3.5 text-indigo-400" />
                <span>Engine</span>
              </span>
              <span className="text-[11px] font-mono text-indigo-300">k6 CLI</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-2">
                <Shield className="h-3.5 w-3.5 text-emerald-400" />
                <span>SSRF Protection</span>
              </span>
              <span className="text-[10px] uppercase font-bold text-emerald-400">Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-900/30">
        <div className="rounded-lg border border-slate-800/90 bg-slate-900/60 p-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-slate-200">APIForge v1.0.0</span>
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <p className="text-[11px] text-slate-400 leading-tight">
            5th-Semester Capstone Project. Controlled load testing & metrics.
          </p>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
