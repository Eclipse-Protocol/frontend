import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/eclipse/AppShell";
import { AttestationBadge } from "@/components/eclipse/AttestationBadge";
import { LiveIndicator } from "@/components/eclipse/LiveIndicator";
import { PerformanceChart } from "@/components/eclipse/PerformanceChart";
import {
  LiveHeaderMeta,
  LiveStatCards,
  LiveMetadataRows,
  LivePerformanceLedger,
  LiveDepositPanel,
} from "@/components/eclipse/LiveVault";
import { LiveTradeFeed, LiveHarvestHistory } from "@/components/eclipse/LiveTradeFeed";
import { LIVE_VAULT_ID } from "@/lib/mock-data";
import { useReadContract } from "wagmi";
import { ALPHA_VAULT, ENCLAVE_REGISTRY } from "@/lib/contracts";
import { useLiveVaults } from "@/hooks/useLiveVaults";
import { useVaultActivity } from "@/hooks/useVaultActivity";
import { ArrowLeft, ExternalLink, X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/vaults/$id")({
  loader: ({ params }) => {
    // Only one real vault is deployed right now (see StrategyRegistry.strategyCount() on the
    // marketplace page) — this route resolves it by a fixed id rather than by address until the
    // registry has more than one entry worth routing between.
    if (params.id !== LIVE_VAULT_ID) throw notFound();
    return {};
  },
  head: () => ({
    meta: [
      { title: "Eclipse Alpha Vault — Eclipse Protocol" },
      {
        name: "description",
        content:
          "FDC-verified autonomous trading vault on Coston2 testnet — real on-chain enclave registration, documented-mock TEE claim.",
      },
    ],
  }),
  component: VaultDetail,
});

function VaultDetail() {
  const [proofOpen, setProofOpen] = useState(false);
  const [range, setRange] = useState<"24h" | "7d" | "30d" | "All">("30d");

  const { vaults } = useLiveVaults();
  const vault = useMemo(
    () => vaults.find((v) => v.vaultAddress.toLowerCase() === ALPHA_VAULT.address.toLowerCase()),
    [vaults],
  );

  const {
    trades,
    harvests,
    isLoading: activityLoading,
    error: activityError,
  } = useVaultActivity(ALPHA_VAULT.address, vault?.epochTimestamps);

  const chartData = useMemo(() => {
    if (!vault) return [];
    const rows = vault.epochTimestamps.map((ts, i) => ({
      t: new Date(Number(ts) * 1000).toISOString(),
      nav: vault.navSeries[i]?.nav ?? 0,
    }));
    const now = Date.now();
    const cutoffMs =
      range === "24h"
        ? 86_400_000
        : range === "7d"
          ? 7 * 86_400_000
          : range === "30d"
            ? 30 * 86_400_000
            : Infinity;
    return rows.filter((r) => now - new Date(r.t).getTime() <= cutoffMs);
  }, [vault, range]);

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-6 pt-8">
        <Link
          to="/vaults"
          className="inline-flex items-center gap-1.5 text-sm text-eclipse-muted hover:text-eclipse-text"
        >
          <ArrowLeft className="h-4 w-4" /> Back to vaults
        </Link>

        <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-tight text-eclipse-text md:text-4xl">
                {vault?.name ?? "Eclipse Alpha Vault"}
              </h1>
              {vault?.liveStatus === "Live" && <LiveIndicator label="Live" />}
              {vault?.liveStatus === "Delayed" && (
                <LiveIndicator
                  label="Delayed"
                  className="text-eclipse-gold [&>.live-dot]:bg-eclipse-gold"
                />
              )}
              {vault?.liveStatus === "Offline" && (
                <LiveIndicator
                  label="Offline"
                  className="text-eclipse-danger [&>.live-dot]:bg-eclipse-danger"
                />
              )}
              {(vault?.liveStatus === "No data" || !vault) && (
                <span className="text-xs text-eclipse-muted">No trades yet</span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-eclipse-muted">
              <LiveHeaderMeta />
            </div>
            <div className="mt-1 font-mono text-[11px] text-eclipse-muted">
              {ALPHA_VAULT.address}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {vault?.trustChecks.teeVerified ? (
              <AttestationBadge />
            ) : (
              <AttestationBadge
                label="Not Verified"
                className="border-eclipse-muted/40 bg-eclipse-muted/10 text-eclipse-muted shadow-none"
              />
            )}
            <button
              onClick={() => setProofOpen(true)}
              className="text-sm text-eclipse-purple hover:text-eclipse-purple-bright underline-offset-4 hover:underline"
            >
              View Attestation Proof →
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-8 grid max-w-7xl gap-6 px-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-wider text-eclipse-muted">
                  NAV Performance
                </div>
                <div className="mt-1 font-mono text-2xl text-eclipse-text">
                  {chartData.at(-1)?.nav.toFixed(4) ?? "—"}
                </div>
              </div>
              <div className="inline-flex rounded-lg border border-eclipse-border bg-eclipse-surface p-1">
                {(["24h", "7d", "30d", "All"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className={cn(
                      "rounded-md px-3 py-1 text-xs",
                      range === r
                        ? "bg-eclipse-purple/20 text-eclipse-text"
                        : "text-eclipse-muted hover:text-eclipse-text",
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            {chartData.length > 0 ? (
              <PerformanceChart data={chartData} />
            ) : (
              <div className="flex h-[320px] items-center justify-center text-sm text-eclipse-muted">
                No epochs in this window yet
              </div>
            )}
          </div>

          <LiveStatCards />

          {/* Live Trade Feed */}
          <div className="glass-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-eclipse-border px-5 py-4">
              <div>
                <div className="text-sm font-semibold text-eclipse-text">Live Trade Feed</div>
                <div className="text-xs text-eclipse-muted">
                  Signed by the enclave. Strategy reasoning never leaves the TEE.
                </div>
              </div>
              <LiveIndicator />
            </div>
            <LiveTradeFeed
              trades={trades}
              underlyingSymbol={vault?.underlyingSymbol}
              underlyingDecimals={vault?.underlyingDecimals}
              isLoading={activityLoading}
              error={activityError}
            />
          </div>

          {/* Performance ledger */}
          <details className="glass-card group" open>
            <summary className="cursor-pointer list-none px-5 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-eclipse-text">Performance Ledger</div>
                  <div className="text-xs text-eclipse-muted">
                    Hash-chained epoch commitments. Reconstruct history block by block.
                  </div>
                </div>
                <span className="text-xs text-eclipse-muted group-open:hidden">expand</span>
                <span className="hidden text-xs text-eclipse-muted group-open:inline">
                  collapse
                </span>
              </div>
            </summary>
            <div className="border-t border-eclipse-border">
              <LivePerformanceLedger />
            </div>
          </details>

          {/* Harvest history */}
          <details className="glass-card group">
            <summary className="cursor-pointer list-none px-5 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-eclipse-text">Harvest History</div>
                  <div className="text-xs text-eclipse-muted">
                    Every performance-fee mint, 3% treasury / 7% strategist, on a new high.
                  </div>
                </div>
                <span className="text-xs text-eclipse-muted group-open:hidden">expand</span>
                <span className="hidden text-xs text-eclipse-muted group-open:inline">
                  collapse
                </span>
              </div>
            </summary>
            <div className="border-t border-eclipse-border">
              <LiveHarvestHistory
                harvests={harvests}
                shareDecimals={vault?.shareDecimals}
                isLoading={activityLoading}
              />
            </div>
          </details>

          <div className="glass-card p-5">
            <div className="text-sm font-semibold text-eclipse-text">Risk parameters</div>
            <LiveMetadataRows />
          </div>
        </div>

        {/* Right: deposit/withdraw */}
        <aside className="space-y-6">
          <LiveDepositPanel />
        </aside>
      </div>

      {proofOpen && <ProofModal onClose={() => setProofOpen(false)} />}
    </AppShell>
  );
}

function ProofModal({ onClose }: { onClose: () => void }) {
  const signer = useReadContract({
    ...ENCLAVE_REGISTRY,
    functionName: "signerOf",
    args: [ALPHA_VAULT.address],
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="glass-card w-full max-w-lg p-6"
        style={{ background: "#120E1F" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-widest text-eclipse-gold">
              Attestation Proof
            </div>
            <h3 className="mt-1 text-lg font-semibold text-eclipse-text">Eclipse Alpha Vault</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-eclipse-muted hover:bg-eclipse-purple/10 hover:text-eclipse-text"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <dl className="mt-5 space-y-3 font-mono text-xs">
          <ProofRow
            k="Enclave signer (EnclaveRegistry.signerOf)"
            v={signer.isLoading ? "Loading…" : (signer.data ?? "Not registered")}
          />
          <ProofRow k="AlphaVault" v={ALPHA_VAULT.address} link />
        </dl>
        <div className="mt-5 rounded-lg border border-eclipse-purple/30 bg-eclipse-purple/10 p-3 text-xs text-eclipse-text">
          This is the enclave signer address registered on-chain via a real FDC Web2Json
          attestation. Trade instructions submitted to this vault must be signed by this key. Code
          measurement and per-attestation FDC tx hash aren't stored on-chain by the current
          contracts, so they can't be displayed here yet.
        </div>
      </div>
    </div>
  );
}

function ProofRow({ k, v, link }: { k: string; v: string; link?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-eclipse-border/70 pb-2">
      <dt className="text-eclipse-muted">{k}</dt>
      <dd
        className={cn("text-right break-all", link ? "text-eclipse-purple" : "text-eclipse-text")}
      >
        {link ? (
          <a
            href={`https://coston2-explorer.flare.network/address/${v}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 hover:underline"
          >
            {v} <ExternalLink className="h-3 w-3" />
          </a>
        ) : (
          v
        )}
      </dd>
    </div>
  );
}
