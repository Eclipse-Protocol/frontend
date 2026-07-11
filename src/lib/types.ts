export type RiskTier = "Conservative" | "Balanced" | "Aggressive";

export interface Vault {
  id: string;
  name: string;
  strategist: string;
  assetPair: string;
  tvl: number;
  apy: number;
  perf30d: number;
  perfAll: number;
  epochPnl: number;
  maxDrawdown: number;
  bond: number;
  riskTier: RiskTier;
  teeType: "AMD SEV-SNP" | "Intel TDX";
  attestationId: string;
  attestationAgeSec: number;
  navHistory: { t: string; nav: number }[];
  managementFee: number;
  performanceFee: number;
  maxPosition: number;
  drawdownBreaker: number;
  /** True for the one real, on-chain AlphaVault deployment — the detail page fetches live contract data for it. */
  isLive?: boolean;
}

export interface Trade {
  id: string;
  vaultId: string;
  ts: string;
  side: "BUY" | "SELL";
  pair: string;
  size: number;
  txHash: string;
  sig: string;
}

export interface EpochCommit {
  epoch: number;
  ts: string;
  nav: number;
  prevHash: string;
  hash: string;
}

export interface Position {
  vaultId: string;
  vaultName: string;
  deposited: number;
  currentValue: number;
  pnlPct: number;
}

export interface Transaction {
  id: string;
  ts: string;
  kind: "Deposit" | "Withdraw";
  vaultName: string;
  amount: number;
  txHash: string;
}

export interface AttestationProof {
  teeType: string;
  timestamp: string;
  codeHash: string;
  enclavePubKey: string;
  fdcTx: string;
}
