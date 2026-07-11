import { createFileRoute, Link } from "@tanstack/react-router";
import { useAccount, useConnect } from "wagmi";
import { AppShell } from "@/components/eclipse/AppShell";
import { StatCard } from "@/components/eclipse/StatCard";
import { PerformanceChart } from "@/components/eclipse/PerformanceChart";
import { mockPositions, mockTransactions, mockVaults } from "@/lib/mock-data";
import { coston2 } from "@/lib/wagmi";
import { Wallet } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Investor Dashboard — Eclipse Protocol" },
      { name: "description", content: "Track your Eclipse Protocol positions and performance." },
      { property: "og:title", content: "Investor Dashboard — Eclipse Protocol" },
      { property: "og:description", content: "Track your Eclipse Protocol positions and performance." },
    ],
  }),
  component: Dashboard,
});

const fmtUSD = (n: number) => `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

function Dashboard() {
  const { address, isConnected } = useAccount();
  const { connectors, connect, isPending } = useConnect();

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
                  { onError: (err) => toast.error("Connection failed", { description: err.message }) },
                )
              }
              className="mt-6 w-full rounded-lg bg-eclipse-purple py-2.5 text-sm font-medium text-white glow-purple hover:bg-eclipse-purple-bright disabled:opacity-60"
            >
              {connectors.length === 0 ? "No wallet detected" : isPending ? "Connecting…" : "Connect Wallet"}
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  const totalDeposited = mockPositions.reduce((s, p) => s + p.deposited, 0);
  const totalValue = mockPositions.reduce((s, p) => s + p.currentValue, 0);
  const pnl = totalValue - totalDeposited;
  const pnlPct = (pnl / totalDeposited) * 100;

  // aggregate NAV series
  const aggSeries = mockVaults[0].navHistory.map((p, i) => ({
    t: p.t,
    nav: +(1 + i * 0.0009 + Math.sin(i / 5) * 0.005).toFixed(5),
  }));

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-6 pt-12">
        <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-eclipse-gold">Investor</div>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-eclipse-text">Portfolio</h1>
        <p className="mt-2 text-eclipse-muted">
          Connected as <span className="font-mono">{address}</span>
        </p>
      </div>

      <div className="mx-auto mt-8 grid max-w-7xl gap-4 px-6 md:grid-cols-4">
        <StatCard label="Total deposited" value={fmtUSD(totalDeposited)} />
        <StatCard label="Current value" value={fmtUSD(totalValue)} />
        <StatCard label="Total P&L" value={`${pnl >= 0 ? "+" : ""}${fmtUSD(pnl)}`} delta={pnlPct} />
        <StatCard label="Active positions" value={String(mockPositions.length)} mono={false} />
      </div>

      <div className="mx-auto mt-6 max-w-7xl px-6">
        <div className="glass-card p-5">
          <div className="mb-2 text-sm font-semibold text-eclipse-text">Portfolio performance</div>
          <PerformanceChart data={aggSeries} height={260} />
        </div>
      </div>

      <div className="mx-auto mt-6 max-w-7xl px-6">
        <div className="glass-card overflow-hidden">
          <div className="border-b border-eclipse-border px-5 py-4 text-sm font-semibold text-eclipse-text">
            My Positions
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-eclipse-surface/60 text-[11px] uppercase tracking-wider text-eclipse-muted">
              <tr>
                <th className="px-5 py-2 font-medium">Vault</th>
                <th className="px-3 py-2 font-medium text-right">Deposited</th>
                <th className="px-3 py-2 font-medium text-right">Current value</th>
                <th className="px-3 py-2 font-medium text-right">P&L</th>
                <th className="px-5 py-2 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {mockPositions.map((p) => (
                <tr key={p.vaultId} className="border-t border-eclipse-border/70">
                  <td className="px-5 py-3">
                    <Link to="/vaults/$id" params={{ id: p.vaultId }} className="text-eclipse-text hover:text-eclipse-purple">
                      {p.vaultName}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-eclipse-text">{fmtUSD(p.deposited)}</td>
                  <td className="px-3 py-3 text-right font-mono text-eclipse-text">{fmtUSD(p.currentValue)}</td>
                  <td className={`px-3 py-3 text-right font-mono ${p.pnlPct >= 0 ? "text-eclipse-teal" : "text-eclipse-danger"}`}>
                    {p.pnlPct >= 0 ? "+" : ""}
                    {p.pnlPct.toFixed(2)}%
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => toast("Withdraw initiated", { description: p.vaultName })}
                      className="rounded-md border border-eclipse-border px-3 py-1 text-xs text-eclipse-text hover:border-eclipse-purple/60"
                    >
                      Withdraw
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mx-auto mt-6 max-w-7xl px-6 pb-16">
        <div className="glass-card overflow-hidden">
          <div className="border-b border-eclipse-border px-5 py-4 text-sm font-semibold text-eclipse-text">
            Transaction history
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-eclipse-surface/60 text-[11px] uppercase tracking-wider text-eclipse-muted">
              <tr>
                <th className="px-5 py-2 font-medium">Time</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Vault</th>
                <th className="px-3 py-2 font-medium text-right">Amount</th>
                <th className="px-5 py-2 font-medium">Tx</th>
              </tr>
            </thead>
            <tbody className="font-mono text-xs">
              {mockTransactions.map((t) => (
                <tr key={t.id} className="border-t border-eclipse-border/70">
                  <td className="px-5 py-3 text-eclipse-muted">{new Date(t.ts).toLocaleString()}</td>
                  <td className="px-3 py-3">
                    <span className={t.kind === "Deposit" ? "text-eclipse-teal" : "text-eclipse-danger"}>{t.kind}</span>
                  </td>
                  <td className="px-3 py-3 text-eclipse-text">{t.vaultName}</td>
                  <td className="px-3 py-3 text-right text-eclipse-text">{fmtUSD(t.amount)}</td>
                  <td className="px-5 py-3 text-eclipse-purple">{t.txHash}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
