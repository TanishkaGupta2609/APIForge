import { Server, Plus } from 'lucide-react';
import { DashboardShell } from '../../components/layout/DashboardShell.jsx';
import { Card, CardContent } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';

export function TargetsPage() {
  return (
    <DashboardShell
      title="Target APIs"
      subtitle="Manage registered endpoints approved for load-testing with SSRF validation"
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-white">Registered Targets</h3>
            <p className="text-xs text-slate-400">Endpoints configured for synthetic workload testing</p>
          </div>
          <Button size="sm" leftIcon={<Plus className="h-4 w-4" />}>
            Add Target
          </Button>
        </div>

        <Card>
          <CardContent className="p-12 text-center">
            <div className="max-w-sm mx-auto space-y-3">
              <div className="h-12 w-12 rounded-xl bg-slate-800/50 border border-slate-700/60 flex items-center justify-center mx-auto text-slate-400">
                <Server className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-semibold text-white">No targets registered</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Add your first API endpoint. APIForge validates hostnames to protect internal networks
                against loopback and private IP SSRF attacks.
              </p>
              <div className="pt-2">
                <Button size="sm" leftIcon={<Plus className="h-4 w-4" />}>
                  Register New Target
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}

export default TargetsPage;
