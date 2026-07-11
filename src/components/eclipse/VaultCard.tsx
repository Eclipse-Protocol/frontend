import { Link } from "@tanstack/react-router";
import type { Vault } from "@/lib/types";
import { AttestationBadge } from "./AttestationBadge";
import { LiveIndicator } from "./LiveIndicator";
import { Sparkline } from "./Sparkline";
import { cn } from "@/lib/utils";

const fmtUSD = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : n >= 1_000 ? `$${(n / 1_000).toFixed(1)}k` : `$${n.toFixed(0)}`;

export function VaultCard({ vault }: { vault: Vault }) {
  const positive = vault.perf30d >= 0;
  return (
    <Link
      to="/vaults/$id"
      params={{ id: vault.id }}
      className="glass-card glass-card-hover group block p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs text-eclipse-muted">
            {vault.assetPair} · {vault.riskTier}
            {vault.isLive && <span className="ml-2 rounded-full border border-eclipse-teal/40 bg-eclipse-teal/10 px-1.5 py-0.5 text-[10px] font-medium text-eclipse-teal">On-chain</span>}
          </div>
          <div className="mt-1 text-lg font-semibold text-eclipse-text">{vault.name}</div>
        </div>
        <AttestationBadge />
      </div>

      <div className="mt-4">
        <Sparkline data={vault.navHistory.slice(-40)} positive={positive} />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-eclipse-muted">TVL</div>
          <div className="mt-0.5 font-mono text-sm text-eclipse-text">{fmtUSD(vault.tvl)}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-eclipse-muted">30d</div>
          <div className={cn("mt-0.5 font-mono text-sm", positive ? "text-eclipse-teal" : "text-eclipse-danger")}>
            {positive ? "+" : ""}
            {vault.perf30d.toFixed(2)}%
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-eclipse-muted">APY</div>
          <div className="mt-0.5 font-mono text-sm text-eclipse-gold">{vault.apy.toFixed(1)}%</div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-eclipse-border pt-3">
        <div className="text-[11px] text-eclipse-muted">
          Bond <span className="font-mono text-eclipse-text">{fmtUSD(vault.bond)}</span>
        </div>
        <LiveIndicator label="Live" />
      </div>
    </Link>
  );
}
