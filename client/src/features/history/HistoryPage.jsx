import { useState, useEffect, useCallback, useId } from 'react';
import {
  History,
  Search,
  RotateCcw,
  Trash2,
  ExternalLink,
  ArrowLeftRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  X,
  Play,
} from 'lucide-react';
import { DashboardShell } from '../../components/layout/DashboardShell.jsx';
import { Card, CardContent } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Alert } from '../../components/ui/Alert.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import historyService from '../../services/historyService.js';
import targetService from '../../services/targetService.js';

export function HistoryPage() {
  // Search input and target ID accessibility IDs
  const searchInputId = useId();
  const targetSelectId = useId();

  // State
  const [testRuns, setTestRuns] = useState([]);
  const [stats, setStats] = useState(null);
  const [targets, setTargets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Filters & Pagination State
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [targetFilter, setTargetFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  });

  // Action Modals State
  const [rerunModal, setRerunModal] = useState({ isOpen: false, run: null, isSubmitting: false });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, run: null, isSubmitting: false });

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to first page on search change
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Calculate ISO date boundaries based on dateFilter
  const getDateRangeParams = useCallback(() => {
    if (dateFilter === 'all') return {};
    const now = new Date();
    const startDate = new Date();

    if (dateFilter === '24h') {
      startDate.setHours(now.getHours() - 24);
    } else if (dateFilter === '7d') {
      startDate.setDate(now.getDate() - 7);
    } else if (dateFilter === '30d') {
      startDate.setDate(now.getDate() - 30);
    }

    return { startDate: startDate.toISOString() };
  }, [dateFilter]);

  // Load target list for filter dropdown
  useEffect(() => {
    async function loadTargets() {
      try {
        const res = await targetService.getTargets({ limit: 100 });
        setTargets(res?.targets || []);
      } catch (err) {
        // Non-blocking fallback
        console.error('Failed to load targets filter list:', err);
      }
    }
    loadTargets();
  }, []);

  // Fetch test history and statistics
  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const dateParams = getDateRangeParams();
      const params = {
        page,
        limit,
        status: statusFilter,
        targetId: targetFilter || undefined,
        search: debouncedSearch || undefined,
        sortBy,
        sortOrder,
        ...dateParams,
      };

      const [historyRes, statsRes] = await Promise.all([
        historyService.getTestHistory(params),
        historyService.getHistoryStats().catch(() => null),
      ]);

      setTestRuns(historyRes?.testRuns || []);
      if (historyRes?.pagination) {
        setPagination(historyRes.pagination);
      }
      if (statsRes) {
        setStats(statsRes);
      }
    } catch (err) {
      setError(err?.response?.data?.error?.message || err.message || 'Failed to load test history');
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, statusFilter, targetFilter, debouncedSearch, sortBy, sortOrder, getDateRangeParams]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Reset all filters
  const handleResetFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setStatusFilter('all');
    setTargetFilter('');
    setDateFilter('all');
    setSortBy('createdAt');
    setSortOrder('desc');
    setPage(1);
  };

  const hasActiveFilters =
    Boolean(search) ||
    statusFilter !== 'all' ||
    Boolean(targetFilter) ||
    dateFilter !== 'all' ||
    sortBy !== 'createdAt' ||
    sortOrder !== 'desc';

  // Handle Rerun execution
  const handleConfirmRerun = async () => {
    if (!rerunModal.run) return;
    setRerunModal((prev) => ({ ...prev, isSubmitting: true }));
    setError(null);
    setActionSuccess(null);
    try {
      const runId = rerunModal.run._id || rerunModal.run.id;
      const newRun = await historyService.rerunTest(runId);
      setActionSuccess(
        `Successfully cloned test run! New run "${newRun?.name || 'Queued Test'}" is queued for execution.`
      );
      setRerunModal({ isOpen: false, run: null, isSubmitting: false });
      fetchHistory();
    } catch (err) {
      setError(
        err?.response?.data?.error?.message ||
          err.message ||
          'Failed to rerun test. Ensure target still exists and active concurrency limit is not exceeded.'
      );
      setRerunModal((prev) => ({ ...prev, isSubmitting: false }));
    }
  };

  // Handle Delete execution
  const handleConfirmDelete = async () => {
    if (!deleteModal.run) return;
    setDeleteModal((prev) => ({ ...prev, isSubmitting: true }));
    setError(null);
    setActionSuccess(null);
    try {
      const runId = deleteModal.run._id || deleteModal.run.id;
      await historyService.deleteHistoryItem(runId);
      setActionSuccess('Test run successfully removed from history.');
      setDeleteModal({ isOpen: false, run: null, isSubmitting: false });
      fetchHistory();
    } catch (err) {
      setError(err?.response?.data?.error?.message || err.message || 'Failed to delete test run');
      setDeleteModal((prev) => ({ ...prev, isSubmitting: false }));
    }
  };

  // Helper formatting functions
  const formatDate = (isoString) => {
    if (!isoString) return '—';
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch {
      return isoString;
    }
  };

  return (
    <DashboardShell
      title="Test History"
      subtitle="Inspect historical test runs, filter by execution parameters, and safely rerun tests"
    >
      <div className="space-y-6">
        {/* Top Notification Alerts */}
        {actionSuccess && (
          <Alert variant="success" onClose={() => setActionSuccess(null)}>
            {actionSuccess}
          </Alert>
        )}
        {error && (
          <Alert variant="danger" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* High-level Statistics Summary Cards */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-400">Total Executions</p>
                  <p className="text-xl font-bold text-white mt-1">{stats.total ?? 0}</p>
                </div>
                <div className="h-9 w-9 rounded-lg bg-indigo-950/60 border border-indigo-800/60 flex items-center justify-center text-indigo-400">
                  <History className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-400">Completed</p>
                  <p className="text-xl font-bold text-emerald-400 mt-1">{stats.completed ?? 0}</p>
                </div>
                <div className="h-9 w-9 rounded-lg bg-emerald-950/60 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-400">Failed</p>
                  <p className="text-xl font-bold text-rose-400 mt-1">{stats.failed ?? 0}</p>
                </div>
                <div className="h-9 w-9 rounded-lg bg-rose-950/60 border border-rose-800/60 flex items-center justify-center text-rose-400">
                  <XCircle className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-400">Cancelled / Aborted</p>
                  <p className="text-xl font-bold text-slate-300 mt-1">{stats.cancelled ?? 0}</p>
                </div>
                <div className="h-9 w-9 rounded-lg bg-slate-800/60 border border-slate-700/60 flex items-center justify-center text-slate-400">
                  <Clock className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters and Search Toolbar */}
        <Card className="bg-slate-900/70 border-slate-800">
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Search Input */}
              <div className="relative lg:col-span-2">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <label htmlFor={searchInputId} className="sr-only">Search test runs</label>
                <input
                  id={searchInputId}
                  type="text"
                  placeholder="Search by test name or endpoint..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-950/80 border border-slate-700/80 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Status Filter */}
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-3 py-1.5 text-xs bg-slate-950/80 border border-slate-700/80 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                >
                  <option value="all">All Statuses</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="running">Running</option>
                  <option value="queued">Queued</option>
                </select>
              </div>

              {/* Target Filter */}
              <div>
                <label htmlFor={targetSelectId} className="sr-only">Filter by target API</label>
                <select
                  id={targetSelectId}
                  value={targetFilter}
                  onChange={(e) => {
                    setTargetFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-3 py-1.5 text-xs bg-slate-950/80 border border-slate-700/80 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors truncate"
                >
                  <option value="">All Targets</option>
                  {targets.map((t) => (
                    <option key={t._id || t.id} value={t._id || t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Filter */}
              <div>
                <select
                  value={dateFilter}
                  onChange={(e) => {
                    setDateFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-3 py-1.5 text-xs bg-slate-950/80 border border-slate-700/80 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                >
                  <option value="all">All Time</option>
                  <option value="24h">Past 24 Hours</option>
                  <option value="7d">Past 7 Days</option>
                  <option value="30d">Past 30 Days</option>
                </select>
              </div>
            </div>

            {/* Sub-toolbar: Sort order and Reset actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 flex items-center gap-1">
                  <ArrowUpDown className="h-3 w-3" /> Sort:
                </span>
                <select
                  value={`${sortBy}:${sortOrder}`}
                  onChange={(e) => {
                    const [by, order] = e.target.value.split(':');
                    setSortBy(by);
                    setSortOrder(order);
                    setPage(1);
                  }}
                  className="bg-transparent text-slate-300 border-none focus:ring-0 cursor-pointer pr-4 py-0.5 text-xs font-medium"
                >
                  <option value="createdAt:desc" className="bg-slate-900">Newest First</option>
                  <option value="createdAt:asc" className="bg-slate-900">Oldest First</option>
                  <option value="name:asc" className="bg-slate-900">Name (A-Z)</option>
                  <option value="name:desc" className="bg-slate-900">Name (Z-A)</option>
                  <option value="duration:desc" className="bg-slate-900">Duration (High-Low)</option>
                  <option value="vus:desc" className="bg-slate-900">VUs (High-Low)</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResetFilters}
                    className="text-slate-400 hover:text-white h-7 px-2 text-xs"
                  >
                    Reset Filters
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchHistory}
                  disabled={isLoading}
                  leftIcon={<RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />}
                  className="h-7 px-2.5 text-xs border-slate-700/80"
                >
                  Refresh
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* History Table / List */}
        <Card className="bg-slate-900/60 border-slate-800 overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-10 w-full rounded-lg bg-slate-800/60" />
              <Skeleton className="h-14 w-full rounded-lg bg-slate-800/40" />
              <Skeleton className="h-14 w-full rounded-lg bg-slate-800/40" />
              <Skeleton className="h-14 w-full rounded-lg bg-slate-800/40" />
            </div>
          ) : testRuns.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="h-12 w-12 rounded-xl bg-slate-800/50 border border-slate-700/60 flex items-center justify-center mx-auto text-slate-400">
                <History className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-semibold text-white">
                {hasActiveFilters ? 'No matching test runs' : 'No execution history yet'}
              </h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                {hasActiveFilters
                  ? 'No test runs match your active search and filter combinations. Try clearing some filters.'
                  : 'Execute a load test from the Test Runs page or built-in Demo sandbox to build your execution history.'}
              </p>
              {hasActiveFilters ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetFilters}
                  className="mt-2 text-xs border-slate-700"
                >
                  Clear all filters
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  to="/tests"
                  leftIcon={<Play className="h-3.5 w-3.5" />}
                  className="mt-2 text-xs"
                >
                  Configure New Test
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-medium">
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Test Run</th>
                    <th className="py-3 px-4">Target API</th>
                    <th className="py-3 px-4">Workload</th>
                    <th className="py-3 px-4">Metrics</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {testRuns.map((run) => {
                    const runId = run._id || run.id;
                    const metrics = run.metrics;
                    const config = run.configuration || {};
                    const targetName =
                      run.target?.name || config.targetSnapshot?.name || 'Target API';

                    return (
                      <tr
                        key={runId}
                        className="hover:bg-slate-800/30 transition-colors group"
                      >
                        {/* Status */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Badge status={run.status} size="sm" dot />
                            {run.isSimulated && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-800/60 text-amber-300 font-mono">
                                SIM
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Test Name & ID */}
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-100 group-hover:text-indigo-300 transition-colors truncate max-w-[180px]">
                            {run.name}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono truncate max-w-[140px]">
                            {runId}
                          </div>
                        </td>

                        {/* Target API & Endpoint */}
                        <td className="py-3 px-4">
                          <div className="text-slate-200 font-medium truncate max-w-[200px]">
                            {targetName}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono truncate max-w-[220px]">
                            <span className="text-indigo-400 font-bold mr-1">
                              {config.method || 'GET'}
                            </span>
                            {config.endpoint || '/'}
                          </div>
                        </td>

                        {/* Workload Profile */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="text-slate-300 font-mono">
                            {config.vus || '—'} VUs
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {config.duration ? `${config.duration}s duration` : '—'}
                          </div>
                        </td>

                        {/* Normalized Performance Metrics */}
                        <td className="py-3 px-4">
                          {metrics ? (
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="text-slate-200 font-semibold font-mono">
                                  {metrics.avgLatency != null
                                    ? `${metrics.avgLatency.toFixed(1)}ms`
                                    : '—'}
                                </span>
                                <span className="text-[10px] text-slate-400">avg</span>
                                <span className="text-slate-300 font-mono">
                                  {metrics.requestsPerSecond != null
                                    ? `${metrics.requestsPerSecond.toFixed(1)} req/s`
                                    : '—'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                                <span>{metrics.totalRequests ?? 0} reqs</span>
                                {metrics.failureRate != null && (
                                  <span
                                    className={
                                      metrics.failureRate > 0
                                        ? 'text-rose-400'
                                        : 'text-emerald-400'
                                    }
                                  >
                                    {(metrics.failureRate * 100).toFixed(1)}% err
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-500 italic">No metrics recorded</span>
                          )}
                        </td>

                        {/* Date */}
                        <td className="py-3 px-4 whitespace-nowrap text-slate-400 text-[11px]">
                          {formatDate(run.createdAt)}
                        </td>

                        {/* Action buttons */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* View Results Link */}
                            <Button
                              variant="ghost"
                              size="sm"
                              to={`/results/${runId}`}
                              className="h-7 w-7 p-0 text-slate-400 hover:text-indigo-400"
                              title="View performance report"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Button>

                            {/* Compare Run */}
                            {run.status === 'completed' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                to={`/compare?baseRunId=${runId}`}
                                className="h-7 w-7 p-0 text-slate-400 hover:text-amber-400"
                                title="Compare against another run"
                              >
                                <ArrowLeftRight className="h-3.5 w-3.5" />
                              </Button>
                            )}

                            {/* Safe Re-run */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setRerunModal({ isOpen: true, run, isSubmitting: false })}
                              className="h-7 w-7 p-0 text-slate-400 hover:text-emerald-400"
                              title="Clone and re-run this configuration"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </Button>

                            {/* Delete Item */}
                            {run.status !== 'running' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteModal({ isOpen: true, run, isSubmitting: false })}
                                className="h-7 w-7 p-0 text-slate-400 hover:text-rose-400"
                                title="Delete from history"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {pagination.total > 0 && (
            <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
              <div className="flex items-center gap-3">
                <span>
                  Showing{' '}
                  <strong className="text-white">
                    {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)}
                  </strong>{' '}
                  to{' '}
                  <strong className="text-white">
                    {Math.min(pagination.page * pagination.limit, pagination.total)}
                  </strong>{' '}
                  of <strong className="text-white">{pagination.total}</strong> executions
                </span>

                <div className="flex items-center gap-1.5 ml-2">
                  <span>Per page:</span>
                  <select
                    value={limit}
                    onChange={(e) => {
                      setLimit(Number(e.target.value));
                      setPage(1);
                    }}
                    className="bg-slate-900 border border-slate-700/80 rounded px-2 py-0.5 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={!pagination.hasPrev || isLoading}
                  leftIcon={<ChevronLeft className="h-3.5 w-3.5" />}
                  className="h-7 px-2.5 text-xs border-slate-700/80"
                >
                  Previous
                </Button>
                <span className="px-2 text-slate-400">
                  Page <strong className="text-white">{pagination.page}</strong> of{' '}
                  <strong className="text-white">{pagination.totalPages}</strong>
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!pagination.hasNext || isLoading}
                  rightIcon={<ChevronRight className="h-3.5 w-3.5" />}
                  className="h-7 px-2.5 text-xs border-slate-700/80"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Modal: Safe Re-Run Confirmation */}
        <Modal
          isOpen={rerunModal.isOpen}
          onClose={() => setRerunModal({ isOpen: false, run: null, isSubmitting: false })}
          title="Confirm Safe Re-run"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to clone this test configuration and queue a new execution run?
            </p>

            {rerunModal.run && (
              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Test Name:</span>
                  <span className="text-white font-medium">{rerunModal.run.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Target API:</span>
                  <span className="text-slate-200 font-mono">
                    {rerunModal.run.target?.name || rerunModal.run.configuration?.targetSnapshot?.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Configuration:</span>
                  <span className="text-indigo-400 font-mono">
                    {rerunModal.run.configuration?.vus} VUs · {rerunModal.run.configuration?.duration}s
                  </span>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRerunModal({ isOpen: false, run: null, isSubmitting: false })}
                disabled={rerunModal.isSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmRerun}
                isLoading={rerunModal.isSubmitting}
                leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
              >
                Queue Rerun
              </Button>
            </div>
          </div>
        </Modal>

        {/* Modal: Delete Confirmation */}
        <Modal
          isOpen={deleteModal.isOpen}
          onClose={() => setDeleteModal({ isOpen: false, run: null, isSubmitting: false })}
          title="Delete Test Run"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-rose-950/40 border border-rose-900/60 text-xs text-rose-200">
              <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
              <p>
                This action is irreversible. All stored performance metrics and latency timelines
                associated with this test run will be permanently removed.
              </p>
            </div>

            {deleteModal.run && (
              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-xs space-y-1">
                <span className="text-slate-400">Deleting:</span>
                <p className="text-white font-medium">{deleteModal.run.name}</p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteModal({ isOpen: false, run: null, isSubmitting: false })}
                disabled={deleteModal.isSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleConfirmDelete}
                isLoading={deleteModal.isSubmitting}
                leftIcon={<Trash2 className="h-3.5 w-3.5" />}
              >
                Delete
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </DashboardShell>
  );
}

export default HistoryPage;
