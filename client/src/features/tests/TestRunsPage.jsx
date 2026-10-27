import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Play,
  RotateCw,
  Sliders,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Zap,
  Trash2,
  Activity,
  Shield,
  Layers,
} from 'lucide-react';
import { DashboardShell } from '../../components/layout/DashboardShell.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Alert } from '../../components/ui/Alert.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { CreateTestModal } from './CreateTestModal.jsx';
import testService from '../../services/testService.js';

export function TestRunsPage() {
  const [testRuns, setTestRuns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Cancellation modal states
  const [cancellingRun, setCancellingRun] = useState(null);
  const [cancelReason, setCancelReason] = useState('Aborted by user via dashboard');
  const [isCancelling, setIsCancelling] = useState(false);

  // Action feedback
  const [actionFeedback, setActionFeedback] = useState(null);

  const pollingRef = useRef(null);

  const fetchTests = useCallback(async (isPolling = false) => {
    if (!isPolling) setIsLoading(true);
    try {
      const data = await testService.getTestRuns({ limit: 50 });
      setTestRuns(data.testRuns || []);
      setError(null);
    } catch (err) {
      if (!isPolling) {
        setError(err?.message || 'Failed to retrieve test runs.');
      }
    } finally {
      if (!isPolling) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTests();
  }, [fetchTests]);

  // Set up polling when there are active (queued or running) tests
  useEffect(() => {
    const hasActiveTests = testRuns.some((r) => ['queued', 'running'].includes(r.status));

    if (hasActiveTests) {
      pollingRef.current = setInterval(() => {
        fetchTests(true);
      }, 3000);
    } else {
      if (pollingRef.current) clearInterval(pollingRef.current);
    }

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [testRuns, fetchTests]);

  const handleTestCreated = (newRun) => {
    setActionFeedback({
      type: 'success',
      message: `Test run "${newRun.name}" successfully created and placed in queue!`,
    });
    fetchTests();
  };

  const handleSimulateRun = async (runId, runName) => {
    try {
      await testService.simulateLifecycleRun(runId);
      setActionFeedback({
        type: 'success',
        message: `Stage 6 Lifecycle verification simulated successfully for "${runName}"!`,
      });
      fetchTests();
    } catch (err) {
      setActionFeedback({
        type: 'danger',
        message: err?.message || 'Simulation execution failed.',
      });
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancellingRun) return;
    setIsCancelling(true);
    try {
      await testService.cancelTestRun(cancellingRun._id || cancellingRun.id, cancelReason);
      setActionFeedback({
        type: 'success',
        message: `Test run "${cancellingRun.name}" cancelled successfully.`,
      });
      setCancellingRun(null);
      fetchTests();
    } catch (err) {
      setActionFeedback({
        type: 'danger',
        message: err?.message || 'Failed to cancel test run.',
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const handleDeleteRun = async (runId, runName) => {
    if (!window.confirm(`Are you sure you want to delete test run "${runName}"?`)) {
      return;
    }
    try {
      await testService.deleteTestRun(runId);
      setActionFeedback({
        type: 'success',
        message: `Test run "${runName}" deleted.`,
      });
      fetchTests();
    } catch (err) {
      setActionFeedback({
        type: 'danger',
        message: err?.message || 'Failed to delete test run.',
      });
    }
  };

  // Stats computation
  const totalCount = testRuns.length;
  const activeCount = testRuns.filter((r) => ['queued', 'running'].includes(r.status)).length;
  const completedCount = testRuns.filter((r) => r.status === 'completed').length;
  const terminalFailCount = testRuns.filter((r) => ['failed', 'cancelled'].includes(r.status)).length;

  const filteredRuns = testRuns.filter((run) => {
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'ACTIVE') return ['queued', 'running'].includes(run.status);
    return run.status.toUpperCase() === statusFilter;
  });

  return (
    <DashboardShell
      title="Load Tests & Execution Lifecycle"
      subtitle="Configure, trigger, monitor, and manage synthetic workloads and virtual user profiles"
    >
      <div className="space-y-6">
        {/* Top Action Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Filter Status:
            </span>
            <div className="inline-flex rounded-lg bg-slate-900 border border-slate-800 p-0.5 text-xs">
              {['ALL', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'FAILED'].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setStatusFilter(tab)}
                  className={`px-3 py-1.5 rounded-md font-medium transition ${
                    statusFilter === tab
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab === 'ACTIVE' ? `Active (${activeCount})` : tab}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchTests()}
              leftIcon={<RotateCw className="h-3.5 w-3.5" />}
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
              leftIcon={<Play className="h-4 w-4" />}
            >
              Configure New Test
            </Button>
          </div>
        </div>

        {/* Global Action Feedback Alert */}
        {actionFeedback && (
          <Alert
            variant={actionFeedback.type}
            onClose={() => setActionFeedback(null)}
          >
            {actionFeedback.message}
          </Alert>
        )}

        {/* Authoritative Safety Constraints Notice */}
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <Shield className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-100 block">
                Authoritative System Guardrails Active
              </span>
              Max 50 Virtual Users (VUs) and 300s duration are enforced server-side. Users are capped at 2 concurrent active executions to ensure server stability.
            </div>
          </div>
          <span className="hidden md:inline-flex items-center gap-1 font-mono text-[11px] text-slate-400 shrink-0">
            <Layers className="h-3.5 w-3.5 text-slate-500" /> Monitored Workers
          </span>
        </div>

        {/* Statistics Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>Total Test Runs</span>
              <Activity className="h-4 w-4 text-slate-500" />
            </div>
            <div className="mt-2 text-2xl font-bold font-mono text-white">{totalCount}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">All scheduled executions</div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between text-indigo-400 text-xs font-semibold">
              <span>Active Workloads</span>
              <Clock className="h-4 w-4 text-indigo-400 animate-spin" />
            </div>
            <div className="mt-2 text-2xl font-bold font-mono text-indigo-400">{activeCount}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Queued or running in worker</div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between text-emerald-400 text-xs font-semibold">
              <span>Completed</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="mt-2 text-2xl font-bold font-mono text-emerald-400">{completedCount}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Verified final results</div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between text-rose-400 text-xs font-semibold">
              <span>Aborted / Failed</span>
              <XCircle className="h-4 w-4 text-rose-400" />
            </div>
            <div className="mt-2 text-2xl font-bold font-mono text-rose-400">{terminalFailCount}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">User cancellations or errors</div>
          </Card>
        </div>

        {/* Test Runs List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-28 rounded-xl bg-slate-900/60 border border-slate-800 animate-pulse"
              />
            ))}
          </div>
        ) : error ? (
          <Alert variant="danger" title="Error Loading Tests">
            {error}
          </Alert>
        ) : filteredRuns.length === 0 ? (
          <Card className="p-10 text-center">
            <div className="mx-auto w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400 mb-4">
              <Sliders className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-white">No Load Tests Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-5">
              {statusFilter === 'ALL'
                ? 'You have not configured any load test runs yet. Create your first synthetic test or explore the demo sandbox.'
                : `No load tests match the "${statusFilter}" filter.`}
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsCreateModalOpen(true)}
                leftIcon={<Play className="h-4 w-4" />}
              >
                Configure First Test
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredRuns.map((run) => {
              const runId = run._id || run.id;
              const isQueued = run.status === 'queued';
              const isRunning = run.status === 'running';
              const isCompleted = run.status === 'completed';
              const isCancelled = run.status === 'cancelled';
              const isFailed = run.status === 'failed';

              return (
                <div
                  key={runId}
                  className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 hover:border-slate-700 transition"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Test Info Header */}
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge status={run.status} dot />
                        <h4 className="text-base font-semibold text-white">{run.name}</h4>
                        {run.isSimulated && (
                          <span className="text-[10px] font-mono uppercase bg-amber-950/70 text-amber-300 border border-amber-800/60 rounded px-1.5 py-0.5">
                            Stage 6 Simulation
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                        <span className="px-1.5 py-0.5 rounded font-mono font-bold bg-slate-800 text-indigo-300 border border-slate-700">
                          {run.configuration?.method || 'GET'}
                        </span>
                        <code className="text-slate-300 font-mono">
                          {`${run.configuration?.targetSnapshot?.baseUrl || ''}${run.configuration?.endpoint || ''}`}
                        </code>
                        <span className="text-slate-600">•</span>
                        <span>Target: {run.configuration?.targetSnapshot?.name}</span>
                      </div>
                    </div>

                    {/* Workload Profile Chips */}
                    <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                      <div className="px-2.5 py-1 rounded-lg bg-slate-950/70 border border-slate-800 text-slate-300">
                        <span className="text-slate-500">VUs: </span>
                        <span className="text-indigo-400 font-bold">{run.configuration?.vus}</span>
                      </div>
                      <div className="px-2.5 py-1 rounded-lg bg-slate-950/70 border border-slate-800 text-slate-300">
                        <span className="text-slate-500">Duration: </span>
                        <span className="text-indigo-400 font-bold">{run.configuration?.duration}s</span>
                      </div>
                      {run.configuration?.rampUpDuration > 0 && (
                        <div className="px-2.5 py-1 rounded-lg bg-slate-950/70 border border-slate-800 text-slate-300">
                          <span className="text-slate-500">Ramp: </span>
                          <span className="text-indigo-400 font-bold">{run.configuration.rampUpDuration}s</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress & Lifecycle Status Bar */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        {isRunning && <Zap className="h-3.5 w-3.5 text-amber-400 animate-pulse" />}
                        {isCompleted && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
                        {isCancelled && <AlertTriangle className="h-3.5 w-3.5 text-slate-400" />}
                        {isFailed && <XCircle className="h-3.5 w-3.5 text-rose-400" />}
                        <span className="font-medium text-slate-200">
                          {run.progress?.stage || run.status}
                        </span>
                        <span className="text-slate-500">— {run.progress?.message}</span>
                      </span>
                      <span className="font-mono text-slate-400">{run.progress?.percent || 0}%</span>
                    </div>

                    <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          isRunning
                            ? 'bg-amber-400 animate-pulse'
                            : isCompleted
                            ? 'bg-emerald-500'
                            : isCancelled
                            ? 'bg-slate-500'
                            : isFailed
                            ? 'bg-rose-500'
                            : 'bg-indigo-500'
                        }`}
                        style={{ width: `${run.progress?.percent || (isQueued ? 5 : 0)}%` }}
                      />
                    </div>
                  </div>

                  {/* Metrics preview when completed */}
                  {isCompleted && run.metrics && (
                    <div className="mt-3.5 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono p-2.5 rounded-lg bg-slate-950/50 border border-slate-800/80">
                      <div>
                        <span className="text-slate-500 block text-[10px]">TOTAL REQS</span>
                        <span className="text-white font-bold">{run.metrics.totalRequests?.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">THROUGHPUT</span>
                        <span className="text-emerald-400 font-bold">{run.metrics.requestsPerSecond} req/s</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">AVG LATENCY</span>
                        <span className="text-indigo-300 font-bold">{run.metrics.avgLatency}ms</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">P95 LATENCY</span>
                        <span className="text-indigo-300 font-bold">{run.metrics.p95Latency}ms</span>
                      </div>
                    </div>
                  )}

                  {/* Action Controls Toolbar */}
                  <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-800/60 text-xs">
                    <span className="text-slate-500">
                      Created: {new Date(run.createdAt).toLocaleTimeString()}
                    </span>

                    <div className="flex items-center gap-2">
                      {/* Stage 6 Lifecycle Simulation Trigger */}
                      {isQueued && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleSimulateRun(runId, run.name)}
                          leftIcon={<Activity className="h-3 w-3 text-indigo-400" />}
                          className="text-xs py-1"
                        >
                          Simulate Lifecycle Run
                        </Button>
                      )}

                      {/* Cancel Button (Queued or Running) */}
                      {(isQueued || isRunning) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCancellingRun(run)}
                          className="text-xs py-1 text-rose-300 hover:text-rose-200 border-rose-900/60 hover:bg-rose-950/40"
                        >
                          Cancel Run
                        </Button>
                      )}

                      {/* Delete Button (Terminal states only) */}
                      {(isCompleted || isCancelled || isFailed) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteRun(runId, run.name)}
                          className="text-xs py-1 text-slate-400 hover:text-rose-400"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal: Configure New Test */}
        <CreateTestModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onTestCreated={handleTestCreated}
        />

        {/* Modal: Confirm Cancellation */}
        {cancellingRun && (
          <Modal
            isOpen={Boolean(cancellingRun)}
            onClose={() => setCancellingRun(null)}
            title="Confirm Test Run Cancellation"
            description={`Are you sure you want to abort "${cancellingRun.name}"?`}
            maxWidth="max-w-md"
            footer={
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCancellingRun(null)}
                  disabled={isCancelling}
                >
                  Keep Running
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleConfirmCancel}
                  isLoading={isCancelling}
                >
                  Confirm Abort
                </Button>
              </>
            }
          >
            <div className="space-y-3 text-xs text-slate-300">
              <p>
                Cancelling this test will immediately terminate workload processes and mark the run as <span className="font-semibold text-rose-300">Cancelled</span>. This action cannot be reversed.
              </p>
              <div>
                <label className="block text-slate-400 mb-1">Reason for Cancellation:</label>
                <input
                  type="text"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full rounded bg-slate-800 border border-slate-700 px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>
            </div>
          </Modal>
        )}
      </div>
    </DashboardShell>
  );
}

export default TestRunsPage;
