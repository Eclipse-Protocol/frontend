import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function PerformanceChart({ data, height = 320 }: { data: { t: string; nav: number }[]; height?: number }) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 12, bottom: 4, left: 4 }}>
          <defs>
            <linearGradient id="pcGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#A855F7" stopOpacity={0.55} />
              <stop offset="100%" stopColor="#A855F7" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis
            dataKey="t"
            tickFormatter={(t) => new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            stroke="#5c5570"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            minTickGap={40}
          />
          <YAxis stroke="#5c5570" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} domain={["auto", "auto"]} width={44} />
          <Tooltip
            contentStyle={{
              background: "#120E1F",
              border: "1px solid rgba(168,85,247,0.35)",
              borderRadius: 10,
              fontSize: 12,
              color: "#F5F3F7",
            }}
            labelFormatter={(t) => new Date(t as string).toLocaleString()}
            formatter={(v: number) => [v.toFixed(4), "NAV"]}
          />
          <Area type="monotone" dataKey="nav" stroke="#A855F7" strokeWidth={2} fill="url(#pcGrad)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
