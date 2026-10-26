import { useState, useEffect } from 'react';

export default function App() {
  const [serverStatus, setServerStatus] = useState('checking');
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    fetch(`${apiUrl}/health`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.success) {
          setServerStatus('online');
        } else {
          setServerStatus('offline');
        }
      })
      .catch(() => {
        setServerStatus('offline');
      });
  }, [apiUrl]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/30">
            ⚡
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">APIForge</h1>
            <p className="text-xs text-slate-400">API Load-Testing & Performance Platform</p>
          </div>
        </div>
        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-400">Server Status:</span>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium ${
              serverStatus === 'online'
                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                : serverStatus === 'checking'
                ? 'bg-amber-950 text-amber-400 border border-amber-800'
                : 'bg-rose-950 text-rose-400 border border-rose-800'
            }`}
          >
            ● {serverStatus.toUpperCase()}
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 flex-1 flex flex-col items-center justify-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-indigo-950/60 text-indigo-400 border border-indigo-800/60 mb-6">
          <span>Stage 0 Verified</span>
          <span>•</span>
          <span>Workspace Initialized</span>
        </div>
        <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl text-white">
          Real Load Testing.
          <span className="block text-indigo-500 mt-1">Accurate Developer Metrics.</span>
        </h2>
        <p className="mt-4 max-w-2xl text-base text-slate-400">
          APIForge helps engineering teams validate API scalability under realistic workloads
          powered by real k6 execution, automated metric normalization, and deep performance analysis.
        </p>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full text-left">
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40">
            <div className="text-indigo-400 font-semibold mb-1">k6 Engine</div>
            <p className="text-xs text-slate-400">Real process worker executing controlled load scripts without fabricated metrics.</p>
          </div>
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40">
            <div className="text-indigo-400 font-semibold mb-1">MERN Stack</div>
            <p className="text-xs text-slate-400">Modular monolith architecture with MongoDB, Express, React, and Node.js.</p>
          </div>
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40">
            <div className="text-indigo-400 font-semibold mb-1">Secure & Isolated</div>
            <p className="text-xs text-slate-400">Strict SSRF guardrails, rate limiting, token authentication, and demo API sandbox.</p>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        APIForge — 5th Semester Computer Science Capstone Project
      </footer>
    </div>
  );
}
