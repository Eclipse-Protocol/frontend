import { Link } from "@tanstack/react-router";
import { formatUnits } from "viem";
import type { LiveVaultSummary } from "@/hooks/useLiveVaults";
import { AttestationBadge } from "./AttestationBadge";
import { Sparkline } from "./Sparkline";
import { Skeleton } from "@/components/ui/skeleton";
import { ALPHA_VAULT } from "@/lib/contracts";
import { LIVE_VAULT_ID } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const fmtUSD = (n: number) =>
  n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(2)}M`
    : n >= 1_000
      ? `$${(n / 1_000).toFixed(1)}k`
      : `$${n.toFixed(0)}`;

function fmtPct(n: number | undefined) {
  if (n === undefined) return "No data";
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function fmtAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function fmtAgo(timestampSec: bigint) {
  const ageSec = Math.floor(Date.now() / 1000) - Number(timestampSec);
  if (ageSec < 60) return "just now";
  if (ageSec < 3600) return `${Math.floor(ageSec / 60)} min ago`;
  if (ageSec < 86400) return `${Math.floor(ageSec / 3600)}h ago`;
  return `${Math.floor(ageSec / 86400)}d ago`;
}

export function VaultCard({ vault }: { vault: LiveVaultSummary }) {
  if (vault.error) {
    return (
      <div className="glass-card p-5">
        <div className="text-xs text-eclipse-muted">{vault.vaultAddress.slice(0, 10)}…</div>
        <div className="mt-1 text-lg font-semibold text-eclipse-text">
          {vault.name || "Unknown vault"}
        </div>
        <div className="mt-4 rounded-lg border border-eclipse-danger/40 bg-eclipse-danger/10 p-3 text-xs text-eclipse-danger">
          Could not read this vault's on-chain state right now.
        </div>
      </div>
    );
  }

  const tvl =
    vault.totalAssets !== undefined && vault.underlyingDecimals !== undefined
      ? fmtUSD(Number(formatUnits(vault.totalAssets, vault.underlyingDecimals)))
      : undefined;
  const bond =
    vault.bondDecimals !== undefined
      ? fmtUSD(Number(formatUnits(vault.bondAmount, vault.bondDecimals)))
      : undefined;
  const perf30d = vault.perf30dPct;
  const positive = (perf30d ?? 0) >= 0;
  const trustCount = Object.values(vault.trustChecks).filter(Boolean).length;

  // The vault detail page still resolves vaults by a fixed mock id, not by address — that page is
  // out of scope for this pass. Only the one vault it actually knows how to render is click-through;
  // any other registered strategy links out to the block explorer instead of a broken 404.
  const detailId =
    vault.vaultAddress.toLowerCase() === ALPHA_VAULT.address.toLowerCase() ? LIVE_VAULT_ID : null;

  const cardInner = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs text-eclipse-muted">
            {vault.pairLabel ?? "Loading…"}
            <span className="ml-2 rounded-full border border-eclipse-teal/40 bg-eclipse-teal/10 px-1.5 py-0.5 text-[10px] font-medium text-eclipse-teal">
              On-chain
            </span>
          </div>
          <div className="mt-1 text-lg font-semibold text-eclipse-text">{vault.name}</div>
          <div className="mt-0.5 font-mono text-[10px] text-eclipse-muted">
            {fmtAddress(vault.vaultAddress)}
          </div>
        </div>
        {vault.trustChecks.teeVerified ? (
          <AttestationBadge />
        ) : (
          <AttestationBadge
            label="Not Verified"
            className="border-eclipse-muted/40 bg-eclipse-muted/10 text-eclipse-muted shadow-none"
          />
        )}
      </div>

      <div
        className={cn(
          "mt-3 rounded-lg border px-3 py-2 text-[11px]",
          vault.trustChecks.teeVerified
            ? "border-eclipse-teal/30 bg-eclipse-teal/5 text-eclipse-text"
            : "border-eclipse-muted/30 bg-eclipse-muted/5 text-eclipse-muted",
        )}
      >
        <div className="flex items-center gap-1.5 font-medium">
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              vault.trustChecks.teeVerified ? "bg-eclipse-teal" : "bg-eclipse-muted",
            )}
          />
          {vault.trustChecks.teeVerified ? "TEE Verified" : "Not Verified"}
        </div>
        <div className="mt-1 text-eclipse-muted">
          {vault.trustChecks.teeVerified
            ? "Remote attestation confirmed · Verified by Flare FDC"
            : "No enclave signer registered for this vault yet"}
        </div>
      </div>

      <div className="mt-4">
        {vault.navSeries.length > 0 ? (
          <Sparkline data={vault.navSeries.slice(-40)} positive={positive} />
        ) : (
          <div className="flex h-12 items-center justify-center text-[11px] text-eclipse-muted">
            No epoch history yet
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-eclipse-muted">TVL</div>
          <div className="mt-0.5 font-mono text-sm text-eclipse-text">
            {tvl ?? <Skeleton className="h-4 w-14" />}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-eclipse-muted">Return</div>
          <div
            className={cn(
              "mt-0.5 font-mono text-sm",
              perf30d === undefined
                ? "text-eclipse-muted"
                : positive
                  ? "text-eclipse-teal"
                  : "text-eclipse-danger",
            )}
          >
            {fmtPct(perf30d)}
          </div>
          <div className="text-[10px] text-eclipse-muted">
            {vault.epochCount !== undefined
              ? `${vault.epochCount} epoch${vault.epochCount === 1 ? "" : "s"}`
              : "—"}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-eclipse-muted">
            Since inception
          </div>
          <div className="mt-0.5 font-mono text-sm text-eclipse-gold">
            {fmtPct(vault.perfAllPct)}
          </div>
        </div>
      </div>

      <div className="mt-4 border-t border-eclipse-border pt-3">
        <div className="flex items-center justify-between text-[11px] text-eclipse-muted">
          <span>
            Bond <span className="font-mono text-eclipse-text">{bond ?? "…"}</span>
          </span>
          <TrustPill count={trustCount} total={3} />
        </div>
        <div className="mt-2 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-eclipse-muted">
              Last trade
            </div>
            <div
              className={cn(
                "mt-0.5 text-xs font-medium",
                vault.liveStatus === "Live" ? "text-eclipse-teal" : "text-eclipse-text",
              )}
            >
              {vault.lastEpochTimestamp !== undefined
                ? fmtAgo(vault.lastEpochTimestamp)
                : "No trades yet"}
            </div>
          </div>
          {vault.tradesToday !== undefined && (
            <div className="text-right text-[11px] text-eclipse-muted">
              {vault.tradesToday} trade{vault.tradesToday === 1 ? "" : "s"} today
            </div>
          )}
        </div>
      </div>
    </>
  );

  if (detailId) {
    return (
      <Link
        to="/vaults/$id"
        params={{ id: detailId }}
        className="glass-card glass-card-hover group block p-5"
      >
        {cardInner}
      </Link>
    );
  }

  return (
    <a
      href={`https://coston2-explorer.flare.network/address/${vault.vaultAddress}`}
      target="_blank"
      rel="noreferrer"
      className="glass-card glass-card-hover group block p-5"
    >
      {cardInner}
    </a>
  );
}

/** Deliberately a count of independently-verifiable on-chain checks, not a synthesized "trust
 * score" — there's no disclosed methodology that would make a weighted 0-100 number honest. */
function TrustPill({ count, total }: { count: number; total: number }) {
  return (
    <span
      title="TEE verified · Bond locked · Active trader (on-chain checks)"
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
        count === total
          ? "border-eclipse-teal/40 bg-eclipse-teal/10 text-eclipse-teal"
          : "border-eclipse-muted/40 bg-eclipse-muted/10 text-eclipse-muted",
      )}
    >
      {count}/{total} checks
    </span>
  );
}

export function VaultCardSkeleton() {
  return (
    <div className="glass-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="w-2/3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-2 h-5 w-40" />
        </div>
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
      <Skeleton className="mt-4 h-12 w-full" />
      <div className="mt-4 grid grid-cols-3 gap-3">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-eclipse-border pt-3">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-12" />
      </div>
    </div>
  );
}
