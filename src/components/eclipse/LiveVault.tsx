import { useEffect, useState } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { formatUnits, parseUnits } from "viem";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatCard } from "./StatCard";
import { wagmiConfig, coston2 } from "@/lib/wagmi";
import { ALPHA_VAULT, PERFORMANCE_LEDGER, STRATEGY_REGISTRY, ERC20_ABI } from "@/lib/contracts";
import { WalletButton } from "./WalletButton";

const fmtUSD = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : n >= 1_000 ? `$${(n / 1_000).toFixed(1)}k` : `$${n.toFixed(2)}`;

function fmtToken(value: bigint | undefined, decimals: number | undefined, digits = 4): string {
  if (value === undefined || decimals === undefined) return "—";
  return Number(formatUnits(value, decimals)).toLocaleString(undefined, { maximumFractionDigits: digits });
}

function shortHash(h: string | undefined) {
  if (!h) return "—";
  return `${h.slice(0, 10)}…${h.slice(-6)}`;
}

/** Core AlphaVault reads shared by the stat cards, risk panel, and deposit panel via react-query's shared cache. */
function useAlphaVaultCore() {
  const totalAssets = useReadContract({ ...ALPHA_VAULT, functionName: "totalAssets", query: { refetchInterval: 20_000 } });
  const totalSupply = useReadContract({ ...ALPHA_VAULT, functionName: "totalSupply", query: { refetchInterval: 20_000 } });
  const highWaterMark = useReadContract({ ...ALPHA_VAULT, functionName: "highWaterMark" });
  const assetAddress = useReadContract({ ...ALPHA_VAULT, functionName: "asset" });
  const shareDecimals = useReadContract({ ...ALPHA_VAULT, functionName: "decimals" });
  const maxDrawdownBps = useReadContract({ ...ALPHA_VAULT, functionName: "maxDrawdownBps" });
  const maxPositionSizeBps = useReadContract({ ...ALPHA_VAULT, functionName: "maxPositionSizeBps" });
  const strategist = useReadContract({ ...ALPHA_VAULT, functionName: "strategist" });
  const treasury = useReadContract({ ...ALPHA_VAULT, functionName: "treasury" });
  const paused = useReadContract({ ...ALPHA_VAULT, functionName: "paused" });

  const assetToken = assetAddress.data ? ({ address: assetAddress.data, abi: ERC20_ABI } as const) : undefined;
  const assetDecimals = useReadContract({
    ...(assetToken ?? { address: undefined, abi: ERC20_ABI }),
    functionName: "decimals",
    query: { enabled: !!assetToken },
  });
  const assetSymbol = useReadContract({
    ...(assetToken ?? { address: undefined, abi: ERC20_ABI }),
    functionName: "symbol",
    query: { enabled: !!assetToken },
  });

  const strategy = useReadContract({
    ...STRATEGY_REGISTRY,
    functionName: "getStrategyByVault",
    args: [ALPHA_VAULT.address],
  });

  const assetsNum = assetDecimals.data !== undefined ? Number(formatUnits(totalAssets.data ?? 0n, assetDecimals.data)) : undefined;
  const sharesNum = shareDecimals.data !== undefined ? Number(formatUnits(totalSupply.data ?? 0n, shareDecimals.data)) : undefined;
  const pricePerShare = assetsNum !== undefined && sharesNum !== undefined && sharesNum > 0 ? assetsNum / sharesNum : 1;

  return {
    totalAssets,
    totalSupply,
    highWaterMark,
    assetAddress,
    assetToken,
    assetDecimals,
    assetSymbol,
    shareDecimals,
    maxDrawdownBps,
    maxPositionSizeBps,
    strategist,
    treasury,
    paused,
    strategy,
    pricePerShare,
  };
}

export function LiveHeaderMeta() {
  const v = useAlphaVaultCore();
  return (
    <>
      <span>{v.assetSymbol.data ? `${v.assetSymbol.data} vault` : "Loading asset…"}</span>
      <span>·</span>
      <span className="font-mono text-xs">
        Strategist {v.strategist.isLoading ? "…" : v.strategist.data}
      </span>
    </>
  );
}

export function LiveStatCards() {
  const v = useAlphaVaultCore();
  const tvl = v.assetDecimals.data !== undefined ? fmtUSD(Number(formatUnits(v.totalAssets.data ?? 0n, v.assetDecimals.data))) : "—";
  const bond = v.strategy.data ? fmtUSD(Number(formatUnits(v.strategy.data.bondAmount, 18))) : "—";
  const hwm = fmtToken(v.highWaterMark.data, 18, 6);
  const pps = v.pricePerShare.toFixed(6);
  const drawdown = v.maxDrawdownBps.data !== undefined ? `${(Number(v.maxDrawdownBps.data) / 100).toFixed(2)}%` : "—";
  const shares = fmtToken(v.totalSupply.data, v.shareDecimals.data, 4);

  return (
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
      <StatCard label="TVL (totalAssets)" value={tvl} hint={v.assetSymbol.data ? `in ${v.assetSymbol.data}` : undefined} />
      <StatCard label="Price per share" value={pps} hint="totalAssets / totalSupply" />
      <StatCard label="High-water mark" value={hwm} hint="scaled 1e18" />
      <StatCard label="Total shares outstanding" value={shares} />
      <StatCard label="Strategist bond" value={bond} hint="StrategyRegistry · at risk of slashing" />
      <StatCard label="Max drawdown (config)" value={drawdown} hint={v.paused.data ? "Vault paused" : "Circuit breaker"} />
    </div>
  );
}

export function LiveMetadataRows() {
  const v = useAlphaVaultCore();
  return (
    <dl className="mt-4 grid gap-4 sm:grid-cols-2">
      <Row k="Underlying asset" v={v.assetAddress.data ?? "—"} />
      <Row k="Asset symbol" v={v.assetSymbol.data ?? "—"} />
      <Row k="Max position size" v={v.maxPositionSizeBps.data !== undefined ? `${(Number(v.maxPositionSizeBps.data) / 100).toFixed(2)}% of TVL` : "—"} />
      <Row k="Drawdown circuit breaker" v={v.maxDrawdownBps.data !== undefined ? `${(Number(v.maxDrawdownBps.data) / 100).toFixed(2)}% halts trading` : "—"} />
      <Row k="Treasury" v={v.treasury.data ?? "—"} />
      <Row k="Strategist" v={v.strategist.data ?? "—"} />
    </dl>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-eclipse-border/60 py-2 text-sm">
      <dt className="text-eclipse-muted">{k}</dt>
      <dd className="font-mono text-xs text-eclipse-text break-all text-right">{v}</dd>
    </div>
  );
}

export function LivePerformanceLedger() {
  const epochCount = useReadContract({ ...PERFORMANCE_LEDGER, functionName: "epochCount" });
  const verifyChain = useReadContract({ ...PERFORMANCE_LEDGER, functionName: "verifyChain" });
  const genesisHash = useReadContract({ ...PERFORMANCE_LEDGER, functionName: "GENESIS_HASH" });

  const count = epochCount.data ?? 0n;
  const limit = count > 50n ? 50n : count;
  const epochs = useReadContract({
    ...PERFORMANCE_LEDGER,
    functionName: "getEpochs",
    args: [0n, limit],
    query: { enabled: count > 0n },
  });

  if (epochCount.isLoading) {
    return <div className="px-5 py-8 text-center text-sm text-eclipse-muted">Reading epoch history…</div>;
  }

  if (count === 0n) {
    return (
      <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
        <div className="text-sm font-medium text-eclipse-text">No epochs committed yet</div>
        <p className="max-w-sm text-xs text-eclipse-muted">
          This vault's live trading loop hasn't committed a NAV epoch on-chain yet. Once
          <code className="mx-1 rounded bg-eclipse-bg/60 px-1 py-0.5 text-eclipse-purple">commitEpoch()</code>
          starts running, entries will appear here, hash-chained back to genesis.
        </p>
        <div className="mt-2 font-mono text-[11px] text-eclipse-muted">Genesis hash: {shortHash(genesisHash.data)}</div>
      </div>
    );
  }

  const rows = [...(epochs.data ?? [])].reverse();
  return (
    <>
      <div className="flex items-center justify-between border-b border-eclipse-border/70 px-5 py-2 text-xs">
        <span className="text-eclipse-muted">{count.toString()} epoch{count === 1n ? "" : "s"} committed</span>
        <span className={cn("font-medium", verifyChain.data ? "text-eclipse-teal" : "text-eclipse-danger")}>
          {verifyChain.isLoading ? "Verifying chain…" : verifyChain.data ? "Hash chain verified ✓" : "Chain verification failed"}
        </span>
      </div>
      <table className="w-full text-left font-mono text-xs">
        <thead className="bg-eclipse-surface/60 text-[10px] uppercase tracking-wider text-eclipse-muted">
          <tr>
            <th className="px-5 py-2 font-medium">Epoch</th>
            <th className="px-3 py-2 font-medium">Time</th>
            <th className="px-3 py-2 font-medium text-right">NAV</th>
            <th className="px-3 py-2 font-medium">Prev hash</th>
            <th className="px-5 py-2 font-medium">Hash</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((e, i) => {
            const idxFromEnd = rows.length - 1 - i;
            const prev = idxFromEnd === 0 ? genesisHash.data : rows[i + 1]?.hash;
            return (
              <tr key={e.hash} className="border-t border-eclipse-border/70">
                <td className="px-5 py-2 text-eclipse-gold">#{idxFromEnd}</td>
                <td className="px-3 py-2 text-eclipse-muted">{new Date(Number(e.timestamp) * 1000).toLocaleString()}</td>
                <td className="px-3 py-2 text-right text-eclipse-text">{formatUnits(e.nav, 18)}</td>
                <td className="px-3 py-2 text-eclipse-muted">{shortHash(prev)}</td>
                <td className="px-5 py-2 text-eclipse-purple">{shortHash(e.hash)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}

export function LiveTradeFeedNotice() {
  return (
    <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
      <div className="text-sm font-medium text-eclipse-text">Live trade feed coming Week 2</div>
      <p className="max-w-sm text-xs text-eclipse-muted">
        Individual trades are emitted as <code className="rounded bg-eclipse-bg/60 px-1 py-0.5 text-eclipse-purple">TradeExecuted</code> events —
        reading them here needs log indexing that isn't wired up yet. Until then, verify activity directly on the block explorer.
      </p>
      <a
        href={`${coston2.blockExplorers.default.url}/address/${ALPHA_VAULT.address}`}
        target="_blank"
        rel="noreferrer"
        className="mt-1 inline-flex items-center gap-1 text-xs text-eclipse-purple hover:underline"
      >
        View contract on Blockscout <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}

type Tab = "Deposit" | "Redeem";

export function LiveDepositPanel() {
  const { address, isConnected } = useAccount();
  const [tab, setTab] = useState<Tab>("Deposit");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const { writeContractAsync } = useWriteContract();

  const v = useAlphaVaultCore();

  const walletAssetBalance = useReadContract({
    ...(v.assetToken ?? { address: undefined, abi: ERC20_ABI }),
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!v.assetToken && !!address },
  });
  const walletShareBalance = useReadContract({
    ...ALPHA_VAULT,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
  const allowance = useReadContract({
    ...(v.assetToken ?? { address: undefined, abi: ERC20_ABI }),
    functionName: "allowance",
    args: address ? [address, ALPHA_VAULT.address] : undefined,
    query: { enabled: !!v.assetToken && !!address },
  });

  useEffect(() => setAmount(""), [tab]);

  const decimals = tab === "Deposit" ? v.assetDecimals.data : v.shareDecimals.data;
  const symbol = tab === "Deposit" ? v.assetSymbol.data ?? "asset" : "shares";
  const maxRaw = tab === "Deposit" ? walletAssetBalance.data : walletShareBalance.data;
  const estimatedOut =
    amount && decimals !== undefined
      ? tab === "Deposit"
        ? (parseFloat(amount) / v.pricePerShare).toFixed(4)
        : (parseFloat(amount) * v.pricePerShare).toFixed(4)
      : "0.0000";

  function setMax() {
    if (maxRaw === undefined || decimals === undefined) return;
    setAmount(formatUnits(maxRaw, decimals));
  }

  async function submit() {
    if (!isConnected || !address) return;
    if (!amount || decimals === undefined) return;
    let amountBn: bigint;
    try {
      amountBn = parseUnits(amount, decimals);
    } catch {
      toast.error("Invalid amount");
      return;
    }
    if (amountBn <= 0n) return;

    try {
      if (tab === "Deposit") {
        if (!v.assetToken) throw new Error("Underlying asset address not loaded yet");
        if ((allowance.data ?? 0n) < amountBn) {
          setBusy("Requesting approval…");
          const approveHash = await writeContractAsync({
            ...v.assetToken,
            functionName: "approve",
            args: [ALPHA_VAULT.address, amountBn],
          });
          await waitForTransactionReceipt(wagmiConfig, { hash: approveHash });
          await allowance.refetch();
        }
        setBusy("Confirming deposit…");
        const depositHash = await writeContractAsync({
          ...ALPHA_VAULT,
          functionName: "deposit",
          args: [amountBn, address],
        });
        await waitForTransactionReceipt(wagmiConfig, { hash: depositHash });
      } else {
        setBusy("Confirming redeem…");
        const redeemHash = await writeContractAsync({
          ...ALPHA_VAULT,
          functionName: "redeem",
          args: [amountBn, address, address],
        });
        await waitForTransactionReceipt(wagmiConfig, { hash: redeemHash });
      }

      const [{ data: newShares }] = await Promise.all([
        walletShareBalance.refetch(),
        walletAssetBalance.refetch(),
        v.totalAssets.refetch(),
        v.totalSupply.refetch(),
      ]);

      toast.success(`${tab} confirmed on-chain`, {
        description: `Share balance now ${fmtToken(newShares, v.shareDecimals.data)}`,
      });
      setAmount("");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`${tab} failed`, { amount, amountBn: amountBn?.toString(), address, err });
      toast.error(`${tab} failed`, { description: message.slice(0, 200) });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="glass-card sticky top-24 p-5">
      <div className="mb-4 inline-flex w-full rounded-lg border border-eclipse-border bg-eclipse-surface p-1">
        {(["Deposit", "Redeem"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-sm",
              tab === t ? "bg-eclipse-purple/20 text-eclipse-text" : "text-eclipse-muted hover:text-eclipse-text",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {!isConnected ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <p className="text-xs text-eclipse-muted">Connect a Coston2 wallet to {tab.toLowerCase()}.</p>
          <WalletButton />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between text-xs text-eclipse-muted">
            <label>Amount</label>
            <button onClick={setMax} className="text-eclipse-purple hover:underline">
              Balance: {fmtToken(maxRaw, decimals)} {tab === "Deposit" ? v.assetSymbol.data ?? "" : "shares"}
            </button>
          </div>
          <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-eclipse-border bg-eclipse-surface px-3 py-2.5 focus-within:border-eclipse-purple/60">
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
              placeholder="0.00"
              className="w-full bg-transparent font-mono text-lg text-eclipse-text outline-none placeholder:text-eclipse-muted/60"
            />
            <span className="rounded-md border border-eclipse-border bg-eclipse-bg px-2 py-1 text-xs text-eclipse-text">
              {tab === "Deposit" ? v.assetSymbol.data ?? "…" : "shares"}
            </span>
          </div>

          <div className="mt-4 rounded-lg border border-eclipse-border/70 bg-eclipse-bg/40 p-3 text-xs">
            <div className="flex items-center justify-between text-eclipse-muted">
              <span>Estimated {tab === "Deposit" ? "shares" : symbol}</span>
              <span className="font-mono text-eclipse-text">{estimatedOut}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-eclipse-muted">
              <span>Price per share</span>
              <span className="font-mono text-eclipse-text">{v.pricePerShare.toFixed(6)}</span>
            </div>
          </div>

          <button
            onClick={submit}
            disabled={!!busy || !amount}
            className="mt-4 w-full rounded-lg bg-eclipse-purple py-2.5 text-sm font-medium text-white transition-colors hover:bg-eclipse-purple-bright glow-purple disabled:opacity-60"
          >
            {busy ?? `${tab} ${tab === "Deposit" ? v.assetSymbol.data ?? "" : "shares"}`}
          </button>
        </>
      )}

      <p className="mt-3 text-[11px] text-eclipse-muted">
        Deposits call AlphaVault's ERC-4626 <code className="text-eclipse-purple">deposit()</code> directly on Coston2. Approval is
        requested first if the current allowance is insufficient.
      </p>
    </div>
  );
}
