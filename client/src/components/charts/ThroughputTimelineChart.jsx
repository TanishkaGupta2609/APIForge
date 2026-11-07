import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-900/95 p-2.5 shadow-xl backdrop-blur-md">
        <div className="text-xs font-semibold text-slate-300">Elapsed: {label}</div>
        <div className="mt-1 space-y-0.5 text-xs font-mono">
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-slate-400">{entry.name}:</span>
              <span className="font-bold text-white">
                {entry.value} {entry.name === 'Throughput' ? 'req/s' : 'VUs'}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
}

export function ThroughputTimelineChart({ data = [] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-xs text-slate-500 font-mono">
        No execution timeline series available
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
          <defs>
            <linearGradient id="colorRps" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="colorVus" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
          <XAxis
            dataKey="time"
            stroke="#64748B"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: '#334155' }}
          />
          <YAxis
            yAxisId="left"
            stroke="#64748B"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: '#334155' }}
            unit=" rps"
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="#64748B"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: '#334155' }}
            unit=" VUs"
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value) => (
              <span className="text-xs font-medium text-slate-300">{value}</span>
            )}
          />
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="requestsPerSecond"
            name="Throughput"
            stroke="#6366F1"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorRps)"
          />
          <Area
            yAxisId="right"
            type="stepAfter"
            dataKey="vus"
            name="Virtual Users"
            stroke="#10B981"
            strokeWidth={2}
            strokeDasharray="4 4"
            fillOpacity={1}
            fill="url(#colorVus)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default ThroughputTimelineChart;
