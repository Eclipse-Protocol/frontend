import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

interface Props {
  label: string;
  value: string;
  delta?: number;
  hint?: string;
  className?: string;
  mono?: boolean;
}
export function StatCard({ label, value, delta, hint, className, mono = true }: Props) {
  const positive = (delta ?? 0) >= 0;
  return (
    <div className={cn("glass-card glass-card-hover p-5", className)}>
      <div className="text-xs uppercase tracking-wider text-eclipse-muted">{label}</div>
      <div className={cn("mt-2 text-2xl text-eclipse-text", mono && "font-mono")}>{value}</div>
      {typeof delta === "number" && (
        <div
          className={cn(
            "mt-2 inline-flex items-center gap-1 text-xs font-medium",
            positive ? "text-eclipse-teal" : "text-eclipse-danger",
          )}
        >
          {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {positive ? "+" : ""}
          {delta.toFixed(2)}%
        </div>
      )}
      {hint && <div className="mt-1 text-xs text-eclipse-muted">{hint}</div>}
    </div>
  );
}
