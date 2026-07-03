import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/eclipse/AppShell";
import { StatCard } from "@/components/eclipse/StatCard";
import { PerformanceChart } from "@/components/eclipse/PerformanceChart";
import { LiveIndicator } from "@/components/eclipse/LiveIndicator";
import { AttestationBadge } from "@/components/eclipse/AttestationBadge";
import { mockVaults } from "@/lib/mock-data";
import { Rocket, Activity } from "lucide-react";

export const Route = createFileRoute("/strategist")({
  head: () => ({
    meta: [
      { title: "Strategist Dashboard — Eclipse Protocol" },
      { name: "description", content: "Manage your Eclipse Protocol vault and enclave." },
      { property: "og:title", content: "Strategist Dashboard — Eclipse Protocol" },
      { property: "og:description", content: "Manage your Eclipse Protocol vault and enclave." },
    ],
  }),
  component: Strategist,
});

const fmtUSD = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : `$${n.toLocaleString()}`;

function Strategist() {
  const vault = mockVaults[0];

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-6 pt-12">
        <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-eclipse-gold">Strategist</div>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-eclipse-text">{vault.name}</h1>
            <p className="mt-2 text-eclipse-muted">
              Managed by <span className="font-mono">{vault.strategist}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <AttestationBadge label="Enclave Verified" />
            <LiveIndicator label="Enclave: Active" />
          </div>
        </div>
      </div>

      <div className="mx-auto mt-8 grid max-w-7xl gap-4 px-6 md:grid-cols-4">
        <StatCard label="Vault TVL" value={fmtUSD(vault.tvl)} />
        <StatCard label="Investors" value="142" mono={false} />
        <StatCard label="Fees earned (all-time)" value={fmtUSD(72_400)} />
        <StatCard label="Bond staked" value={fmtUSD(vault.bond)} hint="Slashable" />
      </div>

      <div className="mx-auto mt-6 grid max-w-7xl gap-6 px-6 lg:grid-cols-3">
        <div className="glass-card p-5 lg:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-semibold text-eclipse-text">Vault performance</div>
            <span className="text-xs text-eclipse-muted">Last 30 days</span>
          </div>
          <PerformanceChart data={vault.navHistory.slice(-60)} height={280} />
        </div>

        <div className="glass-card p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-eclipse-text">
            <Activity className="h-4 w-4 text-eclipse-purple" /> Enclave status
          </div>
          <ul className="space-y-3 text-sm">
            <StatusRow k="Status" v={<LiveIndicator label="Active" />} />
            <StatusRow k="Uptime" v={<span className="font-mono text-eclipse-text">99.982%</span>} />
            <StatusRow k="Last attestation" v={<span className="font-mono text-eclipse-text">{vault.attestationAgeSec}s ago</span>} />
            <StatusRow k="TEE" v={<span className="font-mono text-eclipse-text">{vault.teeType}</span>} />
            <StatusRow k="Code hash" v={<span className="font-mono text-xs text-eclipse-purple">0x9f21e3…b19c</span>} />
          </ul>
          <Link
            to="/deploy"
            className="mt-6 flex items-center justify-center gap-2 rounded-lg border border-eclipse-purple/50 bg-eclipse-purple/10 py-2.5 text-sm font-medium text-eclipse-text hover:bg-eclipse-purple/20"
          >
            <Rocket className="h-4 w-4" /> Deploy new strategy
          </Link>
        </div>
      </div>
    </AppShell>
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
