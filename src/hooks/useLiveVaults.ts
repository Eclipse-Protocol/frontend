import { useMemo } from "react";
import { useReadContracts } from "wagmi";
import type { Address } from "viem";
import { formatUnits } from "viem";
import { ALPHA_VAULT_ABI } from "@/abi/alphaVault";
import { PERFORMANCE_LEDGER_ABI } from "@/abi/performanceLedger";
import { STRATEGY_REGISTRY, ENCLAVE_REGISTRY, ERC20_ABI } from "@/lib/contracts";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as Address;
const THIRTY_DAYS_SEC = 30n * 24n * 60n * 60n;

export type LiveStatus = "Live" | "Delayed" | "Offline" | "No data";

export interface LiveVaultSummary {
  vaultAddress: Address;
  name: string;
  strategistAddress: Address;

  bondAmount: bigint;
  bondSymbol?: string;
  bondDecimals?: number;

  underlyingSymbol?: string;
  underlyingDecimals?: number;
  positionSymbol?: string;
  pairLabel?: string;

  totalAssets?: bigint;
  totalSupply?: bigint;
  shareDecimals?: number;
  highWaterMark?: bigint;
  paused?: boolean;

  teeVerified: boolean;
  enclaveSigner?: Address;

  epochCount?: number;
  navSeries: { nav: number }[];
  epochTimestamps: bigint[];

  perfAllPct?: number;
  perf30dPct?: number;

  liveStatus: LiveStatus;
  /** Timestamp of the most recent committed epoch. `_commitEpoch()` is only ever called from inside
   * `submitInstruction()`, right after a trade executes — so this is exactly the last trade time,
   * not an approximation. */
  lastEpochTimestamp?: bigint;
  /** Count of epochs (== trades) whose timestamp falls on today's UTC calendar date. */
  tradesToday?: number;

  /** Independently-verifiable real facts, not a synthesized/weighted score. */
  trustChecks: {
    teeVerified: boolean;
    bondLocked: boolean;
    activeTrader: boolean;
  };

  isLoading: boolean;
  error?: string;
}

/** Reads every registered strategy from StrategyRegistry and assembles real, on-chain vault
 * summaries for the marketplace. No field is fabricated: anything that can't be read yet is left
 * `undefined` and rendered as "Loading…" / "No data available" by the caller. */
export function useLiveVaults() {
  const countQuery = useReadContracts({
    contracts: [{ ...STRATEGY_REGISTRY, functionName: "strategyCount" } as const],
  });
  const strategyCount =
    countQuery.data?.[0]?.status === "success"
      ? Number(countQuery.data[0].result as bigint)
      : undefined;

  const strategiesQuery = useReadContracts({
    contracts: Array.from({ length: strategyCount ?? 0 }, (_, i) => ({
      ...STRATEGY_REGISTRY,
      functionName: "getStrategy",
      args: [BigInt(i)],
    })),
    query: { enabled: strategyCount !== undefined && strategyCount > 0 },
  });

  type StrategyResult = { name: string; vault: Address; strategist: Address; bondAmount: bigint };

  const strategies = useMemo(() => {
    if (!strategiesQuery.data) return [];
    return strategiesQuery.data
      .map((r) => (r.status === "success" ? (r.result as unknown as StrategyResult) : undefined))
      .filter((s): s is StrategyResult => !!s);
  }, [strategiesQuery.data]);

  const bondTokenQuery = useReadContracts({
    contracts: [{ ...STRATEGY_REGISTRY, functionName: "bondToken" } as const],
    query: { enabled: strategies.length > 0 },
  });
  const bondTokenAddress =
    bondTokenQuery.data?.[0]?.status === "success"
      ? (bondTokenQuery.data[0].result as Address)
      : undefined;

  const bondTokenMetaQuery = useReadContracts({
    contracts: bondTokenAddress
      ? ([
          { address: bondTokenAddress, abi: ERC20_ABI, functionName: "decimals" },
          { address: bondTokenAddress, abi: ERC20_ABI, functionName: "symbol" },
        ] as const)
      : [],
    query: { enabled: !!bondTokenAddress },
  });
  const bondDecimals =
    bondTokenMetaQuery.data?.[0]?.status === "success"
      ? (bondTokenMetaQuery.data[0].result as number)
      : undefined;
  const bondSymbol =
    bondTokenMetaQuery.data?.[1]?.status === "success"
      ? (bondTokenMetaQuery.data[1].result as string)
      : undefined;

  // Per-vault core reads, 7 calls per vault, flattened into one batch.
  const coreFields = [
    "totalAssets",
    "totalSupply",
    "highWaterMark",
    "asset",
    "currentPosition",
    "paused",
    "decimals",
    "performanceLedger",
  ] as const;
  const coreQuery = useReadContracts({
    contracts: strategies.flatMap((s) =>
      coreFields.map((functionName) => ({ address: s.vault, abi: ALPHA_VAULT_ABI, functionName })),
    ),
    query: { enabled: strategies.length > 0 },
  });

  const core = useMemo(() => {
    if (!coreQuery.data) return [];
    return strategies.map((s, i) => {
      const base = i * coreFields.length;
      const get = (offset: number) => coreQuery.data![base + offset];
      const val = <T>(offset: number): T | undefined =>
        get(offset)?.status === "success" ? (get(offset).result as unknown as T) : undefined;
      return {
        vault: s.vault,
        totalAssets: val<bigint>(0),
        totalSupply: val<bigint>(1),
        highWaterMark: val<bigint>(2),
        asset: val<Address>(3),
        currentPosition: val<Address>(4),
        paused: val<boolean>(5),
        shareDecimals: val<number>(6),
        performanceLedger: val<Address>(7),
      };
    });
  }, [coreQuery.data, strategies]);

  // Per-vault dependent reads: underlying symbol/decimals, position symbol, enclave signer, epochCount.
  const depContracts = useMemo(() => {
    const out: {
      address: Address;
      abi: typeof ERC20_ABI | typeof ENCLAVE_REGISTRY.abi | typeof PERFORMANCE_LEDGER_ABI;
      functionName: string;
      args?: readonly unknown[];
    }[] = [];
    const meta: { vault: Address; field: string }[] = [];
    for (const c of core) {
      if (c.asset) {
        out.push({ address: c.asset, abi: ERC20_ABI, functionName: "symbol" });
        meta.push({ vault: c.vault, field: "underlyingSymbol" });
        out.push({ address: c.asset, abi: ERC20_ABI, functionName: "decimals" });
        meta.push({ vault: c.vault, field: "underlyingDecimals" });
      }
      if (c.currentPosition && c.currentPosition !== ZERO_ADDRESS) {
        out.push({ address: c.currentPosition, abi: ERC20_ABI, functionName: "symbol" });
        meta.push({ vault: c.vault, field: "positionSymbol" });
      }
      out.push({
        address: ENCLAVE_REGISTRY.address,
        abi: ENCLAVE_REGISTRY.abi,
        functionName: "signerOf",
        args: [c.vault],
      });
      meta.push({ vault: c.vault, field: "enclaveSigner" });
      if (c.performanceLedger) {
        out.push({
          address: c.performanceLedger,
          abi: PERFORMANCE_LEDGER_ABI,
          functionName: "epochCount",
        });
        meta.push({ vault: c.vault, field: "epochCount" });
      }
    }
    return { out, meta };
  }, [core]);

  const depQuery = useReadContracts({
    contracts: depContracts.out,
    query: { enabled: core.length > 0 && depContracts.out.length > 0 },
  });

  const dep = useMemo(() => {
    const byVault = new Map<Address, Record<string, unknown>>();
    if (depQuery.data) {
      depQuery.data.forEach((r, i) => {
        const m = depContracts.meta[i];
        if (!m) return;
        const existing = byVault.get(m.vault) ?? {};
        existing[m.field] = r.status === "success" ? r.result : undefined;
        byVault.set(m.vault, existing);
      });
    }
    return byVault;
  }, [depQuery.data, depContracts.meta]);

  // Per-vault epoch history, only for vaults with epochCount > 0.
  const epochContracts = useMemo(() => {
    const out: {
      address: Address;
      abi: typeof PERFORMANCE_LEDGER_ABI;
      functionName: string;
      args: readonly [bigint, bigint];
    }[] = [];
    const meta: Address[] = [];
    for (const c of core) {
      const epochCount = Number((dep.get(c.vault)?.epochCount as bigint | undefined) ?? 0n);
      if (c.performanceLedger && epochCount > 0) {
        const limit = BigInt(Math.min(epochCount, 60));
        out.push({
          address: c.performanceLedger,
          abi: PERFORMANCE_LEDGER_ABI,
          functionName: "getEpochs",
          args: [0n, limit],
        });
        meta.push(c.vault);
      }
    }
    return { out, meta };
  }, [core, dep]);

  const epochQuery = useReadContracts({
    contracts: epochContracts.out,
    query: { enabled: epochContracts.out.length > 0 && dep.size > 0 },
  });

  type EpochResult = { nav: bigint; timestamp: bigint; hash: `0x${string}` };

  const epochsByVault = useMemo(() => {
    const byVault = new Map<Address, EpochResult[]>();
    if (epochQuery.data) {
      epochQuery.data.forEach((r, i) => {
        const vault = epochContracts.meta[i];
        if (vault && r.status === "success") {
          byVault.set(vault, r.result as unknown as EpochResult[]);
        }
      });
    }
    return byVault;
  }, [epochQuery.data, epochContracts.meta]);

  const isLoading =
    countQuery.isLoading ||
    (strategyCount !== undefined &&
      strategyCount > 0 &&
      (strategiesQuery.isLoading || coreQuery.isLoading || depQuery.isLoading));

  const vaults: LiveVaultSummary[] = useMemo(() => {
    return strategies.map((s) => {
      const c = core.find((x) => x.vault === s.vault);
      const d = dep.get(s.vault) ?? {};
      const epochs = epochsByVault.get(s.vault);
      const underlyingDecimals = d.underlyingDecimals as number | undefined;

      const navSeries =
        epochs && underlyingDecimals !== undefined
          ? epochs.map((e) => ({ nav: Number(formatUnits(e.nav, underlyingDecimals)) }))
          : [];

      let perfAllPct: number | undefined;
      let perf30dPct: number | undefined;
      let lastEpochTimestamp: bigint | undefined;
      if (epochs && epochs.length > 0) {
        lastEpochTimestamp = epochs[epochs.length - 1].timestamp;
        const first = epochs[0];
        const last = epochs[epochs.length - 1];
        if (first.nav > 0n) {
          perfAllPct = (Number(last.nav - first.nav) / Number(first.nav)) * 100;
        }
        const cutoff = last.timestamp > THIRTY_DAYS_SEC ? last.timestamp - THIRTY_DAYS_SEC : 0n;
        const within30d = epochs.filter((e) => e.timestamp >= cutoff);
        if (within30d.length >= 2 && within30d[0].nav > 0n) {
          perf30dPct =
            (Number(within30d[within30d.length - 1].nav - within30d[0].nav) /
              Number(within30d[0].nav)) *
            100;
        }
      }

      let liveStatus: LiveStatus = "No data";
      if (lastEpochTimestamp !== undefined) {
        const ageSec = Math.floor(Date.now() / 1000) - Number(lastEpochTimestamp);
        liveStatus = ageSec < 15 * 60 ? "Live" : ageSec < 60 * 60 ? "Delayed" : "Offline";
      }

      let tradesToday: number | undefined;
      if (epochs) {
        const todayUtc = new Date().toISOString().slice(0, 10);
        tradesToday = epochs.filter(
          (e) => new Date(Number(e.timestamp) * 1000).toISOString().slice(0, 10) === todayUtc,
        ).length;
      }

      const enclaveSigner = d.enclaveSigner as Address | undefined;
      const teeVerified = !!enclaveSigner && enclaveSigner !== ZERO_ADDRESS;

      const underlyingSymbol = d.underlyingSymbol as string | undefined;
      const positionSymbol = d.positionSymbol as string | undefined;
      const pairLabel = underlyingSymbol
        ? positionSymbol
          ? `${positionSymbol}/${underlyingSymbol}`
          : underlyingSymbol
        : undefined;

      const coreFailed = !!coreQuery.data && !c;

      return {
        vaultAddress: s.vault,
        name: s.name,
        strategistAddress: s.strategist,
        bondAmount: s.bondAmount,
        bondSymbol,
        bondDecimals,
        underlyingSymbol,
        underlyingDecimals,
        positionSymbol,
        pairLabel,
        totalAssets: c?.totalAssets,
        totalSupply: c?.totalSupply,
        shareDecimals: c?.shareDecimals,
        highWaterMark: c?.highWaterMark,
        paused: c?.paused,
        teeVerified,
        enclaveSigner,
        epochCount: d.epochCount !== undefined ? Number(d.epochCount as bigint) : undefined,
        navSeries,
        epochTimestamps: epochs?.map((e) => e.timestamp) ?? [],
        perfAllPct,
        perf30dPct,
        liveStatus,
        lastEpochTimestamp,
        tradesToday,
        trustChecks: {
          teeVerified,
          bondLocked: s.bondAmount > 0n,
          activeTrader: (d.epochCount !== undefined ? Number(d.epochCount as bigint) : 0) > 0,
        },
        isLoading: coreQuery.isLoading || depQuery.isLoading,
        error: coreFailed ? "Could not read vault state" : undefined,
      };
    });
  }, [
    strategies,
    core,
    dep,
    epochsByVault,
    bondSymbol,
    bondDecimals,
    coreQuery.data,
    coreQuery.isLoading,
    depQuery.isLoading,
  ]);

  return {
    vaults,
    strategyCount,
    isLoading,
    isError: countQuery.isError || strategiesQuery.isError,
  };
}
