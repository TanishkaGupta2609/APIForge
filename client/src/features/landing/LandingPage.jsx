import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ShieldCheck,
  Zap,
  BarChart2,
  Clock,
  Server,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { Navbar } from '../../components/layout/Navbar.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import apiClient from '../../services/apiClient.js';

export function LandingPage() {
  const [serverStatus, setServerStatus] = useState('online');

  useEffect(() => {
    apiClient
      .get('/health')
      .then((res) => {
        if (res?.data?.status === 'healthy') setServerStatus('online');
      })
      .catch(() => setServerStatus('offline'));
  }, []);

  const features = [
    {
      icon: Zap,
      title: 'Native k6 Load Engine',
      description:
        'Executes native Grafana k6 runner processes via controlled workers. Zero fabricated numbers or simulated estimations.',
    },
    {
      icon: BarChart2,
      title: 'High-Precision Metrics',
      description:
        'Computes RPS, average, median, p90, and p95 latencies, along with HTTP error distributions and status code breakdowns.',
    },
    {
      icon: ShieldCheck,
      title: 'Multi-Layer SSRF Defense',
      description:
        'Pre-flight DNS validation prevents requests to loopback addresses, RFC 1918 private subnets, and cloud metadata services.',
    },
    {
      icon: Clock,
      title: 'Run History & Comparisons',
      description:
        'Maintain historical audit trails across deployments, compare multiple benchmarks, and export clean CSV/JSON reports.',
    },
    {
      icon: Server,
      title: 'Built-in Demo Sandbox',
      description:
        'Benchmark against an isolated local sandbox supporting artificial latency injection, simulated faults, and rate limiting.',
    },
    {
      icon: Lock,
      title: 'Scoped Authorization',
      description:
        'Strict tenant boundaries guarantee that targets, test runs, and performance reports are visible only to authorized owners.',
    },
  ];

  const workflowSteps = [
    {
      step: '01',
      title: 'Configure API Target',
      description: 'Register your base endpoint, headers, and description with pre-flight URL and SSRF validation.',
    },
    {
      step: '02',
      title: 'Define Workload Profile',
      description: 'Choose HTTP method, endpoint path, virtual user count (1–500), and test duration (up to 300s).',
    },
    {
      step: '03',
      title: 'Spawn Native k6 Process',
      description: 'APIForge compiles a sanitized load script and spawns a supervised k6 worker in the background.',
    },
    {
      step: '04',
      title: 'Analyze Normalized Metrics',
      description: 'Inspect latency distributions, throughput cards, error percentages, and export verified datasets.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-600 selection:text-white">
      <Navbar serverStatus={serverStatus} />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 lg:pt-24 lg:pb-32 border-b border-slate-900">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-indigo-950/80 text-indigo-300 border border-indigo-800/60 mb-8 backdrop-blur-sm">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>MERN Stack + k6 Engine</span>
            <span>•</span>
            <span className="text-slate-400">5th-Semester Capstone Project</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Stress-Test APIs with{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-indigo-300 to-purple-400">
              Real Workloads.
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            APIForge gives engineering teams complete confidence in API scalability. Execute controlled
            k6 load tests, monitor live run states, and extract authentic latency percentiles without fabricated metrics.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/dashboard">
              <Button size="lg" className="w-full sm:w-auto" rightIcon={<ArrowRight className="h-4 w-4" />}>
                Launch Dashboard
              </Button>
            </Link>
            <Link to="/demo">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                Explore Demo Sandbox
              </Button>
            </Link>
          </div>

          {/* Interactive Metric Preview Banner */}
          <div className="mt-16 p-4 rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-sm text-left shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 text-xs">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-rose-500/80" />
                <span className="h-3 w-3 rounded-full bg-amber-500/80" />
                <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
                <span className="font-mono text-slate-400 ml-2">k6 run --summary-export=summary.json test.js</span>
              </div>
              <Badge status="running" dot />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/60">
                <div className="text-[11px] text-slate-400 font-medium">Virtual Users</div>
                <div className="text-xl font-bold text-white mt-1">250 VUs</div>
                <div className="text-[10px] text-indigo-400 mt-0.5">Ramp-up profile</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/60">
                <div className="text-[11px] text-slate-400 font-medium">Throughput</div>
                <div className="text-xl font-bold text-emerald-400 mt-1">1,842 RPS</div>
                <div className="text-[10px] text-slate-400 mt-0.5">99.8% Success Rate</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/60">
                <div className="text-[11px] text-slate-400 font-medium">Average Latency</div>
                <div className="text-xl font-bold text-white mt-1">28.4 ms</div>
                <div className="text-[10px] text-emerald-400 mt-0.5">-4.2 ms vs baseline</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/60">
                <div className="text-[11px] text-slate-400 font-medium">p95 Latency</div>
                <div className="text-xl font-bold text-amber-400 mt-1">54.1 ms</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Max: 112.0 ms</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Section */}
      <section id="features" className="py-20 border-b border-slate-900 bg-slate-950/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-semibold text-indigo-400 tracking-wider uppercase">
              Engineered for Scalability
            </h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-white">
              Professional Architecture. Authentic Results.
            </p>
            <p className="mt-3 text-sm text-slate-400">
              Built from first principles following industry best practices for distributed load testing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <Card key={idx} className="hover:border-slate-700 transition duration-150">
                  <CardHeader>
                    <div className="h-10 w-10 rounded-lg bg-indigo-950/70 text-indigo-400 border border-indigo-800/60 flex items-center justify-center mb-2">
                      <Icon className="h-5 w-5" />
                    </div>
                    <CardTitle>{feature.title}</CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works Workflow */}
      <section id="workflow" className="py-20 border-b border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-semibold text-indigo-400 tracking-wider uppercase">
              Execution Lifecycle
            </h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-white">
              From Configuration to Stored Metrics
            </p>
            <p className="mt-3 text-sm text-slate-400">
              How APIForge orchestrates safe, repeatable load tests.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {workflowSteps.map((step, idx) => (
              <div
                key={idx}
                className="relative rounded-xl border border-slate-800 bg-slate-900/30 p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="text-2xl font-black text-indigo-500/50 mb-3 font-mono">{step.step}</div>
                  <h3 className="text-sm font-semibold text-white mb-2">{step.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Responsible Testing & Security */}
      <section className="py-16 bg-slate-900/30 border-b border-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <ShieldCheck className="h-10 w-10 text-emerald-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white tracking-tight">Responsible Load Testing Policy</h2>
          <p className="mt-3 text-xs sm:text-sm text-slate-400 leading-relaxed max-w-2xl mx-auto">
            APIForge enforces mandatory target authorization, conservative concurrency bounds, and strict private network
            filters. Only test APIs that you own or have explicit authorization to benchmark.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Max 500 VUs</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Max 300s Duration</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> RFC 1918 Blocked</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Secret Masking</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-10 bg-slate-950 text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-indigo-600 flex items-center justify-center font-bold text-white text-xs">
              ⚡
            </div>
            <span className="font-semibold text-slate-300">APIForge</span>
            <span>— 5th-Semester Capstone Project</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/dashboard" className="hover:text-slate-300 transition">Dashboard</Link>
            <Link to="/targets" className="hover:text-slate-300 transition">Targets</Link>
            <Link to="/tests" className="hover:text-slate-300 transition">Tests</Link>
            <Link to="/demo" className="hover:text-slate-300 transition">Demo API</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
