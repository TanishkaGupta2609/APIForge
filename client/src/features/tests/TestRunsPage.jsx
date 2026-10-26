import { Play, Shield } from 'lucide-react';
import { DashboardShell } from '../../components/layout/DashboardShell.jsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';

export function TestRunsPage() {
  return (
    <DashboardShell
      title="Run Load Test"
      subtitle="Configure synthetic workloads, virtual users, and execute native k6 tests"
    >
      <div className="max-w-3xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Workload Configuration</CardTitle>
            <CardDescription>
              Define your load test parameters. All tests run in supervised child workers with safe duration caps.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="p-4 rounded-lg bg-indigo-950/30 border border-indigo-800/40 text-xs text-indigo-300 flex items-start gap-3">
              <Shield className="h-4 w-4 shrink-0 text-indigo-400 mt-0.5" />
              <div>
                <span className="font-semibold block mb-0.5">Authoritative Safety Constraints</span>
                Maximum 500 Virtual Users (VUs) and 300 seconds duration are enforced to safeguard host resources.
              </div>
            </div>

            <div className="pt-2">
              <Button leftIcon={<Play className="h-4 w-4" />}>
                Configure Load Test
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}

export default TestRunsPage;
