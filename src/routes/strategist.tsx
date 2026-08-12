import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { formatUnits } from "viem";
import { toast } from "sonner";
import { AppShell } from "@/components/eclipse/AppShell";
import { StatCard } from "@/components/eclipse/StatCard";
import { PerformanceChart } from "@/components/eclipse/PerformanceChart";
import { LiveIndicator } from "@/components/eclipse/LiveIndicator";
import { LiveHarvestHistory } from "@/components/eclipse/LiveTradeFeed";
import { ALPHA_VAULT, ENCLAVE_REGISTRY } from "@/lib/contracts";
import { coston2, wagmiConfig } from "@/lib/wagmi";
import { useLiveVaults } from "@/hooks/useLiveVaults";
import { useVaultActivity } from "@/hooks/useVaultActivity";
import { useStrategistActivity } from "@/hooks/useStrategistActivity";
import { useBackendStatus } from "@/hooks/useBackendStatus";
import { Activity, Copy, ExternalLink, RefreshCw, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/strategist")({
  head: () => ({
    meta: [
      { title: "Strategist Dashboard — Eclipse Protocol" },
      {
        name: "description",
        content: "Real on-chain operations view of the Eclipse Protocol vault and enclave.",
      },
      { property: "og:title", content: "Strategist Dashboard — Eclipse Protocol" },
      {
        property: "og:description",
        content: "Real on-chain operations view of the Eclipse Protocol vault and enclave.",
      },
    ],
  }),
  component: Strategist,
});

const fmtUSD = (n: number) =>
  n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(2)}M`
    : `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const fmtAddr = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const na = <span className="text-eclipse-muted">Unavailable</span>;

function copy(value: string, label: string) {
  navigator.clipboard.writeText(value);
  toast.success(`${label} copied`);
}

function Strategist() {
  const { address, isConnected } = useAccount();
  const { vaults, isLoading: vaultsLoading } = useLiveVaults();
  const vault = useMemo(
    () => vaults.find((v) => v.vaultAddress.toLowerCase() === ALPHA_VAULT.address.toLowerCase()),
    [vaults],
  );

  const owner = useReadContract({ ...ALPHA_VAULT, functionName: "owner" });
  const isOwner =
    !!address && !!owner.data && address.toLowerCase() === (owner.data as string).toLowerCase();

  const {
    trades,
    harvests,
    isLoading: activityLoading,
    error: activityError,
  } = useVaultActivity(ALPHA_VAULT.address, vault?.epochTimestamps);

  const {
    registeredSince,
    enclaveVerifiedAt,
    ownershipRotatedAt,
    timeline,
    investorCount,
    isLoading: strategistLoading,
    error: strategistError,
    scanWindowBlocks,
  } = useStrategistActivity(ALPHA_VAULT.address);
  const backend = useBackendStatus();

  const vaultMismatch =
    !!backend.reachable &&
    !!backend.status?.vault &&
    backend.status.vault.toLowerCase() !== ALPHA_VAULT.address.toLowerCase();

  const signerMismatch =
    !!backend.reachable &&
    !!backend.status?.enclaveSigner &&
    !!vault?.enclaveSigner &&
    backend.status.enclaveSigner.toLowerCase() !== vault.enclaveSigner.toLowerCase();

  const { writeContractAsync } = useWriteContract();
  const [resuming, setResuming] = useState(false);

  async function resumeStrategy() {
    setResuming(true);
    try {
      const hash = await writeContractAsync({
        ...ALPHA_VAULT,
        functionName: "resetCircuitBreaker",
      });
      await waitForTransactionReceipt(wagmiConfig, { hash });
      toast.success("Circuit breaker reset — vault resumed");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error("Resume failed", { description: message.slice(0, 200) });
    } finally {
      setResuming(false);
    }
  }

  // "Trading" means a position is currently open, not just that the vault is registered — a
  // registered-but-idle vault (no open position right now) is real and distinct from "Trading."
  const status = vaultsLoading
    ? "Loading…"
    : vault === undefined
      ? "Awaiting Registration"
      : vault.paused
        ? "Paused"
        : vault.positionSymbol
          ? "Trading"
          : "Registered";

  const lastHarvest = harvests[0];
  const lastTradeOrHarvest = trades[0]?.timestamp;

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-6 pt-12">
        <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-eclipse-gold">
          Strategist
        </div>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-eclipse-text">
              {vault?.name ?? "Eclipse Alpha Vault"}
            </h1>
            <p className="mt-2 text-eclipse-muted">
              Managed by{" "}
              <span className="font-mono">
                {vault?.strategistAddress ? fmtAddr(vault.strategistAddress) : "—"}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium",
                status === "Trading" &&
                  "border-eclipse-teal/40 bg-eclipse-teal/10 text-eclipse-teal",
                status === "Registered" &&
                  "border-eclipse-purple/40 bg-eclipse-purple/10 text-eclipse-purple",
                status === "Paused" &&
                  "border-eclipse-danger/40 bg-eclipse-danger/10 text-eclipse-danger",
                status === "Awaiting Registration" &&
                  "border-eclipse-muted/40 bg-eclipse-muted/10 text-eclipse-muted",
                status === "Loading…" &&
                  "border-eclipse-muted/40 bg-eclipse-muted/10 text-eclipse-muted",
              )}
            >
              {status}
            </span>
          </div>
        </div>
      </div>

      {vaultMismatch && (
        <div className="mx-auto mt-6 max-w-7xl px-6">
          <div className="rounded-lg border border-eclipse-danger/40 bg-eclipse-danger/5 p-4 text-sm text-eclipse-danger font-sans">
            <h4 className="font-semibold uppercase tracking-wider text-[10px] text-eclipse-danger">⚠️ Vault Configuration Mismatch</h4>
            <p className="mt-1 text-xs text-eclipse-danger/90 leading-relaxed">
              The running relayer backend is operating on vault address <code className="font-mono bg-eclipse-danger/10 px-1.5 py-0.5 rounded border border-eclipse-danger/20">{backend.status?.vault}</code>, which does NOT match the expected live vault address configured on the frontend (<code className="font-mono bg-eclipse-danger/10 px-1.5 py-0.5 rounded border border-eclipse-danger/20">{ALPHA_VAULT.address}</code>). Please check your relayer's config file.
            </p>
          </div>
        </div>
      )}

      {signerMismatch && (
        <div className="mx-auto mt-6 max-w-7xl px-6">
          <div className="rounded-lg border border-eclipse-danger/40 bg-eclipse-danger/5 p-4 text-sm text-eclipse-danger font-sans">
            <h4 className="font-semibold uppercase tracking-wider text-[10px] text-eclipse-danger">⚠️ Enclave Signer Address Mismatch</h4>
            <p className="mt-1 text-xs text-eclipse-danger/90 leading-relaxed">
              The running relayer backend is using enclave signer <code className="font-mono bg-eclipse-danger/10 px-1.5 py-0.5 rounded border border-eclipse-danger/20">{backend.status?.enclaveSigner}</code>, which does NOT match the signer address registered on-chain for this vault (<code className="font-mono bg-eclipse-danger/10 px-1.5 py-0.5 rounded border border-eclipse-danger/20">{vault?.enclaveSigner}</code>). SubmitInstruction calls will revert with unauthorized signer errors.
            </p>
          </div>
        </div>
      )}

      {/* Section 1: Strategy Identity */}
      <div className="mx-auto mt-6 max-w-7xl px-6">
        <div className="glass-card p-5">
          <div className="mb-3 text-sm font-semibold text-eclipse-text">Strategy Identity</div>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Row k="Strategy name" v={vault?.name ?? na} />
            <Row
              k="Vault address"
              v={<span className="font-mono text-xs">{ALPHA_VAULT.address}</span>}
            />
            <Row
              k="Strategist address"
              v={
                vault?.strategistAddress ? (
                  <span className="font-mono text-xs">{vault.strategistAddress}</span>
                ) : (
                  na
                )
              }
            />
            <Row
              k="Current owner"
              v={
                owner.isLoading ? (
                  "Loading…"
                ) : owner.data ? (
                  <span className="font-mono text-xs">{owner.data as string}</span>
                ) : (
                  na
                )
              }
            />
            <Row
              k="Registered since"
              v={
                registeredSince.timestamp !== undefined
                  ? new Date(Number(registeredSince.timestamp) * 1000).toLocaleString()
                  : na
              }
            />
            <Row k="Status" v={status} />
            <Row
              k="Ownership last rotated"
              v={
                ownershipRotatedAt.timestamp !== undefined
                  ? new Date(Number(ownershipRotatedAt.timestamp) * 1000).toLocaleString()
                  : na
              }
            />
          </dl>
        </div>
      </div>

      {/* Section 2: Attestation & Trust */}
      <div className="mx-auto mt-6 max-w-7xl px-6">
        <div className="glass-card p-5">
          <div className="mb-1 text-sm font-semibold text-eclipse-text">Attestation & Trust</div>
          <p className="mb-3 text-xs text-eclipse-muted">
            The FDC verification below is genuine and independently checkable on-chain. The
            attestation <em>claim itself</em> is a documented mock (a locally-generated JSON
            document, not a real Google Confidential Space hardware attestation) — a Week 1 scope
            cut recorded in{" "}
            <code className="rounded bg-eclipse-bg/60 px-1 py-0.5 text-eclipse-purple">
              DEPLOYMENT.md
            </code>
            , shown here honestly rather than as a false checkmark.
          </p>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Row
              k="TEE status"
              v={vault?.trustChecks.teeVerified ? "Enclave registered" : "Not registered"}
            />
            <Row
              k="Google Confidential Space"
              v={
                <span className="text-eclipse-gold">
                  Documented mock — not genuine hardware attestation
                </span>
              }
            />
            <Row
              k="FDC verification"
              v={vault?.trustChecks.teeVerified ? "Verified on-chain" : na}
            />
            <Row
              k="Enclave signer"
              v={
                vault?.enclaveSigner ? (
                  <span className="font-mono text-xs">{vault.enclaveSigner}</span>
                ) : (
                  na
                )
              }
            />
            <Row
              k="Enclave registry address"
              v={<span className="font-mono text-xs">{ENCLAVE_REGISTRY.address}</span>}
            />
            <Row
              k="Verification timestamp"
              v={
                enclaveVerifiedAt.timestamp !== undefined
                  ? new Date(Number(enclaveVerifiedAt.timestamp) * 1000).toLocaleString()
                  : na
              }
            />
            <Row
              k="Attestation / remote-proof hash"
              v={
                <span className="text-eclipse-muted">
                  Not stored on-chain — verified once at registration, proof discarded after
                  decoding
                </span>
              }
            />
            <Row
              k="Current owner"
              v={
                owner.data ? <span className="font-mono text-xs">{owner.data as string}</span> : na
              }
            />
          </dl>
        </div>
      </div>

      {/* Section 3: Vault Health */}
      <div className="mx-auto mt-6 max-w-7xl px-6">
        <div className="mb-3 text-sm font-semibold text-eclipse-text">Vault Health</div>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          <StatCard
            label="Total assets (TVL)"
            value={
              vault?.totalAssets !== undefined && vault.underlyingDecimals !== undefined
                ? fmtUSD(Number(formatUnits(vault.totalAssets, vault.underlyingDecimals)))
                : "…"
            }
            hint="AlphaVault.totalAssets()"
          />
          <StatCard
            label="Price per share"
            value={
              vault?.totalAssets !== undefined &&
              vault.totalSupply &&
              vault.underlyingDecimals !== undefined &&
              vault.shareDecimals !== undefined &&
              vault.totalSupply > 0n
                ? (
                    Number(formatUnits(vault.totalAssets, vault.underlyingDecimals)) /
                    Number(formatUnits(vault.totalSupply, vault.shareDecimals))
                  ).toFixed(6)
                : "…"
            }
            hint="totalAssets() / totalSupply()"
          />
          <StatCard
            label="High-water mark"
            value={vault?.highWaterMark !== undefined ? formatUnits(vault.highWaterMark, 18) : "…"}
            hint="AlphaVault.highWaterMark(), scaled 1e18"
          />
          <StatCard
            label="Current position"
            value={vault?.positionSymbol ?? "None (fully in underlying)"}
            hint="AlphaVault.currentPosition()"
          />
          <StatCard
            label="Vault paused"
            value={vault?.paused === undefined ? "…" : vault.paused ? "Yes" : "No"}
            hint="AlphaVault.paused() — circuit-breaker state"
          />
          <StatCard
            label="Epoch count"
            value={vault?.epochCount !== undefined ? String(vault.epochCount) : "…"}
            hint="PerformanceLedger.epochCount()"
          />
          <StatCard
            label="Last harvest"
            value={
              lastHarvest
                ? new Date(Number(lastHarvest.timestamp) * 1000).toLocaleString()
                : "No harvest yet"
            }
            hint="Timestamp of the most recent Harvest event on-chain"
          />
          <StatCard
            label="Investors (recent depositors)"
            value={
              investorCount !== undefined
                ? String(investorCount)
                : strategistLoading
                  ? "Scanning…"
                  : "No on-chain data"
            }
            hint={`Unique addresses seen in last ~${scanWindowBlocks.toLocaleString()} blocks — not a lifetime total`}
          />
          <StatCard
            label="Current share supply"
            value={
              vault?.totalSupply !== undefined && vault.shareDecimals !== undefined
                ? Number(formatUnits(vault.totalSupply, vault.shareDecimals)).toLocaleString()
                : "…"
            }
            hint="AlphaVault.totalSupply()"
          />
        </div>
      </div>

      <div className="mx-auto mt-6 grid max-w-7xl gap-6 px-6 lg:grid-cols-3">
        {/* Section 4: Trading Engine */}
        <div className="glass-card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-eclipse-text">
            <Activity className="h-4 w-4 text-eclipse-purple" /> Trading Engine
          </div>
          <p className="mb-3 text-xs text-eclipse-muted">
            Trading is fully autonomous: an off-chain relayer loop reads FTSOv2 prices and submits
            enclave-signed instructions directly to{" "}
            <code className="rounded bg-eclipse-bg/60 px-1 py-0.5 text-eclipse-purple">
              AlphaVault.submitInstruction()
            </code>
            .
          </p>
          <ul className="space-y-3 text-sm">
            <StatusRow
              k="Backend status"
              v={
                backend.reachable === undefined ? (
                  "Checking…"
                ) : backend.reachable ? (
                  <LiveIndicator label="Reachable" />
                ) : (
                  <span className="text-eclipse-danger">Backend unreachable</span>
                )
              }
            />
            <StatusRow
              k="Trading loop running"
              v={
                backend.reachable === undefined ? (
                  "Checking…"
                ) : backend.reachable && backend.status?.isRunning ? (
                  <span className="text-eclipse-teal font-semibold">Yes (Loop Running)</span>
                ) : (
                  <span className="text-eclipse-danger">Unknown — backend unreachable</span>
                )
              }
            />
            <StatusRow
              k="Last execution"
              v={
                backend.status?.lastTickAt
                  ? `${new Date(backend.status.lastTickAt).toLocaleString()} (backend heartbeat)`
                  : lastTradeOrHarvest !== undefined
                    ? `${new Date(Number(lastTradeOrHarvest) * 1000).toLocaleString()} (last on-chain trade — backend unreachable)`
                    : "Backend unreachable"
              }
            />
            <StatusRow
              k="Next scheduled run"
              v={
                <span className="text-eclipse-muted">
                  Not exposed by the backend's /status endpoint
                </span>
              }
            />
            <StatusRow
              k="Trades executed"
              v={
                activityError ? (
                  <span className="text-eclipse-danger text-xs">{activityError}</span>
                ) : trades.length > 0 || !activityLoading ? (
                  String(trades.length)
                ) : (
                  "Scanning…"
                )
              }
            />
            <StatusRow
              k="Harvests"
              v={
                activityError ? (
                  <span className="text-eclipse-danger text-xs">{activityError}</span>
                ) : harvests.length > 0 || !activityLoading ? (
                  String(harvests.length)
                ) : (
                  "Scanning…"
                )
              }
            />
            <StatusRow k="Current position" v={vault?.positionSymbol ?? "None"} />
          </ul>
          <div className="mt-4 rounded-lg border border-eclipse-border/70 bg-eclipse-bg/40 p-3">
            <div className="mb-1 text-xs font-medium text-eclipse-text">
              Recent strategy decisions
            </div>
            {backend.status?.lastDecision ? (
              <div className="font-mono text-xs text-eclipse-muted">
                {backend.status.lastDecision}
              </div>
            ) : (
              <div className="text-xs text-eclipse-muted">
                Backend unreachable — no live decision log available
              </div>
            )}
          </div>

          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-xs font-medium text-eclipse-text uppercase tracking-wider">
                Live Relayer Logs Stream
              </div>
              <div className="flex items-center gap-1.5 text-[10px]">
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    backend.isSSEConnected ? "bg-eclipse-teal animate-pulse" : "bg-eclipse-danger",
                  )}
                />
                <span className="text-eclipse-muted">
                  {backend.isSSEConnected
                    ? "SSE Active"
                    : backend.reachable
                      ? "REST Polling"
                      : "Disconnected (Reconnecting...)"}
                </span>
              </div>
            </div>
            <div className="rounded-lg border border-eclipse-border bg-black/80 p-4 font-mono text-[11px] leading-relaxed shadow-inner">
              <div
                className="h-[180px] overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-eclipse-border"
                ref={(el) => {
                  if (el) el.scrollTop = el.scrollHeight;
                }}
              >
                {!backend.reachable ? (
                  <div className="text-eclipse-danger flex h-full items-center justify-center font-sans text-xs">
                    Backend unreachable — waiting for relayer connection...
                  </div>
                ) : backend.logs.length === 0 ? (
                  <div className="text-eclipse-muted flex h-full items-center justify-center font-sans text-xs">
                    No recent activity logs available.
                  </div>
                ) : (
                  backend.logs.map((log, idx) => (
                    <div
                      key={idx}
                      className="flex gap-2 items-start hover:bg-white/5 px-1 py-0.5 rounded"
                    >
                      <span className="text-eclipse-muted shrink-0">
                        [{new Date(log.timestamp).toLocaleTimeString()}]
                      </span>
                      <span
                        className={cn(
                          "font-semibold uppercase tracking-wider text-[9px] px-1 rounded shrink-0",
                          log.level === "ERROR" && "bg-eclipse-danger/25 text-eclipse-danger",
                          log.level === "WARN" && "bg-eclipse-gold/25 text-eclipse-gold",
                          log.level === "INFO" && "bg-eclipse-purple/20 text-eclipse-purple",
                        )}
                      >
                        {log.level}
                      </span>
                      <span
                        className={cn(
                          "break-words font-medium",
                          log.level === "ERROR" && "text-eclipse-danger",
                          log.level === "WARN" && "text-eclipse-gold",
                          log.level === "INFO" && "text-white",
                        )}
                      >
                        {log.message}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section 7 (placed alongside for layout): Security */}
        <div className="glass-card p-5">
          <div className="mb-4 text-sm font-semibold text-eclipse-text">Security</div>
          <ul className="space-y-2.5 text-sm">
            <SecurityRow ok={vault?.trustChecks.teeVerified} label="Enclave registered on-chain" />
            <SecurityRow ok={false} warn label="Confidential Space attestation (documented mock)" />
            <SecurityRow
              ok={vault?.trustChecks.teeVerified}
              label="FDC-verified enclave registration"
            />
            <SecurityRow ok={vault?.trustChecks.bondLocked} label="Strategy bond locked" />
            <SecurityRow ok={vault?.epochCount !== undefined} label="On-chain performance ledger" />
            <SecurityRow ok={true} label="Immutable fee accounting (no proxy/upgrade path)" />
          </ul>
          <Link
            to="/deploy"
            className="mt-6 flex items-center justify-center gap-2 rounded-lg border border-eclipse-purple/50 bg-eclipse-purple/10 py-2.5 text-sm font-medium text-eclipse-text hover:bg-eclipse-purple/20"
          >
            <Rocket className="h-4 w-4" /> Deploy new strategy
          </Link>
        </div>
      </div>

      {/* Section 5: Performance */}
      <div className="mx-auto mt-6 max-w-7xl px-6">
        <div className="glass-card p-5">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-semibold text-eclipse-text">Performance</div>
            <span className="text-xs text-eclipse-muted">
              {vault?.epochCount ?? 0} epoch{vault?.epochCount === 1 ? "" : "s"} committed
            </span>
          </div>
          {vault && vault.navSeries.length > 1 ? (
            <PerformanceChart
              data={vault.epochTimestamps.map((ts, i) => ({
                t: new Date(Number(ts) * 1000).toISOString(),
                nav: vault.navSeries[i]?.nav ?? 0,
              }))}
              height={280}
            />
          ) : (
            <div className="flex h-[280px] items-center justify-center text-sm text-eclipse-muted">
              Not enough epoch history to chart yet ({vault?.epochCount ?? 0} epoch
              {vault?.epochCount === 1 ? "" : "s"} committed).
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto mt-6 max-w-7xl px-6">
        <details className="glass-card group">
          <summary className="cursor-pointer list-none px-5 py-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-eclipse-text">Harvest / fee events</div>
              <span className="text-xs text-eclipse-muted group-open:hidden">expand</span>
              <span className="hidden text-xs text-eclipse-muted group-open:inline">collapse</span>
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
      </div>

      {/* Section 6: Live Activity */}
      <div className="mx-auto mt-6 max-w-7xl px-6">
        <div className="glass-card overflow-hidden">
          <div className="border-b border-eclipse-border px-5 py-4 text-sm font-semibold text-eclipse-text">
            Live Activity
            <span className="ml-2 font-normal text-xs text-eclipse-muted">
              (last ~{scanWindowBlocks.toLocaleString()} blocks, newest first)
            </span>
          </div>
          {strategistError && (
            <div className="border-b border-eclipse-border/70 bg-eclipse-danger/10 px-5 py-2 text-xs text-eclipse-danger">
              {strategistError}
            </div>
          )}
          <div className="max-h-[360px] overflow-auto">
            {strategistLoading && timeline.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-eclipse-muted">
                Scanning recent activity…
              </div>
            ) : timeline.length === 0 && trades.length === 0 && harvests.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-eclipse-muted">
                No on-chain activity in the scanned window.
              </div>
            ) : (
              <ul className="divide-y divide-eclipse-border/70 text-sm">
                {[
                  ...timeline.map((t) => ({
                    kind: t.kind as string,
                    timestamp: t.timestamp,
                    txHash: t.txHash,
                    detail: t.detail,
                  })),
                  ...trades.map((t) => ({
                    kind: "Trade Executed",
                    timestamp: t.timestamp,
                    txHash: t.txHash,
                    detail: `nonce ${t.nonce}`,
                  })),
                  ...harvests.map((h) => ({
                    kind: "Harvest",
                    timestamp: h.timestamp,
                    txHash: h.txHash,
                    detail: undefined,
                  })),
                ]
                  .sort((a, b) => Number((b.timestamp ?? 0n) - (a.timestamp ?? 0n)))
                  .map((e, i) => (
                    <li
                      key={`${e.txHash}-${i}`}
                      className="flex items-center justify-between px-5 py-3"
                    >
                      <div>
                        <div className="text-eclipse-text">{e.kind}</div>
                        <div className="text-xs text-eclipse-muted">
                          {e.timestamp !== undefined
                            ? new Date(Number(e.timestamp) * 1000).toLocaleString()
                            : "Just now"}
                          {e.detail ? ` · ${e.detail}` : ""}
                        </div>
                      </div>
                      <a
                        href={`${coston2.blockExplorers.default.url}/tx/${e.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-mono text-xs text-eclipse-purple hover:underline"
                      >
                        {fmtAddr(e.txHash)} <ExternalLink className="h-3 w-3" />
                      </a>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Section 8: Management Actions */}
      <div className="mx-auto mt-6 max-w-7xl px-6 pb-16">
        <div className="glass-card p-5">
          <div className="mb-4 text-sm font-semibold text-eclipse-text">Management Actions</div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/deploy"
              className="inline-flex items-center gap-2 rounded-lg border border-eclipse-purple/50 bg-eclipse-purple/10 px-4 py-2 text-sm text-eclipse-text hover:bg-eclipse-purple/20"
            >
              <Rocket className="h-4 w-4" /> Deploy new strategy
            </Link>
            <a
              href={`${coston2.blockExplorers.default.url}/address/${ALPHA_VAULT.address}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-eclipse-border px-4 py-2 text-sm text-eclipse-text hover:border-eclipse-purple/60"
            >
              <ExternalLink className="h-4 w-4" /> View on Blockscout
            </a>
            <button
              onClick={() => copy(ALPHA_VAULT.address, "Vault address")}
              className="inline-flex items-center gap-2 rounded-lg border border-eclipse-border px-4 py-2 text-sm text-eclipse-text hover:border-eclipse-purple/60"
            >
              <Copy className="h-4 w-4" /> Copy vault address
            </button>
            {vault?.strategistAddress && (
              <button
                onClick={() => copy(vault.strategistAddress, "Strategist address")}
                className="inline-flex items-center gap-2 rounded-lg border border-eclipse-border px-4 py-2 text-sm text-eclipse-text hover:border-eclipse-purple/60"
              >
                <Copy className="h-4 w-4" /> Copy strategist address
              </button>
            )}
            {isConnected && isOwner && vault?.paused && (
              <button
                onClick={resumeStrategy}
                disabled={resuming}
                className="inline-flex items-center gap-2 rounded-lg border border-eclipse-teal/50 bg-eclipse-teal/10 px-4 py-2 text-sm text-eclipse-teal hover:bg-eclipse-teal/20 disabled:opacity-60"
              >
                {resuming ? "Resuming…" : "Resume strategy"}
              </button>
            )}
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 rounded-lg border border-eclipse-border px-4 py-2 text-sm text-eclipse-text hover:border-eclipse-purple/60"
            >
              <RefreshCw className="h-4 w-4" /> Refresh status
            </button>
          </div>
          <p className="mt-4 text-xs text-eclipse-muted">
            {isConnected && isOwner
              ? "Connected wallet is the vault owner — owner-gated actions are enabled above."
              : "Connect the vault owner's wallet to enable owner-gated actions."}{" "}
            "Pause strategy" isn't listed: the contract has no manual owner-pause function, only an
            automatic circuit breaker and its owner-gated reset. "Rotate enclave" isn't listed
            either: it requires a fresh FDC attestation proof from the backend's attestation
            pipeline, which this page cannot generate on its own.
          </p>
        </div>
      </div>
    </AppShell>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-eclipse-muted">{k}</dt>
      <dd className="mt-1 text-sm text-eclipse-text">{v}</dd>
    </div>
  );
}

function StatusRow({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <li className="flex items-center justify-between border-b border-eclipse-border/60 pb-2">
      <span className="text-eclipse-muted">{k}</span>
      <span>{v}</span>
    </li>
  );
}

function SecurityRow({
  ok,
  warn,
  label,
}: {
  ok: boolean | undefined;
  warn?: boolean;
  label: string;
}) {
  return (
    <li className="flex items-center gap-2">
      <span
        className={cn(
          "text-sm",
          ok ? "text-eclipse-teal" : warn ? "text-eclipse-gold" : "text-eclipse-muted",
        )}
      >
        {ok ? "✓" : warn ? "◐" : "…"}
      </span>
      <span className="text-sm text-eclipse-text">{label}</span>
    </li>
  );
}
