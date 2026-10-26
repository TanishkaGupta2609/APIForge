import { useState, useEffect, useCallback } from 'react';
import {
  Server,
  Plus,
  Search,
  ExternalLink,
  Trash2,
  Edit2,
  Activity,
  Shield,
  Zap,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Play,
  RotateCw,
} from 'lucide-react';
import { DashboardShell } from '../../components/layout/DashboardShell.jsx';
import { Card, CardContent } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { Alert } from '../../components/ui/Alert.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import targetService from '../../services/targetService.js';


export function TargetsPage() {
  const [targets, setTargets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [alert, setAlert] = useState(null);

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [probingTargetId, setProbingTargetId] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    baseUrl: '',
    description: '',
    defaultHeaders: [],
  });
  const [headerInput, setHeaderInput] = useState({ key: '', value: '', isSecret: false });
  const [formError, setFormError] = useState(null);

  // Load Targets
  const loadTargets = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await targetService.getTargets();
      setTargets(data);
    } catch (err) {
      setAlert({ type: 'danger', message: err.message || 'Failed to load targets.' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTargets();
  }, [loadTargets]);

  // Reset Form
  const resetForm = () => {
    setFormData({
      name: '',
      baseUrl: '',
      description: '',
      defaultHeaders: [],
    });
    setHeaderInput({ key: '', value: '', isSecret: false });
    setFormError(null);
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (target) => {
    setSelectedTarget(target);
    setFormData({
      name: target.name || '',
      baseUrl: target.baseUrl || '',
      description: target.description || '',
      defaultHeaders: target.defaultHeaders ? [...target.defaultHeaders] : [],
    });
    setHeaderInput({ key: '', value: '', isSecret: false });
    setFormError(null);
    setIsEditOpen(true);
  };

  // Open Delete Modal
  const handleOpenDelete = (target) => {
    setSelectedTarget(target);
    setIsDeleteOpen(true);
  };

  // Add Header to List
  const handleAddHeader = () => {
    if (!headerInput.key.trim() || !headerInput.value.trim()) return;
    setFormData((prev) => ({
      ...prev,
      defaultHeaders: [...prev.defaultHeaders, { ...headerInput, key: headerInput.key.trim() }],
    }));
    setHeaderInput({ key: '', value: '', isSecret: false });
  };

  // Remove Header from List
  const handleRemoveHeader = (index) => {
    setFormData((prev) => ({
      ...prev,
      defaultHeaders: prev.defaultHeaders.filter((_, i) => i !== index),
    }));
  };

  // Create Submit
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const newTarget = await targetService.createTarget(formData);
      setTargets((prev) => [newTarget, ...prev]);
      setIsCreateOpen(false);
      setAlert({ type: 'success', message: `Target "${newTarget.name}" created successfully.` });
    } catch (err) {
      setFormError(err.message || 'Failed to create target. Verify URL and SSRF constraints.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit Submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const updated = await targetService.updateTarget(selectedTarget.id, formData);
      setTargets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setIsEditOpen(false);
      setAlert({ type: 'success', message: `Target "${updated.name}" updated successfully.` });
    } catch (err) {
      setFormError(err.message || 'Failed to update target. Verify URL format.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Submit
  const handleDeleteSubmit = async () => {
    if (!selectedTarget) return;
    setIsSubmitting(true);

    try {
      await targetService.deleteTarget(selectedTarget.id);
      setTargets((prev) => prev.filter((t) => t.id !== selectedTarget.id));
      setIsDeleteOpen(false);
      setAlert({ type: 'success', message: `Target "${selectedTarget.name}" was deleted.` });
    } catch (err) {
      setAlert({ type: 'danger', message: err.message || 'Failed to delete target.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Health Probe
  const handleProbeHealth = async (targetId) => {
    try {
      setProbingTargetId(targetId);
      const probeResult = await targetService.probeTargetHealth(targetId);
      setTargets((prev) =>
        prev.map((t) =>
          t.id === targetId
            ? {
                ...t,
                lastHealthCheck: {
                  status: probeResult.status,
                  statusCode: probeResult.statusCode,
                  latencyMs: probeResult.latencyMs,
                  checkedAt: probeResult.checkedAt,
                  message: probeResult.message,
                },
              }
            : t
        )
      );
    } catch (err) {
      setAlert({ type: 'danger', message: `Health probe failed: ${err.message}` });
    } finally {
      setProbingTargetId(null);
    }
  };

  // Fill Demo API Shortcut
  const handleFillDemoApi = () => {
    setFormData({
      name: 'Built-in Demo API',
      baseUrl: 'http://localhost:5001',
      description: 'Local sandbox for controlled latency, rate limiting, and fault injection benchmarks.',
      defaultHeaders: [{ key: 'X-Sandbox-Client', value: 'APIForge', isSecret: false }],
    });
  };

  // Filter Targets
  const filteredTargets = targets.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.baseUrl.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getHealthBadge = (health) => {
    if (!health || health.status === 'unknown') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
          <HelpCircle className="h-3 w-3" />
          <span>Untested</span>
        </span>
      );
    }
    if (health.status === 'online') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-800/80">
          <CheckCircle2 className="h-3 w-3" />
          <span>Online {health.latencyMs !== null ? `(${health.latencyMs}ms)` : ''}</span>
        </span>
      );
    }
    if (health.status === 'degraded') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-950/80 text-amber-400 border border-amber-800/80">
          <AlertTriangle className="h-3 w-3" />
          <span>HTTP {health.statusCode || 'Degraded'}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-950/80 text-rose-400 border border-rose-800/80">
        <XCircle className="h-3 w-3" />
        <span>Offline</span>
      </span>
    );
  };

  return (
    <DashboardShell
      title="Target APIs"
      subtitle="Configure and probe API endpoints approved for load-testing with multi-layer SSRF defense"
    >
      <div className="space-y-6">
        {/* Global Action Notifications */}
        {alert && (
          <Alert variant={alert.type} onClose={() => setAlert(null)}>
            {alert.message}
          </Alert>
        )}

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search targets by name or URL..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={loadTargets} leftIcon={<RotateCw className="h-3.5 w-3.5" />}>
              Refresh
            </Button>
            <Button size="sm" onClick={handleOpenCreate} leftIcon={<Plus className="h-4 w-4" />}>
              Register Target
            </Button>
          </div>
        </div>

        {/* Target Cards Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-5 space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-8 w-full" />
              </Card>
            ))}
          </div>
        ) : filteredTargets.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="max-w-md mx-auto space-y-4">
                <div className="h-12 w-12 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center mx-auto text-indigo-400">
                  <Server className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">No targets registered</h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Register an authorized API target to benchmark with native k6. Built-in SSRF validation
                    protects your infrastructure against private IP & cloud metadata attacks.
                  </p>
                </div>
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Button size="sm" onClick={handleOpenCreate} leftIcon={<Plus className="h-4 w-4" />}>
                    Register New Target
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      handleOpenCreate();
                      handleFillDemoApi();
                    }}
                    leftIcon={<Zap className="h-4 w-4 text-indigo-400" />}
                  >
                    Load Demo API Target
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTargets.map((target) => (
              <Card key={target.id} className="flex flex-col justify-between hover:border-slate-700 transition group">
                <CardContent className="p-5 space-y-4">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
                        {target.name}
                      </h4>
                      <p className="text-xs text-slate-400 line-clamp-2">
                        {target.description || 'No description provided.'}
                      </p>
                    </div>
                    {getHealthBadge(target.lastHealthCheck)}
                  </div>

                  {/* Base URL Box */}
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs font-mono text-indigo-300">
                    <span className="truncate">{target.baseUrl}</span>
                    <a
                      href={target.baseUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-500 hover:text-white transition ml-2 flex-shrink-0"
                      title="Open in new tab"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>

                  {/* Headers Preview */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                    <span>Configured Headers:</span>
                    <span className="font-semibold text-white">
                      {target.defaultHeaders?.length || 0} headers
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-800/60">
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleProbeHealth(target.id)}
                        isLoading={probingTargetId === target.id}
                        leftIcon={<Activity className="h-3.5 w-3.5" />}
                        title="Ping target endpoint"
                      >
                        Check Health
                      </Button>
                      <Button
                        size="sm"
                        to={`/tests?targetId=${target.id}`}
                        variant="ghost"
                        leftIcon={<Play className="h-3.5 w-3.5 text-indigo-400" />}
                        title="Configure a test run"
                      >
                        Test
                      </Button>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(target)}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
                        title="Edit target"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenDelete(target)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded transition"
                        title="Delete target"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Modal: Register Target */}
        <Modal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          title="Register API Target"
          description="Register an endpoint to authorize it for native k6 load testing"
          footer={
            <>
              <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateSubmit} isLoading={isSubmitting}>
                Save Target
              </Button>
            </>
          }
        >
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            {formError && (
              <Alert variant="danger" onClose={() => setFormError(null)}>
                {formError}
              </Alert>
            )}

            <div className="flex items-center justify-between p-2 rounded-lg bg-indigo-950/40 border border-indigo-800/40 text-xs text-indigo-300">
              <span className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-indigo-400" />
                <span>Need a ready-to-test endpoint?</span>
              </span>
              <button
                type="button"
                onClick={handleFillDemoApi}
                className="font-semibold text-white underline hover:text-indigo-200"
              >
                Use Demo API
              </button>
            </div>

            <Input
              label="Target Name"
              placeholder="e.g. Payments Gateway Microservice"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />

            <Input
              label="Base URL"
              placeholder="https://api.yourdomain.com"
              value={formData.baseUrl}
              onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
              helperText="Must be an HTTP/HTTPS URL. Loopbacks, private RFC 1918 subnets, and cloud metadata IPs are blocked."
              required
            />

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-300">Description (Optional)</label>
              <textarea
                rows={2}
                placeholder="Brief notes about this service..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Custom Headers Section */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="block text-xs font-semibold text-white">Default Headers (Optional)</label>
              <p className="text-[11px] text-slate-400">
                Headers automatically attached to probes and load-test requests.
              </p>

              {/* Dynamic Headers Table */}
              {formData.defaultHeaders.length > 0 && (
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {formData.defaultHeaders.map((header, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2 p-1.5 rounded bg-slate-950 border border-slate-800 text-xs"
                    >
                      <span className="font-mono text-indigo-300 truncate max-w-[120px]">{header.key}</span>
                      <span className="font-mono text-slate-400 truncate flex-1">
                        {header.isSecret ? '••••••••' : header.value}
                      </span>
                      {header.isSecret && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-950 text-amber-400 text-[9px] border border-amber-800/80">
                          Secret
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveHeader(idx)}
                        className="text-slate-500 hover:text-rose-400 p-1"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Header Row */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Key (e.g. Authorization)"
                  value={headerInput.key}
                  onChange={(e) => setHeaderInput({ ...headerInput, key: e.target.value })}
                  className="flex-1 px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-white"
                />
                <input
                  type="text"
                  placeholder="Value (e.g. Bearer token)"
                  value={headerInput.value}
                  onChange={(e) => setHeaderInput({ ...headerInput, value: e.target.value })}
                  className="flex-1 px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-white"
                />
                <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={headerInput.isSecret}
                    onChange={(e) => setHeaderInput({ ...headerInput, isSecret: e.target.checked })}
                    className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0"
                  />
                  <span>Mask</span>
                </label>
                <Button type="button" size="sm" variant="secondary" onClick={handleAddHeader}>
                  Add
                </Button>
              </div>
            </div>
          </form>
        </Modal>

        {/* Modal: Edit Target */}
        <Modal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          title="Edit API Target"
          description="Update configuration or default headers for this target"
          footer={
            <>
              <Button variant="ghost" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditSubmit} isLoading={isSubmitting}>
                Save Changes
              </Button>
            </>
          }
        >
          <form onSubmit={handleEditSubmit} className="space-y-4">
            {formError && (
              <Alert variant="danger" onClose={() => setFormError(null)}>
                {formError}
              </Alert>
            )}

            <Input
              label="Target Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />

            <Input
              label="Base URL"
              value={formData.baseUrl}
              onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
              helperText="Must be an HTTP/HTTPS URL. SSRF protection applies."
              required
            />

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-300">Description</label>
              <textarea
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </form>
        </Modal>

        {/* Modal: Delete Confirmation */}
        <Modal
          isOpen={isDeleteOpen}
          onClose={() => setIsDeleteOpen(false)}
          title="Delete Target API"
          description="Are you sure you want to delete this target? This action cannot be undone."
          footer={
            <>
              <Button variant="ghost" onClick={() => setIsDeleteOpen(false)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleDeleteSubmit} isLoading={isSubmitting}>
                Delete Target
              </Button>
            </>
          }
        >
          <p className="text-xs text-slate-300">
            Deleting <span className="font-semibold text-white">{selectedTarget?.name}</span> (
            <span className="font-mono text-indigo-300">{selectedTarget?.baseUrl}</span>) will remove its
            configuration from your account. Existing historical test records will retain their immutable configuration snapshot.
          </p>
        </Modal>
      </div>
    </DashboardShell>
  );
}

export default TargetsPage;
