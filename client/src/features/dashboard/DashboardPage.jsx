import { Link } from 'react-router-dom';
import { Server, Play, Clock, ArrowRight, ShieldCheck } from 'lucide-react';
import { DashboardShell } from '../../components/layout/DashboardShell.jsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';

export function DashboardPage() {
  const statCards = [
    {
      label: 'Saved Targets',
      value: '0',
      change: 'No targets created',
      icon: Server,
    },
    {
      label: 'Total Test Runs',
      value: '0',
      change: 'Ready for initial run',
      icon: Play,
    },
    {
      label: 'Avg Response Time',
      value: '—',
      change: 'Awaiting metrics',
      icon: Clock,
    },
    {
      label: 'System Status',
      value: 'Operational',
      change: 'k6 Worker Ready',
      icon: ShieldCheck,
      isStatus: true,
    },
  ];

  return (
    <DashboardShell
      title="Performance Overview"
      subtitle="Monitor live execution, inspect historical runs, and analyze API latency"
    >
      <div className="space-y-6">
        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <Card key={idx}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-400">{stat.label}</span>
                    <div className="h-8 w-8 rounded-lg bg-indigo-950/60 border border-indigo-800/40 flex items-center justify-center text-indigo-400">
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-2 text-2xl font-bold text-white tracking-tight">
                    {stat.isStatus ? (
                      <span className="text-emerald-400 text-lg flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                        {stat.value}
                      </span>
                    ) : (
                      stat.value
                    )}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">{stat.change}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Launch & Empty State */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Runs Panel */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle>Recent Load Tests</CardTitle>
                  <CardDescription>Execution runs and recent benchmark summaries</CardDescription>
                </div>
                <Link to="/history" className="text-xs text-indigo-400 hover:text-indigo-300 font-medium">
                  View All
                </Link>
              </CardHeader>
              <CardContent className="p-8 text-center">
                <div className="max-w-md mx-auto space-y-3">
                  <div className="h-12 w-12 rounded-xl bg-slate-800/50 border border-slate-700/60 flex items-center justify-center mx-auto text-slate-400">
                    <Play className="h-6 w-6" />
                  </div>
                  <h4 className="text-sm font-semibold text-white">No load tests executed yet</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Configure an authorized target or launch a benchmark against the built-in Demo API
                    to see latency distributions and throughput charts.
                  </p>
                  <div className="pt-2 flex items-center justify-center gap-3">
                    <Button to="/tests" size="sm" rightIcon={<ArrowRight className="h-3.5 w-3.5" />}>
                      Configure First Test
                    </Button>
                    <Button to="/demo" variant="secondary" size="sm">
                      View Demo Sandbox
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Setup Guide */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Quick Start Guide</CardTitle>
                <CardDescription>Follow these steps to conduct your first load test</CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/40">
                  <div className="flex items-center gap-2 font-medium text-xs text-white">
                    <span className="h-5 w-5 rounded-full bg-indigo-600/20 text-indigo-400 flex items-center justify-center text-[10px] font-bold">1</span>
                    <span>Register Target API</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 pl-7">
                    Add base endpoint with pre-flight SSRF check.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/40">
                  <div className="flex items-center gap-2 font-medium text-xs text-white">
                    <span className="h-5 w-5 rounded-full bg-indigo-600/20 text-indigo-400 flex items-center justify-center text-[10px] font-bold">2</span>
                    <span>Define Workload</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 pl-7">
                    Select virtual users and test duration.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/40">
                  <div className="flex items-center gap-2 font-medium text-xs text-white">
                    <span className="h-5 w-5 rounded-full bg-indigo-600/20 text-indigo-400 flex items-center justify-center text-[10px] font-bold">3</span>
                    <span>Analyze k6 Metrics</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 pl-7">
                    Evaluate latency percentiles and error rates.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

export default DashboardPage;
