import { useMemo } from "react";
import { useReadContracts } from "wagmi";
import { formatUnits, type Address } from "viem";
import { ArrowDownRight, ArrowUpRight, ExternalLink, Lock } from "lucide-react";
import { ERC20_ABI } from "@/lib/contracts";
import { coston2 } from "@/lib/wagmi";
import type { TradeEvent, HarvestEvent } from "@/hooks/useVaultActivity";
import { cn } from "@/lib/utils";

function fmtAddr(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

/** Resolves the traded asset's real symbol/decimals for whatever distinct assets show up in the
 * trade log — batched, not one call per row, and never assumed to match the currently-open
 * position's decimals (a past trade may have involved a different asset). */
function useAssetMeta(assets: Address[]) {
  const unique = useMemo(() => Array.from(new Set(assets)), [assets]);
  const query = useReadContracts({
    contracts: unique.flatMap((a) => [
      { address: a, abi: ERC20_ABI, functionName: "symbol" } as const,
      { address: a, abi: ERC20_ABI, functionName: "decimals" } as const,
    ]),
    query: { enabled: unique.length > 0 },
  });

  return useMemo(() => {
    const map = new Map<Address, { symbol?: string; decimals?: number }>();
    unique.forEach((a, i) => {
      const symbolResult = query.data?.[i * 2];
      const decimalsResult = query.data?.[i * 2 + 1];
      map.set(a, {
        symbol: symbolResult?.status === "success" ? (symbolResult.result as string) : undefined,
        decimals:
          decimalsResult?.status === "success" ? (decimalsResult.result as number) : undefined,
      });
    });
    return map;
  }, [unique, query.data]);
}

export function LiveTradeFeed({
  trades,
  underlyingSymbol,
  underlyingDecimals,
  isLoading,
  error,
}: {
  trades: TradeEvent[];
  underlyingSymbol?: string;
  underlyingDecimals?: number;
  isLoading: boolean;
  error?: string;
}) {
  const assetMeta = useAssetMeta(trades.map((t) => t.asset));

  if (error) {
    return (
      <div className="px-5 py-8 text-center text-sm text-eclipse-danger">
        Could not read trade history: {error}
      </div>
    );
  }

  if (isLoading && trades.length === 0) {
    return (
      <div className="px-5 py-8 text-center text-sm text-eclipse-muted">
        Scanning on-chain trade history…
      </div>
    );
  }

  if (trades.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
        <div className="text-sm font-medium text-eclipse-text">No trades yet</div>
        <p className="max-w-sm text-xs text-eclipse-muted">
          Once the automated loop submits a signed{" "}
          <code className="rounded bg-eclipse-bg/60 px-1 py-0.5 text-eclipse-purple">
            TradeExecuted
          </code>{" "}
          instruction, it will appear here in real time.
        </p>
      </div>
    );
  }

  return (
    <div className="max-h-[420px] overflow-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-eclipse-surface/60 text-[11px] uppercase tracking-wider text-eclipse-muted">
          <tr>
            <th className="px-5 py-2 font-medium">Time</th>
            <th className="px-3 py-2 font-medium">Side</th>
            <th className="px-3 py-2 font-medium">Asset</th>
            <th className="px-3 py-2 font-medium text-right">Amount in</th>
            <th className="px-3 py-2 font-medium text-right">Amount out</th>
            <th className="px-3 py-2 font-medium">Tx</th>
            <th className="px-5 py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="font-mono text-xs">
          {trades.map((t) => {
            const meta = assetMeta.get(t.asset);
            const isBuy = t.direction === 0;
            const inSymbol = isBuy ? (underlyingSymbol ?? "…") : (meta?.symbol ?? fmtAddr(t.asset));
            const outSymbol = isBuy
              ? (meta?.symbol ?? fmtAddr(t.asset))
              : (underlyingSymbol ?? "…");
            const inDecimals = isBuy ? underlyingDecimals : meta?.decimals;
            const outDecimals = isBuy ? meta?.decimals : underlyingDecimals;
            return (
              <tr
                key={`${t.txHash}-${t.nonce}`}
                className="border-t border-eclipse-border/70 hover:bg-eclipse-purple/5"
              >
                <td className="px-5 py-2.5 text-eclipse-muted">
                  {t.timestamp !== undefined
                    ? new Date(Number(t.timestamp) * 1000).toLocaleString()
                    : "Just now"}
                </td>
                <td className="px-3 py-2.5">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1",
                      isBuy ? "text-eclipse-teal" : "text-eclipse-danger",
                    )}
                  >
                    {isBuy ? (
                      <ArrowUpRight className="h-3 w-3" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3" />
                    )}
                    {isBuy ? "BUY" : "SELL"}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-eclipse-text">{fmtAddr(t.asset)}</td>
                <td className="px-3 py-2.5 text-right text-eclipse-text">
                  {inDecimals !== undefined
                    ? `${Number(formatUnits(t.amountIn, inDecimals)).toLocaleString()} ${inSymbol}`
                    : "…"}
                </td>
                <td className="px-3 py-2.5 text-right text-eclipse-text">
                  {outDecimals !== undefined
                    ? `${Number(formatUnits(t.amountOut, outDecimals)).toLocaleString()} ${outSymbol}`
                    : "…"}
                </td>
                <td className="px-3 py-2.5">
                  <a
                    href={`${coston2.blockExplorers.default.url}/tx/${t.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-eclipse-purple hover:underline"
                  >
                    {fmtAddr(t.txHash)}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </td>
                <td className="px-5 py-2.5">
                  <span className="inline-flex items-center gap-1 text-eclipse-purple">
                    <Lock className="h-3 w-3" /> confirmed
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function LiveHarvestHistory({
  harvests,
  shareDecimals,
  isLoading,
}: {
  harvests: HarvestEvent[];
  shareDecimals?: number;
  isLoading: boolean;
}) {
  if (isLoading && harvests.length === 0) {
    return (
      <div className="px-5 py-6 text-center text-xs text-eclipse-muted">
        Scanning for harvest events…
      </div>
    );
  }

  if (harvests.length === 0) {
    return (
      <div className="px-5 py-6 text-center text-xs text-eclipse-muted">
        No harvest has fired yet — price-per-share hasn't cleared the high-water mark. This is an
        honest outcome, not a missing feature: the 3%/7% fee split only mints when a real new high
        occurs.
      </div>
    );
  }

  return (
    <table className="w-full text-left font-mono text-xs">
      <thead className="bg-eclipse-surface/60 text-[10px] uppercase tracking-wider text-eclipse-muted">
        <tr>
          <th className="px-5 py-2 font-medium">New PPS</th>
          <th className="px-3 py-2 font-medium text-right">Treasury shares</th>
          <th className="px-3 py-2 font-medium text-right">Strategist shares</th>
          <th className="px-5 py-2 font-medium">Tx</th>
        </tr>
      </thead>
      <tbody>
        {harvests.map((h) => (
          <tr key={h.txHash} className="border-t border-eclipse-border/70">
            <td className="px-5 py-2 text-eclipse-gold">{formatUnits(h.currentPPS, 18)}</td>
            <td className="px-3 py-2 text-right text-eclipse-text">
              {shareDecimals !== undefined ? formatUnits(h.treasuryShares, shareDecimals) : "…"}
            </td>
            <td className="px-3 py-2 text-right text-eclipse-text">
              {shareDecimals !== undefined ? formatUnits(h.strategistShares, shareDecimals) : "…"}
            </td>
            <td className="px-5 py-2">
              <a
                href={`${coston2.blockExplorers.default.url}/tx/${h.txHash}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-eclipse-purple hover:underline"
              >
                {fmtAddr(h.txHash)}
                <ExternalLink className="h-3 w-3" />
              </a>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
