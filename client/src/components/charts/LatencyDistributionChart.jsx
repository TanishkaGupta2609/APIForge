import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';

const PERCENTILE_COLORS = {
  Min: '#34D399',
  Med: '#60A5FA',
  Avg: '#818CF8',
  p90: '#A78BFA',
  p95: '#F59E0B',
  Max: '#F87171',
};

function CustomTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-900/95 p-2.5 shadow-xl backdrop-blur-md">
        <div className="text-xs font-semibold text-slate-200">{data.label || data.name}</div>
        <div className="mt-1 text-sm font-mono font-bold text-indigo-400">
          {data.latency} <span className="text-xs text-slate-400">ms</span>
        </div>
      </div>
    );
  }
  return null;
}

export function LatencyDistributionChart({ data = [] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-xs text-slate-500 font-mono">
        No latency distribution data available
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
          <XAxis
            dataKey="name"
            stroke="#64748B"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: '#334155' }}
          />
          <YAxis
            stroke="#64748B"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: '#334155' }}
            unit="ms"
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="latency" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={PERCENTILE_COLORS[entry.name] || '#6366F1'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default LatencyDistributionChart;
