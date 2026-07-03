import { Area, AreaChart, ResponsiveContainer } from "recharts";

export function Sparkline({ data, positive = true }: { data: { nav: number }[]; positive?: boolean }) {
  const color = positive ? "#34D399" : "#F87171";
  return (
    <div className="h-12 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`sg-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.45} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="nav" stroke={color} strokeWidth={1.5} fill={`url(#sg-${color})`} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
