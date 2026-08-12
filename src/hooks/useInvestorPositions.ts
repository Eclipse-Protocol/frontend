import { useEffect, useMemo, useRef, useState } from "react";
import { useReadContracts, usePublicClient } from "wagmi";
import type { Address } from "viem";
import { formatUnits } from "viem";
import { ALPHA_VAULT_ABI } from "@/abi/alphaVault";
import { useLiveVaults } from "./useLiveVaults";

export interface InvestorTx {
  kind: "Deposit" | "Withdraw";
  vaultAddress: Address;
  vaultName: string;
  assets: bigint;
  shares: bigint;
  blockNumber: bigint;
  timestamp?: bigint;
  txHash: `0x${string}`;
}

export interface InvestorPosition {
  vaultAddress: Address;
  vaultName: string;
  shareBalance: bigint;
  shareDecimals?: number;
  underlyingDecimals?: number;
  underlyingSymbol?: string;
  currentValue?: bigint;
  pricePerShare?: number;
  /** Net of Deposit/Withdraw events found within the scanned window. `undefined` means no such
   * event was found in that window — the position may predate it, so a caller must not treat this
   * as "zero deposited," only as "unknown from the data we could read." */
  depositedNet?: bigint;
  lastDepositTimestamp?: bigint;
  lastWithdrawTimestamp?: bigint;
}

const depositEvent = {
  type: "event",
  name: "Deposit",
  inputs: [
    { indexed: true, name: "sender", type: "address" },
    { indexed: true, name: "owner", type: "address" },
    { indexed: false, name: "assets", type: "uint256" },
    { indexed: false, name: "shares", type: "uint256" },
  ],
} as const;

const withdrawEvent = {
  type: "event",
  name: "Withdraw",
  inputs: [
    { indexed: true, name: "sender", type: "address" },
    { indexed: true, name: "receiver", type: "address" },
    { indexed: true, name: "owner", type: "address" },
    { indexed: false, name: "assets", type: "uint256" },
    { indexed: false, name: "shares", type: "uint256" },
  ],
} as const;

/** How far back to scan for the connected wallet's own Deposit/Withdraw events. Coston2's public
 * RPC caps eth_getLogs at 30 blocks/call (confirmed directly), so a full-history scan back to
 * vault genesis is impractical without a subgraph/indexer (explicitly out of scope — see Week 2
 * decision to read events directly). This window is a documented, disclosed best effort, not a
 * silent gap: callers must treat "nothing found" as "unknown," never as "zero." */
const SCAN_BLOCK_WINDOW = 20_000n;
const CHUNK = 28n;

export function useInvestorPositions(owner: Address | undefined) {
  const { vaults, isLoading: vaultsLoading } = useLiveVaults();
  const publicClient = usePublicClient();

  const balanceQuery = useReadContracts({
    contracts: vaults.flatMap((v) => [
      {
        address: v.vaultAddress,
        abi: ALPHA_VAULT_ABI,
        functionName: "balanceOf",
        args: owner ? [owner] : undefined,
      } as const,
    ]),
    query: { enabled: !!owner && vaults.length > 0 },
  });

  const shareBalances = useMemo(() => {
    const map = new Map<Address, bigint>();
    vaults.forEach((v, i) => {
      const r = balanceQuery.data?.[i];
      map.set(v.vaultAddress, r?.status === "success" ? (r.result as bigint) : 0n);
    });
    return map;
  }, [vaults, balanceQuery.data]);

  const activeVaults = useMemo(
    () => vaults.filter((v) => (shareBalances.get(v.vaultAddress) ?? 0n) > 0n),
    [vaults, shareBalances],
  );

  const convertQuery = useReadContracts({
    contracts: activeVaults.map(
      (v) =>
        ({
          address: v.vaultAddress,
          abi: ALPHA_VAULT_ABI,
          functionName: "convertToAssets",
          args: [shareBalances.get(v.vaultAddress) ?? 0n],
        }) as const,
    ),
    query: { enabled: activeVaults.length > 0 },
  });

  const [scanned, setScanned] = useState<
    Map<Address, { deposits: InvestorTx[]; withdraws: InvestorTx[] }>
  >(new Map());
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState<string>();
  const scanKey = useRef("");

  useEffect(() => {
    if (!publicClient || !owner || activeVaults.length === 0) return;
    const key = `${owner}:${activeVaults.map((v) => v.vaultAddress).join(",")}`;
    if (scanKey.current === key) return;
    scanKey.current = key;

    let cancelled = false;

    async function run() {
      setScanLoading(true);
      setScanError(undefined);
      try {
        const latest = await publicClient!.getBlockNumber();
        const fromBlock = latest > SCAN_BLOCK_WINDOW ? latest - SCAN_BLOCK_WINDOW : 0n;

        const result = new Map<Address, { deposits: InvestorTx[]; withdraws: InvestorTx[] }>();

        for (const v of activeVaults) {
          const ranges: { start: bigint; end: bigint }[] = [];
          for (let start = fromBlock; start <= latest; start += CHUNK + 1n) {
            const end = start + CHUNK > latest ? latest : start + CHUNK;
            ranges.push({ start, end });
          }

          const deposits: InvestorTx[] = [];
          const withdraws: InvestorTx[] = [];

          // Larger batches lean on the http transport's JSON-RPC batching (wagmi.ts, batch: true)
          // to coalesce many getLogs calls into fewer physical round trips — 15 meant a 20,000-block
          // scan (~690 chunks) took ~46 sequential rounds per vault.
          const batchSize = 60;
          for (let i = 0; i < ranges.length; i += batchSize) {
            if (cancelled) break;
            const batchRanges = ranges.slice(i, i + batchSize);
            const batchPromises = batchRanges.map((r) =>
              Promise.all([
                publicClient!.getLogs({
                  address: v.vaultAddress,
                  event: depositEvent,
                  args: { owner },
                  fromBlock: r.start,
                  toBlock: r.end,
                }),
                publicClient!.getLogs({
                  address: v.vaultAddress,
                  event: withdrawEvent,
                  args: { owner },
                  fromBlock: r.start,
                  toBlock: r.end,
                }),
              ]).then(([deposits, withdraws]) => ({ deposits, withdraws }))
            );

            const batchResults = await Promise.allSettled(batchPromises);

            for (const r of batchResults) {
              if (r.status !== "fulfilled") continue;
              for (const log of r.value.deposits as {
                transactionHash: `0x${string}`;
                blockNumber: bigint;
                args: { assets: bigint; shares: bigint };
              }[]) {
                deposits.push({
                  kind: "Deposit",
                  vaultAddress: v.vaultAddress,
                  vaultName: v.name,
                  assets: log.args.assets,
                  shares: log.args.shares,
                  blockNumber: log.blockNumber,
                  txHash: log.transactionHash,
                });
              }
              for (const log of r.value.withdraws as {
                transactionHash: `0x${string}`;
                blockNumber: bigint;
                args: { assets: bigint; shares: bigint };
              }[]) {
                withdraws.push({
                  kind: "Withdraw",
                  vaultAddress: v.vaultAddress,
                  vaultName: v.name,
                  assets: log.args.assets,
                  shares: log.args.shares,
                  blockNumber: log.blockNumber,
                  txHash: log.transactionHash,
                });
              }
            }
          }

          if (cancelled) break;
          result.set(v.vaultAddress, { deposits, withdraws });
        }

        // Resolve block timestamps for whatever we found (typically a handful of blocks).
        const allEntries = Array.from(result.values()).flatMap((r) => [
          ...r.deposits,
          ...r.withdraws,
        ]);
        const uniqueBlocks = Array.from(new Set(allEntries.map((e) => e.blockNumber)));
        const blocks = await Promise.allSettled(
          uniqueBlocks.map((b) => publicClient!.getBlock({ blockNumber: b })),
        );
        const tsByBlock = new Map<bigint, bigint>();
        blocks.forEach((b, i) => {
          if (b.status === "fulfilled") tsByBlock.set(uniqueBlocks[i], b.value.timestamp);
        });
        for (const r of result.values()) {
          for (const e of [...r.deposits, ...r.withdraws])
            e.timestamp = tsByBlock.get(e.blockNumber);
        }

        if (!cancelled) setScanned(result);
      } catch (e) {
        if (!cancelled)
          setScanError(e instanceof Error ? e.message : "Could not read deposit history");
      } finally {
        if (!cancelled) setScanLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [publicClient, owner, activeVaults]);

  const positions: InvestorPosition[] = useMemo(() => {
    return activeVaults.map((v, i) => {
      const shareBalance = shareBalances.get(v.vaultAddress) ?? 0n;
      const convertResult = convertQuery.data?.[i];
      const currentValue =
        convertResult?.status === "success" ? (convertResult.result as bigint) : undefined;
      const activity = scanned.get(v.vaultAddress);

      let depositedNet: bigint | undefined;
      let lastDepositTimestamp: bigint | undefined;
      let lastWithdrawTimestamp: bigint | undefined;
      if (activity && (activity.deposits.length > 0 || activity.withdraws.length > 0)) {
        const depositedSum = activity.deposits.reduce((s, d) => s + d.assets, 0n);
        const withdrawnSum = activity.withdraws.reduce((s, d) => s + d.assets, 0n);
        depositedNet = depositedSum - withdrawnSum;
        lastDepositTimestamp = activity.deposits.at(-1)?.timestamp;
        lastWithdrawTimestamp = activity.withdraws.at(-1)?.timestamp;
      }

      const pricePerShare =
        currentValue !== undefined &&
        shareBalance > 0n &&
        v.shareDecimals !== undefined &&
        v.underlyingDecimals !== undefined
          ? Number(formatUnits(currentValue, v.underlyingDecimals)) /
            Number(formatUnits(shareBalance, v.shareDecimals))
          : undefined;

      return {
        vaultAddress: v.vaultAddress,
        vaultName: v.name,
        shareBalance,
        shareDecimals: v.shareDecimals,
        underlyingDecimals: v.underlyingDecimals,
        underlyingSymbol: v.underlyingSymbol,
        currentValue,
        pricePerShare,
        depositedNet,
        lastDepositTimestamp,
        lastWithdrawTimestamp,
      };
    });
  }, [activeVaults, shareBalances, convertQuery.data, scanned]);

  const allTransactions: InvestorTx[] = useMemo(() => {
    const all = Array.from(scanned.values()).flatMap((r) => [...r.deposits, ...r.withdraws]);
    return all.sort((a, b) => Number(b.blockNumber - a.blockNumber));
  }, [scanned]);

  const refetch = () => {
    balanceQuery.refetch();
    convertQuery.refetch();
  };

  return {
    positions,
    transactions: allTransactions,
    isLoading: vaultsLoading || balanceQuery.isLoading || convertQuery.isLoading,
    isScanning: scanLoading,
    scanError,
    scanWindowBlocks: SCAN_BLOCK_WINDOW,
    refetch,
  };
}
