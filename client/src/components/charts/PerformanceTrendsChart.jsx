import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-900/95 p-3 shadow-xl backdrop-blur-md text-xs">
        <div className="font-semibold text-white truncate max-w-[200px]">{data.name}</div>
        <div className="text-[11px] text-slate-400 font-mono mt-0.5">{label}</div>
        <div className="mt-2 space-y-1 font-mono">
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span>{entry.name}:</span>
              </span>
              <span className="font-bold text-white">
                {entry.value} {entry.name === 'Throughput' ? 'req/s' : 'ms'}
              </span>
            </div>
          ))}
          {data.failureRate !== undefined && (
            <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-800 text-[11px]">
              <span className="text-slate-400">Error Rate:</span>
              <span className={data.failureRate > 0 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                {data.failureRate}%
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
}

export function PerformanceTrendsChart({ data = [] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-xs text-slate-500 font-mono">
        No completed test run history available for trends
      </div>
    );
  }

  // Format chart series data
  const formattedData = data.map((d, index) => {
    const dateStr = d.createdAt ? new Date(d.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) : `#${index + 1}`;
    return {
      ...d,
      displayDate: dateStr,
      Throughput: d.requestsPerSecond != null ? Number(d.requestsPerSecond.toFixed(1)) : 0,
      'Avg Latency': d.avgLatency != null ? Number(d.avgLatency.toFixed(1)) : 0,
      'p95 Latency': d.p95Latency != null ? Number(d.p95Latency.toFixed(1)) : 0,
    };
  });

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={formattedData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
          <XAxis
            dataKey="displayDate"
            stroke="#64748B"
            tick={{ fill: '#64748B', fontSize: 11 }}
            tickLine={{ stroke: '#1E293B' }}
          />
          <YAxis
            stroke="#64748B"
            tick={{ fill: '#64748B', fontSize: 11 }}
            tickLine={{ stroke: '#1E293B' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            wrapperStyle={{ paddingBottom: '10px', fontSize: '11px' }}
          />
          <Line
            type="monotone"
            dataKey="Throughput"
            stroke="#6366F1"
            strokeWidth={2}
            dot={{ r: 3, fill: '#6366F1' }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="Avg Latency"
            stroke="#06B6D4"
            strokeWidth={2}
            dot={{ r: 3, fill: '#06B6D4' }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="p95 Latency"
            stroke="#F59E0B"
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={{ r: 3, fill: '#F59E0B' }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default PerformanceTrendsChart;

