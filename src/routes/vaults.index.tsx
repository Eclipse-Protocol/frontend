import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/eclipse/AppShell";
import { VaultCard } from "@/components/eclipse/VaultCard";
import { mockVaults } from "@/lib/mock-data";
import type { RiskTier } from "@/lib/types";

export const Route = createFileRoute("/vaults/")({
  head: () => ({
    meta: [
      { title: "Vault Marketplace — Eclipse Protocol" },
      { name: "description", content: "Explore TEE-verified vaults. Filter by APY, TVL, and risk tier." },
      { property: "og:title", content: "Vault Marketplace — Eclipse Protocol" },
      { property: "og:description", content: "Explore TEE-verified vaults." },
    ],
  }),
  component: VaultsPage,
});

type Sort = "APY" | "TVL" | "30d" | "Attestation";

function VaultsPage() {
  const [sort, setSort] = useState<Sort>("APY");
  const [risk, setRisk] = useState<RiskTier | "All">("All");
  const [pair, setPair] = useState<string>("All");

  const pairs = useMemo(() => ["All", ...Array.from(new Set(mockVaults.map((v) => v.assetPair)))], []);

  const vaults = useMemo(() => {
    let out = [...mockVaults];
    if (risk !== "All") out = out.filter((v) => v.riskTier === risk);
    if (pair !== "All") out = out.filter((v) => v.assetPair === pair);
    out.sort((a, b) => {
      switch (sort) {
        case "TVL": return b.tvl - a.tvl;
        case "30d": return b.perf30d - a.perf30d;
        case "Attestation": return a.attestationAgeSec - b.attestationAgeSec;
        default: return b.apy - a.apy;
      }
    });
    return out;
  }, [sort, risk, pair]);

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-6 pt-12 pb-6">
        <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-eclipse-gold">Marketplace</div>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-eclipse-text">Live Vaults</h1>
        <p className="mt-2 max-w-2xl text-eclipse-muted">
          Every vault runs inside an attested enclave. Every trade is cryptographically signed. Every NAV is on-chain.
        </p>
      </div>

      <div className="mx-auto max-w-7xl px-6">
        <div className="glass-card flex flex-wrap items-center gap-3 p-3">
          <Select label="Sort" value={sort} onChange={(v) => setSort(v as Sort)} options={["APY", "TVL", "30d", "Attestation"]} />
          <Select label="Risk" value={risk} onChange={(v) => setRisk(v as RiskTier | "All")} options={["All", "Conservative", "Balanced", "Aggressive"]} />
          <Select label="Pair" value={pair} onChange={setPair} options={pairs} />
          <div className="ml-auto text-xs text-eclipse-muted">
            {vaults.length} vault{vaults.length === 1 ? "" : "s"}
          </div>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {vaults.map((v) => <VaultCard key={v.id} vault={v} />)}
        </div>
      </div>
    </AppShell>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <label className="flex items-center gap-2 text-xs text-eclipse-muted">
      {label}:
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-eclipse-border bg-eclipse-surface px-2.5 py-1.5 text-sm text-eclipse-text outline-none focus:border-eclipse-purple/60"
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}
