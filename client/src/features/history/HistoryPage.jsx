import { History } from 'lucide-react';
import { DashboardShell } from '../../components/layout/DashboardShell.jsx';
import { Card, CardContent } from '../../components/ui/Card.jsx';

export function HistoryPage() {
  return (
    <DashboardShell
      title="Test History"
      subtitle="Inspect completed executions, compare latency percentiles, and export datasets"
    >
      <div className="space-y-6">
        <Card>
          <CardContent className="p-12 text-center">
            <div className="max-w-sm mx-auto space-y-3">
              <div className="h-12 w-12 rounded-xl bg-slate-800/50 border border-slate-700/60 flex items-center justify-center mx-auto text-slate-400">
                <History className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-semibold text-white">No historical records found</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Completed load tests with normalized metrics and throughput logs will be recorded here
                with pagination and comparison tools.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}

export default HistoryPage;
