import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Server, Play, Clock, ArrowRight, ShieldCheck, BarChart2, Activity } from 'lucide-react';
import { DashboardShell } from '../../components/layout/DashboardShell.jsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import PerformanceTrendsChart from '../../components/charts/PerformanceTrendsChart.jsx';
import resultService from '../../services/resultService.js';

export function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [trendsData, setTrendsData] = useState([]);

  useEffect(() => {
    Promise.all([
      resultService.getDashboardSummary(),
      resultService.getPerformanceTrends(),
    ])
      .then(([summaryData, trendsRes]) => {
        if (summaryData) setSummary(summaryData);
        if (trendsRes?.trends) setTrendsData(trendsRes.trends);
      })
      .catch(() => {});
  }, []);

  const overview = summary?.overview || {
    savedTargets: 0,
    totalTestRuns: 0,
    completedRuns: 0,
    activeRuns: 0,
    avgResponseTime: null,
  };

  const recentRuns = summary?.recentRuns || [];

  const statCards = [
    {
      label: 'Saved Targets',
      value: String(overview.savedTargets),
      change: `${overview.savedTargets} active APIs configured`,
      icon: Server,
    },
    {
      label: 'Total Test Runs',
      value: String(overview.totalTestRuns),
      change: `${overview.completedRuns} completed, ${overview.activeRuns} active`,
      icon: Play,
    },
    {
      label: 'Avg Response Time',
      value: overview.avgResponseTime !== null ? `${overview.avgResponseTime}ms` : '—',
      change: overview.avgResponseTime !== null ? 'Across completed test runs' : 'Awaiting metrics',
      icon: Clock,
    },
    {
      label: 'Engine Status',
      value: 'Operational',
      change: overview.activeRuns > 0 ? `${overview.activeRuns} k6 worker(s) active` : 'k6 Engine Ready',
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

        {/* Performance Trends Over Time */}
        {trendsData.length > 1 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-indigo-400" />
                  <span>Historical Performance Trends</span>
                </CardTitle>
                <CardDescription>
                  Throughput (req/s) and latency (Avg &amp; p95) trajectory across recent benchmark runs
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 font-mono text-xs text-slate-400">
                <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700/80">
                  {trendsData.length} runs analyzed
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <PerformanceTrendsChart data={trendsData} />
            </CardContent>
          </Card>
        )}

        {/* Quick Launch & Recent Runs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Runs Panel */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle>Recent Load Tests</CardTitle>
                  <CardDescription>Execution runs and recent benchmark summaries</CardDescription>
                </div>
                <Link to="/tests" className="text-xs text-indigo-400 hover:text-indigo-300 font-medium">
                  View All
                </Link>
              </CardHeader>
              <CardContent className="p-4">
                {recentRuns.length > 0 ? (
                  <div className="divide-y divide-slate-800/80">
                    {recentRuns.map((run) => (
                      <div
                        key={run._id || run.id}
                        className="py-3 flex items-center justify-between gap-4 text-xs"
                      >
                        <div className="space-y-1 truncate">
                          <div className="flex items-center gap-2">
                            <Badge status={run.status} dot />
                            <span className="font-semibold text-white truncate">{run.name}</span>
                          </div>
                          <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
                            <span className="text-indigo-300 font-bold">{run.configuration?.method || 'GET'}</span>
                            <span className="truncate">{run.configuration?.endpoint || '/'}</span>
                            <span className="text-slate-600">•</span>
                            <span>{run.configuration?.vus || 1} VUs</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          {run.metrics && typeof run.metrics.avgLatency === 'number' && (
                            <div className="text-right font-mono hidden sm:block">
                              <span className="text-white font-bold">{run.metrics.avgLatency}ms</span>
                              <span className="text-slate-500 block text-[10px]">{run.metrics.requestsPerSecond} req/s</span>
                            </div>
                          )}
                          <Button
                            variant="secondary"
                            size="sm"
                            to={`/results/${run._id || run.id}`}
                            leftIcon={<BarChart2 className="h-3 w-3 text-indigo-400" />}
                            className="text-xs py-1"
                          >
                            Results
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="h-12 w-12 rounded-xl bg-slate-800/50 border border-slate-700/60 flex items-center justify-center mx-auto text-slate-400">
                        <Play className="h-6 w-6" />
                      </div>
                      <h4 className="text-sm font-semibold text-white">No load tests executed yet</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Configure an authorized target or launch a benchmark against the built-in Demo API
                        to inspect latency distributions and throughput charts.
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
                  </div>
                )}
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
                    Select virtual users, duration, and thresholds.
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
