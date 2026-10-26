import { FlaskConical } from 'lucide-react';
import { DashboardShell } from '../../components/layout/DashboardShell.jsx';
import { Card, CardContent } from '../../components/ui/Card.jsx';
import { Badge } from '../../components/ui/Badge.jsx';

export function DemoPage() {
  const demoEndpoints = [
    {
      method: 'GET',
      path: '/api/demo/ping',
      desc: 'Instant baseline response (200 OK) with minimal server overhead.',
      status: 'Ready',
    },
    {
      method: 'GET',
      path: '/api/demo/delayed?ms=250',
      desc: 'Simulated server latency benchmark (configurable delay parameter).',
      status: 'Ready',
    },
    {
      method: 'GET',
      path: '/api/demo/error?status=500',
      desc: 'Controlled fault injection to evaluate error handling & threshold triggers.',
      status: 'Ready',
    },
    {
      method: 'GET',
      path: '/api/demo/rate-limited',
      desc: 'Sliding-window rate limiter returning 429 when concurrency caps are hit.',
      status: 'Ready',
    },
  ];

  return (
    <DashboardShell
      title="Demo API Sandbox"
      subtitle="Isolated benchmark endpoints on port 5001 for repeatable, safe load testing"
    >
      <div className="space-y-6">
        <div className="p-4 rounded-xl border border-indigo-800/40 bg-indigo-950/20 text-xs text-indigo-300 flex items-start gap-3">
          <FlaskConical className="h-5 w-5 shrink-0 text-indigo-400 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-semibold block text-indigo-200 mb-0.5">Isolated Demo Environment</span>
            The Demo API runs on an independent port (`:5001`) separated from the management backend (`:5000`).
            This ensures that intensive load tests will never crash or degrade your dashboard or database operations.
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {demoEndpoints.map((ep, idx) => (
            <Card key={idx}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-850 font-bold">
                      {ep.method}
                    </span>
                    <span className="font-mono text-xs text-white">{ep.path}</span>
                  </div>
                  <Badge variant="success" size="sm">
                    {ep.status}
                  </Badge>
                </div>
                <p className="text-xs text-slate-400">{ep.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}

export default DemoPage;
