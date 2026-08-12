import type { Address, PublicClient } from "viem";

/** Coston2's public RPC caps eth_getLogs at 30 blocks/call (confirmed directly via `cast logs`),
 * so every bounded historical scan in this app uses the same chunk-and-batch pattern: split the
 * requested window into <=28-block pieces, fire them together so the batched JSON-RPC transport
 * (see wagmi.ts) can coalesce them into as few HTTP round trips as possible, and tolerate individual
 * chunk failures rather than letting one bad window fail the whole scan. */
const CHUNK = 28n;

interface ScanParams {
  address: Address;
  event?: { type: "event"; name: string; inputs: readonly unknown[] };
  abi?: readonly unknown[];
  eventName?: string;
  args?: Record<string, unknown>;
  windowBlocks: bigint;
}

/** Returns raw logs, deliberately untyped by the ABI event's argument shape — callers narrow with
 * their own `as` cast, since threading generics through here is what made `tsc` fall over. */
export async function scanRecentLogs(
  publicClient: PublicClient,
  params: ScanParams,
): Promise<unknown[]> {
  const latest = await publicClient.getBlockNumber();
  const fromBlock = latest > params.windowBlocks ? latest - params.windowBlocks : 0n;

  const filterArgs = params.event
    ? { address: params.address, event: params.event, args: params.args }
    : { address: params.address, abi: params.abi, eventName: params.eventName, args: params.args };
  type GetLogsArgs = Parameters<PublicClient["getLogs"]>[0];

  const ranges: { start: bigint; end: bigint }[] = [];
  for (let start = fromBlock; start <= latest; start += CHUNK + 1n) {
    const end = start + CHUNK > latest ? latest : start + CHUNK;
    ranges.push({ start, end });
  }

  const logs: unknown[] = [];
  // Larger batches lean on the http transport's JSON-RPC batching (see wagmi.ts, batch: true) to
  // coalesce many getLogs calls into fewer physical HTTP round trips — the prior value of 15 meant
  // a 20,000-block scan (~690 chunks) took ~46 sequential round trips; this cuts it to ~12.
  const batchSize = 60;
  for (let i = 0; i < ranges.length; i += batchSize) {
    const batchRanges = ranges.slice(i, i + batchSize);
    const batchPromises = batchRanges.map((r) =>
      publicClient.getLogs({ ...filterArgs, fromBlock: r.start, toBlock: r.end } as GetLogsArgs)
    );
    const batchResults = await Promise.allSettled(batchPromises);
    for (const r of batchResults) {
      if (r.status === "fulfilled") {
        logs.push(...r.value);
      }
    }
  }

  return logs;
}

export async function resolveBlockTimestamps(publicClient: PublicClient, blockNumbers: bigint[]) {
  const unique = Array.from(new Set(blockNumbers));
  const results = await Promise.allSettled(
    unique.map((b) => publicClient.getBlock({ blockNumber: b })),
  );
  const map = new Map<bigint, bigint>();
  results.forEach((r, i) => {
    if (r.status === "fulfilled") map.set(unique[i], r.value.timestamp);
  });
  return map;
}
