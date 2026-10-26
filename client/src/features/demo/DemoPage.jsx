import { useState, useEffect } from 'react';
import {
  FlaskConical,
  Play,
  Clock,
  AlertTriangle,
  Zap,
  RotateCw,
  PlusCircle,
} from 'lucide-react';

import { DashboardShell } from '../../components/layout/DashboardShell.jsx';
import { Card, CardContent } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import demoService from '../../services/demoService.js';

export function DemoPage() {
  const [sandboxStatus, setSandboxStatus] = useState('checking');
  const [sandboxLatency, setSandboxLatency] = useState(null);

  // Ping Scenario State
  const [pingResult, setPingResult] = useState(null);
  const [isPinging, setIsPinging] = useState(false);

  // Delayed Scenario State
  const [delayMs, setDelayMs] = useState(250);
  const [delayResult, setDelayResult] = useState(null);
  const [isDelaying, setIsDelaying] = useState(false);

  // Error Scenario State
  const [errorStatus, setErrorStatus] = useState(500);
  const [errorRate, setErrorRate] = useState(1.0);
  const [errorResult, setErrorResult] = useState(null);
  const [isErroring, setIsErroring] = useState(false);

  // Rate Limiting Scenario State
  const [rateLimit, setRateLimit] = useState(5);
  const [rateWindow, setRateWindow] = useState(10);
  const [burstResults, setBurstResults] = useState([]);
  const [isBursting, setIsBursting] = useState(false);

  // Initial Sandbox Health Probe
  const checkSandboxHealth = async () => {
    try {
      setSandboxStatus('checking');
      const start = Date.now();
      const res = await demoService.ping();
      setSandboxLatency(res.latencyMs || Date.now() - start);
      setSandboxStatus('online');
    } catch {
      setSandboxStatus('offline');
    }
  };

  useEffect(() => {
    checkSandboxHealth();
  }, []);

  // Run Ping
  const handleRunPing = async () => {
    setIsPinging(true);
    try {
      const data = await demoService.ping();
      setPingResult(data);
    } catch (err) {
      setPingResult({ error: err.message });
    } finally {
      setIsPinging(false);
    }
  };

  // Run Delayed
  const handleRunDelayed = async () => {
    setIsDelaying(true);
    try {
      const data = await demoService.testDelayed(delayMs);
      setDelayResult(data);
    } catch (err) {
      setDelayResult({ error: err.message });
    } finally {
      setIsDelaying(false);
    }
  };

  // Run Error
  const handleRunError = async () => {
    setIsErroring(true);
    try {
      const data = await demoService.testError(errorStatus, errorRate);
      setErrorResult(data);
    } catch (err) {
      setErrorResult({ error: err.message });
    } finally {
      setIsErroring(false);
    }
  };

  // Run Rate Limit Burst
  const handleRunBurst = async () => {
    setIsBursting(true);
    setBurstResults([]);
    const totalRequests = 8;
    const results = [];

    for (let i = 1; i <= totalRequests; i++) {
      try {
        const res = await demoService.testRateLimit(rateLimit, rateWindow);
        results.push({
          reqIndex: i,
          status: res.statusCode,
          success: res.success,
          remaining: res.data?.remaining ?? 0,
          latencyMs: res.latencyMs,
          retryAfter: res.error?.retryAfterSeconds,
        });
      } catch (err) {
        results.push({
          reqIndex: i,
          status: err.status || 429,
          success: false,
          remaining: 0,
          retryAfter: 5,
        });
      }
      setBurstResults([...results]);
      // Small 80ms gap to simulate real traffic burst
      await new Promise((r) => setTimeout(r, 80));
    }
    setIsBursting(false);
  };

  return (
    <DashboardShell
      title="Demo API Sandbox"
      subtitle="Isolated benchmark endpoints on port :5001 for repeatable, safe load testing"
    >
      <div className="space-y-6">
        {/* Status Header Banner */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border border-indigo-800/40 bg-indigo-950/20 text-xs">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <FlaskConical className="h-5 w-5" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white text-sm">Demo API Port 5001</span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    sandboxStatus === 'online'
                      ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/80'
                      : 'bg-amber-950/80 text-amber-400 border border-amber-800/80'
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      sandboxStatus === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                    }`}
                  />
                  <span className="capitalize">{sandboxStatus}</span>
                  {sandboxLatency && <span>({sandboxLatency}ms)</span>}
                </span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                Separated from the core management API (:5000) so load-test scripts won't affect dashboard availability.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="secondary"
              onClick={checkSandboxHealth}
              leftIcon={<RotateCw className="h-3.5 w-3.5" />}
            >
              Ping Port
            </Button>
            <Button
              size="sm"
              to="/targets"
              leftIcon={<PlusCircle className="h-3.5 w-3.5 text-indigo-400" />}
            >
              Add to Targets
            </Button>
          </div>
        </div>

        {/* 4 Interactive Scenario Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Scenario 1: Ping */}
          <Card className="flex flex-col justify-between">
            <CardContent className="p-5 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">
                      GET
                    </span>
                    <span className="font-mono text-xs text-white">/api/demo/ping</span>
                  </div>
                  <span className="text-[11px] font-medium text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                    200 OK
                  </span>
                </div>
                <h4 className="text-sm font-semibold text-white">Baseline Benchmark</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Returns an instant 200 OK response with minimal processing overhead to establish server baseline RPS.
                </p>
              </div>

              {pingResult && (
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-indigo-300 space-y-1">
                  <div className="flex items-center justify-between text-slate-400 text-[10px] pb-1 border-b border-slate-800">
                    <span>STATUS: 200 OK</span>
                    <span className="text-emerald-400">{pingResult.latencyMs}ms roundtrip</span>
                  </div>
                  <pre className="text-[11px] overflow-x-auto text-slate-300">
                    {JSON.stringify(pingResult, null, 2)}
                  </pre>
                </div>
              )}

              <Button
                size="sm"
                className="w-full"
                onClick={handleRunPing}
                isLoading={isPinging}
                leftIcon={<Play className="h-3.5 w-3.5" />}
              >
                Send Baseline Request
              </Button>
            </CardContent>
          </Card>

          {/* Scenario 2: Artificial Latency */}
          <Card className="flex flex-col justify-between">
            <CardContent className="p-5 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800 font-bold">
                      GET
                    </span>
                    <span className="font-mono text-xs text-white">/api/demo/delayed?ms={delayMs}</span>
                  </div>
                  <span className="text-[11px] font-medium text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/60 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{delayMs}ms</span>
                  </span>
                </div>
                <h4 className="text-sm font-semibold text-white">Simulated Server Latency</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Injects server-side sleep before responding to stress test client timeouts and concurrency queuing.
                </p>
              </div>

              {/* Slider Input */}
              <div className="space-y-1.5 p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Target Delay:</span>
                  <span className="font-mono text-indigo-400 font-bold">{delayMs} ms</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="1500"
                  step="50"
                  value={delayMs}
                  onChange={(e) => setDelayMs(Number(e.target.value))}
                  className="w-full accent-indigo-600 bg-slate-800 h-1.5 rounded cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>50ms</span>
                  <span>500ms</span>
                  <span>1500ms</span>
                </div>
              </div>

              {delayResult && (
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono space-y-1">
                  <div className="flex items-center justify-between text-slate-400 text-[10px] pb-1 border-b border-slate-800">
                    <span>DELAYED RESPONSE</span>
                    <span className="text-amber-400">{delayResult.latencyMs}ms elapsed</span>
                  </div>
                  <div className="text-[11px] text-slate-300">
                    Simulated: {delayResult.simulatedDelayMs}ms | Actual observed: {delayResult.actualDelayMs}ms
                  </div>
                </div>
              )}

              <Button
                size="sm"
                className="w-full"
                onClick={handleRunDelayed}
                isLoading={isDelaying}
                leftIcon={<Clock className="h-3.5 w-3.5" />}
              >
                Send Delayed Request
              </Button>
            </CardContent>
          </Card>

          {/* Scenario 3: Error Injection */}
          <Card className="flex flex-col justify-between">
            <CardContent className="p-5 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800 font-bold">
                      GET
                    </span>
                    <span className="font-mono text-xs text-white">/api/demo/error?status={errorStatus}</span>
                  </div>
                  <span className="text-[11px] font-medium text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800/60">
                    HTTP {errorStatus}
                  </span>
                </div>
                <h4 className="text-sm font-semibold text-white">Controlled Fault Injection</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Injects specific HTTP status codes to evaluate k6 threshold failure rates and alert triggers.
                </p>
              </div>

              {/* Status Code Selector & Rate */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Status Code</label>
                  <select
                    value={errorStatus}
                    onChange={(e) => setErrorStatus(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-white"
                  >
                    <option value={500}>500 Internal Error</option>
                    <option value={502}>502 Bad Gateway</option>
                    <option value={503}>503 Service Unavailable</option>
                    <option value={400}>400 Bad Request</option>
                    <option value={404}>404 Not Found</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Rate: {Math.round(errorRate * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={errorRate}
                    onChange={(e) => setErrorRate(Number(e.target.value))}
                    className="w-full accent-rose-500 bg-slate-800 h-1.5 rounded cursor-pointer mt-2"
                  />
                </div>
              </div>

              {errorResult && (
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono space-y-1">
                  <div className="flex items-center justify-between text-slate-400 text-[10px] pb-1 border-b border-slate-800">
                    <span>OUTCOME</span>
                    <span className={errorResult.statusCode >= 400 ? 'text-rose-400' : 'text-emerald-400'}>
                      HTTP {errorResult.statusCode}
                    </span>
                  </div>
                  <pre className="text-[11px] text-slate-300 overflow-x-auto">
                    {JSON.stringify(errorResult.error || errorResult.data, null, 2)}
                  </pre>
                </div>
              )}

              <Button
                size="sm"
                variant="danger"
                className="w-full"
                onClick={handleRunError}
                isLoading={isErroring}
                leftIcon={<AlertTriangle className="h-3.5 w-3.5" />}
              >
                Trigger Injected Error
              </Button>
            </CardContent>
          </Card>

          {/* Scenario 4: Rate Limiter */}
          <Card className="flex flex-col justify-between">
            <CardContent className="p-5 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-purple-950 text-purple-400 border border-purple-800 font-bold">
                      GET
                    </span>
                    <span className="font-mono text-xs text-white">/api/demo/rate-limited</span>
                  </div>
                  <span className="text-[11px] font-medium text-purple-400 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800/60">
                    Sliding 429
                  </span>
                </div>
                <h4 className="text-sm font-semibold text-white">Rate Limit Throttling</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Simulates a strict {rateLimit} req / {rateWindow}s sliding window. Automatically returns HTTP 429 once limit is exceeded.
                </p>
              </div>

              {/* Rate Limit Parameters */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs">
                <div className="flex-1">
                  <label className="block text-[11px] text-slate-400 mb-1">Limit (Cap)</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={rateLimit}
                    onChange={(e) => setRateLimit(Number(e.target.value))}
                    className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded text-xs text-white"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-[11px] text-slate-400 mb-1">Window (Sec)</label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={rateWindow}
                    onChange={(e) => setRateWindow(Number(e.target.value))}
                    className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded text-xs text-white"
                  />
                </div>
              </div>

              {/* Burst Results Visualizer */}
              {burstResults.length > 0 && (
                <div className="space-y-1.5 p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800 pb-1">
                    <span>BURST TIMELINE (8 REQS)</span>
                    <span>
                      {burstResults.filter((r) => r.status === 200).length} OK /{' '}
                      {burstResults.filter((r) => r.status === 429).length} Throttled
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 pt-1">
                    {burstResults.map((r) => (
                      <div
                        key={r.reqIndex}
                        className={`p-1.5 rounded text-center text-[10px] font-mono border ${
                          r.status === 200
                            ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-300'
                            : 'bg-rose-950/60 border-rose-800/80 text-rose-300'
                        }`}
                      >
                        #{r.reqIndex}: {r.status}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button
                size="sm"
                className="w-full"
                onClick={handleRunBurst}
                isLoading={isBursting}
                leftIcon={<Zap className="h-3.5 w-3.5 text-purple-400" />}
              >
                Fire 8-Request Burst
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}

export default DemoPage;
