import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/eclipse/AppShell";
import { VaultCard, VaultCardSkeleton } from "@/components/eclipse/VaultCard";
import { useLiveVaults } from "@/hooks/useLiveVaults";
import type { LiveVaultSummary } from "@/hooks/useLiveVaults";
import { formatUnits } from "viem";

export const Route = createFileRoute("/vaults/")({
  head: () => ({
    meta: [
      { title: "Vault Marketplace — Eclipse Protocol" },
      {
        name: "description",
        content: "Explore FDC-verified vaults on Coston2 testnet. Filter by TVL and performance.",
      },
      { property: "og:title", content: "Vault Marketplace — Eclipse Protocol" },
      { property: "og:description", content: "Explore FDC-verified vaults on Coston2 testnet." },
    ],
  }),
  component: VaultsPage,
});

type Sort = "TVL" | "Since inception" | "Newest" | "Highest bond";

function tvlNumber(v: LiveVaultSummary) {
  if (v.totalAssets === undefined || v.underlyingDecimals === undefined) return -1;
  return Number(formatUnits(v.totalAssets, v.underlyingDecimals));
}

function bondNumber(v: LiveVaultSummary) {
  if (v.bondDecimals === undefined) return -1;
  return Number(formatUnits(v.bondAmount, v.bondDecimals));
}

function VaultsPage() {
  const { vaults, strategyCount, isLoading, isError } = useLiveVaults();

  const [sort, setSort] = useState<Sort>("TVL");
  const [pair, setPair] = useState<string>("All");
  const [teeOnly, setTeeOnly] = useState(false);
  const [liveOnly, setLiveOnly] = useState(false);

  const pairs = useMemo(() => {
    const found = vaults.map((v) => v.pairLabel).filter((p): p is string => !!p);
    return ["All", ...Array.from(new Set(found))];
  }, [vaults]);

  const filtered = useMemo(() => {
    let out = [...vaults];
    if (pair !== "All") out = out.filter((v) => v.pairLabel === pair);
    if (teeOnly) out = out.filter((v) => v.teeVerified);
    if (liveOnly) out = out.filter((v) => v.liveStatus === "Live");

    out.sort((a, b) => {
      switch (sort) {
        case "TVL":
          return tvlNumber(b) - tvlNumber(a);
        case "Since inception":
          return (b.perfAllPct ?? -Infinity) - (a.perfAllPct ?? -Infinity);
        case "Highest bond":
          return bondNumber(b) - bondNumber(a);
        case "Newest":
          // Registration order in StrategyRegistry is chronological; reverse for newest-first.
          return vaults.indexOf(b) - vaults.indexOf(a);
        default:
          return 0;
      }
    });
    return out;
  }, [vaults, sort, pair, teeOnly, liveOnly]);

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-6 pt-12 pb-6">
        <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-eclipse-gold">
          Marketplace
        </div>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-eclipse-text">
          Live Vaults
        </h1>
        <p className="mt-2 max-w-2xl text-eclipse-muted">
          Every vault runs inside an attested enclave. Every trade is cryptographically signed.
          Every NAV is on-chain.
        </p>
      </div>

      <div className="mx-auto max-w-7xl px-6">
        <div className="glass-card flex flex-wrap items-center gap-3 p-3">
          <Select
            label="Sort"
            value={sort}
            onChange={(v) => setSort(v as Sort)}
            options={["TVL", "Since inception", "Newest", "Highest bond"]}
          />
          <Select label="Pair" value={pair} onChange={setPair} options={pairs} />
          <Toggle label="FDC-Verified" checked={teeOnly} onChange={setTeeOnly} />
          <Toggle label="Live" checked={liveOnly} onChange={setLiveOnly} />
          <div className="ml-auto text-xs text-eclipse-muted">
            {isLoading ? "Loading…" : `${filtered.length} vault${filtered.length === 1 ? "" : "s"}`}
          </div>
        </div>

        {isError && (
          <div className="mt-6 rounded-lg border border-eclipse-danger/40 bg-eclipse-danger/10 p-4 text-sm text-eclipse-danger">
            Could not read StrategyRegistry from the chain. Check your wallet's network is set to
            Coston2 and try again.
          </div>
        )}

        {!isError && strategyCount === 0 && (
          <div className="mt-6 glass-card p-10 text-center text-sm text-eclipse-muted">
            No deployed vaults yet.
          </div>
        )}

        {!isError &&
          strategyCount !== undefined &&
          strategyCount > 0 &&
          filtered.length === 0 &&
          !isLoading && (
            <div className="mt-6 glass-card p-10 text-center text-sm text-eclipse-muted">
              No vaults match the current filters.
            </div>
          )}

        <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {isLoading &&
            strategyCount === undefined &&
            Array.from({ length: 3 }).map((_, i) => <VaultCardSkeleton key={i} />)}
          {filtered.map((v) => (
            <VaultCard key={v.vaultAddress} vault={v} />
          ))}
        </div>
      </div>
    </AppShell>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-eclipse-muted">
      {label}:
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-eclipse-border bg-eclipse-surface px-2.5 py-1.5 text-sm text-eclipse-text outline-none focus:border-eclipse-purple/60"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-eclipse-muted">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-eclipse-purple"
      />
      {label}
    </label>
  );
}
