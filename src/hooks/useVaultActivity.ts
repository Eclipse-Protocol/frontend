import { useEffect, useRef, useState } from "react";
import { usePublicClient, useWatchContractEvent } from "wagmi";
import type { Address } from "viem";
import { ALPHA_VAULT_ABI } from "@/abi/alphaVault";

export interface TradeEvent {
  txHash: `0x${string}`;
  blockNumber: bigint;
  timestamp?: bigint;
  asset: Address;
  direction: number;
  amountIn: bigint;
  amountOut: bigint;
  nonce: bigint;
}

export interface HarvestEvent {
  txHash: `0x${string}`;
  blockNumber: bigint;
  timestamp?: bigint;
  currentPPS: bigint;
  treasuryShares: bigint;
  strategistShares: bigint;
}

/** Coston2's public RPC caps eth_getLogs at 30 blocks per call, so a naive full-history scan is
 * impossible. Instead, each already-known epoch (from PerformanceLedger — `_commitEpoch()` only
 * ever fires from inside `submitInstruction()`, in the same tx as the trade) gives us an exact
 * timestamp to anchor a narrow ±14-block search window around an estimated block number. New
 * trades/harvests after the page loads are picked up live via `useWatchContractEvent`, which only
 * ever polls small recent ranges and stays well under the cap. */
export function useVaultActivity(
  vaultAddress: Address | undefined,
  epochTimestamps: bigint[] | undefined,
) {
  const publicClient = usePublicClient();
  const [trades, setTrades] = useState<TradeEvent[]>([]);
  const [harvests, setHarvests] = useState<HarvestEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const scannedKey = useRef<string>("");

  useEffect(() => {
    if (!publicClient || !vaultAddress || !epochTimestamps || epochTimestamps.length === 0) return;
    const key = `${vaultAddress}:${epochTimestamps.join(",")}`;
    if (scannedKey.current === key) return;
    scannedKey.current = key;

    let cancelled = false;

    async function run() {
      setIsLoading(true);
      setError(undefined);
      try {
        const latestBlock = await publicClient!.getBlock();
        const lookback = latestBlock.number > 100_000n ? 100_000n : latestBlock.number;
        const refBlock = await publicClient!.getBlock({
          blockNumber: latestBlock.number - lookback,
        });
        const blockSpan = latestBlock.number - refBlock.number;
        const timeSpan = latestBlock.timestamp - refBlock.timestamp;
        const secondsPerBlock = blockSpan > 0n ? Number(timeSpan) / Number(blockSpan) : 2.5;

        const foundTrades: TradeEvent[] = [];
        const foundHarvests: HarvestEvent[] = [];

        for (const ts of epochTimestamps ?? []) {
          const secondsAgo = Number(latestBlock.timestamp - ts);
          const blocksAgo = BigInt(Math.max(0, Math.round(secondsAgo / secondsPerBlock)));
          const estimate = latestBlock.number > blocksAgo ? latestBlock.number - blocksAgo : 0n;

          // Try increasingly wide offsets around the estimate to tolerate block-time drift.
          const offsets = [0n, -29n, 29n, -58n, 58n, -87n, 87n];
          for (const offset of offsets) {
            const center = estimate + offset;
            if (center < 0n) continue;
            const fromBlock = center > 14n ? center - 14n : 0n;
            const toBlock = center + 14n > latestBlock.number ? latestBlock.number : center + 14n;
            try {
              const [tradeLogs, harvestLogs] = await Promise.all([
                publicClient!.getLogs({
                  address: vaultAddress,
                  event: tradeExecutedEvent,
                  fromBlock,
                  toBlock,
                }),
                publicClient!.getLogs({
                  address: vaultAddress,
                  event: harvestedEvent,
                  fromBlock,
                  toBlock,
                }),
              ]);
              if (tradeLogs.length > 0 || harvestLogs.length > 0) {
                for (const l of tradeLogs) {
                  foundTrades.push({
                    txHash: l.transactionHash,
                    blockNumber: l.blockNumber,
                    timestamp: ts,
                    asset: l.args.asset!,
                    direction: Number(l.args.direction),
                    amountIn: l.args.amountIn!,
                    amountOut: l.args.amountOut!,
                    nonce: l.args.nonce!,
                  });
                }
                for (const l of harvestLogs) {
                  foundHarvests.push({
                    txHash: l.transactionHash,
                    blockNumber: l.blockNumber,
                    timestamp: ts,
                    currentPPS: l.args.currentPPS!,
                    treasuryShares: l.args.treasuryShares!,
                    strategistShares: l.args.strategistShares!,
                  });
                }
                break;
              }
            } catch {
              // 30-block cap or transient RPC hiccup on this window — try the next offset.
            }
          }
        }

        if (!cancelled) {
          const dedupe = <T extends { txHash: string; nonce?: bigint }>(items: T[]) => {
            const seen = new Set<string>();
            return items.filter((i) => {
              const k = `${i.txHash}-${"nonce" in i ? i.nonce : ""}`;
              if (seen.has(k)) return false;
              seen.add(k);
              return true;
            });
          };
          setTrades(dedupe(foundTrades).sort((a, b) => Number(b.blockNumber - a.blockNumber)));
          setHarvests(dedupe(foundHarvests).sort((a, b) => Number(b.blockNumber - a.blockNumber)));
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not read trade history");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [publicClient, vaultAddress, epochTimestamps]);

  useWatchContractEvent({
    address: vaultAddress,
    abi: ALPHA_VAULT_ABI,
    eventName: "TradeExecuted",
    onLogs: (logs) => {
      setTrades((prev) => {
        const next = logs.map((l) => ({
          txHash: l.transactionHash,
          blockNumber: l.blockNumber,
          asset: l.args.asset!,
          direction: Number(l.args.direction),
          amountIn: l.args.amountIn!,
          amountOut: l.args.amountOut!,
          nonce: l.args.nonce!,
        }));
        const known = new Set(prev.map((t) => `${t.txHash}-${t.nonce}`));
        const fresh = next.filter((t) => !known.has(`${t.txHash}-${t.nonce}`));
        return [...fresh, ...prev];
      });
    },
    enabled: !!vaultAddress,
  });

  useWatchContractEvent({
    address: vaultAddress,
    abi: ALPHA_VAULT_ABI,
    eventName: "Harvested",
    onLogs: (logs) => {
      setHarvests((prev) => {
        const next = logs.map((l) => ({
          txHash: l.transactionHash,
          blockNumber: l.blockNumber,
          currentPPS: l.args.currentPPS!,
          treasuryShares: l.args.treasuryShares!,
          strategistShares: l.args.strategistShares!,
        }));
        const known = new Set(prev.map((h) => h.txHash));
        const fresh = next.filter((h) => !known.has(h.txHash));
        return [...fresh, ...prev];
      });
    },
    enabled: !!vaultAddress,
  });

  return { trades, harvests, isLoading, error };
}

const tradeExecutedEvent = {
  type: "event",
  name: "TradeExecuted",
  inputs: [
    { indexed: true, name: "asset", type: "address" },
    { indexed: false, name: "direction", type: "uint8" },
    { indexed: false, name: "amountIn", type: "uint256" },
    { indexed: false, name: "amountOut", type: "uint256" },
    { indexed: false, name: "nonce", type: "uint256" },
  ],
} as const;

const harvestedEvent = {
  type: "event",
  name: "Harvested",
  inputs: [
    { indexed: false, name: "currentPPS", type: "uint256" },
    { indexed: false, name: "treasuryShares", type: "uint256" },
    { indexed: false, name: "strategistShares", type: "uint256" },
  ],
} as const;
