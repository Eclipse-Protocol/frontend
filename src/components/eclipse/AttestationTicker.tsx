import { attestationTicker } from "@/lib/mock-data";
import { ShieldCheck } from "lucide-react";

export function AttestationTicker() {
  const items = [...attestationTicker, ...attestationTicker];
  return (
    <div className="relative w-full overflow-hidden border-y border-eclipse-border bg-eclipse-surface/60 py-3">
      <div className="marquee-track flex w-max gap-10 whitespace-nowrap font-mono text-xs text-eclipse-muted">
        {items.map((t, i) => (
          <span key={i} className="inline-flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-eclipse-purple" />
            {t}
            <span className="text-eclipse-purple">✓</span>
          </span>
        ))}
      </div>
    </div>
  );
}
