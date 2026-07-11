import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/eclipse/AppShell";
import { AttestationBadge } from "@/components/eclipse/AttestationBadge";
import { LiveIndicator } from "@/components/eclipse/LiveIndicator";
import { PerformanceChart } from "@/components/eclipse/PerformanceChart";
import { StatCard } from "@/components/eclipse/StatCard";
import {
  LiveHeaderMeta,
  LiveStatCards,
  LiveMetadataRows,
  LivePerformanceLedger,
  LiveTradeFeedNotice,
  LiveDepositPanel,
} from "@/components/eclipse/LiveVault";
import { getVault, mockEpochs, mockTrades } from "@/lib/mock-data";
import { useReadContract } from "wagmi";
import { ALPHA_VAULT, ENCLAVE_REGISTRY } from "@/lib/contracts";
import { ArrowLeft, ArrowDownRight, ArrowUpRight, ExternalLink, Lock, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/vaults/$id")({
  loader: ({ params }) => {
    const vault = getVault(params.id);
    if (!vault) throw notFound();
    return { vault };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Vault not found — Eclipse Protocol" }] };
    return {
      meta: [
        { title: `${loaderData.vault.name} — Eclipse Protocol` },
        { name: "description", content: `${loaderData.vault.name} · ${loaderData.vault.assetPair} · TEE-attested vault.` },
        { property: "og:title", content: `${loaderData.vault.name} — Eclipse Protocol` },
        { property: "og:description", content: `${loaderData.vault.name} · ${loaderData.vault.assetPair} · TEE-attested vault.` },
      ],
    };
  },
  component: VaultDetail,
});

const fmtUSD = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : n >= 1_000 ? `$${(n / 1_000).toFixed(1)}k` : `$${n.toFixed(2)}`;

function VaultDetail() {
  const { vault } = Route.useLoaderData();
  const [range, setRange] = useState<"24h" | "7d" | "30d" | "All">("30d");
  const [proofOpen, setProofOpen] = useState(false);
  const trades = useMemo(() => mockTrades(vault.id), [vault.id]);
  const epochs = useMemo(() => mockEpochs(vault.id), [vault.id]);

  const chartData = useMemo(() => {
    const n = range === "24h" ? 8 : range === "7d" ? 28 : range === "30d" ? 60 : vault.navHistory.length;
    return vault.navHistory.slice(-n);
  }, [vault.navHistory, range]);

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-6 pt-8">
        <Link to="/vaults" className="inline-flex items-center gap-1.5 text-sm text-eclipse-muted hover:text-eclipse-text">
          <ArrowLeft className="h-4 w-4" /> Back to vaults
        </Link>

        <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-tight text-eclipse-text md:text-4xl">{vault.name}</h1>
              <LiveIndicator />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-eclipse-muted">
              {vault.isLive ? (
                <LiveHeaderMeta />
              ) : (
                <>
                  <span>{vault.assetPair}</span>
                  <span>·</span>
                  <span>{vault.riskTier}</span>
                  <span>·</span>
                  <span className="font-mono text-xs">Strategist {vault.strategist}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <AttestationBadge />
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
          {vault.isLive ? (
            <div className="glass-card p-5">
              <div className="text-xs uppercase tracking-wider text-eclipse-muted">NAV Performance</div>
              <p className="mt-2 max-w-lg text-sm text-eclipse-muted">
                On-chain price-per-share history builds up as{" "}
                <code className="rounded bg-eclipse-bg/60 px-1 py-0.5 text-eclipse-purple">PerformanceLedger.commitEpoch()</code> runs.
                See current price per share and epoch history below.
              </p>
            </div>
          ) : (
            <div className="glass-card p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wider text-eclipse-muted">NAV Performance</div>
                  <div className="mt-1 font-mono text-2xl text-eclipse-text">
                    {chartData.at(-1)?.nav.toFixed(4)}
                  </div>
                </div>
                <div className="inline-flex rounded-lg border border-eclipse-border bg-eclipse-surface p-1">
                  {(["24h", "7d", "30d", "All"] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setRange(r)}
                      className={cn(
                        "rounded-md px-3 py-1 text-xs",
                        range === r ? "bg-eclipse-purple/20 text-eclipse-text" : "text-eclipse-muted hover:text-eclipse-text",
                      )}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <PerformanceChart data={chartData} />
            </div>
          )}

          {vault.isLive ? (
            <LiveStatCards />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              <StatCard label="TVL" value={fmtUSD(vault.tvl)} />
              <StatCard label="All-time return" value={`+${vault.perfAll.toFixed(2)}%`} delta={vault.perfAll} />
              <StatCard label="Current epoch P&L" value={`${vault.epochPnl >= 0 ? "+" : ""}${vault.epochPnl.toFixed(2)}%`} delta={vault.epochPnl} />
              <StatCard label="Strategist bond" value={fmtUSD(vault.bond)} hint="At risk of slashing" />
              <StatCard label="Max drawdown" value={`${vault.maxDrawdown.toFixed(2)}%`} />
              <StatCard label="APY (30d ann.)" value={`${vault.apy.toFixed(1)}%`} />
            </div>
          )}

          {/* Live Trade Feed */}
          <div className="glass-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-eclipse-border px-5 py-4">
              <div>
                <div className="text-sm font-semibold text-eclipse-text">Live Trade Feed</div>
                <div className="text-xs text-eclipse-muted">Signed by the enclave. Strategy reasoning never leaves the TEE.</div>
              </div>
              <LiveIndicator />
            </div>
            {vault.isLive ? (
              <LiveTradeFeedNotice />
            ) : (
              <div className="max-h-[420px] overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-eclipse-surface/60 text-[11px] uppercase tracking-wider text-eclipse-muted">
                    <tr>
                      <th className="px-5 py-2 font-medium">Time</th>
                      <th className="px-3 py-2 font-medium">Side</th>
                      <th className="px-3 py-2 font-medium">Pair</th>
                      <th className="px-3 py-2 font-medium text-right">Size</th>
                      <th className="px-3 py-2 font-medium">Tx</th>
                      <th className="px-5 py-2 font-medium">Sig</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono text-xs">
                    {trades.map((t) => (
                      <tr key={t.id} className="border-t border-eclipse-border/70 hover:bg-eclipse-purple/5">
                        <td className="px-5 py-2.5 text-eclipse-muted">{new Date(t.ts).toLocaleTimeString()}</td>
                        <td className="px-3 py-2.5">
                          <span className={cn("inline-flex items-center gap-1", t.side === "BUY" ? "text-eclipse-teal" : "text-eclipse-danger")}>
                            {t.side === "BUY" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                            {t.side}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-eclipse-text">{t.pair}</td>
                        <td className="px-3 py-2.5 text-right text-eclipse-text">${t.size.toLocaleString()}</td>
                        <td className="px-3 py-2.5">
                          <a href="#" className="inline-flex items-center gap-1 text-eclipse-purple hover:underline">
                            {t.txHash.slice(0, 8)}…{t.txHash.slice(-4)}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </td>
                        <td className="px-5 py-2.5">
                          <span className="inline-flex items-center gap-1 text-eclipse-purple">
                            <Lock className="h-3 w-3" /> verified
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Performance ledger */}
          <details className="glass-card group" open>
            <summary className="cursor-pointer list-none px-5 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-eclipse-text">Performance Ledger</div>
                  <div className="text-xs text-eclipse-muted">Hash-chained epoch commitments. Reconstruct history block by block.</div>
                </div>
                <span className="text-xs text-eclipse-muted group-open:hidden">expand</span>
                <span className="hidden text-xs text-eclipse-muted group-open:inline">collapse</span>
              </div>
            </summary>
            {vault.isLive ? (
              <div className="border-t border-eclipse-border">
                <LivePerformanceLedger />
              </div>
            ) : (
              <div className="max-h-[360px] overflow-auto border-t border-eclipse-border">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="bg-eclipse-surface/60 text-[10px] uppercase tracking-wider text-eclipse-muted">
                    <tr>
                      <th className="px-5 py-2 font-medium">Epoch</th>
                      <th className="px-3 py-2 font-medium">Time</th>
                      <th className="px-3 py-2 font-medium text-right">NAV</th>
                      <th className="px-3 py-2 font-medium">Prev hash</th>
                      <th className="px-5 py-2 font-medium">Hash</th>
                    </tr>
                  </thead>
                  <tbody>
                    {epochs.map((e) => (
                      <tr key={e.epoch} className="border-t border-eclipse-border/70">
                        <td className="px-5 py-2 text-eclipse-gold">#{e.epoch}</td>
                        <td className="px-3 py-2 text-eclipse-muted">{new Date(e.ts).toLocaleString()}</td>
                        <td className="px-3 py-2 text-right text-eclipse-text">{e.nav.toFixed(6)}</td>
                        <td className="px-3 py-2 text-eclipse-muted">{e.prevHash}</td>
                        <td className="px-5 py-2 text-eclipse-purple">{e.hash}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </details>

          <div className="glass-card p-5">
            <div className="text-sm font-semibold text-eclipse-text">Risk parameters</div>
            {vault.isLive ? (
              <LiveMetadataRows />
            ) : (
              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                <Row k="Max position size" v={`${vault.maxPosition}% of TVL`} />
                <Row k="Drawdown circuit breaker" v={`${vault.drawdownBreaker}% halts trading`} />
                <Row k="Management fee" v={`${vault.managementFee}% annual`} />
                <Row k="Performance fee" v={`${vault.performanceFee}% of profits`} />
              </dl>
            )}
          </div>
        </div>

        {/* Right: deposit/withdraw */}
        <aside className="space-y-6">
          {vault.isLive ? <LiveDepositPanel /> : <DepositPanel vault={vault} />}
        </aside>
      </div>

      {proofOpen && <ProofModal vault={vault} onClose={() => setProofOpen(false)} />}
    </AppShell>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between border-b border-eclipse-border/60 py-2 text-sm">
      <dt className="text-eclipse-muted">{k}</dt>
      <dd className="font-mono text-eclipse-text">{v}</dd>
    </div>
  );
}

function DepositPanel({ vault }: { vault: { name: string } }) {
  const [tab, setTab] = useState<"Deposit" | "Withdraw">("Deposit");
  const [amount, setAmount] = useState("");
  const [token, setToken] = useState("USDC");
  const [connected, setConnected] = useState(false);

  const shares = amount ? (parseFloat(amount) / 1.0421).toFixed(4) : "0.0000";

  function submit() {
    if (!connected) return setConnected(true);
    if (!amount) return;
    toast.success(`${tab} initiated`, {
      description: `${amount} ${token} → ${vault.name}`,
    });
    setAmount("");
  }

  return (
    <div className="glass-card sticky top-24 p-5">
      <div className="mb-4 inline-flex w-full rounded-lg border border-eclipse-border bg-eclipse-surface p-1">
        {(["Deposit", "Withdraw"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-sm",
              tab === t ? "bg-eclipse-purple/20 text-eclipse-text" : "text-eclipse-muted hover:text-eclipse-text",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <label className="text-xs text-eclipse-muted">Amount</label>
      <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-eclipse-border bg-eclipse-surface px-3 py-2.5 focus-within:border-eclipse-purple/60">
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
          placeholder="0.00"
          className="w-full bg-transparent font-mono text-lg text-eclipse-text outline-none placeholder:text-eclipse-muted/60"
        />
        <select
          value={token}
          onChange={(e) => setToken(e.target.value)}
          className="rounded-md border border-eclipse-border bg-eclipse-bg px-2 py-1 text-xs text-eclipse-text outline-none"
        >
          <option>USDC</option>
          <option>FXRP</option>
        </select>
      </div>

      <div className="mt-4 rounded-lg border border-eclipse-border/70 bg-eclipse-bg/40 p-3 text-xs">
        <div className="flex items-center justify-between text-eclipse-muted">
          <span>Estimated shares</span>
          <span className="font-mono text-eclipse-text">{shares}</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-eclipse-muted">
          <span>Share price</span>
          <span className="font-mono text-eclipse-text">1.0421</span>
        </div>
      </div>

      <button
        onClick={submit}
        className="mt-4 w-full rounded-lg bg-eclipse-purple py-2.5 text-sm font-medium text-white transition-colors hover:bg-eclipse-purple-bright glow-purple"
      >
        {connected ? `${tab} ${token}` : "Connect Wallet"}
      </button>

      <p className="mt-3 text-[11px] text-eclipse-muted">
        By {tab.toLowerCase()}ing you accept the vault's risk parameters and the enclave's attested code hash.
      </p>
    </div>
  );
}

function ProofModal({
  vault,
  onClose,
}: {
  vault: { name: string; teeType: string; attestationId: string; attestationAgeSec: number; isLive?: boolean };
  onClose: () => void;
}) {
  const signer = useReadContract({
    ...ENCLAVE_REGISTRY,
    functionName: "signerOf",
    args: [ALPHA_VAULT.address],
    query: { enabled: !!vault.isLive },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="glass-card w-full max-w-lg p-6"
        style={{ background: "#120E1F" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-widest text-eclipse-gold">Attestation Proof</div>
            <h3 className="mt-1 text-lg font-semibold text-eclipse-text">{vault.name}</h3>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-eclipse-muted hover:bg-eclipse-purple/10 hover:text-eclipse-text">
            <X className="h-4 w-4" />
          </button>
        </div>

        {vault.isLive ? (
          <>
            <dl className="mt-5 space-y-3 font-mono text-xs">
              <ProofRow k="Enclave signer (EnclaveRegistry.signerOf)" v={signer.isLoading ? "Loading…" : signer.data ?? "Not registered"} />
              <ProofRow k="AlphaVault" v={ALPHA_VAULT.address} />
            </dl>
            <div className="mt-5 rounded-lg border border-eclipse-purple/30 bg-eclipse-purple/10 p-3 text-xs text-eclipse-text">
              This is the enclave signer address registered on-chain via a real FDC Web2Json attestation. Trade instructions
              submitted to this vault must be signed by this key. Code measurement and per-attestation FDC tx hash aren't
              stored on-chain by the current contracts, so they can't be displayed here yet.
            </div>
          </>
        ) : (
          <>
            <dl className="mt-5 space-y-3 font-mono text-xs">
              <ProofRow k="TEE type" v={vault.teeType} />
              <ProofRow k="Attestation ID" v={vault.attestationId} />
              <ProofRow k="Timestamp" v={`${vault.attestationAgeSec}s ago`} />
              <ProofRow k="Code measurement" v="0x9f21e3a44c8b7d2e01f6...b19c" />
              <ProofRow k="Enclave pubkey" v="0x03a5c9...ef42" />
              <ProofRow k="FDC verification tx" v="0xc12a...4477" link />
            </dl>
            <div className="mt-5 rounded-lg border border-eclipse-purple/30 bg-eclipse-purple/10 p-3 text-xs text-eclipse-text">
              This proves the <span className="text-eclipse-purple">exact strategy code</span> that ran inside the enclave,
              without revealing what it contains.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
function ProofRow({ k, v, link }: { k: string; v: string; link?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-eclipse-border/70 pb-2">
      <dt className="text-eclipse-muted">{k}</dt>
      <dd className={cn("text-right break-all", link ? "text-eclipse-purple" : "text-eclipse-text")}>
        {link ? <a href="#" className="inline-flex items-center gap-1 hover:underline">{v} <ExternalLink className="h-3 w-3" /></a> : v}
      </dd>
    </div>
  );
}
