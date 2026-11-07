import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
  RotateCw,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { DashboardShell } from '../../components/layout/DashboardShell.jsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Alert } from '../../components/ui/Alert.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import resultService from '../../services/resultService.js';
import historyService from '../../services/historyService.js';

export function ComparePage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const baseParam = searchParams.get('baseRunId') || '';
  const compareParam = searchParams.get('compareRunId') || '';

  const [availableRuns, setAvailableRuns] = useState([]);
  const [baseRunId, setBaseRunId] = useState(baseParam);
  const [compareRunId, setCompareRunId] = useState(compareParam);
  const [comparison, setComparison] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRunsLoading, setIsRunsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load user's completed test runs for selection dropdowns
  useEffect(() => {
    async function loadCompletedRuns() {
      setIsRunsLoading(true);
      try {
        const res = await historyService.getTestHistory({
          status: 'completed',
          limit: 50,
          sortBy: 'createdAt',
          sortOrder: 'desc',
        });
        const runs = res?.testRuns || [];
        setAvailableRuns(runs);

        // If no URL params are provided but runs are available, default to the top two
        if (!baseParam && runs.length > 0) {
          setBaseRunId(runs[0]._id || runs[0].id);
        }
        if (!compareParam && runs.length > 1) {
          setCompareRunId(runs[1]._id || runs[1].id);
        }
      } catch (err) {
        console.error('Failed to load completed runs for comparison:', err);
      } finally {
        setIsRunsLoading(false);
      }
    }
    loadCompletedRuns();
  }, [baseParam, compareParam]);

  // Execute comparison calculation
  const executeComparison = useCallback(async (baseId, compId) => {
    if (!baseId || !compId) return;
    if (baseId === compId) {
      setError('Baseline and comparison runs cannot be the same test execution.');
      setComparison(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await resultService.compareRuns(baseId, compId);
      setComparison(data);
    } catch (err) {
      setError(
        err?.response?.data?.error?.message ||
          err?.message ||
          'Failed to calculate test comparison'
      );
      setComparison(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Trigger comparison when baseRunId or compareRunId changes and both are present
  useEffect(() => {
    if (baseRunId && compareRunId && baseRunId !== compareRunId) {
      setSearchParams({ baseRunId, compareRunId });
      executeComparison(baseRunId, compareRunId);
    }
  }, [baseRunId, compareRunId, executeComparison, setSearchParams]);

  // Swap baseline and comparison runs
  const handleSwap = () => {
    const temp = baseRunId;
    setBaseRunId(compareRunId);
    setCompareRunId(temp);
  };

  // Prepare chart data comparing percentiles between base and compare
  const getPercentilesChartData = () => {
    if (!comparison) return [];
    const b = comparison.baseRun?.metrics || {};
    const c = comparison.compareRun?.metrics || {};

    return [
      { metric: 'Min', Baseline: b.minLatency ?? 0, Comparison: c.minLatency ?? 0 },
      { metric: 'Median', Baseline: b.medianLatency ?? 0, Comparison: c.medianLatency ?? 0 },
      { metric: 'Avg', Baseline: b.avgLatency ?? 0, Comparison: c.avgLatency ?? 0 },
      { metric: 'p90', Baseline: b.p90Latency ?? 0, Comparison: c.p90Latency ?? 0 },
      { metric: 'p95', Baseline: b.p95Latency ?? 0, Comparison: c.p95Latency ?? 0 },
      { metric: 'Max', Baseline: b.maxLatency ?? 0, Comparison: c.maxLatency ?? 0 },
    ];
  };

  // Render Delta Pill
  const renderDeltaPill = (delta, unit = '') => {
    if (!delta || delta.diff == null) {
      return <span className="text-slate-500 font-mono text-xs">—</span>;
    }

    if (delta.diff === 0) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded border border-slate-700/60">
          <Minus className="h-3 w-3" /> 0.0{unit} (0%)
        </span>
      );
    }

    const isGood = delta.isImprovement === true;
    const isBad = delta.isImprovement === false;

    const bgClass = isGood
      ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
      : isBad
      ? 'bg-rose-950/60 text-rose-300 border-rose-800/60'
      : 'bg-slate-800/60 text-slate-300 border-slate-700/60';

    const Icon = isGood ? TrendingUp : TrendingDown;
    const sign = delta.diff > 0 ? '+' : '';

    return (
      <span className={`inline-flex items-center gap-1 text-[11px] font-mono font-semibold px-2 py-0.5 rounded border ${bgClass}`}>
        <Icon className="h-3 w-3 shrink-0" />
        {sign}{delta.diff}{unit} ({sign}{delta.percentChange}%)
      </span>
    );
  };

  return (
    <DashboardShell
      title="Test Run Comparison"
      subtitle="Compare performance percentiles, throughput, and error rates side-by-side across execution runs"
    >
      <div className="space-y-6">
        {/* Navigation / Action Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <Button
            variant="outline"
            size="sm"
            to="/history"
            leftIcon={<ArrowLeft className="h-3.5 w-3.5" />}
          >
            Back to History
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => executeComparison(baseRunId, compareRunId)}
            disabled={isLoading || !baseRunId || !compareRunId}
            leftIcon={<RotateCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
          >
            Recalculate
          </Button>
        </div>

        {error && (
          <Alert variant="danger" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Test Run Selectors Card */}
        <Card className="bg-slate-900/70 border-slate-800">
          <CardContent className="p-4 sm:p-5">
            <div className="grid grid-cols-1 lg:grid-cols-11 gap-3 items-center">
              {/* Baseline Run Selector */}
              <div className="lg:col-span-5 space-y-1.5">
                <label className="text-xs font-semibold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-indigo-500" /> Baseline Test Run
                </label>
                <select
                  value={baseRunId}
                  onChange={(e) => setBaseRunId(e.target.value)}
                  disabled={isRunsLoading}
                  className="w-full px-3 py-2 text-xs bg-slate-950/90 border border-slate-700/80 rounded-lg text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 truncate"
                >
                  <option value="">Select baseline execution...</option>
                  {availableRuns.map((r) => (
                    <option key={r._id || r.id} value={r._id || r.id}>
                      {r.name} ({r.configuration?.vus || '—'} VUs · {new Date(r.createdAt).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              </div>

              {/* Swap Button */}
              <div className="lg:col-span-1 flex justify-center pt-3 lg:pt-5">
                <button
                  type="button"
                  onClick={handleSwap}
                  title="Swap baseline and comparison"
                  className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                >
                  <ArrowLeftRight className="h-4 w-4" />
                </button>
              </div>

              {/* Comparison Run Selector */}
              <div className="lg:col-span-5 space-y-1.5">
                <label className="text-xs font-semibold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" /> Comparison Test Run
                </label>
                <select
                  value={compareRunId}
                  onChange={(e) => setCompareRunId(e.target.value)}
                  disabled={isRunsLoading}
                  className="w-full px-3 py-2 text-xs bg-slate-950/90 border border-slate-700/80 rounded-lg text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 truncate"
                >
                  <option value="">Select comparison execution...</option>
                  {availableRuns.map((r) => (
                    <option key={r._id || r.id} value={r._id || r.id}>
                      {r.name} ({r.configuration?.vus || '—'} VUs · {new Date(r.createdAt).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loading state */}
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full rounded-xl bg-slate-800/60" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-44 rounded-xl bg-slate-800/40" />
              <Skeleton className="h-44 rounded-xl bg-slate-800/40" />
            </div>
            <Skeleton className="h-80 w-full rounded-xl bg-slate-800/40" />
          </div>
        ) : !comparison ? (
          <Card className="bg-slate-900/50 border-slate-800 text-center p-12">
            <div className="max-w-md mx-auto space-y-3">
              <div className="h-12 w-12 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center mx-auto text-slate-400">
                <ArrowLeftRight className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-semibold text-white">Select two test runs to compare</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Choose a baseline run and a comparison run from the selectors above to evaluate
                throughput differences, latency regressions, and failure rates.
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Compatibility and Summary Banner */}
            <Card className="bg-slate-900/80 border-slate-800">
              <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-400">Compatibility Rating:</span>
                    <span
                      className={`text-[11px] font-mono uppercase font-bold px-2 py-0.5 rounded border ${
                        comparison.compatibility?.rating === 'HIGH'
                          ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80'
                          : comparison.compatibility?.rating === 'MODERATE'
                          ? 'bg-amber-950/80 text-amber-300 border-amber-800/80'
                          : 'bg-rose-950/80 text-rose-300 border-rose-800/80'
                      }`}
                    >
                      {comparison.compatibility?.rating} Compatibility
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 font-medium">
                    {comparison.summary}
                  </p>
                  {comparison.compatibility?.notes?.length > 0 && (
                    <p className="text-[11px] text-slate-400">
                      {comparison.compatibility.notes.join(' ')}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    to={`/results/${comparison.baseRun?.id}`}
                    className="text-xs"
                  >
                    View Baseline Result
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    to={`/results/${comparison.compareRun?.id}`}
                    className="text-xs"
                  >
                    View Comparison Result
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Side-by-Side Configuration Profiles */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Baseline Profile */}
              <Card className="bg-slate-900/60 border-slate-800">
                <CardHeader className="pb-3 border-b border-slate-800">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm text-indigo-300 flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-indigo-500" />
                      Baseline: {comparison.baseRun?.name}
                    </CardTitle>
                    <Badge status={comparison.baseRun?.status} size="sm" />
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Target URL:</span>
                    <span className="text-slate-200 font-mono truncate max-w-[220px]">
                      {comparison.baseRun?.target?.baseUrl || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Endpoint:</span>
                    <span className="text-slate-200 font-mono">
                      <strong className="text-indigo-400 mr-1">
                        {comparison.baseRun?.configuration?.method || 'GET'}
                      </strong>
                      {comparison.baseRun?.configuration?.endpoint || '/'}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Workload:</span>
                    <span className="text-slate-200 font-mono">
                      {comparison.baseRun?.configuration?.vus} VUs · {comparison.baseRun?.configuration?.duration}s duration
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Executed:</span>
                    <span className="text-slate-300">
                      {new Date(comparison.baseRun?.createdAt).toLocaleString()}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Comparison Profile */}
              <Card className="bg-slate-900/60 border-slate-800">
                <CardHeader className="pb-3 border-b border-slate-800">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm text-emerald-300 flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      Comparison: {comparison.compareRun?.name}
                    </CardTitle>
                    <Badge status={comparison.compareRun?.status} size="sm" />
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Target URL:</span>
                    <span className="text-slate-200 font-mono truncate max-w-[220px]">
                      {comparison.compareRun?.target?.baseUrl || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Endpoint:</span>
                    <span className="text-slate-200 font-mono">
                      <strong className="text-emerald-400 mr-1">
                        {comparison.compareRun?.configuration?.method || 'GET'}
                      </strong>
                      {comparison.compareRun?.configuration?.endpoint || '/'}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Workload:</span>
                    <span className="text-slate-200 font-mono">
                      {comparison.compareRun?.configuration?.vus} VUs · {comparison.compareRun?.configuration?.duration}s duration
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Executed:</span>
                    <span className="text-slate-300">
                      {new Date(comparison.compareRun?.createdAt).toLocaleString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Performance Delta Metric Cards Grid */}
            <div>
              <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider mb-3">
                Key Performance Deltas
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Average Latency */}
                <Card className="bg-slate-900/70 border-slate-800">
                  <CardContent className="p-4 space-y-2">
                    <p className="text-xs text-slate-400 font-medium">Average Response Time</p>
                    <div className="flex items-baseline justify-between">
                      <span className="text-base font-bold text-white font-mono">
                        {comparison.deltas?.avgLatency?.compare != null
                          ? `${comparison.deltas.avgLatency.compare}ms`
                          : '—'}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        Base: {comparison.deltas?.avgLatency?.base ?? '—'}ms
                      </span>
                    </div>
                    <div>{renderDeltaPill(comparison.deltas?.avgLatency, 'ms')}</div>
                  </CardContent>
                </Card>

                {/* 95th Percentile Latency */}
                <Card className="bg-slate-900/70 border-slate-800">
                  <CardContent className="p-4 space-y-2">
                    <p className="text-xs text-slate-400 font-medium">95th Percentile (p95)</p>
                    <div className="flex items-baseline justify-between">
                      <span className="text-base font-bold text-white font-mono">
                        {comparison.deltas?.p95Latency?.compare != null
                          ? `${comparison.deltas.p95Latency.compare}ms`
                          : '—'}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        Base: {comparison.deltas?.p95Latency?.base ?? '—'}ms
                      </span>
                    </div>
                    <div>{renderDeltaPill(comparison.deltas?.p95Latency, 'ms')}</div>
                  </CardContent>
                </Card>

                {/* Throughput (RPS) */}
                <Card className="bg-slate-900/70 border-slate-800">
                  <CardContent className="p-4 space-y-2">
                    <p className="text-xs text-slate-400 font-medium">Requests Per Second</p>
                    <div className="flex items-baseline justify-between">
                      <span className="text-base font-bold text-white font-mono">
                        {comparison.deltas?.requestsPerSecond?.compare != null
                          ? `${comparison.deltas.requestsPerSecond.compare} req/s`
                          : '—'}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        Base: {comparison.deltas?.requestsPerSecond?.base ?? '—'}
                      </span>
                    </div>
                    <div>{renderDeltaPill(comparison.deltas?.requestsPerSecond, ' req/s')}</div>
                  </CardContent>
                </Card>

                {/* Failure Rate */}
                <Card className="bg-slate-900/70 border-slate-800">
                  <CardContent className="p-4 space-y-2">
                    <p className="text-xs text-slate-400 font-medium">Error / Failure Rate</p>
                    <div className="flex items-baseline justify-between">
                      <span className="text-base font-bold text-white font-mono">
                        {comparison.deltas?.failureRate?.compare != null
                          ? `${(comparison.deltas.failureRate.compare * 100).toFixed(2)}%`
                          : '0.00%'}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        Base: {comparison.deltas?.failureRate?.base != null
                          ? `${(comparison.deltas.failureRate.base * 100).toFixed(2)}%`
                          : '0%'}
                      </span>
                    </div>
                    <div>{renderDeltaPill(comparison.deltas?.failureRate, '%')}</div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Visual Bar Chart Comparison */}
            <Card className="bg-slate-900/60 border-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-100 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-indigo-400" /> Latency Percentiles Comparison
                </CardTitle>
                <CardDescription className="text-xs">
                  Side-by-side comparison across Min, Median, Average, p90, p95, and Max response times (ms)
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={getPercentilesChartData()}
                      margin={{ top: 20, right: 30, left: 10, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                      <XAxis dataKey="metric" stroke="#94A3B8" fontSize={11} tickLine={false} />
                      <YAxis
                        stroke="#94A3B8"
                        fontSize={11}
                        tickLine={false}
                        unit="ms"
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0F172A',
                          borderColor: '#334155',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                      <Bar dataKey="Baseline" fill="#6366F1" radius={[4, 4, 0, 0]} name={comparison.baseRun?.name || 'Baseline'} />
                      <Bar dataKey="Comparison" fill="#10B981" radius={[4, 4, 0, 0]} name={comparison.compareRun?.name || 'Comparison'} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

export default ComparePage;
