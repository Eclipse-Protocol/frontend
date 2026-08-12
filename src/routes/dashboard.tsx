import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useAccount, useConnect } from "wagmi";
import { formatUnits } from "viem";
import { AppShell } from "@/components/eclipse/AppShell";
import { StatCard } from "@/components/eclipse/StatCard";
import { Skeleton } from "@/components/ui/skeleton";
import { WithdrawButton } from "@/components/eclipse/WithdrawButton";
import { useInvestorPositions } from "@/hooks/useInvestorPositions";
import { coston2 } from "@/lib/wagmi";
import { LIVE_VAULT_ID } from "@/lib/mock-data";
import { ALPHA_VAULT } from "@/lib/contracts";
import { Wallet } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Investor Dashboard — Eclipse Protocol" },
      { name: "description", content: "Track your Eclipse Protocol positions and performance." },
      { property: "og:title", content: "Investor Dashboard — Eclipse Protocol" },
      {
        property: "og:description",
        content: "Track your Eclipse Protocol positions and performance.",
      },
    ],
  }),
  component: Dashboard,
});

const fmtUSD = (n: number) => `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

function fmtAddr(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function vaultDetailId(vaultAddress: string) {
  return vaultAddress.toLowerCase() === ALPHA_VAULT.address.toLowerCase() ? LIVE_VAULT_ID : null;
}

function Dashboard() {
  const { address, isConnected } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { positions, transactions, isLoading, isScanning, scanError, scanWindowBlocks, refetch } =
    useInvestorPositions(address);

  const numericPositions = useMemo(
    () =>
      positions.map((p) => ({
        ...p,
        currentValueNum:
          p.currentValue !== undefined && p.underlyingDecimals !== undefined
            ? Number(formatUnits(p.currentValue, p.underlyingDecimals))
            : undefined,
        depositedNetNum:
          p.depositedNet !== undefined && p.underlyingDecimals !== undefined
            ? Number(formatUnits(p.depositedNet, p.underlyingDecimals))
            : undefined,
      })),
    [positions],
  );

  const totalValue = numericPositions.reduce((s, p) => s + (p.currentValueNum ?? 0), 0);
  const knownDeposits = numericPositions.filter((p) => p.depositedNetNum !== undefined);
  const hasFullDepositHistory =
    numericPositions.length > 0 && knownDeposits.length === numericPositions.length;
  const totalDepositedKnown =
    knownDeposits.length > 0
      ? knownDeposits.reduce((s, p) => s + (p.depositedNetNum ?? 0), 0)
      : undefined;
  const pnl = totalDepositedKnown !== undefined ? totalValue - totalDepositedKnown : undefined;
  const pnlPct =
    pnl !== undefined && totalDepositedKnown !== undefined && totalDepositedKnown !== 0
      ? (pnl / totalDepositedKnown) * 100
      : undefined;

  if (!isConnected) {
    return (
      <AppShell>
        <div className="mx-auto flex max-w-md flex-col items-center px-6 py-32 text-center">
          <div className="glass-card w-full p-8">
            <div className="mx-auto mb-5 inline-flex h-12 w-12 items-center justify-center rounded-full bg-eclipse-purple/15 text-eclipse-purple">
              <Wallet className="h-5 w-5" />
            </div>
            <h1 className="text-xl font-semibold text-eclipse-text">Connect your wallet</h1>
            <p className="mt-2 text-sm text-eclipse-muted">
              Sign in to view your Eclipse Protocol positions, performance, and transaction history.
            </p>
            <button
              disabled={isPending || connectors.length === 0}
              onClick={() =>
                connect(
                  { connector: connectors[0], chainId: coston2.id },
                  {
                    onError: (err) =>
                      toast.error("Connection failed", { description: err.message }),
                  },
                )
              }
              className="mt-6 w-full rounded-lg bg-eclipse-purple py-2.5 text-sm font-medium text-white glow-purple hover:bg-eclipse-purple-bright disabled:opacity-60"
            >
              {connectors.length === 0
                ? "No wallet detected"
                : isPending
                  ? "Connecting…"
                  : "Connect Wallet"}
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-6 pt-12">
        <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-eclipse-gold">
          Investor
        </div>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-eclipse-text">Portfolio</h1>
        <p className="mt-2 text-eclipse-muted">
          Connected as <span className="font-mono">{address}</span>
        </p>
      </div>

      {isLoading && positions.length === 0 ? (
        <div className="mx-auto mt-8 grid max-w-7xl gap-4 px-6 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-card p-4">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-2 h-6 w-24" />
            </div>
          ))}
        </div>
      ) : positions.length === 0 ? (
        <div className="mx-auto mt-8 max-w-7xl px-6">
          <div className="glass-card flex flex-col items-center gap-3 p-12 text-center">
            <div className="text-lg font-medium text-eclipse-text">No active investments yet.</div>
            <p className="max-w-sm text-sm text-eclipse-muted">
              This wallet doesn't hold shares in any registered vault. Deposit into a vault to start
              building a real, on-chain track record.
            </p>
            <Link
              to="/vaults"
              className="mt-2 rounded-lg bg-eclipse-purple px-4 py-2 text-sm font-medium text-white hover:bg-eclipse-purple-bright glow-purple"
            >
              Browse Vaults
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="mx-auto mt-8 grid max-w-7xl gap-4 px-6 md:grid-cols-4">
            <StatCard
              label={hasFullDepositHistory ? "Total deposited" : "Current invested capital"}
              value={
                totalDepositedKnown !== undefined
                  ? fmtUSD(totalDepositedKnown)
                  : "Not enough history"
              }
              hint={
                !hasFullDepositHistory
                  ? `From on-chain events, last ~${scanWindowBlocks.toLocaleString()} blocks`
                  : undefined
              }
            />
            <StatCard
              label="Current value"
              value={fmtUSD(totalValue)}
              hint="Sum of convertToAssets(shareBalance) across your registered vault positions"
            />
            <StatCard
              label="Total P&L"
              value={
                pnl !== undefined ? `${pnl >= 0 ? "+" : ""}${fmtUSD(pnl)}` : "Not enough history"
              }
              delta={pnlPct}
              hint="Current value minus net deposits from on-chain Deposit/Withdraw events"
            />
            <StatCard
              label="Active positions"
              value={String(positions.length)}
              mono={false}
              hint="Vaults (via StrategyRegistry) where this wallet holds a nonzero share balance"
            />
          </div>

          <div className="mx-auto mt-6 max-w-7xl px-6">
            <div className="glass-card p-5">
              <div className="mb-2 text-sm font-semibold text-eclipse-text">
                Portfolio performance
              </div>
              <div className="flex h-[260px] flex-col items-center justify-center gap-2 text-center text-sm text-eclipse-muted">
                <div>Not enough history to chart portfolio value over time.</div>
                <p className="max-w-md text-xs">
                  <code className="rounded bg-eclipse-bg/60 px-1 py-0.5 text-eclipse-purple">
                    PerformanceLedger
                  </code>{" "}
                  records total vault NAV per epoch, but not historical share supply — so an
                  individual position's value at a past epoch can't be reconstructed from on-chain
                  state alone without an indexer. Real current value and epoch history are shown
                  above and on the vault detail page instead of an approximated curve.
                </p>
              </div>
            </div>
          </div>

          <div className="mx-auto mt-6 max-w-7xl px-6">
            <div className="glass-card overflow-hidden">
              <div className="border-b border-eclipse-border px-5 py-4 text-sm font-semibold text-eclipse-text">
                My Positions
              </div>
              {scanError && (
                <div className="border-b border-eclipse-border/70 bg-eclipse-danger/10 px-5 py-2 text-xs text-eclipse-danger">
                  Could not read full deposit history: {scanError}
                </div>
              )}
              <table className="w-full text-left text-sm">
                <thead className="bg-eclipse-surface/60 text-[11px] uppercase tracking-wider text-eclipse-muted">
                  <tr>
                    <th className="px-5 py-2 font-medium">Vault</th>
                    <th className="px-3 py-2 font-medium">Address</th>
                    <th className="px-3 py-2 font-medium text-right">Shares</th>
                    <th className="px-3 py-2 font-medium text-right">Current value</th>
                    <th className="px-3 py-2 font-medium text-right">PPS</th>
                    <th className="px-3 py-2 font-medium text-right">P&L</th>
                    <th className="px-3 py-2 font-medium">Last updated</th>
                    <th className="px-5 py-2 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {numericPositions.map((p) => {
                    const detailId = vaultDetailId(p.vaultAddress);
                    const pnlNum =
                      p.depositedNetNum !== undefined && p.currentValueNum !== undefined
                        ? p.currentValueNum - p.depositedNetNum
                        : undefined;
                    const pnlPctRow =
                      pnlNum !== undefined && p.depositedNetNum
                        ? (pnlNum / p.depositedNetNum) * 100
                        : undefined;
                    const lastUpdated = p.lastDepositTimestamp ?? p.lastWithdrawTimestamp;
                    return (
                      <tr key={p.vaultAddress} className="border-t border-eclipse-border/70">
                        <td className="px-5 py-3">
                          {detailId ? (
                            <Link
                              to="/vaults/$id"
                              params={{ id: detailId }}
                              className="text-eclipse-text hover:text-eclipse-purple"
                            >
                              {p.vaultName}
                            </Link>
                          ) : (
                            <span className="text-eclipse-text">{p.vaultName}</span>
                          )}
                        </td>
                        <td className="px-3 py-3 font-mono text-xs text-eclipse-muted">
                          {fmtAddr(p.vaultAddress)}
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-eclipse-text">
                          {p.shareDecimals !== undefined
                            ? Number(formatUnits(p.shareBalance, p.shareDecimals)).toLocaleString()
                            : "…"}
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-eclipse-text">
                          {p.currentValueNum !== undefined ? fmtUSD(p.currentValueNum) : "…"}
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-eclipse-text">
                          {p.pricePerShare !== undefined ? p.pricePerShare.toFixed(6) : "…"}
                        </td>
                        <td
                          className={`px-3 py-3 text-right font-mono ${pnlPctRow === undefined ? "text-eclipse-muted" : pnlPctRow >= 0 ? "text-eclipse-teal" : "text-eclipse-danger"}`}
                        >
                          {pnlPctRow !== undefined
                            ? `${pnlPctRow >= 0 ? "+" : ""}${pnlPctRow.toFixed(2)}%`
                            : "Not enough history"}
                        </td>
                        <td className="px-3 py-3 text-xs text-eclipse-muted">
                          {lastUpdated !== undefined
                            ? new Date(Number(lastUpdated) * 1000).toLocaleString()
                            : isScanning
                              ? "Scanning…"
                              : "Unknown"}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <WithdrawButton
                            vaultAddress={p.vaultAddress}
                            shareBalance={p.shareBalance}
                            onSuccess={refetch}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mx-auto mt-6 max-w-7xl px-6 pb-16">
            <div className="glass-card overflow-hidden">
              <div className="border-b border-eclipse-border px-5 py-4 text-sm font-semibold text-eclipse-text">
                Transaction history
                <span className="ml-2 font-normal text-xs text-eclipse-muted">
                  (last ~{scanWindowBlocks.toLocaleString()} blocks — older activity may not appear
                  here)
                </span>
              </div>
              {isScanning && transactions.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-eclipse-muted">
                  Scanning on-chain history…
                </div>
              ) : transactions.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-eclipse-muted">
                  No deposits or withdrawals found in the scanned window.
                </div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-eclipse-surface/60 text-[11px] uppercase tracking-wider text-eclipse-muted">
                    <tr>
                      <th className="px-5 py-2 font-medium">Time</th>
                      <th className="px-3 py-2 font-medium">Type</th>
                      <th className="px-3 py-2 font-medium">Vault</th>
                      <th className="px-3 py-2 font-medium text-right">Amount</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-5 py-2 font-medium">Tx</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono text-xs">
                    {transactions.map((t) => {
                      const position = positions.find((p) => p.vaultAddress === t.vaultAddress);
                      return (
                        <tr
                          key={`${t.txHash}-${t.kind}`}
                          className="border-t border-eclipse-border/70"
                        >
                          <td className="px-5 py-3 text-eclipse-muted">
                            {t.timestamp !== undefined
                              ? new Date(Number(t.timestamp) * 1000).toLocaleString()
                              : "…"}
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className={
                                t.kind === "Deposit" ? "text-eclipse-teal" : "text-eclipse-danger"
                              }
                            >
                              {t.kind}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-eclipse-text">{t.vaultName}</td>
                          <td className="px-3 py-3 text-right text-eclipse-text">
                            {position?.underlyingDecimals !== undefined
                              ? `${Number(formatUnits(t.assets, position.underlyingDecimals)).toLocaleString()} ${position.underlyingSymbol ?? ""}`
                              : "…"}
                          </td>
                          <td className="px-3 py-3 text-eclipse-purple">confirmed</td>
                          <td className="px-5 py-3">
                            <a
                              href={`${coston2.blockExplorers.default.url}/tx/${t.txHash}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-eclipse-purple hover:underline"
                            >
                              {fmtAddr(t.txHash)}
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
