import type { Vault, Trade, EpochCommit, Position, Transaction } from "./types";

function seededSeries(seed: number, len: number, base: number, vol: number) {
  const out: { t: string; nav: number }[] = [];
  let v = base;
  let s = seed;
  const now = Date.now();
  for (let i = len - 1; i >= 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const r = (s / 233280 - 0.5) * 2;
    v = Math.max(0.5, v * (1 + r * vol));
    out.push({
      t: new Date(now - i * 3600_000 * 6).toISOString(),
      nav: +v.toFixed(4),
    });
  }
  return out;
}

export const LIVE_VAULT_ID = "eclipse-alpha-vault";

export const mockVaults: Vault[] = [
  {
    id: LIVE_VAULT_ID,
    name: "Eclipse Alpha Vault",
    strategist: "—",
    assetPair: "Coston2 Testnet",
    tvl: 0,
    apy: 0,
    perf30d: 0,
    perfAll: 0,
    epochPnl: 0,
    maxDrawdown: 0,
    bond: 0,
    riskTier: "Balanced",
    teeType: "AMD SEV-SNP",
    attestationId: "—",
    attestationAgeSec: 0,
    navHistory: [
      { t: new Date(Date.now() - 3600_000).toISOString(), nav: 1 },
      { t: new Date().toISOString(), nav: 1 },
    ],
    managementFee: 0,
    performanceFee: 0,
    maxPosition: 0,
    drawdownBreaker: 0,
    isLive: true,
  },
  {
    id: "momentum-alpha-1",
    name: "Momentum Alpha #1",
    strategist: "0x8f2a...c91b",
    assetPair: "ETH/USDC",
    tvl: 4_820_000,
    apy: 38.2,
    perf30d: 6.4,
    perfAll: 42.1,
    epochPnl: 2.4,
    maxDrawdown: -8.3,
    bond: 250_000,
    riskTier: "Balanced",
    teeType: "AMD SEV-SNP",
    attestationId: "att_0x8f2ac91b6d",
    attestationAgeSec: 142,
    navHistory: seededSeries(7, 120, 1, 0.018),
    managementFee: 1.5,
    performanceFee: 15,
    maxPosition: 25,
    drawdownBreaker: 15,
  },
  {
    id: "delta-neutral-2",
    name: "Delta Neutral #2",
    strategist: "0x21e4...09fa",
    assetPair: "BTC/USDC",
    tvl: 12_140_000,
    apy: 14.7,
    perf30d: 1.9,
    perfAll: 21.6,
    epochPnl: 0.42,
    maxDrawdown: -2.1,
    bond: 500_000,
    riskTier: "Conservative",
    teeType: "Intel TDX",
    attestationId: "att_0x21e409fa88",
    attestationAgeSec: 61,
    navHistory: seededSeries(19, 120, 1, 0.006),
    managementFee: 1.0,
    performanceFee: 10,
    maxPosition: 40,
    drawdownBreaker: 8,
  },
  {
    id: "vol-harvest-3",
    name: "Vol Harvest #3",
    strategist: "0xd90c...4471",
    assetPair: "FXRP/USDC",
    tvl: 2_310_000,
    apy: 62.9,
    perf30d: -3.1,
    perfAll: 88.4,
    epochPnl: -1.2,
    maxDrawdown: -18.6,
    bond: 180_000,
    riskTier: "Aggressive",
    teeType: "AMD SEV-SNP",
    attestationId: "att_0xd90c447121",
    attestationAgeSec: 320,
    navHistory: seededSeries(41, 120, 1, 0.028),
    managementFee: 2.0,
    performanceFee: 20,
    maxPosition: 15,
    drawdownBreaker: 25,
  },
  {
    id: "carry-basis-4",
    name: "Carry Basis #4",
    strategist: "0x55aa...7712",
    assetPair: "ETH/BTC",
    tvl: 7_640_000,
    apy: 22.1,
    perf30d: 3.2,
    perfAll: 33.9,
    epochPnl: 0.88,
    maxDrawdown: -5.4,
    bond: 340_000,
    riskTier: "Balanced",
    teeType: "AMD SEV-SNP",
    attestationId: "att_0x55aa771233",
    attestationAgeSec: 210,
    navHistory: seededSeries(63, 120, 1, 0.012),
    managementFee: 1.25,
    performanceFee: 12.5,
    maxPosition: 30,
    drawdownBreaker: 10,
  },
  {
    id: "mean-revert-5",
    name: "Mean Revert #5",
    strategist: "0x77bb...9910",
    assetPair: "SOL/USDC",
    tvl: 1_120_000,
    apy: 46.5,
    perf30d: 4.7,
    perfAll: 55.2,
    epochPnl: 1.6,
    maxDrawdown: -11.2,
    bond: 120_000,
    riskTier: "Aggressive",
    teeType: "Intel TDX",
    attestationId: "att_0x77bb991055",
    attestationAgeSec: 44,
    navHistory: seededSeries(88, 120, 1, 0.022),
    managementFee: 1.75,
    performanceFee: 17.5,
    maxPosition: 20,
    drawdownBreaker: 20,
  },
  {
    id: "structural-6",
    name: "Structural Yield #6",
    strategist: "0x03fe...ab12",
    assetPair: "USDC/USDT",
    tvl: 18_920_000,
    apy: 8.9,
    perf30d: 0.7,
    perfAll: 11.4,
    epochPnl: 0.18,
    maxDrawdown: -0.4,
    bond: 800_000,
    riskTier: "Conservative",
    teeType: "AMD SEV-SNP",
    attestationId: "att_0x03feab1277",
    attestationAgeSec: 15,
    navHistory: seededSeries(101, 120, 1, 0.002),
    managementFee: 0.5,
    performanceFee: 8,
    maxPosition: 60,
    drawdownBreaker: 5,
  },
];

export function getVault(id: string) {
  return mockVaults.find((v) => v.id === id);
}

export function mockTrades(vaultId: string): Trade[] {
  const v = getVault(vaultId);
  const pair = v?.assetPair ?? "ETH/USDC";
  const now = Date.now();
  const arr: Trade[] = [];
  let s = vaultId.length * 71;
  for (let i = 0; i < 18; i++) {
    s = (s * 9301 + 49297) % 233280;
    const r = s / 233280;
    arr.push({
      id: `${vaultId}-t-${i}`,
      vaultId,
      ts: new Date(now - i * 180_000 - Math.floor(r * 60_000)).toISOString(),
      side: r > 0.5 ? "BUY" : "SELL",
      pair,
      size: +(1000 + r * 45000).toFixed(2),
      txHash: `0x${Math.floor(r * 1e16).toString(16).padStart(12, "0")}${Math.floor((1 - r) * 1e12).toString(16).padStart(8, "0")}`,
      sig: `sig_${Math.floor(r * 1e8).toString(16)}`,
    });
  }
  return arr;
}

export function mockEpochs(vaultId: string): EpochCommit[] {
  const now = Date.now();
  const arr: EpochCommit[] = [];
  let prev = "0x0000000000000000";
  let s = vaultId.length * 13;
  for (let i = 0; i < 10; i++) {
    s = (s * 9301 + 49297) % 233280;
    const r = s / 233280;
    const hash = `0x${Math.floor(r * 1e16).toString(16).padStart(16, "0")}`;
    arr.push({
      epoch: 1420 - i,
      ts: new Date(now - i * 3600_000 * 6).toISOString(),
      nav: +(1 + (Math.sin(i) * 0.05 + i * 0.002)).toFixed(6),
      prevHash: prev,
      hash,
    });
    prev = hash;
  }
  return arr;
}

export const mockPositions: Position[] = [
  { vaultId: "momentum-alpha-1", vaultName: "Momentum Alpha #1", deposited: 25_000, currentValue: 28_412, pnlPct: 13.65 },
  { vaultId: "delta-neutral-2", vaultName: "Delta Neutral #2", deposited: 50_000, currentValue: 51_920, pnlPct: 3.84 },
  { vaultId: "structural-6", vaultName: "Structural Yield #6", deposited: 100_000, currentValue: 102_140, pnlPct: 2.14 },
];

export const mockTransactions: Transaction[] = [
  { id: "tx1", ts: new Date(Date.now() - 3600_000).toISOString(), kind: "Deposit", vaultName: "Momentum Alpha #1", amount: 25000, txHash: "0x8f2a...c91b" },
  { id: "tx2", ts: new Date(Date.now() - 3600_000 * 24).toISOString(), kind: "Deposit", vaultName: "Delta Neutral #2", amount: 50000, txHash: "0x21e4...09fa" },
  { id: "tx3", ts: new Date(Date.now() - 3600_000 * 72).toISOString(), kind: "Withdraw", vaultName: "Vol Harvest #3", amount: 5000, txHash: "0xd90c...4471" },
  { id: "tx4", ts: new Date(Date.now() - 3600_000 * 120).toISOString(), kind: "Deposit", vaultName: "Structural Yield #6", amount: 100000, txHash: "0x03fe...ab12" },
];

export const attestationTicker = [
  "Enclave attested · 0x8f2a...c91b · TEE: AMD SEV-SNP",
  "Trade executed · Vault #3 · +2.4% epoch",
  "Epoch committed · #1420 · NAV 1.0421",
  "Enclave attested · 0x21e4...09fa · TEE: Intel TDX",
  "Vault deployed · Mean Revert #5 · bond 120k",
  "FDC verified · att_0xd90c447121",
  "Trade executed · Vault #6 · +0.18% epoch",
  "Enclave attested · 0x55aa...7712 · TEE: AMD SEV-SNP",
];
