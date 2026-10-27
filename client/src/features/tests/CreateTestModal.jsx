import { useState, useEffect, useCallback } from 'react';
import { Play, Sliders, Plus, Trash2, Sparkles } from 'lucide-react';
import { Modal } from '../../components/ui/Modal.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Alert } from '../../components/ui/Alert.jsx';
import targetService from '../../services/targetService.js';
import testService from '../../services/testService.js';

export function CreateTestModal({ isOpen, onClose, onTestCreated }) {
  const [targets, setTargets] = useState([]);
  const [isLoadingTargets, setIsLoadingTargets] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Form states
  const [targetId, setTargetId] = useState('');
  const [name, setName] = useState('');
  const [method, setMethod] = useState('GET');
  const [endpoint, setEndpoint] = useState('/api/ping');
  const [headers, setHeaders] = useState([{ key: 'Content-Type', value: 'application/json' }]);
  const [body, setBody] = useState('');
  const [vus, setVus] = useState(10);
  const [duration, setDuration] = useState(30);
  const [rampUpDuration, setRampUpDuration] = useState(5);
  const [showThresholds, setShowThresholds] = useState(false);
  const [p95Threshold, setP95Threshold] = useState('');
  const [failedRateThreshold, setFailedRateThreshold] = useState('');

  const loadTargets = useCallback(async () => {
    setIsLoadingTargets(true);
    try {
      const data = await targetService.getTargets();
      setTargets(data);
      if (data.length > 0 && !targetId) {
        setTargetId(data[0]._id || data[0].id);
      }
    } catch {
      setError('Failed to load targets. Please ensure you have created an API target.');
    } finally {
      setIsLoadingTargets(false);
    }
  }, [targetId]);

  // Fetch targets on open
  useEffect(() => {
    if (isOpen) {
      loadTargets();
      setError(null);
    }
  }, [isOpen, loadTargets]);

  const handleAddHeader = () => {
    setHeaders([...headers, { key: '', value: '' }]);
  };

  const handleRemoveHeader = (index) => {
    setHeaders(headers.filter((_, i) => i !== index));
  };

  const handleHeaderChange = (index, field, value) => {
    const updated = [...headers];
    updated[index][field] = value;
    setHeaders(updated);
  };

  const fillDemoConfig = () => {
    setName('Demo Sandbox Baseline Benchmark');
    setMethod('GET');
    setEndpoint('/api/demo/ping');
    setVus(15);
    setDuration(30);
    setRampUpDuration(5);
    setP95Threshold('200');
    setFailedRateThreshold('0.01');
    setShowThresholds(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!targetId) {
      setError('Please select an API target for this load test.');
      return;
    }

    if (!endpoint.startsWith('/')) {
      setError('Endpoint path must start with a forward slash (e.g. /api/users).');
      return;
    }

    if (rampUpDuration >= duration) {
      setError('Ramp-up duration must be strictly less than total duration.');
      return;
    }

    // Build headers object
    const headersMap = {};
    headers.forEach(({ key, value }) => {
      if (key.trim()) {
        headersMap[key.trim()] = value;
      }
    });

    // Build thresholds object
    const thresholds = {};
    if (p95Threshold && !isNaN(Number(p95Threshold))) {
      thresholds.httpReqDurationP95 = Number(p95Threshold);
    }
    if (failedRateThreshold && !isNaN(Number(failedRateThreshold))) {
      thresholds.httpReqFailedRate = Number(failedRateThreshold);
    }

    const payload = {
      targetId,
      name: name.trim() || `Test-${method}-${endpoint}`,
      method,
      endpoint: endpoint.trim(),
      headers: headersMap,
      body: ['POST', 'PUT', 'PATCH'].includes(method) && body.trim() ? body.trim() : null,
      vus: Number(vus),
      duration: Number(duration),
      rampUpDuration: Number(rampUpDuration),
      thresholds,
    };

    setIsSubmitting(true);
    try {
      const createdRun = await testService.createTestRun(payload);
      if (onTestCreated) onTestCreated(createdRun);
      onClose();
    } catch (err) {
      setError(err?.message || 'Failed to create and queue test run.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedTarget = targets.find((t) => (t._id || t.id) === targetId);
  const estimatedRequests = Math.round(vus * duration * 3.5);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Configure New Load Test"
      description="Define synthetic workload parameters and virtual user ramp-up profiles"
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <Alert variant="danger" title="Validation Error">
            {error}
          </Alert>
        )}

        {/* Quick action: Fill Demo Config */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-indigo-950/30 border border-indigo-800/40 text-xs">
          <div className="flex items-center gap-2 text-indigo-300">
            <Sparkles className="h-4 w-4 text-indigo-400 shrink-0" />
            <span>Need a quick test? Pre-fill verified parameters for built-in Demo API:</span>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={fillDemoConfig}
            className="text-xs shrink-0 ml-2"
          >
            Fill Demo Preset
          </Button>
        </div>

        {/* Test Name & Target Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Target API <span className="text-rose-400">*</span>
            </label>
            {isLoadingTargets ? (
              <div className="h-10 rounded-lg bg-slate-800/60 animate-pulse border border-slate-700" />
            ) : targets.length === 0 ? (
              <div className="text-xs text-amber-400 p-2.5 rounded-lg bg-amber-950/30 border border-amber-800/40">
                No targets found. Please create an API Target first.
              </div>
            ) : (
              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              >
                {targets.map((t) => (
                  <option key={t._id || t.id} value={t._id || t.id}>
                    {t.name} ({t.baseUrl})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Test Name <span className="text-rose-400">*</span>
            </label>
            <Input
              placeholder="e.g. Checkout Peak Spike"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
        </div>

        {/* HTTP Method & Endpoint */}
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-1">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Method
            </label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>

          <div className="col-span-2">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Endpoint Path <span className="text-rose-400">*</span>
            </label>
            <Input
              placeholder="/api/v1/resource"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Request Headers */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Headers
            </label>
            <button
              type="button"
              onClick={handleAddHeader}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
            >
              <Plus className="h-3 w-3" /> Add Header
            </button>
          </div>
          <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
            {headers.map((hdr, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Key (e.g. Authorization)"
                  value={hdr.key}
                  onChange={(e) => handleHeaderChange(idx, 'key', e.target.value)}
                  className="flex-1 rounded-md bg-slate-800 border border-slate-700 px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <input
                  type="text"
                  placeholder="Value (e.g. Bearer token)"
                  value={hdr.value}
                  onChange={(e) => handleHeaderChange(idx, 'value', e.target.value)}
                  className="flex-1 rounded-md bg-slate-800 border border-slate-700 px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveHeader(idx)}
                  className="p-1.5 text-slate-400 hover:text-rose-400 transition"
                  aria-label="Remove header"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Request Body (For POST, PUT, PATCH) */}
        {['POST', 'PUT', 'PATCH'].includes(method) && (
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Request Body (JSON)
            </label>
            <textarea
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder='{ "userId": "123", "action": "test" }'
              className="w-full rounded-lg bg-slate-800 border border-slate-700 p-2.5 font-mono text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        )}

        {/* Workload Sliders (VUs, Duration, Ramp-up) */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">
            <Sliders className="h-4 w-4 text-indigo-400" />
            <span>Workload Profile (Authoritative Limits Enforced)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* VUs Slider */}
            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Virtual Users (VUs)</span>
                <span className="font-mono font-bold text-indigo-400">{vus} VUs</span>
              </div>
              <input
                type="range"
                min="1"
                max="50"
                value={vus}
                onChange={(e) => setVus(e.target.value)}
                className="w-full accent-indigo-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                <span>1 VU</span>
                <span>Max 50 VUs</span>
              </div>
            </div>

            {/* Total Duration Slider */}
            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Total Duration</span>
                <span className="font-mono font-bold text-indigo-400">{duration}s</span>
              </div>
              <input
                type="range"
                min="5"
                max="300"
                step="5"
                value={duration}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setDuration(val);
                  if (rampUpDuration >= val) {
                    setRampUpDuration(Math.max(0, val - 5));
                  }
                }}
                className="w-full accent-indigo-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                <span>5s</span>
                <span>Max 300s</span>
              </div>
            </div>

            {/* Ramp-Up Slider */}
            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Ramp-up Time</span>
                <span className="font-mono font-bold text-indigo-400">{rampUpDuration}s</span>
              </div>
              <input
                type="range"
                min="0"
                max={Math.max(0, duration - 1)}
                value={rampUpDuration}
                onChange={(e) => setRampUpDuration(e.target.value)}
                className="w-full accent-indigo-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                <span>0s (Instant)</span>
                <span>&lt; {duration}s</span>
              </div>
            </div>
          </div>
        </div>

        {/* Optional Thresholds Accordion */}
        <div className="border border-slate-800 rounded-lg p-3 bg-slate-900/40">
          <button
            type="button"
            onClick={() => setShowThresholds(!showThresholds)}
            className="flex items-center justify-between w-full text-xs font-semibold text-slate-300 uppercase tracking-wider text-left"
          >
            <span>Pass / Fail Thresholds (Optional)</span>
            <span className="text-indigo-400">{showThresholds ? '▲ Hide' : '▼ Configure'}</span>
          </button>

          {showThresholds && (
            <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-800/80">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  p95 Latency Cap (ms)
                </label>
                <Input
                  type="number"
                  placeholder="e.g. 500"
                  value={p95Threshold}
                  onChange={(e) => setP95Threshold(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Max Failure Rate (0.0 to 1.0)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 0.05 (5%)"
                  value={failedRateThreshold}
                  onChange={(e) => setFailedRateThreshold(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Workload Summary Banner */}
        <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/60 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-400">Target Full URL:</span>{' '}
            <code className="text-slate-200 font-mono">
              {selectedTarget ? `${selectedTarget.baseUrl}${endpoint}` : endpoint}
            </code>
          </div>
          <div className="text-right">
            <span className="text-slate-400">Est. Traffic:</span>{' '}
            <span className="text-indigo-300 font-bold font-mono">~{estimatedRequests} requests</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            leftIcon={<Play className="h-4 w-4" />}
          >
            Queue & Launch Test
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default CreateTestModal;
