import { useEffect, useMemo, useRef, useState } from "react";
import { usePublicClient } from "wagmi";
import type { Address } from "viem";
import { ALPHA_VAULT_ABI } from "@/abi/alphaVault";
import { scanRecentLogs, resolveBlockTimestamps } from "@/lib/eventScan";

export interface TimelineEntry {
  kind: "Deposit" | "Redeem" | "Paused" | "Resumed";
  timestamp?: bigint;
  txHash: `0x${string}`;
  detail?: string;
}

/** Same 30-block eth_getLogs cap documented in useVaultActivity/useInvestorPositions. Recent
 * activity (deposits, pauses) is discoverable in this window; one-time setup events from further
 * back (registration, enclave verification, ownership rotation) are not — those are resolved via
 * an optional known-tx-hash env var instead (see `useOneTimeEvent` below), the same way
 * `DEPLOYMENT.md` records them, rather than gambling on a scan spanning hundreds of thousands of
 * blocks. */
const RECENT_WINDOW = 20_000n;

/** Looks up one known transaction by hash (no block-range cap applies to a direct tx lookup) to
 * recover a one-time setup event's real timestamp. Returns undefined if no hash is configured or
 * the lookup fails — never a guessed value. */
function useOneTimeEventTimestamp(envVarValue: string | undefined) {
  const publicClient = usePublicClient();
  const [timestamp, setTimestamp] = useState<bigint>();
  const [txHash, setTxHash] = useState<string>();

  useEffect(() => {
    if (!publicClient || !envVarValue) return;
    let cancelled = false;
    publicClient
      .getTransactionReceipt({ hash: envVarValue as `0x${string}` })
      .then((receipt) => publicClient.getBlock({ blockNumber: receipt.blockNumber }))
      .then((block) => {
        if (!cancelled) {
          setTimestamp(block.timestamp);
          setTxHash(envVarValue);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTimestamp(undefined);
          setTxHash(undefined);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [publicClient, envVarValue]);

  return { timestamp, txHash };
}

export function useStrategistActivity(vaultAddress: Address | undefined) {
  const publicClient = usePublicClient();

  const registeredSince = useOneTimeEventTimestamp(import.meta.env.VITE_STRATEGY_REGISTERED_TX);
  const enclaveVerifiedAt = useOneTimeEventTimestamp(import.meta.env.VITE_ENCLAVE_VERIFIED_TX);
  const ownershipRotatedAt = useOneTimeEventTimestamp(import.meta.env.VITE_OWNERSHIP_ROTATED_TX);

  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [investorCount, setInvestorCount] = useState<number>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const scanKey = useRef("");

  useEffect(() => {
    if (!publicClient || !vaultAddress) return;
    if (scanKey.current === vaultAddress) return;
    scanKey.current = vaultAddress;

    let cancelled = false;

    async function run() {
      setIsLoading(true);
      setError(undefined);
      try {
        const [depositLogs, withdrawLogs, pausedLogs, unpausedLogs] = await Promise.all([
          scanRecentLogs(publicClient!, {
            address: vaultAddress!,
            abi: ALPHA_VAULT_ABI,
            eventName: "Deposit",
            windowBlocks: RECENT_WINDOW,
          }),
          scanRecentLogs(publicClient!, {
            address: vaultAddress!,
            abi: ALPHA_VAULT_ABI,
            eventName: "Withdraw",
            windowBlocks: RECENT_WINDOW,
          }),
          scanRecentLogs(publicClient!, {
            address: vaultAddress!,
            abi: ALPHA_VAULT_ABI,
            eventName: "Paused",
            windowBlocks: RECENT_WINDOW,
          }),
          scanRecentLogs(publicClient!, {
            address: vaultAddress!,
            abi: ALPHA_VAULT_ABI,
            eventName: "Unpaused",
            windowBlocks: RECENT_WINDOW,
          }),
        ]);

        const allLogs = [...depositLogs, ...withdrawLogs, ...pausedLogs, ...unpausedLogs] as {
          blockNumber: bigint;
          transactionHash: `0x${string}`;
          args: Record<string, unknown>;
        }[];
        const tsByBlock = await resolveBlockTimestamps(
          publicClient!,
          allLogs.map((l) => l.blockNumber),
        );

        const entries: TimelineEntry[] = [
          ...depositLogs.map((l) => {
            const log = l as unknown as {
              blockNumber: bigint;
              transactionHash: `0x${string}`;
              args: { owner: Address; assets: bigint };
            };
            return {
              kind: "Deposit" as const,
              timestamp: tsByBlock.get(log.blockNumber),
              txHash: log.transactionHash,
              detail: `${log.args.owner.slice(0, 6)}…${log.args.owner.slice(-4)}`,
            };
          }),
          ...withdrawLogs.map((l) => {
            const log = l as unknown as {
              blockNumber: bigint;
              transactionHash: `0x${string}`;
              args: { owner: Address; assets: bigint };
            };
            return {
              kind: "Redeem" as const,
              timestamp: tsByBlock.get(log.blockNumber),
              txHash: log.transactionHash,
              detail: `${log.args.owner.slice(0, 6)}…${log.args.owner.slice(-4)}`,
            };
          }),
          ...pausedLogs.map((l) => {
            const log = l as unknown as { blockNumber: bigint; transactionHash: `0x${string}` };
            return {
              kind: "Paused" as const,
              timestamp: tsByBlock.get(log.blockNumber),
              txHash: log.transactionHash,
            };
          }),
          ...unpausedLogs.map((l) => {
            const log = l as unknown as { blockNumber: bigint; transactionHash: `0x${string}` };
            return {
              kind: "Resumed" as const,
              timestamp: tsByBlock.get(log.blockNumber),
              txHash: log.transactionHash,
            };
          }),
        ].sort((a, b) => Number((b.timestamp ?? 0n) - (a.timestamp ?? 0n)));

        const uniqueDepositors = new Set(
          depositLogs.map((l) =>
            (l as unknown as { args: { owner: Address } }).args.owner.toLowerCase(),
          ),
        );

        if (!cancelled) {
          setTimeline(entries);
          setInvestorCount(uniqueDepositors.size);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not read recent activity");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [publicClient, vaultAddress]);

  return {
    registeredSince,
    enclaveVerifiedAt,
    ownershipRotatedAt,
    timeline,
    investorCount,
    isLoading,
    error,
    scanWindowBlocks: RECENT_WINDOW,
  };
}

// Exported so the route file can resolve StrategyRegistered's tx the same way, without a second
// copy of the "look up one known tx" logic.
export { useOneTimeEventTimestamp };
