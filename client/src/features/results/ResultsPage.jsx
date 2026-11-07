import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  RotateCw,
  Zap,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Layers,
  Shield,
  Activity,
  Terminal,
  Server,
  Play,
  Download,
  FileCode,
  FileText,
  ArrowLeftRight,
} from 'lucide-react';
import { DashboardShell } from '../../components/layout/DashboardShell.jsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Alert } from '../../components/ui/Alert.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import LatencyDistributionChart from '../../components/charts/LatencyDistributionChart.jsx';
import StatusCodePieChart from '../../components/charts/StatusCodePieChart.jsx';
import ThroughputTimelineChart from '../../components/charts/ThroughputTimelineChart.jsx';
import resultService from '../../services/resultService.js';
import testService from '../../services/testService.js';

export function ResultsPage() {
  const { runId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRerunning, setIsRerunning] = useState(false);
  const [showRawMetrics, setShowRawMetrics] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportNotice, setExportNotice] = useState(null);

  const pollingRef = useRef(null);

  const handleExport = async (format) => {
    setIsExporting(true);
    setExportNotice(null);
    try {
      await resultService.exportResult(runId, format);
      setExportNotice(`Successfully exported test report in ${format.toUpperCase()} format.`);
      setTimeout(() => setExportNotice(null), 4000);
    } catch (err) {
      setError(`Failed to export result: ${err?.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const fetchResult = useCallback(async (isPolling = false) => {
    if (!isPolling) setIsLoading(true);
    try {
      const res = await resultService.getResultByRunId(runId);
      setData(res);
      setError(null);
    } catch (err) {
      if (!isPolling) {
        setError(err?.message || 'Failed to retrieve test run results.');
      }
    } finally {
      if (!isPolling) setIsLoading(false);
    }
  }, [runId]);

  useEffect(() => {
    fetchResult();
  }, [fetchResult]);

  // Set up polling if test run is actively queued or running
  useEffect(() => {
    const isLive = data?.testRun?.status && ['queued', 'running'].includes(data.testRun.status);

    if (isLive) {
      pollingRef.current = setInterval(() => {
        fetchResult(true);
      }, 2500);
    } else {
      if (pollingRef.current) clearInterval(pollingRef.current);
    }

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [data, fetchResult]);

  const handleRerun = async () => {
    if (!data?.configuration || !data?.target) return;
    setIsRerunning(true);
    try {
      const targetId = data.target._id || data.target.id;
      const newRun = await testService.createTestRun({
        name: `${data.testRun.name} (Rerun)`,
        targetId,
        method: data.configuration.method,
        endpoint: data.configuration.endpoint,
        headers: data.configuration.headers,
        body: data.configuration.body,
        vus: data.configuration.vus,
        duration: data.configuration.duration,
        rampUpDuration: data.configuration.rampUpDuration,
        thresholds: data.configuration.thresholds,
      });

      // Launch k6 execution immediately for the new run
      await testService.startTestRun(newRun._id);
      navigate(`/results/${newRun._id}`);
    } catch (err) {
      setError(`Failed to trigger re-run: ${err?.message}`);
    } finally {
      setIsRerunning(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardShell
        title="Load Test Results & Metrics"
        subtitle="Analyzing synthetic traffic execution data"
      >
        <div className="space-y-6">
          <Skeleton className="h-28 w-full rounded-xl" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-72 rounded-xl" />
            <Skeleton className="h-72 rounded-xl" />
          </div>
        </div>
      </DashboardShell>
    );
  }

  if (error || !data) {
    return (
      <DashboardShell
        title="Load Test Results"
        subtitle="Result inspection and diagnostics"
      >
        <div className="space-y-4">
          <Alert variant="danger">{error || 'Test run results could not be located.'}</Alert>
          <Button variant="outline" size="sm" to="/tests" leftIcon={<ArrowLeft className="h-4 w-4" />}>
            Back to Load Tests
          </Button>
        </div>
      </DashboardShell>
    );
  }

  const { testRun, target, configuration, metrics, charts, thresholds } = data;
  const isRunning = testRun.status === 'running';
  const isQueued = testRun.status === 'queued';
  const isCompleted = testRun.status === 'completed';
  const isCancelled = testRun.status === 'cancelled';
  const isFailed = testRun.status === 'failed';

  const fullTargetUrl = `${configuration?.targetSnapshot?.baseUrl || target?.baseUrl || ''}${configuration?.endpoint || ''}`;

  return (
    <DashboardShell
      title={testRun.name}
      subtitle={`Comprehensive performance metrics and execution diagnostics for ${target?.name || 'Target API'}`}
    >
      <div className="space-y-6">
        {/* Navigation & Controls Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              to="/tests"
              leftIcon={<ArrowLeft className="h-3.5 w-3.5" />}
            >
              Back to Tests
            </Button>
            <div className="flex items-center gap-2">
              <Badge status={testRun.status} dot />
              {testRun.isSimulated ? (
                <span className="text-[10px] font-mono uppercase bg-amber-950/70 text-amber-300 border border-amber-800/60 rounded px-2 py-0.5">
                  Stage 6 Simulation
                </span>
              ) : isCompleted ? (
                <span className="text-[10px] font-mono uppercase bg-emerald-950/70 text-emerald-300 border border-emerald-800/60 rounded px-2 py-0.5">
                  Real k6 Engine
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isCompleted && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  to={`/compare?baseRunId=${runId}`}
                  leftIcon={<ArrowLeftRight className="h-3.5 w-3.5" />}
                >
                  Compare
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport('csv')}
                  disabled={isExporting}
                  leftIcon={<Download className="h-3.5 w-3.5" />}
                  title="Export results as CSV"
                >
                  CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport('json')}
                  disabled={isExporting}
                  leftIcon={<FileCode className="h-3.5 w-3.5" />}
                  title="Export results as JSON"
                >
                  JSON
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport('html')}
                  disabled={isExporting}
                  leftIcon={<FileText className="h-3.5 w-3.5" />}
                  title="Export results as self-contained HTML report"
                >
                  HTML
                </Button>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchResult()}
              leftIcon={<RotateCw className="h-3.5 w-3.5" />}
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleRerun}
              isLoading={isRerunning}
              leftIcon={<Play className="h-3.5 w-3.5" />}
            >
              Re-run Test
            </Button>
          </div>
        </div>

        {exportNotice && (
          <Alert variant="success" onClose={() => setExportNotice(null)}>
            {exportNotice}
          </Alert>
        )}

        {/* Live Execution Progress Banner */}
        {(isRunning || isQueued) && (
          <div className="p-4 rounded-xl border border-amber-800/60 bg-amber-950/30 text-amber-200 text-xs">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 font-semibold">
                <Zap className="h-4 w-4 text-amber-400 animate-pulse" />
                <span>{testRun.progress?.stage || 'Workload Executing'}</span>
                <span className="text-amber-400 font-mono">— {testRun.progress?.message}</span>
              </div>
              <span className="font-mono font-bold text-amber-300">{testRun.progress?.percent || 5}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
              <div
                className="h-full bg-amber-400 animate-pulse transition-all duration-300"
                style={{ width: `${testRun.progress?.percent || 10}%` }}
              />
            </div>
          </div>
        )}

        {/* Failure / Cancellation Diagnostic Alert */}
        {(isFailed || isCancelled) && testRun.error && (
          <div className="p-4 rounded-xl border border-rose-800/60 bg-rose-950/30 text-rose-200">
            <div className="flex items-start gap-3">
              <XCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-semibold text-sm text-white">
                  <span>Execution Aborted: {testRun.error.category}</span>
                </div>
                <p className="text-xs text-rose-300 leading-relaxed">
                  {testRun.error.message || 'The load-testing worker encountered an error.'}
                </p>
                <div className="pt-2 text-[11px] text-slate-400 font-mono">
                  Tip: Verify target endpoint availability, port bindings, and SSRF restrictions.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Header Metadata Overview Card */}
        <Card className="p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-2">
                <Server className="h-3.5 w-3.5 text-indigo-400" /> Target Endpoint Under Load
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-indigo-950/80 border border-indigo-700/60 text-indigo-300">
                  {configuration?.method || 'GET'}
                </span>
                <code className="text-sm font-mono text-white font-medium break-all">
                  {fullTargetUrl}
                </code>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
              <div className="px-3 py-1.5 rounded-lg bg-slate-950/70 border border-slate-800">
                <span className="text-slate-500">Virtual Users: </span>
                <span className="text-indigo-400 font-bold">{configuration?.vus} VUs</span>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-slate-950/70 border border-slate-800">
                <span className="text-slate-500">Duration: </span>
                <span className="text-indigo-400 font-bold">{configuration?.duration}s</span>
              </div>
              {configuration?.rampUpDuration > 0 && (
                <div className="px-3 py-1.5 rounded-lg bg-slate-950/70 border border-slate-800">
                  <span className="text-slate-500">Ramp Up: </span>
                  <span className="text-indigo-400 font-bold">{configuration.rampUpDuration}s</span>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Core Metric Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Card 1: Total Requests */}
          <Card className="p-3.5">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-mono font-semibold block">
              TOTAL REQUESTS
            </span>
            <div className="mt-1 text-xl font-bold font-mono text-white">
              {metrics?.totalRequests !== null && metrics?.totalRequests !== undefined
                ? metrics.totalRequests.toLocaleString()
                : '—'}
            </div>
            <div className="mt-1 text-[11px] text-emerald-400 font-mono">
              {metrics?.successfulRequests?.toLocaleString() || 0} success
            </div>
          </Card>

          {/* Card 2: Throughput */}
          <Card className="p-3.5">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-mono font-semibold block">
              THROUGHPUT
            </span>
            <div className="mt-1 text-xl font-bold font-mono text-indigo-400">
              {metrics?.requestsPerSecond !== null && metrics?.requestsPerSecond !== undefined
                ? `${metrics.requestsPerSecond}`
                : '—'}
            </div>
            <div className="mt-1 text-[11px] text-slate-400 font-mono">req / second</div>
          </Card>

          {/* Card 3: Avg Latency */}
          <Card className="p-3.5">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-mono font-semibold block">
              AVG LATENCY
            </span>
            <div className="mt-1 text-xl font-bold font-mono text-white">
              {metrics?.avgLatency !== null && metrics?.avgLatency !== undefined
                ? `${metrics.avgLatency}ms`
                : '—'}
            </div>
            <div className="mt-1 text-[11px] text-slate-400 font-mono">
              med: {metrics?.medianLatency !== null && metrics?.medianLatency !== undefined ? `${metrics.medianLatency}ms` : '—'}
            </div>
          </Card>

          {/* Card 4: p95 Latency */}
          <Card className="p-3.5">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-mono font-semibold block">
              P95 LATENCY
            </span>
            <div className="mt-1 text-xl font-bold font-mono text-amber-400">
              {metrics?.p95Latency !== null && metrics?.p95Latency !== undefined
                ? `${metrics.p95Latency}ms`
                : '—'}
            </div>
            <div className="mt-1 text-[11px] text-slate-400 font-mono">
              p90: {metrics?.p90Latency !== null && metrics?.p90Latency !== undefined ? `${metrics.p90Latency}ms` : '—'}
            </div>
          </Card>

          {/* Card 5: Failure Rate */}
          <Card className="p-3.5">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-mono font-semibold block">
              FAILURE RATE
            </span>
            <div
              className={`mt-1 text-xl font-bold font-mono ${
                metrics?.failureRate > 0 ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {metrics?.failureRate !== null && metrics?.failureRate !== undefined
                ? `${(metrics.failureRate * 100).toFixed(2)}%`
                : '—'}
            </div>
            <div className="mt-1 text-[11px] text-slate-400 font-mono">
              {metrics?.failedRequests || 0} failed reqs
            </div>
          </Card>

          {/* Card 6: Network Errors */}
          <Card className="p-3.5">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-mono font-semibold block">
              NETWORK ERRORS
            </span>
            <div
              className={`mt-1 text-xl font-bold font-mono ${
                metrics?.networkErrors > 0 ? 'text-rose-400' : 'text-slate-300'
              }`}
            >
              {metrics?.networkErrors ?? 0}
            </div>
            <div className="mt-1 text-[11px] text-slate-400 font-mono">Transport failures</div>
          </Card>
        </div>

        {/* Threshold Evaluation Check Panel */}
        {thresholds?.hasThresholds && (
          <Card className="p-4 border-indigo-900/40 bg-indigo-950/20">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-indigo-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                  Threshold SLA Validation
                </span>
              </div>
              <Badge variant={thresholds.allPassed ? 'success' : 'danger'}>
                {thresholds.allPassed ? 'All Thresholds Passed' : 'Threshold SLA Breached'}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {thresholds.rules.map((rule, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border flex items-center justify-between ${
                    rule.passed
                      ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-200'
                      : 'bg-rose-950/20 border-rose-800/40 text-rose-200'
                  }`}
                >
                  <div>
                    <span className="font-semibold block">{rule.metric}</span>
                    <span className="text-[11px] opacity-80">
                      Target: {rule.target} | Observed: {rule.actual}
                    </span>
                  </div>
                  {rule.passed ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-rose-400" />
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Visual Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Latency Distribution */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4 text-indigo-400" /> Response Time Percentiles Breakdown
              </CardTitle>
              <CardDescription className="text-xs">
                Min, Median, Average, p90, p95, and Maximum latency percentiles in milliseconds
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LatencyDistributionChart data={charts?.percentiles} />
            </CardContent>
          </Card>

          {/* Chart 2: Status Code Distribution */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Layers className="h-4 w-4 text-emerald-400" /> HTTP Status & Response Health
              </CardTitle>
              <CardDescription className="text-xs">
                Breakdown of successful 2xx responses versus 4xx/5xx HTTP error statuses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StatusCodePieChart data={charts?.statusCodes} />
            </CardContent>
          </Card>

          {/* Chart 3: Execution Timeline & Virtual Users */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4 text-indigo-400" /> Workload Throughput & Concurrency Timeline
              </CardTitle>
              <CardDescription className="text-xs">
                Throughput (req/s) and Virtual User (VU) progression curve over the test duration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ThroughputTimelineChart data={charts?.timeline} />
            </CardContent>
          </Card>
        </div>

        {/* Detailed Configuration & Diagnostics Drawer */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <Terminal className="h-4 w-4 text-indigo-400" /> Execution Metadata & Raw Configuration
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowRawMetrics((prev) => !prev)}
              className="text-xs text-indigo-400 hover:text-indigo-300"
            >
              {showRawMetrics ? 'Hide Raw JSON' : 'View Raw Summary JSON'}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <span className="text-slate-500 block text-[10px]">TIMESTAMPS</span>
              <div className="text-slate-300 mt-1">
                <div>Started: {testRun.startTime ? new Date(testRun.startTime).toLocaleTimeString() : '—'}</div>
                <div>Ended: {testRun.endTime ? new Date(testRun.endTime).toLocaleTimeString() : '—'}</div>
                <div>Actual Runtime: {testRun.actualDurationMs ? `${(testRun.actualDurationMs / 1000).toFixed(2)}s` : '—'}</div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <span className="text-slate-500 block text-[10px]">REQUEST HEADERS</span>
              <div className="text-slate-300 mt-1 truncate">
                {configuration?.headers && Object.keys(configuration.headers).length > 0 ? (
                  Object.entries(configuration.headers).map(([k, v]) => (
                    <div key={k} className="truncate">
                      <span className="text-indigo-400">{k}:</span> {v}
                    </div>
                  ))
                ) : (
                  <span className="text-slate-500">No custom headers configured</span>
                )}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <span className="text-slate-500 block text-[10px]">REQUEST BODY</span>
              <div className="text-slate-300 mt-1 max-h-16 overflow-y-auto">
                {configuration?.body ? (
                  <pre className="text-[11px]">{configuration.body}</pre>
                ) : (
                  <span className="text-slate-500">None (Empty payload)</span>
                )}
              </div>
            </div>
          </div>

          {/* Raw JSON metrics inspector */}
          {showRawMetrics && (
            <div className="mt-4 pt-4 border-t border-slate-800">
              <pre className="p-3 rounded-lg bg-slate-950 font-mono text-[11px] text-slate-300 overflow-x-auto max-h-80">
                {JSON.stringify(metrics, null, 2)}
              </pre>
            </div>
          )}
        </Card>
      </div>
    </DashboardShell>
  );
}

export default ResultsPage;
